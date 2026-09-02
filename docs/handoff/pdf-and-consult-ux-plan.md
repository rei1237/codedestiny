---
status: active
updated: 2026-09-03
next: "PR-6(#1503) 머지 확인 후, 새 세션·새 워크트리에서 W2 나머지 — E4(fusion 정본화) → PR-C(중복 검출) → PR-B(클램프 배선). i18n 11파일을 다시 만지는 PR-5·E3·레거시 D 저작은 서로 비병행이므로 하나씩."
---

# 전문가 상담 품질·진입 UX·PDF 전면 제공 (13 PR 계획)

## 왜

전문가 상담들의 (1) AI 콘텐츠+화면 품질 개선, (2) 진입 UI/UX 개선, (3) 유료 상담 전부에 결과 화면 [PDF 저장] 버튼(클라이언트 생성, 구매자 무료 부가 기능) 제공.

## 지금 상태

- 확정 계획 정본: `C:\Users\user\.claude\plans\goofy-leaping-curry.md` (13 PR + 후속 3, 축1 PDF / 축2 진입 UX / 축3 AI 품질). 사용자 승인 완료.
- 축1 PDF 4건 · PR-A · W1(E1) · E2 머지 완료(번호는 `gh pr list --state merged`).
- **축4 PR-6(문안 저작) = PR #1503.** 머지는 사용자.
- 나머지 6 PR 전부 미착수.

## 남은 작업

- [ ] W2: E4(fusion 정본화) · PR-C(중복 검출) · PR-B(클램프 배선)
- [ ] W3: ~~축4 PR-6(문안 저작)~~ = #1503 대기 · E5(PaidValueSection+nakshatra) → E6(island)
- [ ] W4: PR-5(셸 saju AI PDF, i18n 11파일) → E3(잔재 키 청소, 백로그)
- [ ] W5(후속): PR-F(pdf.save→deliverPdf 앱 분기, 실기기 검증 필수) · PR-B2
- [ ] PR-1 브라우저 실측(실제 PDF 저장 1회) — 머지 후 스테이징에서. 판정: 커버+21섹션이 각자 새 페이지로 실리고 접힘 상태가 복원되면 끝.
- [ ] PR-2 브라우저 실측 — 리포트는 **'한 장씩' 모드로 둔 채** 저장해 13장(안내+12궁)이 전부 실리는지, 상담은 히어로 이미지가 안 실리는지. `PalaceBadge` 스프라이트가 캔버스에 비면 그건 알려진 허용 결함.
- [ ] PR-3·PR-4 브라우저 실측 — PR-4 는 **미해금 계정에 버튼이 아예 없는 것**과 해금 계정에서 커버+요약+7챕터가 전부 실리는 것 둘 다 볼 것.
- [ ] PR-A 관리자 화면 실측 — `/admin/prompts` 에서 초융합을 골라 그룹 4개가 셀렉트에 뜨고 그룹마다 프롬프트가 다른지. 로컬에선 좌표를 넣으면 Swiss ephemeris URL 이 없어 `partial` 로 내려오는데, 프로덕션 env 에는 그 값이 있으므로 여기서만 확인 가능하다.
- 판정 기준: 각 PR 은 계획 문서의 해당 절 검증 목록 전부 통과 + 사용자 머지.

## 직렬 제약 (이것만 지키면 순서 자유)

1. PR-1 → E5 (같은 파일 `app/nakshatra/ai/NakshatraAiClient.tsx`)
2. PR-2 → E6 (같은 파일 `app/island-consult/IslandConsultClient.tsx`)
3. {PR-5, E3, 축4 PR-6} 상호 비병행 (`public/i18n` 11파일 공유)

## 정본 예시

배선 관용구: `app/destiny-compass/_components/ReportActions.tsx:38` · PDF 유틸: `lib/pdf/export-result-pdf.ts:146`

셸 카피 파서·`safeKey`·상속 해소의 정본은 `scripts/lib/feature-marketing-extract.mjs`(가드 2개 + 생성기가 공유). 생성물은 `lib/marketing/feature-marketing-copy.generated.json`.

## 셸 카피 번역 축 (PR-6 #1503 에서 닫은 것 · 남은 것)

E2 가 넘긴 6건 중 5건을 #1503 에서 닫았다. 아래는 **남은 것과 그 판단 근거**다.

**남은 것 1 — 레거시 `D` 층 결손 75건(후속 PR, 수기 저작만 가능).** 셸의 미리보기 병합은 `Object.assign({}, template, D[key], copy)` 3층이고, 그중 **레거시 `D` 가 화면을 이기는데 사전이 그 문장을 번역한 것이 아닌 자리**가 75건이다(`fallbackTitle` 22 + `feats` 항목 53). 성격 둘: 사전 없음 39건(11개 로케일에 한국어가 그대로), 다른 문장 번역 36건(사전에 있으나 화면과 내용이 다름 — 상품 카피의 `painPoints` 를 번역한 것). `verify:feature-marketing-dictionary` 의 `LEGACY_LAYER_BUDGET = 75` 래칫이 고정한다 — 줄이면 통과, 늘리면 실패. 0 으로 만드는 방법은 그 75자리의 한국어 원문을 11개 로케일에 **손으로** 쓰는 것뿐이다(자동 번역 = 과금 실호출 금지).

