# 서비스 개편 · 검색과 결과 제공 측정

## 배포 전후의 경계

소스·mock·CI 통과는 운영 PG, 유료 LLM, 운영 DB와 실사용 품질의 증거가 아니다. 운영 승격은 별도 승인 후 기존 릴리스 절차로 진행한다. 가격·이용권·월정석·단건 결제 정책은 유지한다.

영냥이 복구는 기존 10분 cron에서 원 주문과 저장된 챕터를 재사용한다. 5분 이상 중단된 요청, 만료된 실행 잠금만 대상으로 한다. 한 tick은 최대 3개 후보와 4분 예산을 사용하고 기존 생성 시도 한도를 넘기지 않는다. 브라우저 복귀가 없는 결제도 원 requestId로 활성화하며 새 결제를 만들지 않는다. 활성화 직후의 요청은 다음 복구 tick에서 생성될 수 있다. 자동 복구는 즉시 제공 보장과 다르다.

환불 요청 중이거나 결과를 확정할 수 없는 주문은 생성·완료 저장을 멈춘다. PG 취소 실패·시간 초과는 실제 취소 여부가 모호할 수 있으므로 `metadata.yeongnyangiRefundPending`을 자동 해제하지 않는다. 운영자는 결제사 원장과 주문을 확인한 뒤 기존 운영 절차로 처리한다. `PAYMENT_NOT_ACTIVE`, `GENERATION_REVIEW_REQUIRED`를 재결제로 해결하지 않는다.

## 퍼널의 의미

| 지표 | 근거 | 제한 |
|---|---|---|
| 유입 | GA 방문 / GSC 클릭 / referrer | 식별되지 않은 AI 방문을 추정해서 채우지 않음 |
| 상담 시작 | `consultation_start` | 서버가 상담 요청을 만든 뒤 브라우저에서 관측 |
| 결제 승인 | GA4 `purchase` | 서버 confirm의 승인 상태·금액·주문번호만 사용. PG 창 callback으로 보내지 않음 |
| 권한 적용 | `entitlement_granted` | GRANT_PENDING·PENDING_CONFIRMATION·복구 대기와 구분 |
| 저장 완료 | 원 주문의 COMPLETED 상태 | 서버 주문 기록이 정본. 부분 챕터는 완료가 아님 |
| 완료 결과 관측 | `fortune_completed` | 브라우저가 서버의 COMPLETED 응답을 받은 경우. 창을 열지 않은 cron 완료는 GA에서 누락될 수 있음 |
| 첫 열람 | `fortune_first_open` | 같은 브라우저·동의 저장소 기준 중복 억제. 여러 기기 사이의 최초 열람을 보장하지 않음 |

`purchase.transaction_id`는 원 주문 ID를 사용한다. 금액은 서버 응답을 쓰고 통화는 KRW다. 승인됐지만 지급 대기 중인 구매는 purchase만 보내며 지급 성공 후 entitlement_granted를 보낸다. 동의 전에는 영구 중복 방지 저장소를 쓰지 않고 기존 consent 정책을 따른다. 분석 스크립트 로드 전 이탈·광고 차단·동의 상태로 이벤트가 누락될 수 있어 실제 매출은 PG/주문 원장으로 확인한다.

생년월일·출생지역·질문·결과 본문·인증값을 새 이벤트에 보내지 않는다. 결과 관측 이벤트는 상품 식별자만 보내며 상담 ID는 보내지 않는다. 페이지 위치와 이동 대상은 쿼리를 제외한다.

## 28일 비교표

운영 배포일을 D0로 기록하고 D0 이전 28일과 이후 28일을 비교한다. 낮은 표본에서는 비율만으로 결론내지 않고 분모와 건수를 함께 적는다. 자동 예약 작업은 생성하지 않았다.

