import { createHash } from "node:crypto";
// 🔴 일주는 한국 음양력 코어에서 잡는다. 값은 안 움직인다 — 정오 일주는 lunar-javascript 와
// 코어가 표본 7,224건(1950~2035)에서 전건 일치한다(실측 2026-08-27). 달력 축을 하나로 두는 것이 목적이다.
import { BRANCH_HANJA, STEM_HANJA, ganji } from "../../lib/korean-calendar/index.js";

import { connectDb, mongoose, withMongoRetry, mongoTransactionOptions } from "../lib/db.js";
import {
  MonthlyCreditLedger,
  Payment,
  ProfileCard,
  User,
  UserDailyQuestLog,
  UserRpgProgress,
  UserRpgRewardLog,
} from "../lib/models.js";
import { grantMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { peekAccessTokenUserId, requireAuth } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const KST_DAY_MS = 24 * 60 * 60 * 1000;
const QUEST_SLOT_ORDER = ["easy-1", "easy-2", "normal-1", "normal-2", "core-1"];
/* 레벨 곡선. 초반은 가파르게(첫 보상까지 2주), 후반은 상한을 둬 만렙(99)이 실제로 도달 가능하게 한다.
   expToNext(n) = min(200 + 100 × (n-1), 1500)
     · Lv.5 누적 1,400 EXP  — 무료 일일치(출석20 + 습관퀘 15×3 + 공유25 = 90)로 약 2주
     · Lv.99 누적 137,900 EXP — 하루 100 안팎이면 3년대
   상한이 없으면 99까지 십수 년이 걸려 만렙 보상이 실재하지 않는다. */
const BASE_LEVEL_EXP = 200;
const LEVEL_EXP_GROWTH = 100;
const LEVEL_EXP_STEP_CAP = 1500;
const MAX_LEVEL = 99;
const INTERNAL_LEVEL_REWARDS = [
  {
    level: 3,
    rewardType: "secret_unlock",
    rewardKey: "secret_fortune_level_3",
    title: "Lv.3 비밀 운세 해금",
    description: "첫 번째 비밀 운세가 해금됩니다.",
    storeIn: "unlockedSecretFortunes",
  },
  {
    level: 5,
    rewardType: "milestone_unlock",
    rewardKey: "personality_title_level_5",
    title: "Lv.5 성향 칭호 해금",
    description: "성향을 드러내는 칭호 1개가 해금됩니다.",
    storeIn: "unlockedMilestoneRewards",
  },
  {
    level: 7,
    rewardType: "milestone_unlock",
    rewardKey: "passive_expand_level_7",
    title: "Lv.7 고유 패시브 확장",
    description: "나의 고유 패시브 설명이 더 깊어집니다.",
    storeIn: "unlockedMilestoneRewards",
  },
  {
    level: 10,
    rewardType: "milestone_unlock",
    rewardKey: "job_class_expand_level_10",
    title: "Lv.10 운명 직업군 확장",
    description: "나의 운명 직업군 해석이 확장됩니다.",
    storeIn: "unlockedMilestoneRewards",
  },
  {
    level: 15,
    rewardType: "milestone_unlock",
    rewardKey: "growth_report_preview_level_15",
    title: "Lv.15 30일 성장 리포트 미리보기",
    description: "30일 성장 리포트의 일부를 미리 볼 수 있습니다.",
    storeIn: "unlockedMilestoneRewards",
  },
  {
    level: 20,
    rewardType: "milestone_unlock",
    rewardKey: "master_skill_phrase_level_20",
    title: "Lv.20 마스터 스킬 강화 문구",
    description: "마스터 스킬을 더 강하게 만드는 문구가 해금됩니다.",
    storeIn: "unlockedMilestoneRewards",
  },
];
const STREAK_SECRET_MILESTONES = [3, 7, 14, 30];

/* 진행도는 계정 단위로 쌓는다. 프로필 카드를 추가·삭제·전환해도 레벨이 흔들리지 않아야 하기 때문이다.
   {userId, profileId} 유니크 인덱스를 그대로 쓰려고 실제 카드 id 대신 이 고정값을 스코프로 넣는다
   (스키마·인덱스 변경도, 마이그레이션도 필요 없다). */
const ACCOUNT_PROFILE_SCOPE = "__account__";

/* 메인 화면 프로필 카드가 쓰는 EXP 지급 화이트리스트.
   클라이언트가 종류와 키만 보내고 EXP 액수·한도는 여기서만 정한다. 위조되더라도 EXP는
   코인·월정석·이용권 어디에도 환산되지 않으므로 금전 손실로 이어지지 않는다. */
const AWARD_RULES = {
  checkin: { exp: 20, dailyLimit: 1, questType: "daily_checkin" },
  quest: { exp: 15, dailyLimit: 3, questType: "daily_habit_quest" },
  paid: { exp: 30, dailyLimit: 3, questType: "paid_feature_view" },
  // 공유는 서버가 실제 공유 링크 생성 시점에 직접 적립한다(클라 신고를 받지 않는다).
  share: { exp: 25, dailyLimit: 1, questType: "daily_share", serverOnly: true },
  // 연속 출석 보너스도 서버가 streakDays 를 보고 스스로 판정해 지급한다.
  streak: { exp: 0, dailyLimit: 1, questType: "streak_bonus", serverOnly: true },
};
const AWARD_LOCAL_ADOPT_CAP = 5000;

/* 연속 출석 보너스. EXP 가 금전 가치를 갖게 되므로 위조 가능한 자기신고가 아니라
   서버가 관리하는 streakDays 로만 판정한다. 각 단계는 계정당 하루 1회. */
const STREAK_BONUS_TABLE = [
  { days: 3, exp: 30 },
  { days: 7, exp: 70 },
  { days: 14, exp: 150 },
  { days: 30, exp: 300 },
];

/* 레벨 마일스톤 월정석 보상.
   월정석 1개 = 10원(KRW_PER_COIN 100 ÷ MEMBERSHIP_CREDIT_PER_COIN 10)이고 지급 후 30일이면 소멸한다.
   누적 합계는 정확히 10,000개(=100,000원)이며 아래 상한이 이를 코드로 강제한다.

   minPayments·minPaidKrw 는 그 단계를 받기 위한 "누적" 현금 결제 실적이다. 전 단계 공통으로
   결제 1회만 요구하던 때는 3,000원 한 번 쓴 계정이 10만원어치를 전부 가져갈 수 있었다.
   최종 단계 기준 요구 20만원 / 보상 10만원 = 전 구간 보상률 50%로 맞춰 두었다.
   🔴 두 값은 레벨 오름차순으로 단조 증가해야 한다 — 정산 루프가 첫 미달에서 멈추기 때문이다
   (verify:profile-card-level 이 단조성을 강제한다). */
const LEVEL_MONTHLY_CREDIT_REWARDS = [
  { level: 5, credits: 500, minPayments: 1, minPaidKrw: 3000 },
  { level: 10, credits: 500, minPayments: 2, minPaidKrw: 8000 },
  { level: 20, credits: 700, minPayments: 4, minPaidKrw: 20000 },
  { level: 30, credits: 800, minPayments: 6, minPaidKrw: 35000 },
  { level: 50, credits: 1000, minPayments: 10, minPaidKrw: 60000 },
  { level: 70, credits: 1500, minPayments: 15, minPaidKrw: 100000 },
  { level: 99, credits: 5000, minPayments: 30, minPaidKrw: 200000 },
];
const LEVEL_REWARD_TOTAL_CREDIT_CAP = 10000;
const LEVEL_REWARD_LOG_TYPE = "monthly_credit_grant";
/* 다계정 파밍 방어. 레벨은 누구나 올릴 수 있지만 월정석 수령은 가입 경과일 + 단계별 결제 실적을
   모두 만족해야 한다. 조건을 못 채웠다고 몰수하지 않는다 — 나중에 채우면 밀린 단계가 한꺼번에 나간다. */
const LEVEL_REWARD_MIN_ACCOUNT_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const LEVEL_REWARD_PAID_STATUSES = ["paid", "success", "fulfilled"];
/* 🔴 현금이 아닌 결제는 실적에서 뺀다. 월정석으로 산 이용권도 Payment 문서를 만들기 때문에
   (payments.js 의 paymentMethod:"monthly_credit" prepare → status:"success"), 그대로 세면
   "레벨 보상 월정석 → 이용권 구매 → 결제 실적 상승 → 다음 보상 개방"이라는 순환 파밍이 성립한다.
   월정석으로 기능을 해금하거나 코인·포인트를 쓰는 경로는 Payment 문서를 만들지 않아 해당 없음. */
const LEVEL_REWARD_NON_CASH_METHODS = ["monthly_credit"];
/* 실적 집계 비용 상한. 최고 요구(30회)보다 훨씬 커서 판정에 영향이 없고,
   결제가 아주 많은 계정에서 읽는 문서 수만 묶는다. */
const LEVEL_REWARD_PAYMENT_SCAN_LIMIT = 200;

/* 메인 홈은 이 사이트에서 트래픽이 가장 높은 화면이라, 카드가 쓰지도 않는 값을 곁들여 읽으면
   과거에 이 기능을 로컬 전용으로 되돌리게 만든 것과 같은 종류의 부하가 된다.
   그래서 /progress는 진행도 1건만 읽고, 그 위에 몇 초짜리 캐시를 덮어 버스트를 collapse한다.
   (billing.js의 billingBalanceCache와 동일 패턴 — globalThis 공유, 정상 응답만 저장.) */
const RPG_PROGRESS_CACHE_TTL_MS = 5000;
const RPG_PROGRESS_CACHE_MAX_ENTRIES = 2500;
const rpgProgressCache = globalThis.__rpgProgressCache
  || (globalThis.__rpgProgressCache = {
    entries: new Map(),
    lastPruneAt: 0,
  });

function invalidateRpgProgressCacheForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return 0;
  return rpgProgressCache.entries.delete(uid) ? 1 : 0;
}

function readRpgProgressFromCache(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  const entry = rpgProgressCache.entries.get(uid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    rpgProgressCache.entries.delete(uid);
    return null;
  }
  return entry.snapshot || null;
}

