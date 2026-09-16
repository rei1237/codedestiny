---
status: active
updated: 2026-09-16
next: 마스터 운영 코드 반영은 확인됐다. 초융합부터 상품별 A~F를 재현하고, 실결제·실기기·과금 LLM 확인은 별도 승인 단계로 남긴다.
---

# 유료 LLM 생성·결제 후 전달 인수인계

## 지금 상태

사용자 요청: “마스터 인연의 서 결제 이후 제대로 생성되는지 확인하고, 나머지 LLM 서비스를 하나씩 제대로 나오게 할 인수인계 문서.”

main 구현 기준 `77007dc4c1c931ecc148ab73069bf437b78473e9`. [전체 main CI](https://github.com/rei1237/codedestiny/actions/runs/35103084907)는 모든 lane·CI required 성공. [마스터 수정/검증 기록](../verification/master-love-codex-delivery-20260916.md)을 재사용하고 재구현하지 않는다.

**2026-09-16 재확인:** 마스터 서버 생성·암호화 구매 bootstrap·크론 복구 47개, 결과 복귀·원래 구매 재개·SDK 요청 계약 18개 통과. 개인/궁합 각 20장·모의 성공 호출20회·재열람0회. 입력 문자 감소9.7%/17.3%; 실제 청구 토큰·문장 의미는 미검증.

**운영 코드 반영 확인:** 시작 조회는 Pages/Worker 모두 `a3d1b471f319036deb416251a2116ef278097567`로 불일치였으나, 최종 읽기 전용 재조회에서 [Pages](https://code-destiny.com/version.json)와 [Worker](https://code-destiny.com/api/version)가 모두 수정본 `77007dc4c1c931ecc148ab73069bf437b78473e9`로 일치했다. [운영 릴리스 35105200682](https://github.com/rei1237/codedestiny/actions/runs/35105200682)의 정확한 SHA 배포·버전 검증도 success이며 staging job은 skipped다. 이번 세션이 배포한 것은 아니다. **코드 운영 반영과 모의 생성은 확인했으나 실 PG·실기기·청구 LLM·실고객 주문 완주 증거는 미검증**이다.

## 다음 작업

1. **마스터 2상품의 실제 결제 전달 확인은 별도 단계.** 운영 코드 기준은 확인된 `77007dc4c`다. 이후 인수인계 문서만 바뀐 main SHA와의 차이로 코드 미반영을 오판하거나 재승격하지 않는다. 실제 PG/과금 LLM/운영 DB/실기기·고객 주문 복구는 각각 승인 범위 안에서만 확인한다. 승인 없는 단계는 미검증으로 남기고 다른 상품의 mock 점검은 계속한다. 입력 없는 과거 구매는 구매 권리 보존·재입력 후 결제 없는 복구를 유지한다.
2. **[서비스별 재검증표](../verification/paid-llm-service-checklist-20260916.md)의 74구매 키+후속3경로를 순서대로.** 마스터2키를 제외한 구매72키는 이번 개별 E2E 미실행이다. 초융합→심화 자미 PDF→네오→나크샤트라→기타 장문→질문/찻집→타로·기타→손금→Code Destiny 영냥이28키. 후속3경로도 별도 완료한다.
3. **한 상품마다 A~F:** 실제 입력·계산→mock 결제/권한→생성→품질→저장 확인→완료 기록→새 문서 마지막 본문 재열람. 오류·지급 지연·모바일 복귀·문서 종료·저장 유실·동시 락을 주입한다. 재열람 LLM/결제/차감0회. 필요한 장만 재생성, 공유 재시도 상한·백오프·정체 집계. 상세 계약은 표를 따른다.
4. 기존 [매트릭스](paid-llm-delivery-matrix-20260915.md)는 구현/mock 완료 기록이며 현재 실운영 보장이 아니다. 과거 미수정 기록만 보고 다시 구현하지 않는다. 현재 CTA→import→API→LLM을 대조해 신규 상품/변형을 추가하고, 비LLM·무료·관리자·비활성 UI는 구분한다.
5. 결함을 재현한 상품만 최소 수정한다. 같은 결함의 공통 코드만 함께 수정한다. 가격·분량·계산·이용권/월정석/단건 정책을 유지한다. 영냥이는 통합 `worker/yeongnyangi/`의 기존 단건 전용 계약을 유지하며 별도 SoulCat 과거 검사로 완료 처리하지 않는다.

## 검증·전달

관련 표의 실제 코드 mock 검사→`npm run check:fast -- --plan`→관련 `check:fast`→의도한 파일만 commit/push→동일 SHA main CI. 파일·의도·명령/출력·예산/차감·새 문서 증거·남은 확인을 행별 기록한 뒤 다음 상품으로 간다. 정상 구 completed 구매본 보존·전액 취소/환불/계정 분리도 필수다. 부분 본문/짧은 fallback을 완료로 인정하지 않는다.

main 직접 편집, 마케팅 미커밋 변경 보존. 동시 편집의 두 번째 세션이면 [안전 워크트리 규칙](../../CLAUDE.md)을 따른다. 타 세션의 변경을 stage/reset/restore하지 않는다. 운영 승인·개발 경계는 [실행 계약](../../CLAUDE.md)이 정본이다.

## 재검사 명령

`npm run test:jest -- --runInBand __tests__/worker/master-love-codex-paid-bootstrap.test.js __tests__/worker/master-love-codex-paid-delivery.test.js __tests__/worker/master-love-codex-recovery-task.test.js`

`node --test __tests__/ui/master-love-codex-resume-on-result.behavior.test.js __tests__/ui/master-love-codex-purchase-recovery.behavior.test.js __tests__/ui/direct-payment-sdk-return.behavior.test.js`

`node scripts/verify-master-love-codex-efficiency.mjs`

`npm run verify:deployed-sha -- --sha=77007dc4c1c931ecc148ab73069bf437b78473e9 --attempts=1` → 시작 조회는 버전 불일치 exit1, 최종 재조회는 Pages/Worker 모두 일치해 exit0. 실패와 성공을 구분하고 실결제 전달 검증으로 확대하지 않는다.
