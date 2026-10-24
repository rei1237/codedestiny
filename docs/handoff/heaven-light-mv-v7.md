---
status: active
updated: 2026-10-25
next: "v7.2가 스테이징에 있다(c6cd78483). 운영 배포는 사용자 승인 대기(보류)다. 승인 문장이 이 대화에 없으면 배포하지 말고 한 번만 묻는다. 승인되면 운영 워크플로 → verify-deployed-sha → 운영 페이지가 1b3b5e3c9a66 키를 쓰는지 확인 → _prev_v71 삭제·status: done."
---

# HEAVEN LIGHT MV v7.1 — P3R식 모션 그래픽 재연출, MD·GK 스틸 우선, 배포까지

## 왜

- "코덱스에서 한 결과물이 너무 별로야 가사에 맞게 좋은 영상미와 역동성으로 나오도록 최적화해줄 프롬프트를 작성해서 다른 세션에서 진행 가능하도록해줘"
- "그런 모션 그래픽으로 헤븐라이트 뮤비를 더 개선해주고 참고하라고 준 페르소나3 리로드 연출 기법을 적극적으로 활요해"
- v7.1(2026-10-24): "이미지도 새롭게 다시 만들거나 달빛 운명 여행이나 GOLDEN KINDNESS 이미지를 통해서 더 연출을 좋게 수정해서 배포해주도록해서 다시 작성해줘 프롬프트를"
- 컨셉: 흑월이 흑막, 서한비는 속은 숙요점 마스터이고 회개한다. DEST1NOVA 멤버 컷은 없앤다. 총은 승인된 NE01 한 장에만 나온다.

## v7.2 결과 (2026-10-25, 이 절이 아래보다 우선한다)

- 사용자 요청: 인트로·검은 손을 이미지 생성으로 고급스럽게, 부자연스러운 컷은 다시 만들거나 기존 MV 컷으로, 이야기는 "위기의 연이를 영냥이가 네오로서 구하고, 잘못된 길을 걸은 서한비를 용서한다".
- 결정: 2톤 레이어만 은퇴(스틸의 흑월 그레이드는 유지), 검은 손은 그림 속에 그려진 것만(K7 매트 은퇴). 기획 정본은 `05_PROJECT\hl_mv7\PLAN_v7.md` §R.13.
- 새 스틸 19장 + 이식 2장, 이미지 누계 297/300. DEST1NOVA 0컷, H 0.829, 중복 0.
- 마스터 `06_OUTPUT_v7inal\HEAVEN_LIGHT_MV_{nosub,lyrics}_1080p30.mp4`(sha 700961a80909…), qc 6항목 PASS. motion_audit 저움직임 0.144, 박 안 컷 0.935(구간 기준 0.982).
- R2 새 키 `heaven-light-1080p-1b3b5e3c9a66.mp4` · `heaven-light-720p-32d0f924db93.mp4`, r2_verify ALL PASS. v7.1 키(8a0332259f52·58375a4f4483)는 고아, 운영 키(688d63fe6f03·34479f42d083)는 보존. 둘 다 지우지 않는다.
- 사이트: df5e0bff7(SOURCES·`heaven-light-v72-ch*` 썸네일) + c6cd78483(사이트맵 서명). 스테이징 Pages·Worker c6cd78483 PASS, 청크에 새 키 확인.
- 남은 후속: V062/V106/V107 세 번째 패널이 안 보임, V025(50.2)·V112(190.9) 박 밖 카메라 이동, Browser Shadow CI 실패(이전부터), origin/main의 독립 결제 페이지 `?v=` 핀이 낡음(ac35e2abf 이후, check:fast 경고).
- 렌더 함정: 다른 세션의 node 개발 서버가 메모리를 다 쓰면 6 workers는 OOM이다. `--workers 3`, frame_full은 MemoryError 때 재시도한다.

## 첫 행동

