# 무료 운세·타로 UX 개편 — QA 요약 (8단계, 2026-11-21)

근거: [인수인계](../handoff/free-tarot-ux-revamp-2026-11-20.md) 각 "결과" 절, 원문 [단계별 프롬프트](../prompts/2026-11-20-free-tarot-ux-revamp-stages.md) 8단계. 사용자 지시(2026-11-21): "빠르게 진행 … 회귀는 없도록, 너무 꼼꼼하지 않아도 돼" → 가벼운 QA. 원문 8단계 체크리스트 전부(앱 WebView·화자 샘플 30건·perf 전후·e2e 전 기능)는 **돌리지 않았다**. 아래에 실측과 미검증을 나눈다.

## 이전한 흐름 · 플래그 · 롤백

플래그 정본은 `lib/guided-flow/flags.mjs`(모두 `true`). 끄면 이전 화면으로 돌아간다. 정적 셸 쪽 짝 상수가 있는 것은 두 곳 다 바꾸고 `npm run sync:public`.

| 흐름 | URL | 플래그 | 롤백 |
|---|---|---|---|
| 오늘의 세 장 | `/today/` | `GUIDED_DAILY_TAROT_ENABLED` | false 또는 revert `2f67788ca` |
| 치유 타로 | `/tarot/healing/` | `GUIDED_HEALING_TAROT_ENABLED` | false 또는 revert `c370bea64` |
| 무료 사주 간편 폼 | `/saju/free/` | `GUIDED_FREE_SAJU_ENABLED` | false 또는 revert(머지 `36543dc2a`) |
| 웹툰 결과(오늘의 세 장) | `/today/` 결과 | `GUIDED_WEBTOON_RESULT_ENABLED` | false 또는 revert `de993c7e3` |
| 12운성 동물 입력 | `/saju/animal-destiny/` | `GUIDED_ANIMAL_DESTINY_ENABLED` | false 또는 revert `f6b5f2d86` |
| 별빛 포옹 입력 | `/yeon-star-hug/` | `GUIDED_STAR_HUG_ENABLED` | false 또는 revert `0042e6025` |
| 영냥이 출석 운세 16종 | `/yeongnyangi/room/` | `GUIDED_YN_FREE_FORTUNE_ENABLED` | false 또는 revert `2b2025761` |
| W1 공용 출생 입력 | 위 세 흐름 | `GUIDED_BIRTH_{FREE_SAJU,ANIMAL_DESTINY,STAR_HUG}_ENABLED` | 흐름별 false, 연결만 revert `a9be008d1` |
| W2 비회원 무료 결과 | 셸 사주 결과 | `FREE_RESULT_GUEST_ENABLED`(+셸 상수) | false + sync:public |
| W3 메인 인기 TOP5 | `/ggulggul/` | `POPULAR_TOP5_ENABLED`(`js/core/popular-top5.mjs`) | false + sync:public |
| W4 마스터 모션 | 홈 | `MASTER_MOTION_ENABLED`(`lib/master-motion/flags.mjs`·`js/core/yehwa-home.mjs`) | false + sync:public 또는 revert `c038f3980` |
| 6a 무료 목록 카드 | `/`·무료 SEO 랜딩 | `GUIDED_FREE_LIST_ENABLED` | false(칩 마크업 그대로) 또는 revert `d9d60b8cf` |
| R2 무료 사주 진입 | `/?action=cdOneStepFreeSajuEntry` → `/saju/free/` | `FREE_SAJU_ENTRY_GUIDED_ENABLED`(+index.html 인라인) | 두 곳 false + sync:public 또는 revert `d10e048d9` |
| R4-1 타로 랜딩 CTA | `/tarot/{love,mingri,year}` | 없음 | revert `e85ff159a` |
| R4-2 `/tarot/mingri/play` 301 | 워커 `CONSOLIDATED_PAGE_REDIRECTS` | 없음 | revert `5afe216aa` |
| 자존감 타로 진입 수정 | 셸 컬렉션 | 없음 | revert `3fceb1b01` + sync:public |
| R5 서양 점성술 | `/astrology/` → 셸 폼 채움 | `GUIDED_ASTRO_ENABLED`(flags.mjs + `js/destiny-profile.js`) | 두 곳 false + sync:public(+캐시 핀) 또는 revert `81cc9e199 1172b1c71` |
| 5단계 ① 명리 무료 세 장 | `/tarot/mingri/` 인라인 | `GUIDED_MINGRI_TAROT_ENABLED` | false 또는 revert `4ff37b8d4` |
| R4-3 홈 타로 진입 | `cdHomeTarotEntry` → `/tarot/mingri/` | `MINGRI_TAROT_ROUTE_ENABLED`(`js/destiny-profile.js`, 위 플래그와 묶음) | 둘 다 false + sync:public 또는 revert `e178bee44` |
| 7단계 삭제 | `app/tarot/mingri/play/page.tsx` | 없음 | [legacy-tarot-free-ui](legacy-tarot-free-ui.md) |
| 후속 1 R5 숙요 | `/sukuyo/` → 셸 폼 채움 | `GUIDED_SUKUYO_ENABLED`(flags.mjs + `js/destiny-profile.js`) | 두 곳 false → sync:public → restamp-paid-runtime-pins → payment-freeze --update, 또는 revert `a988b810e fc2deb290` |
| 후속 1 R5 베다 | `/vedic/` → 셸 폼 채움 | `GUIDED_VEDIC_ENABLED`(flags.mjs + `js/destiny-profile.js`) | 숙요와 같음(같은 커밋) |
| 후속 2 R3 궁합 링크 | 궁합 링크·매핑 3곳 | 없음 | revert `765b3607b` |
| 후속 3 L1 비회원 무료 결과 | `/today/`·`/manse/` | `FREE_READING_GUEST_ENABLED`(flags.mjs 전용, 셸 미러 없음) | false 또는 revert `0b1e65215` |
| 후속 4 R1 무료 목록 페이지 | `/free/` + `/ggulggul/` 배너 링크 | `FREE_LIST_PAGE_ENABLED`(flags.mjs) | false → sync:public → sitemap:generate, 또는 revert `9298bd0f1` |
| 후속 5 R5 자미 | `/ziwei/` → 셸 폼 채움 | `GUIDED_ZIWEI_ENABLED`(flags.mjs + `js/destiny-profile.js`) | 두 곳 false → sync:public → restamp-paid-runtime-pins → payment-freeze --update, 또는 revert `0316be0ec b4505ff70` |

