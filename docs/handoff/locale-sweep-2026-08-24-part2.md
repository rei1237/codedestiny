# 비-ko 화면 한국어 제거 — 2단계 인수인계 (2026-08-24)

> **이 문서만 읽고 시작할 수 있게 쓴다.** 1단계 문서는
> [nonko-surface-sweep-2026-08-24.md](nonko-surface-sweep-2026-08-24.md) — 방법론과 함정은 거기 있고,
> 이 문서는 **그 뒤에 일어난 일과 지금 남은 것**이다.

## 지금 상태 (2026-08-24 실측)

서비스 라우트 377개를 재렌더해 센 "보이는 한국어 텍스트 노드"의 **라우트 가중 합**:

| 시점 | 라우트가중 | 비고 |
|---|---|---|
| 이 작업 시작 (main 재기준) | 230,412 | |
| PR #1107 머지 후 | 148,492 | 도감·`/saju`·`/tarot`·`/compare`·`/sukuyo`·`/love-secret-ai` |
| **현재 (PR 미머지 커밋 포함)** | **134,816** | `/fortune` 마커 배선까지 |

법정 표기 6,853자(사업자 등록 정보)는 이 숫자에서 제외했다 — **번역 대상이 아니다.**

측정 재현:
```bash
npm run build
node ./tmp-locale-collect.mjs <scratch>/routes-service.txt <scratch>/out.json en 6
node ./tmp-group.mjs <scratch>/out.json
```
🔴 `dist/` 를 서빙해야 한다. `public/` 은 App Router 페이지가 통째로 빠진다.

## 0으로 끝난 구간

`/nakshatra` · `/saju` · `/tarot` · `/compare` · `/sukuyo` · `/love-secret-ai`.

## 범위 밖 (사용자가 정한 것)

- **인사이트 기사 124편** — 한국어 SEO 자산.
- **`/fortune` 허브 셸(`/fortune/`)과 `/famous`** — 정적 셸이라 **언어 런타임이 없다**(`cd-lang-native` 0회).
  사전에 넣어도 화면이 안 바뀐다. `/famous` 274개를 저작하고 전부 버린 사고가 여기서 났다.
- **`/high-value` 19면(14,006자)** — 인사이트와 같은 성격의 한국어 SEO 기사. 사용자 추천 방향에 따라 제외.
- 웹소설 `/stories/` 45편 — 같은 취급(사용자 확인은 안 받았다).

🔴 **저작 전에 반드시 런타임 확인**: `node ./tmp-check-runtime.mjs <routes.txt>`.
2026-08-24 실측: 377개 중 런타임 없는 것은 `/fortune/` 과 `/famous/` **둘뿐**이다.

## 이번에 새로 만든 것 (이해하고 시작할 것)

### 1. 보간 마커의 `@키` 변수 — `lib/i18n/dictionary.ts` 의 `resolveVars`

마커(`data-cd-trans` + `data-cd-vars`)는 **원래부터 있었다.** 없던 것은 변수 값이 사전을 타는 것이다.

```html
<p data-cd-trans="fortuneTpl.zodiacNeutral"
   data-cd-vars='{"sun":"@fortuneVar.sign.virgo","moon":"@fortuneVar.sign.capricorn","sign":"@fortuneVar.sign.gemini"}'>
  오늘 태양은 처녀자리에 머물고 달은 염소자리 자리를 지납니다. …
</p>
```

- 값이 `@` 로 시작하면 사전에서 찾아 넣는다. **키로 안 풀리면 원문을 그대로 둔다**(이메일 같은 값을 삼키지 않기 위해).
- 🔴 **이중 구현**이다 — `lib/i18n/dictionary.ts`(React 경로)와 `js/cd-lang-native.js`(정적 셸). 한쪽만 고치면
  같은 마커가 두 화면에서 다르게 풀린다. `verify:i18n-runtime` 이 두 파일의 **호출 지점까지** 본다.
