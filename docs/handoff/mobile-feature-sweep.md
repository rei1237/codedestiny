---
status: active
updated: 2026-09-02
next: "낙샤트라 수정 세션 — 입력 6건 15px·TT 1건 (아래 레시피 절차)"
---

# 기능별 모바일 순회 원장

홈 셸(4축 캠페인)·초융합(#1435) 이후 나머지 기능 라우트를 배치 순서로 스캔→수정한다. 축은 인체공학만 — 가로 오버플로(OF)·44px 탭 타깃(TT)·16px 입력(IN)·safe-area 여유(SA)·읽는 열폭·이탈 컨트롤. 재디자인·재도색 금지(docs/context/design-and-ui.md).

## 스캔 방법

`npm run build` 후 `npm run measure:mobile-routes -- --routes=/라우트/` (루트 정적 셸은 `--target=source`). 매트릭스 412×823·360×800 × inset 0/47. exit 1 은 측정 무효(INVALID)이지 발견이 아니다. 상세 JSON 은 임시 디렉터리에 남는다(커밋 금지).

## 원장 — 완료 행은 상세를 지우고 PR#·날짜만 남긴다

발견 표기 = OF/TT/IN/SA최소여유/열폭@360/이탈. 열폭 참고선: 360px 에서 254px 문제·274px 수용(#1435 실측). SA최소여유는 #1447(09-02)부터 내용물 기준(contentGap = 박스 gap + 하단패딩) — 그 전에 적힌 SA 값은 박스 기준이라 실제 여유는 그 이상이다.

| 기능 | 라우트 | 배치 | 스캔일 | 발견 | 수정PR | 상태 |
|---|---|---|---|---|---|---|
| 초융합 심층 리딩 | /fusion-fortune/ | 1 | 09-02 | 0/4/0/—/302px/수동 | #1435 | 완료 |
| 러브 코덱스 | /master-love-codex/ | 1 | 09-02 | 0/2/0/56px/286px/유 | | 스캔됨 |
| 운세 찻집 | /fortune-tea-house/ | 1 | 09-02 | 0/2/0/765px/286px/유 | | 스캔됨 |
| 네오 작전실 | /neo-operation-room/ | 1 | 09-02 | 0/0/0/—/266px/수동 | | 스캔됨 |
| 운세 챗 | /fortune-chat/ | 1 | 09-02 | 0/13→0/1건→0/12px(-47 은 오탐)/—/유 | #1447 | 완료 |
| 낙샤트라 | /nakshatra/ | 1 | 09-02 | 0/1/6건 15px/—/274px/수동 | | 스캔됨 |

수정 우선순위: 낙샤트라(입력 6건 15px) → 작전실(열폭 266px·이탈 없음) → 러브코덱스·찻집(탭 타깃 소수).

## 배치 (사용자 확정: 유료 대표부터)

1 유료 대표상담 5종(위 표) · 2 무료 허브(/saju /tarot /ziwei /sukuyo /astrology /today /compatibility /fortune/기간) · 3 결제 화면(/points /premium-unlock — 🔴 payment-freeze 매니페스트 + paid-gate-auditor 선행) · 4 유료 AI 단독 ~15종 · 5 루트 정적 셸 21종(`--target=source`) · 6 콘텐츠·정책. 시드: app/_lib/serviceSections.js 의 href 55종 + 루트 *.html 21종. `/…/result/` 류는 dist 에서 못 열어 스캔 제외.

## 기능당 수정 레시피 (세션당 1기능 1PR)

① 전 스캔 → ② 그 기능의 CSS/컴포넌트만 수술적 수정(#1435 패턴: 글자 축소 대신 열 확장, Tailwind 임의값→CSS 모듈; 공용 래퍼 mobile-lite.css 금지) → ③ 재빌드·재스캔으로 전/후 수치 → ④ 그 기능 verify:* (package.json 에서 verify:슬러그 grep, 없으면 "기능 가드 없음" 명기) + verify:hero-contrast + verify:mobile-detail-nonintrusive + lint/typecheck → ⑤ 이 원장 갱신 → PR.

## 비고

- 로컬 dist 서버엔 API 가 없다 → usage/가격 fetch 실패·부분 렌더는 정상. 빈 화면은 scanned=0 INVALID 가 잡는다.
- 이탈=수동 인 몰입형(작전실·낙샤트라·초융합)은 수정 세션에서 손으로 확인.
- index.html 의 /services/ 링크 7종(tarot·face-reading·palm-reading·animal-totem·omikuji·bias-destiny·stonehenge-rune)은 dist 에 산출물이 없어 404 다(09-02 실측). 링크 정리/페이지 신설은 별도 결정 필요.
