---
status: active
updated: 2026-09-12
next: "배치 3(타로) 상세창 카피 PR 의 CI·머지를 확인한 뒤, 같은 형식(receives·outline)으로 배치 4(자미·점성) 유료 상품 카피를 옮긴다."
---

# 유료 상세창 카피 배치 3 — 타로 유료 상품 9종

범위 가정: "타로 유료 상품" = `worker/lib/paid-feature-registry.js` 에 등록된 타로 결제 상품 가운데 **실제 결과 화면이 있는** 9종 — `openTarotLoveModal`(관계 타로) · `openTarotReunionModal`(재회 타로) · `openTarotYearFortuneModal`(십이지신 천운) · `tarot-celestial-harmony`(천체의 선율) · `tarot-mindscan`(마인드스캔) · `tarot-crystal-soul-reading`(크리스탈 소울) · `tarot-ijik`(이직 타로) · `tarot-prompt-maker`(타로 오라클 상담) · `/tarot/numerology/`(수비학 타로 심층). 무료로 시작하는 명리학 타로(`openTarotModal`)와 상담 카테고리인 `fortune-tea-house-tarot-consultation` 은 제외했다. `FEATURE_MARKETING_COPY` 의 `tarot:` 는 카테고리 템플릿이라 대상이 아니다.

