# 운세 기능 7종 전수 조사 (AUDIT)

> 조사일: 2026-07-04 · 방법: 기능별 키워드 Grep/Glob → 실제 파일 확인 (추측 없음)
> 공통 사실: 7개 기능 모두 **Cloudflare Worker 라우트**(`worker/routes/*-ai.js`)가 API를 담당하며 `app/api/*` 프록시는 없음. 결제는 모두 `app/_lib/billing-client`의 명령형 `runBillingCoinGate` 플로우(+`forceDeduct: true`)를 사용하고 `useCoinGate` 훅은 사용하지 않음. LLM 호출은 전부 `callGeminiText`(`worker/lib/gemini.js` → `lib/llm-client.ts`).

## 1. 요약 표

| 기능 | 서비스 메인 페이지 | 내부(결과/상담) 페이지 | 관련 API route (Worker) | LLM 프롬프트 파일 | 결제/잠금 연결 | 공용 컴포넌트/라이브러리 |
|------|------|------|------|------|------|------|
| **숙요점 궁합** | `app/sukuyo-compatibility-ai/page.tsx` (+ 구형 정적 `app/sukuyo/compatibility/page.js`) | 별도 라우트 없음 — `SukuyoCompatibilityAiClient.tsx` 내 `CompatResultModal`(674-791행)로 인페이지 렌더 + PDF 내보내기 | `worker/routes/sukuyo-compatibility-ai.js` — `/prepare`, `/generate` | 같은 라우트 파일 인라인: `SYSTEM_PROMPT`(79-96행), `COMPATIBILITY_JSON_SYSTEM_PROMPT`(98-115행), `SUKUYO_SECTION_SPECS` 12섹션(51-64행), `buildFirstPrompt`(1008-1036행). 계산은 `worker/lib/sukuyo-ai-calculation.js` | ✅ `sukuyo-compatibility-ai` — registry 65/199/385/567행. **⚠️ 가격 불일치**: registry 300코인/3만원 vs 클라이언트·라우트 490코인/4.9만원 | `billing-client`, `auth-client`, `ai-prefill-seed`, framer-motion, lucide-react. UI는 자체 CSS 모듈(차트/씬 컴포넌트 파일 내 정의). Tea House용 별도 표면(`src/features/fortune-tea-house/sukuyoCompatibilityAdapter.ts`) 존재 |
| **인생의 책 / 인생 총운** | `app/life-book-ai/page.tsx` (구 `app/pdf/life-book/page.js`는 noindex 리다이렉트) | `app/life-book-ai/result/page.tsx` + `LifeBookAiResultClient.tsx`(567행, 새 창으로 열림) | `worker/routes/life-book-ai.js`(2312행) — `/prepare`, `/generate` | 같은 라우트 파일 인라인: `buildSystemPrompt`(898-912행), `buildLifeFortunePrompt` 10챕터+4전문가읽기+evidenceRefs(914-1000행). 계산은 `worker/lib/life-book-ai-saju.js`(694행). ※ `worker/lib/pdf-v2/`는 **존재하지 않음**(CLAUDE.md 기술과 불일치) | ✅ `life-book-ai-consultation` — registry 88/234/423행, 300코인/3만원, 클라이언트-레지스트리 일치 | `billing-client`, `ai-prefill-seed`, `auth-client`, lucide-react, **`app/components/lifebook/LifeFortuneGraph.jsx`**(공용 그래프) |
| **연애 비책** | `app/love-secret-ai/page.tsx` | `app/love-secret-ai/result/page.tsx` + `LoveSecretAiResultClient.tsx`(508행, 새 창) | `worker/routes/love-secret-ai.js` — `/prepare`, `/generate`, `/result(/:id)` | **전용 파일** `worker/lib/love-secret-ai-prompt.js` — 시스템 프롬프트 18규칙(68-91행), `buildFirstConsultationPrompt` 15섹션+7일/30일 가이드(93-194행), 팔로업(196-226행). 계산 `worker/lib/love-secret-ai-calculation.js` | ✅ `love-secret-ai-consultation` — registry 91/255/422행, 300코인/3만원 | `billing-client`, `auth-client`, `ai-prefill-seed`, `paid-attempt-session`, lucide-react, `styles/love-secret.css`. `components/` 의존 없음 |
| **베다점** | `app/vedic-ai/page.tsx` | 별도 라우트 없음 — `VedicAiClient.tsx` 인페이지 결과 패널(1192-1270행) + 팔로업 채팅 임베드 | `worker/routes/vedic-ai.js` — `/ensure-access`, `/start`, `/message` (+ `/api/geocode`) | 라우트 파일 인라인: 시스템 프롬프트(44-83행, "차트 JSON만 해석" 원칙), `buildFirstPrompt` 7섹션 고정(766-801행). 별도 `worker/lib/vedic-ai-prompt.js`/`vedic-ai-prompt-templates.mjs`는 **다른 기능**(`vedic_ai_prompt_generator`)용. **`veda/` 디렉토리는 미연결 프로토타입**(app/worker 어디서도 import 안 됨) — 실제 차트는 `worker/lib/vedic-ai-chart.js`+`swiss-ephemeris.js` | ✅ `vedic-ai-consultation` — registry 90/168/421/569-571행, 300코인/3만원 | `billing-client`, `auth-client`, `ai-prefill-seed`, lucide-react, `VedicAiClient.module.css`(1224행). 자체 완결 |
| **운명의 업** | `app/karma-destiny-ai/page.tsx` | `app/karma-destiny-ai/result/page.tsx` + `KarmaDestinyAiResultClient.tsx`(배치 생성 폴링) | `worker/routes/karma-destiny-ai.js`(2076행) — `/ensure-access`, `/start`, `/generate-batch`, `/result`, `/message`(팔로업 채팅) | 라우트 파일 인라인: `buildSystemPrompt`(650-705행, 명리+서양+베다 융합 페르소나), `PREMIUM_CHAPTERS` 16챕터/필수키워드/minLength(68-85행), 30,000자+ 목표. 계산 `worker/lib/karma-destiny-ai-calculations.js` | ✅ `karma-destiny-ai-consultation` — registry 92/257/424/554-556행, **500코인/5만원**(7종 중 최고가) | `billing-client`, `ai-prefill-seed`. 자체 `kdai-*` CSS. `components/` 의존 없음 |
| **자미두수 AI 상담** | `app/ziwei-ai/page.tsx` | 별도 라우트 없음 — `ZiweiAiClient.tsx` 인라인 결과 문서(809행) + `/message` 팔로업 채팅 | `worker/routes/ziwei-ai.js`(1680행) — `/prepare`, `/generate`, `/message` | 라우트 파일 인라인: `buildSystemPrompt`(817-850행, 삼방사정·사화 종합 강제, 3단 문단 형식), `buildFirstPrompt` 13섹션 JSON 스키마+17규칙(852-942행), 20,000-30,000자 밴드+자동 수선. 차트 `worker/lib/ziwei-ai-chart.js` | ✅ `ziwei-ai-consultation` — registry 94/256/425/552행, 300코인/3만원. ※ `ziwei_*` unlock 키들은 정적 `/ziwei/chart` 시스템용(별개) | `billing-client`, `auth-client`, `ai-prefill-seed`. ※ `app/_lib/ziwei-deep-*.ts`군은 이 기능이 아니라 정적 `/ziwei/chart`(`AdvancedZiweiSectionV2.tsx`)에서만 사용 |
| **신년운세 AI 상담** | `app/new-year-ai-consultation/page.tsx` | 별도 라우트 없음 — `NewYearAiClient.tsx`(1374행) 인페이지 결과. **팔로업 `/message`는 410으로 비활성**(원샷 전용) | `worker/routes/new-year-ai.js`(1722행) — `/ensure-access`, `/start`, `/message`(비활성) | 라우트 파일 인라인: `buildSystemPrompt` 14규칙(992-1015행), `buildFirstPrompt` 8필수구성(1017-1056행), 10,000-20,000자 게이트+확장/압축/수선 재시도(1074-1264행). 세운/12개월 흐름 서버 계산 주입 | ✅ `new-year-ai-consultation` — registry 89/254/420행, 300코인/3만원, `deferUsage`+`apply_after_success` | `billing-client`, `ai-prefill-seed`, html2canvas+jspdf(PDF). 인라인 `<style>` 자체 완결, `AppChrome.tsx`에서 네비 참조 |

