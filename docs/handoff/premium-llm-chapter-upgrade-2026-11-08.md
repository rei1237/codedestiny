---
status: in-progress
updated: 2026-11-08
next: 6c-2 — heukwol 배달 안전 수정(시도 소진·40,000자 관문 환불 제거). 그다음 6c-3~6c-7, 끝나면 6d. 아래 "6c 진행 결과" 참고
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
- [x] 5. 마스터 인연의 서 (+궁합)
- [x] 6. 초융합 운세
- [x] 6a. 인연의 서 개인판 분량 약속 문구를 "5만 자"에서 "2~3만 자"로 바꾼다(사용자 승인). 위치는 5단계 보정 절에 있다. 생성 JSON과 SEO·메타 문구도 포함한다. 궁합판 문구는 개인판 분량을 말하는 곳이 아니면 그대로 둔다.
- [x] 6b. 운명의 업·인연의 서(개인·궁합) 조판 PDF에 차트·레이더·요약 페이지를 되살린다. 결과 화면과 보관함 양쪽에 넣는다.
- [ ] 6c. 서비스 공통 배달 안전 수정. 6단계 문제 목록을 같은 문제가 있는 다른 유료 LLM 서비스에 모두 적용한다. 목록은 시도 소진 시 환불·배달 불가, 선택 그룹 삭제, 분량 보충 경로 없음, 말투 이탈 로그만, 모든 그룹에 질문 인용, 보관함 PDF 없음이다. 읽기 전용 감사 결과는 아래 "6c 배달 안전 감사"에 있다(원본: scratchpad `research/llm-delivery-audit-6c.md`).
  - **나누는 방식**
    - 7~13단계 상품(ziwei, ziwei-deep, sukuyo, astrology, vedic/nakshatra, neo, naming, 영냥이)은 각자의 단계에서 고친다.
    - 6c에서 고치는 것은 셋이다: human-design, destiny-compass, fortune.js 사주 AI의 P6.
    - 버전 분기를 두고 V1 바이트를 보존한다.

  **6c 배달 안전 감사 (2026-11-08, 읽기 전용)**

  이미 고친 6종(연애 비책·신년운세·인생의 책/총운·운명의 업·인연의 서·초융합)은 감사에서 뺐다.

  문제 코드
  - P1: 필수 그룹이 시도를 다 쓰면 배달하지 않고 환불한다.
  - P2: 선택 그룹이 실패하면 그 그룹을 통째로 뺀다.
  - P3: 분량 미달이 치명이거나, 분량을 보충하는 경로가 없다.
  - P4: 말투가 틀어져도 로그만 남긴다.
  - P5: 질문 원문을 모든 그룹에 넣는다.
  - P6: `/g` 정규식을 쓰거나 부정문을 구분하지 못하는 검사가 있다.
  - P7: PDF가 캡처 방식이거나 보관함에 PDF가 없다.

  | 서비스 | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
  |---|---|---|---|---|---|---|---|
  | ziwei-ai (`worker/routes/ziwei-ai.js`) | 예 1879/1934, 환불 2706 | 예 메타 인트로 1940 | 아니오 | 예 | 예 1426/1539 | 아니오 | 캡처(ZiweiAiClient.tsx:1302), 보관함 없음 |
  | astrology-ai | 예 1262/1301, 환불 1928 | 아니오 | 레거시 MIN_TOTAL_CHARS 치명 1096/1342-1359/1468-1483 | 예 | 예 1052 | 아니오 | 캡처(AstrologyAiResultClient.tsx:699) |
  | vedic-ai | 예 1542(raw_leak·mechanical_label 1527-1535), 1740 | 아니오 | 아니오 | 예 | 예 1070/1088 | 아니오 | 캡처(VedicAiClient.tsx:2887) |
  | sukuyo-compat | 예 1607, review hold 2104-2116. 개인 모드는 1회 시도이고 240자 미만이면 치명(1665-1674) | 예 요약 1회 1628 | 예 섹션 40자(1601) 대 minChars 69-91, 보충 없음 | 예 | 예 1402/816/960/1420 | 아니오 | 캡처(SukuyoCompatibilityAiClient.tsx:1108) |
  | neo 작전실 | 예 1762, 반복 문단 throw 1822, 환불 1840 | 아니오 | 아니오 | 아니오(1751/1779에 보정이 있으나, 남은 이탈은 그대로 배달) | 예 prompt.js 1425-1431 | 아니오 | PDF 없음 |
  | nakshatra* | 예 932→994 | ? | ? | 예 | 예 nakshatra-ai-prompt.js:196 | 아니오 | 예 |
  | ziwei-deep* | 예 760→790 | ? | ? | 예 | 예 prompt.mjs:236-246 | 아니오 | 보관함 없음 |
  | human-design* | 예 BELOW_DELIVERY_FLOOR 641 | ? | 예 | 예 | 예 prompt.js:155 | 아니오 | 보관함 없음 |
  | destiny-compass* | 예 351/368 | ? | ? | 예 | 예 161/531 | 아니오 | 예 |
  | naming* | 예 1479/1835 | ? | ? | 예 | ? | 아니오 | 예 |
  | 사주 AI(fortune.js)* | ? | ? | ? | 예 | ? | 예 253/279/292, 금융상품 검사가 부정문을 구분 못 함 | 예 |
  | 영냥이* | ? | ? | ? | 예(service.ts:166은 말투 선택만) | ? | 아니오 | 보관함 없음 |

  \* 표시는 일부만 확인한 서비스다.

  그 밖의 발견
  - astrology `sanitizeConsultationText`(1147-1153)가 문장 중간의 "AI", "이 결과는", "chapter"를 지운다.
  - 결과 화면에 조판 PDF가 있는 서비스는 넷이다: ziwei-deep, human-design, 영냥이, heukwol.
  - 아직 감사하지 않았다: pet-saju-ai, ziwei-island, sibyl, heukwol 생성, 영냥이 등급별 실패 경로, fortune.js의 P1~P3.

  수정 우선순위 (배달이 깨지는 것부터)
  1. P1 전부
     - 필수 그룹이 시도를 다 써도, 확보한 최선의 글을 살려 degraded로 배달한다.
     - 반복이나 품질 문제가 나와도 throw하지 않고 문제 부분만 지운다.
     - 본문이 완전히 비었을 때만 환불한다.
     - sukuyo의 review hold도 배달을 막지 않게 한다.
  2. sukuyo 개인 모드: 재시도를 넣고, 글을 살려 배달한다.
  3. P3
     - sukuyo: 횟수 제한을 둔 minChars 보충을 넣는다.
     - astrology: 레거시 MIN 치명을 없앤다.
     - human-design: floor 미달이면 보충한 뒤 배달한다.
  4. P2: ziwei 메타 인트로와 sukuyo 요약에 두 번째 시도나 결정적 대체문을 둔다.
  5. P5: 질문 정면 답은 첫 장 한 번만 하고, 나머지 장에는 한 줄 초점만 준다.
  6. P4: neo의 이탈 검사와 보정을 다른 서비스로 옮긴다. neo도 보정 뒤 이탈이 남으면 한 번 더 보정한다.
  7. P6: fortune.js 금융상품 검사가 부정문을 구분하게 한다. `love-secret-ai-prompt.js:42-48`의 윈도우 방식을 다시 쓴다.
  8. P7: 보관함 PDF 버튼을 넣고, 캡처 PDF를 조판으로 바꾸고, neo에 PDF를 더한다.

  **6c 진행 결과 (2026-11-08)**

  - [x] 6c-1. human-design, destiny-compass, 사주 AI의 P6를 고쳤다. 커밋은 넷이다.
    - `956a85152` human-design-report 배달 2판
      - 마지막 시도 초안을 살리고 위험 문장만 지운다. 빈 섹션은 구제 시도를 한다.
      - 본문이 완전히 비었을 때만 환불한다. 분량 수리는 4회까지다. 반복 문장을 덜어 낸다.
      - 판 정보는 `deliveryPlanVersion` 스키마 필드에 두었다(models.js). 끄는 스위치는 `HD_REPORT_DELIVERY_V2_ENABLED=false`다.
    - `6cd06f523` 보관함에 휴먼디자인 조판 PDF 버튼을 넣었다(`app/records/view/SavedHumanDesignPdfButton.tsx`). `SavedServiceReading.tsx`에서 차트와 본문이 있을 때만 보인다.
    - `f180d1846` destiny-compass 배달 2판
      - 판 정보는 `llmMeta.deliveryPlanVersion=2`에 두었다. llmMeta가 Mixed라 스키마 변경이 없다. 끄는 스위치는 `COMPASS_REPORT_DELIVERY_V2_ENABLED=false`다.
      - 마지막 시도 초안은 위험 문장만 지우고 degraded로 배달한다. 빈 섹션은 구제 시도를 3회까지 한다.
      - 말투 이탈과 floor(목표의 0.75) 미달은 부드러운 수리로 다룬다. 3회까지만 하고, 이탈한 장부터, 그다음 짧은 장부터 고친다.
      - 조립할 때 반복 문장을 덜어 낸다. 결과가 85% 미만으로 줄면 원문을 둔다.
      - 고민 원문은 opening 장에만 넣는다. V1 프롬프트 sha256이 같은 것을 확인했다.
      - 새 함수 `banmalRegisterDrift`를 `expert-character-persona-text.js`에 더했다.
    - `4a327e9d0` fortune.js 금융상품 검사가 부정문을 구분한다(앞 226자 안의 상품어 + 뒤 32자 안의 부정어 윈도우).
      - 새 이름은 `__tests__/worker/saju-paid-delivery-recovery.test.js` 하네스의 names·constants에도 넣어야 한다.
  - 검증
    - jest: HD·compass·saju 관련 스위트가 통과한다. `npx tsc --noEmit`도 통과한다(2026-11-08).
    - `npm run build`는 아직 돌리지 않았다. 6c 마지막 단계에서 돌린다.
    - 원래 실패하던 테스트가 있다. 이번 작업 때문이 아니다(git stash로 HEAD에서 확인).
      - `__tests__/worker/fortune-today-hub.route.test.js` 8개
      - `__tests__/ui/paid-report-partial.behavior.test.js`의 codex 2개
  - 남은 위험
    - destiny-compass는 캡처 PDF만 있다. 조판 PDF가 없어 보관함 PDF 버튼을 넣지 않았다(P7).
    - compass 클라이언트(`useCompassReport.ts`)는 물결을 24번까지만 돈다. 2판 최악의 경우 이를 넘으면 다시 시도 버튼이 뜨고, cron 재개가 이어 받는다.
  - 실호출 샘플은 한 번도 하지 않았다(6c는 실호출 승인이 없다). 목 테스트만 했다.

  **6c 가벼운 감사 결과 (2026-11-08, 읽기 전용, 코드 줄은 이 워크트리 기준)**

  | 서비스 | 판정 | 근거 | 최소 수정 |
  |---|---|---|---|
  | heukwol | P1+P3 | `heukwol.js:68-69` 시도 3회면 장이 최대 26개 있어도 `forceRefundOnClose` 환불. `heukwol-report.js:80` 장 1500자 미만·6000자 초과면 throw. `heukwol.js:54` 전체 40,000자 미만이면 매번 throw → 27장이 다 있어도 3번 뒤 환불 | 전체 40,000자 관문을 없앤다. 마지막 시도의 짧은 장은 받는다. 시도가 끝나도 장이 있으면 환불하지 말고 있는 장으로 완료한다 |
  | 사주 AI(fortune.js) | P1 | `resolveSajuAIPromptFailureBilling`의 `refundOnFailure: status==="generation_failed"`(1634)로 다른 그룹이 저장돼 있어도 환불(catch 5212-5253, 상태 5271). 그룹 검사 throw 5096-5097, 전체 검사 throw 5135-5150. 또 5136-5139가 `qualityRepair=true`로 두면서 `attempts`를 되돌리지 않아, 5043에서 고를 그룹이 없으면 5100-5103이 202 partial을 영원히 돌려준다 | `qualityRepair`를 둘 때 attempts를 되돌린다. 시도가 끝나면 조립된 최선의 글을 품질 경고와 함께 배달하고, 유효 그룹이 있으면 환불하지 않는다 |
  | pet-saju-ai | P1(멈춤) | 공용 엔진 `worker/lib/paid-narrative-delivery.js:178-179`. 한 파트가 2회 실패하면(46) `partialReview`가 되어 남은 파트를 만들지 않는다. `ready()`(45)가 참이 되지 않아 73-75가 202 `retryable:false, DELIVERY_REVIEW_REQUIRED`를 계속 돌려준다. 환불 훅(240)은 파트가 0개일 때만 | `limited`여도 남은 파트를 만든다. 더 시도할 것이 없으면 소진 파트를 빼고 완료한다(`renderPetNarrative`가 이미 `filter(Boolean)`). **공용 엔진이라 다른 서비스 영향을 먼저 확인한다** |
  | sibyl / sibyl-annual | P1+P3 | `sibyl-report-store.js:39-41` 한 번에 10장을 만들고 한 장이라도 `validateSibylCounsel`에서 떨어지면 전부 버린다. 21: 장 400자 미만·2400자 초과·숫자·간지 글자, 24: 금지어, 27: 전체 5000자 미만이 모두 치명. 71에서 `failed`, `sibyl.js:489`가 503. 환불은 없지만 재시도마다 전체를 다시 만든다 | 통과한 장은 남기고 실패한 장만 다시 만든다. 분량은 경고로 바꾼다 |
  | ziwei-island-ai | P1(옛 기록 멈춤) | 생성은 모두 410(`ziwei-island-ai.js:92-93`). `generating/partial/delivery_pending` 옛 기록은 그대로 돌려준다(66-71, 83). 결과는 assistant 메시지에서만 읽고(24) `llmMeta.parts`는 쓰지 않는다. 복구 등록부(`consultation-recovery-registry.js:4`)는 `ziwei-ai`만 | 그 상태면 `llmMeta.parts`로 `palaceResult`(`palace-delivery.js:58`)를 만들어 완료하거나, 환불·고객 지원으로 넘긴다. **운영 DB에 그런 기록이 실제로 있는지 먼저 본다(읽기 전용 조회는 사용자 승인 필요)** |
  | ziwei-island-report | OK | LLM 호출이 없는 결정적 보고서(`ziwei-island-report.js:134`) | 없음 |

  `/g` 정규식을 `.test()`에 쓰는 곳은 위 파일에서 찾지 못했다.

  **Gemini 응답 스키마 "too complex" 위험 (2026-11-08, 읽기 전용)**

  - 공용 호출부는 400을 스키마 없이 다시 보내지 않는다.
    - `worker/lib/gemini.js:138`은 스키마를 넘기기만 하고, 190-191은 `toFailure(error)`만 돌려준다.
    - `lib/llm-client.ts:1153-1164`는 400·403·404를 재시도하지 않는다.
    - 400 코드는 `GEMINI_INVALID_REQUEST`(`lib/gemini-provider-errors.mjs:57`)이고, 이 코드를 처리하는 곳은 fusion뿐이다(`fusion-fortune.js:757, 1425-1427`).
  - `jsonSchemaFromExample`(`worker/lib/json-text-repair.js:53-59`)는 enum을 만들지 않는다. 그래서 그 함수로 만드는 스키마는 모두 낮은 위험이다.

  | 위험 | 서비스 | 위치 | 내용 | 대응 |
  |---|---|---|---|---|
  | 높음 | 영냥이 유료 장(모든 등급, 질문 먼저 장, v7, 한국어 아닌 상징) | 만듦 `worker/yeongnyangi/providers/chapter.ts:699-702`(`sourceIds` 555-558, `askFactIds`/`askTimingIds` 553-554). 조각 `fortune/reading-v7-prompt.ts:94,97`, `fortune/symbolic-locale.ts:56`, `fortune/block-anchors.ts:65`, `fortune/ziwei/block-palaces.ts:24`. 보냄 `providers/code-destiny.ts:84` | 런타임 enum. `sourceIds`(50~150개, 한 벌 1~3천 자)가 2~4곳에 복사돼 합계 약 2천~1만 자. `askFactIds`는 100개를 넘을 수 있다. 400 대체 경로와 enum 예산이 없고, 장 재시도도 같은 스키마를 보낸다. 크기는 추정이다(실측 아님) | **영냥이는 7~13단계 범위라 6c에서 고치지 않았다.** 해당 단계에서 `CodeDestinyProvider.generate`에 fusion 방식(예산 2000자, 넘으면 enum을 빼고 프롬프트에 나열, 400이면 단순 스키마, 그다음 스키마 없이)을 넣으면 모든 등급이 한 번에 막힌다 |
  | 중간 | 초융합 v1 그룹·1단계 신호 | `fusion-fortune-prompt.js:1061-1090` → `fusion-fortune.js:1384` | 예산(1092)은 plan v2 소장 `evidenceKeys`에만 적용된다. 1단계 `signals.evidenceKeys`와 v1 그룹은 예산이 없다 | 400 대체 경로가 있어 배달은 된다. 다만 대체될 때마다 호출이 한 번 더 든다. 6c에서는 고치지 않았다 |
  | 낮음 | 초융합 v2 그룹 | `fusion-fortune-prompt.js:1092-1100` | e929c2114로 해결 | 없음 |
  | 낮음 | 영냥이 질문 분석·무료/기본, 찻집, 연애 비책, 자미두수, 사주 궁합 기본, 손금, 인생의 책, vedic, 숙요 궁합, nakshatra, neo, 휴먼디자인, 관계·질문 배달, 타로, 동물 토템, destiny-anatomy, yoga, `NARRATIVE_RESPONSE_SCHEMA` 계열 | 각 `jsonSchemaFromExample` 호출부 | enum 없음, 깊이 4 이하 | 없음 |

  - [ ] 6c-2. heukwol P1+P3를 고친다. 위 표의 수정대로 하고, 새 세션만 판 분기한다. 환불 경로는 본문이 완전히 비었을 때만 남긴다.
  - [ ] 6c-3. 사주 AI(fortune.js) P1을 고친다. qualityRepair가 attempts를 되돌리게 하고, 소진 시 최선의 글로 배달하며, 유효 그룹이 있으면 환불하지 않는다. 테스트 하네스의 names·constants 등록을 잊지 않는다.
  - [ ] 6c-4. pet-saju-ai(공용 `paid-narrative-delivery.js`)의 202 멈춤을 고친다. 공용 엔진을 쓰는 다른 서비스를 먼저 grep하고, 동작이 바뀌면 옵션으로 pet에만 켠다.
  - [ ] 6c-5. sibyl / sibyl-annual: 장 단위 재시도와 분량 경고화.
  - [ ] 6c-6. ziwei-island-ai 옛 기록: 코드로 `llmMeta.parts` 구제 경로만 넣는다. 운영 DB 조회는 사용자 승인 대기다.
  - [ ] 6c-7. `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build`. 빌드가 바꾼 sitemap·shell 파일은 되돌린다. 그다음 6c를 체크하고 `next`를 6d로 둔다.
