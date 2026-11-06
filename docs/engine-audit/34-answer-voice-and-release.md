# 질문 직답·마스터 조언 렌즈·결론 먼저 화면, 운영 반영 (2026-11-07)

## 바꾼 것

고객이 어떤 운세를 사든 결과와 첫 상담 화면이 세 가지에 답하게 했다.

1. 지금 내 질문에서 가장 중요한 것은 무엇인가.
2. 명반이나 카드의 특징이 실제 생활에서 어떻게 드러나는가.
3. 나는 무엇을 할 수 있는가.

| 변경 | 위치 | 켜는 방법 |
|---|---|---|
| 질문 직답 계약 + 마스터 조언 렌즈 | `worker/lib/consultation-answer-contract.js` | `CONSULTATION_ANSWER_VOICE_V1` (`engine-rollout.js` 표에서 ON) |
| 결론 먼저 화면 | `lib/result-layout.ts` `ANSWER_FIRST_LAYOUT_V1` | 클라이언트 상수 `true` |
| 기본 사주 궁합의 화면·상담 사실 일치 | `worker/lib/saju-compat-schema.js` 외 | 신규 결과에만 `approvedSaju` 저장 |
| 숙요 IMD 신규 주문 | 기존 `a2bb89c75` | `SUKUYO_IMD_NEW_ORDERS_V1` (켰다가 2026-11-07 `7c5b33403`으로 다시 끔. 아래 "숙요 플래그 재차단") |
| 타로 결제 전 해석 고정 | 기존 `fdb4924ba` | 이미 켜진 `TAROT_CONSUMER_FACTS_V1`를 따름 |

### 질문 직답 계약

플래그가 꺼져 있으면 블록을 붙이지 않는다. 그래서 OFF 프롬프트는 기존과 바이트 단위로 같다. 켜지면 각 시스템 프롬프트의 페르소나 뒤에 아래 계약을 덧붙인다.

- 첫 문단에서 질문에 직접 답한다. 넓은 질문은 가장 두드러진 흐름 하나로 시작한다.
- 이어서 명반·카드 특징이 생활에서 드러나는 모습과, 고객이 고를 수 있는 행동을 쓴다.
- 고객이 말하지 않은 직업·연애 상태·가족사·상대의 감정은 만들지 않는다. 예시는 "~라면"처럼 조건형으로 쓴다.
- 시기는 근거가 있을 때만 특정한다.
- 근거는 그 해석 바로 뒤에 쉬운 말 한 문장으로 붙인다.
- 읽는 법이나 용어 설명으로 시작하지 않는다.
- 후보·보류·판정 보류 값은 확정으로 바꾸지 않는다.
- 숙요와 베다를 서로 독립된 두 증거로 세지 않는다.
- 궁합에서는 두 사람의 역할을 바꾸지 않는다.

**마스터 렌즈**는 등록된 마스터에만 있다: 연이, 네오, 윤달, 무성, 한비, 영냥이, 마스터(코덱스). 그 밖의 키는 neutral로 처리한다. 렌즈가 정하는 것은 세 가지다: 무엇에 공감하는가, 어떤 장면으로 설명하는가, 행동을 어떻게 권하는가. 모든 렌즈에 "같은 사실이면 결론과 확실성은 같다"는 문장이 함께 들어간다. 렌즈는 말씨(존댓말·반말)를 정하지 않는다. 말씨는 기존 페르소나·`voiceStyle`·locale이 계속 정한다. "먼저 연락해도 될까요?" 같은 고정 문구도 넣지 않는다.

**버전 고정.** 여러 장으로 나눠 생성하는 상품은 생성을 시작할 때 `answerVoice`를 이미 있던 스냅샷에 함께 저장한다. 재개할 때는 저장된 값을 쓴다. 그래서 생성 도중 플래그를 끄거나 켜도 장마다 문체가 섞이지 않는다. 계약이 생기기 전에 시작된 생성은 키가 없으므로 OFF로 이어진다.

| 고정 위치 | 상품 |
|---|---|
| `llmMeta` | 인생의 책, 신년운세, 연애 비책, ziwei-ai |
| `paidNarrative` seed·`deliveryMeta` | 타로 연애·마인드스캔·오라클, guardian(연이·네오), 카르마, 나크샤트라, 사주 궁합, 마스터 코덱스, 네오 작전실 |
| 찻집 checkpoint state | 찻집(프롬프트 캐시 키에 ON일 때만 `-answer-voice-v1` 추가) |
| fusion 저장 context, 영냥이 snapshot | 융합, 영냥이 4등급 |
| 요청 시점 값(단발 응답) | 손금 비전, astrology-ai, sukuyo-compat-ai, vedic-ai, fortune.js 숙요 AI, ziwei 후속 질문, 카르마 admin-lab, 타로 lib 단발 |

