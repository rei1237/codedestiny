---
status: active
implementationStatus: not-started
updated: 2026-10-01
next: 후기 추가(이미지 3회 대조, 최상급·사용자 캡처 포함) → 채팅형 후기 UI → 정적 셸 반영 → 화면 검증
---

# 상담 후기: 더 많이, 채팅처럼, 고급스럽게 (2026-10-01)

다음 세션 첫 문장: "docs/handoff/review-chat-ui-2026-10-01.md 를 읽고 후기 추가(사용자 캡처 2장·최상급 4건·1회 판독 7건, 3회 대조)부터 채팅형 후기 UI 와 정적 셸 반영까지 진행해줘."

사용자 요청(2026-10-01): "후기 시스템을 훨씬 더 고급스럽고 채팅처럼 나오도록. 나머지 후기를 더 많이 넣고 UI 를 개선." 정치인 데이터 정리는 하지 않기로 했다(`political-trust-to-reviews-2026-10-01.md` 후속 과제 2).

등급: GREEN(마크업·CSS·데이터 추가, 결제·라우팅 무변경). 권장 Opus / effort medium.

## 출발점

- 데이터 정본 `lib/brand/customer-reviews.mjs` 12건(대표 ★ 024·047·050). 파일 머리 주석의 원문 규칙(말풍선 = 메시지 하나, 우리가 생략한 자리는 "…" 하나, 문장 수정·병합 금지)을 그대로 따른다. 원문 sha256 은 `__tests__/ui/customer-reviews.test.mjs` 가 고정한다.
- 화면: `app/components/CustomerReviews.tsx` 하나를 `FounderTrust.tsx`(영냥이 홈 `#founder-records`, 천원 페이지)와 `app/yeongnyangi/_components/Consultation.tsx`(`variant="inline"`, 결제 직전, 접힘·ko 전용)가 같이 쓴다.
- 정적 셸(`/ggulggul/`)의 후기 카드 3건은 `scripts/design/build-home-funnel.mjs` 가 따로 그린다. 12개 로케일·sitemap 원장 서명이 걸려 있어 이번 1차 범위 밖이다. 1차가 끝나고 여유가 있으면 같은 시각 언어로 맞춘다.
- 원문: 블로그 neosaju/224032671570 의 캡처 이미지(번호 = `evidence.image`). 직전 세션 로컬 사본(93장, 3배 확대본 `up_*.png`, URL·업로드일 목록 `list.tsv`): `C:\Users\user\AppData\Local\Temp\claude\d--Development-code-destiny\4df55ab9-a697-469c-b693-15c1e5dfb2a5\scratchpad\rv\`. 임시 폴더라 지워졌으면 글에서 다시 받는다. 저장소에는 넣지 않는다.
- 사용자 제공 캡처 2장(2026-10-01, 게시 동의 받음 — 사용자 확인): `C:\Users\user\AppData\Local\Temp\claude\d--Development-code-destiny\17e7b3ed-b1e1-4d18-8047-b43be3105ab0\images\1.png`(합격·"말씀해주신대로 큰 명예를 얻었어요"), `2.png`("선생님이 10000000000000000000 배 더"). 블로그 사본에 같은 이미지가 있으면 그 번호·업로드일을 쓴다.

## 1. 후기 추가 후보 (직전 세션 판독 기준)

| 묶음 | 이미지 | 처리 |
|---|---|---|
| 사용자 캡처 | 1·2 | 고객 흰 말풍선만, 가린 이름은 "…". 대표 후보(적중·비교) |
| 최상급·비교 | 028·030·035·036 | 원문 그대로 넣는다(2026-10-01 사용자 결정 "원문 그대로 넣기") |
| 1회 판독 | 064·070·074·077·081·083·086 | 3회 대조만 끝나면 넣는다. |
| 판독 불확실 | 002·037·061 | 원본 해상도로 재판독, 세 번 모두 같을 때만 |
| 실명·닉네임 | 008·009·022·038 | 이름 자리만 "…" 생략으로 넣을 수 있는지 판단. 문맥이 깨지면 제외 |
| 가격 언급 | 006·007·026·046 | 금액 부분 생략이 문맥을 해치지 않을 때만. `verify:krw-copy-canonical` 주의 |
| 계속 제외 | 정치 027, 재난 예언 019, 강의 003·005, 문장 없음 042·048·057, 제3자 사생활 013 | 넣지 않는다 |

게시 동의는 블로그 게시 때 받았다(사용자 확인). 대표(★)는 사용자 캡처 1(적중)·2(비교)·기존 024 로 바꾼다 — 정적 셸 카드도 바뀌므로 build-home-funnel → sync:public → generate-sitemap 을 같이 돈다.

과장·각색 금지(2026-10-01): 사용자가 과장해도 된다고 했지만 지어낸 후기는 표시광고법(추천·보증 심사지침) 기만 광고라 하지 않기로 했다. 대신 강한 원문을 앞세우고, 원문 부분 문자열만 `highlight` 로 강조 인용한다(테스트가 부분 문자열인지 확인).

테스트 정책 변경: `BANNED`(최고 등)는 우리 문구에만 적용하고, 고객 원문에는 정치어·금액 패턴만 막는다(최상급 원문 허용, 사용자 승인 2026-10-01).

## 2. 채팅형 UI 방향

- 한 후기 = 한 대화. 고객 말풍선은 왼쪽, 연속 말풍선은 한 묶음으로 붙이고 꼬리는 마지막 말풍선에만. 익명 아바타는 자체 아이콘 — 카카오 로고·노란색 흉내 금지.
- 대화창 프레임: 상단 바(예: "상담 후 받은 메시지", 익명 처리 표시), 대표 카드는 `highlight` 강조 인용(명조·금색, aria-hidden), 말풍선 아래 작은 메타. 금액·블로그 링크는 계속 내보내지 않는다.
- 고급감은 현재 브랜드 토큰(남색·금색)과 여백·서체 위계로 낸다. 그림자는 한 단, 장식 그라디언트·글로우 남발 금지.
- 모션: 화면에 들어올 때 말풍선이 짧게 순차 등장. `prefers-reduced-motion` 이면 없음. 타이핑 점은 선택.
- 펼침: 대표 3건 + "후기 N개 더 보기" 구조 유지(section). inline(Consultation)은 `<details>` 접힘·고지 선행·ko 전용 그대로.
- 직전 세션이 남긴 "…" 한 줄 고아(1280)는 CSS(`text-wrap: pretty` 등)로 같이 해결한다. 원문 문자열은 건드리지 않는다.
- 긴 숫자열("10000000000000000000")은 `overflow-wrap: anywhere` 로 360 에서 넘치지 않게 한다.
- 계획 전문: `C:\Users\user\.claude\plans\dapper-exploring-rivest.md`.

## 3. 성공 기준

1. `node --test __tests__/ui/customer-reviews.test.mjs` 통과 — 새 항목 해시 추가, `visibleReviews()` 규칙 유지.
2. 360·768·1280 가로 넘침 0, 말풍선 본문 대비 4.5:1 이상, 단어 중간 줄바꿈 0, "…" 고아 줄 0.
3. reduced-motion 에서 애니메이션 0.
4. Consultation: 접힘 기본, ko 전용, 고지가 카드보다 먼저, 펼쳐도 결제 버튼 y 불변, `?lang=en` 블록 0.
5. 정치 문구 가드·KRW 가드 통과(금액·블로그 링크·정치어 0).
6. visual-checker PASS: 영냥이 홈 `#founder-records`, 천원 페이지, Consultation(`/yeongnyangi/fortune/?domain=saju`, mock).
7. `npm run check:fast` exit 0.

## 순서

1. 후기 추가(데이터 + 해시) 커밋 — UI 와 섞지 않는다.
2. 채팅형 UI 커밋.
3. 화면 검증 → 교정 → push → 이 문서 갱신.

## 현재 상태

- 미착수. 시작 시점 main = origin/main 57f85eedc 이후 이 문서 커밋.
- 작업 트리에 이 작업과 무관한 미커밋 변경이 있었다(`marketing/`, `next-env.d.ts`, `tsconfig.json`, `.tmp/`, `scripts/_probe-popup-tmp.mjs`). 옆 세션 것일 수 있어 건드리지 않았다. 그 세션이 여전히 쓰는 중이면 워크트리에서 진행한다.