- [ ] 6d. 영냥이 이미지 리포트: 지금 있는지 확인하고, 더 고퀄리티로 만들고, 상품 설명에서 잘 알아볼 수 있게 넣는다. 읽기 전용 조사가 진행 중이다.
  - 사용자 원문(2026-11-08): "어느정도 이미지를 넣어서 직관적으로 만들어주면 좋겠다"
  - 이미지 리포트와 상품 설명 절에 실제 이미지(기존 영냥이 스틸·에셋)를 적당히 넣어 한눈에 알게 한다. 이미지와 실제 에셋만 쓰고, 코드로 그린 도형·손글씨는 쓰지 않는다. 영냥이 스틸은 원본 크기로 보고 귀가 정확히 2개인지 센다.
  - 조사 결과(2026-11-08, 읽기 전용, 원문은 scratchpad `research/yeongnyangi-image-report-findings.md`)
    - 진짜 이미지 리포트는 없다.
      - 있는 것은 canvas 글귀 카드 하나다(`app/yeongnyangi/_lib/result-share.ts:39-71` `renderShareCard`, 호출 위치는 `_components/ResultSharing.tsx:32`).
      - 카드는 1x로 그리고, 글자 단위로 줄을 바꿔 한국어 단어가 잘린다. 글꼴은 본문 글자만 로드한다. 높이 상한이 없다.
      - 내용은 사용자 발췌문(600자 이하)뿐이다.
      - 유료 전 등급(고등어·연어·광어·참치·모둠·오마카세)과 무료 일일 운세가 같은 카드를 쓴다(`shareChoices` :29-35).
    - 다른 이미지 출력
      - 범용 인사이트 카드(`lib/insight-card-image.ts`): 글꼴 스택이 Noto Sans KR인데 로드되는 패밀리와 맞지 않는다.
      - 분류모자 카드(`_lib/hat-card.ts`): 한글 글꼴이 없다.
      - OG 1200×630
      - ChatGPT 프롬프트 복사(`ExternalImageGuide.tsx`)
    - 상품 설명에는 이미지 리포트 언급이 없다.
      - 넣을 곳: `ProductGuide.tsx:74-75`(무료와 유료 차이), `:66`(등급 선택기), `:45`(샘플)
      - `public/feature-details/crafted/yeongnyangi-*/manifest.json`의 마지막 패널
    - 보관함(`_components/Library.tsx`)에는 진입점이 없다.
  - 6d 방향
    - 등급별로 다른 여러 절 이미지 리포트를 만든다. 발췌 카드 하나로 끝내지 않는다.
    - 실제 에셋을 쓴다.
      - `public/assets/yeongnyangi/report-art/{cover,insight,choices,closing}{,-print}.webp`
      - `fish/` 등급 아이콘, `expressions/`
    - 2x 레티나로 그린다. 한글 글꼴은 실제로 로드한다. 줄은 단어 단위로 바꾼다.
    - 결과 화면과 보관함 양쪽에서 받을 수 있게 한다. ProductGuide와 등급 manifest에 미리보기 이미지와 함께 넣는다.
    - 귀 확인을 마친 에셋은 `hero.webp`와 `report-art/cover.webp`뿐이다. 나머지는 쓰기 전에 원본 크기로 귀 2개를 확인한다.
