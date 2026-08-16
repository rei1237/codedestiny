# AdSense "가치 없는 콘텐츠" 거절 대응 — 인수인계 (2026-08-17)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 수치는 전부 `out/` 2026-08-17 빌드 실측이다.

## 0. 상황

Google AdSense 가 **"가치 없는 콘텐츠(low value content)"** 로 code-destiny.com 을 **거절**했다.

측정 방법(재현용):
```bash
# getVisibleText(script/style/svg 제거 후 태그 제거, verify-adsense-readiness.mjs:582~619) 로 뽑은
# 텍스트에 8-gram shingle 을 적용해, 전체 페이지의 10% 초과에 등장하는 shingle(=공통 크롬)을
# 제외한 "고유 본문" 길이. scripts/verify-editor-notes.mjs 가 같은 계산을 한다.
node scripts/verify-editor-notes.mjs   # build:cf 뒤에 실행
```

기준선(2026-08-17, 조치 전):

| 지표 | 값 |
|---|---|
| 사이트맵 | 433 |
| 광고 게재 가능 라우트 | 215 |
| 그중 고유 본문 1,500자 미만 | **40** |
| 그중 1,000자 미만 | **16** |
| `/famous-saju/category/*` 4-gram Jaccard 중복도 | **84.4%** |
| `/high-value/*` | 73.7% |
| `/fortune/{period}/{sign}` | 69.4% |

## 1. 착지한 것 — PR 3개

| PR | 범위 | 상태 |
|---|---|---|
| #757 `fix/adsense-thin-route-deindex` | 얇은 카테고리·스텁 22개를 색인·광고에서 제외 | 머지 대기 |
| #758 `fix/adsense-trust-page-depth` | `/contact`·`/editorial-policy` 본문 보강 | 머지 대기 |
| #759 `feature/adsense-editor-notes` | 편집자 노트 18개 + 발견형 가드 | 머지 대기 |

🔴 **머지 순서: #757 → #759** (#759 가 #757 위에 쌓여 있다). **#758 은 독립**이라 아무 때나.

### 결과 (실측)
- 사이트맵 **433 → 411**
- 광고 게재 가능 라우트 **215 → 197**
- `/contact` 903 → **1,536자**, `/editorial-policy` 1,189 → **1,803자**

## 2. 반드시 알아야 할 함정 3가지

### 2-1. 🔴 `noindexPathPrefixes` 는 공유 버튼도 끈다
`lib/seo/siteSeo.ts:384 noindexPathPrefixes` → `isNoindexPath` → `lib/seo.v2.ts:85 isPrivateRoute`
→ `lib/share.v2.ts:36` → `app/components/ShareWidget.tsx:115 if (!share.shareable) return null`.

`/flower/*` 4개는 `FeatureLandingPage.tsx:1054` 가 ShareWidget 을 렌더하는 **유료 기능 랜딩**이라,
접두사 목록에 넣으면 **색인만 끄려다 기능을 지운다.** 그래서 `/flower` 만 페이지 단위
`generatePageMetadata({ noindex: true })` 로 처리했다(`lib/generate-page-metadata.ts` 에 옵션 추가,
`isIndexableRoute` 는 원래부터 2번째 인자를 받고 있었다).

**새 라우트를 noindex 할 때마다 이 질문을 할 것: 이 페이지가 ShareWidget 을 쓰는가?**

### 2-2. 🔴 noindex 목록이 **3벌** 이고 손으로 맞춘다
| 위치 | 개수 |
|---|---|
| `_headers` X-Robots-Tag | 55 |
| `scripts/generate-sitemap.mjs:49` | 39 |
| `lib/seo/siteSeo.ts:384` | 64 |

셋이 서로 다르다. 한쪽만 고치면 "사이트맵에 있는데 noindex" 가 되어 GSC 가 「제출된 URL에 noindex」로
잡는다. **같은 커밋에 함께 담을 것.**

`_headers` 는 Cloudflare Pages 상한 **100개** 중 현재 **94~95개**다(`verify-adsense-readiness.mjs:1137`).
여유가 거의 없으므로 App Router 라우트는 헤더 대신 metadata `robots` 로 처리하는 게 맞다(비용 0).

### 2-3. 🔴 광고 정책을 함께 끄지 않으면 **배포가 막힌다**
`verify-adsense-readiness.mjs:1355 verifyAdsenseEligibleRouteSitemapAlignment` 가
*"광고 가능 + self-canonical → noindex 금지 + 사이트맵 필수"* 를 단언한다.
noindex 만 걸고 `app/components/adsense-route-policy.js` 를 그대로 두면 postbuild 에서 터진다.

## 3. 편집자 노트 (#759) 구조

- 컴포넌트: `app/components/EditorNote.jsx` — 서버 컴포넌트. 루트에 `data-cd-editor-note` 마커.
  🔴 `"use client"` 금지 — `getVisibleText` 가 서버 렌더 텍스트만 세므로 클라이언트로 내리면 분량 계산에서 사라진다.
- 데이터: `app/_content/editor-notes.js` — 라우트 경로 키. **사람이 직접 쓴다.**
- 대상 18개: `/high-value/<slug>` 12 + `/insights/{dream,fusion,sukuyo-basics,ziwei-basics}` 4 + `/faq` + `/methodology`
- 가드: `scripts/verify-editor-notes.mjs` (`npm run verify:editor-notes`)

