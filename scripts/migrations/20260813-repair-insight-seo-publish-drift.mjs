/**
 * Insight 정합 복구 — 중첩 seo{} ↔ 평면 SEO 필드, status ↔ isPublished.
 *
 * 왜 필요한가:
 *   같은 insights 컬렉션을 /api/admin/content 와 /api/admin/insights 가 서로 다른 정규화기로
 *   써 왔다. insights 경로는 중첩 seo{} 를 남기지 않고 평면 필드만 갱신했는데, 읽을 때는
 *   중첩 seo 가 평면을 이긴다(admin.js toContentItem). 그래서 그 화면에서 SEO 를 고치면
 *   저장은 되지만 화면과 공개 메타에는 낡은 값이 계속 나왔다.
 *   isPublished 도 status 와 독립으로 저장될 수 있었는데 공개 조회는 status 만 보므로
 *   (insights.js buildPublicInsightStatusQuery) "관리자엔 발행됨, 사이트엔 안 나옴" 이 났다.
 *
 *   저장 경로는 이제 하나로 합쳐졌다. 이 스크립트는 그 전에 이미 어긋난 문서를 맞춘다.
 *
 * 🔴 기본은 dry-run 이다. 실제 쓰기는 --apply 를 줘야 한다.
 *
 * 판단 기준:
 *   - SEO: 평면 필드에 값이 있고 중첩과 다르면 **평면을 정답으로 본다**. 마지막으로 저장한
 *     화면이 평면을 갱신했기 때문이다(중첩은 그때 갱신되지 않은 낡은 값이다).
 *     평면이 비어 있고 중첩에만 값이 있으면 중첩을 평면으로 복사한다(반대 방향 손실 방지).
 *   - 발행 상태: status 를 정답으로 본다. 공개 조회가 그것만 보기 때문이다.
 *
 * 사용: node scripts/migrations/20260813-repair-insight-seo-publish-drift.mjs [--apply] [--limit N]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { Insight } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const apply = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Math.max(1, Number(process.argv[limitArg + 1]) || 0) : 0;

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
};
if (!env.MONGO_URI) {
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

/** 중첩 seo 키 → 평면 필드명. 이름이 같지 않은 짝이 있으므로 표로 둔다. */
const SEO_PAIRS = [
  ["metaTitle", "metaTitle"],
  ["metaDescription", "metaDescription"],
  ["ogTitle", "ogTitle"],
  ["ogDescription", "ogDescription"],
  ["ogImage", "ogImage"],
  ["canonicalUrl", "canonicalUrl"],
];

const text = (value) => String(value == null ? "" : value).trim();

function planSeoRepair(doc) {
  const nested = doc.seo && typeof doc.seo === "object" ? doc.seo : {};
  const nextNested = {};
  const nextFlat = {};
  let changed = false;

  for (const [nestedKey, flatKey] of SEO_PAIRS) {
    const nestedValue = text(nested[nestedKey]);
    const flatValue = text(doc[flatKey]);

    if (nestedValue === flatValue) {
      nextNested[nestedKey] = nestedValue;
      continue;
    }

    // 평면에 값이 있으면 그쪽이 최신이다(마지막 저장이 평면만 갱신했다).
    // 평면이 비었으면 중첩의 값을 잃지 않도록 평면으로 내린다.
    const winner = flatValue || nestedValue;
    nextNested[nestedKey] = winner;
    if (winner !== flatValue) nextFlat[flatKey] = winner;
    changed = true;
  }

  return changed ? { seo: nextNested, ...nextFlat } : null;
}

function planPublishRepair(doc) {
  const status = text(doc.status) || "draft";
  const expected = status === "published";
  if (Boolean(doc.isPublished) === expected) return null;
  return { isPublished: expected };
}

await connectDb(env);

const query = Insight.find({}).select("_id title slug status isPublished seo metaTitle metaDescription ogTitle ogDescription ogImage canonicalUrl");
if (limit) query.limit(limit);
const docs = await query.lean();

let seoDrift = 0;
let publishDrift = 0;
let updated = 0;

for (const doc of docs) {
  const seoPatch = planSeoRepair(doc);
  const publishPatch = planPublishRepair(doc);
  if (!seoPatch && !publishPatch) continue;

  if (seoPatch) seoDrift += 1;
  if (publishPatch) publishDrift += 1;

  const label = `${doc.slug || doc._id} · ${text(doc.title).slice(0, 40)}`;
  const notes = [];
  if (seoPatch) notes.push("SEO 불일치");
  if (publishPatch) notes.push(`발행상태 불일치(status=${doc.status}, isPublished=${doc.isPublished})`);
  console.log(`- ${label} → ${notes.join(" / ")}`);

  if (apply) {
    await Insight.updateOne({ _id: doc._id }, { $set: { ...(seoPatch || {}), ...(publishPatch || {}) } });
    updated += 1;
  }
}

console.log("");
console.log(`검사 ${docs.length}건 · SEO 불일치 ${seoDrift}건 · 발행상태 불일치 ${publishDrift}건`);
console.log(apply ? `적용 완료: ${updated}건 갱신` : "dry-run 입니다. 실제로 고치려면 --apply 를 붙이세요.");

await mongoose.disconnect();
