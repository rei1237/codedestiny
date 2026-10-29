---
status: active
updated: 2026-10-29
next: 전달한 main CI 결과를 확인하고 미이식 원장의 다음 기능군을 실제 입력·결과·보관 계약까지 이식한다.
---

# 앱인토스 달빛 디자인·일일 운세 전달

사용자 요청: 달빛 예화 톤을 전체 화면에 적용하고 남은 기능 이식과 CI 오류를 마무리하며 출시 준비를 계속한다.

작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-launch-20261028`
마지막 코드 전달: `4fac6d6f5aec76a590bf8d49dac36e5c660c7237`, origin/main push 완료. 다른 세션의 홈 변경 `98b7c0bfa`를 보존해 병합했다. PR 없음.
정본: `docs/toss/2026-10-28-launch-plan.md`, `docs/toss/design-brief.md`.

## 구현·검증

- 공통 달빛 종이/테두리/제목/TDS 버튼. 연이·네오 색 유지. 모바일 입력 접근성 이름 보완.
- 기존 영냥이 일일 운세 15유형의 출석·열기·계산·저장 결과·근거/차트/프롬프트 연결. 호라리 제외. 가격과 출석 비용은 기존 서버 정본 유지.
- 미니앱 103/103, 타입/AIT/Worker dry-run, paid-gate 90/90(전체 npm test 포함), lint/typecheck와 원래 검증 계획의 남은 개별 검사 통과. check:fast의 중복 Node/Jest 재실행은 중지했으므로 단일 프로세스 완료 성공으로 쓰지 않는다.
- 360/390/430/1280px 화면 확인. 네이티브 SafeAreaInsets는 일반 브라우저에서 미검증. 실계정/결제/실 LLM/운영 DB 사용 없음.
- CI의 Mongo 커널 호환 문제와 이전 handoff metadata 오류 수정. Gift run 40797077615 성공. PR CI run 40797077663은 마지막 확인 시 진행 중. 대기 반복 금지.

## 남은 출시 조건

- 원장 91후보 중 16부분/75잔여 유지. 일일 운세 15유형은 독립 웹 서비스 15개 완전 이전이 아니다.
- 고유 찻집·전략실과 나머지 독립 서비스, 개인정보 삭제 계약, 전체 SKU 권리 매핑, 토스 실기기 검수.
- 승인 SKU 0, SERVICE_AVAILABLE=false. 콘솔 약관·mTLS·이미지 반려·검수·출시 상태 재확인 필요. 약관 수락/보안 발급은 해당 단계에서 확인.
- 새 AIT는 `D:\Development\code-destiny\outputs\toss-launch-20261029\ai-saju-studio-01a18525.ait`. 업로드·출시하지 않았다.
- 미리보기 서버 4317과 후속 이식을 위해 이 작업 워크트리를 유지했다. 작업 종료 시 자기 정션/워크트리만 정리한다.

재개: 위 작업 디렉터리에서 이 문서와 정본 계획을 읽고 마지막 코드 전달 SHA, 최신 main과 CI를 확인한 뒤 잔여 기능군의 실제 이식부터 이어간다.
