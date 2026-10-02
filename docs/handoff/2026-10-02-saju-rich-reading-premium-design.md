---
status: active
updated: 2026-10-02
next: "docs/handoff/2026-10-02-saju-rich-reading-premium-design.md 를 읽고 남은 작업 1번(\"달라진 게 없다\" 원인 실측)부터 진행해줘"
---

# 사주 결과 화면 — 풍부한 해석 복원 2차: "달라진 게 없다" 해소 + 고급 디자인

작성 2026-10-02. 이전 세션 db9a5faf (상태 파일 `.claude/state/db9a5faf.md`).

## 사용자 요청 원문

1. "사주 화면에서 한난 조습이나 일주 프로파일링, 십성, 지금 내 시기, 올해의 나 등에 대해서 이전 버전이 그래프라든지 더 고급스러웠고 좋았는데 연이 말투로 하면서 다 회귀가 생겨버렸어 단순히 롤백하는것이 아니라 더 상세한 내용을 제공해주도록 개선해주고 연이 말투로 나오도록해주면 좋겠다. 그래프나 표 등도 더 보기 좋게 개선해"
2. "추가로 내용도 너무 없어졌는데 충분한 사주 명리학자로서의 내용이 들어가야하며 이전 버전을 참조해서 이전보다도 더 내용을 보강해줘야할것 같다"
3. (1차 전달 뒤) "지금 전에 달라진게 없어보이는데 디자인도 이전처럼 고급스럽게해서 내가 요청한 부분이 적용되어야하고 디자인도 고급스럽게 개선이 되어야할것 같다"

## 이미 끝난 것 (main 푸시 완료, 스테이징까지, 운영 승격 없음)

| 커밋 | 내용 |
|---|---|
| e05aa23f7 | `js/core/saju/reading-rich.js` 신설(ko 전용 순수 표시 모듈 `root.SajuReadingRich`), `reading-personas.js` render 분기, `saju-engine.js` setFlow 행 필드(label/summary/age/end/year/relations), `styles/saju-reading.css`, `index.html` script 1줄, `.ignore`, `docs/design/saju-reading-modes.md`, 테스트 `__tests__/ui/saju-reading-rich.test.mjs` |
| deaf0db3c | 360px 표 칸 nowrap(12자 초과 칸만 줄바꿈·한글(漢字) 묶음 유지), `.saju-rich` minmax(0,1fr), 요약 [태그] 정리, 개운 2x2, 상세 모달 열림 시 하단 내비 숨김 |
| 4ec8bc475 | origin/main 머지 → main push. CI 전부 success(PR CI·Paid Flow·AI Locale·Landing·drift·Secret·Business) |

들어간 내용: 조후 온도·습도 게이지+글자별 기여 표, 억부 강약 게이지+점수 구성표+득령/득지/득세+용신·희신·기신, 일주 원국 4주 표(지장간·12운성·궁위)+공망+연이의 한마디, 십성 분포 표+10성×4단 모달, 대운·세운 점수 막대+합충 칩+개운 4칸, 오늘·이달 에너지 게이지+십성 조언+행운 부스터 표.

## 🔴 사용자 판정: "달라진 게 없어 보인다" — 원인 미확인 (추정만 있음)

다음 세션은 **고치기 전에 원인부터 실측**한다. 후보(전부 미검증):

1. **운영 화면을 봤을 가능성** — 이 변경은 스테이징(`https://staging.code-destiny.com/ggulggul/`)에만 있다. 운영 승격 안 했다. 사용자에게 어느 주소에서 봤는지 확인하거나, 스테이징에서 `window.SajuReadingRich` 존재와 `#johuContent .saju-gauge` 개수를 확인한다(이 조사는 "스테이징 전용 버그 조사"라 스테이징 확인 허용 범위).
2. **캐시** — 셸의 `reading-rich.js?v=build-…` 재스탬프가 반영됐는지, 브라우저가 옛 셸을 쓰는지.
3. **새 판이 떠 있어도 "고급스럽지 않다"** — 가장 유력. 이번 구현은 토큰 색 단색 막대·평범한 표·문단 위주라 옛 판(그라데이션 게이지·카드형 레이아웃 등)보다 시각적으로 밋밋할 수 있다. 사용자가 비교 기준으로 삼는 것은 **회귀 직전 판(80204def4^)의 화면**이다.

## 남은 작업 (권장 순서)

1. 원인 실측(위 1·2). 운영을 본 것이면 그 사실을 보고하고 3으로.
2. **옛 판 화면 캡처로 "고급스러움"의 기준을 실측**:
   - `git worktree add <경로> 80204def4^` 로 옛 판을 띄워, 같은 입력(1991-02-20 12:00, 이름 "테스트")으로 `#iljuCard`·`#tsGrid`·`#johuContent`·`#ukbuSection`·`#currentSeasonSummary`·`#dailyPanel` 을 360/1280 캡처.
   - 현재 main 과 나란히 visual-checker 로 비교 → 옛 판이 가진 시각 요소(게이지 모양·그라데이션·카드 계층·아이콘·여백·타이포) 목록화.
   - 옛 렌더러 본문: `git show 80204def4^:js/saju-engine.js` 의 renderTenshin(~10489)·renderJohu(10508–10776)·renderUkbu(10777~), TS_DEEP(2030), ILJU_INNATE_DB(11137).
