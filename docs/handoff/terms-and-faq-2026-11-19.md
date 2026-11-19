---
status: in-progress
updated: 2026-11-19
next: "U3 — FAQ·서비스 설명 개편(+ 해당 로케일 번역 동기화, SEO 점검)"
---

# 용어 통일(꿀단지 이용권·월정석) + 처음 온 사람용 FAQ·서비스 설명 다듬기

## 요청 원문 (2026-11-19)
> 월정석·달빛 이용권 용어 통일도 진행해주도록하고 처음 들어온 사람도 알기 쉽게 서비스 FAQ라든지 전반적인 설명을 쉽게 다듬어줘 중복되는 것을 최소화해주고

앞 세션 70a9bf9d(문장 전수 점검 Phase 2, 진행 문서 `docs/handoff/copy-audit-phase2-2026-11-18.md`)에서 이어진다.

## 첫 행동
1. `git branch --show-current`·`git status`·`git pull --ff-only`. main·clean 확인.
   - 다른 세션(iOS, paid-retry)이 같은 저장소를 쓴다. `reset --hard`·`stash`·`checkout --` 금지. `git add .` 금지(파일을 지정해 add). 미추적 `.claude/skills/fire-your-seo-agency/` 는 남의 것이니 add 하지 않는다.
2. 아래 단계에서 `next` 부터 진행한다. 단계가 끝나면 체크박스·결과 한 줄·frontmatter `next` 를 갱신해 같은 커밋에 넣는다.

## 승인 상태
- 사용자 결정 (2026-11-19 AskUserQuestion)
  - 이용권 상위 이름: **"꿀단지 이용권 (추천)"**. "달빛 이용권"·"달빛이용권"·"문라이트 패스"는 화면에서 걷어낸다. 등급 이름(작은·중간·큰·패밀리 꿀단지)은 그대로 둔다.
  - 월정석 번역: **"Moonstone · 月精石 (추천)"**. en "Moonlight Stone" → "Moonstone", ja·zh "月晶石" → "月精石". `i18n/glossary.json` 도 이 값으로 고친다.
- 이번 승인 범위: 코드·문구 수정, main push(스테이징까지). 🔴 **운영 승격은 요청받지 않았다.** push 를 승격 승인으로 보지 않는다.
- 과금 LLM 실호출 없음. 번역은 에이전트가 오프라인으로 직접 쓴다(유료 번역 API·배치 번역 스크립트 금지).

## 작업 규칙과 함정
- 결제 실행 파일(`worker/payments/*`, `worker/lib/portone.js`, `app/hooks/usePayment.ts`, `app/checkout/*Checkout*.tsx`, `apps/toss/service/{billing,Checkout,PreparedCheckout}.jsx`)과 `config/payment-freeze.json` 동결 영역 안의 문자열은 고치지 않고 "보고만" 목록에 적는다. `worker/lib/paid-feature-registry.js` 의 `reason` 도 고치지 않는다(결제창·환불 사유가 함께 쓴다).
- 그 밖에 결제와 가까운 UI 파일(`app/points/PointsClient.tsx`, `app/_lib/billing-client.ts` 등)의 문구는 고치기 전에 paid-gate-auditor 에이전트로 동결 영역·`verify-payment-copy-dictionary.mjs` 대상인지 확인한다. 동결 대상이면 보고만 한다.
- i18n 키 이름은 바꾸지 않는다. 키를 새로 만들지 않는다. 값만 고친다.
- shellRuntime 은 ko 원문을 키로 쓰는 역인덱스다. ko 리터럴을 바꾸면 11개 로케일이 한국어로 떨어질 수 있다. ko 를 바꾼 곳은 역인덱스 항목도 같이 맞춘다.
- `public/i18n/*.json` 은 병합기(`i18n-merge-authored --core --file`)로 한꺼번에 다시 만들지 않는다. 무관한 차이가 쌓여 있어 1,500줄 넘게 바뀐다(2026-11-19 실측). authored 원본을 고치고 공개 사전은 해당 값만 손으로 고친다.
- 저작 로케일은 en·ja·zh-CN·zh-TW. 나머지 7개(vi·hi·es·fr·de·nl·ms)는 그 키가 영어 복사본이면 새 en 으로, 실제 번역이 있으면 그 언어로 직접 고친다.
- `index.html` 을 고치면 `npm run sync:public`, 소설·사전·라우트 변경으로 사이트맵 서명이 바뀌면 `npm run sitemap:generate` 를 돌리고 산출물을 같은 커밋에 넣는다.
- 역사 기록(`docs/` 아래 과거 문서, CHANGELOG, 마이그레이션, 테스트 픽스처의 옛 데이터)은 고치지 않는다. 테스트·검증기가 옛 이름을 단언하면 새 이름으로 갱신한다.
- 결제 정책 문서(`docs/context/payment-gating.md`, `PAYMENT_POLICY.md`)의 용어도 새 이름으로 맞추되, 날짜가 박힌 과거 결정 원문은 그대로 둔다.
- 각 단계: `npm run check:fast` 1회 → 통과하면 커밋(트레일러 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). push 는 U4에서.

