---
status: blocked
updated: 2026-09-29
next: 다국어 세션의 공용 파일 커밋 이후 새 타로 모듈을 실제 입력·구매·프롬프트·UI에 연결하고 통합 검증
---

# 영냥이 타로 상담 v2 구현과 통합

사용자가 승인한 추가 작업이다. 기존 궁합 작업과 함께 완료해야 하며, 이 문서의 미완료 항목이 남으면 worktree를 archive하거나 전체 완료로 보고하지 않는다.

## 현재 상태

- 작업 위치: `C:\Users\user\.codex\worktrees\relationship-readings\code-destiny`.
- 기존 궁합 커밋: `31a401bd0e1bf4ae13886f4b888f703ef3717df5`.
- 공유 main의 `lib/tarot/spreads.mjs`, `worker/yeongnyangi/fortune/consultation-kinds.ts`에 다른 세션의 미커밋 변경이 남아 있다. 사용자는 해당 커밋 이후 통합하도록 지시했다. 해당 파일이나 공유 main은 수정하지 않았다.
- 신규 독립 모듈과 안내 컴포넌트를 구현했다. **서비스에 아직 연결하지 않았다. 사용자 화면의 역전 현상은 아직 수정 완료가 아니다.**
- 가격·상품 ID·결제·인증·DB·기존 저장 구매는 변경하지 않았다. 실 LLM·실결제·운영 DB·프로덕션 승격은 실행하지 않는다.

## 신규 모듈

- `lib/tarot/yeongnyangi-consultation-spreads.mjs`: 연락·돈 5장 전용 스프레드.
- `worker/yeongnyangi/fortune/tarot/consultation-contract.ts`: 9개 상담, 서버 스프레드·질문 유형, 한국어 전용 범위, 해석 버전.
- `consultation-manifest.ts`: v6 저장/섹션 형식을 재사용한 5·8·11·15장. 2장은 모든 자리, 3장은 조합, 상위 등급은 카테고리별 고유 논점. 해석 계약 버전은 `yeongnyangi-tarot-consultation-v2`.
- `consultation-calculation.ts`: 중복 없는 보안 난수 추첨, 고정 자리·정역방향, 질문 유형별 의미와 조합 엔진 재사용. 기존 조합의 일반 관계 서사를 제외하고 탐지 유형·제목만 전달한다.
- `consultation-evidence.ts`: 카드별 의미·자리·도상 메타데이터를 구매 시 고정하는 fact. 복구 시 최신 사전으로 재계산하지 않는다.
- `consultation-prompt.ts`: 저장된 v2 fact에서만 전문 해석 계약을 구성한다.
- `app/yeongnyangi/_components/TarotConsultationGuide.tsx`와 CSS: 카드 수와 챕터 수를 구분하는 한국어 안내. 실제 Consultation 연결과 브라우저 검증 대기.
- `__tests__/ui/yeongnyangi-tarot-consultation-v2.test.mjs`: 독립 모듈 7개 테스트.

## 통합 작업 — 모두 필요

1. 다른 세션이 공용 파일을 커밋했는지 확인한다. 완료되면 기존 궁합 인수인계대로 main 변경을 worktree에 병합하고 기존 12개 언어·사이트/결과 언어 분리를 보존한다.
2. `consultation-kinds.ts`의 tarot 목록에 registry의 9개 상담을 연결한다. 기존 choice/love는 다국어 유지, 나머지는 koOnly. compatibility는 기존 별칭 입력을 유지한다. 신규 요청 manifest는 tarot v2가 기존 relationship/v7 분기보다 먼저 적용되도록 한다. 기존 구매는 저장된 manifest를 그대로 사용한다.
3. UI·서버에서 동일한 신규 계약을 선택한다. 기존 다국어 choice/love의 신규 목차 표시에는 12개 언어 번역이 필요하다. koOnly를 기존 모든 타로에 확대하지 않는다. 기존 고정 해시 테스트는 역사적 구매 fixture를 보존하고 신규 계약 fixture를 따로 추가한다.
4. 입력 검증은 서버가 kind에서 spreadId/questionType을 결정한다. 사용자가 임의 spread를 주입하지 못하게 하고 잘못된 kind는 거부한다. fusion·kind가 없는 구클라이언트는 기존 계약을 유지한다.
5. `service.ts`에서 신규 단독 타로는 v7 ledger와 일반 질문의 crossDaily/manifest 덮어쓰기를 건너뛴다. 신규 계산기로 context를 만들고 purchase product.chapterCount를 실제 manifest 길이에 맞춘다. 별도 `tarotConsultation` fact와 계약 버전을 구매 스냅샷에 저장한다.
6. 타로 신규 구매 intent는 locale·상품·상담 종류·질문·별칭·attempt를 포함한다. provider 준비/추첨보다 기존 intent를 먼저 조회하고 저장소 오류는 재추첨으로 취급하지 않는다. 궁합의 기존 재전송도 회귀 검사한다.
7. `master-reading.ts`는 v2 fact가 있을 때만 새 prompt contract를 사용한다. 기존 v1 prompt 바이트를 바꾸지 않는다. 신규 카드 검증은 미선택 카드·정역방향·자리 오류를 검출하고 반복되는 장 본문을 기존 품질 검사와 연결한다. 과도한 거부/추가 호출을 만들지 않도록 사례로 검증한다.
8. 질문 UI에 9개 고민, 추천 문구, 카드 수/챕터 수 안내를 연결한다. 구매·결과·보관함은 저장된 manifest를 기준으로 표시한다. 7장 진로 카드 선택도 360px에서 모든 버튼을 누를 수 있어야 한다. 궁합의 역할별 공개를 유지한다.
9. 실제 StructuredChapterProvider 프롬프트 캡처, mock 생성·복구, 기존 구매 불변성, 12개 언어, 360/390/430/1280px 브라우저 검사를 실행한다. 단독 모듈 통과를 서비스 통합 증거로 표시하지 않는다.
10. check:fast 계획/실행, 검증된 작은 커밋, 안전한 main 병합·push·GitHub CI. 완료 후 궁합 인수인계와 이 문서를 갱신하고 후속 automation을 중지한 뒤 프로세스가 없는 관리형 worktree를 archive한다.

