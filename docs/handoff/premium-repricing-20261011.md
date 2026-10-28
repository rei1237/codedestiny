---
status: done
updated: 2026-10-12
next: "후속 과제는 docs/handoff/premium-repricing-followups-20261012.md 로 옮겼다 (④(c) 대운·종합 서버 이전 포함)."
---

# [마케팅 지시서] 프리미엄 라인 전면 개편 — 가격 인상 + 무료 범위 축소

## 2026-10-12 사용자 추가 지시 (아래 기존 무료 범위보다 우선)

- **이번 세션에서 ①·② 운영 승격을 승인받아 완료했다.** Pages·Worker 모두 `155bff95f16f092e266cd06be1a2fea504496c4e`, release `38171622530` 성공.
- **실패·미흡 결과의 최소 비용 재검수도 승인받았다.** 생성 22회, 예상 USD 0.1037789로 종료했다. 추가 호출 없이 결과를 보존한다.
- **이후 사용자 선택: 이번에는 운영 측정·상세페이지 통합·결과 품질 수정을 마무리하고 ③·④는 다음 작업으로 남긴다.** 운영 승격 승인은 반복 요청하지 않는다. 이번 추가 품질 커밋은 위 승격 이후 생성되었다.
- 측정·수정·전체 출력 위치는 `docs/product-details/quality-recheck-20261012.md` 참조.
- 이번 추가 코드 마지막 커밋 `82d70c387`: 상세 통합 `5cc20e63c`, 결과 품질 `aad063360`·`cc7bb1d7b`, 상세 발췌·증빙 `432ff7739`, 분량 회귀 검사 `82d70c387`. 이 절 이후 문서 전달 커밋은 `git log -1 --format=%H -- docs/handoff/premium-repricing-20261011.md`로 확인한다.
- 로컬 검증: `npm test`와 유료 가드 87개 통과, 옛 분량 검사 1개 보정 후 1,273개 확인 통과. 미실행 잔여 lint·typecheck·Worker 빌드·가드도 통과. pre-push 미러·사이트맵 검증 통과. 최초 fast 실패와 보정 결과는 검수 보고서에 구분했다.
- 전달: 이 문서를 포함해 `git push origin HEAD:main`으로 전송한다. 다음 세션 첫 명령은 `git fetch origin main` 후 `gh run list --workflow pr-ci.yml --branch main -L 1 --json status,conclusion,headSha,url`로 최종 main CI 확인이다. 진행 중인 ③·④를 위해 이 워크트리와 활성 인수인계는 유지하며, 이번 세션의 임시 측정 파일은 검수 디렉터리로 옮긴 뒤 제거한다.

- **최애운명과 운명의 꽃을 다시 유료로 전환한다.**
- 서비스에서 `무료`로 남길 수 있는 것은 **영냥이**와 **꽃돼지 종합 운세 프롬프트 생성**뿐이다.
- 남는 무료 이용도 출석을 전제로 **3일 출석당 1회** 제공한다.
- 이 출석·차감 구현은 커밋 묶음 ③에서 처리한다. 커밋 묶음 ②에서는 그 외 무료 노출과 우회 경로를 제거하고 유료 게이트를 복구한다.

작성: 마케팅 담당 / 2026-10-11 / 대상: Codex (구현 + Google Play Console 상품 등록)
레포: D:\Development\code-destiny / 기준 커밋: main `5508cbce3`

## 0. 시작 전 — 이 레포의 작업 규칙 (AGENTS.md가 이 문서보다 우선)
- **`AGENTS.md`와 `CLAUDE.md`를 먼저 읽는다.** 브랜치와 PR은 만들지 않는다. 검증이 끝난 단위마다 커밋한다. 공식 검증 게이트는 main CI다.
- **워크트리에서 작업한다.** 2026-10-11 현재 main 체크아웃에 다른 세션이 커밋하지 않은 변경이 있다. 그 파일들이 이번 작업과 겹친다: `index.html`, `js/core/service-registry.js`, `docs/context/payment-gating.md`, `public/i18n/*.json` 등.
  - `powershell -File scripts/create-safe-worktree.ps1 -Slug premium-repricing`으로 워크트리를 만든다.
  - 끝나면 main에 직접 머지하고 워크트리를 정리한다.
  - 다른 세션의 미커밋 변경은 건드리지 않고, 커밋에도 섞지 않는다. 머지할 때 충돌이 나면 그 세션의 변경을 살리는 쪽으로 푼다.
- **이 문서는 main 체크아웃에 커밋되지 않은 파일로 있다.** 워크트리의 같은 경로로 복사한 뒤 첫 커밋에 포함한다.
- **이 작업에서 미리 승인된 것**
  - 코드 수정, 커밋, main 머지, push, 스테이징 검증.
  - **Play Console 신규 SKU 생성**: `npm run play:products:apply`. 단, 5절의 조건을 만족할 때만.
- **승인되지 않은 것 (하지 말고 멈춘 뒤 보고)**
  - 운영 승격.
  - 실결제. 스테이징 PG 결제도 포함한다.
  - 개발 검증에서 실 LLM 호출.
  - 기존 Play SKU의 가격 변경, 비활성화, 삭제.
  - 폐기된 SKU ID 재사용.

## 왜 하는가
지금 CODE DESTINY는 "무료로 거의 다 보여 주고, 1,000~5,000원짜리를 많이 파는" 구조입니다.
이번 개편으로 **"무료는 맛보기 티저뿐, 본편은 프리미엄"** 구조로 바꿉니다.

판단 기준은 하나입니다. 무료 화면을 본 사람이 **"내 얘기 같은데, 그 다음이 궁금하다"**는 상태에서 멈춰야 합니다.
- 무료 화면이 답을 주면 실패입니다.
- 무료 화면이 질문을 남기면 성공입니다.

## 1. 가격표 (정본: worker\lib\paid-feature-registry.js, 1코인 = 100원)

