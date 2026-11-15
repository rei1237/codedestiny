# 연이의 작은 쉼표 — 달빛 연화당 15컷 웹툰

2026-11-15 사용자 승인: “좋아, 이 수정안으로 15컷 웹툰 제작해줘. 연이는 공식 프로필 시트처럼 동글동글하고 귀엽게, 법당은 따뜻하고 몰입감 있게 표현해주고 모바일에서 읽기 좋게 구현한 뒤 검수해서 운영 반영해줘.” 추가 승인: 장소 이동 시 자연스러운 연이 걷기.

## Direction contract

- THESIS: 열심히 일하던 연이가 지난 시간을 돌아보고 자기 마음을 쉬게 하는 이야기. 기능 목록을 만화로 바꾸지 않는다.
- OWN-WORLD: 공식 연분홍 연이·분홍 연꽃·보라색 스카프, 달빛 예화의 종이와 꽃빛, 주아 제목·Pretendard 설명. 따뜻한 법당과 혼자만의 방석.
- STORY: 바쁨 → 회상 → 나를 인정함 → 법당 → 명상·절·확언 → 작은 내일의 심상화 → 쉼.
- FIRST VIEWPORT: 작은 돌아가기 링크, 제목, 첫 그림. 광고·고정 패널 없이 그림과 대사로 이어진다. 마지막에 입장 행동.
- FORM: 승인된 세로 15컷, 별도 HTML 대사와 대체 설명. 기존 세계관의 확장, 새 디자인 선정 없음.
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. 기존 DESIGN.md를 상속한다.

## 코드·연결

- `/moonlit-lotus/story/`: 15개 figure + figcaption, 한국어 고정, noindex/follow false. 사찰의 기존 색인 정책을 유지하며 사이트맵에 추가하지 않는다.
- `story.ts`: 제목·컷별 장면 설명·서술·대사의 정본. 그림 속 글자는 생성하지 않아 확대와 화면 낭독이 가능하다.
- 홈 기존 입장 링크를 유지하고 별도 웹툰 읽기 링크 추가. 법당 footer에서도 접근한다. 마지막 CTA는 기존 `/moonlit-lotus/`로 이동한다.
- 아래 컷은 lazy, 첫 그림만 eager/high. 자동 스크롤·자동 오디오·읽기 완료 저장 없음.
- 캐릭터 선택·108배 카운터·개인 기록·음악·결제·인증·API·DB는 변경하지 않는다.

## 그림 출처와 갱신

내장 image_gen 사용. 최우선 참조 `D:/CodeDestiny-Build/연이 프로필1.png` (저장소 공식 시트 유지). 웹툰 원본 시트 5장(각 3컷)은 `D:/CodeDestiny-Build/moonlit-lotus/story-v1/sheet-1.png`~`sheet-5.png`. 변경하지 않은 원본도 Codex generated_images에 남아 있다. 서비스 스프라이트·기존 3D 제작 원본은 덮어쓰지 않았다.

공통 프롬프트: illustration-story, 3 equal horizontal panels stacked portrait 2:3, full bleed/no gutters/no text. Official ultra round pale pink pig Yeoni, huge round head/brown eyes/drooping ears/short chubby limbs/pink lotus viewer-left/purple scarf only. Premium Korean 2D watercolor picturebook, fine rose outlines. 정확한 캐릭터 시트와 앞선 시트를 참조한다.

시트별 추가 프롬프트:
1. 아침 책상에서 스카프 매만짐 → 저녁까지 노트북 작업·미룬 식사 → 밤 의자에 기댐·식은 차.
2. 예전 연꽃 사진을 휴대폰으로 봄 → 첫 일·실수·다시 시작의 기억 몽타주 → 휴대폰을 가슴에 안고 자신을 인정함.
3. 잠자리의 할 일 생각 → 휴대폰 속 온라인 사찰 발견 → 따뜻한 문을 지나 홀로 입장.
4. 꽃돼지 불상과 연꽃 등불이 있는 한국식 법당 → 방석과 생각 풍선 → 무릎·손을 바닥에 지지한 큰절. 얼굴·연꽃 바닥 관통 방지.
5. 수첩 옆에서 자기 배를 안는 확언 → 내일 아침 꽃을 보며 차 마시는 상상 → 현실의 잠자리, 수첩은 남겨 둠.

