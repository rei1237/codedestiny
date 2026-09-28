# 영냥이 v7 체계별 챕터 카탈로그 설계

- 상태: **네오 승인(2026-09-28)**. 결정 7개 모두 추천안이다. 코드는 아직 없고, Phase 2 부터 플래그 OFF 로 구현한다.
- 이 문서가 v7 카탈로그·원장·분기·원가 가드의 정본이다. 진행 상태와 다음 단계는 [인수인계](../handoff/2026-09-28-yeongnyangi-tier-chapters.md)에 있다.
- 파일:줄 근거는 2026-09-28 main(45a681fb5) 기준 실측이다. 착수 전에 다시 확인한다.

## 배경

- 브리프: 고등어보다 비싼 티어(연어·광어·참치)는 장당 분량을 늘리지 않는다. 대신 **고유 주제·고유 근거를 가진 장**을 더한다. 영역 순서는 연애 → 결혼·배우자 → 재물 → 직업 → 대인관계·가족 → 건강 → 운의 시기다.
- Phase 0 실측(`docs/handoff/2026-09-28-yeongnyangi-tier-chapters.md`)
  - 반복의 실체는 문장 복제가 아니다. 기준점·근거를 장마다 다시 설명하는 것이다.
    - 사주 참치에서 "일간"은 13/15장, `saju.pillars`·`dayMaster` 는 15/15장에 나온다.
    - 새 사실이 0% 인 장이 6/15장이다.
  - 원인은 `reading-v6.ts:105` 의 base 선택자가 모든 장에 합쳐지는 것(`:238`)과, 사실 ID 가 필드 단위라 소유권을 나눌 수 없는 것이다.
- 승인된 결정(네오, 09-28)
  - ① 원가율 ≤10%(재시도 포함 평균, PG 별도).
  - ② 반복 측정은 읽기 전용.
  - ③ 숙요·타로는 근거 용량만큼만 장을 둔다.
  - ④ 1차 범위는 단일 체계 해석·물어보기다.
- Phase 1 산출물: 카탈로그 표, 원장 하위 ID 규칙, v6/v7 분기 위치, 원가 가드 산술, 결정 7개.

## 결정 7개 (네오 승인, 2026-09-28 — 모두 추천안)

인수인계가 지정한 결정은 1~3이다. 나머지 넷은 카탈로그를 짜면서 생겼다. 4는 방향 6 과 충돌해서, 5는 공개 약속과 어긋나서, 6은 점성술 장 수가 v6 보다 적어서, 7은 시간 미상 연어 사주에 시기 근거가 없어서 더했다.

1. **재시도 계수 1.25**(승인)
   - 수정 후 실측은 1.00(26/26)이다. 여기에 25% 여유를 둔다.
   - 이 여유는 Phase 3 의 "위반 시 1회 재생성"까지 포함한다. Phase 4 골든에서 실측이 1.25 를 넘으면 두 가지 중 하나를 한다.
     - 장 수를 줄인다.
     - 위반 시 재생성을 끄고 결정적 삭제만 쓴다.
   - 1.75 는 수정 전 분량 거부가 섞인 전 기간 값이라 과대 추정이다. 이 값이면 연어가 6장으로 줄어 v6(8장)보다 적어진다.
2. **분기 위치는 상담 종류 단위**(승인). 공유 함수 `consultationManifest` 안에 둔다(아래 §1).
   - fingerprint 영향: 플래그 OFF 면 바이트 동일하다. ON 이면 v7 대상 의도만 새 요청 id 를 받는다.
   - 상품(`catalog.ts`)·가격·결제 경로는 건드리지 않는다.
3. **즉시 롤백용 바인딩 자리는 불필요**(승인).
   - 매니페스트는 구매 시점 스냅샷이다. 그래서 플래그는 신규 구매에만 닿고, 활성화 커밋 revert + 승격으로 충분하다.
   - 진행 중인 v7 책은 바인딩으로도 되돌릴 수 없다. forward-fix 만 가능하다.
   - 바인딩 자리를 비우려면 운영 var 를 제거해야 한다(RED, 선례 02560ce64). 위험만 있고 이득이 없다.
4. **시기 장은 기간별로 나누고 소유는 겹치지 않게**(승인). 인수인계 방향 6("시기는 체계당 한 장")을 조정하는 결정이다.
   - 방향 6 의 목적은 시기 사실이 여러 장에 반복되지 않게 하는 것이다. 이 목적은 그대로 지킨다.
     - 시기 사실은 시기 장만 소유한다.
     - 한 시기 사실(한 해·한 달·한 주기)은 한 장만 소유한다.
     - 다른 장은 원장이 만든 한 줄 요약만 받는다.
   - 나누는 이유
     - 근거량: 사주 참치에는 대운 9주기, 세운 10년, 월운 12개월이 있다. 한 장(약 2,000자)에 모으면 사실당 한 문장도 쓰기 어렵다.
     - 분량: 사주를 한 장으로 묶으면 참치가 19장(34.2~41.8k자)이 된다. v6 참치 목표는 49.5~57k자(`reading-policy.ts:46`)라 약 30% 줄어든다.
   - 시기 장 수(연어 / 광어 / 참치): 사주 1 / 2 / 6, 자미 1 / 2 / 4, 베다 0 / 0 / 4. 점성술·숙요·타로는 시기 데이터가 없으므로 0장이다.
   - 비프리미엄 제외(`chapter-facts.ts:17,26`: 용신·종격·대운·다샤·분할도·요가·사화·삼방사정)는 v6 와 같게 둔다. 그래서 대운·대한·다샤 장은 참치에만 있다.
5. **공개 안내의 장 수·분량 약속은 플래그를 켜는 커밋에서 v7 값으로 바꾼다**(승인).
   - 현재 공개 페이지 `app/yeongnyangi/1000-won-fortune/page.tsx:171` 의 티어 표는 두 값을 보여 준다.
     - 카탈로그 정적 `chapterCount`: 8/11/15개.
     - v6 정책 하한: 10,000 / 18,000 / 40,000자 이상(`reading-policy.ts:44-46`).
   - v7 은 체계마다 장 수가 다르고 장당 하한이 1,400자다(§3 총 분량 표). 그래서 두 값 모두 v7 책과 맞지 않는다.
     - 참치 하한 합: 사주 24장 = 33,600자. 숙요·타로는 이보다 훨씬 작다.
     - 즉 "40,000자 이상"은 v7 에서 지킬 수 없다.
   - 플래그 OFF 동안에는 v6 값이 그대로 맞으므로 지금 바꿀 것은 없다.
   - 추천안: 플래그를 켜는 커밋(Phase 5)에서 이 표를 `consultationManifest` 로 계산한 체계별 범위(장 수·하한 합)로 바꾼다. 상담 화면(`Consultation.tsx:208`)도 같은 값을 쓴다(§6-7).
   - 대안은 참치 공개 하한을 지키도록 장당 분량을 올리는 것이다. 그러면 브리프(장당 분량 불변)와 원가 10% 에 어긋난다.
6. **점성술은 광어 10장·참치 12장으로 v6(11·15장)보다 적게 둔다**(승인: 수용).
   - 엔진 근거가 행성 10·커스프 12·애스펙트 5종뿐이다. 하우스 룰러·품위·원소·시기 데이터가 없다. 인수인계의 용량 평가도 "중간"이다.
   - 결정 ③ 은 체계 안 단조성만 보장하므로 규칙 위반은 아니다. 다만 비질문형 체계 가운데 v6 보다 장이 줄어드는 곳이 점성술뿐이라 따로 승인받는다. 숙요·타로는 ③ 이 이미 덮는다.
   - 대안(비추천): 룰러·원소를 새로 계산해 장을 늘린다. 엔진 밖 계산이라 검증 부담과 오류 위험이 생긴다.
7. **시간 미상 연어 사주의 올해 장은 v7 전용 시간 무관 세운으로 채운다**(승인).
   - 문제: `saju/index.ts:63-64` 는 시간이 없으면 yearlyLuck·monthlyLuck 을 null 로 낸다. 그러면 연어 yearNow 장의 근거가 0개다.
   - 사실: 세운의 천간 십신·지장간·원국과의 합충은 시간과 무관하다. 엔진도 시간이 없으면 시주를 비운다(`life-book-ai-saju.js:749-752`). 시간에 기대는 값은 대운 연결(`majorLuckPillar`·`majorLuckAgeRange`)뿐이고, 이것은 비프리미엄에서 이미 지워진다(`chapter-facts.ts:17`).
   - 방법: `reading-v7-ledger.ts` 가 v7 경로에서만 Y·Y+1 세운을 다시 만든다. 기존 함수만 쓴다: 연 간지(`ganji`+`formatPillar`), `tenGodFor`, `buildHiddenStemDetails`, `buildLuckNatalInteractions(pillar, pillarDetails)`. 일간과 원국은 컨텍스트의 `dayMaster`·`pillarDetails`(life-book 좌표)를 써서 엔진 yearlyLuck 과 같은 기준을 지킨다. 월운의 `stemTenGod` 는 런타임 민용일 일간(`runtime.ts:91`) 기준이라 23시대 출생에서 다를 수 있다(인수인계 범위 밖 결함 3). `saju/index.ts` 와 v6 사실은 바꾸지 않는다.
   - 검증: 시간이 있는 fixture 에서 래퍼 결과의 십신·지장간·합충이 엔진 yearlyLuck 의 같은 필드와 같아야 한다(정적 테스트).
   - 대안(비추천): 연어 사주를 7장으로 줄이거나, 입력에 따라 목차를 바꾼다. 그러면 미리보기·결제 목차와 결과가 어긋난다. 참고로 v6 연어 사주에는 시기 장이 없다.

