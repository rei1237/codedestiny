---
status: active
updated: 2026-10-11
next: 트랙 C(OG 폰트)만 남음. 아래 "남은 일" 참고. 운영 승격은 별도 승인
---

# 운명의 꽃 — 다국어 후속 과제

## 왜

`2026-10-10-destiny-flower-locale-and-dark-cleanup.md`(완료, main `751f92fba` 이후)에서 꽃말 89종·엔진 문구를 11개 로케일로 넓히면서 범위 밖으로 남긴 기존 문제들이다. 한글 노출·오역처럼 사용자에게 바로 보이는 것부터 처리한다.

## 먼저 정할 것 (사용자 결정)

| # | 질문 | 제안 |
|---|---|---|
| D1 | ko 화면의 별자리 표기. 지금 "태양궁 Cancer"(엔진 원값). ko.json에는 `게자리`가 이미 있다 | ko도 로케일 이름으로 표시(`태양궁 게자리`), 원값 `sun_sign`은 비교용으로 유지 |
| D2 | en 자미 밝기 `han`(閑)·`xian`(陷)이 둘 다 "Xian" | 성조 표기 `Xián (閑)` / `Xiàn (陷)` |

결정 없이 시작하면 D1·D2 항목만 건너뛰고 나머지를 진행한다.

## 진행 결과 (2026-10-11)

결정: D1 = ko도 로케일 별자리 이름(`태양궁 게자리`), D2 = `Xián (閑)` / `Xiàn (陷)`. 트랙 A·B 완료, 트랙 C 미착수.

- **A 콘텐츠**: 새 `i18n/authored/destinyFlower-05.json`(59키) — ja 4원소·자미 규칙 재작성, zh 달 위상, 숙요 서사 오역, `growthCycle` 화살표, `saju.fallbackNote` 재번역, en 용신 `Useful Element`, ko 누락 `askAi`·`close` 등.
  - 예외: 이미 `destinyFlower-02..04`·`fortuneVars-01`·`shellCopy-01/02`에 있던 키(용어 통일 vi `Tứ Trụ`·ms `Empat Tiang`/`Tuan Hari`/`Istana Kehidupan`, ja 폴백 꽃 이름, D2 밝기, 별자리 이름 vi·hi·es·fr·de·nl)는 05로 덮지 않고 원래 파일에서 고쳤다. 같은 키를 두 파일이 들고 있으면 어느 쪽이 이기는지 병합 순서에 기대게 된다.
  - `sukuyo.narrative`: ko 원문이 `{guardianJosa}`를 쓰므로 비-ko도 `{guardianJosa}`로 맞췄다(`ziwei.rationale.lifeStar`의 `{starsJosa}`와 같은 방식, 비-ko에서 `josa()`는 이름만 돌려준다). 안 맞추면 `i18n:check` 자리표시자 불일치.
- **B 런타임·엔진**
  - 엔진 `day_master_badge`·`season_label`·`environment_label`이 `astroSignKo()`로 별자리 이름을 넣는다(D1). `sun_sign` 등 원값은 그대로.
  - 런타임: 저장 기록 복원 시 숙요·자미 배지가 저장된 `labels`를 유지, 레거시 별자리 배지·`_dfBadgeText`가 `astro.signs.*` 로케일 이름 사용, `_dfUiText` ko 폴백도 `{var}` 치환, 현재 탭에 결과가 있으면 "다음 단계" 안내 숨김, 죽은 `_af/_jf/_sf` EnsureCardOpen·ApplyCardVisual과 그것만 쓰던 렌더 헬퍼 삭제.
  - `saju.fallbackNote` 엔진 인라인 폴백("일간 데이터 보강 로직…") 제거 — KO_TEXT의 ko 문구가 쓰인다.
  - 배지 간격: 홈은 `fortune-ui.css` 대신 생성 서브셋 `fortune-ui-home.css`를 받아 `.df-quad-badge` 기본 레이아웃(inline-flex·gap)이 없었다. `styles/destiny-flower-cosmic.css`에 스튜디오 범위로 보강(라벨·값 간격 0 → 4px).

