# 질문 중심 전환 개선 · 2026-09-29

## 진단 근거와 범위
- 작업 기반: 3e94e08f062cb5cd6dd600295ff39b26b2368894. 다른 활성 세션과 분리한 관리 워크트리에서 작업한다.
- 공개 운영 홈 HTML 확인: 기존 7개 고민 뒤에 점술 선택이 다시 나타남. FortuneHome의 selectedConcern.ids → openService 호출과 일치.
- 실제 모바일 시각 확인: 아래 검증 절에 실행 결과를 기록한다. 공개 HTML 확인은 화면 캡처 검증이 아니다.
- GA4 기존 로그인 세션, FortuneDevelope 속성 526361229. 2026-09-01~09-28 보고서 UI: 활성 131, 신규 117, 전체 이벤트 13,229, page_view 5,091, session_start 581, home_section_click 865, free_saju_started 460, free_saju_completed 450, checkout_opened 169, checkout_option_click 204, view_item 158. 구매자 잠재고객 3. 보고서 시간대·내부 트래픽 제외 설정은 미확인.
- 무료 사주 이벤트 완료/시작은 450/460이나 동일 사용자의 연속 여정 검증은 아니다. 기능별 유료 클릭·결제 승인·전달률을 이 비율에서 추정하지 않는다.
- 2026-09-29T00:24:42Z 읽기 전용 운영 audit: paymentId 연결 요청 12, COMPLETED 7, REFUNDED 5, 24시간 이상 미완료 후보 0, GENERATION_REVIEW_REQUIRED 0. 전체 기간 현재 상태이며 승인 코호트/테스트 제외/PG 대조가 아니다. 7/12를 정상 전달률로 쓰지 않는다.
- 완료 생성 표본: 사주 고등어 n=3 p50/p90=92초, 베다 고등어 n=1 80초, 점성술 고등어 n=1 82초. 사주 참치 n=1 51,182초에는 과거 재시도 대기가 포함된다. 대표 생성 시간 보장으로 사용하지 않는다.
- 운영 쓰기·복구 실행·PG 호출·LLM 호출 없음.

## 사용자 흐름과 문구
| 위치 | 기존 진입/행동 | 변경 의도 |
|---|---|---|
| / 영냥이 | 지금 뭐가 궁금해? → 7개 분류 → 점술명 살펴보기 | 4개 우선 질문 → 무료 공개 해설 → 관련 상담 구성 |
| /ggulggul/ | 무료 타로·사주 상품 진입 | 4개 질문 링크 추가, 기존 액션/메뉴 유지 |
| 점술 SEO 허브 | 점술 설명·입력·관련 링크 | 해당 분야의 질문 해설로 이어지는 보조 출구 |
| /today/ | 날짜/프로필 계산 결과 | 기존 계산값 보존, 선택한 분야의 후속 질문 |
| 영냥이 무료 16종 | 출석·멸치·프로필 → 무료 결과 → 외부 AI 프롬프트 | 기존 권리와 결과 보존, 해당 분야 후속 질문 또는 무료 다이어리 |
| 상품 안내 6종 | 체계 설명 → 생선 등급 → 목차 → CTA | 상단 가격/분량/CTA, 적합·부적합 상황, 분석 내용 3개, 무료와 차이 |
| /yeongnyangi/fortune/ | 상담 종류·프로필·깊이 → 로그인/결제 | 선택 질문의 기존 상품/상담 종류 연결, 질문형만 기본 문구 입력 |
| 결제·결과·보관함 | 기존 결제·생성·복구·재열람 | 정책 유지, 기존 구매 확인 및 전달 안내 보강 |

## 정적 콘텐츠
lib/fortune/question-journey.ts의 6개 공개 해설. 개인화 계산 결과와 분리한다. 입력·로그인·API·LLM 비용 없음. 날짜별 예측이 아닌 상시 편집 콘텐츠로 날짜를 자동 갱신하지 않는다. 문구 변경 시 QUESTION_VERSION을 갱신하고 상품/상담종류 지원 검사를 실행한다. 기존 무료 생성 결과를 교체하거나 잠그지 않는다.

## 정책
가격/권한/이용권/월정석/단건 결제/인증/DB 스키마 불변. 질문 예시는 고정 ID만 URL에 전달한다. 개인 질문은 기존 입력/로그인 복귀 경로를 유지한다. 상품 간 권리를 통합하거나 소유를 추정하지 않는다. 내 상담 기록 링크에서 기존 구매를 확인한다.

## 최소 계측과 판정
- 기존 cdTrack 동의 체계 사용. question_topics_view → question_select → free_guide_start → free_guide_result_view → question_offer_view/click.
- 기존 무료 결과: free_feature_start/free_result_view와 free_question_view/click. 기존 view_item/purchase_attempt/purchase/fortune_result_view와 함께 본다. 새 노출은 IntersectionObserver로 실제 보이는 경우에만 기록한다.
- 공개 파라미터는 고정 topic_id/question_id/item_id/surface/content_type/content_version. 출생정보·질문/결과 원문·상담 ID를 넣지 않는다.
- 분모가 없는 지표 N/A. GA4는 동의/차단/태그 로딩에 따른 하한. 승인/저장 완료는 서버 원장이 기준.
- 28일 기준값에는 구버전 이벤트 부재 기간이 있으므로 동일 계측 버전 기간으로만 비교. 공개 후 데이터가 없으므로 효과는 미측정.
- 구매·전달 악화 또는 중복 과금/재열람 실패 시 해당 변경 공개 확대 중단, 변경 커밋만 revert. 자동 운영 승격 없음.

