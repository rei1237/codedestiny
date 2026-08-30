---
status: active
updated: 2026-08-30
next: "§5 로드맵 P1~P6 이 전부 닫혔다. 다음 후보는 요청 19(A/B) 인데 P 번호가 없어 착수 전 순위 확인이 필요하다"
---

# Code Destiny 전면 개선 감사 (요청 20단계 → 레포 실측 매핑)

작성 2026-08-30 · 근거 브랜치 `worktree-home-hero-positioning-0830`

이 문서는 "현재 상태 요약본"이 아니다. **요청서의 20단계를 레포에 이미 있는 정본과 대조해, 진짜로 남은 것만 남긴 델타**다.
겹치는 내용은 재서술하지 않고 링크로 가리킨다.

## 0. 요청서는 문서 5건을 요구했는데 1건만 쓴 이유

요청서가 요구한 5개 문서(구조 감사·SEO 감사·전환 설계·성능·최종 리포트)는 **축마다 이미 정본이 있다.**
새로 5건을 쓰면 그 정본과 어긋나는 낡은 요약이 5개 더 생긴다 — [docs/CONTEXT_AUDIT.md](CONTEXT_AUDIT.md) 가 "요약이 낡는 것이 정확히 이 사고의 형태였다"고 적어 둔 실패 양식이다.

| 요청서가 요구한 문서 | 이미 있는 정본 |
|---|---|
| 프로젝트 구조 감사 | [CLAUDE.md](../CLAUDE.md) 라우팅 표 + `npm run verify:guard-wiring` 출력 |
| 기술 SEO 감사 | [docs/context/seo-and-adsense.md](context/seo-and-adsense.md) |
| 결제·전환 설계 | [docs/context/payment-gating.md](context/payment-gating.md) · [docs/handoff/monetization-free-paid-boundary.md](handoff/monetization-free-paid-boundary.md) |
| 서비스 노출/계층화 | [docs/handoff/service-exposure-audit-2026-08-24.md](handoff/service-exposure-audit-2026-08-24.md) |
| 홈 퍼널 | [docs/handoff/home-conversion-funnel.md](handoff/home-conversion-funnel.md) |
| 성능 | [docs/handoff/home-lcp-inp-2026-08-28.md](handoff/home-lcp-inp-2026-08-28.md) · [docs/handoff/desktop-tbt-2026-08-29.md](handoff/desktop-tbt-2026-08-29.md) |

## 1. 요청 20단계 → 상태

`완료`는 코드에 있는 것을 확인한 것이고, `미착수`는 위 정본 문서에 항목으로 등재된 것이다.

