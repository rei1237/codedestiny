---
status: done
updated: 2026-10-31
next: "없음 — 후속 과제 10건 처리, 운영 533008fc846d 배포·verify PASS(§운영 배포 결과)"
---

# 2026-10-30 대표 상담 모바일 UI/UX — 후속 과제 마무리 후 운영 배포

## 요청 원문 (이 단계)

- "오케이 그럼 초융합 이번에 구매한 고객은 보관함에서 복구 잘된거지? 개발 서버 종료하고 UI 변경 운영 반영해줘"
- "아 잠깐 후속 과제도 진행한 이후에 배포해줘"
- "컨텍스트가 길면 인수인계 후 진행하도록해"
- 앞선 UI 요청의 요지는 다음과 같다.
  - 대표 상담 화면이 모바일에서 바로 보이게 한다. 네오 팩폭 작전실이 가장 심하다.
  - 팩폭 강도 선택은 단순하게, 사자 대신 영냥이로 표현한다.
  - 인생의 책부터 초융합까지 한눈에 들어오게 한다.
  - 프로필 선택 색 대비를 고친다. 디자인은 깔끔하게 한다.

**해석**: "후속 과제"는 직전 보고에서 UI 절 아래 "후속 과제"로 묶은 항목을 말한다(아래 표). 유료 전달 쪽 남은 위험은 `2026-10-30-paid-fusion-delivery-recovery.md`의 후속 과제 절에 있고, 이번 배포 범위가 아니다.

**승인**: 사용자가 이 UI 변경과 후속 수정을 운영에 반영하라고 명시했다.

## 현재 상태

- 워크트리 `D:\Development\codedestiny-worktrees\paid-delivery-ledger-20261030-145807`, 브랜치 `wt/paid-delivery-ledger-20261030-145807`. 깨끗하다.
- origin/main 기준 미push 커밋은 이 문서 커밋을 빼고 8개다.
  - `27699c3d8` docs(handoff): 초융합 미지급 복구 운영 반영 완료 기록
  - `884822b71` fix(ui): 저장 프로필 선택 카드 글자색을 카드가 소유
  - `557426de5` feat(neo): 팩폭 강도를 영냥이 3단계 한 줄 선택으로 (`public/assets/yeongnyangi/intensity/{soft,standard,hot}.webp`)
  - `69d976f8b` fix(neo): 모바일 입력 덱을 한 화면 단위로 압축
  - `e2f5dda7f` fix(forms): 달빛 입력폼 placeholder 대비를 AA 이상으로
  - `d4a8511cb` fix(life-book): 모바일 첫 화면에서 폼을 바로 보이게
  - `86f522706` fix(fusion): 모바일에서 폼을 히어로 바로 아래로
  - `5c7eba456` fix(new-year): 모바일에서 제목·폼을 먼저, 고정 CTA는 바닥에
- 운영 SHA는 `4135d0e44292`(유료 전달 수정, verify PASS)이고, UI 커밋은 아직 운영에 없다.
- 개발 서버(포트 35716)는 종료했다.
- 실측(390px 첫 입력칸 y):

  | 화면 | 첫 입력칸 y |
  |---|---|
  | 초융합 | 6860 → 1588 |
  | 인생의 책 | 2131 → 1380 |
  | 신년운세 | 1681 → 1107 (360px 1808 → 1211, 1280px 2단 복원) |
  | 연애 비책 | 1504 → 1097 |
- 로컬 `check:fast` 결과: Jest 7165/7165, node --test 4007/4009. 실패 2개는 Playwright headless shell 미설치 때문이고, msedge로 돌리면 통과한다. headless shell은 설치하지 않는다(C 용량 부족).

## 초융합 P0 고객 확인 (2026-10-30, 읽기 전용 감사)

- 명령: `node scripts/audit-paid-order-delivery.mjs --db code_destiny --order cd49739990d1c383aee318e695e052f49a87e518`
- 결제:
  - PortOne `paid` 50,000원, 취소 없음, 금액 일치.
  - `payments.status=paid`, refundLock 없음, 열람 회수 없음.
- 결과:
  - `completed`, `qualityTier=degraded`, 본문 36,403자.
  - 분류는 `completed_visible`.
  - 보관함 소유자 조회에 `completed` 1건이 있고 결과와 일치한다.
