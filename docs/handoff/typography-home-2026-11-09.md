---
status: done
updated: 2026-11-09
next: 구현과 검증 완료. 최종 커밋을 pre-push 후 main으로 전달하고 자기 워크트리를 정리한다.
---

## 첫 행동

이 문서와 `docs/design/typography-home-20261109.md`를 읽고 git 상태를 확인한다. 승인 재확인 없이 이어 진행한다.

## 지금 상태

- 작업 경로: `D:\Development\codedestiny-worktrees\typography-home-20261109-051034`
- 브랜치: `wt/typography-home-20261109-051034`
- 구현 `15d948bdf`, 번역·링크 보완 `f004acd7c`, 최신 main 합치기 `599d997ece7782f1cebb07f9b54d83d9c8d4793a` (base `4ee6c81148d5ccc19afbd0143232aa81d4ad0bcb`). 최종 소제목 수정은 이 문서와 함께 커밋한다.
- origin/main의 `81390e622f2e689f3e50e54fc6666d3f71eaee90`까지 보존해 합쳤다. 해당 CI는 확인 당시 진행 중이었다(릴리스 workflow 성공을 required CI 성공으로 혼동하지 않는다).
- 공식 계획 후반 로그: `build-cache/typography-final-guards.log`. Jest 466개 스위트/7,903개 테스트 통과(각 1개 제외). 결과 소제목 실서체 재검증 4개 조합 통과. 검증 상세는 디자인 문서에 기록했다.

## 승인 상태

사용자 2026-11-09 원문: “PLEASE IMPLEMENT THIS PLAN”. 주아체 제목·Pretendard 본문, 고민 탐색 통합, 무료 입구 확대/상단 이동, mock 검증·커밋·main push 승인. 운영 승격은 포함하지 않는다.

## 작업 규칙과 함정

원본 `D:\Development\code-destiny`와 실제 main 체크아웃은 다른 세션의 미커밋 변경이 있다. reset/stash/편집하지 않는다. 이 격리 워크트리에서 검증하고 fast-forward `git push origin HEAD:main`으로 전달한다. PR/force push/실 LLM/실결제/운영 DB 쓰기 금지.

전체 Node 검사의 23개 실패는 실제 번역·웹툰 링크 복원과 옛 구조 검사를 갱신해 해당 100개 모두 통과했다. 전체 재실행 성공으로 보고하지 않는다. 로컬 성능의 LCP/폰트 전송은 증가했으므로 속도 개선을 단정하지 않는다. Ego 첫 캡처는 viewport가 잘못돼 폐기했고 `build-cache/typography-home/`의 Playwright 캡처만 사용한다.

## 설계

자세한 구현과 검증 수치는 위 디자인 문서가 정본이다. 결제·인증·API·DB·LLM·계산·기존 결과 및 저장 동작은 보존한다.

## 단계

- [x] 폰트/읽기 역할, 같은 사이트 공식 WOFF2·라이선스 구성
- [x] 홈 통합, 무료 6개 확대·상단 배치, 앵커·가격·웹툰·번역 보존
- [x] 브라우저·관련 회귀·typecheck·lint·77개 경계 검증
- [x] 남은 공식 검사, 커밋, 최신 main 합치기, pre-push
- [x] 미리보기 산출물 내보내기, 인수인계 문서 done 처리

전달 절차: 최종 커밋 뒤 pre-push → main fast-forward push → 자기 워크트리 정리 → CI 결과 1회 확인. 이 기록을 운영 승격 승인으로 해석하지 않는다. 최종 전달 SHA·CI 상태·정리 결과는 완료 보고가 정본이다.
