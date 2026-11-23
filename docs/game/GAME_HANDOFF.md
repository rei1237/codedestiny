---
status: done
updated: 2026-11-23
next: 실제 모바일에서 4단계 전투 조작과 연출을 점검하고, 다음 제작 단계는 사용자 요청을 따른다.
---

# 꿀꿀운세 카드 RPG · 4단계 전투

## 2026-11-23 전투 변경

[달빛 전장](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#battle)의 전장 목록에서 **운명해방 연습**을 선택한다. 저장 편성으로 출전하거나 처음이면 ‘모카와 임시 지원으로 연습’을 누른다. 전열의 운명 게이지가 100%로 시작한다. 손패 위의 금빛 버튼은 캐릭터·유형·필살기 이름을 표시하며 일반 카드와 합쳐 세 행동까지 선택할 수 있다. 기존 진행 중 전투는 먼저 결과를 확인하거나 전투 종료 후 연습으로 진입한다.

일반 공격은 의상 시트의 준비 자세, 접근 또는 발사, 타격, 복귀 자세를 이어 재생한다. 적의 공격도 대상 위치를 향한다. 타격별 피해, HP 감소, 효과음은 엔진의 같은 타격 배열을 사용한다. 필살기 이름은 도감, 선택, 컷인, 전투 기록에서 같은 전투 버전을 참조한다. 연이의 연꽃잎, 영냥이의 초승달 발톱, 윤달의 별, 서한비의 빗줄기, 모카의 음파, 루나의 밀가루와 꽃가루로 명중 효과를 구분했다. [전투 규칙·필살기 목록](BATTLE_RULES.md)

변경 위치는 게임 폴더의 `BattleScreen.tsx`(선택·타격 시점 표시), `BattleActor.tsx`와 전투 CSS 두 파일(동작·컷인·명중), `battle-choreography.ts`(표적 좌표와 연출 시간), `formation.ts`(필살기 이름), `battle-data.ts`·`battle-session.ts`·`battle.ts`(연습 전장과 시작 게이지)다. 전투 수치·순환 덱·게이지 소비는 기존 전투 엔진에서 판정한다. 이번 변경의 범위는 4단계다.

- `node --test scripts/verify-card-rpg-battle.cjs scripts/verify-card-rpg-battle-receipts.cjs` 15건 통과. 7개 전투 버전의 기명 해방과 고정 입력 재생, 전열 교대·전투불능, 마지막 타격, 동시 전멸, 제한 턴, 서버 검산과 중복 보상 차단을 확인했다.
- `node scripts/verify-card-rpg-choreography.cjs`는 Chromium에서 같은 시드와 행동으로 1배·2배·간소 결과, 턴 복원, 기명 필살기, 다단 피해와 승리 후 복귀를 검사한다. [실제 플레이 영상](D:/Development/captures/card-rpg-step04-motion/moka-release.webm) · [필살기 선택](D:/Development/captures/card-rpg-step04-motion/release-hand.png) · [모카 컷인](D:/Development/captures/card-rpg-step04-motion/moka-release.png)
- 800×360, 844×390, 915×412, 1024×768, 1280×720 및 세로 390×844에서 일반 카드 5장과 필살기 3개의 터치 폭·높이가 각각 44px 이상임을 검사했다. 가로 다섯 규격에서 여덟 버튼이 모두 화면 안에 들어왔다.
- Chromium에서 실제 근접 공격자의 전진 거리, 다단 피해 중 표적 이미지 개수와 HP를 확인했다. `node scripts/verify-card-rpg-art.cjs --browser`에서 11가지 외형 × 11가지 상태와 간소 모션을 검사했고 `npm run typecheck`도 통과했다. [근접 공격 화면](D:/Development/captures/card-rpg-step04-motion/melee-approach.png)
- 일회용 개발 프로필에 레벨 1 동료 셋으로 편성을 저장한 뒤 실제 보스전에서 매 턴 약한 카드 한 장을 선택했다. 전열 전투불능 → 패배 결과 → 로비 복귀를 확인했다. [패배 결과](D:/Development/captures/card-rpg-step04-motion/defeat.png)
- 저장소 통합 검사에서 결제 관련 78개, 변경 파일 린트·타입 검사가 통과했다. 전체 Node 검사에서는 이전 단계에도 실패한 외국어 운세 이름 검사(`__tests__/fortune/sky-and-range.test.mjs`)가 재현됐다. [4단계 검사 로그](D:/Development/captures/card-rpg-step04-motion/check-fast.log)
- 이번 영상은 PC Chromium 844×390에서 녹화했다. 실제 스마트폰과 일곱 전투 버전 각각의 브라우저 영상은 미검증이다. 연습은 개발 데이터이고 운영 자산을 지급하거나 차감하지 않는다.

## 이전 단계별 인수인계

## 바로 플레이하기

[편성](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#team)에서 모카를 전열에 배치하고 ‘세 번째 알람’을 장착한다. 의상은 [동료](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#cast)에서 먼저 고를 수 있다. ‘저장하고 출전’으로 이동한 뒤 ‘출전’을 누른다. 새 계정은 [달빛 전장](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#battle)에서 ‘모카와 임시 지원으로 연습’으로 바로 시작할 수 있다.

1. 적을 터치해 표적을 지정한다. 손패에서 최대 세 장을 차례로 누른다. 선택한 카드를 다시 누르면 해당 순번이 빠지고 나머지 순번이 당겨진다.
2. 전열 아래 이름을 눌러 스킬을 쓴다. 게이지를 채우면 일반 손패 옆에서 운명해방을 고를 수 있다. 동료 행동 창에서 후열과 교대하고 상단 기록 버튼에서 로그를 연다.
3. 현재 턴의 선택을 확정하면 타격 순서대로 연출한다. 간소 모션·배속·건너뛰기는 같은 판정을 재생한다. 새로고침하면 확정한 입력까지 복원한다.
4. [본편](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#campaign)에서 제1장과 두 필수 전투를 마치면 선착장 의뢰가 열린다. 성장 → 예장 → 교류 → 스킬·이벤트, 보스 도전, 다음 장 도입까지 이어진다. [전투 수첩](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#history)에 자유 전투 결과와 의뢰 보상을 기록한다.

## 단계별 구현과 정본

| 단계 | 구현과 변경 파일 | 검증 |
|---|---|---|
| 04 전투 | `battle.ts`, `battle-data.ts`, `battle-session.ts`, `BattleScreen.tsx`. 각자 일반 카드 5장, 생존 전열 3명 기준 15장, 매 턴 5장을 공개한다. 궁극기는 덱 밖에서 한 행동을 사용한다. 계산식과 턴 순서는 [BATTLE_RULES.md](BATTLE_RULES.md)에 있다. | 손패 순환·전투불능·교대·체인·동시 전멸·웨이브·결과 재생 및 편성 복원. |
| 05 전투 원화 | `BattleActor.tsx`, `battle-appearance.ts`, `CharacterCard.tsx`, `public/images/card-rpg/`. 동료 6장의 700×1050 원화와 의상·전투 버전을 포함한 11가지 전투 외형. 소품별 실루엣·포즈와 제작 경로는 [BATTLE_ART.md](BATTLE_ART.md)에 있다. | 88포즈, 외형·동작 121개 조합, 간소 모션, 소장 카드 이미지 디코딩. |
| 06 본편 | `campaign-data.ts`, `campaign.ts`, `StoryCampaign.tsx`. 원작 장면 ID, 선택지, 읽은 대사·책갈피·서고와 원작 출처는 [CAMPAIGN.md](CAMPAIGN.md)에 있다. | 원문 해시·장면 순서, 제1장 끝과 다음 장 도입까지 진행. |
| 07 소환 정산 | `WalletSummon.tsx`, `scripts/fixtures/mock-card-rpg.mjs`, `scripts/mock-dev-api.mjs`. 개발 로그인과 격리된 기존 월정석 원장 로직, 버전별 가격·보장·응답 유실 복구. [ECONOMY_SPEC.md](ECONOMY_SPEC.md) | 개발 10회 캐릭터 600→200, 10회 예장 200→0. 응답 유실 뒤에도 영수증 2건·획득 슬롯 20건. 로그아웃·다른 세션 접근 거부, 운영 환경에서 테스트 소환 비활성. |
| 08 성장 | `growth.ts`, `GrowthScreen.tsx`, `collection.ts`, `formation.ts`. 캐릭터·스킬·예장 강화, 소재 보호, 의상과 성능 버전 구분. | 성장 전후 수치, 재시도·경합, 소유 인벤토리, 장착·보호, 브라우저 복원. |
| 09 의뢰 | `scripts/fixtures/mock-card-rpg-battles.mjs`와 캠페인 정의. 로컬 서버가 출전 티켓·시드를 발급하고 동일 전투 엔진으로 입력을 재생해 영수증을 한 번 발행한다. 등불 이벤트의 세 칸에는 선택한 카드 박자를 표시한다. 결과와 보상은 선택한 전투 행동으로 결정한다. | 필수 전투 포함 의뢰 9개 끝까지 진행. 교류·스킬·성장 보상, 보스, 이벤트 해금과 재정산 차단. |
| 10 검증 | `scripts/verify-card-rpg-*`, [BALANCE.md](BALANCE.md). | 고정 시드 216전, 가로 5개 크기와 세로 1개, 실제 UI에서 소환→편성→전투→저장·복원→의뢰·강화. |

## 재현과 측정

게임 코드는 `app/games/kkulkkul-card-rpg/` 안에 있고 이미지·모듈 CSS도 게임 전용이다. 4–10단계 기능 기준 커밋은 `7e9d61e009`이다. 로컬 미리보기에서 아래 검사를 실행했다. 브라우저 검사는 Playwright 설치 Chromium 또는 `CHROMIUM_PATH`를 사용한다.

```powershell
npm run typecheck
node --test scripts/verify-card-rpg-battle.cjs
node scripts/verify-card-rpg-campaign.cjs
node scripts/verify-card-rpg-battle-receipts.cjs
node scripts/verify-card-rpg-growth.cjs
node scripts/verify-card-rpg-wallet.mjs
node scripts/verify-card-rpg-preview.cjs
node scripts/verify-card-rpg-collection.cjs
node scripts/verify-card-rpg-play.cjs
node scripts/verify-card-rpg-art.cjs --browser
node scripts/verify-card-rpg-growth-ui.cjs
node scripts/verify-card-rpg-wallet-ui.cjs
node scripts/verify-card-rpg-frame.cjs
```

Windows, 로컬 Next 개발 서버, headless Chromium 149.0.7827.55, 844×390, 일반 모션·효과음을 켠 한 턴에서 프레임 간격 131개를 측정했다. 평균 16.79ms, 95백분위 16.8ms, 최대 33.3ms였다. 출전 버튼부터 첫 손패까지 405ms, 새로고침 탐색 시작부터 복원 손패까지 1,567ms였다. JS 힙 관측값은 약 99MiB이며 한 시점의 표본이다. 전투 중 오디오 컨텍스트는 한 개였고 로비 복귀 때 닫혔다. 800×360·844×390·915×412·1024×768·1280×720 및 세로 390×844에서 주요 카드 터치 영역과 화면 경계를 검사했다.

캡처와 원자료는 저장소 밖에 보관한다. [작은 가로 전장](D:/Development/captures/card-rpg-step04-10/battle-844.png) · [전체 전장](D:/Development/captures/card-rpg-step04-10/battle-1280.png) · [소장 카드 6장](D:/Development/captures/card-rpg-stage4/collectible-illustrations.png) · [의뢰 수첩](D:/Development/captures/card-rpg-step04-10/quest-records.png) · [성장](D:/Development/captures/card-rpg-step4-10/growth.png) · [개발 지갑 정산](D:/Development/captures/card-rpg-step04-10/settled-summon.png) · [측정 JSON](D:/Development/captures/card-rpg-step04-10/frame-sample.json)

### 저장소 통합 검사

`npm run check:fast -- --base=ca6fcc2ad2`에서 결제 관련 검사 78개, 변경 파일 린트와 타입 검사를 통과했다. 전체 Node 테스트에서는 기존 외국어 운세 문장 검사(`__tests__/fortune/sky-and-range.test.mjs`)가 실패했다. 3단계 검사 로그에서도 동일 테스트의 실패를 확인했다. 새 소환 로그인 링크에는 후행 슬래시 누락이 발견되어 수정했고, `node --test __tests__/ui/internal-link-trailing-slash.static.test.js` 재실행 4건이 모두 통과했다. 격리된 게스트가 로그인 사용자의 전투 티켓에 접근할 수 없음을 HTTP로 확인했다. `npm run check:pre-push`도 통과했다. [통합 검사 원문](D:/Development/captures/card-rpg-step04-10/check-fast-final.log)

## 현재 플레이 범위와 다음 확인

- 저장 편성 자유 전투는 성장·예장·의상·전후열 상태를 그대로 사용한다. 서버 영수증을 발행하는 본편은 임시 지원, 본편 이후 의뢰는 서버 대여 편성을 사용한다. 서버 소유권·성장 저장을 연동한 이후에 보상 의뢰에도 개인 편성을 개방하는 것이 다음 작업이다.
- 본편 제작 범위는 원작 EP.02 기반 제1장과 다음 장 도입까지다. 개인 이야기·게임 전투·축제는 각색으로 표시했다. 전투 보상은 개발 성장 조각이며 공통 계정 XP와 운영 월정석을 지급하지 않는다.
- 실제 iOS·Android 기기의 터치, 장시간 발열·메모리, 기기 간 책갈피, 신규 사용자의 체감 난도는 미검증이다. 출시 가격·배너·운영 원장·다중 프로세스 운영 정산은 별도 검증과 승인이 필요하다. 운영 배포 및 운영 계정 차감은 수행하지 않았다.

## 이전 단계 기록

## 3단계에서 바로 열어볼 화면

- [소환](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#summon)에서 ‘언덕 너머의 동료들’ 10회 미리보기를 열면 모카 카드를 선택할 수 있다. 결과의 ‘동료 상세 열기’로 동일한 소유 카드를 확인한다. 두 번째 캐릭터 배너 ‘빗소리가 그친 자리’에서 서한비·연이·고양이 영냥이를 얻는다. 예장은 독립 배너다.
- [동료](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#cast)의 소유 카드에서 ‘캐릭터 룸’을 누른다. 연이의 책갈피, 영냥이의 찻잔, 윤달의 붓, 서한비의 우산, 모카의 꼬치, 루나의 꽃 모양 빵으로 쓴 개인 이야기 여섯 편이 있다. 한 편은 네 문장이며 원작과 별개인 게임 각색이다. 원작 프롤로그와 책갈피는 기존 이야기 화면에 있다. 이후 회차의 원작 인연은 잠겨 있다.
- [편성](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#team)에서 전열 1칸을 선택한 뒤 모카 배치 → 세 번째 알람 장착 → 편성 저장 → 출전 준비 확인 순서로 진행한다. [예장 도감](http://127.0.0.1:3485/games/kkulkkul-card-rpg/#relic)에서도 소유 예장을 선택해 편성으로 이동한다. 장착 상태는 저장 편성마다 독립적이다.
- 새 원화는 개인 이야기 배경 `public/images/card-rpg/moon-study.webp`(1440×810)와 모카 전용 `moka-festival.webp`(800×900, 투명)이다. 달빛 예화의 분홍 한옥 서재를 게임용으로 새로 그렸으며 모카 의상은 원본 수달 레퍼런스를 바탕으로 제작했다. 예장 세 점은 각각 연꽃 브로치·자개 자명종·아침 창가를 그린 전용 원화다. 파일은 같은 폴더의 `relic-lotus.webp`, `relic-alarm.webp`, `relic-window.webp`이며 각각 480×720이다. 카드 앞면의 인물 문양·금박 테두리는 캐릭터별 원화와 함께 그린다. 소환 뒷면은 아래 0단계에서 확인한 서비스 이미지다.

### 컬렉션과 전투 인계 계약

- `app/games/kkulkkul-card-rpg/collection.ts`는 `loadCollection / applySummon / saveFormation / setCostume`를 내보낸다. 개발 환경 한정 IndexedDB `kkulkkul-card-rpg.dev-collection`의 `accounts`에 로그인 사용자 또는 게스트 범위로 저장한다. 최초 모카 1개·세 번째 알람 1개, 편성 2개로 시작한다. 동일 실행 ID의 결과·지급·중복 조각은 같은 트랜잭션에 커밋한다. 이전 v1 세션은 지급하지 않는다. 모의 비용·추첨 순서·보장 시작점은 실험마다 초기화되며 소유권과 조각만 누적된다.
- `formation.ts`의 원작 인물·전투 버전 정의와 소유 개체를 구분한다. 같은 인물의 다른 버전은 함께 쓸 수 있고 같은 소유 동료·예장의 이중 사용은 거절한다. 튜토리얼 전열 최소 1명, 일반 전열 3명. 임시 연이·영냥이는 튜토리얼 전용이다. 의상과 장착 예장은 동료를 따라간다. 빈 초안 저장과 실제 출전 검증은 별도다.
- `buildBattleSnapshot`은 전열부터 순서대로 여섯 칸(빈칸 포함), 개체와 버전 ID, 의상, 레벨, HP·공격·예장 효과와 5장 일반 덱을 돌려준다. 일반 전열의 카드 합계는 15장이다. 스킬·지속 효과와 제시 수치는 게임 개발 시안이다. 공격 판정·피격·승리 연출과 운영 소환 정산은 이후 단계 범위다.
- `CharacterCard.tsx`, `CollectionViews.tsx`, `PartyEditor.tsx`, `character-room.tsx`가 도감·장착·편성·개인 이야기를 담당한다. `Dialogue.tsx`의 원작 화자 초상과 입모양을 공유한다. `Lobby.tsx`와 `SummonPreview.tsx`가 메뉴 이동 및 소유 ID를 전달한다. 개발 컬렉션을 여는 과정에는 결제 요청이나 운영 데이터 쓰기가 없다.
- 검증 재현 명령은 `npm run typecheck`, `node scripts/verify-card-rpg-preview.cjs`, `node scripts/verify-card-rpg-collection.cjs`다. 테스트용 브라우저 실행 경로는 `CHROMIUM_PATH`, 캡처 출력은 `RPG_CAPTURE_DIR`로 지정한다. 이번 캡처 폴더는 `D:/Development/captures/card-rpg-stage3/`다.

### 실행 결과와 남은 검증

- 격리 Chromium에서 캐릭터·예장 소환 → 획득 상세 → 장착·편성 저장을 실행했다. 브라우저 프로세스를 종료하고 같은 테스트 프로필로 재실행한 뒤 모카 전열 1번, 축제 앞치마, 세 번째 알람이 복원됐다. 예장 배너에서 연꽃의 문장을 획득하고 바꿔 장착한 뒤 새로고침 복원도 확인했다.
- 800×360, 844×390, 915×412, 1024×768, 1280×720, 390×844에서 동료·예장·편성 화면의 주요 조작 위치와 가로 넘침을 검사했다. 앱 안의 로비 대화·프롤로그 마지막 문장 책갈피 복원·소환 회귀 및 타입 검사가 통과했다. 로컬 검증 중 API 쓰기 요청은 0건이었다.
- 고정 데이터로 동시 실행·재요청의 단일 지급, 계정 분리, 다른 버전 동시 편성, 중복 동료·예장 거절, 전후열 이동, 임시 지원, 저장 충돌 뒤 재시도, 의상 교체 시 능력치 동일, 전열 카드 15장을 확인했다. 테스트 계정 인증 응답을 바꾸면 별도의 초기 편성이 열렸다. 저장 공간 부족 오류를 주입한 뒤 같은 초안을 다시 저장하는 경로도 통과했다. 캐릭터 배너 두 개로 여섯 명을 확보한 뒤 각 개인 이야기의 마지막 문장과 다시 읽기까지 확인했다.
- 원화와 실제 화면은 `D:/Development/captures/card-rpg-stage3/moka-room.png`, `companion-cards.png`, `relic-gallery.png`, `formation.png`에 있다. 기기 간 동기화, 실제 모바일 Safari·Chrome, 전투 실행·밸런스·운영 소환은 미검증이다. 전체 저장소 검사와 이 단계의 브라우저 검사는 별도로 기록한다. 전체 검사 로그는 같은 폴더의 `check-fast.log`다.

## 이전 단계 조사 기록

## 첫 행동과 조사 범위

Code Destiny의 독립 카드 RPG 정본이다. 조사 기준은 main의 0cb2f18c09ad8945c1082736d41d4164e820a2e8. 실제 서비스는 D:/Development/code-destiny, 아틀리에 별도 프로젝트는 D:/Development/yeoni-atelier다. 전자는 Next.js App Router와 Worker를 사용한다. 서비스 홈은 `app/page.js`, 기존 미니게임 입구는 `app/mini-games/page.tsx`, 서버 라우터는 `worker/index.js`다. 저장소의 AGENTS.md·CLAUDE.md와 사용자 공통 지침을 적용했다. 조사 당시 main에는 trait-profile·life-book 관련 다른 작업과 미추적 스킬이 있었다. 작업용 체크아웃을 분리했다.

2026-11-22 승인 범위는 “지금 붙여넣은 공통 지침과 0단계만 실행”, “1단계로 자동 진행하지 마세요”, “운영 배포와 운영 계정의 월정석 소비도 진행하지 마세요.” 첨부 제작 안내서 5쪽은 단계 순서, 11~12쪽은 조사 범위, 13·16~17쪽은 뒤 단계 설계를 대조하는 자료다. FGO 및 슬롯 추가 요청은 아래 UX 설계에 반영했다. 모든 게임 경로·규칙·각색은 제안 상태다.

## 원작과 공개 시점

편집 원본은 `content/novel/episodes.source.json`이다. `scripts/build-novel-runtime.mjs`는 VN 런타임 생성에, `scripts/build-story-text.mjs`는 `lib/stories/vn/episodes.generated.json` 생성에 쓰인다. `lib/stories/vn/index.ts`의 STORY_SPEAKERS와 `public/codedestiny-novel.html`의 NAME·캐릭터 렌더러를 대조했다. 상담용 `components/fortune/master-profiles.ts` 및 `src/features/expert-characters/`는 서비스별 표현 근거다. 게임 각색 장면은 원본 비트 ID·회차·분기 및 게임 장면 ID를 별도로 보관한다. 이하 표에는 개발자용 스포일러가 있다.

|인물·내부 ID|외형·말투·관계·소품·근거 있는 능력|첫 공개 및 동행 경계|
|---|---|---|
|연이 yeon|일상의 불운을 농담으로 받는 주인공. 꽃돼지 모습은 연분홍 몸·연꽃·보라색 스카프. 메모하는 버릇과 동료를 먼저 초대하는 태도.|prologue:1 방에서 시작, prologue:6 첫 대사. EP.01 변신. 처음부터 이야기의 시점 인물. 후반 능력과 분기 결말은 도감 소개에서 숨긴다.|
|영냥이·네오 neo|모자를 쓴 고양이 조력자. 짧고 단호하게 상황을 설명한다. 고양이 형태와 인간 형태의 캐릭터 정체성은 하나다. 전투 스킬의 계수는 원작에 없음.|ep-01:31 강의 장면부터 발화, EP.02 고양이 영냥이. EP.26~27 복원 이전에는 인간형 원화·썸네일을 잠근다. EP.38A 독자 공개와 EP.42 연이 앞 고백도 분리한다.|
|모카 moka|갈색 수달·래퍼·요리사. 반말과 박자감, 냄비·꼬치·국자. ep-07:114 포장마차, ep-07:127 랩. ep-17:72 국자로 책장을 두드린다.|EP.07 첫 만남, ep-12:116 연이의 초대, ep-13:84 동행 중. 첫 등장 시 가입 처리하지 않는다.|
|윤달 yun|명식을 읽는 사람 점술가. 능청스러운 존댓말, 장갑·붓·명식. ep-13:50 상담, ep-13:68 여덟 칸을 그린다.|EP.13 등장, ep-16:90~91 동행 제안과 응답. 장갑과 이름의 사연은 EP.36에서 해금.|
|서한비 pje / 상담 키 hanbi|서한비·찬비. 검은 호랑이 시절의 장부와 코트, 현실의 검은 우산, 조심스러운 존댓말. ep-28d:38~41 운을 거둔 일과 지키고 싶은 마음을 직접 말한다. ep-40:4 손에서 솟는 비.|EP.01A의 이름 없는 호랑이와 EP.28의 실명 화자(ep-28:74)를 구분한다. EP.39 고리·책임 고백, ep-40:72 조건부 동행과 ep-40:104 네 사람의 발자국. 동행 후에도 책임과 회복 과정을 이어간다. 상담 스프라이트는 개심 이후 전용.|
|루나 ln|하얀 아기 토끼, 빵 바구니·배달. 다급하게 항의하고 도와준 연이에게 자기 이름을 밝힌다. ep-13:31~43. 언덕 빵집의 동생.|EP.13 등장, ep-27b:53에서도 윤달과 대화. 영구 합류와 전투 능력은 확인되지 않았다. 연습용 스킬을 만들 때 각색으로 표기한다.|
|루나 언니 lns / 루나블룸 luna|lns는 빵을 굽는 언니(ep-13:86). luna는 화자표의 루나블룸. 원본 비트 전체에서 독립 키 luna와 문자열 루나블룸 등장 0건. 뷰어의 아틀리에 시트명 luna는 ATELIER_CAST에서 ln에 매핑된다.|초기 카탈로그의 루나는 ln. 파일명 luna로 다른 인물의 소유권·대사·능력을 연결하지 않는다. 루나블룸의 등장·종족·합류는 미확인.|

윤달·서한비·모카·루나는 초기 카탈로그 대상이다. 연이·영냥이는 중심 인물이다. 최초 지급 명단과 보유 수량은 미확정이다. 카탈로그, 계정 소유, 대본상 합류, 연습 편성은 독립 상태다.

|게임 장면 ID 제안|원작 근거|각색 방향|
|---|---|---|
|prologue.room|prologue:1, prologue:3|방의 고장 난 알람으로 첫 입력을 유도한다.|
|festival.stall|ep-07:114, ep-07:120|냄비와 꼬치에 시선을 먼저 둔 뒤 모카의 대사를 연다.|
|island.delivery|ep-13:31, ep-13:43, ep-13:50|루나의 배달 소동 뒤에 윤달의 천막을 보여준다.|
|rain.trial|ep-40:4, ep-40:72, ep-40:104|전투 협력과 조건부 동행을 연속 장면으로 묶는다. 초기 미리보기에서 숨긴다.|

## 1단계용 에셋 목록

public 아래 서비스 URL 기준. 기존 파일을 참조하고 게임용으로 복사하지 않는다.

|용도|URL·실측 픽셀|근거와 사용 조건|
|---|---|---|
|공통 카드 뒷면|/images/fortune-tea-house/yeoni-tarot-card-back-photoroom.webp · 1024×1536, 2:3|TarotRevealScene.tsx → TarotCardBack.tsx → fortuneTeaHouseAssets.yeoni.transparent.tarotCard. 셔플 덱 원본을 열어 보라색 바탕·금색 테두리·중앙 연꽃 확인. SHA-256 48dfb0464bda5ed25c26112b142730c010a503f7fddd184d60e1963b08bf22c4. 제안 cardBackAssetId = yeoni-tarot-card-back.|
|초반 방|/images/novel/mobile/room.webp · 1280×854|prologue:1의 bg=room → content/novel/mobile-assets.json의 room. 가로 배경, 인물과 별도 레이어.|
|영냥이 고양이|/images/novel/yeongnyangi/neutral.webp · 360×480|VN spriteMaster의 neo 고양이 분기. 인간형과 별도.|
|연이·윤달|/images/expert-characters/yeoni/hero.webp · 1536×864, /images/expert-characters/yun/hero.webp · 1536×1024|서비스 프로필 일러스트. 로비 또는 상세 표지 후보.|
|모카·루나|/images/novel/remaster/v2/moka/cook.webp · 1182×1330, /assets/novel/atelier/luna.webp · 1280×384|모카 요리 컷. 루나는 원작 뷰어가 쓰는 가로 4프레임 시트로 한 셀만 표시한다. 소설 에셋 재사용과 아틀리에 진행도는 별개다.|
|서한비|/images/expert-characters/hanbi/composed.webp · 400×600|상담용 개심 이후. /images/novel/hanbi/는 뷰어상 tiger에 매핑된다. 시점과 역할 확인 후 사용.|

카드 경로는 `src/features/fortune-tea-house/components/TarotRevealScene.tsx`, 같은 폴더의 TarotCardBack, `src/features/fortune-tea-house/data/assets.ts`에서 확인했다. 별도 `app/components/TarotCardBack.tsx`는 CSS 도형을 그리며, moonlight-tarot-card-back.webp도 별개 후보였다. 배경·초상은 파일 규격을 확인했다. 전투용 공격·피격·쓰러짐·승리 시퀀스 묶음은 확인되지 않았다.

## 저장과 월정석

- 인증은 Worker의 requireAuth로 확정한 계정 ID를 사용한다. 기존 /api/rpg/progress·award는 계정 성장, /collectibles·collect는 공통 수집, /characters·unlock·equip 계열은 프로필 정령용이다. 실제 라우트와 처리기는 `worker/routes/rpg.js`에서 확인한다. 기존 캐릭터 상세·표정 사용처는 `app/components/expert-consulting/ExpertCharacterStage.tsx`, `app/components/CraftedProductDetail.tsx`다.
- 신규 저장 네임스페이스 제안은 kkulkkul-card-rpg. 계정별 장면 체크포인트·분기·해금, 소유 전투 버전·버전별 XP, 순수 의상, 예장·편성, 소환 결과를 소유한다. baseCharacterId는 인물, battleVersionId는 성능, 전투 개체 ID는 같은 턴의 행동자를 구별한다. 공통 계정 레벨은 조건 충족 시 월정석 보상과 연결된다. 반복 전투 XP는 게임 캐릭터 성장에만 쓴다.
- 조회 어댑터는 `app/_lib/billing-client.ts`의 fetchBillingBalance와 `app/checkout/MoonstoneDiscountBalance.tsx`의 로그인·degraded·정수 검사 패턴을 따른다. /checkout/은 기존 결제 호스트. 로딩·비로그인·실패·정상 0을 분리한다.
- 정본은 지급 lot의 미만료 remaining 합계. membershipCreditBalance는 파생 캐시다. 정수 단위, 기본 지급일 + 30일 개별 만료, 오래된 지급분 우선. lot 모델에는 무료/유료 칸이 없다. 지급 출처는 별도 원장 type·sourceId·serviceKey·metadata에서 확인한다. 구매·보상 전체가 유무료 두 종류로 분류된다는 근거는 미확인이다. 근거는 `worker/lib/monthly-credit-lots.js`, `worker/lib/monthly-credit-store.js`.
- 지급 예시는 `worker/lib/review-reward.js`, `worker/routes/admin-monthly-credits.js`의 grantMonthlyCreditLotDetailed. 차감은 `worker/payments/moonstone.js`의 원장 예약 → lot 차감 → 정산 순서와 요청 중복 처리·미정산 복구를 참고한다. 원장은 MonthlyCreditLedger. 관리·상담 전용 API를 게임 보상에 호출하지 않는다.
- 소환 어댑터 제안은 서버가 배너 설정·계정·요청 ID를 확인하고 기존 원장 증빙과 게임 획득 결과를 연결하는 방식이다. 같은 요청의 재시도는 같은 결과를 반환한다. 비용·확률·천장·중복 전환·버전별 지급 규칙은 미승인이다. 설정 미확정 시 실제 차감은 닫고 미리보기는 격리된 데이터로 제공한다. 별도 월정석 지갑·잔액 복사·운영 테스트는 없다.

## 가로형 화면 이동과 FGO 참조

작업명은 ‘꿀꿀운세 - 운명의 연대기’. 제안 진입점 /games/kkulkkul-card-rpg. 동일 게임 셸 안에서 화면을 이동하며 뒤로 가기는 직전 화면·편성·장면을 복원한다.

|흐름|플레이어가 보는 것과 하는 일|
|---|---|
|서비스 → 로비 → 이야기 이어하기|왼쪽에 대표 캐릭터와 방 배경, 오른쪽에 현재 장면과 이어하기, 이벤트 한 곳. 상단에 서비스 복귀·계정·월정석 조회·설정·우편 상태, 하단에 편성·동료·예장·강화·소환. 처음에는 프롤로그로 진입한다.|
|이야기 → 출전 준비 → 편성 → 전투|원작 대화를 닫으면 적의 수와 웨이브를 본다. 전열·후열과 예장을 같은 화면에서 확인하고 출전한다. 동료 초상 선택은 상세로, 예장 슬롯 선택은 장착 목록으로 연결한다.|
|전투 → 결과 → 다음 장면 또는 로비|적 상태·다음 위협은 상단, 양 진영과 피격은 중앙, 아군 체력·스킬은 하단. 카드 선택 시 같은 전장에서 손패를 크게 펼친다. 순서 배지·체인 예고·취소·확정을 제공한다. 결과에서 캐릭터 XP와 다음 장면을 구분한다.|
|로비 → 소환·설정·서고|소환은 배너→상세→확인→공개→획득 상세. 설정은 음량·텍스트·간소 모션을 유지한다. 서고는 해금된 장면만 연다. 잠긴 기능에는 필요한 진행 조건, 개발 중 기능에는 준비 상태를 표시한다.|

FGO 공식 전투 안내에서 전술 준비 → 스킬·목표 선택 → 인물 초상이 있는 커맨드 카드를 순서대로 선택 → 양측 행동의 리듬을 확인했다. 공식 편성 가이드에서는 전열·후열과 인물별 예장을 한 화면에 제시한다. 본작에서는 연꽃 문양 뒷면, 모카의 냄비 박자, 윤달의 붓, 서한비의 우산 등 자기 IP의 동작·음향·화면으로 이 흐름을 전달한다. [공식 전투 안내](https://fate-go.us/howto/system.html) · [공식 편성·화면 가이드](https://fate-go.us/howtoplay/images/How_to_Play_Fate_Grand_Order_Official_USA_Website.pdf)

1단계 화면 검수는 800×360, 844×390, 915×412, 1024×768, 1280×720에서 진행한다. 가로 작은 화면에서 주요 터치 영역 44 CSS px, 얼굴·소품·이어하기 버튼 겹침, 안전 영역, 세로 전환 안내, 키보드 복귀와 모션 감소를 확인한다.

## 전투와 슬롯머신 제안

전열 3명 × 일반 카드 5장. 15장을 섞어 매 턴 5장을 펼치고 선택 순서대로 최대 3행동. 선택하지 않은 카드까지 제시했던 5장을 버려 3턴에 한 순환을 끝낸다. 행동 가능 카드가 부족하면 가능한 수만 확정한다. Quick은 다음 턴 치명타 자원, Arts는 운명 게이지, Buster는 직접 피해에 집중한다. 색·이름·아이콘을 함께 쓴다. 전열이 쓰러지면 후열 순서로 충원하고 다음 플레이어 턴 시작에 생존 전열 기준 덱을 다시 만든다. 운명해방은 15장 밖에 표시하며 이미 찬 게이지로 3행동 한 칸을 쓴다. HP·게이지·덱 주기는 웨이브 사이에 유지하고 사라진 표적의 미실행 예약 행동은 취소한다. 배속·프레임·화면 크기는 판정에 관여하지 않는다.

**슬롯 후보 ‘모카의 박자 릴’**은 축제 이야기 이후 연습 전투에서 먼저 검토한다. 세 칸은 독립 추첨 대신 방금 선택한 세 카드의 순서를 보여준다. 퀵=꼬치, 아츠=냄비, 버스터=국자라는 게임용 도안을 쓰고 유형 글자를 병기한다. 예를 들어 아츠 세 장을 선택하면 확정 전부터 냄비 세 칸과 아츠 체인을 보여준다. 확정 뒤 모카가 뚜껑을 세 번 두드리며 릴이 그 순서로 멈춘다. 혼합 조합은 선택한 대로, 행동이 두 개면 남는 칸은 빈칸으로 표시한다. 모카가 등장하기 전에는 기본 순서 배지를 쓴다.

릴은 이미 결정된 체인을 읽어 주는 연출이다. 별도 피해·보상 추첨, 재회전, 베팅, 월정석 연결은 설계에 없다. 간소 모션·건너뛰기는 동일한 정지 결과를 즉시 표시한다. 채택 기준은 일반/간소 모션과 재접속에서 전투 로그가 같고, 플레이어가 다음 행동 순서를 읽을 수 있는지다. 확인 전에는 기본 전투에 상시 적용하지 않는다.

## 단계별 완료 기준과 검증 기록

|단계|사용자가 직접 확인할 완료 조건|
|---|---|
|0 자료|원작 비트·캐릭터 구분·카드 원본·지갑 및 저장 경계·공개 기준을 이 문서로 전달한다.|
|1 로비|가로 로비에서 이어하기·동료·소환·설정으로 이동하고 돌아오며 지정 화면 크기에서 확인한다.|
|2 소환 미리보기|격리 배너에서 카드 공개·결과 상세까지 확인한다. 실제 차감·소유 지급은 분리한다.|
|3 편성|캐릭터·예장 상세, 장착, 의상, 전후열 변경 후 재접속해 편성을 복구한다.|
|4 전투|고정 시드·입력으로 승패 재현, 행동 부족·교대·웨이브와 결과→홈 복귀를 검사한다.|
|5 스킬·모션|캐릭터·무기별 공격·피격·쓰러짐·승리 연출과 간소 모션의 동일 판정을 확인한다.|
|6 첫 챕터|원작 순서대로 대화·선택·전투·저장·첫 콘텐츠 해금을 플레이한다.|
|7 지갑|격리 계정으로 잔액 부족·동시 요청·재시도·정산 중단에서 차감·소유·천장·기록을 대조한다.|
|8 강화|캐릭터·예장 성장과 의상·독립 전투 버전의 저장 및 효과를 구별해 확인한다.|
|9 본편 이후|클리어 기록으로 성장 전투·강화·교류·이벤트가 열리고 실제 보상까지 이어진다.|
|10 통합|복귀·모바일 조작·경제 정합성·고정 시드 테스트와 실제 플레이 밸런스 결과를 함께 남긴다.|

문서 대조 검사에서 장면 ID 22개, 이미지 경로 8개와 카드 원본 해시가 일치했다. git diff --cached --check 및 npm run check:fast의 공백·문서 최신성 검사 통과. 0단계 직접 검사: git status 및 rev-parse, rg로 렌더러·뷰어·서버 호출 검색, Node로 소설 화자와 비트 조회, Sharp로 WebP 규격·카드 픽셀 확인, Get-FileHash로 원본 SHA-256 확인. 원문·생성물·서비스 코드 변경 없음. 게임 플레이 주소·신규 화면 캡처·소환 정산·밸런스·빌드 검증은 이번 단계 산출물이 아니다. 남은 자료는 최초 지급 목록, 운영 배너 설정, 전투 모션 원화·시퀀스, 루나블룸의 별도 정사 자료, 루나의 플레이어블 전투 각색이다.

- [x] 원작·에셋·경제 조사 및 1단계 화면 명세
- [x] FGO 공식 참조와 슬롯 적용 후보 검토
- [x] 1단계 로비 및 공통 게임 셸 구현

## 1단계 전달 · 가로형 로비

2026-11-22 사용자 요청 “가로형 메인 화면부터 완성하라”. 로컬 작업 기준 5ee87178be, 작업 브랜치 wt/card-rpg-lobby-20261122-093405. 현재 단계는 로비·내비게이션이며 위의 전투·경제 규칙은 후속 설계다.

- 실제 진입점은 /games/kkulkkul-card-rpg/. URL 해시 #cast, #story, #summon, #settings 등으로 개별 화면을 열 수 있다. 로비에서 뒤로는 서비스 홈, 내부 화면에서 뒤로는 직전 화면, 직접 진입 후 뒤로는 로비로 이동한다.
- 사람 모습 연이와 고양이 영냥이 중 대표 캐릭터를 선택하고 대사를 바꿀 수 있다. 대사는 게임용 각색이다. 프롤로그의 첫 세 비트는 서버 컴포넌트가 소설 정본에서 추출한다. 이 기기에서 읽던 비트 ID는 계정별 또는 게스트별 키에 저장한다. 서버 진행도·최초 캐릭터 지급은 아직 없다.
- 기기 설정은 이동음·큰 대사·간소 모션. 캐릭터, 잔액·계정 레벨, 우편·이벤트·하단 여섯 목적지와 서고·기록·도움말 진입을 제공한다. 소환은 원본 카드 뒷면과 준비 상태를 안내한다. 배너와 카드 공개는 2단계 대상이다.
- 코드 위치는 app/games/kkulkkul-card-rpg/ 아래 page.tsx(원문 추출), Lobby.tsx(게임 셸), catalog.ts(이름·화면·캐릭터), usePlayer.ts(읽기 전용 계정 정보), lobby.module.css(반응형). app/components/AppChrome.tsx에는 이 경로만 독립 셸로 등록했다.
- 잔액은 authFetch로 기존 /api/billing/balance?moonlightStone=1&compact=1을 읽는다. 기존 범용 클라이언트는 누락 금액을 0으로 정규화하므로 여기서는 원본 응답의 계정·정수·degraded 상태를 검사한다. 계정 레벨은 /api/rpg/progress. 원장·지급·인증·DB 변경 없음.
- 브라우저 검증은 로컬 mock 서버와 격리 Chromium으로 수행했다. 가로 다섯 규격 800×360, 844×390, 915×412, 1024×768, 1280×720과 세로 390×844의 버튼 크기·경계 및 첫 화면 캡처, 캐릭터 교체, 뒤로가기, 직접 링크, 프롤로그 문장 이동·복귀, 설정 새로고침을 확인했다. 작은 가로에서 초상의 실제 이미지 높이가 컨테이너보다 커지는 문제를 교정해 다시 캡처했다.
- 미리보기 http://127.0.0.1:3485/games/kkulkkul-card-rpg/ (로컬 개발 서버). 캡처 D:/Development/captures/card-rpg-stage1/. 재기동은 이 저장소에서 PowerShell 환경 변수 MOCK_DEV_PORT를 3485로 설정한 뒤 npm run dev. 실제 기기 브라우저 바, 운영 인증, 소환 정산, 전투·슬롯, 프로덕션 배포는 미검증이다.
최종 검증 기록: npm run typecheck, git diff --cached --check, npm run smoke:core(Jest 116건 및 Node 47건) 통과. 격리 로그인 응답의 계정 레벨 7·월정석 0 표시와 degraded 조회 실패 구분을 브라우저에서 확인했다. npm run check:fast는 공백·문서·lint·사이트맵·타입 검사 후 전체 Node 검사에서 프로세스 생성 메모리 부족(spawn ENOMEM)으로 종료했다. ziwei-yearly-flow-dedupe.test.mjs는 단독 재실행 통과. 전체 검사 통과 판정은 보류한다. 게임 구현 커밋 ee3ea46722. 미리보기 유지용 작업 체크아웃에서 로컬 서버 실행 중.

## 2단계 전달 · 달빛 예화 로비와 소환 미리보기

2026-11-22 승인 범위는 분홍빛 UI, 캐릭터 대화, 2단계 개발용 소환이다. 로컬 게임 경로는 /games/kkulkkul-card-rpg/, 소환 직접 링크는 #summon이다.

- 로비와 공통 셸을 분홍빛 상아색·장밋빛으로 바꾸고 기존 예화 가지 문양과 소설의 방 배경을 사용했다. 연이·영냥이·윤달·서한비·모카·루나의 로비 대사는 게임용 각색이다. 대표 지정은 초상·대사 선택이며 소유권이나 본편 합류를 지급하지 않는다.
- Dialogue.tsx는 원작 4셀 시트의 입모양을 글자 표시 진행률에 맞춰 전환한다. 전체 문장 표시·완료·간소 모션에서 정지한다. 루나는 원본의 mouth:false를 존중해 정상 첫 셀 위에 게임 전용 입모양 두 단계를 합성했다. 네오는 고양이 모습만 사용한다. 프롤로그는 prologue:1~6 원문과 화자 ID를 읽고 연이 대사에서만 초상을 표시한다.
- SummonPreview.tsx는 개발 빌드에서만 작동한다. 1회/10회 확인, 응답 대기·실패·재시도, 카드 공개와 전체 스킵, 결과·상세와 편성/장착 안내 간 이동을 제공한다. 원본 뒷면은 찻집 에셋 매핑을 공유한다. 같은 탭의 sessionStorage에 미리보기 상태를 저장해 다른 화면에서 돌아오거나 새로고침해도 이어진다.
- summon-preview.ts의 숫자는 운영 정책과 독립된 실험 설정이다. 시작 잔액 600, 부족 시나리오 8, 캐릭터 1회 40·예장 1회 20, 10회는 10배다. 개별 확률 15/45/40%, 픽업까지 10장 보장, 시작 보장 진행 2장, 중복 시 가상 조각 3/2개. 매 실험은 같은 시드와 보유 목록으로 시작한다. 실계정 잔액은 별도 읽기 전용 표시이며 이 화면은 과금·지급·공통 XP·계정 인벤토리를 쓰지 않는다.
- 검증 명령은 npm run typecheck 및 node scripts/verify-card-rpg-preview.cjs. 로컬 mock 서버 포트 3485에서 격리 Chromium을 실행한다. 설치된 Playwright 브라우저 또는 CHROMIUM_PATH를 사용하고 캡처 경로는 RPG_CAPTURE_DIR로 지정한다. 화면 검사는 가로 다섯 규격·세로 한 규격, 여섯 화자, 문장 즉시 표시, 1회·10회, NEW/중복, 예장, 잔액 부족, 연타, 지연 중 새로고침, 실패 후 재시도, 이미지 실패, 연출 중 이탈·복귀, 배속·스킵·간소 모션을 포함한다.
- 단말 실측, 운영 빌드 배포, 실제 거래·보상·소유권 검증은 수행하지 않았다. 예장·편성은 안내 화면이며 다음 단계 대상이다. 실제 원장 연결은 7단계 승인 이후에 진행한다.

실행 결과: 여섯 인물의 발화·즉시 표시·정지, 모든 소환 시나리오, 일반/간소 모션의 동일 10장 결과, 여섯 화면 크기 검사 통과. 브라우저에서 관측한 API POST는 0건. 독립 production 조건 컴포넌트 렌더에서 준비 안내만 출력됨을 확인했다. 타입 검사와 변경 공백 검사 통과. 캡처는 D:/Development/captures/card-rpg-stage2/, 저장소 전체 check:fast 로그는 같은 폴더의 repository-check.log다.

## 소설 진입 화면 · 2026-11-22

게임의 이야기 이어하기(#story)를 원작 세로 표지와 프롤로그 본문이 마주 보는 화면으로 개편했다. public/images/novel/yeoni-youngyangi-hero-v1.webp(1024×1536)를 표지에, 기존 roomNight.webp를 방 배경에 쓴다. 작은 가로 화면에서도 표지 제목·책갈피·페이지 이동이 보이고, 세로에서는 표지 아래에 본문을 배치한다. 장면·화자와 저장 키는 기존 값을 사용한다.

로컬 mock에서 여섯 뷰포트의 표지 전체 표시·버튼 영역, 로비에서 진입, 여섯 비트 이동, 연이 발화, 마지막 문장 새로고침 복원, 원작 뷰어 링크를 확인했다. npm run typecheck 통과. 캡처는 D:/Development/captures/card-rpg-story/. 지난 2단계의 저장소 전체 검사는 비한국어 띠·별자리 서술의 주인공 이름 테스트에서 실패했다. 이번 검증은 변경 화면 대상이다.
