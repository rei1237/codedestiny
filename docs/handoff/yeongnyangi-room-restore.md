---
status: active
updated: 2026-09-16
next: 원본 멸치 무료 운세 16종을 MongoDB 기반으로 영냥이 방에 복원하고 상담 선택 화면의 원본 보라색 디자인을 복구한다. DB 보호 수정 CI/스테이징 검증 후 전체 수정본을 승격한다.
---

# 영냥이 방 복원 및 Mongo 통합 마무리

## 가장 최신 사용자 지시 — 먼저 읽을 것

2026-09-16 추가 요청:
- 원래 영냥이의 방에 있던 **멸치 무료 운세**가 사라졌다. 방 안에서 실제로 다시 이용할 수 있게 복원한다.
- `/yeongnyangi/fortune/`의 현재 크림색/흰색 선택 화면은 사용자가 요청한 디자인이 아니다. **원본 메인의 짙은 보라색·금색·아이보리 톤과 서체/자산에 맞게 복구**한다.
- 메인 자체의 원본 디자인은 그대로 유지한다. 단순 CSS 색상만 바꾸고 끝내지 말고 선택·입력·오류·로딩·모바일/데스크톱까지 일관되게 확인한다.
- 작업이 길어지면 이 문서로 다른 세션에서 이어간다. **현재 작업은 미완료이며 최종 승격을 보류했다.**
- 과거 SoulCat D1 데이터는 테스트뿐이므로 이관하지 않아도 된다. 신규 운영 데이터는 CD MongoDB가 정본이어야 한다.
- 실제 결제/환불/유료 LLM 호출은 승인 없이 금지. 테스트 fixture로 검증한다.

첨부한 반례 이미지: `C:\Users\user\AppData\Local\Temp\codex-clipboard-ce18d85d-b3ec-4620-803e-3dbb5367b753.png`.

## 먼저 읽을 문서

1. `docs/handoff/yeongnyangi-integration.md` 전체 — 최초 인수인계. D1 유지안은 사용자 Mongo 단일화 지시로 폐기됐다.
2. `docs/handoff/yeongnyangi-mongodb-integration.md` — 구현/검증/초기 운영 릴리스 증거. 초기 릴리스 완료를 최신 요청 완료로 해석하지 않는다.
3. 이 문서 — 최신 요구, 발견된 회귀, 재개 순서.

## 현재 작업 위치와 Git

- main: `D:\Development\code-destiny`
- 기존 작업 worktree: `D:\Development\codedestiny-worktrees\yeongnyangi-mongo-20260915-233146`
- branch: `wt/yeongnyangi-mongo-20260915-233146`
- 마지막 기능 수정 main SHA: `5072d87df97070e95a63173159f6d79bb37f3652` (`fix(yeongnyangi): guard Mongo payment transactions`).
- 해당 커밋은 push 완료. worktree에는 main 동기화용 merge와 같은 내용의 중복 커밋이 있으므로 **worktree 브랜치 전체를 main으로 무턱대고 merge/push하지 않는다**. 새 검증 변경만 main에 전달한다.
- main에는 다른 세션의 사주 UI/콘텐츠 및 marketing 미커밋/스테이징 변경이 있다. reset/restore/stash 금지, 해당 변경을 우리 커밋에 포함하지 않는다. `git commit --only -- <의도한 파일>`로 타 세션 index를 보존할 수 있으나 먼저 대상 파일이 깨끗한지 확인한다.
- worktree의 node_modules는 main junction, env 파일은 hardlink다. 수정/재귀 삭제하지 않는다.

## 1. 멸치 무료 운세 회귀 — 원인 확인 완료, 복구 아직 미구현

현재 `app/yeongnyangi/_original/Room.tsx`의 `#daily`는 `/today/` 링크뿐이다. 통합 과정에서 원본 `DailyWords`를 대체해 기능이 사라졌다. **다른 무료 페이지 링크로 바꾸는 것으로 복구 완료라고 하지 않는다.**