1. `D:\헤븐라이트_MV_2026-10-19\00_HANDOFF_v7_KO.md`의 §R(40–398행)과 §6(1040–1130행)을 읽는다. §R이 §0–§13보다 우선한다.
2. 아래 "진행 기록"과 "구현된 설계"를 읽는다. 코드에 없는 결정이 여기 있다.
3. `cd D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv7`에서 데모를 하나 다시 돌려 연결이 살아 있는지 본다.
   ```
   py -3.14 -X utf8 tools\mg_demo.py --op shatter --still CX_NE01 --mode moon --t0 95.9 --dur 2 --win 0.37 1.2 --params "{\"n\": 48, \"impact\": [0.47, 0.33], \"seed\": 7, \"under\": {\"still\": \"CX_NE01\"}}" --out D:\헤븐라이트_MV_2026-10-19\06_OUTPUT_v7\mg_demo\01_NE01_shatter.mp4
   ```
4. `tools\check_shotlist.py`를 v7로 고친다(§6 "check_shotlist v7 게이트"와 §R.8). 지금은 v4 그대로다(`PLAN = PLAN_v4.md`, STRINGS 2개). `04_TIMELINE_v7\shotlist.json`도 아직 v4의 106샷이다.

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

### 진행 기록 (2026-10-24 첫 실행 세션, 압축 두 번 뒤 여기서 넘김)

- 1단계 준비에서 끝난 것
  - hl_mv7 복사. CX 스틸 22장, MD 30장, GK 18장을 가져왔다(`02_ASSETS\03_KEYFRAMES`, PNG 282개). V5_04는 거절했다(총이 보이고 귀가 모호하다).
  - 서한비 ref 크롭 3장(`ref_hanbi_md18`·`md32`·`concept`)을 `refs_manifest.json`에 등록했다.
  - GK·HL 레이어 8개를 `02_ASSETS\04_LAYERS_v7`로 복사하고 `layers_v7.json`에 sha256과 귀를 적었다. 영냥이 6개(GK_C6, GK_C7, GK_C3b, CAT.leap, CAT.run, CAT.sit)는 원본 크기 2톤에서 모두 귀 2개다(`06_OUTPUT_v7\qa\layers`). GK_HY_FULL·GK_HN_FULL은 고양이가 아니라 ears=null이다.
  - `mg/` 패키지 전부(line.py는 확인 A 뒤): grid, look, layer, mask, focus, warp, timefx, shatter, crack, typecard, panels, `__init__`(OPS 등록부).
  - 렌더러 연결: `shots.py`, `assets.py`·`render.py`(`SOLID:` 판).
  - `tools/accents.py` → `04_TIMELINE_v7\accents.json`(임계 3.0, 548개, 박 위 223개). 96.198초가 박 210의 강세다(NE01 히트와 맞는다).
  - `tools/mg_demo.py`: 단일 op 또는 `--shots` JSON 시퀀스를 540p로 렌더하고 프레임당 시간을 출력한다.
  - 스모크 테스트 20케이스 통과(`06_OUTPUT_v7\qa\smoke\_contact.png`·`_modetrans.png`·`_moon_red2.png`). 프레임당 0.4–2.2초이고, 캐시를 처음 만드는 파편·타이포 프레임만 4.7–5.8초다.
  - MG 데모 1/10: `06_OUTPUT_v7\mg_demo\01_NE01_shatter.mp4`(프레임당 평균 1.28초. 6 workers 최종 렌더는 90분 안에 든다).
- C: 여유 12.4GB(10GB 기준 통과, 2026-10-24). 생성 직전에 다시 잰다.
- 이미지 생성은 아직 0장이다.

## 남은 작업

- [x] 준비 ①: hl_mv7 복사, mg/ 패키지, 렌더러 연결, accents.py, mg_demo.py, CX·MD·GK 가져오기, ref 크롭 manifest, 레이어 복사와 귀 검수
- [ ] 준비 ②
  - check_shotlist v7·v7.1 게이트
  - build_shotlist v7 헬퍼(`mg`·`shard`·`focus`·`panel`·`card`)와 §3 샷 표(§R.4 교체 반영)
  - `05_PROJECT\_tools\motion_audit.py --shotlist`
- [ ] MG 데모(기존 스틸, 540p) 1/10 끝. 남은 것: GK_C6 역파편, CAT.leap 2톤 프리즈, MD_K27c→K27, GK_HR1→HR1b, BG01→03, CX_M01→M03 거울, 모드 진입, 패널, 타이포 카드
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

## 구현된 설계 (코드에 있고, 이유는 여기에만 있다)

