---
status: done
updated: 2026-10-02
next: 할 일 없음 — S0~S5 와 2026-10-02 계산법 통일·운명의 섬 개편이 끝났다. 남은 것은 아래 "모르는 것"의 실 LLM 상담 품질 검수뿐이고, 정확한 1회 승인이 있어야 한다.
---

# 영냥이 자미두수 — 정확한 강약표 위에서 강약을 읽는 상담 + 설명마다 명반

## 왜

요구 원문은 [브리프](2026-10-01-ziwei-strength-brief.md). 요약하면 이렇다.

- 별 이름 풀이를 넘어 묘왕리함·동궁·삼방사정·사화·보조/살성을 종합하는 상담으로 바꾼다.
- 설명할 때마다 해당 명반을 보여 준다. 모든 운세에 해당한다.
- 2026-10-01 추가 요구: "정확한 데이터를 기반으로 해야해 그리고 강약도 반드시 반영이 되어야한다". 다른 사이트 캡처로 사용자가 직접 확인해 줄 수 있다고 했다.

## 지금 상태 (S0~S5 완료)

S1(강약표·상담 사실·프롬프트·단계 정책)은 main 에 머지됐다. 커밋은 `git log --oneline --grep=ziwei -8` 로 확인한다.

S2(영냥이·연이/네오 명반 화면)도 main 에 머지됐다. 커밋은 `git log --oneline --grep="ziwei" --grep="palaces" -8` 로 확인한다.

S3(사주·점성·베다·숙요 소절마다 명반)도 main 에 머지됐다. 커밋은 `git log --oneline --grep="chart points" --grep="each section reads" -4` 로 확인한다.

S4(꿀꿀 셸·앱·워커 프롬프트 강약 통일)도 main 에 머지됐다. 커밋은 `git log --oneline --grep="canonical 7" --grep="major period by branch" -4` 로 확인한다. 아래 "S4 검증"을 본다.

S5(남은 워커 자미 경로·섬)도 main 에 머지됐다. 커밋은 `git log --oneline --grep="7 strength grades" -2` 로 확인한다. 아래 "S5 검증"을 본다.

S0(보충 54칸·이견 2칸의 독립 출처 대조)은 2026-10-02 에 끝났다. 커밋은 `git log --oneline --grep="cross-check the strength table" -2` 로 확인한다. 아래 "S0 검증"을 본다.

### S3 에서 바꾼 것

- **선례**: 선례는 S2 의 `palaces` 장치를 그대로 넓힌 것이다. 남은 작업에 적혀 있던 휴먼 디자인 `chartSlotFor` 는 쓰지 않았다. 그것은 장 단위 슬롯이고, 요구는 소절마다이기 때문이다.
- **서버** `worker/yeongnyangi/fortune/block-anchors.ts`: 블록 선택 필드 넷을 추가했다. 이름 목록은 저장 context 에서 만들고, 화면 차트 그룹 라벨과 같은 글자를 쓴다.

  | 필드 | 운세 | 최대 | 이름 예 |
  |---|---|---|---|
  | `pillars` | 사주 | 4 | 일주, 상대 일주 |
  | `astroPoints` | 점성 | 3 | 태양, 상승점 |
  | `vedicPoints` | 베다 | 3 | 토성, 라그나 |
  | `mansions` | 숙요 | 2 | 나의 본명숙, 상대의 본명숙 |

  - 스키마에는 장의 `systems` 에 든 운세의 필드만 enum 으로 들어간다. required 는 그대로다.
  - 정리 방식은 S2 와 같다. 모르는 값·중복·빈 값은 버리고 최대 개수로 자른다. 거부하지 않는다.
  - chapter·delivery 두 경로 모두 `sanitizeBlockAnchors` 를 거친다. 자미 `palaces` 도 이 함수가 처리한다.
- **화면** `app/yeongnyangi/_components/BlockChartHints.tsx`(+ `block-chart-hints.module.css`, 문구 `_lib/block-chart-copy.ts`): 영냥이 `ReadingBook` 과 연이/네오 `ConsultationResult` 가 같이 쓴다. 자미 궁은 기존 `ZiweiBlockHint` 가 그대로 맡는다.
  - 사주: 시·일·월·년 4칸 간지 격자. 강조 칸은 테두리 2px + 옅은 바탕이다.
  - 점성: 바퀴 위 행성 점과 상승점 선. 방향은 큰 차트(`ReadingCharts`)와 같아서 황경 0° 가 위, 시계 방향이다. 상승점이 3시 쪽에 올 수 있다.
  - 베다: 양자리→물고기자리 4×3 칸. 큰 차트 `.palaces` 와 같은 순서다. 라그나 칸에는 빗금을 친다. 강조된 라그나는 통째로 칠하지 않고 테두리 + 빗금으로 그린다. 칠하면 행성 칸과 구분되지 않는다.
  - 숙요: 27 눈금 원 위에 두 사람의 본명숙 점.
  - 캡션은 항목마다 한 덩어리로 줄을 바꾼다(inline-block). 괄호 안에서 끊기거나 줄 첫머리에 "·" 가 오지 않게 하려는 것이다.
- 옛 결과(필드 없음)는 강조 없이 예전처럼 보인다. 저장값은 바꾸지 않는다.

### S2 에서 바꾼 것

- **명반 격자**: `app/components/ziwei/ZiweiPalaceGrid.tsx` 는 공용 4×4 배치다. 꿀꿀 `AdvancedZiweiSectionV2` 와 영냥이가 같이 쓴다. 영냥이 쪽은 `app/yeongnyangi/_components/ZiweiReadingChart.tsx` 이고, `ReadingCharts` 가 자미 차트일 때만 이것을 그린다. 따라서 영냥이 책과 연이/네오 `ConsultationResult` 에 같이 나온다.
  - 열두 궁이 모두 서로 다른 지지로 와야 격자를 그린다. 아니면 예전 버튼 목록으로 돌아간다(fail-closed).
  - 칸 안의 주성 옆에는 등급 한자 한 글자(廟…陷)와 사화 글자(祿權科忌)를 둔다. 색은 테마마다 한 가지라 좋고 나쁨을 나타내지 않는다.
  - 탭하면 아래 설명(한자·등급 뜻·사화·"현대 표" 표시)이 바뀐다. "이 별의 강약을 어떻게 읽었나"는 기본으로 접혀 있다.
  - 문구는 `app/yeongnyangi/_lib/ziwei-chart-copy.ts` 에 있다. ko·en·ja·zh-CN·zh-TW 를 저작했고 나머지는 en 이다. 별·궁 이름은 한글 그대로 `lang="ko"` 를 단다.
