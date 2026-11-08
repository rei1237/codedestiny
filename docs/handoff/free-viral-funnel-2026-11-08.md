---
status: active
updated: 2026-11-08
next: "4단계 — `/saju/free` 초간단 무료 사주 (꽃 클라이언트 유료 게이트는 아직 사용자 결정 대기: 아래 \"2단계 함정\" 참고, 4단계를 막지 않음)"
---

# 무료 바이럴 퍼널 (초간단 무료 사주 + 운명의 꽃·최애 운명 무료 개방)

## 첫 행동
1. `Set-Location D:\Development\codedestiny-worktrees\free-viral-funnel-20261108-110954` 후 `git status`·`git log --oneline -3`.
2. 설계: `docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md` 를 끝까지 읽는다(결정·파일·검증이 모두 거기 있다).
3. 아래 단계 중 체크 안 된 첫 단계만 한다. 끝나면 체크·결과 메모를 이 문서에 적고 커밋한다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\free-viral-funnel-20261108-110954`
- 브랜치: `wt/free-viral-funnel-20261108-110954` (base origin/main `1a9f0fb18`)
- 주 체크아웃 `D:\Development\code-destiny` 는 다른 세션의 `feat/world-cast-page` + 미커밋 작업 → **건드리지 않는다.**
- node_modules 는 주 체크아웃으로의 정션. 워크트리 제거 시 정션부터 끊는다(설계 문서 아님, CLAUDE.md).

## 승인 상태 (2026-11-08, 사용자)
- 계획 승인(ExitPlanMode). "기존 것 무료 개방", 최애 운명 "결과 카드만 무료"(details 5,000원 유지), 공유 해제 "버튼 누르면 해제".
- 커밋은 자동. **push·배포·main 머지는 승인 안 됨** — 끝나면 보고만.

## 작업 규칙과 함정
- CLAUDE.md(저장소) 규칙을 따른다: 라우팅·공유 변경은 RED, `package-lock.json` 수정 금지, SEO 체크리스트.
- `docs/context/design-canon.md`: 이모지는 🌸·🦁만, 유아어 금지, `--yn-*` 와 `--cd-*` 토큰 분리.
- 사내 원칙 "새 보상·공유 강요 팝업은 없다"(`docs/purchase-journey/IMPLEMENTATION.md:71`) — 공유 미션은 팝업 금지, 결과 안 인라인 카드. 5단계에서 예외를 문서화.
- 카카오 공유에는 해제 조건을 붙이지 않는다. 코인·금전 보상 없음.
- 범위 밖 버그·정리 거리는 고치지 말고 이 문서 "후속" 절에 적는다.
- 검증은 실제 명령 출력으로. 실패하면 그대로 적는다.

## 단계
- [x] 1. 공용: 스레드 intent + 공용 공유 바(X·스레드·복사·이미지 저장) + trackShare
- [x] 2. 운명의 꽃 무료 개방(worker requireAuth 제거 + IP 제한, 레거시 클라이언트, 공유 바·CSS 공개 연출)
- [x] 3. 최애 운명: 결제 검사를 details 로 이동, 슬롯 공개 연출, 문구·레지스트리 설명, 공유 바 교체
- [ ] 4. `/saju/free` 초간단 무료 사주(폼·70/30·블러·공유 미션·PNG 카드·SEO·사이트맵)
- [ ] 5. 문서: 공유 미션 예외 기록, 이 문서 status 정리
- [ ] 6. 전체 검증(타입·린트·테스트·사이트맵 --check·브라우저 390px)

## 결과 메모
- 1단계(2026-11-08, 커밋 `2ece773c4`)
  - intent: `js/share-service.mjs` 의 `withShareUtm(url, source)`·`socialIntentUrl('x'|'threads', {text, url})`(+`.d.mts`, `public/js` 미러). UTM 은 `utm_source=<채널>&utm_medium=share&utm_campaign=public_share`. 스레드는 `https://www.threads.net/intent/post?text=<본문\n링크>`. 레거시 셸(`/flower`)도 같은 모듈을 import 해 쓸 수 있다.
  - 공유 바: `app/components/ViralShareBar.tsx`(default export). props `url`(경로면 현재 origin 기준), `text`, `feature`, `title?`, `imageRef?` 또는 `getImageNode?`(둘 다 없으면 이미지 버튼 숨김), `imageFileName?`, `imageWidth?`·`imageHeight?`(주면 pixelRatio 1, 예: 1080×1350), `onShared?(channel)`, `className?`. channel 은 `"x" | "threads" | "link" | "download"`.
  - `onShared` 는 X·스레드 창 열기, 링크 복사(클립보드 막혀 수동 복사 입력란이 떠도 호출), 이미지 공유·저장 성공 때 부른다. 이미지 공유 시트 취소(AbortError)·생성 실패 때는 부르지 않는다. 카카오는 없다.
  - `trackShare({feature, channel})` 를 버튼마다 쏜다. `useAnalytics` 의 `ShareChannel` 에 `threads` 를 추가했다.
  - 검증: `node --test __tests__/ui/share-service.test.mjs` 6/6 통과(새 intent 테스트 포함). `npm run check:fast` EXIT=0 — typecheck PASS, lint, test:node 4670/4670, jest 455 suites·7700 tests 통과. 페이지 연결은 아직 없음(2~4단계).
