import { honeyUseInputHash } from '../lib/honey-per-use.js';
import { createHash } from "node:crypto";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { isDbUnavailableError, HttpError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { hasLegacyBundlePurchase, readAccountLegacyUnlock, readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { claimRequestBillingEvidence, evidenceClaimErrorBody } from "../lib/billing-evidence-claim.js";
import { SAJU_SECTION_FEATURE_KEYS, SUKUYO_COMPAT_FEATURE_KEYS, ZIWEI_COMPAT_FEATURE_KEYS, SajuSectionInputError, buildSajuSectionHtml, sukuyoNatureMoment } from "../lib/saju-section/report.js";
import { calculateSukuyoForMoment } from "../lib/sukuyo-astronomy.js";

const degraded = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true,
  message: "구매 권한을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

// 묶음·옛 상품으로 산 사람도 이 카드를 연다 — /api/fortune/balance 가 화면 해금에 쓰는 별칭
// (worker/routes/fortune.js PERSISTENT_UNLOCK_ALIAS_MAP)을 거꾸로 읽은 것이다.
// 출생 기반 별칭은 같은 출생 정보(또는 옛 계정 단위 행)로만, 옛 묶음 키·계정 단위 키(rpgCharacter)는 계정 단위 구매 기록으로 인정한다.
const BIRTH_ALIAS_KEYS = Object.freeze({ rpt_energyCoordCard: ["travelDestiny"], rpt_healthReportCard: ["healthReport"] });
const BUNDLE_ALIAS_KEYS = Object.freeze({ rpt_energyCoordCard: ["allPaidSaju"], rpt_healthReportCard: ["allPaidSaju"], rpt_skillTreeCard: ["allPaidSaju", "rpgCharacter"], rpt_secretHouseEntryCard: ["allPaidSaju", "secretHouseEpisodes"] });

const astronomyFailed = () => json({
  ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true, message: "풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
}, { status: 503 });

function bodyBirth(body) {
  const birth = body?.birth && typeof body.birth === "object" ? body.birth : {};
  return {
    calendarDate: String(birth.date || ""), calType: birth.calType, timeKnown: birth.timeKnown !== false,
    hour: birth.hour, minute: birth.minute,
  };
}

// ── 숙요 기본 궁합(compat-sukuyo-compatibility)·정밀 궁합 확장(premium-sukuyo-compat-extra) — 회당 결제 ──
// 출생 해금이 아니라 결제 1건마다 여는 본문이다. 게이트가 결제에 쓴 requestId(sukuyo-paid:<기능>|<카드>|<꼬리>)로
// 그 결제를 정본 verifyPerUsePayment 로 찾고, 찾은 증빙을 (requestId, 두 사람의 수 조합)에 claim 한다 —
// 같은 결제로 상대만 바꿔 다른 궁합을 여는 재생은 409 다(숙요 전생 리딩의 claimBindingKey 와 같은 생각).
// 같은 결제·같은 조합을 다시 열면(새로고침·재시도) 같은 claim 의 재생이라 다시 준다.
// 🔴 DB 판단 보류(null)·claim 저장소 장애는 503 이다 — 결제한 사람에게 402 를 주지 않는다.
const COMPAT_TAIL_PATTERN = /^[a-z0-9]{6,40}$/;

// sukuyo-archive.js resolvePerUseRequestId 와 같은 규칙 — 비었으면 예전 고정값, 이 기능·이 카드 것이 아니면 null.
function compatRequestId(featureKey, profileId, raw) {
  const legacy = `sukuyo-paid:${featureKey}|${profileId}`;
  const requestId = typeof raw === "string" ? raw.trim() : "";
  if (!requestId) return legacy;
  const tail = requestId.startsWith(`${legacy}|`) ? requestId.slice(legacy.length + 1) : "";
  return COMPAT_TAIL_PATTERN.test(tail) ? requestId : null;
}

function compatPartnerBirth(body) {
  const partner = body?.partner && typeof body.partner === "object" ? body.partner : {};
  return {
    birth: { calendarDate: String(partner.date || ""), calType: partner.calType, timeKnown: true, hour: partner.hour, minute: partner.minute },
    gender: partner.gender === "M" || partner.gender === "F" ? partner.gender : "OTHER",
  };
}

// 회당 결제 궁합의 결제 확인과 증빙 claim. 문제가 없으면 null, 아니면 그대로 돌려줄 응답(402·409·503)이다.
// pair 는 이번 결제로 여는 두 사람의 입력 — 같은 결제로 pair 만 바꾸면 claim 이 409 를 낸다.
async function provePerUseCompat(env, { userId, featureKey, requestId, profileId, accessMethod, kind, pair, honeyInput }) {
  const method = String(accessMethod || "").trim().toLowerCase();
  const proofInput = { userId, featureKey, coinPrice: Number(FEATURE_KEY_PRICE_TABLE[featureKey]?.cost) || 0, requestId, profileId };
  let proof;
  try {
    proof = await verifyPerUsePayment(env, { ...proofInput, requireExisting: true });
    // 이용권으로 연 결제는 화면이 먼저 열리고 기록이 뒤에 온다 — 그때만 이 requestId 로 이용권 사용을 직접 확정한다.
    if (proof?.proven === false && method === "pass") proof = await verifyPerUsePayment(env, proofInput);
  } catch {
    return degraded();
  }
  logPerUsePaymentProof(featureKey, proof);
  if (proof?.proven !== true && proof?.proven !== false) return degraded();
  if (proof.proven !== true) {
    const { pricing } = getBillingFeaturePricing({ featureKey });
    return json({
      ok: false, reason: "PAYMENT_REQUIRED", featureKey,
      message: "이번 궁합 결제 기록을 찾지 못했어요. 결제한 뒤 다시 열어 주세요.",
      amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
    }, { status: 402 });
  }
  if (proof.source === "honey" && proof.inputHash !== honeyUseInputHash(featureKey, honeyInput)) return json({ ok: false, reason: "HONEY_REQUEST_MISMATCH", message: "꿀방울로 연 상대 정보와 일치하지 않아요." }, { status: 409 });
  if (proof.source !== "admin") {
    const evidenceId = proof.transactionId || `${proof.source || "per-use"}-use:${userId}:${featureKey}:${requestId}`;
    const pairHash = createHash("sha256").update(JSON.stringify(pair)).digest("hex").slice(0, 32);
    const claim = await claimRequestBillingEvidence(env, {
      userId, requestId: `${requestId}|${pairHash}`, evidenceIds: [evidenceId], featureKey, kind,
    });
    if (!claim.ok) return json(evidenceClaimErrorBody(claim), { status: claim.status });
  }
  return null;
}

// 저장 카드가 있으면 그 카드의 출생 정보·성별, 없으면(로컬 프로필·비저장) 요청 값. 회당 결제는 카드 해금이 아니라
// 이번 결제·이번 조합에 묶이므로 카드가 없어도 막지 않는다. DB 오류는 그대로 던진다(호출한 곳이 503).
async function perUseBirth(env, userId, profileId, featureKey, body) {
  let birth = bodyBirth(body);
  let gender = body?.gender;
  if (profileId) {
    const card = await readProfileBirthUnlock(env, { userId, profileId, featureKey });
    if (card?.ok && card.birth) {
      birth = { calendarDate: card.birth.calendarDate, calType: card.birth.calType, timeKnown: card.birth.timeKnown, hour: card.birth.hour, minute: card.birth.minute };
      gender = card.card?.gender;
    }
  }
  return { birth, gender };
}

async function handleSukuyoCompat(env, auth, body, featureKey) {
  const userId = auth.userId;
  const profileId = String(body?.profileId || "").trim().slice(0, 80);
  const requestId = compatRequestId(featureKey, profileId, body?.requestId);
  if (!requestId) return json({
    ok: false, code: "REQUEST_ID_INVALID", message: "결제 요청 번호가 이 카드의 결제가 아닙니다.",
  }, { status: 400 });

  // 내 출생 정보: 저장 카드가 있으면 그 카드, 없으면 요청 값(perUseBirth).
  let birth;
  let gender;
  try {
    ({ birth, gender } = await perUseBirth(env, userId, profileId, featureKey, body));
  } catch {
    return degraded();
  }
  const userGender = gender === "M" || gender === "F" ? gender : "OTHER";
  const partner = compatPartnerBirth(body);
  // 상대 출생지는 화면과 같이 내 출생지를 쓴다(입력 칸이 없다).
  const mineMoment = sukuyoNatureMoment(birth, body?.place);
  const partnerMoment = sukuyoNatureMoment(partner.birth, body?.place);
  let sukuyo;
  try {
    const [mine, other] = await Promise.all([calculateSukuyoForMoment(env, mineMoment), calculateSukuyoForMoment(env, partnerMoment)]);
    sukuyo = { mine, partner: other };
  } catch (error) {
    console.error("[saju-section] sukuyo compat astronomy failed", error?.message || error);
    return astronomyFailed();
  }
  // 결제를 쓰기 전에 먼저 그린다 — 순수 계산이라, 여기서 실패하면 이용권 차감·claim 없이 503 이다.
  const lang = typeof body?.lang === "string" ? body.lang.slice(0, 8) : "ko";
  const report = buildSajuSectionHtml({ featureKey, birth, gender: userGender, partnerGender: partner.gender, lang, place: body?.place, sukuyo });

  const denied = await provePerUseCompat(env, {
    userId, featureKey, requestId, profileId, accessMethod: body?.accessMethod, kind: "sukuyo-compat", honeyInput: body.partner,
    pair: { my: report.myMansionIdx, partner: report.partnerMansionIdx, partnerGender: partner.gender, userGender },
  });
  if (denied) return denied;
  if (featureKey === "premium-sukuyo-compat-extra") {
    return json({ ok: true, unlocked: true, featureKey, precisionHtml: report.precisionHtml });
  }
  return json({
    ok: true, unlocked: true, featureKey, html: report.html, lastCompat: report.lastCompat,
    glowColor: report.glowColor, temperature: report.temperature, relationLabel: report.relationLabel,
  });
}

// ── 자미두수 궁합(compat-ziwei-compatibility) — 회당 결제 ──
// 게이트가 결제에 쓴 requestId(compat-archive:compat-ziwei-compatibility:<꼬리>, 궁합 보관함과 같은 값)로 이번 결제를 찾고,
// 그 증빙을 (requestId, 내 출생·성별·출생지 + 상대 생년월일·시각·도시)에 claim 한다. 내 명반 입력이 claim 에 들어가므로
// 같은 결제로 다른 카드(다른 내 출생)나 다른 상대를 열면 409 다. 같은 두 사람을 다시 열면(새로고침·재시도) 같은 claim 이다.
// 본문은 결제를 확인하기 전에 먼저 그린다 — 입력 오류는 400, 계산 실패는 503 이고 둘 다 결제·claim 을 건드리지 않는다.
const ZIWEI_COMPAT_REQUEST_PREFIX = "compat-archive:compat-ziwei-compatibility:";

async function handleZiweiCompat(env, auth, body, featureKey) {
  const userId = auth.userId;
  const profileId = String(body?.profileId || "").trim().slice(0, 80);
  const rawRequestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  const tail = rawRequestId.startsWith(ZIWEI_COMPAT_REQUEST_PREFIX) ? rawRequestId.slice(ZIWEI_COMPAT_REQUEST_PREFIX.length) : "";
  if (!COMPAT_TAIL_PATTERN.test(tail)) return json({
    ok: false, code: "REQUEST_ID_INVALID", message: "결제 요청 번호가 이 카드의 결제가 아닙니다.",
  }, { status: 400 });
  const requestId = rawRequestId;

  let birth;
  let gender;
  try {
    ({ birth, gender } = await perUseBirth(env, userId, profileId, featureKey, body));
  } catch {
    return degraded();
  }
  const lang = typeof body?.lang === "string" ? body.lang.slice(0, 8) : "ko";
  const report = buildSajuSectionHtml({
    featureKey, birth, gender: gender === "M" ? "M" : "F", name: body?.name, lang, place: body?.place, partner: body?.partner,
  });

  const denied = await provePerUseCompat(env, {
    userId, featureKey, requestId, profileId, accessMethod: body?.accessMethod, kind: "ziwei-compat", pair: report.pair,
  });
  if (denied) return denied;
  return json({
    ok: true, unlocked: true, featureKey, html: report.html, correctionMsg: report.correctionMsg, correctedTime: report.correctedTime,
    userLabel: report.userLabel, partnerLabel: report.partnerLabel, archive: report.archive, llm: report.llm,
  });
}

// 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·극T 관계 회로(sukuyo-extreme-t-relationship)·
// 숙요 인연 도감(sukuyo-relationship-encyclopedia)·숙요 본성 심화 해석(sukuyo-nature-deep-dive)·에너지 원정 리포트(rpt_energyCoordCard)
// ·요주의 빌런 블랙리스트(rpt_villainCard)·명리 헬스 리포트(rpt_healthReportCard)·나의 매력 클래스(rpt_specialCharmCard)
// ·인생 스킬 트리(rpt_skillTreeCard)·시크릿 하우스 에피소드(rpt_secretHouseEntryCard)·숙요 기본/정밀 궁합·자미두수 궁합(회당 결제, 위 handleSukuyoCompat·handleZiweiCompat) 본문 읽기. 결제·해금 쓰기는 하지 않는다
// (궁합의 이용권 결제 확정·증빙 claim 은 정본 verifyPerUsePayment·claimRequestBillingEvidence 가 한다).
// 저장 프로필이 있으면 그 카드의 출생 정보로만 계산하고, 없으면 계정 단위 옛 해금(USER 행)만 인정한다.
export async function handleSajuSection(request, env = {}) {
  if (request.method !== "POST") return methodNotAllowed();
  try {
    let auth;
    try {
      auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
    } catch (error) {
      if (isAuthDbInfraError(error) || isDbUnavailableError(error)) return degraded();
      throw error;
    }
    if (!auth?.userId) return json({
      ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 풀이를 확인해 주세요.",
    }, { status: 401 });

    const body = await readJson(request);
    const featureKey = String(body?.featureKey || "");
    if (!SAJU_SECTION_FEATURE_KEYS.includes(featureKey)) return json({
      ok: false, code: "SAJU_INVALID_FEATURE", message: "지원하지 않는 항목입니다.",
    }, { status: 400 });
    if (SUKUYO_COMPAT_FEATURE_KEYS.includes(featureKey)) return await handleSukuyoCompat(env, auth, body, featureKey);
    if (ZIWEI_COMPAT_FEATURE_KEYS.includes(featureKey)) return await handleZiweiCompat(env, auth, body, featureKey);

    const profileId = String(body?.profileId || "").trim();
    const readBirth = (key) => (profileId
      ? readProfileBirthUnlock(env, { userId: auth.userId, profileId, featureKey: key })
      : readAccountLegacyUnlock(env, { userId: auth.userId, featureKey: key }));
    let access;
    try {
      access = await readBirth(featureKey);
      for (const alias of BIRTH_ALIAS_KEYS[featureKey] || []) {
        if (!access.ok || access.unlocked) break;
        const viaAlias = await readBirth(alias);
        if (viaAlias.ok && viaAlias.unlocked) access = viaAlias;
      }
      const bundleKeys = BUNDLE_ALIAS_KEYS[featureKey] || [];
      if (access.ok && !access.unlocked && bundleKeys.length && await hasLegacyBundlePurchase(env, { userId: auth.userId, bundleKeys })) {
        access = { ...access, unlocked: true };
      }
    } catch {
      return degraded();
    }
    if (!access.ok) {
      const missing = access.reason === "MISSING_PROFILE_ID";
      return json({
        ok: false, reason: access.reason, code: access.reason, featureKey, requiresProfile: true,
        message: missing ? "프로필을 저장한 뒤 구매해 주세요." : "저장된 내 프로필을 선택해 주세요.",
      }, { status: missing ? 400 : 403 });
    }
    if (!access.unlocked) {
      const { pricing } = getBillingFeaturePricing({ featureKey });
      return json({
        ok: false, reason: "PAYMENT_REQUIRED", featureKey, requiresProfile: !profileId,
        message: profileId ? "이 생년월일은 별도 구매가 필요합니다." : "프로필을 저장하면 이 생년월일로 구매할 수 있어요.",
        amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
      }, { status: 402 });
    }
    if (profileId && !access.birth) return json({
      ok: false, code: "SAJU_INVALID_BIRTH", message: "프로필의 출생 정보를 확인해 주세요.",
    }, { status: 400 });

    // 🔴 프로필 해금은 그 카드의 출생 정보 단위다 — 본문 생년월일·성별은 무시한다.
    //    출생지·종격 검증 답·화면 모드는 신원(birthKey)에 들어가지 않으므로 요청 값을 쓴다.
    const birth = profileId
      ? { calendarDate: access.birth.calendarDate, calType: access.birth.calType, timeKnown: access.birth.timeKnown, hour: access.birth.hour, minute: access.birth.minute }
      : bodyBirth(body);
    const gender = profileId ? access.card?.gender : body?.gender;
    // 숙요 본성 심화 해석은 해금을 확인한 출생 정보로 서버가 달 황경을 계산해 본명숙을 정한다 — 화면의 본명숙 값은 받지 않는다.
    let sukuyo = null;
    if (featureKey === "sukuyo-nature-deep-dive") {
      const moment = sukuyoNatureMoment(birth, body?.place);
      try {
        sukuyo = await calculateSukuyoForMoment(env, moment);
      } catch (error) {
        console.error("[saju-section] sukuyo astronomy failed", error?.message || error);
        return astronomyFailed();
      }
    }
    const result = buildSajuSectionHtml({
      featureKey, birth, gender: gender === "M" ? "M" : "F",
      name: body?.name, mode: body?.mode === "neo" ? "neo" : "pig", lang: typeof body?.lang === "string" ? body.lang.slice(0, 8) : "ko",
      place: body?.place, daewun: body?.daewun, encyclopedia: body?.encyclopedia, energy: body?.energy, sukuyo, house: body?.house,
    });
    return json({ ok: true, unlocked: true, featureKey, ...result });
  } catch (error) {
    if (error instanceof SajuSectionInputError) return json({ ok: false, code: error.code, message: error.message }, { status: 400 });
    if (error instanceof HttpError) return json({ ok: false, code: error.payload?.code || "BAD_REQUEST", message: error.message }, { status: error.status });
    console.error("[saju-section] render failed", error?.message || error);
    return json({ ok: false, reason: "TEMPORARY_UNAVAILABLE", retryable: true, message: "풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
