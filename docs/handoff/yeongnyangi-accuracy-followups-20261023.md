---
status: done
updated: 2026-10-23
next: "없음 — 모든 항목 완료·닫음, 운영 반영 99da0ed57(결과 기록 참고)"
---

# 영냥이 상담 중복·정확도 — 후속 과제

## 왜

- 사용자 요청(2026-10-23): "후속과제도 진행가능하도록 인수인계 문서 만들어서 진행시킬 수 있도록해줘"
- 원 작업의 지시
  - "영냥이 서비스에서 운세 결과가 반복되는 글이 너무 많다는 제보가 들어왔고 추가로 대운이 다르다는 제보도 있던데 정확한 대운을 보는 로직이 설정되어있는지 확인해주도록해주고 분량 뿐만 아니라 질문 하나를 하더라도 건강이라든지 적성, 성향, 연애적인 전반적인 특성은 다 넣도록하고 중복을 피하도록해서 모든 영냥이 상담 결과가 중복을 최소화해주고 정확한 계산을 통해서 나오도록 개선해줘"
  - "사주에서 오행의 개수에 대해서는 지장간에 있는것까지 세지말도록해 … 지장간까지 포함해서 답변은 해주도록해줘"
- 이 문서는 원 작업이 남긴 후속 과제를 우선순위대로 모은 것이다.
  - 2026-10-23에 origin/main `406f1e4a2` 기준으로 코드를 다시 확인했다. 줄 번호도 그 기준이다.
  - 작업 전에 `git grep`으로 줄 번호를 다시 찾는다.
  - 경로 앞의 `worker/yeongnyangi/`는 줄여 쓴다. 예: `fortune/saju/major-luck.ts`는 `worker/yeongnyangi/fortune/saju/major-luck.ts`다.

## 지금 상태 (다시 하지 않는다)

- 원 작업 커밋 `43adcc577..8cfe5f0d8`(8개)과 후속 1~5·숙요 core(`ab2119a83..99da0ed57`)가 origin/main에 있고, 운영 Pages·Worker는 `99da0ed57`다(2026-10-23 운영 릴리스 run 39882578653 성공).
- 주문 `cda59aa3…`: 입력은 여성이고 순행 경오(대운수 1)가 맞다. 계해는 남성으로 계산한 값이다. 정정본은 2026-10-23 운영 보관함에 반영해 확인했다. 되돌릴 때는 `$unset correction`(별도 승인).
- 정정본 검수본(고객 데이터 포함, 커밋 금지): `D:\영냥이_정정본검수_2026-10-23\`

## 작업 규칙 (원 작업에서 이어진다)

- `AGENTS.md`·`CLAUDE.md`를 먼저 읽는다.
- **루트 로컬 main에서 직접 push하지 않는다.**
  - 2026-10-23 기준 루트 main은 origin/main보다 21개 앞서고 11개 뒤처져 있다. 다른 세션이 아직 push하지 않은 커밋이 섞여 있다.
  - 작업은 `scripts/create-safe-worktree.ps1`로 만든 워크트리, 또는 `git worktree add --detach D:/Development/codedestiny-worktrees/<이름> origin/main`에서 한다.
  - node_modules는 PowerShell `New-Item -ItemType Junction`으로 연결한다. Git Bash의 `cmd //c mklink /J`는 경로 변환 때문에 실패한다.
  - 정리할 때는 `cmd //c rmdir "<워크트리>\node_modules"`로 junction만 먼저 풀고 `git worktree remove --force`를 한다. PowerShell `Remove-Item -Recurse`는 junction을 따라가 루트 node_modules를 지운다.
  - 루트에서 `reset --hard`·`stash`·`checkout --`를 쓰지 않는다.
- **과금 LLM 검증 금지.**
  - 검증은 mock으로 한다(`LLM_DRY_RUN=true WORKERS_AI_ENABLED=false`).
  - 실호출은 정확한 횟수로 1회 승인을 받는다. 승인된 실호출의 최종 결과는 사용자 검수용으로 D:에 저장해 전달한다.