## 한국어 의미 검수 사례

실 LLM은 별도 승인 전 호출하지 않는다. 아래 고정 배열로 검수 원문을 생성할 준비만 한다.

| 질문 | 고정 카드 순서 | 검수 포인트 |
|---|---|---|
| 지금 이 선택을 이어갈까요? | M00 정, S02 역, P08 정 | 과정의 막힘을 결과 확정으로 바꾸지 않기 |
| 관계를 어떻게 이해할까요? | M06 정, C02 정, M15 역, M16 역, S07 정, P10 정 | 끌림과 긴장 공존, 집착·제3자 단정 금지 |
| 그 사람의 태도가 헷갈려요 | C11 역, S12 역, P13 정, W14 정, C02 정 | 궁정 카드를 특정 성별·외모·제3자로 단정하지 않기 |
| 다시 연락해도 될까요? | S02 역, S08 정, C01 정, W08 역, P04 정 | 연락 날짜/답장 보장 금지, 거절·무응답 존중 |
| 관계를 회복할 수 있을까요? | C06 정, M20 역, S03 정, C05 역, M14 정 | 미련과 상호 동의를 구분 |
| 오래 함께할 수 있을까요? | C02 정, P02 역, M06 정, S05 역, P10 정, M14 정 | 카드 역할을 서로 바꾸지 않기 |
| 이직을 준비할까요? | W01 정, P08 정, M09 역, P02 역, S06 정, M16 역, M08 정 | 7자리 모두 설명, 연애 조합 서사 오염 금지 |
| 생활비를 어떻게 정리할까요? | P04 역, P08 정, M15 역, P02 정, P09 정 | 투자 성공·수익률 대신 지출/자원 선택 |
| 지친 마음을 돌보고 싶어요 | S09 역, C05 정, M17 정, M14 정 | 진단/치료 주장 없이 작은 회복 행동 |

공통 검수: 질문에 먼저 답하는지, 카드·정역·자리를 정확히 연결하는지, 상위 등급에서 새로운 논점이 생기는지, 같은 사례를 반복하지 않는지, 확인 가능한 행동과 해석의 한계를 구분하는지.

## 검증 기록

- `node --test __tests__/ui/yeongnyangi-tarot-consultation-v2.test.mjs`: 7/7 통과.
- `npm run typecheck`: exit 0. 이후 추가된 prompt/UI도 check:fast의 타입 검사에서 통과했다.
- `npm run check:fast -- --plan`: critical 검사 계획 확인.
- `npm run check:fast`: exit 0. paid gate 88/88(전체 npm test 포함, 324.1초), lint·사이트맵·타입·Node·환경·결제 정책·Worker dry-run·인코딩 통과. 마지막 Jest 316 suites / 4577 tests 통과(219.164초). 로그는 worktree 상위 `tarot-v2-check-fast.log`.
- Impeccable 안내 컴포넌트/CSS 정적 검사: primary findings 0. 실제 화면 검증을 대신하지 않는다.
- `npm run verify:handoff-contract`: 213개 문서 통과.
- 서비스 연결, 실제 화면, 결제/복구 통합, 다국어, main push·CI: 미검증.
