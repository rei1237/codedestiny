---
status: active
updated: 2026-08-29
next: 프로덕션 재승격(TBT 수정은 main 에 있고 라이브에는 아직 없다). 그 뒤 앱 재빌드(사용자 실행).
---

# 데스크탑 TBT · 프로덕션 승격 · 앱 versionCode

## 왜

사용자 요구 3건: (1) 스테이징을 라이브로 승격, (2) Play 가 versionCode 37 을 거부했으니 앱
재빌드, (3) 라이브/스테이징 데스크탑 TBT 가 매우 나쁘니 개선.

## 지금 상태

- (1) **완료** — 프로덕션 승격 run 33255031849 성공. 프로덕션은 `9bbe695ed` 서빙 중.
- (3) **PR #1295 머지 완료** (`f7fec876e`). 스테이징 반영됨, 프로덕션은 아직.
- (2) **미완** — 빌드 스크립트 버전만 40 으로 올려 뒀고 빌드는 아직 안 돌렸다.

## 남은 작업

- [ ] **1. 프로덕션 재승격** — `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`.
      TBT 수정이 라이브에 반영되려면 이 승격이 필요하다. 판정: PSI 데스크탑 TBT 가
      1,730ms 에서 내려가는지.
- [ ] **2. 앱 재빌드 (versionCode 40)** — 🔴 **사용자가 직접** `Desktop\CodeDestiny-업로드-준비\_전부하기.ps1`
      을 더블클릭해야 한다(44번 줄에서 키스토어 비밀번호를 `Read-Host` 로 묻는다 — 에이전트
      실행 불가). `$VersionCode = 40` / `$VersionName = "1.0.40"` 은 이미 반영해 뒀다.
      상세와 Play 업로드 절차는 [android-web-sync-2026-08-29.md](android-web-sync-2026-08-29.md) "남은 작업" 1~2번.
- [ ] **3. 쓰레기 코드 정리** — 사용자가 다음 작업으로 지목. 아직 범위 미정. 시작 전
      [docs/context/cleanup-2026-08-15.md](../context/cleanup-2026-08-15.md)(삭제 가능/금지 실측 목록)를 읽을 것.

## 정본 예시

데스크탑 규칙 블록: `index.html:838` 부터 20줄(`html:not(.cd-mobile-runtime)` 축).
같은 파일 800~836줄이 모바일 축과 **일부러 제외한 5개 섹션**의 사유를 갖고 있다 — 데스크탑에서도
그 사유가 그대로 유효하다.

## 함정

- 🔴 **`mergeable=null` + head 가 안 움직이는 것은 "이미 머지됨"의 증상이다.** 여기서 그걸
  synchronize 드롭으로 오진해 빈 커밋 푸시 + 3분 대기를 두 번 낭비했다. PR head 가 굳었으면
  `gh pr view <번호> --json state,mergedAt` 을 **먼저** 볼 것 — 머지된 PR 은 head 를 영원히
  그 SHA 로 고정한다. 머지 뒤에 브랜치에 더 쌓은 커밋은 새 PR 로 내야 한다.
- `index.html` 을 고치면 `npm run sitemap:generate` 도 돌려야 한다 — 셸 5개 라우트의
  서명이 바뀌어 `verify:sitemap-drift` 가 **"Typecheck and lint"** 이름으로 실패한다.
- `verify:public-mirror-fresh` 는 윈도우에서 `.ignore` 개행 하나로 헛실패한다. 차이 파일이
  `.ignore` 뿐이면 CI 를 믿을 것.

## 검증

```
npm run lint / typecheck / verify:hero-contrast / verify:mobile-detail-nonintrusive
npm run verify:entry-encoding / verify:hero-firstpaint-lock / verify:public-parity / verify:runtime-cache-sync
```

전부 통과. 성능·시각 회귀 실측 수치는 PR #1295 본문에 있다(여기 복사하지 않음).

## 모르는 것

- Play 의 실제 최고 versionCode. 37 이 거부됐으므로 37 이상인 것만 확실하다. 40 도 거부되면
  앱 번들 탐색기에서 실측한 값 + 1 로 올릴 것.
- 데스크탑 TBT 의 **남은** 절반. Layout 을 3,4초대에서 2.0초대로 줄였지만 여전히 최대 항목이다.
  강제 동기 레이아웃 2건(`s-ebca30b0873e9353.js` 513ms, `_cdEnsureMainScreenOnLoad` 222ms)은
  손대지 않았다 — 다음 라운드 후보.
