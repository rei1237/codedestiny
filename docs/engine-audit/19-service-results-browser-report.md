# 다른 운세 결과의 실제 Next 브라우저 검증

status: done
updated: 2026-11-02
baseline: 62ed6cf26

## 요청과 경계

저장된 결론·해석을 먼저 보여 주고, 읽는 법·계산 근거는 기본 접힘으로 제공하는지 실제 서비스 URL에서 검증했다. `verify-service-results.mjs`는 실제 Next 앱·레이아웃·인증 provider·결과 컴포넌트를 실행한다. 컴포넌트 shim이나 dev-preview 쿼리 분기는 사용하지 않는다. 기존 개발용 합성 데이터를 **mock GET 응답**으로 주입한다. 천문 정확도 정답 데이터가 아니며 Swiss를 실행해 만든 데이터가 아니다.

PG·LLM·DB는 연결하지 않는다. 조회 이외 API는 501, 외부 네트워크는 차단한다. 운영 환경 파일을 로드하지 않고 OS 실행 변수만 자식 서버에 전달한다. require/webpack에서 Swiss 및 실제 DB 모듈을 거부한다. 원격 글꼴도 차단하므로 운영 CDN 글꼴과의 픽셀 동일성 검증은 아니다. 새 엔진 선택 옵션을 주입하지 않으며 운영 기본 OFF를 유지한다.

## 최종 확인 범위

Chrome/Playwright, 실제 Next 개발 서버, 960px와 390px. 각 화면에서 저장 답변이 근거보다 앞서는 DOM 순서, 해석 노출, 근거 기본 접힘·내용 숨김, 키보드 펼침·닫힘, 펼침 전후 원문 일치, 가로 넘침 없음, 새로고침 후 기본 접힘과 동일 응답 해시를 확인했다. 모든 화면은 최소 2회 저장 응답을 읽었으며 결제 창 호출은 없었다.

| 실제 경로 | 결과 | 접힘 영역 |
|---|---|---|
| `/vedic-ai/result/` | 통과 | 명반·계산 자료, 이미지 안내 |
| `/astrology-ai/result/` | 통과 | 차트·계산 자료, 이미지 안내 |
| `/new-year-ai-consultation/` | 통과 | 기본 원국 프로필 |
| `/sukuyo-compatibility-ai/` | 통과 | 점수 비교·계산 근거; 실제 결과 모달 |
| `/life-book-ai/result/` | 통과 | 기본 명식·오행·십성 |
| `/love-secret-ai/result/` | 통과 | 본인·상대 명식; 공유·후기는 본문 뒤 |
| `/karma-destiny-ai/result/` | 통과 | 15개 근거 disclosure, 관점 도표·계산값 목록 포함 |
| `/fusion-fortune/` | 통과 | 교차 근거; 저장된 최종 결론을 첫 결과로 이동 |
| `/yeongnyangi/result/` 사주 | 통과 | 저장된 명반 자료 |
| 같은 경로 자미두수 | 통과 | 저장된 명반 자료 |
| 같은 경로 숙요 | 통과 | 저장된 명반 자료 |
| 같은 경로 베다 | 통과 | 저장된 명반 자료 |
| 같은 경로 서양점성술 | 통과 | 저장된 명반 자료 |
| 같은 경로 타로 | 통과 | 저장된 카드 자료; 이미 공개한 카드의 재열람 상태 |

최종 **14/14**는 `results/service-results-20261102/final-report.json`에 실행별 출처와 저장 해시를 기록했다. 전체 실행의 12개 통과, 숙요·운명의 업 재검증, 마지막 연애 비책 변경 재검증을 합친 결과다. 실패한 최초 실행을 성공으로 덮어 기록하지 않았다. 각 `*-960.png`, `*-390.png`는 최종 화면 증거다.

## 수정 파일과 의도

- `app/life-book-ai/result/LifeBookAiResultClient.tsx`: 원국표·오행·십성에 기존 `ResultReference` 적용. 저장된 요약과 본문 유지.
- `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`: 명식표만 접고 관계 해석은 계속 표시. 공유 도구에 딸린 후기 안내가 결과보다 먼저 나오던 배치를 본문 뒤로 이동. 기존 후기 정책·문구·조건 유지.
- `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`: 관점별 기여도 도표와 저장 계산값 목록을 접음. 목차 목적지·PDF 펼침 옵션 유지.
- `app/fusion-fortune/FusionResultThread.tsx`: 기존 최종 결론 블록을 첫 결과로 이동. 원래 문장·체계별 판단·행동 조언은 동일.
- `app/new-year-ai-consultation/NewYearAiClient.tsx`: 폐기된 화면의 조회 잠금 때문에 재조회가 막히던 문제 수정. 잠금을 해당 조회의 유효 범위와 연결하고, 오래된 응답이 새 조회의 잠금을 해제하지 못하게 한다. 유효한 동시 조회·생성의 배타 동작과 계정별 응답 무효화는 보존한다.
- `__tests__/ui/new-year-saved-result-load.test.mjs`: 실제 페이지 callback을 실행해 중복 조회, 폐기 후 재조회, 늦은 응답, 실패 후 재시도, 생성 중 조회 차단을 검증하는 3개 테스트.
- `__tests__/ui/fusion-fortune.static.test.js`: 결론이 먼저라는 새 표시 계약을 검사하도록 제목·순서 단언 갱신.
- `tools/oracle/next-delivery/service-results-fixtures.mjs`, `verify-service-results.mjs`: 실제 Next 결과 경로용 합성 응답·브라우저 러너. 운영 번들 의존성 추가 없음.
- `config/sitemap-lastmod.json`: 생성기로 신년 페이지의 소스 서명 1개 갱신. 날짜·URL·색인 정책은 동일.

