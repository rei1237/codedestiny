# 연이의 운명 노벨 웹툰 원고 (2026-11-13)

> 제작 원본: `D:CodeDestiny-Buildyeoni-novel-webtoon-20261113script`(pages.md·episodes-4-7.md)의 사본이다. 기준 기획서는 `docs/design/yeoni-novel-webtoon-plan-20261113.md`.

## 1부. 7편 쪽 분할표

생성: `node build-pages.mjs` (원본 `pages-data.mjs`, 글자는 기획서 1~3화와 `episodes-4-7.md`에서 컷 번호로 가져옴). 기계용 사본은 `pages.json`.

### 회차 제목과 로그라인 (사이트 메타데이터용)

- 1화 「아무도 재촉하지 않았다」 — 알람은 울리지 않았고 카드는 세 번 튕겼다. 연이는 사과를 보낸 뒤 사라진 점 세 개 앞에서 손을 떼지 못한다.
- 2화 「내가 쓴 적 없는 후기」 — 배터리 4%의 밤, 지워지지 않는 앱이 연이의 이름과 나이, 입 밖에 낸 적 없는 별점을 꺼낸다.
- 3화 「문이 열리는 쪽」 — 휴대폰 위로 타로 카드 속 문이 일어서 방 안에 열린다. 연이는 침대 머리판을 붙들지만 나무가 먼저 부러진다.
- 4화 「손가락을 세어 보려다가」 — 꽃돼지가 된 연이는 손가락 대신 목소리부터 확인하고, 연잎 끝의 모자 쓴 고양이와 말싸움을 하다 강물 속 글자에 번지는 먹빛을 본다.
- 5화 「네 옆에 서면」 — 금빛 선이 검은 손을 베고 연이는 그 고양이에게 이름을 붙인다. 두 번째 손이 오자 연이는 그의 뒤가 아니라 옆에 서고, 반격한 값으로 꽃잎 하나가 하얗게 바랜다.
- 6화 「이름을 묻지 않는 사이」 — 섬 앞 갈대에서 이름을 물어 묶는 고리에 걸린 검은 새끼 호랑이를 꺼낸다. 호랑이는 이름 대신 빚 이야기를 하고, 영냥이는 두 몸 사이에 앞발을 놓는다.
- 7화 「거울에 먼저 비친 쪽」 — 비겁의 섬 선착장에 코부터 착지한 연이는 거울에서 손을 흔든 사람이 자기였다고 말하고, 꽃돼지를 비추지 않는 거울이 먼저 움직이는 것을 본다.

### 공통 작화 규칙

- 쪽 크기 1122×1402(4:5), 한 쪽 1~3컷, 위에서 아래로 읽는다. 답장 화면·문 공개·큰 공개 컷은 한 쪽 통째.
- 빛의 순서: 노란 아침 햇살(1화 낮) → 어스름한 푸른 답장창 빛(1화 밤~3화 문 전) → 가는 은빛 문빛(3화 문 이후) → 사주의 강의 달빛·남색(4~7화).
- 방은 항상 침대 발치에서 본다: 창문 왼쪽, 책상 오른쪽, 나무 침대 머리판 안쪽. 1화 1쪽을 기준 구도로 저장해 3화 13컷·7화 32컷에 그대로 쓴다.
- 꽃돼지 연이: 인물 자신의 오른쪽 귀에 큰 연꽃, 정면 큰 꽃잎 5장. 5화 35컷부터 바깥 아래쪽 같은 잎 하나만 흰색.
- 영냥이: 귀 정확히 2개. 눈꺼풀이 먼저 들리고 귀는 한 박자 늦게. 거친 말보다 앞발이 먼저. 팔 벌리고 고개 젖히는 포즈 금지.
- 인간 연이는 1~3화와 5화 39컷 거울 조각 속 손만. 의상은 모든 회차에서 시트 의상(크림색 잔꽃 블라우스, 니트 조끼, 모브 치마)으로 통일하고 후드티는 쓰지 않는다. 밤 장면(1화 31컷 이후, 2·3화)은 니트 조끼만 벗어 오른쪽 책상 의자에 걸어 둔다(해당 쪽 구도에 명시). 7화 거울 속 사람 몸은 그리지 않는다.
- 검은 새끼 호랑이는 이름을 말하지 않는다.
- text 종류: narration(내레이션), speech(대사, speaker 필수), thought(연이 속말), sfx(효과음), ui(휴대폰·시스템 화면 글자), sign(김밥 포장지·카드 이름처럼 그림 속에 인쇄된 글자 — 요청 분류에 없는 추가 종류). 그림 속 한국어는 여기 적힌 글자와 한 글자도 다르지 않아야 한다.

### 1화 「아무도 재촉하지 않았다」 (PROLOGUE (프롤로그 1화)) — 18쪽

#### 1화 01쪽 — 컷 01

- 구도: Full-page establishing shot from the foot of the bed: one-room studio, window with curtains on the LEFT letting a stripe of yellow morning sun across the duvet, desk on the RIGHT with a folded umbrella under it, wooden headboard at the far end, Yeoni (human) asleep. Quiet, warm yellow light. Save this layout as the master room view.
- 글자: 없음(무음)
- alt: 늦은 아침 햇살이 잠든 연이의 이불을 가르는 원룸 전경.

#### 1화 02쪽 — 컷 02·03·04

- 구도: Top: close-up of the phone by the pillow with three alarm rows overlaid, all toggled on. Middle: the yellow stripe touches Yeoni's closed eyelids; her hand gropes toward the curtain on the left. Bottom: half-open eyes widen as she sees the sunlit duvet. Yellow morning light.
- 글자
  - [컷 02 화면] 07:10 / 07:15 / 07:20
  - [컷 04 대사·연이] 지금 몇 시지?
- alt: 켜져 있던 알람 세 줄과 햇살에 눈을 번쩍 뜨는 연이.

#### 1화 03쪽 — 컷 05·06·07

- 구도: Top: Yeoni lifts the phone, the charging cable end stays by the pillow, adapter still in the wall. Middle: sitting up, lock screen with an odd notification line under the clock. Bottom: alarm list on screen, her face in yellow light, small tired smirk. Yellow morning light.
- 글자
  - [컷 05 화면] 배터리 1%
  - [컷 06 화면] 운세 손상 감지
  - [컷 07 속말·연이] 이름 붙일 시간에 잤어야지.
- alt: 배터리 1%의 폰과 낯선 알림을 밀어내고 알람 목록을 보는 연이.

#### 1화 04쪽 — 컷 08·09·10

- 구도: Top: she plugs the cable back in and grabs two socks in one hand, turning toward the vanity. Middle: bus stop, low shot of her boots: white sock on her own left, grey striped sock on her own right. Bottom: she tugs her skirt hem down, then lets go as a bus pulls in and takes out a purple transit card. Daylight.
- 글자
  - [컷 08 효과음] 달칵
  - [컷 10 속말·연이] 뭐, 둘 다 내 거니까.
- alt: 짝이 안 맞는 양말을 신고 버스 정류장에 선 연이.

#### 1화 05쪽 — 컷 11·12·13

- 구도: Three stacked horizontal panels at the bus front door: Yeoni's right hand taps the purple transit card on the reader, red light; second tap with card straightened, still red; third tap with fingers pressed flat on the card, red reflected on the window. Same framing each time.
- 글자
  - [컷 11 대사·단말기] 카드를 다시 대주세요.
  - [컷 12 효과음] 삑
  - [컷 13 효과음] 삑
- alt: 버스 단말기에 카드를 세 번 대지만 매번 빨간불이 뜬다.

#### 1화 06쪽 — 컷 14·15·16

- 구도: Top: a sneaker stops on the entrance step, a hand already holding its own card. Middle: Yeoni tucks her elbows in and half-turns her head back, apologetic eyes going to the other person's feet first. Bottom: the passenger waits quietly; Yeoni gives a short nod and rubs the card corner with her thumb.
- 글자
  - [컷 15 대사·연이] 죄송해요.
- alt: 뒤에 선 승객에게 고개를 돌려 사과하는 연이.

#### 1화 07쪽 — 컷 17·18·19

- 구도: Top: fourth tap, green light; her index finger relaxes off the worn card corner. Middle: Yeoni drops into a window seat and exhales. Bottom: close-up, she glares at the card before putting it in her wallet, then looks out the window with closed lips and a small private smile.
- 글자
  - [컷 17 효과음] 삑.
  - [컷 18 효과음] 후.
  - [컷 19 속말·연이] 별 하나. 네 번은 너무했지.
- alt: 네 번째에 겨우 찍힌 카드에 속으로 별 하나를 주는 연이.

#### 1화 08쪽 — 컷 20·21·22

- 구도: Top: midday in front of a convenience store, Yeoni sits and pulls the first plastic strip of a triangle kimbap. Middle: the filling slides out, her other hand too late, only empty wrap left. Bottom: she gathers the spilled rice from the ground with a tissue. Bright noon light.
- 글자
  - [컷 20 인쇄물] 참치마요
  - [컷 21 효과음] 툭
  - [컷 22 대사·연이] 한 입도 못 먹었는데.
- alt: 삼각김밥 속이 통째로 빠져 바닥에 떨어진 점심.

#### 1화 09쪽 — 컷 23·24·25

- 구도: Top: new kimbap, a napkin spread on her lap, opening it with both hands. Middle: first bite reveals red spicy pork, her chewing slows. Bottom: she dabs her eye, rechecks the wrapper, gulps water. Noon light.
- 글자
  - [컷 24 대사·연이] 어, 매워.
  - [컷 25 대사·연이] 제육이면 제육이라고 써 주지.
- alt: 참치마요라고 적힌 김밥 속에서 제육이 나와 당황하는 연이.

#### 1화 10쪽 — 컷 26·27

- 구도: Top: she photographs the wrapper and the bitten cross-section, laughing silently at the photo. Bottom: a different day (different coat): in front of an interview building she smooths her collar and stops at a text on her phone. Caption box at top-left of the bottom panel.
- 글자
  - [컷 27 내레이션] 며칠 뒤
  - [컷 27 화면] 오늘 면접은 취소됐습니다.
- alt: 김밥 사진에 웃던 연이가 며칠 뒤 면접 취소 문자를 받는다.

#### 1화 11쪽 — 컷 28·29·30

- 구도: Top: another day, laptop with an error dialog over her assignment file. Middle: dusk, she looks up from a delivery photo, the building number one digit off. Bottom: next day in a cafe, she pulls back an expired coupon and takes out a payment card. Change coats and window light per panel.
- 글자
  - [컷 28 화면] 파일을 열 수 없습니다.
  - [컷 29 대사·연이] 아, 옆 동.
  - [컷 30 대사·연이] 그냥 결제할게요.
- alt: 열리지 않는 과제 파일, 옆 동으로 간 택배, 하루 지난 쿠폰.

#### 1화 12쪽 — 컷 31·32

- 구도: Top: evening window, a red failed-send mark next to an important message, her finger pressing it again. Bottom: night in the room, Yeoni lying on her stomach, chin buried in the pillow, deleting a long message letter by letter. Dim blue phone light on her face. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 31 화면] 전송 실패
- alt: 전송 실패 표시를 보고 밤에 긴 메시지를 지우는 연이.

#### 1화 13쪽 — 컷 33

- 구도: Full-page phone screen: a chat window where the other person's name and earlier messages are outside the frame; one short sent bubble fits on a single line. Dim blue screen glow at the edges.
- 글자
  - [컷 33 화면] 늦게 말해서 미안해.
- alt: 한 줄로 줄인 사과 메시지가 전송된 대화창.

#### 1화 14쪽 — 컷 34

- 구도: Yeoni in bed, about to put the phone down; a tiny typing dot appears under her message and her half-lowered wrist lifts the screen back up. Dim blue light on her face. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 내려놓으려던 폰 아래에 작은 점이 하나 나타난다.

#### 1화 15쪽 — 컷 35

- 구도: Full-page phone screen, same position as before: three typing dots under her message. Small inset of Yeoni releasing her lower lip and inhaling. Dim blue light.
- 글자
  - [컷 35 화면] · · ·
- alt: 상대가 답장을 입력 중이라는 점 세 개가 뜬 화면.

#### 1화 16쪽 — 컷 36·37

- 구도: Two stacked panels with the identical phone position: top, the screen dims one step while her fingertip touches only the edge; bottom, brightness returns and the dots are gone, no new message. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 화면이 어두워졌다 밝아지자 점이 사라지고 아무 답도 없다.

#### 1화 17쪽 — 컷 38·39

- 구도: Top: focus moves from the screen to Yeoni's face; her thumb hovers over the keyboard and withdraws. Bottom: she places the phone face down on the duvet; her face lit only by the window and her hand resting on the phone back, framed at the same height. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 더 쓰려다 그만두고 폰을 엎어 두는 연이.

#### 1화 18쪽 — 컷 40

- 구도: Yeoni pulls the duvet up to her nose, eyes open, hand still on the overturned phone. Large empty space below the panel. Night, faint window light. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 40 속말·연이] 괜히 보냈나.
- alt: 이불을 코끝까지 덮고 폰에 손을 얹은 채 눈만 뜬 연이.

### 2화 「내가 쓴 적 없는 후기」 (PROLOGUE (프롤로그 2화)) — 20쪽

#### 2화 01쪽 — 컷 01·02·03

- 구도: Top: same framing as 1화 last cut, her finger finally leaves the phone, eyes toward the ceiling. Middle: car headlights sweep across the ceiling; Yeoni mouths her apology silently. Bottom: lights pass, her eyes close, her hand still gripping the duvet edge. Night blue. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 02 속말·연이] 잘 안되면 다들 운명이라고 한다.
  - [컷 03 속말·연이] 그래도 내일 설명하는 건 난데.
- alt: 천장을 지나가는 차 불빛 아래 잠들려는 연이.

#### 2화 02쪽 — 컷 04·05

- 구도: Top: unable to sleep, Yeoni sits on the bed edge; damp sock prints mark the mattress. Bottom: she peels off the damp mismatched socks and rubs the mark on her ankle with the back of her hand. Night, dim desk lamp. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 05 대사·연이] 아, 차가워.
- alt: 잠이 안 와 침대에 걸터앉아 축축한 양말을 벗는 연이.

#### 2화 03쪽 — 컷 06·07·08

- 구도: Top: cheek on the pillow, groping for the cable; lock screen corner shows the battery. Middle: as the cable nears the port, blue light spreads over her dark fingernails. Bottom: her hand freezes mid-air, other hand holding only the phone edges, nobody touching the glass. Blue glow. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 06 화면] 4%
  - [컷 08 대사·연이] 어?
- alt: 배터리 4%의 폰에 선을 꽂기 직전 화면이 스스로 빛난다.

#### 2화 04쪽 — 컷 09

- 구도: Over-the-shoulder view of the home screen: familiar icons with one unusually dark square tucked among them. Blue glow on Yeoni's cheek. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 홈 화면 아이콘 사이에 끼어 있는 어두운 네모 하나.

#### 2화 05쪽 — 컷 10

- 구도: Full-page close-up of the app icon: black background, a door drawn in silver moonlight outline, one small star above. App name beneath. The door's frame and curve match the tarot card of episode 3.
- 글자
  - [컷 10 화면] Code Destiny
- alt: 검은 바탕에 달빛 문과 별 하나가 그려진 Code Destiny 앱 아이콘.

#### 2화 06쪽 — 컷 11·12·13

- 구도: Top: Yeoni sits up holding the phone with both hands, reading the name. Middle: her thumb long-presses the icon, a small haptic buzz. Bottom: other icons jiggle with delete marks, but the moon-door icon has none; a notice pops up. Blue glow. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 11 대사·연이] 언제 깔았지?
  - [컷 12 효과음] 드륵
  - [컷 13 화면] 삭제 불가 · 운명 연결 중
