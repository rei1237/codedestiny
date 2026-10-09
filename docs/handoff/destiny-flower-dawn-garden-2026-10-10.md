---
status: active
updated: 2026-10-10
next: 1번(점성술 연동 버그 A·B·C)부터 고치고 destiny-flower 테스트 통과 확인
---

# 운명의 꽃 — 점성술 연동 수정 · 새벽 정원 라이트 테마 · 성향 기반 "그래서 이 꽃"

## 왜

사용자: "점성술 꽃이 제대로 연동이 안 되고, 너무 어두우니 밝게. UI 에셋을 직접 그리고, 타고난 사주·자미두수 성향을 근거로 '그래서 이 꽃'이라는 내용으로 업데이트."
결정: 톤 = 새벽 정원 파스텔 / 에셋 = 코드 SVG / 근거 = 매칭 가중치 + 설명 문장 둘 다(설명에는 실제 점수에 반영된 신호만).

## 지금 상태

- 코드 변경 없음. 원인 진단만 끝났다(아래 1번 A·B·C).

## 남은 작업

### 1. 연동 버그 — `js/core/index-inline-runtime.js`
- [ ] **A**: `_dfApplyLiveDomainBridge`(4525~)가 `sourceHint`로 지정된 도메인만 브리지한다. 그래서 4개 리졸버(`_dfResolveSelection`/`_afResolveSelection`/`_jfResolveSelection`/`_sfResolveSelection`)가 서로 다른 payload를 보내고, `_dfServerMatchFingerprint`가 매번 바뀌어 `_dfRequestServerMatch`(4769~) 캐시가 덮어써진다. 마지막 payload에는 astrology가 없어서 서버가 빈 별자리를 돌려주고, 카드는 4937 `if (!hasChartSignals) return null;`에서 재요청 없이 멈춘다.
  → `_dfGetServerMatchPayload()`를 새로 만든다(`_dfGetProfilePayload({})` 결과를 프로필 시그니처로 메모). 4개 리졸버의 서버 요청은 모두 이 payload를 쓴다. `_dfIsSourceLinked`의 `_dfGetProfilePayload({ sourceHint: normalized })`는 테스트가 고정하고 있으니 그대로 둔다.
  → `_afResolveSelection`: 캐시에는 별자리가 없는데 로컬 payload에는 있으면 캐시를 비우고 **1회만** 다시 요청한다(무한루프 가드).
- [ ] **B**: 4324의 `window.calcAstroApiChartOrThrow`는 존재하지 않는 함수다. `window.calcAstroSwissChartOrThrow`(`js/saju-engine.js:12455`)로 바꾼다. 실패하면 `js/saju-engine.js:33266-33275`처럼 `ASTRO_STRICT_PRECISION`을 try/finally로 잠시 false로 두고 `AstroEngine.calcAll`을 부른다. lat/lon/tz가 유한한 숫자가 아니면 37.5665/126.978/9를 쓴다.
- [ ] **C**: `_dfGetDataMissingUiState`(6678~)는 `skipLiveBridge:true` payload로 판정해서 점성술이 항상 "데이터 없음"으로 나온다. 점성술은 브리지된 payload로 판정하고, "계산 중"과 "출생 정보 필요" 문구를 나눈다.

### 2. 성향 기반 매칭 — `worker/lib/destiny-flower-engine.js`
- [ ] `parseDestinyProfile`(2045~): `domains.saju.strength`('strong'|'weak'|'')와 `johu`('cold'|'hot'|'')를 추가한다. 입력 키는 `saju.is_strong`/`analysis.isStrong`/`power_label`, `saju.johu_type`/`analysis.johuType`이다(생산자는 `js/saju-engine.js:2879-2927`). 매핑은 runtime `_dfJohuLabel`(6117)과 같게: cold/cool → 한습, hot/warm → 온조.
- [ ] `scoreFlower`(3786~)에 신호 4개를 추가한다. 기존 앵커 규칙과 가중치는 건드리지 않는다.
  - 신강: 일간이 생하거나 극하는 오행(식상·재성)의 꽃 +8 `strength_release`
  - 신약: 일간을 생하거나 같은 오행(인성·비겁)의 꽃 +8 `strength_support`
  - 조후 cold: Fire 원소 또는 Summer 계절 꽃 +8 `johu_warm`
  - 조후 hot: Water 원소 또는 water_levels에 high가 있는 꽃 +8 `johu_cool`
- [ ] `buildRationale`(3904~): `matchedSignals`에 실제로 든 신호만 문장으로 만든다. 순서는 일간 기질 → 신강/신약 → 용신 → 조후 → "그래서 지금 당신에게 건네는 꽃은 X입니다" → 상징. 결과에 `rationale_points: [{key,label,text}]`(최대 4개)를 추가한다.
- [ ] `matchJamidusuFlower`(1361~): 꽃은 명궁 주성으로 정한다(명궁에 주성이 없으면 대궁인 천이궁 주성을 빌려 온다). `chooseJamidusuStrongStar(zw)` 호출은 남겨 "오늘의 강한 별" 보조 정보·배지로 쓴다. narrative는 "명궁 ○○성 → 성격(`JAMIDUSU_STAR_RULES` personality) → 그래서 이 꽃" 흐름으로 바꾼다.
- [ ] 점성술·숙요는 매칭을 바꾸지 않고, 기존 narrative로 `rationale_points`만 채운다.
- [ ] 새 문구는 `destiny-flower-engine.js`의 `destinyFlowerText(key, vars, 한국어 폴백)`로 만들고 `DESTINY_FLOWER_KO_TEXT`에 등록한다. `worker/routes/destiny-flower.js` 응답에 `rationale_points`가 실리는지 확인한다.

