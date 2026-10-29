---
status: done
updated: 2026-10-29
next: 별도 구현 세션에서 본문의 남은 서비스 이식 작업과 검증을 이어간다.
---

# 앱인토스 주요 서비스 이식 인수인계

status: done
handoff: prepared
implementation: in-progress

인수인계 문서 작성은 완료했다. 서비스 이식이나 출시가 완료되었다는 뜻은 아니다. 이 문서를 다음 세션의 현재 상태 기준으로 사용한다. `docs/toss/2026-10-29-service-migration.md`는 시간순 작업 기록이며 아래쪽의 ‘미완료’ 문장은 당시 상태다.

## 사용자 요청과 고정 방향

영냥이와 꿀꿀운세를 하나의 앱으로 구성하되 원본 UI/UX, 입력, 결과 내용과 생성 로직, 저장·재열람까지 정확히 옮긴다. 샘플/공통 상담 화면이나 영냥이 persona 변경으로 다른 서비스를 대체하지 않는다. 품질은 원본과 같거나 더 좋아야 한다. 한 서비스를 검증한 뒤 다음 서비스를 옮긴다.

- 순서: 기존 영냥이·운명의 찻집·네오 검증 유지 → 초융합 → 인생의 책 → 연애 비책 → 전문가 및 나머지 주요 운세.
- 원본 그림·캐릭터·글꼴·책/편지/전략서 구조를 재사용한다. 꽃빛 연이, 영냥이 밤의 점술방, 네오 별도 정체성을 보존한다.
- 생선은 영냥이, 꿀단지는 연이, 작전 티켓은 네오의 결제 표시에만 사용한다. 분석 체계 이름으로 쓰지 않는다. 기존 가격·이용권·월정석·단건 결제 정책을 바꾸지 않는다.
- 개발 검증은 mock만 사용한다. 실 AI, 결제, 운영 DB 쓰기, 환불, 운영 배포, 콘솔 제출은 별도 승인/증거가 필요하다.

## 작업 위치와 전달 상태

