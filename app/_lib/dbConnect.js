/**
 * CF Pages / Next.js App Router 전용 MongoDB 연결 유틸리티 (순수 ESM)
 * - Node 전용 CJS/fs 의존성 없이 직접 연결
 * - 연결 캐싱으로 콜드스타트 최소화
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ★ MongoDB Atlas IP 화이트리스트 설정 방법 (서버리스 필수!)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Cloudflare Pages/Workers는 서버리스 환경으로 요청마다 IP가 달라집니다.
 * 특정 IP를 허용해도 다음 요청에서 다른 IP가 배정되어 타임아웃이 발생합니다.
 *
 * 설정 방법:
 *  1. https://cloud.mongodb.com 접속 → 해당 Organization/Project 선택
 *  2. 왼쪽 메뉴 "Network Access" 클릭
 *  3. "ADD IP ADDRESS" 버튼 클릭
 *  4. "ALLOW ACCESS FROM ANYWHERE" 선택 → 0.0.0.0/0 자동 입력됨
 *  5. "Confirm" 버튼 클릭 → 적용까지 약 1~2분 대기
 *
 * ★ 주의: 0.0.0.0/0은 "모든 IP 허용"으로 DB에 강한 비밀번호가 반드시 필요합니다.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * ▸ Dynamic import 대신 정적 import 사용:
 *   Cloudflare Workers + OpenNext 번들링 환경에서 `await import("mongoose")`를
 *   동적으로 쓰면 esbuild가 모듈 초기화 시점에 require로 인라인해 Worker 시작 시
 *   충돌할 수 있다. 정적 import로 선언하면 esbuild가 안전하게 번들링한다.
 */
import mongoose from "mongoose";

let _connecting = null;

export async function dbConnect() {
  const uri = (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    ""
  ).trim().replace(/^["']|["']$/g, "");

  if (!uri) {
    throw new Error(
      "MONGO_URI 환경변수가 CF Pages에 설정되지 않았습니다. " +
      "Cloudflare Dashboard → Pages → code-destiny-web → Settings → Environment variables에서 MONGO_URI를 추가하세요."
    );
  }

  const m = mongoose;

  // 이미 연결된 상태 (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
  if (m.connection.readyState === 1) {
    return m;
  }

  // 연결 중이면 기다림
  if (_connecting) {
    await _connecting;
    return m;
  }

  const dbName = (process.env.MONGO_DB_NAME || "").trim();
  const connectOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 10000,
    // 🔴 Worker 쪽 maxPoolSize(worker/lib/db.js)와 **같은 계수로 정렬한다.** 전역 연결 수 =
    // 인스턴스 수 × poolSize 이고 같은 클러스터를 Worker 와 공유하므로, 이쪽만 큰 풀을 잡으면
    // Worker 의 연결 예산을 조용히 잠식한다. 10 → 5 (2026-08-12, Atlas M0 상한 500 기준) →
    // 다시 10 (2026-08-12, M10 전환으로 상한이 1500 이 되어 Worker 쪽이 5 → 10 으로 올랐다).
    // Worker 쪽 현재값은 worker/wrangler.toml [vars] MONGO_MAX_POOL_SIZE=10 이 정본이다(코드 기본값이 아니라
    // [vars] 가 프로덕션 값 — db.vars-code-default-parity 테스트, 2026-08-31).
    // 더 올리려면 Worker 쪽 주석의 조건([db-connect-error] 0 확인)과 함께 양쪽을 같이 판단할 것.
    maxPoolSize: 10,
    minPoolSize: 0,
    // 🔴 false 고정 (2026-08-12): 이 헬퍼를 쓰는 스크립트들이 worker/lib/models.js 를 통째로
    // import 하도록 바뀌면서 모델 45개가 컴파일된다. autoIndex 가 켜져 있으면 그중 선언만 되고
    // 아직 만들어지지 않은 인덱스(2026-08 감사 기준 72개)가 로컬 실행 한 번에 프로덕션으로
    // 나간다 — unique 인 permanent_unlock_identity 는 기존 중복이 있으면 실패하고,
    // checkout_funnel_events 의 90일 TTL 은 그 순간부터 문서를 지우기 시작한다.
    // 인덱스 생성 주체는 scripts/migrations/*.mjs 하나뿐이다(worker/lib/db.js 도 같은 이유로 false).
    autoIndex: false,
  };
  if (dbName) {
    connectOptions.dbName = dbName;
  }

  _connecting = m.connect(uri, connectOptions).finally(() => {
    _connecting = null;
  });

  try {
    await _connecting;
  } catch (err) {
    const msg = String(err?.message || err);
    // 네트워크/연결 타임아웃 → IP 화이트리스트 안내 메시지로 교체
    const isNetworkErr =
      msg.includes("timed out") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("Server selection timed") ||
      msg.includes("network error");
    if (isNetworkErr) {
      throw new Error(
        `MongoDB 연결 실패 — IP 화이트리스트 설정 확인 필요!\n` +
        `Cloudflare Pages는 서버리스 환경으로 IP가 매 요청마다 변경됩니다.\n` +
        `해결방법: MongoDB Atlas → Network Access → "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) 설정\n` +
        `원본 오류: ${msg}`
      );
    }
    throw err;
  }
  return m;
}
