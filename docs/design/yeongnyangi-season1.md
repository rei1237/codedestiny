# 영냥이 시즌 1 · 연이의 운명 노벨 웹툰 연재 설계

2026-11-13 개편. 옛 시즌 1(「데운 방석」~「첫 답장」, 컷형)은 내렸다. 「데운 방석」 컷 일부는 이용 안내 웹툰에서 쓴다.
새 시즌 1은 라이트 노벨 원작(`content/novel/episodes.source.json` EP.01·01A·02)을 각색한 페이지형 웹툰 7편이다.

- 기준 기획서: `docs/design/yeoni-novel-webtoon-plan-20261113.md`(사용자 원문)
- 원고(쪽 분할표·4~7화 글콘티): `docs/design/yeoni-novel-webtoon-script.md`
- 진행·승인 기록: `docs/handoff/yeoni-novel-webtoon-2026-11-13.md`

정본 규칙
- 영냥이 = 네오 = 박병하. 정체는 다시 읽어야 보이는 행동 단서로만 둔다. 네오는 은발의 인간 남성이며 사자 시트를 쓰지 않는다.
- 영냥이는 귀가 정확히 두 개다. 쪽마다 원본 크기로 센다.
- 꽃돼지 연이의 큰 연꽃은 인물 자신의 오른쪽 귀, 큰 꽃잎 5장. 5화 35컷부터 가장 바깥 아랫잎 한 장만 흰색.
- 흑호는 이름 없는 검은 새끼 호랑이로만 나온다. 실명 인물 이름은 쓰지 않는다.
- 불운을 단정하는 예언은 쓰지 않는다.

## 공개 일정 (KST)

| 회 | 제목 | 공개 |
|---|---|---|
| 1 | 아무도 재촉하지 않았다 | 2차 배포 즉시(`/yeongnyangi/season-1/prologue/`, 항상 공개·사이트맵 등재) |
| 2 | 내가 쓴 적 없는 후기 | 2026-11-21(토) 21:00 |
| 3 | 문이 열리는 쪽 | 2026-11-28(토) 21:00 |
| 4 | 손가락을 세어 보려다가 | 2026-12-05(토) 21:00 |
| 5 | 네 옆에 서면 | 2026-12-12(토) 21:00 |
| 6 | 이름을 묻지 않는 사이 | 2026-12-19(토) 21:00 |
| 7 | 거울에 먼저 비친 쪽 | 2026-12-26(토) 21:00 |

형식: 1122×1402(4:5) 쪽, 대사는 그림 안에 레터링, PageReader로 읽는다. 쪽 수 18/20/19/20/20/19/17.

## 회차 로그라인

1. **아무도 재촉하지 않았다** — 알람은 울리지 않았고 카드는 세 번 튕겼다. 연이는 사과를 보낸 뒤 사라진 점 세 개 앞에서 손을 떼지 못한다.
2. **내가 쓴 적 없는 후기** — 배터리 4%의 밤, 지워지지 않는 앱이 연이의 이름과 나이, 입 밖에 낸 적 없는 별점을 꺼낸다.
3. **문이 열리는 쪽** — 휴대폰 위로 타로 카드 속 문이 일어서 방 안에 열린다. 연이는 침대 머리판을 붙들지만 나무가 먼저 부러진다.
4. **손가락을 세어 보려다가** — 꽃돼지가 된 연이는 손가락 대신 목소리부터 확인하고, 연잎 끝의 모자 쓴 고양이와 말싸움을 하다 강물 속 글자에 번지는 먹빛을 본다.
5. **네 옆에 서면** — 금빛 선이 검은 손을 베고 연이는 그 고양이에게 이름을 붙인다. 두 번째 손이 오자 연이는 그의 옆에 서고, 반격한 값으로 꽃잎 하나가 하얗게 바랜다.
6. **이름을 묻지 않는 사이** — 갈대의 이름 고리에 걸린 검은 새끼 호랑이를 꺼낸다. 호랑이는 이름 대신 빚 이야기를 하고, 영냥이는 두 몸 사이에 앞발을 놓는다.
7. **거울에 먼저 비친 쪽** — 비겁의 섬 선착장에서 연이는 거울 속에서 손을 흔든 사람이 자기였다고 말하고, 꽃돼지를 비추지 않는 거울이 먼저 움직이는 것을 본다.

