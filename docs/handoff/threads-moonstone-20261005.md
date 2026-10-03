---
status: active
updated: 2026-10-03
next: "Use the completed 10-card v2 campaign; verify operating price and moonstone discount plus the second Threads profile before October 5 at 09:00 KST publication."
---

# 10월 5일 고정 소개글·월정석 할인

## 승인과 작업 위치

- 공식 @codedestiny_official 및 로그인한 영냥이 Threads 고정 소개. 꽃돼지 연이를 반드시 포함한다.
- 직접 그린 캐릭터 에셋, 실제 그래프·영냥이 리포트·무료 운세, 후기·대통령 분석 원문을 근거에 맞게 소개한다.
- 가입 월정석 500개, 1개=10원 복원, 원하는 정수 수량 부분 할인. 게시 2026-10-05 09:00 KST.
- 주 작업: D:\Development\codedestiny-worktrees\moonstone-oct05-20261003-151816
- 브랜치: wt/moonstone-oct05-20261003-151816. 준비 구현 b25aeb5e0, main 통합 3d47439baa58055aeb246d78af0056519dea7ccf.
- 가격 B: D:\Development\codedestiny-worktrees\yn-price-1005-20261002-161442
- B 브랜치 wt/yn-price-1005-20261002-161442. 준비 완료 커밋 **a2e62d36f21ca7b6fd47c5246438364afac11162**. 10/5 전 main 통합·push 금지. B의 운영 승격은 별도 승인이다.
- D:\Development\code-destiny의 다른 세션 미커밋 파일은 건드리지 않았다.

## 만든 자료

`marketing/campaigns/2026-10-05/preview.html`로 3개 이미지를 한 번에 검수한다.

- assets/official-three-characters.png: 꽃돼지 연이를 가운데 크게, 네오·영냥이와 함께.
- assets/yeongnyangi-cover.png: 영냥이 단독 상담방.
- assets/moonstone-welcome-benefit.png: 500개=5,000원 및 9,900−5,000=4,900원.
- captions.md: 두 계정 첫 글, 기능·후기 답글, 대통령 원문 확인용 답글, 프로필·Facebook·Kakao 교체 문구. 각 게시 본문은 500자 미만으로 확인했다.
- image-prompts.md: 내장 ImageGen 제작 방식, 캐릭터 출처와 재현용 프롬프트 세트.

## 코드와 검증

main 준비본은 기존 가격·multiplier=5를 유지하므로 할인 입력이 노출되지 않는다. B는 10월 5일 정식 가격과 multiplier=1을 함께 적용한다. 서버가 수량·잔액·정가를 검증하고 주문/차감/원장을 원자적으로 예약한다. PG 확정 전에는 상담 접근 권한을 주지 않는다. 불명확한 결제는 동일 주문 유지, PG 실패/전액 취소 확인 후 한 번 복원한다. Family, 전액 월정석 및 팩 권리는 유지한다. 가입 보상·30일 만료·인증·DB 스키마는 바꾸지 않았다. 단건 결제와 API 입력/주문 스냅샷·복원 로직은 사용자 요청에 따라 변경했다.

- main 준비본 `npm run check:fast`: 전체 Jest 329 suites / 4,947 tests 통과. 전체 게이트는 기존 `result.ilju.balanceTitle`의 셸 ‘오행 균형도’와 사전 ‘📊 오행 균형도’ 불일치로 미통과. 시작 HEAD와 통합 origin/main에도 같은 불일치가 있음을 확인했다.
- 런타임 캐시 핀 오류는 새 내용 해시로 재생성해 수정. `verify:payment-choice-parity -- --self-test`, `verify:paid-gate-ui`, `verify:payment-freeze` 통과.
- `npm run lint`, `npm run typecheck` 통과(main 통합 전 준비본).
- 최신 main 결제 런타임 통합 뒤 관련 4개 Jest suite / 152 tests 통과.
- 가격 B: 부분 할인·기존 월정석·팩/선물 4개 suite / 180 tests 통과. 실제 /prepare mock에서 500개 사용 시 4,900원, 재시도 추가 차감 없음, 변경 수량 거부 확인.
- 가격 B 리딩 불변성 123 case: 가격에 따른 id/prepare 열만 변경. 리딩 요청·검증·매니페스트 해시는 그대로. 체험가 종료 UI 단위 검사 5개 통과.
- 검증은 mock 및 코드 기반이다. 실결제, 실제 LLM, 운영 DB 쓰기, 운영 승격, 실제 기기 검증은 수행하지 않았다.

