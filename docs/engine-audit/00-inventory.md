# Phase 0 — 운세 엔진 현황·라이선스 감사

> **우선 경고 — 요청한 라이선스 금지 기준과 충돌하는 기존 의존성이 있다.**
> - `sweph-wasm@2.6.9`: 설치된 `package.json`의 `AGPL-3.0-or-later`와 `LICENSE`의 GNU Affero General Public License Version 3 원문을 직접 확인했다. `worker/lib/swiss-ephemeris.js`가 패키지와 WASM을 import하며 베다·서양점성술·숙요 경로가 이 브리지를 사용한다. 이번 감사에서는 실행·설치·제거하지 않았다.
> - `sharp` 선택 의존성: 잠금 파일에 LGPL 포함 항목 14개가 있다. 현재 Windows 설치본은 `@img/sharp-win32-x64@0.34.5`이며 메타데이터가 `Apache-2.0 AND LGPL-3.0-or-later`다. 플랫폼별 잠금 항목을 14개 모두 설치·배포된 것으로 해석하지 않는다.
> - `workers-og@0.0.27`: 설치된 `package.json`에 license가 없고 패키지 루트에 LICENSE/LICENCE/COPYING 파일도 없다. **라이선스 미확인**이며 허용 처리하지 않는다.
> - 이는 사용자 지정 허용 목록과의 대조 결과다. 상용 계약 보유 여부, 실제 운영 배포본의 구성, 법적 의무의 범위는 미확인이다. 의존성 교체·삭제·엔진 수정은 별도 승인 전 진행하지 않는다.

## 1. 감사 기준과 범위

| 항목 | 확인 내용 |
|---|---|
| 확인일 | 2026-11-01, Asia/Seoul |
| 단계 | Phase 0만 수행. 소스·메타데이터·기존 테스트 정의를 읽고 이 문서만 작성 |
| 최초 조사 체크아웃 | `D:/Development/code-destiny`, `feat/world-cast-page`, `66e00891df1334854c5a3608e7f46027897ed1fe` |
| 문서의 최신 소스 기준 | `origin/main`의 `20904183a1b0276584ed6f74313bf1e6cdeaf442`에서 만든 격리 워크트리 |
| 기준 보정 | 최초 체크아웃은 최신 main과 분기되어 있었다. 원국·달력·주요 천문 브리지·의존성은 대조했고, main에 추가된 `lib/saju/natal-core/`와 변경된 격국·프롬프트·셸·생성 런타임을 추가로 읽었다. 아래 공통화 판단은 최신 기준을 따른다 |
| 보존 대상 | 기존 체크아웃과 다른 main 워크트리의 미커밋 변경. 다른 세션이 실행 중이므로 저장소 지정 스크립트로 작업 공간 분리 |
| 의존성 조사 | 루트 package.json의 dependencies/devDependencies 및 package-lock.json 전 항목, 설치된 패키지 메타데이터. 하위 app/worker/pages/constants manifest와 mobile의 직접 의존성도 확인 |
| 제외 | 보관·과거 감사·다른 워크트리 전체 검색, 비밀값, 운영 결과/유료 결과 조회·변경, 후보 오라클 설치, 엔진 실행, 외부 API·실 LLM·실결제 호출 |
| 판정 한계 | 정적 확인은 구현의 존재·데이터 흐름을 증명할 뿐 계산 정확도나 운영 배포 상태를 증명하지 않는다. 실제 오류로 확정한 A 항목은 없음(오류가 없다는 뜻이 아님) |

확인 수준은 **소스 확인**, **설치 메타데이터 확인**, **라이선스 원문 확인**, **기존 fixture에 기록됨**, **미실행/미확인**으로 구분한다. README·주석의 정확도 주장은 재현된 사실로 승격하지 않는다. 경로는 저장소 루트 기준이며 심볼 이름으로 위치를 추적할 수 있다.

## 2. 6개 엔진과 어댑터 지도

