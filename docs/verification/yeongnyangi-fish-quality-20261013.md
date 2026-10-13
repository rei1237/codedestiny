# 영냥이 생선 자유 선택·시기 품질·참치 모델 복구 검증

검수일: 2026-10-13 (Asia/Seoul). 실제 LLM 생성·실결제·운영 DB 쓰기·운영 승격은 실행하지 않았다.

## 변경과 유지 계약

- 추천은 초기 선택으로만 사용한다. 사용자는 여섯 단일 체계에서 네 생선을 선택하며 질문의 대상·기간·계산 지원 범위는 별도로 검증한다. 선택은 질문 수정·로그인 복귀·새로고침에 보존된다.
- 가격 등록소, 기존 주문 스냅샷, 추가 질문 0·1·2·6회, 장 수 6·11·15·24, 최초 목표 9,000~10,500 / 22,000~28,600 / 31,500~39,000 / 50,400~64,800자를 유지한다. 분량만으로 결과를 폐기하는 조건을 추가하지 않았다.
- 참치 Pro 404는 기존 서버 `recoveryAudit.receipt`로 판정한다. 다음 허용 시도부터 Flash로 복구하고 Pro 강제 태스크를 해제한다. 인증·쿼터·다른 HTTP 오류는 이 전환 조건이 아니며 기존 재시도 상한을 늘리지 않았다. 공유 응답 캐시는 실제 모델을 포함한 키를 유지한다.
- 괄호 없는 상대 연도를 교정하고, 근거 없는 시기 문장은 명시적인 한계 안내로 바꾼다. 정상 전달과 fallback 모두 핵심 시기 검사를 거친다. 타로는 요청 기간을 사건 근거로 사용하지 않으며 장별 담당 자리와 필요한 카드 중심으로 작성하도록 안내한다.
- 결제·이용권·월정석·환불 정책, 인증, DB 스키마, 기존 구매 결과를 수정하지 않았다.

## 취소 주문 조사

사용자가 지정한 주문 `cd9ce0a3…3ba86b54`의 읽기 전용 조사 결과:

- 참치 30,000원에서 월정석 2,700개(27,000원) 할인 후 PG 3,000원 결제.
- 첫 장에서 `gemini-2.5-pro` HTTP 404가 6회 기록되고 저장 결과는 0장. 전달 실패 환불 절차가 완료됐다.
- 월정석 원장에 2,700개 사용과 동일 수량 복원이 확인됐다. 이 주문을 재생성하거나 다시 차감하지 않았다.
- 당시 조회한 운영 Worker SHA `63ae9564903a789e867295a1c444520b3881c353`에는 일반 참치 본문 Flash 전환 커밋 `d8a868f09`가 없었다. 이 관찰은 이번 변경의 운영 반영 증거가 아니다.

## mock 및 화면 증거

- 관련 Node 회귀: 55/55와 63/63 통과. 자유 선택·입력 완결성·기존 분량·추가 질문·Pro 404 후 다음 Flash 시도·환불 주문 제외·정상/fallback 시기 교정을 검증했다.
- `node scripts/qa/verify-yeongnyangi-intake.mjs`: 실제 React 컴포넌트와 mock API로 통과. 네 생선·키보드 방향키·선택 후 새로고침·로그인·프로필 저장 오류/재시도·궁합·장기 흐름·이직·타로·미지원 계산·필수 입력 복귀를 검증했다. 주문 준비 요청은 mock 5건이며 실제 결제가 아니다.
- 360/390/430/1440px에서 문서 가로 넘침 0. 화면은 `artifacts/yn-quality-fish-20261013/fish-{width}.png`에 보관했다. 390px/1440px을 시각 검수했고 새 라디오 영역에 기존 입력 스타일이 간섭하는 문제를 수정했다.
- Impeccable detector: 변경 UI에서 진단 배열 `[]`.
- 최초 `check:fast`에서 이전 결과의 날짜 거부와 타로 요청 불변성 3건, 변경된 UI의 옛 정적 계약 1건을 발견했다. 교정 경로를 질문 계약으로 분리해 45/45 회귀와 1/1 전체 상품 불변성이 통과했다. 불변성 스냅샷 기대값은 갱신하지 않았다.
- 재실행한 RED 검증에서 공통 유료 게이트 88/88(전체 npm test 포함)과 lint가 통과했다. 이후 사이트맵 원장 드리프트는 정식 생성기로 수정했고, 이미 통과한 전체 검사를 반복하지 않고 타입 검사·환경 계약·남은 정적 검사·Worker dry-run 빌드를 완료했다. 실제 배포는 아니다.
- 최신 main의 환경 계약 수정과 동기화했다. `.env`는 수정하지 않았다. `check:pre-push`의 홈 레지스트리·미러 freshness·사이트맵 검사는 통과했다. 원격 CI는 push 후 최종 보고에서 확인한다.

