# 영냥이 질문 중심 상담 검증 — 2026-09-22

## 확인된 원인과 변경

- 주제·질문은 기존 서버 스냅샷에 있었지만 결과 응답에서 빠졌다. 상담 입력·질문별 식별자·서버 기준일·IANA 시간대·분석 범위를 결과와 보관함에 반환한다. 질문별 답변은 첫 챕터에 배정하고 빠진 답변은 완료로 인정하지 않는다.
- 기존 브라우저 반복 생성 요청을 상태 조회로 바꿨다. 결제 확인 → 큐 등록 → 미저장 챕터 하나 생성 → 저장·재조회 → 다음 메시지 순서다. 모든 챕터 저장 확인 뒤에만 완료한다. 기존 부분 결과와 결제 증명을 재사용한다.
- 기존 복구 버튼은 미완성 기본 본문을 생성했다. 이제 제한된 자동 복구가 중단된 경우에만 동일 결제의 복구 버튼을 표시한다. 추가 질문 과금 기능으로 전환하지 않았다.
- 만료된 마지막 생성 잠금이 저장된 최종 챕터의 완료 처리를 막는 조건을 수정했다. 중복 수동 복구의 경합도 원래 상담을 반환하도록 수정했다.
- 내부 근거 ID는 검증용 sources에만 남긴다. 본문·제목·요약·질문별 답변에 내부 키가 노출되면 거절한다. 실제 계산된 오행·십성·월령 등의 전문 근거와 쉬운 설명을 요구한다. 계산하지 않은 정밀 날짜를 거절하고 근거 없는 기간은 실천·점검 기간으로 구분한다.
- 루트는 이미 영냥이 홈이었다. 무료 운세 중심 대표 버튼을 상담 입력으로 연결했다. 접힌 보조 화면의 fixed 배경이 클릭을 가로막는 현상은 실제 브라우저에서 재현 후 수정했다. 대표 이미지와 보조 운세 동선은 유지했다.
- 로그인 전 입력은 같은 탭의 임시 초안으로 복원하고 서버 저장 이후 제거한다. 결제 이후 입력은 서버 스냅샷이 정본이다.

## 실행한 검증

모든 생성·결제·DB 테스트는 mock이다. 실제 서비스의 답변 의미 품질이나 운영 장애 원인을 증명하는 결과가 아니다.

| 명령 / 범위 | 결과 |
| --- | --- |
| `npm run check:fast -- --plan`, `npm run check:fast` | critical 분류. paid-gate suite 88/88 통과(전체 npm test 포함). sitemap drift에서 중단 후 재생성·해당 검사 별도 통과. 전체 runner를 재실행하지 않음 |
| Worker repository / queue / route / recovery Jest 4 suites | 최종 62/62 통과. 28챕터 브라우저 없는 소비, 중복, 재시도 상한, 환불 차단, 저장·재조회 실패, 완료 복구 포함 |
| `node --test __tests__/ui/yeongnyangi-consultation.test.mjs __tests__/ui/yeongnyangi-provider-boundaries.test.mjs __tests__/ui/yeongnyangi-queue-config.test.mjs` | 12/12 통과. 복수·빈 질문, 주제 불일치, 지시문 경계, 시기, 내부 키, 출력 잘림, timeout, 큐 환경 분리 |
| `node scripts/verify-yeongnyangi-engines.mjs` | 35 엔진·상품 계약 통과 |
| `node scripts/verify-yeongnyangi-consultation-ui.mjs` | 360/390/430/1280px 모두 통과. 첫 화면 CTA 클릭, 초안 복원, 주제·질문 보존, 질문별 근거 표시, 새로고침, 가로 넘침 없음 |
| 기존 모바일 결제 harness 선택 7개 시나리오 | Chromium 새 탭/저장소 없음, 생성 실패, 생성 중단, 동시 탭, 로그인 만료, 최장 fusion_all 및 WebKit 새 탭/저장소 없음 통과. WebKit 첫 실행의 개발용 chunk 로딩 실패 후 해당 시나리오 재검사 통과 |
| `npm run typecheck`, 변경 파일 ESLint | 통과. ESLint 0 errors, 기존 이미지·링크 등 warnings 42 |
| `npm run build:worker`, `npm run verify:worker-size` | dry-run 성공, gzip 3.31 MiB / 10 MiB 예산. 업로드·배포 없음 |
| env/config parity, no-nested-retry, worker-no-undef, cron-mongo-op-coverage, staging-llm-mock, analytics-events, mongo-reset-callers, admin-route-error-context | 통과. env alias 기존 경고 8건 |
| sitemap generate/check, entry-encoding strict-core, git diff --check | 통과 |

## 유지 정책과 미검증 범위

가격·필수 챕터 수·최소 본문 분량·이용권·월정석·단건 결제 정책을 유지했다. 인증 및 결제 반환 URL을 변경하지 않았다. API 응답, 상담 스냅샷, 작업 상태 필드는 이번 요청에 따라 확장했다.

운영 장애 로그는 미확보다. 기존 미완성 사례가 timeout/출력 제한/저장 실패 중 무엇이었는지 단정하지 않는다. 운영 큐 생성·바인딩·배포, 실제 LLM의 질문별 의미 충족과 전문 해석 품질, 실결제, 실제 모바일 앱 복귀는 미검증이다.

큐 활성화 절차는 [큐 연결 문서](yeongnyangi-consultation-queue.md)를 따른다. 승인 전에는 즉시 큐 처리가 활성화되지 않으며 기존 10분 주기 서버 복구를 사용한다. 이 변경을 운영 반영 완료로 취급하지 않는다.
