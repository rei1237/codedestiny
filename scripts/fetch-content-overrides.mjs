// 관리자 CMS 에서 발행한 콘텐츠를 빌드 직전에 내려받아 generated JSON 으로 기록한다.
// 정적 export 라 사용자 화면 문구는 빌드에 구워질 수밖에 없고, 그 경계가 여기다.
//
// 실패 시에도 빈 기본값을 기록하고 exit 0 — 배포를 절대 깨뜨리지 않는다(fail-soft).
// 오버라이드가 비면 코드의 기본 문자열이 그대로 쓰인다(폴백 우선).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { listBuildNamespaceIds } from "../lib/cms/registry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMOUS_OUT = path.join(ROOT, "lib", "famous-saju", "overrides.generated.json");
const VN_OUT = path.join(ROOT, "lib", "stories", "vn", "overrides.generated.json");
const CMS_OUT = path.join(ROOT, "app", "_content", "cms.generated.json");
// 바닐라 셸(index.html + js/*)은 정적 import 를 못 쓰므로 같은 내용을 public 에도 굽는다.
// js/core/cms-static.js 가 이 파일 한 장을 받아 숙요·자미두수 해설을 갈아끼운다.
const CMS_STATIC_OUT = path.join(ROOT, "public", "cms-static-overrides.json");

// 유명인 사주는 구 contentoverrides 컬렉션에도 데이터가 남아 있을 수 있어 두 소스를 함께 읽는다.
const FAMOUS_SAJU_FIELD_KEYS = ["shortDescription", "heroCopy", "summary", "conclusion", "seoTitle", "seoDescription"];

function pickStringFields(allowedKeys, rawFields) {
  const picked = {};
  for (const fieldKey of allowedKeys) {
    const value = rawFields?.[fieldKey];
    if (typeof value === "string" && value.trim()) picked[fieldKey] = value;
  }
  return picked;
}

function writeJson(filePath, payload) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeOutputs({ famousItems = {}, vnEpisodes = {}, cmsEntries = {} } = {}) {
  writeJson(FAMOUS_OUT, { version: 1, items: famousItems });
  writeJson(VN_OUT, { version: 1, episodes: vnEpisodes });
  writeJson(CMS_OUT, { version: 1, entries: cmsEntries });
  writeJson(CMS_STATIC_OUT, { version: 1, entries: cmsEntries });
}

/* 워커의 isCmsEntryPublic 과 같은 기준. 여기서 다르게 판정하면 관리자엔 발행됨으로 보이는데
   사이트엔 안 나오는(또는 그 반대) 어긋남이 생긴다. */
function isPublic(entry, now) {
  const status = String(entry?.status || "");
  if (status !== "published" && status !== "scheduled") return false;

  const publishAt = entry?.publishAt ? new Date(entry.publishAt) : null;
  const unpublishAt = entry?.unpublishAt ? new Date(entry.unpublishAt) : null;

  if (status === "scheduled" && !publishAt) return false;
  if (publishAt && publishAt.getTime() > now.getTime()) return false;
  if (unpublishAt && unpublishAt.getTime() <= now.getTime()) return false;

  return true;
}

async function main() {
  const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  if (!mongoUri) {
    console.warn("[content-overrides] MONGO_URI not set; writing empty overrides");
    writeOutputs();
    return;
  }

  const dbName = String(process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || "").trim();
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    ...(dbName ? { dbName } : {}),
  });

  try {
    const now = new Date();
    const buildNamespaces = listBuildNamespaceIds();

    const [legacyDocs, cmsDocs] = await Promise.all([
      mongoose.connection.db.collection("contentoverrides")
        .find({ status: "published", source: "famous-saju" })
        .limit(2000)
        .toArray(),
      mongoose.connection.db.collection("cmsentries")
        .find({ namespace: { $in: buildNamespaces }, locale: "ko" })
        .limit(5000)
        .toArray(),
    ]);

    const famousItems = {};
    const vnEpisodes = {};
    const cmsEntries = {};

    for (const doc of legacyDocs) {
      const key = String(doc?.key || "").trim();
      if (!key) continue;
      const fields = pickStringFields(FAMOUS_SAJU_FIELD_KEYS, doc?.fields);
      if (Object.keys(fields).length) famousItems[key] = fields;
    }

    let publishedCount = 0;
    for (const doc of cmsDocs) {
      if (!isPublic(doc, now)) continue;

      const ns = String(doc?.namespace || "");
      const key = String(doc?.key || "").trim();
      const fields = doc?.fields && typeof doc.fields === "object" ? doc.fields : null;
      if (!ns || !key || !fields) continue;
      publishedCount += 1;

      // 라이트 노벨과 유명인 사주는 전용 소비 지점이 있어 따로 뺀다.
      // 나머지는 cmsText(ns, key, fallback) 가 읽는 공통 번들로 간다.
      if (ns === "light-novel") {
        vnEpisodes[key] = fields;
        continue;
      }
      if (ns === "famous-saju") {
        const picked = pickStringFields(FAMOUS_SAJU_FIELD_KEYS, fields);
        if (Object.keys(picked).length) famousItems[key] = picked;
        continue;
      }

      if (!cmsEntries[ns]) cmsEntries[ns] = {};
      cmsEntries[ns][key] = fields;
    }

    writeOutputs({ famousItems, vnEpisodes, cmsEntries });
    console.log(
      `[content-overrides] wrote overrides: famous-saju=${Object.keys(famousItems).length}, `
      + `light-novel=${Object.keys(vnEpisodes).length}, cms-namespaces=${Object.keys(cmsEntries).length} `
      + `(published=${publishedCount}/${cmsDocs.length})`,
    );
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((error) => {
  console.warn(`[content-overrides] failed (${error?.message || error}); writing empty overrides`);
  try {
    writeOutputs();
  } catch (writeError) {
    console.warn(`[content-overrides] fallback write failed: ${writeError?.message || writeError}`);
  }
  process.exit(0);
});
