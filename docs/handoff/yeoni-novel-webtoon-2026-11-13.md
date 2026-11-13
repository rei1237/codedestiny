---
status: active
updated: 2026-11-13
next: 1단계 1차 배포(rebase → episodes [] → 사이트맵 → 검사 → push → production 수동 실행)
---

# 연이의 운명 노벨 웹툰: 1차 배포 → 7편 제작 → 2차 배포 → 주간 연재

## 첫 행동
1. 이 문서를 끝까지 읽는다. 기준 기획서는 `docs/design/yeoni-novel-webtoon-plan-20261113.md`(사용자 원문 그대로)다.
2. `next`의 단계만 실행한다. 끝나면 이 문서의 체크박스와 결과를 갱신하고 커밋한 뒤 요약을 돌려준다.
3. 승인 범위 밖의 외부 행동이나 새 위험이 나오면 멈추고 보고한다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\yeoni-prologue-webtoon-20261113`, 브랜치 `feat/yeoni-prologue-webtoon`.
- 아직 push 안 함. 앞선 커밋 b83141a34(프롤로그 교체 구현)·e11f9595a·84b4b6b77(테스트). 기반은 옛 origin/main 6b0157ba7, main은 a6158fde0 이상으로 진행됨 → rebase 필요.
- 운영(code-destiny.com)에는 아직 옛 연재(ep2 「젖은 봉투」 11-14 공개 예정 등)가 있다. **11/14(토) 21:05 KST 주간 cron 전에 1차 배포로 옛 회차를 내려야 한다.**

## 승인 상태 (다시 묻지 않는다)
- 2026-11-13 사용자: "지금 배포하도록하고 사이트맵에 추가해". 이어서 선택지 「지금 1차 배포 + 완성 뒤 2차」 선택.
  → 이 시리즈의 1차·2차 운영 배포(`gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`)와, 2차 뒤 늦게 완성된 회차의 추가 배포(공개일 전)까지 승인. 그 밖의 배포는 다시 묻는다.
- 「1화 즉시, 이후 매주」: 1화는 배포 즉시 공개, 2화 11/21 · 3화 11/28 · 4화 12/05 · 5화 12/12 · 6화 12/19 · 7화 12/26, 모두 토 21:00 KST.
- 「내리고 새 2화를 11/21부터」: 옛 ep2~ep6 내림.
- 「다운로드 원본까지」: 사이트 안 옛 프롤로그 사본과 `C:\Users\user\Downloads\yeoni_prologue_romance_fantasy_v3` 폴더 삭제 승인. **2차 배포 성공 뒤에** 지운다. 그 전에 `texts/production_prompts.txt`를 빌드 폴더로 복사.
- 「서한비(흑호)로 등장」: 박지은이라는 이름은 쓰지 않는다. `D:\CodeDestiny-Build\박지은 캐릭터.png`는 흑호 외형 참조로만.
- 「프롤로그와 같은 형식」: 1122×1402(4:5) 쪽, 대사는 그림 안에, PageReader로 읽기.
- 총 7편: 1~3화 = 기획서 프롤로그 1~3화(재작화), 4~7화 = 기획서 다음 원고 가안.
- 기억 규칙 「스토리 웹툰 그림은 사용자가 직접」은 이 시리즈만 예외(사용자 직접 요청). 기억 파일에 이미 기록함.

## 작업 규칙과 함정
- 사용자 보고는 한국어. 수정하면 커밋까지(push는 이 문서의 승인 범위 안에서만).
- 공유 main push: `git log origin/main..HEAD`로 내 커밋만 있는지 확인 → fast-forward `git push origin HEAD:main`. 남의 미push 커밋을 섞지 않는다.
- push는 스테이징까지. 운영은 main CI(pr-ci.yml) 초록 확인 후 production 수동 실행. 로컬 wrangler 운영 배포는 가드로 막혀 있다.
- 리포 전체 rg는 타임아웃 → 경로를 좁힌다. python 없음 → node. 로컬 `D:\Development\code-destiny`는 다른 브랜치 → 워크트리만. 워크트리 정리는 `npm run worktree:remove`.
- `npm test`의 `__tests__/fortune/sky-and-range.test.mjs` 실패 1건은 기존 환경 문제(origin/main에서도 실패), 손대지 않는다.
- 산출물(생성 원본·QC)은 D 드라이브 `D:\CodeDestiny-Build\yeoni-novel-webtoon-20261113\`.
- 작화 검수
  - 영냥이 귀는 원본 크기로 정확히 2개(로그에 `"ears": 2`).
  - 네오 사자 시트(`네오프로필1/2.png`, `D:\캐릭터 세계관\네오 프로필.png`) 참조 금지.
  - 다시 그릴 때 실제 에셋 이미지를 `-i`로 첨부하고 나란히 비교.
  - 그림 속 한국어는 원고와 한 글자도 다르지 않아야 한다. 실패한 쪽은 최대 3번 재생성, 그래도 안 되면 표시하고 보고.
- 주간 cron(`.github/workflows/yeongnyangi-weekly-publish.yml`, 토 21:05 KST)은 **운영 중인 커밋을 다시 빌드**한다. 공개 전 회차도 status 'ready'로 운영 커밋에 들어 있어야 자동 공개된다.

## 설계
- 1화 = `/yeongnyangi/season-1/prologue/` (항상 공개). `lib/yeongnyangi/prologue.mjs`의 pages를 새 그림으로 교체, 이미지 경로 `public/images/webtoons/yeoni-prologue/NN-{720,1122}.{avif,webp}` 유지.
- 2~7화 = `lib/yeongnyangi/season-1.mjs` episodes `ep2`~`ep7`, `format:'pages'`, `pages:[{n,alt}]`, w 1122 h 1402, publishAt 위 일정.
- 게이트(`lib/yeongnyangi/serial.mjs`): 페이지형은 [12,24]쪽, 모든 쪽 alt, `content/yeongnyangi/season-1/epN/NN-{720,1122}.{avif,webp}` 존재. `scripts/publish-yeongnyangi-serial.mjs` 복사 규칙도 맞춘다.
- `[episode]` 라우트는 페이지형이면 PageReader(+Chrome, 회차별 storageKey). 끝 카드는 프롤로그 page.tsx에서 공용 컴포넌트로 추출. noindex 유지.
- 사이트맵: coreRoutes에 `/yeongnyangi/season-1/prologue` 추가(회차는 계속 제외).
- 페이지 = 1122×1402, 한 쪽에 1~3컷, 회당 16~22쪽. 답장 화면·문 공개는 한 쪽 통째.
- 참조 시트(`D:\CodeDestiny-Build\`): 인간 연이 `여_연이 프로필 사복버전.webp`(인물 왼쪽 귀 위 잔꽃 핀), 꽃돼지 연이 `연이 프로필1.png`·`연이 프로필2.png`·리포 `docs/design/character-references/yeoni-profile-v1.png`(큰 연꽃 인물 오른쪽 귀, 큰 꽃잎 5장, 5화 이후 같은 잎 하나 흰색), 영냥이 `양냥이 프로필 시트.webp`·리포 `public/assets/yeongnyangi/original/hero-800.webp`, 흑호 `박지은 캐릭터.png`, 인간 네오 `네오 인간 프로필1.png`(필요 시만).
- 생성 파이프라인: `D:\CodeDestiny-Build\webtoon-revamp-20261107\gen.mjs` 방식(`codex exec … -i <refs>`, 내장 image_gen, 동시 3, 8분 타임아웃). 화풍 문단은 프롤로그 v3 `production_prompts.txt`(세피아 선의 정제된 로맨스판타지 만화체, 크림·로즈·우드, 치비·3D 금지).
- 변환: sharp webp q80 / avif q52 effort 6, 폭 720·1122.
- 원작: `content/novel/episodes.source.json`(EP.01·01A·02), 바이블 `docs/webnovel_review/SAJU_SERIES_BIBLE.md`.

## 단계
- [ ] 1단계: 1차 배포 — rebase, `episodes: []`, null 안전(서가·시즌 목차·프롤로그 끝 카드), 주간 cron null 처리 확인(필요 시 가드), 사이트맵 coreRoutes + `npm run sitemap:generate`(루트·public·ledger 커밋), 테스트 0회차로 수정, `check:fast`·`check:pre-push`, push, CI 초록, production 실행, 운영 확인(200·sitemap·`SERIAL_NOW=2026-11-14T21:10:00+09:00 node scripts/publish-yeongnyangi-serial.mjs --check` 공개 0).
- [x] 2단계: 4~7화 글콘티(회당 30~40컷) + 7편 쪽 분할표(쪽마다 컷 번호·그림에 넣을 한국어 전문) → `docs/design/yeoni-novel-webtoon-script.md`. `docs/design/yeongnyangi-season1.md` 갱신. production_prompts.txt 복사.
- [x] 3-1단계: 1화 작화·QC·변환 (18쪽, `ep1\out`)
- [x] 3-2단계: 2화 작화·QC·변환 (20쪽, `ep2\out`) (11/21 21:00 전 운영 필수)
- [x] 3-3단계: 3화 (19쪽, `ep3\out`. 13쪽은 핀 좌우를 지키려 방을 좌우 반전, 경미한 차이 수용)
- [ ] 3-4단계: 4~5화
- [ ] 3-5단계: 6~7화
- [ ] 4단계: 코드 통합(페이지형 연재, 끝 카드 추출, 옛 컷 삭제, 테스트)
- [ ] 5단계: 2차 배포, `SERIAL_NOW` 회차별 확인, Downloads 원본 삭제, 보고

## 결과 기록
(각 단계 에이전트가 여기에 결과·커밋 SHA·운영 확인을 적는다.)

- 2단계(2026-11-13): 원고는 빌드 폴더 `script\`(pages.md·pages.json·episodes-4-7.md, 생성기 build-pages.mjs). 리포 사본 `docs/design/yeoni-novel-webtoon-script.md`. 쪽 수 18/20/19/20/20/19/17.
  - 확정한 각색 결정: 인간 연이는 시트 사복(크림 꽃무늬 블라우스·니트 조끼·모브 치마), 밤에는 조끼가 오른쪽 책상 의자에 걸림. 7화 대사 「…나였어. 사람이던 나.」. 흰 꽃잎은 바깥 아랫잎, 5화 35컷부터. 5화 33~34컷 반격 화면 「민원 처리 완료 · 교통카드 · ★☆☆☆☆」. 네오 암시 「놓치지 않는다」(5화 38)·「완성형」(7화 27). 호랑이는 스스로 이름을 대지 않음. 7화 끝 목소리 「늦었네 / 너, 항상 늦잖아」.
- 작화 파이프라인: 빌드 폴더 `gen\`(gen.mjs·build-jobs.mjs·letter.mjs·export.mjs, 회차 설정 `gen\episodes\epN.json`, 캐릭터 고정 `char-locks.json` = 4화 10쪽 돼지·11쪽 고양이). 모델 레터링 정확도가 높아 letter.mjs는 쪽번호 꼬리표만 붙인다(`textOk:false`는 모델 모드에서 정상).
- 4화: 1~12쪽 채택(`ep4\qc\log.json`). 13~16쪽 초안, 17~20쪽 미생성 상태에서 이어받음.
- 함정: 2026-11-13 하위 에이전트들이 API 403(Cloudflare authentication_failed)로 중단된 적 있음. 중단되면 부분 상태(`accepted`·`qc\log.json`)부터 다시 시작.
- Windows 체크아웃에서는 `verify:public-mirror-fresh`가 index.html 줄바꿈(CRLF)만으로 실패할 수 있다. `git diff --ignore-cr-at-eol`로 내용 차이가 없으면 되돌리고 나머지 검사를 따로 돌린다.
