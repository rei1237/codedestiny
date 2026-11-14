---
status: in-progress
updated: 2026-11-14
next: "AnimalDestiny 원본 전체 결과·10탭·6심층·궁합·도감·카드 내보내기를 토스에 연결하고 targeted 검사·커밋·실제 AIT QA까지 계속한다."
---

# 첫 행동

handoff 스킬과 CLAUDE.md를 읽고 아래 공유 worktree에서 이어간다. 원격 push/전체 check:fast/CI/console은 coordinator가 소유하므로 독립 실행하지 않는다. 새 발견 루프를 벌이지 않고 고정110 canonical의 `animal-destiny` 행 누락을 끝낸다.

- coordinator: `/root/launch_final_coordinator`
- private API/fixture/빌드 담당: `/root/launch_final_coordinator/private_finish`
- 원본 source 담당(인계 전): `/root/launch_completion/remaining_audit`
- worktree: `D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438`
- branch: `wt/toss-launch-completion-20261114-165438`
- 마지막 본인 코드 커밋: `b5de20414`
- 본인 미커밋 코드 없음. status에 보이는 private QA 파일은 다른 담당 것이므로 보존.

## 지금 상태

최신 checkpoint main push는 `9a6ac23eb`. 그 이후 다음 코어가 완료되었다.

- `66080e7c9`: 서양 시너스트리2(직접입력/유명인) + 국제 출생좌표/지역 IANA 시간대 입력.
- `f857266dd`: 베다 아쉬타쿠타 궁합 + 독립 Prashna 질문 차트.
- `b5de20414`: 실제 AIT에서 발견한 시너스트리 과거가격배지 정정.

실제 AIT `01a1d9c9-e74b-7540-af9f-81dcba5c8032`는 앞의4모드를 포함하나 마지막 배지 수정은 미포함이다. expanded `100,022,244`B로100MB보다22,244B 초과. coordinator가 원문 gzip 최적화 담당. 이미지 품질을 임의로 낮추지 않는다. Animal UI 추가량도 coordinator와 조율한다.

## 승인 상태

2026-11-14 사용자는 “최종 CI 결과를 확인하고 … 모든 작업 끝내서 론칭까지 진행”을 요청했다. 개발 구현을 계속하며 **실 LLM·실결제·운영 DB 쓰기 금지**는 계속 유지된다. console/운영 Worker/상품 가격·SKU/실제 검토 제출 등의 운영 판단은 coordinator가 맡는다. 개발자 지시에 따라 이미 승인한 새 브라우저 공간·비공개QR 작업 승인은 재질문하지 않는다. 하위 source 담당이 외부 제출을 실행하지 않는다.

## 작업 규칙과 함정

- 같은 worktree를 여러 agent가 공유한다. `reset --hard`, checkout 전체, stash, 광범위 git add 금지. 본인 파일만 stage/commit.
- 기능단위 targeted→commit, 전체 check:fast/prepush/push는 coordinator가 합친다.
- source build freeze 요청을 지킨다. 현재 최신 build가 끝나 **freeze 해제됨**. 빌드 담당에게 source 안정 시점을 알린다.
- `rg`에 Windows 경로 wildcard를 직접 주면 안 된다. directory + `-g` 또는 `rg --files`로 먼저 찾는다.
- Node `const module=...`는 Next ESLint가 거부한다. `compiled` 사용.
- 원본 JS/TS 엔진 동등성 검증은 로컬 Swiss/verified ephemeris, mock network guard에서 한다. 실HTTP fallback 금지.
- 실제 AIT 사용 경로는 private 담당이 검증한다. 컴포넌트 단위 통과를 실제 AIT 통과로 보고하지 않는다.
- 새 무료 결과를 임의로 구매 보관함에 저장하지 않는다. 원본 메모리/저장 정책을 유지한다.
- `check:fast` 실행 중 새 untracked source/test도 검색범위에 들어갈 수 있다. sourcefreeze 중에는 읽기 또는 외부Temp 초안만 사용.
- Tailwind/CMS/원본 import 때문에 번들이 커질 수 있다. 무손실 gzip 추출 플러그인은 `apps/toss/private-simulation/compressed-naming-data.mjs`에 있다. coordinator 소유이므로 편집 조율.

## 완료한4모드 설계·검증

### 서양

`AstroHome.tsx`가 native `/astrology`에서 natal/직접/유명인 탭을 제공한다. `AstroSynastry.tsx`는 guest 원본 공개 계산만 요청한다.

