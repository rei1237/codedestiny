---
status: in-progress
updated: 2026-11-22
next: 무료 탐색 허브를 통합하고 전체 소스의 local gate·Linux 일반/모의 AIT·비공개 QR·실기기 검증을 이어간다.
---

# ai-saju-studio 전체 이식

## 첫 행동
node docs/toss/build-service-inventory.mjs가 발견한 ID와 11월 14일 감사의 차이를 확인한다. 연동은 원본 컴포넌트와 원장을 참조한다.

## 지금 상태
기준 origin/main 0cb2f18c09ad8945c1082736d41d4164e820a2e8. 워크트리 D:/Development/codedestiny-worktrees/toss-full-parity-20261122-093536, 브랜치 wt/toss-full-parity-20261122-093536. 다른 세션이 main 작업 중.

## 승인 상태
2026-11-22 사용자 “모든 서비스의 이식과 필요한 운영 검증이 끝나기 전에는 공개 출시하지 마.” 과거 무료 기능·기존 기록 우선 출시 권한은 철회되었다. automation-2를 읽기 전용으로 수정했다. 약관 동의, 새 검토 제출·기존 검토 취소, 실결제, 판매 활성화, 운영 배포, 공개 출시는 별도 결정이다. 검증 소스의 비공개 테스트 QR 준비는 승인 범위다.

## 작업 규칙과 함정
개발 검증은 격리된 mock. 실 LLM·실결제·운영 DB 쓰기 금지. 웹 saju-compat-premium과 기존 토스 compat-saju-compatibility를 같은 구매 권리로 취급하지 않는다. 이전 기능표 생성기는 원본 감사와 후보 수가 달라 실패한다. 과거 모의 행렬의 행 수로 출시 가능 수를 집계하지 않는다.

## 설계
홈·입력·계산·생성·저장·재열람 근거를 연결한다. 11월 22일 콘솔 QR21(324b95f47)은 출시 준비됨. 보관 중인 Linux AIT(209371928)의 SHA256 6bbbc743faece1ca6f021cca49cf3df8c54118fe9246e8ea23a7409cff5f3d0f 확인. 최초 조회에서 운영 Pages와 Worker는 74b09ef7b. 별도 배포 44966532658 진행 중.

## 단계
- [x] 자동화 수정 및 QR21 상태 재확인
- [ ] 기능표 갱신과 누락 기능의 원본 이식
- [ ] UI·인증·구매·생성·결과 모의 검증, 가상 모바일 제공
- [ ] Linux AIT·비공개 QR 및 소스 CI
- [ ] 실기기와 별도 운영 검증 후 최종 후보

## 11월 22일 통합 검증 중간 기록

- 현재 통합 커밋 3ca540eaae. 운영 조회 /version.json, /api/version 모두 74b09ef7b. QR21 콘솔과 5개 등록 상품의 금액·SKU·노출 꺼짐을 재확인했다. 증거 D:/tmp/toss-release/console-20261122.json. 토스 신규 판매 플래그 false.
- 웹 별칭을 대조해 고급 궁합을 별도 상품으로 구현하고 영냥이 FAQ, 프로필 편집, 흑월의 도입 웹툰과 초안 복원을 연결했다. 웹 무료 목록은 별도로 점검 중이다. 원본 MP3 123곡의 메타데이터 중 1곡 404. 세부 사항은 docs/toss/launch-operational-evidence-20261114.md 참조.
- 이전 Linux AIT 209371928에서 홈 73건, 질문 복원, 소유 결과 재열람·단절 후 복구·타 계정 거부 확인. 신규 기능의 Linux 증거와 구분한다. Windows 모의 archive 01a200c1-7dab-7038-88a9-3f2fac3bfb59에서 프로필 수정, 흑월, 고급 궁합 흐름 통과. 이 중간 archive는 확장량이 101,437,712바이트로 기준 초과여서 업로드할 수 없다. 오프라인 카드 78장의 해상도를 유지한 재인코딩으로 3.6MB 감소를 측정했으며 새 archive에서 정식 용량 검사를 해야 한다.
- 가상 모바일 http://127.0.0.1:4346/preview (격리된 중간 통합판). 사본은 D:/tmp/toss-release/full-parity-20261122. 추가 확인은 실제 운영 주문 소유권, 승인 SKU와 판매 상태, 실기기 로그인·네이티브 파일·키보드 및 서버 최신 소스 반영. 운영 행위는 각각 별도 승인이다.
- 첫 check:fast는 결제 78개와 lint 후 sitemap 원장 드리프트로 중단. 공유 웹 ProfileForm·ProfilePicker 등 전이 의존성을 정식 sitemap:generate로 갱신한 뒤 다시 전체 게이트 진행.
