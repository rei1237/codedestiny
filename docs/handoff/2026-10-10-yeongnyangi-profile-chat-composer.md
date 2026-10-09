---
status: active
updated: 2026-10-10
next: 1단계(선행 조건 확인)부터. plan 모드로 설계 확정 → 구현 → QA·캡처 → 문서
---

# 영냥이 상담 준비 — 프로필 입력을 메신저 하단 입력창으로 통일 (2026-10-10)

2026-10-10 세션에서 질문 단계(question·situation·options·constraints·period)의 답장 영역을 메신저형으로 바꿨다. 같은 대화의 **프로필 만들기 단계**는 아직 예전 폼 모양이다. 이 작업은 그 단계를 같은 입력창으로 맞추는 일이다.

## 사용자 결정 (재확인하지 말 것)

- 프로필 입력(이름·성별·생년월일+달력·태어난 시간·출생지)은 **대화 중간이 아니라 화면 하단 입력창**에서 받는다. 질문 단계와 같은 알약형 입력 바와 원형 전송 버튼을 쓴다.
- 프로필 입력 중에는 IntakeChat 하단의 "선택 확인하고 계속하기"를 숨긴다. 화면에는 전송 버튼이 하나만 보여야 한다.
- Enter 규칙은 질문 단계와 같다.
  - 데스크톱은 Enter로 전송한다.
  - 한글 조합 중에는 전송하지 않는다.
  - `<input>`은 한 줄 입력이라 터치 기기에서도 Enter(이동/완료)로 전송된다. 이 동작은 허용한다.
- 단축키 안내 문구와 글자 수 상시 표시는 화면에 두지 않는다.

## 선행 조건 — 답장 입력창 개편이 아직 커밋되지 않았다

이 작업은 2026-10-10 개편 위에서 진행해야 한다. 그 개편은 main 작업본에 **미커밋** 상태로 남아 있다.

`git status --short`에서 다음 5개 파일이 `M`이어야 한다.

- `app/yeongnyangi/_components/IntakeChat.tsx`
- `app/yeongnyangi/_components/intake-chat.module.css`
- `scripts/qa/verify-yeongnyangi-intake.mjs`
- `DESIGN.md` (영냥이 대화형 상담 준비 절의 Enter 규칙 문단)
- `.impeccable/surfaces/yeongnyangi-intake-chat.md`

상황별로 이렇게 처리한다.

- **파일이 이미 커밋돼 있으면** 그대로 진행한다. `git log --oneline -5 -- app/yeongnyangi/_components/IntakeChat.tsx`로 확인한다.
- **미커밋이면** 사용자에게 먼저 커밋할지 묻는다. 이 문서도 함께 커밋할 대상이다.
- **변경이 사라졌으면** 진행하지 말고 사용자에게 알린다.

개편 내용은 다음과 같다.

- `IntakeChat`에 알약형 `.inputBar`, 원형 `.sendIcon`, 가로 `.chips` 칩 줄, 80% 이상일 때만 보이는 `.count`를 추가했다.
- `pointer: coarse`이면 `touch` state로 Enter 동작을 나눈다.
- `field` ref와 `focusNext`로 전송 뒤에도 포커스를 유지한다.
- 전송 버튼의 `onPointerDown`에서 `preventDefault`를 호출해 키보드가 닫히지 않게 했다.
- 위로 스크롤했을 때만 떠 있는 `.latest` 버튼(`atBottom` state)을 둔다.
- 입력 중 점 세 개(`typing`, 600ms)와 `ynRise` 등장 애니메이션을 넣었다. 둘 다 모션 줄이기 설정에서는 생략한다.
- 지난 말풍선에 아바타를 붙인 `.cat` 구조를 쓴다.

## 지금 상태 (모바일 390px 캡처로 확인)

호출 경로는 다음과 같다.

`Consultation.tsx:267`의 preparation `profile` → `ProfilePicker`(conversational) → "새 프로필 만들기" → `ProfileForm`(conversational) → `ProfileChatFields`

문제는 다음과 같다.

