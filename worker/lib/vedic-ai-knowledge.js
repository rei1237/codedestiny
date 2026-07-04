// 베다점 AI 상담 해석 지식 베이스.
// 계산 엔진(vedic-ai-chart.js)이 산출한 차트 값에 해석 어휘를 붙여
// LLM 프롬프트에 구조화 주입한다. LLM이 지어내지 않도록 근거 어휘를 제공하는 용도.
// (구 veda/knowledge-base.ts 프로토타입에서 검수 후 이식)

export const NAKSHATRA_TRAITS = {
  "Ashwini": { symbol: "말의 머리", traits: ["빠름", "치유력", "선구자"], shadow: ["성급함", "무모함"], purpose: "빠른 변화와 치유" },
  "Bharani": { symbol: "자궁", traits: ["창조력", "변혁", "강인함"], shadow: ["집착", "제어욕"], purpose: "죽음과 재생의 주관" },
  "Krittika": { symbol: "면도날", traits: ["날카로움", "비판력", "정화"], shadow: ["공격성", "냉혹함"], purpose: "불필요한 것을 잘라냄" },
  "Rohini": { symbol: "황소 수레바퀴", traits: ["미적 감각", "풍요", "매력"], shadow: ["탐욕", "소유욕"], purpose: "물질적 풍요 실현" },
  "Mrigashira": { symbol: "사슴 머리", traits: ["탐구심", "감수성", "여행욕"], shadow: ["불안함", "우유부단"], purpose: "진리 탐구" },
  "Ardra": { symbol: "눈물방울", traits: ["지적", "파괴적 변혁", "공감"], shadow: ["분노", "혼란"], purpose: "폭풍 후 정화" },
  "Punarvasu": { symbol: "활과 화살", traits: ["재기", "낙관", "지혜"], shadow: ["방황", "집중력 부족"], purpose: "복원과 귀환" },
  "Pushya": { symbol: "꽃", traits: ["양육", "보호", "정신적 풍요"], shadow: ["과보호", "보수성"], purpose: "최고의 영양 공급" },
  "Ashlesha": { symbol: "뱀", traits: ["직관", "통찰", "변혁"], shadow: ["조작", "독성"], purpose: "무의식의 탐구" },
  "Magha": { symbol: "왕좌", traits: ["권위", "리더십", "선조 연결"], shadow: ["오만", "권력욕"], purpose: "왕족적 품위 실현" },
  "Purva Phalguni": { symbol: "침대 앞 다리", traits: ["창의성", "즐거움", "매력"], shadow: ["게으름", "탐닉"], purpose: "기쁨과 창조" },
  "Uttara Phalguni": { symbol: "침대 뒷 다리", traits: ["관대함", "신뢰", "성공"], shadow: ["자기중심", "의존"], purpose: "지속적 번영" },
  "Hasta": { symbol: "손", traits: ["재능", "교묘함", "치유"], shadow: ["교활함", "사기"], purpose: "손으로 실현하는 창조" },
  "Chitra": { symbol: "빛나는 보석", traits: ["아름다움", "창의", "기술"], shadow: ["허영", "외모집착"], purpose: "아름다운 창조물 제작" },
  "Swati": { symbol: "칼", traits: ["독립", "유연성", "무역"], shadow: ["우유부단", "정체성 혼란"], purpose: "자아 실현" },
  "Vishakha": { symbol: "개선문", traits: ["목적의식", "야망", "인내"], shadow: ["질투", "집착"], purpose: "목표 달성" },
  "Anuradha": { symbol: "연꽃", traits: ["헌신", "우정", "탐구"], shadow: ["의심", "불안"], purpose: "사랑을 통한 성장" },
  "Jyeshtha": { symbol: "귀걸이", traits: ["보호", "용기", "리더십"], shadow: ["오만", "지배욕"], purpose: "약자 보호" },
  "Mula": { symbol: "뿌리 묶음", traits: ["진실탐구", "파괴적 에너지"], shadow: ["뿌리 없음", "파괴"], purpose: "근본까지 파헤침" },
  "Purva Ashadha": { symbol: "상아 부채", traits: ["설득력", "오만한 승리"], shadow: ["자만", "비타협성"], purpose: "무적의 승리" },
  "Uttara Ashadha": { symbol: "코끼리 이빨", traits: ["덕망", "인내", "보편적 진리"], shadow: ["완고함", "고립"], purpose: "영원한 승리" },
  "Shravana": { symbol: "귀", traits: ["경청", "학습", "지식 전파"], shadow: ["소문", "험담"], purpose: "지식 연결" },
  "Dhanishtha": { symbol: "북과 피리", traits: ["음악성", "재물", "관대함"], shadow: ["탐욕", "이기심"], purpose: "풍요의 실현" },
  "Shatabhisha": { symbol: "빈 원", traits: ["치유", "신비", "독립"], shadow: ["고독", "비밀주의"], purpose: "숨겨진 것의 치유" },
  "Purva Bhadrapada": { symbol: "칼 앞", traits: ["영적 불꽃", "변혁", "헌신"], shadow: ["파괴성", "양극성"], purpose: "영적 각성" },
  "Uttara Bhadrapada": { symbol: "뒤집힌 다리", traits: ["지혜", "인내", "깊은 통찰"], shadow: ["게으름", "무기력"], purpose: "심오한 지혜 실현" },
  "Revati": { symbol: "탬버린", traits: ["양육", "풍요", "끝의 완성"], shadow: ["물질 집착", "결말 거부"], purpose: "한 사이클의 완성" },
};

