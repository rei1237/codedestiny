---
status: active
updated: 2026-10-02
next: "docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 A3(일주 상세 분석 토글 상태 불일치)를 진행해줘"
---

# 사주 결과 화면 — 범위 밖 후속 과제 모음

작성 2026-10-02. 이전 세션 9d880027(상태 파일 `.claude/state/9d880027.md`).
선행 작업은 끝났고 main 에 있다. 마지막 커밋은 ccbdda1cd 이며 CI 전부 통과, 운영에는 미승격이다.

- b8baea59d 고급 디자인
- d9ff931ad 대운 점수 이전 판정 복원
- c24468814 한난조습 월지 12단계
- 선행 문서: `docs/handoff/2026-10-02-saju-rich-reading-premium-design.md`(완료), 계약 `docs/design/saju-daewun-interpretation-contract.md`

## 사용자 요청 원문

"범위 밖 후속 과제들도 다른 세션에서 할 수 있도록 인수 인계 문서와 명령어를 작성해"

## 다음 세션 시작 명령

과제마다 한 세션씩 쓴다. 아래 문장을 그대로 붙여 넣는다.

```
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 A1(일주 금 44% vs 막대 50%)부터 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 A2(흐름 0점 이름·문단 모순과 중복)를 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 A3(일주 상세 분석 토글 상태 불일치)를 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 B1(iljuCard 상단 구 컴포넌트 디자인 정리)을 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 B2(tsModal 네오 모드 시각 결함)를 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 B3(쌓인 표의 스크린리더 의미)를 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 C1(NEO_GAEUN_DB 반말 정리)을 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 C2(비한국어 로케일 풍부한 판)를 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 D1(daewun-quality 검증기 타임아웃)을 진행해줘
docs/handoff/2026-10-02-saju-rich-reading-followups.md 를 읽고 E1(47030b73d 의 남은 해석 변경 검토)을 진행해줘
```

여러 세션을 동시에 돌리면 두 번째부터 워크트리를 만든다(`scripts/create-safe-worktree.ps1`). 같은 파일(`js/core/saju/reading-rich.js`)을 건드리는 A2·B3·C2 는 동시에 돌리지 않는다.

## 과제 목록

등급은 CLAUDE.md 기준이다. 근거가 "실측"이면 2026-10-02 캡처(1991-02-20 12:00, 이름 "테스트")와 visual-checker 판정에서 본 것이다.

### A. 내용 불일치 (먼저)

**A1. 일주 카드: 본문 「금 44%」 vs 막대 「금 50%」** — ✅ 완료 2026-10-03 (de87e8a2a). 막대가 월지 가중 없는 8글자 개수를 쓰던 것을 정본 `calcNatalElement(p).ratios` 로 바꿨다(엔진 계산 무변경). 1991-02-20 12:00·08:00 에서 본문·막대 다섯 값 일치 실측.
- (아래는 원래 기록)
- 같은 명식에서 본문 문장과 오행 막대가 서로 다른 비율을 보여 준다.
- 할 일: 두 값의 출처를 찾는다. 후보는 `calcNatalElement` 계열과 막대 렌더의 반올림·분모(시주 포함 여부, 지장간 가중) 차이다. 어느 쪽이 정본인지 정하고 한쪽에 맞춘다.
- 🔴 운세 엔진 계산(`calcPower`·`analyzeJohu` 등 `scripts/extract-saju-runtime.mjs` 추출 대상)을 바꾸면 RED 다. 그 경우 `--write` 재생성과 `__tests__/ui/yeongnyangi-reading-invariance.test.mjs` 해시 갱신이 따른다. 표시층에서 해결되는지 먼저 본다.

**A2. 흐름(지금 시기) 0점 모순과 문단 중복** — ✅ 완료 2026-10-03 (698a27cba). 톤 문단을 FLOW_NAMES 구간(at) 기준 세 갈래(0~1 care·2 even·3~4 open)로 고르고 정도 표현을 뺐다. 대운·세운이 같은 톤이면 문단을 한 번만 낸다. 테스트 1건 추가(0·50·100점, 두 모드 동시 care).
- (아래는 원래 기록)
- `js/core/saju/reading-rich.js:536` 의 `FLOW_NAMES` 에서 0점은 '조율이 많이 필요한 흐름'이다. 그런데 `:579` 는 `FLOW_TONE[good ? 'open' : 'care']` 두 갈래뿐이라 '조율이 조금 필요한 흐름으로 읽혀요…' 문단이 함께 나온다.
- 대운 행과 세운 행이 둘 다 care 면 같은 `FLOW_TONE` 문단이 섹션 안에서 두 번 나온다.
- 할 일: 문단 톤을 `at`(0~4 구간) 기준으로 고르거나 문구를 구간 중립으로 바꾼다. 같은 문단은 한 번만 나오게 한다.
- 테스트: `__tests__/ui/saju-reading-rich.test.mjs` 에 0점·100점 행과 대운+세운 동시 care 사례 1건을 추가한다.

