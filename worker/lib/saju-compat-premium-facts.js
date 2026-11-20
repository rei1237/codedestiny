// 사주 고급 궁합(saju-compat-premium) 결정적 계산 모듈.
//
// 클라이언트는 두 사람의 출생 입력과 관계 유형만 보낸다. 명식·궁합·바람기 지표·전생 인연은
// 전부 여기서 서버가 계산한다. 클라이언트 계산값과 대조하지 않는다(대조 불일치 422 계열 제거).
// LLM 은 이 결과를 해석만 한다. 이 모듈은 순수 함수이며 같은 입력·같은 기준 연도면 같은 결과를 낸다.
//
// 🔴 기존 saju-compat-basic / saju-compat-schema / saju-compat-prompts 경로는 참조하지 않는다(사용자 지시).
import { calculateLifeBookAiSaju } from "./life-book-ai-saju.js";
import { buildSajuLoveCompatibility } from "./master-love-codex-compat.js";
import { approvedCompatSupportFacts, approvedSajuLabels, lifeBookPillars } from "./saju-authority-consumer.js";
import { buildLoveShinsal, getBranchPairRelations, normalizeBranchChar, normalizeStemChar, stemElementKey, toBranchKo, toStemKo } from "./saju-shinsal.js";

export const SAJU_COMPAT_PREMIUM_FACTS_VERSION = "saju-compat-premium-facts-v1";

export const SAJU_COMPAT_RELATION_TYPES = Object.freeze({
  some: "썸·호감",
  dating: "연애 중",
  married: "결혼·배우자",
  reunion: "재회 고민",
  premarital: "결혼 전 확인",
});

const INVALID_INPUT_MESSAGE = "두 사람의 생년월일·성별·관계 유형을 다시 확인해 주세요.";

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  return "";
}

function normalizeCalendarType(value) {
  const text = clean(value, 20).toLowerCase();
  if (text === "lunar" || text === "음력") return "lunar";
  return "solar";
}

function normalizeBirthDate(value) {
  const text = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) return "";
  const year = Number(text.slice(0, 4));
  return year >= 1900 && year <= 2100 ? text : "";
}

function normalizeBirthTime(value) {
  const text = clean(value, 5);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : "";
}

function normalizePerson(value) {
  const source = value && typeof value === "object" ? value : {};
  const birthTime = normalizeBirthTime(source.birthTime);
  const calendarType = normalizeCalendarType(source.calendarType);
  return {
    name: clean(source.name || source.nickname, 40),
    gender: normalizeGender(source.gender),
    birthDate: normalizeBirthDate(source.birthDate),
    birthTime: toBoolean(source.birthTimeUnknown) ? "" : birthTime,
    birthTimeUnknown: toBoolean(source.birthTimeUnknown) || !birthTime,
    calendarType,
    isLeapMonth: calendarType === "lunar" && toBoolean(source.isLeapMonth ?? source.leapMonth),
  };
}

/** 요청 본문 → 저장·해시용 정규 입력. 실패하면 { ok:false, message }. */
export function normalizeSajuCompatPremiumInput(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const self = normalizePerson(source.self || source.myInfo);
  const partner = normalizePerson(source.partner || source.partnerInfo);
  const relationType = clean(source.relationType, 20);
  if (!self.birthDate || !partner.birthDate || !self.gender || !partner.gender) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  if (!Object.hasOwn(SAJU_COMPAT_RELATION_TYPES, relationType)) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return { ok: true, input: { self, partner, relationType } };
}

function lifeBookInput(person) {
  return {
    birthDate: person.birthDate,
    birthTime: person.birthTimeUnknown ? "" : person.birthTime,
    birthTimeUnknown: person.birthTimeUnknown,
    calendarType: person.calendarType,
    gender: person.gender,
    isLeapMonth: person.isLeapMonth,
  };
}

function calculateChart(person, side, year) {
  try {
    return calculateLifeBookAiSaju(lifeBookInput(person), { year });
  } catch (error) {
    throw Object.assign(new Error(`${side} chart calculation failed`), {
      code: "CALCULATION_FAILED",
      side,
      cause: clean(error?.code || error?.message, 120),
    });
  }
}