- [ ] 6e. 인생 총운 F9b 수정. 장마다 생성을 요청 2개(앞·뒤 반)로 나눠 장이 목표 약 4,400자에 닿게 한다.
  - 판 분기를 두어 진행 중인 세션은 기존 계획을 유지한다. V1 바이트는 그대로 둔다. 분량은 치명이 아니다.
  - 요청마다 100초 엣지 한도와 복구 cron을 확인한다. 목 dry-run 뒤 실호출 샘플 1회를 한다.
  - 배열 인덱스 근거 경로 수정(d78175aac)이 인생의 책·인생 총운의 모든 근거 경로를 덮는지 다시 확인하고, 남은 근거 경로 오류를 고친다.
- [ ] 7. 자미두수 상담 / 심층 PDF (무성)
- [ ] 8. 숙요점 궁합 (서한비)
- [ ] 9. 점성술 (윤달)
- [ ] 10. 베다점 / 나크샤트라 2종 (윤달)
- [ ] 11. 팩폭 작전실 (네오)
- [ ] 12. 사주 맞춤 작명
- [ ] 13. 영냥이 참치·모둠·오마카세

## 사용자 추가 지시 (2026-11-08)
원문: "인연의 서 개인판은 2~3만자로 바꾸고 초융합 운세는 분량을 보충하는 경로를 만들고 동일한 문제가 있는 llm 서비스에도 이런 문제가 없도록 고칠 문제들을 수정해줘 그리고 운명의 업, 인연의 서 차트, 레이더, 요약 페이지 추가해줘 그리고 영냥이 서비스에 이미지 리포트 결과에서 만들어주는것 지금 있는지 확인 후 더 고퀄리티로 만들어주도록해주고 상품 설명에도 잘 알아볼 수 있도록 넣어"
6d 추가 원문: "어느정도 이미지를 넣어서 직관적으로 만들어주면 좋겠다"
6e 원문: "니가 발견한 인생 총운 문제들은 장마다 생성을 두 번으로 나눠서 늘리도록해 증거 오류도 수정해"
- 초융합 분량 보충 경로는 6단계 범위다. 사용자가 명시적으로 확인했다.
- 6단계가 끝나면 6a→6b→6c→6d→6e 순서로 하고, 그다음 7~13단계를 한다. 6단계가 끝나면 `next`를 6a로 둔다.

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
- [~] F9b. (결정 2026-11-08: 장을 요청 2개로 나눈다, 6e에서 진행) 인생 총운 장 분량이 아직 2,100~2,700자로 목표 4,400자에 못 미친다. 모델이 일찍 멈춘다(finishReason STOP). 구조 변경이 필요하다(예: 장 하나를 요청 2개로 나눔). `worker/routes/life-book-ai.js`
- 참고: 연애 비책 V2 분량 상향 `dc6422d33`(그룹 6,000~7,500자, 15,000토큰). 검증 문서 「분량 넉넉·비치명화」 절은 `a7ff45b2c`.
- [x] F18. (결정 2026-11-08: 수정은 브랜치에 둔다. 운영 반영은 명시적인 배포 요청이 있을 때만 한다) d78175aac(인생 총운 전달 실패 버그, 운영에도 있음). **push·배포하지 않는다.**
- [x] F19. (해결 `94707deb7`: 책당 수리 최대 4장·가장 짧은 장부터, 아래 "5단계 보정") 마스터 인연의 서 V2 실호출에서 첫 초안이 거의 모든 장에서 minChars 근처(약 2,100~2,900자)로 멈춰 길이 수리가 장마다 한 번씩 돈다(solo 16장·compat 14장). 그래서 생성 호출이 20회가 아니라 약 38회이고, 생성 시간이 9~10분이다. 배달에는 영향이 없다. 수리 기준(repair floor = minChars)을 낮출지, V2 목표 min+800~1,200을 낮출지, 모델·토큰을 바꿀지 사용자가 정한다(F9b와 같은 모양). `worker/lib/master-love-codex-quality.js`·`worker/routes/master-love-codex.js`
- [ ] F20. `__tests__/ui/paid-result-locale-copy.test.js`의 "로케일 카피 표는 로케일마다 같은 키 집합을 갖는다"는 5단계 전부터 실패한다(`app/love-secret-ai/result/LoveSecretAiResultClient.tsx` LoveSecretResultCopy의 en에 `chaptersHeading`이 남음). 5단계 변경과 무관하다. 1단계 화면 작업의 잔여로 보고 고친다.

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

