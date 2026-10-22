---
status: active
updated: 2026-10-23
next: "6 — 쿠키 동의 버튼이 하단 sticky CTA를 가리는 문제를 고친다"
---

# 꿀꿀운세 UX 진단·개선 — 후속 과제

## 왜

- 원 작업 요청(2026-10-22): "내 서비스의 사용자 경험상 미흡한 부분 특히 뒤로가기 부분이라든지 그외에도 서비스의 대표 기능들에 대한 강약 조절에 대해서 분석하고 그 외에도 사용자 경험에서 정석적인 부분들에 대해서 적용이 안되어있는 부분을 찾아서 확실하게 개선해줄 계획을 세워 먼저 진단부터 진행하고 그 이후에 하나씩 수정해나간다."
- 이어진 요청
  - "사주 분석 화면에서도 결제 이후에 바로 운세가 열리도록" — 라이트 사주 풀이(10,000원 `section_summary`)
  - FAQ에 "다른 AI 서비스보다 낫다"는 차별점 문항, 쿠팡 광고 수익화 최적화
- 이 문서의 요청(2026-10-23): "후속과제도 모두 진행하고 컨텍스트가 길면 클리어 후 인수인계로 진행할 수 있도록해줘"
- 사용자 결정: 헤더 "홈"은 `/ggulggul/`(하단 탭과 같다), 로고는 `/` 브랜드 홈을 유지한다.
- 원 계획: `C:\Users\user\.claude\plans\wise-pondering-shore.md`(1~7단계). 줄 번호는 작업 당시 기준이니 고치기 전에 `git grep`으로 다시 찾는다.

## 지금 상태 (다시 하지 않는다)

- 1~7단계 전부 로컬 main에 머지됨(push 안 함). 끝 커밋: `f73dc9337`, `5168c0180`, `a99804b6a`(토스트 이중 낭독·PWA 배너 페르소나), `76e2b6722`(사이트맵 원장).
- 후속 1차 묶음 `0733811cc`(워크트리, 머지 대기): 헤더 "홈" → `/ggulggul/`, 죽은 `IntakeChat.tsx` 삭제(`PreparationStep` 타입은 `QuestionCheckout.tsx`로 이동), 신년운세 폼 라벨 12.5px → 14px.
- 라이트 사주 풀이 결제 직후 열기, 라이트 표기, FAQ 차별점 4문항(`lib/brand/differentiation-faqs.mjs`), 쿠팡 배치 최적화는 끝났다.

## 작업 규칙

- `AGENTS.md`·`CLAUDE.md`를 먼저 읽는다.
- 작업 위치: 워크트리 `D:\Development\codedestiny-worktrees\saju-light-resume-20261022-233118`, 브랜치 `wt/saju-light-resume-20261022-233118`. 루트 체크아웃(`D:\Development\code-destiny`)에는 다른 세션의 미커밋 변경이 있다.
  - 루트에서 `reset --hard`·`stash`·`checkout --` 금지. 남의 파일(`.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md`)은 건드리지 않는다.
- 머지 흐름(PR 없음)
  1. 워크트리에서 `git rebase main`
  2. `env -u CACHE_BUST_KEY -u BUILD_CACHE_KEY npm run -s sitemap:generate` → 원장이 바뀌면 커밋
  3. `git -C /d/Development/code-destiny merge --ff-only wt/saju-light-resume-20261022-233118`
  4. 루트에서 `npm run -s verify:public-mirror-fresh`(추적 파일이 깨끗해야 한다)
