---
status: in-progress
updated: 2026-11-17
next: CI 검증기의 팝업 재방문 초기 상태 수정 검증을 마친 뒤 main 통합·pre-push·push와 승인된 production workflow 1회 실행을 완료한다.
---

# 프로필·꿀방울·달빛 다이어리 전달

## 첫 행동
- D:\Development\code-destiny 에서 이 문서를 읽고 현재 main의 추적 파일 변경과 origin/main을 확인한다. 이미 구현한 화면을 다시 설계하지 않는다.
- 재개는 handoff 스킬을 사용한다. 2026-11-17 추가 승인으로 기존 CI 실패 원인 수정과 production 승격 1회까지 진행한다.

## 지금 상태
- 구현과 mock 기능·시각 검수는 완료했고 로컬 main에 fast-forward 병합했다. PR은 없다.
- 기준 원격 main: c4d928dd8628c8f38ca3e293419440094b32c6c1.
- 주요 커밋: 0b38ddf4a(반복 모델), 66aa7c514(다이어리 UI/초안), 23ed6e79e(프로필/꿀방울/캐시·미러), 2d5f7455a(mock), 010955ffa(표면 문서).
- 이 문서 갱신 전 마지막 커밋: 30beb97e5. push하지 않았다. 후속 CI 수정 작업은 D:\Development\codedestiny-worktrees\profile-ci-release-20261117-181221에서 진행한다.
- main의 다른 세션 소유 .claude/skills/fire-your-seo-agency/는 보존했고 커밋하지 않았다.
- 후속 작업 중 주 main에 다른 세션의 사주 커밋 c6fb0712a와 미커밋 수정이 추가됐다. 이번 검증은 해당 변경이 없는 별도 워크트리에서 수행하며, 운영 대상은 프로필 개선과 CI 검증기 수정 커밋으로 한정한다. 원격 상태를 다시 확인해 비 fast-forward를 강제로 덮지 않는다.
- 작업 워크트리와 wt/profile-diary-20261117-074709 브랜치는 로컬 main 병합 확인 후 배수했다. 저장소 removeWorktree의 baseRef=main 확인을 사용해 정션을 먼저 끊었으며 main node_modules는 유지했다.

## 승인 상태
- 2026-11-17 사용자: "Please implement the plan."
- 2026-11-17 추가 사용자: "그럼 실패 원인 분석 후 프로필 UX 개선 작업 운영해도 반영해줘". 프로필·꿀방울·다이어리 개선과 CI 실패 수정의 이번 production 승격 1회를 승인했다.
- 프로필 운세 이용 중심 개편, 기존 꿀방울 사용처 연결, 달빛 예화의 전체 화면 다이어리와 월·주·일/반복 일정/할 일/일기 개선을 승인했다.
- 실 LLM·실결제·운영 DB 쓰기 승인은 없다. 기능 검증은 로컬 mock을 사용하고, production은 GitHub의 Release Cloudflare Pages and Worker(mode=production)로만 요청한다.

## 작업 규칙과 함정
- 원격 기준 main CI가 이미 실패했다: https://github.com/rei1237/codedestiny/actions/runs/43973468383 .
  c4d928dd8에서 복원한 cdSignatureConsultPopup을 verify-detail-first-entry.mjs가 폐기된 cd_signature_consult_session_closed_v1 키로 닫으려 했다. 제품은 cd_signature_consult_seen_v3/KST 날짜를 사용하므로 배경 카드 클릭이 팝업에 막혔다.
- 검증기는 팝업의 내부 저장 키 주입을 제거하고 실제 닫기 버튼과 Back 이후 비표시를 확인하도록 수정한다. 재방문자의 쿠키는 기존 essential 선택으로 고정해 별도 쿠키 배너와의 초기 경쟁을 제거한다. 제품 팝업·동의 정책은 수정하지 않는다.
- 첫 수정 검수에서 360px 전체 7카드 통과 뒤 390px 쿠키 버튼이 상담 팝업에 가려졌다. 쿠키 UI를 먼저 누르는 초기화 대신 기존 essential 쿠키를 가진 재방문 상태를 사용한다. 검증 조건을 force-click/숨김 CSS로 우회하지 않는다.
- 새로운 origin/main이 있으면 로컬 main에 통합하고 관련 충돌·회귀를 검증한다. 이번 push는 기존 CI 원인 수정도 포함한다. CI/스테이징/production 배포 폴링 금지.
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
- [x] 후속 검증기 4fbf01828: verify:detail-first-entry의 360·390·430·1280 × 전체7카드=28흐름 통과. 실제 닫기/포커스/CTA/Back·과금 호출0을 확인했다. 팝업 단위8개와 검증기 eslint도 통과했다.
- [ ] 후속 check:fast(base30beb) 전체 종료 확인. paid77·lint·typecheck·사이트맵은 통과했고 Node/Jest 검증 진행 중이다.
- [ ] CI 원인 수정 포함 main 원격 전달, 승인된 production workflow 1회 실행. 실행 URL을 전달하고 배포를 폴링하지 않는다.

## 재개 정보
- 실제 작업 디렉터리: D:\Development\code-destiny
- 문서: D:\Development\code-destiny\docs\handoff\profile-diary-2026-11-17.md
- 기준 마지막 구현/문서 커밋: 30beb97e5
- 다음 행동: 후속 검증과 커밋·main 통합·check:pre-push 후 git push origin main. 승인된 production workflow를 1회 실행하고 URL을 전달한다. push 뒤 최종 보고 전에 CI 결과 1회만 확인한다.