**사용자가 직접 정한 가격**

| 상품 | 키 (`worker\lib\paid-feature-registry.js`) | 현재 | 변경 |
|---|---|---|---|
| 영냥이 고등어 | `yeongnyangi-*-mackerel`, `fortune-chat-question-mackerel` | 3,000 | **5,000** |
| 영냥이 연어 | `*-salmon` | 9,000 | **10,000** |
| 영냥이 광어 | `*-flounder` | 15,000 | 15,000 (유지) |
| 영냥이 참치 | `*-tuna` | 30,000 | 30,000 (유지, **품질 대폭 상향**, 아래 §4 참고) |
| 생선 모둠 세트 | `fusion-*` 3종 | 50,000 | 50,000 (유지) |
| 생선 오마카세 | `fusion-all` | 80,000 | **70,000** (인하) |
| 네오 팩폭 작전실 | `neo-operation-room-consultation` | 20,000 | **30,000** |
| 운명 찻집 5종 | `fortune-tea-house-*` | 5,000 | **10,000** (분량·챕터 업그레이드 포함) |
| 대운 풀이 | `unlock.section_daewun` | 5,000 | **30,000** |
| 종합 사주풀이 | `unlock.section_summary` | 5,000 | **30,000** |
| 종합 운세 프롬프트 | 새로 만드는 키 | 1회 무료 (localStorage) | **꿀방울 1개 = 1회**, 출석 1일 = 꿀방울 1개 |

**사용자 지시를 바탕으로 세운 규칙**

- **천원 운세 일부는 1,000원으로 남긴다.** "천원운세" 키워드를 계속 쓰기 위해서다.
  - 남기는 상품은 3종이다: `rpt_specialCharmCard` 나의 매력 클래스, `rpt_skillTreeCard` 인생 스킬 트리, `fun.quantumLotto.ritualReport` 달빛 럭키 리추얼.
  - 로또 번호 자체는 더 이상 무료로 주지 않고 리추얼 리포트 안에 넣는다.
- **나머지 재밌는 사주 리포트는 5,000원으로 올린다.**
  - 빌런 블랙리스트 `rpt_villainCard`, 시크릿 하우스 입장 `rpt_secretHouseEntryCard`, 건강 리포트 `rpt_healthReportCard`.
  - 사주로 보는 여행지 `rpt_energyCoordCard`는 5,000원에서 7,000원으로 올린다.
  - 퀀텀 명리 `rpt_quantumCard`는 10,000원을 유지한다.
- **단발 점(1,000원짜리 오라클류)은 3,000원으로 올린다.**
  - royal-tea, ifa, 주역, kemet, turtleIChing, egypt, stonehenge 계열.
- **그 밖의 1,000원 리포트와 해금 상품은 5,000원으로 올린다.**
  - vedic_basic, astro_* 심화, ziwei_* 해금, tetogen_deep, nakshatra 해금, flower_fc.
- **3,000원 상품은 5,000원으로 올린다.**
  - 연이 운명 상담 `fortune-chat-consultation`, rpg, health 해금, 시크릿 하우스 에피소드 등.
- **5,000원 상품은 두 갈래로 나눈다.**
  - AI가 써 주는 상담과 궁합은 10,000원: 꿀꿀 사주 궁합 `section_compat`, `compat-saju-compatibility`, 타로 AI 등.
  - 계산 기반 리포트는 7,000원: destiny-compass, love-code, saju_guardian, travel 등.
- **10,000원 이상 상품은 이번에 바꾸지 않는다.** 네오와 위에서 따로 정한 상품만 예외다.
  - 30,000원 AI 상담군은 대운·종합과 같은 가격대가 된다.
- **가격 개편에서 빼는 것**
  - 이용권(9,900 / 29,900 / 59,900 / 149,000) 가격.
  - 프로필 카드 관리 1,000원(유틸리티 요금).
  - 음악 재생.
  - `LEGACY_UNLOCK_PRODUCTS_65DE451`(옛 가격 보존 테이블).
- **영냥이 5회 팩은 기존 할인율(80%)을 유지해서 다시 계산한다.**
  - 고등어 20,000 / 연어 40,000 / 광어 60,000(현행 유지) / 참치 120,000(현행 유지).
  - `policyVersion`을 올린다.

### 가격 작업 규칙
- **정본은 `RAW_FEATURE_KEY_PRICE_TABLE`과 `PIG_COIN_UNLOCK_PRODUCTS`다.** 사유별 덮어쓰기 표 `COIN_GATE_PER_USE_REASON_COSTS`와 `RAW_FEATURE_KEY_REASON_COSTS`도 같이 맞춘다. 이 표들이 키별 가격보다 우선한다.
- **영냥이 가격을 고칠 곳은 두 상수뿐이다.** `YEONGNYANGI_FISH`와 `YEONGNYANGI_FUSIONS`(같은 파일 197~204행 부근)만 고친다.
  - 영냥이 키(`yeongnyangi-{system}-{fish}`)와 질문 상담 키(`CHAT_QUESTION_PRICES`)는 이 두 상수에서 자동으로 만들어진다.
  - 생선 가격 비율이 1:3:5:10에서 1:2:3:6으로 바뀐다. 근처의 "1:3:5:10 유지" 주석과 비율을 검사하는 테스트도 함께 고친다.
