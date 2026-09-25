---
status: active
updated: 2026-09-26
next: "Phase 1 전달 완료. 사용자 승인 후 Phase 2 질문 분석기를 구현한다."
---

# 영냥이 자유질문 Phase 1 인수인계

- 작업 디렉터리: `D:\Development\code-destiny`
- 이 문서: `D:\Development\code-destiny\docs\handoff\yeongnyangi-ask-20260926.md`
- 구현 커밋: `830f0360a` — `feat(yeongnyangi): add versioned ask evidence packets`
- main 전달 커밋: `42c8793ee5761a4e9f5b82c014556a2b2bcd6fcc` — 최신 main 병합 및 사이트맵 동기화 포함.
- push: 완료. CI: [36170976869](https://github.com/rei1237/codedestiny/actions/runs/36170976869)의 `CI required` 및 전체 lane 통과를 확인했다.
- 상세 계약·파일 목록: [yeongnyangi-ask.md](../context/yeongnyangi-ask.md).

## 적용 내용과 유지 경계

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

첨부 원문의 “각 Phase 종료 시 … 보고하고 승인을 기다린다”를 따른다. Phase 2 승인 후 공통 공급자의 현재 모델을 사용하는 분석기(temperature 0, 짧은 출력, 공급자 재시도 없음), 규칙 폴백, 원문 질문 ID 보존, 결제/환불 상태 검증 후 체크포인트 저장·재사용을 구현한다. 분석 결과로 지시문을 바꾸지 않으며 태그 종료 문자열을 이스케이프한다. 기존 구매 스냅샷을 재작성하지 않는다.

Phase 3은 프롬프트 조립과 첫 장 연결, Phase 4는 근거/기간/안전 검증과 1회 재생성·limited 미완료 복구, Phase 5는 12개 언어 입력·normal/limited/care 화면 및 기존 렌더 호환, Phase 6은 180건+퓨전/복구/다국어 평가다. 실제 LLM 평가와 사주 전문가 20건 검수는 별도 승인·검수자가 필요하다.

main에 다른 세션의 marketing 변경이 남아 있다. 광역 reset/stash/add를 사용하지 않는다. 동시 쓰기 세션이면 기존 안전 worktree 스크립트로 격리하고, PR 없이 main 전달 및 CI 확인 후 배수한다.

## 복사할 재개 지시

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\yeongnyangi-ask-20260926.md를 읽고, main 상태와 42c8793ee5761a4e9f5b82c014556a2b2bcd6fcc 포함 여부를 확인하라. 다른 세션 변경을 보존하고 Phase 2 승인 여부를 확인한 뒤, 결제 확인 후 분석 체크포인트를 재사용하는 질문 분석기 구현부터 진행하라. 실제 과금 호출과 운영 작업은 하지 마라.
```
