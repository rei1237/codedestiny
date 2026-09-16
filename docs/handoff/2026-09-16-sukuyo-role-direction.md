---
status: active
updated: 2026-09-16
next: 2단계 1~8번 완료. 후속 과제 중 대비·죽은 코드·찻집 우쇠 문구·SEO 위성 명칭·도달 불가 폴백을 처리했다. 남은 것은 i18n 거리 리터럴(단독 세션)과 결제 인벤토리 배선(승인 필요)이다.
---

# 숙요점 자리(役) 방향 정본 교정 — 1·2단계 + 후속 과제 3건 완료

작성: 2026-09-16 · 대상 브랜치: main (직접 커밋, PR 없음)

## 다음 세션 첫 문장

"숙요 자리 방향 축과 위성 명칭·도달 불가 폴백 정리까지 끝났고, 남은 것은 i18n 거리 리터럴
(단독 세션)과 결제 인벤토리 배선(승인 필요)이다."

## 1단계에서 무엇이 틀렸고 무엇을 고쳤나

증상은 "우쇠(友衰) 방향이 반대로 나온다" 였지만, 원인은 문구가 아니라
**거리→자리 배정표가 전통 삼구(三九) 순서와 어긋난 구조적 오류**였다.

정본 `worker/lib/sukuyo-relation-core.js` 의 `relationFromForwardDistance` 에서
`bRole`(상대가 나에게 갖는 자리)이 전통 순서와 맞는 구간은 우쇠(+2/+7)뿐이었고,
영친·안괴·성위·업태 8개 구간이 전부 뒤집혀 있었다. 같은 표를 `judgeDayFortune`
이 쓰기 때문에 **오늘의 운세·숙요 달력의 길흉도 18개 거리에서 반대**였다.

전통 순서(순행 d 칸에 놓인 상대의 자리):
`0命 1榮 2衰 3安 4危 5成 6壞 7友 8親 9業 … 18胎` (9칸 주기)
역전 짝: 명↔명 · 영↔친 · 우↔쇠 · 안↔괴 · 성↔위 · 업↔태

고친 것:
1. 정본 배정표 8개 구간 `aRole`/`bRole` 교환 (우쇠 2줄은 원래 맞아서 유지).
2. 우(友)/쇠(衰) 자리 해설 재저작 — **友 = 관계 유지에 먼저 에너지를 쓰다
   소모되는 자리, 衰 = 그 관심을 받아들이는 자리**. 서비스 규칙은
   "쇠가 우에게 소모를 발생시키는 방향" 으로 통일했다. 나머지 9개 자리는 그대로.
3. 클라 미러(`js/saju-engine-tarot-sukuyo-quantum.js` 의 `syWheelRelationFromDistance`,
   `SY_ROLE_PROFILE`)와 `components/fortune/SukuyoWheel.tsx` 를 정본과 일치시킴.
4. 업태 서사의 채무자/채권자 라벨을 `D === 18` 기준으로 교정.
   영친·우쇠·안괴의 `base.pastLife` 를 역할별로 분기(누가 먼저 내어놓았고 누가
   그 곁에서 자랐는지, 누가 흔들었고 누가 견뎠는지).
5. `directionFromD` 를 하드코딩 거리표에서 정본 `aRole` 파생으로 교체.
6. 유료 인연 레이더 우쇠 톤에서 "한쪽의 희생" 의 주체를 友 로 명시.

커밋 4개: `2302c3436` → `b704cc32e` → `9bcfbdd63` → `90c6243d8`.
회귀 시 해당 커밋만 `git revert` 한다(조건문·오버라이드로 덧대지 않는다).

## 고정해 둔 것 (깨면 바로 빨개진다)

- `__tests__/worker/sukuyo-relation-core.test.js` — 729조합 전수 검증 6종:
  bRole↔전통 순서, aRole=역거리 자리이자 역전 짝, 전 조합 산출 완결성,
  A/B 역전 시 관계 동일·자리 역전, 거리 라벨 규칙, `judgeDayFortune` 27거리 등급.
  실행: `npx cross-env NODE_OPTIONS=--experimental-vm-modules jest __tests__/worker/sukuyo-relation-core.test.js --testEnvironment node`
