---
title: 한국어 비주얼 상세창의 저작 카피 구간 복원 + 편집 체계 통일
date: 2026-09-12
status: done
commit: 4ed9cd143
---

## 다음 세션 첫 문장

상세창 배치 1~5 는 모두 끝났고 이 문서의 변경으로 남은 결정(비주얼 모드가 카피를 덮는 문제)까지 닫혔다. 아래 「후속 과제」 3건은 이번 범위 밖이라 손대지 않았으니, 그중 하나를 고를 거면 거기서 시작한다.

## 배경 — 무엇이 실제로 안 끝나 있었나

배치 1~5 에서 카피 이관은 전부 끝났다(160개 항목 / 109개가 `receives` 보유). 진짜 미결은 매 배치가 함정으로 적어두고 미룬 결정이었다.

`js/feature-detail-preview.mjs` 는 **한국어이고** `public/feature-details/catalog.json` 에 슬러그가 있을 때만 오버레이에 `pvw-visual` 을 붙인다(63종). `styles/feature-visual-detail.css` 는 그 클래스로 「내가 받게 되는 것」·「결과 화면은 이렇게 구성돼요」를 포함한 대부분의 카피 구간을 `display:none` 처리했다. 결과적으로 **receives 를 저작한 109개 중 75개가 한국어 사용자에게 한 번도 보이지 않았다.**

`js/feature-detail-panels.mjs` 로 확인한 비주얼 JSON 의 스키마는 `panels` + `journey.{questions,trustNotes,faq}` 뿐이라 `receives`·`outline` 이 없다 — 숨기면 그 내용은 어디서도 대체되지 않는다. 그래서 숨김을 풀고 비주얼 시트 팔레트로 다시 칠하는 쪽을 택했다.

## 한 일

`styles/feature-visual-detail.css`
- 숨김 목록에서 `#tilePvwReceiveSec`·`#tilePvwOutlineSec`·`#tilePvwPriceSec`·`#tilePvwCmpSec`·`.tile-pvw-assure` 를 뺐다. 저작 `receives` 가 없어 feats 폴백만 남는 경우는 `:has(#tilePvwReceives[hidden])` 로 제목만 남은 빈 칸을 막는다.
- 비주얼 모드 전용 토큰 `--pvd-{text,muted,accent,line,card}` 를 `.tile-pvw-content` 에 두고 라이트/`neo-mode` 두 벌을 준다. 기본 상세창 스타일(`--pvw-*`)이 전부 `:not(.pvw-visual)` 로 잠겨 있어 따로 줘야 한다.
- 되살린 구간 전부(받는 것·결과 화면·가격과 혜택·포함된 혜택·왜 유료인가요·안심 안내)를 같은 카드 체계(테두리 `--pvd-line`, 채움 `--pvd-card`)로 통일했다. 결과 화면 썸네일은 16:9 원본이라 3:2 틀에서 `object-fit:contain` + 투명 배경(배치 1 결론 그대로).
- `#tilePvwPremiumBlock`(포함된 혜택) 숨김 해제 — 가격 카드 안 점선 아래로 들어간다.

`styles/feature-marketing-detail.css`
- `--cd-detail-subtle` 를 `#8f6579` → `#7a4157`. 유일한 사용처는 ≤520px 에서 접히는 비교표 행 라벨(「기준」「기본」「상세 보기」, 12px 급)이고 분홍 셀 위에서 4.26:1·3.84:1 로 AA 미달이었다(390px 실측). 이 토큰은 **비주얼/기본 상세창 양쪽에 적용된다.**

`public/` 미러는 `npm run sync:public` 산출물이다. 셸 캐시버스트 해시(`?v=build-…`)가 함께 바뀌는 것은 정상.

## 검증 (전부 실행함)

실제 화면 검증은 배치 1~5 가 한 번도 하지 않았던 부분이라 이번에 처음 했다. 390x844, DPR2, 외부 요청 전면 차단(API·결제·LLM 호출 0), `window._cdOpenTilePreview` 를 합성 앵커로 직접 호출하고 시트 내부 스크롤을 뷰포트 단위로 연속 촬영했다. `element.screenshot()` 은 시트가 `position:fixed` + 내부 스크롤이라 뒤 페이지를 섞어 찍으므로 쓰면 안 된다.

- 라이트 23프레임 + 다크 23프레임(master-love-codex, tarot-mindscan) → 되살린 구간 대비 14.8:1(제목) / 7.6:1(본문) / 6.4:1(강조), 다크 8.8~8.9:1. 잘림·가로 넘침·겹침 없음. 하단에 옛 디자인(분홍 둥근 상자 + 13px 자홍 소제목) 잔재 없음. 썸네일 여백 띠는 카드색과 일치(회색 폴백 아님).
- 「가격과 혜택」·「안심하고 이용하세요」는 `paywallShown` 에만 달려 있다(index.html:35326-35334). 가격 API 가 없는 하네스에서는 조건부로 숨는 게 정상이며, 합성 앵커에 `data-coin-cost` 를 붙이자 둘 다 정상 렌더됐다(priceSec 322x690, assure 322x169). **렌더 누락이 아니다.**
- 비교표 행 채움과 안심 카드 테두리는 재촬영으로 확정(테두리 `#F0CDD6` 4변, 채움 `#FFFAF7` — 위쪽 카드와 픽셀 동일).
- `npm run check:fast` 1049/0. `verify:public-parity`, `verify:feature-marketing-schema`, `verify:sitemap-drift`, `verify:payment-freeze`, `verify:rpt-preview-cta`, `verify:mobile-detail-render`, `verify:mobile-detail-nonintrusive` 전부 통과.

결제 분기(`_paywallEl` 표시 로직)는 읽기만 했고 한 줄도 바꾸지 않았다. `index.html` 의 변경은 `sync:public` 이 만든 해시뿐이다.

## 후속 과제 (이번 범위 밖 — 보고만)

1. **다크에서 타로 계열 패널의 캡션이 안 읽힌다.** `.featureEditorialMindscan`(`styles/feature-visual-detail.css:79`)은 `#eae1f0` 고정 라이트 팔레트인데, 그 안의 `figcaption` 은 `--feature-muted` 를 쓴다. `neo-mode` 에서 이 변수가 `#c8b8e6` 이 되어 **1.44:1**. 같은 구조인 `.featureEditorialTarot`·`.featureEditorialMap[data-tone]` 의 밝은 톤들도 같은 위험이 있다. 이번 변경 이전부터 있던 문제이며 내가 건드린 파일이지만 다른 축이다.
2. **닫기(X) 버튼이 스크롤된 본문 글자와 겹친다.** `.tile-pvw-close` 는 기본 `position:absolute` 인데, 흐름 배치로 바꾸는 규칙(`styles/feature-marketing-detail.css:989`)이 `:not(.pvw-visual)` 로 잠겨 있어 비주얼 모드에서만 떠 있다.
3. **죽은 선택자.** 숨김 목록의 `#tilePvwCompareSec` 는 존재하지 않는 id 다(실제는 `#tilePvwCmpSec`). 지우는 건 안전하지만 이번 변경과 무관해 남겼다.
4. (아주 경미) 비교표 마지막 행의 하단 1px 테두리가 컨테이너 `overflow` 로 잘린다. 모서리 호는 보이므로 헤어라인 수준.

## 정리 대상

- `docs/handoff/2026-09-12-detail-copy-batch2-compat.md` 의 후속 11, 배치 1 의 후속 12(비주얼 모드가 카피를 덮는 문제)는 이 커밋으로 해소됐다.