원본 정본 파일 (읽기 전용 참고; 해당 별도 앱을 다시 운영하지 않는다):
- `C:\Users\user\Desktop\SoulCatProject\src\components\DailyWords.tsx`
- `C:\Users\user\Desktop\SoulCatProject\src\components\YeongnyangRoom.tsx`
- `C:\Users\user\Desktop\SoulCatProject\src\components\free-fortune.css`
- `C:\Users\user\Desktop\SoulCatProject\src\data\free-fortune.ts`
- `C:\Users\user\Desktop\SoulCatProject\server\fortune\free\attendance.ts`
- `C:\Users\user\Desktop\SoulCatProject\server\fortune\free\readings.ts`
- `C:\Users\user\Desktop\SoulCatProject\server\fortune\free\{kusei-calc.ts,meihua-calc.ts,numerology.mjs,dangsaju-data.json}`
- `C:\Users\user\Desktop\SoulCatProject\server\api.ts` — 원래 attendance/free/unlock/free/reading 계약.

실제 원본 정책:
- 한국시간 날짜 기준 하루 출석 1회 → 멸치 1마리.
- 멸치 1마리 → 오늘의 16종 전체 개방. 이미 열었으면 다시 차감하지 않는다.
- 남은 멸치는 누적. 같은 날 처음 읽은 결과/입력은 고정되고 재조회 가능.
- 과금·LLM 호출 없이 계산과 고정 해설로 제공.
- 이것은 **무료 출석 보상**이다. 유료 28상품의 결제 화폐나 크레딧으로 사용하면 안 된다. 유료 상품은 여전히 PG 단건 결제만.

복구 구현 방향:
- CODE DESTINY User/ProfileCard/authFetch/requireUserFromRequest 공유. 별도 로그인/프로필 DB 금지.
- D1 SQL과 SoulCat API 호출을 그대로 복사하지 않는다. Mongo에 사용자별 출석/잔액/일별 개방 상태와 결과를 안전하게 보관한다. 기존 collection 사용 가능성부터 확인, 필요한 최소 collection만 추가.
- 출석 중복, 일별 개방 중복, 잔액 음수, 날짜 경계, 동시 요청, 타인 접근을 서버 조건부 갱신/유니크 키 또는 트랜잭션으로 보장. 트랜잭션은 기존 DB 보호 장치 안에서 실행.
- 기존 free readings의 vendor imports는 CD 실제 엔진/공통 함수로 연결한다. 특히 숙요 관계 계산은 이번에 수정된 CD 정본 사용. 지원하지 않는 계산을 LLM이나 임의 점수로 메우지 않는다.
- 원본 멸치/표정 이미지의 실제 경로를 확인해 `/assets/yeongnyangi/` 정식 자산으로 연결한다. 새 독립 서비스 URL이나 D1 binding을 복구하지 않는다.
- 방 `#daily`에서 출석→멸치 건네기→16종 선택→프로필/질문→읽기→새로고침 복원까지 유지한다. 무료와 유료 CTA를 명확히 구분.

## 2. 선택 UI 디자인 회귀 — 원인 확인 완료, 복구 아직 미구현

- 화면: `/yeongnyangi/fortune/`
- 소스: `app/yeongnyangi/_components/Consultation.tsx`, `app/yeongnyangi/yeongnyangi.module.css`, `app/yeongnyangi/layout.tsx`.
- CSS `.page`의 `background:#fff9ed`, `.form/.fishes`의 흰 배경이 첨부된 회귀 화면의 원인이다.
- 승인된 원본: `app/yeongnyangi/_original/FortuneHome.tsx`, `original.css`, `room.css`.
- 원본 tokens: night `#211432`, deep `#18132b`, surface `#2c1c40`, violet `#7541ad`, gold `#e9c78d`, ivory `#fff3e2`, muted `#c7b5ce`.
- 서체: `Yeongnyangi Myeongjo`, `Yeongnyangi Noto` (original.css에 실제 폰트 선언).
- impeccable 스킬의 기존 방향 유지 규칙을 적용. 새 디자인 세계관을 만들지 말고 원본에 맞춰 복구한다. 영냥이 메인 자체는 바꾸지 않는다.
- 선택/입력/결과/보관함이 동일 CSS module을 쓰므로 적용 범위를 확인하고 대비/disabled/error/focus 상태도 함께 정리한다. 결제 금액/상품 수/정책/서버 검증은 변경하지 않는다.
- 모바일 390 및 데스크톱을 한 묶음으로 검사하고, 필요 수정 한 번 후 확인한다. 무한 시각 QA를 하지 않는다.