| 단계 | 상태 | 근거 |
|---|---|---|
| 0. 구조 감사 | 완료(이 문서) | — |
| 1. 홈 메시지·포지셔닝 | **이번 세션에서 수정** | §4 |
| 2. 서비스 과다노출 → Tier 1/2/3 | 대부분 완료 | `data-cd-home-secondary` 16개(초기 노출 축소+펼치기), `#cdQuickServices` 6개, `#cdSignatureConsult` 4개, `#cdFinder` 목적/방식/가격 필터. 정본 `js/core/service-registry.js` 43항목 |
| 2-보완. 차별점 노출 순서 | **이번 세션에서 일부 수정** | §4 (`#cdWhyUs` 카드 순서 + 히어로 배지). 섹션 자체의 위치 이동은 미착수 — §5 P2 |
| 3. 의도 기반 진입점 | 완료 | `#cdConcernPick` 6축 + 상품 1:1 매핑 |
| 4. 핵심 퍼널·이벤트 계측 | 완료 | §5 P4. 결제·무료사주·인증·리텐션은 이미 있었고, 빠져 있던 홈 섹션 귀속을 2026-08-30 에 채웠다 |
| 5. 유료 상품 재편 | 미착수 | [monetization-free-paid-boundary.md](handoff/monetization-free-paid-boundary.md) |
| 6. 기술 SEO 감사 | 사실상 포화 | §3-3 |
| 7. 검색 의도 SEO 구조 | 진행 중 | [seo-content-expansion-roadmap.md](handoff/seo-content-expansion-roadmap.md) |
| 8. SEO 콘텐츠 → 서비스 연결 | 대체로 완료 | CTA 는 9곳 전부 있었다(2026-08-30 재실측). 남은 것은 계측 귀속이고 `ImmersiveRelatedLinks` 19개 라우트는 처리했다 — [seo-content-expansion-roadmap.md](handoff/seo-content-expansion-roadmap.md) §2. 🔴 여기가 가리키던 `service-exposure-audit-2026-08-24.md` §4-2 는 그 문서 자신이 2026-08-30 에 해소로 표시했다 |
| 9. 로케일·hreflang | 완료(셸) | [locale-sweep-2026-08-25-part4.md](handoff/locale-sweep-2026-08-25-part4.md). 색인 로케일은 ko·en·ja·zh·zh-TW 5개(`lib/i18n/locales.ts`) |
| 10. 모바일 UX | 진행 중 | 최근 PR #1293(스티키 CTA 겹침), #1292(탭 라벨) |
| 11. 성능 | 진행 중 · SEO 레버 아님 | §3-2 |
| 12. API 호출·503 | 미착수 | [payment-503-and-renderer-unification.md](handoff/payment-503-and-renderer-unification.md) |
| 13. AI 비용 | 진행 중 | [llm-optimization-leftovers.md](handoff/llm-optimization-leftovers.md) |
| 14. 결제 전환 UX | **투자 보류 권고** | §3-1 |
| 15. 연이·네오 캐릭터 UX | 브랜드 분산은 완료, 캐릭터 UX 자체는 미착수 | §5 P5. 상품명에서 캐릭터를 뺀 것이 브랜드 분산의 실체였다(1건). 말투·페르소나 강화는 별개 작업으로 남아 있다 |
| 16. 콘텐츠 마케팅 구조 | 진행 중 | [seo-content-expansion-roadmap.md](handoff/seo-content-expansion-roadmap.md) |
| 17. 신뢰 | 부분 | 히어로 신뢰배지 3종(§4에서 3번을 차별점 설명으로 교체) |
| 18. 애널리틱스·KPI | 계측·정의 완료, 화면은 미착수 | 계측은 §5 P4. KPI 정의·이벤트 인벤토리·대시보드 구성은 [analytics-kpi.md](analytics-kpi.md)(2026-08-30). 남은 것은 GA4 UI 작업과 1st-party 조회기 1개(같은 문서 §6) |
| 19. A/B 가능한 홈 구조 | 미착수 | 로드맵에 P 번호가 없다. 선행 조건이던 계측(P4)은 닫혔다 |
| 20. 최종 검증 | 이번 변경분만 | §4 검증 목록 |

## 2. 이번 세션 신규 실측 (2026-08-30)

| 사실 | 값 | 재현 |
|---|---|---|
| 홈 H1 이 차별점이 아니라 **폭(breadth)** 을 판다 | `무료 사주부터 자미두수·점성술까지, 지금 이 순간의 나` | `grep -n 'home.hero2.title' index.html` |
| 같은 "폭" 문구가 **12개 로케일 사전 전부** | `home.hero2.title` 12/12 | `node -e` 로 `public/i18n/*.json` 순회 |
| 차별점(교차검증)은 **2차 CTA 로 강등**돼 있었다 | `사주·타로 여섯 체계 교차검증 →` | `grep -n 'k107dp07' index.html` |
| `#cdWhyUs` 는 마크업·CSS 외 소비자 0 | JS·scripts·__tests__·app 참조 0 | `git grep -n "cdWhyUs\|cd-why-us"` |
| `verify:*` 스크립트 | **273개** | `node -e "…Object.keys(scripts).filter(k=>k.startsWith('verify:')).length"` |
| 사이트맵 URL | **439개** | `grep -c "<loc>" public/sitemap.xml` |
| 루트 `index.html` 은 순수 LF | CRLF 0 / LF 36,910 | 패치 스크립트의 개행 검산 |

🔴 위 273·439 는 **2026-08-30 값**이다. 문서에 개수를 박아 두면 낡으므로, 인용 전에 재현 명령을 다시 돌린다.

## 3. 요청서 전제 중 레포 실측과 어긋나는 것

작업 대상에서 **뺐다.** 근거는 아래 기록(측정일 포함)이며, 이번 세션에서 재측정하지는 않았다(`미검증` 표시).

### 3-1. "전환율이 낮다" → 병목은 전환율이 아니라 모수 (미검증 · 기록 기준)

90일 프로덕션 DB 기준 **결제창 도달 고유 사용자 20명, 실구매 0**. 전환율을 2배로 올려도 절대값이 움직이지 않는다.
→ 요청 단계 3·4·14 의 "결제 인접 UI 과투자"는 배수가 없다. 유입(6·7·8·16)이 먼저다.

### 3-2. "CWV 개선이 SEO 레버" → 필드 데이터 자체가 없다 (미검증 · 기록 기준)

