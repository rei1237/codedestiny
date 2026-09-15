---
status: active
updated: 2026-09-15
next: "P1의 과거 completed 결과 GET 취소/환불 정책 대조부터 진행한다. 손금 모바일 mock 결제 복귀와 후속 답변 새로고침 복구는 재구현하지 않는다."
---

# 유료 LLM 전체 전달표와 잔여 검증

## 읽는 기준

- 이 표는 `paid-feature-registry.js`의 상품 키와 활성 Worker 라우트의 직접/간접 LLM 호출을 대조한 결과다. 가격 숫자는 복제하지 않는다. 가격·이용권·월정석·단건 결제 정본은 기존 registry와 billing이다.
- **구현·mock 통과**는 저장·재개 코드와 아래 회귀 검사가 있다는 뜻이다. 실제 고객 결제, 실 LLM 문장 품질, 운영 DB 및 물리 모바일 전달을 증명하지 않는다.
- 초기 상세 리포트의 공백/제목/목차를 뺀 본문 20,000자 하한과 기존 더 큰 목표를 유지한다. 꿀편지·짧은 후속 답변·동물 연결문·요가 코스·손금은 기존 개별 계약을 유지했다. 과거 완료 구매본에 새 분량 문턱을 소급하지 않는다.
- 검사 경로의 `W/`는 `__tests__/worker/`, `U/`는 `__tests__/ui/`다. 생성기는 `worker/routes/` 또는 별도로 표시한 `worker/lib/`에 있다. 표의 검사들은 실제 코드와 mock 저장소/제공자를 사용하며, 모든 실제 결제수단×언어×기기 조합을 전수 검사한 것은 아니다.
- 이전 두 문서의 기능별 기록은 자세한 설계/검사 이력이다. 뒤쪽 최초 조사에서 적은 “미수정”은 해당 기능의 최신 기록과 이 표를 우선한다.

## 대표 상담과 전문가 상담

