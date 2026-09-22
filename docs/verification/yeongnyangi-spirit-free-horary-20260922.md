# 영냥 신점·무료 호라리·위치 동의 검증 (2026-09-22)

## 변경
- 신점 신규 `prashna-v1`은 `saju_flounder` / `yeongnyangi-saju-flounder` 정본을 사용한다. 5,000원 단건, 광어 분량 계약, 8개 고유 챕터를 적용한다.
- 기존 구매의 저장된 가격·manifest·결과는 수정하지 않는다. 신규 fingerprint 버전은 `question-sky-flounder-2`다. 기존 결과 GET/재열람/복구는 저장된 snapshot을 사용한다.
- LLM에는 프라슈나 차트와 질문별 구조화 근거를 함께 제공한다. 기본 공급자는 기존 Gemini 설정이며 Workers AI 폴백은 기존처럼 꺼져 있다. 질문 누락·중복·최소 분량·근거 연결 검사를 유지한다.
- `POST /api/yeongnyangi/free/horary`는 무료 계산과 프롬프트만 반환한다. 로그인·일일 해금·주문·결제·LLM·결과 DB 저장을 호출하지 않는다. 기존 보안/요청 제한은 적용한다. 신규 유료 호라리 요청은 거부하고 과거 구매 재열람은 보존한다.
- `POST /api/yeongnyangi/location`은 동의한 좌표를 검증하고 서버에서 IANA 시간대를 구한다. 좌표는 POST 본문으로 전달하며 URL·분석 이벤트에 넣지 않는다.
- 현재 위치 버튼은 호라리, 프로필 생성/상담 출생지 보완, 점성술·베다 상담 및 무료 프롬프트 허브에 연결된다. 출생 장소/질문 당시 장소인지 확인해야 적용된다. 권한 거부·실패 시 도시 입력을 유지하며 임의 좌표를 채우지 않는다.
- 영냥 무료 운세 16종과 무료 허브의 프롬프트에 후속 상담 지침을 공통 적용한다. 외부 AI 열기는 정보 자동 전송 없이 복사·붙여넣기로 연결된다.

## 정확도 경계
Swiss Ephemeris의 열대황도·Regiomontanus·전통 7행성을 사용한다. 행성·커스프·위계·질문별 주인성 후보·본궁 상호 리셉션·접근/분리·달의 사인 이탈 전 접촉을 내보낸다.
하우스 분류는 후보이며, 각은 6도 공통 오브/순간 속도, 달 접촉은 3시간 샘플에 따른 제한적 판정임을 명시한다. 삼분성·텀·페이스·행성시·빛의 전달과 수집·정확한 성취 시각은 미산출이다. 이를 완전한 전통 판단이나 사건 예측 보장으로 표현하지 않는다.

## 검증
- `npm run check:fast -- --plan` 및 `npm run check:fast` 실행: 자동 critical 승격. 결제 게이트 87/88 통과 후 신규 TS 의존성을 mock하지 않은 기존 라우트 테스트에서 중단했다.
- 위 테스트 경계를 수정한 뒤 `node scripts/run-mock-tests.mjs jest --runTestsByPath __tests__/worker/yeongnyangi-route.test.js`: 28/28 통과. 무료 API의 무인증·무결제·무생성·보안 차단을 확인했다.
- `npm run test:node`: 1,576/1,576 통과. 실제 로컬 천문 계산·DST·8챕터 품질·질문 누락·이전 구매·권한 거부·복사 실패 포함.
- `npm run typecheck`, 변경 소스 ESLint, `git diff --check`: 통과.
- `npm run sitemap:generate` 후 `npm run verify:sitemap-drift`: 1,284개 URL 일치.
- `scripts/verify-yeongnyangi-spirit-ui.mjs`: 390/1280px × 신점/호라리 4개 통과. 신점 주문·중간 저장·재열람, 무료 호라리 위치·외부 상담 확인.
- `scripts/verify-fortune-location-ui.mjs`: 390/1280px × 허브 3종/점성술/베다 10개 통과. 출생 장소 확인, London 시간대, 호라리 계산 요청, 복사 실패 안내 확인.
- 브라우저 산출물: `build-cache/yeongnyangi-spirit-ui/`, `build-cache/fortune-location-ui/` (로컬 mock 산출물, Git 미포함).
- UI detector: 발견 항목 없음. 모바일·데스크톱 캡처 직접 확인.

## 유지한 영역과 미검증
일반 고등어 가격, 이용권·월정석 정책, 기존 구매 저장/복구·환불 차단은 유지한다. 운영 DB·실결제·실 LLM·운영 배포는 실행하지 않았다. 실제 LLM 문장 품질은 미검증이며 위 결과는 계산·프롬프트 계약 및 mock 전달 경로의 검증이다. 전달 완료는 별도 main CI 결과로 확인한다.
