---
status: active
updated: 2026-09-10
next: "사주 요약 확장 후 결과 미렌더링 재현·원인 규명"
---

# 2026-09-10 전달 및 사주 렌더링 회귀 인수인계

## 작업 목적

커밋되어 있던 기능들을 PR로 안전하게 전달하고, 첨부 화면의 중복 제목을 하나로 합친 뒤 스테이징에서 확인하는 작업이었다. 사용자가 마지막으로 확인한 문제는 **사주 분량 확장 이후 사주 결과가 아예 표시되지 않는 현상**이다. 이 현상은 아직 재현·원인·수정이 확인되지 않았으므로 해결된 것으로 간주하면 안 된다.

## 현재 전달 상태

다음 PR은 모두 merged 상태다.

| PR | merge SHA | 내용 |
| --- | --- | --- |
| #1884 | `248b4f0434f037a01e2ec1187ff6e9f680bd9e82` | 전달 기반 변경 |
| #1875 | `a83e65116978212b19fdb5869ddd54c88f915c50` | 홈 성능·정적 미러 |
| #1885 | `49fec668aaf20315d8527b5f3de42f1060d3a421` | pass quota |
| #1886 | `ec7f2ea2962938722f4aee2898b89350aac2025f` | 숙요 천문 |
| #1887 | `eb531f49657e77446b99d2aceb6b07c81cf4fdb3` | 버그 제보 |
| #1888 | `abe9acc72a35d4be29f27c0542d3c25fc71a8961` | 사주 대시보드 진입 |
| #1889 | `3f36a334701b4b35f04812e5c08c419e2adba2ac` | 사주 리포트 확장·호환 |
| #1890 | `e0d9349909b744fb2893d15df13df2311271881d` | 관계 성향 제목 중복 제거 |

#1890:
https://github.com/rei1237/codedestiny/pull/1890

스테이징 release workflow `34428760291`은 `e0d9349909b744fb2893d15df13df2311271881d`를 대상으로 성공했다. workflow 내부의 deployed SHA/noindex 검사도 성공했다. 다만 마지막 사용자 중단 요청 이후 별도로 실행하는 아래 3개 명령은 실행하지 않았다.

```powershell
node scripts/verify-deployed-sha.mjs --sha=e0d9349909b744fb2893d15df13df2311271881d --origin=https://staging.code-destiny.com --attempts=1 --delay-ms=0
npm run deploy:smoke -- --base https://staging.code-destiny.com
npm run verify:staging-noindex
```

## 이번 UI 수정

화면의 `사주로 보는 그 사람의 바람끼는?`와 `그 사람의 바람끼는?`를 하나로 합쳤다. 최종 표시 문자열은 **`그 사람의 바람끼는?`** 하나만 사용한다. 관계 성향 진입 경로·결제·응답 계약은 건드리지 않았다.

주요 변경 파일(전달 worktree 기준):

- `D:\Development\code-destiny\.delivery-worktrees\repo-saju-summary\js\core\saju\reportDashboard.js`
- `D:\Development\code-destiny\.delivery-worktrees\repo-saju-summary\js\core\saju\relationshipTemptationAnalysis.js`
- `D:\Development\code-destiny\.delivery-worktrees\repo-saju-summary\__tests__\fortune\relationship-temptation-render.test.js`
- `D:\Development\code-destiny\.delivery-worktrees\repo-saju-summary\__tests__\ui\luck-sync-diary-planner.static.test.js`
- 위 변경으로 갱신된 `public/**` 미러 및 sitemap 생성 산출물

검증: 대상 정적 테스트 11/11, 관계 성향 Jest 2/2, `npm run ci:preflight` 성공, `verify:public-mirror-fresh` 성공, `verify:sitemap-drift` 성공.

## 가장 중요한 미해결 위험: #1889 이후 사주 결과 미렌더링

#1889의 기능 커밋은 다음 핵심 파일과 생성 미러를 크게 바꿨다.

- `js/saju-engine.js` (+221/- 변경 포함)
- `js/core/init.js`
- `js/core/uiBindings.js`
- `js/app.js`
- `js/mobile-interaction-patch.js`
- `index.html`, `styles/fortune-ui.css`
- `public/**` 정적 미러

