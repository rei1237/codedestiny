# CODE DESTINY 성장 개선 실행 기록

기준일: 2026-09-29 KST. 이 문서는 구현·모의 검증·운영 관측을 구분한다. 순위·매출 개선은 아직 측정하지 않았다.

## 관측과 가설

| 구분 | 근거 | 판단과 변경 | 실패 판단·관찰 지표 |
|---|---|---|---|
| 관측 | 홈 초기 HTML·app/page.js에 개발 설명과 두 번째 긴 꿀꿀 홈 안내 | 고객용 짧은 안내·공개 아카이브·보관함/문의 링크로 정리. 기존 첫 화면과 고민 가이드 유지 | H1·주요 href·canonical 회귀, 가로 넘침을 검사. 유입별 고민 선택률 관찰 |
| 관측 | 재회 랜딩 기본 CTA가 /로 연결 | 기존 재회 타로 실제 action으로 연결 | 재회 카드 진입 여부, 시작 이벤트 |
| 관측 | 천원 랜딩의 CTA에 기존 교차 클릭 표식 없음 | intro/example/closing/domain별 표식 연결 | 이벤트 누락·중복, 상품 확인→상담 진입 |
| 관측 | 자미두수·숙요 카드에 출처 없는 황실/금지 역사 문구 | 실제 명반·본명숙 설명으로 교체 | 문구 검증, 이탈률은 향후 관측 |
| 관측 | 자동 복구 예산 종료 후에도 자동 완성을 약속 | 저장분 유지·기존 주문 문의 안내, 실제 지원 링크, ASK_LIMITED 상태 일치 | 부분 결과 보존, 재결제 유도 0, 운영 hold 건수 |
| 관측 | Threads의 유형별 UTM이 날짜와 무관하게 같음 | 글별 날짜/type 또는 기존 T-ID 캠페인, 동의 기반 30분 세션 귀속 | 링크→주문→서버 완성 집계 가능 여부 |
| 관측 | 게시 publish 응답 유실을 ids=[] 실패로 재선점 가능 | containerId·publishUncertain 보존, 자동 재게시 차단·마지막 슬롯 알림 | 모의 응답 유실에서 발행 재시도 0 |
| 가설 | 길고 반복적인 점술 설명이 첫 진입을 어렵게 할 수 있음 | 첫 상황 질문→근거·행동→관련 질문 랜딩으로 수정 | 같은 게시 경과 시간의 유효 방문과 결제 후 수령률; 조회수만으로 승자 결정 금지 |
| 미확인 | 운영 Mongo 읽기 인증 code 18, 로컬 Threads 토큰 없음, 로그인 브라우저 연결 두 차례 timeout | 현행 결제 미제공 사고 수·최근 30개 글·GSC 최신 28일은 확인 불가 | 아래 읽기 전용 조회/권한 복구 후 확인 |

## 참조 글 1~6 적용

원문 URL: https://www.threads.com/@vibebusiness0928/post/Dd1cbChEkKf?hl=ko . 이번 원문 접근 실패. 사용자가 제공한 1~6만 사용했고, 나머지 연속 글·작성자의 매출·당일 SEO 기여는 검증하지 않았다.

