// 통합 CMS API.
//
// 관리자 경로(/api/admin/cms/*)는 admin.js 가 authorizeAdminRequest 로 인증한 뒤 위임한다.
// 공개 경로(/api/cms/*)는 인증 없이 발행본만 내보낸다.
//
// 편집 대상 정의는 lib/cms/registry.mjs 하나뿐이다. 이 파일은 그 선언에 따라 검증·저장·서빙만 한다.
import { connectDb, withMongoRetry } from "../lib/db.js";
import { CmsEntry, CmsRevision } from "../lib/models.js";
import { purgeCmsCache, readCmsThroughCache } from "../lib/cms-cache.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { buildCmsPublicStatusQuery } from "../lib/cms-status.js";
import { CMS_STATUSES, getCmsNamespace, isValidCmsKey, listRuntimeNamespaceIds } from "../../lib/cms/registry.mjs";
import { listPromptDefaults } from "../lib/cms-prompt-defaults.js";

const REVISION_KEEP_PER_KEY = 200;
const LIST_LIMIT = 1000;
const STATUS_SET = new Set(CMS_STATUSES);

/** 관리자 READ 전용 재시도. 쓰기에는 쓰지 않는다(중복 결제/중복 리비전 방지).
 *  옵션 근거는 admin.js 의 adminMongoRead 주석 참조. */
function cmsMongoRead(env, operation) {
  return withMongoRetry(env, operation, {
    retries: 1,
    retryOnOperationTimeout: true,
    retryAdmissionOnOverload: true,
  });
}

function normalizeLocale(value) {
  const locale = String(value || "ko").trim().toLowerCase();
  return /^[a-z]{2}(-[a-z]{2})?$/.test(locale) ? locale : "ko";
}

