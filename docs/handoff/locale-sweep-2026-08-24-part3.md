# 비-ko 화면 한국어 제거 — 3단계 인수인계 (2026-08-24)

> **이 문서만 읽고 시작할 수 있게 쓴다.**
> 방법론과 함정은 [nonko-surface-sweep-2026-08-24.md](nonko-surface-sweep-2026-08-24.md),
> 마커 기법과 `/fortune` 배선은 [locale-sweep-2026-08-24-part2.md](locale-sweep-2026-08-24-part2.md).
> 이 문서는 **2단계 문서의 A 구간을 절반쯤 태운 기록과, 그 과정에서 드러난 2단계 문서의 오류 두 건**이다.

## 🔴 2단계 문서에서 틀린 것 — 그대로 따라 하지 말 것

### 1. "다음 키 번호는 f2890" 은 틀렸다. 실제는 **f3173** 이었다

2단계 문서는 `i18n/authored/` 안의 최대 키만 보고 다음 번호를 정했다. 그런데 **저작 파일 없이 사전에
직접 들어간 키가 있다** — PR #1107(나크샤트라 도감)이 `f2890`~`f3172` 를 `public/i18n/**/shellRuntime.json`
에 바로 썼고, `i18n/authored/` 에는 대응 파일이 없다(생성기가 커밋되지 않은 `tmp-gen-codex.mjs` 였다).

f2890 에서 시작해 병합했더니 **살아 있던 나크샤트라 키 115개가 조용히 덮였다.** `git diff` 에
`-` 줄로 나와서 잡았지만, 안 봤으면 그대로 나갔다.

🔴 **다음 번호는 저작 파일이 아니라 사전에서 직접 재라.** 도구를 남겼다:

```bash
node <scratch>/tmp-maxkey.mjs .      # 12개 로케일 전부를 훑어 최대 f 키 + 다음 번호를 찍는다
```

2026-08-24 이 PR 이후 기준 **다음 번호는 `f3701`** 이다. 쓰기 전에 위 명령으로 다시 확인할 것.

### 2. 2단계 문서의 수집본(`collect-c2.json`)은 이미 낡았다

`/terms-of-service` 구간의 문자열은 PR #1109(이용권 등급별 적용 가격 범위 상향)가 문단을 다시 써서
**그 수집본 시점 이후 화면에서 사라졌다.** 그 문자열로 저작했으면 54개 중 상당수가 죽은 키가 됐을 것이다.

🔴 **저작 전에 반드시 새로 렌더한다.** 수집본은 하루도 못 간다고 보는 편이 맞다.

```bash
npm run build:cf
node tmp-locale-collect.mjs <scratch>/routes-service.txt <scratch>/collect-XX.json en 6
```

`tmp-verify-authored.mjs` 의 "ko 원문이 렌더 목록에 있는가" 검사는 **넘겨준 수집본이 최신일 때만** 의미가 있다.
낡은 수집본을 주면 통과하면서 죽은 키를 만든다.

## 지금 상태 (2026-08-24 실측, PR #1115)

377개 서비스 라우트를 `?lang=en` 으로 재렌더해 센 "보이는 한국어 텍스트 노드"의 **라우트 가중 합**:

| 시점 | 라우트가중 |
|---|---|
| 2단계 문서 종료 시점 | 134,816 |
| 이 세션 시작 시 재측정 (main 기준) | **125,758** |
| 이 PR 이후 | **99,752** (−26,006, −20.7%) |

법정 표기 6,853자(사업자 등록 정보)는 이 숫자에서 제외했다 — **번역 대상이 아니다.**

시작 시 재측정값이 134,816 이 아닌 125,758 인 것은 정상이다 — 그 사이 `/ziwei` 를 제외한 다른 PR 들이
머지됐고, 무엇보다 **2단계 문서의 수치는 그날 그 브랜치의 dist 기준**이다.

## 이 세션이 0으로 만든 구간

`/ziwei` · `/terms-of-service` · `/privacy-policy` · `/refund-policy` · `/fpti` ·
`/master-love-codex` · `/today` · `/face-reading` — **전부 0**.

저작본은 `i18n/authored/shellRuntime-{59..66}.json`, 키 528개(`f3173`~`f3700`).
소스는 **한 줄도 고치지 않았다** — 런타임 역인덱스가 전부 처리한다.