| 원래 주장 | 가져올 원리 | 현재 증거 | 실제 변경·유지 | 검증 |
|---|---|---|---|---|
| 만세력+원페이지 | 빠른 첫 가치 | 고민 가이드·정적 무료 해석 이미 존재 | 게스트 무료 사주 경로, 무료 차트 첫 항목 펼침, 기존 URL 유지 | 4개 폭·입력/로그인 복귀 모의 검증 |
| claude-seo | 기술 SEO·검색 의도 일치 | 6개 대표 공개 URL 200·자기 canonical·H1 1개 | 홈 중복 안내·재회 목적지·1000 랜딩 추적·실제 변경 lastmod | 체크리스트·HTML·사이트맵 검사 |
| Search Console 등록 | 소유권·수집 상태 구분 | 기존 GSC 기록과 사이트맵 있음 | 중복 속성 생성 없이 제출 후보 5개 준비 | 최신 로그인 접근 필요; 제출·색인 완료 아님 |
| 30키워드·3글/일 | 고유한 답변을 꾸준히 편집 | 기존 전문 글 다수 | 후보 30개, 기존 가이드 3편 개선, 4주 계획 | 기존 URL·직접 답변·가상 예시·관련 링크 검수 |
| Threads 후킹·댓글 | 상황에 맞는 유입 경로 | Worker 4슬롯+기존 Codex 자동화 | 실제 프롬프트/검수/큐/UTM 수정; 댓글·DM 확대 없음 | 366일 길이·10개 전후 dry-run·13개 큐 검수 |
| 빠른 결제·즉시 제공 | 입력 보존·서버 확인·내구성 | 기존 PG 확인·장별 저장·재조정·보관함 있음 | 검증된 결제 구조 유지, hold 안내/문의·서버 수령 집계 보강 | 중복/역순 webhook·부분 저장·재접속은 mock/CI, 실결제 미실행 |

## SEO 기준과 범위

AgriciDaniel/claude-seo v2.4.0, commit `e77e783e38eeb738424eb72117abbd2dacdd88af`의 README, seo 허브와 technical/page/content/geo/hreflang, schema/sitemap 점검 절차를 현재 도구로 적용했다. Claude 슬래시 명령을 실행하거나 Claude 런타임을 설치한 것은 아니다. audit·SXO는 초기 HTML, 내부 경로와 구매 여정의 대조로 수행했고 google·drift는 기존 관측/코드 차이와 이번 공개 응답 범위에 한정했다.

공식 근거:
- https://github.com/AgriciDaniel/claude-seo/tree/e77e783e38eeb738424eb72117abbd2dacdd88af
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://searchadvisor.naver.com/guide/seo-basic-intro
- Meta 공식 API 컬렉션: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api . 텍스트 컨테이너→상태→발행 경로 유지. 코드 기존 보수적 480 한도 검증; 플랫폼의 최신 UI/첨부 한도 전체를 실계정에서 확인한 것은 아니다.

공개 응답 감사: `/`, `/yeongnyangi/1000-won-fortune/`, `/saju/`, `/sukuyo/`, `/ziwei/`, `/tarot/reunion/`가 200, self-canonical, index/follow, H1 하나, 사이트맵 포함, JSON-LD 파싱 가능했다. 원문 HTML 120~169KB, 텍스트 3,629~7,172자 범위는 전송·추출 관측이며 LCP/INP가 아니다. 사이트맵 1,300 URL과 robots의 5개 언어 사이트맵을 확인했다. 모든 1,300 URL을 실시간 크롤링했다고 주장하지 않는다.

`/saju/`, `/sukuyo/`, `/ziwei/`의 en/ja/zh/zh-tw 12개 조합은 200·자기 canonical·한국어 상호 alternate 확인. 홈/천원/재회는 번역 동등 페이지 존재를 확인하지 못해 alternate를 억지로 추가하지 않았다. 개인 결과·checkout·library는 기존 noindex와 인증을 유지한다. 운세 결과 지원 언어와 공개 SEO 언어는 별개: readingLocales는 12개이고, 상품·상담 종류별 입력 제한과 번역 품질은 기존 검사/현행 서버 조건을 따른다.

성능: 360/390/430/1280 화면에서 전후 가로 넘침 없음, H1 각 1개. 기존 정식 에셋 재사용. 이번에 실사용자 p75 LCP/INP/CLS를 수집하지 못했으므로 CWV 목표 달성은 미확인. dev 화면이나 크롤링 시간을 성능 점수로 바꾸지 않는다.

