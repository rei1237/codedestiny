---
status: active
updated: 2026-10-18
next: "기존 main CI 실패 해소 확인 후 72c185aad를 main에 통합하고 push 및 CI 결과 확인"
---
# 영냥이 꿀꿀운세 진입점 복원

요청: 영냥이 사이트에 꿀꿀운세 진입점을 이전처럼 복원.
작업 디렉터리: D:\Development\codedestiny-worktrees\restore-ggulggul-entry-20261018-013321
구현 커밋: 72c185aad132c92b9b4103114c8df8eb3afeea05
기준 origin/main: fc46116754148f0b9f50d5819795014e161a3d5a
push: 하지 않음. 기존 main CI Static guards 실패로 전달 규칙상 차단.
CI: https://github.com/rei1237/codedestiny/actions/runs/39049398392
실패 잡 117444900535: Run the static UI guards the release runs, 기존 검사 4건 실패. tarotAlbum 문구/번역 키 등. 이번 변경과 무관.

변경: app/yeongnyangi/_original/FortuneHome.tsx 에 과거 ggulggul-bridge 배너를 복원. 기존 CSS, 이미지, ggulggulFortuneHref 재사용. 고민 선택 아래·결과 예시 위 배치.
config/sitemap-lastmod.json 은 npm run sitemap:generate 로만 재생성.
결제/가격/인증/API/DB/라우트 구현 변경 없음.

검증:
- check:fast -- --plan 확인.
- check:fast: whitespace, doc freshness, changed lint, sitemap drift, typecheck 통과. Node 테스트 실행 중 출력을 더 받지 못해 중단. 전체 성공 아님; smoke:core/jest-related 미실행.
- check:pre-push 통과 (registry/public mirror/sitemap/llms/SEO entity).
- impeccable detect 결과 [].
- 실제 JSX+기존 CSS 격리 Chromium 렌더: 360/390/430/1280px 정상, 넘침 없음, 주 버튼 49px/보조 링크 44px, href /ggulggul/. 전체 Next 페이지 및 운영 검증 아님.
- 시각검증 임시파일 정리 완료.

다음:
1. 원격 main 최신 SHA 및 기존 CI 실패가 해결됐는지 확인. 실패한 main 위에 push 금지.
2. 주 체크아웃은 당시 main이 origin/main보다 319커밋 뒤이고 다른 세션의 미커밋/스테이징 변경 다수. reset/stash/강제 checkout 금지. 현재 상태 재확인 후 안전한 main 통합.
3. 최신 main과 병합, 필요시 sitemap 재생성, 관련 검사 및 check:pre-push 후 main push. CI는 최종 1회 확인.
4. 인수인계 status done, 머지된 작업의 node_modules 정션 해제 후 워크트리 및 wt 브랜치 배수.