---
status: done
updated: 2026-09-25
next: "/yeongnyangi/1000-won-fortune/ 첫 화면 CLS 의 h1 몫(≈0.12)은 커밋 b5a4216aa 로 제거했다(모바일 h1 두 줄 고정). 남은 몫은 본문 'Yeongnyangi Noto' 교체로 문단이 한 줄 줄어드는 것(실험실 ≈0.03~0.08, 윈도우 대체 글꼴 맑은 고딕 기준). Android 는 대체 글꼴이 같은 계열(Noto Sans CJK)이라 0 에 가까울 것으로 추정, iOS 는 미실측. 손대려면 original.css 전역 폰트 스택에 size-adjust 대체 @font-face 를 넣는 별도 결정이 필요하다(전 영냥이 페이지 영향)."
---

# 천원사주 페이지 첫 화면 CLS (2026-09-25)

## 원인 (실측)
- 웹폰트 전부 차단 시 390폭 CLS 4회 모두 0. 허용 시 0~0.18. 이동은 폰트 `loadingdone`(≈1.6~1.8초) 직후에만 발생.
- 나눔명조(h1)만 차단(=Noto 교체 몫): 0.03~0.05 / Noto(본문)만 차단(=나눔명조 교체 몫): 0~0.12 → 주범은 h1.
- h1 둘째 줄 "영냥이 고등어 상담 1,000원" 폭: 나눔명조 11.79em, 바탕 12.95em, 맑은 고딕 12.63em. 390폭 가용 358px÷30.4px=11.78em 으로 나눔명조조차 경계선 → 대체 글꼴로 먼저 그리면 3줄(123px), 교체 후 2줄(82px) → 아래 전체 41px 상승.
- 운영 폭별 h1(허용/차단): 390 만 82/123 으로 달랐고 320·360·375 는 둘 다 3줄, 412 이상은 둘 다 2줄.

## 수정 (b5a4216aa)
- `app/yeongnyangi/1000-won-fortune/page.tsx`: h1 을 `<span class=h1Line>` 두 개로 분할(문자열·textContent 동일).
- `page.module.css` ≤760px: `.h1Line{display:block}`, `.hub h1{font-size:clamp(1.5rem,calc((100vw - 32px)/13.5),1.9rem)}`. 13.5em = 바탕 12.95em 대비 약 4% 여유. 하한 1.5rem 은 h2(1.4rem) 역전 방지이며 356px 미만에서만 걸린다(그 폭은 여유가 줄어든다).
- 모바일 h1 크기: 360 24.3px · 390 26.5px · 412 28.1px(이전 30.4px). 데스크톱(>760) 변화 없음.
- `config/sitemap-lastmod.json`: 해당 페이지 signature 1줄(app/** 편집이 원장 무효화).

## 검증
- 폭 320/360/375/390/412/430/760/800/1280: h1 높이 폰트 허용=차단 전부 SAME, scrollWidth=뷰포트.
- 폰트 응답 1.5초 지연(교체를 첫 페인트 뒤로 강제), 390폭 4회: 운영 0.082~0.149 → 워크트리 dev 0.048~0.082. h1 노드("1,000원 y517→474") 이동 항목 소멸, 남은 건 본문 문단.
- 스크린샷 대조(visual-checker): 360·390 두 줄·잘림 없음·위계 유지, 800 은 dev 표시기 외 픽셀 동일.
- `npm run check:fast` exit 0 (jest 296 suites / 4207 tests).
- 보조 스크립트(gitignore): `build-cache/founder-records/cls3.mjs <base> <path> [all|delay|<파일명 조각>]`, `h1lines.mjs`, `seg.mjs`, `width.mjs`, `shots.mjs`.

## 남은 것
- 본문 Noto 교체 몫(위 next). 운영 후 재측정 시 무스로틀 실측은 폰트가 첫 페인트 전에 도착하면 0 이 나오므로 `delay` 모드로 비교할 것.
