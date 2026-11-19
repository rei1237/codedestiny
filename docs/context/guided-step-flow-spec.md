# 무료 운세·타로 단계형 플로우 명세

- 작성일: 2026-11-20
- 상태: **승인 2026-11-20** (사용자 원문 2026-11-20: "권장안대로 승인, 구현 계획 진행해줘"). §6 추천 열이 확정값이다
- 입력: 1단계 감사(docs/context/free-tarot-ux-audit.md, 아직 사용자 승인 전 초안)
- 짝 문서: [narrator-webtoon-result-spec](narrator-webtoon-result-spec.md)(결과 화면·화자)
- 범위: 명세만 다룬다. 구현·라우팅·결제 변경은 이 문서 승인 뒤 별도 작업(RED)이다.

## 0. 수치 표기와 근거

| 표기 | 뜻 |
|---|---|
| 실측(레퍼런스) | 2026-11-20 레퍼런스 사이트 모바일 실측. 390×844 dpr2, iPhone UA, 터치 에뮬레이션. `getAnimations()`·`performance.now()`(클릭 = 0) 또는 스타일시트 규칙에서 읽은 값 |
| 실측(로컬) | 2026-11-20 로컬 `npm run dev` + `scripts/mock-dev-api.mjs`, Playwright chromium, 390×844·360×780 실측. 과금 LLM·실결제·실계정 0회 |
| 코드 | 저장소 상수(HEAD 341e1afb2 기준 `경로:줄`) |
| 요청값 | 사용자 요청 원문의 값 |
| 결정 | 이 문서가 고른 값. §6 "결정 필요" 표에서 사용자 승인을 받는다 |

선택 원칙(사용자 지시 "1단계 실측값이 있으면 그 값을 우선"):
1. 실측값이 있으면 실측값을 쓴다.
2. 실측이 없으면 요청값을 쓴다.
3. 디자인 정본 토큰과 부딪히면 토큰을 따르고 충돌을 §6에 적는다. 근거: 페이지에 리터럴을 새로 박지 않는다(`docs/context/design-canon.md:45`), 모션 토큰 120/220/380ms(`DESIGN.md:340`).
4. 예외는 단일 선택 뒤 자동 진행이다. 레퍼런스에는 이 기능이 없을 뿐, 반대 근거가 있는 것은 아니다. 그래서 요청값을 제품 결정으로 유지하고 A/B 대상으로 표시한다.

## 1. 화면 골격 (360–430px)

### 1-1. 랜딩 순서

| 순서 | 요소 | 규칙 | 근거/결정 |
|---|---|---|---|
| 1 | 섹션 태그 | 한 줄 아이브로우 | 실측(레퍼런스): 연애 타로·탄생 타로 히어로 모두 영상 → 아이브로우 → 2줄 H1 → 서브라인 → CTA 순서다 |
| 2 | 감정형 H1 | 2줄 이내. 제목 서체는 주아체 | 정본 `design-canon.md:86` |
| 3 | 한 줄 서브타이틀 | Pretendard | 같은 줄 |
| 4 | 히어로 비주얼 | 고정 `aspect-ratio`로 CLS 0을 유지한다. 영상은 `muted autoplay playsinline loop`이고 `poster`를 먼저 그린다. `prefers-reduced-data`, 저사양(`deviceMemory ≤ 4` 또는 `hardwareConcurrency ≤ 4`), `Save-Data`에서는 포스터만 쓴다 | 실측(레퍼런스): 693px 전체 화면 히어로, 자동재생·음소거·반복 영상과 일시정지 버튼. 저사양 판정식은 이미 `app/yeongnyangi/_components/TarotDrawRitual.tsx:41-42`에 있다. 일시정지 버튼은 레퍼런스와 같이 둔다(결정) |
| 5 | 주 CTA "○○ 시작하기" + 보조 줄 "무료로 간단 풀이를 볼 수 있어요" | 화면당 주 CTA는 1개 | 실측(레퍼런스): CTA 바로 아래 '무료' 힌트 마이크로라인 |
| 6 | 신뢰 라인 | CTA 바로 아래 한 줄. 예: 로그인 없이 보기, 입력값은 이 기기에서만 계산 | 실측(레퍼런스, 탄생 타로): 로그인 불필요·생년월일 미전송 문구를 CTA 바로 아래에 둔다. 내용은 사실일 때만 쓴다(§4) |
| 7 | "이 기능은?" 블록 | 3–4개 단계 아이콘(예: 주제 → 카드 → 풀이) | 실측(레퍼런스, 띠 운세): 이용 순서 3단계 아이콘 + 주 CTA |

### 1-2. 고정 CTA와 터치

