---
status: in-progress
updated: 2026-11-19
next: "U1 — 한국어 화면의 이용권 상위 이름을 꿀단지 이용권으로 통일"
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
- [ ] U1 한국어 용어 통일(꿀단지 이용권). 바꾼 파일·건수, 보고만 목록(결제 동결)을 아래 "결과"에.
- [ ] U2 번역 용어 통일(Moonstone·月精石·꿀단지 이용권 번역) + glossary.
- [ ] U3 FAQ·서비스 설명 개편(+ 해당 로케일 번역 동기화, SEO 점검).
- [ ] U4 마무리: 남은 옛 이름 grep(문서 역사 기록 제외) 0 확인, 금지 표현 grep, `npm run check:pre-push`, origin/main 머지(충돌 생성물은 theirs → `sync:public`·`sitemap:generate`), push, main CI 1회 확인, 이 문서 `status: done`, 최종 보고. 운영 승격은 하지 않는다.

## 결과
(단계별로 여기에 추가)
