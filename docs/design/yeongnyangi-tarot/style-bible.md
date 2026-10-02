# 영냥이 타로 스타일 바이블

2026-09-27 · Phase 1(아트 디렉션) 시안 · 승인 전. 대상: 영냥이 전용 타로 덱 78장의 그림·뒷면·프레임.

결정의 출처는 [인수인계](../../handoff/2026-09-27-yeongnyangi-tarot-deck.md)의 결정 ②와 「다음 작업 1」, [브리프](../../handoff/2026-09-27-yeongnyangi-tarot-deck-brief.md)의 Phase 1(1-1~1-6)이다. 둘이 어긋나는 두 곳은 이렇게 푼다.

- 브리프 1-2 "털색(블루그레이)"는 쓰지 않는다. 저장소 정본 캐릭터가 흰 장모이므로 결정 ②를 따른다.
- 브리프 1-1 팔레트 기본안은 "기존 영냥이 컬러가 있으면 그쪽 우선"이므로 `app/yeongnyangi/night-tokens.css` 를 쓴다.

## 톤

귀엽지만 유치하지 않은, 동화책 같은 신비로움. "밤하늘 아래 작은 마법사 고양이". 무섭거나 슬픈 카드(탑·죽음·소드 10 등)도 공포·유혈 없이 상징과 빛의 대비로 표현한다. 등장인물은 모두 고양이다. 사람은 그리지 않는다.

## 팔레트

바탕과 금박은 night-tokens 값을 그대로 쓴다.

| 토큰 | 값 | 쓰임 |
|---|---|---|
| deep | `#0b1220` | 가장 어두운 밤하늘, 카드 가장자리, 뒷면 바탕 |
| night | `#101b2c` | 밤하늘 중간 톤, 명패 안쪽 |
| surface | `#18263a` | 구름·먼 풍경 |
| raised | `#23344b` | 달빛을 받은 면 |
| violet | `#665087` | 그림자 속 보라, 망토 안감 계열 |
| gold | `#e5c58e` | 금박 선·별·테두리 |
| ivory | `#f3eee5` | 달빛·흰 털의 밝은 면 |
| muted | `#bac9da` | 안개·먼 별빛 |
| line | `#52677e` | 옅은 윤곽 |

슈트 보조색은 장면의 광원과 소품에만 쓰고 바탕은 늘 밤색으로 둔다. 완드 호박색·주황, 컵 청록·아쿠아, 소드 연보라·실버, 펜타클 골드·올리브(브리프 1-4).

## 캐릭터 — 영냥이

정본 그림은 `public/assets/yeongnyangi/original/hero-800.webp` 다. 정본은 배경이 투명하다. 생성 참조용 사본은 저장소 밖 `phase1/refs/hero-800-ref.png`(800×800)이고, 시트 바탕과 같은 `#8a94a3` 위에 평탄화했다. 카드에서는 명찰과 금빛 생선 장식을 빼고(글자 금지·소품 단순화), 나머지는 바꾸지 않는다. 아래는 정본을 확대해 읽은 외형이다.

- 체형: 앉은 치비(결정 ②의 "약 2등신"). 정본 실측은 귀·모자를 뺀 머리 약 335px 대 몸 약 366px 이라 머리+몸 기준 약 2.1등신이고, 모자 꼭대기까지를 키로 치면 약 2.3–2.4등신이다(머리 경계는 추정). 프롬프트에는 "about two and a half heads tall" 로 쓴다. 이 문구로 나온 c01 이 같은 기준 약 1.9–2.1등신이라 정본 비율과 맞았으므로, 더 센 비율 지시(2.5등신 고정, 머리 40% 등)는 넣지 않는다.
- 털: 순백의 긴 털을 뾰족한 털 뭉치로 그린다. 그림자는 서늘한 연보라빛 회색이고, 크림·복숭아·분홍 털이 되면 안 된다. 볼털이 크게 뻗는다.
- 귀·꼬리: 크고 곧은 삼각 귀는 안쪽이 파스텔 연어빛 분홍이고 흰 귀털이 길다. 꼬리는 물음표처럼 말려 올라가는 거대한 깃털 꼬리다.
- 눈: 무겁게 반쯤 내려온 윗눈꺼풀 아래의 큰 아몬드형 눈이고, 속눈썹 선은 짙은 자두색이다. 기본 인상은 졸린 듯 무심하고 살짝 뚱하다. 홍채는 세로 그라데이션으로, 위쪽 짙은 남색·로열 바이올렛에서 탁한 장미색을 거쳐 아래쪽 꿀빛 금색으로 넘어간다. 동공은 남색 타원이고 흰 하이라이트가 하나 있다. "크고 둥근 광택 눈"으로 쓰지 않는다. 정본과 다르고 연이 쪽 인상이다.
- 얼굴: 작은 파스텔 분홍 코, 작은 ㅅ자 입, 가늘고 옅은 수염, 아주 옅은 볼 홍조, 분홍 발바닥.
- 모자: 챙이 단단하지 않은 흐물흐물한 남흑색 마법사 모자다. 고양이 기준 오른쪽으로 기울어 긴 끝이 귀 옆으로 늘어지고, 끝은 남색 구슬·금 구슬·긴 금 술이고, 끝 구슬에 밝은 발바닥 무늬(발가락 넷과 패드)가 있다. 금 테두리 접단에 금 초승달·네 갈래 별·가는 별자리 선이 있고, 안감은 보라다.
- 망토: 앞이 트여 흰 가슴이 보이는 짧은 남흑색 망토. 작은 세운 깃, 금 이중선 트림, 금 네 갈래 별과 별자리 선, 로열 바이올렛 안감.
- 목걸이: 검은 초커에 가는 금 장식이 달려 있다. 금 베젤에 둥근 남보라 구슬(작은 흰 별 점) 하나가 박혀 있고, 그 아래로 작은 금 구슬과 짧은 금 술이 달린다.

정본 색 표본(sharp 실측, `refs/hero-800-ref.png`)은 아래 표의 정본 열이다. 망토 안감은 `#41317e` 다. 생성본은 부위마다 같은 자리에 상자를 잡아 이 값과 대조한다.

