# 훈민정음 작명소 v2 — 결정론 작명 엔진 설계서 (Phase 1)

- 상태: **Phase 3 엔진 구현 완료 — 미노출**. `worker/naming-engine/*.ts` 는 아직 어디에서도 import 되지 않는다(라우트·결제·LLM·화면은 Phase 4·5).
  Phase 1 설계안 본문은 그대로 두고, 구현에서 달라진 값은 §7.1·§8.1 에 적는다(정본은 코드).
- 작성: 2026-10-03, 기준 커밋 `7c02f3ecf`(origin/main).
- 근거 보고: Phase 0 진단(세션 a96e4b8d). 아래 "현재"라는 서술은 모두 그 실측이다.
- 검수용 표: 이 폴더의 `*.csv` — 자문 명리학자가 시트로 열어 `review_*` 열을 채운다(§12).

## 0. 한 줄 목표

사주 용신을 읽고 **인명용 한자 전체 풀**에서 글자를 스스로 찾아, 원획·4격 수리·소리오행·자원오행·음양·어감을
**코드가 계산·검증**한 추천 목록을 만들고, LLM 은 그 확정 데이터를 받아 **풀이 문장만** 쓴다.

## 1. 현재와 달라지는 것

| 항목 | 현재(v1, `naming-result-v20260712`) | v2 |
|---|---|---|
| 한자·훈음·자원오행 | LLM 이 생성 | 인명용 한자 풀 데이터에서 엔진이 선택 |
| 원획·4격·삼재 | 미계산(`worker/lib/naming-suri.js` 는 표뿐) | 결정론 계산 + 항목별 근거 키 |
| 소리오행 | 결정론(ko, 실무설 고정) | 결정론, `modern`/`hunminjeongeum` 프리셋 |
| 용신 | `resolveNamingYongshin`(조후 우선·종격 없음) | 메인 사주 정본 `buildSajuSnapshotFromBirth`(억부 우선·조후·종격 후보) |
| 무료 | 한글 초안 5개(클라 생성) | 엔진 상위 5개(한자 포함, LLM 0콜, 서버 계산) |
| 유료 30,000원 | LLM 카드 5~12 + 8장 | 엔진 상위 12개 + 비교 + LLM 서술 + 작명서 이미지·PDF |
| LLM 역할 | 이름 생성 + 서술 | 서술만, 출력 속 한자·숫자·오행을 엔진 값과 대조 |

## 2. 레포 계약과의 정합 (Phase 0 §9 승인 사항)

- main 직접 커밋(워크트리 → main 직머지). 브랜치·PR 없음.
- `_graveyard/` 를 만들지 않는다. v1 코드는 v2 전환 + 진행 중 v1 실행이 모두 끝난 뒤(크론 재개 창 7일) 별도 커밋으로 3면 grep 후 삭제한다.
  v1 **결과 읽기**(레거시 렌더러)는 영구 유지한다.
- `sajuAdapter.ts`·`calculateLocalResult()`·`normalizeSaju.ts`·KASI prefetch·6개 점술 엔진은 import 조차 하지 않는다.
- 새 화면 폭은 `--cd-w-prose`(760). 셸의 960 폴백은 건드리지 않는다. 라이트/다크 분기 없음(단일 다크 세계, 토큰만).
- 문구는 `useTPick` + scopedCopy(ko 정본, en·ja·zh-CN·zh-TW 저작, 나머지 영어 복사).
- 기능 전환은 env 플래그가 아니라 코드 상수 `NAMING_ENGINE_VERSION`(바인딩 여유 2) — 롤백은 revert.
- 결제 로직·가격·`config/payment-freeze.json` 대상 파일 무변경. 기존 `premium-naming-prompt` 게이트에 연결만.

## 3. 모듈 구조

```
worker/naming-engine/            ← 순수 TS, Workers·Node 양쪽에서 import (영냥이 TS 선례)
  config/
    weights.ts                   점수 가중치(§7) — 숫자만, 로직 없음
    school-presets.ts            학파 프리셋(§5)
    negative-meaning.ts          뜻 거르기 목록(첫째 훈 부정 뜻·반대 성별 호칭, §7.1) — 자문 검수 대상
  data/                          생성물(Phase 2) — 손으로 고치지 않는다. build-naming-data.mjs 로만 갱신
    hanja-pool.v1.json           인명용 한자 풀 + 음별 훈 + 원획·필획 + 자원오행 + 분쟁·주의·태그
    surnames.v1.json             성씨 한자·원획(단성·복성) + 2015 인구
    suri-81.v1.json              81수리 등급(학파 대안·출처 포함)
    samjae-125.v1.json           삼재 125조합(5³) 등급(출처 라벨 포함)
    sound-blacklist.v1.json      놀림·비하 동음 블랙리스트(block/warn)
    name-usage.v1.json           이름 사용 빈도 — (한자, 음)별 이름 글자 사용·자리별 음절 사용(Phase 5, Wikidata CC0)
  strokes.ts                     원획/필획, 부수 변형 환산, 숫자 한자 규칙
  suri.ts                        4격·삼재·외격, 81 환원, 수리오행·수리 음양
  sound.ts                       초성 추출, 두 매핑, 인접 상생/상극
  saju-input.ts                  래퍼: buildSajuSnapshotFromBirth → 필요/기피 오행
  candidates.ts                  인덱스 탐색 + 하드 필터
  score.ts                       항목 점수 + 근거 키
  diversify.ts                   MMR 다양화
  engine.ts                      파이프라인 진입점 runNamingEngine(input, { tier, saju?, data? })
  types.ts · data.ts             공통 타입·FNV 해시 / 생성물 JSON 디코드(아이솔레이트당 1회 메모)
scripts/naming/
  extract-raw.mjs                내려받은 원천 → data/naming/raw/ 발췌 + manifest.json(상류 sha256)
  build-naming-data.mjs          raw + rules + 검수 CSV → worker/naming-engine/data/*.v1.json + data/naming/review/*.csv.
                                 `--check` 는 쓰지 않고 비교만(불일치면 실패). dataVersion = 입력·스크립트 해시
  lib/                           naming-data-utils.mjs(CSV·부수표·두음) · build-pool.mjs(풀 대조·읽기·원획)
data/naming/raw/                 원천 발췌(Unihan·libhangul·rutopio 크롤·efamily 재수집·KOSIS 성씨·수리/삼재/불용/자원오행 출처)
data/naming/rules/               사람 판정 규칙: suri-81 · samjae-125 · buryong · sound-blacklist · jawon · pool-adjudication
data/naming/review/              검수 CSV(빌드 생성물, §12)
data/naming/NOTICE.md            출처별 조건 + Unicode License v3 · libhangul BSD-3 · rutopio MIT 전문 · KOSIS 인용 문구
```

- 기존 `worker/lib/naming-sound-elements.js`·`naming-suri.js` 는 v1 프롬프트가 쓰므로 v1 삭제 시점까지 그대로 두고, v2 는 같은 표를 데이터 파일로 옮겨 단일 정본으로 만든다(v1 삭제 커밋에서 중복 해소).
- 엔진은 I/O 가 없다(데이터는 정적 import). 같은 입력·프리셋·데이터 버전이면 같은 출력.

## 4. 데이터 모델

