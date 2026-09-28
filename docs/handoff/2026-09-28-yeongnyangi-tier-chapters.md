---
status: blocked
updated: 2026-09-28
next: "Phase 3(검증기)·§6-7(UI) 완료, 플래그 OFF. 다음은 Phase 4 골든인데 유료 LLM 생성이라 **네오의 정확한 1회 승인 없이는 진행 불가**(절대 규칙 1). Phase 5(플래그 ON)는 Phase 4 의 원가·품질 실측에 의존하므로 함께 막혀 있다. 승인 시 범위: 골든 fixture 로 연어·광어·참치 각 1권 실호출, 토큰·원가 실측으로 reading-v7-cost.ts 추정치 교체, 반복 지표 전후 비교."
---

# 영냥이 티어별 챕터 확장·반복 제거 인수인계 (Phase 0 진단·Phase 1 설계 완료)

## 요구 (원문 요지)

- 브리프: "영냥이 사주·운세 — 가격 티어별 챕터 확장 & 반복 제거 프롬프트".
  - 고등어보다 비싼 티어는 장당 분량을 늘리지 않는다. 대신 **고유 주제·고유 근거를 가진 장**을 더한다.
  - 영역 순서: 연애 → 결혼·배우자 → 재물 → 직업 → 대인관계·가족 → 건강 → 운의 시기.
  - 반복은 구조로 막고 자동 검증한다. 고등어는 스냅샷으로 불변을 증명한다. "글자수는 결과일 뿐 목표가 아니다."
  - 게이트: Phase 0 진단 → 승인 → 1 카탈로그 → 승인 → 2 Wave → 승인 → 3 검증기 → 4 골든 → 승인 → 5 플래그·롤백 문서.
  - ChapterSpec: `{id, minTier, titleKey, owns, mustNotCover, evidenceInputs, mustCover, minInsightUnits, timingRef}`. 인사이트 단위 = 현상 + 근거 + 조건/시기 + 행동.
- 사용자 보충: "다른 운세 기능이라는 것은 타로, 자미두수, 숙요점, 점성술, 베다점을 의미하는것이므로 이 부분을 참조해서 정확한 데이터를 통해서 봐줄 수 있도록 해줘". 사주를 포함한 6체계 모두 각 엔진이 실제로 계산한 데이터에만 근거한다.
- 브리프 불변식 가운데 저장소 규칙과 부딪힌 것은 [CONTEXT_AUDIT](../CONTEXT_AUDIT.md) "2026-09-28 영냥이 티어별 챕터 브리프" 절에 해소를 기록했다.

## 결정 (네오, 2026-09-28 — 네 개 모두 추천안)

- ① **원가율은 10% 이하**로 한다. 연어·광어·참치 각각에 적용하고, 재시도를 포함한 평균이다. PG 수수료는 따로 센다. 고등어는 바꾸지 않으므로 예외다.
- ② **반복 측정은 운영 완료본을 읽기 전용으로** 한다(₩0). 본문은 저장·출력하지 않고 지표만 남긴다. 전후 비교용 유료 생성은 Phase 4 골든 승인 때 한 번에 한다.
- ③ **숙요·타로는 근거 용량만큼만** 장을 둔다. 참치도 약 8~10장(추정)이 될 수 있다. "티어가 오를수록 장이 늘어난다"는 체계 안에서만 보장한다.
- ④ **1차 범위는 단일 체계 해석·물어보기**다. 집중형(`focused`)과 퓨전 v5 는 다음 사이클로 미룬다.

## Phase 1 결과 (2026-09-28, 네오 승인 — 결정 7개 모두 추천안)

- **설계 정본은 [yeongnyangi-v7-chapter-catalog](../design/yeongnyangi-v7-chapter-catalog.md)** 다. 카탈로그 표·원장 하위 ID 규칙·분기 위치·원가 산술·Phase 2 순서는 거기에만 둔다. 이 문서의 "Phase 1 방향"과 다르면 설계 문서가 우선한다.
- 이번 세션 변경: 코드 0. 설계 문서 신규 + 이 문서 갱신만 커밋했다. 과금 LLM 0회, 실결제 0, DB 접근 0.
- 승인된 결정
  1. 재시도 계수 **1.25**. 설계 상한은 연어 8장·광어 13장·참치 26장이다(물어보기 8문항 최악 포함, 모두 10% 이하).
  2. v6/v7 분기는 **상담 종류 단위**로, `consultationManifest`(`consultation-kinds.ts:38`) 첫 줄에 둔다. 플래그 OFF 면 fingerprint·orderId 가 바이트 동일해야 한다. `catalog.ts`·가격·결제 경로는 건드리지 않는다.
  3. 즉시 롤백용 바인딩 자리는 **두지 않는다**. 활성화 커밋 revert + 승격으로 충분하다.
  4. 시기 장은 **기간별로 나누고 소유는 겹치지 않게** 한다. 아래 방향 6("시기는 체계당 한 장")을 대체한다. 시기 장 수는 사주 1/2/6, 자미 1/2/4, 베다 0/0/4(연어/광어/참치)다.
  5. 공개 티어 표(`app/yeongnyangi/1000-won-fortune/page.tsx:171`)의 장 수·분량 약속은 **플래그를 켜는 커밋(Phase 5)** 에서 v7 값으로 바꾼다. v7 참치는 "40,000자 이상"을 지킬 수 없다.
  6. 점성술은 **광어 10장·참치 12장**으로 v6(11·15장)보다 적게 둔다.
  7. 시간 미상 연어 사주의 올해 장은 **v7 전용 시간 무관 세운(Y·Y+1)** 으로 채운다. `saju/index.ts` 와 v6 사실은 바꾸지 않는다.
- 장 수(연어 / 광어 / 참치, 장당 목표 1,800~2,200자·하한 1,400자)

| 체계 | 장 수 |
|---|---|
| 사주 | 8 / 13 / 24 |
| 자미 | 8 / 13 / 20 |
| 베다 | 8 / 13 / 23 |
| 점성술 | 8 / 10 / 12 |
| 숙요 | 6 / 8 / 10 |
| 타로 연애 · 선택 | 5 / 7 / 9 · 4 / 5 / 6 |

- 설계가 새로 짚은 것(Phase 2 에서 지킬 것)
  - `providers/chapter.ts:125-130` 의 `evidence` 블록 요구를 v7 분기로 바꾸지 않으면 모든 v7 장이 `CHAPTER_EVIDENCE_INCOMPLETE` 로 떨어진다.
  - `READING_V7_VERSION` 을 `hasReadingSections` 에 등록하지 않으면 비구조화 경로로 떨어진다.
  - 하위 ID subkey 는 ASCII 슬러그만 쓴다. `redactInternalEvidence`(`consultation.ts:192`)가 ASCII `\w` 만 이어 붙이기 때문이다.
  - `paid-flow-gates.yml` 은 `worker/yeongnyangi/**` 변경으로 돌지 않는다. fingerprint 불변을 지키는 것은 Phase 2 첫 커밋의 스냅샷 테스트(메인 CI) 하나뿐이다.
  - 승인 뒤 엔진 필드 전수 조사(읽기 전용)와 대조해 설계 문서의 사실 네 곳을 고쳤다. 장 수·목차·결정은 그대로다.
    - 신살은 12종이고 공망이 있다(`saju-shinsal.js:492-507`). 참치 signals 장이 10종을 가진다.
    - 사주·자미는 모든 티어에서 성별이 필수다(`input.ts:47-48`). 연어에서 빠질 수 있는 것은 사주 시간·장소, 자미 장소뿐이다.
    - 시기 래퍼는 정규화 입력이 필요한데 스냅샷에 없다(`service.ts:157`). 매트릭스는 prepare 에서 계산해 저장한다.
    - 원장은 소한 `baseYear`(출생연도)를 싣지 않는다.
  - 플래그 ON 때 함께 고칠 테스트 3개(`yeongnyangi-reading-v6`·`section-paragraphs`·`consultation-kinds`)는 설계 §6 끝에 있다.

## Phase 2 커밋 1 결과: 불변 스냅샷 (2026-09-28)

- 파일: `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`(테스트만, 제품 코드 0). 커밋 `5aa267a24`(main CI `CI required` success, 새 테스트 CI 실행 33.9초 실측).
- 과금 LLM 0회, 실결제 0, DB 접근 0. 공급자·DB·큐·저장소는 esbuild onLoad 로 스텁했고, 물어보기 분석은 `analyzeAsk` 의 규칙 폴백(`source:'rules'`)을 쓴다.
- 결정성: `TZ=UTC`, `Date` 를 2026-09-28T03:00Z 로 고정, `Math.random`·`crypto.getRandomValues` 는 케이스마다 같은 시드(mulberry32)로 바꾼다. 2회 연속 실행 해시 동일(실측).
- 행 = 상품 × 상담 종류(레거시 무종류 포함) 118행 + 변형 5행(연어 사주 시간 미상 해석/물어보기, 장소 없는 연어 자미 해석/물어보기, 고등어 영감) = 123행. 한 행은 12자리 해시 다섯 개다.
  1. id: 요청 `_id`(orderId 의 원천).
  2. prepare: fingerprint·금액·productId·featureKey·체크포인트 버전·스냅샷 키·상품·매니페스트·consultation·분석 키·체계별 사실 ID 목록. **사실 값은 넣지 않는다**(엔진 변경 흔들림 축소).
  3. requests: 장마다 `StructuredChapterProvider.generateChapter` 가 공급자에 넘기는 요청 전체의 정규 JSON(키 정렬).
  4. validated: 장마다 `validateChapter` 결과 또는 에러 코드.
  5. manifests: `consultationManifest(상품, 종류, 주제)` 를 `topicIds` 전부에 대해(변형 행은 `-`).