**A3. 일주 「상세 분석 보기 ▼」 토글이 이미 펼친 내용과 어긋남** — GREEN 추정. 실측(1280).
- 버튼은 접힘 표시(▼)인데 아래 상세가 이미 펼쳐져 있다.
- 위치: `index.html:19426` `#iljuToggleBtn`(data-action `toggleIljuDetail`), 엔진 `js/saju-engine.js:9905`·`:10084` 의 버튼 문구 설정.
- 할 일: 초기 펼침 상태와 버튼 문구·`aria-expanded` 를 한 곳에서 맞춘다. 정적 셸 정본은 `index.html`·`js/*` 이고, 고친 뒤 `npm run sync:public` 결과 미러를 같은 커밋에 담는다.

### B. 디자인·접근성

**B1. iljuCard 상단 구 컴포넌트** — GREEN.
- 고급 디자인(b8baea59d)은 풍부한 해석 섹션만 바꿨고 iljuCard 상단은 옛 컴포넌트다.
  - 이모지 제목
  - 네오 모드의 남색 카드
  - 빈 막대 트랙의 대비 부족
- 기준: `docs/context/design-canon.md` 를 먼저 읽고 `styles/saju-reading.css` 의 `--reading-*` 토큰과 섹션 hue 방식에 맞춘다.
- 제약(선행 문서 '지켜야 할 것'): 새 hex·인라인 색 금지, 대비 4.5:1(UI 3:1), 탭 44px, 360px 가로 넘침 0, 연이 모드에 파랑 금지.

**B2. tsModal(십성 상세 모달) 네오 모드** — GREEN. 실측.
- `.modal-box` 의 흰 바탕과 28px 패딩이 네오 어두운 카드에서 흰 테두리처럼 보인다.
- 닫기 X 대비가 약 1.5:1 이다.
- 360px 에서 모달 위에 약 50px 빈칸이 있다.
- `#tsGrid` 에 하드코딩 hex 가 남아 있다.

**B3. 쌓인 표(≤520px 카드형)의 스크린리더 의미** — GREEN.
- b8baea59d 는 4열 이상 표를 좁은 화면에서 카드로 쌓는다. 셀 `data-label` 을 쓰고 thead 는 `display:none` 이다.
- 이 상태에서 스크린리더가 열 머리를 읽지 못할 수 있다(미검증).
- 할 일: 쌓인 상태에서도 열 머리가 전달되는지 확인한다. 안 되면 thead 를 시각적으로만 숨기는 클래스나 셀별 머리 텍스트로 바꾼다.
- 360 넘침 0 은 유지한다(선행 문서: neo 360 표 넘침을 thead 숨김으로 해결했다).

### C. 문구·로케일

**C1. `NEO_GAEUN_DB` 반말 혼재** — GREEN.
- `js/saju-engine.js:4538` 에 반말이 섞여 있어, 지금 `reading-rich.js` 는 두 모드 모두 `GAEUN_DB` 를 쓴다.
- 할 일: 네오 말투(존댓말·단정)로 정리한 뒤 네오 모드에서 `NEO_GAEUN_DB` 를 쓰게 한다.
- 금지어 검사(테스트·verify)를 통과해야 한다.

**C2. 비한국어 로케일에 풍부한 판 미적용** — RED 가능(문구 대량·i18n 사전).
- 지금 비한국어는 짧은 블록이고, 테스트 "비한국어에 한글 없음"이 이것을 지킨다.
- 저작 로케일은 en·ja·zh-CN·zh-TW 이고 나머지 7개는 영어 복사다(메모리 로케일 함정).
- 범위가 크므로 방향(어느 섹션을, 몇 개 로케일에)을 사용자와 먼저 맞춘다.

### D. 검증기

**D1. `scripts/verify-saju-daewun-quality-browser.mjs` 타임아웃** — GREEN(검증기만).
- `:114` quantumCard `.rpt-v2-detail` 높이 대기에서 멈춘다.
- base 097102a02 에서도 같은 실패가 나는 선존 결함이다.
- 할 일: 대기 조건이 현재 DOM(접힘·`content-visibility:auto`)과 맞는지 보고 고친다. 대기를 늘리는 땜질은 하지 않는다.
- 가드는 fail-closed 로 둔다.

### E. 해석 규칙 (사용자 판단 필요)

**E1. 47030b73d 의 남은 해석 변경** — RED(운세 엔진·유료 AI 입력).
- 이번에는 대운 점수(`evalDaewun`·`evaluateDaewun`)만 사용자 지시로 되돌렸다.
- 같은 커밋이 바꾼 아래 두 곳은 그대로다. 사용자가 "대운"만 지목했기 때문이다.
  - `getQuantumElType` 의 기후 보정(`js/saju-engine.js:4196`)
  - `analyzeFortuneGZ`
