---
status: active
updated: 2026-10-04
next: "Verify and deliver editorial v3 with money, love and work for all twelve animals. Prior v1 production proof does not cover this correction; review unrelated main changes before any new promotion."
---

# Threads 발행 형식과 참여형 편성 인수인계

## 요청과 전달

### 최신 수정 요청 — 각 띠의 분야별 운세가 우선

사용자 원문: “아니 이런식으로 하면 안되고 각 띠마다 재물운, 연애운 등 구체적인 내용이 나와야한다.” 이전 v1의 생활 조언 중심 형식은 승인된 최종 문안으로 간주하지 않는다.

- 교정 문안 버전 `editorial-20261004-v3`: 12띠 모두 재물운·연애운·일/직장운의 흐름과 실천, 총 36항목을 제공한다. 원글 1개 + 2띠씩 답글 6개이며 하루 독립 원글 편성은 유지한다.
- 기존 역법·지지 관계를 분야별로 풀어 쓰고 개인 명식의 재성·배우자궁·직업운 계산이나 수입·연락·취업 결과를 만들어내지 않는다. 분야별 본문은 검수 문안이 담당하고 모델은 훅·질문만 생성한다. 기존 한 번의 호출은 유지하며 상한은 512토큰으로 축소한다.
- `npm run verify:threads-daily-jobs`: 35개 통과. 366일 모든 띠의 분야 누락·복제·길이, 모델 장애/허위 본문 덮어쓰기 방지, 잠금/예약 경로 포함. 모델/DB/발행 API는 mock이며 실호출 0회.
- `node scripts/preview-threads-editorial.mjs --date=2026-10-04`: 새 원문 미리보기 재생성, 첫날 12띠 전문·7일 편성·저녁 7편, 최대 길이 438/480. 예시 파일은 실제 게시 증거가 아니다.
- 기존 자동화 `code-destiny-2027`을 v3 지침으로 갱신했다. 재조회 원문 일치·대체문자 0·기존 이름/ACTIVE/시간/대상 유지 확인. Instagram의 3띠씩 4장 카드 규칙은 별도로 유지하고 Threads만 2띠씩 6답글로 바꿨다. v3 운영 배포는 미확인임을 지침에 명시했다.
- `npm run check:fast -- --plan`은 critical 전체 계약으로 승격했다. 로컬 실행에서 paid-gate-suite 88개·lint·typecheck·사이트맵·node 테스트 2,347개가 통과했다. 커밋 준비 시 마지막 Jest 단계는 진행 중이며 완료 결과는 `threads-domains-fast.log`와 main의 해당 SHA CI를 확인한다. `git diff --check` 및 `npm run verify:handoff-contract`(145개) 통과. 전체 완료 전 부분 결과를 전체 통과로 해석하지 않는다.
- 공유 main의 다른 세션 파일을 보존하고 기존 격리 worktree를 재사용했다. 시작 기준 `0be871964422790f439c26d06fec24c14add7a80`에는 이전 운영 SHA 이후 다른 세션의 작명 v2 라우트/보고서 및 사주 표시 변경이 포함된다. 이들을 Threads 수정 승인만으로 운영 승격하지 않는다. v3의 배포·검증 결과는 후속에서 기록한다.

### 승인 후속 — 2026-10-04

사용자가 “승인할테니 제대로 사람들의 심리나 스레드 생태까지 고려해서 진행해줘 중요한 작업이야”라고 운영 반영을 승인했다. 이 승인 범위를 다시 묻지 않는다. 배포 전 실측 운영 Pages/Worker는 모두 `323c3450514e6f2b4d8f8873f7bc9c051af4db88`이었다. 해당 SHA에서 릴리스 대상까지 차이를 확인했으며 Threads 코드 외에는 이미 승인된 서비스 소개/오행 표시/캠페인 정적 자산/사이트맵 변경이다. 가격·이용권·인증·DB·운세 계산 변경은 포함되지 않는다. 10월 5일 가격 B는 이 릴리스에 포함되지 않는다.