### 캐릭터 시트 (채택: 턴어라운드 c03 · 표정 c06)

- **턴어라운드 c03**(1536×1024): 정면·3/4(약 45°)·측면·뒷모습. 꼬리는 늘 고양이 왼쪽, 모자 끝은 늘 오른쪽이고, 뒷모습에도 귀 둘이 보인다. 모자·망토 뒤는 무늬 없이 둔다. 남은 결함은 간격이다. 그림 사이가 최소 8px, 왼쪽 여백이 12px 로 빽빽하다(요구 60px).
- **표정 c06**(1536×1024): ① 평온 ② 미소 ③ 놀람 ④ 진지 ⑤ 졸림 ⑥ 장난. 남은 결함: ④ 의 눈이 ① 의 75–80% 이고 입이 얕은 아치라 ① 과 가장 비슷하다. 세로 간격 22–24px, 여백 18·26·30px, ③ 귀 끝 위 12px 로 40px 에 못 미친다.
- 두 시트 모두 모자 끝 구슬의 발바닥 무늬를 재현했다. 크고 둥근 광택 눈은 ③ 놀람에만 있다.
- 색 표본: sharp 실측이고 상자 좌표는 양 끝을 포함한다. QA 측정과 독립 재측정이 일치했다. 각도는 채도 있는 픽셀의 평균 색상각이다.

| 부위 | 정본 상자 | 정본 | c03 ① | c06 ① |
|---|---|---|---|---|
| 이마 털 | 384,176–393,185 | (250,246,245) | (253,249,248) | (252,247,246) |
| 홍채 위 | 340,315–343,318 | (34,24,96) 248° | (33,24,92) 248° | (31,29,97) 241° |
| 홍채 아래 | 360,329–363,332 | (247,231,168) 48° | (253,239,166) 51° | (253,229,162) 44° |
| 모자 | 288,74–297,83 | (42,38,60) | (41,40,60) | (44,43,63) |
| 망토 몸판 | 156,654–165,663 | (31,24,41) | (42,41,61) | (41,40,59) |
| 목걸이 구슬 | 434,466–441,473 | (63,50,134) 249° | (66,43,136) 254° | (70,55,144) 249° |

- 털·홍채 그라데이션·모자·구슬은 정본과 맞는다. 망토 몸판만 정본보다 약 10 밝고 보랏빛이 덜하다. 정본 상자가 그늘진 자리일 수 있어서 결함으로 보지 않고, 카드에서도 같은 자리를 잰다.

## 렌더링

- 캐릭터 시트(턴어라운드·표정)는 hero-800 의 셀 채색을 따른다. 털에는 가는 모브-브라운 외곽선을 쓰고 작은 털 뭉치 획으로 끊는다. 옷에는 검정에 가까운 가는 외곽선을 쓴다. 음영은 2~3단 셀이고, 금장과 구슬에는 광택 하이라이트를 준다. 시트 바탕은 평평한 중간 청회색(`#8a94a3`, 정본의 투명 배경 대신 정한 값)이고 작은 접지 그림자만 둔다.
- 카드 장면은 `readings/tarot-v5.webp` 처럼 반(半)페인터리로 그린다. 속눈썹과 옷 가장자리는 또렷하게 두고, 흰 털은 부드러운 붓결로 풀어 림 라이트를 준다. 여기에 브리프의 수채 질감, 광원 주변 글로우와 보케, 별가루를 더한다. 캐릭터만 셀로 그리고 배경만 수채로 그리면 합성한 것처럼 보인다(T1 실측).
- 어느 쪽이든 실루엣이 선명해서 240px 썸네일에서도 누가 무엇을 하는지 읽혀야 한다.

## 구도와 안전 영역

카드 그림은 세로 2:3, 생성 크기 1024×1536 이다. 위쪽 10%(0–154px)와 아래쪽 14%(1321–1536px)는 프레임·번호·카드 이름이 얹히는 자리라서 얼굴·발·핵심 소품·강한 하이라이트를 두지 않는다. 그 자리는 하늘·구름·바닥 질감처럼 조용한 배경으로 채운다. 주인공은 가운데 띠(154–1321px)에 둔다.

## 금지

- 그림 안의 글자·숫자·룬·글자처럼 보이는 기호·서명·워터마크·로고.
- 실존 상업 타로 덱의 구도 복제. 전통 상징(예: 컵 2의 마주 선 두 인물)은 쓰되 배치와 소품은 새로 짠다.
- 연이(꽃돼지 브랜드)를 닮은 요소: 분홍·마젠타가 주도하는 배색, 연꽃·흩날리는 분홍 꽃잎, 리본 매듭 목장식, 외곽선 없는 봉제인형풍 3D와 강한 블룸, 찻집 실내. 영냥이 화면에는 연이 카드 아트가 어떤 대체 상황에서도 섞이지 않는다.
- 공포·유혈 표현.

## 조연 캐스트

코트 카드와 여러 인물이 나오는 장면에 쓰는 오리지널 고양이들이다. 영냥이와 한눈에 구분되도록 흰 단색 털·청회색 털·마법사 모자·남색 망토·보석 목줄을 쓰지 않는다. 이름은 가칭이며 확정 전이다.

채택 시트는 k02 다(정본 참조 없이 생성). 다섯 마리 모두 영냥이와 같은 약 2등신 앉은 치비 비율, 같은 선 굵기와 셀 음영, 흰 하이라이트 하나가 든 치비 눈을 쓴다.

