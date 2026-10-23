---
status: active
updated: 2026-10-24
next: D:\헤븐라이트_MV_2026-10-19\00_HANDOFF_v7_KO.md를 처음부터 끝까지 읽는다(§R v7.1 개정이 우선). 그다음 §R.9 1단계(준비, 이미지 0장)부터 운영 배포 확인(§R.10)까지 진행한다.
---

# HEAVEN LIGHT MV v7.1 — P3R식 모션 그래픽 재연출, MD·GK 스틸 우선, 배포까지

## 왜

- "코덱스에서 한 결과물이 너무 별로야 가사에 맞게 좋은 영상미와 역동성으로 나오도록 최적화해줄 프롬프트를 작성해서 다른 세션에서 진행 가능하도록해줘"
- "그런 모션 그래픽으로 헤븐라이트 뮤비를 더 개선해주고 참고하라고 준 페르소나3 리로드 연출 기법을 적극적으로 활요해"
- v7.1(2026-10-24): "이미지도 새롭게 다시 만들거나 달빛 운명 여행이나 GOLDEN KINDNESS 이미지를 통해서 더 연출을 좋게 수정해서 배포해주도록해서 다시 작성해줘 프롬프트를"
- 컨셉: 흑월이 흑막, 서한비는 속은 숙요점 마스터이고 회개한다. DEST1NOVA 멤버 컷은 없앤다. 총은 승인된 NE01 한 장에만 나온다.

## 지금 상태

- 운영은 Codex의 v6.1이다(origin/main, `heaven-light-ko-v6.vtt`). 로컬 main의 사이트·테스트는 아직 v4 이름이라 사이트 작업은 origin/main 기반 작업 트리에서 한다.
- v6.1 실측: 저움직임 36.3%, 박 2프레임 안 컷 78.9%, 호랑이 장면 5.7초 정지. v4는 각각 7.3%, 97.2%였다.
- **정본 기획:** `D:\헤븐라이트_MV_2026-10-19\00_HANDOFF_v7_KO.md`. 이 문서는 요약이다.
  - §R(v7.1)이 §0–§13보다 우선한다.
  - MD·GK 스틸 30장이 v7 신규 9장과 2순위 2장을 대신한다. 30장 모두 `import_still.py --check`를 통과했고, 아직 복사하지 않았다.
  - 영냥이·연이 실루엣은 GK·HL의 RGBA 레이어를 2톤으로 채워 쓴다. 생성 매트는 쓰지 않는다.
- 프롬프트는 준비됐다.
  - 스타일과 바이블: `01_PROMPTS\STYLE_HL7_REAL.txt`·`STYLE_HL7_MOON.txt`·`BIBLE_HL7.txt`
  - 파일럿 15장: `01_PROMPTS\v7\*.txt`와 `01_PROMPTS\jobs_v7_pilot.json`. 아직 jobs.json에 합치지 않았다.
  - 이미지는 0장 생성했다(누계 215/300). 1순위 45장과 재생성 12장, 2순위 16장을 다 만들어도 288장이다.
- **배포까지가 범위다.** 사용자가 2026-10-24에 배포를 요청했다. 운영 배포 워크플로 직전에만 한 번 더 승인을 받는다.

## 남은 작업

- [ ] 준비
  - hl_mv7 복사, mg/ 패키지, CX 스틸 가져오기, 서한비 ref 크롭 3장 manifest 등록
  - MD·GK 30장 가져오기와 검수
  - GK 레이어 복사(`04_LAYERS_v7`)와 2톤 귀 검수
- [ ] MG 데모(기존 스틸, 540p)
- [ ] 파일럿 15장 → 1080p 2구간 + 540p 4구간 → **확인 A**(두 번, 인간 네오 현실 컷 포함)
- [ ] 본 생성(1순위 나머지 30장, 2순위) → 전체 미리보기 → 최종 렌더와 qc → **확인 B**(포스터 N7_07 · C7_03 · MD_K34 중 선택)
- [ ] 출시와 배포(§R.10)
  - encode_web → R2 새 키
  - VTT·챕터·테스트 v6 → v7
  - main push(cherry-pick) → CI·스테이징
  - **운영 배포 승인** → `verify-deployed-sha`
