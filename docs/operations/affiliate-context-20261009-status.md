# 제휴 문맥 추천 작업 상태
status: in-progress

- 요청: 운세 글/개인 결과/탐색 관심사 기반 도서 중심 추천, 쿠팡 AF7837486 및 알리 공식 링크, 관리자 실등록, 화면 검증, 공식 CI/운영 반영.
- 시작 main: 740a11726196fee0e094b32e3bf0efa61809d02a. 운영 Pages: e02024ef42854fa7b35f7c972f26928e136d78bc (2026-10-09 직접 GET).
- 작업 경로: D:\Development\code-destiny\.codex-worktrees\affiliate-context-20261009-015938
- main의 index.html/미러 및 다른 untracked 파일은 타 세션 소유. 보존.
- 쿠팡 공식 링크 UI 로그인 및 AF7837486 확인. 운영 관리자 로그인은 사용자가 완료. 상품 0, 초안 0 확인.
- 알리 포털: Browser site-safety policy 차단. 우회 금지. 사용자에게 Tracking ID/공식 링크 요청, 사용자가 확인 위치 질문하여 안내. 비밀키 수집 안 함.
- 로컬 네트워크 제한: 일반 curl/gh 실패. escalation 실행에서 운영 SHA 및 gh 인증 성공.
- 이번 요청은 추천 카탈로그/설정 운영 등록과 공식 운영 반영을 명시 승인. 실제 결제/LLM/정산은 범위 밖.
- 체크리스트: [x] 기존 코드 및 기반 확인 [ ] 문맥 계약/단위테스트 [ ] 도서/링크 사실 검증 [ ] 관리자/화면 연결 [ ] 실등록 [ ] targeted 검증 [ ] main 통합/push/CI [ ] 공식 배포 [ ] live 확인 [ ] 워크트리 정리

## 구현·검증 2026-10-09
- 사용자 제공 Ali Tracking ID: NEO2277. 운영 저장 전, 공식 상품 링크 미확보, Ali OFF 유지.
- 페이지별 주제 계약/보수적 조언 어댑터/부정문·타인·가정 제외, 도서 판본·내용·관점/판매처·통화·색상 매핑 구현. 원문 외부 전달·프로필 저장·LLM 호출 없음.
- 쿠팡 공식 포털 발급 도서 6권을 affiliate-catalogue-20261009.json에 보관. 운영 등록은 아직 0.
- 로컬 브라우저: boundaries → 거절 잘 하는 법, budgeting → 돈의 심리학. desktop/mobile 검수, 단일 카드 빈 공간 수정 후 visual checker 확인. 하단 공통 내비게이션이 안내 제목 일부를 가리는 기존 현상은 범위 밖.
- npm run check:fast -- --plan 및 check:fast 실행. 최초 sitemap drift 실패 후 생성물 갱신. 두 번째 실행: paid gates 88/88, lint, typecheck, node, worker dry-run, entry encoding 통과; Jest 354 suites / 5377 tests 통과(exit 0).
- 추가 잘못된 조언 배열 회귀: node --test __tests__/ui/recommendations-context.test.mjs 7/7 통과. Worker 추천 테스트 7/7 통과.
- 이미지 hash만 변경한 자기 WT HTML 8개는 원상복귀하여 타 세션 main dirty HTML과 충돌하지 않게 제외.
- 쿠팡 활동매체 확인은 포털 내 정보 MFA 사용자 완료 대기. 관리자 자체 로그인 완료와 별개. Ali 도구 site-safety 차단은 우회하지 않음.
- 다음: main 최신 통합/CI, 공식 배포, 운영 관리자 자료 등록, 공개 게이트 확인 및 live 화면.