```ts
type Element = "wood" | "fire" | "earth" | "metal" | "water";

// 생성물은 표 형식 { schema, dataVersion, fields: string[], rows: unknown[][] } — 한 행이 한 줄.
// 아래는 한 행을 fields 순서대로 객체로 본 모양이다.
interface HanjaEntry {
  ch: string;                    // 한 글자. 인명용 풀 소속(basis)이 존재 조건
  readings: [hangul: string, kind: "designated" | "dueum", hun: string | null][]; // 음마다 훈(libhangul, 파일 머리 hunSource). 두음 파생 포함
  radical: number;               // 강희 부수 번호(kRSUnicode)
  won: number;                   // 원획 — 기본(§6.1)
  pil: number;                   // 필획(kTotalStrokes) — kr-pil 프리셋
  jawon: Element | null;         // 자원오행(§6.6). null = 미분류
  jawonBasis: "meaning" | "radical" | "reviewer" | null;
  confidence: number | null;     // 0~1. 0.7 미만은 추천 우선순위 하향
  reviewed: boolean;             // 자문 검수 완료
  disputes: string[];            // won-total-exceeds-formula · multiple-radical-values · simplified-radical · jawon-sources-differ
  cautions: [reasonKey: "buryong", sourceIdx: number[]][]; // 불용 관행 — 차단 없이 경고(§13.B.7). 색인 = 파일 머리 cautionSources
  tags: string[];                // basic-edu · numeral-suui · ext-a · ext-b · ext-c-plus
  basis: "crawl" | "efamily" | "law-basic-edu" | "adjudicated";
}
// 별표2 허용자체(variantOf)는 넣지 않았다 — efamily 가 허용자체를 별도 유니코드로 나열해 각자 독립 행이 된다.

interface Surname { hangul: string; hanja: string; population: number; won: number[]; pil: number[]; compound: boolean }
type SuriGrade = "good" | "half" | "bad";          // 출처마다 大吉·中吉 세분이 달라 3단계로 고정(§13.B.2)
interface SuriEntry { n: number; grade: SuriGrade; flag: "" | "disputed"; genderNote: "" | "common" | "some";
                      alternatives: [sourceId: string, grade: SuriGrade][]; sources: string[] } // 대안 = 등급이 다른 출처
interface SamjaeEntry { heaven: Element; human: Element; earth: Element; grade: SuriGrade; gradeRaw: string; // 기준 출처(zhouyi) 원 라벨
                        flag: "" | "disputed"; alternatives: [sourceId: string, grade: SuriGrade][]; sources: string[] } // 125조합
// 해설 문구 키(nameKey·interpKey)는 데이터에 두지 않는다 — Phase 4 문구 파일에서 n·조합으로 찾는다.

interface NamingInput {
  surname: { hangul: string; hanja: string[] };   // 성 한자 선택 필수(복성은 2자)
  gender: "M" | "F" | "N";
  birth: { date: string; time: string | null; calendarType: "solar"|"lunar"|"lunar_leap"; place?: unknown };
  nameLength: 1 | 2;                              // 법정 상한(§10)과 별개로 엔진은 1~2자만 탐색
  fixedChar?: { position: 0 | 1; ch: string };    // 돌림자
  avoidChars: string[];
  mode: "hanja" | "hangul";
  schoolPreset: string;                           // 기본 "kr-modern"
}

interface NamingResultV2 {
  engineVersion: string; dataVersion: string; schoolPreset: string;
  inputHash: string;                              // locale 제외(v1 과 동일 원칙)
  saju: { useful: Element[]; caution: Element[]; derivedSupport: Element[]; timeUnknown: boolean; basis: string };
  candidates: NamedCandidate[];                   // 정렬·다양화 완료
}
interface NamedCandidate {
  hangul: string; hanja: string[];
  strokes: { surname: number[]; name: number[]; method: "won" | "pil" };
  suri: { won: number; hyeong: number; i: number; jeong: number; grades: Record<string, string> };
  samjae: { heaven: number; human: number; earth: number; combo: Element[]; grade: string } | null;
  sound: { elements: Element[]; relations: ("generate"|"same"|"control")[]; mapping: string };
  jawon: (Element | null)[];
  yinYang: ("yang" | "yin")[];
  scores: Record<"saju"|"suri"|"samjae"|"sound"|"yinyang"|"practical", number>;
  total: number;
  reasonKeys: string[];                           // 화면·LLM 공통 근거 키
}
```

## 5. 학파 프리셋

| 프리셋 | 소리오행 | 획수 | 숫자 한자 | 4격 식 | 성별 차등 | 삼재 |
|---|---|---|---|---|---|---|
| `kr-modern`(기본) | 운해본·실무설 ㅇㅎ=土·ㅁㅂㅍ=水 | 원획 | 수의(四=4…十=10) | §6.2~6.3, 가성수 없음 | 끔 | 참고(가중 5) |
| `kr-hunminjeongeum` | 해례 제자해 후음=水·순음=土 | 원획 | 수의 | 동일 | 끔 | 참고 |
| `kr-pil` | 실무설 | 필획 | 실획 | 동일 | 끔 | 참고 |

- 소리오행 기본값 근거(§13.B.6): 실무에서 운해본식이 "다수설"·"대세"이고(사주포럼·갑술작명·mumyeong), 현 정본(`naming-sound-elements.js` "되돌리지 말 것")·검증기·SEO 문구도 같다.
  해례 제자해 원문("喉邃而潤，水也" / "脣方而合，土也")과 학술 표준론(이재승 2019)이 반대편이고, 서비스명이 "훈민정음"이므로 해례 계열을 입력 단계의 **선택지로 노출**한다. 결과 화면에는 두 배속이 갈린다는 사실과 그 기원(신경준 『훈민정음운해』 1750)을 고지한다.
- 숫자 한자 수의(數意) 규칙은 국내 자료(knaming)와 중국 자료(meimingteng)가 적용하지만 일본에서는 유파 논쟁이 있다(§13.B.5) → 기본 적용, `kr-pil` 은 실획.
- 성별 차등(21·23·29·33·39 등을 여성에게 흉으로 보는 해석)은 어떤 프리셋에서도 기본 끔. 수리 데이터의 `genderNote` 는 점수에 쓰지 않고, 옵션을 켠 경우에만 중립 문구("전통 해석 중에는 …라는 견해가 있다")로 보인다. 근거: 출처마다 범위가 다르고(5자 공통, 일부는 12자) 남존여비 비판이 있다(자룡 바른이름연구소).

## 6. 계산 규칙

### 6.1 획수
- 기본 원획(강희자전 부수 원형 기준). 부수 변형 14종(v1 12종 + 罒→网 6, 耂→老 6)과 숫자 한자는 `radical-variants.csv`.
- 원획 산출: Unihan `kRSUnicode`(부수번호.잔여획) → 강희 부수 원형 획수 + 잔여획(§13.A, `kRSKangXi` 는 15.1 에서 제거됨). 예: 河 85.5 → 4+5=9, 花 140.4 → 6+4=10, 陳 170.8 → 8+8=16, 鄭 163.12 → 7+12=19.
  - 부수 번호가 변형을 구분하므로 月은 肉부(130)일 때만 6, 달월(74)은 4. 王은 玉부(96)일 때만 5.
  - **잔여획 0 이하(부수 글자 자체)는 자형 실획**(王 96.-1 → 4, 玉 5, 水 4) — `radical-variants.csv` 비고, 자문 확인 항목.
  - **Phase 2 수정 — 큰 값 규칙**: `won = 잔여획 ≤ 0 ? kTotalStrokes : max(kTotalStrokes, 원형 + 잔여)`. 부수가 원형보다 길게 쓰인 글자(泰 85.5 → 식 9 / 실획 10, 求 85.2 → 식 6 / 실획 7)는 식이 과소하다. 이런 글자 69자는 `disputes: won-total-exceeds-formula` 로 두 값을 `hanja-pool-review.csv` 에 함께 보인다.
  - 숫자 一~十은 `radical-variants.csv` 수의 획수(四=4…十=10)를 쓰고 `numeral-suui` 태그를 단다. `kr-pil` 은 `pil`(실획).
  - `kRSUnicode` 값이 둘 이상인 49자는 첫 값을 쓰고 `multiple-radical-values` 로 표시한다.
