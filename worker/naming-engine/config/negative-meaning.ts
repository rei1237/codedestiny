// 뜻이 이름에 맞지 않는 글자 거르기(설계서 §7 어감·실용의 보강, Phase 3 설계 선택 — 자문 검수 대상).
// 그 음의 **첫째 훈**(쉼표 앞)의 뜻풀이 말(끝 음 글자를 뗀 부분)이 아래 목록과 정확히 같으면 추천 후보에서 뺀다.
// 둘째 이하 훈은 보지 않는다(二 "두 이, …, 의심할 이" 같은 부차 뜻으로 흔한 글자를 잃지 않기 위해).
// 불용한자 관행(cautions)과는 별개다 — 그쪽은 경고·감점만 한다(§13.B.7).
// 사용자가 직접 고정한 글자(돌림자)에는 적용하지 않는다.

export const NEGATIVE_GLOSSES: ReadonlySet<string> = new Set([
  "죽을", "죽일", "주검", "시체", "송장", "병", "병들", "앓을", "아플", "근심", "슬플", "울", "곡할",
  "미칠", "도둑", "훔칠", "거짓", "속일", "망할", "잃을", "해칠", "재앙", "원망할", "원수", "미워할",
  "더러울", "똥", "오줌", "귀신", "악할", "흉할", "가난할", "천할", "배반할", "음란할", "간사할",
  "독", "형벌", "감옥", "부끄러울", "욕될", "싸울", "깨뜨릴", "무너질", "쇠할", "외로울", "과부",
  "고아", "괴로울", "괴이할", "어지러울", "어리석을", "게으를", "교만할", "탐할", "사나울", "성낼",
  "추할", "흉악할", "모질", "해로울", "멸할", "끊을", "버릴", "잔인할", "방해할", "미혹할",
  // 2026-10-04 Phase 6.5 표본 검수 보강(泥 진흙 반복 등)
  "진흙", "막힐", "허망할", "요괴로울", "투기할", "범할", "몸 파는 여자", "죽은 어미", "기생", "종", "계집종", "여자종",
  "아첨할", "깔볼", "업신여길", "샘낼", "창피줄", "수척할", "싫어할", "비틀거릴", "머뭇거릴", "불깔", "번민할", "아닐",
]);

/**
 * 첫째 훈이 한쪽 성별의 친족·호칭인 글자(妻 아내, 娘 아가씨, 夫 지아비 …)는 반대 성별 이름에서 뺀다.
 * 성별 "N"(정하지 않음)에는 적용하지 않는다. 수리의 성별 차등 해석(§5 genderNote, 기본 끔)과는 별개다.
 */
export const GENDERED_GLOSSES: Readonly<Record<"M" | "F", ReadonlySet<string>>> = {
  // 남자 이름에서 뺄 뜻(여성 호칭)
  M: new Set(["아내", "계집", "아가씨", "여자", "어미", "며느리", "첩", "할미", "누이", "손윗누이", "왕비", "부인", "계집아이"]),
  // 여자 이름에서 뺄 뜻(남성 호칭)
  F: new Set(["사내", "지아비", "남편", "사위", "아비", "할아비", "아재비", "수컷"]),
};

/** 병들 녁(疒) 부수 — 거의 전부 병 이름이다(癩 "약물 중독"·瘰 "연주창"). 성별과 무관하게 뺀다. */
export const DISEASE_RADICAL = 104;

/** 계집 녀(女) 부수. 남자 이름에서는 아래 중립 글자만 남기고 뺀다(帝媛 같은 조합 — 媛 "아리따운 여자"). */
export const FEMININE_RADICAL = 38;
export const NEUTRAL_FEMININE_RADICAL_CHARS: ReadonlySet<string> = new Set(Array.from("好如始威委妥"));

// 훈 문자열은 번들 데이터에서만 오므로(약 1만 종) 요청 사이에 메모해 둔다 — 요청마다 1만 번 split 하지 않게.
const glossMemo = new Map<string, string>();

/**
 * 첫째 훈 한 토막. "막힐 니, 진흙 니" → "막힐 니". 한자가 든 토막("峯과 同字", "勳의 古字")은 이체자 안내라 뜻이 아니므로
 * 건너뛴다 — "峯과 同字, 봉우리 봉" → "봉우리 봉". 모든 토막에 한자가 있으면 첫 토막. 훈이 없으면 "".
 */
export function firstHun(hun: string | null): string {
  if (!hun) return "";
  const parts = hun.split(",").map((part) => part.trim());
  return parts.find((part) => part && !/\p{Script=Han}/u.test(part)) ?? parts[0];
}

/** 첫째 훈의 뜻풀이 말. "죽을 사, 주검 사" → "죽을". 훈이 없으면 "". */
export function primaryGloss(hun: string | null): string {
  if (!hun) return "";
  let gloss = glossMemo.get(hun);
  if (gloss === undefined) {
    const first = firstHun(hun);
    const space = first.lastIndexOf(" ");
    gloss = space > 0 ? first.slice(0, space).trim() : first;
    glossMemo.set(hun, gloss);
  }
  return gloss;
}

export function hasNegativeMeaning(hun: string | null): boolean {
  return NEGATIVE_GLOSSES.has(primaryGloss(hun));
}

export function mismatchesGender(hun: string | null, gender: "M" | "F" | "N"): boolean {
  return gender !== "N" && GENDERED_GLOSSES[gender].has(primaryGloss(hun));
}

export function feminineCharForMale(ch: string, radical: number, gender: "M" | "F" | "N"): boolean {
  return gender === "M" && radical === FEMININE_RADICAL && !NEUTRAL_FEMININE_RADICAL_CHARS.has(ch);
}