W3 `POPULAR_TOP5_ENABLED` 참고: F2 에서 API 실패 시 예약 높이 접힘·503 no-store 재시도·edge-cache 검사 목록을 고쳤다(ce873aace·d55643af8). `source:"sales"` 공개 범위는 아직 미결(아래 후속).

## 실측 (이번 8단계, 2026-11-21)

mock dev 서버(`npm run dev`, fixtures only, 과금 LLM 없음), 플래그 기본값(전부 켬), 비로그인, 390×844, chrome. 상태 코드 + 콘솔 오류.

| URL | 상태 | 콘솔 오류 |
|---|---|---|
| `/` | 200 | mock 501 1건(미구현 API, 기존) |
| `/today/` | 200 | mock 401(비로그인)·501 각 1건. 첫 시도 500 은 새 워크트리에 `fortune/data` 가 없던 탓 → `npm run fortune:build-data` 뒤 200 |
| `/tarot/healing/` | 200 | 0 |
| `/tarot/mingri/` | 200 | 0 |
| `/saju/free/` | 200 | 0 |
| `/astrology/` | 200 | 0 |
| `/yeongnyangi/room/` | 200 | mock 501 3건(기존) |
| `/tarot/mingri/play/` | 404(next dev) | 예상 — 운영에서는 워커 301 → `/tarot/mingri/`(`__tests__/ui/consolidated-pages.test.mjs` 8/8 로 확인) |

JS 예외(pageerror)는 0. 상호작용(진입→결과)은 이번에 다시 돌리지 않았다 — 각 단계 결과 절의 실측(360·960 워크스루, visual-checker)에 기댄다.

