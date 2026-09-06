---
status: active
updated: 2026-09-06
next: "§7-A 의 표 첫 줄부터(가중 큰 것 순). 🔴 착수 분기점을 정한 뒤 그 자리에서 tmp-maxkey.mjs 로 다음 키 번호를 재실측하고, §5 저작 절차를 그대로 돈다"
---

# 인수인계 — 비-ko 화면 한국어 제거 (통합본)

> 🔴 **이 문서 하나만 읽고 이어서 시작할 수 있다.** 2026-09-06 에 같은 계보 4건을 흡수하고 지웠다 —
> `nonko-surface-sweep-2026-08-24.md`(1단계) · `locale-sweep-2026-08-24-part2.md`(2단계) ·
> `-part3.md`(3단계) · `locale-sweep-2026-08-25-part4.md`(4단계).
> 앞선 문서들은 서로에게 방법론·마커·정정 절차를 **분담**시켜 놔서 5개를 다 열어야 한 번의 저작이
> 가능했다. 그 분담을 없애고 **단계순이 아니라 기능순**으로 다시 묶은 것이 이 문서다.
>
> 🔴 **파일명의 `2026-08-24` 는 이력이지 최신 시점이 아니다** — `i18n/authored/shellCopy-06.json` ·
> `-07.json` · `-08.json` 의 `_comment` 3곳이 이 경로를 **"2번"**(→ 아래 §3-2)으로 가리키고 있어
> 이름을 바꾸지 않았다. 최신 실측은 §0 의 표를 볼 것.
>
> 앞선 찻집 i18n 문서는 [fortune-tea-house-i18n.md](fortune-tea-house-i18n.md) — 이 계보는 그 위에 얹혔다.

---

## 0. 30초 요약 — 지금 어디까지 왔나

**하는 일**: `?lang=en` 등 비한국어 화면에 남은 **보이는 한국어 텍스트 노드**를 없앤다.
**방법**: 소스를 고치지 않고 **사전에 ko 원문 + 번역을 넣는다.** 런타임 역인덱스가 렌더 직전에 치환한다(§2).