| 항목 | 값 | 근거/결정 |
|---|---|---|
| 하단 고정 주 CTA | `position: sticky; bottom: 0`, `padding-bottom: calc(12px + env(safe-area-inset-bottom))` | 요청값. 실측(레퍼런스): 입력 시트의 '다음' 버튼이 top 858로 첫 화면 밖에 있었다. 고정이 이 문제를 막는다 |
| 터치 대상 | 주 CTA 48px 이상, 그 밖 44px 이상 | 정본 `design-canon.md:86`(주 행동 48px), `docs/context/design-and-ui.md:19`(공용 래퍼 44px) |
| 주 CTA 수 | 화면당 1개. 보조 행동은 텍스트 버튼 | 정본 `design-canon.md:88`(모든 행동을 똑같이 강하게 칠하지 않는다) |
| CTA 문구 | 남은 행동을 알린다. 예: "2장 더 골라 주세요" → "풀이 보기" | 실측(레퍼런스): 비활성 동안 남은 장수를 안내하다가 3장이 차면 문구가 바뀐다 |
| 진행 표시 | 단계 이름 + "n / N" 카운터 | 실측(레퍼런스): 단계 목록 ✓ + "1 / 4" |
| 결과 읽기 진행 | 상단 3px 막대, `scaleX` | 실측(레퍼런스): scaleX 0.061 → 1 |
| 가로 넘침 | 360px에서 문서 넘침 0 | 실측(로컬): 꿀꿀 3장 타로 부채 하단 788 > 뷰포트 780(8px 접힘). 무료 사주 결과의 `.rpt-v2-filter`가 409px, `.ent-rpg-card`가 375px로 잘린다 |

## 2. 자동 진행 규칙

### 2-1. 값 표

