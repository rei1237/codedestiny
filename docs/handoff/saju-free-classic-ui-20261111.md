---
status: active
updated: 2026-11-11
next: "문서·검사 기대 수정본의 정확한 CI와 실제 스테이징 배포 성공을 확인한 뒤 승인된 운영 승격을 진행한다."
---

# 사주 무료화·클래식 UI 최종 릴리스

## 현재 상태

승인된 비LLM 62개 기능키의 무료화, 클래식 사주 결과, 개별 재미 콘텐츠 이미지, 달빛 예화 버튼, 연이·영냥이 진입 로딩을 구현했다. 모든 소스와 공식 생성물은 저장됐으며 전체 Node/Jest를 포함한 최종 검증을 통과했다. 원격 main은 9e70831b58790f4a29801a1e43a7bf1b4beeb720까지 반영했다. 운영 승격은 아직 하지 않았다. CI43010992265는 미러 검사를 통과한 뒤 이 문서의 프론트매터 규약에서 실패했다. 규약을 수정하고 뒤에 생략된 가드도 검사해, 새 무료 정책과 어긋난 모바일 가격·재미 사주 CTA 검사 기대를 보정했다. 새 후보의 CI 성공은 아직 확인하지 않았다. 가디언 변경·앱 최종 빌드·절전은 별도 후속이다.

- 작업 경로: D:\Development\codedestiny-worktrees\saju-free-classic-ui-20261111-20261111-094658
- 브랜치: wt/saju-free-classic-ui-20261111-20261111-094658
- 마지막 제품 소스/검사 후보: 10e710251fc8d3cd9db75c7ba2454d7d5fa57799
- 공식 생성물 커밋: 958859c1f
- 마지막 확인 origin/main: 9e70831b58790f4a29801a1e43a7bf1b4beeb720
- 최신 CI: https://github.com/rei1237/codedestiny/actions/runs/43010992265 — 빌드·타입/lint·미러 성공, 인수인계 문서 규약 실패
- 9e70831b는 공식 Linux 생성기로 .ignore의 CSS 미러 두 줄만 보정했다. 제품·권한·가디언 소스는 바꾸지 않았다. mirror self-test와 check:pre-push 통과.
- Windows 연결 중단으로 CI 수선은 격리 Linux 복제본에서 수행했다. 기존 Windows 로컬 문서 커밋30bd38cd0은 현재 원격보다 낡았으므로 그대로 push하지 않는다.
- 마지막 확인 운영 코드: 162081df1bf788ef536b6e00027579324f3f3270
- 공유 main 체크아웃과 다른 작업트리의 미커밋 변경은 보존한다. 해당 체크아웃으로 전환하거나 reset/stash하지 않는다.

## 확정된 사용자 범위

사용자는 기본 사주·자미두수·베다점/나크샤트라·점성술·숙요점 및 재미 사주에서 LLM을 쓰지 않는 콘텐츠를 무료로 지정했다. 나의 일 스타일·LOVE CODE·인연의 장소·뇌구조·정적 휴먼 디자인과 추가 계산형 나침반3종·최애운명·FPTI·오늘 운세·꽃·올림푸스까지 실제 호출 경로를 조사했다. 근거와 제외 범위는 docs/context/2026-11-11-free-fortune-catalog-audit.md에 있다.

사용자는 다시 “라이트 사주와 사주 대운 풀이는 유료야”라고 확정했다. 따라서 section_summary, section_daewun, saju_lifetime_bundle의 29,000원·영구권은 보존한다. Google Play cd_content_tier_19 표시명은 “라이트 사주 풀이”이며 라이트+사주 대운 영구 열람, AI 상담 별도다. SKU·가격·복원·환불·기존 구매 원본을 바꾸지 않았다.

기존 SNULIFE 코드/자격의 서버 권한은 유지하면서 서비스 사용자 화면의 제휴 명칭만 중립화했다. 일반 사용자 가격을 숨기거나 누구나 라이트/대운이 무료인 것처럼 표시하지 않는다.

## 구현과 보존 경계