function writeRpgProgressToCache(userId, snapshot) {
  const uid = String(userId || "").trim();
  if (!uid || !snapshot) return snapshot;
  const now = Date.now();
  if (rpgProgressCache.lastPruneAt + 2000 < now) {
    rpgProgressCache.lastPruneAt = now;
    for (const [key, entry] of rpgProgressCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) rpgProgressCache.entries.delete(key);
    }
  }
  if (rpgProgressCache.entries.size > RPG_PROGRESS_CACHE_MAX_ENTRIES) {
    const earliestKey = rpgProgressCache.entries.keys().next().value;
    if (earliestKey) rpgProgressCache.entries.delete(earliestKey);
  }
  rpgProgressCache.entries.set(uid, {
    snapshot,
    expiresAt: now + Math.max(1000, Math.floor(RPG_PROGRESS_CACHE_TTL_MS)),
  });
  return snapshot;
}

const ELEMENT_LABELS = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const ELEMENT_EMOJIS = {
  wood: "🌿",
  fire: "🔥",
  earth: "🪨",
  metal: "⚔️",
  water: "💧",
};

const STEM_TO_ELEMENT = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

const ELEMENT_LIBRARY = {
  wood: {
    easy: [
      "오늘 떠오른 생각 3개를 짧게 적기",
      "관계에 먼저 안부 한 번 보내기",
      "책상 위 한 곳을 5분만 정리하기",
    ],
    normal: [
      "미뤄둔 작은 시작 하나를 10분만 해보기",
      "내일을 위해 해야 할 일을 3줄로 정리하기",
      "오늘의 계획을 순서대로 다시 써보기",
    ],
    core: [
      "오늘 시작한 일 하나를 끝까지 마무리하기",
      "관계 한 곳에 진심을 담아 메시지 보내기",
      "새로운 계획 하나를 실제 일정에 넣기",
    ],
  },
  fire: {
    easy: [
      "기분을 한 단어로 적고 소리 내어 읽기",
      "가볍게 몸을 풀며 5분 움직이기",
      "오늘의 감정 한 줄을 말로 꺼내기",
    ],
    normal: [
      "짧은 글이나 기록을 5분 동안 완성하기",
      "몸이 달아오를 만큼 가볍게 운동하기",
      "누군가에게 칭찬 한 문장 보내기",
    ],
    core: [
      "내가 가장 밝아지는 일 하나를 직접 표현하기",
      "미루던 감정 표현을 솔직하게 전달하기",
      "오늘의 나를 대표하는 한 문장을 남기기",
    ],
  },
  earth: {
    easy: [
      "방 한 구석을 5분 정리하기",
      "오늘 먹을 식사 시간을 정해두기",
      "지출 메모를 한 번 확인하기",
    ],
    normal: [
      "하루 루틴을 3칸으로 나누어 적기",
      "건강한 선택 하나를 오늘 안에 고정하기",
      "오늘의 지출이나 일정 하나를 점검하기",
    ],
    core: [
      "내일의 나를 위해 생활의 기준 하나를 확정하기",
      "흐트러진 루틴 하나를 다시 세우기",
      "몸과 마음이 쉬는 시간을 캘린더에 박아두기",
    ],
  },
  metal: {
    easy: [
      "할 일 하나를 과감히 삭제하기",
      "정리할 파일이나 물건 하나를 치우기",
      "미뤄둔 결정을 하나 메모하기",
    ],
    normal: [
      "오늘 꼭 지킬 기준 한 줄을 적기",
      "불필요한 연락이나 알림 하나 정리하기",
      "지금 필요한 것과 아닌 것을 나눠 적기",
    ],
    core: [
      "끝내야 할 일 하나를 오늘 안에 마무리하기",
      "불필요한 습관 하나를 공식적으로 끊어내기",
      "내 기준을 지키는 선택 하나를 실행하기",
    ],
  },
  water: {
    easy: [
      "물 한 잔 마시고 감정 한 단어 적기",
      "조용히 3분 숨을 고르기",
      "오늘의 생각을 한 줄만 적기",
    ],
    normal: [
      "감정이 올라온 이유를 3줄로 적기",
      "10분 동안 마음을 가만히 살펴보기",
      "머릿속 걱정 하나를 글로 내려놓기",
    ],
    core: [
      "오늘 꼭 알고 싶은 것 하나를 끝까지 파고들기",
      "감정의 매듭 하나를 정직하게 풀어쓰기",
      "조용한 시간 속에서 내 선택의 이유를 분명히 적기",
    ],
  },
};

let rpgIndexReadyPromise = null;

function createInternalError(message, code = "INTERNAL_SERVER_ERROR", status = 500) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function toSafeString(value, maxLength = 120) {
  const text = String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "");
  return text.slice(0, maxLength);
}

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => toSafeString(value)).filter(Boolean)));
}

function kstNow() {
  return new Date(Date.now() + KST_OFFSET_MS);
}

function kstDateKey(date = kstNow()) {
  const kst = date instanceof Date ? date : new Date(date);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

function kstDateShift(days = 0) {
  return new Date(Date.now() + KST_OFFSET_MS + (days * KST_DAY_MS));
}

function yesterdayKstDateKey() {
  return kstDateKey(kstDateShift(-1));
}

function stableHash(input) {
  return createHash("sha256").update(String(input || "")).digest("hex");
}

function hashIndex(input, length) {
  if (!length || length < 1) return 0;
  const hex = stableHash(input);
  const chunk = hex.slice(0, 8);
  const numeric = Number.parseInt(chunk, 16);
  if (!Number.isFinite(numeric)) return 0;
  return numeric % length;
}

function normalizeElementKey(raw) {
  const text = toSafeString(raw, 40).toLowerCase();
  const lookup = {
    wood: "wood",
    목: "wood",
    갑: "wood",
    甲: "wood",
    "갑목": "wood",
    fire: "fire",
    화: "fire",
    병: "fire",
    丙: "fire",
    丁: "fire",
    earth: "earth",
    토: "earth",
    무: "earth",
    己: "earth",
    戊: "earth",
    metal: "metal",
    금: "metal",
    경: "metal",
    庚: "metal",
    辛: "metal",
    water: "water",
    수: "water",
    임: "water",
    壬: "water",
    癸: "water",
  };
  return lookup[text] || lookup[toSafeString(raw, 40)] || "";
}

function normalizeElementList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return uniqueStrings(raw.map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return normalizeElementKey(item) || toSafeString(item, 40);
      }
      if (item && typeof item === "object") {
        return normalizeElementKey(item.element || item.key || item.name || item.label || item.id || item.type)
          || toSafeString(item.element || item.key || item.name || item.label || item.id || item.type, 40);
      }
      return "";
    }));
  }
  if (typeof raw === "string") {
    const key = normalizeElementKey(raw) || toSafeString(raw, 40);
    return key ? [key] : [];
  }
  if (typeof raw === "object") {
    const entries = Object.entries(raw)
      .sort((a, b) => toSafeNumber(b[1]) - toSafeNumber(a[1]))
      .map(([key]) => normalizeElementKey(key) || toSafeString(key, 40))
      .filter(Boolean);
    return uniqueStrings(entries);
  }
  return [];
}

function normalizeTextList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return uniqueStrings(raw.map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return toSafeString(item, 40);
      }
      if (item && typeof item === "object") {
        return toSafeString(item.key || item.name || item.label || item.id || item.type || item.value, 40);
      }
      return "";
    }));
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const key = toSafeString(raw, 40);
    return key ? [key] : [];
  }
  if (typeof raw === "object") {
    return uniqueStrings(Object.entries(raw)
      .sort((a, b) => toSafeNumber(b[1]) - toSafeNumber(a[1]))
      .map(([key]) => toSafeString(key, 40))
      .filter(Boolean));
  }
  return [];
}

function getOppositeElement(element) {
  const map = {
    wood: "metal",
    fire: "water",
    earth: "wood",
    metal: "fire",
    water: "earth",
  };
  return map[element] || "";
}

function getTodayDayPillar() {
  const now = kstNow();
  const core = ganji({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: 12,
    minute: 0,
  });
  if (!core) {
    // 오늘 날짜라 코어 지원 범위(1900~2100) 안이다. 여기 오면 표가 깨진 것이다.
    throw new Error(`korean-calendar core returned no ganji for ${now.toISOString().slice(0, 10)}`);
  }
  const stem = STEM_HANJA[core.day.stemIndex];
  const branch = BRANCH_HANJA[core.day.branchIndex];

  return {
    stem,
    branch,
    element: STEM_TO_ELEMENT[stem] || "earth",
  };
}

function normalizeProfileId(rawProfileId) {
  return toSafeString(rawProfileId, 120);
}

function buildProfileSignature(profile) {
  const payload = {
    name: toSafeString(profile?.name, 80),
    gender: toSafeString(profile?.gender, 20),
    calendarType: toSafeString(profile?.calendarType, 40),
    timezone: toSafeString(profile?.timezone || profile?.birth?.timezone || "Asia/Seoul", 40),
    birth: profile?.birth || {},
    location: profile?.location || {},
    hourPillarTimePolicy: toSafeString(profile?.hourPillarTimePolicy || profile?.birth?.hourPillarTimePolicy || "LOCAL_MEAN_TIME", 40),
    dayChangePolicy: toSafeString(profile?.dayChangePolicy || profile?.birth?.dayChangePolicy || "MIDNIGHT", 40),
  };
  return stableHash(JSON.stringify(payload)).slice(0, 12);
}

