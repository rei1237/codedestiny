# 달빛 연화당 참배 흐름 (moonlit lotus ritual)

`/moonlit-lotus/` 첫 화면을 "공간 탐색"에서 "한 번의 참배"로 바꾼 설계·운영 메모다. 계획 원문은 2026-11-22 승인 계획, 단계별 기록은 `docs/handoff/moonlit-ritual-2026-11-22.md`.

## 진입과 모드
- `app/moonlit-lotus/page.tsx` → `_ritual/MoonlitEntry.tsx` 가 마운트 뒤 모드를 고른다(`_ritual/mode.ts`).
  - `scene`·`activity`·`view` 파라미터나 `stay=1` 이 있으면 기존 Space(`Space.tsx`). 옛 딥링크·앱 오프라인 허용 목록(`?activity=bow` 등)이 그대로 동작한다.
  - 그 밖에는 RitualFlow. "둘러보기"는 `?stay=1` 로 Space 에 들어간다.
- 전체 비활성: `_lib/config.ts` 의 `MOONLIT_LOTUS_ENABLED`. 참배만 되돌리려면 `MoonlitEntry` 분기를 Space 고정으로 바꾼다.

## 상태기계
- 참배(`_ritual/ritual-machine.ts`, 순수 reducer): `enter → breathe(4-4-6 호흡 3회) → incense(1.5초 길게 누르기) → bow(삼배 3회) → wish(연등 소원) → dedication(회향)`.
  - 건너뛰기는 enter·dedication·완료 직후를 뺀 단계에서. 빠르게(`fast`)는 시간 배율 0.5.
  - 완료 뒤 다음 단계까지 incense 1.0초·bow 1.4초·wish 1.8초(배율 적용).
- 길동무(`_ritual/companion-machine.ts`, 순수): `idle·greet·guide·breathe·bow·pray·bless·react·rest`. 단계가 기본 상태를 정하고, 탭은 `react`(1.4초), 입력 없이 30초면 `rest`. 포즈 매핑은 `companion-pose.ts`, 연이는 2D 클립, 다른 길동무는 정적 그림+CSS.
- 장면 연출(`_fx/scene-fx.ts`): rAF 캔버스 하나(반딧불·물결·향 연기). 숨김 탭·화면 밖·움직임 줄이기면 멈춘다(`data-running`).
  - 품질 단계: `deviceMemory≤4` 또는 `hardwareConcurrency≤4` 면 처음부터 low, 아니면 처음 2초 프레임 간격을 재서 34ms 초과가 25% 넘거나 평균 45fps 미만이면 low.
  - low 는 반딧불 12개·캔버스 배율 1·달무리와 오른쪽 등 레이어 생략·등/후광 애니메이션 정지.

## 접근성
- 움직임 줄이기: 카메라 이동(패럴랙스)·입자·타이핑·떠오름은 끄고, 단계 페이드·숨쉬기 빛·길동무 숨쉬기는 남긴다. main 이 `space.page` 를 같이 써서 `space.module.css` 의 `.page * { animation/transition:none!important }` 를 받으므로, 남길 움직임은 `ritual.module.css`·`companion.module.css` 의 reduce 블록에서 더 구체적인 `!important` 로 되살린다.
- 키보드: 모든 손짓에 Enter/Space 대안이 있다(향은 Enter 길게 누르기 + "한 번 눌러 밝히기" 버튼, 연등은 버튼). 절 버튼은 절하는 동안 `aria-disabled` 라 초점이 남는다. 단계가 바뀌어 초점이 body 로 떨어질 때만 새 단계 패널(`tabIndex=-1`, 테두리 없음)로 옮긴다. 입력칸에는 자동 초점을 주지 않는다(휴대폰 자판).
- 말풍선은 다시 마운트하지 않고, 화면 밖 `aria-live="polite"` 문장이 전체 대사를 한 번에 읽힌다.
- 터치 대상: 모든 단계·음악 시트에서 44px 미만 0개(390×844, 844×390 실측).

## 오디오 (`_audio/`)
- 엔진 하나: BGM 2채널 크로스페이드, 효과음 `<audio>` 풀, 효과음 동안 BGM 을 약 40%로 낮췄다 0.8초 뒤 복귀(ducking). Web Audio 를 media element 에 붙이지 않는다(`music.code-destiny.com` CORS 변경은 승인 항목).
- 선호는 `localStorage['cd:moonlit-music:v1']`(auto·muted·volume·trackId·sfx). 자동재생이 막히면 `blocked` 로 남고 "소리 켜기" 버튼과 입장 탭이 다시 튼다. 숨김 탭에서 멈췄다가 돌아오면 이어서, 다른 탭·Space MusicPlayer 와는 BroadcastChannel 로 서로 멈춘다.
- 효과음(`SFX_SOURCES`): 목탁 `audio-v1/mokugyo.mp3`(삼배 한 번 끝날 때마다), 범종 `audio-v3/bell.mp3`(회향 진입), 풍경 `audio-v3/windchime.mp3`(입장 탭 + 마당 단계 breathe·incense 동안 14–24초 간격, 숨김 탭이면 쉼), 불붙기 `audio-v3/ignite.mp3`(향 완료), 연등 `audio-v3/lantern.mp3`(소원 완료). audio-v3 은 직접 합성(CC0, `scripts/synth-moonlit-sfx.mjs`, manifest).
  - 효과음은 전부 입장 탭(사용자 제스처) 뒤에만 난다 — 참배는 늘 enter 에서 시작하고 enter 에는 건너뛰기가 없다. 미니 플레이어의 효과음 끔(`sfx:false`)을 따르고, 새 자동재생은 없다.

