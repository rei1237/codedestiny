# 제휴 문맥 추천 작업 상태
status: blocked-external

## 2026-10-09 알리 홍보 재개 — 아래 과거 차단 기록보다 우선
- 후속 사용자 검수 완료: 선정 6개 상품 연결·판매 상태와 계정 홍보 가능 상태 모두 확인. 에이전트 직접 열람 대신 운영자 확인을 근거로 사용하며 추가 확인을 다시 요구하지 않는다. 초안은 배포 후 관리자 검수 절차로 활성화한다.
- 사용자 요청: 상품을 추리고 추천 문구를 정리해 알리 홍보와 제휴 수익화가 가능하도록 준비.
- 사용자 확인: 쿠팡 code-destiny.com 매체 등록 완료. 쿠팡 최종 승인 여부는 별도 미확인.
- 사용자 제공 알리 링크 36개. NEO2277 발급 및 code-destiny.com 활동 웹사이트 등록을 사용자가 모두 확인했다. 계정 승인 상태 화면은 직접 확인하지 못했다.
- 6개 선별: 태슬 책갈피, 고양이 저금통, 초록 도넛 팔찌, 초록 클로버 귀걸이, 금색 고양이 장식, 초록 비즈 팔찌. DIY 재료, 라이선스 미확인 아이돌 굿즈, 호환 옵션 미확인 폰 케이스와 중복 상품은 보류.
- 등록 자료: docs/operations/affiliate-aliexpress-20261009.json. 복사 가능한 검수용 홍보 원고: docs/operations/affiliate-aliexpress-20261009-copy.txt. 제휴 고지 포함, 검증하지 않은 가격·쿠폰·보석 진위·효능 표현 제외, 이미지 미사용.
- 6개 URL 형식·중복·기존 cleanProduct/reviewErrors 계약 통과. 미검수 초안이 공개 추천에 나오지 않음을 확인. npm run check:fast 통과.
- 기존 WT를 최신 main c6a8ec26f0b81dbec4e0228f017c163b73a5dfd6으로 fast-forward. 다른 세션이 가격·구매권 관련 수정을 반영했고 verify-home-service-registry 통과. 이 세션에서 결제 코드를 수정하지 않았다.
- 운영 관리자 직접 확인: 구버전으로 판매처 선택 없음, 기존 쿠팡 초안 9건·검수0·공개0·OFF. 알리 자료는 운영에 잘못된 쿠팡 상품으로 저장하지 않았다.
- 책갈피 링크를 브라우저에서 열었으나 ko.aliexpress.com/item/1005010413993477.html 접근이 site-safety 정책으로 차단됨. 다른 경로로 우회하지 않음. 판매 상세·옵션 독립 검증 미완료.
- 신규 CI: https://github.com/rei1237/codedestiny/actions/runs/37826467042 (c6a8ec26f, 확인 당시 진행 중). 문서 CI 성공만으로 동작 검증 성공을 간주하지 않는다.
- 남은 순서: 실제 동작 CI 성공 확인 → 공식 신규 코드 배포 → 알리 구조화 등록·검수·설정 → live 추천 확인. 사용자가 상품 연결·판매 상태·홍보 가능 계정을 확인했으므로 해당 사실을 다시 묻지 않는다. 이 재개에서는 운영 DB·공개 설정·배포를 아직 변경하지 않았다.
- 추가 mock 검증: focus→책갈피, budgeting→저금통, symbolism+gold→금색 고양이, symbolism+green→초록 장신구 3개, 색상·상징 미선택→노출0의 5개 선택 사례 통과. 실제 공개·클릭·수익 증거는 아님.

