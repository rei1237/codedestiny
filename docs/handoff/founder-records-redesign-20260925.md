---
status: done
updated: 2026-09-25
next: "영냥이 홈 FounderTrust(대통령 기록) 섹션 개편은 커밋 ed4da8538·7dbfddaa0·9cd6b9297 로 운영까지 반영 완료. 후속 후보(각각 별도 결정): ① /yeongnyangi/1000-won-fortune/ 모바일 로드 직후 CLS ≈0.07~0.10 — 첫 화면 page_actions 영역에서 발생, 섹션 무관·개편 전 운영에서도 동일(기존 결함). ② 일러스트가 hero 치비 화풍과 다름(반실사 페르시안) — 재생성은 codex-image 1회 승인을 새로 받아야 한다. ③ 정적 셸 index.html·templates/home-funnel.html trust 블록과 Consultation.tsx:138 details 는 이번 타임라인 형식(원문 인용/이후 분리)으로 통일되지 않았다."
---

# 영냥이 홈 "대통령 기록" 섹션 개편 (2026-09-25)

## 결과
- 대상: `app/components/FounderTrust.tsx` + `.module.css`. `/`(FortuneHome)와 `/yeongnyangi/1000-won-fortune/` 두 곳에서 쓴다.
- 구조: eyebrow(`founder.credential`) → h2 "두 대통령의 2025년을 맞힌 명리학자" → 리드 → `#founder-timeline` 앵커 CTA → 일러스트 → 카드 3장(게시일·원제·당시 원문 인용·이후·원문 보기) → 주석 → 천원 오퍼(카탈로그 `saju_mackerel.priceKRW`) + 보장 아님 문구 → method → nav.
- 인용문·이후 사건은 `lib/brand/prediction-timeline.ts`(URL 키). `prediction-records.json`에 없는 키가 있으면 렌더에서 throw(fail-closed).
- `founder.ts`·`prediction-records.json`은 건드리지 않았다(생성물·deepEqual 테스트·Consultation·verify-premium-* 공용).

## 사실 확인 (원문 curl, 2026-09-25)
| 게시(네이버 표시) | 원제 | URL |
|---|---|---|
| 2022-09-16 18:28 | 대통령 윤석열 사주 분석 | https://blog.naver.com/neosaju/222876455500 |
| 2024-05-12 11:26 | 2025년, 윤석열 대통령 탄핵 가능성에 대해서 | https://blog.naver.com/neosaju/223444062729 |
| 2024-05-27 11:22 | 만약 이재명이 대통령이 된다면 일반적인 방법으로는 불가하다. | https://blog.naver.com/neosaju/223459696339 |

- 인용은 원문 철자 그대로(쯔음·꺽이게). "탄핵"은 05-12 글 제목에만 있고 본문 "빠르면 올해 10~11월"은 실제(12월)와 다르므로 월 단위 적중은 주장하지 않는다.
- 05-27 글의 2022 대선 예측 실패 고백은 사용자 결정으로 표기하지 않는다.
- 네이버 수정 이력은 비공개라 게시 후 수정 여부는 검증 불가.

## 에셋
- `public/assets/yeongnyangi/original/records-scroll-{480,960}.webp` (19,016 B / 58,552 B). 출처는 같은 폴더 `README.md`(codex-image gpt-image-2 1회 생성, 원본 PNG 미커밋, 장식 전용).

## 검증
- `verify-conversion-sharing.mjs`(수동 검증기, CI 미배선)에 타임라인 href·인용 수·CTA·이미지 크기·터치 44px 단언 추가. dev 3107 기준 390/1280 전부 PASS.
- 주의: 이 체크아웃에서 다른 프로세스의 `next dev -p 3107` 이 `.next` 를 잡고 있으면 `verify-yeongnyangi-browser.mjs --build-static` 이 거부된다. 죽이지 말고 dev 서버 기준으로 검증했다.
- 보조 스크립트(`build-cache/founder-records/`, gitignore): `check.mjs <base> <outdir>`, `cls.mjs`, `cls2.mjs`(모바일 에뮬레이션 이동 원인 노드 추적).

## 배포
- push `9cd6b92976e25a19299c877585fd70ccdeba1004` → main CI 전부 success → `verify:staging --sha` PASS(Pages·Worker 일치; 첫 시도는 Pages 전용 후속 런이 끝나기 전이라 FAIL, 재실행 PASS) → `verify:release` exit 0.
- 운영: [릴리스 런 36060264480](https://github.com/rei1237/codedestiny/actions/runs/36060264480) `mode=production` success. dispatch 직전 origin/main == 9cd6b92 확인, headSha 동일.
- 공개 재확인(https://code-destiny.com, 390/1280, `/`·1000원 페이지): h2 새 문구, `_blank` 원문 3개(href 일치, 각 200), 천원 CTA href 불변, 최소 링크 높이 44px, 가로 스크롤 없음, reduced-motion 전환 0s, 포커스 outline solid, 이미지 lazy·480w 19,016 B.
- CLS: `/` 0.0015~0.0027. 1000원 페이지 390폭은 실행마다 0.08~0.19 — 전부 로드 직후 첫 화면(page_actions·hero 문단)에서 발생하고 스크롤 후 이동 0건, 개편 전 운영도 같은 노드에서 ≈0.097. 섹션 무관(후속 ①).
