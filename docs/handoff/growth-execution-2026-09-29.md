---
status: active
updated: 2026-09-29
next: main CI와 기존 자동화 저장 결과를 확인하고 승인된 SHA만 운영 승격한다.
---

# CODE DESTINY·영냥이 성장 개선 인수인계

## 재개 위치

- 작업 디렉터리: C:\Users\user\.codex\worktrees\growth-execution\code-destiny
- 문서: C:\Users\user\.codex\worktrees\growth-execution\code-destiny\docs\handoff\growth-execution-2026-09-29.md
- 기준 main: 557f6bcf5b69e7a70d864147e3b3c7aa31b09155
- 구현 및 큐 커밋: 2e5e6228a24fb5e609c9623e0b1799188a607f98
- 상세 관측·가설·참조 1~6·30키워드·3가이드·4주 계획·14일 SNS·지표 정본: marketing/growth-execution-20260929.md
- 화면 증거: C:\Users\user\.codex\visualizations\2026\09\29\01a0ec3d-d2f7-78a0-a792-501230c600dd\growth-execution\index.html
- D:\Development\code-destiny의 다른 세션 다국어 편집이 진행 중이다. dirty main에 reset/stash/checkout/광범위 add 금지. 원격 main이 앞서면 자기 변경을 보존한 뒤 통합한다. PR/새 기능 브랜치 없음.

## 우선순위와 실제 변경

| 우선순위 | 관측한 문제 | 구현 | 상태·검증 |
|---|---|---|---|
| P0 | 복구 한도 종료 후 자동 완성 약속·문의 링크 누락 | held 상태와 ASK_LIMITED 안내·기존 주문 지원 링크 | mock 복구·재결제 차단·부분 결과 재사용 통과 |
| P1 | 홈 초기 HTML에 긴 중복 안내·개발 설명, 접힌 안내의 큰 빈 영역 | 고객용 안내·실제 링크·반응형 레이아웃 | 4폭 전후 스크린샷·H1/overflow·HTML 검사 |
| P1 | 재회 CTA 목적지 불일치·천원 랜딩 클릭 추적 누락 | 실제 재회 도구 action·CTA별 분석 표식 | 링크/분석 검사·공개 URL 감사 |
| P1 | 카드의 출처 없는 역사 권위 표현 | 명반·본명숙의 실제 가치 설명 | 문구 검사 |
| P1 | 게스트 무료 진입과 근거 확인이 늦음 | 로그인 전 무료 사주 링크·첫 차트 펼침 | 기존 정적 무료 계산·입력 보존 검증 |
| P1 | Threads 문체 반복·날짜 구분 없는 UTM·발행 응답 유실 재시도 | 프롬프트 v1·최근30글 중복 검사·전체 문장 보존·글별 캠페인·불확실한 발행 격리 | 일년치 formatter·10개 전후 dry-run·발행 API mock |
| P1 | 기존 T02~T14 미발행 초안이 새 기준과 다름 | 같은 ID/슬롯 13개 교체·구조화 큐·검수기 | 6유형·근거·고민 링크·480한도 통과, 공개 중복 확인은 정상 실행에서 |
| P1 | 최초 UTM 이후 주문/서버 수령 연결 누락 | 동의한 캠페인 30분 귀속·주문 메타·첫 장 시각·읽기 전용 지표/비용 조회 | 11개 분석/집계 검사, 불변 상담 스냅샷 회귀 통과 |
| P2 | 가이드에 직접 답변·구체적 선택 예시 부족 | 사주 입력·재회 타로·자미 이직 기존3편 보강 | 편집 검수 해시·사이트맵/HTML 검사 |

이미 있던 가격 정본, 상품별 질문/목차/편집 예시, Family/단건 안내, 1시간 로그인 초안 복원, 중복 결제 차단, 서버 결제 조회, webhook 멱등 처리, 장별 영속 저장, bounded 재조정, 운영 알림, 보관함·선택 공유는 유지했다. 모두 새로 구현했다고 주장하지 않는다.

DB 모델에는 분석용 growthAttribution과 firstContentAt만 추가했다. 계산 snapshot/해시, 가격·상품 권리·이용권·월정석·단건·Family·인증·PG 계약·LLM 예산·운영 주문은 변경하지 않았다. 실 PG·과금 LLM·운영 DB 쓰기·즉시 Threads 시험 게시 0회.