- **실결제·운영 DB 쓰기·환불·정산 금지.** 운영 DB 읽기도 매번 사용자 승인이 필요하다.
- **구매 결과는 보존한다.** 본문·원본 ID·소유자·결제 연결은 수정하지 않는다. 정정은 `correction` 덮어보기로만 한다(`worker/yeongnyangi/reading-correction.js`).
- **저장된 manifest·snapshot은 다시 쓰지 않는다.**
  - 새 동작은 새 필드로 게이트한다. 이미 있는 게이트는 다음과 같다.
    - `repeatPolicy:'sentence-v1'`(`fortune/reading-restatement.ts:7`)
    - `fiveElements.countBasis:'surface'`
    - `majorLuck.cycles[].label`(`fortune/saju/major-luck.ts:34`)
  - 게이트가 없는 2026-10-23 이전 주문은 기존 동작을 유지한다.
  - `QUESTION_LAYOUT_VERSION`·`QUESTION_POLICY_VERSION`은 올리지 않는다. `providers/chapter.ts`가 동등 비교로 쓰고, 추가 질문(`question-followup.ts:33`)도 같은 버전을 요구한다.
- **분량 미달로 실패시키지 않는다(전달 우선).** 결정적 교정은 장 하한(`chapterFloor`) 밑으로 깎지 않는다.
- **엔진은 고치지 않는다.** 대상은 `lib/korean-calendar/daeun.js`, `worker/lib/life-book-ai-saju.js`, 벤더 `saju-runtime.mjs`다. 후처리는 `worker/yeongnyangi/fortune/saju/*`에서 한다.
- **수정 금지 파일**: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 결과물, `worker/wrangler.toml` 구조
- **비밀정보와 고객 개인정보(이메일·생년월일)는 출력·저장·커밋하지 않는다.**
- **다른 세션 파일은 보존한다.** `.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md`
- **불변성 해시**
  - 프롬프트나 manifest가 바뀌면 `YEONGNYANGI_INVARIANCE_PRINT=1`로 새 해시를 출력한다.
  - `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`를 갱신하고 헤더에 사유 주석을 단다.
- **검증·push**
  - 관련 `node --test` 파일을 먼저 돌리고, 그다음 `npm run check:fast`를 돌린다.
  - push 순서: `npm run check:pre-push && git fetch -q origin && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`
  - **`;`로 잇지 않는다.** main CI가 빨간 상태면 그 위에 push하지 않는다.
  - `config/sitemap-lastmod.json`이 충돌하면 origin 판을 받은 뒤 `node scripts/generate-sitemap.mjs`로 다시 만든다.
- **push는 배포 승인이 아니다.**
  - 운영 승격은 별도 1회 승인을 받은 뒤 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`으로 한다.
  - 확인은 `node scripts/verify-merge-landed.mjs --check=drift --json --soft --base=origin/main --origin=https://code-destiny.com`으로 한다.
- 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.

## 남은 작업 (우선순위 순)

### P1 — 고객이 보는 중복·정확도

- [x] **1. 추가 질문 답변에 반복 문장 제거가 없다** (ab2119a83)
  - 현재
    - `worker/yeongnyangi/question-followup.ts:29-83`(`questionConversation`)은 모델 답을 `validateFollowup`(`fortune/ask/conversation.ts:33`)으로 검사한다(`:70`). 그 결과를 그대로 저장한다(`:73`).
    - 프롬프트에는 본편 장의 summary·highlights만 들어간다(`:55`). 반복 금지는 문구 지시뿐이다(`:54`).
  - 본편 장은 이미 `pruneRestatements`(`fortune/reading-restatement.ts:30`)로 결정적으로 지운다. 대상은 세 가지다.
    - 완전 반복
    - 같은 장 안의 근접 반복(3-gram Dice ≥ .8)
    - 앞 장 문장과 Dice ≥ .72인 문장
    - 호출 위치: `providers/chapter.ts:85`, `:96`, `:246`
  - 할 일
    - `:70`과 `:73` 사이에 결정적 제거를 넣는다. 유료 재호출은 하지 않는다.
    - 새 알고리즘은 만들지 않는다.
      - 답의 `text`를 `\n\n` 단락마다 block 하나로 감싼 ChapterBody로 만들어 `pruneRestatements`를 부른다.
      - previous는 `row.chapters`와 앞선 `exchanges[].reply.text`다.
      - block마다 한 문장은 남으므로 text·reason·action 단락이 사라지지 않는다.
    - 하한은 `contract.readingBudget.followup[0]`(`budgetGuide`)이다. 없으면 완전 반복만 지운다.
    - `kind`·`sources`는 바꾸지 않는다.
    - 게이트는 `snapshot.manifest[0]?.repeatPolicy===REPEAT_POLICY`다. 옛 주문의 추가 질문은 그대로 둔다.
    - 로그는 본편과 같은 `[yeongnyangi-restatement]` 형식으로 남기고, section은 `followup`이다.
  - 완료 판정(`__tests__/ui/yeongnyangi-question-followup-storage.test.mjs` 또는 같은 계열 파일)
    - 본편 문장을 복사한 답 → 그 문장만 빠지고 단락 3개와 하한은 유지된다.
    - repeatPolicy가 없는 옛 주문 → 답이 바이트 단위로 같다.
    - provider 호출 수는 그대로다.
