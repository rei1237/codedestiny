---
status: in-progress
updated: 2026-11-09
next: "2026-11-09 후속 구현의 critical 검사와 모바일 검증을 마치고 커밋. push·main 머지·배포 보류 유지."
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
- 2026-11-09 사용자 요청: "docs/handoff/free-viral-funnel-2026-11-08.md 읽고 후속 절의 남은 작업 진행해".
- 2026-11-09 추가 선택: "동일 최애·생일의 구매 결과 복원까지 구현". 가격·결제 수단은 유지하고 저장된 원문 재열람만 추가한다. 실결제·운영 DB·push·main 머지·배포 승인은 아님.
- 계획 승인(ExitPlanMode). "기존 것 무료 개방", 최애 운명 "결과 카드만 무료"(details 5,000원 유지), 공유 해제 "버튼 누르면 해제".
- 커밋은 자동. **push·배포·main 머지는 승인 안 됨** — 끝나면 보고만.
- 꽃 유료 게이트(2단계에서 발견, flower-fc 5,000원 판매 중): 사용자 답 "결과 카드만 무료"(2026-11-08). 내 꽃 결과·카드·공유는 무료, 꽃 아틀리에 상세(후보 꽃·꽃말 심화 등 유료 영역)는 flower-fc 5,000원 유지. 기존 구매자 권한 유지.
- 공유 미션 문구: "무료 사주" 가드(`saju-bundle-copy`)는 바꾸지 않는다. `/saju/free` 문구는 "무료 만세력" 등 가드에 맞는 말로 쓴다(오케스트레이터 판단, 사주 묶음 전용 정책 유지).

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
- [x] 2b. 꽃 결과 카드만 무료: 셸 `openDestinyFlowerStudio`/`_dfRequirePaidSourceUnlock` 게이트를 상세 영역 앞으로 옮기고, 타일 "🔒 해금 5,000원" 표시를 결과 무료·상세 유료에 맞게 정리. `__tests__/worker/free-flower-billing.test.js`·`pass-verdict.js:132` 정합 유지.
- [x] 3b. 최애 상세 리포트 재결제 위험: 결제 뒤 새로고침·재방문 때 같은 최애·생일로 다시 돈을 받는지 확인(`ensurePaidAccess`/`useCoinGate` 가 서버 권한을 보는지). 이전(3단계 전)에도 같았는지 비교. 새로 생긴 위험이면 고친다(결제 뒤 전달이 최우선).
- [x] 4. `/saju/free` 초간단 무료 사주(폼·70/30·블러·공유 미션·PNG 카드·SEO·사이트맵)
- [x] 5. 문서: 공유 미션 예외 기록, 이 문서 status 정리
- [x] 6. 전체 검증(타입·린트·테스트·사이트맵 --check·브라우저 390px)
- [x] 7. 후속: 공유 바 색·복사 UTM·레거시 계측·이미지 CSP·블러 게이트 모션/토큰·꽃 무료/상세 안내와 12개 언어·Play 표시·SEO 내부 링크.
- [x] 8. 후속: 동일 최애·생일 구매 결과의 계정별 서버 보존/재열람, 영수증 재사용·환불 차단, 보관함 연결.
- [ ] 9. 후속 검증 결과 기록·커밋·스크래치 정리(push·머지·배포 보류).