| 상품 / canonical 키 | 실제 생성·저장 진입점 | 현재 전달 계약 및 검사 |
|---|---|---|
| 연이 운명 상담 `fortune-chat-consultation` | `/fortune-chat/` → `fortune.js` `/guardian/generate`, `guardian-paid-delivery.js`, `/guardian/result` | **이번 보강**. 무료 소진 뒤 paid turn을 먼저 서버 저장. 같은 requestId 재개, provider fallback/mock 거부, 저장 후 완료. 대화 내역 80개 저장 확인. W/guardian-paid-delivery.test.js, U/guardian-paid-turn-recovery.test.js, U/fortune-chat-storage.behavior.test.js |
| 초융합 `fusion-fortune-consultation` | `/fusion-fortune/` → `fusion-fortune.js`, `worker/lib/fusion-fortune.js` | 최초 계산 스냅샷·단계·정상 본문 보존, 원래 결제 재사용, 저장 ID 없는 완료 차단. 기존 3만자 이상 목표 유지. W/fusion-paid-delivery-route.test.js, W/fusion-snapshot-delivery.test.js |
| 마스터 인연의 서 개인 `master-love-codex` | `/master-love-codex/` → `master-love-codex.js` | 개인판 원래 사주/자미 계산과 근거 계약, 장별 진행·저장·재개. W/master-love-codex-paid-delivery.test.js |
| 마스터 인연의 서 궁합 `master-love-codex-compat` | 같은 라우트의 compat 모드 | 두 사람의 계산 근거 분리 및 같은 구매본 재개. 개인판과 다른 SKU 유지. 같은 W 검사에 두 모드 포함 |
| 네오 `neo-operation-room-consultation` | `/neo-operation-room/` → `neo-operation-room.js` | 1차 14장과 2차 작전 수정 8장을 별도 진행으로 보존. 궁합 ziwei/saju/astrology/vedic 근거 유지. W/neo-paid-delivery.test.js, verify:neo, verify:neo-output-safety |
| 나크샤트라 심화 `nakshatra-ai-consultation` | `/nakshatra/` → `nakshatra-ai.js` | 짧은 호출, 정상 부분 즉시 저장, 취소 확인·원래 요청 재개. W/nakshatra-paid-delivery.test.js |
| 인생의 책 `life-book-ai-consultation` | `/life-book-ai/` → `life-book-ai.js` | 장별 정상 본문 보존→delivery_pending→원래 deferred apply→완료 재조회. U/life-book-paid-delivery.behavior.test.js, W/life-book-ai.sections.test.js |
| 인생 총운 `life-fortune-ai-consultation` | 같은 라우트의 총운 상품 | 별도 상품·기존 3만~6만자 생성 목표 유지. 인생의 책과 같은 저장·차감 응답 유실 회귀 |
| 일반 자미두수 `ziwei-ai-consultation` | `/ziwei-ai/` → `ziwei-ai.js` | 궁/사화 계산과 정상 묶음 보존, 저장 실패 503, 부분 202. W/ziwei-paid-delivery.test.js, U/ziwei-paid-resume.behavior.test.js |
| 심화 자미두수 PDF `ziwei-deep-pdf` | `ziwei-deep-report.js` | 15장별 생성·확정 저장. null/throw/재조회 실패를 배치 완료로 넘기지 않는다. U/ziwei-deep-paid-delivery.behavior.test.js, verify:ziwei-deep-report-flow |
| 서양 점성술 `astrology-ai-consultation` | `/astrology-ai/` → `astrology-ai.js` | 차트와 섹션 고정, 미완료 부분만 재생성, 짧음/누락은 완료 금지. W/astrology-paid-delivery.test.js |
| 베다 `vedic-ai-consultation` | `/vedic-ai/` → `vedic-ai.js` | 라그나/다샤/하우스 근거와 정상 그룹 보존, 상태별 저장·복구. W/vedic-paid-delivery.test.js |
| 숙요 궁합 `sukuyo-compatibility-ai` | `/sukuyo-compatibility-ai/` → `sukuyo-compatibility-ai.js` | 원래 궁합/결제·장별 진행 유지, null 저장 성공 금지. W/sukuyo-compatibility-ai.duplicate-generation.test.js |
| 운명의 업 `karma-destiny-ai-consultation` | `/karma-destiny-ai/` → `karma-destiny-ai.js` | 초기 상세 장별 생성/저장/재개. **이번에 후속 질문도 보강**. W/karma-paid-delivery.test.js, W/expert-follow-up-delivery.test.js, U/karma-follow-up-recovery.test.js |
| 신년운세 `new-year-ai-consultation` | `/new-year-ai/` → `new-year-ai.js` | 4분야 저장, targetYear 보존, apply 유실 재개. U/new-year-paid-delivery.behavior.test.js. `/message`는 기존 FOLLOW_UP_DISABLED 유지 |
| 연애 비책 `love-secret-ai-consultation` | `/love-secret-ai/` → `love-secret-ai.js` | 6묶음/28절·기존 3만~3만6천자 목표. 정상 묶음과 결제 보존. U/love-secret-paid-delivery.behavior.test.js. `/message` API 저장/중복 방지도 보강했지만 현 React 화면의 활성 후속 입력은 발견되지 않음 |
| 작명첩 `premium-naming-report` | 작명 UI → `naming-prompt.js`, `naming-report-delivery.js` | 8장 부분 생성, 이름 후보/최종 선택·계산 근거, 원래 실행 기록으로 저장/재개. W/naming-paid-delivery.test.js. `premium-naming-prompt`와 과거 주문/alias는 기존 registry 의미 유지 |

## 나머지 실제 LLM 상품

