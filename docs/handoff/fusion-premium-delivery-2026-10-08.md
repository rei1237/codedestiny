---
status: done
handoff: completed
date: 2026-10-08
updated: 2026-10-08
next: 운영 배포 실행 링크와 최종 채팅의 프리미엄 main CI 결과를 참조한다. 고객 재생성·추가 차감 금지.
---

# 초융합 유료 전달 안정화와 프리미엄 경험 후속 작업

아래 최초 인수인계 이력에 이어 2026-10-08 프리미엄 구현을 완료했다. 고객 복구는 반복하지 않았다.

## 후속 구현 완료 기록 — 2026-10-08

- 배포 전 코드 CI: `13db6be3cce956553975fd7178521277709cdc55`, [37650520852](https://github.com/rei1237/codedestiny/actions/runs/37650520852) 성공. 추가 문서를 포함한 main `7c24969afa4d32320b42b0231a317d97545b0204`의 [CI required](https://github.com/rei1237/codedestiny/actions/runs/37652391966) 성공도 확인했다.
- **기존 승인된 production 1회를 사용했다.** 7c24969a 대상으로 [운영 배포 37652638853](https://github.com/rei1237/codedestiny/actions/runs/37652638853)을 dispatch했다. 저장소 규칙에 따라 실행 이후 배포를 폴링하지 않았으므로 이 기록은 운영 완료 확인이 아니다. 중복 dispatch하지 않는다.
- 그 이후 전달하는 프리미엄 커밋: `4f45ff114` 공감 프롬프트, `4b6604675` 실제 단계 연동 융합 장면·서체 위계·기존 챕터 삽화·첫 챕터 접기. 이번 production 실행에는 이 프리미엄 커밋이 포함되지 않는다.
- 결과/보관함 공통 렌더러와 PDF 본문 계약, 실제 계산/가격/결제/인증/DB 구조 유지. 새 LLM·실결제·운영 DB 쓰기 0. 고객 재생성 및 추가 차감 0.
- mock 전문가/단계/재열람/PDF/전달 하한, UI·복구 27개, 타입·변경 ESLint 통과. 접기 수정 후 관련 UI 22개 재검사 통과(중복 합산 금지). `check:fast` 계획은 완료했으나 88개 전체 검사 실행은 정체로 중단했으므로 전체 통과로 보고하지 않는다.
- 시각 검수: 360/390/430/1280px, 22개 시나리오·45캡처, 페이지 오류/넘침 0, 완료/보관함 생성·결제 POST 0. 움직임 정지·reduced-motion·키보드 접기/목차 이동 확인. 서체는 로컬 CORS 보정 mock 렌더와 운영 Origin의 정적 CORS HEAD 확인을 구분한다.
- 결정·자산/PDF 정책: [fusion-premium-reading.md](../design/fusion-premium-reading.md). 검수 파일: `C:/Users/user/.codex/visualizations/2026/10/07/01a11719-1e75-7973-a61c-6e5f50a2e875/fusion-premium/`.
- 프리미엄 변경의 최종 main SHA와 exact-SHA CI는 최종 채팅에 남긴다. 새 운영 승격은 별도 요청 범위다.

이하 내용은 최초 인수인계 시점의 이력이다.

## 사용자 요청과 승인

- 결제/Family 이용권 사용 후 30분 이상 초융합 결과를 받지 못한 고객을 복구하고 운영 배포한다.
- 유료 LLM은 완성된 부분을 먼저 저장하고 누락 부분만 재개한다. 과도한 분량·형식 기준으로 유효한 원문을 버리지 않는다. 보관함에서 추가 차감/생성 없이 재열람한다.
- 각 운세의 기존 계산 엔진과 전문 근거를 유지하며 챕터·중복 분량을 최적화한다. 영냥이 모둠·초융합과 공통 LLM 캐시/재시도도 점검한다.
- 마지막 추가 요청: 최고 프리미엄 라인에 맞는 생성 중 융합 효과, 고급스럽고 깔끔한 결과 서체, 중간 이미지, 고민에 공감하는 품질의 콘텐츠.
- 운영 배포 1회는 사용자가 명시 승인했다. 작성 시점에는 아직 사용하지 않았다. 재개 전에 **이 채팅의 최종 응답과 Actions의 production 실행 이력**을 확인하여 중복 승격하지 않는다.
- 특정 고객 1건의 기존 입력을 Google Gemini로 보내 생성하고 운영 결과에 저장하는 별도 승인은 받았고 이미 실행/완료했다. 이 승인을 다른 고객·새 실호출·추가 과금으로 넓히지 않는다.

## 고객 복구 — 실제 운영 확인 완료

- 해당 Family 구매 증빙과 소유권을 대조했고 원본 계산 스냅샷을 사용했다. 개인정보·질문·결과 원문·고객 식별자는 이 문서에 복사하지 않는다. 결과 링크는 원래 채팅에 전달했다.
- 처음에는 서양점성술만 저장됐고 나머지 다섯 체계의 2회 시도 한도가 소진돼 있었다. 당시 제공사 실패 로그가 없어 각각의 최초 실패 사유는 확정하지 않았다.
- 기존 점성술 원문을 보존하며 누락된 체계와 종합/행동/판정을 완성했다. 활성 생성 락은 만료될 때까지 기다렸고 탈취하지 않았다.
- 완료 시각: **2026-10-07 14:56:40.564 UTC**. 여섯 체계 및 최종 판정 존재, `completed`, `expertMeta.complete=true`.
- 실제 소유자에 대한 공용 `readRecord`를 호출하여 보관함 조회 성공을 확인했다. 고객 로그인 화면의 실기기 검증을 했다는 뜻은 아니다.
- 복구 전후 이용권 사용량 동일. 원래 저장본 보존 확인. **이 고객을 다시 생성하거나 차감하지 않는다.**

## 이미 main에 반영한 변경

1. `2e4f67604` — 초융합 생성/재시도/보관함
   - `worker/lib/fusion-fortune.js`: 요청당 최대 두 미완성 그룹, 즉시 체크포인트 저장, 이미 유효한 그룹 재생성 없음. 짧아도 근거/필수 구조가 유효하면 보존·전달하고 품질 고지를 유지한다.
   - `fusion-fortune-prompt.js`, `fusion-expert-contract.js`: 실제 계산 근거 경로만 스키마에 제공하고 경로/enum 표현을 정규화한다. 과도한 고정 분량 대신 체계별 역할·조건·행동·공감을 지시한다. 새 전문가 목표는 기존 3만~6만자 강제가 아니다.
   - `fusion-fortune-consultation.js`, `routes/fusion-fortune.js`: 원래 구매와 저장된 입력으로 명시적 재시도. 시도 수를 초기화하지 않고 1회 한정 추가 허용(그룹당 총 4회). 소유권/유효 락/취소 증빙 검사 유지.
   - `fusion-fortune-recovery-task.js`: 기존 서버 주기에서 저장 진전이 있으면 시간 예산 안에서 다음 묶음을 이어 간다. 소유자별 순환, 실행 시간/시도 한도 유지. 새 cron/무한 재시도 없음.
   - `FusionFortuneClient.tsx`: 소진 후 무의미한 대기 반복 중단, 상단 재개 버튼, 저장된 체계를 진행률에 포함.
   - `SavedFusionReading.tsx`, `StoredReading.tsx`: 보관함에서도 초융합 고유 결과/목차/읽던 위치 사용. 사주만 없는 부분 결과도 다른 저장 체계를 읽을 수 있다.
   - `fusion-thread.tsx`, CSS, `FusionResultDock.tsx`: 본문 폭, 간격, 모바일 조작 영역, 데스크톱 목차 배치 개선. 큰 장식 오브를 기존 진입/결과 헤더에서 제거했으나 사용자는 이후 **실제 생성 상태와 연동된 고급 융합 연출**을 명시 요청했다. 제거된 구성을 그대로 되돌리는 것으로 끝내지 않는다.
2. `b0104c434` — 영냥이 모둠/초융합의 새 구매 목차
   - `reading-manifest.ts`, `reading-policy.ts`, `reading-sections.ts`, `payments/catalog.ts`, `service.ts`.
   - 새 `fusion-book-v1`: 모둠 9장/전체 융합 12장, 예방 장 포함 실제 10/13장. 독립 해석 후 주제별 비교/차이/행동으로 이어진다. 계산/`factSelectors` 재사용.
   - 기존 구매에 저장된 v5/v6/v7 목차·원문은 변경하지 않는다. 새 버전은 준비 요청 지문에 포함한다.
3. `c79947793` — 공통 LLM 캐시
   - `lib/llm-cache.ts`: mock, 잘린 본문, 깨진 JSON은 재사용/저장하지 않는다. 새 응답은 호출자에게 돌려 로컬 교정 기회를 보존한다.
   - `worker/lib/llm-cache-store.js`: Mongo TTL 청소 전이라도 만료/유효기한 누락 항목은 cache miss.
   - 기존 `paid-narrative-delivery`, adapters, recovery task, local candidate repair를 읽고 모의 회귀 검증했다. 모든 서비스의 실제 유료 호출을 실행했다는 뜻은 아니다.

가격·달빛 이용권·월정석·단건 결제 정책, 인증 정책, DB 스키마는 유지했다. 전달/재시도 API 로직은 요청에 따라 수정했다.

## 검증 및 전달 이력

- `npm run check:fast -- --plan`, `npm run check:fast` 실행. 초기 전체 검사에서 새 목차/품질 정책과 예전 고정 단언의 불일치 발견, 해당 검사들을 갱신하고 개별 재실행 통과. 최초 check:fast 자체가 성공했다고 보고하지 않는다.
- `npm run lint`, `npm run typecheck`, `npm run verify:release` **통과**. verify:release는 통합 main 기준 로컬 mock/Worker dry-run이며 운영 배포가 아니다.
- 초융합/저장/캐시 Jest 147개 통과, 서버 주기 내 연속 복구를 추가한 route suite 64개 통과(중복 포함, 합산 금지).
- 공통 유료 재시도 Jest 68개, 캐시/목차 Node 27개, 문단 6개, 수정된 신년 예방 9개 통과.
- `verify-fusion-expert`, `verify-fusion-fortune-delivery-floor`, `verify-fusion-fortune-stage-flow` 모의 검사 통과.
- visual-checker: 360/390/430/1280px, 수정 후 50장, 가로 넘침/페이지 오류 없음. 완료/보관함 재열람에서 생성·결제·차감 POST 0회. mock-only. impeccable detect `[]`.
- 소스 전달: `876df3da04fb71f795647c116ad08290cec4ef76`에 합쳐 main push. 이후 다른 세션의 신년 검사 수정 `6263c402c6fd22466a9b2a000d0fabd27e70bc72`까지 통합.
- CI `37643529787`: 빌드/critical/타입·린트 통과, 다른 세션의 신년 개수 검사 실패. 이는 6263c402c에서 수정됐다.
- CI `37644085874`: 빌드/critical/타입·린트 및 Node 2984개 통과. 정적 검사 후반 `verify:sitemap-drift`의 **원장 signature 갱신 누락** 실패. 현재 작업에서 `npm run sitemap:generate`로 정본/미러/원장을 재생성하고 이 문서와 함께 전달한다. 최신 SHA의 CI를 다시 확인해야 한다.
- **운영 승격 상태는 이 문서 작성 이후 달라질 수 있다. 최종 채팅의 실행 URL을 우선 확인한다.** 저장소 규칙은 production dispatch 뒤 런을 폴링하지 않고 URL을 전달하는 것이다.

## 다음 구현 — 프리미엄 생성/결과 경험

1. **생성 중 융합 장면**: 여섯 체계가 자신의 계산/해석을 마친 뒤 중심의 종합으로 합류하는 시각적 흐름. `stageStates`, 저장된 `result.*Section`, `composeProgress`를 진실로 삼는다. 시간으로 가짜 완료율을 올리지 않는다. 이미 도착한 본문은 바로 읽게 하고 애니메이션 종료를 기다리지 않는다. reduced-motion/백그라운드/재시도 상태 지원.
2. **타이포그래피와 편집 리듬**: 현재 `.reading`은 자체 호스팅 나눔명조/Cinzel 계열, 크롬은 Pretendard, `font-display`는 Mulmaru다. 실제 로딩/한글 fallback과 제목·본문 혼합을 먼저 측정한다. premium 제목과 본문/근거/요약의 위계를 정리하고 과한 pill·말풍선 인상을 줄인다. 글자 축소로 해결하지 않는다.
3. **중간 이미지**: 체계별 도입/교차 종합/마지막 메시지 사이에서 숨 쉴 공간을 만든다. 장식은 운세 근거로 오인시키지 않는다. 기존 `public/images/fusion-fortune/`와 `fusionOrbs.ts` 자산부터 검토한다. 타로 오브는 현재 image=null이다. 새 이미지를 쓰면 모바일 크기/지연 로딩/비율/alt/PDF 포함 여부를 정한다. 생성 중 새 이미지 LLM 호출 금지.
4. **공감의 품질**: 사용자 고민의 구체적 선택/감정 → 계산 근거 → 강점과 부담 → 현실적 행동으로 연결. 모든 사용자에게 같은 위로를 반복하거나 새로운 미래 사실을 만들지 않는다. 기존 저장본에 문장을 추가하려고 재생성하지 않는다. 프롬프트 변경은 새 생성과 실제 누락 챕터 복구에만 적용한다.
5. **동일한 결과 경험**: `FusionResultThread`를 중심으로 새 결과/보관함/공유·PDF의 계약을 유지한다. `data-fusion-pdf-section`, 접힘 강제 해제, 내보내기 중 모션 정지 보존.

시작 파일: `app/fusion-fortune/FusionFortuneClient.tsx`, `FusionResultThread.tsx`, `fusion-thread.tsx`, `fusion-fortune.module.css`, `SavedFusionReading.tsx`, `_lib/copy.ts`, `_lib/expert-labels.ts`; 내용은 `worker/lib/fusion-fortune-prompt.js`.

읽을 규칙: `CLAUDE.md`, `docs/context/design-canon.md`, `DESIGN.md`; impeccable context를 새 세션에서 1회, 관련 playbook + craft-floor. 디자인 정본은 화면 판정을 visual-checker에게 맡기도록 한다. 본 세션 에이전트는 서버/브라우저를 종료했으므로 다음 세션에서 mock 프리뷰를 새로 시작한다.

검수 아티팩트(고객 원문이 없는 모의 화면):
- `C:\Users\user\.codex\visualizations\2026\10\07\01a116b8-cb27-7c10-b9c7-1871ed52d4a2\fusion-delivery-20261008\mobile-library-mock.png`
- 같은 폴더의 `desktop-result-mock.png`.

## 재개 순서 / 종료 처리

1. `D:\Development\code-destiny`에서 git status/현재 main/원격 SHA 및 마지막 응답의 CI·배포 링크를 확인한다. 현재 main에 이미 합쳐진 기능을 재구현하거나 고객 복구를 반복하지 않는다.
2. 미통과 CI가 남으면 정확한 실패 단계만 고친다. 성공한 로컬 전체 검사를 반복하지 않는다. 최종 공식 게이트는 exact-SHA `CI required`.
3. 추가 프리미엄 경험을 구현하고 mock으로 전체 흐름·모바일/데스크톱·키보드·reduced-motion·보관함 무과금 재열람을 확인한다.
4. 동시 세션이 없으면 main 직접 작업; 둘 이상이면 `scripts/create-safe-worktree.ps1`. PR을 만들지 않는다. commit/push/main CI. 운영 승격은 위 1회 승인의 사용 여부를 먼저 확인한다.
5. 이 세션 전용 worktree `fusion-delivery-hotfix-20261007-231951`와 scratch는 완료 보고 전에 배수한다. 다른 세션의 untracked 파일/문서/워크트리는 그대로 둔다.

보존할 다른 세션의 현재 미추적 항목: `.claude/skills/fire-your-seo-agency/`, `i18n/authored/home-01.json`, `marketing/campaigns/2026-10-05/v3/official-posted-DeGgUwnDcjr.png`, `neo-briefing-390.png`, `output/`.