| 영역 | 계산 구현·공개 호출 경계 | 소비 경로·프롬프트 | 입력 → 출력의 핵심 |
|---|---|---|---|
| 사주 | `lib/korean-calendar/index.js` → `natal.js::calculateNatalSaju`, `ganji.js`, `daeun.js`; 앱 `app/saju/animal-destiny/lib/sajuAdapter.ts::computeNatalFromInput/fetchSajuEngineResult` → `engine/localSajuCalculator.ts::calculateLocalSaju`; 워커 `worker/lib/life-book-ai-saju.js::calculateLifeBookAiSaju` | 셸 `js/saju-engine.js`; 동물점·러브 시뮬레이션·destiny-compass; `worker/yeongnyangi/fortune/saju/index.ts` → `saju/runtime.ts::calculateScreenSaju`; `worker/lib/tea-saju-facts.js`, `saju-ai-prompt.js` | 날짜·시각·달력·윤달·출생지/시간대(경계마다 지원 차이) → 사주 기둥, 계산 메타데이터; 상위 계산기는 오행·십신·격국·용신·대운·세운 등 추가 |
| 자미두수 | 셸 `js/saju-engine.js::calcZiweiPalaces`; 앱 `app/_lib/ziwei-engine.ts::calcZiweiPalaces/calculateZiweiChart`; 워커 `worker/lib/ziwei-ai-chart.js::calculateZiweiAiChart` | `app/destiny-compass/_engine/adapters/ziweiAdapter.ts`; `worker/yeongnyangi/fortune/ziwei/index.ts`; `worker/lib/guardian-fortune/adapters/ziwei.js`; `worker/routes/ziwei-ai.js`, `worker/lib/ziwei-ai-prompt.js` | 출생 날짜·시각·성별·달력·윤달·출생지 → 명궁·신궁·오행국·12궁·별 배치·사화·대한·소한·유년·불확실성. 앱·워커 필드명은 다름 |
| 베다/낙샤트라 | `worker/lib/vedic-ai-chart.js::calculateVedicAiChart` → `swiss-ephemeris.js::getSwissVedicPlanets`; 파생 `vedic-derived-calculations.js`; 별도 `lib/vedicCalculator.js::calculateVedicChart`, `lib/vedicSwissChart.js::computeVedicChartSwiss` 존재 | `worker/routes/vedic-ai.js`, `nakshatra.js`, `nakshatra-ai.js`, `nakshatra-premium.js`; 영냥이 `vedic/index.ts`; guardian `adapters/vedic.js`; `vedic-ai-prompt.js`, `nakshatra-ai-prompt.js`; 유명인 `lib/famous-saju/celebrity-multi-system.ts`는 자체 계산기 참조 | 날짜·시각·시간대·좌표 → 항성 행성 황경·Lahiri 값·라그나·라시·낙샤트라·파다·하우스·다샤. `computeVedicChartSwiss`의 현행 운영 호출부는 이번 검색에서 확인되지 않아 주석만으로 활성 API라고 판정하지 않음 |
| 숙요 | 주요 경로 `worker/lib/sukuyo-astronomy.js::calculateSukuyoForMoment` → Swiss 달 황경 → `sukuyo-coordinate.js::buildSukuyoFromMoonLongitude`; 앱 래퍼 `lib/sukuyo-engine-server.ts::calcSukuyoForServer`; 셸에 별도 `calcSukuyoData` 존재 | `worker/routes/sukuyo.js`; 영냥이 `sukuyo/index.ts`; guardian `adapters/sukuyo.js`; compass `sukuyoAdapter.ts`; `worker/lib/sukuyo-ai-calculation.js`, `sukuyo-ai-prompt.js` | 출생 순간·달력·시간대·좌표·시간 인지 여부 → 27숙 인덱스·명칭·달 황경·구간 진행률·음력 메타데이터·계산 근거. 단순 음력 월일 판정과 달 황경 판정은 같은 방법이 아님 |
| 서양점성술 | `worker/lib/swiss-ephemeris.js::getSwissWesternChart`; 셸 `js/saju-engine.js`의 천문 계산·`calcAstroSwissChartOrThrow` 경로 | `worker/routes/astro.js`, `astrology-ai.js`; 영냥이 `astrology/index.ts`; guardian `adapters/astrology.js`; `worker/lib/astrology-ai-prompt.js`, `astro-premium-generator.js` | 날짜·시각·timezone·lat/lon·하우스 방식 → planets·ascendant·midheaven·houseCusps·aspects·source/품질. 베다의 항성 황도와 별도 체계 |
| 타로 | `lib/tarot/tarot-interpretation-engine.mjs::drawTarotCardsForSpread/interpretTarotReading`; 카드 `tarot-cards.mjs`, 스프레드 `spreads.mjs`, 조합 `tarot-combination-engine.mjs`; 셸 `js/saju-engine-tarot-sukuyo-quantum.js` | 영냥이 `tarot/index.ts` 및 consultation-*; guardian `adapters/tarot.js`; compass `tarotAdapter.ts` | 질문·spreadId·카드 ID/정역/자리 → drawnCards·카드별 해석·조합 해석. 일반 타로에는 출생 정보가 필수 입력이 아님 |

### 2.1 공통 래퍼 계약과 혼동 주의

- `worker/yeongnyangi/fortune/index.ts`는 6개 domain을 등록한다. `shared/contracts.ts::FortuneDomain`은 `validateInput`, `calculate`, `buildContext`, `buildPrompt`, `validateResult`로 나뉜다. 향후 오라클 러너가 사용할 경계는 계산뿐이며 생성·저장·과금 라우트를 호출하지 않는다.
- `FortuneInput`: `personA/personB`, `readingMode`, `question`, `topicId/spreadId` 등. `BirthProfile`: `birthDate`, 선택 `birthTime/gender/birthPlace`, 정규화된 `calendarType: "solar"`, 선택 `originalCalendar`. 반환 `DomainContext`: `domain`, `engineVersion`, `calculatedAt`, `facts[{id,label,value}]`, `limitations`. 이는 공통 포장 형식이며 원본 명반 JSON과 동일하지 않다.
- `worker/lib/guardian-fortune/adapters/`에는 6개 어댑터가 있으며 일부 `options.calculator` 주입점이 있다. mock 주입 가능성과 실제 천문 정답 검증은 별개다. import만으로 Swiss 코드가 연결될 수 있으므로 향후 러너에서 먼저 의존 경계를 검사해야 한다.
- `app/destiny-compass/_engine/adapters/registry.ts`는 5개 어댑터만 등록한다. 이곳의 베다는 `vedicAdapter.ts::zellerWeekday`로 요일(바라) 신호를 만들며 전체 베다 명반이 아니다. 타로는 생일·dateSeed 해시로 정위 메이저 아르카나 하나를 선택한다. 이를 전체 베다·타로 엔진의 대표 oracle 호출점으로 채택하면 검증 범위가 누락된다.
- 수정 금지 대상의 정확한 위치는 `app/saju/animal-destiny/lib/sajuAdapter.ts::calculateLocalResult`다. compass의 동명 파일과 구분한다. `app/saju/love-simulation/_engine/normalizeSaju.ts`와 KASI prefetch의 입력 계약도 변경하지 않았다.

### 2.2 주요 입력·출력 스키마 차이

