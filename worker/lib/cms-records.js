// 워커가 서빙하는 해설 표의 CMS 오버라이드 리더.
//
// 왜 빌드 채널이 아닌가: 이 표들은 워커 번들 안에 있어서, 빌드 채널(정적 사이트 재빌드)로는
// 워커에 닿지 않는다. 관리자가 "사이트 반영"을 눌러도 값이 안 바뀌는 유령 항목이 된다.
// 그래서 runtime 채널로 두고 워커가 요청 시점에 DB 에서 읽는다.
//
// 설계는 cms-prompts.js 와 같다.
//   1) 절대 던지지 않는다 — 조회 실패 = 코드 기본값.
//   2) 절대 오래 붙잡지 않는다 — 재시도 0회 + 1.5초 상한. 해설 한 줄 때문에 유료 리포트가
//      타임아웃나면 안 된다(새 타임아웃 계층이 아니라 withMongoRetry 옵션을 좁히는 것).
import { connectDb, withMongoRetry } from "./db.js";
import { CmsEntry } from "./models.js";
import { readCmsThroughCache } from "./cms-cache.js";
import { buildCmsPublicStatusQuery } from "./cms-status.js";
import { setCmsRecords } from "./cms-record-store.js";

const RECORD_NAMESPACES = ["sukuyo-day", "vedic-reading"];
const CACHE_KEY = "cms-records:ko";
const CACHE_TTL_SECONDS = 60;
const READ_TIMEOUT_MS = 1500;

async function loadRecords(env) {
  try {
    const { value } = await readCmsThroughCache({
      key: CACHE_KEY,
      ttlSeconds: CACHE_TTL_SECONDS,
      staleTtlSeconds: 3600,
      load: async () => {
        await connectDb(env);
        const docs = await withMongoRetry(
          env,
          async () => CmsEntry.find({
            namespace: { $in: RECORD_NAMESPACES },
            locale: "ko",
            ...buildCmsPublicStatusQuery(),
          }).limit(200).lean(),
          { retries: 0, attemptTimeoutMS: READ_TIMEOUT_MS },
        );

        const grouped = {};
        for (const doc of docs) {
          const ns = String(doc?.namespace || "");
          const key = String(doc?.key || "");
          const table = doc?.fields?.record;
          if (!ns || !key || !table || typeof table !== "object") continue;
          if (!grouped[ns]) grouped[ns] = {};
          grouped[ns][key] = table;
        }
        return grouped;
      },
    });
    // 동기 접근자가 읽을 수 있게 보관소에 실어 둔다.
    setCmsRecords(value || {});
    return value || {};
  } catch (e) {
    return {};
  }
}

/** 리포트 조립 전에 한 번 불러 동기 접근자가 최신 값을 보게 한다. 실패해도 기본값으로 진행한다. */
export async function primeCmsRecords(env) {
  await loadRecords(env);
}

/**
 * 표에서 한 칸을 읽는다. 오버라이드가 없거나 조회가 실패하면 fallback 을 그대로 돌려준다.
 * `cmsRecordCell(env, "sukuyo-day", "mansion", "3", "great", 기본문장)`
 */
export async function cmsRecordCell(env, ns, key, recordKey, field, fallback) {
  const records = await loadRecords(env);
  const value = records?.[ns]?.[key]?.[String(recordKey)]?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** 표에서 한 행을 통째로 병합해 읽는다(문자열 필드만 덮어쓴다). */
export async function cmsRecordRowAsync(env, ns, key, recordKey, fallback) {
  if (!fallback || typeof fallback !== "object") return fallback;

  const records = await loadRecords(env);
  const row = records?.[ns]?.[key]?.[String(recordKey)];
  if (!row || typeof row !== "object") return fallback;

  const merged = { ...fallback };
  let changed = false;
  for (const [field, value] of Object.entries(row)) {
    if (!(field in fallback)) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    merged[field] = value;
    changed = true;
  }

  return changed ? merged : fallback;
}
