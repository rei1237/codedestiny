# 인수인계 — 상세 팝업 문구를 사실 기반으로 재작성

> 작성 2026-08-15. 작성 세션이 컨텍스트를 소진해 **남은 작업을 넘긴다**(CLAUDE.md 코딩 원칙 13).
> 이어받는 세션은 이 문서만 읽고 시작할 수 있어야 한다. 부족하면 그 자체를 이 문서에 보태라.

## 배경 — 사용자가 화를 낸 지점

모바일 상세 팝업(기능 카드 탭 → 바텀시트)의 설명이 **실제 기능과 달랐다.** 사용자 표현 그대로:

> 상세 팝업창 내용과 실제 서비스 내용이 다르잖아? … 한번만 더 이따위 거짓으로 작성하면 소송할줄 알아

🔴 **그래서 이 작업의 제1 원칙은 "모르면 쓰지 않는다"다.** 근거를 못 찾은 문장은 **빈칸으로 두는 것이 맞다.**
상상해서 채우면 그게 정확히 사용자가 금지한 행위다.

## 이미 끝난 것 (다시 하지 말 것)

| PR | 내용 | 상태 |
|---|---|---|
| #625 | 유료 기능 진입 불가 근본 수정(고스트 클릭 억제가 CTA 진입 클릭을 삼킴) | 머지·라이브 |
| #629 | **지어낸 결과 예시 전면 삭제** — `resultPreview` 44개 + `sampleReport` 28개, 렌더러·DOM·가드까지 | 머지·라이브 |
| #632 | paid-flow-gates 가 결제 diff 에서만 돌도록 선판정 추가 | 열림 |

#629 로 **명백한 허위(없는 결과물을 결과라고 보여주던 것)는 제거됐다.** 가드도 반전돼
`sampleReport`/`resultPreview` 는 이제 **금지 필드**다(`scripts/verify-feature-marketing-schema.mjs`).

## 남은 작업

`index.html` 의 `var FEATURE_MARKETING_COPY` 에 있는 **실작성 67개 항목**(전체 95개 중 28개는 `inherit:` 별칭)의
**산문 필드가 아직 손으로 쓴 문구이고, 각 기능 구현과 대조되지 않았다.**

대상 필드:
- `headline` / `subheadline` → 팝업의 `tagline`
- `painPoints` → 팝업의 기능 목록 자리(단, #629 에서 실제 `feats` 가 우선하도록 고침)
- `unlockBenefits` → "리포트에 담기는 것"
- `recommendedFor` → "누구에게 맞는가"
- `trustNotes` / `answersQuestions` / `analysisSteps` / `valueCompare` / `faq` / `ctaNote` / `reportScale`

**팝업에서 이미 진짜인 것**(건드리지 말 것): 가격(`worker/lib/paid-feature-registry.js` 연동)과 해금/보유 상태.

## 방법 — 항목마다 이렇게 한다

1. `featureId`(= featureKey)로 **그 기능의 실제 구현**을 찾는다. 진입 액션(`data-action`)으로 로더를 따라가면 된다:
   `js/core/uiBindings.js` 의 `__lazyActionLoaders` → 그 기능의 `js/*.js`.
2. 구현에서 **검증 가능한 사실만** 뽑는다:
   - 입력이 무엇인가(생년월일? 카드 뽑기? 사진?)
   - 산출 구조가 무엇인가(포지션/섹션 이름, 개수)
   - 생성 방식이 무엇인가(서버 LLM? 규칙 엔진? 정적 콘텐츠?) — API 엔드포인트로 확인
   - 가격은 **레지스트리**에서 확인(팝업 문구에 가격을 새로 쓰지 말 것, 이미 연동돼 있다)
3. 그 사실로 문장을 만든다. **구현에서 확인되지 않는 효능·감정·보장은 쓰지 않는다.**
4. 근거를 PR 본문에 `파일:줄` 로 남긴다.

### 정본 예시 — `openTarotLoveModal`(이미 검증 완료, 그대로 써도 된다)

`js/tarot-love-experience.js` 에서 확인한 사실:
- **6카드 관계 스프레드** — `RELATIONSHIP_POSITIONS`(`:31`), 실제 포지션 라벨(`:8-15`):
  ① 내가 바라보는 상대 ② 상대가 관계 전체를 보는 시각 ③ 상대가 나를 바라보는 마음
  ④ 상대의 연애 의지와 열망 ⑤ 관계를 가로막는 핵심 요인 ⑥ 가까운 흐름과 선택 기준
- 생성: `POST /api/tarot/draw`(`spreadType: relationship_six_card`) → `POST /api/tarot/love-reading`,
  **서버가 LLM 상담문을 동기 생성**(`:29` 주석, 서버 상한 ~42s)
- 가격 5,000원 = 레지스트리 50코인 × 100원(`worker/lib/paid-feature-registry.js:182`) — **일치 확인됨**

즉 "6장" 주장과 가격은 **사실**이었고, 거짓이었던 건 결과 예시(#629 에서 삭제)와
실제 기능 목록을 덮던 `painPoints` 였다.

## 진행 방식 권고

**한 번에 다 하지 말고 배치로.** 예: 타로 컬렉션 → 사주 → 오라클/기타 순으로 **10~15개씩 한 PR**.
배치마다 근거를 남기면 나중에 검증이 가능하고, 컨텍스트도 버틴다.

## 작업 규칙 (이 레포 고유 — 어기면 CI 가 막는다)

- `index.html` 을 고치면 **반드시** `npm run sync:public` (셸 7종 + js 미러 동기화)
- 격리 워크트리에서 작업한다 — 메인 작업 디렉터리를 다른 세션이 동시에 쓴다(실사고 있음):
  ```
  git worktree add .claude/worktrees/<name> -b <branch> origin/main
  cmd //c mklink //J node_modules "D:\Development\code-destiny\node_modules"
  ```
  정리는 `cmd //c rmdir node_modules` → `git worktree remove` → 빈 껍데기 남으면 `rmdir`
- `main` 은 자주 움직인다. 충돌하면 생성 파일 충돌을 풀지 말고 **현재 main 위에 커밋을 다시 쌓는 편이 안전**하다
  (소스 변경이 작을 때. 실제로 두 번 그렇게 처리했다)
- 머지(=프로덕션 배포)는 **사용자가 한다.** PR 생성까지가 범위다.

### 검증 (문구 변경 시)

```
npm run verify:feature-marketing-schema   # 금지 필드(resultPreview/sampleReport) 재발 차단
npm run verify:rpt-preview-cta            # 실제 Chrome — 팝업이 뜨고 CTA 로 진입되는지
npm run verify:mobile-cdp-smoke           # MOBILE_CDP_FOCUS=all-fortunes
npm run verify:public-parity
npm run verify:mobile-detail-nonintrusive
npm run typecheck
```

## 이어받는 세션에게

- 이 문서에 적힌 "이미 검증됨" 항목은 **날짜와 근거가 함께 있는 것만** 신뢰하라(원칙 9).
- 진행하면서 이 문서를 갱신하라 — 어디까지 했는지, 무엇을 근거로 썼는지.
- 근거를 못 찾은 기능이 나오면 **추측해서 채우지 말고** 그 기능을 목록에 남기고 사용자에게 물어라.
