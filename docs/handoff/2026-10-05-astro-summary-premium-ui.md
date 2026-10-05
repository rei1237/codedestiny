---
status: done
updated: 2026-10-05
next: "완료. §6 은 사용자 승인(10-05) 뒤 전체 카탈로그 동기화로 처리(§10 마지막 항목)."
---

# 점성술 "차트 전체 요약" 서랍 고급화 + 낡은 결제 목록·범위 밖 결함 정리

위험도: UI 부분 **GREEN**(문구·CSS·마크업·SVG). §6 결제 목록과 레지스트리 표시명은 **RED**(결제 문서 축). 권장 모델/effort: Opus · high.
선행 작업:
- [2026-10-04-astro-premium-redesign.md](2026-10-04-astro-premium-redesign.md) (done): 표지·휠·`styles/astro-reading.css`·"이전 해석 기록" 서랍.
- [2026-10-05-astro-timing-and-daily.md](2026-10-05-astro-timing-and-daily.md) (done): 오늘의 별자리 운세, 유료 `astro_yearly_transit`, 쉬운 말. §8 후속 과제가 이 문서 §7의 출처다.

## 요청 원문 (2026-10-05)

> 내 탄생 별자리 지도, 지금 운이 들어오는 길 - 목성의 흐름, 연애 설렘 포인트 - 마음이 켜지는 순간 등 차트 전체 요약에 있는 부분의 ui를 더 고급스럽게 개선해줘 필요하다면 새로운 svg 또는 이미지를 그려서 개선해주면 좋겠고 이 세션에서 말고 다른 세션에서 진행할 수 있도록 인수인계 문서를 만들어서 개선해야하며, 결제 목록 낡은것이나 범위 밖 문제들도 함께 수정해주도록 만들어

정리하면 이번 세션이 할 일은 세 가지다. 셋 다 이 세션에서 끝까지 한다.
1. 서랍 안 블록 UI 고급화(§3~§5)
2. 낡은 결제 생성 목록 3종 재생성(§6)
3. 직전 작업이 보고만 남긴 범위 밖 결함 수정(§7)

## 0. 시작 절차

