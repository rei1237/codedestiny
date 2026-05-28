const GAN_KO = Object.freeze({
  "甲": "갑(甲)", "乙": "을(乙)", "丙": "병(丙)", "丁": "정(丁)",
  "戊": "무(戊)", "己": "기(己)", "庚": "경(庚)", "辛": "신(辛)",
  "壬": "임(壬)", "癸": "계(癸)",
});

const GAN_ALIAS = Object.freeze({
  "갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊",
  "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸",
});

const GAN_EL = Object.freeze({
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
});

const EL_KO = Object.freeze({ wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" });
const MONTH_NAMES = Object.freeze(["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]);

const ILGAN_LOVE = Object.freeze({
  "甲": { title: "갑목(甲木) — 개척하는 사랑꾼", instinct: "연애의 주도권을 자연스럽게 쥐고 싶어하고, 좋아하면 직진하지만 관계 유지 운영은 느슨해지기 쉽습니다.", unconscious: "보호본능이 강해 내가 지켜야 할 상대에게 깊이 끌립니다.", weakness: "관계가 안정되면 긴장감과 관심이 급격히 줄어 상대가 외로움을 느끼기 쉽습니다." },
  "乙": { title: "을목(乙木) — 덩굴 같은 사랑", instinct: "분위기를 읽고 상대가 먼저 다가오게 만드는 부드러운 접근을 잘합니다.", unconscious: "표면상 독립적이어도 무의식적으로 나를 지켜줄 강한 사람을 원합니다.", weakness: "우유부단함과 의존성이 쌓이면 관계가 무거워지고 갈등을 미루기 쉽습니다." },
  "丙": { title: "병화(丙火) — 태양 같은 사랑", instinct: "좋아하면 연락과 관심이 폭발적으로 늘어나는 현재형 연애 스타일입니다.", unconscious: "연인이 자신을 가장 우선시해 주길 바라고 주목받을 때 에너지가 크게 올라갑니다.", weakness: "감정 기복과 높은 기대치가 반복 실망을 만들 수 있습니다." },
  "丁": { title: "정화(丁火) — 촛불 같은 사랑", instinct: "깊고 섬세하게 한 사람을 오래 사랑하며 작은 변화도 민감하게 포착합니다.", unconscious: "외면보다 내면을 봐주고 진짜 모습을 이해해 주는 사람을 원합니다.", weakness: "감정 표현이 부족해 최선을 다해도 무심한 사람으로 오해받기 쉽습니다." },
  "戊": { title: "무토(戊土) — 대산 같은 사랑", instinct: "확신이 생기기까지 오래 걸리지만 마음을 주면 쉽게 흔들리지 않습니다.", unconscious: "서로 배신하지 않고 오래가는 안정적 관계를 갈망합니다.", weakness: "변화 저항과 고집이 강해 관계가 단조로워질 수 있습니다." },
  "己": { title: "기토(己土) — 옥토 같은 사랑", instinct: "상대가 성장하도록 조용히 뒷받침하는 헌신형 연애를 합니다.", unconscious: "내가 돌볼 수 있는 사람에게 깊이 끌리며 필요감에 자존감이 연결되기 쉽습니다.", weakness: "희생 과도와 경계 없는 배려가 번아웃으로 이어질 수 있습니다." },
  "庚": { title: "경금(庚金) — 날선 사랑", instinct: "좋고 싫음을 분명히 말하는 직선적이고 정직한 연애를 합니다.", unconscious: "날카로운 자기 모습을 겁내지 않고 받아주는 강단 있는 상대를 원합니다.", weakness: "공감과 위로가 부족해 차갑게 보이거나 정서 교류가 끊기기 쉽습니다." },
  "辛": { title: "신금(辛金) — 보석 같은 사랑", instinct: "감각적이고 세련된 분위기와 로맨틱한 무드를 중시합니다.", unconscious: "내 가치를 정확히 알아보고 인정해 주는 사람에게 마음이 열립니다.", weakness: "완벽주의와 예민함이 상대를 지치게 하고 상처를 안으로 쌓기 쉽습니다." },
  "壬": { title: "임수(壬水) — 대해 같은 사랑", instinct: "지적 자극과 자유를 중시하며 대화가 계속 가능한 상대에게 끌립니다.", unconscious: "새로운 세계와 호기심을 제공해 줄 상대를 무의식적으로 찾습니다.", weakness: "자유 추구가 과하면 관심이 분산되고 지속성이 약해질 수 있습니다." },
  "癸": { title: "계수(癸水) — 이슬 같은 사랑", instinct: "상대의 감정 미세변화를 잘 읽는 공감형 연애자입니다.", unconscious: "논리보다 감성으로 깊이 통하는 연결을 갈망합니다.", weakness: "감정의 파고와 우유부단함 때문에 직접 표현이 늦고 오해가 쌓이기 쉽습니다." },
});

const YONGSHIN_PARTNER = Object.freeze({
  wood: { element: "목(木)", exterior: "생기 넘치고 활동적인 인상", personality: "함께 성장하고 서로를 응원하는 파트너십", style: "청록 계열과 자연스러운 분위기", avoidType: "지나치게 억제적이거나 금기를 강조하는 완고한 타입" },
  fire: { element: "화(火)", exterior: "존재감 있고 밝은 인상", personality: "열정적이고 표현력이 강한 사람", style: "붉고 따뜻한 컬러와 활동적인 라이프스타일", avoidType: "차갑고 감정을 억압하는 냉정한 타입" },
  earth: { element: "토(土)", exterior: "안정적이고 듬직한 인상", personality: "현실적이고 포용력 있게 곁을 지켜주는 사람", style: "베이지와 실용적인 스타일", avoidType: "끊임없이 자극만 요구하는 불안정한 타입" },
  metal: { element: "금(金)", exterior: "세련되고 날카로운 인상", personality: "원칙과 결단력이 있는 실용주의 파트너", style: "화이트·실버 계열의 정돈된 미니멀 스타일", avoidType: "충동적이고 감정 기복이 심한 타입" },
  water: { element: "수(水)", exterior: "지적이고 깊은 눈빛", personality: "통찰력과 감성이 풍부한 대화형 파트너", style: "딥블루 계열과 사색적인 분위기", avoidType: "통제적이고 억압적인 타입" },
});

const GAEUN_LOVE = Object.freeze({
  wood: { bedDir: "동쪽 또는 동남쪽", livingColor: "초록·민트 계열 포인트", perfume: "포레스트·베르가못·녹차 계열", affirmation: "나는 상대방을 위해 자랄 준비가 되어 있고 상대방도 나를 위해 성장할 것이다" },
  fire: { bedDir: "남쪽", livingColor: "산호·따뜻한 레드·오렌지 포인트", perfume: "스파이시·앰버·삼나무 계열", affirmation: "나는 나의 열정과 빛으로 내 삶의 완벽한 동반자를 끌어당긴다" },
  earth: { bedDir: "북동쪽 또는 남서쪽", livingColor: "황토·베이지·카멜 톤", perfume: "우디·패출리·샌달우드 계열", affirmation: "내 삶의 든든한 기반은 나누면 나눌수록 더 커지는 현재진행형 사랑이다" },
  metal: { bedDir: "서쪽", livingColor: "화이트·실버·라이트그레이", perfume: "클린·머스크·아이리스 계열", affirmation: "나의 높은 기준은 나에게 어울리는 최고의 파트너를 부르는 신호다" },
  water: { bedDir: "북쪽", livingColor: "딥블루·네이비·청회색 포인트", perfume: "수중·아쿠아·오션·세이지 계열", affirmation: "나는 깊은 연결과 진정한 상호 이해를 이루는 사랑을 이미 끌어당기고 있다" },
});

const LOVE_RISK = Object.freeze({
  high_tao: { title: "도화살 과잉 리스크", risk: "관심이 여러 방향으로 분산되어 상대에게 불안을 주기 쉽습니다.", solution: "특정 상대에게만 주는 집중 신호를 행동으로 반복해 신뢰를 확보해야 합니다." },
  high_yeokma: { title: "역마살 연애 리스크", risk: "관계가 무르익을 타이밍에 이동하거나 정착을 미루는 패턴이 반복되기 쉽습니다.", solution: "한 사람과 충분히 깊어지는 경험을 의도적으로 선택하고 속도를 늦춰야 합니다." },
  high_hwa: { title: "화개살 고독 리스크", risk: "이상향이 높아 현실 연애가 기준에 못 미친다고 느끼면 스스로 차단벽을 세우기 쉽습니다.", solution: "완벽한 상대보다 충분히 좋은 사람을 받아들이는 훈련이 필요합니다." },
  gwimunkwan: { title: "귀문관살 집착 리스크", risk: "상대의 행동에 과도한 의미를 부여하고 비합리적 불안을 키우기 쉽습니다.", solution: "감정 객관화 훈련과 경계선 표현을 반복해 집착 루프를 끊어야 합니다." },
});

const DAEWUN_LOVE_FLOW = Object.freeze({
  wood: "목운 대운은 새로운 시작과 만남의 에너지가 강해 처음 보는 사람과 인연이 맺어질 가능성이 큽니다.",
  fire: "화운 대운은 연애 에너지가 최고조에 달해 관계가 빠르게 진전되지만 충동적 결정은 경계해야 합니다.",
  earth: "토운 대운은 안정과 결실의 에너지라 장기 파트너와 결혼 판단에 유리합니다.",
  metal: "금운 대운은 관계를 정리하고 기준을 높이는 시기라 결단이 필요한 인연이 분명해집니다.",
  water: "수운 대운은 내면 탐구와 감성 성장이 강해 진짜 원하는 관계 기준이 선명해지는 시기입니다.",
});

const MONTHLY_LOVE_SCORE = Object.freeze({
  "甲": [60, 70, 85, 55, 75, 90, 65, 80, 70, 55, 75, 85],
  "乙": [65, 80, 70, 90, 60, 75, 85, 55, 70, 80, 60, 75],
  "丙": [70, 60, 90, 80, 55, 85, 75, 90, 60, 70, 80, 55],
  "丁": [75, 85, 65, 70, 90, 55, 80, 70, 85, 60, 75, 80],
  "戊": [80, 65, 75, 85, 70, 60, 90, 75, 55, 85, 65, 70],
  "己": [55, 75, 80, 65, 85, 70, 60, 90, 75, 70, 80, 65],
  "庚": [85, 60, 70, 80, 65, 75, 55, 65, 90, 75, 60, 80],
  "辛": [70, 80, 55, 75, 80, 65, 75, 60, 80, 90, 70, 65],
  "壬": [60, 75, 80, 60, 75, 80, 65, 75, 70, 65, 90, 75],
  "癸": [75, 65, 60, 75, 60, 85, 80, 65, 75, 80, 65, 90],
});

function clean(value) {
  return String(value || "").trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(Number(value || 0));
}

function normalizeGan(value) {
  const raw = clean(value);
  return GAN_ALIAS[raw] || raw;
}

function normalizeElement(value) {
  const raw = clean(value).toLowerCase();
  if (["wood", "fire", "earth", "metal", "water"].includes(raw)) return raw;
  const koMap = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
  for (const key of Object.keys(koMap)) {
    if (raw.includes(key)) return koMap[key];
  }
  return "";
}

function normalizeCounts(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    wood: Number(safe.wood || 0) || 0,
    fire: Number(safe.fire || 0) || 0,
    earth: Number(safe.earth || 0) || 0,
    metal: Number(safe.metal || 0) || 0,
    water: Number(safe.water || 0) || 0,
  };
}

function deriveElementBalance(counts) {
  const safe = normalizeCounts(counts);
  const total = Math.max(1, safe.wood + safe.fire + safe.earth + safe.metal + safe.water);
  const keys = ["wood", "fire", "earth", "metal", "water"];
  const ratio = {};
  const spread = [];
  const ideal = 20;

  keys.forEach((key) => {
    const pct = (safe[key] / total) * 100;
    ratio[key] = round(pct);
    spread.push({ key, pct });
  });

  spread.sort((a, b) => b.pct - a.pct);
  const dominant = spread[0] || { key: "earth", pct: 20 };
  const deficient = spread[spread.length - 1] || { key: "earth", pct: 20 };
  const gap = Math.abs(dominant.pct - deficient.pct);
  const avgDeviation = keys.reduce((acc, key) => acc + Math.abs((ratio[key] || 0) - ideal), 0) / keys.length;

  return {
    total,
    ratio,
    dominant: dominant.key,
    deficient: deficient.key,
    dominantPct: round(dominant.pct),
    deficientPct: round(deficient.pct),
    gap: round(gap),
    balanceScore: clamp(round(100 - avgDeviation * 2.2), 35, 97),
  };
}

function deriveTenGodStats(input) {
  const dict = input && typeof input === "object" ? input : {};
  const keys = Object.keys(dict);
  const total = Math.max(1, keys.reduce((acc, key) => acc + Number(dict[key] || 0), 0));
  const sorted = keys.slice().sort((a, b) => Number(dict[b] || 0) - Number(dict[a] || 0));
  const top = sorted.slice(0, 3).map((key) => {
    const count = Number(dict[key] || 0);
    return { key, count, pct: round((count / total) * 100) };
  });

  const emotionShare = Number(dict["식신"] || 0) + Number(dict["상관"] || 0);
  const realityShare = Number(dict["정재"] || 0) + Number(dict["편재"] || 0);
  const authorityShare = Number(dict["정관"] || 0) + Number(dict["편관"] || 0);
  const introspectShare = Number(dict["정인"] || 0) + Number(dict["편인"] || 0);

  return {
    total,
    top,
    emotionPct: round((emotionShare / total) * 100),
    realityPct: round((realityShare / total) * 100),
    authorityPct: round((authorityShare / total) * 100),
    introspectPct: round((introspectShare / total) * 100),
  };
}

function deriveMonthlyWindows(scores) {
  const rows = (Array.isArray(scores) ? scores : []).map((score, index) => ({ idx: index, month: MONTH_NAMES[index], score: Number(score || 0) }));
  const best = rows.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  const caution = rows.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const average = rows.length ? round(rows.reduce((acc, row) => acc + row.score, 0) / rows.length) : 0;
  return { best, caution, average };
}

function derivePrecisionMetrics({ taoPct, yeokmaPct, hwaPct, hasGwimun, tenGodStats, elementBalance, hasHour, tsCounts }) {
  const attraction = clamp(round(42 + taoPct * 0.36 + (tenGodStats.emotionPct || 0) * 0.12), 38, 98);
  const stabilityPenalty = yeokmaPct * 0.28 + (hasGwimun ? 12 : 0) + Math.max(0, (elementBalance.gap || 0) - 20) * 0.6;
  const stability = clamp(round(92 - stabilityPenalty + (tenGodStats.authorityPct || 0) * 0.08), 28, 96);
  const communication = clamp(round(48 + (tenGodStats.emotionPct || 0) * 0.22 + (tenGodStats.introspectPct || 0) * 0.12 - hwaPct * 0.08), 35, 97);
  const conflict = clamp(round(18 + yeokmaPct * 0.24 + hwaPct * 0.18 + (hasGwimun ? 16 : 0)), 5, 92);
  const confidence = clamp(round(62 + (hasHour ? 12 : -8) + Math.min(10, Object.keys(tsCounts || {}).length * 2)), 40, 97);
  return { attraction, stability, communication, conflict, confidence };
}

function deriveMarriageWindow(dominant, isStrong, dominantTenGod, yeokmaPct, taoPct) {
  let start = isStrong ? 28 : 26;
  let end = isStrong ? 34 : 32;
  if (dominant === "fire") { start -= 1; end -= 2; }
  if (dominant === "metal" || dominant === "water") { start += 2; end += 2; }
  if (dominantTenGod === "정관" || dominantTenGod === "정재") { start -= 1; end -= 1; }
  if (dominantTenGod === "상관" || dominantTenGod === "편재") { start += 1; end += 1; }
  if (yeokmaPct >= 60) { start += 2; end += 2; }
  else if (yeokmaPct >= 40) { start += 1; end += 1; }
  if (taoPct >= 70) start -= 1;
  start = clamp(start, 23, 40);
  end = clamp(Math.max(start + 3, end), 27, 44);
  return { start, end, label: `${start}~${end}세` };
}

function resolveYongshinElement(base, dominantEl) {
  const explicit = Array.isArray(base?.yongshin?.usefulElements) ? base.yongshin.usefulElements[0] : base?.yongshin?.usefulElement;
  const normalizedExplicit = normalizeElement(explicit);
  if (normalizedExplicit) return normalizedExplicit;
  if (base?.strength?.isStrong === true) {
    const strongToWeak = { wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth" };
    return strongToWeak[dominantEl] || dominantEl || "earth";
  }
  return dominantEl || "earth";
}

function deriveRisks(specialStars) {
  const taoPct = Number(specialStars?.tao || 0);
  const yeokmaPct = Number(specialStars?.yeokma || 0);
  const hwaPct = Number(specialStars?.hwa || 0);
  const hasGwimun = Boolean(specialStars?.gwimun);
  const risks = [];
  if (taoPct >= 60) risks.push(LOVE_RISK.high_tao);
  if (yeokmaPct >= 60) risks.push(LOVE_RISK.high_yeokma);
  if (hwaPct >= 60) risks.push(LOVE_RISK.high_hwa);
  if (hasGwimun) risks.push(LOVE_RISK.gwimunkwan);
  return risks;
}

export function buildLoveSecretReference(base = {}) {
  const dayMaster = normalizeGan(base?.core?.dayMaster) || "甲";
  const dayEl = GAN_EL[dayMaster] || normalizeElement(base?.elementBalance?.dominant) || "earth";
  const counts = normalizeCounts(base?.elementBalance?.counts);
  const elementBalance = deriveElementBalance(counts);
  const dominantEl = normalizeElement(base?.elementBalance?.dominant) || elementBalance.dominant;
  const tenGodCounts = base?.tenGods?.counts && typeof base.tenGods.counts === "object" ? base.tenGods.counts : {};
  const tenGodStats = deriveTenGodStats(tenGodCounts);
  const dominantTenGod = clean(base?.tenGods?.dominantTenGod) || clean(tenGodStats.top[0]?.key) || "식신";
  const yongshinEl = resolveYongshinElement(base, dominantEl);
  const monthlyScores = MONTHLY_LOVE_SCORE[dayMaster] || MONTHLY_LOVE_SCORE["甲"];
  const monthlyWindows = deriveMonthlyWindows(monthlyScores);
  const specialStars = {
    tao: Number(base?.specialStars?.tao || 0),
    yeokma: Number(base?.specialStars?.yeokma || 0),
    hwa: Number(base?.specialStars?.hwa || 0),
    gwimun: Boolean(base?.specialStars?.gwimun),
  };
  const precisionMetrics = derivePrecisionMetrics({
    taoPct: specialStars.tao,
    yeokmaPct: specialStars.yeokma,
    hwaPct: specialStars.hwa,
    hasGwimun: specialStars.gwimun,
    tenGodStats,
    elementBalance,
    hasHour: Boolean(clean(base?.pillars?.hour?.gan) && clean(base?.pillars?.hour?.zhi)),
    tsCounts: tenGodCounts,
  });
  const marriageWindow = deriveMarriageWindow(dominantEl, base?.strength?.isStrong === true, dominantTenGod, specialStars.yeokma, specialStars.tao);
  const identity = ILGAN_LOVE[dayMaster] || ILGAN_LOVE["甲"];
  const idealPartner = YONGSHIN_PARTNER[yongshinEl] || YONGSHIN_PARTNER.earth;
  const gaeun = GAEUN_LOVE[dayEl] || GAEUN_LOVE.earth;
  const risks = deriveRisks(specialStars);
  const strengthTip = base?.strength?.isStrong === true
    ? "신강 구조라 연애에서 내 의견과 에너지가 강하게 작동할 수 있으니, 상대가 주도할 공간을 남겨두는 운영이 중요합니다."
    : base?.strength?.isStrong === false
      ? "신약 구조라 상대에게 과도하게 맞추거나 의존하지 않도록 자기 기준을 먼저 세우는 것이 중요합니다."
      : "중화 구조로 균형감은 있지만 상황에 따라 감정 속도와 현실 판단의 간격을 조절해야 안정성이 올라갑니다.";

  return {
    dayMaster,
    dayMasterLabel: GAN_KO[dayMaster] || dayMaster,
    dayElement: dayEl,
    dayElementLabel: EL_KO[dayEl] || dayEl,
    identity,
    dominantElement: dominantEl,
    deficientElement: elementBalance.deficient,
    elementBalance,
    dominantTenGod,
    tenGodStats,
    yongshinElement: yongshinEl,
    yongshinElementLabel: EL_KO[yongshinEl] || yongshinEl,
    idealPartner,
    gaeun,
    specialStars,
    risks,
    monthlyScores,
    monthlyWindows,
    precisionMetrics,
    marriageWindow,
    marriageAgeLabel: `${marriageWindow.label} (용신 대운 초입이 최적)`,
    strengthTip,
    daeunFlow: DAEWUN_LOVE_FLOW[dominantEl] || DAEWUN_LOVE_FLOW.earth,
  };
}