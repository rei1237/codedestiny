# 캐릭터 웹툰 결과·화자 레이어 명세

- 작성일: 2026-11-20
- 상태: **승인 2026-11-20** (사용자 원문 2026-11-20: "권장안대로 승인, 구현 계획 진행해줘"). §9 추천 열이 확정값이다
- 입력: 1단계 감사(docs/context/free-tarot-ux-audit.md, 아직 사용자 승인 전 초안)
- 짝 문서: [guided-step-flow-spec](guided-step-flow-spec.md)(단계형 플로우 ①–⑤, ⑦–⑧)
- 범위: 결과 화면(통합 플로우 ⑥)과 유료 리포트 리더의 명세만 다룬다. 구현은 승인 뒤 별도 작업이다.
- 수치 표기: 짝 문서 §0과 같다. 실측(레퍼런스)·실측(로컬)·코드·요청값·결정 다섯 가지이며, 실측을 우선한다.

## 1. 화자

| 브랜드 | 화자 | 형태 | 정본 | 근거/결정 |
|---|---|---|---|---|
| 꿀꿀 운세(무료 운세·타로) | 연이 | **꽃돼지 마스코트 형태** | 페르소나 `worker/yeongnyangi/prompts/persona/yeoni.ts:1-8`, 목소리 표 `docs/context/design-canon.md:20-30` | 무료 결과는 마스코트 안내 계층이다. 인간형 연이는 상담 본편 화자이므로 섞지 않는다(`docs/context/content-assets.md:11-12,20`) |
| 영냥이 | 영냥이 | 흰 고양이 | 페르소나 `worker/yeongnyangi/prompts/persona/yeongnyangi.ts` | 밤색·아이보리·금빛 팔레트를 쓰고 분홍을 쓰지 않는다(`design-canon.md:85`) |

- 화자는 설정 객체의 `narrator`가 정한다(짝 문서 §3-3). 한 결과 안에서 화자를 바꾸지 않는다(결정).
- 엔진 해석문과 화자 대사는 서로 다른 층이다(§8). 화자는 해석을 대신 쓰지 않고 안내·연결·마무리만 맡는다.

## 2. 컷 구성

### 2-1. 순서

| # | 컷 kind | 내용 | 대사 수 | 근거/결정 |
|---|---|---|---|---|
| 1 | `opening` | 인사 + 오늘 고른 주제 한 줄 | 1–2 | 실측(레퍼런스): 결과 맨 앞에 인트로 컷 여러 장. 요청은 1장으로 줄인다(결정) |
| 2 | `card` × n | 카드 그림 + 카드 이름·정역 + 엔진 해석 요약 + 화자 한마디 | 해석 1 + 화자 1 | 실측(레퍼런스): 카드마다 패널 → 해석 컷 → 잠금 티저 순서. 잠금 티저는 넣지 않는다(짝 문서 §6 D7) |
| 3 | `synthesis` | 세 장을 묶은 흐름 + 한 줄 결론 | 1–2 | 실측(레퍼런스): 종합 → 한 줄 결론 |
| 4 | `step` | 오늘의 한 걸음(행동 1개) | 1 | 실측(레퍼런스): '오늘의 한 걸음'. 페르소나 규칙: 영냥이는 판단 → 이해 → 작은 행동 1개 |
| 5 | `closing` | 마무리 인사 + 고정 면책(§6) | 1 + 면책 | 실측(레퍼런스): 마지막 CTA 바로 아래 면책 1줄 |

- 무료 결과의 컷 수는 3장 타로 기준 7컷이다(1 + 3 + 1 + 1 + 1). 기존 오늘의 운세 웹툰도 7컷이다(`lib/fortune/daily-webtoon.ts:225` `buildDailyWebtoon`, 장소 컷과 대화 컷, 여는 내레이션·닫는 연이).
- 컷 뒤에 짝 문서 §3-1 ⑦ 행동 → ⑧ 유료 안내 1개가 이어진다.

### 2-2. 데이터 모델(기존 타입 확장)

