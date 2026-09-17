---
status: active
updated: 2026-09-17
next: P1 4건 + P2(sitemap 중복 제출) + P3(죽은 리다이렉트 스텁 삭제, `a8909dcc1`)
  완료·push됨. 다음은 원 요청 22개 중 미착수 항목 — 사용자 확인 후 착수
---

# SEO 개편 요청 — P1 이후 (P0는 완료)

## 왜

22개 섹션짜리 전체 SEO 개편 요청. 1차 세션은 사용자 승인으로 "P0 감사+긴급수정"만
수행. 나머지는 후속 세션 과제로 명시적으로 남김.

## 지금 상태

- `873bdf254` (main) — `SEO-AUDIT.md`, `SEO-LOCALE-AUDIT.md` 커밋 완료.
- P0 스팟체크 결과 canonical/hreflang/useT 오용 등 **실제 버그는 하나도 못 찾음**
  → 코드 수정 없음. 두 문서가 정본, 여기서 과정 반복 안 함.

## 남은 작업

- [x] **P1 — zh-TW 번역 4개 허브 전부(saju, vedic, astrology, tarot)**:
      `ea3417fb6`, `70302613b`(2026-09-17)로 완료·push됨. 우선순위는 트래픽
      근거 없이 사용자 지시로 순서 없이 전부 진행 —
      `docs/handoff/2026-09-17-zh-tw-priority-followup.md` 참고.
- [x] **P1 — compatibility 다국어화**: `619d408db`(2026-09-17)로 completed·push됨.
      compatibility/saju-compatibility/sukuyo-compatibility 3종 × en/ja/zh/zh-TW.
      이후 연쇄적으로 CI 실패가 4단계로 이어졌다(전부 같은 커밋 `619d408db`가
      신규 저작한 콘텐츠에 원인이 있었음, 실측으로 하나씩 확정):
      1. description 50자 하한 미달(zh/zh-TW 6곳, 34~43자) → `6193d7206`
         (code-destiny-74)이 도입구를 붙여 56~59자로 보강.
      2. 그 콘텐츠 변경이 sitemap lastmod 드리프트를 유발 → `bd44f2854`가
         `npm run sitemap:generate` 재실행해 정리.
      3. `bd44f2854` 이후 handoff(`91326b771`)가 "CI 전부 success"라고 기록했으나
         **이 기록은 부정확했다** — `gh api commits/{sha}/check-runs`로 직접
         재조회한 결과 `Build Pages and Worker`는 success가 아니라 `skipped`
         였다(이 커밋들이 문서/설정 전용이라 `.github/workflows/pr-ci.yml`의
         `classify.outputs.runs_build`가 false였기 때문 — build 잡 자체가 안
         돌았으므로 adsense-readiness 검사가 전혀 실행되지 않았는데, skipped를
         success로 오인해 "초록 확정"이라고 잘못 기록한 것). 이 세션이
         `sukuyo-compatibility.en.title`을 node로 직접 `serpTitleWidth`
         (verify-adsense-readiness.mjs) 로직을 재현해 실측한 결과 71자로 여전히
         `SERP_TITLE_WIDTH_LIMIT`(60)를 초과 상태임을 확인.
      4. title을 60자로 축약하는 김에 `SERP_DESCRIPTION_WIDTH_LIMIT`(160)도
         같은 방식으로 3허브×4로케일 전체 재검증한 결과
         `saju-compatibility.en.description`(188)과
         `sukuyo-compatibility.en.description`(176)도 초과 상태였음을 추가로
         발견 — title만 고쳤다면 다음 CI에서 이 description 검사가 또 실패했을
         것. 둘 다 141/157자로 축약(의미 보존).
      → `02cbb5127`(2026-09-17, code-destiny-74)로 title/description 축약 +
      `sitemap:generate` 재실행(콘텐츠 서명 변경으로 인한 드리프트 재발 방지,
      같은 커밋에 반영)을 커밋·push. **이번엔 `gh api` 직접 재조회로
      `Build Pages and Worker: success`, `Static guards: success`,
      `CI required: success`까지 전부 실측 확정함** — skipped를 success로
      오인했던 이전 실수를 반복하지 않도록 `status`와 `conclusion`을 모두
      확인했다. 이 4단계 연쇄는 완전히 종료됨.
- [x] **P1 — 로케일 소개 페이지 콘텐츠 얕음**: `09259ed39`(2026-09-17)로 완료·push됨.
      `PublicFeatureIntroduction` 기반 11개 허브(saju/vedic/astrology/tarot/
      fortune-tea-house/destiny-compass/psychotest/sukuyo-compatibility-ai/
      compatibility/saju-compatibility/sukuyo-compatibility) × en/ja/zh(zh-TW는
      7개 허브)에 토픽별 FAQ 2문항(`faqs` 필드)을 추가해 기존 공용 FAQ 1개와
      합쳐 페이지당 3개로 확장. 컴포넌트는 `<section className={styles.faq}>`
      안에서 여러 `<details>`를 렌더링하도록 구조 변경(`SeoLandingTemplate`
      수준의 섹션 재설계는 하지 않음 — 사용자가 "FAQ만 확장" 범위로 승인).