- 할 일: 47030b73d 전후 결과를 몇 명식에서 실측해 차이를 보여 준다. 되돌릴지는 사용자에게 묻는다(선택지에는 추천과 이유를 붙인다).
- 금지어 검사에 걸리는 옛 문구(화련진금·제련발복·보석용해 등)는 되살리지 않는다.

## 이미 알려진 사실 (다시 조사하지 말 것)

- 1991-02-20 辰시(辛未 庚寅 辛酉 壬辰)는 이제 조후 −4, 서늘한 사주다. 조후용신이 화·목이 되어 용신 1순위가 수→화로 바뀌었고, 그래서 대운 점수가 복원 직후 값과 다르다(壬辰 12, 丙申 27, 戊戌 57). 계산 방식은 정상이고 의도된 결과다.
- 조후 월지 표는 다섯 곳에 사본이 있고 한 번에 같이 고친다. 바꾸면 `node scripts/extract-saju-runtime.mjs --write` 와 invariance 해시 갱신이 필요하다.
  - `js/saju-engine.js` analyzeJohu(정본)
  - 추출 런타임 `worker/yeongnyangi/fortune/saju-runtime.mjs`
  - `worker/lib/saju-yongshin-policy.js`
  - `worker/routes/admin.js` buildAdminSajuJohuProfile
  - `js/core/saju/reading-rich.js` BRANCH_TEMP

## 검증 명령 (실측된 것)

```
# 단위
node --test __tests__/ui/saju-reading-*.test.mjs __tests__/ui/saju-service-analysis.test.mjs __tests__/ui/saju-luck-rules.test.mjs __tests__/ui/saju-daewun-evidence.test.mjs

# 엔진·추출 드리프트(엔진을 건드렸을 때)
node scripts/extract-saju-runtime.mjs
node scripts/sync-saju-luck-rules.mjs
node scripts/test-saju-daeun-consumer-parity.mjs
node --test __tests__/ui/yeongnyangi-reading-invariance.test.mjs
#   의도된 변경이면: YEONGNYANGI_INVARIANCE_PRINT=1 로 다시 출력해 표를 갱신(파일은 CRLF)

# 브라우저(mock). dev 서버와 check:fast 를 동시에 돌리지 않는다.
npm run dev                       # 포트 22042
SAJU_READING_URL=http://127.0.0.1:22042 node scripts/verify-saju-reading-personas.mjs
npm run verify:saju-summary-browser

# 전달 전
npm run sync:public               # 정적 셸(index.html·js/*)을 고쳤으면 미러를 같은 커밋에
npm run verify:public-mirror-fresh   # 깨끗한 트리에서만 판정한다
npm run check:fast
```

화면 캡처는 visual-checker 에이전트로 보낸다. 메인 세션에서 이미지를 직접 읽지 않는다.
결과 화면은 로그인 게이트가 있다. playwright 에서는 initScript 로 `window.__dpVerifyResultSession` 을 `async()=>'authenticated'` 로 정의한다.

## 🔴 실패·함정 (반복 금지)

- **origin/main 머지 뒤 `sync:public` 을 한 번만 돌리면 미러의 `index-inline-runtime.js?v=build-…` 해시가 덜 수렴할 수 있다.** 748e398e8 이 그렇게 CI(Static guards·Main drift)에서 실패했다.
  - 머지 커밋 뒤 `sync:public` 을 한 번 더 돌린다.
  - 깨끗한 트리에서 `npm run verify:public-mirror-fresh` 가 OK 인지 본 다음 push 한다.
  - 트리가 더러우면 이 검증기는 판정을 거부한다. 이때 출력되는 파일 목록은 실패 목록이 아니다.
- 사주 계산을 바꾸면 `config/sitemap-lastmod.json` 의 `/naming-ai/` 서명이 바뀐다. `npm run sitemap:generate` 결과를 같은 커밋에 담는다.
- 조후 표가 바뀌면 `__tests__/ui/saju-service-analysis.test.mjs` 의 "한난 유형 3종 이상" 픽스처 조건이 깨질 수 있다. 1988-08 申월 예시가 서늘함→보통으로 바뀐 전례가 있다.
- Windows 셸에서 `python` 은 스토어 스텁이라 멈춘다. 스크립트는 node 로 쓴다.
- dev 서버를 TaskStop 으로 끄면 next 프로세스가 포트를 계속 잡는다. 포트 리스너 PID 를 직접 종료한다.
- 메인 체크아웃에는 다른 세션의 미커밋 파일이 있을 수 있다(marketing/*, tsconfig.json, next-env.d.ts). 그 파일은 건드리지 않는다.

## 롤백

과제마다 커밋 하나로 만들고, 문제가 생기면 그 커밋만 `git revert` 한다. 선행 커밋 b8baea59d·d9ff931ad·c24468814 는 서로 독립이라 각각 되돌릴 수 있다.

근거를 못 찾으면 추측하지 말고 사용자에게 묻는다.
