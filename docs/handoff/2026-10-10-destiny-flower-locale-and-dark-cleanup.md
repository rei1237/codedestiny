---
status: done
updated: 2026-10-10
next: 브랜치 wt/destiny-flower-locale-20261010-124051 을 main 에 합칠지 사용자 승인 대기. 아래 후속 과제는 별건
---

# 운명의 꽃 — 다국어 확장 + fortune-ui.css 잔존 다크 규칙 삭제

## 왜

사용자: "영어 등 다른 언어 작업 다른 세션에서 진행 가능하도록 해. 예전 다크 테마 규칙은 삭제하는 것도 포함해."
한국어로 완성한 꽃말·개화 서사·공유 시트·친구 꽃 궁합·보태니컬 표본 UI를 11개 로케일로 넓히고, 라이트 테마가 덮어쓰고 있는 예전 다크 선언을 지운다.

## 지금 상태

- 작업은 브랜치 `wt/destiny-flower-locale-20261010-124051`(워크트리 `D:\Development\codedestiny-worktrees\destiny-flower-locale-20261010-124051`)에 커밋 5개로 있다. main 미병합·미푸시, 운영 승격 안 함.
  - `441279dca` 꽃말 89종 × 11로케일, 서버 번역(`withDestinyFlowerLocale`), OG 배지, `i18n:check`에 서버 사전 검사 연결
  - `16520ce76` 엔진 용어(`*_label` 형제 필드)·스튜디오 런타임 문구(`_dfUiText`) 현지화
  - `e45134d7a` 새 키 459개(엔진 서사·자미/숙요/사주 라벨·밝기 8등급·런타임 문구) 10개 로케일 번역
  - `ce65f3bf1` 다크 선언 삭제 + 죽은 `.df-studio-toast` 규칙 삭제
  - `be6c18035` `lang` 요청이 번역된 꽃 이름·꽃말을 돌려주는 라우트 테스트
- 사용자 결정: 해시태그는 로케일별 현지화 / 부정적 전통 꽃말은 현대 꽃말로 대체 / 빈칸은 현지 현대 꽃말, 없으면 한국 꽃말 번역 / 엔진 문구는 서버에서 번역.

### 꽃말 출처 분포 (89종 기준)

| 로케일 | 전통 | 현대 | 한국 꽃말 번역 |
|---|---|---|---|
| en | 50 | 34 | 5 |
| ja | 87 | 1 | 1 |
| zh-CN | 83 | 1 | 5 |
| zh-TW | 82 | 2 | 5 |
| es | 59 | 22 | 8 |
| fr | 54 | 27 | 8 |
| de | 57 | 12 | 20 |
| nl | 47 | 7 | 35 |
| vi | 13 | 48 | 28 |
| ms | 3 | 40 | 46 |
| hi | 10 | 12 | 67 |

hi·ms·vi는 고유 꽃말 전통이 얇아 번역 비중이 높다. zh-TW는 대만 출처가 없는 칸이 있어 zh-CN 출처를 썼다.

## 완료 기준 — 충족

- `npm run i18n:check` 통과(서버 사전 `--check` 포함)
- `/en/`·`/ja/` × 360·1280: 스튜디오 4개 탭·공유 시트·스토리 카드 innerText에 한글 0줄, 콘솔 에러 0
- 다크 삭제 전후: 계산된 스타일 덤프(라이트·다크 × ko·en × 360·1280 × 프로필 유무, hover 포함)가 바이트 동일. 픽셀 스크린샷은 삭제 전끼리도 88장 중 7장이 달라(애니메이션·서브픽셀) 보조 근거로만 썼고, 전후 차이도 같은 범위였다
- ko 엔진 출력·ko 스튜디오 문구는 변경 전과 바이트 동일

## 함정 (다음에 이 영역을 만질 때)

- 엔진의 한국어 원값 필드(`palace`, `star`, `brightness` 등)는 런타임이 비교에 쓰므로 번역하지 않는다. 비-ko 응답에는 `*_label` 형제 필드를 붙이고 화면은 라벨을 쓴다.
- 비-ko에서 `josa()`는 조사 없이 이름만 돌려준다. `{starsJosa}`·`{starsObject}` 자리표시자는 다른 언어에서 순수 명사구다.
- 서버 사전 `worker/lib/destiny-flower-i18n.generated.js`(약 814KB)는 `scripts/build-destiny-flower-i18n.mjs`가 만든다. 저작 파일을 고친 뒤 재생성하지 않으면 `i18n:check`가 실패한다.
- `build-fortune-ui-critical`은 `dist/index.html`이 있어야 돌아서 이번에 실행하지 않았다. 삭제한 선언이 critical 블록에 없음을 grep으로 확인했다.
- `sync:public`이 `UNKNOWN errno -4094`로 멈추면 `git checkout -- public/styles/static-policy.css` 후 다시 실행한다.

## 후속 과제 (이번 범위 밖, 기존 문제)

- 별자리 이름이 영어 원값으로 나온다: ko "태양궁 Cancer", ja 쿼드 카드 "太陽宮Cancer"(같은 화면 본문은 蟹座). 엔진 `day_master_badge`·런타임 `badges.sun`이 `sun_sign` 원값을 쓴다. `fortuneVar.sign`도 es·fr·de·nl·vi·ms·hi에서 영어다.
- 자미 밝기 `불`이 `ping`으로 매핑돼 있다. `han`(閑)과 `xian`(陷)의 로마자가 둘 다 "Xian"이라 hanzi로만 구분된다.
- 기존 ja·zh 기계번역 품질: `astro.elements`, `ziwei.rules`, 숙요 서사, zh `sukuyo.moon.new`. ja 폴백 꽃 이름이 ja.json과 다르다.
- ko `askAi`·`close` 키 누락, en `growthCycle` 따옴표 깨짐, `fallbackNote` 불일치, `_dfUiText` 폴백이 자리표시자를 치환하지 않음.
- OG 이미지 폰트가 hi·zh-CN 글리프를 못 그릴 수 있다(두부).
- vi `ui.source.saju`는 "Saju", 새 문구는 "Tứ Trụ"로 섞여 있다. ms도 "Empat Tiang"/"Saju", "Istana Ming"/"Istana Kehidupan"이 섞여 있다.
- `check:fast`의 `__tests__/release/sitemap-volatile-lastmod-kst.test.js` 실패는 base `8195f15dc`에서도 같은 날짜 의존 실패다.

## 검증

```
node --test __tests__/ui/destiny-flower-*.static.test.js          # 55/55
NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/worker/destiny-flower   # 11/11
npm run i18n:check
npm run verify:worker-no-undef
npm run build:worker && npm run verify:worker-size                 # gzip 4.37 MiB / 예산 10 MiB
```

## 재개

```
cd D:\Development\codedestiny-worktrees\destiny-flower-locale-20261010-124051 && git log --oneline -6
```
