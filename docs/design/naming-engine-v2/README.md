# 훈민정음 작명소 v2 — 결정론 작명 엔진 설계서 (Phase 1)

- 상태: **Phase 1 설계안 — 승인 대기**. 코드 변경 없음. 실데이터·구현은 Phase 2 이후.
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

## 3. 모듈 구조 (예정 경로)

```
worker/naming-engine/            ← 순수 TS, Workers·Node 양쪽에서 import (영냥이 TS 선례)
  config/
    weights.ts                   점수 가중치(§7) — 숫자만, 로직 없음
    school-presets.ts            학파 프리셋(§5)
  data/
    hanja-pool.v1.json           생성물(Phase 2). 인명용 한자 풀 + 원획 + 자원오행 + 플래그
    surnames.v1.json             성씨 한자·원획(단성·복성)
    suri-81.v1.json              81수리 표(학파 대안 포함)
    samjae-125.v1.json           삼재 125조합(5³)
    sound-blacklist.v1.json      놀림·비하 동음 블랙리스트
  strokes.ts                     원획/필획, 부수 변형 환산, 숫자 한자 규칙
  suri.ts                        4격·삼재·외격, 81 환원, 수리오행·수리 음양
  sound.ts                       초성 추출, 두 매핑, 인접 상생/상극
  saju-input.ts                  래퍼: buildSajuSnapshotFromBirth → 필요/기피 오행
  candidates.ts                  인덱스 탐색 + 하드 필터
  score.ts                       항목 점수 + 근거 키
  diversify.ts                   MMR 다양화
  engine.ts                      파이프라인 진입점 runNamingEngine(input, preset)
scripts/naming/                  데이터 빌드(Phase 2): 원천 → 정규화 → 생성물 + 검수 CSV
data/naming/raw/                 원천 사본(크롤 명단, Unihan 발췌, libhangul hanja.txt) + 출처·라이선스 기록
data/naming/NOTICE.md            Unicode License v3 · libhangul BSD-3 · rutopio MIT 고지(배포 조건, §13.A)
```

- 기존 `worker/lib/naming-sound-elements.js`·`naming-suri.js` 는 v1 프롬프트가 쓰므로 v1 삭제 시점까지 그대로 두고, v2 는 같은 표를 데이터 파일로 옮겨 단일 정본으로 만든다(v1 삭제 커밋에서 중복 해소).
- 엔진은 I/O 가 없다(데이터는 정적 import). 같은 입력·프리셋·데이터 버전이면 같은 출력.

## 4. 데이터 모델

