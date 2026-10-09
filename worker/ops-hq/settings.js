// 운영본부 설정 — 문서 하나(_id = businessId). 없으면 기본값으로 동작한다.
//
// 🔴 revenueSince 는 PATCH 로 바꿀 수 없다. 과거 매출을 XP 에 넣는 것은 백필 미리보기 → 적용 경로만 탄다
//    (적용 시 ackLevel 을 맞춰 과거 레벨업 연출을 다시 틀지 않는다).

import { createHttpError } from "../lib/http.js";
import { BUSINESS_ID } from "./db.js";

export const CAMPAIGN_START = "2026-10-12";

export const DEFAULT_SETTINGS = Object.freeze({
  uiEnabled: true,
  revenueSince: CAMPAIGN_START,
  excludedUserIds: [],
  goals: { weeklyNetKRW: null, weeklyPublishes: 12, weeklyEngagedSessions: null },
});

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MAX_EXCLUDED = 50;

export async function readSettings(cols) {
  const doc = await cols.settings.findOne({ _id: BUSINESS_ID });
  return {
    ...DEFAULT_SETTINGS,
    ...(doc || {}),
    goals: { ...DEFAULT_SETTINGS.goals, ...(doc?.goals || {}) },
    excludedUserIds: Array.isArray(doc?.excludedUserIds) ? doc.excludedUserIds.map(String) : [],
    uiEnabled: doc?.uiEnabled !== false,
  };
}

function goalNumber(value, key) {
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1e12) {
    throw createHttpError(400, `목표값(${key})을 확인해 주세요.`, { code: "SETTINGS_GOAL_INVALID", key });
  }
  return Math.round(number);
}

/** PATCH 본문 → $set. 알 수 없는 키는 무시하지 않고 거절한다(오타가 조용히 사라지지 않게). */
export function normalizeSettingsPatch(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "요청 본문이 올바르지 않습니다.", { code: "VALIDATION_ERROR" });
  }
  const allowed = new Set(["uiEnabled", "excludedUserIds", "goals"]);
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length) throw createHttpError(400, `바꿀 수 없는 설정입니다: ${unknown.join(", ")}`, { code: "SETTINGS_KEY_INVALID", keys: unknown });
  const set = {};
  if ("uiEnabled" in body) {
    if (typeof body.uiEnabled !== "boolean") throw createHttpError(400, "uiEnabled 는 true/false 여야 합니다.", { code: "SETTINGS_UI_INVALID" });
    set.uiEnabled = body.uiEnabled;
  }
  if ("excludedUserIds" in body) {
    const list = Array.isArray(body.excludedUserIds) ? body.excludedUserIds.map((value) => String(value).trim()).filter(Boolean) : null;
    if (!list || list.length > MAX_EXCLUDED || list.some((value) => !OBJECT_ID.test(value))) {
      throw createHttpError(400, `제외 사용자는 24자리 사용자 ID 목록(최대 ${MAX_EXCLUDED}개)이어야 합니다.`, { code: "SETTINGS_EXCLUDED_INVALID" });
    }
    set.excludedUserIds = [...new Set(list.map((value) => value.toLowerCase()))];
  }
  if ("goals" in body) {
    const goals = body.goals || {};
    for (const key of Object.keys(goals)) {
      if (!(key in DEFAULT_SETTINGS.goals)) throw createHttpError(400, `알 수 없는 목표입니다: ${key}`, { code: "SETTINGS_GOAL_INVALID", key });
      set[`goals.${key}`] = goalNumber(goals[key], key);
    }
  }
  return set;
}

export async function updateSettings(cols, body, { actor, now = new Date() } = {}) {
  const set = normalizeSettingsPatch(body);
  if (!Object.keys(set).length) return readSettings(cols);
  await cols.settings.updateOne(
    { _id: BUSINESS_ID },
    { $set: { ...set, updatedAt: now, updatedBy: actor || null }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  return readSettings(cols);
}

export async function setRevenueSince(cols, since, { actor, now = new Date() } = {}) {
  await cols.settings.updateOne(
    { _id: BUSINESS_ID },
    { $set: { revenueSince: since, revenueSinceChangedAt: now, updatedBy: actor || null, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}
