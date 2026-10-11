---
status: active
updated: 2026-10-12
next: 메모리 여유 확보 후 미완료 check:fast와 실패한 check:pre-push를 재검증하고 main CI 복구 후 통합·push한다. 이후 주역 전용 상세페이지 제작을 이어간다.
---

# 유료 상세페이지 — 11개 후보 재확인 후 차단 사항

사용자 요청: 마지막 전달 `aa70afbcd951ab84daab1874b187756c65c05250` 이후 남은 11개 판매·결과를 확인하고 제작 가능한 1~3개를 종합 사주 v2 품질로 제작·모바일 검수·적용한다. 가격과 기존 결제 진입 유지, 요청된 운영 배포 중복 금지.

## 최초 조사 상태 (8912a9d)

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\paid-details-next-20261011-235722`
- 브랜치: `wt/paid-details-next-20261011-235722`. 동시 작업 예외로 안전 생성 스크립트를 사용했다. PR 없음.
- 기준 SHA: `aa70afbcd951ab84daab1874b187756c65c05250`. 재개 시 이 문서를 마지막으로 변경한 커밋은 `git log -1 --format=%H -- docs/handoff/2026-10-12-paid-details-sale-blockers.md`로 확인한다.
- 수정 파일은 이 문서와 `docs/product-details/remaining-sale-audit-2026-10-12.md`뿐이다. 상품·결제·엔진 코드와 이미지 무변경. 조사표에 11개별 근거가 있다.
- 신규 제작 가능 0개: 주역 1개 계산 불일치, 상담 4개 선택 UI 미연결, 나머지 6개 독립 판매 근거 없음/기존 연간 상품 연결. 신규 상세 제작·모바일 검수 완료가 아니다.
- 2026-10-12 사용자가 “계산 수정해”라고 명시 승인했다. 계산 수정 답변 대기는 해소됐다.
- 기존 인수인계 `2026-10-11-paid-product-details-high-quality-continuation.md`는 후속 제작이 끝나지 않았으므로 active 유지.

## 검증·전달

- 조사표 기준 `npm run check:fast -- --plan`, `npm run check:fast`, `git diff --check` 통과. 문서 외 테스트·모바일 검수 미실행.
- push 보류: 원격 main `aa70afbcd` CI 38148771754 실패. 직접 오류 `TypeError: panel.before is not a function` (자미두수 상세·궁합 카드 검사). 다른 변경 위에 push 금지 규칙 적용.
- 기존 운영 실행 38148418850 조회 시 진행 중. 추가 dispatch 없음. 운영 Pages·Worker는 모두 `54862e3094e756f998712dcfaa5102de0ac54ba1`, 상담 status는 `enabled: false`였다. 배포 완료로 보고하지 않는다.
- main에는 다른 세션의 가격·홈·번역 등 미커밋이 존재한다. 손대지 않았다. 이 작업본은 미전달 조사 기록을 보존하므로 아직 배수하지 않는다.

## 재개

계산 수정 승인 확인은 끝났다. 아래 수정·검증 기록을 먼저 확인한다. 전달 차단 해소 후 종합 사주 v2 실제 이미지와 원고를 확인하여 주역만의 원고·이미지·목차·편집 예시를 제작한다. 360·390·430px 및 데스크톱 실제 진입, mock 네트워크, CTA trial, 이미지 실패 대체 본문을 확인한다.

독립 판매·결과가 구현되지 않은 후보를 새 상품으로 만들거나 재포장하지 않는다. CI 복구는 다른 작업 범위이며 자동으로 검사 우회나 운영 재배포를 하지 않는다.

## 2026-10-12 계산 수정

- `js/iching-engine.js`: 기존 상·하괘 추첨을 유지하고 문왕괘서 대응표로 이름·Unicode 괘 기호·지혜 문구를 결정한다. 별도 괘 이름 난수는 제거했다.
- 괘 선택 난수의 분모를 2^32로 수정해 최댓값에서도 배열 인덱스 8이 나오지 않게 했다. 균열 애니메이션 난수는 변경하지 않았다.
- `__tests__/ui/iching-hexagram.test.mjs`: 외부 원전 구성표를 독립 fixture로 사용하여 실제 `_doReveal`의 렌더 전달값을 검사한다. 8,192개 seed에서 64괘 전체, seed 0의 화산려, 난수 최댓값 경계를 검증한다.
- 구성표 근거: https://iching.sourceforge.net/Documentation/design/design-one/index.html (Hexagram composition).
- 가격·이용권·월정석·단건 결제·인증·API·DB·입력·결제 복귀 로직 무변경. 생성 미러·로더·셸 캐시 키를 동기화했다.
- 단위 회귀 `node --test __tests__/ui/iching-hexagram.test.mjs`: 3/3 통과. 상세페이지 제작·모바일 검수·실결제·실 LLM은 미실행.
- 계산 수정 커밋: `1a8094a9a89c351d984094057a70dd9aa0b3328d`. 수정 전 커밋의 소스에 같은 회귀 검사를 적용하면 3개 모두 실패함을 확인했다.
- `npm run check:fast -- --plan`은 critical로 자동 승격했다. 내부 `npm test`는 통과(786.6초). 프로필·인증·결제 선택·휴대폰 동의 등 추가 가드까지 통과했으나, 아래 메모리 오류 확인 후 이번 검사 프로세스 트리만 중단했다. 전체 check:fast 통과로 보고하지 않는다.
- 커밋된 clean 트리에서 `npm run check:pre-push`: home-service-registry 통과, public-mirror-fresh 생성기에서 `fatal error: out of memory allocating heap arena map`으로 실패. sitemap-drift 단계는 미실행. 소스/public 주역 엔진의 바이트 일치는 별도 확인했다. 앞서 `npm run sync:public`은 두 번 완료했다.
- `git diff --check` 통과. 로컬 전체 검사·미러 신선도는 메모리 여유 확보 후 재실행해야 한다. 실패를 우회하지 않으며 운영 배포도 실행하지 않았다.
- 현재 전달 차단: main `bddfe0b64deb0ee35eb0b8d20cc06e477e98020d`, CI 38151587362 실패. `Verify ziwei chart detail view and compatibility card`의 기존 오류이며 이번 주역 변경을 push하지 않는다. 워크트리는 미전달 변경 보존을 위해 유지한다.
