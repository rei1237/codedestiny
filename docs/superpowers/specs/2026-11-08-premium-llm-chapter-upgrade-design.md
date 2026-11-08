---
date: 2026-11-08
status: approved
approved: "2026-11-08 사용자 계획 승인(ExitPlanMode)"
---

# 3만원 이상 유료 LLM 상담 — 상품별 챕터·분량·PDF·전달 개선

## Context
3만원 이상 유료 LLM 상품 18개는 결제 뒤 결과가 짧게 느껴진다. 질문이나 관점을 되풀이하는 문장이 많고, 첫 장에서 "나를 정확히 봤다"는 공감이 약하다. PDF는 화면 캡처 이미지라 글자를 선택할 수 없고, 보관함(`/records/view/`)에서는 PDF를 받을 수 없다. 결과가 준비됐다는 알림이 없어서 사용자가 결과 페이지에 다시 들어와야 결과를 받는다.

목표는 상품마다 아래 다섯 가지를 맞추는 것이다.
1. 첫 장은 타고난 성향과 공감 포인트로 연다.
2. 반복은 줄이고 실질 분량은 늘린다.
3. 마스터의 말투와 상품 컨셉을 살린다.
4. 결과 화면을 챕터별로 보기 좋게 만든다.
5. 글자형 책 PDF를 결과 화면과 보관함 양쪽에서 받게 한다.

결제 뒤 전달이 깨지지 않는 것이 최우선이다. 분량 목표는 수리를 시작하는 기준일 뿐이고, 전달을 막는 하한은 올리지 않는다(메모리 "LLM 분량 느슨·전달 우선").

사용자 결정(2026-11-08):
- 구현은 Claude가 직접 상품 순서대로 한다.
- PDF는 세 가지를 모두 한다: 글자형으로 교체, 보관함 PDF 버튼, PDF가 빠진 상품 채우기. 메일 발송은 범위 밖이다.
- 첫 상품은 연애 비책이다.

## 접근 방식 (선택안)
- **선택: 상품마다 하나의 수직 단계.** 프롬프트, 결과 UI, PDF, 보관함, 전달 검증을 한 상품 안에서 끝내고 커밋한 뒤 다음 상품으로 넘어간다. 공용 모듈(글자형 PDF, 반복 검사)은 1단계에서 만들고 이후 단계에서 재사용한다.
- 기각: 공통 규칙을 18개 상품에 한 번에 바꾸는 방식. "하나씩 정확하게"라는 요청과 맞지 않고 회귀 범위가 너무 크다.
- 기각: 그룹당 분량만 크게 올리는 방식. 54초 그룹 타임아웃과 12,500토큰 예산을 넘겨 전달 실패가 늘어난다. 분량은 **그룹이나 섹션을 늘려서** 키운다.

## 공통 규칙 (모든 상품 단계에 적용)
1. **첫 장 = 타고난 성향.** 첫 그룹이나 첫 장은 성향 전용으로 둔다. 다음 순서로 쓴다.
   1. 일간·월지·오행의 근거를 쉬운 뜻으로 푼다.
   2. 생활 장면으로 이어서 공감 포인트(그래서 이런 순간에 이렇게 되지 않나요?)를 2~3개 짚는다.
   3. 이 성향이 이번 상담 주제와 어떻게 이어지는지로 맺는다.

   질문에 대한 답은 이 장의 마지막이나 둘째 장에서 정면으로 한 번만 한다.
2. **반복 최소화.**
   - 사용자의 질문 원문은 상담 전체에서 한 번만 인용한다. 다른 장은 질문을 다시 쓰지 않고 그 장의 관점에서 답을 보탠다.
   - 그룹 프롬프트마다 "이 장만 맡는 관점"을 한 줄로 고정한다. 각 장이 다른 장의 결론 문장을 요약해 되풀이하지 않게 한다.
   - 장 첫 문장과 맺음 문장은 장마다 다른 형태로 쓴다. 상투구 목록(예: "결국 중요한 것은", "다시 말해", "앞서 말했듯")은 금지한다.
   - 전체를 합친 뒤 `dropRepeatedReportSentences`([worker/lib/paid-report-quality.js](worker/lib/paid-report-quality.js))로 장을 넘나드는 중복을 지운다. 지우고 나서 짧아진 장은 기존 수리 경로로 보충한다.
