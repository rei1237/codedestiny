---
status: active
updated: 2026-10-23
next: "35 — 관리자·공유 셸의 alert"
---

# 꿀꿀운세 UX 진단·개선 — 후속 과제

## 왜

- 원 작업 요청(2026-10-22): "내 서비스의 사용자 경험상 미흡한 부분 특히 뒤로가기 부분이라든지 그외에도 서비스의 대표 기능들에 대한 강약 조절에 대해서 분석하고 그 외에도 사용자 경험에서 정석적인 부분들에 대해서 적용이 안되어있는 부분을 찾아서 확실하게 개선해줄 계획을 세워 먼저 진단부터 진행하고 그 이후에 하나씩 수정해나간다."
- 이어진 요청
  - "사주 분석 화면에서도 결제 이후에 바로 운세가 열리도록" — 라이트 사주 풀이(10,000원 `section_summary`)
  - FAQ에 "다른 AI 서비스보다 낫다"는 차별점 문항, 쿠팡 광고 수익화 최적화
- 이 문서의 요청(2026-10-23): "후속과제도 모두 진행하고 컨텍스트가 길면 클리어 후 인수인계로 진행할 수 있도록해줘"
- 사용자 결정: 헤더 "홈"은 `/ggulggul/`(하단 탭과 같다), 로고는 `/` 브랜드 홈을 유지한다.
- 원 계획: `C:\Users\user\.claude\plans\wise-pondering-shore.md`(1~7단계). 줄 번호는 작업 당시 기준이니 고치기 전에 `git grep`으로 다시 찾는다.

## 지금 상태 (다시 하지 않는다)

- 1~7단계 전부 로컬 main에 머지됨(push 안 함). 끝 커밋: `f73dc9337`, `5168c0180`, `a99804b6a`(토스트 이중 낭독·PWA 배너 페르소나), `76e2b6722`(사이트맵 원장).
- 후속 커밋: 38·39·40·6·41·42는 로컬 main에 머지됨(`e80edaf15`까지). 워크트리에서 머지 대기: 아래 "끝:" 표시 항목. **머지 전에 `npx tsc --noEmit -p .`를 돌린다**(TS 파일이 여럿 바뀜).
- 라이트 사주 풀이 결제 직후 열기, 라이트 표기, FAQ 차별점 4문항(`lib/brand/differentiation-faqs.mjs`), 쿠팡 배치 최적화는 끝났다.

## 작업 규칙

- `AGENTS.md`·`CLAUDE.md`를 먼저 읽는다.
- 작업 위치: 워크트리 `D:\Development\codedestiny-worktrees\saju-light-resume-20261022-233118`, 브랜치 `wt/saju-light-resume-20261022-233118`. 루트 체크아웃(`D:\Development\code-destiny`)에는 다른 세션의 미커밋 변경이 있다.
  - 루트에서 `reset --hard`·`stash`·`checkout --` 금지. 남의 파일(`.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md`)은 건드리지 않는다.
- 머지 흐름(PR 없음)
  1. 워크트리에서 `git rebase main`
  2. `env -u CACHE_BUST_KEY -u BUILD_CACHE_KEY npm run -s sitemap:generate` → 원장이 바뀌면 커밋
  3. `git -C /d/Development/code-destiny merge --ff-only wt/saju-light-resume-20261022-233118`
  4. 루트에서 `npm run -s verify:public-mirror-fresh`(추적 파일이 깨끗해야 한다)