function kstYear(nowMs) {
  const ms = Number.isFinite(nowMs) ? nowMs : Date.now();
  return new Date(ms + 9 * 60 * 60 * 1000).getUTCFullYear();
}

function pillarParts(detail) {
  if (!detail) return { stem: "", branch: "" };
  return { stem: normalizeStemChar(detail.heavenlyStem), branch: normalizeBranchChar(detail.earthlyBranch) };
}

function luckSummary(saju) {
  const cycle = saju.majorLuck?.currentCycle;
  return {
    currentMajorLuck: cycle
      ? { pillar: clean(cycle.pillar, 10), startAge: cycle.startAge, endAge: cycle.endAge, startYear: cycle.startYear, endYear: cycle.endYear, stemTenGod: clean(cycle.stemTenGod, 10) }
      : null,
    yearlyLuck: (saju.yearlyLuck || []).slice(0, 3).map((row) => ({ year: row.year, pillar: clean(row.pillar || `${row.heavenlyStem || ""}${row.earthlyBranch || ""}`, 10), stemTenGod: clean(row.stemTenGod, 10) })),
  };
}

function chartSummary(saju, person, labels) {
  const day = pillarParts(saju.pillarDetails?.day);
  return {
    name: person.name,
    gender: person.gender,
    timeUnknown: Boolean(saju.calculationMeta?.timeUnknown),
    pillars: {
      year: clean(saju.yearPillar, 10),
      month: clean(saju.monthPillar, 10),
      day: clean(saju.dayPillar, 10),
      hour: saju.hourPillar ? clean(saju.hourPillar, 10) : null,
    },
    dayMaster: day.stem,
    dayMasterLabel: day.stem ? `${toStemKo(day.stem)}(${day.stem})` : "",
    fiveElements: { ...(saju.fiveElements || {}) },
    tenGods: { ...(saju.tenGods || {}) },
    strength: clean(labels ? labels.strength : saju.strength, 200),
    usefulGod: clean(labels ? labels.yongshinLabel : saju.usefulGod, 200),
    unfavorableGod: clean(labels ? labels.gisinLabel : saju.unfavorableGod, 200),
    ...luckSummary(saju),
  };
}

// ── 상대 이성 기질(바람기) 지표 ─────────────────────────────────────────────
// 계산된 근거 항목만 더한다. 행동·외도를 판정하지 않으며 문구는 "경향"으로만 쓴다.
export const TEMPERAMENT_GRADE_THRESHOLDS = Object.freeze({ high: 5, medium: 3 });
export const TEMPERAMENT_CAUTION = "명식에서 계산한 이성 기질 경향입니다. 실제 행동이나 관계의 사실을 판정하지 않으며, 대화와 신뢰가 더 중요한 근거입니다.";

const OPPOSITE_SEX_TEN_GODS = Object.freeze({
  male: { label: "재성", gods: ["정재", "편재"], mixedLabel: "재성 혼잡" },
  female: { label: "관성", gods: ["정관", "편관"], mixedLabel: "관살 혼잡" },
});

function natalShinsal(saju) {
  const details = saju.pillarDetails || {};
  const day = pillarParts(details.day);
  return buildLoveShinsal({
    pillars: { year: pillarParts(details.year), month: pillarParts(details.month), day, hour: pillarParts(details.hour) },
    dayStem: day.stem,
    luckRows: [],
  });
}

function dayBranchInteractions(saju) {
  const natal = saju.natalInteractions || {};
  const touchesDay = (row) => Array.isArray(row?.pillars) && row.pillars.includes("day");
  const labels = (rows) => (Array.isArray(rows) ? rows : []).filter(touchesDay).map((row) => clean(row.label || row.type, 40)).filter(Boolean);
  return {
    combinations: [...labels(natal.branchCombinations), ...labels(natal.threeHarmony)],
    clashes: [...labels(natal.branchClashes), ...labels(natal.branchPunishments)],
  };
}