- **`LEGACY_UNLOCK_PRODUCTS_65DE451`과 그 테스트는 건드리지 않는다.**
- **영냥이 5회 팩** `worker\payments\service-pack-policy.js`는 가격을 손으로 다시 계산해 넣고 `policyVersion`을 올린다.
- **가격을 따로 복사해 둔 곳을 모두 정본과 맞춘다.** 가능한 곳은 레지스트리 import로 바꾼다.
  - 서버 라우트 상수: naming-prompt, sukuyo*, vedic-ai, ziwei-ai, tarot, fortune, relationship-boundary-test.
  - 클라이언트 상수: app\*Client.tsx 14곳, `src\features\master-love-codex\constants.ts`.
  - `js\core\saju\reportDashboard.js:155-177`, `js\saju-engine-tarot-sukuyo-quantum.js`.
  - `index.html`의 가격 문구. `public\**\index.html` 사본은 직접 고치지 말고 빌드로 다시 만든다.
  - i18n `public\i18n\*.json`.
  - `lib\marketing\feature-marketing-copy.generated.json`.
  - `lib\seo\entity-registry.mjs`, `llms.txt`, 약관 `app\terms-of-service\TermsContent.jsx`.
  - 그다음 `scripts\sync-flower-price-copy.mjs`와 `scripts\lib\sync-saju-reading-prices.mjs`를 실행한다.
  - 프롬프트 본문에 "N,NNN원"이 박힌 worker 파일이 약 50개다. 바뀐 상품만 고친다.
- **천원 운세 허브** `app\yeongnyangi\1000-won-fortune\page.tsx`는 FUN 목록을 1,000원으로 남는 3종으로 줄인다.
  - "다섯 가지"처럼 개수를 적은 문구는 목록 길이에서 계산하게 바꾼다.
  - "2026년 10월 5일부터 고등어 …" 문구는 새 시행일로 바꾼다.
- **Google Play 앱 가격은 5절을 따른다.** 코드의 SKU 표와 Play Console 등록은 같은 커밋 묶음 ①에서 처리한다.
- **이미 산 사람의 권리는 그대로 둔다.**
  - 기존 `ContentEntitlement`는 유지한다. 5,000원에 대운을 해금한 사람은 계속 열람할 수 있다.
  - 결제 진행 중 주문은 `worker\payments\orders.js`의 `hasPriceDrift` 경로로 다시 가격을 매긴다.
  - 이용권 한도 계산은 `MIN_PASS_COVERABLE_COIN`이 최저가와 같아야 한다.
- **공지.** 시행일과 가격 변경 공지 배너, 약관과 환불 정책의 가격 문구를 함께 바꾼다.
- **결정 기록.** `docs\context\payment-gating.md`에 2026-10-11 날짜로 결정 섹션을 추가한다.

## 2. 무료 범위 — 여기 적힌 것 말고 "무료"는 없다

**무료로 남는 것은 이 넷뿐이다.** 모두 티저형으로만 남긴다.

1. **원국 차트** `#sajuCard`
   - 8글자 명식은 보여 준다.
   - "당신 원국에서 드문 구조 N개 발견" 같은 개인화 사실 한 줄을 붙인다. 해석은 잠근다.
2. **기본 성향** `#iljuCard`
   - 일간 헤드라인, 키워드 3개, 오행 막대만 보여 준다.
   - "이 기질이 연애와 돈에서 어떻게 터지는지"는 종합 사주풀이로 보낸다.
3. **영냥이 무료 운세**
   - 멸치 출석 구조는 그대로 둔다.
   - `DailyTarotCard`도 같은 일일 패스 아래로 옮긴다.
4. **종합 운세 프롬프트**
   - 꿀방울 1개로 1회 연다.
   - 꿀방울이 없으면 3,000원 단건 결제로 연다.

**나머지는 전부 잠근다.** 잠근 카드는 제목, 개인화 훅 한 줄, 가격, CTA만 남긴다. 잠긴 본문은 DOM에도, 번들에도 넣지 않는다.

| 지금 무료인 것 | 바뀌는 방식 |
|---|---|
| 십성·조후·억부·절기·일진/월운·연이 편지·오늘의 운명 | 종합 사주풀이(30,000)에 포함 |
| 현재 대운·세운 카드 | 대운 풀이(30,000)의 티저로 전환. 예: "2년 뒤 대운이 바뀝니다. 방향은 잠금" |
| 연예인·빌런 티저·호르몬·도파민·스킬 트리 등 대시보드 카드 | 해당 유료 리포트의 잠금 카드로 전환 |
| `js\core\service-registry.js`의 "무료" 배지 (today, today-hub, dream, psychotest, famous-saju, mbti-animal-compat, nakshatra) | 티저 + 3,000원 단발. 만세력(차트)만 무료 유지 |
| 운명의 꽃 `FEATURE_NOW_FREE` | 5,000원 |
| 자미두수·숙요·휴먼디자인·베다·점성술 화면 | 차트는 무료로 두고 해석은 잠근다 |
| /compatibility/ 랜딩의 "무료 궁합" 문구 (`index.html:37945`, `37978`) | 문구 교체 |
| 프롬프트 허브 localStorage 1회 무료 | 꿀방울로 교체 |

### 티저(호기심 훅) 작성 원칙 — 마케팅이 가장 신경 쓰는 부분
1. **개인화된 사실은 주고, 의미는 주지 않는다.**
   - 좋은 예: "당신 원국에는 같은 오행이 3번 겹칩니다"
   - 나쁜 예: "그래서 당신은 ~하다"
2. **시점을 건드린다.** "2년 뒤 대운이 바뀝니다. 바뀌는 방향은 잠금." 숫자와 시기는 실제 계산값을 쓴다.
3. **잠긴 카드에는 4가지만 둔다.** 제목, 개인화 훅 한 줄, 그 안에 무엇이 들어 있는지(챕터 목록), 가격과 CTA.
   - 블러 처리한 가짜 텍스트도 서버에서 받은 실제 문장이면 안 된다.
4. **과장과 공포 마케팅은 금지한다.** "큰일 납니다", "모르면 손해" 같은 문구를 쓰지 않는다. 결과를 보장하는 문구도 쓰지 않는다.
5. **CTA 위계를 지킨다.** 단건 결제를 가장 크게 둔다. 이용권은 보조로 둔다. 1,000원으로 남는 천원 운세 3종은 "가볍게 맛보기" 진입로로 둔다.
6. 기존 PREMIUM 게이트 UI(`index.html` `applySectionGates`, `SECTION_GATE_KEYS`, `data-action="unlockPremiumFeature"`)를 재사용한다.