### 결론 먼저 화면

저장 원문은 바꾸지 않았다. 표시 순서와 접힘 상태만 바꿨다.

| 화면 | 변경 |
|---|---|
| 인생의 책 결과 | 기본 명식이 마지막 메시지 뒤, 닫힌 참고 상자로 이동 |
| 연애 비책 결과 | 명식 요약·궁합 세부를 마지막 줄 뒤 닫힌 상자 하나로 합침 |
| 찻집 사주 | 사주 기둥판·오행 균형을 해석 뒤 닫힌 상자로 이동 |
| 영냥이 무료 운세 | 요약 → 본문 → 닫힌 만세력·차트 → 공유 → 다음 질문 |
| 보관함 재열람 | 책·연애·베다·서양·자미(섬 포함)·휴먼디자인·사주/펫·숙요·연간: 본문 먼저, 저장 명반은 닫힌 근거 상자로 |
| 보관함 편향 사주 | 다섯 섹션 뒤에 오행 차트 |
| PDF | 캡처하는 동안 닫힌 근거(`data-reading-evidence`, `kdo-evidence`)도 열었다가 되돌림 |

라벨은 기존 i18n 키(`chartDetails`, `basisTitle`, `reader.evidence` 등)를 재사용했다. 새 고객 문구 키는 없다. 960px 데스크톱 레이아웃은 그대로다.

## 상품 분류

| 상태 | 상품 |
|---|---|
| ① 검증 결과를 신규 계산에 연결 | 사주(격국 authority): 명식 상담·인생의 책·신년·연애 비책·guardian·네오·찻집. 자미: ziwei-ai·정밀·코덱스·네오·섬·guardian·영냥이. 타로: 연애·마인드스캔·오라클·/reading·연간·guardian·찻집·영냥이. 숙요: 영냥이 개인 질문(IMD, 검증 구간 한정) |
| ② 기존 승인 결과 + 해석·말투 개선 | ①의 모든 LLM 상품, 기본 사주 궁합(화면·LLM 사실 일치 보완), 마스터 코덱스, 융합, 카르마, 영냥이 4등급 |
| ③ 새 엔진 전환 보류 | 아래 표. 이 상품들에도 ②의 문체·표시 순서 개선은 적용한다 |

| 보류 상품 | 사유 |
|---|---|
| 서양 전체 명반(astrology-ai, guardian 점성, 네오 synastry) | Placidus 하우스 범위 밖 처리와 경계값이 독립 검증되지 않음 |
| 베다 전체 명반(vedic-ai, nakshatra*) | 라그나·노드·하위 다샤가 독립 검증되지 않음 |
| 숙요 궁합·연간·찻집 월간 | IMD 검증 구간 밖 |
| 융합의 베다·숙요·서양 장 | 위 세 체계와 같은 사유 |
| 휴먼디자인, 오늘의 하늘 | 독립 천문 검증 없음 |

## 마스터별 예시 (편집 예시)

실제 LLM 출력이 아니다. 계약과 렌즈에 따라 사람이 손으로 쓴 예시다. 같은 사실(일간 丙火, 신약, 용신 후보 木·火, 출생 시각 미상)과 같은 질문("올해 이직해도 될까요?")을 쓴다. 결론과 확실성은 같고, 공감하는 지점과 장면, 권하는 행동만 다르다.

**연이**
> 올해 이직은 서두르기보다 준비를 먼저 단단히 하는 쪽이 맞아 보여요. 지금은 힘을 밖으로 크게 쓰기보다 받쳐 줄 자원을 모을 때라서요(타고난 기운이 약한 편이고, 도움이 되는 기운이 아직 후보로만 보여요). 혹시 요즘 출근길에 마음이 자꾸 무거워진다면, 그 무게를 그냥 넘기지 말고 이번 주에 "옮기고 싶은 이유" 세 줄만 적어 보세요.

**네오**
> 결론: 올해 이직은 준비가 끝난 뒤에 움직이는 편이 낫다. 지금 판세는 힘을 아껴 받쳐 줄 자원을 모으는 쪽이다(신약, 보완 기운은 후보 단계). 우선순위는 셋이다. 1) 지원할 분야 두 곳을 좁힌다. 2) 이력서를 이번 주에 갱신한다. 3) 지금 자리를 먼저 그만두지는 않는다.