- 셸 파일(`index.html`, `js/*`, `styles/*`)을 고치면 `env -u CACHE_BUST_KEY -u BUILD_CACHE_KEY npm run -s sync:public`을 **두 번** 돌린다(1회로는 수렴하지 않는다 — 7번 과제).
- 수정이 끝나면 자동 커밋한다. 커밋 끝줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. push·배포는 요청 때만, push는 메모리 `code-destiny-shared-main-push.md` 절차(origin/main 워크트리에 내 커밋만 cherry-pick).
- 과금 LLM 검증 금지(mock), `i18n:translate-pending` 금지. 실결제·운영 DB 쓰기·환불·정산 금지, 운영 DB 읽기는 매번 승인.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 산출물, `worker/wrangler.toml` 구조는 고치지 않는다. 비밀값·고객 개인정보를 출력·저장·커밋하지 않는다.
- 포트로 프로세스를 죽이지 않는다(내 것으로 확인된 경우만).
- UI·라우트 변경 때 SEO 동반 점검(canonical·sitemap·H1·OG 영향)을 커밋 메시지나 이 문서에 남긴다.
- `__tests__/ui`는 jest가 아니라 `node --test`로 돌린다.
- 과제 밖에서 찾은 기존 결함은 고치지 말고 이 문서 끝에 새 번호로 적는다.
- 보고는 한국어로, 진행 상황은 짧게 자주.

## 남은 작업 (이 순서로 진행)

줄 번호는 2026-10-23 워크트리 기준 조사값이다. 고치기 전에 `git grep`으로 다시 찾는다.

### A. 사용자 화면 결함

- [x] **8. 결제 게이트 eyebrow에 내부 상태값이 그대로 보인다** — 끝: `4581f2a7f`. 상태 코드를 사용자 문구로 바꾸고, 모르는 값은 기본 문구로 둔다.
  - 위치: `index.html` 약 L24986 `eyebrowEl.textContent = status`. CSS가 대문자 변환(약 L24782), 기본값은 '달빛 결제 확인'(약 L24807).
  - 할 일: 상태 코드를 사용자 문구로 매핑하고, 모르는 값은 기본 문구로 둔다. 셸 수정이므로 `sync:public` 2회.
- [x] **9. 인생의 책 오류가 원문 메시지를 흘린다** — 끝: `4fbf7b9c9`. Error 객체를 넘겨 공용 변환을 탄다.
  - 위치: `app/life-book-ai/LifeBookAiClient.tsx` 약 L1571·L1704·L1742가 문자열을 넘긴다.
  - 할 일: `LifeBookAiResultClient.tsx:1478`처럼 Error 객체를 넘겨 공용 변환을 타게 한다.
- [x] **10. `app/_lib/billing-client.ts:2600,2603`이 오류 원문을 보여 준다** — 끝: `70ccb671f`. 런타임 예외 원문을 감추고 동결 매니페스트를 갱신했다(`verify:payment-freeze` 통과).
  - 이 파일은 결제 동결 대상이다(`config/payment-freeze.json`). 고치면 `npm run verify:payment-freeze -- --update`가 필요하다.
  - 이미 `CheckoutClient.tsx:141`에서 완화돼 있다. 동결 해제 비용이 크면 "완화됨, 동결 유지"로 닫는다.
- [x] **11. 게이트가 `requestId` 없이 조용히 끝난다** — 끝: `4581f2a7f`에 함께. 조용한 return은 이미 닫힌 게이트에서 나는 의도된 동작이라 안내는 띄우지 않고, 진단용 performance mark만 남겼다.
  - 위치: `index.html` 약 L24945 `_cdUpdatePaidFeatureGate`, 약 L24546 `_cdReleasePaidFeatureGate`가 조용히 return한다.
  - 할 일: 진단 로그를 남기고, 사용자 동작으로 연 게이트라면 재시도 안내를 보인다.
- [x] **37. 질문형 단계 입력에 `aria-invalid`가 없다** — 끝: `46d9ce2ec`.
  - 위치: `app/yeongnyangi/_components/Consultation.tsx` 질문 모드 스테퍼(약 L293-327), 누락 계산 `missing`(약 L146-157). 기본 폼은 `fieldProps`(약 L163)가 이미 있다.
  - 할 일: 같은 `fieldProps` 패턴으로 `aria-invalid`·`aria-describedby`를 단다.
