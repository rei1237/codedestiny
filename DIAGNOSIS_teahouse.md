# 운명 찻집(연이) 결과 리포트 품질 진단서

> 대상: 운명 찻집 내 타로 · 사주 · 숙요점 3기능 한정.
> 작성일: 2026-07-10. 라인 번호는 수정 전 기준(이후 커밋에서 이동될 수 있음).
> 아키텍처 요약: 세 기능 모두 `worker/routes/fortune-tea-house.js`의 **자기완결 프롬프트**(공유 `worker/lib/fortune-question-prompt.js` 미사용)로 생성되고, 프런트는 `TeaHouseResultSheet.tsx`가 고정 JSON 스키마(`FortuneTeaHouseConsultResponse`)를 필드별로 렌더한다. LLM 실패 시 클라 결정론 경로(`src/features/fortune-tea-house/lib/buildConsultResult.ts`)가 같은 스키마를 채운다.

---

## 1-A. 중복(Redundancy) 진단

### 근본 원인 — 프롬프트가 중복을 "요구"하는 구조 (P1)

| # | 위치 | 내용 | 심각도 |
|---|------|------|--------|
| A1 | `worker/routes/fortune-tea-house.js:2784` `categorySectionRule` | **"requiredDeepSections의 의미가 결과 필드 전반에 모두 드러나야 한다. … 누락된 주제가 있으면 실패다."** — 필수 섹션 주제를 모든 출력 필드에 퍼뜨리라는 명시 지시. 관찰된 모든 문장 단위 중복의 증폭기. | **P1** |
| A2 | 같은 파일 2778–2781 + 264 | **행동/금지 조언이 5곳에서 중복 요청됨**: 필수섹션("재회 가능성을 닫는 행동"+"오늘 하지 말아야 할 행동 3가지"+"7일 행동 플랜", 264행) + `yeoniReading.advice`("해야 할 행동과 피해야 할 행동을 분리한다", 2778) + `yeoniReading.caution`(2779) + `choiceSimulation`("각 단계의 행동…조심할 점", 2780) + `actionPrescription`("행동과 하지 말아야 할 행동 4-6문장", 2781). → 사용자가 관찰한 "일방적 연락 금지·침묵 존중" 문구 3회+ 반복의 직접 원인. | **P1** |
| A3 | 같은 파일 2773+2777+2785 | **카드 의미 4겹 재기술**: `tarot.reading`("카드명·방향·키워드·전통 의미…연결") + `yeoniReading.main`("카드별 해석의 핵심…전통 의미와 이번 질문 의미") + `cardByCardRule`(포지션별 traditionalMeaning 반영) + 스프레드 카드 `reading`. → "은둔자 역방향=고립, 컵4=정체"가 섹션마다 재정의되는 원인. | **P1** |
| A4 | 같은 파일 2774–2775+2777 | **전체 흐름 요약 3겹**: `synthesis.summary` + `synthesis.sajuTarotBridge` + `yeoniReading.main`이 모두 "전체 흐름"을 다시 쓰게 지시. | P2 |
| A5 | 사주 2719–2728 `resultFlow` | `requiredDeepSections`(154행 등)와 같은 8단 아크를 **병렬로 재기술** — 같은 출력에 두 벌의 섹션 명세. 행동 플랜은 필수섹션 "찻집의 처방"+`choiceSimulation`(2895)+`actionPrescription`(2896)+`oneLineAdvice`로 ~4회 요청. | P2 |
| A6 | 클라 결정론 폴백 | `buildTarotChoiceSimulation`(buildConsultResult.ts:456–472)의 caution이 전역 금지문구(`profile.avoidAction`)를 재반복, 워커 `buildCategorySajuDeepSections`(fortune-tea-house.js:1746대)는 `angleGuides`/`actionGuides` 배열을 `index % length`로 순환 재사용해 폴백 자체가 섹션 간 동일 문구를 반복. | P2 |

### 중복 지도 — 정본(canonical) 배정 (보수적 방침: 커버리지·게이트 유지, 반복만 금지)