- 2단계(2026-11-08, 커밋 `784ea24ff`)
  - worker `worker/routes/destiny-flower.js`: requireAuth 제거. `incrementRateLimit`(Mongo `abuse_scores`, destiny-compass·anatomy 와 같은 저장소)로 IP SHA-256 해시 기준 30회/60초(`FLOWER_MATCH_RATE_LIMIT`). 초과 시 429 `RATE_LIMITED` + `Retry-After: 60`. DB 실패 시 아이솔레이트 Map 폴백. 공개 카드 GET `/flower/:id` 는 그대로. `FLOWER_UNLOCK_FEATURE_KEY` 유지.
  - 레거시 셸 `js/core/index-inline-runtime.js`(+public 미러): Authorization 헤더 제거, 402·401 분기 → 429 `limited` 상태 안내(`status.rateLimited`).
  - 공유 줄 `#dfViralShare`(`.df-studio-main` 뒤): X·스레드(`socialIntentUrl`, `import('/js/share-service.mjs?v=build-…')`), 링크 복사(`_dfShareCopy`), 이미지 저장(기존 `_dfRenderShareCard` 스토리 카드). 꽃이 바뀔 때 `.df-studio-main.is-revealing` 카드 뒤집기(`dfCardFlipIn`·`dfBloomGlow`, reduced-motion 에서 none). CSS 는 `styles/destiny-flower-cosmic.css` 끝.
  - 검증: route jest + free-flower-billing 17/17, `node --test __tests__/ui/destiny-flower-*.static.test.js` 55/55, `npm run check:fast` EXIT=0(sitemap-drift OK 1060 URL, typecheck, lint, test:node 4670/4670, jest 455 suites·7703 tests).
- 3단계(2026-11-08, 커밋 `85d8f7281`)
  - `DestinyBiasClient.tsx`: `compute = computeCore`(결제·로그인 없음). 결제는 `openDetails()` 한 곳(`ensurePaidAccess`, featureKey `destiny-bias-analyze`, 50코인/5,000원, reason "최애운명 상세 케미 리포트"). 비로그인·결제 모달은 공용 게이트(useCoinGate)가 띄운다. "DestinyBiasCoinModal" 같은 전용 모달은 코드에 없다.
  - details 단계 = 결과 화면 안 `ChemiSections`·`ChemiReportTabs`·`ChemiEvidencePanel`. 해금 전에는 잠금 카드(목록·가격 버튼·고지 notices)만 보인다. 해금 단위는 `partner.kind:id:생일:달력`(무드·테마 변경은 재결제 없음, 메모리에만 — 새로고침하면 다시 잠김). 결제 재개(usePaidResume, 같은 키)는 결과를 다시 계산하고 해금한다.
  - 무료 구간: 포토카드(앞·뒷면 세부 점수 게이지 포함), 사진 넣기, 공유 카드, 꾸미기, 멤버 바꾸기, 최근 결과.
  - 슬롯 공개: `components/chemi/ChemiSlotReveal.tsx`(framer `m`). 같은 그룹 멤버(모자라면 로스터)로 14칸 릴이 1.5초 감속 → 내 최애 카드가 rotateY 로 뒤집혀 케미 유형 엠블럼 → 0.5초 뒤 결과. "바로 결과 보기" 버튼, reduced-motion 이면 연출 없음(`revealing` 을 켜지 않음).
  - 공유: `ViralShareBar`(X·스레드·링크 복사, url=`buildInviteUrl(partner,"share_bar")`) 추가. 이미지 저장은 기존 `handleSaveImage`(공유 카드 노드 shareCanvasRef, 기기 사진 포함)를 유지해 ViralShareBar 에는 이미지 props 를 주지 않았다 — ViralShareBar 의 이미지 버튼은 navigator.share 로 기기 사진까지 공유해 "공유 파일에서 사진 레이어 제외" 규칙과 어긋나기 때문. `ChemiShareBar` 에서 X·"친구도 해보기"(링크 복사 중복)를 뺐다. 카카오(카드 공유 폴백)는 그대로, 해제 조건 없음.
  - 문구: `page.tsx` ko/en/ja 설명, `ChemiHook` "결과 카드와 공유는 무료, 자세한 리포트는 단건 결제". 레지스트리 `worker/lib/paid-feature-registry.js` reason 만 변경(가격 그대로) + `lib/payment/light-fortunes.generated.json` 재생성. 서버 쪽은 코인 게이트 가격표뿐이라 추가 검증 경로 없음.
  - 테스트: 새 `__tests__/ui/destiny-bias-paid-details.static.test.mjs`(4). `paid-non-llm-delivery-fixtures` consumer 마커를 `<ChemiSections copy={outcome.copy} />` 로, autosave 테스트 핸들러 목록에서 handleShareToX 제거.
  - 검증: destiny-bias node 테스트 98/98, 워커 jest 4 suites 48/48, qa-destiny-bias-touch PASS, verify-paid-gate-ui-regression PASS, light-fortunes fresh, payment-p0-inventory PASS. `npm run check:fast` 첫 실행은 sitemap-drift FAIL → `npm run sitemap:generate` 후 재실행 EXIT=0(sitemap OK 1060, typecheck, lint, test:node 4673/4673, jest 455 suites·7703 tests).