## 이전 단계에서 실측한 것 (요약)
- 각 흐름 360·960 헤디드 워크스루, 플래그 on/off 비교, 가로 넘침 0, 액션 48px 이상(3c·4·5①·R2·R5 결과 절).
- 대비: 가이드 셸 `verify-guided-flow-contrast.cjs`(두 브랜드 × 360/390/430/960), 6a 카드 제목 14.5·설명 6.0:1.
- 결제 경로: 각 단계 check:fast 의 paid-gate 스위트(78), verify:payment-choice-parity·paid-gate-ui·payment-freeze PASS.

## 미검증
- Android WebView 앱(com.codedestiny.app) 실기기, 스테이징·운영 실주소.
- perf:home 전후(dist 빌드 필요 — 3단계 전 측정값만 있음: 성능 49, LCP 12127ms, TBT 185ms, CLS 0.145).
- 화자 말투 샘플 30건 점검, 프레임 드랍, 결과 화면 이미지 총 용량.
- 원문 8단계 e2e(무료·타로 기능별 1개, 브랜드별 결과 1개) 신규 작성.

## 알려진 후속 과제·결함 (보고만, 범위 밖)
1. ~~360px 하단 고정 CTA 와 셸 하단 내비 겹침(기존 셸).~~ 해결(F1 43bf15f95: 셸 루트 main `overflow: clip`, 쿠키 배너 동안 CTA 흐름 배치).
2. ~~12운성 동물 랜딩 안내 "3단계" 와 진행 표시 "1/6" 불일치.~~ 해결(F1 b9498d422: 실제 7단계 순서로 문구 갱신).
3. ~~낮은 대비: 셸 사주 입력 상단 안내 박스 약 1.89:1, 셸 점성 폼 "달빛 초대 링크"(달빛 명칭 잔존) 약 2.03:1, FLP 면책 문구 2.26:1.~~ 해결(F1 8a7fb1198 안내 박스 15:1·"초대 링크로"·#74475a, fd1cc05c5 FLP 알파 0.9). 점선 슬롯·테두리 버튼 3.1~3.2:1 은 UI 경계 기준 3:1 통과로 유지. ~~남은 대비: 푸터 사업자 정보 2.24:1, 동물 페이지 머리 부제 2.22:1·"Saju Animal Oracle" 3.37:1, 궁합 "/" 구분자 1.24:1~~ 해결(F3): 푸터 사업자 정보 상자 글자색을 #70445c 로 명시(인라인 #aaa 를 덮음, 실제 글자는 이미 p·span 덮어쓰기로 6.8~15:1), 브레드크럼 "/"(aria-hidden) 를 muted 글자색으로(5.1~5.5:1). 동물 머리 부제·"Saju Animal Oracle" 은 측정 오탐 — 배경 그라데이션(background-image)을 빼고 어두운 body 위로 합성한 값이었고, 픽셀 실측 7.85:1·5.12:1(계산 5.1:1)로 통과라 바꾸지 않음. 장식 ✦ 1.8:1 은 aria-hidden 장식이라 유지.
4. ✅ (F2 수정 20928b5f3) `/astrology/` 히어로 CTA 가 `/ggulggul/` 로 가서 프로필 없는 사용자는 되돌아오는 두 홉.
5. ✅ (F2 수정 002793a11) 자존감 랜딩 `TarotSelfEsteemLandingContent.tsx` 의 `href="/?action=openTarotSelfEsteemModal"` — 운영에서 302 한 번 더.
6. ✅ (F2: 홈 카드 직행 4eba58cb4, 셸 액션은 설계상 비회원 confirm) `/ggulggul/?action=startMindScanTarot` 는 쿼리만 지우고 아무것도 안 연다(base 와 동일).
7. `__tests__/fortune/daily-scroll-copy.test.mjs`(옆 세션 f115ff409, node:test 파일을 jest 가 집어 "at least one test") — 그 세션 소유.
8. 없는 표정 그림: ~~연이 greet~~(F3: remaster wave 모바일판 `yeon-20ac944e7a.webp`), 연이 worry, 영냥이 explain·worry·cheer·serious(`MISSING_EXPRESSION_ART`, 가까운 표정으로 대체). 남은 5장은 Codex 이미지 생성 사용 한도 초과(2026-11-21 F3, ChatGPT 계정 한도 — 추가 크레딧 구매 필요)로 미생성. 재시도 절차는 [인수인계 F3](../handoff/unapproved-followups-2026-11-21.md#f3-후속-그림대비동물-배너-2026-11-21).
9. ✅ (F2 수정 ce873aace·d55643af8, sales 는 보고만) W3 위험: API 실패 시 예약 484px 접힘, DB 장애 동안 503 no-store 재시도, `verify-public-api-edge-cache` 목록에 새 라우트 미포함, `source:"sales"` 공개 범위 확인 필요.
10. 기타: ~~단계 제목 포커스 outline 노란 상자~~(F1 43bf15f95 금빛 밑줄로 해결), 360 다크 카드 직각·무테는 셸 풀블리드 설계(48rem 이상에서만 테두리·둥근 모서리, 의도 — 유지), 6a "약 N분" 은 표시용 추정, `CutReader.tsx` 말풍선 key(✅ 29ca06503 에서 이미 수정), `index.html` 가격 하드코딩.
11. ✅ (F2: 생성기 있는 두 파일 재생성 ae7d01834, PAGE_INVENTORY·mobile-platform 은 생성기 없음) `docs/purchase-journey/inventory.json`·`docs/mobile-platform/inventory.*`·`docs/payments/payment-p0-inventory.json`·`docs/seo/PAGE_INVENTORY.md` 생성 스냅샷에 삭제된 `/tarot/mingri/play` 행이 남아 있다(배선된 검사 없음, 다음 재생성 때 빠짐).
12. 7단계 중 R5(81cc9e199)가 남긴 낡은 캐시 핀(`destiny-profile.js?v=` 독립 페이지 22곳)으로 verify:payment-choice-parity 가 main 에서 실패하던 것을 이번에 고쳤다(`fix(cache)` 커밋).

## 남은 후속 과제 (2026-11-21 미승인 후속·F1~F3 뒤)
상세는 [인수인계](../handoff/unapproved-followups-2026-11-21.md).
- 표정 그림 5장(연이 worry, 영냥이 explain·worry·cheer·serious) — Codex 이미지 생성 사용 한도 초과로 차단(21:06 리셋). 재시도 절차는 인수인계 F3 A.
- `AstroGuidedEntry`(숙요·베다·점성·자미 공통): 빈 이름이면 "다음" 이 비활성인데 도움말은 "비워 두고 다음을 눌러도 돼요". 원인 `app/astrology/AstroGuidedEntry.tsx` 의 `required: { name: true }`. 수정 4곳은 권한 검사(사용자 승인 대기)로 막혀 적용하지 않았다. → 해결(2026-11-21 승인, 커밋 05b6ce2a6): 이름 선택 입력, 셸 폼이 저장 전에 이름을 받는다.
- W3 TOP5 `source:"sales"` 공개 범위 정책 결정.
- `index.html` 가격 하드코딩.
- 2027-02-12 무료 프로모션 종료 때 `/free/`·배너 링크 처리.
- 360 상담 캐러셀 모달 닫기 버튼 잘림.
- 360·960 쿠키 배너가 열린 동안 단계 제목이 가려짐 — 입력·"다음" 을 배너 위로 올린 대가로 받아들인 절충(배너를 닫으면 사라짐).

## 아직 승인되지 않은 것 (실행하지 않음)
- 완료(2026-11-21 사용자 "권장안으로 진행"): R1 `/free/`, R3 궁합 링크, L1 비로그인 결과, R5 자미·숙요·베다 — 위 플래그 표.
- D1 `FreePromoBanner` 칩 마크업·`.chips` CSS 삭제(롤백 경로로 유지 — 2026-11-21 7단계 승인은 `/tarot/mingri/play` 만).
- D8 하루 1회 서버 저장(DB), D10 연애 타로 무료화, 유료 비회원 결제, 운영 승격, 과금 LLM 실호출.