## 1. 적용 범위와 v6/v7 분기 위치

### 적용 조건 — 순수 함수 `v7Applies(p, k, enabled = READING_V7_ENABLED)` (새 파일 `worker/yeongnyangi/fortune/reading-v7.ts`)

`enabled` 인자는 테스트가 ON 경로를 흉내 내는 용도다. 운영 코드는 인자 없이 부른다. v7 은 아래 조건이 모두 참일 때만 적용한다.

- `READING_V7_ENABLED`(코드 상수, 기본 `false`).
- `p.readingKind==='single'` 이고 `p.manifestVersion===READING_V6_VERSION` 이다.
  - 영감 모드는 `service.ts:70` 에서 v4 로 바꾸므로 빠진다. 하늘 질문·퓨전 v5 도 빠진다.
- `p.fishId` 가 salmon·flounder·tuna 가운데 하나다. 고등어는 불변이다.
- `k` 가 있다.
  - 5체계(사주·자미·숙요·베다·점성술)는 `k.id` 가 `personal` 또는 `ask` 일 때다.
  - 타로는 `choice`·`love` 두 종류다. v6 에서도 둘 다 focus 가 없다(`reading-v6.ts:217`).
- 제외되는 경로
  - 집중형(love·work·money·compatibility·relationship·timing)은 결정 ④ 에 따라 v6 에 남는다.
  - `consultationKind` 없는 레거시 요청(`resolveConsultationKind` → undefined)도 v6 에 남는다.
    - 현행 웹은 늘 종류를 보낸다(`Consultation.tsx:60,102`).
    - 레거시 경로는 불변 스냅샷으로 고정해 두는 편이 안전하다.

### 분기 지점

1. **`consultation-kinds.ts:38` `consultationManifest` 첫 줄**: `if(v7Applies(p,k))return readingManifestV7(p,k,topic);`
   - 이 함수는 상담 화면이 클라이언트에서 그대로 부른다(`Consultation.tsx:63` 미리보기, `:181` "N개 챕터", `:210` 목차).
   - 그래서 미리보기와 서버 결과가 같은 코드로 갈라진다.
   - v7 목차(제목·장 수)는 (체계, 티어, 종류)만의 순수 함수다. 차트에 따라 바뀌지 않는다.
2. **`service.ts`**
   - `:71` 뒤: `const v7=!spiritInput&&v7Applies(product,kind)`.
   - `:107` fingerprint 조건을 확장한다: v7 이면 `manifestVersion:'destiny-book-v7'` 을 넣는다. v6 조건은 그대로 둔다.
   - `:125` 뒤: v7 이면 스냅샷용 상품 사본에 `manifestVersion=V7`, `chapterCount=manifest.length` 를 적는다. 선례는 `:70`(영감 모드)이다.
   - 같은 자리에서 `resolveV7Ledger(manifest, contexts, normalized, date)` 가 장별 소유 하위 ID 를 확정한다(§4).
   - `:124` 의 `readingManifest` 는 그대로 둔다. 종류가 있으면 `:125` 가 늘 덮어쓴다.
   - 질문형 종류(물어보기·타로)의 0장 덮어쓰기(`:129-139`)는 v7 에서도 그대로 둔다. 덮어쓰는 것은 질문 우선 focus, `questionFactSelectors` 필드 선택자, 꿀꿀 일진 사실, 기간 문구다.
     - v7 이면 0장의 `mustNotCover` 는 체계 금지 요소만 남긴다. v6 의 `excludes=[]` 와 같은 뜻이다.
     - 원장은 `:125` 직후에 확정되므로 `:135` 가 넣는 일진 사실을 보지 않는다. 일진 사실은 0장만 필드 선택자로 받는다.
3. **건드리지 않는 것**
   - `catalog.ts`(`MANIFEST_VERSION`, `chapterCount`, 가격)는 그대로 둔다.
   - 정적 `chapterCount` 는 퓨전 전용 `FishCatalog fusionOnly`(`FortuneHome.tsx:654`)와 고등어 화면에서만 보인다. 그래서 v7 과 어긋나는 노출이 없다.
   - 결제창(`CheckoutClient.tsx:271`)·서재(`Library.tsx:71`)·라우트·큐는 이미 `manifest.length` 를 먼저 쓴다.

### 기존 파이프라인에 잇는 자리 (플래그 OFF 면 전부 무동작)

- `reading-policy.ts`
  - `READING_V7_VERSION='destiny-book-v7'` 을 더하고 `hasReadingSections` 에 넣는다.
  - 그러면 블록 검증(`reading-quality.ts:96-97`: 블록 2~20, 문단 ≤500자, 블록 순서, 출처 부분집합, 블록별 하한, 중복 Dice>.94), mock fixture(`mockReadingV5`), 렌더러를 그대로 쓴다.
  - 등록하지 않은 버전은 비구조화 경로로 떨어지므로 이 등록이 필수다.
  - v7 정책은 장 단위로 평평하다(§2). 책 분량은 매니페스트 합계다.
- `providers/chapter.ts`
  - `:334` promptVersion: `askPrompt → 'ask-chapter-v1'` 다음, v6 앞에 `'chapter-v7'` 을 둔다.
  - `:285` depth: v7 이면 `mustCover` 에서 만든다.
  - 시기 판정(`timeTheme`): v7 이면 제목 정규식(`/시기|전환|흐름|년/`) 대신 `timingRef==='owner'` 로 한다.
    - 이유: '노년'·'흐름' 같은 제목 낱말 때문에 운 사실이 시기 장 밖으로 새지 않게 하려는 것이다.
    - 물어보기 0장은 v6 처럼 시기 사실을 받는다.
  - v7 전용 domainRules 키(§2)는 `chapter.version===V7` 일 때만 넣는다. 그래서 v6 페이로드는 바이트 동일하다.
  - `:125-130` 은 소절 버전에 `id==='evidence'` 블록을 요구한다. 이 블록이 모든 체계를 덮고, 광어·참치는 출처가 2개 이상이어야 한다. v7 에는 이 블록이 없으므로 그대로 두면 모든 장이 `CHAPTER_EVIDENCE_INCOMPLETE` 로 떨어진다.
    - v7 분기: 해석 블록마다 출처가 1개 이상 있어야 한다. 모든 블록 출처의 합집합이 체계를 모두 덮어야 한다. 광어·참치는 서로 다른 출처가 2개 이상이어야 한다.
    - v6 분기는 그대로 둔다.
- `chapter-facts.ts` `selectChapterFacts` 첫 줄에 `if(chapter.version===V7) return selectV7Facts(context, chapter)` 를 넣는다(§4).
  - 프롬프트(`chapter.ts:249`)와 검증 허용 집합(`:91-95`)이 모두 이 함수를 부른다. 그래서 두 쪽이 같은 사실을 본다.
  - v6 본문은 바꾸지 않는다. 비프리미엄 라벨 제거와 `cleanEvidence` 는 export 해서 v7 에서도 다시 쓴다(동작 변화 없음).
- 결제 경계
  - requestId 가 fingerprint 에서 나오고, orderId 는 requestId 에서 나온다(`orders.js:86-112`). 따라서 플래그 OFF 면 orderId 도 같다.
  - `config/payment-freeze.json` 은 `service.ts`·`catalog.ts`·`consultation-kinds.ts`·`reading-*` 를 동결하지 않는다.
- CI
  - `paid-flow-gates.yml` 은 `worker/yeongnyangi/**` 변경으로 돌지 않는다.
  - 그래서 fingerprint 불변을 지키는 것은 Phase 2 스냅샷 테스트(메인 CI) 하나뿐이다.

### 상품 단위를 추천하지 않는 이유

- 집중형까지 v7 로 바뀐다(결정 ④ 위반). 막으려면 어차피 종류 예외가 필요하다.
- `getProduct` 는 결제·가격 경로가 공유한다. 이 경로를 불변으로 두는 것이 롤백 범위를 가장 작게 한다.

### fingerprint·멱등 영향

- 플래그 OFF: 조건식만 늘고 값은 같다. 모든 fingerprint 가 바이트 동일해야 하고, Phase 2 첫 커밋의 스냅샷이 이를 증명한다.
- 플래그 ON: v7 대상 의도만 `manifestVersion` 필드가 바뀌어 새 요청 id 를 받는다.
  - 켜는 배포 순간에 prepare 와 결제 사이에 있던 사용자는 재시도 때 새 id 를 받는다. v6 도입 때와 같은 성질이다.
  - 결제된 요청은 서재에 남는다.

## 2. v7 ChapterSpec

브리프 필드에 현행 렌더러 호환 필드를 더한다. 기존 필드 가운데 `id`·`ordinal`·`key`·`title`·`part`·`theme`·`systems`·`factSelectors`·`periodScope` 는 유지한다.

