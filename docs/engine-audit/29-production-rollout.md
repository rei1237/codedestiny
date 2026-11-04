# 승인 엔진 운영 전환 (2026-11-04)

## 전환 전 상태

- 격국·자미 권위 엔진과 소비자 연결은 `codex/results-main-gyeokguk-20261102` 에만 있었고 플래그도 전부 꺼져 있었다.
- 무작위 출생 6,000건 측정:

| 경로 | 종격류 판정 | 승인 엔진과 차이 |
|---|---|---|
| 승인 엔진 | 178건(3.0%), pending 32건 | 기준 |
| natal-core(정적 기본 사주, 영냥이, 일진) | 178건 | 0건 |
| 앱 계산기 `localSajuCalculator` | 3,061건(51%) | 최종 격국 3,631건(60.5%), 종격 여부 3,016건, 용신이 후보 밖 2,302건 |

`calcPower` 와 natal-core 의 신강·약, 억부 용신은 무작위 20,000건에서 차이가 없었다. 즉 틀린 것은 앱 계산기의 격국을 읽는 소비자이고, 기본 계산 자체가 아니다.

## 전환 내용

| 경로 | 방식 |
|---|---|
| 프롬프트 허브 `saju-prompt-facts`, destiny-compass 근거 | 코드에서 승인 격국을 읽는다. 단일 용신을 만들지 않고, pending 이면 격국 이름을 쓰지 않는다 |
| 영냥이 natal profile | 바탕 → 일 → 돈 → 주의 → 바로 할 일 순서. 계산 용어는 접힌 근거로 보낸다 |
| 무료 기본 운세 | 조언을 먼저, 계산 근거를 뒤에 둔다 |
| 서버 소비자 | `worker/lib/engine-rollout.js` 표로 플래그를 켠다 |

플래그는 `[vars]` 에 올리지 않았다. 텍스트 바인딩 예산(128, 여유 2 유지)이 차 있어 `[vars]` 추가는 배포 실패(code 10055)로 이어질 수 있다. 표는 바인딩을 쓰지 않고, `[vars]` 에 같은 키가 있으면 그 값이 이긴다.

켠 플래그: `SAJU_GYEOKGUK_AUTHORITY_V2`, `ZIWEI_CALENDAR_AUTHORITY_V2`, `YEONGNYANGI_NATAL_PROFILE_V1`, `SAJU_CONSUMER_FACTS_V1`, `ZIWEI_CONSUMER_FACTS_V1`, `TAROT_CONSUMER_FACTS_V1`.

끈 채로 둔 플래그: `ASTROLOGY_CONSUMER_FACTS_V1`, `VEDIC_CONSUMER_FACTS_V1`, `SUKUYO_CONSUMER_FACTS_V1`. 이 체계들은 독립 천문 검증이 없다.

클래식 번들(`js/core/korean-calendar.js`)은 권위 조회표를 싣지 않고, 요청하면 `AUTHORITY_UNAVAILABLE_IN_CLASSIC` 을 던진다. 정적 셸은 권위 조회를 켜지 않는다.

## 영향과 한계

- 저장된 결과는 재계산하지 않는다. 새 요청과 무상태 계산만 바뀌므로, 같은 사람이 다시 보면 격국 라벨이 달라질 수 있다.
- `ZIWEI_CALENDAR_AUTHORITY_V2` 를 켜면 첫 유료 자미 요청에서 `ziweiCalculationPreparations` 컬렉션이 생긴다. 유일성은 결정적 `_id` 가 보장하므로 인덱스 마이그레이션은 없다. 이 컬렉션의 준비 기록에는 TTL 이 없다.
- natal profile 플래그는 베다·숙요·서양 무료 결과도 출생 기준으로 바꾼다. 계산 자체는 운영 중인 경로와 같지만 독립 검증은 없다.
- 격국 프로필은 프로필 회귀이지 독립적 고전 진실이 아니다. 타로는 카드·순서 고정만 검증했다.
- 유명인 사주(`lib/famous-saju/celebrity-saju-service.ts`)는 옛 격국을 넓게 쓰고 있어 이번에 바꾸지 않았다.

## 롤백

`worker/lib/engine-rollout.js` 의 줄을 지우는 revert 후 재배포한다. 이미 핀이 고정된 기록은 자기 핀을 따른다.