| 내용 유형 | 정본(유지) | 축약/반복금지 |
|---|---|---|
| 카드별 의미(카드명·방향·전통의미) | 스프레드 카드 `reading` + `tarot.reading` 오픈멘트 | `yeoniReading.main`은 카드 재정의 금지 → 카드들이 함께 만든 이야기+질문 연결만 |
| 전체 흐름 종합 | `synthesis.summary`(+bridge) | `yeoniReading.main`과 중복 금지 |
| 할 것/하지 말 것·금지 행동 | `actionPrescription` (구체 행동·금지의 유일한 집) | `advice`=방향 제시(행동목록 X), `caution`=감정 위험 신호만, `choiceSimulation.caution`=선택지 고유 리스크만 |
| 단계/기간 플랜 | `choiceSimulation` | 다른 필드에서 단계 재나열 금지 |

**정당한 반복으로 인정(유지)**: 카드명·방향이 여러 섹션 헤더/한 줄 언급으로 등장하는 것(앵커 게이트 `assertTarotAnchorCoverage`가 요구), 필수섹션 제목 자체.

---

## 1-B. 데이터-본문 정합성 진단

### P0 — 타로 스프레드 첫 카드: 헤더(카드명·방향) ≠ 해설 본문

- **분기점**: `src/features/fortune-tea-house/lib/buildConsultResult.ts:684-691` `safeBuildTarotSpreadCards`.
  ```ts
  { ...first, ...representative, positionId: first.positionId, …,
    reading: first.reading || `…` }
  ```
  `...representative`(대표 카드 스냅샷)가 첫 스프레드 카드의 **정체성(cardId·nameKo·orientation·keywords·meaning)만 덮어쓰고**, `reading`은 `first.reading`(원래 뽑힌 **다른 카드 A**의 문장, tarotAdapter.ts:159에서 A의 이름·방향·키워드로 생성)이 항상 truthy라 그대로 남는다. 폴백 문자열은 사문(死文).
- **뽑기 소스 분리**: 대표=`drawTarotCard(seed)` vs 스프레드 0번=`drawTarotCard(\`${seed}:spread:0\`)`, 방향도 각각 독립 해시(tarotCards.ts:849-855, tarotAdapter.ts:121-145) → 첫 카드에서 카드/방향이 갈릴 확률이 구조적으로 높음.
- **증상**: 결과 화면 `TeaHouseResultSheet.tsx:500-506`에서 헤더 `<strong>{card.nameKo} · 정/역방향}` 은 대표 카드, 바로 아래 `<LlmParagraphs text={card.reading}>`는 카드 A 해설. 카드 갤러리(478-497)·공유 txt(121-124)에도 동일 전파. **사용자 관찰 "UI 카드=은둔자 역방향인데 본문은 다른 카드 설명"과 정확히 일치.**
- **게이트 3중 공백(생존 이유)**:
  1. `validateConsultResult.ts` `ensureConsultResultConsistency` — `result.tarot`(대표)만 재동기화, `tarotSpreadCards` 미검사.
  2. 워커 `assertTarotAnchorCoverage`(fortune-tea-house.js:376-394) — 대표 카드명·방향만 검사, 검사 대상 joined 텍스트에 스프레드 `reading` 미포함.
  3. `mergeLlmResult`(2248) — `tarotSpreadCards: fallback.tarotSpreadCards` 그대로 통과(LLM은 preserveExactly로 재작성 금지).
- **수정 방침**: 첫 카드 정체성=대표 유지(시각 일관성), `reading`을 항상 대표 기준으로 재생성 + `ensureConsultResultConsistency`에 스프레드[0] 재동기화 가드(기저장 오염 결과 방어).

### P1 — 숙요점 방향 라벨(typeAToB/typeBToA) 체계적 왜곡·정본 불일치

- **정본**: `worker/lib/sukuyo-ai-calculation.js:53-68` `relationFromForwardDistance` — d=0 명, d=9/18 업태, {1,10,19}/{8,17,26} 영친, {2,11,20}/{7,16,25} 우쇠, {3,12,21}/{6,15,24} 안괴, {4,13,22}/{5,14,23} 위성. `buildSukuyoAiCompatibility`가 `aRole`/`bRole`(예: 영/친)까지 이미 반환(:152-153).
- **결함**: 표시·프롬프트 층은 정본을 버리고 별도 12항 표를 씀 — 클라 `relationByDirectionalDistance`(sukuyoCompatibilityAdapter.ts:238-246, `SUKUYO_RELATION_12`:79-92) / 워커 `fortuneTeaSukuyoRelationByDistance`(fortune-tea-house.js:659-666, `FORTUNE_TEA_SUKUYO_RELATION_12`:516-529). 인덱스가 `Math.min(normalized, 11)`이라:
  1. a≠b면 forward+reverse=27이므로 **큰 쪽 방향(≥14)은 항상 인덱스 11 = "비(非)·이질적 공존"으로 고정** — 거의 모든 쌍에서 한쪽 방향 라벨이 무의미.
  2. 12항 표 자체가 정본과 불일치: d=1을 표는 "위(危)·날카로운 긴장"으로 라벨하지만 정본은 d=1=**영친**. → 화면에 `relationType=영친`과 `typeAToB=위(危)`가 나란히 떠 **자체 모순** 노출.
