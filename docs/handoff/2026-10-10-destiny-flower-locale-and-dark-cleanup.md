---
status: active
updated: 2026-10-10
next: 해시태그 현지화 여부를 사용자에게 묻고, en부터 그 문화권 고유 꽃말로 flowerLanguage 89종을 채운다
---

# 운명의 꽃 — 다국어 확장 + fortune-ui.css 잔존 다크 규칙 삭제

## 왜

사용자: "영어 등 다른 언어 작업 다른 세션에서 진행 가능하도록 해. 예전 다크 테마 규칙은 삭제하는 것도 포함해."
한국어로 완성한 꽃말·개화 서사·공유 시트·친구 꽃 궁합·보태니컬 표본 UI를 11개 로케일로 넓히고, 라이트 테마가 덮어쓰고 있는 예전 다크 선언을 지운다.

## 지금 상태

- main `8195f15dc` push 완료 → 스테이징 자동 배포. 운영 승격 안 함(별도 승인 필요).
- 한국어는 완료. 다른 로케일은 아래 표의 항목이 비어 있어 한국어로 폴백된다.

## 남은 작업

대상 로케일 11개: en ja zh-cn zh-tw es de fr hi ms nl vi (`public/i18n/<로케일>.json`)

- [ ] 꽃말 `fortune.destinyFlower.flowers.<id>.flowerLanguage` — 로케일마다 **0/89** → 89/89. **사용자 결정(2026-10-10): 한국 꽃말을 번역하지 말고 각 문화권 고유 꽃말을 쓴다**(예: ja는 花言葉, en은 영미 전통 꽃말). 같은 꽃이라도 한국 꽃말과 뜻이 달라도 된다
- [ ] 엔진 새 문구 키 **13개**(`DESTINY_FLOWER_KO_TEXT`의 `common.bloom*`·`common.flowerLanguage*`·`common.shareHook`·`saju.bloom`·`saju.flowerLanguage*`·`saju.shareHook*`) — 로케일마다 0/13 → 13/13. 키 경로는 `fortune.destinyFlower.<키>`
- [ ] 런타임 한국어 하드코딩 — 이번 작업에서 한국어가 든 줄이 102줄 늘었고 번역 호출은 0개: 공유 시트, 스토리 카드, 친구 꽃 티저, 꽃 궁합 7유형, 채집 라벨, 개화 타임라인, 꽃다발, 공유 훅 문구. 개수는 `npm run i18n:audit`로 확정한다
- [ ] OG 배지 `BADGES.flower = '운명의 꽃'`(`worker/lib/og-card.js`) — 한국어 전용
- [ ] 다크 선언 삭제(`styles/fortune-ui.css`, 줄번호는 `8195f15dc` 기준):
  - `.df-studio-quad` 9719
  - `.df-quad-card` 9757–9771
  - `.df-quad-visual` 9801
  - `.df-studio-empty` 9933–9951
  - `.df-studio-link-btn` 9964–10001
  - `.df-studio-toast` 10443–10448 — 이 클래스를 만드는 마크업·JS가 없어 규칙째 죽은 코드다

  모두 `styles/destiny-flower-cosmic.css`의 `#destinyFlowerStudioOverlay` 라이트 규칙이 덮어쓰고 있다.

**완료 기준**
- `npm run i18n:check` 통과
- `/en/`·`/ja/`에서 꽃 스튜디오·공유 시트·스토리 카드 스크린샷(360·1280)에 한국어가 없다
- 다크 삭제 전후 스튜디오 스크린샷이 같다

## 정본 예시

- 런타임 번역: `js/core/index-inline-runtime.js:36` (`_indexRuntimeText` → `cdTranslate(key, {}, ko)`)
- 엔진 번역: `worker/lib/destiny-flower-engine.js:306` (`destinyFlowerText`), 한국어 원문은 `:95`

## 함정

- **선언만 지운다. 규칙째 지우지 않는다.**
  - `__tests__/ui/destiny-flower-quad.static.test.js:138`은 `.df-studio-quad { display: grid }`를 요구한다.
  - `__tests__/ui/destiny-flower-wiring.static.test.js:149`는 살아 있는 규칙 목록을 고정한다.
  - `.df-studio-toast`만 규칙째 지워도 된다(`:160` 죽은 규칙 목록에 추가할지 확인).
- `fortune-ui.css`를 고치면 `node scripts/build-fortune-ui-critical.mjs`로 `index.html`의 `cd-fortune-ui-critical` 블록을 다시 생성한다(그 블록에 `.df-quad-card` 등이 들어 있다). 그다음 `npm run sync:public`.
- 친구에게 보내는 공유 문구는 한국어 반말이다. 다른 로케일도 친구에게 말하는 캐주얼 톤으로 맞춘다. UI 문구는 해요체에 대응하는 정중체로 쓴다.
- `sync:public`이 `UNKNOWN errno -4094`로 멈추면 다른 세션의 `check:fast`가 `public/`을 읽고 있는 것이다. `git checkout -- public/styles/static-policy.css`로 되돌리고 다시 실행한다(잘린 채로 커밋하지 말 것).
- 꽃 디자인 규칙: [docs/context/design-canon.md](../context/design-canon.md)

## 검증

```
node --test __tests__/ui/destiny-flower-*.static.test.js
NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/worker/destiny-flower.route.test.js
npm run i18n:check
npm run check:fast
```

## 모르는 것

- 고유 꽃말이 정립되지 않은 경우의 처리. 문화권 자체(hi·ms·vi 등)나 개별 꽃에 고유 꽃말이 없을 수 있다. **지어내지 않는다.** 로케일×꽃별로 고유 꽃말이 있는 칸과 없는 칸을 먼저 조사해 표로 보고하고, 빈칸을 어떻게 채울지(한국 꽃말 번역, 인접 문화권 꽃말 등)는 사용자에게 묻는다.
- 나의 꽃말 문구(`saju.flowerLanguage*`)는 전통 꽃말을 인용하는 템플릿이다. 로케일 꽃말이 한국 꽃말과 다르면, 인용되는 꽃말도 그 로케일 값이어야 한다. 엔진이 `flowerLanguageKo(id)`를 폴백으로 쓰는 경로(`worker/lib/destiny-flower-engine.js` `localizeDestinyFlowerCopy`)를 확인한다.
- 해시태그 `#운명의꽃 #나의꽃은<이름>`을 로케일별로 바꿀지(예: `#DestinyFlower`). 사용자에게 묻는다.
- OG 이미지 라우트(`/api/og`)가 로케일을 받는지 확인하지 못했다.

## 재개

```
cd D:\Development\code-destiny && git pull --ff-only && git log --oneline -1   # 기준 8195f15dc 이후
```

문서: `D:\Development\code-destiny\docs\handoff\2026-10-10-destiny-flower-locale-and-dark-cleanup.md`