- 깊이 미달: saju·vedic·action·verdict 그룹은 깊이 기준에 못 미치지만 본문은 있다.
- 선택 그룹 누락 6섹션: 윤달 lifeCycle·health, 한비 marriage·relations, 네오 wealth·career.
- 보강하려면 유료 LLM 재생성이 필요하다. **별도 승인 항목**이고 이번 범위가 아니다.

## 후속 과제 (이번에 처리)

| # | 항목 | 위치 | 완료 기준 |
|---|---|---|---|
| 1 | 네오 강도 기본 선택값이 없어 단계가 하나 더 있다 | `src/features/neo-war-room/NeoOperationRoomPage.tsx:1080` (`useState<IntensityId \| "">("")`), 대사 분기 `:1259-1277`, 스프라이트 `:1387-1393`, 출발 확인 `:1250` | 기본맛(`normal`)이 선택된 채 시작한다. 대사·출발 확인 흐름이 깨지지 않는다. worker 프롬프트 값은 바꾸지 않는다 |
| 2 | 순한맛·기본맛 그림이 작은 크기에서 비슷하다 | `public/assets/yeongnyangi/intensity/*.webp`, 원본은 scratchpad `ux/yn-intensity/` | 실제 표시 크기에서 3단계가 구별된다. 그림을 다시 그린다면 codex-image로 하고, 원본 에셋을 참조해 나란히 비교한다. 영냥이 귀 2개를 원본 크기로 센다 |
| 3 | "마스터 소개 보기" 탭 높이가 약 24px | `app/components/ProductMasterStrip.tsx:24`, `app/components/product-master-strip.module.css` `.more` | 탭 영역 44px 이상, 겉보기 레이아웃은 그대로 |
| 4 | 연애 비책 칩이 약 43px | `app/love-secret-ai/LoveSecretAiClient.tsx`와 그 CSS | 44px 이상 |
| 5 | 360px에서 하단 고정 CTA가 마지막 콘텐츠(배지 줄)를 가린다 | `app/components/expert-consulting/ExpertConsultationFrame.module.css` `.stickyCta`(fixed, 높이 56+8px), 해당 컴포넌트 | 페이지 끝까지 스크롤하면 마지막 콘텐츠가 바 위에 온다. 하단 내비가 있는 화면(`body.cd-mnav-mounted`)도 확인한다 |
| 6 | 신년운세 모바일 배경 덮개가 답답하다 | `app/new-year-ai-consultation/NewYearAiClient.tsx` `NYAI_READING_ROOM_CSS` `@media (max-width:860px) .nyai-intro-art` (rgba .86) | QA 제안은 .78 근처. 제목·본문 대비 4.5:1 유지 |
| 7 | 신년운세 데스크톱 문제 3가지 | 같은 CSS 상수와 컴포넌트 | 겹침 없음, 상태 문구 1회 |
| | ① 요약 카드가 그림 속 나침반을 가린다 | | |
| | ② 상태 문구가 두 번 나온다 | | |
| | ③ "08:35"가 가운데 정렬이다 | | |
| 8 | 저장 프로필 카드(라벤더) 아이콘이 제목 줄과 어긋난다 | `app/components/SavedBirthProfilePicker.module.css` `.heading > svg` | 아이콘과 라벨의 세로 중심이 같다 |
| 9 | 공유 `CraftedProductDisclosure`의 폭 | 컴포넌트를 grep해서 찾는다 | 대표 상담 화면에서 본문 폭과 맞는다 |
| | ① 다른 페이지에서 폭 지정이 없다 | | |
| | ② 768px에서 좁다 | | |
| 10 | 출생시간이 비활성인데 값이 보인다("시간 모름" 선택 시) | 해당 폼과 공유 `styles/moonlit-birth-form.css` | 비활성일 때 값이 보이지 않거나 흐리게만 보인다. 제출 값은 바꾸지 않는다 |

범위 밖:
- 쿠키 배너(동의·법무 영역, 별도 승인).
- dev 전용 "N" 배지와 `DevPaymentTester`(운영에는 없다).
- SEO 메타·구조화 데이터는 바꾸지 않는다.

### 처리 결과 (2026-10-31)