## 3. Mongo 추가 검증과 알려진 문제

28 유료 상품 통합은 이미 구현됐으며 자세한 내용은 Mongo 통합 문서를 참고한다.

추가 실제 Worker→Atlas QA에서:
- 동시 두 활성화는 모두 200, 결제 증빙 소비와 PAID 연결은 원자적으로 정상.
- 초기 2회에서 바로 뒤 조회가 503 SERVICE_UNAVAILABLE. fixture 정리는 성공.
- 이후 5회의 전체 시나리오 및 별도 연속 조회 10회는 성공. 1회는 로컬 HTTP ECONNRESET(Worker 503과 구분).
- tail의 23/24개 이벤트 관찰에서는 5xx/예외 0. 짧은 auth 부가 작업 timeout1000ms 및 완료된 요청 컨텍스트 관련 경고가 있었다. **최초 503의 정확한 실패 로그는 포착하지 못해 단일 원인 확정 불가.**

확인한 코드 결함과 수정 (`5072d87df`):
- `worker/yeongnyangi/repository.js` attachPayment 트랜잭션이 shared Mongo active operation 회계 밖에 있어 이웃 요청이 연결을 교체할 수 있었다.
- 전체 session 생성/트랜잭션/endSession을 기존 `withMongoRetry` 안으로 이동. read/create의 중복 connectDb 제거.
- 새 fallback, 무조건 성공, timeout 확대는 넣지 않았다.
- 테스트에서 session 생성/종료 중 active operation 등록을 검사. 실패 시 결제 증빙 rollback, 중복/타인/금액 검증 유지.
- 이 수정이 최초 간헐 503의 단독 원인이었다고 확정하지 않는다. **수정본 배포 후 Worker QA 재실행 필요.**

검증 완료:
- `npm run check:fast`: exit0, Jest 273 suites / 3789 tests PASS, type/lint/static/Worker dry-run PASS.
- repository + transaction-budget: 15 tests PASS.
- 실제 Atlas 28상품 원자 활성화/소유자/금액/중복/실패 복구/결과 복원 및 fixture cleanup PASS.
- 엔진/상품 35계약 PASS, 최신 숙요 27거리 역할 검증 PASS.

재현 스크립트:
- 새 tracked `scripts/verify-yeongnyangi-worker-mongo-staging.mjs --staging-fixtures`: 실제 staging Worker HTTP + 실제 staging Atlas, 결제 proof fixture만. 절대로 실제 generation/PG API를 호출하지 않도록 URL allowlist가 있다. fixture 정리 포함.
- `$env:YN_READ_REPEATS='10'`을 설정하면 PAID 재조회 추가 검사. 검사 후 해당 env 해제.
- `scripts/verify-yeongnyangi-mongo-staging.mjs --staging-fixtures`: Node repository→staging Atlas 28상품.
- `scripts/verify-yeongnyangi-browser.mjs --staging-fixtures`: API/결제/LLM 브라우저 fixture.
- `build-cache/yeongnyangi-staging-tail-diagnostic.mjs`: 95초 staging tail, 비밀/식별자 마스킹. 원시 private log를 그대로 출력/커밋하지 않는다.

## 4. 배포 상태 — 혼동 금지

