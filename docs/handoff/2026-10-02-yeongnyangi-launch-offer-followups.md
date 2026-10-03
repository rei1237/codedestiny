---
status: active
updated: 2026-10-03
next: "docs/handoff/2026-10-02-yeongnyangi-launch-offer-followups.md 의 6번을 진행해줘 — ProductGuide 단계 버튼·QuestionSky·Spirit 예정가 숫자는 <여기에>"
---

# 영냥이 체험가 표기 — 범위 밖 후속 6건

## 왜

체험가 표기(선착순 1,000명·정식 오픈 예정가) 작업 중 발견한 범위 밖 결함을 **한 세션에 한 항목씩** 고친다.
사용자 원문: "남은 범위 밖 문제점들도 수정해주고 다른 세션에서 진행할 수 있도록 인수 인계 문서를 통해서 하나씩 진행할 수 있도록 해줘"

## 지금 상태

- 체험가 표기 본작업은 main 09ae18c2c 에 머지·push, PR CI success. 표시 정본 `lib/brand/launch-offer.ts`.
- 1번 완료(0d06de996), 2번 완료(fc4e92005, main PR CI success), 3번 완료(f642cef8d), 4번 완료(4ac1601df, 96318447a — main Browser Shadow 108/108 success), 5번 완료(3bb25ea95). 7번 완료(dfbe72304). 남은 것은 6번뿐이며 숫자를 사용자가 정해야 하므로 착수 전 사용자에게 묻는다. 항목 하나 = 커밋 하나(되돌리기 단위). 끝나면 여기 `[x]` + 커밋 SHA 를 적는다.

## 남은 작업 (위에서부터 하나씩)

- [x] **1. Consultation 가격 표기 통일 (GREEN)** — 완료 0d06de996 (ko 만 `toLocaleString+"원"` 분기, `readingPrice` 는 그대로 — LocalizedProductGuide 영향 없음). — ko 에서 예정가는 "9,900원", 실가는 `price()` 가 "₩1,000" 이라 한 줄에 두 표기가 섞인다.
  `app/yeongnyangi/_components/Consultation.tsx:52` `price` → `readingPrice`(`app/yeongnyangi/_lib/use-reading-language.ts:35`, Intl currency). 다른 영냥이 화면은 전부 "N원"(`NightHero.tsx:25`, `ProductGuide.tsx:30`).
  완료 기준: ko 생선 버튼·결제 합계가 "1,000원", 비한국어 로케일은 지금 그대로(₩/통화 표기). `readingPrice` 를 쓰는 다른 호출부를 grep 해 ko 바뀜이 원치 않는 곳에 번지지 않게 — 바꾸려면 Consultation 의 `price` 만 ko 분기.
- [x] **2. 결제 합계 스크린리더 문장 (GREEN, a11y)** — 완료 fc4e92005 (Consultation 에서만 `styles.srOnly` ", 체험가 " 삽입, 예정가가 있을 때만. `LaunchPlannedPrice` 는 그대로 — 배너·NightHero 는 뒤에 이미 "체험가"/"사주 고등어" 가 와서 중복됨). 남은 관찰: 생선 버튼(`fishPrice`)도 "정식 오픈 예정가 9,900원 1,000원" 으로 읽힌다 — 범위 밖, 미수정. — 합계가 "정식 오픈 예정가 9,900원 ₩1,000" 로 읽힌다.
  `Consultation.tsx` checkoutTotal 블록 + `app/components/LaunchPlannedPrice.tsx`. 실가 앞에 시각 숨김 "체험가" 를 붙이는 식으로 "정식 오픈 예정가 9,900원, 체험가 1,000원" 이 되게. 시각 표시는 바꾸지 않는다.
  완료 기준: `__tests__/ui/yeongnyangi-launch-offer.test.mjs` 에 접근성 텍스트 단언 1개 추가.
