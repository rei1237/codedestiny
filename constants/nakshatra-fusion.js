// 나크샤트라 결정판 — 27 융합 해석 레이어 (신규 저작 · 사용자 검수 대상)
//
// 각 엔트리는 숙요 27수(sukuyoIdx)와 서비스 계산 정렬의 나크샤트라를 잇는다.
// 대응 이름과 인도 측 속성은 CROSSWALK_OFFSET 정본을 직접 읽어 제목·해설 드리프트를 막는다.
// 이는 같은 달 황경을 두 서비스 체계로 읽는 제품 정렬이며, 역사적 대표 별 대응표가 아니다.
//
// 톤 규칙: 기계적 단정과 결정론을 피하고, 두 체계의 공명·차이·행동 조언을 분리한다.
// i18n: 이번 슬라이스는 ko 우선. en/ja는 후속(현재 스텁).

import { getNakshatraAttributes } from "./nakshatra-attributes.js";
import { crosswalkFromNakshatra, crosswalkFromSukuyo } from "./nakshatra-crosswalk.js";
import { EASTERN_EXPERT, FUSION_DEEP } from "./nakshatra-expert-prose.js";

// 인덱스 = sukuyoIdx (0=각 … 26=진). 인도 측 이름·속성은 위 크로스워크로 결합한다.
const FUSION_DRAFTS = [
  { sukuyoIdx: 0, titleLead: "개척을 약속으로 잇는 힘", easternKeywords: ["개척", "시작", "비전"], guidance: "시작할 단 하나와 끝까지 지킬 약속 하나를 함께 정해보세요." },
  { sukuyoIdx: 1, titleLead: "원칙을 손에 쥔 실천", easternKeywords: ["원칙", "신뢰", "의지"], guidance: "말로 증명하기보다 오늘 지킬 원칙 하나를 작은 행동으로 옮겨보세요." },
  { sukuyoIdx: 2, titleLead: "기반 위에 세공한 목표", easternKeywords: ["내실", "안정", "축적"], guidance: "서두르는 마음이 들수록 이미 쌓은 기반에서 다듬을 한 부분부터 골라보세요." },
  { sukuyoIdx: 3, titleLead: "품어 이끄는 독립", easternKeywords: ["권위", "주도", "성과"], guidance: "앞장서되 모두를 같은 방식으로 이끌지 말고 각자가 움직일 여백을 남겨주세요." },
  { sukuyoIdx: 4, titleLead: "심장을 겨누는 목표", easternKeywords: ["직관", "통찰", "집중"], guidance: "감이 올수록 넘겨짚지 말고 사실 하나를 확인한 뒤 목표에 힘을 모으세요." },
  { sukuyoIdx: 5, titleLead: "돌파를 우정으로 묶는 힘", easternKeywords: ["돌파", "투지", "혁신"], guidance: "무엇을 바꿀지와 누구와 함께할지를 같이 정하면 변화가 오래갑니다." },
  { sukuyoIdx: 6, titleLead: "멀리 가되 중심을 지키는 힘", easternKeywords: ["자유", "탐색", "확장"], guidance: "멀리 가되 끝까지 보호할 사람이나 원칙 하나는 분명히 해두세요." },
  { sukuyoIdx: 7, titleLead: "길의 뿌리를 다시 찾는 지혜", easternKeywords: ["지식", "방향", "교육"], guidance: "조언하기 전에 왜 이 길을 택했는지부터 다시 묻고 문제의 뿌리로 돌아가세요." },
  { sukuyoIdx: 8, titleLead: "귀 기울여 설득하는 완성", easternKeywords: ["정제", "완성", "세밀"], guidance: "무엇이 필요한지 먼저 듣고, 오늘은 다듬은 하나를 끝내 세상에 건네보세요." },
  { sukuyoIdx: 9, titleLead: "비움에서 시작되는 인내", easternKeywords: ["철학", "내면", "성찰"], guidance: "성찰 뒤에는 작은 책임 하나를 꾸준히 이어가며 생각을 현실에 내려놓으세요." },
  { sukuyoIdx: 10, titleLead: "벼랑에서 배우는 경청", easternKeywords: ["위기", "전환", "용기"], guidance: "해결을 서두르기 전에 상황의 신호를 듣고 바꿀 수 있는 한 가지부터 움직이세요." },
  { sukuyoIdx: 11, titleLead: "새 판에 울리는 리듬", easternKeywords: ["창업", "시작", "개척"], guidance: "시작의 불꽃을 반복 가능한 리듬과 자원 계획으로 묶어 창 하나를 끝까지 운영해보세요." },
  { sukuyoIdx: 12, titleLead: "사이를 잇는 회복의 원", easternKeywords: ["조율", "관계", "중재"], guidance: "혼자 정리할 시간과 다시 연결할 시간을 나누어 조율이 희생으로 흐르지 않게 하세요." },
  { sukuyoIdx: 13, titleLead: "격을 갖춰 이상을 밝히는 힘", easternKeywords: ["전통", "품격", "기록"], guidance: "형식을 지키는 데서 멈추지 말고 그 안에 담을 이상과 이유를 따뜻하게 설명해보세요." },
  { sukuyoIdx: 14, titleLead: "연결을 깊이 안정시키는 손", easternKeywords: ["사교", "연결", "확장"], guidance: "새 인연을 늘리기보다 오늘은 오래 볼 한 사람에게 마음을 더 써보세요." },
  { sukuyoIdx: 15, titleLead: "쌓은 것을 온전히 건네는 완성", easternKeywords: ["축적", "분석", "기획"], guidance: "모으는 데서 멈추지 말고 가진 것 하나를 필요한 사람의 실제 쓰임으로 연결해보세요." },
  { sukuyoIdx: 16, titleLead: "돌봄으로 여는 새 출발", easternKeywords: ["돌봄", "치유", "공감"], guidance: "대신 해주기보다 상대가 다시 움직일 수 있는 첫걸음을 함께 찾아주세요." },
  { sukuyoIdx: 17, titleLead: "손끝으로 감당하는 결실", easternKeywords: ["장인", "완성", "근면"], guidance: "지금 감당할 몫과 내려놓을 몫을 나누어 완성도와 지속 가능성을 함께 살펴보세요." },
  { sukuyoIdx: 18, titleLead: "말로 벼린 정화의 불", easternKeywords: ["언어", "기획", "설득"], guidance: "불필요한 것은 걷어내되 사람까지 베지 않도록 표현을 한 번 더 다듬어 건네세요." },
  { sukuyoIdx: 19, titleLead: "변화 속에 키우는 풍요", easternKeywords: ["변화", "개혁", "속도"], guidance: "없앨 것과 키울 것을 한 줄씩 적어 변화가 결실로 이어질 방향을 정하세요." },
  { sukuyoIdx: 20, titleLead: "맑은 판단으로 이어가는 탐구", easternKeywords: ["논리", "정리", "판단"], guidance: "결론을 서두르지 말고 아직 모르는 것을 질문으로 남겨 판단의 정확도를 높여보세요." },
  { sukuyoIdx: 21, titleLead: "감으로 읽고 폭풍 뒤를 돌보는 힘", easternKeywords: ["직감", "예감", "순발"], guidance: "감정의 파도가 클수록 한 박자 쉬어 나를 먼저 진정시킨 뒤 필요한 말을 건네세요." },
  { sukuyoIdx: 22, titleLead: "끝까지 파고들어 되찾는 힘", easternKeywords: ["집념", "헌신", "몰입"], guidance: "지금 지켜야 할 것과 놓아야 할 것을 나누어 몰입이 집착으로 굳지 않게 하세요." },
  { sukuyoIdx: 23, titleLead: "무대를 기르는 리더십", easternKeywords: ["승부", "리더", "추진"], guidance: "내 성과와 함께 다른 사람의 기여도 또렷하게 밝혀 주변의 성장을 이끌어주세요." },
  { sukuyoIdx: 24, titleLead: "빛나는 무대의 깊은 통찰", easternKeywords: ["확장", "표현", "무대"], guidance: "보여줄 것을 늘리기보다 하나의 메시지만 깊게 다듬어 무대에 올려보세요." },
  { sukuyoIdx: 25, titleLead: "완성을 향해 뿌리를 지키는 날개", easternKeywords: ["완성", "품질", "원칙"], guidance: "지적보다 인정을 먼저 건넨 뒤 다음 기준을 제시해 원칙이 사람을 누르지 않게 하세요." },
  { sukuyoIdx: 26, titleLead: "손으로 매듭짓는 기쁨", easternKeywords: ["정리", "종결", "전환"], guidance: "손에 쥔 하나를 끝내고 그 성과를 함께 나누어 마무리를 다음 기쁨으로 연결하세요." },
];