| 필드 | 뜻 |
|---|---|
| `version` | `'destiny-book-v7'` |
| `minTier` | 이 장이 처음 들어가는 티어 |
| `titleKey` / `partKey` | 사전 키. ko 제목은 빌더가 `title` 에 채워 현행 렌더러가 그대로 쓴다. ja·en 은 Phase 2 UI 단계에서 쓰고, 나머지 로케일은 영어로 폴백한다 |
| `evidenceInputs` | 필드 단위 선택자. 정적 테스트가 실제 엔진 필드인지 검사하고, `factSelectors` 로도 쓴다 |
| `owns` | 카탈로그에서는 소유 규칙 패턴이다. prepare 에서 원장이 구체 하위 ID 로 확정한다 |
| `refs` | 한 문장 참조만 허용하는 사실. 기준점 사실과 시기 요약이 여기에 온다 |
| `mustCover` | 인사이트 하위 질문 키. 하나가 블록 하나가 되며, 현상 + 근거 + 조건/시기 + 행동으로 쓴다 |
| `minInsightUnits` | `mustCover.length` |
| `mustNotCover` | 다른 장의 소유 주제 태그와 체계 금지 요소 |
| `timingRef` | `owner`(시기 장), `summary`(한 줄 요약만), `none`(기준점 장) |
| `scene` / `decision` | 장면 블록 0~1개. 선택 블록은 `decision` 장에만 둔다 |
| `requires` / `fallbackInputs` | 연어의 입력 부재 대응(§3 입력 보장 표). 장 수·제목은 바뀌지 않고, 근거만 대체한다 |
| `minimumChars` / `targetChars` / `outputTokens` | 1,400 / [1,800, 2,200] / `tokensRequiredForChars(2,200+600)`=6,450. 공급자 상한은 12,274 다 |

- 분량 비율 1,400/1,800 = 0.78 이다. 원칙 17 의 0.8 과 v6 테스트의 0.82 를 모두 만족한다.
- 분량 미달은 단독 실패 사유가 아니다.

### 블록과 이전 장 전달 (스키마 변경 없음)

- `withV7Sections(chapter)`(새, `reading-v7.ts`)를 `withReadingSections` 대신 쓴다.
  - v6 의 고정 소절(meaning·evidence·conditions·limits·example-N·choice·action·checkpoint)이 장마다 같은 틀을 반복하게 만든 원인이다. 그래서 v7 은 이것을 쓰지 않는다.
- 블록 구성
  - `mustCover` 하나 = 블록 하나(role interpretation). 지시는 "현상→근거→조건·시기→행동을 한 블록 안에서 끝낸다"이다.
  - 장면 블록은 `scene` 장에만 1개(role example)다.
  - 선택 블록은 `decision` 장에만 1개(role action)다.
- 분량 몫: 장면 0.2, 선택 0.2 를 떼고 나머지를 해석 블록이 똑같이 나눈다. 블록별 하한은 블록 목표 하한의 80% 이하다.
- 블록 스키마 `id/title/paragraphs/sources` 를 그대로 쓴다. 필수 `highlights[]`·`topics[]`(`chapter.ts:164-194`)도 그대로 쓴다. 새 `meta` 필드를 만들지 않으므로 렌더러·DB 변경이 없다.
  - `highlights[]`: 인사이트 단위마다 결론 한 줄.
  - `topics[]`: 다룬 주제 태그. 장면은 `scene:<소재>`, 행동은 `action:<행동>` 으로 넣는다.
- v7 전용 전달 키
  - `previousHighlights`: 이전 장 결론.
  - `usedScenes`·`usedActions`: 태그에서 뽑는다.
  - v6 의 `previousExamples` 는 소절 버전에서 늘 빈 문자열이다. 그래서 장면 중복 방지가 사실상 꺼져 있었고, v7 은 태그로 이 구멍을 막는다.
  - 전달분은 3,000 토큰에서 결정적으로 자른다. 원가 식의 입력 항과 같은 값이다.
- `mustNotCover` 는 v7 의 `excludedSubjects` 를 채운다. v6 의 `excludes` 는 그대로 둔다.

## 3. 체계별 카탈로그

### 공통 규칙

- 파트 순서
  1. 바탕
  2. 연애
  3. 결혼·배우자
  4. 재물
  5. 직업
  6. 대인관계·가족
  7. 건강
  8. 체계 심화 — 체계 고유 구조(용신·신살·사화·삼방사정·요가·노드·애스펙트·세대 행성). 사주·자미·베다는 참치에만 두고, 점성술은 연어부터 둔다. 시기 장이 이 결과를 쓰므로 시기보다 앞에 둔다.
  9. 운의 시기
- 타로는 영역 파트 대신 바탕 → 카드 → 흐름 → 선택을 쓴다.
- 근거가 없는 파트는 건너뛴다(결정 ③).
- 주제 재정렬·제목 접두어(v6 `:224-227`)는 쓰지 않는다. 순서는 고정이다. 물어보기에서는 0장이 질문과 주제를 받는다.
- **v6 의 마감 `action` 장은 두지 않는다.** v6 는 티어마다 끝에 "지금의 선택과 실행 계획"을 붙인다(`reading-v6.ts:229`). 이 장은 모든 선택자의 합집합이라 새 사실이 0% 인 장이다. v7 에서는 행동을 인사이트 단위마다 두고, 선택은 결정 장에 둔다.
- 장 구성
  - 인사이트 단위는 기본 3개다. 결정 장은 해석 2개 + 선택 블록 1개다. 장면 장은 여기에 장면 1개를 더한다.
  - 티어가 오를 때 장은 추가만 하거나, 한 장을 근거가 겹치지 않는 두 장으로 나눈다. 나뉘는 장은 `maxTier` 로 표시한다.
  - 정적 테스트는 체계 안에서 티어가 오를수록 장 수와 인사이트 단위 합이 모두 늘어나는지 확인한다.
- 물어보기는 해석과 같은 목차를 쓴다. 0장은 기존 질문 경로(`ask-chapter-v1`)로 질문에 먼저 답하고, 이어서 바탕의 `mustCover` 를 쓴다. 장 수는 해석과 같다.
- `timingRef` 는 이렇게 정한다.
  - 기준점 장: `none`.
  - 시기 파트 장: `owner`.
  - 나머지 장: `summary`.
- id 는 v6 와 같은 `${tier}-NN` 이다. `chapter.ts:236` 이 앞부분으로 티어를 읽는다.
- 필수 필드 `theme`(`book-contracts.ts:3-11` 의 8종)는 파트에서 정한다. 타입에 새 값을 더하지 않는다.
  - 바탕·건강·체계 심화 → `self`, 연애·결혼·배우자 → `love`, 재물 → `wealth`, 직업 → `career`, 대인관계·가족 → `relations`, 운의 시기 → `timing`.
  - 타로: 바탕·흐름 → `self`, 카드 → 연애 종류는 `love`·선택 종류는 `self`, 선택 → `action`.
  - 정적 테스트: `theme==='timing'` 과 `timingRef==='owner'` 가 늘 함께 참이다.
- 입력 보장(실측: `service.ts:101-102` 는 광어·참치만 시간·장소·성별을 요구, `input.ts:44` 는 사주 밖 체계에 시간을, `:47-48` 은 사주·자미에 성별을 모든 티어에서, `:50` 은 베다·점성술·숙요에 장소를 요구)

| 체계 | 연어에서 빠질 수 있는 것 | 광어·참치 |
|---|---|---|
| 사주 | 시간·장소(성별은 늘 있음) | 모두 있음 |
| 자미 | 장소(시간·성별은 늘 있음) | 〃 |
| 베다·점성술·숙요 | 성별(시간·장소는 늘 있음) | 〃 |
| 타로 | 출생 정보를 쓰지 않음 | — |

  - 그래서 연어 목차는 입력과 무관해야 하고, 모자라는 근거는 `fallbackInputs` 로 대체한다.
  - 성별에 기대는 엔진 값(사주 대운 방향, 자미 대한·소한 방향)은 사주·자미에서 모든 티어에 성별이 있으므로 입력 제약이 없다. 사주 대운은 시간이 필요하다.

### 사주 — 연어 8 / 광어 13 / 참치 24

십신 → 영역 사슬(모든 티어 공통)

| 십신 | 영역 | 사슬 |
|---|---|---|
| 식신·상관 | 연애(표현) | 참치: 식신 장·상관 장 → 광어: 표현 장 → 연어: 연애 장 |
| 정재·편재 | 재물 | 참치: 정재 장·편재 장 → 광어·연어: 재물 장 |
| 정관·편관 | 직업 | 참치: 정관 장·편관 장 → 광어·연어: 직업 장 |
| 정인·편인 | 직업(배움) | 참치: 정인 장·편인 장 → 광어: 배움 장 → 연어: 직업 장 |
| 비견·겁재 | 대인관계 | 참치: 비견 장·겁재 장 → 광어·연어: 대인 장 |

