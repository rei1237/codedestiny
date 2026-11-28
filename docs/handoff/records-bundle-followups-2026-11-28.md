---
status: in-progress
updated: 2026-11-28
next: 결정 대기 — 클라이언트 다시 열기(js/destiny-profile.js)는 결제 동결 매니페스트 --update(캐시 핀 재스탬프) 승인 후 적용
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

- [~] 1. 구매 프로필로 다시 열기 — 서버 절반 완료 `5273591229`, 클라이언트 절반 **승인 대기**
  - 서버: reopen href·nativeHref 에 `&profile=<소유 확인된 프로필 카드 id>`(ProfileCard 를 ownerQuery 로 조회해 찾은 경우만). `birth:` 해시·주문번호·타 계정 카드는 싣지 않는다(테스트로 고정).
  - 기존 프로필 선택 URL 파라미터는 없었다(js/·app/·lib/·index.html 에서 `get('profile'`·`profileId=` 등 git grep 0건). 그래서 기존 라우트에 `profile` 쿼리를 새로 붙였다(새 라우트 아님). 클라이언트가 소비하기 전까지 이 쿼리는 무시되므로 현재 동작은 변하지 않는다.
  - 클라이언트(미커밋, 패치로 보관): `cdOneStepFreeSajuEntry` 가 `?profile=` 을 읽어 `_dpLoadFromServer` 로 받은 **서버 소유 프로필** 목록에서 찾았을 때만 그 프로필로 `_injectAndRun`, 아니면 기존 현재 프로필 흐름. 테스트 `__tests__/ui/direct-fortune-entry.behavior.test.js` 6/6 통과.
  - 막힌 이유: js/destiny-profile.js 내용이 바뀌면 `PAID_SERVICE_RUNTIME_SRC` 캐시 핀을 `scripts/restamp-paid-runtime-pins.mjs` 로 다시 찍어야 하고(안 하면 verify:payment-choice-parity 실패 — 실측: 기대 `build-887da1388c09`, 실제 `build-7214d33f3fb6`), 그 핀이 동결 파일 `app/_lib/billing-client.ts` 에 있어 `node scripts/verify-payment-freeze.mjs --update` + `config/payment-freeze.json` 갱신이 필요하다. 선례 `88f315fc95`. 지시상 결제 동결 --update 는 멈추고 묻는 항목.
  - 승인 시 순서: 패치 적용(`git apply docs/handoff/records-bundle-followups-client.patch`) → `npm run sync:public`(webp 잡음 되돌림) → `node scripts/restamp-paid-runtime-pins.mjs` → `node scripts/verify-payment-freeze.mjs --update` → paid-gate-auditor → check:fast → 커밋.
- [x] 2. 이관 사본 중복 제거 `5273591229` — 같은 orderId 를 가진 소유 행 중 가장 작은 `_id` 하나만 목록에 남김(`_canonical` $lookup, $limit 앞). 상세 조회는 사본 id 로도 열린다(숨기거나 지우지 않음). orderId 없는 행은 그대로 각각 표시.
- [x] 3. 서비스명·제목 중복 표시 `5273591229` — 제목을 `<프로필 이름> 프로필` 로(서비스명은 메타 줄에 그대로), 질문 줄은 비움. 프로필 카드가 지워졌으면 기존 서비스명 제목으로 폴백.
- [x] 4. check:fast·390px 시각 확인
  - check:fast(critical, 클라이언트 변경 포함 상태): paid-gate 78개 중 `verify:payment-choice-parity -- --self-test` 1개만 실패(merge-base 통과) — 위 캐시 핀 때문. 나머지 통과. 클라이언트 변경을 되돌린 뒤 `__tests__/worker/record-library.test.js` 35/35 재통과. 커밋 트리(서버만)에서는 js/destiny-profile.js 가 바뀌지 않으므로 핀 실패 원인이 없다.
  - 390px(mock /api/records, Playwright): 첫 카드 "라이트 사주 풀이 · 저장됨" / 제목 "나 프로필" — 문구 1회, 잘림·겹침 없음, 대비 6.59~15.38:1, scrollWidth 390. 둘째 카드는 하단 탭바에 가려 화면 판정 불가, DOM 으로 같은 구조 확인("엄마 프로필").
- [ ] 5. 문서 닫기 — 클라이언트 절반(1단계) 승인·적용 후 `status: done`
