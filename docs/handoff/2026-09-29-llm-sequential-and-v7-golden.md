# LLM 순차 생성 및 v7 Phase 4 부분 실측

## 상태와 승인 범위

- 2026-09-29 사용자 승인: 사주 personal 연어·광어·참치 각 1권, 합계 3권. 실결제·운영 DB 쓰기·운영 배포는 수행하지 않았다.
- 동일 계산 fixture: 양력 1998-02-28 14:30, 여성, 서울. 엔진 계산으로 정재/편재 합 0, 천을귀인/문창귀인 present=false를 확인했다. 기준일은 2026-09-29.
- `READING_V7_ENABLED=false` 유지. 운영 상담 경로 대신 순수 manifest/provider/validator를 직접 호출했다.
- **Phase 4 미완료**: 연어 8/8, 광어 13/13, 참치 9/24. 참치 10장 정인에서 생성 전 tokenizer 실패 후 마지막 생성 시도도 `V7_ANCHOR_REPEAT`로 거절되어 중단했다. 장별 최대 2시도 예산을 늘리지 않았다.
- Phase 5 활성화와 원가 상수 교체는 수행하지 않았다. 미완성 표본을 전체 티어·다른 체계·물어보기 원가로 일반화하지 않는다.

## 순차 생성 변경

- `PAID_LLM_PARTS_PER_REQUEST=1`을 공통 정책으로 두었다. 저장된 부분을 보존하고 HTTP 요청마다 미완성 부분 하나만 생성·저장·재조회한다. 다음 요청이 다음 부분을 이어 쓴다.
- 공통 paid narrative(11서비스), celestial, relationship, naming, astrology, Neo, destiny compass, ziwei island, fortune tea, life book, nakshatra, ziwei deep, master love, karma, human design에 적용했다.
- fusion의 실제 유료 체크포인트 경로도 한 묶음만 실행한다. 길이 보완은 다음 요청에서 실행하고 기존 초안을 보존한다.
- 숙요 요약·자미 meta는 본문과 병렬 실행하지 않고 본문 저장 뒤 별도 요청으로 생성한다. 선택 요약의 기존 실패 허용 계약은 유지한다.
- `callGeminiJsonWithRetry`의 보완 호출 전체가 하나의 시간 예산을 공유한다. 타임아웃 응답 직후 같은 helper에서 재구매하지 않으며 내부 provider 시도는 1회다.
- 동기 요청 85초 상한은 유지한다. 영냥이 큐는 장별 180초 lease 안에서 생성 상한 150초, 저장 여유 30초로 조정했다.
- life book 8×4→32×1, human design 10×4→40×1로 전체 부분 시도 슬롯을 보존한다. human design 클라이언트도 40회로 맞추고 ‘작성 중’ 표시는 한 장만 표시한다.
- 결제 가격, 이용권/월정석/단건 결제 구조, 인증, DB 스키마, 총분량 하한은 유지했다. 부분 결과는 완성본으로 전달하지 않는다.
- 일부 비체크포인트 생성 함수는 기존 도구용 경로를 유지한다. 위 제한은 실제 유료 라우트가 제공하는 durable/checkpoint 경로에 적용된다. 외부 공급자 오류와 실패 비용 0을 보장하는 변경은 아니다.

## 실측 결과

Gemini 2.5 Flash의 `usageMetadata`를 저장했다. 아래 원가는 input $0.30/M, cached input $0.03/M, output+thinking $2.50/M 및 환율 1,400원 가정으로 계산한 값이며 실제 청구서가 아니다. 출처: https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash

| 티어 | 저장 장 | 유료 생성 호출 | 계산 원가 | 판매가 대비 | 호출/저장 장 |
|---|---:|---:|---:|---:|---:|
| 연어 | 8/8 | 12 | 141.38원 | 4.71% | 1.50 |
| 광어 | 13/13 | 23 | 267.00원 | 5.34% | 1.77 |
| 참치(미완성) | 9/24 | 18 | 192.86원 | 완료 원가 비율로 사용 금지 | 2.00 |

- 총 유료 생성 53회, 총 계산 비용 601.24원. 품질 거절 23회 포함. 타임아웃 오류 0회, 시도 소요 최대 19.924초. 이는 이 표본의 결과이며 다른 서비스의 실운영 타임아웃 검증이 아니다.
- tokenizer 실패 시도 1회는 `networkCalls=0`, 즉 유료 generateContent를 호출하지 않았다. 처음 네트워크 허용 목록에서 tokenizer를 빠뜨린 로컬 guard 실패 역시 생성 요청 0회였다.
- 입력/출력/thinking/cached: 연어 79,221/21,524/10,259/8,302; 광어 152,271/40,547/19,647/20,194; 참치 부분 결과 114,809/28,285/14,225/10,962.
- 기존 추정 retryFactor=1.25보다 실제 연어·광어의 재생성률이 높았다. 10% 미만 원가만으로 품질 통과라고 판단하지 않는다.

