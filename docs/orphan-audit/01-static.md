# Phase 1 — 정적 참조 분석 (읽기 전용)

> 커밋 `31cab3bdd` / 격리 worktree / 소스 무수정. 원시 출력: `reports/*.json` + 세션 스크래치패드(knip.json·ts-prune.txt·depcheck.json·madge-*.json).

## 1. 실행한 도구 (5종, 교차검증)

| 도구 | 명령 | 결과 | 비고 |
|------|------|------|------|
| **audit:files**(정본) | `npm run audit:files` | ✅ 후보 **443**(코드 226 + 에셋 217) | 저장소 도달성 BFS. `public/app/worker/server/veda/fortune`는 보호프리픽스로 별도(`protectedButUnreached` 1021) |
| **audit:duplicates** | `npm run audit:duplicates` | ✅ 중복군 **247** | sha256 |
| **knip** | `npx knip --reporter json` | ✅ 파일 **0** / export **498** / 타입 **133** / 의존성 **10** | Next.js 인지 → 프레임워크 파일을 미사용으로 안 봄 |
| **ts-prune** | `npx ts-prune` | ✅ truly-unused export **689** | Next 엔트리 미인지로 과다 |
| **depcheck** | `npx depcheck --json` | ✅ 미사용 dep **13** + devDep **7** + missing **10** | |
| **madge** | `--circular` / `--orphans` | ⚠️ 순환 **1**, 고립 **458** | 라우트를 엔트리로 못 봐 오탐多 → 독립 신호 미채택 |
| eslint no-unused-vars | (Phase 0 lint) | 경고 ~738(unused-vars·any 다수) | export/변수 레벨 참고 |
| git 12mo 미수정 | (Phase 0) | **0건** | 초고활성 저장소 → 나이 신호 무용 |

## 2. 🔑 신뢰도 계층 (도구 합의로 본 결론)

- **파일 레벨은 합의 없음**: `audit:files`는 226 코드파일을 미사용으로 보지만, **knip은 완전 미사용 파일 0개**(763 이슈 전수 확인). 즉 `middleware.ts`·`pages/*`·`lib/*` 등은 knip 기준 **살아있음**. → **파일 삭제 후보는 어떤 도구도 단독 확정 불가**, 전량 Phase 2 동적 8-검증 필요.
- **export 레벨은 부분 합의**: knip 498 ⊂ ts-prune 689. **knip 498이 정본**(엔트리 필터링).
- **의존성 레벨은 강한 합의**: knip 10개가 depcheck 13개의 **부분집합**(knip-only 0). 10개 양쪽 합치 → 가장 신뢰 높은 신호(단 빌드·네이티브 오탐 별도 판별 필요).
- **중복 247군은 거의 전부 의도된 루트↔public 미러**(`sync:public`) → 고아 아님.

## 3. 후보 인벤토리 A — 미사용 의존성

| 패키지 | knip | depcheck | 오탐 위험 / 판단 |
|--------|:---:|:---:|---|
| `@capacitor/android·app·browser·core` | ● | ● | 🔴 **오탐(네이티브·`cap sync` 빌드)** → C등급, 삭제금지 |
| `@opennextjs/cloudflare` (dev) | ● | ● | 🔴 오탐(`deploy:cf:opennext` 빌드) |
| `lighthouse` (dev) | ● | ● | 🔴 오탐(`perf:psi` 스크립트) |
| `@jest/globals` (dev) | ● | ● | 🟡 오탐 가능(테스트 import) — 확인 |
| `autoprefixer`·`postcss`·`tailwindcss` (dev) | | ● | 🔴 오탐(PostCSS/Tailwind 빌드) |
| `@types/react-dom` (dev) | | ● | 🔴 오탐(타입 전용) |
| `@tanstack/react-virtual` | ● | ● | 🟢 **실질 후보**(가상화 미사용 시 제거) — grep 확인 |
| `recharts` | ● | ● | 🟢 **실질 후보**(차트 미사용 시) — grep 확인 |
| `ajv` | ● | ● | 🟡 스키마 검증 — worker/스크립트 사용 확인 |
| `zustand` | | ● | 🟡 상태관리 — 동적 사용 확인 |
| `@tiptap/react·starter-kit·extension-image·extension-link` | | ● | 🟡 에디터(admin) — 사용 확인 |
| `tz-lookup` | | ● | 🟡 타임존 — worker/astro 사용 확인 |

