---
status: done
updated: 2026-11-13
next: 없음 — 푸시·배포는 사용자 요청 시에만(2화 공개 2026-11-14 21:00 전 배포 여부 결정 필요)
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
- [x] 2. 테스트: `__tests__/ui/yeongnyangi-serial.test.mjs`를 회차 5개·상태 [ready,ready,draft,draft,draft]·ep1 없는 slug·oneCut 키 ep2·프롤로그 href로 수정. 신규 `__tests__/ui/yeongnyangi-prologue.test.mjs`(24쪽·alt 비어있지 않음·avif/webp 파일 존재·StoryDiscovery가 PROLOGUE.href 사용). `node --test` 세 파일(+consultation-webtoon-entry) 후 `npm test`, 가능하면 typecheck/lint.
- [x] 3. `SERIAL_NOW=2026-11-13T12:00:00+09:00 node scripts/publish-yeongnyangi-serial.mjs --check` — ep1 없고 ep2 예정인지.
- [x] 4. 브라우저 검증(390×844, 1280): 홈 서가, /yeongnyangi/season-1/, /yeongnyangi/season-1/prologue/(쪽 순서, CLS, 바 숨김/표시, 진행, 이어 보기, 끝 카드, 가로 스크롤 없음), 이용 안내 모달. 스크린샷은 scratchpad 또는 D:.
- [x] 5. 수정분 커밋, 이 문서 status: done.

## 결과 (2026-11-13)
- 2단계: serial·prologue·consultation-webtoon-entry 세 파일 `node --test` 15/15 통과. `npm test` — jest 476 스위트·7978 통과(1 skip), node 5020 중 5019 통과·1 실패. 실패는 `__tests__/fortune/sky-and-range.test.mjs`(워크트리에 생성 데이터 `fortune/data/daily-2026-11-13.json` 없음, `npm run fortune:build-data` 필요). origin/main(a6158fde0)에서도 같은 실패라 이번 변경과 무관. `tsc --noEmit` 오류 0, 변경 경로 `eslint --quiet` 오류 0. 구현 수정 없음.
- 3단계 `--check`: ep2 scheduled 2026-11-14T21:00, ep3 scheduled 2026-11-21T21:00, ep4~6 held(draft, 0 cuts). ep1 없음.
- 4단계(`npm run dev` 목업 + Playwright, 390×844·1280×900):
  - 홈 서가 대표 카드 href = 프롤로그. 최신화 보조 링크는 공개 회차가 아직 없어 미표시(정상).
  - `/yeongnyangi/season-1/`: ep1 링크 0, 프롤로그 카드와 2화 공개 예정 안내.
  - 리더: 24쪽 순서·1122×1402·alt 정상, 쪽 사이 틈 0, CLS 0.0000/0.0001, 가로 스크롤 0. 아래로 스크롤하면 바 숨김, 위로 올리면 표시, 끝에서 표시. 진행 0→1, 끝까지 읽으면 저장값 삭제. 끝 카드 「다음 화 11월 14일(토) 21:00 공개」.
  - 이어 보기: 8쪽 저장 뒤 다른 페이지를 거쳐 재진입하면 안내 표시, 누르면 8쪽으로 이동. 새로고침은 브라우저가 스크롤을 복원해 안내가 곧바로 닫힌다(의도대로).
  - 이용 안내 모달: cushion-07(720×1080)·cushion-05(720×480) 로드 확인.
  - 콘솔 오류는 목업 API 501뿐. 새 영냥이 이미지 없음(귀 검수 생략).
  - 스크린샷: `D:\Development\Temp\claude\ec29f026d20d029c\ac1fd0fa-6f06-46d3-877c-2e763561c6d9\scratchpad\shots\`(m-*·d-*).

## 보고할 위험
- 2화 「젖은 봉투」는 1화의 방석에 눌린 봉투에서 이어져, 1화를 빼면 도입 맥락이 약해진다(대사 미수정).
- 2화 공개 2026-11-14 21:00. 배포 전까지 운영에는 반영 안 됨.
- 사이트맵 미변경: sitemap.xml·public/sitemap.xml 모두 프롤로그 경로 미포함(시즌 목차만 있음). 넣을지는 결정 필요.
