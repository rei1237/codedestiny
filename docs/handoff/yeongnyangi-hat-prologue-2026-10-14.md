---
status: done
updated: 2026-10-14
next: 기존 전달 차단 해소 및 검증 완료. 후속 UI 개선은 별도 변경으로 진행한다.
---

# 영냥이의 모자 — 프로필 선택 후 기숙사 배정 연출

## 사용자 요청
“프로필을 선택하면 마치 해리포터의 마법의 모자를 통해서 너의 기숙사를 배정해주지! 이런 간단한 프롤로그 스토리”, “정확하게 현재 라이트 노벨 서비스 관련 코드를 참조”, “재밌는 스토리”, “기숙사가 정해질 때 모자가 말하면서 효과”. 이 작업은 사용자가 후속 인수인계로 지정했다. 아직 구현하지 않았다.

## 현재 상태
- 작업 디렉터리 `D:\Development\code-destiny`, main. 홈·무료 운세에서 모자 진입을 강조하는 작업과 이 프롤로그는 별개다.
- 기존 배정은 `app/yeongnyangi/_components/SortingHat.tsx`의 `free/hat` 호출, `lib/yeongnyangi/hat-houses.ts`의 여섯 기숙사·삽화가 정본. 배정 계산·로그인·프로필·결과 저장 계약을 바꾸지 않는다.

## 반드시 참조할 실제 UI
- `public/codedestiny-novel.html`: `.dlgWrap/.dlg/.spk/.body`(263행 부근), `.fxLayer`(261행), `showDialogue`(1708행), `typeStep`(1726행), `finishType/advance`의 타이핑·진행·건너뛰기, `S.reduce` 모션 감소.
- 라이트 노벨 데이터 정본 `content/novel/episodes.source.json`, 로더 `lib/stories/vn/index.ts`. 전체 플레이어·전역 상태를 복사하지 말고 위 화면 비율·대사창·화자 이름·진행 동작을 모자 전용 React 컴포넌트에 이식한다. 생성 JSON은 편집하지 않는다.
- 방 안 모달·포커스 복귀는 `app/yeongnyangi/_original/Room.tsx`, 기존 장면 분리는 `StoryPanel.tsx`를 참고하되 라이트 노벨의 대사창이 시각 기준이다.

## 확정 연출안
프로필 선택 → 배정실 시작 → 서버 요청 1회와 4장면 진행 → 결과 확정 후 공개. 결과를 임의·랜덤으로 정하지 않는다.

1. 문 앞: 영냥이 “잠깐. 들어가기 전에 모자한테 인사부터 해. 성격이 좀… 아니, 취향이 확실하거든.” 모자 “다 들린다, 고양이.”
2. 모자 착용: 모자 “흠. 겉으론 태연한데 머릿속은 꽤 바쁘군. 걱정 마라. 머리 모양은 평가하지 않는다.” 영냥이 “그건 다행이네.”
3. 살펴보기: 모자 “빨리 고르는 게 능사는 아니지. 네가 빛나는 자리를 찾는 중이니까.” 기존 여섯 기숙사 문에 은은한 빛. 확정 전에는 특정 성향·기숙사를 주장하지 않는다.
4. 배정: 서버 결과의 house.trait를 바탕으로 검수된 기숙사별 짧은 대사 → “네 자리는… {house.name}!” → 해당 문 조명과 기존 결과 삽화 전환. 영냥이 “찾았네. 들어가 봐. 네 이야기는 이제 시작이야.”

## 완료 기준
- 여섯 기숙사별 대사 1개씩 작성. 결과·대사의 정합성, 프로필 변경 시 이전 요청 무효화, 중복 클릭 방지.
- 대사는 기본 텍스트 타이핑. 한 번 누르면 문장 완성, 다음 누름은 다음 장면. 마지막은 결과로 초점 이동. 이야기 건너뛰기는 서버 결과를 기다려 같은 결과를 연다.
- 모자 흔들림·짧은 금빛 입자·문 조명으로 공개. CSS/SVG와 기존 삽화 우선. 무음 기본, 소리는 사용자 선택 후에만. 음성/TTS·실 LLM 생성은 범위 밖.
- reduce-motion은 즉시 문장·정적 공개. 오류는 재시도, 미완료 결과는 기숙사 확정 연출 금지. 키보드·모바일 360/390/430·데스크톱 확인.
- 프롤로그를 추가해도 로그인 후 무료·멸치 무차감은 유지. 해리포터의 고유 기숙사명·대사 대신 영냥이의 여섯 기숙사 세계관을 사용한다.

## 검증
mock으로 6개 배정·실패·느린 응답·건너뛰기·프로필 전환·모션 감소. 관련 검사 → commit → pre-push → main push·최종 CI 확인. 이 문서는 후속 구현 완료 때 `status: done`으로 닫는다.

## 재개 기준
- 구현 기준 커밋: 31ecf2eef (월정석 최소금액 회귀 검사 포함). 홈·예시 랜딩은 87f0f431b에서 추가했다.
- 작업 디렉터리: D:\Development\code-destiny
- 문서: D:\Development\code-destiny\docs\handoff\yeongnyangi-hat-prologue-2026-10-14.md
- 다음 행동: 이 문서와 SortingHat.tsx, public/codedestiny-novel.html의 실제 대사창·타이핑 코드를 읽고 4장면을 구현한다.
- 현재 진입 UI는 360/390/430/1280px에서 가로 넘침·모자 노출·예시 펼침을 mock 브라우저로 확인했다. 후속 배정 연출 자체는 미구현·미검증이다.

