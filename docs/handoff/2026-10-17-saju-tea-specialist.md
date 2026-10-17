---
status: done
updated: 2026-10-17
next: "대운 브라우저 검사를 수정한 main CI 결과를 확인한다. 운영 승격은 별도 승인 대상이다."
---

# 연이와 네오 사주 안내 / 찻집 사주 전문 상담

사용자 승인: 두 인간형 캐릭터 공동 이미지 직접 생성, 뇌·신체 아래 공동 안내 CTA, 찻집 사주 단일 상품 15,000원, 기존 AI/fortune-chat 사주 신규 진입 통합. 기존 결제·진행·저장 결과 보존. 11+5 상세 장(건강 포함), 약 30,000자/6그룹, 기존 하한/복구 유지. 대운 요약 이동 및 기본·유료 해석 심화. 다른 점술·궁합과 운영 배포 제외.

- 작업 디렉터리: D:/Development/codedestiny-worktrees/saju-tea-specialist-20261017-161924
- 기준: bc4ba149471ac99f24c1117a35197a9bfa0ccca5
- 구현 커밋: a2bb092867e02678f65c5446f3fca50629996272
- 기존 main CI 실패: 39008934591, sitemap drift / Static guards. 타 작업 위 push 금지, 전달 전 재확인.
- main 미커밋 home/index/public/test 변경과 미추적 운영 스크립트는 타 세션 소유, 변경하지 않음.
- [x] 지시/디자인/결제 계약 확인, 안전 워크트리 생성
- [x] 공동 이미지 ImageGen 생성 (원본은 CODEX_HOME에 보존)
- [x] 진입점·찻집 직접 진입·기존 상담 보존
- [x] 가격/6그룹/기존 장+생활영역5장/목차/건강 품질 규칙
- [x] 대운 통합·해설
- [x] targeted 검사·실제 브라우저 mock·리뷰
- [x] 구현 커밋·pre-push
- [x] 기존 main 실패 원인 수정 및 원격 main push
- [x] 사주 통합 및 남은 Node 전체 검사
- 전달·CI 상태 및 워크트리 정리 증거는 아래 재개 완료 기록 참조. status는 이 작업의 종료 표식이며 CI 성공이나 운영 승격을 뜻하지 않음.

현재 원격은 계획 탐색 때보다 진전됨: 찻집은 저장된 checkpoint 그룹 단위 생성/복구를 사용. 기존 checkpoint.request/groups는 그대로 재개하고 새 개인 사주만 새 6그룹 계약으로 시작해야 함.

운영/실결제/실LLM 검증은 하지 않음. 롤백은 이 작업 커밋만 revert. 타 세션 파일 reset 금지.

## 구현과 보존 범위

- 신규 사주 진입은 owner 일치·30분·1회 소비 sessionStorage 전달로 찻집 입력 단계로 연결. URL에는 mode/entry만 포함. 서버가 반환한 현재 계정 프로필에 한해 선택. 저장 결과/history 진입이 우선하며 새로고침 초안을 보존. 같은 탭의 로그인 전 찻집 초안은 기존 로그인 복구 규칙을 따르되 guest 프로필 참조를 제거. 초기 소유자 복구가 신규 직접 진입을 landing으로 덮지 않으며 기존 유료 복구는 우선.
- 단건 15,000원(cost150), 앱 cd_content_tier_16. 월정석/이용권의 기존 가격·한도 판정 사용. 신규 가격으로 기존 권리를 재계산하지 않으며 기존 결제 pricingSnapshot을 우선.
- 신규 saju-specialist-v1만 6그룹/목표30,000자/그룹하한합계18,000자. 기존 카테고리 장을 유지해 기본11장 또는 카테고리12장에 독립 생활영역5장을 추가. 기존 저장 checkpoint와 요청은 그대로 복구.
- 건강은 생활리듬 해설. 특정 질병/장기 예측의 명시적 표현은 거부하되 완전한 의학적 언어 분류기를 뜻하지 않음. 실제 LLM 문체/분량/건강 표현 품질은 아직 실호출 검수 전.
- 대운 현재/올해 기본 해설을 잠금 밖으로 이동. 유료 대운의 기존 직업·재물 해설과 번호를 유지하면서 계산 근거에 연결된 선택지 비교·건강과 회복 장을 추가. 계산식/다른 점술/궁합 상품은 변경하지 않음.

## 검증 증거

