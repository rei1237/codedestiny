// 나크샤트라 결정판 — 27 나크샤트라 속성 데이터 (공유 모듈)
//
// 출처(값 원본): NKGANA/NKYONI/NAKDEITY_DATA/NAKPADA_SIGNS 는 `vedic-astrology.html`
//   인라인 상수(약 1227–1274행)에서 복사. 지배성(lord)은 worker/lib/vedic-derived-calculations.js
//   의 NAKSHATRAS 와 동일.
//
// ⚠ 정확도 교정(Phase 2 — 숙요·베다 전문가 검수):
//   1) nadi(체질): 원본 HTML의 단순 3-순환(Vata,Pitta,Kapha 반복)이 정통 배정과 달라
//      **정통 지그재그(Adi/Madhya/Antya = Vata/Pitta/Kapha, 9개씩 3군)로 교정**.
//      Adi/Vata:  Ashwini, Ardra, Punarvasu, Uttara Phalguni, Hasta, Jyeshtha, Mula, Shatabhisha, Purva Bhadrapada
//      Madhya/Pitta: Bharani, Mrigashira, Pushya, Purva Phalguni, Chitra, Anuradha, Purva Ashadha, Dhanishta, Uttara Bhadrapada
//      Antya/Kapha: Krittika, Rohini, Ashlesha, Magha, Swati, Vishakha, Uttara Ashadha, Shravana, Revati
//      (출처: RashiSetu / Astroyogi Nadi Koota — scripts/verify-nakshatra-flow.mjs 가 9/9/9 그룹 어서션)
//   2) symbol(상징)·shakti(고유 힘): 전통 문헌 기반으로 추가(전문가 완성도).
//
// 설계 원칙: 모든 조회는 인덱스(0–26)로 한다(철자 드리프트 "Dhanishta"↔"Dhanishtha" 방지).
//   인덱스 순서는 Ashwini(0) … Revati(26) — 시데리얼 황경 0°부터의 표준 순서.

import { INDIAN_EXPERT } from "./nakshatra-expert-prose.js";

// 라시(라그나 별자리) → 지배성. 파다 나바암샤 라시의 지배성 도출에 사용.
const SIGN_LORD = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const SIGN_KO = {
  Aries: "양자리", Taurus: "황소자리", Gemini: "쌍둥이자리", Cancer: "게자리",
  Leo: "사자자리", Virgo: "처녀자리", Libra: "천칭자리", Scorpio: "전갈자리",
  Sagittarius: "사수자리", Capricorn: "염소자리", Aquarius: "물병자리", Pisces: "물고기자리",
};

const GANA_KO = { Deva: "데바(신성)", Manushya: "마누샤(인간)", Rakshasa: "락샤사(격렬)" };
const NADI_KO = { Vata: "바타(바람·아디)", Pitta: "피타(불·마디아)", Kapha: "카파(물·안티아)" };
const MOTIVE_KO = {
  Dharma: "다르마(사명·정의)", Artha: "아르타(재물·성취)",
  Kama: "카마(욕망·창의)", Moksha: "목샤(해방·영성)",
};

