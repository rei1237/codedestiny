---
status: active
updated: 2026-11-06
next: 결제 복귀의 ko·en 스테이징 전체 시나리오를 후보 SHA에서 확인한다.
---

# 결제 복귀 화면 후속 수정 (스크롤·홍보 팝업·영어 문구)

## 첫 행동

1. 이 워크트리에서 작업한다: `D:\Development\codedestiny-worktrees\paid-return-view-20261105-173347` (브랜치 `wt/paid-return-view-20261105-173347`, 기준 `9ba67bb89`). 메인 체크아웃은 다른 세션의 `feat/world-cast-page`이니 건드리지 않는다.
2. `git fetch origin` 후 origin/main을 리베이스해 최신화한다.
3. 결제 UI 변경이므로 CLAUDE.md의 RED 절차대로 위험·검증·롤백을 먼저 보고하고 진행한다.

## 지금 상태

- 사용자 요청: "결제 복귀 화면의 1, 2번 모두 고치도록 해줘, 3번도 고치면 좋고." 1=스크롤, 2=홍보 팝업, 3=영어 문구.
- 선행 수정 `0419ff55a`(결제 복귀 자동 새로고침 제거, 자동 재개 상한, 주문번호 표시)는 운영에 반영됐다.
- 이 문서 작성 시점의 운영과 origin/main은 모두 `9ba67bb89`이다. 운영은 다른 세션도 승격하므로 시작할 때 `https://code-destiny.com/version.json`으로 다시 확인한다.
- **운영 승격은 아직 승인되지 않았다.** 스테이징까지 진행한 뒤, 승격 직전에 사용자에게 1회 승인을 받는다. 새 세션 요청에 승격 승인이 명시돼 있으면 그 1회로 본다.

## 작업 규칙

- 실결제·운영 DB 쓰기·환불·과금 LLM 호출 금지. 브라우저 검증은 `/api/`를 모두 모의한다.
- 운영 번들 반복 재현 금지. 이전에 CDN 429에 걸린 적이 있어 순차·저빈도로 돌린다.
- 공유 main에는 내 커밋만 올린다. 승격 전에 진행 중인 다른 배포가 없는지 확인한다(`gh run list --workflow cloudflare-pages-deploy.yml`). 지난번에 승격 직전 다른 세션의 승격이 겹쳤다.
- 승격은 main보다 뒤처진 운영에 다른 세션의 변경(가격·약관 등)까지 딸려 나갈 수 있다. 승격 전에 `운영 SHA..대상 SHA` 범위를 보고한다.
- `js/`를 고치면 `public/js/` 사본, 스크립트 캐시 키, `config/payment-freeze.json`(`node scripts/verify-payment-freeze.mjs --update`), 사이트맵 원장(`npm run sitemap:generate`)도 같은 커밋에 맞춘다.
- `check:fast`는 커밋 후에 돌리면 "검사할 변경 없음"으로 공허하게 통과한다. 커밋 후 재검사는 `node scripts/check-changed.mjs --profile=fast --skip-build --committed-head`를 쓴다.
- Windows에서 `js/core/tarot/master-reading-data.mjs`가 CRLF면 `tarot-master-reading.test.mjs`가 실패한다. 환경 문제이고 커밋 대상이 아니다. `check:fast` 전에 `sed -i 's/\r$//'`로 LF로 바꾸고 push 전 검사 전에 `git checkout --`로 되돌린다(public 사본 포함).
- 작업 끝의 워크트리 제거는 **origin/main 판 스크립트**가 필요하다. 메인 체크아웃 브랜치에는 `worktree:remove`가 없을 수 있어, `scripts/remove-worktree.mjs`와 `scripts/worktree-status.mjs`를 임시 폴더에 복사해 메인 체크아웃을 cwd로 실행한다.

## 설계

### 1. 복귀 후 대운이 화면에 안 보임

- 코드: `index.html` `_cdRunSajuSectionUnlockResume`(30584 부근)가 `_cdScrollUnlockedSectionIntoView`(30524 부근)를 부른다. 이 스크롤 함수는 `gate.closest('section').scrollIntoView({behavior:'smooth'})`를 한 번만 실행한다.
- 측정(모의, 412×900, 미리보기 빌드):
  - 2초: scrollY 9255, 문서 높이 28212, 게이트 상단 5759.
  - 4초 이후 고정: scrollY 10854, 문서 높이 32513, 게이트 상단 10187. 뷰포트 기준으로 약 11화면 아래이고, 고객에게는 십성 구간이 보인다.
- 해금 자체는 정상이다. `daewunGate`는 `--unlocked`, 오버레이는 `display:none`, 본문은 5355px로 그려지고, 직접 스크롤하면 대운이 보인다(`.tmp/paid-return-qa/gate-view.png`).
- 가설(미증명): 스크롤 시작 뒤 지연 렌더로 문서가 자라 목적지가 밀렸다. `closest('section')`이 결과 전체를 감싸는 것은 아니다(`daewunCard`, 높이 3026으로 확인). 수치가 맞지 않는 부분이 있다. 게이트 높이 5391이 그 section 높이 3026보다 크다. 수정 전에 어떤 요소가 자라는지 먼저 확인한다.
- 방향: 재개 경로에서 위치가 안정될 때까지(상한 약 8초) 대상 위치를 다시 맞춘다. 사용자가 터치·휠로 스크롤하면 즉시 멈춘다. `_cdScrollUnlockedSectionIntoView`는 호출처가 10곳이므로 재개 핸들러 쪽(30612, 30622 부근)에만 적용하는 것을 우선 검토한다. 다른 호출처에도 같은 문제가 있으면 보고한다.
- 테스트: `__tests__/ui/saju-section-unlock-resume.behavior.test.js`에 추가한다.

