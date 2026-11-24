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
/** 출생 입력 확대(2026-11-24 계획 2.3): 위 세 흐름의 W1 출생 입력에 태어난 장소 단계(선택, '건너뛰기')와 생년월일 한 칸
 *  (숫자만 누르면 0000.00.00 으로 형식화)을 더하고, /saju/free/ 확인 단계에 '브라우저에서만 계산' 안내를 보인다.
 *  🔴 장소는 기록·확인 표시만 한다 — 세 흐름의 엔진 입력에 넣지 않고 /api/geocode 도 부르지 않는다(계산은 지금처럼 서울 기준).
 *  false 면 W1 그대로(장소 단계 없음, 년·월·일 세 칸). */
export const GUIDED_BIRTH_INPUT_V2_ENABLED = true;

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

/** R5 서양 점성술 진입(2026-11-21 승인 "서양 점성술만 먼저"): /astrology/ 랜딩에 공통 스텝 출생 입력(W1)을 붙이고,
 *  프로필 없는 cdHomeAstroEntry 를 그 입력(/astrology/?step=name)으로 보낸다. 입력을 마치면 셸 프로필 폼에 채워 기존 저장·동의 흐름으로 이어진다.
 *  결과 화면(유료 패널 포함 셸 점성술 모달)은 그대로다. false 면 랜딩·셸 진입 모두 지금과 같다.
 *  정적 상수(js/destiny-profile.js GUIDED_ASTRO_ENABLED)와 값을 함께 바꾼다(테스트가 묶는다). */
export const GUIDED_ASTRO_ENABLED = true;

/** 6단계 R2 /saju/free/ 연결(2026-11-21 사용자 승인, 원문은 핸드오프 free-tarot-ux-revamp): section 없는 정적 셸 진입 `?action=cdOneStepFreeSajuEntry` 를
 *  처음 온 비회원(로그인 힌트·저장 프로필·이어지는 셸 흐름 표식 없음)에게만 React 가이드 흐름 /saju/free/ 로 보낸다. 추적 키는 옮긴다.
 *  index.html 인라인 `<script id="cd-free-saju-entry-route">` 의 같은 이름 상수와 값이 같아야 한다(__tests__/ui/free-saju-entry-route.test.mjs 가 묶는다).
 *  false 면 스크립트가 첫 줄에서 끝나 오늘과 같다(셸이 입력을 연다). 바꾼 뒤 npm run sync:public. */
export const FREE_SAJU_ENTRY_GUIDED_ENABLED = true;

/** R5 숙요점 진입(2026-11-21 사용자 "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘"): 서양 점성술과 같은 방식.
 *  /sukuyo/ 랜딩에 공통 스텝 출생 입력을 붙이고, 프로필 없는 cdHomeSukuyoEntry 를 /sukuyo/?step=name 으로 보낸다.
 *  결과(셸 숙요점 모달)는 그대로다. false 면 랜딩·셸 진입 모두 이전과 같다.
 *  정적 상수(js/destiny-profile.js GUIDED_SUKUYO_ENABLED)와 값을 함께 바꾼다(테스트가 묶는다). */
export const GUIDED_SUKUYO_ENABLED = true;

/** R5 베다 점성술 진입(2026-11-21 같은 승인): /vedic/ 랜딩에 공통 스텝 출생 입력, 프로필 없는 cdHomeVedicEntry 를 /vedic/?step=name 으로.
 *  결과(독립 정적 페이지 /vedic-astrology.html 로 넘기는 기존 페이로드)는 그대로다. false 면 이전과 같다.
 *  정적 상수(js/destiny-profile.js GUIDED_VEDIC_ENABLED)와 값을 함께 바꾼다(테스트가 묶는다). */
export const GUIDED_VEDIC_ENABLED = true;

/** L1 비회원 무료 결과(2026-11-21 승인 "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘", W2 와 같은 정책): /today/ 네 체계 오늘의 운세를
 *  로그인 없이 연다(시작 버튼 단계는 유지, 계산은 원래도 쿠키 없는 공개 /api/fortune/today-hub). 세션 확인은 그대로 하고 결과만 비회원에게도 연다.
 *  /manse/ 결과는 W2(FREE_RESULT_GUEST_ENABLED) 셸 흐름이라 여기서는 랜딩 안내 문구만 맞춘다. 보관함 저장·유료·이어보기(usePaidResume)는 로그인 그대로.
 *  경계는 app/_lib/free-reading-access.ts(canOpenFreeReading). false 면 /today/ 로그인 요구와 이전 문구가 그대로 돌아온다. */
export const FREE_READING_GUEST_ENABLED = true;

/** R1 무료 목록 단독 페이지(2026-11-21 사용자 "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘"): 한국어 /free/ 에 6단계 카드 목록(FREE_PROMO_CATALOG) 23개를 싣는다.
 *  켬: /free/ 색인(canonical 자기 자신)·사이트맵 등재·/ggulggul/ 무료 배너에 "무료 운세 한 페이지로 모아 보기" 링크 한 줄.
 *  false 면 /free/ 는 noindex 로 남고(리다이렉트 없음) 사이트맵·셸 링크에서 빠진다. 바꾼 뒤 npm run sync:public && npm run sitemap:generate. */
export const FREE_LIST_PAGE_ENABLED = true;

/** R5 자미두수 진입(2026-11-21 같은 승인, paid-gate-auditor 감사 CLEAR 후): 숙요점과 같은 방식.
 *  /ziwei/ 랜딩에 공통 스텝 출생 입력(장소 단계 없음), 프로필 없는 cdHomeZiweiEntry 를 /ziwei/?step=name 으로.
 *  결과(셸 자미두수 모달)와 /ziwei/chart 심화·유료 PDF 패널은 그대로다. false 면 랜딩·셸 진입 모두 이전과 같다.
 *  정적 상수(js/destiny-profile.js GUIDED_ZIWEI_ENABLED)와 값을 함께 바꾼다(테스트가 묶는다). */
export const GUIDED_ZIWEI_ENABLED = true;
