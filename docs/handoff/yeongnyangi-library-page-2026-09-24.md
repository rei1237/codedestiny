---
status: done
updated: 2026-09-25
next: (선택, 후속) app/yeongnyangi/_components/FreeFortune.tsx:49 도 logout 이벤트에 출석을 다시 조회하는 같은 구조다(코드 추적, 401 루프 미재현). 고칠지는 사용자 결정.
---

# 영냥이 내 상담 기록 화면 — 무한 로딩·밋밋한 화면

## 왜

> 영냥이 서비스에서 내 상담 기록을 보려고 하면 바로 잘안되고 상담 기록 화면이 밋밋하므로 영냥이 이미지를 그리거나 활용해서 넣도록하고 … (2026-09-24)

## 지금 상태

- 완료(2026-09-25). 커밋 두 개 — `fix(yeongnyangi): stop the records page reloading on logout and add state art`(`app/yeongnyangi/_components/Library.tsx`) · `fix(yeongnyangi): space the records login button and soften the scene edge`(같은 파일 + `yeongnyangi.module.css` 의 Library 전용 클래스 2개 + 사이트맵 원장 `/` signature).
- `cd:auth-changed` 의 `detail.event` 가 `logout` 이면 요청 중단·목록 비움·로그인 안내만 하고 다시 조회하지 않는다. detail 없는 이벤트·로그인 이벤트·storage 변경은 전처럼 다시 조회한다.
- 제목 옆 그림 한 칸을 상태마다 바꾼다: 로그인 필요 `original/login.webp`, 로딩·빈 목록 `original/signup.webp`, 목록·오류 `hero.webp`. 모두 제목 밖·`alt=""`.
- 타임아웃 문구는 이 화면에서만 "응답이 늦어지고 있어요. 잠시 후 다시 불러와 주세요." 로 바꿨다.

## 원인 (브라우저 실측으로 확정)

1. 목록 GET 401 → `authFetch` 의 refresh 도 쿠키 없음·만료면 401(`worker/routes/auth.js:3726` `handleRefresh`).
2. `app/_lib/auth-client.ts:443-444` 가 `clearClientAuthState()` + `publishAuthSync("logout")` → `:355` 가 `cd:auth-changed` 를 동기로 발행한다(detail `{source,event:'logout',at}`).
3. 수정 전 `Library.tsx` 의 `reset` 이 그 이벤트에 다시 `load()` → 1로 돌아가 반복했다.

실측(수정 전 정적 빌드, 세션이 죽은 목): 6초에 목록 GET 27·refresh 28, 9초에 43·44 로 계속 늘었다. 수정 후는 6초에 목록 1·refresh 3, 9초에도 그대로.

## 계획과 달라진 점

- 계획은 `.progress`·`ReadingLoading` 패널 재사용 + `.consultation [role=alert]` 추가였다. 실제로는 기존 `.spiritIntro` 헤더(그림 152px, 600px 이하 124px 위 가운데)에 그림 한 칸을 두고 상태마다 바꿨다.
- 이유: `.consultation` 은 `Consultation.tsx`·`QuestionSkyConsultation.tsx`·`SpiritConsultation.tsx` 도 쓰므로 `[role=alert]` 규칙이 그 화면 경고까지 바꾼다. `.progress` 그림은 문 장면을 담기에 작다. 한 화면에 고양이 하나로 맞췄다.
- `.spiritIntro` 도 `QuestionSkyConsultation`·`SpiritConsultation`·`SpiritResult` 가 같이 쓰므로 건드리지 않았다. 보정은 Library 전용 `.libraryIntro`(글 칸 `keep-all`, 버튼 위 16px)와 `.libraryFade`(signup 그림 아래 14% 페이드 — 원본 아래가 일직선으로 잘려 있다)만 더했다. login 그림은 그 직선이 바닥 받침으로 읽혀서 페이드를 넣지 않는다.

## 검증 (2026-09-25, 전부 목·실호출 0)

- `node scripts/verify-yeongnyangi-browser.mjs --build-static` EXIT 0.
- 임시 스크립트(커밋 안 함): 죽은 세션은 목록 요청 1회 뒤 멈추고 로그인 버튼·login 그림이 뜬다. 로그아웃 이벤트에 재조회 0, 로그인 이벤트에 1회 재조회. 로딩·목록·로그인·빈 그림, 360/390/430/1280 가로 스크롤 없음, pageerror 0 — PASS.
- `verify-yeongnyangi-consultation-browser.mjs` PASS · `verify-yeongnyangi-spirit-ui.mjs` 4/4 PASS(realLlmCalls 0, realPgCalls 0).
- 아래 보정 뒤 재빌드(EXIT 0, 132초)에서도 위 세 검증이 같은 결과로 통과했다(죽은 세션 6초·9초 모두 목록 1·refresh 3).
- `npm run check:fast -- --committed-head` EXIT 0(146초): doc-freshness·sitemap-drift OK, typecheck, test:node ALL PASS, smoke:core 105/105, jest-related 대상 없음.
- 보정분(원장 포함) `npm run check:fast` EXIT 0(399초): 원장이 공유 검증 설정으로 분류돼 critical 전체 검증 — lint 전체, sitemap-drift OK(URL 1284), typecheck, test:node ALL PASS(53), 결제·이용권 정책 verify, build:worker, jest 295 스위트·4200 테스트.
- visual-checker 1차(390·1280, 로딩·빈·로그인·목록): 그림 매핑·크기·정렬·대비 통과. 결함 2건 — 로그인 문구와 버튼 사이 5px, 390 빈 상태에서 "들려줘."가 "들 / 려줘."로 끊김 — 과 권장 1건(signup 하단 직선)을 위 두 클래스로 고쳤다.
- visual-checker 2차(보정 뒤 8장): 결함 2건 해소 — 로그인 문구·버튼 사이 21px(1280·390), "들려줘." 가 통째로 다음 줄. signup 아래 직선 대비 10.2:1 → 1.0:1, 얼굴·열쇠 영역 픽셀 변화 0. login·hero 는 마스크 없음, 1차 통과 항목은 위치 이동 말고 그대로. 필수 수정 0.