## 2. 우선순위 (개선 필요도 높은 순 = UI/UX·프롬프트 완성도 낮은 순)

7개 모두 "완성된 유료 기능"이며 스텁은 없음. 따라서 순위는 상대 비교임.

| 순위 | 기능 | 근거 |
|------|------|------|
| 1 | **베다점** | 결과가 인페이지 렌더뿐이라 재열람/공유 불가(결과 라우트·저장 GET 없음). 프롬프트가 "제공된 JSON만 해석" 위주로 7종 중 가장 제약적·건조하고 섹션 수(7)도 최소. `veda/` 엔진이 통째로 데드코드로 방치되어 혼란 유발. |
| 2 | **신년운세 AI** | 팔로업 채팅이 410으로 막힌 원샷 구조 — 7종 중 유일하게 대화형 UX 부재. 결과 라우트 없음(새로고침 시 유실 위험). 프롬프트 자체는 상위권이라 UX 쪽이 병목. |
| 3 | **숙요점 궁합** | UI·프롬프트는 상위권이지만 **레지스트리(300/3만) vs 클라이언트·라우트(490/4.9만) 가격 불일치**라는 실결제 버그성 이슈 보유. 결과가 모달이라 재열람 불가. |
| 4 | **자미두수 AI** | 프롬프트는 최상위권(방법론 제약+13섹션+자동 수선). 다만 결과가 인라인이고 결과 라우트가 없어 재열람 UX가 약함. 정적 `/ziwei/chart`와 텍스트 2계통 공존으로 유지보수 부담. |
| 5 | **연애 비책** | 전용 프롬프트 파일 분리(7종 중 유일), 안전 규칙 18개, 결과 전용 라우트+폴링 폴백까지 갖춤. 소폭 개선 여지만 있음. |
| 6 | **인생의 책** | 30k-60k자 목표, evidenceRefs 근거 바인딩, 결과 라우트, 공용 그래프 컴포넌트 등 가장 구조화됨. CLAUDE.md의 `pdf-v2` 기술만 실제와 불일치(문서 갱신 필요). |
| 7 | **운명의 업** | 16챕터+챕터별 필수 키워드+배치 생성+팔로업 채팅+결과 라우트 — UI/프롬프트/UX 모두 7종 중 가장 완성됨. |

