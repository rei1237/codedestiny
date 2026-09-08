---
status: active
updated: 2026-09-08
next: 스테이징 홈의 실제 이미지 요청을 360·390·1280px 냉시작으로 계측하고, DPR별 responsive image 후보를 적용한 뒤 같은 조건에서 전송량·LCP·CLS를 비교한다.
---

# 홈 이미지 성능 후속 작업

## 완료된 배포 범위

- PR #1821: https://github.com/rei1237/codedestiny/pull/1821
- 홈 변경 머지 SHA: `638f2480a7fc67afbc65f9e02a0407e49fe07244`
- 확인 시점의 main SHA `5229098a6aeccb39d6b6065e0bc7651daec776c5`에도 위 변경이 포함된다.
- 기존 홈 자산 재조립, 연이/네오, 서비스 검색, 마이 프로필 카드, 카카오 공유
  이벤트, 정책 6종과 별칭 3종 정적화까지 완료했다.
- 프로덕션 승격은 이 작업 범위가 아니다.

## 스테이징 확인 결과

- PR #1821 머지본과 후속 main 배포는 Pages 고유 preview에서 자산·읽기 전용 smoke를
  통과했지만, 커스텀 스테이징 도메인의 smoke에서
  `home-funnel.js`의 `Cannot read properties of null (reading 'addEventListener')`로 실패했다.
- 원인은 홈 DOM과 함께 바뀐 `/js/core/home-funnel.js`만 캐시 버전 쿼리가 없어서,
  커스텀 도메인이 이전 스크립트를 새 HTML에 결합한 것이다. 고유 preview는 캐시가 없어
  통과했고 커스텀 도메인에서만 재현됐다.
- 배포 파이프라인은 실패를 감지해 Worker를 이전 SHA
  `c0bc1b86eb1659caa966c79ba0fe66db37e356a2`로 자동 롤백했다. 다만 Pages 롤백의
  커스텀 도메인 반영이 일관되지 않아 최종 확인 시점에 Pages `5229098a...`와 Worker `c0bc1b86...`가
  불일치한다. `robots.txt`의 전체 차단은 유지된다.
- 후속 PR #1827(https://github.com/rei1237/codedestiny/pull/1827)은 홈 런타임에
  배포 빌드 키를 붙이고, 이 쿼리가 다시 빠지면
  `verify:hero-firstpaint-lock`이 실패하도록 잠근다. 머지 후 Pages `/version.json`과
  Worker `/api/version`이 같은 SHA인지 다시 확인해야 한다.

## 현재 성능 상태

- 첫 화면에서는 `/icons/app-logo-512.webp` 하나만 LCP 후보로 우선 요청한다.
- 대표 상담·이용권·서재·음악 이미지는 지연 로딩하고 레이아웃 크기를 예약한다.
- 하단 장문 섹션은 `content-visibility`와 intrinsic size를 사용한다.
- 홈 전용 CSS는 배포 셸에 인라인되어 별도 차단 요청을 만들지 않는다.
- 동일한 로컬 측정 조건에서 Lighthouse 성능은 55에서 61, LCP는 약 15.4초에서
  7.5초로 줄었고 CLS는 0을 유지했다. 이 수치는 스테이징 현장 데이터가 아니라
  이전 main과 변경본을 비교한 개발 기준선이다.
- 초융합 대표 이미지는 누락이 아니다. 원본
  `/images/fusion-fortune/fusion-guardian-celestial-hero.webp`가 존재하고 배포 환경의
  Cloudflare 변환 경로를 사용할 수 있다.

## 다음 작업 순서

1. 스테이징에서 360·390·1280px, DPR 1·2, 냉시작 3회씩 측정한다.
   - LCP/CLS/INP 후보
   - HTML·CSS·JS·폰트·이미지별 transfer size
   - 이미지 URL, 응답 Content-Type, 캐시 상태, natural/rendered 크기
   - Cloudflare `/cdn-cgi/image/` 적중과 원본 폴백 여부
2. 첫 화면 LCP 이미지는 현재 preload와 `fetchpriority=high`를 유지하면서 실제 표시
   크기에 맞는 WebP/AVIF 후보와 `srcset`/`sizes`를 비교한다.
3. 대표 상담·이용권·서재·음악은 카드별 실제 렌더 크기보다 2배를 크게 넘는 원본만
   선별해 변환한다. 품질 저하가 보이는 자산은 재인코딩하지 않는다.
4. 같은 이미지가 여러 카드에서 중복 요청되는지, 연이/네오 전환 시 숨은 캐릭터
   이미지까지 내려받는지 확인한다. 숨은 모드 자산은 선택 후 로드하도록 검토한다.
5. 폰트는 R2 정본과 CORS를 유지하고, 실제 사용하지 않는 굵기만 제거 후보로 삼는다.
   브랜드 제목 폰트를 시스템 폰트로 대체하지 않는다.
6. 변경 전후를 같은 네트워크·CPU 조건에서 다시 3회 측정한다. 중앙값과 가장 느린
   결과를 모두 남기고, 단일 Lighthouse 점수만으로 완료 처리하지 않는다.

## 완료 기준

- 390px 모바일 냉시작 이미지 전송량과 LCP가 현재 스테이징 기준선보다 개선된다.
- 1280px에서 흐릿한 이미지가 없고 DPR 2에서 불필요한 초대형 원본을 받지 않는다.
- CLS는 0을 유지하고 이미지 영역 높이와 카드 이동이 발생하지 않는다.
- 연이/네오, 검색, 대표 상담, 이용권, 카카오 공유, 마이 프로필 동작이 그대로다.
- 결제·가격·이용권·월정석·단건 결제와 인증/API/DB 로직은 변경하지 않는다.
- `sync:public`, 미러·첫 화면·모바일·테마·payment-freeze 가드와 `check:fast`,
  `build:cf`가 통과한다.

## 정본과 수정 예상 파일

- `templates/home-funnel.html`
- `styles/home-funnel.css`
- 홈에서 참조되는 기존 이미지 자산과 그 생성 스크립트
- 생성 미러는 직접 편집하지 않고 `npm run sync:public`로 갱신한다.

## 검증

```text
npm run worktree:status
npm run sync:public
npm run verify:public-mirror-fresh
npm run verify:hero-firstpaint-lock
node scripts/design/verify-home-funnel.cjs
npm run check:fast -- --plan
npm run check:fast
npm run build:cf
```

## 주의할 점

- 로컬 `/cdn-cgi/image/` 404는 Cloudflare가 없는 개발환경의 정상 폴백일 수 있다.
  배포 URL의 응답과 실제 원본 로드를 각각 기록한다.
- 새 이미지 요청을 추가하기 전에 기존 WebP, SVG 마스크, CSS 예화를 우선 재사용한다.
- 이용권 가격은 `lib/payment/pass-pricing.js` 정본을 유지한다.
- 프로필 카드는 홈에 복제하지 않고 마이 시트가 기존 `#dpMasterCard`를 빌린다.
- 실결제, 실 LLM, 프로덕션 배포로 성능을 검증하지 않는다.

## 남은 미확인

- 실제 사용자 RUM p75는 아직 수집하지 않았다.
- 이미지별 스테이징 transfer size와 DPR별 Cloudflare 변환 적중률은 다음 작업의 첫
  측정 결과로 기록해야 한다.
