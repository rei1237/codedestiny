/**
 * 요청 범위 DB 스코프(설계안 C1·C4, 2026-09-24). C1 은 경계와 id 를, C4 는 수명과 닫기를 세운다.
 *
 * 왜: 스테이징 실측(설계안 E)에서 다른 요청이 연 소켓 위 명령 68건이 전부 무응답이었다. 소켓을 연
 * 요청이 살아 있어도 0/3 이다. 그래서 설계안 C 는 요청(fetch 1건·queue 배치 1건·scheduled 1회)마다
 * 자기 연결을 쓴다. C1 은 그 요청 경계를 AsyncLocalStorage 로 세우고, db.js 계측([db-conn-open]·
 * [db-cmd])이 스코프 id 를 찍는다. 지금까지 "소켓을 연 요청"은 줄이 찍힌 tail 이벤트로 추정했는데,
 * 이제 보낸 쪽과 연 쪽을 id 로 바로 맞춘다.
 *
 * 🔴 스테이징에서 scope 가 null 인 [db-cmd] 가 나오면 드라이버의 비동기 경로에서 컨텍스트가 끊긴
 *    것이다. 스코프마다 연결을 붙이는 C3 의 전제가 깨지므로 C3 전에 그 경로부터 찾는다.
 *
 * 수명(설계안 C4, 2026-09-24): 스코프는 핸들러가 settle 하고, 그 요청이 ctx.waitUntil 로 넘긴 작업도 모두
 * settle 한 뒤에 끝난다. 끝나면 onDbScopeEnd 로 등록된 닫기(closer)를 돌린다. 닫기는 원래 ctx.waitUntil 에
 * 걸어 두므로, 응답을 보낸 뒤에도 IoContext 가 닫기를 마칠 때까지 살아 있다. 요청이 연 소켓은 그 요청의
 * IoContext 에서만 쓸 수 있으므로 닫기도 거기서 한다.
 * 🔴 스트리밍 응답 본문은 추적하지 않는다. 핸들러가 Response 를 돌려준 뒤에도 본문을 흘리며 DB 를 쓰는
 *    경로가 있으면 그 경로의 연결은 먼저 닫힌다. C4 의 결제 레인은 이런 경로가 없다(핸들러가 await 하거나
 *    scheduled 의 waitUntil 안에서 돈다). 공유 레인(C3)으로 넓힐 때 진행 중인 op 수를 세도록 넓힌다.
 *
 * ALS 선례: ./ai-locale-context.js (nodejs_compat).
 */

import { AsyncLocalStorage } from "node:async_hooks";

const dbScopeStore = new AsyncLocalStorage();

function isExecutionContext(value) {
  return Boolean(value) && typeof value.waitUntil === "function";
}

// 핸들러와, 추적 중인 waitUntil 작업이 모두 settle 하면 스코프를 끝내고 닫기를 돌린다.
// 기다리는 동안 waitUntil 이 더 붙을 수 있으므로 새로 붙은 것이 없을 때까지 반복한다.
async function endDbScopeWhenSettled(scope, handlerResult, tracked) {
  await Promise.allSettled([handlerResult]);
  let seen = 0;
  while (seen < tracked.length) {
    const batch = tracked.slice(seen);
    seen = tracked.length;
    await Promise.allSettled(batch);
  }
  scope.ended = true;
  // 닫기 하나가 실패하거나 던져도 나머지 닫기는 돈다.
  await Promise.allSettled(scope.closers.splice(0).map((close) => Promise.resolve().then(close)));
}

// id 는 로그용이라 짧게 둔다: 진입 종류의 첫 글자(f·q·s) + 난수 6자리.
// 난수는 요청 처리 중에만 허용되므로 모듈 최상위가 아니라 여기서 만든다.
// args[2] 가 실행 컨텍스트(fetch·scheduled·queue 의 ctx)이면 그 waitUntil 을 추적하는 Proxy 로 바꿔 넘긴다.
// ctx 가 없으면(테스트) 핸들러가 settle 하면 스코프가 끝난다.
export function runInDbScope(kind, fn, args = []) {
  const id = `${String(kind).charAt(0)}-${Math.random().toString(36).slice(2, 8)}`;
  const scope = { id, ended: false, closers: [] };
  const ctx = args[2];
  const tracked = [];
  let scopedArgs = args;
  if (isExecutionContext(ctx)) {
    scopedArgs = [...args];
    scopedArgs[2] = new Proxy(ctx, {
      get(target, prop) {
        if (prop === "waitUntil") {
          return (promise) => {
            tracked.push(promise);
            return target.waitUntil(promise);
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  // 닫기가 끝날 때까지 원래 ctx 로 IoContext 를 붙잡는다(Proxy 가 아니라 원래 ctx — 자기 자신을 추적하면
  // 영원히 끝나지 않는다).
  const endAfter = (result) => {
    const ended = endDbScopeWhenSettled(scope, result, tracked);
    if (isExecutionContext(ctx)) ctx.waitUntil(ended);
  };
  return dbScopeStore.run(scope, () => {
    let result;
    try {
      result = fn(scopedArgs);
    } catch (error) {
      endAfter(undefined);
      throw error;
    }
    endAfter(result);
    return result;
  });
}

/** 스코프 밖(테스트·모듈 초기화·컨텍스트가 끊긴 드라이버 콜백)이면 null. */
export function currentDbScopeId() {
  return dbScopeStore.getStore()?.id ?? null;
}

/** 현재 요청 스코프({ id, ended, closers }). 스코프 밖이면 null. 레인별 상태는 db.js 가 이 객체를 키로 따로 둔다. */
export function currentDbScope() {
  return dbScopeStore.getStore() ?? null;
}

/**
 * 스코프가 끝날 때 돌 닫기를 등록한다. 스코프 밖이거나 이미 끝난 스코프면 등록하지 않고 false 를 돌려준다.
 * 이때 호출부는 스코프 연결을 만들면 안 된다(닫아 줄 쪽이 없어 샌다).
 */
export function onDbScopeEnd(close) {
  const scope = dbScopeStore.getStore();
  if (!scope || scope.ended) return false;
  scope.closers.push(close);
  return true;
}

/**
 * 워커 진입 객체의 핸들러를 전부 스코프로 감싼다. 핸들러 이름이 곧 진입 종류다.
 * 이름을 나열하지 않고 전부 감싸는 이유: 나중에 붙는 핸들러(email·tail 등)가 스코프 밖으로
 * 조용히 빠지지 않게 한다.
 */
export function withDbScopes(handlers) {
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [
    name,
    (...args) => runInDbScope(name, (scopedArgs) => handler.apply(handlers, scopedArgs), args),
  ]));
}