## 3. 조사 중 발견한 액션 아이템 (2026-07-04 처리 현황)

1. ~~**[버그] 숙요궁합 가격 불일치**~~ → **해결**: 레지스트리 기준 300코인/30,000원으로 통일 (`worker/routes/sukuyo-compatibility-ai.js`, `SukuyoCompatibilityAiClient.tsx`, `worker/routes/sukuyo.js`).
2. ~~**[데드코드] `veda/` 디렉토리**~~ → **해결**: 해석 지식(낙샤트라 27수·그라하 카라카·라시 특성)을 `worker/lib/vedic-ai-knowledge.js`로 이식 후 디렉토리 삭제.
3. ~~**[문서 불일치] CLAUDE.md pdf-v2**~~ → **해결**: 실제 구조(클라이언트 html2canvas+jspdf)로 갱신.
4. **[UX 격차] 결과 영속성** — 베다점 **해결**(`GET /api/vedic-ai/result` + `/vedic-ai/result` 페이지 + `?cid=`), 신년운세 **해결**(`GET /api/new-year-ai/result` + `?sid=` 복원 + 지난 상담 목록), 숙요궁합 **해결**(`GET /api/sukuyo-compatibility-ai/result` + `?cid=` 복원 + 지난 궁합 목록 + 모달 닫아도 결과 유지). 자미두수만 미보유.