- 성별 중립 원칙: 배우자는 일지(배우자궁)로만 읽는다. 재성·관성을 배우자별로 쓰지 않는다.
- 기둥 → 장: 일주 → 배우자, 월주 → 직업, 년주 → 뿌리(광어+)/대인(연어), 시주 → 자녀·후반(광어+)/대인(연어, 시간이 있을 때만).
- 합충: 일지가 끼면 배우자 장, 월지가 끼면 직업 장, 나머지는 목차에서 먼저 나오는 소유자 장이 가진다.

| key | 파트 | 티어 | 제목(ko) | 소유 | mustCover | 장면/선택 |
|---|---|---|---|---|---|---|
| anchor | 바탕 | 연~ | 타고난 중심과 힘의 균형 | dayMaster, pillars, strengthHeuristic | 기질의 중심 / 힘의 균형이 일상에 드러나는 방식 / 강점이 지나칠 때 | 장면 |
| love | 연애 | 연~ | 끌림과 연애의 방식 | 연애 신살(도화·홍염) + 연어는 식신·상관 | 끌림이 생기는 자리 / 가까워지는 방식 / 연애가 흔들리는 조건 | 장면 |
| expression | 연애 | 광 | 마음을 전하는 표현 | 식신·상관 | 표현의 온도 / 말이 관계에 남기는 것 / 표현을 다듬는 법 | 장면 |
| siksin · sanggwan | 연애 | 참 | 다정하게 전하는 마음(식신) · 날이 선 매력(상관) | 각 1종 | 장마다 3 | 장면 |
| spouse | 결혼·배우자 | 연~ | 배우자 자리와 함께 사는 법 | pillarDetails.day, tenGodsByPillar.day, 일지 합충 | 배우자 자리의 결 / 일지 합충이 만드는 결속과 긴장 / 함께 살 때의 역할 | 장면 |
| wealth | 재물 | 연~광 | 돈이 모이고 새는 길 | 정재·편재(0개면 무재로 선언) | 재성 구성이 말하는 돈의 흐름 / 모으는 방식과 새는 자리 | 선택 |
| jeongjae · pyeonjae | 재물 | 참 | 지키고 쌓는 돈(정재) · 굴리고 불리는 돈(편재) | 각 1종 | 해석 2 + 선택 / 3 | 선택 · 장면 |
| career | 직업 | 연~광 | 일하는 방식과 사회적 자리 | 정관·편관, 월주, 월지 합충 + 연어는 정인·편인 | 맞는 조직과 역할 / 책임을 다루는 법 / 성장의 조건 | 장면 |
| jeonggwan · pyeongwan | 직업 | 참 | 조직과 책임(정관, 월주 포함) · 압박과 돌파(편관) | 각 1종 | 장마다 3 | 장면 |
| learning | 직업 | 광 | 배움과 받쳐 주는 힘 | 정인·편인 | 배우는 방식 / 도움을 받는 통로 / 의존이 커질 때 | 장면 |
| jeongin · pyeonin | 직업 | 참 | 정석의 배움(정인) · 직관과 비주류 배움(편인) | 각 1종 | 장마다 3 | 장면 |
| relations | 대인관계·가족 | 연~광 | 곁의 사람들 | 비견·겁재, 나머지 합충 + 연어는 년주·시주 | 나란히 선 사람과의 거리 / 경쟁이 생기는 조건 / 가족에게서 받은 것 | 장면 |
| bigyeon · geopjae | 대인관계·가족 | 참 | 나란히 걷는 사람(비견) · 겨루는 사람(겁재) | 각 1종 | 장마다 3 | 장면 |
| roots | 대인관계·가족 | 광~ | 부모와 뿌리 | 년주 pillarDetails·tenGodsByPillar, 년지 합충 | 3 | 장면 |
| children | 대인관계·가족 | 광~ | 자녀와 인생 후반 | 시주 pillarDetails·tenGodsByPillar, 시지 합충 | 3 | 장면 |
| health | 건강 | 연~ | 몸의 리듬과 회복 | fiveElements, seasonalBalance | 치우친 기운이 드러나는 생활 리듬 / 계절·환경에 따른 컨디션 / 회복 습관 | — |
| signals | 체계 심화 | 참 | 귀인·이동·강한 기운의 신호 | shinsal 가운데 연애 밖 10종: 천을귀인·문창귀인·역마·화개·양인·괴강·백호·공망·귀문관·원진 | 있는 신살의 뜻과 한계 / 도움과 이동의 통로 / 강한 기운을 다루는 법 | 장면 |
| useful | 체계 심화 | 참 | 나를 살리는 기운(용신·종격 판정) | usefulGod, jong | 용신의 근거와 한계 / 생활에서 보강하는 법 / 종격 여부가 바꾸는 해석 | — |
| majorArc | 운의 시기 | 참 | 대운으로 보는 인생의 굴곡 | majorLuck 의 지난·먼 주기 | 3 | — |
| majorNow · majorNext | 운의 시기 | 참 | 지금의 대운 · 다음 대운과 준비 | majorLuck.current + advancedFactors · next | 해석 2 + 선택 | 선택 |
| yearNow | 운의 시기 | 연~ | 올해와 내년 | yearlyLuck Y·Y+1 + 연어는 월운(시간이 있을 때) | 해석 2 + 선택 | 선택 |
| months | 운의 시기 | 광~ | 앞으로 12개월 | 월운 12개월(래퍼 연장) | 3 | — |
| yearsAhead | 운의 시기 | 참 | 앞으로 8년의 세운 | yearlyLuck Y+2~Y+9(엔진 10년: `runtime.ts:65-73`) | 3 | — |

- 연어 8: anchor, love, spouse, wealth, career, relations, health, yearNow.
- 광어 13: 연어 8 + expression, learning, roots, children, months.
- 참치 24: 광어 13 에서 expression·wealth·career·learning·relations 다섯 장이 각각 둘로 나뉜다(+5). 여기에 signals, useful, majorArc, majorNow, majorNext, yearsAhead 여섯 장을 더한다(+6).
- 신살(`saju-shinsal.js:492-507`, 12종 = 단일 10 + 쌍 2(귀문관·원진))
  - 연애 장은 모든 티어에서 도화·홍염만 쓴다. v6(`chapter-facts.ts:45`)와 같다.
  - 나머지 10종은 참치 signals 장에만 둔다. v6 는 어느 티어에서도 쓰지 않았다.
  - 귀인·이동을 따로 장으로 두지 않은 이유: 해당 신살이 없는 명식이 흔해(추정: 귀인 계열 약 34%, 이동 계열 약 59% 부재) 빈 장이 된다.
- 금지 요소
  - 희신: 엔진에 없다. v6 참치 제목(`reading-v6.ts:30`)의 오류를 되풀이하지 않는다.
  - 원진·반합·암합을 합충 관계로 지어내지 않는다. `natalInteractions` 에 없다. 원진은 `원진살` 신살 사실로만, 그것을 소유한 signals 장에서만 쓴다.
  - 비프리미엄 티어의 대운·용신.
- 참치 십신 단일 장의 부재
  - 한 십신이 0 인 명식이 흔하다(추정: 특정 십신 부재 약 28%, 한 계열 두 십신 모두 부재 약 8.5%, 책 한 권에 완전 부재 계열이 하나 이상일 확률 약 30%). 분포는 지장간을 0.35 가중으로 센다(`life-book-ai-saju.js:342-354`).
  - 부재 장은 선언된 부재를 소유하고, 짝 십신·오행 균형(refs)과 시기 요약으로 "없을 때 어떻게 드러나는가"를 쓴다. 목차는 차트와 무관하므로 장을 빼지 않는다.
  - Phase 4 골든 fixture 에 무재 명식을 넣는다.
- 연어 대체 경로(사주만 시간·장소가 빠질 수 있다)
  - 시간이 없으면 엔진은 정오로 계산하되 시주를 비우고 `pillarDetails.hour` 를 null 로 둔다(`runtime.ts:35`, `life-book-ai-saju.js:749-752`). 컨텍스트는 advancedFactors·majorLuck·yearlyLuck·monthlyLuck 을 null 로 낸다(`saju/index.ts:57,62-64`).
  - 대인 장은 시주 없이 년주·비겁·합충으로 쓴다. 올해 장은 결정 7 의 시간 무관 세운(Y·Y+1)으로 쓰고 월운은 뺀다. 장 수와 제목은 그대로다.
  - 장소가 없으면 경도 127° 로 보정한다(`runtime.ts:48`). 목차 영향이 없다.
  - 성별은 사주에서 모든 티어 필수다(`input.ts:47-48`).

### 자미 — 연어 8 / 광어 13 / 참치 20