| 가칭 | 품종·털 | 눈 | 옷차림 |
|---|---|---|---|
| 귤이 | 진한 주황 줄무늬의 주황 태비 새끼, 큰 귀 | 초록 | 이끼색 목수건, 작은 갈색 가죽 가방 |
| 까미 | 매끈한 검은 단모, 길고 가는 꼬리 하나 | 밝은 호박색 | 짧은 진홍 여행 망토(캐스트에서 가장 붉은 옷), 둥근 은 걸쇠 |
| 진주 | 크림색 몸에 초콜릿색 얼굴·귀·발·꼬리의 실 포인트 샴 | 하늘색 | 금테 동그란 안경, 청록 비단 어깨띠 |
| 호두 | 갈기 같은 목털과 스라소니 귀털의 갈색 태비 메인쿤, 가장 크고 풍성함 | 초록빛 금색 | 장식 없는 가는 금 머리띠, 적갈색 짧은 망토 |
| 보리 | 흰 바탕에 주황·검정 큰 얼룩(등, 한쪽 귀, 한쪽 눈 둘레)의 삼색 스코티시 폴드, 접힌 귀 | 구리색 | 겨자색 뜨개 목도리 |

k02 의 진주는 어깨띠에 프롬프트에 없던 작은 금고리가 생겼다. 카드 장면에서는 없어도 된다.

## 슈트 모티프

| 슈트 | 원소·주제 | 모티프 | 보조색 |
|---|---|---|---|
| 완드 | 불 · 열정/행동 | 별빛 깃털 낚싯대 장난감: 가는 나무 막대 끝에서 줄이 휘어 내려와 깃털 뭉치와 작은 별 장식에 닿는다 | 호박색·주황 |
| 컵 | 물 · 감정/관계 | 달빛 찻잔: 초승달 손잡이가 달린 굽 있는 찻잔에 달빛 물이 차오른다 | 청록·아쿠아 |
| 소드 | 공기 · 사고/갈등 | 수염 모양 은빛 검: 길고 살짝 휜 고양이 수염 같은 칼날, 작은 코등이와 둥근 자루 끝 | 연보라·실버 |
| 펜타클 | 흙 · 물질/현실 | 황금 생선 동전: 가운데 생선 실루엣이 돋을새김된 두꺼운 금화, 구슬 테두리 | 골드·올리브 |

컵은 찻집 실내 장면으로 번지지 않게 한다(연이 찻집 세계관과 섞이지 않도록). 어느 모티프에도 글자·숫자·새김 문구를 넣지 않는다.

채택 시트는 m03 이다. visual-checker 가 네 슈트 모두 m02 보다 낫다고 판정했다.
- 물체 뒤의 원·링·틀이 없다. 밝기를 4배로 올리면 m02 는 네 물체 모두 뒤에 원이 드러나지만 m03 은 하나도 없다.
- 찻잔과 동전을 키웠다. 찻잔은 344×279 → 421×339px, 동전은 280×302 → 332×342px 이다.
- 찻잔 물의 색상각은 170° 로, 프롬프트의 `#3cc6b0` 과 같다.
- 검 칼날은 S자 곡선에 머리카락처럼 가는 끝이라 수염으로 읽힌다.
- 글자·숫자·룬이 없고, 네 물체의 화풍이 일관된다. 물체마다 따로 120px 높이로 줄여도 알아볼 수 있다.

m03 에 남은 결함은 Phase 2 장면 프롬프트에서 글로 보완한다.
- 컵: 컵 밖 후광이 183–192°(시안)로 목표보다 15–20° 푸르다. 후광도 물과 같은 청록(`#3cc6b0`)으로 쓴다. 초승달 손잡이 끝이 갈고리처럼 휘어 덜 또렷하다.
- 검: 코등이 바로 위 칼날 아랫부분이 가운데 능선과 V자 끝을 가진 강철 칼날 모양이다. "둥근 수염 뿌리, 능선 없음"으로 쓴다. 빛은 222–227° 로 라벤더보다 푸르다.
- 동전: 정면 구도라 두께감이 약하다. 살짝 기울여 옆면 두께가 보이게 쓴다.
- 파일: m03 은 RGBA 로 나왔다. 배경 알파는 1–4 이고 물체 둘레에 알파 248–253 인 계단형 덩어리가 있다. 참조로 쓰거나 잘라 쓸 때는 `#101b2c`(프롬프트가 요청한 바탕) 위에 평탄화한 `phase1/flat/m03-motifs-flat.png` 를 쓴다. 평탄화 뒤에도 덩어리(35,41,50)와 배경(16,27,44)은 1.18:1 로 은은하게 구분된다.

## 카드 뒷면

- 요소: 초승달 + 영냥이 실루엣 + 고양이 눈 문양 + 별자리 링(브리프 1-5).
- 크기 1024×1536, 밤색 바탕에 금박 선과 평면 금색 도형, 보라 포인트, 안쪽으로 조금 들어온 금박 테두리.
- **180° 회전 대칭은 모델에 맡기지 않는다.** 생성본의 위쪽을 180° 회전해 아래쪽으로 복제하고(sym2), 결과와 그 180° 회전본의 픽셀 차이가 정확히 0 인지 확인한다.
  1. 가운데 원판(반지름 220px)에서 원본과 회전본이 가장 잘 겹치는 세로 어긋남 dy(±40px)를 찾아 먼저 맞춘다. 모델이 그림을 위나 아래로 조금 밀어 그리기 때문이다.
  2. 가운데 가로선 ±120px 안에서 원본과 회전본의 차이가 가장 작은 이음매 곡선을 동적 계획법으로 찾는다. 곡선은 yc(x)+yc(W−1−x)=H−2 를 지켜 그 자체로 회전 대칭이고, 곡선 ±3px 에서만 섞는다.
  3. dy 만큼 위·아래 여백이 늘어난다(맨 위 dy 행은 0행 복제). 생성본의 여백이 고르지 않으면 이 단계에서 더 벌어진다.
  - 48px 직선 띠로 섞는 첫 방식(v1)은 어긋난 모티프가 겹쳐 이중상이 생겨 버렸다.
- **sym2 와 모든 측정 전에 `#0b1220` 위에 평탄화(flatten)한다.** 생성본이 RGBA 투명 배경으로 나올 수 있기 때문이다.
  - 뒷면 6장 중 b02·b03·b05·b06 이 투명 배경으로 나왔고(알파 평균 50–235), 모티프 m03 도 그랬다.
  - 알파를 버리고 RGB 만 읽으면 투명 픽셀 아래 깔린 세피아·회색이 드러난다. 처음에 b05·b06 을 "세피아로 나왔다"고 판정한 것이 이 오진이었다.
  - 금선도 반투명이다. 위·아래 선의 알파는 128–150, 좌우는 167–200 이다. 그래서 평탄화하면 위·아래 선이 좌우보다 흐리다.
  - 여백만 남색으로 칠하던 보정(fill-margin)은 이 오진에서 나왔다. 채택본에는 쓰지 않는다.