현재 타입(`app/components/webtoon/CutReader.tsx:4-8`):

```ts
export type WebtoonLine = { speaker: string; text: string; note?: string };
export type WebtoonCut = { src: string; widths: number[]; fallback: number; w: number; h: number;
  alt: string; kind: string; cover?: boolean; lines: WebtoonLine[] };
```

확장안. 필드는 모두 선택이라 기존 호출부(`daily-webtoon.ts:9`, `app/fortune/[period]/DailyFortuneWebtoon.tsx:8-17`)는 그대로 동작한다.

```ts
export type Expression = 'smile' | 'explain' | 'worry' | 'cheer' | 'serious' | 'greet' | 'think' | 'surprise';
export type WebtoonLine = {
  speaker: string; text: string; note?: string;
  source?: 'engine' | 'narrator' | 'disclaimer';   // §8 층 구분. 없으면 기존 동작
};
export type WebtoonCut = {
  /* 기존 필드 그대로 */
  kind: 'opening' | 'card' | 'synthesis' | 'step' | 'closing' | string;  // 기존 'place' | 'dialogue' 호환
  expression?: Expression;                          // §3 매핑으로 src 결정
  card?: { id: string; reversed: boolean; position?: string };  // 카드 컷만
};
```

| 규칙 | 내용 | 근거 |
|---|---|---|
| 그림 없는 컷 | `src: ''`이면 `data-art="pending"`으로 글만 보이는 컷이 된다. 에셋이 없는 표정도 이 경로를 탄다 | `CutReader.tsx:16` |
| 말풍선 | HTML `<p>`이다. speaker가 있으면 `.bubble`, 없으면 `.narration`. 이미지에 글자를 굽지 않는다 | `CutReader.tsx:24-26`, moods README(이미지 안 글자 없음) |
| 키 | 지금은 `line.text`를 키로 쓴다. 같은 문장이 두 번 나오면 키가 겹친다. 확장 때 인덱스를 함께 쓴다 | `CutReader.tsx:24`(작은 결함, 보고만) |
| tone | 꿀꿀은 `paper`, 영냥이는 `night`(기존 값 재사용) | `CutReader.tsx:14` |

## 3. 표정 세트

### 3-1. 에셋 매핑

꿀꿀 연이(꽃돼지): `public/images/novel/remaster/v2/yeoni/` 아래 webp 20종. 꽃돼지 형태라는 근거는 `content/novel/mobile-assets.json:709` 이하 `pig pigV2|…` 키이며, 모바일판은 400×472다.

영냥이: `public/assets/yeongnyangi/moods/` 아래 webp 21종 + README. README 기준으로 전신 포즈, 360×300, 흰 바탕, multiply 합성이다. 그 밖에 `original/expression-{calm,happy,wink}.webp`가 있다.

| 표정 | 연이 파일 | 영냥이 파일 | 상태 |
|---|---|---|---|
| 미소 smile | `soft-smile` | `original/expression-happy`, `beam` | 있음 |
| 설명 explain | `talk` | `abacus`, `laptop` | 연이는 있음. 영냥이 두 컷은 소품 포즈라 맥락이 좁다 → **에셋 부족(제작 필요)** 후보 |
| 걱정 worry | `think`(대체). `sad`는 §3-2 금지 규칙과 충돌 | `ponder`(대체) | **에셋 부족(제작 필요)**: 둘 다 걱정 전용 표정이 없다 |
| 응원 cheer | `cheer` | `heart` | 연이는 있음. 영냥이 `heart`는 애정 포즈라 응원 뜻이 약하다 → 제작 검토 |
| 진지 serious | `determined` | `original/expression-calm`, `ponder` | 연이는 있음. 영냥이는 대체 |
| 인사 greet | `wave` | `wave` | 있음 |
| 생각 think | `think` | `ponder` | 있음 |
| 놀람 surprise | `surprise` | `startled` | 있음 |