- 궁 이름은 엔진 표기(`ziwei-ai-chart.js:12`)를 쓴다. 배우자 궁은 부부궁이다.
- 궁 사실 `palaces.<궁>` 은 주성·보좌성·살성과 그 궁의 생년사화를 함께 가진다. v6 의 `distinctPlacements` 규칙(같은 배치를 중복 증거로 세지 않음)을 유지한다.
- 신궁은 역할(어느 궁에 앉았는지)만 기준점 사실이다. 그 궁 자체는 원래 소유 장이 가진다.
- 사화 소유 사슬: [화록·화권·화과·화기 장(참치), 그 사화가 앉은 궁의 장]. 참치 미만에서 궁 객체의 `transformations` 는 v6 와 같이 노출된다(비프리미엄 제거 정규식 `chapter-facts.ts:17` 은 `fourTransformations` 키만 지운다).
- 대한(`majorLuck`)은 12궁 배열이고 현재 표시가 없다(`ziwei-ai-chart.js:568-575`). v6 는 배열을 통째로 넘긴다. v7 원장은 엔진의 소한 나이 `minorLuck.current.age`(虛歲)로 현재·다음 대한을 고른다. 소한이 없으면 선언된 부재다.
- 소한(`minorLuck`)은 방향이 성별에 기댄다(`:536`). 자미는 모든 티어에서 성별이 필수이므로(`input.ts:47-48`) 입력 제약은 없다. 소한은 티어 차등으로 광어부터 쓴다. 연어에 넣을지는 Phase 2 에서 다시 볼 수 있다(장 수 불변). v6 는 소한을 어디에도 쓰지 않았다.
- 금지 요소: 유년사화(엔진에 없다. `yearlyLuck.transformations` 는 그 궁의 생년사화다), 빈 궁을 불운으로 단정하는 해석. `lunar` 는 생년월일이라 제외한다.

| key | 파트 | 티어 | 제목(ko) | 소유 | mustCover | 장면/선택 |
|---|---|---|---|---|---|---|
| anchor | 바탕 | 연~ | 삶의 중심(명궁·신궁) | lifePalace, bodyPalace, palaces.명궁, bureau | 명궁 주성이 말하는 기질 / 신궁이 앉은 자리의 무게 / 오행국이 정하는 리듬 | 장면 |
| love | 연애 | 연~ | 마음이 끌리는 것과 연애의 즐거움 | palaces.복덕궁 | 3 | 장면 |
| spouse | 결혼·배우자 | 연~ | 배우자 자리와 함께 사는 법 | palaces.부부궁 | 배우자 자리의 별 / 관계에서 반복되는 긴장 / 함께 살 때의 역할 | 장면 |
| wealth | 재물 | 연~ | 돈의 그릇과 쌓는 방식 | palaces.재백궁 + 연어는 전택궁 | 해석 2 + 선택 | 선택 |
| property | 재물 | 광~ | 집과 자산의 자리 | palaces.전택궁 | 3 | 장면 |
| career | 직업 | 연~ | 일하는 방식과 사회적 자리 | palaces.관록궁 + 연어는 천이궁 | 3 | 장면 |
| travel | 직업 | 광~ | 바깥 무대와 이동 | palaces.천이궁 | 3 | 장면 |
| relations | 대인관계·가족 | 연 | 곁의 사람과 가족 | palaces.형제궁·노복궁·부모궁·자녀궁 | 3 | 장면 |
| peers · parents · children | 대인관계·가족 | 광~ | 형제·동료·친구 · 부모와 윗사람 · 자녀와 아랫사람 | 형제궁·노복궁 · 부모궁 · 자녀궁 | 장마다 3 | 장면 |
| health | 건강 | 연~ | 몸의 약한 고리와 회복 | palaces.질액궁 | 3 | — |
| hwarok · hwagwon · hwagwa · hwagi | 체계 심화 | 참 | 풀리는 곳(화록) · 힘을 쥐는 곳(화권) · 이름이 나는 곳(화과) · 막히는 곳(화기) | fourTransformations 각 1종 | 장마다 3 | 장면 |
| triad | 체계 심화 | 참 | 삼방사정으로 본 명반의 축 | sanFangSiZheng | 3 | — |
| majorNow · majorNext | 운의 시기 | 참 | 지금의 대한 · 다음 대한과 준비 | 원장이 고른 현재·다음 대한 + 그 대한사화 | 해석 2 + 선택 | 선택 |
| yearNow | 운의 시기 | 연~ | 올해와 내년 | yearlyTimeline Y·Y+1 + 광어부터 minorLuck.current | 해석 2 + 선택 | 선택 |
| yearsAhead | 운의 시기 | 광~ | 앞으로 8년의 유년 | yearlyTimeline Y+2~Y+9 + minorLuck.entries(엔진 창 ±5년) | 3 | — |

- 연어 8: anchor, love, spouse, wealth, career, relations, health, yearNow.
- 광어 13: relations 가 peers·parents·children 셋으로 나뉜다(+2). property, travel, yearsAhead 를 더한다(+3).
- 참치 20: 광어 13 + 사화 4장, triad, majorNow, majorNext.

### 베다 — 연어 8 / 광어 13 / 참치 23

- 12하우스는 장에 나눠 준다. 하우스 사실은 그 하우스 주인 행성의 배치(하우스·사인·품위)를 함께 가진다. 원장이 `houses.<n>.lord` 로 조인한다.
- 행성 사실(낙샤트라·품위·역행·연소·어스펙트)은 카라카 장이 소유한다: 태양·토성 → 직업, 달 → 마음, 화성·수성 → 형제, 목성 → 재물, 금성 → 연애.
- 라후·케투는 참치에서 nodes 장이 소유한다. 그 아래 티어에서는 앉은 하우스의 장이 가진다.
- 분할도: D9 → 결혼·배우자, D10 → 직업, D7 → 자녀, D12 → 부모, D2 → 재물 장에 합친다. D1 은 planets 와 같은 내용이라 버린다.
- 비프리미엄 제외(다샤·요가·분할도)는 v6 와 같다. 그래서 이들은 참치에만 있다.
- 금지 요소: 트랜짓(v6 미사용, 시각 결함), 프라티얀타르다샤(PD, v6 미사용).

| key | 파트 | 티어 | 제목(ko) | 소유 | mustCover | 장면/선택 |
|---|---|---|---|---|---|---|
| anchor | 바탕 | 연~ | 라그나로 본 삶의 출발점 | lagna, houses.1 | 라그나가 정하는 기질 / 1하우스 주인이 향하는 곳 / 강점이 지나칠 때 | 장면 |
| mind | 바탕 | 연~ | 달과 마음의 결 | moon, planets.Moon + 연어는 houses.4 | 3 | 장면 |
| love | 연애 | 연~ | 끌림과 연애(금성·5하우스) | planets.Venus, houses.5 | 3 | 장면 |
| spouse | 결혼·배우자 | 연~ | 배우자와 결혼(7하우스) | houses.7 | 3 | 장면 |
| d9 | 결혼·배우자 | 참 | 나밤샤로 본 결혼의 깊이 | divisionalCharts.D9 | 3 | 장면 |
| wealth | 재물 | 연~ | 돈을 모으는 힘(목성·2하우스) | planets.Jupiter, houses.2 + 연어는 houses.11 + 참치는 D2 | 해석 2 + 선택 | 선택 |
| gains | 재물 | 광~ | 들어오는 이익과 인맥(11하우스) | houses.11 | 3 | 장면 |
| career | 직업 | 연~ | 일과 사회적 자리(10하우스) | planets.Saturn, planets.Sun, sun, houses.10 | 3 | 장면 |
| d10 | 직업 | 참 | 다샴샤로 본 직업의 방향 | divisionalCharts.D10 | 3 | 장면 |
| relations | 대인관계·가족 | 연 | 형제·스승·믿음 | planets.Mars, planets.Mercury, houses.3, houses.9 | 3 | 장면 |
| siblings · dharma | 대인관계·가족 | 광~ | 형제와 소통(3하우스) · 스승과 믿음(9하우스) | 화성·수성·houses.3 · houses.9 | 장마다 3 | 장면 |
| home | 대인관계·가족 | 광~ | 집과 어머니(4하우스) | houses.4 | 3 | 장면 |
| d7 · d12 | 대인관계·가족 | 참 | 자녀(D7) · 부모(D12) | divisionalCharts.D7 · D12 | 장마다 3 | 장면 |
| health | 건강 | 연~ | 몸과 회복(6하우스) | houses.6 + 연어는 houses.8·12 | 3 | — |
| transformation · release | 건강 | 광~ | 위기와 변화(8하우스) · 소모와 쉼(12하우스) | houses.8 · houses.12 | 장마다 3 | — |
| yogas · nodes | 체계 심화 | 참 | 명식에 맺힌 요가 · 라후와 케투 | yogas · planets.Rahu·Ketu | 장마다 3 | — |
| dashaArc | 운의 시기 | 참 | 다샤로 보는 인생의 흐름 | vimshottariDasha 나머지 마하다샤(출생 균형 주기의 시작일 제거, `chapter-facts.ts:34`) | 3 | — |
| mdNow · adNow · mdNext | 운의 시기 | 참 | 지금의 마하다샤 · 지금의 안타르다샤 · 다음 마하다샤 | currentMahadasha · currentAntardasha · 다음 주기 | 해석 2 + 선택(mdNow·mdNext) / 3(adNow) | 선택 |

- 연어 8: anchor, mind, love, spouse, wealth, career, relations, health.
- 광어 13: relations 가 siblings·dharma 로 나뉜다(+1). gains, home, transformation, release 를 더한다(+4).
- 참치 23: 광어 13 + d9, d10, d7, d12, yogas, nodes, dashaArc, mdNow, adNow, mdNext.

### 점성술 — 연어 8 / 광어 10 / 참치 12