- 고양이 한 마리 실루엣은 회전 대칭이 안 되므로 머리-꼬리가 맞물린 두 마리, 트럼프 코트 카드식 위아래 반복, 네 귀퉁이 반복처럼 회전 대칭인 배치를 쓴다.
- 가운데 고양이 눈은 회전 대칭이 되도록 홍채를 가운데 금색에서 가장자리 보라로 번지는 방사형으로 그린다(캐릭터 눈의 세로 그라데이션과 다르다).

### 후보 A·B·C (사용자 선택 대기)

파일은 저장소 밖 `phase1/sym/` 의 평탄화·대칭본이다. 세 장 모두 180° 회전본과의 픽셀 차 합이 0 이다(원장 `derived[].fileSymDiffSum`). 여백은 가장 바깥 금선까지의 거리다(위아래·좌우 px).

| 후보 | 생성 → 파일 | 구성 | dy | 여백 | 최종 QA |
|---|---|---|---|---|---|
| A | b05 → `b05-back-a2-flat-sym2.png` | 모자·망토를 쓴 긴털 고양이 두 마리가 가운데 눈을 음양처럼 감싼다. 초승달, 별 박힌 궤도 링 | 0 | 38·37 | ADOPT. 이음매가 가장 깨끗하다. 고양이가 금박 실루엣이 아니라 크림색 채색 일러스트이고 보라가 가장 많다. 위아래 안쪽 금선이 좌우보다 흐리다(대비 2.3 대 6.0). 꼬리·망토 일부가 몸에서 떨어져 보인다. |
| B | b02 → `b02-back-b-flat-sym2.png` | 큰 초승달 위 금색 고양이 실루엣, 가운데 눈, 구슬을 이은 별자리 링, 달 위상 행. 트럼프 코트 카드식 위아래 반복 | 10 | 26·16 | ADOPT-주의. 좌우 달 위상 행의 높이가 14px 다르다(1:1 에서 보인다). 점선 호가 이음매에서 꺾인다(4x 에서만 보인다). 가장 복잡하고 바탕에 종이결 노이즈가 있다. |
| C | b06 → `b06-back-c3-flat-sym2.png` | 네 귀퉁이에 모자 쓴 고양이 금색 실루엣, 가운데 눈, 초승달 위상 링, 별자리 선과 동심 링 | 23 | 61·39 | ADOPT. 의도(금박 실루엣, 절제된 남색과 금)에 가장 가깝다. 눈 캐치라이트가 좌우 7px, 8각 별이 8px 어긋난다(1:1 에서 잘 안 보인다). 금이 가장 탁하고, 240px 에서 요소가 작아 A·B 보다 약하다. |

- **추천: C.** 의도에 가장 가깝고 남은 결함이 가장 작다. A 는 이음매가 가장 깨끗하지만 채색 고양이라 금박 뒷면에서 벗어난다. B 는 달 행의 14px 기울기가 1:1 에서 보인다.
- C 의 여백 61·39 는 높이·폭의 4.0%·3.8% 라 비율로는 균형이 맞는다. 앱 카드의 둥근 모서리 마스크나 인쇄에서 어떻게 보이는지는 확인하지 않았다.
- dy 가 클수록 위아래 여백이 늘어난다(위 3단계). B 의 달 행 기울기도 dy 10 과 180° 복사에서 생겼다. 원본에서는 수평이었다.
- 뽑히지 않은 후보도 원장에 남긴다. 평탄화 전 대칭본(`sym/` 의 `-flat` 없는 파일)은 쓰지 않는다.

## 프레임

[frame-draft.svg](frame-draft.svg) 는 그림 위에 얹는 1024×1536 오버레이다. 이미지 생성 없이 손으로 그렸고 `<text>` 가 없다.

- 금박 2중 테두리(바깥 10px·안쪽 6px)와 네 귀퉁이의 장식(초승달, 별 메달, 6px 덩굴). 귀퉁이는 한 벌을 그려 좌우·상하로 뒤집어 쓴다. 240px 썸네일에서도 남도록 보이는 선은 모두 6px 이상으로 하고, 반투명 가는 선은 쓰지 않는다.
- 안쪽 금선 바로 안쪽에 4px 남색(`#0b1220`) 키라인을 둔다. 밝은 그림 위에서 금선이 그림에 묻히지 않게 가르는 선이다. t01 의 가장 밝은 가장자리에서 휘도가 금선 155–207, 키라인 18, 그림 220–248 로 갈렸다(실측). 두 금선 사이 띠에는 그림이 비친다.
- 가로 가운데(x 300–723)에서 프레임의 불투명 픽셀은 위쪽 10%·아래쪽 14% 안에만 있고, 그 사이 그림 영역(y 154–1320)에는 없다(렌더 후 알파로 확인).
- 위쪽 번호 명패는 고양이 귀와 알약을 한 경로로 합친 불투명 도형이다. 획을 포함해 y 37–147 로 위쪽 10% 안에 있고, 귀 꼭짓점은 바깥 띠에서 8px 떨어져 있다. 글자 상자는 456,90 에서 112×44.
- 아래쪽 이름 명패는 불투명한 리본 모양이다. 획을 포함해 y 1352–1459 로 아래쪽 14% 안에 있다. 글자 상자는 196,1382 에서 632×58.
- 번호와 이름은 런타임 i18n 오버레이로 얹는다. `#guides`(기본 숨김)에 안전 영역과 글자 상자가 있다.

## 생성 파이프라인과 원장

