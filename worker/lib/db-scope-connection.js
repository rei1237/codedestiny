/**
 * 공유 레인의 요청 스코프 연결과 모델 바인딩(설계안 C3, 2026-09-25).
 *
 * 왜: 프로덕션 결과 화면 18요청이 공유 레인에서 멈췄다(2026-09-24 8단계). [db-conn-open] 31건이 전부 공유
 * 레인이었고, 멈춘 find 는 옆 요청이 연 소켓 위에 있었다. Workers 에서 다른 요청이 연 소켓은 답하지 않는다
 * (스테이징 0/89). 결제 레인은 C4 에서 요청마다 연결을 열었고, C3 은 공유 레인을 같은 방식으로 옮긴다.
 *
 * 공유 레인은 결제 레인과 달리 모델(User.findOne …)을 거친다. 모델 63개는 모듈 로드 때 전역 기본 연결에
 * 묶이므로, 연결만 요청마다 열어서는 쿼리가 그 연결로 가지 않는다. 그래서 모델 export 를 이 모듈의
 * scopedModel 프록시로 감싼다. 프록시는 접근할 때마다 현재 스코프의 연결에 묶인 하위 모델
 * (mongoose 의 Model.__subclass — connection.model 이 다른 연결로 옮길 때 쓰는 것과 같은 경로)을 돌려준다.
 * 하위 모델은 기반 모델을 상속하므로 스코프 안에서 만든 문서도 기반 모델의 instanceof 다.
 * 모델 63개 전부 하위 모델을 만들어도 0.5ms 다(재컴파일은 6ms, 2026-09-25 로컬 실측).
 *
 * 스코프 밖(테스트·스크립트·모듈 초기화)이면 기반 모델을 그대로 돌려준다. 테스트가 기반 모델에 건 목·스파이도
 * 그대로 보인다. 스코프 안인데 연결이 아직 없으면 기반 모델로 폴백하고 [db-scope-miss] 를 남긴다. 그 경로는
 * C3 전에도 옆 요청이 연 소켓을 빌려 멈추던 경로다. 이제는 전역 연결이 열리지 않으므로 바로 실패하고 드러난다.
 *
 * 🔴 __subclass 는 기반 모델의 subclassed 배열에 하위 모델을 쌓는다(판별자 전파용). 요청마다 쌓이면 끝난
 *    연결과 클라이언트가 아이솔레이트에 계속 붙잡힌다. 스코프가 끝나면 releaseScopeModels 가 빼낸다.
 *    mongoose 를 올릴 때 이 배열의 이름이 바뀌면 누수가 조용히 돌아온다. db.shared-lane-scope 테스트가 고정한다.
 */

import { currentDbScope } from "./db-scope.js";

const scopeConnections = new WeakMap();
const subclassesByConnection = new WeakMap();
const scopeSubclasses = new WeakMap();
const scopeNotes = new WeakMap();
const BASE_MODEL = Symbol("db-scope-connection.baseModel");
const SUBCLASSED_DESCRIPTION = "mongoose#Model#subclassed";
// 스키마·이름 조회는 DB 에 가지 않으므로 miss 로 세지 않는다.
const METADATA_PROPS = new Set(["modelName", "schema", "name", "length", "prototype"]);

/** db.js 가 이 스코프의 공유 레인 연결을 걸거나(conn) 떼어 낸다(null). */
export function bindScopeConnection(scope, conn) {
  if (conn) scopeConnections.set(scope, conn);
  else scopeConnections.delete(scope);
}