기존 GSC 기준선: docs/seo/SEO_STATE.json의 **2026-09-28 기록**, 기간 **6/26~9/25**: 클릭29·노출357·CTR8.1%·평균순위24.4·색인301. 이번 로그인 실측이나 최근28일 비교가 아니다. 기간/기기/국가별 비교는 권한 복구 후 시행한다.

GSC/네이버 후속: 기존 속성 소유권으로 로그인→기존 sitemap.xml 제출 상태 확인→변경 URL 최대5개 `/`, `/yeongnyangi/1000-won-fortune/`, `/tarot/reunion/`, `/insights/saju-how-to-read-step-by-step-beginner-guide/`, `/insights/ziwei-career-palace-action/` 검사. 운영 배포 후 수행하며 요청 성공과 실제 색인을 별도로 기록한다. Google 일반 운세 URL에 Indexing API를 사용하지 않는다.

## 핵심 가이드 3편

| 유지한 URL | 추가한 고유 내용 | 관련 무료 도구·상담 | 검수 상태 |
|---|---|---|---|
| /insights/saju-how-to-read-step-by-step-beginner-guide/ | 입력 5조건, 목의 과다/부족을 단정하지 않는 가상 사례, 실행 질문 | /saju/ → 천원 안내 #saju | 코드 편집 완료; 계산 엔진 재작성 없음 |
| /insights/tarot-reunion-reading/ | 기대와 관찰 구분, 컵6 가상 사례, 연락 경계 | /tarot/reunion/ → #tarot | 근거 없는 최다 요청 주장 삭제 |
| /insights/ziwei-career-palace-action/ | 역할·보상·시간·전환 위험 비교표, 가상 이직 사례 | /ziwei/chart/ → #ziwei | 출처 없는 고전 인용 삭제 |

## 키워드 후보 30개

검색량·CPC·난이도는 전부 **미확인**. GSC는 위 과거 기록이며 월간 검색량이 아니다. 후보는 기존 도구/콘텐츠와 검색 의도의 정합성으로 선정했다.

| 묶음 | 후보 5개 | 근거·기존 도착점 |
|---|---|---|
| 첫 구매 | 천원 운세, 천원 사주, 1000원 운세, 영냥이 사주, 사주 상담 예시 | 현행 카탈로그 시작 가격·예시 /yeongnyangi/1000-won-fortune/ |
| 무료 원국 | 무료 사주풀이, 만세력, 만세력 사주, 사주 보는 법, 태어난 시간 모를 때 사주 | GSC 사주/만세력 관련 행과 실제 계산 도구 /saju/·입문 가이드 |
| 관계 | 재회 타로, 연락운 타로, 사주 연애운, 사주 궁합, 반복되는 연애 패턴 | 재회 랜딩·궁합 도구·질문 가이드 reconnect/partner |
| 일·선택 | 이직운, 직장운, 사주 직업운, 자미두수 관록궁, 이직 전 확인할 것 | 기존 career 질문·관록궁 가이드; 사건 예측을 보장하지 않음 |
| 돈 | 사주 재물운, 재성 의미, 돈이 안 모이는 이유, 자미두수 재백궁, 사주 오행과 소비 습관 | 기존 십성/재백궁 해설·money 질문; 수익 보장 없음 |
| 전문 분야 | 숙요점, 숙요점 업태, 숙요점 영친, 숙요점 안괴, 자미두수 명반 | 과거 GSC 숙요점/업태/영친 관측·기존 /sukuyo/ /ziwei/ |

## 4주 편집 계획

기존 SEO 자동화의 주간 일정과 편집 큐를 사용한다. 새 대량 공개 스케줄러 없음. 새 콘텐츠 공개는 기존 승인 절차를 따른다.

