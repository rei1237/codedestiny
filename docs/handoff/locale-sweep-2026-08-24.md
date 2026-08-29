---
status: done
updated: 2026-08-24
next: "1단계 방법론은 docs/handoff/nonko-surface-sweep-2026-08-24.md, 이어지는 큐는 part2~part4 로 넘어갔다"
---

# 로케일 스윕 인수인계 (2026-08-24)

> 이 문서만 읽고 이어서 시작할 수 있게 쓴다. 판단 근거와 **실패한 접근**까지 남긴다.
> 앞선 찻집 i18n 문서는 [fortune-tea-house-i18n.md](fortune-tea-house-i18n.md) — 이 문서는 그 위에 얹힌 셸·결과화면 작업이다.

## 이 세션이 한 일

| PR | 내용 | 실측 |
|---|---|---|
| #1068 | 타로 앨범 메이저 22장 로케일화 | 462키 × 12로케일. 한국어 출력은 78장 × 23필드 스냅샷 대조로 무변경 확인 |
| #1070 | 홈 타일·문라이트 패스 문구 11키 교정 | 10,000원 해금 타일을 "AI 상담"으로 설명하던 4키, "범위 밖 단건결제" 자리의 "KakaoTalk share reward" 등 |
| #1071 | `ko.json` ↔ 마크업 동기화 82키 + **재발 가드** | 마커 드리프트 85 → 0 |
| #1078 | 홈 렌더링 한국어 노출 제거 | `verify:i18n-rendered-korean` 100자 → 33자, 마커 없는 잔존 0 |
| #1080 | 찻집 i18n 핸드오프 문서 실측 갱신 | — |
| #1082 | 홈 하단 패스 블록 10키 | ja `合格範囲`(합격 점수 범위)·"자동결제 없는 30일권" 고지 소실 |
| #1086 | VVIP 아카이브 5키 | 유료 상품 구성이 ko 3개 체계 vs en 5개로 갈려 있었다 |
| #1088 | 타로 프롬프트 라이브러리 영구 해금 표기 제거 | 타일이 실제 청구액(₩5,000)의 2배를 광고 |
| #1089 | 찻집 상담 결과 결정론 조각 로케일화 | 260키 + 순수 함수 + 테스트 5개 |

#1089 를 뺀 나머지는 머지됐다. #1089 상태는 `gh pr view 1089` 로 확인할 것.

## 지금 상태 (실측, 2026-08-24)

```bash
node --test __tests__/ui/shell-dictionary-parity.static.test.js   # 4/4 — 마커 1,697개 ↔ ko.json
npm run verify:i18n-rendered-korean                                # 33자(사업자 등록 정보만) · 마커X 0
npm run test:node                                                  # 470/470
```

- **셸 마커 표면은 끝났다.** 마크업 ↔ `ko.json` 드리프트 0, 가드가 `test:node` 로 항상 돈다.
- **가격 숫자**는 12개 로케일 전수 대조 결과 불일치 0(유럽식 `20.000` 자릿점까지 정규화해 재확인).

## 🔴 다음 세션이 알아야 할 것

### 1. 드리프트 표면은 셋이고, 가드는 하나만 덮는다

| 표면 | 상태 | 자동 판정 |
|---|---|---|
| 셸 마크업 ↔ `ko.json` | **0건** | ✅ `__tests__/ui/shell-dictionary-parity.static.test.js` |
| `ko.json` ↔ 나머지 11개 로케일 | 결제 인접 3블록 처리 완료, 나머지는 미확인 | ❌ **불가능**(뜻 비교가 필요) |
| JS 폴백(`__cdText`·`cdTranslate`·`_cdPaymentI18n`) | **깨끗**(키 139 / 누락 0 / 불일치 2 — 비분리 공백뿐) | 없음 |

두 번째 표면은 손으로 훑는 수밖에 없다. 후보를 좁히는 법: ko/en 길이 비율(중앙값 2.06배)에서 크게 벗어난 키부터. 다만 상위 대부분은 **영어가 장황할 뿐인 정상**이라 오탐이 많다 — 실제로 잡힌 건 `home.passMini.*`·`home.passFooter.*`·`home.premiumArchive.*` 세 블록뿐이었다.