## 4. 베다점 개선 내역 (2026-07-04)

- **정확성**: `validateChartConsistency`로 LLM 본문의 라그나/나크샤트라/마하다샤 서술을 서버 계산값과 사후 대조, 위반 시 수선 프롬프트로 1회 재시도. 프롬프트에 "계산 확정값" 앵커 라인 주입.
- **프롬프트 품질**: `worker/lib/vedic-ai-knowledge.js`의 전통 조티시 어휘를 차트 실사용 값에만 붙여 주입 + 섹션별 3단 구성(근거→해석→조언) + 상담 주제 연결 규칙.
- **재열람**: Worker `GET /result`(단건+최근 10건 목록), `/vedic-ai/result` 페이지(목록/상세/추가 질문), 메인 페이지 `?cid=` 복원.
- **시각화**: 북인도식 라시 차트(D1) SVG — 바바 탭 시 의미·지배성·그라하 해설, 빈쇼타리 다샤 타임라인(현재 시점 ▼ 마커), 히어로 장식 차트 프리뷰 (`app/vedic-ai/VedicChartVisuals.tsx`).

## 5. 신년운세 개선 내역 (2026-07-04)

- **[치명 버그 수정] 간지 한자 미변환**: `lunar-javascript`가 한자 간지(丁未)를 반환하는데 오행/십신/합충 테이블은 한글 키라서 **원국 분석 전체가 무력화**되어 있었음(십신 공란, 오행 분포 0, 월별 판정 왜곡). `toKoreanGanzi` 정규화로 수정 — 십신·격국·용신·조후·천간합충이 실값으로 산출됨.
- **[버그 수정] 월별 판정 오탐**: 기본 관계 문구의 "충돌"·"충합" 글자가 `/충/` 판정에 걸려 무관한 달이 전부 "주의"로 판정되던 문제 — 중립 표현으로 교체.
- **품질**: 프롬프트에 "계산 확정값" 앵커(세운 간지·십신·최강 원국 상호작용·12개월 확정 스펙) 주입, 12개월 각각 최소 1문단+간지 인용 지시. 품질 게이트에 `MISSING_MONTHS`(12개월 전수)·`ANNUAL_PILLAR_UNSTATED`·`MONTHLY_PILLAR_CITATIONS`(간지 인용 8/12 미만 반려)·`SEWOON_INTERACTION_UNSTATED` 추가, 위반 시 이슈별 수선 지침과 함께 확장 재시도.
- **영속화**: `GET /api/new-year-ai/result`(단건+최근 10건), `publicSession`에 `monthlyFlow`·`targetYear` 노출, 클라이언트 `?sid=` 복원 + 빈 상태에 "지난 상담 다시 보기" 목록. 팔로업은 정책대로 원샷 유지.
- **시즌 UI**: 연도 간지 배지(丁未·정미년·양띠), 세운 천간 오행→테마 컬러 CSS 변수, 새해 D-day/연중 경과율 표시, 연도 선택을 올해/내년/직접입력 칩으로 교체.
- **결과 UI**: 12개월 운세 캘린더(판정별 색, 탭 시 간지·십신·관계 해설) + 4분기 요약 카드(PDF 저장에도 포함), 캔버스 직접 드로잉 방식 SNS 공유 카드(1080×1350, Web Share API+다운로드 폴백).

## 6. 숙요점 궁합 개선 내역 (2026-07-04)

