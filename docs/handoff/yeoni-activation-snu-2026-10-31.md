---
status: done
updated: 2026-11-01
next: "SNULIFE 담당자의 게시일 회신 후 정식 1,000계정 캠페인의 코드·시작·종료일을 별도 설정하고 게시 문안을 확정"
---

# SNULIFE 무료 제휴 운영 검증·자료 발송 완료

## 승인과 유지한 범위
사용자 승인에 따라 CI 복구, 공식 운영 배포, 기존 전용 테스트 계정의 검수 권리만 등록·해금·재열람 확인 후 기존 메일 스레드에 1회 회신했다. 별도 학생 인증을 요구하지 않는다. 정식 모집은 게시일부터 3개월·총 1,000계정·계정당 1회·본인 출생정보 하나·지정 콘텐츠 10종이며 게시일 확정 전 비활성이다. 일반 결제 가격과 이용권·월정석·단건 결제 체계는 유지했다. 다른 사용자 계정 쓰기·실결제·과금 LLM·유료 광고·계약은 실행하지 않았다.

## 수정 파일과 의도
- worker/lib/snulife-code.js, worker/lib/snu-campus.js, worker/routes/activation-rewards.js: 검수 3계정·14일과 정식 1,000계정을 별도 ID로 구분하고 기존 영수증·수량·출생정보 귀속·구매 및 회수 권리를 보존. 신규 학교 인증 경로는 410으로 종료, 기존 수령자는 유지.
- app/components/activation/SnuWelcome.tsx, activation-api.ts: 동일 코드 입력 화면에서 검수 캠페인 안내와 선택 프로필의 10종 해금·재열람 제공.
- worker/lib/content-unlocks.js, __tests__/worker/content-unlock-duplicate-key.test.js: insertOnly의 수동 날짜와 Mongoose 자동 날짜 충돌을 수정. 실제 ODM 미들웨어로 수정 전 실패·수정 후 통과를 확인했으며 기존 권리의 updatedAt도 보존.
- app/first-steps/page.tsx: 예약된 /onboarding 경로와의 충돌을 피하고 설명·noindex·내부 링크 유지.
- i18n/authored/homeFollowup-01.json 및 public/i18n 12개 미러: 실제 조건과 번역·화면 문구 일치.
- worker/routes/payments.js와 검증 대역 2개: 크론 호출 DB 경계에 withMongoRetry(retries:0) 적용. 결제 판정·가격·차감·반복 검사 기준은 유지.
- scripts/configure-snulife-review.mjs, .github/workflows/cloudflare-pages-deploy.yml, 관련 테스트·환경 계약·정책 문서: 공식 production 실행에서만 검수 설정 최초 적용. 기존 설정이 있으면 덮어쓰지 않음.

## CI·공식 운영 전달
릴리스 커밋: 4d58f3dc58e66bfd04dc265bf9dbf7392cab1c81
공식 CI: https://github.com/rei1237/codedestiny/actions/runs/41209939007 — 성공. Jest 440 suites / 7,210 tests.
운영 배포: https://github.com/rei1237/codedestiny/actions/runs/41213033014 — 성공. Worker·Pages 양쪽 SHA 및 검수 전후 SHA 일치.
초기 b255b50 운영 검수에서 Mongo code 40(updatedAt 충돌)을 발견해 공식 롤백 41209533477로 직전 1592b601에 복귀한 뒤 수정했다. 수정본의 첫 재배포 41211324660은 월말 자정을 가로지른 빌드 날짜 불일치로 승격 전에 차단됐다. 기존 운영과 검수 설정을 보존하고 날짜 전환 후 같은 커밋으로 재배포했다.

## 검증 명령과 출력
- 관련 Jest 38개 통과, 실제 Mongoose 날짜 미들웨어 회귀 포함.
- npm run check:pre-push: 서비스 63개·공개 미러·sitemap 1,037개·llms·entity 모두 통과.
- npm run check:fast -- --plan 확인 및 실행. 로컬 제한 환경에서 paid-gate 89/90개가 종료됐고 접근 제한으로 실패한 3개는 필요한 접근을 허용한 개별 재검사에서 통과. 종료되지 않은 로컬 npm test는 자기 프로세스만 중단했다. 로컬 전체 통과로 표기하지 않으며 공식 CI 전체 성공으로 최종 판정했다.
- 실제 운영 브라우저: 최초 코드 UI 등록 영수증을 이어서 본인 프로필 선택·10종 UI 해금, 새로고침·실제 로그아웃·UI 재로그인 후 재열람, 중복 등록, 존재하지 않는 프로필 거부 확인. 타인 프로필·기존 회수 권리 보존은 가상 검사에서 확인했다. 서버 접근 조회에서도 10종 권한 확인.
- 360/1280px 가로 넘침 없음·이미지 로딩 정상·브라우저 오류 0. 기존 기록 보관함과 /first-steps/ 접근 확인.
- 전용 계정에는 검수 전 기존 유료 권리가 없었다. 실제 유료 결과 재열람은 미실행이며, 기존 구매·회수 권리 보존은 가상 회귀 검사에서 확인했다. 원본 비교 증거는 개인정보 없이 해시로 보관. 정식 캠페인 수량 변화 없음.
- 운영 검수 JSON: D:/Development/code-destiny/outputs/snulife-partnership-20261031/live-review-proof.json

## 검수 조건과 제출
검수 등록 종료: 2026-11-14 22:46 KST(최초 설정한 14일 창 유지). 최대 3계정 중 자체 검수 1계정 사용, 담당자 검수 2계정 남음. 실제 코드는 저장소·파일·검사 출력에 저장하지 않고 담당자 발송 메일에서만 전달했다.
혜택 페이지: https://code-destiny.com/snu/
자료: posting-copy.txt, usage-and-review.txt, snulife-yeoni-code-1500x1200.png(1500×1200, 5:4, 1장), snulife-submission-code-v2.zip.
게시 문안은 사주 기반 자기이해, 가입 필요·무료 범위·수량·기간을 명시하고 결과 보장이나 서울대학교 추천·공인 표현을 배제했다.

## 발송과 남은 일
seongbae555@gmail.com → ad@snulife.com 김태윤 담당자, 기존 스레드 1a18223372b04e4a에 1회 회신.
발송 ID: 1a1945e6438053c2
메일: https://mail.google.com/mail/u/?authuser=seongbae555%40gmail.com#all/1a1945e6438053c2
제목·본문 파일과 썸네일 1장을 첨부하고 실제 검수 코드·종료일·남은 수량·이용 방법 및 게시일 협의 요청을 전달했다.
남은 일은 담당자 검토와 게시일 확정, 그 날짜 기준의 정식 캠페인 설정·정식 코드 전달이다. 무료 제휴의 상단 고정·[공식제휴] 표기·광고주 계정이나 유료 집행을 승인한 것으로 보지 않는다.
