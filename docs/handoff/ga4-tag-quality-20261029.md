---
status: active
updated: 2026-10-29
next: 기존 main CI 모바일 타로 실패 해소 후 검증한 계측 수정을 전달한다. 운영 승격 승인·자연 주문 대사·GA 재평가·네이버 심사는 별도 대기. 광고 OFF 유지.
---

# GA4 태그 품질 개선 후속 작업

## 2026-10-29 후속 조사 — 경고 해결 완료 아님

- 기존 폴더를 인수해 사용했다. 새 브랜치·PR·워크트리는 만들지 않았다. 공유 main의 다른 세션 변경과 기존 untracked 이미지 2개를 보존했다.
- GA 진단을 새 연결에서 다시 확인했다. 남은 항목은 1개, 거래 ID는 기존 2개, 이벤트는 purchase, 영향 페이지는 `/records/`다. 진단 표에는 발생 시각·client ID·기기 정보가 없어 과거 고객 2건의 구체적인 재전송 원인은 확정하지 못했다.
- 22:45 KST 읽기 전용 DB 확인: 10/29 00:00 이후 paidAt 신규 주문 0건. 경고 주문 2건 모두 `metadata.ga4PurchaseContext`가 없어 당시 동의·GA 식별자 상태를 역추적할 수 없다. 주문번호·고객정보·비밀값은 이 문서에 저장하지 않았다. DB 쓰기·PG 재결제·과거 purchase 재전송 없음.
- Google 공식 진단 설명은 동일 transaction ID가 서로 다른 사용자 식별자에 재사용될 때 경고한다고 명시한다. 거래번호 형식 변경으로 우회하지 않는다: https://support.google.com/analytics/answer/16729583?hl=en / https://support.google.com/analytics/answer/12313109?hl=en

### 재현한 결함과 최소 수정

1. 구매를 동의 전 메모리에서 관측 → 같은 문서에서 분석 동의 → 새 문서에서 구매 복구 순서에서 중복 방지 표식이 저장되지 않아 purchase가 다시 큐에 들어갔다. 모의 회귀 검사로 수정 전 `1 !== 0` 실패 확인. `cdSyncConsent`에서 **이미 관측한 purchase/grant 표식만 동의 후 저장**하도록 수정했다. 이벤트를 재전송하거나 동의 전 저장하지 않는다.
2. `/records/` 최초 진입 후 SPA로 `/points/` 이동한 구매 이벤트에는 자체 `page_location`이 없었다. 초기 config 주소를 상속할 가능성을 없애도록 구매 이벤트에 현재 정제 주소를 명시했다. 토큰·paymentId·hash는 제거하며 기존 UTM 규칙을 유지한다. 이는 주소 귀속 개선이며 중복 자체를 해결하는 장치는 아니다.
3. 다른 기기·저장소 삭제·계속 동의 거부 상태의 문서 간 복구는 기존 브라우저 중복 방지만으로 전역 차단되지 않는다. 이를 해결했다고 주장하지 않는다. 원인 증거 없이 새 서버 구매 전송 시스템이나 무동의 식별자 저장을 추가하지 않았다.
4. 전 이벤트 공통 주소 삽입 시도는 기존 `cross_sell_click` 매개변수 검증과 충돌했다. 그 변경은 되돌리고 구매 이벤트만 수정했다. 기존 검증 계약을 약화하지 않았다.

수정 정본은 `js/core/analytics.js`, 회귀 검사는 `__tests__/ui/purchase-analytics.test.mjs`다. `npm run sync:public`으로 public 미러와 HTML 캐시 참조를 생성했다. 결제·인증·API·DB·가격·이용권 정책 변경 없음. 공개 SEO 본문·title·canonical·robots·sitemap 변경 없음(HTML 변경은 생성된 자산 버전 참조만).

### 전달 차단과 검증