## 2b 설계(완료, 커밋 `2131ba7b9`)
- 사실: `POST /api/destiny-flower/match` 는 2단계 전에도 requireAuth 뿐이고 해금 검사가 없었다 → 로그인 사용자에게 4갈래 전체가 이미 내려갔다(게이트는 클라이언트뿐). 2단계로 비로그인까지 넓어졌다.
- 서버: rate limit 뒤 `getOptionalUserFromRequest(..., {surfaceDbInfraError:true})` → `hasPurchasedAccountContentAccess(env,{userId, featureKey:'flower-fc'})`. 해금자는 전체 + `atelierUnlocked:true`. 비해금은 사주 결과 카드 필드만(`toFreeSajuCard`) + `atelierUnlocked:false`, 다른 3갈래·후보·이야기·꽃말 심화 없음(theme 는 화면 색이라 모두에게 준다). 권한 조회 실패는 503 대신 무료 카드 + `entitlementDegraded:true` → 클라이언트 잠금 카드가 결제 대신 "다시 확인하기"를 보인다(구매자에게 결제 유도 금지).
- 클라이언트: `openDestinyFlowerStudio` 는 게이트 없이 연다. 사주 외 탭은 `_dfRequirePaidSourceUnlock` 유지. 잠금이면 상세 영역을 숨기고 인라인 잠금 카드 CTA 로 기존 타일 미리보기 결제를 연다. 토큰 있으면 Bearer 헤더를 다시 보내고, 해금 여부를 fingerprint 에 넣어 결제 뒤 다시 받는다.
- 타일: 잠금 속성을 홈 타일에 두면 `__cdRequireTileLockGate`·미리보기 인터셉터가 비구매자를 시트에서 막아 무료 카드에 못 닿는다. 그래서 홈 타일에서 `data-tile-lock-key/cost` 를 빼고(`data-feature-key` 는 유지), 같은 속성을 가진 숨은 `#dfAtelierPurchaseAnchor` 를 `#destinyFlowerStudioSheet` 안에 두었다. `_dfResolveLockTileBySource` 가 문서 전체에서 이 앵커를 찾아 기존 미리보기 결제 흐름을 그대로 쓴다. 배지 "결과 무료 · 상세 5,000원".

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
- 2b단계(2026-11-08, 커밋 `2131ba7b9`)
  - 무료(로그인 없이): 사주가 고른 꽃 한 송이·결과 카드·`#dfViralShare`. 서버 응답은 `toFreeSajuCard` 필드(일간·계절·꽃·sticker/badge/season/scenario 라벨·saju_verdict·share_hook)뿐.
  - 유료(flower-fc 5,000원, 계정 해금): 점성술·자미두수·숙요 세 갈래, 후보·이야기·꽃말·정원사의 말·색 처방 등 상세. 서버가 권한 없으면 아예 안 보낸다(2단계 전부터 있던 "로그인 비구매자에게 전체가 내려가던" 누수도 함께 닫힘). 기존 구매자는 서버 권한(`atelierUnlocked:true`)과 기존 기기 해금 지도로 그대로 연다.
  - 셸: `openDestinyFlowerStudio` 는 항상 열고 비해금이면 사주 탭으로 고정. 잠금이면 `.df-studio--atelier-locked` 로 상세 영역을 숨기고 `#dfAtelierLock` 카드("상세 해금 · 5,000원" → `_dfRequirePaidSourceUnlock` → 기존 미리보기 결제). 권한 조회 장애면 "다시 확인하기". 해금 여부가 fingerprint 끝(`|card`/`|atelier`)에 들어가 결제 뒤 다시 받는다.
  - 홈 타일: 잠금 속성 제거, 숨은 `#dfAtelierPurchaseAnchor`(studio 안)로 이동, 배지·미리보기 cost "결과 무료 · 상세 5,000원". `free-flower-billing`·`pass-verdict.js:132` 는 그대로(판매 중 상품).
  - 검증: route jest + free-flower-billing 18/18, `node --test __tests__/ui/destiny-flower-*.static.test.js` 56/56(새 "홈 꽃 타일은 무료로 열리고…" 포함), verify-home-service-registry OK, `npm run check:fast` EXIT=0(sitemap OK 1060, typecheck PASS, test:node 4674/4674, jest 455 suites·7704 tests). 브라우저 확인은 6단계.
- 3b단계(2026-11-08, 코드 변경 없음)
  - 결론: 새로고침·재방문 뒤 같은 최애·생일로 상세를 다시 열면 **다시 결제된다.** 하지만 3단계가 만든 위험이 아니라 원래 있던 동작이다.
  - 근거: `destiny-bias-analyze` 는 per-use(`worker/lib/paid-feature-registry.js` 회당 목록). 회당 결제는 서버 보유 목록에 남지 않고(`useCoinGate.ts` 주석), `ensurePaidAccess` 의 `requestId` 는 매번 `Date.now()+random` 이라 서버 멱등도 안 걸린다. 구제는 리다이렉트 복귀 영수증(`consumePaidGrantReceipt`, 1회 소비)과 `usePaidResume` 뿐이고 둘 다 그대로 동작한다.
  - 3단계 전(`85d8f7281^`)에는 `compute` 가 form·switch·replay 마다 결제했다 → 새로고침·멤버 바꾸기·최근 결과 다시 보기마다 결제. 지금은 상세 진입에서만, 세션 안 같은 최애×생일은 한 번만 결제 → 결제 횟수는 줄었다. 결제 직후 전달(인라인 성공 → `unlockDetails`, 리다이렉트 → resume 으로 재계산+해금)도 확인. 범위를 넓히지 않고 보고만 한다.

