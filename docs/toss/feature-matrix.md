# 토스 출시 기능 범위와 기존 엔진 대응

2026-10-07 조사. 아래는 출시 **후보**이며 실서비스 통과 표가 아니다. 공개 운영 API `/api/yeongnyangi/products`를 직접 GET하여 28개 상품을 확인했다. 고등어/연어/광어/참치 가격 3,000/9,000/15,000/30,000원, 모둠 50,000원, 오마카세 80,000원. 실제 토스 SKU/최종 표시 가격은 IAP 등록 후 확정한다. 과거 1,000원 행사·9,900원 예정가는 사용하지 않는다.

| 기능 / 현재 진입 | API·계산/해석 | 로그인·과금 | 기존 상품 / 토스 SKU | 제공·보관·재열람 | 재사용 / 교체 | 토스 첫 제출 범위 |
|---|---|---|---|---|---|---|
| 영냥이 사주 `/yeongnyangi/fortune/?domain=saju` | `/api/yeongnyangi/requests`, `fortune/saju`, `prepareFortune`, chapter provider | 구매·기록 로그인, 단건 유료 | `saju_mackerel/salmon/flounder/tuna` / 미등록 | 기본 v6 5/8/11/15항목; 선택 모드별 manifest가 정본. 서버 request·chapter 원본, 큐·크론 재개 | 계산·manifest·품질·결과 보존 재사용; 로그인·IAP·CSR 교체 | 우선 구현: 개인정보·단건 구매·15항목 복구까지 검증 후 소개 |
| 영냥이 타로 `/yeongnyangi/fortune/?domain=tarot` | 동일 API, `fortune/tarot`, 카드 선택·draw | 유료 로그인 | `tarot_*` / 미등록 | 카드와 배열을 결제 전 고정, 저장 원본 재열람 | 엔진 재사용 가능, 카드 선택과 IAP 연동 UI 필요 | 보류: 선택 의식·배열별 결과 UI 검증 전 광고 제외 |
| 자미두수 `/yeongnyangi/fortune/?domain=ziwei` | 동일 API, `fortune/ziwei` | 유료 로그인 | `ziwei_*` / 미등록 | 명반과 시기 근거·챕터 저장 | 엔진 재사용, 명반 렌더러 모바일 점검 필요 | 보류 |
| 숙요점 `/yeongnyangi/fortune/?domain=sukuyo` | 동일 API, `fortune/sukuyo` | 유료 로그인 | `sukuyo_*` / 미등록 | 27숙·관계 해석·챕터 저장 | 엔진 재사용, 관계 전용 UI 필요 | 보류 |
| 베다점 `/yeongnyangi/fortune/?domain=vedic` | `fortune/vedic`, 기존 Swiss/베다 계산 | 유료 로그인 | `vedic_*` / 미등록 | 라그나·라시·시기 해석 원본 저장 | 엔진 재사용, 출생지/시간 필수조건 검증 | 보류 |
| 서양 점성술 `/yeongnyangi/fortune/?domain=astrology` | `fortune/astrology` | 유료 로그인 | `astrology_*` / 미등록 | 행성·하우스·시기 근거 | 별도 체계 유지, 차트 UI 필요 | 보류 |
| 궁합 `/yeongnyangi/fortune/` compatibility | `relationship-contract`, `relationship-calculation` | 유료 로그인 | 선택 체계·등급 상품 / 미등록 | 두 프로필 소유 검증·최소 상대 정보 | 상대 저장 제어·전용 결과 렌더러 필요 | 보류: 검증 전 부제/주요 기능에 넣지 않음 |
| 융합 `/yeongnyangi/fortune/` | 6체계 기존 분석·교차 근거 | 유료 로그인 | `fusion_saju_ziwei`, `fusion_sukuyo_vedic`, `fusion_astrology_tarot`, `fusion_all` / 미등록 | 18/28항목 기본 manifest | 단일 생성/복구 엔진 재사용 | 보류: 복수 차트·장문 UX·가격 상품 검수 필요 |
| 일반 사주 `/saju/`, 꿀꿀 `/ggulggul/` | `js/saju-engine`, 기존 정적 셸 | 무료 계산/유료 해금 혼재 | `paid-feature-registry` / 미등록 | 상품별 저장 정책 | 셸 자체는 외부 로그인/PortOne 포함, 번들에 넣지 않음 | 첫 제출 제외, 기존 웹 보존 |
| 연이 운명의 찻집 `/fortune-tea-house/` | 별도 상담 API·tarot/saju | 상품별 유료 | `fortune-tea-house-*` / 미등록 | 전용 결과·기록 | 연이 원본 UI·말투 유지 필요 | 첫 제출 제외 |
| 네오 `/neo-operation-room/`, `/fortune-chat/` | 전략실·chat 서비스 | 유료 | `neo-operation-room-consultation`, chat 상품 / 미등록 | 별도 캐릭터·상담 계약 | 운영 기능 보존 | 첫 제출 제외 |
| 영냥이 무료 운세 | free-service, 16종 | 출석/무료 운영 규칙 존재 | IAP 없음 | 토스 무료 상품 정책 미확정 | 임의 무료 LLM 제공하지 않음 | 첫 제출 제외; 개인정보 없는 고정 예시만 제공 |

토스 첫 제출은 사주 상담에 집중한다. 보류 기능을 외부 웹으로 보내거나 ‘준비 중’ 카드로 판매하지 않는다. 출시 후보도 사업자·IAP·mTLS·실기기 검증 전에는 출시 완료로 취급하지 않는다. 생선 등급은 기존 상담 범위와 항목 계약을 그대로 사용하고 추가 결제를 결과 열람 조건으로 삼지 않는다.

## 확인된 핵심 재사용 경로

- `worker/yeongnyangi/payments/catalog.ts` → `worker/lib/paid-feature-registry.js`: 가격 정본.
- `worker/yeongnyangi/service.ts`: 입력 검증, 동일 엔진 계산, immutable snapshot, 결과 표현.
- `worker/yeongnyangi/repository.js`: 항목별 lease/attempt/완료 저장, 소유권 필터, 트랜잭션.
- `worker/yeongnyangi/queue.js`: 화면 독립 항목별 소비. 지급 callback 안에서 장문 생성하지 않음.
- `worker/yeongnyangi/recovery.js`: 중단 재개·최대 시도·지원 전환.
- 기존 웹 User의 이메일 필수 스키마와 분리된 TossIdentity 필요. 이름/생일/이메일 자동 병합 금지.
- 토스 주문 API에 금액 필드 없음. 콘솔 검수 SKU 가격과 SDK 표시 금액을 대조하고 서버의 사용자 범위 주문 조회로 소유자·SKU·상태를 검증해야 함.

## 데이터·운영 확인 남음

Cloudflare Workers/Pages/R2와 MongoDB 및 Gemini/Workers AI 코드가 확인됐다. 실제 처리 지역·수탁 계약·LLM 실원가·결과 생성 시간·정산 수수료·Toss SKU는 운영 증거 확보 전 미확정이다. 별도 단건 가격 변경이나 새 재화는 없음.