## 예약과 외부 차단

Codex heartbeat **10-5-threads**, ACTIVE, 2026-10-05 월요일 09:00 KST 일회성 후속 실행을 생성·조회 확인했다. **Threads 자체 예약 등록은 아니다.** 운영 가격·부분 할인 확인 후에만 게시·고정하고 이미 게시/예약된 글은 중복 생성하지 않도록 지시했다. 운영 승격 권한을 부여하지 않았다.

Chrome 공식 로그인 프로필 확인 당시 소개에 ‘천원’ 표현이 있었고 가격 변경 공지는 이미 고정되어 있었다. 이후 Chrome 및 인앱 브라우저가 `Emulation.setFocusEmulationEnabled` / `Page.navigate` 시간 초과를 반복했다. 다음은 미완료다.

- 실제 그래프·상담 리포트·무료 운세 화면 캡처와 해당 캐러셀 카드.
- 영냥이 두 번째 Threads 계정의 정확한 @아이디 확인.
- Threads 원문 등록·게시·고정, 소셜 프로필 수정, Facebook/Kakao 공유 캐시 갱신.
- 대통령 원문 본문·사전 게시 시점·수정 이력 검증. Git 삭제 이전 prediction-records.json에서 원문 후보를 복원했으나 ‘적중 사실’ 확정은 하지 않았다.

원문 후보: 2024-05-12 https://blog.naver.com/neosaju/223444062729 ; 2024-05-27 https://blog.naver.com/neosaju/223459696339 . 후기는 `lib/brand/customer-reviews.mjs`의 사람 네오 1:1/강의 후기이므로 영냥이 AI 후기라고 쓰지 않는다.

## 재개

주 작업에서 이 파일과 가격 전환 문서를 읽고 실제 브라우저 연결을 복구한 뒤 미완료 캡처·계정 확인부터 진행한다. 10/5에는 B에 최신 main을 합치고 공식 CI/가격 릴리스 절차를 수행한다. 운영 승격 승인과 적용 확인 없이 할인 혜택 글을 게시하지 않는다. 생성 이미지 파일 때문에 주 작업 워크트리는 예약 실행이 끝나기 전에 지우지 않는다.

## 10/3 후속 진척 (위 초기 차단 기록보다 우선)

- 브라우저 연결 복구. 공식 Threads 소개를 꽃돼지·네오·영냥이, 무료 운세, 가입 500개 중심으로 수정하고 공개 반영 확인. 천원 상시 표현 제거. 기존 가격 종료 공지는 유지.
- 대통령 원문 두 건의 본문과 표시 작성 시각을 직접 확인. 헌재 선고와 공식 취임사 대조. captions.md의 검증된 사례 답글 사용. 사용자는 과거 실패 사례를 홍보글에 언급하지 말라고 명시했다. 전체 정확도 주장은 하지 않는다.
- 운영 무료 타로 캡처 완료. 그래프/리포트는 실제 ReadingCharts/SummaryReport 컴포넌트에 가상 입력을 넣어 캡처했고 이미지에 예시 표시. build-report-example.mjs로 재현 가능. 외부 API는 mock. 실제 고객 상담을 재현한 이미지가 아니다.
- 결제 복원의 Native DB 어댑터를 분리해 cron coverage 오류 해결. 불명확 PG 주문이 20건 배치를 독점하지 않도록 확인 시각으로 순환.
- main bb95726f9 CI Jest 331 suites / 4,960 tests 전부 통과, cron coverage 통과. 그 뒤 Mongoose 정적 검사 오류는 명시적 $set/$inc/$pull 객체로 수정(fc68ceb1f). 관련 20 tests, mongoose-update-pipeline, cron-mongo-op-coverage 로컬 통과.
- 최신 통합 main f5e50dec4a19fc3d5e91307d87656e0fc80c52f2 push. 해당 CI 37107283782에서 Critical checks 및 Typecheck and lint 통과 확인. Build 확인 중. shell-dictionary-parity의 기존 오행 균형도 차이로 전체 CI는 아직 통과하지 못함.
- 가격 B도 복원 수정과 가격 가드 보정 반영. 마지막 a2e62d36f21ca7b6fd47c5246438364afac11162, 미배포. 인증·가입보상·DB 스키마 유지.
- Windows 전체 Jest 추가 실행은 330 suites / 4,959 tests 통과, 기존 pass-check 정적 정규식의 CRLF 조건 1건 실패. Linux CI는 해당 테스트 포함 전부 통과했으므로 구분해서 보고.
- 남은 외부 작업: 10/5 운영 가격/할인 확인 후 게시 및 고정, 영냥이 게시 대상 확인, Facebook/Kakao 현재 소개/캐시 수정. 기본 이미지 6장 확보. Codex heartbeat 10-5-threads는 유지. 원문·이미지 때문에 작업 폴더 보존.

