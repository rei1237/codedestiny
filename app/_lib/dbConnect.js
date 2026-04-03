/**
 * CF Pages / Next.js App Router 전용 MongoDB 연결 유틸리티 (순수 ESM)
 * - server/config/db.js의 CJS/fs 의존성을 배제하고 직접 연결
 * - 연결 캐싱으로 콜드스타트 최소화
 */

let _mongoose = null;
let _connecting = null;

async function getMongoose() {
  if (!_mongoose) {
    // Dynamic import to ensure it's loaded asynchronously
    _mongoose = (await import("mongoose")).default;
  }
  return _mongoose;
}

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

  const m = await getMongoose();

  // 이미 연결된 상태 (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
  if (m.connection.readyState === 1) {
    return m;
  }

  // 연결 중이면 기다림
  if (_connecting) {
    await _connecting;
    return m;
  }

  _connecting = m.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 15000,
    maxPoolSize: 5,
    minPoolSize: 1,
  }).finally(() => {
    _connecting = null;
  });

  await _connecting;
  return m;
}
