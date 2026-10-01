---
status: active
implementationStatus: diagnosed
updated: 2026-10-01
next: 원인 진단 완료(저장소 수정 없음). 검증기 갱신은 아래 권장 순서대로 한 세션에 하나씩.
---

# 변경 전부터 실패하던 verify 4종 — 원인 진단 (2026-10-01)

출처: [ggulggul-home-polish-2026-10-01](ggulggul-home-polish-2026-10-01.md) 남은 일 1번. 진단만 했고 저장소 코드는 바꾸지 않았다(기준 HEAD a6f81f872).

공통 결론: **제품 결함은 없다.** 넷 다 검증기가 이후의 의도된 변경을 따라가지 못했다. 4종 모두 CI 에 배선되지 않았다 — `verify:today-hub-gate` 만 package.json 에 있고 `verify-guard-wiring` 에 "배선 후보(미승인)"로 올라 있으며, 나머지 3종은 npm 스크립트도 없다. 그래서 드리프트가 경보 없이 쌓였다.

## 권장 순서

1. today-hub-gate — 원인·수정안 확정, 검증기만 고치면 끝(가장 싸다).
2. review-anytime-ui — 스크린샷 출력 경로만 옮기면 안정화.
3. saju-reading-personas — 로그인 mock + 높이 예산 결정 필요.
4. feature-popup-journey — 현재 팝업 계약을 먼저 정해야 다시 쓸 수 있다.

## 1. verify-today-hub-gate — 추출 경계가 낡음 (확정)