## 10/3 연이·영냥이 10장 개편 (최신)

- 사용자가 확정한 계획에 따라 1번 원본 해시를 유지하고 2~10번 1080×1350 JPEG를 제작했다. 새 일러스트는 built-in ImageGen으로 연이 선물·영냥이 리딩·두 캐릭터 별지도 3개 생성. 신규 네오 그림 없음. 기존 assets 파일은 보존.
- preview.html은 최종 10장 갤러리, v2/manifest.json은 순서, v2/posts.json은 게시 원고 정본. 두 계정 첫 글과 공용 답글 9개 모두 500자 이하. captions.md 및 image-prompts.md 동기화.
- 초융합·무료 타로·실제 오행 차트·상담 소장·외부 도구용 리포트 프롬프트·동의된 사람 후기·확인한 두 대통령 원문을 반영. 30일 유효와 현금 출금 불가를 카드에 표시.
- 이미지 크기·원본 SHA·원고 길이·이미지 로딩·하단 겹침은 v2/validation.json 및 layout-check.json에 기록. 전체 카드를 눈으로 확인.
- heartbeat 10-5-threads를 최신 v2 자료로 갱신했고 10/5 09:00 KST 유지. 아직 Threads에 게시하지 않음. 가격/할인 운영 확인 및 영냥이 계정 확인 후 실행.
- 이번 개편에서는 결제 API·가격·인증·DB 및 서비스 기능 코드를 변경하지 않았다. 이전 코드 검증 기록과 이번 홍보물 검증을 구분한다.

## v2 전달 검증 결과

- 홍보물 커밋 d5d1854ae, main 통합·push d3ba3e6d310d4929c0606d57b34ed022e8966356. 원격 직전 main 88cfd91a6와 비교 시 이번 차이는 marketing 및 이 문서뿐이다.
- GitHub CI 37126103981: Build Pages and Worker, Typecheck and lint 성공. Static guards는 verify:public-mirror-fresh의 기존 index.html 및 public 언어별 미러 8개 불일치로 실패. 전체 CI 통과 아님. Main drift 37126103998도 같은 실패. Secret Scan, AI Locale Gate, Landing Watchdog 성공.
- 로컬 check:fast는 doc-freshness와 여러 paid gate 통과 뒤 출력 정체로 중단. 이미지/원고/해시/레이아웃 대상 검증과 git diff --check는 통과.
- 다음 행동: D:\Development\codedestiny-worktrees\moonstone-oct05-20261003-151816에서 이 문서와 가격 전환 문서를 읽고, 기존 public mirror 불일치는 해당 서비스 변경 담당 범위에서 확인한다. 10/5에는 운영 가격·부분 할인 및 실제 영냥이 계정을 확인한 뒤 v2/manifest.json과 posts.json으로 게시·고정한다. 운영 승격 승인 없이 승격하지 않는다.