## 설계

### U1 한국어 용어
- "달빛 이용권", "달빛이용권", "문라이트 패스", "문라이트 패스(꿀단지 이용권)" → "꿀단지 이용권". 맨 "이용권" 단독 표기는 문장 안에서 앞서 이름이 나온 뒤라면 그대로 둔다.
- "달빛 범위", "달빛 한도"처럼 이름에서 파생된 표현도 꿀단지에 맞게 고친다(예: "이용권 한도").
- 화폐는 "월정석" 하나. "코인" 노출은 이미 금지 — 발견하면 보고만.
- 브랜드 가드 `__tests__/ui/site-name-signals.static.test.js` 등 이름을 단언하는 테스트를 같이 확인한다.

### U2 번역 용어
- 월정석: en "Moonlight Stone"→"Moonstone", ja·zh "月晶石"→"月精石". 나머지 7개 로케일은 새 en 의미에 맞춰 glossary 값을 정하고(예: de "Mondstein", fr "Pierre de lune", es "Piedra lunar", nl "Maansteen", ms "Batu Bulan", hi "मूनस्टोन", vi "Nguyệt Tinh Thạch" 유지) 화면 값을 맞춘다.
- 꿀단지 이용권: `i18n/authored/passNames-01.json` 의 기존 꿀단지 번역(en 등)을 기준 이름으로 삼는다. "Moonlight Pass", "月光通行证/通行證", "月光利用券", "月明かり利用券", "月光使用券" 같은 옛 상위 이름을 그 기준으로 바꾼다.
- `i18n/glossary.json` 에 "꿀단지 이용권" 항목을 추가하고 "월정석" 항목을 고친다(glossary 는 i18n 키가 아니다).

