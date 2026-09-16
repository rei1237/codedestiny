---
status: active
updated: 2026-09-16
next: 본문의 2단계 범위에 따라 관계 해설 재저작과 결과 화면 개편을 진행한다.
---

# 숙요점 자리(役) 방향 정본 교정 — 1단계 완료 / 2단계 인수인계

작성: 2026-09-16 · 대상 브랜치: main (직접 커밋, PR 없음)

## 다음 세션 첫 문장

"숙요점 2단계 — 관계 6종 × 역할 2 × 거리 3 해설 전면 재저작과 결과 화면 개편을
`docs/handoff/sukuyo-role-direction.md` 의 2단계 항목대로 시작한다."

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

## 2단계 (이번 범위 밖 — 사용자 요청 원문 기준)

1. 관계 6종 × 역할 2 × 거리 3 해설 전면 재저작. 각 관계마다
   본질 → 나의 역할 → 상대의 역할 → 끌리는 이유 → 감정의 흐름 → 시간에 따른 변화
   → 연애 → 장기/결혼 → 갈등이 생기는 방식 → 화해 → 친구 → 직장/사업 → 주의점
   → 잘 쓰는 법. 분량 채우기가 아니라 "왜 그런 관계가 되는가" 가 이어지게 쓴다.
2. 근·중·원 거리를 한 줄 옵션이 아니라 **수식자**로. 같은 우쇠도 근거리와
   원거리에서 다르게 읽혀야 한다(친밀도·형성 속도·반복 접촉·거리감·유지 특성).
3. 나 중심 해석과 상대 중심 해석을 분리해 보여 준 뒤 종합한다.
4. 단정 어조 제거 — "최악의 궁합", "무조건", "반드시" 금지. 3단 구조
   (숙요에서는 이렇게 해석한다 → 실제 관계에서는 이렇게 나타날 수 있다 →
   특히 이런 상황에서 체감이 강해질 수 있다).
5. 결과 화면: 상단에 `[友衰 · 근거리]` 와 `[나는 友 / 상대는 衰]`, 이어서 3~5줄
   핵심 요약, 그 아래 챕터형 상세. 방향 화살표·색상용 데이터를 payload 에 싣는다.
6. payload 를 `relationType / personARole / personBRole / distance / direction /
   interpretationKey` 로 분리하고, 방향 맹목인 `SukuyoCompatEngine.resolve`
   (js:11737~11949) 를 방향 인지 구조로 교체한다.
7. 전생 서사 확장 — 1단계에서는 방향 분기만 넣었다. 유료 인연 레이더
   (`syBuildPastLifeArchive`, 24종 아카이브)와 무료 기본 궁합의 `pastLife` 가
   같은 방향을 말하는지 함께 본다. **결제 게이트·피처 키·가격은 건드리지 않는다.**
8. 판정은 끝까지 엔진이 한다. LLM 에는 확정된 구조화 데이터만 넘기고 문장만
   맡긴다(프롬프트에 이미 재계산 금지 규칙이 있다).

## 후속 과제로만 남긴 결함 (이번 변경과 무관, 고치지 않음)

- `src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts:65-78` —
  폐기 명칭 `위성` 키가 `성위` 와 같은 내용으로 중복. :47-52 의 우쇠 설명
  (주도권 싸움/경쟁심)이 정본의 우쇠와 결이 다르다.
- `lib/sukuyo-engine-server.ts:333-350` `calcRelationType` — `Math.abs` 로 방향이
  소실된 별개 체계이며 호출부가 없다(죽은 코드).
- `worker/lib/sukyo-report-engine.js` — 프로덕션 import 없이 테스트만 물고 있는
  고아 모듈(823줄), `:353` 에 `위성` 잔존.
- 거리 판정이 한글 리터럴(`'근거리'`) 비교로 프론트 20곳 이상에 흩어져 있어
  i18n 치환 시 깨질 구조.
