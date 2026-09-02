---
status: active
updated: 2026-09-03
next: "E2(#1498) 머지 확인 후, 새 세션·새 워크트리에서 W2 나머지 — E4(fusion 정본화) → PR-C(중복 검출) → PR-B(클램프 배선). 🔴 축4 PR-6(문안 저작) 에 들어가기 전에 아래 'E2 가 남긴 것'을 읽을 것 — 셸 별칭 23종이 번역을 못 받고 있고 가드가 그 축을 안 본다."
---

# 전문가 상담 품질·진입 UX·PDF 전면 제공 (13 PR 계획)

## 왜

전문가 상담들의 (1) AI 콘텐츠+화면 품질 개선, (2) 진입 UI/UX 개선, (3) 유료 상담 전부에 결과 화면 [PDF 저장] 버튼(클라이언트 생성, 구매자 무료 부가 기능) 제공.

## 지금 상태

- 확정 계획 정본: `C:\Users\user\.claude\plans\goofy-leaping-curry.md` (13 PR + 후속 3, 축1 PDF / 축2 진입 UX / 축3 AI 품질). 사용자 승인 완료.
- **축1 PDF 머지 완료: PR-1(#1451) · PR-2(#1460) · PR-3(#1475) · PR-4(#1488).**
- **PR-A(초융합 랩 등록 + CMS 카탈로그 드리프트) 머지 완료(#1491).**
- **W1 닫힘: E1(카피 추출 파이프라인) 머지 완료(#1490 뒤 78be90504).**
- **E2(허브 모달 전환) = PR #1498.** CI 5종 통과, 머지는 사용자.
- 나머지 7 PR 전부 미착수.

## 남은 작업

- [x] W1: PR-A(#1491) 머지 · E1(카피 추출 파이프라인) 머지
- [ ] W2: ~~E2(모달 전환)~~ = #1498 대기 · E4(fusion 정본화) · PR-C(중복 검출) · PR-B(클램프 배선)
- [ ] W3: 축4 PR-6(문안 저작, 축4 소유) · E5(PaidValueSection+nakshatra) → E6(island)
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

E1 산출물(E2 가 소비할 것): `lib/marketing/feature-marketing-copy.generated.json` = `{ items: { "<셸 카피 키>": { dictNs, copy } }, templates: { "<카테고리>": { dictNs: "template_<카테고리>", copy } } }`. `inherit` 은 이미 해소돼 남아 있지 않고 `dictNs` 는 `featureMarketing.<dictNs>` 조회용으로 미리 계산돼 있다. 파서·`safeKey`·상속 해소의 정본은 `scripts/lib/feature-marketing-extract.mjs`(가드 2개와 공유).

## E2 가 남긴 것 (축4 PR-6 입력 · 전부 미조치, 2026-09-03 실측)

React 모달은 전부 옳게 고쳤고 아래는 **셸(index.html) 쪽** 이거나 문안 저작 소유다. 축2 는 셸 0-diff 라 여기서 손댈 수 없었다.

- 🔴 **별칭 네임스페이스 누락** — `inherit` 별칭 40개 중 **23개가 타일 속성으로 도달 가능**한데 셸은 별칭 자기 이름으로 사전을 찾아 번역이 안 붙는다. `verify:feature-marketing-dictionary` 는 별칭을 통째로 건너뛰어 이 축을 못 본다(대신 `__tests__/ui/feature-marketing-copy-generated.static.test.js` 의 "모든 dictNs 가 en 사전에 실재한다" 가 생성 JSON 축을 문다).
- 🔴 **셸 단일 ns 누수 204건(en 기준)** — 셸은 병합 객체 전체를 상품 ns 하나로 조회해서, 템플릿에서 상속받은 값은 상품 ns 에 없어 한국어로 남는다. React 는 필드마다 값이 온 ns 를 본다.
- `template_music` 의 `badge`·`headline` 사전 구멍 2건 — 모달 테스트에 래칫으로 고정(늘어도 낡아도 실패).
- 카테고리 표기표 미매핑 6종(상담·휴먼 디자인·관상·심리·읽을거리·이용권, 항목 12개) → 템플릿 이름으로 내려간다.
- `en.featureMarketingTrust.paid.1` 이 셸 문장이 아니라 **삭제된 React 포크의 문장**을 번역하고 있다.
- 랜딩 `ServiceCard` 는 `featureKey`·`slug`·`accessType` 을 안 넘겨 href 로만 매칭된다(가격은 E2-5 의 `featureId` 폴백으로 구제됨).

## 함정

- 전 검증 mock/정적 — 과금 LLM 실호출 0.
- 관리자 랩 조립기를 새로 만들면 **출생지 좌표가 `null` 로 온다**(`worker/routes/admin.js` 의 `buildAdminLabBody`). `Number(null) === 0` 이라 그냥 실으면 위경도 (0,0) 명식이 조용히 만들어진다 — 좌표가 유한수일 때만 실을 것(PR-A 실측).
- 축4 진행분(`docs/handoff/home-ux-audit-2026-09-01.md`)과 PR-5·PR-6·E1 이 겹친다 — 그 문서 먼저 읽을 것.
- copy.ts·NakshatraAiClient.tsx 등 nakshatra 파일, `IslandConsultClient.tsx`, `components/fpti/**` 는 순수 CRLF — node 패치 스크립트로만 수정(3세션 연속 실전 확인).
- 🔴 **가드는 통과가 아니라 변이로 확인한다.** PR-4 는 변이 12종(게이트 제거·마커 무조건 부착·데이터 절단 제거·강제 마운트 제거 등)을 하나씩 넣고 전부 실패하는 것을 확인했다. "초록불"만으로는 무는지 알 수 없다.
- 🔴 **PR 마다 가드 자리를 실측할 것.** 계획서가 지목한 `verify:*` 가 (a) 소스를 안 읽거나 (b) `verify-guard-wiring` 에 미배선으로 선언돼 있으면 거기 얹은 단언은 CI 에서 영영 안 돈다. PR-2 가 그 경우여서(`verify:ziwei-island` = 엔진 전용 + 미배선) `__tests__/ui/*.static.test.js` 로 돌렸다 — `test:node` 가 글로브로 집어 pr-ci fast 잡(상시)에서 문다.
- 캡처 대상에 `sticky`/`transform`/`fill-mode: both` 등장 애니메이션이 있으면 `[data-export]` CSS 스위치가 필요하고(PR-1·PR-3), 없으면 불필요하다(PR-2·PR-4). 조상에 있는 건 상관없다 — html2canvas 는 캡처 노드의 서브트리만 그린다. `backdrop-filter` 는 html2canvas 가 아예 무시하므로 스위치 사유가 못 된다(PR-3 실측).
- 화면 상태 UI(접기/펼치기 배지 등)를 캡처에서 빼는 데는 CSS 스위치보다 렌더 조건(`{!pdfExporting && …}`)이 싸다 — PR-4 는 그래서 CSS 를 한 줄도 안 건드렸다.

## 검증

```
npm run verify:nakshatra-ai-flow   # PR-1 가드(섹션 D 9단언 추가됨)
npm run test:node                  # PR-2·PR-3·PR-4·E2 가드 포함(*.static.test.js)
node scripts/generate-sitemap.mjs --check   # 결과 화면 파일을 고치면 원장이 드리프트한다
```

축1 PDF PR 은 매번 `sitemap:generate` 로 원장을 갱신해 같은 커밋에 담아야 한다(PR-3 은 9개, PR-4 는 `/saju-fpti/` 1개 드리프트).

## 모르는 것

- 셸 PDF 미제공 잔여(sibyl-dominator·프롬프트 생성기류·vedic-astrology.html·pet-saju.html)는 사용자 확정으로 범위 제외 — 재론 시 사용자에게 물을 것.