| 상품 / canonical 키 | 생성·재개 정본 | 구현 및 검사 |
|---|---|---|
| 사주 질문 `saju_ai_question_prompt` | `fortune.js`, `js/saju-engine.js` | 12챕터/본문 2만자/십성 근거, 그룹 저장과 job 재개. W/saju-paid-delivery-recovery.test.js, U/saju-paid-delivery.behavior.test.js |
| 점성술 질문 `astrology_ai_prompt_generator` | `fortune.js` `/astrology/ai-prompt`, `/ai-result` | **이번 보강**. 10부분×2200자 하한, 4부분/요청, 부분당 3회, 원래 계산/증빙 저장. W/feature-question-paid-delivery.test.js, U/feature-question-recovery.behavior.test.js |
| 자미 질문 `ziwei_ai_prompt_generator` | `fortune.js` `/ziwei/ai-prompt`, `/ai-result` | 같은 질문 전달 엔진. 실제 정적 composer의 새로고침/online 복구 연결. 같은 검사 |
| 숙요 질문 `sukuyo_ai_prompt_generator` | `fortune.js` `/sukuyo/ai-prompt`, `/ai-result` | 실제 solo/compat 정적 composer와 동일 결과 재개. 두 composer는 같은 상품 종류의 최근 결과를 읽으며 새 이력 선택 UI는 추가하지 않음 |
| 베다 질문 `vedic_ai_prompt_generator` | `fortune.js` `/vedic/ai-prompt`, `/ai-result` | 서버 API의 생성·저장·재개 mock 통과. **활성 frontend 직접 호출은 미발견**. 베다 전체 전문가 리포트와 구분 |
| 찻집 3카드 `fortune-tea-house-tarot-consultation` | `fortune-tea-house.js` | 기존 카드/상담 원문·언어를 저장하며 짧게 이어 생성. 본문 저장→원래 차감 apply→완료 재조회. W/fortune-tea-house-delivery-billing.test.js 및 기존 찻집 생성 검사 |
| 찻집 5카드 `fortune-tea-house-tarot-five-consultation` | 같은 라우트 5카드 모드 | 별도 가격·카드 수·필수 해석 계약 유지. 공통 저장 계약과 모드 콘텐츠 검사 |
| 찻집 사주 `fortune-tea-house-saju-consultation` | 같은 라우트 사주 모드 | 원래 명식 보존, 공통 저장/재개 계약 |
| 찻집 사주 궁합 `fortune-tea-house-saju-compatibility-consultation` | 같은 라우트 사주 궁합 모드 | 두 사람 명식 보존, 공통 저장/재개 계약 |
| 찻집 숙요 궁합 `fortune-tea-house-sukuyo-compatibility-consultation` | 같은 라우트 숙요 궁합 모드 | 숙요 관계 근거 보존, 공통 저장/재개 계약 |
| 꿀편지 (기존 찻집 후속 소비) | `fortune-tea-house.js` handleHoneyLetter | 생성문 선저장, 원자 차감/receipt, lease 120초, 불확실 차감 재확인. W/fortune-tea-house-honey-drops.test.js, U/honey-letter-recovery.behavior.test.js. 새 단건 SKU/가격을 만들지 않음 |
| 휴먼 디자인 `human-design-report` | `human-design-report.js` | 잠금/저장 순서 보강, 원래 차트 없이도 구매 스냅샷 재개. W/human-design-paid-delivery.test.js |
| 운명의 지도 `destiny-compass-deep-report` | `destiny-compass-ai.js` | 원래 질문/계산/회차로 장별 저장과 재열람. W/destiny-compass-paid-delivery.test.js |
| 운명의 섬 `ziwei-island-palace-consult` | `ziwei-island-ai.js` | 12궁 정상 본문 보존·미완료 궁 재개. W/ziwei-island-paid-delivery.test.js, U/island-paid-delivery.behavior.test.js |
| 천상의 하모니 `tarot-celestial-harmony` | `celestial-harmony.js`, `celestial-report-delivery.js` | 카드별 진행·저장·취소/소유권 검사. W/celestial-paid-delivery.test.js |
| 관계 경계 `relationship-boundary-test` | `relationship-boundary-test.js`, `relationship-report-delivery.js` | 5장 생성/저장. W/relationship-paid-delivery.test.js. 동시 정리 작업의 환급/소비 보강이 main에 합쳐졌으며 통합 후 재검사 |
| 반려동물 사주 `pet-saju-ai-consultation` | `pet-saju-ai.js` handleReport | 결정론 fallback을 유료 LLM 완료로 판매하지 않음, 저장 부분 재사용. W/pet-paid-delivery.test.js |
| 반려동물 궁합 `pet-compatibility-ai` | 같은 파일 handleCompat | 원래 보호자/동물 계산 보존·궁합 저장/재개. 같은 검사 |
| 동물 토템 `animal-totem-basic`, `animal-totem-deep` | `animal-totem.js` | 기존 동물 선택 위 짧은 연결 해설을 저장. W/animal-totem-paid-delivery.test.js, U/animal-totem-paid-delivery.test.js |
| 정신분석 해몽 `dream-psycho-analysis` | `dream.js` | 꿈 원문·관점·언어 보존, 5장 저장/재개. W/dream-psycho-analysis.route.test.js, U/psycho-dream-paid-delivery.test.js |
| 지오맨시 `geomancy` 및 기존 aliases | `oracle.js` `/geomancy`, `/result` | 원래 점괘/질문을 고정하고 생성/저장. W/geomancy-paid-delivery.test.js, U/geomancy-paid-delivery.test.js |
| 요가 구루 `yoga-guru-per-use` | `yoga-guru.js` | 기존 30/60분 코스별 길이·시간 순서 유지, 저장/재개. W/yoga-paid-delivery.test.js, U/yoga-paid-delivery.test.js |
| 타로 오라클 1~4장 `tarot-prompt-maker` | `tarot.js` `/oracle-consultation`, `/oracle-result` | 카드 수에서 서버가 티어 결정. 공통 부분·카드별 해설/조합을 저장. W/oracle-consultation.route.test.js, U/oracle-delivery.behavior.test.js |
| 타로 오라클 5~7장 `tarot-prompt-maker-standard` | 같은 라우트 | 낮은 티어 증빙으로 높은 카드 수 요청 거부. 같은 검사 |
| 타로 오라클 8~10장 `tarot-prompt-maker-deep` | 같은 라우트 | 정상 부분 재사용·완료 저장 확인. 같은 검사 |
| 타로 오라클 11~14장 `tarot-prompt-maker-master` | 같은 라우트 | 14장 경계 포함. 같은 검사 |
| 마인드스캔 `tarot-mindscan` | `tarot.js` `/mindscan`, `/mindscan-result` | 기존 카드/정역방향을 7위치·21부분+종합으로 고정. W/mindscan-delivery.route.test.js, U/oracle-delivery.behavior.test.js |
| 연애 6카드 `tarot-love-relationship` | `tarot.js` `/love-reading`, `/love-result` | 원래 6카드/관계 질문·언어를 저장, 부분/실패와 완료 분리. W/love-tarot-delivery.route.test.js |

