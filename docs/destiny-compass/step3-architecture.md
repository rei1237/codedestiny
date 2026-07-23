# 운명의 나침반 하우스 — STEP 3 기술설계

> 상태: 설계 문서(코드 아님). STEP 2 컨셉 승인분 기준. 승인 후 STEP 4(UI)로 진행.
> 하드 제약: 계산·결제 경로 무수정, 신규 라우트 `/destiny-compass` 내부만, 3-레이어 역방향 참조 금지, 기존 토큰 재사용.

## 0. 3-레이어 경계 (요약)

```
[Layer 1 계산]  읽기 전용 · 기존 함수만 호출 (무수정)
   ├ 사주:  resolveAnimalTwelveResult() / computeNatalFromInput()  (app/saju/animal-destiny/lib/sajuAdapter.ts)
   └ 타로·숙요·베다·자미: 각 엔진 기존 출력 (STEP5에서 어댑터별 배선)
         │  (조회만, 재계산/덮어쓰기 금지)
         ▼
[Layer 2 해석]  신규 · 100% 결정론
   엔진별 어댑터 → 방향성 스코어 → (감정/답변 렌즈로 재랭크) → DirectionField
         │  (Layer2 산출은 read-only)
         ▼
[Layer 3 연출]  신규
   스코어 밴드 → 나침반 각도 / 안개 해제율 / 캐릭터 표정·배경·BGM / AI 산문(장식)
```

**규칙 기반 vs AI 경계**: 모든 **수치·판정·표정·각도**는 Layer 2에서 규칙 기반 결정론으로 확정. AI는 Layer 3에서 이미 확정된 스코어를 **설명하는 산문만** 생성(값을 만들지 않음). AI 실패 시 결정론 템플릿으로 폴백 → 절대 빈 화면 없음.

---

## 1. 타입 정의 (TypeScript, 전체)

### 1-1. 입력
```ts
// 기존 타입 재사용 (app/saju/animal-destiny/lib/types.ts)
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";

export type EmotionKey =
  | "tired" | "anxious" | "confused" | "hopeful" | "numb" | "excited";

export interface FogAnswer {
  qid: string;          // 질문 식별자
  choice: string;       // 선택지 값 (결정론 시드에 포함)
}

export interface CompassInput {
  birth: AnimalDestinyInput;   // birthDate/birthTime/gender/calendarType/lunarLeap
  emotion: EmotionKey;         // [1] 감정 체크인
  situation?: string;          // [2] 자유 상황 입력 (선택)
  answers: FogAnswer[];        // [2] 안개 걷기 Q&A (3~5)
  dateSeed: string;            // "YYYY-MM-DD" (KST 민용일) — 일 단위 결정론
}
```

### 1-2. 스코어 스키마 (Layer 2 산출)
```ts
export type DirectionKey =
  | "career"       // 직장·커리어
  | "venture"      // 창업·도전
  | "study"        // 공부·성장
  | "relationship" // 인간관계
  | "love"         // 연애
  | "wealth"       // 재물
  | "health"       // 건강
  | "rest";        // 정비·휴식

export type SystemKey = "saju" | "tarot" | "sukuyo" | "vedic" | "ziwei";
export type ScoreBand = "strong" | "steady" | "caution";
export type Weather = "storm" | "fog" | "breeze" | "clear"; // 폭풍/안개/순풍/맑음

export interface DirectionScore {
  key: DirectionKey;
  labelKey: string;                 // i18n 키 (하드코딩 문자열 금지)
  score: number;                    // 0..100 정규화
  band: ScoreBand;                  // score 구간 파생
  contributingSystems: SystemKey[]; // 이 방향을 밀어올린 엔진들
}

export interface TimelinePhase {
  weather: Weather;
  momentum: number;                 // 0..100
  headlineKey: string;              // 짧은 스토리 i18n 키
}

export interface LuckyGuide {       // 이미지 §7·8 (레이더/추천행동)
  avoidKeys: string[];
  recommendKeys: string[];
  luckyPersonKey: string;
  luckyPlaceKey: string;
  luckyColorKey: string;
  luckyFoodKey: string;
  luckyTimeKey: string;
}

export interface DirectionField {
  directions: DirectionScore[];     // score 내림차순 정렬
  primary: DirectionScore;          // 대표 추천 방향
  blockedArea: { key: DirectionKey; labelKey: string; severity: "low" | "mid" | "high" };
  strongArea:  { key: DirectionKey; labelKey: string };
  timeline: { d30: TimelinePhase; d90: TimelinePhase; y1: TimelinePhase; y3: TimelinePhase };
  lucky: LuckyGuide;
  confidence: number;               // 0..1 (별점 = round(confidence*5))
  sources: SystemKey[];             // 실제 소비된 엔진
  seed: string;                     // 결정론 시드(문서화)
  raw: Record<SystemKey, EngineContribution | null>; // 투명성용 원본(연출은 참조만)
}
```

