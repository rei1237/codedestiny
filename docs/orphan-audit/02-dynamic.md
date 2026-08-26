# Phase 2 — 동적 참조 검증 (읽기 전용)

> 커밋 `31cab3bdd` / 격리 worktree / 소스 무수정. Phase 1 후보를 프롬프트의 **동적 8-검증**으로 전수 확인.
> 8경로 = ①WebView직접진입 ②파일라우팅규약 ③문자열동적import ④외부R2에셋 ⑤다국어키 ⑥빌드타임전용 ⑦런타임설정/피처플래그 ⑧서사자산.
> 판정은 감독자(사람)가 수행. 에이전트는 원시 참조 위치만 수집(과거 고아 오판 전례 회피 — 3중 대조 적용).

## 요약: 후보의 대부분이 오탐 또는 의도된 가드로 걷힘

| Phase 1 후보군 | 규모 | Phase 2 판정 |
|---|---|---|
| 미사용 의존성 "합의" | 10~20 | **1개만 진짜**(@tanstack/react-virtual). 나머지 전부 사용/빌드·네이티브 오탐 |
| js/** (정적셸 로드) | 38 · 7MB | **LIVE**(셸 동적 로더 주입) — 오탐 |
| verify 미배선 13종 | 13 | **A등급 0** — 전부 의도된 가드(위임 실행·문서화·소스주석) |
| 프레임워크/테스트 | ~68 | **LIVE**(규약·jest) |
| lib/components 파일 섬 | ~30 | **진짜 고아 섬 다수 확인**(아래 §A/§B) |

## 1. 의존성 (③⑥⑦ 검증 — 소스 grep)

| 패키지 | 실제 사용처 | 판정 |
|---|---|---|
| `@tanstack/react-virtual` | **0건** | 🟢 **A등급 제거 후보(유일)** |
| `recharts` | `app/components/OhangRadarChart.tsx` | 🔴 사용(오탐) |
| `zustand` | animal-destiny/music 스토어, `app/dream/psycho/page.tsx` | 🔴 사용 |
| `@tiptap/*` | `app/admin/insights`·`app/admin/content` 에디터 | 🔴 사용 |
| `ajv` | `worker/lib/premium-chapter-json-contract.js` | 🔴 사용 |
| `tz-lookup` | `worker/lib/vedic-prashna-prompt.js` | 🔴 사용 |
| `tailwindcss/postcss/autoprefixer/@types/react-dom/@capacitor/*/@opennextjs/cloudflare/lighthouse/@jest/globals` | 빌드·네이티브·타입·테스트 | 🔴 오탐 |

## 2. verify 미배선 13종 (③⑥ + 3중 대조: package.json·workflows·git/소스 참조)

**`.github/workflows`에 하나도 없음**(CI 미배선 확정). 그러나 전부 **의도된 회귀/정책 가드**:

| 스크립트 | 발견된 참조 | 판정 |
|---|---|---|
| ~~`verify-mobile-live-deployment` · `verify-mobile-original-requirements`~~ | ~~배선된 `verify-mobile-final-audit.mjs`가 직접 `node ...` 실행(L75-76)~~ | 🔴 **오판이었다 — 2026-08-26 둘 다 삭제** |
| `verify-physiognomy-scoring` | CLAUDE.md 문서화 + `.claude/settings.json` 허용목록 | 의도된 가드 |
| `verify-insight-authored` | `.claude/settings.json` 다수 수동 실행 이력 | 의도된 가드 |
| `verify-nakshatra-flow` | `worker/lib/nakshatra-codex.js`·`constants/nakshatra-attributes.js` 소스 주석이 자기 가드로 명시 | 의도된 가드 |
| `verify-nakshatra-ai-flow` | nakshatra 짝 가드 | 의도된 가드 |
| `verify-portone-webhook-signature`·`verify-auth-p0p1-regression`·`verify-coin-gate-degraded-preview`·`verify-famous-saju-magazine`·`verify-health-report-regression`·`verify-mindscan-reading`·`verify-admin-saju-prompt-kasi-calendar` | 외부 참조 없음(자기 파일만) | **미배선 가드** — 결제·인증 회귀 가드 포함 → **A등급 불가, B등급(소유자 의도 확인)** |

→ 결론: **verify 13종 중 A등급(안전제거) 0.** 메모리 `orphaned_verify_guards` 경고가 정확히 재현됨(미배선을 고아로 오판하면 회귀 가드 상실).

🔴 **2026-08-26 정정 — 위 표 첫 줄의 `LIVE(위임)` 판정은 틀렸다.** `verify-mobile-final-audit.mjs` 의
L75-76 은 실행 코드가 아니라 `finalAuditRequiredText` 배열, 즉 **마크다운 문서에 그 문자열이 적혀
있는지** 보는 목록이었다. 그 스크립트에는 `child_process` 호출이 **0건**이라 두 파일을 실행한 적이
없고, 존재 여부만 확인했다. 이 오판 때문에 죽은 검증기 2개가 이 감사를 통과해 살아남았고,
`verify-mobile-original-requirements` 는 그 뒤로 19건 실패를 낸 채 방치됐다(그중 10건은 마크업이
`setAttribute` 로 옮겨가며 생긴 오탐, 9건은 실제로 제거된 `#cdMobileDestinyHub` 허브).