- 표본 25자 실측 일치(2026-10-03): 金8 李7 朴6 崔11 鄭19 河9 柳9 洪10 郭15 閔12 羅20 蔡17 邊22 都16 蘇22 表9 琴13 陸16 王4 玉5 泰10 求7, 복성 南宮19 諸葛31 獨孤25.

### 6.2 4격(원형이정) — 단성 2자 기본식
- 원격 = 이름1 + 이름2 / 형격 = 성 + 이름1 / 이격 = 성 + 이름2 / 정격 = 성 + 이름1 + 이름2 (출처 5곳 일치, 예: 金秉俊 17/16/17/25).
- 81 초과는 −80 환원(82→2). 수리오행 끝자리 1·2 木, 3·4 火, 5·6 土, 7·8 金, 9·0 水(출처 4곳 일치). 홀수 양, 짝수 음.
- 수리오행 배열: 원→형→이→정 인접 관계를 상생 +, 상극 − 로 `suri` 점수 안에서 ±10% 보정한다. 배열 순서·정격 포함 여부를 명시한 출처는 찾지 못해(§13.B.3) **설계 선택**으로 표시한다.

### 6.3 외자·복성 — 가성수 없음

| 구조 | 원격 | 형격 | 이격 | 정격 | 예(원/형/이/정) |
|---|---|---|---|---|---|
| 단성+외자 | 名 | 姓+名 | 姓 | 姓+名 | 鄭雄 12/31/19/31 |
| 복성+2자 | 名1+名2 | 姓1+姓2+名1 | 姓1+姓2+名2 | 전체 | irum 예 16/31/23/35 |
| 복성+외자 | 名 | 姓1+姓2+名 | 姓1+姓2 | 전체 | 南宮錫 16/35/19/35 |

- 복성은 두 글자 획수를 한 단위로 묶는다("일반적으로 쓰이는 방식", sajucode).
- 외자에 가성수 1 을 더하는 것은 일본 구마사키 오격의 규칙이고, 한국 원형이정에 적용한 출처는 찾지 못했다(검색 4회 + 본 세션 보강 검색 3회).
- **출처 수 미달(정직 고지)**: 외자·복성은 서로 독립인 출처가 2개씩(irum·miso 계열 + TAROT 또는 sajucode)이며 반대 출처는 없다. sajucode 는 "문헌에 따라 차이가 있을 수 있다"고 명시한다. → `four-pillars-formulas.csv` 신뢰도 `medium`, **자문 검수 필수 항목**. 복성 형격을 "성 끝 글자 + 名1"로 보는 일본 인격식 해석(대전일보 칼럼, 원문 미확인)은 대안 행으로만 둔다.

### 6.4 삼재·외격 (참고 지표)
- 오격: 천격 = 성(단성 +1) / 인격 = 성 끝 글자 + 名1 / 지격 = 이름 합(외자 +1) / 외격 = 총격 − 인격 / 총격 = 전체(+1 없음). 외격의 +1 처리는 출처마다 다르다(iwahashi: 성·이름 모두 1자면 +2) → 프리셋 옵션.
- 삼재 = 천·인·지격 수리오행 배치 **125조합(5³)**(조사 의뢰 때 가정한 "27조합"은 오류로 확인돼 정정).
- 계통: 구마사키 겐오(熊崎健翁, 1929) 오격부상법이 1940년 창씨개명 때 유입(김만태 2014 KCI), 국내 주류는 원형이정(송진희 2018 KCI), 바이두백과도 삼재를 "후대 편찬·가치 낮음"으로 평가 → **가중 5 의 참고 지표**로만 반영하고 화면에 "참고"로 표시한다.
- **Phase 2 결과**: 기준표 = zhouyi.cc 125조합 원문 전사(meimingteng 은 같은 표 복제라 독립 출처에서 뺌). 독립 대조 = kvov(대만)·cafengshui(대만)·虎の舞(일본) 125조합 전부 + hongjung(한국) 흉 16조합.
  - 등급: 大吉·中吉·吉·吉多于凶·小吉 → good, 吉凶参半·半吉·吉帶凶·凶帶吉 → half, 그 밖(凶多于吉·大凶 등) → bad. 결과 good 64 / half 4 / bad 57.
  - 독립 출처의 1/3 이상이 다른 등급이면 `disputed`(65조합). 가장 많이 갈리는 곳은 kvov 의 吉帶凶(58조합 차이)이다. 삼재는 가중 5 참고 지표라 기준표를 그대로 쓰고 분쟁은 화면 근거에만 보인다.

### 6.5 소리오행
- 초성 기준. 쌍자음은 평음(ㄲ→ㄱ, ㄸ→ㄷ, ㅃ→ㅂ, ㅆ→ㅅ, ㅉ→ㅈ), 모음 초성은 ㅇ. 표기 발음(두음법칙 적용형, 예: 李=이) 기준.
- 인접(성→이름1→이름2) 상생 +, 비화 0(같은 오행 3연속은 −), 상극 −. 상극은 감점만 하고 거부하지 않는다. 보조 지표로 모음 음양·받침 리듬(가중 낮음).
- ㄹ 은 해례에서 반설음으로 따로 분류되나 두 프리셋 모두 설음(火)에 붙인다(`sound-mapping.csv` 비고).

### 6.5b 획수 음양
- 홀수 양, 짝수 음. 3자 이름은 전양·전음만 흉, 섞이면 길(출처 3곳). 외자(2자)는 같은 음양 2자가 흉(miso 許晙 예).
- 복성 규칙은 출처를 찾지 못했다 → 성 두 글자를 각각 세어 전체 글자에 같은 규칙(전부 같으면 흉)을 적용하는 **설계 선택**, 자문 확인 항목.

### 6.6 자원오행
- 공식 자원오행표는 없다. Phase 2 는 성명학 관행 출처 16곳(`raw/jawon-sources.json`)의 부수→오행 배속을 **투표**로 모았다(`rules/jawon.json`).
  - 투표 출처 12곳(국내 7·중국 5): 출처마다 한 부수에 한 표. 다중 배속 규칙은 표가 아니고, 한 출처가 같은 부수에 서로 다른 단일값을 주면 기권. 최다 득표를 택하고 동률은 김만태 → 안태옥 → 한국작명원 → 주역작명원 순서로 가른다.
  - 참고 전용 4곳(일본 kseimei, 음운 기반 kangxizidian, 필획 형태 meimingteng·chachaqiming)은 표에 넣지 않고 `jawon-radicals-review.csv` 참고 열에만 보인다.
  - 신뢰도: 3표 이상 전원 일치 0.9 / 2표 일치 0.8 / 4표 이상·3/4 이상 다수 0.7 / 1표 0.6 / 그 밖의 불일치 0.5(`disputes: jawon-sources-differ`).
