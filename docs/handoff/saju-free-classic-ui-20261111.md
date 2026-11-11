---
status: in_progress
updated: 2026-11-11
---

# 사주 무료화와 클래식 결과 화면: 54키 검증 완료, 유료 예외 확인 대기

## 현재 상태

기본·재미 사주, 자미두수, 베다점/나크샤트라, 점성술, 숙요점의 승인된 비LLM 콘텐츠를 무료로 전환했다. 기존 기본풀이와 만세력 우선 표시, 개별 재미 콘텐츠의 원래 이미지, 명리 아이콘, 달빛 예화 버튼, 꿀꿀운세·영냥이 진입 로딩도 통합했다. 현재 정본 무료키는 54개다.

추가 범위까지 구현·검증·로컬 저장했다. 원격 main push, 운영 승격, 최종 앱 빌드와 컴퓨터 절전은 하지 않았다. 라이트 사주·사주 대운 유료 예외 유지 여부를 추가 확인 중이므로 전체 작업 완료로 처리하지 않는다.

- 작업 경로: D:\Development\codedestiny-worktrees\saju-free-classic-ui-20261111-20261111-094658
- 브랜치: wt/saju-free-classic-ui-20261111-20261111-094658
- 검증한 구현 및 공식 생성물 커밋: e2c6bf069487377de820594975827195da92560f
- 추가 UI 소스: 2291525321b61acf8b952e56c5c7af79beef38ba
- 추가 서버/정책: 9344dd4f1, 7cb7945c4
- 마지막 테스트 계약 수정: ecbb61220
- 마지막 확인 origin/main: 2a53c1dfb93ae2f5f1be50657d7f9b553f45164f
- 마지막 확인 운영 코드: 162081df1bf788ef536b6e00027579324f3f3270
- 다른 세션이 쓰는 공유 main 체크아웃과 미커밋 변경은 보존했다. 재개 시 원격 최신 상태를 다시 확인한다.

## 승인과 남은 결정

사용자는 “나의 일 스타일·LOVE CODE·인연의 장소·휴먼 디자인”의 계산형 4범위를 무료에 포함할지 묻는 질문에 “llm이 아닌건 다 무료로 풀어버려”라고 답했다. 뇌구조와 휴먼 디자인 고정 해석은 별도 화면이므로 정확한 키 다섯 개를 추가했다.

- saju-career-style
- love-code
- destiny_meeting_place
- saju_brain_reading
- human_design_reading

실제 human-design-report는 Gemini 생성이므로 무료에 넣지 않았다. 일반 section_summary·section_daewun과 saju_lifetime_bundle의 29,000원·영구 권리도 추가 답변 전에는 변경하지 않는다.

Google Play cd_content_tier_19는 “라이트 사주 풀이”, 일회성 29,000원으로 등록·활성화됐다는 출시 확인을 받았다. 현재 소스 SAJU_BUNDLE_LABEL은 “사주 전체 풀이 평생 소장”이다. 라이트·대운 예외가 유지되는지 답변을 받은 뒤 표시명과 상품 설명을 정합하게 맞춘다. 최종 앱 빌드는 아직 하지 않았다.

## 보존한 경계

- 정본은 lib/payment/free-fortune-policy.mjs의 정확한 허용 목록이다. 가격·접두사·비용만으로 무료 여부를 추정하지 않는다. 브라우저 IIFE/ESM은 공식 생성기로 복제한다.
- 로그인·본인 저장 프로필·기존 결과 소유권을 유지한다. 새 무료 요청은 결제·차감·구매증빙을 만들지 않는다.
- career의 활성 과거 구매 원본은 그대로 읽고, 새 계산은 public/saved:false로 반환한다. 새 유료 archive나 권리를 저장하지 않는다.
- LOVE/인연의 장소는 fresh 로그인 확인 뒤 로컬 계산한다. 기존 구매 복원은 유지하며 auth/profile 변경·뒤로가기·unmount 이후 늦은 응답을 폐기하고 이미 표시된 결과와 입력을 지운다.
- 정적 HD는 본인 프로필과 출생정보 일치를 확인한다. 로그아웃 시 같은 seed라도 닫는다. 뇌구조는 로그아웃 후 옛 G_PILLARS로 다시 열지 않는다.
- 실제 human-design-report, compat-saju-compatibility와 그 밖의 실제 LLM 생성은 유료다. section_compat는 기존 고정 섹션키이며 Gemini 사주 궁합 상품의 별칭이 아니다.
- 일반 라이트·대운과 묶음 가격/과거 구매 별칭은 현재 유지한다. 무료 기본·재미 콘텐츠를 새 구매 혜택으로 표시하지 않는다.
- 기존 제휴 코드·자격·서버 권한은 유지한다. 사용자 화면의 제휴 명칭만 없애고 등록한 선물로 중립 안내한다. 구매 가격은 감추지 않는다.
- Play 신규 products/free-grant/intent에만 무료 정책을 적용한다. 기존 receipt verify/restore/RTDN과 이전 주문·환불·재열람 경로를 보존한다.
- 베다 프라슈나 새 계산은 /api/fortune/vedic/prashna/free를 사용하고 기존 유료 결과 재개 경로는 남긴다.