### 검증 결과

- ko 엔진 출력(`snap-ko.mjs`): 기준선 대비 차이 12건 — 4개 시나리오 × astro `day_master_badge`·`season_label`·`environment_label`의 별자리 이름(D1, 예: `태양궁 Cancer` → `태양궁 게자리`). 그 밖은 바이트 동일.
- `shots.mjs` 11개 로케일 × 360·1280: 스튜디오 4탭·공유 시트·스토리 카드 한글 0줄, 콘솔 에러 0.
  - 경로 주의: `/<lang>/` 경로가 있는 것은 en·ja·zh·zh-tw뿐이다. vi·hi·es·fr·de·nl·ms는 `/?lang=<lang>`으로 열어야 한다(도구는 `/<lang>/`만 써서 그대로는 404 → 60초 타임아웃). zh-CN·zh-TW도 경로는 `zh`·`zh-tw`.
- 저장 기록 복원: 11개 로케일에서 4탭 각각 저장 → 새로고침 → 복원, 한글 0줄·콘솔 에러 0(임시 스크립트, 레포 밖).
- 배지 간격: 계산값 `display:flex; gap:4px`, 라벨-값 간격 0 → 4px. `style-dump` 차이 0건 — 덤프 시점에 `.df-quad-badge` 요소가 없어 이 선택자는 덤프에 안 잡힌다(다른 선택자는 변화 없음 확인용).
- `node --test __tests__/ui/destiny-flower-*.static.test.js` 55/55, `jest __tests__/worker/destiny-flower` 11/11, `i18n:check`·`verify:worker-no-undef`·`build:worker`+`verify:worker-size`·`sitemap:check` 통과, `check:fast` 통과(jest 377 스위트 5713개).

### 남은 일

- 트랙 C(OG 폰트) 미착수.
- 품질 후속(이번 범위 밖에서 발견): ja `astro.narrative`·ja/zh `ziwei.verdict`의 `?` 잔재, ja `ziwei.stickerLabel` "花 by Ziwei", `badgeJohu` 오역, `featureMarketing` vi·ms 영어, zh 백합 이름 "莉莉", en `indexRuntime.label.011` "Temperature", ms `home.tiles.ziwei` "Istana Ming"(나머지는 Istana Kehidupan), ms 별자리 이름 라틴명 유지, `home.gardenCopy.sheetClose` 미번역, 엔진 `focus_signal`이 영어 별자리 원값 사용, en 숙요 달 위상 "waxing/waning moon" 표기.
- `fortune-ui-home.css`(생성 서브셋)에 스튜디오 규칙이 더 빠져 있을 수 있다 — 생성 규칙 점검.
- 불안정 훅 테스트(`.claude/hooks/sync-main-freshness.test.mjs`): 이번에 단독 실행 16/16 통과(61초). 부하 시 실패 원인은 미조사.

## 과제

### P1 — 한글 노출·틀린 내용

