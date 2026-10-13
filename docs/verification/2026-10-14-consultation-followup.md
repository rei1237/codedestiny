# 로그인·상담 품질·PDF·추천 동선 구현 근거 (2026-10-14)

## 구현과 재현

- 기준 fdcb60db94d40dc10809a29c95f0072485560d7a. 시작 당시 PR CI는 취소, 이전 cb4e36d 성공. 취소를 통과로 취급하지 않았다.
- AuthShell 이메일 폼은 name을 보내지 않지만 handleRegister가 name을 필수로 검사했다. 실제 폼 형식으로 mock Worker에 제출하여 missing_fields 400을 재현한 뒤 email/password만 필수 키로 수정했다. 이름 생성·휴대폰·나이 검증은 기존 서버 규칙이다.
- 네트워크 실패도 /failed/ 정규식 때문에 비밀번호 오류로 안내되었다. 실제 폼 브라우저 재현 후 인증 오류와 연결 오류를 분리했다. 이메일만 공백/대소문자 정리하고 비밀번호 공백은 그대로 보낸다.
- 가입 보상 정본은 js/core/signup-benefit-policy.mjs의 2000개/30일이다. 새 계정의 기존 원장·credit lot 생성 경로를 재사용하며 기존 회원 로그인/가입 재시도에는 추가 지급하지 않는다. 이용권·단건 가격·상품별 환산은 유지했다. 일반 환산은 billing-policy 정본으로 홈 생성 시 계산하며 영냥이의 현금 가치로 확대하지 않는다.
- PDF_BASELINE_REF=fdcb60db94d40dc10809a29c95f0072485560d7a로 같은 브라우저 fixture를 이전 exporter에서 생성했다. 폰트 실패 표지의 한글 깨짐을 실물 PDF로 재현했다. 수정본은 표지도 캔버스로 저장하고 본문 이미지를 페이지별로 잘라 여백/푸터 침범을 막는다. 텍스트 줄 경계로 분할점을 옮긴다.
- 초융합 긴 표지 제목은 글자 크기를 조절하고 주제는 줄바꿈한다. PC 폰트 fallback을 한글 시스템 글꼴로 명시했다. 제보자의 PC 원본 파일/환경은 없으므로 동일한 원인이라고 단정하지 않는다.
- 홈은 대표 상담 → 초융합 → 영냥이 → 무료 시작 4종 → 이용권 → 계정별 혜택 순서다. 무료 시작은 service-registry의 사주/타로/자미두수/숙요점이며 심화는 별도다. 나머지 검색·카테고리·설명은 전체 목록에서 유지한다. 영냥이 전용 홈은 변경하지 않았다.

## 상담 호출부와 적용 범위

공통 경로는 worker/lib/gemini.js → lib/llm-client.ts의 applyOutputLocale → 공급자다. 같은 정규화를 cache 생성/실제 호출에 적용하고 동일 안내는 한 번만 넣는다. Gemini, Anthropic, OpenAI, Workers AI 중 어느 공급자를 선택하든 사용자 상담에 같은 지침이 전달된다. 추출/분류 전용 요청에는 필드/해설을 추가하지 말라는 경계를 명시했다.

영냥이·연이·네오는 worker/yeongnyangi/providers/chapter.ts → prompts/system/fortune-master.ts → providers/code-destiny.ts 경로를 쓴다. fortune-master와 question-followup이 이미 공통 counsel 정본을 참조하므로 캐릭터·깊이·스키마는 유지된다. 초융합은 consultationPlan.questions/subchapters 역할을 추가로 명시한다. 네오 전략실도 동일 공통 정본을 참조한다. 계산 엔진, 저장 결과 스키마, 저장본 재열람/소유권은 변경하지 않았다.

아래는 현재 worker/lib 범위의 공통 gateway/호출 참조 41개 파일이다. 상품 수가 아니다. admin/Threads 등 상담 외 호출도 포함하므로 안내는 상담 해설에만 적용된다. worker 안의 외부 모델 API 직접 URL 검색은 0건이다. 현재 호출자가 없는 gemini-client 래퍼는 신규 상품으로 세지 않았다.