**교훈 — 이 감사를 다시 돌릴 때 적용할 것**: "다른 스크립트가 부른다"를 근거로 LIVE 로 올리기 전에
**부르는 쪽이 정말 실행하는지** 확인한다. 파일명 문자열이 배열에 들어 있는 것과 `execSync`/`spawnSync`
로 돌리는 것은 다르다. 판별은 한 줄이면 된다:

```bash
grep -n "execSync\|spawnSync\|child_process" scripts/<부르는쪽>.mjs
```

결과가 0건이면 그 참조는 **실행이 아니라 언급**이다. 관련: 메모리 `unwired-guard-reasons-can-be-false`.

## 3. js/** (①③④ 검증)

`animal-totem-experience·entertain-engine·luck-sync-diary·oracle-kcg·tarot-love-experience·tarot-self-esteem-experience·dream-meaning-library·vedic-book·coin-gate-helper` 등 → **6개 정적 셸 전부에서 참조**, `js/core/index-inline-runtime.js`·`uiBindings.js`에 **동적 스크립트 로더** 존재 → **LIVE**. `js/saju-engine*·js/core/saju/*·js/core/kasi-*`는 LIVE + **C등급(사주 도메인)**. → js/** 전체 **보호**.

## §A. 진짜 고아 섬 — A등급 후보 (외부 마운트 0 확인, 비민감)

각 섬의 **최상위 컴포넌트를 어떤 라우트/페이지도 import하지 않음**을 확인. 살아있는 대체 구현 존재.

| 섬 | 파일 | 근거 | 대체(LIVE) |
|---|---|---|---|
| **Maya 구(舊) 중복** | `lib/maya/maya-calendar.ts·maya-data.ts·maya-reading.ts` + `components/maya/MayaFortunePage·MayaCalendarWheel·MayaResultCard.tsx` (6) | `MayaFortunePage` 외부 import 0 | `app/maya`가 `src/components/maya/MayaCalendarView`(src버전) 동적 마운트 |
| **lib/seo 죽은 하위디렉토리** | `lib/seo/breadcrumbs.ts·createMetadata.ts·schema.ts·keywords.ts·keyword-clusters.ts` (5) | `lib/seo/index.ts` 부재→app 35페이지는 `lib/seo.ts` 사용. 이 5파일은 배럴 미연결(keywords↔keyword-clusters만 상호참조=madge 순환 1건) | `lib/seo.ts` + `lib/seo.v2.ts` |
| **destiny-meeting-place** | `DestinyMeetingPlaceFeature.tsx·DestinyMeetingPlaceHero.tsx` (2) | `DestinyMeetingPlaceFeature` 외부 import 0(Feature→Hero 내부만) | 없음(미마운트 피처) |
| **스텁** | `lib/fpti/saju-fpti-adapter.ts`·`lib/optimized-image-url.ts` (2) | 참조 0 | — |
| **의존성** | `@tanstack/react-virtual` | 소스 사용 0 | — |

## §B. 민감 인접 / 서사 / 진행중 — B등급 (삭제 판단 보류, 소유자 확인)

| 항목 | 파일 | 사유 |
|---|---|---|
| animal-twelve 구버전 | `components/fortune/animal-twelve/AnimalCard·AnimalCharacterSvg·AnimalResultSections.tsx` + `components/fortune/GuardianAnimalSprite.tsx` (4) | 외부 마운트 0이나 **사주/animal-destiny 인접**(LIVE는 `app/saju/animal-destiny`) → 민감, 확인 후 |
| **tea-house 인트로(⑧서사)** | `src/features/fortune-tea-house/components/HumanYeoniReveal·TalkingPigYeoni·TeaHouseCTA·TeaHouseFlowPreview·TeaHouseStoryIntro·YeoniTransformScene.tsx` (6) | 🟨 **연이·꽃돼지 서사 자산** → Phase 2-8 삭제 판단 금지 |
| **yeon 컴포넌트(⑧서사)** | `components/yeon/YeonCardDownloadButton·YeonShareCard·YeonSpriteFrame·YeonTypewriterBubble.tsx` (4) | 🟨 **연이 서사 자산** → Phase 2-8 |
| DestinyLibraryBanner | `components/DestinyLibraryBanner.tsx` | 마운트 0이나 **2026-07-18 최근 수정 + tailwind.config에 팔레트 주석** → 진행중 피처 가능 |
| i18n-locales | `lib/i18n-locales.js` | 참조 0이나 **i18n 배포 게이트 민감** → 확인 |
| saju-premium 타입 | `types/saju-premium-report/*` | 내부 배럴만 사용, **사주 리포트 인접 타입** |
| store 스크린샷 | `store-assets/**` (7 · 12.7MB) | 런타임 미참조나 **구글플레이 릴리스 자산** → 릴리스 프로세스 확인 |
| 미배선 verify 가드 7종 | §2 하단 | 결제·인증 회귀 가드 → 소유자 의도 |
| scripts 일회성 의심 | `gen-daily-2026-03-21.mjs·rm-godlife.mjs·inject-godlife.mjs·patch-*.mjs` 등 | 과거 일회성 마이그레이션/패치 |

## §C. 즉시 라이브 확정 (후보에서 제외 — C등급/오탐)
프레임워크(`middleware.ts`·`pages/*`·configs), `__tests__/**`(jest), js/**(셸 로드), 사주엔진·kasi(C등급), 결제 `lib/payment/portone.ts`(C), `lib/mongodb.ts`(C), `apps/mobile/capacitor.config.ts`(C), `lib/seo.ts·seo.v2.ts·seo-site-urls.ts·share.v2.ts·indexnow.ts`, `src/lib/maya-calendar.ts`+`src/components/maya/*`, `types/css-modules.d.ts`(앰비언트), 사용 의존성 다수.

## 🔴 실질 효과(중요 — Phase 3 예고)
§A의 죽은 TS 모듈들은 **어차피 아무도 import 안 해 프로덕션 번들에 포함되지 않는다**(트리셰이킹 이전에 미참조). → **제거해도 런타임/번들 이득 0**, 효과는 **저장소·유지보수 표면 정리 + typecheck 소폭**뿐. 큰 바이트(js/** 7MB·store-assets 12MB)는 각각 LIVE·릴리스자산이라 clean 제거 대상 아님. → "효과 대비 리스크"를 Phase 3에서 정직하게 계량.

## 다음 단계 (Phase 3)
- §A를 A등급 확정목록으로, §B를 개별 질문지로 정리 → `docs/orphan-audit/03-plan.md`.
- A등급도 **번들 이득 없음**을 명시하고, 제거/보류를 항목별로 사용자 승인.
