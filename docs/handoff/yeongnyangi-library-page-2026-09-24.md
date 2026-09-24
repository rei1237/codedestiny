---
status: active
updated: 2026-09-24
next: "Library.tsx 가 로그아웃 이벤트에 재조회하지 않고 로그인 안내를 띄우게 고친 뒤, 로딩·빈·로그인 상태에 기존 영냥이 이미지를 넣는다 — GREEN, 브라우저 목 검증."
---

# 영냥이 내 상담 기록 화면 — 무한 로딩·밋밋한 화면

## 왜

> 영냥이 서비스에서 내 상담 기록을 보려고 하면 바로 잘안되고 상담 기록 화면이 밋밋하므로 영냥이 이미지를 그리거나 활용해서 넣도록하고 … (2026-09-24)

## 지금 상태

- 미구현. 원인은 코드 추적으로 확정했고 브라우저 재현은 하지 않았다. 같은 날 챕터 생성 세션이 범위를 잘라 넘겼다.

## 원인(코드 추적)

1. 목록 GET 401 → `authFetch` 의 refresh 도 쿠키 없음·만료면 401(`worker/routes/auth.js:3726` `handleRefresh`).
2. `app/_lib/auth-client.ts:443-444` 가 `clearClientAuthState()` + `publishAuthSync("logout")` → `:355` 가 `cd:auth-changed` 를 동기로 발행한다(detail `{source,event:'logout',at}`).
3. `app/yeongnyangi/_components/Library.tsx:36` `reset` 이 그 이벤트에 다시 `load()` → 1로 돌아가 반복. 앞 요청은 `current()` 가 false 라 조용히 끝나서 `:46` "로그인하고 기록 보기" 버튼이 끝내 안 뜬다.

## 남은 작업

- [ ] `reset` 에서 `(event as CustomEvent).detail?.event==='logout'` 이면 재조회 대신 요청 중단·목록 비움·`needsLogin`. detail 없는 `new Event('cd:auth-changed')` 는 지금처럼 재조회(`scripts/verify-yeongnyangi-consultation-browser.mjs:74-76` 이 그렇게 쏜다).
- [ ] 이미지는 새로 그리지 않고 투명 배경 고양이를 재사용: `public/assets/yeongnyangi/original/login.webp`(로그인 안내) · `hero.webp`(헤더) · `original/signup.webp`(로딩). 스타일은 `app/yeongnyangi/yeongnyangi.module.css:336` `.progress`·`ReadingLoading.tsx` 재사용, `.consultation [role=alert]` 만 추가.
- [ ] 판정: 로그아웃 상태로 `/yeongnyangi/library/` 에 들어가면 요청이 멈추고 로그인 버튼이 보인다. 로그인 상태는 목록이 뜬다.

## 함정

- 제목 안에 alt 있는 이미지 금지 — `scripts/verify-yeongnyangi-spirit-ui.mjs:85` 가 제목 '내 상담 기록' 을 exact 로 비교한다. 장식 이미지는 제목 밖, `alt=""`.
- `app/yeongnyangi/_lib/api.ts:19` 타임아웃 문구 "같은 상담에서 다시 확인해 주세요." 는 이 화면에 안 맞는다 — 기록 화면에서만 덮어쓴다.
- 로그인 사용자의 느림은 쿼리 탓이 아니다(운영 인덱스 `userId_1_createdAt_-1__id_-1` 존재·문서 10건, 실측). 남는 건 인증 조회 + DB 연결이고 DB 연결은 DB 세션(`worker/lib/db.js`) 소유다.
- 같은 루프가 `app/yeongnyangi/_lib/use-profiles.ts:62` 에도 있다(상담 폼 프로필 재조회). 범위를 넓힐지는 사용자에게 묻는다.

## 검증

섀도 워크플로 `.github/workflows/yeongnyangi-browser-shadow.yml:79-93` 과 같은 순서 — 정적 산출물 → 루프백 서버 → 스크립트.

```
node scripts/verify-yeongnyangi-browser.mjs --build-static
python -m http.server 3118 --bind 127.0.0.1 --directory out
YEONGNYANGI_TEST_BASE=http://127.0.0.1:3118 node scripts/verify-yeongnyangi-consultation-browser.mjs
YEONGNYANGI_TEST_BASE=http://127.0.0.1:3118 node scripts/verify-yeongnyangi-spirit-ui.mjs
npm run check:fast
```

로딩·빈·로그인 3상태는 visual-checker 로 본다.

## 모르는 것

- 없음. 이미지 배치 취향은 CLAUDE.md 원칙 16(방향·성공 기준 공유 뒤 자율 구현)을 따른다.