- [x] **P2 — sitemap 중복 제출**: `579e154dd`(2026-09-17)로 완료·push됨. 옵션 A
      채택 — `robots.txt`/`public/robots.txt`/`app/robots.ts` 3곳에서 통합
      `sitemap.xml` 선언만 제거, 로케일 5개(`sitemap-ko/ja/en/zh/zh-tw.xml`)는
      유지. `generate-sitemap.mjs`는 수정 없음(통합본 자체는 계속 생성, 크롤러
      광고만 중단). 상세: `docs/handoff/2026-09-17-seo-p2-sitemap-dedup.md`.
- [x] **P3 — 죽은 리다이렉트 스텁 정리**: `a8909dcc1`(2026-09-17)로 완료·push됨.
      `app/en-us/`, `app/ja-jp/`, `app/zh-cn/` 삭제. deletion-auditor로 코딩
      원칙 9(소스·테스트·verify 3면) 확인 결과: import 0건, sitemap/robots
      미참조, 실제 구URL→신URL 301은 `public/_redirects`(엣지)가 이미 전담—
      Next.js 라우트는 도달 불가능한 죽은 코드였음. 같은 커밋에서 낡은 참조도
      정리: `verify-adsense-readiness.mjs`의 `rootMetadataAllowedRoutes` 3개
      엔트리 제거, `adsense-route-policy.js`의 `LOCALE_ROOT_PATHS` 3개 제거
      (기본 deny 로 여전히 차단됨 — `verify-adsense-route-policy.mjs` 통과
      확인). `check:fast` 전체 통과(jest 3881/3881). `public/_redirects`의
      `/en-us`·`/ja-jp`·`/zh-cn` 301 규칙은 건드리지 않음(실제 리다이렉트
      동작은 여기서만 나옴).
      과거 이력: `docs/handoff/seo-naver-diagnostic-2026-08-16.md:329`가 같은
      세 라우트를 "삭제 금지"로 보류한 적 있으나, 그건 당시 세션 범위(metadata
      정리) 밖이라 보류한 것이었고 이번은 사용자가 명시적으로 P3로 지정한
      별도 건.
- [ ] 원 요청 22개 항목 중 미착수: `SEO-KEYWORD-MAP.md`, `SEO-CHANGELOG.md`,
      허브 콘텐츠 재작성, 내부링크 재설계, structured data 확장, E-E-A-T 강화,
      경쟁사 SERP 조사, Core Web Vitals 실측.

## 정본 예시

- `SEO-AUDIT.md` — 인프라·canonical/hreflang 실측 전체.
- `SEO-LOCALE-AUDIT.md` — 로케일 격차·`useT`/`useTPick` grep 결과 전체.
- `lib/generate-page-metadata.ts:88` — `HreflangPathMap`에 `zh-TW` 누락 시 위험 경고 주석.
- `app/components/PublicFeatureIntroduction.jsx` — FAQ는 `copy.faqs`(토픽별 2개) +
  `ui.question/answer`(공용 1개)를 합쳐 `<section className={styles.faq}>` 안에서
  렌더링(`09259ed39` 이후 구조, 더 이상 1문항 고정 아님).
- `lib/i18n/feature-introductions.mjs` — 40개 topic/locale 조합(11토픽×en/ja/zh,
  7토픽은 zh-TW 추가)마다 `faqs: [...]` 필드 존재. 신규 토픽 추가 시 `faqs` 2개
  누락하면 `__tests__/ui/seo-trust-locales.test.js`가 막는다.

## 함정

- React SSR은 `hreflang`을 `hrefLang`(camelCase)로 렌더링 — grep은 대소문자 무관으로.
- `curl`은 `-L` 필수(확장자 없는 경로가 308로 trailing-slash 리다이렉트).
- WebFetch는 `<head>` 태그(canonical/hreflang) 추출이 불안정 — curl+grep으로 직접 확인.
- ko.json이 작은 것 자체는 버그 아님(`useTPick` 소비 시 정상) — [[locale-i18n-pitfalls]] 참고.

## 검증

```
npm run check:fast   # 코드 수정 시
```
번역 콘텐츠 저작은 검증 스크립트 없음 — production curl 재확인이 유일한 실측 수단.

## 모르는 것

zh-TW 4개 허브 배포 후 실제 트래픽 반응 — 이 세션에서는 배포 직후라 실측 불가,
후속 확인은 GSC 접근이 생기는 시점에.