- alt: 앱을 지우려 하지만 삭제 불가 안내가 뜬다.

#### 2화 07쪽 — 컷 14·15·16

- 구도: Top: Yeoni smirks and opens settings; white screen light replaces the blue on her face. Middle: app list search field, no results. Bottom: back on the home screen, the same door icon waiting in the same spot. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 14 대사·연이] 설정에서 지우면 되지.
  - [컷 15 화면] 검색 결과 없음
  - [컷 16 대사·연이] 근데 넌 왜 여기 있어.
- alt: 설정에서도 찾을 수 없는 앱이 같은 자리에서 기다린다.

#### 2화 08쪽 — 컷 17·18

- 구도: Top: a thin notification banner slides down over the home screen, the same shape she swiped away in the morning. Bottom: her hand stops mid-swipe and taps it with a fingernail tip instead. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 17 화면] 운세 손상 감지
  - [컷 18 대사·연이] 아까 그거네.
- alt: 아침에 밀어냈던 운세 손상 알림을 이번엔 눌러 보는 연이.

#### 2화 09쪽 — 컷 19·20

- 구도: Top: the notification expands into a diagnostic list, light adding layer by layer on her cheek. Bottom: the last item appears; her other hand unconsciously wraps the phone corner. Blue glow. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 19 화면] 행운 누수 / 인연 코드 훼손
  - [컷 20 화면] 재물 코드 유출
- alt: 행운 누수, 인연 코드 훼손, 재물 코드 유출이 차례로 뜬다.

#### 2화 10쪽 — 컷 21·22

- 구도: Top: diagnosis window showing her name and age; she pulls the phone right up to her face. Bottom: unfamiliar Chinese characters appear below; her eyes drift back up to the name and age. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 21 화면] 연이 · 23세
  - [컷 22 화면] 일간 후보 乙 / 일주 乙亥
- alt: 진단창에 연이의 이름과 나이, 낯선 한자가 뜬다.

#### 2화 11쪽 — 컷 23·24

- 구도: Top: in the phone light her lips press shut for the first time; she glances around the still room. Bottom: the silent room, only the small screen in her hand answers. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 23 대사·연이] 나, 여기 가입한 적 없는데.
  - [컷 24 화면] 우주는 이미 압니다
- alt: 가입한 적 없다는 연이에게 화면이 먼저 대답한다.

#### 2화 12쪽 — 컷 25·26

- 구도: Top: Yeoni covers the front camera with a finger, a bit embarrassed at herself. Bottom: her thumb searches the inquiry menu, the smile gone. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 25 대사·연이] 아니, 누가 아는데.
  - [컷 26 대사·연이] 상담원 연결해 주세요.
- alt: 카메라를 가리고 상담원 연결을 찾는 연이.

#### 2화 13쪽 — 컷 27·28

- 구도: Top: a single support-desk name appears on screen; her face doesn't move. Bottom: below it a sideways figure-eight infinity queue glyph glows; she tilts the phone without thinking. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 27 화면] 고객센터 우주
  - [컷 28 화면] 상담원 없음 / 대기 순번 ∞
- alt: 고객센터 우주, 상담원 없음, 대기 순번 무한대.

#### 2화 14쪽 — 컷 29

- 구도: Her thumb moves to close the window; a folded record line at the bottom is half hidden under her finger. Close on phone and thumb. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 29 화면] 접수 내역 1건
- alt: 손가락 아래에 반쯤 가려진 접수 내역 한 줄.

#### 2화 15쪽 — 컷 30

- 구도: Full-page phone screen: her finger moves away and a list reveals a single lit star next to a transit card entry. Dim blue light, nothing else on screen.
- 글자
  - [컷 30 화면] 교통카드 ★☆☆☆☆
- alt: 목록에 혼자 켜진 교통카드 별 하나가 드러난다.

#### 2화 16쪽 — 컷 31·32·33

- 구도: Top: detail view of the record, her eyes stopping at the number four. Middle: memory panel in muted morning yellow: the reader turning green on the fourth tap, her own closed lips, her thumb on the worn card corner. Bottom: present, blue light, the phone held a little farther away, she closes her lips like in the memory. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 31 화면] 사유 · 네 번째에 인식
  - [컷 32 효과음] 삑
  - [컷 33 대사·연이] 나 그거, 말 안 했는데.
- alt: 네 번째에 인식된 카드의 기억과 말한 적 없다는 연이.

#### 2화 17쪽 — 컷 34

- 구도: She tosses the phone onto the pillow; fabric sinks and springs back, the screen faces the ceiling and lights up again. Night blue. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 34 효과음] 푹
- alt: 연이가 베개 위로 폰을 던지자 화면이 다시 켜진다.

#### 2화 18쪽 — 컷 35·36

- 구도: Full-page: Yeoni sits back with both hands on her knees, watching from a distance; the pillow-top screen floats a question alone, then two different buttons. Large phone screen dominates the page with her small figure leaning in to read the right-hand button. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 35 화면] 운명을 복구할까요?
  - [컷 36 화면] YES / 나중에
- alt: 운명을 복구할까요라는 질문과 YES, 나중에 두 버튼.

#### 2화 19쪽 — 컷 37·38·39

- 구도: Top: her index fingertip presses only the right-hand button; that button darkens once. Middle: a short notice replaces the buttons while her finger is still there. Bottom: she exhales in disbelief, looking down at two newly lit buttons. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 38 화면] 나중은 선택할 수 없습니다
  - [컷 39 대사·연이] 그럼 왜 물어봤어.
- alt: 나중에를 눌렀는데 나중은 선택할 수 없다는 안내가 뜬다.

#### 2화 20쪽 — 컷 40

- 구도: Full-page: the phone lying flat, screen only, two identical buttons, no finger anywhere. Dim blue glow in darkness.
- 글자
  - [컷 40 화면] YES / YES
- alt: 똑같은 YES 버튼 두 개만 남은 휴대폰 화면.

### 3화 「문이 열리는 쪽」 (PROLOGUE (프롤로그 3화)) — 19쪽

#### 3화 01쪽 — 컷 01·02

- 구도: Top: the phone on the pillow still showing two YES buttons; the screen dims, Yeoni touches only the outer frame. Bottom: her thumb hovers between the buttons then leaves the glass; she checks her own un-pressing hand. Blue phone light. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 01 화면] YES YES
  - [컷 02 대사·연이] 난 나중에 눌렀잖아.
- alt: 두 버튼 사이에서 엄지를 빼며 난 나중에 눌렀다고 하는 연이.

#### 3화 02쪽 — 컷 03·04

- 구도: Top: a single terms line rises where the buttons folded; Yeoni reads to the end. Bottom: as she opens her mouth to protest, a black corner rises from the glass; her lips freeze slightly parted. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 03 화면] 첫째 조항 · 출생과 동시에 동의한 것으로 봅니다.
- alt: 출생과 동시에 동의했다는 약관 위로 검은 모서리가 솟는다.

#### 3화 03쪽 — 컷 05·06

- 구도: Top: the black corner stands up card-thick, lifting fully off the screen, duvet pattern visible between hand and card. Bottom: the upright card turns to face us: a door and frame drawn in thin moonlight on black.
- 글자: 없음(무음)
- alt: 휴대폰 화면에서 문 그림 카드 한 장이 일어선다.

#### 3화 04쪽 — 컷 07·08

- 구도: Top: below the door drawing, a single small flower before the threshold and the card name printed beneath. Bottom: Yeoni's eyes scan the letters and look back up, her hand half-folded about to touch it. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 07 인쇄물] THE DOOR
  - [컷 08 대사·연이] 문…? 이런 패도 있었나.
- alt: 문턱 앞 작은 꽃과 THE DOOR라는 이름이 찍힌 카드.

#### 3화 05쪽 — 컷 09·10

- 구도: Top: a hair-thin black gap opens between the drawn door and frame; she tilts her head. Bottom: the gap widens to a fingernail; a dry-hinge sound stirs the loose hair by her ear. First thin silver light. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 10 효과음] 끼이…
- alt: 카드 속 문틈이 벌어지며 경첩 소리가 난다.

#### 3화 06쪽 — 컷 11·12

- 구도: Top: Yeoni covers the phone speaker with a finger, but the second half of the sound grows louder from the foot of the bed. Bottom: her eyes move sideways first; the light on her cheek is higher and thinner than the phone light, silver. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 11 효과음] …이익
- alt: 스피커를 막아도 소리가 침대 발치에서 이어진다.

#### 3화 07쪽 — 컷 13

- 구도: Full-page tall reveal, identical to the master room view of 1화 page 1 (from the foot of the bed, window LEFT, desk RIGHT, wooden headboard): a person-height moonlight door floating over the empty floor at the bed foot, thin silver light spilling. Generous empty space above and below. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 왼쪽 창과 오른쪽 책상 사이 침대 발치에 사람 키만 한 달빛 문이 떠 있다.

#### 3화 08쪽 — 컷 14·15

- 구도: Top: Yeoni pulls the duvet over her knees; the wallpaper that should be just past the gap is gone. Bottom: close to the threshold, inside: a single star drifts along a swirl, much later another passes the same spot. Silver light. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 14 대사·연이] 저기 원래 벽인데.
- alt: 문 너머에 있어야 할 벽 대신 별이 소용돌이친다.

#### 3화 09쪽 — 컷 16·17

- 구도: Top: pulled back, Yeoni's face and the door together; her shadow under the warm desk lamp is pushed long the other way by the door light. Bottom: eyes on the door, she lowers a bare foot; before it touches the floor, the duvet corner lifts toward the door. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 17 효과음] 팔락
- alt: 문빛에 그림자가 밀리고 이불 모서리가 문 쪽으로 들린다.

#### 3화 10쪽 — 컷 18·19·20

- 구도: Top: tarot cards with sun, moon and wheel burst out of the door like a fan; Yeoni shields her face with her forearm. Middle: assignment pages on the right-hand desk lift one by one; her nails just graze a corner. Bottom: her gaze follows the paper to an inverted umbrella; a cup-noodle container hits a rib and broth droplets scatter in a circle. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 18 효과음] 파라락
  - [컷 19 대사·연이] 아, 그거 내야 되는데.
  - [컷 20 효과음] 톡
- alt: 문에서 카드가 쏟아지고 과제물과 우산, 컵라면이 날린다.

#### 3화 11쪽 — 컷 21·22·23

- 구도: Top: Yeoni wipes a broth drop from her cheek; past her fingers the umbrella spins but one card hangs at the same height. Middle: that card centered beside the umbrella, back side only. Bottom: same framing again, umbrella and papers exit diagonally, the face-down card corner stays at the same point. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 모든 게 도는데 뒷면을 보인 카드 한 장만 같은 자리에 멈춰 있다.

#### 3화 12쪽 — 컷 24·25

- 구도: Top: reaching for the desk edge, she slides with the duvet; small text lines fill the phone. Bottom: her fingertips miss the desk; she twists and grabs the wooden headboard behind her with both hands. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 24 화면] 타로의 문 열림 / 사주의 강 좌표 확인
  - [컷 25 효과음] 탁
- alt: 미끄러지던 연이가 나무 침대 머리판을 두 손으로 붙잡는다.

#### 3화 13쪽 — 컷 26·27

- 구도: Top: side view of bed and body, arms taut, feet lifting off the duvet, hands locked on the wood. Bottom: a new line lights on the phone over her shoulder; she re-grips her slipping hands without reading it. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 26 대사·연이] 닫아 줘. 제발.
  - [컷 27 화면] 초기 아바타 변환 중
- alt: 몸이 문 쪽으로 끌려가도 머리판을 놓지 않는 연이.

#### 3화 14쪽 — 컷 28·29·30

- 구도: Top: extreme close-up of her knuckles; just below her thumb the wood grain splits a hair-thin line. Middle: she tucks her chin to look down at her hands, lips parting. Bottom: the headboard piece stays in her palm; a line of light passes between the break and her hand. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자
  - [컷 28 효과음] 찌직
  - [컷 29 대사·연이] 잠깐.
  - [컷 30 효과음] 뚝
- alt: 나뭇결이 갈라지고 머리판 조각이 손에 남는다.

#### 3화 15쪽 — 컷 31·32

- 구도: Top: from behind, Yeoni clutching the wood piece passes through the door; the window (left) and desk (right) shrink fast inside the frame. Bottom: no floor, no ceiling; curled-up Yeoni and white knuckles floating in a night where stars flow. Outfit: human Yeoni wears her reference-sheet clothes (cream small-floral blouse, mauve skirt); only the knit vest is taken off and hung over the desk chair on the RIGHT.
- 글자: 없음(무음)
- alt: 나무 조각을 쥔 연이가 문을 통과해 별이 흐르는 밤에 떠 있다.

#### 3화 16쪽 — 컷 33

- 구도: The wood piece slips from her hand and drifts sideways between the stars instead of falling. Deep navy, small figure.
- 글자: 없음(무음)
- alt: 손에서 풀린 나무 조각이 별들 사이로 옆으로 흘러간다.

#### 3화 17쪽 — 컷 34

- 구도: Full-page tall: far below, a river made of linked constellations bends; tiny Yeoni passes each bend while tarot cards flash front and back around her. The figure is small, the flow is long.
- 글자
  - [컷 34 대사·타로 패] 골라. …떨어져.
- alt: 별자리 강의 굽이마다 타로 패들이 속삭이며 연이 곁을 스친다.

#### 3화 18쪽 — 컷 35·36

- 구도: Top: a card brushes her ear; she turns her head, the whisper stops right at her ear. Bottom: the starflow slows; a tiny line of text lights in the black margin and she drifts along with it.
- 글자
  - [컷 35 대사·타로 패] 다시. …바뀌어.
  - [컷 36 화면] 접속 완료
- alt: 귓가에서 멎는 속삭임과 검은 여백에 켜지는 접속 완료.

#### 3화 19쪽 — 컷 37·38

- 구도: Top: a record line appears across the night sky, light sweeping under her eyes; she gasps, remembering the terms. Bottom: deep navy closes in one beat before she finishes; only the end of a white speech balloon hangs in the black margin.
- 글자
  - [컷 37 화면] 진입 지역 · 손상된 운세 세계
  - [컷 38 대사·연이] 나는 동의한 적이—
- alt: 손상된 운세 세계에 들어선 연이의 말이 끝나기 전에 화면이 닫힌다.

### 4화 「손가락을 세어 보려다가」 (EP.01 전반 (꽃돼지가 되었다)) — 20쪽

#### 4화 01쪽 — 컷 01·02

- 구도: Top: the same deep navy as the end of episode 3; thin threads of light descend and wrap a small curled silhouette; the unfinished white balloon continues. Bottom: silhouette only inside light, arms shortening, fingertips rounding into stubs, details lost in glow.
- 글자
  - [컷 01 대사·연이] …없거든!
  - [컷 02 효과음] 스르르
- alt: 남색 어둠 속에서 빛에 감싸인 실루엣의 팔이 짧아진다.

#### 4화 02쪽 — 컷 03

- 구도: Full-page tall: a river like the night sky, a giant lotus-leaf boat wider than a bed floating without oar or sail, dew beads glowing like lamps on the rim, a tiny pink figure in the center. Huge moon, starlight breaking on dark blue water.
- 글자: 없음(무음)
- alt: 밤하늘 같은 강 위 커다란 연잎 배 한가운데 작은 분홍 몸 하나.

#### 4화 03쪽 — 컷 04·05

- 구도: Top: close-up of flower-pig Yeoni's eyelids fluttering open, the big moon reflected in her eyes. Bottom: a short pink forepaw rises into frame from below as she goes to rub her eyes; her eyes lock on it.
- 글자: 없음(무음)
- alt: 눈을 뜬 꽃돼지 연이가 눈앞의 분홍 앞발을 본다.