### 2. 저작 네임스페이스를 `shellCopy` 로 따로 뗀 이유

🔴 **`node scripts/i18n-merge-authored.mjs --namespace shell --core` 를 쓰지 말 것.** `i18n/authored/shell-01.json` 에 마크업에서 이미 사라진 낡은 키(`shell.moonHeroCopy.moonHeroActions.kerryje`)가 남아 있어, 병합하면 무관한 값이 함께 뒤집힌다. 셸 문구 교정은 **`i18n/authored/shellCopy-*.json` + `--namespace shellCopy`** 로 한다.

### 3. 같은 키를 두 저작 파일에 두지 말 것

파일은 정렬 순으로 처리돼 **나중 파일만 이기고 앞 파일은 조용히 죽은 값**이 된다. `shellCopy-02` 의 `mascotAria`·`mascotAlt` 가 `shellCopy-04` 와 겹쳐 실제로 그랬고, PR #1082 에서 앞쪽을 제거했다.

### 4. 같은 마커 키가 서로 다른 원문 두 곳에 붙은 경우가 3건 있다

| 키 | 원문 A | 원문 B |
|---|---|---|
| `home.hero2.primaryCta` | ✦ 무료로 오늘의 운세 보기 (히어로) | ✦ 무료 운세 시작하기 (스티키 CTA) |
| `common.goHomeScreen` | 🏠 홈화면 바로가기 | 홈화면 바로가기 |
| `shell.lifebookTileInner.lifebookTileLabelRow.n30000` | 전문가 상담 · 30,000원 | 상담 시 30,000원 |

비한국어에서는 두 자리가 **같은 문자열**로 렌더된다. 가드는 "원문 중 하나와 일치"로 판정하므로 통과한다. 갈라야 한다면 키를 나눠야 하고 그건 `index.html` 수정이다.

### 5. `index.html` 을 고치면 따라오는 것

- `npm run sync:public` **필수** — 캐시버스트 키가 회전해 셸 7벌 + JS 미러가 파일당 87~109줄로 바뀐다. 이건 정상이고 CI 가 커밋을 강제한다
- `.ignore` 가 개행만 뒤집혀 나오면 `git checkout -- .ignore` 로 되돌린다(내용 무변경)
- 🔴 **`js/destiny-profile.js` 내용까지 바뀌었다면** `?v=` 핀 25곳을 함께 올려야 한다 — 독립 정적 페이지 23개 + `app/_lib/billing-client.ts` 의 `PAID_SERVICE_RUNTIME_SRC` + `scripts/verify-paid-gate-ui-regression.mjs:206` 의 기대 문자열. `verify:payment-choice-parity` 가 기대값을 알려준다. `billing-client.ts` 는 결제 동결 대상이라 `node scripts/verify-payment-freeze.mjs --update` 도 같은 커밋에

### 6. 결과 화면 로케일화의 계약

`src/features/fortune-tea-house/lib/localizeConsultResult.ts` 는 **payload 를 건드리지 않는다.** 저장·공유·워커 프롬프트의 정본은 계속 한국어 id 데이터이고, 사전 조회는 렌더 직전에만 일어난다.

🔴 한국어 불변식: **사전 값이 소스와 같을 때 출력은 입력과 완전히 같아야 한다.** `__tests__/ui/tea-house-result-localization.static.test.js` 가 `deepEqual` 로 잠근다. 새 필드를 이 함수에 넣을 때 그 테스트가 깨지면 한국어 화면이 바뀐다는 뜻이다.

## 남은 일

### A. 결정 대기 (사용자 확인 필요)

1. **`/fortune/`·`/famous/` 허브** — `<html lang="ko">` 에 언어 엔진 자체가 안 실려 모든 로케일에서 한국어만 나온다(각 1,431자 / 5,317자). `scripts/build-fortune-hub-shell.mjs` 가 만든다. **의도적인 한국어 SEO 자산으로 보여 그대로 두는 쪽을 추천**했고 아직 답이 없다.
2. **`scripts/audit-tarot-prompt-maker-purchasers.mjs`** — 폐기된 "회당 결제 → 영구 해금" 전환을 전제로 만든 읽기 전용 집계 스크립트. 전제가 사라졌으니 삭제 후보지만 요청 범위 밖이라 남겨 두었다.