### U3 FAQ·서비스 설명 (처음 온 사람 기준)
대상 화면: `/faq`(`app/_content/faq-copy.js` + `lib/brand/consultation-methods.mjs` `CONSULTATION_METHOD_FAQS` + `lib/brand/differentiation-faqs.mjs`), `/about`(`app/_content/about-copy.js`, `about-intro-copy.js`), `app/_entry/ServiceGuide.tsx`, `app/components/HelpDesk.jsx`, `app/components/PolicyGuide.jsx`, 그리고 같은 설명을 반복하는 곳(먼저 grep 으로 찾는다).
- 순서: 이 서비스가 무엇인지 → 무료로 시작하는 법 → 유료 방식 세 가지(단건 결제·꿀단지 이용권·월정석)를 **한 번만** 정의 → 결과 다시 보기(/records/, /yeongnyangi/library/) → 취소·환불 → 문의.
- 중복 최소화: 같은 질문을 다른 말로 반복하는 문항은 합친다(예: "운세 결과는 확정된 미래인가요?"와 "운세 결과를 바꾸나요?"). 결제 수단 설명은 FAQ 한 곳에 두고 다른 화면은 짧게 줄여 그곳으로 링크한다. 정보는 빠뜨리지 않는다.
- 쉬운 말: 처음 온 사람이 모르는 말(이용권 한도, 라이트 운세, 대표 상담, 단건 등)은 처음 나올 때 한 줄로 풀어 쓴다. 한 문장에 정보 하나. 내부 용어·개발 용어(noindex 등)는 고객 말로 바꾼다.
- 사실은 코드에서 확인한다: 가격·한도·환불 기간은 `worker/lib/paid-feature-registry.js`, `lib/payment/pass-policy.js`, `docs/context/payment-gating.md` 를 근거로 쓴다. 확인 못 한 숫자는 넣지 않는다.
- 금지: "100% 적중", "반드시 이루어집니다", "운명이 바뀝니다", 보장성 비책·비법·비결, 불안을 부추기는 말.
- SEO 동반 점검(`docs/context/seo-and-adsense.md#변경-동반-seo-점검`): title/description/H1, FAQPage 구조화 데이터가 화면 문항과 일치하는지, canonical·hreflang·sitemap. 로케일별 FAQ(`app/[locale]/faq/page.js`)가 같은 데이터를 읽으면 번역 동기화도 같은 단계에서.
- 큰 화면 개편이 아니라 문안 개편이다. 레이아웃·컴포넌트 구조는 바꾸지 않는다. 문항 수를 줄여 테스트가 개수를 단언하면 갱신한다.

## 단계
- [x] U1 한국어 용어 통일(꿀단지 이용권). 바꾼 파일·건수, 보고만 목록(결제 동결)을 아래 "결과"에.
- [x] U1b 결제 동결 문구 라벨만 교체: `payment.directModal.passBadge`·`musicTrackSub` 의 "달빛 이용권" → "꿀단지 이용권". 렌더러 3종(`app/_lib/billing-client.ts`, `index.html` `_cdChooseServicePaymentMode`, `js/destiny-profile.js`)과 `public/i18n/ko.json` 을 한 커밋에, `verify-payment-freeze --update` 로 매니페스트 갱신. 결제 로직·정규식·금액·순서는 바꾸지 않는다. 다른 로케일 값은 U2. 2026-11-19 사용자 요청 "용어 통일" 범위로 진행(위험: 결제창 라벨만, 롤백은 커밋 revert 1회).
- [x] U2 번역 용어 통일(Moonstone·月精石·꿀단지 이용권 번역) + glossary.
- [ ] U3 FAQ·서비스 설명 개편(+ 해당 로케일 번역 동기화, SEO 점검).
- [ ] U4 마무리: 남은 옛 이름 grep(문서 역사 기록 제외) 0 확인, 금지 표현 grep, `npm run check:pre-push`, origin/main 머지(충돌 생성물은 theirs → `sync:public`·`sitemap:generate`), push, main CI 1회 확인, 이 문서 `status: done`, 최종 보고. 운영 승격은 하지 않는다.