- 셸 파일(`index.html`, `js/*`, `styles/*`)을 고치면 `env -u CACHE_BUST_KEY -u BUILD_CACHE_KEY npm run -s sync:public`을 **두 번** 돌린다(1회로는 수렴하지 않는다 — 7번 과제).
- 수정이 끝나면 자동 커밋한다. 커밋 끝줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. push·배포는 요청 때만, push는 메모리 `code-destiny-shared-main-push.md` 절차(origin/main 워크트리에 내 커밋만 cherry-pick).
- 과금 LLM 검증 금지(mock), `i18n:translate-pending` 금지. 실결제·운영 DB 쓰기·환불·정산 금지, 운영 DB 읽기는 매번 승인.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 산출물, `worker/wrangler.toml` 구조는 고치지 않는다. 비밀값·고객 개인정보를 출력·저장·커밋하지 않는다.
- 포트로 프로세스를 죽이지 않는다(내 것으로 확인된 경우만).
- UI·라우트 변경 때 SEO 동반 점검(canonical·sitemap·H1·OG 영향)을 커밋 메시지나 이 문서에 남긴다.
- `__tests__/ui`는 jest가 아니라 `node --test`로 돌린다.
- 과제 밖에서 찾은 기존 결함은 고치지 말고 이 문서 끝에 새 번호로 적는다.
- 보고는 한국어로, 진행 상황은 짧게 자주.

## 남은 작업 (우선순위 순)

### A. 사용자 화면 결함

- [ ] **6. 쿠키 동의 버튼이 하단 sticky CTA를 가린다**
  - 할 일: 동의 바가 떠 있는 동안 sticky CTA를 그 위로 올리거나, 동의 바가 CTA 영역을 피하게 한다.
  - 완료 판정: 390px에서 동의 전 상태로 대표 상세 3종 sticky CTA가 가려지지 않는다(스크린숏).
- [ ] **41. 영냥이 "상담과 결제 확인하기" 버튼이 활성 상태에서도 흐려 보인다**
  - 할 일: 활성 버튼 대비를 금빛 filled 기준으로 맞춘다(`app/yeongnyangi/` 질문 입력 화면).
  - 완료 판정: 활성·비활성이 한눈에 구분된다(스크린숏).
- [ ] **8. 결제 게이트 eyebrow에 내부 상태값이 그대로 보인다**
  - 할 일: 상태 코드를 사용자 문구로 매핑한다.
- [ ] **9. 인생의 책 오류 문구(`friendlyErrorMessage`)가 원문 메시지를 흘린다**
  - 할 일: 4단계에서 만든 공용 사용자 메시지 변환으로 바꾼다.
- [ ] **10. `app/_lib/billing-client.ts:2600-2603`이 오류 원문을 보여 준다**
  - 할 일: 같은 공용 변환을 쓴다.
- [ ] **11. 게이트에서 `requestId`가 없으면 아무 안내 없이 끝난다**
  - 할 일: 조용히 return하지 말고 재시도 안내를 보인다.
- [ ] **42. PWA 설치 배너가 `/`·`/ggulggul/`에서 늦게 뜨거나 안 뜬다**
  - 현재: `js/pwa-lifecycle.js`의 `safe()`가 `window.isCriticalOperationInProgress`를 요구하는데, 이 함수는 늦게 로드되는 `js/share.js`만 정의한다. QA에서는 init 스텁으로 우회했다. 운영 재현은 아직 안 했다.
  - 할 일: 함수가 없으면 "진행 중 아님"으로 보거나 `pwa-lifecycle.js`에 기본 정의를 둔다. 셸 수정이므로 `sync:public` 2회.
  - 완료 판정: 스텁 없이 iPhone UA Playwright에서 배너가 뜬다.
- [ ] **37. 질문형 단계 입력에 `aria-invalid`가 없다**
  - 할 일: 오류가 난 필드에 `aria-invalid`·`aria-describedby`를 단다.
- [ ] **26. 둘러보기 설명이 아직 "준비하고 있어요"라고 말한다**
  - 할 일: 이미 열린 기능이면 실제 설명으로 바꾼다.
