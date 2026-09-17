# 유료 LLM 서비스별 전달 재검증표 — 2026-09-16

[인수인계 진입점](../handoff/paid-llm-service-delivery-20260916.md)에서 시작한다. **이 표의 대기는 미수정 결함 판정이 아니다.** 기존 코드와 회귀가 있어도 결제→권한→생성→저장→새 문서 재열람을 이번 차례에 끝까지 검사하기 전에는 완료 체크를 하지 않는다.

## 대상과 근거

초기 대상은 [완료본 접근 fixture](../../__tests__/fixtures/paid-completed-result-access-fixtures.mjs)의 **46개 구매 키**와 현행 [registry](../../worker/lib/paid-feature-registry.js)의 영냥이 **28개 구매 키**, 중복 없이 **74개**다. 마스터 2키를 포함하므로 나머지 구매 키는 72개다. 후속 3경로는 아래 별도 행이다. 손금은 사진 판독→결제 순서의 Vision/LLM 전달로 따로 취급한다.

마스터 2키는 2026-09-16 최종 조회에서 운영 Pages/Worker `77007dc4c` 일치와 운영 릴리스 35105200682 성공까지 확인했다. 실제 PG·실기기·청구 LLM·실고객 주문 완주는 미검증이다. 마지막 A~F 칸은 운영 배포만으로 체크하지 않는다.

영냥이는 `worker/yeongnyangi/`의 Code Destiny 통합 구현이다. 별도 SoulCat 저장소의 과거 검사로 통합 구현을 완료 처리하지 않는다. 6체계×4어종+융합4종을 각각 검사한다. 현행 단건 전용 정책을 유지하고 이용권·월정석을 새로 적용하지 않는다.

이 목록은 전체 registry를 LLM으로 분류한 표가 아니다. 각 차례에 실제 CTA→import→API→생성기를 추적하고, 새 유료 LLM/변형을 발견하면 행을 추가한다. 같은 파일을 쓰는 상품도 입력·카드 수·품질·가격 증빙이 달라 별도 행으로 완료한다. 비활성 UI, 결정론 프롬프트, 판매 중단 alias, 무료 다듬기, 관리자 LLM은 구분한다. 기존 구현 이력은 [9월 15일 매트릭스](../handoff/paid-llm-delivery-matrix-20260915.md)를 재사용한다.

## 한 행을 완료하는 기준

아래 A~F가 모두 성공하면 마지막 칸을 체크하고 **검증 SHA·명령·출력·증거 파일**을 붙인다. 한 행의 수정·회귀·commit/push·동일 SHA의 main CI를 끝낸 뒤 다음 행으로 간다. 실운영 칸은 별도 승인을 받아 수행한 실제 증거가 있을 때만 추가한다. 모의 완료와 실운영 완료를 섞지 않는다.

- **A 구매:** 실제 SDK 요청 조립의 redirectUrl, 원래 입력/언어/회차, 결제 증빙·멱등 키·resultId 유지. 지급 지연 및 승인 직후 activate/start 전 문서 종료를 주입한다. 새 탭·저장소 차단·복귀 URL 미도착에서도 같은 구매를 찾는다.
- **B 생성:** 현재 소스의 필수 장/절/카드/manifest, 최소 본문·구조·계산 근거·생시 미상을 검사한다. 오류 안내·mock/fallback·degraded·짧은 부분을 완성본으로 인정하지 않는다. 계산값을 LLM이 변경하지 못한다.
- **C 장애:** 첫 장만 저장, 앞 장 실패·뒤 장 성공, JSON/출력 잘림, 공급자 거절·429/5xx·복구, 본문 정체·불확실 타임아웃, 저장 throw/null/확인 유실, 락 만료·이전 소유자 쓰기·동시 탭을 재현한다. 불확실 차감을 확정 실패/추정 환불로 바꾸지 않는다.
- **D 전달:** 실제 고객 컴포넌트와 API 코드를 사용해 모바일 모의 390/430px 및 데스크톱에서 마지막 본문까지 읽는다. pageshow/bfcache·온라인·화면 활성화·잠금/종료 후 같은 구매로 재개한다. 브라우저 없는 동안 이어 생성이 필요한 장문 상품은 기존 서버 실행/크론을 대조하고, 없다면 전달 공백을 재현해 해당 상품만 수정한다. 화면이 다시 활성화되면 뒤로 가기 없이 복구한다.
- **E 저장·권한:** 품질 통과→저장 확인→완료 실행 기록 순서를 증명한다. 새 문서의 저장본 GET은 추가 LLM·결제·차감 **0회**다. 정상 구 완료본은 그대로 읽고, 전액 취소/환불·다른 계정은 차단한다. 부분 취소는 기존 정책을 따른다.
- **F 예산·운영 확인:** 같은 입력/모델/출력 기준의 전후 호출 수·입력 문자·usage를 기록한다. 공급자 내부·장별·복귀 재시도 예산을 합산하고, 성공 장 재호출·중복 차감을 금지한다. 입력 토큰 추정과 실제 청구 토큰을 구분한다. 장기 장애·정체·예산 소진을 기존 실행 기록/운영 로그에 집계하며 완료로 위장하지 않는다.