- [x] **2. 본문의 세는 나이 "N세 대운" 표기를 결정적으로 고치지 않는다** (efa390129)
  - 현재 표기 규칙은 프롬프트에만 있다.
    - `fortune/saju/index.ts:11`
    - `fortune/saju/major-luck.ts:7-8`(`MAJOR_LUCK_AGE_RULE`)
    - `fortune/counsel-purpose.ts:58`(`SAJU_CYCLE_GUIDE`)
  - 모델이 "32세부터 41세까지 庚午 대운"처럼 세는 나이로 쓰면 그대로 나간다. 주문 `cda59aa3…` 원본 본문이 이 형태였다.
  - 교정 자리: `correctNatalClaims`(`fortune/saju/natal-claims.ts:95`, 호출은 `providers/chapter.ts:125`)
    - 이미 오행 개수(`:105-134`)와 현재 대운 간지(`:103`)를 교정한다.
    - `NatalFacts.majorLuck`(`:70`)에 `cycles`를 추가로 넘긴다.
  - 할 일
    - `majorLuck.cycles`에 `label`이 있을 때만 동작한다. 교운일 후처리가 된 주문만 해당한다.
    - 한 문장에 간지(한자 또는 한글)와 "N세"가 함께 있고, 그 간지가 한 주기와 맞고, N이 그 주기의 세는 나이 `startAge`와 같을 때만 고친다.
      - "N세부터 M세까지", "N~M세", "N세 대운" 구간을 그 주기의 `ageRange`(`만 X~Y세`)로 바꾼다.
    - 다음 문장은 건드리지 않는다.
      - 간지가 없는 문장
      - 여러 주기를 묶은 문장
      - 다른 사람 이야기(`OTHER_PERSON`, `:22`)
      - 세운 이야기
      - 이미 만 나이로 쓴 문장
  - 완료 판정(`__tests__/ui/yeongnyangi-natal-claims.test.mjs`)
    - 교정 1건
    - 고치지 않는 경우 3건: label 없는 옛 주문, 간지 불일치, 이미 "만 N세"인 문장
    - 프롬프트가 바뀌지 않으므로 불변성 해시는 그대로여야 한다.
  - 선택: 1번의 추가 질문 답에도 같은 교정을 적용할지 정한다. 지금은 `validateReadingClaims`만 거친다.
- [x] **3. 차트 "계산된 시기" 행에 "자료 없음"이 나온다** (79ffda868)
  - 위치: `fortune/reading-presentation.ts:91-101`
    - majorLuck은 `[currentCycle, ...cycles]`로, yearlyLuck은 배열 그대로 행을 만든다.
    - 라벨은 `text(r.lord||r.planet||r.ganji||r.pillar||r.year)`다.
    - 시작·끝은 `text(r.startDate||r.startYear||r.startAge)`와 `text(r.endDate||r.endYear||r.endAge)`다.
    - 값이 없으면 `text()`가 `'자료 없음'`을 돌려준다(`:39`).
  - 증상(주문 `cda59aa3…` 정정본, 2026-10-23 확인)
    - 첫 교운 전 구간(대운 index 0)은 pillar가 없어서 "계산된 시기 · 자료 없음" 행이 생긴다. `major-luck.ts:30-31`이 index 0에는 일부러 startDate를 넣지 않는다.
    - 세운 행 일부는 시작·끝이 "자료 없음"이다.
    - 현재 대운 행이 "계산된 시기 · 庚午"로만 나온다. 본문 표기 규칙인 label(교운 연월·만 나이·대운수)과 다르다.
  - 할 일(표시 전용이고 저장 데이터는 그대로 둔다)
    - 주기 이름이 없는 대운 행은 "대운 시작 전"으로 적거나 뺀다.
    - 세운 행은 연도가 있으면 시작·끝 대신 연도 한 칸으로 보인다.
    - majorLuck 행에 `label`이 있으면 그 label을 행 제목으로 쓴다.
    - currentCycle과 cycles의 같은 주기가 두 행으로 나오지 않는지 확인한다(`periodKey` 비교).
  - 주의: 차트는 볼 때마다 저장 스냅샷에서 다시 만든다. 그래서 옛 주문 화면도 바뀐다. 값이 없는 칸만 고치고 있는 값은 바꾸지 않는다.
  - 완료 판정: 사주·베딕 fixture 차트에 "자료 없음" 0건, 있는 값은 그대로. 테스트는 `__tests__/ui/yeongnyangi-reading-correction.test.mjs` 또는 차트 문구 테스트에 둔다.