- 도구: `codex exec` 가 내장 `image_gen` 을 1회 호출한다(codex-cli 0.156.1, 2026-09-27 실측).
  - 내장 도구의 인자는 `prompt` 와 `referenced_image_paths` 둘뿐이다. size·quality 인자가 없어서 크기와 방향은 프롬프트 첫 줄("Image format: portrait 2:3, 1024 x 1536 pixels.")로 지정하고, 품질은 고를 수 없다.
  - 참조 이미지는 `codex exec -i <png>` 로 붙이면 codex 가 `referenced_image_paths` 로 넘기고, 생성에 확실히 반영된다. 같은 프롬프트로 참조 유무만 바꾼 T1/T2 에서 정본 동일성은 9/10 대 3/10 이었다. T1 은 글에 없는 정본 세부 13개를 재현했고, 정본의 포즈·표정도 그대로 따라가는 경향을 보였다.
  - 그래서 영냥이가 나오는 생성에는 참조를 붙이고 자세·표정·배치는 글로 분명히 쓴다. 조연 시트는 영냥이를 닮지 않도록 참조를 붙이지 않는다.
  - 참조의 머리 기울기(정본 약 15°)까지 따라간다. 참조와 다르게 할 것은 "Unlike the reference image, …" 로 시작하는 문장으로 쓴다. 이 문장을 넣자 표정 시트의 눈선 기울기가 8.7–13.9°(c04)에서 0.5–4.0°(c06)로 줄었다.
  - 형용사는 약하게 반영된다. c06 ④ 는 "눈을 절반 높이의 가는 틈으로" 를 요구했는데도 눈이 ① 의 75–80% 였고, 일자 입은 얕은 아치가 됐다. 다음에는 "upper lids cover the top half of each iris so no highlight shows; the mouth is one flat horizontal dash no wider than the nose, ends level" 처럼 결과 모양으로 쓴다(QA 제안, 미검증).
  - 간격·여백의 픽셀 수(60px, 40px)는 지켜지지 않았다(c05 그림 사이 최소 14.6px, c06 세로 간격 22–24px). 시트 배치가 중요하면 생성 뒤 인물을 마스크로 분리해 다시 배치한다(추정, 이번에는 하지 않았다).
  - 시드 고정과 네거티브 프롬프트가 없어서 금지 사항은 프롬프트 본문에 쓴다.
  - 속도(19회 실측): 1회 실행은 82–142초(중앙값 102초)이고, 이미지 파일은 시작 54–95초 뒤에 써진다. 그 뒤 codex 가 27–47초를 더 쓴다. 동시에 2개까지 돌렸고 레이트리밋은 한 번도 없었다. 로그의 `collab spawn failed` 오류 줄(19회 중 5회)은 결과와 무관했다.
  - 결과 PNG 가 RGBA 투명 배경으로 나올 수 있다(19장 중 5장). 원장의 `pixel` 에 채널과 알파 평균을 남긴다. 측정·대칭화·참조 사용 전에는 프롬프트가 요청한 바탕색 위에 평탄화한다.
  - 이미지 모델 이름(gpt-image-2)은 codex-image 스킬 문서 기재이고 로그로는 확인하지 못했다.
  - Phase 2 카드 장면(13회 실측, 2026-09-28): 1회 132–160초(중앙값 140초), 동시 2개, 레이트리밋 0, RGBA 0장, `collab spawn failed` 1회(무해).
  - 안전 영역은 위치 숫자로 지켜지지 않는다. 달 카드에 "윗가장자리 약 15%(230px)"를 더했더니 달이 오히려 커지고 올라갔다(윗가장자리 y 124 → 104). 크기를 줄이고("이미지 폭의 약 1/4") 다른 요소와의 상대 배치("두 탑 꼭대기 사이에 낮게")와 빈 영역("위 1/5 은 별만 있는 빈 밤하늘")을 함께 쓰자 y 171 로 들어왔다(p2-m18-d).
  - 하늘에서 오는 요소는 발원점을 화면 안의 물체에 묶는다. 탑의 번개는 "구름 안에서 시작하고 위 1/10 은 어두운 하늘만"으로 y=0 시작을 없앴다(위 띠 휘도 180 초과 3.60% → 0.20%, p2-m16-c).
  - 개수는 잘 지켜졌다. 펜타클 5 동전 5개와 컵 에이스 물줄기 5줄이 네 후보 모두 맞았다. "한 줄로 가로 배치, 정확히 N 개, 이미지 전체에 다른 원반 없음"을 함께 쓴 결과다.
  - 홍채 아래 색상각이 눈이 보이는 채택 4장(컵 에이스는 앞발만) 모두 27–45° 로 정본 48° 보다 주황 쪽이다. 장면 조명 탓인지 모델 경향인지는 미확인이다. 세트 안에서는 같은 방향이라 튀지 않는다.
  - Phase 3a-1 메이저 1–11번(28회 실측, 2026-09-28): 1회 118–171초(중앙값 133초), 동시 2개, 레이트리밋 0, RGBA 0장.
  - "from its paws to the tip of its hat it spans about half of the card height" 로는 키가 안 맞았다. 11장 첫 후보의 키가 42–73% 로 나왔고, 서거나 앉아 정면으로 크게 잡힌 카드(4·9·11·8)가 60–73% 로 컸다.
    - 8 힘 v2 에 세 문장을 함께 썼다: "a small chibi about two heads tall", "spans only about two fifths of the card height", "hat tip level with the top of the lion's mane"(장면 물체에 높이를 묶음). 그러자 두 후보가 49%·52% 로 들어왔다.
    - 3a-2 는 "about half" 대신 이 세 문장을 쓴다.
  - 원형으로 늘어놓은 개수는 지켜지지 않았다. 3 여황제의 별 12개 왕관은 네 후보가 11·10·8(나머지 가림)·15개였다.
    - v2 에 넣은 문장은 "시계 눈금처럼 12개, 모자 챙 위 평평한 후광"이다. 이 문장이 원근 고리를 만들고, 뒤쪽 별이 모자에 가렸다.
    - 한 줄 가로 배치(Phase 2 펜타클 5)와 달리 원·호 배치는 세기 어렵다. 다음에는 두 가지를 시도한다(미검증).
      - 머리 뒤에 보는 사람을 향해 선 평면 원을 둔다(원근 없음, 모자에 가리지 않음).
      - 그래도 틀리면 생성된 왕관을 지우고 12별 고리를 결정적으로 합성한다.
  - 모자 위에 띄우는 요소(∞·왕관)는 "모자 길이 한 개 이내로 모자 바로 위"와 "위 5분의 1 은 빈 하늘"을 함께 쓴다. 그래야 위 띠와 프레임 상단 고양이 홈(x≈431–590, y≤148)에 가리지 않는다(p3-m08-d).
  - 모자 끝 방울: 채택 10장 중 m04-b·m11-a 는 방울이 발바닥 대신 별 무늬였고, m07-a 는 발바닥 방울이 없었다. CHARACTER 블록이 "a small navy bead" 라고만 쓰고 발바닥 무늬를 명시하지 않는 탓으로 추정한다. 블록 수정은 스타일 확정(Phase 2 승인) 뒤라 사용자 판단으로 넘긴다.
