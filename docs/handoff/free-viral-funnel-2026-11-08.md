---
status: active
updated: 2026-11-08
next: "1단계 — 공용 스레드 공유 + 공용 공유 바 컴포넌트"
---

# 무료 바이럴 퍼널 (초간단 무료 사주 + 운명의 꽃·최애 운명 무료 개방)

## 첫 행동
1. `Set-Location D:\Development\codedestiny-worktrees\free-viral-funnel-20261108-110954` 후 `git status`·`git log --oneline -3`.
2. 설계: `docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md` 를 끝까지 읽는다(결정·파일·검증이 모두 거기 있다).
3. 아래 단계 중 체크 안 된 첫 단계만 한다. 끝나면 체크·결과 메모를 이 문서에 적고 커밋한다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\free-viral-funnel-20261108-110954`
- 브랜치: `wt/free-viral-funnel-20261108-110954` (base origin/main `1a9f0fb18`)
- 주 체크아웃 `D:\Development\code-destiny` 는 다른 세션의 `feat/world-cast-page` + 미커밋 작업 → **건드리지 않는다.**
- node_modules 는 주 체크아웃으로의 정션. 워크트리 제거 시 정션부터 끊는다(설계 문서 아님, CLAUDE.md).

## 승인 상태 (2026-11-08, 사용자)
- 계획 승인(ExitPlanMode). "기존 것 무료 개방", 최애 운명 "결과 카드만 무료"(details 5,000원 유지), 공유 해제 "버튼 누르면 해제".
- 커밋은 자동. **push·배포·main 머지는 승인 안 됨** — 끝나면 보고만.

## 작업 규칙과 함정
- CLAUDE.md(저장소) 규칙을 따른다: 라우팅·공유 변경은 RED, `package-lock.json` 수정 금지, SEO 체크리스트.
- `docs/context/design-canon.md`: 이모지는 🌸·🦁만, 유아어 금지, `--yn-*` 와 `--cd-*` 토큰 분리.
- 사내 원칙 "새 보상·공유 강요 팝업은 없다"(`docs/purchase-journey/IMPLEMENTATION.md:71`) — 공유 미션은 팝업 금지, 결과 안 인라인 카드. 5단계에서 예외를 문서화.
- 카카오 공유에는 해제 조건을 붙이지 않는다. 코인·금전 보상 없음.
- 범위 밖 버그·정리 거리는 고치지 말고 이 문서 "후속" 절에 적는다.
- 검증은 실제 명령 출력으로. 실패하면 그대로 적는다.

## 단계
- [ ] 1. 공용: 스레드 intent + 공용 공유 바(X·스레드·복사·이미지 저장) + trackShare
- [ ] 2. 운명의 꽃 무료 개방(worker requireAuth 제거 + IP 제한, 레거시 클라이언트, 공유 바·CSS 공개 연출)
- [ ] 3. 최애 운명: 결제 검사를 details 로 이동, 슬롯 공개 연출, 문구·레지스트리 설명, 공유 바 교체
- [ ] 4. `/saju/free` 초간단 무료 사주(폼·70/30·블러·공유 미션·PNG 카드·SEO·사이트맵)
- [ ] 5. 문서: 공유 미션 예외 기록, 이 문서 status 정리
- [ ] 6. 전체 검증(타입·린트·테스트·사이트맵 --check·브라우저 390px)

## 결과 메모

## 후속(범위 밖, 보고만)