- **missing(선언 없이 사용) 10종**: `puppeteer`·`puppeteer-core`·`esbuild`·`redis`·`ws`·`@babel/parser`·`htmlparser2`·`css-select`·`css-tree`·`domutils` — 고아와 무관(주로 스크립트/전이 의존), **범위 밖**이나 기록만.

## 4. 후보 인벤토리 B — 미사용 export (knip 498, 정본)

파일 삭제보다 저위험. 상위 밀집 파일(Phase 2에서 개별 export 참조 재확인):

| 미사용 export 수 | 파일 |
|:---:|---|
| 15 | `worker/lib/vedic-premium-generator.js` |
| 13 | `worker/lib/security/index.js` |
| 11 | `worker/lib/island/island-weights.js` · `app/_lib/user-session-cache.ts` · `lib/tarot/tarot-interpretation-engine.mjs` · `src/lib/maya-calendar.ts` |
| 10 | `lib/famous-saju/celebrity-saju-service.ts` |
| 8–9 | `lib/stories/data.ts` · `lib/palm/palm-map-engine.js` · `lib/sukuyo-calendar.ts` · `worker/lib/astro-premium-generator.js` · `lib/tarot/numerology-tarot.mjs` |

⚠️ `worker/lib/*`는 결제·AI 인접이 많아 export 제거도 신중(Phase 2에서 배럴 re-export·동적 참조 확인).

## 5. 후보 인벤토리 C — 미사용 파일 (audit:files 443)

**탐지 도구 표기**: 파일 후보는 전부 `[audit:files (+madge-orphans)]`이며 `knip=미검출`(=knip이 라이브로 봄). 카테고리별 오탐 위험:

| 카테고리 | 수 | 오탐 위험 | Phase 2 처리 |
|---|---:|---|---|
| **프레임워크 규약** (`middleware.ts`, `pages/_app·_document·404·500`, `next-env.d.ts`, `postcss/tailwind/jest.config`, `apps/mobile/capacitor.config.ts`) | ~10 | 🔴 **라이브 확정(오탐)** | 즉시 제외(§7) |
| **테스트** `__tests__/**` | 58 | 🟡 jest가 실행 | 개별 확인(삭제가치 낮음) |
| **빌드/CI/마이그레이션 스크립트** `scripts/**` | 71 | 🟡 CLI/CI 호출 | 3중 대조(특히 미배선 verify 13종 — Phase 0 §4) |
| **정적 셸 로드 JS** `js/**` | 38 | 🔴 셸이 `<script src>`로 로드 | 셸 grep 보완 필수 |
| **lib/components/src/types 클러스터** | ~64 | 🟢 **실질 후보군(피처 단위)** | §6 우선 조사 |
| **에셋**(store-assets PNG, ephe `.se1`, splash 등) | 217 | 혼재 | 스토어/네이티브/폰트 별도 판별 |

- `store-assets/**`(7, 12.7MB): 구글플레이 스토어 스크린샷 — 저장소 릴리스 자산일 뿐 런타임 미참조. 제거 가능성 높으나 **릴리스 프로세스 확인 후**(B등급).
- `worker-dev.err`·`tsconfig.tsbuildinfo`·`seo-audit-report.md` 등 루트 산출물: `safe-clean-repo` 성격(빌드 부산물) — 별도 처리.

## 6. Phase 2 우선 조사 shortlist (피처 단위, 최종수정·크기)

