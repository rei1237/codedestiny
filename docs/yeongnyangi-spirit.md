> 기존 `spirit-v1` 구매 결과의 문서입니다. 2026-09-22 이후 새 영냥 신점·호라리 상담은 [질문 순간 계산 문서](yeongnyangi-question-sky.md)를 따릅니다. 기존 결과의 복구 계약은 유지됩니다.

# 영냥이의 영감 구현 범위

진입: `/yeongnyangi/fortune/?mode=spirit` (일반 상담 화면의 영감 링크).

## 계산과 해석의 경계

- `app/fortune/prompt-hub/PromptHubClient.tsx`의 horary는 시각·장소를 정리하는 프롬프트 도구다. 실제 서양 호라리 계산 엔진은 확인되지 않았다.
- `worker/lib/vedic-prashna-prompt.js`에는 질문 시각/좌표로 계산하는 베다식 프라슈나가 있다. 호라리와 다른 체계이므로 이 기능에 혼합하지 않았다.
- 기존 `worker/yeongnyangi/fortune/saju/index.ts` → `runtime.ts`를 호출한다. 질문자 생년월일·성별은 기존 프로필/엔진 요구에 따르며 생시는 미상 허용이다. 한국 시간 출생이라는 기존 엔진 제약을 유지한다.
- `fiveElements.counts`의 최대 분포(동률 포함)를 강점·과다의 부담·자기 행동 선택으로 변환한다. LLM에는 이 구조화 근거만 전달한다. 분포는 행동의 증거나 심리 진단이 아니다.
- 질문자 지역과 상대방 출생정보를 새로 수집하지 않는다. 상대의 공간이나 사건 시기를 판단하는 계산은 없으므로 두 항목은 판단 불가를 명시한다. 생년월일이 없으면 결제 전 입력 단계에서 멈춘다.
- 질문 시각은 서버 시계, 시간대는 IANA 검증 후 저장한다. 지역을 추론하지 않는다. 입력·정규화 정보·계산 결과·목차·질문별 답변 계약은 기존 요청 snapshot에 보관한다.

## 상품과 복구

- 기존 `saju_mackerel` 및 `yeongnyangi-saju-mackerel` 가격/권한/주문 흐름을 사용한다. 가격표, 인증, DB 스키마, 환불 정책은 변경하지 않았다.
- 기존 5개 챕터와 최소 본문 분량을 유지한다. 결과의 마지막 마무리는 최종 챕터 persona다. 다른 새 상담과 마찬가지로 입력이 달라지면 별도 상담이며 기존 구매 결과를 교체하지 않는다.
- 동일 사용자·프로필·입력·기준일·시간대·모드는 같은 요청 ID로 합쳐진다. 동일 요청의 결제 증빙과 완료 결과를 재사용한다. 이미 구매한 요청은 결과 URL/보관함으로 복귀하며 다시 결제하지 않는다.
- 기존 큐, 챕터 lease, 체크포인트, 재조회 후 완료를 사용한다. 성공한 챕터는 재생성하지 않는다. 마지막 저장 재조회 실패도 기존 repository가 복구한다.
- 챕터당 최대 3회, 전체 최대 15회. 영감 모드는 추가 복구 할당으로 이 예산을 늘릴 수 없다. 공급자 내부 재시도는 1회, 다른 유료 공급자 폴백은 없음. 호출별 출력은 최대 16,384 토큰, 입력은 공통 50,000 토큰 차단을 유지한다. 금액을 임의 설정하지 않고 호출/토큰 상한으로 비용을 제한한다.
- 한도에 도달하면 저장된 내용을 유지하고 확인 필요 상태로 남는다. 무제한 자동 완성을 약속하지 않는다.

## 사용자 표현과 공유

- 순서: 먼저 전하는 한마디 → 자리의 상 → 관계의 흐름 → 시기 → 행동 → 마무리.
- 생성문 저장 전에 근거 인용, 모든 질문 ID/답변 필드, 기존 분량·중복 검사와 전용 금지 표현 검사를 실행한다. 공간·시기 한계는 서버 정본 문구다.
- 자연어 위험 검사는 규칙 기반이며 모든 한국어 우회 표현을 증명한 것은 아니다. 실 LLM 출력 품질은 미검증이다. 통과하지 못하면 기존 큐에서 해당 챕터만 재시도한다.
- API에서는 전용 목차의 내부 필드와 결과 sources를 제거한다. 공유는 계산 성향에 대응하는 허용 목록 문구만 사용한다. 질문, 이름, 생년월일, 상황, 개인 결과 URL은 공유 데이터에 들어가지 않는다.

## 시각 방향과 자산 출처

기존 영냥이의 보라·금색·아이보리, 기존 입력/프로필/보관함 구성의 확장이다. 새 영상이나 반복 애니메이션은 없다.

`public/assets/yeongnyangi/spirit/drum.webp`는 사용자가 지정한 `C:/Users/user/Desktop/사주보는 고양이 영냥이/각운세보는영냥이/신들린 영냥이2-Photoroom.webp`의 변경 없는 사본이다. 새 이미지 생성/외부 수집 없음.

## mock 검증 명령

```powershell
node --test __tests__/ui/yeongnyangi-spirit.test.mjs __tests__/ui/yeongnyangi-spirit-service.test.mjs
npm run test:jest -- --runInBand __tests__/worker/yeongnyangi-repository.test.js __tests__/worker/yeongnyangi-queue.test.js __tests__/worker/yeongnyangi-route.test.js __tests__/worker/yeongnyangi-recovery.test.js __tests__/worker/yeongnyangi-payment-intent.test.js
# 로컬 Next 개발 서버가 18019에서 실행 중일 때. HTTP/API/결제/생성은 fixture이며 외부 통신 차단.
node scripts/verify-yeongnyangi-spirit-ui.mjs
npm run check:fast -- --plan
npm run check:fast
```

브라우저 증거: `build-cache/yeongnyangi-spirit-ui/` (390/1280px 입력·결과, 부분 생성 새로고침, 보관함 재열람, 익명 공유). mock 검증은 운영 결제·DB·LLM 검증을 뜻하지 않는다. 운영 배포는 별도 승인 대상이다.