**진단 요약**: 프롬프트가 "이름·오행·숙·수호신·관계 유형·거리·점수를 12개 body마다 반복 언급"을 강제해 보일러플레이트를 유발했고, 27숙 12관계 유형(명/업/친…)의 정의·논리는 컨텍스트에 없어 근거 없는 단정이 가능했음. 출력 마크업 허용 범위가 렌더러(굵게/번호/하이픈/인용만 파싱)와 어긋났고 body 5,200자 하드 슬라이스로 문장 중간 절단 위험. UI는 1.8만자 12섹션을 모달에 일괄 렌더(챕터 네비 없음), 모달 닫으면 결과 소멸(setConsultation(null)), 재열람 GET 없음, 스텝형 입력(카드 대비 구조 아님), 결과 티저 없음.

**수정 내역**:
- **프롬프트**: 12유형 상성 정의 사전(`relationLogic`) 주입, "매 body 전 요소 반복" → "섹션 주제와 관련된 계산 근거 최소 1회 명시 인용"으로 교체, 근거 없는 찬사 보일러플레이트 금지 명문화, '운명적 끌림 vs 현실적 조율' 2축 서사 지시, 허용 마크업 4종(굵게/번호/하이픈/인용)으로 출력 포맷 고정.
- **파싱 안전**: 5,200자 초과 시 마지막 문장 경계에서 절단.
- **영속화**: `GET /result`(단건+최근 10건) 신설, `?cid=` 복원, 모달 닫기는 `resultOpen`만 토글(결과 유지, "다시 열기" 버튼), 지난 궁합 목록 노출.
- **UI**: 입력을 나의 별/상대의 별 카드 2장 대비 구조(+완성 상태 표시, ✦ 브릿지)로 교체, 입력 완료 전 흐림 티저(게이지·별 라인) 노출. 결과 모달은 요약 헤더(두 숙 별자리 라인 SVG + 원형 궁합 게이지 + 끌림/조율 듀얼 미터) + 12챕터 칩 네비게이션 + 순차 공개(다음 장 열기), 챕터 진입마다 숙요 역술가 보이스 로딩 카피 12종(정책: AI 상담 페르소나는 마스코트가 아닌 분야 전문가). PDF는 화면 밖 전체 렌더(`pdfSource`)로 기존 품질 유지.

## 7. 자미두수·연애 비책·인생의 책 개선 내역 (2026-07-04)

### 자미두수 AI (`worker/lib/ziwei-ai-chart.js`, `worker/routes/ziwei-ai.js`, `ZiweiAiClient.tsx`)
- **[버그] 오국 명칭 오류 수정**: 2국=목이국→수이국, 3국=화삼국→목삼국, 6국=수육국→화육국 (사화표 자체는 표준과 일치 확인).
- **[버그] 의사난수 명암 제거**: 별 이름 해시 기반 가짜 묘·왕·평·함이 계산값으로 주입되고 프롬프트가 "강약을 반드시 해석에 반영"하도록 강제하던 문제 — 명암 산출 제거 + 프롬프트를 "강약 미제공, 임의 단정 금지"로 교체, 스키마 strength 필드 삭제.
- **품질**: 계산 확정값 앵커(명궁 지지·주성, 신궁, 사화 4성의 실제 궁 위치, 오행국) 주입. `enforceZiweiChartFacts`로 LLM meta(명궁/신궁/사화/현재 대한)를 서버 확정값으로 덮어쓰고, 본문이 사화 4성·12궁(9개 이상)·명궁 주성을 실제 참조했는지 검증 → 위반 시 1회 재생성(잔여 시 경고 로그).
- **UI/영속화**: `GET /api/ziwei-ai/result`(단건+최근 10건) + `?cid=` 복원 + 지난 상담 목록, 대한(大限) 타임라인(현재 나이 ▼, 구간 탭 시 주성·사화, 화기 대한 표시), 상담 전 빈 화면에 12궁 명반 프리뷰.

