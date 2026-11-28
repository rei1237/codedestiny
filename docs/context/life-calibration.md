# 인생 보정(Life Calibration) — 설계 근거와 규칙

상태: **설계 단계(P1a, 2026-11-28).** 코드·스키마·화면은 아직 없다. 이 문서는 구현 전 합의 사항과 금지 사항의 정본이다.
기준 커밋: `122049a297`(origin/main, 2026-11-28). 아래 경로·줄은 이 커밋에서 실측했다.

## 한 문장 원칙

엔진의 계산은 바꾸지 않는다. 사용자가 알려 준 과거 경험은 **해석 레이어에서만** 보정 신호로 쓴다.

- 원국 판정(격국·진가종·강약·조후·용신)은 읽기만 한다. 경험은 대운·세운 해석의 강조와 예시에만 쓴다.
- `calculateLocalResult()`(`app/saju/animal-destiny/lib/sajuAdapter.ts:284`, 미export)와 6개 엔진 코드는 수정하지 않는다. 연도 신호는 래퍼로만 꺼낸다.
- KASI prefetch 와 `normalizeSaju.ts` 에 timezone 을 넣지 않는다.
- 결제 실행 파일은 건드리지 않는다.

## 기존 장치와의 관계 — v1 을 확장한다 (2026-11-28 결정)

사주 한정 "과거 경험 보정 v1" 이 이미 있다. 새 기능은 이를 대체하지 않고 넓힌다.

| 항목 | 현재(v1) | 확장 |
|---|---|---|
| 정본 모듈 | `lib/saju/experience-calibration.mjs` (`CALIBRATION_VERSION='experience-calibration-v1'`) | 정책·분류의 정본으로 유지 |
| 결과 분류 | good·bad·mixed·ordinary·unsure·skip | 그대로 |
| 강도 | 1~3 | 그대로 |
| 분야 | career·business·money·relationship·study | family·relocation·social·other 를 forward-add. **건강은 만들지 않는다** |
| 정책값 | `CALIBRATION_POLICY` shrinkK 4, cap 0.15, minSignals 3, minYears 2, maxEntries 40, noteMax 80 | 그대로. 마스터 프롬프트의 k=2·valence ±3 은 채택하지 않음 |
| 저장 | 정적 셸 사주 AI: localStorage(`js/saju-engine.js` `_sajuPromptCalibStorageKey`, payload v2). 영냥이 `saju_tuna`: 주문마다 설문(`app/yeongnyangi/_components/ExperienceSurvey.tsx`) | 서버 `life_events`(동의 후). localStorage v2 는 동의 뒤 1회 업로드 경로 |
| 프롬프트 주입 | `worker/lib/saju-calibration.js` → `worker/lib/saju-ai-prompt.js` `buildSajuAIPrompt({calibration})`; 영냥이 `worker/yeongnyangi/fortune/saju/experience.ts` fact | 공통 블록 헬퍼(아래)로 다른 기능에 opt-in |

🔴 영냥이 결제 fingerprint(`worker/yeongnyangi/service.ts:231`)는 이미 `experienceKey` 를 포함한다. 서버 저장값을 자동으로 붙이면 주문 동일성이 바뀐다. 1차에서는 영냥이 결제 경로를 바꾸지 않는다(주문 설문 유지, 저장값으로 미리 채우기만 검토).

## 데이터 모델 초안 (P1b, RED: DB — 별도 승인 필요)

forward-add 만 한다. 기존 문서·필드의 의미를 바꾸지 않는다. 마이그레이션 없음.

- `LifeEvent` → `life_events`, `schemaVersion: 1`
  - `userId, profileId, year, month?, outcome, intensity, domain?, certainty, note?(≤80, v1 noteMax), source: "profile_form"|"diary"|"monthly_checkin"|"legacy_local", createdAt, updatedAt, deletedAt?`
  - 인덱스 `{userId, profileId}`, `{profileId, year}`. 같은 연도는 1건으로 병합하는 UX.