### 구현 포인트
- **사주 결과 페이지** (`index.html` `#resultPage` 19100~)
  - `SECTION_GATE_KEYS`와 `_cdSajuGateUnlocked`(`js\saju-engine.js:26803`)에 새로 잠그는 카드를 추가한다.
  - 렌더러는 잠긴 상태에서 본문을 만들지 않는다(`_cdGateBody` 패턴).
  - 잠겨 있을 때 `window.G_DAEWUN` 같은 전역에 데이터를 채우지 않는다.
- **서비스 배지와 랜딩.** `js\core\service-registry.js`의 "무료" 배지를 정리하고, `index.html` 궁합 랜딩 문구를 바꾼다.
- **영냥이 데일리 타로.** `app\yeongnyangi\_components\DailyTarotCard.tsx`를 멸치 일일 패스(`requireDailyPass`) 아래로 옮긴다.
- **운명의 꽃.** `worker\lib\billing-feature-registry.js:395`의 `FEATURE_NOW_FREE`를 해제한다.

## 3. 꿀방울 출석 + 종합 운세 프롬프트
- **꿀방울 지갑은 하나만 쓴다.** 운명 찻집의 꿀방울 지갑과 원장(`worker\routes\fortune-tea-house.js` 4529~, `grantHoneyDropReward` 4939)을 재사용한다. 새 지갑을 만들지 않는다.
- **출석 API**
  - 로그인 사용자에게 KST 하루 1회 +1을 준다.
  - 원장 멱등 키는 `attendance:YYYY-MM-DD`다. 누적할 수 있다.
  - 구현 패턴은 영냥이 멸치 출석(`worker\yeongnyangi\free-repository.js`)을 따른다.
- **프롬프트 허브** (`/fortune/prompt-hub/`)
  - 지금은 프롬프트 조립이 전부 클라이언트에서 일어나서 막을 방법이 없다(`prompt-hub-storage.ts` 주석 참고).
  - 조립 로직을 worker로 옮긴다. `POST`로 생성할 때 꿀방울 1개를 원자적으로 차감하고, 완성된 프롬프트를 응답으로 준다.
  - 꿀방울이 없으면 3,000원 단건 결제 경로를 보여 준다.
  - `PROMPT_HUB_FREE_GENERATION_LIMIT`와 localStorage 카운터는 제거한다.
- **UI.** 꿀꿀 사주 홈과 프롬프트 허브에 "오늘 출석하고 꿀방울 받기"와 보유량을 보여 준다.

## 4. 30,000원 상품을 서버로 옮기고, 가격 오른 상품의 분량을 올린다
- **대운 풀이·종합 사주풀이 (30,000)**
  - 본문 생성을 worker로 옮긴다. `ContentEntitlement`(birth-scoped, `worker\lib\content-unlocks.js`)를 확인한 뒤에만 내려준다.
  - 클라이언트 번들에서 해당 템플릿을 제거한다.
  - 30,000원에 맞는 구성으로 넓힌다.
    - 종합: 십성, 조후, 억부, 절기, 일진·월운을 흡수한다. 챕터는 연애, 돈, 일, 관계, 건강 습관, 올해 처방까지 둔다.
    - 대운: 10년 단위 전체 대운, 현재 대운의 연도별 세운, 전환기 체크리스트를 둔다.
- **운명 찻집 (10,000)** `worker\routes\fortune-tea-house.js`
  - 목표 분량을 올린다.

    | 분류 | 현재 | 목표 |
    |---|---|---|
    | 사주 | 10,000자 | 18,000자 |
    | 타로 | 6,000자 | 10,000자 |
    | 숙요 | 8,000자 | 14,000자 |

  - 카테고리마다 필수 섹션을 3개 이상 추가한다. 예: 월별 흐름, 관계 처방, 실행 체크리스트.
  - 출력 토큰 상한이 12,000이라 한 번에 다 쓸 수 없다. 섹션별로 나눠 생성하는 방식으로 바꾼다.
- **네오 팩폭 작전실 (30,000)** `worker\lib\neo-operation-room-prompt.js:834-905`의 섹션별 최소 분량을 약 30% 올린다.
- **영냥이** `worker\yeongnyangi\fortune\reading-policy.ts`
  - 분량을 올린다.

    | 등급 | 현재 | 목표 |
    |---|---|---|
    | 고등어 | 3,000자 | 4,500자 |
    | 연어 | 6,000자 | 7,000자 |
    | 광어 | 11,000자 | 11,000자 (유지) |

  - 모둠·오마카세는 그대로 둔다.
- **영냥이 참치 (30,000) — 광어(15,000)의 두 배 값을 하도록 품질 격차를 확실히 만든다.** 분량만 늘리지 말고, 아래 항목이 결과물에서 눈에 띄어야 한다.
  - **모델.** 영냥이 등급 가운데 가장 상위 모델을 쓴다. 광어 이하와 같은 모델이면 안 된다.
  - **근거.** 챕터마다 실제 계산값(명식 글자, 별, 수, 행성 각 등)을 최소 2개 인용하고 "왜 그렇게 읽었는지"를 쓴다. 일반론 문장은 금지한다.
  - **시간축.** 앞으로 12개월의 월별 흐름표와 시기별 행동 처방을 넣는다. 광어에는 없는 참치 전용 챕터다.
  - **개인화.** 사용자가 남긴 질문과 고민을 모든 챕터에 연결한다. 질문을 다시 언급하지 않는 챕터는 다시 쓴다.
  - **검수 패스.** 생성한 뒤 자기 검토를 한 번 한다. 중복 문장, 일반론, 질문과 무관한 챕터를 찾아 고쳐 쓴다. 전달을 막는 검수가 아니라 보강용이다.
  - **분량.** 20,000자에서 26,000자로 올리고 후속 질문을 4회에서 6회로 늘린다.
  - **판매 화면.** 상품 화면에 "광어 vs 참치" 비교 표를 둔다. 모델, 근거 인용, 12개월 로드맵, 검수, 후속 질문을 비교한다.
  - `__tests__\ui\yeongnyangi-tier-depth`에 "참치만 가진 챕터와 기능이 있다"는 테스트를 추가한다.