CrUX origin/url 8개 조합 전부 404. 필드 데이터가 없으면 CWV 는 랭킹 입력이 아니다.
→ 성능(11·20)은 **체감 품질 과제**로만 유효하다. 실제로 CLS 는 스테이징에서 0, 프로덕션에서 0.275 로 갈리므로(광고 유발) 스테이징 수치로 판정하지 않는다.

### 3-3. "기술 SEO 가 미비할 것" → 이미 포화

`verify:*` 273개, 사이트맵 439 URL, 색인 결정 5개소 계약(`sitemap`·`robots`·`metadata`·`hub link`·`prose depth`).
남은 SEO 레버는 **감사가 아니라 본문 분량과 허브 링크**다 — [service-exposure-audit-2026-08-24.md](handoff/service-exposure-audit-2026-08-24.md) §4.

## 4. 이번 세션에서 실제로 고친 것

**포지셔닝 1건만** 손댔다. 삭제 0건, 라우트 변경 0건, 결제 경로 변경 0건.

| 위치 | 전 | 후 |
|---|---|---|
| `index.html` H1 (`home.hero2.title`) | 무료 사주부터 자미두수·점성술까지, 지금 이 순간의 나 (30자) | 여섯 체계가 같은 답을 가리키는지, 교차검증합니다 (27자) |
| lead (`shell.normalLogo.moonHeroCopy.kbm4p3d`) | 사주·타로…각 체계의 기준대로 읽습니다. (49자) | 한 체계의 결론을 다른 체계로 확인합니다. 생년월일만 넣으면 무료로 시작할 수 있습니다. (49자) |
| 2차 CTA (`shell.moonHeroCopy.moonHeroActions.k107dp07`) | 사주·타로 여섯 체계 교차검증 → (18자) | 초융합 리딩 자세히 보기 → (15자) |
| 히어로 신뢰배지 3번 | `#honeyMembershipMini` · 이용권 · 문라이트 패스 안내 | `#cdWhyUs` · 여섯 체계 교차검증이란 |
| `#cdWhyUs` 카드 순서 | 여러 관점 → 개인화 → AI 해석 → 초융합 | **초융합** → 여러 관점 → 개인화 → AI 해석 |

- 1차 CTA(`#cdTodayHub` · `✦ 무료로 오늘의 운세 보기`)는 **건드리지 않았다** — 요청서의 "미관 목적 1차 CTA 이동 금지".
- 글자 수를 ±3자 안에 맞춘 이유: 모바일 줄바꿈 수가 바뀌면 히어로 높이가 변해 CLS 가 난다(`cd-hero-firstpaint-hoist-v20260725`).
- 배지 3번은 **삭제가 아니라 재조준**이다. `#honeyMembershipMini` 섹션·`/points` 라우트·결제창 [이용권으로 구매] 카드는 전부 그대로다.
- 옛 키 `home.heroTrust.membership{,Aria}` 는 12개 사전에 **남겨 뒀다**(되돌리기 비용 0).
- 비색인 7개 로케일(vi·hi·es·fr·de·nl·ms)의 lead·2차 CTA 는 **옛 문구가 남는다.** 의도된 선택이다(색인 로케일만 맞추면 SEO 영향이 닫힌다). 새 배지 키는 12개 전부 채웠다 — 안 채우면 그 7개가 한국어를 그대로 렌더한다.

## 5. 남은 로드맵 (우선순위)

한 세션에 **한 항목**만. 근거 문서를 먼저 읽고 시작한다.

| 순위 | 항목 | 근거 |
|---|---|---|
| ~~P1~~ | ✅ 2026-08-30 완료 — 390x844/412x823 에서 히어로 높이 변화 0px · CLS 0.00082(히어로 아님). 수치·한계는 [home-positioning-2026-08-30.md](handoff/home-positioning-2026-08-30.md) | 광고발 CLS 는 여전히 미측정(프로덕션 전용) |
| ~~P2~~ | ✅ 2026-08-30 완료 — `#cdWhyUs` 를 `<style>` 블록째 `#cdSignatureConsult` 앞으로 이동 | 이동 전후 CLS·docHeight 동일 |
| ~~P3~~ | ✅ **이미 끝나 있었다**(2026-08-24 에 처리됨) — 2026-08-30 dist/ 실측으로 확인. 아래 표 참고 |
| ~~P4~~ | ✅ 2026-08-30 완료 — 전제가 절반 낡았다(아래 표). 실제 구멍은 **홈 섹션 귀속** 하나였고 `home_section_click` 으로 채웠다. [home-funnel-attribution-2026-08-30.md](handoff/home-funnel-attribution-2026-08-30.md) |
| ~~P5~~ | ✅ 2026-08-30 완료 — **여기도 전제가 절반 낡아 있었다**(아래 표). 남은 실체는 상품명 1건이었고 `대화형 운명 상담` 으로 개명했다 |
| ~~P6~~ | ✅ 2026-08-30 완료 — **여기도 전제가 낡아 있었다**: `premiumCta` 내용은 이미 고민별이었고(allowlist `GUARDIAN_FORTUNE_CTA_BY_TOPIC`), 실제 구멍은 `app/fortune-chat/FortuneChatClient.tsx` 가 그 필드를 **한 번도 읽지 않은 것**이었다. PR #1314 | 화면 실물은 미검증 — 마무리 CTA 는 상담 1건 실호출이 있어야 나온다 |