function buildFusionEntry(draft) {
  const crosswalk = crosswalkFromSukuyo(draft.sukuyoIdx);
  const nakshatra = crosswalk ? getNakshatraAttributes(crosswalk.nakshatraIdx) : null;
  if (!crosswalk || !nakshatra) return { ...draft };

  const easternTheme = draft.easternKeywords.join("·");
  const indianTheme = nakshatra.deityKw.join("·");
  return {
    sukuyoIdx: draft.sukuyoIdx,
    fusionTitle: `${draft.titleLead} — ${crosswalk.sukuyoKo}수(${crosswalk.sukuyoHan}) · ${nakshatra.nameKo}(${nakshatra.nameEn})`,
    easternKeywords: draft.easternKeywords,
    convergence: `숙요의 ${crosswalk.sukuyoKo}수는 ${easternTheme}의 생활 패턴을 중심으로 읽습니다. 같은 달 황경을 서비스 계산 정렬로 읽은 인도의 ${nakshatra.nameKo}는 ${nakshatra.deityRole}의 상징을 통해 ${indianTheme}의 결을 보여줍니다. 두 관점은 '${draft.titleLead}'이라는 통합 주제로 만나지만, 역사적으로 같은 별이라는 뜻은 아닙니다.`,
    divergence: `${crosswalk.sukuyoKo}수 해설은 동양 숙요의 ${easternTheme}에 무게를 두고, ${nakshatra.nameKo} 해설은 ${nakshatra.symbol}의 상징과 '${nakshatra.shakti}'에 무게를 둡니다. 두 체계의 용어를 서로 바꾸어 쓰지 말고, 공명하는 지점과 다른 지점을 함께 살필 때 해석이 한쪽으로 치우치지 않습니다.`,
    fusionReading: `당신에게는 ${draft.titleLead}이 중요하게 드러납니다. ${draft.guidance} 두 관점은 가능성과 패턴을 살피는 참고이며, 실제 선택과 경험을 함께 확인할 때 더 선명해집니다.`,
  };
}

