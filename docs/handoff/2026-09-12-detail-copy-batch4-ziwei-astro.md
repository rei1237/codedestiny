---
status: active
updated: 2026-09-12
next: "배치 4(자미·점성) PR #1943 의 CI·머지를 확인한 뒤, 같은 형식(receives·outline)으로 배치 5(월정석·단건) 유료 상품 카피를 옮긴다."
---

# 배치 4 — 자미·점성 유료 5종 상세창 카피 이전

**범위 가정**: 자미·점성 유료 키 중 **상세창 카피 경로를 타는 것은 5종뿐**이다. 나머지 해금 키(`ziwei_decade_luck`, `astro_stellar_*_room` 등)는 결과 화면 내부 `cd-section-gate` 로만 열려 `FEATURE_MARKETING_COPY` 키가 아니라 범위 밖이다. 무료 진입(`openZiweiModal` · `openAstroModal`)과 베다·낙샤트라도 배치 1~3 기준과 같이 제외했다.

| COPY 키 | 상품 | 결과 화면 |
|---|---|---|
| `gotoZiweiPremium` | ziwei-ai-consultation ₩30,000 | `app/ziwei-ai/` |
| `'ziwei-deep-pdf'` | ziwei-deep-pdf ₩30,000 | `ZiweiDeepPdfPanel.tsx` |
| `navigateToZiweiChart` | premium-ziwei 해금 200코인 | `app/ziwei/chart/` |
| `'astrology-ai-consultation'` | ₩30,000 | `app/astrology-ai/` |
| `'master-love-codex'` | ₩20,000 | `app/master-love-codex/` |

## 한 일

1. **index.html 5항목에 `receives`·`outline`·`outlineImage` 추가.** 각 5개(`'master-love-codex'` 의 outline 만 6개). 첫 항목 위에 근거 주석 1줄("배치 4 — 자미·점성")을 뒀다.
2. **화면 실측으로 거짓 문장을 정정했다.** 이 배치에서 값이 가장 컸던 부분이다.
   - **추가 질문 이어가기가 없다.** `astrology-ai` 와 `ziwei-ai` 모두 결과 화면에 추가 질문 입력창이 없고 `/api/*/message` 호출부가 0건이다. 그런데 카피·사전(en/ja/zh)이 "추가 질문은 무료"를 여러 자리에서 단언하고 있었다 — `feats` · `premiumChapters` · `analysisSteps` · `valueCompare` · `faq` 전부에서 걷어냈다.
   - **"14개 주제" 는 실제 16개**(`FOCUS_OPTIONS`). 개수 단언을 지우고 "열여섯 가지 중 하나를 고른다"로 바꿨다.
   - **`navigateToZiweiChart` 는 유료가 아니다.** `premium-ziwei`(해금 200코인)의 잠금 코드가 레포 어디에도 없어 `/ziwei/chart` 가 결제 없이 열린다. 카피를 "결제 없이 펼칩니다"로 바꾸고, 결과가 저장되지 않는다는 `trustNote` 를 추가했다.
   - **`ziwei-deep-pdf` 의 실제 장 구성은 질문형**(제1장 질문에 대한 답 … 제15장 앞으로의 방향)인데 옛 카피는 "총론 + 12궁 + 심층 2장"이었다. `unlockBenefits`·`analysisSteps`·`subheadline` 을 실제 구성으로 다시 썼다.
   - `reportScale` 을 실측으로 맞췄다 — `gotoZiweiPremium` `{minWords:20700}`(SECTION_ORDER 가 조건부라 `sections` 는 뺐다), `ziwei-deep-pdf` `{chapters:15,minWords:36000}`(minChars 합 36,300).
3. **사전 11개 로케일**(ko 제외)에 `receives.N.title|detail` · `outline.N.title|detail` 을 채우고, 위에서 사실이 바뀐 기존 항목(`tagline`·`feats`·`premiumChapters`·`analysisSteps`·`valueCompare`·`faq`·`ctaNote`·`premiumOutcomes`)을 같이 갱신했다. 저작은 en · ja · zh-cn · zh-tw 4개이고 나머지 7개는 en 복사(레포 관행). 과금 LLM 번역은 쓰지 않았다.
4. **생성물 재생성**: `npm run sync:public`, `npm run sitemap:generate`.

