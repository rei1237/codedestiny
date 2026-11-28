// 인생 보정 API (/api/life-calibration). 설계: docs/context/life-calibration.md (P1b)
// 기본 OFF: lifeCalibrationOn(env, 'api') 가 거짓이면 모든 경로가 404 다. 응답은 json() 기본값(no-store)으로 캐시하지 않는다.
// 🔴 메모 원문을 로그·오류 메시지·응답 외 어디에도 남기지 않는다.
import { requireAuth } from "../lib/auth.js";
import { withMongoRetry } from "../lib/db.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { ProfileCard, User } from "../lib/models.js";
import { lifeCalibrationOn } from "../lib/engine-rollout.js";
import { decryptBoundSecret, encryptBoundSecret } from "../lib/pii-crypto.js";
import {
  LifeCalibrationConsent,
  LifeEvent,
  deleteLifeCalibrationForProfile,
  deleteLifeCalibrationForUser,
} from "../lib/life-calibration-models.js";
import {
  LIFE_CALIBRATION_CONSENT_VERSION,
  LIFE_EVENT_SCHEMA_VERSION,
  LifeEventInputError,
  normalizeLifeEvents,
} from "../../lib/life-calibration/life-events.mjs";
import { loadSelfLifeCalibration } from "../lib/life-calibration-compute.js";

const NOTE_PURPOSE = "life-event-note";
const fail = (status, code, message) => createHttpError(status, message, { code });
const kstYear = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).getUTCFullYear();

function readProfileId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 80) throw fail(400, "PROFILE_REQUIRED", "프로필을 선택해 주세요.");
  return value.trim();
}

async function readConsent(env, uid) {
  const doc = await withMongoRetry(env, () => LifeCalibrationConsent.findById(uid).lean());
  return doc?.consent?.granted === true && doc.consent.version === LIFE_CALIBRATION_CONSENT_VERSION ? doc.consent : null;
}

async function requireConsent(env, uid) {
  if (!await readConsent(env, uid)) throw fail(403, "LIFE_CALIBRATION_CONSENT_REQUIRED", "인생 보정 선택 동의가 필요해요.");
}

// 1차는 본인 프로필만 받는다(타인 프로필은 제3자 정보 동의 설계 전까지 제외).
async function requireSelfProfile(env, uid, profileId) {
  const profile = await withMongoRetry(env, () => ProfileCard.findOne({ userId: uid, profileId }).select("isSelf birth").lean());
  if (!profile) throw fail(404, "PROFILE_NOT_OWNED", "저장된 내 프로필을 선택해 주세요.");
  if (profile.isSelf !== true) throw fail(403, "PROFILE_NOT_SELF", "본인 프로필에만 입력할 수 있어요.");
  return profile;
}

async function handleConsent(request, env, uid, method) {
  if (method === "GET") {
    const consent = await readConsent(env, uid);
    return json({ ok: true, granted: Boolean(consent), version: LIFE_CALIBRATION_CONSENT_VERSION });
  }
  if (method !== "POST") return methodNotAllowed();
  const body = await readJson(request).catch(() => ({}));
  if (typeof body?.granted !== "boolean") throw fail(400, "CONSENT_REQUIRED", "동의 여부를 선택해 주세요.");
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "unknown";
  let age14Attested = false;
  if (body.granted) {
    const user = await withMongoRetry(env, () => User.findById(uid).select("legalConsents.age14AttestedAt").lean());
    age14Attested = Boolean(user?.legalConsents?.age14AttestedAt) || body.age14Attested === true;
    if (!age14Attested) throw fail(403, "AGE14_ATTESTATION_REQUIRED", "만 14세 이상만 이용할 수 있어요.");
  }
  const entry = { granted: body.granted, at: new Date(), source, version: LIFE_CALIBRATION_CONSENT_VERSION, age14Attested };
  await withMongoRetry(env, () => LifeCalibrationConsent.updateOne(
    { _id: uid },
    { $set: { consent: entry }, $push: { history: entry } },
    { upsert: true },
  ));
  // 철회는 즉시 파기한다(입력·파생 캐시). 이미 생성·구매한 상담 결과는 보관함 보존 정책대로 남는다.
  if (!body.granted) await withMongoRetry(env, () => deleteLifeCalibrationForUser(uid));
  return json({ ok: true, granted: body.granted, version: LIFE_CALIBRATION_CONSENT_VERSION });
}

