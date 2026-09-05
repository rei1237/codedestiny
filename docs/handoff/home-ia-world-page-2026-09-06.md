---
status: active
updated: 2026-09-06
next: Phase 2 — 홈 IA 8섹션 목업 아티팩트(960px 1컷 + 상태 스펙 + 색 토큰 + 합성색 대비)를 발행하고 사용자 승인을 받는다. 코드는 승인 뒤에만.
---

# 홈 IA 재설계 + 캐릭터·세계관 페이지(`/world/`) 신설

## 왜

사용자 프롬프트(2026-09-06): "메인의 임무는 운명 카드를 만들게 하는 것 하나". Phase 1 진단 → 2 메인 IA(8섹션) → 3 `/world/` 신설 → 4 시각 디테일 → 5 검증. **각 Phase 는 코드 전에 변경 대상 파일·요약·리스크 표를 내고 사용자 '진행' 뒤에만 구현.**

## 지금 상태

- Phase 1 진단 완료(코드 변경 0). 리포트 원문은 세션 플랜 파일 `C:\Users\user\.claude\plans\code-destiny-elegant-quokka.md` (레포 밖). 핵심만 아래에.
- Phase 2 미착수. 이 문서 PR 외 열린 PR 없음.

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

- [ ] Phase 2 목업(원칙 16) → 승인 → 변경 표 → 구현. 판정: 사용자 "진행".
- [ ] Phase 3 `/world/` 목업 → 승인 → 구현(i18n 12 로케일, 산문 복사 0).
- [ ] Phase 4·5 는 프롬프트 원문대로.

## 함정

- 셸 편집은 `sync:public` 미러 동커밋, `verify:hero-contrast`·`verify:mobile-detail-nonintrusive`·`i18n:check`·브랜드 가드 동반. 나머지는 CLAUDE.md 라우팅 표.

## 검증

```
npm run verify:guard-wiring   # 도는 가드 목록의 정본
npm run i18n:check && npm run check:quick
```

## 모르는 것

- 월정석 영문 표기 — Phase 2 목업에 제안을 싣고 사용자 확정.
- 신규 페이지 URL `/world/` vs `/characters/` — Phase 3 진입 시 라우팅 짝을 보고 확정 제안.
