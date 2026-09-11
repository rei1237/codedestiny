---
status: active
updated: 2026-09-11
pr: https://github.com/rei1237/codedestiny/pull/1915
next: PR #1915 의 필수 CI 와 머지 여부를 확인한다. 구매 전 화면 리뉴얼 범위는 닫혔고, 남은 것은 범위 밖 결함 보고 5건이다
---

# 초융합 운세 — 구매 전 화면 프리미엄 리뉴얼

## 왜

> "「초융합 운세」 … 첫 화면을 보는 사용자가 '이건 일반적인 AI 운세가 아니다 / 3만원을 낼 이유가 있겠다' 를 느끼게" (31개 절 브리프, 2026-09-11)

계획: `C:\Users\user\.claude\plans\melodic-greeting-beacon.md`. 범위는 **구매 전 화면(히어로 ~ 폼 ~ CTA)** 뿐이다. 로딩·결과 본문·PDF·레일/도크는 건드리지 않았다.

## 한 일

- **히어로가 밋밋했던 실제 원인 제거** — CSS 끝의 "Approved Fusion expert surface" 블록이 `.hero` 를 1단으로 접고 `.hero > .orbStage { display:none }` 으로 Fusion Core 궤도를 꺼 놓고 있었다. 두 줄을 지워 2단을 복원했다. 모바일(≤760px)은 오브를 문안 위 행에 따로 쌓아 글자와 겹치지 않게 했다(겹치면 대비 1.4~2.3:1 로 떨어졌다).
- **히어로 h1/p 를 11개 로케일 카피로** — `expert-labels.ts`(ko·en 2개뿐) 대신 이미 저작돼 있던 `heroTitleLine1/2`·`heroDesc` 를 쓴다. ja·vi·hi·es·fr·de·nl·ms 사용자에게 영어 h1 이 나가던 버그가 함께 풀렸다.
- **귀인 배지 조건부** — 「오늘의 귀인」 핸드오프 세션일 때만 보인다.
- **6체계 카드** — 이름만 있던 칩을 아이콘(`DestinyIcon`) + 한 줄 설명 카드로. 신규 키 `systemBriefs` 1개(12 로케일, en 복사 관습).
- **리포트 차례 미리보기 + 신뢰** — 결과 화면의 실제 렌더 순서를 `FUSION_SHARED_COPY` 라벨 그대로 보여 준다(지어낸 목차 0). 신규 키 `reportPreviewTitle` 1개. 배경은 기존 `sukuyo-moonlight-dogam-v1.webp`.
- **폼** — "받는 것" 요약 카드를 제출 버튼 위에서 폼 맨 앞으로 옮김, 두 묶음 제목에 CSS 카운터 01·02, CTA 문구 통일(ko 값만).
- **중복 제거** — `ExpertStickyCta` 를 이 화면에서만 뺐다(`.orderBar` 하나만 남음, 공유 컴포넌트는 미수정). `ExpertGuide` usage 의 `PriceBadge` 제거 → 가격 노출 6→3회. 죽은 `.chatLead` CSS 삭제.
- `.orderBar` 를 불투명 + blur 로(뒤 글자가 비쳐 가격과 겹쳐 보였다), 페이지 바닥에 바 높이만큼 여백.

신규 이미지 생성 0. 결제·생성·resume·PDF·payload·feature key 코드는 열지 않았다.

## 검증

- `npm run ci:preflight` PASS(paid-gate-suite 85/0), `npm run check:fast` PASS(jest 2686), `npm run test:node` 1051/1051, `verify:fusion-fortune-stage-flow` PASS, `verify:fusion-fortune-retry-payload` PASS, `tsc --noEmit` 0 오류, eslint 0.
- 결과 화면 회귀(mock `?preview=success|truncated|failed|legacy` + `#fusion-form` submit 디스패치) — 페이지 오류 0, TOC/PDF 섹션 수 정상, 미리보기가 `data-fusion-toc` 를 오염시키지 않음.
- 360/390/430/768/1440 스크린샷(mock, `?preview` 없이 구매 전 화면) — 가로 넘침 0, 히어로 오브·문안 겹침 0(h1 대비 18.6:1), 폼 요약 카드·STEP 뱃지 정상.
- 실결제·실 LLM 호출 없음.

## 남은 작업 (범위 밖 — 보고만)

- [ ] `node scripts/verify-fusion-expert.mjs` 가 **main 에서도** `sukuyo.expertEvidence` undefined 로 실패한다(워커 숙요 어댑터 쪽, 이 PR 무관).
- [ ] 폼 2단에서 생년월일 칸(입력 높이 75px)과 생시 칸(54px)의 높이가 달라 아랫선이 어긋난다 — 이 PR 전후 좌표가 같아 기존 결함이다.
- [ ] 진행 단계 순서(sukuyo→vedic, `fusion-thread.tsx:59`)와 결과 순서(vedic→sukuyo, `:56`)가 다르다. 화면 결과 순서와 PDF 장 순서(`lib/pdf/fusion-report-plan.js`)도 다르다.
- [ ] 폼 라벨 옆 체계 색 점(생년월일 5개 등)은 범례가 없어 장식 노이즈로 읽힌다.
- [ ] 🔴 **메인 체크아웃 공유 `node_modules` 가 lockfile 과 어긋나 있다** — `@typescript-eslint/parser` 8.70.0(07:22 설치) + `typescript-estree` 8.57.0(10:18 설치). 이 조합에서 ESLint 가 모든 TS 파일에 `handleUnsupportedTSVersion is not a function` 을 낸다. 이 세션에서 멈춘 `npm ci` 가 일부를 다시 깔았을 가능성이 있다. 다른 세션이 쓰고 있어 손대지 않았다 — 한가할 때 메인에서 `npm ci` 로 복구한다. 이 워크트리는 정션을 끊고 자체 설치로 검증했다.

## 정본 예시

- 화면: `app/fusion-fortune/FusionFortuneClient.tsx` (CRLF — node 스크립트로 패치), CSS: `app/fusion-fortune/fusion-fortune.module.css` (LF)
- 정적 가드: `__tests__/ui/fusion-fortune.static.test.js` — 첫 `href="#…"` 가 `#fusion-form` 이어야 하고 `.tsx` 리터럴 hex 금지