- 엔진 근거는 행성 10개(사인·도수·플라시두스 하우스·역행), ASC·MC, 커스프 12, 애스펙트 5종이 전부다. 하우스 룰러·품위·원소는 계산하지 않으므로 쓰지 않는다. 시기 데이터가 없다.
- 애스펙트 소유 사슬: 스퀘어·오퍼지션 [tension, aspects], 트라인·섹스타일 [harmony, aspects], 컨정션 [aspects, 두 행성 가운데 목차에서 먼저 나오는 소유 장].
- 외행성(천왕성·해왕성·명왕성)은 연어에서 앉은 하우스의 장이 가진다. 노드는 모든 티어에서 앉은 하우스의 장이 가지며, 어댑터 경로에서는 없을 수 있다.
- 결혼·배우자 파트는 두지 않는다. 7하우스는 연애 장이 가진다.

| key | 파트 | 티어 | 제목(ko) | 소유 | mustCover | 장면/선택 |
|---|---|---|---|---|---|---|
| anchor | 바탕 | 연~ | 상승점과 태양 | ascendant, planets.Sun, houseCusps.1 | 첫인상과 태도 / 태양이 향하는 삶의 목표 / 둘이 어긋날 때 | 장면 |
| emotion | 바탕 | 연~ | 달과 감정의 결 | planets.Moon, houseCusps.4 | 3 | 장면 |
| love | 연애 | 연~ | 금성과 관계의 자리 | planets.Venus, houseCusps.5·7 | 3 | 장면 |
| wealth | 재물 | 연~ | 목성과 돈의 흐름 | planets.Jupiter, houseCusps.2·8 | 해석 2 + 선택 | 선택 |
| career | 직업 | 연~ | 토성·MC 와 사회적 자리 | planets.Saturn, midheaven, houseCusps.10 | 3 | 장면 |
| communication | 대인관계·가족 | 연~ | 수성과 말·배움·모임 | planets.Mercury, houseCusps.3·9·11 | 3 | 장면 |
| health | 건강 | 연~ | 화성과 몸의 에너지 | planets.Mars, houseCusps.6·12 | 3 | — |
| aspects | 체계 심화 | 연 | 행성들이 주고받는 긴장과 조화 | aspects 전부 | 3 | — |
| tension · harmony | 체계 심화 | 광~ | 긴장의 애스펙트 · 조화의 애스펙트 | 스퀘어·오퍼지션 · 트라인·섹스타일 | 장마다 3 | — |
| generations | 체계 심화 | 광 | 세대 행성이 남긴 흔적 | planets.Uranus·Neptune·Pluto | 3 | — |
| uranus · neptune · pluto | 체계 심화 | 참 | 천왕성 · 해왕성 · 명왕성 | 각 1개 | 장마다 3 | — |

- 연어 8: anchor, emotion, love, wealth, career, communication, health, aspects.
- 광어 10: aspects 가 tension·harmony 로 나뉜다(+1). generations 를 더한다(+1).
- 참치 12: generations 가 행성 셋으로 나뉜다(+2). v6(11·15장)보다 적다 — 결정 6.

### 숙요 — 연어 6 / 광어 8 / 참치 10

- 관계 지도는 `relationFromForwardDistance`(`sukuyo-relation-core.js:33-48`)로 27수를 역할별로 모은 래퍼다. 역할 8종(영·친·우·쇠·안·괴·성·위)은 3수씩, 명·업·태는 1수씩이다.
- 거리 묶음: 명{0}, 영친{1,8,10}, 우쇠{2,7,11}, 안괴{3,6,12}, 성위{4,5,13}, 업태{9,18}.
- `birthTimeContext` 는 제외한다. 건강·재물·시기 근거가 없으므로 그 파트를 건너뛴다(결정 ③).

| key | 파트 | 티어 | 제목(ko) | 소유 | mustCover | 장면/선택 |
|---|---|---|---|---|---|---|
| anchor | 바탕 | 연~ | 본명숙이 말하는 나 | personA(본명숙·키워드·강점·그림자) | 본명숙의 기질 / 강점이 빛나는 자리 / 그림자가 드러날 때 | 장면 |
| love | 연애 | 연 | 강하게 끌리고 부딪히는 인연(안괴) | 안·괴 6수 | 3 | 장면 |
| an · goe | 연애 | 광~ | 편안하게 끌리는 인연(안) · 깨지며 배우는 인연(괴) | 각 3수 | 장마다 3 | 장면 |
| spouse | 결혼·배우자 | 연 | 오래 함께할 인연(영친) | 영·친 6수 | 3 | 장면 |
| yeong · chin | 결혼·배우자 | 광~ | 서로를 키우는 인연(영) · 가족 같은 인연(친) | 각 3수 | 장마다 3 | 장면 |
| career | 직업 | 연~광 | 일에서 만나는 인연(성위) | 성·위 6수 | 해석 2 + 선택 | 선택 |
| seong · wi | 직업 | 참 | 함께 이루는 인연(성) · 긴장을 주는 인연(위) | 각 3수 | 해석 2 + 선택 / 3 | 선택 · 장면 |
| friends | 대인관계·가족 | 연~광 | 친구와 멀어지는 인연(우쇠) | 우·쇠 6수 | 3 | 장면 |
| u · soe | 대인관계·가족 | 참 | 편한 친구(우) · 기운을 빼는 인연(쇠) | 각 3수 | 장마다 3 | 장면 |
| fate | 대인관계·가족 | 연~ | 운명처럼 얽히는 인연(명·업·태) | 명·업·태 3수 | 3 | 장면 |

- 연어 6: anchor, love, spouse, career, friends, fate.
- 광어 8: love → an·goe, spouse → yeong·chin(+2).
- 참치 10: career → seong·wi, friends → u·soe(+2).

### 타로 — 연애 5 / 7 / 9, 선택 4 / 5 / 6

- 0장(바탕)은 기존 질문 경로(`ask-chapter-v1`)로 질문에 먼저 답한다. 이어서 스프레드와 질문의 뼈대를 쓴다.
- 카드 장은 `tarot.cards.<pos>`, `reading.cards:<pos>`, `cardSections:<pos>`, `positionReadings:<pos>` 를 소유한다.
- 흐름 장은 `combinations`·`combinationReading`·`summary` 를 소유한다. 3장 스프레드의 약 20% 는 조합 통찰이 비므로(`tarot-combination-engine.mjs:153-229`, 모두 조건부) `summary` 사슬 [flow, anchor] 로 흐름 장이 빈 장이 되지 않게 한다.
- 선택 장은 `finalReading`·`advice`·`caution`(역방향 ≥0.5 일 때만) 을 소유한다. 흐름 장이 없는 티어에서는 조합 사실도 가진다.
- 제외: topSummary, quality, levelUpGuide, levelUpQuests, questionType.

| 종류 | 연어 | 광어 | 참치 |
|---|---|---|---|
| 연애(6장: self_view_of_other, other_view_of_relationship, other_feeling_toward_me, other_romantic_will, core_block, short_term_outcome) | anchor, 카드 1·2, 카드 3·4, 카드 5·6, decision | 카드 3·4 가 두 장으로 나뉘고 flow 가 선택 장에서 떨어진다 | anchor, 카드 6장 각각, flow, decision |
| 선택(3장: cause, process, outcome) | anchor, cause+process, outcome, decision | cause·process 가 나뉜다 | flow 가 선택 장에서 떨어진다 |

### 장 수·총 분량 요약 (장당 목표 1,800~2,200자, 하한 1,400자)

| 체계 | 연어 | 광어 | 참치 | 시기 장(연/광/참) |
|---|---|---|---|---|
| 사주 | 8 (14.4~17.6k, 하한 11.2k) | 13 (23.4~28.6k, 18.2k) | 24 (43.2~52.8k, 33.6k) | 1 / 2 / 6 |
| 자미 | 8 | 13 | 20 (36~44k, 28k) | 1 / 2 / 4 |
| 베다 | 8 | 13 | 23 (41.4~50.6k, 32.2k) | 0 / 0 / 4 |
| 점성술 | 8 | 10 (18~22k, 14k) | 12 (21.6~26.4k, 16.8k) | 0 |
| 숙요 | 6 (10.8~13.2k, 8.4k) | 8 | 10 | 0 |
| 타로 연애 | 5 (9~11k, 7k) | 7 (12.6~15.4k, 9.8k) | 9 (16.2~19.8k, 12.6k) | 0 |
| 타로 선택 | 4 (7.2~8.8k, 5.6k) | 5 | 6 (10.8~13.2k, 8.4k) | 0 |
| v6 참고(모든 체계) | 8 (13.2~15.4k) | 11 (23~27.5k) | 15 (49.5~57k) | — |

- 모든 조합이 원가 설계 상한(연어 8 / 광어 13 / 참치 26)을 넘지 않는다(§5).
- v7 참치 최대(사주 24장)의 목표 합은 v6 참치 목표보다 약 10% 작다. 장당 분량 불변이 브리프이므로 받아들인다. 결정 5 의 공개 안내 갱신 대상이다.

## 4. 사실 원장 — 하위 ID 규칙 (`reading-v7-ledger.ts`, 결정적·LLM 없음)

### 분해