- 요청: 운세 글/개인 결과/탐색 관심사 기반 도서 중심 추천, 쿠팡 AF7837486 및 알리 공식 링크, 관리자 실등록, 화면 검증, 공식 CI/운영 반영.
- 시작 main: 740a11726196fee0e094b32e3bf0efa61809d02a. 운영 Pages: e02024ef42854fa7b35f7c972f26928e136d78bc (2026-10-09 직접 GET).
- 작업 경로: D:\Development\code-destiny\.codex-worktrees\affiliate-context-20261009-015938
- main의 index.html/미러 및 다른 untracked 파일은 타 세션 소유. 보존.
- 쿠팡 공식 링크 UI 로그인 및 AF7837486 확인. 운영 관리자 로그인은 사용자가 완료. 상품 0, 초안 0 확인.
- 알리 포털: Browser site-safety policy 차단. 우회 금지. 사용자에게 Tracking ID/공식 링크 요청, 사용자가 확인 위치 질문하여 안내. 비밀키 수집 안 함.
- 로컬 네트워크 제한: 일반 curl/gh 실패. escalation 실행에서 운영 SHA 및 gh 인증 성공.
- 이번 요청은 추천 카탈로그/설정 운영 등록과 공식 운영 반영을 명시 승인. 실제 결제/LLM/정산은 범위 밖.
- 체크리스트: [x] 기존 코드 및 기반 확인 [x] 문맥 계약/단위테스트 [x] 쿠팡 도서/링크 사실 검증 [x] 관리자/화면 연결 [x] 운영 초안 실등록 [x] targeted 검증 [x] main 통합/push [ ] CI 성공 [ ] 공식 배포 [ ] 구조화 운영 등록·공개 [ ] live 추천 확인 [ ] 워크트리 정리

## 구현·검증 2026-10-09
- 사용자 제공 Ali Tracking ID: NEO2277. 운영 저장 전, 공식 상품 링크 미확보, Ali OFF 유지.
- 페이지별 주제 계약/보수적 조언 어댑터/부정문·타인·가정 제외, 도서 판본·내용·관점/판매처·통화·색상 매핑 구현. 원문 외부 전달·프로필 저장·LLM 호출 없음.
- 쿠팡 공식 포털 발급 도서 8권과 노트 1종을 affiliate-catalogue-20261009.json에 보관. 운영 관리자 초안 9건 저장·재조회 완료. 검수0/공개0/OFF.
- 로컬 브라우저: boundaries → 거절 잘 하는 법, budgeting → 돈의 심리학. desktop/mobile 검수, 단일 카드 빈 공간 수정 후 visual checker 확인. 하단 공통 내비게이션이 안내 제목 일부를 가리는 기존 현상은 범위 밖.
- npm run check:fast -- --plan 및 check:fast 실행. 최초 sitemap drift 실패 후 생성물 갱신. 두 번째 실행: paid gates 88/88, lint, typecheck, node, worker dry-run, entry encoding 통과; Jest 354 suites / 5377 tests 통과(exit 0).
- 추가 잘못된 조언 배열 회귀: node --test __tests__/ui/recommendations-context.test.mjs 7/7 통과. Worker 추천 테스트 7/7 통과.
- 이미지 hash만 변경한 자기 WT HTML 8개는 원상복귀하여 타 세션 main dirty HTML과 충돌하지 않게 제외.
- 쿠팡 활동매체 확인은 포털 내 정보 MFA 사용자 완료 대기. 관리자 자체 로그인 완료와 별개. Ali 도구 site-safety 차단은 우회하지 않음.
- 다음: 아래 CI·외부 차단 해소 후 공식 배포, 구조화 운영 등록, 공개 게이트 확인 및 live 화면.