```ts
type Element = "wood" | "fire" | "earth" | "metal" | "water";

interface HanjaEntry {
  ch: string;                    // 한 글자(정자). 인명용 풀 소속이 존재 조건
  readings: { hangul: string; initial: string; kind: "designated" | "dueum" }[]; // 지정 음 + 두음 파생(§13.A 주석 규칙)
  variantOf: string | null;      // 별표2 허용자체면 정자
  hun: string | null;            // 훈(뜻). 라이선스 확인된 원천만, 없으면 null
  hunSource: "libhangul" | "self" | null;
  radical: string;               // 강희 부수(원형)
  wonStrokes: number;            // 원획(강희) — 기본
  pilStrokes: number;            // 필획(현행 자형) — 옵션
  jawonElement: Element | null;  // 자원오행
  jawonBasis: "radical" | "meaning" | "reviewer";
  confidence: number;            // 0~1. 0.7 미만은 추천 우선순위 하향
  reviewed: boolean;             // 자문 검수 완료
  disputed: boolean;             // 원획·자원오행 출처 불일치
  cautions: { reasonKey: string; sources: string[] }[]; // 불용(不用) 관행 — 차단하지 않고 경고(§13.B.7)
  tags: string[];                // 의미 태그
}

interface Surname { hangul: string; chars: string[]; compound: boolean }
type SuriGrade = "good" | "half" | "bad";          // 출처마다 大吉·中吉 세분이 달라 3단계로 고정(§13.B.2)
interface SuriEntry { n: number; grade: SuriGrade; flag: "" | "disputed" | "change-proposed";
                      genderNote: "" | "common" | "some"; nameKey: string; interpKey: string;
                      alternatives: { school: string; grade: SuriGrade }[]; sources: string[] }
interface SamjaeEntry { heaven: Element; human: Element; earth: Element; grade: string; interpKey: string; sources: string[] } // 125조합

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
  - **잔여획 0(부수 글자 자체)은 자형 실획**(王 4, 玉 5, 水 4) — `radical-variants.csv` 비고, 자문 확인 항목.
- 대표 성명학 자료와 다르면 `disputed` + 검수 CSV.

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

### 6.5 소리오행
- 초성 기준. 쌍자음은 평음(ㄲ→ㄱ, ㄸ→ㄷ, ㅃ→ㅂ, ㅆ→ㅅ, ㅉ→ㅈ), 모음 초성은 ㅇ. 표기 발음(두음법칙 적용형, 예: 李=이) 기준.
- 인접(성→이름1→이름2) 상생 +, 비화 0(같은 오행 3연속은 −), 상극 −. 상극은 감점만 하고 거부하지 않는다. 보조 지표로 모음 음양·받침 리듬(가중 낮음).
- ㄹ 은 해례에서 반설음으로 따로 분류되나 두 프리셋 모두 설음(火)에 붙인다(`sound-mapping.csv` 비고).

### 6.5b 획수 음양
- 홀수 양, 짝수 음. 3자 이름은 전양·전음만 흉, 섞이면 길(출처 3곳). 외자(2자)는 같은 음양 2자가 흉(miso 許晙 예).
- 복성 규칙은 출처를 찾지 못했다 → 성 두 글자를 각각 세어 전체 글자에 같은 규칙(전부 같으면 흉)을 적용하는 **설계 선택**, 자문 확인 항목.

### 6.6 자원오행
- 1차 부수 규칙(예: 木·艹·竹 계열 → 木) → 의미 규칙 → 신뢰도. LLM 보조 분류는 과금이므로 **Phase 2 에서 비용 산정 후 1회 승인**을 받을 때만 쓴다.
- 신뢰도 0.7 미만·미검수는 추천 순위에서 하향, `disputed` 는 상위 5개(무료 노출)에서 제외.

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

## 8. 탐색·성능

1. 성 원획이 정해지면 이름 획수 쌍 (a, b) 중 4격이 모두 하드 필터를 통과하는 쌍만 먼저 계산한다(획수 1~30 기준 최대 900쌍).
2. 통과한 획수마다 `(획수, 자원오행)` 인덱스로 글자 목록을 꺼낸다. 고정 글자·기피 글자를 반영한다.
3. 조합을 점수화하고 상위 K(=200)를 남긴 뒤 MMR 로 다양화한다. 유사도 = 같은 글자 공유 + 같은 첫 음절 + 같은 소리오행 패턴. 무료는 상위 5개, 유료는 상위 12개를 쓴다.
4. 동점은 `hash(inputHash + 후보)` 로 결정론 정렬한다(난수 없음).
- 예산: 요청당 CPU 50ms 이하 목표(Phase 3 실측). 데이터 번들 증가 gzip 600 KiB 이하(`npm run build:worker && npm run verify:worker-size`).
- 큐는 쓰지 않는다. 계산은 동기로 하고, LLM 서술은 기존 웨이브 패턴(요청당 1파트 + Mongo 체크포인트 + 리더 + 10분 크론)을 그대로 쓴다.

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
| POST `/api/naming-prompt/candidates` (신규) | 무료 엔진 상위 5개 | LLM 0콜. 로그인 불필요. `runAiRouteWithSecurity` 버킷에 등록(`verify:worker-security-guards`) |
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

| 파일 | 내용 | 검수 열 |
|---|---|---|
| 파일 | 행 | 내용 | 검수 열 |
|---|---|---|---|
| `suri-81.csv` | 81 | v1 등급 · v2 제안 등급 · 출처 분포 · `disputed`/`change-proposed` · 성별 주석 | `review_grade`, `review_note` |
| `four-pillars-formulas.csv` | 6 | 단성·복성 × 2자·외자 4격 식, 일본식 대안, 오격(참고) · 신뢰도 · 출처 | `review_formula`, `review_note` |
| `radical-variants.csv` | 24 | 부수 변형 14 + 숫자 한자 10 → 원획 · 조건 | `review_strokes`, `review_note` |
| `sound-mapping.csv` | 19 | 초성 → 오행(운해본·해례) | `review_note` |
| `samjae-125.csv` | 125 | 천·인·지 오행 125조합 — **등급 칸은 비어 있음**(Phase 2 원문 전사) | `review_grade`, `review_note` |
| `sources.csv` | 24 | 표별 출처 URL | — |
| (Phase 2) `hanja-pool-diff.csv` | — | 명단 원천 4종 대조 차이 | `review_decision` |
| (Phase 2) `hanja-pool-review.csv` | — | 저신뢰·분쟁 한자 | `review_won`, `review_jawon` |

- CSV 는 UTF-8 BOM(엑셀 한글 표시용). 수치는 WebFetch 요약기 추출을 거친 값이 섞여 있어 **바꾸는 수(28·38·59)와 승격 검토 수(73·75)는 사람이 원문 페이지와 대조**한 뒤 확정한다(조사 B 권고).
- 삼재 등급은 요약기 추출값을 쓰지 않는다. Phase 2 에서 zhouyi.cc 전체표를 원문 전사하고 yishengmi 大吉·大凶 40 + 바이두 표본과 대조한다.
- 검수 결과는 CSV 를 다시 받아 `scripts/naming/` 빌드가 반영한다. 검수자의 판정이 출처보다 우선하며, `reviewed=true` 와 판정 사유를 남긴다.
- 골든 테스트: 자문가가 검수한 성명 예시 20건 이상을 `__tests__/` 기대값으로 고정한다(Phase 3).

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