## 검증

배치 3과 같은 기준으로 전부 통과했다.

```
verify:feature-marketing-schema      OK — 카피 162 / reportScale 17 / 가짜 결과 예시 0
verify:feature-marketing-dictionary  OK — 로케일 11 / 경로 39,897 / 사전 없는 키 0(허용 0) / 레거시 결손 75(허용 75)
verify:public-parity                 OK — html markers=4, jsPairs=5
verify:payment-legal-copy            PASS — 14 gate-triggered paths
verify:rpt-preview-cta               exit 0
verify:payment-freeze                통과 — region 4 · file 3
verify:sitemap-drift                 OK — URL 860
verify-feature-popup-journey         PASS — 63 details × 4 widths, 결제/API 호출 0
check:fast                           jest 228 스위트 / 2,686 테스트 통과
```

추가로 5항목 JSON 전체에 금지어 8종(`기능·계산값·컬럼·데이터·규칙 기반 시각화·시스템·프롬프트·내부 로직`) 수동 스캔 — **0건**. 패치 전에는 3항목에 "기능"이 있어(`trustNotes` 2건, `faq` 1건) `receives` 를 넣는 순간 스키마 가드에 걸렸을 자리였다.

**렌더 실측(Playwright)·시각 검사는 이 배치에서 하지 않았다** — 배치 3과 같이 후속 과제로 남긴다.

## 함정

- **금지어는 `receives` 를 가진 항목의 JSON 전체에 걸린다.** 새로 쓴 문장뿐 아니라 기존 `faq`·`trustNotes` 까지 같이 고쳐야 항목이 통과한다. `outlineImage` 파일명에도 걸린다.
- **`outline` 이 비면 렌더러가 `outlineImage` 를 통째로 무시한다.** 이미지만 넣고 끝내면 화면에 아무것도 안 나온다.
- **패처는 반드시 제자리 교체형으로.** 배치 3에서 `after` 삽입형 패처가 뒤따르는 기존 필드를 옛 값으로 되살린 사고가 있었다. 이번 패처(`tmp/batch4/patch-copy.cjs`)는 앵커 줄을 통째로 바꾸고, 앵커가 없거나 2회 이상이면 던진다.
- **워크트리에 `node_modules` 가 없어 `sync:public` 이 `parse5` 미해결로 죽는다.** `New-Item -ItemType Junction node_modules -Target D:\Development\code-destiny\node_modules` 로 빌린다(gitignored).
- **사전 컨테이너는 네임스페이스마다 모양이 다르다.** 이 5종은 전부 `{"0":..,"1":..}` 객체다. 배열로 써 넣으면 조용히 갈린다.
- 사전 가드는 **경로 존재만** 본다. 한국어 원문이 바뀌어도 옛 번역이 남아 있으면 통과하므로, 바뀐 항목을 손으로 찾아 갱신해야 한다.

## 후속 과제 (보고만, 이번 범위 밖)

- 🔴 **`premium-ziwei`(해금 200코인)에 게이트가 없다.** 레지스트리에만 있고 잠금 코드가 어디에도 없어 죽은 SKU다. 상품을 없애든 게이트를 붙이든 결정이 필요하다.
- 🔴 **`/api/astrology-ai/message` · `/api/ziwei-ai/message` 는 호출부가 0건**이다. 추가 질문 UI 자체가 없다. 엔드포인트를 지우거나 UI 를 붙이는 판단이 필요하다.
- 가격 주석이 낡았다 — `worker/routes/master-love-codex.js:14`("500코인=50,000원"), `src/features/master-love-codex/constants.ts:10`.
- `public/i18n/zh-tw.json` 은 이 배치 밖 블록이 아직 영어인 곳이 많다.
- 상세창 렌더 실측(Playwright)·시각 검사가 배치 1~4 전체에 대해 아직 없다.

## 다음 배치

**배치 5 — 월정석·단건.** 같은 형식(`receives`·`outline`)으로 옮긴다. 이 브랜치가 머지된 뒤 최신 `origin/main` 에서 끊거나, 연속 진행이면 이 브랜치 위에 스택으로 쌓는다.
