# Mobile Collection Card Audit

## 1. 카드 진입 구조 요약
- 메인 화면 카드 컴포넌트: `index.html`의 `.feature-card-grid`, `.feat-collection`, `.tarot-collection`, `.tarot-tile`, `.prem-card`
- 컬렉션 카드 컴포넌트: 정적 shell 내부 컬렉션 블록과 `data-collection-open` 토글
- 정적 페이지 카드 구조: `a[href]`, `button[data-action]`, `data-coin-cost`, `data-tile-lock-key`
- React/Next.js 카드 구조: 정적 shell의 `href`가 `app/**` route로 진입
- 라우트 정의 위치: `index.html`, `app/**`, `app/_lib/serviceMap.js`, `app/_lib/serviceSections.js`
- 모바일 터치 브리지: `js/mobile-interaction-patch.js`
- 런타임 action fallback: `js/core/index-inline-runtime.js`, `js/core/uiBindings.js`
- 정적 미러: `public/index.html`, `public/static/index.html`, `public/{en,ja,zh}/index.html`

## 2. Discovered Card Groups
| Group | Count | Entry pattern | Mobile risk |
|---|---:|---|---|
| Preview navigation cards | 13 | `.moon-preview-card`, `data-action`, `href` | Horizontal scroll and paid preview event overlap |
| Main route cards | 3 | top-level `a[href]` | Static-to-Next route handoff |
| `animalCollection` | 7 | `data-action`, `href`, lazy scripts | Hidden mobile cards, missing action whitelist |
| `meditationCollection` | 3 | `href` plus paid preview | Coin preview vs direct route |
| `tarotCollection` | 12 | `data-action`, `href`, lazy scripts | Paid preview, lazy modal scripts, hidden cards |
| `oracleCollection` | 10 | `data-action`, `href`, lazy scripts | Paid preview, route fallback |
| `cosmicCollection` | 5 | `data-action`, `href` | Action fallback and route handoff |
| `flowerCollection` | 6 | `data-action`, lazy scripts | Modal first-screen display |
| `premiumVvipCollection` | 7 | `data-action`, `href`, paid gates | Locked preview/payment entry |
| `miscCollection` | 6 | `data-action`, `href` | External/static route fallback |