CI와 정적 테스트가 통과했어도 실제 사주 결과 표시가 보장되는 것은 아니다. 우선 다음을 확인한다.

1. 현재 main/e0d934 기준 새 격리 worktree에서 사주 입력→계산→결과 렌더링을 재현한다. 브라우저 콘솔 오류, 빈 DOM, 예외로 중단된 렌더 단계, 로딩 게이트 잔류를 각각 기록한다.
2. #1889의 `js/saju-engine.js`, `init.js`, `uiBindings.js`, `app.js`, 모바일 패치와 `index.html`의 ID/이벤트/스크립트 순서를 부모 커밋과 비교한다.
3. 렌더러가 기대하는 데이터 shape와 #1889가 확장한 결과 shape를 대조한다. undefined 필드, 구형 fallback 제거, locale별 정적 셸 불일치를 우선 의심한다.
4. 원인을 재현하는 최소 정적/브라우저 테스트를 먼저 추가하고, 결제·인증·API·DB·가격 정책은 수정하지 않는다.
5. 수정 후 `npm run sync:public`와 sitemap 생성기를 실행한다. 생성 미러를 수동 병합하지 않는다. 새 PR의 preflight/required CI 통과 후 staging SHA·핵심 응답·smoke·noindex를 확인한다.

## 커밋되지 않은 작업 판단

- `D:\Development\code-destiny-header-contrast`: 실제 접근성/UI 개선 후보다. 아직 PR/스테이징에 반영하지 않았고 보존한다.
- `D:\Development\code-destiny-marketing-20260909`: 마케팅 콘텐츠 작업(미추적 파일 다수)이다. 제품 배포 대상으로 판단하지 않았고 보존한다.
- `code-destiny-ci-sim`, `.preflight-*`: 생성/검증용 detached worktree로 분류했지만 이번 세션에서는 삭제하지 않았다.
- 잠금된 `.claude/worktrees`, `.codex-worktrees`, 백업·보존 worktree: 건드리지 않는다.
- 루트의 `tmp/pdfs/business-registration-en-1.png`: 사용자 산출물이다. SHA256 `18A88E456D56358322F8EEF29AAC9BB26124D3ECF33E16CE602459160A79DEBA`; 삭제하지 않는다.

이번 세션에서 만든 `.delivery-worktrees/**`와 전달 topic branch도 사용자 요청에 따라 아직 정리하지 않았다. 먼저 회귀 원인을 확인하고, 사용자가 명시적으로 정리 재개를 요청한 뒤 clean·merged·unlocked 조건을 확인해서 후보만 제거한다.

## 다음 세션 시작 프롬프트

```text
이전 세션의 인수인계 문서를 먼저 읽고 이어서 작업해줘.

문서: D:\Development\code-destiny\docs\handoff\2026-09-10-delivery-and-saju-render-regression.md
작업 디렉터리: D:\Development\code-destiny

첫 TODO는 #1889(merge SHA 3f36a334701b4b35f04812e5c08c419e2adba2ac) 이후 사주 입력에서 결과가 아예 표시되지 않는 문제를 현재 main/e0d9349909b744fb2893d15df13df2311271881d 기준 새 격리 worktree에서 재현하는 것이다. 루트 worktree는 편집하지 말고, 먼저 git status와 origin/main을 확인한 뒤 브라우저 콘솔/DOM/렌더 데이터 흐름을 기록해 원인을 좁혀라. 제목 중복 수정(#1890)은 이미 완료되었으므로 되돌리지 말라.

결제·가격·이용권·월정석·인증·DB 스키마·실결제·실 LLM·운영 DB는 건드리지 말라. 원인을 재현하는 테스트를 먼저 만들고 최소 수정만 PR로 올려라. preflight와 required CI가 통과하기 전에는 merge하지 말고, merge 후 staging SHA/smoke/noindex를 검증하라. 미완료 회귀 작업이 끝난 뒤에만 별도 요청이 있을 경우 전달 worktree 정리를 검토하라.
```