생성 식별자(순서): 636941f0-1999-49e6-b63a-5a49cd88eed1, 560c7ccc-38a3-484b-86d2-86434bb34249, eeefc60c-86dd-4870-99bf-f4ddc4d856d5, b9923e22-a66f-4d3c-b2e8-fac6e20cf120, 05570fa3-a384-4b4b-a1cb-12fd14c06fbd.

각 시트를 정확히 3등분하여 1024×512·640×320 WebP quality86으로 출력한다. 경로 `public/assets/moonlit-lotus/story-v1/cut-NN-WIDTH.webp`. 30파일 합계 3,125,506 bytes, 640px 15장 합계 956,326 bytes. 원본 재생성은 그림 제작이므로 같은 프롬프트라도 동일 픽셀을 보장하지 않는다. 새 버전 폴더로 교체하고 컷 순서·대사를 대조한다.

## 걷기 규약

`WalkingYeoni.tsx`, `yeoni/2d-v2/walk.webp`(새 파일): 참조 기반 4×4 16프레임 in-place 걷기. 원본 생성 ID 21b122ab-2fa1-4b21-bc37-72e9bbda7699. 프롬프트는 고정 3/4 오른쪽 시점, 동일 체형, 짧은 팔다리의 교대 스텝, 작은 팔 흔들림, 투명 배경, 글자·소품 없음. 프레임을 alpha trim 후 최대340px, 384px 셀의 발바닥 y354에 맞춰 재배치. atlas1536×1536.

장소 이동은 2.4초 출발/도착 두 구간. 거리의 smoothstep과 프레임 인덱스를 동일 진행값에서 계산한다. 배경은 중간에 교체, URL은 도착 때 한 번만 추가. 프레임별 생성 그림이므로 물리적 보행/IK가 아니며 실사 접지 보장은 하지 않는다. 연이만 걷기 사용, 영냥이와 사용자 아바타는 기존 동작 보존. 모션 감소·경량 모드에서는 즉시 이동. 중복 클릭/다른 활동/뒤로 가기/언마운트는 이전 RAF 정리. 탭 숨김·디코딩 실패 시 도착으로 정리하며 절 카운터와 무관하다.

## 검수와 전달

Chromium mock 화면 360×740·390×844·430×932·1365×900: 가로 넘침 없음, 15/15 그림 decode, 모바일 본문17px/데스크톱18px. 캡처·수치 `D:/CodeDestiny-Build/moonlit-lotus/story-v1/`. 실기기 Android/iOS/WebView 미검증(이전 연결 검사 기기 없음).

독립 visual_checker: 15컷 전체의 연이 일관성·모바일 대사·컷 여백·절 자세 접촉·마지막 버튼을 확인했고 필수 수정 결함 없음. 브라우저에서는 걷기 도착 hall/URL 동기화, 빠른 연속 선택 후 courtyard 정착, 모션 감소 시 즉시 hall 이동, 이미지 차단 요청 후 15개 figcaption 및 CTA 보존, 마지막 CTA로 실제 공간 진입을 관찰했다. 이미지 실패 관찰은 자연폭0까지 판정하지 않았으므로 전체 로딩 오류 검증으로 확대하지 않는다.

추가 모바일 걷기/200% 글자 검수는 개발 서버 탐색·평가 시간 초과로 미완료. 이전 200% 관찰의 viewport가1892px였으므로 모바일 확대 통과로 기록하지 않는다. 자동 검사와 별개로 물리적 발 미끄러짐을 프레임별 계측한 것은 아니며, 화면 낭독기 실제 음성 출력도 미검증이다.

이 문서의 2026-11-15 승인으로 이전 `moonlit-lotus-immersive.md`의 “웹툰 미제작·이번 운영 재배포 미실행” 시점 이후 작업을 진행한다. 기존 승인된 UI 개선도 이번 릴리스 대상에 포함한다.

`npm run check:fast -- --plan`의 standard 계획대로 `npm run check:fast` 종료0. 문법(기존 img 경고2개)·타입·사이트맵·node5099건·smoke Jest115건/Node47건 통과. 관련 Jest import 의존 검사 대상 없음. 별도 문서 신선도·impeccable detect·diff 공백 검사 통과. 자동 검사만으로 실기기나 보행 접지 품질을 검증했다고 표현하지 않는다.

롤백: 웹툰/걷기 커밋만 revert하고 표준 릴리스. 기존 UI 개선 커밋45232037e와 분리한다. 전체 공간은 기존 MOONLIT_LOTUS_ENABLED로 비활성화 가능. 사용자 기록·저장 형식 변경 없음.