- 인계된 main `8f32da62caf4a921f23ebcc54eba4db83631e875`의 [공식 CI](https://github.com/rei1237/codedestiny/actions/runs/40877905858)는 failure다. `verify:mobile-journeys`의 430px 뒤로가기에서 `tarotModalOverlay`와 `overflow:hidden`이 남아 5초 제한을 초과했다. 이번 계측 수정 전부터 실패했고 이 작업에서 관련 UI는 수정하지 않았다.
- 저장소 전달 규칙에 따라 빨간 main 위로 새 push를 쌓지 않는다. 검증 가능한 수정은 로컬 커밋으로 보존하고, 미전달 작업이 있으므로 이 워크트리와 활성 인계 문서를 유지한다.
- 재현 검사: 수정 전 신규 2개 실패 확인. 최종 코드의 결제/동의/환불/PG 대사 무과금 모의 검사 49/49 통과. 구매 전용 주소로 범위를 줄인 뒤 `verify:analytics-events` 통과. `sync:public` 통과.
- `check:fast -- --plan` 실행, `check:fast`는 lint/typecheck/sitemap 통과 뒤 `test:node`에서 실패했다. Windows 임시 checkpoint rename EPERM 및 로컬 천문 데이터 로딩 오류 등이 출력되었다. 해당 두 테스트 파일만 권한이 허용된 실행 환경에서 mock 네트워크 차단을 유지해 재확인한 결과 7/7 통과. 전체 `check:fast` 성공으로 확대 해석하지 않으며, 중단 이후 검사 항목은 이 실행에서 미실행이다.

### 네이버 광고 활성화 전 상태

- 캠페인 `꿀꿀운세_사이트홍보_5만원` OFF, A/B 그룹 모두 OFF. 소재 자체는 각각 ON 준비 상태지만 상위 OFF이므로 활성화하지 않았다.
- 비즈채널 및 A/B 소재 모두 검토중. 비즈채널 원본 목록에서 `꿀꿀운세_A`의 PC·모바일 모두 검토중, 전환 추적 관리 사용 안 함 확인. B 소재 상태 안내는 비즈채널 검토중/노출제한 동안 소재 심사가 진행되지 않는다고 명시한다. 현재 확인한 화면에는 반려 사유나 구체적 보완 요청이 없다.
- 잔액 50,000원, 캠페인 일예산 2,700원(균등노출), 그룹 기본입찰 100원, 기간 10/29~11/07 유지. 부가세 포함 총 50,000원 사용자 상한 유지. 추가 충전·기간 연장·광고 ON 없음. 일예산은 엄밀한 총청구 한도의 증거가 아니므로 승인 직전 누적 비용과 잔액을 다시 확인한다.
- A/B 연결 URL의 `paid_20261028_brand`, `utm_source=naver`, `utm_medium=cpc`, `utm_content=A_ko/B_ko` 확인. 소재를 다시 등록해 심사를 초기화하지 않았다.
- 남은 순서: 기존 CI 실패 해소 → 로컬 수정 main 전달/공식 CI → 변경 범위 설명 후 운영 승격 승인 → 자연 신규 주문과 GA 대사/경고 재평가 → 비즈채널·소재 심사 통과 및 네이버 전환 신청 재확인 → 최종 예산 확인 → **사용자의 별도 광고 ON 승인**. 아직 ON만 하면 되는 완료 상태가 아니다.

## 사용자 요청과 제한
- 사용자는 긴 대화 대신 새 채팅에서 GA4 태그 품질 긴급 상태의 원인을 규명하고 품질을 개선하기를 요청했다.
- 추가 결제 없이 가능한 검증을 완료한다. 실결제·실환불·유료 LLM·운영 결제 DB 쓰기는 하지 않는다. 과거 주문을 신규 purchase로 재전송하거나 경고를 숨기려고 거래번호를 바꾸지 않는다.
- 네이버 광고는 아직 켜지 않는다. 부가세 포함 총 예산 50,000원. 사이트 테스트 결제는 네이버 광고의 필수 요건이 아니다. 실제 전환 검증 전 OFF라는 사용자 조건을 임의 완화하지 않는다.
- 이전 운영 배포/GA 설정은 승인받아 이미 적용되었다. 새 코드의 운영 배포는 변경 범위를 설명하고 별도 승인받는다. 기존 비밀값은 채팅/로그/저장소에 노출하지 않는다.

## 작업 위치·전달
- 이 작업은 공유 main의 다른 세션 변경을 보호하기 위해 기존 작업 폴더를 사용한다: D:\Development\code-destiny\.codex-worktrees\paid-media-webtoon-20261028-215429
- 브랜치: wt/paid-media-webtoon-20261028-215429. 후속 작업에서 이 폴더를 이어 쓰고 기존 변경을 보존한다. 공유 main에는 다른 세션의 world/SEO/CSS 변경이 있으므로 reset/stash/강제 checkout 금지.
- 문서 작성 직전 마지막 커밋: 536d9db4b038c9ca4e8266f3a7605b31490773bd. 이 인계 문서 커밋은 git log -1로 확인한다.
- 기존 untracked 증거 2개(ga4-consent-confirmation-20261029.png, naver-conversion-blocked-20261029.png)는 이번 전달에 섞지 않았다. 비밀값 존재를 검토하지 않은 파일은 자동 커밋하지 않는다.
- 현재 채팅은 인계 후 브라우저/코드 작업을 중단한다. 새 채팅이 이 폴더를 인계받는다. 종료 시 필요한 증거를 보존한 뒤 자기 폴더를 정리한다.

## GA4 실측
- account 385841808 / property 526361229 / stream 13684562754 / measurement G-FMHV4ZHY3G.
- 사용자는 스트림을 꿀꿀운세라고 부르지만 실제 UI 이름은 꿀만세력. 도메인과 ID가 일치하며 이름을 변경하지 않았다.
- Google tag GT-PBNPFSH2, Tag Manager account 6341820238 / container 244975889.
- 진단 2건 중 추가 도메인 경고 해결: code-destiny.com 정확히 일치 저장, codedestiny-5md.pages.dev 및 codedestiny-staging.pages.dev 제안 제외. 저장 후 작업 항목 2→1 실제 확인. PG/로그인 도메인을 교차 도메인에 추가하지 않았다.
- 남은 1건: '잘못된 transaction IDs 발견됨' → 세부정보 '중복된 거래 ID' → 영향 페이지 https://code-destiny.com/records/ . 경고 ID 원문은 GA UI에서 재확인하며 문서에는 보관하지 않는다.
- 두 ID를 운영 payments에 읽기 전용 대조해 실제 서로 다른 주문 2건 확인: KST 10/26 21:33, life-book-ai-consultation, 30,000원 fulfilled / KST 10/27 00:27, rpt_specialCharmCard, 1,000원 paid. 결제일은 중복 이벤트 발생일의 증거가 아니다.
- GA4 관리→데이터 표시→이벤트→커스텀 구성: 맞춤 이벤트 규칙 없음, 수정 규칙 없음을 직접 확인했다. GA UI가 다른 이벤트를 purchase로 복제하는 규칙은 발견되지 않았다. purchase는 주요 이벤트로 표시되어 있다.
- 경고 원인은 아직 확정하지 않았다. 페이지 주소만으로 records 컴포넌트가 발화했다고 단정하지 않는다. SPA의 page_location 갱신 여부, 구매 복구 재실행, 기기/저장소/동의 변화, 같은 거래의 다른 client/session 재전송을 우선 조사한다. 새로운 주문/날짜로 실제 재발 여부를 분리한다.

## 코드 시작점
- js/core/analytics.js: 단일 태그 초기화, production origin 외 동일 속성 차단, cdTrackConfirmedPurchase(약396행). 서버 paid/success/fulfilled + analyticsChannel LIVE + 양수 금액/거래번호 확인. 메모리 및 동의 시 localStorage cd:purchase:<id> 중복 방지.
- lib/analytics.ts: React 얇은 호출 래퍼. 초기화 전 이벤트 큐.
- 호출부: app/points/PointsClient.tsx 서버 confirm 및 subscription confirm 응답, js/destiny-profile.js 서버 confirm/복구 응답. app/records/RecordsClient.tsx 자체에는 purchase 호출 없음.
- 동의 거부 시 현재 익명 계측 정책과 persistent dedupe 비활성 동작을 구분한다. 동의 없이 식별자를 저장해 경고를 없애면 안 된다.
- 환불 서버 구현과 철회는 __tests__/ui/ga4-refunds.test.mjs에서 import된 정본을 따라간다. GA4_API_SECRET을 출력하거나 읽기 위해 브라우저 비밀값 화면을 열지 않는다.
- 운영 설정 이름 존재 확인됨: GA4_API_SECRET, GA4_MEASUREMENT_ID=G-FMHV4ZHY3G, GA4_SERVER_REFUNDS_ENABLED=true, GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON. 이는 실제 refund 수신 증거가 아니다.
- 원치 않는 추천에 nid.naver.com 정확히 일치 저장 완료. 네이버 전체 유입을 제외하지 않았다.

## 검증 결과·범위
- 운영 Pages /version.json 및 Worker /api/version 모두 5d7fcf852c1eab54ff3471d4fea9630c0f4199b7 production 확인 기록. 이 후속 작업은 운영 재배포하지 않았다.
- 실제 사이트 QA 방문→신년운세 이동으로 GA 실시간 page_view 2 수신. 결제/유료 생성은 하지 않았다. 새 purchase/consultation_completed/refund 수신 완료로 표현하지 않는다.
- 10/29 KST 신규 paidAt 조회 0건은 이전 조회 시점의 값이며 필요하면 읽기 전용 재조회한다. 과거 주문 89건은 사용자가 전부 실제 고객 결제라고 확인했고 PG LIVE 89건 대사 완료. 과거 데이터는 신규 코드 검증 또는 광고 매출 증거가 아니다.
- node --test __tests__/ui/purchase-analytics.test.mjs __tests__/ui/analytics-consent.test.mjs __tests__/ui/ga4-refunds.test.mjs __tests__/ui/marketing-pg-reconciliation.test.mjs → 47/47 pass(외부 네트워크 차단 mock).
- npm run verify:analytics-events, npm run check:fast, npm run check:pre-push → pass.
- 7ab0fca7a PR CI 40875236464 success. 이후 다른 세션의 829e18a30(토스 초융합 29파일) fast-forward 반영, 그 CI 40876289034는 마지막 조회 in_progress. 새 문서 커밋 CI는 별도 확인한다. 이전 green으로 최신 green을 주장하지 않는다.

## 네이버 실측과 외부 게이트
- 계정2614862, 캠페인 cmp-a001-01-000000011266816 / 꿀꿀운세_사이트홍보_5만원.
- 캠페인/그룹 OFF, 잔액50,000원, 기본입찰100원, 일예산2,700원, 10/29~11/07. 자동충전 미설정 확인 기록. 일예산만으로 실제 총청구 상한을 보장하지 않는다.
- A그룹075518493 / 소재607961280, B그룹075518603 / 소재607929398. 실제 UI 둘 다 소재 검토중. 비즈채널 검토중이면 소재 검토가 진행되지 않는다는 안내 확인. 잔액 부족은 아니다.
- 이미지 A story-A-square.png, B consultation-B-square.png 배치 완료. A에 중복된 B 이미지 OFF 보존. 상위 OFF이므로 광고 노출 없음. 추가 충전/활성화 없음.
- 네이버 자체 전환 신청은 비즈채널 심사 대기로 차단됐던 기록이 있다. 승인 이후 다시 확인. GA4 측정과 네이버 자체 전환 연결은 구분한다.

## 후속 완료 기준
1. 실제 중복 발화 경로/시점을 증거로 특정. 필요하면 원 주문·식별자 관계를 읽기 전용으로 확인하되 고객 정보 출력 금지.
2. 확인된 원인만 최소 수정하고 재현 테스트/중복 방지/동의/로그인·PG 복귀 회귀 검증. 과도한 신규 서버 구매 시스템 구축은 피한다.
3. main 전달·공식CI 확인 후 운영 수정 필요 범위와 승인 요청. 이미 반영된 수정과 새로운 수정을 분리한다.
4. GA 진단 재평가와 실제 자연 발생 주문을 대조. 경고를 단순 숨김 처리하지 않는다. 외부 새 이벤트가 없으면 남은 실측을 명확히 보고한다.
5. 네이버 심사/예산/OFF 재확인, 등록 준비와 실전 검증을 구분해 보고. 광고는 이 인계 자체로 ON 승인되지 않는다.

## 증거·참고
- docs/marketing/naver-keyword-evidence-20261029.md 마지막 절이 전체 프로젝트 실측 정본.
- docs/marketing/yeongnyangi-paid-20261028/evidence/ga4-domain-diagnostic-20261029.png: 경고1건 잔존 화면.
- 공식: https://support.google.com/analytics/answer/14681508?hl=en
- 공식: https://developers.google.com/analytics/devguides/collection/ga4/validate-ecommerce
- 브라우저 연결은 새 채팅에서 inventory로 다시 확인한다. 직전 세션 Chrome4 GA tab1473076932(권한 있는 계정), Chrome3 Naver tab1473076684. 이 번호를 현재 연결 보장으로 간주하지 않는다. 확장 재연결/비밀값 복사 요구부터 반복하지 않는다.