## 구현과 발행 절차

- 1화: `lib/yeongnyangi/prologue.mjs`, 경로 `/yeongnyangi/season-1/prologue/`(항상 공개, 사이트맵 등재). 이미지 `public/images/webtoons/yeoni-prologue/NN-{720,1122}.{avif,webp}`.
- 2~7화 연재표: `lib/yeongnyangi/season-1.mjs`(번호·상태·공개 시각, `format: 'pages'`, 1122×1402). 제목·로그라인·쪽 alt는 생성물 `lib/yeongnyangi/season-1-pages.mjs`.
  쪽 alt에는 그 쪽의 구도와 그림 속 글자(대사·내레이션·화면 글자)를 그대로 담는다. 원본 이미지는 `content/yeongnyangi/season-1/epN/NN-{720,1122}.{avif,webp}`.
- 들이기: `node scripts/import-yeoni-webtoon-episode.mjs --pages`(원고 `script/pages.json` → alt 생성물), `--ep N`(빌드 폴더 `epN/out` → 리포 이미지, 쪽 수·크기 검사, `docs/design/consultation-webtoon-assets.json`에 `yn-s1-epN` 출처 기록). `--check`는 검사만 한다.
- 공개 게이트 `lib/yeongnyangi/serial.mjs`: `status === 'ready'` + `format === 'pages'` + 12~24쪽(1부터 차례대로) + 모든 쪽의 alt + 쪽마다 이미지 4개 + `publishAt <= 빌드 시각`.
  미완성 회차는 일정이 지나도 보류된다. 다음 회 안내에는 회차 번호와 시각만 나오고 제목·이미지는 나오지 않는다.
- 화면: 1화와 `app/yeongnyangi/season-1/[episode]` 모두 `PageReader` + `PageReaderChrome`(이어 보기 키 `cd:webtoon:yeoni-s1-epN:page`)과 공용 끝 카드 `app/components/webtoon/SerialEndCard.tsx`(영냥이 CTA, 다음 화 링크 또는 공개 시각, 시즌 목차). 회차는 noindex. 시즌 목차는 각 회차의 1쪽을 표지로 쓴다.
- 빌드: `prebuild:cf` 마지막 단계 `scripts/publish-yeongnyangi-serial.mjs` 가 공개 회차의 쪽 이미지만 `public/assets/yeongnyangi/season-1/epN/`(gitignore)로 복사한다.
  `[episode]` 는 공개 회차만 정적 경로로 만든다(`dynamicParams = false`). 예약 회차는 목록·직접 URL·프리로드·사이트맵 어디에도 없다. 사이트맵에는 시즌 목차와 1화만 있다.
- 발행: `.github/workflows/yeongnyangi-weekly-publish.yml` 이 토요일 21:05 KST 에 **지금 라이브인 커밋**을 Pages 만 다시 빌드·배포하고 기대 회차 URL 이 200 인지 되읽는다.
  이미 열려 있으면 재배포하지 않는다(재실행 멱등). 매일 00:10 KST 운세 발행도 같은 커밋을 다시 빌드하므로, 주간 발행이 실패해도 그 밤 안에 회차가 열린다.
  새 코드를 싣지 않는 콘텐츠 재빌드라 `scripts/verify-worker-single-deploy-guard.mjs` 의 운영 자동화 예외 목록에 명시했다.
  그래서 공개 전 회차도 이미지와 `status: 'ready'`가 **운영 커밋에 미리** 들어 있어야 제때 열린다.
- 점검: `node scripts/publish-yeongnyangi-serial.mjs --check`, 경계 검증은 `SERIAL_NOW=2026-11-21T20:59:00+09:00` 처럼 기준 시각을 주입한다.
  테스트: `__tests__/ui/yeongnyangi-serial.test.mjs`, `__tests__/ui/yeongnyangi-prologue.test.mjs`.
- 새 회차 공개: 작화·검수가 끝나면 `--ep N`으로 들이고 연재표의 `status` 를 `'ready'` 로 바꿔 공개일 전에 운영에 반영한다. 그 뒤 일정은 이 워크플로가 지킨다.