- 재개 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-launch-20261028`
- 기존 격리 브랜치: `wt/toss-miniapp-20261007-223959`. 동시 세션 때문에 사용 중이다. 새 브랜치/PR을 만들지 않는다.
- 마지막 구현 커밋: `1beec454f48f192bde41e9c9243aae9350324df2` — main push 완료.
- 문서 작성 전 main 기준: `dc59841a2163281594a3bcfa3aae6621b5ce1d5b`. 추가 변경은 마케팅 문서뿐이며 현재 작업에 반영했다.
- 해당 구현 CI: https://github.com/rei1237/codedestiny/actions/runs/40852318349 — 인수인계 조회 시 진행 중. 후속 main CI 40852838526도 진행 중이었다. 성공으로 표현하지 않는다.
- 시작 시 `git -c core.fsmonitor=false status --short`, 원격 main/CI를 확인한다. 다른 세션 변경을 reset/stash/clean하지 않는다. main이 실패하면 원인 로그부터 확인한다.
- 사용자가 보는 로컬 빌드: http://127.0.0.1:4318/neo-operation-room/result/ . 재시작/컴퓨터 종료 후 유지된다고 보장하지 않는다. 4317 dev와 다른 실행본이다.
- 이 워크트리는 후속 구현과 사용자의 로컬 검수에 필요하여 보존한다. 인수 세션이 실제 이식 작업을 끝내고 미커밋/미전달 내용 및 실행 중 미리보기를 확인한 뒤 배수한다.

## 현재 구현과 증거

| 대상 | 코드 상태 | 검증 한계 |
|---|---|---|
| 영냥이 | 원본 입력/Checkout/Result/Library와 canonical API 연결 | 로컬·mock 증거. 실제 토스 결제/실기기 출시 증거 아님 |
| 운명의 찻집 | 원본 카드 선택·편지·추가 질문·저장/복구 연결, native-tea 사용 | 동일 |
| 네오 | 원본 5단계 입력·14부분 결과·2회 현실 점검·전략서·보관 연결 | 동일 |
| 초융합 | 실시간 응답 전달 기반만 보완 | 화면·전용 주문·생성/저장 연결 미구현 |
| 인생의 책·연애 비책·전문가 | 다음 대상 원본 경로 확인 | 이식 완료 주장 금지 |

- 최근 `node --test --test-concurrency=1 apps/toss/test/*.test.mjs`: 140/140 통과. 스트림이 닫히기 전 checkpoint 수신, 취소 전파, 403 JSON, 204 응답 포함.
- `npx eslint worker/toss/service-response.js worker/toss/routes.js`: 통과. `npm run check:pre-push`: 통과.
- 이전 원본 네오 72/72, 찻집 109/109, 안내 화면/복구 6/6. 최근 통합 홈 12/12(11개 언어 포함). 상세 기록은 이식 작업 문서 참고.
- `check:fast` 전체 성공으로 표기하지 않는다. 이전 확대 검사에서 paid-access-integrity 한 건 실패 후 미사용 claimEvidenceIds 빈 배열을 제거하고 해당 검사/관련 7개는 통과했다. 최신 스트림 변경은 계획 확인·토스 targeted 검사·pre-push를 수행했다.
- 앱 마지막 UI 빌드 ID `01a186f9-329e-7ac6-8b53-d03bd9bac630`: 네오 안내 이미지 교체 포함. 이후 서버 스트림 변경의 신규 앱 번들 빌드 증거는 없다.
- 320/390/1280px 네오 안내 가로 넘침/깨진 이미지 없음, CTA 50px·원본 입력 화면 이동 확인. 실제 획득 휘장은 유지하고 오류/준비 화면의 전체 sprite sheet만 단독 안내 그림으로 교체했다.

## 다음 작업: 초융합 한 서비스 완결

1. 원본 계약부터 읽는다: `app/fusion-fortune/page.tsx`, `FusionFortuneClient.tsx`, `SavedFusionReading.tsx`, `FusionResultThread.tsx`, `FusionVisualization.tsx`, `FusionResultRail.tsx`, `FusionResultDock.tsx`. page의 SEO본문/ValuePreview/ExpertGuide를 누락하지 않는다.
2. 서버는 `worker/routes/fusion-fortune.js`, `worker/lib/fusion-fortune-consultation.js`, `worker/lib/fusion-fortune-recovery-task.js`를 추적한다. `buildFusionFortunePaidAccessResolver`, `assertFusionDeliveryAccess`, `persistFusionDelivery`, `runFusionFortuneDeliveryStage`의 권한과 저장 경계를 연결한다. 별도 영냥이 `fusion-book`은 다른 상품이다.
3. `worker/toss/native-neo.js`, `native-tea.js`, `native-consultation.js`, `native-context.js`, `models.js`를 참고해 원본 입력을 고정한 native fusion intent와 원주문을 원자적으로 결합한다. 클라이언트가 제출하는 결제 설명/헤더로 권한을 만들지 않는다.
4. 원본 2단계 생성과 SSE status/ping/stage/checkpoint/result/complete/error를 유지한다. `worker/toss/service-response.js`로 Response.body를 직접 전달한다. `response.text()`로 전체를 버퍼링하거나 JSON으로 바꾸지 않는다. 비동기 stream callback도 원본 요청의 검증된 문맥을 유지해야 한다.
5. 첫 checkpoint 전 중단, partial 저장, 재개, cron 복구에 동일 주문·활성 계정·환경·입력 해시·파트너 환불 증빙을 적용한다. 원본 cron projection에 native marker가 없을 수 있으므로 소유 저장본을 다시 읽는다. 완료 결과와 재시도 빠른 반환도 환불 확인을 건너뛰지 않는다.
6. 입력에서 `useCoinGate`의 `resume.args.body`와 requestId가 전달된다. 기존 `apps/toss/service/billing.jsx`는 찻집/네오 분기만 지원하므로 초융합 호출 경로를 실제로 연결해야 한다. 웹 결제/JWT로 폴백하지 않는다.
7. 출시 진입은 `apps/toss/service/Screens.jsx`, `src/main.tsx`, `service/vite-service.mjs`; API는 `worker/toss/routes.js`, 보관함은 `native-tea.js`의 nativeTeaRecords를 확인한다. 이름만 바꾸거나 기존 상품을 중복 노출하지 않는다.
8. 여섯 체계/통합 해석, 원본 8개 분야 장, 시각화·독서 이동·PDF·저장된 원문을 보존한다. 저장 완료 전 성공 표시, 재열람 시 재과금/재생성 금지.
9. 원본 handler를 사용하는 오프라인 통합 검사로 입력→승인 주문→2단계 생성→저장→추가 생성 없는 재열람을 검증한다. 계정/환경 불일치, 변조, 환불, 카탈로그 제거, 네트워크 단절, 중복 요청을 포함한다. 그 후 앱 빌드와 모바일/데스크톱 실제 렌더를 확인한다.

## 후속 서비스 원본 위치

| 순서 | 입력/결과 | 서버 |
|---|---|---|
| 인생의 책 | `app/life-book-ai/LifeBookAiClient.tsx`, `LifeBookAiRouteClient.tsx`, `result/LifeBookAiResultClient.tsx` | `worker/routes/life-book-ai.js` |
| 연애 비책 | `app/love-secret-ai/LoveSecretAiClient.tsx`, `LoveSecretAiRouteClient.tsx`, `result/LoveSecretAiResultClient.tsx` | `worker/routes/love-secret-ai.js` |
| 전문가 후보 | `app/master-love-codex/MasterLoveCodexRouteClient.tsx`, `result/MasterLoveCodexResultClient.tsx`, `app/components/expert-consulting/` | `worker/routes/master-love-codex.js` |

‘전문가’는 여러 상품을 포함할 수 있다. 레지스트리의 실제 사용자 진입/상품 키를 확인해 목록을 확정한다. 위 후보 하나를 전문가 전체로 간주하지 않는다. 그 밖 사주 풀이/타로/점성술 등은 레지스트리→호출부→원본 결과 순으로 좁혀 추가하고, 서비스별 위 9단계 증거를 남긴다.

## 출시 게이트와 마무리

현재 `apps/toss/src/release.ts`의 SERVICE_AVAILABLE=false, `worker/toss/catalog.js`의 APPROVED_TOSS_NATIVE_PRODUCTS=[]를 직접 확인했다. 승인 SKU·가격 근거·콘솔 검수·실기기 로그인/구매/복구 증거 없이 판매를 열지 않는다. 사용자가 다른 경로로 콘솔 로그인했다고 했지만 이 세션에서 승인 상태를 확인한 증거는 없다. 비밀값을 출력하지 않는다.

단위마다 check:fast 계획/해당 검사→작은 커밋→check:pre-push→main push. CI는 다음 push 또는 최종 보고 직전 한 번 확인하고 폴링하지 않는다. 실패는 로그의 실제 원인만 수정한다. 생성 미러와 사이트맵은 생성기로 갱신한다. main push를 운영 배포/앱인토스 출시로 표현하지 않는다.

## 최신 후속 인수인계

2026-10-29 초융합 main 전달·CI 통과와 인생의 책 로컬 구현/검증을 진행했다. 최신 main의 별도 모바일 여정 CI 실패로 후속 전달이 차단되어 `docs/handoff/2026-10-29-toss-fusion-life-book-ci-blocked.md`를 최신 재개 기준으로 사용한다. 이 문서 위의 초융합 미구현 표는 이전 시점 기록이다.
