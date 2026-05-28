"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchBillingFeaturePricing, runBillingCoinGate } from "@/app/_lib/billing-client";

const GOOGLE_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@500;600;700&family=Noto+Sans+KR:wght@400;500;700;800&display=swap');`;

// ─── RUNES DATA ────────────────────────────────────────────────────────────────
const RUNES_DATA = [
  { id: "fehu", name: "Fehu", symbol: "ᚠ", meaning_upright: "풍요, 번영, 가축과 재물. 새로운 시작을 위한 에너지가 충만합니다. 노력이 결실을 맺을 때입니다.", meaning_reversed: "재물의 손실, 탐욕, 집착. 물질적 집착을 내려놓고 진정한 가치를 돌아볼 시간입니다.", isSymmetric: false },
  { id: "uruz", name: "Uruz", symbol: "ᚢ", meaning_upright: "생명력, 야생의 힘, 건강. 내면의 원초적 에너지가 깨어나고 있습니다. 변화를 두려워 말아요.", meaning_reversed: "체력 저하, 기회 상실. 쉬지 않고 달려온 당신, 잠시 멈춰 회복하세요.", isSymmetric: false },
  { id: "thurisaz", name: "Thurisaz", symbol: "ᚦ", meaning_upright: "보호, 저항, 가시덤불. 강한 방어막이 당신을 지킵니다. 충동적 행동 전 한 번 더 생각하세요.", meaning_reversed: "무분별한 충동, 위험. 공격성을 내면으로 돌려 자기 파괴를 조심하세요.", isSymmetric: false },
  { id: "ansuz", name: "Ansuz", symbol: "ᚨ", meaning_upright: "신의 목소리, 소통, 지혜. 오딘의 숨결이 당신에게 닿습니다. 직관과 내면의 목소리에 귀 기울이세요.", meaning_reversed: "거짓말, 오해, 의사소통 단절. 말을 조심하고 속임수에 주의하세요.", isSymmetric: false },
  { id: "raidho", name: "Raidho", symbol: "ᚱ", meaning_upright: "여정, 올바른 행동, 리듬. 당신은 옳은 길 위에 있습니다. 우주의 흐름과 함께 움직이세요.", meaning_reversed: "여정의 방해, 통제 상실. 계획에 차질이 생길 수 있습니다. 유연성을 가지세요.", isSymmetric: false },
  { id: "kenaz", name: "Kenaz", symbol: "ᚲ", meaning_upright: "등불, 창의성, 영감. 어둠 속에서도 빛나는 창조의 불꽃. 예술과 지식이 당신을 이끕니다.", meaning_reversed: "창의성의 차단, 거짓 희망. 내면의 불꽃이 꺼져가고 있습니다. 새로운 영감을 찾으세요.", isSymmetric: false },
  { id: "gebo", name: "Gebo", symbol: "ᚷ", meaning_upright: "선물, 교환, 균형. 주고받음의 아름다운 순환. 진정한 관계는 균형 위에 서 있습니다.", meaning_reversed: null, isSymmetric: true },
  { id: "wunjo", name: "Wunjo", symbol: "ᚹ", meaning_upright: "기쁨, 조화, 행복. 오래 기다린 기쁨이 찾아옵니다. 축하받을 일이 가까이 있습니다.", meaning_reversed: "슬픔, 고통, 불조화. 일시적인 어둠입니다. 이 또한 지나가리니 희망을 잃지 마세요.", isSymmetric: false },
  { id: "hagalaz", name: "Hagalaz", symbol: "ᚺ", meaning_upright: "파괴적 변화, 우박, 시련. 갑작스러운 변화가 옵니다. 하지만 파괴 후에는 반드시 재건이 따릅니다.", meaning_reversed: null, isSymmetric: true },
  { id: "nauthiz", name: "Nauthiz", symbol: "ᚾ", meaning_upright: "필요, 결핍, 제약. 지금의 부족함이 미래의 강함을 만듭니다. 인내의 시간입니다.", meaning_reversed: "강박, 불안, 외부 압박. 욕망을 좇지 말고 진정으로 필요한 것을 분별하세요.", isSymmetric: false },
  { id: "isa", name: "Isa", symbol: "ᛁ", meaning_upright: "얼음, 정체, 내면 집중. 모든 것이 멈춘 듯 느껴집니다. 지금은 행동보다 성찰의 시간입니다.", meaning_reversed: null, isSymmetric: true },
  { id: "jera", name: "Jera", symbol: "ᛃ", meaning_upright: "수확, 순환, 정당한 보상. 심은 대로 거두는 시간입니다. 그동안의 노력이 결실을 맺습니다.", meaning_reversed: null, isSymmetric: true },
  { id: "eihwaz", name: "Eihwaz", symbol: "ᛇ", meaning_upright: "주목나무, 죽음과 재생, 인내. 끝과 시작의 경계에 서 있습니다. 변화를 두려워 말고 통과하세요.", meaning_reversed: "혼란, 약함, 방해. 현재의 장애물은 더 큰 성장을 위한 관문입니다.", isSymmetric: false },
  { id: "perthro", name: "Perthro", symbol: "ᛈ", meaning_upright: "신비, 운명의 컵, 잠재성. 운명의 주사위가 던져졌습니다. 비밀이 밝혀질 수도 있습니다.", meaning_reversed: "불확실성, 중독, 집착. 운명에 지나치게 의존하지 말고 스스로의 선택을 신뢰하세요.", isSymmetric: false },
  { id: "algiz", name: "Algiz", symbol: "ᛉ", meaning_upright: "보호, 사슴뿔, 신성한 방패. 강력한 수호 에너지가 주변을 감쌉니다. 직관을 믿으세요.", meaning_reversed: "무방비, 취약성. 지금은 경계가 필요합니다. 에너지 흡혈귀를 조심하세요.", isSymmetric: false },
  { id: "sowilo", name: "Sowilo", symbol: "ᛊ", meaning_upright: "태양, 승리, 생명력. 찬란한 태양 에너지가 당신 편입니다. 목표를 향해 당당히 나아가세요.", meaning_reversed: null, isSymmetric: true },
  { id: "tiwaz", name: "Tiwaz", symbol: "ᛏ", meaning_upright: "티르신, 정의, 희생. 올바름을 위해 기꺼이 희생하는 용기. 법과 정의가 당신 편입니다.", meaning_reversed: "불의, 배신, 에너지 고갈. 싸움에서 에너지가 소진되고 있습니다. 방향을 재검토하세요.", isSymmetric: false },
  { id: "berkano", name: "Berkano", symbol: "ᛒ", meaning_upright: "자작나무, 탄생, 모성. 새로운 생명과 시작. 성장과 치유의 에너지가 충만합니다.", meaning_reversed: "성장의 방해, 불임, 근심. 내면의 상처를 치유하지 않으면 새 시작이 어렵습니다.", isSymmetric: false },
  { id: "ehwaz", name: "Ehwaz", symbol: "ᛖ", meaning_upright: "말(馬), 파트너십, 이동. 신뢰할 수 있는 동반자와 함께 앞으로 나아갑니다. 협력이 핵심입니다.", meaning_reversed: "신뢰 부재, 배신, 좌절. 파트너십에 균열이 생겼습니다. 소통으로 다리를 놓으세요.", isSymmetric: false },
  { id: "mannaz", name: "Mannaz", symbol: "ᛗ", meaning_upright: "인류, 자아, 사회. 나는 누구인가? 공동체 안에서의 자신을 돌아보는 시간입니다.", meaning_reversed: "자만, 고립, 적대심. 타인과의 관계에서 자아를 잃지 마세요.", isSymmetric: false },
  { id: "laguz", name: "Laguz", symbol: "ᛚ", meaning_upright: "물, 직관, 무의식. 감정의 흐름에 몸을 맡기세요. 직관이 이성보다 강한 시간입니다.", meaning_reversed: "감정의 홍수, 두려움. 두려움이 판단을 흐립니다. 감정을 솔직하게 들여다보세요.", isSymmetric: false },
  { id: "ingwaz", name: "Ingwaz", symbol: "ᛜ", meaning_upright: "잉그신, 내면의 성장, 씨앗. 조용하지만 강력한 에너지가 내면에서 자라나고 있습니다.", meaning_reversed: null, isSymmetric: true },
  { id: "dagaz", name: "Dagaz", symbol: "ᛞ", meaning_upright: "새벽, 각성, 돌파구. 긴 밤이 지나고 새벽이 밝아옵니다. 획기적인 변화와 깨달음의 순간입니다.", meaning_reversed: null, isSymmetric: true },
  { id: "othalan", name: "Othalan", symbol: "ᛟ", meaning_upright: "조상, 유산, 고향. 뿌리를 돌아보세요. 가족과 전통에서 지혜와 힘을 얻습니다.", meaning_reversed: "유산 상실, 집착, 고집. 과거에 집착하면 미래로 나아갈 수 없습니다.", isSymmetric: false },
  { id: "wyrd", name: "Wyrd", symbol: "ᛟ", meaning_upright: "공백 룬, 알 수 없는 운명. 모든 것이 가능하고, 아무것도 정해지지 않았습니다. 당신의 운명은 당신이 만들어 갑니다.", meaning_reversed: null, isSymmetric: true },
];

