---
status: active
updated: 2026-10-02
next: "docs/handoff/2026-10-02-yeongnyangi-launch-offer-followups.md 의 남은 작업 중 체크 안 된 첫 항목 하나만 진행해줘"
---

# 영냥이 체험가 표기 — 범위 밖 후속 6건

## 왜

체험가 표기(선착순 1,000명·정식 오픈 예정가) 작업 중 발견한 범위 밖 결함을 **한 세션에 한 항목씩** 고친다.
사용자 원문: "남은 범위 밖 문제점들도 수정해주고 다른 세션에서 진행할 수 있도록 인수 인계 문서를 통해서 하나씩 진행할 수 있도록 해줘"

## 지금 상태

- 체험가 표기 본작업은 main 09ae18c2c 에 머지·push, PR CI success. 표시 정본 `lib/brand/launch-offer.ts`.
- 아래 6건은 전부 미착수. 항목 하나 = 커밋 하나(되돌리기 단위). 끝나면 여기 `[x]` + 커밋 SHA 를 적는다.

## 남은 작업 (위에서부터 하나씩)

- [ ] **1. Consultation 가격 표기 통일 (GREEN)** — ko 에서 예정가는 "9,900원", 실가는 `price()` 가 "₩1,000" 이라 한 줄에 두 표기가 섞인다.
  `app/yeongnyangi/_components/Consultation.tsx:52` `price` → `readingPrice`(`app/yeongnyangi/_lib/use-reading-language.ts:35`, Intl currency). 다른 영냥이 화면은 전부 "N원"(`NightHero.tsx:25`, `ProductGuide.tsx:30`).
  완료 기준: ko 생선 버튼·결제 합계가 "1,000원", 비한국어 로케일은 지금 그대로(₩/통화 표기). `readingPrice` 를 쓰는 다른 호출부를 grep 해 ko 바뀜이 원치 않는 곳에 번지지 않게 — 바꾸려면 Consultation 의 `price` 만 ko 분기.
- [ ] **2. 결제 합계 스크린리더 문장 (GREEN, a11y)** — 합계가 "정식 오픈 예정가 9,900원 ₩1,000" 로 읽힌다.
  `Consultation.tsx` checkoutTotal 블록 + `app/components/LaunchPlannedPrice.tsx`. 실가 앞에 시각 숨김 "체험가" 를 붙이는 식으로 "정식 오픈 예정가 9,900원, 체험가 1,000원" 이 되게. 시각 표시는 바꾸지 않는다.
  완료 기준: `__tests__/ui/yeongnyangi-launch-offer.test.mjs` 에 접근성 텍스트 단언 1개 추가.
- [ ] **3. 챕터 수 불일치 조사→수정 (GREEN 조사, 수정은 결과에 따라 RED)** — `/yeongnyangi/1000-won-fortune/` 가격표는 광어 11·참치 15, 상담 화면 생선 버튼은 광어 13·참치 24.
  가격표 = `Product.chapterCount`(`worker/yeongnyangi/payments/catalog.ts:13` → `readingChapterCount`, `worker/yeongnyangi/fortune/reading-policy.ts:30`, v5/v6 버전 기준).
  버튼 = `consultationManifest(...).length`(`worker/yeongnyangi/fortune/consultation-kinds.ts:46`, v7 이 켜지면 `readingManifestV7`).
  추정(미검증): v7 매니페스트 길이와 카탈로그 숫자가 갈라졌다. 실제로 전달되는 쪽(=생성 매니페스트)이 정본일 가능성이 크다 → 가격표가 그 값을 쓰게 바꾼다.
  🔴 `catalog.ts` 는 결제 축 파일 — 값을 바꾸면 check:fast 가 전체 jest 로 승격(~500s), paid-gate-auditor 로 동결 매니페스트 확인. 표시만 고치는 쪽(가격표가 manifest 길이를 쓰게)이 더 안전하다.
  완료 기준: 두 화면이 같은 수를 보이고, 그 수가 실제 생성 챕터 수와 같다는 테스트 1개.
- [ ] **4. Yeongnyangi Browser Shadow 실패 (RED: CI 검증기)** — `scripts/lib/yeongnyangi-mobile-payment.mjs:286` 단언 "Unrecognised API must not silently succeed" 가 `POST /api/payments/service-packs/quote` 2회로 실패. mock 라우트(`:59-160`)에 service-packs/** 가 하나도 없다. 호출원 `app/components/service-packs/service-pack-client.ts:57`.
  174b8a41a 이전부터 실패(체험가 작업 무관). shadow 라 게이트는 아님.
  방향: quote 를 실제 워커 응답 형태(`worker/payments/` 의 service-packs quote 핸들러)대로 mock 에 추가. 단언은 약화하지 않는다(fail-closed 유지).
  완료 기준: 로컬 `node scripts/verify-yeongnyangi-browser.mjs` 통과 + push 후 그 워크플로 success.
- [ ] **5. 결제 게이트 트리거 공백 (RED: CI)** — `.github/workflows/paid-flow-gates.yml` paths 와 `scripts/lib/change-risk.mjs:92-156` 에 `yeongnyangi` 0건. `app/components/service-packs/**`, `app/yeongnyangi/_components/Consultation.tsx`, `worker/yeongnyangi/payments/**` 를 바꿔도 결제 게이트가 안 돈다.
  🔴 메모리 "CI gate scope": 결제 게이트 범위 안이지만 **착수 전 사용자에게 위험·검증·롤백을 먼저 알리고** 진행. 기존 검사 삭제 금지, 경로 추가만.
  완료 기준: `npm run check:fast -- --plan` 에서 위 경로 변경이 결제 고위험으로 분류됨(가짜 diff 로 확인) + 변경 커밋의 CI 에서 paid-flow-gates 가 실제로 돈다.
- [ ] **6. 표시 범위 확장 (선택 — 사용자에게 먼저 물을 것)** — ProductGuide 단계 버튼, QuestionSky(`QuestionSkyConsultation.tsx:62`)·Spirit(`SpiritConsultation.tsx:53`)·연이/네오 채팅 가격에는 예정가가 없다. 생선 단계가 아니라 예정가 표가 없으므로 숫자는 사용자 결정. 팩 상점 1280px 대비는 별도 판정 안 함(390px 는 6.7:1).

## 정본 예시

예정가 표기 방식: `app/yeongnyangi/_components/ProductGuide.tsx` 의 `plannedPriceFor` + `<LaunchPlannedPrice/>`.

## 함정

- 영냥이 파일은 CRLF/LF 혼재. node 패치 패턴에 `\n` 을 넣지 말 것(`yeongnyangi.module.css` 만 LF).
- `app/**` 를 고치면 `npm run sitemap:generate` 결과(원장·sitemap 4개)를 **같은 커밋**에 넣어야 `verify:sitemap-drift` 통과.
- dev mock 에 `/api/payments/service-packs/catalog` 없음 → 팩 화면 캡처는 playwright `route` 로 `SERVICE_PACK_PLANS` 주입.
- `__tests__/ui` 는 `node --test`.

## 검증

```
node --test __tests__/ui/yeongnyangi-launch-offer.test.mjs
npm run check:fast
```

## 모르는 것

- 3번: 어느 챕터 수가 사용자에게 약속할 값인지(v7 이 운영에서 켜져 있는지 포함) — 코드로 확정 못 하면 사용자에게 묻는다.