- 자의(字意) 규칙이 부수보다 앞선다: 천간·지지 22자(0.9), 방위 東南中西北(0.8), 오상 仁禮信義智(0.8). 각 글자는 raw 출처의 글자 단위 규칙과 같아야 빌드가 통과한다. 숫자 一~十은 河圖 생성수와 후천수가 갈려 넣지 않았다.
- 우선순위: 자의 > 검수자 부수 판정(`radicalOverrides`, 1.0) > 부수 투표. 검수자 글자 판정(`hanja-review-decisions.csv`)은 `reviewer`.
- Phase 2 결과(9,107자): 부수 8,685 · 자의 32 · 미분류 390, 저신뢰(<0.7) 1,869(그중 불일치 600). 강희 부수 214개 중 미분류 47 · 1표 79 · 불일치 8.
- LLM 보조 분류(미실행, 비용 추정): 미분류 390 + 저신뢰 1,869 = 2,259자, 50자씩 46콜. gemini-2.5-flash 단가(`config/llm-tariffs-20260921.json`)로 1회 약 $0.43(입력 12만·출력 6.3만·thinking 9.4만 토큰, 약 690원), 독립 2회 교차에 여유 1.5배를 더해 **약 2,100원**. 실행은 별도 1회 승인 후에만 한다. LLM 값은 `jawonBasis: "llm"`·신뢰도 0.6 상한으로 넣고 두 회차가 일치한 글자만 쓰며, 자문 검수 전에는 상위 5개(무료 노출)에서 뺀다.
- 신뢰도 0.7 미만·미검수는 추천 순위에서 하향, `disputes` 가 있는 글자는 상위 5개(무료 노출)에서 제외.

### 6.7 사주 연동
- 래퍼 `saju-input.ts` 가 `worker/lib/saju-snapshot-from-birth.js` `buildSajuSnapshotFromBirth`(메인 사주 정본: `calcPower`·`analyzeJohu`·`detectJong`·`applyRuntimeYongshinPolicy`)를 import 만 한다.
- 필요 오행 = `power.yongshin`(최종 용신), 기피 오행 = `power.kijishin`. 보조 = 용신을 생(生)하는 오행(`parentOf`) — 정본 함수의 정의를 적용한 파생이며 재계산이 아니다. 종격 후보(`jong.isJong`)이면 결과에 "조건부" 고지.
- 시간 미상은 정본 경로 그대로 3주 계산(`timeUnknown`), 결과 상단과 LLM 입력에 "시주 미확정" 신뢰 하향을 명시한다.
- v1 저장 결과의 용신 값은 다시 계산하지 않는다(레거시 렌더러가 저장값을 그대로 표시).

## 7. 점수 모델 (초안, `config/weights.ts`)

| 항목 | 가중 | 세부 |
|---|---|---|
| 사주 보완 `saju` | 35 | 자원오행이 용신 20 / 보조 10 / 기피 회피 5 (기피 오행 글자는 −) + 8자+이름 분포 개선 보정 |
| 수리 `suri` | 25 | 정격 9 · 원격 7 · 형격 6 · 이격 3. 길 1.0 / 반길 0.5 / 흉 0. 수리오행 배열 ±10% 보정(§6.2) |
| 소리오행 `sound` | 15 | 인접 관계 2쌍 + 3연속 감점 |
| 어감·실용 `practical` | 15 | 발음 난이도, 받침 연속, 성+이름 연결, 동음 블랙리스트, 흔한 이름 중복, 이니셜. 불용 관행 글자는 소폭 감점 + 경고 |
| 삼재 `samjae` | 5 | 125조합 등급(참고) |
| 획수 음양 `yinyang` | 5 | 전부 양·전부 음 감점 |

- 하드 필터(점수 이전 제외): 인명용 풀 외, 정격 흉, 사용자 기피 글자, 고정 글자 위반, 동음 블랙리스트 중 비하·욕설·질병 등급.
  - 불용한자는 **차단하지 않는다**: 목록이 출처마다 73~301자로 다르고, 학술 연구가 "불용문자는 존재하지 않는다고 할 수 있다"고 결론낸다(권익기·김만태 2018 KCI). 경고 + `practical` 소폭 감점만.
- **후보 부족 시 단계적 완화**(원칙 17 — 결과가 안 나오는 것이 최악): 후보가 무료 5 / 유료 12 에 못 미치면 ① 원격·형격 흉 허용(감점 유지) → ② 정격 반길 허용 → ③ 자원오행 신뢰도 하한 해제 순으로 풀고, 완화 단계를 결과에 표시한다. 정격 흉은 끝까지 풀지 않는다.
- 각 항목은 0~1 로 정규화한 뒤 가중합(0~100). 근거 키(`reasonKeys`)를 항목마다 남긴다.

### 7.1 Phase 3 구현 편차 (정본: `worker/naming-engine/config/weights.ts`)

- **사주 점수**: 글자 하나 = (용신 20·적중 + 보조 10·적중 + 기피 회피 5·(1 − 2·기피 적중)) / 25 → 용신 1 · 보조 0.6 · 중립 0.2 · 기피 −0.2.
  적중은 자원오행 신뢰도 가중 min(1, confidence / 0.7). 이름 = clamp01(글자 평균 + 분포 보정), 분포 보정 = 원국에 없던 오행(기피 제외)을 채우는 글자 오행 1개당 0.05, 최대 0.1.
  초안의 분모 35 는 "각 항목 0~1 정규화"와 어긋나 25 로 바꿨다.
- **어감·실용** = clamp01(1 − 감점 합): 불용 관행 1계열 0.05 · 2계열 이상 0.1, 확장 A 0.3, 확장 B 이상 0.5, 기초한자 밖 0.05,
  이름 첫 음절 ㄹ 0.1(신규), 같은 음절 반복 0.1, 성·이름 전부 받침 0.05, 동음 블랙리스트 경고 0.5. 발음 난이도·흔한 이름 중복·이니셜은 근거 데이터가 없어 미구현.
  **자연스러움(Phase 5, 2026-10-04)**: 이름 사용 빈도(`name-usage.v1.json`, Wikidata CC0 대한민국 국적 인물 4.7만 명 집계)로 감점 = 최대 × (1 − min(1, ln(1+사용)/ln(1+30))).
  글자(그 음으로 이름에 쓰인 횟수) 최대 0.15, 음절(그 자리 — 첫째·둘째, 외자는 두 자리 합) 최대 0.05. 사용 3회 미만 글자는 `practical.<k>.rare-in-names`.
  가중치(35·25·15·15·5·5)는 그대로 — 새 축이 아니라 어감·실용 안의 감점이다. 도입 전 실측: 후보 1,054개 중 728개(69%)가 100점 → 도입 후 92개(8.7%).
- **뜻 거르기(신규 하드 필터, 자문 검수 대상)**: 그 음의 첫째 훈 뜻풀이 말이 부정 뜻 목록(67어)이면 어느 단계에서도 추천하지 않는다.
  반대 성별 호칭(남자 이름에서 13어, 여자 이름에서 7어 — 妻·娘·夫 등)도 같다. 성별 미정(N)에는 성별 필터가 없다. 사용자 고정 글자는 면제.
- **완화 단계**: 0 엄격(정격 길, 원·형격 흉 아님) → 1 원·형격 흉 허용 → 2 정격 반길 허용 → 3 훈 없는 글자 · 자원오행 미분류 또는 신뢰도 0.5 미만 · 무료 티어의 분쟁 글자 허용.
  앞 단계 후보를 먼저 두고 부족분만 다음 단계에서 채운다. 완화로 들어온 후보에는 `relaxed.stage-N` 키, 결과에는 같은 고지. 정격 흉은 끝까지 막는다.
  무료는 근거 서술이 없어 분쟁 글자를 엄격 단계에서 뺀다(예: 俊 `jawon-sources-differ`·신뢰 0.5 — 돌림자로 고정하면 쓸 수 있다).
