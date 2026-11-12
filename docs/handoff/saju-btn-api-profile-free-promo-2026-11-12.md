---
status: active
updated: 2026-11-12
next: "릴리스 A 1단계: /manse 사주 보기 버튼 수정부터"
---

# 사주 보기 버튼·API 링크·홈 타일 프로필 진입 수정 + 3개월 무료 마케팅

## 첫 행동
1. 워크트리 `D:\Development\codedestiny-worktrees\saju-btn-api-profile-20261112-111149`(브랜치 `wt/saju-btn-api-profile-20261112-111149`)에서 `git status`, `git log --oneline -3`, `git fetch origin main`.
2. 아래 단계에서 체크되지 않은 첫 항목부터 진행한다.

## 지금 상태
- 기준: origin/main `ba28330a5` (운영은 37258e3e9, 비LLM 62키 무료화가 이미 운영 중).
- 공유 체크아웃 `D:\Development\code-destiny`는 다른 세션의 `feat/world-cast-page` + 미커밋 30여 파일. **절대 건드리지 않는다**(전환·stash·reset 금지).
- 다른 세션의 `docs/handoff/release-closeout-2026-11-12.md`(가디언 두 번째 승격)가 active. 배포 락은 공유되므로 운영 승격이 겹치지 않게 `gh run list`로 진행 중 Release run을 먼저 본다.

## 승인 상태 (원문·날짜)
- 2026-11-12 사용자: "무료 만세력 보기 버튼은 사주 보기 버튼으로 이름을 변경해야하고 현재 클릭해도 사주 화면으로 이동이 안되는 버그가 있는데 정확한 원인 파악 후 이런 문제가 없도록 수정해서 이건 중요한 문제이므로 빠르게 운영 배포해줘" → 릴리스 A·B 운영 승격 승인(계획 승인 포함).
- 2026-11-12 사용자 결정:
  - 무료 범위: 기존 62키 유지 + 누락된 비LLM 정적 기능만 보강. 라이트 사주·사주 대운(section_summary·section_daewun·saju_lifetime_bundle)·가디언·LLM은 유료 유지.
  - 기한: "2027-02-12까지 무료" + 카운트다운 표시. **자동 유료 전환 없음**(표시 전용, 접근 판정에 날짜 쓰지 않음).
  - 내 API 관리: 프로필 카드에서 **완전히 제거**.
  - 프로필 진입 실패 경로: **홈의 무료 운세 타일**.

## 작업 규칙과 함정
- 저장소 CLAUDE.md: 브랜치·PR 없이 main에 직접 머지(워크트리 → `git push origin HEAD:main` 형태, fast-forward 아니면 rebase onto origin/main), 결제 변경 RED, 실LLM·실결제 금지, 가격 변경은 PAYMENT_POLICY.md 먼저, 미러(public/*)는 공식 생성기(`npm run sync:public` 등)로만, `check:fast` → commit → `check:pre-push` → push.
- 운영 승격은 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`만. 로컬 wrangler·deploy:production 금지.
- `/manse` 랜딩 폼 핸드오프(`cd:seo-landing-entry:v1`)는 저장 시 ctaHref의 action과 셸에서 실행되는 action이 같아야 적용된다.
- 홈 `/` 정본은 app/page.js, `/ggulggul/` 정적 셸 정본은 루트 `index.html`.

## 설계 / 확인된 원인
1. /manse "무료로 만세력 보기" (`lib/seo-landing-pages.js` manse `ctaHref: /ggulggul/?action=checkPrivacyAndCalculate`): 이 액션은 입력 화면을 열지 않아(`js/core/home-funnel.js:355`는 cdOneStepFreeSajuEntry만 revealInput) checkPrivacyAndCalculate가 숨은 폼 안에서 성별 미선택 오류·동의/로그인 게이트에 걸려 아무 변화 없이 멈춘다. 동일 href가 다른 랜딩에도 있다.
   - 수정: ctaHref → `/ggulggul/?action=cdOneStepFreeSajuEntry`, 라벨 "사주 보기". 핸드오프 적용 시 cdOneStepFreeSajuEntry(`js/destiny-profile.js` ~11039)가 캐시 프로필보다 폼 입력을 우선. 랜딩 폼 성별 필수. revealInput 안전망에 checkPrivacyAndCalculate 추가. 가이드 CTA·칩의 "무료로 만세력 보기/만세력 보기" → "사주 보기" + 사주 셸 액션. SEO 제목·H1 "무료 만세력"은 유지.
2. 내 API 관리: `index.html` `<template id="dpListSheetTemplate">` 푸터 하드코딩(2c71d2253). 링크 삭제 후 미러 재생성.
3. 홈 타일 프로필 진입: `window.cdHomeFortuneEntry`(destiny-profile.js ~11195)가 로컬 캐시만 보고 없거나 `syncStatus==='pending'`이면 "프로필을 설정해 주세요". `cdSajuTabEntry`(~11291)의 `_dpLoadFromServer` 폴백이 없고, `_dpResumeHomeEntry`는 1회성 `cd:destiny-profile-server-ready`에 의존. → mock 브라우저 재현 후 확정, 서버 로드 폴백 + 유효 출생정보면 pending 허용.
4. 프로모션: 단일 상수 `endsAt: "2027-02-12T23:59:59+09:00"`(표시 전용). 홈 상단 배너(D-N, 무료 운세 바로가기, 공유 버튼 Web Share/링크 복사), 무료 타일·결과 "3개월 한정 무료" 뱃지, 결과 하단 공유 CTA, React 랜딩 배너. 문구는 "2027년 2월 12일 이후 유료 전환 예정".

## 단계
### 릴리스 A (긴급)
- [ ] A1 사주 보기 버튼 수정 + 테스트
- [ ] A2 내 API 관리 제거 + 미러 재생성
- [ ] A3 홈 타일 프로필 진입 재현·수정 + 회귀 테스트 3개
- [ ] A4 check:fast, mock 화면 360/390/1280 확인, 커밋, check:pre-push, main push
- [ ] A5 main CI 확인 → 운영 workflow 실행 → 운영 SHA·핵심 화면 읽기 전용 확인

### 릴리스 B (마케팅)
- [ ] B1 62키 밖 비LLM 정적 기능 누락 감사(`docs/context/2026-11-11-free-fortune-catalog-audit.md` 대조). 확실한 것만 PAYMENT_POLICY.md → free-fortune-policy.mjs → 공식 생성기. 애매하면 보고만.
- [ ] B2 프로모션 상수 + 홈 배너·뱃지·공유 CTA·React 랜딩 배너, 12언어 i18n 키(ko 우선)
- [ ] B3 검증(문구 계약·i18n·카운트다운 단위 테스트 1개·mock 화면), 커밋, push
- [ ] B4 운영 workflow → 운영 확인
- [ ] 마무리: 이 문서 done, 워크트리 배수(`npm run worktree:remove -- <경로>`를 다른 체크아웃에서), 임시 파일 삭제

## 범위 밖(보고만)
- `_dpOpenFortuneType`의 무필터 storage 이벤트 무효화(olympus/flower 조용한 실패), Next 페이지 guard 재설정.
- 2027-02-12 도래 시 연장/유료 전환 결정은 사용자.
