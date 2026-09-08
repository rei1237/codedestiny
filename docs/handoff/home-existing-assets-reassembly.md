---
status: active
updated: 2026-09-08
next: PR #1821 머지 후 스테이징 Pages/Worker SHA와 홈·검색·네오·정책 화면을 확인한다.
---

# 기존 홈 자산 재조립 후속 확인

## 왜

기존 하단 홈 자산을 모바일·데스크탑 공통 구조로 복구하고 검색, 네오,
프로필, 공유 이벤트, 정책 정적 페이지를 함께 배포 가능한 상태로 만든다.

## 지금 상태

- 브랜치: `codex/home-existing-assets-reassembly`
- PR: https://github.com/rei1237/codedestiny/pull/1821
- 머지 전이며 프로덕션 승격은 하지 않았다.

## 남은 작업

- [ ] PR 필수 검사가 모두 성공했는지 확인한다.
- [ ] 사용자 머지 후 스테이징 Pages `/version.json`과 Worker `/api/version`이
  머지 SHA와 일치하는지 확인한다.
- [ ] 스테이징에서 홈·검색·연이/네오·정책 9개 URL과 noindex를 확인한다.
- [ ] 별도 성능 작업에서 대표 상담·이용권·서재·음악 이미지의 실제 전송 크기와
  DPR별 Cloudflare 변환 적중률을 계측한다. 현재 PR은 기존 WebP와 SVG 마스크를
  재사용하며 홈 LCP를 약 15.4초에서 7.5초로 개선했다.

## 정본 예시

`templates/home-funnel.html`

## 함정

- 초융합 이미지는 누락이 아니다. 로컬 `/cdn-cgi/image/` 404 뒤 원본 WebP로
  폴백하며, 배포 환경의 Cloudflare 변환 URL은 200이다.
- 이용권 가격은 `lib/payment/pass-pricing.js` 정본을 유지한다.
- 프로필 카드는 홈에 복제하지 않고 마이 시트가 기존 `#dpMasterCard`를 빌린다.

## 검증

```
npm run check:fast
npm run build:cf
node scripts/design/verify-home-funnel.cjs
HOME_UI_ORIGIN=<staging-origin> node scripts/design/verify-static-policy.cjs
```

## 모르는 것

- 머지 전이므로 스테이징 Pages/Worker 실제 배포 SHA와 에지 캐시 상태는 미검증이다.