## LLM 생성 완료표와 섞지 않는 경로

| 상품/표면 | 실제 성격과 유지한 동작 | 남은 확인 |
|---|---|---|
| `vedic_prashna_prompt` | `vedic-prashna-prompt.js` generatePrashnaPromptResult는 차트 계산 + 프롬프트 문자열. 실 LLM 답변 생성 함수가 아님 | fortune.js의 PaidExecutionRecord claim/최종 저장 장애는 별도 결정론 유료 전달 회귀가 필요. LLM 개선 완료로 계산하지 않음 |
| `nakshatra-compat`, `nakshatra-muhurta`, `nakshatra-vvip-codex`, lord-report/dasha-map | nakshatra.js / nakshatra-premium.js가 순수 계산·템플릿 조립기를 호출. VVIP도 LLM 미사용 | 기존 증빙/계산 계약 유지. 이번 본문 분할 생성 대상 아님 |
| `palm-reading-general` | 기존 순서는 **사진 판독→결제→표시**. 이번에 Vision+심층 해석 완료를 서버 저장/재조회한 뒤 결제 준비, `/api/palm/result`는 기존 증빙만 읽음 | W/palm-paid-delivery.test.js + 기존 palm 3 suites + per-use-proof roundtrip 총124, U/palm-paid-result-recovery.test.js 7 통과. 아래 한계 참조 |
| `palm-reading-ai-consult`, `human-design-chart` | 별도 손금 상담 통합/HD 차트 무료화로 판매 중단된 과거 키 | 과거 주문/환불 참조 보존, 새 판매/LLM 상품으로 되살리지 않음 |
| `ziwei-island-deep-report`, `vedic_basic_reading`, 숙요/점성술 기본·상세 해금, 일반 궁합 | 결정론 결과/영구 해금과 별도 회당 계산 결과 | 각 전문가 LLM 상품과 분리. 새 생성이나 가격 정책을 추가하지 않음 |
| `premium-sibyl-dominator` | sibyl.js가 canonical 사주 계산만으로 리포트 조립(소스 명시) | LLM 스냅샷 표에 포함하지 않음 |
| 타로 draw/reading, `tarot-year-fortune`, `tarot-crystal-soul-reading`, `tarot-numerology-reading`, `tarot-ijik` | tarot.js의 결정론 리딩/카드 조립 경로 | 활성 LLM인 love/mindscan/oracle/celestial과 분리. 기존 유료 정책 보존 |
| 주역·이집트·룬·마야 등 질문 프롬프트/정적 해석 | 이름에 AI/prompt가 있어도 활성 서버 생성기가 없으면 실 LLM 완료로 세지 않음 | 개별 결제 SKU의 모든 이력·언어·디바이스 검증은 아래 P2. LLM을 새로 붙이지 않음 |
| `/api/destiny-compass/narrate` | CompassReport.tsx의 **무료 단문 다듬기**. 실제 LLM 호출 있음. 기본 규칙 문장 먼저 표시, 실패 시 유지 | 32초 클라이언트 대 30초×내부 재시도 예산은 별도 정리 대상. 유료 심층 결과 저장과 무관하며 이번 호출/정책 변경 없음 |
| `/api/fortune/guardian/chat` | 기존 mock/SSE 대화 경로 | 실제 유료 FortuneChatClient의 `/guardian/generate`와 구분. 실 LLM으로 폴백시키지 않음 |
| admin prompt lab, threads-ai-writer | 관리자/콘텐츠 운영용 LLM 호출 | 고객이 결제한 상담 상품 전달 범위 밖. 외부 발행/호출하지 않음 |