## 남은 일 — 권장 순서

### A-2. 사전만으로 되는 구간 (기계적, 위험 0) — 2단계 문서 A 의 잔여

전부 런타임이 있고 마커도 필요 없다. 절차는 아래 "저작 절차" 그대로.

| 구간 | 가중 | 문자열 |
|---|---|---|
| `/fusion-fortune` | 2,715 | 88 |
| `/psychotest` | 2,580 | 159 |
| `/astrology` | 2,175 | 56 |
| `/naming-ai` | 2,129 | 47 |
| `/vedic` | 2,116 | 54 |
| `/about` | 2,039 | 62 |
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
| `/oracle` | 1,370 | 42 |
| `/methodology` | 1,364 | 24 |

`/account` 은 2,856 로 잡히지만 **최대 행이 `코드 데스티니 (Code Destiny)`(253 라우트)** 다 —
사이트 공통 크롬과 법정 표기가 이 접두사로 묶여 들어온 것이므로, 덤프를 열어 실제 `/account` 고유
문자열만 골라야 한다.

### B. `/fortune` 25,840 · C. 일일 패키지 · D. 손 안 댄 것

2단계 문서의 B·C·D 항목이 그대로 남아 있다. **그 문서를 읽고 이어서 할 것.**
`/high-value`(14,006) 와 `/famous`(4,958) 는 **범위 밖**(사용자 결정, 2단계 문서 참조).

## 저작 절차 (1회 반복)

```bash
# 0. 워크트리에 node_modules 정션 (build 를 돌리려면 필수)
cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"

# 1. 최신 렌더 확보 — 🔴 생략 금지
npm run build:cf
node tmp-locale-collect.mjs <scratch>/routes-service.txt <scratch>/collect.json en 6

# 2. 다음 키 번호 확인 — 🔴 저작 파일이 아니라 사전에서
node <scratch>/tmp-maxkey.mjs .

# 3. 덤프 → 번역표 작성 → 저작본
node tmp-dump-seg.mjs <scratch>/collect.json '/구간' <scratch>/seg.txt 0 200
#    tmp-tr-<이름>.mjs 에 번역만 적는다 (ko 는 덤프에서 온다 — 옮겨 적지 않는다)
node <scratch>/tmp-build-from-dump.mjs <scratch>/seg.txt <scratch>/tmp-tr-seg.mjs i18n/authored/shellRuntime-NN.json <시작번호>
node <scratch>/tmp-expand-authored.mjs i18n/authored/shellRuntime-NN.json
node <scratch>/tmp-verify-authored.mjs i18n/authored/shellRuntime-NN.json <scratch>/collect.json --expanded
node scripts/i18n-merge-authored.mjs --namespace shellRuntime

# 4. 병합 후 실측 — 🔴 여기까지 해야 "검증했다"
npm run build:cf
node tmp-locale-collect.mjs <scratch>/routes-service.txt <scratch>/collect-after.json en 6
node <scratch>/tmp-diff-collect.mjs <scratch>/collect.json <scratch>/collect-after.json   # 새로 생긴 한국어 0 확인
node <scratch>/tmp-scan-dead.mjs <scratch>/collect-after.json i18n/authored/shellRuntime-NN.json  # 죽은 키 0 확인

# 5. 빌드가 고친 추적 파일을 되돌린다
git checkout -- .ignore insights/rss.xml public/insights/rss.xml public/rss.xml rss.xml
```

🔴 `git bash` 에서 `'/구간'` 인자는 경로로 변환된다. `export MSYS_NO_PATHCONV=1` 을 먼저 준다
(안 주면 `/ziwei` 가 `C:/Program Files/Git/ziwei` 가 되어 **0개 기록**으로 조용히 끝난다).

🔴 `--core` 를 쓸 일이 있으면 반드시 `--namespace` 를 함께 준다(2단계 문서 참조).

## 링크로 갈린 조각 — 묶음을 닫지 않으면 반쪽만 번역된다

`<lead>[링크]<trail>` 로 갈린 문장은 조각 하나만 번역하면 **반은 영어 반은 한국어**가 된다.
그리고 `trail` 은 여러 페이지가 공유하는 경우가 있다.

이번에 닫은 묶음: `에서 확인할 수 있습니다.`(4 라우트) 는 `/privacy-policy` · `/advertising-policy` ·
`/account/delete` 세 곳의 문장이 공유한다. 세 lead 와 링크 라벨을 **한 배치에 같이** 넣어야 한다.

