---
status: done
updated: 2026-11-19
next: "없음 (운영 승격은 사용자 별도 요청 시)"
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
- [x] U3 FAQ·서비스 설명 개편(+ 해당 로케일 번역 동기화, SEO 점검).
- [x] U4 마무리: 남은 옛 이름 grep(문서 역사 기록 제외) 0 확인, 금지 표현 grep, `npm run check:pre-push`, origin/main 머지(충돌 생성물은 theirs → `sync:public`·`sitemap:generate`), push, main CI 1회 확인, 이 문서 `status: done`, 최종 보고. 운영 승격은 하지 않는다.

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

### U3 (2026-11-19, 커밋은 이 문서를 담은 커밋)
- 구조: `/faq` 는 `mergeOfficialInformation` 이 공식 문항 10개(`lib/brand/official-information.mjs`)를 항상 먼저 놓고 `FAQS_DEFAULT` 를 뒤에 붙인다. 공식 문항 순서(무엇인지 → 영냥이 → 기준 → 차이 → 체계 → 무료 → 유료 세 가지·가격 → 다시 보기 → 직접 검수 → 공식 사이트·문의)는 테스트가 index 로 단언해 유지했다. 그래서 "문의"(공식 10번)가 자세한 환불 문항보다 앞에 온다 — 공용 병합 로직을 바꾸지 않으려고 받아들인 차이이며, 환불 답변 끝에 /contact/ 를 넣었다.
- 유료 세 가지 정의는 공식 7번 한 곳에만 둔다(ko/en/ja): 단건 결제 = 상담 하나씩 원화 결제, 꿀단지 이용권 = 한 번 결제·기간 제한 없음·자동결제 아님·등급별 상담 한도(총 금액) 안에서 대표 상담(인생의 책·신년운세처럼 한 주제를 깊게)·라이트 운세는 횟수 제한 없음, 월정석 = 가입 혜택·이벤트 보너스·30일·할인 전 1만 원 이상·이용권 구매 불가·현금 교환 불가. 근거: payment-gating 2026-11-13, app/app/_lib/copy.ts:233-234, lib/marketing/pass-benefits.mjs. 가격은 기존 `${prices}`(registry) 그대로, 새 숫자 없음.
- 공식 문항 바뀐 질문(옛 질문은 CMS 덮어쓰기 대비로 legacy 억제 목록에 추가):
  - 7번 "유료 상품의 실제 가격과 이용 조건은 어디에서 확인하나요?" → "유료 상담은 어떻게 결제하고, 가격은 얼마인가요?" (en "How do paid options work, and what do they cost?", ja "有料相談の支払い方法と価格は？")
  - 8번 "분석 결과는 어떻게 전달하고 보관하나요?" → "받은 결과는 어디에서 다시 보나요?"(추가 결제 없음·다른 계정이면 안 보임·검색 비노출을 쉬운 말로) (en "Where can I reopen my results?", ja "受け取った結果はどこで見直せますか？")
  - 답변만: 2번 "(운세보는 영냥이)" 별칭, 3번 "‘네오사주’로 찾아오셨다면…" 한 문장, 6번 무료 범위 쉬운 말, 10번 오류 문의 요령(결제 일시·화면 문구, ko/en/ja).
