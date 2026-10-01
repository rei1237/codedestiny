---
status: active
updated: 2026-10-01
next: S2 — 영냥이·연이/네오 상담 화면에 자미 명반 격자(강약 표기·탭 설명·설명 옆 궁 강조)를 붙인다. S0(사용자 캡처)이 먼저 오면 그것부터 반영한다.
---

# 영냥이 자미두수 — 정확한 강약표 위에서 강약을 읽는 상담 + 설명마다 명반

## 왜

요구 원문은 [브리프](2026-10-01-ziwei-strength-brief.md). 요약하면 이렇다.

- 별 이름 풀이를 넘어 묘왕리함·동궁·삼방사정·사화·보조/살성을 종합하는 상담으로 바꾼다.
- 설명할 때마다 해당 명반을 보여 준다. 모든 운세에 해당한다.
- 2026-10-01 추가 요구: "정확한 데이터를 기반으로 해야해 그리고 강약도 반드시 반영이 되어야한다". 다른 사이트 캡처로 사용자가 직접 확인해 줄 수 있다고 했다.

## 지금 상태 (S1 완료)

S1(강약표·상담 사실·프롬프트·단계 정책)은 main 에 머지됐다. 커밋은 `git log --oneline --grep=ziwei -8` 로 확인한다.

S2~S5 는 남아 있다. 영냥이 상담 화면에는 아직 명반이 나오지 않는다.

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
| 현대 보충 (modern-single) | 주성 42, 6성 12 | [iztro](https://github.com/SylarLong/iztro/blob/bb1781cc5da481b1e741ec4da4e4936e91ab6a36/src/data/stars.ts) MIT `src/data/stars.ts` @ `bb1781c` |
| 이견 | 2칸 | 천기 辰(원전 旺 / iztro 利), 文曲 寅(원전 陷 / iztro 平). 원전 값을 채택했다. |
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

- [ ] **S0 (사용자)** — 독립 출처로 아래 56칸(보충 54 + 이견 2)을 확인한다.
  - 받을 것: 14주성 묘왕리함 전체 표 1장(14×12)과 6성 표, 출처(책 제목·판·쪽 또는 앱 이름·화면 경로).
  - 출처 조건: iztro 를 베끼지 않은 독립 출처여야 한다. 후보는 문묵천기(文墨天機) 앱의 성요 묘왕표, 왕정지 중주파 강의서, 국내 자미두수 서적이다.
  - 반영 방법: `lib/ziwei-star-strength.js` 에 출처 열을 추가한다. 같은 값이면 `modern-confirmed`, 다르면 `disputed` 로 두 값을 모두 보존한다. 테스트 `__tests__/ui/ziwei-star-strength.test.mjs` 의 칸 수를 갱신한다.
  - 판정 기준: 56칸 모두 `modern-single` 이 아니게 된다(`modern-confirmed` 또는 `disputed`, 이견 2칸은 확인 결과를 `dissent` 에 추가).

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

- [ ] **S2 화면 (영냥이·연이/네오)**
  - 작업:
    - `AdvancedZiweiSectionV2.tsx` 의 4×4 격자를 공용 `ZiweiPalaceGrid` 로 뺀다. `ReadingCharts` 가 자미 명반을 표시하게 한다.
    - 주성 옆에 한자·등급 글자를 둔다. 색만으로 구분하지 않는다.
    - 탭하면 설명이 나오게 하고, 접힌 "강약을 어떻게 읽었나"를 둔다.
    - 블록에 선택 필드 `palaces?: string[]` 를 둔다. 궁명으로 검증하고, 모르는 값은 버린다(거부하지 않는다). 설명 옆 궁 강조에 쓴다.
    - ask `factIds` 를 `ask/validate.ts` 에서 지우지 말고 서버 전용 `internalBasis` 로 저장한다. `presentFortune` 에서는 제거한다.
    - 기존 결과는 저장 명반으로 강약을 다시 계산해 표시만 한다. LLM 재생성은 하지 않는다.
  - 판정 기준: 360·390px visual-checker 통과, 기존 주문 화면에서 재결제 요구 0건.
- [ ] **S3 다른 운세의 '설명마다 명반'** — 사주·점성·베다·숙요. 선례는 `lib/human-design/report-plan.js` 의 `chartSlotFor` + `ChartFigure`.
- [ ] **S4 꿀꿀 셸·앱 통일**
  - 셸·앱 강약을 정본 모듈로 바꾼다. 점수 혼합, 차성 ×0.7, 화기 강등을 걷어 내고 관련 가드를 재정의한다.
  - 셸 대한 궁 오인덱스(`js/saju-engine.js:17703`, `:21767`)를 고친다.
  - `worker/lib/ziwei-ai-prompt.js` 를 바꾸고 `sync:public` 미러를 갱신한다.
- [ ] **S5 나머지 자미 경로**
  - `worker/routes/ziwei-ai.js`, deep report, island(점수 영향이 있으므로 regression-scout 먼저), master-love-codex.
  - 앱 `mapZiweiStrengthSymbol` 이 빈 값을 △ 로 그리는 결함을 고친다.

## 함정

- **v7 매니페스트는 그대로 쓰면 안 된다.** `readingManifestV7` 은 owns/refs 패턴이므로 `resolveV7Ledger(...).chapters` 를 거쳐야 `selectChapterFacts` 가 사실을 찾는다. 고등어는 v6 만 된다.
- **단계 금지어의 실제 거부 지점은 `reading-quality.ts` 의 `validateReadingQuality`(TIER_SCOPE_VIOLATION)다.** `providers/chapter.ts` 의 `TIER_SCOPED_TERMS` 는 프롬프트 어휘와 교정 문구만 바꾼다. 이 차이는 변이 시험으로 확인했다.
- **영냥이 파일을 고치면 사이트맵 원장도 바뀐다.** 원장 서명은 import 폐포 해시라서 영냥이 파일을 고치면 라우트 17곳의 서명이 바뀐다. `npm run sitemap:generate` 결과를 같은 커밋에 넣는다.
- **`zw.xian.support` 는 계획보다 좁다.** 같은 궁의 녹존 + 화록·화권·화과만 센다. 원문 「禄元…化吉」을 엄격히 읽은 것이다. 계획서는 좌보·우필·괴월과 삼방까지 넣었다. 넓힐지는 사용자 판단이다.
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

## 모르는 것

- **실 LLM 상담 품질은 미검증이다.** mock 은 입력이 바뀐 것만 보여 준다.
  - 실호출 검수는 정확한 1회 승인이 있어야 한다.
  - 승인되면 연어 1건을 생성하고 본문 전체를 사용자에게 전달한다.
- **보충 54칸은 현대 출처 1개(iztro)에만 기대고 있다.** S0 전까지는 단일 출처다.
- **v7 장의 `promptVersion` 은 `chapter-v7` 그대로다.** 장 경로의 버전 체계를 따로 올릴지는 정하지 않았다.
