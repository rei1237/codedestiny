/**
 * User 모델 접근 seam — 정본인 worker/lib/models.js 로 위임한다.
 *
 * 🔴 예전에는 여기에 **세 번째 User 스키마**가 통째로 들어 있었다. 워커 정본과 달라
 * `honey_*` tier enum, `banReason`/`bannedAt`, `lastLoginAt`, `destinyCurrentProfileId`,
 * `profileSubscription.{status,autoRenewEnabled,currentPeriodStart,priceCoins,…}` 같은
 * 필드를 갖고 있었고, 이 모델을 쓰는 시드 스크립트가 실행될 때마다 프로덕션 users 문서에
 * 그 필드들이 새겨졌다. 2026-08 감사에서 정확히 9건의 문서가 이 모델의 지문을 갖고 있었다.
 * (같은 이유로 scripts/seed-preview-test-account.mjs 는 오래전부터 이 파일을 쓰지 않는다.)
 *
 * 그래서 스키마를 지우고 위임만 남겼다. 호출부(getUserModel())는 그대로 쓸 수 있다.
 *
 * 🔴 연결은 worker/lib/db.js 의 connectDb 를 쓴다. app/_lib/dbConnect.js 는
 * `autoIndex: NODE_ENV !== "production"` 이라, 워커 모델 45개가 컴파일된 상태에서 그쪽으로
 * 붙으면 프로덕션 DB 에 인덱스 생성이 무더기로 나간다. connectDb 는 autoIndex:false 다.
 */
import { connectDb } from "../../../worker/lib/db.js";
import { User } from "../../../worker/lib/models.js";

export async function getUserModel() {
  await connectDb({
    MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
    MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  });
  return User;
}

export default getUserModel;