## 검증 증거

- npm run check:fast -- --plan 및 npm run check:fast 실행. 위험 경로 때문에 paid-gate-suite와 전체 테스트로 자동 승격됐다. 최종 출력은 build-cache/growth-20260929/final-check-3.log. 완료 결과는 이 문서 아래 전달 상태에 기록한다.
- 기존 repository/service mock의 신규 followup export 누락을 수정했다. worker route 40/40 통과. 복구 계약의 지원 경로 금지 단언은 현재 hold 상태에 맞게 수정했고, 실제 보강된 재회 원고의 AI 검수 해시를 갱신했다. 사람 검수·광고 승인을 만들지 않았다.
- node scripts/verify-threads-daily-jobs.mjs: 기존25항목+캠페인/중복 검사 통과. node scripts/verify-sns-daily-post.mjs: 기존 게이트+응답 유실 격리 통과.
- node scripts/verify-threads-queue.mjs: 13편/6유형 통과. node scripts/preview-threads-growth.mjs: 이전/신규10개 비교. 과금 모델 0회, 실제 게시0회. 베다 비교 천체는 고정 mock이며 실제 당일 관측이 아니다.
- node --test __tests__/ui/growth-metrics.test.mjs __tests__/ui/purchase-analytics.test.mjs: 11/11 통과. 서버 결제 확인과 브라우저 열람은 별도다.
- node --test __tests__/ui/yeongnyangi-ui-locale-copy.test.mjs __tests__/ui/publisher-integrity.test.mjs: 17/17 통과.
- 상담 스냅샷 불변성 검사: 3/3 통과, 기준 해시 변경 없음.
- verify-yeongnyangi-consultation-ui.mjs: 360/390/430/1280에서 입력→로그인 복귀→checkout→자동 결과→5장 재조회 통과. verify-yeongnyangi-result-retry.mjs: 390/1280에서 미결제·activate503·동일 주문 복구·완료 장 재사용·중복 클릭 통과.
- 공개6URL 및 언어12조합 200/canonical/H1·JSON-LD 감사. 로컬9URL HTML 검사. sitemap 1,300개는 목록 검사이며 전체 URL 실시간 크롤링이 아니다.
- CWV 실사용자 p75, 네이티브 키보드/PG 앱 전환, 실거래·실 LLM 품질은 미검증.

## Threads 적용·발행 확인

기존 자동화 id code-destiny-2027, target chat 01a08200-90da-73a3-921a-f08cc59ca340, 계정 codedestiny_official, 매일07:10/21:10 KST 유지. Worker는 사주08:30/자미12:00/베다16:00/수비20:30, 기존 cron/잠금키 유지.

Codex 프롬프트는 최신 검수 큐·근거·중복·성과 피드백을 읽도록 실제 automation_update로 저장하고 결과를 전달 상태에 기록한다. 별도 자동화는 만들지 않는다. 기존 로컬 main이 다국어 편집으로 뒤처져 있으면 origin/main의 커밋된 growth 문서/큐를 git show로 읽고 로컬 과거 초안을 사용하지 않는다.

다음 정상 실행은 2026-09-29 21:10 KST(이 시각 전에 적용될 경우). 기존 하루 원글3개 제한·월간/신년 우선순위·공개 중복 검수 때문에 게시 생략 가능. Worker 새 코드의 운영 활성화는 별도 운영 승격 이후다. 적용/예약/실제 게시를 구별하며 실제 게시 URL은 아직 확인하지 않았다.

큐 T01 과거 공개 원문과 기존 ID는 보존했다. T02~T14는 9/9 미게시 기록에서 출발했으므로 정상 슬롯에서 최신 계정30개·content-log와 대조한다. 발행 성공 URL이 있을 때만 상태·로그를 갱신한다. 로그인 장애·불확실한 publish 응답이면 재게시하지 말고 기존 게시ID/container를 확인한다.

## 배포·원복

공개 배포는 미실행. CLAUDE.md:17,53에 따라 사용자 1회 승격 승인이 필요하다. Pages와 Worker가 함께 바뀌었으므로 pages_only 사용 금지.