**윤달**
> 올해의 이직은 문을 미리 두드려 보는 해로 읽힌다. 바로 건너가는 해로는 읽히지 않는다. 기운이 약한 편이라 큰 결정 하나보다 작은 준비 여러 개가 잘 쌓인다(보완 기운은 아직 후보다). 지금 일에서 배울 것이 남아 있다면, 그것을 정리해 두는 일부터 시작해 보자.

출생 시각이 없으므로 세 예시 모두 시주에 기대는 판단을 하지 않는다. 시기도 특정하지 않는다.

## 검증 실측

로컬에서는 실제 PG·LLM·DB를 부르지 않았다. Swiss Ephemeris도 실행하지 않았다.

| 항목 | 결과 |
|---|---|
| 계약 단위 테스트 `consultation-answer-voice.test.mjs` | 7/7. OFF 바이트 동일; 연이·네오가 같은 사실에서 렌즈만 다름; 등록 마스터만 렌즈; locale 유지·말씨 미지정; 고정 의미; guardian 연이 규칙 교체(userPrompt 불변); 주제가 달라도 각자의 사실 유지 |
| `expert-character-personas` | ON/OFF/고정/영어 통과 |
| 타로 사실 고정 `tarot-fact-consumers` | 4/4. OFF seed가 기준 커밋과 같음; 부분 JSON 재개·OFF 재개에서도 카드를 다시 뽑지 않음; 변조 시 LLM 재호출 0회 |
| 인생의 책·신년·연애 비책 유료 전달 행동 테스트 | 50·53·38 통과. 결제 복귀·동시 요청·재시도·장 생성·재열람 포함 |
| 카르마·나크샤트라·신년 질문·사주 유료·자미 공개 범위 | 통과 |
| Jest(Swiss에 닿지 않는 스위트) | 17개 스위트, 329개 테스트 통과 |
| 화면 하네스(mock, 960·390px) | 16/16. 저장 payload 불변, HTTP 실패 0 |
| 출생 명반 UI 하네스 | 통과. 차트 상자가 기본으로 닫혀 있음 |
| 정적 검사 | `tsc --noEmit` 0 오류, `verify:worker-no-undef`, `verify:ai-prompt-billing-policy`, `verify:no-nested-retry`, `git diff --check`, 변경 파일 ESLint 오류 0 |
| 릴리스 격리 검사 | `preflight.test` 2/2, `verify.mjs`(그리니치 시계·자미 OFF 재개·타로 결제 전 해석) 통과 |

Swiss 모듈에 닿는 테스트 19개는 로컬에서 돌리지 않고 main CI에 맡겼다. 그중 하나가 `saju-compat-basic-delivery`, 또 하나가 `saju-authority-new-year`다. 다만 궁합 보완 작업 중에 이 두 테스트를 한 번 실행했다. 의도한 계산은 없었지만, `swiss-ephemeris.js`의 최상위 import 때문에 `sweph-wasm` 모듈이 메모리에 로드되었을 수 있다.

같은 일이 push 단계에서 한 번 더 있었다. `scripts/run-mock-tests.mjs node <파일>`은 지정한 파일만 도는 게 아니라 `test:node` 전체 패턴에 그 파일을 덧붙인다. 그래서 oracle guard 없이 전체 묶음이 최대 150초 동안 돌았다. worktree의 `node_modules`에 `sweph-wasm`이 있으므로, 그 사이 Swiss에 닿는 테스트가 이 모듈을 로드했을 수 있다. 그 뒤로는 Swiss 연결 검사에서 통과한 623개 파일만 guard 아래에서 돌렸고, 4,423개 테스트가 모두 통과했다.

## 운영 반영

- 운영 Pages와 Worker 모두 `05e03a0ed`로 배포됐다(릴리스 run 42297582510, `verify-deployed-sha` PASS). 그 전에 main CI run 42291672469가 모든 잡에서 통과했고, 스테이징 배포 run 42291759332도 성공했다.
- push하면서 main CI를 깨뜨린 원인 네 가지를 고쳤다. 엔진 코드는 바꾸지 않았다.
  - `paid-report-length-recovery`(찻집), `paid-report-partial`(코덱스), `ziwei-execution-lifecycle`의 VM 하네스에 질문 직답 계약 함수를 주입했다. 자미 하네스는 이 함수가 없어서 `test:node` 레인을 24분 동안 멈춰 세웠다.
  - `config/env.contract.json`에 `SUKUYO_IMD_NEW_ORDERS_V1`을 등록했다(env-parity).
  - `yeongnyangi-natal-profile`의 fixture가 `sukuyo-verified-provider.js`를 `sukuyo-astronomy.js`처럼 대체한다.
  - `sukuyo-verified-order`는 다른 영냥이 하네스처럼 `LLM_DRY_RUN:'false'`를 env에 명시한다. 목 러너가 `LLM_DRY_RUN=true`를 설정하기 때문이다.

