# 운명의 섬 — 12궁 수호자 캐스트 (2026-10-02)

운명의 섬 12궁 대화의 안내역이다. 섬 전용 캐릭터이며 다른 화면에서 빌려 오지 않는다. 이전에는 노벨·전쟁 스프라이트(네오·루나·연이·청토끼·까마귀·모카·백문·무 등)를 CSS 로 잘라 썼는데, 그 참조만 뺐다. 원본 자산은 노벨·전쟁 화면이 계속 쓰므로 지우지 않는다.

## 원칙

- 원작 캐릭터(영냥이·연이·네오)는 고치지 않는다. 연이는 기존 표정 시트(`/images/novel/pig-expressions.webp`) 그대로 섬 안내역에 남는다. 새 변형은 없다.
- 수호자는 궁의 의미를 맡은 동물 수호자다. 사이트의 청토끼·까마귀처럼 동물 계보를 따른다.
- 그림 안에 글자·숫자·로고를 넣지 않는다. 1:1 흉상이고, 원형으로 잘라도 머리가 남게 머리 위에 여백을 둔다.
- 말투는 따뜻하고 단정하지 않게 쓴다. 공포·단정·결제 압박 문구는 금지한다(design-canon).

## 캐스트

| 궁 | 장소 | 수호자 | 콘셉트 | 파일 |
|---|---|---|---|---|
| 명궁 | 운명의 성 | 성주 백호 | 은빛 줄무늬 흰 호랑이 성주, 남색 예복·금빛 별 걸쇠 | `public/images/destiny-island/guardians/ming-v1.webp` |
| 형제궁 | 형제의 숲 | 숲지기 다람쥐 | 이끼색 스카프·작은 가방의 밤색 다람쥐 순찰자 | `…/guardians/siblings-v1.webp` |
| 부부궁 | 연인의 정원 | 정원지기 원앙 | 라벤더 숄을 두른 원앙 정원사 | `…/guardians/spouse-v1.webp` |
| 자녀궁 | 빛의 놀이터 | 놀이터지기 수달 | 종이 등불을 든 수달 돌보미 | `…/guardians/children-v1.webp` |
| 재백궁 | 황금 광산 | 광산지기 금두꺼비 | 광부 등불·조끼의 금두꺼비 | `…/guardians/wealth-v1.webp` |
| 질액궁 | 치유의 성소 | 성소지기 거북 | 청록 등딱지·리넨 두건의 늙은 바다거북 치유사 | `…/guardians/health-v1.webp` |
| 천이궁 | 항구 | 항구의 전령 제비 | 남색 짧은 망토·말린 편지의 제비 전령 | `…/guardians/travel-v1.webp` |
| 노복궁 | 동료의 광장 | 광장지기 진돗개 | 엮은 목수건의 흰 진돗개 | `…/guardians/friends-v1.webp` |
| 관록궁 | 전략실 | 전략가 부엉이 | 놋쇠 안경의 수리부엉이 전략가 | `…/guardians/career-v1.webp` |
| 전택궁 | 고향의 집 | 집지기 반달곰 | 반달 가슴무늬·뜨개 카디건의 반달곰 | `…/guardians/home-v1.webp` |
| 복덕궁 | 신비한 도서관 | 사서 두루미 | 학자 도포의 두루미 사서 | `…/guardians/fortune-v1.webp` |
| 부모궁 | 고대 신전 | 신전지기 흰 사슴 | 옅은 금빛 뿔의 흰 사슴 어른 | `…/guardians/parents-v1.webp` |

진입 이미지(같은 세계관 키비주얼):

- 게이트 히어로: `gate-hero-desktop-v2.webp`(1600×1067), `gate-hero-mobile-v2.webp`(900×1200).
- 홈 카드: `home-card-480.webp`(480×270, 다른 홈 카드 `feature-details/*-480.webp` 와 같은 규격). 이전에는 R2 `DestinyAssets/자미두수 운명의 섬.webp` 를 썼다. destiny-compass 는 범위 밖이라 R2 그림을 계속 쓴다.
- 덮어쓰지 않고 새 파일명을 쓴다(엣지 캐시). 이전 `gate-hero-*.webp` 는 다른 참조를 확인하기 전까지 남긴다.

## 어디에 쓰이나

- `destiny-island.html` 의 `PALACES[*].npc = guardian(slug, name, questions)`. 대화 액터는 1:1 초상을 둥근 카드로 보여 준다(`.dlg-actor.portrait`). 대화가 끝나면 질문 예시 3개를 보여 주고, 고른 질문은 `goPalaceConsult(pal, question)` 가 sessionStorage `cdIslandConsultSeed.question` 으로 넘긴다.
- `app/island-consult/IslandConsultClient.tsx` 의 `GUARDIANS` 는 상담 폼 위에 초상과 같은 질문 예시를 보여 준다.
- 🔴 질문 예시는 두 곳에 같은 문구로 들어 있다. 한쪽을 바꾸면 다른 쪽도 같이 바꾼다.

## 제작 기록

- 도구: Codex 내장 image_gen(사용자 계정, 이 PC codex CLI). 2026-10-02 사용자 승인으로 재생성을 포함해 최대 30회까지 호출할 수 있다.
- 원본 PNG 는 레포 밖(`~/.codex/generated_images/`)에 두고, WebP 와 원장만 커밋한다.
- 원장: `docs/design/destiny-island/art.jsonl` (slug·file·source·tool·prompt·bytes, `docs/design/fortune-detail-art.jsonl` 과 같은 형식).
- 판정은 visual-checker 가 했다(원형 크롭 시 머리 잘림, 글자 없음, 잘못된 대상, 계열 일치). 머리 위 여백이 부족한 4장(다람쥐·부엉이·진돗개·사슴)은 여백 지시를 더해 다시 만들었다.
- 다시 만들 때 쓸 공통 스타일:
  > Original CODE DESTINY character portrait, square 1:1, tight head-and-shoulders bust of a single anthropomorphic animal guardian … Sophisticated Korean webtoon and literary fantasy illustration … restrained palette of ink navy, pearl, muted lavender and warm champagne gold … No text, letters, numbers, logos, watermarks, frames or UI.
  (전문은 원장의 prompt 필드)
