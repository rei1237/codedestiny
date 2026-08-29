---
status: active
updated: 2026-08-29
next: dist/ 는 이미 생성돼 있다 — `npx cap sync android` → `assembleDebug` 로 베이스라인을 끝내고, build:mobile 의 prebuild:cf 누락을 고친다
---

# Android 앱 ↔ 웹 동기화 · 가격 동일화 · 릴리스

## 왜

> "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을 완전히 동기화하고,
> 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

전제 정정: 앱은 방치된 껍데기가 아니라 **Play 라이브 앱**(versionCode 25 / 1.0.25)이고
Play Billing·잠금화면·RouteProcessor 가 손으로 작성된 의도적 네이티브 통합이다.
계획 전문: `C:\Users\user\.claude\plans\android-full-stack-devops-scalable-orbit.md`

## 지금 상태

- 워크트리 `android-web-sync-release` (origin/main 3e2ed49df 기반). **커밋 0건, PR 없음.**
- 선행조건 완료: node_modules 정션 · `.env.local` 복사(gitignore 확인) · 프리플라이트 FAIL 0.
- 🔴 **코드 수정은 아직 0줄이다.** 아래 "남은 작업"이 전부 미착수다.

## 남은 작업

- [x] ~~A-1. `build:mobile:app`~~ — `fortune:build-data` 선행 시 **통과**(`BUILD_EXIT=0`,
      `[통과] 앱 PortOne 차단 검증`, 가드 주입 451/451). `dist/` 생성돼 있다.
- [ ] **A-2. 베이스라인 마무리** — `npx cap sync android` → `assembleDebug`.
      판정: `BUILD SUCCESSFUL` + `app-debug.apk` 존재. (Gradle 첫 실행은 의존성 내려받느라 오래 걸린다)
- [ ] **B. `build:mobile` 의 `prebuild:cf` 누락 수정 (확정 결함, 1건)**
      `build:mobile`(`package.json:429`) → `build`(`:63`) 라 `prebuild:cf`(`:410`)를 건너뛴다.
      그 안의 `fortune-build-data.mjs` 가 안 돌아 `/fortune/[period]/[sign]` 프리렌더가 죽는다.
      🔴 **2026-08-16(c8449a334) 이후 안드로이드 빌드가 계속 깨져 있었다.**
      후보: `build:mobile` 을 `build:cf` 로 바꾼다. ⚠️ `prebuild:cf` 는 `sync:public` 을 포함해
      추적 파일을 쓴다 — 산출물을 같은 커밋에 담아야 한다.
- [ ] **C. 드리프트 가드 6종 실행** (아래 검증 2번). 나온 실패만 고친다. 개수 미정.
      🔴 A-1 빌드 출력이 이미 확인해 준 것 **2건**(가드는 둘 다 못 잡는다):
      · 프루닝 목록에 `zh-tw/insights` 가 **없다** — 실제 제거된 건 `points, premium-unlock,
        insights, en/insights, ja/insights, zh/insights`. `LOCALE_PREFIXES`(`build-mobile-app.mjs:50`)
        에 `zh-tw` 누락 확정. 결제 위험은 아니고 번들 용량 문제.
      · **VN·음원 CDN 오프로드가 0건**("참조 0건 재작성 / 번들에서 제외 0개 / 0.0 MB").
        `public/codedestinyassets/` 가 이 PC 에 없어서다 → 이 빌드의 VN·노벨 자산은 깨진다.
        코드 결함 아님. 필요하면 `node scripts/fetch-novel-assets.mjs` 로 먼저 채운다.
- [ ] **D. 앱 `/api/*` 리타게팅 (31개 호출 지점)** — 아래 "정본 예시".
      판정: 기기에서 `fetch('/api/version')` 이 HTML 200 이 아니라 JSON 을 돌려준다.
- [ ] **E. 가격 동일화** — 콘텐츠 티어 **8개만**(이용권 4종은 이미 앱가=웹가).
      편집 5파일 + 문서 4. 상세 표: `C:\Users\user\AppData\Local\Temp\claude\cd-android\EDIT-PLAN.md`
- [ ] **F. 실기기 검증** — 사용자가 USB 연결 예정. `docs/app-audit/DIAGNOSIS_REPORT.md` 의
      "기기검증필요" 11건이 우선 대상.
- [ ] **G. 릴리스** — 🔴 **업로드 키스토어 분실**(C:\Users\user·D:\·휴지통 전수 검색 0건).
      AAB 배포 중 = Play App Signing 가입 = **업로드 키 재설정 가능**. 승인 전엔 빌드해도 못 올린다.
      versionCode 는 **26**, versionName `1.0.26`.

## 정본 예시

- `/api/*` 리타게팅 정본 구현: `index.html:209-252` (설치 지점 `:418`).
  이식 위치는 `scripts/app-native-bridge.js:25` 뒤 — 앱 전 HTML 에 주입되는 유일한 파일이라
  웹 blast radius 가 0이다. 호출부 31곳을 고치면 **웹 동작까지 바뀐다**(`app/_lib/api-config.ts:110-114`).
- 가격 정본: `worker/lib/app-store-pricing.js:35-49`(콘텐츠) / `:66-71`(이용권, 이미 동일).

## 함정

- 🔴 **줄바꿈**: `verify-app-store-pricing.mjs`·`verify-app-store-billing-policy.mjs`·
  `create-play-console-products.mjs` 는 **CRLF**. Edit/sed 로 고치면 전 파일 diff 가 된다 →
  node 패치 스크립트로. `app-native-bridge.js`·`app-store-pricing.js` 는 LF.
- 🔴 `verify:app-store-billing-policy` 는 **CI 배선돼 있고** 가격 동일화 시 반드시 깨진다
  (`:102` `amountKRW > webAmountKRW`, `:154` 커버리지 상수). 같은 커밋에 고칠 것.
- 🔴 **Play 가격 인하가 코드 배포보다 먼저**다. 반대로 하면 화면 ₩3,000 / 실청구 ₩3,900 = 정책 위반.
- 🔴 `play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- 워크트리에서 `npm install` 금지(정션이라 공유 설치본에 쓴다). 정리는 `cmd /c rmdir` 로 링크부터.
- `scripts/verify-app-remote-assets.mjs` 는 **존재하지 않는다**(주석 2곳이 있다고 거짓 기술).
  자산 80개 CDN 실재는 무검증이다.

## 검증

```
tail -c 3000 /c/Users/user/AppData/Local/Temp/claude/cd-android/build2.log   # 1) 재빌드 결과
node scripts/verify-app-no-portone.mjs --dist dist                           # 2) 드리프트 6종
npm run verify:app-store-billing-policy
npm run verify:app-store-pricing
npm run verify:play-console-products
npm run verify:mobile-pricing-parity
npm run verify:payment-freeze
```

## 모르는 것

- `prebuild:cf` 를 앱 빌드에 넣을 때 `sync:public` 산출물을 커밋에 담는 것이 맞는지 —
  웹 배포와 앱 빌드가 같은 미러를 공유하므로 **사용자에게 확인할 것.**
- 업로드 키 재설정 승인 소요 시간. 그 전까지 G 는 진행 불가.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