| 경계 | 입력 | 출력·주의 |
|---|---|---|
| `AnimalDestinyInput` (`app/saju/animal-destiny/lib/types.ts`) | birthDate, 선택 birthTime, gender=male/female/unknown, calendarType=solar/lunar, lunarLeap, 선택 timezone/offset/latitude/longitude/standardMeridian | `calculateLocalResult`는 dayStem, pillars, timeUnknown 및 yearPillar/monthPillar/dayPillar/hourPillar 별칭만 반환. 상세 격국·대운 출력 검증에는 `computeNatalFromInput`의 full result 경계를 별도로 봐야 함 |
| `calculateNatalSaju` | birthDate, birthTime/birthTimeUnknown, calendarType=solar/lunar/lunar_leap, isLeapMonth/leapMonth, birthPlace | pillars={year,month,day,hour}; calculationMeta={engineVersion,policyVersion,original,location,civil,instant,termClock,correction,corrected,nightZiPolicy,timeUnknown,…}. 시간 미상 hour=null |
| `ZiweiUserInput` / `ZiweiDeepChart` (`app/_lib/ziwei-types.ts`) | birthYear/Month/Day/Hour/Minute, unknownHour, gender=M/F, calendarType, isLeapMonth, timezone, 선택 birthPlace | mingGong, shenGong, juInfo, palaces, sihua/fourTransformations, majorPeriods, annualFlow, warnings, canonicalInput |
| 워커 `calculateZiweiAiChart` | input.birthInfo 또는 input의 birthDate/birthTime/birthTimeUnknown/gender/calendarType/isLeapMonth/birthPlace; options.birthClock | lifePalace, bodyPalace, bureau, palaces, fourTransformations, majorLuck/minorLuck/yearlyLuck, lunar, uncertainty. 명칭·단위 투영 후 비교 필요 |
| `calculateVedicAiChart` | env, consultationInput의 출생 정보·장소, options | calculationConfig/Meta, ayanamsaDegree, lagna, moon/sun, planets/grahas, rashis, houses/bhavas, moonNakshatra, dasha/vimshottariDasha 등. 시간 미상 라그나=null·moon-chart |
| `calculateVedicChart` / `computeVedicChartSwiss` | year/month/day/hour/minute, tzOffset(시간), latitude/longitude | lagna, sun/moon 및 행성·nakshatra·dasha 계열. 워커와 shape·정밀도·계산기가 달라 직접 JSON 동등성 비교 불가 |
| `calculateSukuyoForMoment` | env, rawMoment, options; calendarType, timezone/offset, birthTimeKnown/unknownTime | mansionIdx/index, moonSiderealLongitude, nakshatraIndex, segmentFraction, lunar*, isLeapMonth, utcTimestamp, calculationBasis, astronomyVersion |

## 3. 공통 출처·별도 재계산·생성 사본

| 분류 | 확인한 근거 | 감사상 의미 |
|---|---|---|
| 공통 음양력·절기·간지 | `lib/korean-calendar/index.js`가 `core.js`, `ganji.js`, `daeun.js`, `natal.js`를 공개. `table.generated.js`를 조회하고 `ephemeris.js`는 빌드 시 astronomy-engine 사용 | 같은 함수의 여러 호출을 독립 oracle로 세지 않음. 표 생성 천문값과 KASI 직접 원문을 구분 |
| 공통 사주 원국 | 셸의 `_koreanCalendar().calculateNatalSaju`, 앱 `calculateLocalSaju`, 워커 `calculateLifeBookAiSaju`, 영냥이 `calculateScreenSaju`가 동일 원국 모듈 참조 | 경계별 입력 정규화·기본값 차이는 남을 수 있음. 코어 공유만으로 모든 소비 경로 동일성을 보장하지 않음 |
| 공통 대운 | `lib/korean-calendar/daeun.js::daeun/daeunFromFrame`; `life-book-ai-saju.js::buildMajorLuck`, 앱의 `calculateDaewoonStartFromCore` | 순역·시각 프레임·성별 인코딩·나이 표시의 입력/투영을 비교해야 함 |
| 최신 main의 격국 정본 | `lib/saju/natal-core/index.mjs::analyzeNatalCore`, `gyeokguk.mjs::monthStructure/finalGyeokguk/gyeokgukView`, `special.mjs`, `strength.mjs`, `climate.mjs`; 셸 detectJong 및 워커 `saju-gyeokguk.js::natalCoreFromPillarRows`가 연결 | 최초 체크아웃의 독립 판정 상태를 현행으로 보고하지 않음. core의 ruleProfile·strength·climate·yongshin breakdown은 학파/서비스 규칙으로 기록 |
| 생성 사본 | `js/core/saju/natal-core.generated.js` ← `scripts/build-saju-natal-core.mjs`; `worker/yeongnyangi/fortune/saju-runtime.mjs` ← `scripts/extract-saju-runtime.mjs`; `saju-runtime-provenance.json`에 원본/심볼 해시 | 독립적으로 설계된 두 엔진으로 세지 않음. 생성·동기화 명령은 실행하지 않음 |
| 남은 별도 사주 분석 | 앱 `localSajuCalculator.ts::calculateNatalAnalysis/buildGyeokgukAnalysis/tenGodForStem`; 워커 `saju-ai-prompt.js::getTenGodFromDayMaster`, `saju-gyeokguk.js`의 십신/12운성, `life-book-ai-saju.js::tenGodFor`; 작명 `saju-yongshin-policy.js::resolveNamingYongshin` | 앱 분석과 최신 core의 결과 차이는 재현 필요. 작명 전용 용신 정책과 전체 원국 정책을 무조건 통합하지 않음 |
| LLM 입력 재판정 | `worker/lib/saju-ai-prompt.js::buildSajuAIPromptWithDomain`은 pillarRows에서 natal-core를 계산하고 legacyJongShape로 종격 정보를 구성. `buildGyeokgukAnalysis`도 같은 core 사용 | 요청의 과거 jong 값을 그대로 채택하지 않는 현행 동작. 별도 공식은 아니지만 계산 반복·입력 차이에 따른 불일치 지점 |
| 자미두수 병렬 구현 | 셸·앱·워커 각각 명궁·오행국·별 배치 구현. `ziwei-birth-clock.js`, `ziwei-fire-bell.js`, `ziwei-star-strength.js`, `ziwei-minor-limit.js` 등 일부 공통 모듈 | 동일 fixture에 대한 3경로 parity와 외부 oracle 비교를 분리할 필요 |
| 베다 별도 계산 | `lib/vedicCalculator.js` 자체 julianDay/lahiriAyanamsha/태양·달 공식; 유명인 모듈 호출. Swiss 계열은 공통 브리지 및 `vedic-derived-calculations.js` 사용 | 자체 공식과 Swiss 계열이 병존. 이름이 같은 낙샤트라도 천문 정밀도·입력 조건이 같다고 단정할 수 없음 |
| 숙요 별도 방법 | 셸 `calcSukuyoData(lunarObj, {leapRule:'current'})`와 서버 달 황경 경로 | 함수 존재는 확인했으나 모든 화면의 실제 도달성은 미확인. 현재 서비스 정책 결정 전 하나를 다른 것으로 교체하지 않음 |