- lib/llm-cache.ts
- lib/llm-client.ts
- worker/lib/ai-locale-context.js
- worker/lib/celestial-report-delivery.js
- worker/lib/cms-prompts.js
- worker/lib/feature-question-delivery.js
- worker/lib/gemini-client.js
- worker/lib/gemini.js
- worker/lib/guardian-fortune-llm.js
- worker/lib/love-tarot-delivery.js
- worker/lib/mindscan-delivery.js
- worker/lib/naming-report-delivery-v2.js
- worker/lib/naming-report-delivery.js
- worker/lib/palm-vision.js
- worker/lib/structured-consultation.js
- worker/lib/tarot-oracle-delivery.js
- worker/lib/threads-ai-writer.js
- worker/lib/threads-daily-providers/shared.js
- worker/naming-engine/report.ts
- worker/routes/admin.js
- worker/routes/astrology-ai.js
- worker/routes/destiny-compass-ai.js
- worker/routes/dream.js
- worker/routes/fortune-tea-house.js
- worker/routes/fortune.js
- worker/routes/fusion-fortune.js
- worker/routes/karma-destiny-ai.js
- worker/routes/life-book-ai.js
- worker/routes/love-secret-ai.js
- worker/routes/master-love-codex.js
- worker/routes/nakshatra-ai.js
- worker/routes/neo-operation-room.js
- worker/routes/new-year-ai.js
- worker/routes/oracle.js
- worker/routes/saju-compat-basic.js
- worker/routes/sukuyo-compatibility-ai.js
- worker/routes/yoga-guru.js
- worker/routes/ziwei-ai.js
- worker/routes/ziwei-deep-report.js
- worker/yeongnyangi/providers/code-destiny.ts
- worker/yeongnyangi/question-followup.ts

### 전후 비교 기준 (실제 모델 출력 평가가 아님)

| 사례 | 피할 답 | 새 프롬프트가 요구하는 답의 역할 |
|---|---|---|
| 연애/연락 | 소통하세요 | 먼저 제안할 짧은 문장, 상대 반응을 관찰할 기준, 답이 없을 때 멈출 경계 |
| 재회 | 기다리면 돌아올 거예요 | 확인 가능한 관계 상태와 연락 이력, 우선 권고, 거절/무응답 시 전환 조건 |
| 진로 | 도전해 보세요 | 업무 범위·보상·생활 조건을 비교하고 먼저 확인할 한 항목과 실행 순서 |
| 재물 | 재물운이 좋아요 | 수입/고정지출/반복 지출을 확인할 행동, 과도한 확장의 부담, 판단을 바꿀 기준 |
| 정보 부족 | 둘 다 가능해요 | 부족한 사실을 명시하고 확인 방법과 결과별 선택을 제시 |

verify-consultation-counsel은 위 5질문의 wire에 공통 지침이 들어감, 중복 방지, cache 일치, JSON 스키마 보존을 mock으로 검사한다. 198개 영냥이 제품/질문 변형의 스냅샷에서는 요청 프롬프트 해시만 바뀌고 ID·계산 준비·결과 검증·상품 manifest 해시는 그대로였다. 답변 내용의 실제 품질·반복률·정확도는 실 LLM을 호출하지 않았으므로 미측정이다. 기존 구매 결과에 프롬프트 변경을 이유로 재생성을 요구하지 않는다.

## PDF 공유 호출부

공용 capture exporter 참조 15개 파일(주석만 있는 항목 포함):

- app/astrology-ai/result/AstrologyAiResultClient.tsx
- app/destiny-compass/_components/ReportActions.tsx
- app/fusion-fortune/FusionFortuneClient.tsx
- app/island-consult/IslandConsultClient.tsx
- app/karma-destiny-ai/KarmaDestinyAiClient.tsx
- app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx
- app/life-book-ai/result/LifeBookAiResultClient.tsx
- app/love-secret-ai/result/LoveSecretAiResultClient.tsx
- app/nakshatra/ai/NakshatraAiClient.tsx
- app/nakshatra/vvip/VvipClient.tsx
- app/naming-ai/result/NamingAiResultClient.tsx
- app/new-year-ai-consultation/NewYearAiClient.tsx
- app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx
- app/vedic-ai/VedicAiClient.tsx
- app/ziwei-ai/ZiweiAiClient.tsx