## 3. Representative Card Inventory
| Card | Route/action | Implementation | Click mode | Mobile issue potential |
|---|---|---|---|---|
| Fortune Tea House | `/fortune-tea-house` | Next route link | `href` | Route first-screen check |
| Neo Operation Room | `/neo-operation-room` | Next route link, locked | `href` | Paid/locked route preview |
| Prompt Hub | `/fortune/prompt-hub` | Next route link | `href` | Route handoff |
| Animal Totem | `openAnimalTotemModal` | Static lazy modal | `data-action` | Lazy script touch bridge |
| MBTI Animal Match | `openMbtiModal` | Static lazy modal | `data-action` | Missing mobile whitelist before fix |
| Destiny Egg | `openDestinyEggPage` | Static route fallback | `data-action` | Action fallback |
| Palm Reading | `/palm-reading` | Next route link | `href` | Hidden card reveal |
| Saju Guardian | `openSajuGuardianPage` | Locked static action | `data-action` | Paid preview/gate |
| Fortune Teller Fish | `openFortuneTellerFishPage` | Static route fallback | `data-action` | Action fallback |
| Physiognomy | `openPhysiognomyApp` | Lazy app overlay | `data-action` | Missing whitelist/lazy load before fix |
| Neville Meditation | `openNevilleMeditationPage` | Paid static route | `data-action` + `href` | Paid preview must open first |
| Yoga Guru | `openYogaGuru` | Paid static route | `data-action` + `href` | Paid preview vs route |
| Cosmic Soul Meditation | `openCosmicSoulMeditation` | Static route | `data-action` + `href` | Route fallback |
| Tarot Love | `openTarotLoveModal` | Paid lazy modal | `data-action` | Paid preview event overlap |
| Tarot Healing | `/tarot/healing` | React route | `href` | Route handoff |
| Tarot Self Esteem | `openTarotSelfEsteemModal` | Lazy modal | `data-action` | Modal first-screen |
| Tarot Reunion | `openTarotReunionModal` | Paid lazy modal | `data-action` | Paid preview |
| Tarot Prompt Maker | `/tarot/prompt-maker` | React route | `href` | Hidden card reveal |
| Tarot Numerology | `/tarot/numerology/` | React route | `href` | Route handoff |
| Career Tarot | `/tarot-ijik.html` | Static route | `href` | Static route |
| Mindscan Tarot | `/tarot/mindscan/` | React route | `href` | Route handoff |
| Crystal Soul Tarot | `/tarot/crystal-soul/` | React route | `href` | Route handoff |
| Celestial Harmony | `openCelestialHarmony` | Paid static route | `data-action` + `href` | Paid preview |
| Classic Tarot | `openTarotModal` | Static modal | `data-action` | Modal display |
| Hwatu | `openHwatuModal` | Lazy modal | `data-action` | Lazy script |
| Kemet Oracle | `openKemetModal` | Paid lazy modal | `data-action` | Paid preview must win |
| IFA Oracle | `/ifa-oracle.html` | Paid static route | `href` | Paid preview/route |
| I Ching | `openJuyukModal` | Paid lazy modal | `data-action` | Paid preview must win |
| Maya | `/maya` | React route | `href` | Route handoff |
| Rune Oracle | `/oracle/rune/` | React/static route | `href` | Paid preview/route |
| Geomancy | `/geomancy-oracle-v4.html` | Static route | `href` | Paid preview/route |
| Sikojen | `/fortune/sikojen-povailu/` | React route | `href` | Route handoff |
| Royal Tea Oracle | `/royal-tea-oracle.html` | Static route | `data-action` + `href` | Action fallback |
| Destiny Poker | `/destiny-poker.html` | Static route | `href` | Static route |
| Astrology Chart | `openAstroModal` | Static modal | `data-action` | Modal display |
| Ziwei Basic | `openZiweiModal` | Static modal | `data-action` | Modal display |
| Ziwei Deep | `navigateToZiweiChart` | Paid route/action | `data-action` | Paid preview/route |
| Vedic | `navigateToVedic` | Route/action | `data-action` | Route fallback |
| Olympus Oracle | `openOlympusOracleModal` | Paid lazy modal | `data-action` | Paid preview/modal |
| Destiny Flower | `openDestinyFlowerStudio` | Paid modal | `data-action` | Paid preview/modal |
| Astrology Flower | `openAstrologyFlowerStudio` | Paid modal | `data-action` | Paid preview/modal |
| Ziwei Flower | `openJamidusuFlowerStudio` | Paid modal | `data-action` | Paid preview/modal |
| Sukuyo Flower | `openSukuyoFlowerStudio` | Paid modal | `data-action` | Paid preview/modal |
| Dream Prompt | `openDreamModal` | Lazy modal | `data-action` | Modal display |
| Psycho Dream | `openPsychoDreamModal` | Lazy modal | `data-action` | Modal display |
| Premium Sukuyo | `/sukuyo-compatibility-ai` | Paid route | `href` | Paid preview/route |
| Premium Ziwei | `gotoZiweiPremium` | Paid action | `data-action` | Paid preview |
| Premium Astrology | `gotoAstrologyPremium` | Paid action | `data-action` | Paid preview |
| Premium Vedic | `/vedic-ai` | Route link | `href` | Route handoff |
| Karma Destiny | `/karma-destiny-ai` | Paid route | `href` | Paid preview/route |
| Naming Prompt | `openNamingPromptModal` | Paid modal | `data-action` | Paid preview/modal |
| Psychotest Hub | external Replit URL | External link | `href` | Mobile popup/same-tab |
| Omikuji | `/emoi_omikuji_v2.html` | Static route | `href` | Static route |
| Yeon Star Hug | `/yeon-star-hug` | React route | `href` | Route handoff |
| Blood Type | `/blood-type-app.html` | Static route | `href` | Static route |
| Destiny Bias | `/saju/destiny-bias` | Paid route | `href` | Paid preview/route |
| Saju FPTI | `/saju-fpti` | React route | `href` | Route handoff |