function buildSajuContext(profile) {
  try {
    const location = profile?.location && typeof profile.location === "object" ? profile.location : {};
    const saju = buildSajuProfile({
      name: profile?.name,
      gender: profile?.gender,
      birth: profile?.birth,
      calendarType: profile?.calendarType,
      timezone: profile?.timezone || profile?.birth?.timezone || "Asia/Seoul",
      location: {
        name: toSafeString(location.name || profile?.birth?.birthPlace || "서울", 80) || "서울",
        latitude: Number.isFinite(Number(location.latitude)) ? Number(location.latitude) : Number(profile?.birth?.latitude || 37.5665),
        longitude: Number.isFinite(Number(location.longitude)) ? Number(location.longitude) : Number(profile?.birth?.longitude || 126.978),
        timezone: toSafeString(location.timezone || profile?.birth?.timezone || profile?.timezone || "Asia/Seoul", 40) || "Asia/Seoul",
      },
      hourPillarTimePolicy: toSafeString(profile?.hourPillarTimePolicy || profile?.birth?.hourPillarTimePolicy || "LOCAL_MEAN_TIME", 40) || "LOCAL_MEAN_TIME",
      dayChangePolicy: toSafeString(profile?.dayChangePolicy || profile?.birth?.dayChangePolicy || "MIDNIGHT", 40) || "MIDNIGHT",
    });

    const dayMasterElement = normalizeElementKey(saju?.dayMaster?.element || saju?.dayMaster?.elementKo) || "earth";
    const weakElements = normalizeElementList(saju?.fiveElements?.lacking);
    const strongElements = normalizeElementList(saju?.fiveElements?.dominant);
    const rankedElements = normalizeElementList(saju?.fiveElements?.ranked);
    const yongElements = normalizeElementList(saju?.usefulGods?.yong);
    const heeElements = normalizeElementList(saju?.usefulGods?.hee);
    const giElements = normalizeElementList(saju?.usefulGods?.gi);
    const tenGodsDominant = normalizeTextList(saju?.tenGods?.dominant);
    const todayDayPillar = getTodayDayPillar();

    const scores = saju?.fiveElements?.scores && typeof saju.fiveElements.scores === "object"
      ? Object.entries(saju.fiveElements.scores)
          .map(([key, value]) => [normalizeElementKey(key) || key, toSafeNumber(value)])
          .filter(([key]) => Boolean(key))
          .sort((a, b) => b[1] - a[1])
      : [];

    const fallbackStrong = scores.slice(0, 2).map(([key]) => key);
    const safeStrong = uniqueStrings([...strongElements, ...rankedElements, ...fallbackStrong]).filter(Boolean);

    return {
      saju,
      dayMasterElement,
      weakElements,
      strongElements: safeStrong,
      yongElements: uniqueStrings(yongElements),
      heeElements: uniqueStrings(heeElements),
      giElements: uniqueStrings(giElements),
      tenGodsDominant: uniqueStrings(tenGodsDominant),
      todayDayPillar,
      profileSignature: buildProfileSignature(profile),
    };
  } catch (error) {
    console.error("[RPG][SajuContextFailed]", {
      message: String(error?.message || error || ""),
      profileId: String(profile?.profileId || ""),
    });
    return null;
  }
}

/* 프로필 카드가 없거나 생년월일이 불완전해도 레벨 시스템은 돌아가야 한다.
   사주를 못 세우면 중립(토) 기준으로 퀘스트를 만들고, 404/422로 막지 않는다. */
function buildNeutralContext() {
  return {
    saju: null,
    neutral: true,
    dayMasterElement: "earth",
    weakElements: [],
    strongElements: ["earth"],
    yongElements: ["earth"],
    heeElements: [],
    giElements: [],
    tenGodsDominant: [],
    todayDayPillar: getTodayDayPillar(),
    profileSignature: "neutral",
  };
}

function chooseQuestText(element, tier, seed, usedTexts) {
  const safeElement = ELEMENT_LIBRARY[element] ? element : "earth";
  const pool = ELEMENT_LIBRARY[safeElement][tier] || ELEMENT_LIBRARY.earth[tier];
  if (!pool || !pool.length) {
    return `${ELEMENT_EMOJIS[safeElement] || "✨"} 운명의 흐름을 따르는 오늘의 미션`;
  }

  const baseIndex = hashIndex(`${seed}:${safeElement}:${tier}`, pool.length);
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = `${ELEMENT_EMOJIS[safeElement] || "✨"} ${pool[(baseIndex + offset) % pool.length]}`;
    if (!usedTexts.has(candidate)) {
      usedTexts.add(candidate);
      return candidate;
    }
  }

  const fallback = `${ELEMENT_EMOJIS[safeElement] || "✨"} ${pool[baseIndex % pool.length]}`;
  usedTexts.add(fallback);
  return fallback;
}

function buildQuestId({ dateKey, profileId, profileSignature, slotKey }) {
  const profileKey = stableHash(profileId).slice(0, 8);
  return `rpg-${dateKey}-${profileKey}-${profileSignature}-${slotKey}`;
}

function buildQuestReason({ slotKey, element, dayMasterElement, yongElements, weakElements, todayElement }) {
  const label = ELEMENT_LABELS[element] || element;
  const dayMasterLabel = ELEMENT_LABELS[dayMasterElement] || dayMasterElement;
  if (slotKey === "easy-1") {
    return `부족한 ${label} 기운을 가볍게 채우는 미션`;
  }
  if (slotKey === "easy-2") {
    return `${dayMasterLabel}의 본래 힘을 부드럽게 깨우는 미션`;
  }
  if (slotKey === "normal-1") {
    return `오늘의 일진(${ELEMENT_LABELS[todayElement] || todayElement})에 몸을 맞추는 미션`;
  }
  if (slotKey === "normal-2") {
    return `과하거나 막힌 흐름을 정돈하는 미션`;
  }
  if (yongElements.includes(element) || weakElements.includes(element)) {
    return `용신과 희신을 살리는 핵심 미션`;
  }
  return `${label} 기운의 균형을 바로 세우는 핵심 미션`;
}

function buildAfterCompleteMessage({
  slotKey,
  element,
  dayMasterElement,
  yongElements,
  weakElements,
  todayElement,
}) {
  const label = ELEMENT_LABELS[element] || element;
  const dayMasterLabel = ELEMENT_LABELS[dayMasterElement] || dayMasterElement;
  const todayLabel = ELEMENT_LABELS[todayElement] || todayElement;
  const elementInsight = {
    wood: "성장과 연결의 문을 조금 더 넓히는 흐름입니다.",
    fire: "감정과 표현의 흐름을 다시 살아나게 합니다.",
    earth: "흩어진 기운을 한곳에 모아 중심을 세웁니다.",
    metal: "불필요한 것을 덜어 내고 기준을 분명히 합니다.",
    water: "생각의 소음을 가라앉히고 회복을 돕습니다.",
  }[element] || "오늘의 흐름을 부드럽게 바로잡는 행동입니다.";

  const slotInsight = {
    "easy-1": "작은 실천이지만, 오늘의 운을 여는 첫 문이 됩니다.",
    "easy-2": "부담 없이 시작할수록 기운의 반응은 더 선명해집니다.",
    "normal-1": "일진의 흐름과 맞물려 하루의 리듬을 정돈합니다.",
    "normal-2": "조금 더 깊은 정리로 흐름의 막힘을 풀어 줍니다.",
    "core-1": "오늘의 중심축을 바로 세우는 핵심 전환점입니다.",
  }[slotKey] || "오늘의 기운을 조화롭게 움직이는 행동입니다.";

  const supportInsight = yongElements.includes(element)
    ? "용신과 맞닿아 있어, 운의 문이 조금 더 쉽게 열립니다."
    : (weakElements.includes(element)
      ? `지금 가장 필요한 ${label} 기운을 채워 균형을 회복합니다.`
      : `${dayMasterLabel}의 본래 힘과 ${todayLabel}의 결을 함께 다듬습니다.`);

  return `오늘의 ${label} 미션은 단순한 행동이 아니라, ${elementInsight} ${slotInsight} ${supportInsight}`;
}

function buildQuestExp({ slotKey, element, dayMasterElement, yongElements, weakElements, todayElement }) {
  if (slotKey === "easy-1" || slotKey === "easy-2") return 10;
  if (slotKey === "normal-1" || slotKey === "normal-2") return 20;

  let score = 0;
  if (yongElements.includes(element)) score += 2;
  if (weakElements.includes(element)) score += 1;
  if (element === dayMasterElement) score += 1;
  if (element === todayElement) score += 1;
  return 25 + Math.min(2, score) * 5;
}

function buildQuestSet({ profile, profileId, userId, dateKey, context }) {
  const seed = stableHash(`${userId}:${profileId}:${dateKey}:${context.profileSignature}`);
  const usedTexts = new Set();
  const dayMasterElement = context.dayMasterElement;
  const weakElements = context.weakElements.length > 0 ? context.weakElements : [getOppositeElement(dayMasterElement)].filter(Boolean);
  const strongElements = context.strongElements.length > 0 ? context.strongElements : [dayMasterElement];
  const yongElements = context.yongElements.length > 0 ? context.yongElements : [dayMasterElement];
  const heeElements = context.heeElements.length > 0 ? context.heeElements : [];
  const todayElement = context.todayDayPillar.element || dayMasterElement;

  const slotElements = [
    weakElements[0] || dayMasterElement,
    weakElements[1] || dayMasterElement,
    todayElement,
    strongElements[0] || heeElements[0] || dayMasterElement,
    yongElements[0] || heeElements[0] || weakElements[0] || dayMasterElement,
  ];

  const quests = QUEST_SLOT_ORDER.map((slotKey, index) => {
    const tier = slotKey.startsWith("easy")
      ? "easy"
      : slotKey.startsWith("normal")
        ? "normal"
        : "core";
    const element = normalizeElementKey(slotElements[index]) || dayMasterElement;
    const text = chooseQuestText(element, tier, `${seed}:${slotKey}`, usedTexts);
    const expReward = buildQuestExp({
      slotKey,
      element,
      dayMasterElement,
      yongElements,
      weakElements,
      todayElement,
    });
    const questId = buildQuestId({
      dateKey,
      profileId,
      profileSignature: context.profileSignature,
      slotKey,
    });

    return {
      questId,
      slotKey,
      questType: `daily_rpg_${tier}`,
      tier,
      element,
      expReward,
      text,
      reason: buildQuestReason({
        slotKey,
        element,
        dayMasterElement,
        yongElements,
        weakElements,
        todayElement,
      }),
      afterCompleteMessage: buildAfterCompleteMessage({
        slotKey,
        element,
        dayMasterElement,
        yongElements,
        weakElements,
        todayElement,
      }),
    };
  });

  return {
    quests,
    todayMaxExp: quests.reduce((sum, quest) => sum + toSafeNumber(quest.expReward), 0),
    generationMeta: {
      dayMaster: context.saju?.dayMaster || null,
      fiveElements: {
        scores: context.saju?.fiveElements?.scores || null,
        dominant: context.saju?.fiveElements?.dominant || null,
        lacking: context.saju?.fiveElements?.lacking || null,
      },
      tenGods: {
        counts: context.saju?.tenGods?.counts || null,
        dominant: context.saju?.tenGods?.dominant || null,
      },
      usefulGods: context.saju?.usefulGods || null,
      todayDayPillar: context.todayDayPillar,
      profileSignature: context.profileSignature,
    },
  };
}

