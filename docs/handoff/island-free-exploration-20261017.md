# 운명의 섬 무료 탐험 전환 인수인계

status: blocked-main-ci
updated: 2026-10-17

## 작업 위치
- 디렉터리: D:\Development\codedestiny-worktrees\island-free-20261017-172151
- 브랜치: wt/island-free-20261017-172151
- 구현 커밋: c70354de968c982177f9bdf56b7dd4627985010c
- 기반 origin/main: 79d01e63302fb18230b0ce1516721175ffdb330b
- 통합·push·운영 승격: 실행하지 않음.

## 요청과 구현
- 사용자 요청: LLM 상담 제거, 모든 궁 정적 결과 무료화, 궁·시기 중심 개편, 새 섬 이미지, 캐릭터 이동과 게임형 탐험.
- destiny-island.html 및 미러: 새 회화 지도, 연이 이동·바로 도착·모션 줄이기, 12궁 목록·방문 수첩·정적 해석·연도 선택·대한 항로.
- worker/routes/ziwei-island.js: 기존 계산기로 무료 reading/timing 전달. 인증·DB·LLM 없음.
- worker/routes/ziwei-island-ai.js: 새 준비/생성 POST 410, 기존 결과 GET 소유자·환불 검증 유지. 부분 저장도 재생성 없이 보존.
- 섬 2상품 saleEnabled=false. 과거 주문용 키·가격과 기존 정적 리포트 해금 API 유지. 자동 상담 복구에서 섬 제외.
- 기존 상담 화면은 무료 전환 안내와 기존 결과/PDF 유지. 다른 자미두수 상품·가격·계산식·인증·DB 스키마 유지.
- 홈 상세 문안·생성 미러·마케팅 JSON 갱신. sitemap:generate로 lastmod 원장 갱신.
- 이미지: public/images/destiny-island/exploration-map-v3.webp, 485840 bytes. image_gen 출처는 docs/design/destiny-island/art.jsonl.

## 검증
- Worker 섬 2스위트 14개 통과: 무료 결과, 무주성, 시간 미상, 연도 변경, 잘못된 입력, 신규 판매 차단, 기존 결과 소유자/환불/부분 저장.
- Worker 호환 5스위트 28개 통과: ziwei-expired-order-access, ziwei-payment-verify, paid-delivery-inventory, paid-non-llm-delivery, consultation-recovery-task.
- Node UI 14개 통과: destiny-island-birth-input, island-consult-pdf-export, island-free-exploration.behavior.
- ESLint 변경 파일 --quiet 및 npm run typecheck: exit 0.
- verify-phone-encryption, verify-payment-service-boundary, verify-llm-generation-resilience(1275 checks) 통과.
- mock Playwright 360/390/430/1280: JS 오류·문서 가로 넘침 없음. 실제 이동 transform, 바로 도착, 방문 기록, 연도 변경, 늦은 응답 차단, 여행 중 수첩 전환 확인.
- impeccable finish review 2회. 지도 fit·메뉴 잘림·비동기 경쟁 수정. 마지막 퀘스트 내부 넘침은 아이콘 숨김과 gap 축소로 수정. 기존 레거시 스타일 감지 경고는 남음.
- check:fast -- --plan 실행. 실제 check:fast는 critical 전체 90개 스위트로 확장되어 진행 중, 기존 main 실패 확인 뒤 광범위 로컬 반복 중단. 전체 통과로 표시하지 말 것.
- check:pre-push 첫 실행 lastmod drift → sitemap:generate → 구현 커밋 amend → 재실행 exit 0. home-service-registry, public-mirror-fresh, sitemap-drift, llms, seo-entity-registry 통과.
- 신규 커밋 CI·실 LLM·실결제·운영 DB·배포 검증은 미실행.

## 외부 차단
- 기존 main CI: https://github.com/rei1237/codedestiny/actions/runs/39016747491
- Static guards 실패: scripts/verify-saju-summary-browser.mjs:335, 실제 14 !== 기대 12. CI required도 failure. 이번 변경 이전의 실패다.
- 사용자 규칙에 따라 실패한 main 위로 push하지 않는다.
- 주 체크아웃 D:\Development\code-destiny의 index.html, templates/home-funnel.html, 홈 테스트·미러에 다른 세션 미커밋 변경이 있음. reset/stash/덮어쓰기 금지.

## 다음 작업
1. 인수인계·정확한 SHA·현재 origin/main CI부터 확인한다.
2. 기존 실패가 해소되면 동시 작업을 보존하며 main에 직접 통합한다. 새 브랜치/PR은 만들지 않는다.
3. index.html과 생성물 충돌은 정본 병합 후 sync:public·sitemap:generate로 해결한다. 관련 검사·committed-tree pre-push 후 main push와 CI 확인.
4. 운영 승격과 기존 미완료 구매의 운영 환불/처리는 별도 승인 영역이다.
5. 완료 후 이 문서를 status: done으로 닫고 node_modules 정션 먼저 해제 → 자기 워크트리 제거 → 병합된 wt 브랜치 삭제. 현재는 미통합 작업 보존을 위해 유지한다.

## 임시 파일
.tmp/island-preview에는 mock 캡처와 검사 로그가 있다. 문서 작성·커밋·폴더 삭제를 묶은 명령이 자동 승인 검토에서 blocked by policy로 거절되어 삭제를 보류했다. 그 외 다른 세션 파일은 수정·삭제하지 않았다.