- `GET /astro/synastry/people`: `tossAstroSynastryPeople`의 원본 전체인물/국가/분류/CSS.
- `POST /astro/synastry`: `{featureKey:'compat-astro-direct-synastry'|'compat-astro-synastry',birth,partner?:{name,birth},celeb?:{name,birth}}`.
- `worker/toss/astro-synastry.js`→원본 `handleAstroSynastry`의 명시적 public branch. profile/order/auth hints 제거. 양쪽 lunar/IANA 정규화.
- `scripts/extract-astro-section-runtime.mjs`는 원본 `astroNeonCss` 정적문자열과 원본 CELEBS catalog를 추출. 기존 report계산/본문 불변.
- `bindPrompt`는 무료 정책에 맞게 원본 과거 배지→“궁합 결과 기반”, status→중립안내. 프롬프트 본문은 불변. `b5de20414`가 마지막수정.
- `AstralBirthFields.tsx`: 기존 국내도시 또는 세계 위도/경도/IANA timezone. AstroReading/Synastry/VedicReading/Compatibility에서 사용. NY7월 -4, Kolkata5.5 독립 계산 검증.
- `question-location.ts`: 원본 플랫폼 행동을 `Device.getLocation({accuracy:Accuracy.Balanced})`, `Clipboard.setText`로 연결. 일반config geolocation access 선언은 f857 포함. 실제 권한/저장공유는 실기기 남음.

검사: original Jest `npm run test:jest -- --runInBand __tests__/worker/astro-synastry.test.js`14PASS. Toss routes+UI/adapter79PASS(이후 tests추가), Intl 포함8PASS, 마지막 badge/UI3PASS, tscPASS, generator --check PASS. Jest 테스트를 node --test로 실행한 첫 시도는 runner mismatch로 실패했으며 올바른 runner로 통과.

### 베다

`VedicHome.tsx`→guest natal, 로그인필수 compatibility/Prashna. sessionStorage에는 탭 선택만 저장한다.

- `/vedic/compatibility`: auth 뒤 native owner, `{name,birth,partner:{name,birth}}`→`tossVedicReading` 두 원본 strictSwiss samples→`{ok,accessSource:'public',featureKey:'vedic-compatibility-per-use',stored:false,mine,partner}`.
- `canonical/vedic-reading.mjs`에 원본 calcCompatibility + `doCompatCalcCore`의 성공 결과 template literal만 추출. catch의 다른 template에 덮어쓰이지 않도록 8항목 문구 확인. 로그인/PG/LLM DOM handler는 실행하지 않음.
- `VedicCompatibility.jsx`: original buildChart→calcCompatibility→renderVedicCompatibility. 이름만 text escape, 원본문장/점수/8항목/6? 원본 강점·주의·조언 그대로. original prompt/LLM 별도 제품은 새로 무료화하지 않음.
- `/vedic/prashna`: login required, 원본 `createPrashnaSnapshot`(서버 현재시각, 단일질문12..600) + `generatePrashnaPromptResult`; `{question,latitude,longitude}`만 받는다. 원본과 동일하게 DB/order생성 없음. 원본 반환 snapshot/result에는 legacy amount/orderId 필드가 있지만 UI는 무료 계산이며 가격/구매버튼을 만들지 않음.
- Prashna UI: 원본 계약/관계/시험/사업4예시, native위치 또는 직접좌표, 결과기준시각/프롬프트복사/JSON차트, nativeback 입력복원. 영냥이 prashna-v1과 다른 기능.
- private fixture 계약: 본인1990-02-03 F08:35서울, 상대1991-04-05 M12:30서울. compatibility exact `<Reading {...props}/>` slot exampleBirth. Prashna는 계약질문 `'이 계약을 이번 달 안에 진행하는 것이 유리할까?'` + 서울37.5665/126.978. UI 오류키 `VEDIC_COMPATIBILITY_EXAMPLE_REQUIRED`, `PRASHNA_EXAMPLE_REQUIRED`.

검사: 원본 calcCompatibility27×27=729조합 동등성, 원문8항목/조언 검사. route+source+adapter79PASS; login/currentlocation denied→retry/copy/nativeback UI2PASS; Worker no-undef948filesPASS; tscPASS; 대상 ESLint error0. 원본 Prashna chart.calculatedAt는 실행 metadata이므로 해당필드만 비교 제외하고 나머지 차트·prompt 완전동등성 검증.

## 다음 AnimalDestiny 설계·원본 근거

**실제 누락 확인**: 현 `apps/toss/src/AnimalDestiny.tsx`는70줄, 이름/4기둥/12이름만 보여 준다. 웹은 `animal-destiny-unlock`이 현재 free-policy에 들어 있어 전체결과가 무료다. 기존 source/테스트의 “paid interpretation 제외” 주석은 낡았다. 임의 무료화가 아니라 현재 정책 복원이다.

핵심 원본:

