# CRO 이벤트 계약 — 2026-11-03

상태: 로컬 구현 및 jsdom mock 검증. 운영 반영·GA4 수신·실제 성과 검증은 아직 하지 않았다. 기존 `js/core/analytics.js` 단일 설치와 `lib/analytics.ts` 래퍼를 유지한다. 아래 경로는 저장소 루트 기준이다.

## 이벤트와 보고서 매핑

| 이벤트 | 실제 호출부/판정 | 허용 내용 및 보고서 용도 | 분모·단일 발화 범위 |
|---|---|---|---|
| `page_view` | 최초 `gtag(config)`, 이후 `app/providers/NavigationProvider.tsx` | 경로·필터링한 공개 UTM. 방문 세션 보고서 기반 | 최초 config 1회. SPA는 경로 전환. page_view 건수를 방문자 수로 사용하지 않는다. |
| `ad_landing_view` | analytics 초기화, 명시적 네이버 CPC URL과 동의된 기존 paid attribution 일치 | `landing_path` 공개 경로 enum, `metric_version`, 기존 공개 캠페인 코드 | 문서 초기화당 1회. 저장된 캠페인만 있는 내부 이동은 제외. 동의한 명시적 광고 진입 문서 수이며 광고 클릭수·순방문자 수와 다르다. |
| `view_item` | `app/components/ProductJourneyLinks.tsx`의 `useProductView`, 영냥이 `Consultation.tsx` | 공개 상품 ID, 리스트 ID, intent; 영냥이는 기존 카탈로그 가격·이름 유지 | 상품 컴포넌트 생존 중 상품별 1회. 재방문은 다시 기록. 영냥이도 기존 useRef 가드 유지. |
| `select_item` | `js/core/home-service-finder.js`의 실제 결과 카드 클릭, `js/core/yehwa-home.mjs`의 홈 상품·무료 CTA 클릭 | 공개 `items[].item_id`, `item_list_id`, `intent_id`, `metric_version` | 클릭당 1회. 상품 선택 세션 / 해당 탐색 방문 세션. 노출되지 않은 목록을 분모로 삼지 않는다. 홈 목록 ID는 home이며 미지정 의도는 unknown. |
| `view_search_results` | 같은 검색기, 한글 조합 종료 후 debounce | `search_term`은 원문 대신 고정 intent 코드, `result_count`, 리스트·버전 | 변경된 비어 있지 않은 검색어의 결과 표시당 기록. 같은 입력 연속 렌더 제외. 검색 결과 있음 비율은 결과 수 > 0 이벤트 / 전체 검색 이벤트. |
| `search_result_select` | 검색어가 있는 결과 카드 클릭 | select_item과 같은 공개 값 | 검색 선택 세션 / 검색 결과 표시 세션. select_item과 합산하면 중복 행동이므로 별도 지표로만 사용. |
| `sign_up` | `app/components/auth/AuthShell.tsx`의 register/oauth-complete 성공 후 기존 `signup`을 전송 시 정규화 | `method: password | social`만 유지; 공통 공개 캠페인 귀속 가능 | 응답 성공 호출당 1회. 기존 `signup`도 함께 보내지 않는다. 로그인·가입 페이지 조회로 추정하지 않는다. |
| `free_saju_completed` | `js/saju-engine.js` 실제 사주 계산 완료 | 기존 `signed_in` boolean | 계산 완료 횟수. `free_saju_started`와 같은 경로만 분모로 사용. 전체 무료 서비스 완료율이 아니다. |
| `free_result_view` | 영냥이 `FreeFortune.tsx` 결과 Reading 렌더 | 공개 category/surface/kind/version | 무료 결과 열람이며 신규 생성 완료와 동일하지 않다. 다시 렌더될 수 있어 유일 결과 수로 해석하지 않는다. |
| `begin_checkout` | checkout_pg_opened 변환 또는 `PointsClient.tsx`의 PG 호출 직전 | KRW·공개 상품 ID; Points는 검증된 주문 금액 | 결제 시도. 진입 주소의 `from`(entry_webtoon·ggulggul_hero·fortune_bridge 중 하나)이 같은 세션에 남아 있고 분석 동의가 있으면 `from` 파라미터로 함께 보낸다(없으면 생략). 단건 공통 변환은 금액을 모르면 생략하며 코인 환산하지 않는다. 구매 전환율은 동일 세션 범위의 구매 / 결제 시작으로 산출. |
| `purchase` | `cdTrackConfirmedPurchase`, 성공 서버 영수증 + LIVE + 양수 금액 | 기존 transaction_id/value/KRW/items; 프로필·상담 내용 없음 | 동일 주문 메모리 + 동의 시 브라우저 localStorage 가드. 실패·TEST·0원 제외. 교차 기기·저장소 삭제의 정확히 1회 보장 아님. 매출은 서버/PG 대사 필요. |
| `fortune_result_view` | 영냥이 `Result.tsx` → trackFortuneView | 상품 ID, complete/partial, direct/library, browser_render | 문서 안에서 결과·완료 상태별 1회. GA 보고서에서 result_view 의미로 매핑하고 동일 별칭 이벤트를 추가하지 않는다. 꿀꿀의 모든 기존 결과 열람을 포괄하지 않는다. |
| `consultation_completed` | 기존 완료 판정 함수 및 영냥이 delivery | 공개 상품 ID·관측 종류·버전 | 서버 응답을 브라우저가 관측한 완료. 결과 열람과 구분한다. |
| `entry_webtoon_view` | `app/_entry/EntryTracker.tsx` (진입 웹툰 `/` 마운트) | 파라미터 없음. 진입 웹툰 노출 | 페이지 조회당 1회. 방문자 수가 아니라 웹툰 화면 열람 횟수. |
| `entry_webtoon_progress` | 같은 파일, 스크롤 위치 | `percent`: 25·50·75·100 중 하나 | 페이지 조회당 각 구간 1회. 100은 문서 끝까지 내려간 경우만. 위조 값은 `cdTrack`이 버린다. |
| `entry_webtoon_cta_click` | 같은 파일, 히어로·고정 바·초대 CTA와 건너뛰기 링크 클릭 | `concern`: 허용 고민 5개 id 또는 `none`, `position`: hero·sticky·invite·skip | 클릭당 1회. 이동은 막지 않는다. 노출 분모는 entry_webtoon_view. |
| `home_concern_select` | `app/_entry/ConcernPicker.tsx`(entry_webtoon), `js/core/yehwa-home.mjs`(ggulggul_home), `app/fortune/_components/ConcernBridge.tsx`(fortune_bridge) | `concern`: 허용 고민 5개 id, `surface`: entry_webtoon·ggulggul_home·fortune_bridge | 고민 칩 선택당 1회. 허용 목록 밖 고민은 발화하지 않는다. surface별로 나눠 본다. |
| `concern_answer_view` | `js/core/saju/concern-answer.js`의 `render` | `concern`: 허용 고민 5개 id 또는 `none`(일반 답) | 무료 만세력 결과에 고민 답을 그릴 때마다 1회. 결과를 다시 계산하면 다시 기록. |
| `concern_offer_view` | 같은 파일, 단건 제안 카드 렌더 | `feature_key`: 레지스트리 상품 키 | 카드가 실제 그려질 때만. 고민이 없거나 카드가 없으면 발화하지 않는다. |
| `concern_offer_click` | 같은 파일, 카드 링크 클릭 | `feature_key` | 클릭당 1회. 링크는 평범한 `<a>`이며 이동은 막지 않는다. 구매 전환이 아니다. |

