---
status: awaiting_verification_and_approval
updated: 2026-10-28
budget_total_krw: 100000
approved_spend_krw: 0
production_deployed: false
---
# 영냥이 10만원 유료 구매 전환 프로젝트

> 이전 세션 실행 기록입니다. 이후 사용자 지시로 사이트 전체 홍보 및 VAT 포함 5만원 승인으로 변경되었습니다. 최신 범위·예산·차단 항목은 [5만원 실행 기록](ggulggul-brand-50k-20261028.md)과 brand-50k-config.json을 따릅니다. 아래 검사·광고 계정 관측값을 현재 상태로 간주하지 않습니다.

## 실제 실행 기록
- 기준 소스: origin/main 3e7e97929698b9f3a5eb2bf715339ac9f906dbd3. 다른 세션의 결제 복원 작업과 분리한 wt/yeongnyangi-paid-marketing-20261028에서 작업.
- 운영 /yeongnyangi/와 공개 products API를 직접 확인. 고등어 6체계 모두 5,000원, available=true, KRW. API의 기본 manifest chapterCount=5와 신규 한국어 질문 상담의 확장 8챕터는 다른 계약이다. 광고는 후자만 안내한다.
- 신규 한국어 질문 상담은 consultation-expansion.ts의 EXPANDED_CHAPTERS.mackerel=8을 재사용. 추가 질문 0회. 결과는 /yeongnyangi/library/에서 재열람하는 기존 구조 유지.
- 운영 사이트는 비로그인 상태 확인. 실제 PG 승인→상담 생성→보관함 재열람은 미검증. 개발 검사는 모두 network guard를 이용한 mock이며 실제 과금·지급·환불·운영 DB 쓰기 0건.
- 복원/구매 계측 node 검사 36건, 결제 의도·복원 worker 검사 49건 통과. 추적 보완 후 동의·구매·출처·지표 검사 25건 통과. typecheck와 verify:analytics-events 통과. 전체 check:fast는 verify:sitemap-drift에서 차단됐다. 사이트맵은 수정하지 않았다. 기존 base의 메타데이터/lastmod 차이인지 최종 전달 전에 별도 확인해야 한다.
- lint-changed와 전체 lint는 check:fast에서 오류 없이 다음 단계로 진행. Impeccable detector 대상 2파일 결과 [].
- 운영 390px 폭에서 가로 넘침 없음, 기존 주 CTA 높이 52px. 데스크톱 한 번의 관측 TTFB 269ms, DOMContentLoaded 1,209ms, load 2,124ms. 실사용자 CWV나 모바일 LCP가 아니다.
- 로컬 Next 미리보기는 C드라이브 ENOSPC와 남은 3118 포트 충돌로 실패했다. 자기 .next만 정리. 이후 전체 Next 경로 대신 실제 Hero·Guide 컴포넌트와 원래 스타일을 사용한 격리 미리보기로 360/390/430/1440px 검수 완료. 가로 넘침·런타임 오류 없음, CTA 52px. 전체 로그인·결제 라우트 검증과 구분한다.