> 전 후보 최종수정 <6개월(Phase 0). 아래는 **파일 삭제 실질 후보**. `2026-05-10`처럼 생성 후 미수정 클러스터가 폐기 의심 높음.

#### Maya 캘린더 (피처 통째 의심)
| 경로 | 최종수정 | KB |
|---|---|---|
| lib/maya/maya-calendar.ts / maya-data.ts / maya-reading.ts | 2026-06-2x | 7.3 / 25.4 / 4.5 |
| src/lib/maya-calendar.ts (중복 세대?) | 2026-06-21 | 6.5 |
| components/maya/MayaCalendarWheel·MayaFortunePage·MayaResultCard.tsx | 2026-06~07 | 2.2 / 24.4 / 8.9 |

#### SEO 유틸 (중복 세대 의심 — `2026-05-10` 동시 생성 후 방치)
| 경로 | 최종수정 | KB |
|---|---|---|
| lib/seo/breadcrumbs·createMetadata·keyword-clusters·keywords·schema.ts | **2026-05-10** | 0.2~8.0 |
| lib/seo.v2.ts / lib/share.v2.ts | 2026-06-15 / 06-03 | 7.1 / 2.0 |
| lib/seo-site-urls.ts | **2026-07-25(오늘)** | 10.3 | ← 최근 수정 = 라이브 가능성, 주의 |

#### destiny-meeting-place / animal-twelve / DestinyLibraryBanner
| 경로 | 최종수정 | KB |
|---|---|---|
| components/fortune/destiny-meeting-place/*.tsx (2) | 2026-06-26 | 15.6 / 4.8 |
| components/fortune/animal-twelve/*.tsx (3) + GuardianAnimalSprite.tsx | 2026-05~06 | 4.3~9.7 |
| components/DestinyLibraryBanner.tsx | 2026-07-18 | 7.2 |

#### tea-house 하위 컴포넌트 (6) — src/features/fortune-tea-house/components/
`HumanYeoniReveal·TalkingPigYeoni·TeaHouseCTA·TeaHouseFlowPreview·TeaHouseStoryIntro·YeoniTransformScene` (2026-06~07, 1.3~5.4KB)

#### 🟨 B등급 강제 (서사 자산 — 삭제 판단 금지, Phase 2-8)
- `components/yeon/YeonCardDownloadButton·YeonShareCard·YeonSpriteFrame·YeonTypewriterBubble.tsx`
- tea-house의 연이/꽃돼지 대사 컴포넌트, 중복군의 `말하는 꽃돼지 연이3-Photoroom.png`↔romanized 이름변형

#### 🔴 C등급 (검증만, 삭제금지)
| 경로 | 사유 |
|---|---|
| lib/mongodb.ts | 코어 Mongo 싱글턴(CLAUDE.md) |
| lib/payment/portone.ts | 결제(PortOne 클라이언트) |
| apps/mobile/capacitor.config.ts · middleware.ts | WebView 부팅 · Next 미들웨어 |
| js/saju-engine*.js · js/core/kasi-* · js/core/saju/* | 사주 계산 도메인 |

## 7. 즉시 라이브 확정 (오탐 → 후보에서 제외)
`middleware.ts`, `pages/_app.tsx·_document.tsx·404.tsx·500.tsx`, `next-env.d.ts`, `postcss.config.mjs`, `tailwind.config.js`, `jest.config.cjs`, `apps/mobile/capacitor.config.ts`, 의존성 `tailwindcss/postcss/autoprefixer/@types/react-dom/@capacitor/*/@opennextjs/cloudflare/lighthouse`.

## 8. 다음 단계 (Phase 2)
- 대상: §6 shortlist(파일) + §4 export 밀집(선택) + §3 실질 dep 후보(🟢🟡).
- 방법: 프롬프트의 **동적 8-검증** 전수(특히 ③문자열 동적 import·④R2/`/fuctionassets` 문자열·⑥빌드타임·⑧서사자산) + verify 13종 **3중 대조**.
- 산출물: `docs/orphan-audit/02-dynamic.md`.
