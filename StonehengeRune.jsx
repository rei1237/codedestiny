"use client";

import { useState, useCallback, useEffect } from "react";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";

const GOOGLE_FONTS = "";

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
  { count: 1, rune: "ᚢ", name: "1-룬", desc: "오늘의 조언", costCoins: 30 },
  { count: 3, rune: "ᚦ", name: "3-룬 · 노른의 예언", desc: "과거 · 현재 · 미래", costCoins: 50 },
  { count: 5, rune: "ᛃ", name: "5-룬 · 심층 해석", desc: "성향 + 주의 포인트 포함", costCoins: 70 },
  { count: 12, rune: "ᛞ", name: "12-룬 · 연간 대점", desc: "1년 종합 흐름", costCoins: 100 },
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

// 스프레드별 코인 가격(SPREAD_OPTIONS.costCoins와 반드시 일치). 결제 게이트에 넘겨
// 스냅샷 기반 빠른 이용권 선검사를 켠다 — 이용권 보유자는 서버 왕복 없이 즉시 통과.
const RUNE_COST_BY_SPREAD = Object.freeze({
  1: 30,
  3: 50,
  5: 70,
  12: 100,
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

function isRuneAdminBypass() {
  return typeof window !== "undefined"
    && typeof window.__cdIsAdminLikeUser === "function"
    && window.__cdIsAdminLikeUser();
}

const RUNE_GUIDE = {
  fehu: {
    axis: "가치와 자원 순환",
    coreUpright: "들어오는 자원보다 그것을 흐르게 만드는 운용 능력이 이 시기의 성패를 가릅니다. 돈이든 기회든 붙잡아 쌓아두려 하지 말고, 어디로 흘려보낼지 먼저 정하세요. 순환을 설계하는 사람에게 풍요는 반드시 다시 돌아옵니다.",
    coreReversed: "수입보다 누수와 집착이 커지기 쉬운 국면입니다. 새로 벌 궁리에 앞서, 지금 조용히 새고 있는 곳부터 막으세요. 무엇을 놓지 못하고 있는지 솔직히 들여다보면 막힌 흐름이 다시 트입니다.",
    relationshipUpright: "관계에서는 먼저 베푸는 쪽이 결국 주도권을 갖습니다. 다만 베풂과 호구를 혼동하지 말고, 어디까지가 내 몫인지 경계를 분명히 그으세요. 그 선이 뚜렷할수록 상대의 신뢰도 두터워집니다.",
    relationshipReversed: "조건과 계산이 앞선 대화가 마음의 거리를 벌립니다. 상대를 이해득실로 재고 있지 않은지 스스로 점검하세요. 마음이 오갈 자리를 돈과 조건으로 채우면 관계는 빠르게 메마릅니다.",
    workUpright: "성과 보상, 협상, 몸값 재정의에 유리한 바람이 붑니다. 지금 받는 값이 내 기여에 걸맞은지 따져보고, 필요하면 당당히 다시 매기세요. 망설이는 사이 이 창은 닫힙니다.",
    workReversed: "계약·결제·지출 항목을 세부 조항까지 다시 뜯어봐야 손실을 막습니다. 큰 그림만 보다가 작은 항목에서 새는 돈을 놓치기 쉽습니다. 숫자는 감이 아니라 눈으로 직접 확인하세요.",
    cautionUpright: "단기 성과에 취해 장기 구조를 놓치지 마세요. 지금 들어온 이익이 내일도 이어질 구조 위에 있는지 반드시 물어야 합니다.",
    cautionReversed: "불안 때문에 좋은 기회를 헐값에 넘기거나, 반대로 무리한 베팅에 쏠리기 쉽습니다. 두려움이 판단을 대신하게 두지 마세요.",
    actionUpright: ["현금흐름표 업데이트", "우선순위 지출 3개만 유지", "협상 조건 문서화"],
    actionReversed: ["고정비 정리", "미수금·미납금 정리", "소비 트리거 기록"],
    mantra: "나는 가치를 모으는 사람을 넘어, 가치를 순환시키는 사람이 된다.",
  },
  uruz: {
    axis: "생명력과 회복 탄성",
    coreUpright: "내면의 원초적 추진력이 올라오며 몸과 의지가 함께 회복되는 시기입니다. 미뤄둔 일을 다시 시작하기에 이보다 좋은 때는 없습니다. 다만 이 힘은 폭발이 아니라 지구력으로 써야 오래갑니다.",
    coreReversed: "그동안 쌓인 과부하로 체력과 집중력이 뚝뚝 끊기는 구간입니다. 더 밀어붙이면 성과가 아니라 탈진이 먼저 옵니다. 지금은 전진이 아니라 회복이 곧 전략입니다.",
    relationshipUpright: "솔직하고 단단한 태도가 관계의 신뢰를 끌어올립니다. 돌려 말하지 말고, 원하는 것을 담백하게 꺼내 놓으세요. 그 단단함이 상대에게 안정감으로 전해집니다.",
    relationshipReversed: "피로가 예민함으로 새어 나와 말이 필요 이상으로 날카로워질 수 있습니다. 지쳤을 때 나눈 대화는 결론짓지 말고 미뤄두세요. 오늘의 짜증을 상대의 잘못으로 착각하지 마세요.",
    workUpright: "초기 돌파, 재시작, 체력을 요하는 프로젝트 추진에 강한 때입니다. 몸이 받쳐줄 때 승부처를 앞당겨 배치하세요. 지금의 추진력을 미루면 아까운 낭비가 됩니다.",
    workReversed: "무리한 일정은 결과보다 번아웃을 먼저 부릅니다. 할 수 있다는 자신감과 지금 할 수 있는 양은 다릅니다. 일정을 줄이는 것이 이번 달 최고의 생산성 전략입니다.",
    cautionUpright: "힘이 붙을수록 오히려 페이스 조절을 의식하세요. 초반에 다 써버리면 정작 결승선에서 주저앉습니다.",
    cautionReversed: "의욕이 떨어진 것을 의지 부족으로 몰아세우지 마세요. 몸이 보내는 신호를 먼저 인정하고 회복부터 설계해야 합니다.",
    actionUpright: ["수면 리듬 고정", "핵심 과제 오전 배치", "가벼운 근력 루틴"],
    actionReversed: ["일정 20% 감축", "회복 시간 블록", "카페인·야근 제한"],
    mantra: "내 힘은 속도가 아니라 지속성에서 완성된다.",
  },
  thurisaz: {
    axis: "경계와 방어 지혜",
    coreUpright: "지금은 밀어붙이기보다 방어선을 긋는 쪽이 더 큰 성과를 만듭니다. 모든 요청에 응하지 말고, 지킬 것과 흘려보낼 것을 분명히 나누세요. 잘 세운 경계 하나가 열 번의 다툼을 미리 없앱니다.",
    coreReversed: "충동적인 반응이 갈등을 키우기 쉬운 국면입니다. 욱하는 순간 반 박자만 멈추면 상황의 결이 달라집니다. 즉각 반격하고 싶은 마음이 들 때가, 바로 멈춰야 할 신호입니다.",
    relationshipUpright: "관계의 기준을 분명히 밝힐수록 건강한 거리감이 생깁니다. 참고 넘기는 대신, 무엇이 불편한지 차분히 말하세요. 명확한 선은 관계를 밀어내는 게 아니라 오래 지키는 장치입니다.",
    relationshipReversed: "작은 자극에도 과잉 방어나 공격 반응이 튀어나올 수 있습니다. 상대의 말을 공격으로 미리 단정하고 있지 않은지 살피세요. 방패를 너무 크게 들면, 다가오려는 사람까지 밀어냅니다.",
    workUpright: "리스크 차단, 권한 경계 정리, 승인 체계 재설계에 유리한 때입니다. 문제가 커지기 전에 위험한 길목부터 막아두세요. 지금의 방어 설계가 다음 분기의 사고를 막습니다.",
    workReversed: "성급한 의사결정이 불필요한 대립을 만들 수 있습니다. 화가 난 상태에서 보낸 메일과 던진 말은 대개 후회로 남습니다. 결정과 통보는 감정이 가라앉은 뒤로 미루세요.",
    cautionUpright: "방어는 고립이 아니라 전략적 선택이어야 합니다. 벽을 세우되, 필요한 문 하나는 반드시 열어두세요.",
    cautionReversed: "자존심을 원칙으로 착각하지 마세요. 내가 지키려는 것이 소신인지 단순한 오기인지 구분해야 합니다.",
    actionUpright: ["거절 문장 미리 준비", "요청 대응 기준표 작성", "갈등 기록 후 대응"],
    actionReversed: ["즉답 금지 10분 규칙", "감정 메모 후 회신", "권한 밖 일 위임"],
    mantra: "나는 필요한 경계를 세우고, 불필요한 전쟁을 멈춘다.",
  },
  ansuz: {
    axis: "메시지와 통찰",
    coreUpright: "중요한 신호가 말, 문서, 우연한 대화의 형태로 들어오는 시기입니다. 흘려듣던 한마디에 실은 답이 숨어 있을 수 있으니 귀를 여세요. 지금은 말하기보다 알아차리는 감각이 운을 엽니다.",
    coreReversed: "정보 왜곡과 오해가 늘어 의도 확인이 필수인 국면입니다. 들은 대로 믿지 말고, 한 번 더 되물어 사실을 맞춰보세요. 확인 한 번을 아끼려다 큰 오해를 떠안습니다.",
    relationshipUpright: "이 시기의 관계는 말하는 태도가 아니라 듣는 태도가 방향을 바꿉니다. 반박할 말을 고르는 대신 상대의 진짜 요지를 먼저 붙잡으세요. 잘 들어주는 것만으로 굳었던 관계가 풀립니다.",
    relationshipReversed: "확인하지 않은 추측이 불신을 키우기 쉽습니다. '아마 이런 뜻이겠지' 하고 넘긴 지점이 갈등의 씨앗이 됩니다. 짐작으로 판단하지 말고 직접 물어보세요.",
    workUpright: "발표, 협업 문서, 인터뷰처럼 소통이 핵심인 업무에서 힘을 받습니다. 하고 싶은 말이 아니라 상대가 들어야 할 말로 재구성하세요. 메시지가 명료하면 설득은 저절로 따라옵니다.",
    workReversed: "핵심 메시지가 흩어져 전달력이 떨어지기 쉽습니다. 말이 길어질수록 요점은 오히려 묻힙니다. 한 문장으로 못 줄이면, 아직 스스로도 정리되지 않은 것입니다.",
    cautionUpright: "정보의 양보다 맥락의 정리가 먼저입니다. 많이 아는 것이 아니라 핵심을 꿰는 것이 힘이 됩니다.",
    cautionReversed: "애매한 표현을 그냥 두면 손실이 눈덩이처럼 커집니다. 두루뭉술한 합의일수록 나중에 반드시 되돌아옵니다.",
    actionUpright: ["핵심 문장 1개로 요약", "회의 후 합의사항 기록", "질문으로 의도 확인"],
    actionReversed: ["메신저 대신 통화", "오해 가능 문장 수정", "증빙 링크 첨부"],
    mantra: "나는 진실한 말과 명료한 구조로 길을 연다.",
  },
  raidho: {
    axis: "이동과 정렬",
    coreUpright: "바깥의 움직임과 안의 리듬이 맞아떨어질 때 일이 빠르게 정렬됩니다. 방향이 옳다면 지금은 주저 없이 나아갈 때입니다. 목적지를 분명히 정해두면 도중의 흔들림에도 길을 잃지 않습니다.",
    coreReversed: "가야 할 방향은 분명한데 리듬이 어긋나 지연이 반복됩니다. 일이 밀린다면 게을러서가 아니라 순서가 엉킨 탓일 수 있습니다. 속도를 높이기 전에 경로부터 다시 그리세요.",
    relationshipUpright: "같은 목적지를 공유하면 관계의 속도도 자연히 안정됩니다. 어디로 함께 가고 싶은지 솔직히 맞춰보세요. 방향이 같으면 잠깐의 속도 차이는 문제가 되지 않습니다.",
    relationshipReversed: "서로의 속도 차이가 피로감으로 쌓일 수 있습니다. 상대를 내 페이스에 억지로 맞추려 하지 마세요. 기다려줄 곳과 재촉할 곳을 나누면 동행이 한결 가벼워집니다.",
    workUpright: "출장, 부서 전환, 이직 탐색, 프로젝트 전개에 좋은 신호입니다. 자리를 옮기거나 판을 넓히는 결정에 운이 실립니다. 움직이되, 어디로 왜 가는지는 손에 쥐고 떠나세요.",
    workReversed: "계획과 실행의 어긋남이 자꾸 쌓이는 국면입니다. 세운 대로 안 되는 것을 무능이 아니라 신호로 읽으세요. 계획을 붙잡기보다 현실에 맞게 고쳐 잡는 편이 빠릅니다.",
    cautionUpright: "빠름보다 정확한 경로를 우선하세요. 잘못된 방향으로의 전력 질주는 제자리보다 나쁩니다.",
    cautionReversed: "지연의 원인을 바깥 탓으로만 돌리지 마세요. 내가 쥐고 조정할 수 있는 변수부터 먼저 손봐야 합니다.",
    actionUpright: ["주간 동선 최적화", "일정 버퍼 15%", "이동 중 정리 루틴"],
    actionReversed: ["우선순위 재배치", "중단 과제 정리", "필수 일정만 확정"],
    mantra: "나는 내 길의 속도와 방향을 스스로 조율한다.",
  },
  kenaz: {
    axis: "통찰의 불꽃",
    coreUpright: "막혀 있던 문제에 해법의 빛이 스며드는 구간입니다. 오래 붙들던 고민이 뜻밖의 각도에서 풀릴 수 있습니다. 떠오른 아이디어를 흘리지 말고 그 자리에서 붙잡으세요.",
    coreReversed: "영감이 고갈되어 시야가 좁아진 느낌이 들 수 있습니다. 하지만 불이 꺼진 게 아니라 잠시 재로 덮인 것뿐입니다. 억지로 짜내려 하지 말고, 입력과 휴식으로 다시 불씨를 살리세요.",
    relationshipUpright: "솔직한 표현이 관계의 온기를 되살립니다. 마음속에만 둔 고마움과 애정을 오늘 소리 내어 전하세요. 표현하지 않은 진심은 상대에게 없는 것과 같습니다.",
    relationshipReversed: "냉소적인 말투가 본심보다 훨씬 크게 상처를 남깁니다. 지쳤을 때 나오는 날 선 농담이 특히 위험합니다. 방어하려고 던진 말이 결국 나를 외롭게 만듭니다.",
    workUpright: "기획, 콘텐츠, 디자인, 문제해결 업무에서 성과가 납니다. 완성보다 시도가 중요한 국면이니 먼저 만들어 보세요. 손을 움직이는 순간 막혔던 생각이 함께 풀립니다.",
    workReversed: "완벽하게 하려는 마음이 시작 자체를 막습니다. 근사한 결과를 상상하는 동안 정작 첫 줄을 못 씁니다. 기준을 낮춰서라도 일단 착수하는 것이 이번엔 정답입니다.",
    cautionUpright: "영감이 왔을 때 즉시 기록하세요. 번뜩임은 붙잡지 않으면 몇 시간 안에 흔적도 없이 사라집니다.",
    cautionReversed: "잠깐의 슬럼프로 자신을 무능하다 단정하지 마세요. 불꽃이 잦아든 시기는 누구에게나 주기적으로 찾아옵니다.",
    actionUpright: ["아이디어 10분 스케치", "프로토타입 우선", "피드백 1회 반영"],
    actionReversed: ["작업 범위 축소", "영감 입력 시간 확보", "완성 기준 낮추기"],
    mantra: "작은 불꽃도 지키면 길을 밝히는 횃불이 된다.",
  },
  gebo: {
    axis: "교환과 상호성",
    coreUpright: "주고받는 균형이 맞을 때 운이 빠르게 열립니다. 계산 없이 먼저 건네되, 받는 것도 자연스럽게 받으세요. 건강한 교환은 한쪽의 희생이 아니라 둘 사이의 흐름입니다.",
    coreReversed: "한쪽으로 기운 교환을 오래 방치하면 피로가 쌓입니다. 늘 주기만 하거나 받기만 하는 관계는 반드시 탈이 납니다. 지금 어느 쪽으로 저울이 기울었는지 정직하게 보세요.",
    relationshipUpright: "감정·시간·에너지의 균형이 관계를 깊게 만듭니다. 받은 만큼 돌려주려는 마음이 신뢰의 바탕이 됩니다. 주고받음이 리듬을 타면 관계는 저절로 단단해집니다.",
    relationshipReversed: "보상 없는 헌신이 결국 번아웃으로 돌아옵니다. 나를 갈아 넣는 것을 사랑이라 착각하지 마세요. 지치기 전에, 무엇을 돌려받고 싶은지 솔직히 말해야 합니다.",
    workUpright: "협업, 제휴, 계약에서 서로 이득이 되는 구조를 짜기 좋은 때입니다. 내 몫만이 아니라 상대의 이득까지 설계에 넣으세요. 윈윈으로 시작한 관계가 가장 오래 갑니다.",
    workReversed: "역할과 보상의 정의가 흐리면 반드시 분쟁이 생깁니다. '알아서 나누자'는 말이 가장 위험한 합의입니다. 시작 전에 누가 무엇을 얼마나 갖는지 못 박아 두세요.",
    cautionUpright: "호의와 책임의 경계를 명확히 하세요. 선의로 한 일이 어느새 당연한 의무가 되지 않게 지켜야 합니다.",
    cautionReversed: "불균형을 미덕으로 포장하지 마세요. 참는 것이 성숙이 아니라, 관계를 조용히 갉아먹는 일일 수 있습니다.",
    actionUpright: ["역할표 합의", "보상 기준 명시", "상호 피드백"],
    actionReversed: ["일방 헌신 중단", "조건 재협상", "도움 요청 연습"],
    mantra: "균형 있는 교환이 오래 가는 풍요를 만든다.",
  },
  wunjo: {
    axis: "기쁨과 조화",
    coreUpright: "긴장이 풀리고 관계가 회복되는 밝은 흐름이 찾아옵니다. 오래 참아온 마음에 숨통이 트이는 때이니 이 온기를 마음껏 누리세요. 지금의 기쁨을 다음 걸음을 위한 연료로 쓰면 더 멀리 갑니다.",
    coreReversed: "기대와 현실의 간극에서 실망이 커질 수 있습니다. 좋아야 한다는 압박이 오히려 지금을 못 누리게 합니다. 그려둔 이상과 눈앞의 현실을 억지로 맞추려 하지 마세요.",
    relationshipUpright: "고마움을 소리 내어 표현하면 친밀도가 눈에 띄게 올라갑니다. 당연하게 여겼던 것들에 오늘 감사를 전하세요. 작은 인정 한마디가 관계의 온도를 통째로 바꿉니다.",
    relationshipReversed: "비교와 서운함이 대화를 무겁게 짓누를 수 있습니다. 남과 견주는 순간 내가 가진 것마저 초라해 보입니다. 서운함은 쌓아두지 말고 그날그날 가볍게 풀어내세요.",
    workUpright: "팀 분위기 회복과 성과 공유가 강한 동기를 만듭니다. 잘된 일을 혼자 삼키지 말고 함께 나누세요. 기쁨을 나눌수록 다음 성과를 위한 결속이 단단해집니다.",
    workReversed: "겉으로만 괜찮은 척하며 문제를 덮지 않도록 주의하세요. 억지 낙관은 곪은 이슈를 잠시 가릴 뿐입니다. 밝은 표정 뒤의 진짜 상태를 스스로에게 정직하게 물어야 합니다.",
    cautionUpright: "기쁨을 소비로 흘려보내지 말고 회복의 에너지로 쓰세요. 좋은 기분일수록 몸과 마음을 재정비할 절호의 기회입니다.",
    cautionReversed: "가라앉은 감정을 못 본 척 방치하지 마세요. 이름 붙여 말로 꺼내는 순간, 무게의 절반이 덜어집니다.",
    actionUpright: ["감사 메시지 1건", "작은 성취 축하", "휴식 일정 고정"],
    actionReversed: ["비교 줄이기", "감정 일기", "관계 오해 바로잡기"],
    mantra: "나는 기쁨을 허락하고, 조화를 선택한다.",
  },
  hagalaz: {
    axis: "파열과 재구성",
    coreUpright: "예상치 못한 변화가 낡은 구조를 걷어내는 전환점입니다. 무너지는 것들 대부분은 이미 수명을 다한 것들이니 붙잡지 마세요. 이 흔들림은 파괴가 아니라, 더 단단히 다시 짓기 위한 정지 작업입니다.",
    coreReversed: "변화를 억지로 통제하려는 저항이 오히려 피로를 키웁니다. 흐름을 거스르며 원래대로 돌리려 할수록 힘만 빠집니다. 막을 수 없는 것은 인정하고, 바꿀 수 있는 것에 힘을 모으세요.",
    relationshipUpright: "불편한 진실을 마주해야 관계가 새 틀로 재편됩니다. 덮어둔 문제를 지금 꺼내면 아프지만, 미루면 더 크게 터집니다. 솔직한 한 번의 대화가 관계를 다음 단계로 넘깁니다.",
    relationshipReversed: "감정이 한번 터진 뒤 수습이 늦어지기 쉬운 때입니다. 격해진 순간에는 결론을 내지 말고 자리를 잠시 떠나세요. 폭발 자체보다, 그 뒤에 손 내미는 속도가 관계를 지킵니다.",
    workUpright: "리셋, 구조조정, 우선순위 재설계에 오히려 좋은 시기입니다. 손볼까 미뤄둔 시스템을 지금 과감히 갈아엎으세요. 흔들리는 시기일수록 근본을 다시 세울 명분이 생깁니다.",
    workReversed: "혼란 속의 즉흥 대응이 연쇄적인 문제를 부릅니다. 급할수록 반사적으로 손대지 말고, 한 박자 멈춰 순서를 정하세요. 불난 집에서 아무 물건이나 들고 나오면 정작 중요한 걸 놓칩니다.",
    cautionUpright: "무너짐을 실패로만 읽지 마세요. 걷어낸 자리가 곧 새로 지을 터가 됩니다.",
    cautionReversed: "변화를 피하는 데 드는 비용이 변화를 겪는 비용보다 큽니다. 지금 외면한 문제는 더 나쁜 시점에 더 큰 얼굴로 돌아옵니다.",
    actionUpright: ["버릴 항목 3개 결정", "핵심 시스템 재구축", "백업 플랜 수립"],
    actionReversed: ["감정적 결정 보류", "리스크 우선 차단", "재정비 기간 확보"],
    mantra: "무너진 자리 위에 더 단단한 질서를 세운다.",
  },
  nauthiz: {
    axis: "결핍을 통한 정련",
    coreUpright: "지금의 제약은 정말 필요한 것이 무엇인지 가려내는 훈련입니다. 모든 걸 다 가질 수 없기에, 오히려 핵심이 또렷해집니다. 부족함을 원망하기보다 그것이 가리키는 방향을 읽으세요.",
    coreReversed: "모든 걸 붙잡아 통제하려는 강박이 오히려 에너지를 새게 합니다. 불안할수록 손아귀에 힘이 들어가지만, 그럴수록 더 빠져나갑니다. 쥔 것을 조금 놓아야 숨 쉴 틈이 생깁니다.",
    relationshipUpright: "원하는 것을 요구가 아니라 필요로 솔직히 말하면 갈등이 줄어듭니다. '해줘'가 아니라 '이게 필요해'로 바꿔 말해보세요. 결핍을 숨기지 않고 드러낼 때 오히려 도움받기 쉬워집니다.",
    relationshipReversed: "내 안의 결핍 불안이 상대에게 투사되기 쉽습니다. 상대의 사소한 행동을 사랑이 부족한 증거로 몰아가지 마세요. 채워지지 않은 마음의 출처가 정말 상대인지 먼저 물어야 합니다.",
    workUpright: "제한된 조건 안에서 효율을 짜내는 능력이 빛나는 때입니다. 자원이 부족하다는 사실이 오히려 날카로운 설계를 낳습니다. 다 갖춰지길 기다리지 말고, 지금 가진 것으로 시작하세요.",
    workReversed: "자원 부족을 핑계로 실행을 멈추지 않도록 주의하세요. '준비되면 하겠다'는 말이 영원한 미룸이 됩니다. 완벽한 조건은 오지 않으니, 부족한 채로 첫발을 떼세요.",
    cautionUpright: "절약은 무조건적인 축소가 아니라 우선순위의 선택입니다. 아낄 곳과 쓸 곳을 나누는 안목이 이 시기의 힘입니다.",
    cautionReversed: "불안을 달래려는 충동적 소비를 경계하세요. 허전함은 물건이 아니라 이유를 들여다볼 때 채워집니다.",
    actionUpright: ["필수·선택 분리", "시간 블록 최소화", "작은 실행 유지"],
    actionReversed: ["강박 루틴 완화", "호흡·휴식 루틴", "욕구 기록"],
    mantra: "결핍은 나를 약하게 하지 않고, 선명하게 만든다.",
  },
  isa: {
    axis: "정지와 응시",
    coreUpright: "지금의 멈춤은 지연이 아니라 오판을 막는 전략적 정지입니다. 얼어붙은 듯한 이 시기는 사실 방향을 다시 보라는 신호입니다. 조급하게 움직이기보다, 잠시 서서 판을 응시하세요.",
    coreReversed: "정체된 상황을 자기부정으로 해석하면 회복이 더뎌집니다. 멈춘 것이지 끝난 것이 아닌데, 스스로를 탓하며 얼어붙습니다. 지금은 채찍이 아니라 온기가 필요한 때입니다.",
    relationshipUpright: "잠시 거리를 두어야 할 시점이며, 그 전에 감정부터 녹여야 합니다. 차갑게 굳은 채로의 거리두기는 단절이 됩니다. 한 걸음 물러서되, 마음의 문은 얼려두지 마세요.",
    relationshipReversed: "침묵이 상대에게는 단절로 오해되기 쉽습니다. 말하고 싶지 않아도 최소한의 신호는 보내세요. '지금은 정리 중'이라는 한마디가 오해의 벽을 막습니다.",
    workUpright: "검토, 감사, 자료 정리, 문서화 같은 정적인 작업에서 성과가 납니다. 새로 벌이기보다 벌여둔 것을 가다듬을 때입니다. 지금 다져둔 기록이 다음 국면의 든든한 기반이 됩니다.",
    workReversed: "결정을 계속 피하면 그만큼 기회비용이 불어납니다. 완벽한 확신이 설 때까지 기다리다 때를 놓칩니다. 전부가 아니어도, 지금 내릴 수 있는 작은 결정 하나부터 실행하세요.",
    cautionUpright: "멈춤에는 끝나는 시점을 미리 정해두세요. 기한 없는 정지는 어느새 무기력으로 굳어집니다.",
    cautionReversed: "냉소로 감정을 얼려버리지 마세요. 아무렇지 않은 척하는 사이, 진짜 마음까지 감각을 잃습니다.",
    actionUpright: ["의사결정 기준 정리", "중간점검", "침착한 보류"],
    actionReversed: ["작은 결정 1개 실행", "상담·피드백 수집", "고립 해제"],
    mantra: "멈춤 속에서 나는 다음 방향을 더 정확히 본다.",
  },
  jera: {
    axis: "순환과 수확",
    coreUpright: "시간을 들인 것들이 순서대로 결실이 되어 돌아옵니다. 서두른다고 앞당겨지지 않으니, 때의 흐름을 믿으세요. 그동안 뿌린 씨앗이 지금 제 계절을 만난 것입니다.",
    coreReversed: "성과가 늦어지고 있어도 씨앗이 사라진 것은 아닙니다. 아직 싹이 안 보인다고 땅을 파헤치지 마세요. 눈에 안 보이는 뿌리는 지금도 조용히 자라고 있습니다.",
    relationshipUpright: "꾸준한 태도가 신뢰의 복리 효과를 만듭니다. 한 번의 큰 이벤트보다 반복되는 작은 성실함이 관계를 굳힙니다. 오늘의 사소한 약속을 지키는 것이 결국 가장 크게 돌아옵니다.",
    relationshipReversed: "즉각적인 반응을 요구하면 관계가 쉬 지칩니다. 상대에게도 마음이 익을 시간이 필요합니다. 답을 재촉하기보다, 무르익을 여유를 주세요.",
    workUpright: "장기 프로젝트, 반복 개선, 축적형 업무에 매우 유리한 때입니다. 한 방을 노리기보다 매일의 한 걸음을 쌓으세요. 지금의 루틴이 반년 뒤 남들이 못 따라올 격차를 만듭니다.",
    workReversed: "결과에 조급하게 집착하면 오히려 품질이 떨어집니다. 마감을 당기려다 정작 핵심을 대충 넘깁니다. 속도를 늦추더라도 제대로 익히는 편이 결국 빠릅니다.",
    cautionUpright: "수확기일수록 교만을 경계하세요. 잘 풀릴 때 방심하면, 다음 계절의 흉작이 시작됩니다.",
    cautionReversed: "늦는 것을 실패로 오해하지 마세요. 남보다 느린 계절을 사는 것뿐, 방향이 틀린 것은 아닙니다.",
    actionUpright: ["진행률 기록", "반복 루틴 유지", "작은 성과 축적"],
    actionReversed: ["기한 재설정", "성장 지표 분리", "조급함 관리"],
    mantra: "나는 때를 믿고, 오늘의 노력을 놓치지 않는다.",
  },
  eihwaz: {
    axis: "전환 통로와 인내",
    coreUpright: "끝과 시작 사이를 건너는 과도기의 통로에 들어섰습니다. 익숙한 것을 뒤로하고 낯선 곳으로 넘어가는 길목입니다. 불안하더라도 이 통로 끝에는 더 넓은 자리가 기다립니다.",
    coreReversed: "불확실성에 대한 두려움이 선택을 자꾸 미루게 만듭니다. 어느 쪽도 확실치 않아 그 자리에 멈춰 서 버립니다. 모든 정보가 갖춰지길 기다리면 통로 한가운데서 굳어버립니다.",
    relationshipUpright: "관계의 낡은 패턴을 벗겨내고 새 합의를 세울 시기입니다. 예전 방식이 안 맞는다면, 그건 관계가 자라고 있다는 뜻입니다. 옛 틀을 고집하지 말고 지금에 맞는 규칙을 다시 만드세요.",
    relationshipReversed: "해묵은 상처가 현재의 갈등 위에 덧씌워질 수 있습니다. 지금 화가 난 진짜 이유가 예전 일은 아닌지 살피세요. 과거의 감정을 오늘의 상대에게 청구하지 마세요.",
    workUpright: "커리어 전환, 직무 변경, 전략 피벗에 강한 보호가 실립니다. 방향을 트는 결정에 운이 함께하니 두려워 말고 움직이세요. 낯선 길이지만, 이 룬은 그 길을 지켜주는 나무입니다.",
    workReversed: "중간에 포기하고 싶은 유혹이 특히 강해지는 때입니다. 가장 힘든 구간은 대개 결승선 직전에 옵니다. 지금 그만두면, 통로를 절반만 건넌 채 되돌아가게 됩니다.",
    cautionUpright: "성급한 결론보다 과정의 정직함을 지키세요. 빨리 끝내려 지름길을 타면, 건너온 의미가 사라집니다.",
    cautionReversed: "불안을 이유로 무기한 미루지 마세요. 준비는 핑계가 되기 쉬우니, 마감일을 스스로 못 박아야 합니다.",
    actionUpright: ["전환 로드맵 작성", "리스크 분산", "주간 체크포인트"],
    actionReversed: ["결정 마감일 설정", "미련 정리", "외부 멘토 상담"],
    mantra: "나는 과도기를 통과하며 더 넓은 형태로 다시 선다.",
  },
  perthro: {
    axis: "운명 변수와 잠재성",
    coreUpright: "보이지 않던 정보가 드러나며 닫혔던 선택지가 다시 열립니다. 뜻밖의 사실이나 인연이 판을 새로 짤 수 있습니다. 우연처럼 온 기회를 흘리지 말고 촉을 세워 붙잡으세요.",
    coreReversed: "우연에 지나치게 기대면 스스로의 주도권이 약해집니다. 운이 알아서 풀어주길 바라며 손 놓고 있지 마세요. 행운도 준비된 손에만 안착합니다.",
    relationshipUpright: "관계 밑에 숨은 진짜 욕구를 인정할 때 대화가 깊어집니다. 겉으로 드러난 말 아래의 바람을 읽으세요. 서로의 감춰진 마음을 꺼내는 순간 관계가 한 겹 진해집니다.",
    relationshipReversed: "비밀, 회피, 애매한 태도가 신뢰를 조금씩 갉아먹습니다. 말하지 않아 지키는 평화는 오래가지 못합니다. 감추기보다, 조심스럽더라도 드러내는 편이 관계를 살립니다.",
    workUpright: "탐색형 프로젝트, 리서치, 실험 전략에 유리한 흐름입니다. 정답을 정해두기보다 여러 가설을 던져 시험하세요. 아직 모르는 영역일수록 오히려 기회가 큽니다.",
    workReversed: "확률에 기댄 도박식 결정이 손실을 키울 수 있습니다. '되면 대박'이라는 기대로 근거 없이 베팅하지 마세요. 감이 아니라 검증된 신호 위에서만 판돈을 거세요.",
    cautionUpright: "기회는 준비된 구조 위에서만 성과로 바뀝니다. 운이 왔을 때 받아낼 그릇부터 미리 만들어 두세요.",
    cautionReversed: "도박적인 선택을 직감이라 미화하지 마세요. 진짜 직감은 두려움이 아니라 오랜 관찰에서 나옵니다.",
    actionUpright: ["가설 2개 실험", "정보 비대칭 해소", "옵션 비교표 작성"],
    actionReversed: ["근거 없는 베팅 중단", "검증 루프 구축", "리스크 한도 설정"],
    mantra: "나는 우연을 기다리지 않고 가능성을 설계한다.",
  },
  algiz: {
    axis: "보호와 고감도 직감",
    coreUpright: "바깥의 위험을 미리 감지하고 피하는 감각이 예리해집니다. 어쩐지 꺼림칙한 느낌이 든다면 그 신호를 믿으세요. 지금의 촉은 당신을 지키려는 내면의 경보입니다.",
    coreReversed: "경계가 무너지거나, 반대로 너무 곤두선 상태 둘 다 문제가 됩니다. 아무나 들이거나 아무도 못 믿거나 극단으로 치닫기 쉽습니다. 열 곳과 닫을 곳을 다시 나누어 균형을 잡으세요.",
    relationshipUpright: "안전하다고 느껴지는 관계 안에서 감정 회복이 빠르게 일어납니다. 나를 편하게 하는 사람 곁에 의식적으로 머무세요. 안심할 수 있는 자리가 곧 치유의 자리입니다.",
    relationshipReversed: "의심이 커지면 정작 가까운 사람까지 밀어내게 됩니다. 경계심이 방패를 넘어 벽이 되고 있지 않은지 보세요. 모두를 위협으로 여기는 순간, 가장 외로워집니다.",
    workUpright: "리스크 관리, 보안, 품질 점검, 백업 전략에서 강한 힘을 발휘합니다. 잘못될 수 있는 지점을 미리 짚어 막아두세요. 지금의 대비가 다음 위기 때 당신을 구합니다.",
    workReversed: "보호 장치가 허술하면 작은 이슈가 순식간에 번집니다. 귀찮다고 건너뛴 점검이 큰 사고의 입구가 됩니다. 기본적인 안전장치부터 다시 채워 넣으세요.",
    cautionUpright: "모든 신호에 다 반응하려 하지 마세요. 진짜 위험과 단순한 소음을 가려내는 것이 이 시기의 지혜입니다.",
    cautionReversed: "안전장치를 귀찮다는 이유로 생략하지 마세요. 사고는 늘 '이 정도는 괜찮겠지' 하는 곳에서 터집니다.",
    actionUpright: ["데이터 백업", "경계 시간 확보", "정보 접근권 정리"],
    actionReversed: ["보안 점검", "신뢰 범위 재설정", "소진 관계 정리"],
    mantra: "나는 나를 지키는 선택으로 더 멀리 간다.",
  },
  sowilo: {
    axis: "승리와 선명한 방향",
    coreUpright: "핵심 목표로 에너지가 모이며 추진력이 크게 솟는 시기입니다. 흩어졌던 힘이 한 점으로 정렬되니, 지금 승부를 거세요. 태양처럼 방향이 또렷할 때 성과는 빠르게 따라옵니다.",
    coreReversed: "과열된 자신감이 주변의 협력을 오히려 약화시킵니다. 나 혼자 옳다는 확신이 팀을 밀어낼 수 있습니다. 빛이 셀수록 남을 눈부시게 하지 않는지 살피세요.",
    relationshipUpright: "당당하게 드러낸 진심이 그 자체로 매력이 됩니다. 눈치 보며 움츠리지 말고 마음을 밝게 표현하세요. 자신감 있는 솔직함이 상대를 끌어당깁니다.",
    relationshipReversed: "강한 자기 확신이 상대에겐 배려 부족으로 비칠 수 있습니다. 내 확신을 관철하는 사이 상대의 속도를 놓칩니다. 이기는 대화보다 함께 가는 대화를 택하세요.",
    workUpright: "리더십, 발표, 결단, 마무리 단계에서 강력한 성과 운이 실립니다. 미뤄둔 결정을 내리고 벌여둔 일을 마무리할 때입니다. 지금의 확신을 딛고 끝을 선언하세요.",
    workReversed: "속도전에 치우치면 디테일이 줄줄이 새어 나갑니다. 빨리 끝내려는 마음이 결정적인 실수를 만듭니다. 마지막에 한 번 더 검토하는 여유가 승패를 가릅니다.",
    cautionUpright: "빛이 강할수록 그림자 관리가 필요합니다. 잘나갈 때일수록 겸손과 여백을 의식적으로 남기세요.",
    cautionReversed: "성과에 대한 조급함이 팀의 리듬을 깨지 않게 하세요. 혼자 빨리 가려다 함께 갈 사람들을 잃습니다.",
    actionUpright: ["핵심 목표 1개 집중", "마감 선언", "성과 공유"],
    actionReversed: ["검토 단계 추가", "협업 체크인", "과속 방지"],
    mantra: "나는 빛을 좇는 것이 아니라, 빛을 운용한다.",
  },
  tiwaz: {
    axis: "정의와 원칙적 전진",
    coreUpright: "원칙을 지키는 선택이 길게 보면 가장 큰 이익으로 돌아옵니다. 눈앞의 편법이 유혹해도, 곧게 가는 길이 결국 신뢰를 남깁니다. 타협하지 말아야 할 한 가지를 분명히 정하세요.",
    coreReversed: "불공정하다는 감각이 분노로 번지면 판단이 흐려집니다. 억울함이 클수록 대응은 오히려 냉정해야 합니다. 감정이 끓을 때 내린 결정은 대부분 스스로를 다치게 합니다.",
    relationshipUpright: "약속을 지키는 태도가 관계에서 가장 강력한 신뢰의 증거가 됩니다. 화려한 말보다 지킨 약속 하나가 사람을 붙잡습니다. 작은 언약이라도 반드시 지켜내세요.",
    relationshipReversed: "한쪽의 희생이 계속 쌓이면 관계의 저울이 무너집니다. 참는 것을 사랑으로 포장하다 어느 날 폭발합니다. 공정하지 않다고 느낀다면, 그 감각을 늦기 전에 말하세요.",
    workUpright: "법적·제도적 기준이 중요한 일에서 강한 보호를 받습니다. 규정과 절차를 정확히 지키는 것이 곧 무기가 됩니다. 원칙 위에 선 사람은 흔들려도 넘어지지 않습니다.",
    workReversed: "이기려는 승부욕이 전략을 앞서면 손실이 커집니다. 반드시 이겨야 한다는 집착이 판을 좁게 만듭니다. 이번 한 판이 아니라 전체 전쟁의 판세를 보세요.",
    cautionUpright: "정의감과 완고함을 구분하세요. 옳음을 지키는 것과 내 뜻만 고집하는 것은 전혀 다릅니다.",
    cautionReversed: "억울함을 곧장 보복으로 잇지 마세요. 되갚아주고 싶은 순간일수록, 증거를 모으고 때를 기다려야 합니다.",
    actionUpright: ["원칙 문서화", "약속 이행률 점검", "공정 기준 합의"],
    actionReversed: ["감정 냉각", "증거 기반 대응", "장기전 전략"],
    mantra: "나는 원칙을 통해 승리하고, 승리로 원칙을 증명한다.",
  },
  berkano: {
    axis: "성장과 돌봄의 탄생",
    coreUpright: "새로운 프로젝트와 인연이 부드럽게 싹트는 출발점입니다. 아직 여리지만, 이제 막 뿌리를 내리는 소중한 시작입니다. 다그치지 말고 정성껏 돌보며 자랄 시간을 주세요.",
    coreReversed: "성장 속도를 억지로 재촉하면 뿌리부터 약해집니다. 빨리 결과를 보려다 어린싹을 밟는 격입니다. 지금은 성과를 뽑아낼 때가 아니라 기반을 다질 때입니다.",
    relationshipUpright: "돌봄과 배려의 언어가 굳었던 관계를 회복시킵니다. 따뜻한 말 한마디, 챙기는 손길이 큰 힘을 발휘합니다. 상대가 편히 자랄 수 있는 안전한 자리가 되어주세요.",
    relationshipReversed: "지나친 보호나 통제가 오히려 갈등의 씨앗이 됩니다. 위한다는 마음이 상대의 숨을 막고 있지 않은지 보세요. 사랑은 붙드는 게 아니라 스스로 서도록 지켜보는 것입니다.",
    workUpright: "신규 기획, 브랜딩, 교육, 사람을 키우는 일에 잘 맞는 때입니다. 처음부터 완성을 바라지 말고 자라날 판을 깔아두세요. 좋은 환경을 먼저 만들면 성장은 저절로 따라옵니다.",
    workReversed: "초기 셋업이 부실하면 같은 시행착오가 반복됩니다. 기초를 대충 넘긴 대가는 두고두고 청구됩니다. 급하더라도 토대부터 제대로 다시 놓으세요.",
    cautionUpright: "성장은 속도가 아니라 환경이 결정합니다. 무엇을 더 하느냐보다, 어떤 조건에 두느냐를 먼저 살피세요.",
    cautionReversed: "남을 돌보느라 정작 자신을 방치하지 마세요. 내 뿌리가 마르면, 누구도 오래 돌볼 수 없습니다.",
    actionUpright: ["성장 환경 정비", "주 1회 점검", "작은 성취 기록"],
    actionReversed: ["기초 재정비", "경계 설정", "회복 우선"],
    mantra: "나는 나와 세계를 돌보며 건강한 성장을 선택한다.",
  },
  ehwaz: {
    axis: "협력과 동행",
    coreUpright: "신뢰로 맺어진 파트너십이 성과를 몇 배로 키우는 시기입니다. 혼자 짊어지지 말고 함께 갈 사람과 발을 맞추세요. 좋은 동행은 서로의 속도를 끌어올리는 두 마리 말과 같습니다.",
    coreReversed: "호흡이 어긋나 진행이 더뎌지니 역할을 다시 짜야 합니다. 같이 가는데 자꾸 삐걱댄다면 분담이 잘못된 것입니다. 누가 무엇을 맡을지 처음부터 다시 정리하세요.",
    relationshipUpright: "함께 움직일수록 마음의 안정과 유대가 깊어집니다. 나란히 걷는 시간 자체가 관계의 자산이 됩니다. 큰 이벤트보다 일상을 함께하는 리듬을 쌓으세요.",
    relationshipReversed: "지키지 못한 약속이 신뢰에 금을 냅니다. 사소해 보이는 어김도 반복되면 결정적 균열이 됩니다. 못 지킬 약속은 애초에 하지 말고, 한 약속은 반드시 지키세요.",
    workUpright: "공동 프로젝트, 팀 빌딩, 협업 체계 개선에서 강한 힘을 냅니다. 각자의 강점이 맞물리도록 판을 설계하세요. 잘 짜인 팀은 개인의 합을 훌쩍 넘어섭니다.",
    workReversed: "혼자 다 해결하려는 태도가 오히려 더 큰 지연을 부릅니다. 도움을 청하는 것은 약함이 아니라 효율입니다. 짐을 나눠 들 사람에게 손을 내미세요.",
    cautionUpright: "좋은 파트너십은 분명한 합의에서 출발합니다. 사이가 좋을 때일수록 역할과 기대치를 명확히 적어두세요.",
    cautionReversed: "말 못 한 불만을 오래 묵히지 마세요. 침묵 속에 쌓인 서운함이 어느 순간 관계를 통째로 끊습니다.",
    actionUpright: ["역할 명문화", "주간 싱크", "의사결정 창구 단일화"],
    actionReversed: ["협업 규칙 재정의", "마감 재합의", "기대치 맞추기"],
    mantra: "함께 가는 힘은 혼자 빠른 힘보다 멀리 간다.",
  },
  mannaz: {
    axis: "자아와 사회적 거울",
    coreUpright: "타인과 부딪히고 어울리는 속에서 내 본질이 더 또렷해집니다. 사람들은 내가 누구인지 비춰주는 거울과 같습니다. 관계를 피하지 말고, 그 안에서 나를 읽으세요.",
    coreReversed: "자기방어적인 태도가 스스로를 고립으로 몰아넣습니다. 상처받기 싫어 벽을 세우면 외로움만 깊어집니다. 방어를 조금 풀어야 연결의 문이 열립니다.",
    relationshipUpright: "서로의 다름을 인정할 때 비로소 건강한 연결이 됩니다. 나와 같아지길 바라는 마음을 내려놓으세요. 다름을 틀림으로 읽지 않는 것이 성숙한 관계의 시작입니다.",
    relationshipReversed: "자존심 대결이 공감의 여지를 갉아먹습니다. 누가 옳은지 겨루는 사이 마음의 거리는 멀어집니다. 이기는 것보다 이해하는 쪽을 택하세요.",
    workUpright: "네트워킹, 이해관계 조율, 리더 보좌, 코칭 역할에 잘 맞습니다. 사람과 사람 사이를 잇는 자리에서 빛납니다. 나만의 성과보다 판을 매끄럽게 돌리는 데 집중하세요.",
    workReversed: "평판에 대한 불안이 과도한 눈치 보기로 나타날 수 있습니다. 모두를 만족시키려다 자기 기준을 잃습니다. 남의 시선이 아니라 내 원칙을 축으로 삼으세요.",
    cautionUpright: "타인의 시선과 내 기준을 분리하세요. 남들이 어떻게 보든, 스스로 세운 잣대를 놓치지 말아야 합니다.",
    cautionReversed: "고립을 안정으로 착각하지 마세요. 혼자 있는 편안함이 실은 관계를 회피하는 신호일 수 있습니다.",
    actionUpright: ["피드백 1건 수집", "자기 기준 3개 작성", "협업 맥락 이해"],
    actionReversed: ["방어적 반응 멈춤", "자기비난 줄이기", "지원 요청"],
    mantra: "나는 관계 속에서 흔들리지 않는 나를 세운다.",
  },
  laguz: {
    axis: "감정 흐름과 직감",
    coreUpright: "감정과 무의식이 보내는 신호가 판단을 돕는 시기입니다. 논리로 다 설명 안 되는 끌림과 거부감에 귀 기울이세요. 마음이 향하는 방향에는 대개 이유가 숨어 있습니다.",
    coreReversed: "감정이 넘치거나 반대로 억눌려서 현실 감각이 흔들립니다. 기분에 휩쓸리거나 아예 외면하는 극단을 오갑니다. 지금은 큰 결정을 미루고 마음부터 가라앉히세요.",
    relationshipUpright: "감정을 숨기지 않을수록 관계가 깊은 곳까지 닿습니다. 약한 모습을 보이는 것이 오히려 신뢰를 부릅니다. 속마음을 조심스레 열어 보이세요.",
    relationshipReversed: "감정의 파도가 높은 날은 결론보다 안정이 먼저입니다. 격한 순간에 나눈 말은 대개 진심을 왜곡합니다. 마음이 잔잔해진 뒤에 중요한 대화를 여세요.",
    workUpright: "브랜딩, 예술, 상담, 사용자의 감성을 읽는 일에 강합니다. 데이터 너머 사람의 마음을 헤아리는 감각이 빛납니다. 논리와 직감을 함께 쓰면 결과가 남다릅니다.",
    workReversed: "그날의 기분에 기댄 결정이 품질의 기복을 만듭니다. 컨디션 좋은 날과 나쁜 날의 판단이 널을 뜁니다. 기분과 무관하게 지킬 최소 기준을 정해두세요.",
    cautionUpright: "직감은 흘리지 말고 기록하고, 나중에 검증하세요. 맞았던 촉을 되짚어야 감각이 더 정교해집니다.",
    cautionReversed: "감정 억압과 감정 폭발 사이에서 균형을 찾으세요. 참기만 하면 터지고, 쏟기만 하면 관계가 지칩니다.",
    actionUpright: ["감정 로그 기록", "직감 근거 확인", "수분·휴식 관리"],
    actionReversed: ["충동 결정 보류", "호흡 루틴", "현실 체크리스트"],
    mantra: "나는 감정을 두려워하지 않고 흐름으로 다룬다.",
  },
  ingwaz: {
    axis: "내적 응축과 잠복 성장",
    coreUpright: "겉으로는 조용해 보여도 안에서는 중요한 성장이 진행 중입니다. 씨앗이 땅속에서 힘을 모으는 잠복의 시기입니다. 지금 눈에 안 보인다고 아무 일도 없는 것이 아닙니다.",
    coreReversed: "결과가 보이지 않는 기간이 길어져 초조함이 커집니다. 남들은 앞서가는 듯한데 나만 멈춘 것 같아 불안합니다. 하지만 뿌리내리는 시간을 건너뛴 성장은 없습니다.",
    relationshipUpright: "서두르지 않는 신뢰가 관계를 속부터 단단하게 만듭니다. 빨리 확인하려 들지 말고 천천히 무르익게 두세요. 조용히 쌓인 시간이 가장 깊은 유대가 됩니다.",
    relationshipReversed: "확답을 재촉하는 압박이 오히려 관계의 가능성을 줄입니다. 답을 강요하면 상대는 마음을 닫습니다. 여백을 견디는 것도 이 시기의 사랑입니다.",
    workUpright: "준비기, 연구기, 내실을 다지는 프로젝트에 최적인 때입니다. 화려한 성과보다 탄탄한 기반을 쌓을 시기입니다. 지금의 축적이 다음 도약의 발판이 됩니다.",
    workReversed: "출시와 발표의 타이밍을 지나치게 늦추지 마세요. 완벽해질 때까지 감춰두면 세상은 알아주지 않습니다. 무르익었다면, 이제 문을 열고 내보내야 합니다.",
    cautionUpright: "보이지 않는 성장도 분명한 성장입니다. 결과가 안 나온다고 그동안의 축적을 부정하지 마세요.",
    cautionReversed: "완벽한 타이밍만 기다리다 기회를 놓치지 마세요. '조금만 더'가 반복되면 그 문은 끝내 닫힙니다.",
    actionUpright: ["내실 작업 집중", "초안 완성", "핵심 지표 축적"],
    actionReversed: ["출시 기준 설정", "작은 공개", "결정 지연 중단"],
    mantra: "나는 보이지 않는 시간에도 확실히 자라고 있다.",
  },
  dagaz: {
    axis: "각성과 전환점",
    coreUpright: "긴 정체를 깨고 새 국면으로 넘어가는 문이 활짝 열립니다. 어둠이 걷히고 여명이 드는 극적인 전환의 순간입니다. 오래 기다린 돌파구가 왔으니 망설이지 말고 나서세요.",
    coreReversed: "변화가 코앞인데 불안이 커져 스스로 브레이크를 밟습니다. 원하던 문이 열렸는데 정작 발이 안 떨어집니다. 두려움은 자연스러우니, 그것을 이유로 되돌아서지만 마세요.",
    relationshipUpright: "묵은 오해가 풀리고 관계가 새 단계로 진입합니다. 얼어 있던 사이에 온기가 돌기 시작합니다. 이 흐름을 타고 먼저 손을 내밀어보세요.",
    relationshipReversed: "변화의 속도가 서로 안 맞으면 혼선이 생깁니다. 나는 넘어갔는데 상대는 아직 문 앞일 수 있습니다. 함께 건너도록 상대의 걸음을 기다려 주세요.",
    workUpright: "피벗, 런칭, 전환 발표, 리브랜딩에 강한 신호가 실립니다. 판을 새로 짜는 결정에 힘이 붙는 때입니다. 준비된 변화라면 지금 세상에 알리세요.",
    workReversed: "변화 관리 계획 없이 밀어붙이면 반작용이 거세집니다. 갑작스러운 전환은 반드시 저항을 부릅니다. 무엇이 왜 바뀌는지 충분히 설명하고 움직이세요.",
    cautionUpright: "기회의 문은 짧게 열릴 수 있으니 즉시 실행하세요. 완벽히 준비된 다음이 아니라, 열렸을 때가 타이밍입니다.",
    cautionReversed: "과거의 방식에 집착할수록 전환 비용이 불어납니다. 익숙함을 붙잡는 대가가 생각보다 큽니다.",
    actionUpright: ["결정 즉시 실행", "전환 커뮤니케이션", "실험 결과 반영"],
    actionReversed: ["변화 계획 문서화", "리스크 공지", "지원 체계 확보"],
    mantra: "나는 새벽의 문턱을 넘어 새로운 질서로 들어간다.",
  },
  othalan: {
    axis: "뿌리와 유산",
    coreUpright: "자신의 기반, 가족, 전통, 그동안 쌓아온 자산이 힘이 되는 시기입니다. 새것을 좇기보다 이미 가진 뿌리를 자원으로 활용하세요. 든든한 토대 위에서 내리는 결정이 가장 안정적입니다.",
    coreReversed: "과거에 대한 집착이나 소유를 둘러싼 갈등이 현재를 묶습니다. 지난 영광이나 옛 방식을 놓지 못해 발이 묶입니다. 무엇을 붙들고 있는지 보고, 이제 놓아줄 것을 정하세요.",
    relationshipUpright: "가치관을 공유하는 것이 관계 안정의 핵심이 됩니다. 취향보다 삶의 방향이 맞는 사람과 깊어집니다. 무엇을 소중히 여기는지 서로 확인하세요.",
    relationshipReversed: "가족이나 배경에 얽힌 문제가 감정 갈등으로 번지기 쉽습니다. 오래된 상처가 현재의 관계에 그림자를 드리웁니다. 대물림된 패턴을 알아차리고, 여기서 끊어내세요.",
    workUpright: "브랜드 자산, 장기 포트폴리오, 오래된 것을 정비하는 일에 유리합니다. 새 판을 벌이기보다 기존 자산의 가치를 극대화하세요. 축적된 것을 재정비하면 뜻밖의 힘이 나옵니다.",
    workReversed: "낡은 방식만 고수하다 혁신의 타이밍을 놓칩니다. '원래 이렇게 했으니까'가 가장 위험한 말입니다. 지켜온 것과 바꿔야 할 것을 냉정히 가르세요.",
    cautionUpright: "전통은 나아갈 방향이지 발목을 잡는 족쇄가 아닙니다. 뿌리에서 힘을 얻되, 거기에 갇히지는 마세요.",
    cautionReversed: "소유에 대한 불안으로 관계를 통제하려 들지 마세요. 붙잡을수록 빠져나가는 것이 사람 마음입니다.",
    actionUpright: ["핵심 자산 목록화", "기반 강화", "장기 전략 수립"],
    actionReversed: ["불필요한 집착 정리", "가치관 대화", "새 규칙 도입"],
    mantra: "나는 뿌리를 존중하되, 뿌리에 묶이지 않는다.",
  },
  wyrd: {
    axis: "미정의 가능성",
    coreUpright: "아직 아무것도 정해지지 않은 영역이 커서, 자유와 책임이 함께 열립니다. 빈 칸이 많다는 것은 그만큼 그려 넣을 여백이 넓다는 뜻입니다. 두려워 말고, 당신 손으로 방향을 정하세요.",
    coreReversed: "불확실함을 피하려다 결정의 타이밍을 놓칩니다. 정해지지 않은 것이 불안해 아무 선택도 못 합니다. 완전한 확신은 오지 않으니, 불확실한 채로 한 걸음 떼세요.",
    relationshipUpright: "관계를 서둘러 규정하기보다 가만히 관찰하면 진짜 방향이 보입니다. 이름 붙이기 전에 흐름 자체를 지켜보세요. 정의하지 않은 여백 속에서 자연스러운 답이 떠오릅니다.",
    relationshipReversed: "애매한 상태를 오래 방치하면 오해가 자랍니다. '언젠가 정리되겠지' 하는 사이 골이 깊어집니다. 모호함을 견디는 것과 방치하는 것은 다릅니다.",
    workUpright: "정해진 답이 없는 문제에서 오히려 창의적 해법이 나옵니다. 전례가 없다는 것은 선점할 기회가 있다는 뜻입니다. 규칙이 없다면, 당신이 첫 규칙을 만드세요.",
    workReversed: "결정을 미루는 일이 쌓이면 기회의 창이 조용히 닫힙니다. 유예가 신중함처럼 보이지만 실은 회피일 때가 많습니다. 지금 정할 수 있는 것부터 매듭지으세요.",
    cautionUpright: "미정은 혼란이 아니라 설계할 여백입니다. 비어 있음을 불안이 아니라 기회로 읽으세요.",
    cautionReversed: "운명 탓으로 선택의 책임을 넘기지 마세요. '어쩔 수 없었다'는 말 뒤에 미룬 결정이 숨어 있습니다.",
    actionUpright: ["가설 중심 실행", "선택 기준 정의", "짧은 실험 반복"],
    actionReversed: ["결정 기한 설정", "불확실성 공개", "우선순위 확정"],
    mantra: "비어 있는 칸은 두려움이 아니라 창조의 자리다.",
  },
};

const DEFAULT_RUNE_GUIDE = {
  axis: "룬 상징 해석",
  coreUpright: "이 상징의 흐름을 따라 지금 상황을 재정렬할 때입니다. 무엇이 중심이고 무엇이 곁가지인지부터 다시 세우세요.",
  coreReversed: "해석의 속도를 늦추고 핵심 리스크부터 점검해야 합니다. 서둘러 결론짓기보다 한 박자 멈춰 판을 다시 보세요.",
  relationshipUpright: "진심과 경계를 함께 지키면 관계가 안정됩니다. 마음은 열되 지킬 선은 분명히 그으세요.",
  relationshipReversed: "오해가 생기기 쉬운 때이니 말은 명료하게 건네세요. 짐작으로 넘기지 말고 한 번 더 확인하는 습관이 갈등을 막습니다.",
  workUpright: "우선순위가 또렷할수록 성과가 커집니다. 여러 갈래로 힘을 흩지 말고 지금 가장 중요한 하나에 집중하세요.",
  workReversed: "세부 계획을 보완해야 할 때입니다. 큰 방향은 맞아도 실행의 디테일에서 새는 곳이 없는지 살피세요.",
  cautionUpright: "진짜 기회와 과열된 조바심을 구분하세요. 서두르라는 압박이 클수록 한 걸음 물러나 보는 여유가 필요합니다.",
  cautionReversed: "불안이 결정을 대신하지 않도록 하세요. 두려움에 쫓겨 내린 선택은 대개 후회를 남깁니다.",
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
  const directionLabel = getRuneDirectionLabel(rune);
  const intro = rune.isSymmetric
    ? `${rune.name}은(는) 정·역의 구분이 없는 룬으로, 방향과 상관없이 '${guide.axis}'의 메시지를 곧게 전합니다.`
    : `${directionLabel}으로 나온 ${rune.name}은(는) '${guide.axis}'의 결을 ${isReversed ? "안으로 접어 점검과 재정비의 신호로" : "밖으로 펼쳐 전진과 실현의 신호로"} 드러냅니다.`;

  return {
    axis: guide.axis,
    direction: directionLabel,
    intro,
    summary: getMeaningText(rune),
    sections: [
      { title: "핵심 흐름", text: isReversed ? guide.coreReversed : guide.coreUpright },
      { title: "관계 · 감정", text: isReversed ? guide.relationshipReversed : guide.relationshipUpright },
      { title: "일 · 재물", text: isReversed ? guide.workReversed : guide.workUpright },
      { title: "주의 신호", text: isReversed ? guide.cautionReversed : guide.cautionUpright },
    ],
    actionItems,
    mantra: guide.mantra,
    positionNote: positionLabel
      ? `이 룬은 '${positionLabel}' 자리에 놓였습니다. 같은 상징도 이 자리에서는 그 맥락에 맞춰 읽어야 정확합니다.`
      : null,
  };
}

function getQuarterTone(score) {
  if (score >= 2) return "강한 확장";
  if (score === 1) return "완만한 전진";
  if (score === 0) return "균형 조율";
  if (score === -1) return "신중한 점검";
  return "리스크 관리";
}

// 뽑힌 룬들의 정·역 비율을 한 문단의 흐름 서사로 옮긴다(산술 카운트 → 사람 말투).
function summarizeRuneBalance(uprightCount, reversedCount) {
  const total = uprightCount + reversedCount;
  if (total === 0) return "";
  if (reversedCount === 0) {
    return "펼쳐진 룬이 모두 정방향으로 곧게 섰습니다. 흐름을 거스르지 말고 밀고 나갈 때이며, 지금은 망설임보다 실행이 더 큰 성과를 부릅니다.";
  }
  if (uprightCount === 0) {
    return "모든 룬이 역방향으로 누웠습니다. 새로 벌이기보다 지금 어긋난 곳부터 점검하라는 신호이니, 무리한 확장은 잠시 접어두고 속도를 늦추세요.";
  }
  const reversedRatio = reversedCount / total;
  if (reversedRatio >= 0.6) {
    return "역방향 룬이 우세합니다. 확장보다 정비가 필요한 국면이니, 전진 욕심을 잠시 내려놓고 어긋난 부분부터 손보세요.";
  }
  if (reversedRatio <= 0.4) {
    return "정방향 룬이 우세합니다. 전반적으로 순풍이 부는 흐름이니, 준비된 일은 미루지 말고 이 기세를 활용하세요.";
  }
  return "정방향과 역방향이 팽팽히 맞물려 있습니다. 밀 곳과 멈출 곳이 공존하는 시기이니, 한 가지 태도로 밀어붙이기보다 상황마다 유연하게 조율하세요.";
}

// 반복되는 해석 축(axis)을 찾아 지금 가장 크게 작용하는 주제를 짚어준다.
function summarizeRuneAxes(drawnRunes) {
  const axes = drawnRunes.map((rune) => getRuneGuide(rune.id).axis);
  const counts = {};
  axes.forEach((axis) => { counts[axis] = (counts[axis] || 0) + 1; });
  const unique = axes.filter((axis, idx) => axes.indexOf(axis) === idx);
  const repeated = unique.filter((axis) => counts[axis] >= 2);
  if (unique.length === 1) {
    return `이번 배열은 '${unique[0]}' 하나의 주제로 강하게 수렴합니다. 그만큼 지금 당신의 삶이 이 영역에 집중되어 있다는 뜻입니다.`;
  }
  if (repeated.length) {
    return `'${repeated[0]}'의 주제가 여러 자리에서 반복됩니다. 이 축이 지금 당신에게 가장 크게 작용하고 있으니, 여기에 먼저 답하세요.`;
  }
  return `핵심 주제가 ${unique.slice(0, 3).join(" · ")}(으)로 이어집니다. 서로 다른 영역이 맞물려 지금의 국면을 함께 만들고 있습니다.`;
}

// 순서가 있는 배열(과거→현재→미래 등)에서 인접 자리의 정·역 전환을 읽어 회복/점검의 결을 잡아준다.
function summarizeRuneTransitions(drawnRunes, labels) {
  const notes = [];
  for (let i = 1; i < drawnRunes.length; i += 1) {
    const prev = drawnRunes[i - 1];
    const cur = drawnRunes[i];
    const prevRev = prev.isReversed && !prev.isSymmetric;
    const curRev = cur.isReversed && !cur.isSymmetric;
    const prevLabel = labels[i - 1] || `${i}번째`;
    const curLabel = labels[i] || `${i + 1}번째`;
    if (prevRev && !curRev) {
      notes.push(`${prevLabel}의 어긋남이 ${curLabel}에서 풀려나가는 회복의 결이 보입니다.`);
    } else if (!prevRev && curRev) {
      notes.push(`${prevLabel}의 순조로움이 ${curLabel}에서 점검 국면으로 접어듭니다.`);
    }
  }
  return notes;
}

// 위 세 조각을 묶어 스프레드 전체를 관통하는 종합 서사 문단들을 만든다.
function buildSpreadNarrative(drawnRunes) {
  if (!drawnRunes.length) return [];
  const reversedCount = drawnRunes.filter((rune) => rune.isReversed && !rune.isSymmetric).length;
  const uprightCount = drawnRunes.length - reversedCount;
  const labels = SPREAD_LABELS[drawnRunes.length] || [];
  const transitions = summarizeRuneTransitions(drawnRunes, labels);

  const paragraphs = [
    summarizeRuneAxes(drawnRunes),
    summarizeRuneBalance(uprightCount, reversedCount),
  ];
  if (transitions.length) paragraphs.push(transitions.join(" "));
  return paragraphs.filter(Boolean);
}

function compactRunePromptText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getRuneDirectionLabel(rune) {
  return rune.isReversed && !rune.isSymmetric ? "역방향" : "정방향";
}

function buildRuneAiQuestionPrompt({ drawnRunes, spread, spreadInsight }) {
  const spreadOption = SPREAD_OPTIONS.find((option) => option.count === spread);
  const spreadName = spreadOption?.name || `${drawnRunes.length}-룬 배열`;
  const labels = SPREAD_LABELS[drawnRunes.length] || [];
  const runeLines = drawnRunes.map((rune, idx) => {
    const guide = getRuneGuide(rune.id);
    const isReversed = rune.isReversed && !rune.isSymmetric;
    const label = labels[idx] || `${idx + 1}번째 룬`;
    const direction = getRuneDirectionLabel(rune);
    const core = isReversed ? guide.coreReversed : guide.coreUpright;
    const caution = isReversed ? guide.cautionReversed : guide.cautionUpright;
    return [
      `${idx + 1}. ${label}: ${rune.name} ${rune.id === "wyrd" ? "○" : rune.symbol} - ${direction}`,
      `   핵심 축: ${compactRunePromptText(guide.axis)}`,
      `   기본 의미: ${compactRunePromptText(getMeaningText(rune))}`,
      `   중심 흐름: ${compactRunePromptText(core)}`,
      `   주의 신호: ${compactRunePromptText(caution)}`,
    ].join("\n");
  });
  const flowLines = Array.isArray(spreadInsight?.points)
    ? spreadInsight.points.map((point) => `- ${compactRunePromptText(point)}`)
    : [];
  const narrativeLines = Array.isArray(spreadInsight?.narrative)
    ? spreadInsight.narrative.map((paragraph) => `- ${compactRunePromptText(paragraph)}`)
    : [];

  const sections = [
    "나는 스톤헨지 룬점을 보았고, 지금 펼쳐진 룬들이 내 상황을 이렇게 비춥니다.",
    "",
    "질문: 지금 이 흐름에서 내가 알아차려야 할 핵심 메시지와 다음 선택은 무엇인가요?",
    "",
    `배열: ${spreadName}`,
    "",
    "나온 룬:",
    runeLines.join("\n\n"),
    "",
    "전체 흐름:",
    flowLines.join("\n"),
  ];

  if (narrativeLines.length) {
    sections.push("", "종합 해석:", narrativeLines.join("\n"));
  }

  sections.push(
    "",
    "위 내용을 바탕으로 룬 리더처럼 차분하고 신비롭게 해석해 주세요. 단정적으로 예언하지 말고, 상징이 드러내는 방향과 내가 조심해야 할 점, 지금 붙잡아야 할 행동을 함께 읽어 주세요.",
  );

  return sections.join("\n");
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StonehengeRune() {
  const { drawnRunes, isDrawing, phase, drawRunes, reset } = useRuneDraw();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [spread, setSpread] = useState(null);
  const [selectedRune, setSelectedRune] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [copyState, setCopyState] = useState("");

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
    setAiPrompt("");
    setCopyState("");
    reset();
  };

  const handleDraw = async () => {
    if (!spread || isDrawing || isPaying) return;

    const startDraw = () => {
      setSelectedRune(null);
      setAiPrompt("");
      setCopyState("");
      drawRunes(spread);
    };

    // 관리자·선불 마커는 서버 차감 없이 바로 뽑는다(기존 우회 유지).
    if (isRuneAdminBypass() || consumeRunePrepaidMarker()) {
      startDraw();
      return;
    }

    const subFeatureKey = RUNE_BILLING_SUB_FEATURE_BY_SPREAD[spread] || "spread-3";
    const fallbackFeatureKey = RUNE_FALLBACK_FEATURE_BY_SPREAD[spread] || "stonehenge-runes-triad";

    const result = await ensurePaidAccess({
      categoryKey: "stonehenge-runes",
      subFeatureKey,
      featureKey: fallbackFeatureKey,
      reason: "스톤헨지 룬점",
      coinPrice: RUNE_COST_BY_SPREAD[spread],
      requestId: `rune:${subFeatureKey}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      onPaid: async () => {
        startDraw();
      },
    });

    if (!result.ok) {
      if (result.code === "AUTH_REQUIRED") {
        window.location.href = "/login?next=%2Foracle%2Frune";
        return;
      }
      if (result.code === "PAYMENT_CANCELLED" || result.code === "PAYMENT_IN_PROGRESS") return;
      window.alert(result.message || "결제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleResetRunes = () => {
    setSelectedRune(null);
    setAiPrompt("");
    setCopyState("");
    reset();
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
    const narrative = buildSpreadNarrative(drawnRunes);

    if (spread === 1 && drawnRunes.length === 1) {
      const rune = drawnRunes[0];
      const guide = getRuneGuide(rune.id);
      const isReversed = rune.isReversed && !rune.isSymmetric;
      const actions = isReversed ? guide.actionReversed : guide.actionUpright;

      return {
        title: "1-룬 정밀 해석",
        narrative,
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
        narrative,
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
        narrative,
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
        narrative,
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

  const spreadInsight = getSpreadInsight();

  const handleGenerateAiPrompt = () => {
    if (!drawnRunes.length) return;
    const promptText = buildRuneAiQuestionPrompt({ drawnRunes, spread, spreadInsight });
    setAiPrompt(promptText);
    setCopyState("");
  };

  const handleCopyAiPrompt = async () => {
    if (!aiPrompt) return;
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopyState("copied");
      setTimeout(() => setCopyState(""), 1800);
    } catch {
      setCopyState("failed");
      window.alert("복사할 수 없습니다. 문장을 직접 선택해 복사해 주세요.");
    }
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
          font-family: var(--font-body);
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
          font-family: var(--font-body);
          font-size: 12px;
          letter-spacing: 0.2em;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sr-header-title {
          font-family: var(--font-display);
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
          font-family: var(--font-decorative);
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
          font-family: var(--font-body);
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
          font-family: var(--font-body);
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
          font-family: var(--font-decorative);
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
          font-family: var(--font-decorative);
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
          font-family: var(--font-decorative);
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
          font-family: var(--font-display);
          font-size: 22px;
          color: #e2e8f0;
          margin-bottom: 4px;
        }
        .sr-detail-dir {
          font-family: var(--font-decorative);
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

        .sr-detail-intro {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-left: 3px solid rgba(167, 139, 250, 0.55);
          border-radius: 8px;
          background: rgba(76, 29, 149, 0.16);
          font-size: 14px;
          line-height: 1.7;
          color: #e0e7ff;
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
        .sr-spread-narrative {
          margin-bottom: 16px;
          padding: 16px 16px 4px;
          border-radius: 12px;
          background: rgba(76, 29, 149, 0.18);
          border: 1px solid rgba(167, 139, 250, 0.28);
        }
        .sr-spread-narrative-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #c4b5fd;
          margin-bottom: 10px;
        }
        .sr-spread-narrative p + p {
          margin-top: 10px;
        }
        .sr-spread-narrative p:not(.sr-spread-narrative-label) {
          font-size: 14px;
          line-height: 1.75;
          color: #ede9fe;
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

        .sr-ai-prompt-wrap {
          background: linear-gradient(140deg, rgba(8, 13, 32, 0.94), rgba(29, 20, 58, 0.78));
          border: 1px solid rgba(167, 139, 250, 0.32);
          border-radius: 16px;
          padding: 22px 20px;
          margin-bottom: 22px;
          box-shadow: 0 18px 36px rgba(2, 6, 23, 0.28);
        }
        .sr-ai-prompt-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 10px;
        }
        .sr-ai-prompt-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #a5b4fc;
          text-transform: uppercase;
        }
        .sr-ai-prompt-head h3 {
          font-size: 18px;
          color: #f8fafc;
          margin-top: 4px;
        }
        .sr-ai-prompt-price {
          flex: 0 0 auto;
          border: 1px solid rgba(125, 211, 252, 0.38);
          border-radius: 999px;
          padding: 6px 10px;
          color: #bae6fd;
          font-size: 12px;
          font-weight: 800;
          background: rgba(14, 165, 233, 0.08);
        }
        .sr-ai-prompt-desc {
          font-size: 14px;
          line-height: 1.65;
          color: #cbd5e1;
          margin-bottom: 14px;
        }
        .sr-ai-prompt-button,
        .sr-ai-copy-btn {
          width: 100%;
          min-height: 44px;
          border-radius: 10px;
          border: 1px solid rgba(167, 139, 250, 0.48);
          background: linear-gradient(135deg, rgba(67, 56, 202, 0.72), rgba(124, 58, 237, 0.66));
          color: #f8fafc;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s;
        }
        .sr-ai-prompt-button:hover,
        .sr-ai-copy-btn:hover {
          border-color: rgba(191, 219, 254, 0.72);
          box-shadow: 0 0 18px rgba(129, 140, 248, 0.32);
          transform: translateY(-1px);
        }
        .sr-ai-prompt-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .sr-ai-prompt-result {
          display: grid;
          gap: 12px;
        }
        .sr-ai-prompt-note {
          font-size: 13px;
          line-height: 1.6;
          color: #dbeafe;
        }
        .sr-ai-prompt-textarea {
          width: 100%;
          min-height: 260px;
          resize: vertical;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(2, 6, 23, 0.52);
          color: #e5e7eb;
          padding: 14px;
          font-size: 13px;
          line-height: 1.7;
          font-family: var(--font-body);
        }
        .sr-ai-copy-btn.done {
          background: rgba(14, 116, 144, 0.62);
          border-color: rgba(125, 211, 252, 0.52);
        }
        @media (max-width: 520px) {
          .sr-ai-prompt-head {
            display: grid;
            grid-template-columns: 1fr;
          }
          .sr-ai-prompt-price {
            width: fit-content;
          }
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
          font-family: var(--font-body);
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
          font-family: var(--font-body);
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
          font-family: var(--font-body);
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
            <h2 className="sr-header-title">Whispers of<br />Stonehenge</h2>
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
                <span className="sr-spread-btn-desc">{formatKrwFromCoins(option.costCoins)}</span>
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
              ? "결제를 확인하는 중..."
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

                    {selectedReading?.intro && (
                      <p className="sr-detail-intro">{selectedReading.intro}</p>
                    )}

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
                  {Array.isArray(spreadInsight.narrative) && spreadInsight.narrative.length > 0 && (
                    <div className="sr-spread-narrative">
                      <p className="sr-spread-narrative-label">룬 리더의 종합 해석</p>
                      {spreadInsight.narrative.map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                  <ul>
                    {spreadInsight.points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="sr-ai-prompt-wrap">
                <div className="sr-ai-prompt-head">
                  <div>
                    <p className="sr-ai-prompt-kicker">AI QUESTION RITUAL</p>
                    <h3>AI에게 더 깊이 물어보기</h3>
                  </div>
                  <span className="sr-ai-prompt-price">무료</span>
                </div>
                <p className="sr-ai-prompt-desc">
                  지금 펼쳐진 룬의 흐름을 AI에게 그대로 건넬 수 있는 질문문으로 정리해 드립니다. 추가 비용 없이 이용하세요.
                </p>

                {aiPrompt ? (
                  <div className="sr-ai-prompt-result">
                    <p className="sr-ai-prompt-note">
                      이 문장을 복사해 AI에게 건네면, 지금 펼쳐진 룬의 흐름을 더 깊이 들여다볼 수 있습니다.
                    </p>
                    <textarea className="sr-ai-prompt-textarea" value={aiPrompt} readOnly />
                    <button
                      type="button"
                      className={`sr-ai-copy-btn ${copyState === "copied" ? "done" : ""}`}
                      onClick={handleCopyAiPrompt}
                    >
                      {copyState === "copied" ? "복사 완료" : "복사하기"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="sr-ai-prompt-button"
                    onClick={handleGenerateAiPrompt}
                  >
                    AI 질문문 열기 (무료)
                  </button>
                )}
              </section>

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

              <button type="button" className="sr-reset-btn" onClick={handleResetRunes}>
                ↺ &nbsp;다시 뽑기
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