### B. 이어서 하면 되는 것

1. **`saju.cautionReading`·`saju.actionPrescription`** — id 가 없는 고정 문장이라 id 조회로는 못 고친다. 시트가 `cautionReading || caution` 순으로 읽는데 `caution` 은 LLM 이 채우므로 사용자 언어다 → **비한국어에서 우선순위를 뒤집으면** 대부분 해소된다. LLM 이 그 필드를 통째로 빠뜨린 degrade 상황에서는 여전히 한국어가 남는다.
2. **워커 자체의 한국어 폴백** — `worker/routes/fortune-tea-house.js:2577` 기본 `oneLineAdvice`, `buildFallbackSajuDeepSections`, `buildFallbackCardDetail`. 워커는 `getAmbientAiLocale()`(`worker/lib/ai-locale-context.js:27`)로 로케일을 이미 알고 있고 같은 파일 412줄에서 그것으로 분기한다. **유료 흐름의 실패 경로 동작 변경이라 착수 전 확인이 필요하다.**
3. **`ko.json` ↔ 비-ko 표면의 나머지** — 결제 인접 밖은 아직 안 훑었다. 위 1번의 길이 비율 방법으로 후보를 좁혀 손으로 판정한다.

## 도구 (scratchpad, 커밋 안 됨)

`C:\Users\user\AppData\Local\Temp\claude\d--Development-code-destiny\3e0781e6-c802-4e75-a993-46b11e9923b9\scratchpad\`

| 파일 | 용도 |
|---|---|
| `shell-drift.mjs` | 셸 마커 ↔ `ko.json` 대조. `--quiet`·`--json` 지원. 마커는 두 형태(`data-cd-trans="키"` / bare + `data-key`)라 둘 다 봐야 한다 |
| `cdtext-audit.mjs` | `__cdText`·`cdTranslate`·`_cdPaymentI18n` 호출의 키 존재·폴백 일치 검사. 🔴 계산식 폴백(`safeName + ' 님'`)은 "폴백 없음"으로 잡히니 오탐으로 세지 말 것 |
| `len-ratio-screen.mjs` | ko/en 길이 비율 이상치 — 뜻 갈림 **후보**만 좁힌다 |
| `number-mismatch-screen.mjs` | 숫자 집합 불일치. 🔴 유럽식 `20.000` 자릿점을 안 걷어내면 오탐 316건이 나온다 |
| `verify-authored.mjs` | 저작 파일 검사(누락 로케일·비-ko 한글·타 문자체계·CJK 속 라틴어·플레이스홀더 불일치·ko↔소스 일치) |
| `expand-authored.mjs` | ko/en/ja/zh-CN/zh-TW 5개만 쓴 압축 저작본 → 12개 로케일로 펼침. **`fortuneTeaHouse` 네임스페이스 전용**(vi/hi/es/fr/de/nl/ms = 영어 복사 방침). `shell*` 네임스페이스는 7개도 실번역이 있으므로 쓰지 말 것 |
| `wait-ci.sh` | `bash wait-ci.sh <PR#>` — pending 이 사라질 때까지 폴링 |

## 실패했던 접근 (다시 하지 말 것)

- **`verify:i18n-rendered-korean` 결과로 마크업 수정을 검증하려 했다** → 그 하네스는 `public/` 을 서빙한다. 루트 `index.html` 을 고쳐도 `npm run sync:public` 전에는 반영되지 않아, 사전만 바꾼 것이 마크업 수정 효과로 오독됐다.
- **`--namespace shell` 로 병합** → 낡은 `kerryje` 키가 딸려 나왔다. 위 2번 참고.
- **앨범 사전을 상담 카드에 재사용하려 했다** → `major_00_fool` 기준 정방향 키워드는 같지만 **역방향은 다르다**(`현실 점검` vs `도피`). 두 데이터는 용도가 달라 겹쳐 쓰면 한국어 출력이 바뀐다.
- **Bash 문자열 안에서 백틱·글로브를 쓴 패치 스크립트** → 명령 치환으로 깨진다. 여러 줄 패치는 scratchpad 에 `.mjs` 로 쓰고 `node <파일>` 로 돌릴 것.