- 948eee737(09-02, #1472)이 `#cdTodayHub` `<section>` 을 홈 퍼널(`#cdHomeFunnel` › `#cdhTodaySlot`)로 올렸고 `<style id="cd-today-hub-v20260808">`·인라인 스크립트는 제자리에 남겼다. 검증기는 `<style id=…>` 부터 `<!-- 대표 운명 상담` 까지만 잘라 jsdom 에 올리므로 마크업이 빠진다.
- 실측: 0fc7ada8e(직전 커밋) PASS / 948eee737 FAIL. HEAD 에서 section 을 따로 잘라 블록 앞에 붙이면 시나리오 6개와 7셸 미러 검사가 모두 PASS.
- 수정 방향: `extractBlock` 이 `id="cdTodayHub"` section 을 `<section`/`</section>` 깊이 매칭으로 따로 잘라 붙인다.

## 2. verify-feature-popup-journey — 09-12 디자인 계약을 단언 (확정, 계약 결정 필요)

- bc91ed955(09-14)부터 `js/feature-detail-preview.mjs` 는 `#tilePvwCtaBtn` 이 있으면 `[data-fortune-hero-action]` 슬롯을 CTA 미러로 `replaceChildren` 한다. 그래서 전환 프롬프트 `[data-feature-conversion-request]` 가 사라지고 `prompt.waitFor()` 에서 멈춘다. 실측: bc91ed955^ PASS(63항목×4폭) / bc91ed955 FAIL.
- HEAD 에서 단언을 던지지 않고 모아 세면 낡은 단언군이 6개 이상이다: 전환 프롬프트 부재, CTA 높이 0, 팔레트·전환 색 3종, artSrc(더는 공유 히어로가 아님), 16:9 비율(현재 1.6, 세로 소재 0.878, 아트 없음 NaN).
- 추정: 09-15/16 디자인 커밋들이 나머지 단언을 낡게 했다(커밋별 이분 탐색은 안 함). CTA 높이 0 이 의도된 것(스티키 푸터 `fortuneCtaAtTop` 토글)인지는 미검증.
- 수정 방향: 현재 팝업이 지켜야 할 계약을 먼저 정하고 다시 쓴다. 단언값만 현재 값으로 맞추면 결함을 정답으로 고정할 위험이 있다.

## 3. verify-review-anytime-ui — 서버 필요 + 자기 스크린샷이 HMR 을 유발 (확정)

- (a) `REVIEW_UI_BASE_URL` 기본값 `http://localhost:3107` 에 mock dev 서버가 떠 있어야 한다(`MOCK_DEV_PORT=3107 npm run dev`).
- (b) 간헐 실패: 검증기는 페이지 이동 전마다 저장소 안 `.integration/review-anytime` 에 스크린샷을 쓴다. 이 폴더가 `.git/info/exclude` 에 있어도 Next dev 는 감시한다. 실측으로 쓰기·삭제 1회마다 재컴파일이 1회 일어나고, 유휴 상태나 저장소 밖 쓰기에서는 0회다. 재컴파일이 `ReviewsRouteClient` 의 `ssr:false` 동적 import 를 다시 마운트시켜 "후기를 불러오는 중" 셸에 멈춘다(멈춘 run 은 products/summary/reviews 3중 로드 + eligibility 미호출 — 상관 근거이며, 인과는 추정).
- 실측: 출력이 저장소 안이면 1/3 PASS, 저장소 밖으로 옮기면 3/3 PASS. 같은 체크아웃에서 옆 세션이 편집해도 같은 HMR 이 난다.
- `app/reviews` 는 검증기 작성(883c0d5fa, 09-29) 이후 바뀌지 않았다.
- 수정 방향: 출력 기본값을 저장소 밖(OS temp) 또는 env 로 옮긴다.

## 4. verify-saju-reading-personas — 서버 필요 + 실패 2건 (확정)

- (a) 기본 `SAJU_READING_URL=http://127.0.0.1:34350` 은 로컬 mock 전용이라 서버가 필요하다(`SAJU_READING_URL=http://127.0.0.1:3107` 로 실행). 스크린샷 기본 출력(`.codex-saju-reading-shots`)도 저장소 안이라 3번과 같은 HMR 위험이 있다.
- (b) 29번 줄 `catHeight<=480`(360px) 실패, 측정값 493.3px. 원인은 293af2700(09-30)의 영냥이 카드 안내문(`.cd-soulcat-entry__notice`) 문구 교체다. 360px 정상 상태(body 330, 카드 292, 안내문 폭 230, Malgun Gothic)에서 안내문이 5줄에서 6줄로 늘었다(96→115px). 같은 조건에서 템플릿만 바꿔 끼운 A/B: 현재 문구 493.3 / 이전 문구 474.1(2회 반복 동일).
  - 함정: 측정 순간 `<html>` 에 `cd-boot-gate`(부팅 게이트 퇴장 중)가 남아 있으면 body 가 330 이 아니라 360 폭이다. 이때는 카드 322·안내문 260 이라 현재 문구도 474 로 통과한다. 약 27회 측정 중 5회가 이 창에 걸렸다. 검증기는 게이트 종료를 기다리지 않아 결과가 흔들린다.
  - `CodeDestinyBody` 는 `local()` 전용(Pretendard → Apple SD Gothic Neo → Malgun Gothic)이라 윈도우 측정값은 Malgun 기준이다. 실기기 글꼴에서의 줄 수는 미측정.
- (c) 높이 단언을 넘겨도 43번 줄 `waitForFunction(G_PILLARS && #tsGrid [data-saju-god] && #dailyPanel .saju-reading, 60s)` 가 타임아웃난다. 원인은 932a22824(09-29, "require login before free saju results")다. 비로그인이면 `ensureSajuResultSession()` 이 입력을 `cd:saju-login-draft:v1` 에 보관하고 "로그인 필요" 모달을 연 뒤 false 를 돌려 계산이 시작되지 않는다(실측: 모달 표시, `G_PILLARS` 없음). 검증기는 09-27 에 작성됐고 게스트로 돈다.
- 수정 방향: (b) 안내문 문구를 줄이거나 480 예산을 다시 정하는 것은 제품 결정이다. 어느 쪽이든 측정 전 `cd-boot-gate` 종료를 기다리게 한다. (c) 검증기에 mock 로그인 세션을 준다(`__dpVerifyResultSession` 이 `'authenticated'` 를 돌려주게 initScript 로 심거나, mock dev 의 로컬 인증 사용).

## 재현 메모

- mock 서버: `MOCK_DEV_PORT=3107 npm run dev`(API 는 3108). 종료는 npm PID 기준 `taskkill /PID <pid> /T /F` — TaskStop 은 next dev 자식을 못 죽인다.
- Playwright 진단 스크립트는 저장소 `scripts/` 아래에 두어야 playwright·jsdom 을 해석한다(쓰고 지울 것). 스크린샷 출력은 저장소 밖으로.

## 다음 세션 첫 문장

"docs/handoff/stale-verifiers-2026-10-01.md 를 읽고, 권장 순서 1번 verify-today-hub-gate 의 추출 경계부터 검증기만 고쳐줘."