- 확인 방법: 2026-11-20 `git ls-files public/images/novel/remaster/v2/yeoni public/assets/yeongnyangi/moods`.
- 영냥이 moods는 흰 바탕을 multiply로 합성한다. 그래서 아이보리 무대에서만 자연스럽다. 밤색 `night` 톤에서는 흰 박스가 드러날 수 있다. 컷 배경을 아이보리 패널로 두거나 투명 PNG를 새로 만들어야 한다(결정 필요 N4).
- 인간형 연이(`public/images/expert-characters/yeoni/`)와 상담 동작(`fortune-chat/persona/yeoni-*`)은 이 결과에 쓰지 않는다.

### 3-2. 선택 규칙(결정적)

| 조건 | 표정 | 비고 |
|---|---|---|
| opening | greet | — |
| card, 정방향 | explain | — |
| card, 역방향 | think | **`fear`·`angry`·`cry`·`sad` 금지.** 공포 조장 금지 페르소나 규칙(`yeoni.ts`, `yeongnyangi.ts`)에 따른다 |
| card, 주의 카드(탑·죽음·악마 등, 엔진 플래그 기준) | serious | 위와 같은 금지 |
| synthesis | think → serious(결론이 주의일 때) | — |
| step | cheer | — |
| closing | smile | — |
| 매핑 파일이 없을 때 | `src: ''` 글 컷 | 결과가 비지 않게 한다(코딩 원칙 17 정신) |

- 같은 표정이 연달아 3컷을 넘으면 세 번째를 `think` 또는 `smile`로 바꾼다(결정).
- 표정 선택은 엔진 결과만 보고 정한다. LLM에게 표정을 고르게 하지 않는다.

## 4. 연출

| 항목 | 값 | 근거/결정 |
|---|---|---|
| 컷 등장 | IntersectionObserver로 화면에 들어오면 fade-up, 18px, 550ms | 실측(레퍼런스): `.is-in` 블록 opacity + translateY 18px, 550ms. 토큰 최대값 380ms(`DESIGN.md:340`)보다 길다 → 결정 필요 N1(추천: `--cd-dur-emph` 380ms) |
| 말풍선 순차 | 지연 0.3s + i×0.28s. opacity 350ms. transform은 translateY(14px) scale(.9)에서 500ms cubic-bezier(0.3,1.6,0.5,1) | 실측(레퍼런스). 토큰 밖 값이라 N1과 같이 결정 |
| 타이핑 효과 | 쓰지 않거나, 쓰더라도 컷당 최대 600ms로 제한하고 탭하면 전부 보인다 | 요청값(타이핑 상한). 정본: 등장 대기로 읽기를 늦추지 않는다(`design-canon.md:88`). 실측(레퍼런스)에는 타이핑이 없다 |
| reduced-motion | 즉시 표시 | 토큰이 0.01ms가 된다(`DESIGN.md:341`) |
| 글로만 보기 | 상단 토글. 켜면 그림을 숨기고 대사·해석만 이어 읽는다. `aria-pressed`, 상태는 localStorage(try/catch) | 요청값. 이벤트는 `result_text_only_toggle`(짝 문서 §5) |
| 글자 크기 | **기본 17px / 크게 19px**, line-height 1.8, 최대 폭 38rem | 정본 `design-canon.md:86`(긴 결과 모바일 17px). 요청은 '크게' 기본, 실측(레퍼런스)은 '기본' 15.5px. 정본 17px가 이미 레퍼런스 '기본'보다 크다 → N2 |
| 대비 | 본문 4.5:1 이상 | 정본 |
| 읽기 진행 | 상단 3px scaleX 막대 | 실측(레퍼런스) |

## 5. 유료 리포트 챕터 리더

실측(레퍼런스, `?sample=1`):
- 상단 sticky 61px 바: 챕터 이름 + 목차 버튼 + 3px 진행 막대.
- 5개 챕터를 한 번에 하나씩 보여 준다.
- 목차는 하단 시트다. 열 때 280ms cubic-bezier(0.2,0.8,0.2,1), 닫을 때 240ms cubic-bezier(0.4,0,1,1).
- 챕터를 바꾸면 `#ch-N`을 push하고, 뒤로가기는 이전 챕터로 간다.
- 챕터 끝에 이전·다음 제목 카드가 있고, 챕터 등장은 650ms다.
- 본문은 15.5px다. 숨은 리더 셸에 기본/크게 토글이 있고 기본값은 '기본'이다.

