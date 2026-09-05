# `styles/` — 전역 CSS

> 이 폴더는 **정본**이다. `public/styles/` 는 `npm run sync:public` 이 만드는 배포 사본이므로 직접 고치지 않는다.
> 디자인 규격의 정본은 [DESIGN.md](../DESIGN.md), 사고 사례·판정 기준은 [docs/context/design-and-ui.md](../docs/context/design-and-ui.md).

---

## 누가 무엇을 로드하는가

**이 구분이 이 문서의 존재 이유다.** 여기 있는 CSS 는 두 세계가 나눠 쓰는데, 어느 쪽이 로드하는지 모르고 고치면 반영이 안 되거나 반대쪽까지 바뀐다.

### 1. App Router — `app/layout.js` 가 import 하는 4개

```
globals.css            리셋 · @font-face · .cd-* 컴포넌트 · .cd-guide(--gd-*)
theme-tokens.css       페르소나 토큰 정본 (--cd-*)
mobile-bottom-nav.css
yehwa-motifs-nav.css
```

여기 없는 파일은 **App Router 페이지에서 쓸 수 없다.** 기능 전용 스타일은 그 기능 폴더의 `*.module.css` 에 둔다.

`app/app/**`(안드로이드 앱 셸)만 예외로 `app/app/layout.tsx` 가 `app-shell.css` 를 추가로 import 한다.

### 2. 정적 셸 — `index.html` 이 `<link>` 하는 22개

`animal-totem-mystic` · `core-ui` · `cosmic-main` · `destiny-flower-cosmic` · `fonts-serif` · `fortune-gateway` · `fortune-ui-home` · `fortune-ui` · `life-book` · `love-secret` · `mobile-bottom-nav` · `mobile-lite` · `mobile-totem-flower-fix` · `sibyl-system` · `tarot-healing-dawn` · `tarot-love-mystic` · `tarot-reunion-lighthouse` · `tarot-self-esteem-quest` · `tarot-year-fortune` · `theme-tokens` · `yehwa-motifs-nav` · `yehwa-motifs`

🔴 **로드 순서가 곧 우선순위다.** 셸은 오버라이드가 여러 파일에 흩어져 있어 "첫 매치"를 고치면 아무 일도 일어나지 않는다. 고치기 전에 `<link>` 순서와 선택자 특이도로 **어느 블록이 실제로 이기는지** 먼저 확정한다.

### 3. 생성물 — 손으로 고치지 않는다

| 파일 | 재생성 명령 |
|---|---|
| `fonts-serif.css` | `node scripts/build-serif-font-assets.mjs` (+ `npm run verify:r2-fonts`) |
| `yehwa-motifs.css` | `node scripts/design/gen-yehwa-motifs.mjs` (`--check` 로 드리프트 감지) |

---

## 색 · 폰트

**`theme-tokens.css` 가 색의 정본이다.** 하드코딩 hex 를 새로 심지 말고 `--cd-*` 를 쓴다.

- 두 페르소나로 갈린다 — **연이**(핑크 계열, `:root`)와 **네오**(퍼플 계열, `.neo-mode` / `[data-cd-theme="neo"]`). 가르는 축은 명도가 아니라 **hue** 다.
- 🔴 **페르소나 분기(`.neo-mode`)는 정적 셸 전용이다.** App Router 신규 기능에 테마 분기를 새로 도입하지 않는다.
- 기능 전용 색은 전역 `--cd-*` 를 서브트리에서 덮지 말고 **사설 접두사**로 스코프한다(`--ls-*`, `--fx-*`, `--gd-*`). 정본 예시: `app/love-secret-ai/love-secret-theme.module.css`.

폰트 스택은 `globals.css` 상단에 있다(`--font-body` / `-display` / `-premium` / `-playful` / `-decorative` / `-serif`). 🔴 스택 맨 앞의 `CodeDestinyHan` 은 한자 두부 방지용 OS 로컬 폰트라 **순서를 바꾸지 않는다.**

---

## 대비 (WCAG 2.1 AA)

- 본문 **4.5:1**, 큰 텍스트(18.66px+bold / 24px+)·UI 경계·아이콘·포커스 링 **3:1**. muted 텍스트도 예외가 아니다.
- 🔴 **반투명 위의 글자는 합성색 기준으로 잰다.** 토큰끼리는 멀쩡한데 배경과 알파 합성하면 떨어지는 사고가 실제로 있었다.
- 배경을 직접 칠했으면 **글자색도 세트로 바꾼다.** 배경만 덮는 반쪽 오버라이드는 `npm run verify:hero-contrast` 가 막는다.

---

## 고치고 나서

```bash
npm run sync:public          # styles/ → public/styles/ 사본 갱신 (산출물도 함께 커밋)
npm run verify:style-sync    # 두 폴더 바이트 동기화 확인
npm run verify:hero-contrast
```

`globals.css` 만 예외다 — 루트는 `@tailwind` 지시자가 있는 Next.js 소스이고 `public/styles/globals.css` 는 별도로 관리되는 순수 CSS라, `verify:style-sync` 가 동기화 대상에서 뺀다.
