---
status: active
updated: 2026-09-21
next: "신규 이용권은 판매 보류. 상품별 최대 원가·Google 조건·비용 증가를 검증한 뒤 신규 가격과 한도를 확정한다"
---
# 사업 리팩토링 인수인계

정본: [사업 마스터](../business-refactor.md), [계측](../analytics-kpi.md).

## 2026-09-21 최신 main 전달 — 이전 기록보다 우선

- main 전달 중 최종 CI는 [main 검사 목록](https://github.com/rei1237/codedestiny/actions/workflows/pr-ci.yml?query=branch%3Amain)의 최신 SHA를 확인한다. `2e1c312467b2bebf585801d6018e9fc8b9b9e941` 검사에서 발견한 날짜별·일간별 월간·유명인 사주·휴먼디자인 허브 링크 누락과 전생 궁합의 옛 가격 검사값을 후속 커밋에서 수정했다. 실패한 중간 CI를 최종 성공 증거로 사용하지 않는다.
- 영냥이 root를 최종 Pages 조립까지 보존했다. `/ggulggul/` 사이트맵·lastmod·옛 만세력 리다이렉트 충돌과 footer 신뢰 링크를 수정했다. 새 홈의 펼침형 탐색 메뉴에 기존 공통 공개 허브 링크를 재사용해 콘텐츠 이동 경로를 보존했다. 두 조립 스크립트를 실제 실행하는 임시 파일 fixture 검사 통과.
- 개별 화면·최소 결제 증빙·질문형 AI·저장 메타데이터의 가격 조회를 정본에 연결했다. 찻집 5종 화면/서버/문서와 다국어 안내를 동기화했다. 저장된 주문·결과를 일괄 수정하거나 운영 DB에 쓰지 않았다.
- 최초 `check:fast` 통과 후 회귀는 해당 검사로 재현해 수정했다. 후속 Jest 전체 4,048개 통과/옛 가격 기대 1개 실패 → 수정 후 해당 묶음 18개 통과. Node 전체의 옛 차감액 기대 2개 → 수정 후 해당 묶음 19개 통과. 로케일 복귀24개, 상품 안내21개, 홈 조립1개 통과. 정식 최종 전달 판정은 위 main CI다.
- [결제·Worker 검사 실행](https://github.com/rei1237/codedestiny/actions/runs/35603177847)의 `Critical checks` job 성공 확인. 실행 전체는 이후 수정한 UI 기대값/홈 신뢰 링크로 실패했으므로 전체 성공으로 인용하지 않는다.
- [선물 replica CI](https://github.com/rei1237/codedestiny/actions/runs/35600030305) 33개 통과: 구정책 주문 복구, 새 VVIP 9만 원 선물, 구정책 활성 중 신정책 수령 보류 포함. 운영 DB 검증이 아니다.
- 깨끗한 커밋에서 `verify:public-mirror-fresh` 통과(재생성 차이0). 캐시 키 전파를 마지막 loader/정적 진입 페이지까지 완료했다. `verify:sitemap-drift` 1,284 URL, `verify:handoff-contract` 176문서 통과. main `marketing/**` 타 세션 변경 보존.

### 다음 행동: 가격 확정에 필요한 근거부터

1. `docs/pass-pricing-20260921.md`를 읽고 실제 상품별 모델/토큰·thinking/재시도·저장·지원·환불 원가 및 PG 정산 근거를 모은다. 무승인 유료 호출이나 운영 DB 쓰기로 자료를 만들지 않는다. 원가 evidence는 비어 있고 3종 × 웹/Play 모두 신규 판매 차단이다.
2. 최소 판매량 근거와 비용 증가를 검토한다. 예산 월108,000원은 환율1,600원 가정이며 청구서 실측이 아니다. 내부 심사는 변동원가2배·고정비5배(예산 기준 월540,000원), 공헌이익40% 이상 및 배분 고정비 차감 양수를 요구한다. 추가 고정비·더 큰 증가가 예상되면 상향한다. 후보9,900/29,900/59,900원을 확정가로 광고하지 않는다.
3. Google 프로그램/국가별 정산·신규 SKU·가격·비자동갱신·기존 영수증 복원을 검증한다. 미확인15%를 확정 수수료로 쓰지 않는다. 기준 미달이면 신규 가격/누적 한도만 재설계하고 기존 구매권은 줄이지 않는다.
4. 아래 브라우저 공백과 카카오 이름/아바타 제한을 해결한다. 완료한 무료 세 장·계측·본 구현을 반복하지 않는다. 운영 승격, 실 PG·유료 LLM·운영 DB 쓰기는 별도 승인이다. 운영 SHA 확인 전 배포 완료라고 하지 않는다.

## 2026-09-21 영냥이 메인·가격 정책 추가 작업

이 절과 [이용권 원가/정책 문서](../pass-pricing-20260921.md)가 아래 과거 가격 고정 기록보다 우선한다. 사용자 승인으로 가격·홈을 변경했으며, 후속 요청으로 유지비 증가까지 반영한 흑자 범위의 가격 재검토를 판매 전 필수 조건으로 추가했다.

- `/` 영냥이 메인, `/ggulggul/` 꽃돼지. root의 기존 action·공유·결제 복귀 파라미터와 구 해시를 꽃돼지로 보존. `/static/` 유지. 무료 세 장·계측은 재구현하지 않음.
- 꽃돼지 가격 변경 전수표: `docs/verification/flower-price-changes-20260921.json`. 찻집 5종 5천원, 기존 3만원 유지, 영냥이 가격 유지.
- 버전 `flower-20260921` 3종 후보 구현: 9900/29900/59900원, 누적2/5/9만원, 건당5천/1만/3만원. **판매 가격 확정 아님. 웹/앱/선물 신규 판매 모두 차단**. Family 신규 판매 종료, 버전 없는 과거 주문은 legacy. 기존 VVIP2만원·Family·기구매 연장·선물·환불 권리 유지.
- 원가 심사: 상품/코스별 최대 원가의 가장 비싼 반복 조합, 세금/PG/Play, 고정비와 최소 판매량을 함께 계산. 현재 실원가 evidence 비어 있음. 비용증거 없이 판매를 열지 말 것.
- 사용자 예산: PG5%이하(부가세 여부 미확인), CF$5, Mongo M10 월10만원, 향후 증가 가능. 시나리오는 PG5.5%, 환율1600/2000, Play15/30%, 고정비2/3/5배. 새 내부 게이트는 변동원가2배·고정비5배 스트레스 후 공헌이익40% 이상과 고정비 차감 양수. 판매량 가정은 보장이 아니며 근거 필요.
- 카카오 소개 저장 검증 완료: 영냥이 + 기존10년경력/대통령 적중 문구. 비즈니스 채널은 이름 변경 불가 UI 확인. PNG 준비 `public/assets/yeongnyangi/original/kakao-profile.png`; 업로드는 Chrome 확장의 파일 URL 접근 권한 미허용으로 미완료. 사용자에게 권한 켜기 안내함. 메시지 발송 없음.
- 브라우저 mock: root 영냥이와 꽃돼지 연결, 기존 `/?action=cdOpenAllFortunes`의 `/ggulggul/?action=...` 보존, 모바일390px overflow 없음, /points 신규3종 가격/한도/구매·선물 disabled 확인. root 예측 출처 링크 보존.
- 원래 남아 있던 MindScan 결과 재열람·실제 사주 결과→연애비책·저장소차단·스크린리더·OG 실기기 검증은 아직 완전 검증 아님. 운영 PG/유료LLM/DB 쓰기와 운영 승격은 별도 승인.
- 작업 시작 base5817e5149d657b5b6429359c898aada33bd1f6c3. 동시 marketing 작업을 보존하기 위해 worktree `D:/Development/codedestiny-worktrees/yeongnyangi-business-v2-20260921-200128` 사용. main merge/push/CI 전달 기록은 아래 최신 절을 확인한다.

## 제약과 승인
기존 구매권·가격·결제 검증·계산·URL 보존. 무료 세 장은 no-LLM.
실 PG·유료 LLM·운영 DB 쓰기·고객 메시지 발송 승인 없음. 운영 승격 별도.
다른 세션의 marketing 변경 보존. DB 마이그레이션 없음. 롤백은 이 작업 커밋만 역순 revert.

## 완료한 변경
- 9cfe1a8db: 승인/완료 관찰/열람 분리, 초기 분석 로드 전 이벤트 보완. 기존 이벤트 이름 유지하며 새 열람 의미 분리.
- 2d5bf280f: /today/ 연이의 무료 세 장, MindScan CardBack만 재사용, 정적 22카드×3 해석, KST/복원/공유/완결 후 단일 상담 링크.
- 3a12b5a3a: 홈 대표 구매/무료 행동과 registry 가격, 연애 비책 현재 이미지, 경력·대통령 원문 링크, 사전/미러/사이트맵.
- 주요 파일: app/today/DailyTarot.tsx, lib/tarot/daily-three.mjs, js/core/analytics.js, lib/analytics.ts, app/yeongnyangi/_components/Consultation.tsx, templates/home-funnel.html, lib/brand/prediction-records.json.

## 검증
- check:fast exit0, paid suite88, Jest288 suites/4039 tests, lint/typecheck/Worker build 통과.
- 일일/분석10 tests 통과. 대표 영냥이 상품·조회503·생성실패·중단·환불 mock5 cases 통과. 실PG/LLM/운영DB writes0.
- Chrome 로컬390px 선택/Space키/순차 공개/복원/공유수신/이미지·overflow 확인. today-hub mock API 미지원 오류 중에도 완료.
- 새 출처 표시 이후 ESLint, home-builder --check, sitemap drift 통과. 마지막 CI로 최종 커밋 판정 예정.
- 카카오 채널 _GgxaGX 소개는 사용자 지시로 원래 경력·적중 문구 복원, reload 값 확인. 메시지·환영 활성화 없음.
- 운영 배포 증거 아직 없음. 조사 당시 Pages/Worker f0ffba34e168b27879409ae1ceaddca7e56cd19e. 로컬 수정/CI를 배포 완료라고 하지 않는다.

## 중요한 사용자 정정
“두 대통령 적중”은 반드시 유지. 9월20일 대화 01a0be27-944f-7ef0-bfaf-e2acf06b4053에서 사용자가 제공했던 원문을 회수했다. 사용자에게 다시 링크를 요구하지 않는다.
- 윤석열: https://blog.naver.com/neosaju/222876455500 (2022-09-16), https://blog.naver.com/neosaju/223444062729 (2024-05-12)
- 이재명: https://blog.naver.com/neosaju/223459696339 (2024-05-27)
- 223442610559는 휘성 글이므로 대통령 사례 아님.
Chrome에서 게시일/본문 확인. 원문 수정이력·전 예측 적중률을 독립 검증했다고 기록하지 않는다. 관련 SEO 정본에 최신 출처 발견을 반영했다.

## 다음 순서
1. main 전달 SHA fe1d0235c0c3ddf9f47cd5c94178694e1799541c의 CI 링크 아래 확인. 운영 승격 승인과 live PG/LLM/실기기 검증은 별도. main 합치기와 push를 반복하지 않는다.
2. 연애 비책 실제 사주 결과→상세→결제 전 이미지/가격, 기존 MindScan 선택·복귀·재열람 브라우저 검사 공백 보강. 일일 API 성공/저장소차단/스크린리더·OG 실기기 확인.
3. 전 체계 상담 진입 정리·상품 전수표/실원가·기존 이용권 잔여권리, 카카오 메뉴/지원 동선 및 7일/30일 실제 지표. 메시지 발송은 승인 전 금지.

## 반복하지 않을 조사
GA4/DB 현재차이·테스트 미분류 수치는 마스터 참조. 방문자325는 적격 전환 분모 아님. 영냥이 홈 진입은 원래 존재했다. 연애 비책은 CSS 배경만 오래된 상태였다. 마인드스캔 전체를 무료 경로에 삽입하지 않는다.

## 작업 환경
원 작업 main: D:/Development/code-destiny. 동시작업 예외 worktree: D:/Development/codedestiny-worktrees/business-retention-20260921-131612. 로컬 mock dev 포트34976, API34977. node_modules는 main을 향한 junction이며 디렉터리 재귀삭제 금지. 인수인계 후 제거 시 junction 링크만 먼저 해제.

## 재개 문장
docs/handoff/business-refactor.md와 관련 마스터 문서를 읽고, 완료된 작업을 반복하지 말고 다음 미완료 우선순위부터 구현·검증·배포를 이어가라.

## main 전달 기록
fe1d0235c0c3ddf9f47cd5c94178694e1799541c main push 완료. 동시 main 변경과의 충돌은 sitemap-lastmod 생성 원장만 있었고 최신 main 기준 재생성 후 검증했다.
- [코드 CI](https://github.com/rei1237/codedestiny/actions/runs/35562505911)
- [결제 가드](https://github.com/rei1237/codedestiny/actions/runs/35562505885)
링크 생성 확인 시 실행 중이었으며 최종 상태는 링크의 해당 SHA로 확인한다. 자동 스테이징과 프로덕션 승격은 별개다.

## CI에서 발견해 수정한 회귀
fe1d0235c 빌드는 /sukuyo/calendar 고아 URL 검사에서 실패. TodayHubClient의 한국어 전문 도구 링크를 유료 추천과 함께 숨긴 것이 원인. 무료 전문 도구 3개 링크를 복원하고 FusionCrossSell만 한국어에서 숨기도록 수정했다. 따라서 이전 실패 CI를 최종 통과로 인용하지 않는다.

최신 코드 전달: 8760d5258212d7e725166fd63e8fe75cfa7ce38d. [회귀 수정 후 CI](https://github.com/rei1237/codedestiny/actions/runs/35562836889). 사주아이/청월당 공식 주체·제한된 모바일 DOM 관찰을 마스터에 추가했다.
