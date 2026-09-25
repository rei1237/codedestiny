---
status: done
updated: 2026-09-25
next: "꿀꿀 운세 모든 운세 둘러보기 빈 시트는 무대(#cdAllFortunesStage) 구조로 고쳤고 달빛 예화 개편·데스크탑 srcset·오미쿠지 원본 복원까지 main 에 올렸다. 남은 것은 아래 후속 과제(HEALING 배지 대비 등 기존 결함)이며 운영 승격은 별도 1회 승인이 필요하다."
---

# 꿀꿀 운세 "모든 운세 둘러보기" 빈 시트 복구 · 달빛 예화 개편 · 데스크탑 화질 · 오미쿠지 원본 (2026-09-25)

다음 세션 첫 문장: "docs/handoff/ggulggul-all-fortunes-stage-yehwa-2026-09-25.md 를 읽고, 남은 후속 과제 중 하나만 골라 시작해."

## 끝난 것 (main, 커밋 4개)

| 커밋 | 내용 |
|---|---|
| `63b79bd17` | 전문가 이모이 오미쿠지 타일을 원본 `/fuctionassets/오미쿠지.webp` 로 복원(ce3b05158 패턴, catalogImage=hero-v2) |
| `1993b7c57` | 데스크탑 화질: `applyFeatureDetailSrcset` 로 `-320/-480/-960` srcset + `sizes="(max-width: 768px) 180px, 480px"` (index-inline-runtime.js·uiBindings.js 쌍둥이) |
| `10a7ddf95` | 빈 시트 근본 수정: 전체화면 동안 `.feature-card-grid` 를 `#inputPage` 직속 `#cdAllFortunesStage` 로 옮긴다(mountStage/unmountStage). 홈 접힘(`details#cdhMore`)·containment 와 무관 |
| `4393e952a` | 달빛 예화 개편: `<style id="cd-all-fortunes-yehwa-v20260925">` + 개요 히어로(연이/네오 페르소나)·카테고리 16:9 썸네일(`collectionThumbSrc`, 지연 마운트라 `__cdLazyCards` 에서 추출) |

## 알아 둘 구조

- 무대는 `.cdh` 밖이다. `--cdh-*` 토큰이 없어 오버레이 CSS 는 리터럴 hex 를 쓴다. 글꼴 상속은 `.cd-afs` 규칙이 다시 준다.
- 컬렉션 판 배경·타일 반경은 컬렉션별 ID 규칙(`#premiumVvipCollection#premiumVvipCollection`, `#inputPage [data-collection-open] …`)이 쥐고 있다. 덮으려면 `#inputPage #cdAllFortunesStage …` 접두어가 필요하다.
- 라이트 모드 컬렉션 화면: 판은 아이보리, 컬렉션 아트(`--cd-collection-bg`)는 헤더 히어로 카드로 옮겼다. VVIP 프리미엄 카드(`.prem-card`)는 어두운 보석함 그대로이고 감싼 `.pvc-prem-grid` 판만 투명.
- 헤더 구분선은 `.fc-toggle-btn::after`(absolute·2px·반짝임)를 static 으로 되돌려 쓴다.
- `home-funnel.js:41-45` 구독자는 전체화면 중 no-op, 닫힌 뒤 안전망으로 남겼다.

## 남은 위험

- 안드로이드 앱은 번들 `dist` 라 다음 AAB 빌드 때 반영된다.
- 운영 반영은 별도 1회 승격 승인이 필요하다(push 는 스테이징까지).

## 후속 과제 (보고만, 미착수)

1. ~~타로 HEALING 배지 대비~~ — 완료(2026-09-25). 실측 결과 일반 모드는 14.71:1 로 정상이고, 네오 모드(`body.neo-mode`)에서만 흰 글자 on 주황 = 2.74:1 이었다. `styles/core-ui.css` `--healing` 을 #c2410c 로 바꿔 5.18:1. 네오 모드에서 같은 흰 글자 배지 `--beta` 2.54·`--levelup` 2.45·`--bloom` 3.53·`--free` 3.68·`--ziwei` 3.96·`--totem` 4.38 도 4.5 미달 → 후속 커밋에서 6종 모두 같은 계열의 어두운 톤으로 교체(흰 배경 합성 최악값 4.99~6.40, 실제 페이지 getComputedStyle 실측 동일). 일반 모드는 cosmic-main.css 덮어쓰기라 변화 없음.
2. 떠 있는 "아래로 슬라이드" 버튼이 마지막 줄 타일의 가격·알약을 가린다(기존 동작).
3. VVIP 타일 가격 알약이 보라 배지를 덮는다(기존).
4. `ensureHomeExpanded` 호출부 0 — 삭제 후보(deletion-auditor 3면 확인 필요).
5. `js/mobile-interaction-patch.js:289` 의 `sizes` 92px 가 낡았다.
6. 헤더 아이콘 이모지 불일치(타로 🧘, 코즈믹·꽃 𓂀) — 기존.
