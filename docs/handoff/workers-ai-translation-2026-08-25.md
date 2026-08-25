# Workers AI 배치 번역 — 인수인계 (2026-08-25 시작)

> **이 문서만 읽고 이어서 시작할 수 있게 쓴다.**
> 무엇을 왜 번역하는지는 [content-translation-2026-08-25.md](content-translation-2026-08-25.md) 가 갖는다.
> 이 문서는 **매일 돌리는 배치의 운영 기록**이다.

## 🔴 하루치 실행 절차 (이것만 보면 된다)

```bash
# 0) 워크트리에서 돈다. 자격증명(.env.local·.env.cloudflare.local)은 저장소 루트에만 있고,
#    scripts/lib/workers-ai-rest.mjs 가 워크트리에서 루트를 되짚어 읽는다.

# 1) 오늘 남은 Neuron 확인 (00:00 UTC = 한국 09:00 에 리셋)
cat i18n/.translate-cache/neuron-ledger.json

# 2) 오늘치 배치. 예산에 닿으면 스스로 멈추고 exit 0 한다.
node scripts/i18n-translate-pending.mjs --namespace loveSimulationScenes \
  --provider workers-ai --locales en --neuron-budget 10000

# 3) en 이 다 차면(결손 0) 미저작 7개 로케일을 영어로 채운다 — API 호출 없음, 즉시 끝난다.
node scripts/i18n-translate-pending.mjs --namespace loveSimulationScenes \
  --provider workers-ai --locales en --mirror-en vi,hi,es,fr,de,nl,ms

# 4) 그다음 ja → zh-CN → zh-TW 순서로 --locales 를 바꿔 반복한다.

# 5) 검증하고 커밋한 뒤 아래 "진행 기록" 표에 그날 줄을 추가한다.
npm run i18n:check
git diff --numstat -- public/i18n/     # 추가만 / 삭제 0 이어야 한다
```

🔴 **배치는 실호출이고 과금 대상이다**(CLAUDE.md 절대 규칙 1). `.claude/hooks/guard-costly-commands.mjs`
의 `llm-batch-translate` 규칙이 승인창을 띄운다 — **훅을 고친 뒤에는 세션을 재시작해야 적용된다.**

🔴 **배치를 두 개 이상 동시에 돌리지 말 것.** Neuron 원장은 읽고-더하고-쓰는 방식이라 원자적이지
않다. 두 프로세스가 겹치면 서로의 기록을 덮어써 실제보다 적게 세고, 그 상태로 무료 한도를 넘기면
프로덕션의 Workers AI 폴백까지 그날 내내 에러로 죽는다. 로케일을 나눠 병렬로 돌리고 싶으면
원장을 파일 락이나 append-only 로 바꾸는 것이 선행돼야 한다.

**소요 시간 감각(실측)**: 50키 청크 하나에 **4~5분**. 하루 예산 10,000 Neuron ≈ **47청크 ≈ 4시간**.
전체(4개 로케일 376청크)는 **약 8일 · 누적 31시간**이다. 백그라운드로 돌려 놓고 다른 일을 하다가
끝나면 커밋하는 리듬이 맞다.

## 실측 단가 (2026-08-25)

| 항목 | 값 |
|---|---|
| 무료 할당 | **10,000 Neuron/일**, 00:00 UTC 리셋. 초과하면 요청이 **에러로 실패** |
| 모델 | `@cf/zai-org/glm-4.7-flash` (입력 5,500 / 출력 36,400 Neuron per M tokens) |
| 50키 청크 1개 | **약 210 Neuron**, 소요 **약 4~5분** |
| 로케일 1개(4,699키 = 94청크) | 약 **19,700 Neuron**, 약 **7시간** |
| 저작 4개 로케일 합계 | 약 **79,000 Neuron** → **약 8일** |

🔴 **추정치보다 비쌌다.** 계획 단계 추정은 52,000 Neuron/6일이었는데 실측은 79,000/8일이다.
원인은 `glm-4.7-flash` 가 추론 모델이라 **completion 토큰에 추론분이 섞여** 나오기 때문이다
(12키 짧은 제목 12개에 completion 1,724 토큰). 출력 단가가 입력의 6.6배라 이게 그대로 비용이 된다.

**청크를 키우는 것은 검토했고 하지 않았다** — 12키(753자) 대비 50키(3,175자)에서 내용이 4.2배인데
Neuron 은 3배였다. 이미 상당 부분 상각됐다는 뜻이라, 100키로 늘려도 15% 안팎이고 대신
"모델이 키를 하나씩 흘리는" 위험(코드 주석의 hi 로케일 사례)이 커진다.

## 무엇이 대상인가

`node scripts/i18n-extract-love-simulation.mjs` 가 소스에서 뽑아
`i18n/pending/loveSimulationScenes.ko.json` 으로 쓴다. **그 스크립트의 `TARGETS` 표가 정본**이다.

| scope | 소스 상수 | 키 | 한글 |
|---|---|---|---|
| `scenes` | `LOVE_SCENE_DEFINITIONS` (`_data/loveCodeMvp.ts`) | 3,840 | 94,830자 |
| `sceneTitles` | `LOVE_SCENE_TITLE_TRANSLATIONS.ko` | 320 | 2,212자 |
| `stories` | `LOVE_CHARACTER_STORIES` (`_data/loveCharacterStories.ts`) | 512 | 26,257자 |
| `storiesFallback` | `FALLBACK_LOVE_CHARACTER_STORY` | 27 | 466자 |
| | **합계** | **4,699** | **123,765자** |