// 스코프마다 종류·모델별로 한 줄만 남긴다. 요청 하나에서 같은 모델을 수십 번 만지므로 매번 찍으면 tail 이 묻힌다.
function noteOnce(scope, tag, detail) {
  let seen = scopeNotes.get(scope);
  if (!seen) {
    seen = new Set();
    scopeNotes.set(scope, seen);
  }
  const key = `${tag}:${detail.model || ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.log(tag, JSON.stringify({ scope: scope.id, lane: "shared", ...detail }));
}

/**
 * 이 요청의 공유 레인 연결. 스코프 밖이거나 아직 연결 전·스코프가 끝난 뒤면 null 이다.
 * 호출부는 `(scopeConnection() || mongoose).startSession()` 처럼 자기 mongoose 로 폴백한다 —
 * 테스트가 목킹하는 것이 호출부의 mongoose 라서 폴백도 그쪽이어야 한다.
 */
export function scopeConnection() {
  const scope = currentDbScope();
  if (!scope) return null;
  if (scope.ended) {
    noteOnce(scope, "[db-scope-late]", { what: "connection" });
    return null;
  }
  const conn = scopeConnections.get(scope) || null;
  if (!conn) noteOnce(scope, "[db-scope-miss]", { what: "connection" });
  return conn;
}

function resolveModel(base, prop) {
  const scope = currentDbScope();
  if (!scope) return base;
  if (scope.ended) {
    if (!METADATA_PROPS.has(prop)) noteOnce(scope, "[db-scope-late]", { model: base.modelName, prop: String(prop) });
    return base;
  }
  const conn = scopeConnections.get(scope);
  if (!conn) {
    if (!METADATA_PROPS.has(prop)) noteOnce(scope, "[db-scope-miss]", { model: base.modelName, prop: String(prop) });
    return base;
  }
  let subclasses = subclassesByConnection.get(conn);
  if (!subclasses) {
    subclasses = new Map();
    subclassesByConnection.set(conn, subclasses);
  }
  let sub = subclasses.get(base);
  if (!sub) {
    sub = base.__subclass(conn);
    subclasses.set(base, sub);
    let made = scopeSubclasses.get(scope);
    if (!made) {
      made = [];
      scopeSubclasses.set(scope, made);
    }
    made.push({ base, sub });
  }
  return sub;
}

/**
 * 모델 export 를 감싼다. 스코프 밖에서는 기반 모델과 똑같이 동작한다(값을 묶지 않고 그대로 돌려준다 —
 * 묶으면 jest 스파이가 목 함수로 안 보인다). 스코프 안에서는 하위 모델의 함수를 하위 모델에 묶어 돌려주므로
 * mongoose 내부는 프록시가 아니라 진짜 모델을 this 로 본다. 대입·정의·삭제는 기반 모델로 간다(정적 속성을
 * 바꾸려는 뜻은 전역이고, 하위 모델은 기반 모델을 상속해 그 값을 본다).
 */
export function scopedModel(base) {
  if (!base || base[BASE_MODEL]) return base;
  const bound = new WeakMap();
  const proxy = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === BASE_MODEL) return target;
      const model = resolveModel(target, prop);
      if (model === target) return Reflect.get(target, prop, receiver);
      const value = Reflect.get(model, prop, model);
      if (typeof value !== "function") return value;
      let cache = bound.get(model);
      if (!cache) {
        cache = new Map();
        bound.set(model, cache);
      }
      const hit = cache.get(prop);
      if (hit && hit.fn === value) return hit.bound;
      const boundFn = value.bind(model);
      cache.set(prop, { fn: value, bound: boundFn });
      return boundFn;
    },
    construct(target, args, newTarget) {
      const model = resolveModel(target, "new");
      return Reflect.construct(model, args, newTarget === proxy ? model : newTarget);
    },
    apply(target, thisArg, args) {
      return Reflect.apply(resolveModel(target, "call"), thisArg, args);
    },
  });
  return proxy;
}

/** 프록시면 기반 모델을, 아니면 그대로 돌려준다. 컬렉션 이름처럼 연결과 무관한 값을 miss 없이 읽을 때 쓴다. */
export function unscopedModel(model) {
  return model?.[BASE_MODEL] || model;
}

/** 스코프가 만든 하위 모델을 기반 모델의 subclassed 배열에서 빼낸다. 빼낸 수를 돌려준다. */
export function releaseScopeModels(scope) {
  const made = scopeSubclasses.get(scope);
  scopeSubclasses.delete(scope);
  if (!made) return 0;
  let released = 0;
  for (const { base, sub } of made) {
    const symbol = Object.getOwnPropertySymbols(base).find((s) => s.description === SUBCLASSED_DESCRIPTION);
    const list = symbol ? base[symbol] : null;
    if (!Array.isArray(list)) continue;
    const index = list.indexOf(sub);
    if (index >= 0) {
      list.splice(index, 1);
      released += 1;
    }
  }
  return released;
}