- [x] **3. 챕터 수 불일치 조사→수정 (GREEN 조사, 수정은 결과에 따라 RED)** — 완료 f642cef8d. 실측: `READING_V7_ENABLED=true`(`reading-v7.ts:10`), v7 은 개인 해석·물어보기(타로는 choice·love)에만 적용돼 챕터 수가 체계·종류마다 다르다(예: 광어 사주 13·숙요 8·점성술 10·궁합 11, 참치 사주 24·베다 23·숙요 10). `catalog.ts` 는 건드리지 않고 `consultationChapterCounts(p)`(`consultation-kinds.ts`)를 추가해 천원운세·YeongnyangiGuide 두 표가 제공 종류 전체의 매니페스트 길이 범위를 쓴다 → 연어 6~8·광어 8~13·참치 10~24. 테스트는 `yeongnyangi-reading-v7.test.mjs` 마지막. 남은 관찰(범위 밖, 미수정): 같은 표의 "N자 이상" 열은 여전히 v6 티어 정책 최소치이고 v7 은 챕터당 1,400자×챕터 수다; 천원운세 체계별 목차(`page.tsx:131`)는 `readingManifest(p)`(v5 함수)로 그려 상담 화면의 v6 목차와 제목이 다를 수 있다; `NightHero`·`SpiritConsultation`·Library 의 `chapterCount` 는 고등어라 5 로 일치. — `/yeongnyangi/1000-won-fortune/` 가격표는 광어 11·참치 15, 상담 화면 생선 버튼은 광어 13·참치 24.
  가격표 = `Product.chapterCount`(`worker/yeongnyangi/payments/catalog.ts:13` → `readingChapterCount`, `worker/yeongnyangi/fortune/reading-policy.ts:30`, v5/v6 버전 기준).
  버튼 = `consultationManifest(...).length`(`worker/yeongnyangi/fortune/consultation-kinds.ts:46`, v7 이 켜지면 `readingManifestV7`).
  추정(미검증): v7 매니페스트 길이와 카탈로그 숫자가 갈라졌다. 실제로 전달되는 쪽(=생성 매니페스트)이 정본일 가능성이 크다 → 가격표가 그 값을 쓰게 바꾼다.
  🔴 `catalog.ts` 는 결제 축 파일 — 값을 바꾸면 check:fast 가 전체 jest 로 승격(~500s), paid-gate-auditor 로 동결 매니페스트 확인. 표시만 고치는 쪽(가격표가 manifest 길이를 쓰게)이 더 안전하다.
  완료 기준: 두 화면이 같은 수를 보이고, 그 수가 실제 생성 챕터 수와 같다는 테스트 1개.
