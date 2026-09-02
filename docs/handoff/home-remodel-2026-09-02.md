---
status: active
updated: 2026-09-02
next: 604KB 인라인 스크립트를 외부 defer 파일로 뺀다 (아래 "다음 작업" 1번)
---

# 홈 리모델 — 접기 해제 완료, 다음은 문서 무게

## 지금 상태

- **PR #1459** (`feat/home-unfold-ia`) — 홈 접기 8개 해제 + `content-visibility` 복원. CI 전부 초록, **사용자 머지 대기**.
- 그 위에 쌓을 것: 아직 없음. 아래 "다음 작업" 은 #1459 머지 후 새 브랜치에서 시작한다.

## 실측 (2026-09-02, 로컬 셸 · 390×844)

**CLS 는 광고 탓이 아니고, 스테이징/프로덕션 차이도 아니다. 셸 자체에서 재현된다.**

| 조건 | CLS |
|---|---:|
| 로컬 무제한 | 0.001 |
| 로컬 + CPU 4x + Slow 4G | **0.2476** |
| 프로덕션 필드 | Poor 23% |

단일 시프트 1건이 0.2476 을 전부 만든다(@~10s, 파싱 중). 원인 노드: `div.normal-logo.moon-hero` 604→510px · `#dpMasterCard` 17→289px · `#dpDestinyPanel`·`.moon-hero__trust` 신규 등장. **클래스 토글이 아니라 문서가 계속 스트리밍되면서 히어로가 다시 그려지는 것**이다.

문서 무게(브라우저 파서로 실측):

| 항목 | 크기 | 비중 |
|---|---:|---:|
| index.html 원본 | 2,720KB | — |
| brotli | 458KB | — |
| 인라인 `<script>` 71개 | 1,118KB | 41.1% |
| `<style>` 92개 | 797KB | 29.3% |
| 마크업+주석 | 806KB | 29.6% |

- **인라인 스크립트 한 개가 604KB** — 문서의 22%. 파서를 막는다.
- DOM 4,010개인데 **본문 텍스트는 2,971자**.
- 히어로 마크업이 문서의 **26.0% 지점**(623KB)에서 시작. `</head>` 는 14.6%.

Lighthouse 모바일은 이 상태에서 **63**이고 목표 90 은 도달 불가다(simulated LCP 9,462ms vs observed 1,272ms — 루브릭 문제는 [[home-axis3-lcp-row-is-a-rubric-problem]]).

## 다음 작업 (순서 고정)

1. **604KB 인라인 스크립트를 외부 `defer` 파일로 뺀다.** CLS·LCP·TBT 를 한 번에 움직이는 유일한 레버. 셸 인라인 스크립트는 해시 청크로 추출되므로 배포본 검증은 청크를 찾아서 한다.
2. **아직 남은 접기 1개를 푼다** — `#cdHomeExpandToggle` + `#cdHomeSecondaryPanel`(`cd-home-secondary-panel-v20260821`). 섹션 3개·링크 13개가 접혀 있고, 문안 "홈에서 접어 둔 섹션도 모두 펼치기"(index.html:14730, 키 `home.svcIndex.expandCta`)는 #1459 이후 **사실과 어긋난다**. 로케일 12개 동반.
3. **중복 정리** — 실측 링크 겹침: `#cdConcernPick` ∩ `#cdSignatureConsult` = 4/5 동일, `#cdQuickServices` ∩ `.cd-home-guide` = 5개.

## 재현 명령

- 섹션 높이: `node scripts/measure-home-section-heights.mjs`
- 나머지(CLS·무게·섹션 인벤토리)는 임시 스크립트로 쟀고 남기지 않았다. 위 표의 수치를 인용하고, 다시 재야 하면 Playwright + CDP `Emulation.setCPUThrottlingRate 4` + Slow 4G 로 같은 조건을 만든다.

## 건드리지 않은 것

`#featureBegin`(cosmic-main.css:2232 의 `content-visibility:visible!important` 로 무력화) · `#cdFinder`(자손이 섹션 밖 506px — paint containment 가 자른다). 둘 다 index.html 주석에 사유가 있다.