## 검증 및 다음 단계
### 변경과 문구 전후
- 질문 입구: “지금 뭐가 궁금해?” 분류/체계 선택 → “지금 마음에 걸리는 질문은?”과 구체적인 질문 4개, 더 찾아보기 2개.
- 무료 타로: 무관한 사주 일괄 제안 → “계속할까, 여기서 그만둘까?” 공개 해설. 기존 카드 3장의 답은 그대로 제공.
- 상품 상세: 아래쪽 가격/CTA → 상단에 정본 가격·챕터·상담 구성 버튼. 편집 예시는 가상임을 명시.
- 서비스 연결: 질문 상담/주제 탐색 역할 안내와 내 상담 기록 복구 링크.
- 공개 정적 해설 6개 + 동일 해설의 점술별 후속 연결 3개. 계산 결과별 신규 템플릿은 이번에 만들지 않았으며 기존 결정론적 무료 결과를 보존했다.

### 실제 검증
- check:fast 계획/실행: 최초 paid suite 85 pass / 3 fail. 실패 원인은 CRLF 기반 정적 마커 검사 2개와 node 테스트였다. LF 정규화 후 PortOne/사주 상세게이트 통과, 공식 guarded node 재실행 1868/1868 통과. Jest 316 suites /4575 통과. check:fast 전체 재실행은 하지 않음.
- tsc --noEmit 통과. sitemap drift 1300 URL 통과. sync:public 실행.
- verify-question-journey: 360/390/430/1280px 질문 4개 선택, 딥링크, 상품 CTA, 가로 넘침 없음, pageerror 없음. .tmp/question-journey/에 실제 브라우저 스크린샷/JSON.
- 390px 질문 화면과 360px 상품 화면을 이미지로 직접 확인. 긴 해설은 아래로 읽으며 하단 메뉴와 겹치지 않도록 기존 스크롤 영역 사용.
- verify-yeongnyangi-result-retry: 390/1280px 복구, 저장 챕터 보존, 중복 클릭 억제, 결제 직후 activate 일시 실패, 미결제 상태 통과. fixture에 누락된 resultPath/process.env만 보완. 실제 PG/LLM 호출 0.
- verify-yeongnyangi-free-ui: 360/390/430/768/1280px 출석·무료 열기·읽기, 중복 출석/실패/reduced motion/게스트 로그인 안내 통과. 모든 API mock, 실제 과금/DB 쓰기 0.
- legacy-home-target 3/3: 질문 링크 유지 및 결제 복귀 파라미터 보존.
- impeccable detect: 새 컴포넌트/CSS/상품 안내 findings 0.

### 확인 공백과 공개 조건
- verify-yeongnyangi-consultation-browser: 최초 숙요 전환 대기 timeout 이후 직접 진입에서 정상 DOM/pageerror 0 확인. 동일 시나리오 재실행 통과: 4 viewport 상담, 상품 제한, 준비 payload, 종격 질문, 보관함 오류 재시도/페이지네이션/중복 제거. 실제 OAuth/PG 복귀는 별도 미검증.
- 실기기 Safari/Chrome, 실제 PG 승인/유료 LLM/운영 저장·재열람, 새 이벤트 GA4 수집과 효과는 미검증. 운영 승격하지 않는다.
- 무료 전수 표는 등록부/메뉴/카테고리 인벤토리이며 각 기능의 모든 계산·결과 조합을 브라우저 완주했다는 뜻이 아니다. 미적용 기능은 기존 흐름을 유지한다.
- 시간형 기존 기능의 날짜/만료 전수 검증과 상품별 생성시간 SLO는 후속 검증. 생성시간을 임의로 약속하지 않는다.
- 결제·전달 악화를 판단할 수 있는 승인 코호트 지표 확보 전 전환 성공을 선언하지 않는다.

### 다음 작업자
1. question-journey-free-map.md의 미적용 기능별 실제 입력/결과를 순차 완주하고 계산 근거별 템플릿 필요 여부 결정.
2. 실제 OAuth 로그인·PG 복귀와 실기기 브라우저 검증은 별도 승인/계정 범위에서 진행. mock 성공을 실결제 성공으로 해석하지 않는다.
3. 동일 계측 버전의 KST 28일 코호트(시간대 확인 포함)로 선택·완주·상세·결제·정상 전달을 함께 비교.
4. 본 변경은 코드 전달이며 운영 공개 승인은 별도. 가격/권한/결제/생성/DB 계약은 그대로 유지.

## CI 후속 수정
첫 main CI에서 계측 표식 충돌 발견: 새 홈 nav의 concern_pick이 기존 홈 영역과 중복되고, 결과 페이지에 홈 전용 표식이 붙었다. 홈은 question_entry로 분리하고 결과는 기존 cross_sell_click의 saju_question 출처로 구분했다. 검사를 완화하지 않았다. 그 외 첫 CI 타입/린트·빌드·Critical checks 및 Paid Flow Gates 통과. 최종 CI 결과는 전달 메시지의 정확한 커밋/실행 링크를 기준으로 확인한다.

로컬 증거 사본: D:/Development/code-destiny/build-cache/question-journey. 질문/상품/꿀꿀/SEO/오늘 허브를 360/390/430/1280px에서 캡처. 꿀꿀은 초기 로딩이 끝난 뒤 재확인했다. SEO/오늘 캡처는 비로그인 화면이며 개인 결과 계산 E2E 증거가 아니다.