## 원문·경력·적중 사례의 근거
- 기존 경력 정본: lib/brand/founder.ts. 운영자 제공 10년 경력 소개이며, AI 결과 전부를 사람이 직접 작성·검토한다는 의미가 아니다.
- 직접 열람: [2024-05-12 블로그 원문](https://blog.naver.com/neosaju/223444062729). 표시 날짜는 2024.5.12 11:26. 제목은 대통령 탄핵 가능성, 본문은 2025년 운의 하락·송사 흐름을 언급한다.
- 실제 결과: [헌법재판소 2024헌나8](https://www.ccourt.go.kr/site/kor/ex/bbs/View.do?bcIdx=4253958&cbIdx=1106)의 2025-04-04 파면 결정.
- [사이트 공개 대조](https://code-destiny.com/insights/presidential-saju-public-records/)는 2022-09-16, 2024-05-12, 2024-05-27 원문과 실제 사건을 구분해 소개한다.
- 사용자 요청에 따라 해당 사례를 핵심 후킹으로 강조한다. 사건 전 독립 보존본·원문 수정 이력은 이번 작업에서 확보하지 못했다. 원문 전체의 모든 주장, 정확한 일자·원인까지 적중했다거나 전수 적중률 100%라고 확대하지 않는다.
- 네오와 영냥이는 동일 인물. 인간→고양이 변신·천기의 벌은 창작. 사자 네오를 소재에 추가하지 않는다.

## 매체 비교와 1차 선택
| 매체 | 확인한 조건 | 구매 의도·추적 | 이번 판단 |
|---|---|---|---|
| 네이버 파워링크 | 실제 계정 접속, 최소 입찰 70원 VAT별도, 하루예산 최소 50원/10원 단위. 채널·키워드·소재 심사 필요 | 검색어 기반. 전환 추적 별도 신청 필요 | 1순위, OFF 상태 등록. 70원에서 플랫폼 월예상 클릭 0~0으로 표시되어 경제성 검증 전 |
| Google 검색 | [허위표현 금지](https://support.google.com/adspolicy/answer/6020955?hl=en), [개인화 제한](https://support.google.com/adspolicy/answer/143465?hl=en). 이별·경제적 곤란 등 민감 상태 기반 리마케팅 제한 검토 | 검색 의도 높음. GA4 연결 가능하나 로그인 확인 전 | 예비 대안, 현 CPC·경쟁도·과금계정 미확인 |
| Meta Instagram/Facebook | 계정 로그인 화면. 공식 정책 페이지 직접 열람 실패, 운세 업종 허용·최소예산을 확정하지 않음 | 소재 반응은 볼 수 있으나 초기 구매 데이터 없이 CAC 불확실 | 초기 10만원 배분 0원 |
| YouTube | Google 광고 정책 적용. [Demand Gen 가이드](https://support.google.com/google-ads/answer/15110871?hl=en)는 전환 학습에 충분한 예산·기간을 권장 | 영상 시청과 구매를 구분해야 함. 실제 CPC·CVR 없음 | 유기적 콘텐츠 제작만, 초기 광고비 0원 |

- [네이버 운세 광고 가이드](https://ads.naver.com/adguide/1648)는 웹 기반 운세의 조건부 허용·과장·공포·신비 능력 주장 제한을 제시한다. 열람된 페이지는 디스플레이 집행 기준이므로 검색광고의 최종 허용 근거를 이것만으로 확정하지 않는다. 실제 파워링크 심사가 최종 확인이다.
- [네이버 예산 안내](https://ads.naver.com/help/faq/1164)는 예산 반영 지연 가능성을 안내한다. 실제 생성 화면에도 초과 과금 가능성이 표시됐다.
- [Google 지출 한도](https://support.google.com/google-ads/answer/10486637?hl=en)는 대부분의 캠페인 하루 지출이 평균예산의 2배까지 가능하다고 안내한다. 하루예산만으로 총액 10만원을 보장하지 않는다.
- 실제 키워드 경쟁도·제시 CPC는 아직 미확인. 계정의 70원 월클릭 추정 0은 관측값이고, 실제 CPC 70원이나 성과 0건을 뜻하지 않는다. 자동으로 상위노출 입찰가까지 올리지 않는다.

## 네이버 실제 저장 상태
- 광고 계정 2614862, 코드데스티니. 잔액 0원. 자동충전 화면은 비활성으로 표시. 결제수단 등록·충전·쿠폰 신청 없음.
- 캠페인 cmp-a001-01-000000011262693, 파워링크#1영냥이_고등어_구매검증_승인대기. OFF, 하루예산 5,000원, 균등배분.
- 광고그룹 grp-a001-01-000000075480054. OFF, 기본 입찰가 70원 VAT별도, 하루예산 5,000원.
- 수동입찰·일치 검색. 검색 파트너 및 추천/콘텐츠 지면 제외. PC/모바일 기본 가중치 100%, 소재 동일비중.
- 비즈채널 https://code-destiny.com/yeongnyangi/ 등록, 검토중. 화면은 영업일 1~2일과 잔액 부족 시 심사 미진행을 안내한다. 승인으로 보고하지 않는다.
- 키워드 10개 저장. 제외어 14개를 확장·일치유사 각각 등록. 저장 목록의 일치유사 제외어 10개와 페이지 3개를 확인했다. 나머지 상세 목록은 활성화 전 재확인한다.
- 단일형 소재 A~E 5개와 각각의 utm_content 저장. 모든 소재가 검토중임을 화면에서 확인했다.
- 실제 등록 JSON과 광고별 URL은 yeongnyangi-paid-100k-20261028.json에 기록.
- 계정의 광고 등록은 노출 승인이 아니다. 캠페인·그룹 OFF를 유지한다.

## 추적 감사와 수정
| 항목 | 관측·구현 | 아직 필요한 검증 |
|---|---|---|
| GA4 초기화/page_view | G-FMHV4ZHY3G 태그 1개, 공통 analytics.js 재사용, 최초 config 단일 경로 | GA4 관리 화면 수신·키 이벤트 설정 |
| view_item | Consultation.tsx 기존 실제 카탈로그 이벤트 | 운영 유입 표본 확인 |
| begin_checkout | 기존 CheckoutClient의 단건 선택 시 카탈로그 금액으로 추가. 이미 구매한 결과 복귀는 제외 | 실제 모바일 PG 복귀에서 확인 |
| purchase | 기존 서버 confirm 성공 응답 기준, merchantUid를 transaction_id로 중복 방지. 양수 금액만 집계 | 실제 PortOne 서버 원장과 대조 |
| consultation_completed | 기존 completed paid 응답 관측 경로에 표준 이벤트 추가, 기존 fortune_completed/first_open 보존 | 백그라운드 생성 완료가 브라우저 미열람이면 누락될 수 있음 |
| refund | 기존 처리 로직·정책 유지 | GA4 서버 검증 환불 이벤트 미연결. 순매출 대조 전 광고 활성화 금지 |
| 캠페인 보존 | 동의받은 30분 same-tab sessionStorage, 공개 캠페인·A~E·K01~K10만 허용, 기존 요청 metadata 재사용 | 외부 앱/새 브라우저 탭/30분 초과는 미지원. 네이버 동적 키워드 URL 설정 필요 |
| 개인정보 | 질문·생년월일·결과·프로필 ID를 이번 이벤트에 넣지 않음. 동의 철회 시 출처 삭제 | 기존 개인정보·광고 동의 정책과 네이버 설치 방식 대조 |
| 테스트·무료/월정석/이용권 | 양수 서버 결제 없는 접근은 새 매출 제외, 비운영 origin에서 운영 GA 속성 차단 | 운영 테스트 주문 표식과 환불 원장을 정산 자료로 제외하는 검증 필요 |

- UTM: utm_source=naver, utm_medium=cpc, utm_campaign=paid_20261028_naver, utm_content=A_ko~E_ko.
- utm_term=K01~K10은 공개 키워드 코드만 허용한다. 광고소재 URL에는 utm_content까지 설정했으며 키워드별 URL 병합은 미완료다. 실제 검색어 원문을 무차별 전송하지 않는다.
- Google Ads AW 태그·네이버 WCS·Meta Pixel은 이번 공개 페이지의 script 목록에서 관측되지 않았다. 전체 계정 설정 부재로 일반화하지 않는다.
- GA4 관리 접근은 로그인 화면이었으며, 실제 DebugView/실시간 수신은 미확인.
- 기존 scripts/report-growth-metrics.mjs는 읽기 전용 정산 보조 경로지만 실제 광고용 순매출·테스트 주문 분리·소재별 수익성 대조 전 사용을 확정하지 않는다. 임의 데이터를 실적으로 제시하지 않는다.

## 예산과 손익 기준
- 총청구 상한 100,000원(VAT 포함). 1차 60,000원, 2차 30,000원, 예비 10,000원. 아직 승인된 지출 0원.
- 하루 5,000원 UI 설정은 총청구 한도가 아니다. 충전 전 VAT 차감 방식·자동충전·다른 캠페인·잔액 초과 및 미청구 비용 확인 필요.
- 캠페인 OFF 상태에서 심사에 필요한 최소 충전액을 실제 결제 화면으로 확인하고, 청구 총액을 사용자에게 제시한 뒤 승인받는다. 60,000원을 무조건 충전하지 않는다.
- 순매출 ROAS = (실제 양수 유료 결제 합계 - 실제 환불액) / VAT 포함 광고비. 사업상 세전매출·기여이익은 별도 표기.
- CAC = VAT 포함 광고비 / 캠페인의 실제 신규 유료 구매 고객 수. 재구매 건수로 신규고객 CAC를 낮춰 보이지 않는다.
- 구매 CVR = 실제 유료 구매 세션 / 유효 방문 세션. 방문자 기준 수치는 분모를 별도로 명시.
- 가정 예시: 5,000원 상품·CPC 100원(VAT별도)이면 110원/클릭. CVR 2%에서 CAC 5,500원이라 PG·생성비 전에도 불리하다. CVR 5%면 CAC 2,200원. 실제 성과 예측이 아니다.
- 광고비만 회수하려면 1차 60,000원에 환불 없는 5,000원 구매 12건이 필요하다. PG·LLM·환불·세금 포함 손익분기점은 더 높다.
- 1차 예산이 남아도 결제 오류·추적 오류·사용자 승인 입찰 한도 초과 시 중지. 누적 10,000원마다 점검, 무구매 누적 20,000원이면 확장을 멈추고 랜딩/검색어를 진단하는 운영 제안. 이 수치는 성과 데이터가 아니다.
- 2차·예비비는 추가 판단·승인 후. 구매가 적으면 불확실로 보고하고 1~2건만으로 증액하지 않는다.

## PHASE별 상태
| PHASE | 실제 완료 | 차단·남은 일 |
|---|---|---|
| 1 | 저장소/운영/상품/API/복원 mock 점검 | 실제 결제→생성→보관함 E2E, 최신 복원 배포 상태 |
| 2 | 공식 자료 조사·네이버 실제 운영 조건 확인·1매체 준비 | 검색 업종 심사, 키워드 CPC/경쟁도, Meta 정책 확인 |
| 3 | 기존 랜딩 첫 CTA/전문가·사례 링크/가격표 등급 보존 수정 | 격리 컴포넌트 시각 검증 완료, 필수 게이트·배포 남음 |
| 4 | 기존 구매 중복방지 재사용·캠페인 보존·결제시작/상담완료 추가·25건 mock 통과 | refund·네이버 전환 연결·실결제 정산 대조·GA4 수신 |
| 5 | 5종 카피, 4:5/9:16 실제 래스터 광고 이미지 2종 | 이미지 지면별 규격 재편집·승인 |
| 6 | 기존 계정/캠페인/그룹/채널/10키워드/5소재 저장 | 지역·일정 최종 설정, 청구 방식, 전환 신청 |
| 7 | 미집행 | 모든 검증·심사·사용자 집행 승인 이후만 활성화 |
| 8 | 실제 청구 0원, 성과는 미측정 | 활성화 후 7~10일 또는 중단조건 도달 시 실제 보고 |
| 9 | 캐릭터 기준·실제 광고 원화 2종 | 3화×3길이 콘티·SRT 9개·재생형 HTML·15초 WebM 초안 제작 완료. 내레이션·최종 편집·공개는 별도 |

## 유지한 영역과 검증 명령
- 상품 가격 정본, 이용권/월정석/단건 정책, PortOne 승인·지급·환불 로직, 인증, DB 스키마, 라우팅 계약 유지.
- checkout 파일 수정은 기존 클릭 경로의 계측 호출만 추가했다. 새 결제 API나 DB 쓰기 경로는 없다.
- npm run check:fast -- --plan → critical 판정.
- npm run check:fast → 기존 verify:sitemap-drift 실패, 이후 검사는 수행됐다고 보고하지 않음.
- npm run typecheck → exit 0.
- node --require ./scripts/lib/mock-network-guard.cjs scripts/verify-analytics-events.mjs → exit 0.
- node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/purchase-analytics.test.mjs __tests__/ui/analytics-consent.test.mjs __tests__/ui/growth-metrics.test.mjs → 25/25.
- node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/purchase-analytics.test.mjs __tests__/ui/yeongnyangi-paid-recovery-contract.test.mjs __tests__/ui/yeongnyangi-stored-recovery.test.mjs → 변경 전 36/36.
- node scripts/run-mock-tests.mjs jest __tests__/worker/yeongnyangi-payment-intent.test.js __tests__/worker/yeongnyangi-recovery.test.js --runInBand → 49/49.
- git diff --check → exit 0. 코드 배포·main 머지·원격 push는 미수행.
- 환경 확인 실수로 토큰이 도구 출력에 노출됨. 값을 문서/소재/커밋에 저장하지 않았음. 해당 토큰 폐기·재발급 필요.


## 마지막 실행 기록

- 네이버 전환 추적 관리에서 무료 신청 시도 → **신청 가능한 사이트가 없습니다**. 현재 채널 검토중이므로 전환 연결 완료로 보고하지 않는다.
- 키워드 도구의 직접 관측: 온라인사주상담 PC <10/모바일 10, 경쟁 높음; AI사주상담·사주상담가격 PC/모바일 각각 <10, 높음; 연애사주상담·이직사주상담 각각 <10, 낮음. 이 수치는 시장의 검색량이며 본 캠페인의 방문·구매 실적이 아니다.
- 비교 검색어: 인터넷사주 PC 4,250/모바일 33,200, 사주풀이 2,150/7,660, 사주잘보는곳 670/3,360, 온라인사주 410/1,030, 사주상담 700/500. 모두 경쟁 높음, 월평균 노출 광고수 10. 구매 의도가 섞인 넓은 키워드는 실제 CPC/전환 검증 없이 추가 집행하지 않는다.
- 조회용 300원 입찰 시나리오에서는 온라인사주·인터넷사주·사주잘보는곳의 예상 클릭이 0, 사주풀이는 월 1클릭·예상평균CPC 300원(VAT별도)으로 표시. 조회 목록에 입력 구분자 누락으로 합쳐진 1개 키워드가 있었으며 그 행은 분석에서 제외했다. 실제 캠페인 입찰가는 70원 그대로이며 조회만 했다.
- 300원 CPC를 실제 쓴다는 가정이면 VAT 포함 330원이며, 5,000원 상품에서 광고비만 회수하는 CVR은 6.6%다. PG·LLM 비용 전의 가정이며 검증된 성과가 아니다. 현재 CPC·충분한 볼륨·수익성 근거가 부족하므로 충전·활성화를 보류한다.
- 사용자 추가 지시: 이미지에서 AI 표기와 하단 창작·신규 한국어 기준 문구 제거. 수정본 creative/mackerel-story-9x16-v2.png의 카피는 두 대통령의 운세를 / 적중한 영냥이, / 이제 고등어를 팝니다. 원본 v1을 보존했다. 이 이미지 수정이 서비스의 AI 고지·가격·정책을 변경하는 것은 아니다. 새 이미지를 공개 게시하거나 광고에 집행하지 않았다.
- 산출물: 4:5 원화, 9:16 원화 v1/v2, 문구 5종, 캠페인 JSON, 키워드/제외어, 3화×3길이 콘티·자막, 재생형 HTML, 15초 WebM.

## 수정 파일·의도

- app/yeongnyangi/_components/NightHero.tsx: 고등어 상담으로 바로 진입, 기존 가격/챕터 정본·전문가 소개·공개 분석 기록 연결.
- app/yeongnyangi/_components/YeongnyangiGuide.tsx: 생선 가격표 클릭 시 선택 등급 보존.
- app/checkout/CheckoutClient.tsx: 기존 단건 선택 경로에 begin_checkout만 추가.
- js/core/analytics.js와 public/js/core/analytics.js: 동의받은 광고 출처 보존, 상담 완료 이벤트.
- lib/analytics.ts와 lib/marketing/growth-attribution.mjs: 기존 타입·서버 허용 목록 확장.
- app/layout.js: 변경한 공통 추적 스크립트 버전 갱신.
- __tests__/ui/purchase-analytics.test.mjs: 로그인/PG 복귀·임의값 배제·동의철회·상담완료 회귀.
- docs/marketing/yeongnyangi-paid-100k-20261028.md/.json, yeongnyangi-youtube-20261028.md, yeongnyangi-paid-20261028/: 실행 기록·계정 설정·실측·이미지·영상 인계.

- 추가 공식 검사: verify:payment-freeze, verify:checkout-pass-card, verify:portone-single-payment 모두 exit 0. 포트원 모의 회귀 중 미연결 failure-log 모델의 10초 buffering timeout 경고 2건이 있었으나 검사는 PASS. 실제 결제 승인이나 운영 DB 기록 성공을 뜻하지 않는다.
- UI 검수 캡처와 영상: yeongnyangi-paid-20261028/qa/verification.json, yeongnyangi-ep1-15s.webm. 전체 Next 앱 빌드가 아니라 기존 스타일을 포함한 실제 랜딩 컴포넌트의 격리 렌더다.
