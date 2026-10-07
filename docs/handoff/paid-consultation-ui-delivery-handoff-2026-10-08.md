---
status: done
followup_status: ui_asset_implementation_and_live_audit_pending
updated: 2026-10-08
next: 신년운세 mock 화면의 성능·에셋 기준선을 측정하고 세 결제 수단의 상태 화면을 보존하는 UI 개선부터 진행한다.
---

# 신년운세 UI·에셋 성능 및 유료 상담 전달 인수인계

이 문서는 계획·인수인계 작성 완료를 뜻한다. UI 고급화·에셋 교체 및 운영 설정 변경은 다음 세션의 실행 작업이며 완료했다고 보고하지 않는다.

## 사용자 요청과 우선순위

1. 가장 많이 보는 신년운세의 UI/UX와 에셋을 고급스럽게 다듬되, 모바일 성능을 개선한다.
2. 질문을 먼저 받아 직접 답변하고, 타고난 성향·어려움에 대한 공감·근거·연간 흐름·행동 조언을 충분한 분량으로 제공한다.
3. 신년운세·연애 비책·인생의 책·전문가 상담에서 **이용권·월정석·단건 결제 모두** 확인 → 생성 → 저장 → 전달 → 재열람까지 동작해야 한다.
4. 생성 실패 시 원래 요청과 이미 생성된 내용을 보존한다. 브라우저 종료 후 서버 복구, 중복 차감 방지, 과금 호출 예산을 함께 지킨다.
5. 운세 해석에서 필요하거나 불명확한 판단은 반드시 사용자에게 질문하고 결정한다. UI나 성능 개선을 이유로 계산 체계·해석 규칙을 새로 만들지 않는다.
6. 다른 채팅에서 이 문서를 읽고 실행한다. 새 채팅 생성이나 메시지 발송은 하지 않았다.

## 이미 반영한 수정과 증거