`02cbb5127`(최신 push, 2026-09-17) 기준 `gh api commits/{sha}/check-runs`
직접 재조회 결과 `Build Pages and Worker`·`Static guards`·`CI required`
전부 `status=completed conclusion=success` — **CI 실제로 초록 확정됨**.
(정정: 이전 버전의 이 절은 `63914e4e1` 기준 "CI 전부 success"라고 적었으나
부정확했다 — 그 시점엔 `Build Pages and Worker`가 `skipped`였다. `gh run
list`의 요약 상태만으로는 skipped/success를 구분하지 못했던 게 원인으로
보인다. 앞으로는 `gh api repos/rei1237/codedestiny/commits/{sha}/check-runs
--jq '.check_runs[] | "\(.name): status=\(.status) conclusion=\(.conclusion)"'`
로 개별 잡의 `conclusion`까지 직접 확인할 것 — 문서/설정 전용 커밋은
`classify.outputs.runs_build=false`라 build 잡이 skipped로 "정상 완료"
처리되므로, `CI required` aggregate가 초록이어도 build 잡이 실제로 돌았는지는
별도로 확인해야 한다.)

`Deploy staging`은 `02cbb5127` 체크런 조회 시점에 `in_progress`로 남아있었음
— 비동기 스테이징 배포 축이라 이 세션은 완료를 기다리지 않았다
([[staging-verify-optional]] — push CI(`CI required`)까지만 확인하면 되고,
스테이징 검증은 요청·인프라 변경·릴리스 때만).

## P3 후속 — CI 빌드 실패 발견·수정 (2026-09-17, 별도 커밋)

`a8909dcc1` push 후 `gh api check-runs`로 `Build Pages and Worker`가
`failure`로 실측됨(P3 자체와 무관). 원인: P2(`579e154dd`)가 robots.txt에서
통합 `sitemap.xml` 선언을 의도적으로 제거했는데(승인된 옵션 A,
`docs/handoff/2026-09-17-seo-p2-sitemap-dedup.md` 참고),
`scripts/verify-adsense-readiness.mjs`의 `verifyRobots`는 여전히 그 통합
sitemap 지시줄을 요구하고 있었다 — postbuild 단계에서
`Error: [adsense-readiness] out/robots.txt: missing sitemap directive`로
빌드가 죽었다. P2 이후 커밋들이 전부 문서/설정 전용이라 build job이
`skipped`로 빠지면서 이 회귀가 지금까지 CI에 한 번도 안 걸렸던 것 —
`a8909dcc1`(app/ 라우트 삭제)이 P2 이후 처음으로 build job을 실제로 돌린
커밋이라 여기서 처음 표면화됨.
수정: 로케일 sitemap(`sitemap-<locale>.xml`) 패턴 매치로 단언 변경(정규식을
`robots.txt`/`public/robots.txt` 실제 내용으로 직접 검증함). 로컬 풀빌드는
다른 워크트리 세션의 dev 서버가 `.next`를 점유 중이라 차단돼 못 돌렸지만,
기존(낡은) `out/`·`dist/` 산출물에 검증기를 직접 실행해 sitemap 단언이
더 이상 실패하지 않음을 확인(다음 실패는 별개로, 로컬 `out/`에 삭제 전
`en-us` 산출물이 남아있는 stale 캐시 문제일 뿐 — CI는 fresh build라
해당 없음). 아직 push 전 — 다음 세션 또는 이 세션 마무리 시 커밋·push하고
`gh api check-runs`로 `Build Pages and Worker` 성공 재확인 필요.

## 다음 세션 첫 문장

P1 4건 + P2(sitemap 중복 제출) + P3(죽은 리다이렉트 스텁 삭제, `a8909dcc1`) 완료.
`a8909dcc1` 직후 CI에서 `Build Pages and Worker` 실패 발견(P2의 robots.txt
정책 변경과 verify-adsense-readiness.mjs 검증기 간 불일치, P3와 무관) —
로케일 sitemap 패턴으로 단언 수정함(커밋 SHA는 이 문서 갱신 이후 확정, 위
"P3 후속" 절 참고). 이 수정을 push한 뒘 `gh api check-runs`로
`Build Pages and Worker`·`Typecheck and lint`·`Static guards` 전부
success 개별 확인 필수(skipped 를 success 로 오인하지 말 것). 그 다음 사용자
확인 후 원 요청 22개 중 미착수 항목(`SEO-KEYWORD-MAP.md`, `SEO-CHANGELOG.md`,
허브 콘텐츠 재작성, 내부링크 재설계, structured data 확장, E-E-A-T 강화,
경쟁사 SERP 조사, Core Web Vitals 실측) 중 우선순위 선택 후 착수.
