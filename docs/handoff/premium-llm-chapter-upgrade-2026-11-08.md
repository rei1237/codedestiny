---
status: in-progress
updated: 2026-11-08
next: 5단계 마스터 인연의 서 (+궁합) — 조사 완료(5단계 진행 메모), compat 프롬프트·acts.ts 확인 뒤 설계 확정·TDD부터, 실호출 샘플 solo·compat 각 1회
---

# 3만원 이상 유료 LLM — 상품별 챕터·분량·PDF·전달 개선 인수인계

설계(승인됨): `docs/superpowers/specs/2026-11-08-premium-llm-chapter-upgrade-design.md`. 공통 규칙 1~8과 단계 정의는 이 설계를 정본으로 따른다.

## 첫 행동
1. 이 문서와 설계 문서를 읽는다.
2. `next`에 적힌 단계의 대상 파일(프롬프트, 라우트, 결과 화면, 보관함 렌더러)을 먼저 읽는다.
3. 테스트를 먼저 쓰고(TDD), 구현한 뒤 검증하고 커밋한다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\premium-llm-chapter-upgrade-20261108`
- 브랜치: `feat/premium-llm-chapter-upgrade`, origin/main `70eaf737b`에서 분기
- `node_modules`: 워크트리의 `node_modules`를 메인 저장소 `D:\Development\code-destiny\node_modules`로 가리키는 junction으로 만들었다(2026-11-08, `scripts/create-safe-worktree.ps1` 관례, `npm run worktree:remove`가 junction을 먼저 끊는다). 주의: 메인 체크아웃은 옛 브랜치라 버전이 뒤처진다(예: next 15.5.15 설치, package.json은 ^15.5.28. tiptap·capacitor도 다름). typecheck·build가 버전 차이로 실패하면 junction을 끊고 이 워크트리에서 `npm ci`를 한다.
- 메인 저장소(`D:\Development\code-destiny`)는 다른 브랜치(feat/world-cast-page)에 미커밋 변경이 있다. 그쪽은 건드리지 않는다.

## 승인 상태 (2026-11-08)
- 계획 전체 승인. 사용자 결정은 다음과 같다.
  - 구현은 Claude가 직접 상품 순서대로 한다.
  - PDF는 글자형으로 교체하고, 보관함에 PDF 버튼을 넣고, PDF가 빠진 상품을 채운다.
  - 첫 상품은 연애 비책이다.
- 커밋은 자동으로 한다. **push와 배포는 사용자가 요청할 때만** 한다.
- **실제 LLM 호출은 상품마다 1회 샘플만, 그때마다 사용자 승인을 받는다.** 목이나 단위 테스트로 할 수 있는 것은 실호출 없이 한다.
- 메일·카카오 발송은 범위 밖이다.
- 실호출 샘플 승인(2026-11-08): 사용자 원문은 "llm 샘플 생성 허가한다"이다. 범위는 이 프로젝트에서 상품마다 실호출 샘플 1회이고, 그 이상은 하지 않는다. 이후 단계는 다시 묻지 않고 상품마다 1회를 돌린다.
- 사용자 결정 대기
  - 개발 서버 정리: 사용자가 2026-11-08 종료를 허락했고, coordinator가 3917 dev 서버(PID 22212/45252)를 껐다. 이제 이 워크트리에서 빌드해도 된다.
  - 네오 문구(F8): 사용자 2026-11-08 결정 "네오 사자 장군 표현 없애". 33a650891에서 "장군 네오"로 바꿨다.

## 작업 규칙과 함정
- 분량은 목표일 뿐이고 전달 하한(MIN)은 올리지 않는다. 짧으면 한 번 수리하고 그대로 전달한다(`docs/context/ai-and-db.md`의 LLM 안전 규칙).
- 그룹이나 섹션 하나는 엣지 100초 컷 안에서 끝나야 한다. 연애 비책은 그룹 타임아웃 54초, 그룹당 12,500토큰이다. 분량은 **그룹을 늘려서** 키우고, 그룹 하나의 분량을 키우지 않는다.
- 그룹 구성을 바꾸면 `groupPlanVersion`으로 분기해 진행 중인 결제 세션을 옛 구성으로 끝낸다. 결과 화면, 보관함, PDF도 옛 구성의 결과를 그대로 그려야 한다.
- 금지 표현 패턴(`FORBIDDEN_RESULT_PATTERNS`)에 "PDF"와 "챕터"가 있다. 장 제목이나 본문 지시에 이 단어를 넣지 않는다.
- 연애 비책 화자 매핑의 정본은 `LOVE_SPEAKER_BY_GROUP`이다. 결과 화면은 섹션 제목 정규식(`resolveLoveSpeaker`)으로 화자를 따라가므로, 새 섹션 제목을 넣으면 그 정규식도 같이 맞춘다.
- 결과 화면 카드 그룹은 제목 정규식(`groupLoveSections`)으로 분류된다. 새 제목이 엉뚱한 카드로 들어가지 않는지 테스트한다.
- 글자형 PDF는 자미두수 모듈(`lib/pdf/export-ziwei-report-pdf.ts`)을 일반화한다. 글꼴을 불러오지 못하면 `exportResultPdf` 캡처 방식으로 대체한다.
- 보관함 렌더러는 `app/records/view/SavedServiceReading.tsx`이고 상품 결과 클라이언트와 따로 있다. 보관함 PDF는 결과 화면과 같은 장 빌더를 쓴다.
- 커밋 메시지 끝에는 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.
- **분량 부족으로 전달이 실패하면 안 된다(사용자 지시 2026-11-08 원문: "분량은 넉넉하게 생성되도록해서 분량 부족으로 실패가 나와서 전달이 안되는 일이 없도록해줘").**
  - 넉넉하게 생성한다. 장·섹션 목표 분량과 프롬프트 최소 분량에 여유를 두어, 보통 출력이 MIN을 크게 넘기게 한다(겨우 넘기는 수준이 아니다). 토큰 예산은 시간 상한 안에서 `tokensRequiredForChars`로 잡는다.
  - 분량 관련 이슈(합계 MIN 미달, 장·섹션 content_too_short)는 절대 치명 이슈가 아니다. 횟수 제한이 있는 분량 수리를 한 뒤 그대로 전달하고, 섹션을 비우지 않는다.
  - 상품마다 품질 게이트에서 분량 이슈가 치명으로 남아 있는지 확인해 비치명으로 바꾼다. "짧지만 유효한 출력이 completed에 도달한다"는 행동 테스트를 넣는다.
  - 연애 비책·신년운세·인생의 책·총운(love-secret-ai*, new-year-ai*, life-book-ai*)은 별도 에이전트가 같은 수정을 하고 있다(2026-11-08). 공용 파일(paid-report-quality.js, llm-budget.js)은 최소·하위 호환으로만 고치고, git index.lock이 나면 다시 시도한다.

### 1-2 보정에서 얻은 교훈 (bbc894f3b·83dbf2e43·fc5b189ca, 자세한 수치는 `docs/verification/premium-llm-samples-2026-11-08.md` 재검증 절)
- 반려 사유와 걸린 구절을 처음부터 체크포인트에 기록한다(연애: `rejection.flagged`). 1차 샘플은 사유가 남지 않아 원인을 추정만 했다.
- 금지·위험 표현 검사에 `/g` 정규식을 `.test()`로 쓰지 않는다(`lastIndex`가 남아 판정이 들쭉날쭉하다).
- 프롬프트 guide에 금지 어간(예: 감시·압박·집착)을 넣지 않는다. 모델이 그 말을 부정문으로 그대로 써서 스캔이 반려한다. 위험 표현 스캔은 부정문("~하지 마세요")을 예외로 둔다.
- 반려는 표적 수리로 이어져야 한다(걸린 구절을 이름으로 짚어 다시 쓰게 한다). 마지막 시도는 걸린 문장만 덜어 내고 전달한다. 그룹·섹션을 빈 채로 두지 않는다.
- 조립 합계가 MIN 아래면 가장 짧은 부분을 횟수 제한을 두고 분량 수리한다(연애: 최대 2회). 그래도 모자라면 그대로 전달한다.
- 말투 drift와 질문 상황 되풀이는 프롬프트 규칙만으로 고쳐지지 않았다(재검증에서 오히려 늘었다). 검증기 이슈 + 표적 수리, 또는 후처리로 강제한다.
- 범위를 좁히면(예: "2~3개 달만") 분량이 줄어든다. 목표 분량과 분량 수리를 함께 맞춘다.
- 실호출 샘플은 수리 경로를 거의 밟지 않는다. 반려 수리·분량 수리·scrub은 행동 테스트로 지킨다.
- 3단계에서 찾은 기존 버그(d78175aac): 배열 첨자 근거 경로(`yearlyLuck[0].pillar`)가 정본 루트 검사에 반려됐다. 다른 상품의 근거 경로 검증기에도 같은 버그가 있는지 확인한다.

## 단계
- [x] 0. 준비: 워크트리를 만들고 설계 문서와 이 문서를 커밋했다.
- [x] 1. 연애 비책 (연이·서한비) + 공용 글자형 PDF 모듈 + 보관함 PDF
- [x] 2. 신년운세 (네오)
- [x] 3. 인생의 책 / 인생 총운 (윤달)
- [x] 4. 운명의 업
- [ ] 5. 마스터 인연의 서 (+궁합)
- [ ] 6. 초융합 운세
- [ ] 7. 자미두수 상담 / 심층 PDF (무성)
- [ ] 8. 숙요점 궁합 (서한비)
- [ ] 9. 점성술 (윤달)
- [ ] 10. 베다점 / 나크샤트라 2종 (윤달)
- [ ] 11. 팩폭 작전실 (네오)
- [ ] 12. 사주 맞춤 작명
- [ ] 13. 영냥이 참치·모둠·오마카세

## 후속 과제 (상품 단계 13 이후 진행, 사용자 요청 2026-11-08)
- [ ] F1. 홈·마케팅의 "6부 28개 섹션" 문구를 "7부 30장"으로 바꾼다. 검색 노출 문구다.
  - `index.html`
  - `public/*/index.html`
  - `lib/marketing/feature-marketing-copy.generated.json`
  - `docs/purchase-journey/inventory.json`
- [ ] F2. 연애 비책 상세 패널 webp 이미지에서 주제 번호가 2칸씩 밀려 있다. 연애 비책 상세 패널 이미지와 그 생성 매니페스트를 고친다.
- [ ] F3. 조판 PDF의 표지와 부 이름 문구를 로케일화한다. 지금은 한국어로 고정되어 있다.
  - `lib/pdf/export-consultation-book-pdf.ts`
  - 상품별 빌더: `app/love-secret-ai/result/love-secret-pdf-chapters.ts`, `app/new-year-ai-consultation/_lib/new-year-pdf-chapters.ts`, `app/life-book-ai/result/life-book-pdf-chapters.ts`
- [ ] F4. 연애 비책 요약 그룹 2장이 d864217f2부터 결과 화면에 그려지지 않는다. 그래서 화면 차례는 28장이고 PDF는 30장이다. 고칠 곳은 `app/love-secret-ai/result/` 결과 클라이언트의 그룹 분류(`groupLoveSections`)다.
- [ ] F5. 신년운세 `READING_STAGES`의 "재물과 직업" 라벨을 재물과 직업으로 나눈다. 고칠 파일은 `app/new-year-ai-consultation/NewYearAiClient.tsx`다.
- [ ] F6. 신년운세 진행 표시는 4,000자를 기준으로 하는데, 성향 장의 최소 분량은 2,800자다. 둘을 맞춘다.
  - `app/new-year-ai-consultation/NewYearAiClient.tsx`
  - `worker/routes/new-year-ai.js`
- [ ] F7. 보관함 PDF 버튼은 글꼴을 불러오지 못하면 캡처 방식으로 대체하지 않는다.
  - `app/records/view/SavedLovePdfButton.tsx`
  - `app/records/view/SavedNewYearPdfButton.tsx`
  - `app/records/view/SavedLifeBookPdfButton.tsx`
- [x] F8. 사용자 2026-11-08: 네오 사자 장군 표현 없애. 33a650891에서 처리했다(`worker/lib/expert-character-persona-text.js` NEO_NEW_YEAR, `neo-operation-room-prompt.js` 7곳 → "장군 네오"). 팩폭 작전실의 "사자 휘장" 배지 문구는 남아 있으니 11단계에서 검토한다.
- [~] F9. (일부 완료 `230b48341`: 인생 총운·인생의 책 V2 분량 이슈 비치명, 가장 짧은 장부터 수리 최대 2회. 실호출 인생 총운 31,145자 배달, d78175aac도 실호출로 확인. 남은 것은 F9b) 인생의 책·인생 총운 실호출 장 분량이 V2 목표보다 훨씬 짧다(인생의 책 장 1,351~2,439자, 목표 3,000~3,400·minChars 2,000 / 인생 총운 장 1,183~1,935자, 목표 3,200~3,500·minChars 2,400). 총량 MIN 20,000은 넘어 acceptUsableDrafts로 전달되었다. 프롬프트 분량 지시·목표·모델(gemini-2.5-flash)을 조정할지 정한다. `worker/routes/life-book-ai.js`
- [ ] F10. 인생 총운 1장 summary가 "이 장에서는 …짚어보며" 같은 메타 서술이다. 1장 summary를 공감 문장으로 열게 프롬프트를 다듬는다. `worker/routes/life-book-ai.js`
- [ ] F11. 인생의 책 뒤 장(5·6·8장)이 "~라고 하셨지요"로 질문을 다시 풀어 쓴다. 원문 인용은 1장 한 번뿐이라 게이트는 통과하지만, 재인용 금지 지시를 더 분명히 한다. 문장 단위 기계 삭제는 답 문장까지 지워 되돌렸다. `worker/routes/life-book-ai.js`
- [ ] F12. 인생의 책 결과 화면 360px 확인을 하지 않았다(dev 서버가 500을 내던 때). `app/life-book-ai/result/LifeBookAiResultClient.tsx`
- [ ] F13. 연애 비책 말투 drift: 재검증에서 5그룹에 합니다체가 섞였다. `hapnidaDrift` 교정 줄은 재시도 때만 붙는다. 검증기 이슈로 올리고 표적 수리를 한다. `worker/routes/love-secret-ai.js`
- [ ] F14. 연애 비책 상황 되풀이: "연락이 뜸" 32회, 20자 구절 3회 이상 반복 7→48. 검증기에서 그룹당 상황 문구 횟수 상한을 두고 수리하거나 후처리한다.
- [ ] F15. 연애 비책 전문어 밀도: 귀문관살·홍염 각 8회, 묘진해·진진형 각 7회. 풀어 쓰거나 1회만 쓰게 한다.
- [ ] F16. 부정문 예외의 빈틈: "반드시 …수밖에 없어요" 같은 단정이 부정형으로 보고 통과한다. 예외 범위를 좁힌다.
- [x] F17. (완료 `433430b83`: 신년 V2 섹션 분량 수리 최대 2회, 짧아도 배달. 실호출 27,350자 completed) 신년운세에는 분량 수리 경로가 없고, 재검증 합계는 MIN보다 약 1,900자 많을 뿐이다. 연애처럼 횟수 제한 분량 수리를 넣는다. `worker/routes/new-year-ai.js`
- [ ] F9b. 인생 총운 장 분량이 아직 2,100~2,700자로 목표 4,400자에 못 미친다. 모델이 일찍 멈춘다(finishReason STOP). 구조 변경이 필요하다(예: 장 하나를 요청 2개로 나눔). `worker/routes/life-book-ai.js`
- 참고: 연애 비책 V2 분량 상향 `dc6422d33`(그룹 6,000~7,500자, 15,000토큰). 검증 문서 「분량 넉넉·비치명화」 절은 `a7ff45b2c`.
- [ ] F18. d78175aac(인생 총운 전달 실패 버그, 운영에도 있음)를 운영에 먼저 내보낼지 사용자 결정을 기다린다. **push·배포하지 않는다.**

## 1단계 진행 메모 (완료, 결과는 아래 단계별 결과)
첫 에이전트가 조사 중 컨텍스트가 압축되어 결정만 적고 돌아왔다. 코드 파일은 아직 하나도 바꾸지 않았다. 아래 결정대로 바로 구현한다.

### 조사로 확인한 사실
- 운영에서는 handleStart가 항상 onCheckpoint를 넘기므로 요청 한 번에 그룹 하나(처음 실패한 그룹 또는 수리 대상)만 생성한다. 클라이언트는 202 `partial`이면 다시 요청한다. 그룹을 늘려도 그룹당 예산(12,500토큰 = tokensRequiredForChars(6500) 12,000 이상, 54초, 수리 24초, LLM 마감 86초)은 그대로다.
- `LOVE_SECRET_AI_MIN_USABLE_GROUPS = LOVE_SECRET_AI_GROUPS.length`이다. 이 값은 구성(plan)마다 따로 계산해야 한다.
- 라우트에서 `LOVE_SECRET_AI_GROUPS`를 쓰는 곳은 `generateFirstConsultation`(~875, 889, 895, 935)과 `publicSession`의 `retryable`(~1222)이다. 시드 `llmMeta.delivery`는 ~1585-1615에 있고, `existing`은 재시도 세션이다. `llmMeta`는 Mixed 타입이라 `llmMeta.delivery.groupPlanVersion`에 저장할 수 있다.
- 보관함(`worker/lib/record-library.js`의 `withoutSecrets`)은 `llmMeta`를 지운다. 그래서 보관함 연애 비책에는 `sections`와 `reading`이 없다. 남는 것은 `messages`이고, 첫 assistant 메시지 = `answer` = 섹션들을 `제목\n본문`으로 만들어 `\n\n`으로 이은 글이다(PARSE max에서 자른다). 보관함 PDF 빌더는 알려진 섹션 제목으로 answer를 다시 나눠야 한다.
- `buildLoveSecretGroupFacts`는 모르는 키를 core 빌더로 처리한다. 그래서 `nature`는 따로 수정하지 않아도 core 근거를 받는다.
- 새 제목 두 개는 기존 `groupLoveSections`·`HANBI_TITLE` 정규식 어디에도 걸리지 않고, 화자는 yeoni로 나온다.
- 갱신해야 할 테스트와 픽스처:
  - `__tests__/worker/love-secret-ai-prompt.gate.test.js` (187행이 LOVE_SPEAKER_BY_GROUP 객체 전체를 비교한다)
  - `__tests__/ui/love-secret-speaker.test.mjs`
  - `__tests__/ui/signature-detail-chapters.test.mjs` (상세 패널 장 목록을 그룹 섹션·라벨·화자와 비교한다)
  - `__tests__/worker/llm-json-output-schemas.test.js`
  - `__tests__/worker/paid-report-length-recovery.test.js`
  - `__tests__/ui/love-secret-paid-delivery.behavior.test.js`
  - `scripts/verify-love-secret-ai-flow.mjs` (불변식: groups×GROUP_MIN ≥ TARGET_MIN, 섹션 수 = SECTION_TITLES 수, 조립 글자 수 ≤ MAX)
  - `lib/dev-preview/fixtures/love-secret.ts`
  - `content/product-details/love-secret/panels.cjs`: 28장 → 30장으로 바꾼다. hook "28개 주제", chaptersLabel "…28장", notice 문구를 함께 고친다. 공개 상세 페이지라 SEO 영향을 보고에 적는다.
- 글자형 PDF는 `lib/pdf/export-ziwei-report-pdf.ts`를 바탕으로 만든다. 이 파일은 `registerPdfFontsSafely`가 null을 돌려주면 `PdfFontError`를 던지고, `createTypesetWriter`, `drawContentsPage`, `drawFooters`를 쓴다. 캡처 방식 대체의 선례는 `FusionFortuneClient.tsx` ~2757-2790이다(아직 읽지 않음).

### 결정
- **구성 버전**
  - 지금 6그룹은 글자 하나 바꾸지 않고 `LOVE_SECRET_AI_GROUPS_V1`(version 1)로 둔다.
  - 새 구성 `LOVE_SECRET_AI_GROUPS`(version 2)는 `[nature, core, self, partner, risk, timing, action]`이다.
  - 기존 섹션 제목과 필드는 모두 그대로 둔다. guide와 covered만 고치고, `perspective` 필드("이 장만 맡는 관점")를 새로 넣는다.
  - `loveSecretGroupsForPlan(version)`와 `LOVE_SECRET_AI_GROUP_PLAN_VERSION = 2`를 export한다. `STRUCTURED_SECTION_FIELDS`는 두 구성의 합집합으로 만든다.
- **nature 그룹**
  - 화자는 연이이고 필드는 두 개다.
    - `natureArchetype`: "타고난 연애 기질 — 당신이 사랑하는 방식의 원형"
    - `natureEmpathyScenes`: "그래서 이런 순간 마음이 먼저 움직여요"
  - 본문 순서는 근거(일간·월지·오행)를 쉬운 말로 → 일상 장면 2~3개 → 이번 상담 주제로 연결이다.
  - `LOVE_SPEAKER_BY_GROUP`에 `nature: "yeoni"`를 추가한다.
- **프롬프트 규칙**
  - 새 규칙 줄은 `group.perspective`가 있을 때만 넣는다. 그래야 V1 프롬프트가 글자 그대로 남는다.
  - 모든 V2 그룹에 넣는 줄:
    - 관점 한 줄
    - "결국 중요한 것은/다시 말해/앞서 말했듯" 금지
    - 같은 여는 말·맺는 말 반복 금지
  - core: 질문을 첫 문장에서 한 번 인용한다. 성향 총론은 core 첫 섹션 guide에서 nature로 옮긴다.
  - 나머지 V2 그룹: 질문을 다시 인용하지 않는다.
  - nature: 질문에 답하거나 인용하지 않고, 마지막에 주제로 연결한다.
  - 결과에 보이는 글에 "PDF"·"챕터"를 쓰지 않는다.
  - `buildAdminLabPrompt`의 "6개 그룹" 문구를 구성 길이에 맞춘다.
- **분량**
  - TARGET_MIN 35,000 / TARGET_MAX 45,500(7×5,000 / 7×6,500), MAX_TOTAL과 PARSE_TEXT_MAX는 52,000으로 한다. MIN 20,000과 그룹당 5,000~6,500은 그대로 둔다.
  - 설계는 "약 36,000"이지만 verify 불변식(groups×GROUP_MIN ≥ TARGET_MIN) 때문에 35,000으로 한다. 이 차이를 보고에 적는다.
- **라우트**
  - 시드 delivery에 `groupPlanVersion: existing ? (existing.llmMeta?.delivery?.groupPlanVersion || 1) : 2`를 넣는다.
  - `generateFirstConsultation`에 구성 그룹을 넘기고, MIN_USABLE은 구성 길이로 계산한다. `publicSession`의 retryable도 저장된 버전의 구성을 쓴다. 진행용 `totalGroups`를 내보낸다.
  - 조립 뒤에 섹션마다 `dropRepeatedReportSentences(body, 앞선 누적 텍스트)`를 적용한다. try/catch로 감싸고, 결과가 비면 원문을 쓴다. 그 뒤 answer와 totalChars를 다시 계산한다. 이 단계 때문에 전달이 실패하면 안 된다.
  - 클라이언트에 그룹 수 6이 박혀 있는지 grep으로 확인한다(아직 하지 않음).
- **결과 UI**
  - variant `nature`를 추가한다. flow 배치의 강조 카드이고, 표시 순서와 MATCH_ORDER에서 맨 앞이다. match는 `/타고난\s*연애\s*기질|이런\s*순간\s*마음/`이다.
  - `styles.cardNature`, `GROUP_ICON`, `VARIANT_CLASS`를 추가한다.
  - 장 머리에 번호, 화자 칩, kicker를 넣는다. 목차(TOC)에 화자를 표시한다. 360px에서 확인한다.
  - V2 순서의 제목 목록을 `love-secret-sections.ts`에 두고, 워커 제목과 같은지 테스트한다.
- **PDF**
  - `lib/pdf/export-consultation-book-pdf.ts`에 `typesetConsultationBook`과 `exportConsultationBookPdf`를 만든다. 입력은 `{title, productLabel, byline, coverArtSrc, coverTheme, chapters:[{kicker,title,body,speaker?}]}`이고, 글꼴 실패 시 PdfFontError를 던진다.
  - 호출하는 쪽은 PdfFontError를 잡아 `exportResultPdf` 캡처로 대체한다.
  - `app/love-secret-ai/result/love-secret-pdf-chapters.ts`에 `buildLoveSecretPdfChapters(consultation)`를 만든다. 섹션은 pdfSections 또는 sections에서 가져오고, 없으면 첫 assistant 메시지를 알려진 제목으로 나눈다. kicker는 그룹 라벨, speaker는 연이 또는 서한비다. 표지 byline은 "연이 · 서한비"다.
  - 결과 화면 버튼과 보관함(`app/records/view/SavedServiceReading.tsx`의 love 분기에 버튼 추가)이 같은 빌더를 쓴다.

## 2단계 진행 메모 (완료, 결과는 아래 단계별 결과)

### 조사로 확인한 사실
- 운영은 항상 onCheckpoint를 넘겨 `generateNewYearWave`로 요청마다 한 섹션을 만든다. 섹션 상한은 12,000토큰·52초, 전체 MIN 20,000·MAX 33,000자다. fallbackMinChars = minChars×0.3이다.
- 섹션 사이 중복 문장 제거(`dedupeCodexBody`)는 웨이브 안에 이미 있다.
- 질문 답변은 opening이 맡는다. `buildSectionPrompt`가 opening 답변을 다른 섹션에 "판단의 연속성"으로 주입하고, `validateFortuneDataConsistency`는 "질문에 대한 답변"이 없으면 QUESTION_ANSWER_SECTION_MISSING을 낸다.
- 보관함은 `withoutSecrets`가 llmMeta를 지우므로 저장 기록에는 messages(섹션을 빈 줄로 이은 조립본)만 남는다. 그래서 신년 PDF 빌더는 marker로 조립본을 되갈라야 한다.
- 페르소나 `NEO_NEW_YEAR_PERSONA_KO`에는 "사자 장군 '네오'"라는 문구가 있다. 사용자 메모(네오는 인간)와 어긋나지만 범위 밖이라 후속으로 넘긴다.
- FORBIDDEN_RESULT_PATTERNS가 "PDF"와 "챕터"를 막는다. 보이는 제목이나 지시에 이 단어를 쓰지 않는다.

### 결정
- 구성 V1(현 6섹션)은 바이트 그대로 둔다. 새 세션은 `llmMeta.sectionPlanVersion: 2`로 V2 7섹션을 쓴다: nature(성향·공감 전용, 질문 인용 없음), overview(질문 답변 + 총운, 질문은 여기서만 한 번 인용), money, career, romance, monthly, health.
- V2 섹션마다 perspective(이 장만 맡는 관점) 줄을 넣는다. 상투구는 금지하고, 여는 모양과 닫는 모양을 바꿔 쓰게 한다.
- `ownsQuestion(section)`은 `section.questionOwner ?? key==="opening"`이다. 이슈를 섹션으로 보낼 때는 결과 섹션의 categories와 questionOwner를 기준으로 한다.
- 클라이언트 DOMAIN_CARDS는 V1과 V2의 합집합으로 두고, 본문이 있는 카드만 그린다. 차례와 장 머리(번호·네오 칩·kicker)를 두고, 성향 장을 강조하고, monthly도 번호 장으로 둔다.
- PDF는 `_lib/new-year-pdf-chapters.ts`로 조판한다. 폰트가 실패(PdfFontError)할 때만 캡처로 대체한다. 보관함 'year' 분기에 SavedNewYearPdfButton을 붙인다.

### 진행
- 완료. 커밋과 검증은 아래 "2단계 신년운세" 결과에 있다.

## 3단계 진행 메모 (완료, 결과는 아래 단계별 결과)

### 조사로 확인한 사실
- 두 SKU(`life-book-ai-consultation`, `life-fortune-ai-consultation`)는 모두 `worker/routes/life-book-ai.js`에 있다.
  - 세션 하나는 15섹션이다: 장 10, 전문가 해설 4, frame 1.
  - 요청마다 한 섹션을 만든다. 섹션당 시간 상한은 45초, 시도는 2회다.
- 계획(`llmMeta.plan`)은 새 세션 seed(`!existing`)에서만 저장되고, 재개할 때는 저장된 plan을 쓴다.
  - 그래서 V2 프롬프트 줄을 V2에만 있는 필드(`section.perspective`)가 있을 때만 넣으면, 옛 세션 프롬프트는 바이트 그대로 유지된다.
  - 캐시 키에도 프롬프트가 들어가므로, 바뀐 V2 프롬프트가 옛 캐시에 걸리지 않는다.
- 품질 게이트는 다섯 가지를 본다: 장 10개, 인생 총운 장 제목, evidenceRefs, 총량 MIN·MAX, 장 사이 중복(20자 이상 같은 문장이 3개 이상).
  - total_content_too_long을 뺀 나머지 이슈가 하나라도 있으면 전달이 실패한다.
  - 그래서 조립 단계에서 중복 문장을 미리 지우면 전달 실패가 줄어든다.
- `scripts/verify-llm-generation-resilience.mjs`는 인생의 책 장 maxOutputTokens가 ceil(MAX_TOTAL/10)자 이상을 담는지 검사한다.
  - 지금 값 7000토큰은 4,666자를 담으므로, MAX_TOTAL은 46,660자까지 올릴 수 있다.
- 윤달 페르소나(`YUN_LIFE_BOOK_PERSONA_KO`)에는 책장·책갈피·다음 장 비유를 섹션마다 하나로 제한하는 규칙이 이미 있다. 페르소나는 손대지 않는다.
- 보관함 기록에는 최종 assistant 메시지(`JSON.stringify(finalReport)`)가 남는다. 보관함 PDF 빌더는 이 JSON을 파싱해서 쓴다.

### 결정
- 장 수는 SKU마다 10개를 유지한다. 품질 게이트가 장 10개와 장 제목을 고정해 두었기 때문이다.
- `buildSectionPlan(input, {version})`은 V1 객체를 그대로 두고, V2 객체에만 다음 필드를 더한다.
  - `planVersion: 2`
  - 장·전문가 해설마다 `perspective`
  - 1장에 `questionOwner`
  - 1장에 공감 장면 guide: 근거의 쉬운 뜻 → 생활 장면 공감 2~3개 → 이 책의 다음 장들과 연결
- V2 프롬프트에는 다음 줄을 넣는다.
  - 관점 줄
  - 상투구 금지
  - 여는 문장·맺는 문장을 섹션마다 바꿔 쓰기
  - 질문 규칙: 1장만 상담 주제를 한 번 인용한다. 나머지 장은 다시 인용하지 않고 자기 관점의 답만 더한다.
- V2 목표 분량은 다음과 같다.
  - 인생의 책: 장 3,000자, 1장 3,400자. `LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS`는 32,000에서 38,000으로 올린다.
  - 인생 총운: 장 3,200자, 1장 3,500자.
  - 장의 maxOutputTokens는 max(기존 값, tokensRequiredForChars(목표))로 정하고, 모두 10,000 이하다.
  - 전달 MIN은 그대로 둔다.
- V2 조립(`assembleReport`)에서는 `dropRepeatedReportSentences`로 장과 전문가 해설에서 앞에 나온 문장과 겹치는 문장을 누적해서 지운다.
  - 이 단계가 실패해도 전달을 막지 않는다: try/catch로 감싸고, 결과가 비면 원문을 쓴다.
- 결과 화면에 윤달 칩, 장 kicker(장 제목별 맵, 두 SKU 모두), 1장 강조를 더한다. 옛 세션 글은 그대로 보인다.
- PDF는 `app/life-book-ai/result/life-book-pdf-chapters.ts`로 조판한다.
  - 폰트가 실패(PdfFontError)할 때만 기존 캡처 방식으로 대체한다.
  - 보관함 'book' 분기에 `SavedLifeBookPdfButton`을 붙인다.

## 4단계 진행 메모 (완료, 결과는 아래 단계별 결과)

### 조사로 확인한 사실
- 상품 파일은 `worker/routes/karma-destiny-ai.js`(약 3,030줄)이다. 결과 화면은 `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`, 모델은 `app/karma-destiny-ai/result/_lib/report-model.ts`다.
- `REPORT_SCHEMA_VERSION = 2`. 이 값을 바꾸면 `handleGenerateBatch`가 다른 버전 문서에 409 `REPORT_SCHEMA_CHANGED`를 돌려준다. **올리지 않는다.** 구성 분기는 `llmMeta.chapterPlanVersion`으로 따로 둔다.
  - seed의 llmMeta는 `{...existing?.llmMeta, resumeBody, answerVoice}`이다. 새 세션만 `chapterPlanVersion: 2`를 받고, 옛 세션은 저장값이나 1을 쓴다.
- `PREMIUM_CHAPTERS`는 15장이다(chapter-01~15, minLength 1800, 목표 `PREMIUM_CHAPTER_TARGET_LENGTH = "2,250~2,500자"`, 14장은 1,000~1,200자). 14·13·15장은 id로 찾는다(KEY_SENTENCES·SYNTHESIS·FINAL_LETTER).
- `INITIAL_CONSULTATION_MIN_LENGTH = 30000`이지만 배치 경로는 `acceptUsableDrafts: true`이고 `lengthAcceptedIds`가 모든 id라 합계 분량으로 막지는 않는다. `CHAPTER_MAX_OUTPUT_TOKENS = 7000`.
- 장 수·순서에 기대는 곳: `buildBaseSystemPrompt`(`${PREMIUM_CHAPTERS.length}개 장`), `buildCoveredHint`, `validatePremiumReportQuality`(`PREMIUM_CHAPTERS[order-1]`), `buildGenerationProgress`(totalChapters), `parseKarmaConsultationSections`(`[order-1]`), `handleGenerateBatch` 대상 목록, 레거시 `generateChapterBatch`·`reinforcePremiumReport`. `LENS_USAGE_WEIGHTS`는 V1 그대로 둔다.
- `buildChapterPrompt`는 모든 장에 `현재 질문: ${userQuestion}`을 넣는다(질문 되풀이의 원인). 말투는 격식체(합니다체)이고 프롬프트 화자는 중립 "운명의 업 상담가"다(네오·서한비 없음).
- `FORBIDDEN_RESULT_PATTERN`에는 /g가 없다(문제없음).
- **전달 위험:** `handleGenerateBatch`(약 2714줄)에서 대상 장 중 `llmMeta.attempts[id] >= 2`가 있으면 REPORT_QUALITY_FAILED를 던져 generation_failed·환불로 간다. 또 후보 보고서가 `hasRepeatedReportPassage`이면 장을 조용히 저장하지 않아 결국 실패로 갈 수 있다.
- `karmaChapterReady(chapter, def, acceptShort)`: 본문, 분량(acceptShort가 아니면), takeaways 3개 이상, 반복 구절 없음, 금지 표현 없음, 일반론 경고 없음. 분량 조건이 2회 시도 뒤 실패로 이어지는지 꼭 확인한다(새 사용자 지시: 분량은 비치명).
- 완료 시 messages에 `## N장. 제목

본문

이번 장의 핵심
- ...` 형식 assistant 메시지를 저장한다. `publicSession`은 schemaVersion과 장(id, order, title, content, summary, keyTakeaways, highlightQuotes, symbol, leadLens, evidence, energyScore)을 내보낸다.
- 근거 경로는 서버 경로이고 배열 첨자가 없어 d78175aac 버그는 해당 없음(보고서에 적는다).
- 보관함 karma 분기는 `app/records/view/SavedServiceReading.tsx` 약 74줄(`normalizeReport` 사용). 'book' 분기의 `SavedLifeBookPdfButton` 패턴을 따른다. `REPORT_COVER_THEMES.karma`가 이미 있다(`lib/pdf/report-cover-theme.ts`).
- 결과 화면 `handleDownload`(약 1126줄)는 `exportResultPdf` 캡처(cover "karma")를 쓴다. 장 덱(약 1397~1484줄)에 `kdo-deck__toc`와 장 머리(상징·제목·렌즈 배지)가 있고 문구는 12개 로캘이다.
- 테스트: `__tests__/worker/karma-*`(wake-recovery, follow-up-recovery, paid-resume, relationship-input), `__tests__/ui/karma-paid-delivery.test.js`, `karma-relationship-analysis.test.js`. 스크립트 `scripts/verify-karma-destiny-ai-flow.mjs`, 픽스처 `lib/dev-preview/fixtures/karma-destiny.ts`.

### 결정
- V2 구성(`chapterPlanVersion: 2`, 새 세션만): 16장. 맨 앞에 새 장(id `chapter-00`, order 1, "타고난 기질과 마음의 결", 주 saju·보조 western/ziwei: 근거의 쉬운 뜻 → 공감 장면 2~3개 → 주제와 연결, 질문 인용 없음)을 두고, 기존 15장은 id·렌즈를 그대로 두고 order만 +1.
  - 장마다 `perspective` 한 줄. chapter-01이 `questionOwner`로 질문을 한 번만 인용해 바로 답한다. chapter-02 notCovered에 "일상 기질 장면(1장 담당)"을 더한다.
  - V2 전용 프롬프트 줄은 `definition.perspective`가 있을 때만 넣어 V1 프롬프트를 바이트 그대로 지킨다(관점, 상투구 금지, 여는·맺는 문장 다양화, 질문 재인용 금지 — 비소유 장에는 질문을 "이미 답한 배경"으로만 준다).
- `karmaChaptersForPlan(version)` 도우미로 위 장 수 의존 지점을 구성별로 바꾸고 order 첨자 대신 id로 찾는다. publicSession에 `chapterPlanVersion`을 내보낸다.
- **넉넉한 분량(새 지시):** V2 목표를 장 2,700~3,000자, 1장(기질) 3,000~3,300자, 14장 1,300~1,500자 정도로 올리고 prompt 최소를 MIN보다 충분히 높게 둔다. maxOutputTokens = max(7000, tokensRequiredForChars(목표 상한×1.2)), 시간 상한 안인지 확인. MIN(1800·30000)은 올리지 않는다.
- V2 검증기 연성 이슈: `QUESTION_REQUOTED`(비소유 장에서 질문과 5~6자 n-gram을 공유하는 문장이 상한 초과), `REGISTER_DRIFT`(종결 6개 이상 중 해요체 0.4 초과). 1차 시도는 표적 수리, 2차 이상은 상한 2를 넘는 문장만 덜어 내고(길이 85% 이상 유지) 수용. 저장 비교는 연성 이슈가 적은 쪽을 우선.
- **마지막 시도 scrub:** attempts ≥ 2에서 던지지 않고 금지 표현 정리, 일반론 문장 제거, 다른 장과 중복 제거, normalizeChapter로 takeaways 채움 → 저장. 분량 부족은 어떤 경우에도 치명이 아니다(acceptShort).
- **분량 수리(V2):** 모든 장이 준비된 뒤 합계 < 30,000이면 비율이 가장 짧은 장을 최대 2회 다시 만들고 길어질 때만 채택. 그래도 모자라면 그대로 전달.
- 조립 중복 제거: delivery_pending 전에 `dropRepeatedReportSentences` 누적 적용, try/catch, 비면 원문.
- 화자(화면 전용, 프롬프트 화자는 중립 격식체 유지): 서한비 chapter-05·06, 네오·서한비 공동 chapter-01·12·13·14·15, 나머지(기질 장 포함) 네오.
- 화면: 목차(번호·제목·화자), 장 머리 칩과 kicker, 기질 카드 강조. 조판 PDF `app/karma-destiny-ai/result/karma-pdf-chapters.ts`(`buildKarmaPdfChapters`, chapters가 없으면 assistant 메시지를 `## N장.` 머리로 나눠 대체), byline "네오 · 서한비", coverTheme 'karma', PdfFontError일 때만 캡처 대체. 보관함 karma 분기에 `app/records/view/SavedKarmaPdfButton.tsx`.
- 테스트 먼저: `__tests__/worker/karma-chapter-plan-v2.test.js`(V1 프롬프트 바이트 동일, V2 16장·질문 소유, 연성 이슈, scrub, 짧지만 유효한 출력이 completed에 도달, 분량 수리 상한), 빌더·버튼 UI 테스트.

## 5단계 진행 메모 (조사 완료, 설계·TDD부터)

### 조사로 확인한 사실
- 한 라우트에 두 상품이 있다: `worker/routes/master-love-codex.js`(약 1,729줄)의 `MODES`에 solo(`master-love-codex`, cacheKeyExtra "master-love-codex-v2-natal-v2")와 compat(`master-love-codex-compat`, "master-love-codex-compat-v1-natal-v2")가 있다. featureKey가 다르니 **실호출 샘플은 2회**(solo 1, compat 1).
- 프롬프트: `worker/lib/master-love-codex-prompt.mjs`(`MASTER_LOVE_CODEX_CHAPTERS` 20장, minChars 2,400~2,800, 장마다 scope·avoid, 18장 love-dna는 jsonMode, 19장 three-years, 20장 letter, META totalCharTarget 50,000·minTotalChars 46,000). `buildMasterLoveCodexSystemGuide`는 compat와 공유한다. compat는 `worker/lib/master-love-codex-compat-prompt.mjs`(약 629줄, 아직 자세히 읽지 않음).
  - 1장 "gate"(제1장 · 운명의 문 — 당신이라는 사람, minChars 2,600)가 이미 기질 개관이다. **장 제목에 "제N장"이 박혀 있어** 장을 앞에 더하면 V2는 새 제목 문자열이 필요하다(V1 객체는 건드리지 않는다).
  - 화자는 "연애 고수" 존댓말, 해요/합니다가 정해져 있지 않다. REGISTER_DRIFT는 karma식 "해요 비율 > 0.4"가 아니라 **한 장 안의 혼용**(해요·합니다 둘 다 30% 이상 등)으로 바꿔 판단해야 한다.
- 세션 구성: `startCodexSession`(약 1,112줄)이 `deliveryMeta.manifest = {mode, chapterIds, version}`을 `$setOnInsert`로 한 번 넣고 `expectedChapters(doc)`가 manifest id를 현재 장 표에 대응시킨다. V2는 새 세션에만 `deliveryMeta.chapterPlanVersion: 2`를 넣고, 없으면 V1. 캐시 키는 프롬프트 전체 해시라 V1 바이트를 지키면 옛 캐시도 그대로다.
- 생성: 요청 1회당 한 물결(`CHAPTER_BATCH_SIZE = PAID_LLM_PARTS_PER_REQUEST`), `CHAPTER_TIMEOUT_MS = 45000`, `BATCH_BUDGET_MS = EDGE_RESPONSE_DEADLINE_MS - 22000`, `CHAPTER_ATTEMPT_LIMIT = 2`, 잠금 TTL 120초, 클라이언트는 202 폴링.
- 분량은 이미 비치명에 가깝다: `assertCodexChapterQuality(..., {allowShort:true})`, floor 0.7×min, repair floor = min, deduped floor 0.5×min, `lengthDraft` 저장 후 길이 수리 1회(`attempts[id:lengthRepair]`), 완료 시 `lengthPolicy: "bounded-repair-v1"`. 토큰 = max(8000, tokensRequiredForChars(min+900+상담분)), 상한 14,000/24,000(`worker/lib/master-love-codex-quality.js`).
- **남은 전달 위험(분량 외):** 2회 시도를 다 쓰면 generation_failed·환불로 가는 경로 — LLM_EVIDENCE_INCOMPLETE, LLM_OUTPUT_INCOMPLETE, LLM_QUESTION_INCOMPLETE, LLM_TIMING_INCOMPLETE, LLM_DNA_INCOMPLETE, LLM_OUTPUT_REPEATED(`assertCodexEvidence`가 40자 이상 같은 문장 3회에서 던짐), LLM_JSON_INVALID, 물결의 `hasRepeatedReportPassage`(장을 저장하지 않고 실패 수 증가). 최종 조립에서 중복 제거 뒤 본문이 비면 `byId.delete`로 장을 빼서 다시 생성으로 보낸다. → 마지막 시도 scrub·장 빠짐 금지의 대상.
- 질문: `worker/lib/master-love-codex-consultation.js`의 `buildCodexConsultation`이 질문 최대 3개를 `questionOrder`로 장에 배정(결혼 16, 재회 15, 짝사랑·연락 9 또는 15, 그 밖 10, compat 13). 19장에 `forecast.periodReadings`(12개월+3년). 답은 구조화된 `questionAnswers`. `normalizeChapterContent`는 질문·상황 원문을 담은 insight·keySentence·actions를 비운다.
- 근거: id는 `${subject}.${system}.${path}`(예 `yearlyLuck.2026`, `palaces.부부궁`, `monthlyLuck.2026-11`, `majorLuck`). `findCodexRecord`(`worker/lib/master-love-codex-evidence.js`)는 id 또는 path 완전 일치만 본다. 루트 정본 검사가 없어 **d78175aac 버그 자체는 해당 없음**. 다만 모델이 하위 경로·배열 첨자(`self.saju.yearlyLuck.2026.pillar`, `majorLuck[0]`)를 쓰면 조용히 버려지고 그 체계 인용이 0이면 LLM_EVIDENCE_INCOMPLETE로 간다 → 끝의 `[n]`·`.segment`를 하나씩 떼며 찾는 대체 조회를 넣고 테스트한다.
- 화면: `app/master-love-codex/result/MasterLoveCodexResultClient.tsx`, `src/features/master-love-codex/components/CodexReader.tsx`(5막×4장 연속 스크롤, `exportResultPdf` 캡처 `#master-love-codex-document [data-codex-pdf-page]`, sealed일 때만 PDF, `isExporting`으로 애니메이션 정지), `CodexChapter.tsx`(`stripChapterPrefix`), `CodexSpine`(막·장 목차), `data/acts.ts`(`groupByAct`·`mergeCodexOutline`, 5막×4장 가정 — V2 장 수가 바뀌면 막 묶음 확인 필수), 문구 `_lib/copy.ts`.
- 보관함: `app/records/view/StoredReading.tsx` 약 63줄 `source === 'codex'`가 `<CodexReader ... completed/>`를 그린다. 리더 안 PDF 버튼이 보관함에도 이미 보이지만 캡처 방식이다 → 조판 PDF로 바꾸면 보관함도 함께 해결.
- 테스트: `__tests__/worker/master-love-codex-*`(consultation, evidence, paid-bootstrap, paid-delivery, pass-refund, quality, recovery-task, recovery, repair-plan), `__tests__/ui/master-love-codex-*`(content-i18n.static, outline-render, progress-gauge, purchase-recovery, reader-navigation, resume-on-result). 스크립트 `scripts/verify-master-love-codex-reader.mjs`, `verify-master-love-codex-sharing.mjs`, `verify-llm-generation-resilience.mjs`.

### 결정 초안 (구현 전에 compat 프롬프트·acts.ts를 읽고 확정)
- V2(`deliveryMeta.chapterPlanVersion: 2`, 새 세션만): 장 수를 바꾸지 않는 쪽을 우선 검토한다 — 1장 "gate"를 V2에서 "기질 근거의 쉬운 뜻 → 공감 장면 2~3개 → 연애와 연결"로 재범위화(perspective)하고 2장 temperament와 겹치지 않게 avoid를 더한다. 20장·5막×4장 구조, manifest id, acts.ts, 공유 링크가 그대로라 위험이 가장 낮다. 장을 더해야 하면 V2 전용 제목·막 표를 따로 둔다.
- 장마다 `perspective` 한 줄, 상투구 금지, 여는·맺는 문장 다양화, 질문은 `questionOrder` 소유 장에서만 한 번 인용. V2 전용 줄은 `chapter.perspective`가 있을 때만 넣어 V1 바이트 동일.
- 넉넉한 분량: V2 본문 목표를 min+800~min+1,200 정도로 올리고 토큰은 목표 상한×1.2 기준, 45초 시간 상한 안인지 샘플로 확인. MIN은 올리지 않는다.
- 연성 이슈 QUESTION_REQUOTED(비소유 장, 질문 6자 n-gram 3개 이상 공유 문장)·REGISTER_DRIFT(혼용 판정), 1차는 힌트 수리, 마지막 시도는 문장 덜어 내기(85% 유지) 후 수용, `attempts[id:scrubbed]` 표시.
- 마지막 시도 scrub: 위 분량 외 오류 코드를 마지막 시도에서는 던지지 않고 정리 후 저장(근거 누락은 결정적 근거 요약으로 보충, 반복 문장은 `dropRepeatedReportSentences`, JSON 실패는 본문 텍스트 회수). 조립 단계 `byId.delete` 대신 원문 유지. 분량 수리는 최대 2회.
- 근거 하위 경로 대체 조회(위). 화면: 목차 번호·제목·화자, 장 머리 칩·kicker, 1장 강조, 360px 확인. 조판 PDF `src/features/master-love-codex/_lib/codex-pdf-chapters.ts`(`buildMasterLoveCodexPdfChapters`)를 리더에서 쓰고(결과·보관함 공통) PdfFontError일 때만 캡처 대체.
- 테스트 먼저: `__tests__/worker/master-love-codex-chapter-plan-v2.test.js`(V1 바이트 동일 solo·compat, V2 구성, 연성 이슈, 마지막 시도 scrub로 completed, 장 빠짐 없음, 분량 수리 상한, 근거 하위 경로 대체).
- 실호출: 스크래치 `karma-live\` 하네스를 복사해 solo·compat 각 1회, DB·결제·배포 없음.

## 단계별 결과
(단계를 마칠 때마다 커밋 SHA, 바꾼 파일, 검증 결과, 남은 일을 여기에 적는다.)

### 1단계 연애 비책 — 완료 (2026-11-08)
- 커밋(이 순서)
  - `d593cb405`: V2 7그룹 계획(nature 맨 앞), `groupPlanVersion` 분기(옛 세션은 V1, V1 프롬프트는 바이트 그대로), 반복 문장 제거(실패해도 전달), 분량 35,000~45,500, `totalGroups`
  - `0fa74bb9f`: 결과 섹션 표에 nature 장, 장 메타(`LOVE_SECRET_CHAPTER_GROUPS`, `loveChapterKicker`), 저장 본문 재분할(`splitLoveSecretAnswerByTitles`)
  - `a3f93759e`: 상세 패널 28장→30장(타고난 연애 기질 2장 앞에), 매니페스트·생성 JSON 동기화
  - `21ea0cb08`: 결과 화면 장 번호·키커·화자 차례(접이식), nature 카드, 진행률 분모 `totalGroups`, 미리보기 픽스처 30장. 결과 PDF 버튼 전환 코드도 이 커밋에 들어감
  - `d1beebbbf`: `lib/pdf/export-consultation-book-pdf.ts`(공용 조판), `buildLoveSecretPdfChapters`, 결과 PDF는 조판·PdfFontError 때만 캡처, 보관함 연애 비책 PDF 버튼(`app/records/view/SavedLovePdfButton.tsx`)
  - `30f533f41`: 생성 중 안내 12개 로케일과 마스터 소개의 "여섯"→"일곱"
  - `1b0e5d35a`: 차례에서 덱 장 이동 수정(한 장씩 보기에서 숨은 쪽으로 스크롤이 안 되던 문제)
- 검증(실제 출력)
  - `node --test` speaker·pdf-chapters·signature-detail: 19/19. love-secret paid-delivery·wake-recovery·records-locale: 46/46. records-reading-content 6/6. mobile-pricing-source·fusion static 25/25
  - jest worker: love-secret-ai-prompt.gate, love-secret-native-contract, paid-report-length(-recovery) 4 suites 52/52
  - `node scripts/verify-love-secret-ai-flow.mjs`: groups=7 sections=30 body chars=27969 PASS. verify-paid-gate-ui-regression PASS, verify-fusion-fortune-pdf PASS
  - `npx tsc --noEmit -p .`: exit 0. 바꾼 파일 eslint: 오류 0(경고는 기존 것)
  - `npm run build`: exit 0(1894/1894). 함정 두 가지: ① 메인 저장소의 dev 서버를 가드가 잡는다. 이 워크트리 `.next`와 무관하므로 `ALLOW_DEV_SERVER_DURING_BUILD=1`. ② 그날 운세 데이터가 없으면 `/fortune/today/*` 정적 생성에서 멈춘다. 먼저 `npm run fortune:build-data`. 빌드가 sitemap 파일들을 바꾸므로 끝나면 `git checkout --`로 되돌린다
  - 조판 PDF: malgun 글꼴로 30장을 렌더해 63쪽, 차례 2쪽, 1장이 4쪽(구조만 확인, 이미지 렌더 도구 없음)
  - 360px(`next dev -p 3917`, `?preview=success`): 가로 넘침 없음(scrollWidth 360), 차례 28항목·화자 표시, nature 카드 첫 장, 흐름 장·덱 장 이동 확인
- 남은 일·후속
  - 실제 LLM 샘플 1회(연애 비책)는 사용자 승인을 받아야 한다. 아직 하지 않았다
  - 분량 하한: 설계는 "약 36,000"이지만 verify 불변식(7×5,000)에 맞춰 35,000
  - 결과 화면에서 요약 그룹 2장(현재 관계의 자리…, 핵심 연애운 —)은 원래 히어로가 대신해 그려지지 않는다(d864217f2부터, 이번 범위 밖). 그래서 화면 차례는 28항목, PDF는 30장 전부
  - 상세 패널 이미지(webp)의 주제 번호가 2씩 밀림. 마케팅 문구 "6부 28개 섹션"/"여섯 부를 스물여덟 개 섹션"이 `index.html`·`public/*/index.html`·`lib/marketing/feature-marketing-copy.generated.json`·`docs/purchase-journey/inventory.json`에 남아 있음
  - 상세 패널 30장 변경은 검색엔진에 보이는 변경이다
  - 공용 조판 모듈의 표지·키커 문구(productLabel, 부 이름)는 한국어 고정이다. 다른 로케일 PDF는 화자 이름만 바뀐다

### 2단계 신년운세 — 완료 (2026-11-08)
- 커밋(이 순서)
  - `3a31d972e`: 조사·설계 진행 메모
  - `6f0b78593`: 워커 V2 7섹션(nature 성향 전용 → overview 질문 답변+총운 → money → career → romance → monthly → health). 새 세션은 `llmMeta.sectionPlanVersion: 2`, 버전 없는 세션은 V1(프롬프트 바이트 그대로, 기준선 cmp로 확인). 섹션별 perspective 줄, `ownsQuestion`, 섹션당 12,000토큰, V2 섹션 maxChars ≤5,500, V2 전체 MAX 40,000(MIN 20,000 그대로), 시스템 프롬프트 분량 34,000~38,000자. 클라이언트 `answer-sections.ts`: DOMAIN_CARDS를 V1∪V2(kicker 포함), V2 마커가 있으면 옛 분류 매핑 끔, 서버 카드 본문의 질문 답변 제거, `MONTHLY_CHAPTER`, `READING_STEP_KEYS`
  - `4e50c20e3`: 결과 화면 차례(`nyai-toc`)·번호 장·kicker·네오 칩·성향 장 강조, 열두 달 흐름도 번호 장(건강 앞). `_lib/new-year-pdf-chapters.ts`(`buildNewYearPdfChapters`)로 공용 조판 PDF, PdfFontError 때만 캡처. 보관함 'year' 분기에 `app/records/view/SavedNewYearPdfButton.tsx`
- 검증(실제 출력)
  - `node --test`: new-year-paid-delivery 53/53, new-year-question-answer 7/7, new-year-pdf-chapters 3/3, new-year-saved-result-load 3/3, new-year-ai-wake-recovery 1/1, saju-authority-new-year 6/6, signature-detail-chapters 10/10, records-locale 5/5, records-reading-content 6/6, love-secret-pdf-chapters 3/3, ziwei-result-disclosure 6/6
  - jest `__tests__/worker/new-year`: 4 suites 32/32(새 `new-year-section-plan-v2.test.js` 10개 포함)
  - `node scripts/verify-new-year-ai-flow.mjs`: ok
  - `npx tsc --noEmit`: exit 0(마지막 커밋 4e50c20e3 뒤 다시 실행)
  - `npm run build`: exit 0(✓ Compiled successfully in 3.6min, Generating static pages 1894/1894). 함정: 1단계가 이 워크트리에 띄운 `next dev -p 3917`(PID 22212, 10:55부터)이 같은 `.next`에 개발 캐시를 써서, 이 워크트리의 `next build`가 "Creating an optimized production build" 전에 CPU 0으로 멈췄다(두 번). 종료 권한이 거부되어 같은 커밋의 임시 워크트리(`../ny-build-tmp`, node_modules 정션)에서 빌드하고 `npm run worktree:remove -- ../ny-build-tmp --force`로 지웠다. 다음 단계도 그 dev 서버가 살아 있으면 같은 방법을 쓰거나 사용자에게 종료를 부탁한다(그 dev 서버는 지금 500을 낸다)
  - 360px 화면 확인은 하지 않았다(차례 그리드는 `minmax(0,1fr)`·`overflow-wrap:anywhere`). 미리보기 픽스처 `lib/dev-preview/fixtures/new-year.ts`는 V1 본문이다
- 남은 일·후속
  - 실제 LLM 샘플 1회(신년운세 V2)는 사용자 승인을 받아야 한다. 아직 하지 않았다
  - 페르소나 `NEO_NEW_YEAR_PERSONA_KO`의 "사자 장군 '네오'"는 사용자 메모(네오는 인간)와 어긋난다
  - 생성 중 시간 기반 단계 라벨(`READING_STAGES`)에 아직 "재물과 직업"이 남아 있다(작음)
  - 진행 카운터 문턱 `>=4000`과 nature `minChars` 2,800이 맞지 않는다(작음)
  - 보관함 PDF 버튼은 글꼴 실패 때 캡처 대체가 없다(연애 비책과 같음)
  - 가정: 차례·번호 장·열두 달 장 배치는 옛(V1) 세션에도 적용된다. 본문 글자는 바뀌지 않는다
  - SEO·상세 문구는 바꾸지 않았다(signature-detail-chapters 통과)
  - ziwei-result-disclosure의 보존 해시 허용 목록에 `DomainConsultationCards`를 넣었다(의도한 표현 변경)

### 3단계 인생의 책 / 인생 총운 — 완료 (2026-11-08)
- 커밋(이 순서)
  - `ec9ddff77`: 조사·설계 진행 메모
  - `423424e4f`: 워커 V2 계획(`planVersion: 2`, 장·판독별 perspective, 1장 questionOwner·공감 장면 guide), V2 프롬프트 줄(관점·상투구 금지·여닫는 문장 바꾸기·질문 1장 1회 인용), 목표 분량 인생의 책 3,000/1장 3,400·인생 총운 3,200/1장 3,500, MAX_TOTAL 38,000(MIN 그대로), V2 조립의 반복 문장 제거(실패해도 전달). 옛 세션은 저장된 V1 plan이라 프롬프트 바이트 그대로
  - `429c9ca41`: 승인 원문·후속 과제 F1~F8(문서)
  - `96282eecc`: 결과 화면 윤달 칩·장 kicker(두 SKU 장 제목 맵)·1장 강조, `app/life-book-ai/result/life-book-pdf-chapters.ts`(`buildLifeBookPdfChapters`)로 공용 조판 PDF(PdfFontError 때만 캡처), 보관함 'book' 분기에 `app/records/view/SavedLifeBookPdfButton.tsx`
  - `d78175aac`: 실측 수정. 근거 경로 `yearlyLuck[0].pillar`처럼 배열 첨자가 붙으면 루트를 `yearlyLuck[0]`로 읽어 정본 루트 검사에 떨어지던 기존 버그(V2 이전부터)를 고쳤다. PDF 빌더가 `### 소제목` 줄도 ● 소제목으로 바꾼다