| # | 커밋 | 결과 |
|---|---|---|
| 1 | `3e7d32564` | 기본맛(`standard`)을 골라 둔 채 시작한다. worker 강도 값은 그대로다 |
| 2 | `d328f43be` | 순한맛을 원본 hero-800 참조로 달빛 청록으로 다시 그렸다. 88px에서 금(기본)·적(매운)과 갈린다. 귀 2개를 확인했다 |
| 3 | 변경 없음 | 이미 충족. `.more` min-height 44, 360·768·1280 실측 44px |
| 4 | 변경 없음 | 이미 충족. 칩은 실측 44px 이상이고, 44 미만은 밑줄 인라인 링크뿐이다 |
| 5 | `2b48bbd22` | 고정 CTA를 숨기는 IntersectionObserver rootMargin을 위로 넓혔다. 초융합 이용 안내 끝에 여백을 줬다. 360 바닥에서 덮임 0 |
| 6 | `40fcf2334` | 덮개를 .78로 낮췄다. 본문은 가장 밝은 배경 픽셀 대비 5.2:1 이상이다(360·390·768) |
| 7 | `40fcf2334` | ① ≥1200은 글·카드(240px)·나침반 3열이고, 1024~1199는 카드를 숨긴다. 1024·1200·1280에서 겹침 0. ② 카드의 상태 행을 뺐다. ③ 시간 입력을 왼쪽 정렬했다 |
| 8 | `03f44447b` | 전역 `label[for]` 44px 규칙으로 뜬 라벨을 flex 가운데로 맞췄다. 아이콘과 라벨 세로 중심 차이 12.5→0.6px |
| 9 | `72a1cc5fa` | 신년운세만 540→1180으로 넓혔다. 인생의 책·연애 비책·초융합·네오 운영실은 이미 본문 폭이다 |
| 10 | `c951b9bae` | 원인은 점성술 AI 폼이었다(연애 비책은 이미 비운다). "시간 모름"이면 비활성 칸에 값을 넣지 않고 공용 placeholder도 숨긴다. 제출 값은 그대로 "" |

검증: `check:fast`는 Jest 7165/7165, node --test 4007/4009이고, 실패 2건은 headless shell 미설치 때문이다. lint·sitemap drift·typecheck·smoke:core는 통과했다. 첫 입력칸 y는 위 실측과 같다(360 신년 1211·인생의 책 1438·초융합 1641).

남은 문제(이번 범위 밖이라 고치지 않았다. 이어받기는 `2026-10-31-signature-ui-leftovers.md`):
- 신년운세 1280 폼의 "상담 연도" 칩이 세로로 눌리고, 양력/음력 select가 약 140px로 높다(변경 전부터 있었다).
- 신년운세 카테고리 칩(年 종합운 등)이 40px로 44px 기준보다 낮다(변경 전부터 있었다).
- 7③ 시간 왼쪽 정렬은 신년운세에만 넣었다. 다른 달빛 폼은 여전히 시간이 가운데 정렬이다.
- 네오 운영실은 제작 고지가 소개 블록과 같은 폭이고, 값 카드만 16px 안쪽으로 들어가 있다.

## 검증

- 개발 서버
  - 이 워크트리에서 `npm run dev`를 띄운다. `node_modules`는 메인 체크아웃으로 가는 junction이다.
  - 끝나면 반드시 종료한다. 이 세션이 고아 서버를 남긴 적이 있다.
  - 다른 세션 서버는 건드리지 않는다.
- 스크린샷
  - Playwright 임시 스크립트는 scratchpad에 둔다. cwd=워크트리, `createRequire(process.cwd()+'/')('playwright')`, `channel:'msedge'`.
  - 폭 360, 390, 768, 1280에서 찍는다.
  - `node scripts/shrink-shot.mjs <png> --width 390`로 줄인 뒤 QA 에이전트에게 판정을 맡긴다.
- 기준
  - 디자인 정본 `--cd-*` 토큰을 쓰고 새 hex는 넣지 않는다.
  - 탭 44px, 주 행동 48px 이상.
  - 대비는 텍스트 4.5:1, UI 3:1.
  - 첫 입력칸 y는 위 실측보다 나빠지지 않아야 한다.
- 테스트: `npm run check:fast`. 위 browser 2건 외 실패는 0이어야 한다.
- 커밋은 항목별로 하고, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.

## 운영 배포 (사용자 승인 있음)

