---
status: active
updated: 2026-11-04
next: "C 드라이브 후보의 현재 용량을 다시 재서 표로 사용자 승인을 받고, 승인된 것부터 지운다. 코드는 미참조 스크립트 270개 판정표부터 만든다"
---

# 용량 확보·불필요한 코드 정리

## 왜

사용자 요구 원문: "후속으로 용량 확보 및 불필요한 검사나 코드들을 깔끔하게 정리할 수 있도록 후속 인수인계해서 진행할 수 있도록해".

불필요한 검사는 `docs/handoff/2026-11-04-ci-check-optimization.md`가 맡는다. 이 문서는 용량과 코드·문서만 다룬다.

## 지금 상태

- 2026-11-04 실측 여유: C 22GB(91% 사용), D 202GB. 시작은 C 16.0GB, D 127.2GB였다.
- 끝난 것: 고아 폴더 81개(50.4GB), 오래된 워크트리 11개, Gradle 캐시, 끝난 인수인계 문서 56개. 기록은 `D:\Development\Storage-Maintenance\2026-11-04\`다.
- 코드는 아직 지우지 않았다. 아래 수치는 후보일 뿐 죽은 코드의 증거가 아니다.

## 남은 작업

- [ ] **1. C 드라이브(가장 급함).** 2026-11-04 측정: `.codex` 31.47GB(sessions 10.16, generated_images 5.26, visualizations 2.14), `Documents\Codex` 약 21GB(2026-10-28 6.77, 2026-10-25 6.06, worktrees 2.27), AppData 46GB(Claude-Data 9.85, Google 7.21), `.claude` 6GB, npm-cache 1.1GB. 대화·생성물이 섞여 있어 사용자가 고른다. 판정: 항목별 승인 표가 있고 C 여유 50GB 이상이다.
- [ ] **2. D 드라이브 재생성물.** Temp 11.27GB, Caches 11.14GB(uv 4.52, gradle 3.74, ms-playwright 2.22), `.preflight-*` 4개, `codedestiny-worktrees\build-cache`. 판정: 쓰는 프로세스가 없음을 확인하고 지운 뒤 빌드·테스트가 다시 받는다.
- [ ] **3. 남은 워크트리 재판정.** `.codex-worktrees` 18개, `codedestiny-worktrees` 12개. 먼저 볼 것: android-upgrade-20261007, moonflower-carousel 2개, collection-price(.64GB), home-service-discovery-ux-clean(.33GB), android-startup-ab(8.62GB, dirty 2), 미등록 followup-empathy-continuation-20261104(1.18GB). 판정: dirty 0이고 커밋이 브랜치에 남았을 때만 지운다.
- [ ] **4. 사용자 판단 보관물.** deliverables 3.9GB, backups 3.17GB, previews 2.17GB, Storage-Maintenance 2.08GB, 루트 `output` 6.42GB. 🔴 `Storage-Maintenance`의 마이그레이션 before JSON은 개인정보가 있을 수 있어 내용을 출력하지 않는다.
- [ ] **5. 문서 잔여 판정.** 오래된 후보 중 done이면서 참조가 있는 84개, active 121개, blocked 9개. frontmatter `status: in_progress` 1건은 계약 위반이다. docs는 129MB다(design 33, marketing 25, store-draft 23, verification 12). 판정: 참조를 고친 뒤 지우고 `verify:handoff-contract`가 통과한다.
- [ ] **6. 미참조 스크립트 270개 판정표.** `scripts/` 최상위 815개 중 소스·테스트·CI·`package.json`이 이름으로 부르지 않는 파일이다. verify 185, build 14, audit 13, report 8, test 7. 그중 131개는 docs에 언급이 있다. 판정: 파일별로 "삭제·유지·배선"을 적은 표를 사용자에게 보여 주고, 승인된 것만 묶음별 커밋으로 지운다.
- [ ] **7. dead-code 측정.** knip 같은 도구가 없다(deps 25, devDeps 21, npm scripts 570). 저장소를 바꾸지 않고 임시 실행해 결과를 보고한다. 의존성 추가와 `package-lock.json` 수정은 하지 않는다.
- [ ] **8. 저장소 크기.** 추적 파일 1,030MB 중 `public` 612MB(images 192, assets 168, feature-details 121, 오타 폴더 fuctionassets 25). 쓰이지 않는 이미지 후보만 조사한다. 라우트와 콘텐츠는 지우지 않는다. `.git` 4.85GB 이력 재작성은 force-push라 금지다.

## 정본 예시

- 측정: `git ls-tree -r -l HEAD`와 파일 이름별 `git grep -l -F`
- 의도적으로 안 부르는 검증기 목록: `scripts/verify-guard-wiring.mjs:53`
- 삭제 전 점검: `.claude/agents/deletion-auditor.md`

## 함정

- 오탐이 실제로 있었다. `eslint-config-next`는 문자열 검색에 안 걸리지만 `.eslintrc.json`의 `next/core-web-vitals`가 쓴다. `postcss.config.mjs`는 참조 0개지만 빌드 도구가 자동으로 읽는다. 스크립트도 이름을 조립해 부를 수 있으니 실행 경로를 확인한다.
- `paid-flow-gates.yml:380` 등의 `scripts/verify-*` 패턴은 경로 트리거다. 삭제하면 게이트 범위가 달라질 수 있다.
- 루트 HTML은 참조가 적어 보여도 공개 서비스다. 요청 없이 지우지 않는다.
- 🔴 금지: `.env*`, `package-lock.json`, `ads.txt`, `worker/`, `public/_routes.json`, `js/core/checkout-entry.js`, 결제·인증·DB·운세 계산 로직 수정. 묶음 ③은 시작하지 않는다.
- Truth Sound(`D:\Development\truth-sound`)는 별도 프로젝트라 건드리지 않는다. 루트 체크아웃과 활성 워크트리도 마찬가지다.
- 워크트리 제거가 긴 경로에서 멈추면 고아 폴더가 남는다. junction을 먼저 끊고 Node `rmSync`로 끝낸다. 대조할 때는 CRLF를 정규화한다.

## 검증

```
npm run docs:stale
npm run verify:handoff-contract
npm run check:pre-push
```

## 모르는 것

- 미참조 스크립트 중 사람이 손으로 쓰는 것의 수. 사용자에게 묻는다.
- C 드라이브의 `.codex`와 `Documents\Codex`에서 남길 대화·생성물. 사용자가 정한다.
- 목표 여유 C 50GB는 이 문서가 잡은 임시 기준이다. 사용자 확인이 필요하다.