## 이번 추가 구현의 정확한 한계

1. **카르마·연애 비책 후속**: `expert-follow-up-delivery.js`는 원래 리포트+질문 해시를 키로 45초 단일 호출/누적3회, 정상 답변 선저장, 구매 취소 재확인, 원자적인 내역 append/receipt/재조회로 완료한다. 같은 질문은 이전 답변을 재사용한다. 기존 llmMeta를 통째로 교체하지 않는다. 카르마 실제 화면은 같은 질문으로 최대4번 전송하며 계정 변경 결과를 버린다. 새 이력 탐색/장기 오프라인 백그라운드 생성은 없다. 답변 저장 후 내역 부착 전 끊긴 경우 같은 질문 재전송으로 복구한다.
2. **손금**: 원본 사진은 서버 결과 스냅샷에 저장하지 않는다. 복귀 후 본문/좌표는 복원되지만 사진 blob 배경은 복원되지 않는다. 기존 1200자 심층 해석 하한과 끝 문장/잘림/mock 거부를 적용했다. 20,000자 상세 리포트로 확장한 것은 아니다. 최신 스냅샷이 미결제이면 최신 조회는403이고 예전 전체 구매 목록을 자동 탐색하지 않는다. 과거 결제는 기존 resume descriptor fallback을 보존했다. 물리 모바일 사진→PG→복귀는 미검증이다.
3. **질문형 4종**: evidenceHash와 `{factId,value}`가 계산 사실과 일치하는지 검사한다. 이 검사는 자연어 문장에 담긴 모든 인과관계/모순을 증명하지 않는다. 입력 불확실성을 지우거나 LLM에 계산을 맡기지 않는다.
4. **대표 대화**: raw paid 본문 2600자 이상·근거/후속 질문 계약을 통과해야 deterministic enrichment 이전 결과를 받아들인다. provider 설정이 꺼지면 paid 완료로 mock을 돌려주지 않는다. 과거 모든 대화의 새 목록/PDF/기기 간 공유를 추가한 것은 아니다.
5. **브라우저 증거**: 질문형은 실제 렌더 함수의 390px 샘플, 대표 대화는 실제 컴포넌트+CSS를 사용한 390/1280px mock에서 저장 재개→마지막 조언→새로고침을 확인했다. 대표 대화에서 입력창이 마지막 본문을 덮던 문제를 수정했다. 모든 상품의 실제 전체 셸/실기기/PG/OAuth 증거가 아니다.

## 실행한 검증과 재현 명령

- 초기 통합: 유료 저장·재개 Worker29 suites **663/663**, 관련 UI/실제 함수 **128/128**. Jest mock-network-guard 및 Node `--require`로 외부 요청 차단. jsdom CSS 파서 경고가 있었으나 실패는0.
- 손금: palm 신규/기존·회당증빙 왕복5 suites **124/124**, 복귀 함수 **7/7**.
- 후속: 신규 후속+카르마2 suites **32/32**, 카르마 실제 화면 함수 **3/3**, 연애 비책 기존 **18/18**.
- 다른 작업 통합 후: follow-up/guardian/질문형/관계/환급/회당증빙6 suites **148/148**, 질문형·카르마 UI **10/10**. 검사 집합이 겹치므로 숫자를 합산하지 않는다.
- `npm run verify:ai-consultation-flows` 전체 통과. typecheck 통과. 대상 ESLint 오류0(기존 경고 있음), worker-no-undef417파일 통과, Mongo query shapes 위반0, route-await69라우터 통과. sitemap/미러는 전달 체크포인트의 최종 결과를 따른다.
- check:fast의 critical 계획을 확인하고 필요한 targeted 검사를 실행했다. 이전 check:fast 중단을 전체 로컬 성공으로 바꾸어 보고하지 않는다. 공식 완료는 해당 SHA의 main `CI required`다.