| 축 | 기록할 항목 |
|---|---|
| 브랜드 | 꿀꿀 운세 / 꿀꿀운세 / 영냥이 각각 노출·클릭·도착 URL |
| 주제 | 사주·만세력·자미두수·숙요점·타로·베다·점성술·궁합·오늘운세 대표 URL |
| AI | Google AI 노출, Bing AI 인용 페이지·수, 확인 가능한 추천 원문·날짜·질문 |
| 매출 | PG 승인 건수·금액, 권한 대기, 완료·부분·실패·환불 건수 |
| UX | 상담 시작 대비 승인, 승인 대비 완료, 완료까지 소요 시간 |
| 성능 | 모바일·데스크톱별 실사용 p75 LCP/INP/CLS; 데이터 부족은 측정 불가로 표기 |

고정 질문 표본: ‘생년월일로 무료 사주 보는 곳’, ‘자미두수 명반과 12궁 설명’, ‘숙요점 본명숙과 관계를 보는 서비스’, ‘출생시간을 모를 때 사주 상담’, ‘꿀꿀 운세와 영냥이는 어떤 서비스인가요’. 로그아웃/로그인 여부·언어·지역·날짜를 기록한다. 단일 답변은 전체 이용자 추천율이 아니다. 순위, 인용, 추천, 방문, 매출을 합쳐 하나의 수치로 보고하지 않는다.

## 검색 수집과 운영 확인

- robots의 검색봇 허용, canonical·meta·HTTP 헤더·사이트맵의 정책이 함께 맞아야 한다. 개인 도구·결과의 noindex를 검색 성과 때문에 해제하지 않는다.
- `/human-design/guide/`는 공개 설명, `/human-design/`는 개인 차트 도구다. 영냥이 검색 유입은 `/yeongnyangi/1000-won-fortune/`가 담당한다.
- IndexNow는 마지막 성공 제출의 URL·콘텐츠 서명과 비교한다. 지연 배포·같은 날짜의 변경·삭제·재시도도 대상이다. 운영 배포 뒤에만 제출한다. 최초 실행 또는 GitHub cache 만료 시 전체 공개 사이트맵을 다시 제출할 수 있다. 실패하면 checkpoint를 전진시키지 않는다. 제출 성공은 색인 성공이 아니다.
- 운영에서 실제 OAI-SearchBot·PerplexityBot 요청이 WAF에 막히는지는 요청 로그와 공식 IP를 대조해야 한다. 개발 검증으로 실제 수집 허용을 입증했다고 보고하지 않는다. 이번 변경에서 방화벽 예외나 학습 허용 설정을 바꾸지 않는다.
- llms.txt는 공개 서비스 설명의 보조 파일이다. 순위나 추천을 강제하는 태그가 아니며 숨은 키워드·검색봇 전용 본문을 쓰지 않는다.

공식 근거: [Google AI 검색 최적화](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [OpenAI 봇 구분](https://developers.openai.com/api/docs/bots), [Perplexity 크롤러](https://docs.perplexity.ai/docs/resources/perplexity-crawlers), [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c), [IndexNow FAQ](https://www.indexnow.org/faq), [Web Vitals](https://web.dev/articles/vitals).

## 성능 변경과 아직 측정하지 않은 값

대표 영냥이 이미지에 480/800 WebP srcset, 고정 비율, high fetchpriority를 사용하고 아래쪽 반복 이미지는 lazy로 읽는다. 소스 파일 크기는 480 이미지 46,648 bytes, 800 이미지 100,692 bytes다. 대표 페이지 본문은 서버 HTML에 있고 새 폰트·이미지 생성 라이브러리를 추가하지 않았다. 기존 홈 CSS·스크립트는 유지하며 초기 이미지가 테마 스크립트에 의해 다른 로고로 덮이는 중복 요청을 제거했다.

이는 자산·구현 측정이며 Lighthouse 점수나 실사용 Core Web Vitals 통과 증거는 아니다. 실사용 목표는 p75 LCP ≤2.5초, INP ≤200ms, CLS ≤0.1이다. 충분한 운영 데이터가 쌓인 뒤 판단한다.