- 🔴 마커는 **코어 사전**(`public/i18n/<lang>.json`)만 읽는다. `shellRuntime` 네임스페이스에 넣으면 안 풀린다.
  그래서 병합이 `--core --namespace <ns>` 다.

### 2. `/fortune` 회전 문장 배선

- 재료: `lib/fortune/i18n-marker.ts` (id→키 표, `ref()`, `markerAttrs()`)
- 저작본: `i18n/authored/fortuneVars-01.json`(변수 48) · `fortuneTpl-01.json`(템플릿 21)
- 배선: `lib/fortune/day-relation.ts`(7형) · `lib/fortune/build-view.ts`(서술 3 + 달 날짜 2) ·
  `app/fortune/[period]/[sign]/SignFortuneView.tsx`(5곳)
- 가드: `verify:fortune-marker-keys` (PR CI 배선 완료)

**타입은 추가만 했다** — `detailI18n`·`badgeI18n`·`valueI18n`·`narrativeI18n` 전부 optional.
한국어 원문은 기존 필드에 그대로 남는다. 🔴 그래야 `verify-adsense-readiness` 가 세는 **서버 렌더 분량**이 안 줄고,
이 페이지들은 **서버 컴포넌트로 유지해야 한다**.

병합 명령:
```bash
node scripts/i18n-merge-authored.mjs --core --namespace fortuneVars
node scripts/i18n-merge-authored.mjs --core --namespace fortuneTpl
```
🔴 `--core` 만 주면 **모든** 저작 파일을 훑다가 `_moduleCopy-skeleton.json` 의 미완성 항목에서 멈춘다.
반드시 `--namespace` 를 함께 준다.

## 남은 일 — 권장 순서

### A. 사전만으로 되는 구간 (기계적, 위험 0)

전부 런타임이 있고 마커도 필요 없다. 1단계 문서의 **덤프→번역→빌드** 절차를 그대로 쓴다.

| 구간 | 가중 | 고유자 |
|---|---|---|
| `/ziwei` | 5,542 | 5,516 |
| `/terms-of-service` | 4,842 | 2,421 |
| `/privacy-policy` | 4,655 | 2,320 |
| `/fpti` | 4,326 | 2,163 |
| `/master-love-codex` | 3,291 | 3,281 |
| `/refund-policy` | 3,257 | 1,137 |
| `/fusion-fortune` | 2,715 | 2,704 |
| `/today` | 2,698 | 2,698 |
| `/psychotest` | 2,580 | 1,917 |
| `/astrology` | 2,231 | 2,149 |
| `/face-reading` | 2,183 | 1,058 |
| `/naming-ai` | 2,129 | 2,129 |
| `/account` | 1,425 | 1,359 |

절차(1회 반복):
```bash
node ./tmp-dump-seg.mjs <collect.json> '/ziwei' <scratch>/ziwei.txt 0 60   # 덤프
# tmp-tr-<이름>.mjs 에 번역만 적는다 (ko 는 덤프에서 온다 — 옮겨 적지 않는다)
node ./tmp-build-from-dump.mjs <scratch>/ziwei.txt ./tmp-tr-ziwei.mjs i18n/authored/shellRuntime-NN.json <시작번호>
node ./tmp-expand-authored.mjs i18n/authored/shellRuntime-NN.json
node ./tmp-verify-authored.mjs i18n/authored/shellRuntime-NN.json     # 데바나가리/CJK 경고는 연성
node scripts/i18n-merge-authored.mjs --namespace shellRuntime
```
🔴 **다음 키 번호는 `f2890`** (`shellRuntime-58.json` 이 f2889 까지 썼다). `s<N>` 은 쓰지 말 것 —
`scripts/i18n-extract-runtime-ui.mjs` 가 재생성하며 번호를 갈아치운다.

### B. `/fortune` 잔여 29,968자

배선이 남은 자리:

1. **점수 산출 근거(`basis`)** — `lib/fortune/fortune-score.ts` 의 `ScoreAxis[]`.
   `처녀자리 · 흙 원소 구간`(324) · `염소자리 · 다른 궁`(252) · `같은 흙 원소` · `내 궁에 머무름` 등.
   `ScoreAxis` 에 `valueI18n` 을 추가하고 점수 표 렌더러에 `markerAttrs` 를 붙이면 된다 —
   `i18n-marker.ts` 의 `SIGN_KEY`·`ELEMENT_KEY` 가 이미 있다. 템플릿만 새로 저작.
2. **일일 패키지 문장** — 아래 C 참고.
3. **기간 FAQ 답변** — `lib/fortune/period-faqs.ts` 가 sign 별로 만드는 **고정** 문장이다(회전 아님).
   1단계 분류기가 `구간`·`월건(月建)` 같은 낱말 때문에 회전으로 오분류했다. **사전 저작으로 끝난다**(약 5,750).
4. `/fortune/` 허브 셸 자체는 범위 밖.

### C. 일일 패키지에 이미 번역이 들어 있다 (아직 안 씀)

`public/fortune/data/daily-YYYY-MM-DD.json` 의 문장 노드는 `kr` 옆에 **`en`·`jp`·`cn`·`fr`·`nl`·`vi`·`ms`** 를
함께 갖고 있는데 뷰가 `.kr` 만 읽는다. 2026-08-24 실측: 고유 `kr` 값 157개, 그중 그날 화면에 오르는 24개가
**4,128 라우트가중**이다.

- 이 데이터는 **git 추적 대상이 아니다**(`git ls-files public/fortune/data` → 0). 빌드/배포 때
  `scripts/fortune-daily-once.mjs` 가 만든다. 그래서 사전에 미리 커밋해 둘 수 없다.
- 그래서 제안: **postbuild 단계에서 `dist/i18n/<locale>/shellRuntime.json` 에 그날치를 얹는다.**
  레포는 이미 postbuild 로 `dist` 를 더 손대는 구조다. 매일 자동으로 맞아 들어가고 저작 비용이 0이다.
- 로케일 매핑: `kr→ko`, `jp→ja`, `cn→zh-CN`(+`zh-TW` 는 `cn` 재사용 또는 en 폴백), `hi·es·de` 없음 → en 폴백.
- 🔴 LLM 을 부르는 것이 아니다. **이미 생성된 출력을 읽어 옮기는 것뿐**이다.

### D. 손 안 댄 것

- **`aria-label` 84곳** — 화면에 안 보여 렌더 스윕에 안 잡히지만 스크린리더는 한국어를 읽는다.
  `data-cd-trans-attr="aria-label:키"` 로 처리한다.
- **1자 문자열** — 역인덱스가 2자 미만을 버린다. `/sukuyo` 의 `내`·`년`, 요일 한 글자, 지지·오행 한 글자.
  소스에서 로케일 인지로 바꾸거나 그대로 두는 판단이 필요하다(**사용자 판단**).
- **워커 LLM 폴백** — `worker/routes/fortune-tea-house.js:509·2226·2481`.
  유료 흐름의 실패 경로라 **착수 전 확인 필요**. 출력 언어 파이프 자체는 12로케일 완비.
- **사전 크기** — `public/i18n/en/shellRuntime.json` 480KB, 코어 `en.json` 770KB.
  한국어 사용자는 역인덱스가 `locale === "ko"` 에서 조기 반환하므로 **한 바이트도 안 받는다**.
  비-ko 는 자기 로케일 파일 하나만 받는다. A 를 다 넣으면 1MB 에 근접하니 그 지점에서
  페이지별 네임스페이스 분할을 검토할 것.

## 이번에 고친 버그 (같은 PR 안)

1. **한국어 화면에 영어 궁 이름 누수** — 일일 패키지의 `sky_today.moon_sign` 은 영어("Virgo")만 주는데
   한국어 템플릿이 그대로 끼웠다(`달은 Capricorn 자리를 지납니다`). `zodiacNameKoFromEn()` 경유로 고쳤고,
   `__tests__/fortune/korean-prose-has-no-latin-sign-names.test.js` 가 **소스의 한글 템플릿**을 검사한다
   (렌더 검사는 그날 달의 궁에 따라 우연히 통과할 수 있다).