- 입력은 `DomainContext.facts`(필드 단위 `Evidence{id,label,value}`)다. 엔진과 `chapter-facts.ts` v6 경로는 건드리지 않는다.
- 하위 ID 는 `<domain>.<label>.<subkey>` 다.
- subkey 는 ASCII 슬러그(`[A-Za-z0-9_-]`, 여러 조각이면 `.` 로 잇는다)만 쓴다. (Phase 2 커밋 3 정정: 처음 적은 `:` 는 아래 정규식이 잇지 못해 `:year-day` 같은 꼬리가 남는다.) 매핑 표는 원장 모듈 한 곳에 둔다.
  - 이유: `redactInternalEvidence`(`consultation.ts:192`)의 ID 정규식은 ASCII `\w` 만 이어 붙인다. 그래서 `saju.tenGods.정재` 가 본문에 새면 `.정재` 꼬리가 남는다.
  - 앱은 `sources` 를 표시하지 않는다(`app/yeongnyangi/**` 검색 0건). 따라서 하위 ID 는 UI 에 닿지 않는다.
- 분해 축(§3 실측 반영)

| 체계 | 쪼개는 필드 → subkey | 통째 사실(쪼개지 않음) | 제외 |
|---|---|---|---|
| 사주 | `tenGods` → 십신 10종(개수 0 도 "선언된 부재"로 낸다), `tenGodsByPillar`·`pillarDetails` → 기둥 4개, `shinsal` → 신살 12종 이름, `natalInteractions` → `<종류>.<A>-<B>`, `yearlyLuck` → 연도(Y~Y+9, 시간 미상 연어는 결정 7 래퍼의 Y·Y+1), `monthlyLuck` → 연-월, `majorLuck` → current·next·arc | `dayMaster`·`pillars`·`strengthHeuristic`(기준점), `fiveElements`·`seasonalBalance`, `usefulGod`·`jong`, `advancedFactors` | `calculationMeta`, 비프리미엄의 대운 연결 키 |
| 자미 | `palaces` → 12궁(부부궁 표기), `fourTransformations` → 화록·화권·화과·화기, `yearlyTimeline` → 연도(같은 해의 `yearlyLuck` 은 이 ID 로 합친다), `majorLuck` → current·next(원장이 `minorLuck.current.age` 로 고른다), `minorLuck` → current·연도 | `lifePalace`·`bodyPalace`·`bureau`(기준점), `sanFangSiZheng` | `lunar`(생년월일), `minorLuck.baseYear`(출생연도, 개인정보 필터 `privacy.ts:3` 에 걸리지 않는다) |
| 베다 | `planets`(9개 배열) → 행성 이름, `houses` → 12하우스(+ 주인 행성 배치 조인), `yogas` → 요가 이름, `divisionalCharts` → D9·D10·D7·D12·D2, `vimshottariDasha` → currentMahadasha·currentAntardasha·next·arc | `lagna`·`moon`(기준점), `sun` | D1(planets 와 중복), transits, 출생 균형 주기의 시작일 |
| 점성술 | `planets`(10개 객체, 노드는 있을 때만) → 행성 이름, `houseCusps` → 12커스프, `aspects` → `<P1>-<type>-<P2>`(행성 이름 정렬, type 5종) | `ascendant`·`planets.Sun`(기준점), `midheaven` | — |
| 숙요 | 관계 지도(래퍼) → `<역할>.<수 인덱스>`(nameKo 가 겹치므로 이름 대신 인덱스) | `personA`(본명숙, 기준점) | `birthTimeContext` |
| 타로 | `cards` → 자리, `reading` → `cards.<pos>`·`cardSections.<pos>`·`positionReadings.<pos>`·`summary`·`combinations`·`combinationReading`·`finalReading`·`advice`·`caution` | `spreadId`·질문(기준점) | topSummary, quality, levelUpGuide, levelUpQuests, questionType |

### 소유

- 카탈로그의 `owns` 는 패턴이다. 각 패턴에는 **소유 사슬**(장 key 의 순서 목록)이 붙는다.
  - 그 티어에 있는 첫 장이 소유한다.
  - 예: 사주 인성(정인·편인)의 사슬은 [배움·지원(광어+), 직업(연어 대체)] 이다. 연어에는 배움 장이 없어서 직업 장이 소유하고, 광어부터는 배움 장이 소유한다.
- 모든 장은 최소 한 사슬의 첫 칸이어야 한다. 그래서 빈 장이 생기지 않는다.
  - 선언된 부재(예: 재성 0개 = 무재)도 소유 대상이다. 재물 장은 차트와 관계없이 늘 자기 사실을 가진다.
- 두 소유 지점을 잇는 사실(애스펙트·합충)은 긴장·조화 장(광어+)이 가진다. 그 장이 없는 티어에서는 목차 순서상 먼저 나오는 소유자가 가진다.
- 기준점 사실은 기준점 장만 소유한다. 다른 장에서는 `refs`(한 문장 참조만 허용)다.
- 시기 사실은 시기 장만 소유한다. 다른 장은 `timingRef:'summary'` 로 원장이 만든 결정적 한 줄(예: "올해 세운 丙午 — 정재가 들어오는 해")만 받는다.
- 확정 시점: prepare(`service.ts:125` 뒤)에서 확정해 매니페스트 스냅샷의 `chapter.owns`/`chapter.refs` 에 구체 ID 로 저장한다.
  - 그래서 생성 도중 날짜가 넘어가도 소유가 흔들리지 않는다.
  - 목차(제목·장 수)는 차트와 무관하다. 클라이언트 미리보기와 같다.
- 선택: `selectV7Facts` = 소유 ∪ refs. 모르는 ID 는 건너뛰고 로그를 남긴다.
  - 물어보기 0장은 여기에 두 가지를 더한다. `service.ts:136` 이 넣는 필드 선택자(`questionFactSelectors`, `reading-manifest.ts:53-59`: 기준점 + 질문 주제 필드 + 올해 운 + 일진)로 고른 필드 단위 사실, 그리고 기존 질문 근거 패킷이다.
  - 질문 답은 다른 장이 소유한 사실을 쓸 수 있다. 사용자가 물은 것에 먼저 답하는 것이 우선이고, 소유 충돌 검사는 카탈로그에만 건다.
  - 슬러그 표에 없는 엔진 값은 어느 장에도 들어가지 않는다. 정적 테스트는 엔진이 낼 수 있는 어휘(십신·신살·궁·행성 등)가 모두 슬러그를 가지는지 확인한다(fail-closed).
- 비프리미엄 티어에는 v6 와 같은 라벨 제거를 한 번 더 적용한다. 카탈로그 정적 테스트와 이중 방어다.

### 기준점 낱말 (Phase 3 검증: 소유 장 밖에서 한 문장 이하)

| 체계 | 기준점 낱말 | 소유 장 |
|---|---|---|
| 사주 | 일간, 일주, 신강·신약 | 바탕 |
| 사주 | 오행 원소별 설명 | 건강 |
| 자미 | 명궁, 신궁 | 바탕 |
| 베다 | 라그나, 나크샤트라 | 바탕 |
| 점성술 | 상승점(ASC), 태양 별자리 | 바탕 |
| 숙요 | 본명숙 | 바탕 |
| 타로 | 스프레드 설명 | 바탕 |

### 이전 장 전달

- §2 의 `highlights[]`·`topics[]` 태그로 넘긴다. 소유 주제, 핵심 결론, 이미 쓴 행동, 이미 쓴 장면 소재가 대상이다.
- 다음 장 프롬프트는 이 목록을 "이미 다룬 것 — 다시 설명하지 말고 필요하면 한 문장으로 가리킨다"로 받는다.

## 5. 원가 가드 산술 (추정, Phase 4 골든에서 실측 교체)

- 상수는 `worker/yeongnyangi/fortune/reading-v7-cost.ts` 한 곳에 둔다.
  - 단가는 테스트가 `config/llm-tariffs-20260921.json` 에서 읽는다. 입력 $0.30/1M, 출력 $2.50/1M 이다.
  - ₩1,400/$ 를 가정한다.
- 장 i 의 원가
  - 출력 = (목표 상한 2,200 + 머리말 800) × 1.5 + thinking 1,024 = 5,524 토큰.
  - 입력 = 15,000 + min(150 × i, 3,000) 토큰. 뒤 항은 이전 장 전달분이고, 3,000 토큰에서 결정적으로 자른다.
- 물어보기는 질문 분석 1회를 더한다. 입력 4,000 + 출력 1,024 로 ₩5.3 이다.
- 조건: 책 원가 × 재시도 계수 ≤ 가격 × 10%. 계산은 node 실행으로 확인했다.

| 계수 | 연어 ₩300 상한 | 광어 ₩500 상한 | 참치 ₩1,000 상한 |
|---|---|---|---|
| 1.00 | 11장 | 18장 | 37장 |
| **1.25(승인)** | **9장** | **15장** | **30장** |
| 1.75 | 6장 | 10장 | 21장 |

- 물어보기가 가장 비싸다. 0장에 질문 답이 붙기 때문이다(질문당 480자, 최대 8개 — `consultation.ts:113`). 여기에 질문 분석 1회가 더해진다.
- 계수 1.25 에서의 원가율(node 실행)