## 원문 QA와 현재 검사 구분

주문 식별자는 일부 생략했다.

동일 폴더의 `yeongnyangi-fish-quality-20261013.json`은 생성 버전·검수일·원문 해시·검사 코드 SHA와 교정 전/후 결과를 기록한다. 원본 `result.md`, `raw.json`, `presented.json`은 덮어쓰지 않는다.

- Y1: 저장 원문 6장째 상대 연도 오류를 재현했고 교정 후 시기 검사를 통과했다. 현재 명리 교정기가 수정하는 기존 표현도 변경 장 수에 포함된다.
- Z/A: 저장 원문 각 7장에 과거 유년사화/시기 오류 판정이 남아 있지만 현재 시기 검사에서는 재현되지 않았다.
- T: 저장 원문 첫 장의 근거 없는 시기 문장을 재현했고 교정 후 통과했다. 2·3·7장 카드 반복 경고는 남는다.
- 이 결과는 저장 원문의 시기·타로 규칙에 대한 오프라인 검사다. 전체 의미 품질과 새 모델 생성 품질은 `EDITORIAL_REVIEW_REQUIRED`/`NOT_VERIFIED`로 남긴다. 신규 실호출과 운영 승격은 각각 별도 승인 범위다.

## 재현 명령

```powershell
node --test __tests__/ui/yeongnyangi-fish-choice.test.mjs __tests__/ui/yeongnyangi-consultation.test.mjs __tests__/ui/yeongnyangi-tarot-chapter-discipline.test.mjs __tests__/ui/yeongnyangi-chapter-completion.test.mjs
node scripts/qa/recheck-yeongnyangi-samples.mjs --samples=D:/Development/code-destiny/build-cache/llm-sample-review-20261009
node scripts/qa/verify-yeongnyangi-intake.mjs
npm run check:fast
npm run check:pre-push
```

## 검증한 변경 단위

- 모델 복구: `fc0554718` (서버 영수증 기반 다음 시도 Flash).
- 생선 선택: `cdb49df56` (기존 productId·질문·분량 계약 재사용).
- 질문 품질: `078cb5467` (이전 v5/v7 거부 계약·불변성 유지).
- 생성 미러 목록: `7c6b49f5b` (동일한 소스·public 스타일의 자동 검색 제외 원장 동기화, 실행 동작 변경 없음).

## 수정 파일

- 선택 UI: `app/yeongnyangi/_components/Consultation.tsx`, `IntakeChat.tsx`, `QuestionFishPicker.tsx`, `question-fish-picker.module.css`, `app/yeongnyangi/_lib/intake-chat.ts`.
- 질문 계약·모델: `worker/yeongnyangi/fortune/ask/question-policy.ts`, `worker/yeongnyangi/fortune/tuna-quality.ts`, `worker/yeongnyangi/service.ts`.
- 시기·카드: `worker/yeongnyangi/fortune/consultation.ts`, `worker/yeongnyangi/fortune/tarot/chapter-discipline.ts`, `worker/yeongnyangi/providers/chapter.ts`, `delivery.ts`.
- 회귀: `__tests__/ui/yeongnyangi-{fish-choice,model-recovery,question-policy,question-flow.static,consultation,chapter-completion,tarot-chapter-discipline}.test.mjs`.
- QA: `scripts/qa/verify-yeongnyangi-intake.mjs`, `recheck-yeongnyangi-samples.mjs`, 이 검증 문서·JSON·화면 PNG 4개.
- 계약 문서: `docs/context/yeongnyangi-question-consultation.md`. 생성 원장: `config/sitemap-lastmod.json`, `.ignore`.