- Phase 3a-2 실측(2026-09-28): 내장 image_gen 직접24회(첫후보18·여황제 왕관 제거1·보완5), 생성 원본 RGB24장·1024×1536·레이트리밋0. 실제 도구 인자는 prompt/referenced_image_paths/transparent_background; 모델 이름·quality·seed는 미확인. 이전 CLI 경유와 구분한다.
  - 여황제 정면 평면고리도 e/f가7·8별로 실패했다. e 왕관을 도구로 제거하고 12별 SVG를 중심(512,243), 반지름70/별 외경10으로 합성했다. 금 그라데이션·1.5px 글로우로 240px 식별을 보완; 최종12개·가림없음. 방법/해시는 원장 g의 derived.
  - 매달린 자는 꼬리/술까지 포함해 중앙 절반에 작게 두도록 써야 안전 영역이 맞았다. 절제는 물에 직접 발이 잠기고 돌이 없다고 명시해 발 배치를 해결했다.
  - 악마는 CHARACTER 기본 블록의 예외로 영냥이가 그림자로만 등장한다고 명시했다. 실물 고양이에 뿔을 붙이지 않으며 두 조연의 열린 목고리·U자 사슬을 그린다. 털/홍채 정본 색 비교는 불가.
  - 태양은 조랑말 전체가 중앙에 들어오도록 작게 쓰고, 앞발2개 모두 고삐를 잡으며 턱을 괴지 않는다고 명시해 여분 발을 없앴다. 영냥이 단독 키30%·조랑말 포함57%는 장면상 예외다.
  - 별17은 큰별1+작은별7이 a에서만 맞았다(b는6). 12/17/20/21 주변 달·광선·날개끝·상자 하단의 프레임 가림은 남겨 기록했고, 핵심 상징 식별과 구분했다. 세트 전체 승인은 사용자 게이트다.
- 생활 장면 파일럿(2026-10-02, 가로 1536×1024, 참조 hero-800-ref, self-a1·love-a1 2회): 둘 다 불합격이었다. 고친 점은 「COMPOSITION_SCENE」 블록과 장면 문단에 반영했다.
  - 키: 거리를 "medium distance" 로만 쓰자 실내(self-a1)는 키가 이미지 높이의 0.57, 야외 다리(love-a1)는 0.36 으로 장면마다 달랐다. 그래서 "wide establishing shot … 키는 높이의 약 1/3, 모자 위·발 아래 빈 공간"을 블록에 넣고, 높이를 장면 물체에 묶었다(self: 모자 끝 = 창 가운데 가로대, love: 난간 기둥 사이 = 키의 약 3배).
  - 참조의 명찰이 샜다. CHARACTER 블록에 "No name tag" 가 있는데도 love-a1 망토에 흰 태그(768px 폭 기준 6×10px)가 생겼다. 그래서 명찰을 지운 참조 사본(`scenes/refs/hero-800-ref-notag.png`, 둘레 색 조화 보간)을 쓴다.
  - 두 파일럿 모두 참조 포즈를 따라 관객을 봤다. 블록에 "Unlike the reference image, Yeongnyangi does not look at the viewer; it looks at what the scene describes." 를 넣었다.
  - 따뜻한 촛불·등불 장면에서 털이 크림색으로 물들었다(self-a1 털 그림자 채도 .07–.22, 정본 .02–.05). 블록에 "털은 순백에 서늘한 라일락 회색 그림자, 따뜻한 빛은 가는 림 라이트로만"을 넣었다.
  - 창유리 반사가 두 번째 고양이로 읽혔고, 가장자리에 소품이 몰렸다. self 문단을 뒷모습 3/4 와 옆얼굴, 흐리고 반투명한 반사, "There is only one cat in the scene." 으로 바꿨다. 가장자리 10% 는 블록에서 배경만 두게 했다.
- 생활 장면 v2(2026-10-02, 8장면 1회씩, 명찰 지운 참조): 8/8 불합격이었다. 참조 포즈(관객 응시·턱 괴기) 5/8, 따뜻한 털 5/8(실내 따뜻한 조명 장면만), 가슴 생선 장식 누출 3/8, 키 초과 4/8, 가장자리 소품 7/8.
  - 참조의 생선 장식도 지워 보았지만 실패했다. 조화 보간이 실루엣 경계(꼬리가 배경으로 튀어나온 곳)를 50×34px 번진 얼룩으로 만들었다. 그래서 명찰만 지운 사본을 계속 쓰고, 생선은 장면 QA 에서 잡는다.
  - 털 기준을 보정했다. 채택된 타로 카드 4장을 같은 방법(털 픽셀 V≥.50·S≤.35)으로 재니 채도 중앙값 .08–.10, S>.12 비율 21–35% 였다. 그래서 장면 털 기준을 중앙값 ≤.11·S>.12 ≤40% 로 정했다(참조 .028 은 기준으로 쓰지 않는다).
