# 무료 바이럴 퍼널: 초간단 무료 사주 + 운명의 꽃·최애 운명 무료 개방

## Context
사용자가 붙여 넣은 프롬프트 두 개가 요구하는 것:
- (1) 사주로 "운명의 꽃"과 "최애 운명"을 매칭하고, 공유하고 싶어지는 결과 화면(코스믹 다크, 카드 뒤집기·슬롯 연출, X·스레드·복사·이미지 카드)을 만든다.
- (2) 생년월일·시간·성별만 넣으면 바로 뜨는 무료 사주 랜딩. 70%는 보여 주고 30%는 블러로 유료·심화 서비스에 연결하며, 공유 미션으로 "재물 시크릿 키워드"를 해제한다.
- 사용자는 꽃과 최애를 무료로 풀어 바이럴에 가장 좋은 조건으로 만들라고 했다.

탐색 결과 두 기능은 이미 있다(code-destiny, Next.js 15 + Tailwind + framer-motion + Cloudflare).
- 운명의 꽃: `/flower`, 꽃 89종 엔진. 결제는 없고 로그인만 필요하다(`worker/routes/destiny-flower.js:42` `requireAuth`). 프런트는 레거시 셸 `js/core/index-inline-runtime.js:4959`.
- 최애 운명: `/saju/destiny-bias`. 결과 전 `ensurePaidAccess('destiny-bias-analyze')` 5,000원(`DestinyBiasClient.tsx:435-468`, `worker/lib/paid-feature-registry.js:321`). 페이지 문구는 "무료"라고 해서 실제와 맞지 않는다.

## 사용자 결정 (2026-11-08)
- 만드는 방식: "기존 것 무료 개방". 89종 엔진과 최애 운명을 그대로 쓰고, 새 12종 세트는 만들지 않는다.
- 최애 운명: "결과 카드만 무료". 매칭 결과·포토카드·공유는 무료이고, 자세한 케미 리포트(details 단계)는 5,000원으로 남긴다.
- 공유 해제: "버튼 누르면 해제". X·스레드·링크 복사·이미지 저장 중 하나를 누르면 브라우저에서 해제한다. 코인·금전 보상은 없고, 카카오 공유에는 해제 조건을 붙이지 않는다.
  - 사내 원칙 "새 보상·공유 강요 팝업은 없다"(`docs/purchase-journey/IMPLEMENTATION.md:71`)의 예외로 사용자가 정했다. 팝업이 아니라 결과 안의 인라인 카드로 넣고, 이 예외를 문서에 적는다.

## 내 판단 (사용자 확인 전 기본값)
- 무료 사주 랜딩은 새 Next.js 경로 `/saju/free`에 만든다. 레거시 `cdOneStepFreeSajuEntry`는 손대지 않는다.
- 블러 30%의 연결처는 다음과 같다. 재물운 전용 상품이 없기 때문이다.
  - "재물운 상세 시기"는 신년운세 `/new-year-ai-consultation/`로 보낸다.
  - "히든 매칭"은 `/saju/destiny-bias`와 `/flower`로 보낸다.
- 레거시 셸인 `/flower`에서는 framer-motion을 쓸 수 없다. 공개 연출은 기존 `styles/destiny-flower-cosmic.css`의 CSS 애니메이션으로 만든다.

## 작업 단계

### 0. 설계 문서
- `docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md`에 이 계획의 결정·근거를 쓰고 커밋한다.
- 이어서 superpowers:writing-plans로 실행 계획을 만든다.

### 1. 공용: 스레드 공유와 공유 바
- `lib/share.v2.ts`(또는 `js/share-service.mjs`의 `shareThrough`)에 스레드 intent를 추가한다: `https://www.threads.net/intent/post?text=`. UTM은 기존 규칙을 따른다.
- 공유 바 하나를 만들어 세 화면에서 같이 쓴다. 채널은 X, 스레드, 링크 복사, 이미지 저장이다.
  - 최애 운명의 `components/chemi/ChemiShareBar.tsx`를 기준으로 일반화한다.
  - 이미지 저장은 `hooks/useAnimalCardExport.ts` 방식(html-to-image `toPng` → `navigator.share` → 다운로드)을 다시 쓴다.
- 분석: 공유는 `trackShare({feature, channel})`, 퍼널은 `trackFunnelStep`(`app/hooks/useAnalytics`)으로 남긴다.

### 2. 운명의 꽃 무료 개방
- `worker/routes/destiny-flower.js:42`의 `requireAuth`를 없애고 IP 기준 호출 제한을 건다. 제한기는 다른 공개 라우트가 쓰는 worker 제한기를 다시 쓴다.
- 클라이언트(`index-inline-runtime.js:4959-4987`)도 고친다.
  - 로그인하지 않아도 토큰 없이 요청을 보낸다.
  - 401 로그인 유도와 예전 402 locked 처리를 없앤다.
- 결과 화면에 1단계 공유 바를 붙이고, 카드 뒤집기 공개 연출을 CSS로 넣는다.
  - 공유 링크는 기존 공개 카드 `GET /api/destiny-flower/flower/:id`를 쓴다.
