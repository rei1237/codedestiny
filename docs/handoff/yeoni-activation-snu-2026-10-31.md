---
status: active
updated: 2026-10-31
workspace: D:/Development/code-destiny/.codex-worktrees/activation-rewards-20261031-145450
branch: wt/activation-rewards-20261031-145450
---

# 연이 활성화·SNULIFE 제휴 코드 전달

## 최신 결정과 승인 경계

2026-10-31 사용자 요청: 기존 main CI 복구 확인 → 최신 main 통합 → 검증 → main push → CI 확인. 이후 제휴 접수 조건에 맞춰 제목·본문·5:4 썸네일 1장·혜택 페이지·검수용 이용 방법을 다시 준비하도록 요청했다.
학생 인증은 필수가 아니다. 사용자가 선택한 구현·제출 준비안은 **게시일부터 3개월, 총 1,000계정, 계정당 1회**다. 운영 혜택 제공·코드 활성화·게시·메일 발송은 별도 최종 승인 대상이다.

## 구현

- 기존 무료 사주 튜토리얼과 첫 단건 현금 상담 전달 후 월정석 보상은 기존 승인 방향 유지. 가입 보상 기존 수령자는 추가 지급하지 않는다.
- /snu/는 가입·로그인 → 제휴 코드 → 본인 출생정보 프로필 하나 → 검토된 비 LLM 콘텐츠 10종 해금. 학교 이메일·학생증 인증을 요구하지 않는다.
- 지정 10종: 라이트 사주, 대운, 퀀텀 명리, 사주로 보는 여행지, 빌런 사주, 건강 흐름, 매력 카드, 재능 스킬 트리, 비밀의 집, 동물 운명. 일반 공개 무료 사주보다 넓은 지정 유료 해금 혜택이며 AI 유료 상담은 제외한다.
- Mongo 단일 캠페인 문서에서 addToSet과 배열 인덱스 조건으로 1,000계정 한도를 원자적으로 지킨다. 계정 식별자는 캠페인별 해시, 코드는 해시만 저장한다. 고유 _id로 재시도 중복을 방지하고 설정 변경으로 수량을 초기화하지 않는다.
- SNULIFE_BENEFIT_CODE / SNULIFE_STARTS_AT / SNULIFE_ENDS_AT 미설정·잘못된 기간이면 닫힌 상태. 운영 값은 아직 설정하지 않았다. 게시 승인 후 충분히 긴 무작위 코드와 한국시간 시작·종료일을 별도 운영 승인으로 설정한다.
- 모집 종료 후 기존 콘텐츠 재열람은 유지한다. 기존 학교 인증 수령 경로도 호환 보존하며 구매·환불 회수 권리는 insertOnly로 보호한다.
- /snu/와 /first-steps/ noindex 유지, 기존 SEO 정본을 보존했다.

## 통합·검증

기존 main 1592b601354873390b62b57be659acf8efbde48e의 공식 CI 성공 확인: https://github.com/rei1237/codedestiny/actions/runs/41189260100
최신 main 병합 커밋: 3de056ad5ea23bfb139f4b6ce52ce5921ee9e514. 유일한 충돌 sitemap-lastmod 원장은 최신 main 기준으로 생성기를 다시 실행했다.

- targeted Jest 8파일 98/98 통과. 수량 한도 직전 동시 요청, 중복, 만료, 잘못된 코드, 설정 변경, 일반 이메일 계정, 기존 권리·인증·탈퇴·보상 보존 확인.
- node --test __tests__/ui/activation-entry.test.mjs: 2/2 통과.
- TypeScript noEmit 통과. scoped ESLint 오류 0, 기존 /ggulggul/ 전체 문서 이동 a 링크 경고 4개.
- verify:env-parity 통과(기존 alias 경고 7개), verify:worker-no-undef 통과.
- 실제 SnuWelcome 컴포넌트 가상 API 브라우저 확인: 360/1280px, 잘못된 코드·등록·프로필 해금·새로고침 재열람·수량 마감·비회원. 가로 넘침 없음, 이미지 로딩 정상, 브라우저 오류 0. 인증·프로필 API는 가상값이며 실제 통합 동작으로 확대 해석하지 않는다.
- check:fast -- --base=origin/main --plan 확인, 실행은 대규모 npm test 단계에서 지연되어 중단. 전체 통과가 아니다. 다른 세션의 오래 실행 중인 검사 프로세스는 건드리지 않았다.
- 공식 main CI 결과와 check:pre-push 결과는 최종 전달 시 아래 갱신한다.

## 제출 자료