| 항목 | 위치 | 고칠 것 |
|---|---|---|
| 스냅샷 복원 시 한글 노출 | 런타임 스냅샷 복원 경로(`js/core/index-inline-runtime.js`) | 저장된 스냅샷에 `labels`가 없어 비-ko에서 별·궁 이름이 한국어 원값으로 나온다. 복원 시 라벨을 다시 계산하거나 재요청 |
| 별자리 원값 노출 (D1) | 엔진 `worker/lib/destiny-flower-engine.js:1030-1031` `day_master_badge`, 런타임 `badges.sun` 6306·6361·6397·6550·7537·7568·7686행 | `sun_sign` 원값 대신 `fortuneVar.sign.*` 로케일 이름. `fortuneVar.sign.*`이 vi·hi·es·fr·de·nl·ms에서 영어라 함께 번역 |
| ja 기계번역 | `public/i18n/ja.json` `fortune.destinyFlower.astro.elements` | `火災`→`火`, `地球`→`地`, `空気`→`風`(서양 4원소) |
| ja 기계번역 | 같은 파일 `fortune.destinyFlower.ziwei.rules` | `帝国の落ち着き`, `新しい注文` 같은 직역 전체 재작성 |
| zh 달 위상 | `zh-cn`(·`zh-tw` 확인) `fortune.destinyFlower.sukuyo.moon` | `crescent:"新月"`, `new:"暗月"`가 서로 어긋남 → `new:"新月"`, `crescent:"蛾眉月"` |
| 숙요 서사 품질 | ja·zh `fortune.destinyFlower.sukuyo.*` 서사 | 읽고 오역만 교정 |
| `growthCycle` 화살표 | astro·ziwei·sukuyo·saju `growthCycle` (엔진 110·132·150·158행이 ko 기준) | en 등 대부분 로케일이 `→`를 따옴표로 바꿨다. `→` 복원 |
| `saju.fallbackNote` 뜻 불일치 | 엔진 159행 ko "생년월일 정보만으로 일간의 기운을 조심스럽게 짚어보았습니다." | 비-ko 전부 "Day master enrichment logic was applied"(개발자 문구). ko 뜻으로 재번역 |
| 밝기 로마자 충돌 (D2) | `i18n/authored/destinyFlower-04.json` `ziwei.brightness.han`·`xian` | en(과 라틴 문자 로케일) 표기 구분 |

### P2 — 코드 결함

| 항목 | 위치 | 고칠 것 |
|---|---|---|
| ko 키 누락 | `home.destinyFlowerStudio.askAi`, `close` | ko 값 추가(현재 폴백 문자열에 의존) |
| `_dfUiText` 폴백이 자리표시자 미치환 | `js/core/index-inline-runtime.js:6723` 부근 | 번역이 없을 때 쓰는 ko 폴백에도 `vars` 치환 |
| 결과 뒤에도 "다음 단계…" 안내 | `_dfBuildSourceFlowGuide` 5947-5948행 | 결과가 있으면 안내 문구 숨김/교체 |
| 배지 라벨·값 붙음 | 스튜디오 배지 CSS | 라벨과 값 사이 간격 |
| 죽은 코드 | `_afApplyCardVisual`(5216)·`_jfApplyCardVisual`(5367)·`_sfApplyCardVisual`(5536)·`_af/_jf/_sfEnsureCardOpen`(5200·5351·5520) | 호출처 0 확인 후 삭제. `__tests__/ui/destiny-flower-wiring.static.test.js:170`은 `_*ResolveSelection`만 보므로 영향 없음(재확인) |

### P3 — 품질·일관성

| 항목 | 위치 | 고칠 것 |
|---|---|---|
| OG 이미지 두부 | `worker/lib/og-card.js` 132·147행이 `Noto Sans KR`만 로드 | hi(데바나가리)·zh-CN 글리프 폰트 추가. 워커 크기 예산 확인 |
| 용어 혼용 | vi `ui.source.saju` "Saju" vs 새 문구 "Tứ Trụ"; ms "Empat Tiang"/"Saju", "Istana Ming"/"Istana Kehidupan" | 로케일당 한 용어로 통일 |
| ja 폴백 꽃 이름 | 엔진/런타임 폴백 이름표 vs `ja.json` | ja.json 이름으로 맞춤 |
| en 용신 배지 "Lucky God" | en `fortune.destinyFlower` 용신 라벨 | "Useful Element" 등 사주 용어로 |
| 불안정 훅 테스트 | `.claude/hooks/sync-main-freshness.test.mjs` | 부하 시 `check:fast`에서 간헐 실패(단독 16/16). 타임아웃 원인 확인 |

## 트랙 (병렬 시 충돌 주의)

