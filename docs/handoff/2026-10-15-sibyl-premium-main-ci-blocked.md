---
status: active
updated: 2026-10-15
next: main의 기존 가격 검사 실패를 먼저 해결하고 CI 성공 확인 후 시빌라 작업을 통합한다.
---

# 시빌라 프리미엄 연간 대비 리포트 — main CI 전달 보류

## 현재 상태

- 작업 디렉터리: `D:/Development/codedestiny-worktrees/sibyl-premium-20261015-075740`
- 코드 커밋: `6ad17b1c23e77a016c8ffd51bb45788c63e788e9` (`wt/sibyl-premium-20261015-075740`). main 미병합, push 안 함, PR 없음.
- 구현 완료: 규칙 기반 기본 결과, 서버 계산+AI 심층 리포트, 20,000원 정본, 출생 단위 권한, 연도별 저장/재개, FPTI 원본 보관함 연결, 새 이미지·홈·상세·결과 화면.

## 전달을 막는 기존 실패

main `b530a08c9140a83ef37b61ea4493a28b818d808b`의 [CI 실행](https://github.com/rei1237/codedestiny/actions/runs/38653682887)이 실패했다. 이번 코드가 포함되기 전 실패다.

`__tests__/ui/luck-sync-diary-planner.static.test.js:100`의 관계 성향 카드 검사가 `coinCost:50`을 기대하지만 main의 정본 동기화 결과는 `coinCost:100`이다. 저장소의 실패한 main 위에 push 금지 규칙에 따라 전달을 멈췄다. 임의로 관계 상품 가격을 바꾸지 말고 정본과 테스트 계약을 먼저 확인한다.

## 남은 작업

- [ ] 위 main 실패 해결 및 CI 성공 확인.
- [ ] 작업 워크트리에서 최신 main 통합. 정적 미러/마케팅 JSON/사이트맵 원장은 원본을 합친 후 공식 생성기로 갱신한다. `sync-saju-reading-prices.mjs`의 관계 카드 가격 동기화와 시빌라 가격 동기화를 모두 보존한다.
- [ ] 통합 변경 검사·커밋, main 직접 병합, `check:pre-push`, main push, CI 1회 확인. 이후 이 문서를 done으로 닫고 자기 워크트리를 배수한다.

## 검증

- 전체 Jest 401개 suite / 6,073개 검사 통과.
- Node 검사 중 새 연도 복귀 서술자·보관함 fixture에 맞지 않았던 2개를 갱신했고 관련 27개 검사 통과.
- lint, typecheck, 나머지 위험 영역 검사, Worker dry-run 빌드, 인코딩 검사 통과.
- `check:pre-push` 통과: 서비스 목록, 정적 미러, 사이트맵 959 URL 정합.
- `npm run check:fast -- --committed-head`: 종료 코드 0. 결제·권한 가드 88/88, Jest 401 suite / 6,073 tests, Node 회귀, lint, typecheck, Worker dry-run, 정적 미러·사이트맵·인코딩 검사 통과.
- mock 화면: 360·390·430·1280px 진입/결과, 390·1280px 보관함. 외부 결제·LLM·DB 호출 없음.

## 참고

구현 계약과 이미지 출처는 `docs/design/sibyl-annual-premium.md`. 보관함은 꿀꿀운세 `/records/`이며 영냥이 보관함과 합치지 않았다. 운영 승격·실결제·실 LLM·운영 데이터 수선은 수행하지 않았다. 워크트리는 미전달 코드를 보존하기 위해 남겼다.