- [x] **4. Yeongnyangi Browser Shadow 실패 (RED: CI 검증기)** — 완료 4ac1601df. quote mock 은 `quoteServicePack` 분기 미러(팩 없음 → `unavailable`, 결제 끝난 행 → `paid`). 첫 케이스에 가려 있던 실패 3종도 함께: room 링크 문구(c5bbf9f0d 에서 "상담 내용 살펴보기"), WebKit 이동 취소 읽기 허용 목록에 `/api/auth/me`·quote·`/version.json?t=` 추가, home-profile-catalog 가 결제창 렌더 뒤 이동. unknown 단언은 그대로. 로컬 최종 코드 108/108. 후속 96318447a: CI WebKit 의 generation-interrupted 에서 `goto` 이동이 청크와 `?cdcb=` 재시도를 함께 끊어 ChunkLoadError — WebKit 에서 그 청크가 200 으로 서빙될 때만 허용(없는 청크는 404 로 실패 유지). 같은 run 첫 시도의 `page.reload: WebKit encountered an internal error`(webkit-390-CARD-redirect)는 재실행에서 재현 안 됨 = 러너 일시 오류로 판단, 손대지 않음. 남은 관찰(범위 밖): WebKit 취소 읽기 허용 목록은 케이스마다 경로를 덧붙이는 구조라 새 읽기 요청이 생길 때마다 다시 깨질 수 있다; 같은 fixture 를 import 하는 다른 verify-yeongnyangi-* 15개는 이번에 돌리지 않았다(라우트 추가만이라 약화는 없음). — `scripts/lib/yeongnyangi-mobile-payment.mjs:286` 단언 "Unrecognised API must not silently succeed" 가 `POST /api/payments/service-packs/quote` 2회로 실패. mock 라우트(`:59-160`)에 service-packs/** 가 하나도 없다. 호출원 `app/components/service-packs/service-pack-client.ts:57`.
  174b8a41a 이전부터 실패(체험가 작업 무관). shadow 라 게이트는 아님.
  방향: quote 를 실제 워커 응답 형태(`worker/payments/` 의 service-packs quote 핸들러)대로 mock 에 추가. 단언은 약화하지 않는다(fail-closed 유지).
  완료 기준: 로컬 `node scripts/verify-yeongnyangi-browser.mjs` 통과 + push 후 그 워크플로 success.
- [x] **5. 결제 게이트 트리거 공백 (RED: CI)** — 완료 3bb25ea95 (main 머지 807b80f73). `deepVerificationRules` 에 3줄(service-packs 디렉터리 전체·Consultation.tsx·worker/yeongnyangi/payments)과 YAML paths 3줄을 추가. 자체 테스트에 참 3건·거짓 1건(NightHero) 고정, 72/72. 가짜 diff `--plan` 은 tier=critical, deep 사유 "영냥이 생선 단계 결제창"·"영냥이 상품 가격 카탈로그". 가정: service-packs 는 CSS 까지 포함(가격 숨김도 결제 표시 회귀라서). 남은 관찰(범위 밖): 다른 영냥이 결제 진입(QuestionSky·Spirit 상담, 채팅 가격)은 여전히 게이트 밖이다. — `.github/workflows/paid-flow-gates.yml` paths 와 `scripts/lib/change-risk.mjs:92-156` 에 `yeongnyangi` 0건. `app/components/service-packs/**`, `app/yeongnyangi/_components/Consultation.tsx`, `worker/yeongnyangi/payments/**` 를 바꿔도 결제 게이트가 안 돈다.
  🔴 메모리 "CI gate scope": 결제 게이트 범위 안이지만 **착수 전 사용자에게 위험·검증·롤백을 먼저 알리고** 진행. 기존 검사 삭제 금지, 경로 추가만.
  완료 기준: `npm run check:fast -- --plan` 에서 위 경로 변경이 결제 고위험으로 분류됨(가짜 diff 로 확인) + 변경 커밋의 CI 에서 paid-flow-gates 가 실제로 돈다.
- [ ] **6. 표시 범위 확장 (선택 — 사용자에게 먼저 물을 것)** — ProductGuide 단계 버튼, QuestionSky(`QuestionSkyConsultation.tsx:62`)·Spirit(`SpiritConsultation.tsx:53`)에는 예정가가 없다. 연이/네오 채팅 가격은 지금 그대로 둔다(2026-10-03 사용자 결정 "연이/네오 채팅 가격은 유지하도록해") — 예정가를 붙이지 않는다. 생선 단계가 아니라 예정가 표가 없으므로 숫자는 사용자 결정. 팩 상점 1280px 대비는 별도 판정 안 함(390px 는 6.7:1).
- [x] **7. 생선 버튼 스크린리더 문장 (GREEN, a11y)** — 완료 dfbe72304 (fishPrice span 에 예정가가 있을 때만 `styles.srOnly` ", 체험가 ", ko 한정. 테스트 `fish button price reads …` 는 ko 문장과 en 무표기를 단언). — 2번에서 발견. `Consultation.tsx` 생선 버튼의 `<span className={styles.fishPrice}>` 가 "정식 오픈 예정가 9,900원 1,000원" 으로 읽힌다(합계만 고쳤음).
  방향: 2번과 같은 방식 — 예정가가 있을 때만 `styles.srOnly` ", 체험가 " 를 실가 앞에. 시각 표시 불변, 비한국어 불변.
  완료 기준: 2번 테스트(`checkout total reads …`)처럼 소스에서 `fishPrice` span 을 뽑아 렌더하고 읽히는 텍스트를 단언하는 테스트 1개.

## 4번 착수 메모 (2026-10-02 실측, origin/main 805c59cf8 기준)

다음 세션 첫 문장(복사):

```
docs/handoff/2026-10-02-yeongnyangi-launch-offer-followups.md 의 4번(Yeongnyangi Browser Shadow 실패)만 진행해줘. RED 이니 위험·검증·롤백을 먼저 보고하고 바로 착수해
```

- 실패 위치: `scripts/lib/yeongnyangi-mobile-payment.mjs:286` `assert.deepEqual(f.state.unknown,[],...)`. 알 수 없는 API 는 `:158` 에서 `state.unknown` 에 쌓인다. mock 분기는 `:59` `context.route('**/*')` 안.
- 워커 정본: `worker/payments/service-pack-routes.js:22` `POST /service-packs/quote` → `quoteServicePack`(`worker/payments/service-packs.js`, 반환 `:218-230`). 팩이 없는 일반 요청의 응답은 `{ok:true,requestId,featureKey,accessMethod:null,status:'unavailable',existingUse:null,candidates:[]}`.
- 클라이언트 검증: `app/components/service-packs/service-pack-client.ts:56-61` — `requestId`·`featureKey` 가 요청과 같고 `status` 가 허용 6종이어야 한다. mock 은 요청 body 의 `requestId` 와 해당 fortune 의 `featureKey`(`product.cdFeatureKey`)를 그대로 돌려줘야 한다. 하드코딩 값이면 `INVALID_QUOTE` 로 다른 실패가 난다.
- 위험(선보고용): shadow 워크플로(`.github/workflows/yeongnyangi-browser-shadow.yml`)라 required 게이트가 아님 → 머지 차단 위험 낮음. 바뀌는 것은 QA 스크립트 mock 뿐이고 워커·결제 코드는 그대로다. 함정: quote 를 고치면 그 뒤 단계의 다른 service-packs 호출(wallet·catalog 등)이 새로 `unknown` 에 잡힐 수 있다 — 단언을 약화하지 말고 실제 워커 응답 형태로 하나씩 추가한다.
- 검증: 로컬 `node scripts/verify-yeongnyangi-browser.mjs`(실패 시 리포트의 `unknown` 목록 확인) → `npm run check:fast` → push 후 해당 커밋의 "Yeongnyangi Browser Shadow" success. 결과는 `gh run list --commit <SHA> --json name,conclusion` 로 확인.
- 롤백: 이 커밋 하나 `git revert`. 워커·결제 코드를 건드리지 않으므로 운영 영향 없음.
- 시작 전: 공유 체크아웃에 옆 세션의 미push 커밋·미커밋 파일이 있으면(2026-10-02 실측: ziwei 커밋 2개, `js/saju-engine.js` 등) `scripts/create-safe-worktree.ps1 -Slug yn-shadow-quote` 로 워크트리에서 작업하고 origin/main 에 머지·push 한다.