- 🔴 **분량 기준은 목표일 뿐이다. 결제된 결과를 전달하는 것이 최우선이다.** 분량이 모자라다는 이유로 결과 전달을 실패시키지 않는다. 모자라면 보강 시도를 한 번 한 뒤 그대로 전달하고 로그만 남긴다.

## 5. Google Play Console — 앱 가격대 SKU

**앱가는 웹가와 같다.** 2026-08-29부터 이 정책이다. 서버는 `worker/lib/app-store-pricing.js`의 `CONTENT_TIER_TABLE`을 정산 기준으로 쓴다. 표에 없는 코인가는 앱에서 `APP_SKU_NOT_VERIFIED`(503)로 결제가 닫힌다.

**이미 등록돼 있어서 그대로 쓰는 SKU**

| SKU | 가격 |
|---|---|
| `cd_content_tier_01` | 3,000 |
| `cd_content_tier_02` | 5,000 |
| `cd_content_tier_14` | 7,000 |
| `cd_content_tier_06` | 10,000 |
| `cd_content_tier_09` | 20,000 |
| `cd_content_tier_10` | 30,000 |

이 SKU들의 가격은 **바꾸지 않는다.**

**새로 만들 SKU** (다음 빈 번호를 쓴다)

| SKU | 앱가 | 코인 | 쓰는 상품 |
|---|---:|---:|---|
| `cd_content_tier_15` | 1,000 | 10 | 천원 운세 3종, 프로필 카드 관리 |
| `cd_content_tier_16` | 15,000 | 150 | 영냥이 광어 |
| `cd_content_tier_17` | 50,000 | 500 | 생선 모둠 세트 |
| `cd_content_tier_18` | 70,000 | 700 | 생선 오마카세 |

- 🔴 **폐기된 ID는 같은 가격이라도 되살리지 않는다.** 03, 04, 05, 07, 08, 11, 12, 13이 여기에 해당한다. 07은 옛 15,000원, 13은 옛 70,000원이었다. Play는 상품 ID를 영구 점유하므로, 되살리면 과거 영수증이 새 가격을 가리킨다.
- 🔴 **₩1,000 티어를 추가해도 음악 MP3(10코인)는 앱에서 계속 무료여야 한다.** `APP_FREE_MAX_COIN_PRICE`와 `isAppFreeFeature`의 판정 순서를 확인하고, 이를 고정하는 테스트를 둔다.
  - 1,000원 유료 키는 `APP_PAID_LOW_PRICE_FEATURE_KEYS`로 유료를 유지한다. 3,000원·5,000원으로 오른 키는 이 목록에서 빼도 된다. 무료 구간을 벗어났기 때문이다.
- **`APP_UNVERIFIED_CONTENT_COIN_PRICES`를 정리한다.** 지금 값 `[90,150,500,800]`에서 SKU가 생긴 코인가를 뺀다.
  - 90(옛 연어)과 800(옛 오마카세)은 가격이 사라진다.
  - 연어 100코인은 기존 `tier_06`에 매핑된다.

**순서**

1. **세 군데를 함께 고친다.**
   - `CONTENT_TIER_TABLE`에 네 티어를 추가한다.
   - `scripts/create-play-console-products.mjs`의 `CONTENT_LISTINGS`에 이름과 설명을 추가한다. 형식은 기존 문구를 따른다: "운세 콘텐츠 15,000원", "AI 상담 70,000원" 등.
   - `docs/play-console-submission-values.md`의 표에 같은 값을 추가한다.
2. `npm run verify:app-store-pricing`과 `npm run verify:play-console-products`가 통과해야 한다. 레지스트리의 모든 코인가가 티어로 덮여야 한다.
3. `npm run play:products:dry`를 실행하고 출력을 확인한다.
   - **신규 4개만 `+`로 나오고, 기존 SKU는 "변경 없음"이어야 한다.** 기존 SKU의 가격이나 상태 변경이 한 줄이라도 보이면 apply하지 말고 멈춘다.