1. 메모리 규칙 "code-destiny 공유 main push"를 따른다.
   - 메인 체크아웃(`D:\Development\code-destiny`, 다른 세션의 `feat/world-cast-page`)은 건드리지 않는다.
   - 새로 받은 origin/main 기반 작업 트리에 이 브랜치의 `27699c3d8..HEAD` 커밋과 이 문서 커밋을 cherry-pick해서 push한다.
2. push SHA로 GitHub CI required가 통과하는지 확인한다.
3. `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`
4. `node scripts/verify-deployed-sha.mjs --sha=<push SHA> --origin=https://code-destiny.com`
5. 운영에서 360·390 화면 실측을 1회 한다. 대상은 네오, 신년운세, 인생의 책, 초융합, 연애 비책이고, 실결제는 하지 않는다. `cf-placement`가 `remote-ICN`인지도 확인한다.
6. 실패하면 `-f mode=rollback`으로 되돌린다. 직전 운영 SHA는 `4135d0e44292`다.
7. 배포가 끝나면 이 문서의 `status: done`과 결과(SHA, run id, verify)를 기록하고 커밋한다.

### 운영 배포 결과 (2026-10-31)

- push
  - origin/main `4135d0e44`가 이 브랜치의 바로 위 부모였다. 그 위 커밋이 모두 이 인수인계 줄의 것이라 cherry-pick 대신 fast-forward로 올렸다. 그래서 위 표의 SHA가 그대로 main에 있다.
  - `27699c3d8`(초융합 복구 기록)도 함께 올라갔다. §현재 상태의 미push 목록에 들어 있던 커밋이다.
- push 직전에 더한 커밋
  - `60b7a49e7` 사이트맵 lastmod 재생성. 공용 폼 컴포넌트를 쓰는 라우트 376개다.
  - `f86a3134a` public 미러 동기화. `check:pre-push`가 `e2f5dda7f`의 `styles/moonlit-birth-form.css` 미러 누락을 잡았다. index.html은 og 이미지 빌드 해시만 바뀌었다.
  - `533008fc8` 이 문서 status를 `in-progress`에서 `active`로 고쳤다. PR CI run 41090345375의 `verify:handoff-contract`가 막았다. CI에서 건너뛴 51단계는 로컬에서 통과했다.
- CI
  - PR CI run 41093115322(`533008fc8`)에서 CI required가 success였다.
  - 코드 lane(build·typecheck·critical)은 run 41090345375(`f86a3134a`)에서 success였다.
- 릴리스
  - run 41096476153, `mode=production`, success였다.
  - Pages `96ac8874-bada-4d27-a4ed-1d02c28fb415`, Worker `32aa7a06-9c1a-4095-a57f-d68fac2f0110`.
  - 롤백 대상은 Pages `ae27f3c0-2904-4e2b-866d-7e5f01ac6693` / Worker `b8d5e28c-da26-4c75-98c7-8cc45fd69a85`(`4135d0e44292`)다.
- verify
  - `verify-deployed-sha --sha=533008fc846d…` PASS. Pages와 Worker 모두 `533008fc846d`다.
  - `/api/health`의 `cf-placement`는 `remote-ICN`이었다.
- 운영 실측(360·390, 실결제 없음)
  - 첫 입력칸 y는 신년 1211·1107, 인생의 책 1438·1380, 초융합 1641·1588로 개발 실측과 같다.
  - 네오·연애 비책은 첫 화면에 입력칸이 없다(개발과 같다).
  - 다섯 화면 모두 바닥에서 고정 바가 마지막 글을 덮지 않는다.
  - 초융합 주문 바의 가격 "1회 50,000원"은 바 안(x 27–116 / 바 12–348)에 잘림 없이 들어간다.
  - 신년운세 1280: 글 81–484, 카드 512–752, 나침반 787–1147로 겹치지 않는다. 상태 문구는 1회다.

## 지켜야 할 것

- 다음 파일은 수정하지 않는다: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`. `worker/wrangler.toml`은 구조를 바꾸지 않는다.
- 실결제, 운영 DB 쓰기, 유료 LLM 호출을 하지 않는다.
- 비밀키·고객 정보를 출력하거나 커밋하지 않는다.
- 안내와 보고는 한국어로 한다. 산출물은 D 드라이브에 둔다.