### P4 의 전제도 절반이 낡았다 — 2026-08-30 재실측

P4 의 근거는 "`useAnalytics` 호출자 0" 이었다. 그건 사실이지만 **그 훅이 계측의 정본이 아니다.**
계측 정본은 `js/core/analytics.js` 가 설치하는 `window.cdTrack` 이고, 홈이 정적 셸이라 React 훅은
애초에 홈에서 돌 수가 없다. 훅의 호출자 수를 계측 유무의 지표로 쓴 것이 오독이었다.

| 요청서가 원한 퍼널 단계 | 2026-08-30 실측 |
|---|---|
| 결제창 진입·옵션 선택·성공/실패 | **이미 있었다** — `js/core/checkout-entry.js` 의 `FUNNEL_EVENTS` 6종. GA4 + 1st-party `/api/billing/funnel-event` 양쪽 |
| 무료 사주 시작·완료 | **이미 있었다** — `js/saju-engine.js` 의 `free_saju_started`/`free_saju_completed` |
| 구매·인증·리텐션·공유 유입·크로스셀 | **이미 있었다** — `purchase`, `retention_visit`, `share_receive`, `cross_sell_click` |
| **홈의 어느 섹션이 그 클릭을 만들었나** | **없었다.** 이것이 P4 의 유일한 실제 구멍이었고, A/B(19)를 막고 있던 것도 이것뿐이다 |

`useAnalytics.trackPaymentAttempt` 를 호출부에 붙이는 것은 **하면 안 된다** — `checkout_option_click` 과
같은 행동을 두 번 쏘게 되어 분해가 불가능해진다.

### P5 의 전제도 절반이 낡았다 — 2026-08-30 재실측

P5 의 근거는 [home-conversion-funnel.md](handoff/home-conversion-funnel.md) 3번(2026-08-19)의
"첫 방문자에게 이름이 6개 보인다" 였다. 그 6개를 오늘 다시 셌다 — `index.html` 의 `main#inputPage` 에서
`data-cd-home-secondary` · `hidden` · 인라인 `display:none` 을 걷어낸 텍스트 기준이다.

| 이름 | 2026-08-19 문서 | 2026-08-30 실측 |
|---|---|---|
| 연이 | 보임 | 보임 (10곳, 그중 2곳은 테마 토글 라벨) |
| 네오 | 보임 | 보임 (8곳) |
| CODE DESTINY | 보임 | 보임 (7곳) |
| 꿀꿀 운세 | 보임 | 보임 (topbar 브랜드 1곳) |
| Destiny Flower Atelier | 보임 | **0** — `index.html` 의 `df-studio-kicker` 는 감춰진 secondary 안에 있다 |
| Moonlight Pass · 달빛 이용권 | 보임 | **0** — 2026-08-17 에 이미 접혔다 |

문서가 세지 않은 이름 2개가 대신 있다: **DEST1NOVA · 루나 블룸**(`#moonMusicEntry`). 음악 콘텐츠의
고유 브랜드라 내리면 그 섹션의 정체성이 사라져 이번 범위에서 뺐다.

🔴 **`.neo-logo{display:none}` 을 세지 말 것.** "네오의 팩폭 운세 플랫폼" 은 CSS 로 꺼져 있어 화면에 없다.
가시성을 CSS 까지 보지 않고 DOM 텍스트만 세면 여기서 위양성이 난다(실제로 한 번 셌다).

**"캐릭터를 상품명에서 뺀다"의 실제 대상은 2건뿐이었다.**

| 대상 | 처리 |
|---|---|
| `연이 운명 상담` | ✅ **`대화형 운명 상담`** 으로 개명. 옆 문이 기능명(`초융합 심층 리딩`)인데 이 문만 캐릭터명이었고, 실제로는 연이·네오가 함께 나오는 상담이라 제목이 **부정확**하기도 했다 |
| `연이의 마음 별자리` | ❌ 범위 밖. 라우트 `/yeon-star-hug/` 자체가 그 이름이고 페이지 h1·공유 문구·i18n 이 전부 따라간다. 홈 문구만 바꾸면 페이지와 어긋나므로 **별도 작업**이다 |