### P2 — 결제 판정 일관성 (돈 흐름은 바꾸지 않는다)

- [x] **4. `retry.js`가 자기만의 접근 판정을 쓴다** (a99288e99)
  - 판정 함수가 세 개다.
    - `worker/yeongnyangi/retry.js:7`: `paymentId || accessMethod==='FAMILY' || passEvidenceId`. MOONLIGHT_STONE·SERVICE_PACK·PER_USE·ACCOUNT_FREE_TRIAL·`moonstoneLedgerId`·`packEntitlementId`를 모른다.
    - `worker/yeongnyangi/access-methods.js:6`: `packEntitlementId`가 없다.
    - `worker/yeongnyangi/repository.js:36-47`(`requestAccessMethod`): 가장 완전하다.
  - 현재 영향
    - 위 행에서 재시도하면 `retry.js:15`에서 `attachPayment`로 들어간다.
    - `repository.js:407`이 다시 판정해서 그대로 돌려주므로 거짓 402는 확인되지 않았다. 대신 DB 읽기가 한 번 더 생긴다.
    - `attachPayment` 앞부분이 바뀌면 결제한 행이 결제 경로로 샐 수 있다.
  - 할 일
    - `retry.js`는 `repository.js`의 `hasRequestAccess`를 import해서 쓴다.
    - `access-methods.js:6`을 `requestAccessMethod`와 맞출지 정한다.
      - 사용처: `routes/yeongnyangi.js:82`, `:178`, `service.ts:579`, `routes/fortune-chat-consultations.js:69`, `:93`, `fortune/ask/conversation.ts:15`, `worker/lib/review-eligibility.js:230`
      - review-eligibility(후기 자격)는 판정이 넓어지므로 영향을 확인한 뒤 바꾼다.
  - 완료 판정
    - `__tests__/worker/yeongnyangi-retry.test.js`에 월정석·서비스팩 행을 재시도할 때 `attachPayment`를 부르지 않는다는 테스트를 넣는다.
    - 판정을 자체 정의한 테스트 mock을 실제 판정과 맞춘다: `__tests__/worker/yeongnyangi-delivery.test.js:5`, `__tests__/ui/saju-correction-api.test.mjs:8`, `__tests__/ui/yeongnyangi-reading-correction.test.mjs:31`
- [x] **5. 보관함 목록과 결과 화면의 `paid`가 증빙을 보지 않는다** (운영 0건 → 받아들인 위험)
  - `routes/yeongnyangi.js:178`, `service.ts:579`, `routes/fortune-chat-consultations.js:93`이 모두 `paid: hasRequestAccess(row)`다. 필드가 있는지만 본다.
  - 생성과 이어보기는 `findNonCashEvidence`(`repository.js:108`)로 증빙을 다시 확인한다.
    - 그래서 accessMethod만 있고 증빙이 없는 행(복사 행, 회수된 이용권)은 목록에 결제됨으로 보이고, 열면 409가 난다.
  - 주의
    - 목록에서 행마다 증빙을 조회하면 한 페이지(30행)에 DB 조회가 30번 더 생긴다.
    - 거짓 "미결제"는 결제한 사람에게 결제 안내를 다시 띄운다(`app/yeongnyangi/_components/Result.tsx:114`, `:183`). 지금보다 더 나쁘다.
  - 할 일
    - 먼저 운영 읽기(승인 필요)로 "accessMethod 있음 + 증빙 없음" 행이 실제로 몇 건인지 센다. `scripts/audit-library-retention.mjs`를 재사용할 수 있는지 먼저 읽는다. 아직 아무도 읽지 않았다.
    - 0건이면 "받아들인 위험"으로 옮기고 닫는다.
    - 있으면 판정을 엄격하게 바꾸는 대신, 409 대신 복구·지원 안내가 나오게 하는 쪽을 먼저 검토한다.