export const PLANET_SIGNIFICATIONS = {
  Sun: { karaka: ["자아", "아버지", "권위", "건강"], careers: ["정부직", "리더십", "의학", "금융"] },
  Moon: { karaka: ["마음", "어머니", "감정", "대중"], careers: ["간호", "농업", "무역", "요식업"] },
  Mars: { karaka: ["용기", "형제", "에너지", "부동산"], careers: ["군인", "운동선수", "공학", "외과의"] },
  Mercury: { karaka: ["지성", "소통", "무역", "분석"], careers: ["작가", "교사", "회계사", "IT", "상업"] },
  Jupiter: { karaka: ["지혜", "자녀", "신앙", "스승"], careers: ["교육", "법률", "철학", "종교", "은행"] },
  Venus: { karaka: ["아름다움", "연애", "예술", "사치"], careers: ["예술", "패션", "외교", "엔터테인먼트"] },
  Saturn: { karaka: ["업보", "장수", "제한", "봉사"], careers: ["광업", "농업", "부동산", "법", "사회사업"] },
  Rahu: { karaka: ["외부", "혁신", "집착", "물질욕"], careers: ["기술", "정치", "국제 무역", "미디어"] },
  Ketu: { karaka: ["해방", "영성", "분리", "과거생"], careers: ["영성", "연구", "의학", "신비학"] },
};