| 항목 | 요청값 | 실측 | 최종값 | 이유 |
|---|---|---|---|---|
| 단일 선택 피드백 | 피드백 후 진행 | 실측(레퍼런스): 칩 색 150ms ease, `aria-pressed` 토글 | 즉시 `aria-pressed` + 색 전환 `--cd-dur-fast`(120ms) | 실측 150ms와 토큰 120ms의 차이는 30ms다. 토큰 규칙(`design-canon.md:45`)을 따른다. 결정 |
| 단일 선택 뒤 자동 진행 | 450ms | 실측(레퍼런스): **자동 진행 없음**(주제 칩 2s 관찰, CTA 필수) | **450ms 자동 진행**. 레퍼런스와 다르며 A/B 대상이다 | 사용자 요청이고, 레퍼런스에는 이 기능이 없을 뿐 반대 근거는 아니다. 대기 중에도 '다음' 버튼을 함께 둔다 |
| 대기 중 다른 선택 | 타이머 리셋 | — | 다른 칩을 누르면 450ms를 다시 센다. 같은 칩을 다시 누르면 선택이 풀리고 타이머가 취소된다 | 요청값 |
| 자유 입력·다중 선택 | CTA로만 진행 | 실측(레퍼런스): 질문 textarea(200자, 카운터)는 CTA 필수 | CTA로만 진행 | 요청값 = 실측 |
| 계산 대기 | 최소 1.2s 뒤 자동 전환. 느리면 캐릭터 대기 대사 | 실측(레퍼런스): 연애 타로 로딩 약 5.08s(생성 포함). 오늘 운세 상자는 약 4.3s 잠근 뒤 활성 후 약 1.0s에 자동 이동. 실측(로컬): 꿀꿀 3장 마지막 공개 → 결과 약 1.5s. 코드: 영냥이 reading 단계 1200ms(`TarotDrawRitual.tsx:57`) | 최소 1.2s, 탭하면 건너뛴다. 3s를 넘기면 화자 대기 대사 1줄을 띄운다 | 1.2s는 요청값이고 기존 코드 값과 같다. 3s 문턱은 근거가 없는 결정이라 §6에 올린다. 결정적 무료 리딩은 계산이 즉시 끝나므로 1.2s는 연출 시간이다. 정본은 등장 대기로 핵심 조작을 늦추지 말라고 한다(`design-canon.md:88`). 그래서 탭 건너뛰기를 필수로 둔다 |
| 단계 전환 | 24px 슬라이드 + 페이드, 240ms, transform/opacity만 | 실측(레퍼런스): 입력 단계 전환 애니메이션 **미검출**. 시트 상승은 400ms cubic-bezier(0.2,0.8,0.2,1) | 24px 슬라이드 + 페이드, `--cd-dur-base`(220ms), transform/opacity만 | 레퍼런스의 "없음"을 따르면 요청이 사라지므로 요청 형태는 유지한다. 시간은 토큰 220ms로 맞춘다. 240ms와의 충돌은 §6에 둔다 |
| reduced-motion | 페이드 120ms + 항상 보이는 '다음' 버튼 | 토큰: `prefers-reduced-motion`이면 모션 토큰이 전부 0.01ms(`DESIGN.md:341`, `styles/theme-tokens.css:250-252`). 코드: 기존 타로 의식은 reduced-motion이면 지연 0ms(`app/today/DailyTarot.tsx:28,134`) | 즉시 전환(토큰 0.01ms). 자동 진행은 끄고 '다음' 버튼을 항상 보인다 | 120ms 페이드는 전역 토큰 오버라이드와 충돌한다. 기존 구현과 정본을 따르고 §6에 올린다 |
| 셔플 | 자동, 탭하면 건너뜀 | 실측(레퍼런스): 셔플은 선택 기능이고 380ms ease 1회, 22장 동시, 50% 지점 translateY 17px. 실측(로컬): 꿀꿀 셸은 셔플 연출 없음. 코드: 영냥이 `.shuffleDeck` 1.05s 무한 + 멈춤 버튼(`yeongnyangi.module.css:782`) | 380ms 흔들기 3회(약 1.14s) 뒤 1.2s에 자동 진행. 탭하면 즉시 다음으로 간다 | 동작 1회 길이는 실측값을 쓴다. 반복 수와 1.2s 묶음은 계산 대기 최소값에 맞춘 결정이다 |
| 카드 선택 반응 | 탭하면 슬롯으로 이동, 다시 탭하면 취소 | 실측(레퍼런스): 슬롯이 약 4ms 안에 채워지고 이동·그림자 200ms ease, 슬롯을 다시 누르면 취소된다 | 즉시 슬롯 채움, 이동은 `--cd-dur-base` 220ms | 실측 200ms와 토큰 220ms. 토큰을 따른다 |
| 마지막 카드 뒤 진행 | 자동 진행 | 실측(레퍼런스): **자동 진행 없음**(4s 관찰, CTA 필수). 실측(로컬): 꿀꿀 셸은 3번째 선택 약 900ms 뒤 ready | 450ms 자동 진행. 레퍼런스와 다르며 A/B 대상이다 | 단일 선택과 같은 규칙을 쓴다 |
| 카드 공개 간격 | 600ms | 실측(레퍼런스): 뒤집기 800ms cubic-bezier(0.2,0.7,0.2,1), 첫 장 지연 500ms, 간격 350ms, perspective 700px. 실측(로컬): 꿀꿀 셸 `.inner` 1.5s, 탭부터 공개까지 약 2.4s | 뒤집기 800ms, 첫 장 500ms, 간격 **350ms** | 실측 우선 원칙을 따른다. 600ms 안은 §6에 대안으로 남긴다 |
| 결과 스크롤 등장 | — | 실측(레퍼런스): 블록 550ms, translateY 18px. 말풍선 지연 0.3s + i×0.28s | 짝 문서 §4로 넘긴다 | — |

### 2-2. 포커스·낭독

- 단계가 바뀌면 단계 제목(`h2`, `tabIndex=-1`)으로 포커스를 옮긴다. `aria-live="polite"`로 "n / N 단계, ○○"를 알린다. 이것은 요청값이다.
- 기존 패턴은 `TarotDrawRitual.tsx:77`(`h2 aria-live` + `role="status"` 진행 카운터), `:83`(공개 카드 이름·정역 srOnly 낭독), `DailyTarot.tsx:216`(reduced-motion에서 결과로 포커스)에 있다. 이 패턴을 재사용한다.
- 공개 전 카드 버튼의 이름에 카드명을 넣지 않는다. 실측(로컬)에서 힐링 타로는 뒤집기 전 버튼 innerText에 카드 이름이 이미 들어 있었다.

### 2-3. URL·history·새로고침

| 단계 | URL | history | 뒤로가기 동작 | 새로고침 |
|---|---|---|---|---|
| 랜딩 | 기본 URL | — | 이전 페이지 | 랜딩 |
| 주제 | `?step=topic` | push | 랜딩. 선택값은 유지한다 | 주제 화면, 선택 복원 |
| 셔플 | `?step=shuffle` | replace(일시 단계) | 주제 | 카드 고르기로 복원(셔플을 다시 하지 않음) |
| 카드 고르기 | `?step=pick` | push | 주제. 고른 카드는 유지한다 | 같은 덱 순서와 고른 카드를 복원 |
| 공개 | `?step=reveal` | push | 카드 고르기, 고른 카드 유지 | 공개된 장수까지 복원하고 남은 장은 탭 대기 |
| 계산 대기 | `?step=reveal` 유지 | 없음 | 위와 같다 | 결과로 복원 |
| 결과 | `?step=result` | push | 카드 고르기, 고른 카드 유지(실측(레퍼런스): `#draw`로 돌아가면 3장이 유지된다) | **로딩 없이 결과 복원**(실측(레퍼런스): `?reading=` 재로드 시 로딩 없이 복원) |