- 검증(실제 출력)
  - jest `__tests__/worker/life-book-ai.sections.test.js`: 32/32
  - `node --test` life-book-pdf-chapters 4/4. 앞서 life-book UI·paid-delivery·wake-recovery 묶음 64/64, paid-llm-sequential 6/6, node UI 묶음 102/102
  - `node scripts/verify-life-book-ai-flow.mjs`: PASS. `scripts/verify-llm-generation-resilience.mjs`: exit 0. verify-ai-locale-pipeline ok
  - `npx tsc --noEmit`: exit 0(d78175aac 뒤 다시 실행). 바꾼 파일 eslint 오류 0
  - `npm run build`: exit 0(✓ Compiled successfully in 4.1min, Generating static pages 1894/1894). 같은 시각 3917 dev 서버가 살아 있어 96282eecc의 임시 워크트리(`../lb-build-tmp`)에서 빌드하고 `npm run worktree:remove -- ../lb-build-tmp --force`로 지웠다. d78175aac(워커 근거 루트 한 줄·PDF 빌더 정규식)는 그 뒤 커밋이라 빌드에 들어 있지 않다. tsc는 d78175aac 뒤 exit 0
- 실호출 샘플(사용자 승인 2026-11-08 "llm 샘플 생성 허가한다", 상품마다 1회, gemini-2.5-flash, plan V2). 저장소 밖 스크래치 하네스로 handleStart 파도 루프를 그대로 돌렸다(DB·캐시 없음)
  - 인생의 책: status completed, 15요청·137초, 총 22,449자(MIN 20,000), hasRepeatedReportPassage false. 1장은 성향("타인과 관계 맺으며 성장하는 기질")→공감 장면→己토 일간·겁재 순으로 열린다. 질문 원문은 1장에서 따옴표로 1회 인용
  - 인생 총운: 실호출은 **failed**(chapter_9_evidence_refs_missing, chapter_9_content_too_short, expert_reading_4_evidence_refs_missing). 18요청·176초. 원인은 위 배열 첨자 근거 경로 버그. d78175aac 뒤 같은 출력을 오프라인 재조립·게이트에 넣으면 issues [], 총 22,932자, 반복 false, 9장 valid. 승인 범위(1회)라 두 번째 실호출은 하지 않았다. 질문 원문 인용은 1장 1회
  - 두 SKU 모두 장 분량이 목표보다 짧다(F9)
