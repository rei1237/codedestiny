---
status: active
updated: 2026-09-17
next: P1 4건 완료·push·CI 초록 실측 확정(`02cbb5127`, CI required success)까지 끝남. 다음은 P2(sitemap 중복 제출) 또는 P3(죽은 리다이렉트 스텁 정리) 중 사용자 확인 후 택1
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
- [ ] **P2 — sitemap 중복 제출**: `sitemap.xml`(통합, 1265) vs 로케일별 5개가 동시
      제출됨. index로 바꿀지 통합본을 뺄지 결정 필요.
- [ ] **P3 — 죽은 리다이렉트 스텁 정리**: `app/en-us/`, `app/ja-jp/`, `app/zh-cn/`
      (옛 URL 스킴 호환용, sitemap 미참조 — 삭제 전 코딩 원칙 9 3면 확인).
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

## 다음 세션 첫 문장

P1 4건(zh-TW, compatibility, 소개 FAQ, sitemap 드리프트 정리) 모두 완료·`02cbb5127`
기준 CI 초록 실측 확정(`gh api check-runs`로 `Build Pages and Worker`·
`Static guards`·`CI required` 전부 success 개별 확인)됨을 전제로, P2(sitemap
중복 제출) 또는 P3(죽은 리다이렉트 스텁 정리) 중 사용자에게 우선순위 확인 후
착수.
