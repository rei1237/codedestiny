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

/** W2 비회원 무료 결과(2026-11-21 승인, D12 해제): 정적 무료 만세력(`js/saju-engine.js` 같은 이름 상수)가 결과 직전 로그인 벽을 건너뛰고,
 *  무료 만세력 안내 문구가 "로그인 없이"로 바뀐다. false 면 로그인 벽과 이전 문구가 그대로 돌아온다. 정적 상수와 값을 함께 바꾼다(테스트가 묶는다). */
export const FREE_RESULT_GUEST_ENABLED = true;

/** 공용 출생 입력 묶음(W1, app/components/guided-flow/birth/)을 흐름마다 켠다. 바깥 흐름 플래그가 켜져 있을 때만 의미가 있다.
 *  false 면 그 흐름은 W1 이전의 공통 플로우 입력 단계(생년월일 한 칸·type=time 등)로 돌아간다. 단계 id·flowId·엔진 입력·결과·저장 형식은 같다. */
/** /saju/free/ 생년월일 → 달력 → 시각 → 확인 요약. */
export const GUIDED_BIRTH_FREE_SAJU_ENABLED = true;
/** /saju/animal-destiny/ 이름 → 성별 → 생년월일 → 달력 → 시각 → 확인 요약(저장 프로필 고르기 포함). */
export const GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED = true;
/** /yeon-star-hug/ 감정 다음 이름 → 생년월일 → 시각 → 확인 요약(저장 프로필 고르기 포함), 그 뒤 별자리·고민은 그대로. */
export const GUIDED_BIRTH_STAR_HUG_ENABLED = true;

/** /yeongnyangi/room/ 영냥이 출석 운세 16종의 고르기·질문(카테고리 칩·질문 폼 → FreeFortuneGuided, 3c-A5). 출석 16종이 열린 로그인 사용자에게만 켜진다.
 *  false 면 원본 칩·질문 폼이 그대로 돌아간다. 출석·멸치·열기(/api 출석 게이트)·질문 저장·결과 본문은 양쪽이 같은 원본 상태와 호출을 쓴다. */
export const GUIDED_YN_FREE_FORTUNE_ENABLED = true;

/** 6단계 무료 운세 한 목록(2026-11-21): FreePromoBanner 의 "무료 운세 전체 보기" 펼침을 카드 목록(포스터·한 줄 설명·무료 배지·소요 시간)으로 그린다.
 *  홈 / 와 SeoLandingTemplate 무료 랜딩이 같은 컴포넌트를 쓴다. 주소·data-cd-free-promo-item·aria-current 는 칩과 같다.
 *  false 면 이전 칩 목록 마크업이 그대로 돌아간다. 정적 셸 /ggulggul/ 배너는 이 플래그와 무관하다. */
export const GUIDED_FREE_LIST_ENABLED = true;

/** 5단계 ①(2026-11-21 승인): /tarot/mingri/ 페이지 안에서 셸 무료 세 장(분야 → 셔플 → 78장 중 세 장 → 펼치기 → 풀이)을 바로 진행한다
 *  (MingriTarotGuided, 풀이는 브라우저 결정론 엔진 master-reading.mjs). false 면 랜딩이 이전 그대로(실행 버튼 → 셸 openTarotModal).
 *  셸 모달·한 장 리딩·결제 후 리딩은 양쪽 모두 그대로 남는다. 정적 셸 상수 MINGRI_TAROT_ROUTE_ENABLED 와 값을 함께 바꾼다(R4-3). */
export const GUIDED_MINGRI_TAROT_ENABLED = true;
