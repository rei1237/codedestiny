---
status: active
updated: 2026-09-26
next: "Phase 4 검증과 main CI 확인 후 Phase 5 사용자 승인 대기."
---

# 영냥이 자유질문 인수인계

## Phase 4 (사용자 승인: 2026-09-26)

신규 질문형 첫 장의 답변에 질문별 F/T 근거 ID, 원 출처, 기간 해상도와 안전 표현 검증을 추가했다. 모델이 생성한 검증용 ID·상태는 저장 전에 제거해 공개 응답 필드를 유지한다. 품질 오류는 기존 예산 안에서 한 번만 재생성하고, 다시 실패하면 저장된 장과 유료 접근을 보존한 미완료 지원 확인 상태로 멈춘다. 자동 큐·정기 복구·사용자 재시도가 이 상태에서 추가 생성하지 않는다. 공급자·저장 오류의 기존 복구 경로는 유지했다.

- 구현 커밋: `10db30be9ec5871e0acc1c0231bbb4ebbd1c9079`. main 병합·push·CI 결과는 이 절의 후속 기록과 `git log -1 -- docs/handoff/yeongnyangi-ask-20260926.md`를 확인한다.
- 대상: `worker/yeongnyangi/fortune/ask/validate.ts`, `providers/chapter.ts`, `service.ts`, `repository.js`, `queue.js`, `recovery.js`, `retry.js`, 관련 mock 테스트.
- 관련 mock: 첫 장 검증·상담·서비스 20/20, 저장소·정기 복구·재시도 60/60 및 타입 검사 통과. `npm run check:fast -- --plan`은 critical, `npm run check:fast`는 종료 0으로 Node 검사·정책 가드·Worker dry build·Jest 296 suites / 4,214 tests를 통과했다. 게이트 뒤 Family 접근 보존 테스트 1건을 더했고 관련 60건을 다시 통과했다. `npm run verify:handoff-contract`는 195개 문서 통과.
- 구매 snapshot·가격·차감·기존 환불 함수·일반 리포트·계산 엔진·공개 API 필드 구조는 유지했다. 새 검증 대기 상태는 즉시 환불하거나 추가 생성하지 않고 기존 유료 접근을 유지한다. 실 LLM·실결제·운영 DB·프로덕션 승격은 실행하지 않았다.
- 자동 검증은 문장의 의미적 사실 일치나 12개 언어의 실제 품질을 입증하지 않는다. Phase 5 화면 모드와 Phase 6 평가, 실제 LLM·전문가 검수는 남아 있다.

## Phase 3 (사용자 승인: 2026-09-26)