- [x] **26. 추천 둘러보기 설명이 "준비하고 있어요"라고 말한다** — 끝: `9d20ba0ec`.
  - 위치: `app/recommendations/page.tsx:2`, `app/recommendations/[category]/page.tsx:3`, `js/recommendations-copy.mjs`.
  - 할 일: 이미 열린 화면이므로 실제 설명으로 바꾼다.
- [x] **34. 빈 보관함 CTA 라벨이 행동을 말하지 않는다** — 끝: `3f597ae72`. 12개 언어 `libraryStart` 키.
  - 위치: `app/yeongnyangi/_components/Library.tsx:79-81`, 지금 '상담 구성과 결제 조건 확인하기'.
  - 할 일: 행동 라벨로 바꾸고 12개 언어 문구를 직접 쓴다.
- [x] **32. 신년운세 분야 수 표기가 실제와 어긋난다** (재정의) — 끝: `2b358e79f`. `READING_STEPS`로 단계 목록·개수를 한곳에서 만들고, 서버 `NEW_YEAR_AI_SECTIONS`와 순서·수가 같은지 테스트한다.
  - `|| 6` 폴백은 맞다(서버 `NEW_YEAR_AI_SECTIONS`, `worker/routes/new-year-ai.js:77`).
  - 진짜 불일치: 클라이언트 안내 "{DOMAIN_CARDS.length}개 분야"는 5다. 두 값을 공유 상수 하나에서 만든다.
- [x] **15. `.cdh-flow` 여백이 어긋난다** — 끝: `d65cde7b6`. `#cdHomeFunnel .cdh-flow>…{margin:0}`로 간격을 flow gap 하나가 맡는다.
  - 위치: `styles/home-funnel.css` `.cdh-flow` 약 L80, `.cdh-honey` 약 L1332·L1356.
  - 홈 퍼널 정본은 `templates/home-funnel.html`·`styles/home-funnel.css`다. 생성 스크립트로 `index.html`에 반영한다.
- [x] **16. 1536px 이미지를 640px 슬롯에 쓴다** — 끝: `f4afd98fe`. 320·640·960 srcset. 디스커버리는 `/`에만 있다.
  - 위치: `lib/marketing/consultation-discovery.mjs:23`.
  - 할 일: 이미 있는 `master-love-codex-640.webp`를 쓰거나 srcset을 준다. 새 이미지는 만들지 않는다.
- [x] **18. `ExpertStickyCta`의 `watchId`가 7곳에 없다** — 끝: `140d64baf`. karma·vedic에 히어로 CTA id와 `watchId`를 달았다. 나머지 5곳(astrology·island·nakshatra·ziwei·new-year)은 같은 행동의 히어로 CTA가 없어 일부러 달지 않았다.
  - astrology-ai 약 L2198, island-consult 약 L1083, karma-destiny-ai 약 L2861, nakshatra/ai 약 L506, vedic-ai 약 L3529, ziwei-ai 약 L1299.
  - new-year-ai-consultation 약 L2279에는 감시할 히어로 요소가 없다. id를 새로 달지 판단한다.
  - prop 정의: `ExpertConsultationFrame.tsx:35,72-95`.
- [x] **20. 다국어 신뢰 FAQ에 차별점 문항이 없다** — 끝: `a8437feec`. ja·en·zh 각 4문항을 직접 번역했다. 다국어 FAQ는 Next 페이지가 이 데이터를 읽으므로 정적 재생성은 필요 없다.
  - 위치: `lib/i18n/public-trust-copy.mjs` ja·en·zh faq 블록(약 L54·L114·L175).
  - 원문: `lib/brand/differentiation-faqs.mjs`. 사실만 직접 번역하고, 유료 번역 스크립트는 쓰지 않는다.