- `scripts/verify-sukuyo-role-direction.mjs` — 7번 검사로 `SukuyoWheel.tsx`
  파리티를 추가(앵커 없으면 fail-closed). 변이로 무는 것 확인함.

## 주의 — 세 곳이 같은 표를 따로 들고 있다

정본 1개 + 클라 미러 1개 + React 휠 1개. 클라는 브라우저 전역 스크립트라 워커
ESM 을 import 할 수 없어 저작이 중복돼 있고, `SY_ROLE_PROFILE` 은 정본과
**글자까지 같아야** 가드를 통과한다. `public/js/...` 는 직접 편집 금지,
`npm run sync:public` 산출물을 커밋한다(정적 셸 빌드 해시가 함께 바뀌므로
이어서 `npm run sitemap:generate` 도 필요하다).

## 2단계 (사용자 요청 원문 기준) — 1~7번 완료, 8번만 남음

### 완료 — 6번(판정 payload) · 5번 상단 배지/요약 (커밋 2b27a7e3b, 2751b609a)

`js/saju-engine-tarot-sukuyo-quantum.js` 의 `syBuildRelationDirection(D)` 가 27거리
어디서든 아래를 한 번에 돌려준다. 렌더러·요약·프롬프트는 다시 판정하지 않는다.

```
relationType / relationTypeHan
personARole(나) / personARoleHan / personBRole(상대) / personBRoleHan
distance { forward, reverse, shortest, tier, label }
direction { code: a-to-b | b-to-a | mutual, arrow, label, color }
interpretationKey   // 예: '우쇠:우:near'
headerBadge         // 예: '友衰 · 근거리'
roleBadge           // 예: '나는 友 / 상대는 衰'
```

- `SukuyoCompatEngine.resolve` 가 `resolved.relationDirection` 으로 싣는다.
- 결과 상단 hero 에 배지 2개(`data-sy-role-badge`), 본문 첫 섹션에 판정 요약
  5줄(`data-sy-relation-summary`)이 들어간다.
- `directionFromD` 의 별도 하드코딩 표를 지웠다. 業/胎 가 '상호작용' 으로 뭉개지던
  것이 순행 +18 나=業 기준으로 갈린다(의도한 표시 변경).
- `verify:sukuyo-role-direction` 8번 검사가 이 payload 를 27거리 전수로 문다
  (자리·거리·방향·해설 키 + A/B 역전 + 화면 마커). 변이 테스트로 무는 것 확인.
- `interpretationKey` 가 앞으로 쓸 해설 테이블의 조회 키다. 남은 1~4번 재저작은
  이 키로 본문을 꺼내는 형태로 붙이면 되고, 새 판정 로직을 만들 필요가 없다.

### 완료 — 1~4번(관계 해설 14장) · 7번(전생 서사) (커밋 0aaae168c, d260d0783, 78d0683c1, 529ae16b7)

본문을 **자리 단위로** 저작했다. `SY_SEAT_CHAPTERS` 는 11개 자리 × 13개 챕터,
`SY_SEAT_PASTLIFE` 는 11개 자리 × 장면·흔적·과제다. 자리가 역전 짝이므로(명↔명, 영↔친,
우↔쇠, 안↔괴, 성↔위, 업↔태) 나 중심 = 내 자리 본문, 상대 중심 = 상대 자리 본문이
**구조적으로** 보장된다 — 같은 문장을 두 번 쓰지 않으며 손으로 맞출 일도 없다.
해설 키 25종(27거리에서 실제로 도달하는 수)마다 따로 쓰지 않아도 된 이유가 이것이다.

- 조립기는 `syBuildRelationChapters(payload)` / `syBuildPastLifeChapter(payload)` 이고,
  둘 다 판정하지 않는다. 자리·거리·방향은 전부 `payload` 에서만 읽는다.
