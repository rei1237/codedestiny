// GET /api/admin/ping
// 관리자 API 진단 엔드포인트 — DB 연결 상태 / 환경변수 / 컬렉션 현황 반환
// 인증 불필요 (민감 정보는 마스킹)
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** MONGO_URI에서 데이터베이스 이름을 추출 (마스킹된 URI 반환) */
function parseMongoInfo(uri) {
  if (!uri) return { masked: "(없음)", dbName: "(알 수 없음)", host: "(알 수 없음)" };
  try {
    // mongodb+srv://user:pass@cluster.mongodb.net/dbname?opts
    const noScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    const atIdx = noScheme.indexOf("@");
    const afterAt = atIdx >= 0 ? noScheme.slice(atIdx + 1) : noScheme;
    const [hostPart, ...rest] = afterAt.split("/");
    const dbPart = (rest.join("/") || "").split("?")[0] || "test"; // MongoDB 기본 DB는 "test"
    const masked = `mongodb+srv://***:***@${hostPart}/${dbPart}…`;
    return { masked, dbName: dbPart || "(기본값: test)", host: hostPart };
  } catch {
    return { masked: "(파싱 실패)", dbName: "(알 수 없음)", host: "(알 수 없음)" };
  }
}

export async function GET() {
  const rawUri = (process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  const uriSet = rawUri.length > 0;
  const mongoInfo = parseMongoInfo(rawUri);

  const result = {
    ok: false,
    timestamp: new Date().toISOString(),
    env: {
      mongoUriSet: uriSet,
      mongoUri: mongoInfo.masked,
      dbName: mongoInfo.dbName,
      host: mongoInfo.host,
      flowerSecretSet: Boolean(process.env.FLOWER_ADMIN_SECRET),
      nodeEnv: process.env.NODE_ENV || "(없음)",
    },
    db: null,
    message: "",
  };

  if (!uriSet) {
    result.message = "MONGO_URI 환경변수가 설정되지 않았습니다. Cloudflare Pages → Settings → Environment variables 에서 추가하세요.";
    return json(result, 503);
  }

  let mongoose;
  try {
    mongoose = await dbConnect();
    const readyState = mongoose.connection.readyState;
    const readyStateMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

    result.db = {
      readyState,
      readyStateText: readyStateMap[readyState] ?? "unknown",
      host: mongoose.connection.host || "(없음)",
      name: mongoose.connection.name || "(없음)",
    };

    if (readyState === 1) {
      // 컬렉션 목록 조회 (진단용)
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const colNames = collections.map((c) => c.name);
        result.db.collections = colNames;
        result.db.usersCollectionExists = colNames.includes("users");

        // users 컬렉션 존재하면 카운트
        if (result.db.usersCollectionExists) {
          const count = await mongoose.connection.db.collection("users").countDocuments({});
          result.db.usersCount = count;
        }
      } catch (colErr) {
        result.db.collectionsError = String(colErr?.message || colErr);
      }

      result.ok = true;
      result.message = "DB 연결 정상";
    } else {
      result.message = `DB readyState = ${readyState} (${readyStateMap[readyState] ?? "unknown"})`;
    }
  } catch (err) {
    result.db = { error: String(err?.message || err) };
    result.message = `DB 연결 실패: ${err?.message || err}`;
    return json(result, 503);
  }

  return json(result, result.ok ? 200 : 502);
}