// 27 나크샤트라 속성 — 인덱스 0–26 고정.
// 필드: nameEn / nameKo(음차) / lord(지배성) / gana / yoni / nadi(정통) / deity / deityRole / deityKw / motive / padaSigns(나바암샤 4라시) / symbol(상징) / shakti(고유 힘)
const NAKSHATRA_ATTRIBUTES = [
  { index: 0, nameEn: "Ashwini", nameKo: "아슈위니", lord: "Ketu", gana: "Deva", yoni: "Horse", nadi: "Vata", deity: "아슈위니 쿠마라(Ashwini Kumara)", deityRole: "쌍둥이 신성 의사 — 빠른 치유와 새벽의 선구력", deityKw: ["치유", "속도", "새로운 시작"], motive: "Dharma", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "말의 머리", shakti: "빠르게 낫게 하는 힘" },
  { index: 1, nameEn: "Bharani", nameKo: "바라니", lord: "Venus", gana: "Manushya", yoni: "Elephant", nadi: "Pitta", deity: "야마(Yama)", deityRole: "죽음·업보·변혁의 신 — 정화와 재탄생의 주관자", deityKw: ["변혁", "정의", "카르마"], motive: "Artha", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "요니(자궁)", shakti: "데려가 정화하는 힘" },
  { index: 2, nameEn: "Krittika", nameKo: "크리티카", lord: "Sun", gana: "Rakshasa", yoni: "Goat", nadi: "Kapha", deity: "아그니(Agni)", deityRole: "불의 신 — 정화·날카로운 비판력·용기의 화신", deityKw: ["정화", "날카로움", "용기"], motive: "Kama", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "면도날·불꽃", shakti: "태워서 정화하는 힘" },
  { index: 3, nameEn: "Rohini", nameKo: "로히니", lord: "Moon", gana: "Manushya", yoni: "Serpent", nadi: "Kapha", deity: "브라흐마/프라자파티(Brahma)", deityRole: "창조의 주관자 — 물질적 풍요와 아름다움의 신", deityKw: ["창조", "풍요", "아름다움"], motive: "Moksha", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "수레·사원", shakti: "자라나게 하는 힘" },
  { index: 4, nameEn: "Mrigashira", nameKo: "므리가시라", lord: "Mars", gana: "Deva", yoni: "Serpent", nadi: "Pitta", deity: "소마(Soma)", deityRole: "달신 소마 — 부드러운 감수성과 탐구심의 상징", deityKw: ["탐구", "감수성", "순수"], motive: "Moksha", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "사슴의 머리", shakti: "채움을 찾아내는 힘" },
  { index: 5, nameEn: "Ardra", nameKo: "아르드라", lord: "Rahu", gana: "Manushya", yoni: "Dog", nadi: "Vata", deity: "루드라(Rudra)", deityRole: "폭풍·파괴·치유의 신 — 심층 변혁과 공감의 화신", deityKw: ["변혁", "폭풍", "공감"], motive: "Kama", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "눈물방울·보석", shakti: "노력으로 변화시키는 힘" },
  { index: 6, nameEn: "Punarvasu", nameKo: "푸나르바수", lord: "Jupiter", gana: "Deva", yoni: "Cat", nadi: "Vata", deity: "아디티(Aditi)", deityRole: "무한한 어머니 신 — 귀환·재기·풍요의 상징", deityKw: ["귀환", "회복", "낙관"], motive: "Artha", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "화살통", shakti: "풍요를 되찾는 힘" },
  { index: 7, nameEn: "Pushya", nameKo: "푸시야", lord: "Saturn", gana: "Deva", yoni: "Goat", nadi: "Pitta", deity: "브리하스파티(Brihaspati)", deityRole: "목성 스승신 — 영적 양육과 최고의 행운 상징", deityKw: ["양육", "스승", "영적성장"], motive: "Dharma", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "소젖통·연꽃", shakti: "영적 기운을 기르는 힘" },
  { index: 8, nameEn: "Ashlesha", nameKo: "아슐레샤", lord: "Mercury", gana: "Rakshasa", yoni: "Cat", nadi: "Kapha", deity: "나가(Naga)", deityRole: "뱀의 신 — 잠재의식과 변혁적 통찰의 수호자", deityKw: ["통찰", "변혁", "신비"], motive: "Dharma", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "똬리 튼 뱀", shakti: "휘감아 스며드는 힘" },
  { index: 9, nameEn: "Magha", nameKo: "마가", lord: "Ketu", gana: "Rakshasa", yoni: "Rat", nadi: "Kapha", deity: "피트르(Pitr, 조상신)", deityRole: "조상의 수호신 — 왕족 기질과 권위의 뿌리", deityKw: ["권위", "유산", "리더십"], motive: "Artha", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "왕좌", shakti: "뿌리를 잇는 힘" },
  { index: 10, nameEn: "Purva Phalguni", nameKo: "푸르바 팔구니", lord: "Venus", gana: "Manushya", yoni: "Rat", nadi: "Pitta", deity: "바가(Bhaga)", deityRole: "향락·행운·사랑의 신 — 풍요와 창의적 기쁨", deityKw: ["창의", "기쁨", "향락"], motive: "Kama", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "침상의 앞다리", shakti: "짝을 맺는 기쁨의 힘" },
  { index: 11, nameEn: "Uttara Phalguni", nameKo: "우타라 팔구니", lord: "Sun", gana: "Manushya", yoni: "Cow", nadi: "Vata", deity: "아리야만(Aryaman)", deityRole: "계약·우정·명예의 신 — 지속적 번영과 신뢰", deityKw: ["신뢰", "번영", "관대함"], motive: "Moksha", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "침상의 뒷다리", shakti: "쌓아 번영하는 힘" },
  { index: 12, nameEn: "Hasta", nameKo: "하스타", lord: "Moon", gana: "Deva", yoni: "Buffalo", nadi: "Vata", deity: "사비타르(Savitar)", deityRole: "태양의 창조력 — 손으로 실현하는 기술과 치유", deityKw: ["기술", "치유", "실현"], motive: "Moksha", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "손(주먹)", shakti: "원하는 것을 손에 쥐는 힘" },
  { index: 13, nameEn: "Chitra", nameKo: "치트라", lord: "Mars", gana: "Rakshasa", yoni: "Tiger", nadi: "Pitta", deity: "비슈와카르마(Vishwakarma)", deityRole: "우주의 장인 — 아름다움과 기술적 완벽함", deityKw: ["아름다움", "창조", "기술"], motive: "Kama", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "밝은 보석·진주", shakti: "공덕을 빚어내는 힘" },
  { index: 14, nameEn: "Swati", nameKo: "스와티", lord: "Rahu", gana: "Deva", yoni: "Buffalo", nadi: "Kapha", deity: "바유(Vayu)", deityRole: "바람의 신 — 독립·자유·유연한 적응력", deityKw: ["자유", "독립", "유연성"], motive: "Artha", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "산호·어린 새싹", shakti: "흩어 퍼뜨리는 힘" },
  { index: 15, nameEn: "Vishakha", nameKo: "비샤카", lord: "Jupiter", gana: "Rakshasa", yoni: "Tiger", nadi: "Kapha", deity: "인드라-아그니(Indra-Agni)", deityRole: "인드라와 아그니의 합일 — 목적의식과 최후 승리", deityKw: ["목적", "야망", "승리"], motive: "Dharma", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "개선문·화환", shakti: "여러 결실을 거두는 힘" },
  { index: 16, nameEn: "Anuradha", nameKo: "아누라다", lord: "Saturn", gana: "Deva", yoni: "Deer", nadi: "Pitta", deity: "미트라(Mitra)", deityRole: "우정·계약의 신 — 진실한 헌신과 사랑을 통한 성장", deityKw: ["헌신", "우정", "사랑"], motive: "Dharma", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "연꽃", shakti: "받들어 헌신하는 힘" },
  { index: 17, nameEn: "Jyeshtha", nameKo: "즈예슈타", lord: "Mercury", gana: "Rakshasa", yoni: "Deer", nadi: "Vata", deity: "인드라(Indra)", deityRole: "번개와 전쟁의 왕 — 용기·보호·리더십의 정점", deityKw: ["용기", "보호", "리더십"], motive: "Artha", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "귀걸이·부적", shakti: "겨루어 이기는 힘" },
  { index: 18, nameEn: "Mula", nameKo: "물라", lord: "Ketu", gana: "Rakshasa", yoni: "Dog", nadi: "Vata", deity: "니리티(Nirriti)", deityRole: "재앙과 분해의 여신 — 근본까지 파헤치는 진실 탐구", deityKw: ["진실", "강렬함", "파괴후재생"], motive: "Kama", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "묶인 뿌리 다발", shakti: "뿌리째 허무는 힘" },
  { index: 19, nameEn: "Purva Ashadha", nameKo: "푸르바 아샤다", lord: "Venus", gana: "Manushya", yoni: "Monkey", nadi: "Pitta", deity: "아파스(Apas)", deityRole: "물의 신 — 정화·승리·설득력의 화신", deityKw: ["승리", "설득", "정화"], motive: "Moksha", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "부채·키(winnow)", shakti: "기운을 북돋는 힘" },
  { index: 20, nameEn: "Uttara Ashadha", nameKo: "우타라 아샤다", lord: "Sun", gana: "Manushya", yoni: "Mongoose", nadi: "Kapha", deity: "비슈와데바(Vishvadeva)", deityRole: "10 우주 신들의 집합 — 덕망·영원성·깊은 인내", deityKw: ["덕망", "인내", "영원한승리"], motive: "Moksha", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "코끼리 상아", shakti: "무너지지 않는 승리의 힘" },
  { index: 21, nameEn: "Shravana", nameKo: "슈라바나", lord: "Moon", gana: "Deva", yoni: "Monkey", nadi: "Kapha", deity: "비슈누(Vishnu)", deityRole: "유지의 신 — 경청·학습·지식 전파의 수호자", deityKw: ["경청", "지식", "연결"], motive: "Artha", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "귀·세 발자국", shakti: "이어 잇는 힘" },
  { index: 22, nameEn: "Dhanishta", nameEnAlt: "Dhanishtha", nameKo: "다니슈타", lord: "Mars", gana: "Rakshasa", yoni: "Lion", nadi: "Pitta", deity: "아슈타 바수스(Ashta Vasus)", deityRole: "8 풍요의 신들 — 음악·리듬·재물의 원천", deityKw: ["재물", "음악", "관대함"], motive: "Artha", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "북·피리", shakti: "풍요와 명성을 주는 힘" },
  { index: 23, nameEn: "Shatabhisha", nameKo: "샤타비샤", lord: "Rahu", gana: "Rakshasa", yoni: "Horse", nadi: "Vata", deity: "바루나(Varuna)", deityRole: "우주 법칙의 신 — 신비·치유·독립적 깊이", deityKw: ["신비", "치유", "독립"], motive: "Artha", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "빈 원·백 개의 별", shakti: "낫게 하는 신비의 힘" },
  { index: 24, nameEn: "Purva Bhadrapada", nameKo: "푸르바 바드라파다", lord: "Jupiter", gana: "Manushya", yoni: "Lion", nadi: "Vata", deity: "아자 에카파드(Aja Ekapad)", deityRole: "미래의 불꽃 단발 염소 — 영적 각성과 변혁", deityKw: ["영적각성", "변혁", "불꽃"], motive: "Artha", padaSigns: ["Aries", "Taurus", "Gemini", "Cancer"], symbol: "칼·두 얼굴", shakti: "영을 끌어올리는 불의 힘" },
  { index: 25, nameEn: "Uttara Bhadrapada", nameKo: "우타라 바드라파다", lord: "Saturn", gana: "Manushya", yoni: "Cow", nadi: "Pitta", deity: "아히르 부드냐(Ahir Budhnya)", deityRole: "심해 뱀의 신 — 잠재의식 심오한 지혜", deityKw: ["지혜", "통찰", "인내"], motive: "Moksha", padaSigns: ["Leo", "Virgo", "Libra", "Scorpio"], symbol: "물속의 뱀·쌍둥이", shakti: "비를 내려 안정시키는 힘" },
  { index: 26, nameEn: "Revati", nameKo: "레바티", lord: "Mercury", gana: "Deva", yoni: "Elephant", nadi: "Kapha", deity: "푸샨(Pushan)", deityRole: "여행과 여정의 신 — 양육·완성·귀환의 안내자", deityKw: ["양육", "완성", "보호"], motive: "Moksha", padaSigns: ["Sagittarius", "Capricorn", "Aquarius", "Pisces"], symbol: "물고기·북", shakti: "길을 지켜 완성하는 힘" },
];

function clampNakshatraIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n)) return null;
  const idx = ((Math.floor(n) % 27) + 27) % 27;
  return idx;
}

// 파다(1–4)의 나바암샤 라시 + 그 지배성. pada 미상(출생시각 없음)이면 null.
function getPadaDetail(index, pada) {
  const idx = clampNakshatraIndex(index);
  const p = Number(pada);
  if (idx == null || !Number.isFinite(p) || p < 1 || p > 4) return null;
  const sign = NAKSHATRA_ATTRIBUTES[idx].padaSigns[p - 1];
  return {
    pada: p,
    navamsaSign: sign,
    navamsaSignKo: SIGN_KO[sign] || sign,
    navamsaLord: SIGN_LORD[sign] || "",
  };
}

// 인덱스로 나크샤트라 속성 조회 (파생 한글 라벨 포함).
function getNakshatraAttributes(index) {
  const idx = clampNakshatraIndex(index);
  if (idx == null) return null;
  const base = NAKSHATRA_ATTRIBUTES[idx];
  return {
    ...base,
    ganaKo: GANA_KO[base.gana] || base.gana,
    nadiKo: NADI_KO[base.nadi] || base.nadi,
    motiveKo: MOTIVE_KO[base.motive] || base.motive,
    padaSignsKo: base.padaSigns.map((s) => SIGN_KO[s] || s),
    indianExpert: INDIAN_EXPERT[idx] || null, // 베다 대가 해설(전문가톤)
  };
}

export {
  NAKSHATRA_ATTRIBUTES,
  SIGN_LORD,
  SIGN_KO,
  GANA_KO,
  NADI_KO,
  MOTIVE_KO,
  clampNakshatraIndex,
  getPadaDetail,
  getNakshatraAttributes,
};