function parseEntryPath(path) {
  const matched = String(path || "").match(/^\/entries\/([^/]+)\/(.+?)(\/revisions|\/restore|\/status)?$/i);
  if (!matched) return null;

  let ns = "";
  let key = "";
  try {
    ns = decodeURIComponent(matched[1] || "").trim();
    key = decodeURIComponent(matched[2] || "").trim();
  } catch (e) {
    return null;
  }

  const namespace = getCmsNamespace(ns);
  if (!namespace || !isValidCmsKey(key)) return null;

  return { namespace, ns, key, action: String(matched[3] || "").replace(/^\//, "") };
}

/* 레지스트리의 필드 선언대로만 값을 받는다. 선언에 없는 필드는 조용히 버린다 —
   프론트가 잘못 보내도 DB 에 정체불명 필드가 쌓이지 않게 하려는 것. */
function normalizeFields(namespace, rawFields) {
  const fields = {};
  if (!rawFields || typeof rawFields !== "object") return fields;

  for (const def of namespace.fields) {
    const raw = rawFields[def.name];
    if (raw === undefined || raw === null) continue;

    if (def.kind === "number") {
      const num = Number(raw);
      if (!Number.isFinite(num)) continue;
      const min = Number.isFinite(def.min) ? def.min : -Infinity;
      const max = Number.isFinite(def.max) ? def.max : Infinity;
      fields[def.name] = Math.min(max, Math.max(min, num));
      continue;
    }

    if (def.kind === "lines") {
      const list = Array.isArray(raw)
        ? raw
        : String(raw).split("\n");
      const cleaned = list.map((line) => String(line ?? "").trim()).filter(Boolean);
      if (!cleaned.length) continue;
      fields[def.name] = cleaned;
      continue;
    }

    if (def.kind === "qa-list") {
      if (!Array.isArray(raw)) continue;
      const cleaned = raw
        .map((item) => ({
          question: String(item?.question ?? "").trim(),
          answer: String(item?.answer ?? "").trim(),
        }))
        .filter((item) => item.question && item.answer);
      if (!cleaned.length) continue;
      fields[def.name] = cleaned;
      continue;
    }

    if (def.kind === "beats") {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const cleaned = {};
      for (const [index, text] of Object.entries(raw)) {
        if (!/^\d+$/.test(String(index))) continue;
        const value = String(text ?? "").trim();
        if (!value) continue;
        cleaned[String(index)] = value;
      }
      if (!Object.keys(cleaned).length) continue;
      fields[def.name] = cleaned;
      continue;
    }

    /* 고정 키 표. `{ 키: { 필드: 문장 } }` 2단 구조만 통과시킨다.
       키를 새로 만드는 것은 막지 않되(코드가 모르는 키는 cmsRecord 가 무시한다) 값이
       문자열이 아닌 것은 버려, 편집기 버그가 표 구조를 망가뜨리지 못하게 한다. */
    if (def.kind === "record") {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const table = {};
      for (const [recordKey, row] of Object.entries(raw)) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        const cleaned = {};
        for (const [fieldName, value] of Object.entries(row)) {
          if (typeof value !== "string") continue;
          const trimmed = value.trim();
          if (!trimmed) continue;
          cleaned[fieldName] = value.length > 20000 ? value.slice(0, 20000) : value;
        }
        if (Object.keys(cleaned).length) table[String(recordKey)] = cleaned;
      }
      if (!Object.keys(table).length) continue;
      fields[def.name] = table;
      continue;
    }

    if (def.kind === "select") {
      const value = String(raw).trim();
      if (Array.isArray(def.options) && !def.options.includes(value)) continue;
      fields[def.name] = value;
      continue;
    }

    const text = String(raw);
    if (!text.trim()) continue;
    const max = Number.isFinite(def.max) ? def.max : 20000;
    fields[def.name] = text.length > max ? text.slice(0, max) : text;
  }

  return fields;
}

/* 라이트 노벨 전용 안전장치. 비트 텍스트가 VN 원본의 JSON 리터럴 안에 그대로 들어가므로,
   따옴표·역슬래시·</script 가 섞이면 대본 전체가 파싱 불가가 되어 노벨이 백지가 된다.
   빌드 단계에도 같은 검사가 있지만(fail-soft), 여기서 먼저 막아야 운영자가 원인을 알 수 있다. */
function assertLightNovelConstraints(namespace, fields) {
  const rules = namespace.constraints;
  if (!rules || !fields.beats) return;

  for (const [index, text] of Object.entries(fields.beats)) {
    for (const token of rules.forbiddenInBeat || []) {
      if (text.includes(token)) {
        throw createHttpError(400, `${index}번 대사에 사용할 수 없는 문자(${token})가 있습니다. 작중 인용은 「 」를 써 주세요.`, { code: "VALIDATION_ERROR" });
      }
    }
    if (rules.beatMaxLength && text.length > rules.beatMaxLength) {
      throw createHttpError(400, `${index}번 대사가 ${rules.beatMaxLength}자를 넘습니다. (현재 ${text.length}자)`, { code: "VALIDATION_ERROR" });
    }
  }
}

function toEntryItem(doc) {
  return {
    namespace: String(doc?.namespace || ""),
    key: String(doc?.key || ""),
    locale: String(doc?.locale || "ko"),
    fields: doc?.fields && typeof doc.fields === "object" ? doc.fields : {},
    status: String(doc?.status || "draft"),
    channel: String(doc?.channel || "build"),
    publishAt: doc?.publishAt || null,
    unpublishAt: doc?.unpublishAt || null,
    version: Number(doc?.version || 1),
    note: String(doc?.note || ""),
    updatedBy: String(doc?.updatedBy || ""),
    updatedAt: doc?.updatedAt || null,
  };
}

function toRevisionItem(doc) {
  return {
    version: Number(doc?.version || 0),
    fields: doc?.fields && typeof doc.fields === "object" ? doc.fields : {},
    status: String(doc?.status || ""),
    note: String(doc?.note || ""),
    updatedBy: String(doc?.updatedBy || ""),
    createdAt: doc?.createdAt || null,
  };
}

// ───────────────────────────── 관리자 핸들러 ─────────────────────────────

async function handleEntryList(path, request, env) {
  const url = new URL(request.url);
  const ns = String(url.searchParams.get("ns") || "").trim();
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const statusFilter = String(url.searchParams.get("status") || "").trim().toLowerCase();
  const keyword = String(url.searchParams.get("q") || "").trim().slice(0, 120);

  const query = { locale };
  if (ns) {
    if (!getCmsNamespace(ns)) throw createHttpError(400, "알 수 없는 콘텐츠 그룹입니다.", { code: "VALIDATION_ERROR" });
    query.namespace = ns;
  }
  if (statusFilter && STATUS_SET.has(statusFilter)) query.status = statusFilter;

  // 캐시 키는 검색어를 제외한 축으로만 잡고 검색은 메모리에서 거른다.
  // 검색어마다 캐시 엔트리를 만들면 히트율이 0에 수렴한다.
  //
  // ttlSeconds: 0 = 항상 재조회, 실패했을 때만 stale 폴백.
  // 신선분을 들고 있으면 발행 직후 목록이 옛 상태로 보인다 — 아이솔레이트마다 메모가 따로라
  // 쓰기 쪽 purge 가 읽기를 처리한 다른 아이솔레이트에는 닿지 않기 때문이다.
  // 관리자 목록은 트래픽이 미미하므로 캐시의 목적은 속도가 아니라 DB 블립 방어 하나다.
  const { value: items, stale, cachedAt } = await readCmsThroughCache({
    key: `cms-entries:${ns || "all"}:${locale}:${statusFilter || "any"}`,
    ttlSeconds: 0,
    load: async () => {
      await connectDb(env);
      const docs = await cmsMongoRead(env, async () =>
        CmsEntry.find(query).sort({ updatedAt: -1 }).limit(LIST_LIMIT).lean());
      return docs.map((doc) => toEntryItem(doc));
    },
  });

  const filtered = keyword
    ? items.filter((item) => {
      const haystack = `${item.namespace} ${item.key} ${JSON.stringify(item.fields)}`.toLowerCase();
      return haystack.includes(keyword.toLowerCase());
    })
    : items;

  return json({ ok: true, items: filtered, total: filtered.length, stale, cachedAt: cachedAt || null });
}

async function handleEntryGet(parsed, request, env) {
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  await connectDb(env);

  const doc = await cmsMongoRead(env, async () =>
    CmsEntry.findOne({ namespace: parsed.ns, key: parsed.key, locale }).lean());

  return json({ ok: true, item: doc ? toEntryItem(doc) : null });
}

async function handleEntryUpsert(parsed, request, env, adminContext) {
  await connectDb(env);

  const body = await readJson(request);
  const locale = normalizeLocale(body?.locale);
  const fields = normalizeFields(parsed.namespace, body?.fields);
  if (!Object.keys(fields).length) {
    throw createHttpError(400, "저장할 내용이 없습니다.", { code: "VALIDATION_ERROR" });
  }
  assertLightNovelConstraints(parsed.namespace, fields);

  const statusRaw = String(body?.status || "draft").toLowerCase();
  if (!STATUS_SET.has(statusRaw)) {
    throw createHttpError(400, "알 수 없는 상태값입니다.", { code: "VALIDATION_ERROR" });
  }
  if (statusRaw === "scheduled" && !body?.publishAt) {
    throw createHttpError(400, "예약 발행은 게시 시작 시각이 필요합니다.", { code: "VALIDATION_ERROR" });
  }

  const updatedBy = String(adminContext?.userId || "flower-admin");
  const note = String(body?.note || "").trim().slice(0, 500);

  const existing = await CmsEntry.findOne({ namespace: parsed.ns, key: parsed.key, locale }).lean();
  const nextVersion = Number(existing?.version || 0) + 1;

  const doc = await CmsEntry.findOneAndUpdate(
    { namespace: parsed.ns, key: parsed.key, locale },
    {
      $set: {
        fields,
        status: statusRaw,
        channel: parsed.namespace.channel,
        publishAt: body?.publishAt ? new Date(body.publishAt) : null,
        unpublishAt: body?.unpublishAt ? new Date(body.unpublishAt) : null,
        version: nextVersion,
        note,
        updatedBy,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  await recordRevision({ ns: parsed.ns, key: parsed.key, locale, version: nextVersion, fields, status: statusRaw, note, updatedBy });
  await purgeEntryCaches(parsed.ns, locale);

  return json({ ok: true, item: toEntryItem(doc) });
}

async function handleEntryStatus(parsed, request, env, adminContext) {
  await connectDb(env);

  const body = await readJson(request);
  const locale = normalizeLocale(body?.locale);
  const statusRaw = String(body?.status || "").toLowerCase();
  if (!STATUS_SET.has(statusRaw)) {
    throw createHttpError(400, "알 수 없는 상태값입니다.", { code: "VALIDATION_ERROR" });
  }

  const update = { status: statusRaw, updatedBy: String(adminContext?.userId || "flower-admin") };
  if (body?.publishAt !== undefined) update.publishAt = body.publishAt ? new Date(body.publishAt) : null;
  if (body?.unpublishAt !== undefined) update.unpublishAt = body.unpublishAt ? new Date(body.unpublishAt) : null;

  const doc = await CmsEntry.findOneAndUpdate(
    { namespace: parsed.ns, key: parsed.key, locale },
    { $set: update },
    { new: true },
  ).lean();
  if (!doc) throw createHttpError(404, "항목을 찾을 수 없습니다.", { code: "NOT_FOUND" });

  await purgeEntryCaches(parsed.ns, locale);
  return json({ ok: true, item: toEntryItem(doc) });
}

async function handleEntryDelete(parsed, request, env) {
  await connectDb(env);
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  const doc = await CmsEntry.findOneAndDelete({ namespace: parsed.ns, key: parsed.key, locale }).lean();
  if (!doc) throw createHttpError(404, "항목을 찾을 수 없습니다.", { code: "NOT_FOUND" });

  await purgeEntryCaches(parsed.ns, locale);
  return json({ ok: true, item: toEntryItem(doc) });
}

async function handleEntryRevisions(parsed, request, env) {
  await connectDb(env);
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  const docs = await cmsMongoRead(env, async () =>
    CmsRevision.find({ namespace: parsed.ns, key: parsed.key, locale })
      .sort({ version: -1 })
      .limit(REVISION_KEEP_PER_KEY)
      .lean());

  return json({ ok: true, items: docs.map((doc) => toRevisionItem(doc)) });
}

async function handleEntryRestore(parsed, request, env, adminContext) {
  await connectDb(env);

  const body = await readJson(request);
  const locale = normalizeLocale(body?.locale);
  const targetVersion = Number(body?.version || 0);
  if (!Number.isFinite(targetVersion) || targetVersion < 1) {
    throw createHttpError(400, "복원할 버전을 지정해 주세요.", { code: "VALIDATION_ERROR" });
  }

  const revision = await CmsRevision.findOne({ namespace: parsed.ns, key: parsed.key, locale, version: targetVersion }).lean();
  if (!revision) throw createHttpError(404, "해당 버전을 찾을 수 없습니다.", { code: "NOT_FOUND" });

  const existing = await CmsEntry.findOne({ namespace: parsed.ns, key: parsed.key, locale }).lean();
  const nextVersion = Number(existing?.version || 0) + 1;
  const updatedBy = String(adminContext?.userId || "flower-admin");
  const note = `v${targetVersion} 복원`;

  // 복원도 새 버전으로 쌓는다. 과거 버전을 덮어쓰면 "복원했다가 되돌리기"가 불가능해진다.
  const doc = await CmsEntry.findOneAndUpdate(
    { namespace: parsed.ns, key: parsed.key, locale },
    { $set: { fields: revision.fields, version: nextVersion, note, updatedBy, status: "draft" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  await recordRevision({ ns: parsed.ns, key: parsed.key, locale, version: nextVersion, fields: revision.fields, status: "draft", note, updatedBy });
  await purgeEntryCaches(parsed.ns, locale);

  return json({ ok: true, item: toEntryItem(doc) });
}

/** 코드에 있는 기본값(폴백)을 관리자 화면에 보여주기 위한 조회. 워커 안에만 있는 프롬프트가 대상. */
async function handleDefaults(request) {
  const ns = String(new URL(request.url).searchParams.get("ns") || "").trim();
  if (!ns.startsWith("prompt.")) {
    return json({ ok: true, defaults: {} });
  }
  return json({ ok: true, defaults: await listPromptDefaults(ns) });
}

async function handlePublishPurge(request) {
  const body = await readJson(request).catch(() => ({}));
  const ns = String(body?.ns || "").trim();
  const locale = normalizeLocale(body?.locale);

  await purgeEntryCaches(ns, locale);
  return json({ ok: true, purgedAt: new Date().toISOString() });
}

async function recordRevision({ ns, key, locale, version, fields, status, note, updatedBy }) {
  try {
    await CmsRevision.create({ namespace: ns, key, locale, version, fields, status, note, updatedBy });

    const total = await CmsRevision.countDocuments({ namespace: ns, key, locale });
    if (total > REVISION_KEEP_PER_KEY) {
      const stale = await CmsRevision.find({ namespace: ns, key, locale })
        .sort({ version: 1 })
        .limit(total - REVISION_KEEP_PER_KEY)
        .select({ _id: 1 })
        .lean();
      if (stale.length) {
        await CmsRevision.deleteMany({ _id: { $in: stale.map((doc) => doc._id) } });
      }
    }
  } catch (e) {
    // 이력 기록 실패가 본문 저장을 되돌리게 두지 않는다. 저장이 성공한 것이 더 중요하다.
  }
}

function purgeEntryCaches(ns, locale) {
  const keys = ["cms-entries", "cms-bundle"];
  if (ns) {
    for (const status of ["any", ...CMS_STATUSES]) {
      keys.push(`cms-entries:${ns}:${locale}:${status}`);
      keys.push(`cms-entries:all:${locale}:${status}`);
    }
    keys.push(`cms-bundle:${ns}:${locale}`);
  }
  keys.push(`cms-bundle:runtime:${locale}`);
  return purgeCmsCache(keys);
}

// ───────────────────────────── 공개 핸들러 ─────────────────────────────

async function handlePublicBundle(request, env) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const nsParam = String(url.searchParams.get("ns") || "").trim();

  const runtimeNamespaces = listRuntimeNamespaceIds();
  const requested = nsParam
    ? nsParam.split(",").map((value) => value.trim()).filter((value) => runtimeNamespaces.includes(value))
    : runtimeNamespaces;

  if (!requested.length) {
    return jsonCacheable({ ok: true, locale, entries: {} });
  }

  const cacheKey = `cms-bundle:${requested.length === runtimeNamespaces.length ? "runtime" : requested.join("+")}:${locale}`;

  const { value: entries, stale } = await readCmsThroughCache({
    key: cacheKey,
    ttlSeconds: 60,
    staleTtlSeconds: 3600,
    load: async () => {
      await connectDb(env);
      const docs = await cmsMongoRead(env, async () => CmsEntry.find({
        namespace: { $in: requested },
        locale,
        ...buildCmsPublicStatusQuery(),
      }).limit(LIST_LIMIT).lean());

      const grouped = {};
      for (const doc of docs) {
        const ns = String(doc?.namespace || "");
        if (!ns) continue;
        if (!grouped[ns]) grouped[ns] = {};
        grouped[ns][String(doc?.key || "")] = doc?.fields && typeof doc.fields === "object" ? doc.fields : {};
      }
      return grouped;
    },
  });

  return jsonCacheable({ ok: true, locale, entries, stale });
}

function jsonCacheable(payload) {
  return json(payload, {
    headers: {
      // 엣지가 60초 신선분을 들고, 그 뒤 10분은 갱신하는 동안 옛 값을 그대로 내보낸다.
      // 프론트는 어차피 폴백 우선이라 조금 늦게 반영돼도 화면이 깨지지 않는다.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}

// ───────────────────────────── 라우팅 ─────────────────────────────

/** admin.js 가 인증을 마친 뒤 호출한다. path 는 "/api/admin/cms" 이후 구간. */
export async function handleAdminCmsRoutes(path, request, env, adminContext) {
  try {
    const method = request.method.toUpperCase();

    if (path === "/entries" || path === "/entries/") {
      if (method === "GET") return await handleEntryList(path, request, env);
      return methodNotAllowed();
    }

    if (path === "/defaults") {
      if (method === "GET") return await handleDefaults(request);
      return methodNotAllowed();
    }

    if (path === "/publish") {
      if (method === "POST") return await handlePublishPurge(request);
      return methodNotAllowed();
    }

    const parsed = parseEntryPath(path);
    if (parsed) {
      if (parsed.action === "revisions") {
        if (method === "GET") return await handleEntryRevisions(parsed, request, env);
        return methodNotAllowed();
      }
      if (parsed.action === "restore") {
        if (method === "POST") return await handleEntryRestore(parsed, request, env, adminContext);
        return methodNotAllowed();
      }
      if (parsed.action === "status") {
        if (method === "POST") return await handleEntryStatus(parsed, request, env, adminContext);
        return methodNotAllowed();
      }
      if (method === "GET") return await handleEntryGet(parsed, request, env);
      if (method === "PUT") return await handleEntryUpsert(parsed, request, env, adminContext);
      if (method === "DELETE") return await handleEntryDelete(parsed, request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "api/admin/cms", method: request.method } });
  }
}

/** 공개 라우트. 인증 없음, 발행본만. */
export async function handleCmsRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/cms");

    if (path === "/bundle" || path === "/bundle/") {
      if (method === "GET" || method === "HEAD") return await handlePublicBundle(request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "api/cms", method: request.method } });
  }
}
