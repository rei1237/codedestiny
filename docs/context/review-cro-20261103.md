status: awaiting-main-integration

# 후기 전환율·익명성 개선 인수인계

## 완료 범위

- 결과 하단에서 별점만으로 제출 가능한 `QuickReviewComposer` 추가
- 빠른 후기 태그, 선택형 한 줄 후기, 세션 초안 보존, 짧은 감사 모션 추가
- 서버의 기존 후기 보상 정책 문구와 지급 상태를 UI에 연결
- 제출과 공개 동의를 분리하고 공개 동의 기본값을 OFF로 변경
- 공개 후기 작성자 완전 익명화 및 이메일·전화번호·생년월일·주문 식별자 보호 처리
- 후기 수정·숨김·공개 동의 철회 API/화면 추가
- 보관함·결과 열람·보상 내역에서 작성 가능/완료/지급 상태 노출
- 개인정보 없는 GA4 후기 퍼널 이벤트 추가
- 모바일 320/390px 및 PC 1280px 브라우저 시나리오 검증 완료

## 구현 커밋

- `61ae2d25c` feat(reviews): streamline anonymous reward flow
- `00437afb1` chore(reviews): sync static review assets

## 검증 결과

- `npm run typecheck` 통과
- 후기 Worker Jest 3 suites / 36 tests 통과
- 후기 공유·보상 문구 UI 테스트 6 tests 통과
- `node scripts/verify-review-anytime-ui.mjs` 320/390/1280 통과
- `npm run verify:public-mirror-fresh` 통과
- `node scripts/generate-llms-txt.mjs --check` 통과
- `npm run verify:seo-entity-registry` 통과
- `npm run verify:repo-hygiene` 통과

## 전달 차단 요인

`npm run check:pre-push`가 이번 후기 변경과 무관한 `config/sitemap-lastmod.json` 드리프트에서 중단된다. 기본 체크아웃의 다른 세션이 해당 파일을 561행 추가/561행 삭제 상태로 수정 중이므로 이 작업에 섞지 않았다.

## 다음 행동

1. 다른 세션의 사이트맵 원장 변경이 `main`에 반영되면 이 워크트리에서 `git fetch origin main` 후 `git merge origin/main`을 실행한다.
2. `npm run check:pre-push`를 다시 실행한다.
3. 통과하면 커밋된 HEAD를 `origin/main`에 전달하고 main CI 결과를 한 번 확인한다.
4. 전달 완료 뒤 이 문서의 `status`를 `done`으로 닫고 안전 워크트리를 배수한다.