- **완료 판정:**
  - check_shotlist `--final` 오류 0(§R.8 게이트 포함), qc 통과
  - motion_audit: 저움직임 ≤ 0.20, 박 2프레임 안 ≥ 0.95
  - 전 컷 영냥이 귀 2개
  - 사용자 확인 B, r2_verify ALL PASS
  - 운영 SHA 확인, 운영 페이지가 새 R2 키를 쓴다

## 정본 예시

- 전환 길이와 후처리 훅: `D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv4\shots.py:65`(`TRANS_LEN`), `shots.py:216`(`post`)
- 가져오기: `D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv4\tools\import_still.py`(`PREFIXES`, `--check`)
- 사이트: origin/main의 `app/yeongnyangi/_components/HeavenLightCinema.tsx:11`(`SOURCES`)

## 함정

- 렌더러 규칙의 v7 예외(마스크·파편·워프·타이포·색 연산)는 기획 문서 §2에 있다. 코드로 그린 빛·입자·인물은 여전히 금지다(메모리 `mv-images-and-camera-only`).
- 2톤 레이어는 구도 안에 고정한다. 움직임은 카메라에서만 나온다. 레이어를 스프라이트처럼 움직이면 위 규칙을 어긴다.
- 영냥이 레이어를 흰색 한 색으로 채우면 옆모습의 귀가 하나로 붙는다. 2톤으로만 채운다(`01_REFS_v7\contact\silhouettes.jpg`와 `twotone.jpg`).
- 앞모습 영냥이 레이어(C6·C3b·CAT.sit)는 좌우로 뒤집지 않는다. 모자가 화면 왼쪽으로 기우는 규칙이 깨진다(메모리 `yeongnyangi-two-ears-qc`).
- GK_HR2는 금지다. 혼자 고개를 젖히는 포즈다(메모리 `neo-sacrifice-not-narcissist`).
- 첨부 금지: P3R 참고 이미지, `KF:S04.png`, `ref_hanbi_set`, `ref_hanbi_h01`–`h09`(v4 악역 서한비), `NOVEL:tiger_*`(SD 호랑이).
- H7_05의 `KF:MD_K18.png`는 MD_K18을 가져와 기록한 뒤에만 첨부된다. gen_still이 기록에 없는 KF:를 거절한다.
- 호랑이(T7_*)는 CX_H15_v61의 수묵 질감에 맞춰 v4 `STYLE_HL.txt`를 쓴다.
- v6.1 R2 객체 2개는 v7.1 출시 뒤 고아가 된다. 지우지 않는다(메모리 `heaven-light-v1-r2-orphans`).

## 검증

```
cd D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv7
py -3.14 -X utf8 tools\check_shotlist.py --final
py -3.14 -X utf8 qc.py
py -3.14 -X utf8 ..\_tools\motion_audit.py <최종 mp4> --beats <beats.json>
node --test __tests__/ui/yeongnyangi-heaven-light-mv.static.test.mjs
npm run check:pre-push
node scripts/verify-deployed-sha.mjs --sha=<sha>
```

## 모르는 것

- Codex 스틸의 얼굴 검수 결과(CX_H15_v61의 호랑이 형태, 네오·서한비 얼굴)
- GK_V1·V2가 달빛판 서한비와 같은 사람으로 읽히는지(GK판에는 붉은 브리지가 있다)
- 2톤 lo/hi와 금빛 값, MD·GK 톤 맞추기 프리셋 값
- 현실 장면의 인간 네오(GK_END_HUMAN·HE)를 쓸지(확인 A)
- 타이틀의 작은 DEST1NOVA 크레딧을 남길지(확인 A)
- origin/main에 `verify:staging` 스크립트가 있는지

---
