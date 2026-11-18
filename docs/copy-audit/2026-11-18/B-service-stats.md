# B. 서비스 문구 통계 진단 (2026-11-18)

진단만 했고 소스는 바꾸지 않았다. 기준과 표 형식은 [README](README.md)를 따른다. 적용한 기준은 sepia professional-pass(#2 밀도, #6 서식 신호: 장식 이모지, #8 템플릿화, #9 리듬)와 style-pass §2–3·§5, 그리고 README의 한국어 보정 규칙이다.

## 1. 범위·방법·정밀도 한계

### 범위

- **i18n ko 값**: `i18n/authored/*.json` 250개 파일에서 키 객체의 인라인 `ko` 문자열 13,076개를 node로 전부 추출했다. `_`로 시작하는 키(`_comment` 등)는 뺐다.
- **하드코딩**: `git ls-files app components src lib js index.html` 중 `.js/.jsx/.ts/.tsx/.mjs/.cjs/.html` 2,300개 파일을 봤다.
  - 제외한 경로 패턴: `__tests__`, `.test.`, `.spec.`, `generated`, `.min.`, `/public/`, `data/novel`, `fixtures/`
  - 한글이 든 문자열 리터럴(`'…'`, `"…"`, `` `…` ``)과 JSX 텍스트(`>…<`)를 153,154개 뽑았다.
- **고노출 화면 중복**: 다른 에이전트가 맡은 고노출 화면(캐릭터·세계관·유료 기능)은 파일 단위로 깔끔하게 나눌 수 없었다. 그래서 집계에서 빼지 않고, 상위 파일 표의 비고에 "타 리포트 영역"으로 표시했다.
- `worker/`는 요청 대상 밖이라 보지 않았다. baseline에는 `worker` 14,898건이 잡혀 있다.

### 방법

- 각 문자열에 아래 정규식을 돌려 매치 수를 셌다. 한 문자열에서 여러 번 맞으면 모두 센다.

| 유형 | 정규식 |
|---|---|
| 번역투 | `에 의해\|로 하여금\|[을를] 통해\|에 대한\|에 대해\|하는 것이 가능\|되어지\|되어집\|적인 [가-힣]+적` |
| 추상어 | `여정\|운명의 실타래\|에너지의 흐름\|인사이트\|깊은 울림\|특별한 경험\|새로운 차원\|마법 같은\|비밀을 풀\|잠재력` |
| 과장·보장 | `100%\|반드시 이루\|운명이 바뀝\|완벽한\|정확한 예측\|확실히` |
| 불안 자극 | `놓치면\|지금 아니면\|위험해\|큰일` |
| 이모지 장식 | `\p{Emoji_Presentation}` 또는 `\p{Extended_Pictographic}`+U+FE0F 중 🌸·🦁을 뺀 것 |
| 비책류 | `비책\|비법\|비결` 중 "연애 비책"을 지우고도 남는 것 |

- **어미 반복**: 문장이 3개 이상인 ko 값 416개를 `[.!?。]` 뒤 공백이나 줄바꿈으로 나눴다. 끝 어미(니다/어요/세요/요/다/죠 등)를 뽑아 같은 어미가 3번 연속되는 값을 셌다.
- 스크립트는 스크래치패드에만 두었다. 저장소에는 이 리포트 하나만 썼다.

### 정밀도 한계 (실측과 추정 구분)

- **주석 제외는 근사치다.** 줄 단위 상태 기계로 처리했다.
  - 제외한 것: `//`로 시작하는 줄, `/* */`와 `<!-- -->` 블록, `console.*`·`throw new Error`·`logger.`가 있는 줄.
  - 줄 끝 `//` 주석은 그 뒤에 따옴표가 없을 때만 잘랐다. 그래서 문자열 뒤에 붙은 한국어 주석 일부가 남았을 수 있다.
  - 여러 줄 템플릿 리터럴 안의 줄은 따옴표가 없어 줄 전체를 1건으로 셌다.
- **사용자 문구가 아닌 것도 섞였다.**
  - LLM 프롬프트: `lib/ai-engine.js`, `js/compat-llm-prompts.js`, `lib/fortune/consultation-counsel.mjs` 등
  - 정규식 리터럴: `LoveSecretAiResultClient.tsx:809`, `lib/cms/home-copy.mjs:6`의 금지어 목록
  - 인명: `celebrity-data.ts:167` "윤여정"이 "여정"에 걸렸다.
  - 이 중 프롬프트 파일은 대표 예시를 고를 때 걸렀다. 건수에서는 빼지 않았다.
- **오탐이 큰 유형이 있다.**
  - 불안 자극: 하드코딩 72건 대부분이 노래 가사(`musicLyrics.ts` 32건)와 연애 시뮬레이션 대사(`loveCodeMvp.ts` 12건)다. 이야기 속 대사라서 서비스의 불안 조장과 다르다.
  - 과장·보장: "완벽한"(하드 117, i18n 8)은 대부분 "완벽한 X보다 Y" 같은 반(反)완벽주의 조언이다. 진짜 보장 문구는 소수다.
  - "100%"(30건): 환불 고지(`billing-client.ts:3066` "100% 환불")와 금지어 정규식이 섞여 있다.
- **같은 문구가 여러 곳에 있다.** `index.html`·`js/*`·`src/*`가 같은 문구를 중복 보유한 경우가 있어 하드코딩 건수가 부풀려졌다. 예: 타로 앨범 문구가 `tarotAlbumStories.ts`와 i18n `fortuneTeaHouse-42`에 함께 있다.
- **4000자를 넘는 줄 4개는 건너뛰었다.** `index.html:8995·9000·9001`, `js/core/tarot/master-reading-data.mjs:3`. 정규식 백트래킹 때문이다.
- **단위가 baseline과 다르다.** 하드코딩 단위는 "리터럴 조각"이고, `i18n/hardcoded-korean-baseline.json`(총 106,786, worker 포함)과는 단위가 다르다. 참고로 baseline 영역별 값은 app 34,808 / js 33,689 / lib 15,396 / src 5,822 / components 2,173이다.
- **어미 반복은 과소 집계다.** 해요체는 `어요/세요/예요/해요`를 서로 다른 어미로 봤다. 그래서 탐지된 연속은 사실상 "~니다" 3연속뿐이다.

## 2. 유형별 건수

| 유형 | i18n ko 매치 | i18n 파일 수 | 하드코딩 매치 | 하드코딩 파일 수 | 세부 (하드코딩) |
|---|---:|---:|---:|---:|---|
| 이모지 장식 | 202 | 15 | **1,545** | 69 | ✨171 🌙52 🔮48 ⚠41 📋40 🐷35 🧭33 🔥29 🔒29 🌟28 |
| 번역투 | 52 | 34 | **712** | 160 | 에 대한 349, 을 통해 194, 를 통해 103, 에 대해 47, 에 의해 6, 적인~적 12, 되어지 1 |
| 추상어 | 15 | 12 | 344 | 100 | 인사이트 208, 여정 65, 잠재력 65, 에너지의 흐름 5, 특별한 경험 1 |
| 과장·보장 | 10 | 7 | 181 | 56 | 완벽한 117, 확실히 34, 100% 30 |
| 불안 자극 | 0 | 0 | 72 | 24 | 위험해 41, 놓치면 19, 큰일 12 (대부분 가사·대사) |
| 비책류(연애 비책 외) | 3 | 3 | 20 | 9 | 토정비결(고유명사) 다수, 비책 5, 비결 4, 비법 1 |
| 어미 반복(~니다 3연속) | 195 / 416값 (47%) | 37 | — | — | 문장 3개 이상 ko 값만 대상 |

- i18n 매치 4종(번역투·추상어·과장·이모지)을 합하면 279건이다. ko 값 13,076개 대비 약 2% 수준이다.
- 하드코딩은 매치 수 자체가 i18n의 10배 이상이다. 결함 대부분이 i18n 밖에 있다.
- 어미 반복은 장문 설명 값의 절반 가까이에서 나온다. 예외적 결함이 아니라 문체 기본값으로 굳어 있다.

## 3. 파일별 상위

### i18n (유형별 상위 10)

| 유형 | 상위 파일 (매치 수) |
|---|---|
| 번역투 | shellRuntime-62 (5), shellRuntime-09 (3), shellRuntime-59 (3), shellRuntime-60 (3), fortuneTeaHouse-47 (2), freeHubDetails-01 (2), globalReading-01 (2), legacyFeatures-01 (2), shellRuntime-46 (2), shellRuntime-55 (2) |
| 추상어 | fortuneTeaHouse-42 (3), shellRuntime-08 (2), destinyFlower-04, shellCopy-02, shellCopy-15, shellRuntime-01, shellRuntime-20, shellRuntime-31, shellRuntime-32, shellRuntime-57 (각 1) |
| 과장·보장 | fortuneTeaHouse-35 (2), shellRuntime-31 (2), shellRuntime-63 (2), fortuneTeaHouse-34, fortuneTeaHouse-41, shellRuntime-27, shellRuntime-29 (각 1) |
| 이모지 장식 | shellRuntime-19 (63), _moduleCopy-skeleton (34), sajuCompat-01 (26), fortuneTeaHouse-09 (18), destinyFlower-03 (16), legacyTitles-01 (12), shellRuntime-11 (11), shell-05 (9), oracleDetails-01 (4), shellRuntime-10 (4) |
| 어미 반복 | shellRuntime-25 (41값), shellRuntime-50 (14), shellRuntime-64 (14), shellRuntime-51 (13), shellRuntime-59 (12), shellRuntime-65 (11), shellRuntime-33 (10), shellRuntime-42 (9), shellRuntime-34 (8), shellRuntime-67 (7) |

### 하드코딩 (유형별 상위 10)

| 유형 | 상위 파일 (매치 수) | 비고 |
|---|---|---|
| 번역투 | app/insights/articles.js (91), app/insights/seo-growth-articles.js (60), js/saju-engine-tarot-sukuyo-quantum.js (57), lib/tarot/rich-card-meanings.mjs (47), js/saju-engine.js (20), index.html (19), src/features/psychotest/data/testData.ts (18), lib/famous-saju/celebrity-saju-service.ts (17), lib/sukuyo-engine-server.ts (17), app/insights/adsense-ready-articles.js (16) | insights 3파일이 167건이며, SEO 아티클 본문이다 |
| 추상어 | app/insights/articles.js (21), app/insights/[slug]/page.js (19), app/insights/page.js (17), app/insights/seed-articles.js (17), js/saju-engine.js (15), app/insights/adsense-ready-articles.js (13), app/insights/InsightTopicArchive.jsx (11), app/insights/InsightsCosmicClient.js (11), js/saju-engine-tarot-sukuyo-quantum.js (11), app/saju/animal-destiny/engine/localSajuCalculator.ts (9) | "인사이트"가 섹션명(insights)이라 구조적으로 반복된다 |
| 과장·보장 | app/saju/love-simulation/_data/loveCodeMvp.ts (21), js/saju-engine-tarot-sukuyo-quantum.js (21), app/insights/adsense-ready-articles.js (11), js/saju-engine.js (11), app/saju/love-simulation/_data/loveCharacterStories.ts (10), app/music/_data/musicLyrics.ts (8), src/features/psychotest/data/testData.ts (8), app/insights/seo-growth-articles.js (7), app/insights/articles.js (5), js/entertain-engine.js (5) | love-simulation은 타 리포트 영역(캐릭터 대사) |
| 불안 자극 | app/music/_data/musicLyrics.ts (32), app/saju/love-simulation/_data/loveCodeMvp.ts (12), lib/tarot/rich-card-meanings.mjs (4), app/insights/articles.js (3), lib/tarot/sun-recovery-card-copy.mjs (2), app/_lib/ziwei-consultation-narrative.ts, app/_lib/ziwei-deep-reading.ts, app/components/daily-card/DailyCard.tsx, app/components/ziwei/_lib/advanced-ziwei-reading.ts, app/insights/adsense-ready-articles.js (각 1) | 가사·대사가 61%로 대부분 오탐 |
| 이모지 장식 | js/saju-engine.js (351), index.html (190), js/saju-engine-tarot-sukuyo-quantum.js (123), js/luck-sync-diary.js (84), js/compat-llm-prompts.js (70), app/oracle/sikojen-povailu/data/shapes.ts (57), js/share.js (54), js/tarot-reunion-experience.js (52), js/core/saju/reportDashboard.js (39), app/saju-guardian/SajuGuardianClient.tsx (37) | compat-llm-prompts는 프롬프트 |

### 가장 심한 파일 (유형 합산 기준, 오탐 많은 가사·대사 제외)

1. **js/saju-engine.js**: 이모지 351, 번역투 20, 추상어 15, 과장 11, 비결 3. 레거시 사주 엔진의 결과 HTML이다.
2. **js/saju-engine-tarot-sukuyo-quantum.js**: 이모지 123, 번역투 57, 과장 21, 추상어 11.
3. **app/insights/articles.js**: 번역투 91, 추상어 21, 과장 5, 불안 3. SEO 아티클이다.

## 4. 유형별 대표 예시

| 위치 | 원문 | 문제 유형 | 수정안 | 우선순위 | 비고 |
|---|---|---|---|---|---|
| **번역투** | | | | | |
| i18n/authored/shellRuntime-62.json:shellRuntime.f3378 | 초과분에 대한 결제수단이 안내됩니다 | 번역투(에 대한·피동) | 초과분은 다른 결제수단으로 이용할 수 있게 안내해요 | P1 | 결제 고지. 결제 파일 밖이지만 결제 문구라 법무 확인 필요. 번역 동기화 필요 |
| i18n/authored/shellRuntime-60.json:shellRuntime.f3300 | 고객센터를 통해 환불 요청이 가능합니다 | 번역투(을 통해·하는 것이 가능) | 고객센터에서 환불을 요청할 수 있습니다 | P1 | 환불 고지. 의미 동일 |
| i18n/authored/shellRuntime-59.json:shellRuntime.f3185 | 사용자는 이를 통해 당장 붙잡아야 할 기회와… 구분할 수 있습니다 | 번역투(을 통해)·주어 "사용자는" | 이 명반으로 당장 붙잡을 기회와… 가려낼 수 있습니다 | P2 | 화자가 사용자를 3인칭으로 부름 |
| js/inline/saju-core-bootstrap.js:474 | 체제와 인간 폭력성에 대한 날카로운 통찰이 특징입니다 | 번역투(에 대한)·추상 | 체제와 인간의 폭력성을 날카롭게 꿰뚫어 봅니다 | P2 | 하드코딩 — 이동하지 않음 |
| js/saju-engine.js:18926 | 각 궁에 대한 해석이 나옵니다 | 번역투(에 대한) | 궁마다 풀이가 열려요 | P3 | 하드코딩 |
| **추상어** | | | | | |
| i18n/authored/shellCopy-02.json:home.aiFeats.title | CODE DESTINY 전문가의 특별한 경험 | 추상어(특별한 경험)·기능 설명 부족 | 제안: 무엇을 하는지 쓰기(예: "전문가가 명식을 직접 풀어 드려요") | P1 | 홈 섹션 제목. 레이아웃 ±20% 초과 가능. 브랜드명 표기 확인 필요(꿀꿀 운세) |
| i18n/authored/shellCopy-15.json:home.myGarden.emptyDescription | 프로필을 만들고 나를 알아가는 여정을 시작해요. | 추상어(여정) | 프로필을 만들면 내 사주 풀이가 여기에 모여요. | P2 | `index.html:8884`에 같은 문구 하드코딩. 번역 동기화 필요 |
| i18n/authored/shellRuntime-08.json:shellRuntime.f42 | 운명 인사이트 허브 | 추상어(인사이트) | 운세 읽을거리 모음 | P3 | insights 섹션명과 맞물림. 의도 확인 필요 |
| js/saju-engine-tarot-sukuyo-quantum.js:661 | 역마의 여정이 완성의 지점에 도달합니다. 이 이동이 당신의 인생을 한 단계 끌어올립니다. | 추상어·과장(확정 예언) | 옮겨 다니던 일이 한 번 매듭지어질 시기예요. 이동을 기회로 쓸 수 있어요. | P2 | 확정 예언 금지 규칙에 근접 |
| js/core/saju/reportDashboard.js:1529 | 지금 내 흐름과 맞는 인사이트를 펼쳐 확인해보세요. | 추상어(인사이트·흐름) | 지금 내 운에 맞는 풀이를 펼쳐 보세요. | P3 | 하드코딩 |
| **과장·보장** | | | | | |
| js/saju-engine.js:24114 | 안정감은 최고조에 달합니다 | 과장 | 서로 기대기 쉬운 조합이에요 | P2 | 궁합 결과. 하드코딩 |
| js/saju-engine-tarot-sukuyo-quantum.js:5785 | 이동과 여행, 해외 교류를 통해 부가 확산됩니다. | 확정 예언(돈)·번역투 | 이동·여행·해외 교류에서 돈 기회가 생기기 쉬워요. | P1 | 돈 확정 예언 금지 |
| js/oracle-kcg.js:622 | 은밀한 준비가 가장 완벽한 실행을 만듭니다. | 과장 | 조용히 준비할수록 실행이 단단해집니다. | P3 | |
| app/_lib/billing-client.ts:3066 | 결제 금액은 100% 환불됩니다. | (오탐 확인) | 유지 | — | 결제 파일 내 문구 — 보고만. 사실 고지이며 과장 아님 |
| i18n/authored/shellRuntime-31.json:shellRuntime.f1426 | 오늘 확실히 끝내세요 | (오탐 확인) | 유지 | P3 | 행동 권유이며 보장 아님. "완벽한 X보다 Y" 계열 8건도 같은 이유로 유지 권장 |
| **불안 자극** | | | | | |
| app/saju/animal-destiny/engine/localSajuCalculator.ts:121 | 놓치면 안 되는 기회 | 불안 자극 | 눈여겨볼 기회 | P1 | 결과 섹션 라벨. 공포 조장 금지 |
| lib/tarot/numerology-tarot.mjs:590 | 미세한 신호를 놓치면 생활 전체의 리듬이 흔들릴 수 있어 | 불안 자극(건강 암시) | 작은 신호를 챙기면 생활 리듬을 지키기 쉬워요 | P2 | 건강 판단 대행 회피 |
| lib/tarot/rich-card-meanings.mjs:1321 | 감정에만 취해 현실을 놓치면, 넘친 물처럼 마음이 흘러가 버립니다. | 불안 자극(경미)·상투 비유 | 감정과 현실을 함께 보면 마음이 덜 흔들립니다. | P3 | |
| app/components/daily-card/DailyCard.tsx:265 | 하루를 놓치면 연속 출석은 다시 시작해요. | (오탐 확인) | 유지 | — | 규칙 안내라 정당 |
| app/music/_data/musicLyrics.ts (32건) | 위험해 … | (오탐) | 유지 | — | 가사 |
| **이모지 장식** | | | | | |
| i18n/authored/shellRuntime-11.json:shellRuntime.s111 | ✨ 대운 프리패스 카드 등장! 오늘 폼 미쳤다 ✨ | 이모지 장식·과장 | 대운 프리패스 카드가 나왔어요! | P2 | 🌸·🦁 외 이모지 금지 |
| i18n/authored/_moduleCopy-skeleton.json:moduleCopy.indexRuntime2.indexRuntime.confirm.006 | 🔒 로그인이 필요한 서비스입니다. | 이모지 장식 | 로그인이 필요해요. 로그인 후 이용해 주세요. | P2 | confirm 대화상자 |
| i18n/authored/sajuCompat-01.json:sajuCompat.grade.S | 🌟 전생의 은인 | 이모지 장식 | 전생의 은인 | P3 | 등급 아이콘이 이미 따로 있으면 삭제 |
| js/share.js:567 | …카카오톡에 붙여넣기 하세요 💬 | 이모지 장식 | …카카오톡에 붙여 넣어 주세요. | P3 | 하드코딩 |
| js/saju-engine.js:9067 | ✨ 전생 캐릭터 프롬프트가 복사되었습니다! | 이모지 장식·피동 | 전생 캐릭터 프롬프트를 복사했어요. | P3 | alert 문구 |
| **어미 반복** | | | | | |
| i18n/authored/shellRuntime-25.json:shellRuntime.f976 | 술(戌)은 늦가을의 땅입니다. / 개띠는 사람에 대한 의리가 깊고 옳고 그름이 분명합니다. / 한번 신뢰한 사람은 끝까지 지키며… | 어미 반복(~니다 3연속)·번역투 | 술(戌)은 늦가을의 땅. 개띠는 의리가 깊고 옳고 그름이 분명해서, 한번 믿은 사람은 끝까지 지킵니다. | P3 | 같은 파일 41값이 같은 틀(템플릿화, professional #8) |
| i18n/authored/shellRuntime-33.json:shellRuntime.f2111 | …읽는 방식입니다. / 기준은 세 층입니다. / 먼저 서로의 일간이… | 어미 반복 | …읽는 방식이에요. 기준은 세 층 — 먼저 서로의 일간이… | P3 | 해요체 섞을 때 화면 톤 통일 확인 |
| i18n/authored/shellRuntime-64.json:shellRuntime.f3555 | 창을 닫으셔도 괜찮습니다. / 그대로 보관되고, …채워집니다. / 한 번에 다… | 어미 반복·피동 | 창을 닫아도 괜찮아요. 완성된 장은 남아 있고, 다시 오면 남은 장부터 이어 써요. | P2 | 생성 대기 안내(UI 문구는 해요체 기준) |
| i18n/authored/fortuneTeaHouse-28.json:fortuneTeaHouse.entryScenes.0.lines.1.text | 찻잔들이 놓여 있습니다. / …떠 있고, … | 어미 반복 | 제안: 둘째 문장을 명사형·쉼표로 끊어 리듬 변주 | P3 | 세계관 장면, 타 리포트와 중복 가능 |
| i18n/authored/shellRuntime-50.json:shellRuntime.f2585 | 고르게 하지 않습니다. / …따로 읽은 뒤, … | 어미 반복 | 제안: 첫 문장을 "여기서는 체계를 하나만 고르지 않아요."로 바꿔 어미 변주 | P3 | |

## 5. '비책·비법·비결' 사용처 (기능명 "연애 비책" 외)

| 위치 | 원문 | 판단 |
|---|---|---|
| i18n/authored/shell-06.json:shell.cdSigCardBody.cdSigCardCta.k1nezx6j | 비책 열기 | 연애 비책 카드 CTA로 추정됨. 의도 확인 필요. 단독 "비책"은 보장 뉘앙스가 있음 (P2) |
| i18n/authored/shellRuntime-19.json:shellRuntime.s1089 | 🔥 집중된 통찰: 비책(秘策) | 주역 결과 섹션 제목. 이모지 장식과 금지 표현이 겹침 (P2). `js/iching-engine.js:784`에 하드코딩 중복 |
| js/iching-engine.js:784 | 🔥 집중된 통찰: 비책(秘策) | 같은 문구, 하드코딩 (P2) |
| app/love-secret-ai/result/love-secret-sections.ts:195 | 관계 단계별 실행 비책 | 연애 비책 결과 섹션. 기능명 파생이라 제안만 ("관계 단계별 실행 계획") |
| index.html:18854 | 실천 비책 | 섹션 라벨 (P2): "실천 계획" |
| index.html:34634 | 6부 28개 섹션 · 궁합과 시기 · 7일 실천 비책 | 유료 상품 설명. C 리포트 영역. "7일 실천 계획" 제안 |
| js/saju-engine.js:11418 | …운을 끌어당기는 비결입니다. | 비결 + 보장 뉘앙스 (P2): "…운을 쓰는 데 도움이 돼요" |
| js/saju-engine-tarot-sukuyo-quantum.js:5831 | 오래가는 관계의 비결입니다. | 일반 조언이라 경미함 (P3) |
| js/saju-engine.js:23992, 24114 | (궁합 풀이 본문의 "비결") | 경미함 (P3) |
| app/insights/adsense-ready-articles.js:898 | 운세를 개선하는 비법이 아니라 일반적인 수면 습관 정보입니다 | 부정 문맥이라 유지 |
| app/insights/adsense-ready-articles.js:28, articles.js:4546·4666, app/new-year-ai-consultation/page.tsx:26·59·61, i18n/authored/brandSignals-01.json:seo.keywords | 토정비결 | 고유명사·SEO 키워드라 유지 |
| app/love-secret-ai/result/LoveSecretAiResultClient.tsx:809 | `/…\|비책\|…/` | 코드(정규식)라 대상 아님. 문구를 바꾸면 이 헤딩 매처도 함께 고쳐야 함 |

## 6. 하드코딩 위치 목록 (한글 리터럴 조각 수 상위 30, 이동하지 않음)

| # | 파일 | 조각 수 | 비고 |
|---:|---|---:|---|
| 1 | js/saju-engine.js | 9,857 | 레거시 결과 HTML. 이모지 351 |
| 2 | index.html | 9,479 | 정적 셸 정본(public은 미러) |
| 3 | app/insights/articles.js | 7,278 | SEO 아티클 |
| 4 | js/saju-engine-tarot-sukuyo-quantum.js | 6,724 | |
| 5 | app/music/_data/musicLyrics.ts | 6,654 | 가사 — 진단 제외 권장 |
| 6 | app/saju/love-simulation/_data/loveCodeMvp.ts | 5,323 | 캐릭터 대사(타 리포트 영역) |
| 7 | app/insights/seo-growth-articles.js | 3,098 | |
| 8 | lib/tarot/rich-card-meanings.mjs | 2,736 | |
| 9 | app/insights/adsense-ready-articles.js | 2,430 | |
| 10 | src/features/psychotest/data/testData.ts | 1,745 | |
| 11 | app/saju/animal-destiny/engine/localSajuCalculator.ts | 1,564 | |
| 12 | lib/ai-engine.js | 1,429 | 대부분 LLM 프롬프트 |
| 13 | lib/tarot/tarot-interpretation-engine.mjs | 1,349 | |
| 14 | lib/famous-saju/celebrity-saju-service.ts | 1,280 | |
| 15 | app/_lib/ziwei-deep-reading.ts | 1,232 | |
| 16 | js/sibyl-system.js | 1,197 | |
| 17 | js/luck-sync-diary.js | 1,183 | 이모지 84 |
| 18 | js/inline/saju-core-bootstrap.js | 1,160 | |
| 19 | js/tarot-self-esteem-card-copy.js | 1,092 | |
| 20 | lib/tarot/sun-recovery-card-copy.mjs | 1,092 | 19번과 같은 수 — 중복 사본 의심 |
| 21 | app/fortune/prompt-hub/PromptHubClient.tsx | 980 | 프롬프트 허브 |
| 22 | js/entertain-engine.js | 979 | |
| 23 | lib/famous-saju/celebrity-data.ts | 921 | 인명 다수 |
| 24 | lib/lock-screen-content.ts | 895 | |
| 25 | app/insights/phase3-editorial-batch2.js | 886 | |
| 26 | lib/seo-landing-pages.js | 814 | |
| 27 | js/core/saju/destiny-anatomy/copy.js | 809 | |
| 28 | lib/tarot/numerology-tarot.mjs | 797 | |
| 29 | src/features/fortune-tea-house/data/tarotAlbumStories.ts | 790 | i18n fortuneTeaHouse-42와 문구 중복 |
| 30 | app/yeon-star-hug/YeonStarHugClient.tsx | 783 | |

## 7. 미진단 영역

- `worker/`(baseline 14,898건): 요청 범위 밖이다.
- 4000자 초과 줄 4개: `index.html:8995·9000·9001`, `js/core/tarot/master-reading-data.mjs:3`.
- 톤 불일치(존댓말·반말 혼용, 호칭)와 화면 간 불일치: 정규식으로 잡을 수 없어 이번 통계에 없다. 고노출 화면은 B-service-characters와 C 리포트가 다룬다.
- 해요체 어미 반복: 1장 정밀도 한계에서 적은 대로 과소 집계됐다. 하드코딩 문자열의 어미 반복은 보지 않았다.
- 각 매치가 실제로 화면에 노출되는지(죽은 코드 여부)는 확인하지 않았다.
- `ja`·`en` 등 다른 로케일 값: 대상 밖이다.
- `.json` 데이터 파일 가운데 i18n 밖에 있는 것(`public/data/*` 외 앱 내부 JSON)은 보지 않았다.