## 정본 예시

예정가 표기 방식: `app/yeongnyangi/_components/ProductGuide.tsx` 의 `plannedPriceFor` + `<LaunchPlannedPrice/>`.

## 함정

- 영냥이 파일은 CRLF/LF 혼재. node 패치 패턴에 `\n` 을 넣지 말 것(`yeongnyangi.module.css` 만 LF).
- `app/**` 를 고쳐서 `verify:sitemap-drift` 가 실패하면 `npm run sitemap:generate` 결과(원장·sitemap 4개)를 **같은 커밋**에 넣는다.
- dev mock 에 `/api/payments/service-packs/catalog` 없음 → 팩 화면 캡처는 playwright `route` 로 `SERVICE_PACK_PLANS` 주입.
- `__tests__/ui` 는 `node --test`.
- Bash heredoc 으로 node 패치 스크립트를 만들면 정규식 백슬래시가 한 겹 벗겨진다(2번에서 실측). 스크립트는 Write 도구로 스크래치패드에 쓰고 실행.
- 공유 체크아웃에 옆 세션의 미커밋 파일(`.tmp/`, `tsconfig.json` 등)이 있으면 `check:fast` 가 critical(전체 test:node+jest, 10분+)로 승격된다. 그 안에서 무관한 node 테스트가 동시 실행 헛실패할 수 있으니 실패 파일은 단독 `node --test` 로 재확인. 출력을 `| tail` 로 자르지 말고 파일로 받아 단계별 결과를 남길 것.
- sitemap 드리프트는 먼저 `npm run verify:sitemap-drift` 로 확인 — 2번(JSX 한 줄 수정)은 재생성 없이 OK 였다.

## 검증

```
node --test __tests__/ui/yeongnyangi-launch-offer.test.mjs
npm run check:fast
```

## 모르는 것

- 3번: 어느 챕터 수가 사용자에게 약속할 값인지(v7 이 운영에서 켜져 있는지 포함) — 코드로 확정 못 하면 사용자에게 묻는다.
