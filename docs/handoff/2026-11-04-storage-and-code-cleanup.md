---
status: active
updated: 2026-11-04
next: "사용자가 고른 C 드라이브 항목·워크트리 4개·미참조 스크립트 118개만 처리한다. 판정표는 D:\\Development\\Storage-Maintenance\\2026-11-04\\script-verdicts.md"
---

# 용량 확보·불필요한 코드 정리

## 왜

사용자 요구 원문: "후속으로 용량 확보 및 불필요한 검사나 코드들을 깔끔하게 정리할 수 있도록 후속 인수인계해서 진행할 수 있도록해".

불필요한 검사는 `docs/handoff/2026-11-04-ci-check-optimization.md`가 맡는다. 이 문서는 용량과 코드·문서만 다룬다.

## 지금 상태

- 2026-11-04 실측 여유: C 22GB(91% 사용), D 202GB. 시작은 C 16.0GB, D 127.2GB였다.
- 끝난 것: 고아 폴더 81개(50.4GB), 오래된 워크트리 11개, Gradle 캐시, 끝난 인수인계 문서 56개. 기록은 `D:\Development\Storage-Maintenance\2026-11-04\`다.
- 2차 실측(같은 날 저녁): C 27.7GB, D 199.1GB. 스크립트 코드는 아직 지우지 않았다.

## 남은 작업

- [ ] **1. C 드라이브(가장 급함).** 재측정: `.codex` sessions 10.48GB(10월 이전 7.72), generated_images 5.30(10월 이전 5.02), visualizations 2.18(10월 이전 1.93). `Documents\Codex` 대형 폴더 docs-codex-hostbar 3.77·code-destiny-2 4.54·new-chat-2(10-26) 2.12. 재생성 캐시 npm-cache 1.10·dependency-cache 1.15·ms-playwright-mcp 1.12. 🔴 `2026-10-26\new-chat-2\work`와 `worktrees\yeongnyangi-blue-passes`에는 미커밋 작업이 있는 등록 워크트리가 있어 옮기지 않는다. 판정: 항목별 승인이 있고 C 여유 50GB 이상이다.
- [x] **2. D 드라이브 재생성물.** 3일 넘게 안 쓴 Temp, 빈 `.preflight-*` 4개, Gradle 캐시, Playwright 빌드 1200을 지워 8.50GB 확보, 실패 0건. 목록은 `d-regenerable-removed-session2.txt`다. uv 캐시는 Truth Sound 실행 중이라, `build-cache`는 사용 중이라 남겼다.
- [ ] **3. 남은 워크트리 재판정.** 문서가 지목한 워크트리는 android-startup-ab(dirty 2, 유지)만 남았다. dirty 0이고 커밋이 브랜치에 남은 후보는 engine-audit-phase0 2.58GB, results-main-gyeokguk 1.09GB, infra-optimization 2.30GB, seo-five-elements 2.15GB다. infra-deploy 2.27GB는 인수인계 문서가 가리켜 제외했다. 판정: 사용자 승인 뒤 브랜치를 남기고 지운다.
- [ ] **4. 사용자 판단 보관물.** deliverables 3.9GB, backups 3.17GB, previews 2.17GB, Storage-Maintenance 2.08GB, 루트 `output` 6.42GB. 🔴 `Storage-Maintenance`의 마이그레이션 before JSON은 개인정보가 있을 수 있어 내용을 출력하지 않는다.
- [x] **5. 문서 잔여 판정.** 14일 넘은 done 68개 중 34개를 지우고 참조 26곳에 삭제 표시를 붙였다(c5aa91697). 코드 인용 25개와 정본·결제·감사 문서가 인용하는 9개는 남겼다. `status: in_progress`는 본문 글자이고 frontmatter는 `active`라 계약 위반이 아니다. 오래된 active 102개와 blocked 5개는 다른 세션 소유라 지우지 않는다.
- [ ] **6. 미참조 스크립트 판정표.** 현재 279개, 삭제 118·배선 6·유지 155다. 표는 `script-verdicts.md`다. 전체 파일명은 코드에 없음을 `git grep -F`로 확인했고 파일을 읽기만 하는 검증기 12개는 실제로 돌렸다. 판정: 승인된 것만 묶음별 커밋으로 지운다. 배선 6개는 게이트 추가라 `2026-11-04-ci-check-optimization.md`에서 판단한다.
- [x] **7. dead-code 측정.** knip@5를 임시 실행했고 저장소 변경은 0건이다. 미사용 파일 1,398개, export 1,787개로 나오지만 정적 셸과 동적 로더를 못 읽어 오탐이 많다. `@capacitor/*`, `wrangler`까지 미사용으로 찍혔으므로 삭제 근거로 쓰지 않는다. 원본은 `knip-20261104.json`이다.
- [x] **8. 저장소 크기.** 이미지 6,189개 중 파일명 참조가 없는 후보 902개, 83MB다(assets/yeongnyangi 14.4MB, feature-details 6.9MB). 이름을 조립하는 스프라이트·화투가 섞여 있어 조사로 끝내고 지우지 않았다. 목록은 `unused-image-candidates.json`이다.

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