`add_payment_info`는 검증 가능한 독립 결제정보 제출 단계가 확인되지 않아 새로 만들지 않았다. PG 창 열림을 해당 이벤트로 중복 집계하지 않는다.

## 신규 안전 인터페이스

`trackDiscovery(event, payload)` / `window.cdTrackDiscovery(event, payload)`는 네 탐색 이벤트만 받는다: `view_item`, `select_item`, `view_search_results`, `search_result_select`.

- `itemId`: 코드에서 가져온 공개 카탈로그 ID. 소문자 영문 시작, 영문·숫자·하이픈·밑줄, 최대 100자. 원문 사용자 입력을 이 필드로 전달하지 않는다.
- `itemListId`: home / discovery / search / related / landing.
- `intentId`: all / love / money / career / relationship / yearly / method / consultation / unknown. 알 수 없는 값은 unknown.
- `resultCount`: 0 이상 정수, 전송 상한 10000.
- `value`: 확인된 카탈로그 원화 금액, 0 이상 유한 숫자. 미확인 가격은 생략.
- 그 외 필드는 복사하지 않는다. 이메일·전화·생년월일·질문·검색 원문 필드는 API에 없다.

일반 UTM은 기존 공개 캠페인 코드 패턴만 page_location에 보존한다. Threads, growth, Kakao CRM, 이메일 뉴스레터, 공개 공유, 기존 네이버 캠페인은 유지한다. 신규 캠페인은 출시 전에 허용 코드와 테스트를 함께 등록한다. 임의 캠페인 문자열은 기록하지 않으며 광고별 보고서 공백을 실제 유입 0건으로 해석하지 않는다.