- lib/payment/free-fortune-policy.mjs의 정확한62키가 정본이다. 접두사·가격·타입만으로 임의 무료화하지 않는다. 브라우저 IIFE/ESM은 공식 생성한다.
- 실제 LLM, 일반 라이트/사주 대운, 수동 전문가 상담, 가디언은 제외한다. 역사적 billing registry·주문·영수증·구매 결과는 유지한다. 현재 표시 카탈로그와 새 판매만 정확한 무료 정책을 적용한다.
- 새 무료 결과는 결제·차감·구매증빙·유료 archive를 만들지 않는다. 로그인과 본인 저장 프로필, 과거 결과 소유권은 보존한다. 계정/프로필 변경·로그아웃·뒤로가기·지연 응답을 검증했다.
- career·FPTI·Vedic Prashna는 본인 프로필/출생정보를 서버에서 검증하는 새 무료 경로를 분리하고 과거 유료 재열람은 보존했다. FPTI 시각 모름 매핑은 실제 엔진으로 양력/음력/윤달 × 시각 있음/모름6조합을 검증했다.
- Olympus는 메인 저장 프로필 진입만 fresh 인증과 소유 서명을 확인한다. 기존 공개 직접 입력은 유지한다. 정상화된 출생·좌표 값으로 서명을 비교하고 동일계정 초기화와 실제 계정전환을 구분한다.
- Play 신규 상품/주문/무료 grant만 새 정책을 적용한다. 기존 receipt verify/restore/RTDN·환불을 보존한다.
- 만세력을 먼저 보여주고 이전 기본풀이 본문과 개별 재미 카드의 원래302이미지를 유지했다. 신살·한난조습·억부·종격·절기 리듬 아이콘 및 달빛 예화 CTA를 구현했다.
- 로딩 소스66fe2511e와 모바일 검증fef6dc3ad는 이미 통합했다. 승인된 배너·후기 소스와 자산은 유지했다.
- 공식 생성기가 무료 가격을 과거 값으로 덮던 문제는 c5d7ca311/8d4fdf9ee에서 정확한 무료키만 보정했다. 재실행0 edits 회귀 통과.
- 독립 페이지10개·React·public-only Ifa의 캐시핀은17682ff33으로 갱신했다. billing-client 변경은 URL해시 한 줄이며 공식 동결 매니페스트 해당 파일 해시만 함께 갱신했다. 신규 worker/payments에는 관련 런타임 참조가 없다.

## 검증 결과

개발 검증은 모두 mock이다. 실제 LLM·결제·운영 DB 쓰기·환불을 실행하지 않았다.

- 최종 전체 Node: 4,948/4,948 통과, skip0.
- 결제·권한 보호77/77, lint, TypeScript, 모든 critical 부가 검사, Worker dry-run build, strict-core 인코딩 통과.
- sitemap: 1,069 URL 일치. 공식 sync:public, HD 문구, 사주 section runtime, llms 안내 생성 완료.
- 전체 Jest 첫 최종 실행:473 suites/7,893 tests 통과, 기존1 suite/1 test skip. 유일한 실패는 꽃 신규 주문5천원을 요구하는 옛 기대였다.
- 5b5d80df1은 그 테스트1파일만 변경했다. 신규 무료3키 주문 FEATURE_NOW_FREE·DB작업0, 과거5,000원/50 snapshot·소유권·중복 결제 상태·환불·환불 후 재활성화 차단을 검증한다. 관련5 suites/233 tests 통과. 생산 소스는 변경하지 않았다.
- 전체 Jest 최종 재실행:474 suites/7,897 tests 통과, 기존1 suite/1 test skip, 실패0, 종료코드0. .tmp/free62-final-jest.log가 정본이다. 전체 critical는 먼저 통과한 Node/부가 단계와 수정 후 재실행한 전체 Jest 결과로 완결했다.
- 관련 UI/카탈로그/12언어 정책 문구85/85 통과. 검사 단언과 금지 문구/허용 목록은 완화하지 않았다.
- 실제 mock 화면:360/390/430/1280px. 만세력 우선, 개별 이미지/본문, 무료 결과·기존 유료 예외, CTA48~50px·넘침0·브라우저 오류0 확인. Olympus14개 실제 흐름과47회귀, React31, renderer25, FPTI22 통과.
- 검수 서버 session51549,30180/30181 종료. 다른 세션 서버는 건드리지 않았다.