### 1-3. 어댑터 인터페이스 (엔진별)
```ts
export interface EngineContribution {
  directions: Partial<Record<DirectionKey, number>>;        // 각 0..1
  timelineHint?: Partial<Record<"d30" | "d90" | "y1" | "y3", number>>; // 0..1
  dataQuality: number;              // 0..1 (예: timeUnknown → 감점)
}

export interface EngineAdapter {
  system: SystemKey;
  baseWeight: number;               // §3 가중치
  isAvailable(input: CompassInput): boolean;      // 미배선/데이터 부족 시 false
  contribute(input: CompassInput): Promise<EngineContribution>; // 결정론
}
```

### 1-4. 갈림길 / 오늘의 한 걸음 (이미지 §2·§11)
```ts
export interface CrossroadOption {
  id: "A" | "B";
  labelKey: string;
  systemScores: Partial<Record<SystemKey, number>>; // 0..100
  total: number;                    // 가중 합
}
export interface CrossroadResult {
  options: [CrossroadOption, CrossroadOption];
  recommended: "A" | "B";
  confidence: number;               // 0..1
  seed: string;
}

export interface TodayStep {         // 네오 팩폭 실행 과제 1개
  directionKey: DirectionKey;
  actionKey: string;                // 규칙 템플릿 키 (AI 실패 시 폴백)
  aiText?: string;                  // AI 생성 문구(성공 시)
  seed: string;                     // dateSeed 기반 — 하루 1회 회전
}
```

### 1-5. 연출 비트 (VN 스키마 미러 — Layer 3)
```ts
// public/codedestiny-novel.html 의 비트 형태를 그대로 미러(재사용)
export type Speaker = "n" | "yeon" | "pig" | "neo" | "duo";
export interface Beat {
  s: Speaker;                       // 화자
  t?: string;                       // 대사(빈 값이면 연출 전용)
  x?: string;                       // 표정 키 (§4 매핑)
  bg?: string;                      // 배경 키
  bgm?: string;                     // BGM 키
  fx?: string;                      // 이펙트(compassGlow/transform/compassSpin/compassLock)
  goto?: string;                    // 다음 화면 CTA
}
```

---

## 2. 파일 구조 (신규 위주 · 기존 수정 최소)

```
app/destiny-compass/
  page.tsx                     라우트 셸(클라이언트 마운트, 와이드=.wrap 미사용)
  layout.tsx                   metadata + 와이드 컨테이너 + 테마 스코프
  _engine/
    types.ts                   §1 인터페이스 전체
    directionScore.ts          computeDirectionField() 오케스트레이터(결정론)
    lens.ts                    감정/답변 컨텍스트 재랭크(원본 불변)
    lucky.ts                   dayStem+dateSeed → LuckyGuide(결정론 템플릿)
    crossroad.ts               A/B 비교 스코어
    adapters/
      types.ts                 EngineAdapter/EngineContribution
      sajuAdapter.ts           resolveAnimalTwelveResult 소비(READ-ONLY)
      registry.ts              가용 어댑터 + 가중치 재정규화
      # tarot/sukuyo/vedic/ziwei 어댑터는 STEP5에서 read 경로 확정 시 추가
  _stage/
    expressionMap.ts           스코어 밴드 → 캐릭터 스프라이트(기존 매니페스트 참조)
    dialogue/
      beatTypes.ts             Beat 스키마
      prologue.ts              프롤로그 14비트 데이터
    DialoguePlayer.tsx         경량 비트 인터프리터(신규, 파서 가드 내장)
  _components/
    EmotionCheckIn.tsx  FogWalk.tsx  CompassResult.tsx
    Crossroads.tsx      LifeVoyage.tsx  TodayStep.tsx
  _hooks/
    useCompassSession.ts       상태머신[0..5] + 캐싱 + 결정론 키
  data/
    assets.ts                  나침반 히어로 + tea-house/war-room 매니페스트 재수출
  __tests__/
    directionScore.determinism.test.ts   동일 입력 100회 동일 출력
```