## 사용자 결정 (2026-10-23 모두 결정됨)

- **타로·숙요 질문 상담에도 core 장(적성·연애·건강)을 넣을지** → 권고안대로 숙요만 넣고 타로는 뺐다(결과 기록 참고)
  - `fortune/ask/question-policy.ts:191`은 다음 경우에 core 장을 넣지 않는다.
    - 참치: 인생 장 12개에 이미 들어 있다.
    - `CORE_DOMAINS`(`:225`, saju·ziwei·vedic·astrology) 밖의 영역: 타로·숙요
  - 단일장(`:246`)도 같은 기준이다.
  - 원 지시("질문 하나를 하더라도 … 전반적인 특성은 다 넣도록")에 비추면 남은 빈틈이다.
  - 타로 카드는 기질의 근거가 아니어서, 넣으면 근거 없는 서술이 된다. 숙요(본명숙 성향)만 넣는 안을 권한다.
- **주문 `cda59aa3…` 정정본에 core 내용을 더할지** → 만들지 않는다(사용자 선택). 받아들인 위험으로 옮겼다
  - 현재 정정본은 원본과 같은 8장 구조이고 core 장이 없다. 고객이 제기한 문제(대운·오행 개수)는 해결됐다.
  - `correctedFortune`(`reading-correction.js:2-10`)은 정정본 장 수가 원본 장 수와 manifest 길이와 같아야 한다. 그래서 9번째 장은 붙일 수 없다. 넣으려면 기존 장에 소절을 더한 정정본 v2가 필요하다.
  - `scripts/repair-profile-customer.mjs --apply-correction`은 `correction:{$exists:false}`일 때만 쓴다. v2를 넣으려면 교체 모드가 따로 필요하다.
  - 필요한 승인: 실호출 1회 이상, 운영 쓰기
- **5번의 운영 읽기** → "남은 작업 끝까지 진행해줘"를 1회 읽기 승인으로 보고 실행했다(결과 기록 참고)

## 받아들인 위험·참고 (고치지 않는다)

- 5번: 보관함 목록·결과 화면의 `paid`는 필드만 본다. 2026-10-23 운영 읽기에서 비현금 접근 행 13건이 모두 증빙을 찾았고, 증빙 없는 행은 0건이었다. 목록 판정은 바꾸지 않는다. 같은 증상 제보가 오면 409 대신 복구·지원 안내부터 검토한다.
- 주문 `cda59aa3…` 정정본은 원본과 같은 8장 구조이고 core 장이 없다. 고객이 제기한 대운·오행 개수 문제는 해결됐으므로 v2(실호출·운영 쓰기·교체 모드 필요)는 만들지 않는다(사용자 결정 2026-10-23).
- 숙요 core 장은 적성·연애만 다룬다. 27수 데이터(`SUKUYO_MANSIONS`: keywords·strengths·shadows)에 건강 근거가 없다. 타로는 카드가 기질의 근거가 아니어서 core 장을 넣지 않는다.

- 2026-10-23 이전 주문에는 repeatPolicy·countBasis·label이 없어서 새 동작이 적용되지 않는다. 의도한 것이다.
- 오행 개수를 보이는 8글자로 세면서 월지 오행 비율이 바뀐다. 주문 `cda59aa3…`에서는 목이 33% 과다에서 25% 균형이 됐다. 강약·용신 판단은 기존 월령 가중(`weighted`)을 그대로 쓴다.
- 앞 장 비교 Dice는 .72다. 2026-10-09·10 표본에서 독립 문장의 최고값(.70) 바로 위로 잡았다. 장 안 비교는 .8이다.
- 본문의 지장간 설명은 짧다. 원국표의 지장간 줄(`fortune/reading-presentation.ts:61-64`)이 보완한다.

## 결과 기록