### 연애 비책 (`worker/lib/love-secret-ai-prompt.js`, `worker/routes/love-secret-ai.js`, 클라이언트)
- **확언 차단 확장**: "반드시 이뤄집니다/결혼/사귀/재회", "무조건 이뤄", "100% 성공", "틀림없이" 패턴 추가(기존 정규식은 돌아/좋아/싫어/연락만 커버).
- **근거 강제**: "명리 근거·심리·행동 중 하나 이상" 허점을 "모든 섹션에 명리 근거 최소 1회 명시"로 교체, 일반론 금지·보일러플레이트 금지·다정함/직설 전환 톤 규칙(19·20) 추가(페르소나는 연애 전문 명리 상담사). `validateLoveSecretGrounding`으로 일간·십성 인용, actionSecrets `(근거: …)`, 배지 포맷을 사후 검증 → 위반 시 1회 재생성.
- **전략 카드**: actionSecrets를 `[난이도·타이밍] 행동 (근거: …)` 포맷으로 고정하고 결과 페이지에서 난이도(쉬움/보통/도전)·타이밍(오늘/이번 주/이번 달) 배지 카드 그리드로 렌더(기존엔 UI에서 완전히 버려지던 필드).
- **상황 선택**: "썸 타는 중" 옵션 추가(백엔드는 이미 지원, 클라이언트에만 부재).

### 인생의 책 / 인생 총운 (`worker/routes/life-book-ai.js`, 클라이언트)
- **[데드코드 부활] 수선 루프**: `MAX_PROVIDER_CALLS 1→2` — 품질 미달 시 곧장 실패·환불하던 구조에서 1회 수선 재시도 가능해짐(verify 계약 갱신).
- **[도달 불가 해소] 총운 모드 진입**: 서버에만 존재하던 `lifeFortune` 모드를 클라이언트 토글(인생의 책=감성 서사 / 인생 총운=정밀 진단)로 개방.
- **톤 분리**: 시스템 프롬프트를 모드 인지형으로 — 책 모드는 명리학자 화자의 감성 서사(근거를 이야기 속 문장으로, 화자 일관성), 총운 모드는 분석 신뢰+온기(문장마다 근거, 덕담 금지, 강점·리스크 균형).
- **중복 서사 검출**: 20자 이상 동일 문장이 다른 장에 3회 이상 반복되면 반려(`duplicate_narrative`) + 수선 지침. 책 모드에 장별 명식 근거 2개 이상 위빙 지시 추가.
- **독서 UX**: 결과 뷰어에 책 진도 바(스크롤 %), 표지에 주인공 이름 각인, "마지막 장" 감성 마무리+CTA, 명리학자 보이스 로딩 카피. 결제 게이트는 이미 폼 페이지에만 있고 읽기 창을 막지 않음을 확인.
- **index.html 총운 카드 가격 표기**: 카드의 "AI 상담 · 30,000원" 표기는 실제 판매가로 **유지가 맞음**(사용자 확인). 코인 표시 정책은 "코인 정수 노출 금지"이지 통화 표기 금지가 아니므로 위반 아님. 이를 금지하던 `verify-life-book-ai-flow.mjs`의 낡은 단언을 "가격 표기 필수"로 갱신.

### 잔여 이슈 (별도 처리 필요)
- 정적 `/ziwei/chart` 엔진의 `verify-ziwei-brightness-constraints` 실패 — 이번 세션 이전부터 존재하는 별개 시스템의 명암표 불일치.
- 인생 총운 30k~60k자 계약은 40k 토큰 1회+수선 1회로도 빠듯할 수 있음 — 실패율 모니터링 후 분량 계약 재조정 검토.
- `LifeFortuneGraph.jsx`는 여전히 미연결 데드 컴포넌트(데이터 계약 불일치) — 삭제 또는 재설계 대상.