- **전파 범위**: 요약문(summary)·strengths[2]·adviceKeywords·relationDetail(워커 788, 819-824, 844, 852 / 클라 380, 411-416, 436, 444) + LLM factInput(`buildSukuyoFactInput`:1675-1676) + 결정론 폴백 문장(buildConsultResult.ts:506-509).
- **수정 방침**: 12항 표 폐기, 정본 `aRole`/`bRole`(이미 계산됨) + 역할 의미 테이블을 **공유 모듈(sukuyo-ai-calculation.js)에 추가**해 클라·워커 동일 소스 사용(이중 구현 드리프트 제거).

### P2 — 숙요 이중 구현(클라 어댑터 ↔ 워커 라우트)

거의 동일한 빌더가 두 벌(관계 가이드·거리 가이드·점수 로직) — 정상 경로에선 워커 값이 이기지만 로컬 프리뷰 폴백에서 클라 값 노출. 이번 수정에서 방향·거리 신규 로직은 공유 모듈에 두어 추가 드리프트를 막는다(기존 중복 전면 통합은 범위 외).

---

## 1-C. 설명 부족(전문성 격차) 진단

### 타로 — 배치·순서 분석 데이터가 프롬프트에 없음 (P1)

- 프롬프트는 요구: `thinkingOrder`(2762-2769) "메이저/마이너 비율, 수트 편중, 코트 카드…카드의 숫자와 원소(불/물/공기/흙) 상호작용", `resultFlow`(2756).
- 그러나 `buildTarotFactInput`(1555-1601)의 spreadCards엔 카드명·방향·키워드·전통의미·위치라벨뿐 — **비율·수트·원소·서사 데이터 전무**. 덱 타입 `TeaHouseTarotCard`(tarotCards.ts:30-38)에 suit/arcana/element/rank 필드 자체가 없음. 모델에게 "입력에 없는 사실을 추론하라"고 시키는 구조.
- 기존 분석 엔진 사장(死藏): `analyzeSpreadCards`/`relationshipSignals`(app/tarot/prompt-maker/utils/buildOraclePrompt.ts:604-654, 672-692)는 비율·편중·첫→마지막 서사를 이미 계산하지만 찻집 3/5장 경로엔 미배선. 1장 경로가 만든 `topicReadingSeed`(tarotAdapter.ts:104)는 **소비처 0곳** — 죽은 데이터.
- 개선: cardId(`minor_wands_03` 패턴)+number에서 arcana/suit/element/rank를 파생하는 순수 함수 → `spreadDigest`(비율·편중·코트·정역비·원소 구성·위치 서사·긴장쌍)를 factInput에 실고, 프롬프트가 "추론" 대신 digest를 인용하게 전환.

### 숙요점 — 거리 4버킷 평탄화·방향 비대칭 미사용 (P1~P2)

- `distanceRule`(2853)은 3구간 정적 1문장, `distanceGuide`(1603-1609)는 shortest 기반 4버킷뿐. forward/reverse **실수치**(끌림 간격 vs 회복 간격의 비대칭)가 어떤 문장에도 반영 안 됨 — cautions의 "속도가 다를 수 있음"(워커 848)은 근거 없는 일반 단정.
- 개선: forward/reverse 실수치+역할(aRole/bRole) 기반 방향별 거리 가이드를 공유 모듈에 신설, factInput.relation에 방향별 해석 필드 추가, distanceRule을 forward≠reverse 구분 규칙으로 확장.

### 사주 — factInput 다수 필드가 빈 문자열로 전달 (P1)