const FUSION_ENTRIES = FUSION_DRAFTS.map(buildFusionEntry);
const FUSION_CMS_DEFAULTS = Object.fromEntries(FUSION_ENTRIES.map((entry) => [entry.sukuyoIdx, {
  convergence: entry.convergence,
  divergence: entry.divergence,
  fusionReading: entry.fusionReading,
}]));
const FUSION_I18N_STUB = Object.freeze({ en: null, ja: null });

function clampFusionIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n)) return null;
  return ((Math.floor(n) % 27) + 27) % 27;
}

function mergeFusionEntry(idx) {
  if (idx == null) return null;
  const base = FUSION_ENTRIES[idx];
  if (!base) return null;
  const crosswalk = crosswalkFromSukuyo(idx);
  const override = FUSION_DEEP[idx];
  const overrideText = override
    ? `${override.convergence || ""} ${override.divergence || ""} ${override.fusionReading || ""}`
    : "";
  const alignedOverride = crosswalk && (
    overrideText.includes(crosswalk.nakshatraKo)
    || overrideText.includes(crosswalk.nakshatraEn)
  ) ? override : null;
  return {
    ...base,
    ...(alignedOverride || {}),
    easternExpert: EASTERN_EXPERT[idx] || null,
  };
}

// 숙요 인덱스로 융합 엔트리 조회.
function getFusionBySukuyo(sukuyoIdx) {
  return mergeFusionEntry(clampFusionIndex(sukuyoIdx));
}

// 나크샤트라 인덱스로 융합 엔트리 조회. 역방향도 크로스워크 정본을 사용한다.
function getFusionByNakshatra(nakshatraIdx) {
  const n = clampFusionIndex(nakshatraIdx);
  if (n == null) return null;
  const crosswalk = crosswalkFromNakshatra(n);
  return crosswalk ? mergeFusionEntry(crosswalk.sukuyoIdx) : null;
}

export {
  FUSION_ENTRIES,
  FUSION_CMS_DEFAULTS,
  FUSION_I18N_STUB,
  clampFusionIndex,
  getFusionBySukuyo,
  getFusionByNakshatra,
};