| 반복 지표 | 연어 | 광어 | 참치 9장(부분) |
|---|---:|---:|---:|
| 본문 문자 수(공백 포함) | 15,506 | 23,015 | 15,542 |
| 장 쌍 5-gram Jaccard 평균 | .01792 | .01685 | .01651 |
| 장 쌍 Jaccard 최대 | .02980 | .03222 | .03656 |
| 3장 이상 반복 8-gram 비율 | .00550 | .00986 | .01045 |
| 이전 장과 유사 문장 비율 | 0 | 0 | 0 |
| 고유 source / 인용 수 | 37/107 | 39/164 | 16/92 |
| 일간/오행/일주 포함 장 | 7/2/1 | 12/1/3 | 8/1/1 |

기존 Phase 0 v6 사주 참치 15장 기록은 Jaccard 평균 .03, 최대 .05, 반복 8-gram .02였다. 동일 fixture·동일 장 수 비교가 아니므로 개선의 인과 증거로 사용하지 않는다. 자동 검증 통과 장의 남은 위반은 0이지만, 전문가 의미 검토와 참치 전체 품질 검증은 미완료다. 일간 언급은 여전히 여러 장에 나타난다.

## 재현과 증거

- runner: `scripts/yeongnyangi-v7-golden.mjs`, 지표: `scripts/lib/yeongnyangi-golden-metrics.mjs`.
- 기본 mock, `--plan`은 네트워크 없이 범위를 출력한다. live에는 명시적인 `--live`와 승인 범위가 필요하다.
- API 키는 canonical `.env.local`에서 필요한 Gemini 키만 읽는다. DB/결제 키를 process.env에 설치하지 않는다. 생성과 tokenizer 외 호스트/API는 허용하지 않는다.
- raw 응답, 시도 예약, 검증된 장을 원자적 로컬 checkpoint로 저장한다. 완료된 장과 이미 소비된 실패 시도는 다시 호출하지 않는다. raw 없는 중단 시도를 자동 재구매하지 않는다.
- 로컬 증거: `C:\Users\user\.codex\artifacts\v7-golden-20260929-live2\checkpoint.json`, `summary.json`. raw 생성 문서는 커밋하지 않았다.
- 추가 과금 없이 재집계:

```powershell
Set-Location 'D:\Development\code-destiny'
node scripts/yeongnyangi-v7-golden.mjs --summary-only --out 'C:\Users\user\.codex\artifacts\v7-golden-20260929-live2'
```

참치 미완성이므로 위 명령의 종료 코드 1은 정상적인 미완료 표시다. 새 out 디렉터리나 시도 예산 증가로 승인된 검증을 몰래 다시 시작하지 않는다.

## 검증과 전달

- 영냥이 불변/공급자 경계: 9/9, 기존 v6 snapshot 갱신 없음.
- 핵심 순차 생성/fusion/숙요/HD: 124/124; 자미: 33/33; 추가 기존 스트레스 회귀: 246/246.
- 기존 다중 부분 저장 장애 테스트는 명시적인 4부분 stress fixture를 유지하고, production 기본값 1은 `paid-llm-sequential.test.js`에서 별도 검증한다. 스트레스 fixture 결과를 기본 순차 실행의 실측으로 보고하지 않는다.
- `verify:human-design-report`, `verify:master-love-codex-budget`, `verify:naming-prompt`, `verify:ai-consultation-flows`는 새 정책 기준으로 통과했다.
- 첫 `check:fast`는 기존 batch=4 가드 및 요청 횟수 fixture에서 실패했다. 수정 후 최종 `check:fast`와 main CI 결과는 아래 전달 기록/최종 응답을 따른다.
- impeccable context는 기존 설정 drift를 알렸다. 요청 범위를 넓혀 설정을 바꾸지 않았다. 변경 progress 파일 detector에서 추가 결함은 보고되지 않았다. 시각적 브라우저 검증은 실행하지 않았다.

## 남은 일

1. 참치 10장의 `V7_ANCHOR_REPEAT`와 여러 장의 `V7_FOREIGN_FACT` 원인을 저장 raw와 계산 근거만으로 분석한다. 품질 검사를 완화해 통과시키지 않는다.
2. 추가 live 호출은 이미 소비된 시도 예산과 신규 승인 범위를 먼저 구체화해야 한다. 현 artifact를 덮어쓰지 않는다.
3. 참치 전체와 의미 검토가 끝난 뒤 측정 상수 교체를 판단한다. 다른 체계/ask는 여전히 추정이다.
4. Phase 4가 통과하고 Phase 5 승인까지 있을 때만 플래그 활성화와 공개 분량 문구를 함께 바꾼다.