- 4단계(2026-11-08, 커밋 `bd06a89a8`)
  - 라우트 `/saju/free/`(새 폴더, 충돌 없음. 옛 `/saju-free` → `/saju/` 301 은 별개). 문구 가드 때문에 "무료 사주" 대신 "초간단 (무료) 만세력"으로 썼다 — 가드는 건드리지 않음.
  - 파일: `app/saju/free/{page.tsx,FreeSajuClient.tsx,free-saju.module.css}`, `lib/free-saju/{compute,engine,copy,unlock,birth-date}.ts`, `__tests__/ui/free-saju-landing.test.mjs`, `app/components/PremiumBlurGate.tsx`(선택 props `ctaLabel`·`footnote`·`lockIcon`·`badgeLabel`, 기존 호출부 그대로), `scripts/generate-sitemap.mjs`(+재생성 사이트맵·원장).
  - 엔진: `calculateNatalSaju`(@/lib/korean-calendar)를 동적 import, 폼 포커스·포인터다운 때 미리 받는다. node 24 실측 평균 0.29ms(첫 호출 콜드 ~22ms) / 무거운 `computeNatalFromInput` 1.55ms. 번들 179KB(42KB gz) vs 534KB(139KB gz). 기둥은 5개 날짜(음력·23:40 포함)에서 일치(테스트). 올해 천간은 서울 오늘 12시의 연주(입춘 기준).
  - 흐름: 폼(생년월일 텍스트 입력·양/음력+윤달·시간/모름·성별) → 제출 → 결과 70%(기둥 줄, 카드 4장: 올해 키워드=올해 천간의 십신, 타고난 무기=일간, 오행 막대, 12운성=일간×일지) → 블러 30%(재물 시기 → `/new-year-ai-consultation/`, 히든 매칭 → `/saju/destiny-bias/?from=free-saju`, 보조 링크 `/flower/?from=free-saju`) → 공유 미션(ViralShareBar 아무 채널 성공 = 재물 시크릿 키워드 해제, sessionStorage `cd:free-saju:wealth-unlock`, 막히면 메모리). 퍼널 `free_saju` 단계 form_view·submit·result·blur_click·share_unlock.
  - 공유 PNG: 화면 밖 1080×1350 카드(키워드·무기·12운성·오행 막대·꽃/최애 티저). 생일은 이미지·링크에 넣지 않는다.
  - 검증: 집중 테스트 6/6, `typed-birth-input`·`saju-bundle-copy` 가드 통과, `npx tsc --noEmit` 무출력, eslint 0. `NODE_OPTIONS=--experimental-vm-modules npm run check:fast` EXIT=0 — test:node 4680/4680, jest 455 suites·7704 tests, paid-gate 77/0, sitemap --check OK(1061 URL).
- 5단계(2026-11-08, 문서만)
  - `docs/purchase-journey/IMPLEMENTATION.md:71` 에 예외 1건 기록(`/saju/free` 인라인 공유 미션 → 글자 키워드, 코인·금전 없음, 카카오 무조건, 팝업 없음, 사용자 결정 2026-11-08).
  - `docs/design/mobile-feature-registry.md` 꽃 아틀리에(낡은 "전체 해금 10,000원")·최애운명(낡은 "무료") 행을 무료/유료 분할로 고침.
