---
status: awaiting-upstream-integration
updated: 2026-10-23
---

# 상담 선택 간소화 전달

## 완료한 구현

- 별도 ‘마스터로 찾아보기’를 제거하고 초융합 운세의 전문가 아이콘 5개를 기존 개별 AI 상담으로 연결했다.
- 사용자의 정정에 따라 초융합의 기존 설명·태그·분야 안내·버튼을 복원했다. 초융합 디자인을 더 줄이지 말 것. 아이콘만 링크로 연결하는 것이 확정 의도다.
- 최신 요청의 세 영역을 개선했다. 추가 상담 목록은 서비스명·짧은 고민·화살표, 네오 이메일은 그림·본문 분리와 옵션 펼침, 다른 재밌는 운세는 모바일 8주제 2열·선택 체크·관련 운세 제목·이동 화살표로 정리했다.
- 대표 홈·꿀꿀운세·영냥이에 공유 안내와 FAQ를 연결했다. AI 상담과 직접 검수 이메일의 범위를 구별했다.
- 이용권·월정석·단건 결제, 가격 레지스트리, 인증·결제·API·DB·계산 로직은 변경하지 않았다.

초기 구현: `a27f0224fbaaf7851768ffcb4a69c69ba860b37b` (로컬 main 반영).
최신 화면 수정: `eb84e44ddf88af54bef078b76ec9531ad60b41fc`.
최신 검증 커밋: `df6271740453e1066cd65c31b1646a49c5669deb` (공식 사이트맵 날짜 원장 갱신).
원격 push는 하지 않았다. 이 문서를 포함한 로컬 main 통합 최종 상태는 출력 보고서에 기록한다.

## 검증

- 홈 3개 × 360·390·430·1280px 12개 렌더링 통과.
- 390px 글자 200% 모의 확대, 키보드 포커스, 44px 터치 영역, 링크, 접힘, FAQ 구조화 데이터 통과.
- 영냥이 입력·초안 복원·모의 로그인 복귀·결제 선택·취소·재시도 검사 통과. 실결제·실 LLM 호출 없음.
- 최신 상담/홈 링크/네오 계약 테스트 32개, 앞선 정적 정책 페이지 테스트 8개 통과.
- `npm run check:pre-push`, 홈 생성기 `--check`, `git diff --check` 통과.
- `npm run check:fast`: 종료 0. 결제 안전 90개, lint·typecheck·Node·Worker dry run·Jest 424개 모음/6,738개 통과. 초기 구현부터 실행한 검사이며 마지막 화면 수정은 관련 32개와 12개 렌더링으로 재확인했다.
- 최신 화면 검사에서 8주제 전환, 아이콘 5개, 네오 옵션 키보드 펼침, 다크·200% 모의 확대 통과. 스크롤한 viewport의 옵션 hit test와 추가 상담 4개 시각 검토까지 완료했다.
- 최신 pre-push 최초 실행은 사이트맵 날짜 원장 차이로 실패했다. 공식 생성 후 커밋 df6271740에서 재실행해 통과했다.
- 디자인 자동 검사 종료 0, 차단 0, 권고 147개. 기존 대형 스타일 파일의 타입 단계 등은 별도 기록했다.
- 실제 Next 운영 빌드·기기 키보드·브라우저 자체 확대·원격 CI·운영 배포는 미검증.

## 전달 보류 사유

최신 fetch에서도 origin/main은 `a5c053ad6fb8fc181c654dd9b300ec451d65a433`이다. 초기 구현 main 반영 시 로컬 고유 80개·원격 고유 22개였고, 후속 커밋이 추가되었다. df6271740의 읽기 전용 병합 사전 검사에서도 기존 13개 충돌을 확인했다. 다른 작업의 엔진·정책 변경을 임의 선택하거나 강제 push하지 않는다.

충돌 경로:

```
__tests__/ui/consultation-budget.test.mjs
__tests__/ui/yeongnyangi-natal-claims.test.mjs
__tests__/ui/yeongnyangi-reading-v5.test.mjs
app/components/AnalyticsConsent.module.css
app/components/AnalyticsConsent.tsx
config/sitemap-lastmod.json
docs/handoff/yeongnyangi-accuracy-followups-20261023.md
public/sitemap-ko.xml
public/sitemap.xml
sitemap-ko.xml
sitemap.xml
worker/yeongnyangi/fortune/ask/question-policy.ts
worker/yeongnyangi/fortune/saju/natal-claims.ts
```

main의 기존 미추적 `.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md`는 보존했다. 작업 워크트리와 브랜치도 원격 전달 완료 전까지 보존한다.

## 재개

작업 디렉터리: `C:\Users\user\Documents\Codex\worktrees\mobile-clarity-20261023-122535`

기록/화면: `C:\Users\user\Documents\Codex\2026-10-23\premium-yehwa-service-clarity\outputs\premium-yehwa`

```text
C:\Users\user\Documents\Codex\worktrees\mobile-clarity-20261023-122535에서 C:\Users\user\Documents\Codex\worktrees\mobile-clarity-20261023-122535\docs\handoff\premium-yehwa-service-clarity.md를 읽고, main의 다른 세션 변경을 보존하며 검증 커밋 df6271740453e1066cd65c31b1646a49c5669deb 포함 여부를 확인하라. 먼저 원격 분기와 기존 13개 충돌의 담당 작업 상태를 재확인하고, 합의된 통합 뒤 check:pre-push와 일반 push, main CI 확인을 이어가라. 초융합 기존 디자인과 아이콘 링크를 유지하고 강제 push하지 말며 완료 전까지 워크트리를 보존하라.
```