- 거리는 `SY_TIER_MODIFIER` 로 수식자화했다(same/near/middle/far × 5축 + 종합 note).
  같은 우쇠도 근거리와 원거리에서 다른 축 문장을 받는다(2번).
- 어조는 `최악·무조건·반드시·절대·틀림없·100%` 를 금지어로 두고 가드가 훑는다(4번).
  되살린 `archiveStory`/`mission` 원문 3곳의 단정 어조도 함께 낮췄다.
- 전생(7번)은 원래 `base.pastLife`/`archiveStory`/`mission` 로 저작돼 있었지만 **어떤
  화면도 읽지 않아 사실상 사라져 있었다**(grep 으로 소비자 0 확인). 자리별 장면·흔적·
  과제를 더해 기본 궁합 안에서 되살렸다. 유료 인연 레이더의 `relationToneMap.usei` 는
  1단계에서 이미 友 쪽을 주체로 명시해 두어 무료 기본 궁합과 방향이 같다 — 결제 게이트·
  피처 키·가격은 건드리지 않았다.
- 화면 마커: `data-sy-relation-chapters`, `data-sy-past-life`.
- 가드 9·10번이 27거리 전부를 돌며 조립·시점 분리·어조·마커를 대조한다. 각각 단정 어조
  주입 / 상대 본문을 내 자리로 바꾸기 / 마커 리네임 변이로 무는 것을 확인했다.

### 2단계 항목 (1~8번 전부 완료)

1. (완료) 관계 6종 × 역할 2 × 거리 3 해설 전면 재저작. 각 관계마다
   본질 → 나의 역할 → 상대의 역할 → 끌리는 이유 → 감정의 흐름 → 시간에 따른 변화
   → 연애 → 장기/결혼 → 갈등이 생기는 방식 → 화해 → 친구 → 직장/사업 → 주의점
   → 잘 쓰는 법. 분량 채우기가 아니라 "왜 그런 관계가 되는가" 가 이어지게 쓴다.
2. (완료) 근·중·원 거리를 한 줄 옵션이 아니라 **수식자**로. 같은 우쇠도 근거리와
   원거리에서 다르게 읽혀야 한다(친밀도·형성 속도·반복 접촉·거리감·유지 특성).
3. (완료) 나 중심 해석과 상대 중심 해석을 분리해 보여 준 뒤 종합한다.
4. (완료) 단정 어조 제거 — "최악의 궁합", "무조건", "반드시" 금지. 3단 구조
   (숙요에서는 이렇게 해석한다 → 실제 관계에서는 이렇게 나타날 수 있다 →
   특히 이런 상황에서 체감이 강해질 수 있다).
5. (완료) 결과 화면: 상단에 `[友衰 · 근거리]` 와 `[나는 友 / 상대는 衰]`, 이어서 3~5줄
   핵심 요약, 그 아래 챕터형 상세. 방향 화살표·색상용 데이터를 payload 에 싣는다.
6. (완료) payload 를 `relationType / personARole / personBRole / distance / direction /
   interpretationKey` 로 분리하고, 방향 맹목인 `SukuyoCompatEngine.resolve`
   (js:11737~11949) 를 방향 인지 구조로 교체한다.
7. (완료) 전생 서사 확장 — 1단계에서는 방향 분기만 넣었다. 유료 인연 레이더
   (`syBuildPastLifeArchive`, 24종 아카이브)와 무료 기본 궁합의 `pastLife` 가
   같은 방향을 말하는지 함께 본다. **결제 게이트·피처 키·가격은 건드리지 않는다.**
8. (완료) 판정은 끝까지 엔진이 한다. LLM 에는 확정된 구조화 데이터만 넘기고 문장만
   맡긴다.

### 완료 — 8번(LLM 경계) (커밋 c7cb974fc)

"프롬프트에 이미 규칙이 있다"는 전제가 틀렸다. 실제 결함은 프롬프트가 아니라 **워커가
방향을 다시 판정하고 있었던 것**이다. `worker/routes/sukuyo.js` 가 거리→방향 하드코딩 표를
따로 들고 있었고, 27거리 중 **20거리가 정본 자리표와 불일치**했다(측정값).