- **외격**: 단성 외자는 총격 − 인격 = 0 이 되어 `null`(§6.4 출처별 처리 상이).
- **성씨**: KOSIS 표(509성) 밖 성은 인명용 풀 획수로 계산하고 `surname.pool-strokes` 고지 — §10 "성씨 데이터 안에서만"과 다르다. API 에서 막을지 Phase 4 에서 정한다.
- **순한글 이름 모드**: `mode-unsupported` 로 거부(Phase 4 결정).
- **법원 내부 코드 글자**(basis `adjudicated`·`law-basic-edu`, 17자): 점수 영향 없이 `char.<k>.court-code-variant` 태그만.
- **근거 키**(`<k>` 는 이름 글자 위치, 0부터): `suri.<격>.<등급>` · `samjae.<등급>[.disputed]` · `sound.<k>.<관계>` · `saju.<k>.useful|support|caution|neutral.<오행>` · `saju.<k>.unclassified` ·
  `char.<k>.low-confidence|disputed|court-code-variant|no-hun` · `practical.<k>.buryong|rare-in-names` · `saju.fills-missing` · `yinyang.uniform` · `practical.initial-rieul` ·
  `practical.blacklist-<등급>` · `sound.school-sensitive`(다른 학파 매핑이면 소리오행 배열이 바뀜) · `relaxed.stage-N`.
- **결과 고지 키**: `samjae.reference-only`(항상) · `saju.time-unknown` · `saju.jong-conditional` · `surname.pool-strokes` · `sound.school-differs` · `relaxed.stage-N` · `candidates.short`.
- **오류 코드**: `input-invalid` · `mode-unsupported` · `preset-unknown` · `avoid-too-many` · `fixed-char-unknown` · `fixed-char-avoided` · `fixed-char-reading` · `surname-invalid` · `surname-unknown` · `saju-unavailable` · `data-schema`.
- **한자 입력 NFC**: 성·돌림자·피할 글자는 NFC 로 맞춘 뒤 찾는다. 한글 IME(KS X 1001)는 金(김)·李(리)를 CJK 호환 한자(U+F90A·U+F9E1)로 내기도 하는데, 풀 키는 통합 한자다(호환 영역 키 0자, 실측). 공개 예시 54건 중 24건이 호환 한자로 적혀 있었다.
- **골든 편차(잠정 골든 45건에서 뺀 12건)**: 공개 해설 54건(+앵커 3) 중 엔진과 다른 값은 모두 출처끼리 갈리는 값이라 기대값에서 뺐다.
  - 외자 형·이격: nameclub 3건은 형=姓·이=姓+名(엔진·TAROT·goodnaming 은 형=姓+名·이=姓), 鄭新 1건은 형=이. §6.3 식 유지.
  - 원획: 泰 9(엔진 10, `won-total-exceeds-formula`)·延 7(엔진 8, 같은 표시)·熙 13(엔진 14, 강희 火部 10획)·貞 8(엔진 9, 출처 오기 추정)·九 2(엔진 9, `numeral-suui` 수의)·奫 15/16 병기(엔진 15).
  - 金志訓 정격 23 은 출처 산술 오류(8+7+10=25). mbgg 복성 南宮仁洙 인격 23 = 성 합+名1(엔진 §6.4 는 성 끝+名1 = 14).
  - 자문 검수 때 위 획수 6자를 우선 본다. 月(肉)·罒·耂·犭 부수 이름, 諸葛·鮮于·司空·獨孤 계산 예시는 찾지 못했다.

## 8. 탐색·성능

1. 성 원획이 정해지면 이름 획수 쌍 (a, b) 중 4격이 모두 하드 필터를 통과하는 쌍만 먼저 계산한다(획수 1~30 기준 최대 900쌍).
2. 통과한 획수마다 `(획수, 자원오행)` 인덱스로 글자 목록을 꺼낸다. 고정 글자·기피 글자를 반영한다.
3. 조합을 점수화하고 상위 K(=200)를 남긴 뒤 MMR 로 다양화한다. 유사도 = 같은 글자 공유 + 같은 첫 음절 + 같은 소리오행 패턴. 무료는 상위 5개, 유료는 상위 12개를 쓴다.
4. 동점은 `hash(inputHash + 후보)` 로 결정론 정렬한다(난수 없음).
- 예산: 요청당 CPU 50ms 이하 목표(Phase 3 실측). 데이터 번들 증가 gzip 600 KiB 이하(`npm run build:worker && npm run verify:worker-size`).
- 큐는 쓰지 않는다. 계산은 동기로 하고, LLM 서술은 기존 웨이브 패턴(요청당 1파트 + Mongo 체크포인트 + 리더 + 10분 크론)을 그대로 쓴다.

### 8.1 Phase 3 실측 (2026-10-03, 개발 PC Node 24 — Workers CPU 는 추정)

- 탐색 구현: 2자 이름은 (획수, **소리오행**) 칸마다 rank = 35·사주 − 15·감점 상위 10글자만 조합한다(설계 2단계의 자원오행 인덱스 대신 소리오행 —
  소리 점수가 칸 단위로 정해지고 자원오행은 rank 에 이미 들어 있다). 칸 쌍 점수 상한으로 가지치기하고, 동음 블랙리스트는 상위 K 에 들 조합에만 늦게 확인한다.
  상위 200 을 `scoreCandidate` 로 처음부터 재계산하고(빠른 경로와 1e-9 일치를 테스트가 본다) MMR(λ 0.7, 돌림자 자리는 유사도에서 뺌) 후 단계별 총점순으로 놓는다.
- 동점: 글자 시드 = fnv1a(inputHash | 글자 + 음), 조합 tie = 두 시드 섞기. inputHash 는 티어·로케일을 넣지 않아 무료 → 유료 전환에도 같은 순서다.
- CPU(63 입력 × 무료·유료 = 124회): 엔진 웜 중앙 21.5ms · p95 34.8ms · 최대 52.0ms(첫 호출). 사주 래퍼 중앙 1.6ms · p95 3.9ms.
  데이터 디코드 5~15ms(아이솔레이트당 1회). 단계별 중앙: 글자 단위 생성 5.1 · 탐색 7.1 · 재계산 2.1 · MMR 4.6ms.
  최적화 1회: 첫째 훈 파싱 메모 + FNV 접두 시드 재사용으로 글자 단위 생성 17 → 5ms(출력 동일).
- **점수 포화(미해결)**: 후보 1,054개 중 728개(69%)가 100점이라 상위 순서가 tie 해시로 정해지고, 뜻은 멀쩡해도 이름으로 어색한 조합(賣錢 매전·辨除 변제 등)이 오른다.
  원인은 이름 자연스러움(이름 음절 빈도·성별 경향) 데이터 부재다. 화면 노출(Phase 4·5) 전에 정해야 한다.

## 9. LLM 역할과 환각 방지

- 입력: 엔진이 확정한 후보 JSON(한자·훈음·획수·4격·오행·점수·근거 키) + 사주 요약. 이름 생성 지시는 없다.
- 출력: 이름별 `{ meaning, sajuSupport, soundFeel, letter }` + 장(章) 서술, 엄격한 JSON.
- 대조기(코드): 출력 속 CJK 글자는 (후보 한자 ∪ 사주 간지 ∪ 오행·격 명칭 허용 목록)만 허용하고, "N획"·"N수"·격 수치는 엔진 값과 일치해야 한다.
  불일치 문단은 1회 재생성, 그래도 틀리면 **그 문단만 결정론 문구로 교체**한다. 보고서 전체를 실패시키지 않는다(CLAUDE.md 원칙 17).