- `LifeCalibration` → `life_calibrations`(파생 캐시, 언제든 재계산 가능)
  - `inputHash`(events + 엔진 래퍼 버전), `engineVersions`, 엔진별 affinity·confidence, `narrative`, `timeline`, `computedAt`.
  - 저장 시 1회 계산. 조회 경로에서 재계산하지 않는다.
- `LifeCalibrationConsent` → 동의 이력. 참고 구현은 `EmailMarketingPreference.history[]`(`worker/lib/email-marketing-models.js`): `{granted, at, source, version, text}`.
- `ProfileCard.isSelf`(선택 Boolean) forward-add. 현재 "본인" 표시는 없다(`worker/lib/models.js:275–303`; `destinyProfilesCurrentId` 는 선택 카드일 뿐).
- Mongo 관례: `connectDb`·`withMongoRetry`(`worker/lib/db.js`), `scopedModel`. read preference 헬퍼는 없다.
- 메모 필드 단위 암호화 헬퍼 존재 여부: **미확인.** P1b 시작 전에 확인한다.

### 동의·철회·파기 흐름

- 인생 경험을 처음 입력하는 순간에만 선택 동의 바텀시트. 거부해도 기존 서비스 동일.
- 동의 없으면 API 403, 입력 UI 비노출.
- 철회: `life_events`·`life_calibrations` soft delete → 배치 hard delete(기간은 처리방침에 명시), 파생 캐시 무효화.
- 연쇄 삭제 추가 지점(실측)
  - 프로필 삭제 `handleDeleteProfile` — `worker/routes/profile.js:1461`(현재 `ProfileCard.findOneAndDelete` :1507 과 캐시 무효화만)
  - 회원 탈퇴 `handleWithdraw` — `worker/routes/auth.js:4130`(삭제 목록 :4290–4336)
- 이미 생성·구매한 상담 결과는 유지한다(보관함 보존 정책). 이후 결과에만 반영하지 않는다.
- 로그·에러 리포트에 메모 원문 금지. 관리자 화면에서도 기본 마스킹.

### 입력 대상 제한

- 1차는 본인 프로필(`isSelf`)만. 타인 프로필은 제3자 정보 동의 설계가 필요하므로 별도 결정.
- 만 14세 미만: 가입 단계에서 이미 차단(`worker/lib/validation.js:160`, `worker/routes/auth.js:2716`). 기존 `guardianConsent` 계정은 로그인 차단. 새 기능은 `legalConsents.age14AttestedAt` 확인만 둔다.

## 엔진별 연도 신호 (P3)

모든 래퍼는 순수·결정적 함수. 기준 연도는 인자로 받는다(시간·랜덤 의존 금지). 위치는 `lib/calibration/`(서버 전용 엔진은 `worker/lib/` 쪽 래퍼).

| 엔진 | 쓸 함수 | 비고 |
|---|---|---|
| 사주 | `daeun()` `lib/korean-calendar/daeun.js:204`, `sexagenaryPillar` `lib/saju/experience-calibration.mjs`, `tenGodForStem` `app/saju/animal-destiny/engine/localSajuCalculator.ts:1138`, `buildLuckNatalInteractions` `worker/lib/life-book-ai-saju.js:480`, `evaluateLuckDynamics` `lib/saju/luck-dynamics.mjs:53`, 용신 `analyzeNatalCore().yongsinMethods` | `calculateNewYearFortuneData`(new-year-ai.js)는 테스트 export 뿐이고 DB 를 import 하므로 쓰지 않는다 |
| 자미두수 | `yearFlowTheory(chart, year)` `app/_lib/ziwei-year-flow.ts:158` | 유년 명궁 + 사화. 월 단위 함수 미확인 |
| 서양점성술 | `AstroTransits.period` `js/core/astro/transits.js:398` + 서버 `createSwissTransitLonsAt` `worker/lib/swiss-ephemeris.js:1195` | 일식표가 2036-08 까지 — 그 뒤 연도는 일식 신호 제외 |
| 베다 | `buildVimshottariDasha(moonLon, birthUtc, now)` `worker/lib/vedic-derived-calculations.js:172` | 서버 Swiss 차트 필요 |
| 숙요 | `calculateSukuyoForMoment`(`worker/lib/sukuyo-astronomy.js`) + 출생 수 거리 | `buildSukuyoYearlyFortuneResultV2` 점수는 userId 시드 해시라 보정에 쓰지 않는다 |
| 타로 | — | 연도 신호 없음. LLM 블록에는 과거 경험·패턴 요약만 |