- mock 본문: 기존 `MockChapterProvider` 에, 그 장에 배정된 질문에만 결정적 `questionAnswers`(물어보기는 `limited`·빈 F/T)를 붙인다. 그래서 질문형 1장도 실제 검증을 통과한다. **영감 모드만** `SPIRIT_EVIDENCE_MISSING` 에러 코드로 고정된다. 영감 인용 규칙은 `yeongnyangi-spirit.test.mjs` 가 따로 검증한다.
- 무는지 확인(변이 후 원복, 실측): fingerprint 의 `kindVersion` 1→2, 장 프롬프트 문구 한 글자, 질문 답변 최소 길이 10→40. 셋 다 실패로 잡혔다.
- 실행 시간은 약 30초다(로컬, 1,000여 mock 장).
- 해시 재생성: `YEONGNYANGI_INVARIANCE_PRINT=1 node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/yeongnyangi-reading-invariance.test.mjs` 로 표를 찍어 `EXPECTED` 를 바꾼다. **의도한 변경일 때만** 쓴다.
  - Phase 2 §6-2~6(플래그 OFF)에서는 한 행도 바뀌면 안 된다.
  - Phase 5(플래그 ON)에서는 연어·광어·참치의 `personal`·`ask`·타로 행만 바뀌어야 한다. 고등어 전부, 집중형·timing·퓨전·레거시·영감 행은 그대로여야 한다.
- 빠진 것: question-sky 모드, 비한국어 로케일(영감·질문 모드는 ko 전용), repair 재시도 입력.
- 위험: 엔진·프롬프트·카탈로그를 v7 과 무관하게 정당하게 고치는 다른 세션도 requests 해시를 깨뜨린다. 그 세션은 원인이 자기 변경인지 확인한 뒤 위 명령으로 갱신한다.

## Phase 2 커밋 2 결과: reading-v7.ts + 정적 가드 (2026-09-28)

- 커밋 `c97fb52b2`(main CI `CI required` success, run 36355525697). 과금 LLM 0회, 실결제 0, DB 접근 0. 플래그 `READING_V7_ENABLED=false`이고 v7 을 부르는 경로가 없다.
- 파일
  - `worker/yeongnyangi/fortune/reading-v7.ts`
    - 카탈로그 `v7Catalog`(키 = 체계, 타로는 `tarot:love`·`tarot:choice`), `V7_PARTS`·`V7_PART_ORDER`, `V7_ANCHOR_REFS`, `V7_FORBIDDEN`.
    - `v7Applies(p,k,enabled=READING_V7_ENABLED)`, 순수 `readingManifestV7(p,k)`, `withV7Sections`.
  - `reading-v7-cost.ts`: 추정 원가 상수(§5)와 `v7CostRatio`. Phase 4 골든 실측으로 바꾼다.
  - `reading-policy.ts`: `READING_V7_VERSION='destiny-book-v7'`, `hasReadingSections` 에 v7 등록, `v7ChapterPolicy`(장당 하한 1,400·목표 1,800~2,200 → 출력 토큰 6,450). `policyForReading` 은 그대로다.
  - `__tests__/ui/yeongnyangi-reading-v7.test.mjs`: 정적 테스트 5종 + 계약 1종.
  - `config/sitemap-lastmod.json`: `/`·`/yeongnyangi/1000-won-fortune/` 서명 2개가 바뀌었다. 두 라우트가 결제 카탈로그를 거쳐 `reading-policy.ts` 를 import 하기 때문이다(재생성 diff 로 실측).
- 장 수(연어/광어/참치, 실측)
  - 사주 8/13/24, 자미 8/13/20, 베다 8/13/23, 점성술 8/10/12, 숙요 6/8/10, 타로 연애 5/7/9, 타로 선택 4/5/6.
  - 시기 장: 사주 1/2/6, 자미 1/2/4, 베다 0/0/4.
  - 물어보기(`ask`)는 해석과 같은 카탈로그를 쓴다.
- 테스트(무는지 변이로 확인: 가짜 필드 `houses.13`·앵커 소유 중복·연어 `majorLuck` 주입 → 세 테스트 모두 실패로 잡혔다)
  1. 소유 충돌 0: 한 매니페스트 안에서 owns 중복·접두 겹침이 없다. owns 라벨은 자기 evidenceInputs 안에 있다. refs 는 앵커가 소유한다. 소유 라벨 집합은 티어가 오를수록 줄지 않는다.
  2. 단조성: 장 수·인사이트 합이 연어<광어<참치이고, 체계별 기대 장 수·시기 장 수가 정확히 맞는다.
  3. 실제 필드: evidenceInputs·refs·fallbackInputs 를 실제 엔진 6종 출력으로 해석한다(타로는 love·general 두 입력, 숙요는 `readingMode:'personal'`).
  4. 금지 요소 0: 비참치에 프리미엄 라벨·제목이 없고, 체계별 제외 필드가 없고, `mustNotCover` 에 금지 태그가 들어 있다.
  5. 원가: 해석·물어보기 8문항이 모두 가격의 10% 이하이고, 장 수 상한 8/13/26 을 지킨다.
  6. 계약: 기본 플래그면 모든 상품×종류에서 `v7Applies` 가 false 이고 `consultationManifest` 는 v6 그대로다. 시기 테마 ⇔ `timingRef:'owner'`, 섹션 하한 ≤ 목표×0.8, 파트 순서를 지킨다.
- 검증(실측)
  - 요청 명령 6파일 51/51 통과. **불변 스냅샷은 해시 갱신 없이 통과**했다.
  - `npm run check:fast` exit 0. 첫 실행은 sitemap 드리프트로 막혔고, 원장 재생성 뒤 다시 돌렸다.
  - `npx tsc --noEmit` 오류 0.
- 가정(골든·§6-3 에서 조정할 수 있다)
  - `readingManifestV7` 에는 topic 인자가 없다. 목차는 (체계, 티어, 종류)로만 정한다.
  - 소유 사슬(연어의 묶음 장 → 광어·참치의 분리 장)은 티어별 owns 로 암묵 표현했다.
  - 시기 장이 없는 매니페스트(점성술·숙요·타로, 연어·광어 베다)의 비시기 장은 `timingRef:'none'`, 앵커도 `none` 이다.
  - owns 에는 원장이 풀어야 할 파생 키가 있다: `yearlyLuck.Y0/Y1/Y2-9`, `monthlyLuck.M12`, `majorLuck.current/next/arc`, `natalInteractions.<기둥>`, `yearlyTimeline.*`, `minorLuck.*`, `vimshottariDasha.arc/next`, `aspects.tension/harmony/conjunction`, 숙요 `relationMap.<관계>`(원천 `personA`), 타로 `cards.<pos>`·`reading.*.<pos>`, 십신·신살 이름. **§6-3 원장이 이 키들을 실제 하위 ID 로 분해해야 한다.**

## Phase 2 커밋 3 결과: reading-v7-ledger.ts (2026-09-28)

- 커밋 `07cd0fe09`. 이 SHA 의 main CI(run 36363623178)는 **옆 세션 `2903cd057` 이 남긴 공개 미러 드리프트**로 Static guards 가 실패했다(이 커밋 파일과 무관). 그 세션이 `b2b024c89`(미러)·`52af571dc`(인수인계 프론트매터)로 고쳤고, 최종 CI 판정은 이 인수인계 커밋의 run 으로 확인한다. 과금 LLM 0회, 실결제 0, DB 접근 0. 플래그 `READING_V7_ENABLED=false` 이고 원장을 import 하는 운영 경로가 없다.
- 파일
  - `worker/yeongnyangi/fortune/reading-v7-ledger.ts` (신규, 순수·결정적)
    - `buildV7Ledger(context, tier, opts)`: 엔진 근거를 ASCII 하위 ID `<domain>.<label>[.<sub>...]` 사실로 쪼갠다. 사실마다 태그 단계가 있다. 미분류 라벨·슬러그 없는 이름은 `unclassified`·`unslugged` 로 드러난다(fail-closed). ID 가 겹치면 throw 한다.
    - `resolveV7Ledger(chapters, context, opts)`: 소유를 확정한다. 규칙은 "매칭되는 장이 있는 첫 태그 단계에서, 매니페스트 순서상 첫 장이 소유"다. 매칭은 정확 일치·점 접두·연도 범위(`Y2-9`)다. refs 는 앵커 패턴을 첫 태그 단계로 풀어 구체 ID 로 바꾼다.
    - `selectV7Facts(context, chapter, {ledger?, asOf?})`: owns ∪ refs 를 돌려준다. 모르는 ID 는 건너뛰고 `console.warn` 한다.
    - `timeFreeYearlyLuck`: 결정 7. 시각 없는 사주에 올해·내년 세운을 넣는다. `sexagenaryYearIndexes`+`formatPillar` 를 쓰며, 시각 있는 fixture 에서 엔진 `yearlyLuck` 과 같음을 실측했다.
    - 부재도 사실이다: 십신 count 0, `yogas.none`, `aspects.none-<family>`. 비참치는 프리미엄 라벨 사실을 버리고 `PREMIUM_KEY` 키를 지운다. `prompt` 키는 항상 지운다.
  - `__tests__/ui/yeongnyangi-reading-v7-ledger.test.mjs` (신규, node --test 8종)
    - fixture: 1997-02-10 14:30 여 서울(시각 있음), 사주 시각 없음(연어), 자미 장소 없음(전 티어), 타로 연애·선택. 기준일 2026-09-15.
    - 테스트: ① 소유(미분류 0, 모든 장 소유 ≥1, 단일 소유, ID 가 `EVIDENCE_ID` 정규식 전체 일치, 시기 사실은 시기 장만, refs 는 앵커 소유) ② 비참치 프리미엄·prompt 0 ③ `selectV7Facts` = owns ∪ refs + 모르는 ID 경고 ④ 결정성 ⑤ 사주 세부(정인 부재, 년-일 충 → 배우자 장, 올해/내년 2026·2027, 향후 2028~2035, 월운 12, 대운 현재 2024·다음 2034) ⑥ 시각 없음(시주·월운·대운 0, 결정 7 일치) ⑦ 자미·베다·점성술·숙요·타로 세부 ⑧ 어휘 fail-closed(슬러그 유일·ASCII, 엔진 원천과 대조).
  - `docs/design/yeongnyangi-v7-chapter-catalog.md`: §4 하위 ID 조각 연결자를 `:` → `.` 로 정정(4곳).