- [x] **25. 레거시 추천 화면의 `copy.locale`이 undefined다** — `js/recommendations-legacy.mjs` 약 L40·L65. — 끝: `d40edb91b`. `shelf`(언어별 문구)와 `lang`을 쓴다.
- [x] **24. 레거시 추천 화면이 60초마다 다시 불러온다** — 같은 파일 약 L88. 필요 없는 폴링이면 멈춘다. — 끝: `d40edb91b`. 폴링은 관리자 끄기 스위치라 유지한다. 응답이 같으면 다시 그리지 않고, 숨겨진 탭에서는 건너뛴다. 테스트 추가.
- [x] **28. 숙요·휴먼디자인 차트 화면에 추천이 안 뜬다** — 끝: `f0601b77b`. 숙요 궁합은 소통 장 행동 목록·금기 장 예방 목록 줄만, 무료 휴먼디자인 차트는 내 권위와 정의된 센터의 실천 문장만 읽는다. 테스트 추가.
  - 원인: `SukuyoCompatibilityAiClient.tsx:1185`, `HumanDesignClient.tsx:719`가 advice 태그를 넘기지 않는다.
- [x] **29. 추천 태그 추출이 한국어 정규식뿐이다** — `js/recommendations-context.mjs`. — 끝: 결정으로 닫음(코드 변경 없음). 운영 카탈로그는 쿠팡(국내 배송·한국어 제목) 32개뿐이고 알리 6개는 전부 draft·한국어 제목이다. 외국어 패턴을 넣으면 해외 이용자에게 국내 전용 상품이 뜬다. 검수된 비한국어 카탈로그가 생기면 다시 연다.
- [x] **30. `neo` 브랜드가 꿀꿀 팔레트로 매핑된다** — `js/affiliate-presentation.mjs:7`. — 끝: 결정으로 닫음(코드 변경 없음). 네오는 꿀꿀 운세의 상담자이고, 추천 화면은 브랜드 2개(영냥이·꿀꿀)만 둔다(`docs/design/affiliate-surfaces.md`, `affiliate-tokens.css` 주석, `affiliate-presentation.test.mjs`가 neo→ggulggul을 고정).

### B. SEO

- [x] **17. 인생의 책 페이지에 OG·JSON-LD가 없다** — 끝: `b2010ce21`. openGraph·twitter, Service(서버 가격표 Offer 30,000원)·Breadcrumb JSON-LD. 화면에 FAQ가 없어 FAQPage는 일부러 뺐다. 개발 서버 HTML로 확인.
  - 위치: `app/life-book-ai/page.tsx:6`.
  - 할 일: `app/love-secret-ai/page.tsx`를 본뜬다. openGraph·twitter, `lib/structured-data`의 `buildServiceJsonLd`·`buildFaqPageJsonLd`·`buildBreadcrumbJsonLd`를 쓴다.
  - 엔티티: `lib/seo/entity-registry.mjs:433-441`.
- [x] **19. 대표 상세 H1 위치의 이유를 기록한다** (코드 변경 없음) — 끝: 세 대표 상세 page.tsx의 H1 바로 위에 이유 주석을 달았다(이 커밋).
  - 클라이언트가 `ssr:false`이고 `verify-seo-heading-integrity`가 H1 하나를 요구한다. 그래서 문서 H1이 하단 서버 영역에 있다. 이 이유를 해당 page 파일 주석이나 DESIGN 문서에 남긴다.
- [x] **21. 문서 스냅숏에 옛 이름 "사랑의 비밀"이 남아 있다** — 끝: 결정으로 닫음(코드 변경 없음). 운영 소스(app·lib·js·templates·worker·i18n·config·index.html)에는 옛 이름이 0건이다. 남은 4곳(PAGE_INVENTORY 2026-09-08, 같은 날 handoff, adsense 기준선, seo-url-inventory 2026-10-18)은 날짜가 박힌 스냅숏이라 당시 값을 고치지 않는다. PAGE_INVENTORY는 다음 dist 전수 재생성 때 바뀐다.
  - `docs/seo/PAGE_INVENTORY.md`는 `scripts/seo-build-inventory.mjs`로 다시 만든다.
  - adsense 기준선, seo-url-inventory, `expert-consulting-premium-ux-2026-09-08.md`도 확인한다.

### C. 검증 도구·코드 정리

