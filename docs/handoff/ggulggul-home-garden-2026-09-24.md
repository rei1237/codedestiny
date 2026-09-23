---
status: active
updated: 2026-09-24
next: [data-cdh-free] 무료 사주 인라인 폼 진입점을 어디에 다시 둘지 정하고, 새 ko 문구 4개 로케일 번역을 붙인다
---
# 꿀꿀 운세 홈 "연이의 꽃정원" 개편 (2026-09-24)

다음 세션 첫 문장: "docs/handoff/ggulggul-home-garden-2026-09-24.md 를 읽고 남은 후속 과제부터 이어가 줘."

## 무엇을 바꿨나
- 히어로: 주 CTA는 하나만 둔다. "연이와 무료 세 장 펼치기"(/today/#daily-tarot)이다. 영냥이 사주는 밑줄 보조 링크로 내렸다. 연이를 키우고(모바일 150px, 데스크탑 최대 240px) 말풍선(`[data-cdh-bubble]`)을 달았다. 말풍선이나 연이를 탭하면 대사 4줄이 순환한다(`js/core/home-funnel.js`).
- 첫 흐름: 퀵 서비스(연이 한마디 포함) → 이용권 → 접힌 "연이의 정원 더 둘러보기"(`<details id="cdhMore">`) → 한 줄 버그 제보 → 가이드.
- 접힘 안: 영냥이 소개 밴드, 오늘의 운세, 다이어리, 고민 고르기, 전체 검색, 컬렉션, 게이트웨이, 대표 상담, 전문가, 카카오 공유, 이야기·음악, 후기. 삭제한 것은 없고 DOM도 그대로다.
- 해시가 접힘 안을 가리키면(`#cdhFeatured`, `#services`, `#cdFinder` 등) `route()`가 `#cdhMore`를 연다.
- 이용권: `scripts/design/build-home-funnel.mjs`의 `vars.pass`를 새 `.cdh-pass` 마크업으로 바꿨다. `CURRENT_PASS_PLANS` 데이터를 그대로 쓴다. 가드 필수 문구 두 개는 유지했다. 연이 마스코트 `public/images/home/yeoni-pass-mascot-{240,480}.webp`는 codex-image로 생성했다.
- 영냥이 밴드 인젝터(index.html `cd-soulcat-navigation-template`): 주입 위치를 `#cdhQuickSlot` 뒤에서 `#cdhMore .cdh-more__body` 맨 앞으로 옮겼다. 접힘이 없으면 예전 위치로 폴백한다.
- 모바일 문서 높이: 15,069px에서 약 7,900px로 줄었다(실측, 가이드 포함).

## 가드
- `verify-home-funnel.cjs`: 접힘 초기 상태, 이용권 대비(두 테마), 딥링크로 접힘이 열리는지를 단언한다.
- 다이어리 순서 가드(`luck-sync-diary-planner`)에 맞춰 다이어리는 오늘의 운세 바로 뒤에 둔다.

## 기존 결함 (보고만, 미수정)
- `[data-cdh-free]` 마크업이 3a12b5a3a 이후 없다. 그래서 두 곳이 실패한다.
  - `verify-home-funnel.cjs`의 member 단계가 타임아웃으로 실패한다.
  - `verify-mobile-runtime-readiness.mjs:53`이 실패한다.
  - 무료 사주 인라인 폼 진입점을 어디에 다시 둘지 결정이 필요하다.
- neo 테마에서 연이 틀이 원형이 아니라 16px 라운드 사각형이다(`html.neo-mode #honeypigLogo{border-radius:16px!important}`). 의도된 규칙인지 확인이 필요하다.
- neo 테마의 "두 대통령 적중 기록 원문 보기" summary 대비가 약 1.85:1이다.
- neo 테마 1280px에서 하단 떠 있는 탭바 아이콘 색(112,68,92)이 배경 대비 약 2.34:1이다(시각 판정, 이번 변경과 닿는 CSS 없음).
- `npm run sync:public`이 윈도우에서 가끔 EPERM/UNKNOWN(파일 잠금)으로 실패한다. 재실행하면 수렴한다.

## 후속 과제
- 새 ko 문구(말풍선 4줄, 이용권 요약, 더 둘러보기 요약)는 i18n 키가 없다. 4개 저작 로케일 번역이 필요하다.
- 영냥이 밴드 노출이 줄었다. 영냥이 유입 지표를 1~2주 관찰하고, 필요하면 이용권 뒤로 꺼낸다.