- 금지 표현 검사: 운명 단정, 공포, 의학·재물 보장, 특정 이름 비하. 흉수는 "유의점 + 보완 방법"으로 쓴다.
- 고지(문구 키): 성명학은 전통 해석 체계이며 참고용 / 출생신고는 인명용 한자만 가능.
- 검증은 mock 기본. 실호출은 사용자의 정확한 1회 승인 뒤에만 하고, 생성 원문 전체를 검수용으로 전달한다.

## 10. API

| 메서드·경로 | 용도 | 비고 |
|---|---|---|
| POST `/api/naming-prompt/basis` (신규) | 무료 엔진 상위 5개 | LLM 0콜. 로그인 불필요. 기존 `basis` 보안 버킷(분당 30회)을 재사용한다 — 새 접미사를 만들면 보안 계층이 그 경로를 버킷 미분류로 막는다 |
| POST `/api/naming-prompt/checkout` | 기존 | 입력 스키마 확장(성 한자, 모드, 프리셋, 고정·기피 글자) |
| POST `/api/naming-prompt/generate` | 기존 웨이브 | 새 실행은 `NAMING_ENGINE_VERSION` 에 따라 v2 경로. 1차 LLM "후보 생성" 단계를 엔진 계산으로 교체 |
| GET `/api/naming-prompt/result/:id` | 기존 | `engineVersion` 이 없으면 v1 레거시 직렬화 |

- 입력 검증: 성 한자는 성씨 데이터 안에서만, 이름 글자 수는 법정 상한(§13 근거) 이하이면서 엔진 탐색은 1~2자, 기피 글자는 최대 20자.
- 멱등성: 기존 `inputHash`·`executionId` 규칙을 유지하고 새 입력 필드를 해시에 포함한다(locale 제외 유지).

## 11. 화면·에셋 (Phase 5 범위 요약)

- 흐름: 성 한자 선택 → 출생 정보 → 선호·기피 → 모드·학파 → 사주 오행 요약 → 추천 카드 → 이름 상세(획수 분해·원형이정 4기둥·삼재·소리오행 흐름선·오행 다이어그램·점수 레이더) → 비교(2~3개) → 작명서 저장.
- 에셋 A1~A9 는 직접 그린 SVG/CSS 로 만든다. 색은 `--cd-*` 와 달빛 예화 토큰(`--cd-yehwa-line`, `--cd-yehwa-ivory`)만 쓴다. 오행 색에는 글자를 함께 표기하고, `prefers-reduced-motion` 에 대응한다.
- 한자 서체(실측 2026-10-03): 브랜드 세리프 `CodeDestinySerifKR`(나눔명조 Google 청크)는 CJK 통합 한자 **349자**·호환 114자만 덮는다.
  나머지 한자는 `CodeDestinyHan`(OS 로컬 산세리프)으로 폴백한다.
  → `scripts/build-serif-font-assets.mjs` 와 같은 방식으로 Noto Serif KR(OFL)을 R2 청크로 올린다. 인명용 풀 전체 커버리지는 Phase 5 에서 실측하고, 미커버 글자는 폴백한다.
- 저장 이미지: 클라이언트 `html-to-image`(`components/fortune/PremiumResultShare.tsx` 선례). OG 는 기존 `workers-og` 를 쓴다.

## 12. 검수 절차와 CSV

| 파일 | 행 | 내용 | 검수 열 |
|---|---|---|---|
| `suri-81.csv` | 81 | v1 등급 · v2 제안 등급 · 출처 분포 · `disputed`/`change-proposed` · 성별 주석 | `review_grade`, `review_note` |
| `four-pillars-formulas.csv` | 6 | 단성·복성 × 2자·외자 4격 식, 일본식 대안, 오격(참고) · 신뢰도 · 출처 | `review_formula`, `review_note` |
| `radical-variants.csv` | 24 | 부수 변형 14 + 숫자 한자 10 → 원획 · 조건 | `review_strokes`, `review_note` |
| `sound-mapping.csv` | 19 | 초성 → 오행(운해본·해례) | `review_note` |
| `samjae-125.csv` | 125 | 천·인·지 오행 125조합 — **등급 칸은 비어 있음**(Phase 2 원문 전사) | `review_grade`, `review_note` |
| `sources.csv` | 24 | 표별 출처 URL | — |
| (Phase 2 생성물, `data/naming/review/`) | | | |
| `hanja-pool-diff.csv` | 490 | 명단 원천(크롤·efamily·Unihan E/N) 대조 차이와 포함·제외 사유 | `review_decision`, `review_note` → 확정분은 `rules/pool-adjudication.json` 으로 옮긴다 |
| `hanja-pool-review.csv` | 3,916 | 원획 분쟁·훈 없음·숫자 수의·자원오행 저신뢰/미분류 | `review_won`, `review_jawon`, `review_note` |
| `jawon-radicals-review.csv` | 214 | 강희 부수별 투표 결과·참고 출처·풀 글자 수 | `review_element`, `review_note` |
| `suri-81-review.csv` | 81 | 적용 등급과 출처별 원 라벨 | `review_grade`, `review_note` |
| `samjae-125-review.csv` | 125 | 기준표 등급과 독립 출처 라벨 | `review_grade`, `review_note` |
| `surnames-review.csv` | 24 | KOSIS 성씨 중 제외한 표기와 사유 | `decision`, `reason` |

- CSV 는 UTF-8 BOM(엑셀 한글 표시용). 수치는 WebFetch 요약기 추출을 거친 값이 섞여 있어 **바꾸는 수(28·38·59)와 승격 검토 수(73·75)는 사람이 원문 페이지와 대조**한 뒤 확정한다(조사 B 권고).
- 삼재 등급은 요약기 추출값을 쓰지 않는다. Phase 2 에서 zhouyi.cc 전체표를 원문 전사하고 yishengmi 大吉·大凶 40 + 바이두 표본과 대조한다.
- 검수 결과는 CSV 를 다시 받아 `scripts/naming/` 빌드가 반영한다. 검수자의 판정이 출처보다 우선하며, `reviewed=true` 와 판정 사유를 남긴다.
- 골든 테스트: 자문가가 검수한 성명 예시 20건 이상을 `__tests__/` 기대값으로 고정한다(Phase 3).
  Phase 3 는 자문 검수 전이라 공개 해설 45건(4격 39·획수만 6, 그중 삼재 천인지 3)을 **잠정** 기대값으로 `__tests__/ui/naming-engine.test.mjs` 의 `GOLDEN` 에 고정했다. 출처가 갈려 뺀 12건은 §7.1 골든 편차. 검수 결과가 오면 교체한다.

## 13. 근거 조사 (출처 교차)

표기: **[확인]** 원문 열람·파일 실측 / **[2차]** 2차 출처 / **[추정]** 추론. 조사일 2026-10-03.

### 13.A 인명용 한자 데이터

**법적 범위 [확인]**
- 「가족관계의 등록 등에 관한 규칙」 제37조(law.go.kr, MST=272659): ① 이름 한자 = 교육부 한문교육용 기초한자 + 별표1(인명용추가한자표), ② 동자·속자·약자는 별표2(인명용한자허용자체표)만, ③ 범위 밖이면 한글로 기록.
- 별표1·2 "<개정 2024. 5. 30.>". 최신 규칙 개정(대법원규칙 제3220호, 2025-07-19 시행)은 별표와 무관.
- 총 9,389자(2024-06-11 시행, 8,319 + 1,070) — 대법원 보도자료 2024-05-23(scourt.go.kr NewsViewAction seqnum=2642). **풀 크기는 코드에 하드코딩하지 않는다.**
- 표 주석(원문): "위 한자는 이 표에 지정된 발음으로만 사용할 수 있다. 그러나 첫소리가 'ㄴ' 또는 'ㄹ'인 한자는 각각 소리 나는 바에 따라 'ㅇ' 또는 'ㄴ'으로 사용할 수 있다." / "'示'변과 '礻'변, '++'변과 '卄'변은 서로 바꾸어 쓸 수 있다."
  → 엔진은 **지정 음만** 허용하고, 두음 변형(ㄴ→ㅇ, ㄹ→ㅇ·ㄴ)은 이 주석 규칙으로 파생한다(LLM·사전 추정 금지).