- **현재 운영**: `63725c95e8752d70ef441eab393834215f380542` (초기 native 통합).
  - 운영 release `35046821771` success.
  - Pages `a9bfb9ec-13b7-48dd-bbed-16ebb8a16a74`, Worker `a7c61f20-1675-4625-b6c6-78fbd20bbc89`.
  - 28상품 enabled/available true, 실제 계정 login/me/profile/requests 조회 PASS, 비과금 모바일 smoke/tail PASS(이전 문서에 정확한 범위).
  - 크림색 선택 UI와 멸치 기능 누락이 **현재 운영에 남아 있다**. 최신 사용자 요구까지 완료했다고 보고하면 안 된다.
- Mongo guard main SHA `5072d87df97070e95a63173159f6d79bb37f3652`: push 완료, 문서 작성 시 CI/스테이징 진행 중.
  - PR CI `35051209063`: Static guards 실패. job `104651853218`의 실제 로그에서 `verify-public-mirror-fresh`가 index.html, js/core/index-inline-runtime.js와 public 대응본 총9개의 미러 불일치를 보고했다. 바로 앞 동시 숙요 변경 `2b27a7e3b`/`2751b609a`와 관련된 생성물로, main의 같은 파일들은 다른 세션의 사주 UI 작업이 staged 상태다. 그대로 덮어쓰지 말고 최신 커밋/작업 상태를 확인해 sync:public 결과를 소유 작업과 합쳐 전달해야 한다. Critical checks 및 Typecheck/lint는 success; Build는 작성 당시 진행 중. 실패를 해결하기 전 production 승격 금지.
  - staging workflow_dispatch `35051214318`, 같은 SHA의 후속 예약 `35051277093` (진행 상태는 재조회).
- 앞선 SHA `3a306d1828fd524ed6ac3aabdd61402eb9086883` full CI `35049298153` success, staging `35048909089` success. 이것을 guard 수정본 검증으로 사용하지 않는다.
- **이번 UI/무료 복구까지 완료하기 전에 최종 프로덕션 승격하지 않는다.** 사용자는 최초 요청에서 전체 검증 후 승격을 지시했지만, 실패/미완료를 숨기고 승격하면 안 된다.
- staging은 Gemini 키가 없어 실제 paid generation 잠금(available0), fixture 검증을 사용. 운영은 실제 키 설정으로 available28.

## 다음 세션 실행 순서

1. 이 문서와 두 이전 인수인계 문서를 읽고 git status/log 및 main/작업 worktree 상태 확인. 다른 세션 변경 보존.
2. 위 CI/스테이징 상태를 조회. 실패 있으면 로그의 실제 원인을 먼저 해결.
3. 원본 DailyWords/attendance/readings 전체와 원본 디자인을 읽고 Mongo 무료 기능 복구. 무료 멸치를 유료 상품에 섞지 않기.
4. 선택 화면을 원본 보라색 톤으로 복구하고 방의 무료 기능을 원본 자산과 연결.
5. fixture로 출석 중복/동시 차감/KST 날짜/16종/본인 프로필/타인 접근/재조회 + 기존 paid 회귀. LLM/실결제 0회.
6. targeted gate→의도한 파일만 commit→main push→CI. 스테이징 정확한 SHA를 확인하고 실제 Worker Mongo QA 및 브라우저 비과금 QA.
7. 모두 통과하면 production pipeline 승격→Pages/Worker SHA 일치→로그인/프로필/28상품/멸치 무료/화면/서버 로그 비과금 smoke. 실패면 즉시 안정 버전 복구.
8. 초기 요구의 10개 최종 보고 항목을 작성. 미검증 실제PG/유료LLM/물리WebView, 개인정보 Gemini 고지 법무 검토도 숨기지 않는다.

## 재개 명령 예시

```powershell
Set-Location 'D:\Development\codedestiny-worktrees\yeongnyangi-mongo-20260915-233146'
git status --short
git log -3 --oneline
gh run view 35051209063 --json status,conclusion
gh run view 35051214318 --json status,conclusion
```

원본 자산과 코드 위치는 확인했지만 **멸치 기능/디자인 복구 코드는 아직 작성하지 않았다**. 다른 세션은 이 지점을 이어서 구현해야 한다.
