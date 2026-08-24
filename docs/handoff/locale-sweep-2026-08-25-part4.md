# 비-ko 화면 한국어 제거 — 4단계 인수인계 (2026-08-25)

> **이 문서만 읽고 시작할 수 있게 쓴다.**
> 방법론과 함정은 [nonko-surface-sweep-2026-08-24.md](nonko-surface-sweep-2026-08-24.md),
> 마커 기법과 `/fortune` 배선은 [locale-sweep-2026-08-24-part2.md](locale-sweep-2026-08-24-part2.md),
> 3단계 문서의 오류 정정과 저작 절차는 [locale-sweep-2026-08-24-part3.md](locale-sweep-2026-08-24-part3.md).
> 이 문서는 **3단계 문서의 A-2 앞 세 줄을 태운 기록과, 그 과정에서 드러난 3단계 문서의 문제 하나**다.

## 🔴 시작하기 전에 — 이 문서를 못 찾는 사고를 먼저 막는다

3단계 문서(`locale-sweep-2026-08-24-part3.md`)는 이 세션이 시작할 때 **`main` 에 없었다.**
아직 머지되지 않은 PR #1115 브랜치 안에만 있어서 `cat` 이 그냥 실패했다. 찾는 법:

```bash
git log --all --oneline --diff-filter=A -- 'docs/handoff/locale-sweep*'
# PowerShell 로 읽는다 — git bash 는 <ref>:<path> 를 경로로 망가뜨린다
git show <커밋>:docs/handoff/<파일>.md
```

**이 문서도 같은 상태다** — PR #1116(브랜치 `worktree-locale-sweep-part4`) 안에 있다.

### 그리고 그것보다 중요한 것: 분기점이 `main` 이 아니다

3단계 문서가 "다음 번호는 f3701" 이라고 적은 것은 **PR #1115 위에서만 참이다.**
`origin/main` 의 실제 최대 키는 `f3172` 였다. main 에서 분기해 f3701 부터 썼다면
**PR #1115 의 528키(f3173~f3700)와 통째로 충돌**한다.

같은 생성 파일(`public/i18n/**/shellRuntime.json`)을 건드리는 PR 은 main 에 병렬로 두지 않는다.
그래서 이 작업은 `origin/worktree-locale-sweep-part3` 위에 **스택**으로 쌓아서 시작했다.

**그런데 작업 중에 #1115 가 머지됐다**(2026-08-24T16:37Z). 부모 브랜치가 사라져 스택 PR 을 열 수 없었고,
`git rebase --onto origin/main 0084d8654` 로 이 두 커밋만 새 main 위에 옮겼다. **충돌은 없었다** —
main 이 이미 part3 의 내용을 갖고 있어서 트리가 일치했기 때문이다.
그러니 **이 PR 의 최종 base 는 `main`** 이고, `f3701` 은 그 위에서도 그대로 맞다.

🔴 **다음 세션의 분기점**: `#1116` 이 아직 안 머지됐으면 `worktree-locale-sweep-part4` 위에,
머지됐으면 `origin/main` 에서. 어느 쪽이든 **`tmp-maxkey.mjs` 를 그 분기점에서 다시 돌린다.**

```bash
node tmp-maxkey.mjs .    # 사전 12개에서 실제 최대 f 키를 잰다. 저작 파일만 보면 안 된다
```

2026-08-25 이 PR 이후 기준 **다음 번호는 `f4001`** 이다.

## 3단계 문서에서 못 쓴 것 — 도구 파일이 사라져 있었다

3단계 문서는 `routes-service.txt`(서비스 라우트 377개)와 `collect-c2.json` 을 전제로 절차를 적었는데,
둘 다 **1단계 세션의 scratchpad 에 있어서 이미 없었다.** 수집본은 어차피 새로 뜨는 것이 지시였지만
라우트 목록은 재현 방법이 어디에도 없었다.

그래서 만들었다 — `tmp-routes.mjs`. `dist/` 를 훑어 라우트를 뽑고, 자산·`admin`·`404/500`·
웹소설(`/stories/`)·인사이트(`/insights/`)와 **로케일 프리렌더 미러(`/en` `/ja` `/zh` `/zh-tw`)** 를 뺀다.