## 함정(3단계에서 발견)
- 소스 파일을 바꾸면 sitemap lastmod 가 바뀌어 `verify:sitemap-drift` 가 실패한다. 커밋 전에 `npm run sitemap:generate` 를 같은 커밋에 담는다.
- `paid-feature-registry.js` reason 을 바꾸면 `node scripts/lib/build-light-fortunes.mjs` 로 `light-fortunes.generated.json` 을 다시 만들어야 `verify:light-fortunes` 가 통과한다.
- `docs/payments/payment-p0-inventory.{json,md}` 라벨은 아직 "최애운명 케미 분석"(검증 스크립트는 라벨을 보지 않음).

## 함정(1단계에서 발견)
- 🔴 `__tests__/ui/saju-bundle-copy.static.test.js:264` 가드: `public·docs·__tests__·marketing` 밖에서 "무료 사주"/"무료사주" 문자열(주석 포함)이 나오면 실패한다("무료 만세력"으로 쓰라고 함). 4단계 `/saju/free` 의 화면 문구·title·메타·주석에 "무료 사주"를 쓰면 막힌다 → 문구를 "무료 만세력"·"초간단 사주 풀이" 등으로 쓰거나, 정말 필요하면 그 가드의 허용 목록을 사용자 결정으로 바꿔야 한다(문서에 없는 결정이라 4단계 시작 때 판단·보고).
- 공용 모듈(`js/share-service.mjs`·`useAnalytics.ts`)을 고치면 `verify:sitemap-drift` 가 실패한다. `npm run sitemap:generate` 결과(28개 URL lastmod)를 같은 커밋에 담았다.
- `node scripts/sync-legacy-static-to-public.mjs` 는 `index.html`·`public/*/index.html` 의 `?v=build-…` 토큰도 바꾼다. 미러 대상 파일만 남기고 나머지는 되돌린다.

## 함정(2단계에서 발견)
- 🔴 **꽃은 클라이언트에서 아직 유료다.** 설계 문서와 달리 `openDestinyFlowerStudio` → `_dfRequireSourceCoinPayment` → `_dfRequirePaidSourceUnlock` 가 flower-fc 해금 없는 사람을 막는다(비로그인은 로그인 확인, 로그인은 "해금 후 이용"). index.html 타일도 `data-tile-lock-cost="50"`·"🔒 해금 5,000원". `__tests__/worker/free-flower-billing.test.js` 는 flower-fc 신규 구매가 가능(5,000원)하다고 단언하고, 게이트는 커밋 `e419b55bd`(2026-10-12)로 복구된 것. `js/core/pass-verdict.js:132` 에도 flower-fc. → flower-fc 는 "미사용 키"가 아니라 **판매 중인 5,000원 상품**. 지우거나 게이트를 여는 건 결제 결정이라 2단계에서 하지 않았다. API 는 열렸지만 셸 화면은 여전히 비구매자를 막는다 — 사용자 결정 필요.
- 워커 jest 는 `NODE_OPTIONS=--experimental-vm-modules npx jest <파일>` 로 돌린다(그냥 npx jest 는 import 구문 오류).
- sync 스크립트가 바꾼 index.html 류 토큰 중 og-vvip 이미지 등 무관한 것은 되돌리고 `destiny-flower-cosmic.css`·`index-inline-runtime.js` 토큰만 남겼다.

## 후속(범위 밖, 보고만)
- 최애 운명: `ViralShareBar` 는 `cd-*` 토큰을 써서 라이트 테마에서는 최애 운명의 어두운 `--dbk-*` 화면과 색이 어긋날 수 있다(브라우저 확인은 6단계).
- 최애 운명 상세 해금은 메모리 상태라 새로고침 뒤 다시 잠긴다(per_use 상품이라 재결제 요구 가능). 서버 영수증으로 복원할지는 사용자 결정.
- `scripts/verify-paid-gate-ui-regression.mjs:336` 주석 "destiny-bias 2026-08-21 전면 무료" 는 사실과 다르다(그대로 둠).
- `/flower` noindex(`app/flower/page.tsx:11-16`)는 로그인과 무관: AdSense "가치 낮은 콘텐츠" 거절 뒤 얇은 본문(449자, 2026-08-17 측정) 때문. noindexPathPrefixes 로 옮기면 ShareWidget 이 숨는다는 주석도 있다. 그대로 둔다.
- i18n `fortune.destinyFlower.ui.status.atelierLocked`·`status.loginRequired`(`i18n/authored/destinyFlower-03.json`)는 이제 미사용. 새 키 `viral.*`·`status.rateLimited` 는 번역 없음(한국어 폴백).
- 레거시 공유 줄에는 trackShare 분석 이벤트가 없다.