3. **분량.** 그룹당 목표는 지금 범위를 유지하고, 그룹이나 섹션 수를 늘려 총목표를 올린다. 토큰 예산은 `tokensRequiredForChars`([worker/lib/llm-budget.js](worker/lib/llm-budget.js))로 맞추고, 그룹 타임아웃 안에 끝나는지 확인한다. 전달 하한(MIN)은 올리지 않는다.
4. **마스터 말투.** 페르소나 원문([worker/lib/expert-character-persona-text.js](worker/lib/expert-character-persona-text.js))은 말투만 정한다. 새 장을 추가하면 화자 매핑에 넣고, 말투 검사는 기존 함수를 쓴다.
5. **진행 중 세션 보호.** 그룹 구성을 바꾸면 세션에 `groupPlanVersion`을 저장한다. 버전이 없는 기존 세션은 옛 그룹 목록으로 재개하고, 화면과 PDF도 옛 결과를 그대로 렌더한다. 이렇게 해야 배포 중에 생성 중이던 결제 건이 깨지지 않는다.
6. **결과 화면.**
   - 목차를 둔다(장 번호, 제목, 화자).
   - 장마다 머리에 장 번호, 제목, 마스터 아바타 칩, 한 줄 요약(kicker)을 넣는다.
   - 본문은 `AiResultProse`로, 페이지 넘김은 `PagedResultViewer`로 그린다.
   - 첫 장(타고난 성향)은 강조 카드로 보여 준다.
   - 모바일 360px에서 확인한다.
7. **PDF.**
   - 공용 글자형 내보내기를 만든다. [lib/pdf/export-ziwei-report-pdf.ts](lib/pdf/export-ziwei-report-pdf.ts)를 일반화해 `lib/pdf/export-consultation-book-pdf.ts`로 둔다. 입력은 `{title, productLabel, byline, coverArtSrc, coverTheme, chapters:[{kicker,title,body,speaker?}]}`이다.
   - `createTypesetWriter`, `drawContentsPage`, `drawFooters`, `registerPdfFontsSafely`, `ziweiReportBlocks`(문단·소제목 분리)를 재사용한다.
   - 글꼴을 불러오지 못하면 기존 `exportResultPdf` 캡처 방식으로 대체한다(초융합 운세 선례: `FusionFortuneClient.tsx:2757-2790`).
   - 장을 만드는 빌더(`build<Product>PdfChapters(consultation)`)는 상품마다 하나씩 두고, 결과 화면과 보관함([app/records/view/SavedServiceReading.tsx](app/records/view/SavedServiceReading.tsx))이 같은 빌더를 쓴다.
8. **전달 검증.** 상품마다 다음을 확인한다.
   - 결제 확인 → 생성 시작 → `partial`(202) 폴링 → `completed`
   - 생성 실패 시 복구 크론(`consultation-recovery-task.js`의 해당 어댑터)이 재개하는지
   - 결과 API가 새 구조와 옛 구조를 모두 돌려주는지

## 단계 (상품 순서)
각 단계는 상품 하나를 끝까지 마치고 커밋한다(push와 배포는 요청할 때만). 단계마다 인수인계 문서 체크박스를 갱신한다.

### 0. 준비
- 전용 워크트리를 만든다(제거할 때는 `npm run worktree:remove`).
- 설계 문서 `docs/superpowers/specs/2026-11-08-premium-llm-chapter-upgrade-design.md`와 인수인계 문서 `docs/handoff/premium-llm-chapter-upgrade-2026-11-08.md`를 쓰고 커밋한다.

### 1. 연애 비책 (연이·서한비) — 공용 모듈 포함
- 프롬프트([worker/lib/love-secret-ai-prompt.js](worker/lib/love-secret-ai-prompt.js)):
  - 새 그룹 `nature`(화자 연이)를 맨 앞에 둔다. 섹션은 "타고난 연애 기질 — 당신이 사랑하는 방식의 원형"과 "그래서 이런 순간 마음이 먼저 움직여요"(공감 장면) 두 개다.
  - `core`의 첫 섹션은 질문의 답과 현재 관계 자리에 집중하게 바꾸고, 성향 총론은 `nature`로 옮긴다.
  - 각 그룹의 `covered`와 "이 장만 맡는 관점"을 갱신한다. 질문 원문은 `core`에서만 인용한다.
  - 총목표는 30,000~39,000자에서 약 36,000~46,000자로 올린다(TARGET만 조정, MIN 20,000은 유지). MAX/PARSE 상한은 새 총량에 맞춰 조정한다.
  - `LOVE_SPEAKER_BY_GROUP`에 `nature: "yeoni"`를 넣는다.
- 라우트([worker/routes/love-secret-ai.js](worker/routes/love-secret-ai.js)):
  - 그룹 목록을 `groupPlanVersion`으로 고른다.
  - 합본 뒤 장을 넘나드는 중복 문장을 제거한다.
  - 진행률 표시의 그룹 수를 갱신한다.
