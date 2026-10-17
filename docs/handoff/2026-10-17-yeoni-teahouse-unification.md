---
status: active
updated: 2026-10-17
next: "작업 브랜치 CI 결과 확인 후 사용자가 별도로 승인하면 main에 통합"
---

# 연이 운명 상담의 운명 찻집 통합

## 작업 위치와 승인 범위

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\yeoni-teahouse-unify-20261017-171455`
- 브랜치: `wt/yeoni-teahouse-unify-20261017-171455`
- 기준 원격 main: `1ca3c2648e73ed9f7adc048524b8aa374219cc9a`
- 구현 커밋: `fc2074a144c6c439824906f2d2f10f0a64974f59` (원격 작업 브랜치에 push 완료)
- CI: https://github.com/rei1237/codedestiny/actions/runs/39017651452 (`pr-ci.yml`, `full_ci=true`)
- 사용자 후속 작업 지시: 연이 운명 상담을 운명 찻집에 통합하고 UI·진입 경로의 중복을 없앤다. 기존 기록·URL·소유권·재열람·결제 계약은 보존한다. **merge·운영 승격·실결제·실제 메일 발송은 별도 승인**이다. WordPress 블로그는 범위 밖이다.
- main 및 다른 세션 파일은 편집하지 않았다. PR은 만들지 않았다. main 병합 전이므로 이 워크트리를 배수하거나 이 문서를 done으로 닫지 않는다.

## 구현과 계약

- `/fortune-tea-house/`는 기존 찻집을 유지하며 ‘대화 상담 → 연이와 대화하기’ 진입점을 제공한다. 목적지는 `/fortune-tea-house/?counsel=letter`다.
- 질문형 상담은 기존 `FortuneChatEntry`·`ConsultationRoom`·`FortuneChatClient`를 재사용하고, 상단에 찻집·보관함 공통 내비게이션을 둔다. 이 상태에는 찻집의 별도 소개 본문이 중복 노출되지 않는다.
- `/fortune-chat/`는 삭제하거나 리다이렉트하지 않는다. 같은 찻집 클라이언트의 `legacyChat` 호환 진입점으로 렌더한다. 결제 복귀 중 문서 이동·query/hash 변형·재개 핸들러 해제를 피한다.
- `?session=`은 새 엔진 활성화 플래그와 무관하게 기존 대화 원본을 연다. `?consultation=`의 유효한 ID는 원래 엔진 상담을 연다. 두 화면은 계정 키로 분리된다.
- `?resultId=`는 저장 찻집 결과를 우선한다. SSR에서는 실제 서비스 제목을 표시하고, 브라우저 주소 확인 전에 새 상담이나 결과 조회 컴포넌트를 마운트하지 않는다.
- 상담 허브의 연이 링크는 찻집으로, 네오 링크는 실제 `/neo-operation-room/`으로 연결한다. 예전 네오 링크가 새 연이 상담을 열던 혼선을 제거했다. 저장된 네오 상담의 persona는 기존 원본을 따른다.
- 서버 API·DB·소유자 필터·결제 레지스트리·이용권·월정석·단건 결제·가격·저장 데이터는 변경하지 않았다. 생성 결과는 기존 reader가 그대로 읽는다.

## 변경 파일

- `app/fortune-chat/FortuneChatCompatibility.tsx`, `page.tsx`, `FortuneChatEntry.tsx`
- `app/fortune-tea-house/FortuneTeaHouseClient.tsx`, `page.tsx`
- `src/features/fortune-tea-house/components/FortuneTeaHouseLanding.tsx`
- `lib/fortune/yeoni-entry.ts`
- `app/consultations/ConsultationHub.tsx`
- `__tests__/ui/yeoni-teahouse-entry.test.js`, `fortune-tea-house-entry-reader.behavior.test.mjs`
- `config/sitemap-lastmod.json`은 `npm run sitemap:generate`로 생성했다. URL 1,027개는 유지했다.

## 검증

- `node --test` 집중 검사: 저장·계정 분리·결제 복구 32개, 기존 UI/상담 접근/다국어 24개 통과. 최종 진입/SSR 검사 10개 통과(중복 포함 수치이며 합산하지 않는다).
- `npm run check:pre-push`: home-service-registry, public-mirror-fresh, sitemap-drift, llms.txt, seo-entity-registry 모두 통과.
- `impeccable detect`: 변경 UI 대상 발견 0건.
- 최초 `npm run check:fast`: lint·typecheck·sitemap 통과, Node 3,332개 중 4개 실패. 진입 검사 3건은 SSR 경계를 복원하고 새 선택 구조를 검사하도록 보완하여 10개 집중 검사 통과. 나머지 영냥이 모자 이미지 로딩 검사는 무수정 단독 재실행에서 통과했다. 최초 전체 실행을 통과로 기록하지 않는다.
- 보완 후 `npm run check:fast`: 변경 lint·전체 lint·typecheck·sitemap 통과, Node 3,334개 중 3,333개 통과/1개 실패. 실패는 이번에 수정하지 않은 `luck-sync-diary-planner.static.test.js`의 public runtime 미러 동일성 비교다. 같은 시간대 `check:pre-push`가 미러 재생성 검증을 수행했고 이후 작업 트리는 clean이었다. 무수정 단독 재실행 11개는 모두 통과했다. 동시 검증 중 일시 불일치로 보이나 전체 실행은 종료 코드 1로 남긴다. checker는 여기서 중단되어 뒤의 전체 Jest/가드는 그 실행에서 미실행이다.
- 관련 서버 계약: `npm run test:jest -- --runTestsByPath __tests__/worker/fortune-chat-consultations-route.test.js __tests__/worker/fortune-tea-house-delivery-billing.test.js` — 2 suites / 19 tests 통과.
- `npm run verify:paid-resume-wiring` — React 48/48, 정적 49/49, kind 46개 통과. `npm run verify:fortune-chat-reading` — mock 72조합 및 본문/복구 계약 통과.
- 로컬 전체 프런트 빌드는 저장소 규칙에 따라 중복 실행하지 않았다. GitHub CI에 빌드를 요청했으며 실행 접수만으로 통과를 주장하지 않는다. 구현 SHA 대상 `CI required`가 최종 게이트다. 인수인계 문서만 바뀐 후속 커밋과 구현 SHA를 구분한다.
- 실제 브라우저(mock): 390/1,440px 찻집 진입 화면 및 360/430px 질문 화면 가로 넘침 없음. 찻집 버튼의 새 질문 화면 이동 확인. 옛 주소와 새 찻집 주소의 완료 상담·옛 대화 기록 재열람에서 생성/활성화/결제 POST 없음, pageerror 0. 외부 요청은 차단했고 API 응답만 주입했다. 실 LLM 품질·실결제·운영 데이터 검증이 아니다.
- 증거 디렉터리: `C:\Users\user\.codex\visualizations\2026\10\17\01a148ec-e0c1-7672-ae47-761b07b91fd6` (`tea-entry-390.png`, `tea-entry-1440.png`, `tea-saved-consultation-390.png`, `tea-saved-session-390.png`, `yeoni-unify-browser.json`).
- 화면 검토: 신규 버튼과 공통 내비게이션에 차단 문제 없음. 기존 저장 대화 welcomeCard의 작은 제목 일부 잘림은 별도 관찰로 남겼으며 해당 스타일은 수정하지 않았다.

## 동시 작업과 다음 단계

- 시작 당시 로컬 main은 `3be4b029d2e3438831b2f5b440b74c149041cd93`이며 원격보다 214커밋 뒤였다. 다른 세션의 홈 변경 및 미추적 운영 스크립트가 있었다. 공유 main에서 pull/reset/stash/clean을 실행하지 않았다.
- `D:\Development\codedestiny-worktrees\fortune-chat-intro-20261017-161303`에 별도 세션의 `ConsultationRoom.tsx`, `FortuneChatClient.tsx`, `consultation.module.css`, `page.tsx`, 상세 콘텐츠·정적 셸 변경과 `ConsultationIntro.tsx`가 있었다. 이 작업에서는 그 미커밋 변경을 가져오거나 수정하지 않았다.
- 이 통합과 겹치는 파일은 특히 `app/fortune-chat/page.tsx`다. 상대 세션의 metadata/소개 UI를 보존하면서 본문의 `FortuneChatCompatibility` 연결을 유지해야 한다. 서버 가격 변경은 이 통합에 섞지 않는다.
- 사용자 병합 승인 후 최신 main/CI와 해당 동시 작업 상태를 재확인하고 충돌을 해결한다. 검증 후 main push 및 최종 SHA CI를 확인한다. 운영 승격은 별도다.
- 병합 완료 후 이 문서를 `status: done`으로 닫고 본 워크트리만 정션 해제 → worktree remove → 병합된 브랜치 삭제 순으로 배수한다. 다른 워크트리는 손대지 않는다.

## 재개 지시

`D:\Development\codedestiny-worktrees\yeoni-teahouse-unify-20261017-171455`에서 이 문서와 `git status --short`를 읽고, 구현 SHA `fc2074a144c6c439824906f2d2f10f0a64974f59` 및 CI 실행 `39017651452`를 확인한다. 사용자의 main 병합 승인 여부부터 확인한 뒤 최신 main/동시 연이 소개 UI의 변경과 충돌 여부를 확인한다.