- 최종 코드 통합 SHA: `4886b9c99eaf10458e61fd38a73ed10f2868c79a`.
- [동일 SHA의 전체 main CI 37135173946](https://github.com/rei1237/codedestiny/actions/runs/37135173946): success. Critical checks, Typecheck and lint, Build Pages and Worker, Static guards, CI required 통과. 아래 초기 CI 실패 기록은 과거 이력으로 보존한다.
- 원격 main SHA 일치 확인 후 `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production` 실행. [운영 릴리스 37138792610](https://github.com/rei1237/codedestiny/actions/runs/37138792610) **success**, headSha도 위 SHA와 일치한다. 운영 smoke/health check PASS(2026-10-04 02:09 KST).
- 후속 읽기 전용 `node scripts/verify-deployed-sha.mjs --origin=https://code-destiny.com --sha=4886b9c99eaf10458e61fd38a73ed10f2868c79a --attempts=2 --delay-ms=5000` 결과: Pages PASS, Worker PASS. 새 발행 코드의 운영 반영을 확인했다. 첫 정상 슬롯의 실제 공개 게시 완료와는 구분한다.
- Chrome 프로필을 새로고침하고 로그인된 공식 계정의 인사이트를 직접 확인했다. 최근 30일 조회수 31,302/조회한 사람 12,000/순 팔로워 +7/반응 199. 원글별 조회수와 GMT+9 활동시간, 표본 한계는 `marketing/threads-editorial-plan-20261004.md`의 02:01 KST 관측표에 기록했다. 새 형식의 개선 성과가 아니다.
- 첫 새 형식의 정상 예정 슬롯은 10월 4일 08:30 KST 띠별이다. 이 작업에서 시험 게시하지 않는다. 기존 Codex 07:10은 준비, 21:10은 당일 공개 URL·답글 체인·원글 수 확인을 수행한다. 첫 게시 확인과 동일 경과시간 성과 비교는 예정 시각 이후에만 가능하다.
- 자동화 TOML을 Python tomllib로 읽은 결과 기존 이름과 과거 지침에 U+FFFD 대체문자 2,842개가 저장되어 있었다. 화면 인코딩 문제가 아닌 저장 내용의 손상임을 확인하고 app automation_update로 전체 지침을 `editorial-20261004-v2` 한 문안으로 통합했다. 배포 문안 버전은 v1 그대로다. UTF-8 재조회에서 원문 일치, 대체문자 0, 이름 `CODE DESTINY 일일·콘텐츠 통합 운영`, ACTIVE 및 기존 ID·시간·대상 대화 보존을 확인했다. Instagram 기존 자료 보존/수동 업로드/캐릭터 원본, 신년/월간/별도 소개 일정, 계측·중복 방지 규칙을 유지했다. 별도 자동화를 만들지 않았다.
- 후속 문서 변경의 `npm run check:fast -- --plan`은 공백·문서 신선도만 선택했고 `npm run check:fast` 통과. `npm run verify:handoff-contract` 145개 통과. 공유 마케팅 로그는 다른 세션의 미커밋 변경 때문에 편집하지 않았고 인사이트 관측을 이 작업 기획서에 남겼다.

사용자는 첨부 예시처럼 대상 띠·출생연도·설명·행동 조언이 이어지는 글과 대중적인 소재로 하루 2~3개의 Threads 글을 운영하도록 요청했다. 계정은 @codedestiny_official이다. 코드 변경 커밋은 `3ba93f7f5`, 원격 main 통합·push SHA는 `433ffb2ed2d93c72f61d37b9979e5935c7551a80`이다. PR은 만들지 않았다.

작업 위치: `D:\Development\codedestiny-worktrees\threads-editorial-20261004-003257`.
작업 브랜치: `wt/threads-editorial-20261004-003257`.
정본 기획: `marketing/threads-editorial-plan-20261004.md`.
실제 엔진 기반 미리보기: `marketing/threads-editorial-preview-20261004.md`.

원격 main은 최신 변경을 합쳐 직접 push했다. 공유 `D:\Development\code-destiny`의 로컬 main은 다른 세션의 index.html·정적 미러·마케팅 로그·RSS 미커밋 변경 때문에 fast-forward가 거절됐다. 파일을 보존하고 격리 worktree에서 `git push origin HEAD:main`으로 전달했다. 공유 main에 reset/stash/강제 checkout을 하지 않는다. 이 작업의 검수 문서가 현재 worktree에 있으므로 로컬 main 동기화 후 배수한다.

## 과거 v1 적용 이력 (분야별 형식은 위 v3가 대체)

- Worker 기본 08:30 띠별·12:00 사주·20:30 마음 노트의 독립 원글 3편 유지. 띠별은 대상·연도 원글 + 3띠씩 4답글, 각 글 480자 이내.
- 출생연도는 찾기용 대표 예시이며 입춘 경계 안내를 포함. 같은 역법·지지 관계를 사용하고 호통·인연 확정 문구를 교체.
- 저녁은 관계·연락·소비·일·휴식 등 15개 검수 주제와 질문 하나. 띠별·저녁 홍보 링크 제거, 낮 링크 유지. 브랜드 태그 #꿀꿀운세.
- 10월 5일 09:00 별도 소개글은 그날 12:00 슬롯 대체. 11월 1일~2027년 1월 3일 일요일 21:10 신년 예약은 20:30 슬롯 대체. 별도 예약은 정지하거나 복제하지 않았다.
- T03/T05/T07/T10 예비 큐의 깨진 루트 목적지를 실제 관련 페이지로 교정. 13편 검수 통과, 이미 게시된 글 재게시 없음.
- Codex 자동화 `code-destiny-2027`의 기존 ID·ACTIVE·07:10/21:10 KST·target chat을 보존하고 처음 v1을 적용한 뒤 위 후속 작업에서 `editorial-20261004-v2`로 통합·복구했다. 실행은 준비·점검·계측이며 정상 Worker에 원글을 추가하지 않는다.
- 자기 연속 답글을 참여에서 제외하고 24h/72h/7d·14일 비교 기준을 저장. 별도 댓글 대응·DM·광고 운영은 추가하지 않았다.

## 검증과 경계

- `npm run verify:threads-daily-jobs`: 34개 통과. 366일 × 6유형 × 결정론/모의 모델 최대 길이, 연도/띠 일치, 12띠 누락, 예약 대체·중복·실패 경로 포함.
- `node scripts/verify-threads-queue.mjs`: 13개 통과, realPosts 0.
- `npm run check:fast -- --plan` 및 `npm run check:fast`: critical로 자동 승격. paid-gate-suite 88개·lint 통과 후 `verify:sitemap-drift` 실패. 날짜 운세 URL 2026-10-04 추가/2026-09-04 제외 등 소스/추적 사이트맵 불일치. 사이트맵·라우트는 이번 변경 대상이 아니다. 이후 단계는 이 실행에서 미실행이다.
- 최종 변경 파일 대상 ESLint와 `git diff --check` 통과.
- [코드 main CI](https://github.com/rei1237/codedestiny/actions/runs/37134786176). CI 종료 결론은 링크에서 확인하며 로컬 검사 통과와 혼동하지 않는다.
- 이후 원격 main의 사이트맵·정적 소개 페이지 수정 `d5ae0fddad92e01d08574e468e07b5f42b686f54`를 통합했다. 이 수정은 다른 작업의 변경이며 위 로컬 실패를 소급해 통과로 바꾸지 않는다. 최신 원격 main의 전체 CI를 확인한다.
- 최초 구현 검증: 유료 LLM 0회, 실결제 0회, 실제 게시 0건, 운영 DB 쓰기 0회, 운영 승격 미실행. 이후 승인된 운영 릴리스는 위 후속 절과 구분한다. 결제/인증/가격/DB 스키마/발행 잠금은 유지했다.
- 최초 브라우저 연결 timeout 이후 승인 후속에서 연결이 복구되어 최신 프로필·인사이트를 위와 같이 읽기 전용으로 확인했다. 기존 공개 게시물은 수정·삭제하지 않았다.

## 다음 행동

1. v3 커밋의 main CI 결과를 확인한다. 과거 v1 릴리스 성공을 v3 배포 성공으로 간주하지 않는다. 운영 승격에는 다른 세션의 작명 v2 라우트 등 추가 변경이 함께 들어가므로 그 범위의 승인을 확보한 후 GitHub Actions의 고정 SHA 릴리스로 진행한다.
2. v3 운영 반영 후 정상 Threads 슬롯의 원글·답글 공개 URL, 12띠 × 3분야와 답글 6개·연도·빈 줄·질문·링크·원글 개수를 확인한다. 첫 발행 전에는 형식의 공개 게시까지 완료했다고 기록하지 않는다. 즉시 시험 게시로 중복을 만들지 않는다.
3. 기존 Codex 21:10 점검에서 공개 이력을 확인하고 이후 24h/72h/7d 지표를 같은 경과시간에 기록한다. 실측 기준선과 14일 비교 원칙은 기획 문서를 따른다. 자기 답글을 독자 참여로 세지 않는다. 낮은 반응만으로 추가 원글을 발행하지 않는다.
4. 예약 소개글·신년이 원글 4개째가 되지 않는지 확인한다. 수동 원글은 Worker가 자동 계정 한도로 차단하지 않으므로 사전 편성에 포함한다.
5. 공유 main의 미커밋 변경 소유자가 정리한 뒤 fast-forward하고 원격 main에 포함된 이 worktree를 안전하게 배수한다. node_modules 정션은 공유 디렉터리를 삭제하지 않도록 먼저 링크만 제거한다.

재개 지시:

```text
D:\Development\codedestiny-worktrees\threads-editorial-20261004-003257에서 D:\Development\codedestiny-worktrees\threads-editorial-20261004-003257\docs\handoff\threads-editorial-20261004.md를 읽고, editorial-20261004-v3의 main 커밋과 CI 결과를 확인하라. 과거 운영 SHA 4886b9c99eaf10458e61fd38a73ed10f2868c79a는 v1이다. v3와 함께 배포될 다른 세션 변경의 승인 범위를 확인한 후 운영 반영을 진행하고 정상 슬롯에서 12띠 × 재물운·연애운·일/직장운 및 답글 6개를 확인하라. 다른 세션의 미커밋 작업을 보존하고 시험 글이나 중복 게시를 만들지 마라.
```