## 5단계 진행 메모 (완료, 결과는 아래 단계별 결과)

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

### 결정 (확정, 2026-11-08 compat 프롬프트·acts.ts 확인 뒤)
- **장 수·id·제목은 그대로 20장**(5막×4장, acts.ts·manifest·공유 링크 무변경). V2 표 `MASTER_LOVE_CODEX_CHAPTERS_V2`·`MASTER_LOVE_CODEX_COMPAT_CHAPTERS_V2`를 V1에서 파생해 `planVersion: 2`·`perspective`·`targetChars [min+800, min+1200]`만 더한다. solo 1장 gate·compat 1장 facing은 V2 scope를 "기질(두 사람 기질) 근거의 쉬운 뜻 → 공감 장면 2~3개 → 연애(이 관계)와 연결"로 바꾸고 2장에 1장과 겹치지 않게 avoid를 더한다.
- 계획 선택: `codexChaptersForPlan(mode, version)`. `expectedChapters`가 `deliveryMeta.chapterPlanVersion`을 보고, 새 세션에만 `chapterPlanVersion: 2`. 없으면 V1.
- V2 전용 프롬프트 줄은 `chapter.perspective`가 있을 때만(관점·상투구 금지·여닫는 문장 다양화·한 장 한 말투·질문은 배정 장에서만 인용). 편집 계약·JSON body 줄·토큰 계획·분량 수리 지시도 `chapter.targetChars`가 있을 때만 그 값을 쓴다. V1 프롬프트 바이트는 스크래치 기준 덤프와 비교한다.
- 연성 이슈(V2만): REGISTER_DRIFT(종결 6개 이상, 해요·합니다 둘 다 30% 초과), QUESTION_REQUOTED(비배정 장에서 질문·상황과 6자 n-gram 3개 이상 공유 문장이 2개 초과). 1차는 저장 + `:lengthRepair` 자리로 힌트 수리 1회, 조립 때 표시 문장을 85% 이상 남을 때만 덜어 낸다.
- 마지막 시도 scrub(모든 세션, 프롬프트 무변경): 근거·질문·시기·DNA·필드·반복·JSON 오류를 마지막 시도에서는 던지지 않고 결정적으로 보충해 저장. 본문이 아예 비면 그때만 실패. 물결의 반복 판정은 `dropRepeatedReportSentences`로 덜어 내고 저장. 조립에서 `byId.delete` 금지.
- 근거 하위 경로 대체 조회: `findCodexRecord`가 끝의 `[n]`·`.segment`를 하나씩 떼며 다시 찾는다.
- 화면: 장 머리 화자 칩·kicker(막 이름), 1장 강조, 조판 PDF `src/features/master-love-codex/_lib/codex-pdf-chapters.ts`를 CodexReader 안에서 써서 결과·보관함 공통(PdfFontError일 때만 캡처).

### 결정 초안 (위 확정본으로 대체)
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

### 5단계 마스터 인연의 서 (+궁합) — 완료 (2026-11-08)
- 커밋
  - `15e969fc6`: lib. V2 표 `MASTER_LOVE_CODEX_CHAPTERS_V2`·`MASTER_LOVE_CODEX_COMPAT_CHAPTERS_V2`(20장·id·제목·minChars 그대로, `planVersion: 2`·`perspective`·`targetChars [min+800, min+1200]`, 1장 gate/facing은 기질 쉬운 뜻→일상 공감 장면 2~3개→연애(관계) 연결로 재범위, 2장 avoid 추가). `codexBodyTarget`·`codexV2PromptLines`(perspective 있을 때만 → V1 프롬프트 바이트 동일, 스크래치 덤프 82항목 SAME_AS_BASELINE). 마지막 시도 구제 `salvageCodexChapter`(근거·질문·시기·DNA·필드·반복·JSON 오류를 던지지 않고 결정적으로 보충, 본문이 비면만 실패). 연성 이슈 `detectCodexSoftIssues`(REGISTER_DRIFT = 한 장 안 해요·합니다 둘 다 30% 초과, QUESTION_REQUOTED)·`codexSoftIssueHint`·`scrubCodexSoftIssues`. `findCodexRecord` 하위 경로·`[n]` 대체 조회
  - `7145b876c`: 라우트. `CODEX_CHAPTER_PLAN_VERSION = 2`, `codexChaptersForPlan(mode, version)`, 새 세션 seed에만 `deliveryMeta.chapterPlanVersion: 2`(없으면 V1). 연성 이슈는 저장 + `:lengthRepair` 자리로 힌트 수리 1회(previousError LLM_SOFT_ISSUES), 마지막 유료 시도는 `finalAttempt`로 구제. 물결의 반복 판정은 `dropRepeatedReportSentences`로 덜어 내고 저장. 조립 때 중복 제거가 장을 비우면 원문 유지(**`byId.delete` 없음**). publicSession·sessions에 `chapterPlanVersion`. 저장 때 `softIssues` 제거
  - `daa71c5a8`: 화면. 장 머리에 막 이름 kicker + "연애 고수" 칩, 1장은 기본 펼침·금색 테두리, `src/features/master-love-codex/_lib/codex-pdf-chapters.ts`(`buildMasterLoveCodexPdfChapters`)로 CodexReader 안에서 조판 PDF(`exportConsultationBookPdf`, 표지 테마 `codex`, ko만). PdfFontError일 때만 캡처로 대체. 보관함은 같은 CodexReader를 쓰니 함께 바뀐다