- 설계와 다르게 한 판단(골든·§6-4 에서 조정할 수 있다)
  - **조각 연결자 `.`**: `consultation.ts:174` `EVIDENCE_ID` 정규식에 `:` 가 없어서 `:` 를 쓰면 본문에 꼬리가 남는다.
  - `kijishin`(기신)도 비참치 제거 키에 넣었다(v6 대비 추가).
  - `context.calculatedAt` 은 실제 현재 시각이라 기준 연도로 쓰지 않는다. 사주는 `yearlyLuck[0].year`, 자미는 `minorLuck.current.year`, 나머지는 `opts.asOf` 를 쓴다.
  - 자미 소한 과거 항목은 버리고 현재·미래만 남긴다. 궁은 설계대로 `transformations` 를 유지한다.
  - Evidence label 은 하위 ID 가 아니라 원래 필드 라벨을 유지한다. `resolveV7Ledger` 는 컨텍스트 하나를 받는다.
  - 참치 점성술 `uranus` 장이 `aspects.Neptune-conjunction-Uranus` 도 소유한다. 참치에 합(conjunction) 장이 없어서 둘째 태그 단계(행성) 소유자가 가져가는 규칙상 정답이다.
- 검증(실측)
  - 새 원장 테스트 8/8. 변이 7종이 모두 물었다: 프리미엄 라벨 드롭 제거(1 실패), 비 ASCII 슬러그(3), 결정 7 제거(2), 다샤 출생일 제거 누락(1), 마지막 장 소유(2), 부재 사실 제거(2), 키 정리 제거(1). 원본 복원은 cmp 로 확인했다.
  - **불변 스냅샷은 해시 갱신 없이 통과**했다. reading-v7 6, reading-v6 14, ask-evidence 14, consultation-kinds 10 모두 통과.
  - `npx tsc --noEmit -p .` 오류 0, eslint 0.
  - `npm run check:fast` exit 0(jest 309 스위트·4,512 테스트). `app/**` 를 건드리지 않아 sitemap 원장은 바뀌지 않았다.

## Phase 2 커밋 4 결과: reading-v7-timing.ts (2026-09-28)

- 커밋 `eddaa5c13`. 옆 세션이 같은 체크아웃에 커밋 중이라 워크트리(`wt/v7-timing-matrix-20260928-110503`)에서 작업하고 main 에 ff 머지했다. 과금 LLM 0회, 실결제 0, DB 접근 0. 플래그 `READING_V7_ENABLED=false`, 운영 경로 import 0, `service.ts` 무변경.
- 파일
  - `worker/yeongnyangi/fortune/reading-v7-timing.ts` (신규, 순수·결정적)
    - `buildV7TimingMatrix(context, input, today)`: prepare 가 부를 함수. `extendAskLocalTiming` 을 그대로 호출하고 **사주 `monthlyLuck` 만** 가져간다. 월 키(`YYYY-MM`)로 중복을 버리고, `today` 에 유효한 월주(KST 절입일 ≤ today)부터 12행을 자른다. 반환은 JSON 그대로 스냅샷에 넣을 수 있는 `{version:'v7-timing-1', domain, today, facts}`.
    - `withV7Timing(context, matrix)`: 저장된 매트릭스를 라벨 단위로 다시 끼운다(래퍼의 `withFacts` 와 같은 규칙). 도메인·버전이 다르면 throw.
    - `v7TimingSummaries(resolveV7Ledger 결과)`: `timingRef:'summary'` 장에만 `timingSummary` 한 줄을 붙인다. 티어 필터를 거친 원장에서 읽으므로 비참치에 프리미엄 사실이 구조적으로 못 들어간다. 줄 끝에 그 사실을 소유한 시기 장 제목을 가리킨다.
  - `__tests__/ui/yeongnyangi-reading-v7-timing.test.mjs` (신규, node --test 4종): ① 매트릭스 12행 2026-09~2027-08, 행마다 래퍼 출력과 동일(재계산 아님), JSON 왕복 동일, 2026-09-03 이면 입추 월주(2026-08)부터 ② 시각 없는 사주·자미·베다·점성술·숙요는 행 0, 도메인·버전 불일치 throw ③ 매트릭스 적용 원장: 미분류 0, 시기 사실은 시기 장만 소유, 롤링 12개월을 연어 `yearNow`·광어/참치 `months` 가 소유, 참치 `yearsAhead` 2028~2035 유지 ④ 요약: summary 장에만·결정적·개행/출생연도 없음·비참치 대운/대한/다샤 없음·가리키는 장이 owner.
- 설계와 다르게 한 판단
  - **자미·베다는 매트릭스를 쓰지 않는다.** 자미는 엔진 기본값에 이미 10년 `yearlyTimeline`·`minorLuck` 이 있다. 래퍼 결과를 쓰면 창 4년으로 줄어 `yearsAhead` Y2-9 가 빈다. 베다는 래퍼가 v7 금지인 PD 행과 원장 미분류 라벨 `dashaPeriods` 를 더한다.
  - **사주 `yearlyLuck` 도 래퍼 것을 쓰지 않는다**(같은 이유: 10년 → 4년). 래퍼에서 쓰는 것은 월운뿐이다.
  - 12개월 자르기는 설계("원장이 자른다")와 달리 매트릭스 단계에서 한다. 원장은 받은 행을 그대로 쪼갠다. 스냅샷이 12행만 담아 작고, 원장 계약은 그대로다.
  - 실측 요약 예(1997-02-10 14:30 여 서울, 2026-09-15)
    - 사주 연어·광어: `올해 세운 丙午(정재가 들어오는 해) — 자세한 흐름은 「올해와 내년」 장에서 다룬다.`
    - 사주 참치: `… · 지금 대운 乙巳(식신) — …`
    - 자미 참치: `올해 유년 형제궁(염정·천상) · 지금 대한 복덕궁 — …`
    - 베다 참치: `지금 마하다샤 Mercury(2031-08-31까지) · 안타르다샤 Rahu — 자세한 흐름은 「지금의 마하다샤」 장에서 다룬다.`
    - 베다 연어·광어·점성술·숙요는 시기 장이 없어 전 장이 `none` 이고 요약도 없다.
- CPU 실측(로컬 node, Windows. 워커 CPU 와 같은 값이 아님)
  - 래퍼 1회 벽시계: 사주 22.1ms(콜드)/13.5ms(웜), 자미 10.5ms/6.6ms. `process.cpuUsage` 는 윈도우 해상도(약 15.6ms) 때문에 0~93ms 로 튀어 벽시계를 기준으로 삼는다.
  - prepare 가 실제로 부르는 것은 사주 1회뿐이다(자미 0회). 워커 실측은 §6-6 배선 뒤 스테이징 `wrangler tail` 로 한다.
- 검증(실측)
  - 새 시기 테스트 4/4. 변이 4종이 모두 물었다: 12개월 자르기 제거(2 실패), today 기준 무시(2), 모든 장에 요약(1), 도메인 검사 제거(1). 원본 복원은 `git status` clean 으로 확인했다.
  - **불변 스냅샷은 해시 갱신 없이 통과**했다. v7 원장 8, reading-v7 6, reading-v6·ask-evidence·consultation-kinds 38 모두 통과(리베이스 뒤 시기·불변·원장 재실행 13/13).
  - `npx tsc --noEmit -p .` 오류 0. eslint 오류 0(경고 1: 원장 테스트와 같은 `_t` 구조분해 패턴).
  - `npm run check:fast`: entry-encoding OK, jest 309 스위트·4,512 테스트 통과(종료 코드는 캡처하지 못했고 실패 단계 출력은 없었다).

## Phase 2 커밋 5 결과: reading-v7-prompt.ts (2026-09-28)

- 커밋 `412dda498`. main 직접 작업(옆 세션은 `marketing/**` 만 건드려 워크트리가 필요 없었다). 과금 LLM 0회, 실결제 0, DB 접근 0. 플래그 `READING_V7_ENABLED=false`, 운영 경로 import 0, `chapter.ts`·`chapter-facts.ts`·`service.ts` 무변경.
- 파일
  - `worker/yeongnyangi/fortune/reading-v7-prompt.ts` (신규, 순수·결정적)
    - `buildV7ChapterPrompt({chapter, facts, previous, askFirstChapter, questionCount})` → `{promptVersion, timeTheme, depth, sourceIds, carry, domainRules, outputSchema, maxOutputTokens}`. §6-6 이 이 객체를 기존 `domainRules`·`properties` 위에 펼치기만 하면 되도록 v7 전용 조각만 담는다.
    - `v7PromptVersion(askFirstChapter)`: 물어보기 0장은 `ask-chapter-v1`, 나머지는 `chapter-v7`.
    - `v7TimeTheme`: 제목 정규식(`/시기|전환|흐름|년/`) 대신 `timingRef==='owner'`.
    - `v7Depth`: `requiredSections` 가 없으므로 `mustCover.join(' → ')`.
    - `v7Carry(previous, budgetChars)`: 기존 필수 필드 `highlights[]`·`topics[]` 만 읽어 `previousHighlights`·`previousTopics`·`usedScenes`·`usedActions` 를 만든다. 예산은 `charsAllowedByTokens(3000)`=2,000자. 태그는 중복 방지의 키라서 통째로 남기고 결론이 남은 예산을 최신 장부터 채운다. v6 의 `previousConclusions`·`previousExamples` 는 v7 에서 `undefined` 로 지운다(예산 이중 계상 방지).
    - `v7OutputSchema`: `blocks` min=max=`sections.length`, `items.required=['id','title','paragraphs','sources']`, `id` enum=소절 id, `sources` enum=`sourceIds`·minItems 1.
    - `v7OutputTokens`: `max(chapter.outputTokens, tokensRequiredForChars(targetChars[1]+600+질문수*480))`.
    - `domainRules` v7 키: `depth`, `insightUnits`, `blockContract`, `citationContract`, `factOwnership{owns,references,rule}`, `excludedSubjects`(=`mustNotCover`), `timingScope`, `timingSummary`, `highlightContract`, `topicContract`, `writingContract`, 전달 4종.
  - `__tests__/ui/yeongnyangi-reading-v7-prompt.test.mjs` (신규, node --test 5종). 6체계 × 3티어 × 종류 전부(36 매니페스트)를 돈다.