### 3. 새벽 정원 테마
- [ ] 색 토큰
  - 배경 `#FBF6EE→#F3E9F7`
  - 카드 `rgba(255,255,255,.78)` + 금테 `#E8C98A`
  - 제목 `#3B2A4A`, 본문 `#6B5A78`(AA 4.5:1 확인)
  - 강조색: 사주 `#F4B8A0`, 점성술 `#A9C8F0`, 자미두수 `#F2B5C8`, 숙요 `#C9B8EC`
- [ ] 수정할 곳
  - `styles/destiny-flower-cosmic.css`: 621-745 "Moonlit" 최종 오버라이드 블록을 바꾸고, 앞쪽 8-80도 정리한다.
  - `index.html` 751-770: 인라인 `!important` 사본
  - `styles/fortune-ui-home.css` 1761-1775: 퀵 카드
  - "운명의 꽃 연동하기" CTA, 빈 상태 패널, "홈화면으로 바로가기" 버튼
- [ ] `public/ggulggul/index.html`은 직접 고치지 않는다. `sync:public`으로 맞춘다.

### 4. SVG 에셋 — `js/services/destiny-flower-art.js`
- [ ] `buildFlowerSvg`(615~): skyTop/skyMid를 꽃색을 12% 섞은 파스텔과 아침 햇무리로 바꾼다. 밝은 배경에서도 형태가 보이도록 꽃잎에 deep 테두리, 안쪽 그라데이션, 잎맥 1~2줄을 넣고 수술 디테일과 바닥 그림자 타원을 추가한다. 반복 요소는 `<use>`로 묶는다.
- [ ] `sourceScenery`(574~) 낮 버전
  - 사주: 산 능선과 해무리
  - 점성술: 금색 황도 원과 별자리 선
  - 자미두수: 12궁 점선 원반과 북두칠성
  - 숙요: 은빛 반달과 28수 눈금
- [ ] 새 SVG 두 가지
  - 체계 칩 아이콘 4종: `index.html` 8558-8587 퀵 카드 헤더의 이모지를 대체
  - 판정 대기 카드용 꽃봉오리 그림
- [ ] 런타임 폴백 `_dfBuildFlowerSvgMarkup`(runtime 4025~)의 배경도 밝게 한다.

### 5. UI 문구 — `index-inline-runtime.js`
- [ ] `_dfRenderQuadCards`(6430~): `.df-quad-line`에 `rationale_points[0].text`를 표시하고, 없으면 기존 symbolism을 쓴다.
- [ ] `_dfApplyStudioSelection`(7431~): `rationale_points`를 "왜 이 꽃일까요?" 목록으로 렌더한다.

**완료 기준**: 연동 버튼을 누르지 않아도 4장이 모두 핀다. `/api/destiny-flower/match` 요청은 1회다. 근거 문장이 실제 매칭 신호와 일치한다. 360px 폭에서 대비와 가독성에 문제가 없다.

## 함정

- `__tests__/ui/destiny-flower-art.static.test.js`
  - 종당 data-URI 14KB 이하, 평균 10KB 미만
  - `Math.random` 금지(시드 난수 `makeRandom` 사용)
  - SVG에 NaN/undefined가 들어가면 안 된다
  - 형태 계열마다 그림이 달라야 한다
  - runtime의 `var petalCount = 10;` 줄을 유지한다
  - `.df-studio-visual img`에 `mix-blend-mode: multiply`를 쓰지 않는다
- `__tests__/ui/destiny-flower-server-gate.static.test.js:155-170`: `payload.ziweiChart = zw`와 `chooseJamidusuStrongStar(zw)` 호출을 유지한다.
- `__tests__/ui/destiny-flower-wiring.static.test.js:76-87`: `_dfIsSourceLinked`의 `sourceHint: normalized` 패턴을 유지한다.
- 작업 범위와 무관한 버그·리팩터는 고치지 말고 요약에 후속 과제로만 적는다.

## 검증

```
npm test
npm run dev   # 로그인 → 운명의 꽃 스튜디오 → 360px/데스크톱 스크린샷
```
기존 테스트 파일에 행동당 1개씩 추가한다.
- 리졸버가 통합 payload를 쓴다
- `calcAstroSwissChartOrThrow`를 참조한다
- 신강·조후 신호가 점수와 `rationale_points`에 반영된다
- 자미두수는 명궁 주성을 먼저 본다

## 모르는 것

- `G_JOHU.type`의 실제 값 목록(cold/cool/hot/warm 외에 더 있는지): `js/saju-engine.js`에서 확인하고, 없으면 사용자에게 묻는다.
