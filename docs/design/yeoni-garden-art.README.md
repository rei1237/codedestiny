# 연이의 운세 정원 — 그림 원장

`yeoni-garden-art.jsonl` 은 2026-10-02~03 운세 정원 개편에서 만든 그림의 생성 기록이다. 한 줄이 한 번의 생성 시도다(프롬프트 전문·크기·참조·출력 sha256·판정·사용 위치).

## 규칙
- 도구: codex-image(gpt-image-2, `codex exec` OAuth). 신원 참조는 첨부받은 연꽃 연이 PNG(`yeoni-lotus-reference.png`, sha256 `bbe14263…`).
- 상한: 자산당 3회, 전체 36회. `verdict: "aborted-no-image-call"` 줄은 이미지 호출 전에 멈춘 시도라 상한 계산에서 뺀다(첫 줄 — `codex exec` 가 stdin 을 기다리며 정지해 `< /dev/null` 로 고친 기록).
- 원본 PNG 는 저장소 밖 `D:\Development\yeoni-garden-art\source\<asset>-a<n>.png`, 실행 로그는 `..\prompts\<asset>-a<n>.log`. 저장소에는 WebP 파생본과 출처 sidecar(`.webp.json`: 원본 sha256·변환)만 둔다.
- 판정은 visual-checker(참조 대비 얼굴·코·눈·연꽃·보라 스카프·발굽, 글자 없음, 배경, 320px 크롭 여백).

## 자산과 사용 위치
| 자산 | 시도 | 판정 | 파생본 | 사용 위치 |
|---|---|---|---|---|
| hero-garden | 1 (+중지 1) | pass | `public/images/yeoni/garden/yeoni-garden-hero-v1-{480,640,960,1280}.webp` | 셸 홈 히어로 `#honeypigLogo`(모바일은 같은 그림을 16:7 로 잘라 씀) |
| library-empty | 1 | pass | `…/yeoni-garden-library-empty-v1-{320,480}.webp` | 셸 보관함 시트 `#cdLibrarySheet` |
| state-writing | 1 | pass | 없음 | 미배선 — App Router 생성 중 화면 후보 |
| state-ready | 1 | pass | 없음 | 미배선 — App Router 결과 준비 완료 후보 |
| state-recovery | 1 | pass(스카프 좌우 반전 경미) | 없음 | 미배선 — 결제·생성 복구 안내 후보 |

상태 그림 3장의 배선 계획은 `docs/design/yeoni-garden-app-router-followup-2026-10-02.md`.
체계별 장면 그림은 새로 만들지 않았다 — 모든 운세의 체계 허브는 기존 `public/feature-details/assets/<id>-320.webp` 를 쓴다(상세 시트와 같은 그림이라 일관성 유지).