🔴 **`연이 운명 상담` 은 홈 문구가 아니라 상품명 정본이었다.** 표시되는 곳이 4군데였고
(홈 문 제목 · `js/core/service-registry.js` 의 검색 이름 · `i18n/authored/shell-02.json` 12로케일 ·
`app/fortune-chat/FortuneChatClient.tsx` 의 결제 사유) 홈만 고치면 이름이 갈려 **분산을 줄이려다 이름을
하나 더 만드는** 결과가 된다. 4곳을 함께 바꿨고 내부 키(`fortune-chat-consultation` · `k69nrae`)는 그대로 뒀다.
캐릭터는 문 desc · 레지스트리 `desc` · 검색 키워드에 남아 있어 "연이" 로 검색하면 여전히 찾힌다.

### P3 를 다시 열지 말 것 — 2026-08-30 dist/ 실측

이 로드맵의 P3 는 [service-exposure-audit-2026-08-24.md](handoff/service-exposure-audit-2026-08-24.md) §4-2 의
"본문 부족 9,854자" 표를 그대로 옮겨 적은 것이었다. 그런데 그 표는 **같은 날 뒤에 이미 해소됐다**
(`scripts/generate-sitemap.mjs` 의 `noindexPathPrefixes` 주석이 5개 라우트를 색인으로 되돌린 경위를 적어 두었다).

`npm run build:cf` 뒤 `verify:indexable-prose-depth` 지표(40단위 이상 조각·페이지 내 중복 제거·
20쪽 이상 공용 문구 제외·한자 2단위)로 잰 값:

| 라우트 | 문장급 본문 | 08-24 문서가 적은 값 |
|---|---:|---:|
| `/oracle/ifa` | 1,292 | 23 |
| `/saju/destiny-bias` | 1,309 | 697 |
| `/tarot/healing` | 1,417 | 1,092 |
| `/neo-operation-room` | 1,425 | 285 |
| `/saju/love-simulation` | 1,815 | 58 |
| `/saju-fpti` | 1,874 | 431 |
| `/saju-guardian` | 1,970 | 160 |
| `/ziwei/chart` | 2,618 | 1,920(색인 대기로 적혀 있었다) |

- 색인 439개 전체 분포는 최소 929 · p05 1,004 · **중앙 1,689** · 최대 28,542 이고 **임계 900 위반 0개**다.
  위 8개는 전부 임계 위이며 5개는 중앙값 위다.
- `/ziwei/chart` 는 사이트맵에 등재돼 있고 색인 5개소 중 noindex 목록 세 곳
  (`generate-sitemap.mjs`·`lib/seo/siteSeo.ts`·`_headers`) 어디에도 없다 — 애초에 들어간 적이 없다
  (`git log -S'/ziwei/chart'` 로 뒤 두 파일 전 이력 0건).
- §4-4 "`/oracle/ifa` 정본 뒤집기"도 끝났다 — `static-canonical-route-map.mjs` 의 canonical 이
  이미 `/oracle/ifa` 다.
- 아직 얇은 것은 `/oracle/royal-tea`·`/oracle/sikojen-povailu` 인데 **둘 다 noindex 유지가 정답**이라
  P3 항목이 아니다.

재현:

```
npm run build:cf
npm run verify:indexable-prose-depth -- --report   # 하위 10개·분위수·위반 수
```

🔴 교훈: 이 로드맵의 P 항목은 **다른 문서의 표를 옮겨 적은 것**이라 그 문서가 갱신되면 낡는다.
착수 전에 수치를 다시 재는 것이 CLAUDE.md 원칙 8이다. 여기서 P3 한 건이 통째로 그 경우였다.

## 6. 안 한 것과 이유

- **요청 단계 대부분** — 한 세션에 한 작업(레포 관행). 위 로드맵으로 넘겼다.
- **비색인 7개 로케일 카피 갱신** — 색인 대상이 아니고, 자동 번역은 과금 LLM 실호출(절대 규칙 1)이라 손으로만 쓸 수 있다.
- **`home.hero2.lead` 로의 키 이관** — 마크업은 자동해시 키를 쓰고 명명 키 `home.hero2.lead` 는 사실상 죽어 있다. 이관하면 12개 사전에 고아 키가 생겨 실익이 없다. 정리 대상으로만 남긴다.
- **성능·결제 UI 투자** — §3-1·§3-2.
