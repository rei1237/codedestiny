---
status: active
updated: 2026-09-29
next: "참치 10장 저장 raw는 읽기 전용 재검증 통과. 추가 과금 없이 v7 OFF를 유지하고, 별도 승인 뒤에만 미생성 11~24장의 실측을 이어간다. Phase 4 미완료."
---

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

- 총 유료 생성 53회, 총 계산 비용 601.24원. 품질 거절 23회의 계산 비용 261.67원 포함. 타임아웃 오류 0회, 시도 소요 최대 19.924초. 이는 이 표본의 결과이며 다른 서비스의 실운영 타임아웃 검증이 아니다.
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

## 전달 기록

- 구현 `3d6d87a36`, 골든 도구/부분 실측 `ce850f17e`, main 전달 merge `5d10f364a24074c75ce9278f2f1f8bdca4f21b13`은 `git push origin main` 완료.
- 해당 main CI run `36471064225`에서 타입/lint와 Paid Flow Gates는 통과했으나 정적 node 테스트 1,848개 중 HD 동시성을 숫자 리터럴로 읽던 1개가 실패했다.
- `9ad577f64`에서 그 테스트를 실제 공통 contract import로 바꾸고 `node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/human-design-report.static.test.js` 27/27 통과를 확인했다. 코드 정책을 완화하지 않았다.
- 최종 전달 CI와 `check:fast` 상태는 최종 응답의 정확한 SHA 및 run 링크를 따른다. 위 초기 실패를 성공으로 표시하지 않는다.
- 최종 로컬 Jest는 312스위트·4,542테스트 통과. node 1,848개는 수정 커밋 `2079aa3f3`의 CI에서 모두 통과했다. 그 뒤 날짜가 바뀐 사이트맵과 새 호출 inventory, 공개 미러 드리프트를 생성기로 갱신해 `dd07e9ca0d550ab65a9f6182cfc5548d469abf1b`까지 main push 완료. AI Locale Gate/Main drift watchdog/Secret Scan 통과, sitemap/mirror 로컬 가드도 통과했다.
- `dd07e9ca0` CI run `36472895284`는 이 문서의 frontmatter 누락으로 중단됐다. 문서 계약만 수정해 후속 커밋에서 `verify:handoff-contract`를 재검증한다. 인수인계 문서는 실행 검증과 다른 상태를 나타내지 않는다.

## 다음 행동

1. 아래 후속 수정의 읽기 전용 재검증을 재현한다. 기존의 품질 검사 완화 금지 안내는 2026-09-29 사용자의 명시적 완화 요청으로 대체됐다. 계산 근거·필수 구조·안전성 검사는 유지한다.
2. 추가 live 호출은 이미 소비된 시도 예산과 신규 승인 범위를 먼저 구체화해야 한다. 현 artifact를 덮어쓰지 않는다.
3. 참치 전체와 의미 검토가 끝난 뒤 측정 상수 교체를 판단한다. 다른 체계/ask는 여전히 추정이다.
4. Phase 4가 통과하고 Phase 5 승인까지 있을 때만 플래그 활성화와 공개 분량 문구를 함께 바꾼다.

## 2026-09-29 참치 중단 원인과 편집 검사 완화

- 사용자 요청: 품질 기준을 지나치게 엄격하게 적용하지 말고 순차적으로 끝까지 생성. 추가 과금 중단과 v7 OFF는 유지.
- 10장 첫 시도는 tokenizer 오류로 생성 호출 0회였다. 두 번째 응답은 정상 종료(`STOP`), 입력 6,731토큰, 출력 1,569토큰, thinking 861토큰, 출력 예산 12,274토큰이었다. 이 응답은 길이/컨텍스트 초과가 아니라 `V7_ANCHOR_REPEAT`로 거절됐다.
- 기존 검증은 직전 실패가 품질 오류일 때만 반복 문장을 정리했다. 앞선 실패가 공급자 오류라 마지막 유효 초안도 재생성을 요구하며 중단됐다.
- 이제 v7 편집 audit은 첫 유효 초안부터 기존 결정적 정리를 적용한다. 계산 근거·블록 구조·원본의 복제 문단·안전성 검사는 그대로 유지한다. 모든 문장이 정리 대상인 블록은 기존처럼 첫 문단을 보존하고 잔여 반복을 기록한다. 편집 후 짧아진 장을 추가 과금으로 다시 늘리지 않는다. 기존 총분량 계약은 변경하지 않았다.
- 수정 파일: `worker/yeongnyangi/providers/chapter.ts`, `worker/yeongnyangi/fortune/reading-v7-quality.ts`, `scripts/yeongnyangi-v7-golden.mjs`, 품질/골든 회귀 테스트, 이 문서.
- 골든 mock도 실제처럼 이전 장을 다음 장에 넘긴다. `--revalidate-only`는 기존 저장 raw만 읽고 검증하며 API 키·공급자 호출·시도 예약·checkpoint/summary 쓰기를 하지 않는다.
- 기존 실측의 읽기 전용 결과: 연어 8/8, 광어 13/13, 참치 10/24까지 검증 가능. 10장은 반복 4문장(307자)을 정리한 뒤 통과했고 복원 블록은 0이었다. 기존 checkpoint는 여전히 9/24이며 변경하지 않았다. 11~24장은 raw가 없어 실측 완료로 표시하지 않는다. 종료 코드 1은 미완료 표시다.
- mock 참치 24/24 순차 처리 통과(생성 요청 0회). 모의 문장은 의도적으로 반복되는 구조 fixture이므로 의미 품질 증거가 아니다. 추가 테스트는 저장 raw 재검증, 공급자 오류 뒤 유효 10장 수용, 미생성 장의 미완료 유지, 실호출 모드 거부, 원본 파일 불변을 확인한다.
- 유지: 가격·이용권/월정석/단건 결제·인증·DB 스키마·저장/lease 계약·시도 예산·v6 경로·v7 OFF. 실 LLM·실결제·운영 DB 쓰기·운영 승격 없음.

읽기 전용 재현:

```powershell
Set-Location 'D:\Development\code-destiny'
node --require ./scripts/lib/mock-network-guard.cjs scripts/yeongnyangi-v7-golden.mjs --revalidate-only --out 'C:\Users\user\.codex\artifacts\v7-golden-20260929-live2'
```

검증/커밋/main 전달 CI 결과와 재개 SHA는 아래 후속 전달 기록에 기재한다.