| 기간 | 주제·대상 | 고유 근거 | 연결 | 검수 담당·상태 |
|---|---|---|---|---|
| 9/29~10/5 | 입문·재회·이직 가이드 3편, 첫 방문자 | 입력조건·가상사례·현실 비교표 | 위 3편의 도구/상담 | Codex 문체·링크 검수 완료, 운영 배포 대기 |
| 10/6~12 | 시간 미상/절기 경계 해설, 계산 결과가 다른 독자 | 기존 역법 회귀 케이스와 서비스 설정 대조 | /saju/·기존 결과 차이 가이드 | 콘텐츠 담당 검수 대기; 기존 글 보강 우선 |
| 10/13~19 | 숙요 거리와 안괴 오해, 관계 불안 독자 | 본명숙 배치 계산과 실제 관계 질문의 구분 | /sukuyo/·distance | 콘텐츠 담당 검수 대기; GSC 질문 우선 |
| 10/20~26 | 천원 상담 고르는 기준, 구매 고려 독자 | 서버 카탈로그·실제 챕터·익명 예시 | 천원 안내·상품별 예시 | Codex 정책 대조 후 사용자 콘텐츠 검수; 새 가격 없음 |

## Threads 실제 경로·다음 발행

- Worker: 기존 `SNS_THREADS_POST_ENABLED=split`, 사주08:30·자미12:00·베다16:00·수비학20:30 KST. 기존 매10분 cron과 60분 실행 창, 계정 codedestiny_official, 토큰, 키 `${date}:threads:${type}` 유지. 생성 대기 큐는 없고 슬롯에서 facts→1회 AI 문장→검수/결정론 대체→발행한다.
- 모델 경로: shared.js → callGeminiText → lib/llm-client.ts. 저장소 운영 vars의 SNS_THREADS_AI_ENABLED=1, GEMINI_MODEL=gemini-2.5-flash를 유지했다. 실제 모델은 기존 env 해석과 응답 aiModel 기록을 따른다. 이번 dry-run은 모델 호출0회이며 운영 모델 응답 품질을 검증한 것은 아니다.
- prompt version `growth-20260929-v1`. 실제 계산값만 사용, 허위30년 경력 제거, 상황별 첫 문장/행동, 날짜 공통 해설 표시. 최근 성공30개와 훅/3글자 조각 유사도 검사. 이는 의미를 완벽히 판별하는 AI 심사가 아니다. Codex 큐에서는 편집 검수를 추가한다.
- AI 필드 실패는 검수된 결정론 문장으로 대체. 중복은 추가 유료 호출 없이 대체1회; 그래도 중복이면 기존 잠금 기록에 reviewRequired+본문 격리. 기존 발행 창 마지막 틱에서 알림. 과거 공개 글 수정·삭제 없음.
- 발행 version/본문/근거/캠페인/게시ID/실패 container를 기존 IdempotencyKey에 기록. 해당 split endpoint만 보존35일로 늘려 최근30개와 14~30일 관찰 지원. 기존 다른 채널 TTL은 유지.
- Codex 자동화 `code-destiny-2027`: ACTIVE, **매일07:10·21:10 KST**, 기존 target chat/계정 보존. 새 큐는 `marketing/copy/threads-queue.json`, 기존 `threads-week01.md`도 동일 본문으로 갱신. **T01 공개 원문은 보존**, T02~T14 13개 ID/기존 슬롯명 보존. 2026-09-09 미게시 기록을 기초로 하므로 최신 공개 여부는 다음 정상 슬롯에서 로그/계정과 대조해야 한다.
- 코드 적용과 실제 운영 활성화는 별개다. Codex prompt 저장 결과·main CI·승격 SHA·다음 예약 시각은 최종 인수인계에 기록한다. Worker 새 코드는 운영 승격 전까지 기존 버전으로 실행된다. 즉시 시험 게시 없음.
- 기존 자동화의 하루 독립 원글3개 제한과 Worker4개 슬롯이 동시에 존재한다. 이 작업은 발행량을 임의로 늘리지 않는다. Codex는 실제 당일 게시 이력에 기존 제한을 적용하므로 21:10 실행이 발행 생략일 수 있다. 실행 시각 유지와 반드시 새 원글을 더 게시한다는 약속은 다르다.