- `history.state`에 `{flowId, step, version}`을 넣는다. 본문 상태는 저장소(§2-4)를 정본으로 하고 URL은 위치만 가리킨다.
- 레퍼런스는 입력 단계마다 history를 쌓지 않는다(`#input` 한 번). 주제는 단계가 하나뿐이라 push해도 쌓임이 작다(결정).
- SEO: `?step=` URL은 기본 URL을 canonical로 가리키고 sitemap에 넣지 않는다. 비공개 결과 URL의 색인 정책은 바꾸지 않는다.

### 2-4. 하루 1회 무료

| 대상 | 규칙 | 저장 | 근거 |
|---|---|---|---|
| 같은 브라우저(게스트) | 같은 KST 날짜에는 같은 결과를 다시 보여 준다. 새 덱을 주지 않는다 | localStorage `cd:<flowId>:daily:v1`. 값은 `{version, date, deck, picks, revealed}`이고 검증 실패 시 버린다 | 기존 패턴: `lib/tarot/daily-three.mjs:3`(`DAILY_TAROT_KEY='cd:yeoni:daily-three:v1'`), `kstDay`, `restoreDailyReading`의 엄격 검증. 키 선택은 `DailyTarot.tsx:39` |
| 로그인 사용자 | 계정 단위로 같은 결과 | 1단계(결정 필요): `DailyTarot.tsx:39`의 `toss:daily-three:<owner>`처럼 계정 ID로 키를 나눈다. 이 기기 안에서만 계정별로 나뉜다. 2단계: 기기를 넘는 보존은 서버 저장(DB, RED)이 필요하며 별도 승인 대상이다 | 실측(레퍼런스): 하루 1회를 서버 상태(httpOnly 세션 쿠키로 추정)로 지킨다. 저장소를 비우면 초기화되었다 |
| 날짜 경계 | KST 자정에 새 판이 열린다 | `kstDay()` | `DailyTarot.tsx:68` 부근, 날짜 갱신 `useEffect` |
| 저장 실패 | 결과는 그대로 보이고 "이 기기에 저장하지 못했어요"를 안내한다 | — | `DailyTarot.tsx:175`(`setStorageOk(false)`) |

## 3. 타로 통합 플로우

### 3-1. 단계

| # | 단계 | 진행 방식 | 비고 |
|---|---|---|---|
| ① | 랜딩 | CTA | §1 |
| ② | 주제 칩 | 단일 칩은 450ms 자동 진행. 자유 입력은 CTA | 레퍼런스 질문 단계는 추천 칩 8개 → textarea(200자). 칩은 6개 이하(결정) |
| ③ | 셔플 | 자동 1.2s, 탭하면 건너뜀 | §2-1 |
| ④ | n장 고르기 | 탭하면 슬롯으로, 다시 탭하면 취소. 마지막 장 뒤 450ms 자동 진행 | 360px에서 부채 가로 스크롤은 쓰지 않는다. 실측(로컬): 꿀꿀 셸 부채 scrollWidth 약 3688px. 코드 감사는 발견성이 낮다고 평가했다. 영냥이 600px 이하 `flex-wrap`(`yeongnyangi.module.css:788`)을 따른다 |
| ⑤ | 공개 | 800ms 뒤집기를 350ms 간격으로 자동 진행. 탭하면 전부 공개 | §2-1 |
| ⑥ | 캐릭터 웹툰 결과 | — | [narrator-webtoon-result-spec](narrator-webtoon-result-spec.md) |
| ⑦ | 행동 | 다른 주제로 다시 / 이미지 저장 / 공유 / 보관함 / 후기 | 실측(레퍼런스): 연애 타로 결과는 저장·공유(시트 4항목: 카카오톡·이미지·기본 공유·링크 복사) → 보관 패널 → 별점 후기(로그인) 순서다. 하루 1회 흐름이면 '다시'를 '다른 주제로' 대신 내일 안내로 바꾼다 |
| ⑧ | 유료 심층 안내 1개 | "더 깊은 이야기가 궁금하다면" + 샘플 리포트 구성 + 가격 | §4 |

### 3-2. 카드 뒤집기 구현 규칙