function calculateLevelState(totalExp) {
  const safeTotalExp = Math.max(0, toSafeNumber(totalExp));
  let currentLevel = 1;
  let remainingExp = safeTotalExp;

  while (currentLevel < MAX_LEVEL && remainingExp >= getExpToNextLevel(currentLevel)) {
    remainingExp -= getExpToNextLevel(currentLevel);
    currentLevel += 1;
  }
  // 만렙에서는 남은 EXP 를 더 소진하지 않는다(다음 레벨이 없으므로 바를 가득 찬 상태로 둔다).
  if (currentLevel >= MAX_LEVEL) {
    currentLevel = MAX_LEVEL;
    remainingExp = Math.min(remainingExp, getExpToNextLevel(MAX_LEVEL));
  }

  return {
    currentLevel,
    totalExp: safeTotalExp,
    currentLevelExp: remainingExp,
    nextLevelExp: getExpToNextLevel(currentLevel),
  };
}

function getExpToNextLevel(level) {
  const safeLevel = Math.max(1, toSafeNumber(level, 1));
  return Math.min(BASE_LEVEL_EXP + Math.max(0, safeLevel - 1) * LEVEL_EXP_GROWTH, LEVEL_EXP_STEP_CAP);
}

// 해당 레벨에 막 도달하는 최소 누적 EXP. 곡선을 바꿀 때 기존 사용자의 레벨이 내려가 보이지
// 않도록 재환산하는 데 쓴다(EXP 를 옮기는 게 아니라 레벨을 보존하는 방향으로만 올린다).
function minExpForLevel(level) {
  const target = Math.min(MAX_LEVEL, Math.max(1, toSafeNumber(level, 1)));
  let sum = 0;
  for (let i = 1; i < target; i += 1) sum += getExpToNextLevel(i);
  return sum;
}

function normalizeRewardKeyList(values = []) {
  return uniqueStrings(values);
}

function buildRewardLabel(element, level) {
  const elementLabel = ELEMENT_LABELS[element] || "운명";
  return `${elementLabel} ${level}레벨 스킬`;
}

function buildRewardDescription(element, level) {
  const elementLabel = ELEMENT_LABELS[element] || "운명";
  return `${elementLabel} 기운과 공명하는 잠재력이 ${level}레벨에서 열립니다.`;
}

function buildRewardEvents({
  previousProgress,
  previousLevel,
  nextProgress,
  dayMasterElement,
  prevStreakDays,
  nextStreakDays,
}) {
  const rewardEvents = [];
  const nextSkills = new Set(normalizeRewardKeyList(previousProgress?.unlockedSkills || []));
  const nextSecrets = new Set(normalizeRewardKeyList(previousProgress?.unlockedSecretFortunes || []));
  const nextMilestones = new Set(normalizeRewardKeyList(previousProgress?.unlockedMilestoneRewards || []));

  for (let level = toSafeNumber(previousLevel, 1) + 1; level <= nextProgress.currentLevel; level += 1) {
    rewardEvents.push({
      rewardType: "level_up",
      rewardKey: `level_${level}`,
      level,
      title: `${level}레벨 달성`,
      description: "운명의 층이 한 겹 더 깊어집니다.",
    });

    for (const rewardTemplate of INTERNAL_LEVEL_REWARDS) {
      if (rewardTemplate.level !== level) continue;
      const targetSet = rewardTemplate.storeIn === "unlockedSecretFortunes" ? nextSecrets : nextMilestones;
      if (targetSet.has(rewardTemplate.rewardKey)) continue;
      targetSet.add(rewardTemplate.rewardKey);
      rewardEvents.push({
        rewardType: rewardTemplate.rewardType,
        rewardKey: rewardTemplate.rewardKey,
        level,
        title: rewardTemplate.title,
        description: rewardTemplate.description,
      });
    }
  }

  for (const milestone of STREAK_SECRET_MILESTONES) {
    if (prevStreakDays < milestone && nextStreakDays >= milestone) {
      const secretKey = `secret_streak_${milestone}`;
      if (!nextSecrets.has(secretKey)) {
        nextSecrets.add(secretKey);
        rewardEvents.push({
          rewardType: "secret_unlock",
          rewardKey: secretKey,
          level: milestone,
          title: `${milestone}일 연속 출석`,
          description: "비밀 운세가 새롭게 해금됩니다.",
        });
      }
    }
  }

  return {
    rewardEvents,
    unlockedSkills: Array.from(nextSkills),
    unlockedSecretFortunes: Array.from(nextSecrets),
    unlockedMilestoneRewards: Array.from(nextMilestones),
  };
}

/* 월정석 수령 실적: 가입 경과일 + 현금 결제 횟수·누적 금액.
   레벨은 누구나 올릴 수 있고, 이 검사는 "지급"에만 건다.

   🔴 예전에는 countDocuments(...).limit(1) 이라 횟수가 1에서 잘렸다. 단계별 요구 횟수를 걸려면
   실제 횟수가 필요하므로 문서를 직접 읽어 센다. {userId:1, createdAt:-1} 인덱스를 타고
   본인 문서로 한정되며 LEVEL_REWARD_PAYMENT_SCAN_LIMIT 로 상한이 걸린다
   ({userId:1,status:1} 복합 인덱스는 없고, autoIndex:false 라 선언만으로는 생기지도 않는다). */
async function resolveLevelRewardStats(env, userId) {
  const user = await withMongoRetry(env, () => User.findById(userId).select("joinedAt createdAt").lean());
  const joinedAt = new Date(user?.joinedAt || user?.createdAt || 0).getTime();
  if (!Number.isFinite(joinedAt) || joinedAt <= 0) {
    return { accountAgeOk: false, reason: "ACCOUNT_AGE_UNKNOWN", paymentCount: 0, paidKrw: 0 };
  }
  if (Date.now() - joinedAt < LEVEL_REWARD_MIN_ACCOUNT_AGE_MS) {
    return { accountAgeOk: false, reason: "ACCOUNT_TOO_NEW", paymentCount: 0, paidKrw: 0 };
  }

  const rows = await withMongoRetry(env, () => Payment.find({
    userId,
    status: { $in: LEVEL_REWARD_PAID_STATUSES },
  }).select("paymentAmount paymentMethod").sort({ createdAt: -1 }).limit(LEVEL_REWARD_PAYMENT_SCAN_LIMIT).lean());

  let paymentCount = 0;
  let paidKrw = 0;
  for (const row of rows || []) {
    if (LEVEL_REWARD_NON_CASH_METHODS.includes(String(row?.paymentMethod || ""))) continue;
    const amount = toSafeNumber(row?.paymentAmount, 0);
    if (amount <= 0) continue;
    paymentCount += 1;
    paidKrw += amount;
  }
  return { accountAgeOk: true, reason: "OK", paymentCount, paidKrw };
}

/* 이 단계를 열 실적이 되는가. 정산·상태 조회가 같은 판정을 써야 화면과 지급이 어긋나지 않는다. */
function meetsLevelRewardRequirement(row, stats) {
  return stats.accountAgeOk
    && stats.paymentCount >= row.minPayments
    && stats.paidKrw >= row.minPaidKrw;
}

/* 지급 원장 한 줄. 회원가입(auth.js recordMonthlyCreditGrantLedger)·추천과 달리 레벨 보상은
   여태 lot 만 적립하고 원장을 안 남겨, 월정석 내역 타임라인에 흔적이 전혀 없었다
   (payments.js formatMonthlyCreditGrantSummary 의 합성 행은 GRANT 행이 하나도 없을 때만 도는데
   가입 시 이미 한 줄이 생기므로 영영 안 돈다). 연출로 "+500"을 보여주고 내역이 비어 있으면
   사용자는 지급 자체를 의심한다.
   {userId,type,sourceId} 유니크 인덱스가 멱등을 보장하며, 실패는 삼킨다 — 원장 실패가 재화를 막으면 안 된다. */