- `app/_content/faq-copy.js`(FAQS_DEFAULT) 합치기·빼기 (전 → 후):
  - "운세 결과는 확정된 미래를 의미하나요?" + "운세 결과를 바꾸나요?" → "운세 결과는 정해진 미래인가요?" 하나로.
  - "이용권 한도를 다 쓰면…" → "꿀단지 이용권의 상담 한도를 다 쓰면 어떻게 되나요?"(라이트 운세 계속·재구매는 새 한도·패밀리 외 건당 상한). 필수 문구 '라이트 운세' 유지.
  - 환불 문항 → "꿀단지 이용권과 단건 결제는 어떻게 취소하거나 환불받나요?"(7일 청약철회·제공 시작분 제한·3개월/30일·'라이트 운세를 이용한 이용권은 자동으로 환불되지 않으며, 고객센터에서 이용 내역을 확인한 뒤 처리합니다.'·월정석 현금 환불 불가·/contact/).
  - 뺌(공식 문항과 같은 내용): 상담 방식 3문항 `CONSULTATION_METHOD_FAQS`(선생님 기준 상담 위치=공식 3, 영냥이·꿀꿀·네오 고르기=공식 2·9, AI 상담 vs 직접 검수=공식 9), 차별점 "네오사주·꿀꿀운세·운세보는 영냥이는 어떻게 연결되나요?"(=공식 1·2·3, 별칭은 2·3번으로 옮김), "다른 AI 운세 서비스와 무엇이 다른가요?"(=공식 4 + 초융합·챗봇 문항 요약), "로그인이나 결제 페이지가 검색에 노출되나요?"(noindex 설명 → 공식 8번 한 문장), 이미 억제돼 화면에 안 나오던 옛 문항 4개(기본 무료·결제 결과 다시 보기·공식 사이트·문의; 문의 요령은 공식 10번으로).
  - 원본 모듈(consultation-methods.mjs, differentiation-faqs.mjs)은 홈 셸(build-home-funnel)·llms-full 이 그대로 쓰므로 고치지 않고, faq-copy 에서 필요한 차별점 문항만 골라 쓴다(없는 질문이면 throw — fail-closed).
- /about: about-copy.js 결제 절(`payment.body` 는 아래 절로 안내, `pass.*` 세 가지를 쉬운 말로·이름 "꿀단지 이용권", `explore.pass.*`, `refund.used.*`). about-intro-copy.js "달빛 선물." → "월정석 선물."(옆 이미지 alt 가 '월정석 선물 상자'), `intro.faq.text7` 은 차이를 FAQ로 안내.
- ServiceGuide.tsx 맺음말: 결제 방법 반복 대신 FAQ 링크(`/faq/`) 한 줄 추가(기존 afterword 링크와 같은 마크업). PolicyGuide.jsx 라벨 "이용권" → "꿀단지 이용권", faq 가이드 행 "유료 이용" → "환불 기준"(링크가 /refund-policy). HelpDesk.jsx 는 바꿀 것 없음.
- 달빛 잔재(동결 region 밖): index.html `home.passMini.toggle` "꿀단지 혜택 펼치기", 토글 JS 2곳·닫기 버튼 "꿀단지 혜택 접기", heroAria "꿀단지 이용권으로 볼 수 있는 서비스 확인", 결제 오버레이 월정석 폴백 '달빛의 결이 조용히 맞춰지고 있어요.' → '월정석으로 콘텐츠를 여는 중이에요.'(ko 사전에 키 없음 → 폴백이 화면 문구). authored shellCopy-02 두 키 12로케일, public/i18n 12개 사전의 두 키 + `shell.honeyMembershipDetails.kr1a9l9`(authored 원본 없음, 사전이 원본) 손 번역. 옛 문구 분류 정규식 `달빛의 결|달빛 잔량`(index.html 24154·24833)은 옛 저장 문구 호환이라 유지.
- U2 누락 수정: lib/i18n/public-trust-copy.mjs ja 月定石 2곳·zh 月光石 3곳 → 月精石.
- SEO 점검(/faq, /about, /en|/ja|/zh/faq, 정적 정책 페이지):
  - title·description·H1·canonical·hreflang·robots: 변경 없음, 결함 없음 → 영향 없음.
  - FAQPage JSON-LD: /faq 는 `buildFaqPageJsonLd(faqs)` 가 화면 목록 그대로 → 일치. 로케일 FAQ 는 공식 문항(en/ja)을 같은 함수로 읽어 화면·구조화 데이터 함께 갱신. zh 는 공식 문항 없음(기존).
  - 번역 동기화: 공식 문항 en/ja 동기. zh-CN·zh-TW 로케일 FAQ 는 TRUST_COPY 고정 문구라 이번 변경 문항 없음(月精石 오기만 수정). 나머지 7로케일은 /faq 로케일 페이지가 없어 영향 없음.
  - sitemap: `sitemap:generate` 로 lastmod 갱신(원장 서명 다수 재계산, sitemap.xml 실제 변경 1곳). 내부 링크: ServiceGuide → /faq/ 1개 추가. 이미지·광고 적합성: 영향 없음.