1. **입력 위치와 색.** 입력칸과 보라색 "답장 보내기" 버튼이 대화 영역(`.preparation`) 안에 있다. `profiles.module.css`의 `.profileForm` 보라 팔레트(#7541ad, #201629)가 `--yn-*` 밤 팔레트와 다르다.
2. **전송 버튼이 두 개.** 하단 답장 영역에는 IntakeChat의 "선택 확인하고 계속하기"가 같이 떠 있어 전송 버튼이 둘로 보인다.
3. **자동 스크롤 없음.** 한 필드를 보낸 뒤 다음 질문 입력칸이 화면 아래로 밀린다. IntakeChat은 `active` 단계가 바뀔 때만 스크롤하는데, 프로필 필드 전환으로는 `active`가 바뀌지 않는다.
4. **말풍선 구조 차이.** `ProfileChatFields`의 지난 답변 말풍선에는 아바타(`.cat`)가 없다. "이전 답변" 버튼이 따로 있어 '수정'과 기능이 겹친다.
5. **원시 폼 컨트롤.** 성별과 달력은 `<select>`, 시간은 체크박스가 그대로 노출된다.

## 구현 방향 (권장안 — plan 모드에서 코드 확인 후 확정)

### 하단 슬롯

- IntakeChat이 답장 영역 안에 슬롯 요소를 만들고, 컨텍스트로 내려 준다. 예: `IntakeComposerContext = {slot: HTMLElement|null, follow(): void}`.
- `ProfileChatFields`는 **현재 필드의 입력 UI만** `createPortal`로 이 슬롯에 그린다.
- 포털이 차 있는 동안 IntakeChat은 기본 버튼을 숨긴다. 등록 방식은 ProfileChatFields가 마운트할 때 컨텍스트로 알리거나, 슬롯의 `childElementCount`를 보는 방법 중 하나를 고른다.

### 폼 연결

- `save()`는 `new FormData(event.currentTarget)`를 쓴다.
- 포털로 `<form>` 밖에 나간 입력도 `form="<formId>"` 속성을 주면 FormData에 포함된다.
- 그래서 저장, 지오코딩, `profileId`, 401 처리 로직은 그대로 둔다.
- `submit()`의 `form.current.querySelector('[data-active]')` 검증은 슬롯 쪽을 찾도록 바꾼다.

### 필드별 하단 UI

| 필드 | 입력 바 | 칩 줄 |
|---|---|---|
| 이름 | `<input name=name maxLength=40 autoComplete=nickname>` | – |
| 성별 | 바 없이 칩 + 전송(또는 칩 선택 후 원형 전송) | 여성 / 남성 (`aria-pressed`, `<input type=hidden name=gender>`) |
| 생년월일 | `birthDateTextInputProps` 입력 | 양력 / 음력 / 윤달 (`name=calendar` hidden) |
| 태어난 시간 | `<input type=time name=time>` | "태어난 시간을 몰라"(토글, 켜면 time 비활성) + `unknownHint`는 작은 보조 문구 |
| 출생지 | `<input name=place>`(선택 입력) | "현재 위치 가져오기"(`CurrentLocationButton` 재사용, 스타일만 칩에 맞춤) + `placeHint` |

- `ProfileForm.tsx:46-52`의 `fields`는 지금 JSX `content`다. 하단 UI를 그리기 쉽게 **conversational 전용 필드 사양**을 추가한다. `{kind:'text'|'choice'|'date'|'time'|'place', ...}`처럼 두는 방식을 권장한다.
- **대화형이 아닌 기존 폼 경로(`conversational=false`)는 바꾸지 않는다.** `verify-yeongnyangi-profiles-ui.mjs`, `scripts/lib/yeongnyangi-mobile-payment.mjs`, `verify-profile-*.mjs`가 이 경로를 쓴다.

### 버튼과 오류

- 마지막 단계의 원형 전송 버튼은 접근 이름을 `saveLabel`("프로필 저장하기", 저장 중 "저장하고 있어요" 등)로 유지한다. QA와 결제 스크립트가 이 이름으로 찾는다.
- 오류(`role="alert"`)는 입력 바 위에 보인다.
- 저장에 실패하면 입력값이 남아 있어야 한다. 기존 QA가 이 동작을 검사한다.

### 대화 영역

- `ProfileChatFields`의 지난 답변도 `.cat`(36px 아바타 + `.catBubble`)과 `.reply` + '수정' 구조로 맞춘다.
- "이전 답변" 버튼은 없애고, 헤더 뒤로가기나 '수정'으로 대신한다.
- 필드가 바뀔 때 컨텍스트의 `follow()`로 대화 영역을 맨 아래로 스크롤한다.
- 입력 중 표시를 재사용할지는 선택 사항이다. 넣는다면 모션 줄이기 설정에서는 생략해야 한다.

### 공통화

- 입력 바와 원형 버튼 마크업을 작은 컴포넌트로 뽑아 IntakeChat과 ProfileChatFields가 같이 쓰게 한다. 예: `_components/ChatInputBar.tsx`.
- CSS는 이미 `intake-chat.module.css`에 있다(`.inputBar`, `.sendIcon`, `.chips`, `.count`).

## 순서

1. 선행 조건을 확인한다(위 절).
2. plan 모드에서 다음 파일을 읽고 위 권장안을 확정한다.
   - `ProfileChatFields.tsx`, `ProfileForm.tsx`, `ProfilePicker.tsx`
   - `IntakeChat.tsx`
   - `Consultation.tsx:260-295`
   - `CurrentLocationButton.tsx`, `profiles.module.css`
3. 구현한다.
4. QA 스크립트를 갱신하고 실행한다.
   - `scripts/qa/verify-yeongnyangi-intake.mjs` 150~165행의 프로필 흐름은 지금 `chat.locator('form')` 안에서 입력과 버튼을 찾는다. 포털로 옮긴 뒤에는 `chat` 기준으로 찾도록 고친다.
   - 다음 검사는 유지한다: 저장 오류 후 이름 값 유지, 재시도 시 같은 `profileId`, 두 번의 POST.
   - 새 검사를 추가한다: 프로필 입력 중 "선택 확인하고 계속하기"가 숨겨짐, 데스크톱 Enter로 다음 필드 이동, 필드가 바뀐 뒤 대화 영역이 맨 아래인지.
5. 회귀를 확인한다. 기존 프로필 폼 경로가 그대로여야 한다.
   - `node scripts/verify-yeongnyangi-profiles-ui.mjs`
   - `node --test __tests__/ui/yeongnyangi-intake-chat.test.mjs`
   - `npx eslint --quiet app/yeongnyangi/_components/`
   - `npx tsc --noEmit`
6. 캡처로 확인한다.
   - 데스크톱 1000×760에서 확인한다.
   - 390×844는 `hasTouch`를 켜고 확인한다.
   - 390×520에서는 원형 전송 버튼이 화면 안에 있는지 확인한다.
   - 각 필드(칩·시간 모름·현재 위치 버튼), 저장 오류 상태도 찍는다.
   - 촬영 스크립트는 `verify-yeongnyangi-intake.mjs` 상단의 esbuild·서버 fixture를 복사해 임시 폴더에서 돌린다. `reducedMotion:'no-preference'`로 바꾸면 애니메이션도 볼 수 있다. 스크립트는 커밋하지 않는다.
7. 문서를 갱신한다.
   - `DESIGN.md`의 "영냥이 대화형 상담 준비" 절에 프로필 입력도 하단 입력창으로 받는다는 규칙을 추가한다.
   - `.impeccable/surfaces/yeongnyangi-intake-chat.md`에 개편 내용과 미검증 범위를 적는다. 실기기 키보드는 아직 확인하지 않은 범위다.
   - 이 문서의 status를 `done`으로 바꾼다.

## 주의

- 실결제·실 LLM·운영 DB 쓰기는 하지 않는다. QA는 모의 fixture로만 돌린다.
- `birthDateTextInputProps`의 `data-cd-birth-date` 표식은 유지한다. CSS 선택자와 전수 가드가 이 표식을 본다.
- 입력 글자는 16px 이상, 버튼은 최소 44px, 포커스는 금빛 표시를 유지한다. 모두 `DESIGN.md` 규칙이다.
- 다른 세션의 미추적 파일은 커밋하지 않는다: `.claude/skills/fire-your-seo-agency/`, `docs/handoff/destiny-flower-dawn-garden-2026-10-10.md`.
- main에는 다른 세션의 커밋이 계속 올라온다. 커밋 전에 `git status`로 이 작업 파일만 스테이징한다.