## 충돌 처리 규칙

- 보정값은 별도 층이다. 결과는 "기본 해석" + "당신의 경험 반영" 두 층으로 보이고, 기본 점수를 덮어쓰지 않는다.
- 경험이 기본 판정과 반대로 강하게 일관되면 `conflictFlag`. LLM 은 조후·통관·대운 배경으로 재해석하고, 어느 쪽도 "틀렸다"고 하지 않는다.
- 기본 임계값(🔶 미확정): 같은 방향 3회 이상(v1 `minSignals:3`) + confidence 0.7. 설정 파일에서 조정.

## LLM 주입 패턴 (P4)

- 공통 주입 지점(`lib/llm-client.ts` `applyOutputLocale`)에는 넣지 않는다. 모든 기능의 캐시 키가 바뀌고 프롬프트 바이트 고정 테스트가 깨진다.
- 기존 패턴을 따른다: 기능별 opt-in 블록 헬퍼(예 `buildShinsalFactsBlock` `lib/saju/shinsal-facts-block.mjs`) + 소비자 CSV 롤아웃(`ENGINE_ROLLOUT_FLAGS`, `worker/lib/engine-rollout.js`). 이 기능의 키는 `LIFE_CALIBRATION_V1`(예정).
- 블록 ≤ 600 토큰. 동의·데이터가 없으면 블록 자체를 넣지 않는다(빈 블록 금지). 플래그 OFF 면 프롬프트 바이트 동일.
- 모순 가드: 규칙 기반으로 연도+긍부정 표현 추출 → 위반 시 1회 재생성 → 남으면 해당 문장만 중립 치환. 결제 결과 보장 계약(`docs/context/ai-and-db.md`)을 따르며 결과를 막지 않는다.
- 통과해야 할 가드: `config/ai-locale-call-inventory.json`(`scripts/audit-ai-locale-calls.mjs`), `verify:paid-llm-delivery`, 프롬프트 바이트 고정 테스트, CMS 카탈로그 커버리지, `verify-i18n-no-hardcoded-korean`.

## 플래그

- 워커 `[vars]` 예산이 가득 차 있고 `worker/wrangler.toml` 구조 변경은 금지다. 환경변수 `LIFE_CALIBRATION_ENABLED` 대신 코드 상수를 쓴다: 워커는 `ENGINE_ROLLOUT_FLAGS`, 클라이언트는 `lib/life-calibration/flags.mjs`(예정, 기존 `lib/*/flags.mjs` 패턴). 롤백은 상수 되돌림 + 재배포.

## 화면 (P2·P5·P6)

- 입력: 프로필 저장 직후 "한 걸음 더"(건너뛰기 가능), 인생 그래프 SVG + 목록 입력 대안 모드. 터치 타깃 44px 이상, 색만으로 좋음/힘듦을 구분하지 않음, `prefers-reduced-motion` 존중, transform·opacity 애니메이션만.
- 즉시 피드백 "당신의 패턴" 한 줄은 템플릿 문장(LLM 호출 없음).
- 정적 결과 오버레이: `js/saju-engine.js` `renderLifeGraph`(canvas)·`renderDaewun` 위에 ★/☾ 마커. 그래프의 대운은 lunar-javascript 계산이라 KASI `daeun()` 과 어긋날 수 있다(기존 위험) — 마커 연도는 연도 축에만 맞춘다.
- 다이어리 "나의 흐름": 다이어리는 localStorage 전용이고 프로필 구분이 없다(`lib/diary/diary-store.js`, `lib/diary/diary-ext-store.js`). 서버 타임라인을 읽어 보여 주는 읽기 전용 탭부터. 확장 지점 `app/diary/page.tsx`, `DiaryDayView.tsx`. 큐레이션은 i18n authored 템플릿 라이브러리.
- 캐릭터: 꿀꿀 운세는 연이, 영냥이 브랜드는 영냥이. 브랜드는 라우트 prefix 와 `'ggulggul'|'yeongnyangi'` prop 으로 구분(중앙 헬퍼 없음). 사용자 문자열은 전부 i18n 키(`i18n/authored/<ns>-NN.json`, `useTPick`).