## 검증 결과

모든 검증은 mock이다. 실결제·실LLM·운영 DB 변경은 하지 않았다. check:fast가 구형 유료 기대와 생성물 신선도에서 멈춘 뒤 해당 계약/공식 생성물만 정정하고 실패 단계 및 남은 필수 단계를 이어서 실행했다. 생산 코드를 구형 기대에 맞춰 바꾸거나 보호 검사를 삭제하지 않았다.

- 전체 Node: 4,908/4,908 통과, skip 0.
- 전체 Jest: 471 suites/7,865 tests 통과, 기존 1 suite/1 test skip. 유일한 실패는 LOVE CODE의 과거 유료 CTA marker였다. 해당 테스트 한 파일만 새 무료 진입·로그인·복원 보호 계약으로 갱신한 뒤 관련 4 suites/121 tests가 모두 통과했다. 이후 생산 소스 변경은 없다. 전체 Jest 명령 자체를 다시 실행했다고 주장하지 않는다.
- 결제 안전 묶음 77개, lint, TypeScript, Worker build, 인코딩 및 critical 나머지 단계 통과.
- 갱신한 paid-gate-ui 및 saju-unlock-entitlement-regression은 직접 재실행 PASS/OK.
- 추가 서버 핵심 12 suites/318 tests, 정적 HD 정책 5 suites/217 tests, 기존 권리·환불·주문 영향 11 suites/211 tests 통과. 모두 skip 0.
- 추가 UI 관련 109/109, 표시 검사 25/25, 수정 계약 Node 63/63, HD 문구 생성물 14/14 통과.
- 추가 16 mock 화면: 360/390/430/1280px, 넘침·브라우저 오류·결제 요청 0, CTA 높이 50px/대비 15.06:1. career 8장·인연 결과·LOVE 장면 무료 클릭 확인. 독립 검수에서 발견한 과거 복원/로그아웃 경계 두 건도 수정 후 재검수 통과.
- 허브 390/1280px: 넘침·JS오류 0, canonical 유지, 무료 리포트와 별도 유료 가격 구분.
- 제휴명 중립화 선물 흐름 14테스트 통과.
- 이전 클래식 UI 검사: 만세력 우선, 재미 카드 원본 이미지/본문 유지. 구매조건 안내 52패널 정정, 고유 이미지 302개 보존.
- 공식 sync:public, build-destiny-anatomy-hd-copy, extract-saju-section-runtime, sitemap:generate 완료. sitemap:check 1,069 URL 일치.
- 최종 check:pre-push 통과. 미러·사이트맵·서비스 레지스트리·SEO·저장소 위생 확인. 로그는 .tmp/free-54-pre-push.log다.

주요 로그: .tmp/free-54-check-fast-final.log, .tmp/free-54-critical-remaining.log, .tmp/free-54-critical-final.log, .tmp/love-public-cta-contract.log/json, .tmp/five-key-legacy-impact.log/json.

화면: .tmp/free-four-browser-qa.json, .tmp/free-four-{career,place,love,hd}-{360,390,430,1280}.png, .tmp/free-report-hub-qa.json 및 .tmp/free-report-hub-*.png. 앞선 클래식 화면 검수 자료도 .tmp에 유지한다. 모든 검수 서버는 종료했다.

## 다음 순서

1. 라이트 사주·사주 대운 유료 예외의 정확한 추가 답변을 확인한다. 답변 전 상품·가격·운영을 바꾸지 않는다.
2. 결정에 따라 필요한 최소 정책/표시명 수정과 관련 검증을 한다. 실제 LLM과 기존 구매/복원 권리를 보존한다.
3. 최신 origin/main과 다른 세션 작업을 다시 확인하고 보존한다. 승인된 로딩 소스66fe2511e와 모바일 검증fef6dc3ad는 이미 이 작업에 통합돼 있다.
4. 전체 요청 범위가 확정되면 main 전달 및 공식 GitHub 운영 승격을 진행하고 CI/운영 고정 SHA를 확인한다. 그 SHA로 Android/스토어 빌드를 진행한다. 로컬 wrangler 운영 배포는 하지 않는다.
5. 운영 검증과 나머지 출시 작업까지 모두 끝난 뒤 자기 작업공간/임시 파일만 정리하고 요청된 절전을 진행한다. 다른 세션의 파일·워크트리는 건드리지 않는다.