- [x] **1. `verify-home-funnel`의 낡은 단언** — 끝: `355d56fa9` 미니게임 링크 단언을 가벼운 운세 접힘(#cdhLightFortunes)으로, 스토리 카드 나란히/쌓임을 640px 경계로, filled 판정을 맨 위 그라디언트 층만으로, 카드 2:3 비율 단언을 첫 줄 높이 일치로 바꿨다. 8개 폭 모두 exit 0
  - 위치: `scripts/design/verify-home-funnel.cjs` L27(미니게임), L119(`.cdh-links a`는 1개가 아니라 6개), L129(스토리 카드). "all fortunes outline"·"closing link row"도 낡았다. 타로 비율은 1.35다.
  - `.cdh-primary` strict-mode 오류(3개 일치)는 `.cdh-hero .cdh-primary`로 좁힌다.
- [x] **2. 정원 검증기에 쿠키 동의 사전 설정이 없다** — 끝: `1ba639c30` 쿠키 동의 배너가 하단 카드를 가려서 생긴 실패. 검사 시작 때 `cd_cookie_consent=essential` 쿠키를 넣는다. exit 0
  - `scripts/design/verify-consultations-garden.mjs:29`의 `newPage()` 앞에 넣는다: `await context.addCookies([{ name: 'cd_cookie_consent', value: 'essential', url: origin }]);`
- [x] **3. 프리미엄 진입 검증기의 `payment` 정규식이 너무 넓다** — 끝: `b7d4e46a9` 출생 프로필 지급 대기 조회(GET `/api/payments/birth-profile-pending`)는 읽기 전용이라 결제 요청 목록에서 뺐다. 12/12 PASS. 첫 실행 때 1280px에서 pageerror "Invalid or unexpected token"이 한 번 났지만 재현되지 않았다(개발 서버 일시 오류로 봄)
  - 이 정규식이 `GET /api/payments/birth-profile-pending`(`js/destiny-profile.js:4596`)까지 잡는다. 메서드·경로로 제외한다(약 L92).
- [x] **5. no-fallback 카운트 증가** — 끝: 결정으로 닫음 + A 기준선만 135→103으로 내려 개선을 고정했다. B의 +43은 이번 세션 이전(2026-07-27 기준선 `8e01ece64` 이후)부터 쌓였고, 세션 시작점 `2d75cef0a` 대비 증가는 0이다. 출처: `js/inline/saju-core-bootstrap.js` +20, `index.html` +19, `js/core/home-funnel.js` +2, `js/saju-engine.js` +1, `__tests__/ui/seo-locale-init.test.mjs` +1. 고치려면 번역이 필요해서 일괄 번역 때 처리한다. `--update`는 B까지 224로 올려 증가를 덮으므로 쓰지 않았다(기준선은 손으로 고침). 래칫은 의도적으로 경고 전용이다
  - `scripts/verify-i18n-no-fallback.mjs`(기준선 `i18n/no-fallback-baseline.json`): 지금 A 103(기준 135), B 224(기준 181).
  - 이번 세션 이전부터 있었고 경고만 난다. 원인을 확인한 뒤 기준선을 갱신할지 코드를 고칠지 정한다.
- [x] **7. `sync:public`이 두 번 돌아야 수렴한다** — 끝: `ec8de00c2`. 원인: 셸이 루트 로더(`mobile-interaction-patch.js`·`uiBindings.js`·런타임·모듈)보다 먼저 찍혀 옛 해시를 물었다. `restampRootLoaderFiles`가 맨 앞에서 루트 로더를 고정점까지(최대 8회) 다시 찍고, 그 뒤에 셸 키를 계산한다. `/HwatuFortune.js`처럼 앞에 `/`만 붙은 bare 자산을 내용 해시로 덮어 `build`↔`h` 핑퐁하던 것도 `classifyRef`에서 bare로 분류해 막았다. 확인: 로더 하나를 바꾼 뒤 한 번 돌리면 수렴, 3단 모듈 사슬도 한 번에 수렴
  - `mobile-interaction-patch.js` 핀이 backstack 로더 핀보다 한 단계 늦게 갱신된다. 핀 계산 순서를 고친다.
- [x] **12. 2단계에서 남은 i18n 낡은 키** (`public/i18n/*.json`) — 끝: `c123fbbbb`. 참조 없는 `premiumGates`(summary/daewun desc·sectionTitle·graphTitle)·`premiumShowcase`(eyebrow, summary/daewun desc·point1~4) 16개 키를 12개 언어에서 지웠다. `sajuReading.daeunTitle`·`graphTitle`을 12개 언어 사전과 `i18n/authored/sajuReading-1.json`에 손번역으로 채웠다. `i18n:check` 통과(B +43 경고는 5번 기록대로). H6도 이것으로 닫힌다
  - `result.premiumGates.summary.desc`·`daewun.desc`(5,000원, A4 30페이지), premiumShowcase desc, `sectionTitle` "기본 종합 사주 풀이", 쓰지 않는 eyebrow 키.
  - 참조가 없으므로 지우거나 손으로 고친다. `sajuReading.daeunTitle`은 12개 언어 모두에 없다.
- [x] **13. eslint 경고 375개** — 끝: `2dff830f8`. 세 파일 424개 → 0개. `no-var`는 eslint 자동 수정 뒤 남은 12곳(블록마다 재선언된 `raf`·`dx`·`dy`, 콜백이 자기 자신을 읽는 `timer`, 한 줄 다중 선언의 `started`)을 손으로 바꿨다. 쓰지 않는 `catch (_)`는 `catch {}`로(셸 `uiBindings.js`가 이미 쓰는 문법, esbuild는 target 없이 문법을 낮추지 않음). 죽은 `findActionElement`·`withMobileBuild`(+`detectMobileBuildVersion`)를 지웠다. 함수 선언이 const/let보다 먼저 불리는 TDZ는 스크래치 `tdz-scan.cjs`(eslint-scope)로 0건. 뒤로가기 시나리오 10/10, `verify-moon-pwa`·모바일 가드 통과(H17만 기존 실패)
  - 전부 `js/mobile-backstack-navigation.js`와 `js/mobile-interaction-patch.js`에 있고, 315개는 자동 수정이 된다. `pwa-lifecycle.js`에도 49개가 있다.
- [x] **36. `RecommendationSurface.jsx` eslint 경고** — 39:9 img, 93:169 deps. — 끝: `2b0ef2b3f`. `<img>`는 정적 export(`images.unoptimized`)라 사유를 달아 끔. 노출 effect는 `trackRecommendation`이 읽는 `service`만 의존(렌더마다 새 `context`를 넣으면 구독이 매번 새로 생겨 노출이 중복된다)
- [x] **14. 신년운세 VM 테스트가 구현 세부에 묶여 있다** — 끝: `aabc22897` 파싱 헬퍼·질문 판정을 `app/new-year-ai-consultation/_lib/answer-sections.ts`로 옮김. 테스트는 실제 모듈을 의존성째 싣고 `friendlyErrorMessage`도 실제 함수를 씀. 안 쓰이던 `__newYearAiParserTestUtils` 삭제. `handleSubmit` 추출은 컴포넌트 콜백이라 그대로 둠. 신년운세 테스트 43/43, tsc, `verify-new-year-ai-flow`, `verify-paid-gate-ui-regression` 통과
  - `__tests__/ui/new-year-question-answer.behavior.test.js`가 VM transpile과 `friendlyErrorMessage` 스텁(L65)에 기댄다. 순수 헬퍼를 모듈로 옮긴다.
- [x] **27. 레거시 건강 보고서 분기가 죽은 코드다** — 끝: `827396a69` 호출부가 `legacy-saju`·`legacy-tarot`·`pet-*`뿐임을 확인하고 분기 삭제. 테스트는 `legacy-tarot`로 마운트. 추천 테스트 19/19
  - 위치: `js/recommendations-legacy.mjs:53-56`. `__tests__/ui/recommendations.test.mjs`가 이 글자를 검사하므로 함께 고친다.
- [ ] **35. 관리자·공유 셸의 `alert`**
  - 위치: `index.html` 약 L30539·L30545, 공유 추천 흐름 약 L19257. `_cdShellNotice`를 쓴다.
- [ ] **39-후속(선택). `IntakeChat` 삭제 뒤 남은 미사용 코드**
  - `app/yeongnyangi/_lib/intake-chat.ts`의 `intakeSteps`·`intakeAnswer`·`intakeStepValid`·`intakePrompts`·`intakeCursor`·`IntakeStep`과 그 테스트.
  - 항상 null인 `IntakeComposerContext`.

### D. 사용자 조치가 필요한 것 (코드로 만들어 내지 않는다)

- [ ] **22. 쿠팡 상품 32개에 이미지·가격이 없다**
  - 실제 데이터나 관리자 입력이 필요하다. 지어내지 않는다.
  - 데이터: `docs/operations/affiliate-expanded-coupang-20261016.json`.
- [ ] **23. 쿠팡 subId·상품별 CTR이 없다**
  - 파트너스 subId 발급은 사용자 몫이다. 코드 쪽은 클릭 이벤트 집계까지만 할 수 있다.
  - URL 검증: `validateAffiliateUrl`(`js/recommendations-core.mjs:58`).

### 결정으로 닫은 것 (코드 변경 없음)

- **4. 개발 서버 하이드레이션 경고**: 재현되지 않았다. 다시 보이면 재현 경로와 함께 새 번호로 적는다.
- **31. 신년운세 대기 숫자 소요 시간**: 실제 평균 근거가 없어 쓰지 않기로 했다.
- **33. 내비 "내 상담" vs 화면 "영냥이 보관함"**: 내비 라벨(`chrome-copy.ts:2`)은 일부러 유지했다. 계약 테스트는 `library-retention-contract.test.mjs:13`이다.

### 끝난 것

- [x] **38. 헤더 "홈" 통일** — `app/components/GlobalHeader.tsx` `headerNavHref`(`0733811cc`). SEO: 로고는 `/` 유지라 canonical·sitemap 영향 없음.
- [x] **39. 죽은 `IntakeChat.tsx` 삭제** (`0733811cc`).
- [x] **40. 신년운세 라벨이 도움말보다 작다** — `.nyai-form label` 14px (`0733811cc`).
- [x] **6. 쿠키 동의 다시 열기 버튼이 sticky CTA를 가린다** (`32068d4ed`)
  - 떠 있던 "쿠키 설정" 알약 버튼을 없앴다. footer 정책 링크 줄(SiteFooterHub·LocaleFooterHub·`/` 홈)에 "쿠키 설정" 버튼(`data-cd-cookie-settings`)을 넣었다.
  - 다시 열면 배너로 포커스가 간다. 앱 빌드에는 버튼이 없다.
  - 확인(390px): `/`·`/en/`·`/tarot/`에서 버튼 → 배너 열림·포커스. 몰입형 라우트에는 footer가 없고, 정적 정책 페이지(`/faq/`, `/about/`)에는 원래 배너가 없다.
  - SEO 영향 없음.
- [x] **41. 영냥이 "상담과 결제 확인하기" 버튼이 흐려 보인다** (`19bf22269`)
  - 원인: 정의되지 않은 `--yn-bg` 때문에 금색 위 아이보리 글자가 됐다. 또 전역 `.page button:hover`가 남색을 칠했고, 터치 뒤에 그 색이 남았다.
  - 수정: 글자색을 `--yn-night`로 바꾸고, hover는 `--yn-gold-hover`로 유지한다.
- [x] **42. PWA 설치 배너가 늦게 뜬다** (`ce143af9e`)
  - `share.js`가 실리면 `cd:share-ready` 이벤트를 보내고, `pwa-lifecycle.js`가 설치·업데이트 안내를 다시 판단한다.
  - 확인: 스텁 없이 모바일에서 `share.js` 로드(약 44초) 직후 배너가 뜬다.

## 새로 찾은 후속 (검증 안 됨 — 고치기 전에 재현부터)

- **H1.** 궁합·테토겐·익스트림T 재개가 리다이렉트 복귀 때 안 열릴 수 있다.
- **H2.** `content/product-details/saju-summary`가 아직 "종합 사주 풀이"라고 쓴다.
- **H3.** 게이트 문구가 한국어뿐이다.
- **H4.** ko.json `paidDaeun`과 인라인 문구가 다르다.
- **H5.** `share.js:1518`에 죽은 매핑이 있다.
- **H6.** 쓰지 않는 i18n 키(12번과 함께 본다).
- **H7.** `section-gate-presentation` 픽스처가 옛 문구를 쓴다.
- **H8.** 게이트 가격 배지가 사이트 전체에서 숨겨져 있다.
- **H9.** 출생 범위 안내가 합니다체다(UI는 해요체).
- **H10.** 뒤로가기 빈틈
  - 단독 결제 선택에 back 연동이 없다.
  - 데스크톱 셸 오버레이에 back 처리가 없다.
  - `backHandler.ts`의 `isWebView`가 Safari에도 맞는다.
  - 숙요·자미 모달이 자체 history를 push한다.
  - history 인덱스 0에서 back 한 번이 헛돈다.
  - 결제 선택을 닫은 뒤 가드가 남는다.
  - React 결제 모달에 Esc가 없다.
  - 미리보기 `_close`가 overflow를 되돌린다.
- **H12.** MasterLoveCodex 생성 단계에서 back을 누르면 나간다(의도된 동작일 수 있다).
- **H13.** 토스트 이중 낭독 수정에 스크린리더 테스트가 없다.
- **H14.** `js/saju-engine.js:5632` "30,000원" 주석을 다시 확인한다.
- **H15.** 개발 서버 `/today/`가 500을 낸다. 워크트리에 `fortune/data/daily-*.json`이 없어서다(`npm run fortune:build-data`). 환경 문제로 보이지만 운영 영향은 확인하지 않았다.
- **H16.** 신년운세 대기 화면의 진행 단계와 `READING_STAGES` 라벨이 한 단계 어긋난다(단계 'opening'이 켜져 있을 때 라벨은 '올해의 총운을 읽는 중'). 32번 작업 중 발견, 고치지 않았다.
- **H17. `verify-mobile-runtime-readiness.mjs`의 "bottom navigation covers main slots"가 main에서도 실패한다**: 가드는 홈 탭 `href="/"`를 요구하지만 `046369a96`부터 `/ggulggul/`이다. 가드 갱신이 필요한지 앱 홈 정책과 함께 확인한다.
- **H18. ko.json `sajuReading`이 인라인 문구보다 전반적으로 낡았다**(H4 포함): "네오"↔"영냥이" 등. ko는 `cdTranslate`가 fallback(인라인)을 돌려줘서 런타임 영향은 없다. 사전을 정본으로 바꿀 때 한꺼번에 맞춘다. 비교: 스크래치 `sr-drift.cjs ko`.
- **H19. en.json `sajuReading`에 `yeonIntro`·`neoIntro`가 없다**: 인라인 en으로 떨어져 화면은 정상이다. 다른 언어도 같은지 함께 본다.
- **H20. `syncSajuReadingPrices`가 셸 캐시 키 계산 뒤에 돈다**: 가격이 바뀌는 빌드에서는 키가 한 번 늦을 수 있다. 평소에는 아무것도 바꾸지 않는다(7번 작업 중 발견, 고치지 않음).
- **H21. 레거시 어댑터의 비반려 관심사 선택도 닿지 않는다**: `js/recommendations-legacy.mjs` `choose`의 `explicitInterest` 갈래(식사 준비·수분·휴식 select)는 `rpt_healthReportCard`에서만 켜지는데 그 서비스로 마운트하는 곳이 없다. `SERVICE_MAP` 규칙은 서버 설정 검증에 쓰이니 남긴다. 범위 밖이라 기록만