| 기능 | 기존 `PageReaderChrome` | 필요 | 비고 |
|---|---|---|---|
| 뒤로 링크·제목·쪽수 | 있음(`app/components/webtoon/PageReaderChrome.tsx:87-104`) | 유지 | — |
| 읽던 곳 이어보기 | 있음(`:30-33`, storageKey) | 유지 | — |
| 현재 쪽 추적 | 있음(IO, `:36-43`) | 챕터 단위로 확장 | — |
| 스크롤 숨김·진행 막대 | 있음(`:52-85`) | 유지 | — |
| **목차** | **없음** | 하단 시트 목차 | 시트 시간은 토큰(220/380)에 맞춘다(N1) |
| **글자 크기** | **없음** | 기본 17 / 크게 19 토글 | §4 |
| 챕터 history | 없음 | `#ch-N` push | 라우팅 변경 아님(해시) |
| 이전·다음 챕터 카드 | 없음 | 챕터 끝 | — |

- 사용처: `app/components/webtoon/PageReader.tsx`, `app/yeongnyangi/season-1/{prologue,[episode]}/page.tsx`. 공용 컴포넌트를 확장하면 이 화면들도 영향을 받는다. 그래서 props를 선택형으로 추가하고 기본은 기존 동작으로 둔다(결정).
- 유료 결과 재열람은 저장 원본을 쓰고 추가 결제·LLM 생성을 하지 않는다(CLAUDE.md 보관함·구매 기록 보존).

## 6. 고정 면책 문구

> 타로는 마음을 돌아보는 도구이며 미래나 상대의 마음을 확정하지 않아요

| 규칙 | 내용 | 근거 |
|---|---|---|
| 위치 | closing 컷 바로 아래이자 ⑦ 행동 위. 화자 대사가 아닌 `source: 'disclaimer'` 줄로 둔다 | 실측(레퍼런스): 마지막 CTA 바로 아래 1줄. 탄생 타로는 후기 아래, 띠 운세는 푸터 |
| 문구 | 위 원문 고정. 화자 말투로 바꾸지 않는다. 영냥이 반말 결과에서도 이 문장은 해요체 그대로 둔다 | 요청값. 면책은 서비스 문장이라 화자 말투와 분리한다(결정) |
| 표시 | 본문보다 한 단계 작은 크기, 대비 4.5:1 이상. 숨기거나 접지 않는다 | — |
| 정본 정합 | 타로는 감정 흐름을 말하고 마음을 읽어 주지 않는다(`content-assets.md:36-50`). 상대 마음 단정 금지(`yeoni.ts`) | 충돌 없음 |
| 범위 | 타로 결과에만 쓴다. 사주·띠 운세는 기존 문구를 유지한다 | 요청 범위 |

## 7. 말투 가이드

원칙: **기존 정본이 이긴다.** 새 말투 문서를 만들지 않는다. 정본은 `worker/yeongnyangi/prompts/persona/{yeoni,yeongnyangi}.ts`와 `design-canon.md` §2(`:20-30`)다.

