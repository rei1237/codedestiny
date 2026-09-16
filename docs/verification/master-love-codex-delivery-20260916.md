# 마스터 인연의 서 생성·모바일 전달 검증

개인판·궁합판의 20장, 장별 최소 분량, 계산 엔진, 교차 판정과 생시 미상 한계를 유지한다. 가격·이용권·월정석·단건 결제 정책과 환급 조건은 변경하지 않았다. 운영 배포를 검증한 기록은 아니다.

## 수정 파일과 의도

- `worker/routes/master-love-codex.js`: 저장된 필수 장 ID로 진행률을 계산하고 연속해서 읽을 수 있는 장수를 분리한다. 오류별 교정 지시, 최대 3회 생성 예약, 검증된 구매본별 캐시, 공급자 백오프, 확인 필요 상태와 구매 실행 기록의 완료 동기화를 보존한다.
- `worker/lib/master-love-codex-quality.js`, `master-love-codex-prompt.mjs`, `master-love-codex-compat-prompt.mjs`: 장별 계산 근거와 앞 장 요약을 사용한다. 출력 잘림에만 토큰 여유를 늘린다. 품질 검사 기준은 그대로다. 스테이징 fixture도 반복 문장 게이트를 통과할 수 있게 문장별 검증 ID를 붙였다.
- `lib/llm-client.ts`, `worker/lib/gemini.js`: 인연의 서의 공급자 내부 재시도를 1회로 제한하는 선택적 설정을 전달한다. 다른 기능의 기본값은 유지한다.
- `worker/lib/master-love-codex-recovery-task.js`, `master-love-codex-paid-bootstrap.js`, `worker/index.js`: 기존 크론에서 4분 예산·최대 3세션 순환, 매 배치 새 잠금, 승인 후 `/start` 이전 종료 복구, 입력 없는 구매의 재입력 권리 보존, 완료 실행 기록 재동기화 및 정체·예산 소진 집계를 처리한다.
- `src/features/master-love-codex/_lib/runCodexBatches.ts`, `copy.ts`, `MasterLoveCodexPage.tsx`, `app/master-love-codex/result/MasterLoveCodexResultClient.tsx`: JSON 본문까지 요청 시간 예산을 적용한다. 최신 저장본 조회 후 이어쓰기, 복귀 이벤트 합류, 서버 대기 시간 준수와 명시적인 자동 재시도 중단을 처리한다. 원래 입력의 출력 언어도 서버 복구에 보존한다.
- `js/destiny-profile.js`와 public 사본: 승인 후 권한 지급 대기에서도 다음 조회를 예약하고 페이지 캐시·온라인·화면 활성화 복귀를 같은 주문 실행에 합류시킨다.
- 결제 런타임을 참조하는 React·독립 정적 페이지·public 사본의 변경은 캐시 키 갱신이다. `scripts/restamp-paid-runtime-pins.mjs`로 내용 기반 키를 재생성하며 검증기 기대 키도 함께 갱신했다. 해당 서비스의 생성 로직은 수정하지 않았다.
- 관련 `__tests__/worker/master-love-codex-*.test.js`, `__tests__/ui/master-love-codex-*.behavior.test.js`, `paid-report-partial.behavior.test.js`, `direct-payment-poll-safety-net.behavior.test.js`와 `scripts/verify-master-love-codex-efficiency.mjs`: 아래 모의 회귀와 입력 크기를 검증한다.

## 재현 및 검증 명령

```powershell
npm run test:jest -- --runInBand __tests__/worker/master-love-codex-paid-bootstrap.test.js __tests__/worker/master-love-codex-paid-delivery.test.js __tests__/worker/master-love-codex-recovery-task.test.js __tests__/worker/master-love-codex-quality.test.js __tests__/worker/master-love-codex-evidence.test.js __tests__/worker/master-love-codex-recovery.test.js __tests__/worker/master-love-codex-pass-refund.test.js
node --test __tests__/ui/master-love-codex-resume-on-result.behavior.test.js __tests__/ui/master-love-codex-purchase-recovery.behavior.test.js __tests__/ui/paid-report-partial.behavior.test.js
node --test __tests__/ui/direct-payment-resume.behavior.test.js __tests__/ui/direct-payment-poll-safety-net.behavior.test.js
node scripts/verify-master-love-codex-efficiency.mjs
npm run verify:master-love-codex-budget
npm run verify:direct-confirm-pending-recovery
npm run verify:payment-choice-parity -- --self-test
npm run verify:worker-no-undef
npm run verify:cron-mongo-op-coverage
npm run check:fast -- --plan
npm run check:fast
```

검증에는 외부 네트워크 차단과 mock을 사용한다. 1장 저장, 2장 실패·뒤 장 성공, 잘림 교정, 공급자 거절 후 회복, 불확실한 타임아웃 3회 상한, 저장 확인 유실, 검증된 캐시 복구, 잠금 만료와 동시 요청, 새 문서 20장 재열람, 권한 지급 지연, 복귀 URL 미도착, 페이지 캐시·온라인 활성화, JSON 본문 정체, 브라우저 없이 크론 완주 및 4분 예산 중단을 재현한다. 저장소 차단·서버 암호화 복구는 기존 결제 복귀 검사도 함께 유지한다.

## 동일 입력의 모의 계측

| 판 | 최적화 전 입력 문자 | 최적화 후 입력 문자 | 감소 | 성공 호출 | 재열람 추가 호출 |
|---|---:|---:|---:|---:|---:|
| 개인판 | 226,605 | 204,605 | 9.7% | 20 | 0 |
| 궁합판 | 399,306 | 330,046 | 17.3% | 20 | 0 |

이 비교는 같은 계산 근거·출력 계약·20장·앞 장 요약을 사용한다. 최적화 전은 전체 명식·명반·궁합 설명과 근거 계약을 함께 보냈으며, 최적화 후는 원국 기준점과 장별 근거 계약을 사용한다. 스크립트의 입력 토큰 추정은 문자 수/4이며 청구 토큰 측정치가 아니다. 실제 모델의 서술 품질·실사용 토큰은 과금 호출을 실행하지 않아 미검증이다.

## 운영 확인과 남은 경계

- 기존 `[master-love-codex-recovery]` 로그에 구매 세션 생성/입력 필요, 배치 결과, `reviewNeeded`(예산 소진), `stalled`(30분 이상 미완성) 집계를 남긴다. 기존 구매 실행 기록에도 `generation_failed`와 장 ID별 예산 소진 오류를 반영한다.
- 명시적인 `retryable:false`는 자동 생성 반복을 중단한다. 구매 권리와 부분 저장은 보존한다. 장기 외부 장애를 완료로 표시하지 않는다.
- 실제 PG, 실기기/카카오페이 앱 전환, 과금 LLM, 운영 DB 및 운영 승격은 별도 확인 대상이다. 이 변경의 main CI 결과는 최종 전달 시 확인한다.
- 작업 전부터 존재한 마케팅 변경 및 동시 작업의 음악 기능 커밋은 보존한다.