**이름 글자 수 [2차]** 성 제외 5자 초과 시 출생신고 불수리(가족관계등록예규, easylaw.go.kr). 예규 원문은 미열람.
→ 입력 검증 상한 5, 엔진 탐색은 1~2자.

**공식 파일은 기계 판독 불가 [확인·실측]** 별표1 HWPX(law.go.kr BYL `law0105692024053003151KC_000100E.hwpx`)를 풀면 한자가 **BMP 이미지 7,267개**이고 텍스트 한자는 주석 15자뿐. 별표2 PDF 도 한자 자리가 빈 괄호. XLS 등 기계 판독본은 찾지 못함(law.go.kr 별표·보도자료 첨부·efamily 확인 범위).
실질 조회 정본은 전자가족관계등록시스템 「인명용 한자 조회」(efamily.scourt.go.kr).

**공개 크롤 데이터 실측 [확인]** rutopio/Korean-Name-Hanja-Charset(MIT, efamily 크롤) `data-gov.csv`:
- 10,163행 → 고유 코드포인트 9,460(URO 8,786 · 확장A 218 · 그 밖 456), 복수 음 863자.
- **누락**: Unihan `kHangul` 이 교육용(E)·인명용(N)으로 표시한 글자 중 53자가 없다 — 能·農·怒·腦·努·奴·濃·港·姬 등 흔한 글자 포함, '눈' 음은 0건(크롤 누락으로 추정).
- **비유니코드 코드**: 405행이 미할당 평면 값(0xA0xxx)이라 그대로는 렌더링·입력 불가.
- 9,460 과 9,389 의 차이 원인은 미확인.
→ **결론: 어떤 단일 원천도 그대로 정본이 될 수 없다.** Phase 2 에서 아래를 대조해 차이 보고서(`hanja-pool-diff.csv`)를 만들고, 불일치는 efamily 조회로 사람이 판정한다.
  1. 크롤 데이터(MIT, 출처 고지)
  2. Unihan `kHangul` E·N 플래그
  3. 2024 추가 1,070자 보도자료 PDF(이미지 → 표본 대조)
  4. efamily 조회 표본 검증

**Phase 2 efamily 재수집 [확인·실측, 2026-10-03]** (`raw/efamily-recrawl.csv`, 요청 998건·간격 1.1초 이상·403/429 0건)
- 엔드포인트 `GET /webhanja/whjsearch?mode=listUnicodeByKsnd&ksnd=<음절 hex>&ext=0` — `ext=0` 은 인명용(isin=1)만 돌려준다.
- 53자 누락 원인: rutopio 크롤러가 결과 0건이면 그 자음 묶음 반복을 끝낸다(`else: break`). '냥'이 0건이라 ㄴ 묶음 나머지 24음(녀…닐)이 2024년에 조회되지 않았다. 같은 break 동작을 재현하면 블록 463개로 rutopio 와 일치한다.
- 결과: 음 527개 조회 → 10,383행, 고유 코드 9,495(표준 유니코드 9,090 · 내부 A 코드 377 · 사설 F 코드 28). 음과 무관한 획수별 나열로 교차 확인해 집합이 같다.
  - rutopio 대비 새 글자 35(ㄴ 음 32 · 妞 · 慉 · 貀), rutopio 에만 있는 글자 0.
  - 港·姬 는 표준 코드가 인명용이 아니다(isinmyung=0). 법원 시스템은 港을 F 코드 `f153f`, 姬 꼴을 A 코드 `a0050` 글리프로만 싣는다. A·F 코드는 웹폰트에도 없고 스프라이트 이미지로만 보인다.
- 풀 포함 규칙(fail-closed, `build-pool.mjs`): 크롤 ∪ efamily 표준 코드 ∪ Unihan E(교육용 기초한자) ∪ `pool-adjudication.json` include. Unihan N 만 있고 어디에도 없는 글자, A·F 코드는 제외하고 `hanja-pool-diff.csv` 에 사유를 남긴다.
- 결과 9,107자 = 크롤 9,055 + efamily 35 + 교육용 기초한자 2(港 — 규칙 제37조 ① 기초한자라 표준 코드로 포함, 𮕩 쇠:E — Unihan 표시만 근거라 검수 항목) + 1차 판정 15.
  - 1차 판정 15자(𠦄 𩇕 𬄕 𬟓 𰜩 㴗 䚾 冕 姬 慜 湊 珊 睾 籩 韌): Unihan N 전용 19자마다 같은 음의 A·F 코드(isin=1) 32px 글리프를 대조해 같은 글자로 본 것. 䚾 은 32px 로 壬·𡈼 를 가릴 수 없고, 𬟓 는 두 코드(a026c·f17b8)가 같은 글자다. 자문 검수 전이다.
  - A·F 코드의 획수 열은 자형과 어긋난 값이 있어(慜 26 ↔ 15, 湊 21 ↔ 13) 쓰지 않고 획수는 Unihan 으로 계산한다.
  - 제외 4자(𡅕 𧅄 㘽 朊): 같은 음 후보 글리프가 다른 글자이거나 후보가 없다. 기초한자 1,800 전부 포함, 원획 100%.