텍스트 조판은 fusion-report-plan → typeset-writer 경로이며 공통 writer 규격을 변경하지 않았다. 공통 캔버스 동작을 긴 문단 70개/표 16행 fixture로 검사했다. 모든 상품의 실제 결과 DOM별 PDF를 생성한 것은 아니다.

## 검증 증거

로컬 증거: D:/Development/code-destiny/build-cache/consultation-followup-20261014 (합성 입력만, 개인 정보/운영 데이터 없음).

- auth 실제 AuthShell 브라우저 10개 시나리오 통과: 신규/기존/비밀번호 오류/OAuth 전용/CSRF 거절/503/네트워크/세션 만료/카카오 취소/네이버 취소. 취소 사례는 공급자에서 돌아온 URL을 모사한 뒤 이메일 로그인으로 보관함에 복귀한다. 가입→로그인·OAuth 전용 계정의 이메일 차단 Worker 테스트 포함 인증 33개 통과.
- auth-p0p1 PASS, auth-session-stability 6/6, signup-phone-required OK.
- consultation-counsel 5질문/중복/cache/schema PASS; ai-locale-pipeline 14 invariants PASS; llm-token-usage PASS; fusion premium mock 9 provider calls PASS.
- 초융합 저장본 재열람: Windows Chrome/Edge 각각 360/390/430/1280(DPR1,1.25)/1440(DPR1,1.25), 가로 넘침 0, 마지막 문단 확인. LLM/결제/차감 0. pageshow/focus/online/visibilitychange/storage-blocked 복구 mock 확인. Edge 초기 pending GET 15초 시간 초과 1회 후 서버 파일 변경이 없는 재실행 통과. flaky 기록을 감추지 않는다.
- 홈 Chrome/Edge 위 14개 viewport 통과. 추천 순서/검색 시 전체 목록 열림/인증 pending·guest·member/팝업 결제 중 억제/오늘 숨김/기본 CTA 키보드 포커스·44px 검사. 라이트와 다크 screenshot 확인.
- 실제 PDF 3종: typeset 27쪽, 긴 표지 27쪽, 폰트 실패 capture 14쪽. Poppler 전 페이지 PNG/contact sheet 시각 확인. 조판 본문/목차/마지막 페이지 텍스트 추출 확인. 인쇄 푸터를 제외하고 조판 계획의 76개 텍스트 블록 전부 존재함을 검사했다(누락 0). 빈 페이지는 없지만 합성 장문의 일부 장 끝은 한 항목만 다음 페이지에 남는 기존 조판 여백이 있다.
- impeccable detect: anti-pattern 0, 기존 포함 font-size advisory 83. 보고하지 않은 전체 화면 접근성/실기기 검증을 통과로 간주하지 않는다.
- npm run check:fast -- --plan: critical. npm run check:fast 최종 exit 0: paid gate 88/88, lint/typecheck, Node 3211/3211, Jest 395 suites / 6035 tests, Worker dry-run build, encoding, sitemap drift 통과. pre-push/push/CI는 전달 절차에서 별도로 확인한다.

## 유지 및 확인 범위

실 LLM/실결제/운영 DB 쓰기/운영 승격 0. OAuth 공급자 실제 로그인·실기기·실제 회원 세션·원본 제보 PDF는 미검증. 공통 OAuth 취소/앱 복귀·세션 만료·보관함 소유권은 기존 mock 회귀로 확인했다. 카카오/네이버 공급자별 실제 취소 왕복은 확인하지 않았다. 신규 보상만 승인된 정책 변경이며 기존 결과 원본과 결제/접근 권한 구조는 유지한다.