- **표시 데이터**: `reading-presentation.ts` 의 `readingCharts` 가 자미 궁 그룹마다 `ziwei`(별·한자·정본 등급·근거 종류·사화·궁 조건 notes)를 붙인다. 읽을 때마다 저장 context 로 다시 계산한다. 기존 주문은 LLM 재생성 없이 새 명반을 본다. 저장값은 바꾸지 않는다.
- **소절 옆 궁 강조**: 장 블록의 선택 필드 `palaces` 는 `worker/yeongnyangi/fortune/ziwei/block-palaces.ts` 에 있다.
  - 스키마에는 자미 장에만 enum(저장 명반 궁 이름)·최대 3개로 들어간다. required 는 그대로다.
  - 모르는 값·중복·빈 값은 버리고 거부하지 않는다. chapter·delivery 경로 모두 적용한다.
  - 화면은 `ZiweiBlockHint`(작은 위치 격자 + "이 소절이 짚은 궁: …" 글자)다.
- **ask 근거 보존**: `ask/validate.ts` 는 factIds·timingIds·근거 출처를 서버 전용 `internalBasis` 로 남긴다. `presentFortune` 은 모든 비상징 장에서 이것을 지운다. delivery 대체 경로는 internalBasis 를 남기지 않는다.
- **invariance 해시표**: ask 행은 validated 만, ziwei/fusion 행은 requests(스키마)만 바뀌었다. 43행 모두 의도 확인 후 갱신했다.

### 원인 (실측)

1. **레포 강약표가 틀렸다.** 표 3벌(`worker/lib/ziwei-ai-chart.js`, `js/saju-engine.js`, `app/_lib/ziwei-strength.ts`)은 원자료가 같다. 『全書』 원전이 기재한 126칸 중 49칸만 맞는다. 방향이 뒤집힌 칸도 있다(예: 무곡 戌, 천량 申, 천기 午).
2. **직렬화가 등급을 접었다.** `normalizeBrightnessLevel` 이 왕→묘, 약→리, 한→평 으로 바꾼다.
3. **프롬프트가 강약 읽는 법을 주지 않았다.** "명암…함께 읽는다" 한 줄뿐이었다. 게다가 참치 미만 단계에서는 검증기가 "삼방사정"이라는 단어 자체를 거부했다.
4. **고전 규칙이 레포에 0건이었다.** 해석을 LLM 기억에 맡기고 있었다.

### S1 에서 바꾼 것

**강약 정본** — `lib/ziwei-star-strength.js`, `starStrength(star, branchIndex)`