1. 시작 확인: `git branch --show-current`, `git status`, `git pull --ff-only`. 🔴 main 체크아웃에는 옆 세션의 미커밋 파일(index.html·public/*·marketing/*·rss·llms·.tmp/)과 미푸시 커밋이 있을 수 있다. 쓰는 세션이 둘 이상이면 `scripts/create-safe-worktree.ps1 -Slug astro-summary-ui` 로 워크트리를 만든다.
   - PowerShell 5.1 이 git stderr 를 NativeCommandError 로 보고하지만 워크트리는 생성된다.
   - node_modules 정션은 만들어지지 않으니 직접 만든다: `New-Item -ItemType Junction -Path <wt>\node_modules -Target D:\Development\code-destiny\node_modules`.
   - 셸 cwd 가 main 으로 되돌아가므로 매 명령에 절대 경로를 쓴다.
2. 읽기:
   - `docs/context/design-canon.md` 전체. 토큰 전용, 하드코딩 hex 신설 금지, `dark:`·`prefers-color-scheme` 금지, 대비 4.5:1/3:1, 장식 이모지 신설 금지(정체성 이모지는 🌸·🦁뿐), 검증 루프.
   - `styles/astro-reading.css` 머리 주석과 토큰 블록(1~40줄).
   - 선행 premium 핸드오프의 디자인 결정 절.
3. §6을 시작하기 전에 `docs/context/payment-gating.md` 를 읽고 **paid-gate-auditor** 판정을 받는다.
4. 세션 상태 파일에 목표·요청 원문·체크리스트를 적는다.
5. 현재 화면을 기준으로 찍어 둔다(§2 프로브). 스크린샷은 메인 세션에서 직접 Read 하지 말고 visual-checker 로 보낸다.

## 1. 대상의 정확한 위치 (origin/main da6757a72 실측)

런타임 위치는 결과 화면 내비 "깊이 읽기"(`#fr-astro-planets`) 안의 `details#fr-astro-record` "이전 해석 기록" 서랍이다. 옮기는 코드는 `js/core/saju/basicFortunePresentation.js:769-843` 이다.
- recordItems 선택자: `#astroBig3Snapshot, #astroLifeAreaSection, #astroPersonalGuidanceSection, #astroBirthMapSection, #astroAspectStorySection, .precision-insight-card` + 나머지 루트 자식.
- 🔴 유료 게이트(`#astroActionHub`, `#astroAiPromptSection`, `.astro-stellar-archive`, `.astro-compat-panel`)는 상담 섹션으로 모은다. 서랍이 구매 입구를 묻지 않게 하려는 것이므로 **유지**한다.
- 서랍 높이: 390폭 약 15,048px, 1280폭 약 10,670px.

서랍 안 블록 순서와 HTML 생성 위치(`js/saju-engine.js`):

| # | 블록 | 생성 위치 |
|---|---|---|
| 1 | 태양·달·상승궁 핵심 요약 | `astroBig3SnapshotHtml` (~14062) |
| 2 | 삶의 영역 리딩 | ~13826 |
| 3 | 현실에서 쓰는 별자리 조언 | ~13848 |
| 4 | **내 탄생 별자리 지도** | `birthMapSectionHtml` ~13517 |
| 5 | 행성 각도 이야기 | ~13838 |
| 6 | **차트 전체 요약** | masterInsight `.precision-insight-card.astro-neon-accent-gold` 13908-13915 |
| 7 | 히어로 "당신의 별자리가 다시 말을 걸기 시작합니다" | `.astro-restored-hero` |
| 8 | 태양·달·상승궁 한눈에 보기 | 인라인 `.astro-section` 14387~ |
| 9 | 생각·말투·성장 변수 | 〃 |
| 10 | 커리어 방향 | 〃 |
| 11 | **연애 설렘 포인트 - 마음이 켜지는 순간** | 〃 (descSign·venusSign·marsSign·`vmAspect \|\| vmCalcFallback`) |
| 12 | **지금 운이 들어오는 길 - 목성의 흐름** | 〃 (`jupiterTransit`·`transitMsg[jupiterIndex]`·`transitExecutionText`) |
| 13 | 오늘 바로 써먹는 집중 포인트 | 〃 ~14469 |
| 14 | 나와 시너지가 나는 사람 | 〃 |
| 15 | 💞 궁합 핵심 리포트 | ~14485 |
| 16 | 4원소 균형 | ~14604 |
| 17 | 인생의 큰 시기 | ~14626 |
| 18 | 올해의 주제 | ~14678 |

- 스타일은 인라인 `astroNeonCss`(14075-14289)다. 예: `.astro-body .astro-subhead{font-size:18px;font-weight:800;color:#c4b5fd}`, 640px 미디어 규칙.
- 조립 순서는 14342-14380 이고, 서랍 블록은 `#astroDetailLayer` 안에 들어간다.
- 줄 번호는 이동한다. 착수 전에 `git grep -n "내 탄생 별자리 지도\|목성의 흐름\|마음이 켜지는 순간\|차트 전체 요약" -- js/saju-engine.js` 로 다시 잡는다.

## 2. 현재 화면 기준선 (visual-checker 판정, 2026-10-05, 390·1280 mock)

싸 보이는 공통 원인:
- 같은 카드 틀(남색 `#13192e` + 1px `#323a58` 테두리 + 큰 둥근 모서리)을 약 20번 반복하고, 일러스트가 없다. 1280에서 별자리 선화 SVG 는 "삶의 영역" 블록에만 있다.
- 이모지와 유니코드 기호(💬🍀🌕👉💞✨🤍🔥🌿💨💧💼✅, 문장 앞 ⊙☽↑)를 아이콘처럼 쓴다.
- 강조색이 블록마다 다르다: 청록 `#67e8f9`, 금 `#fde68a`, 보라 `#c4b5fd`, 분홍 `#f48fb1`, 원소별 4색. astro-reading.css 의 "금색 단일 강조" 원칙과 충돌한다.
- 제목 위계가 약하다(얇은 회백 `#cdd6e8`, 크기·굵기 차이 작음).
- 칩과 이름이 한 줄에 섞여 엉키게 줄바꿈된다(커리어, 연애).
- 390에서는 한 줄 약 18자짜리 글 벽이 화면 대부분을 차지한다.

블록별 문제:
- **내 탄생 별자리 지도**(390 y≈1985–3885): 청록 알약 버튼 "핵심 요약 ON" 아래 같은 행성 카드 10장을 세로로 쌓아 약 1,700px 를 쓴다. 카드 한 장에 색이 4개다.
- **차트 전체 요약**(4740–5200): 번호 문단 "1) 한눈에 보는…"이 통짜 글 벽이다. 런타임 제목색은 금이 아니라 `#cdd6e8` 이다.
- **히어로**(5220–5915): 금테 칩 4개 중 하나가 혼자 줄바꿈된다. 같은 모양 카드 3개, 일러스트 없음.
- **연애 설렘 포인트**(8315–8935): 칩 줄이 엉키고 3문단이 글 벽이다. 별자리 이름이 390에서는 흰색, 1280에서는 분홍으로 일관성이 없다.
- **목성의 흐름**(8945–9475): 👉 이모지가 든 보라 인용 박스 바로 아래 문단이 여백 없이 붙는다.
- **오늘 바로 써먹는 집중 포인트**: "라벨: 문장" 4줄뿐이다.
- **궁합 핵심 리포트**: 제목에 이모지가 있고 본문은 "데이터 없음" 빈 상태다.
- **4원소 균형**: 2×2 타일과 진행 막대로 가장 정돈된 블록이다. 참고 모델로 쓸 만하다.
- 대비는 측정한 곳 모두 통과했다(5.7~8.2:1). 문제는 위계·일관성·밀도다.

🔴 기준선에서 발견한 결함. 원인 미판정이므로 §7에서 조사한다.
- A. 390 캡처가 y≈11945 이후 빈 크림색(`#fffaf7`)이다. "인생의 큰 시기"가 문장 중간에서 잘리고 "심층 해석"·"올해의 주제"는 그려지지 않았다. 1280에서는 정상이다. 캡처 한계(뷰포트 12000px)인지 실제 레이아웃 문제인지 DOM 높이로 판정한다.
- B. 1280에서 네오 아바타(서랍 하단 근처)가 `#e5e5e5` 회색 원이다. 이미지 누락으로 추정한다.
- C. 두 폭 모두 "이전 해석 기록" summary 와 태양/달/상승궁 행이 x=0 에 붙어 있다. 아래 카드들과 달리 안쪽 여백이 없다.

재현 프로브(지난 세션 scratchpad 의 record-probe.cjs 는 지워진다. 새로 작성할 것):
- `NODE_PATH="$PWD/node_modules" node <probe> "$(pwd -W)"`. 루트는 `path.resolve` 로 잡는다.
- `/api/*` 는 mock 하고 외부 호스트는 차단한다.
- 프로필은 `DestinyProfileManager.storage.save/setCurrent` → `dpLoadProfile()` → `.dp-fsel-btn--astro` 클릭으로 연다.
- 결과 레이어는 fixed 다. 요소 스크린샷은 뷰포트 높이를 서랍 높이보다 크게(16000 이상) 잡거나 서랍 안을 구간별로 스크롤해 찍는다.
- 폭 360/390/1280.

## 3. 디자인 방향 (선행 premium 결정과 정합)

콘셉트는 astro-reading.css 의 "밤하늘 관측 기록"이다. 우주 장식은 표지에만 쓰고 본문은 잉크 바탕 위의 활자와 헤어라인으로 짠다. 서랍 블록을 이 체계로 편입한다.

1. **토큰 일원화**
   - 서랍 블록 스타일을 인라인 `astroNeonCss` 의 하드코딩 색에서 `styles/astro-reading.css` 의 `--as-*`(ink-0/1, text/text-2, gold, rule, milky)와 `--cd-*`(간격·반경·모션) 토큰으로 옮긴다.
   - 대상 범위는 `#astroModalOverlay #astroBodyWrap .as-record …` 이고 `.as-record` 토큰 블록이 이미 있다.
   - 강조색은 금 하나만 쓴다. 원소·호감도 같은 데이터 색은 데이터 시각화 안에서만 허용하고 대비 3:1 이상을 지킨다.
2. **제목 체계**: 섹션 제목은 serif(`--as-serif`) 700 · 20px 이상으로 한다. 이 폰트는 700만 있다. 부제("마음이 켜지는 순간" 등)는 `--as-text-2` 본문체로, 위에 금색 작은 라벨(행성 기호와 이름)을 둔다. 제목 아래는 헤어라인 `--as-rule` 으로 나눈다.
3. **기호는 SVG 스프라이트로**
   - 이모지·유니코드 기호 머리말을 인라인 SVG `<symbol>` 스프라이트(행성 10 + 별자리 12, `currentColor`, `aria-hidden`)로 바꾼다. OS 기호 폰트가 기기마다 다르게 그려지기 때문이다.
   - 기존 `natal-reading.js` 의 `bandSvg`(~800)·`wheelSvg`(~886) 작성 방식(결정론, 문자열 조립, class 로 스타일)을 따른다. 스프라이트는 서랍당 한 번만 삽입한다.
4. **블록별 새 SVG 일러스트**(결정론 인라인 SVG, 사용자 차트 값으로 그림, `aria-hidden`, 장식 전용)
   - 내 탄생 별자리 지도: 행성 10장 세로 카드 대신 작은 "별자리 성도"(12궁 원호 위에 행성 점과 금색 연결선)와 2열 촘촘한 행성 목록으로 바꾼다(390은 1열 압축 행). "자세히 보기"는 행 안 details 로 유지한다.
   - 목성의 흐름: 12궁 원 위 목성의 현재 위치에서 다음 별자리로 가는 호(점선 → 금색 실선)와 기준일 라벨.
   - 연애 설렘 포인트: 금성(끌림)·화성(행동)·하강점(짝) 세 점을 잇는 삼각 성좌와, 각도 관계(`vmAspect`)에 따른 선 모양(조화=실선, 긴장=점선). 칩 줄 대신 "끌림 / 안정감 / 조심할 패턴" 3단 정의 목록.
   - 차트 전체 요약: 머리에 태양·달·상승궁 세 기호의 작은 삼각 배치를 두고, 번호 문단을 짧은 정의 목록과 금색 인용 한 줄로 쪼갠다.
   - 나머지 블록(히어로·한눈에 보기·커리어·집중 포인트·시너지)은 같은 문법(헤어라인·기호 라벨·정의 목록)만 적용한다. 일러스트를 추가할지는 화면 검수 뒤에 판단한다.
5. **글 벽 끊기**
   - 390에서 한 문단은 4줄 안팎으로 한다. 긴 고정 문단은 핵심 1문장을 보이고 나머지는 "이어 읽기" details 로 접는다(기존 `details.astro-fold` 재사용).
   - details summary 규칙: 44px 탭 영역, hover, focus-visible 금 2px, 마커 120ms 회전.
6. **크기 하한**: 보이는 글자 13px 이상, p·li 15px 이상.
7. **래스터 이미지**: 기본은 SVG 만 쓴다. Claude 세션에서는 Codex `image_gen` 을 쓸 수 없고 유료 이미지 API 경로도 없다. 기존 webp(`public/images/feature-details/astrology-*-v2.webp` 등)를 재사용할 때는 `docs/context/content-assets.md` 를 따르고, `?v=` 값은 손으로 쓰지 않는다.
8. **내용 보존**: 문구 삭제 0, 블록 삭제 0, 순서 변경은 허용. 쉬운 말 금지어 테스트(직전 작업 c5b38caaa)를 계속 통과해야 한다.

## 4. 성공 기준

- 360/390/1280 에서 가로 넘침 0, 페이지 오류 0.
- 서랍 안 하드코딩 강조색 신설 0, 장식 이모지 머리말 0. 사용자 데이터 문자열 안의 기호는 예외.
- 대비 실패 0(본문 4.5:1, 큰 글자·UI 3:1). 보이는 글자 13px 이상. 탭 영역 44px 이상(`npm run measure:touch-targets`).
- 유료 게이트 4종이 서랍 밖(상담 섹션)에 그대로 있다. 잠긴 본문 DOM 0자는 직전 프로브 기준이다.
- 출생시간 유·무 두 프로필 모두에서 정상이다.
- visual-checker 의 전·후 비교에서 "같은 카드 반복·이모지 아이콘·색 혼재·글 벽" 지적이 해소된다.
- 기존 검사 통과:
  - `node --test __tests__/astro/*` 등 astro 노드 테스트(직전 35/35)
  - `npm run verify:basic-fortune-library`
  - `verify:hero-contrast`
  - `verify:mobile-detail-nonintrusive`
  - check:fast

## 5. 단계(각 단계 독립 커밋, 회귀는 그 커밋만 되돌림)

1. 기준선 프로브와 결함 A~C 판정(코드 변경 없음, 결과만 상태 파일에 기록).
2. 토큰·제목 체계: `astroNeonCss` 의 서랍 블록 규칙을 `astro-reading.css` `.as-record` 범위로 옮긴다. 옛 규칙은 지우지 말고 `.as-record` 안에서 덮는다. 서랍 밖에서 쓰이는지 `git grep` 으로 확인한 뒤 정리한다.
3. SVG 스프라이트, 그리고 이모지·기호 머리말 교체.
4. 내 탄생 별자리 지도 재구성과 성도 SVG.
5. 목성의 흐름과 연애 설렘 포인트 SVG, 정의 목록.
6. 차트 전체 요약·히어로·나머지 블록 문법 통일, 글 벽 접기.
7. §6 결제 목록(RED, 별도 커밋).
8. §7 결함들(항목별 별도 커밋).
9. 검증 → 커밋 → push → main CI 통과 확인. 스테이징 검증은 결제·라우팅이 안 바뀌면 선택이다(CLAUDE.md). 핸드오프 `status: done` 과 완료 기록을 남긴다.

`index.html` 이나 정적 셸 CSS/JS 태그가 바뀌면 `npm run sync:public` 후 미러를 커밋한다. sync 가 수렴할 때까지 다시 돌린다. 워크트리를 main 에 머지한 직후에는 sync:public 을 다시 실행한다.

## 6. 낡은 결제 생성 목록 3종 (RED · 생성기로만 갱신, 손편집 금지)

실측(da6757a72): `astro_yearly_transit` 는 직전 작업에서 EXTRA_UNLOCK, 30코인=3,000원 "키 하나 영구"로 옮겼다. 그런데 생성물은 옛 상태다.

| 파일 | 낡은 내용 | 생성 명령 | 확인 |
|---|---|---|---|
| `docs/payments/payment-p0-inventory.json`·`.md` | `per_use`, `priceKRW 5000`, `priceCoins 50` (:2503~) | `npm run audit:payment-p0-inventory` | `npm run verify:payment-p0-inventory` (CI pr-ci.yml:836) |
| `docs/purchase-journey/inventory.json` | `paid:astro_yearly_transit` entrypoints 빈 배열 (:2438~) | `node scripts/build-purchase-journey-review.mjs` | 같은 스크립트 `--check` |
| `docs/verification/paid-delivery-inventory-20260927.json` | `billingType: per_use` (:3476~) | `node scripts/report-paid-delivery-inventory.mjs > docs/verification/paid-delivery-inventory-20260927.json` (exit 0 이어야 함, exit 2=미분류) | `__tests__/worker/paid-delivery-inventory.test.js` |

- 순서는 **p0 먼저**다. `scripts/lib/paid-delivery-inventory.mjs:84` 가 p0 json 을 읽는다.
- 리다이렉트는 Bash 로 한다. PowerShell `>` 는 BOM/UTF-16 을 쓴다.
- 날짜 붙은 스냅샷을 덮어쓸지, 새 날짜 파일을 만들지는 auditor 판정을 따른다. 9d2b30b8c 는 같은 파일명을 재생성했다. `docs/verification/paid-delivery-reliability-20260927.md` 의 "158개" 같은 수치가 달라지면 같이 고친다.
- 재생성 diff 에 다른 상품 변화가 섞이면 **커밋 전에 멈추고** 원인(옆 세션 변경인지 등)을 보고한다. 다른 상품 줄을 손으로 되돌리지 않는다.
- 레지스트리 표시명 "점성술 연간 트랜짓 운세"(`worker/lib/paid-feature-registry.js:326` reason)는 전문 용어다. 고객용 표기는 예: "앞으로 12개월 별자리 흐름"이다.
  - 표시명이 결제창·영수증·주문 기록·관리자 화면 어디에 노출되는지 먼저 `git grep` 으로 전수 확인한다.
  - billing-feature-registry·결제창 렌더러 3종의 정합성과 동결 매니페스트(`payment-freeze` 절차)를 paid-gate-auditor 로 판정받는다.
  - 키 이름과 가격은 절대 바꾸지 않는다. 표시명을 바꾸면 위 3종을 그 뒤에 재생성한다.
- verify(직전 작업과 동일): 필수 7종 + `per-use-never-unlocks`·`paid-gate-price-coverage`·`saju-unlock-entitlement-regression`·`payment-freeze`·jest `paid-non-llm-delivery`.

## 7. 범위 밖 결함 수정 목록 (각각 별도 커밋)

1. **조사 오류**: 히어로 "바다이 커리어"는 `_astroCounselTone(...)` 결과 뒤에 '이'·'을'·'으로'를 고정으로 붙여서 생긴다(`js/saju-engine.js:33593` 정의, 호출 33666·34072·34214·34428 등). 그 밖의 "수성은(는)", "기회을"도 있다.
   - 받침에 따른 조사 헬퍼를 쓴다. 기존 것을 먼저 찾는다: `git grep -n "josa\|hasJong\|받침" -- js`. `natal-reading.js` 의 `{need:을}` 치환 방식도 참고한다.
   - 브라우저에서 서랍 전체 텍스트를 스캔해 `이 |을 |은\(는\)` 오조사 0을 확인한다.
2. **출생시간 모름**: 히어로·빅3 가 정오 차트의 상승궁·MC 를 보여 주고, 커리어 앵커도 `mcIndex` 를 쓴다.
   - 시간 모름(`birth.timeUnknown`)이면 ASC·MC 기반 문장을 숨기거나 "출생 시간을 넣으면 보여요"로 바꾼다.
   - 시간 유·무 두 프로필로 검증한다.
3. **natal-reading 의 "N번째 집" 표현**(`js/core/astro/natal-reading.js:193·207·261·493-505`): 쉬운 말 원칙상 "○○의 자리"로 바꾼다. 쉬운 말 금지어 테스트에 "번째 집" 추가를 검토한다.
4. **curProfData 양자리 폴백 죽은 코드**: `git grep -n curProfData` 로 위치를 잡는다. 삭제는 deletion-auditor 로 소스·테스트·verify 3면을 확인한 뒤 별도 커밋으로 한다.
5. **결함 A~C**(§2):
   - 390 서랍 하단 미렌더가 실제 레이아웃 문제라면 수정하고, 캡처 한계라면 기록만 한다.
   - 네오 아바타 회색 원은 이미지 경로나 lazy 로딩을 확인한다.
   - "이전 해석 기록" summary·빅3 행 x=0 여백은 `.as-record` 안쪽 여백 토큰으로 맞춘다.
6. **연간 계산 성능**: `lonsAt` 약 2,800회 동기 호출(현재 1.6~2.8초)이다. 결과가 바뀌지 않는 범위에서 행성별 일간 위치를 캐시해 호출 수를 줄인다. 전·후 결과 동일성 테스트(직전 트랜싯 엔진 테스트 11개)를 통과해야 한다. 바뀌는 위험이 보이면 보고만 한다.
7. **check:fast paid-gate-suite OOM 헛실패**: 기본 동시 6개(`scripts/run-paid-gate-suite.mjs:282`)가 여유 메모리 부족 시 V8 OOM 으로 빈 실패 8개를 낸다(`--jobs 1` 로는 88/88 통과).
   - 개선안: 기본 jobs 를 `os.freemem()` 기반으로 낮추고 `--jobs` 명시는 그대로 존중한다.
   - 가드 완화가 아니라 실행 병렬도만 조정해야 하며, 실패 판정을 조용히 통과시키면 안 된다(fail-closed).
   - CI 도 이 스크립트를 쓰는지 확인하고, 영향이 있으면 CI 실행 시간 비교를 같이 보고한다.

## 8. 규칙·함정

- 과금 LLM 0(이번 범위는 결정론 + 템플릿이며 LLM 호출 경로가 없다). 실결제·운영 DB 쓰기 0, mock 만 사용.
- 생성 인벤토리·`docs/payments/inventory.md`(scripts/audit-paid-resume.mjs) 등 생성물은 손대지 말고 생성기로만 갱신한다.
- `.env*`·package-lock.json·dist/·out/·.wrangler/ 수정 금지. python 금지. `taskkill /IM`·`Stop-Process -Name` 금지(남의 node 프로세스).
- 메모리 부족으로 check:fast 가 헛실패하면 `node scripts/run-paid-gate-suite.mjs --jobs 1 --base origin/main` 을 돌린 뒤 나머지 단계를 순차로 실행한다.
- CRLF: Edit 도구나 sed 가 CRLF 를 떨어뜨릴 수 있으니 `git diff --stat` 으로 전체 줄 교체가 생겼는지 확인한다.
- 커밋 메시지는 UTF-8(BOM 없음) 파일로 쓰고 `git commit -F` 로 넘긴다. 끝 줄은 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 이다.
- `git add` 전에 `git status`·`git diff --stat` 을 본다.
- push 는 스테이징까지다. 운영 승격은 별도 1회 승인이 필요하다. 직전 점성술 2차 개편도 아직 운영 승격 전이다.
- 끝낼 때 정리: 내 워크트리 정션을 먼저 지우고(`(Get-Item <wt>\node_modules).Delete()`), `git worktree remove` → `git branch -d` 순으로 지운다. 임시 프로브·스크린샷도 삭제한다.

## 9. 핵심 파일

- `js/saju-engine.js`: 서랍 블록 HTML(13500~14700), `astroNeonCss`(14075~), `_astroCounsel*` 헬퍼(33593~).
- `js/core/saju/basicFortunePresentation.js:769-843`: 서랍 구성, 유료 게이트 분리.
- `js/core/astro/natal-reading.js`: `bandSvg`·`wheelSvg` SVG 작성 선례, "N번째 집" 문구.
- `styles/astro-reading.css`: `.as-record` 토큰·서랍 스타일(379~).
- `styles/fonts-serif.css`: CodeDestinySerifKR 700·Cinzel.
- 결제: `worker/lib/paid-feature-registry.js:326`, `worker/lib/billing-feature-registry.js`, `scripts/audit-payment-p0-inventory.mjs`, `scripts/build-purchase-journey-review.mjs`, `scripts/report-paid-delivery-inventory.mjs`, `scripts/lib/paid-delivery-inventory.mjs`.
- `scripts/run-paid-gate-suite.mjs`: §7-7.

## 10. 완료 기록 (2026-10-05, 세션 67557dcb)

- 커밋:
  - 895f12892 토큰·제목
  - 05af2f0a1 SVG 기호
  - 08970543d 성도·압축 행
  - 2f398309c 목성 호·연애 삼각
  - 598f661ec 요약 문법 통일
  - 21c9dd651 paid-gate-suite jobs(§7-7)
  - 79d6e963f 시간 모름 ASC/MC/DSC 숨김(§7-2)
  - e76e4c3c4 조사 헬퍼(§7-1)
  - 3cb7ff19e "○○의 자리"(§7-3)
  - 2867af8ea curProfData 삭제(§7-4)
- 실측:
  - 360·390·1280에서 오류 0, 넘침 0. 유료 게이트 4종은 모두 서랍 밖에 있다.
  - 시간 앎·모름 두 프로필과 추가 6개 프로필의 전문 조사 스캔에서 실제 오류는 0건이다. 남은 검출은 인물·도시 이름 오탐이다.
  - 점성술 node 테스트 35/35 통과.
- §7-5: A는 캡처 한계라 기록만 했다. B는 프로브 인공물(외부 이미지 차단)이다. C는 2단계 무박스화로 해소했다.
- §7-6은 보고만 했다.
  - transits.js 의 `memo` 가 이미 같은 시각을 캐시한다. 공급자 `AstroEngine.lonsAtMs` 는 Swiss 황경 10개만 읽는다.
  - 남은 호출은 모두 서로 다른 시각(일간 격자와 이분 탐색)이다.
  - 더 줄이려면 보간이나 행성별 지연 계산이 필요하다. 보간은 결과를 바꾸고, 지연 계산은 공급자 계약을 바꾼다. 그래서 손대지 않았다.
- §6은 실행하지 않았다(RED, 사용자 승인 대기). paid-gate-auditor 판정은 STOP이다.
  - 생성기를 다시 돌리면 다른 상품 약 120개의 가격·행이 함께 바뀐다. 09-09·09-16·09-27 레지스트리 정책 변경이 목록에 반영되지 않은 채 쌓여 있기 때문이다. 내역은 p0 priceKRW 약 95건, purchase-journey 행 +34/−11과 가격 102건이다.
  - purchase-journey `--check` 는 HEAD 에서 이미 실패하며, CI 는 이를 돌리지 않는다.
  - 재생성해도 entrypoints 는 [] 로 남는다.
  - 진행하려면 "전체 카탈로그 동기화"로 승인을 받아 깨끗한 트리에서 단독 커밋한다.
  - 표시명은 "점성술 앞으로 12개월 흐름"(35바이트)을 권장한다. 재생성 전에 별도 커밋으로 바꾼다.
- 범위 밖 후속 과제(보고만):
  - 시간 모름일 때 정오 기준 하우스 주제 문구가 남아 있다. 히어로 "오늘의 중심 별"(sun.topic)과 요약 한 줄(topHouseMetaQuick)이다.
  - 서랍 밖의 MC 언급(전문 표·counsel 본문 일부)과 차트 표의 ASC·MC 행.
  - transit-reading 근거 줄 "출생 차트 N번째 집(하우스)"과 행성 위치 표 각주 "N번째".
  - 사주 '을(를)'(28369·29616).
  - 상단 바 이모지.
  - check:fast 의 yeongnyangi-tarot-spread-v3 플래키.
  - 1280 인용문의 한글 가짜 기울임.
- §6 후속(10-05, 사용자 승인 "다음 단계 진행해"): 표시명 "점성술 앞으로 12개월 흐름" 커밋 c63aa9f09 → 생성기 재생성 단독 커밋.
  - p0·purchase-journey 재생성. p0 priceKRW 변경 123건은 모두 현재 catalog 가격과 일치(불일치 0). 추가·삭제 0, 158종.
  - 09-27 스냅샷은 그대로 두고 `docs/verification/paid-delivery-inventory-20261005.json` 새로 생성(paid-gate-auditor 판정: reliability 문서의 09-27 수치 69·10 보존).
  - purchase-journey `--check` exit 0. entrypoints 는 여전히 [].
  - 손대지 않음: `docs/payments/payment-inventory.*`(생성기 삭제됨, 09-08 수작업 스냅샷), `docs/payment-resume-audit/inventory.*`(CI 미배선).