#### 4화 04쪽 — 컷 06·07

- 구도: Top: wide river shot, a scream spreading from the tiny body on the leaf, glowing Chinese-character glyphs scattering like startled fish. Bottom: the scream cuts off; she pants with her round belly heaving.
- 글자
  - [컷 06 대사·연이] 나 돼지 됐잖아아아!
  - [컷 07 효과음] 헥, 헥
- alt: 강 위로 퍼지는 비명과 숨이 차 헐떡이는 꽃돼지 연이.

#### 4화 05쪽 — 컷 08·09·10

- 구도: Top: her reflection in a dew puddle on the leaf: short forepaws, round belly, curly tail, a big lotus on her own RIGHT ear with five large front petals clearly readable (mirror image). Middle: she holds both forepaws up side by side, dead serious. Bottom: grumbling, a tiny oink sound tagged at the end of the balloon.
- 글자
  - [컷 09 대사·연이] 이 손으로 과제는 어떻게 해.
  - [컷 10 대사·연이] 진짜 말이 안 되잖아, 꿀.
- alt: 이슬 웅덩이에 비친 꽃돼지 모습과 앞발을 들어 보는 연이.

#### 4화 06쪽 — 컷 11·12·13

- 구도: Top: she clamps both forepaws over her snout, eyes rolling. Middle: she sits upright like at a job interview and speaks carefully. Bottom: no oink this time, her shoulders drop in relief.
- 글자
  - [컷 11 대사·연이] ……방금 뭐야.
  - [컷 12 대사·연이] 안녕하세요. 저는 인간입니다.
  - [컷 13 대사·연이] 좋아. 말은 됨.
- alt: 꿀 소리에 놀라 목소리를 시험해 보는 연이.

#### 4화 07쪽 — 컷 14·15·16

- 구도: Top: she raises a forepaw and counts with the other: the hoof has only two toes. Middle: identical paw position, the third count has nothing; she flips the paw over and back. Bottom: she looks to the sky and declares it like a report.
- 글자
  - [컷 14 대사·연이] 하나, 둘…
  - [컷 15 대사·연이] …셋이 없어.
  - [컷 16 대사·연이] 손가락 열 개에서 앞발 두 개. 명백한 다운그레이드야.
- alt: 손가락을 세어 보지만 둘에서 멈추는 앞발.

#### 4화 08쪽 — 컷 17·18

- 구도: Top: she flops down, the leaf squishing and bouncing back. Bottom: she tries to pinch her cheek but her short arm can't reach her face, paw paddling in air. Comedic timing.
- 글자
  - [컷 17 효과음] 말랑
  - [컷 17 대사·연이] 오케이. 이건 꿈이야.
  - [컷 18 대사·연이] 꼬집어야 깨는데… 안 닿아.
- alt: 주저앉아 볼을 꼬집으려 하지만 앞발이 얼굴에 닿지 않는다.

#### 4화 09쪽 — 컷 19·20

- 구도: Top: a single tarot card drifts to the leaf edge face-down (the same back design as the card that did not spin in episode 3); she leans out and reaches. Bottom: the card slides between her hooves, nothing to grip; it floats away into the fog still face-down.
- 글자
  - [컷 20 속말·연이] 집을 수가 없네.
- alt: 뒷면을 보인 카드가 떠내려오지만 앞발로는 집을 수 없다.

#### 4화 10쪽 — 컷 21·22·23

- 구도: Top: she speaks commands into the air like in a game. Middle: nothing appears; wind lifts her ear fur, her eyes narrow. Bottom: far end of the leaf, a small shadow among dew beads; the balloon arrives before the figure.
- 글자
  - [컷 21 대사·연이] 상태창. …메뉴. 인벤토리.
  - [컷 22 효과음] 휘이
  - [컷 22 대사·연이] UI 불친절하네. 별 하나.
  - [컷 23 대사·영냥이] 아직도 꿈 같나.
- alt: 허공에 상태창을 불러 보다 연잎 끝에서 낮은 목소리를 듣는다.

#### 4화 11쪽 — 컷 24·25

- 구도: Top: wide horizontal shot with the two at opposite ends of the leaf: frozen flower-pig Yeoni on this end, a palm-sized white long-haired cat on the far end with a navy crescent-moon hat and gold tassel swaying, constellation cape, purple neck jewel, violet and honey eyes, exactly two ears. Bottom: Yeoni slowly turns only her head.
- 글자
  - [컷 24 대사·영냥이] 무리도 아니지.
  - [컷 25 대사·연이] …너 뭐야.
  - [컷 25 대사·영냥이] 이 강의 담당자다.
- alt: 연잎 양 끝에 마주 앉은 꽃돼지 연이와 모자 쓴 흰 고양이.

#### 4화 12쪽 — 컷 26·27·28

- 구도: Top: Yeoni draws a hat shape in the air with her paw. Middle: she measures his size with two forepaws. Bottom: close on the cat, his whiskers twitch.
- 글자
  - [컷 26 대사·연이] 아무리 봐도 모자 쓴 고양이잖아.
  - [컷 26 대사·영냥이] 평범한 고양이는 아니다.
  - [컷 27 대사·연이] 근데 왜 이렇게 작아? 손바닥만 해.
  - [컷 28 대사·영냥이] …처음 보자마자 너무하는군.
- alt: 모자 쓴 고양이라고 놀리며 크기를 재는 연이와 수염이 꿈틀하는 고양이.

#### 4화 13쪽 — 컷 29·30

- 구도: Two panels with the cat's face at the same size: top, Yeoni points at her own body, the cat's eyelids lift first while his ears still face forward; bottom, one beat later his ears turn toward her.
- 글자
  - [컷 29 대사·연이] 나 방금 돼지 됐어. 오늘은 무례해도 돼.
  - [컷 30 대사·영냥이] …그건 인정하지.
- alt: 연이의 말에 고양이의 눈꺼풀이 먼저 들리고 귀가 늦게 돌아간다.

#### 4화 14쪽 — 컷 31

- 구도: Two-shot across the leaf: Yeoni squinting suspiciously, the cat sitting perfectly upright and dignified. Moonlit river behind.
- 글자
  - [컷 31 대사·연이] 너 NPC지?
  - [컷 31 대사·영냥이] 사주의 강을 지키는 가디언이다.
  - [컷 31 대사·연이] …설정 있는 NPC네.
- alt: NPC냐는 연이와 사주의 강을 지키는 가디언이라는 고양이.

#### 4화 15쪽 — 컷 32·33

- 구도: Top: Yeoni presses the lotus on her right ear with a forepaw, the five petals wobble. Bottom: she tilts her head, the cat nods firmly, she rolls her eyes.
- 글자
  - [컷 32 대사·연이] 아, 디테일 미쳤다.
  - [컷 32 대사·영냥이] 아픈가.
  - [컷 33 대사·연이] 안 아픈데 기분이 이상해.
  - [컷 33 대사·영냥이] 그럼 현실이다.
  - [컷 33 대사·연이] 판정 너무 대충이잖아.
- alt: 머리 위 연꽃을 눌러 보고 현실이라는 판정에 투덜대는 연이.

#### 4화 16쪽 — 컷 34

- 구도: Full-page panorama from Yeoni's point of view after following the cat's gaze: dark blue water with starlight breaking, Chinese-character glyphs swimming like fish, dim pillars beyond fog, a huge warm moon. Beautiful and slightly frightening.
- 글자
  - [컷 34 속말·연이] 예뻐서 더 무섭다.
- alt: 별빛이 부서지는 강물 속을 한자들이 물고기처럼 헤엄친다.

#### 4화 17쪽 — 컷 35·36

- 구도: Top: the two with their backs to the river, still at opposite ends of the leaf. Bottom: Yeoni points at her round belly; the cat's expression doesn't change.
- 글자
  - [컷 35 대사·연이] …여기 어디야.
  - [컷 35 대사·영냥이] 사주의 강. 사람의 운명 코드가 흐르는 곳이다.
  - [컷 36 대사·연이] 인간 아니게 됐는데.
  - [컷 36 대사·영냥이] 정확히는 꽃돼지다.
- alt: 사주의 강이라는 설명과 정확히는 꽃돼지라는 고양이.

#### 4화 18쪽 — 컷 37

- 구도: Yeoni inhales deeply, an oink escapes, and she bursts out angrily with stubby forepaws raised; the cat answers calmly from his end. Comedic anger.
- 글자
  - [컷 37 효과음] 꿀
  - [컷 37 대사·연이] 왜 하필 돼지냐고! 나 집에 갈래.
  - [컷 37 대사·영냥이] 쉽지 않다.
- alt: 왜 하필 돼지냐며 집에 가겠다고 소리치는 연이.

#### 4화 19쪽 — 컷 38·39

- 구도: Top: the cat walks across the leaf, each step glowing faintly, star-shaped marks on his pink paw pads; he stops at the middle. Bottom: when Yeoni mentions the app, the cat's face stiffens; she shuts her mouth with no comeback.
- 글자
  - [컷 38 대사·연이] 그럼 민원. 앱 하나 눌렀다고 돼지는 과하잖아.
  - [컷 38 대사·영냥이] 나름 귀엽지 않나.
  - [컷 39 대사·연이] 민원 추가. 내가 누른 건 앱이야.
  - [컷 39 대사·영냥이] 그건 문이다. 넌 문은 안 열어도 앱은 누를 테니까.
- alt: 연잎 위를 걸어오는 고양이가 앱이 아니라 문이었다고 말한다.

#### 4화 20쪽 — 컷 40

- 구도: Full-page tall, read top to bottom: a splash rocks the boat; the cat's eyes spread to gold and the crescent on his hat burns faintly; black ink spreads in the water swallowing the glowing glyphs one by one; a black hand of ink water rises gripping a triangle-kimbap wrapper showing red pork, a purple transit card with a worn corner that glints once, and a broken file icon; at the bottom Yeoni frozen at the leaf edge.
- 글자
  - [컷 40 효과음] 첨벙
  - [컷 40 대사·영냥이] 불운의 찌꺼기. 네 현실에서 새어 나온 것들이다.
  - [컷 40 대사·연이] 저거… 나한테 오는 거야?
- alt: 검은 먹물이 글자를 삼키고 교통카드를 쥔 검은 손이 연이를 향해 솟는다.

### 5화 「네 옆에 서면」 (EP.01 후반 (꽃돼지가 되었다)) — 20쪽

#### 5화 01쪽 — 컷 01·02

- 구도: Top: from behind the black hand of the previous episode, Yeongnyangi sits completely still, not a tail twitch. Bottom: tight two-shot, his calm side profile and Yeoni's exasperated face. Moonlit night river.
- 글자
  - [컷 01 대사·영냥이] 그렇다.
  - [컷 01 대사·연이] 왜.
  - [컷 02 대사·영냥이] 네가 표적이니까.
  - [컷 02 대사·연이] 그걸 왜 그렇게 차분하게 말해!
- alt: 검은 손 앞에서 꼬리 하나 움직이지 않는 영냥이와 기가 막힌 연이.

#### 5화 02쪽 — 컷 03·04

- 구도: Top: the black hand reaches over the leaf; Yeoni tries to back away but her short legs spin in place as the hand's shadow falls over her; a calm voice balloon from off-panel. Bottom: the far end of the leaf where the cat sat is empty, a single dew drop trembling.
- 글자
  - [컷 03 효과음] 파닥파닥
  - [컷 03 대사·연이] 이 몸 조작감 왜 이래!
  - [컷 03 대사·영냥이] 조작은 익숙해지면 된다.
- alt: 헛도는 짧은 다리와 어느새 비어 있는 영냥이의 자리.

#### 5화 03쪽 — 컷 05·06·07

- 구도: Top: one gold line slashes across the whole panel. Middle: the black hand split in two, ink droplets frozen in mid-air like beads, the half holding the transit card sinking. Bottom: Yeongnyangi lands at the leaf edge, palm-sized, and only now the ink drops fall. Stillness before and after the motion; no mid-action body drawn.
- 글자
  - [컷 05 효과음] 촤악
  - [컷 07 효과음] 후드득
- alt: 금빛 선 하나가 검은 손을 가르고 영냥이가 조용히 착지한다.

#### 5화 04쪽 — 컷 08·09

- 구도: Top: Yeoni's mouth round with awe; Yeongnyangi does not turn around. Bottom: Yeoni props her chin on a forepaw, thinking very seriously.
- 글자
  - [컷 08 대사·연이] …오.
  - [컷 08 대사·영냥이] 이제 그냥 고양이라고 부르지 마라.
  - [컷 09 대사·연이] …전투 고양이?
- alt: 감탄한 연이가 전투 고양이라는 이름을 떠올린다.

#### 5화 05쪽 — 컷 10·11

- 구도: Top: Yeongnyangi's eyes narrow, but his forepaw is already extended toward her, ready to pull her from the ink-wet leaf edge, before the balloon. Bottom: Yeoni takes his paw with her hoof and steps inward; their first touch.
- 글자
  - [컷 10 대사·영냥이] 수호자는 자기 이름을 말하지 않는다. 규칙이다.
  - [컷 11 대사·영냥이] 아무렇게나 불러라.
- alt: 말보다 먼저 내밀어진 영냥이의 앞발을 연이가 잡는다.

#### 5화 06쪽 — 컷 12·13·14

- 구도: Top: Yeoni shakes the paw she's holding and grins as she names him. Middle: Yeongnyangi's eyelids lift first and his tail tip stops dead. Bottom: one beat later his ears turn toward her and he slips his paw away. Keep his expression almost unchanged.
- 글자
  - [컷 12 대사·연이] 그럼 영냥이. 영험한 냥이니까.
  - [컷 12 대사·연이] 작명 센스는 별 하나 걸게.
  - [컷 14 대사·영냥이] …좋을 대로.
- alt: 영냥이라는 이름을 받은 고양이의 꼬리 끝이 멈춘다.

#### 5화 07쪽 — 컷 15·16

- 구도: Top: split view, underwater the cut hands melt and regather thicker; above, Yeongnyangi taps the leaf and clear water droplets rise around the rim like a small shield. Bottom: black claws scrape the shield; Yeoni folds her ears flat.
- 글자
  - [컷 15 효과음] 꾸르륵
  - [컷 15 효과음] 툭
  - [컷 16 효과음] 끼이이익
  - [컷 16 대사·연이] …소리 최악.
- alt: 다시 뭉친 검은 손이 영냥이의 물방울 방패를 긁는다.

#### 5화 08쪽 — 컷 17·18

- 구도: Top: the shield trembles with each scrape; Yeongnyangi points his chin at the lotus on her head. Bottom: Yeoni touches the lotus, it glows faint warm pink.
- 글자
  - [컷 17 대사·영냥이] 오래는 못 버틴다.
  - [컷 17 대사·연이] 그럼 어떡해.
  - [컷 17 대사·영냥이] 네 머리 위 꽃은 살아 있다.
  - [컷 18 대사·연이] 이건 뭐야.
  - [컷 18 대사·영냥이] 너를 나타내는 중심 글자. 일간의 흔적이다.
- alt: 연이가 머리 위 연꽃을 만지자 따뜻하게 빛난다.

#### 5화 09쪽 — 컷 19

- 구도: Yeoni nods with a give-up face, Yeongnyangi deadpan; a lecture-hall joke energy. Medium two-shot on the leaf, shield shimmering behind.
- 글자
  - [컷 19 대사·연이] 좋아. 꽃이 배터리라고 치자.
  - [컷 19 대사·영냥이] 비슷하지 않다.
  - [컷 19 대사·연이] 너 설명하는 거, 교양 필수 교수님 같아.
- alt: 꽃을 배터리라고 치자는 연이와 교수님 같은 영냥이.