- `app/saju/animal-destiny/components/AnimalResultScreen.tsx`: props 기반 전체결과. 10탭, 6심층(personality/love/career/wealth/relationship/today), 성장미션/루틴, 도감, 상대방폼/궁합, 공유카드. 원본 UI를 직접 재사용하는 방안이 가장 누락이 적다.
- 하위: TwelveAnimalResultCard/Tabs/AdviceCard/DexGrid/ShareCard 및 `components/fortune/animal-twelve/AnimalCompatibilityPanel.tsx`.
- 원본 아트는 SVG/emoji/팔레트. 새 raster asset 필요 없음.
- `app/saju/animal-destiny/lib/paidReading.ts`: 원본 POST `/api/saju/section`, featureKeyanimal-destiny-unlock, birth `{date,calType,timeKnown,hour,minute}`. matching profile 있으면 덧붙이지만 public branch는guest 가능.
- `worker/lib/saju-section/report.js:237 buildAnimalDestinyHtml`: 출생지 없이 서울 기본. `calculateNatalSaju({birthDate:calendarDate,birthTime:timeUnknown?undefined:HH:mm,calendarType:calType,isLeapMonth:...,birthPlace:undefined},{allowMissingLongitude:false})`. 결과`{animal:buildAnimalDestinyReading(pillars,timeUnknown)}`.
- `worker/lib/saju-section/animal-destiny.js`: 원본 natal→normalizeStem/Branch→sajuResult→getAnimalBySajuResult/getAnimalDisplayData→원문 result,sections,detailed,dex.
- `scripts/extract-saju-section-runtime.mjs`/`runtime.generated.mjs`의 createAnimalDestinyRuntime에 normalizeStem/Branch,getTwelveStagesForPillars,getFourPillarStageItems,getAnimalBySajuResult,getAnimalDisplayData,ANIMAL_DESTINY_LIST,resolveTwelveGrowthAnimalResult,buildTwelveAnimalSections,buildDetailedInterpretation 이미 노출.
- 궁합 원본 `app/saju/animal-destiny/lib/animalMapping.ts::calculateAnimalCompatibility` + `analysisNarrative.ts::buildCompatibilityStageEvidence`. store/useAnimalDestinyStore.ts236 부근이 정확조립. partner={input,animalId,animalData,primaryStage,score,relationType,summary,goodPoints,clashPoints,tips,stageEvidence,breakdown}.
- `lib/sajuAdapter.ts::calculateLocalResult`/computeNatalFromInput 원본 fullengine는 아주크다. 단순동물원국에는 server위원본순수 builder를 재사용하여 frontend에 fullengine을 새로 넣지 않기.
- AnimalDestinyInput는 `{name?,birthDate,birthTime?,gender:'male'|'female'|'unknown',calendarType:'solar'|'lunar',lunarLeap?}`. 원본 기본화면 출생도시없음. 기존Toss city요구를 제거하고원본서울정책일치 필요.
- `AnimalResultScreen` props: `{animal,twelveStages,sajuResult,timeUnknown,partner,shareCardRef,onSubmitPartner,onSaveCard,onShareCard,isExporting,paid,onRetryPaid}`. pure native API result를 `paid:{status:'ready',reading}`에 주면 프런트 checkout/auth/store를 import할 필요 없음. 이름은원본 historicaltype일뿐 무료정책을바꾸지않음.
- UIcopy53KB+animalTwelveData36KB+mapping11KB 정도. CMS 정본/원문을보존하고 번들압축담당과조율. genericCMS를import하면거대data가 유입될수있으니최종AIT실측.
- Shared card: 원본 `hooks/useAnimalCardExport.ts`는 html-to-image toPng1080×1920 후browserdownload/share. native는 기존 `src/media.ts`의 File.saveBase64/Share adapter 패턴 재사용. 새animal filename/publicentry path로 연결하되 완료메시지는 실제SDK가증명하는범위만. 실기기필수.
- `AnimalResultScreen` uses framer-motion `m` 하위, nativewrapper에 LazyMotion/domAnimation 필요 여부 확인.
- 기존 `apps/toss/test/animal-destiny.test.mjs`의 fullpaid본문없음가정은 현freepolicy와맞게갱신. lunar_leap2023-02-01→일주己卯/병/구름토끼, 시각모름 시주없음, accountchangeclear는유지.

권장 다음 구현 단위: native guest API에 원본 animal basis+reading(+optionalpartner)을돌려주고, Toss AnimalDestiny wrapper가 기존 원본 AnimalResultScreen에공급. 단일birth로다른service/purchase로직우회불가 freekey고정. local deterministic propertytests로12동물/10tabs/6chapters/unknown/leap/궁합144조합원본동등성 확인. actualAIT home→동물점→입력→10탭/6심층/궁합/도감→다시입력까지private담당과검증. 파일저장/공유만 실기기게이트.

## 단계

- [x] 서양2/국제입력 코어커밋·targeted
- [x] 베다2 코어커밋·targeted
- [x] 실제AIT가격배지회귀 원인수정
- [ ] 4모드 최종 AIT 재검증 결과 수령(coordinator/private 담당)
- [ ] AnimalDestiny 전체 원본 이식·targeted·commit
- [ ] Animal 실제AIT home 경로·좁은화면·계정변경·기기adapter 확인
- [ ] coordinator에증거/변경파일/잔여운영항목 전달
- [ ] 이handoff status done 닫기(코드완료후)

이문서는전체110정밀감사완료선언이 아니다. coordinator가별도110행audit정본을 소유한다. 이전 직접대조완료는 관계회복/HD/Novel/Psychotest/Famous/Omikuji/Vedic기본7+8/서양10/숙요기본·4도구·극T·전생, 연간은다른담당근거다.
