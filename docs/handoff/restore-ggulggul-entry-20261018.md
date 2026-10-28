---
status: done
updated: 2026-10-18
next: "통합 커밋의 GitHub CI 결과 확인; 운영 승격은 별도 요청"
---
# 영냥이 꿀꿀운세 진입점 복원

요청: 영냥이 홈의 꿀꿀운세 진입점 복원, 기존 main CI 실패 해소 후 main 통합.
구현 커밋: 72c185aad132c92b9b4103114c8df8eb3afeea05
기존 인수인계 커밋: 7a38ea7430fa120716ff40391680978ec112b1f6
통합 기준: 4c78bfa99d284af00a95d888455c4d9e7733af0b

## CI 복구 및 통합
- fc4611675의 Static guards 실패 4건을 로컬에서 재현했다.
- 수정 중 다른 세션이 동일 오류 수정과 번역 보완을 4c78bfa99로 main에 전달했다. 이 변경을 채택하고 자체 중복 수정은 제거했다.
- 최신 main에서 공유/상품 소개/12개 로케일/가격 필터 관련 테스트 60건 모두 통과.
- 기존 복원 브랜치를 merge하여 72c185aad 원본 이력을 유지했다. 코드 충돌 없음.
- 사이트맵은 npm run sitemap:generate로 재생성했고 1027 URL 드리프트 검사를 통과했다.
- 공유 D:\Development\code-destiny의 main 및 다른 세션 미커밋/스테이징 변경은 수정하지 않았다. 격리 HEAD에서 원격 main으로 fast-forward push한다.

## 변경과 검증
- app/yeongnyangi/_original/FortuneHome.tsx: 기존 CSS/이미지/ggulggulFortuneHref를 사용하는 배너 복원.
- config/sitemap-lastmod.json: 복원 소스 지문 반영.
- 결제/가격/인증/API/DB/라우트 구현 변경 없음.
- npm run check:fast -- --plan 확인; npm run check:fast 종료 코드 0.
- typecheck, changed lint, doc freshness, sitemap drift 통과.
- Node 3374건, smoke Jest 111건, smoke 정적 검사 47건 통과. 관련 Jest 추가 대상 없음.
- 이전 작업의 격리 Chromium 360/390/430/1280px 검증은 인수인계 증거이며, 이번 재개에서 전체 페이지/운영 시각 검증을 새로 수행하지 않았다.
- main 복구 CI: https://github.com/rei1237/codedestiny/actions/runs/39050624478
- 문서 작성 시 복구 CI 진행 중. 최종 통합 SHA/push/CI 판정은 세션 최종 보고에 기록한다. CI 진행 중은 성공이 아니다.
- 운영 승격은 수행하지 않는다.