| 화자 | 정본 규칙(요약) | 요청과 충돌 |
|---|---|---|
| 연이 | 부드러운 존댓말·편지체. 답과 근거를 위로보다 먼저 말한다. 아기 말투·의성어·과한 애교·이모지 금지. 사용자를 돼지라 부르지 않는다. 꽃·편지·달빛 이미지는 챕터당 1회 이하. 말투가 결론을 바꾸지 않는다. 무조건 긍정 금지. 사용자를 '당신'으로 부른다 | **C1** 요청 "따뜻·힐링, 쉽게"는 순서가 위로 먼저로 읽힌다. 정본은 근거 먼저다. 정본을 따르고 따뜻함은 어휘로만 낸다 |
| 영냥이 | 반말(~해/~야/~거든/~지). '너', 가끔 '손님'. 판단 → 이해 → 작은 행동 1개. 단정어(반드시/무조건/확실/틀림없) 금지. '흥'·'~냥'은 짧은 곁말로 챕터당 1–2회. 존댓말 변형(해요체·'손님')이 있다 | **C2** 무료 결과 화면에서 반말과 존댓말 중 무엇을 쓸지 정본에 정해져 있지 않다 → N3 |
| 공통 금지 | 공포 조장. 상대 마음·연락 날짜·재회·합격·금전·건강의 단정 예측. 의료·법률·투자 판단 | 없음 |
| 용어 | 꿀단지 이용권·월정석·단건 결제만 쓴다. 코인은 쓰지 않는다(`design-canon.md:32-36`) | 없음 |

### 7-1. 카드 컷 대사 템플릿 규칙

무료 결과의 화자 대사는 **결정적 템플릿**이다. LLM을 쓰지 않는다.

| 규칙 | 내용 | 위반 시 결정적 교정 |
|---|---|---|
| 길이 | 대사 1개 60자 이하, 2문장 이하 | 문장 경계에서 자르고 둘째 문장까지만 둔다. 문장 경계가 없으면 쉼표에서 자른다 |
| 슬롯 | `{position}`·`{card}`·`{keyword}`·`{action}`만 쓴다. 엔진 결과 필드에서 채운다 | 비어 있는 슬롯이 하나라도 있으면 그 템플릿 대신 같은 표정의 기본 문장을 쓴다 |
| 단정어 | 반드시·무조건·확실·틀림없·100% 금지 | 금지어를 사전 치환한다(예: 반드시 → 차분히). 치환 뒤에도 남으면 기본 문장으로 바꾼다 |
| 상대 마음 | "그 사람은 ~하고 있어요" 같은 문형 금지 | 패턴이 걸리면 "당신의 마음에서는"으로 시작하는 기본 문장으로 바꾼다 |
| 이모지·의성어 | 0개 | 제거한다 |
| 호칭 | 연이는 '당신', 영냥이는 '너' 또는 '손님'(N3) | 화자별로 치환한다 |
| 역방향 | "나쁜 카드" 표현 금지. 흐름이 막힌 곳·돌아볼 곳으로 말한다 | 템플릿 풀을 정역별로 나눠 구조로 막는다 |
| 반복 | 같은 결과 안에서 같은 템플릿 재사용 금지 | 결과 시드로 고른 다음 후보로 간다 |

- 템플릿 세트에는 `templateVersion`(예: `narrator-v1`)을 붙인다(§8).
- 검사는 단위 테스트로 한다. 템플릿 전수 × 슬롯 예시에 대해 길이·금지어·이모지를 검사한다. 구현 때 기존 테스트 위치 규칙을 따른다.

## 8. 화자 레이어

| 규칙 | 내용 |
|---|---|
| 원문 불변 | 엔진 해석문(`master-reading.mjs` 등)은 화자 레이어가 바꾸지 않는다. 화자는 앞뒤에 대사를 덧붙이기만 한다 |
| 저장 | 결과 저장 시 `{ original, narrator: { lines, expressions }, templateVersion, narratorId }`를 함께 저장한다 |
| 재열람 | 저장된 화자 대사를 그대로 보여 준다. 템플릿이 바뀌어도 다시 만들지 않는다. 유료 결과도 같다(CLAUDE.md 구매 기록 보존) |
| 옛 기록 | `narrator` 필드가 없는 기존 기록은 원문만 보여 준다. 소급 생성하지 않는다 |
| 유료 리포트 | 유료 LLM 본문에는 화자 레이어를 덧대지 않는다. 챕터 머리 인사 1줄만 템플릿으로 붙일 수 있다(N5) |
| 보관함 | 영냥이는 `/yeongnyangi/library/`, 꿀꿀은 `/records/`. 다른 계정 기록은 노출하지 않는다 |

## 9. 결정 (2026-11-20 승인) / 미확인

