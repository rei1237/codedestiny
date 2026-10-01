---
status: done
implementationStatus: shipped-to-main
updated: 2026-10-01
next: 본 작업 완료. 아래 "남은 일"은 별도 세션에서 하나씩.
---

# 꿀꿀 운세 메인 후속 다듬기 — 후기 숨김 · 버그 제보실 · 예화 검색 · 오늘의 운세 · R2 명조 제목 (2026-10-01)

선행: [ggulggul-home-essentials-2026-10-01](ggulggul-home-essentials-2026-10-01.md).
계획: `C:\Users\user\.claude\plans\pasted-content-id-673b-giggly-sphinx.md` (커밋 1~5).
사용자 결정: 이미지는 기존 자산 재사용, 폰트는 제목만 R2 명조, 옆 세션 CI 결함은 보고만.

## 결과 (main 1b0663918 까지 push)

| 커밋 | 내용 |
|---|---|
| 30be77b85 | 후기가 3건 미만이면 `#cdReviews` 를 숨김(빈 문구를 그리지 않음). 초대 카드(`#cdReviewInvite`)는 유지 |
| f5495ada3 | 버그 제보실을 한 줄 행에서 큰 카드로(마스코트·본문·모란, 48px+ CTA). 색은 기존 `--fb-*` 다크 토큰 |
| a93364357 | 전체 서비스 검색을 달빛 예화 패널로: 책 읽는 연이 + CSS 달 원반, 금선 입력·칩. `#cdFinder` 마크업 무변경 |
| af909bfaf | 오늘의 운세: 찻잔 연이 아치 창, 금선 아이보리 카드, 세그먼트 탭, 꽃돼지 메달 장미 CTA(`.cdh a{color:inherit}` 결함을 `#cdHomeFunnel` 범위로 차단). JS·API 무변경 |
| 46e625ee6 | `verify-home-funnel` 정원 닫기 단언의 위쪽 허용치를 아래쪽과 같은 1px 로(1280 실측 -0.469px, 정수 스크롤 반올림) |
| 39b173f9a | 홈 섹션 제목을 R2 나눔명조 700(`CodeDestinySerifKR`, `font-synthesis-weight:none`), 영문 키커는 Cinzel. 전역 `*{font-family:var(--font-body)}` 때문에 제목 안 번역 span 도 직접 지정 |
| dae14532b | ≤640px 버그 카드 세로 쌓기(보상 배지 4~5줄 → 2줄), 마스코트 뒤 전역 img 폴백 회색 제거 |
| 65c6be3a5 · 0aba5e2cf · 1b0663918 | 사이트맵 원장, main 병합(양쪽이 home-funnel.css 끝에 덧붙인 블록 모두 유지, 생성물은 재생성), 병합 후 build 해시 |

## 계획과 다르게 한 것

- 버그 카드는 연이 모드 아이보리 대신 기존 다크 카드 토큰을 유지했다(연이·네오 둘 다 대비 13:1 이상).
- 오늘 CTA 메달은 `flower-pig-flower.webp` 대신 히어로가 이미 받은 앱 로고 `/icons/app-logo-512.webp` 를 썼다(추가 요청 0).
- 데스크톱에서 Mulmaru 요청이 완전히 사라지지는 않는다 — 헤더 `#langLabel`("KR")과 장식 `.moon-preview-card__sigil`("宿")이 아직 쓴다. "제목만" 범위 밖이라 그대로 뒀다.

## 유지한 계약

- 가격·지급 정책·운세 엔진·상담 프롬프트·결제 동결 파일 무변경(`verify:payment-freeze` 통과). 실결제·유료 LLM 호출 0.
- 후기·별점·이용자 수를 만들지 않았다. 이미지에 텍스트 합성 없음.
- 히어로 h1·첫 화면 규칙 무변경(`verify:hero-firstpaint-lock` PASS).

## 검증

- `node --test` home-yehwa-motifs · home-service-finder · home-concern-card-images · fortune-chat.static 47/47.
- `verify-home-funnel.cjs` exit 0(320~1440, 병합 후 포함). `build-home-funnel --check` current, `verify:sitemap-drift` OK, typecheck 0.
- check:fast(--committed-head): paid-gate-suite 88/0, 사이트맵 드리프트 1건은 65c6be3a5 로 해결.
- Playwright 실측: 가로 넘침 0(ko/en/ja 320~1280; ja 320·375 타로 제목은 설계된 말줄임), 제목 계산 글꼴 CodeDestinySerifKR 700, 오늘 CTA 대비 연이 5.66+ · 네오 7.37+, CLS 390 기준선 0.265 → 0.22~0.33(변동은 기존 히어로·::after 시프트, 제목은 원인 아님).
- visual-checker: 오늘 카드 8/8, 버그 카드 10/10, 제목 명조 전환 통과.
- main CI(1b0663918): PR CI 36828893125 성공, Paid Flow Gates·AI Locale·Business Identity·Secret Scan·워치독 2종 성공, push·schedule 릴리스 성공.

## 남은 일 (보고만, 범위 밖)

1. 변경 전부터 실패: `verify-today-hub-gate`, `verify-review-anytime-ui`, `verify-saju-reading-personas`, `verify-feature-popup-journey`. → 원인 진단 완료(제품 결함 없음, 넷 다 낡은 검증기): [stale-verifiers-2026-10-01](stale-verifiers-2026-10-01.md).
2. 390px 게이트웨이 제목 2행 "지"가 기존 달 원반·금색 원 장식과 2~3px 겹친다(명조 전환 뒤 2행 끝이 17px 물러나 오히려 줄었음).
3. 게이트웨이 연이 CTA "상담 시작하기 →" 화살표 대비 1.28:1.
4. 모바일 고민 섹션 제목·키커가 왼쪽 정렬(데스크톱은 가운데) — 기존 스타일.
5. 320px 하단 도크 "모든 운세" 라벨 잘림. 390px 히어로 리드 4px 시프트·전체 화면 `::after` 시프트(CLS 약 0.21).
6. /en 의 오늘 카드 날짜가 한국어(`paintDate` 가 ko 전용). `public/i18n` 의 고아 키 `home.reviews.empty`, 저작본↔ko.json 드리프트.
7. 네오 보조 글자 대비 약 4.75:1, 네오 키커 점무늬 최저 픽셀 4.34:1.
8. (해결됨) main CI parity 픽스처 결함은 옆 세션 95945a6ae 가 고쳤다.
9. (해결됨) 릴리스 dispatch run 36828942296(1b0663918)의 `Deploy staging › Probe staging is not indexable` 실패는 일시적 겹침이 아니라 09-30 88cb9a849 이후 탐침이 돈 모든 배포에서 반복된 결함이었다. 88cb9a849 가 `public/_worker.js` 에서 `/` → `/ggulggul/` 302 를 워커가 직접 돌려주게 했고, 워커가 만든 응답에는 `_headers` 의 X-Robots-Tag 가 붙지 않는데 탐침은 `curl -fsSI /` 로 302 만 봤다. 위의 "같은 SHA 의 schedule 릴리스 성공"은 `Deploy staging` 을 건너뛴 run 이라 반증이 아니었다. 탐침이 리다이렉트를 따라가 최종 응답 블록만 판정하도록 고쳤다(`.github/workflows/cloudflare-pages-deploy.yml`). 실제 색인 위험은 낮았다 — robots.txt 전면 Disallow 와 `/ggulggul/` 의 noindex 는 줄곧 살아 있었다.