### 2. 홍보 팝업이 결제 콘텐츠를 덮음

- 코드: `js/core/home-funnel.js` `setupSignatureConsultPopup`(212 부근). 한국어 `/ggulggul/`에서 해시가 없으면 1.5초 뒤 전체 시트를 열고 스크롤을 잠근다. 결제 복귀 여부를 보지 않는다. 캡처: `.tmp/paid-return-qa/probe4a.png`.
- 방향: 문서 시작 시점에 복귀 여부(`portone_redirect`/`paymentId` 쿼리 또는 `cd_direct_payment_resume` 티켓)를 **한 번 읽어 기억**하고, 그 문서에서는 팝업을 열지 않는다. 재개가 끝나면 쿼리와 티켓이 지워지므로 1.5초 뒤에 판정하면 놓친다. 스크립트 실행 순서에 의존하지 않는지 확인한다.
- `markSessionClosed`나 "오늘 하루 보지 않기" 기록은 남기지 않는다. 고객이 닫은 것이 아니기 때문이다.
- 팝업 테스트는 현재 `__tests__`에 없다. 동작 테스트를 하나 추가한다.

### 3. 복귀 카드 영어 문구에 한글 결제수단

- 현상: "Your 신용카드 · 간편결제 payment is confirmed." 영어 문구에 한글 라벨이 들어간다(이전 세션 관찰).
- 코드: `js/core/checkout-entry.js:1038`의 `checkoutText("payment.directModal.method.card", "신용카드 · 간편결제")`의 한글 폴백이 `js/destiny-profile.js`의 `directResumeComplete`(`{method}`)에 들어가는 것으로 보인다. 다른 언어도 같은 구조다.
- 방향: 사전이 아직 없거나 키가 없어 폴백이 쓰이는 원인을 먼저 찾는다. 사전 로드 타이밍 문제면 현재 언어의 라벨을 쓰게 고친다. 라벨을 확정할 수 없으면 이미 있는 `directResumeCompleteGeneric`을 쓴다. 확인 중·실패 문구(`directResumeConfirming`, `directResumeFailed`)도 같은 경로인지 본다.

## 검증 도구

`.tmp/paid-return-qa/`(커밋 안 함)에 이전 측정 스크립트가 있다. `/api/`를 모두 모의하고, 사전 방문으로 카드 캐시를 만든 뒤 가짜 티켓으로 복귀 URL에 들어간다.

- `LOC=ko node handler-prod.cjs 1`: 운영 호스트에서 문서·확정 횟수, 해금, 티켓 삭제를 측정한다. 인자는 쓰지 않아도 되는 초 값이고 `LOC`는 `ko`/`en`이다. 저빈도로 돌린다.
- `node handler-probe7.cjs 1`: 미리보기 호스트(`de7b3003.codedestiny-5md.pages.dev`, 선행 수정 빌드)의 시간별 스크롤 위치를 측정한다. **새 빌드를 재려면 스크립트 안의 호스트를 새 미리보기나 스테이징으로 바꾼다.**
- 함정:
  - 프로필 모의는 `/api/profile`이 `{ok:true, profiles, currentId}`를 줘야 한다. 없으면 재개가 실패해 "안 열림"으로 오판한다.
  - 사전 방문을 건너뛰면 카드 캐시가 없어 재개가 실패한다(환경 변수 `NO_PRE=1`).
  - 페이지 오류 `Cannot read ... 'element'`(`profile-character-card.mjs`)와 "일시적인 오류" 토스트는 캐릭터 미리보기 모의가 비어 있어서 나는 것으로 추정한다.
  - 이 스크립트의 `overlays` 값은 브라우저에서 믿을 수 없다.
  - 결과는 알림의 exit code가 아니라 출력을 본다.

합격 기준(ko·en, 412×900):
- 문서 1회, 확정 1회, 언어 유지, 티켓 삭제.
- 복귀 후 대운 제목이 뷰포트 안에 있다.
- ko 복귀 문서에서 팝업이 열리지 않는다.
- 복귀가 아닌 일반 홈 방문에서는 팝업이 그대로 열린다.
- en 카드 문구에 한글이 없다.

## 단계

- [ ] 1. 스크롤: 원인 확인 → 실패 테스트 → 수정 → `check:fast` → 커밋
- [ ] 2. 팝업: 실패 테스트 → 수정 → `check:fast` → 커밋
- [ ] 3. 영어 문구: 원인 확인 → 실패 테스트 → 수정 → `check:fast` → 커밋
- [ ] 4. `check:pre-push` → 내 커밋만 main에 push → 스테이징에서 합격 기준 확인(스테이징이 다른 세션 커밋으로 깨졌으면 원인을 밝히고 미리보기로 대체)
- [ ] 5. 범위 보고 후 승인을 받아 운영 승격 1회 → `version.json`·운영 번들 저빈도 확인
- [ ] 6. 이 문서에 SHA 기록, `status: done`, 워크트리 제거, 최종 보고

## 범위 밖 (보고만)

- 카드 캐시가 없고 `/api/profile`이 늦으면 자동 재개가 실패해 카드로 떨어진다("지금 열기"로 복구됨). 재현 조건이 좁다. 스크롤을 고치다 자연히 해결되지 않으면 고치지 않는다.
- `/api/reviews/products` 응답 형태 오류 시 결과 화면 전체 오류 경계, 반복 요청 시 CDN 자산 429, Cloudflare 토큰 `zone.analytics.read` 부재.

## 2026-11-06 운영 대조

운영 범위에 대운 위치 bbd0a5088, 결제 복귀 팝업 010f67451, 언어 b7695c015가 들어 있다. 일반 방문, 결제 복귀 쿼리·티켓의 팝업 회귀 검사를 실행했다. 실제 결제는 수행하지 않는다.