- `rotateY(180deg)` + `backface-visibility: hidden`, 부모에 `perspective`(실측(레퍼런스) 700px)를 준다.
- `will-change: transform`은 애니메이션 동안에만 붙이고 `transitionend`에서 뗀다.
- 카드 상자는 고정 `aspect-ratio: 2 / 3`이다. 기존 영냥이 카드가 2/3이다(`app/yeongnyangi/_home/room.css:64`).
- 애니메이션 속성은 transform과 opacity만 쓴다.

### 3-3. 설정 객체 스키마

```ts
type TarotFlowConfig = {
  featureId: string;                 // 무료 판정 키. FREE_FORTUNE_FEATURE_KEYS(lib/payment/free-fortune-policy.mjs:3) 안에 있거나 서버 호출이 없는 로컬 계산이어야 한다
  brand: 'ggulggul' | 'yeongnyangi';
  narrator: 'yeoni' | 'yeongnyangi'; // 화자. 짝 문서 §1
  topics: { id: string; label: string }[];   // 칩 6개 이하
  freeText?: { maxLength: number };          // 있으면 CTA 진행
  cardCount: 1 | 3 | 4 | 5;
  deck: 'major22' | 'full78' | 'yeongnyangi';
  spread: { key: string; positions: { id: string; label: string }[] };  // lib/tarot/spreads.mjs 키 재사용
  adapter: 'master-reading' | 'daily-three' | 'sun-healing-local' | 'yeongnyangi-daily';  // 결정적 엔진만. LLM 어댑터는 무료 플로우에 두지 않는다
  storageKey: string;                        // 'cd:<flowId>:<kind>:v<n>'
  dailyOnce: boolean;
  library: '/records/' | '/yeongnyangi/library/';   // 브랜드로 고정. 섞지 않는다
  paidGuide?: { productId: string; priceSource: 'paid-feature-registry' };  // 가격은 카탈로그에서 읽는다
  analytics: { feature_id: string; surface: string; flow_id: string };
};
```

| 예시 | featureId | brand / narrator | cardCount · deck · spread | adapter | dailyOnce | paidGuide | 비고 |
|---|---|---|---|---|---|---|---|
| 무료 3장(명리) | 셸 무료 의식 기준. 판매가 꺼진 키는 `tarot-myeongri-three-card`(`worker/lib/paid-feature-registry.js:245`, saleEnabled:false) | ggulggul / yeoni | 3 · full78 · 기존 셸 3자리 | master-reading(`js/core/tarot/master-reading.mjs`) | false | `fortune-tea-house-tarot-consultation`(`paid-feature-registry.js:266`, 5,000원) | 무료 전환 근거: `docs/context/payment-gating.md:77-86` |
| 연애 타로 | `tarot-love-relationship` | ggulggul / yeoni | 6 · relationship_six_card | 서버 LLM | — | 자기 자신 | **무료 플로우 대상이 아니다.** 진입 자체가 유료 5,000원이다(`js/tarot-love-experience.js:24,26`). 무료 맛보기를 둘지는 §6 결정 사항이다 |
| 영냥이 오늘의 타로 | 출석 게이트(결제 아님) | yeongnyangi / yeongnyangi | 3 · yeongnyangi · 오늘 3자리 | yeongnyangi-daily(`dailyTarotSpread`, `app/yeongnyangi/_components/DailyTarotCard.tsx:37`) | true | 영냥이 생선 상품 1개(§6) | 현재 첫 방문은 잠겨 있다. 사흘 출석 멸치 3마리가 필요하다(실측(로컬)) |
| 힐링 타로 | 로컬 결정 엔진(정책 키 미확인) | ggulggul / yeoni | 4 · healing_rising_four_card(`app/components/SunHealingTarot.tsx:91`) | sun-healing-local(`SunHealingTarot.tsx:16,486`) | false | 없음(현재 유료 CTA 없음, 실측(로컬)) | 현재 고르는 단계가 없다. 4장이 자동 배분되고 순서대로 뒤집는다 |

### 3-4. 통합 기준과 이관 순서(메모, 구현 아님)

- 기준은 **DailyTarot React 골격 + TarotDrawRitual 단계·접근성 패턴 + 셸 78장 덱**이다. 코드 감사 B2 추천과 일치한다.
  - DailyTarot: `app/today/DailyTarot.tsx` 322줄. 22장, 의식 상수 `:27`, 저장 `:39,60,175`.
  - TarotDrawRitual: 95줄. focus → shuffle → choose → reveal → reading. 요청별 저장은 `:16,45`.
  - 셸 덱: `js/saju-engine-tarot-sukuyo-quantum.js:3118-3530`, 78장 Fisher-Yates `:3235`.
  - 셸과 DailyTarot은 같은 규칙 엔진 `js/core/tarot/master-reading.mjs`를 이미 공유한다.