선행 문서: [2026-09-12-detail-copy-batch2-compat.md](2026-09-12-detail-copy-batch2-compat.md)(PR #1931), 형식 계약 정본은 [2026-09-11-detail-sheet-premium-redesign.md](2026-09-11-detail-sheet-premium-redesign.md).

## 한 일

- `index.html` `FEATURE_MARKETING_COPY` 9항목에 `receives`(각 5) · `outline`(각 5) · `outlineImage`(상품 타일·히어로 이미지, 실재 확인) 추가. 사실 근거 주석 1개(`tarot-celestial-harmony` 위 "배치 3 — 타로").
- 실제 결과 화면과 다른 문장 정정:
  - 관계 타로: 입력 없이 여섯 장. `unlockBenefits` 의 "결제 후 기존 타로 리딩 화면으로 이동"은 사실이 아니라 뺐다. 결과 구성(현재 온도 → 엇갈리는 지점 → 현실 흐름과 다음 선택 → 자리별 해석 → 지켜야 할 기준 → 체크리스트)과 카카오 공유·저장 없음을 반영.
  - 재회 타로: 결과의 네 번째 자리 이름은 "다시 닿을 수 있는 거리"(뽑을 때 이름과 다름). 해석은 AI 가 아니라 자리에 맞춰 준비된 문장이라 `trustNotes` 에 한 줄 추가. faq 의 "별도 저장 기능"은 금지어라 문장을 바꿨다.
  - 십이지신 천운: 생년월일 입력이 없고 수호신은 **달마다** 짝지어져 있다("태어난 해의 수호신" 2곳 정정). 월 드릴다운은 원인 · **전개** · 결과(기존 "과정" 오기). 저장·복원은 **로그인 + 같은 해**일 때만이라 feats·unlockBenefits·faq 를 조건부로 고쳤다.
  - 천체의 선율: 통합(골든) 카드는 화면에 나오지 않아 subheadline·feats 에서 뺐다. 별빛 조율은 "오늘부터의 조율 실천" 안의 목록이라 단정을 풀었다. faq 의 "별도 계정 저장 기능은 없습니다"는 금지어이자 사실과 달라(로그인 시 서버 복원 있음) 고쳤다.
  - 마인드스캔: 뽑기는 메인 5 + 겹쳐 5 가 맞지만 결과는 **일곱 갈래 해설**이고 화면의 "숨은 감정"은 최대 여섯 조합이다. 근거 없는 "보내기 좋은 메시지 예시"를 "내가 취하면 좋은 태도"로 바꿨다.
  - 크리스탈 소울: 해석이 AI 가 아니므로 `trustNotes` 의 "AI가 작성한 해석"을 정정. 질문 입력 자리가 없다는 사실을 faq 에 반영.
  - 이직 타로: 입력이 없어 analysisSteps 의 "질문 정리"를 고쳤고, 화면은 한 화면 안의 STAGE 1 · 2 · 3 이라 "세 단계 화면"을 바꿨다. **"자동으로 환불됩니다"는 코드에 호출부가 없어 삭제**하고 실제 동작(같은 요청으로 추가 결제 없이 다시 열기)으로 바꿨다. 덱은 메이저 16장이다.
  - 타로 오라클 상담: 금지어 "프롬프트"를 전부 "질문문"으로 바꿨다(`receives` 가 생기면 항목 전체에 금지어 검사가 걸린다). "문체 3종 선택"은 복사용 문장만 바뀌므로 정정. 방향은 무작위로 정해진 뒤 바꿀 수 있다. `outlineImage` 는 파일명에 "프롬프트"가 들어간 타일 이미지를 피해 `/feature-details/assets/tarot-prompt-maker-960.webp` 를 썼다.
  - 수비학 타로: 수는 덱을 섞을 뿐이고 카드는 스물두 자리에서 사용자가 다섯 장을 직접 고른다(subheadline·previewText 정정).
- 사전: 11개 로케일(en · ja · zh-cn · zh-tw 손번역, 나머지 7개 en 복사, ko 없음). 바뀐 항목만 갱신하고 나머지는 기존 번역 유지. 재회 `trustNotes` 는 새 [1] 삽입이라 기존 [1][2] 를 [2][3] 으로 옮겼다.
- 재생성: `sync:public`(미러 · 빌드 해시 · generated JSON · feature-details 설명), `sitemap:generate`.
- 가격 · 환불 기한은 카피에 적지 않았다. 결제 로직 · 상품 ID · CSS 무변경.

## 검증 (2026-09-12 실행)

- `verify:feature-marketing-schema` OK(카피 162) · `verify:feature-marketing-dictionary` OK(11 로케일 / 108 네임스페이스 / 37631 경로 / 사전 없는 COPY 키 0)
- `verify:public-parity` · `verify:payment-legal-copy`(PASS) · `verify:rpt-preview-cta` · `verify:payment-freeze` · `verify:sitemap-drift`(860 URL) 통과
- `node scripts/verify-feature-popup-journey.mjs` PASS(63 × 4폭, 결제·API 호출 0)
- `check:fast` 통과(jest 228 스위트 / 2686 테스트)
- 금지어 스캔: 9항목 전체 JSON 에 기능 · 계산값 · 컬럼 · 데이터 · 규칙 기반 시각화 · 시스템 · 프롬프트 · 내부 로직 0건.
- 렌더 실측은 하지 않았다(배치 2 와 달리 미실행 — 후속 1).

## 함정

- **`after` 로 새 필드를 넣는 스크래치 패처가 기존 필드를 되살린다.** `tmp/tarot-batch/patch-copy.cjs` 의 옛 판은 `after` 지점에서 남은 `set` 을 전부 쏟아붓고 지워서, 그 뒤에 오는 기존 필드(faq · trustNotes 등)가 옛 값으로 덮였다. 이번에 "항목에 이미 있는 키는 제자리에서 교체"로 고쳤다. 패치 뒤에는 반드시 금지어 스캔과 스키마 검사를 같이 돌린다.
- **`outlineImage` 경로에도 금지어 검사가 걸린다.** 타일 이미지 파일명에 "프롬프트"가 들어가면 항목 전체가 실패한다.
- 사전 컨테이너 모양이 네임스페이스마다 다르다(`tarot_numerology` 는 배열, 나머지는 `{"0":..}`). `apply-dict.cjs` 가 기존 모양을 따라간다.
- 카탈로그 설명(`lib/marketing/feature-visual-details.generated.json`, `public/feature-details/*.json`)은 카피에서 생성되므로 `sync:public` 결과를 같이 커밋한다.
- 9종 모두 `public/feature-details/catalog.json` 에 있다. 비주얼 상세 모드가 아직 살아 있는 브랜치에서는 ko 에서 receives/outline 이 가려진다(선행 문서 [2026-09-12-detail-sheet-no-visual-swap.md](2026-09-12-detail-sheet-no-visual-swap.md) 가 머지되면 해소).

## 후속 과제 (보고만, 이 PR 에서 안 고침)

1. 렌더 실측(Playwright, ko · ko-fallback · en)과 시각 검사를 이번 배치에서는 돌리지 않았다. 배치 2 와 같은 수준으로 확인하려면 별도로 실행한다.
2. `tarot-ijik.html:1432` 화면 문구가 "리딩이 열리지 않으면 자동 환불"이라고 말하지만 `_ijikAutoRefundCoin` 은 호출되는 곳이 없다.
3. 타로 오라클 상담의 환불 토스트(`:3111`)는 `useCoinGate` 가 항상 `refunded:false` 라 도달하지 않는다(마인드스캔도 같다).
4. `celestial-harmony` 의 상태 문구 2250-2254 가 서로 뒤바뀌어 있다.
5. 십이지신 천운은 존재하지 않는 "결과 다시 보기" 버튼을 안내하고, `app/tarot/year/page.tsx` 는 "8개 분야"라고 쓴다(화면은 12).
6. `public/i18n/zh-tw.json` 의 타로 `featureMarketing` 블록 다수가 아직 영어 그대로다(이번에 바꾼 항목만 번체로 들어갔다).
7. 배치 1 · 2 후속(공통 헤더, veda 카피 금지어, LOVE CODE 장면 수 등)은 그대로 열려 있다.

## 다음 배치

배치 4 자미·점성 → 월정석 단건. 대상 키는 `worker/lib/paid-feature-registry.js` 에서 유료 등록을 먼저 목록화하고, 카탈로그 여부를 같이 적는다. 범위 가정은 문서 첫 줄에 적는다.