- 구현 커밋: `8f05df2d0a4df8a26ac44e9a1510baac1c3f2029`.
- main 전달 커밋: `1a0914de71285514ec0c35b8192822ffbee7169b`; `git push origin main` 완료.
- main CI: [36185203154](https://github.com/rei1237/codedestiny/actions/runs/36185203154)의 `CI required` 및 전체 lane 통과를 확인했다.

`fortune/ask/prompt.ts`가 저장된 질문 ID와 분류 결과를 주제별 F/T 근거에 연결한다. 중복 근거 값은 한 번만 싣고, 기간 질문에만 기간 근거를 넣는다. 첫 장 조립 직전 체크포인트를 재읽어 소유자·잠금 상태를 확인한다. `ask-chapter-v1`은 신규 질문형 요청의 첫 장에만 적용하고 후속 장·이전 구매의 프롬프트는 유지한다. 질문과 근거의 태그 종료 문자를 이스케이프하고 분석 결과의 자유 문장 지시를 사용하지 않는다.

- 관련 mock: 질문 프롬프트·근거·재시도 29건 통과. 직렬화 조정 후 관련 15건과 타입 검사 통과.
- `npm run check:fast -- --plan`: critical. `npm run check:fast`: 종료 0, 타입·lint·정책 가드·Worker dry build·Jest 296 suites / 4,212 tests 통과. 마지막 직렬화 조정은 이후 targeted 15건과 타입 검사로 확인했다.
- 구매 snapshot·가격·차감/환불 정책·일반 리포트·계산 엔진·공개 API 형식은 유지했다. 실제 LLM·실결제·운영 DB·프로덕션 승격은 실행하지 않았다.
- Phase 4의 패킷 근거/기간/안전 검증, 1회 재생성·limited 복구, 실제 문장 품질 평가는 아직 남아 있다.

- 작업 디렉터리: `D:\Development\code-destiny`
- 이 문서: `D:\Development\code-destiny\docs\handoff\yeongnyangi-ask-20260926.md`
- 구현 커밋: `830f0360a` — `feat(yeongnyangi): add versioned ask evidence packets`
- main 전달 커밋: `42c8793ee5761a4e9f5b82c014556a2b2bcd6fcc` — 최신 main 병합 및 사이트맵 동기화 포함.
- push: 완료. CI: [36170976869](https://github.com/rei1237/codedestiny/actions/runs/36170976869)의 `CI required` 및 전체 lane 통과를 확인했다.
- 상세 계약·파일 목록: [yeongnyangi-ask.md](../context/yeongnyangi-ask.md).

## Phase 2 (사용자 승인: 2026-09-26)

- 구현 및 main push: `c01762d879ab630d2b4c81c1f3b3e738a003f37b`.
- main CI: [36174484853](https://github.com/rei1237/codedestiny/actions/runs/36174484853)의 `CI required` 및 전체 lane 통과.

질문 분석기와 `generationCheckpoint.analysis` 저장·재사용을 구현했다. 공통 공급자 모델, temperature 0, 1,024 출력 토큰, 15초, 공급자 시도 1회다. 오류·잘못된 응답은 규칙 폴백을 저장한다. 원문 질문 ID를 유지하고 모델이 만든 자유 텍스트 지시문은 폐기한다. 결제·환불 증명, 소유자, 장 잠금 확인 후 트랜잭션 저장·재읽기를 수행한다. 장 생성 실패와 저장 응답 불확실성 후에도 저장된 분석을 재사용한다.

- 수정: `fortune/ask/analysis.ts`, `providers/code-destiny.ts`, `repository.js`, `service.ts`, 관련 mock 테스트와 계약 문서.
- targeted: 분석/공급자/서비스 13건, 상담 종류/신점 호환 15건, repository/recovery 46건 통과.
- `npm run check:fast -- --plan`: critical. `npm run check:fast`: 종료 0, Node 1,686건 및 Jest 296 suites / 4,211 tests 통과. 타입·lint·정책 가드·Worker build도 통과했다.
- 구매 snapshot·가격·차감/환불 정책·일반 리포트·계산 엔진·공개 API 형식은 유지했다.
- 분석 결과를 답변에 반영하는 Phase 3는 아직 연결하지 않았다. 폴백의 다국어 어휘는 제한적이다. 실 LLM 품질·실결제·운영 DB·프로덕션 승격은 미실행이다.

## Phase 1 적용 내용과 유지 경계

`fortune/ask/`에 버전 계약, 표준 주제 매핑, 근거 순수 빌더, 기존 계산 재사용 래퍼, 암호학적 타로 추첨을 추가했다. 신규 명시적 질문 메뉴에만 `generationCheckpoint.version = ask-generation-v1`과 `.evidence`를 저장한다. 구매 `snapshot`과 생성 근거를 분리했다. 기존 요청 재읽기는 저장된 결과를 반환하며, 저장소 읽기 오류에서 재추첨하지 않는다.

6개 단일 엔진과 퓨전 질문이 대상이다. 일반 리포트·신점·호라리·SoulCat은 제외한다. 기존 가격·Family·단건 결제·차감·환불·원래 리포트 분량과 나머지 장·6개 계산 엔진은 그대로다. 새 LLM 생성기와 렌더러는 **아직 연결하지 않았다**.

사주·자미의 기간 보강과 베다 3단계 다샤는 연결했다. 새 궁합 입력·서양 트랜짓 투영 함수의 런타임 연결과 다른 단일 엔진의 교차 사주 장기 기간 보강은 남아 있다. 자미 유월·독립 유년사화, 서양 진행/솔라리턴, 숙요 능범기간, 베다 고차라의 독립 정밀도는 검증되지 않았다. 음력 테스트는 기존 엔진 출력 보존 검사이며 외부 달력 정확도 인증이 아니다.

## 검증

- `node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/yeongnyangi-ask-evidence.test.mjs __tests__/ui/yeongnyangi-consultation-kinds.test.mjs`: 23/23 통과.
- `node scripts/run-mock-tests.mjs jest __tests__/worker/yeongnyangi-repository.test.js __tests__/worker/yeongnyangi-recovery.test.js`: 43/43 통과.
- `npm run check:fast -- --plan`: critical 승격 확인.
- `npm run check:fast`: 종료 0. 타입·lint·Node 검사·정책 가드·Worker dry build·Jest 296 suites / 4,208 tests 통과.
- 최초 게이트의 sitemap drift는 정상 생성으로 해소했다. 이후 main 병합으로 입력 소스가 바뀌어 `npm run sitemap:generate` 및 `npm run verify:sitemap-drift`를 다시 실행했고 통과했다.
- 실 LLM·실결제·운영 DB·환불·프로덕션 승격은 실행하지 않았다. mock을 LLM 품질 점수로 보고하지 않는다.
- `npm run verify:handoff-contract`: 이 문서를 포함한 193개 문서 통과. 이 문서의 마지막 기록 커밋은 `git log -1 -- docs/handoff/yeongnyangi-ask-20260926.md`로 조회한다.

## 다음 단계

첨부 원문의 “각 Phase 종료 시 … 보고하고 승인을 기다린다”를 따른다. Phase 4 검증과 미완료 지원 확인까지 구현했다. Phase 5는 별도 사용자 승인 전에는 시작하지 않는다. 분석 결과로 지시문을 바꾸지 않으며 태그 종료 문자열을 이스케이프한다. 기존 구매 스냅샷을 재작성하지 않는다.

Phase 5는 12개 언어 입력·normal/limited/care 화면 및 기존 렌더 호환, Phase 6은 180건+퓨전/복구/다국어 평가다. 실제 LLM 평가와 사주 전문가 20건 검수는 별도 승인·검수자가 필요하다.

main에 다른 세션의 marketing 변경이 남아 있다. 광역 reset/stash/add를 사용하지 않는다. 동시 쓰기 세션이면 기존 안전 worktree 스크립트로 격리하고, PR 없이 main 전달 및 CI 확인 후 배수한다.

## 복사할 재개 지시

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\yeongnyangi-ask-20260926.md를 읽고, main 상태와 10db30be9ec5871e0acc1c0231bbb4ebbd1c9079 포함 여부를 확인하라. Phase 4의 main CI 결과를 확인하고, Phase 5 사용자 승인 후 12개 언어 입력과 normal/limited/care 화면·기존 렌더 호환부터 진행하라. 다른 세션 변경을 보존하고 실제 과금 호출과 운영 작업은 하지 마라.
```