```bash
node tmp-routes.mjs tmp-routes-service.txt    # 2026-08-25 실측: 전체 744 → 서비스 359
```

🔴 **359는 3단계 문서의 377과 다른 수다.** 라우트 자체가 그동안 바뀌었고 미러 제외 기준도 내가 정한 것이라,
**3단계 문서의 라우트가중 수치와 이 문서의 수치는 직접 비교하면 안 된다.** 이 문서 안에서만 비교한다.

## 지금 상태 (2026-08-25 실측, PR #1116, 359개 서비스 라우트)

| 시점 | 라우트가중 | 고유 문자열 |
|---|---|---|
| 이 세션 시작 (PR #1115 머지 가정 상태) | 108,239 | 3,116 |
| **이 PR 이후** | **101,072** | **2,816** |
| 차이 | **−7,167 (−6.6%)** | −300 |

`tmp-diff-collect.mjs` 판정: **사라진 문자열 300개 · 새로 생긴 한국어 0개.**
`tmp-scan-dead.mjs` 판정: **죽은 키 0개**(저작 300개 전부 화면에서 실제로 치환됐다).

🔴 총합 −7,167 과 diff 의 −7,484 가 다른 이유: `/saju` 계열 36개 문자열의 **라우트 수가 1→2로 바뀌었다**(가중 +317).
이 변경과 무관한 **렌더 지터**다(수집기가 `waitForTimeout(1600)` 뒤에 읽으므로 지연 로드 구간이 회차마다 갈린다).
**노이즈 범위는 약 ±320 으로 보고 그 안의 차이는 개선/악화로 읽지 말 것.**

## 이 세션이 0으로 만든 구간

- **`/astrology`(+`/astrology-ai`) — 0.** 완전히 끝났다.
- `/fusion-fortune` 2,715 → **41**
- `/psychotest` 2,581 → **2**

저작본은 `i18n/authored/shellRuntime-{67,68,69}.json`, 키 300개(`f3701`~`f4000`).
**소스는 한 줄도 고치지 않았다** — 런타임 역인덱스가 전부 처리한다.

기존 사전 키는 하나도 지워지거나 바뀌지 않았음을 직접 확인했다(en 5,348 → 5,648, 제거 0 · 값 변경 0).
이 확인은 매번 해라 — 3단계 문서가 기록한 "살아 있는 키 115개를 덮을 뻔한" 사고가 정확히 이 지점이다.

```bash
node -e "const {execSync}=require('child_process');const fs=require('fs');
const b=JSON.parse(execSync('git show HEAD:public/i18n/en/shellRuntime.json',{maxBuffer:1e9}).toString('utf8')).shellRuntime;
const a=JSON.parse(fs.readFileSync('public/i18n/en/shellRuntime.json','utf8')).shellRuntime;
const rm=Object.keys(b).filter(k=>!(k in a));
const ch=Object.keys(b).filter(k=>k in a && b[k]!==a[k]);
console.log('제거',rm.length,'· 값 변경',ch.length);"
```

## 🔴 저작하지 않고 남긴 것 — 사전으로는 못 고친다

### 1. `/fusion-fortune` 의 `이 정보를 읽는 체계: <label>` 5건 (가중 41)

[app/fusion-fortune/FusionFortuneClient.tsx:126](../../app/fusion-fortune/FusionFortuneClient.tsx#L126) 의 `.sr-only` 다.
이 컴포넌트는 **자체 12로케일 카피 표**를 갖고 있어서 접두사(`fieldSystemsSrOnly`)는 이미 번역되는데,
`label` 은 `FUSION_ORB_BY_KEY[key].label`(한국어 상수)이라 그대로 남는다.

그래서 `?lang=en` 화면의 텍스트 노드가 `The systems that read this information: 사주 · 자미두수 · …` 로 굳는다.
이 문자열을 `ko` 로 삼아 사전에 넣으면 **영어 하나만 고쳐진다** — ja 는 `この情報を読み取る体系: 사주 …`,
zh 는 `解读此信息的体系：사주 …` 라 애초에 매칭이 안 된다.

**고치는 자리는 `label` 소스다.** 로케일 인지 라벨로 바꾸면 `title` 속성(스윕에 안 잡히는 자리)까지 같이 낫는다.
🔴 `FUSION_ORB_BY_KEY` 는 오브 시각 요소도 함께 쓰는 공유 상수이니 **`regression-scout` 를 먼저 돌릴 것**(원칙 7).

### 2. `/psychotest` 의 `분` 1건 (가중 2)

역인덱스는 공백 정규화 후 **2자 미만을 버린다.** 소요 시간 단위 라벨이라 소스에서 숫자와 합치지 않는 한 못 고친다.
3단계 문서의 이용약관 `을` 과 같은 성격이다 — **1자 문자열은 계속 쌓이고 있으니 언젠가 한 번에 처리할 것.**

## 🔴 로케일 범위는 확정됐다 — 저작은 4개, 나머지 7개는 영어 복사

**사용자 결정(2026-08-25): 영어·일본어·중국어(간체·번체)만 저작하고, 나머지는 영어로 채운다.**

- 손으로 쓰는 것: `en` · `ja` · `zh-CN` · `zh-TW` (`ko` 는 덤프에서 온다)
- 영어 복사: `vi` · `hi` · `es` · `fr` · `de` · `nl` · `ms` — `tmp-expand-authored.mjs` 가 한다

**길이와 무관하다.** `tmp-expand-authored.mjs` 의 주석은 "짧은 라벨에는 쓰지 말 것 — 12개를 제대로 쓰는 편이
싸다" 라고 말하지만 **그 주석이 방침보다 낡았다.** 실측으로도 1~3단계가 이미 그래 왔다 —
`shellRuntime-59`~`66` 의 12자 이하 항목 96개가 **96개 전부 `es === en`**, 즉 영어 복사다.
이 세션의 `/psychotest` 155개 짧은 라벨도 같다.

🔴 **다시 꺼내지 말 것.** 근거는 ①비-ko 표면에서 한국어보다 영어가 낫다는 것이 이 스윕의 전제이고
②12개 로케일 저작은 유료 LLM 실호출 없이는 비용이 선형으로 늘며(자동 번역기는 금지) ③같은 네임스페이스
안에서 규칙이 갈리는 편이 더 나쁘기 때문이다.
사전 패리티 가드는 키 집합 일치와 "비-ko 한글 없음"만 요구하므로 영어 복사로 통과한다.

## 남은 일 — 권장 순서

### A-3. 사전만으로 되는 구간 (기계적, 위험 0) — 3단계 문서 A-2 의 잔여

2026-08-25 재측정값이다. 절차는 3단계 문서의 "저작 절차" 그대로.

| 구간 | 가중 | 문자열 |
|---|---|---|
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
`/fortune-planner` 1,162 · `/love` 1,148 · `/calendar` 1,145 이 이어진다.

🔴 `tmp-dump-seg.mjs` 는 `sampleRoute` 의 **접두사 일치**로 자른다. `/vedic` 을 주면 `/vedic-ai` 와
`/vedic-astrology` 가 딸려 온다(이 세션도 `/astrology` 에 `/astrology-ai` 3건이 딸려 왔고, 그건 그대로 저작했다).
접두사를 줄 때 무엇이 딸려 오는지 `tmp-seg2.mjs` 로 먼저 확인할 것.

`/account` 은 8,466 으로 잡히지만 **사이트 공통 크롬과 법정 표기가 이 접두사로 묶여 들어온 것**이다
(고유는 1,335). 덤프를 열어 실제 `/account` 고유 문자열만 골라야 한다 — 3단계 문서와 같은 경고다.

### B. `/fortune` 25,844 (601 문자열)

여전히 가장 큰 덩어리다. 2단계 문서의 B 항목(점수 산출 근거 `basis` 배선 · 기간 FAQ 사전 저작)이 그대로 남아 있다.
**2단계 문서를 읽고 이어서 할 것.**

### C. 일일 패키지 · D. 손 안 댄 것 (`aria-label` 84곳 · 1자 문자열 · 워커 LLM 폴백)

2단계 문서의 C·D 가 그대로 남아 있다.

### 범위 밖 (사용자 결정)

`/high-value` 14,006 · `/famous` 4,958 · 인사이트 기사 · 웹소설 `/stories/`.
`/famous` 는 **언어 런타임이 없어서** 사전에 넣어도 화면이 안 바뀐다(1단계에서 274개를 버린 사고).

## 사전 크기 — 분할 검토 시점이 왔다

| 파일 | 2단계 | 3단계 | **지금(2026-08-25 실측)** |
|---|---|---|---|
| `public/i18n/en/shellRuntime.json` | 480KB | 563KB | **577KB** |
| 코어 `public/i18n/en.json` | 770KB | 775KB | 757KB |

(코어가 3단계 문서보다 작은 것은 그동안의 다른 PR 때문이지 이 작업 때문이 아니다 — 이 PR 은 코어를 건드리지 않는다.
`ko/shellRuntime.json` 은 508KB 인데, 이건 역인덱스를 만드는 원본이라 한국어 사용자에게는 전송되지 않는다.)

한국어 사용자는 한 바이트도 받지 않는다(역인덱스가 `locale === "ko"` 에서 조기 반환).
비-ko 사용자는 자기 로케일 파일 하나만 받는다. **A-3 를 다 넣으면 700KB 를 넘는다** — 그 지점에서
페이지별 네임스페이스 분할을 검토할 것.

## 도구 (커밋 안 됨)

🔴 **정본 위치는 워크트리 `.claude/worktrees/locale-sweep-nonko/` 의 루트다.**
이 세션의 새 도구도 거기에 복사해 두었고, `.claude/worktrees/locale-sweep-part4/` 에도 같은 사본이 있다.
**둘 다 워크트리라 언제든 지워질 수 있다.** 지우기 전에 옮길 것.

3단계 문서의 도구 표에 더해 이 세션이 새로 만든 것:

| 파일 | 용도 |
|---|---|
| `tmp-routes.mjs` | 🔴 **`dist/` 에서 서비스 라우트 목록을 재생성한다.** 사라진 `routes-service.txt` 를 대체 |
| `tmp-tr-fusion.mjs` · `tmp-tr-psycho.mjs` · `tmp-tr-astro.mjs` | 이번 세 구간의 번역표(용어 대조표가 주석에 있다) |

🔴 `tmp-locale-collect.mjs` 는 `playwright` 가 필요하므로 **워크트리 루트에서** 실행한다.
🔴 워크트리에서 `npm run build:cf` 를 돌리려면 `node_modules` 정션이 먼저 필요하다:
`cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"` (지울 때는 `rmdir` 로 링크부터 끊는다).

## 다시 하지 말 것 (3단계 문서 목록에 더함)

- **인수인계 문서가 `main` 에 있다고 가정하기** → 미머지 PR 안에 있을 수 있다. `git log --all --diff-filter=A` 로 찾을 것.
- **문서의 "다음 키 번호"를 분기점 확인 없이 쓰기** → 그 번호는 **특정 브랜치 위에서만** 참이다.
  분기점을 정한 뒤 그 자리에서 `tmp-maxkey.mjs` 를 돌린다.
- **`git bash` 로 `git show <ref>:<path>`** → 경로가 망가져 조용히 실패한다. PowerShell 을 쓸 것.
- **접두사 덤프에서 무엇이 딸려 오는지 안 보고 자르기** → `/vedic` 에 `/vedic-ai` 가 딸려 온다. `tmp-seg2.mjs` 먼저.
- **렌더 지터를 개선/악화로 읽기** → 라우트가중 ±320 은 노이즈다. 판정은 `tmp-diff-collect.mjs` 의
  "새로 생긴 문자열 0" 과 `tmp-scan-dead.mjs` 의 "죽은 키 0" 으로 한다.