| 장 수 | 해석 | 물어보기 1문항 | 물어보기 8문항(최악) | 1.25 상한(해석 / 8문항) |
|---|---|---|---|---|
| 연어 8 | 8.6% | 8.9% | 9.7% | 9장 / 8장 |
| 광어 13 | 8.5% | 8.6% | 9.1% | 15장 / 14장 |
| 광어 14 | 9.1% | 9.3% | 9.8% | 〃 |
| 참치 26 | 8.6% | 8.7% | 8.9% | 30장 / 29장 |

- 설계 상한은 연어 8장, 광어 13장, 참치 26장이다.
  - 광어 14장은 8문항 최악에서 9.8% 라 추정 오차를 흡수할 여유가 없다. 그래서 13장으로 잡는다.
  - 인수인계의 "참치 31장"은 이전 장 전달 입력 항을 넣어 다시 계산하면 30장이다.
- 장당 목표 상한은 2,200자로 고정한다. 2,500자로 올리면 8문항 최악에서 연어 8장이 10.2%, 광어 14장이 10.3% 로 10% 를 넘는다.
- 정적 테스트는 체계·티어·종류(해석 / 물어보기 8문항) 조합마다 위 식이 10% 이하인지 확인한다. 카탈로그를 늘리면 테스트가 막는다.

## 6. Phase 2 실행 순서 (다음 세션부터, 플래그 OFF 유지)

각 커밋은 따로 되돌릴 수 있게 나눈다. 착수 전에 origin/main 기준으로 겹치는 파일을 다시 확인한다. 겹치는 세션은 종격 세션(`service.ts` fingerprint·`usefulGod`/`jong`)과 타로 덱 세션이다.

1. **불변 스냅샷**(첫 커밋, 테스트만)
   - 대상: 고등어 전부 + 범위 밖 경로(집중형·timing·퓨전·레거시 무종류·영감) + 플래그 OFF 인 연어·광어·참치 해석/물어보기.
   - 고정 대상: 매니페스트, `generateChapter` 가 mock 장마다 만드는 `FortuneLLMRequest` 전체(system·domainRules·calculatedData·outputSchema·maxOutputTokens·promptVersion), 검증 경로, fingerprint 입력 객체.
   - 고정 방법: 정규 JSON 의 sha256 을 테스트 안에 인라인으로 둔다. 레포에 스냅샷 기반 시설이 없기 때문이다(골든 선례는 naming-prompt 하나).
   - 공급자 상한은 `maxOutputTokens` 에서 결정적으로 나온다(`code-destiny.ts`). 그래서 요청 객체를 고정하면 모델 파라미터도 함께 고정된다.
2. `reading-v7.ts`: 카탈로그, `v7Applies`(플래그 인자 주입), `readingManifestV7`(순수), `withV7Sections`. 여기에 `READING_V7_VERSION`·`hasReadingSections`·v7 정책 등록(§1)을 더하고, 정적 테스트 다섯 가지를 함께 넣는다.
   - 소유 충돌 0.
   - 체계 안 단조성.
   - `evidenceInputs` 가 실제 필드임.
   - 금지 요소 0.
   - 원가 가드.
3. `reading-v7-ledger.ts`: 하위 ID 분해와 소유 확정. 결정적이고 LLM 을 쓰지 않는다. 체계별 fixture 차트로 테스트한다. `chapter-facts.ts` 의 v6 경로는 바꾸지 않는다.
4. 시기 매트릭스: `extendAskLocalTiming` 을 재사용한다. 시기 장만 `owner` 이고, 나머지 장은 결정적 한 줄 요약을 받는다.
   - 래퍼는 정규화 입력(`normalized`)을 요구하는데, 스냅샷은 이것을 영감 모드일 때만 저장한다(`service.ts:157`). 따라서 매트릭스는 prepare 에서 계산해 스냅샷에 저장하고, 장 생성 때 다시 계산하지 않는다. 물어보기가 `generationCheckpoint.evidence` 에 저장하는 것이 선례다.
   - 래퍼 1회는 사주 LB 8회, 자미 차트 44회를 계산한다(정적). prepare 의 워커 CPU 시간을 이 단계에서 잰다.
   - 래퍼의 사주 `monthlyLuck` 은 창으로 자르지 않은 48행이다. 원장이 12개월로 자른다.
5. `chapter-v7` 프롬프트·출력 스키마
   - 블록 = 인사이트 단위, 장면 ≤1, 선택은 결정 장에만. 블록 스키마 `id/title/paragraphs/sources` 는 유지해 렌더러 분기가 필요 없게 한다.
   - 이전 장 전달은 기존 필수 필드 `highlights[]`·`topics[]` 를 재사용한다(§2). 스키마·렌더러·DB 는 바꾸지 않는다.
6. `service.ts` 배선(RED: fingerprint). 스냅샷 테스트를 다시 통과해야 한다.
7. UI. 레이아웃 CSS 는 바꾸지 않는다.
   - `Consultation.tsx:208` 의 분량 표시는 v6 정책 값(`policyForReading(...).target`)이라 v7 과 어긋난다. v7 이면 매니페스트 `targetChars` 합계로 보여 준다.
   - 두 목차(`Consultation.tsx:210`, `ReadingBook.tsx`)에 파트 머리를 넣는다. `partKey` 가 있을 때만 넣으므로 v6 는 그대로다.
   - `titleKey` 사전(ko·ja·en)은 `reading-copy.ts` 패턴(`Copy=typeof ko`)을 따른다. 모바일 목차도 이 단계에서 한다.
   - `verify-feature-marketing-schema.mjs:274` 가 요구하는 리터럴 `consultationManifest(item,kind,topicId).length` 는 유지한다.

- 그 뒤 단계
  - Phase 3 검증기(v7 전용): 위반 시 1회 재생성 → 결정적 문장 삭제 + 로그. 거부로 끝내지 않는다.
  - Phase 4 골든: 과금, 1회 승인이 필요하다.
  - Phase 5 플래그 ON + 롤백 문서.
    - 같은 커밋에서 공개 티어 표(`1000-won-fortune/page.tsx:171`)를 v7 값으로 바꾼다(결정 5). 이 페이지를 검사하는 verify·sitemap 서명도 함께 확인한다.
    - 다음 테스트도 이때 함께 고친다. 플래그 OFF 동안에는 깨지지 않는다.
    - `yeongnyangi-reading-v6.test.mjs:45-65`: 모든 상품×종류가 v6 이고 8/11/15장이어야 한다.
    - `yeongnyangi-section-paragraphs.test.mjs:84`: 매니페스트에서 모은 버전 집합이 {V5, V6} 이어야 한다.
    - `yeongnyangi-consultation-kinds.test.mjs:27`: `rows.length === chapterCount` 여야 한다.

## 7. 검증

- Phase 2(설계 기준)
  - `node --require ./scripts/lib/mock-network-guard.cjs --test` 로 새 v7 테스트와 기존 `__tests__/ui/yeongnyangi-reading-v6.test.mjs`·`yeongnyangi-ask-evidence`·`yeongnyangi-consultation-kinds` 를 돌린다.
  - 그 뒤 `npm run check:fast` 를 1회 돌리고, push 뒤 main CI 를 확인한다.
  - 과금 LLM 0회, 전부 mock 이다.

## 위험

- 원가는 추정이다. 실제 토큰은 Phase 4 골든 전까지 미측정이고, 표본은 사주·베다·점성술 v6 5건뿐이다.
- 카탈로그의 해석 매핑(예: 십신 계열 → 영역, 숙요 관계 묶음 → 영역, 베다 카라카)은 설계 판단이다. 엔진이 계산한 필드만 근거로 쓰고, 해석 규칙은 골든 검토에서 조정할 수 있다.
- 부재 확률(십신·신살)은 추정이다. 골든 fixture 에 무재 명식과 귀인 없는 명식을 넣어 빈 장이 생기지 않는지 확인한다.
- 자미 현재 대한은 엔진 값이 아니라 원장이 소한 나이로 고른다. 엔진 나이 규칙(虛歲)과 어긋나지 않는지 fixture 로 고정한다.

## 범위 밖 관찰 (보고만, 이번 설계에서 고치지 않음)

- 라후·케투 역행이 늘 false 다.
- 베다 트랜짓 시각이 23시를 넘을 수 있다.
- 타로 엔진은 질문 문장을 해석에 쓰지 않는다.
- 외부 점성술 어댑터의 애스펙트 type 을 검증하지 않는다.
- 숙요 nameKo "위" 가 두 수에 겹친다.
- 인수인계의 신살 "10종"은 단일 정의만 센 값이다. 쌍 정의(귀문관·원진)를 더하면 12종이다.
- 사주 십신 분포의 비견은 일간 자신을 세므로 늘 1 이상이다.
- 자미 도메인 규칙은 "유년사화"를 구분하라고 하지만 엔진은 유년사화를 계산하지 않는다(`ziwei/index.ts:7`).

## 롤백

- Phase 1: 문서 커밋 1개 revert.
- Phase 2 이후: 커밋 단위 revert. 플래그 ON 이후에는 활성화 커밋 revert + 승격. v7 코드는 진행 중인 책이 끝날 때까지 지우지 않는다.