- 테스트
  - 새 `__tests__/worker/master-love-codex-chapter-plan-v2.test.js` 12개, codex 워커 jest 전체 273/273
  - UI `node --test __tests__/ui/master-love-codex-*.test.js` 56/56(reader-navigation vm 컨텍스트에 `actForChapter` 주입), 새 `__tests__/ui/master-love-codex-pdf-chapters.test.mjs` 3개 + karma-pdf 7/7
  - verify: flow·batch-budget·compat-determinism·efficiency(solo/compat 20호출, 다시 열기 0)·payment-recovery·`verify-llm-generation-resilience`(1331 checks) ok. reader(360·390·430·1280px: 목차·초점·읽기·저장소 차단·터치 대상·가로 넘침)·sharing(390·1280) PASS — `out/`을 로컬 정적 서버(3107)로 띄워 확인하고 껐다. reader는 첫 실행 1회가 "element was detached" 클릭 타임아웃으로 실패하고 이어 3회 연속 통과(콜드 로드 중 flaky로 판단)
  - `npx tsc --noEmit` exit 0, `npm run build` exit 0(✓ Compiled successfully in 5.0min, 1894/1894). 다른 세션의 dev 서버가 메인 저장소에 떠 있어 `ALLOW_DEV_SERVER_DURING_BUILD=1`로 빌드했다(이 워크트리는 `.next`가 따로다). 빌드가 바꾼 sitemap·lastmod는 `git checkout --`로 되돌렸다
