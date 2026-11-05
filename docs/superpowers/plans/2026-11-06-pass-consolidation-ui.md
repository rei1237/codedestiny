# 이용권 통합 3~5단계(화면·이미지·문서) 구현 계획

> 실행: 이 세션에서 직접 구현(사용자가 전체 계획을 승인했고 추가 질문 없이 진행). 작업마다 커밋.

**목표:** 고객이 보는 이용권을 꿀단지 4종 하나로 합치고, 영냥이 전용 이용권은 보유자 안내에만 남긴다.

**구조:** "어느 꿀단지가 어느 생선까지 쓰는가"를 `lib/payment/pass-fish-coverage.mjs` 한 곳에서 계산하고 상점·영냥이 홈·결제 화면이 같은 값을 쓴다. 판매 코드는 지우되 지갑·재개·선물 수락 경로는 그대로 둔다.

**정본(spec):** `C:\Users\user\.claude\plans\calm-wiggling-penguin.md`

## 전역 조건

- 가격·한도 숫자는 바꾸지 않는다. 생선 커버리지는 계산값이며 하드코딩하지 않는다.
- 공통 문구: "라이트 운세 65종 무제한 · 꿀꿀운세와 영냥이 어디서나 · 기간 제한 없음" (65는 `lightFortunes.count`).
- 영냥이 표면은 밤빛 토큰을 유지한다. 분홍으로 통일하지 않는다.
- `worker/`·`service-pack-client.ts`의 결제 경로는 건드리지 않는다.
- 유료 호출·운영 쓰기 없음. 스테이징까지만 확인한다.

## 검토 초점(테스트로 고정)

1. 판매 종료 전에 시작한 주문의 결제 복귀(`?service_pack_return=1…#fish-packs`): 재확인·이어가기 영역이 보여야 한다.
2. 전용 이용권 보유자의 기본 선택: 패밀리보다 전용 이용권이 먼저 선택된다.
3. 예전 저장 선택값 `'family'`(세션 저장소)는 패밀리 아닌 등급에서도 "내 꿀단지"로 복원된다.
4. 옛 링크 `#fish-packs`·`?pack=`로 들어온 비보유자는 빈 화면이 아니라 꿀단지 영역에 도착한다.
5. `context=yeongnyangi`로 들어온 상담 고객도 꿀단지 4종을 보고 상담으로 돌아갈 수 있다.

## 작업

### 1. 커버리지 계산 (`lib/payment/pass-fish-coverage.mjs`, `__tests__/ui/pass-fish-coverage.test.mjs`)
- `passFishCoverage(tier)` → `{fish:[{id,name,priceKRW,usable,count}], fusion, topLabel, countsLine}`
- 기대값: 작은 없음 / 중간 고등어 6회 / 큰 고등어 12·연어 8·광어 6·참치 4회, "참치까지" / 패밀리 "모둠·오마카세까지".
- `upgradeTierForAmount(amountKRW)` → 금액을 처음 덮는 등급 이름("큰 꿀단지"). 초과 안내에 쓴다.
- 생선 가격은 `worker/lib/billing-feature-registry.js`에서 읽는다.

### 2. 상점 (`app/points/PointsClient.tsx`, `MoonShopFrame.tsx`, `service-packs/*`)
- `ServicePacks.tsx`: 판매 카드·구매 모달·`buy` 제거, 보유·재개·완료만. 내용 없으면 `null`. `ServicePackShowcase.tsx` 삭제.
- 꿀단지 카드: 세로 4열(좁으면 1열), 가격 / 상담 한도·건당 상한 / 생선 사다리 / "~까지" / 구매·선물 / 접힘 조건. 공통 혜택은 카드 밖 한 줄.
- 옛 링크는 꿀단지 영역으로 보낸다. `consultationShopPath` → `#moonlight-plans`. 상담에서 왔으면 "이번 상담으로 돌아가기"를 보인다.
- `OwnedPassesSummary`: 생선 칸은 보유자만, 판매 링크 제거.

### 3. 결제 화면 (`app/checkout/YeongnyangiCheckout.tsx`, `CheckoutClient.tsx`, 순수 함수 `checkout-method-order.ts`)
- 순서 전용 이용권 → 내 꿀단지 → 월정석 → 단건. 기본 선택 `pack > pass > direct`. 저장값 `'family'`는 pass로 읽는다.
- 등급 이름·남은 한도 표시, 상한 초과 안내, 비보유 "꿀단지 보기" 링크. `passStorePlan` 고정 해제. 죽은 5회 선택지 제거.

### 4. 안내 문구 (`pass-benefits.mjs`, `build-home-funnel.mjs`, i18n 12개, 약관, `billing-client.ts`, 기타)
- 전 표면에서 "패밀리만 두 사이트" 문구 제거, 영냥이 홈은 밤빛 스타일, `sync:public`, `sitemap:generate`.

### 5. 대표 이미지
- `codex-image`로 원본 에셋 첨부 생성, 나란히 비교, 귀 2개 확인. 시안은 `D:\Development\Temp\pass-hero\`.

### 6. 문서·메모리
- 정책 문서·판단 기록·릴리스 문서, 인벤토리 재생성(단독 커밋), 메모리 수정.