- 설계와 다르게 한 판단
  - **사실 선택은 이 모듈에 넣지 않았다.** 설계 §1 이 `chapter-facts.ts` 의 `selectChapterFacts` 첫 줄에 `selectV7Facts` 를 두라고 했으므로, 프롬프트 모듈은 `chapter.ts` 가 `explanationFacts` 까지 끝낸 목록을 `facts` 로 받는다. 스키마 enum 과 CALCULATED_DATA 가 갈라질 수 없다.
  - **`highlights`·`topics` 에 스키마 `minItems` 를 두지 않았다.** 원칙 17: 개수 미달은 거부가 아니라 하류 교정 대상이다. 개수 요구는 `highlightContract`·`topicContract` 문장으로만 넣었다.
  - 시기 사실 필터를 따로 두지 않았다. 소유권(`owns ∪ refs`)이 이미 비시기 장에서 시기 사실을 배제하므로 중복 가드 대신 테스트로 전수 확인한다.
- 검증(실측)
  - 새 프롬프트 테스트 5/5. 변이 7종이 모두 물었다: `timeTheme` 상시 참, `depth` 구분자, 전달 최신순 → 오래된 순, 태그 예산 무시, `blocks.maxItems` 완화, owner 장에 요약 누출, `sources` enum 제거. 원본 복원 후 재실행 5/5.
  - **불변 스냅샷은 해시 갱신 없이 통과**했다. v7 기존 19종(카탈로그 6·원장 8·시기 4 + 불변 스냅샷), v6·ask-evidence·consultation-kinds 38종 모두 통과.
  - `npx tsc --noEmit -p .` 오류 0. eslint 오류·경고 0.
  - `npm run check:fast`: entry-encoding OK, jest 단계가 윈도우 0xC0000409(3221226505)로 출력 없이 죽었다(커밋 4 세션과 같은 증상). 같은 러너를 직접 돌리면 `node scripts/run-mock-tests.mjs jest` = 309 스위트·4,515 테스트 통과. 로컬 하네스 결함이며 변경과 무관하다(범위 밖 결함 절 참조).

## Phase 2 커밋 6 결과: §6-6 배선 (2026-09-28)

- 커밋 `602135a61`. main 직접 작업(옆 세션은 `marketing/**` 만 건드려 워크트리가 필요 없었다). 과금 LLM 0회, 실결제 0, 운영 DB 접근 0. 플래그 `READING_V7_ENABLED=false` 그대로이고, 플래그 OFF 에서 v7 경로는 한 줄도 실행되지 않는다.
- 파일
  - `worker/yeongnyangi/fortune/consultation-kinds.ts`: `consultationManifest` 첫 줄에 `if(v7Applies(p,k))return readingManifestV7(p,k!)`. v6 주제 매핑보다 앞에 둔다(v7 은 종류별 제목·초점·사실 입력을 스스로 갖는다).
  - `worker/yeongnyangi/fortune/chapter-facts.ts`: `selectChapterFacts` 첫 줄에 `if(chapter.version===READING_V7_VERSION)return selectV7Facts(context,chapter as ChapterSpecV7)`.
  - `worker/yeongnyangi/service.ts`
    - prepare: `v7Applies(product,kind)` 가 참일 때만 `buildV7TimingMatrix` → `withV7Timing` → `resolveV7Ledger` → `v7TimingSummaries` 를 한 번 돌리고, `product.manifestVersion`·`chapterCount` 를 v7 로 바꾼 뒤 매트릭스를 스냅샷 `v7Timing` 에 저장한다.
    - fingerprint: `manifestVersion` 자리를 **같은 위치에서 토큰 하나만** 바꾼다(`v7?V7:v6?v6:{}`). v6 이하 요청의 바이트는 그대로다.
    - 질문 장 `mustNotCover`: v7 일 때 형제 장 제목만 덜어낸다. 체계 금지어는 남는다. 소유권은 건드리지 않는다.
    - `snapshotAnalysis(snapshot)` 헬퍼 하나로 생성(`generateNextChapter`)과 차트(`presentFortune`)가 **같은** 저장 매트릭스를 다시 입힌다. `v7Timing` 이 없는 스냅샷은 저장된 analysis 를 그대로 돌려준다.
  - `worker/yeongnyangi/providers/chapter.ts`
    - `buildV7ChapterPrompt` 결과를 `domainRules`(마지막 키)·`outputSchema.properties`(블록 스프레드 뒤)·`promptVersion`·`maxOutputTokens`·`timeTheme` 에 펼친다. v7 전용 키는 `version===READING_V7_VERSION` 일 때만 들어간다.
    - 125~130줄 근거 요건에 v7 분기를 넣었다. v7 은 고정 `evidence` 소절이 없으므로 규칙이 **블록 자체**로 옮겨간다: 블록 sources 합집합이 이 장 사실의 체계를 모두 덮고, 광어·참치는 서로 다른 근거 2개 이상.
- 설계와 다르게 한 판단
  - **`selectChapterFacts` 에 `asOf` 4번째 인자를 만들지 않았다.** 결정성은 `context.calculatedAt`(스냅샷에 그대로 얼어 있는 문자열)에서 나온다. prepare 는 `resolveV7Ledger(manifest, withV7Timing(context,matrix))` 를 opts 없이 부르므로 생성 때의 재구축과 같은 id 가 나온다. 인자를 늘리면 기존 호출부 4곳이 깨지고 prepare/생성 드리프트 위험만 는다.
  - **근거 도메인 집합을 ask 패킷 이전 사실(`chapterFactIds`)에서 뽑는다.** `allowed` 는 물어보기 0장에서 ask 사실까지 포함하므로, 그걸로 도메인을 세면 충족 불가능한 요구가 만들어진다. v6 분기는 종전대로 `allowed` 를 쓴다.
  - **블록마다 sources 가 비지 않았는지는 다시 검사하지 않는다.** 바로 앞의 `validateReadingQuality` 가 이미 `INVALID_EVIDENCE` 로 막는다(원칙 6: 층을 더하기 전에 기존 장치 확인).
  - **`resolveV7Ledger` 의 `unowned` 에 런타임 throw 를 걸지 않았다.** §6-6 범위 밖이고, 소유권 정적 가드는 커밋 3 테스트가 이미 전수로 본다.
  - 스키마 enum 은 `sourceIds`(ask 패킷까지 합쳐진 최종 목록)로 만든다. CALCULATED_DATA 와 enum 이 갈라질 수 없다.
- 검증(실측)
  - **불변 스냅샷이 해시 갱신 없이 통과**했다: `flag-off v6/v5/legacy/spirit paths ... byte-identical` 1/1, 123행 × 5해시 그대로.
  - 새 `__tests__/ui/yeongnyangi-reading-v7-wiring.test.mjs` 4/4. 변이 2종이 모두 물었다: 사실 라우팅 무력화 → 2·3번 실패, v7 근거 분기 무력화 → 3·4번 실패. 원본 복원 후 4/4.
  - v5·v6·v7·상담·ask 계열 노드 테스트 11파일 94/94.
  - `npx tsc --noEmit -p .` 오류 0. eslint: 새 테스트 0/0, 워커 4파일 오류 0·경고 14(전부 기존 `no-explicit-any`).
  - `npm run check:fast` exit 0. wrangler dry-run·entry-encoding OK, jest 309 스위트·4,515 테스트 통과(이번엔 윈도우 0xC0000409 가 재현되지 않았다). 변경 집합이 워커 TS 라 `test:node` 단계는 선택되지 않았으므로 노드 테스트는 위와 같이 직접 돌렸다.
  - 플래그 OFF 이므로 `consultationManifest` 는 모든 구매 가능 조합에서 여전히 v6 를 돌려준다(테스트 1번이 전수 확인). v7 분기가 실제로 v7 매니페스트를 돌려주는지는 플래그가 켜져야 관측되므로, 이 축은 `v7Applies(p,k,true)` 의 전수 예상값 비교로만 고정했다.

## Phase 3 결과: v7 전용 검증기 (2026-09-28, 네오 승인)

- 커밋 `b996cfa41`. main 직접 작업. 과금 LLM 0회, 실결제 0, 운영 DB 접근 0. 플래그 `READING_V7_ENABLED=false` 그대로다.
- 설계 §7·측정 1의 **주 검증 3종만** v7 장에 건다. n-gram 유사도는 기존 `validateReadingQuality` 에 이미 있으므로 새로 만들지 않고 보조 백스톱으로 남긴다(원칙 6).
  1. `V7_FOREIGN_FACT` — 원장 소유 위반. 이 장이 소유하지도, refs 로 참조하지도 않는 체계 용어를 본문이 쓴 경우다. 허용량은 소유 `Infinity`, 앵커·`refs` 1회, 나머지 0이다.
  2. `V7_ANCHOR_REPEAT` — 기준점 재설명. 앵커가 소유한 사실을 이 장이 한 번을 넘겨 다시 설명하는 경우다.
  3. `V7_SCENE_REUSE` — 장면 소재·행동 중복. 앞 장에서 이미 쓴 장면 소재·행동을 다시 쓴 경우다.
  - `V7_RESTATED_SENTENCE` 는 문장 단위 재진술(Dice > `V7_RESTATE_DICE`=.5)이며, 삭제 대상 문장을 특정하는 데 쓴다.
