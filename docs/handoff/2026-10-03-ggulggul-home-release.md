---
status: blocked
updated: 2026-10-03
next: 미사용 DEFAULT_FORTUNE_COST_POINTS 운영 시크릿과 동기화 목록 항목의 삭제 승인 응답을 확인한 뒤 공식 릴리스를 재개한다.
---

# 꿀꿀운세 홈 운영 배포 인수인계

## 왜

사용자는 달빛·꽃 콘셉트 홈, 여섯 운세 바로가기, 상담 이미지 잘림 수정, 작은 꽃돼지가 있는 아틀리에, 푸터·이메일 UI와 모바일 최적화 및 운영 배포를 승인했다.

## 지금 상태

- 작업 위치: `D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209`. 브랜치 `wt/ggulggul-home-art-20261003-181209`, PR 없음. 구현은 main push 완료.
- 마지막 배포 대상: `3f9c2073270409b729ad50989bcb5e9a4c8bd79d`. [정확한 SHA CI](https://github.com/rei1237/codedestiny/actions/runs/37119905669) 성공. 마지막 코드 변경 SHA `76c3eead11bd402008db49281bb1544d6aaaa4c3`의 전체 CI도 성공(run 37118963932).
- [운영 릴리스 37120049659](https://github.com/rei1237/codedestiny/actions/runs/37120049659)는 Worker 업로드 전 용량 가드에서 실패. 프리뷰 Pages 업로드까지만 진행했고, 운영 승격은 하지 않았다.

## 차단 근거

`scripts/lib/worker-binding-budget.mjs:11`: `Worker text binding budget: 127/128, 1 slots remaining; keep at least 2 spare slots before upload.`
읽기 전용 Cloudflare API로 실제 운영 vars 56개 + 원격 시크릿 70개 + COMMIT_SHA 1개를 확인했다. CI fixture는 시크릿 69개여서 이 원격 증가를 잡지 못했다. 비밀값은 읽거나 출력하지 않았다.
정리 후보는 `DEFAULT_FORTUNE_COST_POINTS` 1개다. `git grep`으로 app/src/lib/worker/functions/config/scripts/__tests__/test/tests를 확인했으며 `scripts/sync-cloudflare-worker-secrets.mjs:287`의 동기화 목록 외 소비자가 없다. 사용자에게 이 운영 시크릿과 동기화 항목만 정리할지 질문했고 아직 응답 전이다. 실제 가격·이용권 정책은 변경하지 않는다.
2026-10-03 실패 직후 실제 `/version.json`과 `/api/version` 모두 HTTP 200, `67ef77e1d8673d85aa5e20c0075304b6d7ecfbf7`였다. 배포 완료로 보고하지 않는다.

## 남은 작업

- [ ] 삭제 승인 응답을 확인한다. 이번 홈 변경은 Worker 설정·시크릿을 수정하지 않았다. 승인 전 삭제나 가드 완화로 통과시키지 않는다.
- [ ] 필요 설정 변경은 별도 범위로 검증하고 main CI 통과 후 공식 workflow의 production 모드로 재시도한다. 로컬 배포 금지.
- [ ] Pages·Worker의 동일 SHA와 홈/새 WebP 응답을 검증한다. 검증 스크립트는 이 작업 폴더의 `build-cache/verify-production-home.cjs`에 보존했다.

## 검증 완료

`npm run check:fast`, typecheck, node 테스트 2332건, 홈 mock 320~1440px, 두 모드·여섯 바로가기·타로 컬렉션·검색·프로필·복귀·미러 검증 통과. 아틀리에 꽃돼지는 기존 WebP를 52×52로 재사용한다. 결제·인증·API·DB 정책 변경 없음. 물리 모바일 실측은 미실행.

## 재개 명령

```text
D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209에서 D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209\docs\handoff\2026-10-03-ggulggul-home-release.md를 읽어라. 마지막 배포 대상은 3f9c2073270409b729ad50989bcb5e9a4c8bd79d이며 main push와 CI는 완료했다. 다른 세션 변경을 보존하면서 먼저 DEFAULT_FORTUNE_COST_POINTS 운영 시크릿 1개와 동기화 항목 삭제에 대한 사용자 응답을 확인하라. 가드를 낮추거나 승인 없이 시크릿을 삭제하지 말라. 해결 후 공식 운영 릴리스와 Pages·Worker 동일 SHA 검증을 완료하라.
```
