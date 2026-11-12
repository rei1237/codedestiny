---
status: blocked
updated: 2026-11-06
next: "origin/main의 홈 H1·hero first-paint CI 실패가 해소됐는지 확인한 뒤 c02362782를 main에 전달한다."
---

# 연이 운명의 찻집 팔 오류 긴급 수정

## 왜

운명의 찻집 웹툰 네 번째 컷에서 연이의 팔이 세 개로 보이는 오류를 지정된 컷만 교정하고 운영 배포한다.

## 지금 상태

- 안전 워크트리 `D:/Development/codedestiny-worktrees/consultation-tea-arm-fix-20261106-111700`, 커밋 `c02362782`에 이미지와 자산 메타데이터 수정이 완료됐다.
- `origin/main` 최신 커밋 `a5fe57bdd`의 기존 CI가 홈 H1 중복과 hero first-paint lock 위반으로 실패해 push와 운영 승격을 보류했다.

## 남은 작업

- [ ] 최신 `main` CI가 정상화됐는지 한 번 확인한다.
- [ ] 정상화됐으면 최신 `origin/main`을 반영하고 `npm run check:pre-push`를 통과시킨 뒤 `c02362782`를 `main`에 push한다.
- [ ] 새 main CI를 한 번 확인하고 승인된 production workflow를 실행해 실행 URL을 기록한다.
- [ ] 운영 전달 뒤 이 문서를 `status: done`으로 닫고 안전 워크트리를 배수한다.

## 정본

`public/images/consultation-webtoons/tea.webp`

## 함정

- 정확한 대상은 “명식과 카드에 비친 흐름을 함께 살펴봐요.”가 있는 네 번째 컷이다.
- 뺨을 받치던 여분 팔만 없애고 명식 위 왼손과 타로 카드 위 오른손을 유지했다.
- 연애 비책 확장은 아직 시작하지 않았다. 이 긴급 수정의 운영 배포를 끝낸 뒤 별도 작업으로 진행한다.

## 검증

```text
node --test __tests__/ui/consultation-webtoon-entry.test.mjs
npm run check:fast -- --plan
npm run check:fast
npm run check:pre-push
```

모두 통과했다. `check:fast`는 4,615개 테스트를 통과했다.

## 모르는 것

- 기존 `main`의 홈 화면 CI 오류를 어느 세션이 언제 수정할지는 확인하지 않았다.