- 파일
  - `worker/yeongnyangi/fortune/reading-v7-quality.ts` (신규, 순수·결정적): 코드 4종과 `isV7QualityCode`, 임계 `V7_RESTATE_DICE`=.5·`V7_SENTENCE_MIN`=20·`V7_TAG_MIN`=2, 한국어 용어 → 사실 ID 접미 대응표 `V7_TERMS`, `auditV7Chapter(input)`, `pruneV7Chapter(body,audit)`.
  - `worker/yeongnyangi/fortune/reading-quality.ts`: 문장 분리 정규식 `SENTENCE_BOUNDARY` 를 export 만 했다(폭 0 분리라 이어 붙이면 원문과 같다). 동작 변경 0.
  - `worker/yeongnyangi/providers/chapter.ts`: `READING_V7_VERSION` 분기에 감사를 배선하고 한국어 `REPAIR_INSTRUCTIONS` 4개를 더했다.
  - `__tests__/ui/yeongnyangi-reading-v7-quality.test.mjs` (신규, node --test 9종).
- **거부로 끝나지 않는다**(원칙 17). 위반이면 재생성 1회를 던지고, 재시도 입력이 이미 v7 품질 코드면(`isV7QualityCode(input.repair?.code)`) 던지지 않고 `pruneV7Chapter` 로 해당 문장만 결정적으로 지운 뒤 로그를 남기고 통과시킨다. 분량 미달 단독으로는 실패시키지 않는다.
- 검증(실측): 새 테스트 9/9. **불변 스냅샷은 해시 갱신 없이 통과**했다. `npm run check:fast` exit 0(jest 309 스위트·4,519 테스트, 이번엔 0xC0000409 재현 없음).

## Phase 3 결과: §6-7 UI 목차·파트 머리·분량 표시 (2026-09-28)