### 🔴 `/fortune/{period}/{sign}` 96개를 제외한 이유 (다시 파지 말 것)
`lib/fortune/sign-profiles.ts` 의 산문이 **sign 단위**라 today/tomorrow/weekly/monthly 4개 URL 에
그대로 복제된다. 이 페이지들이 1,488자로 측정되는 이유가 바로 그 중복 제거 때문이다.
**sign 단위 노트를 붙이면 노트도 똑같이 4개 URL 에 복제되어 고유 본문이 1자도 오르지 않는다.**
실제로 올리려면 (기간 × sign) 96개를 손으로 써야 한다. 가드의 `DECLARED_EXCEPTIONS` 에 사유가 적혀 있다.

### 가드 설계에서 놓치기 쉬운 점
1. **노트를 제거한 뒤에 분량을 잰다.** 포함해서 재면 노트가 붙는 순간 임계값을 넘겨 가드가 영원히 침묵한다.
2. **코퍼스가 다르면 수치가 다르다.** 이 가드는 **광고 가능 라우트 197개**로 코퍼스를 잡는다.
   §0 의 기준선은 **사이트맵 433개** 코퍼스라 절대값을 직접 비교하면 안 된다
   (shingle 의 document frequency 임계가 `총 개수 × 0.1` 이라 코퍼스가 줄면 고유 판정이 후해진다).
3. **하한은 한국어 글자 수 기준이다.** 처음에 영어 감각으로 lede 120자·팁 60자를 잡았더니
   실제로 충실한 2문장 lede(101~119자)가 전부 걸렸다. 한국어는 글자당 정보 밀도가 영어의 두 배쯤이라
   90자·50자로 내렸다. **다시 올리지 말 것** — 근거는 상수 주석에 있다.

### 이 가드가 실제로 잡은 것 (작성 중 실측)
`/high-value/saju-beginner` 로 키를 잘못 적었다. 그건 **카테고리 슬러그**이고 실제 페이지는
`complete-guide-to-saju` 다. 손으로 적은 목록이었다면 노트가 렌더되지 않은 채
"12개 완료" 로 보고됐을 것이다. 발견형 가드가 아니면 못 잡는 종류의 실수다.

## 4. 🔴 남은 일 — 사용자 결정이 필요한 것

### 4-1. 가드를 배포 게이트로 승격할지 (미결정)
`verify:editor-notes` 는 지금 **수동 실행 전용**이다. `scripts/run-postbuild.mjs` 의 `steps` 에
(`verify-adsense-readiness.mjs` 뒤 · `externalize-dist-inline-scripts.mjs` 앞) 넣으면 배포 차단 게이트가 된다.
**CI 게이트 추가는 지시 없이 하지 않는 규칙이라 넣지 않았다.** 승격하려면 사용자 승인을 받을 것.

### 4-2. 🔴 심사자가 볼 수 있는 저가치 페이지가 아직 많다 — **이번 거절의 실제 원인일 수 있다**
**noindex 는 색인만 막고 AdSense 크롤러의 접근은 막지 않는다.** 실측:

| 대상 | 개수 | 분량 |
|---|---|---|
| `/insights/famous-saju/<slug>` | **136** | 이름·생일만 바뀌는 템플릿 |
| `/psychotest/<slug>` | 14 | — |
| 정적 셸 (`/myungwun_final`, `/fortune-teller-fish` 등) | 19 | **130~1,344자** |

전부 이미 noindex 이지만 robots.txt 로는 안 막혀 있어 심사 크롤에 그대로 노출된다.
처리하려면 ① robots.txt `Disallow` ② 삭제 ③ 허브에서 링크 제거 중 하나가 필요한데,
②는 절대규칙 6(기능 삭제 금지), ①은 noindex 신호를 죽이는 부작용이 있어 **별도 판단이 필요하다.**

### 4-3. 홈 `/` 이 광고 차단 목록에 있다
`app/components/adsense-route-policy.js:4`. 승인 후 홈 광고 인벤토리가 0이 된다.

### 4-4. 손대지 않은 근중복 클러스터
- `/nakshatra/codex/*` 27개 — 고유 본문 2,136~2,332자, codex 간 토큰 72% 중복
- `/fortune/{period}/{sign}` 96개 — Jaccard 69.4%
사용자가 A안(22개)을 선택해 이번 범위에서 제외했다.

## 5. 작업 환경 주의

🔴 **다른 세션이 같은 작업 디렉터리를 쓴다.** 이 작업 중에도
`app/components/FeatureMarketingDetailModal.tsx` · `scripts/verify-feature-marketing-schema.mjs` ·
`index.html` 에 결제 팝업 관련 미커밋 변경이 계속 들어왔다.

- `git add .` 절대 금지. **파일을 하나씩 지정해 스테이지할 것.**
- `config/sitemap-lastmod.json` 은 그 세션의 `index.html` 변경 때문에 서명 297개 중 287개가 흔들린다.
  #757 에서는 **일부러 커밋에서 뺐다** — 원장 신선도를 요구하는 가드는 없고
  (`git grep sitemap-lastmod.json -- scripts/verify-* .github/` → 0건), 남는 항목은 다음 빌드의
  `save()`(`scripts/lib/sitemap-lastmod.mjs:410`)가 정리한다.

## 6. 검증 명령

```bash
npm run build:cf     # sitemap:generate → verify:redirects-budget → verify:public-parity
                     # → i18n:check(🔴 optional 이라 실패해도 안 멈춘다, 로그를 직접 읽을 것)
                     # → verify:adsense-route-policy → next build → postbuild verify:adsense-readiness
npm run verify:sitemap        # build:cf 체인에는 없다. 배포 워크플로가 따로 돈다
npm run verify:editor-notes   # build:cf 뒤에 실행 (out/ 를 읽는다)
npx tsc --noEmit
npm test                      # 236개
```