- DailyTarot에 없는 것: 셔플 시각화, 78장, 360px 부채 음수 여백(`daily-tarot.module.css:60`, 화면 미실측), 유료 경계 CTA, 단계 aria-live.
- 이관 순서(안)
  1. 설정 객체와 순수 상태기(저장·복원·하루 1회)를 `lib/tarot/`에 둔다.
  2. 새 플로우 셸 하나를 `/today/` 뒤에 붙인다. 지금은 로그인 게이트가 있다(실측(로컬)).
  3. 힐링을 옮긴다.
  4. 셸 무료 의식을 옮긴다. 진입 action(`?action=openTarotModal`·`cdHomeTarotEntry`)을 옮겨야 하므로 라우팅 RED다.
  5. 영냥이 오늘의 타로를 옮긴다(출석 게이트 정책 결정 뒤).
- 영냥이 기록은 `/yeongnyangi/library/`, 꿀꿀 기록은 `/records/`에 저장한다(CLAUDE.md 보관함 분리). `library` 필드는 brand로 고정하고 설정에서 바꾸지 못하게 한다.

## 4. 무료/유료 경계

| 규칙 | 내용 |
|---|---|
| 자리표시 금지 | 무료 결과에 "판정 대기"·"분석 대기"·"0%" 같은 빈 값 표기를 내지 않는다. 값이 없으면 그 블록을 렌더하지 않는다 |
| 유료 안내는 1개 | 결과 맨 아래에 유료 심층 안내 1개만 둔다. 무료 결과 중간에 잠금 티저를 끼우지 않는다(결정. 레퍼런스는 카드마다 잠금 티저를 끼운다. §6) |
| 가격 출처 | 가격은 서버 가격표 `worker/lib/paid-feature-registry.js`(`FEATURE_KEY_PRICE_TABLE`, `amountKRW`)를 읽어 표시한다. 클라이언트 조회기는 `app/_lib/serviceCoinPrice.ts`다. 문자열로 박지 않는다 |
| 게이트 없음 | 무료 기본 결과에는 로그인·꿀방울·추가 모달이 없다. 필요한 동의는 첫 방문 한 단계로 합친다 |
| 용어 | 결제 수단은 꿀단지 이용권·월정석·단건 결제 셋이다. 코인은 화면에 내지 않는다(`design-canon.md:34`, [payment-gating](payment-gating.md)) |
| 신뢰 라인 | "로그인 없이"·"이 기기에서만 계산"은 사실일 때만 쓴다 |

현재 위반·불일치(실측과 코드, 보고만):

| # | 위치 | 내용 | 근거 |
|---|---|---|---|
| 1 | 무료 사주 | 결과 전에 로그인 벽이 있다. 4탭째에 개인정보 동의 → 로그인 모달 순서로 뜬다 | 실측(로컬). `js/saju-engine.js:4446`(`ensureSajuResultSession`), `:4464-4465`(`__cdOpenLoginRequiredModal`, reason fortune_result). 감사 시점(68ce5bf67)에는 `:4759`였고 줄이 이동했다 |
| 2 | 무료 사주·만세력 | 게스트에게 개인정보 동의 모달이 뜬다. 만세력은 셸로 이동하면 자동으로 뜬다 | `js/saju-engine.js:4589`(`checkPrivacyAndCalculate`), `:4594,4601`(`openPrivacyModal`). 실측(로컬) |
| 3 | `/today/` | 비로그인은 「무료로 시작」을 눌러도 안내 문구만 뜬다. 문구가 y=427로 버튼(y=626)보다 위에 있다 | 실측(로컬). `app/_lib/free-reading-access.ts:3`(`hasFreeReadingSession`). 3,000원 게이트 유지 기록은 `payment-gating.md:86` |
| 4 | 자리표시 | "판정 대기" 4분면, "분석 대기" 출처 3줄, "0%" 초기값 | `index.html:8382,8390,8398,8406`, `:8457-8459`, `#tarotSelfEsteemExpPercent`. 실측(로컬) 무료 사주 결과에는 판정·분석 대기 0, 보이는 "0%" 1곳(`#iljuEarthVal`, 데이터 값으로 추정) |
| 5 | 셸 타로 유료 CTA | "5,000원(단건)"이 마크업 문자열이다 | `index.html:17419`. 새 플로우는 카탈로그에서 읽는다 |
| 6 | 자존감 타로 | 무료 진입이 열리지 않는다 | 실측(로컬): 3·6·12·16초 대기. 딥링크 허용목록 `index.html:31650`에 `openTarotSelfEsteemModal`이 없다 |
| 7 | 랜딩 유료 메타 | `/tarot/reunion`·`/tarot/year`를 유료로 표시하지만 정책은 무료다 | `app/components/FeatureLandingPage.tsx:292`, `lib/payment/free-fortune-policy.mjs:66-67`. 화면 표기는 미확인 |
| 8 | 영냥이 오늘의 타로 | 첫 방문이 출석 3일(멸치 3)로 잠겨 있다 | 실측(로컬) |