// ─── useRuneDraw HOOK ──────────────────────────────────────────────────────────
function useRuneDraw() {
  const [drawnRunes, setDrawnRunes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [phase, setPhase] = useState("idle");

  const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const drawRunes = useCallback((count) => {
    setIsDrawing(true);
    setPhase("shaking");
    setDrawnRunes([]);

    setTimeout(() => {
      setPhase("drawing");
      const shuffled = shuffleArray(RUNES_DATA);
      const selected = shuffled.slice(0, count).map((rune) => ({
        ...rune,
        isReversed: rune.isSymmetric ? false : Math.random() < 0.5,
      }));
      setTimeout(() => {
        setDrawnRunes(selected);
        setPhase("revealed");
        setIsDrawing(false);
      }, 1200);
    }, 2000);
  }, []);

  const reset = useCallback(() => {
    setDrawnRunes([]);
    setPhase("idle");
    setIsDrawing(false);
  }, []);

  return { drawnRunes, isDrawing, phase, drawRunes, reset };
}

// ─── SPREAD LABELS ────────────────────────────────────────────────────────────
const SPREAD_OPTIONS = [
  { count: 1, rune: "ᚢ", name: "1-룬", desc: "오늘의 조언", cost: "30코인" },
  { count: 3, rune: "ᚦ", name: "3-룬 · 노른의 예언", desc: "과거 · 현재 · 미래", cost: "50코인" },
  { count: 5, rune: "ᛃ", name: "5-룬 · 심층 해석", desc: "성향 + 주의 포인트 포함", cost: "70코인" },
  { count: 12, rune: "ᛞ", name: "12-룬 · 연간 대점", desc: "1년 종합 흐름", cost: "120코인" },
];

const SPREAD_LABELS = {
  3: ["과거 · Urd", "현재 · Verdandi", "미래 · Skuld"],
  5: ["과거의 흐름", "현재의 상태", "다가올 미래", "타고난 성향", "조심해야 할 부분"],
  12: [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ],
};

const RUNE_BILLING_SUB_FEATURE_BY_SPREAD = Object.freeze({
  1: "spread-1",
  3: "spread-3",
  5: "spread-5",
  12: "spread-12",
});

const RUNE_FALLBACK_FEATURE_BY_SPREAD = Object.freeze({
  1: "stonehenge-runes-single",
  3: "stonehenge-runes-triad",
  5: "stonehenge-runes-deep",
  12: "stonehenge-runes-yearly",
});

const RUNE_PREPAID_MARKER_KEY = "cd_prepaid_rune_once";
const RUNE_PREPAID_MARKER_TTL_MS = 10 * 60 * 1000;

function consumeRunePrepaidMarker() {
  try {
    const raw = sessionStorage.getItem(RUNE_PREPAID_MARKER_KEY) || "";
    if (!raw) return false;
    sessionStorage.removeItem(RUNE_PREPAID_MARKER_KEY);
    const parsed = JSON.parse(raw);
    const markedAt = Number(parsed && parsed.at);
    if (!Number.isFinite(markedAt)) return false;
    return Date.now() - markedAt <= RUNE_PREPAID_MARKER_TTL_MS;
  } catch (_e) {
    try {
      sessionStorage.removeItem(RUNE_PREPAID_MARKER_KEY);
    } catch (_e2) {}
    return false;
  }
}

async function consumeRunePerUseCoin(spreadCount) {
  if (typeof window === "undefined") return false;
  if (typeof window.__cdIsAdminLikeUser === "function" && window.__cdIsAdminLikeUser()) return true;
  if (consumeRunePrepaidMarker()) return true;

  const subFeatureKey = RUNE_BILLING_SUB_FEATURE_BY_SPREAD[spreadCount] || "spread-3";
  const fallbackFeatureKey = RUNE_FALLBACK_FEATURE_BY_SPREAD[spreadCount] || "stonehenge-runes-triad";

  let requiredCoins = 0;
  try {
    const pricingResult = await fetchBillingFeaturePricing({
      categoryKey: "stonehenge-runes",
      subFeatureKey,
    });
    if (pricingResult.ok && pricingResult.data?.pricing) {
      requiredCoins = Number(pricingResult.data.pricing.cost || 0);
    }
  } catch (_e) {
    requiredCoins = 0;
  }

  let token = "";
  try {
    token = String(localStorage.getItem("fortune_auth_token") || "");
  } catch (_e) {}

  if (!token) {
    if (window.confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
      window.location.href = "/login?next=%2Foracle%2Frune";
    }
    return false;
  }

  const coinGateResult = await runBillingCoinGate({
    categoryKey: "stonehenge-runes",
    subFeatureKey,
    featureKey: fallbackFeatureKey,
    requestId: `rune:${subFeatureKey}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    forceDeduct: true,
  });

  if (!coinGateResult.ok) {
    const code = String(coinGateResult.error?.code || "").toUpperCase();
    if (code === "AUTH_REQUIRED") {
      if (window.confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
        window.location.href = "/login?next=%2Foracle%2Frune";
      }
      return false;
    }
    if (code === "INSUFFICIENT_COINS") {
      const costMessage = requiredCoins > 0 ? ` (필요 코인: ${requiredCoins})` : "";
      window.alert(`코인이 부족합니다. 코인을 충전한 뒤 다시 시도해 주세요.${costMessage}`);
      return false;
    }
    if (code === "PRICE_NOT_FOUND") {
      window.alert("룬점 가격표를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return false;
    }
    window.alert(coinGateResult.error?.message || "코인 차감에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    return false;
  }

  const remainingPoints = Number(
    coinGateResult.data?.balance
      ?? coinGateResult.data?.user?.points
      ?? NaN,
  );

  try {
    if (Number.isFinite(remainingPoints)) {
      localStorage.setItem("fortune_user_points", String(remainingPoints));
      const authRaw = localStorage.getItem("fortune_auth_user") || "";
      const authUser = authRaw ? JSON.parse(authRaw) : {};
      authUser.points = remainingPoints;
      localStorage.setItem("fortune_auth_user", JSON.stringify(authUser));
      if (typeof window.__cdSetGoldenBalance === "function") {
        window.__cdSetGoldenBalance(remainingPoints);
      }
    }
  } catch (_e2) {}

  return true;
}

const RUNE_GUIDE = {
  fehu: {
    axis: "가치와 자원 순환",
    coreUpright: "들어오는 자원보다 흐르게 만드는 운용 능력이 성패를 가르는 시기입니다.",
    coreReversed: "수입보다 누수와 집착이 커지기 쉬워 자원 흐름 점검이 우선입니다.",
    relationshipUpright: "관계에서 먼저 베풀되 경계를 분명히 하면 신뢰가 커집니다.",
    relationshipReversed: "물질·조건 중심 대화가 감정적 거리감을 만들 수 있습니다.",
    workUpright: "성과 보상, 협상, 가격 재정의에 유리한 흐름입니다.",
    workReversed: "계약·결제·지출 항목을 세부적으로 재검토해야 손실을 막을 수 있습니다.",
    cautionUpright: "단기 성과에 취해 장기 구조를 놓치지 마세요.",
    cautionReversed: "불안 때문에 기회를 과소평가하거나, 반대로 무리수 투자에 치우치지 마세요.",
    actionUpright: ["현금흐름표 업데이트", "우선순위 지출 3개만 유지", "협상 조건 문서화"],
    actionReversed: ["고정비 정리", "미수금·미납금 정리", "소비 트리거 기록"],
    mantra: "나는 가치를 모으는 사람을 넘어, 가치를 순환시키는 사람이 된다.",
  },
  uruz: {
    axis: "생명력과 회복 탄성",
    coreUpright: "내면의 원초적 추진력이 올라오며 몸과 의지가 동시에 회복됩니다.",
    coreReversed: "과부하 누적으로 체력·집중력이 끊기기 쉬운 구간입니다.",
    relationshipUpright: "솔직하고 단단한 태도가 관계의 신뢰를 끌어올립니다.",
    relationshipReversed: "피곤함이 예민함으로 나타나 말이 날카롭게 들릴 수 있습니다.",
    workUpright: "초기 돌파, 재시작, 체력 기반 프로젝트 추진에 강합니다.",
    workReversed: "무리한 일정은 결과보다 번아웃을 먼저 부를 가능성이 큽니다.",
    cautionUpright: "힘이 붙을수록 페이스 조절을 의식하세요.",
    cautionReversed: "의욕 저하를 의지력 부족으로 오해하지 말고 회복부터 설계하세요.",
    actionUpright: ["수면 리듬 고정", "핵심 과제 오전 배치", "가벼운 근력 루틴"],
    actionReversed: ["일정 20% 감축", "회복 시간 블록", "카페인·야근 제한"],
    mantra: "내 힘은 속도가 아니라 지속성에서 완성된다.",
  },
  thurisaz: {
    axis: "경계와 방어 지혜",
    coreUpright: "지금은 밀어붙임보다 방어선 설정이 더 큰 성과를 만듭니다.",
    coreReversed: "충동 반응이 갈등을 키울 수 있어 반 박자 멈춤이 필요합니다.",
    relationshipUpright: "관계의 기준을 분명히 할수록 건강한 거리감이 생깁니다.",
    relationshipReversed: "작은 자극에도 과잉 방어 혹은 공격 반응이 나올 수 있습니다.",
    workUpright: "리스크 차단, 권한 경계 정리, 승인 체계 재설계에 유리합니다.",
    workReversed: "성급한 의사결정으로 불필요한 대립을 만들 가능성이 있습니다.",
    cautionUpright: "방어는 고립이 아니라 전략적 선택이어야 합니다.",
    cautionReversed: "자존심을 원칙으로 착각하지 마세요.",
    actionUpright: ["거절 문장 미리 준비", "요청 대응 기준표 작성", "갈등 기록 후 대응"],
    actionReversed: ["즉답 금지 10분 규칙", "감정 메모 후 회신", "권한 밖 일 위임"],
    mantra: "나는 필요한 경계를 세우고, 불필요한 전쟁을 멈춘다.",
  },
  ansuz: {
    axis: "메시지와 통찰",
    coreUpright: "중요한 신호가 말, 문서, 우연한 대화 형태로 들어오는 시기입니다.",
    coreReversed: "정보 왜곡과 오해가 늘어 의도 확인이 필수입니다.",
    relationshipUpright: "듣는 태도가 관계의 방향을 바꿉니다.",
    relationshipReversed: "추측성 해석이 불신을 키울 수 있습니다.",
    workUpright: "프레젠테이션, 협업 문서, 인터뷰 등 커뮤니케이션 업무에 강합니다.",
    workReversed: "핵심 메시지가 분산되어 전달력이 떨어질 수 있습니다.",
    cautionUpright: "정보량보다 맥락 정리가 우선입니다.",
    cautionReversed: "애매한 표현을 방치하면 손실이 커집니다.",
    actionUpright: ["핵심 문장 1개로 요약", "회의 후 합의사항 기록", "질문으로 의도 확인"],
    actionReversed: ["메신저 대신 통화", "오해 가능 문장 수정", "증빙 링크 첨부"],
    mantra: "나는 진실한 말과 명료한 구조로 길을 연다.",
  },
  raidho: {
    axis: "이동과 정렬",
    coreUpright: "외부 이동과 내부 리듬이 맞을 때 일이 빠르게 정렬됩니다.",
    coreReversed: "방향은 있는데 리듬이 깨져 일정 지연이 반복될 수 있습니다.",
    relationshipUpright: "같은 목적지를 공유하면 관계 속도도 안정됩니다.",
    relationshipReversed: "속도 차이로 인한 피로감이 생길 수 있습니다.",
    workUpright: "출장, 전환, 이직 탐색, 프로젝트 전개에 좋은 신호입니다.",
    workReversed: "계획 대비 실행 불일치가 누적되기 쉽습니다.",
    cautionUpright: "빠름보다 정확한 경로를 우선하세요.",
    cautionReversed: "지연의 원인을 외부 탓으로만 두지 마세요.",
    actionUpright: ["주간 동선 최적화", "일정 버퍼 15%", "이동 중 정리 루틴"],
    actionReversed: ["우선순위 재배치", "중단 과제 정리", "필수 일정만 확정"],
    mantra: "나는 내 길의 속도와 방향을 스스로 조율한다.",
  },
  kenaz: {
    axis: "통찰의 불꽃",
    coreUpright: "막혔던 문제에 해법의 빛이 들어오는 구간입니다.",
    coreReversed: "영감 고갈로 시야가 좁아질 수 있으나, 휴식 후 재점화가 가능합니다.",
    relationshipUpright: "솔직한 표현이 관계의 온기를 회복합니다.",
    relationshipReversed: "냉소적 말투가 의도보다 크게 상처를 줄 수 있습니다.",
    workUpright: "기획, 콘텐츠, 디자인, 문제해결 업무에서 성과가 납니다.",
    workReversed: "완벽주의가 시작 자체를 늦출 수 있습니다.",
    cautionUpright: "영감이 왔을 때 즉시 기록하세요.",
    cautionReversed: "스스로를 무능하다고 단정하지 마세요.",
    actionUpright: ["아이디어 10분 스케치", "프로토타입 우선", "피드백 1회 반영"],
    actionReversed: ["작업 범위 축소", "영감 입력 시간 확보", "완성 기준 낮추기"],
    mantra: "작은 불꽃도 지키면 길을 밝히는 횃불이 된다.",
  },
  gebo: {
    axis: "교환과 상호성",
    coreUpright: "주고받는 균형이 맞을 때 운이 빠르게 열립니다.",
    coreReversed: "비대칭 교환을 오래 두면 피로가 누적됩니다.",
    relationshipUpright: "감정·시간·에너지의 균형이 관계를 깊게 만듭니다.",
    relationshipReversed: "보상 없는 헌신이 번아웃을 부를 수 있습니다.",
    workUpright: "협업, 제휴, 계약의 윈윈 구조를 설계하기 좋습니다.",
    workReversed: "역할·보상 정의가 불명확하면 분쟁이 생깁니다.",
    cautionUpright: "호의와 책임의 경계를 명확히 하세요.",
    cautionReversed: "불균형을 미덕으로 포장하지 마세요.",
    actionUpright: ["역할표 합의", "보상 기준 명시", "상호 피드백"],
    actionReversed: ["일방 헌신 중단", "조건 재협상", "도움 요청 연습"],
    mantra: "균형 있는 교환이 오래 가는 풍요를 만든다.",
  },
  wunjo: {
    axis: "기쁨과 조화",
    coreUpright: "긴장 완화와 관계 회복이 시작되는 밝은 흐름입니다.",
    coreReversed: "기대와 현실 차이로 실망이 커질 수 있습니다.",
    relationshipUpright: "감사 표현이 친밀도를 크게 높입니다.",
    relationshipReversed: "비교와 서운함이 대화를 무겁게 만들 수 있습니다.",
    workUpright: "팀 분위기 개선과 성과 공유가 동기 부여를 만듭니다.",
    workReversed: "표면적 낙관으로 문제를 덮지 않도록 주의가 필요합니다.",
    cautionUpright: "기쁨은 소비가 아니라 회복 에너지로 쓰세요.",
    cautionReversed: "감정 저점을 방치하지 말고 언어화하세요.",
    actionUpright: ["감사 메시지 1건", "작은 성취 축하", "휴식 일정 고정"],
    actionReversed: ["비교 줄이기", "감정 일기", "관계 오해 바로잡기"],
    mantra: "나는 기쁨을 허락하고, 조화를 선택한다.",
  },
  hagalaz: {
    axis: "파열과 재구성",
    coreUpright: "예상치 못한 변화가 낡은 구조를 걷어내는 전환점입니다.",
    coreReversed: "변화를 통제하려는 저항이 피로를 키울 수 있습니다.",
    relationshipUpright: "불편한 진실을 마주해야 관계가 새 틀로 재편됩니다.",
    relationshipReversed: "감정 폭발 후 후속 수습이 늦어질 수 있습니다.",
    workUpright: "리셋, 구조조정, 우선순위 재설계에 좋은 시기입니다.",
    workReversed: "혼란 속 즉흥 대응이 연쇄 문제를 만들 수 있습니다.",
    cautionUpright: "무너짐을 실패로만 해석하지 마세요.",
    cautionReversed: "변화 회피가 더 큰 비용으로 돌아올 수 있습니다.",
    actionUpright: ["버릴 항목 3개 결정", "핵심 시스템 재구축", "백업 플랜 수립"],
    actionReversed: ["감정적 결정 보류", "리스크 우선 차단", "재정비 기간 확보"],
    mantra: "무너진 자리 위에 더 단단한 질서를 세운다.",
  },
  nauthiz: {
    axis: "결핍을 통한 정련",
    coreUpright: "지금의 제약은 핵심 욕구를 분별하게 하는 훈련입니다.",
    coreReversed: "강박적 통제가 오히려 에너지 누수를 키울 수 있습니다.",
    relationshipUpright: "요구보다 필요를 솔직히 말하면 갈등이 줄어듭니다.",
    relationshipReversed: "결핍 불안이 상대에게 투사될 수 있습니다.",
    workUpright: "제약 조건 하에서 효율 설계 능력이 빛납니다.",
    workReversed: "자원 부족 핑계로 실행을 멈추지 않도록 주의하세요.",
    cautionUpright: "절약은 축소가 아니라 선택입니다.",
    cautionReversed: "불안 완화용 과소비를 경계하세요.",
    actionUpright: ["필수·선택 분리", "시간 블록 최소화", "작은 실행 유지"],
    actionReversed: ["강박 루틴 완화", "호흡·휴식 루틴", "욕구 기록"],
    mantra: "결핍은 나를 약하게 하지 않고, 선명하게 만든다.",
  },
  isa: {
    axis: "정지와 응시",
    coreUpright: "멈춤은 지연이 아니라 오판을 막는 전략적 정지입니다.",
    coreReversed: "정체를 자기부정으로 해석하면 회복이 늦어집니다.",
    relationshipUpright: "거리두기가 필요한 시점이며 감정 해동이 선행되어야 합니다.",
    relationshipReversed: "침묵이 단절로 오해받기 쉬우니 최소 소통이 필요합니다.",
    workUpright: "검토, 감사, 정리, 문서화 작업에서 성과가 납니다.",
    workReversed: "결정 회피가 기회비용을 키울 수 있습니다.",
    cautionUpright: "정지 기간의 종료 시점을 미리 정하세요.",
    cautionReversed: "냉소로 감정을 얼리지 마세요.",
    actionUpright: ["의사결정 기준 정리", "중간점검", "침착한 보류"],
    actionReversed: ["작은 결정 1개 실행", "상담·피드백 수집", "고립 해제"],
    mantra: "멈춤 속에서 나는 다음 방향을 더 정확히 본다.",
  },
  jera: {
    axis: "순환과 수확",
    coreUpright: "시간을 들인 것이 순서대로 결실로 돌아오는 흐름입니다.",
    coreReversed: "성과 지연이 있어도 씨앗이 사라진 것은 아닙니다.",
    relationshipUpright: "꾸준한 태도가 신뢰의 복리 효과를 만듭니다.",
    relationshipReversed: "즉각적 반응 요구가 관계 피로를 키울 수 있습니다.",
    workUpright: "장기 프로젝트, 반복 개선, 축적형 업무에 매우 유리합니다.",
    workReversed: "성급한 결과 집착이 품질을 떨어뜨릴 수 있습니다.",
    cautionUpright: "수확기의 교만을 경계하세요.",
    cautionReversed: "늦는 것을 실패로 오해하지 마세요.",
    actionUpright: ["진행률 기록", "반복 루틴 유지", "작은 성과 축적"],
    actionReversed: ["기한 재설정", "성장 지표 분리", "조급함 관리"],
    mantra: "나는 때를 믿고, 오늘의 노력을 놓치지 않는다.",
  },
  eihwaz: {
    axis: "전환 통로와 인내",
    coreUpright: "끝과 시작 사이를 건너는 과도기적 통로에 들어왔습니다.",
    coreReversed: "불확실성 공포가 선택을 지연시킬 수 있습니다.",
    relationshipUpright: "관계의 낡은 패턴을 벗기고 새 합의를 만들 시기입니다.",
    relationshipReversed: "미해결 상처가 현재 갈등에 덧씌워질 수 있습니다.",
    workUpright: "커리어 전환, 직무 변경, 전략 피벗에 강한 보호 신호입니다.",
    workReversed: "중간 포기 유혹이 강해질 수 있어 버티는 기술이 필요합니다.",
    cautionUpright: "성급한 결론보다 과정의 정직함을 지키세요.",
    cautionReversed: "불안을 이유로 무기한 미루지 마세요.",
    actionUpright: ["전환 로드맵 작성", "리스크 분산", "주간 체크포인트"],
    actionReversed: ["결정 마감일 설정", "미련 정리", "외부 멘토 상담"],
    mantra: "나는 과도기를 통과하며 더 넓은 형태로 다시 선다.",
  },
  perthro: {
    axis: "운명 변수와 잠재성",
    coreUpright: "보이지 않던 정보가 드러나며 선택지가 다시 열립니다.",
    coreReversed: "우연에 과도하게 기대면 주도권이 약해질 수 있습니다.",
    relationshipUpright: "관계의 숨은 욕구를 인정할 때 진짜 대화가 시작됩니다.",
    relationshipReversed: "비밀·회피·애매함이 신뢰를 깎을 수 있습니다.",
    workUpright: "탐색형 프로젝트, 리서치, 실험 전략에 유리합니다.",
    workReversed: "확률 게임식 결정이 손실을 키울 수 있습니다.",
    cautionUpright: "기회는 준비된 구조 위에서만 성과가 됩니다.",
    cautionReversed: "도박적 선택을 직감이라 부르지 마세요.",
    actionUpright: ["가설 2개 실험", "정보 비대칭 해소", "옵션 비교표 작성"],
    actionReversed: ["근거 없는 베팅 중단", "검증 루프 구축", "리스크 한도 설정"],
    mantra: "나는 우연을 기다리지 않고 가능성을 설계한다.",
  },
  algiz: {
    axis: "보호와 고감도 직감",
    coreUpright: "외부 위험을 감지하고 회피하는 감각이 강해집니다.",
    coreReversed: "경계 붕괴 혹은 과민 경계가 모두 문제를 만들 수 있습니다.",
    relationshipUpright: "안전감 있는 관계에서 감정 회복이 빠르게 일어납니다.",
    relationshipReversed: "의심이 커져 가까운 사람까지 거리 둘 수 있습니다.",
    workUpright: "리스크 관리, 보안, 품질 점검, 백업 전략에 강합니다.",
    workReversed: "보호 장치 미비로 작은 이슈가 크게 번질 수 있습니다.",
    cautionUpright: "모든 신호에 반응하지 말고 핵심만 선택하세요.",
    cautionReversed: "안전장치를 귀찮다고 생략하지 마세요.",
    actionUpright: ["데이터 백업", "경계 시간 확보", "정보 접근권 정리"],
    actionReversed: ["보안 점검", "신뢰 범위 재설정", "소진 관계 정리"],
    mantra: "나는 나를 지키는 선택으로 더 멀리 간다.",
  },
  sowilo: {
    axis: "승리와 선명한 방향",
    coreUpright: "핵심 목표에 에너지가 모이며 추진력이 크게 상승합니다.",
    coreReversed: "과열된 자신감이 주변 협업을 약화시킬 수 있습니다.",
    relationshipUpright: "당당한 진심이 매력으로 작동합니다.",
    relationshipReversed: "자기 확신이 타인 배려 부족으로 보일 수 있습니다.",
    workUpright: "리더십, 발표, 결단, 마무리 단계에서 강력한 성과 운입니다.",
    workReversed: "속도전에 치우치면 디테일 누락이 생깁니다.",
    cautionUpright: "빛이 강할수록 그림자 관리가 필요합니다.",
    cautionReversed: "성과 조급함이 팀 리듬을 깨지 않게 하세요.",
    actionUpright: ["핵심 목표 1개 집중", "마감 선언", "성과 공유"],
    actionReversed: ["검토 단계 추가", "협업 체크인", "과속 방지"],
    mantra: "나는 빛을 좇는 것이 아니라, 빛을 운용한다.",
  },
  tiwaz: {
    axis: "정의와 원칙적 전진",
    coreUpright: "원칙을 지키는 선택이 장기적으로 가장 큰 이익이 됩니다.",
    coreReversed: "불공정감이 분노로 번지면 판단력이 흐려질 수 있습니다.",
    relationshipUpright: "약속을 지키는 태도가 신뢰의 핵심 지표가 됩니다.",
    relationshipReversed: "한쪽의 희생이 누적되면 관계 균형이 무너집니다.",
    workUpright: "법적·제도적 기준이 중요한 업무에서 강한 보호를 받습니다.",
    workReversed: "승부욕이 전략보다 앞서면 손실 가능성이 커집니다.",
    cautionUpright: "정의감과 완고함을 구분하세요.",
    cautionReversed: "억울함을 즉시 보복으로 연결하지 마세요.",
    actionUpright: ["원칙 문서화", "약속 이행률 점검", "공정 기준 합의"],
    actionReversed: ["감정 냉각", "증거 기반 대응", "장기전 전략"],
    mantra: "나는 원칙을 통해 승리하고, 승리로 원칙을 증명한다.",
  },
  berkano: {
    axis: "성장과 돌봄의 탄생",
    coreUpright: "새 프로젝트와 관계가 부드럽게 싹트는 출발점입니다.",
    coreReversed: "성장 속도를 재촉하면 뿌리가 약해질 수 있습니다.",
    relationshipUpright: "돌봄과 배려의 언어가 관계를 회복시킵니다.",
    relationshipReversed: "과잉보호 또는 통제가 갈등 원인이 될 수 있습니다.",
    workUpright: "신규 기획, 브랜딩, 교육, 양성형 업무에 적합합니다.",
    workReversed: "초기 셋업 부족이 반복 시행착오를 만들 수 있습니다.",
    cautionUpright: "성장은 속도보다 환경이 결정합니다.",
    cautionReversed: "나를 돌보지 않은 채 타인만 돌보지 마세요.",
    actionUpright: ["성장 환경 정비", "주 1회 점검", "작은 성취 기록"],
    actionReversed: ["기초 재정비", "경계 설정", "회복 우선"],
    mantra: "나는 나와 세계를 돌보며 건강한 성장을 선택한다.",
  },
  ehwaz: {
    axis: "협력과 동행",
    coreUpright: "신뢰 기반 파트너십이 성과를 배가시키는 시기입니다.",
    coreReversed: "호흡 불일치가 진행을 늦추므로 역할 재조정이 필요합니다.",
    relationshipUpright: "함께 움직일수록 감정 안정과 유대감이 커집니다.",
    relationshipReversed: "약속 미이행이 신뢰 균열로 이어질 수 있습니다.",
    workUpright: "공동 프로젝트, 팀 빌딩, 협업 체계 개선에 강합니다.",
    workReversed: "혼자 해결하려는 태도가 더 큰 지연을 부를 수 있습니다.",
    cautionUpright: "좋은 파트너십은 명확한 합의에서 시작됩니다.",
    cautionReversed: "침묵 속 불만을 장기 방치하지 마세요.",
    actionUpright: ["역할 명문화", "주간 싱크", "의사결정 창구 단일화"],
    actionReversed: ["협업 규칙 재정의", "마감 재합의", "기대치 맞추기"],
    mantra: "함께 가는 힘은 혼자 빠른 힘보다 멀리 간다.",
  },
  mannaz: {
    axis: "자아와 사회적 거울",
    coreUpright: "타인과의 상호작용 속에서 자신의 본질이 더 선명해집니다.",
    coreReversed: "자기방어적 태도가 고립감을 키울 수 있습니다.",
    relationshipUpright: "서로의 다름을 인정할 때 건강한 연결이 됩니다.",
    relationshipReversed: "자존심 경쟁이 공감 능력을 떨어뜨릴 수 있습니다.",
    workUpright: "네트워킹, 조율, 리더 보좌, 코칭 역할에 적합합니다.",
    workReversed: "평판 불안으로 과잉 눈치 보기 패턴이 나타날 수 있습니다.",
    cautionUpright: "타인의 시선과 자기 기준을 분리하세요.",
    cautionReversed: "고립이 안정이라고 착각하지 마세요.",
    actionUpright: ["피드백 1건 수집", "자기 기준 3개 작성", "협업 맥락 이해"],
    actionReversed: ["방어적 반응 멈춤", "자기비난 줄이기", "지원 요청"],
    mantra: "나는 관계 속에서 흔들리지 않는 나를 세운다.",
  },
  laguz: {
    axis: "감정 흐름과 직감",
    coreUpright: "감정과 무의식의 신호가 판단을 보조하는 시기입니다.",
    coreReversed: "감정 과잉이나 회피로 현실 판단이 흔들릴 수 있습니다.",
    relationshipUpright: "감정을 숨기지 않을수록 관계가 깊어집니다.",
    relationshipReversed: "감정 파동이 큰 날에는 결론보다 안정이 먼저입니다.",
    workUpright: "브랜딩, 예술, 상담, 사용자 감성 이해 업무에 강합니다.",
    workReversed: "기분 기반 의사결정이 품질 편차를 만들 수 있습니다.",
    cautionUpright: "직감은 기록하고 검증하세요.",
    cautionReversed: "감정 억압과 감정 폭발 사이 균형을 찾으세요.",
    actionUpright: ["감정 로그 기록", "직감 근거 확인", "수분·휴식 관리"],
    actionReversed: ["충동 결정 보류", "호흡 루틴", "현실 체크리스트"],
    mantra: "나는 감정을 두려워하지 않고 흐름으로 다룬다.",
  },
  ingwaz: {
    axis: "내적 응축과 잠복 성장",
    coreUpright: "겉으로 조용해 보여도 내부에서는 중요한 성장이 진행 중입니다.",
    coreReversed: "결과가 보이지 않는 기간의 초조함이 커질 수 있습니다.",
    relationshipUpright: "서두르지 않는 신뢰가 관계를 단단히 만듭니다.",
    relationshipReversed: "확답 압박이 오히려 관계의 잠재성을 줄입니다.",
    workUpright: "준비기·연구기·내실 다지기 프로젝트에 최적입니다.",
    workReversed: "출시·발표 타이밍을 지나치게 늦추지 마세요.",
    cautionUpright: "보이지 않는 성장도 성장입니다.",
    cautionReversed: "완벽한 타이밍만 기다리다 기회를 놓치지 마세요.",
    actionUpright: ["내실 작업 집중", "초안 완성", "핵심 지표 축적"],
    actionReversed: ["출시 기준 설정", "작은 공개", "결정 지연 중단"],
    mantra: "나는 보이지 않는 시간에도 확실히 자라고 있다.",
  },
  dagaz: {
    axis: "각성과 전환점",
    coreUpright: "긴 정체를 깨고 새 국면으로 넘어가는 문이 열립니다.",
    coreReversed: "변화 직전 불안이 커져 스스로 브레이크를 걸 수 있습니다.",
    relationshipUpright: "오해가 풀리고 관계가 새 단계로 진입합니다.",
    relationshipReversed: "변화 속도를 맞추지 못하면 혼선이 생길 수 있습니다.",
    workUpright: "피벗, 런칭, 전환 발표, 리브랜딩에 강한 신호입니다.",
    workReversed: "변화 관리 계획이 없으면 반작용이 커질 수 있습니다.",
    cautionUpright: "기회는 짧게 열릴 수 있으니 즉시 실행하세요.",
    cautionReversed: "과거 방식에 집착하면 전환 비용이 증가합니다.",
    actionUpright: ["결정 즉시 실행", "전환 커뮤니케이션", "실험 결과 반영"],
    actionReversed: ["변화 계획 문서화", "리스크 공지", "지원 체계 확보"],
    mantra: "나는 새벽의 문턱을 넘어 새로운 질서로 들어간다.",
  },
  othalan: {
    axis: "뿌리와 유산",
    coreUpright: "자신의 기반, 가문, 전통, 축적 자산이 힘이 되는 시기입니다.",
    coreReversed: "과거 집착이나 소유 갈등이 현재 선택을 묶을 수 있습니다.",
    relationshipUpright: "가치관 공유가 관계 안정의 핵심이 됩니다.",
    relationshipReversed: "가족·배경 이슈가 감정 갈등으로 번질 수 있습니다.",
    workUpright: "브랜드 자산, 장기 포트폴리오, 레거시 정비에 유리합니다.",
    workReversed: "낡은 방식 고수로 혁신 타이밍을 놓칠 수 있습니다.",
    cautionUpright: "전통은 방향, 족쇄가 아닙니다.",
    cautionReversed: "소유 불안으로 관계를 통제하지 마세요.",
    actionUpright: ["핵심 자산 목록화", "기반 강화", "장기 전략 수립"],
    actionReversed: ["불필요한 집착 정리", "가치관 대화", "새 규칙 도입"],
    mantra: "나는 뿌리를 존중하되, 뿌리에 묶이지 않는다.",
  },
  wyrd: {
    axis: "미정의 가능성",
    coreUpright: "아직 결정되지 않은 영역이 커서 자유와 책임이 동시에 열립니다.",
    coreReversed: "불확실성 회피로 타이밍을 놓칠 수 있습니다.",
    relationshipUpright: "관계를 규정하기보다 관찰하면 진짜 방향이 보입니다.",
    relationshipReversed: "애매함 방치가 오해를 키울 수 있습니다.",
    workUpright: "정해진 답이 없는 문제에서 창의적 해법이 나옵니다.",
    workReversed: "결정 유예가 누적되면 기회 창이 닫힐 수 있습니다.",
    cautionUpright: "미정은 혼란이 아니라 설계 여백입니다.",
    cautionReversed: "운명 탓으로 선택 책임을 회피하지 마세요.",
    actionUpright: ["가설 중심 실행", "선택 기준 정의", "짧은 실험 반복"],
    actionReversed: ["결정 기한 설정", "불확실성 공개", "우선순위 확정"],
    mantra: "비어 있는 칸은 두려움이 아니라 창조의 자리다.",
  },
};

const DEFAULT_RUNE_GUIDE = {
  axis: "룬 상징 해석",
  coreUpright: "상징의 흐름을 따라 현재 상황을 재정렬할 시기입니다.",
  coreReversed: "해석의 속도를 늦추고 핵심 리스크를 점검해야 합니다.",
  relationshipUpright: "진심과 경계를 함께 지키면 관계가 안정됩니다.",
  relationshipReversed: "오해 가능성이 높아 명료한 소통이 필요합니다.",
  workUpright: "우선순위가 명확할수록 성과가 커집니다.",
  workReversed: "세부 계획 보완이 필요합니다.",
  cautionUpright: "기회와 과열을 구분하세요.",
  cautionReversed: "불안이 결정을 대신하지 않도록 하세요.",
  actionUpright: ["핵심 과제 정리", "리듬 유지", "의도 확인"],
  actionReversed: ["속도 조절", "리스크 점검", "우선순위 재설정"],
  mantra: "나는 상징을 읽고 현실에서 실천으로 옮긴다.",
};

function getMeaningText(rune) {
  if (rune.isReversed && rune.meaning_reversed) return rune.meaning_reversed;
  return rune.meaning_upright;
}

function getRuneGuide(runeId) {
  return RUNE_GUIDE[runeId] || DEFAULT_RUNE_GUIDE;
}

function getDetailedReading(rune, positionLabel) {
  const guide = getRuneGuide(rune.id);
  const isReversed = rune.isReversed && !rune.isSymmetric;
  const actionItems = isReversed ? guide.actionReversed : guide.actionUpright;

  return {
    axis: guide.axis,
    summary: getMeaningText(rune),
    sections: [
      { title: "핵심 흐름", text: isReversed ? guide.coreReversed : guide.coreUpright },
      { title: "관계 · 감정", text: isReversed ? guide.relationshipReversed : guide.relationshipUpright },
      { title: "일 · 재물", text: isReversed ? guide.workReversed : guide.workUpright },
      { title: "주의 신호", text: isReversed ? guide.cautionReversed : guide.cautionUpright },
    ],
    actionItems,
    mantra: guide.mantra,
    positionNote: positionLabel ? `${positionLabel} 자리의 의미를 함께 읽으면 정확도가 높아집니다.` : null,
  };
}

function getQuarterTone(score) {
  if (score >= 2) return "강한 확장";
  if (score === 1) return "완만한 전진";
  if (score === 0) return "균형 조율";
  if (score === -1) return "신중한 점검";
  return "리스크 관리";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StonehengeRune() {
  const { drawnRunes, isDrawing, phase, drawRunes, reset } = useRuneDraw();
  const [spread, setSpread] = useState(null);
  const [selectedRune, setSelectedRune] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (phase === "revealed" && drawnRunes.length > 0) {
      drawnRunes.forEach((_, i) => {
        setTimeout(() => {
          setVisibleCards((prev) => [...prev, i]);
        }, i * 400 + 200);
      });
    }
    if (phase === "idle" || phase === "shaking") {
      setVisibleCards([]);
    }
  }, [phase, drawnRunes]);

  const handleSpreadSelect = (n) => {
    setSpread(n);
    setSelectedRune(null);
    reset();
  };

  const handleDraw = async () => {
    if (!spread || isDrawing || isPaying) return;
    setIsPaying(true);
    const paid = await consumeRunePerUseCoin(spread);
    setIsPaying(false);
    if (!paid) return;
    setSelectedRune(null);
    drawRunes(spread);
  };

  const openRuneAt = useCallback((index) => {
    if (index < 0 || index >= drawnRunes.length) return;
    setSelectedRune({ ...drawnRunes[index], index });
  }, [drawnRunes]);

  const closeRuneDetail = useCallback(() => {
    setSelectedRune(null);
  }, []);

  const showPrevRune = useCallback(() => {
    if (!selectedRune) return;
    openRuneAt(selectedRune.index - 1);
  }, [selectedRune, openRuneAt]);

  const showNextRune = useCallback(() => {
    if (!selectedRune) return;
    openRuneAt(selectedRune.index + 1);
  }, [selectedRune, openRuneAt]);

  const getSpreadInsight = () => {
    if (!drawnRunes.length) return null;

    const describeRuneInContext = (rune, label) => {
      const guide = getRuneGuide(rune.id);
      const isReversed = rune.isReversed && !rune.isSymmetric;
      const tone = isReversed ? "역방향" : "정방향";
      const summary = isReversed ? guide.coreReversed : guide.coreUpright;
      return `${label}: ${rune.name} (${tone}) · ${summary}`;
    };

    const reversedCount = drawnRunes.filter((rune) => rune.isReversed && !rune.isSymmetric).length;
    const uprightCount = drawnRunes.length - reversedCount;

    if (spread === 1 && drawnRunes.length === 1) {
      const rune = drawnRunes[0];
      const guide = getRuneGuide(rune.id);
      const isReversed = rune.isReversed && !rune.isSymmetric;
      const actions = isReversed ? guide.actionReversed : guide.actionUpright;

      return {
        title: "1-룬 정밀 해석",
        points: [
          `핵심 축: ${guide.axis}`,
          describeRuneInContext(rune, "오늘의 중심 메시지"),
          `실천 포인트: ${actions.join(" · ")}`,
          `주의 신호: ${isReversed ? guide.cautionReversed : guide.cautionUpright}`,
        ],
      };
    }

    if (spread === 3 && drawnRunes.length === 3) {
      const axisFlow = drawnRunes
        .map((rune) => getRuneGuide(rune.id).axis)
        .filter((axis, idx, arr) => arr.indexOf(axis) === idx)
        .slice(0, 3)
        .join(" → ");

      return {
        title: "3-룬 노른의 흐름 해석",
        points: [
          describeRuneInContext(drawnRunes[0], "과거 · Urd"),
          describeRuneInContext(drawnRunes[1], "현재 · Verdandi"),
          describeRuneInContext(drawnRunes[2], "미래 · Skuld"),
          `흐름 구조: ${axisFlow}`,
          `균형 지표: 정방향 ${uprightCount} / 역방향 ${reversedCount}`,
        ],
      };
    }

    if (spread === 5 && drawnRunes.length === 5) {
      const flowLabels = ["과거의 흐름", "현재의 상태", "다가올 미래", "타고난 성향", "조심해야 할 부분"];
      const flowPoints = drawnRunes.map((rune, idx) => describeRuneInContext(rune, flowLabels[idx]));

      return {
        title: "5-룬 심층 운세 풀이",
        points: [
          ...flowPoints,
          `전체 균형: 정방향 ${uprightCount} / 역방향 ${reversedCount}`,
        ],
      };
    }

    if (spread === 12 && drawnRunes.length === 12) {
      const quarterLabels = ["1분기", "2분기", "3분기", "4분기"];
      const quarterSummary = [0, 1, 2, 3].map((idx) => {
        const start = idx * 3;
        const chunk = drawnRunes.slice(start, start + 3);
        const quarterScore = chunk.reduce((acc, rune) => acc + ((rune.isReversed && !rune.isSymmetric) ? -1 : 1), 0);
        const representative = chunk[1] || chunk[0];
        return `${quarterLabels[idx]}: ${getQuarterTone(quarterScore)} · 중심 룬 ${representative.name}`;
      });

      const monthlyHighlights = drawnRunes.slice(0, 12).map((rune, idx) => {
        const label = SPREAD_LABELS[12][idx];
        const guide = getRuneGuide(rune.id);
        const monthlyCore = (rune.isReversed && !rune.isSymmetric) ? guide.cautionReversed : guide.coreUpright;
        return `${label}: ${rune.name} · ${monthlyCore}`;
      });

      return {
        title: "12-룬 연간 총운",
        points: [
          `연간 키워드: ${drawnRunes.slice(0, 3).map((rune) => getRuneGuide(rune.id).axis).join(" · ")}`,
          `전체 균형: 정방향 ${uprightCount} / 역방향 ${reversedCount}`,
          ...quarterSummary,
          ...monthlyHighlights,
          "핵심 조언: 정방향 달에는 확장, 역방향 달에는 점검을 배치해 연간 리듬을 운용하세요.",
        ],
      };
    }

    return null;
  };

  const handleShareKakao = async () => {
    const shareTitle = "스톤헨지 룬 오라클";
    const shareText = "룬의 속삭임으로 오늘의 흐름을 확인해보세요.";
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://code-destiny.pages.dev/oracle/rune";

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }

      const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${shareTitle} - ${shareText}`)}`;
      window.open(kakaoUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        window.alert("공유 링크를 복사했습니다. 카카오톡 대화창에 붙여넣어 공유해 주세요.");
      } catch (e) {
        window.alert("공유를 열 수 없었습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  };

  const handleGoMain = () => {
    window.location.href = "/";
  };

  useEffect(() => {
    if (!selectedRune) return;

    const handleKeydown = (event) => {
      if (event.key === "Escape") closeRuneDetail();
      if (event.key === "ArrowLeft") showPrevRune();
      if (event.key === "ArrowRight") showNextRune();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [selectedRune, closeRuneDetail, showPrevRune, showNextRune]);

  const selectedPositionLabel = selectedRune && SPREAD_LABELS[drawnRunes.length]
    ? SPREAD_LABELS[drawnRunes.length][selectedRune.index]
    : null;
  const selectedReading = selectedRune ? getDetailedReading(selectedRune, selectedPositionLabel) : null;
  const spreadInsight = getSpreadInsight();

  return (
    <>
      <style>{`
        ${GOOGLE_FONTS}

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sr-root {
          min-height: 100vh;
          background: #030712;
          background-image:
            radial-gradient(ellipse 80% 40% at 50% -10%, rgba(30,58,138,0.45) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(88,28,135,0.25) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 20% 60%, rgba(15,118,110,0.12) 0%, transparent 60%);
          font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
          color: #e2e8f0;
          overflow-x: hidden;
          position: relative;
        }

        /* Stars */
        .sr-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 20% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 5%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 80% 20%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 35%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 10% 45%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 50% 8%, rgba(255,255,255,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 75% 10%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 70%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 95% 65%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 90%, rgba(255,255,255,0.3) 0%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }

        /* Mist layers */
        .sr-mist {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 280px;
          background: linear-gradient(to top,
            rgba(15,23,42,0.9) 0%,
            rgba(30,58,138,0.15) 40%,
            transparent 100%);
          pointer-events: none;
          z-index: 1;
          animation: mistDrift 8s ease-in-out infinite alternate;
        }
        @keyframes mistDrift {
          from { opacity: 0.7; transform: translateX(-10px); }
          to   { opacity: 1;   transform: translateX(10px);  }
        }

        /* Stonehenge silhouette */
        .sr-stones {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 200px;
          pointer-events: none;
          z-index: 2;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 0;
          padding: 0 5%;
          opacity: 0.35;
        }
        .stone-pair {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 0 0 auto;
        }
        .stone-lintel {
          background: #1e293b;
          border-radius: 4px 4px 0 0;
          box-shadow: inset 0 -2px 8px rgba(0,0,0,0.5);
        }
        .stone-col {
          background: #1e293b;
          border-radius: 4px 4px 0 0;
          box-shadow: inset -3px 0 8px rgba(0,0,0,0.4);
        }

        .sr-content {
          position: relative;
          z-index: 10;
          max-width: 680px;
          margin: 0 auto;
          padding: 48px 20px 240px;
        }

        /* ── HEADER ── */
        .sr-header {
          text-align: center;
          margin-bottom: 52px;
        }
        .sr-header-eyebrow {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sr-header-title {
          font-family: 'Cinzel Decorative', serif;
          font-size: clamp(22px, 6vw, 38px);
          font-weight: 700;
          background: linear-gradient(135deg, #e2e8f0 0%, #93c5fd 40%, #a78bfa 70%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
          margin-bottom: 8px;
          text-shadow: none;
        }
        .sr-header-sub {
          font-size: 16px;
          color: #cbd5e1;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .sr-collection-card {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          align-items: center;
          background: linear-gradient(140deg, rgba(12,18,44,0.9), rgba(32,16,58,0.72));
          border: 1px solid rgba(120,119,198,0.35);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 26px;
          box-shadow: 0 16px 36px rgba(2, 6, 23, 0.45);
        }
        .sr-collection-img {
          width: 100%;
          height: 96px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid rgba(147,197,253,0.35);
        }
        .sr-collection-label {
          font-size: 12px;
          color: #93c5fd;
          letter-spacing: 0.12em;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .sr-collection-title {
          font-size: 18px;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .sr-collection-desc {
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.55;
        }
        .sr-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 20px auto 0;
          max-width: 320px;
        }
        .sr-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(99,102,241,0.5), transparent);
        }
        .sr-divider-rune {
          font-size: 18px;
          color: #6366f1;
          opacity: 0.7;
        }

        /* ── MOON ── */
        .sr-moon {
          position: fixed;
          top: 28px;
          right: clamp(20px, 8%, 80px);
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fef9c3, #fde68a 50%, #d97706);
          box-shadow: 0 0 24px rgba(253,230,138,0.4), 0 0 60px rgba(251,191,36,0.15);
          z-index: 3;
          animation: moonPulse 4s ease-in-out infinite;
        }
        @keyframes moonPulse {
          0%,100% { box-shadow: 0 0 24px rgba(253,230,138,0.4), 0 0 60px rgba(251,191,36,0.15); }
          50%      { box-shadow: 0 0 36px rgba(253,230,138,0.6), 0 0 90px rgba(251,191,36,0.25); }
        }

        /* ── SPREAD SELECTOR ── */
        .sr-section-label {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.25em;
          color: #475569;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 16px;
        }
        .sr-spread-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 36px;
          position: relative;
          z-index: 20;
        }
        .sr-spread-btn {
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 12px;
          padding: 18px 16px;
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          pointer-events: auto;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          z-index: 1;
        }
        .sr-spread-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(167,139,250,0.08));
          opacity: 0;
          transition: opacity 0.3s;
        }
        .sr-spread-btn:hover::before,
        .sr-spread-btn.active::before { opacity: 1; }
        .sr-spread-btn > * {
          position: relative;
          z-index: 1;
        }
        .sr-spread-btn.active {
          border-color: rgba(99,102,241,0.7);
          box-shadow: 0 0 20px rgba(99,102,241,0.2), inset 0 0 20px rgba(99,102,241,0.05);
        }
        .sr-spread-btn-rune {
          font-size: 28px;
          margin-bottom: 6px;
          display: block;
          filter: drop-shadow(0 0 8px rgba(99,102,241,0.6));
        }
        .sr-spread-btn-name {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }
        .sr-spread-btn-desc {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.45;
        }

        /* ── DRAW BUTTON ── */
        .sr-draw-btn {
          width: 100%;
          padding: 18px 24px;
          background: linear-gradient(135deg, rgba(67,56,202,0.6), rgba(109,40,217,0.6));
          border: 1px solid rgba(139,92,246,0.5);
          border-radius: 14px;
          color: #e2e8f0;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          margin-bottom: 40px;
        }
        .sr-draw-btn::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.5s, height 0.5s;
        }
        .sr-draw-btn:hover::after { width: 300px; height: 300px; }
        .sr-draw-btn:hover {
          border-color: rgba(139,92,246,0.9);
          box-shadow: 0 0 30px rgba(109,40,217,0.4), 0 0 60px rgba(109,40,217,0.15);
          transform: translateY(-1px);
        }
        .sr-draw-btn:active { transform: translateY(0); }
        .sr-draw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* ── BAG ANIMATION ── */
        .sr-bag-wrap {
          text-align: center;
          margin: 24px 0 40px;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .sr-bag {
          font-size: 64px;
          display: inline-block;
          filter: drop-shadow(0 0 16px rgba(99,102,241,0.5));
        }
        .sr-bag.shaking {
          animation: bagShake 0.15s ease-in-out infinite;
        }
        @keyframes bagShake {
          0%,100% { transform: rotate(-12deg) scale(1.05); }
          50%      { transform: rotate(12deg) scale(0.95); }
        }
        .sr-bag-text {
          font-family: 'Cinzel', serif;
          font-size: 13px;
          letter-spacing: 0.15em;
          color: #6366f1;
          animation: textPulse 1s ease-in-out infinite;
        }
        @keyframes textPulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }

        /* ── RUNE CARDS ── */
        .sr-cards-wrap {
          display: grid;
          gap: 20px;
          margin-bottom: 40px;
        }
        .sr-cards-wrap.count-1 { grid-template-columns: 1fr; max-width: 340px; margin-inline: auto; }
        .sr-cards-wrap.count-3 { grid-template-columns: repeat(3, 1fr); }
        .sr-cards-wrap.count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .sr-cards-wrap.count-12 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 760px) {
          .sr-cards-wrap.count-12,
          .sr-cards-wrap.count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 480px) {
          .sr-content { padding: 36px 16px 200px; }
          .sr-collection-card { grid-template-columns: 1fr; }
          .sr-spread-row,
          .sr-cards-wrap.count-3,
          .sr-cards-wrap.count-5,
          .sr-cards-wrap.count-12,
          .sr-cta-btns { grid-template-columns: 1fr; }
          .sr-cards-wrap.count-3,
          .sr-cards-wrap.count-5,
          .sr-cards-wrap.count-12 { max-width: 340px; margin-inline: auto; }
        }

        .sr-card {
          background: rgba(15,23,42,0.85);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 16px;
          padding: 24px 18px;
          cursor: pointer;
          transition: all 0.4s ease;
          opacity: 0;
          transform: translateY(30px) scale(0.95);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .sr-card.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .sr-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          background: linear-gradient(135deg, rgba(99,102,241,0.0), rgba(167,139,250,0.0));
          transition: background 0.4s;
          z-index: -1;
        }
        .sr-card:hover::before,
        .sr-card.selected::before {
          background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(167,139,250,0.3));
        }
        .sr-card.selected {
          border-color: rgba(139,92,246,0.8);
          box-shadow: 0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1);
        }
        .sr-card.tap-cue {
          animation: runeTapNudge 2.2s ease-in-out infinite;
          animation-delay: var(--sr-tap-delay, 0ms);
        }
        .sr-card.tap-cue::after {
          content: 'TAP';
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: #e0e7ff;
          border: 1px solid rgba(129, 140, 248, 0.48);
          background: rgba(30, 41, 59, 0.82);
          box-shadow: 0 0 12px rgba(129, 140, 248, 0.32);
          animation: tapBadgeBlink 1.8s ease-in-out infinite;
          animation-delay: var(--sr-tap-delay, 0ms);
          pointer-events: none;
        }
        .sr-card.tap-cue:hover,
        .sr-card.tap-cue:focus-visible {
          animation-play-state: paused;
        }
        .sr-card.tap-cue:hover::after,
        .sr-card.tap-cue:focus-visible::after {
          opacity: 0;
        }
        @keyframes runeTapNudge {
          0%, 100% { transform: translateY(0) scale(1); }
          28%      { transform: translateY(-6px) scale(1.015); }
          44%      { transform: translateY(0) scale(1); }
          60%      { transform: translateY(-2px) scale(1.005); }
        }
        @keyframes tapBadgeBlink {
          0%, 100% { opacity: 0.36; transform: translateY(0) scale(0.96); }
          50%      { opacity: 1; transform: translateY(-1px) scale(1); }
        }

        .sr-card-position {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.25em;
          color: #475569;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sr-card-stone {
          width: 72px; height: 72px;
          margin: 0 auto 12px;
          background: radial-gradient(circle at 35% 30%, #334155, #1e293b 60%, #0f172a);
          border-radius: 50%;
          border: 2px solid rgba(99,102,241,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          animation: stoneGlow 3s ease-in-out infinite;
        }
        @keyframes stoneGlow {
          0%,100% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 0 rgba(99,102,241,0.0), inset 0 1px 0 rgba(255,255,255,0.05); }
          50%      { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.05); }
        }
        .sr-card-symbol {
          font-size: 32px;
          line-height: 1;
          filter: drop-shadow(0 0 10px rgba(147,197,253,0.8));
          animation: runeGlow 2s ease-in-out infinite;
        }
        .sr-card.reversed .sr-card-symbol { transform: rotate(180deg); display: block; }
        @keyframes runeGlow {
          0%,100% { filter: drop-shadow(0 0 6px rgba(147,197,253,0.6)); }
          50%      { filter: drop-shadow(0 0 14px rgba(147,197,253,1.0)); }
        }
        .sr-card-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .sr-card-dir {
          font-size: 11px;
          color: #6b7280;
          font-style: italic;
          margin-bottom: 0;
        }
        .sr-card-dir.rev { color: #ef4444; opacity: 0.8; }

        /* ── DETAIL PANEL ── */
        .sr-detail {
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 18px;
          padding: 28px 24px;
          margin-bottom: 32px;
          animation: fadeSlideIn 0.5s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-detail-header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(99,102,241,0.15);
        }
        .sr-detail-stone {
          width: 88px; height: 88px;
          flex-shrink: 0;
          background: radial-gradient(circle at 35% 30%, #334155, #1e293b 60%, #0f172a);
          border-radius: 50%;
          border: 2px solid rgba(99,102,241,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.5);
        }
        .sr-detail-symbol {
          font-size: 42px;
          filter: drop-shadow(0 0 14px rgba(147,197,253,0.9));
        }
        .sr-detail-stone.rev .sr-detail-symbol { transform: rotate(180deg); display: block; }
        .sr-detail-info { flex: 1; }
        .sr-detail-name {
          font-family: 'Cinzel Decorative', serif;
          font-size: 22px;
          color: #e2e8f0;
          margin-bottom: 4px;
        }
        .sr-detail-dir {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          margin-bottom: 6px;
        }
        .sr-detail-dir.up { color: #60a5fa; }
        .sr-detail-dir.rev { color: #f87171; }
        .sr-detail-symbol-text {
          font-size: 13px;
          color: #475569;
          font-style: italic;
        }
        .sr-detail-meaning {
          font-size: 16px;
          line-height: 1.8;
          color: #cbd5e1;
          font-style: italic;
          position: relative;
          padding-left: 16px;
        }
        .sr-detail-meaning::before {
          content: '';
          position: absolute;
          left: 0; top: 4px; bottom: 4px;
          width: 2px;
          background: linear-gradient(to bottom, #6366f1, rgba(99,102,241,0));
          border-radius: 2px;
        }

        .sr-detail-axis {
          margin-top: 14px;
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 700;
          color: #a5b4fc;
          letter-spacing: 0.04em;
        }

        .sr-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .sr-detail-block {
          background: rgba(30, 41, 59, 0.55);
          border: 1px solid rgba(99,102,241,0.22);
          border-radius: 12px;
          padding: 12px;
        }

        .sr-detail-block h3 {
          font-size: 12px;
          color: #c4b5fd;
          margin-bottom: 6px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sr-detail-block p {
          font-size: 13px;
          color: #dbeafe;
          line-height: 1.6;
        }

        .sr-detail-position {
          margin-bottom: 12px;
          font-size: 12px;
          color: #93c5fd;
        }

        .sr-detail-actions {
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 12px;
          padding: 12px;
          background: rgba(15, 23, 42, 0.45);
          margin-bottom: 12px;
        }

        .sr-detail-actions h3 {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7dd3fc;
          margin-bottom: 8px;
        }

        .sr-detail-actions ul {
          list-style: none;
          display: grid;
          gap: 6px;
        }

        .sr-detail-actions li {
          font-size: 13px;
          color: #e0f2fe;
          position: relative;
          padding-left: 12px;
        }

        .sr-detail-actions li::before {
          content: '•';
          position: absolute;
          left: 0;
          top: 0;
          color: #7dd3fc;
        }

        .sr-detail-mantra {
          margin-top: 8px;
          font-size: 13px;
          color: #c7d2fe;
          font-style: italic;
          line-height: 1.7;
          border-top: 1px dashed rgba(129, 140, 248, 0.35);
          padding-top: 10px;
        }

        .sr-detail-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.72);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .sr-detail-modal {
          width: min(820px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          position: relative;
          margin-bottom: 0;
          box-shadow: 0 24px 52px rgba(2, 6, 23, 0.55);
        }

        .sr-detail-close {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: rgba(15, 23, 42, 0.85);
          color: #dbeafe;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .sr-detail-close:hover {
          border-color: rgba(167, 139, 250, 0.85);
          color: #ede9fe;
        }

        .sr-detail-nav {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .sr-detail-nav-btn {
          border-radius: 10px;
          border: 1px solid rgba(99, 102, 241, 0.35);
          background: rgba(30, 41, 59, 0.65);
          color: #c7d2fe;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 10px;
          cursor: pointer;
        }

        .sr-detail-nav-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .sr-detail-nav-btn:hover:not(:disabled) {
          border-color: rgba(167, 139, 250, 0.75);
          background: rgba(49, 46, 129, 0.7);
        }

        .sr-detail-ux-note {
          font-size: 12px;
          color: #93c5fd;
          margin-top: 8px;
          text-align: center;
        }

        @media (max-width: 640px) {
          .sr-detail-grid {
            grid-template-columns: 1fr;
          }

          .sr-detail-overlay {
            padding: 0;
            align-items: end;
          }

          .sr-detail-modal {
            width: 100%;
            max-height: 86vh;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
          }

          .sr-detail-close {
            top: 8px;
            right: 8px;
          }
        }

        .sr-spread-insight {
          background: linear-gradient(140deg, rgba(11,20,48,0.92), rgba(29,20,58,0.82));
          border: 1px solid rgba(125, 211, 252, 0.3);
          border-radius: 18px;
          padding: 22px 20px;
          margin-bottom: 22px;
        }
        .sr-spread-insight h3 {
          font-size: 18px;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 12px;
        }
        .sr-spread-insight ul {
          list-style: none;
          display: grid;
          gap: 8px;
        }
        .sr-spread-insight li {
          position: relative;
          padding-left: 14px;
          font-size: 14px;
          color: #dbeafe;
          line-height: 1.7;
        }
        .sr-spread-insight li::before {
          content: '•';
          position: absolute;
          left: 0;
          top: 0;
          color: #7dd3fc;
          font-weight: 800;
        }

        /* ── CTA ── */
        .sr-cta-wrap {
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 28px;
        }
        .sr-cta-title {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 13px;
          letter-spacing: 0.1em;
          color: #93c5fd;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .sr-cta-desc {
          font-size: 14px;
          color: #cbd5e1;
          margin-bottom: 18px;
          line-height: 1.6;
        }
        .sr-cta-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .sr-cta-btn {
          padding: 13px 10px;
          border-radius: 10px;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.25s;
          border: 1px solid rgba(99,102,241,0.35);
          background: rgba(30,27,75,0.5);
          color: #a5b4fc;
        }
        .sr-cta-btn:hover {
          background: rgba(49,46,129,0.7);
          border-color: rgba(139,92,246,0.7);
          color: #c7d2fe;
          transform: translateY(-1px);
        }
        .sr-cta-btn.primary {
          background: linear-gradient(135deg, rgba(67,56,202,0.7), rgba(109,40,217,0.7));
          border-color: rgba(139,92,246,0.6);
          color: #e0e7ff;
        }
        .sr-cta-btn.primary:hover {
          box-shadow: 0 0 18px rgba(99,102,241,0.4);
        }

        /* ── RESET ── */
        .sr-reset-btn {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid rgba(51,65,85,0.5);
          border-radius: 10px;
          color: #475569;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 12px;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.25s;
        }
        .sr-reset-btn:hover { border-color: rgba(99,102,241,0.4); color: #6366f1; }

        /* ── IDLE STATE ── */
        .sr-idle-runes {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 24px 0;
          flex-wrap: wrap;
        }
        .sr-idle-rune {
          font-size: 22px;
          color: rgba(99,102,241,0.3);
          animation: idleFloat 3s ease-in-out infinite;
          filter: drop-shadow(0 0 4px rgba(99,102,241,0.3));
        }
        .sr-idle-rune:nth-child(2) { animation-delay: 0.4s; }
        .sr-idle-rune:nth-child(3) { animation-delay: 0.8s; }
        .sr-idle-rune:nth-child(4) { animation-delay: 1.2s; }
        .sr-idle-rune:nth-child(5) { animation-delay: 1.6s; }
        @keyframes idleFloat {
          0%,100% { transform: translateY(0); opacity: 0.3; }
          50%      { transform: translateY(-6px); opacity: 0.7; }
        }

        .sr-hint-text {
          text-align: center;
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
          margin-bottom: 24px;
        }
      `}</style>

      {/* Moon */}
      <div className="sr-moon" />

      {/* Mist */}
      <div className="sr-mist" />

      {/* Stonehenge silhouette */}
      <div className="sr-stones" aria-hidden="true">
        {[
          [60,130,160,8],[44,115,140,6],[52,125,155,8],[40,110,130,6],[56,128,160,8],[48,118,145,6],
        ].map(([w,h,capW,capH], i) => (
          <div key={i} className="stone-pair" style={{ marginRight: i % 2 === 0 ? 4 : 24 }}>
            <div className="stone-lintel" style={{ width: capW, height: capH, marginBottom: -2 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="stone-col" style={{ width: (w-14)/2, height: h }} />
              <div className="stone-col" style={{ width: (w-14)/2, height: h*0.88 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="sr-root">
        <div className="sr-content">

          {/* Header */}
          <header className="sr-header">
            <p className="sr-header-eyebrow">MYSTIC ORACLE COLLECTION</p>
            <h1 className="sr-header-title">Whispers of<br />Stonehenge</h1>
            <p className="sr-header-sub">신탁의 흐름을 읽고, 오늘의 방향을 선명하게 받아보세요</p>
            <div className="sr-divider">
              <div className="sr-divider-line" />
              <span className="sr-divider-rune">ᚠ</span>
              <div className="sr-divider-line" />
            </div>
          </header>

          <section className="sr-collection-card">
            <img
              className="sr-collection-img"
              src="/fuctionassets/rune.webp"
              alt="스톤헨지 룬 오라클"
              loading="lazy"
            />
            <div>
              <p className="sr-collection-label">신탁 & 점술 컬렉션</p>
              <p className="sr-collection-title">스톤헨지 룬 오라클</p>
              <p className="sr-collection-desc">고대 룬의 상징을 통해 현재 흐름, 성향, 연간 운세까지 단계별로 해석합니다.</p>
            </div>
          </section>

          {/* Spread selector */}
          <p className="sr-section-label">배열 선택</p>
          <div className="sr-spread-row">
            {SPREAD_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.count}
                className={`sr-spread-btn ${spread === option.count ? "active" : ""}`}
                onClick={() => handleSpreadSelect(option.count)}
              >
                <span className="sr-spread-btn-rune">{option.rune}</span>
                <span className="sr-spread-btn-name">{option.name}</span>
                <span className="sr-spread-btn-desc">{option.desc}</span>
                <span className="sr-spread-btn-desc">{option.cost}</span>
              </button>
            ))}
          </div>

          {/* Draw button */}
          <button
            type="button"
            className="sr-draw-btn"
            onClick={handleDraw}
            disabled={!spread || isDrawing || isPaying}
          >
            {isPaying
              ? "코인을 결제하는 중..."
              : isDrawing
                ? "룬을 소환하는 중..."
                : spread
                  ? "⬡  룬 주머니를 흔들어라  ⬡"
                  : "배열을 먼저 선택하세요"}
          </button>

          {/* Bag / idle state */}
          {phase === "idle" && (
            <div className="sr-bag-wrap">
              <div className="sr-idle-runes">
                {["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ"].map((r, i) => (
                  <span key={i} className="sr-idle-rune">{r}</span>
                ))}
              </div>
              <p className="sr-hint-text">
                {spread ? "이제 룬 주머니를 흔들 준비가 되었습니다" : "배열을 선택하고 운명을 물어보세요"}
              </p>
            </div>
          )}

          {(phase === "shaking" || phase === "drawing") && (
            <div className="sr-bag-wrap">
              <span className={`sr-bag ${phase === "shaking" ? "shaking" : ""}`}>🎒</span>
              <p className="sr-bag-text">
                {phase === "shaking" ? "고대의 룬들이 깨어납니다..." : "운명이 룬을 선택합니다..."}
              </p>
            </div>
          )}

          {/* Rune cards */}
          {phase === "revealed" && drawnRunes.length > 0 && (
            <>
              <div className={`sr-cards-wrap count-${drawnRunes.length}`}>
                {drawnRunes.map((rune, i) => (
                  <div
                    key={rune.id}
                    className={`sr-card ${rune.isReversed ? "reversed" : ""} ${visibleCards.includes(i) ? "visible" : ""} ${selectedRune?.index === i ? "selected" : ""} ${!selectedRune ? "tap-cue" : ""}`}
                    onClick={() => (selectedRune?.index === i ? closeRuneDetail() : openRuneAt(i))}
                    style={{ "--sr-tap-delay": `${i * 120}ms` }}
                  >
                    {SPREAD_LABELS[drawnRunes.length] && (
                      <p className="sr-card-position">{SPREAD_LABELS[drawnRunes.length][i]}</p>
                    )}
                    <div className="sr-card-stone">
                      <span className="sr-card-symbol">{rune.id === "wyrd" ? "○" : rune.symbol}</span>
                    </div>
                    <p className="sr-card-name">{rune.name}</p>
                    <p className={`sr-card-dir ${rune.isReversed ? "rev" : ""}`}>
                      {rune.isReversed ? "↓ 역방향" : "↑ 정방향"}
                    </p>
                  </div>
                ))}
              </div>

              {selectedRune && (
                <div className="sr-detail-overlay" onClick={closeRuneDetail} role="presentation">
                  <div className="sr-detail sr-detail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="룬 상세 해석">
                    <button type="button" className="sr-detail-close" onClick={closeRuneDetail} aria-label="상세 해석 닫기">✕</button>

                    <div className="sr-detail-header">
                      <div className={`sr-detail-stone ${selectedRune.isReversed ? "rev" : ""}`}>
                        <span className="sr-detail-symbol">
                          {selectedRune.id === "wyrd" ? "○" : selectedRune.symbol}
                        </span>
                      </div>
                      <div className="sr-detail-info">
                        <h2 className="sr-detail-name">{selectedRune.name}</h2>
                        <p className={`sr-detail-dir ${selectedRune.isReversed ? "rev" : "up"}`}>
                          {selectedRune.isReversed ? "↓ REVERSED · 역방향" : "↑ UPRIGHT · 정방향"}
                        </p>
                        {selectedPositionLabel && (
                          <p className="sr-detail-symbol-text">{selectedPositionLabel}</p>
                        )}
                      </div>
                    </div>

                    <p className="sr-detail-meaning">{selectedReading?.summary}</p>

                    <div className="sr-detail-axis">해석 축: {selectedReading?.axis}</div>

                    <div className="sr-detail-grid">
                      {selectedReading?.sections.map((section) => (
                        <article key={section.title} className="sr-detail-block">
                          <h3>{section.title}</h3>
                          <p>{section.text}</p>
                        </article>
                      ))}
                    </div>

                    {selectedReading?.positionNote && (
                      <p className="sr-detail-position">{selectedReading.positionNote}</p>
                    )}

                    <div className="sr-detail-actions">
                      <h3>실천 조언</h3>
                      <ul>
                        {selectedReading?.actionItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="sr-detail-mantra">"{selectedReading?.mantra}"</p>

                    <div className="sr-detail-nav">
                      <button type="button" className="sr-detail-nav-btn" onClick={showPrevRune} disabled={selectedRune.index <= 0}>← 이전 룬</button>
                      <button type="button" className="sr-detail-nav-btn" onClick={showNextRune} disabled={selectedRune.index >= drawnRunes.length - 1}>다음 룬 →</button>
                    </div>
                    <p className="sr-detail-ux-note">카드를 연속으로 비교해 보고 싶다면 좌우 화살표 키를 사용하세요.</p>
                  </div>
                </div>
              )}

              {spreadInsight && (
                <section className="sr-spread-insight">
                  <h3>{spreadInsight.title}</h3>
                  <ul>
                    {spreadInsight.points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </section>
              )}

              {!selectedRune && (
                <p className="sr-hint-text" style={{ marginTop: 8 }}>
                  룬 카드를 클릭하면 상세 해석이 즉시 팝업으로 열립니다
                </p>
              )}

              {/* CTA */}
              <div className="sr-cta-wrap">
                <p className="sr-cta-title">함께 나누고 바로 만나기</p>
                <p className="sr-cta-desc">룬 결과를 카카오톡으로 공유하거나 메인 화면으로 이동해 다른 점술도 이어서 확인해보세요.</p>
                <div className="sr-cta-btns">
                  <button type="button" className="sr-cta-btn primary" onClick={handleShareKakao}>카카오톡 공유하기</button>
                  <button type="button" className="sr-cta-btn" onClick={handleGoMain}>메인 화면 바로가기</button>
                </div>
              </div>

              <button type="button" className="sr-reset-btn" onClick={reset}>
                ↺ &nbsp;다시 뽑기
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
