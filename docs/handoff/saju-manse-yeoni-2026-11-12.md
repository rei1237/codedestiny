---
status: in-progress
updated: 2026-11-12
next: "S2 명식 디자인"
---

# 사주 명식 속도·디자인, 3개월 무료 목록 + 연이 배너, 절기 리듬(月令) 개선

## 첫 행동
1. 워크트리 `D:\Development\codedestiny-worktrees\saju-manse-yeoni-20261112-175220`(브랜치 `wt/saju-manse-yeoni-20261112-175220`)에서 `git status`, `git log --oneline -3`.
2. 아래 단계에서 체크되지 않은 첫 항목부터 진행. 끝나면 체크박스·결과를 이 문서에 적고 커밋.

## 지금 상태
- 기준: origin/main `cd3d662d9`. node_modules·.env는 정션으로 공유 체크아웃에 연결됨.
- 공유 체크아웃 `D:\Development\code-destiny`는 다른 세션의 미커밋 30여 파일(+ origin/main보다 뒤처짐). **절대 건드리지 않는다**(전환·stash·reset·checkout -- 금지).

## 승인 상태 (원문·날짜)
- 2026-11-12 사용자: "첨부한 사주 명식 로딩이 늦게 되는 문제가 있고 폰트와 느낌도 더 고급스러운 귀여운 느낌으로 개선해주고 3개월 무료 문구는 재밌는 사주 콘텐츠라든지 구체적으로 무료로 해방한 내용을 구체적으로 목록을 보여주도록해주고 그 외에도 진입점을 꽃돼지 연이를 통해서 귀엽게 만들어줘"
- 2026-11-12 사용자: "내 절기 리듬 (月令) 부분은 태어난 계절에 해당하는 이미지를 넣도록해주고 … 이런 문구가 아니라 내용은 그 계절을 타고나서 어떤 성향이고 특징이 있는지 고객 입장에서 알기 쉬운 연이가 설명해주듯이 나와야해 예를들면 가을, 겨울생은 연애할때나 사람들을 받아들일때 쉽게 받아들이지 못하지만 한번 친해지면 깊고 봄, 여름 생은 반대에 가깝다고 봐야하고 기타 월령에 따른 성향에 대해서 더 세부적인 내용이 나오도록 개선해주길 바란다"
- 2026-11-12 사용자 선택: 연이 진입점 = **3개월 무료 배너**. 진행 범위 = **커밋까지만**(push·운영 배포 금지, 요청 시에만).
- 계획 승인: `C:\Users\user\.claude\plans\moonlit-roaming-pizza.md`.