## 결과
### U1 (2026-11-19, 커밋은 이 문서를 담은 커밋)
- 바꾼 소스: app 10파일(points 화면·service-pack-copy·page.js 등), index.html 25곳, js/core 2, lib 4(moonlight-guide `MOONLIGHT_PASS_NAME`=꿀단지 이용권, pass-benefits h2, pass-pricing 주석), worker/routes/fortune.js 오류 문구, vedic-astrology.html, authored ko 값 10파일, `public/i18n/ko.json` 24값, `public/i18n/ko/shellRuntime.json` 6값(역인덱스 — 셸 런타임 리터럴과 같은 문장으로 맞춤), `i18n/pending/shellRuntime.ko.json` 3값, 테스트 3·verify 주석 2, 정책 문서 4(payment-gating:9, design-canon:34-35, PAYMENT_AND_ACCESS, payment-policy-flow:85). 생성물은 `sync:public`(셸 미러 7·public js·marketing generated 3)·`sitemap:generate` 로 재생성.
- 파생 표현: "달빛 범위" → "꿀단지 한도", "달빛 범위를 골라요" → "꿀단지 크기를 골라요", "문라이트 패스가 닿으면" → "꿀단지 이용권이 있으면".
- 🔴 보고만(결제 동결, 화면에 "달빛 이용권"이 남는다): `payment.directModal.passBadge`(billing-client.ts:1175 · index.html `_cdChooseServicePaymentMode` · destiny-profile.js:12425 · ko.json 값), `payment.directModal.musicTrackSub`(billing-client.ts:1134 · ko.json 값). 세 렌더러 폴백과 ko.json 값이 같아야 하는 verify-payment-copy-dictionary·payment-choice-parity 가 묶여 있어 ko.json 값도 그대로 뒀다. 바꾸려면 payment-freeze 절차(`verify-payment-freeze --update`)로 세 렌더러+ko.json 을 한 커밋에.
- 보고만(로직·주석): billing-client.ts:2926·index.html 대기 종류 정규식 `달빛 이용권 결제|이용권 결제`(옛 문구 호환, 동결) 와 그 설명 주석(index.html, verify-paid-gate-ui-regression.mjs:406 — passBadge 가 아직 달빛 이용권이라 사실), billing-client.ts:1168 주석(동결 파일), worker/payments/passes.js:2 JSDoc(결제 실행 파일), public/_redirects:66 주석(라우팅 파일).
- 역사·스냅샷이라 둠: docs/ 의 감사·인벤토리·SEO 기록·adsense baseline·toss 인벤토리·inicis 신청 사실 문서, payment-gating:345·349 와 payment-policy-flow:123(날짜 결정), shellCopy-04 `_comment`, 미참조 잔재 `i18n/.rest.json`·`i18n/.w1-strings.json`.
- 다른 로케일 값(Moonlight Pass 등)은 U2.

### U1b (2026-11-19, 커밋은 이 문서를 담은 커밋)
- passBadge 폴백 4곳(billing-client.ts:1175 · index.html 20498-20499 · destiny-profile.js:12425)·musicTrackSub 폴백(billing-client.ts:1134, React 전용 키)·ko.json 2값을 "꿀단지 이용권"으로. 대기 종류 정규식·주석·금액·순서·다른 로케일은 그대로.
- destiny-profile.js 내용이 바뀌어 손으로 관리하는 런타임 핀 build-2179916719ec → build-8bac2dd89013(billing-client.ts PAID_SERVICE_RUNTIME_SRC, verify-paid-gate-ui-regression.mjs:234, 독립 정적 페이지 10 + public 미러 10). parity 가 요구한 값.
- payment-freeze --update: _cdChooseServicePaymentMode·_dpRenderStandalonePaymentChoice region, billing-client.ts 해시 3개 갱신. sync:public(셸 미러 7·캐시 키)·sitemap:generate(lastmod 원장 42) 산출물 포함.
- 검증: verify:payment-freeze·payment-choice-parity·payment-copy-dictionary·paid-gate-ui·locale-text-fit(카드 헤드 최대 272.1/290px) 통과, check:fast(paid-gate-suite 78/0 포함) 통과.