**기존 파일 재사용(import만, 무수정)**
- `app/saju/animal-destiny/lib/sajuAdapter.ts` → `resolveAnimalTwelveResult`, `computeNatalFromInput`
- `src/features/fortune-tea-house/data/assets.ts` → `fortuneTeaHouseAssets`, `talkingPigYeoniFrameCrops`
- `src/features/neo-war-room/data/assets.ts` → `neoWarRoomAssets`, `neoWarRoomBgmTracks`
- `styles/theme-tokens.css` → `--cd-*`
- `app/hooks/useCoinGate.ts` → `ensurePaidAccess`

**기존 파일 접촉(후속 서브스텝, 각각 회귀 위험 안내 후)**
| 파일 | 변경 | 이유 | 회귀 위험 |
|---|---|---|---|
| `app/stories/…` | CTA 링크 1개 추가 | 진입점 | 낮음(추가만) |
| `scripts/generate-sitemap.mjs` | 라우트 등록 | SEO 배포 게이트 | 중(미등록 시 배포 실패) |
| `worker/lib/paid-feature-registry.js` + 프론트 레지스트리 | featureKey 등록 | 유료 구간 | 중(결제 정책 가드 통과 필요) |

> 코어 기능 구현에는 **기존 파일 수정 0**. 위 3개는 진입/배포/과금 배선용으로 STEP 5-8 등에서 개별 게이트 처리.

---

## 3. 방향성 스코어 변환 규칙 (가중치 + 근거)

### 3-1. 엔진 가중치
| 엔진 | 가중치 | 근거 |
|---|---|---|
| 사주 saju | **0.40** | 유일하게 **로컬 결정론 계산 정본**이 확정(계산 경로). game_stats·십이운성이 방향에 직접 매핑 → 최고 신뢰 |
| 자미두수 ziwei | 0.20 | 명반 12궁이 삶의 영역(관·재·부처…)과 대응 → 도메인 매핑 자연스러움 |
| 타로 tarot | 0.15 | 현재 시점 momentum에 강함 → timeline 단기 가중 |
| 베다 vedic | 0.15 | 다샤/트랜짓이 장기 흐름(timeline)에 강함 |
| 숙요 sukuyo | 0.10 | 인연·관계 특화 보조 신호 |

**가용성 재정규화 + MVP 범위**: 1차 MVP는 **사주 + 자미두수** 2종만 `isAvailable=true`(실효 가중치 **사주 0.67 / 자미 0.33**). 타로·베다·숙요는 `isAvailable=false`로 제외되며, 각 read 경로 확인 시 승격하면서 가중치가 비율대로 재정규화된다. `confidence = Σ(가용 가중치) × 평균 dataQuality`. (공통 인터페이스 부재라는 STEP1 결론에 대응하는 점진 배선 전략.)

### 3-2. 사주 어댑터 규칙 (구체 — 읽기 경계 확인 완료)
소스: `resolveAnimalTwelveResult(input)` → `.profile.game_stats {power,charm,logic,luck,social}` + `.representativeStage`(십이운성) + `.allStages`.

game_stats(0~100 가정, 정규화) → 방향 기여(0..1):
| 스탯 | 기여 방향(가중) |
|---|---|
| power | venture 0.6, career 0.4 |
| logic | study 0.6, career 0.4 |
| charm | love 0.6, relationship 0.4 |
| social | relationship 0.6, wealth 0.4 |
| luck | wealth 0.5, +전역 부스트 0.5 |

십이운성 → timeline weather + caution(결정론):
| 단계군 | weather | 방향 시그널 |
|---|---|---|
| 장생·목욕·관대·건록·제왕 (상승) | breeze→clear | blockedArea severity=low, venture/career↑ |
| 쇠·병·사·묘·절 (하강) | fog→storm | rest↑, caution↑, severity=mid/high |
| 태·양 (태동) | fog→breeze | study/prep↑ |

`dataQuality`: `timeUnknown === true`면 0.7로 감점(시주 결측). 정상 1.0.

### 3-3. 자미두수 어댑터 (MVP · 구체)
소스: `calculateZiweiChart(input): ZiweiDeepChart` — `app/_lib/ziwei-engine.ts:645` (순수 TS·결정론·양음력 `lunar-javascript`). 타입 `app/_lib/ziwei-types.ts`.
입력 매핑 `AnimalDestinyInput → ZiweiUserInput`: `parseBirthDate`/`parseBirthTime` 재사용 → birthYear/Month/Day·birthHour/Minute·unknownHour, gender→"M"|"F", calendarType, lunarLeap→isLeapMonth. **timezone은 자미 기본값만, 사주 경로 무주입(하드 제약 2).**