- 예: D=2 우쇠, 나=우 → 정본은 "내가 상대에게 작용" 인데 워커는 "상대가 나에게 작용".
- D=9/18 업태는 방향이 통째로 "상호작용" 으로 뭉개졌다.
- 그 값이 `directionReading` · `relationshipRhythm` · `pastLifeStory` · LLM `aiFollowupPrompt`
  로 전부 흘러갔다. 즉 LLM 에 넘기던 "확정된 구조화 데이터" 자체가 틀린 값이었다.

고친 방식:
- 정본 `worker/lib/sukuyo-relation-core.js` 에 `directionFromForwardDistance()` 와
  `SUKUYO_ROLE_DIRECTION` / `SUKUYO_DIRECTION_LABEL` 을 추가했다. 방향은 **자리에서 파생**하며
  거리표를 다시 만들지 않는다.
- `worker/routes/sukuyo.js` 의 하드코딩 표를 제거하고 정본 함수를 쓰게 했다. 결과에
  `myRole` / `partnerRole` 을 실어 프롬프트가 자리를 전제로만 쓰게 했다.
- `normalizePastLifeDistance` 는 일부러 그대로 뒀다 — 정본이 항상 `distanceLabel` 을 주므로
  폴백을 건드리면 점수만 흔들린다.
- 가드 11번 추가: 27거리 정본↔클라이언트 방향 대조 + 워커 라우트가 `directionFromForwardDistance`
  를 쓰는지 / 거리표가 되살아나지 않았는지 / 프롬프트가 재계산 금지 문구와 자리값을
  싣는지. 변이 3종(표 복원, 함수 제거, 프롬프트 문구 삭제)으로 무는 것을 확인했다.

### 실제 화면 검증 (390px, Playwright)

4개 관계를 실제로 렌더해 확인했다 — D=2 우쇠/근거리, D=0 명/동숙, D=18 업태/특수관계,
D=13 성위/원거리. 전부 14장 + 전생 섹션이 나오고 가로 넘침 없음. 본문 대비 10~15:1.

- **주의**: 결과 패널은 15,425px 인데 모달 시트 `#sukuyoModalSheet` 가 846px 스크롤
  컨테이너다. Playwright element screenshot 은 시트 밖을 못 찍어 "y=847 에서 잘린다" 는
  오판을 부른다. 시트 `scrollTop` 을 옮겨 뷰포트 타일로 찍어야 한다.
- 화면에서 실제로 찾은 결함 1건은 고쳤다 — 히어로 배지 알약 배경이 `rgba(2,6,23,.28)` 이라
  테마 그라디언트가 비쳐 방향 배지(노랑)가 2.40~2.88:1 이었다. `.62` 로 올려
  5.60~9.65:1 로 통과(커밋 026d85bea, `js/` 수정 후 `npm run sync:public`).

## 후속 과제 — 2026-09-16 후속 세션에서 3건 처리

### 완료 — 히어로·다이어그램 대비 (커밋 55f3b7416)

파스텔 팔레트 6종 전부에서 깨져 있었다. 팔레트별로 글자색을 분기하는 대신
히어로 배경 최상단에 `rgba(2,6,23,.52)` 스크림을 깔아 **배경 휘도에 천장**을 뒀다.
키커 `.68→.92`, 부제 `.82→.9`, `.sy-compat-fate-wrap` 바탕 `.22→.42`.
다이어그램은 `fgOrbMe`/`fgOrbPartner` 를 밝은 유리에서 어두운 원반으로 뒤집었다 —
라벨이 밝은 글자라 바탕이 어두워야 읽힌다. 금색·핑크 글로우 링이 경계를 유지한다.

