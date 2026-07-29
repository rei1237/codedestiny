# Phase 3 — 등급 분류 & 정리 계획

> 커밋 `31cab3bdd` / 격리 worktree. Phase 1 정적 + Phase 2 동적 8-검증 결과의 최종 등급.
> 원칙: 애매하면 낮은 등급(보호)으로. A등급도 **항목별 사용자 승인** 후에만 Phase 4 격리.

## 🔴 실질 효과 — 먼저 정직하게

- **A등급 15항목 = 소스 약 104KB, 15파일 + 미사용 의존성 1.**
- **프로덕션 번들/런타임 이득 = 0.** 이 죽은 모듈들은 애초에 아무도 import하지 않아 빌드 산출물에 포함되지 않는다. 제거 효과는 **저장소·유지보수 표면 정리 + 중복 구현 혼동 제거 + typecheck 소폭**뿐.
- 큰 바이트는 clean 제거 대상이 아니다: `js/**` 7MB = **LIVE**(셸 로드), `store-assets/**` 12.7MB = **릴리스 자산**(런타임 무관, 레포 경량화 용도로만 선택적).
- **결론**: 리스크는 낮지만 이득도 크지 않다. "혼동되는 죽은 중복 구현 정리"라는 명확한 가치가 있는 항목(Maya 구중복, lib/seo 죽은 디렉토리) 위주로 진행하고, 나머지는 무리하지 않는 것이 합리적이다.

---

## A등급 — 안전 제거 (외부 참조 0 확인, 살아있는 대체 존재, 비민감)

각 항목 **Phase 2에서 외부 마운트 0 + 동적 8경로 무참조 확인**. 격리는 `git mv` → `_graveyard/20260725/`.

### A-1. Maya 구(舊) 중복 구현 (6파일 ~73KB)
`lib/maya/maya-calendar.ts` · `lib/maya/maya-data.ts` · `lib/maya/maya-reading.ts` · `components/maya/MayaFortunePage.tsx` · `components/maya/MayaCalendarWheel.tsx` · `components/maya/MayaResultCard.tsx`
- 근거: `MayaFortunePage`를 어떤 라우트도 import 안 함. **LIVE는 `app/maya` → `src/components/maya/MayaCalendarView`(src버전)**. 두 세대가 공존하다 구세대만 남음.

### A-2. `lib/seo/` 죽은 하위 디렉토리 (5파일 ~10KB)
`lib/seo/breadcrumbs.ts` · `lib/seo/createMetadata.ts` · `lib/seo/schema.ts` · `lib/seo/keywords.ts` · `lib/seo/keyword-clusters.ts`
- 근거: `lib/seo/index.ts` **부재** → app 35개 페이지의 `import ".../lib/seo"`는 **`lib/seo.ts`(별개 파일)로 해석**. 이 5파일은 배럴 미연결(`keywords↔keyword-clusters`만 상호참조 = madge 순환 1건의 정체). LIVE는 `lib/seo.ts` + `lib/seo.v2.ts`.

### A-3. destiny-meeting-place 미마운트 피처 (2파일 ~20KB)
`components/fortune/destiny-meeting-place/DestinyMeetingPlaceFeature.tsx` · `DestinyMeetingPlaceHero.tsx`
- 근거: `DestinyMeetingPlaceFeature` 외부 import 0(Feature→Hero 내부만). `/fuctionassets/` 자산 참조는 있으나 컴포넌트 자체가 미마운트.

### A-4. 스텁/미사용 유틸 (2파일 <1KB)
`lib/fpti/saju-fpti-adapter.ts`(0.1KB, `fpti-adapter.ts`의 미사용 배럴) · `lib/optimized-image-url.ts`(0.6KB, 참조 0)

### A-5. 미사용 의존성 (1)
`@tanstack/react-virtual` — 소스 사용 0. **별도 커밋(의존성 제거)**, `package.json`에서 제거(package-lock는 `npm install`이 갱신).

---

## B등급 — 보류 · 개별 질문 (참조는 없으나 판단이 필요)

> 아래는 **네오 결정 필요 항목**. 임의 처리하지 않는다.

| # | 항목 | 파일 | 질문 |
|---|---|---|---|
| B-1 | animal-twelve 구버전 | `components/fortune/animal-twelve/AnimalCard·AnimalCharacterSvg·AnimalResultSections.tsx` + `components/fortune/GuardianAnimalSprite.tsx` (4) | 외부 마운트 0이나 **사주/animal-destiny 인접**(LIVE는 `app/saju/animal-destiny`). 구버전 확정 제거? |
| B-2 | 🟨 tea-house 인트로(서사) | `src/features/fortune-tea-house/components/HumanYeoniReveal·TalkingPigYeoni·TeaHouseCTA·TeaHouseFlowPreview·TeaHouseStoryIntro·YeoniTransformScene.tsx` (6) | **연이·꽃돼지 서사**(Phase 2-8). 기획 대기 자산일 수 있음 — 유지가 기본. 제거 검토할지? |
| B-3 | 🟨 yeon 컴포넌트(서사) | `components/yeon/YeonCardDownloadButton·YeonShareCard·YeonSpriteFrame·YeonTypewriterBubble.tsx` (4) | **연이 서사**(Phase 2-8). 유지가 기본. 제거 검토할지? |
| B-4 | DestinyLibraryBanner | `components/DestinyLibraryBanner.tsx` | 마운트 0이나 **2026-07-18 최근 수정 + tailwind.config 팔레트 주석** → 진행중 피처 가능. 유지? |
| B-5 | i18n-locales | `lib/i18n-locales.js` | 참조 0이나 **i18n 배포 게이트 민감**. 확인 후 처리 |
| B-6 | saju-premium 타입 | `types/saju-premium-report/*` (일부) | 내부 배럴만 사용, 사주 리포트 인접 타입 |
| B-7 | store 스크린샷 | `store-assets/**` (7 · 12.7MB) | 런타임 무관 **구글플레이 릴리스 자산**. 레포 경량화로 격리? 유지? |
| B-8 | 미배선 verify 가드 7종 | `verify-portone-webhook-signature·auth-p0p1-regression·coin-gate-degraded-preview·famous-saju-magazine·health-report-regression·mindscan-reading·admin-saju-prompt-kasi-calendar` | **결제·인증 회귀 가드**. 삭제 금지 권장 — package.json에 **배선(살리기)**할지, 그대로 둘지? |
| B-9 | scripts 일회성 의심 | `gen-daily-2026-03-21.mjs·rm-godlife.mjs·inject-godlife.mjs·patch-*.mjs` 등 | 과거 일회성 — 개별 확인 후 |

---

## C등급 — 보호 (손대지 않음)
결제(`lib/payment/portone.ts`, PortOne/Inicis 전체), 사주 계산(`js/saju-engine*`, `js/core/saju/*`, `js/core/kasi-*`, `animal-destiny/lib/sajuAdapter`), `lib/mongodb.ts`, WebView(`apps/mobile/*`, `middleware.ts`, 정적 셸·미러·`mobile-lite.css`·`ads.txt`), 프레임워크 규약(`pages/*`, configs), `__tests__/**`(jest), 관상 이중사본, 사용 중 의존성 다수.

## 다음 단계 (Phase 4)
- **A등급(A-1~A-5) 항목별 승인** 후 → `git mv` `_graveyard/20260725/` 격리 → `lint`·`typecheck`·관련 `verify:*` 검증 → `04-quarantine.md`.
- B등급은 질문 답변에 따라 별도 처리.