D:/Development/code-destiny/outputs/snulife-partnership-20261031/
- posting-copy.txt: 제목·본문·혜택·이용 방법·기간·수량·유의사항.
- snulife-yeoni-code-1500x1200.png: 5:4 썸네일 1장. 학생 인증 문구를 코드 방식으로 교체하고 대통령 주장 제거. built-in image_gen 편집 후 1500x1200 내보내기. 프롬프트·출처: public/assets/marketing/snulife/provenance-code-v2.json.
- usage-and-review.txt: 검수용 이용 방법. 운영 코드가 발급됐다고 안내하지 않는다.
- campaign-plan.txt / reply-after-readiness-draft.txt: 최신 준비안·미발송 초안.
- 혜택 URL 예정: https://code-destiny.com/snu/ (운영 활성화 완료 의미 아님).
- 썸네일의 실제 서비스 사본: public/assets/marketing/snulife/yeoni-saju-code-v2.webp.

무료 제휴는 운영진의 [제휴] 게시, 최장 3개월. 상단 고정·[공식제휴] 표기·광고주 계정은 포함되지 않는다. PC 메인 최근 6개 노출로 상시 메인 노출을 보장하지 않는다. 서울대학교 추천·공인 및 진로·취업 결과 보장 표현을 쓰지 않는다.

## 운영 경계·남은 확인

실 LLM·실결제·운영 DB 지급·실제 메일·게시·운영 승격은 미실행. 별도 최종 승인 후 게시 시작·종료일 및 실제 코드 설정, 운영 동선·기존 결과 보존 확인, 준비 상태에 맞춘 자료 갱신과 발송을 진행한다. 기존 main과 루트의 타 세션 변경을 보존한다.

## 전달 기록

기능 커밋: 8602c9c26. check:pre-push 전체 통과(63개 서비스·미러 일치·1037 URLs·llms·entity registry). 로컬 main의 타 세션 미커밋 변경과 충돌해 fast-forward는 안전하게 중단됐다. 미커밋 파일을 보존하고 최신 원격 main을 포함한 이 작업 HEAD를 origin/main으로 직접 push한다. 공식 CI는 push 후 최종 보고 직전에 1회 확인하며 진행 중이면 성공으로 표기하지 않는다.
운영 활성화·최종 혜택 제공·게시·메일 발송은 별도 승인 대기. 이 문서의 done은 개발·자료 준비 전달 상태이며 운영 집행 완료를 뜻하지 않는다.

## 운영 전달 후속 작업 (2026-10-31 승인)

검수 코드 3계정·14일을 정식 1,000계정·게시일부터 3개월과 분리했다. 기존 등록자는 다른 캠페인 수량을 추가 소비하지 않는다. 현재 운영은 1592b601, /snu/ 404, SNULIFE 설정 없음으로 확인했다.
CI 실패 3종을 복구했다: onboarding description, auth.guestMoonstoneTeaser 12언어 정본, 단건 해금 DB 작업의 withMongoRetry 경계(재시도 0). 새 DB 경계 때문에 실 DB 연결을 시도하던 두 검증기의 DB 대역을 보완했고 결제 로직·검사 조건은 유지했다.
검증: 제휴 관련 테스트 27개(초기 25개 후 캠퍼스 2개 추가), 쉘 문구 4개, 웹훅 원장 22개, 단건 결제 회귀 검증, 크론 Mongo 커버리지, 중첩 재시도, payment-freeze, TypeScript, scoped ESLint, env-parity 통과. check:fast 첫 실행 paid-gate 88/90, 실패한 2개는 보완 후 개별 통과. npm test 결과는 439/440 suites, 7202/7207 tests였고 실패한 웹훅 파일 22개는 최신 대역으로 개별 통과했다. 전체 검사를 다시 반복하지 않고 공식 CI로 판정한다.
남은 순서: commit/pre-push/main push → 공식 CI 성공 → 공식 production 워크플로 → 양쪽 SHA 일치 → 검수 설정·전용 테스트 계정의 실제 해금/재로그인/보존 확인 → 자료 갱신 → 기존 스레드 ad@snulife.com에 1회 답신. 실제 결제·과금 LLM은 하지 않는다. 운영 검증 실패 시 발송하지 않는다.

추가 CI 발견: /onboarding은 폐지된 개인정보 수집 화면의 예약 리다이렉트다. 가드를 유지하고 새 무료 사주 안내를 /first-steps/로 옮겨 충돌을 해소했다. 검수 코드 설정도 로컬 운영 쓰기 없이 GitHub production workflow_dispatch의 configure_snulife_review=true 선택으로만 최초 적용한다. 기존 설정이 있으면 덮어쓰지 않는다.
