---
status: in-progress
updated: 2026-11-17
next: 기존 main CI 실패가 해소된 원격 커밋인지 1회 확인하고, 정상일 때 로컬 main을 통합·pre-push 검증 후 push한다.
---

# 프로필·꿀방울·달빛 다이어리 전달

## 첫 행동
- D:\Development\code-destiny 에서 이 문서를 읽고 현재 main의 추적 파일 변경과 origin/main을 확인한다. 이미 구현한 화면을 다시 설계하지 않는다.
- 재개는 handoff 스킬을 사용한다. 기존 CI가 여전히 빨간 상태이면 그 위에 push하지 않는다.

## 지금 상태
- 구현과 mock 기능·시각 검수는 완료했고 로컬 main에 fast-forward 병합했다. PR은 없다.
- 기준 원격 main: c4d928dd8628c8f38ca3e293419440094b32c6c1.
- 주요 커밋: 0b38ddf4a(반복 모델), 66aa7c514(다이어리 UI/초안), 23ed6e79e(프로필/꿀방울/캐시·미러), 2d5f7455a(mock), 010955ffa(표면 문서).
- 이 문서 갱신 전 마지막 커밋: 010955ffa. push하지 않았다.
- main의 다른 세션 소유 .claude/skills/fire-your-seo-agency/는 보존했고 커밋하지 않았다.
- 작업 워크트리와 wt/profile-diary-20261117-074709 브랜치는 로컬 main 병합 확인 후 배수했다. 저장소 removeWorktree의 baseRef=main 확인을 사용해 정션을 먼저 끊었으며 main node_modules는 유지했다.

## 승인 상태
- 2026-11-17 사용자: "Please implement the plan."
- 프로필 운세 이용 중심 개편, 기존 꿀방울 사용처 연결, 달빛 예화의 전체 화면 다이어리와 월·주·일/반복 일정/할 일/일기 개선을 승인했다.
- 실 LLM·실결제·운영 DB·프로덕션 승격 승인은 없다. 모든 기능 검증은 로컬 mock이다.

## 작업 규칙과 함정
- 원격 기준 main CI가 이미 실패했다: https://github.com/rei1237/codedestiny/actions/runs/43973468383 .
  c4d928dd8의 기존 홈 cdSignatureConsultPopup이 브라우저 검사 클릭을 가린다. 이번 변경의 회귀가 아니며 범위 밖이므로 수정하지 않았다. 최종 확인에서도 같은 실패였다.
- 전달 시 이 실패가 해소됐는지 1회 확인한다. 새로운 origin/main이 있으면 로컬 main에 통합하고 관련 충돌·회귀를 검증한다. 실패한 main 위에 push하지 않는다. CI/스테이징 폴링 금지.
- 런타임 최종 핀 build-3aef8b273ca0. billing-client.ts는 PAID_SERVICE_RUNTIME_SRC URL 상수만 바꿨고 같은 커밋의 payment-freeze 해시를 갱신했다. 정책·가격·결제 실행 로직은 그대로다.
- 정적 소스 → sync:public 미러를 유지한다. 생성 결과·사이트맵 1086 URL·repo hygiene는 pre-push 검사를 통과했다.
- 브라우저 자동화의 native date fill은 React change 미반영을 보였다. 날짜 세그먼트 ArrowUp 입력은 날짜/폼/실제 저장 모두 동기화됐다. 고정 하단바에 자동 스크롤된 클릭은 키보드 포커스/Enter로 확인했다. 이 도구 현상 때문에 CSS 보정이나 인증 우회를 추가하지 않았다.

## 설계
- 프로필 일주 preview를 일반 진입에서도 실행한다. 오래된 카드 요청과 실패/정보 부족/모듈 실패를 분리하고 재확인을 제공한다. 출생 미입력을 확정값으로 표시하지 않는다.
- 기존 꿀방울 지갑 한 벌을 이동·복귀하고 카탈로그 가격과 실제 잔액으로 사용처/부족분을 표시한다. 서버 unlock만 소유로 표시하며 무료 접근 캠페인을 구매로 표시하지 않는다.
- 프로필 기본 다이어리는 /diary/?from=profile 전체 화면이다. 셸 수명 동안 탭을 옮겨도 프로필 복귀 상태를 유지한다. embedded 책 모달은 opt-in 보조 경로로 남긴다.
- 일정은 월주일, 시간/종일, 매일/선택요일 매주/매월, 종료일, 이번만/전체 편집·이동·삭제를 제공한다. 원본 날짜/ID를 유지하고 범위에서만 반복을 계산한다.
- 할 일 수정/이동/완료, 여러 줄 일기, 날짜별 빠른 추가와 기존 검색/백업을 제공한다. 로컬 저장·noindex 유지, 계정 동기화·알림은 추가하지 않았다.
- 초안 저장은 실제 쓰기 성공 이후에만 저장됨을 표시한다. 실패 글은 유지·재시도하며 앱 내 이동 복구는 메모리 전용이다. 새로고침 후 실패 글 복구를 약속하지 않는다.
- 표면 정본: docs/design/profile-diary.md, .impeccable/surfaces/profile-diary.md. 전역 DESIGN/PRODUCT는 바꾸지 않았다.

## 검증과 단계
- [x] Node 기능 테스트 5168/5168 통과(check:fast critical 자동 선택).
- [x] paid suite 77/77, lint, typecheck, 관련 정책·동등성 검사 통과.
- [x] 마지막 SelfCard textarea 변경 후 별도 typecheck와 해당 파일 eslint 통과.
- [x] npm run check:pre-push 통과(미러·sitemap·SEO entity·repo hygiene).
- [x] npm run check:fast -- --base=c4d928dd8628c8f38ca3e293419440094b32c6c1 전체 exit 0. Jest 479 스위트/8012 테스트 통과, 기존 1 스위트/1 테스트 skip. 별도 전체 빌드는 정책에 따라 실행하지 않았다.
- [x] 기계 감지 1회 []/exit0, 독립 일반 finish reviewer 최종 ship(P2 3건 resolved). 전용 preset을 사용한 것은 아니다.
- [x] 360·390·430·1440 기본/네오 캡처. 반복 적용범위 라디오는 소스·조작으로 확인했고 viewport 이미지 시각 증거는 충분하지 않다.
- [x] 실제 mock: 일주 경진·용/초상화, 꿀방울16·비용30·부족14, 전환 뒤 지갑1개, 주간 반복 일정 저장, 여러 줄 일기 새로고침 유지, 빠른 할 일18일→19일 이동·완료, 프로필→다이어리→달력→프로필 복귀.
- [x] 검수용 일정/할 일/일기 UI에서 정리. ego task50 종료, own dev 종료(22026/22027 listener 없음).
- [x] 구현 커밋과 로컬 main 병합, 자기 워크트리/브랜치와 임시 산출물 정리.
- [ ] 기존 main CI 해소 이후 원격 전달. 운영 배포는 별도 승인 범위다.

## 재개 정보
- 실제 작업 디렉터리: D:\Development\code-destiny
- 문서: D:\Development\code-destiny\docs\handoff\profile-diary-2026-11-17.md
- 기준 마지막 구현/문서 커밋: 010955ffa
- 다음 행동: origin/main 최신 CI를 한 번 확인하고, 기존 실패가 해소됐을 때 로컬 main 통합 및 check:pre-push 후 git push origin main. push 뒤 최종 보고 전에 CI 결과 1회만 확인한다.
