# 콘텐츠 실제 번역 — 인수인계 (2026-08-25)

> **이 문서만 읽고 시작할 수 있게 쓴다.**
> UI 카피 로케일화는 [locale-service-optimization-2026-08-25.md](locale-service-optimization-2026-08-25.md) 가 다룬다.
> 이 문서는 그 문서가 **명시적으로 제외한** 축 — 데이터 파일에 든 서사·해석 **콘텐츠 본문** — 이다.

## 🔴 먼저: 이건 한 세션에 안 끝난다

**실측 2026-08-25 — 한글 139,315자.** 저작 로케일 4개(en·ja·zh-CN·zh-TW)로 옮기면 **약 557,000자**다.

| 파일 | 줄 | 한글 자수 | 무엇 |
|---|---|---|---|
| `app/saju/love-simulation/_data/loveCodeMvp.ts` | 4,546 | **106,658** | 러브 시뮬레이션 시나리오·대사 본문 |
| `app/saju/love-simulation/_data/loveCharacterStories.ts` | 408 | 26,723 | 캐릭터 서사 |
| `app/saju/love-simulation/_data/scenarios.ts` | 135 | 2,148 | 시나리오 정의 |
| `app/saju/love-simulation/_utils/loveCharacterMatching.ts` | 158 | 1,432 | 매칭 문구 |
| `src/features/master-love-codex/data/prologue.ts` | 78 | 1,387 | 프롤로그 대사 스크립트 |
| `src/features/master-love-codex/data/premium.ts` | 56 | 967 | 랜딩 마케팅 문구 |

여기에 자미두수 해석 엔진 문장(`AdvancedZiweiSectionV2` + `_lib` 의 `PALACE_DEFINITION_MAP`·`STAR_MEANING_MAP`)이 더 있는데, 그쪽은 **의도된 제외**다(아래).

## 🔴 자동 번역기를 쓸 수 없다

이 레포에서 번역 자동화는 **Gemini 유료 실호출**이고, CLAUDE.md 절대 규칙 1이 사용자 허락 없는 실호출을 금지한다.
그래서 이 분량은 **손으로 쓰는 수밖에 없다**(선례: `docs/handoff/` 의 "셸 새 카피 = 12개 로케일 수작업").
계획 단계에서 **키 수를 줄이는 것**이 유일한 지렛대다.

## 손대면 안 되는 것 — 이미 판정이 끝난 제외 대상

옮기기 전에 아래를 다시 논의하지 말 것. 각 모듈 헤더에 이유가 적혀 있다.

| 대상 | 왜 제외인가 | 근거 |
|---|---|---|
| 자미두수 해석 엔진 문장 · 12궁/별/사화/밝기 이름 | 도메인 고유명사는 **원어 유지**가 이 레포의 규칙이다(Vedic/Graha·나크샤트라와 동일) | `app/components/ziwei/_lib/advanced-ziwei-copy.ts` 헤더 |
| `data/prologue.ts` 의 `speaker: "연애 고수"` | 대사 스크립트를 가르는 **타입 리터럴 = 기계 키** | `src/features/master-love-codex/_lib/copy.ts` 헤더 |
| `CodexChapter` 의 `/^제\s*\d+\s*장\s*·\s*/` | 서버가 붙이는 접두를 걷는 **기계 계약** | `__tests__/ui/paid-result-locale-copy.test.js` 허용목록 |
| `SikojenpovailuContext` 의 `'금전운' \| '연애운' \| '행운'` | 한국어 **타입 리터럴 = 기계 키** | 위 가드 |
| 서버 렌더 SEO 산문(`page.tsx` 본문) | 한국어 분량을 `verify-adsense-readiness` 가 센다 | locale-service 문서 |

## 어떻게 자를 것인가 — 권하는 순서

🔴 **`loveCodeMvp.ts`(106,658자) 를 첫 슬라이스로 잡지 말 것.** 한 파일이 전체의 76% 라 세션이 반드시 마른다.

1. **`master-love-codex/data/prologue.ts` + `premium.ts`** (2,354자) — 한 세션에 확실히 끝난다. 프롤로그는
   화자 대사라 **말투 결정**이 필요하고, 그 결정을 여기서 먼저 굳혀 두면 뒤 슬라이스가 따라 쓰기만 하면 된다.
2. **`love-simulation/_data/scenarios.ts` + `_utils/loveCharacterMatching.ts`** (3,580자) — 구조가 단순하다.
3. **`loveCharacterStories.ts`** (26,723자) — 캐릭터 단위로 더 잘린다. 캐릭터 N명씩 나눠 여러 PR.
4. **`loveCodeMvp.ts`** (106,658자) — 반드시 **시나리오 블록 단위**로 쪼갠다. 한 PR = 블록 몇 개.

## 시작하기 전에 정해야 할 것 (사용자 결정)

이건 코드 판단이 아니라 제품 판단이라 **묻고 시작해야 한다**.

1. **이 콘텐츠를 비-한국어 사용자에게 정말 낼 것인가?** 러브 시뮬레이션은 사주 기반 서사라,
   번역해도 문화적으로 통할지가 별개 문제다. "번역"이 아니라 "각 문화권 재저작"이 답일 수 있다.
2. **4개 로케일 전부인가, 일부인가?** 557,000자는 en 하나만 해도 139,315자다.
3. **UI 카피를 먼저 끝낼 것인가?** locale-service 문서 기준 UI 쪽 잔여는 **~105자**뿐이라
   훨씬 싸게 끝난다. 콘텐츠보다 먼저 닫는 편이 합리적이다.

## 지금 상태 (2026-08-25)

- UI 카피 축은 거의 끝났다 — `"use client"` + 한국어 + **배선 전무**가 24개 파일 · 105문자열.
  남은 실제 결함은 `app/_lib/moonlight-store-snapshot.ts`(4) · animal-destiny 연출 컴포넌트 3종(~11) ·
  `love-simulation/_components/DialogueBox.tsx`(2) 정도다.
- 휴먼 디자인은 이번에 5로케일 260항목을 채웠다(PR #1130).
- 🔴 측정기는 **배선 6가지**를 전부 인정해야 수치가 안 부푼다 — 목록은 locale-service 문서에 있다.