## 운영 등록·전달 결과
- 운영 구버전 관리자는 book/practiceTags/topicReasons/providerId 필드를 지원하지 않아 현재는 근거·속성란에 저자/출판사/판본/ISBN/한국어/종이책/내용/실천주제를 보관했다. 신규 코드 배포 후 구조화 필드로 이전하고 검수해야 한다.
- 9개 ID: atomic-habits-ko, mindfulness-poems-ko, saying-no-ko, psychology-money-2026-ko, karma-counselling-ko, mans-search-meaning-ko, live-as-me-ko, deep-work-ko, reflection-notebook-pair.
- 구관리자의 /re/AFFSDP 검증 거절을 우회하지 않았다. 새 코드에는 실제 공식 발급 형식 검증이 있다. 검수 전 초안 유지.
- NEO2277은 카탈로그 및 로컬 mock에만 저장됐다. 운영 Ali 설정은 신 관리자 배포 후 필요. 공식 Ali 상품 링크 미확보, OFF.
- JSON 파싱, 9개 공식 URL 형식, 8개 ISBN-13 checksum 통과. 실존·판본은 checksum과 별개로 각 source 자료에서 검증했다.
- 구현 827e02eb9, 생성물·통합 b900f73550d321f3c9ef7e408f4d98705af02336, 정적 기대값 수정 e49855d93, 최신 통합 코드 e5972a981532b63ac4b296a2146fffcf07e140af를 원격 main에 push했다. PR 없음.
- primary main의 타 세션 dirty HTML/runtime 때문에 로컬 ff merge가 거절되어 덮어쓰지 않았다. 통합 WT HEAD를 원격 main으로 fast-forward push했다. WT는 외부 대기 중 보존.
- sync:public, sitemap:generate, verify:sitemap-drift 통과(955 URLs). 가격 정본에 맞춘 오래된 정적 기대값 3곳 targeted 21/21 통과. 가격 정책 자체는 수정하지 않았다.
- 화면 증거 폴더: C:\Users\user\.codex\visualizations\2026\10\08\01a11c73-1010-7f92-824e-5ef5a1933cdb
  - recommendations-boundaries-full-v2.jpg: desktop mock
  - recommendations-budget-375.jpg: 실제 375px mock, clientWidth=scrollWidth=375
  - recommendations-live-nine-drafts.jpg: 운영 초안 9건/공개0/OFF, visual_checker 확인
  - 과거 mobile-v2/v3 이름 캡처는 실제 desktop이므로 모바일 증거로 사용 금지.

## CI 차단 및 필요한 사용자 응답
- CI https://github.com/rei1237/codedestiny/actions/runs/37821500883 : Typecheck/lint와 Build Pages/Worker 성공, Static guards/Critical checks 실패. 운영 릴리스 미실행.
- Static guards: node tests fail0 이후 verify:home-service-registry 실패. love-simulation '1회 5,000원' 및 nakshatra-muhurta '해금 5,000원' 파싱 미지원. animal-destiny 표시 1,000원/정본 5,000원 불일치.
- Critical 이전 진단: payments-v2.entitlements의 과거 unlockedFeatures=['loveSimulation'] → love-code unlockMap 누락. 실제 기존 구매권 호환성 회귀이므로 기대값만 약화하면 안 된다.
- 그 외 실패: payments-v2.daewun-pricing, static-reading-price, relationship-boundary-test.route, paid-non-llm-delivery의 병행 가격/청구 방식 변경 기대값 불일치.
- CLAUDE.md '범위 밖 결함은 보고만 한다'에 따라 결제 호환성 수정을 이번 범위에 포함할지 async 질문함. 답변 전 결제 코드 수정 금지.
- 쿠팡 내 정보 MFA 사용자 완료 후 code-destiny.com 활동 매체 등록 확인 필요. 관리자 로그인과 별개다. Chrome 쿠팡 프로필 탭 handoff.
- Ali는 도구 site-safety 정책 차단. 다른 경로로 우회 금지. NEO2277로 발급한 상품명·공식 제휴 링크를 사용자에게 요청했으며 아직 미수신. 비밀키 요청 금지.

## 재개 순서
1. 결제 수정 범위 승인 확인. 승인 시 payment-gating 절차와 기존 구매권 보존을 확인하고 관련 실패 suites/registry targeted 검증 후 main CI 성공 확인. 미승인 시 추천 밖 결제 변경과 배포 보류.
2. 쿠팡 매체 확인, Ali 공식 링크 확보. 검증 전 해당 판매처 OFF.
3. 공식 게이트 충족 후 승인된 Release Cloudflare Pages and Worker workflow를 mode=production으로 한 번 dispatch. 로컬 wrangler deploy 금지.
4. 새 관리자에서 9개 도서·기록장 구조화 정보/태그/이유 입력·검수. 확인된 판매처만 활성화. 실제 문맥별 live 추천 차이 검증.
5. 완료 후 본 문서를 done으로 닫고 자신의 WT/node_modules 정션/임시 파일 정리. 타 세션 dirty/untracked는 보존.

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\affiliate-context-20261009-015938'
Get-Content 'D:\Development\code-destiny\.codex-worktrees\affiliate-context-20261009-015938\docs\operations\affiliate-context-20261009-status.md'
git status --short
git log -1 --format=%H
```