### U2 (2026-11-19, 커밋은 이 문서를 담은 커밋)
- 채택 용어(glossary 정본): 꿀단지 이용권 = en Honey Jar Pass · ja はちみつ壺利用券 · zh-CN 蜜罐通行证 · zh-TW 蜜罐通行證 · vi Vé Hũ Mật Ong · hi शहद जार पास · es Pase Tarro de Miel · fr Pass Pot de Miel · de Honigglas-Pass · nl Honingpot-pas · ms Pas Balang Madu. 월정석 = en Moonstone · ja/zh 月精石 · vi Nguyệt Tinh Thạch · hi मूनस्टोन · es Piedra Lunar · fr Pierre de Lune · de Mondstein · nl Maansteen · ms Batu Bulan.
- `i18n/glossary.json`: 월정석 7로케일 값 교체(vi·ja·zh 유지), "꿀단지 이용권" 항목 신설.
- i18n: authored 33파일 + public 사전(12 로케일 본 사전·shellRuntime) 토큰 단위 치환(키 추가·이름 변경 0). 영어 복사본인 비저작 로케일 값은 새 en 값으로. passMini kicker·guideLabel·step1Label·aria·title 과 payment.overlay 눈썹 문구는 로케일별로 손 번역. 옛 변종(月光通行证/證·月晶石·月光石·月長石·ムーンストーン·月明かり利用券·Đá Ánh Trăng·Đá Mặt Trăng·Maanlicht*·Mondlicht*/Mondschein-Pass·Cahaya Bulan·Clair de Lune·Luz Lunar·मूनलाइट 등)과 "돌 이름이 붙은 패스" 혼종(fr/ms/nl passCheckingNote)도 정리.
- 컴포넌트 로컬 표: service-pack-copy·TarotPromptMakerClient·PointsClient·SubscriptionStatusCard·PointHistoryClient·order-view-model·payment-alliance-copy·checkout-copy·consultation-locale-copy·LoveRelationshipTarot·first-visit-copy·public-trust-copy·commerce-disclosure-copy·official-information·legalContent·TermsContent·neo-war-room form-copy, index.html(passMini 기본값, `_cdResolvePaymentOverlayCopy` 눈썹 폴백 — 동결 region 밖), destiny-profile.js:136 en 문구.
- destiny-profile.js 내용 변경으로 런타임 핀 build-8bac2dd89013 → build-df6b3d1c4da1(billing-client.ts PAID_SERVICE_RUNTIME_SRC, verify-paid-gate-ui-regression.mjs, 독립 정적 페이지 10 + public 미러 10), `verify-payment-freeze --update`(billing-client.ts 파일 해시 1개). sync:public·sitemap:generate 산출물 포함.
- 남긴 것(이유): 코드 식별자·별칭 매칭(MOONLIGHT_*, `_dpFetchMoonlightStoneBalance`, PaymentProcessingContext·worker payment-service/profile 의 "moonlight stone" 입력 별칭), worker 주석, 노래 가사(musicLyrics·vtt "moonlight pass"), 일반 "달빛" 묘사(月明かり·Mondlicht·Mondschein·Ánh Trăng·Clair de Lune·Cahaya Bulan 태그라인·음악·부적·소설), 옛 브랜드명 이력(native-home-copy), 역사 문서·provenance.md, verify-mobile-runtime-readiness 검사 라벨. hi monthlyReward.title "मूनस्टोन पास लाभ…"는 원래 문장 구조 그대로(“월정석: 이용권 혜택…” 뜻, 기존 문제).
- 보고만: ko `home.passMini.toggle` "달빛 혜택 펼치기"(ja オープンムーンライト特典)·`heroAria` "달빛 흐름", index.html 월정석 폴백 "달빛의 결|달빛 잔량" — U3/U4 판단. en `home.passMini.primaryAction` 이 ko 와 뜻이 다름(기존). ko/shellRuntime f3376 은 소스 문자열이 없어 낡은 항목으로 보임.
- 검증: verify:payment-freeze·payment-choice-parity·payment-copy-dictionary 통과, check:fast(결과 아래).
- check:fast(standard 자동) exit 0 — jest 483 suites/8254 passed, 1 skipped. 그 뒤 손댄 public 사전 5값(passCheckingNote es·vi·fr·ms·nl)은 JSON 파싱·결제 verify 3종 재실행 통과.
