---
status: active
updated: 2026-10-24
next: D:\헤븐라이트_MV_2026-10-19\00_HANDOFF_v7_KO.md를 처음부터 끝까지 읽고 §8 1단계(준비, 이미지 0장)부터 시작한다.
---

# HEAVEN LIGHT MV v7 — P3R식 모션 그래픽 재연출

## 왜

- "코덱스에서 한 결과물이 너무 별로야 가사에 맞게 좋은 영상미와 역동성으로 나오도록 최적화해줄 프롬프트를 작성해서 다른 세션에서 진행 가능하도록해줘"
- "그런 모션 그래픽으로 헤븐라이트 뮤비를 더 개선해주고 참고하라고 준 페르소나3 리로드 연출 기법을 적극적으로 활요해"
- 컨셉: 흑월이 흑막, 서한비는 속은 숙요점 마스터이고 회개한다. DEST1NOVA 멤버 컷은 없앤다. 총은 승인된 NE01 한 장에만 나온다.

## 지금 상태

- 운영은 Codex의 v6.1이다(origin/main, `heaven-light-ko-v6.vtt`). 로컬 main의 사이트·테스트는 아직 v4 이름이라 사이트 작업은 origin/main 기반 작업 트리에서 한다.
- v6.1 실측: 저움직임 36.3%, 박 2프레임 안 컷 78.9%, 호랑이 장면 5.7초 정지. v4는 각각 7.3%, 97.2%였다.
- **정본 기획:** `D:\헤븐라이트_MV_2026-10-19\00_HANDOFF_v7_KO.md`(샷 약 189컷, P3R 기법 카탈로그, mg/ 모듈 설계, 게이트). 이 문서는 요약이다.
- 프롬프트는 준비됐다: `01_PROMPTS\STYLE_HL7_REAL.txt`·`STYLE_HL7_MOON.txt`·`BIBLE_HL7.txt`, 파일럿 18장 `01_PROMPTS\v7\*.txt`, `01_PROMPTS\jobs_v7_pilot.json`(아직 jobs.json에 합치지 않았다). 이미지는 0장 생성했다(누계 215/300).

## 남은 작업

- [ ] 준비: hl_mv7 복사, mg/ 패키지, CX 스틸 가져오기, 서한비 ref 크롭 3장 manifest 등록
- [ ] MG 데모(기존 스틸, 540p)
- [ ] 파일럿 18장 → 540p 시퀀스 5개 → **확인 A**
- [ ] 본 생성(1순위 나머지 36장, 2순위) → 전체 미리보기 → 최종 렌더와 qc → **확인 B**
- [ ] 출시: R2 새 키, VTT·챕터·테스트 v6 → v7, 운영 배포는 매번 따로 승인
- **완료 판정:**
  - check_shotlist `--final` 오류 0, qc 통과
  - motion_audit: 저움직임 ≤ 0.20, 박 2프레임 안 ≥ 0.95
  - 전 컷 영냥이 귀 2개
  - 사용자 확인 B, r2_verify ALL PASS

## 정본 예시

- 전환 길이와 후처리 훅: `D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv4\shots.py:65`(`TRANS_LEN`), `shots.py:216`(`post`)
- 사이트: origin/main의 `app/yeongnyangi/_components/HeavenLightCinema.tsx:11`(`SOURCES`)

## 함정

- 렌더러 규칙의 v7 예외(마스크·파편·워프·타이포·색 연산)는 기획 문서 §2에 있다. 코드로 그린 빛·입자·인물은 여전히 금지다(메모리 `mv-images-and-camera-only`).
- 첨부 금지: P3R 참고 이미지, `KF:S04.png`, `ref_hanbi_set`, `ref_hanbi_h01`–`h09`(v4 악역 서한비), `NOVEL:tiger_*`(SD 호랑이).
- 호랑이(T7_*)는 CX_H15_v61의 수묵 질감에 맞춰 v4 `STYLE_HL.txt`를 쓴다.
- 영냥이 모자는 정면에서 화면 왼쪽으로 기운다(메모리 `yeongnyangi-two-ears-qc`).

## 검증

```
cd D:\헤븐라이트_MV_2026-10-19\05_PROJECT\hl_mv7
py -3.14 -X utf8 tools\check_shotlist.py --final
py -3.14 -X utf8 qc.py
py -3.14 -X utf8 ..\_tools\motion_audit.py <최종 mp4> --beats <beats.json>
node --test __tests__/ui/yeongnyangi-heaven-light-mv.static.test.mjs
npm run check:pre-push
```

## 모르는 것

- Codex 스틸의 얼굴 검수 결과(CX_H15_v61의 호랑이 형태, 네오·서한비 얼굴)
- 흰 바탕 매트에서 알파를 깨끗하게 뽑을 lo/hi 값
- 타이틀의 작은 DEST1NOVA 크레딧을 남길지(확인 A에서 묻는다)

---