| 시점 | 라우트가중 | 기준 라우트 수 |
|---|---:|---:|
| 1단계 시작 (`origin/main` `8f0825a8e`) | 405,389 | 377 |
| 1단계 종료 (PR #1107 머지 후) | 148,492 | 377 |
| 2단계 종료 | 134,816 | 377 |
| 3단계 종료 (PR #1115) | 99,752 | 377 |
| 4단계 시작 재측정 | 108,239 | **359** |
| **4단계 종료 (PR #1116) — 최신** | **101,072** (고유 2,816) | **359** |

🔴 **이 표의 값을 가로질러 빼지 말 것.** ① 4단계에서 라우트 목록 산출 기준이 바뀌어 **377 ≠ 359** 이고,
② 이 표면은 **가만히 둬도 늘어난다**(다른 PR 이 새 한국어 콘텐츠를 넣는다 — 실제로 1단계 종료 199,564 가
2단계 시작 시 230,412 로 커져 있었다). **판정은 항상 자기 세션 안에서 before/after 로만** 한다.

**0 이 된 구간**: `/nakshatra`(도감 27면 포함) · `/saju` · `/tarot` · `/compare` · `/sukuyo` ·
`/love-secret-ai` · `/ziwei` · `/terms-of-service` · `/privacy-policy` · `/refund-policy` · `/fpti` ·
`/master-love-codex` · `/today` · `/face-reading` · `/astrology`(+`/astrology-ai`).
거의 0: `/fusion-fortune` 41 · `/psychotest` 2.

**다음 할 일**: §7-A 의 표(사전만으로 되는 기계적 구간, 위험 0). 가장 큰 덩어리는 여전히 `/fortune` 25,844(§7-B).

---

## 1. 범위 — 사용자가 확정한 것 (다시 논의하지 말 것)

### 1-1. 🔴 저작은 4개 로케일, 나머지 7개는 영어 복사 (2026-08-25 확정)

- 손으로 쓰는 것: `en` · `ja` · `zh-CN` · `zh-TW` (`ko` 는 덤프에서 온다 — 옮겨 적지 않는다)
- 영어 복사: `vi` · `hi` · `es` · `fr` · `de` · `nl` · `ms` — `tmp-expand-authored.mjs` 가 한다

**길이와 무관하다.** `tmp-expand-authored.mjs` 의 주석은 "짧은 라벨에는 쓰지 말 것"이라고 하지만
**그 주석이 방침보다 낡았다.** 실측으로도 이미 그래 왔다 — `shellRuntime-59`~`66` 의 12자 이하 항목 96개가
**96개 전부 `es === en`** 이다.

🔴 **다시 꺼내지 말 것.** 근거는 ① 비-ko 표면에서 한국어보다 영어가 낫다는 것이 이 스윕의 전제이고
② 12개 로케일 저작은 유료 LLM 실호출 없이는 비용이 선형으로 늘며(자동 번역기는 절대규칙 1로 금지)
③ 같은 네임스페이스 안에서 규칙이 갈리는 편이 더 나쁘기 때문이다.
사전 패리티 가드는 **키 집합 일치**와 **"비-ko 한글 없음"**만 요구하므로 영어 복사로 통과한다.

🔴 번역문은 **세션에서 직접 저작한다.** `scripts/i18n-translate-pending.mjs` 는 Gemini 실호출이라 쓰지 않는다.

### 1-2. 범위 밖 (한국어 SEO 자산)

| 대상 | 규모 | 비고 |
|---|---:|---|
| 인사이트 기사 124편 | 377,541자 | 사용자 결정 |
| `/high-value` 19면 | 14,006 | 인사이트와 같은 성격 |
| `/famous` | 4,958 | 🔴 **언어 런타임이 아예 없다**(§6-4) |
| `/fortune/` 허브 셸 | 1,431 | 같은 이유 + 사용자 결정 |
| 웹소설 `/stories/` 45편 | — | 같은 취급. **사용자 확인은 안 받았다 — 이어서 할 때 물어볼 것** |

### 1-3. 번역 대상이 아닌 것 (한글이 맞다)

- **사업자 정보 4건**(상호·대표자·신고번호·주소, 252 라우트 · 6,853자) — `SiteFooterHub.jsx:228` 이
  `data-cd-no-trans` 로 명시 제외한다. **등록된 그대로가 법적 형식**이다.
  `verify-i18n-public-parity.mjs` 도 `LEGAL_VERBATIM_KEY` 로 이 키들만 "한글이면 실패"가 아니라
  **"ko 와 다르면 실패"**로 검사한다. 모든 측정에서 이 6,853자는 빼고 센다.
- **`withdrawModal.confirmMismatch` 의 `회원탈퇴`** — `worker/routes/auth.js` 가 confirmText 를
  그 리터럴로 검증하므로 안내 문구도 그 단어를 인용해야 한다. 비한국어 사용자에게 한글 입력을 요구하는
  **UX 문제는 남아 있고, 고치려면 서버 검증까지 같이 바꿔야 하므로 별건이다.**

---

## 2. 전달 경로 — 마크업을 고칠 필요가 없다

### 2-1. 역인덱스가 전부 한다

`repairUnmarkedKoreanText`([lib/i18n/dictionary.ts:186](../../lib/i18n/dictionary.ts#L186))가
**한국어 원문 역인덱스**로 마커 없는 텍스트 노드를 치환한다. 같은 로직이 정적 셸에도
**이중 구현**돼 있다([js/cd-lang-native.js:435](../../js/cd-lang-native.js#L435)).
둘 다 `REPAIR_NAMESPACE = "shellRuntime"` **하나만** 읽는다.

실험으로 확인했다(2026-08-24): `dist/i18n/{ko,en}/shellRuntime.json` 에 문자열을 넣자
`/saju/?lang=en` 에서 즉시 치환됐다. **React 페이지든 정적 셸이든 사전에 넣기만 하면 된다.**

- `ko` 는 repair 가 **즉시 반환**하므로 한국어 화면은 영향을 받지 않는다.
- 🔴 역인덱스는 **공백 정규화 후 2자 미만을 버린다**(§6-3).

### 2-2. 🔴 마커는 상태를 가진 클라이언트 컴포넌트에서 동작하지 않는다

`홈` 이 258개 라우트에 남아 있어 `MobileBottomNav` 에 `data-cd-trans` 를 붙이고 빌드했는데 **그대로였다.**
브리지는 마운트 시 `el.textContent` 를 한 번 갈아끼우는데, 이 컴포넌트는 활성 탭 상태를 갖고 있어
곧바로 리렌더하며 자기 가상 DOM 으로 되돌려 놓는다. `lib/i18n/useT.ts` 상단 주석이 경고하는 사례다.
`useTPick()` 으로 바꾸자 즉시 사라졌다.

| 대상 | 쓸 것 |
|---|---|
| 서버 컴포넌트 · 리렌더 없는 정적 마크업 | 역인덱스(사전에 넣기만) 또는 `data-cd-trans` |
| **상태를 가진 클라이언트 컴포넌트** | **`useTPick(키, 한국어원문)`** — 마커는 되돌려진다 |
| 2자 미만(한 글자) | 사전 불가. 마커 또는 훅만 가능 |

배선하기 전에 **셸 쪽에 키가 이미 있는지 먼저 찾아볼 것** — `MobileBottomNav` 는 라벨·aria 문구가
`shell.cdMobileBottomNav.*`·`home.nav.*` 로 전부 있었고 배선만 빠져 있었다.

### 2-3. 보간 마커의 `@키` 변수

마커(`data-cd-trans` + `data-cd-vars`)는 **원래부터 있었다.** 2단계에서 없던 것을 추가한 건
**변수 값이 사전을 타는 것**이다(`lib/i18n/dictionary.ts` 의 `resolveVars`).

```html
<p data-cd-trans="fortuneTpl.zodiacNeutral"
   data-cd-vars='{"sun":"@fortuneVar.sign.virgo","moon":"@fortuneVar.sign.capricorn"}'>
  오늘 태양은 처녀자리에 머물고 달은 염소자리 자리를 지납니다. …
</p>
```

- 값이 `@` 로 시작하면 사전에서 찾아 넣는다. **키로 안 풀리면 원문을 그대로 둔다**(이메일 같은 값을 삼키지 않기 위해).
- 🔴 **이중 구현이다** — `lib/i18n/dictionary.ts`(React) 와 `js/cd-lang-native.js`(정적 셸).
  한쪽만 고치면 같은 마커가 두 화면에서 다르게 풀린다. `verify:i18n-runtime` 이 **두 파일의 호출 지점까지** 본다.
- 🔴 마커는 **코어 사전**(`public/i18n/<lang>.json`)만 읽는다. `shellRuntime` 네임스페이스에 넣으면 안 풀린다.
  (`LocaleRuntimeBridge` 가 네임스페이스 없이 `loadDictionary` 를 부른다.) 그래서 병합이 `--core --namespace <ns>` 다.

`/fortune` 배선 재료: `lib/fortune/i18n-marker.ts`(id→키 표, `ref()`, `markerAttrs()`) ·
저작본 `i18n/authored/fortuneVars-01.json`(변수 48) · `fortuneTpl-01.json`(템플릿 21) ·
가드 `verify:fortune-marker-keys`(PR CI 배선 완료).
**타입은 추가만 했다** — `detailI18n`·`badgeI18n`·`valueI18n`·`narrativeI18n` 전부 optional 이고
한국어 원문은 기존 필드에 남는다. 🔴 그래야 `verify-adsense-readiness` 가 세는 **서버 렌더 분량**이 안 줄고,
**이 페이지들은 서버 컴포넌트로 유지해야 한다.**

### 2-4. 셸 푸터에 5개 로케일 표를 import 하지 말 것

`SiteFooterHub.jsx:29` 에 근거가 있다 — `AppChrome`("use client")이 이 파일을 import 하므로
`lib/i18n/siteFooterHubCopy` 를 끌어오면 layout 청크가 41KB → 63KB 가 된다(2026-08-16 실측).
그래서 이 표면의 정답은 **런타임 사전**이다.

---

## 3. 🔴 드리프트 표면과 저작 네임스페이스 규칙

### 3-1. 드리프트 표면은 셋이고, 가드는 하나만 덮는다

| 표면 | 상태 | 자동 판정 |
|---|---|---|
| 셸 마크업 ↔ `ko.json` | **0건** | ✅ `__tests__/ui/shell-dictionary-parity.static.test.js` |
| `ko.json` ↔ 나머지 11개 로케일 | 결제 인접 3블록 처리 완료, 나머지 미확인 | ❌ **불가능**(뜻 비교가 필요) |
| JS 폴백(`__cdText`·`cdTranslate`·`_cdPaymentI18n`) | **깨끗**(키 139 / 누락 0 / 불일치 2 — 비분리 공백뿐) | 없음 |

두 번째 표면은 손으로 훑는 수밖에 없다. 후보를 좁히는 법: **ko/en 길이 비율**(중앙값 2.06배)에서
크게 벗어난 키부터. 다만 상위 대부분은 **영어가 장황할 뿐인 정상**이라 오탐이 많다 — 실제로 잡힌 건
`home.passMini.*`·`home.passFooter.*`·`home.premiumArchive.*` 세 블록뿐이었다.

### 3-2. 저작 네임스페이스를 `shellCopy` 로 따로 뗀 이유

🔴 **`node scripts/i18n-merge-authored.mjs --namespace shell --core` 를 쓰지 말 것.**
`i18n/authored/shell-01.json` 에 마크업에서 이미 사라진 낡은 키
(`shell.moonHeroCopy.moonHeroActions.kerryje`)가 남아 있어, 병합하면 무관한 값이 함께 뒤집힌다.
셸 문구 교정은 **`i18n/authored/shellCopy-*.json` + `--namespace shellCopy`** 로 한다.

> 이 항목이 `i18n/authored/shellCopy-06.json`·`-07.json`·`-08.json` 의 `_comment` 가 가리키는 **"2번"**이다.
> 번호를 바꾸면 그 데이터 파일 3개의 참조가 끊긴다.

### 3-3. 같은 키를 두 저작 파일에 두지 말 것

파일은 정렬 순으로 처리돼 **나중 파일만 이기고 앞 파일은 조용히 죽은 값**이 된다.
`shellCopy-02` 의 `mascotAria`·`mascotAlt` 가 `shellCopy-04` 와 겹쳐 실제로 그랬고, PR #1082 에서 앞쪽을 제거했다.

### 3-4. 같은 마커 키가 서로 다른 원문 두 곳에 붙은 경우가 3건 있다

| 키 | 원문 A | 원문 B |
|---|---|---|
| `home.hero2.primaryCta` | ✦ 무료로 오늘의 운세 보기 (히어로) | ✦ 무료 운세 시작하기 (스티키 CTA) |
| `common.goHomeScreen` | 🏠 홈화면 바로가기 | 홈화면 바로가기 |
| `shell.lifebookTileInner.lifebookTileLabelRow.n30000` | 전문가 상담 · 30,000원 | 상담 시 30,000원 |

비한국어에서는 두 자리가 **같은 문자열**로 렌더된다. 가드는 "원문 중 하나와 일치"로 판정하므로 통과한다.
갈라야 한다면 키를 나눠야 하고 그건 `index.html` 수정이다(§3-5).

### 3-5. `index.html` 을 고치면 따라오는 것

- `npm run sync:public` **필수** — 캐시버스트 키가 회전해 셸 7벌 + JS 미러가 파일당 87~109줄로 바뀐다.
  이건 정상이고 CI 가 커밋을 강제한다.
- `.ignore` 가 개행만 뒤집혀 나오면 `git checkout -- .ignore` 로 되돌린다(내용 무변경).
- 🔴 **`js/destiny-profile.js` 내용까지 바뀌었다면** `?v=` 핀 25곳을 함께 올려야 한다 —
  독립 정적 페이지 23개 + `app/_lib/billing-client.ts` 의 `PAID_SERVICE_RUNTIME_SRC` +
  `scripts/verify-paid-gate-ui-regression.mjs:206` 의 기대 문자열. `verify:payment-choice-parity` 가
  기대값을 알려준다. `billing-client.ts` 는 결제 동결 대상이라
  `node scripts/verify-payment-freeze.mjs --update` 도 **같은 커밋에**.

### 3-6. 결과 화면 로케일화의 계약

`src/features/fortune-tea-house/lib/localizeConsultResult.ts` 는 **payload 를 건드리지 않는다.**
저장·공유·워커 프롬프트의 정본은 계속 한국어 id 데이터이고, 사전 조회는 렌더 직전에만 일어난다.

🔴 한국어 불변식: **사전 값이 소스와 같을 때 출력은 입력과 완전히 같아야 한다.**
`__tests__/ui/tea-house-result-localization.static.test.js` 가 `deepEqual` 로 잠근다.
새 필드를 이 함수에 넣을 때 그 테스트가 깨지면 **한국어 화면이 바뀐다는 뜻이다.**

### 3-7. 왜 `f*` 접두사인가

`shellRuntime` 네임스페이스의 `s<N>` 키는 `scripts/i18n-extract-runtime-ui.mjs` 가 **재생성**한다(인덱스가 밀린다).
`f*` 는 손으로 저작한 계열이라 그 재생성과 충돌하지 않는다. **이어서 저작할 때도 `f*` 를 쓴다.**

---

## 4. 측정 — 재현 절차와 노이즈

### 4-1. 재현

```bash
npm run build:cf                                    # 🔴 dist 를 서빙해야 한다
node tmp-routes.mjs tmp-routes-service.txt          # 라우트 목록 재생성 (2026-08-25: 744 → 서비스 359)
node tmp-locale-collect.mjs <routes.txt> <out.json> en 6
node tmp-group.mjs <out.json>                       # 구간별 집계(법정 표기 제외)
```

- 🔴 **`dist/` 를 서빙해야 한다.** `verify:i18n-rendered-korean` 은 `public/` 을 서빙하므로
  App Router 페이지가 **아예 안 잡힌다.**
- 🔴 **빌드는 추적 파일을 고친다** — `.ignore` · `config/sitemap-lastmod.json` · `rss.xml` 4종.
  측정 후 `git checkout --` 로 되돌린다.
- `tmp-routes.mjs` 는 자산·`admin`·`404/500`·웹소설·인사이트와 **로케일 프리렌더 미러**
  (`/en` `/ja` `/zh` `/zh-tw`)를 뺀다. 미러 제외 기준이 3단계와 달라 **377 ≠ 359** 다(§0).

### 4-2. 🔴 노이즈 — 이 폭 안의 차이는 신호가 아니다

| 원인 | 폭 |
|---|---|
| 렌더 지터(수집기가 `waitForTimeout(1600)` 뒤에 읽어 지연 로드 구간이 회차마다 갈린다) | 라우트가중 **±320** |
| 상태 의존 위젯(`/fortune-planner`·리뷰 목록 — 로그인·데이터 상태에 따라 렌더가 갈린다) | **±800자** |

**판정은 총합 증감이 아니라** `tmp-diff-collect.mjs` 의 **"새로 생긴 한국어 0"** 과
`tmp-scan-dead.mjs` 의 **"죽은 키 0"** 으로 한다.

### 4-3. 저작 순서는 레버리지로 정한다

같은 자수를 써도 효과가 8배까지 갈린다(2026-08-24 실측):

| 소스 | 고유 자수 | 라우트 가중 | 레버리지 |
|---|---:|---:|---:|
| `scripts/gen-daily.mjs` | 1,823 | 15,120 | **8.3×** |
| `lib/fortune/sign-profiles.ts` | 8,758 | 35,032 | 4.0× |
| `constants/nakshatra-attributes.js` | 1,159 | 1,586 | 1.4× |
| `constants/nakshatra-expert-prose.js` | 10,970 | 10,970 | 1.0× |
| `lib/fortune/period-readings.ts` | 4,107 | 4,107 | 1.0× |

`tmp-impact2.mjs` 로 소스별 레버리지를 먼저 재고 들어갈 것. 실제로 `shellRuntime-30`(≥8 라우트 구간의
온전한 구 50개)은 **고유 1,372자 중 일부로 6,598자**를 걷어냈다.

### 4-4. 🔴 "오늘 렌더된 것"만 덮으면 내일 다시 한국어가 나온다

일일 문안은 `scripts/gen-daily.mjs` 의 **고정 풀**에서 날짜별로 돌려 쓴다(생성된
`public/fortune/data/daily-*.json` 은 산출물이지 원본이 아니다). 렌더 스윕은 **그날 뽑힌 것만** 본다.
2026-08-24 종료 시점: 풀 192개 중 사전에 없는 것은 7개이고, 그 7개는 주석 3개와 **어느 페이지에도
렌더되지 않는** 문자열 연결 조각 4개다(`dist` 전수 grep 확인) — 즉 **이 축은 끝났다.**

---

## 5. 🔴 저작 절차 (1회 반복) — 이대로만 한다

```bash
# 0. 워크트리에 node_modules 정션 (build 를 돌리려면 필수)
cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"
export MSYS_NO_PATHCONV=1        # 🔴 git bash 필수 (아래 함정 참고)

# 1. 최신 렌더 확보 — 🔴 생략 금지
npm run build:cf
node tmp-routes.mjs tmp-routes-service.txt
node tmp-locale-collect.mjs tmp-routes-service.txt <scratch>/collect.json en 6

# 2. 다음 키 번호 확인 — 🔴 저작 파일이 아니라 사전에서
node tmp-maxkey.mjs .

# 3. 덤프 → 번역표 작성 → 저작본
node tmp-seg2.mjs <scratch>/collect.json                 # 접두사에 무엇이 딸려 오는지 먼저 본다
node tmp-dump-seg.mjs <scratch>/collect.json '/구간' <scratch>/seg.txt 0 200
#    tmp-tr-<이름>.mjs 에 번역만 적는다 (ko 는 덤프에서 온다 — 옮겨 적지 않는다)
node tmp-build-from-dump.mjs <scratch>/seg.txt <scratch>/tmp-tr-seg.mjs i18n/authored/shellRuntime-NN.json <시작번호>
node tmp-expand-authored.mjs i18n/authored/shellRuntime-NN.json
node tmp-verify-authored.mjs i18n/authored/shellRuntime-NN.json <scratch>/collect.json --expanded
node scripts/i18n-merge-authored.mjs --namespace shellRuntime

# 4. 병합 후 실측 — 🔴 여기까지 해야 "검증했다"
npm run build:cf
node tmp-locale-collect.mjs tmp-routes-service.txt <scratch>/collect-after.json en 6
node tmp-diff-collect.mjs <scratch>/collect.json <scratch>/collect-after.json    # 새로 생긴 한국어 0
node tmp-scan-dead.mjs <scratch>/collect-after.json i18n/authored/shellRuntime-NN.json  # 죽은 키 0

# 5. 빌드가 고친 추적 파일을 되돌린다
git checkout -- .ignore insights/rss.xml public/insights/rss.xml public/rss.xml rss.xml
```

### 5-1. 🔴 기존 키를 덮지 않았는지 매번 확인한다

3단계에서 **살아 있던 나크샤트라 키 115개를 조용히 덮을 뻔했다.** 원인은 "저작 파일 안의 최대 키"로
다음 번호를 정한 것 — PR #1107 이 `f2890`~`f3172` 를 저작 파일 없이 사전에 직접 썼기 때문에
저작 파일만 보면 그 구간이 비어 보인다. `git diff` 의 `-` 줄로 겨우 잡았다.

```bash
node -e "const {execSync}=require('child_process');const fs=require('fs');
const b=JSON.parse(execSync('git show HEAD:public/i18n/en/shellRuntime.json',{maxBuffer:1e9}).toString('utf8')).shellRuntime;
const a=JSON.parse(fs.readFileSync('public/i18n/en/shellRuntime.json','utf8')).shellRuntime;
const rm=Object.keys(b).filter(k=>!(k in a));
const ch=Object.keys(b).filter(k=>k in a && b[k]!==a[k]);
console.log('제거',rm.length,'· 값 변경',ch.length);"
```

4단계 실측 예: en 5,348 → 5,648, **제거 0 · 값 변경 0.**

### 5-2. 🔴 "다음 키 번호"는 **분기점 위에서만** 참이다

3단계 문서가 적은 `f3701` 은 PR #1115 위에서만 맞았고 `origin/main` 의 실제 최대는 `f3172` 였다.
main 에서 분기해 f3701 부터 썼다면 #1115 의 528키와 **통째로 충돌**한다.

**같은 생성 파일(`public/i18n/**/shellRuntime.json`)을 건드리는 PR 은 main 에 병렬로 두지 않는다.**
앞 PR 이 안 머지됐으면 그 브랜치 위에 **스택**으로 쌓고, 머지됐으면 `origin/main` 에서 딴다.
어느 쪽이든 **그 분기점에서 `tmp-maxkey.mjs` 를 다시 돌린다.**

마지막 기록: **2026-08-25, PR #1116 이후 기준 다음 번호 `f4001`.** 🔴 그대로 쓰지 말고 재실측할 것.

### 5-3. 저작본 자체 검사 — `merge-authored` 만으로는 부족하다

`merge-authored` 는 "12개 로케일 누락"과 "비-ko 한글"만 본다. `tmp-verify-authored.mjs` 가 보는 것:
12로케일 누락 / 비-ko 한글 / **키릴 혼입** / 라틴권에 CJK·데바나가리 혼입 / hi 에 데바나가리 없음 /
**ko 원문이 실제 렌더 목록에 있는가**(마지막이 제일 중요 — 오타 나면 그 키는 영원히 안 걸린다).

실제로 잡은 것: 네덜란드어의 키릴 `е` 오타(`Geluksklеur`), 일본어에 한국어 `배속`(→`配属`) 혼입 2건.
**CJK 로케일을 손으로 쓸 때 한국어 한자어가 그대로 나오는 실수는 눈으로 안 보인다.**

🔴 그 검사는 **넘겨준 수집본이 최신일 때만** 의미가 있다. 낡은 수집본을 주면 통과하면서 죽은 키를 만든다 —
`/terms-of-service` 문자열은 PR #1109 가 문단을 다시 써서 **수집본 시점 이후 화면에서 사라져 있었다.**
**수집본은 하루도 못 간다고 보는 편이 맞다.**

### 5-4. 생성기를 쓸 때

조합이 유한하면(사인 24 × 기간 4 × 종류 2 = 414 등) 저작 파일을 손으로 쓰지 말고 생성기를 커밋한다
(`scripts/i18n-gen-fortune-composites.mjs` · `scripts/i18n-gen-sign-meta.mjs`).

- 🔴 **저작 파일이 아니라 생성기를 고친다.** 사인 이름은 생성기가 **사전에서 읽어 온다**(`fromDict`) —
  거기서 다시 번역하면 같은 별자리가 화면마다 다른 이름이 된다. 없는 값은 **던지게** 해서
  조용히 한국어가 남는 경로를 없앤다(실제로 `다르마(사명·정의)`·`카마(욕망·창의)` 누락이 이때 드러났다).
- 🔴 **개별 용어를 사전에 넣지 않는다.** `관계`·`변화`·`표현` 같은 흔한 낱말이 키가 되면 역인덱스가
  **사이트 전체에서** 그 낱말을 갈아치운다. 사전에 넣는 것은 **이어 붙인 문자열과 완성된 문장뿐**이고,
  낱말 표는 생성기 안에만 둔다.
- 🔴 **생성문은 어형이 슬롯마다 다르다.** 한 형태만 두고 이어 붙였더니 `du animal`(fr) ·
  `otros signo del zodiacos`(es) · `chinesisches Tierkreiszeichen-Deutung`(de) 같은 비문이 나왔다.
  종류 명사를 `bare`/`of`/`this`/`pl`(독일어는 격까지 `thisNom`/`thisDat`)로 나누고,
  사인 이름이 전치사의 지배를 받는 자리는 en/de/fr/es/nl 에서 **"이름 — 서술"** 형태로 바꿨다.

---

## 6. 🔴 사전으로 못 고치는 것 — 넣기 전에 여기부터 본다

### 6-1. 변수로 갈린 조각 — 사전에 넣지 말 것

`{별자리}의 행운 포인트` 처럼 JSX 변수 사이에서 잘린 텍스트 노드다:

```
의 행운 포인트 / 와 잘 맞는 상대 / 는 어떤 기질인가 / 의 운세 점수 / 의 기본 결
```

한국어는 조사가 뒤에 붙어 이렇게 잘려도 읽히지만 **어순이 다른 언어에서는 문장이 성립하지 않는다.**
소스에서 **텍스트 노드를 합치거나**(템플릿 리터럴 하나로) **보간 키로 승격**해야 한다.

소스에서 합칠 때: **렌더 문자열이 한 글자도 바뀌면 안 된다.** diff 의 제거/추가 줄에서 한글 시퀀스가
완전히 동일함을 문자 단위로 대조한다. 🔴 나크샤트라 도감 패치에서 **마무리 문단을 빠뜨렸다** —
`grep '한 문장으로 정리하면'` 으로 뒤늦게 잡았다. JSX 안의 `“`·`”` 같은 **문장부호 텍스트가 노드를
더 잘게 쪼갠다**는 점을 놓치기 쉽다.

### 6-2. 링크로 갈린 조각 — 이건 번역해도 된다

`제작 기준은 [링크] 와 [링크] 에서 확인할 수 있습니다` 처럼 **인라인 링크**로 끊긴 조각은
가운데 들어가는 것이 임의값이 아니라 **이미 번역된 링크 라벨**이다. 앞뒤 조각을 언어별로 다시 분배하면
문장이 성립한다. 분배는 언어마다 다르다:

- en 은 뒤 조각이 `.` 한 글자로 줄고 앞 조각이 길어진다
- de 는 링크 라벨이 주격 고정이라 앞 조각을 `… enthält` 로 바꿔 격 충돌을 피한다
- ja/zh 는 한국어와 어순이 같아 `trail` 이 그대로 절로 남는다
- hi 는 후치사가 필요해 뒤 조각이 `में देखा जा सकता है।` 로 길다

🔴 **묶음을 닫지 않으면 반쪽만 번역된다.** `trail` 은 여러 페이지가 공유한다 —
`에서 확인할 수 있습니다.`(4 라우트)는 `/privacy-policy` · `/advertising-policy` · `/account/delete`
세 곳이 공유하므로 **세 lead 와 링크 라벨을 한 배치에 같이** 넣어야 한다.

```bash
node tmp-find-text.mjs <collect.json> "부분문자열" ...                     # 묶음 찾기
node tmp-append-rows.mjs <collect.json> <seg.txt> <시작번호> "원문" ...     # 다른 구간 조각을 덤프에 붙이기
```

### 6-3. 1자 문자열 — 역인덱스가 버린다

역인덱스는 공백 정규화 후 **2자 미만을 버린다.** 넣으면 **죽은 키**가 된다(PR #1099 에서 `홈`(f97)이
실제로 그랬다 — 제거하고 코어 사전에 이미 있던 `home.nav.home` 을 `data-cd-trans` 마커로 5곳에 붙여 해결).

남아 있는 것: 이용약관의 목적격 조사 `을`(`</strong>을 <strong>`, 가중 2) · `/psychotest` 의 `분`(가중 2) ·
`/sukuyo` 의 `내`·`년` · 주간 표의 `weekdayKo`(요일 한 글자) · 지지(자·축·인…)·오행(목·화·토·금·수).
2026-08-24 기준 한 글자 노드 46개(가중 651).

- 요일·조사는 **소스에서 노드를 합쳐야** 하는데 그러면 조사 한 글자가 굵게 바뀌는 등 **시각이 달라진다** →
  약관 페이지 등은 **사용자 판단이 필요**하다고 보고 손대지 않았다.
- 지지·오행은 **도메인 표기**라 그대로 두는 편이 맞을 수 있다(`월`·`수` 는 요일/오행 중의성도 있다).
- 🔴 **계속 쌓이고 있으니 언젠가 한 번에 처리할 것.**

### 6-4. 언어 런타임이 없는 페이지 — 넣어도 화면이 안 바뀐다

`/famous` 274개를 전부 저작한 뒤 렌더가 **1자도 줄지 않아** 알았다(272개 폐기). 그 페이지는 독립 정적 셸이라
빌드 산출물에 `cd-lang-native` 가 **0회**다.

🔴 **저작 전에 반드시 런타임 확인**:

```bash
node tmp-check-runtime.mjs <routes.txt>
```

2026-08-24 실측: 서비스 라우트 377개 중 런타임이 없는 것은 **`/fortune/` 과 `/famous/` 둘뿐**이다.

### 6-5. 소스에 한국어 상수가 박힌 자리 — 문자열이 언어마다 달라 매칭이 안 된다

`/fusion-fortune` 의 `이 정보를 읽는 체계: <label>` 5건(가중 41).
[app/fusion-fortune/FusionFortuneClient.tsx:126](../../app/fusion-fortune/FusionFortuneClient.tsx#L126) 의 `.sr-only` 다.
이 컴포넌트는 **자체 12로케일 카피 표**를 갖고 있어 접두사(`fieldSystemsSrOnly`)는 이미 번역되는데,
`label` 은 `FUSION_ORB_BY_KEY[key].label`(한국어 상수)이라 그대로 남는다.

그래서 `?lang=en` 텍스트 노드가 `The systems that read this information: 사주 · 자미두수 · …` 로 굳는다.
**이 문자열을 ko 로 삼아 사전에 넣으면 영어 하나만 고쳐진다** — ja 는 `この情報を読み取る体系: 사주 …`,
zh 는 `解读此信息的体系：사주 …` 라 애초에 매칭이 안 된다.

**고치는 자리는 `label` 소스다.** 로케일 인지 라벨로 바꾸면 `title` 속성(스윕에 안 잡히는 자리)까지 같이 낫는다.
🔴 `FUSION_ORB_BY_KEY` 는 오브 시각 요소도 함께 쓰는 **공유 상수**이니 `regression-scout` 를 먼저 돌릴 것(원칙 7).

### 6-6. 정책 페이지는 번역이 아니라 **라우팅** 문제다

`/terms/` 는 한글 4,904자인데 `/en/terms-of-service/`·`/ja/...`·`/zh/...` 에 **완역본이 이미 있다**
(각 110자만 한글 = 사업자 정보). `lib/i18n/routes.ts` 의 `I18N_ROUTE_MAP` 에 정책 라우트 키가 없어서
푸터가 로케일과 무관하게 `/terms/` 로 보낸다. **번역을 새로 만들지 말고 링크를 로케일 라우트로 보낸다.**

---

## 7. 남은 일 — 권장 순서

### A. 사전만으로 되는 구간 (기계적, 위험 0)

전부 런타임이 있고 마커도 필요 없다. 절차는 §5 그대로. **2026-08-25 재측정값**이다 —
착수 시 §4-1 로 다시 잰다.

| 구간 | 가중 | 문자열 |
|---|---:|---:|
| `/naming-ai` | 2,129 | 47 |
| `/vedic` | 2,116 | 54 |
| `/about` | 2,043 | 62 |
| `/nakshatra` | 1,833 | 105 |
| `/music` | 1,753 | 51 |
| `/karma-destiny-ai` | 1,740 | 30 |
| `/new-year-ai-consultation` | 1,719 | 72 |
| `/destiny-compass` | 1,669 | 22 |
| `/reviews` | 1,570 | 31 |
| `/yeon-star-hug` | 1,482 | 35 |
| `/vedic-ai` | 1,468 | 31 |
| `/contact-us` | 1,428 | 45 |
| `/fortune-tea-house` | 1,399 | 30 |
| `/oracle` | 1,369 | 41 |
| `/methodology` | 1,364 | 24 |

그 아래로 `/manse` 1,344 · `/compatibility` 1,341 · `/kkul-kkul-unse` 1,334 · `/health-report` 1,200 ·
`/fortune-planner` 1,162 · `/love` 1,148 · `/calendar` 1,145.

🔴 두 가지 주의:
- `tmp-dump-seg.mjs` 는 `sampleRoute` 의 **접두사 일치**로 자른다. `/vedic` 을 주면 `/vedic-ai` 와
  `/vedic-astrology` 가 딸려 온다(`/astrology` 에 `/astrology-ai` 3건이 딸려 왔고 그건 그대로 저작했다).
  **`tmp-seg2.mjs` 로 먼저 확인할 것.**
- `/account` 은 8,466 으로 잡히지만 **사이트 공통 크롬과 법정 표기가 이 접두사로 묶여 들어온 것**이다
  (고유 1,335 — 최대 행이 `코드 데스티니 (Code Destiny)` 253 라우트). 덤프를 열어 고유 문자열만 고른다.

### B. `/fortune` 25,844 (601 문자열) — 여전히 가장 큰 덩어리

배선이 남은 자리:

1. **점수 산출 근거(`basis`)** — `lib/fortune/fortune-score.ts` 의 `ScoreAxis[]`
   (`처녀자리 · 흙 원소 구간` 324 · `염소자리 · 다른 궁` 252 등). `ScoreAxis` 에 `valueI18n` 을 추가하고
   점수 표 렌더러에 `markerAttrs` 를 붙이면 된다 — `i18n-marker.ts` 의 `SIGN_KEY`·`ELEMENT_KEY` 가 이미 있다.
   **템플릿만 새로 저작.**
2. **기간 FAQ 답변** — `lib/fortune/period-faqs.ts` 가 sign 별로 만드는 **고정** 문장이다(회전 아님).
   1단계 분류기가 `구간`·`월건(月建)` 같은 낱말 때문에 회전으로 오분류했다. **사전 저작으로 끝난다**(약 5,750).
   단 `${nameKo}`·`${element}`·`${ruler}` 조합문이라 24 × 4 = 96쌍을 펼쳐야 한다 — **생성기 쪽이 맞다**.
3. `sign-profiles.ts` 의 `keywords` 는 **화면에 안 나온다**(2026-08-24 렌더 대조). **저작하지 말 것.**
4. `/fortune/` 허브 셸 자체는 범위 밖(§1-2).

### C. 일일 패키지에 이미 번역이 들어 있다 (아직 안 씀)

`public/fortune/data/daily-YYYY-MM-DD.json` 의 문장 노드는 `kr` 옆에 **`en`·`jp`·`cn`·`fr`·`nl`·`vi`·`ms`**
를 함께 갖고 있는데 뷰가 `.kr` 만 읽는다. 2026-08-24 실측: 고유 `kr` 값 157개, 그중 그날 화면에 오르는 24개가
**4,128 라우트가중**이다.

- 이 데이터는 **git 추적 대상이 아니다**(`git ls-files public/fortune/data` → 0).
  빌드/배포 때 `scripts/fortune-daily-once.mjs` 가 만든다 — 사전에 미리 커밋해 둘 수 없다.
- 제안: **postbuild 단계에서 `dist/i18n/<locale>/shellRuntime.json` 에 그날치를 얹는다.**
  레포는 이미 postbuild 로 `dist` 를 더 손대는 구조다. 매일 자동으로 맞고 저작 비용이 0이다.
- 로케일 매핑: `kr→ko`, `jp→ja`, `cn→zh-CN`(+`zh-TW` 는 `cn` 재사용 또는 en 폴백), `hi·es·de` 없음 → en 폴백.
- 🔴 **LLM 을 부르는 것이 아니다.** 이미 생성된 출력을 읽어 옮기는 것뿐이다.

### D. 손 안 댄 것

- **`aria-label` 84곳**(`app/`·`components/`) — 화면에 안 보여 렌더 스윕에 안 잡히지만 스크린리더는
  한국어를 읽는다. `data-cd-trans-attr="aria-label:키"` 로 처리한다.
- **1자 문자열** — §6-3.
- **워커 LLM 폴백** — `worker/routes/fortune-tea-house.js:509`(`buildFallbackCardDetail`) ·
  `:2226`(`buildFallbackSajuDeepSections`) · `:2481`(기본 `oneLineAdvice`).
  워커는 `getAmbientAiLocale()`([worker/lib/ai-locale-context.js:27](../../worker/lib/ai-locale-context.js#L27))로
  로케일을 이미 알고 같은 파일 412줄에서 분기한다. 출력 언어 파이프 자체는 12로케일 완비이고
  `verify:ai-locale-pipeline` 14개 불변식이 지킨다 — **고칠 것은 폴백뿐**이다.
  🔴 **유료 흐름의 실패 경로 동작 변경이라 착수 전 사용자 확인이 필요하다.**
- **`saju.cautionReading`·`saju.actionPrescription`** — id 가 없는 고정 문장이라 id 조회로는 못 고친다.
  시트가 `cautionReading || caution` 순으로 읽는데 `caution` 은 LLM 이 채우므로 **사용자 언어**다 →
  비한국어에서 우선순위를 뒤집으면 대부분 해소된다. LLM 이 그 필드를 통째로 빠뜨린 degrade 상황에서는
  여전히 한국어가 남는다.
- **`ko.json` ↔ 비-ko 표면의 나머지** — 결제 인접 밖은 아직 안 훑었다. §3-1 의 길이 비율로 후보를 좁혀 손으로 판정한다.

### E. 결정 대기 (사용자 확인 필요)

1. 웹소설 `/stories/` 45편을 범위 밖으로 두는 것 — **확인 안 받았다**(§1-2).
2. 1자 문자열(요일·지지·오행·조사)을 소스에서 고칠지 그대로 둘지 — 시각이 바뀐다(§6-3).
3. 워커 LLM 폴백 로케일화 — 유료 실패 경로다(위 D).
4. **`scripts/audit-tarot-prompt-maker-purchasers.mjs`** — 폐기된 "회당 결제 → 영구 해금" 전환을
   전제로 만든 읽기 전용 집계 스크립트. 전제가 사라졌으니 **삭제 후보**지만 요청 범위 밖이라 남겨 뒀다.

---

## 8. 사전 크기 — 분할 검토 시점이 왔다

| 파일 | 1단계 시작 | 1단계 종료 | 2단계 | 3단계 | **4단계(2026-08-25)** |
|---|---:|---:|---:|---:|---:|
| `public/i18n/en/shellRuntime.json` | 339KB | ~500KB | 480KB | 563KB | **577KB** |
| 코어 `public/i18n/en.json` | — | — | 770KB | 775KB | 757KB |

(코어가 3단계보다 작은 것은 그동안의 다른 PR 때문이지 이 작업 때문이 아니다. `ko/shellRuntime.json` 은
508KB 인데 역인덱스를 만드는 **원본**이라 한국어 사용자에게는 전송되지 않는다.)

한국어 사용자는 **한 바이트도 받지 않는다**(역인덱스가 `locale === "ko"` 에서 조기 반환).
비-ko 사용자는 자기 로케일 파일 하나만 받는다. **§7-A 를 다 넣으면 700KB 를 넘는다** — 그 지점에서
페이지별 네임스페이스 분할을 검토할 것.

분할안: `pageProse` 네임스페이스를 새로 만들고 **비-ko 에서만 로드**한다.
🔴 `REPAIR_NAMESPACE` 를 배열로 바꾸는 변경이 `lib/i18n/dictionary.ts` 와 `js/cd-lang-native.js`
**양쪽**에 필요하다(§2-1 의 이중 구현).

---

## 9. 도구 (커밋 안 됨) — 🔴 소실 위험

🔴 **정본 위치는 워크트리 `.claude/worktrees/locale-sweep-nonko/` 의 루트다.**
scratchpad 는 세션마다 사라지므로 1~4단계의 `tmp-*.mjs` 전량을 그 한 곳에 모아 두었다
(`.claude/worktrees/locale-sweep-part4/` 에도 같은 사본). **둘 다 워크트리라 언제든 지워질 수 있다 —
지우기 전에 다른 곳으로 옮길 것.** 3단계는 이미 한 번 이 사고를 겪었다(1단계 scratchpad 가 사라져
`routes-service.txt` 재현법이 어디에도 없었고, 그래서 `tmp-routes.mjs` 를 새로 만들어야 했다).

| 파일 | 용도 |
|---|---|
| `tmp-routes.mjs` | 🔴 **`dist/` 에서 서비스 라우트 목록을 재생성한다** |
| `tmp-locale-collect.mjs` | 라우트별 보이는 한국어를 고유 문자열로 접는다. **정본 측정 도구** |
| `tmp-locale-sweep.mjs` | 라우트별 한글 **개수**만 센다(우선순위 판단용) |
| `tmp-group.mjs` | 구간별 집계(법정 표기 제외) |
| `tmp-seg2.mjs` | 접두사별 집계 + 덤프. `/fortune/` 와 `/fortune-tea-house` 를 섞지 않으려면 이걸 먼저 |
| `tmp-dump-seg.mjs` | 저작용 덤프(`#N\t라우트수\t원문`) |
| `tmp-build-from-dump.mjs` | 덤프 + 번역표 → 저작본. **ko 를 덤프에서 가져오므로 오타로 죽은 키가 안 생긴다** |
| `tmp-expand-authored.mjs` | 4개 저작 로케일 → 12개(나머지 7개는 영어 복사) |
| `tmp-verify-authored.mjs` | 저작본 검사(§5-3) |
| `tmp-maxkey.mjs` | 🔴 **사전 12개에서 실제 최대 `f` 키를 잰다.** 저작 파일만 보면 키를 덮어쓴다(§5-1) |
| `tmp-check-runtime.mjs` | 🔴 **저작 전 필수** — 라우트에 언어 런타임이 있는지 전수 확인(§6-4) |
| `tmp-find-text.mjs` · `tmp-append-rows.mjs` | 링크로 갈린 묶음 찾기·덤프에 이어 붙이기(§6-2) |
| `tmp-diff-collect.mjs` | 두 수집본 비교 — **"새로 생긴 한국어 0" 판정 도구** |
| `tmp-scan-dead.mjs` | 저작본의 ko 원문이 병합 뒤 렌더에서 사라졌는지(죽은 키 검출) |
| `tmp-impact2.mjs` | 소스별 레버리지(§4-3) |
| `tmp-split-fortune.mjs` · `tmp-group-rotating.mjs` | `/fortune` 을 회전/고정으로 가르고 템플릿별로 묶는다 |
| `tmp-daily-coverage.mjs` · `tmp-daily-todo.mjs` | 일일 패키지 커버리지·미저작 문안(§4-4) |
| `tmp-check-varkeys.mjs` | 마커 변수 이름이 사전에 있는지 |
| `tmp-probe-repair.mjs` | dist 사전만 건드려 **빌드 없이** 치환 경로를 확인(원상복구까지) |
| `len-ratio-screen.mjs` · `number-mismatch-screen.mjs` | `ko.json` ↔ 비-ko 후보 좁히기(§3-1). 🔴 유럽식 `20.000` 자릿점을 안 걷어내면 오탐 316건 |
| `cdtext-audit.mjs` | `__cdText`·`cdTranslate`·`_cdPaymentI18n` 키 존재·폴백 일치. 🔴 계산식 폴백(`safeName + ' 님'`)은 오탐 |
| `shell-drift.mjs` | 셸 마커 ↔ `ko.json` 대조. 마커는 두 형태(`data-cd-trans="키"` / bare + `data-key`)라 둘 다 봐야 한다 |

🔴 `tmp-locale-collect.mjs` 는 `playwright` 가 필요하므로 **워크트리 루트에서** 실행한다.
나머지는 `node:fs` 만 쓰므로 어디서든 돈다.

---

## 10. 🔴 다시 하지 말 것 (1~4단계 누적)

**측정**
- **`?lang=` 렌더 측정에 `public/` 서빙** → App Router 페이지가 통째로 빠진다.
- **렌더 지터를 개선/악화로 읽기** → 라우트가중 ±320 은 노이즈. 판정은 "새로 생긴 0"·"죽은 키 0"(§4-2).
- **단계가 다른 문서의 수치를 가로질러 빼기** → 라우트 기준이 다르다(§0).

**저작**
- **런타임 없는 페이지에 사전 저작** → `/famous` 274개를 버렸다. 먼저 `tmp-check-runtime.mjs`.
- **저작 파일만 보고 다음 키 번호 정하기** → 살아 있는 키를 덮는다. `tmp-maxkey.mjs`(§5-1).
- **문서의 "다음 키 번호"를 분기점 확인 없이 쓰기** → 그 번호는 **특정 브랜치 위에서만** 참이다(§5-2).
- **남이 남긴 수집본으로 저작하기** → 소스가 이미 바뀌어 있다. 항상 새로 렌더한다(§5-3).
- **날짜처럼 매일 바뀌는 문자열 저작하기**(`2026년 8월 24일 월요일`) → 내일 죽은 키가 된다. 덤프에서 뺄 것.
- **1자 문자열 저작** → 역인덱스가 버려서 죽은 키가 된다(§6-3).
- **변수로 갈린 조각을 사전에 넣기** → 영어 화면이 더 이상해진다(§6-1).
- **링크로 갈린 조각을 하나만 번역하기** → 반쪽짜리 문장이 남는다. 묶음 전체를 한 배치에(§6-2).
- **개별 낱말을 사전에 넣기** → 역인덱스가 사이트 전체에서 그 낱말을 갈아치운다(§5-4).
- **앨범 사전을 상담 카드에 재사용** → `major_00_fool` 정방향 키워드는 같지만 **역방향이 다르다**
  (`현실 점검` vs `도피`). 겹쳐 쓰면 한국어 출력이 바뀐다.

**병합·마커**
- **`--core` 를 `--namespace` 없이** → `_moduleCopy-skeleton.json` 의 미완성 항목에서 멈춘다.
- **`--namespace shell` 로 병합** → 낡은 `kerryje` 키가 딸려 나온다. `shellCopy` 를 쓸 것(§3-2).
- **마커 키를 `shellRuntime` 네임스페이스에** → 마커는 코어 사전만 읽는다(§2-3).
- **`data-cd-vars` 에 한국어 값** → 번역문 안에 한국어가 남는다. `@키` 로.
- **상태를 가진 클라이언트 컴포넌트에 마커** → 리렌더가 되돌린다. `useTPick`(§2-2).

**환경·도구**
- **`git bash` 에서 `MSYS_NO_PATHCONV` 없이 `/구간` 인자 넘기기** → `/ziwei` 가
  `C:/Program Files/Git/ziwei` 가 되어 **0개 기록**으로 조용히 끝난다.
- **`git bash` 로 `git show <ref>:<path>`** → 경로가 망가져 조용히 실패한다. PowerShell 을 쓸 것.
- **인수인계 문서가 `main` 에 있다고 가정하기** → 미머지 PR 안에 있을 수 있다.
  `git log --all --oneline --diff-filter=A -- 'docs/handoff/locale-sweep*'` 로 찾을 것.
- **scratchpad 에 둔 `.mjs` 를 `node` 로 바로 실행** → 레포 밖이라 `playwright` 를 못 찾는다.
- **사전 수정 후 `npm run sync:public`** → `public/i18n/**` 은 미러 대상이 아니라 효과가 없고,
  `.ignore` 에 **날짜 박힌 줄**(`daily-2026-08-24.json`)이 3줄 들어간다. 되돌릴 것.
- **`verify:i18n-rendered-korean` 결과로 마크업 수정을 검증** → 그 하네스는 `public/` 을 서빙한다.
  루트 `index.html` 을 고쳐도 `sync:public` 전에는 반영되지 않아 사전 변경이 마크업 효과로 오독된다.
- **Bash 문자열 안에서 백틱·글로브를 쓴 패치 스크립트** → 명령 치환으로 깨진다. `.mjs` 로 쓰고 `node` 로 돌릴 것.
- **Jest 로 `lib/**/*.ts` 를 import** → 변환이 안 걸려 있다. 소스 검사나 `verify-*.mjs` 로.
- **`npx jest` 직접 실행** → `--experimental-vm-modules` 가 없어 152 스위트가 헛실패한다. `npm run test:jest`.
- **음성 테스트에 `git checkout`** → 그 파일의 미커밋 작업이 날아간다. 원문을 메모리에 들고 복원할 것.

---

## 11. 같은 PR 안에서 고친 버그 (기록)

1. **한국어 화면에 영어 궁 이름 누수** — 일일 패키지의 `sky_today.moon_sign` 은 영어("Virgo")만 주는데
   한국어 템플릿이 그대로 끼웠다(`달은 Capricorn 자리를 지납니다`). `zodiacNameKoFromEn()` 경유로 고쳤고
   `__tests__/fortune/korean-prose-has-no-latin-sign-names.test.js` 가 **소스의 한글 템플릿**을 검사한다
   (렌더 검사는 그날 달의 궁에 따라 우연히 통과할 수 있다).
2. **조사 하드코딩** — `${p.ruler}와` 가 `금성와`·`달와` 를 sign 24 × 기간 4 = 96편과 그 FAQPage
   구조화 데이터에 실었다. `withGwaWa()` 로 고쳤고 `verify:fortune-period-axis` 가 "보간 뒤 조사 하드코딩"을
   막는다. 괄호로 끝나는 값(`신자진 수국(水局)`)은 괄호를 떼고 받침을 본다.

머지된 PR 이력(#1068·#1070·#1071·#1078·#1080·#1082·#1086·#1088·#1089·#1099·#1107·#1109·#1115·#1116 …)은
`git log` 와 `gh pr list` 가 정본이다 — 여기 다시 적지 않는다.