## 금지 사항

- 건강 분야 태그. 메모 입력은 질병·종교·정치·범죄·타인 실명 안내 + 키워드 감지 시 저장 전 확인 모달(차단 아님). 키워드 목록은 i18n 과 분리된 설정 파일.
- 메모 원문을 로그·지표·LLM 장문 인용에 쓰지 않는다.
- "정확도 ○○% 보장", "100% 적중" 같은 표현. "당신의 경험을 반영한 맞춤 해석" 수준으로만.
- 주의 시기를 피할 수 없는 불행으로 단정하거나 공포를 조장하는 문장. 의료·법률·투자 판단.
- 동의 문구의 "AI 학습에 사용되지 않음" 표기 — Gemini 데이터 보존·학습 설정을 확인하기 전까지 금지(레포에 근거 없음).

## 출시 선행 조건

- **LLM 국외이전 고지 개정이 먼저다.** 현재 처리방침(`app/privacy-policy/PrivacyPolicyContent.jsx`)에는 Gemini(미국) 국외이전 고지가 없다. 별도 선행 과제로 다루며 초안은 [privacy-drafts-2026-11-26](../security/privacy-drafts-2026-11-26.md)이다. 인생 보정 플래그는 그 개정의 시행일 이후에 켠다.
- 인생 보정 법무 문구 초안: [life-calibration-legal-draft-2026-11-28](../security/life-calibration-legal-draft-2026-11-28.md). 게시 전 개인정보 전문가 검토.

## Phase 계획

- [x] P0 진단(읽기 전용) — 2026-11-28
- [x] P1a 설계 문서·법무 초안(이 문서)
- [ ] P1b 데이터 모델·API·연쇄 삭제 (RED: DB, 별도 승인)
- [ ] P2 입력 UX
- [ ] P3 보정 엔진(래퍼·순수 함수·테스트: 결정성, 수축, 플래그 OFF 동일성, `calculateLocalResult` 불변)
- [ ] P4 LLM 블록·모순 가드
- [ ] P5 사주 정적 결과 오버레이
- [ ] P6 다이어리 "나의 흐름"·월간 체크인
- [ ] P7 검증(360px·960px·Android WebView·앱인토스 실화면)·출시

전달 흐름은 저장소 규칙을 따른다(2026-11-28 결정): main 직접 작은 커밋, 플래그 OFF 로 숨김, 브랜치·PR 없음, 스테이징 검증은 출시 전에만.

## 🔶 미결정 항목 (기본값)

1. 충돌 임계값 — 같은 방향 3회 이상 + confidence 0.7
2. 타인 프로필 입력 — 1차 제외
3. 다이어리 LLM 확장판 — 1차는 무료 템플릿만(과금 연결 시 결제 문서 절차)
4. 입력 보상 월정석 — 1차 없음. 제공하더라도 동의 거부 불이익 없음 원칙과 충돌하지 않게 '입력 보상'으로만
5. 연도 입력 상한 12개(v1 maxEntries 40, 사주 AI 8 사이), 월간 체크인 월 1회

## 범위 밖 기존 결함 (보고만)

- 처리방침에 LLM 국외이전 미고지(위 출시 선행 조건).
- 프로필 삭제 때 `profile_pets`(`worker/lib/profile-pet.js:78`)가 지워지지 않는다. 탈퇴 때만 삭제.
- 숙요 연운 점수가 userId 시드 해시라 같은 생년월일이라도 사용자마다 다르다(`worker/lib/sukuyo-yearly.js`).
- 사주 인생 그래프의 대운(lunar-javascript)과 KASI `daeun()` 불일치 가능성.
