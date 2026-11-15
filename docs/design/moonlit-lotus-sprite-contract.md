# 달빛 연화당 — 연이 2D 스프라이트 계약

## 사용자 결정 · 2026-11-15

초기 3D와 툰 3D 모델은 사용자 검수에서 거절됐다. 최신 지시 **“차라리 스프라이트 시트로 2D로 귀엽게 구현 … 명상, 108배, 인사 등 다양한 표정 … 절도 2D로 귀엽고 동글동글하게”**를 따른다. 3D 산출물을 완성품으로 전달하지 않는다. 이번 변경에서는 Three.js 의존성도 추가하지 않는다.

연이를 먼저 완성하고 영냥이는 다음 단계라는 사용자 답변을 유지한다. 후속 영냥이 정본은 `D:/CodeDestiny-Build/양냥이 프로필 시트.webp`, 이름표는 제외, 네오=영냥이. 이번 코드는 기존 프로필·캐릭터 선택을 바꾸지 않는다.

## 외형과 제작

- 정본: `D:/CodeDestiny-Build/연이 프로필1.png`. 저장소 `docs/design/character-references/yeoni-profile-v1.png`와 동일한 SHA-256: `4b7b01cc92a8ea66dbc6234630df46b7238c9a383eff0fe6064c2b59546b0425`.
- 원본의 둥근 큰 머리와 볼, 짧고 통통한 팔다리·배, 작은 코, 갈색 눈, 처진 귀, 머리의 분홍 연꽃, 보라색 스카프, 작은 발굽·말린 꼬리를 보존한 손그림풍 2D다.
- 내장 ImageGen으로 참조 기반 시트 2장 생성. 외부 유료 API·CLI 호출 없음. 원본 PNG는 `D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v1/expressions-source.png`, `bow-source.png`. 픽셀 편집 가능한 원본이며 레이어 분리 PSD는 아니다.
- 프롬프트: `scripts/sprites/prompts.md`. 후처리: `node scripts/sprites/prepare-yeoni.mjs <원본 PNG 폴더>`.
- 원본 생성 시트는 각각 1448×1086, 4열×3행. 알파를 보존하면서 셀을 추출하고 가로 중심·발 기준선을 맞춘다. 자세가 낮아졌다고 캐릭터를 확대하지 않는다.
- 런타임 시트는 각각 1536×1152 WebP, 셀 384×384, 기준선 y=354. 모든 시트의 RGB 바깥 노이즈는 투명 알파 아래이며 브라우저에 표시되지 않는다. 합성 배경에서 실제 윤곽을 검수한다.
- 원본과 생성 그림의 작은 획·꽃잎·얼굴 각도 차이는 있다. 자동 보간한 고프레임 영상이 아니라 그려진 키 포즈를 교체하는 2D 동작이다.

## 자산·화면

`public/assets/moonlit-lotus/yeoni/2d-v1/`: `expressions.webp`, `bow.webp`, `still.webp`, `reference.webp`, `manifest.json`.

기존에 승인한 독립 주소 `/moonlit-lotus/model-review/`를 유지하고 내용은 2D로 교체한다. 제목은 “연이와 쉬어가는 시간”. 홈 진입 링크 없음. `noindex, nofollow`와 색인 원장 제외이며 접근 인증을 의미하지 않는다.

검수 화면은 Experience 모드: 연이를 크게 보여주고 표정·인사·명상·온라인 108배를 선택한다. 원본 및 시트 다운로드는 접힌 비교 패널에 둔다. 크림·연분홍 바탕과 스카프 계열 보라색 조작부, 기존 서비스 폰트를 사용한다. 모바일에서는 그림 아래에 조작부가 온다.

CSS 배경 위치로 프레임을 표시하므로 WebGL·3D 엔진이 필요 없다. 알파와 고정 셀 크기로 레이아웃을 유지한다. 오류 시 정지 이미지와 다시 불러오기, 진행 UI를 남긴다. 모션 감소에서는 정지 그림과 같은 세션의 진행 표시를 사용한다. 화면이 비활성이면 동작을 멈춘다.

## 프레임 계약

표정 시트(0부터): 0 다정한 대기, 1 눈 감기, 2 활짝 웃음, 3 놀람, 4·5 손 인사, 6 공감, 7 기쁜 합장, 8·9 명상 호흡, 10 눈 뜬 휴식, 11 앉아 합장.

큰절 시트: 0 서서 합장, 1 준비, 2 몸 낮추기, 3 무릎 꿇기, 4 손 내리기, 5 바닥 지지, 6 상체 낮추기, 7·8 최저 자세, 9 회복, 10 무릎 합장, 11 기립. 런타임은 **0→1→2→3→4→5→6→7→8→7→6→5→4→3→2→1→0**으로 되돌아온다. 역순 복귀를 사용해 끝에서 얼굴·크기가 달라지는 것을 막는다. 마지막 기립 프레임 유지까지 기본 10.3초. `bow-session.ts`의 `BOW_FRAMES`·`FRAME_MS`가 시간 정본이다.

## 온라인 큰절 세션

`Session`: sessionId, status(ready/running/paused/complete/stopped), target(9/27/108), completed, cycleIndex, elapsed(ms), speed, pendingSpeed.