**남은 것 2 — 랜딩 `ServiceCard` 의 `featureKey`·`slug`·`accessType`. 실측 후 의도적 보류.** `MainLandingPage.tsx` 의 href 32개 중 **25개가 href 만으로는 COPY 키에 안 닿는데**, 그중 셸 타일에서 되살릴 수 있는 것은 **6개뿐**이다(`openRuneOracle`·`openGeomancyOracle`·`openAstroModal`·`openZiweiModal`/`navigateToZiweiChart`·`openNevilleMeditationPage`·`openYogaGuru`). 나머지 19개는 **어떤 키로도 저작된 카피가 없다** — href 색인을 넣어도 6개만 고쳐지고 19개는 그대로다. 카드 40여 곳에 `featureKey` 를 손으로 다는 값도 안 된다. 되살리려면 먼저 그 19개의 카피를 저작해야 한다.

**닫은 것에서 다음 세션이 알아야 할 것 하나 — 별칭 ns 는 경로 대조로 못 잡는다.** 셸은 `_pvwSafeKey(_originMarketingKey(copyKey,0))` 로 **원본 키**의 ns 를 쓰는데, 별칭 48개 중 원본에 없는 경로를 만드는 것이 **0개**라 ns 를 되돌려도 경로 검사는 전부 통과한다. 그래서 가드가 그 한 줄과 `_originMarketingKey` 의 `inherit` 추적을 **정규식 소스 계약**으로 문다 — 그 자리를 리팩터하면 정규식도 같이 갱신해야 한다(안 그러면 가드가 "없다"로 뒤집혀 엉뚱한 실패를 낸다).

## 함정

- 전 검증 mock/정적 — 과금 LLM 실호출 0.
- 관리자 랩 조립기를 새로 만들면 **출생지 좌표가 `null` 로 온다**(`worker/routes/admin.js` 의 `buildAdminLabBody`). `Number(null) === 0` 이라 그냥 실으면 위경도 (0,0) 명식이 조용히 만들어진다 — 좌표가 유한수일 때만 실을 것(PR-A 실측).
- 축4 진행분(`docs/handoff/home-ux-audit-2026-09-01.md`)과 PR-5·PR-6·E1 이 겹친다 — 그 문서 먼저 읽을 것.
- copy.ts·NakshatraAiClient.tsx 등 nakshatra 파일, `IslandConsultClient.tsx`, `components/fpti/**` 는 순수 CRLF — node 패치 스크립트로만 수정(3세션 연속 실전 확인).
- 🔴 **셸 카피 병합 순서는 field-major, layer-minor 다** — `src.first('subheadline','headline')` 은 `subheadline` 을 copy→D→template 3층에서 먼저 찾고, **그 다음에** `headline` 으로 넘어간다. 층을 바깥 루프로 놓고 세면 레거시 승리를 과다 계산한다. `_inferMarketingTemplate` 이 DOM 의존이라 정적으로는 템플릿을 못 고르므로, 가드는 **9종 전부에서 레거시가 이길 때만** 결손으로 세고 그 판정이 정확하도록 템플릿 키 집합이 전부 같다는 것을 단언한다(달라지면 실패하며 이유를 알려준다).
- 🔴 **가드는 통과가 아니라 변이로 확인한다.** PR-4 는 변이 12종(게이트 제거·마커 무조건 부착·데이터 절단 제거·강제 마운트 제거 등)을 하나씩 넣고 전부 실패하는 것을 확인했다. "초록불"만으로는 무는지 알 수 없다.
- 🔴 **PR 마다 가드 자리를 실측할 것.** 계획서가 지목한 `verify:*` 가 (a) 소스를 안 읽거나 (b) `verify-guard-wiring` 에 미배선으로 선언돼 있으면 거기 얹은 단언은 CI 에서 영영 안 돈다. PR-2 가 그 경우여서(`verify:ziwei-island` = 엔진 전용 + 미배선) `__tests__/ui/*.static.test.js` 로 돌렸다 — `test:node` 가 글로브로 집어 pr-ci fast 잡(상시)에서 문다.
- 캡처 대상에 `sticky`/`transform`/`fill-mode: both` 등장 애니메이션이 있으면 `[data-export]` CSS 스위치가 필요하고(PR-1·PR-3), 없으면 불필요하다(PR-2·PR-4). 조상에 있는 건 상관없다 — html2canvas 는 캡처 노드의 서브트리만 그린다. `backdrop-filter` 는 html2canvas 가 아예 무시하므로 스위치 사유가 못 된다(PR-3 실측).
- 화면 상태 UI(접기/펼치기 배지 등)를 캡처에서 빼는 데는 CSS 스위치보다 렌더 조건(`{!pdfExporting && …}`)이 싸다 — PR-4 는 그래서 CSS 를 한 줄도 안 건드렸다.

## 검증

```
npm run verify:nakshatra-ai-flow   # PR-1 가드(섹션 D 9단언 추가됨)
npm run test:node                  # PR-2·PR-3·PR-4·E2·PR-6 가드 포함(*.static.test.js)
node scripts/generate-sitemap.mjs --check   # 결과 화면 파일을 고치면 원장이 드리프트한다
npm run verify:feature-marketing-dictionary # 셸 카피를 만지면: 상품·템플릿·레거시 3층
```

`index.html` 을 고치면 `sync:marketing-copy` · `sitemap:generate` · `sync:public` 산출물을 **같은 커밋에** 담는다. `verify:public-mirror-fresh` 가 윈도우에서 `.ignore` 하나로 헛실패하는데(개행만 다름 — CRLF 209 vs 43, 내용 정규화하면 동일), 그 파일만이면 CI 를 믿는다.

축1 PDF PR 은 매번 `sitemap:generate` 로 원장을 갱신해 같은 커밋에 담아야 한다(PR-3 은 9개, PR-4 는 `/saju-fpti/` 1개 드리프트).

## 모르는 것

- 셸 PDF 미제공 잔여(sibyl-dominator·프롬프트 생성기류·vedic-astrology.html·pet-saju.html)는 사용자 확정으로 범위 제외 — 재론 시 사용자에게 물을 것.