function roundCount(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** 상대 명식에서 이성 기질 지표를 계산한다. 같은 명식이면 같은 등급·근거가 나온다. */
export function buildPartnerTemperament(saju, gender) {
  const shinsal = natalShinsal(saju);
  const evidence = [];
  const push = (key, label, detail, weight) => evidence.push({ key, label, detail, weight });

  const dohwaHits = shinsal.byName?.도화살?.hits || [];
  if (dohwaHits.length) {
    push("dohwa", "도화살", `${dohwaHits.map((hit) => hit.label).join(" · ")}에 도화가 있어 사람의 시선을 끌기 쉬운 결입니다.`, Math.min(2, dohwaHits.length));
  }
  const hongyeomHits = shinsal.byName?.홍염살?.hits || [];
  if (hongyeomHits.length) {
    push("hongyeom", "홍염살", `${hongyeomHits.map((hit) => hit.label).join(" · ")}에 홍염이 있어 분위기와 표현에 은근한 매력이 배는 편입니다.`, 1);
  }

  const rule = OPPOSITE_SEX_TEN_GODS[gender];
  const tenGods = saju.tenGods || {};
  const counts = rule ? rule.gods.map((god) => roundCount(tenGods[god])) : [];
  const total = roundCount(counts.reduce((sum, value) => sum + value, 0));
  if (rule && total >= 2.5) {
    push("oppositeTenGodMany", `${rule.label} 많음`, `이성을 뜻하는 ${rule.label}(${rule.gods.join("·")}) 합계가 ${total}로 많은 편이라 이성 인연이 넓게 열리는 경향입니다.`, 1);
  }
  if (rule && counts.every((value) => value >= 0.5)) {
    push("oppositeTenGodMixed", rule.mixedLabel, `${rule.gods.map((god, index) => `${god} ${counts[index]}`).join(", ")}로 두 기운이 함께 있어 끌리는 이성상이 한 가지로 고정되지 않는 경향입니다.`, 1);
  }

  const spouse = dayBranchInteractions(saju);
  if (spouse.combinations.length) {
    push("spousePalaceCombination", "배우자궁 합", `일지(배우자궁)가 ${spouse.combinations.join(" · ")}로 다른 자리와 묶여 있어 마음이 여러 관계로 나뉘기 쉬운 결입니다.`, 1);
  }
  if (spouse.clashes.length) {
    push("spousePalaceClash", "배우자궁 충·형", `일지(배우자궁)에 ${spouse.clashes.join(" · ")}이 있어 관계 안정에 변동이 생기기 쉬운 결입니다.`, 1);
  }

  const yeokmaHits = shinsal.byName?.역마살?.hits || [];
  if (yeokmaHits.length) {
    push("yeokma", "역마살", `${yeokmaHits.map((hit) => hit.label).join(" · ")}에 역마가 있어 활동 반경과 만남의 폭이 넓은 편입니다.`, 1);
  }

  const score = evidence.reduce((sum, row) => sum + row.weight, 0);
  const grade = score >= TEMPERAMENT_GRADE_THRESHOLDS.high ? "높음" : score >= TEMPERAMENT_GRADE_THRESHOLDS.medium ? "보통" : "낮음";
  return {
    basis: "도화·홍염·이성 십성(남성 재성, 여성 관성)·배우자궁 합충·역마의 원국 계산값",
    grade,
    score,
    maxScore: 8,
    oppositeTenGod: rule ? { label: rule.label, counts: Object.fromEntries(rule.gods.map((god, index) => [god, counts[index]])), total } : null,
    intensity: { dohwa: Number(shinsal.intensity?.dohwa) || 0, hongyeom: Number(shinsal.intensity?.hongyeom) || 0 },
    evidence,
    timeUnknown: Boolean(saju.calculationMeta?.timeUnknown),
    caution: TEMPERAMENT_CAUTION,
  };
}

// ── 전생 인연 정적 표 ────────────────────────────────────────────────────
// 내 일주 × 상대 년주. 천간 오행 관계(5) × 지지 관계(4) = 20칸. 재미로 읽는 전통 설화식 풀이이며 LLM 은 관여하지 않는다.
const GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });

function stemRelation(selfElement, partnerElement) {
  if (!selfElement || !partnerElement) return "same";
  if (selfElement === partnerElement) return "same";
  if (GENERATES[selfElement] === partnerElement) return "selfNurtures";
  if (GENERATES[partnerElement] === selfElement) return "partnerNurtures";
  if (CONTROLS[selfElement] === partnerElement) return "selfLeads";
  return "partnerLeads";
}

