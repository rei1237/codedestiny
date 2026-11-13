---
status: in-progress
updated: 2026-11-13
next: 2단계 — __tests__/ui/yeongnyangi-serial.test.mjs 수정 + yeongnyangi-prologue.test.mjs 추가 후 테스트 실행
---

# 서가 대표 웹툰 → 프롤로그 「운명을 알고 싶다」 교체

## 첫 행동
워크트리 `D:\Development\codedestiny-worktrees\yeoni-prologue-webtoon-20261113`(브랜치 `feat/yeoni-prologue-webtoon`, origin/main 기반)에서 `git log --oneline -3`으로 상태를 확인하고, 아래 단계의 첫 미완료 항목부터 진행한다.

## 지금 상태
- 브랜치 `feat/yeoni-prologue-webtoon`, 구현 커밋 `b83141a34`. 푸시 안 함.
- 계획 원문: `C:\Users\user\.claude\plans\c-users-user-downloads-yeoni-prologue-ro-whimsical-toast.md`

## 승인 상태 (2026-11-13 사용자 답변)
- 연재: 「데운 방석」(ep1)을 연재에서 빼고 새 웹툰을 시즌 1 프롤로그(1화 자리)로. ep2~6 번호·slug·일정 유지.
- 방석 그림: 이용 안내 웹툰(MoonlightTutorial)에 재사용.
- 새 리더: 새 웹툰에만. CutReader·회차 화면 변경 금지.
- 수정 후 커밋은 자동. **푸시·배포는 사용자 요청 시에만.** 받지 않았다.

## 작업 규칙과 함정
- 사용자 보고는 한국어. 산출물·임시파일은 D: 또는 scratchpad.
- 로컬 `D:\Development\code-destiny`는 `feat/world-cast-page`(관련 코드 없음) — 반드시 이 워크트리에서만 작업.
- 리포 전체 rg는 타임아웃 남. 경로를 좁혀 검색.
- python 없음. node로 스크립트.
- `season-1-cuts.mjs`는 생성 파일 — 수정 금지(ep1 데이터 남아 있어도 게이트는 episodes만 돈다).
- 워크트리 삭제는 `npm run worktree:remove`(지금은 삭제하지 않음).

## 설계 (구현 완료)
- 에셋 `public/images/webtoons/yeoni-prologue/NN-{720,1122}.{avif,webp}` 24쪽, 데이터 `lib/yeongnyangi/prologue.mjs`(PROLOGUE, prologuePage).
- `lib/yeongnyangi/season-1.mjs`: prologue→새 웹툰, ep1 제거.
- 리더: `app/yeongnyangi/season-1/prologue/page.tsx` + `app/components/webtoon/PageReader.tsx`·`PageReaderChrome.tsx`·`page-reader.module.css`. layout 우회 목록에 경로 추가.
- 서가 `app/consultations/StoryDiscovery.tsx`: 대표 카드는 항상 프롤로그, 최신화는 카드 밖 보조 링크 `[data-serial-latest]`.
- 이용 안내: 패널 6 ← cushion-07, 패널 5 ← cushion-05 (`lib/brand/moonlight-guide.mjs`, MoonlightTutorial img w/h). 출처는 `docs/design/consultation-webtoon-assets.json`.
- 계획과 다른 점: 진행 막대가 하단이 아니라 상단 2px.

## 단계
- [x] 1. 구현·에셋·출처 기록 (b83141a34)
- [ ] 2. 테스트: `__tests__/ui/yeongnyangi-serial.test.mjs`를 회차 5개·상태 [ready,ready,draft,draft,draft]·ep1 없는 slug·oneCut 키 ep2·프롤로그 href로 수정. 신규 `__tests__/ui/yeongnyangi-prologue.test.mjs`(24쪽·alt 비어있지 않음·avif/webp 파일 존재·StoryDiscovery가 PROLOGUE.href 사용). `node --test` 세 파일(+consultation-webtoon-entry) 후 `npm test`, 가능하면 typecheck/lint.
- [ ] 3. `SERIAL_NOW=2026-11-13T12:00:00+09:00 node scripts/publish-yeongnyangi-serial.mjs --check` — ep1 없고 ep2 예정인지.
- [ ] 4. 브라우저 검증(390×844, 1280): 홈 서가, /yeongnyangi/season-1/, /yeongnyangi/season-1/prologue/(쪽 순서, CLS, 바 숨김/표시, 진행, 이어 보기, 끝 카드, 가로 스크롤 없음), 이용 안내 모달. 스크린샷은 scratchpad 또는 D:.
- [ ] 5. 수정분 커밋, 이 문서 status: done.

## 보고할 위험
- 2화 「젖은 봉투」는 1화의 방석에 눌린 봉투에서 이어져, 1화를 빼면 도입 맥락이 약해진다(대사 미수정).
- 2화 공개 2026-11-14 21:00. 배포 전까지 운영에는 반영 안 됨.
- 사이트맵 미변경(프롤로그 경로 미포함 여부 확인 필요).