- 결과 화면([app/love-secret-ai/result/love-secret-sections.ts](app/love-secret-ai/result/love-secret-sections.ts), `LoveSecretAiResultClient.tsx`):
  - `nature` 카드 그룹을 맨 앞에 두고 강조 카드로 보여 준다.
  - 장 머리에 번호, 화자 칩, kicker를 넣는다.
  - 목차에 화자를 표시한다.
  - 옛 세션은 `nature`가 없으니 기존 순서 그대로 렌더한다.
- PDF:
  - 공용 `export-consultation-book-pdf.ts`를 만든다.
  - `buildLoveSecretPdfChapters`를 만든다. 표지는 연이와 서한비 공동 byline이고, 장마다 화자를 표시한다.
  - `LoveSecretPdfButton`을 글자형으로 교체한다.
  - 보관함 연애 비책 화면에 PDF 버튼을 추가한다.
- 테스트(기존 `scripts/verify-*`와 테스트 크기 관례를 따른다):
  - 그룹 프롬프트 조립: `nature`가 첫 그룹이고 질문 인용은 `core`에만 있는지
  - 옛 세션(버전 없음)이 옛 그룹으로 재개되는지
  - PDF 장 빌더의 장 순서와 글자 수 보존

### 2. 신년운세 (네오, 해라체 반말)
- [worker/routes/new-year-ai.js](worker/routes/new-year-ai.js)의 opening 섹션을 "타고난 성향과 올해 너의 자리" 전용으로 바꾼다.
- 질문 결론은 overview로 옮긴다.
- 섹션을 추가해 분량을 늘린다(예: 관계·커리어를 분리할지 검토).
- 결과 화면([app/new-year-ai-consultation/NewYearAiClient.tsx](app/new-year-ai-consultation/NewYearAiClient.tsx))에 목차를 넣는다. 첫 장 카드에 네오 칩을 달고, 도메인 카드와 월별 장을 챕터로 통일한다.
- PDF를 글자형으로 바꾸고 보관함에도 붙인다.

### 3. 인생의 책 / 인생 총운 (윤달, 책 화자)
- 1장 "타고난 사주의 원형"에 공감 장면을 보강한다.
- 장끼리 반복되는 문장을 제거한다.
- 장당 목표를 올리되 토큰 예산 안에서 올린다.
- 결과 화면은 이미 목차와 페이지 넘김이 있으니, 윤달 칩과 장 kicker만 추가한다.
- PDF는 책 표지를 쓰는 글자형으로 바꾸고 보관함에도 붙인다.

### 4~N. 나머지 3만원 이상 상품 (한 단계에 한 상품)
순서:
1. 운명의 업 (네오·서한비)
2. 마스터 인연의 서와 그 궁합판
3. 초융합 운세
4. 자미두수 상담과 심층 PDF (무성)
5. 숙요점 궁합 (서한비)
6. 점성술 (윤달)
7. 베다점과 나크샤트라 2종 (윤달)
8. 팩폭 작전실 (네오)
9. 사주 맞춤 작명
10. 영냥이 참치·모둠·오마카세

초융합 운세, 자미두수 심층, 영냥이는 이미 글자형 PDF가 있으니 첫 장과 반복과 UI만 다룬다. 각 단계를 시작할 때 그 상품의 프롬프트, 페르소나, 결과 화면을 먼저 읽고, 상품 컨셉에 맞는 첫 장 이름과 장 구성을 정한다.

## 진행 방식
- 단계마다 새 general-purpose 에이전트가 인수인계 문서의 `next`부터 실행한다(전역 CLAUDE.md 규칙). 이 세션은 결과만 받아 사용자에게 전한다.
- 문서에 없는 결정이 나오면 그때만 묻는다. 예: 새 외부 발송, 가격 변경, 장 구성을 크게 바꾸는 일.

## 검증
- 상품마다 다음을 확인한다.
  - 단위 테스트와 회귀 스크립트(`scripts/verify-llm-generation-resilience.mjs`와 해당 상품의 verify 스크립트)
  - `npm run build`(정적 export)와 타입 검사
- 화면은 목 결과(옛 세션과 새 세션 두 종류)로 확인한다. 결과 페이지와 보관함 화면을 로컬 브라우저로 열어 목차, 장 카드, 화자 칩, 360px 레이아웃을 본다.
- PDF는 글자형으로 저장한다. 텍스트 추출로 장 순서와 글자 수를 비교하고, 글꼴 실패 시 캡처 방식으로 대체되는지 확인한다.
- 실제 LLM 생성은 상품당 1회 샘플만 하고, 그때마다 사용자 승인을 받는다(LLM 안전 규칙). 샘플에서 확인할 것:
  - 첫 장이 성향과 공감으로 시작하는지
  - 질문 인용이 1회인지
  - `hasRepeatedReportPassage` 결과가 false인지
  - 총 글자 수
  - 상태가 `completed`까지 가는지