| 층위 | 칸 | 출처 |
|---|---|---|
| 원전 (classical) | 주성 126, 6성 52 | 『紫微斗數全書』 권3 별머리 줄, [위키문헌 rev 2268626](https://zh.wikisource.org/w/index.php?title=%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%89&oldid=2268626). 원문 줄을 그대로 싣고 파싱했다(탈자 `贪狠` 도 유지). |
| 현대 보충 (S1 modern-single → S0 modern-confirmed) | 주성 42, 6성 12 | [iztro](https://github.com/SylarLong/iztro/blob/bb1781cc5da481b1e741ec4da4e4936e91ab6a36/src/data/stars.ts) MIT `src/data/stars.ts` @ `bb1781c` 값을 쓴다. S0 에서 紫微人生 「甲級星廟旺利陷表」도 54칸 모두 같은 값임을 확인했다. 두 표는 같은 계열일 수 있다(아래 "S0 검증"). |
| 이견 | 2칸 | 천기 辰(원전 旺 / iztro·紫微人生 利), 文曲 寅(원전 陷 / iztro·紫微人生 平). 원전 값을 채택했고 2026-10-02 사용자 결정으로 유지한다. `dissent` 에 두 현대 표를 모두 적는다. |
| 구조상 불가 | 8칸 | 경양 寅巳申亥, 타라 子卯午酉 (`impossible`, 등급 없음) |

등급은 7단계(묘·왕·득·리·평·불·함)이고 서로 접지 않는다. 모르는 표기는 `null`(unmapped)로 둔다.

강약이 붙는 별은 20개(14주성 + 문창·문곡·경양·타라·화성·영성)다. 좌보·우필·괴월·공겁·녹존은 원전에 강약 줄이 없어 강약을 붙이지 않는다.

레포 옛 표는 `ZIWEI_LEGACY_MAIN_STRENGTH_TABLE` 로 남겨 비교에만 쓴다.

**해석 규칙 15개** — `worker/yeongnyangi/fortune/ziwei/reading-rules.ts`

- 각 규칙에 id·원문 인용·URL·rev·kind 를 둔다.
- 원전 인용은 권1 rev 7913704 와 권3 rev 2268626 의 raw wikitext 와 글자 대조했다.
- 원전에서 찾지 못한 규칙(`zw.empty.borrow` 차성안궁)은 `modern-extension` 으로 표시했다. 정책 규칙(`zw.multi`, `zw.basis`)은 `service-policy` 로 표시했다.
- 격국은 넣지 않았다.

**궁 사실** — `worker/yeongnyangi/fortune/ziwei/reading-facts.ts`

- `enrichZiweiContext` 가 궁마다 다음을 붙인다: `strengths`, `facing`(대궁), `trines`(삼합), `flanks`(협), 빈 궁의 `oppositeReference`, 규칙이 걸린 구체 문장 `readingNotes`.
- 옛 `brightness` 는 뺀다.
- 저장 context 는 바꾸지 않는다. 소비 지점에서만 붙인다.
  - 이유: 꿀꿀 경로와 호환 엔진이 `brightness` 를 읽는다.
  - 소비 지점 세 곳: `chapter-facts.ts` 의 `selectChapterFacts`(v6·v7·예방·토픽), `ask/packet.ts`, `ziwei/index.ts` 의 무료 `buildPrompt`.
- 그래서 **기존 구매 결과 본문은 그대로**다. 새 생성분만 바뀐다.

**프롬프트·단계 정책**

- 읽기 틀 ①~⑧(`ZIWEI_READING_FRAME`)을 넣었다.
- 무료 경로 `promptVersion` 을 `ziwei-v1.1.0-palace-strength` 로 올렸다.
- 모든 단계에서 "삼방사정"을 허용했다(`reading-quality.ts`, `reading-v7.ts`, `prevention.ts`).
- 궁 자체의 생년사화는 모든 단계에 간다. 유년 사화와 대한 시기는 기존 단계 정책을 그대로 따른다.

### 수정 전후 (mock 렌더, 고정 생년 1997-02-10 14:30 여성, 연어 v7 career 장)

- 관록궁 亥, 전: `"brightness":{"태양":"함","문곡":"묘","천괴":"평","천마":"리"}`
- 후:

  ```
  strengths: 태양(함) 문곡(왕)
  facing: 부부궁 — 거문(왕) 타라(함) 영성(득), 화기:거문
  trines: 재백궁 — 태음(함) 문창(리), 화록:태음 / 명궁 — 천량(왕) 경양(묘)
  readingNotes: "태양(함): 해·달이 빛을 잃은 자리(반배). 성질이 드러나는 데 시간과 보완 조건이 더 필요하다."
  ```

  - 문곡이 묘→왕으로 바뀌었다(원전 값).
  - 천괴·천마의 근거 없는 강약은 사라졌다.
- 입력 크기: `calculatedData` 는 연어 1161→2148자, 참치 1042→1728자다. `domainRules` 는 11399→12375자이고, 그 안의 "강약" 언급은 0→14회가 됐다.
- `maxOutputTokens` 6450 은 변동이 없다.

## 남은 작업

- [x] **S0 독립 출처 대조** — 2026-10-02 완료. 아래 56칸(보충 54 + 이견 2)을 확인했다. 아래 "S0 검증"을 본다.
  - 출처: 캡처 대신 iztro(2023)보다 앞선 웹 표를 찾았다. 紫微人生 「甲級星廟旺利陷表」(big5)이고, [웨이백 2011-11-09 스냅샷](https://web.archive.org/web/20111109010440/http://211-75-223-181.hinet-ip.hinet.net/tzyy_wei/ji_been/02.htm)이 현재 페이지와 12행 모두 같다.
  - 사용자가 권한 kimsaju.com 은 쓰지 못했다. 무료 명반 도구가 없고 보고서가 유료다(결제 금지).
  - 반영: `lib/ziwei-star-strength.js` 에 출처 `rensheng`, 원문 12행, 파서 `parseRenshengStrengthRows` 를 두었다. 채택 규칙은 `resolveZiweiStrengthCell` 한곳이다.
    - 원전 칸은 그대로 `classical` 이다. 두 현대 표가 같으면 `confirmedBy`, 다르면 `dissent` 에 적는다.
    - 원전 공란 칸은 iztro 값을 쓴다. 紫微人生이 같으면 `modern-confirmed`, 다르면 `disputed`(iztro 값 유지, 紫微人生은 `dissent`), 없으면 `modern-single` 이다.
  - 판정 기준 충족: 54칸 모두 `modern-confirmed` 이고 `modern-single`·`disputed` 는 0칸이다. 이견 2칸의 `dissent` 에는 두 현대 표를 모두 적었다.
  - 🔴 단서: 紫微人生은 iztro 와 240칸이 전부 같다. 같은 계열일 수 있어(추정) 두 표의 일치는 독립 유도의 증거가 아니다. 화면 설명 문구도 그렇게 적었다.

  | 별 | 확인할 지지 (현재 채택 등급) | 이견 |
  |---|---|---|
  | 자미 | 辰득 戌득 | — |
  | 천기 | 寅득 卯왕 巳평 申득 戌리 亥평 | 辰: 원전 왕 / iztro 리 |
  | 태양 | 丑불 未득 申득 酉평 戌불 亥함 | — |
  | 무곡 | 寅득 卯리 申득 酉리 | — |
  | 천동 | 丑불 寅리 卯평 辰평 未불 酉평 戌평 | — |
  | 염정 | 子평 卯평 午평 酉평 | — |
  | 태음 | 午불 未불 申리 | — |
  | 탐랑 | 寅평 卯리 申평 酉리 | — |
  | 거문 | 丑불 未불 | — |
  | 파군 | 寅득 巳평 申득 亥평 | — |
  | 문창 | 卯리 未리 亥리 | — |
  | 문곡 | 卯왕 未왕 亥왕 | 寅: 원전 함 / iztro 평 |
  | 화성 | 卯리 未리 亥리 | — |
  | 영성 | 卯리 未리 亥리 | — |

- [x] **S2 화면 (영냥이·연이/네오)** — 2026-10-01 완료. 아래 "S2 검증"을 본다.
  - 작업:
    - `AdvancedZiweiSectionV2.tsx` 의 4×4 격자를 공용 `ZiweiPalaceGrid` 로 뺀다. `ReadingCharts` 가 자미 명반을 표시하게 한다.
    - 주성 옆에 한자·등급 글자를 둔다. 색만으로 구분하지 않는다.
    - 탭하면 설명이 나오게 하고, 접힌 "강약을 어떻게 읽었나"를 둔다.
    - 블록에 선택 필드 `palaces?: string[]` 를 둔다. 궁명으로 검증하고, 모르는 값은 버린다(거부하지 않는다). 설명 옆 궁 강조에 쓴다.
    - ask `factIds` 를 `ask/validate.ts` 에서 지우지 말고 서버 전용 `internalBasis` 로 저장한다. `presentFortune` 에서는 제거한다.
    - 기존 결과는 저장 명반으로 강약을 다시 계산해 표시만 한다. LLM 재생성은 하지 않는다.
  - 판정 기준: 360·390px visual-checker 통과, 기존 주문 화면에서 재결제 요구 0건.
- [x] **S3 다른 운세의 '설명마다 명반'** — 사주·점성·베다·숙요. 2026-10-01 완료. 위 "S3 에서 바꾼 것"과 아래 "S3 검증"을 본다.
- [x] **S4 꿀꿀 셸·앱 통일** — 2026-10-01 완료. 아래 "S4 검증"을 본다.
  - 셸·앱 강약을 정본 모듈로 바꾼다. 점수 혼합, 차성 ×0.7, 화기 강등을 걷어 내고 관련 가드를 재정의한다.
  - 셸 대한 궁 오인덱스(`js/saju-engine.js:17703`, `:21767`)를 고친다.
  - `worker/lib/ziwei-ai-prompt.js` 를 바꾸고 `sync:public` 미러를 갱신한다.
- [x] **S5 나머지 자미 경로** — 2026-10-01 완료. 아래 "S5 검증"을 본다.
  - `worker/routes/ziwei-ai.js`, deep report, island(점수 영향이 있으므로 regression-scout 먼저), master-love-codex.
  - 워커에 남은 옛 5기호: `worker/lib/ziwei-ai-chart.js`(옛 표 행, 테스트가 정본과 비교용으로 고정), `worker/lib/ziwei-deep-report-prompt.mjs:183` 범례, `__tests__/worker/admin-prompt-lab-engines.test.js` 의 옛 기호 허용, `scripts/lib/ziwei-deep-chart-fixture.cjs`.
  - (해소) 앱 `mapZiweiStrengthSymbol` 의 빈 값 → △ 결함은 S4 앱 커밋이 함수째 걷어 내면서 사라졌다.

## 함정

- **상담(연이/네오) 화면 본문은 굵게 그려지지 않는다.** 전역 `CodeDestinyBody` 가 `local()` 한 벌이고 `font-synthesis:none` 이다. 위계는 크기·색으로 만든다. 사이트 전역 문제라 S2 에서는 고치지 않았다.
- **명반 칸 선택자는 (0,3,1) 이상이어야 한다.** `.book .chart button`·`span` 규칙이 칸을 덮는다. 칸 안에 span 을 두지 않는다.

- **v7 매니페스트는 그대로 쓰면 안 된다.** `readingManifestV7` 은 owns/refs 패턴이므로 `resolveV7Ledger(...).chapters` 를 거쳐야 `selectChapterFacts` 가 사실을 찾는다. 고등어는 v6 만 된다.
- **단계 금지어의 실제 거부 지점은 `reading-quality.ts` 의 `validateReadingQuality`(TIER_SCOPE_VIOLATION)다.** `providers/chapter.ts` 의 `TIER_SCOPED_TERMS` 는 프롬프트 어휘와 교정 문구만 바꾼다. 이 차이는 변이 시험으로 확인했다.
- **영냥이 파일을 고치면 사이트맵 원장도 바뀐다.** 원장 서명은 import 폐포 해시라서 영냥이 파일을 고치면 라우트 17곳의 서명이 바뀐다. `npm run sitemap:generate` 결과를 같은 커밋에 넣는다.
  - `lib/ziwei-star-strength.js` 도 폐포 안이다. `/ziwei/chart/`·`/ziwei/animal-destiny/`·`/destiny-compass/`·`/fortune/prompt-hub/` 가 이 파일을 읽는다.
  - S5 에서는 이 파일에 범례 export 를 더하고 원장을 빠뜨려 main CI `Static guards` 가 실패했다. check:fast 는 이 드리프트를 보지 않으므로, 이 파일을 고친 뒤 push 전에 `npm run verify:sitemap-drift` 를 직접 돌린다.
- **`zw.xian.support` 는 계획보다 좁다.** 같은 궁의 녹존 + 화록·화권·화과만 센다. 원문 「禄元…化吉」을 엄격히 읽은 것이다. 계획서는 좌보·우필·괴월과 삼방까지 넣었다. 넓힐지는 사용자 판단이다.
- **블록 선택 필드를 늘리면 invariance 해시표의 requests 열이 바뀐다.**
  - S3 에서는 사주·점성·베다·숙요가 든 행만 바뀌었다(93행). 자미 단독·타로 행은 그대로다.
  - `YEONGNYANGI_INVARIANCE_PRINT=1` 로 다시 출력한다. 파일은 CRLF 이므로 붙여 넣은 뒤 줄바꿈을 맞춘다.
- **화면 차트에 없는 이름을 enum 에 넣지 않는다.** 앵커 이름은 `readingCharts` 그룹 라벨과 같아야 강조가 맞는다. 테스트 `__tests__/ui/yeongnyangi-block-anchors.test.mjs` 가 이것을 대조한다.
- **ReadingBook·ConsultationResult 는 사이트맵 라우트의 import 폐포 밖이다.** 이 둘만 고치면 `sitemap:generate` 원장이 바뀌지 않는다(갱신 0, 실측).
- **자화(selfTransformations)는 생년사화와 섞지 않는다.**
- **롤백은 커밋 단위로 한다.**
  - 단계 정책 커밋(`fix(yeongnyangi): let every ziwei tier name 삼방사정 …`)만 되돌리면 invariance 해시표가 어긋난다. `YEONGNYANGI_INVARIANCE_PRINT=1` 로 다시 출력해 같은 revert 에 넣는다.
  - 연결 커밋을 되돌리면 상담 입력이 옛 `brightness` 로 돌아간다. 엔진 출력은 처음부터 바꾸지 않았다.

## 검증 (2026-10-01 실행, 전부 mock — 실 LLM·결제·DB 0회)

```
node --test __tests__/ui/ziwei-star-strength.test.mjs                  # 5/5
node --test __tests__/ui/yeongnyangi-ziwei-palace-strength.test.mjs    # 10/10
npm run check:fast                                                     # node 2173/2173, jest 4908/4908
npm run verify:ziwei-worker-chart-facts   # 114건 통과
npm run verify:ziwei-derived-facts        # 353건 통과
node scripts/verify-ziwei-star-parity.mjs # 21건 통과
```

변이 시험: `reading-quality.ts` 의 금지어 정규식에 "삼방사정"을 되돌리면 테스트가 실패한다.

## S2 검증 (2026-10-01, 전부 mock — 실 LLM·결제·DB 0회)

```
npm run check:fast        # node 2176/2176, jest 전체 통과(critical 승격)
node scripts/run-mock-tests.mjs node __tests__/ui/yeongnyangi-ziwei-palace-strength.test.mjs  # block palaces·명반 재계산 포함
```

화면 검증은 next dev(워크트리, 127.0.0.1:18122)에 Playwright 를 붙여 했다. 커밋하지 않은 임시 스크립트다.

- 영냥이 ziwei_tuna·fusion_saju_ziwei, 연이·네오 상담 결과를 각각 360·390px 에서 봤다.
- 넘침 0, 12px 미만 글자 0, 칸 이탈 0. 대비는 최소 5.19:1(연이 등급 한자)이다.
- 결제 SDK·confirm·activate·create·generate 호출 0건, 결제·구매 버튼 0개다.
- 옛 저장 차트(`ziwei` 없음)는 예전 버튼으로 돌아가고 소절 글자 설명은 남는다.
- visual-checker 1차 판정에서 P2 2건(조건 목록 어절 끊김, 상담 화면 궁 이름 위계)이 나와 고쳤다. 2차 판정 결과는 아래 남은 P3 를 본다.
- 남은 P3: 상담 두 테마의 칸 테두리가 옅다(1.3~1.6:1). 엔진 궁 조건 notes 는 한다체라 해요체 설명과 섞인다. 등급 설명 줄이 대시로 시작하기도 한다.

## S3 검증 (2026-10-01, 전부 mock — 실 LLM·결제·DB 0회)

```
node --test __tests__/ui/yeongnyangi-block-anchors.test.mjs   # 4/4 (차트 라벨 대조·스키마·정리·validateChapter)
npm run check:fast                                            # 서버 커밋·화면 커밋 각각 exit 0 (화면 커밋 때 node 2182/2182)
```

화면 검증은 S2 와 같은 방식으로 했다.
- 환경: next dev(워크트리, 127.0.0.1:18122)에 Playwright 를 붙였다. 커밋하지 않은 임시 페이지와 fusion_all 픽스처를 썼다. 픽스처는 실제 계산 차트 5종에 블록 앵커를 넣은 것이다.
- 범위: 영냥이 책 ko·en, 연이·네오를 각각 360·390px 에서 봤다.
- 결과: 넘침 0, 12px 미만 글자 0, 콘솔 오류 0, `/api/`·결제 호출 0.
- visual-checker 1차: 강조된 라그나 칸이 통째로 칠해져 빗금이 묻혔고, 캡션이 괄호 안에서 끊겼다. 둘 다 고쳤다. 2차는 통과다.
- 남은 P3:
  - 비강조 뼈대(칸 테두리·바퀴 원·눈금)의 대비가 연이 1.3:1, 네오 1.6:1 이다. 자미 힌트와 같은 토큰이다.
  - 사주 격자가 다른 힌트보다 29px 넓다. 그래서 한 소절에 자미·사주가 같이 붙으면 캡션 시작 위치가 어긋난다.
  - 베다 라그나 캡션 "쌍둥이자리 · 라그나" 의 가운뎃점이 항목 구분점과 같은 글리프다. 큰 차트 라벨을 그대로 쓴 것이다.

## S4 검증 (2026-10-01, 전부 mock — 실 LLM·결제·DB 0회)

표기는 사용자가 고른 "한자 한 글자"다. 별 옆에 廟旺得利平不陷 중 한 글자를 붙이고, 일곱 등급을 접지 않는다. 표에 없는 별(좌보·우필·녹존·괴월·천마·지공·지겁 등)은 글자를 붙이지 않는다. 강약은 길흉이 아니므로 색은 한 가지다(셸 #fde68a, 앱 text-amber-200).

- 커밋 넷(워크트리에서 만들어 main 에 머지, 미러 재동기화 별도 커밋):
  - 셸 대한 궁을 목록 순서가 아니라 지지로 찾는다(`js/saju-engine.js`).
  - 워커 프롬프트(`worker/lib/ziwei-ai-prompt.js`)가 정본 7등급·한자로 읽는다.
  - 셸: 옛 `ZW_CLASSICAL_STATE`·점수 혼합·차성 ×0.7·화기 강등을 걷고 `ZW_STAR_STRENGTH`(정본 240칸 복사)를 읽는다. 가드 `verify:ziwei-borrowed-strength` 는 "셸 표 = 정본"을 칸마다 대조하도록 재정의했다.
  - 앱: `app/_lib/ziwei-strength.ts` 가 `lib/ziwei-star-strength.js` 를 읽는다. 앱 `ZIWEI_CLASSICAL_STATE`(태음 寅 '한'을 '평'으로 접던 표)와 지어낸 지지 프로필을 걷었다. 격자 아래 범례(5개 로케일)를 더했다. 저장된 옛 명반의 ◎/O/▲/△/X 는 원래 이름(묘·득·리·평·함)으로 받아들인다.

```
npm run check:fast                                   # 앱 커밋: critical 승격, node 2189/2189, jest 4915/4915, exit 0
node --test __tests__/ui/ziwei-star-strength.test.mjs   # 5/5
node scripts/verify-ziwei-borrowed-star-strength.mjs # 234건, 셸 표 240칸 = 정본
node scripts/verify-ziwei-star-parity.mjs            # 21건
node scripts/verify-ziwei-consultation.mjs           # PASS (기준 해시 재계산 — 바뀐 필드는 별 강약·strengthSummary 뿐)
node scripts/verify-ziwei-deep-counseling-quality.cjs # PASS
npm run verify:ziwei-chart-customer-copy && npm run verify:ziwei-chart-detail-view  # ok (48)
npm run verify:sitemap-drift                         # OK (원장은 같은 커밋에 넣었다)
```

화면 검증은 Playwright 로 했다(커밋하지 않은 임시 스크립트).
- 셸 `/ggulggul/` `renderZiwei`, 앱 `/ziwei/chart/`(next dev, 1985-03-12 07시 남)를 360·390px 에서 봤다.
- 앱 실측: 정본과 다른 칸 0(앱 명반 210칸 중 130칸 정본 일치, 80칸은 강약 없음, 옛 기호 0). 칸 이탈 0, 글자가 별 이름과 떨어진 줄 0, 최소 글자 12px, 가로 넘침 0, 페이지 오류 0.
- visual-checker: 격자 글자·범례 통과. 글자색은 픽셀 실측으로 전부 #fde68a, 대비 10.97~14.52:1. 범례는 띄어쓰기 자리에서만 끊긴다.

### S4 에서 고치지 않은 것 (후속)

- 앱 궁 상세 카드("핵심 주성 자미得 · 천상得")의 강약 글자는 본문색이다. 원래도 문자열을 이어 붙인 목록이라 ◎ 때부터 색이 없었다. 격자처럼 호박색으로 할지는 정하지 않았다.
- 앱 격자 궁 이름이 지지 글자에 밀려 "질액 사 / 궁"처럼 끊긴다(360·390, 명궁 제외 11칸). S4 diff 밖의 머리 영역이다.
- 셸 기존 문제: 대한·소한 라벨 겹침, 별 이름 끊김, 상세 버튼 무스타일, 범례 회색 대비 4.10:1, `zw-cell` aria-label 이 문자열을 그대로 이어 붙임, 요약표 보조성 행에 강약 없음, "우필가" 조사 오류.
- 꽃 엔진(`worker/lib/destiny-flower-engine.js`)은 '불'을 평 쪽으로 접는다. 페르소나 점수는 차성 ×0.9 를 아직 쓴다.
- 앱 '불'은 약한 쪽으로 읽었다: 5단 밝기 읽기에서 함, 옛 힌트 키에서 X, `weakStars`·`hasXianRuo` 에 포함. 원전 不得地 를 '힘을 얻지 못함'으로 읽은 가정이다.
- 죽은 코드(보고만): `AdvancedZiweiSectionV2.tsx` 의 `ZIWEI_STRENGTH_SYMBOL_KEY`·`zPatternStrengthDescription`·copy 의 `strengthDescriptions`, `advanced-ziwei-reading.ts` 의 `BRIGHTNESS_RULES[].symbol`, `scripts/verify-ziwei-brightness-constraints.cjs`(배선 없음·낡음).

## S5 검증 (2026-10-01, 전부 mock — 실 LLM·결제·DB 0회)

워커 표기는 `자미(묘)`(프롬프트 사실 블록)와 한자 한 글자(네오 압축 표기, 섬 화면)다. 셸·앱(S4)과 마찬가지로 일곱 등급을 접지 않는다.

- 커밋 둘(워크트리에서 만들어 main 에 머지):
  - 워커 차트·프롬프트 커밋은 다음을 바꿨다.
    - `worker/lib/ziwei-ai-chart.js`: 옛 28성 표와 5단 접기(왕→묘, 약→리, 불·한→평)를 걷었다. 이제 `lib/ziwei-star-strength.js` 의 `starStrength` 를 읽는다.
    - 범례 한 줄 `ZIWEI_STRENGTH_LEGEND` 를 정본 모듈에 두었다. ziwei-ai 와 심층 리포트가 같은 문장을 싣고, master-love-codex 는 심층 리포트의 명반 포맷을 그대로 쓴다. 범례를 차트 빌더가 아니라 정본 모듈에 둔 이유는 차트 빌더를 목으로 바꾸는 jest 스위트가 많기 때문이다.
    - ziwei-ai 근거 검사(`BRIGHTNESS_TERMS`)는 7등급과 "강약·묘왕·함약·득지", 그리고 "묘 자리"·"(묘)" 꼴을 센다. 출력 규칙은 강약을 문장으로 쓰게 한다("자미가 묘 자리에"). 괄호를 붙이면 `annotateZiweiHanja` 가 한자 주석을 건너뛰기 때문이다.
    - 옛 ◎O▲△X 를 다음 다섯 곳에서 걷었다: 심층 범례·규칙, 네오 상담방 범례·규칙, master-love-codex 규칙·품질 교정 문구, admin 테스트 허용 집합, 심층 픽스처. 픽스처는 기호만 한자로 바꾸고 등급 다섯은 그대로 두었다.
  - 섬 커밋은 다음을 바꿨다.
    - `BRIGHTNESS_SCORE` 에 왕 7, 불 -3 을 더했다(묘 8·득 5·리 2·평 0·함 -6 은 그대로).
    - 별 해설 문구(`BRIGHTNESS_FACET`)에 왕·불을 더했다.
    - 상담 프롬프트는 `(묘)` 꼴로 쓴다.
    - `destiny-island.html` 표시는 한자 한 글자다. `public/` 미러도 같은 커밋에 넣었다.

```
npm run check:fast                                       # critical 승격, jest 4916/4916, 가드 87 통과 / 1 헛실패 → exit 1 (아래)
npm run verify:ziwei-worker-chart-facts                  # 통과 122건
node --test __tests__/ui/ziwei-star-strength.test.mjs    # 5/5
npm run verify:ziwei-island && npm run verify:island-star-copy   # 픽스처 14건 통과, 별 문구 10건 통과
npm run verify:sitemap-drift                             # 첫 push 때 실패 → 원장 재생성 커밋 뒤 OK (함정 참고)
```

check:fast 의 실패 1건은 `__tests__/ui/yeongnyangi-reading-v7-golden.test.mjs` 의 헛실패다.
- 증상: 전체 스위트 안에서 두 번 다른 모양으로 깨졌다(`15 !== 14`, 하위 스크립트 `node:fs` 오류).
- 판정: 같은 파일만 `node --test` 로 두 번 돌리니 둘 다 통과했다(각 18초). 동시 스위트가 Windows 임시 checkpoint rename 을 막는 알려진 현상이다. 최종 판정은 CI 로 했다.

섬 점수 변화는 무작위 300명반으로 실측했다. 옛 경로(옛 표 + 5단 접기)와 새 경로의 궁 기본 점수를 비교했고, 스크립트는 커밋하지 않았다.
- 결과: 명반 300개 중 276개(92%)에서 궁 하나 이상의 티어가 바뀐다. 궁 단위로는 3600칸 중 687칸(19%)이다.
- 원인: 변화 대부분은 가중치가 아니라 표가 정본으로 바뀐 데서 온다. 옛 표는 원전과 126칸 중 49칸만 일치했다.
- 주성 등급 분포(새 경로, 4200): 묘 1316, 왕 966, 득 462, 평 478, 리 268, 불 186, 함 524.
- 골든 고정값이 없어서 섬 검증기는 이 변화와 무관하게 통과한다.

### S5 의 가정과 배포 영향

- **섬 가중치 왕 7·불 -3 은 가정이다.** 두 값은 각각 위아래 등급 사이에 두었다. 대안은 예전 접기와 같은 점수(왕 8, 불 0)다. 바꾸려면 `worker/lib/island/island-weights.js` 한 줄만 고치면 된다.
- **배포하면 모든 사용자의 섬 배치가 한 번 바뀐다.** 섬 레이아웃 서명(`hashSignature`)에 강약이 들어 있기 때문이다.
- **배포 당일에는 옛 청사진이 보일 수 있다.** `cdIsland:blueprint:v2` 로컬 캐시의 키가 프로필과 KST 날짜이기 때문이다. 다음 날부터 새 청사진이 나온다.
- **저장된 스냅샷의 옛 5단 값은 그대로 읽힌다.** 정규화가 옛 이름을 받아들이기 때문이다. 다만 옛 '묘'에는 접혀 들어간 왕이 섞여 있다.
- **영냥이는 영향이 없다.** 영냥이는 `brightness` 를 지우고 정본 모듈을 직접 읽는다.

### S5 에서 고치지 않은 것 (후속)

- 앱 `app/_lib/ziwei-deep-reading.ts` 의 `LEGACY_HINT_KEY` 와 `app/_lib/ziwei-star-interpretations.ts` 의 옛 기호 힌트 키는 남겼다. 둘은 S4 앱 범위이며 저장된 옛 명반을 읽는 호환 장치다.
- `__tests__/worker/neo-operation-room.sections.test.js` 의 픽스처 "자미◎" 도 남겼다. 이것은 모델 출력 예시 문자열이다.
- 꽃 엔진의 '불' 접기는 S4 후속에 이미 적혀 있다.

## S0 검증 (2026-10-02, 전부 mock — 실 LLM·결제·DB 0회)

등급은 한 칸도 바뀌지 않았다. 240칸의 status·raw·rawKo·rawHanja·grade·rank·label·sourceId 를 바꾸기 전 HEAD 와 비교했고 차이는 0이다. 그래서 셸 `ZW_STAR_STRENGTH`·워커·앱·LLM 사실 블록은 그대로다. 바뀐 것은 `basis`·`confirmedBy`·`dissent`·`note` 와 화면 설명 문구뿐이다.

- 칸 수: 주성은 classical 126·modern-confirmed 42, 6성은 classical 52·modern-confirmed 12, impossible 8 이다. modern-single 과 disputed 는 0이다.
- 원전 칸 대조: 紫微人生은 원전 178칸 중 176칸과 같다. 다른 2칸이 이견 2칸이고, 두 칸 모두 iztro 와 같은 값이다. 원전 칸 125+51 칸에는 `confirmedBy` 로 두 현대 표를 적었다.
- 불가 8칸은 紫微人生에서도 빈칸이다.
- `dissent` 는 단일 객체에서 `{sourceId, raw, grade}` 배열로 바뀌었다. 이 필드를 읽는 소비처는 0이다(git grep).
- 소비처 셋:
  - `worker/yeongnyangi/fortune/reading-presentation.ts` 의 basis 타입에 `modern-confirmed`·`disputed` 를 더했다.
  - `ZiweiReadingChart.tsx` 의 "현대 표" 태그 조건을 `basis!=='classical'` 로 넓혔다. 54칸에 태그가 그대로 붙는다.
  - `ziwei-chart-copy.ts` 설명 문구를 5개 로케일 모두 "다른 현대 표도 같은 값이지만 같은 계열일 수 있어 원전만큼 단단하지 않다"로 바꿨다.
- 파서는 fail-closed 다. 모르는 글자와 같은 행 중복을 보고하고, 테스트가 둘 다 빈 배열임을 단언한다. 祿(녹존)은 not-rated 라 명시적으로 건너뛴다.
- 변이 확인: 원문 행에 모르는 글자나 중복 별을 넣으면 파서가 보고했다. 합성 입력에서 두 현대 표가 다르면 `disputed` 경로를 탔다.

```
npm run check:fast                                       # exit 0 — node --test 2203/2203, jest 328 스위트 4916/4916
node --test __tests__/ui/ziwei-star-strength.test.mjs    # 7/7
npm run verify:ziwei-borrowed-strength                   # ok
npm run verify:ziwei-star-parity                         # 통과
npm run verify:sitemap-drift                             # OK — 원장 4칸(lastmod 2026-10-02)을 같은 커밋에 넣었다
```

### S0 에서 고치지 않은 것 (후속)

- **녹존(祿)**: 紫微人生은 녹존이 앉는 8자리(子寅卯巳午申酉亥)를 모두 廟로 적는다. 원전에 녹존의 강약 줄이 없어 not-rated 를 유지했다.
- **서적·앱 대조**: 왕정지 중주파 강의서, 문묵천기(文墨天機) 앱과는 대조하지 않았다.

## 2026-10-02 추가 작업 — 계산법 통일·운명의 섬 개편 (전부 mock — 실 LLM·결제·DB 0회)

요청 원문: "니가 가능하다면 직접 정확한 계산법을 찾아서 자미두수 서비스들에 적용시켜주면 좋을것 같다 그리고 운명의 섬 기능 자미두수 ui/ux와 진입 이미지를 좀 더 바꿔주고 캐릭터들도 새롭게 만들어주면 좋겠고 상담을 하고싶게끔 만들어줘야해 가격은 더 낮추도록하고 기존 자미두수 상담 로직을 활용한다."

### 사용자 결정 (2026-10-02)

| 항목 | 결정 |
|---|---|
| 섬 12궁 상담 가격 | 10,000 → 5,000원. 전문가 상담 30,000·심층 리포트 3,000 은 유지 |
| 카드 단건 실패 자동 환불 | 섬 상담에 이식 |
| 자미 출생 시각 | 경도·서머타임 보정(사주 공개 방법론과 같음) |
| 그림 | Codex image_gen, 최대 30회 승인. 19회 사용 |

### 계산법 (2단계)

커밋: c88774713 천요 · 3bebaa5fe 윤달 · 3b6362939·bb55c6d66·1cda03696 23시 · 5674948fb reference verify · 2a5028929 시각 통일 · 4ead0d55a 유파 기록 · 097102a02 미러 해시

- 외부 기준: iztro 2.6.1(MIT) 대조 fixture `scripts/fixtures/ziwei-iztro-reference.json`, 검증 `verify:ziwei-reference`(세 엔진 × fixture). iztro 는 레포에 설치하지 않았다.
- 고친 것:
  - 워커 천요(`lunarMonth+1` 한 달 밀림)
  - 윤달 15일 분할
  - 23시 다음 날 子
  - 모든 진입점 경도·서머타임 보정 시각
- 유파 기록: `scripts/fixtures/README-ziwei-iztro-reference.md` "유파 선택 기록". 辛년 괴월은 『全書』「六辛逢虎马」와 iztro 가 갈려 값을 유지했다.

### 운명의 섬 (3단계)

- 가격 5,000원(레지스트리만)과 `payment-gating.md` 승인 절: 54d040f42.
- 카드 단건 품질 실패 자동 환불 이식: de330b5c4.
- 화면·캐릭터·이미지: 04cf078b4.
  - 12궁 수호자 초상 12장 `public/images/destiny-island/guardians/*-v1.webp`. 캐스트·규칙은 `docs/design/destiny-island/CAST.md`, 원장은 `art.jsonl` 이다.
  - 게이트 히어로 `gate-hero-{desktop,mobile}-v2.webp`(312→186KB, 193→107KB), 홈 카드 `home-card-480.webp`.
  - 궁 대화 끝 질문 칩 → `goPalaceConsult(pal, question)` → `/island-consult/` 에 질문·출생 정보 씨앗. 출생 정보 재입력이 0이고 대화에서 1탭이다.
  - 상담 화면 수호자 블록, 결과 끝 "명반 전체로 더 묻기 · 전문가 상담" → `/ziwei-ai/` 프리셋(`ziweiIslandPreset`).
  - 검증: 390·1440 실제 클릭 흐름, visual-checker 통과, scrollWidth 390.

### 고치지 않은 것 (후속)

- 결제:
  - 50코인 가격이면 Standard 이용권도 섬 상담을 덮는다(가격 기반 일반 규칙).
  - 인하 전 PENDING 10,000원 주문은 금액 불일치가 날 수 있다.
  - Play tier_02 매핑은 콘솔에서 확인하지 않았다.
  - 낡은 가격 문서: `payment-inventory.md:149`, `PRICING_AUDIT.md:253/324`, `PRICING_TIERS.md:62`.
- 섬 결제 도우미 23개가 ziwei-ai.js 와 갈라져 있다(결제 동작 변경이라 범위 밖).
- 수호자 질문 문구가 셸(`destiny-island.html` PALACES)과 앱(`IslandConsultClient.tsx` GUARDIANS)에 중복돼 있다.
- 시각 보정 뒤 남은 경로:
  - island-report 는 볼 때 다시 계산한다(기존 구매자 시진 이동 가능).
  - 궁합 자정 넘김.
  - compass·diary 의 음력 입력을 양력으로 처리한다.
  - karma·guardian isLeapMonth, admin calendarType, worker lunar_leap.
- 기존 화면 결함:
  - 네오 아바타는 로컬에서만 404(운영 R2 경로).
  - "▼ 탭해서 계속" 깜빡임 프레임 대비가 낮다.
  - 상담 설명 들여쓰기.
  - 상담 textarea 줄바꿈이 단어 중간에서 끊긴다.

## 모르는 것

- **S5 근거 어휘의 실 LLM 통과율은 미검증이다.** `ziwei-ai` 의 강약 근거 검사가 새 어휘("묘 자리" 등)로 통과·재시도되는 비율은 mock 에서 알 수 없다.

- **실 LLM 상담 품질은 미검증이다.** mock 은 입력이 바뀐 것만 보여 준다. Gemini 가 선택 필드 `palaces`·`pillars`·`astroPoints`·`vedicPoints`·`mansions` 를 얼마나 채울지도 실호출 전에는 모른다. 비어도 화면은 강조만 빠진다.
  - 실호출 검수는 정확한 1회 승인이 있어야 한다.
  - 승인되면 연어 1건을 생성하고 본문 전체를 사용자에게 전달한다.
- **보충 54칸의 두 현대 출처가 서로 독립인지 모른다.** iztro 와 紫微人生은 240칸이 전부 같아 같은 계열일 수 있다(추정). 원전과 다른 계열의 서적으로 확인하기 전까지 54칸은 원전 칸만큼 단단하지 않다.
- **v7 장의 `promptVersion` 은 `chapter-v7` 그대로다.** 장 경로의 버전 체계를 따로 올릴지는 정하지 않았다.
