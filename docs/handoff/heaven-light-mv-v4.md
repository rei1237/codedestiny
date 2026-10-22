---
status: done
updated: 2026-10-23
next: "완료(b2df07631 v4 출시, 0faf7bccb 챕터 썸네일 개명, 둘 다 운영 verify-deployed-sha PASS). 남은 것은 v1·v3 R2 고아 객체 정리뿐이고 요청이 있을 때만 한다."
---

# HEAVEN LIGHT MV v4 — 원곡 전체 4:44, 빛이 퍼지는 재연출

## 왜

- "연출이 너무 별로야. 영냥이 귀가 3개인 버그도 있어서, 살릴 컷은 살리면서 가사·라이트 노벨·세계관을 잇는 스토리로 새로 만들게 인수인계해줘"
- "달빛 운명 여행 연출을 참조하고, 필요한 컷은 달빛이나 Golden Kindness에서 가져와. 빛이 퍼져 나가는 연출로."
- 길이는 원곡 전체 283.84초에 106큐다. 빛은 이미지 기반(어두운 판 → 밝은 판을 매트로 드러냄)이다.

## 지금 상태

- 렌더, qc, 확인 B, 사이트 반영, R2 업로드, 운영 배포(b2df07631), 썸네일 개명 재배포(0faf7bccb)까지 끝났다. 둘 다 verify-deployed-sha PASS다.
- 최종본: `D:\헤븐라이트_MV_2026-10-19\06_OUTPUT_v4\final\` (283.84초, 8515프레임). qc 전 게이트 통과.
- R2 새 키 `heaven-light-1080p-305a70272e79.mp4`, `heaven-light-720p-472420706368.mp4`는 둘 다 r2_verify ALL PASS (283.83초).
- 이미지 생성은 누계 215장(상한 239)이다.
- 챕터 시각은 컷 첫 프레임에 맞췄다: 74.71 · 96.21 · 110.81 · 197.37 · 226.91. MP4 메타데이터(config.py)는 기획값 그대로다.
- 포스터는 v3 키 아트(POSTER.png)를 유지했다. SS03 끝 프레임은 3장 썸네일과 겹치고 손만 보이는 장면이라 카드 문구와 덜 맞는다.
- **정본 기획:** `D:\헤븐라이트_MV_2026-10-19\00_HANDOFF_v4_KO.md`. 이야기, 빛 사다리, 106큐 샷 맵, 컷 감사, 프롬프트, 구현, 출시가 다 들어 있다. 이 문서는 요약이다.
- b2df07631로 운영의 영상·VTT·챕터·문구는 v4가 됐다. 귀 3개 PR04가 든 v3 영상은 더 이상 참조되지 않는다.
- 챕터 썸네일은 같은 이름(`heaven-light-ch{n}-320.webp`)으로 바꿔서 엣지 캐시가 v3 그림을 계속 냈다. 그래서 `heaven-light-v4-ch{n}-320.webp`로 이름을 바꿨다.

## 남은 작업

- [x] 준비
  - hl_mv4, `04_TIMELINE_v4`, config 만들기 (NFRAMES 8515, 큐 106)
  - `tools/import_still.py` 만들기
  - `seq.reveal` 매트 구현
  - check_shotlist v4 게이트 (귀·리빌·import 한도 제외)
- [x] 가져오기 13장: 달빛 12장 + GK_HANDS. 원본 크기 그대로 귀 감사
- [x] 신규 27장: 편집 14, 장면 9, FX 매트 4. 상한은 누계 239장
- [x] 확인 A: PR04F 전후, 리빌 속도, 연B 전환
- [x] 본 생성
- [x] 최종 렌더와 `qc.py`
- [x] 확인 B
- [x] 사이트: 새 R2 키, VTT 106큐, 챕터 6개, "4분 44초" ×3, 테스트 갱신
- [x] 출시: R2 업로드·검증, main push, 스테이징, 운영 배포(b2df07631, 0faf7bccb). 운영의 v4 썸네일 6장은 로컬 파일과 바이트 단위로 같다. 운영 배포는 매번 따로 승인을 받는다
- 후속: v3 R2 객체 2개(`heaven-light-1080p-06cecf07eb68.mp4`, `heaven-light-720p-f2c4008f5c2d.mp4`)는 v1 2개와 함께 고아가 됐다. 지우려면 요청을 받아야 한다.
- **완료 판정:**
  - check_shotlist `--final` 오류 0
  - qc 통과
  - 전 컷 영냥이 귀 2개
  - r2_verify ALL PASS
  - 사용자 확인 B

## 정본 예시

- seq 디졸브가 리빌로 바뀔 자리: `D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv3\shots.py:248` (`board`)
- 사이트 쪽: `app/yeongnyangi/_components/HeavenLightCinema.tsx:11`

## 함정

**영냥이**
- 귀는 정확히 2개다. 정본은 `public/assets/yeongnyangi/original/hero-800.webp`다.
- 다시 그릴 때는 원본을 첨부하고 나란히 비교한다(메모리 `redraw-with-real-asset-ref`).

**렌더러와 빛**
- 렌더러는 그리지 않는다(메모리 `mv-images-and-camera-only`).
- 달빛 MV 렌더러는 빛을 코드로 그린다. 그래서 타이밍 문법만 가져오고, 빛 자체는 생성 이미지로 만든다.

**가져온 스틸**
- 달빛·GK 폴더는 읽기 전용이다. 복사만 한다.
- 가져오기는 1672×941만 받는다. GK H1은 3:2라 쓰지 않는다.
- 달빛 K18·K20·K30·K32는 서한비가 아군으로 나와서 금지다.

**인물**
- 연B 한복은 코러스2에만 나온다.
- 두 번째 봄 현실의 인간 네오는 반사나 그림자로만 보여 준다.

**사이트 자산**
- `/assets/*`는 `max-age=604800`이라 같은 이름으로 바꾸면 엣지가 최대 7일 동안 옛 파일을 낸다.
- 컷이 바뀌면 파일 이름도 바꾼다. 캐시 퍼지 토큰은 GitHub 시크릿에만 있다.

## 검증

```
cd D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv4
py -3.14 -X utf8 tools\check_shotlist.py --final
py -3.14 -X utf8 qc.py
py -3.14 -X utf8 tools\r2_verify.py <URL> <파일> <실측 길이>
node --test __tests__/ui/yeongnyangi-heaven-light-mv.static.test.mjs __tests__/ui/mv-card-motion.test.mjs
npm run check:pre-push
```

## 모르는 것

- 달빛 K03rc·K13rc·K21·K27·K33f·K34의 내용
- GK C* 고양이 컷의 귀 개수
- gen 도구가 webp 첨부를 받는지
- `build_shotlist.py`가 seq의 새 키를 그대로 통과시키는지
- 원본 beats.json에 `duration_seconds`가 있는지