## 4. 공통 문제 후보
- 모바일 touch/pointer 흐름에서 `data-action`이 있는 무료 `href` 카드가 action 성공으로 처리되어 기본 링크 이동이 차단될 수 있었다.
- class 기반 RULE이 `/tarot/mindscan/`, `/tarot/crystal-soul/` 같은 href-only 카드의 직접 이동을 가로챘다.
- `더 보기`로 숨겨진 카드를 펼칠 때 브라우저 scroll anchoring 때문에 새 카드가 viewport 위로 밀릴 수 있었다.
- `data-tile-lock-key` 잠금 카드가 action 실행으로 먼저 빠지면 결제/해금 preview가 표시되지 않을 수 있었다.
- `royal-tea-oracle.html`은 페이지 자체가 `COST = 30` 결제 게이트를 갖고 있는데 메인 카드가 무료 직행처럼 표시되어 모바일에서 되돌아오는 흐름이 생겼다.
- `sikojen` 카드는 구 라우트 `/fortune/sikojen-povailu/`를 거쳐 실제 React route `/oracle/sikojen-povailu`로 리다이렉트되고 있었다.
- 장식용 이미지, badge, lock, gradient layer는 모바일에서 클릭 레이어 위에 올라오면 터치 hit target을 흐릴 수 있었다.
- 버전 업데이트 배너가 모바일 하단에 넓게 떠 있을 때 `나중에`/`지금 새로고침` 버튼 영역이 컬렉션 카드 터치를 가로챌 수 있었다.
- R=VD 코스믹 소울 명상은 비로그인 직접 진입 시 로그인 모달 함수가 아직 준비되지 않으면 `history.back()`으로 돌아가 모바일 카드 진입이 `about:blank`처럼 보일 수 있었다.
- 하단 고정 모바일 내비가 열린 컬렉션 하단 카드 중앙을 덮으면 실제 터치 좌표가 내비 버튼으로 잡힐 수 있었다.

## 5. 수정 우선순위
- 1순위: 무료 링크형 카드의 직접 이동과 유료/잠금 카드의 preview/gate 우선 진입을 분리한다.
- 2순위: 숨겨진 모바일 컬렉션 카드가 `더 보기` 후 안전한 viewport 위치에 나타나도록 보정한다.
- 3순위: 정적 route와 React/Next route 불일치를 실제 route 기준으로 정리한다.
- 4순위: 카드/모달 첫 화면에서 가로 스크롤, 투명 overlay, body scroll lock 잔존 여부를 검증한다.

## 6. 최종 수정 근거
- `js/mobile-interaction-patch.js`: 무료 `a[href]` 카드 직접 이동, lock/coin 카드 preview 우선 처리, href-only action fallback 보강.
- `index.html`: `/oracle/sikojen-povailu` 실제 route 반영, `royal-tea-oracle.html` 카드 결제 정책 정렬, 모바일 `더 보기` 스크롤 보정, 열린 컬렉션과 하단 내비 겹침 보정, R=VD direct tap 보호.
- `js/share.js`: 버전 업데이트 배너가 모바일 카드 터치를 덮지 않도록 pointer event 범위 제한과 모바일 compact 배치 적용.
- `cosmic-soul-meditation.html`: 비로그인 직접 진입 시 `history.back()` 대신 `/login?next=/cosmic-soul-meditation.html`로 안정 진입.

## 7. 모바일 검증 기준
- viewport: 360px Android, 375px iPhone SE, 390px iPhone, 430px large mobile.
- 입력 방식: Playwright mobile context의 touch/pointer 기반 탭.
- 확인 기준: 컬렉션 열기, `더 보기` 후 하단 카드 터치, route 이동 또는 결제/잠금 preview modal 표시, 첫 화면 가로 스크롤 없음, 이미지/모달 표시, 닫기 후 body scroll lock 잔존 없음.