- [ ] **33. 내비 라벨 "내 상담"과 화면 제목 "영냥이 보관함"이 다르다** — 6단계 보관함 명칭 통일에 맞춘다.
- [ ] **34. 빈 보관함 CTA 라벨이 무엇을 하는지 말하지 않는다** — 행동을 말하는 라벨로 바꾼다.
- [ ] **31. 신년운세 생성 대기에 숫자 소요 시간이 없다** — 실제 평균에 근거한 범위만 쓴다(근거 없으면 쓰지 않는다).
- [ ] **32. 신년운세 진행 단계 수 폴백 `|| 6`** — 실제 단계 수에서 계산한다.
- [ ] **15. `.cdh-flow` 여백이 어긋난다** — 홈 퍼널 정본은 `templates/home-funnel.html`·`styles/home-funnel.css`, 생성 스크립트로 `index.html`에 반영한다.
- [ ] **16. 1536px 이미지를 640px 슬롯에 그대로 쓴다** — 슬롯에 맞는 크기 변형을 쓴다(새 이미지 생성 아님, 리사이즈).
- [ ] **18. `ExpertStickyCta`를 쓰는 약 14개 페이지에 `watchId`가 없다** — 본문 CTA가 보이면 sticky가 숨도록 `watchId`를 준다.
- [ ] **20. 다국어 신뢰 FAQ 페이지에 차별점 문항이 없다** — 사실만, 각 언어로 직접 번역(유료 번역 스크립트 금지).
- [ ] **25. 레거시 화면의 `copy.locale`이 undefined다.**
- [ ] **24. 레거시 화면이 60초마다 다시 불러온다** — 필요 없는 폴링이면 멈춘다.
- [ ] **28. 숙요·휴먼디자인 차트 화면에 추천이 한 번도 안 뜬다.**
- [ ] **29. 한국어 외 로케일에 태그가 없다.**
- [ ] **30. `neo` 브랜드가 꿀꿀 팔레트로 매핑된다.**

### B. SEO

- [ ] **17. 인생의 책 페이지에 OG·JSON-LD가 없다.**
- [ ] **19. 대표 상세 H1 예외(화면 제목과 문서 H1 차이)의 이유를 기록한다.**
- [ ] **21. 문서 스냅숏에 옛 이름 "사랑의 비밀"이 남아 있다** — 정본 이름은 "연애 비책".

### C. 검증 도구·코드 정리

- [ ] **1. `verify-home-funnel`의 낡은 단언** — 5단계 홈 개편 후 실제 구조에 맞춘다.
- [ ] **2. 정원(garden) 검증기의 쿠키 동의 사전 설정.**
- [ ] **3. 프리미엄 진입 검증기 정규식.**
- [ ] **4. 개발 서버 하이드레이션 경고가 가끔 난다.**
- [ ] **5. no-fallback B 카운트 181 → 224** — 늘어난 원인을 확인하고 기준선 또는 코드를 고친다.
- [ ] **7. `sync:public`이 두 번 돌아야 수렴한다.**
- [ ] **12. 2단계에서 남은 i18n 낡은 키.**
- [ ] **13. eslint 경고 375개** — 이번 작업이 늘린 것부터 줄인다.
- [ ] **36. `RecommendationSurface` eslint 경고.**
- [ ] **14. 신년운세 VM 테스트가 구현 세부에 너무 묶여 있다.**
- [ ] **27. 레거시 건강 보고서 분기가 죽은 코드다.**
- [ ] **35. 관리자 셸 `alert` 사용.**
- [ ] **39-후속(선택). `IntakeChat` 삭제 뒤 남은 미사용 코드** — `app/yeongnyangi/_lib/intake-chat.ts`의 `intakeSteps`·`intakeAnswer`·`intakeStepValid`·`intakePrompts`·`intakeCursor`·`IntakeStep`과 그 테스트, 항상 null인 `IntakeComposerContext`.

### D. 사용자 조치가 필요한 것 (코드로 만들어 내지 않는다)

- [ ] **22. 쿠팡 상품 32개에 이미지·가격이 없다** — 실제 데이터나 관리자 입력이 필요하다. 지어내지 않는다.
- [ ] **23. 쿠팡 subId·상품별 CTR이 없다** — 파트너스 subId 발급은 사용자 몫. 코드 쪽은 클릭 이벤트 집계까지만 할 수 있다.

### 끝난 것

- [x] **38. 헤더 "홈" 통일** — `app/components/GlobalHeader.tsx` `headerNavHref`(`0733811cc`). SEO: 로고는 `/` 유지라 canonical·sitemap 영향 없음.
- [x] **39. 죽은 `IntakeChat.tsx` 삭제** (`0733811cc`).
- [x] **40. 신년운세 라벨이 도움말보다 작다** — `.nyai-form label` 14px (`0733811cc`).
