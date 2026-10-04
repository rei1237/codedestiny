# 기록 보관함·상담 허브 구현 및 검증

- 요청: 전체 서버 저장 서비스 조사, 기존 결과 재열람, 상담 허브, 실제 mock 검증 및 main 전달.
- 작업: 동시 세션의 미커밋 변경을 보존하기 위해 안전 워크트리에서 구현했다. base `05d0097fa5f695194e2c164feae3dd290b1fc822`.
- 조사/연결 정본: `docs/records-service-inventory.md`, `lib/records/service-registry.js`. 25개 저장 어댑터와 공유 저장소 25개 상품 변형을 분류했다.
- API: GET `/api/records`, GET `/api/records/detail`. 목록·상세 소유권 서버 검증, 원래 저장소 유지, 메타데이터 목록, keyset 커서/중복 제거/일부 실패 재시도. 환불 차단 유지.
- 화면: `/records/`, `/records/view/`, `/consultations/`. 대표 완료 결과에 저장 결과·전체 보관함 링크. 기존 직접 접근/공유 경로는 유지.
- 추가 저장 누락 수정: 최애운명의 기존 cards POST에 완성 VM 저장 연결. 동일 사용자/저장 요청 재시도는 원자 upsert로 중복 방지한다.
- 보존: 결제 가격/이용권/월정석/단건 결제, 인증 정책, 기존 저장 본문 및 스키마, TTL/공유 정책. 추가 요청으로 영냥이 최종 복구 실패의 자동 환불 정책만 명시적으로 변경했다. 실 DB/실 LLM/실결제/운영 인덱스/배포는 호출하지 않았다.
- 검증: 신규 Worker mock 22개 PASS; 관련 기존 Node 54개 PASS; typecheck/eslint PASS; Worker dry-run PASS. 첫 전체 Jest 335 suite/5,009개 PASS. 첫 Node 전체는 2,424개 중 9개 실패 후 원인 수정과 영향 범위 재검증 완료(상세 연결표 참고). 최신 main 병합 후 check:fast/CI 최종 판정이 필요하다.
- browser: 비식별 16개 서로 다른 시나리오 PASS, 360/390/430/1280px. 생성/결제/차감/쓰기 0회. 연속 실행의 개발 서버 manifest 오류로 마지막 3개는 분리 실행했고, 최종 Neo 대비 변경 후 Neo 상세를 재검증했다. `build-cache/records-hub/verification.json`에 실행별 근거를 남겼다. PNG도 같은 폴더다.
- 디자인: 독립 A/B 검토, detector 0 findings. 검색 키보드 포커스·내부 필드 중복 수정. 외부 Codex 이미지에는 동일 캐릭터 local fixture를 사용했다.
- 제약: TTL로 이미 삭제된 기록과 과거 서버 미저장 최애 결과는 복원할 수 없다. 실기기/native 웹뷰/운영 데이터·인덱스 explain/운영 R2 이미지/정량 대비는 미검증. 레거시 구조 필드 일부는 한국어 라벨이며 다른 언어는 후속 문체 검토가 필요하다.
- 마이그레이션: 데이터 이동 없음. `node scripts/records-index-plan.mjs`는 read-only 계획이다. 인덱스 apply는 운영자의 별도 승인 환경에서만 수행하며 API/Worker startup에서 호출하지 않는다.

## 영냥이 후속 요청

`docs/yeongnyangi-terminal-refund.md`에 기존 정책, 변경 범위와 결함 수정 근거를 정리했다. 기존에는 0개 챕터의 비현금 복원만 있었고 부분 결과와 카드 결제 최종 실패는 자동 환불되지 않았다. 검증된 저장 초안의 저장 복구를 우선하고 기존 제한 재시도·마지막 hold 복구를 자동 실행한 뒤, 더 이상 복구할 수 없으면 서버가 원 결제·소유권을 검증해 환불한다. 실패한 PG/복원 요청은 환불 확인 중으로 보존한다.

생성 claim/reconcile의 stale CAS, quota 복원 transaction 분리, 혼합 단건 결제의 할인 월정석 복원 누락, 웹훅 선확정(`refunded + CANCELLED`) 후 정산 재시도 누락을 수정했다. 외부 생성의 성공률이나 환불 완료 시각은 보장하지 않는다. 관련 mock 7개 suite/89개 PASS이며 실 PG·실 LLM·운영 정산 증거는 없다.

최종 `verify:public-mirror-fresh` PASS. 공식 `check:fast --committed --base=main --head=HEAD`와 정확한 main SHA의 CI 결과는 종료 보고에 별도로 기록한다. 초기 전체 테스트, 중단된 공식 검사 또는 실패한 연속 dev browser 실행을 최종 통과로 취급하지 않는다.