- `/flower`가 noindex인 이유(`app/flower/page.tsx:11-16`)를 확인한다. 이유가 로그인 때문이었다면 색인을 열지 판단해 보고만 한다. 바꾸지는 않는다.
- 쓰지 않게 된 `flower-fc` 레지스트리 키는 보고만 하고 지우지 않는다.

### 3. 최애 운명: 결과는 무료, 상세는 유료
- `DestinyBiasClient.tsx`의 `compute()`에서 `ensurePaidAccess`를 빼고, 같은 검사를 details 단계에 들어갈 때로 옮긴다.
- `paid-feature-registry.js:321` 설명을 "상세 케미 리포트"로 바꾼다. 가격은 그대로다.
- computing에서 result로 넘어갈 때 framer-motion 슬롯 연출을 넣는다. 후보 아이돌 카드가 빠르게 돌다가 멈춘 뒤 뒤집힌다.
- `page.tsx:16,18` 문구를 실제와 맞춘다: 결과는 무료, 상세 리포트는 유료.
- 공유 바를 1단계 공용 컴포넌트로 바꿔 스레드를 추가한다.

### 4. 초간단 무료 사주 `/saju/free`
- `app/saju/free/page.tsx`(서버 컴포넌트)
  - `generatePageMetadata`로 메타데이터를 만들고, H1과 소개 문단을 서버에서 렌더한다. 사이트맵 경고(`scripts/generate-sitemap.mjs:103-105`) 때문이다.
- 클라이언트 폼
  - 입력: 생년월일, 태어난 시간(선택, "모름" 가능), 성별, 양력/음력.
  - 입력란에 포커스가 가면 `calculateLocalSaju`(`app/saju/animal-destiny/engine/localSajuCalculator.ts:5318`, `sajuAdapter` 경유 동적 import)를 미리 불러 둔다. 그러면 제출 뒤 0.5초 안에 결과가 뜬다.
  - 12운성은 `getTwelveLifeStage`(`app/saju/animal-destiny/lib/calculateTwelveLifeStage.ts:32`)를 쓴다.
- 결과에서 보여 주는 70%
  - 올해 키워드: 올해 천간과 일간의 십신, 10종 문구.
  - 나의 타고난 무기: 일간 10종.
  - 오행 밸런스 막대.
  - 12운성 한 줄.
  - 문구 데이터는 `lib/free-saju/copy.ts`에 둔다. 감성적이고 위트 있되 역학 용어는 최소로 쓴다.
  - 톤은 `docs/context/design-canon.md`를 따른다. 이모지는 🌸·🦁만 쓰고 유아어는 쓰지 않는다.
- 블러 30%
  - `app/components/PremiumBlurGate.tsx`로 처리한다.
  - "재물운 상세 시기"는 신년운세로, "히든 매칭"(최애·꽃)은 `/saju/destiny-bias?from=free-saju`와 `/flower`로 보낸다.
- 공유 미션 카드
  - 1단계 공유 바의 아무 채널을 누르면 "재물 시크릿 키워드"(일간과 재성 오행 기준 문구)가 열린다.
  - 해제 상태는 sessionStorage에 저장하되 try/catch로 감싸고, 실패하면 화면 안에서만 해제한다.
- 결과 공유 이미지: 코스믹 다크 카드에 꽃·최애 티저를 넣고, PNG 1080×1350으로 만든다.
- SEO
  - `scripts/generate-sitemap.mjs`에 경로를 추가하고 `config/sitemap-lastmod.json`을 갱신한다.
  - CLAUDE.md의 SEO 체크리스트(title, H1, canonical, sitemap, noindex)를 확인한다.
  - `lib/saju/saju-service-catalog.mjs`의 "무료 사주 풀이" 링크를 `/saju/free`로 바꿀지는 보고만 한다.

### 5. 문서
- `docs/purchase-journey/IMPLEMENTATION.md:71` 옆에 공유 미션 예외를 적는다. 사용자 결정, 2026-11-08, 코인·금전 보상 없음, 카카오 제외.

## 규칙·주의
- CLAUDE.md: 라우팅·공유 변경은 RED 위험이다. main에서 직접 작업하고, `package-lock.json`은 수정하지 않는다.
- 수정 뒤 커밋은 자동으로 한다. 푸시·배포는 요청을 받았을 때만 한다.
- 영냥이(`--yn-*`)와 셸·연이·네오(`--cd-*`)의 테마 토큰은 섞지 않는다.

## 검증
- 타입 검사, 린트, 기존 테스트를 실행하고 `node scripts/generate-sitemap.mjs --check`를 확인한다.
- worker: 로그인하지 않은 `POST /api/destiny-flower`가 200을 돌려주는지, 제한을 넘으면 429인지 확인한다.
- 최애 운명: 결제하지 않아도 결과까지 가는지, details에 들어갈 때 결제 모달이 뜨는지 확인한다.
- 브라우저(ego-browser, 390px 폭)에서 `/saju/free` 전체 흐름을 확인한다.
  - 입력 → 결과(0.5초 이내) → 블러 클릭 이동 → 공유 클릭 → 키워드 해제 → PNG 저장.
  - 스레드·X intent URL이 열리는지 확인한다.
