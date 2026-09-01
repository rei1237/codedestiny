---
status: active
updated: 2026-09-01
next: "PR-A(홈 INP · 강제 동기 레이아웃 2곳)를 다음 세션에서 착수. PR-C 는 #1398 로 머지됐다. 계획 정본은 `C:\\Users\\user\\.claude\\plans\\toasty-doodling-metcalfe.md`"
---

# 홈 화면 3축 개선 — UI/UX · 성능 · 마케팅

## 왜

홈(`/`)을 축별로 따로 손대 왔다. 2026-09-01 에 세 축을 한 번에 진단해 점수를 매기고 **축마다 값이 가장 큰 레버 하나씩만** 잡기로 했다. 진단 점수와 기각 근거 전문은 계획 문서에 있다.

| 축 | 점수 | 최악 지표 | 이번에 잡는 것 | 상태 |
|---|---:|---|---|---|
| 마케팅 | 41 | 미크롤 173건 전부 `1970-01-01` | SNS 발행 문안에 해시태그 | ✅ **머지됨 — PR #1398** (`2f64dc581`) |
| 성능 | 54 | INP 616ms (기준 200) | 강제 동기 레이아웃 2곳 제거 | 미착수 |
| UI/UX | 62 | 인터랙티브 308개 / 문서 12,121px | `#cdFinder` 기본 렌더 신설 | 미착수 |

사용자 결정 3건이 전제다: ① 해시태그는 푸터가 아니라 **SNS 발행 문안**에. ② 성능은 **동작 변경을 포함한 INP 수정**까지 간다. ③ UI/UX 는 **검색 기본 렌더 하나만**.

## 지금 상태

- **PR-C 닫힘** — PR #1398 머지(`2f64dc581`, 2026-09-01). 텔레그램 4개(고정 3 + 요일 코너 1) · Threads 루트 1개 · 답글 0개. `clampThreadsText` 가 끝에서 자르므로 `appendRootHashtag` 가 태그 몫을 상한에서 먼저 뺀다. 음성 대조 실측(본문 2,000자 · 상한 480): 붙인 뒤 클램프 → 태그 소실, 예산 먼저 확보 → 생존. 가드는 `verify:sns-daily-post` ⑱.
- **PR-A · PR-B 미착수.** 계획 문서에 줄 번호·함정·검증 명령이 그대로 있다.

## 남은 작업

- [ ] **PR-A — 홈 INP**: `openOverlay` 의 `savedScrollY` 읽기를 `__cdExpandHome()` **위로**(317ms), `showOverview` 의 `panel.scrollTop` 대입을 `classList.add` **앞으로**(143ms). 🔴 전자는 **동작 변경**(복원 위치가 "펼치기 전")이고 사용자가 동의했다.
- [ ] **PR-B — `#cdFinder` 기본 렌더**: `render()` 의 `!active` 분기를 "감추기"에서 "`CURATED` 앞쪽 6~8개"로. 새 카피 0 · 새 렌더러 0.
- 판정 기준: PR-A 는 `perf:recalc-origin` 기준선 656 [640-688] 과 밴드 비겹침, PR-B 는 `perf:home` CLS 가 기준선 0.001 근처.

## 정본

- 계획(줄 번호·기각 근거·검증 명령): `C:\Users\user\.claude\plans\toasty-doodling-metcalfe.md`
- INP 원인 규명: [home-lcp-inp-2026-08-28.md](home-lcp-inp-2026-08-28.md) §9-3 / §9-6
- SNS 발행 계약: [marketing-automation-2026-08-28.md](marketing-automation-2026-08-28.md)

## 함정

- 🔴 **PR 순서**: PR-C(독립) → PR-A(`index.html` + 미러 6벌) → PR-B(**PR-A 위에 스택, 자식부터 머지**). A·B 는 둘 다 `sync:public` 미러를 재생성해 병렬로 열면 생성 파일이 충돌한다.
- 🔴 `index.html` 은 **CRLF** 다 — Edit/sed 말고 node 패치 스크립트로 고치고 개행 개수를 검산한다.
- 🔴 PR-B 는 홈 노출 텍스트가 늘어 `build:cf` 의 `[adsense-readiness]` 와 `verify:indexable-prose-depth` 를 반드시 통과시켜야 한다. `build:cf` 가 흔드는 `rss.xml` `lastBuildDate` 는 되돌리고 `sync:public` 산출물은 담는다.
- 홈 검색 카탈로그를 첫 타이핑 때 만들었다가 **CLS 0.3185** 를 낸 실사고가 있다(`js/core/home-service-finder.js:336-339`). 기본 렌더는 boot 시점이라 안전할 것으로 **추정**이며, `perf:home` 으로 실제 수치를 재서 보고할 것.

## 안 건드리는 것 (발견했지만 범위 밖)

- `/services/*` 7경로 휴면 결함 — `app/services` 없음 · sitemap 0건인데 `data-service-detail-href="/services/…"` 가 7개 타일에 남아 있다. 지금은 `_cdNavigateToServiceDetail` 의 조기 반환이 막아 불발이지만, 그 가드를 건드리면 7개가 404 로 간다. **별도 PR 후보.**
- 스킵 링크 0건 · `href="/points/"` 슬래시 드리프트 2건 · 푸터 사업자 정보 `<details open>`.
- 첫 화면 섹션 재배치 — 2026-08-30 에 4개 중 3개가 틀린 전제로 기각된 이력이 있어 **재실측이 선행**이다.

## 미검증

- 텔레그램 문안의 **세차(연주)가 틀린다** — `getTodayPillars` 가 입춘 절입을 안 봐서 2026-01-02 문안이 `병오년`이다(Threads 는 역법 코어라 `을사년`으로 옳다). `verify:sns-daily-post` ⑫ 가 일부러 대조하지 않는 **알려진 결함**이고 정정은 별도 PR 이다.
- PR-C 의 프로덕션 효과(태그가 실제 발행 글에 붙는지)는 머지 후 첫 크론(07:00 KST) 뒤에야 확인된다.
