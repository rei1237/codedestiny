---
status: in-progress
updated: 2026-11-27
next: 1 — SoulCat(영냥이) 결제 requestId 흐름 조사·설계 보고 후 구현(RED)
---

# 영냥이 결제 requestId 서버 선생성 + /records/ 사주 묶음 노출

## 첫 행동
`git branch --show-current`·`git status`·`git fetch origin`. 이 워크트리(`D:\Development\codedestiny-worktrees\change-20261127-161248`, 브랜치 `wt/change-20261127-161248`)에서 이어 작업한다. 루트 체크아웃은 옆 세션 미커밋이 있어 손대지 않는다.

## 지금 상태
- 출발점: origin/main ffd712e694 (payment-leftovers 인수인계 종료 커밋).
- 원 문서: `docs/handoff/payment-leftovers-2026-11-27.md` 단계 8·9.

## 승인 상태 (2026-11-27 사용자 답, 원문 선택지)
- 결정 8: "(a) 서버가 먼저 요청 생성" — 결제 전에 서버가 YeongnyangiRequest 를 만들고 id(`yn-<64hex>`)를 돌려준다. 소유 검증은 그대로 둔다. 서버 형식 완화(b)는 기각.
- 결정 9: "보여준다" — `/records/` 에 라이트 사주 묶음(`saju_lifetime_bundle`, 정적 해금)을 목록으로 노출한다.
- 결정 10: "현행 유지" — CI 트리거 추가하지 않는다.
- 운영 승격: "지금은 배포 안 함". push 는 해도 되지만 production dispatch 는 별도 요청 때만.

## 작업 규칙과 함정
- RED: 구현 전 위험·검증·롤백을 한 번 보고하고 진행한다(이미 승인된 범위라 다시 묻지 않는다).
- 결제 검증은 mock 만. 실결제·운영 DB 쓰기·과금 LLM 호출 금지. DB 수선 금지.
- 결제 코드 수정 전·커밋 전에 paid-gate-auditor 를 쓴다. 동결 파일이면 payment-freeze 절차(`verify-payment-freeze`).
- 보관함 분리 유지: 꿀꿀운세 기록은 `/records/`, 영냥이는 `/yeongnyangi/library/`. 결정 9 는 꿀꿀운세 쪽 상품이므로 `/records/`. 다른 계정 기록 노출 금지, 저장 원본 재열람(추가 결제·LLM 없음). `docs/context/library-preservation.md` 를 먼저 읽는다.
- js/** 를 고치면 `npm run sync:public`, app/** 를 고치면 `npm run sitemap:generate`. js/core/checkout-entry.js·pass-verdict.js 를 고치면 21개 정적 페이지 + app/layout.js 의 core 런타임 캐시 핀을 손으로 갱신해야 한다(`verify-payment-choice-parity.mjs` 가 잡는다).
- sync:public 이 webp 11개를 재인코딩하는 잡음이 나면 그 파일만 되돌리고 다시 sync 한다.
- 알려진 기존 실패(범위 밖): `__tests__/worker/card-single-payment-auto-refund.test.js` 10건 — ziwei-ai-chart.js mock 에 FOUR_TRANSFORMATIONS 없음. 이것 때문에 check:fast 의 test:jest 가 실패하면 원인만 확인하고 넘어간다(고치지 않는다).
- 단계마다 check:fast → 커밋. 끝나면 `npm run check:pre-push` → `git push origin HEAD:main` → main CI 1회 확인.

## 설계 (조사 후 채운다)
- 8: 서버는 `yn-<64hex>` 이고 소유자의 YeongnyangiRequest 가 있어야 결제 requestId 를 받는다. SoulCat 클라이언트는 이를 만들 수 없다. 결제 시작 전에 요청 생성 엔드포인트(기존 것이 있으면 재사용 — 원칙 6·15)를 불러 id 를 받고, 그 id 로 결제를 시작한다. 실패 시 결제창을 열지 않고 다시 시도 안내(결과가 안 나오는 것이 최악 — 막다른 길 금지).
- 9: `/records/` 목록 소스에 `saju_lifetime_bundle` 해금 기록을 추가하고, 항목 클릭 시 기존 재열람 통로(홈 카드·사주 결과)로 연결한다.

## 단계
- [ ] 1 결정 8 조사: SoulCat 결제 진입부, 서버 requestId 검증 위치, 기존 요청 생성 경로를 찾아 설계를 이 문서에 적는다.
- [ ] 2 결정 8 구현 + mock 테스트 + paid-gate-auditor + check:fast → 커밋.
- [ ] 3 결정 9 조사: /records/ 목록 소스와 묶음 해금 저장 위치, library-preservation 정책 대조.
- [ ] 4 결정 9 구현 + 테스트 + 모바일 너비 화면 확인(visual-checker) + check:fast → 커밋.
- [ ] 5 마무리: check:pre-push → push → main CI 1회 확인 → 이 문서 `status: done` → 결과 보고(운영 승격은 묻기만).