#### 5화 10쪽 — 컷 20

- 구도: Full-page: across the river, four lights rise in the fog: a sharp blue light, a flickering warm firelight, a flashing gold light, a soft light like an old bookshelf. Two small figures on the leaf seen from behind.
- 글자
  - [컷 20 대사·영냥이] 네 글자가 네 군데로 흩어졌다. 저 빛 하나하나가 네 것이다.
- alt: 안개 너머로 연이의 글자 네 개가 네 가지 빛으로 떠오른다.

#### 5화 11쪽 — 컷 21·22

- 구도: Top: Yeoni points at the lights one by one as if counting. Bottom: she suddenly raises a forepaw with an objection; Yeongnyangi unmoved.
- 글자
  - [컷 21 대사·연이] 저걸 다 모아야 집에 간다는 거지.
  - [컷 21 대사·영냥이] 그렇다.
  - [컷 22 대사·연이] 잠깐. 나 약관 동의한 적 없는데.
  - [컷 22 대사·영냥이] 동의 절차는 없다.
- alt: 빛을 다 모아야 집에 간다는 말에 약관 동의를 따지는 연이.

#### 5화 12쪽 — 컷 23·24

- 구도: Top: four small equal panels in a grid alternating Yeoni's questions and Yeongnyangi's identical deadpan face. Bottom: Yeoni asks without hope, Yeongnyangi glances away for a split second and back.
- 글자
  - [컷 23 대사·연이] 환불은.
  - [컷 23 대사·영냥이] 없다.
  - [컷 23 대사·연이] 문의 게시판은.
  - [컷 23 대사·영냥이] 없다.
  - [컷 24 대사·연이] 고객센터는.
  - [컷 24 대사·영냥이] …나름 내가 있다.
- alt: 환불도 게시판도 없고 고객센터는 영냥이뿐이다.

#### 5화 13쪽 — 컷 25·26

- 구도: Top: Yeoni's face hardens, Yeongnyangi's mouth corner rises very slightly. Bottom: the shield shatters at its center and a black hand punches through, a worn-corner purple transit card between its fingers.
- 글자
  - [컷 25 대사·연이] 최악의 고객센터네.
  - [컷 25 대사·영냥이] 별점도 접수하지 않는다.
  - [컷 26 효과음] 퍽
- alt: 최악의 고객센터라는 말 뒤로 교통카드를 쥔 손이 방패를 뚫는다.

#### 5화 14쪽 — 컷 27·28

- 구도: Top: Yeoni squeals and immediately covers her mouth, embarrassed. Bottom: Yeongnyangi steps in front of her; one forepaw reaches back toward her before he speaks.
- 글자
  - [컷 27 대사·연이] 꿀악!
  - [컷 27 대사·연이] …놀라서 그런 거야.
  - [컷 27 대사·영냥이] 알고 있다.
  - [컷 28 대사·영냥이] 내 뒤로. 숨어 있어라.
- alt: 놀란 연이 앞으로 나서며 뒤로 앞발을 뻗는 영냥이.

#### 5화 15쪽 — 컷 29·30

- 구도: Top: Yeoni half-crouches behind him then stops; close on the card's worn corner glinting between black fingers, grey memory sound lettering overlaid. Bottom: Yeoni's eyes narrow, first time with no trace of a smile.
- 글자
  - [컷 29 효과음] 삑
  - [컷 29 효과음] 카드를 다시 대주세요.
  - [컷 30 대사·연이] …아니. 저건 내 민원이야.
- alt: 닳은 카드 모서리를 본 연이가 저건 내 민원이라고 말한다.

#### 5화 16쪽 — 컷 31·32

- 구도: Top: Yeoni steps out from behind him to his side, her short legs trembling. Bottom: big panel, frontal low eye-level: Yeoni and Yeongnyangi side by side facing the same hand, two gazes at the same height in one frame for the first time.
- 글자: 없음(무음)
- alt: 연이가 영냥이의 등 뒤에서 옆으로 나와 같은 높이에서 손을 본다.

#### 5화 17쪽 — 컷 33·34

- 구도: Top: Yeoni raises a forepaw and shouts, voice steady. Bottom: the lotus flares bright pink, light seeps between black fingers, the card melts like candle wax and the hand unravels into ink; a clean system box with the review appears.
- 글자
  - [컷 33 대사·연이] 교통카드, 별 하나!
  - [컷 33 대사·연이] 사유, 네 번 만에 인식. 재구매 의사 없음!
  - [컷 34 화면] 민원 처리 완료 · 교통카드 · ★☆☆☆☆
  - [컷 34 효과음] 주르륵
- alt: 연이의 별 하나 민원에 교통카드가 녹아내리고 민원 처리 완료가 뜬다.

#### 5화 18쪽 — 컷 35·36

- 구도: Top: Yeongnyangi looks at Yeoni, not the hand; Yeoni pats her lotus: among the five front petals the outermost lower petal is bleached paper-white. Bottom: two faces with the white petal between them; his forepaw settles beside hers before his words.
- 글자
  - [컷 35 대사·영냥이] …방금 그거, 네가 한 거다.
  - [컷 35 대사·연이] 잠깐, 이거 원래 이랬어?
  - [컷 36 대사·영냥이] 네 빛을 꺼내 쓴 값이다. 쉽게 안 돌아온다.
  - [컷 36 대사·연이] …환불은 없다며.
  - [컷 36 대사·영냥이] 없다. 그러니 아껴 써라.
- alt: 꽃잎 하나가 하얗게 바랜 것을 알게 된 연이와 값을 말하는 영냥이.

#### 5화 19쪽 — 컷 37·38

- 구도: Top: Yeongnyangi leaps, body low, his back to Yeoni facing the river; gold patterns on his claws release a starlight blade slicing all remaining hands at once (no heroic arms-spread pose). Bottom: the river parts like a road and the boat surges forward; he lands and speaks low toward the fog, half-profile in shadow, small lettering.
- 글자
  - [컷 37 효과음] 사악
  - [컷 38 대사·영냥이] …놓치지 않는다.
- alt: 별빛 칼날로 남은 손을 벤 영냥이가 안개를 보며 낮게 말한다.

#### 5화 20쪽 — 컷 39

- 구도: Full-page tall: an island in fog ringed by countless floating mirror shards; in a near shard, a human hand in a cream blouse sleeve with a small floral print (the edge of a knit vest just visible) waves toward this side (face and body cut off by the shard edge); at the bottom, two small figures on the leaf look at the same shard.
- 글자: 없음(무음)
- alt: 섬 둘레 거울 조각 하나에서 잔꽃 블라우스 소매의 사람 손이 이쪽으로 손을 흔든다.

### 6화 「이름을 묻지 않는 사이」 (EP.01A (이름 없는 검은 호랑이)) — 19쪽

#### 6화 01쪽 — 컷 01·02·03

- 구도: Top: the lotus boat heading toward the sharp blue light snags on reeds before the island; Yeongnyangi presses the current with a paw, mirror shards clink around. Middle: Yeoni's pig ears perk up at a tiny teeth-grinding sound. Bottom: peering under the reeds, two red dots appear in a black lump. Moonlight, blue glow from the island.
- 글자
  - [컷 01 효과음] 사각사각
  - [컷 01 효과음] 챙
  - [컷 02 효과음] 빠득
  - [컷 02 속말·연이] 누가 울음 참나?
  - [컷 03 대사·연이] 저기 검은 솜뭉치가… 아니, 눈이 있어.
- alt: 갈대에 걸린 배와 갈대 밑에서 뜨는 붉은 두 눈.

#### 6화 02쪽 — 컷 04

- 구도: Full-page reveal: a black tiger cub caught in the reeds, small cape trimmed with gold thread, wet fur, vivid red eyes, a red forehead mark like a wound, striped tail; a thin black thread-like ring around its RIGHT forepaw. Proud but trembling.
- 글자: 없음(무음)
- alt: 금실 망토를 두른 검은 새끼 호랑이의 오른 앞발에 검은 고리가 감겨 있다.

#### 6화 03쪽 — 컷 05·06

- 구도: Top: the tiger lifts its chin and speaks slowly while its paw trembles. Bottom: Yeoni points at the shaking paw.
- 글자
  - [컷 05 대사·호랑이] 구경 끝나셨으면 가세요, 손님.
  - [컷 05 대사·호랑이] 그리고 솜뭉치 아니에요.
  - [컷 06 대사·연이] 말도 하네. 그럼 도와 달라고 해.
  - [컷 06 대사·연이] 발이 그렇게 떨리는데.
- alt: 가라는 호랑이와 도와 달라고 하라는 연이.

#### 6화 04쪽 — 컷 07·08

- 구도: Top: as Yeoni reaches out a hoof, Yeongnyangi's forepaw blocks in front of it first; his balloon sits behind the paw. Bottom: close-up of the black ring; Yeongnyangi's eyelids lift first, then his ears flatten a beat later.
- 글자
  - [컷 07 대사·영냥이] 손대지 마. 덫이 아니다.
  - [컷 08 대사·영냥이] 주인 찾는 고리다. 이름을 묻고, 대답하면 묶인다.
- alt: 연이의 앞발을 먼저 막고 이름을 묻는 고리라고 경고하는 영냥이.

#### 6화 05쪽 — 컷 09·10

- 구도: Top: the ring tightens a little with each breath the tiger takes. Bottom: Yeoni looks from the ring to the blue light ahead and back, and decides.
- 글자
  - [컷 09 효과음] 지익
  - [컷 10 대사·연이] 이름만 안 말하면 되지? 영냥아, 배만 잡아 줘.
  - [컷 10 대사·연이] 어려운 얘기는 나중에. 나도 무서우니까.
- alt: 숨 쉴 때마다 조이는 고리를 보고 돕기로 하는 연이.

#### 6화 06쪽 — 컷 11·12·13

- 구도: Top: Yeoni bites a dry leaf stalk and wedges it between ring and fur; black water spurts. Middle: the tiger's reflex swipe stops at her nose, claw tip grazing; the stalk snaps. Bottom: the tiger pulls its wet cape close and looks up, cool and slow.
- 글자
  - [컷 11 효과음] 푸슉
  - [컷 12 효과음] 뚝
  - [컷 13 대사·호랑이] 그만하세요. 제 몸도 마음대로 못 쓰시면서.
  - [컷 13 대사·호랑이] 다치시면 그 값, 저한테 물리실 건가요?
- alt: 잎자루로 고리를 벌리다 부러지고 호랑이는 값을 따진다.

#### 6화 07쪽 — 컷 14·15

- 구도: Top: Yeoni with a scratch on her nose puffs her cheeks. Bottom: she slaps the leaf with a forepaw, serious yet funny.
- 글자
  - [컷 14 대사·연이] 아프면 아프다고 해.
  - [컷 14 대사·연이] 자꾸 가격표 붙이지 말고.
  - [컷 15 대사·연이] 나 삼각김밥 떨어뜨린 날도 이렇게 오래 협상 안 했어.
- alt: 코에 생채기가 난 연이가 가격표 붙이지 말라고 한다.

#### 6화 08쪽 — 컷 16·17·18

- 구도: Top: gold gathers at Yeongnyangi's claw tip; a faint dotted line shows the cut would cross the tiger's paw; he withdraws the light. Middle: he presses the leaf at a slant, the current turns, the ring slackens for a moment. Bottom: paw still on the leaf, he looks at Yeoni.
- 글자
  - [컷 17 대사·영냥이] 지금. 당기지 말고 밀어라.
  - [컷 18 대사·영냥이] 고리를 빼는 게 아니다. 발이 빠질 틈을 만드는 거다.
- alt: 빛을 거둔 영냥이가 물살을 바꾸며 당기지 말고 밀라고 한다.

#### 6화 09쪽 — 컷 19·20·21

- 구도: Top: Yeoni pushes the tiger's shoulder with her forehead, the white petal visible. Middle: both tumble onto the wet leaf. Bottom: the ring left in the water bites empty air three times and bursts into black bubbles.
- 글자
  - [컷 19 효과음] 꾹
  - [컷 20 효과음] 데구루루
  - [컷 21 효과음] 딱, 딱, 딱
  - [컷 21 효과음] 퐁
- alt: 연이가 이마로 밀어 둘이 구르고 빈 고리는 물거품으로 터진다.

#### 6화 10쪽 — 컷 22·23·24

- 구도: Top: the tiger sprawled on the leaf lifts only its head. Middle: it raises its chin and tugs its cape, red eyes flicking to Yeongnyangi. Bottom: Yeoni gets up rubbing her nose.
- 글자
  - [컷 22 대사·호랑이] 왜 손님 몸으로 미세요?
  - [컷 22 대사·호랑이] 고양이 씨한테 시키셨으면 됐잖아요.
  - [컷 23 대사·호랑이] 명령할 힘은 그렇게 쓰는 거예요.
  - [컷 24 대사·연이] 친구한테 부탁하는 걸 왜 명령이라고 해.
  - [컷 24 대사·연이] 돼지 이마는 쓸모 있네. 코는 쓸모없게 아프고.
- alt: 왜 손님 몸으로 미냐는 호랑이와 친구한테 부탁한 거라는 연이.

#### 6화 11쪽 — 컷 25·26·27

- 구도: Top: the tiger watches the scratch on Yeoni's nose; its tail tip ticks once each time she winces, as if counting. Middle: its red eyes rise to the white petal on her lotus and linger. Bottom: close-up of the tiger, only its mouth corners lift.
- 글자
  - [컷 25 효과음] 까딱
  - [컷 27 대사·호랑이] 그 한 장은 벌써 값을 치른 자리네요.
  - [컷 27 대사·호랑이] 어디서 먼저 계산하고 오셨나 봐요.
- alt: 연이의 표정을 세는 꼬리와 흰 꽃잎에 머무는 붉은 눈.

#### 6화 12쪽 — 컷 28·29

- 구도: Top: the tiger straightens up, smoothing its cape, formal. Bottom: Yeoni wrinkles her nose and scratches her head with a forepaw.
- 글자
  - [컷 28 대사·호랑이] 원하시는 걸 말씀하세요. 길이든 물건이든.
  - [컷 28 대사·호랑이] 빚은 남겨 두면 불어나요.
  - [컷 29 대사·연이] 안 다쳤으면 됐어. 굳이 받자면… 이름?
  - [컷 29 대사·연이] 호랑이라고 부르면 화낼 것 같아서.
- alt: 빚은 불어난다는 호랑이에게 이름 하나만 묻는 연이.

#### 6화 13쪽 — 컷 30·31

- 구도: Top: the tiger answers; in the background Yeongnyangi's one ear turns slightly away (small, subtle). Bottom: the tiger turns its head aside, Yeoni smiles easily.
- 글자
  - [컷 30 대사·호랑이] 이름은 함부로 드리는 게 아니에요.
  - [컷 30 대사·호랑이] 쥔 쪽이 어디서든 부를 수 있으니까요.
  - [컷 31 대사·호랑이] 부르면 가야 하는 삶은 별로거든요.
  - [컷 31 대사·연이] 그럼 그냥 호랑이라고 부를게.
  - [컷 31 대사·연이] 이름 몰라도 도울 수는 있잖아.
- alt: 이름은 함부로 주지 않는다는 호랑이와 그냥 호랑이라고 부르겠다는 연이.

#### 6화 14쪽 — 컷 32·33

- 구도: Top: the tiger's tail stops; a water drop from the gold trim crawls toward the tiger instead of rolling to the river; Yeongnyangi's eyelids lift as he sees it. Bottom: his ears turn a beat later and he sets his forepaw on the leaf exactly between Yeoni and the tiger.
- 글자
  - [컷 33 대사·영냥이] 선착장까지만 같이 간다. 누가 보냈는지는 안 묻지.
  - [컷 33 대사·영냥이] 너도 이 아이 이름은 묻지 마라.
