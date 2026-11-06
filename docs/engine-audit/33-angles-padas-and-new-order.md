# 상승점·하우스·파다·다샤 검증과 숙요 신규 주문

2026-11-07. 운영 기본 OFF. 테스트 플래그 `SUKUYO_IMD_NEW_ORDERS_V1=true`로 영냥이 숙요 기본 운세와 단일 숙요 개인 질문 주문을 연결했다. 복합 상품, 기존 구매, 시간 미상, 베다 전체 명반 및 서양 전체 명반은 전환 대상에서 제외했다.

## 서양 명반

USNO에서 UT1 기준 Greenwich apparent sidereal time 24개를 조회했다. 춘분점 기준 날짜 황도에서 동쪽 지평선과의 교점이 상승점이고, 상중천 자오선과의 교점이 MC다. 후보는 Astronomy Engine의 날짜 좌표계 회전을, 독립 대조는 USNO 항성시와 지평 고도 공식 및 근사 황도 경사를 사용했다. [USNO 항성시](https://aa.usno.navy.mil/data/siderealtime) · [고도와 방위각 공식](https://aa.usno.navy.mil/faq/alt_az) · [근사식](https://aa.usno.navy.mil/faq/GAST).

| 표본 | 측정 결과 |
| --- | --- |
| 2000-01-01, 2024-06-21, 2025-12-21 각 8시각 × 적도·남북 중위도·고위도 9개 지점 | ASC·MC 216쌍. 최대 차이 ASC 0.020732°, MC 0.000603° 이내. UT1을 후보의 시각 인수에 대응시킨 표본으로 민간 출생시각의 시간대 변환 전체를 보증하지 않는다. |
| 위도 0~±65°의 144개 차트 | Placidus 12궁점 1,728개. 1궁=ASC, 10궁=MC, 대궁 180°와 일주 반호 시간 분할을 확인했다. USNO 기준 시간각과 분할식의 최대 잔차 0.018333°. |
| 북위 69.65°, 남위 75°, 북위 80°의 72개 차트 | ASC·MC는 대조했다. 극권에서는 후보가 Placidus 전체를 보류하도록 검사했다. 다른 하우스 체계로 치환하지 않았다. |

Placidus는 USNO가 발표한 궁점 데이터가 아니다. 공식 자료가 제공하는 지구 회전과 지평 좌표를 이용해 해당 하우스 정의에 대한 기하 검사를 수행했다. Regiomontanus, 하우스 경계의 행성 배정, 시각 미상·정확한 극점은 이번 근거의 범위 밖이다. [하우스 기하 정의](https://www.astro.com/astrology/cw_astro_houses_e.htm?lang=r&nho2=3027229).

## 베다·숙요

2024년·2025년 1월 JPL 지심 겉보기 달 황경을 조회했다. 인도 위치천문센터 IAE 2024 인쇄 417쪽, IAE 2025 인쇄 415쪽의 월초부터 3일 간격으로 발표된 true ayanamsa를 사용했다. 시각은 05:29 IST(전날 23:59 UTC)이며, 중간 값은 선형 보간했다. 매시간 위치로 각 경계를 찾은 뒤 양쪽 2분 시각을 **JPL에 다시 조회**했다. 확인용 URL과 숫자를 저장했다. 후보는 동일 시각을 1956년 기준점과 Astronomy Engine으로 계산했다. [IAE 연도별 원본](https://packolkata.imd.gov.in/indian-astronomical-ephemeris.php) · [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html) · [IMD 기준 설명](https://packolkata.imd.gov.in/panchang/en/explanation).

| 항목 | 2024년 1월 | 2025년 1월 |
| --- | ---: | ---: |
| 확인한 파다 경계 종류 | 108/108 | 108/108 |
| 경계 ±2분의 파다·숙·시작 행성 불일치 | 0/234 | 0/238 |
| 정시 표본의 파다·숙·시작 행성 불일치 | 0/720 | 1/720 |
| 시작 행성이 같은 정시 표본의 다샤 잔여 기간 최대 차이 | 0.7791일 이내 | 0.8152일 이내 |

2025-01-20 15:00 UTC의 공식 자료 기반 항성 황경은 173.332333°, 후보는 173.333541°였다. 173⅓° 경계 양쪽이므로 숙과 다샤 시작 행성이 달라졌다. 이 건을 잔여 기간 평균이나 최댓값에 섞지 않았다. 다샤는 공식 천문 관측량과 구분한다. 기대값은 항성 달 경도에서 서비스의 27숙·9행성 연수와 남은 숙 비율로 독립 유도하고, 날짜 차이는 서비스의 365.2425일/년을 사용했다. 하위 다샤·다른 연수 관법은 미검증이다.

2026~27년 IMD 361건의 숙 종료 시각 ±1분 검사도 다시 통과했다. 108파다 전부를 확인한 기간은 **2024년과 2025년 각각의 1월 표본**이다. 다른 달이나 성인 출생 연대로 외삽하지 않았다. [이전 1년 대조](32-ephemeris-provider-evaluation.md).

## 신규 주문에 연결한 범위

- `worker/lib/imd-sidereal-profile.js`가 날짜별 항성 기준을 제공한다. `worker/lib/sukuyo-verified-provider.js`는 이를 기존 27숙 매핑과 연결하고 명반에 공급자 버전 `sukuyo-imd1956-ae2.1.19-v1`을 기록한다. UTC 지원 구간은 2024·2025년 각각 1월 1일 00:00 이상~1월 30일 23:00 미만, 그리고 2026-03-23 00:00 이상~2027-03-20 00:00 미만이다. 27숙 경계 2각분 이내는 보류한다. 날짜·시간이 확정된 단일 개인 명반만 지원한다.
- `worker/yeongnyangi/service.ts`에서는 기존의 소유자별 고정 주문 ID를 먼저 조회하는 개인 질문 주문에만 새 공급자를 허용한다. 지원 범위 밖·경계에서는 테스트 플래그가 켜져도 결제 준비를 진행하지 않는다. 기존 재개에서는 플래그보다 저장된 값이 우선이다. 무료 기본 운세는 같은 어댑터를 사용하고 구매 후 기본 명반 표시는 구매 당시 스냅샷을 사용한다.
  - **2026-11-07 정정:** 이 동작 때문에 운영에서 플래그를 켜자 검증 구간 밖 출생 고객의 무료 운세·개인 질문이 503으로 실패했고, 플래그를 다시 껐다(`7c5b33403`). 사용자 결정으로 범위 밖·경계 입력은 기존 계산을 쓰도록 바꾼다([인수인계](../handoff/engine-hold-products-verified-provider-2026-11-07.md) 1단계).
- `worker/yeongnyangi/providers/chapter.ts`는 검증된 주문의 장별 사실만 추려 LLM 요청을 만들면서 같은 명반 digest를 전달한다. 기존 결제 실행·데이터 형식, 이용권·월정석·단건 정책, 엔진 내부, 저장 원문을 수정하지 않았다.
- 서양 명반은 Placidus 검증 범위 밖의 요청과 엄밀한 별자리/하우스 경계, 베다 전체 명반은 라그나·노드·행성 배치와 하위 다샤가 남아 있다. 단독 낙샤트라 상담도 `buildNakshatraBirthEvidence`에 원차트를 전달하므로 달 하나만 채워 완료 처리하지 않는다. 운영 활성화와 Swiss 경로 교체는 별도 단계다.

## 로컬 검증

```sh
node tools/oracle/ephemeris-candidate/verify-houses.mjs
node tools/oracle/ephemeris-candidate/verify-extended-moon.mjs
node tools/oracle/ephemeris-candidate/verify-panchang.mjs
node --test __tests__/ui/sukuyo-verified-order.test.mjs
node --test tools/oracle/release-check/preflight.test.mjs
node --experimental-transform-types tools/oracle/release-check/verify.mjs
```

신규 주문 테스트에서는 실제 준비·결제 복귀·장 생성·결과 표시 함수와 LLM 요청 조립기를 사용했다. PG 승인, 저장소와 LLM 응답을 mock으로 대체했고, Swiss 모듈은 번들 구성 전에 차단했다. 동시 준비 두 건에서 한 주문을 얻은 뒤 플래그를 OFF로 전환하고 프로필 재접근도 금지했다. 8개 장의 요청 digest·버전, 완료 결과 재열람, 기존 원문, 소유자가 다른 결제 복귀 거절, 손상된 명반 거절, 범위 밖·경계 입력의 결제 전 거절을 확인했다. 합성 LLM 본문은 기존 응답 정리 경로를 거쳤으며 서술 품질 평가는 수행하지 않았다. 루트에 금지 의존성·자산이 있는 상태에서 전체 앱 빌드·전체 Jest·실결제·운영 DB·push·배포는 실행하지 않았다.