- 보고만(U4 또는 후속): consultation-methods.mjs 홈 메모의 "이용권·월정석·단건 결제"(홈 셸 인라인 — 재빌드 필요), ja 단독 "利用券" 표기, en/ja 로케일 FAQ "What do paid features add?" 가 공식 7번과 일부 겹침, 운영 CMS 덮어쓰기가 FAQS_DEFAULT 를 가릴 수 있음(옛 질문 억제 목록은 넣어 둠), en passMini primaryAction 뜻 차이(기존), 토글 JS 가 `btn.textContent` 로 i18n span 을 한국어로 덮어씀(기존 버그 — 다른 로케일에서 펼친 뒤 한국어로 바뀜), 차별점·공식 문항의 부정형 "보장되지 않습니다" 고지(기존, 금지 표현 아님).
- 검증: `node --test scripts/seo/official-information.test.mjs` 3/3 통과. `sync:public`(셸 미러 7·정적 정책 6) → check:fast 1차 BLOCKED(verify:sitemap-drift) → `sitemap:generate` → check:fast(critical 자동) exit 0, jest 483 suites/8254 passed, 1 skipped. 추가한 줄에 금지 표현(보장·비법·비책·반드시·100%·운명이 바뀝) 0건.

### U4 (2026-11-19)
- 남은 오기 수정 4af9f694a `copy(i18n)`: ja/zh 화폐 표기 月定石·月光石 → 月精石 55곳/11파일(AstrologyAiClient·AuthShell·service-pack-copy·NamingAiClient·PointsClient·loadingMessages·feature-introductions·legalContent·master-love-codex copy·neo-war-room form/result-copy) + sitemap:generate. 결제 실행 파일·payment-freeze 대상 파일 해당 없음. 크리스털 타로의 보석 이름 月光石(CrystalSoulTarotClient.jsx:487·501)은 화폐가 아니라 유지. check:fast 1차 BLOCKED(sitemap drift) → sitemap:generate → 2차 exit 0(jest 483 suites/8254 passed, 1 skipped).
- 옛 이름 grep(docs/ 제외, 대소문자 무시): 달빛 이용권 24·달빛이용권 0·문라이트 패스 5·Moonlight Pass 6·Moonlight Stone 6·月晶石 0·月光通行证/證 0. 남은 것은 전부 예외 — 호환 정규식 `달빛 이용권 결제|이용권 결제`(billing-client.ts:2926, index.html+셸 미러 7), 주석(billing-client.ts:1168, index.html 24826+미러, verify-paid-gate-ui-regression.mjs:406, worker/payments/passes.js:2, public/_redirects:66), glossary 폐기 이름 메모, 미참조 잔재 i18n/.rest.json·.w1-strings.json, shellCopy-04 `_comment`, 가사(musicLyrics·vtt), provenance.md, verify-mobile-runtime-readiness 검사 라벨, 코드 별칭 "moonlight stone"(PaymentProcessingContext·payment-service·profile)·worker 주석. 화면 노출 0.
- 보고만: index.html 24826 주석 "이용권 제품명이 '달빛 이용권'이다"(+미러, verify-paid-gate-ui-regression.mjs:406 같은 취지)는 U1b 뒤로 사실이 아니게 됐다. 주석뿐이고 결제 분류 정규식 옆이라 손대지 않았다.
- 금지 표현(`git diff 23b5c55c0..HEAD` 추가 줄 3,586): 보장 6(전부 "보장하지 않습니다"류 부정 고지 5 + 이 문서 자기 언급 1)·비법 1·비책 1(둘 다 이 문서 자기 언급). 약속형 0.
- 머지 4152dd445: origin/main 3커밋(e3f3adfcc·95395e203·077718dcc) 머지. 충돌 6건 모두 생성물(config/sitemap-lastmod.json, public/static/policies/{about,contact,faq,refund,terms}) → theirs 후 sync:public·sitemap:generate 재생성, sitemap:check OK.
- `npm run check:pre-push` exit 0. push 전 main CI(077718dcc) 녹색. 함께 push 되는 다른 세션 커밋: iOS 488b4774a·aa8f2b0bb·f72deb1a0·c5d4fb778(main 에 이미 커밋돼 있던 것, 배포 산출물 변화 없음이라고 커밋에 적혀 있음).
- push: 이 문서 커밋을 포함한 HEAD 를 origin/main 으로(SHA·CI 결과는 최종 보고). 운영 승격·릴리스 워크플로는 하지 않았다.
