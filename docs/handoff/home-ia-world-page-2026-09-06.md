---
status: active
updated: 2026-09-06
next: Phase 3 `/world/` 구현 완료 — PR #1637 CI 전부 통과, **사용자 머지만 남았다**. 머지 뒤 Phase 4(시각 디테일) → Phase 5(검증) 순서. 목업 승인은 끝났으니 다시 묻지 말 것.
---

# 홈 IA 재설계 + 캐릭터·세계관 페이지(`/world/`) 신설

## 왜

사용자 프롬프트(2026-09-06): "메인의 임무는 운명 카드를 만들게 하는 것 하나". Phase 1 진단 → 2 메인 IA(8섹션) → 3 `/world/` 신설 → 4 시각 디테일 → 5 검증. **각 Phase 는 코드 전에 변경 대상 파일·요약·리스크 표를 내고 사용자 '진행' 뒤에만 구현.**

## 지금 상태

- Phase 1 진단 완료(코드 변경 0). 리포트 원문은 세션 플랜 파일 `C:\Users\user\.claude\plans\code-destiny-elegant-quokka.md` (레포 밖). 핵심만 아래에.
- Phase 2 목업 승인됨(아티팩트 https://claude.ai/code/artifact/5b1a51bc-2726-49de-972a-bd2cd02ee634 — 90일권은 목업 오류였고 4등급 전부 30일로 정정). PR-A 구현 완료·PR 대기(브랜치 `worktree-home-ia-phase2`).
- PR #1628(PR-B) 충돌 해소 완료(2026-09-06): origin/main 을 브랜치에 병합한 뒤 `sync:public` 으로 캐시버스트 해시를 재생성했다. 충돌은 전부 `?v=build-<hash>` 참조였고 내용 차이 0건 — 로컬 cachebust merge driver 가 해소하지만 **GitHub 은 그 드라이버를 못 돌려 충돌로 판정**하므로, 정적 셸을 건드리는 PR 은 앞으로도 main 을 브랜치에 병합해 올려야 한다. 현재 mergeable=MERGEABLE / CLEAN, PR CI 전부 통과.
- PR-B 구현 완료(2026-09-06): `#dpDestinyPanel`(스타일+프로필 카드+토글+폼)을 `.moon-hero` 안으로 노드째 이동, 861px 이상 2열(카피 | 패널, 위쪽 정렬) — 규칙은 `cd-hero-form-in-hero-v20260906`(hoist 사본·renaissance 두 곳 동일). 폼 상시 열림은 실측으로 기각(폼 1,968px → 히어로 2,827px). `#cdConcernPick`(스타일+섹션+스크립트)은 `#cdHomeExpandToggle` 뒤 `data-cd-home-secondary` 로, 1차 동선은 `#cdSignatureConsult` 머리글의 `.cd-sig__concern-link`(`home.concernPick.title` 재사용, 신규 키 0). 컬렉션 8그룹은 이미 접기 축이라 이동 없음. CLS 실측(dist·CDP·3회): 모바일 ≤0.0022 / 데스크톱 최악 0.052, 09-04 dist 기준선 0.0011 / 0.056 과 동급.
- PR-A 가 한 것: 네오 테마 버튼 🌙→🦁, 히어로 `Celestial Fortune Collection` 줄 삭제, 히어로 CTA 1개(`✦ 운명 카드 만들기` → `#destinyCardForm`, 12로케일 `home.hero2.primaryCta` 갱신), `.membership-recap-cta` 를 `#cdHomeSecondaryPanel` 밖 `#cdSignatureConsult` 직후로 옮기고 `home.passMini.*` 키 재사용 4등급 카드 추가(`/points/?source=main-membership&plan=<tier>`), 홈 셸·fortune 허브 셸·sitemap 주석의 `꿀꿀 만세력` 표기 제거(ko.json `home.homeGuide.lead/sajuBody` 동반).

## 사용자 결정 (2026-09-06, 다시 묻지 말 것)

| 항목 | 결정 |
|---|---|
| 화폐 | `월정석` (영문 표기는 아직 없음 — Phase 2 에서 제안) |
| 이용권 | `달빛 이용권`, 영문/별칭 `문라이트 패스`. 맨 `이용권` 단독은 쓰지 않는다. 가드 주석도 제품명을 `달빛 이용권`으로 인지(`scripts/verify-paid-gate-ui-regression.mjs:355`) |
| 브랜드 | 노출 1순위 **`꿀꿀 운세`**. `CODE DESTINY`/`코드 데스티니`는 **회사명**(푸터·법적 표기). **`꿀꿀 만세력` 은 삭제** — 셸 7곳(index.html 940·951·962·1042·1044·20496) + `scripts/build-fortune-hub-shell.mjs:276,337` + `generate-sitemap.mjs:177` 주석 + 브랜드 가드 `__tests__/ui/site-name-signals.static.test.js` 동반 수정 |
| 신뢰 문구 | 에이전트 재량. 정본 `lib/structured-data.ts SITE_AUTHOR`(박병하·명리학자 10년), 현 문안 `i18n/authored/core-05.json` `home.homeGuide.authorNote`. "대통령 운세 적중" 미기재 유지 |
| 꽃돼지 | 심볼 **🌸(꽃)**. 정체는 코드·프롬프트·노벨 일관대로 **연이의 다른 모습(A)** 으로 진행 |
| 네오 | 심볼 **🦁(사자)**. `index.html:9322` 의 🌙 은 🦁 로 |
| 연동 토글 | 에이전트 재량 → **셸 테마 토글** `localStorage.fortuneThemeModeStateV1`(`pig`\|`neo`) 채택. fortune-chat 의 `character` state 는 별개 축이라 건드리지 않는다 |
| 절대규칙 6 | 이 프롬프트가 "덜어내기" 요청이다. 단 08-30·09-01 핸드오프의 기각 사유(`docs/handoff/home-positioning-2026-08-30.md`)는 목업 단계에서 항목별로 다시 판정한다 |

## Phase 1 핵심 사실 (Phase 2 설계 입력)

- 홈은 정적 셸 `index.html`(38,228행) + 미러 6개. 랜딩 섹션은 `<main id="inputPage">` 9306~ 에 정적 마크업. 히어로 `.moon-hero` 9488~9599, 폼 `#destinyCardForm` 9852, `#cdConcernPick`(START HERE) 10155, `#cdSignatureConsult` 11702, `#cdFortunePick`(FORTUNE GATE) 15023, 이용권 섹션 2개(17580·17774), 푸터 20544.
- 사주 결과 화면은 `article#resultPage` 19432~20488 에 **정적 포함**(`display:none`). 채우는 체인은 `js/core/index-inline-runtime.js:2172` `__cdEnsureSajuCoreLoaded()`. 프롬프트의 불변 심볼(`sajuAdapter.ts`·`normalizeSaju.ts`)은 셸이 호출하지 않는다.
- 결제 게이트 정본 `index.html:23909` `_cdOpenPaidServiceGate`; `data-mode="pass-store"` 는 JS 생성. 결과 UI 분리 전 `paid-gate-auditor` 로 `config/payment-freeze.json` 대상 여부·대운/종합풀이 잠금 실체 확정(미검증 2건).
- 막다른 안내 7곳: `index.html:18375·18648·18678`, `js/core/index-inline-runtime.js:8106·8405·8473`, `js/saju-engine-tarot-sukuyo-quantum.js:14401·14431·14649`.
- 캐릭터 토글은 두 축(테마 vs fortune-chat LLM 프롬프트 `worker/lib/guardian-fortune-prompt.js:11-29`), 서로 무연동.
- 푸터 20583(라이트 노벨)·20584(캐릭터·세계관)이 같은 `/codedestiny-novel.html`. 키 `footer.story.{novel,world}`. 노벨 지명 실재: 사주의 강·재성의 섬·인성의 도서관·붉은 실·타로의 문·별들의 궁(자미두수). "운명의 지도"·점성술·베다 지명은 없음.
- 자산: 연이·네오·꽃돼지 모두 보유, 부족 인물 없음. 네오 히어로급(≥1024px) 로컬 원본은 없음(최대 543px 스프라이트, R2 `DestinyWar/전략실 네오 메인-Photoroom.png` 만).
- i18n: ko 폴백 없음(폴백 en, 누락은 `MISSING_TEXT`). 신규 페이지 짝: `app/methodology/page.js`(단일 파일) 또는 `app/fortune-tea-house`(네임스페이스 사전). 신규 라우트는 색인 결정 5곳 + 가시 텍스트 1,800자 게이트(`docs/context/seo-and-adsense.md`).

## 남은 작업

- [x] Phase 2 목업 → 승인 → PR-A 구현.
- [x] Phase 2 PR-B(폼→히어로·고민 선택→접기 축·모달 감사). 잠금 블록은 재작성 불필요했다(새 규칙을 canon/fold 밖 renaissance 에 둬 가드 무변경 통과).
- [ ] PR-B 에서 보류·발견(고치지 말고 판단만): (해소됨: 푸터 `footer.story.world` 는 PR #1637 에서 `/world/` 로) · `#cdTodayPick` 은 사용자 PR-B 목록에 없어 손대지 않음 · 히어로 베일 그라디언트 하단 구간(62%→100% 크림)이 패널이 들어오며 길어져 카드가 "배경 밖"처럼 보임(모바일 실측, visual-checker) · 데스크톱 1280 캡처에 하단 탭바 `#cdMobileBottomNav` 가 보임(PR-B 전부터인지 미검증) · 쿠키 배너가 첫 화면 CTA 를 가림(기존).
- [ ] 구명 잔재 후속(PR-A 범위 밖, 손대지 않음): `public/i18n/ko/shellRuntime.json` f9·f70·f2951, `lib/seo/siteSeo.ts`·`siteConfig.ts`·`entity-registry.mjs`, `app/components/SeoJsonLd.jsx`, `manifest.json`, `llms.txt`, `js/fortune-engine.js`·`js/share.js`, `i18n/authored/shellCopy-02.json`, `lib/i18n/siteFooterHubCopy.ts`, `public/famous` og:site_name 주석. 사전 고아 키 `home.hero.brandLine`·`shell.moonHeroCopy.moonHeroActions.k107dp07`.
- [ ] 에이전트가 짚은 결함(고치지 말고 보고만): `index.html` 미니 배지 `labels`/`freeLimits` 와 `worker/routes/payments.js` `SUBSCRIPTION_BASE_PLANS` 는 등급명 6번째 사본인데 `verify:pass-tier-policy` 사본 스윕 밖; `syncMembershipStatus` 의 "다음 갱신 전까지" 문구는 자동갱신 없는 상품과 모순; 새 4등급 `<a>` 는 `routeToMembership` 의 로그인 프롬프트를 거치지 않음(선례 recap CTA 와 같음, 원하면 `data-membership-cta="plan"` 한 줄).
- [x] Phase 3 `/world/` 목업(https://claude.ai/code/artifact/4ea6c6ac-6895-4715-a158-fb7e0229a3c5) → 승인 → 구현 완료. **PR #1637**, CI 전부 통과·머지 대기. 로케일 분기는 두지 않았다(ko 단일) — 짝 구현 `/methodology`·`/about` 과 같고 고유명사 비중이 커 기계 번역이 크게 깨지는 유형이라, 12로케일 번역은 별도 과제로 남겼다(사용자 승인). 푸터 `footer.story.world` 는 `/world/` 로 바꿨다. 제품 표기는 **라이트 노벨**(게임·플레이 금지, 2026-09-06 사용자 지시).
- [ ] Phase 4·5 는 프롬프트 원문대로.

## 함정

- `scripts/build-fortune-hub-shell.mjs` 를 고치면 `node scripts/build-fortune-hub-shell.mjs` 로 `fortune/index.html` 을 재생성한 뒤 `sync:public` 을 **다시** 돌려야 `public/fortune/index.html` 이 따라온다(첫 sync 는 옛 셸을 복사한다 — 2026-09-06 실측).
- `check:quick` 은 2026-09-06 워크트리(node_modules 없음, 상위 탐색)에서 끝까지 통과했고 `dist/` 까지 만들었다 — 그 뒤 `verify:adsense-readiness`·`verify:mobile-cdp-smoke` 를 로컬에서 돌릴 수 있다(둘 다 통과). 셸을 고쳤으면 `sync:public` → `sitemap:generate`(lastmod 원장 드리프트) 순서다.
- 셸 편집은 `sync:public` 미러 동커밋, `verify:hero-contrast`·`verify:mobile-detail-nonintrusive`·`i18n:check`·브랜드 가드 동반. 나머지는 CLAUDE.md 라우팅 표.

## 검증

```
npm run verify:guard-wiring   # 도는 가드 목록의 정본
npm run i18n:check && npm run check:quick
```

## 모르는 것

- 월정석 영문 표기 — Phase 2 목업에 제안을 싣고 사용자 확정.
- 신규 페이지 URL 확정: `/world/`. 라우트·리다이렉트 전수 grep 0건이라 충돌 없음(2026-09-06 실측).