## 5. 측정 이벤트

### 5-1. 규칙

- GA4 이름 규칙: snake_case, 40자 이하, 예약어 금지. 예약어는 `first_visit`·`session_start`·`user_engagement`·`screen_view`·`error`·`click`·`scroll`·`purchase` 등이며, 접두 `ga_`·`google_`·`firebase_`·`_`도 금지한다.
- 저장소 가드 ⑨(`scripts/verify-analytics-events.mjs:21,484-506`)는 **`app/hooks/useAnalytics.ts`가 쏘는 이름**만 기존 발화명·예약어와 대조한다. 새 이름이 다른 파일에서 발화하면 ⑨가 잡지 못한다. 그래서 아래 대조는 손으로 했다.
  - 대상: `cdTrack|trackEvent|emit` 리터럴 전수, `js app lib index.html`, 2026-11-20 `git grep`.
  - ⑨의 수집기(`:53-75`)는 `emit(` 래퍼(`DailyTarot.tsx:52`)를 세지 않는다. 이 점도 함께 적는다.
- `funnel_step`·`cta_click`은 쓰지 않는다. 둘은 `useAnalytics` 훅에만 있고 호출자가 0이다(`docs/analytics-kpi.md:186-188`).
- 발화는 `lib/analytics.ts`의 `trackEvent`(`:62`) → `window.cdTrack`(`js/core/analytics.js:356`)로 보낸다. 새 경로를 만들지 않는다.

### 5-2. 이름 매핑

| 요청 이름 | 제안 이름 | 길이 | 기존 이름과 겹침 | 발화 시점 | 파라미터 |
|---|---|---|---|---|---|
| step_view | `guided_step_view` | 16 | 없음 | 단계 화면 표시 1회(복원 포함, `restored: true`) | feature_id, surface, flow_id, step_id, step_index |
| step_complete | `guided_step_complete` | 20 | 없음 | 단계를 떠나 앞으로 갈 때 | 위 + `advance: 'auto'\|'cta'\|'skip'` |
| flow_complete | `guided_flow_complete` | 20 | 없음 | 결과 첫 컷 표시 | feature_id, surface, flow_id |
| flow_abandon | `guided_flow_abandon` | 19 | 없음 | 결과 전 `pagehide`, 마지막 step_id 1회 | 위 + step_id, step_index |
| result_cut_view{cut} | `result_cut_view` | 15 | 없음(`fortune_result_view`와는 다른 이름) | 컷이 50% 보일 때 컷당 1회 | flow_id, cut_index, `cut_kind` |
| text_only_toggle | `result_text_only_toggle` | 23 | 없음 | 글로만 보기 토글 | flow_id, `on: boolean` |
| paid_cta_click | `paid_guide_click` | 16 | 없음(`destiny_anatomy_paid_cta_click`과 다름) | 유료 심층 안내 클릭 | feature_id, surface, flow_id, `product_id` |

- 기존 `free_feature_start`·`free_result_view`(`app/yeongnyangi/_components/FreeFortune.tsx:21,82`, 계약 `docs/marketing/cro-event-contract-20261103.md:17`)는 유지한다. 새 플로우의 시작은 `free_feature_start`, 결과 열람은 `free_result_view`로 같이 쏜다. `guided_flow_complete`는 "단계 완주"이며 결과 열람과 같은 뜻이 아니다. 같은 행동에 이름 둘을 붙이지 않는다는 규칙(`analytics-kpi.md` §5)에 따라 `guided_step_view`를 랜딩 단계에 쏘지 않는다. 랜딩 → 시작은 `free_feature_start`가 맡는다.
- 기존 `daily_tarot_start`·`daily_tarot_complete`(`DailyTarot.tsx:180,205`)는 `/today/` 이관 때 위 이름으로 바꾸지 말고 병행 기간을 정한다(§6).
- 파라미터 값에는 공개 카탈로그 ID와 열거값만 넣는다. 자유 입력 질문 원문은 넣지 않는다(`lib/analytics.ts`의 discovery 주석과 같은 원칙).