function branchClass(selfBranch, partnerBranch) {
  const relations = getBranchPairRelations(selfBranch, partnerBranch) || [];
  if (relations.includes("육합") || relations.includes("삼합")) return "bound";
  if (relations.includes("충")) return "clash";
  if (relations.some((name) => ["형", "자형", "파", "해", "원진", "귀문"].includes(name))) return "knot";
  return "plain";
}

export const PAST_LIFE_TABLE = Object.freeze({
  same: Object.freeze({
    bound: { title: "한 스승 아래 동문", grade: "깊은 인연", text: "같은 뜻을 품고 한 문하에서 함께 배운 사이로 그려집니다. 말하지 않아도 통하는 결이 이번 생에도 이어집니다." },
    clash: { title: "같은 길의 맞수", grade: "숙제 인연", text: "같은 목표를 두고 겨루던 맞수로 그려집니다. 닮은 만큼 부딪히니 역할을 나누면 힘이 됩니다." },
    knot: { title: "말을 아끼던 동료", grade: "풀어 갈 인연", text: "곁에 오래 있었지만 속내를 다 나누지 못한 동료로 그려집니다. 이번 생에는 먼저 묻는 쪽이 매듭을 풉니다." },
    plain: { title: "같은 마을의 이웃", grade: "편안한 인연", text: "같은 마을에서 사계절을 함께 보낸 이웃으로 그려집니다. 큰 굴곡 없이 편안하게 가까워지는 결입니다." },
  }),
  selfNurtures: Object.freeze({
    bound: { title: "길을 열어 준 스승과 제자", grade: "깊은 인연", text: "내가 상대에게 길을 열어 준 스승으로 그려집니다. 이번 생에도 내가 건네는 말이 상대에게 오래 남습니다." },
    clash: { title: "엄했던 보호자", grade: "숙제 인연", text: "아끼는 마음이 엄한 훈계로 전해지던 보호자로 그려집니다. 이번 생에는 챙김의 방식을 부드럽게 바꾸는 것이 숙제입니다." },
    knot: { title: "몰래 돕던 후원자", grade: "풀어 갈 인연", text: "상대가 모르게 뒤에서 돕던 후원자로 그려집니다. 이번 생에는 마음을 말로 드러낼수록 관계가 가벼워집니다." },
    plain: { title: "등불을 건넨 길손", grade: "이어진 인연", text: "밤길에 등불을 건네고 지나간 길손으로 그려집니다. 이번 생에는 그 짧은 온기를 오래 이어 갈 기회가 왔습니다." },
  }),
  partnerNurtures: Object.freeze({
    bound: { title: "나를 키워 준 은인", grade: "깊은 인연", text: "상대가 나를 거두어 키워 준 은인으로 그려집니다. 이번 생에는 받은 마음을 돌려줄 차례라는 풀이입니다." },
    clash: { title: "애틋했던 엇갈림", grade: "숙제 인연", text: "나를 아꼈지만 뜻이 엇갈려 떠나보낸 사이로 그려집니다. 이번 생에는 서운함을 미루지 않고 바로 나누는 것이 숙제입니다." },
    knot: { title: "빚을 남긴 인연", grade: "풀어 갈 인연", text: "상대의 도움에 다 보답하지 못하고 헤어진 사이로 그려집니다. 이번 생에는 고마움을 표현할수록 매듭이 풀립니다." },
    plain: { title: "글을 가르친 서당 훈장", grade: "이어진 인연", text: "어린 나에게 글을 가르친 훈장으로 그려집니다. 이번 생에도 상대에게서 배울 것이 많은 결입니다." },
  }),
  selfLeads: Object.freeze({
    bound: { title: "함께 성을 지킨 장수와 책사", grade: "깊은 인연", text: "내가 앞장서고 상대가 뒤를 받친 장수와 책사로 그려집니다. 서로의 역할이 분명할 때 가장 든든합니다." },
    clash: { title: "고집을 겨룬 주인과 객", grade: "숙제 인연", text: "서로 주도권을 놓지 않던 주인과 객으로 그려집니다. 이번 생에는 결정권을 나누는 연습이 관계를 지킵니다." },
    knot: { title: "약속을 미룬 정혼자", grade: "풀어 갈 인연", text: "혼약을 맺고도 사정으로 미뤄 둔 사이로 그려집니다. 이번 생에는 미뤄 둔 약속을 하나씩 지키는 것이 열쇠입니다." },
    plain: { title: "배를 함께 탄 사공과 손님", grade: "편안한 인연", text: "같은 배로 강을 건넌 사공과 손님으로 그려집니다. 방향만 맞추면 순탄하게 함께 가는 결입니다." },
  }),
  partnerLeads: Object.freeze({
    bound: { title: "나를 이끈 길잡이", grade: "깊은 인연", text: "상대가 길을 잡고 내가 믿고 따르던 사이로 그려집니다. 이번 생에도 상대의 판단이 나에게 버팀목이 됩니다." },
    clash: { title: "엇갈린 두 가문", grade: "숙제 인연", text: "서로 다른 가문의 뜻에 막혀 멀어진 사이로 그려집니다. 이번 생에는 주변의 목소리보다 두 사람의 합의를 앞세우는 것이 숙제입니다." },
    knot: { title: "편지를 주고받던 먼 벗", grade: "풀어 갈 인연", text: "멀리 떨어져 편지로만 마음을 전하던 벗으로 그려집니다. 이번 생에는 자주 얼굴을 보고 확인할수록 깊어집니다." },
    plain: { title: "장터에서 스친 인연", grade: "이어진 인연", text: "장터에서 몇 번 스치며 눈인사를 나누던 사이로 그려집니다. 이번 생에는 그 짧은 인연을 길게 이어 갈 수 있습니다." },
  }),
});