실제 기존 글과 비교: `marketing/content-log.md`의 9/9 T01 공개 글(물 부족을 성격 결핍으로 단정하지 않는 설명)은 보존했다. `marketing/research/threads-observed.txt`의 9/1 임수 월간 원글은 장문·일간 호명·단어 나열이 관측됐다. 같은 원고를 줄여 재게시하지 않고, T02~T14는 특정 상황+확인할 행동+해당 고민 링크를 사용한다. `marketing/performance.md`의 9/9 관측 12개 원글 자료는 과거 기준선으로만 사용. 최근30개를 이번에 수집한 것으로 표시하지 않는다. AI 문체 때문에 팔로워가 적다는 인과 결론은 없다.

10개 생성 경로 비교: `marketing/research/threads-growth-dry-run-20260929.md`. 13개 검수 본문: `marketing/copy/threads-week01.md`. 새 유료 모델을 호출한 비교가 아니라 기존/신규 결정론 경로를 같은 입력으로 실행한 dry-run이다.

## 14일 SNS 편성

기존21:10 일반 콘텐츠 슬롯의 후보 순서이며 새 예약이 아니다. 이미 게시됐거나 당일 한도/월간 기존 일정과 충돌하면 다음 후보를 검수하고 발행량을 늘리지 않는다. Worker4종·07:10 일일운세·Instagram 사용자 업로드·11/1 신년 시작은 유지한다.

| 날짜 | 기존 ID·유형 | 주제 | 상태 |
|---|---|---|---|
| 9/29 | T02 전문성 | 해석 근거 | 검수 완료, 공개 중복 확인 대기 |
| 9/30 | T03 자기 확인 | 이직 보상/역할 | 동일 |
| 10/1 | T04 반전 | 시작과 마무리 | 동일 |
| 10/2 | T05 공감 | 수입과 불안 | 동일 |
| 10/3 | T06 반전 | 숙요 원거리 | 동일 |
| 10/4 | T07 자기 확인 | 연락의 간격 | 동일 |
| 10/5 | T08 체험 | 시간 미상 | 동일 |
| 10/6 | T09 반전 | 신강/신약 | 동일 |
| 10/7 | T10 캐릭터 | 선택을 돕는 가상 대화 | 동일 |
| 10/8 | T11 공감 | 안괴 불안 | 동일 |
| 10/9 | T12 체험 | 상담 예시 비교 | 동일 |
| 10/10 | T13 전문성 | 명반 읽는 순서 | 동일 |
| 10/11 | T14 자기 확인 | 사주/자미 체계 차이 | 동일 |
| 10/12 | 기존 슬롯 검토 | 24h/72h/7d 성과·새 근거 소재 선정 | 같은 글 재게시 금지, 초안 검수 후 기존 범위 실행 |

## 계측·비용 조회

- 기존 GA4 `page_view→question_select/free_guide_start→free_feature_start/free_result_view→view_item→purchase_attempt→purchase→fortune_result_view` 체계 재사용. 정확한 실제 이벤트 이름은 `docs/analytics-kpi.md`, `scripts/verify-analytics-events.mjs`를 정본으로 대조한다. 새 이름만 달고 이중 전송하지 않는다.
- `purchase`, `fortune_completed/first_open`은 **브라우저가 서버 응답을 관찰한 이벤트**다. 서버 사실은 `scripts/report-growth-metrics.mjs`: payment.paidAt/검증 status, request.completedAt 기준으로 별도 `payment_verified`, `report_ready` 집계. 같은 주문/결제 반복 입력을 중복 집계하지 않는다. Family 사용과 단건 결제는 분리한다.
- 새 주문은 동의한 Threads 공개 캠페인 ID만 주문의 별도 growthAttribution에 저장(불변 계산 snapshot은 유지). 질문·생년월일·결과·권리 토큰은 분석 메타데이터에 포함하지 않는다. 기기 구분은 클라이언트 관측이고 locale은 저장된 주문 값이다. 미동의·기존 주문은 unattributed이며 방문 전체 전환율로 확대 해석하지 않는다.
- 첫 유효 장 저장 시각 firstContentAt을 장 저장과 같은 쓰기에 기록. 결제 확인→첫 장/완성 p50·p95를 제공. 과거 시각 없음은 0초가 아니다. 첫 요청/읽기/결제 연결의 응답 시간은 `fortune_response_time`(operation, duration_ms, http_status)으로 계측한다. 요청ID·질문은 제외한다. GA4 사용자 측 지연 p50·p95와 서버 장 저장 지연을 별도로 보며 실기기 실측치는 아직 없다.
- 결과 공유는 기존 사용자가 고른 요약/미리보기/이미지와 공개 진입 링크를 유지. 원본 ID·질문·출생 정보 기본 제외. 다운로드·공유 버튼과 확인 가능한 완료를 구분하며, 강제 공유 조건을 추가하지 않았다.

