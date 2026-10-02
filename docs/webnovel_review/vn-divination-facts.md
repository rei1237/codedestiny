# VN 점술 사실 — 연이 명식 엔진 산출값

> 2026-10-02 실측. 비주얼 노벨이 쓰는 사주·점술 값의 근거다. 이야기에는 이 문서의 값만 쓴다. 지어내지 않는다.
> 입력: **2002-07-06 08:30, 양력, 서울(37.5665N, 126.978E, UTC+9), 여.** 2026년 봄에 스물세 살이다.

## 값

| 체계 | 엔진 | 값 | 이야기에서 쓴 곳 |
|---|---|---|---|
| 사주 | `lib/korean-calendar` `calculateNatalSaju` | 壬午年 丙午月 乙亥日 庚辰時 | 명식판 8칸, 아크별 회수(EP.12·16·20·22·48) |
| 자미두수 | `worker/lib/ziwei-ai-chart.js` `calculateZiweiAiChart` | 명궁 寅 염정(묘), 신궁 재백, 금사국. 壬년 사화: 천량 化祿(자녀 亥), 자미 化權(재백 戌, 천상 동궁), 좌보 化科(천이 申), **무곡 化忌(관록 午, 천부 동궁)** | EP.30~32A. 化忌가 金 별 무곡에 붙어 金인 네오가 표적이 된다 |
| 베다 | `lib/vedicCalculator.js` `calculateVedicChart` | 아야남샤 23.89. 달 양자리 25.91° 바라니(4파다, 크리티카 경계까지 약 0.76°). 라후 황소자리 로히니, 케투 전갈자리 제스타 | EP.37~40. 바라니=품는 별, 라후·케투=흑월의 머리와 꼬리 |
| 점성술 | `worker/lib/swiss-ephemeris.js` `getSwissWesternChart` (source `swiss-wasm-local`, placidus) | ASC 사자 22.08°, MC 황소 15.73°. 태양 게 13.75° 11H, 달 황소 19.88° 10H, 금성 사자 24.44° 1H(ASC 합), 화성 게 25.07° 12H, 목성 게 24.04° 12H(화성과 합 1.0°), 토성 쌍둥이 21.85° 11H | EP.34~36A. 상승궁 사자=백사자 네오, 12H 화성·목성=숨은 적·숨은 도움 |
| 타로 | `lib/tarot/yeongnyangi-birth-symbol.mjs` `birthSymbol` (`gregorian-digits-rws-v1`) | **17 별** (M17) | 프롤로그 방의 별 카드 → EP.44 |

## 주의

- `lib/vedicCalculator.js`의 lagna 값(마카라, 염소자리)은 쓰지 않는다. 이 파일은 상승궁에 180°를 더하는 문제가 있다(:141, 후속 과제). 스위스 엔진의 열대 ASC 사자 22.08°에서 아야남샤를 빼면 항성 기준 게자리 말이다. 이야기는 베다 상승궁을 언급하지 않는다.
- 검은 달 릴리스는 스위스 엔진 결과에 없다. 그래서 흑월의 '이름'으로만 쓰고 위치는 말하지 않는다.
- 달(바라니, 경계까지 0.76°)과 상승궁처럼 경계에 가까운 값은 이야기에서 단정하지 않는다.
- 옛 본문의 丁未 명식은 이 입력에서 나올 수 없어 버렸다.
- 체계를 섞지 않는다([content-assets.md](../context/content-assets.md)).

## 재현

워크트리나 레포 루트에서 실행한다. 사주, 자미두수, 베다, 타로는 순수 계산이라 네트워크를 쓰지 않는다.

```bash
node --input-type=module -e "
const {calculateNatalSaju}=await import('./lib/korean-calendar/index.js');
const {calculateZiweiAiChart}=await import('./worker/lib/ziwei-ai-chart.js');
const {calculateVedicChart}=await import('./lib/vedicCalculator.js');
const {birthSymbol}=await import('./lib/tarot/yeongnyangi-birth-symbol.mjs');
const b={birthDate:'2002-07-06',birthTime:'08:30',calendarType:'solar',gender:'female'};
console.log(calculateNatalSaju(b).pillars);
for(const p of calculateZiweiAiChart(b).palaces) if(p.transformations.length||p.name==='명궁') console.log(p.name,p.earthlyBranch,p.mainStars,p.transformations);
const v=calculateVedicChart({year:2002,month:7,day:6,hour:8,minute:30,tzOffset:9,latitude:37.5665,longitude:126.978});
console.log(v.moon, v.rahu.nakshatra.name, v.ketu.nakshatra.name);
console.log(birthSymbol('2002-07-06'));"
```

점성술은 스위스 엔진을 로컬에서 돌린다. 외부 네트워크는 `mock-network-guard`로 막고, 결과의 `source`가 `swiss-wasm-local`인지 확인한다.

```bash
node --require=./scripts/lib/mock-network-guard.cjs --input-type=module -e "
const {getSwissWesternChart}=await import('./worker/lib/swiss-ephemeris.js');
const w=await getSwissWesternChart({}, {year:2002,month:7,day:6,hour:8,minute:30,timezone:9,lat:37.5665,lon:126.978}, {strict:true});
console.log(w.source, w.houseSystem, w.ascendant, w.midheaven);
for (const [k,p] of Object.entries(w.planets)) console.log(k, p.signKo ?? p.sign, p.degreeInSign ?? p.degree, p.house);"
```