## 단계별 장면 (`_ritual/ritual-views.ts`, `RitualBackdrop.tsx`)
- 단계마다 다른 시점의 그림으로 걸어 들어간다: enter 일주문(`ritual-v1/gate`) → breathe 안마당 정면 → incense 안마당 오른편 + 향로 소품 → bow 법당 안 → wish 연못 왼편 + 연등 소품 → dedication 범종각(`ritual-v1/bell`). 재사용 장면은 `views-v1`·`space-v1` WebP, 새 장면 2개만 AVIF source 를 먼저 둔다. 세로 ≤700px 768×1152, 가로 `(min-width:701px)` 1536×1024.
- 전환: 두 겹(leave/enter) 크로스페이드 450ms + 카메라 transform 700ms(`RITUAL_MOVES`: walkIn·right·inside·left·up). 저사양(`stage[data-fx-tier=low]`)·움직임 줄이기는 transform 없이 300ms 디졸브. 지나간 겹은 750ms 뒤 내린다.
- 프리로드: 단계 진입 400ms 뒤 숨은 1px `<picture>`(display:none 아님)로 **다음 단계 그림 한 장**(브라우저가 화면에 맞는 source 하나만 받음) + 그 단계 소품만. 설계의 `new Image().decode()` 대신 picture 를 써서 방향별 source 선택을 브라우저에 맡겼다.
- 새 그림을 못 받으면(`img error`) 마지막으로 보인 그림을 전환 없이 그대로 둔다.
- 배경은 장식(`aria-hidden`, `alt=""`). 향로 소품만 대체 텍스트(`moonlitRitual.props.incenseBurner`)가 있고, 연등 그림 두 장(꺼짐·켜짐)은 바깥 `role="img"`·`wish.lantern` 이름을 그대로 쓴다.
- 향로는 캐릭터 **왼편** 바닥에 둔다. 무대 오른쪽 아래는 음악 버튼(44px, 자동재생이 막히면 더 넓은 "소리 켜기" 알약) 자리라 오른편에 두면 휴대폰에서 가려진다(2026-11-24 실측).
- 가로 화면 회향에서는 범종각 계단이 오른쪽(x56–76%)이라 길동무를 왼쪽으로 옮긴다(`.figure` translate).
- 예산 가드: `__tests__/ui/moonlit-ritual-views.test.mjs` (새 장면 768 ≤220KB·1536 ≤350KB, 재사용 ≤300/500KB, 소품 ≤80KB, manifest bytes 일치).

## 저장
- IndexedDB `cd-moonlit-private-v1` 의 `records` 에만 쓴다: 삼배 1건(`kind:'bow', completed:3, target:3`), 소원 1건(`kind:'prayer'`). 범위는 Space 와 같은 `profile.scope`.
- `sessions`(108배 진행 세션)는 읽지도 쓰지도 않는다. `bow-session.ts` 는 수정 금지.
- 기존 기록은 Space "기도 수첩"(`?activity=records`)에 그대로 보인다. 서버 전송·LLM·운세 엔진 호출 없음.

## 문구
- `moonlitRitual` 100키. 저작본 `i18n/authored/moonlitRitual-0{1,2,3,4}.json` → `node scripts/i18n-merge-authored.mjs --namespace moonlitRitual` → `public/i18n/<lang>/moonlitRitual.json`(커밋 대상).
- ko·ja·zh-CN·zh-TW 는 직접 저작, 나머지 7개 로케일은 영어 복사. ko 는 `use-ritual-t.ts` 가 정적 import 한다(`useT` 가 ko 를 비우기 때문).

## 에셋
- 만든 것(2026-11-22~24, `docs/handoff/moonlit-assets-2026-11-22.md`): 효과음 4종 `audio-v3/`, 장면 gate·bell `ritual-v1/`(webp+avif, 768·1536), 소품 향로·연등 꺼짐/켜짐 `ritual-v1/prop-*.webp`.
- 아직 없는 것(목록만): 연이 포즈 — 올려다보기(연등 시선), 향을 바라보며 합장, 축원(두 손 펴서 건네기), 호흡 들숨·날숨 2컷. 다른 14종의 표정 시트(깜빡임·인사·기쁨). 장면 레이어 분리(밤하늘·산·법당·연못 수면) — 지금 카메라는 한 장 그림의 scale/translate 근사다.

## 알려진 위험
- 품질 판정은 처음 2초 한 번뿐이다. 그 뒤 느려져도 low 로 내려가지 않는다. 개발 서버에서는 컴파일 롱태스크로 결과가 흔들린다(CPU 4배 감속 실측에서 high·low 둘 다 나옴).
- 삼배 중 길동무 그림 뒤에 사각 바탕이 비친다(기존 Character 기도 포즈 그림의 바탕, 이 작업 범위 밖).
- 가로 화면에서 쿠키 동의 배너가 첫 화면 버튼을 덮을 수 있다(기존 배너, 범위 밖).
- gate-768 과 gate-1536 은 세부가 다르다(등 위치·기둥 연꽃·용마루 장식). 세로·가로가 동시에 보이지 않아 허용했다. bell 두 장은 다른 장면보다 채도가 약간 높다.
- 재사용 가로 그림 `space-v1/courtyard-1536`(468KB)·`hall-1536`(401KB)은 새 장면 예산(350KB)보다 크다. 기존 에셋이라 재인코딩하지 않았다.
- 회향 범종각 그림의 달이 360·390·844 에서는 말풍선 뒤에 거의 다 가리고 1440 에서만 보인다. 844 삼배는 법당 불상이 말풍선 뒤다(변경 전에도 같은 `hall-1536`). 세로 크롭 여유가 수십 px 라 `object-position` 으로는 못 옮긴다 — 그림 구도나 말풍선 위치를 바꾸는 후속 과제(2026-11-24 실측).