실측 방식(다음에 같은 축을 볼 때 재사용):
원본 `js/saju-engine-tarot-sukuyo-quantum.js` 에서 CSS 규칙과 SVG 를 **문자열로 추출**해
하네스를 짜면 소스와 어긋나지 않는다. 팔레트 6종 × 측정점 9곳을 Playwright 로 렌더하고
글자만 `color:transparent`(SVG 는 `fill:transparent`)로 지운 뒤 sharp 로 그 자리 픽셀을
읽어 배경색을 얻고, CSS 에 선언된 잉크색과 합성해 대비를 낸다.
🔴 `visibility:hidden` 을 쓰면 배지처럼 **자기 배경을 가진 요소의 배경까지 사라져** 오측정이 난다
(실제로 배지가 1.83:1 로 잘못 나왔고, 잉크만 투명하게 바꾸니 8.19:1 이었다).
결과: 변경 전 39 FAIL → 변경 후 0 FAIL. 최저 키커 6.31 / 제목 7.03 / 부제 5.95 / 노드 9.84:1.

### 완료 — 죽은 코드 2건 삭제 (커밋 054316fd3)

- `lib/sukuyo-engine-server.ts` 의 `calcRelationType` + `RELATION_TYPES` 20줄.
  같은 파일의 `calcSukuyoForServer` 는 살아 있다(`app/destiny-compass/_engine/adapters/sukuyoAdapter.ts`,
  `lib/famous-saju/celebrity-multi-system.ts`, `verify:famous-saju-multisystem`). 건드리지 말 것.
- `worker/lib/sukyo-report-engine.js`(823줄)와 전용 테스트(113줄) — 같은 커밋에서 함께 삭제.

🔴 이름 함정: 유료 `featureKey` **`sukyo_yearly_fortune_unlock`** 이 같은 `sukyo` 철자를 쓴다.
파일 삭제와 무관하며 `sukyo` 일괄 치환·정리는 결제 키를 깨뜨린다.
`docs/payments/payment-*-inventory.json` 에 남은 경로 문자열은 `scripts/audit-payment-p0-inventory.mjs`
**생성물**이라 손으로 고치지 않았다.

### 완료 — 찻집 궁합 우쇠 문구 정본화 · 위성 키 삭제 (커밋 73463edb0)

같은 관계 해설표가 **두 곳**에 글자까지 같게 있었다 —
`src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts` 의 `RELATION_GUIDE` 와
`worker/routes/fortune-tea-house.js` 의 `FORTUNE_TEA_SUKUYO_RELATION_GUIDE`. 둘 다 고쳤다.

- 우쇠를 정본 `SUKUYO_ROLE_PROFILES` 에 맞춰 다시 썼다: 먼저 다가가는 자리(友)가
  연락·조율을 도맡다 지치고, 받아들이는 자리(衰)는 편안함에 익숙해지기 쉽다. 이전 문안의
  "비교·자존심·주도권 싸움" 은 정본에 없는 결이라 걷어냈다. 같은 화면의 자리 라벨은
  이미 `describeSukuyoDirectionalRelation` 으로 정본에서 오고 있었다 — 해설만 어긋나 있었다.
- 폐기 명칭 `위성` 키 삭제. 정본 `relationFromForwardDistance` 는 6번째 관계를 성위로만
  내보내고 전수 테스트가 위성 부재를 단언한다. 레거시 토큰을 성위로 정규화하는
  `worker/routes/sukuyo.js:961` · `fortune-tea-house.js:2206` 은 **살아 있는 정규화라 유지**했다.
- 이 표들은 `verify:sukuyo-role-direction` 이 보지 않는다(가드 범위는 정본·클라 미러·휠·워커
  라우트까지다). 찻집 문안을 또 고치면 직접 읽어 대조해야 한다.
- 사이트맵 원장은 `/fortune-tea-house/` 서명 1건만 갱신됐다(어댑터가 그 라우트 import 클로저 안).

### 완료 — SEO·인사이트 문안의 폐기 명칭 정리 (커밋 8fec9124a)

- `lib/seo-landing-pages.js` 숙요 랜딩 2문단과 `app/insights/InsightTopicArchive.jsx` 숙요 허브 1문단의
  `위성` 을 `성위` 로 고쳤다. 같은 목록에 정본에 없는 `명성` 도 섞여 있어 `명` 으로 함께 바로잡고,
  나열 순서를 같은 페이지 본문과 맞췄다(명·업태·영친·우쇠·안괴·성위).