- alt: 연이와 호랑이 사이 한가운데에 앞발을 놓는 영냥이.

#### 6화 15쪽 — 컷 34·35

- 구도: Top: the tiger looks down at Yeongnyangi's paw and curls its tail. Bottom: Yeoni laughs pointing at Yeongnyangi; the tiger's ears prick up indignantly.
- 글자
  - [컷 34 대사·호랑이] 고양이 씨는 원래 이렇게 무뚝뚝하세요?
  - [컷 34 대사·호랑이] 발 하나 빼 주시고 울타리부터 치시네요.
  - [컷 35 대사·연이] 얘도 고양이라고 하면 엄청 싫어해. 너도 작다고 하면 싫어?
  - [컷 35 대사·호랑이] 작다는 말은 빼 주세요. 망토까지 합치면 안 작아요.
- alt: 울타리를 친다는 호랑이와 작다는 말은 빼 달라는 호랑이.

#### 6화 16쪽 — 컷 36·37

- 구도: Top: Yeoni laughs aloud; the tiger doesn't laugh, lowers its ears and hides the reddened inner ear with its cape, tail tip ticking. Bottom: the tiger holds out a cape edge to Yeoni; one black thread inside the gold trim creeps into the cloth and stops when Yeongnyangi turns his head.
- 글자
  - [컷 36 효과음] 까딱
  - [컷 36 대사·연이] 저기 마른 데 앉아. 망토 물 먹어서 무겁겠다.
  - [컷 37 대사·호랑이] 코에 대세요.
  - [컷 37 대사·호랑이] 드린 건 아니니까 착각은 마시고요.
  - [컷 37 대사·연이] 알았어, 빌리는 거.
- alt: 귀를 망토로 가리는 호랑이가 코에 대라며 망토 끝을 내민다.

#### 6화 17쪽 — 컷 38

- 구도: An island bell rings; at the first toll the tiger leaps off the boat; its hurt paw never touches water as the black surface hardens into a narrow path under each step; it crosses without looking back. Wide shot.
- 글자
  - [컷 38 효과음] 댕
- alt: 종소리에 뛰어내린 호랑이가 단단해진 수면 위 길을 건너간다.

#### 6화 18쪽 — 컷 39

- 구도: Yeongnyangi rests his forepaw on Yeoni's hoof for a moment before speaking; Yeoni places a red cape thread from her nose onto her forepaw. Close two-shot, soft moonlight.
- 글자
  - [컷 39 대사·영냥이] 저 발자국은 따라가지 마라.
  - [컷 39 대사·연이] 아픈 얼굴은 진짜 같았는데.
  - [컷 39 대사·영냥이] 아픈 건 진짜여도 속셈은 따로 있을 수 있다. 둘 다 봐라.
  - [컷 39 대사·영냥이] 그렇다고 네가 도운 일이 틀린 건 아니다.
- alt: 앞발을 먼저 얹고 둘 다 보라고 말하는 영냥이와 붉은 실오라기를 든 연이.

#### 6화 19쪽 — 컷 40

- 구도: Beyond the fog the tiger looks back, smile gone, only two red eyes over the water; below the surface the cut black thread end sinks and a faint line of glyphs fades silently (unreadable strokes); Yeoni does not see it, looking only at the thread on her paw. Long empty space below.
- 글자
  - [컷 40 대사·호랑이] 다친 걸 보면 멈추시는군요.
  - [컷 40 대사·호랑이] 다음엔 그 고양이 없는 쪽으로 오세요.
- alt: 안개 너머에서 돌아본 호랑이와 물속에서 소리 없이 지워지는 글자 한 줄.

### 7화 「거울에 먼저 비친 쪽」 (EP.02 도입 (모자 쓴 고양이? 영냥이)) — 17쪽

#### 7화 01쪽 — 컷 01·02

- 구도: Top: the lotus boat touches a dock of black glass with a small sound. Bottom: behind, the pursuing black hands stop dead at the island fog and sink under the river. Cold blue island light with moonlight.
- 글자
  - [컷 01 효과음] 툭
- alt: 비겁의 섬 선착장에 닿는 연잎 배와 안개 앞에서 가라앉는 검은 손.

#### 7화 02쪽 — 컷 03·04

- 구도: Top: Yeoni grips the leaf rim, catching her breath, forepaws tense; a tiny oink. Bottom: she clamps her mouth with a forepaw and shakes her head.
- 글자
  - [컷 03 대사·연이] 살았다……
  - [컷 03 효과음] 꿀
  - [컷 04 대사·연이] 방금 건 숨소리야. 돼지 소리 아님.
- alt: 살았다며 숨을 고르다 꿀 소리에 입을 막는 연이.

#### 7화 03쪽 — 컷 05·06·07

- 구도: Top: Yeoni turns and points back at the mirror shards in the fog. Middle: she lowers her voice; Yeongnyangi's eyelids lift first. Bottom: his ears turn toward her a beat later.
- 글자
  - [컷 05 대사·연이] 영냥아. 아까 거울에서 누가 손 흔들었어. 사람 손으로.
  - [컷 05 대사·영냥이] 봤다.
  - [컷 06 대사·연이] …나였어. 사람이던 나.
  - [컷 07 대사·영냥이] 그러니 조심해라. 여긴 비겁의 섬이다.
- alt: 거울 속 손이 사람이던 자기였다고 말하는 연이.

#### 7화 04쪽 — 컷 08·09·10

- 구도: Top: Yeoni raises a forepaw; Yeongnyangi answers looking at the island. Middle: Yeoni tilts her head. Bottom: Yeoni holds up a hoof like a thumbs-up, rating him.
- 글자
  - [컷 08 대사·연이] 비겁이 뭔데. 짧게.
  - [컷 08 대사·영냥이] 너랑 같은 편에 선 것들. 친구, 경쟁자, 자존심.
  - [컷 09 대사·연이] 같은 편인데 왜 싸워?
  - [컷 09 대사·영냥이] 같은 자리를 원하니까.
  - [컷 10 대사·연이] …진짜 짧네. 별 네 개.
- alt: 비겁이 뭐냐는 질문에 한 줄로 답하는 영냥이와 별 네 개.

#### 7화 05쪽 — 컷 11·12·13

- 구도: Top: Yeongnyangi hops lightly onto the dock, golden paw prints blooming and fading on black glass. Middle: Yeoni peers at the vanishing prints; he looks back. Bottom: Yeoni clasps two forepaws, pleading theatrically.
- 글자
  - [컷 11 효과음] 사뿐
  - [컷 12 대사·연이] 와, 효과음만 깔면 완전 게임인데.
  - [컷 12 대사·영냥이] 아직도 게임이라고 생각하나.
  - [컷 13 대사·연이] 로딩 화면 한 번만 뜨면 바로 인정할게.
- alt: 금빛 발자국을 보며 아직 게임 같다는 연이.

#### 7화 06쪽 — 컷 14·15

- 구도: Top: Yeoni points at his hat, his whiskers twitch. Bottom: Yeongnyangi raises a forepaw showing the star mark on his pad glowing gold, a mock threat.
- 글자
  - [컷 14 대사·연이] 근데 너 정체가 뭐야? 모자 쓴 고양이? 코스프레하는 고양이?
  - [컷 14 대사·영냥이] …평범한 고양이는 아니다.
  - [컷 15 대사·연이] 근데 자꾸 고양이처럼 보인단 말이지.
  - [컷 15 대사·영냥이] 한 번만 더 하면 그 발자국을 네 이마에 남겨 주지.
- alt: 고양이라고 놀리는 연이와 이마에 발자국을 남기겠다는 영냥이.

#### 7화 07쪽 — 컷 16·17·18

- 구도: Top: Yeoni steps down onto the dock front paws first, mid-move with the hind legs. Middle: her short legs fail and her body tips forward. Bottom: she plants her snout flat on the dock. Slapstick timing.
- 글자
  - [컷 16 대사·연이] 네네, 모자 멋진 고양이님.
  - [컷 17 대사·연이] 어, 어어?
  - [컷 18 효과음] 퍽
- alt: 연잎에서 내리다 코부터 선착장에 박는 연이.

#### 7화 08쪽 — 컷 19·20·21

- 구도: Top: Yeoni face-down; Yeongnyangi's forepaw is already held out in front of her snout while he looks elsewhere. Middle: she takes the paw and stands, nose tip red. Bottom: she protests pointing at the air, an oink leaking at the end.
- 글자
  - [컷 19 대사·영냥이] 착지는…
  - [컷 20 대사·영냥이] 연습이 좀 필요하겠군.
  - [컷 20 대사·연이] 분석하지 마.
  - [컷 21 대사·연이] 이런 건 튜토리얼부터 주는 거 아냐? 세이브도, 환불 버튼도 없고.
  - [컷 21 효과음] 꿀
- alt: 말보다 먼저 내민 앞발을 잡고 일어나 튜토리얼을 따지는 연이.

#### 7화 09쪽 — 컷 22

- 구도: Full-page establishing shot of the Island of Rivals: no grass, no houses, a floor shining like black glass, mirrors of every size from palm to door floating at different angles, reflecting sky, river, the lotus boat and Yeoni. Cold glassy light under the moon.
- 글자: 없음(무음)
- alt: 거울 조각이 저마다 다른 각도로 떠 있는 비겁의 섬 전경.

#### 7화 10쪽 — 컷 23·24·25

- 구도: Top: a flower pig in a nearby mirror, the white petal still in the same place (mirror-reversed). Middle: Yeoni raises a paw and the reflection does too, both tilt their heads. Bottom: the reflection mouths silently; Yeoni twists and her tail wags with it.
- 글자
  - [컷 23 대사·연이] 아직도 적응이 안 돼.
  - [컷 23 대사·연이] 볼살은 또 언제 붙었어.
  - [컷 24 대사·연이] 야. 따라 하지 마.
  - [컷 25 대사·연이] 딱 한 번만 삐끗해 봐. 렉 걸리면 가짜로 인정해 줄게.
- alt: 거울 속 꽃돼지에게 따라 하지 말라는 연이.

#### 7화 11쪽 — 컷 26·27

- 구도: Top: Yeoni plops down in front of the mirror complaining; Yeongnyangi puzzled. Bottom: Yeoni presses her cheek in the mirror; Yeongnyangi adjusts his hat brim with dignity.
- 글자
  - [컷 26 대사·연이] 나 원래 걸크러시가 추구미인데.
  - [컷 26 대사·연이] 장르가 힐링 동물상으로 갈아엎어졌어.
  - [컷 26 대사·영냥이] …좋다는 건지 싫다는 건지.
  - [컷 27 대사·연이] 넌 몰라. 외모 장르가 통째로 바뀐 심정.
  - [컷 27 대사·영냥이] 나는 태어날 때부터 완성형이었다.
- alt: 외모 장르가 바뀌었다는 연이와 태어날 때부터 완성형이라는 영냥이.

#### 7화 12쪽 — 컷 28·29·30

- 구도: Top: Yeoni turns her head away and leaves the mirror. Middle: near the floor by her feet, a palm-sized shard shows a room floor with one white sock and one grey striped sock lying apart. Bottom: Yeongnyangi looks down at the shard, eyelids first, ears later; Yeoni answers proudly.
- 글자
  - [컷 28 대사·연이] 아, 예. 그러셔.
  - [컷 28 대사·연이] 동행 고양이 성격 별 두 개. 모자 예쁘니까 반 개 추가.
  - [컷 29 대사·연이] 어? 저거 내 양말.
  - [컷 30 대사·영냥이] 짝이 안 맞는군.
  - [컷 30 대사·연이] 둘 다 내 거니까 맞는 거야.
- alt: 바닥 가까운 거울 조각에 비친 짝 안 맞는 양말 두 짝.

#### 7화 13쪽 — 컷 31·32

- 구도: Top: deeper into the island the shards grow dense; Yeoni stops before a tall mirror that does not reflect the flower pig. Bottom: inside that mirror, Yeoni's room seen from the foot of the bed exactly as the master room view: window LEFT, desk RIGHT, wooden bed with one corner of the headboard broken off, a charging cable thrown on the bed, a phone glowing on the pillow; only a white glare streak where a person would sit.
- 글자: 없음(무음)
- alt: 꽃돼지를 비추지 않는 거울 속에 연이의 빈 방이 보인다.

#### 7화 14쪽 — 컷 33·34

- 구도: Top: Yeoni walks up and places a forepaw on the cold glass. Bottom: close-up of the short forepaw against the glass with the room behind it; small voice.
- 글자
  - [컷 33 효과음] 탁, 탁
  - [컷 33 대사·연이] …내 방이다.
  - [컷 34 대사·연이] 집에 가고 싶다.
  - [컷 34 대사·연이] 내 방으로. 내 침대로. 내 손가락으로.
- alt: 거울에 앞발을 대고 집에 가고 싶다고 말하는 연이.

#### 7화 15쪽 — 컷 35·36

- 구도: Top: Yeoni calls without turning, paw still on the glass; Yeongnyangi steps up right behind her. Bottom: he stands beside her, serious face toward the mirror.
- 글자
  - [컷 35 대사·연이] …영냥아.
  - [컷 35 대사·영냥이] 듣고 있어. 계속해.
  - [컷 35 대사·연이] 저기로 들어가면 돌아갈 수 있어?
  - [컷 36 대사·영냥이] 아니다. 이 섬의 거울은 출구가 아니다.
  - [컷 36 대사·영냥이] 네가 놓고 온 자리만 비춘다.
- alt: 거울은 출구가 아니고 놓고 온 자리만 비춘다는 영냥이.

#### 7화 16쪽 — 컷 37

- 구도: As Yeoni slowly lifts her paw off, inside the mirror the duvet sinks as if someone sat down and the phone on the pillow rises up out of frame; Yeoni in front of the mirror has not moved. No human body drawn.
- 글자: 없음(무음)
- alt: 연이는 가만히 있는데 거울 속 이불이 꺼지고 휴대폰이 들려 올라간다.

#### 7화 17쪽 — 컷 38·39

- 구도: Top: Yeoni's frozen face, Yeongnyangi's ears flattening beside her; a speech balloon with its tail pointing into the glass. Bottom: only the mirror surface and two small shadows in front of it; the same voice again; long empty space below.
- 글자
  - [컷 38 대사·거울 속 목소리] 늦었네.
  - [컷 39 대사·거울 속 목소리] 너, 항상 늦잖아.
- alt: 거울 쪽에서 늦었네, 너 항상 늦잖아라는 목소리가 들린다.


## 2부. 4~7화 글콘티

> 기준: `docs/design/yeoni-novel-webtoon-plan-20261113.md`(사용자 원문)의 「다음 원고」 가안과 원작 `content/novel/episodes.source.json` EP.01·EP.01A·EP.02. 원작의 사건 순서를 지키고, 비는 개연성은 동작과 복선으로 채웠다.
> 형식은 기획서 프롤로그와 같다. `컷 NN 화면 묘사 — 대사/소리`. 한 컷에 여러 말이 있으면 ` / `로 나눈다. 대사는 그림에 그대로 레터링되므로 짧게 썼다.
> 영냥이는 5화에서 연이가 이름을 붙이기 전까지 극 중에서 이름이 없다. 콘티의 화자 표기 「영냥이」는 제작용이다.

### 공통 작화·연출 규칙 (4~7화)