2. **조사 하드코딩** — `${p.ruler}와` 가 `금성와`·`달와` 를 sign 24 × 기간 4 = 96편과
   그 FAQPage 구조화 데이터에 실었다. `withGwaWa()` 로 고쳤고 `verify:fortune-period-axis` 가
   "보간 뒤 조사 하드코딩"을 막는다. 괄호로 끝나는 값(`신자진 수국(水局)`)은 괄호를 떼고 받침을 본다.

## 도구 (scratchpad — 커밋 안 됨)

`C:\Users\user\AppData\Local\Temp\claude\d--Development-code-destiny\808bfba7-6a1b-47c6-b65e-8211fe57a73f\scratchpad\`
와 **워크트리 루트의 `tmp-*.mjs`**. 🔴 워크트리 안에서 실행해야 한다 — scratchpad 에 두고 `node` 로 부르면
`playwright` 를 못 찾는다.

| 파일 | 용도 |
|---|---|
| `tmp-locale-collect.mjs` | 라우트별 보이는 한국어를 고유 문자열로 접는다. **정본 측정 도구** |
| `tmp-group.mjs` | 구간별 집계(법정 표기 제외) |
| `tmp-seg2.mjs` | 접두사별 집계 + 덤프. `/fortune/` 와 `/fortune-tea-house` 를 섞지 않으려면 이걸 쓸 것 |
| `tmp-dump-seg.mjs` | 저작용 덤프(`#N\t라우트수\t원문`) |
| `tmp-build-from-dump.mjs` | 덤프 + 번역표 → 저작본. **ko 를 덤프에서 가져오므로 오타로 죽은 키가 안 생긴다** |
| `tmp-expand-authored.mjs` | 5개 로케일 → 12개(나머지 7개는 영어 복사) |
| `tmp-verify-authored.mjs` | 저작본 검사(한글 잔존·로케일 누락·2자 미만) |
| `tmp-check-runtime.mjs` | **저작 전 필수** — 라우트에 언어 런타임이 있는지 전수 확인 |
| `tmp-split-fortune.mjs` | `/fortune` 을 회전/고정으로 가른다(고정부 골격 기준) |
| `tmp-group-rotating.mjs` | 회전 문장을 템플릿별로 묶어 무게순으로 본다 |
| `tmp-daily-coverage.mjs` | 일일 패키지가 이미 덮는 문장 수를 센다(위 C) |
| `tmp-check-varkeys.mjs` | 마커 변수로 쓸 이름이 사전에 있는지 확인 |

## 다시 하지 말 것

- **런타임 없는 페이지에 사전 저작** → `/famous` 274개를 버렸다. 먼저 `tmp-check-runtime.mjs`.
- **`--core` 를 `--namespace` 없이** → `_moduleCopy-skeleton.json` 에서 멈춘다.
- **마커 키를 `shellRuntime` 네임스페이스에** → 마커는 코어 사전만 읽는다.
- **`data-cd-vars` 에 한국어 값** → 번역문 안에 한국어가 남는다. `@키` 로.
- **`sync:public` 뒤 `.ignore` 를 그대로 커밋** → `daily-YYYY-MM-DD.json` 날짜 줄이 들어간다. 지울 것.
- **1자 문자열 저작** → 역인덱스가 버려서 죽은 키가 된다.
- **Jest 로 `lib/**/*.ts` 를 import** → 변환이 안 걸려 있다. 소스 검사나 `verify-*.mjs` 로 갈 것.
- **`npx jest` 직접 실행** → `--experimental-vm-modules` 가 없어 152 스위트가 헛실패한다. `npm run test:jest`.
- **음성 테스트에 `git checkout`** → 그 파일의 미커밋 작업이 날아간다. 원문을 메모리에 들고 복원할 것.