- 상태 시간축 하나로 그림 프레임과 진행 UI를 계산한다. 타이머 호출 횟수·렌더 횟수·클릭 횟수·음악 시간으로 집계하지 않는다.
- `finishCycle(sessionId, cycleIndex)`는 마지막 기립 프레임까지 완료된 경우에만 1회 기록한다. 오래된 세션·중복 인덱스는 거부한다. 목표 달성 시 complete로 바뀌고 다음 스케줄은 정리한다.
- 일시정지/재개는 elapsed를 보존한다. 비활성 탭에서는 자동 일시정지하며 자동 재개하지 않는다. 250ms 초과의 시간 공백을 몰아서 반영하지 않는다.
- `cd:moonlit-lotus:yeoni-bow:v1` localStorage에는 완료 횟수만 저장. 새로고침 시 미완료 동작은 elapsed=0, paused로 복원. 저장 실패 시 안내한다. 다른 서비스 저장 키는 읽거나 쓰지 않는다.
- 속도 0.75/1/1.25, 진행 중 변경은 다음 동작 경계에 적용한다. 카운터는 이용자의 신체 움직임을 측정하지 않는다.

## 후속 재사용 조사와 경계

- 명상 음악: `app/diary/_lib/meditation-tracks.ts`의 23곡, `meditation-<순번>` ID, `music.code-destiny.com/Meditation/` URL 규칙. 순번 ID를 재정렬하지 않는다.
- 오디오: `app/diary/_components/DiaryAudioProvider.tsx`. 일기 저장 책임과 분리 검토 후 연결한다.
- 확언: `DiaryMindTrainingSheet.tsx`, `_lib/mind-training-pool`, `_lib/entry-writes`.
- 오늘의 운세: `app/diary/_lib/today-snapshot.ts` → `lib/diary/fortune-adapter.ts`, `/today/` 진입점.
- 기존 108배 구현은 조사한 `app components lib js src`에서 발견하지 못했다. 이번 세션은 독립 구현이며 기존 API가 있다고 가정하지 않는다.
- 후속 선택 우선순위: 수동 선택 → 여성 연이/남성 영냥이 → 성별 없으면 간단 선택. 성별 강제 입력 없음.
- 산사 실제 브라우저 조사: 활동 메뉴·소리 켜기·바닥 클릭/드래그/휠 안내·염주 0/108 패널 확인. 3D 로딩이 끝나지 않아 건물 배치·이동·절·목탁 동작 미확인. 온라인 사찰 맥락만 참고하며 자산을 복제하지 않는다.
- 음악·확언·운세 연결, 사찰, 영냥이, 기존 홈 연결, 운영 승격은 이번 변경에 포함하지 않는다. 결제·이용권·월정석·단건 결제·인증·API·DB를 변경하지 않는다.

## 검증

`node --test __tests__/ui/yeoni-sprite-session.test.mjs __tests__/ui/index-policy.test.mjs`: 17개 통과. 전체 108회, 37회 후 정지·재개, 미완료 복원, 중복 완료, 시간 공백, 속도 경계, 자산 알파·격자·용량을 검사한다. 자동 테스트는 그림 품질 검수를 대체하지 않는다.

타입 검사 통과. 변경 파일 ESLint의 내부 링크 경고는 Next Link로 수정했다. Impeccable detector 결과 `[]`.

실측 용량: 표정 시트 510,320 bytes, 큰절 시트 342,368 bytes, 합계 852,688 bytes(약 833 KiB). 정지 미리보기 39,866 bytes, 전체 참조 시트 210,648 bytes. WebGL·Three.js 로딩 없음.

실제 브라우저: 인사 프레임 변화, 큰절 최저 자세(frame 8, 4809.9ms) 일시정지 → 재개 → 기립 완료 후 1회 기록을 확인했다. 새로고침 후 count=1, elapsed=0, paused 복원. 새 탭 전환 시 일시정지와 복귀 시 동일 elapsed=417.8ms/count=1 보존을 관찰했다(관찰 도구가 원래 탭을 활성화하여 hidden 값 자체는 false로 반환됨). 모션 감소 시 정지 명상 frame 8과 안내. 이미지 요청 차단 시 정지 미리보기·다시 불러오기·진행 UI 유지, 차단 해제 후 frame 0/count=1 복구. robots=noindex,nofollow.

360/390/430px 에뮬레이션에서 scrollWidth=viewport, 조작 버튼 높이 44px 이상. 실제 모바일 기기 성능과 OS 화면 잠금은 미검증이다. 최종 스크린샷·브라우저 관찰 JSON은 제작 폴더 `D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v1/`에 보관한다.

저장소 검사: `check:fast -- --plan`은 미분류 자산 명세·제작 스크립트 때문에 critical로 승격됐다. `check:fast`는 77개 paid gate를 통과한 뒤 기준 커밋의 홈 번역·카탈로그 및 로컬 운세 생성물 부재로 실패를 출력하여 중단했다. 전체 게이트 통과로 보고하지 않는다. 최신 main 통합 후 실패한 홈 범위와 연이 관련 검사 144개 통과. 외부 호출 없는 공식 `npm run fortune:build-data`로 누락된 로컬 생성물을 준비한 뒤 운세 검사 7개 통과. `npm run check:pre-push` 통과. 전체 CI는 push 후 별도 결과를 따른다.
