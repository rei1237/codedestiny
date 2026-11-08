---
status: in-progress
updated: 2026-11-08
next: 4단계 운명의 업 — 1~3단계 패턴(구성 버전 분기·장 관점·1장 공감·질문 1회 인용·공용 조판 PDF·보관함 PDF)을 적용하고 실호출 샘플 1회
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

## 단계
- [x] 0. 준비: 워크트리를 만들고 설계 문서와 이 문서를 커밋했다.
- [x] 1. 연애 비책 (연이·서한비) + 공용 글자형 PDF 모듈 + 보관함 PDF
- [x] 2. 신년운세 (네오)
- [x] 3. 인생의 책 / 인생 총운 (윤달)
- [ ] 4. 운명의 업
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
- [ ] F9. 인생의 책·인생 총운 실호출 장 분량이 V2 목표보다 훨씬 짧다(인생의 책 장 1,351~2,439자, 목표 3,000~3,400·minChars 2,000 / 인생 총운 장 1,183~1,935자, 목표 3,200~3,500·minChars 2,400). 총량 MIN 20,000은 넘어 acceptUsableDrafts로 전달되었다. 프롬프트 분량 지시·목표·모델(gemini-2.5-flash)을 조정할지 정한다. `worker/routes/life-book-ai.js`
- [ ] F10. 인생 총운 1장 summary가 "이 장에서는 …짚어보며" 같은 메타 서술이다. 1장 summary를 공감 문장으로 열게 프롬프트를 다듬는다. `worker/routes/life-book-ai.js`
- [ ] F11. 인생의 책 뒤 장(5·6·8장)이 "~라고 하셨지요"로 질문을 다시 풀어 쓴다. 원문 인용은 1장 한 번뿐이라 게이트는 통과하지만, 재인용 금지 지시를 더 분명히 한다. 문장 단위 기계 삭제는 답 문장까지 지워 되돌렸다. `worker/routes/life-book-ai.js`
- [ ] F12. 인생의 책 결과 화면 360px 확인을 하지 않았다(dev 서버가 500을 내던 때). `app/life-book-ai/result/LifeBookAiResultClient.tsx`

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
