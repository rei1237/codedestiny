---
status: active
updated: 2026-08-30
next: 스테이징에서 차트 응답의 `pipeline` 수치를 읽고, 어느 구간이 실제 병목인지 판정한다
---

# 휴먼 디자인 유료 리포트 — 생성 복구 · 대기 씬 · 차트 병목

## 왜

> "휴먼 디자인 유료 리포트를 불러올때 애니메이션이 있었으면 하고 초기에 차트를 불러올때 너무
> 시간이 걸리는 것으로 볼때 병목이 있으니 해소되어야하며, 결제 이후에 리포트 생성이 안되는
> 심각한 버그가 있으므로 원인 파악 후 제대로 생성되도록 수정해줘"

## 지금 상태

- PR #1321 (결제 후 생성 복구 4중 결함) **머지됨** — `d09231bf4`.
- PR #1322 (대기 씬 애니메이션 + 차트 병목 + 계측) **CI 8/8 통과, 사용자 머지 대기**.
- 요청 3건은 코드상 전부 처리됐다. 남은 것은 **실제 화면·수치 확인**과 아래 3건이다.

## 남은 작업

- [ ] **계측 수치 판독** (다음 세션의 첫 일). 차트 결과 화면 하단에 `pipeline` 이 이미 렌더된다
      (`app/human-design/HumanDesignClient.tsx:637`). 새 마크는 `AUTH` · `ARCHIVE_LOOKUP` ·
      `PERSONALITY` · `DESIGN_SEARCH` · `DESIGN` · `CHART`.
      🔴 **콜드 Swiss 초기화 비용 = `PERSONALITY` − `DESIGN` 의 차이**다 (둘이 같은 양의
      `swe_calc_ut` 이다). 판정 기준: 가장 큰 구간이 300ms 를 넘으면 그 구간만 별도 PR 로 손댄다.
      아직 손대지 않은 후보는 순차 `await` 병렬화 · `EPHE_FILES` 축소 · 프런트 번들/CSS 코드분할.
- [ ] **씬 렌더 육안 확인 (미검증)**. `next dev` 가 이 저장소에서 깨져 있어 실제 모습을 못 봤다.
      CSS 토큰 존재는 대조했다. 스테이징에서 ① 생성 화면 목록의 "작성 중" 4줄, ② 차트 로딩 중
      세 점, ③ `prefers-reduced-motion` 켠 상태에서 **목록 18줄이 안 사라지는지**를 본다.
- [ ] **`/generate` 의 1일 60회 상한** (PR #1321 부터 넘어온 구조적 결함, 미착수).
      `/generate` 가 `/start` 와 같은 버킷을 쓴다 — `aiActionFromPath` 가 `/generate$` 를
      `"start"` 로 분류한다. 리포트 1건 ≈ `/start` 1 + `/generate` 5~6 이라 **사용자당 하루
      8~10건**이 천장. 고치려면 공용 분류기를 건드려야 해서 전 AI 라우트 회귀 범위다.
      판정 기준: `/generate` 가 자기 버킷을 갖고, 리포트 1건이 일일 예산의 1건으로만 세어지는 것.

## 정본 예시

- 웨이브 계약 상수: `worker/lib/human-design-report-contract.js:49`
- 버킷 분류기(위 3번째 항목의 수정 지점): `worker/lib/security/index.js:455`
- 새 가드 ⑧절: `scripts/verify-human-design-report.mjs` 의 "⑧ 생성 화면 · 차트 인계 · 계측"

## 함정

- 🔴 **경과 시간으로 진행률을 칠하지 않는다**(요구사항 22). 생성 화면의 "작성 중"은
  `HD_REPORT_SECTION_CONCURRENCY` 에서 나온다. 가드가 두 수를 **값으로** 대조한다.
- 🔴 **차트 인계(`app/human-design/_lib/chart-handoff.ts`)는 표시 전용**이다. 결제 상태·이용권·
  `reportId` 를 넣는 순간 클라이언트가 고칠 수 있는 값이 유료 판정에 닿는다. 가드가 막는다.
- 🔴 **모션 감소는 끄는 게 아니라 최종 상태로 앉힌다.** `animation: none` 만 두면 등장
  키프레임의 `opacity: 0` 이 남아 항목이 사라진다.
- 🔴 계측을 넓히려고 공용 `worker/lib/swiss-ephemeris.js` 에 워밍업 export 를 뚫지 말 것 —
  사주·서양점성술·베딕이 함께 쓴다.
- `verify:public-mirror-fresh` 가 `.ignore` 하나만 들고 실패하면 윈도우 개행 위양성이다
  (`git diff .ignore` 가 비어 있는지로 판별).

## 검증

```
npm run verify:human-design-report      # ⑧절 26건 포함
npm run hd:snapshot:check               # 차트 경로를 건드렸으면 필수 (33케이스)
node --test __tests__/ui/human-design-report.static.test.js __tests__/ui/human-design-immersive.static.test.js
```

## 모르는 것

- 차트 초기 로딩의 **실제** 병목 구간. 계측만 넣었고 수치는 아직 없다 — 위 첫 번째 항목이
  그것을 재는 일이다. 🔴 수치를 보기 전에 병렬화·`EPHE_FILES` 를 손대지 말 것.