async function handleSelf(request, env, uid, method) {
  if (method !== "POST") return methodNotAllowed();
  await requireConsent(env, uid);
  const body = await readJson(request).catch(() => ({}));
  const profileId = readProfileId(body?.profileId);
  const profile = await withMongoRetry(env, () => ProfileCard.findOne({ userId: uid, profileId }).select("_id").lean());
  if (!profile) throw fail(404, "PROFILE_NOT_OWNED", "저장된 내 프로필을 선택해 주세요.");
  await withMongoRetry(env, async () => {
    await ProfileCard.updateMany({ userId: uid, profileId: { $ne: profileId }, isSelf: true }, { $unset: { isSelf: 1 } });
    await ProfileCard.updateOne({ userId: uid, profileId }, { $set: { isSelf: true } });
  });
  return json({ ok: true, profileId, isSelf: true });
}

async function readEvents(env, uid, profileId) {
  const rows = await withMongoRetry(env, () => LifeEvent.find({ userId: uid, profileId }).sort({ year: 1, month: 1 }).lean());
  return Promise.all(rows.map(async (row) => {
    let note = "";
    let noteUnavailable = false;
    if (row.noteCipher) {
      try { note = await decryptBoundSecret(row.noteCipher, NOTE_PURPOSE, `${uid}:${profileId}`, env); } catch { noteUnavailable = true; }
    }
    const { year, month, domain, outcome, intensity, certainty, source, channel } = row;
    return { year, month, domain, outcome, intensity, certainty, source, channel, note, ...(noteUnavailable ? { noteUnavailable } : {}) };
  }));
}

async function handleEvents(request, env, uid, method) {
  await requireConsent(env, uid);
  if (method === "GET" || method === "DELETE") {
    const profileId = readProfileId(new URL(request.url).searchParams.get("profileId"));
    await requireSelfProfile(env, uid, profileId);
    if (method === "DELETE") {
      await withMongoRetry(env, () => deleteLifeCalibrationForProfile(uid, profileId));
      return json({ ok: true, profileId, events: [] });
    }
    return json({ ok: true, profileId, events: await readEvents(env, uid, profileId) });
  }
  if (method !== "PUT") return methodNotAllowed();
  const body = await readJson(request).catch(() => ({}));
  const profileId = readProfileId(body?.profileId);
  const profile = await requireSelfProfile(env, uid, profileId);
  let events;
  try {
    const birthYear = Number(profile?.birth?.year);
    events = normalizeLifeEvents(body?.events, { minYear: Number.isInteger(birthYear) ? birthYear : 1900, maxYear: kstYear() });
  } catch (error) {
    if (error instanceof LifeEventInputError) throw fail(400, error.code, error.message);
    throw error;
  }
  let docs;
  try {
    docs = await Promise.all(events.map(async ({ note, ...event }) => ({
      ...event,
      schemaVersion: LIFE_EVENT_SCHEMA_VERSION,
      userId: uid,
      profileId,
      ...(note ? { noteCipher: await encryptBoundSecret(note, NOTE_PURPOSE, `${uid}:${profileId}`, env) } : {}),
    })));
  } catch {
    // 키가 없거나 잘못되면 평문으로 저장하지 않는다(fail-closed).
    throw fail(503, "NOTE_ENCRYPTION_UNAVAILABLE", "메모를 안전하게 저장할 수 없어요. 메모 없이 다시 시도해 주세요.");
  }
  // 프로필 단위 전체 교체. 파생 캐시는 같이 지워 다음 계산이 새 입력을 보게 한다.
  await withMongoRetry(env, async () => {
    await deleteLifeCalibrationForProfile(uid, profileId);
    if (docs.length) await LifeEvent.insertMany(docs);
  });
  return json({ ok: true, profileId, events: await readEvents(env, uid, profileId) });
}

// 서버 보정 결과(P4). 동의·본인 프로필 필수. 캐시(inputHash)가 맞으면 다시 계산하지 않는다. 메모는 응답에 없다.
async function handleCalibration(request, env, uid, method) {
  if (method !== "GET") return methodNotAllowed();
  await requireConsent(env, uid);
  const profileId = readProfileId(new URL(request.url).searchParams.get("profileId"));
  await requireSelfProfile(env, uid, profileId);
  const out = await loadSelfLifeCalibration(env, { uid, profileId });
  if (out.status === "no-events") return json({ ok: true, profileId, calibration: null });
  if (out.status !== "ok") throw fail(403, "LIFE_CALIBRATION_UNAVAILABLE", "지금은 보정을 계산할 수 없어요.");
  return json({ ok: true, profileId, cache: out.cache, calibration: out.calibration });
}

export async function handleLifeCalibrationRoutes(request, env) {
  try {
    if (!lifeCalibrationOn(env, "api")) return notFound();
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/life-calibration");
    const auth = await requireAuth(request, env);
    const uid = String(auth.userId);
    if (path === "/consent") return await handleConsent(request, env, uid, method);
    if (path === "/self") return await handleSelf(request, env, uid, method);
    if (path === "/events") return await handleEvents(request, env, uid, method);
    if (path === "/calibration") return await handleCalibration(request, env, uid, method);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
