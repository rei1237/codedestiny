---
status: done
updated: 2026-11-28
next: 없음 — 메인 세션이 wt/change-20261128-141745 를 main 에 머지하고 워크트리를 배수한다
---

# 결제 정리 후속 과제 (SoulCat 모드 제거 뒤)

## 첫 행동

워크트리 `D:\Development\codedestiny-worktrees\change-20261128-141745` 에서만 작업한다. `git log --oneline -5` 로 아래 단계 SHA 를 확인하고 체크되지 않은 첫 단계부터 이어 간다.

## 지금 상태

- 브랜치: `wt/change-20261128-141745` (base `7feed900a7`)
- 워크트리: `D:\Development\codedestiny-worktrees\change-20261128-141745`
- 마지막 커밋: 이 문서의 done 커밋 (단계별 SHA 는 아래)
- push·머지는 하지 않는다. 메인 세션이 머지한다.
- 옆 세션: `change-20261128-141727` 이 `/records/` (lib/records, worker/lib/record-library.js, app/records) 작업 중 — 건드리지 않는다. 루트 체크아웃 `d:\Development\code-destiny` 는 손대지 않는다.

## 승인 상태

- 2026-11-28 사용자: "후속 과제도 진행해줘" — 2026-11-27 SoulCat 모드 제거(54c2cfdf43) 후속 A·B·C 전체에 대한 진행 승인.
- C(결제)는 RED. 위험·검증·롤백을 이 문서에 먼저 적고 진행한다. 결제 동결 영역에 `--update` 가 필요하면 멈추고 질문을 돌려준다.
- 실결제·운영 DB 쓰기·과금 LLM 실호출은 승인 범위 밖. mock 만.

## 작업 규칙과 함정

- index.html 이 정적 셸 정본. index.html·js/** 편집 뒤 `npm run sync:public`, 무관한 webp 재인코딩 잡음은 되돌리고 재생성 미러는 모두 커밋.
- js/core/checkout-entry.js 또는 pass-verdict.js 를 바꾸면 21개 정적 페이지 + app/layout.js 의 core runtime 캐시 핀을 손으로 갱신(`verify-payment-choice-parity.mjs`).
- app/** 편집 시 `npm run sitemap:generate`.
- 단계마다 `npm run check:fast` 1회, 작은 커밋, `git status`/`git diff --stat` 확인 뒤 검증한 파일만.
- 삭제는 deletion-auditor 로 소스·__tests__/·scripts/verify-*·미러 3면 확인 후 항목별 별도 커밋.
- 달빛 분류 정규식(`billing-client.ts` ~2956, `index.html` ~25040)은 옛 브랜드 데이터 분류용이라 의도적으로 유지.

## 설계

### A. SoulCat 제거 뒤 죽은 코드
1. checkout 문구 키 `rowComposition`, `rowMethod`, `methodDirect`, `rowAmount` 와 `alliance` 의 `imageAlt`/`title`/`story` (로케일 5표 + 타입).
2. 자산 `public/assets/yeongnyangi/payment-alliance/yeoni-alliance-v1.webp` (코드 참조 0 확인, 자산 매니페스트·검증기·content-assets 규칙 확인).
3. `styles/home-funnel.css`/`styles/saju-reading.css` 의 `.cd-soulcat-entry*`, `js/core/saju/reading-personas.js` 의 `[data-soulcat-price]` (정적 셸 인라인 → 미러 재생성).

### B. 문구
index.html ~23243 "달빛 이용권 상점" → 현재 브랜드 "꿀단지 이용권".

### C. 결제 (RED)
- 문제: index.html 의 `_cdCoverageFromSubscriptionSnapshot` 호출(~26453, ~26473, ~31941)이 featureKey 를 넘기지 않아 `js/core/pass-verdict.js` 의 판매 종료 키 처리(`isSaleClosedKey`, 09c1a32f9c)를 우회한다.
- 수정: featureKey 가 있는 곳에서 넘겨 판매 종료 키는 "unknown" → 서버 판정으로 보낸다. 판매 종료 키 보유자가 새 기기에서 결제창 "passMiss" 문구를 보는 경로는 기존 패턴(서버 ALREADY_UNLOCKED → 열린 결과)으로 맞춘다.
- 위험: 로컬 스냅샷 판정이 바뀌면 이용권 보유자에게 결제창이 뜨거나(과금 노출), 반대로 미보유자에게 무료 개방(우회)될 수 있다. featureKey 추가는 "unknown" 쪽으로만 바뀌므로 결정권이 서버로 이동하는 fail-closed 방향이어야 한다.
- 검증: paid-gate-auditor 커밋 전 판정, `verify-payment-freeze`, `verify-payment-choice-parity`, check:fast(critical 자동 승격), 관련 mock 테스트.
- 롤백: C 커밋 하나만 `git revert`.

## 단계

- [x] 0. 이 문서 커밋 — 4a01307eec
- [x] A1. 미사용 checkout 문구 키 삭제 — ce96e08673 (deletion-auditor SAFE, sitemap lastmod 재생성 포함). check:fast 첫 실행의 test:node 실패는 동시 실행 잡음: 단독 재실행 5988 pass / 0 fail
- [x] A2. yeoni-alliance-v1.webp 삭제 — 45759ef418 (provenance.md 6행에 삭제 기록, 프롬프트는 기록으로 유지)
- [x] A3. `.cd-soulcat-entry*` CSS·`[data-soulcat-price]` 삭제 + 미러 재생성 — 730f94e775 (check:fast 통과: test:node 0 fail, jest 8866 pass). 후속: `__cdSajuCatPrice`·`catPrice` 문구는 소비처 없이 남음(보고만)
- [x] B. "달빛 이용권 상점" 문구 교체 — 코드 변경 없음: 82fd0491d3(2026-11-19)에서 이미 "꿀단지 이용권 상점으로" 로 바뀌어 있음. 남은 달빛: 분류 정규식(의도적 유지), billing-client.ts:1175 주석(동결 파일), i18n/.rest.json:183·i18n/.w1-strings.json:85(참조 없는 캐시 — 보고만), public/_redirects:66 주석
- [x] C. featureKey 전달 + 판매 종료 키 보유자 경로 — 6462c97041. 1차안(판매 종료 키를 진입 서버 pass-check 로 보냄)은 paid-gate-auditor FAIL(payment-gating.md 247–251 "진입 서버 이용권 선검사 부활 금지")로 기각. 채택안: 스냅샷의 canUseByPass:false 를 판매 종료 키에서만 확정 거부로 쓰지 않고 pass_snapshot_indeterminate 로 결제창을 연다 → "이용권 미적용" 안내 대신 확인 안내, 보유자는 결제창의 이용권·단건 카드에서 서버 ALREADY_UNLOCKED 로 무과금 열림. 진입 서버 왕복 0 유지, 동결 영역 해시 불변. verify-portone-single-payment-regression 에 단언 추가
- [x] 마무리: status done
