---
status: active
updated: 2026-11-01
next: "현재 main 코드 CI 결과를 1회 확인하고 남은 성능 미달 20화면을 큰 병목부터 이어서 개선한다"
---

# SNULIFE 이용 흐름·웹 성능

## 현재 상태

- 작업 폴더: `D:\Development\code-destiny\.codex-worktrees\snulife-ux-perf-20261101-142056`. 다른 작업이 있는 원래 폴더와 다른 워크트리는 보존했다.
- 코드 기준 `5c0a80f7dc9a9f8bf94b5811a2af5d564604d9d4`까지 main push 완료. 기존 구현209041, 성능 개선a1a086, 제목 검사 수정c973161, 연이·네오 그림abe9dda, 모의 조회·목록 보완5c0a80 순이다. 운영 배포·정식 캠페인 활성화는 실행하지 않았다.
- a1 공식 CI의 hydrated-H1 실패는 클라이언트 전용 경계를 명시해 수정했다. 최종 로컬 가드234경로·빌드1862페이지·타입·린트·전달 검사 통과. 예외나 느슨한 검사는 추가하지 않았다.
- abe 공식 코드 CI [41293508476](https://github.com/rei1237/codedestiny/actions/runs/41293508476)는 마지막 확인에서 진행 중이었다. 보조 Browser Shadow는 상태 조회2개가 mock에 없어 실패했고, 정확한GET만 추가해 미수령 상태·POST/미등록501·비인증401을 검증했다. AI Locale 목록은 기존 검수 설정 스크립트의 Cloudflare URL1개만 공식 생성기로 추가했다. 그 운영 스크립트는 실행하지 않았다. 이후 새 CI를 성공으로 추정하지 않는다.

## 근거

- 상세 파일·의도·정책·검증·전후표·원본JSON·PNG·로그: `D:\Development\code-destiny\outputs\snulife-performance-round2-20261101\verification.md`.
- 21화면 각3cold/warm126표본 및 후속7화면42표본. CPU4/Slow4G390px/localcompiled/guest mock. 공개루트 LCP2.39초·CLS0. 나머지20화면은 미달이다.
- 최종 비교 가능한 관찰값: 연이7.26→3.22초, 네오6.92→4.42초, 영냥이입구9.42→6.04초. 중간 입구4.80초는 최종경계수정전 수치다. 점성술·영냥이결과·보관함 등 악화 표본도 보고서에 보존했다. 일부LCP는 동의배너/로딩그림에서 다른실제콘텐츠로 바뀌며 미완료이미지도 있어 동일콘텐츠 개선율이나 전체화면 합격으로 해석하지 않는다.
- SNULIFE4폭 모의 접근·고정프로필·키보드·focus·10링크·로그아웃 검증 통과. 최종 질문4폭 입력·새로고침·legacy·계정분리·비결제 검증 통과. 입력24~32ms는 단일실험실 이벤트 표본이며 실제INP가 아니다.
- 전체 `check:fast`는 초기에 실패했고 전체 로컬 반복은 하지 않았다. 실패 원인별 표적검사와 `check:pre-push`는 통과했다. 전체판정은 공식CI로 확인한다. 실PG·실LLM·운영DB·실기기는 미검증.

## 추가 요청 회신 — 발송 완료

- 사용자가 명시적으로 요청한 추가 메일1건을 기존 SNULIFE 스레드에 회신했다. 이름: **꿀꿀운세 라이트 사주 패키지**.
- 김태윤 `ad@snulife.com`에게 게시글 문안TXT와 꽃돼지 연이1500×1200(5:4)JPEG 첨부. [보낸 메일](https://mail.google.com/mail/u/?authuser=seongbae555%40gmail.com#all/1a1967003041c84d). SENT·정확한첨부2개를 재조회했다. 다시 발송하지 않는다.
- 게시일·정식코드는 별도 협의하며 별도 안내 전 게시 보류를 명시했다. 검수 코드 값은 새 본문·첨부에 넣지 않았다.
- 자료: `D:\Development\code-destiny\outputs\snulife-light-saju-package-20261101`. 원본PNG·1500PNG/JPEG·문안·회신·프롬프트·발송증거 보존.

## 다음 작업

1. main의 현재 코드 커밋에 연결된 PR CI를 한 번 확인한다. 일반 run-list가 이전 커밋을 반환한 적이 있어 head SHA를 대조한다. 진행 중이면 기다리거나 반복 조회하지 말고 다른 유효 작업을 진행한다. 실패면 해당 로그만 읽는다.
2. 남은 병목: 점성술/베다 등의 초기결과 의존성·공통초기화, 영냥이 결과/보관함의 의미있는 첫콘텐츠 표시, 레거시홈 긴실행·CLS, 연이의늦은CSS·네오의아래쪽전체그림. 기존가격·권한·인증·모델·저장계약을 보존한다.
3. 계속 측정할 때 기존 두 빌드의 수치와 새 측정을 구분한다. 스크립트 `scripts/measure-consultation-web-perf.mjs`와 영구출력JSON을 재사용한다. 실제사용자INP로 보고하지 않는다.
4. 공식CI·전달과 후속 범위가 정리되면 이 문서를 done으로 닫고 자기 워크트리만 배수한다. node_modules 정션을 먼저 해제하고 다른 작업은 건드리지 않는다.

## 재개

```text
D:\Development\code-destiny\.codex-worktrees\snulife-ux-perf-20261101-142056에서 D:\Development\code-destiny\.codex-worktrees\snulife-ux-perf-20261101-142056\docs\handoff\snulife-ux-perf-20261101.md를 읽고, 마지막 코드 커밋 5c0a80f7dc9a9f8bf94b5811a2af5d564604d9d4와 현재 main을 확인한 뒤 코드 CI 결과 1회 확인 및 미달20화면 병목 개선부터 이어서 진행하라. SNULIFE 회신은 이미 발송했으므로 중복 발송하지 말고 운영 배포·정식 캠페인 활성화는 실행하지 말라.
```

## 마지막 동시 작업 통합

최신 main f7c5a88d15f5e7b9baebe05ea8f224edfd20e432의 Android·공통 홈 변경을 583dd38fc74b270402d580d8e1c0e30e5da2c465로 충돌 없이 보존해 합쳤다. 이 단계에서 성능 전체를 다시 측정하거나 운영 배포하지 않았다. 표는 위 검증 빌드 기준이다. 공통 홈·모의 조회 표적 검사와 타입·전달 검사를 다시 확인한다.

통합 후 공통 홈·모의 조회 8개 테스트와 타입 검사가 통과했다. 다른 작업의 Android 완료 문서에는 필수 updated/next 두 줄이 없어 공통 문서 검사가 실패했다. 본문·완료 상태를 보존하며 메타데이터만 63e7ff89e로 복원했고 257문서 계약 검사가 통과했다. 공식 main CI는 마지막 확인에서 진행 중이었고, 최종 통합 후 전체 build/perf는 반복하지 않았다.