## 작업 규칙과 함정
- 저장소 CLAUDE.md를 먼저 읽는다. 미러(public/*, public/ggulggul/index.html 등)는 손으로 고치지 말고 `npm run sync:public` 등 공식 생성기로만. 단계마다 `npm run check:fast` 통과 후 커밋. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 결제·가격·무료 판정 로직(lib/payment/*, worker 결제 경로, destiny-profile.js 게이트)은 건드리지 않는다. 이번 작업은 표시·UX·속도뿐.
- 다른 세션 문서 `docs/handoff/saju-btn-api-profile-free-promo-2026-11-12.md`(next C2)가 무료 프로모 파일을 만질 수 있음 → 커밋 전 `git fetch origin main`; 충돌 나면 rebase하고 그쪽 결정 우선.
- 홈 `/` 정본 app/page.js(React), `/ggulggul/` 정적 셸 정본은 루트 `index.html`.
- 메모리 규칙: 사용자 안내는 한국어. 네오는 은발 인간 남성. 연이는 꽃돼지.
- 실 LLM·실결제 호출 금지. 화면 확인은 로컬 mock 브라우저(Playwright 등, 360/390/1280 + 다크 neo-mode).

## 설계
### S1 명식 로딩 속도
현재 경로: 첫 제출 시 `__cdEnsureSajuCoreLoaded()`(`js/core/index-inline-runtime.js` ~2265-2314)가 스크립트 ~13개(≈3.8MB, saju-engine.js 1.7MB)를 순차 실행 → `startSajuCalculationFlow`(`js/saju-engine.js` ~5008)에서 세션 확인(`ensureSajuResultSession`) → `calculate`가 `/api/kasi/calendar` 대기(2.5s×최대 2회, `js/core/kasi-calendar-service.js`) → 결과 페이지 전체가 모든 렌더러 끝날 때까지 `visibility:hidden`(~5558-5624, renderManse 호출 근처).
1. 먼저 계측: 로컬 서버 + Playwright(4x CPU 스로틀·Fast 3G)로 제출→`#manseGrid` 채워짐까지 구간별 시간. 스크립트는 세션 스크래치에(저장소에 남기지 않음).
2. 가장 큰 구간부터: (a) 입력 폼 노출/생년월일 포커스 시 `__cdEnsureSajuCoreLoaded()` idle 예열, (b) 생년월일 유효 시 KASI 선조회 캐시(calculate가 재사용, 결과·폴백 동일), (c) 명식 카드 먼저 보이고 무거운 섹션은 다음 프레임으로. 계측상 효과 없는 항목은 하지 않음.
3. 회귀: 같은 입력의 명식·신살 출력 동일.

### S2 명식 디자인 (고급 + 귀여움)
`index.html` #sajuCard(~18431), `styles/fortune-ui.css` 사주 카드 블록(~17016-17230, 모바일 ~17391), `styles/fortune-ui-home.css` 크리티컬 부분.
- 라벨·캡션: `CodeDestinyPlayful`(Gowun Dodum, fonts-serif.css에 이미 있음).
- 한자 타일: 명조 유지. 모바일은 `index.html` ~4897에서 `--font-premium`이 시스템 고딕으로 바뀜 → 천간·지지 22자 서브셋 woff2(원본 폰트가 저장소/node_modules에 있으면 생성) 또는 해당 unicode-range 청크만 선로딩해서 모바일도 명조.
- 오행 파스텔 그라데이션 + 얇은 금빛 테두리·부드러운 그림자, 일주 강조, 12신살 알약 한지 톤, 다크 대응. id·클래스 구조 유지.

### S3 3개월 무료 배너: 구체 목록 + 연이
정본 `lib/marketing/free-promo.mjs`, 정적 셸 `lib/marketing/free-promo-shell.mjs` → `templates/home-funnel.html` → index.html, React `app/components/FreePromoBanner.tsx` + `free-promo-banner.module.css`, 다국어 `i18n/authored/freePromo-01.json`.
- `FREE_PROMO_ITEMS`(표시 전용) 묶음: 재밌는 사주 콘텐츠(사주 네컷·도파민·호르몬 바이브·로또·AI 프롬프트 카드·T 테스트 등) / 정통 사주(명식·12신살, 절기 리듬, 만세력, 궁합, 오늘의 운세) / 다른 운세(타로·자미두수·숙요·베다·점성술·프롬프트 생성기). 실제 무료인 것만(`lib/payment/free-fortune-policy.mjs`·원래 무료 기능과 대조), 링크는 실제 동작하는 진입 href. 제외 고지 유지.
- 테스트: 항목이 무료 정책과 맞는지.
- 레이아웃: 연이 이미지(`public/images/home/illustrated/yeoni-character-320.webp` 또는 `public/images/fortune-chat/persona/yeoni-cheer.webp`) + 말풍선("연이가 2월 12일까지 이만큼 풀어 놨어요!" 류), 칩 목록 클릭 시 해당 풀이로. 연이 클릭 → `/?action=cdOneStepFreeSajuEntry`(정적 셸 기준 경로 확인). D-N·공유 유지. 정적·React 동일 데이터. 12언어 문구.

### S4 내 절기 리듬(月令)
`js/saju-engine.js`: `_t24SeasonProfile`(~10125), `_t24DomainCards`(~10143), `buildSeasonalFortuneContext`(~10188), `render24Terms`(~10270), `_ensureTerms24Style`(~9946, style id 버전 올림). 줄번호는 재확인.
- 이미지: 미사용 `public/images/saju/nature/{spring,summer,autumn,winter}-{480,960}.webp`를 카드 상단 `<figure>`(패턴 `js/core/saju/reading-rich.js:86`). 환절기 辰→봄, 未→여름, 戌→가을, 丑→겨울.
- 문구: 12개 월지별, 연이 말투("~해요"), 작은 연이 아이콘 + "연이의 계절 이야기". 헤드라인(계절·성향 한 줄) / 본문(기본 기질) / 카드: 성향·사람을 받아들이는 방식·연애할 때·일과 돈(+컨디션은 조후 문장 짧게). 기존 행동 지침 문장 제거, 설명 + 가벼운 연이 팁.
- 축: 봄·여름생 = 마음을 빨리 열고 금방 친해지지만 식기도 빠른 편 / 가을·겨울생 = 쉽게 곁을 내주지 않지만 친해지면 깊고 오래감 / 환절기(辰未戌丑)생 = 두 계절 사이 조율형. 같은 계절 안 이른·한·늦은 달 차이. 초입/중반/마무리 한 줄 보정. 단정 금지 톤("~한 편이에요"). 근거 칩·진행바 유지.
- 테스트 1개(`__tests__/ui/`): 12개 월지 모두 이미지·헤드라인·카드 채워짐, 계절 축 문구.

## 단계
- [x] S1 명식 로딩 계측·개선 → 커밋 (계측 before/after 수치를 결과에 기록)
  - 계측(로컬 mock 서버, 4x CPU·Fast 3G, 390px, 각 3회 중앙값, 제출 클릭 기준 ms): 입력→제출(typing) manseFilled 10608→4200, 결과 페인트 18203→7254 / 자동입력 즉시 제출(prefilled) manseFilled 5968→3422, 페인트 9971→8267. KASI 2회 순차 호출(≈1.3–2.3s)이 임계 경로에서 0으로.
  - 구간: 코어 로드는 /ggulggul 진입(입력 노출·포커스 intent 예열)에서 이미 제출 4~60s 전 완료 → (a) idle 예열 불필요, 안 함. 세션 확인 /api/auth/me ≈0.6s(변경 없음). 렌더 함수 자체는 수 ms.
  - 커밋 1a511402a(perf), abfb62e55(rebase 후 sync:public 해시) — origin/main fb9fab012 위로 rebase. check:fast(--base=fb9fab012): paid-gate 89 통과/1 실패, 실패는 merge-base에서도 재현(이번 변경 무관) — rebase 후엔 __tests__/ui/free-crafted-panel-policy.test.mjs "generated ESM is the unchanged canonical exact-key policy"(워크트리 free-fortune-policy.mjs가 CRLF 체크아웃, 생성기는 LF; 결제·무료 판정 파일이라 손대지 않음). rebase 전 check:fast: paid-gate npm test 1건 실패 — fortune/data/daily-<오늘>.json 미생성(merge-base에서도 실패, 환경 문제). `npm run fortune:build-data` 후 해당 테스트(__tests__/fortune/sky-and-range.test.mjs) 단독 7/7 통과.
  - 변경: `js/core/kasi-calendar-service.js` — 양력 입력의 getLunCalInfo·get24DivisionsInfo 병렬화, `warmNetwork(input)` 추가(메서드 캐시만 데움, 컨텍스트 캐시·현재 컨텍스트 미기록 → 실패해도 재시도·폴백 동일). `js/saju-engine.js` — #birthDate·calType input/change(200ms 디바운스)와 코어 로드 직후 warmNetwork 호출. 미러는 sync:public.
  - 회귀: before/after 서버 A/B로 4개 입력(양력·음력·입춘 경계·시간 모름) #manseGrid·12신살 텍스트 동일.
  - 남은 병목(후속 후보, 이번엔 안 함): 결과 페이지 첫 레이아웃이 1회성으로 ≈1.9s(4x)(saju-engine.js의 resultPage.scrollIntoView 강제 레이아웃, 두 번째 계산은 0.1s) + 다음 프레임 레이아웃 ≈2s. (c) 섹션 지연은 구조 변경이 커서 S2 디자인 작업과 함께 검토. 프로필 경로(_injectAndRun)는 콜드 코어 로드라 계측 안 함.
- [ ] S2 명식 디자인 → 커밋 (스크린샷 경로 기록)
- [ ] S3 무료 목록·연이 배너 → 커밋
- [ ] S4 절기 리듬 이미지·문구 → 커밋
- [ ] 마무리: `git fetch` 후 origin/main 위로 rebase(미러·사이트맵 재생성 필요 시), check:fast, 이 문서 결과 정리. push·배포는 하지 않음(사용자 요청 대기).