- 🔴 steps 문장은 `shellRuntime.f2757` 의 ko 원문이라 리터럴만 바꾸면 11개 로케일이 한국어로 떨어진다.
  `i18n/authored/shellRuntime-55.json` 을 ko·en·ja·zh-CN·zh-TW 저작 + 7벌 영어 복사로 다시 쓰고
  `i18n-merge-authored --namespace shellRuntime` 로 병합했다(사전 12개 각 1줄).
- 사이트맵 원장 26건 갱신 — 랜딩 허브와 /insights/*/ 뿐이다.
- `docs/adsense/baseline/urls.json` · `docs/seo/BROWSER_VALIDATION.json` 에 옛 문장이 남아 있지만
  `seo-search-browser-check.mjs` 의 스냅샷이라 손으로 고치지 않았다.
- 남은 `위성` 은 전부 다른 뜻이거나 살아 있는 정규화다: 케메트 "위성 검색", 퓨전 오브 CSS 주석,
  가사, 천문 기사, `js/…quantum.js:10246,14291` · `worker/routes/sukuyo.js:961` ·
  `fortune-tea-house.js:181,2200` 레거시 토큰 흡수.

### 완료 — sukuyo-ai-calculation 관계명 폴백 삭제 (이 커밋)

- `buildRoleGuide` 는 비공개 함수이고 유일한 호출부는 같은 파일의 `buildSukuyoAiCompatibility` 다.
  입력은 항상 `relationFromForwardDistance(0..26)` 산출값이라 "구버전 payload" 가 들어올 경로가 없다.
- 실측: 27거리 × aRole/bRole 전부 `SUKUYO_ROLE_PROFILES[role].advice` 존재(누락 0).
  폴백 문구 6줄은 소스·`__tests__`·`scripts/verify-*`·미러 어디에도 참조 없음(git grep).
- 관계명 분기 6줄과 쓰지 않던 `relationType`/`shortestDistance` 인자를 지웠다. 출력은 변하지 않는다.
  주석의 안괴 예시도 정본 순서(순행 3 → 괴/안)로 바로잡았다.
- 사이트맵 원장은 이 파일을 import 하는 `/fortune-tea-house/` · `/fortune/prompt-hub/` 서명 2건만 갱신.

## 아직 남은 후속 과제

- 거리 판정이 한글 리터럴(`'근거리'`) 비교로 프론트 58곳에 흩어져 있어
  i18n 치환 시 깨질 구조. 단독 세션 권장.
- `scripts/audit-payment-p0-inventory.mjs` 가 `package.json`·워크플로 어디에도 배선돼
  있지 않아 `docs/payments/payment-*-inventory.json` 이 트리와 어긋나도 아무도 알려주지 않는다.
  이번 삭제와 무관하게 존재하는 구멍이다. 🔴 배선은 새 CI 게이트 추가라 **사용자 승인 1회가
  먼저** 필요하다 — 묻지 않고 붙이지 말 것.

## 세션 중 확인한 하네스 함정

- `npx jest __tests__/worker/fortune-today-hub.route.test.js` 를 직접 돌리면 7건이 깨진다.
  정규 러너(`check:fast` → `scripts/run-mock-tests.mjs jest`)에서는 274 스위트 3807건 전부 통과한다.
  **워커 라우트 테스트를 맨 jest 로 돌린 실패는 결함 증거가 아니다.**
- 같은 체크아웃에서 다른 세션이 동시에 쓰고 있으면 `sitemap:generate` 원장이 그 세션의
  미커밋 파일까지 서명에 담는다(이번에 35건이 흔들려 04bef2bea 로 되돌렸다).
  `git add` 전에 `git status` 로 내 파일만 골라 담아야 한다.
- 옆 세션의 워크트리 머지는 셸 캐시 키를 낡게 만든다 — 머지 직후 `sync:public` +
  `sitemap:generate` 재실행이 필요하다(42daa5a92).