읽기 전용 조회(환경의 기존 읽기 자격증명 필요):
```powershell
node scripts/report-growth-metrics.mjs --read-production --from 2026-09-01 --to 2026-09-30 --output build-cache/growth-live.json
node scripts/report-llm-token-usage.mjs <검토한로그파일> --prices <검토한모델단가JSON> --json
```
첫 명령은 aggregate/find만 쓰며 DB를 수정하지 않는다. 출력에는 주문ID·개인 본문이 없다. 원시 로그는 비공개로 보관한다. 기간 기준은 주문 생성 코호트이고 GA4 방문 기간과 일치 여부를 별도 확인한다.

`--costs <정산JSON>` 입력: grossReceiptsKRW, refundsKRW, taxKRW, pgFeesKRW, llmGenerationKRW, llmRetryKRW, notificationsKRW, variableInfraKRW, validVisitors, basis. 공헌이익=총 수취액−환불−세금−PG−생성−재시도−알림−변동 인프라. 세금 포함 수취액 기준으로 입력하고 세금 이중 차감 금지. 하나라도 비용 미확인이면 공헌이익 null. 기준 `settlement`만 정산 실적, 나머지는 가정/미검증. Family는 월 매출을 개별 상담 판매액으로 다시 더하지 않고 실제 이용량과 높은 사용량 시나리오를 별도 입력한다. 실제 PG 정산·모델별 로그·알림 청구를 확보하지 못했으므로 이번 실적 공헌이익은 미확인이다.

성과 피드백: 다음 기존 실행에서 공개 글의24h/72h/7d 지표와 UTM 방문·서버 수령·환불을 함께 기록한다. 필드가 없으면 null. 게시 경과시간/표본/기기/언어를 함께 비교한다. 처음28일은 한 번에 훅 한 요소만 판단하고, 적은 표본으로 자동 승자를 정하거나 발행량을 늘리지 않는다.

## 보존한 정책·외부 확인

가격·이용권·월정석·단건 결제·Family 권리·회원 기반 보관함·PG 계약·인증·금액 검증·계산 엔진·유료 생성 재시도 예산은 유지. 간편결제 브랜드나 무료 혜택을 새로 약속하지 않았다. 실제 생성 실패는 기존 lease/장 저장/재조정/운영 알림/정책상 환불 경로를 사용한다. 운영 주문을 임의 재생성·환불하지 않았다.

남은 외부 확인: 운영 승격 승인, 운영 DB 읽기 권한, 기존 Threads 로그인/토큰을 통한 최신 이력·다음 정상 게시 URL 확인, GSC/GA4/Naver 접근, 실제 PG sandbox 계약·실기기(네이티브 키보드/앱 전환)·실결제/실 LLM 별도 범위. PDF가 없는 경로에 PDF 발송을 지어내지 않았고, 기존 웹 보관함 열람은 모의 검증했다. 서버 완료와 실제 고객 열람, 구현과 운영 배포는 구분한다.
