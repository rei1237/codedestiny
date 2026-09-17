---
status: active
updated: 2026-09-17
next: P1 4건 작업 완료·push(zh-TW 4허브, compatibility 다국어화, 소개 페이지 FAQ 보강, sitemap 드리프트 정리). CI 초록 여부는 미확인 — gh run list부터 실측할 것
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
      이 커밋이 verify-adsense-readiness.mjs 50자 하한을 어긴 description 6곳(zh/zh-TW,
      34~43자)을 남겨 CI(PR CI → Static guards)가 실패했음. 다른 세션
      (code-destiny-74)이 `6193d7206`(2026-09-17)으로 도입구를 붙여 56~59자로
      보강했으나, 그 콘텐츠 변경이 sitemap lastmod 드리프트를 새로 만들어
      "Verify the tracked sitemap matches its sources" 가드가 또 실패(`gh run
      view 35206359699`로 실측 확인) → 이 세션이 `bd44f2854`(2026-09-17)로
      `npm run sitemap:generate` 재실행해 드리프트 정리·push. **다음 세션 첫
      할 일은 `bd44f2854` 기준 CI가 전부 초록인지 `gh run list --branch main
      --limit 5`로 재확인하는 것** — 이 세션은 push까지만 하고 그 결과를
      기다리지 못함.
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

`bd44f2854`(sitemap 드리프트 정리) push 직후 CI 결과를 이 세션은 기다리지
못함 — `619d408db`(compatibility 다국어화) 이후 이미 두 차례(description
50자 미달 → sitemap 드리프트) 연쇄로 CI가 깨졌던 이력이 있으므로, 초록
확정 전까지는 "해소됨"으로 단정하지 말 것.

## 다음 세션 첫 문장

`gh run list --branch main --limit 6` — `bd44f2854` 기준 PR CI(Static guards
포함)가 전부 success 인지 실측 확인. 여전히 실패 중이면 `gh run view
<run-id>`로 실패 스텝을 먼저 특정한 뒤 고칠 것(추측으로 고치지 말 것 —
이번에 description 길이 수정이 sitemap 드리프트를 유발한 것처럼, 수정 하나가
다른 가드를 깨뜨릴 수 있음). 초록 확인되면 P1 4건(zh-TW, compatibility,
소개 FAQ, sitemap 정리) 모두 완료로 보고, P2(sitemap 중복 제출) 또는
P3(죽은 리다이렉트 스텁 정리) 중 사용자에게 우선순위 확인.