승인 후 main CI가 통과한 정확한 SHA를 고정한 승인 release ref로 기존 Release Cloudflare Pages and Worker workflow의 mode=production을 실행한다. target_sha는 pages_only 전용이라 전체 승격 고정용으로 오용하지 않는다. 승인 SHA 이후 진전한 main을 자동 승격하지 않는다.

2026-09-29 18:43 KST 읽기 전용 확인: 운영 Pages/Worker 모두 e462be60284da08b4b990c75e2826e328950c5ef. Pages deployment 95d9e69a-d1fe-41ec-8451-37abdf80d77d, 활성 Worker version 5bc04355-0c98-4070-a345-6e0c4379578f. npm run deploy:rollback -- --list를 primary main에서 읽기 전용으로 실행했다(다른 세션 dirty 상태는 그대로 보존). 운영 변경0회.

배포 직전 위 두 ID가 여전히 현재 버전인지 다시 확인한다. 릴리스 내부 smoke 및 Pages /version.json, Worker /api/version의 동일 SHA를 확인한다. 실패하면 기존 workflow mode=rollback에 보관한 두 ID를 사용한다. 화면 증거 폴더의 release-plan.md에는 승인 대상 SHA·승격/원복 명령·현재 운영 이후 전체 main 커밋 목록을 남긴다. 이번 개선 전부터 main에 있던 미승격 변경도 포함되므로 최신 main으로 임의 대체하지 않는다.

코드 원복은 해당 기능 커밋만 git revert한다. Threads Worker는 190a1566e, 분석은 c68e7b1f8, 큐는 2e5e6228a. 이미 공개된 글·URL·성과 로그는 되돌려 지우지 않는다. Codex 자동화는 현재 계정/시간/target을 유지한 채 이전 prompt 텍스트만 복구한다.

## 외부 조건 때문에 남은 확인

1. 운영 승격 승인: 구현과 mock/CI를 운영 적용으로 보고하지 않는다.
2. 운영 DB 읽기 인증 code18: 미제공 주문·실제 비용·실적 전환율 미확인. report-growth-metrics.mjs --read-production 조회 준비 완료. 운영 쓰기 없음.
3. Threads 로컬 토큰 없음/로그인 브라우저 연결 timeout: 최신30개·실제 다음 게시 URL 미확인. 기존 정상 자동화에서 확인한다.
4. GSC/GA4/Naver 로그인: 최신28일/이전28일 비교·사이트맵/최대5URL 요청 미실행. 기존 기록은 9/28의 과거 기간 관측이라고 표시했다.
5. PG sandbox 계약·실기기·실결제/실 LLM 별도 범위: mock 결과로 대체하지 않는다. 없는 PDF/카카오 발송 혜택을 추가하지 않았다.

## 전달 상태

- 원격 main push 완료: 2e5e6228a24fb5e609c9623e0b1799188a607f98. 다른 세션의 dirty main은 건드리지 않고 격리 HEAD를 원격 main에 fast-forward했다.
- 최초 구현 CI: https://github.com/rei1237/codedestiny/actions/runs/36549355659 . 빌드·고위험·타입/lint는 통과했지만 자미 이직 가이드의 생성 JSON 미러가 낡아 Static guards가 실패했다. sync:public로 해당 index와 본문 해시 파일을 다시 생성했다. 최종 후속 CI 결과는 최종 보고와 화면 증거 폴더의 verification-final.json에서 확인한다.
- 로컬 check:fast 종료코드0: paid-gate-suite 88/88, lint/typecheck/sitemap drift, Worker dry-run build, strict-core 인코딩, Jest 316묶음/4,576개 통과. node 테스트 1,879개도 통과했다. 실배포/실 PG/실 LLM 검증은 아니다.
- 기존 자동화 저장: 2026-09-29 18:29 KST. automation_update 성공 후 TOML을 다시 읽어 ACTIVE·rrule·target chat·한글 원문·version·큐 연결을 확인했다. 이름/rrule/target은 원본과 동일하고, 한글 대체 문자0개다.
- 자동화 전후 원문은 위 화면 증거 폴더의 automation-before.json / automation-after.json에 저장했다. 롤백은 automation_update로 이전 prompt만 적용하며 예약과 계정을 바꾸지 않는다.
- 다음 기존 실행 2026-09-29 21:10 KST. 새 Worker 운영 코드 승격과 실제 게시 URL 확인은 아직 미완료다.