```powershell
Set-Location D:\Development\code-destiny
$paidTests = @(rg --files __tests__/worker | Where-Object { $_ -match 'paid-delivery|delivery\.route|fusion-snapshot|oracle-consultation.route|sukuyo-compatibility-ai.duplicate|dream-psycho-analysis.route|fortune-tea-house-delivery' })
node --experimental-vm-modules node_modules/jest/bin/jest.js @paidTests --runInBand --silent
node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/worker/expert-follow-up-delivery.test.js __tests__/worker/per-use-proof-roundtrip.test.js --runInBand --silent
node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/karma-follow-up-recovery.test.js __tests__/ui/palm-paid-result-recovery.test.js
npm run verify:ai-consultation-flows
```

## 남은 확인을 이어받는 순서

### P1 — 실제 연동을 사용하지 않고 더 검증할 범위

1. **완료 — 손금 모바일 mock 결제 복귀.** 실제 `PalmDestinyMain`+컴파일된 Tailwind의 격리 loopback Playwright에서 390/1280px 사진 선택/품질→mock 저장→mock PG 리다이렉트→새 문서 서버 재열람을 통과했다. 분석 POST 1회, mock 결제 1회, 결과 GET 2회, 원래 requestId/`serverSaved` resume 유지, 재분석·가로 넘침·원본 사진 복원·외부 요청 0. 전체 Next dev 셸은 기존 `lib/palm/package.json(type=commonjs)`의 TS/ESM dev compile 문제로 제외했으므로 전체 셸·물리 기기 증거가 아니다. 최신 미결제 판독은 예전 구매본을 가리며, 자동 폴백은 새 판독으로 오인될 수 있어 명시적 구매 이력 선택 UI가 필요하다는 결론으로 별도 UX 범위에 남겼다. 검사: `npm run verify:palm-mobile-payment-recovery`.
2. **완료 — 후속 답변 부모 내역 부착 전 전체 새로고침 복구.** 공용 실행 레코드에 답변이 `completed`로 저장된 뒤 부모 상담 `messages` 부착이 실패해도, 카르마·연애 비책의 기존 결과 GET이 같은 계정·상품·부모 세션의 완료 레코드만 찾아 멱등 부착한다. 새 LLM 생성·새 구매·새 차감 없이 실제 카르마 `/result` GET 핸들러에서 복구했으며, 취소된 구매는 저장 답변을 붙이지 않는다. W/expert-follow-up-delivery.test.js.
3. 각 상품의 **과거 completed 결과 GET**에 대한 취소/환불 정책을 한 표로 대조한다. 초기/부분 재개 검사 성공을 모든 과거 구매 GET의 취소 전수 증명으로 확대하지 않는다. 기존 구매 재열람 보존과 취소된 구매 차단을 함께 fixture로 작성한다.

### P2 — 분류가 끝났지만 LLM 개선 밖인 전달/정책 확인

1. 프라슈나 결정론 프롬프트: fortune.js의 generating claim 만료·최종 저장 throw/null/응답 유실 fixture를 추가한다. 생성 실패와 저장 실패를 구분하고 새 결제 없이 같은 PaidExecutionRecord로 복구한다.
2. 무료 compass narration의 클라이언트/서버 시간 예산과 무료 운세 LLM 사용 정책을 별도로 맞춘다. 유료 지도 리포트의 완료로 묶지 않는다.
3. 표의 정적 해금/과거 SKU/alias는 pricing registry와 실제 CTA/consumer를 조합한 비LLM 전달 검사로 확장한다. 이 표가 모든 정적 SKU E2E 완료표는 아니다.

### 별도 승인 없이는 실행하지 않을 확인

- 실 LLM 품질/언어 혼입/의미 모순 평가, 실 결제/환불, 운영 DB 조회·쓰기, 실제 고객 주문 복구, 배포·승격, 물리 기기의 실제 PG/OAuth 복귀. 이번 개발 검증은 이 항목들을 수행하지 않았다.