- `buildSajuFactInput`(1500-1553)은 `monthBranch/season/stemRelations/branchRelations/daeun/seun/wolun` 등 키를 읽으려 하지만, 클라 스냅샷 `buildFortuneTeaSajuSnapshot`(sajuAdapter.ts:394-447)이 그 필드를 **만들지 않아**(엔진 `buildSajuProfile`이 계산한 daewoon·월지조차 버림) `monthSeason`·`stemBranchRelations`·luck 계열이 대부분 빈 문자열. 시스템 프롬프트(2620)와 `thinkingOrder`는 "월지 계절·합충형해파·대운"을 근거로 쓰라고 지시하지만 **모델에 데이터가 안 감** — "설명 부족"의 구조적 원인.
- 독립 "AI 사주 생성" 기능(worker/lib/saju-ai-prompt.js)은 같은 워커 번들에 지장간 투간/투출·도충·개고·십성 확정표(`buildFixedTenGodTable`)·명식 사실 스냅샷(`buildSajuMyeongsikFactSnapshot`, export됨) 등 순수 파생 함수를 보유 — pillars(한글 간지 입력 허용: `normalizeStem`의 KO 매핑 확인됨)만 있으면 동작.
- 개선: ① 스냅샷에 monthBranch/season/지지관계/대운 필드 보강(클라 어댑터), ② 워커 factInput에서 saju-ai-prompt.js 순수 파생 재사용(지장간·투간·개고·도충·십성 확정표), ③ 프롬프트 evidence 순서에 신규 사실 인용 지시.
- **범위 외(후속 제안)**: 조후·종격·억부+조후 결합 용신은 클라 3만줄 엔진(`js/saju-engine.js`)의 산출(`power/johu/jong`)에 의존 — 서버 포팅은 별도 프로젝트로 분리. 이식 시 `buildSajuMyeongsikFactSnapshot`의 johu/power/jong 파라미터에 그대로 연결 가능.

---

## 환영 인사 순서 진단

- "어서 오세요"는 `yeoniReading.intro`에 담기는데, 렌더 순서상 intro가 포함된 "연이가 이어 읽은 …의 결" 섹션(TeaHouseResultSheet.tsx:585-629)은 요약 그리드(405)·우선순위 스트립(446)·찻잔(459)·타로 쇼케이스(474)·종합(512)·감정 게이지(551) **뒤 — 화면 7번째 블록**. 첫 화면 좌측 패널은 오히려 감사 인사("오늘 함께 찻잔을 열어줘서 고마워요", 253행)라 환영과 역순.
- 채택안(사용자 확정): **인트로만 상단 승격** — 헤더(397-403) 직후에 "연이의 첫 인사" 블록 신설, 기존 중간 위치의 intro 렌더는 제거. 프롬프트(타로 2776·숙요 2837 fieldStructure, 공통 규칙)와 결정론 폴백(buildConsultResult.ts:447, 804, 929)에 "intro는 어서 오세요 류 환영 인사로 시작" 정렬.

---

## 심각도 요약

| 등급 | 항목 |
|---|---|
| **P0** | 타로 스프레드 첫 카드 정체성↔본문 불일치 (buildConsultResult.ts:684-691 + 게이트 3중 공백) |
| **P1** | 숙요 방향 라벨 모순(12항 표 + min(,11) 클램프) / 중복 증폭기 categorySectionRule + 행동조언 5중 요청 + 카드의미 4겹 / 타로 spreadDigest 부재 / 사주 factInput 빈 필드 |
| **P2** | synthesis↔main 요약 중복, 사주 resultFlow 이중 명세, 결정론 폴백 순환 반복, 숙요 이중 구현 드리프트, 환영 인사 매몰(UX) |

## 수정 계획 요약 (승인된 플랜 기준)

1. **P0/P1 정합성**: 첫 스프레드 카드 reading 대표 기준 재생성 + validate 가드 / 숙요 방향 라벨 정본화(공유 모듈).
2. **중복 제거(보수적)**: categorySectionRule 반전("한 주제=한 필드, 반복도 실패") + fieldStructure 소유권 명시(타로·숙요) + 사주 반복금지 1줄 + 폴백 반복 경감. 필수섹션·글자수·requiredTerms 게이트 유지.
3. **환영 인사**: intro 상단 승격(렌더) + 프롬프트/폴백 "어서 오세요" 정렬.
4. **전문성 심화**: 타로 spreadDigest, 숙요 방향·거리 실수치 가이드, 사주 factInput 파이프 수복+독립 기능 순수 파생 이식.