- 6단계(2026-11-08, 고침 커밋 `dcdd2f7cc`·`39e9d03bd`·`b085344bf`)
  - 브라우저: 로컬 mock dev(127.0.0.1:26144), Playwright 390px. 꽃 API 는 mock 에 없어(501) `page.route` 로 실제 `worker/routes/destiny-flower.js` 핸들러(Node, Mongo 없음 → rate limit Map 폴백)에 넘겼다.
  - `/saju/free`: 제출→결과 189~437ms(dev), 기둥 戊辰 甲午 己未 癸酉(1993-07-12 09:30), 카드 뒤집기 rotateY→none·opacity 1, 가로 스크롤 없음(390), 블러 CTA 3개 이동 주소 맞음, X·스레드 intent(UTM 채널별), 링크 복사, X 클릭 뒤 키워드 해제·sessionStorage 1, PNG `free-manse-card.png` 1080×1350, 라이트·다크·neo 대비 OK, pageerror 0.
  - 고친 것(이 브랜치가 만든 결함): ① ViralShareBar 이미지 저장이 `fetch(dataUrl)` 로 CSP(connect-src 에 data: 없음, 운영도 같음)에 막혀 늘 실패 → atob Blob. ② 저장 버튼 대비 2.3 → 6.6. ③ `.cd-guide p·h3`(0,1,1)가 `/saju/free` 모듈·Tailwind 클래스를 이겨 미션 패널 글자 대비 1.1~1.4·공유 PNG 글자 축소·블러 게이트 CTA 잘림 → `.root` 접두로 특이성 올림, 게이트 흐린 영역 min-height 23rem.
  - `/saju/destiny-bias/`(비로그인): 슬롯 공개 → "바로 결과 보기" → 결과·포토카드, 그동안 결제·인증 API 호출 없음(/api/recommendations 만). "상세 리포트 열기 · 5,000원" → auth/me·payments/config 뒤 공용 결제 시트("최애운명 상세 케미 리포트 5,000원"). 상세 섹션은 해금 전 안 보임. ViralShareBar X·스레드·링크(UTM `share_bar`) OK. 라이트 `cd-*` 버튼이 어두운 화면 위 밝은 알약으로 보인다 — 읽히지만 톤이 다름(후속).
  - 꽃 스튜디오(셸, 비로그인): `openDestinyFlowerStudio('saju')` → "운명의 꽃 연동하기" → `POST /api/destiny-flower/match` 200, `atelierUnlocked:false`, sources 는 `saju` 하나(4갈래 요청해도), saju 키는 profile(일간·계절)·flower·flower_data(라벨 5개)·saju_verdict·share_hook·fallback_logic 뿐 — 후보·이야기·정원사·색 처방 없음. `#dfViralShare`(X·스레드·링크·이미지)·`#dfAtelierLock`("상세 해금 · 5,000원") 보임, 가로 스크롤 없음.
  - 명령: `NODE_OPTIONS=--experimental-vm-modules node scripts/check-changed.mjs --profile=fast --skip-build --base=1a9f0fb18` EXIT=0(sitemap-drift OK 1061, typecheck, lint, test:node 4680/4680, paid-gate PASS, jest 455 suites·7704 tests). `node scripts/generate-sitemap.mjs --check` OK(1061). 집중 `node --test __tests__/ui/free-saju-landing.test.mjs` 통과. ※ 트리가 깨끗하면 check-changed 는 "검사할 변경 없음"으로 끝난다 → `--base=1a9f0fb18` 필요.
  - 스크린샷: `D:\Development\Temp\claude\ec29f026d20d029c\9f3ab53a-2850-4b68-967e-01c1bdf39494\scratchpad\verify\`(세션 임시 폴더).
  - 확인 못 한 것: 실제 워커·Mongo·로그인·결제 완료 흐름(구매자 `atelierUnlocked:true`, 최애 결제 뒤 resume), 카카오, 실기기(iOS Safari·안드로이드·Play 앱), 운영 빌드 속도, 스레드 글쓰기 실제 게시(로그인 화면으로 넘어감).

## 함정(4단계에서 발견)
- 🔴 생년월일 `type="date"` 금지: `__tests__/ui/typed-birth-input.test.js:356` 가 app 전체에서 birth/생년월일/생일 문맥의 `type="date"` 를 잡는다. `birthDateTextInputProps`(`lib/birthDateInputProps.ts`)를 쓴다. 단 그 헬퍼의 onBlur 정규화는 양력 실재 날짜만 통과시켜 음력 2월 30일 같은 날을 지운다 → `lib/free-saju/birth-date.ts` 로 달력 종류별 정규화를 덮어썼다.
- 사이트 기본 테마는 라이트다. 어두운 토큰은 `--cd-sukuyo-*` 뿐이라 module CSS 는 사설 `--fs-*` 로 기존 `--cd-*` 를 받아 썼다(새 hex 없음). ViralShareBar 는 라이트 `cd-*` 클래스라 다크 화면 위 밝은 패널(`bg-cd-surface`) 안에 둔다.
- 정적 export: 오늘 날짜(`max` 등)를 렌더 때 계산하면 빌드 날짜로 굳고 수화 불일치가 난다 → 제출 때 `seoulToday()` 로 검사.
- 정적 문자열 테스트는 주석을 먼저 지운다(헤더 주석의 "카카오 없음"이 `doesNotMatch(/카카오/)` 에 걸린다).
- check:fast 가 도는 중에 소스를 고치면 sitemap lastmod 가 바뀌어 drift 로 막힌다. 고친 뒤 `npm run sitemap:generate` 하고 다시 돌린다.
- bash heredoc·sed·perl 은 또 백슬래시를 먹었다(`/\D/g` → `/D/g`). 정규식이 든 수정은 Edit 도구로.

## 함정(2b에서 발견)
- 🔴 홈 타일에 `data-tile-lock-key/cost` 가 남으면 `__cdRequireTileLockGate`(런타임)·미리보기 인터셉터(`_hasPaidPreviewSignal`)가 비구매자를 로그인 확인·미리보기 시트에서 막는다 → 무료 카드에 못 닿는다. 잠금 속성은 숨은 앵커에만 둔다. `destiny-flower-single-card` 가드는 마크업 `data-tile-lock-key="flower-fc"` 가 정확히 1개이길 요구한다.
- 마케팅 사전(`FEATURE_MARKETING_COPY`)에 FAQ 를 더하면 `sync:marketing-copy` 재생성 + 11개 로케일 번역(`feature-marketing-modal-i18n` 가드)이 필요하다 → 이번엔 FAQ 추가를 되돌렸다.
- sync 스크립트는 en/ja/zh/zh-tw 의 `pb__light-list` 줄(라이트 운세 이름)도 바꾼다 — 무관해서 되돌렸다. og 이미지 토큰도 되돌림.
- bash heredoc·sed 는 정규식 백슬래시(`/|card$/`)를 먹는다. 백슬래시가 든 코드는 Edit/Write 도구로.
- `__tests__/ui/mock-test-runner.test.mjs` 는 부하가 크면 spawnSync ETIMEDOUT 으로 실패한다(단독 5/5 통과, 재실행 통과). 코드와 무관한 흔들림.

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

## 후속 원목록(2026-11-08 관측; 아래 2026-11-09 처리 현황이 우선)
- 최애 운명: `ViralShareBar` 는 `cd-*` 토큰을 써서 라이트 테마에서는 최애 운명의 어두운 `--dbk-*` 화면과 색이 어긋날 수 있다(브라우저 확인은 6단계).
- 최애 운명 상세 해금은 메모리 상태라 새로고침 뒤 다시 잠긴다(per_use 상품이라 재결제 요구 가능). 서버 영수증으로 복원할지는 사용자 결정.
- `scripts/verify-paid-gate-ui-regression.mjs:336` 주석 "destiny-bias 2026-08-21 전면 무료" 는 사실과 다르다(그대로 둠).
- `/flower` noindex(`app/flower/page.tsx:11-16`)는 로그인과 무관: AdSense "가치 낮은 콘텐츠" 거절 뒤 얇은 본문(449자, 2026-08-17 측정) 때문. noindexPathPrefixes 로 옮기면 ShareWidget 이 숨는다는 주석도 있다. 그대로 둔다.
- i18n `fortune.destinyFlower.ui.status.atelierLocked`·`status.loginRequired`(`i18n/authored/destinyFlower-03.json`)는 이제 미사용. 새 키 `viral.*`·`status.rateLimited` 는 번역 없음(한국어 폴백).
- 레거시 공유 줄에는 trackShare 분석 이벤트가 없다.
- 꽃 2b: 새 i18n 키 `atelierLock.*`(잠금 카드 문구)는 번역 없음(한국어 폴백). 앱(Play) 안에서는 `play-display-price.js` 가 타일 배지 글자를 Play 가격으로 덮어 "결과 무료" 문구가 사라진다(표시만).
- 꽃 2b: 해금 뒤에도 홈 타일 배지는 "결과 무료 · 상세 5,000원" 그대로다(잠금 시각 처리는 이제 앵커에만 걸리고, 앵커는 그림 영역이 없어 건너뜀). "해금됨" 표시가 필요하면 별도 작업.
- 꽃 2b: 홈 가이드 카드(`scripts/design/build-home-funnel.mjs` 생성, `/flower/` 링크)는 아직 "해금 5,000원". `/flower` 랜딩·마케팅 사전 문구(FAQ "해금하면 무엇이 열리나요?")도 무료 카드 언급이 없다 — 번역이 필요해 미룸.
- 꽃 2b: 기기 해금 지도는 해금인데 서버가 비해금이라고 하면(오래된 캐시) 잠금 카드가 보이고 버튼은 재조회만 한다. 서버가 정본이라 결제는 안 일어난다.
- 최애 3b: 상세 해금을 새로고침 뒤에도 유지하려면 per-use 영수증을 서버에 남겨 (최애×생일) 키로 복원해야 한다 — 결제 모델 결정이라 사용자 판단.
- 4단계: `lib/saju/saju-service-catalog.mjs:34` 의 무료 항목은 "무료 만세력"(href `/?action=cdOneStepFreeSajuEntry`, registry 'saju'·온보딩·ActivationGuide 에 묶임). "무료 사주 풀이"라는 항목은 없다. 권고: 그 항목은 그대로 두고, `/saju/free` 는 카탈로그에 별도 항목으로 더하거나 SEO 쪽 링크로만 잇는다 — 사용자 결정.
- 4단계: `PremiumBlurGate` 에 하드코딩 hex·👑/🔐 기본 아이콘·reduced-motion 을 무시하는 무한 애니메이션이 남아 있다(이번엔 선택 props 만 추가).
- 4단계: 성별은 입력만 받고 계산에 쓰지 않는다(대운 방향이 필요해질 때 사용). 페이지는 한국어 전용(번역 없음). ImmersiveRelatedLinks·ROUTE_DATES 등 다른 연결 목록에는 등록하지 않았다. 390px 브라우저 확인은 6단계.
- 6단계: `/saju/free` 링크 복사는 UTM 없이 맨 주소(`/saju/free/`)를 복사한다(X·스레드는 UTM 있음, 최애는 `buildInviteUrl` 이라 UTM 있음). 링크 유입 측정이 필요하면 `withShareUtm(url,'link')` 적용 — 결정 필요.
- 6단계: `app/saju/animal-destiny/hooks/useAnimalCardExport.ts:114` 도 `fetch(dataUrl)` 를 쓴다 — 같은 CSP 로 운영에서 이미지 저장이 막힐 가능성(기존 코드, 이번 범위 밖).
- 6단계: 다른 `.cd-guide` 페이지의 모듈 CSS 도 `p`·`h3` 글자색·크기가 같은 방식으로 덮일 수 있다(전역 `styles/globals.css` `.cd-guide p/h3`).
- 6단계: 꽃 "나의 개화 기록" 안내 문구가 비로그인·사주만 열린 상태에서도 "모든 꽃이 개화되었습니다"라고 쓴다(기존 문구).
- 6단계: localhost 에서 assets.code-destiny.com 폰트가 CORS 로 안 받아진다(dev 전용 소음).


## 2026-11-09 후속 구현

### 설계와 보존 경계
- 기존 워크트리 clean HEAD aae7ced6c3b3b70580e3e15d4c7802e7d634d57a에서 재개. 루트 체크아웃은 다른 세션 미커밋 변경이 있어 읽기만 했다.
- 최애 상세는 같은 최애 kind/id × 정규화한 생일 × 달력 종류를 SHA-256으로 식별한다. 원시 생일은 저장 원문·공유 링크에 넣지 않는다. 무드·테마·엔진 버전으로 재결제하지 않는다.
- /api/destiny-bias/details/lookup은 인증한 계정의 저장 원문만 읽는다. 조회 실패·잘못된 원문·환불은 결제 제안으로 폴백하지 않는다.
- /api/destiny-bias/details는 기존 verifyPerUsePayment와 ServiceExecutionTransaction/upsertPaidResultArchive를 재사용한다. 가격·결제 레지스트리·DB 스키마는 그대로다. 새 원문은 preserveOriginal=true, retentionUntil=null로 보존한다. 영수증 식별자(서버 증빙의 transactionId 우선)당 기록 하나라 별칭/생일/최애를 바꿔 재사용할 수 없다.
- 이용권의 빠른 통과는 결제 성공 뒤에만 기존 소비기로 증빙을 남긴다. 구매 조회 단계에서는 requireExisting=true이며 차감하지 않는다. 월정석·단건 결제는 기존 증빙만 읽는다. 기기 해금 지도나 localStorage 값을 구매 증빙으로 삼지 않는다.
- 클라이언트는 저장 원문 조회 → 이전 결제의 저장 실패 복구 → 공용 게이트 순서다. 동일 입력의 requestId를 고정해 저장 실패 뒤 재시도 시 새 결제를 만들지 않는다. 결제 복귀는 grant의 requestId/profileId를 서버에 전달하며, 저장한 원문을 상세 패널에서 렌더한다. 계정 전환/로그아웃 시 메모리 원문을 지우고 늦게 도착한 다른 계정 응답을 버린다.
- 보관함 /records/에 destiny-bias-analyze 유료 원문만 노출한다. 무료 카드의 서버 저장 금지는 유지한다. 기존 StoredReading의 Chemi 리포트 표시기를 재사용한다.
- 과거 임의 requestId로 결제하고 원문을 남기지 않았던 기록은 최애/생일 연결 근거가 없어 자동 소급 복원하지 않는다. 운영 데이터 수정·실결제·실 LLM 호출 없음.

### 원목록 처리
- 최애 공유 바의 stage 토큰 적용, 잘못된 전면 무료 주석 수정.
- 꽃 새 viral/status.rateLimited/atelierLock 키를 12개 언어로 저작(기존 저작 파일 보존, freeViralFollowup-01.json 신규). 미사용 과거 키는 삭제하지 않아 구 셸 캐시와의 호환을 보존한다.
- 레거시 꽃 공유 버튼에 기존 cdTrack의 destiny_flower_share_click(feature/channel) 계측 추가. 개인정보는 계측하지 않는다.
- Play의 freeResultDetails 표시 종류로 가격 대기/확인/재조회에도 결과 무료 표시 유지. 서버가 상세 해금을 확인하면 홈 꽃 배지에 상세 해금됨 표시.
- 홈 가이드 꽃/최애 가격 표시는 기존 레지스트리 금액을 사용해 결과 무료/상세 유료를 구분한다. 꽃 랜딩(ko/en/ja/zh-CN/zh-TW)과 마케팅 안내/FAQ도 같은 경계로 정리한다. /flower noindex 유지.
- /saju/ 서비스 카탈로그의 기존 무료 만세력 항목은 유지하며 /saju/free/로 별도 내부 안내 링크만 추가한다. 별도 카탈로그 상품·ROUTE_DATES·연관 링크 전수 등록은 하지 않는다.
- PremiumBlurGate의 고정 색을 기존 cd-sukuyo 토큰으로 치환, 기본 잠금 SVG, 상품명 배지, reduced-motion 반영. 원래 블러 미리보기 투명도 유지.
- 공유 이미지의 base64→Blob 변환을 lib/share-image.ts로 공유하여 동물점의 CSP fetch(data:) 실패도 수정. 공유 시트 취소는 실패 토스트로 처리하지 않는다.
- /saju/free 링크 복사에 withShareUtm(...,'link') 적용. 올해 천간 안내에서 1월생과 조회일 입춘 전을 혼동하던 설명 수정.
- 다른 .cd-guide 페이지의 추정 결함은 재현된 수정 범위가 아니므로 전역 CSS를 바꾸지 않았다. 성별 입력 유지, /saju/free 전체 다국어화·실기기·localhost 외부 폰트 CORS는 추가 확장/환경 확인으로 남긴다.

### 검증 진행
- node --test __tests__/ui/destiny-bias-details-recovery.test.mjs __tests__/ui/destiny-bias-paid-details.static.test.mjs: 10/10 통과. 원문 불변, 계정 분리, 환불, 조회 장애, 미결제, 영수증 별칭 재사용 차단을 포함한다.
- node --test __tests__/ui/share-service.test.mjs __tests__/ui/free-saju-landing.test.mjs: 12/12 통과.
- npx tsc --noEmit --pretty false: 최초 구현 시 EXIT=0. 최종 트리는 check:fast로 검사 중.
- impeccable detect --json: 변경 UI 세 파일 [] EXIT=0. 독립 Assessment A/B가 기존 방향·토큰 대비를 검토했다. 불투명 오버레이 후보를 토큰 기반 투명 그라디언트로 보완했다.
- 모의 dev 127.0.0.1:26144, Ego task space 62에서 무료 만세력 제출→링크 복사→키워드 sessionStorage=1 확인. viewport 390, scrollWidth 375, CTA267×48, 공유138×44. 최애 최종 공유 버튼은 bg rgb(10,6,22)/ink rgb(247,241,255), 대비18.07:1, 높이44px, 가로넘침390/390. 독립 A/B가 모바일·데스크톱과 무료 블러 CTA의 잘림 없음/가독성을 확인했다. 무료 공유 버튼의 최종 캡처는 다른 영역을 담아 이미지 판정에서 제외하고 실측/소스/동작으로만 검증했다. Ego space62와 모의 dev는 종료했다.
- npm run check:fast -- --plan: critical. NODE_OPTIONS=--experimental-vm-modules npm run check:fast 실행. 결제 가드77/77, lint/typecheck/sitemap1061 정합 통과. Node4693개 중4680통과/13실패였으며, 아래 원인을 고치고 해당39검사를 재실행해 전부 통과했다. 통과한 결제77개를 반복하지 않고 같은 공식 계획의 test:node 다음 단계부터 이어 실행한다(임시 continue-check.mjs, mock-network-guard/LLM_DRY_RUN 유지). 최종 변경의 lint/typecheck/sitemap을 이 재개 실행에서 다시 통과했다. 전체 Node 재실행은 하지 않았다.


### 회귀 확인과 수정 근거
- 보관함 공용 per-use 목록에서 destiny-bias-analyze 전체를 허용한 첫 시도는 과거 무료 기록을 노출했다. 해당 공용 제외 규칙 변경을 되돌리고, 서버 결제 증빙으로만 쓰는 biasPaidDetailsVersion=1 마커를 조건으로 한 전용 destiny-bias-details 소스를 만들었다. 무료 기록·다른 계정 제외/환불/원문을 포함한 worker record-library29/29 통과.
- 전용 보관함의 표시 레지스트리 등록 누락은 records-reading-content 검사로 발견해 등록했다. 기존 무료 카드 저장소/일반 상품 목록은 그대로다.
- 홈 가격 문자열(결과 무료/상세 유료)의 신규 패턴에 생성기 번역 속성이 없어 11개 언어에서 한국어가 남았다. 기존 가격 번역 처리부에 이 패턴을 추가하고 레지스트리 금액을 템플릿 변수로 전달했다. home-overseas-runtime11/11 통과.
- 베트남어 잠금 안내는 꽃 결과 카드를 무료로 설명했으나, 전체 Tứ trụ 무료를 약속하는 것으로 문구 가드가 감지했다. 꽃 카드와 공유의 무료 범위만 명시하도록 표현을 고쳤다. 가드는 변경하지 않았다. records-reading-content + saju-bundle-copy28/28 통과.
- 원문/결제복귀/계정전환 React 동작 검사와 서버 보존 검사11/11, 이미지 CSP 변환/생일 해시만 전송/Play 가격14개를 포함한 공유 경계16/16, 꽃 배지 로케일·서버 해금 상태1/1 통과.
- 과거 임의 requestId로 결제했지만 원문/입력 연결이 전혀 남지 않은 결과의 소급 복원, 실기기 Play·Safari·실결제·운영 DB·실제 스레드 게시·프로덕션 승격은 미검증/미실행이다. 코드 구현을 운영 수선 완료로 해석하지 않는다.

- 후속 계측 검사에서 React 훅 전용 share_click 이름과 레거시 발화가 충돌했다. React 이벤트 소유권은 유지하고 레거시 꽃은 destiny_flower_share_click으로 구분했다. 분석 가드는 수정하지 않았다.

### 후속 변경 파일 (73개, 생성 미러·사이트맵 포함)
- `__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs`
- `__tests__/ui/destiny-bias-client-recovery.behavior.test.mjs`
- `__tests__/ui/destiny-bias-details-recovery.test.mjs`
- `__tests__/ui/destiny-bias-paid-details.static.test.mjs`
- `__tests__/ui/destiny-flower-free-badge.behavior.test.mjs`
- `__tests__/ui/play-display-price.test.mjs`
- `__tests__/ui/viral-share-boundaries.test.mjs`
- `__tests__/worker/record-library.test.js`
- `app/components/PremiumBlurGate.tsx`
- `app/components/ViralShareBar.tsx`
- `app/flower/page.tsx`
- `app/records/view/StoredReading.tsx`
- `app/saju/SajuServiceCatalog.jsx`
- `app/saju/animal-destiny/hooks/useAnimalCardExport.ts`
- `app/saju/destiny-bias/DestinyBiasClient.tsx`
- `app/saju/destiny-bias/components/chemi/ChemiHook.tsx`
- `app/saju/destiny-bias/components/chemi/ChemiShareBar.tsx`
- `app/saju/destiny-bias/components/chemi/MyInfoPanel.tsx`
- `app/saju/destiny-bias/destiny-bias.module.css`
- `app/saju/destiny-bias/lib/paidDetails.ts`
- `app/saju/destiny-bias/page.tsx`
- `app/saju/free/page.tsx`
- `config/sitemap-lastmod.json`
- `docs/handoff/free-viral-funnel-2026-11-08.md`
- `i18n/authored/freeViralFollowup-01.json`
- `index.html`
- `js/core/index-inline-runtime.js`
- `js/core/play-display-price.js`
- `lib/idol-chemi/paid-details-key.d.mts`
- `lib/idol-chemi/paid-details-key.mjs`
- `lib/marketing/feature-marketing-copy.generated.json`
- `lib/records/reading-registry.js`
- `lib/records/service-registry.js`
- `lib/share-image.ts`
- `public/en/index.html`
- `public/ggulggul/index.html`
- `public/i18n/de.json`
- `public/i18n/en.json`
- `public/i18n/es.json`
- `public/i18n/fr.json`
- `public/i18n/hi.json`
- `public/i18n/ja.json`
- `public/i18n/ko.json`
- `public/i18n/ms.json`
- `public/i18n/nl.json`
- `public/i18n/vi.json`
- `public/i18n/zh-cn.json`
- `public/i18n/zh-tw.json`
- `public/index.html`
- `public/ja/index.html`
- `public/js/core/index-inline-runtime.js`
- `public/js/core/play-display-price.js`
- `public/sitemap-en.xml`
- `public/sitemap-ja.xml`
- `public/sitemap-ko.xml`
- `public/sitemap-zh-tw.xml`
- `public/sitemap-zh.xml`
- `public/sitemap.xml`
- `public/static/index.html`
- `public/zh-tw/index.html`
- `public/zh/index.html`
- `scripts/design/build-home-funnel.mjs`
- `sitemap-en.xml`
- `sitemap-ja.xml`
- `sitemap-ko.xml`
- `sitemap-zh-tw.xml`
- `sitemap-zh.xml`
- `sitemap.xml`
- `worker/lib/destiny-bias-paid-details.js`
- `worker/lib/record-library.js`
- `worker/routes/destiny-bias-details.js`
- `worker/routes/destiny-bias.js`
- `scripts/verify-paid-gate-ui-regression.mjs`