- 꽃돼지 연이: 큰 연꽃은 **인물 자신의 오른쪽 귀**. 정면에 읽히는 큰 꽃잎 다섯 장. 5화 35컷부터 **가장 바깥 아래쪽 잎(얼굴에서 가장 먼 아랫잎) 한 장**이 종이처럼 희다. 6·7화도 같은 자리의 같은 잎만 흰색. 대답하기 전 상대 표정을 먼저 살핀다.
- 영냥이: 흰 장모, 남보라·꿀빛 두 눈, 남색 초승달 모자와 금색 술, 별자리 망토, 보라색 목 보석, 귀는 정확히 2개. 무뚝뚝한 말을 끝내기 전에 **앞발이 먼저** 나간다. 상대를 살필 때 **눈꺼풀이 먼저 들리고 귀가 한 박자 늦게** 돌아간다. 위력은 동작 앞뒤의 정적으로 보인다. 팔 벌리고 고개 젖히는 과시 포즈 금지.
- 정체(네오)는 다시 읽어야 보이는 행동 단서로만 둔다. 확신을 주는 대사·내레이션 금지.
- 인간 연이는 5화 39컷 거울 조각 속 **손**으로만 나온다. 7화 거울은 빈 방과 목소리만 보인다.
- 검은 새끼 호랑이: 붉은 눈, 이마의 붉은 문양, 금실 두른 작은 망토, 줄무늬 꼬리, 오른 앞발의 실 같은 검은 고리. 이름을 주지 않는다. 느리고 우아한 존댓말, 연이를 「손님」, 영냥이를 「고양이 씨」로 부른다.
- 빛: 강의 세계는 깊은 남색 밤, 큰 달빛, 별빛 부서지는 검푸른 물. 영냥이의 힘은 금빛, 연이의 꽃은 따뜻한 분홍빛, 검은 손은 먹빛.
- 별점은 연이만 쓴다. 회당 1~2번.

---

### 4화 손가락을 세어 보려다가 (원작 EP.01 전반)

로그라인: 꽃돼지가 된 연이는 손가락 대신 목소리부터 확인하고, 연잎 끝의 모자 쓴 고양이와 말싸움을 하다가 강물 속 글자에 번지는 먹빛을 본다.

#### 컷 1부터 10 연잎 위에서 뜬 눈

3화의 남색 여백에서 그대로 이어 받는다. 몸이 바뀌는 순간은 빛 속 실루엣만 보인다.

- 컷 01 3화 38컷과 같은 깊은 남색. 위에서 가는 빛 실이 내려와 웅크린 작은 실루엣을 감싼다. 끊겼던 흰 말풍선의 뒷말이 이어진다. — 연이 …없거든!
- 컷 02 빛 속 실루엣만. 팔이 짧아지고 손끝이 뭉툭하게 오므라든다. 세부는 빛에 묻힌다. — 효과 스르르
- 컷 03 세로 큰 컷. 밤하늘 같은 강 위, 원룸 침대보다 넓은 연잎 배 한가운데 작은 분홍 몸 하나. 노도 돛도 없다. 가장자리 이슬이 조명처럼 맺혀 있다. — 무음
- 컷 04 근접. 꽃돼지 연이의 눈꺼풀이 떨리다 뜨인다. 눈동자에 큰 달이 비친다. — 무음
- 컷 05 눈을 비비려고 들어 올린 손이 화면 아래에서 들어온다. 짧은 분홍 앞발이다. 연이의 눈이 거기서 멎는다. — 무음
- 컷 06 강을 넓게. 연잎 위 작은 몸에서 비명이 강 위로 길게 퍼진다. 물속 글자들이 놀란 물고기처럼 흩어진다. — 연이 나 돼지 됐잖아아아!
- 컷 07 비명 끝이 뚝 끊긴다. 연이가 동그란 배를 들썩이며 숨을 고른다. — 효과 헥, 헥
- 컷 08 연잎에 고인 이슬 웅덩이에 제 모습이 비친다. 짧은 앞발, 동그란 배, 꼬불 꼬리, 자기 오른쪽 귀의 큰 연꽃과 정면의 큰 꽃잎 다섯 장. — 무음
- 컷 09 연이가 앞발 두 개를 나란히 들어 본다. 아주 진지한 얼굴. — 연이 이 손으로 과제는 어떻게 해.
- 컷 10 투덜대는 말끝에 작은 소리가 묻어난다. 말풍선 꼬리 끝에 작은 글자. — 연이 진짜 말이 안 되잖아, 꿀.

연출 메모: 08컷 이슬 웅덩이는 거울상이라 연꽃이 화면상 반대편에 보인다. 정면 다섯 잎의 순서를 여기서 독자에게 한 번 보여 두고, 5화 35컷에서 바깥 아래쪽 잎이 바랜다.

#### 컷 11부터 20 목소리 먼저, 손가락은 그다음

연이는 무서운 것보다 확인할 수 있는 것부터 확인한다. 웃기지만 버티는 방법이다.

- 컷 11 연이가 두 앞발로 주둥이를 틀어막는다. 눈만 크게 굴린다. — 연이 ……방금 뭐야.
- 컷 12 앞발을 내리고 면접 보듯 반듯이 앉아 또박또박 말한다. — 연이 안녕하세요. 저는 인간입니다.
- 컷 13 이상한 소리는 섞이지 않았다. 어깨가 툭 내려간다. — 연이 좋아. 말은 됨.
- 컷 14 이번엔 앞발을 들어 손가락을 세어 보려 한다. 다른 앞발로 하나씩 짚는다. 발굽은 두 갈래뿐이다. — 연이 하나, 둘…
- 컷 15 같은 구도. 셋을 셀 자리가 비어 있다. 앞발을 뒤집었다가 다시 뒤집는다. — 연이 …셋이 없어.
- 컷 16 하늘을 보며 보고서를 읽듯 말한다. — 연이 손가락 열 개에서 앞발 두 개. 명백한 다운그레이드야.
- 컷 17 털썩 주저앉는다. 연잎이 말랑하게 눌렸다 돌아온다. — 효과 말랑 / 연이 오케이. 이건 꿈이야.
- 컷 18 볼을 꼬집으려고 앞발을 뻗지만 짧은 팔이 얼굴에 닿지 않는다. 허공을 젓는 앞발. — 연이 꼬집어야 깨는데… 안 닿아.
- 컷 19 연잎 가장자리로 카드 한 장이 뒷면을 보인 채 떠내려온다. 3화에서 혼자 돌지 않던 그 패다. 연이가 몸을 기울여 앞발을 뻗는다. — 무음
- 컷 20 앞발 사이로 카드가 미끄러진다. 집을 손가락이 없다. 카드는 뒷면 그대로 안개 쪽으로 흘러간다. — 연이 속말 집을 수가 없네.

연출 메모: 14·15컷은 같은 앞발 위치를 쓴다. 19·20컷의 카드는 끝까지 뒷면이다(앞면은 원작 44화). 연이는 카드를 아쉬워하지 않고 손가락을 아쉬워한다.

#### 컷 21부터 30 연잎 반대편 끝의 담당자

처음에는 둘을 연잎 양 끝에 둔다. 영냥이는 먼저 말을 걸지만 다가오지는 않는다.

- 컷 21 정신을 차린 연이가 게임처럼 허공에 대고 말한다. — 연이 상태창. …메뉴. 인벤토리.
- 컷 22 아무것도 뜨지 않는다. 바람만 귀털을 넘긴다. 연이의 눈이 가늘어진다. — 효과 휘이 / 연이 UI 불친절하네. 별 하나.
- 컷 23 연잎 반대편 끝, 이슬 사이 작은 그림자. 말풍선이 그림보다 먼저 온다. — 영냥이 아직도 꿈 같나.
- 컷 24 연잎 양 끝에 둘을 둔 가로 넓은 컷. 이쪽 끝에 굳은 연이, 저쪽 끝에 손바닥만 한 흰 고양이. 초승달 모자의 금색 술이 바람에 흔들린다. — 영냥이 무리도 아니지.
- 컷 25 연이가 고개만 천천히 돌린다. — 연이 …너 뭐야. / 영냥이 이 강의 담당자다.
- 컷 26 연이가 앞발로 모자 모양을 그려 보인다. — 연이 아무리 봐도 모자 쓴 고양이잖아. / 영냥이 평범한 고양이는 아니다.
- 컷 27 연이가 앞발 두 개로 크기를 재는 시늉을 한다. — 연이 근데 왜 이렇게 작아? 손바닥만 해.
- 컷 28 영냥이의 수염이 꿈틀한다. — 영냥이 …처음 보자마자 너무하는군.
- 컷 29 연이가 제 몸을 앞발로 가리킨다. 영냥이의 눈꺼풀이 먼저 들린다. 귀는 아직 앞을 향해 있다. — 연이 나 방금 돼지 됐어. 오늘은 무례해도 돼.
- 컷 30 한 박자 늦게 영냥이의 귀가 연이 쪽으로 돌아간다. — 영냥이 …그건 인정하지.

연출 메모: 23~30컷 동안 둘 사이 연잎의 거리는 줄지 않는다. 29·30컷은 같은 영냥이 얼굴 크기로 눈꺼풀과 귀의 순서만 바꾼다.

#### 컷 31부터 40 강물 속 글자에 먹빛

설정 설명은 말싸움 사이에 한 줄씩만. 마지막 세 컷에서 농담이 빠진다.

- 컷 31 연이가 눈을 가늘게 뜬다. 영냥이는 꼿꼿하다. — 연이 너 NPC지? / 영냥이 사주의 강을 지키는 가디언이다. / 연이 …설정 있는 NPC네.
- 컷 32 연이가 앞발로 머리 위 연꽃을 꾹 누른다. 다섯 잎이 작게 흔들린다. — 연이 아, 디테일 미쳤다. / 영냥이 아픈가.
- 컷 33 연이가 앞발을 꽃에서 떼고 갸웃한다. 영냥이는 단호하게 끄덕이고, 연이는 눈을 흘긴다. — 연이 안 아픈데 기분이 이상해. / 영냥이 그럼 현실이다. / 연이 판정 너무 대충이잖아.
- 컷 34 영냥이가 배 밖을 본다. 따라 돌아본 연이의 시점으로 강이 펼쳐진다. 별빛 부서지는 검푸른 물, 물고기처럼 헤엄치는 한자들, 안개 너머 흐린 기둥, 큰 달. — 연이 속말 예뻐서 더 무섭다.
- 컷 35 강을 등진 둘. 연이는 여전히 연잎 이쪽 끝, 영냥이는 저쪽 끝이다. — 연이 …여기 어디야. / 영냥이 사주의 강. 사람의 운명 코드가 흐르는 곳이다.
- 컷 36 연이가 제 동그란 배를 앞발로 가리킨다. 영냥이는 표정 하나 바꾸지 않는다. — 연이 인간 아니게 됐는데. / 영냥이 정확히는 꽃돼지다.
- 컷 37 연이가 깊게 숨을 들이켜자 콧김이 샌다. 그 소리에 화가 치민다. — 효과 꿀 / 연이 왜 하필 돼지냐고! 나 집에 갈래. / 영냥이 쉽지 않다.
- 컷 38 영냥이가 연잎 위를 걸어온다. 디딜 때마다 바닥이 작게 빛나고 분홍 발바닥에 별 문양이 보인다. 연잎 한가운데에서 멈춘다. — 연이 그럼 민원. 앱 하나 눌렀다고 돼지는 과하잖아. / 영냥이 나름 귀엽지 않나.
- 컷 39 연이가 Code 뭐시기를 말하자 영냥이의 얼굴이 굳는다. — 연이 민원 추가. 내가 누른 건 앱이야. / 영냥이 그건 문이다. 넌 문은 안 열어도 앱은 누를 테니까.
- 컷 40 첨벙, 배 아래가 크게 흔들린다. 영냥이의 눈빛이 금빛으로 번지고 모자의 초승달이 희미하게 탄다. 검은 먹물이 번지며 헤엄치던 한자를 하나씩 삼킨다. 먹물 수면 위로 검은 손이 솟는다. 손가락마다 제육이 비치는 삼각김밥 포장지, 모서리가 닳은 자줏빛 교통카드, 깨진 파일 아이콘. — 효과 첨벙 / 영냥이 불운의 찌꺼기. 네 현실에서 새어 나온 것들이다. / 연이 저거… 나한테 오는 거야?

연출 메모: 39컷에서 연이는 반박을 못 하고 입을 다문다(원작 그대로). 영냥이가 연이의 버릇을 아는 듯한 말은 노출도 1 단서다. 40컷은 세로로 길게 열어 위에서 아래로 첨벙 → 금빛 눈 → 먹빛 글자 → 검은 손 → 연이 얼굴 순으로 읽힌다. 교통카드의 닳은 모서리는 손가락 사이에서 한 번 반짝인다.

---

### 5화 네 옆에 서면 (원작 EP.01 후반)

로그라인: 금빛 선이 검은 손을 베고 연이는 그 고양이에게 이름을 붙인다. 두 번째 손이 오자 연이는 그의 등 뒤가 아니라 옆에 서고, 별 하나로 반격한 값으로 꽃잎 하나가 하얗게 바랜다.

#### 컷 1부터 10 금빛 선 하나

영냥이의 힘은 움직임보다 앞뒤의 정적으로 보여 준다.

- 컷 01 4화 40컷의 검은 손을 뒤에서 잡는다. 영냥이는 꼬리 하나 움직이지 않는다. — 영냥이 그렇다. / 연이 왜.
- 컷 02 근접 투숏. 담담한 영냥이 옆얼굴과 기가 막힌 연이의 얼굴. — 영냥이 네가 표적이니까. / 연이 그걸 왜 그렇게 차분하게 말해!
- 컷 03 검은 손이 연잎 위로 뻗어 온다. 연이가 물러나려 하지만 짧은 다리가 연잎 위에서 헛돈다. 그 위로 손그늘이 덮이고, 화면 밖에서 담담한 목소리. — 효과 파닥파닥 / 연이 이 몸 조작감 왜 이래! / 영냥이 조작은 익숙해지면 된다.
- 컷 04 연잎 끝 영냥이가 있던 자리. 비어 있다. 이슬 하나만 흔들린다. — 무음
- 컷 05 화면을 가로지르는 금빛 선 하나. — 효과 촤악
- 컷 06 검은 손이 반으로 갈라진다. 먹물 방울이 구슬처럼 공중에 멈춰 있다. 교통카드를 쥔 반쪽이 물속으로 가라앉는다. — 무음
- 컷 07 영냥이가 연잎 끝에 착지한다. 손바닥만 한 몸. 공중의 먹물 방울이 그제야 후드득 떨어진다. — 효과 후드득
- 컷 08 연이의 입이 동그랗게 벌어진다. 영냥이는 돌아보지 않는다. — 연이 …오. / 영냥이 이제 그냥 고양이라고 부르지 마라.
- 컷 09 연이가 앞발로 턱을 괸다. 아주 진지하다. — 연이 …전투 고양이?
- 컷 10 영냥이의 눈이 가늘어진다. 그런데 말보다 앞발이 먼저 나와 있다. 먹물에 젖은 연잎 끝에서 연이를 끌어당기려는 앞발이다. — 영냥이 수호자는 자기 이름을 말하지 않는다. 규칙이다.

연출 메모: 04컷과 06컷 사이에 영냥이의 움직이는 몸은 그리지 않는다. 금빛 선과 착지만 남긴다. 10컷 앞발이 대사보다 먼저 화면에 들어온다.

#### 컷 11부터 20 별 하나 걸고 지은 이름

이름을 묻는 쪽이 아니라 이름을 주는 쪽이 연이다.