## 4. 현재 계산 정책과 경계

| 항목 | 소스에서 확인한 현재 선택 | 정확도·학파 판정의 한계 |
|---|---|---|
| 한국 달력 | `korean-calendar/index.js/core.js`의 KST 기준 표. `natal.js`는 출생 연도 1900~2100 범위를 검사 | core의 천문 생성표 전체가 KASI 원문이라는 뜻은 아님. KASI fixture의 검증 범위는 별도 |
| 출생 순간 | `natal.js::resolveNatalInstant`의 IANA/Intl 오프셋 조회. 유효 순간이 하나가 아니면 AMBIGUOUS_BIRTH_TIME | 역사적 표준시·DST 정확도는 런타임 ICU 데이터 및 후속 경계 검증 필요 |
| 사주 시간 보정 | `SAJU_POLICY_VERSION='local-mean-minute-shift23-v1'`; 기본 서울 126.978°, Asia/Seoul. 경도·DST 보정, Math.round 분 단위, equationOfTimeMinutes=0 | 구현은 지방 평균시. 균시차를 포함하는 진태양시와 혼용하지 않음 |
| 연·월주/일·시주 | 연·월은 실제 순간을 KST termClock으로 투영; 일·시는 보정 시계. 23시대 익일 일진, 같은 일간에서 시주 계산 | 자시 선택을 oracle 기본값으로 자동 변경하지 않음 |
| 시간 미상 | 사주 시주 null, 연·월 경계에는 가정 시각과 termTimeAssumed 표시. 워커 자미두수는 정오 기준과 uncertainty. 베다는 라그나 미제공 | 정오 대체 결과를 시각 확정 정답으로 취급하지 않음 |
| 대운 | `daeun-kst-sect1-counting-age-v1`; 양년 남/음년 여 순행, 나머지 역행. 절기 간격에서 시진·일 차로 years/months/days 계산, 세는 나이 및 0번 미입운 구간 | sect 1 재현이라는 코드 주석과 실제 다른 oracle 일치 여부는 별개. 성별 미상 매핑·절입 근처 반올림은 후속 검증 |
| 격국·용신 | natal-core는 원국 기둥만 입력. `rok-yangin-strictjong-v1` 프로필, 월령 구조와 특수격 후보를 분리; 시간 미상은 가능한 시주 변형을 고려. 억부/조후/격국/통관/특수격 축과 충돌을 별도 출력 | 프로필의 0.7·3·0.5 등은 코드가 개발 정책 보조값으로 명시. 고전의 확정 수치나 외부 oracle 정답으로 취급하지 않음. 앱의 별도 분석과 비교 필요 |
| 자미두수 | `ziweiBirthClock`; 보정 23시 익일 음력, 음력해 세차; `placementMonth`는 윤달 16일부터 다음 달. `options.birthClock='corrected'`는 중복 보정 방지 | `README-ziwei-iztro-reference.md`의 기존 학파 기록 참고. 명궁·오행국·주성도 연/일/윤달/시각 설정을 먼저 맞춘 뒤 비교 |
| 베다 | 워커 config는 sidereal/Lahiri/whole-sign. Swiss 로컬 경로는 SE_TRUE_NODE, 케투=라후+180° | 외부 API 응답 경로도 존재. 코드 선택을 실제 배포 응답의 실행 증거로 보지 않음. Swiss는 이번 감사에서 실행 금지 |
| 숙요 | `sukuyo-coordinate.js`: Lahiri 지심 항성 달 황경을 360/27로 나눈 인덱스에 배열 offset 16 적용. astronomyVersion=sukuyo-astronomy-v1 | 음력 월일표 방식과 별도 방법. KASI 음력만으로 황경·숙 경계 정확도 검증 불가. 체계 선택은 네오 결정 대상 |

사실과 학파를 나누되, 입력 기준이 확정되기 전의 대운수·자미 명반 차이를 곧바로 A로 확정하지 않는다. KASI의 음양력·절기 자료로 검증 가능한 항목과, 별 배치·격국·다샤처럼 별도 규칙/천문 근거가 필요한 항목을 구분한다.

## 5. 후속 재현 후보 — 아직 결함 확정 아님

