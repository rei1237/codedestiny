---
status: done
updated: 2026-10-17
next: "원격 main 통합 완료. 최종 CI 결과를 확인하고 자동 승인 검토로 차단된 워크트리 정리는 보존 상태를 유지한다."
---

# 운명의 섬 무료 탐험 전환 인수인계

## 작업 위치
- 디렉터리: D:\Development\codedestiny-worktrees\island-free-20261017-172151
- 브랜치: wt/island-free-20261017-172151
- 구현 커밋: c70354de968c982177f9bdf56b7dd4627985010c
- 기반 origin/main: 79d01e63302fb18230b0ce1516721175ffdb330b
- 원격 main 통합·push: bc1d7efab242234cd1cc37340627cb86d23b658f. 운영 승격은 실행하지 않음.

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

## 최초 차단과 해결
- 기존 main CI: https://github.com/rei1237/codedestiny/actions/runs/39016747491
- Static guards 실패: scripts/verify-saju-summary-browser.mjs:335, 실제 14 !== 기대 12. CI required도 failure. 이번 변경 이전의 실패다.
- 2026-10-17 후속 요청으로 기존 실패 수정을 진행했다. 14개 장과 추가된 선택지 비교·건강과 회복 장을 검증하는 dfd2527ab를 로컬 브라우저 전체 시나리오에서 확인했다.
- push 직전 다른 세션이 같은 실패를 고친 0e4b85d38을 올렸다. 상대의 더 엄격한 전체 제목 검사를 유지하여 bc1d7efab에 병합했고, pre-push 통과 후 원격 main에 fast-forward push했다.
- 통합 CI: https://github.com/rei1237/codedestiny/actions/runs/39019552707
- 주 체크아웃 D:\Development\code-destiny의 index.html, templates/home-funnel.html, 홈 테스트·미러에 다른 세션 미커밋 변경이 있음. reset/stash/덮어쓰기 금지.

## 전달·보존 확인
- 공유 체크아웃 main은 3be4b029d에 있고 최초 원격 main보다 218개 커밋 뒤처져 있다. 미커밋 홈 변경은 최신 홈 개편과 충돌하므로 해당 체크아웃·인덱스·브랜치 포인터를 변경하지 않았다.
- 미커밋 10개 파일과 미추적 스크립트 2개의 작업 전후 SHA-256 일치를 확인했다. 미추적 스킬 디렉터리도 유지했다.
- 기존 섬 구현의 56개 테스트·타입/린트 검증에 더해, 사주 브라우저 검사의 모바일/데스크톱 × 복원/기존 해금 × 4개 폭 시나리오가 exit 0으로 통과했다.
- verify-payment-service-boundary, verify-paid-feature-billing-policy 및 병합 커밋 check:pre-push 통과.
- 최초 통합 CI에서 남아 있던 유료 섬 전제 검사 3건을 발견했다. 앱 구매·무료 해금 차단, 과거 Family 스키마 보존, LLM 재생성 금지를 검증하도록 수정했다. 관련 Jest 3스위트 125개와 Node UI 31개 통과. 최초 CI의 타입/린트와 Pages/Worker 빌드는 통과했으며, 실패했던 문서 메타데이터도 보완해 전체 216개 문서 검사 통과.
- 동시 push된 찻집·심리테스트 변경은 origin/main 병합으로 보존했다. 공유 main 체크아웃의 미커밋 파일은 수정하지 않았다.
- 운영 승격과 기존 미완료 구매의 운영 환불/처리는 별도 승인 영역이다.

## 임시 파일
.tmp/island-preview에는 mock 캡처와 검사 로그가 있다. 후속 작업에서도 정확한 절대 경로·재분석 지점 검사를 포함한 별도 삭제 명령이 자동 승인 검토에서 blocked by policy로 거절되었다. 삭제를 우회하지 않고 워크트리와 임시 파일을 보존한다. .tmp/island-ci-watch.log는 이번 CI 확인 로그다. 다른 세션 파일은 수정·삭제하지 않았다.
