// 공통 스텝 플로우 이관 롤백 스위치(3c-A1, 2026-11-20 승인). 흐름마다 하나씩.
// false 로 바꾸고 배포하면 그 흐름만 이관 전 컴포넌트(원본 그대로)로 돌아간다. 저장 키·형식은 양쪽이 같아 기록은 유지된다.
// MOONLIT_LOTUS_ENABLED 와 같은 코드 상수 방식이다(클라이언트 원격 플래그 계층은 레포에 없다).

/** /today/ 연이 오늘의 세 장(DailyTarot → DailyTarotGuided). */
export const GUIDED_DAILY_TAROT_ENABLED = true;

/** /tarot/healing/ 태양 힐링 타로 4장(SunHealingTarot → SunHealingTarotGuided). */
export const GUIDED_HEALING_TAROT_ENABLED = true;

/** /saju/free/ 무료 명식 계산(FreeSajuForm → FreeSajuGuided, 3c-A2). */
export const GUIDED_FREE_SAJU_ENABLED = true;

/** /saju/animal-destiny/ 12운성 동물 입력(히어로·입력 카드·로딩 → AnimalDestinyGuided, 3c-A3). 결과 화면·유료 풀이 확인(loadPaid)은 원본 그대로. */
export const GUIDED_ANIMAL_DESTINY_ENABLED = true;

/** 무료 타로 결과를 캐릭터 웹툰(화자 컷)으로 보여 준다(4단계, narrator-webtoon-result-spec N1~N7). 지금은 /today/ 오늘의 세 장만.
 *  false 면 결과 화면이 이전 섹션 목록 그대로 돌아간다. 저장 키·형식은 바뀌지 않는다(화자 대사는 저장 없이 결정적으로 다시 만든다). */
export const GUIDED_WEBTOON_RESULT_ENABLED = true;

/** /yeon-star-hug/ 연이의 마음 별자리 입력(히어로·입력 패널 → YeonStarHugGuided, 3c-A4). 결과 단계에서 원본 입력 패널+결과를 그대로 그린다.
 *  false 면 원본 히어로·입력 패널이 그대로 돌아간다. 리딩 계산·별자리 신호 조회(/api/astro/western-chart)·저장 형식은 바뀌지 않는다. */
export const GUIDED_STAR_HUG_ENABLED = true;
