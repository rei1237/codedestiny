---
status: blocked
updated: 2026-09-30
next: 소개 페이지 정적 HTML 검사를 별도 진단하고 코드 SHA 96fd60fee 이후의 통합 CI를 다시 확인
---

# 영냥이 네오 서사와 방 — 적용 및 검증 기록

## 보존한 구현

- 작업 디렉터리: `D:\Development\code-destiny`
- 마지막 구현 통합 SHA: `96fd60feea39fdea52a13d132470fb015054acd2` — main push 완료.
- 서사·이미지·방 구현: `c5bbf9f0d30d97a8808b5804b365912e48c758ed`.
- 음악 복구 수정: `54c185474` (96fd60fee의 부모 커밋).
- 계획, 전체 13개 수정 파일과 생성 프롬프트: `docs/dev/yeongnyangi-room-story.md`.
- 검수 화면과 결과: `.tmp/neo-room-evidence/` (로컬 보존, Git 비추적).

9장면의 네오 → 저주 → 고양이 서사, 직접 생성한 거울/생선 삽화 2장, 선택 대사, 기존 음원 4곡의 사용자 선택 재생, 방 놀이 5종, 마음별 운세 쪽지, 서버가 멸치 사용 성공을 확인한 뒤의 한숨 연출을 적용했다.

요청 문장도 그대로 포함한다: “그렇다... 네오 그는 이제 생선만 보면 거부할 수 없는 몸이 되어버렸다...”

## 통과한 검증

- 첫 구현 `npm run check:fast`: 통과.
- 추가 음악 수정 `npm run check:fast -- --committed-head`: 자동 상향된 전체 검사 통과. paid-gate-suite 88/88, Jest 317스위트·4599테스트, lint/typecheck, Worker dry-run 포함.
- `node scripts/verify-yeongnyangi-room-story-browser.mjs`: Chromium 1440×1000, 390×844. 이야기 진행/선택, 방 상호작용, 실제 CDN 음악 재생과 정지, mock 멸치 사용 실패·성공, 모션 줄이기, Escape/포커스 복귀. 브라우저 오류 0.
- `node scripts/verify-yeongnyangi-room-soundtrack.mjs`: 실제 훅 + mock 무음 WAV로 음악 오류 재시도, 음량, 숨김/복귀, unmount 정리 통과.
- 무료 운세 계약 3/3, hero-contrast, mobile-detail-nonintrusive, 디자인 정적 감지 통과.
- 실기기와 운영 배포는 미실행. 실결제/유료 LLM/운영 DB 쓰기 없이 검증했다.

## CI 차단 근거

검증 대상은 위 코드 SHA 96fd60fee다. 문서만 수정한 후속 커밋의 CI가 통과하더라도 이 코드 빌드의 통과 증거로 대체하지 않는다.

- CI: https://github.com/rei1237/codedestiny/actions/runs/36660741678
- Typecheck and lint: success.
- Build Pages and Worker: failure.
- Static guards: failure (`verify:public-mirror-fresh`, 10파일 드리프트).
- CI required: failure, 실행 종료 확인.
- 미러 드리프트 파일: index.html, js/core/index-inline-runtime.js, public/{en,ggulggul,ja,static,zh-tw,zh}/index.html, public/index.html, public/js/core/index-inline-runtime.js. 영냥이 커밋은 이 파일들을 수정하지 않았다.
- Next 페이지 생성 후 postbuild의 `scripts/verify-adsense-readiness.mjs`에서 아래 오류 발생:

```text
[adsense-readiness] out/about/index.html: publisher body requires JavaScript to reveal streamed HTML
```

- 호출 위치: `assertPublisherBody` (929), `verifyIndexablePublicRoutes` (952).
- `out/`과 `dist/`를 직접 고쳐 해결하지 않는다. `/about` 원본과 공통 레이아웃의 정적 출력 계약을 조사한다.
- 초기 서사 커밋 c5bbf9f0d의 Build lane은 통과했으나 당시 공통 natal-day-pillar-axis 검사 때문에 전체 CI는 실패했다. 그 검사는 다른 세션의 2de203e9b 수정이 반영됐다. 최신 통합본은 위의 별도 about 빌드 오류로 전체 통과 조건을 충족하지 못한다.
- 영냥이 변경에서는 `app/about`, `app/layout.js`, `scripts/verify-adsense-readiness.mjs`를 수정하지 않았다. 범위 밖 수정을 임의로 추가하지 않았다.

## 유지한 정책과 작업 상태

결제/이용권/월정석/단건 결제, 무료 16종, 출석 멸치 지급·사용 정책, 인증, 서버 API, DB, 운세 계산 로직을 유지했다. 방의 놀이는 클라이언트 반응만 바꾸고 멸치를 쓰지 않는다.

공유 main의 `marketing/HANDOFF.md`, `marketing/content-log.md`, `marketing/performance.md`, `next-env.d.ts`, `tsconfig.json`, `.tmp/`는 다른 작업이므로 보존했다. clean을 만들기 위한 reset/stash/삭제를 하지 않는다.

## 인수인계 문서 검증

전체 `npm run verify:handoff-contract`는 다른 문서 두 건의 기존 status 값 때문에 실패했다: `2026-09-30-fortune-report-external-ai-astra-handoff.md`의 `implemented-awaiting-main-ci`, `2026-09-30-yeongnyangi-summary-report-preview.md`의 `review-preview`. 해당 문서들은 수정하지 않았다. 이번 문서는 status=blocked, updated=2026-09-30, next를 지정했으며 개별 형식 검사와 git diff --check를 통과했다.

## 재개 명령

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny'
Get-Content -LiteralPath 'D:\Development\code-destiny\docs\handoff\yeongnyangi-room-story-20260930.md'
git status --short
git show --no-patch 96fd60feea39fdea52a13d132470fb015054acd2
gh run view 36660741678 --log-failed
# 다음: /about 및 공통 레이아웃의 streamed HTML 오류 원인을 별도 진단한다.
# 영냥이 서사를 다시 구현하거나 기존 멸치 정책을 바꾸지 않는다.
```