도구를 남겼다 — 다른 구간에 속한 조각을 덤프에 이어 붙인다:

```bash
node <scratch>/tmp-find-text.mjs <scratch>/collect.json "부분문자열" ...      # 묶음 찾기
node <scratch>/tmp-append-rows.mjs <scratch>/collect.json <scratch>/seg.txt <시작번호> "원문" ...
```

번역 시 분배는 로케일마다 다르다. 영어는 `trail` 이 `.` 한 글자로 줄고 `lead` 가 길어지는 경우가 많고,
ja/zh 는 한국어와 어순이 같아 `trail` 이 그대로 절로 남는다.

## 1자 문자열 — 이번에도 못 고쳤다

역인덱스는 공백 정규화 후 **2자 미만을 버린다.** 이용약관의 정액 이용 문장에 목적격 조사 `을` 이
독립 텍스트 노드로 있어(`</strong>을 <strong>`) 그 한 글자만 한국어로 남는다. 라우트 가중 2자.

고치려면 소스에서 노드를 합쳐야 하는데(`...이하의 기능을</strong>`), 그러면 조사 한 글자가
굵게 바뀐다. **약관 페이지의 시각 변경이라 사용자 판단이 필요하다고 보고 손대지 않았다.**

## 사전 크기 — 곧 분할을 검토해야 한다

| 파일 | 2단계 문서 시점 | 지금 |
|---|---|---|
| `public/i18n/en/shellRuntime.json` | 480KB | **563KB** |
| 코어 `public/i18n/en.json` | 770KB | 775KB |

한국어 사용자는 **한 바이트도 받지 않는다**(역인덱스가 `locale === "ko"` 에서 조기 반환).
비-ko 사용자는 자기 로케일 파일 하나만 받는다. 그래도 위 A-2 를 다 넣으면 700KB 를 넘는다 —
그 지점에서 페이지별 네임스페이스 분할을 검토할 것.

## 도구 (커밋 안 됨)

🔴 **정본 위치는 워크트리 `.claude/worktrees/locale-sweep-nonko/` 의 루트다.**
scratchpad 는 세션마다 사라지므로, 1~3단계의 `tmp-*.mjs` 전량을 이 한 곳에 모아 두었다.
그 워크트리를 지우면 도구도 같이 사라진다 — 지우기 전에 다른 곳으로 옮길 것.

2단계 문서의 도구 표에 더해 이 세션이 새로 만든 것:

| 파일 | 용도 |
|---|---|
| `tmp-maxkey.mjs` | 🔴 **사전 12개에서 실제 최대 f 키를 잰다.** 저작 파일만 보면 키를 덮어쓴다 |
| `tmp-find-text.mjs` | 부분 문자열로 수집본 행을 찾는다(링크 묶음을 닫을 때) |
| `tmp-append-rows.mjs` | 다른 구간의 조각을 덤프에 이어 붙인다 |
| `tmp-diff-collect.mjs` | 두 수집본 비교 — **"새로 생긴 한국어 0" 을 확인하는 도구** |
| `tmp-scan-dead.mjs` | 저작본의 ko 원문이 병합 뒤 렌더에서 사라졌는지 확인(죽은 키 검출) |

🔴 `tmp-locale-collect.mjs` 는 `playwright` 가 필요하므로 **워크트리 루트에서** 실행한다.
나머지는 `node:fs` 만 쓰므로 어디서든 돈다.

## 다시 하지 말 것 (2단계 문서 목록에 더함)

- **저작 파일만 보고 다음 키 번호를 정하기** → 살아 있는 키를 덮는다. `tmp-maxkey.mjs` 를 쓸 것.
- **남이 남긴 수집본으로 저작하기** → 소스가 이미 바뀌어 있다. 항상 새로 렌더한다.
- **`MSYS_NO_PATHCONV` 없이 `/구간` 인자 넘기기** → 0개 기록으로 조용히 끝난다.
- **링크로 갈린 조각을 하나만 번역하기** → 반쪽짜리 문장이 남는다. 묶음 전체를 한 배치에.
- **날짜처럼 매일 바뀌는 문자열 저작하기**(`2026년 8월 24일 월요일`) → 내일 죽은 키가 된다. 덤프에서 뺄 것.