| ID | 정적 관찰·근거 | 필요한 재현/승인 |
|---|---|---|
| P0-L01 | Swiss 계열 의존성이 사용자 금지 기준과 충돌. 라이선스 원문·import 모두 확인 | 상용 계약 및 교체 정책 확인 필요. Phase 1의 서비스 호출 러너도 Swiss가 연결된 경로를 실행할 수 없음. 허용 oracle 설치만으로 해소되지 않음 |
| P0-I01 | `AnimalDestinyInput`에는 gender와 timezone/좌표 필드가 있지만 `sajuAdapter.ts::computeNatalFromInput`의 calculateLocalSaju 인자는 날짜·시간·달력·윤달·KASI context만 전달 | 같은 생일의 서로 다른 성별/출생지 입력을 해당 공개 경계로 비교해야 함. 호출 의도와 출력 소비 범위 확인 전 오류 확정 금지. calculateLocalResult 수정 금지 유지 |
| P0-I02 | 최신 main의 격국 정본과 앱 localSajuCalculator의 별도 격국·용신 분석이 병존 | 동일 기둥·시주 미상·건록/양인·특수격 경계로 결과와 설명 비교. 학파 선택과 구현 누락을 분리 |
| P0-I03 | 베다 자체 공식 사용 경로와 Swiss 사용 경로가 병존 | 달 황경/낙샤트라/파다·다샤 경계에서 오차 측정 필요. 현재 실행 금지에 저촉되는 경로는 차단 상태 유지 |
| P0-I04 | 숙요 음력 월일표 함수와 항성 달 황경 경로가 공존 | 실제 사용자 진입점별 도달성을 확정하고 방법론 결정 필요. 불일치를 자동으로 사실 오류로 분류하지 않음 |
| P0-I05 | 간지 표면 fixture는 알려진 동작·null을 보존하며 정답을 주장하지 않음 | 기존 README의 과거 결함 설명을 현재 결함으로 복사하지 않음. 현행 호출부·live/null coverage 재현 필요 |

엔진 내부 수정이 필요한 **재현·확정된 결함**은 이후 승인된 단계에서 `docs/engine-audit/change-requests/CR-xxx.md`에 입력·기대값·근거·영향·제안 diff를 기록한다. 이번에는 산출물 한 개 제한과 미재현 상태 때문에 CR 파일이나 코드 diff를 만들지 않았다.

## 6. 기존 테스트·골든 데이터

| 자산 | 현재 파일에서 읽은 규모/출처 | 성격·한계 |
|---|---|---|
| `__tests__/fixtures/korean-calendar/kasi-samples.json` | requested/captured=289, errors=0; selector range 1930~2050; 기록된 채집 endpoint는 staging의 KASI 프록시 | 기존 공식 음양력 표본 기록. 오늘 실 KASI 재조회하지 않음. 2051~2100 coverageGap 명시 |
| `__tests__/fixtures/korean-calendar/kasi-24divisions.json` | 2000~2028년 29개년 × 24절기; sourceCounts kasi=29/cache=0/local=0 | 기존 get24DivisionsInfo 채집 기록. 지원 범위 주장은 fixture의 기록이며 현재 업스트림 범위를 실조회한 것은 아님 |
| `scripts/fixtures/ziwei-iztro-reference.json` | rows=840; iztro 2.6.1, generatedAt=2026-10-02; byLunar, fixLeap=true, 기본 config | 서비스 한국 음력을 외부 별 배치기에 입력한 부분 독립 검증. 음력의 독립 oracle 아님. 라이선스 MIT 표기는 fixture 주장; 이번에 iztro 설치 원문을 확인한 것이 아님 |
| `scripts/fixtures/README-ziwei-iztro-reference.md` 및 `verify-ziwei-reference.mjs` | 3엔진 명반 대조, rows hash·calendar fingerprint, SCHOOL_RULES | 중국 음력에 없는 날짜·한중 차이 등의 제외/학파 예외를 포함. 표본 제외를 전체 정확성으로 일반화하지 않음 |
| `scripts/fixtures/ganji-surface-kst.json` | sampleCount=1645, surfaces=13, nullMap 포함 | 현행 보존 스냅샷. README가 명시적으로 정답 아님을 경고 |
| `__tests__/ui/saju-natal-core.test.mjs`, `saju-gyeokguk-claim-guard.test.mjs`; `__tests__/worker/saju-gyeokguk.test.js` | 최신 main의 원국 규칙·격국 설명 및 워커 단위 테스트 존재 | 테스트 존재와 통과는 다름. 이번에는 미실행 |
| `__tests__/ui/saju-time-contract.test.mjs`, `saju-daewun-unified.test.mjs`, `ziwei-birth-clock.test.mjs` | 시간·대운·자미 출생 시계 계약 검사 존재 | 소스/동작 계약과 천문 정답 검증을 구분. 이번에는 미실행 |
| `__tests__/lib/vedicCalculator.test.js`, `vedicSwissChart.test.js`; `__tests__/worker/vedic-ai-chart.test.js`, `sukuyo-astronomy.test.js`, `nakshatra-resolve.test.js` | 자체 계산·어댑터·숙요·낙샤트라 테스트 존재. vedicSwissChart 테스트는 Swiss 함수 mock 사용 | mock 출력 투영 검사는 실제 천문 정확도 증명이 아님. 이번에는 import/실행하지 않음 |
| 각 `*-paid-delivery*`, `*-birth-unlock*`, `*-paid-resume*` 테스트 | 6영역 주변 전달·복구·권한 테스트 다수 존재 | 저장 결과 보존·결제 회귀 검사용이며 명반 정확도 oracle가 아님. 이번에는 미실행 |

기존 검사 명령(위치와 목적만 확인, **모두 이번 Phase 0에서는 미실행**):

```text
npm run verify:korean-calendar-kasi-samples
npm run verify:korean-calendar-solar-terms
npm run verify:solar-term-frame-kasi
npm run verify:ganji-surface-parity
npm run verify:ziwei-reference
npm run verify:ziwei-star-parity
```

이 목록은 즉시 실행 지시가 아니다. 후속 단계에서 직접 엔진 호출 여부·Swiss import·쓰기/네트워크 옵션을 먼저 점검한다. `--live`, `--emit`, 표 생성/fixture 갱신은 이번 범위에 포함하지 않는다. 신규 oracle 실행, 500건 엣지/20,000건 무작위 차분, 정확도·오류율 측정은 전부 미실행이다.

## 7. 수행 확인·보존·종료