새 고객 문구를 추가하지 않고 기존 i18n label을 사용했다. 문장 내용을 가공하거나 새 해석을 생성하지 않았다. 기존 평문에 섞인 설명을 정규식으로 잘라 숨기지 않는다.

## 검증 기록

- `node tools/oracle/next-delivery/verify-service-results.mjs` 및 `AUDIT_SERVICES=sukuyo,karma`, `AUDIT_SERVICES=love-secret` 선택 재검증: 위 14개 사례 최종 통과. 모든 관측 API는 GET, 미구현 API 호출 0. 최종 선택 사례의 브라우저 예외 0.
- `node --require ./tools/oracle/next-delivery/guard.cjs --test __tests__/ui/new-year-paid-delivery.behavior.test.js __tests__/ui/new-year-ai-wake-recovery.behavior.test.js __tests__/ui/new-year-question-answer.behavior.test.js __tests__/ui/life-book-paid-delivery.behavior.test.js __tests__/ui/life-book-ux.static.test.js __tests__/ui/love-secret-paid-delivery.behavior.test.js __tests__/ui/karma-paid-resume.behavior.test.js __tests__/ui/fusion-fortune.static.test.js __tests__/ui/paid-report-storage.behavior.test.js`: **182/182** 통과. PG·LLM·저장소는 기존 테스트 mock이다.
- 결과 표시·PDF 접힘 복원·영냥이 원문 보존·신년 조회 잠금 관련 3개 파일(`ziwei-result-disclosure.test.mjs`, `yeongnyangi-result-focus.test.mjs`, `new-year-saved-result-load.test.mjs`): **12/12** 통과.
- 융합 순서 단언 변경 후 해당 파일 **20/20** 재검증 통과(182건에 포함되는 테스트이므로 중복 합산하지 않음).
- 변경 소스 ESLint `--quiet`: exit 0. 전체 TypeScript `tsc --noEmit --incremental --tsBuildInfoFile .tmp/engine-audit-typecheck/tsconfig.tsbuildinfo`: 최종 변경 후 exit 0.
- 로컬 구현 커밋 `9a2f9908c`에서 `npm run check:pre-push`: exit 0. 홈 레지스트리·정적 미러·사이트맵·llms 문서·SEO 레지스트리 통과. 최초 실행은 미커밋 소스가 있어 미러 검사가 거부했고, 로컬 커밋 후 정상 검증했다. 실제 push를 실행하는 명령이 아니다.
- `source-proof.json`: 기준 커밋 대비 엔진·결제·인증·공용 scope·의존성·설정 등 **49개 보호 파일 동일**. Next가 바꾼 `next-env.d.ts`는 실행 전 바이트로 복원했다.
- `check:fast --plan`은 전체 엔진 테스트와 worker build까지 승격한다. Swiss 차단 경계 때문에 이 광범위 실행은 하지 않고 허용 경로의 위 회귀·타입·lint를 수행했다. 전체 운영 build/CI 통과를 주장하지 않는다.

## 실패 관측과 처리

1. 신년 저장 결과가 개발 모드의 폐기된 첫 조회 잠금에 걸려 열리지 않았다. mock 응답을 갖춘 상태에서도 재현했고, 페이지의 조회 잠금만 수정한 뒤 실제 브라우저와 3개 callback 회귀가 통과했다. `new-year-before-fix.json` 보존.
2. 초기 영냥이 합성 데이터에 `limitations` 등 필수 필드가 없어 결과가 열리지 않았다. 운영 코드 대신 fixture를 실제 표시 스키마에 맞췄다. `fixture-correction-attempt.json` 보존.
3. 숙요는 결과 모달 뒤의 쿠키 선택 버튼이 가려져 테스트 클릭이 실패했다. 분석 쿠키를 이미 거부한 합성 재방문자 상태를 준비한 후 재검증했다. 실제 동의 정책·모달 로직은 변경하지 않았다.
4. 운명의 업의 한 개발 서버 실행에서 `Invalid or unexpected token`이 관측됐다. 새 서버에서 같은 소스로 재검증한 결과 예외·HTTP 오류 없이 960/390px와 15개 disclosure, 새로고침을 통과했다. 원인을 운영 결함으로 확정하지 않았다.

## 유지·제한

이 작업은 저장 결과 표시와 읽기 전용 재열람 검증이다. 모든 서비스의 실제 구매·신규 생성·PG webhook·운영 DB 내구성을 검증한 것은 아니다. 기존 자미 ON/OFF 전달 검증은 17번 보고서와 분리한다. 실 데이터의 모든 구버전 형식을 열람한 것도 아니다. 운영 적용 전에는 기존 승인 계획에 따른 별도 환경 검증이 필요하다.

이용권·월정석·단건 결제 정책, 가격, API/DB 스키마, 인증 로직, 엔진 계산, 저장·유료 결과 원본은 변경하지 않았다. 운영 플래그 OFF·Swiss 차단 유지. 실제 PG·LLM·DB 호출, push·배포 없음.

테스트가 만든 Next·Chrome 프로세스는 종료했고 `.tmp/engine-audit-next`, `.tmp/engine-audit-typecheck`는 절대 경로·하위 reparse point 부재를 확인한 후 정리했다. 다른 작업이 있는 원본 체크아웃에 자동 병합하지 않고 기존 격리 체크아웃과 로컬 커밋을 보존했다.