- 원인: Family/membership_pass 판정 값과 상담 DB enum 불일치, 일부 직접 이용권 경로의 금액 한도 미차감, 연애 비책 사용 처리 실패를 삼키고 완료 표시, 신년운세의 생성 실패를 이용권 확인 실패로 표시하던 문제.
- 수정: 공용 pass 정규화·원자적 차감·원래 requestId 재사용. 연애 비책 사용 처리 실패는 delivery_pending으로 본문 보존. 베다는 클라이언트 pass 표식 없이도 서버가 구매 권한을 확인. 일시적 접근 확인 오류는 기존 제한 재시도 적용.
- 신년운세: 질문 답변과 타고난 성향을 담는 opening을 추가해 6개 분야. 본문 목표 28,500~32,000자, 상한 33,000자. 정상 결과를 길이만으로 폐기하지 않도록 기존 수용 정책 유지. 질문 답변 문단 누락·중복 표시 수정.
- 기존 서버 복구 어댑터를 재사용했다. 공용 18개 어댑터의 실제 cron 실행·처리량은 운영에서 별도 확인해야 한다. 새 독립 작업 큐를 이번에 배포한 것은 아니다.
- 코드 기준 `13db6be3cce956553975fd7178521277709cdc55`: [공식 CI required 통과](https://github.com/rei1237/codedestiny/actions/runs/37650520852), 빌드·타입/린트·Static guards·Critical checks 성공, 352개 테스트 묶음/5,342건 통과.
- 서버 인수인계 기준 `184d373b6d52ceddd83eef89cfb737d46fb540f8`: [문서 변경 공식 CI required 통과](https://github.com/rei1237/codedestiny/actions/runs/37651243293). 문서만 변경되어 빌드/핵심 테스트는 의도적으로 생략됐으며 앞선 코드 검증을 대체한 것으로 과장하지 않는다.
- 추가 요청 뒤 `d45c074f3`: 세 상담의 서버 재개를 3개 결제 수단으로 확대하고, 신년운세 정본의 실제 6개 분야를 세 수단으로 생성·저장·재열람하는 테스트 추가. 로컬 mock 74건 통과. 최종 인수인계 전달 SHA의 main CI도 확인한다.
- 실 LLM·실 PG 결제·운영 DB 쓰기·실 월정석 차감·환불 검증은 하지 않았다. 고객 주문/발생 시각의 로그 대조도 남았다.

## 결제 수단별 고정 계약

| 수단 | 반드시 보존할 판정 | 재시도·재열람 계약 |
|---|---|---|
| 이용권 | 구매 당시 정책 버전·유효 기간·잔여 금액·서비스 포함 여부를 서버 정본으로 판정 | 동일 featureKey/requestId 차감 한 번. 만료 뒤에도 이미 받은 정상 구매 결과는 원본 재열람. 취소/환불 접근 회수 유지 |
| 월정석 | 서버의 지갑/원장 및 해당 서비스 사용 증빙. 클라이언트 subscription/monthly 문자열만으로 권한 부여 금지 | 같은 사용 증빙과 요청 키 재사용. 잔액 부족은 생성 전에 정본 결제 게이트로 처리. 자동 추가 지급·중복 차감 금지 |
| 단건 결제 | 주문·상품·금액·사용자·서버 결제 완료 검증 | 결제 복귀/새로고침/응답 유실도 원래 주문으로 이어감. 완료 결과 재열람에 결제창/새 생성 금지 |

현재 패밀리: 149,000원/30일/350,000원 사용 한도. 종전 구매 버전의 500,000원 한도 보존. 신년운세·연애 비책 각 30,000원, 인생의 책 10,000원은 이번 변경에서 유지했다. 다음 세션은 `lib/payment/pass-policy.js`, `worker/lib/billing-feature-registry.js`, `worker/lib/paid-feature-registry.js`, `worker/payments/catalog.js`의 최신 정본과 구매 스냅샷을 확인한다. 가격 숫자를 UI에 새로 하드코딩하지 않는다.

## 서비스별 확인 근거와 남은 범위

| 서비스 | 주요 소스·mock 증거 | 다음 확인 |
|---|---|---|
| 신년운세 | `worker/routes/new-year-ai.js`, `app/new-year-ai-consultation/NewYearAiClient.tsx`, `__tests__/ui/new-year-paid-delivery.behavior.test.js`, `new-year-question-answer.behavior.test.js` | UI/에셋 개선 최우선. 세 수단×상태 화면, 실제 생성 품질은 승인 후 검수 |
| 연애 비책 | `worker/routes/love-secret-ai.js`, `app/love-secret-ai/LoveSecretAiClient.tsx`, 같은 폴더 `result/LoveSecretAiResultClient.tsx`, `__tests__/ui/love-secret-paid-delivery.behavior.test.js` | 저장된 여섯 묶음 재사용, 사용 확정 실패 복구, 결과 문단 누락 여부 |
| 인생의 책·총운 | `worker/routes/life-book-ai.js`, `app/life-book-ai/LifeBookAiClient.tsx`, `result/LifeBookAiResultClient.tsx`, `__tests__/ui/life-book-paid-delivery.behavior.test.js` | 장별 체크포인트·서버 재개·기존 구매 원본의 책형 결과 표시 |
| 점성술·베다·나크샤트라·카르마·자미두수·운명의 섬 | `worker/routes/astrology-ai.js`, `vedic-ai.js`, `nakshatra-ai.js`, `karma-destiny-ai.js`, `ziwei-ai.js`, `ziwei-island-ai.js`; 대응 `__tests__/worker/*-paid-delivery.test.js`에 pass/monthly/paid 경로 있음 | 계산 스냅샷·소유권·취소 증빙·부분 저장을 유지. 실제 제공사 출력과 운영 증빙 대조는 미검증 |
| 숙요 궁합·작명·연이·네오 등 나머지 전문가 상담 | `worker/lib/consultation-recovery-registry.js`, `scripts/lib/paid-delivery-inventory.mjs`, `__tests__/worker/paid-delivery-inventory.test.js`에서 판매 키와 생성/복구 경로를 추적 | 인벤토리 매핑은 정적 증거다. 각 서비스의 세 수단별 실제 핸들러 장애 주입 검사를 확인·보충하고 미검증을 통과로 표시하지 않는다 |

신년운세 기존 5분야 fixture는 과거 문서/장애 계약용으로 남고, 새 테스트는 정본 NEW_YEAR_AI_SECTIONS를 읽어 opening 포함 6분야를 검증한다. 이 mock은 PG·원장 자체를 대체하는 결제 통합 실측이 아니다. 결제 증빙/한도 어댑터 검사는 `__tests__/worker/saju-consultation-pass-access.test.js` 및 공용 결제 테스트와 함께 본다.

## 신년운세 UI/UX 실행안

### 첫 화면과 결과의 우선순위

- 연도·출생 정보와 질문 입력을 명확하게 구분한다. 질문 예시는 구체적인 상황·선택을 적도록 돕고 사용자가 수정한 질문을 프로필 재적용이나 화면 복귀로 지우지 않는다.
- 핵심 CTA와 가격·이용권 확인은 첫 흐름에서 읽히게 한다. 새 제출/결제 동작을 만들지 않고 기존 폼·PriceBadge·billing-client·usePaidResume를 연결한다.
- 결과의 첫 화면: 질문 원문 → 직접 답변 → 타고난 성향/강점과 그림자 → 사용자가 말한 어려움에 대한 공감. 이어 총운·재물/직업·관계·월별·건강/실천을 읽기 쉬운 소제목과 짧은 문단으로 배치한다.
- 고급스러움은 차분한 바탕, 절제된 금색, 읽기 좋은 본문, 일관된 간격과 타이포그래피로 만든다. 장문 결과 위에 큰 장식·반복 카드·빈 여백을 쌓지 않는다.
- 연애 비책은 관계 조언의 흐름, 인생의 책은 장별 읽기, 전문가는 각 계산 체계의 결과 구조와 톤을 보존한다. 상세 결과를 공통 JSON 출력기로 바꾸지 않는다.

### 상태별 필수 화면

| 상태 | 표시·행동 |
|---|---|
| 입력/권한 확인 | 입력 보존, 중복 제출 차단, 실제 정본 가격과 선택 가능한 이용권·월정석·단건 결제 |
| 생성/partial | 서버가 확인한 분야 수와 저장 상태. 가짜 완료율·예상 완료 시간·완료 표시는 금지. 화면을 나가도 복귀 시 동일 상담 조회 |
| 일시적 네트워크/503 | 기존 제한 재시도와 같은 요청 키. 사용자에게 저장된 상담 이어 보기 제공 |
| delivery_pending | 생성 본문 보존, 저장·이용 확인 단계에 맞춘 안내. 새 결제/새 LLM 생성으로 우회 금지 |
| completed | 즉시 읽을 수 있는 본문, 목차 이동, 기존 다운로드/공유 기능. 스크롤 애니메이션을 기다려야 본문이 보이는 구조 금지 |
| 최종 생성 실패/권한 회수 | 실제 서버 상태에 맞춘 안내와 기존 복구·지원 절차. 확인 없이 미차감/자동 환불을 단정하지 않음 |

### 에셋·렌더 성능 작업

확인한 현재 자산: `public/fuctionassets/new-year-almanac-v1.webp`는 126,314 bytes. CSS 배경으로 사용하는 소스는 `NewYearAiClient.tsx`의 `NYAI_READING_ROOM_CSS`다. 파일이 크다는 증거는 아니며 다른 전송·디코딩·렌더 지연과 구분한다. 이 화면에는 backdrop-filter 및 회전 애니메이션도 있어 실측 대상이다.

1. 수정 전 모바일 네트워크/CPU 조건을 고정해 HAR 또는 Resource Timing, LCP/CLS/입력 반응, 이미지 전송량·크기, 라우트 JS, 장문 스크롤 long task를 기록한다. warm/cold cache를 구분하고 같은 조건에서 전후 최소 3회 비교한다.
2. 실제 표시 폭에 맞는 WebP/AVIF 파생본과 반응형 선택을 검토한다. 히어로/LCP 자산만 우선 로드하고 아래 장식은 지연한다. 중복 preload·동일 이미지 이중 다운로드를 검사한다. 크기/비율 예약으로 화면 밀림을 막는다.
3. 정적 export/Cloudflare 배포 방식을 확인해 이미지 최적화 경로를 결정한다. 동적 이미지 서버가 있다는 가정으로 Next Image를 교체하지 않는다. 기존 에셋을 재사용하고 새 캐릭터가 필요하면 정본 연이 이미지를 확인한다.
4. 전체 화면 blur·큰 shadow·상시 회전/파티클은 프로파일을 보고 줄인다. prefers-reduced-motion을 지원하며 비활성/화면 밖 애니메이션은 정지한다. 자동 재생 영상·새 대형 효과 라이브러리를 기본으로 추가하지 않는다.
5. 장문 결과의 파싱/카드 분할을 반복 렌더마다 재실행하는지 확인한다. 실측된 병목만 메모화·지연 처리한다. 가상화/접기로 본문·검색·인쇄/PDF·접근성·질문 답변이 사라지지 않게 한다.
6. 공유 이미지/PDF는 기존 계약을 유지하며 필요할 때 비용을 지불하게 한다. 첫 결과 표시가 부가 다운로드 기능의 준비를 기다리지 않게 한다. 데이터 원본은 계속 서버 저장 결과를 쓴다.
7. 성능 수치는 개선 전후 근거와 함께 보고한다. 목표만 적고 개선됐다고 말하지 않는다. 비슷한 조건에서 LCP/입력/스크롤·전송량이 퇴보하면 원인을 해결하거나 해당 시각 변경을 되돌린다.

검수 화면: 360/390/430px 및 1440px. 질문 입력 중 키보드, 긴 질문/긴 이름, 로딩·503·delivery_pending·완료·재열람, 폰트 로딩 지연, 축소 동작 모드, 네이버 인앱 브라우저(가능 시 실기기)에서 CTA 겹침/가로 넘침/초점/뒤로 가기/스크롤 위치를 확인한다. 자동 mock 측정과 실제 기기 검증을 구분한다.

## LLM/전달 개선에서 지킬 경계

- 모든 제품 키는 인벤토리로 찾아 실제 소비 라우트까지 추적한다. 화면 이름이 비슷하다고 서로 다른 상담/상품/소유자를 섞지 않는다.
- 새 생성 루프·결제 계층을 만들기 전에 기존 checkpoint/lease/서버 resume/복구 registry를 사용한다. 완료된 부분을 다시 요청하지 않는다.
- 짧더라도 유효한 내용은 보존한다. 비어 있거나 사용할 수 없는 부분만 남은 예산 안에서 재시도한다. 분량/JSON 형식 때문에 전편을 재생성하지 않는다.
- 결과 저장 실패, 이용 처리 응답 유실, 제공사 오류를 구분한다. 저장 실패를 생성 실패나 환불로 오인하지 않는다. 새 요청 키 생성으로 사용량/호출 한도를 초기화하지 않는다.
- 새로운 총운 판단·오행 가중치·시기 계산·운세 체계 혼합·확신 수준 등 해석 결정은 사용자 확인 대상이다. 이번 UI/안정성 작업에서 임의로 바꾸지 않는다.
- 운영 서버 점검·cron/DB/429/시간초과·복구 backlog·설정 전후/롤백 절차는 [서버 인수인계](paid-consultation-server-recovery-2026-10-08.md)를 따른다. 실제 과금·운영 쓰기·승격은 구체적 안을 검증한 후 별도 승인한다.

## 재현 명령과 완료 기준

```powershell
npm run check:fast -- --plan
npm run check:fast
npm run verify:billing-pass-policy
npm run verify:paid-feature-billing-policy
npm run verify:ai-consultation-flows
npm run verify:handoff-contract
node --test __tests__/ui/new-year-question-answer.behavior.test.js __tests__/ui/new-year-paid-delivery.behavior.test.js __tests__/ui/love-secret-paid-delivery.behavior.test.js __tests__/ui/life-book-paid-delivery.behavior.test.js
$env:NODE_OPTIONS='--experimental-vm-modules'
node node_modules/jest/bin/jest.js --runInBand __tests__/worker/saju-consultation-pass-access.test.js __tests__/worker/astrology-paid-delivery.test.js __tests__/worker/vedic-paid-delivery.test.js __tests__/worker/nakshatra-paid-delivery.test.js __tests__/worker/karma-paid-delivery.test.js __tests__/worker/ziwei-paid-delivery.test.js __tests__/worker/ziwei-island-paid-delivery.test.js __tests__/worker/consultation-recovery-task.test.js __tests__/worker/paid-delivery-inventory.test.js
```

위 명령은 해당 변경에 맞춰 선택한다. 로컬 전체 lint/typecheck/test/build를 반복하지 않는다. check:fast가 위험 변경을 전체 검사로 승격하면 공식 CI에 맡기는 현행 규칙을 따른다. 현재 섹션은 후속 재현 명령이며 이번에 모두 새로 실행했다는 뜻이 아니다.

완료는 (1) 서비스×세 결제 수단의 권한·잔액/금액·생성·저장·재시도·재열람 근거, (2) mock 모바일/데스크톱 전후 화면, (3) 에셋과 렌더 성능 전후 측정, (4) 미실행 실기기/운영/실 LLM 명시, (5) scoped commit→main push→해당 SHA CI required 성공, (6) 자기 워크트리 정리를 모두 보고한다.

## 바로 재개

- 작업 디렉터리: `D:\Development\code-destiny`
- 문서: `D:\Development\code-destiny\docs\handoff\paid-consultation-ui-delivery-handoff-2026-10-08.md`
- 새 결제 수단 검사 기준 커밋: `d45c074f37fdc09e5e66d9229bba6065a17fc4ad`. 원격 main 포함 여부와 최종 전달 CI를 확인한다.
- 이 세션은 `7e6504efeaa525366e6d292ecfe8bb4d017b2aca`에서 후속 작업을 시작했다. 이후 다른 세션 변경을 보존하고 최신 정본을 다시 확인한다.

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\paid-consultation-ui-delivery-handoff-2026-10-08.md와 연결된 서버 인수인계를 읽어라. main 상태와 d45c074f37fdc09e5e66d9229bba6065a17fc4ad 포함 여부를 확인하고, 신년운세 mock 화면의 성능 기준선 측정부터 진행하라. 신년운세 UI/에셋을 고급스럽고 빠르게 개선하고 연애 비책·인생의 책·전문가 상담의 이용권·월정석·단건 결제별 생성/저장/서버 재개/재열람 계약을 보존·검증하라. 불명확한 운세 해석은 사용자에게 질문하라. 실 LLM·실결제·운영 쓰기·운영 승격은 별도 승인 전 실행하지 마라.
```