- 2026-10-23 (워크트리 wt/yeongnyangi-followups-20261023-060746, base origin/main 7bc87244c, 항목마다 check:fast 통과, LLM 호출·운영 DB 접근 없음)
  - 1 — ab2119a83: `question-followup.ts`에 `pruneFollowup`. `manifest[0].repeatPolicy`가 `sentence-v1`인 주문의 새 추가 질문 답에만 저장된 장·앞선 답과 겹치는 문장 제거(`pruneRestatements`)를 건다. 옛 주문 답은 바이트 그대로. 분량 안내(budgetGuide) 하한 아래로는 줄이지 않고, 안내가 없으면 완전 중복만 지운다(가정: 추가 질문 답의 바닥은 그 안내의 하한).
  - 2 — efa390129: `natal-claims.ts`가 "N세(부터 M세까지) (간지) 대운"을 label이 있는 대운 주기의 만 나이 `ageRange`로 바꾼다. 간지 하나·나이 하나·주기 startAge/endAge 일치일 때만 고치고, 다른 사람·세운·이미 만 나이·여러 주기 문장은 그대로 둔다. 불변성 해시 변화 없음.
  - 3 — 79ffda868: `reading-presentation.ts`가 빈 칸만 채운다. 첫 교운 전 대운 → "대운 시작 전", 날짜 붙은 대운 → 본문 label 제목(다른 언어는 간지·교운 연월), 세운 → 연도 한 칸(타임라인은 그 해 전체), 다샤 start/end → 날짜. 있는 값은 그대로. sitemap lastmod(/fortune-tea-house/ 시그니처) 재생성 포함.
  - 4 — a99288e99: `retry.js`가 `repository.hasRequestAccess`를 쓴다. 월정석·서비스팩·PER_USE·무료체험 행 재시도가 `attachPayment`를 부르지 않는다는 jest 테스트 추가, 세 테스트 mock을 실제 판정과 맞췄다. `access-methods.js:6`은 그대로 둔다: SERVICE_PACK 기록(`payment-funding.js:48-55`)이 accessMethod·passEvidenceId·packEntitlementId를 함께 써서 실제 판정이 같고, 바꾸면 후기 자격만 넓어질 수 있다.
  - 5 — 코드 변경 없음. `scripts/audit-library-retention.mjs`는 CLI 뼈대(`--env-file`/`--db`만 받는 읽기 전용 가드, native MongoClient, ownerHash)만 재사용할 수 있다. 감사 함수 본문은 serviceexecutiontransactions 보존 기한용이라 쓸 수 없고, 증빙 판정이 5경로(PER_USE·무료체험·서비스팩·월정석·Family PointHistory, `repository.js:108`)라 native 컬렉션으로 새 함수를 짜야 한다. 운영 읽기는 승인 뒤에만.
  - push — origin/main `7bc87244c..a3423d25d`
- 2026-10-23 2차 (워크트리 wt/yeongnyangi-followups2-20261023-071519, base a3423d25d, LLM 호출·운영 쓰기 없음)
  - 5 — 운영 읽기 1회(승인: "남은 작업 끝까지 진행해줘"). 일회성 스크립트(커밋 안 함)가 `findNonCashEvidence`를 커밋 마커 없이 불러 find만 했다(autoIndex·autoCreate 끔). `yeongnyangi_requests` 비현금 접근 13건 스캔: MOONLIGHT_STONE 6·FAMILY 3·PER_USE 4, 모두 COMPLETED, 증빙 없음 0건. DIRECT_KRW(paymentId)는 범위 밖. 문서 규칙대로 받아들인 위험으로 닫았다.
  - 숙요 core — 89bf47c85: `question-policy.ts`의 `CORE_DOMAINS`에 sukuyo를 더하고, 숙요는 `coreAreas`로 건강을 빼 적성·연애만 쓴다. expanded layout과 legacy core 지시문 모두 같은 목록을 쓴다. 사주 지시문은 바이트 그대로, 불변성 해시 변화 없음, QUESTION_LAYOUT/POLICY_VERSION 그대로. `consultation-budget.test.mjs`에 숙요·타로 기대값 추가. sitemap lastmod 재생성 포함.
  - cda59aa3 v2 — 만들지 않음(사용자 결정), 받아들인 위험으로 이동.
  - push — origin/main `c10f67ace..` 위로 fast-forward(숙요 89bf47c85 + 이 문서 커밋), check:pre-push 통과
  - 운영 배포 — 릴리스 run 39882578653(mode=production, 99da0ed57) 성공. 사전 확인: 같은 커밋 PR CI·Main drift watchdog 통과