12궁 → DirectionKey (코드 `PALACE_MEANING` 근거):
| 궁 | 주 | 부 |
|---|---|---|
| 관록 career | career | — |
| 재백 wealth | wealth | — |
| 전택 property | wealth | rest |
| 부부 spouse | love | — |
| 교우 friends | relationship | — |
| 형제 siblings | relationship | — |
| 천이 travel | venture | career |
| 자녀 children | venture | — |
| 질액 health | health | — |
| 복덕 fortune | rest | health |
| 부모 parents | relationship | study |
| 명궁 ming | 전역 부스트 | — |
| 문창·문곡 | study | — |

산출: 궁 `score`(10~95)→0..1 정규화, 주 1.0·부 0.5 배분. 사화 보정(화록→부스트, 화기→caution·`blockedArea` 후보, 화권→career, 화과→study). `majorPeriods`(대한)→y1/y3, `annualFlow`(유년)→d30/d90. `unknownHour`→dataQuality 0.75.

### 3-4. 타로·숙요·베다 어댑터 (확장, 미배선)
공통 read 인터페이스가 없고 결정론 출력 shape 미확인이라 **지금 구체화하지 않는다**(추측 배제). §1-3 `EngineAdapter` 계약만 유지, `isAvailable=false`로 자동 제외. 각 read 경로 확인 시 승격:
- 타로: 스프레드 카드 → momentum/timeline
- 베다: 다샤/하우스 → timeline·domain
- 숙요: 27숙 인연 → relationship/love

### 3-4. 감정/답변 렌즈 (Layer 2.5, 원본 불변)
`emotion`·`answers`·`situation`은 운세 계산값이 아니라 **사용자 맥락**이다. 3-레이어 규칙(연출→해석 역참조 금지)을 지키기 위해, 이 값들은 엔진 기여(`raw`)를 **변경하지 않고** 최종 `directions` **랭킹/주목도만** 결정론적으로 재조정한다:
- 질문 의도(answers)로 관련 방향 가중(예: 이직 질문 → career/venture 전면).
- emotion=tired/numb → 톤 완화 + rest 노출↑(점수 자체는 불변, 표시 우선순위만).
`raw`는 그대로 보존해 투명성/디버깅 확보.

---

## 4. 캐릭터 표정 매핑 테이블 (실제 에셋)

> 신규 파일명 생성 없음 — 기존 매니페스트 export를 참조. 밴드/상황 → 스프라이트.

### 꽃돼지 (힐링, `fortuneTeaHouseAssets` / `talkingPigYeoniFrameCrops`)
| 상황·밴드 | 표정 키 | 참조 |
|---|---|---|
| 환영/진입 | `welcome` | `talkingPigYeoniFrameCrops.welcome` (talkingPig1 crop 34,20,266×338) |
| 위로/공감 (caution·emotion=tired) | `comfort` | `talkingPigYeoniFrameCrops.comfort` (340,20) |
| 해설/생각 (steady) | `thinking` | `talkingPigYeoniFrameCrops.thinking` (talkingPig2 38,24) |
| 긍정/강함 (strong) | `honey` / `surprised` | `talkingPigYeoniFrameCrops.honey` / `.surprised` |
| 기본 대기 | `base` | `fortuneTeaHouseAssets.pig.transparent.base1` / `.base8` |
| 변신 연출 | `transform` | `fortuneTeaHouseAssets.pig.transparent.transform` |

### 연이 (수달 내레이터, `fortuneTeaHouseAssets.yeoni.transparent`)
| 상황 | 참조 |
|---|---|
| 등장/내레이션 | `.sprite1` / `.sprite2` |
| 안내/대기 | `.sprite6` (waiting) |
| 전환/지목 | `.sprite7` |

### 네오 (팩폭, `neoWarRoomAssets`)
| 상황·톤 | 표정 키 | 참조 |
|---|---|---|
| 등장/무심 | `deadpan` | `neoWarRoomAssets.sprites.transparent[0]` (배경없음1) |
| 도발/스마크 | `smirk` | `.sprites.transparent[1]` |
| 진지/직언 (severity=high) | `serious` | `.sprites.transparent[2]` |
| 격려/마무리 | `soft` | `.sprites.transparent[3]` / `[4]` |
| 등장 히어로컷 | `main` | `neoWarRoomAssets.hero.strategyNeoMain` |