- 생활 장면 v3(같은 날, 장면당 최대 3회): STYLE_SCENE 의 warm 세 곳을 바꾸고, 조명 블록 「LIGHT_SCENE」(달빛이 주광, 등불은 고양이와 떨어짐, 따뜻한 빛은 림만)을 맨 끝에 두었다. 장면마다 옆모습 방향과 보는 대상을 적고 소품을 줄였다. self 는 반사를 없앴다.
  - 시선·생선·따뜻한 털은 잡혔다. 대신 털이 서늘한 라일락으로 과채도가 되었다(H≈255–290, 중앙값 .11–.13). 이것은 `scenes/tools/grade.mjs` 로 결정적으로 고친다. 라일락 색상대(250–300°)의 밝은 저채도 픽셀만 채도를 ×(1−0.35w)로 낮추고 마스크는 쓰지 않는다. 보정본을 다시 QA 하고, 방법은 원장 `derived[].method` 에 적는다.
  - 책상 장면(wealth·work)은 키가 .53–.60 으로 넘쳤다. v3.1 에서 COMPOSITION_SCENE 에 "340px·바닥이 보임"을 넣고, 책상을 "방 건너편에서 본 책상 전체"로 바꿨다.
  - 채택: home-a2·journey-a2·crossroads-a2·love-a3 원본, people-a2·wealth-a3·self-a3·work-a3 보정본(8장 모두 ADOPT_WITH_NOTES, 상세는 [scenes/README](../../../public/assets/yeongnyangi/scenes/README.md)). 시도는 모두 20회다.