- node --test 사주 진입/reading-rich/reading-depth/daewun-evidence: 28 passed. 최종 실제 직접진입/소유자 복구 effect 연동 검사: 5 passed(로그인 복귀·유료 복구 우선·계정 전환 포함).
- 신규 장 구성/필수장 누락/건강 문구/가격/앱SKU/이용권: 7 passed. 사주 근거/시기 포함 targeted: 32 passed.
- 기존 결제 재개/응답 유실/실패복구 테스트 통과. honey-drops 100 passed(기존10,000원 snapshot 재개/재열람시 추가LLM 호출 없음 포함).
- 신규 specialist 실제 consult 라우트 mock: 6그룹 완료, 건강 예측 응답 1회 거부 후 해당 그룹만 재생성(총7회), 저장 결과 재열람 추가 생성0회 통과. 실 LLM 문체 검수가 아닌 합성 응답 통합 검사.
- typecheck 통과. payment-freeze region4/file3/ceiling2 통과. ImageGen 생성본 640/1280 WebP 및 sync:public 반영. sitemap:generate로 원장 재생성(81 signature 갱신, 기존 main sitemap drift 포함).
- 실제 /ggulggul/ 정적 사주 결과, 모든 외부 통신 차단/API mock: 360·390·430·1440px × pig/neo. CTA1개, 높이52px, 가로넘침0, 브라우저예외0, 기본시기잠금밖. 정상가격15,000원 표시 캡처 확인.
- 캡처: C:/Users/user/.codex/visualizations/2026/10/17/01a148af-428c-7bf1-9693-dbf05254b47d/saju-joint/
- impeccable detect(변경 UI 3파일): exit0/출력0. 읽기전용 시각 리뷰가 요청한 정상가격 캡처를 보완.
- 최초 check:fast: 411/414 Jest suites 통과, 구가격 기대값2개와 VM 검사 의존성1개 실패. 세 항목 수정 후 관련52 tests 통과.
- 두 번째 check:fast: 414/415 suites, 6611/6635 tests 통과. 대운 기존 HTML parity 24건 실패를 수정: 기존 장을 대체하지 않고 기존 서버 확장장 계약으로 새 두 장을 추가. 관련 saju-section 413 tests 통과. 추가 장의 실제 노출·건강 표현을 확인하는 pig/neo 2건을 보강.
- 마지막 check:fast: Jest 415 suites / 6638 tests 전부 통과. 이어진 node 검사 3332 중 3328 통과, 구가격·기존 대운 장 수·구 사주 신규 진입 전제 4건 실패로 명령 exit1. 실패한 3파일의 기대값·진입 검사를 수정하고 관련34 tests 전부 통과. 원래 결제 복귀 검증은 다른 점술에서 유지하고 신규 사주 이동/기존 유료 사주 재개를 추가 확인. 전체 check:fast 재통과라고 보고하지 않음.
- 최종 소스 lint, typecheck, build:worker(dry-run), verify:worker-no-undef 전부 exit0. 구현 커밋에서 check:pre-push exit0(홈 등록소·정적 미러·사이트맵·llms·SEO 등록소). 최종 테스트/문서 커밋 뒤 pre-push를 다시 실행할 것.

## 이전 전달 차단 기록

원격 main은 bc4ba149471ac99f24c1117a35197a9bfa0ccca5 그대로이며 CI run39008934591 failure. main에 다른 세션 index/home/public 변경이 남아 있음. 저장소 지침상 이 상태 위 push 금지. 로컬 구현·검증·커밋을 보존한 뒤 main 복구/병행 작업 종료 후 통합해야 한다. 이 파일은 운영 반영 증명이 아니다.

2026-10-17 17시대 최종 원격 조회도 같은 SHA/실패 런. 구현에는 기존 sitemap drift 원장 재생성이 포함되지만 타 세션의 main 변경을 함께 커밋하거나 실패한 main 위로 push하지 않았다. 병행 작업 정리 후 소스 충돌을 해결하고 정적 미러/사이트맵을 재생성하여 main에 병합·커밋·pre-push·push, 최신 CI 결과를 확인해야 한다. 이 작업 워크트리는 미병합 결과를 보존하기 위해 남긴다. 실 생성문 검수/운영 승격은 별도다.

## 2026-10-17 재개 완료 기록

사용자가 기존 main CI 해결, 다른 세션 보존, main 통합·검사·push·CI 확인을 명시적으로 요청했다.

- 기존 실패를 원격 bc4ba149471ac99f24c1117a35197a9bfa0ccca5에서 재현: config/sitemap-lastmod.json의 서명 6개 불일치. 생성기로 갱신 후 verify:sitemap-drift 및 커밋된 트리의 check:pre-push 통과.
- 수정 1ca3c2648e73ed9f7adc048524b8aa374219cc9a를 먼저 원격 main으로 push. CI run39016418944는 중간 확인에서 실행 중(Typecheck and lint 성공, Static guards 실행 중, Critical/Build는 판정에 따른 skipped). 이를 전체 CI 성공으로 취급하지 않음.
- 9ca02afc747a75d3b4482fa4bfa90d011270b792에서 사주 구현과 수정된 원격 main 통합. 충돌은 생성 원장 하나뿐이며 최신 main 원장에 현재 소스를 적용해 재생성. 런타임 소스의 추가 변경 없음.
- 남았던 npm run test:node 전체 3332 tests 통과, 실패0/skip0. 앞선 Jest 415 suites/6638 tests, lint/typecheck/Worker dry-run 증거는 소스가 같아 재사용. check:fast 전체를 반복한 것으로 보고하지 않음.
- 공유 main 체크아웃은 3be4b029d2e3438831b2f5b440b74c149041cd93으로 원격보다 213커밋 뒤처져 있으며 타 세션의 미커밋 수정 10개와 미추적 항목이 있음. 이 체크아웃·index·로컬 main ref는 그대로 보존하고 격리 공간에서 HEAD:refs/heads/main으로 fast-forward push. 공유 checkout의 pull/reset/stash/파일 복원은 실행하지 않음.
- 최종 pre-push·push·CI 조회·타 세션 파일 해시 비교 증거: C:/Users/user/.codex/visualizations/2026/10/17/01a148af-428c-7bf1-9693-dbf05254b47d/saju-joint/ 아래 integration-* 파일. 최종 CI 결론은 GitHub 해당 SHA의 CI required가 정본. 진행 중이면 성공으로 표시하지 않는다.
- 원격 main 전달 뒤 이 작업 워크트리와 병합된 wt/saju-tea-specialist-20261017-161924만 정리한다. 공유 main의 다른 세션 파일과 다른 워크트리는 유지한다. 실 LLM·실결제·운영 DB·운영 승격은 수행하지 않았다.