3. 큰 화면 개편이므로 CLAUDE.md 원칙 16: **방향과 성공 기준을 사용자에게 먼저 공유**(짧게) → 자율 구현 → 실제 화면 검증. 디자인 정본: `docs/context/design-canon.md` 먼저, 세부 `docs/context/design-and-ui.md`. impeccable 스킬(critique→polish) 활용 가능.
4. 구현 범위: `styles/saju-reading.css` 와 `js/core/saju/reading-rich.js` 의 마크업(게이지·표·카드 컴포넌트). 내용·계산은 유지.
5. 검증 → 커밋 → push(스테이징까지). 사용자가 스테이징에서 확인한 뒤 운영 승격은 별도 1회 승인.

## 지켜야 할 것

- `calcPower`·`analyzeJohu` 본문 수정 금지 — `scripts/extract-saju-runtime.mjs` 가 워커 런타임으로 추출·해시 고정. 구성표는 표시층 `powerParts`/`johuParts` + 엔진 결과 대조 fail-closed.
- 비한국어 로케일은 짧은 블록 유지(테스트 "비한국어에 한글 없음").
- 색은 `--reading-*`/`--cd-*` 토큰만, 새 hex·인라인 색 금지(인라인은 `--pos` 만), 탭 44px, 대비 4.5:1, 360px 가로 넘침 0. '~냥'·확정 예언·사용자를 돼지라 부르기 금지.
- 결제 게이트·가격·`buildCycle` 9항목·편지·헤더 토글 불변.

## 검증 방법 (실측된 명령)

- 단위: `node --test __tests__/ui/saju-reading-*.test.mjs __tests__/ui/saju-service-analysis.test.mjs` (37/37)
- 브라우저: `npm run dev`(포트 22042, mock) 뒤 `SAJU_READING_URL=http://127.0.0.1:22042 node scripts/verify-saju-reading-personas.mjs` (360/390/430/1440, 앵커 이동 ≤2.5px·유료 0·오류 0 이 현재 기준선), `npm run verify:saju-summary-browser`
- 섹션 캡처: playwright 로 `/ggulggul/` → `[aria-label="사주 분석 시작하기"]` 클릭 → `#nameInput`·`#birthDate`(19910220)·`#birthTimeText`(12:00) → `[data-action="checkPrivacyAndCalculate"]`·`agreeAndCalculate` 클릭 → `#dailyPanel .saju-reading` 대기. 연이/네오 전환은 `#sajuReadingHeader [data-saju-mode="neo"]`. 이미지는 visual-checker 로만 판정.
- `npm run check:fast` 1회.

## 🔴 실패·함정 (반복 금지)

- 캡처가 빈 화면: `.card{content-visibility:auto}` 때문. 캡처 스크립트에서 `.card{content-visibility:visible!important}` 주입 + scrollIntoView. 제품 버그 아님.
- 표 칸을 `nowrap` 으로만 바꾸면 섹션이 표 폭으로 늘어난다 → `.saju-rich{grid-template-columns:minmax(0,1fr)}` 필요(적용됨).
- TaskStop 으로 dev 서버를 끄면 npm 래퍼만 죽고 next 프로세스가 포트를 계속 잡는다 → 포트 리스너 PID 와 부모 트리를 종료.
- dev 서버·캡처와 `check:fast` 를 동시에 돌리면 test:node 에서 errno -4094·타임아웃 헛실패(1025s). 단독 실행하면 통과.
- `scripts/verify-saju-daewun-quality-browser.mjs` 는 :114(quantumCard `.rpt-v2-detail` 높이 대기) 타임아웃 — base 097102a02 에서도 동일한 선존 실패.
- `measure:touch-targets` 로컬은 networkidle 타임아웃 → 결과 섹션 직접 측정으로 대체.
- 메인 체크아웃을 다른 세션이 공유 중이면(미커밋·미푸시 커밋) 거기서 머지하지 말고 워크트리에서 origin/main 머지 후 `git push origin HEAD:main`. 머지 충돌은 `config/sitemap-lastmod.json` 만 → theirs + `npm run sitemap:generate` + `npm run sync:public`.

## 후속 과제 (보고만, 이번 범위 밖)

- 비한국어 로케일 풍부한 판 미적용.
- `NEO_GAEUN_DB` 에 반말 혼재 → 현재 양 모드 `GAEUN_DB` 사용.
- `#tsGrid` 선존 하드코딩 hex, tsModal `.modal-box` 흰 바탕·28px 패딩이 네오 어두운 카드에 흰 테두리, 닫기 X 대비 ~1.5:1, 360 모달 위 ~50px 빈칸.
- daewun-quality 검증기 타임아웃(선존).

근거를 못 찾으면 추측하지 말고 사용자에게 묻는다.
