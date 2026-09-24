/**
 * 요청 범위 DB 스코프(설계안 C1, 2026-09-24). 동작 변경 없음 — 경계와 id 만 세운다.
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
 * ALS 선례: ./ai-locale-context.js (nodejs_compat).
 */

import { AsyncLocalStorage } from "node:async_hooks";

const dbScopeStore = new AsyncLocalStorage();

// id 는 로그용이라 짧게 둔다: 진입 종류의 첫 글자(f·q·s) + 난수 6자리.
// 난수는 요청 처리 중에만 허용되므로 모듈 최상위가 아니라 여기서 만든다.
export function runInDbScope(kind, fn) {
  const id = `${String(kind).charAt(0)}-${Math.random().toString(36).slice(2, 8)}`;
  return dbScopeStore.run({ id }, fn);
}

/** 스코프 밖(테스트·모듈 초기화·컨텍스트가 끊긴 드라이버 콜백)이면 null. */
export function currentDbScopeId() {
  return dbScopeStore.getStore()?.id ?? null;
}

/**
 * 워커 진입 객체의 핸들러를 전부 스코프로 감싼다. 핸들러 이름이 곧 진입 종류다.
 * 이름을 나열하지 않고 전부 감싸는 이유: 나중에 붙는 핸들러(email·tail 등)가 스코프 밖으로
 * 조용히 빠지지 않게 한다.
 */
export function withDbScopes(handlers) {
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [
    name,
    (...args) => runInDbScope(name, () => handler.apply(handlers, args)),
  ]));
}