- 실호출 샘플(승인 2026-11-08 "llm 샘플 생성 허가한다", 상품당 1회, gemini-2.5-flash, plan V2). 하네스 `scratchpad\codex-live\`(로더 훅으로 db·auth(admin)·models·cache만 메모리 대역, 실제 handleStart → /generate 루프, DB·결제·배포 없음)
  - 하네스 실수로 끊긴 실행 2회가 있다: ① 캐시 대역이 null이라 저장 단계에서 매번 실패(생성 7회 낭비, 결과 없음) ② 요청 상한 20이 장당 2요청 속도에 모자라 10요청에서 중단(생성 10회). 고친 뒤 한 번씩 끝까지 돌린 것이 아래 결과다
  - solo(`master-love-codex`): **completed**, 요청 39(start 1 + generate 38), 제공자 fetch 76(요청마다 컨텍스트 캐시 1 + 생성 1), 551초, 20장, 총 40,399자, 장 2,151~4,265자. minChars 미만 4장(spouse-image 2,639/2,700, spark-to-bond 2,151/2,500, marriage 2,433/2,600, cross-check 2,700/2,800). 길이 수리 16장. 연성 이슈 0, 반복 false, 금지 표현 없음, 환불 없음. 질문 2개 모두 9장(timing) `questionAnswers`에서만 답하고 다른 장 재인용 0. 말투는 전 장 합니다체 위주(해요 종결 장당 0~14). 1장은 일간·명궁 기질 → 모임·직장 장면 → 연애로 잇는다
  - compat(`master-love-codex-compat`): **completed**, 요청 40, fetch 78, 618초, 20장, 총 39,712자, 장 2,099~3,769자. minChars 미만 8장(최저 yongshin 2,099/2,500·daystem 2,110/2,600·spouse 2,154/2,700). 길이 수리 14장, 최대 시도 2. 연성 이슈 0, 반복 false, 금지 표현 없음, 환불 없음. 질문은 13장(temperature)·16장(future)에서만 답하고 재인용 0. 전 장 합니다체 위주
  - V2 목표(min+800~1,200)에는 두 상품 모두 못 미친다. 모델이 출력 토큰 2,300~3,200에서 STOP한다(F19)
- 남은 위험·후속
  - F19(장마다 길이 수리 → 생성 호출 약 2배·9~10분). F20(5단계와 무관한 기존 실패)
  - 조판 PDF에는 캡처 PDF의 차트·연애 DNA 레이더·요약 페이지가 없다. 비ko 로캘과 V1 세션은 기존 캡처 그대로
  - META minTotalChars 46,000은 이번 샘플 합계(약 4만 자)보다 크지만 분량 비치명이라 배달된다. 상품 안내 문구가 분량을 약속하는지 확인 필요

### 5단계 보정 — F19 해결 + 개인판 2~3만 자·반복 없음·정확한 챕터 (2026-11-08)
- 사용자 지시 원문(2026-11-08, 조정자 전달): "마스터 인연의 서 개인판은 너무 긴것 같으므로 분량이 2~3만자 정도로 하되 반복없이 정확한 챕터대로 나오도록 수정해". 범위는 개인판(solo) V2만. 궁합판·V1은 바뀌지 않는다.
- F19 해결 `94707deb7`: 수리 기준은 원래도 minChars(전달 하한) 미만일 때만이었다. 바꾼 것은 횟수다. `CODEX_SESSION_REPAIR_CAP = 4`로 정했다. 모든 장의 첫 초안이 나온 뒤 수리를 시작하고, 가장 짧은 장부터(비율 = 본문/minChars) 책당 최대 4장만 수리한다. 길이 수리와 V2 소프트 이슈 수리가 같은 상한을 쓴다. 분량은 실패 사유가 되지 않는다.
  - 1~4단계 점검 결과 고칠 것이 없다. 연애 비책은 총량이 MIN 미만일 때 가장 짧은 그룹부터 최대 2회 수리한다. 신년은 minChars 미만 섹션을 최대 2회 수리한다. 인생의 책은 minChars 미만인 가장 짧은 장을 최대 2회 수리한다. 운명의 업은 총량이 30,000 미만일 때 가장 짧은 장을 최대 2회 수리한다.
  - 예상 호출(저장된 5단계 샘플 기준): 이전에는 solo 38회 생성(초안 20, 수리 16, 그 외 2), compat 39회(20+14+5)였다. 이제 solo는 20+4+재시도 2 ≈ 26회 이하, compat는 20+4+5 ≈ 29회 이하다. 요청마다 문맥 캐시 조회가 1번 더 붙는다. 시간은 대략 solo 551초→약 380초, compat 618초→약 460초로 줄 것으로 본다.
- 개인판 분량 `bd6392a12`. 고친 곳은 `worker/lib/master-love-codex-prompt.mjs`의 `SOLO_V2_MIN_CHARS`와 `MASTER_LOVE_CODEX_SOLO_V2_LENGTH`다.
  - 장 minChars는 1,000자다. 1장 gate와 19장 three-years는 1,200자, 20장 letter는 800자다. minChars 합은 20,200자다.
  - 장 목표는 minChars+150~minChars+450이다. 합계 목표는 23,200~29,200자다.
  - `compact: true`인 장에는 다음이 적용된다. 계약은 "소제목 2~3개"다. 프롬프트에 "[V2 분량] …자를 넘기지 않는다"는 상한과 "[V2 반복 금지]"(1장의 기질 설명을 다시 하지 않음)가 들어간다. 토큰 하한은 8000에서 5000으로 낮췄다.
  - V1 META(46,000/50,000)는 옛 세션과 verify 스크립트의 기준이라 그대로 두었다. V1 프롬프트와 궁합 계약 바이트가 같은지 해시로 확인했다(ee57f73e…, 변경 전후 같음).
- 반복 없음: `codexCrossRepeatSentences`(quality.js)는 다음 두 경우를 거의 같은 반복으로 본다.
  - 20자 구간이 앞 장 2개 이상에 이미 있다.
  - 32자 구간이 앞 장 하나에라도 있다.
  - 한 장에서 이런 문장이 2개 이상이면 `CROSS_REPEAT` 소프트 이슈가 된다. 힌트를 붙여 수리하고, 수리는 F19 상한 안에서만 돈다. 조립할 때는 `scrubCodexCrossRepeats`가 본문의 85% 이상이 남는 동안만 이런 문장을 지운다. 첫 사본은 남긴다.
  - 저장된 5단계 solo 샘플로 확인했다. 16·18·19장에서 반복 문장 1개씩을 잡았다("비겁이 발달하여 경쟁 속에서 존재감…", "상대방의 입장을 이해하려는 노력이 필요합니다"). 지운 분량은 176자다. 장마다 1개라서 수리 대상은 아니고 지우기만 된다.
- 정확한 챕터: 조립할 때 id·제목·순서·기호를 계획표 값으로 고정한다(compact 장만). `validateCodexChapterOutline`(개수·중복·순서·제목)을 통과해야 완료된다. 빠진 장은 기존 경로대로 다시 생성하고 버리지 않는다.
- 보관함: `worker/lib/record-library.js`에서 V2 개인판(`deliveryMeta.chapterPlanVersion` 투영)은 V2 표로 판정한다. 본문이 있으면 완료다. V1은 기존 0.5×minChars 기준 그대로다.
- **사용자 결정 필요(SEO·사용자 노출 문구, 고치지 않음)**: 개인판에도 "5만 자"라고 약속하는 문구가 남아 있다.
  - `app/master-love-codex/page.tsx:170` "총 5만 자를 목표로"
  - `app/master-love-codex/MasterLoveCodexRouteClient.tsx:26` "20개 챕터·총 5만 자 목표"
  - `src/features/master-love-codex/components/CodexProductIntroduction.tsx:17` "개인판 · 20개 챕터 · 총 5만 자 목표"(:21 궁합편도 같다)
  - `lib/marketing/result-samples.json:99,131`
  - `lib/marketing/feature-visual-details.generated.json:1624,1673`
  - `lib/marketing/feature-marketing-copy.generated.json:8352,8508` "20개 챕터 합계 목표 50,000자"
  - `docs/purchase-journey/inventory.json:8261,8484` "46,000자"
  - 개인판만 "2~3만 자"로 바꿀지 사용자가 정한다.

#### 5단계 보정 실호출 샘플 (개인판, 2026-11-08, 커밋 bd6392a12 기준)
- 결과: completed, plan 2, 20장. 장 순서와 제목은 계획 그대로이고 outline 이슈는 0개다.
- 분량: 총 26,372자로 목표 20~30k 안이다. 장별 1,389~2,601자이고 floor 미만인 장은 없다.
  - 18/20장이 장별 상한(hi)을 넘었다. 총량이 범위 안이라 지금은 두지만, 장별 상한은 지켜지지 않는다.
- 호출: 요청 25회, 생성 호출 24회(provider_call 로그 48줄 중 24줄은 0자 예열·캐시 호출), 323초.
  - 재시도 4장: timing, parting-reunion, cross-check, three-years. F19 상한 4 안이다.
- 반복과 인용: crossRepeat 0, 저장된 softIssues 0, 질문 재인용 0, 금칙어 0, 환불 없음.
- 산출물: `scratchpad\codex-solo-v3\live\out-solo\{summary.json,doc.json,full.md}`(저장소 밖).
- 하네스는 `scratchpad\codex-solo-v3\live\`(run.mjs, register.mjs, stubs, `--mock` 모드)다. 6단계 하네스를 만들 때 본뜬다.

### 6단계 초융합 운세 (2026-11-08)

- 커밋: adda62200 (그룹 계획 2판: 마지막 시도 구제·분량/소프트 수리 최대 2묶음·질문은 사주 프롬프트에만·조립 반복 정리 85% 하한·근거 경로 소유), 2e14642bb (보관함 초융합 PDF 저장 버튼), 9666472ee (6c 감사 요약).
- 2판은 새 세션에만 `groupPlanVersion: 2`로 고정, `FUSION_GROUP_PLAN_V2_ENABLED=false`로 되돌림. 옛 프롬프트 sha256 기준선은 그대로(jest로 확인).
- 검증: jest 초융합 5개 묶음 218개 통과, `npx tsc --noEmit` 통과. verify-fusion-* 통과, 단 `verify-fusion-paid-efficiency.mjs`는 HEAD에서도 실패하는 기존 실패(옛 SHA 20fd46f6과 비교, 묶음당 입력 +약 500자), `verify-fusion-paid-reopen-browser.mjs`(360px)는 13070 서버가 필요해 미실행. `npm run build`는 메인 트리 dev 서버 가드 때문에 `ALLOW_DEV_SERVER_DURING_BUILD=1`로 돌렸고 성공(EXIT 0). build가 고친 sitemap 파일은 되돌림.
- 목 dry-run: 9요청·목 호출 16·실제 fetch 0·14/14묶음·56,528자, domainYun 3,325→6,619 수리, 사주 REGISTER_DRIFT 수리, 반복·질문 재인용 0.
- 실호출 샘플 1회(승인분 소진): 완료됐지만 qualityTier `degraded`("일부 묶음이 목표 분량에 못 미친 상태로 전해 드립니다."). 11요청·생성 호출 19(캐시·count 포함 provider 60)·310초·11/14묶음·본문 32,293자(2판 하한 48k 미달). 0자: lifeCycle·marriage·wealth·career·health·relations — domainYun·domainHanbi·domainNeo가 두 번 다 `GEMINI_INVALID_REQUEST:400`(약 1초씩 6회, 응답 본문 미기록). domainMusung·domainYeoni는 성공. 사주 수리 2576→3160(soft 1 남음), 숙요 수리. 마지막 호출 MAX_TOKENS. 묶음 간 중복 3·repeatedPassage true, 질문 재인용 0.
- 미해결: 세 도메인 묶음 400 원인(오프라인으로 2판/옛 v2 프롬프트·스키마 비교, gemini 오류 본문 기록 필요, 실호출 재시도는 별도 승인), 내용 없는 필수 묶음 소진 시 배달 차단, 선택 타로 카드 검사는 구제 불가, 400 뒤 선택 도메인 묶음은 결과에서 빠짐.
- 하네스: scratchpad `fusion-live/run.mjs`(작업 트리 cwd에서 `--mock`/`--live`, requestUrl 필요).

#### 6단계 400 오프라인 진단 (2026-11-08, 실호출 없음)
- 방법: scratchpad `fusion-400/diag.mjs`가 모든 묶음의 geminiSchema를 2판/옛 계획으로 다시 만든다(google fetch는 막고 ephemeris만 통과).
- 원인(확정에 가까운 추정): 세 묶음은 본문 키가 2개씩이고, 키마다 `subchapters.items.evidenceKeys.items.enum`에 6체계 전체 근거 경로 약 60개(문자 약 1,650)를 반복해 넣는다(`systems: []`라 전 체계). maxItems 6과 곱하면 enum 상태가 통과 묶음의 2배(문자 3,312~3,317, enum 값 126개)라 Gemini가 "스키마가 너무 복잡함" 400을 생성 전에 돌려준다(약 1초). 통과 묶음은 모두 enum 문자 ≤1,656. 토큰·프롬프트 길이·모델·thinking은 통과 묶음과 같다.
- 운영 영향: 옛 계획 스키마도 바이트가 같다 → origin/main(159c40eef, 2026-10-17부터)에도 있다. 플래그 `FUSION_PREMIUM_V2_ENABLED` 미설정 = v2라 운영 v2 주문은 분야 장 6개가 조용히 빠진 degraded로 나갔을 가능성이 높다(운영 로그는 확인 못 함).
- 수정 방향: 2판에서 enum 예산 초과 시 subchapter evidenceKeys enum을 빼고 경로 목록을 프롬프트에 둔다(2판 수용은 `normalizeFusionPlan2Subchapters`가 잘못된 키를 고쳐 안전). 400이면 단순 스키마→스키마 없음으로 같은 시도 안에서 다시 보낸다. 오류 본문을 잘라·가려 기록한다. 빈 분야 장은 배달하지 않는다.
- 수정 완료 `e929c2114`:
  - 2판 enum 예산(`FUSION_GEMINI_ENUM_CHAR_BUDGET` = 2,000). 넘으면 소챕터 근거 enum을 빼고 경로 목록을 프롬프트 끝에 둔다. 실제 컨텍스트에서 분야 3묶음은 3,315 → 약 30, Musung·Yeoni는 1,656 그대로(실호출 통과분).
  - `fusionGeminiSchemaIssues`로 전송 스키마를 검사하는 회귀 테스트(실제 근거 키 이름·개수).
  - 400이면 같은 시도 안에서 단순 스키마(enum·개수 제한 없음) → 스키마 없음(JSON 형식은 프롬프트) 순서로 다시 보낸다(`[fusion-fortune-schema-fallback]`).
  - 시도를 다 쓴 선택 묶음의 빈 장은 장 하나씩 `rescue-<키>` 예약으로 다시 요청한다(장마다 최대 2회, `[fusion-fortune-chapter-rescue]`). 그래도 비면 배달은 막지 않는다(domain_chapter_missing 강등) — 사용자 결정 필요 항목.
  - `lib/llm-client.ts` `[llm provider_error]`: 상태·providerStatus·sectionGroup·hasResponseSchema·오류 본문 300자(키·URL·이메일·긴 인용 가림).
  - 옛 계획(v1·expert·premiumV1·premiumV2) sha256 기준선 그대로. 옛 2판 이전 세션도 런타임 400 재전송·구제의 혜택은 받는다(스키마 바이트는 그대로라 첫 호출은 여전히 400).
- 검증: jest 초융합+gemini-json 228개 통과, node gemini-model-routing·input-token-limit·total-generation-budget 통과, `npx tsc --noEmit` 통과. 목 dry-run `run.mjs --mock` 14/14·full·56,528자. `run.mjs --mock --reject400`(예산 초과 스키마·domainNeo enum·domainHanbi 2장 요청을 400으로): 예산 초과 400 0회, domainNeo 같은 시도 안 단순 스키마로 성공, domainHanbi 2시도×3단계 400 뒤 장 단위 구제로 2장 채움 → 14/14·full·실제 fetch 0.
- 🔴 실호출 재검증은 사용자 승인이 필요하다(승인분 소진). 하네스는 준비됨: 작업 트리 cwd에서 `node <scratchpad>/fusion-live/run.mjs --live`.

#### 6a 인연의 서 개인판 분량 문구 (2026-11-08)
- 커밋 `e85004c5a`. 원본은 셸 `index.html`이고 `npm run sync:marketing-copy`로 생성 JSON(`lib/marketing/feature-marketing-copy.generated.json`, `feature-visual-details.generated.json`)을 다시 만들었다. public 각 언어 index.html, `public/feature-details/master-love-codex.json`, `app/master-love-codex/page.tsx` 메타, `MasterLoveCodexRouteClient.tsx`, `CodexProductIntroduction.tsx`(개인판만), `lib/marketing/result-samples.json`을 고쳤다.
- 개인판: "20개 챕터 합계 목표 20,000~30,000자" / "총 2~3만 자". 궁합판 "총 5만 자"는 그대로다. 공용 문장은 "개인판은 총 2~3만 자·궁합판은 총 5만 자를 목표로"로 바꿨다.
- 건드리지 않음: 흑월 "약 5만 자"(다른 상품), `worker/` 코드 주석, `docs/purchase-journey/inventory.json`(문서 스냅숏).
- 검증: consultation-samples·feature-visual-details 21개, feature-marketing-copy-generated·codex i18n static 9개 통과, `verify-feature-marketing-schema` OK.

#### 6b 조판 PDF 요약·도표 페이지 (2026-11-08)
- 커밋 `e82d1dd89`. 새 `lib/pdf/radar-chart.ts`(저장된 점수로 레이더, 축 3개 미만이면 표로 대체). `typesetConsultationBook`에 `summary` 옵션을 추가했다: 1장 앞에 번호 없는 목차 항목과 단독 페이지로 들어가고, 그림 종류는 lead·bars·radar·list·timeline이다. summary가 없으면 출력 바이트가 같다.
- 운명의 업: `buildKarmaPdfSummary`(한 문장·글자 수·장 수·키워드, 에너지 막대+근거, 렌즈 기여 레이더, 운명 지도, 실천 목록). 결과 화면(`KarmaDestinyAiResultClient.tsx`)과 보관함(`SavedKarmaPdfButton.tsx`) 양쪽에 넣었다.
- 인연의 서(개인·궁합): `buildMasterLoveCodexPdfSummary`(연애 유형·요약·장 수·글자 수, 연애 DNA 막대+근거). `CodexReader.tsx`가 결과·보관함 공용이다. 화면에 레이더가 없어 PDF에도 넣지 않았다.
- 검증: PDF 테스트 13개, ui pdf·karma·codex 115개 통과, `npx tsc --noEmit` 통과. Paperlogy 글꼴로 만든 샘플(scratchpad `pdf6b/{karma,codex-solo,codex-compat}.pdf`)을 `pdftotext -enc UTF-8 -layout`으로 확인했다: 목차 "한눈에 보기", 막대 값, 레이더 축 라벨·%, 운명 지도, 실천 목록. 래스터라이저가 없어(pdftoppm·python 없음) 이미지로는 확인하지 못했다. 레이더 모양은 사람이 한 번 봐야 한다.
- 빌드: 6a·6b 반영 뒤 `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build` EXIT 0. build가 고친 sitemap·lastmod·셸 index.html(빌드 해시만)은 되돌렸다.
- 함정: `pdftotext`는 `-enc UTF-8` 없이 쓰면 한글이 사라진다. `__tests__/ui`는 jest가 무시하므로 `node --test`로 돌린다.

## 6단계 진행 메모 (조사 완료, 구현 전 — 2026-11-08)

### 조사로 확인한 사실 (파일:줄은 이 워크트리 기준)
- 판이 셋이다. v1은 `reportVersion`이 없다. expert는 `context.version === "fusion-expert.v2"`(`worker/lib/fusion-expert-contract.js:1`)다. premium은 `reportVersion` "fusion-premium.v1"/"fusion-premium.v2"(`lib/fusion-premium-report.js:3-6`)다. 클라이언트는 항상 V2를 보낸다(`app/fusion-fortune/FusionFortuneClient.tsx:2508`). 서버는 `FUSION_PREMIUM_V2_ENABLED=false`이고 이전 결과가 V2가 아니면 v1로 낮춘다(`worker/lib/fusion-fortune.js:1553`). 입력 해시에 reportVersion이 들어간다.
- 구성은 "2단계 · 9그룹"이다(`worker/lib/fusion-fortune-prompt.js:12-16`, `FUSION_SECTION_GROUP_SPECS` :232-339).
  - 1단계: saju(첫 장, "타고난 기질과 선택의 뿌리"), ziwei, vedic, sukuyo, astrology, tarot.
  - 2단계: integration, action, verdict.
  - V2는 선택 그룹 domainMusung·Yun·Yeoni·Hanbi·Neo를 더한다(:352-380). 이 그룹들의 8장 정의는 `lib/fusion-premium-report.js:20-29`이고, 장마다 min = target×0.72다.
  - V2 총량: min 48,000, 목표 60~80k(`lib/fusion-premium-report.js:42`).
- 호출 방식
  - 그룹 하나에 provider 호출 1회다. 결제·체크포인트 경로는 요청당 미완료 그룹을 최대 2개 처리한다(필수 그룹 먼저, 시도가 적은 그룹 먼저, :1150-1157).
  - 체크포인트는 `onCheckpoint(snapshot)`로 저장하고, 시도 횟수는 `snapshot.attempts`에 있다. 시도는 그룹당 2회다(`FUSION_GROUP_MAX_ATTEMPTS`, :716-719).
  - premium 토큰은 chars(target×1.3)+4096이고 상한은 65536이다(:763-769). 그룹 타임아웃은 85초다(:707, :1168).
- 품질 게이트
  - 그룹 수락은 `ignoreLength: true`라서 분량 때문에 반려되지 않는다(:1131).
  - 전달(`resolveFusionFortuneDelivery` :651-661)에서 분량·깊이·반복 이슈는 "degraded"로 보내고 치명이 아니다(:554-564).
  - **분량 수리 경로가 없다**(R5 분량 수리는 2026-10-30에 제거됨, :1129-1130).
  - **시도를 다 쓴 필수 그룹은 `deliverable:false, gemini_partial`로 끝난다(:1414-1418). 구제나 scrub 없이 환불 대상이 된다**(`worker/lib/fusion-fortune-recovery-task.js:74-112`). V2 선택 도메인 그룹은 시도를 다 쓰면 버려진다(:1411) — 이것은 "장 삭제 금지" 위반이다.
  - premium 치명 검사는 consultation_plan, subchapter_evidence, subchapters(4~6개)다(:1267-1281). Gemini 스키마는 소장을 1~6개 허용하는데 수락은 4~6개라서 1~3개 응답이 시도를 낭비한다(prompt:994 vs fusion-fortune.js:1280).
  - 말투 drift(`fusionVoiceDrift`, `worker/lib/expert-character-persona-text.js:370`)는 로그만 남긴다(:1300-1305).
  - 질문: premium은 `customerQuestion`과 `consultationPlan`을 모든 그룹 프롬프트에 넣는다(:966-967). `attachQuestionFocusedFusionReading`이 opening·summary·action 앞에 초점 라벨을 붙인다(fusion-fortune.js:691-703). 재인용 검사는 없다.
  - 반복 검사: 필드 안 반복(:972)은 그룹 실패다. 그룹 사이 60자·2회(:985)는 재시도다. 70자 문장이 3개 섹션 이상에 나오면(:535) degraded다. 본문에서 빼는 dedupe는 없다.
- 근거 경로
  - expert 신호 경로는 `[0]`을 `.0`으로 정규화한다(`fusion-expert-contract.js:28-29`). 맨 `yearlyLuck[0].pillar`처럼 시스템 접두가 없는 경로는 owner 검사에서 반려된다.
  - premium 소장 evidenceKeys는 `Set.has` 정확 일치이고, 맞지 않으면 치명이다(fusion-fortune.js:1278-1279). 스키마 enum이 있어 위험은 낮다.
- 화면·보관함·PDF
  - 결과 화면은 TOC 레일이 있는 장 화면이다(`app/fusion-fortune/_lib/toc.ts:35`, FusionResultRail).
  - 보관함은 `SavedFusionReading`(`app/fusion-fortune/SavedFusionReading.tsx`)이고 **PDF 버튼이 없다**.
  - 조판 PDF는 `lib/pdf/export-fusion-report-pdf.ts`(`exportFusionReportPdf` :157)와 `lib/pdf/fusion-report-plan.js`다. 결과 화면(`FusionFortuneClient.tsx:2806`)에서만 쓴다.
- 프롬프트 분기점은 `buildFusionSectionSystemPrompt`(:651), `buildFusionSectionPromptPrefix`(:674), `buildFusionSectionGroupPrompt`(:686)다. 셋 다 expert 판으로 분기한다. premium 문구는 `expertPromptPrefix`(:850)와 `buildExpertGroupPrompt`(:923-1015)에 있다. **캐시 prefix는 바이트가 같아야 한다**(:666-672).
- 테스트 목 진입점은 `generateFusionFortuneWithRealLLM`(fusion-fortune.js:1088)의 `providerCall` 인자다. `options.logContext.sectionGroup`으로 그룹을 가른다. 스위트는 `__tests__/worker/fusion-fortune.test.js`, `fusion-paid-delivery-route.test.js`, `fusion-snapshot-delivery.test.js`다. verify 스크립트는 `scripts/verify-fusion-fortune-{premium,premium-v2,quality,delivery-floor,pdf,stage-flow,retry-payload,reopen,live}.mjs`다.

### 설계 초안 (다음 에이전트가 TDD로 확정)
1. **판 분기**: 새 결제 세션에만 snapshot에 `groupPlanVersion: 2`를 박는다. 진행 중인 세션과 v1·expert·옛 premium-v2는 지금 동작과 프롬프트 바이트 그대로 끝낸다. 바이트 해시 테스트를 5단계처럼 둔다. reportVersion 문자열은 바꾸지 않는다(입력 해시와 클라이언트 영향).
2. **장 삭제 금지·마지막 시도 구제**: plan 2에서는 필수·선택 그룹 모두 마지막 시도를 `finalAttempt`로 표시한다. 파싱되는 필드는 살리고 위험 문장만 덜어 낸다. 소장 1~3개는 수락해 정규화한다. 필수 그룹이 비어 환불로 가는 경로와 도메인 그룹 drop을 막는 행동 테스트를 둔다.
3. **분량**: min 미만인 그룹만 수리하고, 가장 짧은 그룹부터 책당 최대 2개까지만 한다(F19 교훈: 모든 초안이 나온 뒤 시작). 분량은 치명이 아니다.
4. **1장 기질·공감**: saju 그룹의 plan 2 scope를 기질의 쉬운 뜻과 공감되는 일상 장면 2~3개로 바꾼다.
5. **질문 인용 1회**: plan 2에서는 질문 원문을 saju(또는 integration) 한 그룹에만 준다. 다른 그룹에는 요약 초점만 준다. 재인용은 소프트 이슈로 잡아 힌트를 붙여 수리하고, 조립할 때 85% 이상 남는 동안만 지운다(5단계 `codexRequotedSentences` 참고).
6. **말투**: `fusionVoiceDrift`를 plan 2에서는 로그에서 소프트 이슈로 올린다. 수리는 3번의 상한 안에서만 한다.
7. **dedupe**: 조립할 때 그룹 사이 같은 문장과 거의 같은 반복을 뺀다(`dedupeCodexBody`·`codexCrossRepeatSentences` 방식). 그룹이 비게 되면 원본을 둔다.
8. **보관함 PDF**: `SavedFusionReading`에 `exportFusionReportPdf`를 쓰는 PDF 버튼을 넣는다(1~4단계 Saved*PdfButton 관례). 글꼴을 불러오지 못하면 캡처로 대체한다.
9. **근거 경로**: 시스템 접두가 없는 `yearlyLuck[0].pillar`도 owner를 추론하거나 정규화하게 한다. 테스트를 둔다.
10. 검증: jest fusion 스위트, verify-fusion-* 전부, `npx tsc --noEmit`, `npm run build`, 360px 확인. 그다음 목 dry-run 1회와 실호출 샘플 1회를 한다(scratchpad 하네스는 `codex-solo-v3/live`를 본떠 만든다).