재개 지시: D:\Development\code-destiny에서 위 문서를 읽고 main의 변경 소유권과 31ecf2eef를 확인한 뒤, 기존 라이트 노벨의 대사창을 기준으로 모자 프롤로그·기숙사별 대사·결과 공개 효과를 구현한다.

## 2026-10-14 구현 완료
- 기준 main `423857592`: 추적 파일 미변경 확인, 미추적 `.claude/skills/fire-your-seo-agency/`, `scripts/grant-family-pass.mjs`는 타 작업으로 보존.
- 실제 라이트 노벨의 대사창·화자·타이핑/완성/진행·모션 감소 동작을 HatPrologue에 이식. 4장면, 여섯 기숙사 검수 대사, 모자 흔들림·금빛 입자·문 조명·기존 삽화 공개를 구현했다. 소리는 재생하지 않는다.
- 서버 요청/계산·인증·저장·결제 계약은 유지. 서버 결과를 대기 상태로 분리하고 프로필/계정 변경 시 이야기와 요청을 무효화한다.
- mock 컴포넌트 브라우저 검사 통과: 여섯 배정, 느린 응답, 건너뛰기, 오류/재시도, 프로필 전환의 오래된 응답, 근거 없는 결과 차단, 타이핑 완성, Enter/Space 진행과 결과 초점. 360/390/430/1280px 가로 넘침 없음, 캡처 확인.
- 기존 hat 회귀 9건 통과. ESLint 오류 0, 기존 generation ref cleanup 경고 1건. impeccable detect exit 0.
- 실 LLM·실결제·운영 DB·운영 승격·실기기 검증은 수행하지 않았다. 최종 전달/CI 상태는 커밋과 최종 보고를 기준으로 한다.

## 전달 차단 — 2026-10-14
- 마지막 구현 커밋: `df91350f68b53b9caf25a86060c116b3d90f80bb` (main, 로컬 보존, push 보류).
- `npm run check:fast -- --committed-head`: lint, 사이트맵, typecheck, Node 3,224건 및 앞선 정책 가드 통과. `verify:worker-no-undef`에서 기존 `lib/marketing/render-result-samples.mjs:1:45`의 `with` 구문 파싱 실패로 중단. 이후 단계는 미실행.
- 기준 `423857592`와 위 파일 및 검증기는 diff 없음. 원격 같은 SHA의 CI도 동일 오류로 실패: https://github.com/rei1237/codedestiny/actions/runs/38497591928 (failed logs 확인).
- `npm run check:pre-push`: 홈 레지스트리, public 미러, 사이트맵 모두 통과.
- 저장소 규칙상 기존 실패 main 위로 push하지 않는다. 구현은 완료했으며 이 문서는 전달 절차만 남아 active다. 범위 밖 기존 오류는 수정하지 않았다.
- 재개: `D:\Development\code-destiny`에서 이 문서 `D:\Development\code-destiny\docs\handoff\yeongnyangi-hat-prologue-2026-10-14.md`를 읽고 `df91350f68b53b9caf25a86060c116b3d90f80bb` 및 변경 소유권을 확인한다. 기존 main 파싱 오류가 해결되었는지 먼저 확인한 뒤 남은 검사와 pre-push를 실행하고 main push, CI 1회 확인, 문서 done 처리를 진행한다.

## 전달 차단 해소
- `.mjs`의 JSON import attributes를 지원하는 기존 설치 파서를 미선언 변수 검사에 적용했다. no-undef 및 문법 오류 차단 유지, self-test 3종 통과.
- `verify:worker-no-undef` 645파일 통과. 이전 중단 뒤 남은 mongo-reset/cron/admin 가드, Worker dry-run 빌드, strict-core 인코딩 검사 통과. Jest 396스위트/6,044건 통과. 이전 Node 3,224건/타입/lint 결과와 합쳐 남은 검증 완료.
- 기존 실패 원인을 이번 커밋에서 수정하므로 기존 실패 위에 무관한 push를 쌓는 경우가 아니다. main push 후 CI는 저장소 규칙대로 한 번 확인하며 진행 중이면 최종 보고에 명시한다.

## 후속 UI 개선
- 2026-10-14 사용자 수정 요청에 따라 프롤로그의 영냥이 화자를 없애고 모자가 모든 대사를 직접 말한다. 모자 단독 원화·직업 상징 문장·질감 있는 무대와 대사창으로 전환했다. 위 최초 연출안의 화자/삽화 전환 설명보다 이 후속 결정이 우선한다.
- 기존 영냥이 삽화는 초대·결과·기숙사 소개에서 재사용한다. 생성 자산과 프롬프트는 `docs/design/yeongnyangi-hat-spirit-2026-10-14.md`에 기록했다.
- mock 브라우저와 기존 hat 검사 10건 통과. 360/390/430/1280px, 모자 전용 이미지, 문장 6개, 모션 감소, 타이핑 중 움직임/완성 후 정지 검증.

## 후속 UI 최종 검증
- 구현 커밋 `f0414d7e1` 기준 `npm run check:fast -- --committed-head` 전체 exit 0. Node 3,224건, Jest 396스위트/6,044건, 타입/lint/정책 가드/Worker dry-run 빌드 통과.
- 모자 PNG 실측 1254×1254, alpha 있음. 원본 생성 파일은 보존하고 프로젝트에 복사했다.
- 이전 전달 커밋 `180f40b05`는 main push 완료. 후속 push 직전 CI는 in_progress로 확인했다: https://github.com/rei1237/codedestiny/actions/runs/38500489504 . 최종 후속 push의 CI 상태는 최종 보고를 따른다.