- **A 콘텐츠**: P1 번역 항목 + P3 용어·용신·ja 폴백 이름. 수정은 새 저작 파일 `i18n/authored/destinyFlower-05.json`에만 한다. 이 키들은 `destinyFlower-01..04`에 없고 `public/i18n/*.json`에만 기계번역으로 있으므로 05가 덮어쓴다(ko 값은 `public/i18n/ko.json` 그대로 복사).
- **B 런타임·엔진**: P1 스냅샷·별자리(D1), P2 전부.
- **C OG 폰트**: P3 OG.
- A와 B는 둘 다 `public/i18n`·서버 사전을 다시 만들므로 **같은 워크트리에서 A → B 순서**로 하거나, 따로 하면 나중 쪽이 먼저 쪽을 병합한 뒤 merge/build/sync를 다시 돌린다. C는 독립.

## 작업 절차

```
# 시작 (main 체크아웃은 다른 세션 미커밋이 있으니 건드리지 않는다)
cd D:\Development\code-destiny; git fetch origin
powershell -File scripts/create-safe-worktree.ps1 -Slug destiny-flower-followups

# 변경 전 ko 기준선 (변경 후 같은 명령으로 비교 → 바이트 동일이어야 함)
node D:\Development\codedestiny-worktrees\_tools\destiny-flower\snap-ko.mjs <워크트리> <scratch>\ko-before.json

# 저작 파일 수정 후
node scripts/i18n-merge-authored.mjs --namespace destinyFlower --core
node scripts/build-destiny-flower-i18n.mjs
npm run sync:public
npm run sitemap:generate          # i18n·캐시 핀이 바뀌면 필수, 안 하면 sitemap lastmod 테스트 실패
```

도구(`D:\Development\codedestiny-worktrees\_tools\destiny-flower\`, 레포 밖):

| 도구 | 용도 |
|---|---|
| `snap-ko.mjs <root> <out.json>` | ko 엔진 출력 스냅샷(같은 폴더 `payload-real.json` 사용) |
| `scan-ko.mjs <root> <lang> [@payload]` | 엔진 출력에서 한글 남은 필드 |
| `shots.mjs <root> <out> [langs] [widths]` | Playwright로 스튜디오 탭·공유 시트·스토리 카드 한글 줄 보고 + 스크린샷 |
| `style-dump.mjs <root> <out.json>` | 계산된 스타일 덤프(라이트·다크 × ko·en × 360·1280, hover) — CSS 변경 전후 비교 |

## 완료 기준

- `npm run i18n:check` 통과
- `shots.mjs`로 11개 로케일 × 360·1280에서 한글 0줄(스냅샷 복원 경로 포함), 콘솔 에러 0
- ko 엔진 출력이 기준선과 바이트 동일(D1을 택했으면 `day_master_badge`만 의도대로 다름)
- CSS를 바꾼 경우 style-dump 차이가 의도한 선택자에만 있음
- 검증 명령 전부 통과

## 검증

```
node --test __tests__/ui/destiny-flower-*.static.test.js
NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/worker/destiny-flower
npm run i18n:check
npm run verify:worker-no-undef
npm run build:worker && npm run verify:worker-size     # 직전 gzip 4.37 MiB / 예산 10 MiB (C 트랙 폰트 추가 시 특히)
npm run sitemap:check
npm run check:fast                                      # 10분+ → 백그라운드로
```

## 함정

- 워크트리 `node_modules`는 main 체크아웃을 가리키는 정션이다. 배수할 때 **정션부터** 해제(`cmd /c rmdir <워크트리>\node_modules`)한 뒤 `git worktree remove --force`. 순서를 바꾸면 main의 node_modules가 지워진다.
- 엔진의 한국어 원값(`palace`·`star`·`brightness`·`sun_sign`)은 런타임 비교에 쓰므로 번역하지 않는다. 표시는 `*_label` 형제 필드로.
- 픽셀 스크린샷은 같은 코드끼리도 88장 중 7장이 다르다. 시각 회귀 판정은 style-dump로.
- `sync:public`이 `UNKNOWN errno -4094`로 멈추면 `git checkout -- public/styles/static-policy.css` 후 재실행.
- `wrangler deploy --dry-run`은 Pages 프로젝트라 실패한다. 워커 크기는 `build:worker` + `verify:worker-size`.
- 꽃말·용어는 출처 없이 지어내지 않는다.