- 커밋 `7e7e2d0b6`. main 직접 작업. 과금 LLM 0회, 실결제 0, 운영 DB 접근 0. 플래그 OFF 이므로 **사용자 노출 변화는 없다**.
- 파일
  - `app/yeongnyangi/_lib/reading-v7-copy.ts` (신규): `reading-copy.ts` 패턴(`Copy=typeof ko`)을 따르는 ko·ja·en 사전. 키 133개(파트 12 + 장 121)를 로케일마다 리터럴로 전부 적는다. `readingV7Copy(locale)`, `v7Label(key,locale)`, `v7PartHead(chapters,index,locale)`.
  - `worker/yeongnyangi/fortune/book-contracts.ts`: `ChapterSpec` 에 `titleKey?`·`partKey?` 를 옵셔널로 추가했다. 렌더러가 캐스트 없이 읽고, `ChapterSpecV7` 의 필수 선언도 그대로 합법이다. 상징(영감) 경로의 `{id,title,ordinal,part}` 투영은 영향 없다.
  - `app/yeongnyangi/_components/Consultation.tsx`: 분량 표시를 `targetRange(item)` 으로 바꿨다. `partKey` 가 있으면(=v7) 매니페스트 `targetChars` 합계, 없으면 종전 `policyForReading(...).target`. 미리보기 목차에 파트 머리를 넣었다.
  - `app/yeongnyangi/_components/ReadingBook.tsx`: 내비 목차에 파트 머리를 넣고, 비한국어 미저장 장은 사전 제목 → 모델 제목 → `Chapter N` 순으로 떨어뜨린다(진단 "비한국어 미저장 장은 Chapter N" 해소).
  - CSS: `reading-v5.module.css`·`yeongnyangi.module.css` 에 새 `.partHeading` 타이포 규칙 한 줄씩만 더했다. **기존 레이아웃 규칙은 한 줄도 바꾸지 않았다**(설계 §6-7 요구).
  - `__tests__/ui/yeongnyangi-reading-v7-copy.test.mjs` (신규, node --test 6종).
  - `config/sitemap-lastmod.json`: `/` 서명 1개(app/** 편집이 원장을 무효화한다). 재생성 diff 로 실측했고 lastmod 날짜는 그대로다.
- 설계와 다르게 하지 않은 것(요구 그대로 지킴)
  - `verify-feature-marketing-schema.mjs:274` 가 요구하는 리터럴 `consultationManifest(item,kind,topicId).length` 는 `.fishScope` 스팬에 그대로 남겼다.
  - 모바일 목차는 별도 컴포넌트가 아니다. `ReadingBook` 의 목차는 하나이고 `@media(max-width:999px)` 로 반응하므로, 파트 머리를 넣은 것으로 모바일 목차도 함께 처리됐다.
- fail-closed 사전 가드(원칙 10): 새 카탈로그 항목에 사전 항목이 없거나 ko 제목이 카탈로그에서 드리프트하면 테스트가 실패한다. 반대로 카탈로그가 버린 키가 사전에 남아 있으면 고아 키로 실패한다. `v7Label` 은 모르는 키·키 없는 v5/v6 장에 `undefined` 를 돌려주므로 호출부의 기존 폴백이 살아 있고 생 키가 화면에 찍히지 않는다.
- 검증(실측): 새 테스트 6/6. `npx tsc --noEmit -p . --incremental false` exit 0. `npm run check:fast`: paid-gate 스위트 88/88, `npm test`, lint, sitemap-drift 전부 통과(첫 실행은 sitemap 드리프트로 막혀 원장 재생성 후 재실행).

## Phase 0 세션 변경

- 코드 변경은 0이다. 이 문서와 CONTEXT_AUDIT 절 하나만 커밋한다.
- 측정 스크립트는 세션 스크래치에만 두었고 커밋하지 않았다. 지표 정의는 아래 "측정" 절에 있어 재구현할 수 있다.
- 과금 LLM 0회, 실결제 0, 운영 DB 쓰기 0(원시 컬렉션 aggregate 만).

## Phase 0 진단 (실측, 파일:줄)

### 상품·티어

- 체계 6종, 상품 28종이다. 단일 체계 24종(6체계 × 고등어·연어·광어·참치)은 `destiny-book-v6`, 퓨전 4종(모둠·오마카세)은 `destiny-book-v5` 다. 정의: `worker/yeongnyangi/payments/catalog.ts` 의 `product()`.
- v6 장 수는 `reading-policy.ts:26` 에 있다.

| 생선 | 가격 | v6 장 | 전체 하한 / 목표(자) | 장당 소절(`reading-sections.ts:11-23`) |
|---|---|---|---|---|
| 고등어 | 1,000 | 5 | 5,500 / 7,500–8,500 | 4: 의미·근거·장면1·지금 해볼 일 |
| 연어 | 3,000 | 8 | 10,000 / 13,200–15,400 | 6: + 조건·장면2 |
| 광어 | 5,000 | 11 | 18,000 / 23,000–27,500 | 8: + 선택1·선택2 |
| 참치 | 10,000 | 15 | 40,000 / 49,500–57,000 | 11: + 상충·장면3·점검 |

- 목차는 누적 구조다(`worker/yeongnyangi/fortune/reading-v6.ts:206-243`). 고등어 4행에 연어 3행·광어 3행·참치 4행이 차례로 붙고, 마지막에 action 장이 온다.
  - 티어가 오를수록 장 수와 장당 분량이 **함께** 는다. 장당 목표: 고등어 1,416–1,604자, 참치 3,204–3,839자.
  - 참치 한 권은 15장 × 11소절 = 165블록이다. 장면 45개, 선택 30개, 행동·점검 30개가 모든 장에서 같은 뼈대로 되풀이된다.
- 목차 선택: 해석·물어보기는 체계별 `outlines`(`reading-v6.ts:19-104`)를 쓴다. 연애·일·재물·궁합·관계·대운은 `focused`(`:120`)를 쓴다. 타로에는 focus 가 없다(`:217`).
- 반복 방지 장치는 두 가지뿐이다.
  - 이전 장의 요약 앞 150자·topics·example 앞 100자를 모델에 넘긴다(`providers/chapter.ts:314-316`). 그런데 v5/v6 의 example 은 늘 빈 문자열이다(`:328`).
  - 제목 단위 제외 목록 `excludes`(`reading-v6.ts:240`).
- 검증기는 완전 일치와 3-gram Dice > .94(120자 이상) 근사 중복만 잡는다(`reading-quality.ts:65-70,112-119`).

### 엔진 근거 용량 (v7 장 수의 상한)

- 사실 ID 는 `${domain}.${필드명}` 이다(`fortune/shared/domain.ts:45-49`). 비프리미엄 티어에서는 용신·종격·대운·다샤·분할도·요가·사화·삼방사정을 뺀다(`chapter-facts.ts:17,20-26`).
- 사주
  - 있는 것: 원국, 십신, 12운성(원국만), 신살 12종 = 단일 10 + 쌍 2(장 경로는 도화·홍염으로 줄인다, `chapter-facts.ts:5-8,45`), 합충형파해(원진·반합·암합은 없다), 용신(참치 이상), 대운 9주기(시간·성별 필요), 세운 10년, 월운(올해 12절, 시간 필요).
  - **희신은 없다.** 그런데 v6 참치 장 제목에 "희신"이 들어 있다(`reading-v6.ts:30`).
  - 기간을 늘린 세운·월운과 베다 AD·PD 는 엔진을 고치지 않고 `extendAskLocalTiming`(`fortune/ask/wrappers.ts:19-81`) 패턴으로 만들 수 있다.

| 체계 | 핵심 필드 | 시기 데이터 | 장 용량(추정) |
|---|---|---|---|
| 자미 | 12궁 × 주성·보좌·살성·사화·밝기, 명궁·신궁(`worker/lib/ziwei-ai-chart.js:511-526`) | 유년 10년. 연운 사화가 생년 사화다. 대한은 나이만 있다 | 높음(궁 = 영역) |
| 베다 | 라그나, 9행성, 12하우스와 주인(`worker/lib/vedic-ai-chart.js:321-404`). 참치는 D9·D10·D7·D2·D12, 요가, 다샤 | 참치만 MD/AD, 래퍼로 PD 까지 | 높음(하우스 = 영역) |
| 점성술 | 10행성, ASC·MC, 노드, 12커스프, 애스펙트 5종(`worker/lib/swiss-ephemeris.js:453-479`) | **없음**(트랜짓·진행 엔진 없음) | 중간 |
| 숙요 | 개인 상담은 `personA` 본명숙 1개(`fortune/sukuyo/index.ts:23-38`) | **없음** | 낮음. 래퍼로 27수 관계 지도(`worker/lib/sukuyo-relation-core.js:33-48`) 가능 |
| 타로 | 카드 3장 또는 6장 + reading(`fortune/tarot/index.ts:4-6`). 카드 수는 티어와 무관 | **없음** | 낮음 |

- 브리프가 지목한 `sajuAdapter.ts`·`normalizeSaju.ts`·KASI prefetch 는 영냥이 경로가 아니다. worker/yeongnyangi 에서 import 는 0건이고, 이름은 `fortune/saju-runtime.mjs:51` 의 야자시 규칙 주석에만 나온다. 영냥이 사주는 `lib/korean-calendar` + `worker/lib/life-book-ai-saju.js` + `fortune/saju-runtime.mjs` 를 쓴다. 엔진 파일은 모두 읽기 전용이고, 파생 데이터는 새 래퍼에서만 만든다.
- 광어·참치는 출생 정보가 완비돼야 산다(`service.ts:100-103`). 연어는 출생 시간이 없을 수 있어서, 시간에 기대는 장은 대체하거나 생략하는 규칙이 필요하다.

### 파이프라인 제약

| 항목 | 값 | 근거 |
|---|---|---|
| 모델 | gemini-2.5-flash, 폴백 없음, thinking 1,024, 90초, 공급자 시도 1회 | `providers/code-destiny.ts:17,34,39,42` |
| 출력 상한 | max(요청, 6,000자 예산) + 1,024 → 최소 12,274 | `code-destiny.ts:34`, `worker/lib/llm-budget.js:34-35` |
| 큐 | 요청 안에서 엄격한 순차, 메시지당 1장, 동시 2, 재시도 5 | `worker/wrangler.toml:340-344`, `service.ts:214,247` |
| 장별 재시도 | 최악 17회 | `worker/yeongnyangi/repository.js:10-23` |
| 기능 플래그 | 운영 텍스트 바인딩 128개가 가득 차서 새 var 를 넣으면 배포가 막힌다 → 코드 상수 플래그 | `scripts/verify-worker-config-parity.mjs:90-95` |
| 토큰 로그 | `[llm token_usage]` 는 워커 콘솔에만 남는다(taskType `yeongnyangi-chapter`) | `lib/llm-client.ts:510-529`, `code-destiny.ts:44` |

### 렌더링

- 렌더러는 `app/yeongnyangi/_components/ReadingBook.tsx` 하나다. `manifestVersion` 분기가 없으므로(블록 id/title/paragraphs 스키마를 유지하면) **v7 에 렌더러 분기가 필요 없다**.
- 25~30장에서 약해지는 곳:
  - 모바일 목차: 42vh 상자에 4~5개만 보이고, `part` 머리를 그리지 않는다.
  - 1장 앞 도입부가 길다.
  - 1.5초 폴링마다 전체 매니페스트와 `excludes` 를 다시 보낸다.
  - 비한국어 미저장 장은 "Chapter N" 으로 표시된다.
- 데스크톱은 `.reader` 1160px 이다. 960px 규칙은 없으므로 "현재 레이아웃 불변"으로 해석했다.

## 측정: 운영 완료본 반복 (2026-09-28, 읽기 전용, ₩0)

### 방법

- 접속은 `scripts/audit-yeongnyangi-paid-without-result.mjs` 와 같다. `worker/lib/db.js` 의 `connectDb` 를 쓰고(autoIndex·autoCreate 끔), `--db code_destiny` 의 원시 컬렉션 `yeongnyangi_requests` 에 aggregate 만 했다.
- 출생 입력·결제·사용자 필드는 projection 에서 뺐다. 본문 문장·이름·ID·URI 는 출력하지 않았다.
- 표본: COMPLETED 6건.
  - v6 5건: 사주 고등어 2, 베다 고등어 1, 점성술 고등어 1, 사주 참치 1.
  - v5 사주 고등어 1건(09-23).
  - **연어·광어·자미·숙요·타로·물어보기 완료본은 0건**이어서 이들에 대해서는 말할 수 없다.
- 지표 정의(Phase 3 검증기도 같은 식을 쓴다)
  - 정규화: NFC 후 `\p{L}\p{N}` 만 남긴다.
  - 장 쌍 유사도: 장 전체 5-gram 집합의 자카드.
  - 반복 표현: 3개 이상 장에 나온 8-gram. 비율 = 장의 8-gram 가운데 그런 것의 몫.
  - 새 정보 비율: 이전 장 합집합에 없던 사실 ID(블록·장 `sources`)와 5-gram 의 비율.
  - 말 바꾼 반복: `[.!?。]` + 공백으로 나눈 20자 이상 문장마다, 이전 장 문장과의 문자 3-gram Dice 최댓값.
  - 기준점 재설명: 체계 핵심 용어가 나오는 장 수. 한 글자 용어(합·충·달)는 "합니다·충분히·전달"과 겹쳐서 제외했다.
  - 완충 어미: `수\s*(?:도\s*)?있(?:습니다|음을|어요|을\s*것)` 의 문장당 횟수.

### 결과

표에는 현행 단일 체계 버전인 v6 5건만 싣는다. v5 1건은 재시도 항목에서만 쓴다.

| 표본 | 장 | 장 쌍 5-gram 자카드 평균 / 최대 | 3장+ 8-gram 비율 | 이전 장과 Dice ≥ .5 문장 | 사실 ID 고유 / 인용 | 완충 어미 / 문장 |
|---|---|---|---|---|---|---|
| 사주 참치 | 15 | 0.03 / 0.05 | 0.02 | 약 0.5%(4/884) | 16 / 73 | 0.37 |
| 사주 고등어 ① | 5 | 0.02 / 0.03 | 0.01 | 약 1%(1/116) | 9 / 25 | 0.26 |
| 사주 고등어 ② | 5 | 0.02 / 0.04 | 0.00 | 0% | 9 / 25 | 0.26 |
| 베다 고등어 | 5 | 0.03 / 0.04 | 0.01 | 0% | 4 / 16 | 0.31 |
| 점성술 고등어 | 5 | 0.03 / 0.03 | 0.01 | 0% | 3 / 14 | 0.31 |

- 사주 참치의 장 쌍 유사도 상위 10(장 번호·key·점수)
  - 3·6 talent·habit 0.05.
  - 0.04: 1·3 self·talent, 9·14 year·overlap, 12·14 current·overlap, 2·10 balance·recovery, 4·8 love·interaction, 3·12 talent·current, 4·7 love·boundary, 8·9 interaction·year, 1·6 self·habit.
- 사주 참치의 반복 표현 상위 20. 3장 이상에 나온 극대 구절은 모두 144개다. 여기에는 유형만 적는다.
  - "~수 있음을 의미합니다"(7장), "~수 있습니다. 반대로"(7장) 같은 완충·접속 어미: 14개.
  - "~하는 데 도움이 됩니다"(6장), "~시간을 가져 보세요"(4장), "~것이 중요합니다"(4장) 같은 조언 상투구: 3개.
  - 선택 소절의 틀 "첫 번째 선택이"(5장): 1개.
  - 같은 성향 서술(4장): 1개.
  - 같은 장면 배경(4장): 1개.
- 사실 재사용(사주 참치)
  - `saju.pillars`·`saju.dayMaster` 가 15/15장, `saju.natalInteractions` 가 7/15장에 인용됐다.
  - 새 사실이 0% 인 장이 15장 중 6장이다: 5 money, 6 habit, 8 interaction, 10 recovery, 13 next, 15 action.
  - 고등어도 같은 모양이다. 베다는 lagna·moon 5/5장, 점성술은 planets·ascendant 5/5장, 사주는 pillars·dayMaster 5/5장.
- 기준점 재설명: 사주 참치는 "일간" 13/15장, "오행" 10/15장, "일주" 8/15장에 나온다. 사주 고등어는 "일간" 5/5장, 베다 고등어는 "라그나" 4/5장, 점성술 고등어는 "하우스" 5/5장이다.
- 새 5-gram 비율은 사주 참치에서 2장 0.96 → 12~15장 0.74~0.77 로 떨어진다. 고등어 5장째는 0.87~0.93 이다.
- 장면 소재: "프로젝트"가 사주 참치 12/15장에 나온다. 연애·재물 장의 장면도 일 장면으로 쏠린다.
- 사주 참치의 소절 평균 길이(한글·숫자만 센 것): 장면 151, 선택 162, 행동 187, 점검 188, 의미 425, 근거 472, 조건 419, 상충 463.
- 재시도(저장 장당 호출 수)
  - 사주 참치의 장별 시도는 [5,4,3,1,3,2,2,1,1,6,1,1,1,1,1] 로 33/15 = 2.2 다. 09-26 수정 전은 27회/9장 = 3.0, 수정 후는 6회/6장이다.
  - v6 고등어 4건은 20회/20장이다. **수정 후 구간은 26회/26장 = 1.00** 이다.
  - 전 기간(최상위 attempts 합)은 70/40 = 1.75 다.
  - v5 고등어 1건은 최상위 attempts 17 과 장별 합 8 이 다르다. 원인은 조사하지 않았다.
- 장당 실제 토큰: **미측정**이다. 읽기 전용 조회 수단이 없다. `wrangler tail` 은 실시간 전용이고, 대시보드 조회는 09-22에 불완전 결과를 냈다(`docs/verification/pass-sale-readiness-20260922.md:43`). Phase 4 골든에서 실측한다.

### 측정이 바꾸는 것

1. **반복의 실체는 문장 복제가 아니다.** 같은 기준점과 같은 근거를 장마다 다시 설명하고, 같은 장면 소재와 같은 어미를 되풀이하는 것이다. v6 출력은 n-gram 검증기를 모두 통과한다(장 쌍 최대 0.05, 이전 장과 Dice ≥ .5 인 문장 ≤ 1%). 따라서 Phase 3 의 주 검증은 다음 셋이고, 5-gram 유사도는 보조 백스톱으로 둔다.
   - 원장 소유 위반: 다른 장이 소유한 사실을 인용.
   - 소유 장 밖의 기준점 재설명: 일간·라그나·ASC 등.
   - 장면 소재·행동 중복: 이미 쓴 목록과 대조.
2. **사실 ID 가 필드 단위라서 소유권을 나눌 수 없다.** 예: `vedic.planets` 하나에 9행성이 다 들어 있다. 원장은 래퍼에서 하위 사실 ID 로 쪼갠다(예: `vedic.planets.Venus`, `saju.natalInteractions.<종류>:<쌍>`). 엔진은 건드리지 않는다.
3. **base 선택자가 원인이다.** `reading-v6.ts:105`(사주 pillars·dayMaster, 베다 lagna·moon, 점성술 ascendant·Sun·Moon, 숙요 personA, 자미 명궁·신궁, 타로 spreadId·cards)가 모든 장에 합쳐진다(`:238`). v7 에서는 기준점 장 하나만 이 사실을 소유하고, 나머지 장은 한 줄 참조만 받는다.
4. 장면은 그 장의 영역 안에서 만든다. 이미 쓴 장면 소재를 다음 장에 넘긴다.
5. 완충 어미 밀도는 프롬프트 지침으로만 다룬다. 거부하지 않는다(원칙 17).
6. **원가는 연어가 가장 빡빡하다.** 재시도 계수에 따라 연어 장 수의 상한이 바뀐다(아래 산술).

### 원가 가드 산술 (추정)

- 단가: 입력 $0.30/1M, 출력 $2.50/1M(`config/llm-tariffs-20260921.json`), ₩1,400/$ 가정.
- v7 장당 원가는 약 ₩25.6 이다(추정). 가정은 다음과 같다.
  - 본문 2.2k자.
  - 출력 (2,200 + 800) × 1.5 + 1,024 ≈ 5.5k 토큰.
  - 입력 15k 토큰(원장·이전 장 요약 포함, 추정).
- 10% 상한에서 허용되는 장 수 = 가격 × 0.1 ÷ (장당 원가 × 계수).

| 재시도 계수 | 연어(₩300) | 광어(₩500) | 참치(₩1,000) |
|---|---|---|---|
| 1.00 (수정 후 실측 26/26) | 11 | 19 | 39 |
| 1.25 (실측 + 25% 여유, 추천 후보) | 9 | 15 | 31 |
| 1.75 (전 기간 70/40) | 6 | 11 | 22 |
| 2.20 (참치 전 기간 33/15) | 5 | 8 | 17 |

- 계수 1.75 이면 현행 v6 연어(₩178 × 1.75 ≈ 10.4%)도 목표를 넘는다. 수정 전 재시도는 분량 거부 때문이었고 09-26/27 에 제거됐다(`reading-quality.ts:7-17`). 그래서 전 기간 계수는 과대 추정이다.
- 수정 후 표본은 26장뿐이고 연어·광어는 없다. 계수는 Phase 1 에서 정하고, Phase 4 골든 실측으로 확정한다.

## Phase 1 방향 (승인된 추천 + 측정 반영)

> Phase 1 설계가 이 절을 구체화했다. 6(시기 한 장)은 결정 4로, 10의 "바인딩 한 자리"는 결정 3으로, 11의 계수는 결정 1로 바뀌었다. 다르면 [설계 문서](../design/yeongnyangi-v7-chapter-catalog.md)를 따른다.

1. **대상**
   - v7(`destiny-book-v7`, 프롬프트 `chapter-v7`)은 단일 체계 연어·광어·참치 가운데 `focus` 가 없는 경로에만 적용한다(`reading-v6.ts:215-217`). 즉 5체계의 해석·물어보기와 타로 두 종류다.
   - 물어보기의 질문 분석(`ask-generation-v1`, `service.ts:221-229`)과 `questionAnswers` 는 그대로 둔다.
   - 매니페스트 버전은 지금 상품 단위로 정해진다. 그런데 fingerprint 는 V6 일 때만 `manifestVersion` 을 넣는다(`service.ts:107`).
   - Phase 1 에서 v6/v7 분기 위치를 정하고, 그 분기가 결제 스냅샷·fingerprint·멱등 orderId 에 닿지 않음을 확인한다.
2. **Phase 2 첫 커밋은 불변 스냅샷**이다.
   - 범위: 고등어 전부 + v7 범위 밖 경로(집중형·timing·퓨전).
   - 고정 대상: 매니페스트, 프롬프트 페이로드, 모델 파라미터, 검증 경로.
   - 플래그 OFF 이면 모든 경로가 현재와 같아야 한다.
3. **장당 분량은 평평하게**(약 1.8~2.5k자, 추정) 두고 장 수를 늘린다.
   - 소절 뼈대를 버리고, `mustCover` 하위 질문마다 인사이트 단위로 블록을 만든다.
   - 장면은 장당 최대 1개, 선택은 결정 장에만 둔다.
   - 하한은 목표 하한의 80% 이하로 두고, 분량만으로는 실패시키지 않는다.
4. **카탈로그**: 체계별 장 목록을 만든다. 순서는 브리프의 영역 순서를 따르되, 근거가 허락하는 장만 둔다(결정 ③). 정적 테스트로 네 가지를 고정한다.
   - 소유 충돌 0.
   - 체계 안에서 티어가 오를수록 장 수·인사이트 단위가 늚.
   - 모든 `evidenceInputs` 가 실제 필드임.
   - 금지 요소 0(희신·원진·유월·트랜짓 등 엔진에 없는 것).
5. **사실 원장**: 래퍼에서 LLM 없이 결정적으로 만든다.
   - 하위 사실 ID 로 쪼갠다(측정 2).
   - 기준점 사실은 한 장만 소유한다(측정 3).
   - `chapter-facts.ts` 의 v6 경로는 그대로 두고, v7 선택기는 새 모듈로 만든다.
6. **시기는 체계당 한 장**에 모은다.
   - 사주: 세운·월운, 참치는 대운을 더한다.
   - 자미: 유년, 참치는 대한을 더한다.
   - 베다: 참치만 MD/AD.
   - 점성술·숙요·타로에는 시기 장이 없다.
   - 매트릭스는 `extendAskLocalTiming` 을 재사용하고, 다른 장은 `timingRef:'summary'` 한 줄만 받는다.
7. **이전 장 전달**을 강화한다. 소유 주제·핵심 결론·이미 쓴 행동·**이미 쓴 장면 소재**를 넘긴다.
8. **검증기(Phase 3)** 는 v7 전용이다. 주 검증은 측정 1의 셋이다. 위반이 나오면 1회 재생성하고, 그래도 남으면 결정적으로 문장을 삭제하고 로그를 남긴다. 거부로 끝내지 않는다.
9. **Wave** 는 목차 순서로만 한다. 순차 큐와 리스 불변식을 유지하고, 병렬 생성은 측정 뒤 별도 RED 로 다룬다.
10. **플래그**는 코드 상수(OFF)다.
    - 매니페스트가 구매 시점 스냅샷이라 OFF 는 신규 구매에만 적용된다. 이미 발급된 리포트는 재생성·변형하지 않는다(forward-fix).
    - 롤백은 활성화 커밋 revert + 승격이다. 즉시 롤백이 필요하면 바인딩 한 자리를 비우는 작업(선례 02560ce64, RED)을 따로 결정한다.
11. **원가 가드**: "장당 원가 × 재시도 계수 × 장 수 ≤ 가격 × 10%" 를 연어·광어·참치 각각 정적 테스트로 고정한다.
12. **UI**: 목차 `part` 머리, 사전 기반 `titleKey` 제목(ko·ja·en, 나머지는 영어 폴백), 모바일 목차는 Phase 2 UI 단계에서 한다. 레이아웃 CSS 는 바꾸지 않는다.

### Phase 1 에서 네오에게 받을 결정 (완료 — 셋 다 추천안 승인, 위 "Phase 1 결과")

1. 원가 가드의 재시도 계수. **추천은 1.25**다. 근거는 수정 후 실측 1.00 에 여유를 둔 값이고, 연어 9장·광어 15장·참치 31장까지 허용된다. Phase 4 에서 재확인한다.
2. v6/v7 분기 위치(상품 단위 또는 상담 종류 단위)와 fingerprint 영향.
3. 즉시 롤백용 바인딩 자리가 필요한지. 추천은 불필요다. 매니페스트 스냅샷이 신규 구매만 바꾸므로 revert 로 충분하다.

## 범위 밖 결함 (보고만, 고치지 않았다)

1. 타로 질문이 엔진에 닿지 않는다. 영냥이는 `question:` 으로 넘기는데(`fortune/tarot/index.ts:6`), 엔진은 `userQuestion` 만 읽는다(`lib/tarot/tarot-interpretation-engine.mjs:1787`). 타로 덱 세션에 넘길 후보다.
2. 자미 연운 행의 `transformations` 가 생년 사화다(`worker/lib/ziwei-ai-chart.js:448-458`). 장 경로는 이 값을 그대로 넘기고, ask 패킷은 지운다(`ask/packet.ts:136-141`).
3. 사주 기둥 기준이 두 갈래다. life-book 은 keep-day·경도 보정 없음, 런타임은 shift-day·경도 보정이다(`life-book-ai-saju.js:285-286`, `saju/runtime.ts:53-63`). 23시대 출생에서 사실끼리 어긋날 수 있다(추정).
4. v6 참치 장 제목에 근거 없는 "희신"이 있다(`reading-v6.ts:30`).
5. 비프리미엄 장 경로가 `kijishin` 을 지우지 않는다(`chapter-facts.ts:17`). ask 패킷은 지운다.
6. 오마카세 가격 드리프트: 코드는 50,000(`worker/lib/paid-feature-registry.js:198`), `docs/payments/payment-p0-inventory.md:164` 는 30,000 이다.
7. 장당 최악 호출 수가 문서마다 다르다. 17회(`docs/verification/yeongnyangi-consultation-queue.md:15`)와 13회(참치 복구 인수인계 `:36`).
8. 렌더링
   - `ReadingLoading` 의 saved/total 을 아무도 넘기지 않는다.
   - 결제 완료 뒤 로딩 화면에 "결제 대기"가 기본 문구로 나올 수 있다(추정).
   - h1 생선 이름이 번역되지 않는다.
9. v5 고등어 1건의 attempts 카운터가 장별 합과 다르다(측정 절).
10. `app/yeongnyangi/yeongnyangi.module.css` 에 impeccable 디자인 훅이 `design-system-font` 11건("Yeongnyangi Myeongjo")을 잡는다. 전부 이번 변경 밖의 기존 브랜드 폰트 선언이고(L74·94·103·169·262 외 6건), DESIGN.md 가 `.impeccable/design.json` 보다 새롭다. 원칙 14 에 따라 억제 규칙을 넣지 않고 보고만 한다.
11. tsc 증분 캐시(`tsconfig.tsbuildinfo`, `tsconfig.json:20` `incremental:true`)가 한 번 유령 오류를 냈다: `consultation.ts(126,55) TS2339 ... 'never'`. 그 파일은 로컬 무변경이었고, `--incremental false` 전체 검사와 증분 재검사 둘 다 exit 0 이라 **재현되지 않는다**. 실제 결함이 아니라 증분 상태 잔여물이다. 증분 결과가 이상하면 `--incremental false` 로 한 번 확인할 것.
12. `npm run check:fast` 의 jest 단계가 윈도우에서 출력 없이 0xC0000409(3221226505)로 죽을 때가 있다(커밋 4·5 세션에서 재현). 래퍼는 이것을 `BLOCKED` 로 찍지만 전체 종료 코드는 0이라 조용히 넘어간다. 같은 러너를 직접 부르면(`node scripts/run-mock-tests.mjs jest`) 309 스위트·4,515 테스트가 통과한다. BLOCKED 가 보이면 러너를 직접 돌려 확인해야 한다.

## 남은 위험

- 측정 표본이 작다. v6 5건이고 연어·광어·자미·숙요·타로·물어보기는 0건이다. 반복 결론은 사주·베다·점성술에서만 실측됐다.
- 원가는 추정이다. 실제 토큰은 Phase 4 골든 전까지 미측정이다.
- 다른 세션과 파일이 겹칠 수 있다. 종격 세션(`service.ts` fingerprint, `usefulGod`·`jong`)과 타로 덱·Phase 2 세션이 있다. Phase 2 착수 전에 origin/main 기준으로 겹치는 파일을 다시 확인한다.
- Phase 1 설계의 위험(설계 문서 "위험" 절)
  - 카탈로그의 해석 매핑(십신 계열·숙요 관계 묶음·베다 카라카 → 영역)은 설계 판단이다. 골든 검토에서 조정할 수 있다.
  - 십신·신살 부재 확률은 추정이다. 골든 fixture 에 무재 명식과 귀인 없는 명식을 넣는다.
  - 자미 현재 대한은 엔진 값이 아니라 원장이 소한 나이(虛歲)로 고른다. fixture 로 고정한다.

## 롤백

- Phase 0·1 모두 문서만 바꿨다. 각 커밋 하나를 `git revert` 하면 된다.
- Phase 2 커밋 1(`5aa267a24`)·커밋 2(`c97fb52b2`)·커밋 3(`07cd0fe09`)은 각각 `git revert` 하나로 되돌린다. 커밋 2 를 되돌리면 sitemap 원장도 함께 돌아간다. 커밋 3 은 새 파일 2개와 설계 문서 4줄뿐이다. 커밋 4(`eddaa5c13`)와 커밋 5(`412dda498`)는 각각 새 파일 2개뿐이라 `git revert` 하나로 끝난다. 커밋 6(`602135a61`)은 배선이라 되돌리면 v7 모듈 5개가 다시 고아가 될 뿐 v6 동작은 그대로다 — `git revert` 하나로 끝나고, 되돌린 뒤 불변 스냅샷을 한 번 더 돌린다.
- Phase 3 검증기(`b996cfa41`)는 `git revert` 하나로 끝난다. `reading-quality.ts` 의 변경은 export 추가뿐이라 되돌려도 v6 품질 검증은 그대로다.
- §6-7 UI(`7e7e2d0b6`)도 `git revert` 하나로 끝난다. 되돌리면 sitemap 원장 `/` 서명도 함께 돌아가므로 `npm run verify:sitemap-drift` 가 통과한다. 플래그 OFF 라 사용자 화면은 revert 전후가 같다.

## 다음 단계

1. ~~설계 §6-1 불변 스냅샷~~ 완료(위 "Phase 2 커밋 1 결과").
2. ~~설계 §6-2 `reading-v7.ts`~~ 완료(위 "Phase 2 커밋 2 결과"). 아래 하위 항목은 기록용이다.
   - 카탈로그, `v7Applies`(플래그 인자 주입), `readingManifestV7`(순수), `withV7Sections`, `READING_V7_VERSION`·`hasReadingSections`·v7 정책 등록.
   - 정적 테스트 5종: 소유 충돌 0, 체계 안 단조성, `evidenceInputs` 실제 필드, 금지 요소 0, 원가 가드.
   - 끝나면 불변 스냅샷 테스트가 **갱신 없이** 통과해야 한다. `hasReadingSections` 등록이 v6 경로를 건드리면 여기서 잡힌다.
   - 그다음 세션부터 §6-3~7 을 한 커밋씩 한다. 플래그는 끝까지 OFF 다.
3. ~~설계 §6-3 `reading-v7-ledger.ts`~~ 완료(위 "Phase 2 커밋 3 결과").
4. ~~설계 §6-4 시기 매트릭스~~ 완료(위 "Phase 2 커밋 4 결과"). §6-6 배선 때 prepare 에서 `buildV7TimingMatrix` 를 v7 일 때만 부르고, 결과를 스냅샷(또는 `generationCheckpoint`)에 저장한다. 장 생성은 `withV7Timing` → `resolveV7Ledger` → `v7TimingSummaries` 순서다.
5. ~~설계 §6-5 `chapter-v7` 프롬프트·출력 스키마~~ 완료(위 "Phase 2 커밋 5 결과").
6. ~~설계 §6-6 배선~~ 완료(위 "Phase 2 커밋 6 결과"). Phase 2 는 여기서 끝난다.
7. ~~Phase 3 v7 검증기~~ 완료(위 "Phase 3 결과: v7 전용 검증기"). 네오 승인 2026-09-28.
8. ~~설계 §6-7 UI~~ 완료(위 "Phase 3 결과: §6-7 UI").
9. **Phase 4 골든 — 네오 차례. 막혀 있다.** 유료 LLM 실호출이라 절대 규칙 1 에 따라 **정확한 1회 승인**이 필요하다. 승인 문장에 범위를 못 박아 주기를 권한다(권장: "연어·광어·참치 각 1권, 사주 1체계, 총 3권까지 실호출 승인"). 승인되면 이 세션이 할 일은 ① 골든 fixture 로 v7 플래그를 로컬에서만 켜고 3권 생성 ② `[llm token_usage]` 로 장당 토큰·원가 실측 → `reading-v7-cost.ts` 추정 상수 교체(10% 이하 재확인) ③ 측정 절 지표로 v6 완료본과 반복 비교 ④ 카탈로그 해석 매핑·무재 명식 fixture 조정이다.
10. Phase 5(플래그 ON)는 Phase 4 결과에 의존하므로 함께 막혀 있다. 켜는 커밋에서 같이 할 일: 공개 티어 표(`app/yeongnyangi/1000-won-fortune/page.tsx:171`)를 v7 장 수·분량으로 교체(참치 "40,000자 이상" 약속은 못 지킨다 — 결정 5), 롤백 문서, 불변 스냅샷 해시 갱신(연어·광어·참치 `personal`·`ask`·타로 행만 바뀌어야 한다), 테스트 3개 수정(`yeongnyangi-reading-v6.test.mjs:45-65`, `yeongnyangi-section-paragraphs.test.mjs:84`, `yeongnyangi-consultation-kinds.test.mjs:27`).

## 복사할 재개 지시

```text
D:Developmentcode-destiny 에서 docs/handoff/2026-09-28-yeongnyangi-tier-chapters.md 와 docs/design/yeongnyangi-v7-chapter-catalog.md(§7·측정 1)를 읽어라. 영냥이 v7 은 Phase 2(§6-1~§6-6)·Phase 3(검증기)·§6-7(UI)까지 커밋 완료이고 플래그 READING_V7_ENABLED 는 여전히 OFF 다. 다음은 Phase 4 골든인데 유료 LLM 실호출이라 절대 규칙 1 상 네오의 정확한 1회 승인이 먼저다 — 승인 문장이 이 대화에 없으면 아무 것도 생성하지 말고, 필요한 승인 범위(몇 권·어느 티어·어느 체계)를 제시하고 멈춰라. Phase 5(플래그 ON)는 Phase 4 의 원가·품질 실측에 의존하므로 함께 대기다. 승인 후에도 실결제·운영 DB 쓰기는 금지이고, 골든은 로컬에서만 플래그를 켜서 돌린다. 불변 스냅샷 테스트(__tests__/ui/yeongnyangi-reading-invariance.test.mjs)는 Phase 5 까지 해시 갱신 없이 통과해야 한다. main·clean 확인과 git pull --ff-only 후 시작하라.
```