export const PAST_LIFE_NOTE = "전생 인연은 일주와 상대 년주를 교차한 정적 풀이표이며, 재미로 읽는 전통 설화식 해석입니다.";

/** 내 일주 × 상대 년주 → 정적 전생 인연 카드. */
export function buildPastLifeBond(selfSaju, partnerSaju) {
  const selfDay = pillarParts(selfSaju.pillarDetails?.day);
  const partnerYear = pillarParts(partnerSaju.pillarDetails?.year);
  const stemKey = stemRelation(stemElementKey(selfDay.stem), stemElementKey(partnerYear.stem));
  const branchKey = branchClass(selfDay.branch, partnerYear.branch);
  const row = PAST_LIFE_TABLE[stemKey][branchKey];
  return {
    selfDayPillar: clean(selfSaju.dayPillar, 10),
    partnerYearPillar: clean(partnerSaju.yearPillar, 10),
    stemKey,
    branchKey,
    title: row.title,
    grade: row.grade,
    text: row.text,
    note: PAST_LIFE_NOTE,
  };
}

// ── 오행 보완·합충 ───────────────────────────────────────────────────────
function elementComplement(balance = {}) {
  const lines = [];
  for (const row of balance.partnerCoversMyGap || []) lines.push(`상대의 ${row.element} 기운(${row.from})이 나에게 적은 ${row.element} 기운(${row.to})을 채워 줍니다.`);
  for (const row of balance.iCoverPartnerGap || []) lines.push(`나의 ${row.element} 기운(${row.from})이 상대에게 적은 ${row.element} 기운(${row.to})을 채워 줍니다.`);
  for (const element of balance.overloadedTogether || []) lines.push(`두 사람 모두 ${element} 기운이 많아 함께 있으면 그 성향이 더 강해집니다.`);
  for (const element of balance.sharedGap || []) lines.push(`두 사람 모두 ${element} 기운이 적어 함께 보완할 방법을 찾는 편이 좋습니다.`);
  return {
    selfCounts: { ...(balance.selfCounts || {}) },
    partnerCounts: { ...(balance.partnerCounts || {}) },
    mergedCounts: { ...(balance.mergedCounts || {}) },
    partnerCoversMyGap: balance.partnerCoversMyGap || [],
    iCoverPartnerGap: balance.iCoverPartnerGap || [],
    overloadedTogether: balance.overloadedTogether || [],
    sharedGap: balance.sharedGap || [],
    lines,
  };
}