> ⚠️ 네오 transparent 프레임의 표정↔번호 대응은 매니페스트에 라벨이 없다(“표정 스프라이트 N”만). STEP 4/5에서 **실제 이미지 육안 확인 후 확정**(추측 배정 금지). 필요 시 16표정 시트 `sprites.strategyNeo`의 셀 % 맵을 노벨 `NEO_CELL`에서 추출해 확장.

### 배경 / BGM / 히어로
| 구역 | 배경 | BGM |
|---|---|---|
| 찻집(핑크) | `fortuneTeaHouseAssets.backgrounds.interiorDesktop1` / `interiorMobile1` | 찻집·연이 계열 (**URL STEP5 확정**, 노벨 트랙 재사용) |
| 전략실(퍼플) | `neoWarRoomAssets.backgrounds.desktop` / `mobile` | `neoWarRoomBgmTracks.moonlitWarRoom` (White Lion, vol 0.26) |
| 공통 히어로 | `https://assets.code-destiny.com/네오와 연이의 운명 나침반.webp` (확정) | — |

---

## 5. AI 호출 지점 + 프롬프트 설계 + 폴백

### 5-1. 규칙 기반(=AI 없음) vs AI 경계
| 항목 | 처리 |
|---|---|
| 방향 스코어·밴드·나침반 각도·안개 해제율·표정·weather·lucky·갈림길 총점 | **규칙 기반 결정론(Layer 2)** |
| 꽃돼지 나침반 해설 산문 | AI(선택) |
| 네오 “오늘의 한 걸음” 실행 과제 문구 | AI(선택) |
| 갈림길 A/B 서술, 삶의 항로 구간 스토리 | AI(선택, 유료) |

AI는 **확정된 `DirectionField`를 근거로 설명만** 한다(값 생성·변경 금지).

### 5-2. 인프라 / 프롬프트
- 클라이언트 결정론 결과 즉시 렌더 → 유료·심화 산문만 워커 경유 생성.
- 엔진: `lib/llm-client.ts`(Gemini 2.5-flash). 실패 시 CLAUDE.md 규칙대로 Workers AI(`@cf/meta/llama-3.1-8b-instruct`) 폴백.
- JSON 출력 시 `thinkingBudget:0`(잘림 방지 — 기존 사례).
- system 프롬프트: 캐릭터 보이스(꽃돼지 힐링/네오 팩폭·애정) + 톤 금지(단정 예언·불안 조성·비하·의료/법률/투자 단정). user: `DirectionField` 사실 + emotion + question. 출력: 짧은 산문.

### 5-3. 폴백 (빈 화면 절대 금지)
AI 실패/타임아웃 시, 스코어에서 **결정론 템플릿**(방향×밴드×weather 키로 사전 작성된 문구 뱅크)을 렌더. 유료 결과는 “degrade-not-throw”(생성 실패해도 결정론 본문은 항상 전달). `hasRenderableText` 가드로 판정.

---

## 6. 캐싱 전략 (동일 사용자/날짜 재계산 방지)

- **결정론 키**: `hash(birth + emotion + answers + dateSeed)`.
- **Layer 2 결과**: 모듈 `Map` 인메모리(사주 `RESULT_CACHE` 패턴 동일) + `sessionStorage`(새로고침 보존). 동일 키 → 재계산 0.
- **AI 산문**: `(키 + 섹션)`별 캐시. 재열람 시 재호출 없음. 서버측은 유료 unlock/entitlement 레코드에 생성물 저장 → 재열람 무료·즉시(기존 Sibyl 캐시 패턴). opt-in `lib/llm-cache.ts` 활용 가능.
- **dateSeed**: KST 민용일(YYYY-MM-DD). “오늘의 한 걸음”은 dateSeed로 **하루 1회 결정론 회전**(랜덤 아님, 문서화된 시드).

---

## 7. 결정론 보장 & 리스크 대응
- Layer 2 전 구간 `Date.now()`/`Math.random()` 금지. 시간 의존은 `dateSeed`(명시 주입)만.
- `__tests__/directionScore.determinism.test.ts`: 동일 `CompassInput` 100회 → 동일 `DirectionField`(deep equal).
- DialoguePlayer: 비트 데이터는 정적 `.ts` 상수 + 스키마 검증 가드(노벨의 skill-비트 오타 백지 전례 방지). 렌더 전 `validateBeats()`로 미지원 speaker/fx 걸러 로그.
- 계산 경로 무변경: `sajuAdapter.ts` 등은 import만. STEP 6에서 `git diff` 무변경 증명.