- 운영 CI와 릴리스는 지금처럼 `sweph-wasm`을 설치한다. 이 예외는 [CR-010](change-requests/CR-010.md)에 사용자 결정으로 기록했다. 워크플로의 루트 preflight 줄은 되돌렸다.
- 그대로 끈 플래그: `ASTROLOGY_CONSUMER_FACTS_V1`, `VEDIC_CONSUMER_FACTS_V1`, `SUKUYO_CONSUMER_FACTS_V1`.
- SEO 영향 없음: 공개 URL의 메타·구조화 데이터는 바꾸지 않았다. 결과 화면·보관함은 기존 색인 정책을 따른다.

### 숙요 플래그 재차단 (2026-11-07)

- `SUKUYO_IMD_NEW_ORDERS_V1`을 켠 뒤, 출생이 검증 구간 밖인 고객(대부분의 실제 고객)의 영냥이 숙요 무료 운세와 숙요 개인 질문이 `PRECISION_UNAVAILABLE` 503으로 실패했다. `worker/yeongnyangi/fortune/sukuyo/provider.ts`가 `verifiedSukuyoForCivilTime()`의 `null`을 기존 계산으로 넘기지 않고 503을 던지기 때문이다. 무료 운세(`free/readings.ts`)도 같은 경로를 탄다는 점을 이 문서와 33번 문서가 빠뜨렸다. 테스트는 검증 구간 안의 합성 출생만 썼다.
- 사용자 결정에 따라 커밋 `7c5b33403`으로 표에서 그 줄을 지우고 재배포했다. 운영 결과: main CI run 42309310877 전 잡 통과 → 릴리스 run 42312013253 성공 → `verify-deployed-sha` PASS(Pages·Worker 모두 `7c5b33403`).
- 다시 켜는 조건(사용자 결정): 범위 밖·경계 입력은 503 대신 기존 계산을 쓰고, 어느 버전으로 계산했는지 기록한다. 실제 고객 출생 연대 표본으로 확인한 뒤 켠다. 작업은 [인수인계 문서](../handoff/engine-hold-products-verified-provider-2026-11-07.md) 1단계다.

## 롤백

- 문체: `engine-rollout.js`의 `CONSULTATION_ANSWER_VOICE_V1` 줄을 revert하고 재배포한다. 이미 시작된 생성은 고정된 값으로 끝까지 간다.
- 화면: `lib/result-layout.ts`를 `false`로 바꾼다.
- 숙요: `SUKUYO_IMD_NEW_ORDERS_V1` 줄을 revert한다.
- 긴급할 때는 릴리스 워크플로를 `mode: rollback`으로 실행한다.

## 남은 조건과 후속

- 실제 LLM 문체 품질은 mock으로 확인할 수 없다. 운영 표본을 따로 검토해야 한다.
- Swiss 비연결 릴리스(CR-010/011)와 CR-009는 아직 열려 있다.
- 클라이언트가 계산한 사실을 쓰는 경로: fortune.js 명식 상담의 `sajuResult`, crystal-soul·ijik·numerology. 찻집 복구, saju-section, 숙요 연간은 요청할 때마다 다시 계산한다.
- 보관함 카르마의 LensRadar는 아직 본문보다 먼저 나온다. 서양 출생 카드, 숙요 궁합 점수, ReadingBook의 닫힌 상자는 순서를 보고만 하고 바꾸지 않았다.
- 보관함 클라이언트 번들이 SavedCompassReport → 나침반 엔진 → `sukuyo-engine-server` → `swiss-ephemeris.js`를 끌어온다. 그래서 보관함 화면 하네스 시나리오는 guard 아래에서 돌지 않고, 보관함 순서 변경은 tsc로만 확인했다. 의존 경로를 따로 분리해야 한다.
- 인생의 책 PDF는 화면 순서를 따르므로 명식 페이지가 맨 뒤에 온다.
- 사주 궁합의 KIJI/HE_TRAP 문구는 아직 "주의 오행"이다. 일간 운세 점수는 29번 정책대로 옛 강약 입력을 쓴다.