- 수행: `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, 범위를 제한한 `git diff`, `rg --files/rg -n`, 파일 본문 읽기, Node 내장 fs로 manifest/lock/fixture JSON 및 설치 메타데이터 검사. 운세 엔진 패키지는 import하지 않았다.
- 문서 검증 결과: 전체 경로로 표기한 저장소 경로 51개 존재 확인, UTF-8 치환 문자 0개, fixture 및 의존성 집계 재확인. `npm run check:fast -- --plan`은 이 문서 한 개에 공백 검사와 `verify:doc-freshness`만 선택했고 `npm run check:fast`는 exit 0으로 통과했다. fsmonitor 통신 경고가 있었지만 명령은 성공했으며 별도 `git -c core.fsmonitor=false status --short`로 변경 집합을 확인했다. 문서 최신성 검사는 공통 진입 문서 4개를 검사하므로 이 감사 내용의 정확도를 대신 보증하지 않는다. 커밋·push·CI 상태는 최종 보고로 구분한다.
- 유지: calculateLocalResult, KASI prefetch, normalizeSaju, 6개 엔진과 래퍼, PortOne/Inicis, 결제·인증·API·DB·KV/R2·사용자 자산/저장 결과, 가격·이용권·월정석·단건 결제, 960px 레이아웃·i18n 모두 변경하지 않음. 공개 페이지·SEO 변경 없음.
- 신규 공개 API·인터페이스·스키마 없음. 의존성 추가·삭제·lock 수정 없음. 폐기 코드 없음.
- Phase 0 문서 작성 후 종료한다. **Phase 1 설치·CLI·하네스는 시작하지 않는다.** 라이선스 충돌 및 방법론/정규화 의심 항목은 승인·재현 대기이며 상용 사용 가능성이나 전체 정확도를 보증하지 않는다.

## 8. 의존성 라이선스 부록

아래 표는 확인일의 로컬 설치본 메타데이터와 잠금 파일을 직접 읽어 집계한다. 운영 25개/개발 21개의 구분은 루트 manifest 선언 기준이다. 전이 의존성의 dev/optional 플래그는 번들 포함 여부를 보장하지 않는다. 모든 전이 라이선스 원문을 읽은 완전한 법률 감사는 아니다.

허용 SPDX: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, Unlicense, 0BSD. 복합 식의 OR는 허용 대안 존재 여부를, AND는 모든 조건을 구분한다. BlueOak/MIT-0/MPL/Python/CC-BY/Zlib 등은 일반적 상용 가능성과 별개로 이번 명시 허용 목록 밖이다.

### 8.1 집계와 직접 의존성

- 루트 직접 의존성: 46개(운영 25, 개발 21).
- 잠금 파일 패키지 위치: 1528개(루트 항목 제외). 설치 메타데이터 읽기 성공 1412개, 해당 위치 미설치/읽기 불가 116개. 동일 패키지의 여러 버전·위치는 각각 센다.
- `worker/package.json`, `app/package.json`, `pages/package.json`, `constants/package.json`에 dependencies/devDependencies 없음. `apps/mobile/package.json`의 직접 4개는 루트와 같은 Capacitor 계열. 이 부록의 전이 집계는 루트 lock 기준이며 별도 생태계/모든 외부 바이너리의 라이선스 목록은 아님.

| 선언 | 패키지 | 잠금/설치 버전 | 설치 메타데이터 SPDX | 루트 라이선스 파일 |
|---|---|---|---|---|
| 운영 | `@capacitor/android` | 8.4.1 / 8.4.1 | MIT | `LICENSE` |
| 운영 | `@capacitor/app` | 8.1.0 / 8.1.0 | MIT | `LICENSE` |
| 운영 | `@capacitor/browser` | 8.0.3 / 8.0.3 | MIT | `LICENSE` |
| 운영 | `@capacitor/core` | 8.4.1 / 8.4.1 | MIT | `LICENSE` |
| 운영 | `@tiptap/extension-image` | 3.22.5 / 3.22.5 | MIT | `LICENSE.md` |
| 운영 | `@tiptap/react` | 3.22.5 / 3.22.5 | MIT | `LICENSE.md` |
| 운영 | `@tiptap/starter-kit` | 3.22.5 / 3.22.5 | MIT | `LICENSE.md` |
| 운영 | `astronomy-engine` | 2.1.19 / 2.1.19 | MIT | 없음(메타데이터만 확인) |
| 운영 | `bcryptjs` | 3.0.3 / 3.0.3 | BSD-3-Clause | `LICENSE` |
| 운영 | `dotenv` | 17.3.1 / 17.3.1 | BSD-2-Clause | `LICENSE` |
| 운영 | `framer-motion` | 11.18.2 / 11.18.2 | MIT | `LICENSE.md` |
| 운영 | `html-to-image` | 1.11.13 / 1.11.13 | MIT | `LICENSE` |
| 운영 | `html2canvas` | 1.4.1 / 1.4.1 | MIT | `LICENSE` |
| 운영 | `jspdf` | 4.2.1 / 4.2.1 | MIT | `LICENSE` |
| 운영 | `lucide-react` | 0.577.0 / 0.577.0 | ISC | `LICENSE` |
| 운영 | `mongoose` | 9.3.0 / 9.3.0 | MIT | `LICENSE.md` |
| 운영 | `next` | 15.5.15 / 15.5.15 | MIT | `license.md` |
| 운영 | `react` | 18.3.1 / 18.3.1 | MIT | `LICENSE` |
| 운영 | `react-dom` | 18.3.1 / 18.3.1 | MIT | `LICENSE` |
| 운영 | `sonner` | 2.0.7 / 2.0.7 | MIT | `LICENSE.md` |
| 운영 | `sweph-wasm` | 2.6.9 / 2.6.9 | AGPL-3.0-or-later | `LICENSE` |
| 운영 | `tz-lookup` | 6.1.25 / 6.1.25 | CC0-1.0 | `LICENSE` |
| 운영 | `web-vitals` | 4.2.4 / 4.2.4 | Apache-2.0 | `LICENSE` |
| 운영 | `workers-og` | 0.0.27 / 0.0.27 | 미확인 | 없음(메타데이터만 확인) |
| 운영 | `zustand` | 5.0.13 / 5.0.13 | MIT | `LICENSE` |
| 개발 | `@capacitor/cli` | 8.4.1 / 8.4.1 | MIT | `LICENSE` |
| 개발 | `@jest/globals` | 30.4.1 / 30.4.1 | MIT | `LICENSE` |
| 개발 | `@next/bundle-analyzer` | 15.5.15 / 15.5.15 | MIT | 없음(메타데이터만 확인) |
| 개발 | `@opennextjs/cloudflare` | 1.19.4 / 1.19.4 | MIT | `LICENSE` |
| 개발 | `@playwright/test` | 1.61.1 / 1.61.1 | Apache-2.0 | `LICENSE` |
| 개발 | `@types/node` | 20.19.37 / 20.19.37 | MIT | `LICENSE` |
| 개발 | `@types/react` | 18.3.28 / 18.3.28 | MIT | `LICENSE` |
| 개발 | `@types/react-dom` | 18.3.7 / 18.3.7 | MIT | `LICENSE` |
| 개발 | `autoprefixer` | 10.4.27 / 10.4.27 | MIT | `LICENSE` |
| 개발 | `cross-env` | 7.0.3 / 7.0.3 | MIT | `LICENSE` |
| 개발 | `eslint` | 8.57.1 / 8.57.1 | MIT | `LICENSE` |
| 개발 | `eslint-config-next` | 15.5.12 / 15.5.12 | MIT | 없음(메타데이터만 확인) |
| 개발 | `jest` | 30.4.2 / 30.4.2 | MIT | `LICENSE` |
| 개발 | `jsdom` | 29.1.1 / 29.1.1 | MIT | `LICENSE.txt` |
| 개발 | `lighthouse` | 13.1.0 / 13.1.0 | Apache-2.0 | `LICENSE` |
| 개발 | `lunar-javascript` | 1.7.7 / 1.7.7 | MIT | `LICENSE` |
| 개발 | `postcss` | 8.5.8 / 8.5.8 | MIT | `LICENSE` |
| 개발 | `sharp` | 0.34.5 / 0.34.5 | Apache-2.0 | `LICENSE` |
| 개발 | `tailwindcss` | 3.4.19 / 3.4.19 | MIT | `LICENSE` |
| 개발 | `typescript` | 5.9.3 / 5.9.3 | Apache-2.0 | `LICENSE.txt` |
| 개발 | `wrangler` | 4.85.0 / 4.85.0 | MIT OR Apache-2.0 | 없음(메타데이터만 확인) |

확인 경로는 각 행의 `node_modules/<패키지>/package.json` 및 표에 적힌 파일이다. `sweph-wasm/LICENSE`, `lunar-javascript/LICENSE`, `sharp/LICENSE` 원문도 직접 읽었다. astronomy-engine은 설치 루트 라이선스 파일이 없으나 메타데이터는 MIT이며, workers-og는 두 근거 모두 확인되지 않았다. 신규 의존성 승인 원장(Phase 1)을 대신하지 않는다.

### 8.2 잠금 파일 라이선스 분포

| SPDX 식 | 잠금 항목 | 설치 위치 | 사용자 허용 목록 대조 |
|---|---:|---:|---|
| MIT | 1115 | 1026 | 허용 단일 SPDX |
| Apache-2.0 | 216 | 202 | 허용 단일 SPDX |
| ISC | 90 | 90 | 허용 단일 SPDX |
| BlueOak-1.0.0 | 24 | 24 | 명시 허용 목록 밖/복합 조건 검토 |
| MIT OR Apache-2.0 | 3 | 3 | 허용 OR 대안 있음; 해당 조건 검토 필요 |
| MIT-0 | 2 | 2 | 명시 허용 목록 밖/복합 조건 검토 |
| BSD-3-Clause | 24 | 24 | 허용 단일 SPDX |
| BSD-2-Clause | 20 | 20 | 허용 단일 SPDX |
| LGPL-3.0-or-later | 10 | 0 | 금지 포함 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 | 0 | 금지 포함 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 | 1 | 금지 포함 |
| MPL-2.0 | 3 | 3 | 명시 허용 목록 밖/복합 조건 검토 |
| CC0-1.0 | 4 | 4 | 허용 단일 SPDX |
| (MIT OR CC0-1.0) | 3 | 3 | 허용 OR 대안 있음; 해당 조건 검토 필요 |
| Python-2.0 | 1 | 1 | 명시 허용 목록 밖/복합 조건 검토 |
| Unlicense | 1 | 1 | 허용 단일 SPDX |
| CC-BY-4.0 | 1 | 1 | 명시 허용 목록 밖/복합 조건 검토 |
| (MPL-2.0 OR Apache-2.0) | 1 | 1 | 허용 OR 대안 있음; 해당 조건 검토 필요 |
| (WTFPL OR MIT) | 1 | 1 | 허용 OR 대안 있음; 해당 조건 검토 필요 |
| (MIT AND Zlib) | 1 | 1 | 명시 허용 목록 밖/복합 조건 검토 |
| MIT OR SEE LICENSE IN FEEL-FREE.md | 1 | 1 | 허용 OR 대안 있음; 해당 조건 검토 필요 |
| AGPL-3.0-or-later | 1 | 1 | 금지 포함 |
| 0BSD | 1 | 1 | 허용 단일 SPDX |
| MISSING | 1 | 1 | 미확인 |

### 8.3 금지 포함·미확인 패키지 위치

| 잠금 위치 | 버전 | 잠금 SPDX | 설치됨 | optional |
|---|---|---|---|---|
| `node_modules/@img/sharp-libvips-darwin-arm64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-darwin-x64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linux-arm` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linux-arm64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linux-ppc64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linux-riscv64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linux-s390x` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linux-x64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linuxmusl-arm64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-libvips-linuxmusl-x64` | 1.2.4 | LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-wasm32` | 0.34.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT | 아니오 | 예 |
| `node_modules/@img/sharp-win32-arm64` | 0.34.5 | Apache-2.0 AND LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-win32-ia32` | 0.34.5 | Apache-2.0 AND LGPL-3.0-or-later | 아니오 | 예 |
| `node_modules/@img/sharp-win32-x64` | 0.34.5 | Apache-2.0 AND LGPL-3.0-or-later | 예 | 예 |
| `node_modules/sweph-wasm` | 2.6.9 | AGPL-3.0-or-later | 예 | 아니오 |
| `node_modules/workers-og` | 0.0.27 | 미확인 | 예 | 아니오 |

`next@15.5.15`의 optionalDependencies에 sharp가 있고 sharp의 optionalDependencies가 위 플랫폼 패키지를 참조한다. 따라서 루트에서 sharp를 devDependency로 선언했다는 이유만으로 운영 전이 경로가 없다고 판단하지 않는다. 실제 배포 산출물 구성은 미확인이다.

### 8.4 허용 목록 밖 기타 식의 추적 위치

금지 목록과 동일시하지 않되 이번 허용 게이트를 자동 통과시키지 않는다. OR의 허용 대안이 명확한 항목은 위 표에서 구분했다.

| 패키지 위치 | 버전 | 잠금 SPDX |
|---|---|---|
| `node_modules/@capacitor/cli/node_modules/glob` | 13.0.6 | BlueOak-1.0.0 |
| `node_modules/@capacitor/cli/node_modules/rimraf` | 6.1.3 | BlueOak-1.0.0 |
| `node_modules/@cloudflare/kv-asset-handler` | 0.4.2 | MIT OR Apache-2.0 |
| `node_modules/@cloudflare/unenv-preset` | 2.16.1 | MIT OR Apache-2.0 |
| `node_modules/@csstools/color-helpers` | 6.1.0 | MIT-0 |
| `node_modules/@csstools/css-syntax-patches-for-csstree` | 1.1.6 | MIT-0 |
| `node_modules/@isaacs/cliui` | 9.0.0 | BlueOak-1.0.0 |
| `node_modules/@jest/core/node_modules/jackspeak` | 3.4.3 | BlueOak-1.0.0 |
| `node_modules/@jest/core/node_modules/path-scurry` | 1.11.1 | BlueOak-1.0.0 |
| `node_modules/@jest/reporters/node_modules/jackspeak` | 3.4.3 | BlueOak-1.0.0 |
| `node_modules/@jest/reporters/node_modules/path-scurry` | 1.11.1 | BlueOak-1.0.0 |
| `node_modules/@node-minify/core/node_modules/path-scurry` | 1.11.1 | BlueOak-1.0.0 |
| `node_modules/@node-minify/core/node_modules/path-scurry/node_modules/minipass` | 7.1.3 | BlueOak-1.0.0 |
| `node_modules/@resvg/resvg-wasm` | 2.4.0 | MPL-2.0 |
| `node_modules/ansi-escapes/node_modules/type-fest` | 0.21.3 | (MIT OR CC0-1.0) |
| `node_modules/argparse` | 2.0.1 | Python-2.0 |
| `node_modules/axe-core` | 4.11.2 | MPL-2.0 |
| `node_modules/caniuse-lite` | 1.0.30001778 | CC-BY-4.0 |
| `node_modules/chownr` | 3.0.0 | BlueOak-1.0.0 |
| `node_modules/dompurify` | 3.4.11 | (MPL-2.0 OR Apache-2.0) |
| `node_modules/dot-prop/node_modules/type-fest` | 4.41.0 | (MIT OR CC0-1.0) |
| `node_modules/glob` | 12.0.0 | BlueOak-1.0.0 |
| `node_modules/isexe` | 3.1.5 | BlueOak-1.0.0 |
| `node_modules/jackspeak` | 4.2.3 | BlueOak-1.0.0 |
| `node_modules/jest-cli/node_modules/jackspeak` | 3.4.3 | BlueOak-1.0.0 |
| `node_modules/jest-cli/node_modules/path-scurry` | 1.11.1 | BlueOak-1.0.0 |
| `node_modules/jest-runtime/node_modules/jackspeak` | 3.4.3 | BlueOak-1.0.0 |
| `node_modules/jest-runtime/node_modules/path-scurry` | 1.11.1 | BlueOak-1.0.0 |
| `node_modules/lru-cache` | 11.5.2 | BlueOak-1.0.0 |
| `node_modules/minimatch` | 10.2.4 | BlueOak-1.0.0 |
| `node_modules/minipass` | 7.1.3 | BlueOak-1.0.0 |
| `node_modules/opener` | 1.5.2 | (WTFPL OR MIT) |
| `node_modules/package-json-from-dist` | 1.0.1 | BlueOak-1.0.0 |
| `node_modules/pako` | 2.2.0 | (MIT AND Zlib) |
| `node_modules/path-scurry` | 2.0.2 | BlueOak-1.0.0 |
| `node_modules/rgbcolor` | 1.0.1 | MIT OR SEE LICENSE IN FEEL-FREE.md |
| `node_modules/satori` | 0.15.2 | MPL-2.0 |
| `node_modules/tar` | 7.5.19 | BlueOak-1.0.0 |
| `node_modules/tar/node_modules/yallist` | 5.0.0 | BlueOak-1.0.0 |
| `node_modules/type-fest` | 0.20.2 | (MIT OR CC0-1.0) |
| `node_modules/wrangler` | 4.85.0 | MIT OR Apache-2.0 |