function harmonyAndClash(compat) {
  const branch = compat.branchRelations || {};
  const stem = compat.dayStemRelation || {};
  return {
    dayStem: {
      selfStem: stem.selfStem, partnerStem: stem.partnerStem,
      relationKind: stem.relationKind, relationLabel: stem.relationLabel,
      stemCombination: Boolean(stem.stemCombination), stemClash: Boolean(stem.stemClash),
      partnerAsMyTenGod: stem.partnerAsMyTenGod, meAsPartnerTenGod: stem.meAsPartnerTenGod,
    },
    relations: (branch.relations || []).map((row) => ({ ...row, selfBranchKo: toBranchKo(row.selfBranch), partnerBranchKo: toBranchKo(row.partnerBranch) })),
    supportCount: Number(branch.supportCount) || 0,
    tensionCount: Number(branch.tensionCount) || 0,
    dayAxis: branch.dayAxis ?? null,
  };
}

/**
 * 고급 궁합 계산 일체.
 * @param {object} input  normalizeSajuCompatPremiumInput().input
 * @param {object} [options]
 * @param {"full"|"validate"} [options.mode="full"]  validate 는 결제 전 사전검사 — 두 명식이 계산되는지만 확인한다.
 * @param {boolean} [options.authorityEnabled]  승인 격국·용신 라벨 overlay(love-secret 과 같은 플래그)
 * @param {number} [options.nowMs]  대운·세운 기준 시각(KST 연도). 테스트에서 고정한다.
 */
export function calculateSajuCompatPremiumFacts(input, options = {}) {
  const mode = options.mode === "validate" ? "validate" : "full";
  if (!input?.self?.birthDate || !input?.partner?.birthDate) {
    throw Object.assign(new Error("missing birth info"), { code: "CALCULATION_FAILED" });
  }
  const year = kstYear(options.nowMs);
  const selfSaju = calculateChart(input.self, "self", year);
  const partnerSaju = calculateChart(input.partner, "partner", year);

  if (mode === "validate") {
    return {
      version: SAJU_COMPAT_PREMIUM_FACTS_VERSION,
      mode,
      self: { dayPillar: clean(selfSaju.dayPillar, 10), timeUnknown: Boolean(selfSaju.calculationMeta?.timeUnknown) },
      partner: { dayPillar: clean(partnerSaju.dayPillar, 10), timeUnknown: Boolean(partnerSaju.calculationMeta?.timeUnknown) },
    };
  }

  let compat;
  try {
    compat = buildSajuLoveCompatibility({ selfSaju, partnerSaju });
  } catch (error) {
    throw Object.assign(new Error("compatibility calculation failed"), { code: "CALCULATION_FAILED", cause: clean(error?.code || error?.message, 120) });
  }

  const authorityEnabled = options.authorityEnabled === true;
  const selfLabels = authorityEnabled ? approvedSajuLabels(lifeBookPillars(selfSaju)) : null;
  const partnerLabels = authorityEnabled ? approvedSajuLabels(lifeBookPillars(partnerSaju)) : null;
  const support = authorityEnabled
    ? approvedCompatSupportFacts(compat.yongshinSupport, selfLabels, partnerLabels)
    : compat.yongshinSupport;

  const uncertainty = [];
  if (input.self.birthTimeUnknown) uncertainty.push("self_birth_time_unknown");
  if (input.partner.birthTimeUnknown) uncertainty.push("partner_birth_time_unknown");

  return {
    version: SAJU_COMPAT_PREMIUM_FACTS_VERSION,
    mode,
    baseYear: year,
    relationType: input.relationType,
    relationLabel: SAJU_COMPAT_RELATION_TYPES[input.relationType] || "",
    self: chartSummary(selfSaju, input.self, selfLabels),
    partner: chartSummary(partnerSaju, input.partner, partnerLabels),
    axisScores: { ...(compat.axisScores || {}) },
    elementComplement: elementComplement(compat.elementBalance),
    harmonyClash: harmonyAndClash(compat),
    tenGodInteraction: {
      partnerAsMyTenGod: compat.tenGodInteraction?.partnerAsMyTenGod || "",
      meAsPartnerTenGod: compat.tenGodInteraction?.meAsPartnerTenGod || "",
      partnerRoleTally: compat.tenGodInteraction?.partnerRoleTally || {},
      myRoleTally: compat.tenGodInteraction?.myRoleTally || {},
    },
    support,
    partnerTemperament: buildPartnerTemperament(partnerSaju, input.partner.gender),
    pastLife: buildPastLifeBond(selfSaju, partnerSaju),
    uncertainty,
  };
}