### 5-3. 구현 때 등록할 곳(이번에는 편집하지 않음)

- `docs/analytics-kpi.md`: 이벤트 표와 §6 탐색(무료 → 유료 퍼널 단계).
- `scripts/verify-analytics-events.mjs`: 새 발화명 보호. ⑨ 대상이 훅뿐이라 새 이름 충돌 검사를 넓힐지 결정해야 한다.
- `docs/marketing/cro-event-contract-20261103.md`: 이벤트 계약 표.

## 6. 결정 (2026-11-20 승인)

사용자 원문 2026-11-20: "권장안대로 승인, 구현 계획 진행해줘". 아래 "추천" 열을 확정값으로 쓴다. 단 D11은 추천이 없던 항목이고 사용자가 "상관없어"(2026-11-20)라 하여 **현행 유지(영냥이 출석 게이트 유지)**로 확정한다. D8 서버 저장·D10 연애 타로 무료화·D12 로그인 벽 해제는 승인된 것이 "분리"이며 실행은 각각 별도 RED 승인이 필요하다.

| # | 항목 | 요청값 | 실측/정본 | 추천 | 이유 |
|---|---|---|---|---|---|
| D1 | 단일 선택·마지막 카드 뒤 자동 진행 | 450ms | 레퍼런스: 자동 진행 없음(CTA) | 450ms 유지, A/B | 요청이고, 레퍼런스는 기능이 없을 뿐이다 |
| D2 | 단계 전환 시간 | 240ms | 레퍼런스: 전환 없음. 토큰 220ms | 220ms(토큰) | 리터럴 금지 정본 |
| D3 | reduced-motion | 페이드 120ms | 토큰 0.01ms, 기존 의식 0ms | 즉시 전환 + '다음' 상시 | 전역 토큰과 충돌 |
| D4 | 카드 공개 간격 | 600ms | 레퍼런스 350ms(뒤집기 800ms) | 350ms | 실측 우선 |
| D5 | 느린 대기 대사 문턱 | 없음 | 없음 | 3s | 근거 없는 결정이라 승인 필요 |
| D6 | 셔플 길이 | 자동 | 레퍼런스 380ms 1회 | 380ms × 3, 1.2s에 진행 | 최소 대기와 묶음 |
| D7 | 무료 결과 중간 잠금 티저 | 맨 아래 1개 | 레퍼런스: 카드마다 잠금 티저 | 맨 아래 1개만 | 요청 원문 |
| D8 | 로그인 사용자 하루 1회 | 계정별 | 레퍼런스: 서버 상태 | 1단계 계정 ID 로컬 키, 서버 저장은 별도 RED | DB 쓰기는 승인 범위 밖 |
| D9 | 본문 글자 크기 기본 | 크게 | 레퍼런스 '기본' 15.5px, 정본 모바일 17px | 기본 17px, 크게 19px | 짝 문서 §4 |
| D10 | 연애 타로 무료 맛보기 | 예시 포함 | 전액 유료 5,000원 | 이번 통합에서 제외 | 무료화는 결제 정책 변경(RED) |
| D11 | 영냥이 오늘의 타로 출석 게이트 | 무료 기본 결과에 게이트 없음 | 출석 멸치 3 | 게이트 유지 여부를 사용자 결정 | 영냥이 리텐션 장치라 임의로 풀지 않는다 |
| D12 | 무료 사주 로그인 벽·동의 모달 | 로그인 없음, 동의 1단계 | `saju-engine.js:4464`, `:4594` | 이 명세 범위 밖 후속 과제로 분리 | 인증 경계 변경은 RED |
| D13 | `daily_tarot_*` 이벤트 병행 | — | 기존 5종 발화 중 | 이관 뒤 4주 병행 후 정리 | 베이스라인 단절 방지 |

## 7. 미확인

- 레퍼런스 실제 리더의 글자 크기 토글 동작과 표지: 0원 결제와 로그인이 필요해 범위 밖이었다.
- `/today/` DailyTarot의 실제 화면 타이밍과 360px 넘침: mock `/api/auth/me`에 `authenticated` 필드가 없어 로그인 상태로도 열리지 않았다.
- 연애·재회·자존감·연간·크리스털·수비학 타로의 뒤집기 시간과 레이아웃 세부.
- 쿠키 배너가 첫 화면 조작을 가리는지: 로컬 꿀꿀 3장 타로에서는 배너가 화면 밖(y≈7971)이었다. 다른 화면은 미측정.
- 힐링 타로의 무료 정책 키: 브라우저 로컬 계산이라 키를 확인하지 않았다.
- 운영 302 경로에서 자존감 타로 진입이 끊기는지(로컬만 실측).
