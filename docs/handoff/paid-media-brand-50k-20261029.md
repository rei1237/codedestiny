---
status: active
updated: 2026-10-29
next: 정상 네이버 광고 창의 연결을 확인하고 최신 main CI 실패가 해결된 뒤 검증한 추적 변경을 전달한다.
---

# 꿀꿀 운세 5만원 광고 실행

## 현재 상태
- 승인: 네이버 사이트 홍보, VAT 포함 최대 50,000원. 재승인 불필요. A는 성냥팔이 고등어 고양이, B는 달빛 상담실. 신규 광고비 0원.
- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\paid-media-webtoon-20261028-215429`
- 검증한 코드 커밋: `95a510cc5`. 이후 문서 커밋은 git log -1로 확인. push/운영 배포 미실행.
- 최신 main `03c46893109c4bed46c675b3dc882599ae30896b`를 병합했지만 해당 main CI가 기존 토스 인수인계 frontmatter 누락으로 실패했다. https://github.com/rei1237/codedestiny/actions/runs/40792833469
- 정상 대시보드 네이티브 창 462054는 보이지만 연결된 Chrome 탭 목록에는 없다. 창 재오픈 요청을 반복하지 말 것. 연결된 프로필로 제어하거나 사용자가 제공한 화면으로 수동 등록을 안내해야 한다.

## 검증
- 이전 main 1877a2629 기반 check:fast 통과: Node 3,912 / Jest 7,090.
- 최신 main 병합 후 mock Node 79 / Jest 186, typecheck, check:pre-push 통과. purchase-analytics 22건 포함.
- 실제 PG 결제→상담→보관함, GA 수신과 주문 대사, refund 제외는 미검증. 서버 읽기 감사의 성공 상담 14건만으로 전체 여정 완료를 주장하지 않는다.

## 남은 작업
1. main 실패 해결 확인 후 최신 main 병합 및 check:pre-push, fast-forward push. 다른 main 체크아웃에 미커밋 결제 작업이 있으므로 강제 갱신 금지.
2. 정상 네이버 계정의 기존 캠페인·잔액·자동충전·현재 심사 상태 확인. 중복 생성 금지.
3. 키워드 도구 수치 조회, A/B 그룹 및 이미지 등록, 심사 결과 확인. 현재 등록 파일은 준비본이며 실제 업로드·심사 제출 아님.
4. 추적 운영 반영과 실제 구매 수신, 환불 대사, 결과 재열람 확인 후 승인된 한도 내 활성화. 한도를 보장하지 못하면 OFF 유지.

## 정본
`docs/marketing/ggulggul-brand-50k-20261028.md` / `brand-50k-config.json` / `naver-50k-ad-copy.txt`.

## 재개
`D:\Development\code-destiny\.codex-worktrees\paid-media-webtoon-20261028-215429`에서 이 문서를 읽고 `95a510cc5`와 이후 문서 커밋을 확인한다. 정상 네이버 창 연결 및 main CI 실패 해결 확인부터 진행한다. 자기 워크트리는 전달과 광고 작업이 끝날 때 배수하고 다른 세션 작업은 보존한다.