- 남은 일·후속: F9~F12. 보관함 PDF 라벨 한국어 고정·글꼴 실패 캡처 없음은 F3·F7과 같다. SEO에 보이는 문구는 바꾸지 않았다

### 4단계 운명의 업 — 완료 (2026-11-08)
- 커밋
  - `7985b5539`: 워커 V2 구성(`llmMeta.chapterPlanVersion: 2`, 새 세션만. REPORT_SCHEMA_VERSION 2 그대로), 16장(chapter-00 기질 장 맨 앞, 기존 id 유지·order +1), chapter-01만 questionOwner, V2 프롬프트 줄은 `definition.perspective`가 있을 때만 들어가 V1 프롬프트 바이트 동일(스크래치 덤프 SAME_AS_BASELINE true, 17항목). 연성 이슈 `REGISTER_DRIFT`·`QUESTION_REQUOTED`, 마지막 시도 scrub(던지지 않음), 반복 장도 조용히 버리지 않고 중복 제거 후 저장, 분량은 비치명. 합계 < 30,000이면 가장 짧은 장 최대 2회 분량 수리(길어질 때만 채택), 조립 중복 제거. 실패는 본문이 아예 없을 때 3회 뒤에만(REPORT_QUALITY_FAILED)
  - `1876adb45`: 결과 화면 목차 kicker·장 머리 부 이름·화자 칩(네오/서한비, 12로캘 이름), chapter-00 강조 카드, `app/karma-destiny-ai/result/karma-pdf-chapters.ts`(`buildKarmaPdfChapters`)로 조판 PDF(V2·ko만, PdfFontError일 때만 캡처 대체), 보관함 karma 분기에 `app/records/view/SavedKarmaPdfButton.tsx`