추가 CI 수선 검증: 인수인계 규약217문서 및 self-test11건, 관련 check:fast 통과. 생략된 후속49명령 중 모바일 가격 가드를 정확한 무료 정책으로 보정한 뒤48명령이 통과했다. 모바일 가격·정확한 무료키·유료 예외·CTA fixture·실제 인연 경로 handler 관련 Node35개 회귀 통과. 브라우저 CTA 가드는 클라우드 Chromium socket 권한 제한으로 시작하지 못했으므로 실제 통과로 간주하지 않는다. 수정된 브라우저 가드의 실제 실행은 적합한 CI 환경에서 확인해야 한다. 제품 코드·가격 정본·기존 권리·가디언은 추가로 바꾸지 않았다.

주요 로그: .tmp/free62-final-check-fast.log, .tmp/free62-final-jest.log, .tmp/free62-flower-contract.log/json, .tmp/free62-final-copy-contracts.log.
화면 증거: .tmp/free-eight-react-final-qa.json, .tmp/free-eight-flower/olympus-auth-final-qa.json, .tmp/saju-classic-390.png 등. 최종 검사 중단 원인과 해결은 위 커밋 및 로그로 구분한다.

## 독립 후속: 가디언

사용자 최신 지시는 가디언 후속 작업을 Claude에 맡기는 것이다. NVIDIA 이미지 생성 제거·프롬프트 전환과 가격/권리는 이 릴리스에서 완전히 분리한다. 가디언 파일·가격·키·권리·기존 결과는 이번 작업에서 변경하지 않았다.

읽기 전용 확인에서 기존 이용권 기록이 확인되어, 후속 변경은 기존 구매권·결과를 먼저 보존하는 전제로 진행한다. NVIDIA trial을 상용 무료 또는 무제한 API로 단정하지 않는다. 세부 계정 집계와 설정 확인 결과는 이번 코드 변경에 포함하지 않는다.

## 다음 순서

1. 문서 규약과 새 무료 정책에 맞춘 두 검사 기대를 검증한다. 관련 targeted 검사와 check:pre-push 후 문서·검사 변경만 최신 main에 반영한다. 전체 제품 검사는 앞선 결과와 이번 실행을 구분해 보고한다.
2. 새 후보의 정확한 CI 결과를 확인한다. 문서 단독 push는 일부 lane을 생략하므로 릴리스 전 필요하면 공식 PR CI의 full_ci=true를 사용한다. 스테이징 예약 run의 성공을 실제 배포 성공으로 간주하지 않는다. 다른 세션 변경을 보존하며 강제push나 더러운 공유main 변경은 하지 않는다.
3. 배포 담당이 정확한 새 SHA의 main CI와 실제 스테이징 Pages/Worker 배포를 검증한 뒤 승인된 공식 GitHub workflow “Release Cloudflare Pages and Worker”를 mode=production으로 실행한다. configure_snulife_review/bootstrap_cms/pages_only는 기본false, 로컬wrangler배포금지. 양쪽 운영SHA와 읽기전용 핵심화면을 확인한다. CI/스테이징을 수동poll하지 말고 진행중이면 정확한 상태/URL을 부모에게 보고한다.
4. 검증된 운영SHA를 앱 출시 담당에 전달한다. Android 추가소스는 없으며 담당자는 -PCODE_DESTINY_ANDROID_VERSION_CODE=60 -PCODE_DESTINY_ANDROID_VERSION_NAME=1.0.60으로 빌드하고 실제manifest를 검증한다.
5. 운영 완료 후 문서를done으로 닫고 자기 임시파일·워크트리만 공식절차로 정리한다. 가디언·앱 후속 및 모든 작업의 완료를 부모가 조율하기 전 절전/종료하지 않는다.