## 남은 것 (범위 밖, 보고만)

- `use-profiles.ts:62` 같은 루프 — 2026-09-25 수정(`fix(yeongnyangi): stop profile reloading on logout`). 브라우저 목 실측(dev 서버 3107, `/api/*` 전부 목): 수정 전 `/yeongnyangi/fortune/` 에서 프로필 GET·refresh 3초 11·6초 25·9초 39, logout 이벤트 38회. 수정 후 `/fortune/`·`/room/` 모두 3·6·9초 GET 1·refresh 2 고정, login 이벤트·detail 없는 이벤트에 각 1회 재조회, 로그인 안내 표시, pageerror 0. `npm run check:fast` EXIT 0(옆 세션 미커밋 파일로 critical 전체 — jest 295/4200).
- `FreeFortune.tsx:49` 같은 구조 — 위 next.
- 인증 이벤트 가드 두 개(`verify:auth-event-loop`·`verify:auth-changed-coverage`)는 `app/**` 를 안 읽어 이 종류의 루프를 못 잡는다. 가드 확장은 사용자 결정(지시 없는 CI 게이트 추가 금지).
- auth-store 의 `monthlyStoneBalance` 변경도 `cd:auth-changed` 를 쏘므로 기록 화면이 한 번 더 조회한다 — 요청 1회 추가, 루프 아님.
- `Experience.tsx` 의 청크 로딩 폴백(`ReadingLoading`)은 기록 화면에서도 상담 한 건용 로딩 문구를 잠깐 보인다.
- (선택, 권장 안 함) signup 그림 오른쪽 끝 구름에 세로로 잘린 자국이 5~6px 남는다(대비 3.3:1, 페이드 전 5.4:1). visual-checker 제안은 마스크에 오른쪽 4% 가로 페이드를 `mask-composite:intersect`(웹킷은 `source-in`)로 겹치는 것 — 시뮬레이션에서만 1.08:1, 실제 렌더 미확인. CSS 모듈을 다시 고치면 원장 재생성·critical 검사가 따라온다.

## 함정

- 제목 안에 alt 있는 이미지 금지 — `scripts/verify-yeongnyangi-spirit-ui.mjs:85` 가 제목 '내 상담 기록' 을 exact 로 비교한다.
- 로그인 사용자의 느림은 쿼리 탓이 아니다(운영 인덱스 `userId_1_createdAt_-1__id_-1` 존재·문서 10건, 실측). 남는 건 인증 조회 + DB 연결이고 DB 연결은 DB 세션(`worker/lib/db.js`) 소유다.
- 다른 세션의 `next dev` 가 떠 있으면 `--build-static` 이 `verify-no-dev-server` 에서 막힌다. 워크트리에 `.next` 가 없을 때만 `ALLOW_DEV_SERVER_DURING_BUILD=1` 로 돌리고, 남의 dev 서버는 끄지 않는다.
- `verify-yeongnyangi-consultation-browser.mjs` 는 cwd 에 `.codex-consultation-shots/` 를 남기는데 ignore 되지 않는다 — 커밋 전에 지운다.
- `check:fast` 기본 베이스는 HEAD 라 커밋 뒤에는 변경이 0 으로 보인다. 커밋한 것을 검사하려면 `npm run check:fast -- --committed-head`.
- `yeongnyangi.module.css` 는 영냥이 홈 `/` 도 읽는다. 고치면 `config/sitemap-lastmod.json` 의 `/` signature 가 바뀌어 `verify:sitemap-drift` 가 막힌다 — `npm run sitemap:generate` 결과를 같은 커밋에 담는다(원장이 끼면 check:fast 가 critical 전체 검증으로 올라가 약 7분 걸린다). `Library.tsx` 만 고칠 때는 안 바뀐다.
- KST 자정을 넘긴 낡은 기준점에서는 `verify:sitemap-drift` 가 날짜 롤링만으로 막힌다 — origin/main 을 받아 rebase 하면 풀린다(이번엔 `7dccf7544`).

## 검증 명령

섀도 워크플로 `.github/workflows/yeongnyangi-browser-shadow.yml:79-93` 과 같은 순서 — 정적 산출물 → 루프백 서버 → 스크립트.

```
node scripts/verify-yeongnyangi-browser.mjs --build-static
python -m http.server 3118 --bind 127.0.0.1 --directory out
YEONGNYANGI_TEST_BASE=http://127.0.0.1:3118 node scripts/verify-yeongnyangi-consultation-browser.mjs
YEONGNYANGI_TEST_BASE=http://127.0.0.1:3118 node scripts/verify-yeongnyangi-spirit-ui.mjs
npm run check:fast
```
