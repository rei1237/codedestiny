---
status: done
updated: 2026-10-17
next: "병합 승인에 따라 main 통합 완료. 최종 CI 결과는 이 채팅의 전달 보고에서 확인"
---

# 연이 운명 상담의 운명 찻집 통합

## 승인 후 통합 결과 (이 절이 아래의 과거 대기 기록을 대체)

- 사용자가 main 실패 해결·충돌 해결·병합·push·최종 CI 확인을 승인했다. 운영 승격은 하지 않는다.
- main 실패는 `a2bb09286`의 대운 확장 2장 추가 뒤 브라우저 가드가 12장을 기대하던 불일치였다. `0e4b85d38`에서 14장 및 추가 제목 2개를 검사하도록 복구하고 먼저 main에 push했다. 요약 브라우저 검사 4개 시나리오의 360/390/430/1280px 모두 통과했다.
- 별도 `verify-saju-daewun-quality-browser.mjs` 실행은 과거 5,000원 기대값 때문에 실패했다. 이 스크립트의 임시 수정은 되돌렸고 현재 가격/결제 정책은 수정하지 않았다.
- 원래 통합 CI `39017651452`는 찻집 SSR 안내 본문 누락으로 build 실패했다. `FortuneTeaHouseClient`가 주소 해석 전에도 기존 안내 children을 서버 렌더하도록 수정했다. 신규 상담·저장 reader는 여전히 주소 확인 전 마운트하지 않고, 확인 후 대화/저장 화면에서 안내를 숨기는 동작 검사도 추가했다.
- `a77247ca2`에서 연이 작업을 병합했다. 이어 동시 세션의 최신 main `bc1d7efab`를 반영했다. 충돌은 사이트맵 원장뿐이며 원격 main 원장을 기준으로 공식 생성기로 갱신했다.
- 공유 main의 다른 세션 미커밋 홈 수정과 fortune-chat-intro 워크트리의 미완료 변경은 가져오거나 수정하지 않았다. 그 워크트리의 page metadata 변경은 이번 compatibility 연결과 수정 지점이 다르다. 미완성 작업의 자동 통합은 하지 않았다.
- 통합 타입 검사 통과. 집중 진입/SSR/번역 검사와 커밋된 트리 pre-push를 수행하고 최종 main CI를 확인한다. 워크트리 정리는 최종 CI 확인 후 수행한다. 현재 로컬 main은 다른 세션 편집 보호를 위해 이동하지 않으며 전달 기준은 원격 main이다.

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

## 2026-10-17 후속: 꽃돼지 연이 대화 상담 안내

- 사용자 지정 마지막 SHA `aede52ada719774807fbc7417c148dc11bce2246` 확인 후 clean 작업 트리에서 이어서 수정했다. main 병합은 여전히 별도 승인 대상이다.
- `FortuneTeaHouseLanding.tsx`의 대화 상담에 기존 `public/images/fortune-tea-house/flower-pig-welcome.webp`를 재사용하고, “간단한 질문에는 꽃돼지 연이에게 물어봐!”를 HTML 말풍선으로 표시했다. 신규 이미지 생성 없이 기존 꽃돼지 정체성을 유지한다.
- `tea-house-home.module.css`에 해당 영역 전용 반응형 배치를 추가했다. 기존 상담 링크, 결제·가격·인증·API·DB는 수정하지 않았다.
- 번역 정본 `i18n/authored/fortuneTeaHouse-51.json` → `node scripts/i18n-merge-authored.mjs --namespace fortuneTeaHouse --core`로 12개 코어 사전을 생성했다. `npm run sitemap:generate`로 원장을 갱신했다(공유 번역 사전을 참조하는 경로들의 signature 포함). URL 1,027개 유지.
- `node --test __tests__/ui/yeoni-teahouse-entry.test.js __tests__/ui/fortune-tea-house-i18n.static.test.js`: 7/7 통과. `npm run verify:sitemap-drift`, `node scripts/verify-i18n-public-parity.mjs --all`, `git diff --check` 통과. 변경 TSX ESLint 오류 0 / 기존 `/records/` a 링크 경고 4건.
- `npm run check:fast -- --plan` 이후 `npm run check:fast` 실행: 새 저작 파일이 미분류로 critical 승격되어 90개 paid-gate suite에 진입했다. 전체 로컬 검사 중복을 피하려고 첫 대규모 테스트 단계에서 중단했다. **전체 check:fast 통과 아님**. 최종 전체 게이트는 새 커밋 CI에서 확인해야 한다.
- 실제 Next 화면을 외부/API 요청 차단한 mock 브라우저로 360/390/430/1440px에서 확인: 이미지 로딩 정상, 요청 문구 표시, 기존 `/fortune-tea-house/?counsel=letter` 링크 유지, 가로 넘침 없음. 별도 시각 검토도 차단 결함 없음. 로컬 서버는 종료했다.
- 화면 증거: `C:\Users\user\.codex\visualizations\2026\10\17\01a14901-0f12-7520-bb5a-4546a1cef607\yeoni-chat-{360,390,430,1440}.png`.
- 후속 확인 당시 기존 구현 CI `39017651452`는 진행 중. 원격 main `79d01e63302fb18230b0ce1516721175ffdb330b`의 CI `39016747491`는 실패(Static guards 내 사주 요약 mobile-restored assertion, CI required failure). 이번 UI 수정의 원인으로 단정하지 않으며 main에 push하지 않는다.
- 다음: 새 작업 커밋 CI 확인 → 사용자의 별도 병합 승인 후 동시 작업 충돌 점검 및 main CI 복구 여부 확인 → 통합. 승인 전에는 워크트리를 배수하거나 status를 done으로 바꾸지 않는다.

## 이전 통합 재개 명령 참고

`D:\Development\codedestiny-worktrees\yeoni-teahouse-unify-20261017-171455`에서 이 문서와 `git status --short`를 읽고, 구현 SHA `fc2074a144c6c439824906f2d2f10f0a64974f59` 및 CI 실행 `39017651452`를 확인한다. 사용자의 main 병합 승인 여부부터 확인한 뒤 최신 main/동시 연이 소개 UI의 변경과 충돌 여부를 확인한다.

- 후속 타입 검증: npm run typecheck 통과(exit 0).

## 최종 CI 후속 복구
- f92218d4f CI: Pages/Worker build와 타입/lint 통과. 동시 운명섬 판매 종료 관련 3개 Jest 및 다른 문서 메타데이터 실패는 후속 main 6fb3ec71a에 이미 수정되어 이를 보존했다. 집중 Jest 125개와 handoff 문서 217개 검사 통과.
- 6fb3ec71a CI의 후속 실패: 심리테스트 개편의 네오 이미지 기대값 2곳, 22종 무료 테스트 번역 사전 누락. feature-visual-details 검사 기대값 및 shellCopy-18 저작 원본/12개 사전을 수정하고 공식 sitemap 생성기로 갱신했다. 관련 Node 검사 21개 통과. 서비스 가격/결제 동작은 바꾸지 않았다.
- 이 사이의 최신 main 4bc27458f(홈/소설 그림 변경)도 fast-forward로 보존했다.
