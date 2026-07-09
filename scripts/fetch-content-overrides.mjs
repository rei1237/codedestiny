// 관리자(꽃 admin)에서 저장한 파일 기반 콘텐츠 수정본(ContentOverride, status=published)을
// 빌드 직전에 내려받아 generated JSON으로 기록한다. 데이터 모듈이 베이스 시드 위에 병합한다.
// 실패 시에도 빈 기본값을 기록하고 exit 0 — 배포를 절대 깨뜨리지 않는다(fail-soft).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMOUS_OUT = path.join(ROOT, "lib", "famous-saju", "overrides.generated.json");
const STORIES_OUT = path.join(ROOT, "lib", "stories", "overrides.generated.json");

const FIELD_KEYS = {
  "famous-saju": ["shortDescription", "heroCopy", "summary", "conclusion", "seoTitle", "seoDescription"],
  story: ["title", "description"],
  chapter: ["title", "content"],
};

function pickStringFields(source, rawFields) {
  const picked = {};
  for (const fieldKey of FIELD_KEYS[source] || []) {
    const value = rawFields?.[fieldKey];
    if (typeof value === "string" && value.trim()) picked[fieldKey] = value;
  }
  return picked;
}

function writeOutputs(famousItems, storyItems, chapterItems) {
  writeFileSync(FAMOUS_OUT, `${JSON.stringify({ version: 1, items: famousItems }, null, 2)}\n`, "utf8");
  writeFileSync(STORIES_OUT, `${JSON.stringify({ version: 1, stories: storyItems, chapters: chapterItems }, null, 2)}\n`, "utf8");
}

async function main() {
  const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  if (!mongoUri) {
    console.warn("[content-overrides] MONGO_URI not set; writing empty overrides");
    writeOutputs({}, {}, {});
    return;
  }

  const dbName = String(process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || "").trim();
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    ...(dbName ? { dbName } : {}),
  });

  try {
    const docs = await mongoose.connection.db
      .collection("contentoverrides")
      .find({ status: "published" })
      .limit(2000)
      .toArray();

    const famousItems = {};
    const storyItems = {};
    const chapterItems = {};
    for (const doc of docs) {
      const source = String(doc?.source || "");
      const key = String(doc?.key || "").trim();
      if (!key || !FIELD_KEYS[source]) continue;
      const fields = pickStringFields(source, doc?.fields);
      if (!Object.keys(fields).length) continue;
      if (source === "famous-saju") famousItems[key] = fields;
      else if (source === "story") storyItems[key] = fields;
      else if (source === "chapter") chapterItems[key] = fields;
    }

    writeOutputs(famousItems, storyItems, chapterItems);
    console.log(
      `[content-overrides] wrote overrides: famous-saju=${Object.keys(famousItems).length}, `
      + `stories=${Object.keys(storyItems).length}, chapters=${Object.keys(chapterItems).length}`,
    );
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((error) => {
  console.warn(`[content-overrides] failed (${error?.message || error}); writing empty overrides`);
  try {
    writeOutputs({}, {}, {});
  } catch (writeError) {
    console.warn(`[content-overrides] fallback write failed: ${writeError?.message || writeError}`);
  }
  process.exit(0);
});