**아직 추출 대상이 아닌 것**(다음 확장): 엔진의 해석 산문(`ELEMENT_LOVE_NARRATIVE` ·
`DAY_MASTER_LOVE_NARRATIVE` · 엔딩 이름 · 캐릭터별 조언), `LOVE_CHARACTERS` 의
`personality`·`speechStyle`·`likes`·`dislikes`·`conflictPattern`. 추출기 `TARGETS` 에 줄을 더하면
된다 — `missingKeysFor` 가 이미 채운 키를 건너뛰므로 늘려도 안전하다.

🔴 **영구 제외**: `buildSajuCompatibilityVerdict` 안의 한국어.
[scripts/verify-love-compat-determinism.mjs](../../scripts/verify-love-compat-determinism.mjs) 가
`buildSajuCompatibilityVerdict(profile: CompatibilityProfile)` 시그니처를 **문자 그대로** 단언한다
(궁합 결정론 계약). 카피를 인자로 못 받으므로 그 계약을 먼저 다시 설계해야 한다.

## 🔴 배선은 마지막에 한다 — 지금 배선하면 CI 가 계속 빨간불이다

정적 가드(`__tests__/ui/love-simulation-content-i18n.static.test.js`)는 배선된 키가 **12개 로케일
전부**에 있어야 통과한다. 번역이 다 차기 전에 배선하면 그날부터 아무것도 머지 못 한다.
그래서 **사전만 채우는 날들**은 가드와 무관하고 매일 초록불로 머지된다.

전부 찬 뒤 마지막 PR 에서 할 일:

1. `lib/i18n/scopedCopy.ts` 에 `dictionaryNamespace` 옵션 추가 → `useTPick(dictionaryNamespace)`.
   지금은 `useTPick()` 를 인자 없이 불러 **코어 사전만** 본다. 옵션 미지정 시 동작 불변이라
   찻집·인연의 서에는 회귀가 없다.
2. `_utils/loveSimCopy.ts` 에 네임스페이스 고정 껍데기 훅 추가.
3. 컴포넌트 배선 + `getLocalizedLoveScenes`·`LOVE_SCENE_TITLE_GENERIC` 정리.
4. 가드가 `public/i18n/<file>/<ns>.json` 도 읽게 한다.
5. **키 정합성 가드 신설**: 추출기가 뽑은 키 집합 == 가드가 발견한 배선 경로 집합.
   🔴 이게 없으면 "사전에는 번역이 있는데 화면은 한국어"가 되고 그건 아무 가드도 안 잡는다.

## 이번에 함께 고친 것 (도구 쪽)

- 🔴 **가드 구멍**: `guard-costly-commands.mjs` 가 `i18n-translate-pending.mjs` 를 못 잡고 있었다.
  실제 과금 호출을 하는 스크립트인데 규칙 10개 어디에도 안 걸렸다(`llm-endpoint` 는 **명령줄에**
  엔드포인트가 있어야 매치하는데 이 스크립트는 URL 을 소스에 갖고 있다). 규칙 추가 +
  훅 테스트에 케이스 6개(`--sample` 은 실제로 과금되므로 ASK, `--dry-run` 만 PASS).
- 🔴 **환각 키가 사전에 들어갔다**: `validate()` 는 요청 키가 다 왔는지만 보고, 적용 루프는
  `Object.entries(translated)` 를 순회했다 — 모델이 덤으로 만든 키가 그대로 `setDeep` 됐다.
  요청 키만 쓰도록 고쳤다.
- **캐시 키에 provider·model 추가**: 청크 내용만 해싱해서 Gemini 캐시를 Workers AI 실행이
  주워 썼다.
- **REST 러너에 타임아웃**: `AbortSignal.timeout` (기본 120초, `WORKERS_AI_TIMEOUT_MS`).
  워커 바인딩과 달리 REST 는 끊을 수 있다.
- **워크트리에서 자격증명을 못 읽던 문제**: `.env.local` 은 gitignore 라 워크트리에 없다.
  `.git` 파일의 `gitdir:` 로 저장소 루트를 되짚어 함께 읽는다.

## 진행 기록

| 날짜(UTC) | 로케일 | 적용 키 | 실패 | Neuron | 남은 결손 | 비고 |
|---|---|---|---|---|---|---|
| 2026-08-25 | ja | 100 | 0 | 488 | ja 4,599 | 캘리브레이션 겸 첫 배치 |
| 2026-08-25 | en | (진행 중) | | | | 오늘 예산 소진까지 |

## 품질 표본 (매일 몇 개씩 눈으로 볼 것)

가드는 **키 누락·자리표시자 증발·한글 잔존**만 잡는다. 말투·존대·고유명사는 기계가 못 잡는다.

2026-08-25 ja 표본 — 문제 없음:

| ko | ja |
|---|---|
| 조용해진 불빛 | 静まり返った光 |
| 쓴 디저트의 표정 | 苦いデザートの表情 |
| 트렌드보다 네 취향 | トレンドよりもあなたの好み |

🔴 **캐릭터 이름은 이미 확정된 표기가 있다**(`i18n/authored/shellRuntime-38.json` — en·zh 는 로마자,
ja 는 カタカナ). 장면 본문에 이름이 나오므로 표본에서 표기가 흔들리는지 반드시 확인할 것.
흔들리면 `i18n/glossary.json` 의 `terms` 에 이름을 추가해 프롬프트로 주입한다.
