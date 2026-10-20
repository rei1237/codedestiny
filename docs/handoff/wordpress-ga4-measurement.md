---
status: blocked
updated: 2026-10-21
next: Resolve validation failures, review the isolated branch, and complete consent-aware ledger reconciliation.
---

# WordPress 초안과 GA4 측정 검토

작업 경로: `D:\Development\code-destiny\.codex-worktrees\wordpress-ga4-measurement`
브랜치: `codex/wordpress-ga4-measurement`
기준 커밋: `c351378436d0f290cfc2b88c75c232c6b0d5fc73`

사용자 요청에 따라 분리 브랜치만 사용하며 main 통합·운영 코드 배포는 미승인이다.
WordPress 초안 88/91/95는 저장·상태 확인 완료. 이후 본문 수정은 사용자가 한다.
원고·16개 질문·자료·소개 후보·운영 기록은 `marketing/wordpress/2026-10-21/`에 있다.

## 실제 변경

- home-funnel 템플릿의 내부 링크 2개에서 UTM 제거, 기존 portal click placement 활용. 정적 미러 동기화 완료.
- 네트워크 없는 측정 mock 검사 16개 통과. 실제 수집 성공을 의미하지 않는다.
- Cloudflare 운영 code-destiny-web의 SNS_THREADS_POST_ENABLED만 split → 0으로 적용. 운영 관리자에서 off 확인.
- worker/wrangler.toml에도 0을 준비했다. 이 브랜치가 통합되기 전 다른 배포에서 기존 split 설정이 복원될 수 있으므로 다음 배포 담당자가 이 설정을 보존해야 한다.
- 공유 SNS 큐·Telegram·cron, 결제·가격·인증·DB·계산 코드 유지.

## 검증

- sync:public, verify:analytics-events, verify-wordpress-ga4-measurement(16), diff check 통과.
- check:fast -- --plan 통과.
- check:fast 실패: paid-gate-suite 86 통과 / 4 실패.
- 실패 항목: npm test, verify:deploy-base-guard, verify:llm-generation-resilience, verify:analysis-basis-contract.
- Jest 423 suites / 6737 tests 통과. 실패 출력에는 Swiss ephemeris MOCK_NETWORK_BLOCKED / CALCULATION_FAILED가 포함된다. 전체 실패 원인 및 기준 커밋 비교는 미완료이며 기존 오류라고 단정하지 않는다.
- 실패 후 전체 검사를 반복하거나 운영 네트워크로 우회하지 않았다. 후속 빌드·CI는 미검증.

## 남은 작업

1. 실패 4개를 출력 파일에 보존하며 개별 재현하고 관련성을 판정한다. mock 외부 차단은 유지한다.
2. 초기 동의 UI와 SPA 페이지뷰를 분리 브라우저에서 검증하고 승인된 비운영 속성에서 수집 확인.
3. PG 승인시각·테스트/환경·동의/식별 조건을 확보해 원장 대조 분모 확정. 일부 거래 대조만 완료했으며 누락률은 미산출.
4. 원고 공개·외부 제안 발송·운영 GA 설정은 별도 검토 후 진행한다.

비공개 감사 기록은 저장소 밖 사용자 로컬 시각화 폴더에만 있다. 거래 ID·고객 정보는 이 문서에 넣지 않는다.
롤백: 코드 후보는 이 브랜치를 통합하지 않으면 운영 영향이 없다. Threads 재개는 별도 승인 후 변수 split 복원.