- 컷 11 연이가 그 앞발을 잡고 안쪽으로 한 걸음 옮긴다. 둘의 첫 접촉. — 영냥이 아무렇게나 불러라.
- 컷 12 연이가 잡은 앞발을 흔들며 웃는다. — 연이 그럼 영냥이. 영험한 냥이니까. / 연이 작명 센스는 별 하나 걸게.
- 컷 13 영냥이의 눈꺼풀이 먼저 들린다. 꼬리 끝이 그 자리에서 멈춘다. — 무음
- 컷 14 한 박자 늦게 귀가 연이 쪽으로 돌아간다. 앞발을 슬며시 뺀다. — 영냥이 …좋을 대로.
- 컷 15 물속. 잘린 손들이 녹았다가 더 굵고 길게 다시 뭉친다. 위에서 영냥이가 연잎 바닥을 앞발로 치자 가장자리에 투명한 물방울이 떠올라 작은 방패처럼 둘러선다. — 효과 꾸르륵 / 효과 툭
- 컷 16 검은 손톱이 방패를 긁는다. 연이가 귀를 접는다. — 효과 끼이이익 / 연이 …소리 최악.
- 컷 17 방패가 긁힐 때마다 물방울이 흔들린다. 영냥이가 연이 머리 위 연꽃을 턱으로 가리킨다. — 영냥이 오래는 못 버틴다. / 연이 그럼 어떡해. / 영냥이 네 머리 위 꽃은 살아 있다.
- 컷 18 연이가 앞발로 연꽃을 만진다. 꽃이 아주 약하게, 따뜻하게 빛난다. — 연이 이건 뭐야. / 영냥이 너를 나타내는 중심 글자. 일간의 흔적이다.
- 컷 19 연이가 이해를 포기한 얼굴로 끄덕인다. — 연이 좋아. 꽃이 배터리라고 치자. / 영냥이 비슷하지 않다. / 연이 너 설명하는 거, 교양 필수 교수님 같아.
- 컷 20 영냥이가 강 너머를 본다. 안개 속에 빛 네 개가 떠오른다. 날카로운 푸른빛, 흔들리는 불빛, 번쩍이는 금빛, 오래된 책장 같은 부드러운 빛. — 영냥이 네 글자가 네 군데로 흩어졌다. 저 빛 하나하나가 네 것이다.

연출 메모: 13·14컷이 이 회의 숨은 박자다. 이름을 받은 쪽의 얼굴에 한 컷 머물되 표정은 거의 바꾸지 않는다. 꼬리가 멈춘 것만 보인다.

#### 컷 21부터 30 최악의 고객센터

프롤로그의 약관과 고객센터를 웃음으로 회수한다. 그사이 방패는 계속 긁힌다.

- 컷 21 네 빛을 등지고 연이가 앞발로 빛을 하나씩 세듯 가리킨다. — 연이 저걸 다 모아야 집에 간다는 거지. / 영냥이 그렇다.
- 컷 22 연이가 문득 앞발을 든다. — 연이 잠깐. 나 약관 동의한 적 없는데. / 영냥이 동의 절차는 없다.
- 컷 23 작은 칸 넷. 연이의 질문과 영냥이의 같은 얼굴이 번갈아 나온다. — 연이 환불은. / 영냥이 없다. / 연이 문의 게시판은. / 영냥이 없다.
- 컷 24 연이가 기대 없이 묻는다. 영냥이가 아주 잠깐 시선을 피했다 돌아온다. — 연이 고객센터는. / 영냥이 …나름 내가 있다.
- 컷 25 연이의 얼굴이 굳는다. 영냥이 입꼬리가 아주 조금 올라간다. — 연이 최악의 고객센터네. / 영냥이 별점도 접수하지 않는다.
- 컷 26 방패 한가운데가 깨진다. 검은 손 하나가 뚫고 들어온다. 손가락 사이에 모서리가 닳은 자줏빛 교통카드. — 효과 퍽
- 컷 27 연이가 놀라 소리를 지르고는 곧장 제 입을 막는다. — 연이 꿀악! / 연이 …놀라서 그런 거야. / 영냥이 알고 있다.
- 컷 28 영냥이가 연이 앞으로 나선다. 말보다 먼저 앞발 하나가 뒤로, 연이 쪽으로 뻗어 있다. — 영냥이 내 뒤로. 숨어 있어라.
- 컷 29 연이가 그의 등 뒤로 몸을 숙이다가 멈춘다. 검은 손가락 사이 카드의 닳은 모서리가 반짝인다. 회색 소리 글자가 겹친다. — 기억 속 소리 삑 / 기억 속 소리 카드를 다시 대주세요.
- 컷 30 연이의 눈이 가늘어진다. 처음으로 웃음기 없는 얼굴. — 연이 …아니. 저건 내 민원이야.

연출 메모: 23컷은 같은 크기의 작은 칸 넷. 영냥이 칸은 같은 그림을 그대로 반복해도 좋다. 29컷 기억 속 소리는 1화 11·17컷 단말기 소리와 같은 글꼴을 회색으로.

#### 컷 31부터 39 같은 높이의 두 시선

연이가 어디에 서는지가 이 회의 결말이다. 32컷에서 처음으로 둘의 눈높이를 한 프레임에 맞춘다.

- 컷 31 연이가 영냥이 등 뒤에서 옆으로 한 걸음 나온다. 짧은 다리가 떨린다. — 무음
- 컷 32 정면 낮은 눈높이. 연이와 영냥이가 나란히 서서 같은 손을 본다. 두 시선이 같은 높이에 있다. — 무음
- 컷 33 연이가 앞발을 치켜든다. 목소리는 떨리지 않는다. — 연이 교통카드, 별 하나! / 연이 사유, 네 번 만에 인식. 재구매 의사 없음!
- 컷 34 머리 위 연꽃이 확 밝아진다. 분홍빛이 검은 손가락 사이로 스며들고 카드가 촛농처럼 녹아내린다. 손은 허공을 움켜쥐다 먹물로 풀린다. — 화면 민원 처리 완료 · 교통카드 · ★☆☆☆☆ / 효과 주르륵
- 컷 35 영냥이는 손이 아니라 연이를 보고 있다. 연이가 머리 위가 서늘해 앞발로 꽃을 더듬는다. 정면 다섯 잎 중 바깥 아래쪽 잎 하나가 종이처럼 하얗게 바래 있다. — 영냥이 …방금 그거, 네가 한 거다. / 연이 잠깐, 이거 원래 이랬어?
- 컷 36 흰 잎을 사이에 두고 두 얼굴. 영냥이의 앞발이 연이 앞발 옆에 먼저 놓이고 말이 따라온다. — 영냥이 네 빛을 꺼내 쓴 값이다. 쉽게 안 돌아온다. / 연이 …환불은 없다며. / 영냥이 없다. 그러니 아껴 써라.
- 컷 37 영냥이가 뛰어오른다. 몸은 낮게, 연이를 등지고 강 쪽을 향한다. 발톱의 금빛 문양에서 별빛 칼날이 강물 위를 가르며 남은 검은 손들을 한꺼번에 잘라 낸다. — 효과 사악
- 컷 38 강물이 길처럼 갈라지고 연잎 배가 앞으로 밀려난다. 착지한 영냥이가 안개 쪽을 보며 낮게 말한다. 반측면, 얼굴은 그늘. — 영냥이 …놓치지 않는다.
- 컷 39 세로 긴 컷. 안개 속 섬 둘레에 수많은 거울 조각이 떠 있다. 그중 가까운 하나에 크림색 잔꽃 블라우스 소매의 사람 손이(니트 조끼 가장자리가 살짝 보인다) 이쪽으로 손을 흔든다. 아래쪽 연잎 위 작은 두 몸이 같은 조각을 본다. — 무음

연출 메모: 33·34컷이 프롤로그 「별 하나」와 닳은 모서리의 회수다. 35컷부터 흰 잎은 같은 자리의 같은 잎만 칠한다. 38컷 「놓치지 않는다」는 연이가 듣지 못하는 작은 글씨로 둔다(노출도 1 단서). 39컷의 손은 인간 연이가 나오는 유일한 컷이다. 얼굴과 몸은 거울 조각 가장자리에서 잘린다. 원작 EP.01 끝의 목적지 대화(날카로운 빛, 비겁의 섬)는 6화 01컷 그림과 7화 07~10컷이 받는다.
---


### 6화 이름을 묻지 않는 사이 (원작 EP.01A)

로그라인: 섬 앞 갈대에서 이름을 물어 묶는 고리에 걸린 검은 새끼 호랑이를 꺼낸다. 호랑이는 이름 대신 빚 이야기를 하고, 영냥이는 두 몸 사이에 앞발을 놓는다.

#### 컷 1부터 10 갈대 밑의 검은 솜뭉치

- 컷 01 날카로운 푸른빛 쪽으로 가던 연잎 배가 섬 앞 갈대 무더기에 걸린다. 영냥이가 앞발로 물살을 누른다. 주변 거울 조각들이 서로 부딪힌다. — 효과 사각사각 / 효과 챙
- 컷 02 연이의 돼지 귀가 쫑긋 선다. 거울 소리 사이로 아주 작게 이를 가는 소리. — 효과 빠득 / 연이 속말 누가 울음 참나?
- 컷 03 갈대 밑을 들여다보는 연이. 검은 덩어리 가운데 붉은 점 두 개가 뜬다. — 연이 저기 검은 솜뭉치가… 아니, 눈이 있어.
- 컷 04 공개. 금실 두른 작은 망토가 갈대에 걸린 검은 새끼 호랑이. 젖은 털, 또렷한 붉은 눈, 상처처럼 붉은 이마 문양, 줄무늬 꼬리. 오른 앞발에 실보다 가는 검은 고리. — 무음
- 컷 05 호랑이가 턱을 들고 느리게 말한다. 발은 떨리고 있다. — 호랑이 구경 끝나셨으면 가세요, 손님. / 호랑이 그리고 솜뭉치 아니에요.
- 컷 06 연이가 떨리는 발을 가리킨다. — 연이 말도 하네. 그럼 도와 달라고 해. / 연이 발이 그렇게 떨리는데.
- 컷 07 연이가 앞발을 내미는 순간, 영냥이의 앞발이 먼저 그 앞을 막아선다. 말은 그다음이다. — 영냥이 손대지 마. 덫이 아니다.
- 컷 08 검은 고리 근접. 영냥이의 눈꺼풀이 먼저 들리고 귀가 한 박자 늦게 납작해진다. — 영냥이 주인 찾는 고리다. 이름을 묻고, 대답하면 묶인다.
- 컷 09 호랑이가 숨을 쉴 때마다 고리가 조금씩 조인다. — 효과 지익
- 컷 10 연이가 고리와 뱃머리 쪽 푸른빛을 번갈아 본다. 결정했다. — 연이 이름만 안 말하면 되지? 영냥아, 배만 잡아 줘. / 연이 어려운 얘기는 나중에. 나도 무서우니까.

연출 메모: 01컷은 5화 끝의 거울 조각 바다 바로 앞이다. 07컷 앞발이 대사보다 먼저 들어오게 말풍선을 앞발 뒤에 둔다.

#### 컷 11부터 20 가격표 붙이지 마

- 컷 11 연이가 배 가장자리의 마른 잎자루를 입에 물고 고리와 털 사이에 밀어 넣는다. 검은 물이 솟는다. — 효과 푸슉
- 컷 12 호랑이가 반사적으로 연이 코를 할퀴려다 발톱 끝에서 멈춘다. 그 사이 잎자루가 부러진다. 고리는 그대로다. — 효과 뚝
- 컷 13 호랑이가 젖은 망토를 끌어당기며 연이를 올려다본다. 목소리는 느리고 끝음이 서늘하다. — 호랑이 그만하세요. 제 몸도 마음대로 못 쓰시면서. / 호랑이 다치시면 그 값, 저한테 물리실 건가요?
- 컷 14 코끝에 생채기가 난 연이가 볼을 부풀린다. — 연이 아프면 아프다고 해. / 연이 자꾸 가격표 붙이지 말고.
- 컷 15 연이가 앞발로 연잎을 탁 친다. 진지한데 웃긴 얼굴. — 연이 나 삼각김밥 떨어뜨린 날도 이렇게 오래 협상 안 했어.
- 컷 16 영냥이 발톱 끝에 금빛이 맺힌다. 그대로 베면 호랑이 발까지 지나갈 각도다(옅은 점선). 영냥이가 빛을 거둔다. — 무음
- 컷 17 영냥이가 연잎을 비스듬히 누른다. 물살의 방향이 바뀌고 팽팽하던 고리가 잠깐 느슨해진다. — 영냥이 지금. 당기지 말고 밀어라.
- 컷 18 영냥이가 연잎을 누른 앞발을 떼지 않은 채 연이를 본다. — 영냥이 고리를 빼는 게 아니다. 발이 빠질 틈을 만드는 거다.
- 컷 19 연이가 제 이마로 호랑이의 어깨를 꾹 민다. 흰 꽃잎 하나가 보이는 각도. — 효과 꾹
- 컷 20 둘이 함께 젖은 연잎 위로 굴러 넘어진다. — 효과 데구루루

연출 메모: 16컷에서 영냥이가 빛을 거두는 이유는 말로 하지 않는다. 점선과 거두는 발만 보인다. 17컷 「밀어라」는 원작 이후 여러 번 되돌아오는 말이라 한 칸을 온전히 준다.

#### 컷 21부터 30 값을 치른 자리

- 컷 21 강물에 남은 고리만 허공을 문다. 방금 발이 있던 자리를 세 번 물고는 검은 물거품으로 터진다. — 효과 딱, 딱, 딱 / 효과 퐁
- 컷 22 연잎 위에 퍼져 누운 호랑이가 고개만 든다. — 호랑이 왜 손님 몸으로 미세요? / 호랑이 고양이 씨한테 시키셨으면 됐잖아요.
- 컷 23 호랑이가 턱을 들고 망토 끝을 여민다. 영냥이 쪽으로 붉은 눈이 한 번 간다. — 호랑이 명령할 힘은 그렇게 쓰는 거예요.
- 컷 24 연이가 코를 문지르며 일어난다. — 연이 친구한테 부탁하는 걸 왜 명령이라고 해. / 연이 돼지 이마는 쓸모 있네. 코는 쓸모없게 아프고.
- 컷 25 호랑이가 연이 코의 생채기를 본다. 연이가 얼굴을 찡그릴 때마다 꼬리 끝이 한 번씩 까딱인다. 숫자를 세듯. — 효과 까딱
- 컷 26 호랑이의 붉은 눈이 생채기에서 정수리로 올라가 흰 꽃잎 한 장에서 오래 멈춘다. — 무음
- 컷 27 흰 꽃잎에서 눈을 떼지 않는 호랑이 근접. 입꼬리만 조금 올라간다. — 호랑이 그 한 장은 벌써 값을 치른 자리네요. / 호랑이 어디서 먼저 계산하고 오셨나 봐요.
- 컷 28 호랑이가 망토를 여미며 자세를 바로 한다. — 호랑이 원하시는 걸 말씀하세요. 길이든 물건이든. / 호랑이 빚은 남겨 두면 불어나요.
- 컷 29 연이가 코를 찡그리며 앞발로 머리를 긁적인다. — 연이 안 다쳤으면 됐어. 굳이 받자면… 이름? / 연이 호랑이라고 부르면 화낼 것 같아서.
- 컷 30 호랑이가 대답한다. 뒤쪽 영냥이의 귀 하나가 슬쩍 반대편으로 돌아간다. — 호랑이 이름은 함부로 드리는 게 아니에요. / 호랑이 쥔 쪽이 어디서든 부를 수 있으니까요.

연출 메모: 25컷 꼬리는 연이 표정 둘에 까딱 둘. 30컷 영냥이의 귀는 배경에서 작게, 독자가 다시 읽어야 보이는 크기로(노출도 1).

#### 컷 31부터 40 두 몸 사이의 앞발

