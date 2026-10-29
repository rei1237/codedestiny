---
status: done
handoff: prepared
implementation: partial
updated: 2026-10-29
next: 인생의 책 main 전달 5187074b7의 CI를 확인하고 연애 비책 원본 이식 검증을 마무리한다.
---

# 토스 초융합·인생의 책 구현 인수인계

이전 CI 차단은 해소했다. 모바일 뒤로가기 수정 0a83f8a49의 main CI 40889333040이 통과했고, 인생의 책을 5187074b7로 main에 전달했다. 해당 전달 CI와 연애 비책 검증을 이어 진행 중이다. 아래 차단·로컬 검증 기록은 재개 이전 이력이며 전체 서비스 출시 완료를 뜻하지 않는다.

## 재개 위치

- 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-launch-20261028`
- 브랜치: `wt/toss-miniapp-20261007-223959` (기존 동시 세션 격리, 새 브랜치/PR 금지)
- 마지막 구현 커밋: `174e5df745403c7399ca37fc19c32a26f54e39d1` (인생의 책, 로컬만)
- 직전 로컬 커밋: `644a19cbf` (초융합 SSE 응답 헤더 보존, 로컬만)
- 마지막 main 전달: `829e18a30103b01904b7d094ff2f7775bb490b73` (초융합 구현, CI 40876289034 success)
- 사용자 요청: 원본 UI/UX·주문·2단계 생성·저장·재열람·복구를 연결하고 서비스별 검증 후 다음으로 진행. 샘플/공통 상담 대체, 실결제·실 LLM·운영 DB·운영 배포 금지.

## 전달 차단

최신 원격 main `8f32da62caf4a921f23ebcc54eba4db83631e875`의 [PR CI 40877905858](https://github.com/rei1237/codedestiny/actions/runs/40877905858)가 실패했다.

- Static guards → `verify:mobile-journeys`: 430px browser back cleanup timeout. navigation surface=main인데 overflow=hidden, tarotModalOverlay 잔류.
- 829e18a30 이후 main 변경은 마케팅 문서/이미지뿐이다. 실패 원인이나 귀책을 단정하지 않는다. 해당 정적 타로 흐름은 이번 이식 변경에 포함되지 않았다.
- main이 다른 커밋에서 실패하면 그 위로 push하지 않는 저장소 규칙을 적용했다. 재실행·운영 변경·외부 수정은 실행하지 않았다.
- 다음 서비스인 연애 비책은 착수하지 않았다. 인생의 책을 main에 전달하고 CI로 검증한 뒤 이어간다.

## 구현 파일과 의도

- `worker/toss/native-fusion.js`, `worker/routes/fusion-fortune.js`, `worker/lib/fusion-fortune*.js`: 원본 2단계 생성과 SSE, 저장·복구, 검증된 토스 주문 문맥.
- `worker/toss/service-response.js`, `apps/toss/test/service-stream.test.mjs`: 라우터 JSON 기본값이 원본 stream Content-Type을 덮어쓰지 않게 보존. 진행 이벤트와 취소를 즉시 전달, 저장 결과 no-store 유지.
- `worker/toss/native-life-book.js`, `worker/routes/life-book-ai.js`: 원본 normalizer·가격표·15섹션(10장/4개 심층 해석/프레임) 생성·저장 재사용. lifeBook/lifeFortune SKU 분리 유지. 완료 빠른 반환, 부분 재개, 첫 저장 전 원주문 복구, cron까지 동일 소유자/활성 identity/환경/입력해시/환불 확인.
- `worker/lib/consultation-recovery-task.js`: 기존 cron 시간 예산 내 첫 저장 이전 토스 주문을 원래 adapter로 재개.
- `worker/lib/consultation-delivery-refund.js`: 토스 주문을 웹 결제/월정석/이용권 자동환불에서 제외. 검토 필요 결과만 반환하며 새 환불 정책이나 실제 환불을 만들지 않음.
- `worker/toss/{routes,models,native-consultation,native-tea}.js`: 토스 상품 키/라우트/주문/기록 연결. 운영 스키마 변경 작업은 실행하지 않음.
- `apps/toss/service/{Fusion,LifeBook,Screens,billing,payment-state}.jsx`, `vite-service.mjs`, `src/{main,App,UnifiedHome}.tsx`: 원본 화면과 실제 서비스별 입력/결과 진입, 토스 결제 adapter와 원본 resume 입력 연결. web gate 폴백 없음.
- `app/life-book-ai/LifeBookAiClient.tsx`: optional paymentNotice로 토스의 단건/출시 준비 문구만 전달, 웹 기본 화면 유지.
- 관련 mock/원본 동작 검사 추가. 상세 변경 목록은 위 구현 커밋의 `git show --stat` 참조.

## 검증 증거와 한계

- `node --test --test-concurrency=1 apps/toss/test/*.test.mjs`: 148/148. 외부 네트워크 차단 유지, 천문 계산 fixture의 localhost 접근 권한만 허용.
- `node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/life-book-paid-delivery.behavior.test.js`: 45/45. 원본 함수와 토스 adapter/원자적 주문 결합을 함께 사용. generator와 DB는 mock. 주문→15섹션 저장→재열람 시 추가 생성 0, 계정/환경/입력 변조/환불/비활성 계정 차단 포함.
- `node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/consultation-delivery-refund.test.mjs`: 48/48. 토스 주문이 일치하는 웹 결제를 환불하지 않음 포함.
- Jest `life-book-ai.sections.test.js`: 최신 24/24. `consultation-recovery-task.test.js`: 8/8.
- 초융합 원본 Jest 75/75, stage-flow/PDF 구조 mock 검사 통과. 상세는 `docs/toss/2026-10-29-fusion-migration-progress.md`.
- `verify:cron-mongo-op-coverage`, `verify:no-nested-retry`, `verify:worker-no-undef`, `verify:paid-access-integrity`: 통과. 관련 ESLint 오류 0, life-book 기존 미사용 경고 3건.
- `npm run build` (apps/toss): 최종 성공, build ID `01a187e3-dba3-700e-aacc-fde3b07b3327`. 로컬 .ait 파일이며 업로드·실기기·출시 증거 아님.
- visual-checker: 390/1280px 입력/결과 4화면, pageerror 0 / 깨진 이미지 0 / 가로 넘침 0. 원본 책/명식/오행/목차/전문가 리딩/도크 보존. 기존 dev `preview=success`만 사용, 실 API 호출 없음.
- 결과 상호작용: 표지 건너뛰기 → 다음 장 2/10 → 목차 ‘재능과 일의 방향’ 3/10 확인, pageerror 0. 처음 locator timeout은 버튼의 aria-label 차이로 수정했고 제품 결함은 아니었음.
- `check:fast -- --plan` 실행. `check:fast`는 확대 paid-gate-suite에서 결과 미반환 및 동시 빌드 메모리 부족으로 전체 미검증. 관련 프로세스 종료 확인 후 단독 앱 재빌드는 성공. 전체 gate 통과로 표현하지 않는다.
- 웹 메타데이터/공개 URL/사이트맵/미러 변경 없음. 출시 게이트 `SERVICE_AVAILABLE=false`, `APPROVED_TOSS_NATIVE_PRODUCTS=[]` 유지.

## 다음 행동

1. 이 워크트리의 clean 상태와 최신 origin/main CI를 확인한다. 다른 세션의 파일은 보존한다.
2. 최신 main의 위 CI 실패가 해소되면 원격 변경을 좁게 검토하고 기존 worktree에 병합, `check:pre-push` 실행. 검증된 로컬 변경만 main에 통합·push하고 해당 CI를 한 번 확인한다. 실패 중인 main 위에 push하지 않는다.
3. 인생의 책 전달 검증 후 `app/love-secret-ai/LoveSecretAiClient.tsx`, 결과 Client, `worker/routes/love-secret-ai.js`부터 연애 비책 원본 계약을 읽는다. 같은 주문·생성·저장·재열람·첫 저장 전/후 복구 기준으로 연결한다.
4. 그다음 전문가와 나머지 주요 서비스는 레지스트리에서 실제 상품/진입점을 확정한다. 후보 하나로 전체 완료라고 하지 않는다.
5. 완전 전달 전 워크트리를 삭제하지 않는다. main 체크아웃의 다른 세션 미커밋 변경과 기존 미리보기는 건드리지 않는다.

## 생성 파일·정리

전달 전 `check:pre-push`에서 원본 LifeBookAiClient 변경에 따른 sitemap-lastmod signature 드리프트가 발견됐다. `npm run sitemap:generate`로 1020 URL을 생성했고 추적 변경은 `config/sitemap-lastmod.json`의 `/life-book-ai/` signature 1건뿐이다. 날짜·URL·색인 정책은 유지됐다. 문서 커밋 후 `check:pre-push`를 재실행한다.

이 세션의 검사 로그·빌드 로그·visual-checker 캡처와 검수 서버는 정리했다. 기존 세션의 로그/미리보기와 다른 체크아웃의 미커밋 파일은 보존한다. 아직 전달하지 못한 커밋이 있어 이 워크트리는 유지한다.