- 프레임 순서
  1. 시간 리맵(freeze·ramp·cycle)
  2. board
  3. mg pre(warp·focus·crack·mask)
  4. pre 플레이트
  5. grade(+bleed)
  6. **layers**
  7. **mg mid**(panels·shatter)
  8. 플레이트
  9. 카메라 post
  10. mg post(smear·ca·slit·halftone·scan·invert·flash·type)
- 위 순서는 §6 표와 일부러 다르다. §6은 layer·shatter·panels를 pre에 둔다.
  - 레이어를 grade 뒤에 얹어야 2톤·금 채움 색이 섹션 그레이드에 물들지 않는다.
  - shatter도 grade 뒤에 있어야 다르게 그레이드된 under를 드러낼 수 있다. 예: 흑월 NE01 아래의 현실 NE01.
  - 보고할 때 이 차이를 말한다.
- shot 키
  - `mode`: real(기본) | moon | memory | suku
  - `accent`: red(기본) | gold | cyan
  - `mg`: op 목록이고, t는 노래 초다.
  - `layers`
  - shatter의 `under`와 panels의 항목은 `{"still", "mode", "accent", "layers", "frame", "frame_to"}`를 받는다. `under`가 없으면 어두운 판이다.
- 레이어만 있는 컷은 `"still": "SOLID:#050B1A"`로 판을 깐다. 생성 이미지가 아니므로 stills 목록과 unready 검사에서 빠진다.
- 모드 전환
  - `trans: "modein"`: 앞 샷의 모드로 이 샷을 그린 뒤 반전 1 → 슬릿 2 → 색 빠짐 3프레임. memory는 반전 없이 6프레임 동안 색이 빠진다.
  - `"modeout"`: 앞 샷의 모드에서 이 샷의 모드로, `at`(기본 중앙)에서 6프레임 동안 색이 번진다.
  - 앞 샷과 모드가 같으면 아무것도 하지 않는다.
- **흑월 강조색 분리 기준은 채도 비율(chroma/max) 0.50–0.66이다.**
  - 처음 값(chroma 0.08–0.22)은 MD 스틸의 피부·분홍 머리·벚꽃까지 붉게 칠해 얼굴이 빨개졌다.
  - 지금은 입술·눈·붉은 실·책 장정만 남는다.
  - MD·GK 스틸에는 진한 금이 거의 없다. 그래서 `accent: "gold"`는 새 생성 스틸이나 금 채움 레이어에서만 보인다.
- `SOURCE_GRADE`: MD는 채도 .85에 분홍 색상 −4°, GK는 채도 .90에 하이라이트를 −.03만큼 덜 따뜻하게 한다. 현실 모드에서만, 섹션 그레이드 앞에 건다.
- 레이어 배치
  - anchor는 레이어 아래쪽 가운데의 위치(그림 스틸에 대한 비율)다. h는 그림 높이에 대한 비율이다.
  - View 아핀에 합성하므로 레이어는 카메라로만 움직인다.
  - 1.5배 상한은 `layer.scale_of(spec, zoom)`로 잰다.
- 섬광 제한기 키: mg 반전·섬광은 `("mg", sid, t0)`, 모드 진입 반전은 `("modein", sid)`다.
- 캐시: shatter의 보로노이 라벨 맵은 `hl_mv7\_cache\mg\vor_*.npy`, 흰 바탕 매트의 알파는 `alpha_<still>.npy`다. 첫 프레임만 느리다.
- 타이포
  - `typecard.STRINGS`의 4문구 밖이면 ValueError가 난다.
  - 기본 위치는 y=.62다. `bottom_ok`로 아래 1/6을 피했는지 확인한다.

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
- `'''`나 백슬래시 경로가 많은 파이썬을 Bash heredoc이나 `py -` 표준 입력으로 넣으면 따옴표 짝과 `\0` 이스케이프가 깨진다. 긴 편집 스크립트는 스크래치 파일로 써서 실행한다.
- Windows에서 Python `write_text`는 CRLF로 쓴다. `newline="\n"`을 넘긴다. 이번에 `shots.py`가 LF로 바뀌었다.
- `beats.json`의 bpm은 132.1인데 기획 문서에는 130.7로 적혀 있다. 정본은 박 배열이다.
- `import_layer.py`의 prefix 인자에는 choices가 없다. `--ears`를 쓸 때는 그 자리에 첫 레이어 이름이 오기 때문이다. prefix는 코드에서 직접 검사한다.

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
