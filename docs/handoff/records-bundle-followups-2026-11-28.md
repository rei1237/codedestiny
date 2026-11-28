---
status: in-progress
updated: 2026-11-28
next: 1단계 — 다시 열기 URL 이 구매 프로필을 고르도록 기존 프로필 선택 파라미터를 찾는다
---

# /records/ 라이트 사주 풀이 후속 과제 (2026-11-28)

## 첫 행동

워크트리 `D:\Development\codedestiny-worktrees\change-20261128-141727` 에서 `git status` 확인 후, 아래 단계 중 첫 미체크 항목부터 진행한다. 루트 체크아웃(`d:\Development\code-destiny`)은 건드리지 않는다.

## 지금 상태

- 브랜치 `wt/change-20261128-141727`, 기준 `7feed900a7`.
- 선행 작업: `92e9b39740` (List light saju bundle unlocks in the records archive).
- 관련 파일: `lib/records/service-registry.js`(source `saju-bundle`), `worker/lib/record-library.js`, `app/records/view/SavedRecordClient.tsx`, `__tests__/worker/record-library.test.js`.

## 승인 상태

- 2026-11-28 사용자: "후속 과제도 진행해줘" — 아래 3개 후속 과제 범위.
- push·머지·운영 배포는 승인 밖(메인 세션이 머지). mock 만, 운영 DB 쓰기·과금 LLM·실결제 없음.

## 작업 규칙과 함정

- 정책: `docs/context/library-preservation.md` — 구매 결과를 숨기거나 지우지 않는다. 재열람은 저장 원본, 추가 결제·차감·LLM 없음. `/records/` 와 `/yeongnyangi/library/` 분리 유지.
- URL·응답에 다른 계정 프로필·출생 정보 노출 금지. 원시 출생 정보를 URL 에 싣는 방법만 있으면 불투명 id 를 쓰거나 멈추고 묻는다.
- 새 라우트·스키마 변경·결제 동결 --update 가 필요해지면 멈추고 이 문서에 기록.
- app/** 변경 → `npm run sitemap:generate`, js/** 변경 → `npm run sync:public`.
- 다른 에이전트가 `change-20261128-141745` 에서 index.html/CSS/카피 정리 중 — 그 영역은 건드리지 않는다.

## 설계

1. 다시 열기: 홈 카드·사주 결과가 이미 지원하는 프로필 선택 파라미터를 찾아 reopen URL 에 구매 프로필의 불투명 id(`purchaseProfileId`)를 싣는다. 소유 계정 프로필일 때만.
2. 중복 제거: 생일 기반 이관 사본(PROFILE→BIRTH 복사, BACKFILL)이 같은 구매를 여러 행으로 보이게 한다. 목록에서 구매 단위로 하나만(결정적 대표 행) 남긴다. 소유 확인 유지.
3. 카드에 "라이트 사주 풀이" 두 번(서비스명·제목) — 기존 패턴으로 작게 고칠 수 있을 때만.

## 단계

- [ ] 1. 구매 프로필로 다시 열기
- [ ] 2. 이관 사본 중복 제거
- [ ] 3. 서비스명·제목 중복 표시
- [ ] 4. check:fast·390px 시각 확인
- [ ] 5. 문서 닫기