export const SIGN_TRAITS = {
  Aries: { element: "Fire", modality: "Cardinal", traits: ["용감함", "주도적", "충동적", "독립적"], keywords: ["개척", "열정", "경쟁"] },
  Taurus: { element: "Earth", modality: "Fixed", traits: ["안정적", "실용적", "고집스러움", "감각적"], keywords: ["재물", "안정", "인내"] },
  Gemini: { element: "Air", modality: "Mutable", traits: ["지적", "변덕스러움", "소통력", "호기심"], keywords: ["소통", "정보", "다재다능"] },
  Cancer: { element: "Water", modality: "Cardinal", traits: ["감성적", "보호본능", "직관적", "가정적"], keywords: ["가족", "감정", "돌봄"] },
  Leo: { element: "Fire", modality: "Fixed", traits: ["카리스마", "창의적", "자존심강함", "리더십"], keywords: ["리더십", "창조", "명예"] },
  Virgo: { element: "Earth", modality: "Mutable", traits: ["분석적", "완벽주의", "섬세함", "봉사"], keywords: ["분석", "건강", "완벽"] },
  Libra: { element: "Air", modality: "Cardinal", traits: ["조화로움", "외교적", "우유부단", "심미적"], keywords: ["균형", "관계", "아름다움"] },
  Scorpio: { element: "Water", modality: "Fixed", traits: ["강렬함", "탐구적", "집착적", "변혁적"], keywords: ["변혁", "심층", "권력"] },
  Sagittarius: { element: "Fire", modality: "Mutable", traits: ["자유로움", "낙관적", "철학적", "모험적"], keywords: ["자유", "철학", "여행"] },
  Capricorn: { element: "Earth", modality: "Cardinal", traits: ["야망있음", "책임감", "현실적", "절제력"], keywords: ["야망", "성취", "절제"] },
  Aquarius: { element: "Air", modality: "Fixed", traits: ["혁신적", "인도주의", "독창적", "반항적"], keywords: ["혁신", "인류애", "독립"] },
  Pisces: { element: "Water", modality: "Mutable", traits: ["영적", "공감능력", "직관적", "희생적"], keywords: ["영성", "예술", "연민"] },
};

function nakshatraEntry(name) {
  const entry = NAKSHATRA_TRAITS[name];
  return entry ? { name, ...entry } : null;
}

function planetEntry(name) {
  const entry = PLANET_SIGNIFICATIONS[name];
  return entry ? { name, ...entry } : null;
}

const NOTABLE_DIGNITIES = new Set(["exalted", "debilitated", "own sign"]);

// 차트에서 실제로 쓰인 값에만 해석 어휘를 붙여 프롬프트 주입용 컨텍스트를 만든다.
// (전체 사전을 통째로 넣으면 프롬프트가 비대해지고 무관한 어휘로 환각을 유도할 수 있음)
export function buildVedicKnowledgeContext(chart = {}) {
  const context = {
    guide: "아래 어휘는 계산된 차트 값에 대한 전통 조티시 해석 근거다. 차트에 없는 항목에 이 어휘를 적용하지 마라.",
  };

  const moonNakshatra = nakshatraEntry(chart?.moonNakshatra?.name);
  if (moonNakshatra) context.moonNakshatra = moonNakshatra;

  const lagnaSign = chart?.lagna?.sign;
  if (lagnaSign && SIGN_TRAITS[lagnaSign]) {
    context.lagnaSign = { name: lagnaSign, nameKo: chart.lagna.rashiKo || "", ...SIGN_TRAITS[lagnaSign] };
  }
  const lagnaNakshatra = nakshatraEntry(chart?.lagna?.nakshatra);
  if (lagnaNakshatra) context.lagnaNakshatra = lagnaNakshatra;

  const grahas = Array.isArray(chart?.grahas) ? chart.grahas : [];
  const notable = grahas
    .filter((graha) => NOTABLE_DIGNITIES.has(String(graha?.dignity || "")) || graha?.retrograde === true || graha?.combust === true)
    .map((graha) => ({
      name: graha.nameEn || graha.name,
      nameKo: graha.nameKo || "",
      dignity: graha.dignity || "",
      retrograde: graha.retrograde === true,
      combust: graha.combust === true,
      ...(PLANET_SIGNIFICATIONS[graha.nameEn || graha.name] || {}),
    }));
  if (notable.length) context.notableGrahas = notable;

  const mahadashaLord = chart?.vimshottariDasha?.currentMahadasha?.lord || "";
  const antardashaLord = chart?.vimshottariDasha?.currentAntardasha?.lord || "";
  const dashaLords = [planetEntry(mahadashaLord), planetEntry(antardashaLord)].filter(Boolean);
  if (dashaLords.length) context.currentDashaLords = dashaLords;

  return context;
}