4. 자격증명을 확인한다. `.env.local` 계열에 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`(또는 `_EMAIL`과 `GOOGLE_PLAY_PRIVATE_KEY`)이 있어야 한다.
   - 있으면 `npm run play:products:apply`를 실행하고, 다시 dry를 돌려 전부 "변경 없음"인지 확인한다.
   - 자격증명이 없거나 401/403이면 우회하지 않는다. 6절의 수동 체크리스트를 쓰고 "사람 손 필요"로 보고한다.
   - 자격증명 값은 로그나 문서에 출력하지 않는다.
   - 신규 SKU는 기존 결제에 영향이 없는 추가 작업이라 코드 배포 전에 만들어도 안전하다.
5. `docs/pricing/PLAY_CONSOLE_TASKS.md`에 "2026-10-11 프리미엄 개편" 절을 추가한다.
   - 내용: 신규 SKU 표, 적용 결과(자동 적용 / 수동 필요), 남은 사람 손 작업.
   - 사람 손 작업은 앱 결제 시트에서 4개 티어의 표시 금액을 눈으로 확인하는 것이다.

## 6. Play 수동 체크리스트 (자동 적용이 막혔을 때만 작성)

- **경로:** Play Console → 수익 창출 → 인앱 상품.
- **SKU 4개를 각각 만든다.**
  - 유형: 일회성. 상태: 활성.
  - 가격: KRW 기본가. 다른 국가는 자동 환산.
  - 이름과 설명은 `docs/play-console-submission-values.md`의 값을 그대로 쓴다.
- **비활성화나 삭제는 하지 않는다.**

## 진행 방식
- **커밋 묶음 4개로 나눈다.** 브랜치·PR이 아니라 커밋 단위다. 각 묶음은 따로 되돌릴 수 있어야 한다.
  - 순서: ① 가격표 + Play SKU → ② 무료 축소·티저 → ③ 꿀방울·프롬프트 허브 → ④ 서버 이전·분량.
  - ①과 ②는 같은 운영 승격에 함께 실린다. 공지 배너는 ①에 포함한다.
  - 운영 승격은 사용자 승인 사항이다. ②까지 main CI가 통과하면 멈추고 승격 여부를 묻는다. ③과 ④는 그 뒤에 계속한다.
- **보고는 AGENTS.md 22행 형식을 따른다.** 문서 파일명, 절대 경로, 재개 명령어를 쓴다. 이 문서의 `next`와 `status`를 갱신한다.
- **바뀌는 가격·잠금 규칙마다 테스트를 하나씩 둔다.** 기존 테스트가 옛 가격을 기대하고 있으면 새 가격으로 고친다. 테스트를 지우지 않는다.
  - 기존 테스트: `__tests__\worker\paid-feature-registry.integrity`, `payments-v2.*`, `yeongnyangi-service-packs`, `__tests__\ui\*pass-economics`, `yeongnyangi-tier-depth`, `fortune-tea-house-honey-drops`, `neo-operation-room.payment-flow`.
- **커밋 묶음마다 통과시킬 검증** (먼저 `npm run check:fast`, push 전에 `npm run check:pre-push`)
  - `npm test` 관련 스위트.
  - `scripts\verify-paid-gate-price-coverage.mjs`, `verify-app-store-pricing.mjs`, `verify-paid-service-offer.mjs`, `verify-pass-tier-policy.mjs`, `verify-seo-entity-registry.mjs`.
  - `npm run verify:paid-feature-billing-policy`, `npm run verify:ai-prompt-billing-policy`.
  - `next build`. 천원 운세 허브가 빌드 단계에서 가격을 검증한다.
- **결제 E2E는 mock과 테스트로 확인한다.** 실결제가 일어나는 스테이징 PG 결제는 Codex가 하지 않는다. 아래 시나리오를 사람이 확인할 체크리스트로 보고에 넣는다.
  - 대운 30,000 해금: prepare 금액이 맞는지, PG 검증, 해금 반영.
  - 고등어 5,000 결제.
  - 꿀방울 출석 → 프롬프트 생성 → 다음 날 다시 출석.
  - 꿀방울 0개일 때 3,000원 경로.
  - 기존 5,000원 해금자가 대운을 계속 열람할 수 있는지.
- **무료 노출 점검**
  - 로그아웃 상태로 사주 결과 페이지를 열었을 때 원국과 기본 성향 외의 해석 문장이 DOM에 없어야 한다.
  - 번들에서 대운·종합 템플릿 문자열을 grep해서 0건이어야 한다.

## 이미 있는 불일치 (이번 범위 밖, 보고만)
- VVIP 이용권: `CURRENT_PASS_PLANS`는 59,900원, `lib\payment\pass-pricing.js`는 59,000원.
- `worker\lib\vedic-prashna-prompt.js:8`은 5,000원, 레지스트리는 3,000원.
- `docs\payment-policy-content-access.md:33`의 연이 "하루 3회 무료"는 이미 0회라 낡은 내용이다.

## 완료 보고에 넣을 것
- 변경 전·후 가격표(키 단위).
- 무료로 남은 화면 목록과 각 화면의 티저 문구.
- Play Console에서 사람이 해야 할 작업.
- 시행일과 공지 문구.
- 실패했거나 건너뛴 검증과 그 이유.

## 2026-10-12 진행 기록

- 준비: 안전 워크트리 `D:\Development\codedestiny-worktrees\premium-repricing-20261011-234212` 생성, 기준 커밋 `5508cbce3`가 시작 main의 조상임을 확인, 이 문서를 첫 커밋 `95720ac7c`에 포함했다.
- 커밋 묶음 ①: 가격 정본·영냥이 5회 팩·클라이언트/다국어/마케팅 사본·공지·Google Play `tier_15`~`tier_18` 코드와 문서를 정합화했다.
- Play dry-run: 신규 4개만이 아니라 조회된 23개 상품 전체가 `+`로 표시됐고 자격증명도 확인되지 않았다. 기존 SKU 무변경 조건을 충족하지 못했으므로 `play:products:apply`는 실행하지 않았다. Play Console 수동 작업이 필요하다.
- 검증: 가격·Play·결제 관련 targeted 검증 통과. `npm run test:node`는 3,171개 중 3,170개 통과, 최신 main에서도 동일 재현되는 sitemap 주간 lastmod 기존 실패 1건만 남았다.
- 커밋 묶음 ②(로컬 완료): 최애운명은 `destiny-bias-analyze` 5,000원 회당 결제와 모바일 결제 재개를 결과 계산 전에 연결했고, 운명의 꽃은 `FEATURE_NOW_FREE` 예외를 제거해 `flower-fc` 5,000원 해금 없이는 네 소스 모두 열리지 않게 했다.
- 커밋 묶음 ②(무료 서비스 축소): 오늘의 운세·꿈해몽·심리테스트·MBTI 동물 궁합·나크샤트라 기본 리딩을 3,000원 회당 결제로 등록하고 결과 실행 지점에 fail-closed 게이트와 결제 재개를 연결했다. 유명인 사주는 개인 운세 상품이 아니라 공개 SEO 읽을거리이므로 유료 상품으로 오인시키지 않고 `아카이브`로 분리했다. 만세력·다이어리·음악·소설도 무료 운세 상품이 아닌 차트·기록·스트리밍·읽을거리로 표기를 분리했다.
- 사주 결과 대시보드의 기존 무상 해석 카드(극T·테토/에겐·사주네컷·도파민 및 프롬프트)는 `section_summary` 30,000원 잠금으로 묶었다. 꽃돼지 종합 운세 프롬프트의 3일 출석 1회 계약은 ③에서 서버 차감과 함께 연결할 때까지 잠금 상태를 유지한다.
- 영냥이 데일리 타로는 기존 멸치 일일 패스에 합쳤다. 사용자 추가 지시인 `3일 출석당 1회`로의 변경은 ③에서 영냥이와 꽃돼지 프롬프트에 함께 적용한다.
- ② 검증: TypeScript 통과, 결제 가격 해석 48/48, 정적·React 결제 재개 배선 96/96, 사주 재미 콘텐츠 게이트 6개 미러 통과, 관련 Jest 66개 통과. 전체 fast 검증에서 발견된 신규 유료 키의 후기 상품 분류 6건은 사주·오라클·성향·나크샤트라·최애운명 상품군에 연결했다. ① 가격 인상 뒤 오라클 분량 기대값 문제는 최신 main `67345e000`의 가격별 분량 예산 수정으로 해소됐다.
- main 상태: 최신 `origin/main` `96c567e52`의 PR CI가 이번 작업과 무관한 `verify:ziwei-chart-detail-view`(`panel.before is not a function`)에서 실패 중이다. AGENTS 규칙상 red main 위에는 push하지 않는다.
- ② 첫 main CI `38159918088`은 빌드·타입·핵심 검사를 통과했지만, 유료 전환 전 계약을 기대하던 정적 테스트 5건에서 실패했다. 운명의 꽃 홈 상단 템플릿의 잔존 무료 문구를 5,000원 안내로 바꾸고, 신규 유료 리딩 6종의 결제 전 예시와 관련 정적 계약을 갱신해 실패 묶음 52/52 통과를 확인했다.
- ② 보정 main CI `38161091152`는 빌드·타입·핵심 검사를 통과했지만 신규 유료 키 6종이 결제 P0 인벤토리에 없다는 정적 계약에서 실패했다. `npm run audit:payment-p0-inventory`로 커밋된 가격·게이트 정본 기준 인벤토리를 다시 생성했다.
- 인벤토리 보정 main CI `38162141155`에서 해당 검사는 통과했지만, 루트 `PAYMENT_POLICY.md`의 운명 찻집 5종과 레거시 궁합 2종이 ① 이전 가격으로 남아 결제 정책 정합성 검사가 실패했다. 2026-10-11 승인 가격과 기존 주문·환불 불변 조건을 정책 정본에 반영했다.
- 정책 정본 보정 main CI `38162898652`에서 결제·인증 경계는 통과했지만, 재미있는 사주 팝업 브라우저 가드가 Worker 가격 API가 없는 정적 하네스에서 가격을 기다리고 옛 이미지 선택자를 조회해 실패했다. 하네스에 Worker 정규화 가격 결과를 시드하고 현재 결과 구성 이미지 DOM을 검사하도록 맞춰, 잠금·해금·회당결제 21개 흐름을 통과시켰다.
- 브라우저 가드 보정 main CI `38164309217`은 빌드·타입·결제 검사를 통과했지만, 관상 오관·점과 전생 관상 궁합 정적 계약이 ① 이전 3,000원을 기대해 실패했다. 두 계약을 현재 가격 5,000원으로 갱신했고 같은 CI의 운세·콘텐츠 결정론 검사 15개를 로컬에서 전부 통과시켰다.
- 시작 확인(2026-10-12): 마지막 전달 커밋 `082c8c04a`의 main PR CI `38173599605` 성공.
- 사용자 추가 지시: 마스터 인연의 서 개인 10,000 → 30,000원(300코인), 궁합 30,000 → 50,000원(500코인). 정본·폴백 상수·홈/레지스트리 문구·12로케일 사전·결제 P0 인벤토리·Play 문서를 맞추고 `docs/context/payment-gating.md`에 결정 절을 추가했다. 이용권 영향: 두 SKU 모두 standard·premium·vvip 건당 상한을 넘어 단건 결제로 넘어가고, family는 월 한도 안에서 계속 커버한다. 옛 금액을 고정한 테스트(홈 탐색기, payments-v2 context·foundation·pass-check, pass-budget-hard-gate)와 `verify-master-love-codex-flow`를 새 가격으로 갱신했고, 홈 사본 해시가 바뀐 라우트의 sitemap lastmod 원장을 재생성했다.
- Play dry-run 재실행(2026-10-12): 서비스 계정이 없어 23개 전체가 `+`로 표시돼 apply하지 않았다. 사용자가 수동 등록을 승인했으므로 `docs/pricing/PLAY_CONSOLE_TASKS.md` 체크리스트대로 `tier_15`~`tier_18`을 등록하면 된다. `tier_17`은 인연의 서 궁합판도 쓴다.
- P0-2 이관과 B 승격(2026-10-12): B(전환 이전 해금 유지 `0d33795d9`)는 이미 운영에 있었습니다. 다만 P0-2 이관은 그때까지 실행되지 않았습니다. 그래서 staging과 운영 순서로 백업 → dry-run → apply → index → check → audit → verify를 진행했습니다.
  - 운영 결과: BIRTH 58, MARKED_EXCLUDED 768, LEGACY_CLAIMS 2911, 대기 0, 위험 0.
  - 백업은 레포 밖 `D:\Development\codedestiny-backups\20261012-p0-2\{staging,production}`에 있습니다. 개인정보가 들어 있습니다.
  - 레거시 백업 `backups/mongodb/20261011-legacy-saju-unlocks`는 검증이 끝난 뒤 삭제했습니다.
  - 그 다음 운영 release `38180479040`이 성공했습니다. Pages와 Worker 모두 `0127beb449f1`이고 deploy-smoke도 PASS입니다.
  - 라이브 홈은 인연의 서 "30,000원부터"이고, 번들은 compat `cost:500, amountKRW:50000`입니다.
- ③ 꿀방울 출석과 프롬프트 허브 서버화:
  - 출석은 `worker/lib/honey-wallet.js`가 처리합니다. 3일 출석마다 1방울이고, 지갑은 찻집 지갑과 공유합니다.
  - 생성은 `worker/routes/prompt-hub.js`가 맡습니다. 원장 멱등으로 처리하고, 입력이 다르면 409를 돌려줍니다. 방울이 부족하면 402와 함께 ₩3,000 `fortune-prompt-hub-generate` 결제를 안내합니다.
  - 템플릿은 `lib/fortune/prompt-hub-template.js`로 서버에 두었고, 클라이언트 번들에는 원칙 문장이 없습니다.
  - 홈 카드와 출석 위젯도 바꿨습니다.
  - 영냥이는 이제 멸치 3마리로 오늘의 16종을 엽니다.
  - 계획과 다른 점이 하나 있습니다. horary는 차감 전에 계산합니다. 계산이 실패했을 때 방울만 빠지는 일을 막기 위해서입니다.
  - 게스트 무료 1회는 없앴습니다. 이제 로그인해야 합니다.
- ④(a) 분량 상향 (실제 LLM 호출 없이 mock과 검증기로만 확인):
  - 운명 찻집의 분량 하한을 올렸습니다. 사주 18,000자(목표 21,000), 타로 10,000자, 숙요 14,000자입니다.
    - 카테고리마다 필수 섹션 3개(월별 흐름, 관계 처방, 실행 체크리스트)를 추가했습니다.
    - 사주는 명식 판독 그룹을 deepSections 제목 기준으로 반씩 나눠 `core`와 `coreTail` 두 호출로 씁니다.
    - 숙요에는 새 `chapters` 3장을 넣었습니다. 결정론 폴백, 병합, 체크포인트 그룹, 결과 패널, PDF 섹션이 모두 이 장을 다룹니다.
    - 체크포인트의 모드 하한은 하드코딩 20000 대신 실제 모드 하한을 씁니다.
    - 분량이 미달해도 기존과 같습니다. 보강을 한 번 시도한 뒤 전달합니다.
  - 네오 팩폭 작전실은 섹션 최소 분량 26개를 각각 ×1.3 올렸습니다. 첫 리딩은 26,000자 이상, 보강 리딩은 10,400자 이상입니다.
  - 영냥이 고등어와 연어는 코드를 바꾸지 않았습니다. 신규 구매(v6 + concise 매니페스트)가 이미 목표를 넘기 때문입니다.
    - 고등어: 하한 4,840자, 목표 6,603~7,483자
    - 연어: 하한 8,800자, 목표 11,618~13,557자
    - 지시서에 적힌 3,000자와 6,000자는 v4 레거시 `readingPolicies` 값입니다. 이 값을 바꾸면 저장된 v5 구매본의 정책만 달라지므로 그대로 두었습니다.
  - 후속 확인 사항: 찻집 상품 상세 manifest(`content/product-details/tea-*`)의 섹션 목록은 새 필수 섹션을 반영하지 않았습니다.
  - 후속 확인 사항: 사주 general 카테고리의 폴백 deepSections 제목이 `SAJU_REQUIRED_SECTION_TITLES`와 다를 수 있습니다. 확인하지 않은 기존 문제입니다.
- ④(b) 참치 등급 품질 (실제 LLM 호출 없이 mock·단위 검사로만 확인):
  - 새 참치 주문 snapshot에 `tunaQualityPolicy: 'tuna-quality-20261012'`를 넣습니다. 이 표시가 있는 주문만 모든 장과 추가 질문을 `gemini-2.5-pro`로 씁니다(`YEONGNYANGI_TUNA_GEMINI_MODEL`로 교체 가능). 이미 진행 중인 주문은 flash를 그대로 씁니다.
  - 프롬프트 계약: 장마다 실제 계산값 2개 이상을 이유와 함께 인용하고, 사용자의 질문과 연결합니다.
  - 자기 검토 1회(`worker/yeongnyangi/fortune/tuna-quality.ts`): 로컬 결정론 감사(인용 부족·질문 미연결·중복 문장·일반론)에 걸린 장만 한 번 다시 씁니다. 책 한 권에 최대 8장까지이고, 남은 임대 시간이 부족하거나 재작성이 더 나쁘면 초안을 씁니다. 전달을 막지 않으며 ko 주문에만 적용합니다.
  - ko 질문형 참치 책의 '올해의 월별 흐름'은 '앞으로 12개월 로드맵'(월별 흐름표 + 구간별 실행 처방)으로 바뀝니다. 사주 월운 근거는 참치에 한해 내년 같은 날까지 늘립니다.
  - 추가 질문은 4회에서 6회로 늘었습니다. 모둠(5회)보다 많아졌습니다.
  - 비용: pro 요율(`config/llm-tariffs-20260921.json`)로 재작성 8장·추가 질문 6회까지 넣어도 가격의 약 17%로, 상한 20% 안입니다(`tunaBookCostRatio`).
  - 상품 안내에 '광어 vs 참치' 비교표를 넣었습니다. ko는 5행, 다른 11개 로케일은 숫자 없이 2행입니다.
  - 영냥이 불변 지문은 참치 47행만 갱신했습니다. 다른 등급은 바뀌지 않았습니다.
  - 후속 확인 사항: `scripts/report-yeongnyangi-pass-economics.mjs`는 아직 flash 요율로 계산합니다(보고용이라 게이트는 아님).