- 테스트
  - 새 `__tests__/worker/karma-chapter-plan-v2.test.js` 8개(구성·질문 소유·V1 불변·연성 이슈·scrub 배달·반복 장 유지·짧은 보고서 분량 수리 2회 뒤 24,418자 배달·V1 문서 15장). `karma-paid-delivery.test.js` V2로 갱신(+짧아도 완료 34호출·환불 없음, 텍스트 없음 202·202·503)
  - karma jest 전체 257/257, UI karma·follow-up·security 92/92, node PDF 장 11/11(새 `__tests__/ui/karma-pdf-chapters.test.mjs` 4개), records-locale 5/5
  - `scripts/verify-karma-destiny-ai-flow.mjs` ok, `scripts/verify-llm-generation-resilience.mjs` ok(1305 checks), `npx tsc --noEmit` exit 0, eslint 기존 `<img>` 경고만
  - `npm run build`: exit 0(✓ Compiled successfully in 3.7min, Generating static pages 1894/1894). 다른 에이전트 미커밋 파일을 피해 `1876adb45` 임시 워크트리(`../karma-build-tmp`)에서 빌드하고 `npm run worktree:remove -- ../karma-build-tmp --force`로 지웠다
- 실호출 샘플(승인 2026-11-08 "llm 샘플 생성 허가한다", 1회, gemini, plan V2). 스크래치 하네스 `scratchpad\karma-live\`(로더 훅으로 db·auth·models·billing·결제 증빙만 메모리 대역, 실제 handleStart → generate-batch 루프, DB·결제·배포 없음)
  - status **completed**, 요청 20(start 1 + batch 19, 마지막 200), 제공자 호출 38, 261초, 16장, 총 39,547자(MIN 30,000), hasRepeatedReportPassage false, 금지 표현 없음
  - 장 분량 1,368(14장)~3,387자. chapter-00 2,014자로 V2 목표 3,000~3,300보다 짧다. 합계가 30,000을 넘어 분량 수리는 돌지 않았다
  - 질문 원문 전체 인용은 0장. chapter-01(화면 2장)만 "'요즘 같은 실수를 반복하는 것 같다'고 느끼시는…"으로 질문을 한 번 받아 바로 답한다. 다른 장은 질문 문구 재사용 0
  - 말투는 전 장 합니다체(해요 종결 장당 0~2), REGISTER_DRIFT 없음
  - chapter-11은 3회 시도(빈 응답 1회 포함) 뒤 저장, chapter-10은 2회. 실패·환불 없음
  - 하네스 한계: 스위스 천문력 파일을 요청 출처(mock.test)로 받으려다 막혀 내장 계산으로 대체되었다. 운영에서는 사이트 출처로 받는다
- 남은 위험·후속
  - 조판 PDF에는 캡처 PDF에 있던 차트·레이더·요약 페이지가 없다. 결과 화면 비ko 로캘과 V1 세션은 기존 캡처 PDF 그대로
  - 장 분량이 V2 목표보다 짧은 경향(F9와 같은 모양). 합계는 넉넉해 배달에는 영향 없음
  - 360px 화면 확인은 하지 않았다(dev 서버를 띄우지 않음)
  - d78175aac(배열 첨자 근거 경로)는 karma 근거 경로가 첨자를 쓰지 않아 해당 없음
