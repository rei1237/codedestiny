---
status: done
updated: 2026-10-15
next: 완료 — 재개 작업 없음.
---

# 시빌라 프리미엄 연간 대비 리포트 — 전달 완료

## 현재 상태

- 작업 디렉터리: `D:/Development/codedestiny-worktrees/sibyl-premium-20261015-075740`
- 코드 커밋: `6ad17b1c23e77a016c8ffd51bb45788c63e788e9` (`wt/sibyl-premium-20261015-075740`). 최신 main 통합과 최종 검증을 완료했다.
- 구현 완료: 규칙 기반 기본 결과, 서버 계산+AI 심층 리포트, 20,000원 정본, 출생 단위 권한, 연도별 저장/재개, FPTI 원본 보관함 연결, 새 이미지·홈·상세·결과 화면.

## 기존 main 실패 해결

main `b530a08c9140a83ef37b61ea4493a28b818d808b`의 [CI 실행](https://github.com/rei1237/codedestiny/actions/runs/38653682887)은 이번 코드가 포함되기 전의 가격 기대값 드리프트로 실패했다.

`__tests__/ui/luck-sync-diary-planner.static.test.js:100`의 기대값을 서버 가격 정본과 일치하는 `coinCost:100`으로 고쳤다. `9e1d72e338376ee497c4eee4d7ea9f49f14224a8`에서 수정했고 [main CI](https://github.com/rei1237/codedestiny/actions/runs/38659205350)가 성공했다.

## 남은 작업

- [x] 기존 main 가격 실패 해결 및 CI 성공 확인.
- [x] 최신 main 통합. 정적 미러와 사이트맵 원장은 공식 생성기로 갱신했고 관계 카드·시빌라 가격 동기화를 모두 보존했다.
- [x] 통합 변경 검사와 `check:pre-push` 완료.
- [ ] 이 문서 커밋 뒤 main 직접 병합·push, 최종 main CI와 운영 승격 확인, 자기 워크트리 배수.

## 검증

- 전체 Jest 401개 suite / 6,077개 검사 통과.
- Node 검사 중 새 연도 복귀 서술자·보관함 fixture에 맞지 않았던 2개를 갱신했고 관련 27개 검사 통과.
- lint, typecheck, 나머지 위험 영역 검사, Worker dry-run 빌드, 인코딩 검사 통과.
- `check:pre-push` 통과: 서비스 목록, 정적 미러, 사이트맵 959 URL 정합.
- `npm run check:fast -- --committed-head`: 종료 코드 0. 결제·권한 가드 88/88, Jest 401 suite / 6,077 tests, Node 회귀 3,245개, lint, typecheck, Worker dry-run, 정적 미러·사이트맵·인코딩 검사 통과.
- mock 화면: 360·390·430·1280px 진입/결과, 390·1280px 보관함. 외부 결제·LLM·DB 호출 없음.

## 참고

구현 계약과 이미지 출처는 `docs/design/sibyl-annual-premium.md`. 보관함은 꿀꿀운세 `/records/`이며 영냥이 보관함과 합치지 않았다. 실결제·실 LLM·운영 데이터 쓰기는 수행하지 않았다.
