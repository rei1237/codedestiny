---
status: active
updated: 2026-10-28
next: "원격 main CI 복구와 로컬 전체 검증 결과 확인 후 변경 커밋 전달"
---

# 대표 상담 카드·프로필 홈 버튼 인수인계

- 작업 경로: `D:\Development\code-destiny\.codex-worktrees\moonflower-carousel-20261028-052008`
- 기준 원격 main: `f7995f761447f933727f725d7929303b7d83d7ba`. 마지막 작업 커밋: `1c32fa0f681ba743b3f8eeb532217fb445dc023b` (코드 `eee9cd818`, 검색 설정 `767d0564b`, 사이트맵 `7c00193be`, 번역·검사 `1c32fa0f6`). push·배포 없음.
- 초융합·연이 대화·네오 이메일·영냥이 질문 순서의 카드 레일, 고민 기본 열림, 접힘 패널, 모바일 이미지 소스 선택, 프로필 홈 버튼을 구현했다. 기존 상담 탭과 여섯 카드 및 가격·결제·인증·API·DB는 유지한다.
- 로컬 브라우저 360·390·430·1280px에서 첫 네 카드 순서, 버튼 이동, 고민 기본 열림과 문서 가로 넘침 없음을 확인했다. 프로필 복귀를 같은 해시 상태에서 두 번 확인했고, DPR 3의 전체 운세 카테고리 표지 8개에서 640px 소스 선택을 확인했다. 390px 다크 테마와 키보드 카드 이동·고민 영역 접기/펼치기도 확인했다. 터치 실기기·전체 이미지·초기 성능 전후 비교는 미검증이다.
- `npm run check:pre-push` 통과, `node scripts/i18n-check.mjs` 통과, `npm run verify:home-service-registry` 통과. `scripts/design/verify-home-funnel.cjs`는 기존 탭의 숨김 상태를 항상 보이는 것으로 기대해 실패했고, 해당 기대를 임시 조정했을 때 기존 히어로 그라디언트 기대도 실패했다. 임시 수정은 되돌렸다. `check:fast -- --base=f7995f761447f933727f725d7929303b7d83d7ba`는 카드 수 기대값과 다국어 누락으로 88/90에서 실패했다. 해당 기대값·번역을 고친 뒤 관련 Node 테스트 15건과 `verify:master-love-codex-flow`는 통과했다. 수정 후 전체 스위트는 다시 실행하지 않았다.
- 원격 main `f7995f761447f933727f725d7929303b7d83d7ba` CI 실패: https://github.com/rei1237/codedestiny/actions/runs/40574675893 — `verify:feature-marketing-schema`에서 `neo-email-consultation` 마케팅 카피 누락. 기존 실패 위에 push하지 않는다. 로컬 main은 origin/main과 2 대 90으로 갈라져 있고 다른 워크트리에서 사용 중이므로 건드리지 않는다.
- 다음: 수정 후 전체 `check:fast -- --base=f7995f761447f933727f725d7929303b7d83d7ba` 재실행; 기존 CI 복구 후 최신 원격과 다른 세션 변경을 확인하고 안전하게 통합; 홈 회귀 스크립트의 오래된 기대값과 실기기·성능 비교를 확인한 뒤 전달 전 검사와 CI 확인. 운영 배포는 별도 승인 필요.