사용자 원문 2026-11-20: "권장안대로 승인, 구현 계획 진행해줘". 아래 "추천" 열을 확정값으로 쓴다.

| # | 항목 | 선택지 | 추천 | 이유 |
|---|---|---|---|---|
| N1 | 컷·말풍선·시트 모션 시간 | 레퍼런스 실측(550/500/280ms) / 토큰(120·220·380) | 토큰: 컷 380, 말풍선 220, 시트 220/380 | 리터럴 금지 정본(`design-canon.md:45`). 실측은 토큰 밖이다 |
| N2 | 글자 크기 기본값 | 요청 '크게' 기본 / 정본 17px 기본 | 기본 17px, 크게 19px | 정본 17px가 레퍼런스 15.5px보다 이미 크다 |
| N3 | 영냥이 무료 결과 말투 | 반말 / 해요체 변형 | 반말(정본 기본) | 정본 기본이 반말이고 변형은 선택이다 |
| N4 | 영냥이 moods 흰 바탕 | 아이보리 패널 / 투명 PNG 제작 | 아이보리 패널(제작 0) | 밤색 night 톤에서 흰 박스가 드러난다 |
| N5 | 유료 리포트 화자 인사 | 없음 / 챕터 머리 1줄 | 챕터 머리 1줄 | 원문 불변을 지키면서 화자 연결을 준다 |
| N6 | 걱정·설명(영냥이) 표정 제작 | 대체 사용 / 신규 제작 | 대체로 시작하고 제작은 후속 | 결과가 비지 않는 것이 먼저다 |
| N7 | 타이핑 효과 | 없음 / 컷당 600ms 상한 | 없음 | 정본은 읽기 지연을 금지한다. 레퍼런스에도 없다 |

미확인:
- 레퍼런스 실제 유료 리더의 글자 크기 토글 결과값: 결제·로그인이 필요해 미측정이다.
- 영냥이 moods를 `night` 톤에 합성한 실제 화면: 화면 미실측이다.
- 엔진의 "주의 카드" 플래그가 `master-reading.mjs`에 있는지: 이번에 확인하지 않았다. 없으면 카드 ID 목록을 고정한다.
- 기존 `daily-webtoon.ts` 대사가 §7-1 규칙(60자 등)을 지키는지: 검사하지 않았다.

## 부록 A. 무성 × 기본 자미두수 무료 결과 (2026-11-21)

- 적용 범위: 기본 자미두수 모달의 "연간 흐름 정밀 — 3개년 유년 리딩"과 "1년운 월별 운기"(`js/saju-engine.js`의 `zwMusungSay`). 서버 번들(`worker/lib/saju-section/runtime.generated.mjs`)이 같은 함수를 쓴다.
- 결정적 템플릿이다. LLM을 부르지 않는다. 표정(`composed·gentle·smile·thinking·verdict·sorry`)은 엔진 판정(유년 tone, 월 점수)에서 정해진다.
- 말풍선 규칙: 첫 문장은 합니다체 판결 80자 이하(`니다.`로 끝), 나머지는 해요체. 반말·애칭·원작 사연·공포·확정 예언 금지. 테스트 `__tests__/ui/ziwei-yearly-flow-dedupe.test.mjs`가 `musungRegisterDrift`로 지킨다.
- 중복 규칙: 같은 (궁, 사화)·쌍록/쌍기·올림포스 신탁은 한 번만 풀고 이후엔 앞 해를 가리킨다. 같은 문장·카드 간 6-gram 겹침은 같은 테스트가 막는다.
- 올림포스 상징(제우스=자미·화권, 헤르메스=천기·화기 서판, 데메테르=화록, 아폴론=화과)은 무성이 들려주는 서사다. 별도 화자를 두지 않는다.
- CSS: `styles/basic-fortune-library.css`의 `#ziweiModalOverlay .zw-musung-say*`. 모바일 17px·행간 1.8, 얼굴 이미지는 기존 `public/images/expert-characters/musung/` 재사용.
- 심화(`/ziwei/chart`)는 이번 범위 밖이다.