- 컷 31 호랑이가 고개를 돌린다. 연이는 아무렇지 않게 웃는다. — 호랑이 부르면 가야 하는 삶은 별로거든요. / 연이 그럼 그냥 호랑이라고 부를게. / 연이 이름 몰라도 도울 수는 있잖아.
- 컷 32 호랑이의 꼬리가 멎는다. 금장에서 떨어진 물방울이 강으로 굴러가지 않고 호랑이 쪽으로 기어간다. 그걸 본 영냥이의 눈꺼풀이 먼저 들린다. — 무음
- 컷 33 한 박자 늦게 귀가 돌아가고, 영냥이가 연이와 호랑이 사이 연잎에 앞발을 내려놓는다. — 영냥이 선착장까지만 같이 간다. 누가 보냈는지는 안 묻지. / 영냥이 너도 이 아이 이름은 묻지 마라.
- 컷 34 호랑이가 영냥이의 앞발을 내려다보며 꼬리를 감는다. — 호랑이 고양이 씨는 원래 이렇게 무뚝뚝하세요? / 호랑이 발 하나 빼 주시고 울타리부터 치시네요.
- 컷 35 연이가 웃으며 영냥이를 가리킨다. 호랑이가 귀를 세운다. — 연이 얘도 고양이라고 하면 엄청 싫어해. 너도 작다고 하면 싫어? / 호랑이 작다는 말은 빼 주세요. 망토까지 합치면 안 작아요.
- 컷 36 연이가 소리 내어 웃는다. 호랑이는 따라 웃지 않고 귀를 낮춘다. 붉어진 귀 안쪽을 망토로 가린다. 꼬리 끝이 또 까딱인다. — 효과 까딱 / 연이 저기 마른 데 앉아. 망토 물 먹어서 무겁겠다.
- 컷 37 호랑이가 망토 끝을 연이에게 내민다. 금장 안쪽 검은 실 한 올이 천 사이로 파고든다. 영냥이가 고개를 돌리자 실이 멈춘다. — 호랑이 코에 대세요. / 호랑이 드린 건 아니니까 착각은 마시고요. / 연이 알았어, 빌리는 거.
- 컷 38 섬의 종이 울린다. 호랑이가 첫 종소리에 귀를 세우고 두 번째 소리 전에 뛰어내린다. 다친 발은 물에 닿지 않고, 검은 수면이 디디는 곳마다 단단해져 좁은 길이 된다. 호랑이는 돌아보지 않는다. — 효과 댕
- 컷 39 영냥이가 연이의 앞발 위에 제 앞발을 잠깐 얹고 나서 말한다. 연이는 코에 붙은 붉은 실오라기를 떼어 앞발 위에 올린다. — 영냥이 저 발자국은 따라가지 마라. / 연이 아픈 얼굴은 진짜 같았는데. / 영냥이 아픈 건 진짜여도 속셈은 따로 있을 수 있다. 둘 다 봐라. / 영냥이 그렇다고 네가 도운 일이 틀린 건 아니다.
- 컷 40 안개 너머에서 호랑이가 돌아본다. 웃음은 사라지고 물 위에 붉은 눈 두 점만 남는다. 그 아래 수면 밑으로 끊어진 검은 실 끝이 가라앉고, 물속의 한 줄 글자가 소리 없이 지워진다. 연이는 그것을 보지 못하고 앞발 위 실오라기만 본다. — 호랑이 다친 걸 보면 멈추시는군요. / 호랑이 다음엔 그 고양이 없는 쪽으로 오세요.

연출 메모: 33컷 앞발은 둘 사이의 정확한 가운데. 39컷도 앞발이 먼저, 말이 나중이다. 40컷 지워지는 글자는 읽히지 않는 흐린 획으로만 그린다(누구의 이름인지 정하지 않는다). 호랑이는 끝까지 이름을 말하지 않는다.

---

### 7화 거울에 먼저 비친 쪽 (원작 EP.02 도입)

로그라인: 비겁의 섬 선착장에 코부터 착지한 연이는 거울에서 손을 흔든 사람이 자기였다고 말하고, 꽃돼지를 비추지 않는 거울 앞에서 그 거울이 먼저 움직이는 것을 본다.

#### 컷 1부터 10 선착장, 툭

- 컷 01 연잎 배가 검은 유리 선착장에 닿는다. 생각보다 작은 소리. — 효과 툭
- 컷 02 뒤쪽, 쫓아오던 검은 손들이 섬 앞 안개에서 우뚝 멈췄다가 강물 아래로 가라앉는다. — 무음
- 컷 03 연이가 연잎 가장자리를 붙든 채 숨을 고른다. 앞발에 힘이 잔뜩 들어가 있다. — 연이 살았다…… / 효과 꿀
- 컷 04 연이가 앞발로 제 입을 틀어막고 고개를 젓는다. — 연이 방금 건 숨소리야. 돼지 소리 아님.
- 컷 05 연이가 뒤돌아 안개 속 거울 조각들을 가리킨다. — 연이 영냥아. 아까 거울에서 누가 손 흔들었어. 사람 손으로. / 영냥이 봤다.
- 컷 06 연이가 목소리를 낮춘다. 영냥이의 눈꺼풀이 먼저 들린다. — 연이 …나였어. 사람이던 나.
- 컷 07 한 박자 늦게 귀가 연이 쪽으로 돌아간다. — 영냥이 그러니 조심해라. 여긴 비겁의 섬이다.
- 컷 08 연이가 앞발 하나를 든다. 영냥이는 섬 쪽을 본 채 답한다. — 연이 비겁이 뭔데. 짧게. / 영냥이 너랑 같은 편에 선 것들. 친구, 경쟁자, 자존심.
- 컷 09 연이가 갸웃한다. 영냥이의 대답은 한 줄이다. — 연이 같은 편인데 왜 싸워? / 영냥이 같은 자리를 원하니까.
- 컷 10 연이가 앞발로 엄지척 대신 발굽을 든다. — 연이 …진짜 짧네. 별 네 개.

연출 메모: 05·06컷은 6화에서 미뤄 둔 질문이다. 연이는 손 흔든 사람이 자기라는 걸 이미 알고 말한다.

#### 컷 11부터 21 튜토리얼 없는 착지

- 컷 11 영냥이가 선착장으로 사뿐히 뛰어내린다. 검은 유리 바닥에 금빛 발자국이 피었다 사라진다. — 효과 사뿐
- 컷 12 연이가 반짝 사라지는 금빛 발자국을 들여다본다. 영냥이가 돌아본다. — 연이 와, 효과음만 깔면 완전 게임인데. / 영냥이 아직도 게임이라고 생각하나.
- 컷 13 연이가 두 앞발을 모으고 간절한 척한다. — 연이 로딩 화면 한 번만 뜨면 바로 인정할게.
- 컷 14 연이가 영냥이 모자를 앞발로 가리킨다. 영냥이의 수염이 꿈틀한다. — 연이 근데 너 정체가 뭐야? 모자 쓴 고양이? 코스프레하는 고양이? / 영냥이 …평범한 고양이는 아니다.
- 컷 15 영냥이가 앞발을 들어 보인다. 발바닥 별 문양이 금빛으로 반짝인다. — 연이 근데 자꾸 고양이처럼 보인단 말이지. / 영냥이 한 번만 더 하면 그 발자국을 네 이마에 남겨 주지.
- 컷 16 연이가 앞발부터 선착장에 내린다. 뒷다리를 옮기는 순간이다. — 연이 네네, 모자 멋진 고양이님.
- 컷 17 짧은 다리가 말을 안 듣는다. 몸이 앞으로 기운다. — 연이 어, 어어?
- 컷 18 코부터 선착장 바닥에 박는다. — 효과 퍽
- 컷 19 바닥에 엎어진 연이의 코앞에 영냥이의 앞발이 먼저 내밀어져 있다. 영냥이는 딴 데를 보고 있다. — 영냥이 착지는…
- 컷 20 연이가 그 앞발을 잡고 일어난다. 코끝이 빨갛다. — 영냥이 연습이 좀 필요하겠군. / 연이 분석하지 마.
- 컷 21 연이가 앞발로 허공을 가리키며 항의한다. 말끝에 콧김이 샌다. — 연이 이런 건 튜토리얼부터 주는 거 아냐? 세이브도, 환불 버튼도 없고. / 효과 꿀

연출 메모: 19·20컷이 「앞발이 먼저, 말은 나중」의 가장 분명한 예다. 앞발은 말풍선이 뜨기 전 컷에 이미 들어와 있다.

#### 컷 22부터 30 따라 하지 마

- 컷 22 섬 전경. 풀도 집도 없다. 검은 유리처럼 반짝이는 바닥 위로 손바닥만 한 것부터 문짝만 한 것까지 거울들이 저마다 다른 각도로 떠 있다. 하늘, 강, 연잎 배, 연이를 각각 비춘다. — 무음
- 컷 23 가까운 거울 속 꽃돼지. 바랜 꽃잎은 여전히 같은 자리에 하얗다. — 연이 아직도 적응이 안 돼. / 연이 볼살은 또 언제 붙었어.
- 컷 24 연이가 앞발을 들자 거울 속도 든다. 고개를 갸웃하자 똑같이 갸웃한다. — 연이 야. 따라 하지 마.
- 컷 25 거울 속 꽃돼지가 입만 뻐끔댄다. 연이가 몸을 이리저리 돌리자 꼬리가 같이 살랑인다. — 연이 딱 한 번만 삐끗해 봐. 렉 걸리면 가짜로 인정해 줄게.
- 컷 26 연이가 털썩 앉는다. — 연이 나 원래 걸크러시가 추구미인데. / 연이 장르가 힐링 동물상으로 갈아엎어졌어. / 영냥이 …좋다는 건지 싫다는 건지.
- 컷 27 연이가 거울 속 볼살을 앞발로 누른다. 영냥이는 모자 챙을 고쳐 쓴다. — 연이 넌 몰라. 외모 장르가 통째로 바뀐 심정. / 영냥이 나는 태어날 때부터 완성형이었다.
- 컷 28 연이가 고개를 홱 돌리며 거울 앞을 떠난다. — 연이 아, 예. 그러셔. / 연이 동행 고양이 성격 별 두 개. 모자 예쁘니까 반 개 추가.
- 컷 29 걸음을 옮기던 연이의 발치, 바닥 가까이 뜬 손바닥만 한 거울 조각에 방바닥이 비친다. 흰 양말 한 짝과 회색 줄무늬 양말 한 짝이 떨어져 있다. — 연이 어? 저거 내 양말.
- 컷 30 영냥이가 조각을 내려다본다. 눈꺼풀이 먼저, 귀가 나중. — 영냥이 짝이 안 맞는군. / 연이 둘 다 내 거니까 맞는 거야.

연출 메모: 24컷 거울상은 좌우가 반대라 연꽃이 화면상 반대편에 보인다. 29컷 양말은 1화 09컷과 같은 두 짝(흰 양말, 회색 줄무늬)으로 2화에서 벗어 둔 것이다. 30컷 연이의 대답은 1화 10컷 「둘 다 내 거니까」의 회수다.

#### 컷 31부터 39 꽃돼지를 비추지 않는 거울

- 컷 31 섬 안쪽으로 갈수록 거울 조각이 촘촘해진다. 연이의 걸음이 멈춘다. 키 큰 거울 하나가 앞에 선 꽃돼지를 비추지 않는다. — 무음
- 컷 32 그 거울 속 전경. 침대 발치에서 본 연이의 방. 왼쪽 창, 오른쪽 책상, 머리판 한 귀퉁이가 떨어져 나간 나무 침대, 침대에 던져진 충전기 선, 베개 위에서 켜져 있는 휴대폰. 사람이 앉을 자리에는 하얀 반사광만 한 줄. — 무음
- 컷 33 연이가 거울 앞으로 다가가 앞발을 유리에 댄다. 차갑다. — 효과 탁, 탁 / 연이 …내 방이다.
- 컷 34 유리에 댄 짧은 앞발 근접. 작은 목소리. — 연이 집에 가고 싶다. / 연이 내 방으로. 내 침대로. 내 손가락으로.
- 컷 35 거울에 앞발을 댄 채 연이가 돌아보지 않고 부른다. 영냥이가 한 걸음 다가와 바로 뒤에 선다. — 연이 …영냥아. / 영냥이 듣고 있어. 계속해. / 연이 저기로 들어가면 돌아갈 수 있어?
- 컷 36 영냥이가 연이 옆에 선다. 거울을 보는 얼굴이 진지하다. — 영냥이 아니다. 이 섬의 거울은 출구가 아니다. / 영냥이 네가 놓고 온 자리만 비춘다.
- 컷 37 연이가 앞발을 거울에서 천천히 뗀다. 그 순간 거울 속 이불이 누가 앉은 것처럼 푹 꺼지고, 베개 위 휴대폰이 화면 밖으로 들려 올라간다. 거울 앞의 연이는 움직이지 않았다. — 무음
- 컷 38 굳은 연이의 얼굴. 옆에서 영냥이의 귀가 납작해진다. 거울 쪽에서 꼬리 달린 말풍선이 나온다. — 거울 속 목소리 늦었네.
- 컷 39 거울 표면과 그 앞의 작은 두 그림자만. 같은 목소리가 한 번 더. 아래 긴 여백. — 거울 속 목소리 너, 항상 늦잖아.

연출 메모: 32컷 방은 1화 01컷·3화 13컷과 같은 배치이고, 3화 30컷에서 부러진 머리판 귀퉁이를 그대로 둔다. 37~39컷에 사람의 몸은 그리지 않는다. 움직이는 것은 이불, 휴대폰, 목소리뿐이다. 「거울에 먼저 비친 쪽」은 거울이 연이보다 먼저 움직인 순간이다.

---

### 각색 결정 메모

1. 4화 끝을 원작 EP.01의 검은 손 등장(비트 101~103)에서 끊고, 5화를 「그렇다.」(비트 104)로 연다.
2. 원작의 「누가 건드렸다고?」「그걸 알려면 글자부터」 문답(비트 99~100)과 「그냥 돼지보다 낫지 않나」(70~72)는 분량상 뺐다. 「네 글자」는 5화 20컷 네 빛 장면이 대신한다.
3. 원작 EP.01 끝의 목적지 대화(날카로운 빛부터 가자, 비겁의 섬, 짧게 설명)는 그림으로 대신했다. 6화 01컷은 푸른빛 쪽으로 가던 배, 7화 07~10컷이 「짧게」를 받는다.
4. 프롤로그 복선: 뒤집힌 별 카드는 4화 19~20컷에서 뒷면 그대로 떠내려간다. 교통카드 닳은 모서리와 별 하나는 4화 40컷에서 심고 5화 26~34컷에서 회수. 짝양말은 7화 29~30컷에서 한 번 보이고 결혼식 아침까지 남긴다.
5. 인간 연이는 기획서의 머리와 옷의 연속성을 따라 모든 회차에서 시트 의상(크림색 잔꽃 블라우스, 니트 조끼, 모브 치마)으로 통일한다. 원작의 「후드티」는 쓰지 않는다. 5화 39컷 거울 속 손은 블라우스 소매, 7화 06컷 대사는 「사람이던 나」. 밤 장면(1화 31컷 이후, 2·3화)은 니트 조끼만 벗어 책상 의자에 걸어 둔다.
6. 7화는 원작 EP.02의 「늦었네 / 너, 항상 늦잖아」(비트 86·89)까지다. 원작은 거울 속 인간 연이가 말하지만, 「인간 연이는 5화 손만」 규칙에 맞춰 이불·휴대폰·목소리만 보인다.
7. 네오 단서(노출도 1): 4화 39컷 「넌 문은 안 열어도 앱은 누를 테니까」, 5화 13·14컷 이름을 받은 뒤 멈춘 꼬리, 5화 38컷 「놓치지 않는다」, 6화 30컷 이름 이야기에 돌아가는 귀, 7화 27컷 「완성형」. 확신을 주는 대사는 없다.