## 지표 정의와 운영 확인

- 상품 조회율: 상품 상세를 본 세션 / 해당 유입 세션. 탐색 select_item은 별도 클릭 지표다.
- 검색 선택률: search_result_select가 있는 검색 세션 / view_search_results가 있는 세션. 이벤트 수끼리 나누면 재검색·재클릭으로 왜곡될 수 있다.
- 첫 CTA 클릭률: 같은 공개 placement의 첫 클릭 세션 / 해당 CTA가 실제 노출된 세션. 전체 홈 방문을 CTA 노출로 대체하지 않는다. 아직 모든 CTA의 전용 노출 계측이 연결된 것은 아니다.
- 결제 시작률·구매 전환율: 동일 기간·채널·세션 귀속 조건으로 산출한다. 브라우저 관측 누락, 동의 거부, 페이지 조기 이탈을 명시한다.
- 방문자당 매출: 대사된 매출 / 같은 기간 유효 방문자. ROAS: 대사된 광고 귀속 매출 / 실제 광고비. 광고비 미연결 시 산출하지 않는다.
- 결제 실패율: 서버 또는 기존 결제 퍼널 실패 자료를 결제 시도와 대사한다. purchase가 없다는 이유만으로 실패로 판정하지 않는다.
- 기존 `signup` 과 신규 `sign_up`은 배포일을 경계로 보고서에서 같은 지표로 매핑한다. 동시에 합산 발화시키지 않는다. GA4 주요 이벤트 설정 변경은 이번 로컬 코드 작업에 포함되지 않는다.

## 개인정보 보호 범위와 남은 한계

신규 탐색 payload와 sign_up은 필드 허용 목록을 적용했다. UTM 원문 전송도 제한했다. 그러나 **레거시 `cdTrack` 전체에 전역 payload 허용 목록을 적용하지 않았다.** 결제 영수증·네이버 전환 ACK·과거 운영 대시보드 필드를 전수 확인하지 않은 일괄 차단은 결제 관측을 조용히 누락시킬 수 있기 때문이다. 따라서 이번 변경만으로 사이트 전체 PII 무전송을 인증하지 않는다.

남은 확인은 레거시 호출부별 허용 필드 목록, 동적 경로·page_path·referrer·page_title 및 GA4 자동 수집 설정, Google/Naver 계정 간 중복 태그, 로그인·재진입·교차 기기 수신 대사다. 브라우저별 저장소 중복 방지는 서버 차원의 멱등성과 구분한다. 운영 대시보드·광고 계정 설정과 실제 성과 수치는 접근 가능한 실측 자료가 없으면 미검증으로 남긴다.

## 검증

- `node scripts/verify-analytics-events.mjs`: 통과. jsdom이며 외부 GA/광고 요청 없음.
- 신규 검사: 민감 UTM 폐기, 기존 공개 캠페인 보존, 원문 검색·상담·생년월일 추가 필드 폐기, 상품 가격 0원/양수, 잘못된 탐색 이벤트 거부, signup 정규화, 광고 URL 진입 1회·동의 거부·내부 귀속 재방문 제외, LIVE 성공 구매 반복 1회 및 실패/TEST/0원 제외.
- 실제 GA4 DebugView·광고 계정 수신·ROAS·전환율 변화는 미검증. `check:fast`와 변경 기반 통합 검증은 부모 작업에서 수행한다.