async function recordLevelRewardLedger({ userId, level, credits, balanceAfter }) {
  const sourceId = `rpg-level_${level}`;
  try {
    await MonthlyCreditLedger.updateOne(
      { userId, type: "MONTHLY_CREDIT_GRANT", sourceId },
      {
        $setOnInsert: {
          userId,
          type: "MONTHLY_CREDIT_GRANT",
          amount: credits,
          beforeBalance: Math.max(0, balanceAfter - credits),
          afterBalance: Math.max(credits, balanceAfter),
          reason: `레벨 ${level} 달성 보상`,
          sourceId,
          serviceKey: "rpg_level_reward",
          profileId: "",
          metadata: { level, credits, krw: credits * 10 },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.warn("[RPG][LevelRewardLedgerFailed]", { level, message: String(error?.message || error || "") });
  }
}

/* 도달한 마일스톤을 정산한다. 자격 미달이면 아무것도 지급하지 않고 그대로 둔다 —
   나중에 자격을 채우고 다시 들어오면 밀린 마일스톤이 한꺼번에 나간다(몰수 없음).
   중복 지급은 UserRpgRewardLog 의 {userId, profileId, rewardType, rewardKey} 유니크 인덱스가 막는다. */
async function settleLevelMonthlyCreditRewards(env, userId, currentLevel) {
  const reached = LEVEL_MONTHLY_CREDIT_REWARDS.filter((row) => currentLevel >= row.level);
  if (!reached.length) return { granted: [], pending: [], reason: "NO_MILESTONE" };

  const alreadyLogged = await withMongoRetry(env, () => UserRpgRewardLog.find({
    userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
    rewardType: LEVEL_REWARD_LOG_TYPE,
  }).select("rewardKey meta").lean());
  const grantedKeys = new Set(alreadyLogged.map((row) => String(row.rewardKey || "")));
  const outstanding = reached.filter((row) => !grantedKeys.has(`level_${row.level}`));
  if (!outstanding.length) return { granted: [], pending: [], reason: "ALREADY_SETTLED" };

  const stats = await resolveLevelRewardStats(env, userId);
  if (!stats.accountAgeOk) {
    return { granted: [], pending: outstanding.map((row) => row.level), reason: stats.reason, stats };
  }

  // 계정당 누적 지급 상한. 이미 나간 금액을 합산해 남은 여유 안에서만 지급한다.
  const alreadyGrantedCredits = alreadyLogged.reduce((sum, row) => sum + toSafeNumber(row?.meta?.credits, 0), 0);
  let remainingCap = Math.max(0, LEVEL_REWARD_TOTAL_CREDIT_CAP - alreadyGrantedCredits);

  const granted = [];
  const blocked = [];
  for (const row of outstanding) {
    /* 요구 실적은 레벨 오름차순으로 단조 증가하므로, 한 단계가 막히면 그 뒤도 전부 막힌다.
       몰수가 아니라 보류다 — 실적을 채우고 다시 들어오면 밀린 단계가 한꺼번에 나간다. */
    if (!meetsLevelRewardRequirement(row, stats)) {
      for (const rest of outstanding.slice(outstanding.indexOf(row))) blocked.push(rest.level);
      break;
    }
    if (remainingCap < row.credits) break;
    const rewardKey = `level_${row.level}`;
    try {
      // 먼저 원장을 남긴다. 여기서 E11000 이면 다른 요청이 이미 지급한 것이므로 건너뛴다.
      await UserRpgRewardLog.create([{
        userId,
        profileId: ACCOUNT_PROFILE_SCOPE,
        rewardType: LEVEL_REWARD_LOG_TYPE,
        rewardKey,
        level: row.level,
        idempotencyKey: `${ACCOUNT_PROFILE_SCOPE}:${LEVEL_REWARD_LOG_TYPE}:${rewardKey}`,
        meta: { credits: row.credits, krw: row.credits * 10 },
      }]);
    } catch (error) {
      if (String(error?.code || error?.message || "").includes("11000")) continue;
      throw error;
    }
    const applied = await grantMonthlyCreditLot({
      userId,
      lotId: `rpg-${rewardKey}`,
      amount: row.credits,
    });
    if (!applied) {
      // 원장은 남았는데 적립이 실패했다 — 원장을 되돌려 다음 호출에서 다시 시도하게 한다.
      await UserRpgRewardLog.deleteOne({
        userId,
        profileId: ACCOUNT_PROFILE_SCOPE,
        rewardType: LEVEL_REWARD_LOG_TYPE,
        rewardKey,
      }).catch(() => {});
      break;
    }
    await recordLevelRewardLedger({
      userId,
      level: row.level,
      credits: row.credits,
      balanceAfter: toSafeNumber(applied?.profileSubscription?.membershipCreditBalance, row.credits),
    });
    remainingCap -= row.credits;
    granted.push({ level: row.level, credits: row.credits, krw: row.credits * 10 });
  }

  const reason = granted.length ? "GRANTED" : (blocked.length ? "REQUIREMENT_NOT_MET" : "CAP_REACHED");
  return { granted, pending: blocked, reason, stats };
}

async function ensureRpgIndexes() {
  if (!rpgIndexReadyPromise) {
    rpgIndexReadyPromise = Promise.all([
      UserRpgProgress.init(),
      UserDailyQuestLog.init(),
      UserRpgRewardLog.init(),
    ]).catch((error) => {
      rpgIndexReadyPromise = null;
      throw error;
    });
  }
  return rpgIndexReadyPromise;
}

async function resolveRpgProfile(auth, requestedProfileId) {
  const rawRequestedProfileId = typeof requestedProfileId === "string" ? requestedProfileId : "";
  const hasRequestedProfileId = Boolean(rawRequestedProfileId.trim());
  const profileId = normalizeProfileId(rawRequestedProfileId || "");
  if (hasRequestedProfileId && !profileId) {
    return { error: json({ ok: false, message: "유효한 profileId가 필요합니다." }, { status: 400 }) };
  }

  const user = await User.findById(auth.userId)
    .select("destinyProfilesCurrentId destinyProfilesLockedCurrentId")
    .lean();

  if (!user) {
    return { error: json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 }) };
  }

  let profile = null;
  let resolvedProfileId = profileId || normalizeProfileId(user.destinyProfilesCurrentId);

  if (resolvedProfileId) {
    profile = await ProfileCard.findOne({ userId: auth.userId, profileId: resolvedProfileId }).lean();
  }

  if (!profile) {
    profile = await ProfileCard.findOne({ userId: auth.userId }).sort({ createdAt: 1 }).lean();
    /* 카드가 하나도 없어도 404로 막지 않는다. 퀘스트만 중립 기준으로 만들고 레벨은 그대로 쌓인다. */
    resolvedProfileId = profile ? normalizeProfileId(profile.profileId || profile.id || "") : "";
  }

  return {
    user,
    profile,
    profileId: resolvedProfileId || normalizeProfileId(profile.profileId || profile.id || ""),
  };
}

async function loadRpgProgress(userId, profileId, session = null) {
  const query = UserRpgProgress.findOne({ userId, profileId });
  if (session) query.session(session);
  const progress = await query.lean();
  if (progress) {
    return progress;
  }

  const now = new Date();
  const createdDoc = {
    userId,
    profileId,
    currentLevel: 1,
    totalExp: 0,
    currentLevelExp: 0,
    nextLevelExp: getExpToNextLevel(1),
    unlockedSkills: [],
    unlockedSecretFortunes: [],
    unlockedMilestoneRewards: [],
    streakDays: 0,
    longestStreakDays: 0,
    lastQuestDateKst: "",
    lastQuestCompletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const created = session
    ? await UserRpgProgress.create([createdDoc], { session })
    : await UserRpgProgress.create([createdDoc]);

  return created[0]?.toObject ? created[0].toObject() : created[0];
}

function buildProgressResponse(progressDoc) {
  const nextState = calculateLevelState(progressDoc?.totalExp);
  return {
    currentLevel: nextState.currentLevel,
    totalExp: nextState.totalExp,
    currentLevelExp: nextState.currentLevelExp,
    nextLevelExp: nextState.nextLevelExp,
    streakDays: toSafeNumber(progressDoc?.streakDays, 0),
    longestStreakDays: toSafeNumber(progressDoc?.longestStreakDays, 0),
    lastQuestDateKst: toSafeString(progressDoc?.lastQuestDateKst, 10),
    unlockedSkills: normalizeRewardKeyList(progressDoc?.unlockedSkills || []),
    unlockedSecretFortunes: normalizeRewardKeyList(progressDoc?.unlockedSecretFortunes || []),
    unlockedMilestoneRewards: normalizeRewardKeyList(progressDoc?.unlockedMilestoneRewards || []),
  };
}

async function getDailyRpgStatus(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  await ensureRpgIndexes();

  const url = new URL(request.url);
  const requestedProfileId = url.searchParams.get("profileId") || "";
  const resolved = await resolveRpgProfile(auth, requestedProfileId);
  if (resolved.error) return resolved.error;

  const dateKey = kstDateKey();
  const context = (resolved.profile ? buildSajuContext(resolved.profile) : null) || buildNeutralContext();

  const questSet = buildQuestSet({
    profile: resolved.profile,
    profileId: resolved.profileId,
    userId: auth.userId,
    dateKey,
    context,
  });

  const progress = await loadRpgProgress(auth.userId, ACCOUNT_PROFILE_SCOPE);
  const logs = await UserDailyQuestLog.find({
    userId: auth.userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
    questDateKst: dateKey,
  }).sort({ createdAt: 1 }).lean();

  const completedQuestSet = new Set(logs.map((log) => String(log.questId || "")).filter(Boolean));
  const completedQuestIds = questSet.quests
    .filter((quest) => completedQuestSet.has(quest.questId))
    .map((quest) => quest.questId);
  const todayEarnedExp = logs.reduce((sum, log) => sum + toSafeNumber(log.expReward), 0);

  return json({
    ok: true,
    profileId: resolved.profileId,
    questDateKst: dateKey,
    todayMaxExp: questSet.todayMaxExp,
    todayEarnedExp,
    completedQuestIds,
    quests: questSet.quests.map((quest) => ({
      ...quest,
      completed: completedQuestSet.has(quest.questId),
    })),
    generationMeta: questSet.generationMeta,
    neutral: Boolean(context.neutral),
    progress: buildProgressResponse(progress),
    ...buildProgressResponse(progress),
    message: "오늘의 운명 퀘스트가 열렸습니다.",
  });
}

async function completeDailyQuest(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  await ensureRpgIndexes();

  const body = await readJson(request);
  const requestedProfileId = String(body?.profileId || "");
  const requestedQuestId = normalizeProfileId(body?.questId || "");
  if (!requestedQuestId) {
    return json({ ok: false, message: "questId가 필요합니다." }, { status: 400 });
  }

  const resolved = await resolveRpgProfile(auth, requestedProfileId);
  if (resolved.error) return resolved.error;

  const dateKey = kstDateKey();
  const context = (resolved.profile ? buildSajuContext(resolved.profile) : null) || buildNeutralContext();
  /* 퀘스트 id는 카드별 서명으로 만들고, 진행도는 계정 스코프에 쌓는다. */
  const progressScope = ACCOUNT_PROFILE_SCOPE;

  const questSet = buildQuestSet({
    profile: resolved.profile,
    profileId: resolved.profileId,
    userId: auth.userId,
    dateKey,
    context,
  });

  const questMap = new Map(questSet.quests.map((quest) => [quest.questId, quest]));
  const selectedQuest = questMap.get(requestedQuestId);
  if (!selectedQuest) {
    return json({ ok: false, message: "오늘 생성된 미션이 아닙니다." }, { status: 400 });
  }

  const todayMaxExp = questSet.todayMaxExp;
  const session = await mongoose.startSession();
  const now = new Date();

  try {
    let nextProgress = null;
    let leveledUp = false;
    let unlockedRewards = [];

    await session.withTransaction(async () => {
      const progress = await UserRpgProgress.findOne({ userId: auth.userId, profileId: progressScope }).session(session);
      const isExistingProgress = Boolean(progress);
      const progressDoc = progress || new UserRpgProgress({
        userId: auth.userId,
        profileId: progressScope,
        currentLevel: 1,
        totalExp: 0,
        currentLevelExp: 0,
        nextLevelExp: getExpToNextLevel(1),
        unlockedSkills: [],
        unlockedSecretFortunes: [],
        unlockedMilestoneRewards: [],
        streakDays: 0,
        longestStreakDays: 0,
        lastQuestDateKst: "",
        lastQuestCompletedAt: null,
      });

      const existingQuestLog = await UserDailyQuestLog.findOne({
        userId: auth.userId,
        profileId: progressScope,
        questDateKst: dateKey,
        questId: selectedQuest.questId,
      }).session(session);

      if (existingQuestLog) {
        throw createInternalError("이미 완료한 미션입니다.", "DAILY_QUEST_ALREADY_COMPLETED", 409);
      }

      const logs = await UserDailyQuestLog.find({
        userId: auth.userId,
        profileId: progressScope,
        questDateKst: dateKey,
      }).session(session);
      const todayEarnedExp = logs.reduce((sum, log) => sum + toSafeNumber(log.expReward), 0);
      if (todayEarnedExp + toSafeNumber(selectedQuest.expReward) > todayMaxExp) {
        throw createInternalError("오늘 최대 EXP 한도를 초과했습니다.", "DAILY_QUEST_EXP_CAP_REACHED", 400);
      }

      const prevProgress = progressDoc.toObject ? progressDoc.toObject() : progressDoc;
      const prevLevel = calculateLevelState(prevProgress.totalExp).currentLevel;
      const prevStreakDays = toSafeNumber(prevProgress.streakDays, 0);
      const yesterdayKey = yesterdayKstDateKey();
      let nextStreakDays = prevStreakDays;

      if (toSafeString(prevProgress.lastQuestDateKst, 10) !== dateKey) {
        if (toSafeString(prevProgress.lastQuestDateKst, 10) === yesterdayKey) {
          nextStreakDays = Math.max(1, prevStreakDays + 1);
        } else {
          nextStreakDays = 1;
        }
      }

      const nextTotalExp = toSafeNumber(prevProgress.totalExp) + toSafeNumber(selectedQuest.expReward);
      const nextLevelState = calculateLevelState(nextTotalExp);
      leveledUp = nextLevelState.currentLevel > prevLevel;

      const rewardPlan = buildRewardEvents({
        previousProgress: prevProgress,
        previousLevel: prevLevel,
        nextProgress: nextLevelState,
        dayMasterElement: context.dayMasterElement,
        prevStreakDays,
        nextStreakDays,
      });

      const isDailyQuestCompleted = (logs.length + 1) >= questSet.quests.length;
      if (isDailyQuestCompleted) {
        const dailySecretKey = `daily_complete_${dateKey}`;
        const dailySecretExists = normalizeRewardKeyList(rewardPlan.unlockedSecretFortunes || []).includes(dailySecretKey)
          || normalizeRewardKeyList(prevProgress?.unlockedSecretFortunes || []).includes(dailySecretKey);
        if (!dailySecretExists) {
          rewardPlan.rewardEvents.push({
            rewardType: "secret_unlock",
            rewardKey: dailySecretKey,
            level: nextLevelState.currentLevel,
            title: "오늘의 성장 메시지",
            description: "오늘의 미션을 모두 완료했습니다. 비밀 운세가 해금됩니다.",
          });
          rewardPlan.unlockedSecretFortunes = uniqueStrings([
            ...(rewardPlan.unlockedSecretFortunes || []),
            dailySecretKey,
          ]);
        }
      }

      const rewardLogs = rewardPlan.rewardEvents.map((reward) => ({
        userId: auth.userId,
        profileId: progressScope,
        rewardType: reward.rewardType,
        rewardKey: reward.rewardKey,
        level: reward.level,
        idempotencyKey: `${dateKey}:${progressScope}:${reward.rewardType}:${reward.rewardKey}`,
        meta: {
          dateKey,
          questId: selectedQuest.questId,
          questType: selectedQuest.questType,
          element: selectedQuest.element,
          expReward: selectedQuest.expReward,
          reason: selectedQuest.reason,
          title: reward.title,
          description: reward.description,
        },
      }));

      await UserDailyQuestLog.create([{
        userId: auth.userId,
        profileId: progressScope,
        questDateKst: dateKey,
        questId: selectedQuest.questId,
        questType: selectedQuest.questType,
        element: selectedQuest.element,
        expReward: selectedQuest.expReward,
        completedAt: now,
        evidenceType: "server_generated_quest",
        status: "completed",
        idempotencyKey: `${dateKey}:${progressScope}:${selectedQuest.questId}`,
        missionSnapshot: {
          ...selectedQuest,
          dateKey,
          todayMaxExp,
          generationMeta: questSet.generationMeta,
        },
      }], { session });

      if (rewardLogs.length > 0) {
        await UserRpgRewardLog.create(rewardLogs, { session });
      }

      const progressUpdate = {
        currentLevel: nextLevelState.currentLevel,
        totalExp: nextLevelState.totalExp,
        currentLevelExp: nextLevelState.currentLevelExp,
        nextLevelExp: nextLevelState.nextLevelExp,
        streakDays: nextStreakDays,
        longestStreakDays: Math.max(toSafeNumber(prevProgress.longestStreakDays, 0), nextStreakDays),
        lastQuestDateKst: dateKey,
        lastQuestCompletedAt: now,
        unlockedSkills: rewardPlan.unlockedSkills,
        unlockedSecretFortunes: rewardPlan.unlockedSecretFortunes,
        unlockedMilestoneRewards: rewardPlan.unlockedMilestoneRewards,
        updatedAt: now,
      };

      if (isExistingProgress) {
        await UserRpgProgress.updateOne(
          { _id: progressDoc._id },
          { $set: progressUpdate },
          { session },
        );
      } else {
        progressDoc.set(progressUpdate);
        await progressDoc.save({ session });
      }

      const nextProgressDoc = {
        ...prevProgress,
        ...progressUpdate,
      };
      nextProgress = nextProgressDoc;
      unlockedRewards = rewardLogs.map((reward) => ({
        rewardType: reward.rewardType,
        rewardKey: reward.rewardKey,
        level: reward.level,
        title: reward.meta?.title || "",
        description: reward.meta?.description || "",
      }));
    }, mongoTransactionOptions());

    const refreshedProgress = await UserRpgProgress.findOne({
      userId: auth.userId,
      profileId: progressScope,
    }).lean();

    const refreshedLogs = await UserDailyQuestLog.find({
      userId: auth.userId,
      profileId: progressScope,
      questDateKst: dateKey,
    }).sort({ createdAt: 1 }).lean();

    const completedSet = new Set(refreshedLogs.map((log) => String(log.questId || "")).filter(Boolean));
    const completedQuestIds = questSet.quests
      .filter((quest) => completedSet.has(quest.questId))
      .map((quest) => quest.questId);
    const todayEarnedExp = refreshedLogs.reduce((sum, log) => sum + toSafeNumber(log.expReward), 0);

    return json({
      ok: true,
      profileId: resolved.profileId,
      questId: selectedQuest.questId,
      questDateKst: dateKey,
      todayMaxExp,
      todayEarnedExp,
      completedQuestIds,
      quests: questSet.quests.map((quest) => ({
        ...quest,
        completed: completedSet.has(quest.questId),
      })),
      leveledUp,
      newLevel: toSafeNumber(refreshedProgress?.currentLevel || nextProgress?.currentLevel || 1, 1),
      unlockedRewards,
      ...buildProgressResponse(refreshedProgress || nextProgress),
      message: leveledUp
        ? "미션이 완료되며 운명의 레벨이 상승했습니다."
        : "미션이 완료되었습니다.",
    });
  } catch (error) {
    if (String(error?.code || "") === "DAILY_QUEST_ALREADY_COMPLETED") {
      return json({ ok: false, message: "이미 완료한 미션입니다." }, { status: 409 });
    }
    if (String(error?.code || "") === "DAILY_QUEST_EXP_CAP_REACHED") {
      return json({ ok: false, message: "오늘 최대 EXP 한도를 초과했습니다." }, { status: 400 });
    }
    if (Number(error?.status) === 409) {
      return json({ ok: false, message: "이미 완료한 미션입니다." }, { status: 409 });
    }
    if (String(error?.code || "").includes("11000")) {
      return json({ ok: false, message: "이미 완료한 미션입니다." }, { status: 409 });
    }
    throw error;
  } finally {
    session.endSession();
  }
}

/* 메인 화면 프로필 카드가 읽는 유일한 경로. 카드가 실제로 쓰는 세 값만 돌려준다.
   의도적으로 하지 않는 것들 — 이 셋이 /status를 홈에 얹기 부담스럽게 만들던 비용이다:
     · User/ProfileCard 조회 안 함 (인증은 JWT 검증만, Mongo 0회)
     · buildSajuContext 안 부름 (lunar-javascript 변환은 CPU를 크게 먹는다)
     · UserDailyQuestLog 조회 안 함 (퀘스트는 클라이언트가 로컬에서 만든다)
   문서가 없으면 만들지 않고 0값을 준다. 읽기 요청이 쓰기를 유발하면 안 된다. */
async function getRpgProgressLite(request, env) {
  const userId = await peekAccessTokenUserId(request, env).catch(() => "");
  if (!userId) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  const cached = readRpgProgressFromCache(userId);
  if (cached) {
    return json({ ok: true, cached: true, progress: cached });
  }

  try {
    /* 선행 connectDb 를 두지 않는다 — withMongoRetry 가 내부에서 connectDb 를 한다.
       밖에서 또 부르면 그 호출만 시도 타임아웃·재시도·웜 무효화 밖에 놓여, 연결 수립 단계
       실패가 재시도 0회로 곧장 catch 로 떨어졌다(재시도가 있는 것처럼 보이지만 없던 구간). */
    const doc = await withMongoRetry(env, () => UserRpgProgress.findOne({
      userId,
      profileId: ACCOUNT_PROFILE_SCOPE,
    }).lean());

    const progress = buildProgressResponse(doc || null);
    writeRpgProgressToCache(userId, progress);
    return json({ ok: true, cached: false, progress });
  } catch (error) {
    /* 일시적 DB 장애를 오류 응답으로 터뜨리지 않는다. 클라이언트(_cdLevelSync)는 실패를 삼키고
       로컬 값을 그대로 쓰므로 상태코드에서 얻는 정보가 없는데, 503 은 콘솔에 오류만 남기고
       클라의 베이스 폴백을 유발해 요청을 배로 늘렸다. /api/auth/me 의 degraded 응답과 같은
       계약으로 200 + degraded 를 돌려준다(progress: null → 클라는 종전대로 로컬 값 유지). */
    console.warn("[RPG][ProgressDegraded]", { message: String(error?.message || error || "") });
    return json({
      ok: true,
      degraded: true,
      code: "RPG_PROGRESS_DEGRADED",
      progress: null,
      message: "성장 기록을 잠시 불러오지 못했습니다.",
    });
  }
}

/* 메인 화면 프로필 카드의 EXP 적립 창구.
   출석·습관 퀘스트·유료 열람 보너스가 모두 "종류 + 키로 하루 N회까지 멱등 지급"이라 한 곳에서 받는다.
   중복 방지는 UserDailyQuestLog의 {userId, profileId, questDateKst, questId} 유니크 인덱스가 최종 보증한다. */
async function awardRpgExp(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  await ensureRpgIndexes();

  const body = await readJson(request);
  const kind = toSafeString(body?.kind, 20);
  const rule = AWARD_RULES[kind];
  // serverOnly 종류(공유·연속출석)는 서버가 실제 사건을 보고 직접 적립한다.
  // EXP 가 월정석으로 환산되므로 이 둘만은 자기신고를 받지 않는다.
  if (!rule || rule.serverOnly === true) {
    return json({ ok: false, message: "허용되지 않은 적립 종류입니다." }, { status: 400 });
  }

  const result = await applyRpgAward(env, auth.userId, kind, toSafeString(body?.key, 80));
  return json(result.body, { status: result.status || 200 });
}

/* EXP 적립의 단일 구현. HTTP 핸들러(자기신고 가능한 종류)와 서버 내부 이벤트(공유·연속출석)가
   모두 이 경로를 지난다 — 하루 한도·멱등·레벨업·월정석 정산이 한 곳에만 있게 하기 위함이다. */
async function applyRpgAward(env, userId, kind, rawKey = "", expOverride = null) {
  const baseRule = AWARD_RULES[kind];
  if (!baseRule) return { status: 400, body: { ok: false, message: "허용되지 않은 적립 종류입니다." } };
  // 연속 출석은 단계마다 EXP 가 달라 표에서 받아온다. 그 외에는 화이트리스트 값만 쓴다.
  const rule = expOverride == null ? baseRule : { ...baseRule, exp: Math.max(0, toSafeNumber(expOverride, 0)) };

  const dateKey = kstDateKey();
  const awardKey = toSafeString(rawKey, 80) || dateKey;
  const questId = `${kind}:${awardKey}`;
  const now = new Date();
  const auth = { userId };

  const progress = await withMongoRetry(env, () => loadRpgProgress(auth.userId, ACCOUNT_PROFILE_SCOPE));
  const sameKindLogs = await withMongoRetry(env, () => UserDailyQuestLog.find({
    userId: auth.userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
    questDateKst: dateKey,
    questType: rule.questType,
  }).lean());

  const alreadyGranted = sameKindLogs.some((log) => String(log.questId || "") === questId);
  if (alreadyGranted || sameKindLogs.length >= rule.dailyLimit) {
    return { status: 200, body: {
      ok: true,
      granted: false,
      reason: alreadyGranted ? "ALREADY_GRANTED" : "DAILY_LIMIT_REACHED",
      progress: buildProgressResponse(progress),
    } };
  }

  try {
    await UserDailyQuestLog.create([{
      userId: auth.userId,
      profileId: ACCOUNT_PROFILE_SCOPE,
      questDateKst: dateKey,
      questId,
      questType: rule.questType,
      expReward: rule.exp,
      completedAt: now,
      evidenceType: "client_reported_action",
      status: "completed",
      idempotencyKey: `${dateKey}:${ACCOUNT_PROFILE_SCOPE}:${questId}`,
    }]);
  } catch (error) {
    if (String(error?.code || error?.message || "").includes("11000")) {
      return { status: 200, body: {
        ok: true,
        granted: false,
        reason: "ALREADY_GRANTED",
        progress: buildProgressResponse(progress),
      } };
    }
    throw error;
  }

  /* 스트릭은 출석에서만 움직인다. 하루를 여는 행동이 출석이고,
     퀘스트까지 스트릭을 건드리면 같은 날 두 번 증가하는 창이 생긴다. */
  const prevStreakDays = toSafeNumber(progress?.streakDays, 0);
  let nextStreakDays = prevStreakDays;
  let lastDateKst = toSafeString(progress?.lastQuestDateKst, 10);
  if (kind === "checkin" && lastDateKst !== dateKey) {
    nextStreakDays = lastDateKst === yesterdayKstDateKey() ? Math.max(1, prevStreakDays + 1) : 1;
    lastDateKst = dateKey;
  }

  const prevLevel = calculateLevelState(progress?.totalExp).currentLevel;
  const nextState = calculateLevelState(toSafeNumber(progress?.totalExp) + rule.exp);

  /* totalExp만 $inc로 올린다. 동시 요청이 겹쳐도 합계는 정확하고,
     레벨 필드는 응답 시 buildProgressResponse가 합계에서 다시 계산하므로 어긋나도 자가 교정된다. */
  await withMongoRetry(env, () => UserRpgProgress.updateOne(
    { userId: auth.userId, profileId: ACCOUNT_PROFILE_SCOPE },
    {
      $inc: { totalExp: rule.exp },
      $set: {
        currentLevel: nextState.currentLevel,
        currentLevelExp: nextState.currentLevelExp,
        nextLevelExp: nextState.nextLevelExp,
        streakDays: nextStreakDays,
        longestStreakDays: Math.max(toSafeNumber(progress?.longestStreakDays, 0), nextStreakDays),
        lastQuestDateKst: lastDateKst,
        lastQuestCompletedAt: now,
        updatedAt: now,
      },
    },
  ));

  const refreshed = await withMongoRetry(env, () => UserRpgProgress.findOne({
    userId: auth.userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
  }).lean());
  invalidateRpgProgressCacheForUser(auth.userId);

  /* 연속 출석이 새 단계를 넘었으면 그 보너스를 서버가 스스로 얹는다.
     streakDays 는 서버가 관리하므로 클라이언트가 흉내낼 수 없다. */
  let streakBonus = null;
  if (kind === "checkin" && nextStreakDays > prevStreakDays) {
    const crossed = STREAK_BONUS_TABLE.find((row) => row.days === nextStreakDays);
    if (crossed) {
      const bonus = await applyRpgAward(env, auth.userId, "streak", `d${crossed.days}`, crossed.exp);
      if (bonus?.body?.granted) streakBonus = { days: crossed.days, exp: crossed.exp };
    }
  }

  const finalProgress = await withMongoRetry(env, () => UserRpgProgress.findOne({
    userId: auth.userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
  }).lean());
  const finalLevel = calculateLevelState(finalProgress?.totalExp || 0).currentLevel;

  /* 마일스톤 월정석은 레벨이 올랐을 때만 정산한다(매 적립마다 결제 이력을 조회하지 않도록).
     지급 실패는 적립 자체를 되돌리지 않는다 — 다음 레벨업 때 밀린 분이 다시 시도된다. */
  let rewardGrants = [];
  if (finalLevel > prevLevel) {
    try {
      const settled = await settleLevelMonthlyCreditRewards(env, auth.userId, finalLevel);
      rewardGrants = settled.granted || [];
      if (rewardGrants.length) invalidateRpgProgressCacheForUser(auth.userId);
    } catch (error) {
      console.warn("[RPG][LevelRewardSettleFailed]", { message: String(error?.message || error || "") });
    }
  }

  return { status: 200, body: {
    ok: true,
    granted: true,
    kind,
    gainedExp: rule.exp,
    leveledUp: finalLevel > prevLevel,
    streakBonus,
    monthlyCreditGrants: rewardGrants,
    progress: buildProgressResponse(finalProgress || refreshed || progress),
  } };
}

/* 비로그인 상태에서 이 기기에 쌓인 진행분을 로그인 계정으로 한 번만 옮긴다.
   1회성은 UserRpgRewardLog의 {userId, profileId, rewardType, rewardKey} 유니크 인덱스가 보증한다.
   보내온 EXP는 상한을 두고, 서버 값보다 클 때만 반영한다(줄어드는 방향으로는 절대 덮어쓰지 않는다). */
async function adoptLocalRpgProgress(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const localTotalExp = Math.min(Math.max(0, toSafeNumber(body?.localTotalExp, 0)), AWARD_LOCAL_ADOPT_CAP);
  const localStreakDays = Math.max(0, toSafeNumber(body?.localStreakDays, 0));
  const localLongestStreakDays = Math.max(localStreakDays, toSafeNumber(body?.localLongestStreakDays, 0));

  try {
    return await runLocalRpgAdopt(env, auth.userId, localTotalExp, localStreakDays, localLongestStreakDays);
  } catch (error) {
    /* 일시적 DB 장애를 503 으로 터뜨리지 않는다. 이 호출은 사용자가 기다리는 동작이 아니라 로컬
       EXP 를 계정으로 옮기는 배경 작업이고, 클라이언트(_cdLevelAdopt)는 실패를 삼키고 로컬 값을
       그대로 쓴다 — /progress 와 같은 계약이다(위 RPG_PROGRESS_DEGRADED 참고).
       🔴 여기만은 ok:false 여야 한다. /progress 는 읽기라 ok:true 로 degrade 해도 되지만 adopt 는
       쓰기이므로, ok:true 를 주면 클라가 store.adopted 를 찍고 **실제로 옮겨지지 않은 EXP 를
       영영 못 넘긴다**. 클라 가드(js/destiny-profile.js _cdLevelAdopt)가 이 필드를 본다. */
    console.warn("[RPG][AdoptDegraded]", { message: String(error?.message || error || "") });
    return json({
      ok: false,
      degraded: true,
      code: "RPG_ADOPT_DEGRADED",
      adopted: false,
      progress: null,
      message: "성장 기록을 잠시 옮기지 못했습니다.",
    });
  }
}

async function runLocalRpgAdopt(env, userId, localTotalExp, localStreakDays, localLongestStreakDays) {
  await connectDb(env);
  await ensureRpgIndexes();

  const progress = await withMongoRetry(env, () => loadRpgProgress(userId, ACCOUNT_PROFILE_SCOPE));

  try {
    await UserRpgRewardLog.create([{
      userId,
      profileId: ACCOUNT_PROFILE_SCOPE,
      rewardType: "local_adopt",
      rewardKey: "v1",
      level: 0,
      idempotencyKey: `${ACCOUNT_PROFILE_SCOPE}:local_adopt:v1`,
      meta: { localTotalExp, localStreakDays, localLongestStreakDays },
    }]);
  } catch (error) {
    if (String(error?.code || error?.message || "").includes("11000")) {
      return json({
        ok: true,
        adopted: false,
        reason: "ALREADY_ADOPTED",
        progress: buildProgressResponse(progress),
      });
    }
    throw error;
  }

  const nextTotalExp = Math.max(toSafeNumber(progress?.totalExp, 0), localTotalExp);
  const nextState = calculateLevelState(nextTotalExp);
  const nextStreakDays = Math.max(toSafeNumber(progress?.streakDays, 0), localStreakDays);
  const now = new Date();

  await withMongoRetry(env, () => UserRpgProgress.updateOne(
    { userId, profileId: ACCOUNT_PROFILE_SCOPE },
    {
      $set: {
        currentLevel: nextState.currentLevel,
        totalExp: nextState.totalExp,
        currentLevelExp: nextState.currentLevelExp,
        nextLevelExp: nextState.nextLevelExp,
        streakDays: nextStreakDays,
        longestStreakDays: Math.max(
          toSafeNumber(progress?.longestStreakDays, 0),
          Math.max(localLongestStreakDays, nextStreakDays),
        ),
        updatedAt: now,
      },
    },
  ));

  invalidateRpgProgressCacheForUser(userId);

  return json({
    ok: true,
    adopted: true,
    progress: buildProgressResponse({
      ...progress,
      totalExp: nextState.totalExp,
      streakDays: nextStreakDays,
      longestStreakDays: Math.max(
        toSafeNumber(progress?.longestStreakDays, 0),
        Math.max(localLongestStreakDays, nextStreakDays),
      ),
    }),
  });
}

/* 서버가 스스로 확인한 사건(카카오 공유 링크 생성 등)에 EXP 를 적립하는 통로.
   HTTP 라우트를 거치지 않으므로 자기신고가 아니며, 실패해도 원래 기능을 막지 않는다. */
export async function grantRpgExpForServerEvent(env, userId, kind, awardKey = "") {
  const rule = AWARD_RULES[kind];
  if (!rule || rule.serverOnly !== true || !userId) return null;
  await connectDb(env);
  await ensureRpgIndexes();
  return applyRpgAward(env, userId, kind, awardKey);
}

/* 운명 도감(수집) — 계정 단위. "1회 소유"는 UserRpgRewardLog 의 {userId,profileId,rewardType,rewardKey}
   유니크 인덱스가 보증한다. EXP·재화와 무관한 순수 수집 기록이라 위조돼도 금전 손실이 없다(award와 동일 신뢰 모델). */
const COLLECTIBLE_REWARD_TYPE = "collectible";

async function collectRpgItem(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  await ensureRpgIndexes();

  const body = await readJson(request);
  const rewardKey = toSafeString(body?.key, 150);
  if (!rewardKey) return json({ ok: false, message: "수집 키가 필요합니다." }, { status: 400 });

  let collected = true;
  try {
    // 멱등 create — adoptLocalRpgProgress 와 동일 패턴(write는 withMongoRetry 미적용).
    await UserRpgRewardLog.create([{
      userId: auth.userId,
      profileId: ACCOUNT_PROFILE_SCOPE,
      rewardType: COLLECTIBLE_REWARD_TYPE,
      rewardKey,
      level: 0,
    }]);
  } catch (error) {
    if (String(error?.code || error?.message || "").includes("11000")) {
      collected = false; // 이미 수집 — 멱등 정상
    } else {
      throw error;
    }
  }
  return json({ ok: true, collected, key: rewardKey });
}

async function getRpgCollectibles(request, env) {
  const auth = await requireAuth(request, env);
  // 선행 connectDb 없음 — withMongoRetry 가 내부에서 연결한다(getRpgProgressLite 와 같은 이유).
  const rows = await withMongoRetry(env, () => UserRpgRewardLog.find({
    userId: auth.userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
    rewardType: COLLECTIBLE_REWARD_TYPE,
  }).select("rewardKey createdAt").sort({ createdAt: -1 }).lean());
  const items = (rows || []).map((r) => ({ key: r.rewardKey, at: r.createdAt }));
  return json({ ok: true, items, count: items.length });
}

/* 레벨 보상 안내 시트 전용. 프로필 카드가 "보상표 + 내 수령 상태"를 그리는 데 필요한 값만 준다.
   🔴 홈 진입에서 자동으로 부르지 말 것 — 트래픽 1위 화면에 Mongo 왕복을 얹지 않으려고
   /progress 를 경량화한 것(위 RPG_PROGRESS_CACHE 주석)을 그대로 되돌리는 셈이 된다.
   단계마다 요구 실적이 다르므로 결제 진행도는 받을 게 있든 없든 항상 필요하다(시트가 그걸 그린다).
   시트를 여는 사용자 조작에서만 도는 경로라 왕복 2회는 감수한다. */
async function getLevelRewardStatus(request, env) {
  const auth = await requireAuth(request, env);
  const milestones = LEVEL_MONTHLY_CREDIT_REWARDS.map((row) => ({
    level: row.level,
    credits: row.credits,
    krw: row.credits * 10,
    minPayments: row.minPayments,
    minPaidKrw: row.minPaidKrw,
  }));

  try {
    const [progress, logs] = await Promise.all([
      withMongoRetry(env, () => UserRpgProgress.findOne({
        userId: auth.userId,
        profileId: ACCOUNT_PROFILE_SCOPE,
      }).select("totalExp").lean()),
      withMongoRetry(env, () => UserRpgRewardLog.find({
        userId: auth.userId,
        profileId: ACCOUNT_PROFILE_SCOPE,
        rewardType: LEVEL_REWARD_LOG_TYPE,
      }).select("rewardKey meta").lean()),
    ]);

    const currentLevel = calculateLevelState(progress?.totalExp || 0).currentLevel;
    const grantedLevels = (logs || [])
      .map((row) => Number(String(row?.rewardKey || "").replace("level_", "")))
      .filter((level) => Number.isFinite(level) && level > 0)
      .sort((a, b) => a - b);
    const grantedSet = new Set(grantedLevels);
    const totalGrantedCredits = (logs || []).reduce((sum, row) => sum + toSafeNumber(row?.meta?.credits, 0), 0);
    const reachedUngranted = LEVEL_MONTHLY_CREDIT_REWARDS
      .filter((row) => currentLevel >= row.level && !grantedSet.has(row.level));

    const stats = await resolveLevelRewardStats(env, auth.userId);
    // 지금 당장 실적이 되는 단계만 "받을 수 있음"이다. 도달했지만 실적이 모자란 단계는 pending.
    const claimableLevels = reachedUngranted
      .filter((row) => meetsLevelRewardRequirement(row, stats))
      .map((row) => row.level);
    const pendingLevels = reachedUngranted
      .filter((row) => !meetsLevelRewardRequirement(row, stats))
      .map((row) => row.level);

    return json({
      ok: true,
      currentLevel,
      milestones,
      grantedLevels,
      claimableLevels,
      pendingLevels,
      totalGrantedCredits,
      accountAgeOk: stats.accountAgeOk,
      paymentCount: stats.paymentCount,
      paidKrw: stats.paidKrw,
      eligible: claimableLevels.length > 0,
      eligibleReason: stats.reason,
    });
  } catch (error) {
    /* /progress 와 같은 계약 — 200 + degraded. 시트는 보상표(정적)만으로도 그려져야 하므로
       milestones 는 항상 채워 보낸다(수령 상태만 비운다). */
    console.warn("[RPG][LevelRewardStatusDegraded]", { message: String(error?.message || error || "") });
    return json({
      ok: true,
      degraded: true,
      code: "RPG_LEVEL_REWARD_DEGRADED",
      milestones,
      grantedLevels: [],
      claimableLevels: [],
      message: "보상 수령 상태를 잠시 불러오지 못했습니다.",
    });
  }
}

/* 밀린 마일스톤 수령. 지금까지 정산은 "레벨이 오른 순간"에만 돌아서(applyRpgAward),
   자격 미달로 미뤄진 보상은 다음 레벨업이 있어야 나갔다 — 만렙(99)에 먼저 도달하고 나중에
   조건을 채운 사용자는 영영 못 받는다. 지급 규칙·자격·상한은 손대지 않고 정산 시점만 하나 더 연다.
   중복 지급은 UserRpgRewardLog 유니크 인덱스와 lot 의 lotId 중복 거부가 이미 이중으로 막는다. */
async function claimLevelRewards(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  await ensureRpgIndexes();

  const progress = await withMongoRetry(env, () => UserRpgProgress.findOne({
    userId: auth.userId,
    profileId: ACCOUNT_PROFILE_SCOPE,
  }).select("totalExp").lean());
  const currentLevel = calculateLevelState(progress?.totalExp || 0).currentLevel;

  const settled = await settleLevelMonthlyCreditRewards(env, auth.userId, currentLevel);
  const granted = settled.granted || [];
  if (granted.length) invalidateRpgProgressCacheForUser(auth.userId);

  return json({
    ok: true,
    currentLevel,
    granted,
    pending: settled.pending || [],
    reason: settled.reason,
  });
}

export async function handleRpgRoutes(request, env) {
  let path = "";
  try {
    const method = request.method.toUpperCase();
    path = getRoutePath(request, "/api/rpg");

    if (method === "GET" && (path === "" || path === "/" || path === "/status" || path === "/daily/status" || path === "/me")) {
      return await getDailyRpgStatus(request, env);
    }

    if (method === "POST" && (path === "" || path === "/" || path === "/complete" || path === "/daily/complete")) {
      return await completeDailyQuest(request, env);
    }

    if (method === "GET" && path === "/progress") {
      return await getRpgProgressLite(request, env);
    }

    if (method === "POST" && path === "/award") {
      return await awardRpgExp(request, env);
    }

    if (method === "POST" && path === "/adopt") {
      return await adoptLocalRpgProgress(request, env);
    }

    if (method === "POST" && path === "/collect") {
      return await collectRpgItem(request, env);
    }

    if (method === "GET" && path === "/level-rewards") {
      return await getLevelRewardStatus(request, env);
    }

    if (method === "POST" && path === "/level-rewards/claim") {
      return await claimLevelRewards(request, env);
    }

    if (method === "GET" && path === "/collectibles") {
      return await getRpgCollectibles(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error);
  }
}
