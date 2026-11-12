# 인수인계: 노벨 4천왕 개그 강화 + 네오 봉인 설정 삽입

- **상태**: 미커밋 (검증 완료, 커밋·푸시 미완)
- **작업 브랜치**: `feat/world-cast-page` (main보다 19커밋 앞)
- **마지막 커밋**: `deba89b996371ab365554cc56d6575bf63cd75af`
- **작업 디렉터리**: `d:/Development/code-destiny`

---

## 작업 요약

사용자 요청 세 가지를 라이트 노벨 대본에 자연스럽게 삽입했다.

| # | 요청 | 반영 위치 | 처리 |
|---|---|---|---|
| 1 | 4천왕(서한비·무성·윤달·청토끼) 개그 코드 강화 | EP.35 비트 2개, EP.41 비트 9개 신규 추가 | 완료 |
| 2 | 청토끼 "공식 최약체" 대사 강화 | EP.35:41·EP.35:98 대사 수정 | 완료 |
| 3 | 서한비 → 네오(영냥이)의 봉인된 과거(대통령 운세 명리학자) 폭로 장면 | EP.41:8a~8i 신규 비트 삽입 | 완료 |

---

## 변경 파일 (노벨 관련 핵심만)

```
content/novel/episodes.source.json      ← 정본: EP.35·EP.41 수정
scripts/verify-novel-runtime.mjs        ← EXPECTED_BEAT_COUNT 7844→7853
docs/webnovel_review/webnovel_story_guideline.md ← 비트 수 7844→7853
app/stories/page.tsx                    ← 청토끼·네오 캐릭터 설명 갱신
app/world/world-data.js                 ← 청토끼 role·body 갱신
public/data/novel/episodes/*.json       ← novel:build 산출물 (자동생성)
lib/stories/vn/episodes.generated.json  ← novel:build 산출물 (자동생성)
content/novel/scene-matrix.generated.json ← novel:build 산출물 (자동생성)
public/data/novel/manifest.json         ← novel:build 산출물 (자동생성)
```

> [!NOTE] `public/data/novel/**`, `lib/stories/vn/episodes.generated.json` 등은 `npm run novel:build`의 산출물이다.
> 정본(`content/novel/episodes.source.json`)만 손으로 수정한 것이고 나머지는 자동 갱신된 결과다.

---

## 삽입된 장면 위치

### EP.35 — 청토끼 비행선 탑승 장면
- **ep-35:41**: 청토끼 첫 등장 대사에 "4천왕 중에서 제일 가냘픈 공식 최약체" 문구 추가
- **ep-35:98**: 도주 대사에 "4천왕 체면 따윈 알 게 뭐예요" 문구 추가

### EP.41 — 타로 회랑 진입 장면 (ep-41:8a~8i, 9개 신규 비트)
```
ep-41:8a  윤달이 "흑막의 4천왕이라도 결성할 뻔했잖아요" 농담
ep-41:8b  연이 "청토끼는 빼줘요. 걔는 공식 최약체라면서"
ep-41:8c  윤달 "그래도 한꺼번에 덤볐으면 네오 씨도 진땀 뺐을걸요?"
ep-41:8d  서한비 "우리 넷이 덤볐어도 네오 씨 앞에서는 손끝 하나 닿지 못했을 겁니다." (x: serious)
ep-41:8e  연이 "에? 네오가 그렇게 세다고요? 맨날 낮잠만 자는데?" (x: surprise)
ep-41:8f  서한비 "역대 대통령들의 당선과 국운을 단 한 치의 오차도 없이 맞혀 낸 최고 수준의 명리학자" 설명
ep-41:8g  서한비 "금의 기운이 연이 씨를 상하게 할까 봐 스스로 봉인, 4천왕 전원이 덤벼도 간단히 제압"
ep-41:8h  연이 괄호 속마음 — 충격 리액션 (x: fear)
ep-41:8i  네오 "쓸데없는 소리. 입 다물고 앞이나 봐라." (x: deadpan) — 침묵으로 사실상 인정
```

> [!IMPORTANT] `ep-41:8a~8i`는 rev:1 화(EP.41)에 삽입됐다. rev:1 비트는 id가 없어도 빌드가 통과한다.
> 하지만 이 비트들에는 명시적 id를 부여했으므로 나중에 rev:2로 올릴 때도 안전하다.

---

## 검증 결과

| 검증 항목 | 결과 |
|---|---|
| `npm run novel:build` | ✅ 73화 · 7,853비트 생성 완료 |
| `node scripts/verify-story-text-sync.mjs` | ✅ 73 episodes · 7,853 beats in sync |
| `node scripts/verify-novel-runtime.mjs` | ✅ shell 167,517 bytes · 7,853 beats · ID bookmark migration ready |
| `node scripts/verify-novel-player-start.mjs` | ✅ 전체 통과 |
| `node --test __tests__/ui/world-data.static.test.js` | ✅ 4/4 통과 |

---

## 남은 작업

1. **커밋** — 아래 명령어 그대로 실행
2. **`npm run check:pre-push`** — 15초 내외 통합 검사 (커밋 후)
3. **`git push origin feat/world-cast-page`** (또는 main에 머지 후 push)
4. **main CI 결과 확인** — push 후 다음 작업 시작 전 1회

---

## 재개 명령어

```powershell
# 작업 디렉터리
cd d:/Development/code-destiny

# 1) 상태 확인
git status
git log --oneline -5

# 2) 커밋 (novel 관련 파일만)
git add content/novel/episodes.source.json
git add scripts/verify-novel-runtime.mjs
git add docs/webnovel_review/webnovel_story_guideline.md
git add app/stories/page.tsx
git add app/world/world-data.js
git add public/data/novel/
git add lib/stories/vn/episodes.generated.json
git add content/novel/scene-matrix.generated.json
git add public/data/novel/manifest.json
git commit -m "feat(novel): 4천왕 개그 강화 및 네오 봉인 명리학자 설정 삽입 (EP.35·EP.41)"

# 3) 통합 검사 (15초)
npm run check:pre-push

# 4) 푸시 (현재 브랜치 feat/world-cast-page)
git push origin feat/world-cast-page

# 5) 검증 재확인
node scripts/verify-story-text-sync.mjs
node scripts/verify-novel-runtime.mjs
```

> [!WARNING] `app/components/KakaoChannelInvite.tsx`, `app/components/kakao-channel.module.css` 등 **노벨과 무관한 다른 세션의 미커밋 변경**이 워킹 트리에 섞여 있다. 위 `git add` 명령은 노벨 관련 파일만 스테이지하므로 그 변경은 보존된다.

---

## 설정 정책 유지 사항

- **금지 문자**: `ep-41:8f~8g` 대사가 250자 이내임을 빌드로 확인
- **서한비 동기**: "흑월에 속아 피해를 줬다 → 스스로 갚는 개심 사다리" 유지. 네오 폭로 장면은 흑막 시절 기억(실패한 봄)을 아는 서한비가 말하는 것으로 설정 일관성 확보
- **네오 정체 금칙**: ep-41:8f~8i는 "과거의 능력"만 언급. 진명(박병하)·시간여행 사실은 EP.42 전까지 공개 금지 원칙을 그대로 지킴
- **청토끼**: "4천왕 공식 최약체" 자랑 → 원래의 얄미운 엄살 캐릭터성과 완전히 일치
- **EXPECTED_BEAT_COUNT**: 7844 → 7853 갱신 완료 (추가된 비트 9개)
