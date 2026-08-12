# 관리자 구독 티어 시뮬레이션 수동 검증 체크리스트 (2026-04-22)

> ⚠️ **작성 시점(2026-04-22) 스냅샷.** 본문의 등급별 기준 코인 값은 그 시점 것이며,
> 현행 정본은 `worker/lib/profile-limits.js`의 `PASS_LIMITS`(건당 상한)와
> `MONTHLY_PASS_LIMITS`(월 누적 한도)다. 이 문서의 수치를 근거로 코드를 고치지 말 것.

## 목적
- 관리자 모드에서 유료 기능이 항상 프리패스(무차감)로 동작하는지 확인한다.
- 포인트 페이지의 티어 버튼(해제/스탠다드/프리미엄/VVIP) 선택값이 구독 상품 기준값으로 정확히 반영되는지 확인한다.
- 시뮬레이션 기준값이 UI 표시와 API 응답에서 동일하게 유지되는지 확인한다.

## 사전 조건
- 대상 환경: 운영 또는 스테이징
- 관리자 계정 로그인 가능
- DevTools Network 탭 사용 가능
- 점검 페이지: /points

## 티어별 기대값
- off(해제): freeLimit=0, profileLimit=1, recommendedCoins=0
- standard: freeLimit=30, profileLimit=3, recommendedCoins=115
- premium: freeLimit=50, profileLimit=7, recommendedCoins=360
- vvip: freeLimit=100, profileLimit=15, recommendedCoins=700

## 준비 단계
1. 관리자 계정으로 로그인한다.
2. /points 접속 후 테스트 박스가 보이는지 확인한다.
3. 테스트 박스 제목이 "관리자 구독 티어 테스트 모드"인지 확인한다.
4. 로컬 저장소 키 확인:
   - flower_admin_token 존재
   - flower_admin_test_tier 값 확인 가능

## 시나리오 A: 관리자 프리패스 고정 동작 검증
1. 테스트 티어를 off(해제)로 둔다.
2. 유료 기능 2개 이상 실행한다(회당 결제형 1개 + 해금형 1개 권장).
3. Network에서 POST /api/fortune/pig-coin/consume 응답 확인:
   - status 200
   - adminMode=true
   - simulated=true
   - simulatedChargeCoins=0
4. 실행 전/후 사용자 points 값이 변하지 않는지 확인한다.

### 합격 기준
- 관리자 모드에서는 어떤 티어에서도 실제 차감이 발생하지 않는다.

## 시나리오 B: 티어 버튼 반영 검증 (UI)
1. standard 버튼 클릭.
2. 테스트 박스 하단 "현재 시뮬레이션" 문구에 다음이 반영되는지 확인:
   - 스탠다드 꿀
   - 프로필 최대 3개
   - 무료 한도 30코인
   - 기준 코인 115코인
3. premium 버튼 클릭 후 7개/50코인/360코인으로 변경되는지 확인.
4. vvip 버튼 클릭 후 15개/100코인/700코인으로 변경되는지 확인.
5. off(해제) 클릭 후 "관리자 프리패스만 적용" 문구로 돌아오는지 확인.

### 합격 기준
- 버튼 클릭 즉시 UI 기준값이 해당 티어 값으로 정확히 변경된다.

## 시나리오 C: 티어 버튼 반영 검증 (consume API)
1. 티어를 standard로 선택 후 유료 기능 1회 실행.
2. POST /api/fortune/pig-coin/consume 응답 JSON 확인:
   - adminTestTier="standard"
   - freeLimit=30
   - profileLimit=3
   - recommendedCoins=115
   - simulatedChargeCoins=0
3. 티어를 premium으로 바꾸고 동일 절차 반복:
   - adminTestTier="premium"
   - freeLimit=50
   - profileLimit=7
   - recommendedCoins=360
4. 티어를 vvip로 바꾸고 동일 절차 반복:
   - adminTestTier="vvip"
   - freeLimit=100
   - profileLimit=15
   - recommendedCoins=700
5. off로 바꾸고 반복:
   - adminTestTier=null
   - freeLimit=0
   - profileLimit=1
   - recommendedCoins=0

### 합격 기준
- consume API의 시뮬레이션 필드가 티어별 기대값과 100% 일치한다.

## 시나리오 D: 구독 상태 API 연동 검증
1. 티어를 standard로 선택.
2. GET /api/fortune/pig-coin/profile-subscription/status 응답 확인:
   - tier="standard"
   - isActive=true
   - profileLimit=3
3. premium, vvip도 동일하게 확인(각각 7, 15).
4. off일 때 실제 계정 구독 상태(실데이터)로 돌아오는지 확인.

### 합격 기준
- status API 응답이 현재 선택 티어와 일치하며, off에서는 시뮬레이션이 해제된다.

## 기록 템플릿
- 일시:
- 환경(도메인/브라우저):
- 시나리오 A 결과: PASS/FAIL
- 시나리오 B 결과: PASS/FAIL
- 시나리오 C 결과: PASS/FAIL
- 시나리오 D 결과: PASS/FAIL
- 실패 시 증거:
  - Network 응답 캡처
  - 콘솔 로그
  - 재현 단계

## 최종 판정 규칙
- A, B, C, D 모두 PASS면 배포 가능.
- A 실패(실차감 발생)는 즉시 FAIL.
- B 또는 C에서 티어별 기준값 불일치 1건이라도 있으면 FAIL.