페이지 전체를 직접 렌더하지 않은 함수/격리 하네스는 그 한계를 기재한다. 손금의 사진 blob·과거 구매 이력, 베다 질문 및 연애 비책 후속의 활성 입력 UI는 기존 기록상 제한이 있으므로 현재 소스를 먼저 대조한다. 없는 UI나 판매 경로를 추정해 만들지 않는다.

## 순서별 구매 키

정본 링크는 관련 심볼→import→호출부 탐색의 시작점이다. 기존 검사 하나만 통과했다고 A~F 완료로 보지 않는다. 마스터의 현재 재검사도 실 PG/실기기 증거가 아니다.

| 순서 | 서비스 / 구매 키 | 탐색·검사 진입점 | 보존할 특성 | 이번 확인 상태 | A~F 완료 |
|---:|---|---|---|---|---|
| 1 | 마스터 인연의 서<br>`master-love-codex` | [정본](../../worker/routes/master-love-codex.js) · [기존 검사](../../__tests__/worker/master-love-codex-paid-delivery.test.js) | 개인 20장·사주/자미 근거 | 47서버·18복귀 재검사 통과 / 모의 20장·재열람 0회 | ☐ |
| 2 | 마스터 인연의 서 · 궁합<br>`master-love-codex-compat` | [정본](../../worker/routes/master-love-codex.js) · [기존 검사](../../__tests__/worker/master-love-codex-paid-delivery.test.js) | 궁합 20장·두 사람 근거 | 47서버·18복귀 재검사 통과 / 모의 20장·재열람 0회 | ☐ |
| 3 | 초융합 운세 상담 1회<br>`fusion-fortune-consultation` | [정본](../../worker/routes/fusion-fortune.js) · [기존 검사](../../__tests__/worker/fusion-paid-delivery-route.test.js) | 단계별 계산·정상 본문·저장 ID | [A~F mock 기록](fusion-paid-delivery-20260917.md) / 실제 화면·서버 복구 / 3,873 Jest·33 Node / c83f71985 main CI required success / 실운영 미검증 | ☑ |
| 4 | 심화 자미두수 PDF 심층 리포트 생성<br>`ziwei-deep-pdf` | [정본](../../worker/routes/ziwei-deep-report.js) · [기존 검사](../../__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js) | 필수 장 저장·완료 후 PDF | [A~F mock 기록](ziwei-deep-paid-delivery-20260917.md) / Node62·Jest125·실제 고객8case·PDF62페이지 / acdf20c38 source CI 전체 성공·1,397 Node/3,874 Jest / 1a622b555 문서 CI required success / 실운영 미검증 | ☑ |
| 5 | 네오의 팩폭 작전실<br>`neo-operation-room-consultation` | [정본](../../worker/routes/neo-operation-room.js) · [기존 검사](../../__tests__/worker/neo-paid-delivery.test.js) | 1·2차 작전 분리·궁합 근거 | [A~F mock 기록](neo-operation-room-paid-delivery-20260917.md) / pageshow·focus 복구 누락 재현·수정, 나머지 4개 우선 시나리오는 기존 회귀로 대조 완료 / 76 worker·7 UI·1,399 Node·3,874 Jest 통과 / 2e07bc0bb PR CI 실패(무관한 기존 sitemap-drift, 후속 커밋에서 자연 해소)·현재 main 12e62a0ea 전 레인 success 확인 / **D 실화면·F 전후 diff 증거 없음(경계)** | ☐ |
| 6 | 나크샤트라 결정판 전문가 심화 상담<br>`nakshatra-ai-consultation` | [정본](../../worker/routes/nakshatra-ai.js) · [기존 검사](../../__tests__/worker/nakshatra-paid-delivery.test.js) | 정상 부분·생시·취소 확인 | [A~F mock 기록](nakshatra-ai-paid-delivery-20260917.md) / pageshow·focus 복구 누락 재현·수정, 나머지 우선 시나리오는 기존 회귀로 대조 완료 / 118 worker+교차상품·신규 UI 행동 검사 1건·1,400 Node·3,880 Jest 통과 / 0ef57a367 커밋 → main·origin 끝점 aeeb9f714 전 레인 success(네오를 막았던 sitemap-drift 포함 막힘 없음) / **D 실화면·F 전후 diff 증거 없음(경계)** | ☐ |
| 7 | 인생의 책 전문가 상담<br>`life-book-ai-consultation` | [정본](../../worker/routes/life-book-ai.js) · [기존 검사](../../__tests__/ui/life-book-paid-delivery.behavior.test.js) | 장별 저장·deferred apply | [A~F mock 기록](life-book-paid-delivery-20260917.md) / pageshow·focus 복구 누락 재현·수정(결과 화면은 8행과 공유), 나머지 우선 시나리오는 기존 회귀·설계로 대조 완료 / 109 worker+교차상품·신규 UI 행동 검사 1건(UI 스위트 25/25)·3,880 Jest 통과 / c7793e219 커밋 → main·origin 끝점 동일 SHA 전 레인 확인 / **D 실화면·F 전후 diff 증거 없음(경계)** | ☐ |
| 8 | 인생 총운 전문가 상담<br>`life-fortune-ai-consultation` | [정본](../../worker/routes/life-book-ai.js) · [기존 검사](../../__tests__/ui/life-book-paid-delivery.behavior.test.js) | 총운 SKU·원래 분량·apply | [A~F mock 기록](life-fortune-ai-paid-delivery-20260917.md) / 사주 완전성 게이트(hasRequiredLifeFortuneSaju) 100% 미검증 발견·신규 테스트로 최초 실측(422·환불1·호출0 vs 202·첫웨이브4), 나머지는 기존 회귀·설계 코드 대조로 확인 / 16 UI(신규1)·96 교차상품·3,880 Jest 통과 / e68a309c2 머지 커밋 → main·origin 끝점 동일 SHA [CI](https://github.com/rei1237/codedestiny/actions/runs/35183457403) 13개 success·7개 skipped·실패0 / **D 실화면·F 총운 전용 전후 diff 증거 없음(경계)** | ☐ |
| 9 | 자미두수 전문가 상담<br>`ziwei-ai-consultation` | [정본](../../worker/routes/ziwei-ai.js) · [기존 검사](../../__tests__/worker/ziwei-paid-delivery.test.js) | 궁·사화·미완성 묶음 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 10 | 점성술 전문가 상담<br>`astrology-ai-consultation` | [정본](../../worker/routes/astrology-ai.js) · [기존 검사](../../__tests__/worker/astrology-paid-delivery.test.js) | 차트·필수 섹션 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 11 | 베다점 전문가 상담<br>`vedic-ai-consultation` | [정본](../../worker/routes/vedic-ai.js) · [기존 검사](../../__tests__/worker/vedic-paid-delivery.test.js) | 라그나·다샤·하우스 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 12 | 숙요점 궁합 전문가 상담<br>`sukuyo-compatibility-ai` | [정본](../../worker/routes/sukuyo-compatibility-ai.js) · [기존 검사](../../__tests__/worker/sukuyo-compatibility-ai.duplicate-generation.test.js) | 두 사람·숙요 관계·저장 확인 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 13 | 운명의 업 전문가 상담<br>`karma-destiny-ai-consultation` | [정본](../../worker/routes/karma-destiny-ai.js) · [기존 검사](../../__tests__/worker/karma-paid-delivery.test.js) | 초기 장·후속 질문 부모 내역 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 14 | 연애 비책 전문가 상담<br>`love-secret-ai-consultation` | [정본](../../worker/routes/love-secret-ai.js) · [기존 검사](../../__tests__/ui/love-secret-paid-delivery.behavior.test.js) | 필수 절·후속 API/UI 구분 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 15 | 신년운세 전문가 상담<br>`new-year-ai-consultation` | [정본](../../worker/routes/new-year-ai.js) · [기존 검사](../../__tests__/ui/new-year-paid-delivery.behavior.test.js) | targetYear·분야·apply | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 16 | premium-naming-report<br>`premium-naming-report` | [정본](../../worker/routes/naming-prompt.js) · [기존 검사](../../__tests__/worker/naming-paid-delivery.test.js) | 후보 이름·선택·필수 장 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 17 | 연이 운명 상담 1회<br>`fortune-chat-consultation` | [정본](../../worker/routes/fortune.js) · [기존 검사](../../__tests__/worker/guardian-paid-delivery.test.js) | 무료/paid turn·대화 내역 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 18 | 사주 전문가 상담 결과 생성<br>`saju_ai_question_prompt` | [정본](../../worker/routes/fortune.js) · [기존 검사](../../__tests__/worker/saju-paid-delivery-recovery.test.js) | 십성·본문·같은 job | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 19 | 점성술 AI 질문 프롬프트 생성<br>`astrology_ai_prompt_generator` | [정본](../../worker/routes/fortune.js) · [기존 검사](../../__tests__/worker/feature-question-paid-delivery.test.js) | 계산 사실·같은 질문 결과 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 20 | 자미두수 AI 질문 프롬프트 생성<br>`ziwei_ai_prompt_generator` | [정본](../../worker/routes/fortune.js) · [기존 검사](../../__tests__/worker/feature-question-paid-delivery.test.js) | 계산 사실·같은 질문 결과 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 21 | 숙요점 전문가 상담<br>`sukuyo_ai_prompt_generator` | [정본](../../worker/routes/fortune.js) · [기존 검사](../../__tests__/worker/feature-question-paid-delivery.test.js) | 계산 사실·같은 질문 결과 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 22 | 베다 점성술 AI 질문 프롬프트 생성<br>`vedic_ai_prompt_generator` | [정본](../../worker/routes/fortune.js) · [기존 검사](../../__tests__/worker/feature-question-paid-delivery.test.js) | 계산 사실·활성 UI 별도 확인 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 23 | 운명 찻집 타로 상담 (3카드)<br>`fortune-tea-house-tarot-consultation` | [정본](../../worker/routes/fortune-tea-house.js) · [기존 검사](../../__tests__/worker/fortune-tea-house-delivery-billing.test.js) | 모드별 카드/명식·원래 apply | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 24 | 운명 찻집 타로 프리미엄 상담 (5카드)<br>`fortune-tea-house-tarot-five-consultation` | [정본](../../worker/routes/fortune-tea-house.js) · [기존 검사](../../__tests__/worker/fortune-tea-house-delivery-billing.test.js) | 모드별 카드/명식·원래 apply | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 25 | 운명 찻집 사주 상담<br>`fortune-tea-house-saju-consultation` | [정본](../../worker/routes/fortune-tea-house.js) · [기존 검사](../../__tests__/worker/fortune-tea-house-delivery-billing.test.js) | 모드별 카드/명식·원래 apply | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 26 | 운명 찻집 사주 궁합 상담<br>`fortune-tea-house-saju-compatibility-consultation` | [정본](../../worker/routes/fortune-tea-house.js) · [기존 검사](../../__tests__/worker/fortune-tea-house-delivery-billing.test.js) | 모드별 카드/명식·원래 apply | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 27 | 운명 찻집 숙요점 궁합 상담<br>`fortune-tea-house-sukuyo-compatibility-consultation` | [정본](../../worker/routes/fortune-tea-house.js) · [기존 검사](../../__tests__/worker/fortune-tea-house-delivery-billing.test.js) | 모드별 카드/명식·원래 apply | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 28 | 휴먼 디자인 프리미엄 리포트<br>`human-design-report` | [정본](../../worker/routes/human-design-report.js) · [기존 검사](../../__tests__/worker/human-design-paid-delivery.test.js) | 차트 스냅샷·구매 재개 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 29 | 운명의 지도 심층 리포트<br>`destiny-compass-deep-report` | [정본](../../worker/routes/destiny-compass-ai.js) · [기존 검사](../../__tests__/worker/destiny-compass-paid-delivery.test.js) | 질문·계산·필수 장 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 30 | 운명의 섬 12궁 심층 상담<br>`ziwei-island-palace-consult` | [정본](../../worker/routes/ziwei-island-ai.js) · [기존 검사](../../__tests__/worker/ziwei-island-paid-delivery.test.js) | 궁별 저장·미완료 궁 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 31 | 셀레스티얼 하모니 타로 리딩<br>`tarot-celestial-harmony` | [정본](../../worker/routes/celestial-harmony.js) · [기존 검사](../../__tests__/worker/celestial-paid-delivery.test.js) | 카드별 필수 해석·PDF | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 32 | 그 사람의 바람끼 테스트<br>`relationship-boundary-test` | [정본](../../worker/routes/relationship-boundary-test.js) · [기존 검사](../../__tests__/worker/relationship-paid-delivery.test.js) | 장별 근거·점수 계산 보존 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 33 | 반려동물 사주 AI 심층 리포트<br>`pet-saju-ai-consultation` | [정본](../../worker/routes/pet-saju-ai.js) · [기존 검사](../../__tests__/worker/pet-paid-delivery.test.js) | 동물 계산·유료 LLM 본문 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 34 | 반려동물 궁합 분석<br>`pet-compatibility-ai` | [정본](../../worker/routes/pet-saju-ai.js) · [기존 검사](../../__tests__/worker/pet-paid-delivery.test.js) | 보호자/동물 계산 분리 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 35 | 애니멀 토템 리딩<br>`animal-totem-basic` | [정본](../../worker/routes/animal-totem.js) · [기존 검사](../../__tests__/worker/animal-totem-paid-delivery.test.js) | 기본 상품·동물 연결 해설 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 36 | 애니멀 토템 심화 리딩<br>`animal-totem-deep` | [정본](../../worker/routes/animal-totem.js) · [기존 검사](../../__tests__/worker/animal-totem-paid-delivery.test.js) | 심화 상품·정상 부분 재사용 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 37 | 정신분석 해몽<br>`dream-psycho-analysis` | [정본](../../worker/routes/dream.js) · [기존 검사](../../__tests__/worker/dream-psycho-analysis.route.test.js) | 꿈 원문·관점·장 구조 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 38 | 지오맨시 오라클 리딩<br>`geomancy` | [정본](../../worker/routes/oracle.js) · [기존 검사](../../__tests__/worker/geomancy-paid-delivery.test.js) | 원래 점괘·질문·해설 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 39 | 요가 구루 30분 코스<br>`yoga-guru-per-use` | [정본](../../worker/routes/yoga-guru.js) · [기존 검사](../../__tests__/worker/yoga-paid-delivery.test.js) | 코스별 시간·순서·분량 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 40 | 우리는 무슨 사이? 타로 리딩<br>`tarot-love-relationship` | [정본](../../worker/routes/tarot.js) · [기존 검사](../../__tests__/worker/love-tarot-delivery.route.test.js) | 원래 카드·관계 질문 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 41 | 마인드 스캔 타로 리딩<br>`tarot-mindscan` | [정본](../../worker/routes/tarot.js) · [기존 검사](../../__tests__/worker/mindscan-delivery.route.test.js) | 위치·부분·종합 해설 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 42 | 타로 오라클 상담 (1~4카드)<br>`tarot-prompt-maker` | [정본](../../worker/routes/tarot.js) · [기존 검사](../../__tests__/worker/oracle-consultation.route.test.js) | 티어별 카드 수·필수 해석·증빙 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 43 | 타로 오라클 상담 (5~7카드)<br>`tarot-prompt-maker-standard` | [정본](../../worker/routes/tarot.js) · [기존 검사](../../__tests__/worker/oracle-consultation.route.test.js) | 티어별 카드 수·필수 해석·증빙 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 44 | 타로 오라클 상담 (8~10카드)<br>`tarot-prompt-maker-deep` | [정본](../../worker/routes/tarot.js) · [기존 검사](../../__tests__/worker/oracle-consultation.route.test.js) | 티어별 카드 수·필수 해석·증빙 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 45 | 타로 오라클 상담 (11~14카드)<br>`tarot-prompt-maker-master` | [정본](../../worker/routes/tarot.js) · [기존 검사](../../__tests__/worker/oracle-consultation.route.test.js) | 티어별 카드 수·필수 해석·증빙 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 46 | 손금 정밀 판독 + 심층 해석<br>`palm-reading-general` | [정본](../../worker/lib/palm-result-delivery.js) · [기존 검사](../../__tests__/worker/palm-paid-delivery.test.js) | Vision/심층 저장→결제→재열람 | 기존 회귀 있음 / 이번 개별 E2E 대기 | ☐ |
| 47 | 영냥이 사주 고등어<br>`yeongnyangi-saju-mackerel` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 48 | 영냥이 사주 연어<br>`yeongnyangi-saju-salmon` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 49 | 영냥이 사주 광어<br>`yeongnyangi-saju-flounder` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 50 | 영냥이 사주 참치<br>`yeongnyangi-saju-tuna` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 51 | 영냥이 자미두수 고등어<br>`yeongnyangi-ziwei-mackerel` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 52 | 영냥이 자미두수 연어<br>`yeongnyangi-ziwei-salmon` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 53 | 영냥이 자미두수 광어<br>`yeongnyangi-ziwei-flounder` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 54 | 영냥이 자미두수 참치<br>`yeongnyangi-ziwei-tuna` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 55 | 영냥이 숙요 고등어<br>`yeongnyangi-sukuyo-mackerel` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 56 | 영냥이 숙요 연어<br>`yeongnyangi-sukuyo-salmon` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 57 | 영냥이 숙요 광어<br>`yeongnyangi-sukuyo-flounder` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 58 | 영냥이 숙요 참치<br>`yeongnyangi-sukuyo-tuna` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 59 | 영냥이 베다 고등어<br>`yeongnyangi-vedic-mackerel` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 60 | 영냥이 베다 연어<br>`yeongnyangi-vedic-salmon` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 61 | 영냥이 베다 광어<br>`yeongnyangi-vedic-flounder` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 62 | 영냥이 베다 참치<br>`yeongnyangi-vedic-tuna` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 63 | 영냥이 점성술 고등어<br>`yeongnyangi-astrology-mackerel` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 64 | 영냥이 점성술 연어<br>`yeongnyangi-astrology-salmon` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 65 | 영냥이 점성술 광어<br>`yeongnyangi-astrology-flounder` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 66 | 영냥이 점성술 참치<br>`yeongnyangi-astrology-tuna` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 67 | 영냥이 타로 고등어<br>`yeongnyangi-tarot-mackerel` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 68 | 영냥이 타로 연어<br>`yeongnyangi-tarot-salmon` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 69 | 영냥이 타로 광어<br>`yeongnyangi-tarot-flounder` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 70 | 영냥이 타로 참치<br>`yeongnyangi-tarot-tuna` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 71 | 영냥이 융합 사주 자미두수<br>`yeongnyangi-fusion-saju-ziwei` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 72 | 영냥이 융합 숙요 베다<br>`yeongnyangi-fusion-sukuyo-vedic` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 73 | 영냥이 융합 점성술 타로<br>`yeongnyangi-fusion-astrology-tarot` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |
| 74 | 영냥이 융합 6체계<br>`yeongnyangi-fusion-all` | [생성](../../worker/yeongnyangi/service.ts) · [기존 검사](../../__tests__/worker/yeongnyangi-route.test.js) | 상품별 manifest·계산·단건 권한 | 경로·가격 키 대조 / 이번 개별 E2E 대기 | ☐ |

## 후속 3경로

| 순서 | 경로 | 정본 / 기존 검사 | 필수 확인 | A~F 완료 |
|---:|---|---|---|---|
| 75 | 찻집 꿀편지 | [정본](../../worker/routes/fortune-tea-house.js) · [검사](../../__tests__/worker/fortune-tea-house-honey-drops.test.js) | 저장→원래 지갑 영수증·차감→완료, 잔액 부족/응답 유실에서도 같은 편지 복구 | ☐ |
| 76 | 카르마 후속 답변 | [정본](../../worker/lib/expert-follow-up-delivery.js) · [검사](../../__tests__/worker/expert-follow-up-delivery.test.js) | 같은 부모+질문 해시 재사용, 답변 저장 후 부모 부착 전 종료 및 GET 재부착 | ☐ |
| 77 | 연애 비책 후속 API | [정본](../../worker/lib/expert-follow-up-delivery.js) · [검사](../../__tests__/worker/expert-follow-up-delivery.test.js) | 같은 저장/부착 계약, 활성 입력 UI 유무 별도 확인·기존 API 보존 | ☐ |

## 각 차례 결과를 남기는 형식

`행 번호 / canonical 키 / 실제 활성 진입점 / 필수 출력 계약 / A~F 결과 / 수정 파일 / 검증 SHA / 명령과 출력 / 호출·차감 전후 / 새 문서 재열람 / main CI URL / 실운영 확인 또는 미검증 사유`

실제 고객 주문 복구·운영 DB 조회/쓰기·실결제/환불·과금 LLM·물리 PG 복귀·운영 승격은 사전 승인 없이 수행하지 않는다. 서비스 전체가 무오류라고 보고하지 않으며, 실제로 검사한 행과 미검증 경계를 보고한다.