- 원본 PNG 는 저장소 밖 `D:\Development\yeongnyangi-tarot-art\phase<N>\` 에 둔다. 저장소에는 문서·원장·SVG 만 커밋한다.
- 원장 [art-ledger.jsonl](art-ledger.jsonl): 생성 1회당 1줄. `scripts/save-fortune-art.mjs` 의 `{slug, file, source, tool, prompt, bytes}` 를 넓혀 `{id, phase, target, prompt, size, quality, referenceImage, source, adopted, reason, qa}` 와 해시·해상도를 담는다. 탈락작도 지우지 않고 `adopted:false` 와 이유를 남긴다.
  - `role` 은 그 생성이 맡은 자리(예: 뒷면 후보 A)다.
  - `pixel` 은 채널 수와 알파 통계다.
  - `derived` 는 평탄화·대칭화한 파생본이다. 방법, dy, 크기, 해시가 들어가고, 뒷면이면 180° 회전 픽셀 차 합(0)도 들어간다. 원장을 만드는 스크립트가 파생본을 다시 읽어 이 값을 계산하고, 0 이 아니면 멈춘다.

## 정본 프롬프트 머리말

모든 생성은 아래 블록을 글자 그대로, 빈 줄 하나로 이어 붙여 쓴다. 블록은 영어로 쓴다(생성 프롬프트 관례를 따른 선택이며 한국어와 비교 실측은 하지 않았다).

| 용도 | 조립 순서 |
|---|---|
| 카드 장면 (Phase 2) | FORMAT_PORTRAIT → STYLE_CARD → CHARACTER → (조연이 나오면 캐스트 설명) → 장면 → COMPOSITION_CARD → PALETTE_GUARD → NO_TEXT, 참조 `-i refs/hero-800-ref.png` |
| 캐릭터 시트 | FORMAT_LANDSCAPE → STYLE_SHEET → CHARACTER → 시트 배치 → NO_TEXT, 참조 `-i refs/hero-800-ref.png` |
| 조연 시트 | FORMAT_LANDSCAPE → STYLE_SHEET → 캐스트 → NO_TEXT, 참조 없음(영냥이를 닮지 않게) |
| 모티프 시트 | FORMAT_LANDSCAPE → STYLE_CARD → 모티프 → NO_TEXT |
| 카드 뒷면 | FORMAT_PORTRAIT → STYLE_CARD → 뒷면 공통 → 뒷면 배치 → NO_TEXT, 생성 뒤 sym2 로 180° 대칭 강제 |
| 생활 장면 (영냥이 결과 리더) | FORMAT_LANDSCAPE → STYLE_SCENE → CHARACTER → 장면 → COMPOSITION_SCENE → PALETTE_GUARD → NO_TEXT → LIGHT_SCENE, 참조 `-i scenes/refs/hero-800-ref-notag.png`(명찰을 지운 사본). STYLE_SCENE 은 STYLE_CARD 에서 네 곳을 바꾼 것이다: 'storybook tarot illustration'→'storybook illustration', 'a warm glow and bloom around light sources'→'a soft glow around light sources', 'warm ivory (#f3eee5)'→'snow white (#f5f6fa)', 'quiet, mysterious and warm'→'quiet, mysterious and tender'. LIGHT_SCENE 은 털 색 지시가 가장 나중에 읽히도록 맨 끝에 둔다 |

### FORMAT_PORTRAIT

```text
Image format: portrait 2:3, 1024 x 1536 pixels.
```

### FORMAT_LANDSCAPE

```text
Image format: landscape 3:2, 1536 x 1024 pixels.
```

### CHARACTER

```text
Main character — Yeongnyangi, an original chibi wizard cat (keep this design identical every time): a small, fluffy cat about two and a half heads tall, by default sitting on its rump. Long, fluffy pure-white fur drawn as soft pointed tufts, with cool lilac-gray shading (never cream, peach or pink fur); big flared cheek ruffs; large upright triangular ears with pastel salmon-pink insides and long white ear tufts; a huge bushy plume tail that curls up like a question mark. Eyes: large almond-shaped eyes under heavy, half-lowered upper lids with a thick dark plum lash line, giving a sleepy, deadpan, slightly grumpy look by default; each iris is a vertical gradient from deep indigo and royal violet at the top, through dusty rose, to honey gold at the bottom, with a dark navy oval pupil and one small white highlight. A tiny pastel-pink nose, a small inverted-V mouth, thin pale whiskers, a very faint pink blush and pink paw pads. Outfit: a soft, slouchy near-black navy wizard hat with no stiff brim, worn tilted toward the cat's right side, where its long pointed tip flops down beside the ear and ends in a small navy bead, a gold bead and a long gold tassel; a turned-up gold-edged cuff decorated with a gold crescent moon, a gold four-point star and a thin gold constellation line; a violet hat lining. A short near-black navy cape, open at the front to show the white chest, with a small stand-up collar, gold double-line trim, scattered gold four-point stars and constellation lines, and a royal-violet lining. A black choker collar with thin gold fittings holding one round indigo-violet orb with tiny white star specks in a gold bezel, with a small gold bead and a short gold tassel hanging below it. No name tag, no fish charm, no other accessories.
```

### STYLE_CARD

```text
Style: a luminous storybook tarot illustration in semi-painterly anime digital painting — crisp dark lash lines and thin dark edges on the costume, while the white fur dissolves into soft painted strands with a gentle rim light; soft airbrushed shading with a light watercolor texture; a warm glow and bloom around light sources, soft bokeh and fine floating stardust; clean, readable silhouettes that still read at thumbnail size. Palette: midnight navy (#0b1220, #101b2c) with deep indigo and aubergine shadows, deep slate blue (#18263a, #23344b), muted violet (#665087), soft antique gold and amber (#e5c58e), warm ivory (#f3eee5) and misty blue-gray (#bac9da). Mood: cute but not childish, quiet, mysterious and warm — a little wizard cat under the night sky.
```

### STYLE_SHEET

```text
Style: a clean official character model sheet in polished anime cel style — thin warm mauve-brown outlines on the fur that break into small tufted strokes, thin near-black outlines on the costume, two-to-three-tone cel shading with soft transitions, and glossy highlights on the gold and the orb. Plain flat mid blue-gray background (#8a94a3) with no scenery; only a small soft contact shadow under each figure.
```

### COMPOSITION_CARD

```text
Composition: a vertical 2:3 portrait artwork that fills the whole canvas edge to edge, with no border, frame or card outline. Keep the top 10% and the bottom 14% of the image as quiet background only (sky, clouds or ground texture) with no faces, paws, key objects or bright highlights, because a frame and a name plate will be overlaid there. Place the main subject in the central band.
```

### COMPOSITION_SCENE

```text
Composition: a horizontal 3:2 landscape artwork that fills the whole canvas edge to edge, with no border, frame or card outline. A wide establishing shot with the camera pulled back, not a medium shot or a close-up: Yeongnyangi is small in the frame, and its whole body from the hat tip to the paws spans only about one third of the image height, with open space above the hat and below the paws. On this 1024-pixel-tall canvas the cat is only about 340 pixels tall, and the floor or ground beneath it and beneath the furniture is visible. The setting is simple and uncluttered: only the objects the scene names, with no extra shelves, books, plants, picture frames, globes or instruments. The outer tenth of every edge is plain background only (dark wall, curtain, night sky, water or ground) with no props, faces, paws or key objects there, and nothing important is cut off by the edges. Place Yeongnyangi and the key objects in the central area so the picture still reads on a small phone screen. Unlike the reference image, Yeongnyangi does not look at the viewer and does not rest its chin on a paw: its head is turned in profile toward what the scene describes, and its front paws rest on what it sits on.
```

### LIGHT_SCENE

```text
Lighting and fur: cool silver-blue moonlight is the main light on Yeongnyangi. Lamps, candles and lanterns stand away from the cat, at least one cat-height apart, and their warm glow falls on the objects and the room, not on the cat. Yeongnyangi's face, chest, body and tail stay snow-white with cool lilac-gray and blue-gray shadows, as pale as in the reference image; warm light may touch only one thin outer edge of the fur. Never cream, ivory, beige, peach, pink or golden fur. Unlike the reference image, there is no gold fish-shaped charm anywhere on the cape, collar or chest: only the round indigo orb and its short tassel hang from the choker.
```

### NO_TEXT

```text
Strictly no text of any kind anywhere: no letters, words, numbers, runes, writing-like symbols, labels, signatures, watermarks or logos. Do not copy the composition of any existing commercial tarot deck. No humans. No horror, gore or blood.
```

### PALETTE_GUARD

```text
Palette discipline: pink appears only on the ears, nose, paw pads and a very faint blush — no pink- or magenta-dominated colour scheme, no lotus flowers or drifting pink petals, no ribbon-bow neckwear, and no outline-free plush 3D rendering with heavy bloom.
```

## QA 체크리스트

후보마다 visual-checker 로 판정하고 결과를 원장 `qa` 에 적는다. 메인 세션은 이미지를 직접 읽지 않는다.

1. 캐릭터 동일성: 흰 장모와 연보라 회색 그림자, 무거운 눈꺼풀의 아몬드 눈과 세로 그라데이션 홍채, 흐물흐물한 남흑색 모자·망토와 금장, 보라 안감, 검은 초커의 남보라 구슬, 앉은 치비 비율.
2. 글자 없음: 글자·숫자·룬·서명·워터마크가 한 점도 없다.
3. 해부학: 발·귀·꼬리·눈의 수와 위치, 소품을 쥔 앞발.
4. 안전 영역: 위 10%·아래 14% 에 핵심 요소가 없다.
5. 240px 식별: 썸네일에서 주인공과 핵심 소품이 읽힌다.
6. 색: 눈 위·아래와 털을 sharp 로 샘플링해 정본과 대조한다.

생활 장면은 4·5 대신 이것을 본다: 가장자리 10% 에 얼굴·발·핵심 소품이 없다, 키(모자 끝~발)가 이미지 높이의 약 1/3 이다, 343px 폭에서 영냥이와 장면 소품이 읽힌다, 사람이 없다, 관객이 아니라 장면 속 대상을 본다. 털은 고양이 털 픽셀(V≥.50, S≤.35) 채도 중앙값 .11 이하, S>.12 비율 40% 이하다. 채택된 타로 카드 4장을 같은 방법으로 잰 값(중앙값 .08–.10, 21–35%)에 맞춘 기준이다. 라일락 색이 너무 진한 것만 문제라면 다시 생성하지 않고 `scenes/tools/grade.mjs`(라일락 대역의 옅고 밝은 픽셀만 채도를 낮추는 매끈한 곡선, 마스크 없음)로 결정적으로 고친 뒤 다시 QA 한다. 그 방법은 원장 `derived[].method` 에 적는다.