**Unicode Unihan 18.0 [확인]** (UAX #38 Rev.41, 데이터 2026-07-31)
- `kRSKangXi` 는 **15.1.0 에서 제거**(18.0 데이터 0건) → 원획은 `kRSUnicode`(부수번호.잔여획, 18.0 에서는 `Unihan_IRGSources.txt`) + 강희 부수 원형 획수로 계산한다. 예: 河 `85.5` → 水 4 + 5 = 9.
- `kTotalStrokes` 는 IRG 필획 관례(河 8)라 **원획이 아니다** — 필획 프리셋에서만 참고.
- `kHangul` 문법 `:[01ENX]`(E=교육용, N=인명용)이나 인명용 표시는 2015·2018 년분까지만(`kKoreanName`), 2022·2024 추가분 미반영(UAX #38 본문).
- 라이선스: Unicode License v3 — 상용 배포 가능, 저작권·허가 고지 동봉.
- 실측: 크롤 9,460자 중 `kRSUnicode` 미보유 405자(= 위 비유니코드 코드), `kHangul` 미보유 1,406자.

**훈(뜻) [확인]**
- libhangul `hanja.txt`(파일 헤더 BSD-3-Clause, Copyright 2005,2006 Choe Hwanjin): 크롤 9,460자 중 **7,169자(75.8%)** 보유. **1순위.**
- 표준국어대사전 CC BY-SA 2.0 KR · Wiktionary CC BY-SA 4.0 은 동일조건(SA) 부담 → 쓰지 않는다.
- 크롤 `data-naver.csv`(네이버 사전 크롤)는 원 콘텐츠에 MIT 가 적용되지 않으므로 쓰지 않는다. vght103/korean-naming-engine(라이선스 없음)·rycont/hanja-grade-dataset(라이선스 없음)·NeoMindStd/HanjaDB(입력이 GPL 추정)도 제외.
- 누락 약 2,300자의 훈은 자체 작성 + 자문 검수(`hun_source: "self"`).

**자원오행 [2차]** 공식 출처 없음(Unihan·별표 어디에도 오행 필드 없음). 관행은 부수 우선, 부수가 오행과 무관하면 뜻으로 판정하며 "통일된 자원오행표는 없다"(sajucode.blog/jawon-ohaeng-naming). 원획은 강희자전 기준(brunch.co.kr/@name/34).
→ 화면에 "성명학 관행에 따른 분류"로 고지하고 판정 근거(`jawonBasis`)를 함께 보여 준다.

### 13.B 성명학 규칙

숫자표는 WebFetch 요약기가 뽑은 값이라 추출 오류 가능성이 있다(조사 중 2건 발견: yesname 阝 좌우, knaming 王 6). 출처 URL 은 `sources.csv`·각 CSV 에 있다.

**13.B.1 4격 식** — §6.2·§6.3. 단성 2자는 5곳(irum, miso, sajucode, TAROT 카페, 산신각 카페) 일치. 외자·복성은 독립 출처 2곳씩 일치, 반대 출처 없음 → 3곳 기준 미달을 자문 검수로 보완한다.

**13.B.2 81수리** — 국내 8곳(irum·miso 계열, TAROT, 덕밍, aoma, Jangds, sajuabc, kimtaku) + 일본 2곳(kseimei, fukucalendar) 비교.

| 수 | v1 | 출처 분포 | v2 제안 |
|---|---|---|---|
| 38 | 반길 | 국내 8곳 모두 吉, 日 fuku 만 半吉 | **길** |
| 28 | 반길 | 전부 凶(kseimei 大凶) | **흉** |
| 59 | 반길 | 전부 凶 | **흉** |
| 26·27·51·58·71 | 반길 | 길흉 혼재 | 반길 유지(`disputed`) |
| 73·75 | 반길 | 吉 5 · 中吉 2 | 반길 유지, 길 승격 검토 |
| 30·49·77·78 | 흉 | 吉 계열과 凶 반반 | 흉 유지, 반길 후보 |

- 등급은 3단계(길·반길·흉)로 고정한다. 大吉·中吉 세분은 출처마다 달라 근거가 약하다.
- 격 이름(1 태초격/기본격, 21 수령격/자립격/두령격 등)도 출처마다 다르다 → 표시용 이름은 한 출처로 고정하고 자문이 정한다(결정 항목).
- 일본 원류(fuku)는 26~28·51·58·59·71·73·75 를 모두 凶으로 둔다. v2 는 국내 실무 분포를 따른다.

**13.B.3 수리오행·음양** — 끝자리 매핑은 4곳(namesoft, cobl, 김만태 namestory, 바이두백과) 일치. 배열 판정 순서는 출처 없음(설계 선택). 음양은 전양·전음만 흉(TAROT, miso, namestory), 외자 2자 동일 흉(miso), 복성 규칙 없음(설계 선택).

**13.B.4 오격·삼재** — 공식은 바이두백과·iwahashi·fortunade 일치, 외격 +1 처리는 상이. 유입사: 김만태 2014 KCI. 국내 주류는 원형이정: 송진희 2018 KCI. 삼재 125조합 전체표: zhouyi.cc, 대조: yishengmi(大吉 20·大凶 20 일치), 바이두 표본 4.

**13.B.5 부수 원획** — knaming, 사주포럼, yesname, meimingteng(중). 氵4 扌4 忄4 犭4 艹6 辶7 礻5 衤6 은 3~4곳 일치. 阝 좌 阜8·우 邑7, 月(肉)6, 王(玉)5 는 조건부. 罒网6·耂老6 은 3곳(v1 에 없어 추가). 刂·攵·灬·牜 는 필획=원획이라 무해, 冫·尢·歹 은 독립 부수라 변환 없음.
숫자 한자 수의 규칙은 knaming·meimingteng 적용, 일본에서는 1913년 林充胤 의 "數意派" 규칙으로 실획파와 논쟁(note.com) — 모든 유파 공통이 아님.

**13.B.6 소리오행** — 해례 제자해 원문(위키문헌): 「喉邃而潤，水也」「脣方而合，土也」, 아음 木·설음 火·치음 金. 실무 운해본식 기원: 신경준 『훈민정음운해』(1750)가 『홍무정운』 자모도를 참고하며 배속을 바꿈(위키백과). 실무 보급: 사주포럼("다수설" vs 해례 "소수설"), 갑술작명("대세"), mumyeong. 학술: 이재승 2019 KCI(해례 표준론), 김만태(해례 기반).

**13.B.7 불용한자** — aoma 카페(73자), cobl, htype 블로그(301자) 등 목록 크기와 사유가 제각각(예: 末·吉·福·光·大·長·女·花·甲·馬). 권익기·김만태 2018 KCI: 불용문자의 84% 가 문헌에 쓰였고 조사한 지도자의 40.6% 가 사용 → "불용문자는 존재하지 않는다고 할 수 있다". → 차단 없이 경고(§7).

## 14. 교체 전략과 위험

- 순서: 데이터(Phase 2) → 엔진 + 단위·속성 테스트(Phase 3) → 무료 엔드포인트·유료 웨이브 v2·대조기(Phase 4) → 화면·에셋(Phase 5) → 스테이징 검증·운영 승격 1회 승인(Phase 6).
- 의도적으로 갱신해야 하는 고정물: `naming-prompt.ko.golden.txt`, `naming-paid-delivery.test.js`(9콜 → v2 호출 수), `scripts/verify-naming-prompt-flow.mjs`(`RESULT_VERSION`·카드 파서), `.github/workflows/paid-flow-gates.yml` 대상.
- 진행 중 v1 실행은 v1 경로로 끝까지 재개한다(실행 레코드의 버전으로 분기). 저장 결과는 덮어쓰지 않는다.
- 스테이징 LLM mock 은 `usable()` 이 거부해 완주하지 못한다(`worker/lib/naming-report-delivery.js:29`). v2 는 mock 응답을 대조기 통과 형태로 받는 테스트 경로를 Phase 4 에서 별도로 정의한다.
- 롤백: `NAMING_ENGINE_VERSION` 을 되돌리는 revert 1커밋. 데이터·엔진 모듈은 import 되지 않으면 무해하다.

위험 목록:

| 위험 | 영향 | 대응 |
|---|---|---|
| 한자 명단 정본 부재(공식 파일은 이미지, 크롤 9,460 ≠ 고시 9,389, 누락 53·비유니코드 405) | 쓸 수 없는 글자 추천 또는 누락 | §13.A 4원천 대조 `hanja-pool-diff.csv` + 사람 판정. 판정 전 글자는 후보에서 제외(fail-closed) |
| 외자·복성 식은 독립 출처 2곳씩 | 학파 이견 시 신뢰 하락 | `confidence: medium` 표시 + 자문 검수 전 결과 화면에 "학파별 차이" 고지 |
| 81수리·삼재 수치 일부가 요약기 추출값 | 잘못된 등급 반영 | 바꾸는 수·삼재 전표는 Phase 2 에서 원문 대조 후 반영, 대조 기록을 `sources` 에 남김 |
| 자원오행은 공식 데이터 없음 | 품질이 자문 검수에 좌우 | 규칙 분류 + `confidence`, 저신뢰는 점수 가중 하향, LLM 보조 분류는 별도 1회 승인 |
| 용신 정본을 메인 사주(d)로 전환 | 같은 명식의 v1·v2 용신이 다를 수 있음 | v1 결과는 legacy 렌더러로 그대로 열람, v2 결과에 `saju.basis` 기록 |
| 한자 웹폰트 커버리지(세리프 349자) | 작명서에서 서체 혼용 | Noto Serif KR 청크 탑재(Phase 5 실측) |
