---
status: done
updated: 2026-11-15
next: 구현 완료. 운영 승격은 하지 않으며, 실기기 검수 항목은 결과 문서의 미검증 목록을 따른다.
---

# 달빛 연화당 개인 공간

## 첫 행동
`docs/design/moonlit-lotus-space.md`와 `D:/CodeDestiny-Build/moonlit-lotus/space-v1/`의 결과·검수 로그를 확인한다. 이전 브라우저 검수 공간과 작업 워크트리는 전달 후 정리한다.

## 지금 상태
- 작업 디렉터리 `D:/Development/codedestiny-worktrees/moonlit-lotus-space-20261115-184751`
- 브랜치 `wt/moonlit-lotus-space-20261115-184751`, 기반 main `6243d576776ae2b6905ab3c3ba01aacb8b39a124`.
- 기존 연이 80컷 v2는 `066f97e97`에 완료, main 푸시됨. 원본·model-review는 이번 단계에서 수정하지 않음.
- 공간 구현 커밋 `8a2407cf1`, 다른 세션의 최신 main 보존 병합 `47e61dbdf797c60ecf9fcd2fb5ede468e9df417b`. main에 fast-forward 완료.
- 로컬 mock 미리보기 `http://127.0.0.1:24106/moonlit-lotus/`, API 24107. main의 다른 세션 34052 서버는 건드리지 않는다.
- 다른 세션의 `.claude/skills/fire-your-seo-agency/` 미추적 파일 보존.

## 승인 상태
사용자는 2026-11-15 대화에서 2D 전환, 상세 스프라이트, 사찰 내부, 개인 기도·참배·108배·확언·프로필 이미지 커스터마이징, 실제 흐름 검수 및 저장소 전달 절차를 요청했다. main commit/push 권한은 유지된다. 실결제·운영 DB·실 LLM·운영 승격은 승인되지 않았으며 사용하지 않는다.

## 규칙과 함정
- check:fast 1회: 결제 관련 77 검사와 lint 통과 후 sitemap 원장 드리프트로 중단. 공식 sitemap:generate 후 verify:sitemap-drift와 typecheck 통과. 전체 check:fast 통과로 보고하지 않는다.
- 신규+기존 관련 자동 검사 29개 통과. 최종 변경 후 관련 검사만 수행한다.
- CI는 다음 push 직전/최종 보고 전 1회 조회. 기다리거나 폴링하지 않는다.
- 브라우저 data URL 동적 import는 CSP 차단. CSP를 풀지 않았고 실제 UI+IndexedDB 검수 fixture로 대체했다.
- UI 캡처는 design-canon 규칙에 따라 visual_checker가 검수. 모바일 중심·불상 버튼·데스크톱 전신 수정 확인 완료. primary hover 대비 결함도 수정.
- 프로필 이미지는 현재 서비스의 저장된 RPG 친구다. 사진을 AI 전신 스프라이트로 만드는 기능이 아니다.
- 영냥이는 네오와 같은 캐릭터라는 이번 사용자 계약을 우선한다. 이름표 없음.
- 워크트리 제거는 main에서 npm run worktree:remove -- 경로. node_modules 정션을 직접 재귀 삭제하지 않는다.

## 설계
- Space.tsx React 상태, 기존 8.84초 bow_once와 80컷 연이 재사용. 새 배경 3장×2해상도, 고양이 32컷.
- 브라우저 IndexedDB 계정|프로필 범위. 세션 owner/revision/lease 12초 CAS, 완료기록과 세션을 같은 트랜잭션으로 저장. 내용 없는 삭제 표식으로 재생성 방지.
- 다른 이용자 접속·presence·WebSocket 없음. 기도·확언·횟수는 서버로 보내지 않음. 브라우저 로컬 저장이며 암호화 보관함/기기 동기화가 아님.
- 현재 프로필 GET만 재사용. 음악 23곡, 확언 풀, 일기 운세 어댑터 재사용. 기존 인증·결제·서버 DB 변경 없음.
- 기능 플래그 `_lib/config.ts`, 홈 카드와 새 화면을 함께 끈다. 기존 모델 검수는 유지.

## 단계
- [x] 내부·마당·연못 그림 및 스프라이트 생성/가공
- [x] 기도·참배·명상·확언·음악·운세·개인 기록·꾸미기 구현
- [x] 37회 복원, 107→108, 미완료 새로고침, 소유권 차단 UI 검수
- [x] 음악 실제 재생·탐색·타이머, 운세 왕복, 계정 분리, 기록 수정·삭제
- [x] 최종 장애/감소모션/두 탭/메모리 검수와 정확한 미검증 항목 기록
- [x] 문서·구현 커밋·pre-push 통과·main 병합
- [x] 본 문서 done 처리. push/CI 최종 상태와 작업 환경 정리는 최종 전달 결과를 따른다.

## 전달 준비 결과
실제 IndexedDB 동시 claim 두 건 중 하나만 성공, stale save 거부, 완료 기록 1개, 삭제 뒤 완료 재전송 시 0개 유지. 음악 실제 재생과 오류 복구, 홈 한 번 진입, 운세 왕복, 자정 fixture 확인. 최종 자동 검사 22+7 통과, typecheck 통과. 기록은 로컬 전용이며 실제 모바일 기기·화면 낭독기·운영 부하 시험은 미검증이다. 미리보기 서버는 main에서 `npm run dev`, 기본 `http://127.0.0.1:34052/moonlit-lotus/?scene=hall`로 재현한다.
