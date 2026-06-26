function basenameFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "");
}

export function lyricsFromAudioFileName(audioFileName: string) {
  const normalized = basenameFromFileName(audioFileName).toLowerCase();
  const normalizedSongKey = normalized
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (normalizedSongKey === "lucky rush title") {
    return `[Intro]
Lucky Rush
Lucky Rush
별이 터져 like that
Lucky Rush
너를 본 순간

[Verse 1]
오늘 운세는 느낌이 달라
하늘이 먼저 내게 sign
닫혀 있던 하루 위로
네가 번져오는 light

손금처럼 꼬인 길도
이상하게 풀려가
네가 웃는 그 순간
내 리듬이 바뀌잖아

숨겨진 별자리 속
너의 이름이 flash
모든 불안이 멈춰
내 심장은 dash

[Pre-Chorus]
흐린 밤이 열리고
은하수가 내려와
기다렸던 대운처럼
네가 내게 와

겁이 많던 yesterday
이젠 전부 far away
네 눈빛 하나로
내 세상이 turn up

[Chorus]
Lucky Rush, Lucky Rush
너는 나의 lucky sign
멈춰 있던 운명이
너를 따라 달려가

Lucky Rush, Lucky Rush
밤하늘이 터져 now
너를 만난 뒤로 난
빛나는 쪽으로 가

[Post-Chorus]
Rush, rush, lucky rush
심장이 boom, boom, rush
Star, star, 너라는 star
나를 깨워 higher

Luck, luck, lucky rush
손끝이 touch, touch, rush
Run, run, 은하수 run
너에게로 higher

[Verse 2]
타로 속에 hidden answer
네가 열어준 new chapter
틀린 줄 알았던 길도
너를 향해 all better

막힌 대운 위로 jump
불안 따윈 전부 cut
별빛 아래 we don’t stop
운세보다 더 뜨거워

내 하루의 password
네 이름을 입력해
닫힌 문이 열리고
내일이 시작돼

[Pre-Chorus 2]
흐린 밤이 열리고
은하수가 내려와
기다렸던 대운처럼
네가 내게 와

겁이 많던 yesterday
이젠 전부 far away
네 눈빛 하나로
내 세상이 turn up

[Chorus]
Lucky Rush, Lucky Rush
너는 나의 lucky sign
멈춰 있던 운명이
너를 따라 달려가

Lucky Rush, Lucky Rush
밤하늘이 터져 now
너를 만난 뒤로 난
빛나는 쪽으로 가

[Post-Chorus]
Rush, rush, lucky rush
심장이 boom, boom, rush
Star, star, 너라는 star
나를 깨워 higher

Luck, luck, lucky rush
손끝이 touch, touch, rush
Run, run, 은하수 run
너에게로 higher

[Bridge]
가끔은 별이 흐려져도
나는 이제 알아
네가 있는 방향으로
내 운명이 빛나

수많은 밤을 건너
너와 나란히 서면
흩어진 별들도 모여
하나의 길이 돼

[Final Chorus]
Lucky Rush, Lucky Rush
너는 나의 lucky sign
멈춰 있던 운명이
너를 따라 달려가

Lucky Rush, Lucky Rush
밤하늘이 터져 now
너를 만난 뒤로 난
빛나는 쪽으로 가

[Final Post-Chorus]
Rush, rush, lucky rush
심장이 boom, boom, rush
Star, star, 너라는 star
나를 깨워 higher

Luck, luck, lucky rush
손끝이 touch, touch, rush
Run, run, 은하수 run
너에게로 higher

[Outro]
Lucky Rush
Lucky Rush
너를 만난 순간
My stars wake up`;
  }

  if (normalizedSongKey === "starline") {
    return `[Intro]
Follow the starline
Follow the starline
흐린 밤을 건너
너에게로

[Verse 1]
오늘의 운세는 흐림
별 하나 보이지 않던 밤
나도 모르게 멈춰 서서
하늘만 바라봤어

손금처럼 엉킨 길 위
조용히 번진 작은 빛
너를 만난 그 순간부터
내 마음이 움직였어

운명선 끝에 피어난
이름 없는 별 하나
왜인지 네 눈빛 같아서
한참을 바라봤어

[Pre-Chorus]
흔들리던 별자리도
너를 향해 이어지고
닫혀 있던 내일마저
조금씩 문을 열어

멀리 있던 대운처럼
네가 내게 다가와
겁이 많던 나의 밤을
은하수로 바꿔놔

[Chorus]
Follow the starline
너를 따라 빛나
어두웠던 내 운명이
다시 숨을 쉬잖아

Follow the starline
하늘 끝을 지나
너를 만난 뒤로
내 운명은 빛나

[Post-Chorus]
Starline, starline
길을 잃어도
Starline, starline
너를 찾을게

Light up, light up
밤을 넘어서
너와 나의 운세는
눈부시게 피어나

[Verse 2]
타로 속에 감춘 answer
별빛처럼 내게 whisper
틀린 줄 알았던 길도
너를 향해 align

막힌 대운 위를 걸어
불안했던 나를 넘어
너와 함께라면 every day
내일은 lucky sign

달의 모양이 변해도
계절이 다시 돌아도
내가 믿고 싶은 건 하나
너와 같은 하늘 아래

[Pre-Chorus 2]
흐려졌던 horoscope
네 이름으로 밝아지고
닫힌 운명의 페이지가
우리 둘로 채워져

멀리 있던 꿈이라도
네가 있으면 닿을 듯해
겁이 많던 나의 밤을
은하수로 바꿔놔

[Chorus]
Follow the starline
너를 따라 빛나
어두웠던 내 운명이
다시 숨을 쉬잖아

Follow the starline
하늘 끝을 지나
너를 만난 뒤로
내 운명은 빛나

[Post-Chorus]
Starline, starline
길을 잃어도
Starline, starline
너를 찾을게

Light up, light up
밤을 넘어서
너와 나의 운세는
눈부시게 피어나

[Bridge]
가끔은 나도 두려워
별이 사라진 밤이면
정해진 답이 없어서
모든 게 흔들릴 때

그때 네가 말해줬어
“넌 이미 빛나고 있어”
그 한마디가 내 안에
새 별자리를 그렸어

[Final Chorus]
Follow the starline
너를 따라 빛나
어두웠던 내 운명이
다시 숨을 쉬잖아

Follow the starline
하늘 끝을 지나
너를 만난 뒤로
내 운명은 빛나

[Final Post-Chorus]
Starline, starline
길을 잃어도
Starline, starline
너를 찾을게

Light up, light up
밤을 넘어서
너와 나의 운세는
눈부시게 피어나

[Outro]
Follow the starline
Follow the starline
흐린 운세 끝에
너라는 별`;
  }

  if (normalizedSongKey === "heaven light") {
    return `[Intro]
Heaven Light
Heaven Light
검은 별이 널 부를 때
I won’t let fate take you

[Verse 1]
오늘의 하늘은 무거워
별들도 말을 잃은 밤
웃고 있는 네 눈가에
숨은 비가 보여

운세는 조용히 warning
길은 자꾸 멀어지고
혼자 괜찮은 척하는
네 손끝이 떨려

흐린 명반 위에
하나의 빛이 깨어나
천량의 별처럼
너의 곁에 내려와

[Pre-Chorus]
무너지는 하늘이면
내가 먼저 받쳐줄게
운명이 칼이 되어도
네 앞에서 막아설게

네가 길을 잃은 밤엔
내 심장을 등불 삼아
끝이 너를 부른대도
I’ll be your shield tonight

[Chorus]
I won’t let fate take you
끝까지 널 지킬게
검은 별이 쏟아져도
내가 모두 막을게

I won’t let fate break you
두려움은 내게 줘
너의 밤이 무너질 때
내가 하늘이 될게

[Post-Chorus]
Heaven Light
Heaven Light
너를 향해 타올라

Heaven Light
Heaven Light
어둠 위로 날아가

No more night
No more tears
내가 여기 있잖아

Heaven Light
Heaven Light
I won’t let fate take you

[Verse 2]
대운이 등을 돌려도
별자리가 엇갈려도
나는 그 예언보다
네 눈물을 믿어

뒤집힌 카드 끝에서
우린 답을 찾을 거야
불길한 징조마저
길의 불꽃이 되게

가장 깊은 위기 속에
가장 먼저 닿는 빛
천량의 이름처럼
늦지 않게 갈게

[Pre-Chorus 2]
네가 더는 못 걷겠다면
내 어깨를 내어줄게
세상이 널 지운대도
나는 너를 기억할게

운명이 틀렸다는 걸
내 사랑으로 증명해
흔들리는 네 하늘에
I’ll be your shield tonight

[Chorus]
I won’t let fate take you
끝까지 널 지킬게
검은 별이 쏟아져도
내가 모두 막을게

I won’t let fate break you
두려움은 내게 줘
너의 밤이 무너질 때
내가 하늘이 될게

[Post-Chorus]
Heaven Light
Heaven Light
너를 향해 타올라

Heaven Light
Heaven Light
어둠 위로 날아가

No more night
No more tears
내가 여기 있잖아

Heaven Light
Heaven Light
I won’t let fate take you

[Bridge]
은하수 아래 맹세해
너를 놓치지 않겠다고
네가 부르는 그 순간
어디든 달려가겠다고

사랑은 운명 앞에서
무릎 꿇는 게 아니야
너를 살리기 위해
내가 강해지는 거야

[Final Chorus]
I won’t let fate take you
끝까지 널 지킬게
검은 별이 쏟아져도
내가 모두 막을게

I won’t let fate break you
두려움은 내게 줘
너의 밤이 무너질 때
내가 하늘이 될게

[Final Post-Chorus]
Heaven Light
Heaven Light
너를 향해 타올라

Heaven Light
Heaven Light
어둠 위로 날아가

No more night
No more tears
내가 여기 있잖아

Heaven Light
Heaven Light
I won’t let fate take you

[Outro]
천량의 별 아래
너를 안고 말할게
운명이 널 부른대도
I won’t let fate take you`;
  }

  if (normalizedSongKey === "constellation") {
    return `[Intro]
No fate can break us
No night can take us
별이 흐려져도
I’ll be your constellation

[Verse 1]
오늘의 하늘은 cloudy
운세는 조용히 warning
길을 잃은 너의 눈빛
내 마음을 부르지

손금처럼 엉킨 거리
별자리도 어긋난 밤
괜찮아, 내가 먼저
너의 길을 찾을게

흐린 chart 위에
네 이름이 떠올라
어둠 속에서도
가장 선명한 sign

[Pre-Chorus]
네 하늘이 무너지면
내가 별을 이어줄게
끊어진 fate line 끝에
우리 이름 새겨둘게

두려움이 다가와도
손을 놓지 않을게
운명이 등을 돌려도
I’ll stand by your side

[Chorus]
No fate can break us
별을 넘어 달려가
No night can take us
너를 향해 빛나

I’ll be your constellation
길을 잃은 밤마다
네가 고개 들 수 있게
내 하늘을 다 줄게

[Post-Chorus]
Star by star
We light it up
Heart to heart
We rise above

No fate
No night
No fear
Tonight

I’ll be, I’ll be
Your constellation
I’ll be, I’ll be
Your constellation

[Verse 2]
은하수 아래 running
불안은 뒤로 fading
막힌 대운 위를 밟고
우린 다시 moving

타로가 뒤집혀도
답은 아직 남아 있어
깨진 별도 모이면
찬란한 길이 돼

네가 작아지는 날
내가 크게 외칠게
너는 아직 끝이 아냐
You’re my brightest fate

[Pre-Chorus 2]
네 계절이 흔들리면
내가 봄을 데려올게
차가워진 별빛 위에
따뜻한 꿈을 켤게

세상이 멀어진대도
난 더 가까이 갈게
운명이 벽을 세워도
I’ll break through the sky

[Chorus]
No fate can break us
별을 넘어 달려가
No night can take us
너를 향해 빛나

I’ll be your constellation
길을 잃은 밤마다
네가 고개 들 수 있게
내 하늘을 다 줄게

[Post-Chorus]
Star by star
We light it up
Heart to heart
We rise above

No fate
No night
No fear
Tonight

I’ll be, I’ll be
Your constellation
I’ll be, I’ll be
Your constellation

[Bridge]
가끔 나도 무서워
별 하나 없는 밤이면
하지만 네가 울 것 같아
나는 다시 강해져

은하수는 말해줘
혼자 빛나는 별은 없다고
서로를 이어줄 때
우린 하늘이 된다고

[Final Chorus]
No fate can break us
별을 넘어 달려가
No night can take us
너를 향해 빛나

I’ll be your constellation
길을 잃은 밤마다
네가 고개 들 수 있게
내 하늘을 다 줄게

[Final Post-Chorus]
Star by star
We light it up
Heart to heart
We rise above

No fate
No night
No fear
Tonight

I’ll be, I’ll be
Your constellation
I’ll be, I’ll be
Your constellation

[Outro]
No fate can break us
No night can take us
별이 사라져도
I’ll be your constellation`;
  }

  if (normalizedSongKey === "starry way") {
    return `[Intro]
Starry way
Starry way
흐린 밤이 열려
너에게로

[Verse 1]
오늘 운세는 cloudy
별 하나 보이지 않던 밤
멈춰 있던 내 마음 위로
네가 조용히 내려와

손금처럼 엉킨 길도
너를 따라 풀려가
불안했던 내일마저
이상하게 빛나

[Pre-Chorus]
닫힌 별자리 사이
네 이름이 떠올라
잃어버린 나의 용기
다시 숨을 쉬어

달의 모양이 바뀌듯
내 마음도 변해가
겁이 많던 나의 밤이
은하수로 번져가

[Chorus]
Starry way, starry way
너를 따라 걸어가
어두웠던 내 운명이
별빛처럼 깨어나

Starry way, starry way
하늘 끝을 건너가
너라는 은하수 아래
나는 다시 빛나

[Post-Chorus]
Oh, light it up
Light it up
별을 따라, 따라

Oh, rise me up
Rise me up
너와 날아, 날아

Starry way
Starry way
너라는 은하수
내 운명을 밝혀

[Verse 2]
깨진 차트 위에 피어난 sign
네가 오면 all align
막힌 대운도 열리는 듯해
내 심장이 말해, it’s time

타로 속에 숨은 answer
별빛처럼 번진 whisper
운명은 멀리 있는 게 아냐
네 손끝에 있어

흔들리던 yesterday
너를 만나 holiday
겁내던 나의 계절도
이젠 반짝이는 Milky Way

[Pre-Chorus 2]
닫힌 별자리 사이
네 이름이 떠올라
잃어버린 나의 용기
다시 숨을 쉬어

달의 모양이 바뀌듯
내 마음도 변해가
겁이 많던 나의 밤이
은하수로 번져가

[Chorus]
Starry way, starry way
너를 따라 걸어가
어두웠던 내 운명이
별빛처럼 깨어나

Starry way, starry way
하늘 끝을 건너가
너라는 은하수 아래
나는 다시 빛나

[Post-Chorus]
Oh, light it up
Light it up
별을 따라, 따라

Oh, rise me up
Rise me up
너와 날아, 날아

Starry way
Starry way
너라는 은하수
내 운명을 밝혀

[Bridge]
가끔은 나도 무서워
길이 보이지 않을 때
하지만 네가 웃으면
밤도 나를 밀어줘

별은 혼자 빛나지만
은하수는 함께 빛나
내 모든 내일 위에
너를 새기고 싶어

[Final Chorus]
Starry way, starry way
너를 따라 걸어가
어두웠던 내 운명이
별빛처럼 깨어나

Starry way, starry way
하늘 끝을 건너가
너라는 은하수 아래
나는 다시 빛나

[Final Post-Chorus]
Oh, light it up
Light it up
별을 따라, 따라

Oh, rise me up
Rise me up
너와 날아, 날아

Starry way
Starry way
너라는 은하수
내 운명을 밝혀

[Outro]
Starry way
Starry way
흐린 운세 끝에
너라는 별`;
  }

  if (normalizedSongKey === "달의 인력") {
    return `[Intro — Rhodes 피아노, 달빛처럼 고요히]
달이 차오르는 밤
어디선가 네가 걷고 있을 것 같아
같은 달을 보고 있을 것 같아

[Verse 1 — 솔로 보컬, 서정적으로]
은하수가 흐르는 방향으로
발길이 자꾸 향해
지도도 없이 걷는데
이상하게 길을 잃지 않아

달빛이 내 그림자를 끌고
어딘가로 데려가
그 끝에 네가 서 있을 것 같아
멈출 수가 없어

[Verse 2 — 두 번째 보컬, 결처럼 부드럽게]
손금을 따라 흐르는 달빛
오늘따라 선명해
누군가 미리 그어놓은 것처럼
이 선이 너에게 닿아

보름달이 뜨는 날이면
괜히 마음이 커져
설명할 수 없는 인력으로
네 쪽으로 기울어져

[Pre-Chorus — 3명 하모니, 몽환적으로]
우연이라 하기엔
너무 많이 겹쳐있어
같은 달 아래
같은 시간에
같은 방향을 보고 있었어

[Chorus — 5인 전원, 웅장하게 터짐]
은하수를 따라 흘러온 거야
달빛이 이어준 우리의 실
끊어질 것 같아도 끊어지지 않아
운명이란 게 이런 거잖아

보름달이 기억하고 있어
우리가 처음 같은 하늘을 본 날
그 달이 다시 차오를 때까지
나는 여기서 기다릴게

[Verse 3 — 래퍼, 나직하고 묵직하게]
달이 기우는 방향으로
그림자가 길게 늘어져
내 그림자 끝이 닿는 곳에
네 그림자가 시작돼

은하수는 원래 하나였대
빛이 흩어져 강이 된 거라고
우리도 그래 처음엔 하나였다가
이 생에서 다시 만난 거야

[Bridge — 피아노 솔로 위 보컬, 극도로 감성적]
달에게 물어봤어
우리가 왜 이렇게 끌리냐고
달은 아무 말 않고
그냥 더 밝게 빛났어

그게 답인 것 같아
설명이 필요 없는 것들이 있어
느껴지면 그만인
그런 사이 있잖아
우리처럼

[Pre-Final Chorus — 리드 보컬, 떨리듯이]
은하수 저편에서 출발했을
네가 여기까지 온 거잖아
나도 알지 못한 채로
너를 향해 걷고 있었던 거잖아

[Final Chorus — 키 올려, 오케스트라 풀 스웰]
은하수를 따라 흘러온 거야
달빛이 이어준 우리의 실
끊어질 것 같아도 끊어지지 않아
운명이란 게 이런 거잖아

보름달이 기억하고 있어
우리가 처음 같은 하늘을 본 날
그 달이 다시 차오를 때까지
나는 여기서 기다릴게

[Outro — 현악기 잔향, 보컬 위스퍼로 소멸]
달빛 아래서…
은하수 끝에서…
운명처럼…
너에게로…`;
  }

  if (normalizedSongKey === "은하수를 건너 니 곁으로 feat yeoni") {
    return `[Verse 1]
오늘의 별자리 속 넌 어디쯤 있어
은하수 저편에서 나를 기다려
사자자리 별빛이 내 손을 이끌어
오리온의 허리띠 세 개의 약속

[Pre-Chorus]
운명이란 이름의 별이 쏟아져
오늘 밤 하늘은 우리 편이야
점성술사도 몰랐던 우리 사이
천 년에 한 번의 별의 배열

[Chorus]
은하수를 건너 니 곁으로 가
별자리가 그린 우리의 운세
오늘 밤 Mercury가 속삭여줘
You're my destiny, 별빛 아래서
반짝반짝 빛나는 우리의 미래
Star sign이 말해 우린 연결돼
이 우주의 끝까지 너를 찾아가
은하수야 길을 밝혀줘

[Verse 2]
물병자리 새벽별 눈을 떠보면
쌍둥이자리처럼 둘이 하나돼
타로카드 뒤집어 The Star 카드야
우주가 보내준 너란 시그널

[Bridge]
목성이 내 마음을 크게 만들어
금성이 사랑으로 물들여줘
모든 행성이 정렬되는 그 순간
우린 하나가 돼 (We align, we shine)

[Final Chorus — 한 키 올려]
은하수를 건너 니 곁으로 가
별자리가 그린 우리의 운세
오늘 밤 운명의 문이 열려
You're my destiny, 별빛 아래서
천문도 위에 새겨진 우리 이름
Star sign이 말해 우린 하나야
이 우주가 끝나도 손을 잡을게
은하수야 영원히 빛나줘

[Outro]
✨ 별빛이 말해… 우린 운명이야 ✨`;
  }

  if (normalizedSongKey === "fatal code feat yeoni") {
    return `[Intro]
Fatal code
Fatal code
운명이 켜져
When I see you

[Verse 1]
오늘 밤 별들이 glitch
내 심장은 이미 switch
네 눈빛이 스친 뒤
내 운세가 바뀌지

손금 위에 없던 route
타로 속에 hidden truth
읽으려 할수록 더
너에게로 overload

도화처럼 켜진 light
홍염처럼 burning eyes
피하려고 한 순간
이미 너는 in my mind

[Pre-Chorus]
닫힌 fate line 위로
네 이름이 떠올라
불길한 예감마저
이상하게 빛나

사주엔 없던 signal
은하수 속 miracle
널 해석하려 해도
심장이 먼저 알아

[Chorus]
Fatal code, fatal code
너는 나를 깨워
Fatal code, fatal code
숨을 멎게 해

Fatal code, fatal code
읽을수록 깊어
눈빛 하나로 unlocked
너에게 falling down

[Post-Chorus]
Code, code, fatal code
너를 보면 danger glow
Code, code, fatal code
빠져들어 low, low

Click, click, turn me on
Tick, tick, all night long
Code, code, fatal code
너는 나의 fatal love

[Verse 2]
Reversed card, 뒤집힌 sign
불길함도 feels so fine
틀린 줄 알았던 line
너를 향해 realign

네 이름이 뜨는 screen
밤하늘의 secret scene
내 안의 모든 logic
너 때문에 disappear

별자리도 move, move
내 리듬도 groove, groove
네가 다가오는 순간
운명마저 lose, lose

[Pre-Chorus 2]
닫힌 fate line 위로
네 이름이 떠올라
위험한 이 끌림도
아름답게 빛나

사주엔 없던 signal
은하수 속 miracle
널 해석하려 해도
심장이 먼저 알아

[Chorus]
Fatal code, fatal code
너는 나를 깨워
Fatal code, fatal code
숨을 멎게 해

Fatal code, fatal code
읽을수록 깊어
눈빛 하나로 unlocked
너에게 falling down

[Post-Chorus]
Code, code, fatal code
너를 보면 danger glow
Code, code, fatal code
빠져들어 low, low

Click, click, turn me on
Tick, tick, all night long
Code, code, fatal code
너는 나의 fatal love

[Bridge]
처음 본 순간 알았어
이건 우연이 아니야
흐린 운세표 위에
네가 별처럼 떠올라

숨길수록 선명해
밀어낼수록 원해
내 운명을 실행해
You run my heart

[Final Chorus]
Fatal code, fatal code
너는 나를 깨워
Fatal code, fatal code
숨을 멎게 해

Fatal code, fatal code
읽을수록 깊어
눈빛 하나로 unlocked
너에게 falling down

[Final Post-Chorus]
Code, code, fatal code
너를 보면 danger glow
Code, code, fatal code
빠져들어 low, low

Click, click, turn me on
Tick, tick, all night long
Code, code, fatal code
너는 나의 fatal love

[Outro]
Fatal code
Fatal code
내 운명을 켜
When I see you`;
  }

  if (normalizedSongKey === "fate unlock") {
    return `[Intro]
Flip the sign
Open the night
운명의 문 앞에서
We unlock, we unlock

[Verse 1]
검은 도시 위로 번진 별
오늘 운세는 cloudy sky
불길한 예언이 웃어도
내 심장은 말해, not tonight

찢어진 차트 한가운데
숨겨진 길이 빛나
누가 정한 결말이라도
내 발로 다시 써

[Pre-Chorus]
역방향 카드도
뒤집으면 길이 돼
막힌 문 앞에서
나는 더 선명해져

흔들린 zodiac
어긋난 timeline
믿는 순간 시작돼
새로운 나의 highlight

[Chorus]
Fate unlock, 운명을 열어
닫힌 밤을 넘어 달려
별이 막아도 I go up
내일을 다시 가져와

Break the lock, 두려움 넘어
빛나는 답을 찾아가
정해진 운세는 없어
I choose, I choose my sky

[Post-Chorus]
Na-na-na, unlock my fate
Na-na-na, raise my name
Na-na-na, 별을 넘어
We rise, we rise tonight

Na-na-na, change my sign
Na-na-na, cross that line
Na-na-na, 운명 위로
We shine, we shine tonight

[Verse 2]
대운이 늦게 온대도
기다릴 생각은 없어
행운은 손금이 아니라
뛰는 심장 속에 있어

The Tower falls, I stand higher
The Moon lies, I burn brighter
The Star calls, I run faster
The World opens after disaster

운명표 위 troublemaker
불운마저 elevator
닫힌 길을 밟고 올라
나는 나를 증명해

[Pre-Chorus 2]
깨진 별자리도
이어 붙이면 은하가 돼
길을 잃은 밤도
우리 무대가 돼

흐려진 horoscope
숨겨진 sunrise
믿는 순간 시작돼
새로운 나의 highlight

[Chorus]
Fate unlock, 운명을 열어
닫힌 밤을 넘어 달려
별이 막아도 I go up
내일을 다시 가져와

Break the lock, 두려움 넘어
빛나는 답을 찾아가
정해진 운세는 없어
I choose, I choose my sky

[Bridge]
가끔은 나도 흔들려
별 하나 없는 밤이면
내가 믿던 모든 길이
사라진 것 같아서

하지만 내 안의 작은 불
아직 꺼지지 않았어
상처가 만든 별빛으로
다시 문을 열겠어

[Final Chorus]
Fate unlock, 운명을 열어
닫힌 밤을 넘어 달려
별이 막아도 I go up
내일을 다시 가져와

Break the lock, 두려움 넘어
빛나는 답을 찾아가
정해진 운세는 없어
I choose, I choose my sky

[Final Post-Chorus]
Na-na-na, unlock my fate
Na-na-na, raise my name
Na-na-na, 별을 넘어
We rise, we rise tonight

Na-na-na, change my sign
Na-na-na, cross that line
Na-na-na, 운명 위로
We shine, we shine tonight

[Outro]
Flip the sign
Open the night
정답은 내 안에
Fate unlock`;
  }

  if (normalizedSongKey === "별이 될 거야") {
    return `[Intro]
괜찮아
말하지 않아도 돼
오늘의 눈물도
별이 될 거야

[Verse 1]
강한 척하던 하루 끝에
불 꺼진 방에 앉아
웃는 법을 잊은 것처럼
조용히 숨을 쉬었지

누구나 길을 잃고
누구나 조금은 부족해
그래서 우리는 서로를
더 따뜻하게 알아봐

[Chorus]
괜찮아, 흘러가
아픈 날도 지나가
눈물은 밤을 건너
작은 별이 될 거야

괜찮아, 여기 있어
혼자 걷지 않아도 돼
부서진 마음까지
빛이 될 거야

[Verse 2]
확실한 답을 찾다가
더 멀리 헤맨 날도
네가 웃으며 말해줬지
천천히 가도 된다고

잃어버린 줄 알았던
내 안의 작은 용기
너는 먼저 알아봤어
아직 꺼지지 않았다고

[Chorus]
괜찮아, 흘러가
아픈 날도 지나가
눈물은 밤을 건너
작은 별이 될 거야

괜찮아, 여기 있어
혼자 걷지 않아도 돼
부서진 마음까지
빛이 될 거야

[Bridge]
언젠가 계절이 바뀌고
우리도 달라지겠지
그래도 이 마음 하나는
변하지 않게 해줘

네가 있어서
정말 다행이야
이 말이 내 안에서
등불처럼 빛나

[Final Chorus]
괜찮아, 흘러가
아픈 날도 지나가
눈물은 밤을 건너
작은 별이 될 거야

괜찮아, 여기 있어
혼자 걷지 않아도 돼
부서진 마음까지
빛이 될 거야

[Outro]
강한 척하지 않아도 돼
부족한 채로 와도 돼
너와 걷는 이 길 위에
우리 별이 될 거야`;
  }

  if (normalizedSongKey === "golden kindness") {
    return `[Intro]
Golden kindness
You light my way
비가 그친 거리 위로
I can bloom again

[Verse 1]
색을 잃은 꽃처럼
고개 숙인 날들이 있었어
매일 같은 눈물 속에
이유조차 잊어버린 채

하지만 너는 조용히
내 이름을 불러줬어
괜찮다는 그 한마디가
햇살처럼 번져왔어

[Pre-Chorus]
Yesterday was crying
But today is shining
흐린 마음 사이로
작은 빛이 피어나

Every pain has meaning
When your heart is near me
상처였던 시간도
길이 되어 날 이끌어

[Chorus]
너의 빛으로 I rise again
시든 꿈도 다시 피어나
눈물의 강을 지나온 나
이제 웃을 수 있어

Your kindness makes me brave
두려움은 멀어져 가
과거가 말해줘 someday
You can be your own hero

[Post-Chorus]
Oh, shine on, shine on
너의 마음이 날 깨워
Oh, shine on, shine on
Every day, I change my world

Oh, shine on, shine on
슬픔마저 빛이 돼
With your golden kindness
I can bloom again

[Verse 2]
비밀스러운 골목 끝
노란 불빛 아래 서 있던 나
답을 찾지 못한 채로
내 그림자만 바라봤어

넌 말했지, “천천히 가”
틀려도 괜찮다고
넘어진 자리마다
새로운 꽃이 핀다고

[Rap]
Step by step, I’m moving on
울던 어제는 not alone
네가 준 말 하나가
내 하루의 lucky tone

Misery to melody
Tears into memory
아팠던 순간까지
이젠 나의 energy

숨겨진 내 용기를
네가 먼저 알아봤어
작은 나의 마음에도
큰 하늘이 있다고

[Pre-Chorus 2]
Yesterday was crying
But today is shining
흐린 마음 사이로
작은 빛이 피어나

Every scar has meaning
When you stand beside me
무너졌던 시간도
나를 여기 데려와

[Chorus]
너의 빛으로 I rise again
시든 꿈도 다시 피어나
눈물의 강을 지나온 나
이제 웃을 수 있어

Your kindness makes me brave
두려움은 멀어져 가
과거가 말해줘 someday
You can be your own hero

[Post-Chorus]
Oh, shine on, shine on
너의 마음이 날 깨워
Oh, shine on, shine on
Every day, I change my world

Oh, shine on, shine on
슬픔마저 빛이 돼
With your golden kindness
I can bloom again

[Bridge]
때로는 다시 흔들려도
길을 잃은 밤이 와도
네가 남긴 따뜻한 말이
내 안에서 별이 돼

과거는 나를 붙잡는
그림자가 아니야
내가 나를 사랑하도록
비춰주는 지도야

[Final Chorus]
너의 빛으로 I rise again
시든 꿈도 다시 피어나
눈물의 강을 지나온 나
이제 웃을 수 있어

Your kindness makes me brave
두려움은 멀어져 가
과거가 말해줘 someday
You can be your own hero

[Final Post-Chorus]
Oh, shine on, shine on
너의 마음이 날 깨워
Oh, shine on, shine on
Every day, I change my world

Oh, shine on, shine on
슬픔마저 빛이 돼
With your golden kindness
I can bloom again

[Outro]
Golden kindness
You light my way
비가 그친 하늘 아래
I can bloom again`;
  }

  if (normalizedSongKey === "은하수 아래") {
    return `[Intro]
Under the Milky Way
별들이 말을 걸어
Tonight
너라는 빛을 따라가

[Verse 1]
길을 잃은 밤이었어
내 마음은 구름에 가려
어떤 별도 보이지 않아
혼자 멈춰 있던 그때

네가 조용히 다가와
내 이름을 불러줬어
괜찮다는 그 한마디에
내 우주가 다시 숨을 쉬어

[Pre-Chorus]
내 차트 속 빈칸처럼
비어 있던 마음 위에
너는 별자리처럼 와서
길을 그려줬어

흔들리는 나의 계절도
네 눈빛 하나면 괜찮아
운명이 멀리 있어도
너와 함께면 닿을 것 같아

[Chorus]
너는 나의 은하수
어두운 밤을 건너게 해
빛을 잃은 나의 별도
다시 타오르게 해

너는 나의 lucky star
무너진 나를 일으켜
겁이 나던 내일마저
너와 있으면 beautiful

[Post-Chorus]
Oh, shine on me
Shine on me
너의 빛을 따라가

Oh, stay with me
Stay with me
내 운명이 되어줘

Oh, shine on me
Shine on me
별빛처럼 안아줘

너라는 은하수 아래
I can rise again

[Verse 2]
별자리 운세처럼
하루가 자꾸 바뀌어도
너는 언제나 같은 자리
나를 지켜보는 Polaris

내가 약해지는 순간
넌 내 손을 잡아줘
“넌 할 수 있어” 그 말이
내 심장에 불을 켜

달의 위상처럼 변해도
사랑은 사라지지 않아
우리 둘의 궤도는
서로를 향해 돌아와

[Rap]
Check my stars, 너는 my sign
흔들리던 밤의 sunrise
불안했던 마음의 line
네가 와서 전부 align

사주의 길이 막혀도
별의 문이 닫혀도
너의 한마디면 I go
겁냈던 나를 넘어

You’re my Venus, my Jupiter
사랑과 행운의 messenger
네가 웃으면 universe
내일이 다시 beautiful

[Pre-Chorus 2]
내 차트 속 작은 불씨가
너를 만나 별이 됐어
어둠 속에 숨어 있던
나의 용기를 깨웠어

멀리 있는 꿈이라 해도
네가 있으면 두렵지 않아
운명이 나를 불러도
이젠 내가 대답할 거야

[Chorus]
너는 나의 은하수
어두운 밤을 건너게 해
빛을 잃은 나의 별도
다시 타오르게 해

너는 나의 lucky star
무너진 나를 일으켜
겁이 나던 내일마저
너와 있으면 beautiful

[Post-Chorus]
Oh, shine on me
Shine on me
너의 빛을 따라가

Oh, stay with me
Stay with me
내 운명이 되어줘

Oh, shine on me
Shine on me
별빛처럼 안아줘

너라는 은하수 아래
I can rise again

[Bridge]
가끔 세상이 차갑게
내 꿈을 가려도
네가 내 곁에 있으면
나는 나를 믿게 돼

별은 혼자 빛나지만
은하수는 함께 빛나
나의 모든 내일 위에
너를 새기고 싶어

You are my sky
You are my fate
수많은 밤을 지나도
내 답은 always you

[Final Chorus]
너는 나의 은하수
어두운 밤을 건너게 해
빛을 잃은 나의 별도
다시 타오르게 해

너는 나의 lucky star
무너진 나를 일으켜
겁이 나던 내일마저
너와 있으면 beautiful

[Final Post-Chorus]
Oh, shine on me
Shine on me
너의 빛을 따라가

Oh, stay with me
Stay with me
내 운명이 되어줘

Oh, shine on me
Shine on me
별빛처럼 안아줘

너라는 은하수 아래
I can rise again

[Outro]
Under the Milky Way
별들이 웃고 있어
Tonight
너와 나의 운세는 love`;
  }

  if (normalizedSongKey === "불꽃의 운명") {
    return `[Intro]
Fire sign
붉은 별이 떠올라
My fate is rising
너와 함께

[Verse 1]
밤하늘 끝에 번진 light
네가 온 순간 달라진 time
멈춰 있던 내 심장 위로
뜨거운 별 하나가 내려와

사주 위에 그어진 line
이제는 두렵지 않아
너를 만난 그날부터
내 운명은 앞을 봐

[Pre-Chorus]
도화처럼 피어난 눈빛
홍염처럼 빛나는 밤
내 안의 잠든 용기까지
너 때문에 깨어나

You’re my good luck
You’re my sunrise
흔들리던 나의 길 위에
네가 별처럼 떠올라

[Chorus]
Burn, burn, burn my love
운명이 불붙어
네 손을 잡고서
하늘 끝까지 올라가

Run, run, run with you
불꽃처럼 더 강하게
세상이 막아도
너와 난 더 빛나

You’re my fire sign
You’re my bright star
숨이 벅찰 만큼
뜨겁게 날 살려줘

[Post-Chorus]
La-la-la, light me up
La-la-la, lift me higher
La-la-la, 너와 나
Rising, rising, rising now

La-la-la, fate on fire
La-la-la, love is power
La-la-la, 이 순간
Burning, burning, burning bright

[Verse 2]
대운이 열린 것처럼
세상이 환해져 now
잃어버린 나의 계절도
너 때문에 돌아와

화기운이 춤을 춰
차가운 걱정은 melt down
사랑이란 이름의 용기
이제 난 멈추지 않아

Red star, new start
너는 내 마음의 restart
같은 꿈을 바라보면
어떤 길도 두렵지 않아

[Pre-Chorus 2]
별자리가 움직이고
은하수가 길을 열어
네가 웃는 그 한순간
모든 불안이 사라져

You’re my answer
You’re my future
운명이 나를 부른다면
너와 함께 갈 거야

[Chorus]
Burn, burn, burn my love
운명이 불붙어
네 손을 잡고서
하늘 끝까지 올라가

Run, run, run with you
불꽃처럼 더 강하게
세상이 막아도
너와 난 더 빛나

You’re my fire sign
You’re my bright star
숨이 벅찰 만큼
뜨겁게 날 살려줘

[Dance Break]
Fire, fire, fire sign
Love, love, love is light
Fate, fate, fate on fire
너와 함께 rise

붉게 타는 sky
심장 속의 siren
불꽃 끝에 너와 나
We shine, we shine, we shine

[Bridge]
가끔 길이 어두워도
내가 먼저 불을 켤게
네가 지치고 흔들릴 땐
내 어깨를 빌려줄게

운명이 바람처럼
우릴 시험한대도
내 답은 하나뿐이야
I choose you every time

[Final Chorus]
Burn, burn, burn my love
운명이 불붙어
네 손을 잡고서
하늘 끝까지 올라가

Run, run, run with you
불꽃처럼 더 강하게
세상이 막아도
너와 난 더 빛나

You’re my fire sign
You’re my bright star
숨이 벅찰 만큼
뜨겁게 날 살려줘

[Final Post-Chorus]
La-la-la, light me up
La-la-la, lift me higher
La-la-la, 너와 나
Rising, rising, rising now

La-la-la, fate on fire
La-la-la, love is power
La-la-la, 이 순간
Burning, burning, burning bright

[Outro]
Fire sign
붉은 별이 떠올라
My fate is rising
너와 함께`;
  }

  if (normalizedSongKey === "burn my fate") {
    return `[Intro]
Tick-tock, midnight
검은 달이 떠올라
No fear, no escape
I burn my fate tonight

[Verse 1]
어둠이 내려와 city light
숨죽인 거리는 black and white
거울 속 내 shadow가 말해
“넌 도망칠 수 없어 tonight”

카드 한 장 뒤집힌 순간
심장이 먼저 알아본 sign
The Fool처럼 뛰어들어
끝을 몰라도 I cross the line

[Pre-Chorus]
The Moon is calling
깊은 밤이 날 삼켜도
The Tower falling
무너진 길 위로 걸어

숨이 멎을 듯한 fear
하지만 난 멈추지 않아
운명이 칼을 겨눠도
I look it in the eye

[Chorus]
Burn my fate, burn my dread
검은 밤을 찢고 달려
끝이라 말한 그 순간
I wake up, I wake up again

Burn my fate, burn my dread
두려움마저 불태워
죽은 별빛 속에서도
I rise up, I rise up again

[Post-Chorus]
Na-na-na, burn it higher
Na-na-na, light my fire
Na-na-na, 운명 위로
Run, run, run through the night

Na-na-na, break the silence
Na-na-na, fight my shadow
Na-na-na, 새벽 끝에
I’m alive, I’m alive tonight

[Verse 2]
Death card, 겁내지 않아
끝은 또 다른 door
무너진 내 yesterday
오늘의 나를 깨워

The Devil whispers in my head
“포기해, 넌 이미 late”
I laugh back, no regret
내 심장에 불을 set

운세 따윈 lock me down 못 해
검은 별도 block me now 못 해
내가 뽑은 card 위에
내 이름을 새겨 넣어

[Pre-Chorus 2]
The Star is rising
희미해도 난 보여
The World is waiting
마지막 문을 열어

상처는 나의 proof
두려움은 나의 fuel
운명이 날 삼켜도
I make it mine tonight

[Chorus]
Burn my fate, burn my dread
검은 밤을 찢고 달려
끝이라 말한 그 순간
I wake up, I wake up again

Burn my fate, burn my dread
두려움마저 불태워
죽은 별빛 속에서도
I rise up, I rise up again

[Post-Chorus]
Na-na-na, burn it higher
Na-na-na, light my fire
Na-na-na, 운명 위로
Run, run, run through the night

Na-na-na, break the silence
Na-na-na, fight my shadow
Na-na-na, 새벽 끝에
I’m alive, I’m alive tonight

[Rap Break]
Tick-tock, 시간이 나를 쫓아
Blackout, 도시가 숨을 멈춰
Countdown, 끝이라 믿은 순간
내 안의 불꽃이 다시 번져

Flip that card, no mercy
Fate line, I rewrite it
Shadow world, I dive in
겁을 삼켜, I ignite it

[Dance Break]
Burn, burn, burn my fate
Run, run, run this maze
Turn, turn, turn that card
Light, light, light my heart

No fear, no more
No fate, no chain
새벽이 오기 전에
I burn it all again

[Bridge]
사실 나도 무서웠어
끝이 나를 부를 때
차가운 밤 한가운데
혼자 남겨진 것 같아

하지만 어둠 끝에서
작은 불빛이 말해
“살아있다는 건
다시 선택하는 것”

[Final Chorus]
Burn my fate, burn my dread
검은 밤을 찢고 달려
끝이라 말한 그 순간
I wake up, I wake up again

Burn my fate, burn my dread
두려움마저 불태워
죽은 별빛 속에서도
I rise up, I rise up again

[Final Post-Chorus]
Na-na-na, burn it higher
Na-na-na, light my fire
Na-na-na, 운명 위로
Run, run, run through the night

Na-na-na, break the silence
Na-na-na, fight my shadow
Na-na-na, 새벽 끝에
I’m alive, I’m alive tonight

[Outro]
Tick-tock, sunrise
검은 달이 사라져
No fear, no escape
I burned my fate tonight`;
  }

  if (normalizedSongKey === "fate rider") {
    return `[Intro - Member 2]
Yeah
Fate Rider
운명이 날 불러
But I don’t kneel
I ride it

[Verse 1 - Member 2]
검은 밤 위에 뜬 red star
내 이름을 새긴 sign
막으려 해도 못 막아
이미 바뀌었어 my time

[Verse 1 - Member 5]
사주 위에 그어진 line
그 선을 밟고 올라가
흉한 별이 날 노려도
내 눈빛은 더 차가워

[Verse 1 - Member 3 Rap]
대운이 와, 판을 뒤집어
겁먹은 어제는 전부 지워
천살처럼 날카롭게 cut
막힌 길도 부숴, no stop

운세가 말해, “조심해”
난 웃고 말해, “watch me”
별들이 등 뒤에 붙어
오늘 밤 내가 destiny

[Pre-Chorus - Member 4]
은하수 끝에 걸린 꿈
손끝에 닿을 듯 멀어도
숨이 차오를수록
내 심장은 더 크게 burn

[Pre-Chorus - Member 1]
무너진 별빛 사이로
너의 목소리가 들려
운명이 나를 묶어도
I break it, I make it mine

[Chorus - All]
대운을 타고 올라
하늘 끝까지 ride
별이 막아도 올라
I’m never gonna die

Fate, fate, fate, I ride
겁 없이 불타는 night
운명이 나를 물어도
I bite it back tonight

[Post-Chorus - All / Member 5]
Ta-Ta-Ta, 대운 타
Ta-Ta-Ta, 더 올라
Da-da-da, fate on fire
We ride, we ride, we ride

Ta-Ta-Ta, 별을 타
Ta-Ta-Ta, 다 뚫어
Da-da-da, fate on fire
We rise, we rise, we rise

[Verse 2 - Member 3 Rap]
Check my chart, 안 봐도 villain
위험할수록 더 올라가는 feeling
도화는 blade, 귀인은 flame
내 길을 막으면 전부 game

겁재 같은 밤이 날 시험해도
편관 같은 압박이 날 눌러도
난 꺾이지 않아, 더 세게 가
내 운의 목덜미를 잡아

[Verse 2 - Member 2]
내 안의 짐승이 깨어나
낮은 숨으로 널 불러
차가운 별자리 아래
뜨겁게 나를 걸어

[Verse 2 - Member 5]
은하가 갈라진대도
난 내 길을 알아봐
누가 뭐라 해도
I was born to be the one

[Pre-Chorus 2 - Member 4]
붉은 별 하나가 떨어져
내 심장 위에 박혀
상처가 빛이 되는 밤
I never run away

[Pre-Chorus 2 - Member 1]
무너진 운의 파도도
나를 삼키지는 못해
운명이 나를 묶어도
I break it, I make it mine

[Chorus - All]
대운을 타고 올라
하늘 끝까지 ride
별이 막아도 올라
I’m never gonna die

Fate, fate, fate, I ride
겁 없이 불타는 night
운명이 나를 물어도
I bite it back tonight

[Post-Chorus - All / Member 5]
Ta-Ta-Ta, 대운 타
Ta-Ta-Ta, 더 올라
Da-da-da, fate on fire
We ride, we ride, we ride

Ta-Ta-Ta, 별을 타
Ta-Ta-Ta, 다 뚫어
Da-da-da, fate on fire
We rise, we rise, we rise

[Dance Break - Member 3 / All]
Ride, ride, ride
Fate Rider
Burn, burn, burn
Fate on fire

운명을 밟고
하늘을 찢고
별들을 깨워
We rise higher

[Bridge - Member 1]
사실 나도 두려웠어
무너질까 봐
내 운이 나를 버린 밤엔
혼자 울었어

[Bridge - Member 4]
근데 저 별들이 말해
아직 끝난 게 아냐
상처도 나의 별자리
이제 내가 빛나

[Bridge - Member 2]
나를 꺾으려던 밤도
내가 삼켜낼 거야
운명이 칼을 겨눠도
난 웃으며 걸어가

[Final Chorus - All]
대운을 타고 올라
하늘 끝까지 ride
별이 막아도 올라
I’m never gonna die

Fate, fate, fate, I ride
겁 없이 불타는 night
운명이 나를 물어도
I bite it back tonight

[Final Post-Chorus - All / Member 1 Ad-lib]
Ta-Ta-Ta, 대운 타
Ta-Ta-Ta, 더 올라
Da-da-da, fate on fire
We ride, we ride, we ride

Ta-Ta-Ta, 별을 타
Ta-Ta-Ta, 다 뚫어
Da-da-da, fate on fire
We rise, we rise, we rise

[Outro - Member 2]
Fate Rider
운명은 나를 못 가둬
별이 꺼진다 해도
I ride my own sky`;
  }

  if (normalizedSongKey === "draw my fate") {
    return `[Intro]
Shuffle the night
Pick a card
운명은 아직 몰라
Draw my fate

[Verse 1 - Member 2]
Golden street, midnight sign
불빛 아래 뒤집힌 card
오늘의 luck, maybe lie
진짜 답은 deep inside

[Verse 1 - Member 4]
The Fool처럼 걸어가
길을 몰라도 괜찮아
넘어져도 다시 rise
새로운 route가 열려 now

[Verse 1 - Member 5]
달빛은 조용히 말해
“겁내지 마, choose your way”
손끝에 닿은 한 장의 fate
내일이 바뀌는 순간

[Pre-Chorus - Member 1]
The Tower falls down
무너진 밤 위로
숨겨진 별빛이 보여
I can see the truth

[Pre-Chorus - Member 2]
The Devil whispers
“넌 못 벗어나”
But I just smile and say
I’m not afraid tonight

[Chorus - All]
Draw my fate, 운명을 뒤집어
어둠 속에 숨은 나를 깨워
One more chance, 다시 빛을 따라
I will find my way, my way

Turn the card, 내일을 바꿔
정해진 답은 없어 no more
Shine my heart, 진실을 향해
I will run, run, run to the truth

[Post-Chorus - All / Member 4]
Na-na-na, draw my fate
Na-na-na, change my way
Na-na-na, 별빛 아래
We go, we go, we go

Na-na-na, flip that card
Na-na-na, light my heart
Na-na-na, 운명 위로
We glow, we glow, we glow

[Verse 2 - Member 3 Rap]
Ace of Wands, 불이 붙어
막힌 길도 내가 뚫어
Wheel of Fortune, spin it fast
어제의 shadow, now it’s past

Death card 나와도 don’t be scared
끝이 아닌 new reset
Hanged Man처럼 멈춘대도
생각을 뒤집어, get it back

[Verse 2 - Member 2]
거울 속의 나를 봐
모르는 얼굴 같아
근데 이상하게 tonight
조금 더 자유로워

[Verse 2 - Member 5]
The Moon 아래 감춘 fear
The Sun이 밝히는 real
타로는 답이 아니라
나를 여는 secret key

[Pre-Chorus 2 - Member 1]
The Lovers call me
선택의 문 앞에
흔들리는 심장까지
전부 나의 sign

[Pre-Chorus 2 - Member 4]
The Star is rising
멀리 빛나도
손을 뻗는 순간
I’m already on my way

[Chorus - All]
Draw my fate, 운명을 뒤집어
어둠 속에 숨은 나를 깨워
One more chance, 다시 빛을 따라
I will find my way, my way

Turn the card, 내일을 바꿔
정해진 답은 없어 no more
Shine my heart, 진실을 향해
I will run, run, run to the truth

[Post-Chorus - All / Member 4]
Na-na-na, draw my fate
Na-na-na, change my way
Na-na-na, 별빛 아래
We go, we go, we go

Na-na-na, flip that card
Na-na-na, light my heart
Na-na-na, 운명 위로
We glow, we glow, we glow

[Dance Break - Member 3 / All]
Flip, flip, flip that card
Run, run, run this night
Truth, truth, find my star
We glow in the golden light

Major, minor, arcana
숨겨진 나를 찾아가
Shadow, mirror, destiny
Now I’m free, now I’m me

[Bridge - Member 1]
가끔은 나도 무서워
내 길이 틀릴까 봐
하지만 틀린 카드도
나를 여기 데려왔잖아

[Bridge - Member 2]
운명은 벽이 아냐
문이 될 수도 있어
한 장을 다시 뒤집어
I choose who I become

[Bridge - Member 5]
The World is waiting
마지막 장을 넘겨
끝이라고 믿은 순간
새로운 내가 보여

[Final Chorus - All]
Draw my fate, 운명을 뒤집어
어둠 속에 숨은 나를 깨워
One more chance, 다시 빛을 따라
I will find my way, my way

Turn the card, 내일을 바꿔
정해진 답은 없어 no more
Shine my heart, 진실을 향해
I will run, run, run to the truth

[Final Post-Chorus - All / Member 1 Ad-lib]
Na-na-na, draw my fate
Na-na-na, change my way
Na-na-na, 별빛 아래
We go, we go, we go

Na-na-na, flip that card
Na-na-na, light my heart
Na-na-na, 운명 위로
We glow, we glow, we glow

[Outro - Member 5]
Shuffle the night
Pick a card
정답은 없어
I draw my fate`;
  }

  if (normalizedSongKey === "scarlet orbit") {
    return `[Intro - Member 2]
Yeah
Milky Way above us
Scarlet Orbit
너의 별이 날 불러
I can’t get away

[Verse 1 - Member 2]
밤하늘 끝에 번진 sign
네 이름이 먼저 빛나
숨죽인 내 심장 위로
붉은 별 하나가 떨어져

[Verse 1 - Member 4]
차갑던 나의 궤도는
네 눈빛에 방향을 잃어
피하려 할수록 더 가까워져
넌 내 forbidden star

[Verse 1 - Member 5]
별자리 사이 감춰진 line
처음부터 정해진 듯해
손끝이 스친 그 순간
내 우주는 너로 기울어

[Pre-Chorus - Member 1]
홍란처럼 흔들린 밤
천희처럼 웃는 너의 eyes
우연이라 하기엔 너무 깊어
이미 새겨진 fate line

[Pre-Chorus - Member 4]
화록처럼 달콤하게
화권처럼 날 무너뜨려
화기처럼 아픈데도
I want you more and more

[Chorus - All]
돌고 돌아 네게로
은하 끝을 건너도
별이 나를 밀어
너에게로 falling now

너는 나의 galaxy
나는 너의 gravity
벗어나려 할수록
더 깊이 빠져가

[Post-Chorus - All / Member 5]
Oh na na na
너의 은하에 갇혀
Oh na na na
숨이 멎게 아름다워

Oh na na na
사랑의 성좌가 타올라
Burn it, burn it, burn it up
너에게로 falling now

[Verse 2 - Member 3 Rap]
Check my fate, 이미 적혀 있어
네가 뜬 순간 밤이 뒤집혔어
Tan Lang, 끌림은 dangerous
Lian Zhen, 눈빛은 venomous

도망쳐도 rewind
너의 gravity, losing my mind
별빛처럼 번지는 desire
심장 안에 set a fire

[Verse 2 - Member 2]
넌 나를 망칠 수도 있어
근데 또 나를 살릴 수도 있어
위험한 걸 알면서도
난 네 쪽으로 걸어

[Verse 2 - Member 5]
끝없는 은하수 아래
너와 난 서로를 알아봐
천 년을 돌아온 듯한
뜨거운 déjà vu

[Pre-Chorus 2 - Member 4]
별들이 조용히 움직여
우리의 밤을 이어
한 번 스친 사랑이 아냐
운명이 된 fever

[Pre-Chorus 2 - Member 1]
화록처럼 달콤하게
화권처럼 날 무너뜨려
화기처럼 아픈데도
I want you more and more

[Chorus - All]
돌고 돌아 네게로
은하 끝을 건너도
별이 나를 밀어
너에게로 falling now

너는 나의 galaxy
나는 너의 gravity
벗어나려 할수록
더 깊이 빠져가

[Post-Chorus - All / Member 5]
Oh na na na
너의 은하에 갇혀
Oh na na na
숨이 멎게 아름다워

Oh na na na
사랑의 성좌가 타올라
Burn it, burn it, burn it up
너에게로 falling now

[Dance Break - Member 3 / All]
Zi wei, zi wei
밤의 별이 깨어나
Scarlet, orbit
우릴 다시 묶어놔

Zi wei, zi wei
은하수가 타올라
Fatal, gravity
너에게로 burn

[Bridge - Member 1]
혹시 이 사랑이
나를 다 태운대도
난 너를 택할래
끝까지 안을래

[Bridge - Member 4]
무너진 별빛 속에서도
너 하나만 보여
내 모든 우주가 말해
The answer is you

[Bridge - Member 2]
상처도 운명이라면
피하지 않을게
너라는 밤에 갇혀도
난 빛을 잃지 않아

[Final Chorus - All]
돌고 돌아 네게로
은하 끝을 건너도
별이 나를 밀어
너에게로 falling now

너는 나의 galaxy
나는 너의 gravity
벗어나려 할수록
더 깊이 빠져가

[Final Post-Chorus - All / Member 1 Ad-lib]
Oh na na na
너의 은하에 갇혀
Oh na na na
숨이 멎게 아름다워

Oh na na na
사랑의 성좌가 타올라
Burn it, burn it, burn it up
너에게로 falling now

[Outro - Member 2]
Milky Way above us
끝내 나를 바꾼 love
별이 사라진대도`;
  }

  if (normalizedSongKey === "gisin out yongsin in") {
    return `[Verse 1]
I checked my face today
No more weird little weight
That old vibe missed its train
I’m not carrying that

Salt on the sleeve, fresh tea
I pick the seed I need
One glance, then I’m free
That’s my kind of magic

[Pre-Chorus]
Switch it, switch it, watch me glow
Low-key storm? I say no
I know what I’m made for
Step by step, I choose more

[Chorus]
Gisin out, yongsin in
Gisin out, yongsin in
Cute cut clean, let the good start
Gisin out, yongsin in

(Out, in)
(Out, in)
I bless my lane, I win
Gisin out, yongsin in

[Verse 2]
My eyes got a sharper shine
My smile says, "I’m just fine"
No dark cloud on my mind
I keep it soft, keep it prime

Good luck in my tote bag
Fresh fate in a pink tag
I don’t chase what drags back
I just turn and snap back

[Pre-Chorus]
Switch it, switch it, watch me glow
Low-key storm? I say no
I know what I’m made for
Step by step, I choose more

[Chorus]
Gisin out, yongsin in
Gisin out, yongsin in
Cute cut clean, let the good start
Gisin out, yongsin in

(Out, in)
(Out, in)
I bless my lane, I win
Gisin out, yongsin in

[Bridge]
If it feels heavy, I release
If it feels noisy, I leave
I’m not scared to be seen
I’m the calm in my scene

[Final Chorus]
Gisin out, yongsin in
Gisin out, yongsin in
Cute cut clean, let the good start
Gisin out, yongsin in

(Out, in)
(Out, in)
I bless my lane, I win
Gisin out, yongsin in`;
  }

  if (normalizedSongKey === "devil s draw") {
    return `[Intro - BLOOM, seductive whisper]
Pick one
Don’t look away
The card is watching you

[LUNA - low rap talk]
Black deck
Red heart
위험한 sign
Devil’s draw

[YEONI - main vocal]
손끝에 닿은 순간
내 밤이 너로 물들어

[Verse 1 - YEONI]
검은 카드 위에 번진
짙은 rose perfume
The Lovers마저 숨을 죽인
낯선 midnight room

The Moon은 비밀을 감추고
The Star는 길을 잃어
내가 피하려던 이름이
너의 눈빛에 떠올라

[BLOOM - airy vocal]
조심하라 말할수록
더 가까워지는 걸
운명은 달콤한 얼굴로
금지된 문을 열어

[LUNA - chic rap]
Shuffle slow, 심장은 tempo
너를 보면 흐려져 my halo
The Devil card, 위험한 angle
But I like that, 아슬한 shadow

High Priestess도 읽지 못해
내가 어디까지 갈지
철벽은 Tower처럼 무너져
네 앞에서 tragic

[Pre-Chorus - YEONI]
도망치려 할수록
더 깊이 끌려가
끝을 알면서도 난
다시 너를 골라

[BLOOM - harmony]
Don’t save me tonight
나를 흔들어

[LUNA - low ad-lib]
Too late, too close
I’m under your spell

[Chorus - ALL]
Devil’s draw
나를 당겨와
붉은 카드처럼
심장을 태워놔

Devil’s draw
눈을 뗄 수 없어
위험할수록 더
아름다워져

[YEONI - main hook]
You’re my forbidden tarot
끝없이 falling narrow

[BLOOM - high hook]
Love me dark, love me slow

[LUNA - rap tag]
The Devil, The Lovers
둘 다 너로 보여

[Verse 2 - LUNA, charismatic rap]
Velvet black, candle light
입술 끝에 warning sign
착한 척은 그만둘래
오늘 밤은 borderline

Wheel of Fortune 돌아가
멈춘 곳은 네 silhouette
내 이성은 fold
감정들은 all in bet

The Magician 손짓처럼
날 바꾸는 illusion
네가 웃는 그 순간
시작되는 revolution

No angel, no escape
그래서 더 끌리네
나를 망칠지도 몰라
근데 너무 빛나네

[BLOOM - smooth vocal]
달콤한 속삭임에
내 이름이 녹아내려
겁이 나는 이 떨림도
이상하게 아름다워

[Pre-Chorus 2 - YEONI]
이 사랑이 독이라면
한 모금 더 마실래
상처가 될 걸 알아도
너를 놓지 못해

[BLOOM - harmony]
Don’t save me tonight
나를 데려가

[LUNA - low talk]
No more question
I choose obsession

[Chorus - ALL]
Devil’s draw
나를 당겨와
붉은 카드처럼
심장을 태워놔

Devil’s draw
눈을 뗄 수 없어
위험할수록 더
아름다워져

[YEONI - main hook]
You’re my forbidden tarot
끝없이 falling narrow

[BLOOM - high hook]
Love me dark, love me slow

[LUNA - rap tag]
The Devil, The Lovers
둘 다 너로 보여

[Dance Break - LUNA, rap chant]
Flip it, flip it
Devil card
Kiss it, burn it
Leave a scar

Love me, curse me
Make it art
검은 밤에 피는 heart

[BLOOM - chant]
La-la-la, dangerous
La-la-la, beautiful

[YEONI - ad-lib]
너라는 운명 속에 falling

[Bridge - YEONI, emotional vocal]
가장 깊은 어둠에서
가장 선명한 널 봐
빛이라 부를 수 없어도
난 너를 따라가

[BLOOM - soft harmony]
사라질 듯 빛나는
검은 별의 romance

[LUNA - soft rap]
나를 잃는 게 아니라
새로운 나를 만난 night

[Final Chorus - ALL, grand and fatal]
Devil’s draw
나를 당겨와
붉은 카드처럼
심장을 태워놔

[YEONI - powerful main vocal]
Devil’s draw
눈을 뗄 수 없어
위험할수록 더
아름다워져

[BLOOM - high ad-lib]
Love me dark, love me slow
You’re my fatal miracle

[LUNA - final rap tag]
The Devil, The Lovers
결국 답은 너야

[YEONI - ending vocal]
Devil’s draw
너를 뽑았어`;
  }

  if (normalizedSongKey === "fate couture") {
    return `[Intro - LUNA, low whisper rap]
운명은 조용히 문을 열어
Black diamond night
We don’t chase
We choose

[BLOOM - elegant whisper]
Destiny loading
달빛이 켜져

[YEONI - main vocal]
오늘 밤 내가 나를 깨워
Fate couture

[Verse 1 - YEONI]
검은 하늘 위로 번진 silver light
내 이름을 부르는 sign
흔들리던 어제는 burn it out
새로운 내가 올라와

[BLOOM - soft vocal]
거울 속의 눈빛이 달라
더는 숨지 않아
반짝이는 예감이 말해
이 밤은 나의 것

[LUNA - chic rap]
운명선 위를 걸어 runway
발끝마다 바뀌는 scene
누가 정해준 답은 no thanks
내가 고른 길이 main

[Pre-Chorus - YEONI]
조용히 숨죽인 별들이
내 심장에 불을 켜
피할 수 없는 순간이면
더 아름답게 맞서

[BLOOM - airy harmony]
Moonlight on my skin
빛이 나, dangerous

[LUNA - low ad-lib]
No fear, no doubt
I own my fate

[Chorus - ALL]
Fate couture
눈부시게 걸어가
Fate couture
내 운명을 입어 난

Black card, gold heart
빛나는 내 aura
Fate couture
세상이 날 기억해

[YEONI - main hook]
I choose my destiny
I choose my fantasy

[BLOOM - high hook]
Shine, shine, royal sign

[LUNA - rap tag]
운명 위에 올라
My fate, my crown

[Verse 2 - LUNA, charismatic rap]
Tick tick, 시간마저 bow down
내 등장에 바뀌는 countdown
차가운 city, 뜨거운 spotlight
난 어둠 속에서도 top line

Diamond step, velvet pace
시선 위를 걷는 grace
운이 나를 시험해도
나는 웃고 판을 reset

No lucky, I make it
No maybe, I take it
운명은 내 손끝에서
Signature로 새겨

[BLOOM - chic vocal]
시선들이 멈춰 서
누구보다 선명해
가장 깊은 밤일수록
나는 더 빛나네

[Pre-Chorus 2 - YEONI]
정해진 길이라 해도
난 그대로 걷지 않아
별들이 짜놓은 무대 위
내 방식대로 춤춰

[BLOOM - harmony]
Moonlight in my eyes
눈부셔, glamorous

[LUNA - low talk]
This is not luck
This is destiny

[Chorus - ALL]
Fate couture
눈부시게 걸어가
Fate couture
내 운명을 입어 난

Black card, gold heart
빛나는 내 aura
Fate couture
세상이 날 기억해

[YEONI - main hook]
I choose my destiny
I choose my fantasy

[BLOOM - high hook]
Shine, shine, royal sign

[LUNA - rap tag]
운명 위에 올라
My fate, my crown

[Dance Break - LUNA, rap chant]
Black, black diamond
Gold, gold timing
Step, step higher
Fate on fire

[BLOOM - chant]
La-la-luxury
La-la-destiny

[YEONI - ad-lib]
운명이 나를 깨워

[LUNA - chant]
Crown up
Lights up
We don’t stop

[Bridge - YEONI, grand vocal]
넘어졌던 밤들도
나를 위해 빛났어
상처마저 보석처럼
내 왕관에 박혔어

[BLOOM - soft harmony]
눈 감아도 보여
내가 갈 길이

[LUNA - soft rap]
끝이라고 적힌 문 앞에
나는 시작이라 써

[Final Chorus - ALL, grand and powerful]
Fate couture
눈부시게 걸어가
Fate couture
내 운명을 입어 난

[YEONI - powerful main vocal]
Black card, gold heart
빛나는 내 aura
Fate couture
세상이 날 기억해

[BLOOM - high ad-lib]
Shine, shine, royal sign
I’m the one, I’m the light

[LUNA - final rap tag]
운명 위에 올라서
My fate, my crown

[YEONI - ending vocal]
Fate couture
내가 고른 운명`;
  }

  if (normalizedSongKey === "velvet tarot") {
    return `[Intro - BLOOM, elegant whisper]
Shuffle the night
Pick your fate
Velvet tarot
Love is awake

[LUNA - low rap talk]
Black card, moonlight
운명은 highlight
뒤집는 순간
You’re my sign

[YEONI - main vocal]
달빛이 내려앉은 밤
내 마음이 너를 불러

[Verse 1 - YEONI, smooth main vocal]
검은 테이블 위로
은빛 별이 번져
조용히 섞인 카드가
내 비밀을 먼저 열어

The Moon은 날 감추고
The Star는 널 비춰
The Lovers 한 장 끝에서
우리 이름이 빛나

[BLOOM - soft high vocal]
숨길수록 더 선명해
반짝이는 lucky trace
손끝에 닿은 예감이
너에게 날 데려가

[Pre-Chorus - YEONI, emotional lift]
운명은 말없이
내 곁에 앉아
한 장의 카드처럼
너를 보여줘

[BLOOM - airy harmony]
깊은 밤의 sign
놓칠 수 없어

[LUNA - low ad-lib]
Flip it slow
We already know

[Chorus - ALL, luxurious dance hook]
Velvet tarot
Flip my heart, let it glow
오늘 밤의 love fortune
답은 너라고

Velvet tarot
Moonlight, make it flow
운명이 고른 card
너를 향해 show

[YEONI - main hook]
Love me like a star
나를 비춘 너니까

[BLOOM - high hook]
Shine on me, shine on me

[LUNA - rap tag]
카드 끝에 너와 나
Perfect arcana

[Verse 2 - LUNA, refined rap]
Major arcana
Scene은 panorama
The Empress처럼 glow
분위기는 drama

Wheel of Fortune 돌아
멈춘 곳은 your eyes
차갑던 내 마음도
너 앞에선 sunrise

High Priestess whisper
다 알고 있대
내가 숨긴 문장까지
전부 읽어냈대

Tower 무너져도
겁낼 필요 없어
너와 나의 spread 위엔
별빛만 남았어

[Post-Rap - BLOOM, cute but classy]
살짝 웃어도 들켜
눈빛만 봐도 알죠
카드보다 정확한 건
두근대는 heart code

[Pre-Chorus 2 - YEONI]
마지막 한 장에
네 이름이 떠
이건 우연보다
더 깊은 answer

[BLOOM - harmony]
운명 같은 night
나를 데려가

[LUNA - low talk]
No more question
You’re my direction

[Chorus - ALL]
Velvet tarot
Flip my heart, let it glow
오늘 밤의 love fortune
답은 너라고

Velvet tarot
Moonlight, make it flow
운명이 고른 card
너를 향해 show

[YEONI - main hook]
Love me like a star
나를 비춘 너니까

[BLOOM - high hook]
Shine on me, shine on me

[LUNA - rap tag]
카드 끝에 너와 나
Perfect arcana

[Dance Break - LUNA, stylish rap chant]
Shuffle, shuffle
Silk and sparkle
Flip it, flip it
Heart unlock it

Moon card, star card
Love card, my card
운세는 luxury
너로 된 fantasy

[BLOOM - chant]
La-la-la, velvet sign
La-la-la, you are mine

[YEONI - ad-lib]
달빛 속에 falling

[Bridge - YEONI, dreamy premium vocal]
수많은 카드 사이
나를 찾은 한 사람
가장 어두운 밤에도
너는 빛이 돼

[BLOOM - soft harmony]
The Star is blooming
내 맘이 피어나

[LUNA - soft rap]
운명은 조용히 말해
이 사랑은 rare design

[Final Chorus - ALL, grand and polished]
Velvet tarot
Flip my heart, let it glow
오늘 밤의 love fortune
답은 너라고

[YEONI - powerful main vocal]
Velvet tarot
Moonlight, make it flow
운명이 고른 card
너를 향해 show

[BLOOM - high ad-lib]
Shine on me, shine on me
You’re my lucky fantasy

[LUNA - final rap tag]
The Lovers, The Star
결국 answer is you

[YEONI - ending vocal]
Velvet tarot
너를 뽑았어`;
  }

  if (normalizedSongKey === "달의 궤도선") {
    return `[Intro - BLOOM, soft whisper]
Twenty-seven nights
달이 우리를 읽어
어떤 이름의 사랑일까

[LUNA - low rap talk]
안괴처럼 위험해도
영친처럼 깊게 남아
Check the moon
We’re already in sync

[YEONI - main vocal]
너를 본 순간
밤의 궤도가 바뀌어

[Verse 1 - YEONI]
조용히 번진 달빛 아래
낯선 예감이 깨어나
처음 본 눈빛인데 왜
오래전부터 알던 것 같아

말하지 않아도 가까워
숨결 사이로 이어져
우연이라 부르기엔
너무 정확한 timing

[BLOOM - airy vocal]
스물일곱 개의 밤 중에
우린 같은 빛을 골라
내 마음 가장 깊은 곳에
네 이름이 떠올라

[LUNA - chic rap]
안괴면 dangerous
그래도 끌려가
영친이면 effortless
말없이 스며와

우쇠처럼 아프게
기억에 남아도
업태처럼 다시 만나
끝내 못 지나쳐

[Pre-Chorus - YEONI]
도망치려 할수록
더 선명해지는 sign
달은 이미 알고 있어
우리의 hidden line

[BLOOM - harmony]
Hold me in the moon phase
놓치지 않게

[LUNA - low ad-lib]
No more maybe
This is chemistry

[Chorus - ALL]
Twenty-seven nights
달이 정한 love type
위험해도 아름다워
너와 나의 moon sign

Twenty-seven nights
끌림은 satellite
멀어져도 다시 돌아
너에게로 fall inside

[YEONI - main hook]
You’re my lunar chemistry
끝나지 않을 mystery

[BLOOM - high hook]
Shine on me, quietly

[LUNA - rap tag]
안괴든 영친이든
답은 너와 나의 gravity

[Verse 2 - LUNA, refined rap]
위성처럼 서로 다른 길
근데 자꾸 마주쳐
명처럼 닮은 그림자
내 안쪽을 건드려

성숙한 척해도 freeze
네 한마디에 release
차가운 밤의 rhythm 위
내 심장은 on repeat

궁합이란 말보다
더 깊은 건 vibe
설명 못 해도 알아
너는 나의 moonlight

끌림은 계산 밖
마음은 이미 locked
스물일곱 별자리 위
우린 같은 spot

[BLOOM - smooth vocal]
살짝 스친 손끝에도
계절이 달라져
나도 모른 내 마음이
너를 따라 움직여

[Pre-Chorus 2 - YEONI]
아무리 아닌 척해도
감출 수 없는 sign
달빛 속에 새겨지는
너와 나의 hidden line

[BLOOM - harmony]
Meet me in the moon phase
더 가까워지게

[LUNA - low talk]
This is not luck
This is our orbit

[Chorus - ALL]
Twenty-seven nights
달이 정한 love type
위험해도 아름다워
너와 나의 moon sign

Twenty-seven nights
끌림은 satellite
멀어져도 다시 돌아
너에게로 fall inside

[YEONI - main hook]
You’re my lunar chemistry
끝나지 않을 mystery

[BLOOM - high hook]
Shine on me, quietly

[LUNA - rap tag]
안괴든 영친이든
답은 너와 나의 gravity

[Dance Break - LUNA, stylish chant]
An-gwe, pull me closer
Young-chin, stay forever
Woo-soe, hurt but deeper
Up-tae, déjà vu lover

[BLOOM - chant]
Moon, moon, move me
Love, love, choose me

[YEONI - ad-lib]
달이 나를 너에게로

[LUNA - chant]
Round and round
We don’t stop
운명 위에 make it pop

[Bridge - YEONI, emotional vocal]
만약 우리 사이가
쉬운 이름은 아니어도
복잡한 달의 문장 끝에
나는 너를 읽을래

[BLOOM - soft harmony]
어두운 밤일수록
선명해지는 heart

[LUNA - soft rap]
상처까지 별이 되면
우린 더 빛날 테니까

[Final Chorus - ALL, grand and polished]
Twenty-seven nights
달이 정한 love type
위험해도 아름다워
너와 나의 moon sign

[YEONI - powerful main vocal]
Twenty-seven nights
끌림은 satellite
멀어져도 다시 돌아
너에게로 fall inside

[BLOOM - high ad-lib]
You’re my lunar chemistry
Shine on me, quietly

[LUNA - final rap tag]
스물일곱 밤을 지나
결국 너는 my gravity

[YEONI - ending vocal]
Twenty-seven nights
너는 나의 moon sign`;
  }

  if (normalizedSongKey === "starline destiny" || normalizedSongKey === "star line") {
    return `[Intro - BLOOM, soft whisper]
별들이 선을 그어
너와 나를 잇는 밤
Starline

[LUNA - low rap talk]
눈 감아도 보여
우린 같은 하늘 위

[YEONI - main vocal]
길을 잃은 마음 끝에
네 빛이 떠올라

[Verse 1 - YEONI]
조용한 밤이 내려앉으면
숨겨둔 마음이 선명해져
아무도 모르게 흔들린 날
별빛은 먼저 알아봐

손끝에 닿을 듯 먼 거리
그래도 이상하게 가까워
우연이라 부르기엔
너무 오래 빛났어

[BLOOM - airy vocal]
흩어진 점들 사이로
작은 길이 생겨나
내 이름 옆에 네 빛이
천천히 머물러

[LUNA - refined rap]
City lights fade out
하늘은 더 깊어져
말보다 정확한 sign
너는 나의 answer

물병처럼 자유롭게
사자처럼 뜨겁게
쌍둥이처럼 다른 마음도
하나의 선이 돼

[Pre-Chorus - YEONI]
별자리는 말없이
밤을 건너 이어져
멀리 있는 마음들도
빛으로 닿을 수 있어

[BLOOM - harmony]
Call me through the starlight
나를 찾아와

[LUNA - low ad-lib]
No map, no fear
I know you’re near

[Chorus - ALL]
Starline
우릴 이어줘
어둠 속에서도
서로를 알아봐

Starline
빛을 따라가
길을 잃어도
너에게 닿을 거야

[YEONI - main hook]
You are my constellation
끝나지 않을 direction

[BLOOM - high hook]
Shine on me, quietly

[LUNA - rap tag]
하늘 위에 새긴 sign
너와 나의 starline

[Verse 2 - LUNA, elegant rap]
밤은 black velvet
별은 diamond trace
차가운 공기 위로
번져가는 grace

처녀처럼 섬세하게
전갈처럼 깊게
양자리 불꽃처럼
망설임을 지워내

기다림은 orbit
돌고 돌아 found it
수많은 별 사이
너 하나만 focus

운명이란 말보다
더 조용한 확신
네가 뜨는 순간
내 밤은 다시 시작돼

[BLOOM - smooth vocal]
달빛에 기대어
말하지 못한 마음
가장 낮은 목소리로
너를 불러봐

[Pre-Chorus 2 - YEONI]
계절이 바뀌어도
별의 자리는 남아
멀어진 줄 알았던 우리
다시 같은 선 위에

[BLOOM - harmony]
Meet me in the moonlight
나를 기억해

[LUNA - low talk]
This is our sky
This is our sign

[Chorus - ALL]
Starline
우릴 이어줘
어둠 속에서도
서로를 알아봐

Starline
빛을 따라가
길을 잃어도
너에게 닿을 거야

[YEONI - main hook]
You are my constellation
끝나지 않을 direction

[BLOOM - high hook]
Shine on me, quietly

[LUNA - rap tag]
하늘 위에 새긴 sign
너와 나의 starline

[Dance Break - LUNA, stylish chant]
One star, two hearts
Draw it, draw it
Moon rise, night spark
Follow, follow

[BLOOM - chant]
빛나, 더 빛나
멀리 있어도 닿아

[YEONI - ad-lib]
너를 향해 falling

[LUNA - chant]
No more lonely sky
We make it alive

[Bridge - YEONI, emotional vocal]
가끔은 내가
사라질 것 같던 밤
네가 남긴 작은 빛이
나를 다시 불러

[BLOOM - soft harmony]
흩어진 나의 계절도
너를 만나 별이 돼

[LUNA - soft rap]
끝없이 먼 우주라도
네가 있으면 home

[Final Chorus - ALL, grand and beautiful]
Starline
우릴 이어줘
어둠 속에서도
서로를 알아봐

[YEONI - powerful main vocal]
Starline
빛을 따라가
길을 잃어도
너에게 닿을 거야

[BLOOM - high ad-lib]
You are my constellation
Shine on me, quietly

[LUNA - final rap tag]
하늘 끝에 남긴 line
영원히 our starline

[YEONI - ending vocal]
Starline
너는 나의 별자리`;
  }

  if (normalizedSongKey === "별빛 재판") {
    return `[Intro]
쉿, 조용히 해
오늘 밤 내 운세가 깨어나
카드가 뒤집히고
별들이 나를 심판해

[Verse 1]
거울 속 나는 웃고 있는데
눈빛은 조금 울고 있네요
괜찮다고 말한 건 나인데
왜 마음이 먼저 들켰나요

사주 속 작은 금 하나가
내 심장을 긁고 지나가
타로 속 달의 그림자는
아직도 나를 따라와

[Pre-Chorus]
대운은 문 앞에 서 있고
세운은 발목을 잡고
사랑은 늘 정답인 척
나를 또 틀리게 해

[Chorus]
운명아, 내 이름을 불러
도망쳐도 너에게 돌아가
좋아요 좋아요, 나예요 나예요
이 사랑의 죄인은 나예요

운명아, 내 마음을 열어
무서워도 끝까지 볼래
별점도 카드도 사주도 말해
결국 나는 너를 택해

[Post-Chorus]
La la la, 운명의 재판
La la la, 달빛의 계단
좋아요 좋아요, 나예요 나예요
울어도 예쁘게 웃을래요

[Verse 2]
처음 본 얼굴 같지 않아서
자꾸만 마음이 이상해요
인연인지 악연인지 몰라
그래도 손을 놓지 못해요

별자리 위에 적힌 이름
명반 속에 숨은 비밀
전생에 놓친 약속들이
오늘 밤 나를 찾아와

[Pre-Chorus]
카르마는 장난을 치고
달빛은 거짓말 같고
이별은 늘 끝인 척
다음 장을 펼치네요

[Chorus]
운명아, 내 이름을 불러
도망쳐도 너에게 돌아가
좋아요 좋아요, 나예요 나예요
이 사랑의 죄인은 나예요

운명아, 내 마음을 열어
무서워도 끝까지 볼래
별점도 카드도 사주도 말해
결국 나는 너를 택해

[Bridge]
가장 바라고 가장 두려운 건
네가 아니라 나였나 봐
사랑받고 싶던 어린 마음이
아직 달 뒤에 숨어 울어

[Final Chorus]
운명아, 내 이름을 불러
이번 생도 너에게 갈래
아파도 좋아, 무서워도 좋아
내 마음의 답은 너예요

운명아, 내 눈물을 읽어
이 밤 끝에 빛이 없다 해도
타로도 별도 사주도 몰랐던
마지막 선택은 나야

[Outro]
쉿, 조용히 해
오늘 밤 내 운세가 잠들어
카드가 닫히고
달빛만 나를 안아줘`;
  }

  if (normalizedSongKey === "포카 달빛코드") {
    return `[Intro - BLOOM, soft whisper]
One frame
Two signs
Four lights
I’m ready

[LUNA - low rap talk]
운명은 조용히 flash
눈 감아도 남는 trace

[YEONI - main vocal]
달빛 아래 선명해져
내 안의 hidden face

[Verse 1 - YEONI]
거울보다 먼저 알아본
낯선 나의 silhouette
태어난 순간 적힌 code
밤이 되면 깨어나

말하지 않아도 번져와
은근한 나의 atmosphere
한 장씩 나를 넘길 때
비밀은 빛이 돼

[BLOOM - airy vocal]
작은 표정 하나까지
별빛처럼 살아나
숨겨둔 나의 색깔이
천천히 피어나

[LUNA - chic rap]
First frame, calm face
Second frame, wild taste
세 번째 컷에 드러난
내 안의 hidden flame

낮에는 soft, 밤에는 bold
분위기는 switch mode
누가 나를 정해도
나는 다시 reload

[Pre-Chorus - YEONI]
흐릿했던 내 마음이
초점 안에 들어와
도망치던 나의 이름을
오늘은 불러봐

[BLOOM - harmony]
Hold me in the moonlight
더 선명하게

[LUNA - low ad-lib]
No more blur
I’m in focus now

[Chorus - ALL]
Fourth frame
나를 새로 찍어
Flash on
운명이 눈떠

Four signs
빛이 번져가
낯선 내가
가장 나다워져

[YEONI - main hook]
I’m in my destiny
I’m in my fantasy

[BLOOM - high hook]
Shine on me, quietly

[LUNA - rap tag]
네 컷 안의 gravity
나를 끌어당겨

[Verse 2 - LUNA, refined rap]
Born time, deep line
숨겨진 내 design
오행처럼 섞여가는
색의 temperature

차가운 blue, 뜨거운 red
모든 결이 make a set
흔들리던 yesterday
오늘 밤엔 silhouette

도화처럼 시선이 와
역마처럼 마음은 fly
불안까지 styling해
내 장면에 넣어놔

No filter, but I glow
Slow shutter, make it gold
운명은 예고 없이
가장 예쁜 컷을 줘

[BLOOM - smooth vocal]
말로는 다 못 하던
나의 작은 떨림도
프레임 속에 닿으면
이상하게 빛나죠

[Pre-Chorus 2 - YEONI]
누가 봐도 완벽한
표정은 아니어도
흔들린 순간마저
나의 별자리가 돼

[BLOOM - harmony]
Hold me in the moonlight
더 아름답게

[LUNA - low talk]
This is my scene
This is my sign

[Chorus - ALL]
Fourth frame
나를 새로 찍어
Flash on
운명이 눈떠

Four signs
빛이 번져가
낯선 내가
가장 나다워져

[YEONI - main hook]
I’m in my destiny
I’m in my fantasy

[BLOOM - high hook]
Shine on me, quietly

[LUNA - rap tag]
네 컷 안의 gravity
나를 끌어당겨

[Dance Break - LUNA, stylish chant]
Frame one, 숨을 고르고
Frame two, 눈을 뜨고
Frame three, 선을 넘고
Frame four, I own it

[BLOOM - chant]
Flash, flash
Glow, glow

[YEONI - ad-lib]
달빛이 나를 깨워

[LUNA - chant]
Cut it
Save it
Make it iconic

[Bridge - YEONI, emotional vocal]
가끔 나도 나를 몰라
흔들리는 밤이면
가장 어두운 장면에
내 별이 숨어 있어

[BLOOM - soft harmony]
천천히 피어난
나만의 highlight

[LUNA - soft rap]
끝내 지우지 못한 마음
그게 나의 sign

[Final Chorus - ALL, grand and polished]
Fourth frame
나를 새로 찍어
Flash on
운명이 눈떠

[YEONI - powerful main vocal]
Four signs
빛이 번져가
낯선 내가
가장 나다워져

[BLOOM - high ad-lib]
Shine on me, quietly
I become my destiny

[LUNA - final rap tag]
마지막 컷에 남긴 이름
내가 고른 destiny

[YEONI - ending vocal]
Fourth frame
나를 기억해`;
  }

  if (normalizedSongKey === "11pm") {
    return `[Intro — 부드러운 신스, 보컬 허밍]
mm… yeah…
오늘 밤 뭔가 달라
공기가 달콤해

[Verse 1 — 메인보컬, 나른하고 부드럽게]
창문 너머 불빛들이
하나둘 켜지는 시간
괜히 핸드폰을 들었다 놨다
네 이름 위에 손가락이 멈춰

커피잔이 식어가도
일어날 생각이 없어
이 노래 들으면 자꾸
네 얼굴이 떠오르거든

[Verse 2 — 두 번째 보컬, 속삭이듯]
별것도 아닌 것들이
전부 너로 연결돼
지나가는 향기 하나에도
나도 모르게 웃고 있어

이상하다 이상해
원래 이런 사람 아닌데
너 하나 생각하는 것만으로
하루가 이렇게 가네

[Pre-Chorus — 3명, 그루브 올라가며]
어떻게 이렇게 자연스러워
처음부터 알던 사람처럼
말 안 해도 다 알 것 같아
그냥 네 옆에 있고 싶어

[Chorus — 5인 전원, 달콤한 유니즌]
이 밤이 끝나지 않았으면 해
네가 웃는 그 순간에 멈춰서
다음 날이 와도 괜찮아
어차피 오늘도 너 생각할 거니까

한 번만 더 봐줘
그 눈빛으로
아무 말 없어도
다 알잖아 우리

[Verse 3 — 래퍼, 따뜻하고 리드미컬하게]
밤 열한 시 골목길
가로등 아래 그림자 둘
걷는 속도를 늦춰봐
조금만 더 이 시간 이대로

손이 닿을 듯 말 듯
그 거리가 좋아
말하지 않아도 느껴지는
이 온도면 충분해

[Bridge — 2성부, 감성 피크]
억지로 고백하지 않아도
이미 다 보여버렸나봐
티 안 내려 했는데
너도 알고 있지 않아

[Pre-Final Chorus — 리드 보컬 솔로, 한 박자 숨 참고]
이런 감정 처음이야
가르쳐준 적`;
  }

  if (normalizedSongKey === "saju destiny") {
    return `[Intro — Whispered, breathy, slow build]
(속삭이듯, 거의 들릴 듯 말 듯)
넌… 처음부터
여기 있었어

[Verse 1 — 부드럽고 친밀하게, 리듬 타기 시작]
까만 하늘 별 하나가
내 이름을 불렀던 밤
손도 못 댄 그 거리가
왜 이렇게 좁아졌을까

말하지 않아도 알아
눈빛만으로 다 읽혀
이상하다고 했지만
이건 우연이 아닌 것 같아

[Pre-Chorus — 긴장감 상승, 리듬 촘촘해짐]
아무것도 몰랐는데
네가 내 안에 있었어
별이 적어둔 그 이름
Code Destiny

[Chorus — 폭발, 반복, 단순, 강렬]
넌 내 사주였어 (사주였어)
처음부터 정해진 너 (정해진 너)
천 번 돌아도 돌아도
결국 너야 너

넌 내 운명이었어 (운명이었어)
별이 쓴 한 글자 너 (한 글자 너)
어디서 시작해도
끝은 너야 너

[Post-Chorus — 리듬 브레이크, 여운]
(후후— 후후후—)
너야 너
(후후— 후후후—)

[Verse 2 — 더 가까이, 더 직접적으로]
억만 개의 별 중에서
딱 하나만 빛났던 이유
어떤 말로도 설명 안 돼
그냥 네가 답이었어

손끝이 닿는 순간
시간이 멈춘 것 같아
이름도 몰랐던 내가
왜 다 알고 있었을까

[Pre-Chorus]
아무것도 몰랐는데
네가 내 안에 있었어
별이 적어둔 그 이름
Code Destiny

[Chorus]
넌 내 사주였어 (사주였어)
처음부터 정해진 너 (정해진 너)
천 번 돌아도 돌아도
결국 너야 너

넌 내 운명이었어 (운명이었어)
별이 쓴 한 글자 너 (한 글자 너)
어디서 시작해도
끝은 너야 너

[Bridge — 랩, 낮고 차갑게, 리듬 끊김]
운명이라는 말 식상해
그런데 너 앞에선 달라
설명하려 할수록
말이 없어져

팔자가 뭔지 몰라도
이 느낌은 알아
수천 년이 계산해도
결론은 하나야 — 너

[Drop — 무음 1초 후 터짐]
(1초 침묵)
(풀 오케스트라 + 신스 폭발)

[Final Chorus — 반음 올림, 전부 터짐]
넌 내 사주였어 (사주였어)
처음부터 정해진 너 (정해진 너)
천 번 돌아도 돌아도
결국 너야 너

넌 내 운명이었어 (운명이었어)
별이 쓴 한 글자 너 (한 글자 너)
어디서 시작해도
끝은 너야 너

[Outro — 처음으로 돌아온 듯, 속삭임]
넌… 처음부터
여기 있었어`;
  }

  if (normalizedSongKey === "귀인 npc key") {
    return `[Intro - BLOOM, cute whisper]
Quest started
길을 잃은 밤
누가 내 이름을 불러

[LUNA - playful rap talk]
Map is broken
Heart is loading
Wait
누가 나타났어

[YEONI - main vocal]
어둠 속에 반짝인
너라는 작은 sign

[Verse 1 - YEONI]
혼자라고 믿은 stage
불빛 하나 없던 maze
멈춰 선 내 발끝에
네 목소리가 닿아

괜찮다고 말해준
그 한마디 때문에
꺼져가던 마음 위로
다시 별이 켜져

[BLOOM - bright vocal]
작은 아이템처럼
내 하루에 들어와
아무것도 아닌 듯
나를 살려내잖아

[LUNA - fresh rap]
길 잃은 player
흔들린 radar
네가 나타난 순간
바뀌어 my data

숨겨진 route
열리는 door
너의 말 한 줄이
나를 heal해 more

[Pre-Chorus - YEONI]
운명이 막힌 줄 알았던
그 장면 끝에서
네가 웃으며 말해
“다음 길은 여기야”

[BLOOM - harmony]
Take my hand
We go higher

[LUNA - low ad-lib]
No more lonely
You’re my guide

[Chorus - ALL]
You’re my 귀인 NPC
길 잃은 날 깨운 key
운명 퀘스트 속에서
너를 만나 level up

NPC, NPC
너는 나의 lucky key
닫힌 맵을 열어줘
너와 함께 level up

[YEONI - main hook]
Level, level up with you
내 하루가 빛나 bloom

[BLOOM - high hook]
Lucky, lucky, stay with me

[LUNA - rap tag]
Game over? No, 다시 start
네가 켜준 my heart

[Verse 2 - LUNA, rhythmic rap]
첫 번째 mission
눈물은 pass
두 번째 danger
가볍게 dash

세 번째 boss
겁나도 okay
네가 옆에 있으면
I can play all day

귀인처럼 timing perfect
나를 알아본 secret contact
무심한 듯 던진 sentence
내 인생의 healing magic

혼자서는 못 본 길
너는 쉽게 찾아내
우연처럼 왔지만
운명처럼 남아 왜

[BLOOM - sweet vocal]
말 한마디가 potion
웃음 하나가 shield
너를 만난 그때부터
내 세상이 healed

[Pre-Chorus 2 - YEONI]
넘어진 나를 일으킨 건
거창한 기적이 아냐
내 편처럼 서 있던
너의 작은 온기야

[BLOOM - harmony]
Take my hand
We go brighter

[LUNA - low talk]
You’re my helper
You’re my answer

[Chorus - ALL]
You’re my 귀인 NPC
길 잃은 날 깨운 key
운명 퀘스트 속에서
너를 만나 level up

NPC, NPC
너는 나의 lucky key
닫힌 맵을 열어줘
너와 함께 level up

[YEONI - main hook]
Level, level up with you
내 하루가 빛나 bloom

[BLOOM - high hook]
Lucky, lucky, stay with me

[LUNA - rap tag]
Game over? No, 다시 start
네가 켜준 my heart

[Dance Break - LUNA, chant rap]
Quest, quest
Open the gate
Step, step
Change my fate

Map, map
Follow the light
너와 나의 party
We shine tonight

[BLOOM - chant]
Up, up
Level up

[YEONI - ad-lib]
나를 깨워, lucky sign

[Bridge - YEONI, emotional vocal]
만약 네가 없었다면
나는 아직 몰랐을 거야
가장 힘든 순간에도
누군가는 빛이 된단 걸

[BLOOM - soft harmony]
작은 도움 하나가
별처럼 번져가

[LUNA - soft rap]
네가 열어준 길 위에
이제 내가 달려가

[Final Chorus - ALL, bright and addictive]
You’re my 귀인 NPC
길 잃은 날 깨운 key
운명 퀘스트 속에서
너를 만나 level up

[YEONI - powerful main vocal]
NPC, NPC
너는 나의 lucky key
닫힌 맵을 열어줘
너와 함께 level up

[BLOOM - high ad-lib]
Level, level up with you
Lucky, lucky, stay with me

[LUNA - final rap tag]
혼자였던 stage 위에
네가 나타난 그때 change

[YEONI - ending vocal]
You’re my lucky NPC`;
  }

  if (normalizedSongKey === "reverse card") {
    return `[Intro - BLOOM, soft whisper]
Reverse
카드가 뒤집힌 밤
끝인 줄 알았지?
아니, 시작이야

[LUNA - low rap talk]
Bad sign, good timing
Black card, new shining
뒤집힌 운명 위로
We rise

[YEONI - main vocal]
무너진 자리에서
새벽빛이 들어와

[Verse 1 - YEONI]
처음엔 두려웠어
내 앞에 놓인 card
웃고 있던 미래가
갑자기 멀어져

The Tower 무너진 뒤
먼지만 남은 밤
근데 그 틈 사이로
작은 빛이 번져와

[BLOOM - airy vocal]
울고 난 눈가에도
별빛은 남아 있어
잃어버린 줄 알았던
내가 나를 불러

[LUNA - chic rap]
Reverse 뜬다고
끝난 건 아니지
흔들린 방향이
새로운 길이지

The Moon은 날 숨겨
The Star는 다시 켜
무너진 장면 끝에
내 이름을 써

[Pre-Chorus - YEONI]
불안이 날 밀어도
나는 뒤로 가지 않아
나쁜 예감조차
내 편으로 바꿔놔

[BLOOM - harmony]
Turn it over
더 선명하게

[LUNA - low ad-lib]
No bad fate
I rewrite it

[Chorus - ALL]
Reverse, reverse
뒤집혀도 universe
나쁜 카드 같아도
결말은 내가 써

Reverse, reverse
눈물 끝에 blooming first
무너진 밤을 넘어
새벽으로 dance

[YEONI - main hook]
Flip my fate
I’m not afraid

[BLOOM - high hook]
Light, light, light on me

[LUNA - rap tag]
끝이라고 적힌 card
내가 바꿔 lucky start

[Verse 2 - LUNA, rhythmic rap]
The Fool처럼 jump
겁 없이 다음 scene
Wheel of Fortune 돌아
내 차례가 오지

이별은 comma
실패는 drama
근데 난 그 위에 써
New panorama

카드가 뒤집혀
세상이 흔들려
그래서 더 보여
내 안의 miracle

Bad luck? No thanks
I make my own chance
검은 deck 속에서도
I find my romance

[BLOOM - smooth vocal]
잃어버린 사랑도
나를 만든 조각
상처 위에 피어난
가장 예쁜 color

[Pre-Chorus 2 - YEONI]
끝이라고 믿었던
장면이 열리고
다시 숨을 쉬는 나
더 높이 올라가

[BLOOM - harmony]
Turn it over
더 아름답게

[LUNA - low talk]
This is my reversal
This is my rise

[Chorus - ALL]
Reverse, reverse
뒤집혀도 universe
나쁜 카드 같아도
결말은 내가 써

Reverse, reverse
눈물 끝에 blooming first
무너진 밤을 넘어
새벽으로 dance

[YEONI - main hook]
Flip my fate
I’m not afraid

[BLOOM - high hook]
Light, light, light on me

[LUNA - rap tag]
끝이라고 적힌 card
내가 바꿔 lucky start

[Dance Break - LUNA, chant rap]
Flip it, flip it
Turn it around
Break it, break it
Build from the ground

Tower down
Star is up
Reverse card
Lucky jump

[BLOOM - chant]
Light up
Rise up

[YEONI - ad-lib]
새벽이 나를 깨워

[Bridge - YEONI, emotional vocal]
무너진 줄 알았던
내 마음 한가운데
가장 밝은 별 하나가
아직 살아 있었어

[BLOOM - soft harmony]
뒤집힌 운명 속에
숨은 문이 열려

[LUNA - soft rap]
끝이라고 부른 밤이
내 첫 장이 됐어

[Final Chorus - ALL, bright and powerful]
Reverse, reverse
뒤집혀도 universe
나쁜 카드 같아도
결말은 내가 써

[YEONI - powerful main vocal]
Reverse, reverse
눈물 끝에 blooming first
무너진 밤을 넘어
새벽으로 dance

[BLOOM - high ad-lib]
Flip my fate
Light on me

[LUNA - final rap tag]
The Tower fell
But I rose higher

[YEONI - ending vocal]
Reverse universe
내가 다시 써`;
  }

  if (normalizedSongKey === "month by month") {
    return `[Intro - BLOOM, soft whisper]
달력이 넘어가
운명이 깨어나
Month by month
I’m changing

[LUNA - playful rap talk]
January to December
내 운세는 getting better
Page by page
Let’s go

[YEONI - main vocal]
새로운 달이 떠오르면
또 다른 내가 시작돼

[Verse 1 - YEONI]
1월의 찬 공기 속에
작은 소원을 적어
아직은 서툰 마음도
빛을 기다려

2월엔 두근대는 예감
괜히 네 생각이 나
3월의 바람이 불면
내 안에 봄이 와

[BLOOM - sweet vocal]
꽃잎처럼 살짝
마음이 열려
어제보다 조금 더
나답게 웃어

[LUNA - fresh rap]
April rain, 씻겨가 worry
May day, 빛나 my story
June night, 심장은 hurry
여름 앞에 I feel lucky

[Pre-Chorus - YEONI]
계절은 나를 지나
조금씩 색을 바꿔
흐린 날도 지나가면
별빛이 남아

[BLOOM - harmony]
Turn the page
더 선명하게

[LUNA - low ad-lib]
No more fear
I’m ready now

[Chorus - ALL]
Page by page
달이 넘어가
Month by month
나는 달라져

봄엔 사랑이 피고
여름엔 내가 타올라
가을엔 답을 찾고
겨울엔 별이 돼

[YEONI - main hook]
One more page
One more chance
내일의 나를 만나

[BLOOM - high hook]
Lucky, lucky, light on me

[LUNA - rap tag]
열두 번의 운세 끝에
I become my destiny

[Verse 2 - LUNA, rhythmic rap]
July heat, 뜨거운 spotlight
August dream, 밤하늘 highlight
September, 생각이 깊어져
October, 답들이 보여져

November wind, 조금 외로워도
December star, 끝내 빛나고
넘어진 날도 calendar 속에
나를 만든 memory로 남아

운이 좋은 날만
나인 건 아니잖아
느린 달도 내 편이야
결국 나를 데려가

[BLOOM - smooth vocal]
빨갛게 표시해둔
작은 나의 wish list
하나씩 이뤄지는
기분 좋은 magic

[Pre-Chorus 2 - YEONI]
멀리 있던 미래가
조금 가까워져
한 달씩 나를 지나
내가 나를 알아가

[BLOOM - harmony]
Turn the page
더 아름답게

[LUNA - low talk]
This is my year
This is my sign

[Chorus - ALL]
Page by page
달이 넘어가
Month by month
나는 달라져

봄엔 사랑이 피고
여름엔 내가 타올라
가을엔 답을 찾고
겨울엔 별이 돼

[YEONI - main hook]
One more page
One more chance
내일의 나를 만나

[BLOOM - high hook]
Lucky, lucky, light on me

[LUNA - rap tag]
열두 번의 운세 끝에
I become my destiny

[Dance Break - LUNA, chant rap]
One, two, turn it
Three, four, burn it
Five, six, love it
Seven, eight, own it

Nine, ten, find it
Eleven, shine it
Twelve, twelve, save it
내 운명을 make it

[BLOOM - chant]
Page, page
Glow, glow

[YEONI - ad-lib]
계절이 나를 깨워

[Bridge - YEONI, emotional vocal]
가끔은 어떤 달이
나를 울게 해도
지나고 보면 전부
나를 위한 별이었어

[BLOOM - soft harmony]
작은 하루들이 모여
빛나는 내가 돼

[LUNA - soft rap]
끝이 아닌 다음 장으로
나는 다시 걸어가

[Final Chorus - ALL, bright and grand]
Page by page
달이 넘어가
Month by month
나는 달라져

[YEONI - powerful main vocal]
봄엔 사랑이 피고
여름엔 내가 타올라
가을엔 답을 찾고
겨울엔 별이 돼

[BLOOM - high ad-lib]
One more page
One more chance
Lucky light is calling me

[LUNA - final rap tag]
달력 끝에 적어놔
I choose my destiny

[YEONI - ending vocal]
Month by month
나는 빛나`;
  }

  if (normalizedSongKey === "삼재 escape") {
    return `[Intro - BLOOM, cute whisper]
Stage one
Stage two
Stage three
Ready?

[LUNA - rap talk]
삼재 warning
운명 loading
But I’m not scared
Escape mode on

[YEONI - main vocal]
어둔 밤을 넘어
빛나는 나를 찾아

[Verse 1 - YEONI]
갑자기 꼬인 하루
길이 막힌 듯해
괜히 작은 일에도
마음이 흔들려

하지만 알고 있어
이건 끝이 아니야
잠깐 느려진 운도
다시 달릴 테니까

[BLOOM - bright vocal]
불안이 knock knock
문을 두드려도
웃으면서 bye bye
나는 나를 믿어

[LUNA - playful rap]
첫 번째 wave
가볍게 pass
넘어져도 다시
Run it back fast

두 번째 trap
발끝으로 dash
운이 나를 막아도
I make it flash

[Pre-Chorus - YEONI]
겁이 나도 괜찮아
심장은 더 커져가
어두운 stage 끝에서
새로운 내가 보여

[BLOOM - harmony]
Hold my hand
We go higher

[LUNA - low ad-lib]
No bad luck
I’m the player

[Chorus - ALL]
삼재 삼재
I don’t care
뛰어넘어
Higher stair

불운이 와도
Make it rare
나는 나를
Save해

삼재 삼재
I don’t stop
넘어져도
Level up

세 번째 밤이
지나가면
내 운명은
Diamond flash

[YEONI - main hook]
Escape, escape
I’m on my way

[BLOOM - high hook]
Lucky, lucky, light my way

[LUNA - rap tag]
Game over? No way
내가 바꿔 my fate

[Verse 2 - LUNA, energetic rap]
Black cat, bad sign
그래도 I’m fine
불길한 예감도
내 무대의 highlight

삐끗한 timing
엉켜버린 route
다시 reset 누르고
Turn up my mood

삼재가 뭐래도
난 쉽게 안 져
운명이 막으면
더 높이 점프해

Lose one, get two
난 더 강해져
불운도 내 손에 오면
Lucky booster

[BLOOM - cute vocal]
세상이 살짝 삐끗해도
내 리듬은 안 놓쳐
넘어진 그 자리에서
별빛처럼 터져

[Pre-Chorus 2 - YEONI]
느린 운도 괜찮아
결국 나를 데려가
긴 터널의 끝에서
더 반짝일 테니까

[BLOOM - harmony]
Hold my hand
We go brighter

[LUNA - low talk]
Bad luck out
I’m the fighter

[Chorus - ALL]
삼재 삼재
I don’t care
뛰어넘어
Higher stair

불운이 와도
Make it rare
나는 나를
Save해

삼재 삼재
I don’t stop
넘어져도
Level up

세 번째 밤이
지나가면
내 운명은
Diamond flash

[YEONI - main hook]
Escape, escape
I’m on my way

[BLOOM - high hook]
Lucky, lucky, light my way

[LUNA - rap tag]
Game over? No way
내가 바꿔 my fate

[Dance Break - LUNA, chant rap]
One wave, pass it
Two trap, dash it
Three night, break it
Bad luck, shake it

[BLOOM - chant]
Jump, jump
Light it up

[YEONI - ad-lib]
나를 깨워, destiny

[LUNA - chant]
Run, run
Never stop
삼재 위로 level up

[Bridge - YEONI, emotional vocal]
가끔은 운명이
나를 시험해도
나는 알고 있어
내 빛은 사라지지 않아

[BLOOM - soft harmony]
비가 그친 뒤에는
더 선명한 rainbow

[LUNA - soft rap]
불운이라 적힌 길도
내가 걸으면 new road

[Final Chorus - ALL, bigger and brighter]
삼재 삼재
I don’t care
뛰어넘어
Higher stair

[YEONI - powerful main vocal]
불운이 와도
Make it rare
나는 나를
Save해

삼재 삼재
I don’t stop
넘어져도
Level up

[BLOOM - high ad-lib]
Lucky, lucky, light my way
I’m shining every day

[LUNA - final rap tag]
삼재 escape
내 운명은 diamond flash

[YEONI - ending vocal]
Escape, escape
I saved my fate`;
  }

  if (normalizedSongKey === "럭키 컬러") {
    return `[Intro - BLOOM, bright whisper]
오늘의 color
오늘의 luck
입는 순간
I glow up

[LUNA - rap talk]
Pink, gold, blue
Pick my mood
Lucky color
Runway move

[YEONI - main vocal]
거울 앞에 선 순간
운명이 빛나

[Verse 1 - YEONI]
아침 햇살 사이로
작은 예감이 와
왠지 오늘은 달라
나를 부르는 sign

옷장 속에 잠든 색들이
하나둘 깨어나
내 하루를 바꿀 주문처럼
손끝에서 반짝여

[BLOOM - sweet vocal]
Rose on my lips
Gold on my eyes
Blue moon perfume
밤까지 shining

[LUNA - chic rap]
오늘의 luck은 fit check
불안은 뒤로 skip that
어제의 나는 fade out
새로운 나로 step out

[Pre-Chorus - YEONI]
무채색 같던 마음도
색을 입으면 달라져
내가 고른 이 빛으로
세상이 나를 봐

[BLOOM - harmony]
Light me up
더 선명하게

[LUNA - low ad-lib]
No more hiding
I’m the sign

[Chorus - ALL]
Pink for love
Gold for luck
Blue moon night
I dress my fate up

Lucky color
Light me up
검은 밤도 나를 보면
Runway처럼 glow

[YEONI - main hook]
Color, color, lucky color
오늘의 나를 골라

[BLOOM - high hook]
Shine, shine, light on me

[LUNA - rap tag]
입는 순간 바뀌어
My destiny

[Verse 2 - LUNA, stylish rap]
Red는 bold, 심장은 hot
Silver line, 시선은 locked
Green은 fresh, 마음은 bloom
Black dress 위에 moonlight mood

색 하나로 바뀌는 attitude
운세보다 빠른 my move
누가 뭐라 해도 I choose
내가 나를 만드는 rule

Lucky vibe, lucky timing
걸음마다 flash like lightning
오늘 밤의 spotlight
전부 내 쪽으로 sliding

[BLOOM - smooth vocal]
작은 리본 하나에도
기분이 달라져
운명은 멀리 있는 게 아냐
내 선택에 있어

[Pre-Chorus 2 - YEONI]
흔들렸던 마음까지
반짝임으로 바꿔놔
내가 입은 이 순간이
가장 나다운 aura

[BLOOM - harmony]
Light me up
더 자유롭게

[LUNA - low talk]
Pick my color
Pick my fate

[Chorus - ALL]
Pink for love
Gold for luck
Blue moon night
I dress my fate up

Lucky color
Light me up
검은 밤도 나를 보면
Runway처럼 glow

[YEONI - main hook]
Color, color, lucky color
오늘의 나를 골라

[BLOOM - high hook]
Shine, shine, light on me

[LUNA - rap tag]
입는 순간 바뀌어
My destiny

[Dance Break - LUNA, chant rap]
Pink, pink, love sign
Gold, gold, good time
Blue, blue, moonlight
Black, black, spotlight

[BLOOM - chant]
Color up
Glow it up

[YEONI - ad-lib]
나를 깨워, lucky light

[LUNA - chant]
Step, pose
Turn, glow
오늘 밤은 fashion fate

[Bridge - YEONI, dreamy vocal]
가끔은 내가 흐릿해져도
괜찮아, 다시 고르면 돼
내 안에 숨은 수많은 색이
나를 기다리고 있어

[BLOOM - soft harmony]
빛을 입은 마음이
천천히 피어나

[LUNA - soft rap]
운명은 정해진 답보다
내가 고른 shade

[Final Chorus - ALL, bright and addictive]
Pink for love
Gold for luck
Blue moon night
I dress my fate up

[YEONI - powerful main vocal]
Lucky color
Light me up
검은 밤도 나를 보면
Runway처럼 glow

[BLOOM - high ad-lib]
Color, color, lucky color
Shine, shine, light on me

[LUNA - final rap tag]
오늘의 색을 입고
I make my destiny

[YEONI - ending vocal]
Lucky color
나를 빛내줘`;
  }

  if (normalizedSongKey === "welcome to code destiny") {
    return `[Intro - BLOOM, bright whisper]
문을 열어
달빛이 켜져
Welcome to
Code Destiny

[LUNA - playful rap talk]
Profile check
Lucky map
오늘의 나는 어디로 갈까?

[YEONI - main vocal]
반짝이는 밤 속으로
내 운명이 날 불러

[Verse 1 - YEONI]
처음 보는 하늘 아래
익숙한 별이 떠올라
내 이름과 태어난 시간이
비밀처럼 빛나

사주 속에 숨은 계절
조용히 나를 깨우고
작은 예감 하나까지
나답게 피어나

[BLOOM - sweet vocal]
타로 카드 한 장 위에
두근대는 질문 하나
뒤집는 순간 알 것 같아
오늘은 뭔가 달라

[LUNA - fresh rap]
Swipe left, swipe right
운세 맵을 따라가
별자리 sign, 숙요의 night
새로운 내가 보여 난

럭키 컬러 입고 go
불안은 뒤에 두고
달빛 아래 로그인
내 하루가 시작돼

[Pre-Chorus - YEONI]
어제의 나는 몰랐던
내 안의 hidden light
길을 잃은 마음에도
별은 방향을 줘

[BLOOM - harmony]
Shine on me
더 선명하게

[LUNA - ad-lib]
Find my code
I’m ready now

[Chorus - ALL]
Destiny world
들어와, 눈부신 sign
오늘의 운명이
나를 깨워 tonight

Destiny world
펼쳐봐, 나만의 sky
사주도 타로도 별도
내 이야기가 돼

[YEONI - main hook]
Code, code, destiny
나를 찾아가는 key

[BLOOM - high hook]
Lucky, lucky, light on me

[LUNA - rap tag]
문을 열면 시작돼
My fate is loading

[Verse 2 - LUNA, lively rap]
자미두수 palace
달빛 속의 balance
내 마음의 좌표들이
반짝이며 guidance

연애운은 pink wave
재물운은 gold flame
오늘의 lucky item
작은 용기 한 스푼

숙요처럼 끌리고
별자리처럼 이어져
알 수 없는 내일도
지금만큼은 즐겨봐

운명은 정답보다
나를 여는 password
Code Destiny 안에서
I become my own world

[BLOOM - cute vocal]
사주 네컷 frame 속에
낯선 내가 웃고 있어
어제보다 조금 더
반짝이는 표정으로

[Pre-Chorus 2 - YEONI]
미래가 멀게 느껴져도
괜찮아, take my time
작은 선택 하나에도
우주는 반응해

[BLOOM - harmony]
Shine on me
더 자유롭게

[LUNA - low talk]
No more doubt
I choose my route

[Chorus - ALL]
Destiny world
들어와, 눈부신 sign
오늘의 운명이
나를 깨워 tonight

Destiny world
펼쳐봐, 나만의 sky
사주도 타로도 별도
내 이야기가 돼

[YEONI - main hook]
Code, code, destiny
나를 찾아가는 key

[BLOOM - high hook]
Lucky, lucky, light on me

[LUNA - rap tag]
문을 열면 시작돼
My fate is loading

[Dance Break - LUNA, chant rap]
Saju, tarot
Star sign, moon road
Lucky item
Let it glow

Profile, diary
Love code, fantasy
오늘의 나를 저장해
Code Destiny

[BLOOM - chant]
Light up, light up
꿈이 켜져

[YEONI - ad-lib]
운명이 나를 비춰

[Bridge - YEONI, dreamy vocal]
가끔은 내가 누구인지
흐릿해지는 밤에도
이 세계는 말해줘
너는 이미 빛나고 있다고

[BLOOM - soft harmony]
작은 별 하나가
나의 길이 돼

[LUNA - soft rap]
운명은 멀리 있지 않아
내 선택 안에 살아

[Final Chorus - ALL, bright and grand]
Destiny world
들어와, 눈부신 sign
오늘의 운명이
나를 깨워 tonight

[YEONI - powerful main vocal]
Destiny world
펼쳐봐, 나만의 sky
사주도 타로도 별도
내 이야기가 돼

[BLOOM - high ad-lib]
Code, code, destiny
Lucky light is calling me

[LUNA - final rap tag]
오늘의 문을 열어
My fate is glowing

[YEONI - ending vocal]
Code Destiny
나를 만나는 world`;
  }

  if (normalizedSongKey === "꽃과 칼 사이") {
    return `[Intro - BLOOM, soft whisper]
꽃은 칼끝에서도 피어나
Bloom and blade
Love in my saju

[LUNA - low rap talk]
을목처럼 휘어져도
신금처럼 빛나
목, 화, 토, 금, 수
우리 둘의 sign

[YEONI - main vocal]
너를 본 순간
내 계절이 바뀌어

[Verse 1 - YEONI]
나는 작은 을목처럼
바람 앞에 흔들려
상처 난 마음 틈으로도
다시 꽃을 피워내

너는 차가운 신금처럼
고요하게 빛나서
다가갈수록 위험한데
눈을 뗄 수가 없어

[BLOOM - airy vocal]
계수 같은 비가 내려
내 맘을 적시면
굳어 있던 밤도 어느새
푸른 잎이 돼

[LUNA - chic rap]
너는 jewel, 너는 blade
날 비추고 날 깨워
내가 숨긴 감정까지
한 번에 다 베어

병화처럼 뜨거운 spotlight
정화처럼 깊은 candlelight
너와 마주친 순간
내 운명은 highlight

[Pre-Chorus - YEONI]
서로 다른 물상들이
한 장의 그림이 돼
꽃은 빛을 따라가고
칼은 별을 새겨

[BLOOM - harmony]
Hold me in your silver light
더 가까이 와

[LUNA - low ad-lib]
Soft like bloom
Sharp like fate

[Chorus - ALL]
Bloom and blade
꽃과 칼 사이
위험할수록 더
아름답게 shine

Bloom and blade
사주 속의 sign
서로 다른 우리라서
더 완벽한 love line

[YEONI - main hook]
나는 피어나
너의 빛 아래

[BLOOM - high hook]
Bloom on me, quietly

[LUNA - rap tag]
차가운 보석 끝에
내 이름이 새겨져

[Verse 2 - LUNA, stylish rap]
갑목처럼 straight up
무토처럼 hold up
흔들리는 세상에도
너는 나의 center

임수처럼 deep해
경금처럼 chic해
겉은 차가운데
속은 자꾸 heat해

기토 같은 garden
네가 오면 bloom in
내 마음의 사계절이
너 하나로 tuning

오행이 엇갈려도
이 끌림은 perfect
상극처럼 보여도
우린 서로를 make it

[BLOOM - smooth vocal]
네 눈빛은 보석 같아
차갑지만 투명해
내 향기는 너를 따라
조용히 번져가

[Pre-Chorus 2 - YEONI]
닮지 않아서 끌려
달라서 더 선명해
운명이란 말보다 더
너는 나를 깨워

[BLOOM - harmony]
Hold me in your silver light
나를 피워줘

[LUNA - low talk]
This is not luck
This is our element

[Chorus - ALL]
Bloom and blade
꽃과 칼 사이
위험할수록 더
아름답게 shine

Bloom and blade
사주 속의 sign
서로 다른 우리라서
더 완벽한 love line

[YEONI - main hook]
나는 피어나
너의 빛 아래

[BLOOM - high hook]
Bloom on me, quietly

[LUNA - rap tag]
차가운 보석 끝에
내 이름이 새겨져

[Dance Break - LUNA, chant rap]
목은 bloom
화는 burn
토는 hold
금은 turn
수는 flow
Let it go
우리 둘의 사주 위로

[BLOOM - chant]
Bloom, bloom
Blade, blade

[YEONI - ad-lib]
사랑이 나를 깨워

[LUNA - chant]
Soft and sharp
Light and dark
We make art

[Bridge - YEONI, emotional vocal]
가끔은 네가 너무 차가워
나를 아프게 해도
그 빛이 없었다면
나는 피지 못했을 거야

[BLOOM - soft harmony]
꽃잎처럼 떨리는
나의 작은 고백

[LUNA - soft rap]
칼날 같은 운명도
너라면 아름다워

[Final Chorus - ALL, grand and polished]
Bloom and blade
꽃과 칼 사이
위험할수록 더
아름답게 shine

[YEONI - powerful main vocal]
Bloom and blade
사주 속의 sign
서로 다른 우리라서
더 완벽한 love line

[BLOOM - high ad-lib]
나는 피어나
너의 빛 아래

[LUNA - final rap tag]
을목의 꽃, 신금의 jewel
우리 사랑은 rare rule

[YEONI - ending vocal]
Bloom and blade
너로 피어나`;
  }

  if (normalizedSongKey === "도화살 홍염꽃") {
    return `[Intro - BLOOM, soft whisper]
도화가 번져
홍염이 타올라
화개 속에 숨은 나
Red bloom sign

[LUNA - low rap talk]
사주 위에 새긴 aura
피할수록 더 선명해

[YEONI - main vocal]
나를 보는 그 순간
네 밤이 흔들려

[Verse 1 - YEONI]
조용히 걷는 발끝에
꽃잎이 따라와
말하지 않아도 공기가
내 쪽으로 기울어

웃음 하나 남겼을 뿐인데
시선은 오래 머물러
내가 숨긴 빛까지
너는 자꾸 읽어내

[BLOOM - airy vocal]
도화살처럼 피어나
무심한 듯 더 깊게
가까이 오면 알 거야
향기는 도망 못 가

[LUNA - chic rap]
화려한 척 안 해도
room 안의 focus
내 명식 깊은 곳에
잠든 red lotus

화개는 나를 감춰
더 신비롭게 만들어
혼자인 밤마저
무대처럼 바꿔

[Pre-Chorus - YEONI]
나는 알아
나의 고요가 더 위험한 걸
차가운 달빛 아래
뜨겁게 피는 걸

[BLOOM - harmony]
Don’t look away
이미 늦었어

[LUNA - low ad-lib]
One glance
You’re under my sign

[Chorus - ALL]
Red bloom sign
도화처럼 피어
말없이 널 끌어당겨
You can’t deny

Red bloom sign
홍염처럼 번져
눈빛 하나로 타올라
You feel my fire

[YEONI - main hook]
I’m not lucky
I’m born to shine

[BLOOM - high hook]
Bloom on me, bloom on me

[LUNA - rap tag]
화개 속에 숨은 queen
더 깊을수록 fantasy

[Verse 2 - LUNA, charismatic rap]
도화는 soft touch
홍염은 red spark
둘이 섞인 순간
흔들리는 your heart

예쁜 말은 필요 없어
눈빛 하나면 enough
내가 지나간 뒤엔
분위기만 남아 love

화개살의 silence
고독마저 priceless
혼자 빛나는 법을 알아
That’s my private diamonds

겁내지 마, 가까이 와
난 쉽게 읽히지 않아
사주 속의 매력선이
너를 나로 이끌잖아

[BLOOM - smooth vocal]
꽃잎처럼 가벼운 척
마음 깊이 내려앉아
한 번 스친 향기에도
계절이 바뀌잖아

[Pre-Chorus 2 - YEONI]
나를 알고 싶다면
밤의 문을 열어봐
가장 조용한 빛이
가장 오래 남을 테니까

[BLOOM - harmony]
Don’t run away
이미 시작돼

[LUNA - low talk]
This is not a charm
This is my fate

[Chorus - ALL]
Red bloom sign
도화처럼 피어
말없이 널 끌어당겨
You can’t deny

Red bloom sign
홍염처럼 번져
눈빛 하나로 타올라
You feel my fire

[YEONI - main hook]
I’m not lucky
I’m born to shine

[BLOOM - high hook]
Bloom on me, bloom on me

[LUNA - rap tag]
화개 속에 숨은 queen
더 깊을수록 fantasy

[Dance Break - LUNA, stylish chant]
도화, bloom
홍염, burn
화개, hide
Now watch me turn

꽃처럼 와
불처럼 남아
고요한 밤 위에
내 이름을 새겨

[BLOOM - chant]
Bloom, bloom
Burn, burn

[YEONI - ad-lib]
나를 보면 잊지 못해

[Bridge - YEONI, emotional vocal]
아무도 모르는 나의 밤
그 안에 핀 붉은 별
외로움도 아름다워
내가 나를 비출 때

[BLOOM - soft harmony]
화개 속에 잠든 꿈이
무대 위로 피어나

[LUNA - soft rap]
도화는 나의 문장
홍염은 나의 온도
운명이 준 이름을
난 왕관처럼 써

[Final Chorus - ALL, grand and polished]
Red bloom sign
도화처럼 피어
말없이 널 끌어당겨
You can’t deny

[YEONI - powerful main vocal]
Red bloom sign
홍염처럼 번져
눈빛 하나로 타올라
You feel my fire

[BLOOM - high ad-lib]
I’m not lucky
I’m born to shine

[LUNA - final rap tag]
사주 위에 피어난
My red bloom sign

[YEONI - ending vocal]
Red bloom sign
나를 기억해`;
  }

  if (normalizedSongKey === "원진 귀문 gate") {
    return `[Intro - BLOOM, eerie whisper]
문이 열려
생각이 뒤집혀
원진, 귀문
I can’t look away

[LUNA - low rap talk]
사주 속 forbidden line
엇갈린 마음의 sign
도망칠수록 더 가까워져
Ghost gate

[YEONI - main vocal]
너를 본 순간
내 밤이 흔들려

[Verse 1 - YEONI]
조용했던 내 마음에
검은 물결이 번져
아닌 척 고개 돌려도
눈빛은 너를 찾아

좋아하는 건지 미워하는지
경계가 흐려져
멀어지고 싶은데 왜
더 깊이 끌려가

[BLOOM - airy vocal]
달빛이 어긋나
그림자가 춤을 춰
내 안의 낯선 목소리
네 이름만 불러

[LUNA - sharp rap]
원진처럼 꼬인 감정
웃다가도 cold reaction
귀문이 열린 밤엔
생각들이 chain reaction

앞은 mirror, 뒤는 maze
너는 poison, 너는 grace
밀어내는 손끝마저
결국 너를 향해

[Pre-Chorus - YEONI]
심장이 반대로 뛰어
숨이 조금씩 엉켜
이건 사랑인지 경고인지
아직도 모르겠어

[BLOOM - harmony]
Close the door
But I hear you

[LUNA - low ad-lib]
No escape
You’re in my head

[Chorus - ALL]
Ghost gate
나를 흔들어
원진의 밤처럼
엉켜버린 heart

Ghost gate
너를 밀어내도
귀문처럼 다시
열려버린 door

[YEONI - main hook]
I’m lost in your orbit
벗어나도 falling

[BLOOM - high hook]
Love me, haunt me, slowly

[LUNA - rap tag]
밀고 당겨도 결국
You control my gravity

[Verse 2 - LUNA, chaotic rap]
Step left, mind right
박자가 어긋난 night
너를 보면 내 이성은
갑자기 glitch, rewrite

분명 싫다 했는데
시선은 너를 scan
마음은 왜 자꾸
네 쪽으로 crash land

귀문관살처럼 deep
생각은 spiral trip
네 말 한마디에
내 하루가 flip

원진의 sharp tension
달콤한 obsession
상처인 걸 알면서도
계속되는 attraction

[BLOOM - smooth vocal]
어지러운 이 끌림도
이상하게 아름다워
닫아둔 마음의 문이
너만 보면 열려

[Pre-Chorus 2 - YEONI]
멀어질수록 더 선명해
너라는 이상한 꿈
끝을 알 수 없는 미로에
또 나를 던져

[BLOOM - harmony]
Close the door
But I feel you

[LUNA - low talk]
This is not love
Maybe it’s fate

[Chorus - ALL]
Ghost gate
나를 흔들어
원진의 밤처럼
엉켜버린 heart

Ghost gate
너를 밀어내도
귀문처럼 다시
열려버린 door

[YEONI - main hook]
I’m lost in your orbit
벗어나도 falling

[BLOOM - high hook]
Love me, haunt me, slowly

[LUNA - rap tag]
밀고 당겨도 결국
You control my gravity

[Dance Break - LUNA, grand chant rap]
원진, twist it
귀문, open
Mind maze, break it
Fate wave, frozen

Push me, pull me
Love me, lose me
문이 닫혀도
너는 내 안에

[BLOOM - chant]
Round and round
Deeper now

[YEONI - ad-lib]
운명이 나를 삼켜

[Bridge - YEONI, dramatic vocal]
나를 망칠 것 같던 밤이
나를 깨우는 빛이 돼
어지러운 마음 끝에서
가장 선명한 널 봐

[BLOOM - soft harmony]
검은 문틈 사이로
피어난 silver flower

[LUNA - soft rap]
도망치던 나의 그림자
네 앞에서 나를 마주해

[Final Chorus - ALL, grand and intense]
Ghost gate
나를 흔들어
원진의 밤처럼
엉켜버린 heart

[YEONI - powerful main vocal]
Ghost gate
너를 밀어내도
귀문처럼 다시
열려버린 door

[BLOOM - high ad-lib]
I’m lost in your orbit
Love me, haunt me, slowly

[LUNA - final rap tag]
사주 속에 새긴 chaos
결국 너는 my gravity

[YEONI - ending vocal]
Ghost gate
너를 닫을 수 없어`;
  }

  if (normalizedSongKey === "형충파해 break") {
    return `[Intro - LUNA, low whisper rap]
사주팔자 위에 새겨진 sign
형, 충, 파, 해
운명이 흔들릴 때
진짜 내가 깨어나

[BLOOM - cold whisper]
My birth chart burns
My fate turns sharp

[YEONI - main vocal]
명식 속에 잠든 불꽃
오늘 밤 나를 깨워

[Verse 1 - YEONI]
태어난 시간에 숨겨진 code
조용히 나를 불러
원국 깊은 곳에 잠긴
날카로운 예감 하나

평온한 길만 걸었다면
몰랐을 나의 빛
흔들린 별의 틈 사이로
새로운 내가 피어

[BLOOM - airy vocal]
십이지가 맞부딪힌 밤
달빛이 금을 그어
깨진 줄 알았던 마음이
더 선명하게 빛나

[LUNA - charismatic rap]
지지 위에 충이 와
판을 뒤집어놔
형은 나를 다듬고
파는 껍질을 깨

해가 지나간 자리엔
가짜들이 사라져
사주가 날 시험할수록
내 눈빛은 더 차가워

[Pre-Chorus - YEONI]
불안이 나를 밀어도
나는 뒤로 가지 않아
깨진 운의 조각마저
내 발밑에 별이 돼

[BLOOM - harmony]
In my chart, I bloom
더는 숨지 않아

[LUNA - low ad-lib]
No fear
I rule my fate

[Chorus - ALL]
Clash crown
사주 위로 rise
Clash crown
흔들려도 I’m alive

형충파해
나를 깨운 destiny
형충파해
부딪힐수록 더 queen

[YEONI - main hook]
I was born from the storm
I become my own throne

[BLOOM - high hook]
Shine, shine, dangerous

[LUNA - rap tag]
명식 속의 파동 위에
I wear the crown

[Verse 2 - LUNA, powerful rap]
합은 달콤하게 묶고
충은 과감하게 break
형은 칼날처럼 와도
나를 만든 upgrade

파는 오래된 나를
조용히 벗겨내
해는 숨은 균열까지
빛 앞에 드러내

Birth time, four signs
내 운명의 outline
흔들리는 사주 안에
숨겨져 있던 high line

읽을수록 dangerous
알수록 glamorous
혼란 속에 태어난
Unbreakable charisma

[BLOOM - sleek vocal]
아픈 말도 지나가면
하나의 문장이 돼
나를 찢던 모든 밤이
왕관처럼 남아

[Pre-Chorus 2 - YEONI]
정해진 사주라 해도
그대로 살진 않아
부딪힌 운의 끝에서
내 선택이 빛나

[BLOOM - harmony]
In the chaos, I bloom
더 높이 올라가

[LUNA - low talk]
This is not damage
This is my power

[Chorus - ALL]
Clash crown
사주 위로 rise
Clash crown
흔들려도 I’m alive

형충파해
나를 깨운 destiny
형충파해
부딪힐수록 더 queen

[YEONI - main hook]
I was born from the storm
I become my own throne

[BLOOM - high hook]
Shine, shine, dangerous

[LUNA - rap tag]
명식 속의 파동 위에
I wear the crown

[Dance Break - LUNA, chant rap]
형은 sharpen
충은 motion
파는 break it
해는 open

사주 속의 hidden line
이제 나의 design
흔들려도 무너지지 않아
I define my sign

[BLOOM - chant]
Glow, glow
더 차갑게 glow

[YEONI - ad-lib]
운명이 나를 깨워

[Bridge - YEONI, grand vocal]
내 사주에 적힌 밤이
나를 막는 줄 알았어
하지만 가장 깊은 균열에
나의 빛이 숨어 있었어

[BLOOM - soft harmony]
흩어진 모든 내가
하나의 별이 돼

[LUNA - soft rap]
불길하다 말한 운도
내 손에선 무기가 돼

[Final Chorus - ALL, grand and fierce]
Clash crown
사주 위로 rise
Clash crown
흔들려도 I’m alive

[YEONI - powerful main vocal]
형충파해
나를 깨운 destiny
형충파해
부딪힐수록 더 queen

[BLOOM - high ad-lib]
I was born from the storm
I become my own throne

[LUNA - final rap tag]
사주팔자 위에 서서
I wear the crown

[YEONI - ending vocal]
Clash crown
내 운명은 내가 써`;
  }

  if (normalizedSongKey === "karma karma") {
    return `[Intro]
Karma, karma
다시 너를 찾아
전생의 문이 열려
I can’t escape you

[Verse 1]
검은 달빛 아래
너를 처음 본 순간
처음이 아닌 것처럼
내 심장이 널 기억해

낯선 이름인데
왜 이렇게 아픈지
수천 번의 밤을 지나
너에게 돌아온 것 같아

[Pre-Chorus]
붉은 실이 손끝에 감겨
끊어내도 다시 이어져
운명이라 부르기엔
너무 깊은 이끌림

[Chorus]
카르마 카르마, 다시 너를 찾아
전생의 약속처럼 내게 와
카르마 카르마, 피할 수가 없어
널 사랑한 죄로 또 태어나

눈물도 상처도 다 너에게 가
내 모든 생이 너를 기억해
카르마 카르마, 다시 너를 찾아
이번 생도 결국 너야

[Post-Chorus]
Karma, karma, locked in your love
달빛 속에 묶인 우리 둘
Karma, karma, can’t let you go
다시 태어나도 너야

[Verse 2]
타로 속 Lovers
달 아래 숨은 sign
별들이 속삭여
우린 끝난 적 없다고

라후처럼 끌리고
케투처럼 멀어져도
업처럼 돌아와
결국 같은 문 앞에 서

[Pre-Chorus]
너를 밀어낼수록 더
내 안으로 깊이 번져
사랑인지 벌인지
알 수 없어도 원해

[Chorus]
카르마 카르마, 다시 너를 찾아
전생의 약속처럼 내게 와
카르마 카르마, 피할 수가 없어
널 사랑한 죄로 또 태어나

눈물도 상처도 다 너에게 가
내 모든 생이 너를 기억해
카르마 카르마, 다시 너를 찾아
이번 생도 결국 너야

[Rap]
전생의 밤, 현생의 light
너를 보면 흔들리는 timeline
업태처럼 엮인 destiny
끊어도 다시 오는 gravity

피와 눈물로 쓴 계약
사랑은 독이자 구원 같아
도망쳐도 네가 내 방향
끝내 난 너에게 fall down

[Bridge]
만약 이 사랑이 벌이라면
나는 다시 죄인이 될게
천 번의 생을 돌아간대도
너 하나를 선택할게

[Dance Break]
Karma, karma
Red moon, red line
Karma, karma
You are my sign

[Final Chorus]
카르마 카르마, 다시 너를 찾아
운명의 불꽃처럼 타올라
카르마 카르마, 멈출 수가 없어
널 사랑하려 또 태어나

눈물도 상처도 다 의미가 돼
너를 만난 순간 완성돼
카르마 카르마, 다시 너를 찾아
이번 생도 결국 너야

[Outro]
Karma, karma
다시 너를 찾아
전생의 문이 닫혀도
I’ll find you again`;
  }
  if (normalized.includes("새벽 끝")) {
    return `[Verse 1]
부서진 하늘 아래
나는 아직 숨을 쉬어
누군가의 꿈은 칼이 되고
누군가의 눈물은 별이 돼

어릴 적 믿었던 세상은
너무 쉽게 무너졌고
착한 마음 하나만으로는
아무도 지킬 수 없었어

[Pre-Chorus]
그래도 네 이름을 부르면
폐허 속에도 꽃이 피어
내가 괴물이 된다 해도
너만은 안고 싶어

[Chorus]
세상은 잔혹해
그래도 난 널 사랑해
피 묻은 새벽 끝에서도
너의 손을 놓지 않을게

운명이 날 밀어내도
죄가 되어버린다 해도
이 차가운 세계 속에서
나는 너를 사랑하겠어

[Verse 2]
정답은 늘 늦게 오고
후회는 먼저 찾아와
살아남은 사람의 가슴엔
말 못 할 밤이 쌓여가

자유라 부르던 빛조차
누군가에겐 상처였고
내가 원한 작은 행복도
전쟁처럼 멀어졌어

[Pre-Chorus]
그래도 네 눈을 보면
나는 다시 사람이 돼
모든 걸 잃은 밤에도
너만은 기억할게

[Chorus]
세상은 잔혹해
그래도 난 널 사랑해
찢겨진 날개라 해도
너에게 날아가고 싶어

심장이 부서져도
내일이 사라진다 해도
이 슬픈 세계 끝에서
나는 너를 사랑하겠어

[Bridge]
용서받지 못할 길이라도
돌아갈 수 없는 나라도
너를 만난 그 순간만큼은
내 삶이 틀리지 않았어

[Final Chorus]
세상은 잔혹해
그래도 난 널 사랑해
마지막 빛이 꺼진대도
너의 이름을 지킬게

운명이 날 삼켜도
악몽이 나를 불러도
이 잔혹한 세계 속에서
나는 너를 사랑하겠어

[Outro]
부서진 하늘 아래
그래도 사랑은 남아
너 하나를 위해 나는
다시 살아가겠어`;
  }

  if (normalized.includes("매력의 sign")) {
    return `[Intro]
Yeah
도화, 홍염, 화개
내 사주에 새겨진 sign
날 보면 조심해
이미 늦었으니까

[Verse 1]
조용히 걸어도 시선이 따라와
말없이 웃어도 분위긴 달라져
내가 뭘 한 것도 아닌데
네 심장은 먼저 나를 알아봐

도화는 눈빛에 피고
홍염은 숨결에 번져
화개는 달빛처럼 숨어
넌 더 깊이 알고 싶어져

[Pre-Chorus]
다가오면 위험해
멀어지면 더 궁금해
내 안의 별들이 깨어나
너의 밤을 흔들어

[Chorus]
매력살, 날 보면 fatal
도화빛 눈빛에 넌 흔들려
매력살, 빠지면 fatal
홍염처럼 뜨겁게 번져

화개처럼 비밀스럽게
네 맘속에 스며들어
매력살, 날 보면 fatal
넌 이미 내 운명에 걸렸어

[Post-Chorus]
Fatal, fatal, my charm sign
Fatal, fatal, can’t deny
도화, 홍염, 화개, all night
넌 내 별에 끌려와

[Verse 2]
쉽게 다 보여주진 않아
내 마음은 locked, secret door
한 걸음 더 가까이 오면
너는 더 길을 잃어

무대 위에 조명이 켜지면
내 운도 같이 빛나
사주 속에 숨겨둔 매력
오늘 밤 전부 터져 나와

[Pre-Chorus]
눈빛 하나로 signal
손짓 하나로 danger
너도 모르게 내 이름을
계속 부르게 될 거야

[Chorus]
매력살, 날 보면 fatal
도화빛 눈빛에 넌 흔들려
매력살, 빠지면 fatal
홍염처럼 뜨겁게 번져

화개처럼 비밀스럽게
네 맘속에 스며들어
매력살, 날 보면 fatal
넌 이미 내 운명에 걸렸어

[Rap]
도화는 bloom, 홍염은 flame
화개는 moon, I own my name
타고난 vibe, 계산은 no
내 걸음마다 터지는 glow

눈빛은 sharp, 목소린 low
네 심장 위로 drop that flow
사주가 말해, I’m the sign
너의 밤을 바꿀 남자

[Bridge]
날 사랑하면 어려울 거야
빛과 그림자 둘 다 나니까
하지만 네가 진심이라면
내 가장 깊은 별을 보여줄게

[Final Chorus]
매력살, 날 보면 fatal
도화빛 눈빛에 넌 흔들려
매력살, 빠지면 fatal
홍염처럼 뜨겁게 번져

화개처럼 아름답게
너의 꿈에 스며들어
매력살, 날 보면 fatal
오늘 밤 넌 나에게 걸렸어

[Outro]
도화, 홍염, 화개
내 사주에 새겨진 sign
Fatal, fatal, my charm sign
이미 늦었으니까`;
  }

  if (normalized.includes("비겁다자의 우정 지옥")) {
    return `[Intro]
야, 친구야!
이번엔 진짜 너무했다!
의리냐, 경쟁이냐
비겁다자의 우정 지옥!

[Verse 1]
친구는 많아, 단톡은 불나
약속은 매일매일 풀부킹
근데 이상해, 뭔가 이상해
좋은 일만 생기면 네가 먼저 와

내 썸도 알고, 내 꿈도 알고
내 비밀까지 다 아는 너
웃으며 “잘돼라” 말은 하는데
왜 눈빛은 살짝 불타오르냐

[Pre-Chorus]
의리로 뭉친 줄 알았는데
은근히 순위표가 있었네
내 사주에 비겁이 많다더니
친구도 많고 경쟁도 많아

[Chorus]
친구야 친구야 왜 내 운을 가져가
좋은 기회 오면 왜 네가 먼저 잡아
친구야 친구야 그래도 미워 못 해
같이 웃고 싸우는 우정 지옥

친구야 친구야 왜 내 썸을 바라봐
내가 좋아하면 너도 좋아하잖아
친구야 친구야 이건 의리냐 질투냐
비겁다자의 우정 지옥이다!

[Verse 2]
내가 산 옷을 네가 또 사고
내가 간 카페에 네가 또 가고
나만의 필살기인 줄 알았는데
다음 날 보니 네 피드에 올라와

그래도 웃겨, 그래서 좋아
혼자보단 시끄러운 인생
싸우고 삐지고 다시 또 만나
결국엔 치킨 앞에 화해하네

[Pre-Chorus]
내 편인지 라이벌인지
가끔은 헷갈리는 사이
그래도 세상이 날 때리면
제일 먼저 달려오는 너

[Chorus]
친구야 친구야 왜 내 운을 가져가
좋은 기회 오면 왜 네가 먼저 잡아
친구야 친구야 그래도 미워 못 해
같이 웃고 싸우는 우정 지옥

친구야 친구야 왜 내 썸을 바라봐
내가 좋아하면 너도 좋아하잖아
친구야 친구야 이건 의리냐 질투냐
비겁다자의 우정 지옥이다!

[Dance Rock Break]
비겁! 비겁! 많아도 너무 많아
의리! 질투! 둘 다 너무 많아
친구! 경쟁! 끊을 수가 없어
우정 지옥으로 뛰어들어!

[Bridge]
가끔은 네가 너무 얄미워
내 운을 반쯤 가져간 것 같아
하지만 내 편이 필요할 때
네가 없으면 더 허전해

[Final Chorus]
친구야 친구야 왜 내 운을 가져가
그래도 내 인생에 네가 있어 웃는다
친구야 친구야 같이 한번 가보자
이 난장판 같은 우정 지옥

친구야 친구야 내 운 반은 돌려줘
대신에 내 마음 반은 네가 가져가
친구야 친구야 이건 의리다 운명이다
비겁다자의 우정 지옥이다!

[Outro]
야, 그래도 친구지!
근데 내 썸은 건드리지 마라!
비겁다자 우정 지옥
끝까지 간다!`;
  }

  if (normalized.includes("식상 폭발 말빨천재")) {
    return `[Intro]
Yeah, listen
말하지 말라 했지?
근데 내 입은 이미 stage 위
식상 폭발, let’s go

[Verse 1]
가만히 있으라 했지만
내 생각은 이미 비트 위야
눈빛은 조용한 척해도
머릿속엔 가사가 뛰어다녀

한마디 툭 던졌을 뿐인데
분위기가 갑자기 바뀌어
내 말은 그냥 말이 아냐
판을 뒤집는 작은 번개야

[Pre-Chorus]
참으라 해도 안 돼
숨기라 해도 안 돼
내 안에 넘치는 표현력
이건 타고난 destiny

[Chorus]
입 열면 터져, 식상 폭발
내 말은 운명을 흔드는 파도
숨길 수 없어, 나는 표현형 인간
오늘도 세상에 나를 뱉어

입 열면 터져, 식상 폭발
말 한 방에 공기가 바뀐다
막을 수 없어, 나는 무대형 인간
내 목소리로 길을 만든다

[Post-Chorus]
톡톡 튀어, 말말 튀어
입만 열면 판이 뒤집혀
식상, 식상, 식상 폭발
내 말빨은 운명 돌파

[Rap 1]
생각은 fast, 입술은 mic
내 하루는 매일 live
표현 안 하면 답답해서
심장이 먼저 drop the vibe

누가 뭐래도 I don’t stop
말로 세우는 my own top
사주에 박힌 이 에너지
식상 강한 born to talk

[Verse 2]
말 한마디로 웃기고
말 한마디로 울리고
내 감정은 숨는 법 몰라
있는 그대로 터지고

가끔은 너무 솔직해서
문제가 될 때도 있지만
그래도 나를 숨기는 것보단
세상에 던지는 게 나다워

[Pre-Chorus]
조용한 밤도 안 돼
침묵 속에선 못 살아
내 안의 리듬이 말해
지금이 바로 spotlight

[Chorus]
입 열면 터져, 식상 폭발
내 말은 운명을 흔드는 파도
숨길 수 없어, 나는 표현형 인간
오늘도 세상에 나를 뱉어

입 열면 터져, 식상 폭발
말 한 방에 공기가 바뀐다
막을 수 없어, 나는 무대형 인간
내 목소리로 길을 만든다

[Rap 2]
말빨은 weapon, 감성은 engine
내 문장은 전부 다 action
눈치만 보던 어제는 delete
오늘은 내가 main attraction

툭 치면 나와 punchline
숨 쉬듯 터져 headline
내 사주 속 식상 에너지
세상을 향해 go sign

[Bridge]
때로는 말이 너무 앞서
상처가 된 적도 있었어
하지만 침묵보다 뜨겁게
진심을 배워가는 나야

[Final Chorus]
입 열면 터져, 식상 폭발
내 말은 운명을 흔드는 파도
숨길 수 없어, 나는 표현형 인간
오늘도 세상에 나를 뱉어

입 열면 터져, 식상 폭발
내 목소리로 세상을 깨운다
멈출 수 없어, 나는 창조형 인간
내 말이 곧 나의 무대야

[Outro]
식상, 식상, 식상 폭발
말빨 천재, 무대 장악
입 열면 터져
끝까지 터져`;
  }

  if (normalized.includes("재성아 나 돈 좀 줘")) {
    return `[Intro]
재성아, 어디 갔니?
통장이 울고 있잖아
이번 달은 진짜 부탁한다
재성아 와라!

[Verse 1]
월급은 들어오자마자
안녕도 없이 사라져
카드값은 왜 이렇게
나를 사랑해 찾아와

편의점 커피 한 잔에도
손이 덜덜 떨리는데
재물운 너 어디 숨었니
나랑도 좀 친해지자

[Pre-Chorus]
내 사주에 재성이 약해도
내 텐션은 절대 안 약해
비어 있는 지갑 속에도
희망은 아직 반짝해

[Chorus]
재성아 와라, 통장에 와라
지갑 속 바람 좀 막아줘
재성아 와라, 내 운에 와라
이번 달은 내가 이긴다

돈복아 와라, 내 손에 와라
잔고에 꽃 좀 피워줘
재성아 와라, 통장에 와라
오늘부터 부자 기운 온다

[Post-Chorus]
차곡차곡, 착착착
잔고 올라가라 착착착
재성재성, 와라와라
통장 속에 별이 떠라

[Verse 2]
쿠폰은 나의 절친이고
할인은 나의 이상형
배달 앱을 지웠다가
다시 까는 나의 운명

돈은 왜 나만 보면
숨바꼭질 시작하니
나도 이제 재성 만나
럭키 비키 살아볼래

[Pre-Chorus]
사주팔자 바꿀 순 없어도
소비 습관은 바꿀 수 있어
작은 돈도 모이면 대운
오늘부터 나는 달라져

[Chorus]
재성아 와라, 통장에 와라
지갑 속 바람 좀 막아줘
재성아 와라, 내 운에 와라
이번 달은 내가 이긴다

돈복아 와라, 내 손에 와라
잔고에 꽃 좀 피워줘
재성아 와라, 통장에 와라
오늘부터 부자 기운 온다

[Rap]
월세, 공과금, 카드값 attack
잔고는 매일매일 looking so sad
그래도 난 포기 안 해, no cap
재성 불러 모아 money comeback

천 원도 소중해, 만 원은 royal
티끌 모아 태산, attitude loyal
재물운 들어와, 문 열어 놔
내 통장 VIP 자리 비워 놔

[Bridge]
돈 때문에 울던 밤도
이젠 웃으며 넘길래
나를 살리는 좋은 기운
내 손으로 불러볼래

[Final Chorus]
재성아 와라, 통장에 와라
지갑 속 바람 좀 막아줘
재성아 와라, 내 운에 와라
이번 달은 내가 이긴다

돈복아 와라, 내 삶에 와라
가난한 마음도 바꿔줘
재성아 와라, 통장에 와라
나는 결국 부자 기운 탄다

[Outro]
재성아 와라
통장에 와라
이번 달은
내가 이긴다`;
  }

  if (normalized.includes("역마살 열차창")) {
    return `[Intro]
Oh oh oh, 길 위에 별이 떠
Oh oh oh, 너에게로 달려가
역마역마, 역마역마
내 종착지는 너야

[Verse 1]
서울에서 부산까지
마음은 또 비행기 타
머무르는 법을 몰라
내 별은 계속 길 위에 있어

제주 바람, 강릉 바다
밤기차 창문 속 달빛
어디론가 떠나야만
숨을 쉬는 나였는데

[Pre-Chorus]
지도에도 없던 이름
우연처럼 네가 떴어
수많은 길을 돌고 돌아
결국 너에게 온 거야

[Chorus]
역마역마, 너에게로 달려가
지도에도 없는 사랑을 찾아
역마역마, 멈출 수가 없어
내 종착지는 결국 너야

달려달려, 바람보다 빠르게
내 운명이 너를 향해 뛰어
역마역마, 길 끝에서 만난 love
떠돌던 내 마음이 너에게 멈춰

[Post-Chorus]
La la la, 너에게로 run
La la la, my lucky destination
역마역마, 두근두근
내 여행의 끝은 너야

[Verse 2]
낯선 도시, 낯선 거리
처음 본 하늘 아래서
너를 만난 그 순간에
모든 풍경이 노래가 됐어

혼자 걷던 골목길도
이젠 영화처럼 빛나
내가 지나온 모든 길이
너를 향한 예고편 같아

[Pre-Chorus]
정류장마다 흔들리던
내 마음의 나침반이
네가 웃던 그 순간부터
한 방향만 가리켜

[Chorus]
역마역마, 너에게로 달려가
지도에도 없는 사랑을 찾아
역마역마, 멈출 수가 없어
내 종착지는 결국 너야

달려달려, 바람보다 빠르게
내 운명이 너를 향해 뛰어
역마역마, 길 끝에서 만난 love
떠돌던 내 마음이 너에게 멈춰

[Bridge]
난 늘 떠나야 사는 사람
붙잡히는 게 두려웠어
근데 이상해, 네 곁에서는
처음으로 머물고 싶어

[Final Chorus]
역마역마, 너에게로 달려가
세상 끝이어도 난 널 찾아가
역마역마, 멈출 수가 없어
내 종착지는 영원히 너야

달려달려, 별빛 따라 달려가
이 우연을 운명이라 부를래
역마역마, 길 위에서 만난 love
내 모든 여행은 너에게 닿아

[Outro]
Oh oh oh, 길 위에 별이 떠
Oh oh oh, 너에게로 달려가
역마역마, 역마역마
내 종착지는 너야`;
  }

  if (normalized.includes("탐랑성 danger")) {
    return `[Intro]
Yeah
Tam-rang, tam-rang
눈빛 조심해
한 번 빠지면 못 나와

[Verse 1]
조용히 걸어 들어가도
분위기는 먼저 날 알아봐
말 한마디 안 꺼내도
네 심장은 이미 반응하잖아

웃는 건 반칙이래
눈빛은 더 위험하대
근데 난 그냥 나일 뿐인데
왜 다들 흔들려, 왜

[Pre-Chorus]
달빛 아래 비친 내 그림자
조금은 달콤하고 조금은 dangerous
다가오면 더 깊어져
네 마음의 문을 열어

[Chorus]
탐랑탐랑, 내 눈빛은 danger
탐랑탐랑, 넌 이미 in danger
한 번만 봐도 기억에 남아
밤새 네 맘속에 번져가

탐랑탐랑, 숨길 수 없는 flavor
탐랑탐랑, 치명적인 player
도망가도 결국 돌아와
넌 내 별에 끌려와

[Post-Chorus]
Tam-rang, tam-rang
빛나는 desire
Tam-rang, tam-rang
뜨거워져 fire

손끝 하나, 눈빛 하나
네 마음을 흔들어 놔
Tam-rang, tam-rang
나를 보면 danger

[Verse 2]
화려한 조명 아래서
나는 더 선명해져
무대 위의 숨소리까지
너를 향해 춤을 춰

예술처럼 다가가
장난처럼 웃어봐
하지만 네가 느낀 떨림은
절대 우연이 아니야

[Pre-Chorus]
달콤한 독처럼 스며들어
너도 모르게 나를 찾게 돼
이끌림은 운명 같아
멈추려 해도 늦었어

[Chorus]
탐랑탐랑, 내 눈빛은 danger
탐랑탐랑, 넌 이미 in danger
한 번만 봐도 기억에 남아
밤새 네 맘속에 번져가

탐랑탐랑, 숨길 수 없는 flavor
탐랑탐랑, 치명적인 player
도망가도 결국 돌아와
넌 내 별에 끌려와

[Rap]
I’m not bad, 그냥 좀 위험해
내 매력은 계산보다 instinct
자미두수 속에 박힌 star
탐랑성이 만든 superstar

말투는 soft, 무드는 deep
네 시선은 already locked on me
밀어내도 closer, closer
끝내 넌 내 orbit 안에

[Bridge]
나도 알아, 내가 쉬운 답은 아닌 걸
빛과 그림자가 같이 사는 걸
그래도 네가 진심이라면
내 밤의 중심까지 보여줄게

[Final Chorus]
탐랑탐랑, 내 눈빛은 danger
탐랑탐랑, 넌 이미 in danger
한 번만 봐도 잊을 수 없어
너의 밤을 전부 흔들어

탐랑탐랑, 숨길 수 없는 fever
탐랑탐랑, 더 깊어지는 whisper
도망가도 결국 돌아와
넌 내 운명에 걸려와`;
  }

  if (normalized.includes("flower pig 매력살")) {
    return `[Intro]
도화, 홍염, 화개
살살살, 내 매력 살
어머, 또 쳐다보네?

[Verse 1]
아무것도 안 했는데
왜 분위기가 달라져
그냥 웃은 것뿐인데
심장이 먼저 반응해

도화는 눈빛에 피고
홍염은 말끝에 번져
화개는 조용히 숨어
더 알고 싶게 만들어

[Pre-Chorus]
나는 몰라, 몰라
근데 다들 흔들려
나도 몰래 켜진 spotlight
오늘도 시선이 따라와

[Chorus]
살살살, 내 매력 살
도화살이 반짝반짝 피어나
살살살, 더 빠져봐
홍염살이 뜨겁게 번져가

화개화개, 비밀스러워
가까이 오면 더 멀어져
살살살, 내 매력 살
넌 이미 내 운명에 걸렸어

[Post-Chorus]
도화, 도화, 눈빛이 danger
홍염, 홍염, 심장이 fever
화개, 화개, 달빛 속 stranger
살살살, 내 매력 살

[Verse 2]
꾸민 듯 안 꾸민 듯
나는 그냥 나일 뿐인데
왜 자꾸 질문이 많아
내 마음은 비공개야

화려하게 웃다가도
갑자기 혼자가 좋아
다가오면 신비롭고
멀어지면 더 궁금하지

[Pre-Chorus]
예쁜 척은 안 해
그냥 타고난 vibe
내 사주 속 매력들이
오늘 밤 춤을 춰

[Chorus]
살살살, 내 매력 살
도화살이 반짝반짝 피어나
살살살, 더 빠져봐
홍염살이 뜨겁게 번져가

화개화개, 비밀스러워
가까이 오면 더 멀어져
살살살, 내 매력 살
넌 이미 내 운명에 걸렸어

[Rap]
도화는 bloom, 홍염은 boom
화개는 moonlight in my room
말 안 해도 느껴지는 mood
나를 보면 자꾸 lose your cool

관심은 많아도 쉽게는 no
내 마음 열쇠는 secret code
예쁜데 이상하게 깊어
그래서 더 위험한 flow

[Bridge]
사랑은 살짝 어려워
나는 나도 잘 모르겠어
하지만 네가 진심이면
내 달빛 안에 들어와

[Final Chorus]
살살살, 내 매력 살
도화살이 반짝반짝 피어나
살살살, 더 빠져봐
홍염살이 뜨겁게 번져가

화개화개, 비밀스러워
나를 알수록 더 빠져들어
살살살, 내 매력 살
오늘 밤 넌 나에게 걸렸어

[Outro]
도화, 홍염, 화개
살살살, 내 매력 살
쉿, 이건 타고난 거야`;
  }

  if (normalized.includes("기신은 bye bye")) {
    return `[Intro]
Bye bye, bye bye
기신은 bye bye
My side, my side
용신은 my side

[Verse 1]
또 왜 그래, 또 또 왜 그래
내 기분까지 네가 왜 정해
웃는 척해도 티가 나잖아
내 운을 갉아먹는 bad vibe

말끝마다 툭, 마음마다 쿡
괜찮은 척했지만 I’m done
오늘부터 나는 나를 지켜
불길한 너의 알림은 mute

[Pre-Chorus]
내 사주에 낀 먹구름
이제는 걷어낼 timing
나를 낮추던 말들은
전부 다 삭제해, clean

[Chorus]
기신은 bye bye, 용신은 my side
내 운명 다시 켜, light it up tonight
기신은 bye bye, 용신은 my side
나를 아프게 한 건 전부 out of my life

Bye bye, bye bye
더는 안 끌려가
My side, my side
좋은 운만 따라와

기신은 bye bye, 용신은 my side
오늘의 나는 새 대운으로 shine

[Verse 2]
눈치 보던 나는 없지
이젠 내가 나의 center
질투 섞인 말은 pass it
반짝이는 나를 enter

목이 막힌 관계는 cut
가짜 미소 전부 shut
나를 살리는 사람만
내 세계 안에 남겨둬

[Pre-Chorus]
흔들리던 나의 계절
이제는 봄으로 changing
막혀 있던 마음길도
너 없이 더 잘 열려, free

[Chorus]
기신은 bye bye, 용신은 my side
내 운명 다시 켜, light it up tonight
기신은 bye bye, 용신은 my side
나를 아프게 한 건 전부 out of my life

Bye bye, bye bye
더는 안 끌려가
My side, my side
좋은 운만 따라와

기신은 bye bye, 용신은 my side
오늘의 나는 새 대운으로 shine

[Dance Break]
기, 기, 기신은 bye
용, 용, 용신은 my
운, 운, 운명이 fly
I’m so lucky, I’m so high

기, 기, 기신은 bye
용, 용, 용신은 my
나쁜 vibe는 good night
좋은 기운 spotlight

[Bridge]
미안하지만 난 떠날게
내 마음을 더는 안 팔게
상처로 배운 이 리듬 위에
진짜 나를 다시 찾을게

[Final Chorus]
기신은 bye bye, 용신은 my side
내 운명 다시 켜, light it up tonight
기신은 bye bye, 용신은 my side
나를 살리는 사랑만 keep in my life

Bye bye, bye bye
더는 안 무너져
My side, my side
좋은 운만 번져

기신은 bye bye, 용신은 my side
오늘의 나는 새 대운으로 shine

[Outro]
Bye bye, bye bye
기신은 bye bye
My side, my side
용신은 my side`;
  }

  if (normalized.includes("달빛처럼 닿을게")) {
    return `[Verse 1]
고요한 밤하늘 아래
은빛이 창가를 스쳐
말 없는 내 마음 위로
네 이름이 내려앉아

손끝에 닿을 수 없지만
늘 가까운 온도처럼
어둠이 짙어질수록
더 선명해지는 너

[Pre-Chorus]
멀리서도 알아볼 수 있어
흔들리는 내 하루 끝에서
운명처럼 번지는 빛
조용히 나를 부르고

[Chorus]
달빛처럼 너에게 닿을게
멀어져도 사라지지 않게
밤이 깊어질수록 넌 더 빛나
내 마음의 길을 비춰줘
달빛처럼 너에게 닿을게
숨겨둔 사랑도 밝혀줄게
저 별들 사이로 번진 약속
넌 내게 온 유일한 빛

[Verse 2]
잠든 도시 위로 번진
희미한 꿈의 조각들
스쳐 간 계절 끝에도
네가 남긴 향기가 있어

닿지 못해 더 애틋한
이름 하나 품고 살아
아픈 기억의 그림자도
네가 있으면 잠잠해

[Pre-Chorus]
어느 날 문득 돌아보면
내가 서 있던 모든 자리
늘 같은 방향으로
너를 향하고 있었어

[Chorus]
달빛처럼 너에게 닿을게
멀어져도 사라지지 않게
밤이 깊어질수록 넌 더 빛나
내 마음의 길을 비춰줘
달빛처럼 너에게 닿을게
숨겨둔 사랑도 밝혀줄게
저 별들 사이로 번진 약속
넌 내게 온 유일한 빛

[Bridge]
만질 수 없는 거리라도
사랑은 길을 잃지 않아
서로를 모른 척한 시간도
이제는 다 너를 향해

눈을 감아도 보여
희미한 내일 끝에
네가 서 있어
웃고 있어

[Final Chorus]
달빛처럼 너에게 닿을게
끝내 너를 놓지 않게
밤이 깊어질수록 넌 더 빛나
내 마음의 길을 비춰줘
달빛처럼 너에게 닿을게
이 운명 끝에 널 안을게
어둔 하늘을 건너온 사랑
이제 따뜻하게 번져가
달빛처럼 너에게 닿을게
영원처럼 너에게 닿을게`;
  }

  if (normalized.includes("도화 화개 love charm")) {
    return `[Intro]
도화처럼 피어나
홍염처럼 물들어
화개처럼 반짝이는
나의 love charm

[Verse 1]
오늘따라 이상해
네 앞에만 서면
볼 끝에 꽃이 피고
말투가 살짝 달라져

그냥 웃었을 뿐인데
넌 자꾸 눈을 못 떼
내 사주 속 작은 별들이
너를 향해 깨어나

[Pre-Chorus]
도화는 살랑살랑
내 눈빛에 내려앉고
홍염은 두근두근
내 마음을 붉게 물들여

화개는 조용조용
비밀처럼 빛나
알면 알수록 더 예쁜
나의 사랑 공식

[Chorus]
살랑살랑, 내 맘이 피어나
너를 보면 꽃잎처럼 날아가
반짝반짝, 이 순간이 좋아
내 매력에 살짝 빠져봐

도화도 홍염도 love mode
화개는 moonlight glow
살랑살랑, 너에게 번져가
오늘부터 너는 내 운명 같아

[Post-Chorus]
Love charm, love charm
도화빛 love charm
Love charm, love charm
홍염빛 my heart

살랑살랑, 두근두근
너만 보면 bloom bloom bloom
화개처럼 신비롭게
내 마음은 zoom zoom zoom

[Verse 2]
괜히 머릴 넘기고
괜히 눈을 피하고
아닌 척해도 내 마음은
네 이름만 따라가

친구들이 말해
“너 요즘 좀 예뻐졌어”
아마도 네가 내 하루에
봄을 데려온 걸까

[Pre-Chorus]
도화는 포근포근
내 미소에 스며들고
홍염은 말랑말랑
내 고백을 준비해

화개는 반짝반짝
달빛 아래 속삭여
조금 느려도 괜찮아
이건 운명일 테니까

[Chorus]
살랑살랑, 내 맘이 피어나
너를 보면 꽃잎처럼 날아가
반짝반짝, 이 순간이 좋아
내 매력에 살짝 빠져봐

도화도 홍염도 love mode
화개는 moonlight glow
살랑살랑, 너에게 번져가
오늘부터 너는 내 운명 같아

[Rap]
도화는 bloom, 홍염은 boom
화개는 moonlight in my room
말 안 해도 느껴지는 mood
나를 보면 자꾸 lose your cool

관심은 많아도 쉽게는 no
내 마음 열쇠는 secret code
예쁜데 이상하게 깊어
그래서 더 위험한 flow

[Bridge]
너에게 예뻐 보이고 싶어
근데 꾸미지 않아도 좋아
내 안의 별과 꽃과 달이
너를 만나 더 빛나니까

[Final Chorus]
살랑살랑, 사랑이 피어나
너와 나의 계절이 시작돼
반짝반짝, 숨길 수가 없어
내 마음이 너를 부르잖아

도화도 홍염도 love mode
화개는 moonlight glow
살랑살랑, 네 품에 닿으면
우연마저 운명이 될 거야

[Outro]
도화처럼 피어나
홍염처럼 물들어
화개처럼 빛나는
나의 love charm`;
  }

  if (normalized.includes("별빛 궤도속 fatal-sign")) {
    return `[Intro]
Fatal sign
별들이 깨어나
넌 이미 내 궤도 안에 있어

[Verse 1]
검은 밤 위로 걸어 들어가
공기가 먼저 나를 알아봐
말없이 스친 내 silhouette
네 시선은 멈춰, no escape

Rising sign, 첫눈에 새겨져
Venus smile, 부드럽게 번져
Moonlight shadow, 감춰둔 비밀
알수록 더 깊어지는 느낌

[Pre-Chorus]
가까이 오면 더 위험해
멀어지면 더 궁금해
내 차트 속 어둔 별들이
너의 심장을 불러

[Chorus]
별빛에 걸려, fatal sign
넌 내 궤도 안에 locked tonight
도망쳐 봐도, can’t deny
결국 내 이름을 부르게 돼

Fatal, fatal, 넌 빠져가
Mars on fire, 뜨겁게 번져가
별빛에 걸려, fatal sign
오늘 밤 넌 나를 잊지 못해

[Post-Chorus]
Fatal sign, fatal sign
Venus, Mars, Moon collide
Fatal sign, fatal sign
넌 내 별에 걸려 tonight

[Verse 2]
내 눈빛은 eclipse
빛과 어둠 사이의 kiss
손끝 하나로 shift
네 운명이 흔들리는 switch

Pluto vibe, 깊이 끌어당겨
Saturn line, 쉽게는 못 넘겨
달콤한 미로처럼
넌 계속 나를 따라와

[Pre-Chorus]
숨겨둔 내 별자리
너만 보게 될 story
운명이라 말하긴 이르지만
이미 시작된 gravity

[Chorus]
별빛에 걸려, fatal sign
넌 내 궤도 안에 locked tonight
도망쳐 봐도, can’t deny
결국 내 이름을 부르게 돼

Fatal, fatal, 넌 빠져가
Mars on fire, 뜨겁게 번져가
별빛에 걸려, fatal sign
오늘 밤 넌 나를 잊지 못해

[Rap]
Rising on me, 첫 장면 freeze
Venus in my voice, 넌 이미 weak
Mars in my move, 심장이 beat
Moon in my eyes, 더 깊은 deep

Pluto pull, 너를 당겨 slow
Cosmic rhythm, 몸이 먼저 know
별들이 그린 dangerous line
넌 이미 crossing my sign

[Bridge]
나를 사랑하면 길을 잃어
쉽게 끝날 꿈은 아니니까
하지만 네가 진심이라면
내 가장 어두운 별도 보여줄게

[Dance Break]
Fatal, fatal
Sign, sign
Orbit, orbit
Mine, mine

[Final Chorus]
별빛에 걸려, fatal sign
운명처럼 네 맘에 새겨져
멈추려 해도, can’t rewind
너의 밤은 나로 물들어가

Fatal, fatal, 더 깊어져
달빛 아래 모든 별이 터져
별빛에 걸려, fatal sign
넌 내 우주 안에 갇혀 있어

[Outro]
Fatal sign
별들이 말해
넌 이미 내 궤도 안에 있어`;
  }

  if (normalized.includes("flip the card")) {
    return `[Intro]
Shh… the cards are awake
Royal Arcana
운명의 문이 열려

[Verse 1]
검은 벨벳 위에 내려앉은 moonlight
황금 촛불 사이 너를 본 순간
첫 장은 The Magician, 손끝의 sign
내 심장은 이미 너를 선택한 night

은빛 컵에 담긴 비밀 같은 눈빛
검의 기사처럼 다가가는 heartbeat
말하지 않아도 알아, destiny call
카드 한 장 위에 새겨진 우리 둘

[Pre-Chorus]
The Moon은 속삭여, 숨겨둔 마음
The Tower 무너져도 넌 나의 crown
운명의 수레바퀴 돌아가
이 밤의 끝에서 널 데려가

[Chorus]
Flip that card, royal heart
내 운명 위에 올라타
Lovers, Lovers, 너와 나
왕관보다 빛나잖아

Tarot, Tarot, tell me now
누가 내 심장을 훔쳤나
카드가 말해, it’s you, it’s you
오늘 밤 넌 나의 queen of stars

[Post-Chorus Hook]
Card, card, flip it
Heart, heart, steal it
운명처럼 coming, coming
Royal love, we rule it

Card, card, flip it
Heart, heart, feel it
타로 속의 너와 나
Royal, royal, Arcana

[Verse 2]
The Emperor처럼 난 고개를 들어
차가운 표정 뒤 불꽃을 숨겨
The Fool이라 해도 너라면 jump
절벽 끝에서도 널 향해 run

별의 카드 아래 맹세해 tonight
상처도 금빛으로 바뀌는 highlight
Death card 뒤엔 다시 피는 rose
끝난 줄 알았던 사랑이 reload

[Pre-Chorus 2]
The Star는 비춰줘, 우리의 다음
Justice도 인정해, 완벽한 balance
운명의 수레바퀴 돌아가
이 밤의 왕좌로 널 데려가

[Chorus]
Flip that card, royal heart
내 운명 위에 올라타
Lovers, Lovers, 너와 나
왕관보다 빛나잖아

Tarot, Tarot, tell me now
누가 내 심장을 훔쳤나
카드가 말해, it’s you, it’s you
오늘 밤 넌 나의 queen of stars

[Bridge]
눈 감아도 보여
열두 시의 palace
금빛 별이 내려
우릴 위한 prophecy

뒤집힌 카드도 괜찮아
너와 나면 해석은 달라
불길한 예언마저
사랑 앞에 무릎 꿇어

[Dance Break]
One card, two cards, royal sign
Three cards, four cards, cross the line
Crown up, lights up, destiny
Arcana, Arcana, follow me

[Final Chorus]
Flip that card, royal heart
내 운명 위에 올라타
Lovers, Lovers, 너와 나
왕관보다 빛나잖아

Tarot, Tarot, tell me now
누가 내 심장을 훔쳤나
카드가 말해, it’s you, it’s you
오늘 밤 넌 나의 queen of stars

[Outro]
Card, card, flip it
Heart, heart, steal it
타로 속의 너와 나
Royal, royal, Arcana`;
  }

  if (normalized.includes("i am your fate")) {
    return `[Intro]
Saju, Tarot, Star sign, Zi Wei
운명의 판이 열려
I am your fate
넌 이미 내 예언 안에 있어

[Verse 1]
검은 밤 위로 조명이 켜져
명반이 돌아, 별들이 깨어
네 심장 위에 새겨진 sign
피할 수 없는 나의 design

사주는 말해, 난 네 용신
타로는 뽑아, The Lovers scene
금성은 빛나, 화성은 fire
자미성 crown, 올라가 higher

[Pre-Chorus]
도망쳐 봐도 결국 내 orbit
읽히는 눈빛, 숨겨도 logic
카드도 별도 명반도 모두
한 방향만 가리켜

[Chorus]
I am your fate, fate, fate
운명 위에 내가 서
Call my name, name, name
네 밤을 전부 흔들어

사주 타로 별자리까지
답은 나야, can’t deny
I am your fate, fate, fate
넌 내 운명에 locked tonight

[Post-Chorus]
Fate, fate, 운명이 터져
Name, name, 내 이름 불러
별빛 아래, 카드 위에
넌 이미 나를 선택해

[Verse 2]
달빛은 dark, 내 미소는 danger
네 마음을 여는 secret changer
합이면 sweet, 충이면 thriller
그래도 끌려, I’m your killer

자미두수 명궁에 center
관록궁 불타, 무대는 fever
타로 속 Devil도 고개를 끄덕
이 끌림은 너무 깊어, deeper

[Pre-Chorus]
읽을 수 없는 나의 equation
하지만 느껴지는 attraction
네 운세 속 가장 강한 문장
그건 바로 나였어

[Chorus]
I am your fate, fate, fate
운명 위에 내가 서
Call my name, name, name
네 밤을 전부 흔들어

사주 타로 별자리까지
답은 나야, can’t deny
I am your fate, fate, fate
넌 내 운명에 locked tonight

[Rap]
명반 check, 차트 check
내 등장은 cosmic effect
Venus drip, Mars attack
심장 위로 drop that track

대운이 와, 세운이 와
결국 네 시선은 내게 와
타로 카드 뒤집어 봐
결론은 me, no more doubt

[Bridge]
예언처럼 다가와
악몽처럼 아름다워
네가 찾던 답이 나라면
무릎 꿇지 말고 날 바라봐

[Dance Break]
Saju, Tarot
Star sign, Zi Wei
Fate, fate
I am your fate

Crown, card
Moon, heart
운명판 위로
We rise, we rise

[Final Chorus]
I am your fate, fate, fate
운명보다 강하게
Call my name, name, name
네 세계를 깨워내

사주 타로 별자리까지
전부 나를 가리켜
I am your fate, fate, fate
오늘 밤 넌 내게 걸렸어

[Outro]
Saju, Tarot, Star sign, Zi Wei
운명의 판이 닫혀
I am your fate
넌 이미 내 별 안에 있어`;
  }

  if (normalized.includes("synastry gravity")) {
    return `[Intro]
Yeah
Our charts collide
Synastry, destiny
너와 나의 별이 겹쳐

[Verse 1]
처음 본 순간 이상했어
내 태양이 네 달을 깨워
말도 안 되게 익숙한 vibe
전생부터 이어진 sign

내 Venus는 네 Mars를 불러
심장이 먼저 궤도를 돌아
낯선데 너무 가까워
별들이 이미 알고 있었어

[Pre-Chorus]
네 눈빛은 my rising sign
숨길수록 더 선명해져
Saturn처럼 무겁게 와도
이 사랑은 도망 못 가

[Chorus]
Synastry, 너와 나의 chemistry
별자리 위에 새긴 fantasy
Sun to Moon, Venus to Mars
부딪혀도 우린 shining stars

Synastry, 운명 같은 gravity
멀어져도 다시 pull me in
North Node 따라 너에게 가
이건 사랑보다 깊은 sign

[Post-Chorus Hook]
Star, star, star, we align
Heart, heart, heart, cross the line
끌려, 끌려, cosmic love
너와 나의 synastry

Star, star, star, we collide
Heart, heart, heart, 밤새 shine
돌아, 돌아, destiny
너와 나의 synastry

[Verse 2]
네 Pluto가 내 맘을 흔들어
숨겨둔 어둠까지 밝혀
네 Mercury, 내 말투를 읽어
말 안 해도 대답을 들어

7하우스 문이 열리고
12하우스 꿈이 번지고
스쳐 간 줄 알았던 너는
내 차트 안에 살고 있었어

[Pre-Chorus 2]
Square라 해도 겁 안 나
아픈 만큼 더 뜨거워져
Trine처럼 쉽게 흐르다
Conjunction, 하나가 돼

[Chorus]
Synastry, 너와 나의 chemistry
별자리 위에 새긴 fantasy
Sun to Moon, Venus to Mars
부딪혀도 우린 shining stars

Synastry, 운명 같은 gravity
멀어져도 다시 pull me in
North Node 따라 너에게 가
이건 사랑보다 깊은 sign

[Bridge]
달이 기울어도
별은 지워지지 않아
차트가 틀려도
우린 답을 찾아가

운명이 장난친대도
나는 너를 선택해
불길한 각도마저
우리만의 무대가 돼

[Dance Break]
Sun, Moon, Venus, Mars
Pull me close, we touch the stars
Trine, square, opposition
Love is our ignition

[Final Chorus]
Synastry, 너와 나의 chemistry
별자리 위에 새긴 fantasy
Sun to Moon, Venus to Mars
부딪혀도 우린 shining stars

Synastry, 운명 같은 gravity
멀어져도 다시 pull me in
North Node 따라 너에게 가
이건 사랑보다 깊은 sign

[Outro]
Star, star, star, we align
Heart, heart, heart, cross the line
너와 나의 별이 겹쳐
This is our synastry`;
  }

  if (normalized.includes("lucky thief")) {
    return `[Intro]
Yeah
Bad luck on the table
We don’t ask, we take it
Lucky Thief, ha

[Verse 1]
오늘 운세? 위험 신호
웃기지 마, 내가 신호
검은 밤을 밟고 들어가
네 불안을 훔쳐, clean mode

빨간 경고등이 blink blink
내 발끝은 더 quick quick
손금 위를 미끄러져
네 마음선에 내 이름 찍지

걱정은 너무 느려
난 이미 문을 열어
불운이 날 노려봐도
I wink, then I take over

[Pre-Chorus]
쉿, 예감이 말해
오늘 밤은 뒤집혀
네가 겁낸 모든 bad sign
내 주머니 속에 갇혀

[Chorus]
I take your bad luck, take your heart
웃으면서 판을 바꿔
운명 따윈 wait, wait, wait
내가 먼저 움직여

I’m a lucky thief, dangerous charm
들키기 전에 더 가까워져
Bad sign, good night
Fortune, come alive
네 운세는 지금부터 mine

[Post-Chorus Hook]
Take it, take it, bad luck
Flip it, flip it, good luck
Steal it, steal it, your heart
Ha, ha, lucky thief

Tick-tock, one shot
Moonwalk, jackpot
Bad luck, bye-bye
Fortune on my side

[Verse 2]
럭키 컬러는 black suit
미소 뒤엔 sharp truth
타로카드처럼 뒤집어
넌 놀라지만 too smooth

숫자 7보다 더 lucky
내 등장은 almost guilty
불길한 꿈도 내가 해석해
“결론은 나를 믿지”

도망가도 소용없어
중력처럼 끌려왔어
좋은 날을 기다리지 마
내가 바로 길일이라서

[Pre-Chorus 2]
쉿, 심장이 말해
이미 답은 정해져
네가 숨긴 모든 wish list
내 리듬 위에 걸려

[Chorus]
I take your bad luck, take your heart
웃으면서 판을 바꿔
운명 따윈 wait, wait, wait
내가 먼저 움직여

I’m a lucky thief, dangerous charm
들키기 전에 더 가까워져
Bad sign, good night
Fortune, come alive
네 운세는 지금부터 mine

[Bridge]
불안은 금고에 lock
의심은 바닥에 drop
네 운명선 끝에서
난 기다려, knock knock

흉몽도 전부 remix
불길함마저 my trick
네가 날 부른 순간
Game over, I’m picked

[Dance Break]
Palm line, moon sign
Red light, green light
Flip card, steal heart
Move fast, don’t stop

One step, two step
운세를 hijack
Bad luck, get back
Lucky thief attack

[Final Chorus]
I take your bad luck, take your heart
웃으면서 판을 바꿔
운명 따윈 wait, wait, wait
내가 먼저 움직여

I’m a lucky thief, dangerous charm
들키기 전에 더 가까워져
Bad sign, good night
Fortune, come alive
네 운세는 지금부터 mine

[Outro]
Take it, take it, bad luck
Flip it, flip it, good luck
Steal it, steal it, your heart
Lucky thief, we take over`;
  }

  if (normalized.includes("zero hour") && normalized.includes("we don")) {
    return `[Intro]
Yeah
When the clock hits zero
We wake up
Blue hour boys

[Verse 1]
모두가 잠든 밤 열두 시 반
도시는 멈춰, 숨죽인 neon
교복 위에 걸친 black jacket
오늘도 운명은 나를 test it

거울 속의 내가 물어
“도망칠래, 아니면 더 걸어?”
겁은 심장 안에 locked up
난 웃고 말해, “let’s go up”

[Pre-Chorus]
푸른 달이 내려와
내 그림자를 비춰
끝을 아는 순간부터
난 더 크게 살아

[Chorus]
Zero hour, we don’t run
어둠 속을 밟고 올라
My shadow, my power
나를 삼켜도 난 더 빛나

Blue fire, burn it up
운명 따윈 break it now
살아 있다는 증거처럼
오늘 밤 내 심장이 louder

[Post-Chorus Hook]
Tick-tock, midnight
Blue flame, spotlight
Shadow, shadow, come and try
We rise, we rise, we rise

Tick-tock, no fear
End line, come near
살아, 살아, louder now
We rise, we rise, we rise

[Verse 2]
검은 복도 끝에 울린 bell
내 발소린 위험한 spell
누가 괴물인지 몰라도
내 안의 나부터 깨워

차가운 땀, but I like that
두려움도 나의 soundtrack
내 약점까지 무기로 들어
무대 위로 전부 끌어올려

[Pre-Chorus 2]
푸른 별이 떨어져
내 이름을 불러
끝을 향해 달릴수록
난 더 나를 믿어

[Chorus]
Zero hour, we don’t run
어둠 속을 밟고 올라
My shadow, my power
나를 삼켜도 난 더 빛나

Blue fire, burn it up
운명 따윈 break it now
살아 있다는 증거처럼
오늘 밤 내 심장이 louder

[Bridge]
언젠가 모두 사라진대도
지금 이 순간은 내 거야
눈물도 흉터도 전부
내가 살아낸 proof야

끝이 두렵다면 더 춤춰
밤이 깊을수록 더 웃어
내 그림자와 손을 잡고
새벽까지 fight for life

[Dance Break]
Zero, zero, count it down
Blue moon over this town
Shadow step, heart attack
Never, never turning back

One life, one night
No fear, blue light
Break fate, ignite
We own the midnight

[Final Chorus]
Zero hour, we don’t run
어둠 속을 밟고 올라
My shadow, my power
나를 삼켜도 난 더 빛나

Blue fire, burn it up
운명 따윈 break it now
살아 있다는 증거처럼
오늘 밤 내 심장이 louder

[Outro]
Tick-tock, midnight
Blue flame, spotlight
끝을 알아도 난 살아
We rise, we rise, we rise`;
  }

  if (normalized.includes("별이 말해")) {
    return `[Intro]
별이 말해, 너였다고
처음부터 내 운명이었다고

[Verse 1]
오늘의 운세를 보다가
괜히 네 이름이 떠올랐어
좋은 일이 생긴다던 말
이상하게 너 같았어

타로 카드 한 장에도
별자리의 작은 말에도
내 마음은 같은 답을 골라
너에게로 가라고

[Pre-Chorus]
멀리 돌아온 계절 끝에
이제야 알 것 같아
내가 찾던 행운은
사람이었나 봐

[Chorus]
별이 말해, 너였다고
내 모든 길 끝에 네가 있었다고
운명처럼, 거짓말처럼
내 하루가 너로 빛나

사주도 타로도 별자리도
전부 너를 가리켜
오늘의 운명은 너야
내 사랑의 답은 너야

[Verse 2]
어긋난 날도 많았고
혼자 울던 밤도 있었어
사랑은 늘 어려운 문제라
피하고만 싶었어

근데 너를 만난 뒤로
내 세상이 조금 달라져
흐린 운도 맑아지는 듯해
네가 웃어줄 때면

[Pre-Chorus]
수많은 우연들이
하나씩 이어져서
결국 너라는 이름의
기적이 된 거야

[Chorus]
별이 말해, 너였다고
내 모든 길 끝에 네가 있었다고
운명처럼, 거짓말처럼
내 하루가 너로 빛나

사주도 타로도 별자리도
전부 너를 가리켜
오늘의 운명은 너야
내 사랑의 답은 너야

[Bridge]
내일이 보이지 않는 밤에도
네 손을 잡으면 알 것 같아
불안했던 나의 운명도
너와 함께라면 괜찮아

[Final Chorus]
별이 말해, 너였다고
처음부터 내 마음은 널 향했다고
늦게 와도, 멀리 돌아도
결국 우린 만날 사랑

사주도 타로도 별자리도
이제 같은 말을 해
평생의 운명은 너야
내 마지막 답은 너야

[Outro]
별이 말해, 너였다고
오늘도 난 너를 사랑한다고`;
  }

  if (normalized.includes("오행 flex")) {
    return `[Intro]
Yeah, yeah
Code in my destiny
목화토금수, we turn it up

[Verse 1]
내 원국 위에 불 켜
오늘 기분은 갑자기 병화
차갑던 밤도 녹여
무대 위로 올라, I’m on fire

비견은 옆에서 박수 쳐
식신은 훅을 뽑아 또
재성은 반짝, money sign
관성은 말해 “지금이야”

[Pre-Chorus]
합이면 가까워져
충이면 더 뜨거워져
형파해도 겁 안 나
내 팔자는 내가 remix now

[Chorus]
목화토금수, 오행 FLEX
내 운명은 무대 위에 dance
대운이 바뀌어, upgrade check
오늘부터 내가 내 lucky star

목화토금수, balance up
용신처럼 너는 light me up
사주팔자 위로 jump, jump, jump
운명도 나를 따라 clap, clap, clap

[Post-Chorus Hook]
목! 화! 토! 금! 수!
Turn it up, turn it up
목! 화! 토! 금! 수!
운명까지 흔들어

[Verse 2]
겁재가 와도 I don’t care
내 멘탈은 금처럼 rare
편인은 생각이 너무 많대
그래도 난 무대에서 slay

정관처럼 반듯하게
칠살처럼 날카롭게
도화살 켜진 spotlight
오늘 밤 시선은 all mine

[Pre-Chorus 2]
기신은 bye, bye, bye
용신은 my, my, my
흔들려도 괜찮아
내 팔자는 내가 choose it now

[Chorus]
목화토금수, 오행 FLEX
내 운명은 무대 위에 dance
대운이 바뀌어, upgrade check
오늘부터 내가 내 lucky star

목화토금수, balance up
용신처럼 너는 light me up
사주팔자 위로 jump, jump, jump
운명도 나를 따라 clap, clap, clap

[Bridge]
어제의 나는 수기운에 잠겼고
오늘의 나는 화기운에 타올라
십년 대운이 돌아선 순간
새로운 나를 불러, destiny restart

[Dance Break]
합충형파해, break it down
천간지지, spin around
음양 rhythm, feel it now
운명 위로 bounce, bounce, bounce

[Final Chorus]
목화토금수, 오행 FLEX
내 운명은 무대 위에 dance
대운이 바뀌어, upgrade check
오늘부터 내가 내 lucky star

목화토금수, balance up
용신처럼 너는 light me up
사주팔자 위로 jump, jump, jump
운명도 나를 따라 clap, clap, clap

[Outro]
목! 화! 토! 금! 수!
We don’t stop
사주팔자 위에 pop
내 운명은 내가 rock`;
  }

  if (normalized.includes("천동성 힐링남")) {
    return `[Intro]
괜찮아, 내게 기대
오늘은 울어도 돼
네 하루 끝에 서 있을게
I’ll be your healing boy

[Verse 1]
괜찮은 척 웃는 너
그 표정 다 보이잖아
사람들 속에 지쳐도
내 앞에선 쉬어도 돼

자미두수 별빛 아래
천동성이 속삭여
서두르지 않아도 돼
너의 속도도 예쁘다고

[Pre-Chorus]
명궁에 작은 봄이 와
복덕궁엔 햇살이 번져
무너진 마음 한가운데
내가 조용히 앉아줄게

[Chorus]
괜찮아, 내게 기대
오늘은 울어도 돼
네 마음 비 오는 날엔
내가 우산이 되어줄게

쉬어가, 내 품에 기대
아픈 말은 내려놔도 돼
세상이 너무 빠를 때
오늘은 내가 네 힐링남

[Post-Chorus]
Healing, healing, 네 마음에 봄
Feeling, feeling, 웃음이 피어
살랑살랑 바람처럼
네 곁에 머물게

[Verse 2]
너무 잘하려 하지 마
가끔은 멈춰도 좋아
완벽하지 않은 너도
내 눈에는 반짝이니까

친구처럼 장난치고
연인처럼 안아줄게
귀엽게 웃는 그 순간
내 운명도 같이 풀려

[Pre-Chorus]
천동성의 다정한 빛
네 어깨 위에 내려와
괜히 센 척 안 해도 돼
내가 네 편이 되어줄게

[Chorus]
괜찮아, 내게 기대
오늘은 울어도 돼
네 마음 비 오는 날엔
내가 우산이 되어줄게

쉬어가, 내 품에 기대
아픈 말은 내려놔도 돼
세상이 너무 빠를 때
오늘은 내가 네 힐링남

[Bridge]
눈물이 나면 숨기지 마
그것도 너의 별빛이야
어두운 밤이 지나가면
우리에게 봄이 올 거야

[Final Chorus]
괜찮아, 내게 기대
오늘은 웃어도 돼
너의 지친 하루 끝에
내가 봄처럼 안아줄게

쉬어가, 내 품에 기대
천천히 다시 걸어가면 돼
네 마음이 편해질 때까지
나는 너의 힐링남

[Outro]
괜찮아, 내게 기대
오늘은 쉬어도 돼
네 하루 끝에 서 있을게
I’ll be your healing boy`;
  }

  if (normalized.includes("편관의 궤도")) {
    return `[Intro]
Warning, warning
가까이 오면 위험해
But I’ll protect you
편관 남자, let’s go

[Verse 1]
차갑게 보여도 오해하지 마
쉽게 마음을 꺼내진 않아
말보다 행동이 먼저인 타입
네 앞에선 절대 안 물러나

세상이 널 흔들어도
나는 흔들리지 않아
상처가 널 겨누는 순간
내가 먼저 막아설게

[Pre-Chorus]
날카로운 눈빛 뒤에
숨겨둔 진심이 있어
위험해 보여도 알아둬
난 네 편이 되는 남자

[Chorus]
편관편관, 위험한데 끌려
차가운 듯 뜨겁게 널 지켜
편관편관, 가까이 오면 떨려
네 앞에선 내가 방패가 돼

Red flag 같아도, I’m your guard
쉽게 무너지지 않는 heart
편관편관, 위험한데 끌려
나를 믿으면 끝까지 지켜

[Post-Chorus]
Danger, danger, but I’m your shield
Closer, closer, you know it’s real
편관편관, 널 지켜
편관편관, I’m your shield

[Verse 2]
착한 말만 하는 남잔 아냐
필요하면 독하게 말해
네가 무너지는 길이라면
내가 먼저 길을 막을게

사랑은 달콤한 말보다
끝까지 버티는 책임감
네 눈물 앞에서는 절대
도망치는 법을 몰라 난

[Pre-Chorus]
거칠어진 세상 속에
내가 네 울타리 될게
불안한 밤이 와도
내 어깨에 기대면 돼

[Chorus]
편관편관, 위험한데 끌려
차가운 듯 뜨겁게 널 지켜
편관편관, 가까이 오면 떨려
네 앞에선 내가 방패가 돼

Red flag 같아도, I’m your guard
쉽게 무너지지 않는 heart
편관편관, 위험한데 끌려
나를 믿으면 끝까지 지켜

[Rap]
Pyeon-gwan energy, sharp like a blade
흔들림 없는 나의 태도는 brave
네가 위험하면 I step in front
사랑도 전쟁이면 I never run

차가운 말투, 뜨거운 심장
내 방식은 조금 거칠지만
약속 하나는 절대 안 깨
너를 지키는 게 내 운명 같애

[Bridge]
나도 알아, 쉬운 남잔 아니야
때론 너무 강해 보일 거야
하지만 네가 내 사람이면
끝까지 너를 놓지 않아

[Dance Break]
편관, 편관
Danger, shield
편관, 편관
Never yield

[Final Chorus]
편관편관, 위험한데 끌려
상처보다 먼저 널 안아줄게
편관편관, 가까이 오면 떨려
네 세상에 내가 방패가 돼

Red flag 같아도, I’m your guard
너를 위해 강해지는 heart
편관편관, 위험한데 끌려
나를 믿으면 끝까지 지켜

[Outro]
Warning, warning
가까이 오면 위험해
But I’ll protect you
편관 남자, I’m your shield`;
  }

  if (normalized.includes("운세 soda pop")) {
    return `[Intro]
사주, 타로, 별자리, 자미두수
오늘 내 연애운 check it, check it
톡 쏘는 운명, pop it up
운세 어벤져스, let’s go

[Verse 1]
아침부터 네 이름이
내 머릿속에 bubble up
카톡 하나 기다리다
심장이 soda처럼 pop

사주는 말해 “너는 용신”
타로는 말해 “The Lovers”
별자리는 반짝반짝
자미두수도 너래, 너래

[Pre-Chorus]
합인지 충인지 몰라도
끌리는 건 확실해
별도 카드도 명반도
전부 너를 가리켜

[Chorus]
Pop pop, love is soda pop
내 연애운이 터져, 올라가
사주 타로 별자리까지
답은 결국 너야

Pop pop, heart is soda pop
너를 보면 톡 쏘는 my heart
자미두수 명반까지
내 운명은 너야

[Post-Chorus]
톡톡톡, 너 때문에 pop
두근두근, 멈출 수가 없어
톡톡톡, love soda pop
오늘의 운세는 너야

[Verse 2]
럭키 컬러 맞춰 입고
네가 있는 길로 walkin’
괜히 우연인 척하지만
사실 전부 timing

금성은 반짝, 달은 설렘
타로 카드는 핑크빛
명궁 속 내 마음까지
너 하나로 shining

[Pre-Chorus]
읽씹이면 흉운인가
답장 오면 대운인가
우주의 모든 알고리즘
너에게만 반응해

[Chorus]
Pop pop, love is soda pop
내 연애운이 터져, 올라가
사주 타로 별자리까지
답은 결국 너야

Pop pop, heart is soda pop
너를 보면 톡 쏘는 my heart
자미두수 명반까지
내 운명은 너야

[Rap]
사주로 check, 타로로 pick
별자리까지 완전 perfect fit
합이면 sweet, 충이면 thrill
그래도 너면 I want it still

명반을 봐도 네가 center
내 마음은 already enter
오늘 운세 대박 사건
너를 보면 터져 탄산처럼

[Bridge]
운세가 틀려도 괜찮아
내 마음은 이미 정답이야
카드도 별도 몰랐던 miracle
너 하나로 완성돼

[Final Chorus]
Pop pop, love is soda pop
내 심장이 터져, 올라가
사주 타로 별자리까지
답은 결국 너야

Pop pop, heart is soda pop
너와 나의 운명이 fizz up
자미두수 명반까지
내 마지막 답은 너야

[Outro]
톡톡톡, 너 때문에 pop
오늘의 운세는 너야
사주, 타로, 별자리까지
답은 결국 너야`;
  }

  if (normalized.includes("자미제왕 컴백")) {
    return `[Intro]
Crown on me
자미제왕 comeback
명반이 열려
왕의 별이 깨어나

[Verse 1]
조명이 켜진 순간
공기가 먼저 바뀌어
고개를 들어, look at me
내 자리는 center

명궁 위에 새겨진 sign
자미성이 나를 불러
평범하게 살라 해도
내 운명은 무대 위야

[Pre-Chorus]
복덕궁엔 빛이 차오르고
관록궁엔 불이 붙어
오늘 밤 내 별의 명령은
더 높이 올라가

[Chorus]
자미자미, crown on me
왕의 별이 내려와
자미자미, follow me
무대 위를 지배해

명반 속에 적힌 destiny
오늘 내가 주인공이지
자미자미, crown on me
제왕처럼 comeback해

[Post-Chorus]
Crown, crown, crown on me
별들이 다 bow to me
자미자미, rise with me
오늘 밤은 내 궁전

[Verse 2]
어제의 나는 bye bye
오늘의 나는 high light
대운 타고 올라가
내 이름이 headline

흔들려도 왕답게
넘어져도 더 크게
내 사주 속 제왕성이
다시 나를 일으켜

[Pre-Chorus]
천천히 온 시간들이
이 순간을 만든 거야
왕관은 그냥 쓰는 게 아냐
버틴 자만 빛나

[Chorus]
자미자미, crown on me
왕의 별이 내려와
자미자미, follow me
무대 위를 지배해

명반 속에 적힌 destiny
오늘 내가 주인공이지
자미자미, crown on me
제왕처럼 comeback해

[Rap]
자미성 on, 내 별은 royal
무대 위 걸음은 natural loyal
명궁 check, 관록궁 flame
내 운명의 판을 바꾸는 name

흉운이 와도 I don’t care
대운이 오면 올라타, yeah
왕관은 무겁지만 빛나
오늘 밤 내 별이 이긴다

[Bridge]
혼자 어둠을 지나왔어
아무도 믿지 않던 밤
하지만 별은 알고 있었어
내가 돌아올 거란 걸

[Dance Break]
자미, 자미
Crown on me
제왕, 제왕
Comeback king

명궁, 명반
Light on me
자미자미
Crown on me

[Final Chorus]
자미자미, crown on me
왕의 별이 폭발해
자미자미, follow me
이 무대는 나의 세계

운세마저 나를 가리켜
오늘 내가 전설이 돼
자미자미, crown on me
자미제왕 comeback해

[Outro]
Crown on me
자미제왕 comeback
별들이 말해
이제 내 시대야`;
  }

  if (normalized.includes("숙요점") || (normalized.includes("sukuyo") && normalized.includes("lesson"))) {
    const lyric = [
      "[INTRO — 숙요점 세계관 오프닝]",
      "띠링~ 숙요점 알림",
      "당신의 별과 그 사람의 별",
      "지금 몇 번째 관계인지",
      "한번 확인해볼까요?",
      "",
      "(준비됐어? 별자리 고~!)",
      "",
      "[VERSE 1 — 영(榮) : 서로 빛나게 해주는 관계]",
      "영(榮)이라는 말 들어봤어?",
      "네 별이 내 별을 비춰줄 때",
      "나도 몰랐던 내가 반짝여",
      "우리 함께면 둘 다 주인공",
      "",
      "카페에서 눈 마주친 그 순간",
      "괜히 오늘 운수 좋다 했잖아",
      "알고 보니 숙요점 영(榮) 관계",
      "이건 우연 아냐 별이 짠 거야",
      "",
      "(반짝, 반짝, 영~! 우린 영 사이야~)",
      "",
      "[PRE-CHORUS]",
      "27개의 별자리 중에",
      "우리 별이 만난 건 기적이야",
      "어떤 관계냐고 물어봐?",
      "숙요점이 다 알려줄게!",
      "",
      "[CHORUS — 7관계 롤콜]",
      "영(榮)이면 같이 빛나고",
      "친(親)이면 평생 편하고",
      "안(安)이면 잔잔하게 오래가고",
      "성(成)이면 꿈을 같이 이루고",
      "",
      "괴(壞)는 어긋나도 웃기고",
      "위(危)는 두근두근 짜릿하고",
      "명(命)이면 별이 정해준 거야",
      "우리 사이 뭐야? 숙요점에 물어봐!",
      "",
      "(물어봐~ 물어봐~ 숙요점~!)",
      "",
      "[VERSE 2 — 친(親) & 안(安) : 편안하고 안정적인 관계]",
      "친(親)이라는 건 말 안 해도 알아",
      "오래될수록 더 좋아지는 사람",
      "어색함 없이 침묵도 좋은 사이",
      "이런 게 진짜 인연 아닐까",
      "",
      "안(安)이면 싸움도 없고 평화로워",
      "잔잔한 호수 같은 우리 관계",
      "자극이 없어 심심하냐고?",
      "아니 이게 진짜 행복이거든!",
      "",
      "(친~ 안~ 편안해~ 오래가~)",
      "",
      "[BRIDGE — 괴(壞) : 어긋나는 관계 코믹 파트]",
      "근데 잠깐, 괴(壞) 얘기 해야 해",
      "이건 진짜 웃긴 관계거든",
      "",
      "내가 왼쪽 가면 넌 오른쪽",
      "내가 커피면 넌 꼭 주스",
      "내가 졸릴 때 넌 에너지 넘치고",
      "내가 신나면 넌 피곤하대",
      "",
      "(어?! 왜 이래?! 괴 관계잖아~!)",
      "",
      "근데 이상하게 또 생각나",
      "어긋나는 게 웃기고 귀여워",
      "완벽한 관계가 재미없잖아",
      "괴(壞)도 나름 매력 있어 인정~",
      "",
      "(어긋나~ 어긋나~ 근데 좋아~)",
      "",
      "[RAP BRIDGE — 위(危) & 성(成) : 긴장과 완성]",
      "위(危) 관계 주의보 들어봐",
      "심장이 쿵쾅거리는 그 느낌",
      "짜릿하고 위험하고 설레고",
      "근데 왜 자꾸 생각나는 거야",
      "",
      "성(成) 관계는 달라 차원이",
      "네가 있어야 내가 완성돼",
      "혼자선 반쪽이었던 퍼즐이",
      "딱 맞아 떨어지는 그 순간",
      "",
      "위(危)는 스릴, 성(成)은 완성",
      "둘 다 필요해 밸런스 맞게~",
      "(성~ 위~ 성~ 위~ 완성이야~!)",
      "",
      "[FINAL CHORUS — 명(命) : 운명 관계 클라이맥스]",
      "근데 있잖아 제일 특별한 건",
      "명(命)이라는 관계야 들어봐",
      "별이 태어날 때부터 정해놓은",
      "거역할 수 없는 운명의 인연",
      "",
      "영(榮)이면 같이 빛나고",
      "친(親)이면 평생 편하고",
      "안(安)이면 잔잔하게 오래가고",
      "성(成)이면 꿈을 같이 이루고",
      "",
      "괴(壞)는 어긋나도 웃기고",
      "위(危)는 두근두근 짜릿하고",
      "명(命)이면 이미 정해진 거야",
      "어떤 관계든 우린 인연이야!",
      "",
      "(인연이야~ 인연이야~ 숙요점~!)",
      "",
      "[OUTRO — 귀여운 마무리]",
      "자 이제 알았지?",
      "영, 친, 안, 괴, 성, 위, 명",
      "27개 별자리가 만들어내는",
      "우리들의 사랑 이야기",
      "",
      "당신의 별과 그 사람의 별",
      "지금 어떤 관계인지 궁금하다면",
      "숙요점에 물어봐~!",
      "",
      "(띠링~ 숙요점 완료~⭐)"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("용신") || normalized.includes("너는 나의 용신") || normalized.includes("yongshin")) {
    const lyric = [
      "[Intro]",
      "너는 나의 용신",
      "내 팔자 끝에서",
      "나를 살린 이름",
      "",
      "[Verse 1]",
      "내 사주판은 오래된 겨울",
      "불 하나 없이 얼어붙은 밤",
      "웃고 있어도 속은 차가워",
      "숨을 쉬어도 살아있지 않았어",
      "",
      "어떤 날의 나는 사막 같았고",
      "한 방울 수(水)도 없이 갈라졌지",
      "누가 와도 채울 수 없던",
      "내 명식의 빈칸 하나",
      "",
      "[Pre-Chorus]",
      "그때 네가 걸어왔어",
      "세운처럼 갑자기",
      "내 무너진 조후 위에",
      "따뜻한 계절이 내려",
      "",
      "사주단자 안 봐도 알아",
      "이건 그냥 사랑이 아냐",
      "내가 잃어버린 오행이",
      "너라는 이름으로 와",
      "",
      "[Chorus]",
      "너는 나의 용신, 용신",
      "내 운명을 깨운 중심, 중심",
      "팔자도 못 끊어",
      "이 사랑은 이미 쓰여 있어",
      "",
      "너는 나의 용신, 용신",
      "내 심장을 살린 불빛, 불빛",
      "사막엔 비처럼",
      "빙판엔 불처럼",
      "너는 나를 다시 숨 쉬게 해",
      "",
      "[Post-Chorus Hook]",
      "용신, 용신, 너는 나의 용신",
      "내 팔자에 박힌 마지막 진심",
      "용신, 용신, 너는 나의 용신",
      "기신 같은 세상 끝에 찾은 빛",
      "",
      "[Verse 2]",
      "목(木)이 없던 내 마음엔",
      "꿈이 자라날 숲이 없었고",
      "금(金)이 없던 내 선택엔",
      "끝내 지켜낼 선이 없었어",
      "",
      "토(土)가 약한 나의 하루는",
      "작은 말에도 무너졌고",
      "수(水)가 마른 밤의 나는",
      "눈물조차 흐르지 않았어",
      "",
      "근데 너는 이상했어",
      "말 한마디가 비가 되고",
      "눈빛 하나가 불이 되고",
      "품은 단단한 땅이 됐어",
      "",
      "[Pre-Chorus 2]",
      "합보다 더 깊고",
      "충보다 더 강해",
      "우린 아픈 별을 지나",
      "서로의 답이 된 거야",
      "",
      "대운이 바뀐 것처럼",
      "내 인생이 너로 돌아",
      "너를 만난 그 순간부터",
      "내 팔자가 노래해",
      "",
      "[Chorus]",
      "너는 나의 용신, 용신",
      "내 운명을 깨운 중심, 중심",
      "팔자도 못 끊어",
      "이 사랑은 이미 쓰여 있어",
      "",
      "너는 나의 용신, 용신",
      "내 심장을 살린 불빛, 불빛",
      "사막엔 비처럼",
      "빙판엔 불처럼",
      "너는 나를 다시 숨 쉬게 해",
      "",
      "[Bridge]",
      "내가 너무 뜨거우면",
      "너는 깊은 강이 돼줘",
      "내가 너무 차가우면",
      "붉은 태양이 돼줘",
      "",
      "내가 길을 잃어버리면",
      "내 북극성이 돼줘",
      "천간 끝에, 지지 끝에",
      "내가 찾던 건 너였어",
      "",
      "[Final Chorus]",
      "너는 나의 용신, 용신",
      "내 운명을 깨운 중심, 중심",
      "팔자도 못 끊어",
      "이 사랑은 이미 쓰여 있어",
      "",
      "너는 나의 용신, 용신",
      "내 심장을 살린 불빛, 불빛",
      "사막엔 비처럼",
      "빙판엔 불처럼",
      "너는 나를 다시 숨 쉬게 해"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("mbti") || normalized.includes("일간") || normalized.includes("천간합")) {
    const lyric = [
      "[intro]",
      "(crunchy guitar riff, punchy snare, 8 bars — cheeky and bouncy)",
      "",
      "[verse]",
      "처음 만난 소개팅 자리",
      "어색한 아이스 아메리카노",
      "상대가 웃으며 물어보려 해",
      "혹시 MBTI가...",
      "",
      "잠깐, 나 먼저 물어볼게",
      "태어난 시간이 어떻게 돼?",
      "당황한 표정 잠깐 얼어붙고",
      "...네?",
      "",
      "[pre-chorus]",
      "F라서 공감하는 게 아냐",
      "내 글자가 네 글자를 안아주는 거지",
      "T야, J야 그딴 거 필요 없어",
      "난 이미 만세력에 네 생일 입력했어",
      "",
      "[chorus]",
      "MBTI 물어보지 마",
      "그건 너무 좁아, 네 글자로 어떻게 알아",
      "나는 네 일간(日干)이 뭔지가 궁금해",
      "그게 진짜 너니까",
      "",
      "ENFP든 ISTJ든 상관없어",
      "우린 천간합(天干合)이면 그걸로 끝이야",
      "기(己)토와 갑(甲)목의 만남처럼",
      "땅이 나무를 붙잡아버리듯이",
      "",
      "[verse]",
      "두 번째 만남, 카페 창가 자리",
      "이번엔 내가 먼저 핸드폰 꺼내",
      "만세력 앱 열어서 슬쩍 보여줘",
      "우리 삼합(三合)이야, 봐봐",
      "",
      "\"이게 뭐야?\" 웃음 터지더니",
      "그럼 우리 잘 맞는 거야?",
      "그 눈빛 하나로 이미 알았어",
      "설명 안 해도 느끼는 거잖아",
      "",
      "[pre-chorus]",
      "식상하게 T야? 묻지 마",
      "내 사주에 식신(食神)이 넘쳐서",
      "그냥 챙겨주고 싶은 거야",
      "이게 성격이 아니라 사주라니까",
      "",
      "[chorus]",
      "MBTI 물어보지 마",
      "그건 너무 좁아, 네 글자로 어떻게 알아",
      "나는 네 일간(日干)이 뭔지가 궁금해",
      "그게 진짜 너니까",
      "",
      "ENFP든 ISTJ든 상관없어",
      "우린 천간합(天干合)이면 그걸로 끝이야",
      "기(己)토와 갑(甲)목의 만남처럼",
      "땅이 나무를 붙잡아버리듯이",
      "",
      "[guitar solo]",
      "(playful winding guitar solo, 12 bars, bass punching underneath)",
      "",
      "[bridge]",
      "야, 솔직히 말해줄게",
      "MBTI는 나도 알아, 나 ENFJ거든",
      "근데 그게 뭘 말해줘? 고작 네 글자가",
      "내가 왜 너한테 이렇게 끌리는지를",
      "",
      "천간(天干) 열 개, 지지(地支) 열두 개",
      "그 조합으로 만들어진 사주팔자",
      "우주가 너를 설계한 방식이",
      "MBTI보다 훨씬 정교하잖아",
      "",
      "그러니까 나한테",
      "태어난 시간, 하나만 알려줘",
      "",
      "[chorus]",
      "MBTI 물어보지 마",
      "그건 너무 좁아, 네 글자로 어떻게 알아",
      "나는 네 일간(日干)이 뭔지가 궁금해",
      "그게 진짜 너니까",
      "",
      "ENFP든 ISTJ든 상관없어",
      "우린 천간합(天干合)이면 그걸로 끝이야",
      "기(己)토와 갑(甲)목의 만남처럼",
      "땅이 나무를 붙잡아버리듯이",
      "",
      "[outro]",
      "MBTI 물어보지 마 (물어보지 마)",
      "사주가 훨씬 낫잖아 (훨씬 낫잖아)",
      "야, 태어난 시간 알려줘",
      "그럼 내가 다 알아낼게",
      "(guitar riff fades out, cheeky drum fill at the end)"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("운명은 위대하다") || normalized.includes("great destiny") || normalized.includes("위대하다")) {
    const lyric = [
      "[Intro]",
      "저 밤하늘을 올려다봐",
      "작은 두려움은 멀어져",
      "끝없는 빛들 사이로",
      "내 이름이 들려와",
      "",
      "[Verse 1]",
      "돌아보면 헛걸음 같던 날",
      "왜 이리 멀리만 돌았나",
      "부서진 문턱마다",
      "혼자 울던 밤들",
      "의미 없는 듯 스친 상처도",
      "나를 여기 세웠나 봐",
      "",
      "[Pre-Chorus]",
      "무너진 길 위에도",
      "선명히 이어진 선",
      "헤매던 내 발끝이",
      "결국 여기로 와",
      "흩어진 시간들 속",
      "숨은 뜻을 따라가",
      "두려움 너머에서",
      "운명이 날 불러",
      "",
      "[Chorus]",
      "운명은 위대하다",
      "나를 여기까지 데려왔다",
      "운명은 위대하다",
      "모든 아픔도 길이 됐다",
      "나는 우연이 아니야",
      "거대한 이야기야",
      "무너져도 다시 서",
      "또 다른 하늘 아래",
      "",
      "[Verse 2]",
      "스친 만남 하나까지",
      "그 안에 이유가 있어",
      "떠나간 이름들마저",
      "내 안에 남아 있어",
      "상처는 지워지지 않아도",
      "살아낸 표식이 돼",
      "꿈은 멀어 보였지만",
      "끝내 나를 이끌어",
      "",
      "[Pre-Chorus]",
      "갈라진 마음 사이",
      "빛은 더 깊어져",
      "버린 줄 알았던 것",
      "전부 나를 키워",
      "넘어진 자리마다",
      "새로운 숨이 차올라",
      "이제는 알 것 같아",
      "두려워할 것 없어",
      "",
      "[Chorus]",
      "운명은 위대하다",
      "나를 여기까지 데려왔다",
      "운명은 위대하다",
      "모든 아픔도 길이 됐다",
      "나는 우연이 아니야",
      "거대한 이야기야",
      "무너져도 다시 서",
      "또 다른 하늘 아래",
      "",
      "[Bridge]",
      "운명은 사슬이 아니야",
      "더 강해지라 부르는 빛",
      "내가 넘어질수록",
      "더 멀리 보게 해",
      "끝이 아니라 시작",
      "내 안의 불꽃을 깨워",
      "이 길의 중심에서",
      "나는 나로 피어나",
      "",
      "[Final Chorus]",
      "운명은 위대하다",
      "이제 나는 두려워하지 않아",
      "운명은 위대하다",
      "나를 부르는 그 손을 잡아",
      "나는 우연이 아니야",
      "거대한 이야기야",
      "다시 걷고 또 걸어",
      "운명과 함께 가",
      "",
      "[Outro]",
      "별들은 아직도 빛나",
      "길은 아직 끝나지 않아",
      "나는 여기서",
      "더 멀리 간다"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("십성 로큰롤") || normalized.includes("십성") || (normalized.includes("rock") && normalized.includes("ten"))) {
    const lyric = [
      "[Intro]",
      "자, 십성 불러봐",
      "내 안의 열 캐릭터",
      "비견 겁재 식신 상관",
      "정재 편재 정관 편관",
      "정인 편인",
      "볼륨 올려",
      "",
      "[Verse 1]",
      "비견은 말해, 나도 나야",
      "내 안의 라이벌, 자존심이야",
      "같이 가면 동료인데",
      "삐끗하면 고집 폭발이야",
      "",
      "겁재는 웃으며 다가와",
      "친구야, 한 잔만 더 하자",
      "정신 차려 보면 계산은 나",
      "의리는 좋은데 지갑은 아파",
      "",
      "식신은 느긋하게 밥을 먹고",
      "재능을 꺼내서 웃게 만들고",
      "상관은 입 열면 레전드",
      "근데 선 넘으면 관계는 엔드",
      "",
      "[Pre-Chorus]",
      "내 사주 안에 다 살아",
      "천사도 있고 빌런도 살아",
      "운명 탓만 하지 마",
      "캐릭터를 조종해 봐",
      "",
      "[Chorus]",
      "십성 십성 로큰롤",
      "내 인생 캐릭터 총출동",
      "좋고 나쁨이 아니라",
      "어떻게 쓰느냐가 포인트야",
      "",
      "십성 십성 로큰롤",
      "내 마음 스위치를 켜고",
      "비견 겁재 식상 재성",
      "관성 인성 다 같이 뛰어",
      "",
      "Hey, hey, 십성 로큰롤",
      "Hey, hey, 내 운명 컨트롤",
      "알면 웃기고 쓰면 강해",
      "사주는 실전이야",
      "",
      "[Verse 2]",
      "정재는 약속을 지켜",
      "돈도 사랑도 꾸준히 쌓아",
      "편재는 기회를 보면",
      "바로 달려가 flex를 쏜다",
      "",
      "정관은 말해, 기준 지켜",
      "사회생활 모드로 자세 잡아",
      "편관은 위기 앞에서",
      "눈빛 바뀌고 보스전 입장",
      "",
      "정인은 따뜻한 이불 같아",
      "공부하고 기대고 쉬게 해",
      "편인은 이상한 천재 같아",
      "생각은 우주, 실행은 어디야",
      "",
      "[Pre-Chorus]",
      "재성은 현실을 묻고",
      "관성은 책임을 묻고",
      "인성은 마음을 안고",
      "식상은 세상에 외쳐",
      "",
      "[Chorus]",
      "십성 십성 로큰롤",
      "내 인생 캐릭터 총출동",
      "좋고 나쁨이 아니라",
      "어떻게 쓰느냐가 포인트야",
      "",
      "십성 십성 로큰롤",
      "내 마음 스위치를 켜고",
      "비견 겁재 식상 재성",
      "관성 인성 다 같이 뛰어",
      "",
      "Hey, hey, 십성 로큰롤",
      "Hey, hey, 내 운명 컨트롤",
      "알면 웃기고 쓰면 강해",
      "사주는 실전이야",
      "",
      "[Bridge]",
      "비견은 나를 세우고",
      "겁재는 한계를 알려",
      "식신은 나를 살리고",
      "상관은 세상을 찔러",
      "",
      "정재는 하루를 쌓고",
      "편재는 판을 뒤집어",
      "정관은 길을 만들고",
      "편관은 벽을 부숴",
      "",
      "정인은 나를 감싸고",
      "편인은 깊이 파고들어",
      "열 개의 별난 힘으로",
      "나는 나를 다시 배워",
      "",
      "[Final Chorus]",
      "십성 십성 로큰롤",
      "내 안의 우주가 소리쳐",
      "사주가 정답은 아니야",
      "나를 읽는 지도일 뿐이야",
      "",
      "십성 십성 로큰롤",
      "내 인생 무대를 열어",
      "비견 겁재 식상 재성",
      "관성 인성 다 불태워",
      "",
      "Hey, hey, 십성 로큰롤",
      "Hey, hey, 내 운명 컨트롤",
      "알면 웃기고 쓰면 강해",
      "내 사주는 내가 켜",
      "",
      "[Outro]",
      "비견 겁재 식신 상관",
      "정재 편재 정관 편관",
      "정인 편인",
      "십성 로큰롤",
      "내 인생 지금부터 시작"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("안괴") || normalized.includes("안-괴") || normalized.includes("안돼")) {
    const lyric = [
      "[Intro]",
      "안-괴",
      "안-돼",
      "숙요의 별이 경고해",
      "도망쳐도 다시 너",
      "",
      "안-괴",
      "안-돼",
      "위험한데 더 끌려",
      "이건 사랑주의보",
      "",
      "[Verse 1]",
      "처음엔 그냥 스친 줄 알았지",
      "근데 눈빛 하나에 판이 뒤집혔지",
      "좋아하면 편해야 하는데",
      "너는 왜 내 평화를 깨우는지",
      "",
      "안은 나를 끌어당기고",
      "괴는 나를 흔들어 깨",
      "상처를 건드리는데",
      "이상하게 살아 있는 느낌",
      "",
      "사람들은 말해",
      "야, 그건 좀 위험해",
      "근데 심장은 말해",
      "그래서 더 진짜인데?",
      "",
      "[Pre-Chorus]",
      "합처럼 달콤하진 않아",
      "편한 사랑도 아니야",
      "근데 네가 없으면",
      "내 하루가 다 꺼져",
      "",
      "부딪혀도 다시",
      "깨져도 다시",
      "나는 결국",
      "너에게 간다",
      "",
      "[Chorus]",
      "안괴 안돼, 도망쳐도 다시 너",
      "끌려가듯 내 심장이 너를 불러",
      "아프게 흔들어도",
      "끝내 나를 깨워",
      "이 사랑은 위험한데 살아 있어",
      "",
      "안괴 안돼, 부서져도 다시 너",
      "쉽지 않아 더 깊게 새겨져",
      "상처인지 운명인지",
      "아직 몰라도",
      "나는 너를 피하지 않아",
      "",
      "[Post-Chorus]",
      "안-괴, 안-돼",
      "도망쳐도 다시 back",
      "안-괴, 안-괴",
      "심장부터 check",
      "",
      "안-괴, 안-돼",
      "위험해도 go straight",
      "너라는 별 앞에",
      "나는 brake가 안 돼",
      "",
      "[Verse 2]",
      "말 한마디에 전쟁이 되고",
      "침묵 하나에 밤이 무너져",
      "근데 웃긴 건 이 모든 난리 뒤에",
      "제일 보고 싶은 사람도 너야",
      "",
      "괴는 내 약점을 찌르고",
      "안은 네 숨결을 남겨",
      "밀어내면 더 선명해져",
      "이건 진짜 미친 궁합",
      "",
      "나는 착한 척 안 해",
      "겁나도 숨진 않아",
      "사랑이 시험이면",
      "끝까지 풀어볼 거야",
      "",
      "[Pre-Chorus]",
      "불안은 나를 태우고",
      "갈등은 나를 벼려",
      "네가 내 운명이라면",
      "난 정면으로 간다",
      "",
      "부딪혀도 다시",
      "깨져도 다시",
      "나는 결국",
      "너를 택한다",
      "",
      "[Chorus]",
      "안괴 안돼, 도망쳐도 다시 너",
      "끌려가듯 내 심장이 너를 불러",
      "아프게 흔들어도",
      "끝내 나를 깨워",
      "이 사랑은 위험한데 살아 있어",
      "",
      "안괴 안돼, 부서져도 다시 너",
      "쉽지 않아 더 깊게 새겨져",
      "상처인지 운명인지",
      "아직 몰라도",
      "나는 너를 피하지 않아",
      "",
      "[Bridge]",
      "널 소유하겠다는 게 아냐",
      "널 이기겠다는 것도 아냐",
      "우리가 서로를 찌른 만큼",
      "서로를 더 알아가자는 거야",
      "",
      "안괴의 밤이 깊어도",
      "내 마음은 도망 안 가",
      "불안 속에서도",
      "나는 사랑을 찾는다",
      "",
      "[Final Chorus]",
      "안괴 안돼, 무너져도 다시 너",
      "숙요의 별이 우리를 시험해도",
      "아픈 만큼 진짜라면",
      "끝까지 가 볼게",
      "나는 너를 포기하지 않아",
      "",
      "안괴 안돼, 도망쳐도 다시 너",
      "위험해도 내 선택은 너",
      "상처인지 운명인지",
      "끝내 알 거야",
      "이 사랑을 내가 증명할게",
      "",
      "[Outro]",
      "안-괴",
      "안-돼",
      "숙요의 별이 경고해",
      "그래도 나는 너",
      "",
      "안-괴",
      "안-돼",
      "위험해도 사랑해",
      "나는 끝까지 너"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("star-crossed") || normalized.includes("star crossed") || normalized.includes("synastry")) {
    const lyric = [
      "[Intro]",
      "별들이 겹친 밤",
      "네 차트가 내 심장을 때렸다",
      "우연이라 부르기엔",
      "너무 정확한 궤도였다",
      "",
      "[Verse 1]",
      "처음 널 봤을 때 알 수 있었어",
      "이건 그냥 끌림이 아니란 걸",
      "내 태양은 네 달을 알아봤고",
      "네 눈빛은 내 밤을 열었어",
      "",
      "네 금성이 내 화성을 부르고",
      "숨죽인 불꽃이 다시 살아나",
      "내 어센던트 너머로 들어온 너",
      "내 운명의 문을 부숴버렸어",
      "",
      "사람들은 말해, 조심하라고",
      "너무 깊은 사랑은 위험하다고",
      "하지만 내 심장은 이미 알아",
      "너는 내가 피할 수 없는 별이야",
      "",
      "[Pre-Chorus]",
      "일곱 번째 집 문이 열리고",
      "네 이름이 내 미래에 새겨져",
      "토성이 우리를 시험해도",
      "나는 도망가지 않아",
      "",
      "[Chorus]",
      "시나스트리, 별들이 겹친 사랑",
      "운명보다 거칠게 나를 흔든 사람",
      "금성과 화성이 불을 붙이면",
      "나는 끝까지 너에게 간다",
      "",
      "시나스트리, 피할 수 없는 사랑",
      "달빛 아래 맹세한 단 하나의 사람",
      "별들이 우리를 찢어 놓아도",
      "나는 다시 너를 선택한다",
      "",
      "[Verse 2]",
      "네 달은 내 상처를 건드리고",
      "내 화성은 네 침묵을 깨워",
      "우린 편한 사랑은 아니지만",
      "그래서 더 진짜 같았어",
      "",
      "명왕성처럼 깊이 파고들어",
      "숨긴 마음까지 뒤집어 놓고",
      "토성처럼 무겁게 묻지",
      "너 이 사랑을 견딜 수 있나",
      "",
      "그래, 쉽진 않을 거야",
      "서로의 그림자까지 봐야 하니까",
      "하지만 네 북노드가 나를 부르면",
      "나는 과거를 버리고 걸어가",
      "",
      "[Pre-Chorus]",
      "운명은 달콤한 말이 아냐",
      "때론 뼈아픈 진실이야",
      "그래도 네 손을 잡는다면",
      "나는 이 궤도를 믿겠어",
      "",
      "[Chorus]",
      "시나스트리, 별들이 겹친 사랑",
      "운명보다 거칠게 나를 흔든 사람",
      "금성과 화성이 불을 붙이면",
      "나는 끝까지 너에게 간다",
      "",
      "시나스트리, 피할 수 없는 사랑",
      "달빛 아래 맹세한 단 하나의 사람",
      "별들이 우리를 찢어 놓아도",
      "나는 다시 너를 선택한다",
      "",
      "[Bridge]",
      "태양은 타오르고",
      "달은 기억하고",
      "금성은 사랑하고",
      "화성은 싸워서 지킨다",
      "",
      "토성은 묻는다",
      "버틸 수 있냐고",
      "명왕성은 말한다",
      "진짜 사랑은 너를 바꾼다고",
      "",
      "[Final Chorus]",
      "시나스트리, 별들이 겹친 사랑",
      "내 모든 계절을 뒤흔든 사람",
      "금성과 화성이 불을 붙이면",
      "나는 끝까지 너를 지킨다",
      "",
      "시나스트리, 숙명 같은 사랑",
      "상처까지 끌어안은 단 하나의 사람",
      "별들이 우리를 시험한다 해도",
      "나는 다시 너를 선택한다",
      "",
      "[Outro]",
      "별들이 겹친 밤",
      "네 차트가 내 심장을 때렸다",
      "우연이 아니었다",
      "너는 내 운명이었다"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("정재의 사랑") || normalized.includes("정재")) {
    const lyric = [
      "[Intro]",
      "화려한 말은 좀 서툴러도",
      "약속 시간은 안 늦어",
      "내 사랑은 티가 덜 나도",
      "매일 네 쪽으로 가 있어",
      "",
      "[Verse 1]",
      "나는 사랑하면 먼저 계산해",
      "우리 집에서 네 집까지 시간",
      "막차는 몇 시, 비 오면 택시",
      "춥진 않을까, 그게 먼저지",
      "",
      "\"보고 싶어\" 말은 좀 늦어도",
      "\"밥은 먹었어?\"는 바로 나와",
      "네가 좋아하던 메뉴 이름을",
      "나도 모르게 외우고 있잖아",
      "",
      "기념일은 캘린더에 저장",
      "네 취향은 메모장에 백업",
      "말로는 별거 아닌 척해도",
      "사실은 다 신경 쓰고 있어",
      "",
      "[Pre-Chorus]",
      "난 불꽃처럼 확 타오르진 못해",
      "근데 쉽게 식지도 않아",
      "조금 느리고 답답해 보여도",
      "내 마음은 오래 가는 쪽이야",
      "",
      "[Chorus]",
      "이게 내 정재식 사랑이야",
      "화려하진 않아도 진짜야",
      "네 하루 끝에 내가 있으면 해",
      "조용히 널 챙기는 사람처럼",
      "",
      "이게 내 정재식 사랑이야",
      "설렘보다 믿음이 먼저야",
      "말보다 약속, 감정보다 행동",
      "나는 그렇게 널 좋아해",
      "",
      "매일매일 check in",
      "네 마음에 login",
      "티 안 나도 all in",
      "내 방식의 loving",
      "",
      "[Verse 2]",
      "너 아프다 하면 약부터 찾아",
      "말없이 죽 사 들고 가",
      "\"괜찮아?\" 한마디 하고 싶어서",
      "괜히 날씨 핑계로 연락해",
      "",
      "여행 가자 하면 먼저 보는 건",
      "숙소보다 동선과 예산",
      "낭만이 없는 게 아니라",
      "불편하면 네가 힘들까 봐",
      "",
      "사랑을 쉽게 말하진 않아",
      "가볍게 시작하는 것도 어려워",
      "근데 한 번 마음을 정하면",
      "내 하루에 네 자리를 만들어",
      "",
      "[Pre-Chorus]",
      "난 밀당 같은 건 잘 몰라",
      "좋으면 자꾸 안정되게 해",
      "심장이 막 뛰는 사랑보다",
      "마음이 쉬는 사랑을 줄게",
      "",
      "[Chorus]",
      "이게 내 정재식 사랑이야",
      "화려하진 않아도 진짜야",
      "네 하루 끝에 내가 있으면 해",
      "조용히 널 챙기는 사람처럼",
      "",
      "이게 내 정재식 사랑이야",
      "설렘보다 믿음이 먼저야",
      "말보다 약속, 감정보다 행동",
      "나는 그렇게 널 좋아해",
      "",
      "매일매일 check in",
      "네 마음에 login",
      "티 안 나도 all in",
      "내 방식의 loving",
      "",
      "[Bridge]",
      "가끔은 네가 서운해할까 봐",
      "나도 표현을 연습해",
      "사랑한다고 말하는 대신",
      "너의 내일을 같이 생각해",
      "",
      "계산적인 게 아니야",
      "널 아끼는 방식이야",
      "내 마음은 소란스럽진 않아도",
      "늘 같은 자리에서 널 보고 있어",
      "",
      "[Final Chorus]",
      "이게 내 정재식 사랑이야",
      "느리지만 깊어지는 마음이야",
      "한순간 반짝이는 고백보다",
      "매일 남아 있는 사람이 될게",
      "",
      "이게 내 정재식 사랑이야",
      "현실적이라 더 따뜻한 거야",
      "말보다 약속, 감정보다 행동",
      "나는 그렇게 널 사랑해",
      "",
      "매일매일 check in",
      "네 마음에 login",
      "오래도록 all in",
      "내 방식의 loving",
      "",
      "[Outro]",
      "화려한 말은 좀 서툴러도",
      "약속 하나는 지킬게",
      "내 사랑은 조용하지만",
      "매일 너에게 가고 있어"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("합충형파해") || normalized.includes("형충파해") || (normalized.includes("spicy") && normalized.includes("love"))) {
    const lyric = [
      "[Intro]",
      "형이 와도",
      "충이 와도",
      "파가 와도",
      "해가 와도",
      "",
      "도망 안 가",
      "나는 직진",
      "이 사랑은",
      "아직 안 끝났어",
      "",
      "[Verse 1]",
      "처음부터 쉬운 사이는 아니었지",
      "말 한마디에도 불꽃이 튀었지",
      "좋아하는데 자꾸 엇나가고",
      "다가가면 또 멀어지는 우리",
      "",
      "합이면 달콤하다던데",
      "우린 왜 이렇게 매운맛인데",
      "근데 이상하게도 너만 보면",
      "내 심장이 먼저 앞으로 가",
      "",
      "네가 던진 말에 상처받고",
      "내가 뱉은 말에 네가 울고",
      "그 밤을 몇 번이나 지나도",
      "끝내 지워지지 않는 얼굴",
      "",
      "[Pre-Chorus]",
      "형은 우리 마음을 흔들고",
      "충은 서로를 부딪히게 해",
      "파는 익숙한 길을 깨뜨리고",
      "해는 몰래 오해를 남겨",
      "",
      "근데 나는 알 것 같아",
      "갈등도 사랑의 시험이라면",
      "나는 피하지 않아",
      "너에게 다시 걸어가",
      "",
      "[Chorus]",
      "형충파해 속에서도 너를 찾겠어",
      "무너진 마음 위에 사랑을 쓰겠어",
      "쉽게 맞는 운명보다",
      "부딪혀도 놓지 않는 너를",
      "",
      "형충파해 속에서도 너를 안겠어",
      "깨진 우리 사이 다시 맞추겠어",
      "궁합보다 강한 건",
      "오늘도 널 선택하는 마음이야",
      "",
      "불같이 싸워도",
      "끝내 널 보면",
      "나는 또 사랑을 믿게 돼",
      "형충파해 속에서도",
      "나는 너를 찾겠어",
      "",
      "[Verse 2]",
      "사람들은 말해, 그건 어렵다고",
      "그렇게 부딪히면 오래 못 간다고",
      "근데 평온하기만 한 마음이",
      "항상 진짜 사랑은 아니잖아",
      "",
      "충이 있어 우린 솔직해지고",
      "파가 있어 우린 변해야 했고",
      "해가 있어 오해를 풀어가고",
      "형이 있어 더 깊어졌어",
      "",
      "테토남은 돌려 말 못 해",
      "좋으면 좋다고 끝까지 말해",
      "상처가 무서워 숨는 대신",
      "깨져도 네 앞에 서 있을래",
      "",
      "[Pre-Chorus]",
      "합은 달콤한 시작이고",
      "충은 뜨거운 확인이야",
      "파는 낡은 우리를 부수고",
      "해는 진심을 묻게 해",
      "",
      "그러니 나쁘기만 한 건 아냐",
      "사랑도 가끔 전쟁 같지만",
      "그 전쟁 끝에서",
      "나는 너를 고를 거야",
      "",
      "[Chorus]",
      "형충파해 속에서도 너를 찾겠어",
      "무너진 마음 위에 사랑을 쓰겠어",
      "쉽게 맞는 운명보다",
      "부딪혀도 놓지 않는 너를",
      "",
      "형충파해 속에서도 너를 안겠어",
      "깨진 우리 사이 다시 맞추겠어",
      "궁합보다 강한 건",
      "오늘도 널 선택하는 마음이야",
      "",
      "불같이 싸워도",
      "끝내 널 보면",
      "나는 또 사랑을 믿게 돼",
      "형충파해 속에서도",
      "나는 너를 찾겠어",
      "",
      "[Bridge]",
      "사랑이 전부 편했다면",
      "우린 서로를 몰랐을 거야",
      "아픈 말 뒤에 숨은 외로움도",
      "늦게서야 보였을 거야",
      "",
      "네가 내 거울이라면",
      "나도 너의 벽을 넘을게",
      "서로를 바꾸려 하지 않고",
      "서로를 알아가 볼게",
      "",
      "합보다 깊은 이해로",
      "충보다 뜨거운 진심으로",
      "파보다 크게 다시 세우고",
      "해보다 먼저 손을 잡을게",
      "",
      "[Final Chorus]",
      "형충파해 속에서도 너를 찾겠어",
      "어지러운 운명 위에 사랑을 쓰겠어",
      "좋은 궁합이라는 말보다",
      "너를 놓지 않는 내가 될게",
      "",
      "형충파해 속에서도 너를 안겠어",
      "변하고 깨져도 다시 사랑하겠어",
      "사랑은 점수표가 아니라",
      "끝까지 마주 보는 태도야",
      "",
      "불같이 흔들려도",
      "네가 내 앞에 있다면",
      "나는 또 앞으로 걸어가",
      "형충파해 속에서도",
      "결국 너를 사랑해",
      "",
      "[Outro]",
      "형이 와도",
      "충이 와도",
      "파가 와도",
      "해가 와도",
      "",
      "나는 직진",
      "너에게 직진",
      "이 사랑은",
      "아직 안 끝났어"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("code destiny") || normalized.includes("code-destiny")) {
    const lyric = [
      "[Intro]",
      "달빛 아래 문이 열린다",
      "운명의 카드가 깨어난다",
      "핑계는 꺼, 볼륨을 올려",
      "지금부터 팩트만 남긴다",
      "",
      "[Verse 1]",
      "사주를 펼쳐, 네 패턴을 봐",
      "오행이 말해, 어디가 막혔나",
      "타로를 열어, 마음을 찍어",
      "숨긴 진심까지 전부 비춰",
      "",
      "자미두수 열두 궁이",
      "네 인생 맵을 켜고",
      "숙요의 별은 관계의 결을",
      "달빛처럼 보여줘",
      "",
      "점성술 차트 위로",
      "운명의 리듬이 돌아",
      "베다의 카르마까지",
      "네 길을 다시 불러",
      "",
      "[Pre-Chorus]",
      "운명은 겁주려고 온 게 아냐",
      "너를 깨우려고 문을 두드린 거야",
      "아프지? 근데 맞잖아",
      "이제 네 차례야",
      "",
      "[Chorus]",
      "Code Destiny, 운명의 지도를 펼쳐",
      "달빛 아래 네 진짜 얼굴을 밝혀",
      "감성은 잠깐 꺼둬, 팩트로 불태워",
      "네 인생의 다음 장을 열어",
      "",
      "Code Destiny, 별들이 길을 비춰",
      "무너진 밤에도 다시 일어나 외쳐",
      "사주는 핑계가 아니야",
      "운명은 네 손에서 바뀐다",
      "",
      "[Post-Chorus]",
      "Hey, hey, 운명 카드 열어",
      "Hey, hey, 네 패턴을 깨워",
      "Hey, hey, 달빛 위로 뛰어",
      "Code Destiny, louder",
      "",
      "[Verse 2]",
      "오늘의 운세? 그냥 위로 아냐",
      "네 하루의 방향을 꽂는 나침반",
      "주역의 괘는 흔들린 마음에",
      "선택의 번개를 내려쳐",
      "",
      "꽃처럼 피는 운명",
      "해몽 속 숨은 신호",
      "오라클 속삭임도",
      "네 안의 답을 깨워",
      "",
      "프로필 카드 속에",
      "시간과 이름을 새겨",
      "네 별, 네 운, 네 리듬",
      "전부 하나로 연결돼",
      "",
      "[Pre-Chorus]",
      "좋은 말만 듣고 싶었나",
      "그럼 아직 준비가 안 됐나",
      "팩폭은 상처가 아냐",
      "정신 차리라는 신호야",
      "",
      "[Chorus]",
      "Code Destiny, 운명의 지도를 펼쳐",
      "달빛 아래 네 진짜 얼굴을 밝혀",
      "감성은 잠깐 꺼둬, 팩트로 불태워",
      "네 인생의 다음 장을 열어",
      "",
      "Code Destiny, 별들이 길을 비춰",
      "무너진 밤에도 다시 일어나 외쳐",
      "사주는 핑계가 아니야",
      "운명은 네 손에서 바뀐다",
      "",
      "[Bridge]",
      "타로는 묻고",
      "사주는 답해",
      "별들은 말해",
      "움직이라고",
      "",
      "꿈은 신호",
      "카드는 문장",
      "달빛은 증거",
      "너는 주인공",
      "",
      "겁나도 열어",
      "아파도 봐",
      "운명의 지도는",
      "도망치는 자에겐 안 보여",
      "",
      "[Final Chorus]",
      "Code Destiny, 운명의 지도를 펼쳐",
      "잠든 가능성을 끝까지 깨워",
      "감성은 잠깐 꺼둬, 진실로 불태워",
      "네 인생의 엔진을 켜",
      "",
      "Code Destiny, 별들이 길을 비춰",
      "검은 밤 끝에서 더 크게 외쳐",
      "운명은 정답이 아니야",
      "네 선택이 불꽃이 된다",
      "",
      "[Outro]",
      "달빛 아래 카드가 닫힌다",
      "하지만 네 길은 이제 열린다",
      "팩트는 남고, 핑계는 꺼져",
      "Code Destiny, 운명을 켜라"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("운명에게 지지 않아") || (normalized.includes("destiny") && normalized.includes("not lose"))) {
    const lyric = [
      "[Intro]",
      "시간은 참 빠르게 흘러",
      "내가 걸어온 길이",
      "정말 맞았는지 묻게 돼",
      "",
      "하지만 난 믿어",
      "무너진 자리에도",
      "새로운 하늘이 열린다고",
      "끝은 끝이 아니라고",
      "",
      "[Verse 1]",
      "한때는 내가 너무 늦은 줄 알았어",
      "남들은 다 앞서가고 나만 멈춘 줄 알았어",
      "지나간 선택들이 자꾸 나를 불러",
      "\"그때 다른 길이었다면 어땠을까\" 물어",
      "",
      "밤은 길고 마음은 자주 흔들렸지",
      "웃는 얼굴 뒤에 숨은 상처가 깊었지",
      "그래도 내 안에 꺼지지 않는 불",
      "아직 뛰는 심장이 말해, 멈추지 말라고",
      "",
      "[Pre-Chorus]",
      "무너진 순간에 새 길이 생겨",
      "끝난 줄 알았던 꿈도 흔적을 남겨",
      "상처는 나를 꺾으려 온 게 아냐",
      "내가 살아냈다는 증거니까",
      "",
      "일어나, 더 멀리 가",
      "두려움 너머에 내가 있어",
      "어둠이 나를 삼키려 해도",
      "나는 별 반대편까지 달려가",
      "",
      "[Chorus]",
      "운명에게 지지 않아",
      "달빛 아래 다시 일어나",
      "길이 거칠고 멀어도",
      "내 심장은 아직 뜨거워",
      "",
      "운명에게 지지 않아",
      "넘어진 만큼 더 빛날 거야",
      "끝이라고 말한 밤을 지나",
      "별 너머의 나를 만나러 가",
      "",
      "No more fear, no more tears",
      "나는 아직 살아 있어",
      "No more doubt, burn it out",
      "내 삶은 내가 증명해",
      "",
      "[Verse 2]",
      "모든 시작에는 끝이 따라온대",
      "그래서 더 아프고 더 아름답대",
      "사진은 바래지고 계절은 변해도",
      "그날의 마음은 어딘가에 남아 있어",
      "",
      "잃어버린 것들이 나를 만들었고",
      "떠나간 사람들도 빛으로 남았고",
      "아무 의미 없던 날은 하나도 없어",
      "눈물도 언젠가는 별자리가 됐어",
      "",
      "[Pre-Chorus]",
      "쉬운 길은 없다고 밤이 말해도",
      "나는 내 발자국으로 답을 써",
      "기다림이 길수록 더 깊어지는",
      "내 안의 작은 불꽃을 믿어",
      "",
      "일어나, 더 크게 봐",
      "두려움도 지나가면 노래가 돼",
      "운명이 나를 시험한다 해도",
      "나는 내 이름으로 길을 내",
      "",
      "[Chorus]",
      "운명에게 지지 않아",
      "달빛 아래 다시 일어나",
      "길이 거칠고 멀어도",
      "내 심장은 아직 뜨거워",
      "",
      "운명에게 지지 않아",
      "넘어진 만큼 더 빛날 거야",
      "끝이라고 말한 밤을 지나",
      "별 너머의 나를 만나러 가",
      "",
      "No more fear, no more tears",
      "나는 아직 살아 있어",
      "No more doubt, burn it out",
      "내 삶은 내가 증명해",
      "",
      "[Bridge]",
      "가끔은 내가 너무 작게 느껴져",
      "아무것도 아닌 사람처럼 무너져",
      "질문만 남고 답은 보이지 않아",
      "이 모든 게 헛된 건 아닐까 겁나",
      "",
      "하지만 조용한 목소리가 들려",
      "네가 버틴 시간은 사라지지 않아",
      "아픔은 나를 멈추게 하지 못해",
      "그건 내 안의 불이 될 뿐이야",
      "",
      "별먼지로 태어나 숨으로 살아",
      "상처를 안고도 빛나는 사람아",
      "운명은 길을 던져줄 뿐이야",
      "걷는 건 결국 나의 선택이야",
      "",
      "[Final Chorus]",
      "운명에게 지지 않아",
      "달빛 아래 다시 타올라",
      "부서진 꿈의 조각들도",
      "내 하늘에 별이 될 거야",
      "",
      "운명에게 지지 않아",
      "나는 끝내 나를 살릴 거야",
      "두려움이 만든 밤을 지나",
      "별 너머의 나를 만나러 가",
      "",
      "No more fear, no more tears",
      "나는 아직 살아 있어",
      "No more doubt, burn it out",
      "내 삶은 내가 증명해",
      "",
      "운명에게 지지 않아",
      "무너져도 다시 피어나",
      "보름달이 뜨는 이 밤",
      "나는 나를 포기하지 않아",
      "",
      "[Outro]",
      "시간은 다시 흘러",
      "내가 걸어온 모든 길이",
      "나를 여기까지 데려왔어",
      "",
      "나는 아직 살아 있어",
      "나는 아직 빛나고 있어",
      "운명에게 지지 않아",
      "별 너머로 걸어가"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("인성 과다") || normalized.includes("생각감옥") || (normalized.includes("thinking") && normalized.includes("prison"))) {
    const lyric = [
      "[Intro]",
      "자, 오늘의 사주 팩폭",
      "정인 편인 과다 감지",
      "생각 감옥 문 열어",
      "공부 그만, 버튼 눌러",
      "",
      "[Verse 1]",
      "자료는 다 모았지",
      "북마크는 백 개지",
      "계획표는 예술인데",
      "시작은 왜 안 했지",
      "",
      "강의는 또 결제했지",
      "필기구도 새로 샀지",
      "근데 실행 버튼 앞에서",
      "갑자기 배가 아팠지",
      "",
      "정인은 엄마처럼 말해",
      "조금만 더 준비해",
      "편인은 마법사처럼 말해",
      "이 자료도 봐야 해",
      "",
      "그러다 밤새 검색",
      "머릿속은 우주 여행",
      "현실은 아직도 첫 페이지",
      "인생 로딩 중이네",
      "",
      "[Pre-Chorus]",
      "생각 많아 좋은데",
      "너 지금 생각에 갇혔네",
      "이론은 만렙인데",
      "실전은 튜토리얼도 안 했네",
      "",
      "[Chorus]",
      "인성 많아 머리는 천재",
      "실행력은 왜 아직도 잠수",
      "계획표 예쁜 건 인정해",
      "근데 네 인생은 실전이야",
      "",
      "인성 과다, 생각은 우주급",
      "시작은 왜 아직도 로딩 중",
      "공부 그만, 버튼을 눌러",
      "운명도 움직여야 켜진다",
      "",
      "Go, go, 생각 감옥 탈출",
      "Go, go, 핑계 파일 삭제",
      "Go, go, 오늘부터 실행",
      "네 사주는 실전이야",
      "",
      "[Verse 2]",
      "아직 때가 아니야",
      "그 말 벌써 세 달째야",
      "조금만 더 배우고",
      "그거 작년에도 했잖아",
      "",
      "완벽한 날은 안 와",
      "완벽한 너도 안 와",
      "시작한 다음 고쳐도 돼",
      "그게 진짜 고수야",
      "",
      "인성은 지식의 별",
      "배우고 품는 힘",
      "근데 과하면 생각 늪",
      "스스로 빠지는 짐",
      "",
      "사주는 설명서지",
      "변명서가 아니야",
      "읽었으면 이제 가야지",
      "언제까지 밑줄이야",
      "",
      "[Pre-Chorus]",
      "머리 좋은 건 알겠어",
      "근데 세상은 클릭해야 열려",
      "준비만 하다 끝나면",
      "네 꿈도 임시저장 돼",
      "",
      "[Chorus]",
      "인성 많아 머리는 천재",
      "실행력은 왜 아직도 잠수",
      "계획표 예쁜 건 인정해",
      "근데 네 인생은 실전이야",
      "",
      "인성 과다, 생각은 우주급",
      "시작은 왜 아직도 로딩 중",
      "공부 그만, 버튼을 눌러",
      "운명도 움직여야 켜진다",
      "",
      "Go, go, 생각 감옥 탈출",
      "Go, go, 핑계 파일 삭제",
      "Go, go, 오늘부터 실행",
      "네 사주는 실전이야",
      "",
      "[Bridge]",
      "정인은 위로해",
      "편인은 의심해",
      "둘 다 고마운데",
      "이제 그만 회의해",
      "",
      "오늘 한 줄 써",
      "오늘 한 발 가",
      "오늘 하나 끝내",
      "그게 대운보다 세다",
      "",
      "실패하면 어때",
      "수정하면 되지",
      "인생은 초안이야",
      "저장 말고 발행해",
      "",
      "[Final Chorus]",
      "인성 많아 머리는 천재",
      "이제 실행력도 수면 위로",
      "계획표 예쁜 건 인정해",
      "이젠 네 인생을 켜야지",
      "",
      "인성 과다, 생각은 우주급",
      "하지만 오늘은 로딩 끝",
      "공부 그만, 버튼을 눌러",
      "운명도 네 손으로 켜진다",
      "",
      "Go, go, 생각 감옥 탈출",
      "Go, go, 핑계 파일 삭제",
      "Go, go, 오늘부터 실행",
      "네 사주는 실전이야",
      "",
      "[Outro]",
      "정인 편인 확인 완료",
      "생각 감옥 탈출 완료",
      "공부는 충분했다",
      "이제 실행해"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("대운 업데이트") || (normalized.includes("update") && normalized.includes("reset")) || normalized.includes("대운")) {
    const lyric = [
      "[Intro]",
      "자! 운명 알림",
      "대운 업데이트 시작",
      "구버전 인생은 여기까지",
      "캐시 삭제, 볼륨 올려",
      "",
      "[Verse 1]",
      "요즘 왜 그렇게 렉 걸렸냐",
      "하는 일마다 왜 튕겼냐",
      "사람도 일도 마음도 안 맞아",
      "고장 난 앱처럼 멈췄잖아",
      "",
      "운이 안 좋아? 반은 맞아",
      "근데 나머지 반은 네 패턴이야",
      "새 대운 와도 그대로 살면",
      "좋은 기회도 버벅대다 꺼진다",
      "",
      "기신 같은 사람 또 저장",
      "상처 난 기억 또 재생",
      "미련은 자동 로그인",
      "그러니 인생이 느려지지",
      "",
      "[Pre-Chorus]",
      "오행 배터리 빨간불",
      "마음 저장공간 부족",
      "운명 탓만 누르지 말고",
      "네 손으로 정리해",
      "",
      "세운은 매년 알림",
      "대운은 큰 전환기",
      "새 문이 열렸다면",
      "너도 같이 바뀌어",
      "",
      "[Chorus]",
      "대운 업데이트, 이전 버전 삭제",
      "새 버전 로그인, 인생 다시 시작해",
      "낡은 습관 그대로면 또 렉 걸림",
      "캐시부터 지워, 정신 차려 지금",
      "",
      "대운 업데이트, 이전 버전 삭제",
      "운이 바뀌면 너도 바뀌어야 해",
      "좋은 운 와도 네가 멈춰 있으면",
      "기회도 널 지나쳐 가",
      "",
      "Update, update",
      "운명 새로고침",
      "Reset, reset",
      "내 인생 다시 부팅",
      "",
      "[Verse 2]",
      "용신은 택배처럼 안 와",
      "문 앞에 두고 가지 않아",
      "좋은 운도 네가 움직여야",
      "현실에서 실행되는 거야",
      "",
      "또 같은 걱정, 또 같은 후회",
      "또 같은 사람한테 마음 낭비",
      "그러고 묻지, 왜 내 사주는 이래",
      "야, 그건 사주보다 습관 문제",
      "",
      "재성은 돈 관리",
      "식상은 말조심",
      "비겁은 지갑조심",
      "관성은 기준 세워",
      "",
      "인성은 생각 그만",
      "실행 버튼 눌러",
      "알고만 있으면 뭐 해",
      "인생은 실전이야",
      "",
      "[Pre-Chorus]",
      "운은 방향을 보여",
      "길은 네 발이 열어",
      "하늘이 힌트는 줘도",
      "대신 걸어주진 않아",
      "",
      "무너진 건 오류 아냐",
      "새 공간 만든 거야",
      "이제 그만 옛날 버전",
      "불태워 버려",
      "",
      "[Chorus]",
      "대운 업데이트, 이전 버전 삭제",
      "새 버전 로그인, 인생 다시 시작해",
      "낡은 습관 그대로면 또 렉 걸림",
      "캐시부터 지워, 정신 차려 지금",
      "",
      "대운 업데이트, 이전 버전 삭제",
      "운이 바뀌면 너도 바뀌어야 해",
      "좋은 운 와도 네가 멈춰 있으면",
      "기회도 널 지나쳐 가",
      "",
      "Update, update",
      "운명 새로고침",
      "Reset, reset",
      "내 인생 다시 부팅",
      "",
      "[Bridge]",
      "사람 정리, 마음 정리",
      "방 정리, 파일 정리",
      "안 맞는 인연은 삭제",
      "독한 습관은 파괴",
      "",
      "대운이 바뀐다는 건",
      "다시 태어나란 신호",
      "겁나도 눌러 확인",
      "지금이 전환기야",
      "",
      "[Final Chorus]",
      "대운 업데이트, 이전 버전 삭제",
      "새 버전 로그인, 더 크게 소리쳐",
      "기신 앱은 삭제, 용신 방향 설치",
      "이제 네 인생을 네가 켜",
      "",
      "대운 업데이트, 이전 버전 삭제",
      "오늘의 선택이 내일의 운명이 돼",
      "운은 방향, 행동은 터치",
      "네가 움직이면 길이 열려",
      "",
      "Update, update",
      "운명 새로고침",
      "Reset, reset",
      "내 인생 다시 부팅",
      "",
      "[Outro]",
      "띠링, 업데이트 완료",
      "구버전 삭제 완료",
      "이제부터 네 인생",
      "새 버전으로 실행"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("내 사랑의 총량") || (normalized.includes("love") && normalized.includes("amount")) || normalized.includes("사랑의 총량")) {
    const lyric = [
      "하얀 숨이 흩어지는 밤",
      "가로등 아래 혼자 서면",
      "내 입술 끝에 남는 이름은",
      "이상하게 늘 너야",
      "",
      "눈이 내리는 소리마저",
      "너를 부르는 것 같아서",
      "괜찮은 척 넣어둔 마음을",
      "또 꺼내 보고 있어",
      "",
      "[Verse 1]",
      "네 하루에 내가 조금은 어울릴까",
      "수없이 묻고도 답을 못 했어",
      "웃으며 지나친 짧은 말들이",
      "밤이 되면 자꾸 나를 붙잡아",
      "",
      "보내지 못한 문장들이 쌓여",
      "주머니 속에서 식어가고",
      "보고 싶다는 그 쉬운 말조차",
      "너에게는 무거울까 봐 삼켰어",
      "",
      "처음 같이 걷던 그 거리도",
      "괜히 웃던 너의 작은 습관도",
      "별일 아닌데 이상하게",
      "내 하루를 전부 바꿔놨어",
      "",
      "[Pre-Chorus]",
      "사람의 감정엔 총량이 있대",
      "기쁨도 슬픔도 언젠간 닳아간대",
      "그런데 내 마음은 왜 아직도",
      "끝까지 가면 너만 남는지",
      "",
      "아파도 너였고",
      "웃어도 너였고",
      "무너진 날에도",
      "내가 떠올린 사람은 너였어",
      "",
      "[Chorus]",
      "내 사랑의 총량을 다 너에게 쓸게",
      "미움 끝에 남은 사랑까지 줄게",
      "기쁨 속에 숨겨둔 마음도 전부",
      "너 하나를 위해 아껴둘게",
      "",
      "눈이 오는 밤에 제일 먼저",
      "떠오르는 사람이 너였으면 좋겠다",
      "아무 말 없이 곁에 서 있어도",
      "마음이 닿는 사람이 너였으면 좋겠다",
      "",
      "내 모든 감정이 다 사라져도",
      "마지막에 남을 사랑이 있다면",
      "그 사랑의 이름은",
      "너였으면 좋겠다",
      "",
      "[Verse 2]",
      "어떤 영화를 보아도 이상해",
      "주인공 옆에 네가 서 있어",
      "어떤 노래가 밤에 흐르면",
      "그 멜로디 끝에 네가 있어",
      "",
      "눈이 생각보다 많이 쌓였다고",
      "말하고 싶은 사람이 있는데",
      "쓰다 만 문장만 화면에 남고",
      "내 마음은 또 멈춰 서 있어",
      "",
      "네가 있는 거리에도 오늘",
      "이 눈이 조용히 내리고 있을까",
      "그 하얀 밤을 바라보며",
      "너는 누구를 떠올리고 있을까",
      "",
      "[Pre-Chorus]",
      "상처도 언젠간 희미해진대",
      "그리움도 시간이 데려간대",
      "그런데 네 이름은 이상하게",
      "내 안에서 더 선명해져 가",
      "",
      "참아도 너였고",
      "울어도 너였고",
      "잊으려 할수록",
      "나는 다시 너에게 돌아가",
      "",
      "[Chorus]",
      "내 사랑의 총량을 다 너에게 쓸게",
      "슬픔 속에 고인 사랑까지 줄게",
      "두려움 끝에서 피어난 마음도",
      "너 하나를 위해 남겨둘게",
      "",
      "추운 밤에 손을 잡고 싶은",
      "단 한 사람이 너였으면 좋겠다",
      "괜찮냐고 묻는 내 목소리가",
      "너에게 닿는 온기였으면 좋겠다",
      "",
      "내 모든 계절이 다 지나가도",
      "마지막에 남을 장면이 있다면",
      "그 장면의 끝에는",
      "너였으면 좋겠다",
      "",
      "[Bridge]",
      "만약 내 안의 감정들이",
      "언젠가 모두",
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("mystery of life") || normalized.includes("life new")) {
    const lyric = [
      "[INTRO - MUSIC BOX, SINGLE PIANO NOTE]",
      "",
      "Before the first breath",
      "there was only light",
      "a silence so full",
      "it hummed like a tide",
      "",
      "the universe held you",
      "before you were named",
      "a whisper of stardust",
      "already aflame",
      "",
      "[VERSE 1 - ACT 1: THE VOID, SOFT VOCAL]",
      "Somewhere between the planets",
      "and the dark between the stars",
      "a single point of being",
      "decided who you are",
      "",
      "the sky was writing stories",
      "in the language made of light",
      "every constellation bending",
      "just to hold you right",
      "",
      "billions of years of burning",
      "all collapsed into this",
      "the moment that you opened",
      "your eyes to the abyss",
      "",
      "[PRE-CHORUS - BUILDING, AIRY]",
      "and all at once the cosmos",
      "poured itself through you",
      "every force and every frequency",
      "became something new",
      "",
      "[CHORUS - EMOTIONAL PEAK, CHOIR SWELLS]",
      "you are the breath the universe",
      "decided it must take",
      "you are the dream that gravity",
      "itself could not forsake",
      "",
      "born from the ashes of a star",
      "that had to die to shine",
      "every atom in your body",
      "is a miracle by design",
      "",
      "oh, the greatness of just living",
      "oh, the wonder of your name",
      "you arrived and rearranged the world",
      "and nothing stayed the same",
      "",
      "[VERSE 2 - ACT 3: THE LIVING]",
      "every morning that you wake up",
      "is an ancient song replayed",
      "the light that fills your chest now",
      "was in supernovas made",
      "",
      "when you laugh the frequency",
      "travels further than you know",
      "when you hurt, the universe",
      "is learning how to grow",
      "",
      "you are not a small thing",
      "walking through a massive sky",
      "you are the sky itself",
      "that learned to wonder why",
      "",
      "[PRE-CHORUS 2]",
      "so let the stars remember",
      "they once lived in you",
      "and every breath you're giving back",
      "is something overdue",
      "",
      "[CHORUS 2]",
      "you are the breath the universe",
      "decided it must take",
      "you are the dream that gravity",
      "itself could not forsake",
      "",
      "born from the ashes of a star",
      "that had to die to shine",
      "every atom in your body",
      "is a miracle by design",
      "",
      "oh, the greatness of just living",
      "oh, the wonder of your name",
      "you arrived and rearranged the world",
      "and nothing stayed the same",
      "",
      "[BRIDGE - ACT 4: ETERNAL RETURN, STRIPPED BARE]",
      "you will return to the dark one day",
      "and it will not be an ending",
      "you are just light",
      "taking a different shape",
      "",
      "the universe does not waste",
      "a single soul it sends",
      "what begins in stardust",
      "in stardust transcends",
      "",
      "so live as though the cosmos",
      "is watching through your eyes",
      "because it is",
      "because it is",
      "because it is",
      "",
      "[FINAL CHORUS - FULL ORCHESTRA, ONE KEY UP]",
      "you are the breath the universe",
      "decided it must take",
      "you are the dream that gravity",
      "itself could not forsake",
      "",
      "born from the ashes of a star",
      "that had to die to shine",
      "every atom in your body",
      "is a miracle by design",
      "",
      "oh, the greatness of just living",
      "oh, the wonder of your name",
      "you arrived and rearranged the world",
      "and nothing stayed the same",
      "",
      "nothing stayed the same",
      "nothing stayed the same",
      "",
      "[OUTRO - MUSIC BOX RETURNS, FADES TO SILENCE]",
      "before the first breath",
      "there was only light",
      "",
      "and then",
      "there was you",
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("moonlight daydream") || normalized.includes("daydream")) {
    const lyric = [
      "[Lyrics]",
      "",
      "[Intro]",
      "푸른 달빛 아래",
      "너의 이름이 또 번져",
      "잠들지 못한 밤",
      "나는 아직 거기 있어",
      "",
      "[Verse 1]",
      "텅 빈 거리 위로 바람이 지나가",
      "익숙한 불빛들이 낯설게 흔들려",
      "너와 걷던 길은 그대로 있는데",
      "내 옆의 그림자만 조금 작아졌어",
      "",
      "아무렇지 않은 척 웃어보지만",
      "마음은 아직 그날 밤에 멈춰",
      "끝났다는 말은 쉬웠는데",
      "잊는 법은 아무도 안 알려줬어",
      "",
      "[Pre-Chorus]",
      "달빛은 왜 이렇게",
      "기억을 잘 비추는지",
      "감춘 마음까지",
      "전부 들켜버린 것 같아",
      "",
      "닿을 수 없는 너인데",
      "자꾸 가까운 꿈처럼",
      "눈을 감으면 또",
      "내 앞에 서 있어",
      "",
      "[Chorus]",
      "Moonlight, moonlight",
      "너를 부르면",
      "밤하늘 끝에서 대답할 것 같아",
      "Daydream, daydream",
      "깨어나도 난",
      "아직 너의 온도를 찾아",
      "",
      "달빛 아래 남겨진 그리움",
      "별빛처럼 멀어져도 아름다워",
      "사라진 줄 알았던 마음이",
      "오늘도 나를 너에게 데려가",
      "",
      "[Verse 2]",
      "신호등은 바뀌고 계절도 지나가",
      "사람들 사이로 내 하루도 흘러가",
      "근데 이상하게 밤이 오면",
      "네가 남긴 말들이 다시 선명해져",
      "",
      "괜찮아졌다고 믿고 싶었어",
      "너 없이도 잘 살 수 있다고",
      "근데 달이 뜨는 순간마다",
      "내 마음은 또 네 쪽으로 기울어",
      "",
      "[Pre-Chorus]",
      "시간은 왜 이렇게",
      "상처를 예쁘게 감춰",
      "멀리 있는 기억도",
      "반짝이게 만들어",
      "",
      "돌아갈 수 없다는 걸",
      "나도 알고 있는데",
      "왜 그때의 우리만",
      "아직 빛나고 있어",
      "",
      "[Chorus]",
      "Moonlight, moonlight",
      "너를 부르면",
      "밤하늘 끝에서 대답할 것 같아",
      "Daydream, daydream",
      "깨어나도 난",
      "아직 너의 온도를 찾아",
      "",
      "달빛 아래 남겨진 그리움",
      "별빛처럼 멀어져도 아름다워",
      "사라진 줄 알았던 마음이",
      "오늘도 나를 너에게 데려가",
      "",
      "[Bridge]",
      "만약 다른 시간 속에서",
      "우리가 다시 마주친다면",
      "그때는 말할 수 있을까",
      "너는 내 밤의 가장 푸른 꿈이었다고",
      "",
      "아픈 기억도",
      "빛이 될 수 있다면",
      "나는 이 달빛을 따라",
      "조금 더 걸어가 볼게",
      "",
      "[Final Chorus]",
      "Moonlight, moonlight",
      "너를 보낸 밤",
      "아직도 내 안에 파도처럼 남아",
      "Daydream, daydream",
      "끝난 꿈인데",
      "왜 이렇게 아름다운 걸까",
      "",
      "달빛 아래 흩어진 그리움",
      "멀어질수록 더 선명해지는 너",
      "잊는다는 건 지우는 게 아니라",
      "빛나는 채로 놓아주는 것",
      "",
      "[Outro]",
      "푸른 달빛 아래",
      "너의 이름이 또 번져",
      "잠들지 못한 밤",
      "나는 천천히 너를 보내"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("별자리 지도 위에서") || (normalized.includes("chart") && normalized.includes("stars")) || normalized.includes("시나스트리")) {
    const lyric = [
      "[INTRO — 시나스트리 차트가 열리는 소리]",
      "별자리 지도 위에 두 개의 점",
      "처음 만난 날, 하늘도 알았대",
      "당신의 태양이 내 달 위에 앉아",
      "그 순간 우주가 숨을 참았대",
      "",
      "[VERSE 1]",
      "점성술사도 놀랐다고 했어",
      "이런 차트는 흔치 않다고",
      "내 금성이 당신 화성을 만난 건",
      "계획된 게 아니라 운명이었나 봐",
      "",
      "처음 눈이 마주쳤을 때",
      "말하지 않아도 알 것 같았어",
      "7하우스에 새겨진 이름처럼",
      "당신은 내 파트너 별이었어",
      "",
      "목성이 내 달을 감싸는 것처럼",
      "당신 곁에선 두려움이 사라져",
      "세상이 조금 더 넓어지는 기분",
      "이게 사랑인지 마법인지 몰라",
      "",
      "[PRE-CHORUS]",
      "수천 개의 별 중에",
      "왜 하필 당신의 별이",
      "내 하늘 위로 흘러왔을까",
      "",
      "이건 우연이 아냐",
      "북교점이 말해줬어",
      "우리, 만나야 했던 사람들이야",
      "",
      "[CHORUS]",
      "별이 맺어준 우리",
      "시나스트리가 속삭여",
      "당신의 빛이 내 안에",
      "닿는 순간 알았어",
      "",
      "금성이 화성을 부르고",
      "달이 태양을 찾듯이",
      "우주가 우리 사이에",
      "이미 선을 그었어",
      "",
      "별이 맺어준 우리",
      "차트 위에 새긴 약속",
      "태어나기 전부터 이미",
      "당신을 사랑하도록",
      "",
      "(별빛 아래 우리, 영원히)",
      "",
      "[VERSE 2]",
      "해왕성이 꿈결처럼 흘러",
      "당신과 있으면 현실이 몽롱해",
      "좋은 건지 빠진 건지 몰라도",
      "이 안개 속에 있고 싶어",
      "",
      "명왕성이 나를 흔들어",
      "당신으로 인해 내가 변하는 중이야",
      "두렵기도 하고 설레기도 해",
      "이 심장이 증명하잖아",
      "",
      "토성이 천천히 말해줘",
      "진짜 인연은 시간을 이긴다고",
      "어센던트에서 반겨준 금성처럼",
      "당신은 내 첫인상, 마지막 인상",
      "",
      "[PRE-CHORUS 2]",
      "버텍스가 교차하는 그 점에서",
      "운명이 우리를 밀어넣었어",
      "거부할 수도, 외면할 수도 없는",
      "이 별들의 목소리를 들어",
      "",
      "[CHORUS 2]",
      "별이 맺어준 우리",
      "시나스트리가 속삭여",
      "당신의 빛이 내 안에",
      "닿는 순간 알았어",
      "",
      "금성이 화성을 부르고",
      "달이 태양을 찾듯이",
      "우주가 우리 사이에",
      "이미 선을 그었어",
      "",
      "별이 맺어준 우리",
      "차트 위에 새긴 약속",
      "태어나기 전부터 이미",
      "당신을 사랑하도록",
      "",
      "(별빛 아래 우리, 영원히)",
      "",
      "[BRIDGE — 가장 신비로운 구간]",
      "점성술은 말해, 각도가 전부라고",
      "하지만 나는 알아",
      "이 각도들이 만들어낸 건",
      "숫자가 아니라 당신과 나야",
      "",
      "태양도 달도 금성도 화성도",
      "결국 우리를 설명하는 언어일 뿐",
      "우주가 수천 년을 움직여서",
      "만들어낸 이 한 순간",
      "",
      "내 차트에 당신이 내려앉은 날",
      "하늘이 처음으로 완성됐어",
      "두 개의 원이 겹쳐지는 그 자리에",
      "우리라는 별자리가 태어났어",
      "",
      "[FINAL CHORUS — 한 옥타브 올려]",
      "별이 맺어준 우리",
      "시나스트리가 속삭여",
      "당신의 빛이 내 안에",
      "영원히 머물기를",
      "",
      "금성이 화성을 부르고",
      "달이 태양을 찾듯이",
      "우주가 우리 사이에",
      "이미 답을 내렸어",
      "",
      "별이 맺어준 우리",
      "차트 위에 새긴 약속",
      "다음 생에도 또 다음에도",
      "당신을 사랑하도록",
      "",
      "별이 맺어준 우리",
      "(우리, 우리, 우리~)",
      "태어나기 전부터 이미",
      "당신이었어",
      "",
      "[OUTRO — 피아노와 별빛 잔향]",
      "시나스트리 차트가 닫혀도",
      "우리의 각도는 영원해",
      "당신의 별과 나의 별은",
      "지금도 서로를 향하고 있어",
      "",
      "☽ ☉ ♀ ♂ ☊ ♃ ♆ ♄ ♇",
      "별들이 우리 이름을 부르고 있어"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("탐랑") || (normalized.includes("flirting") && normalized.includes("danger")) || normalized.includes("플러팅 주의보")) {
    const lyric = [
      "[INTRO]",
      "띠링띠링, 자미두수 알림",
      "오늘의 별은 위험함",
      "도화 필터 ON",
      "퇴폐미 과다 감지",
      "",
      "탐랑성 등장",
      "시선 조심, 심장 조심, 분위기 조심",
      "",
      "[VERSE 1]",
      "자미두수 안에 그런 별이 있대",
      "웃는데 왜 조금 위험해 보인대",
      "이름은 탐랑, 욕망의 담당",
      "퇴폐미까지 풀장착",
      "",
      "피곤해 보이는데 분위기 미쳤고",
      "무심한 척하는데 시선이 꽂히고",
      "다크서클마저 콘셉트 같아",
      "이건 그냥 스타가 아니잖아",
      "",
      "예쁜 척 안 해도 반짝",
      "꾸민 듯 안 꾸민 듯 찰칵",
      "달빛 머금은 그 눈빛에",
      "내 심장 혼자서 착각",
      "",
      "[PRE-CHORUS]",
      "도화는 조명 낮추고",
      "홍란은 음악을 틀고",
      "천희는 뒤에서 웃으며 말해",
      "야, 이건 빠질 수밖에 없어",
      "",
      "위험한데 귀엽고",
      "어두운데 빛나고",
      "알면서도 또 보게 되는",
      "탐랑성의 그 맛",
      "",
      "[CHORUS]",
      "탐랑탐랑, 퇴폐미 위험해",
      "자미두수 욕망의 별이래",
      "무심한 눈빛 한 번에",
      "모두가 빠져버렸네",
      "",
      "탐랑탐랑, 분위기 위험해",
      "망한 듯 멋진 게 반칙이래",
      "도화 켜져, 홍란 터져",
      "천희까지 박수쳐",
      "탐랑탐랑, 퇴폐미 위험해",
      "",
      "(위험해, 위험해, 위험해~)",
      "",
      "[POST-CHORUS]",
      "피해야지 하면서",
      "한 발 더 끌려",
      "탐랑탐랑, dark glitter",
      "심장에 love trigger",
      "도화 필터 ON, ON, ON",
      "퇴폐미 저장 완료",
      "",
      "[VERSE 2]",
      "탐랑은 막 들이대는 별 아냐",
      "가만히 있어도 분위기가 와",
      "말수 적어도 존재감 loud",
      "무대 안 서도 혼자 sold out",
      "",
      "카페인 섞인 달빛 같아",
      "잠 못 들게 하는 그 향기 같아",
      "\"관심 없어\" 말해놓고",
      "프로필 세 번 보는 나야",
      "",
      "눈빛은 살짝 흐릿",
      "말투는 조금 시크",
      "근데 이상하게 끌리는 온기",
      "그래서 더 치명적이지",
      "",
      "자미두수 몰라도 알 수 있어",
      "저 별, 뭔가 다르잖아",
      "탐랑은 욕망과 매력의 별",
      "한 번 스치면 평생 기억나잖아",
      "",
      "[PRE-CHORUS 2]",
      "도화는 향수를 뿌리고",
      "홍란은 타이밍 맞추고",
      "천희는 몰래 문을 열어",
      "오늘 설렘 입장하세요",
      "",
      "도망가도 생각나",
      "위험해서 더 빛나나 봐",
      "이건 단순한 호감이 아냐",
      "탐랑성 플러팅 사건이야",
      "",
      "[CHORUS 2]",
      "탐랑탐랑, 퇴폐미 위험해",
      "자미두수 욕망의 별이래",
      "무심한 눈빛 한 번에",
      "모두가 빠져버렸네",
      "",
      "탐랑탐랑, 분위기 위험해",
      "망한 듯 멋진 게 반칙이래",
      "도화 켜져, 홍란 터져",
      "천희까지 박수쳐",
      "탐랑탐랑, 퇴폐미 위험해",
      "",
      "[BRIDGE]",
      "퇴폐미란 건 어둠이 아냐",
      "밤에도 지지 않는 반짝임이야",
      "위험하다는 건 나쁘단 게 아냐",
      "자꾸 궁금해지는 힘이야",
      "",
      "탐랑은 말해, 너무 힘주지 마",
      "가만히 있어도 이미 빛나",
      "욕망과 아름다움 사이에서",
      "그래서 모두가 또 돌아봐",
      "",
      "도화야, 홍란아, 천희야",
      "오늘 밤 탐랑이 깨어났어",
      "이 별에 한 번 걸리면",
      "빠져나올 수가 없어",
      "",
      "[DANCE BREAK]",
      "탐랑 check, 도화 check",
      "퇴폐미도 완전 check",
      "홍란 check, 천희 check",
      "오늘 매력 미쳤네",
      "",
      "눈빛 lock, 심장 knock",
      "시선은 이미 nonstop",
      "달빛 속에 glitter pop",
      "탐랑 플러팅 danger shop",
      "",
      "(ha~ 탐랑탐랑~)",
      "(위험해 위험해~)",
      "",
      "[FINAL CHORUS]",
      "탐랑탐랑, 퇴폐미 위험해",
      "자미두수 욕망의 별이래",
      "차가운 듯 따뜻한데",
      "그게 제일 반칙인데",
      "",
      "탐랑탐랑, 분위기 위험해",
      "알면서도 빠지는 별이래",
      "도화 켜져, 홍란 터져",
      "천희까지 반했어",
      "탐랑탐랑, 퇴폐미 위험해",
      "",
      "[OUTRO]",
      "오늘의 결론",
      "탐랑은 욕망과 매력의 별",
      "어두운데 반짝이는 별",
      "퇴폐미 저장 완료",
      "",
      "(탐랑탐랑... 위험해...)",
      "(도화 OFF... 아직 꺼지지 않아...)",
      "띠링—"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("원진귀문") || (normalized.includes("love") && normalized.includes("algorithm")) || normalized.includes("러브 알고리즘")) {
    const lyric = [
      "[Intro]",
      "띠링띠링, 운명 알림 왔어요",
      "오늘의 궁합, 심상치 않아요",
      "원진? 귀문? 도화까지 ON",
      "자, 연애 사주 레슨 시작해요",
      "",
      "[Verse 1]",
      "처음엔 분명히 관심 없다 했지",
      "근데 왜 자꾸 프로필을 봤지",
      "읽씹하면 더 신경 쓰이고",
      "답장 오면 심장이 또 띠용",
      "",
      "천간은 아닌 척 밀당 중인데",
      "지지는 벌써 손잡고 난리인데",
      "합이냐 충이냐 애매한 우리",
      "근데 케미는 진짜 미쳤지",
      "",
      "[Pre-Chorus]",
      "원진이면 왜 이렇게 끌려",
      "귀문이면 왜 꿈에 또 보여",
      "도화 켜져, 홍염 번져",
      "눈 마주치면 바로 저장",
      "",
      "이건 우연일까 운명일까",
      "사주 앱도 놀란 시그널이야",
      "알고리즘보다 더 정확해",
      "너랑 나의 별난 궁합",
      "",
      "[Chorus]",
      "원진귀문 love, love, love",
      "싸우면서 또 보고 싶어",
      "밀고 당겨 pop, pop, pop",
      "이상한데 너무 좋아",
      "",
      "합하면 달콤, 충하면 짜릿",
      "우리 케미 완전 반칙",
      "도화빛 heart, 홍염빛 spark",
      "너 때문에 운명이 반짝",
      "",
      "원진귀문 love, love, love",
      "이건 사주식 love alarm",
      "독한 듯 달콤한 너와 나",
      "운명인가 봐, oh my gosh",
      "",
      "[Post-Chorus]",
      "궁합 궁합, 궁금해",
      "내 마음 왜 이래",
      "합충형파해도",
      "너만 보면 설레",
      "",
      "원진 귀문, 두근두근",
      "도화 홍염, 반짝반짝",
      "이상한데 귀여운",
      "우리 사랑 사주각",
      "",
      "[Verse 2]",
      "친구들은 말해 \"그거 좀 위험해\"",
      "근데 내 심장은 \"아니야, 진행해\"",
      "카톡 하나에 대운이 바뀌고",
      "스토리 하나에 세운이 흔들려",
      "",
      "비겁하게 질투도 살짝 나고",
      "식상하게 말도 막 많아지고",
      "재성처럼 네가 자꾸 탐나",
      "관성처럼 내 기준이 돼가",
      "",
      "[Pre-Chorus]",
      "원진이면 왜 못 지나쳐",
      "귀문이면 왜 마음을 읽어",
      "서로 다른 별에서 왔는데",
      "같은 달빛 아래 서 있어",
      "",
      "이건 테스트일까 사랑일까",
      "우주가 짜놓은 시나리오야",
      "피할수록 더 선명해져",
      "너랑 나의 이상한 궁합",
      "",
      "[Chorus]",
      "원진귀문 love, love, love",
      "싸우면서 또 보고 싶어",
      "밀고 당겨 pop, pop, pop",
      "이상한데 너무 좋아",
      "",
      "합하면 달콤, 충하면 짜릿",
      "우리 케미 완전 반칙",
      "도화빛 heart, 홍염빛 spark",
      "너 때문에 운명이 반짝",
      "",
      "원진귀문 love, love, love",
      "이건 사주식 love alarm",
      "독한 듯 달콤한 너와 나",
      "운명인가 봐, oh my gosh",
      "",
      "[Bridge]",
      "합이 많다고 다 좋은 건 아니래",
      "충이 있다고 끝나는 건 아니래",
      "중요한 건 서로를 읽는 마음",
      "운명보다 예쁜 건 선택이야",
      "",
      "귀문처럼 깊이 스며들고",
      "도화처럼 예쁘게 피어나고",
      "원진처럼 자꾸 부딪혀도",
      "손 놓지 않으면 사랑이야",
      "",
      "[Dance Break]",
      "원진 check, 귀문 check",
      "도화 check, 홍염 check",
      "합충 check, 심장 check",
      "궁합 결과, 대박인데?",
      "",
      "원진 check, 귀문 check",
      "밀당 check, 운명 check",
      "너랑 나랑 케",
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("star-ink heartstorm") || normalized.includes("star ink heartstorm") || normalized.includes("heartstorm")) {
    const lyric = [
      "[Intro]",
      "La-la-la, lights up",
      "Yeoni in the moonlight",
      "Twelve little stars go",
      "Twinkle, twinkle, love sign",
      "",
      "[Verse 1]",
      "I saw your name in a silver sky",
      "Written where the little comets fly",
      "You smiled once, and the night went boom",
      "Like a secret blooming under the moon",
      "",
      "Aries spark, Taurus slow",
      "Gemini whispers, Cancer glow",
      "Leo laughs like summer fire",
      "Virgo counts my heartbeat higher",
      "",
      "[Pre-Chorus]",
      "Is it fate or just a feeling?",
      "Why's my little heart revealing",
      "Every wish I tried to hide?",
      "Yeoni reads the stars tonight",
      "",
      "Libra balance, Scorpio flame",
      "Sagittarius calls my name",
      "Capricorn climbs, Aquarius dreams",
      "Pisces swims through galaxy streams",
      "",
      "[Chorus]",
      "We're starborn, heartstorm, glowing tonight",
      "Your constellation is touching mine",
      "Moon-kiss, love spell, up in the sky",
      "I wanna know, are you my sign?",
      "",
      "Starborn, heartstorm, never let go",
      "Zodiac love in a glittering glow",
      "If it's destiny, hold me tight",
      "We're starborn, heartstorm, glowing tonight",
      "",
      "[Post-Chorus]",
      "Star-star, love-love",
      "Tell me what we are",
      "Moon-moon, touch-touch",
      "Kiss me like a star",
      "",
      "Aries, Taurus, Gemini high",
      "Cancer, Leo, Virgo shine",
      "Libra, Scorpio, take me far",
      "We're a zodiac, zodiac heart",
      "",
      "[Verse 2]",
      "First date rain on a neon street",
      "One umbrella, two shy heartbeats",
      "You said \"cold?\" and I said \"no\"",
      "But my cheeks were telling you so",
      "",
      "Tiny texts at 2 a.m.",
      "I read them twice and smile again",
      "Is this a crush or something more?",
      "Why do I glow when you're at my door?",
      "",
      "[Pre-Chorus 2]",
      "Yeoni says, \"Look up, baby\"",
      "Love can be wild, soft, crazy",
      "Some hearts crash, some hearts align",
      "Check the stars and read the sign",
      "",
      "Sagittarius calls my name",
      "Capricorn climbs through the rain",
      "Aquarius dreams, Pisces knows",
      "Where this little love story goes",
      "",
      "[Chorus]",
      "We're starborn, heartstorm, glowing tonight",
      "Your constellation is touching mine",
      "Moon-kiss, love spell, up in the sky",
      "I wanna know, are you my sign?",
      "",
      "Starborn, heartstorm, never let go",
      "Zodiac love in a glittering glow",
      "If it's destiny, hold me tight",
      "We're starborn, heartstorm, glowing tonight",
      "",
      "[Bridge]",
      "Lesson one, don't run too fast",
      "Some starry feelings are made to last",
      "Lesson two, don't hide your heart",
      "Even shy love can leave a spark",
      "",
      "Lesson three, look at the sky",
      "Every sign has a reason why",
      "Lesson four, come closer now",
      "Yeoni will show you how",
      "",
      "[Dance Chant]",
      "Fire signs, burn it up",
      "Earth signs, hold my love",
      "Air signs, lift me high",
      "Water signs, make me fly",
      "",
      "One, two, zodiac boom",
      "My heart goes bloom in the moonlit room",
      "Three, four, destiny starts",
      "You just walked into my stars",
      "",
      "[Final Chorus]",
      "We're starborn, heartstorm, glowing tonight",
      "Your constellation is touching mine",
      "Moon-kiss, love spell, up in the sky",
      "I wanna know, are you my sign?",
      "",
      "Starborn, heartstorm, never let go",
      "Zodiac love in a glittering glow",
      "If it's destiny, hold me tight",
      "We're starborn, heartstorm, glowing tonight",
      "",
      "[Outro]",
      "La-la-la, lights up",
      "Yeoni in the moonlight",
      "If your heart is curious",
      "Check your zodiac love sign"
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("재회운아 도와줘") || normalized.includes("재회운")) {
    const lyric = [
      "[Intro]",
      "꿀꿀...",
      "오늘은 재회운이래",
      "근데 왜 카드가",
      "나보다 더 울 것 같지?",
      "",
      "[Verse 1]",
      "달빛 아래 앉아서",
      "카드 한 장 꾹 눌러 봤어",
      "\"아직 마음이 남아 있음\"",
      "그 말에 코끝이 찡했어",
      "",
      "괜찮은 척하다가",
      "네 프로필 또 봐버렸고",
      "안 보고 싶다 말해놓고",
      "꿈에서는 손 흔들었어",
      "",
      "[Pre-Chorus]",
      "사주는 말해, 때가 있대",
      "타로는 말해, 너무 울지 말래",
      "근데 내 마음은 조그만 돼지라",
      "네 이름만 보면 굴러가",
      "",
      "연이가 작은 발로",
      "하트 도장을 찍어줄게",
      "오늘의 재회운은",
      "울먹울먹 반짝해",
      "",
      "[Chorus]",
      "재회운이 콩, 내 맘에 떨어져",
      "보고 싶단 말이 또 데구르르 굴러",
      "꿀단지에 숨겨도 다 새어 나와",
      "너를 좋아한 마음은 못 말려",
      "",
      "돌아와 줘, 아니 살짝만 와줘",
      "꿈에서라도 나를 안아줘",
      "달빛 한 스푼, 눈물 한 방울",
      "다시 우리 웃게 해줘",
      "",
      "[Post-Chorus]",
      "콩, 콩, 마음이 아파",
      "꿀꿀, 아닌 척해도",
      "콩, 콩, 네가 그리워",
      "재회운아, 나 좀 도와줘",
      "",
      "[Verse 2]",
      "오늘의 행운색은",
      "조금 울다 만 분홍빛",
      "행운 아이템은 아직 못 지운",
      "너와 나의 대화창",
      "",
      "별자리도 조용히",
      "내 눈치를 보는 밤",
      "\"기다림도 사랑이지만",
      "너도 너를 안아줘야 해\"",
      "",
      "[Pre-Chorus]",
      "숙요의 달은 천천히",
      "꿈 해몽은 다시 한번",
      "놓친 인연도 길을 찾으면",
      "문득 마주칠 수 있대",
      "",
      "연이가 훌쩍이다",
      "괜히 씩씩한 척 말해",
      "오늘의 재회운은",
      "작지만 안 끝났대",
      "",
      "[Chorus]",
      "재회운이 콩, 내 맘에 떨어져",
      "보고 싶단 말이 또 데구르르 굴러",
      "꿀단지에 숨겨도 다 새어 나와",
      "너를 좋아한 마음은 못 말려",
      "",
      "돌아와 줘, 아니 살짝만 와줘",
      "꿈에서라도 나를 안아줘",
      "달빛 한 스푼, 눈물 한 방울",
      "다시 우리 웃게 해줘",
      "",
      "[Bridge]",
      "혹시 너도 가끔 멈춰서",
      "내 생각을 꺼내 본다면",
      "그건 우연이 아니라",
      "작은 별이 보낸 신호일 거야",
      "",
      "다시 만나게 된다면",
      "이번엔 더 천천히 말할래",
      "서툴렀던 마음까지",
      "미워하지 않겠다고",
      "",
      "연이가 말해줄게",
      "기다리는 내가 바보 같아도",
      "사랑했던 마음만큼은",
      "하찮지 않아, 예뻤어",
      "",
      "[Final Chorus]",
      "재회운이 콩, 다시 피어올라",
      "구겨진 마음에도 꽃잎이 돋아나",
      "끝난 줄 알았던 우리 이야기",
      "달빛 아래 조용히 숨 쉬어",
      "",
      "돌아와 줘, 아니 언젠가 와줘",
      "그때는 내가 더 잘 웃어줄게",
      "별빛 한 스푼, 용기 한 방울",
      "다시 우리 사랑해줘",
      "",
      "[Final Post-Chorus]",
      "콩, 콩, 아직 아파도",
      "꿀꿀, 괜찮아질 거야",
      "콩, 콩, 보고 싶어도",
      "내 마음은 예쁘게 남을 거야",
      "",
      "[Outro]",
      "오늘의 재회운은",
      "조금 슬프고, 많이 귀여워",
      "그러니까 울어도 돼",
      "연이가 옆에서 같이 반짝일게",
    ].join("\n");
    return lyric;
  }
  if (normalized.includes("우린") && normalized.includes("destiny")) {
    return `[Intro]
딩동, 달빛 알림이 와
오늘의 연애운 열어볼까?
꿀꿀, 연이가 말해줄게
너랑 나, 어쩌면 destiny

[Verse 1]
아침부터 이상해, 자꾸 웃음이 나
별자리 앱보다 먼저 네 생각이 떠올라
카드 한 장 뒤집으니 하트가 반짝
오늘의 키워드는 “설렘 시작”

내 사주 속 작은 꽃잎 하나
네 이름을 닮아서 피어나나 봐
궁합 점수보다 더 신기한 건
너만 보면 심장이 콩콩 뛰는 걸

[Pre-Chorus]
타로는 말해, 조금 더 가까이
달빛은 속삭여, 지금이 타이밍
망설이는 마음도 귀엽대
연이가 밀어줄게, one, two, three

[Chorus]
Love Fortune, 두근두근 lucky
오늘 내 사랑운은 너야, baby
Moonlight, starlight, 반짝이는 sign
우리 둘의 운명선이 닿아

Love Fortune, 살짝 웃어줘
내 마음 카드 전부 너로 채워줘
꿀처럼 sweet, 꽃처럼 blooming
연이가 찍어준 사랑 timing

[Post-Chorus]
La-la-love, love fortune
La-la-love, my destiny
꿀꿀, 하트가 반짝
너랑 나랑 lucky, lucky

[Verse 2]
오늘의 행운색은 네가 좋아한 pink
행운 아이템은 네가 준 그 wink
메시지 하나에도 해석이 많아
이건 분명 연애운 상승인가 봐

자미두수 별들도 수줍게 말해
“둘이 있으면 분위기가 달라”
꿈 해몽 속에서도 네가 나왔어
이 정도면 우주도 찬성한 거야

[Pre-Chorus]
카드는 말해, 숨기지 말라고
별빛은 말해, 손잡아 보라고
괜히 아닌 척해도 다 보여
연이가 응원할게, one, two, three

[Chorus]
Love Fortune, 두근두근 lucky
오늘 내 사랑운은 너야, baby
Moonlight, starlight, 반짝이는 sign
우리 둘의 운명선이 닿아

Love Fortune, 살짝 웃어줘
내 마음 카드 전부 너로 채워줘
꿀처럼 sweet, 꽃처럼 blooming
연이가 찍어준 사랑 timing

[Bridge]
혹시 내 마음이 너무 빠를까
별에게 조용히 물어봤어
달은 웃으며 대답했지
“사랑은 원래 반짝이는 거야”

내일의 운세는 몰라도
지금 이 순간은 확실해
네가 웃는 방향으로
내 마음이 걸어가

[Final Chorus]
Love Fortune, 두근두근 lucky
오늘도 내 사랑운은 너야, baby
Moonlight, starlight, 운명 같은 sign
우리 둘의 계절이 시작돼

Love Fortune, 내 손 잡아줘
하트빛 미래를 같이 열어줘
꿀처럼 sweet, 꽃처럼 blooming
연이가 축복한 사랑 timing

[Outro]
딩동, 달빛 알림이 와
오늘의 결론은 하나야
꿀꿀, 연이가 말해줄게
너랑 나는 love destiny`;
  }

  if (/main\s*title/.test(normalized)) {
    return `Code:Destiny 문이 열려
작은 등불 하나, Yeoni가 와
moonlight pass, 손을 잡아
운명의 밤을 건너가

[Verse 1]
꽃잎 모자 쓴 Yeoni
발끝에 별가루를 묻혀
숨겨둔 길 위로
조용히 첫걸음을 놓아
타로 문이 삐걱 열리면
꿈의 아카이브가 빛나
너의 이름 불러 주는
작은 미래가 반짝여

[Pre-Chorus]
사주의 강을 건너
astrology 하늘을 지나
ziwei의 별자리 끝
sukuyo의 바람을 타
oracle 속 손금처럼
오늘의 답을 펼칠 때
마음속 불안도 천천히
꽃이 되어 피어올라

[Chorus]
Moonlight Destiny, 달빛 길로 가
Open your card, 하나씩 열어봐
꽃잎이 fate로 피어나
별들이 sky에 길을 그려
Moonlight Destiny, Yeoni와 가
Blooming fate, 너를 비춰 줘
걱정은 뒤로, 용기를 안아
네 진짜 timing 만나

[Verse 2]
Honey coins of light를 따라
Destiny Flower Atelier로
향기로운 책장 사이
서툰 소원도 쉬어가
문장 같은 꿈 해몽에
네 내일이 고개를 들어
멀어진 사랑의 거리도
이젠 천천히 가까워져

[Pre-Chorus]
사주의 강을 건너
astrology 하늘을 지나
ziwei의 별자리 끝
sukuyo의 바람을 타
oracle 속 손금처럼
오늘의 답을 펼칠 때
마음속 불안도 천천히
꽃이 되어 피어올라

[Chorus]
Moonlight Destiny, 달빛 길로 가
Open your card, 하나씩 열어봐
꽃잎이 fate로 피어나
별들이 sky에 길을 그려
Moonlight Destiny, Yeoni와 가
Blooming fate, 너를 비춰 줘
걱정은 뒤로, 용기를 안아
네 진짜 timing 만나

[Bridge]
괜찮아, 너의 운명은 아직 피어나는 중이야
괜찮아, 너의 운명은 아직 피어나는 중이야
달빛 아래 멈춘 마음도
다시 한번 숨을 쉬어
사랑은 늦지 않아
너를 기다려 왔어

[Final Chorus]
Moonlight Destiny, 달빛 길로 가
Open your card, 이제 믿어봐
꽃잎이 fate로 피어나
별들이 sky에 길을 그려
Moonlight Destiny, Yeoni와 가
Blooming fate, 너를 안아 줘
상처는 지나, 빛으로 남아
네 가장 맑은 운명으로

[Outro]
Code:Destiny 밤은 끝나도
Yeoni의 등불은 남아
네 손안의 작은 카드에
새벽이 조용히 피어나`;
  }

  if (
    normalized.includes("love fortune")
    || normalized.includes("fortune")
    || normalized.includes("러브")
    || normalized.includes("포츈")
    || normalized.includes("달빛 점괘")
  ) {
    return `[Verse 1]
오늘은 뭐가 뜰까
연이 손끝 위에
반짝이는 카드 한 장
살짝 먼저 웃네

별자리도 궁금해
너와 나의 오늘
사주 한 줄 맞춰 보면
괜히 더 설레

[Pre-Chorus]
조심스레 펼쳐 봐
내 마음 한가운데
네 이름이 자꾸만
동그랗게 떠올라

조금만 더 가까이
운이 우리 편이면
오늘 밤은 아마
시작일지도 몰라

[Chorus]
연이의 Love Fortune
두근두근 해
연이의 Love Fortune
너를 부르네
타로도 사주도
별도 말하잖아
지금 이 순간이
딱 너란 거야
(연이의 Love Fortune)

[Verse 2]
손금 위에 번진
작은 초록빛
좋아하는 마음이
이미 지나가네

맞춰 본 궁합도
생각보다 참 좋아
웃는 얼굴 하나에
운명이 흔들려

유난히 따뜻한
오늘의 공기 속
네가 건넨 한마디
마법처럼 남아

[Pre-Chorus]
조심스레 펼쳐 봐
내 마음 한가운데
네 이름이 자꾸만
동그랗게 떠올라

조금만 더 가까이
운이 우리 편이면
오늘 밤은 아마
시작일지도 몰라

[Chorus]
연이의 Love Fortune
두근두근 해
연이의 Love Fortune
너를 부르네
타로도 사주도
별도 말하잖아
지금 이 순간이
딱 너란 거야
(연이의 Love Fortune)

[Bridge]
달빛 아래 조용히
네 손을 생각해
한 장의 카드보다
더 선명한 느낌

우연처럼 와도
난 알아볼 수 있어
우리 둘의 내일은
아주 예쁘니까

[Final Chorus]
연이의 Love Fortune
두근두근 해
연이의 Love Fortune
너를 부르네
타로도 사주도
별도 말하잖아
지금 이 순간이
딱 너란 거야
연이의 Love Fortune
자꾸 웃게 돼
연이의 Love Fortune
너와 나의 fate
오늘의 행운은
네 눈빛 하나
달빛이 맺어준
우리 둘이야
(연이의 Love Fortune)`;
  }

  if (normalized.includes("moonlight code")) {
    return `[Verse 1]
달빛 정원 문 열면
연이가 반짝 인사해
사주 한 장 펼쳐봐
오늘의 길을 알려줘

AI 타로 별빛 카드
마음 위에 톡 얹으면
자미두수, 별자리도
네 운을 같이 춤춰

[Pre-Chorus]
꿈 읽기 속삭여 줘
궁합도 살짝 맞춰 봐
습관도 표정도
다 알아보는 연이야

[Chorus]
연이의 Moonlight Code
딱 맞는 오늘의 코드
연이의 Moonlight Code
너의 운이 피어나는 곳
오늘도 빛나, code destiny
내일도 웃어, code destiny

[Verse 2]
숙요, 베딕도 좋아
별의 언어는 달콤해
동물 얼굴 읽기면
성격도 쏙 보여 줘

오늘 운세 한 줄로
내일 운세 길게도
연간 운세 펼쳐 보면
마음이 먼저 설레어

[Pre-Chorus]
궁금한 그 한마디
연이가 먼저 들어 줘
비밀도 기대도
모두 정리해 줄게

[Chorus]
연이의 Moonlight Code
딱 맞는 오늘의 코드
연이의 Moonlight Code
너의 운이 피어나는 곳
오늘도 빛나, code destiny
내일도 웃어, code destiny

[Bridge]
조용한 밤길 위에
네 이름이 반짝이면
괜찮아, 늦지 않아
지금부터 시작이야

프리미엄 destiny report
네 꿈을 더 또렷하게
연이가 손잡아 줄게
별 끝까지 데려갈게

[Final Chorus]
연이의 Moonlight Code
딱 맞는 오늘의 코드
연이의 Moonlight Code
너의 운이 피어나는 곳
오늘도 빛나, code destiny
내일도 웃어, code destiny
연이의 Moonlight Code
우리 함께 피어나는 곳`;
  }

  if (normalized.includes("손끝 숨결")) {
    return `[Verse 1]
밤하늘 가장 먼 별처럼
너는 손끝에 닿지 않아
그런데 눈을 감으면 이상해
내 곁에서 숨 쉬는 것 같아

혼자 남겨진 시간들도
조금씩 빛으로 변해가
너를 생각하는 마음 하나로
나는 다시 걸어가

[Pre-Chorus]
말로는 다 전하지 못한
우리의 작고 깊은 약속
흩어진 꿈의 조각마저
너에게 가는 길이 돼

[Chorus]
멀리 있을수록 더 가까워져
보이지 않아도 느낄 수 있어
외로움은 나를 울렸지만
끝내 너를 지키는 힘이 돼

우연처럼 시작된 이 마음이
언젠가 운명이 된다면
다시 만나는 그 순간에
나는 너를 꼭 안을게

[Verse 2]
변해가는 거리와 사람들
낯선 계절의 바람 속에
우리의 이름은 희미해져도
사라지진 않을 거야

깨져버린 약속까지도
새로운 맹세가 된다면
아픈 오늘을 지나간 뒤에
기적은 다시 피어나

[Pre-Chorus]
눈부신 내일이 안 보여도
너를 향한 마음은 선명해
손을 잡지 않아도 알아
우린 같은 별을 보고 있어

[Chorus]
멀리 있을수록 더 가까워져
보이지 않아도 느낄 수 있어
그리움은 가슴을 찌르지만
끝내 사랑이라는 빛이 돼

우연처럼 스쳐간 우리 둘이
언젠가 운명이 된다면
처음 만났던 그 마음으로
나는 너를 다시 믿을게

[Bridge]
길을 잃은 밤에도
너의 목소리가 들려
포기하지 말라고
아직 끝난 게 아니라고

[Final Chorus]
멀리 있을수록 더 가까워져
눈을 감으면 네가 보여
외로움도 슬픔도 전부
너에게 닿기 위한 노래야

우연처럼 시작된 이 마음이
반드시 운명이 된다면
다시 만나는 그날까지
오늘을 살아갈게

[Outro]
작은 오르골이 멈춰도
우리의 별은 돌아가
시간을 넘어 다시
너에게 닿을게`;
  }

  if (normalizedSongKey === "andromeda") {
    return `[Intro — 피아노 솔로, 아주 조용히]
우리가 처음 만난 건
같은 하늘 아래가 아니었어
서로 다른 은하에서
길을 잃은 두 별이었어

[Verse 1 — 솔로 보컬, 숨결처럼 조용히]
안드로메다와 밀키웨이
두 은하는 서로를 향해 달려가
충돌하는 데 46억 년
그래도 결국 닿는다잖아

내 별자리는 쌍둥이자리
두 개의 별이 하나인 척 사는 곳
네가 오기 전까지 나는
혼자인 줄도 몰랐어

[Verse 2 — 두 번째 보컬, 조금 더 두텁게]
북쪽 하늘 카시오페이아
어느 각도에서 봐도 W
마치 너를 부르는 글자처럼
밤마다 거기 걸려 있었어

베텔게우스가 죽어가고 있대
곧 초신성이 될 거라고
별도 마지막 순간에
가장 밝게 빛난다잖아

[Pre-Chorus — 두 보컬 하모니, 감정 차오름]
우리가 만난 건 기적이야
수십억 광년의 어둠을 건너
단 하나의 각도로
서로의 빛에 닿은 거야

[Chorus — 풀 오케스트라 드롭, 합창]
우주의 끝에서 너를 찾아
은하수 강을 맨발로 건너
별자리가 흩어져도 괜찮아
너 하나만 기억하면 돼

슈퍼노바처럼 타올라
이 어둠을 전부 삼켜버려
별이 죽어 빛이 되듯
나는 너의 빛이 될게

[Verse 3 — 랩, 낮고 무겁게]
점성술도 설명 못 해
이 감정의 인력을
블랙홀보다 강한 중력으로
넌 내 모든 걸 빨아들여

사수자리 은하 중심
거기 블랙홀이 심장처럼 뛰어
나도 그래 너라는 중심으로
모든 게 빨려 들어가

[Bridge — 피아노만, 극도로 감성적]
혹시 알아
우리가 지금 보는 저 별빛은
이미 천 년 전에 출발한 거래
별은 죽었는데
빛은 아직 오고 있어

그게 꼭 너 같아
넌 이미 내 삶을 지나쳤는데
네가 남긴 빛이
아직도 내 안에서 빛나고 있어

[Pre-Final Chorus — 목소리 갈라짐, 절정 직전]
수십억 년의 어둠 속에서
딱 한 번 겹친 우리의 궤도
다음 생에 또 다른 별로 태어나도
나는 또 너를 찾아낼게

[Final Chorus — 키 한 음 올려, 최대 폭발]
우주의 끝에서 너를 찾아
은하수 강을 맨발로 건너
별자리가 흩어져도 괜찮아
너 하나만 기억하면 돼

슈퍼노바처럼 타올라
이 어둠을 전부 삼켜버려
별이 죽어 빛이 되듯
나는 너의 빛이 될게

[Outro — 오케스트라 잔향, 보컬 위스퍼]
안드로메다가 밀키웨이에 닿는 날
우리도 다시 만날 수 있을까
46억 년을 기다릴게
별이 되어서라도…`;
  }

  if (!normalized.includes("remix") || !normalized.includes("ver")) return undefined;

  return `작은 등불 하나, Yeoni가 와
moonlight pass, 손을 잡아
운명의 밤을 건너가

[Verse 1]
꽃잎 모자 쓴 Yeoni
발끝에 별가루를 묻혀
숨겨둔 길 위로
조용히 첫걸음을 놓아
타로 문이 삐걱 열리면
꿈의 아카이브가 빛나
너의 이름 불러 주는
작은 미래가 반짝여

[Pre-Chorus]
사주의 강을 건너
astrology 하늘을 지나
ziwei의 별자리 끝
sukuyo의 바람을 타
oracle 속 손금처럼
오늘의 답을 펼칠 때
마음속 불안도 천천히
꽃이 되어 피어올라

[Chorus]
Moonlight Destiny, 달빛 길을 따라
Open your card, 마음을 열어봐
꽃잎처럼 fate가 피어나
별빛이 너의 길을 그려

Moonlight Destiny, 연이와 함께
Blooming fate, 널 비춰 줄게
걱정은 내려놓고 숨을 쉬어
네 빛나는 때를 찾아

[Verse 2]
Honey coins of light를 따라
Destiny Flower Atelier로
향기로운 책장 사이
서툰 소원도 쉬어가
문장 같은 꿈 해몽에
네 내일이 고개를 들어
멀어진 사랑의 거리도
이젠 천천히 가까워져

[Pre-Chorus]
사주의 강을 건너
astrology 하늘을 지나
ziwei의 별자리 끝
sukuyo의 바람을 타
oracle 속 손금처럼
오늘의 답을 펼칠 때
마음속 불안도 천천히
꽃이 되어 피어올라

[Chorus]
Moonlight Destiny, 달빛 길로 가
Open your card, 하나씩 열어봐
꽃잎이 fate로 피어나
별들이 sky에 길을 그려
Moonlight Destiny, Yeoni와 가
Blooming fate, 너를 비춰 줘
걱정은 뒤로, 용기를 안아
네 진짜 timing 만나

[Bridge]
괜찮아, 너의 운명은 아직 피어나는 중이야
괜찮아, 너의 운명은 아직 피어나는 중이야
달빛 아래 멈춘 마음도
다시 한번 숨을 쉬어
사랑은 늦지 않아
너를 기다려 왔어

[Final Chorus]
Moonlight Destiny, 달빛 길로 가
Open your card, 이제 믿어봐
꽃잎이 fate로 피어나
별들이 sky에 길을 그려
Moonlight Destiny, Yeoni와 가
Blooming fate, 너를 안아 줘
상처는 지나, 빛으로 남아
네 가장 맑은 운명으로

[Outro]
Code:Destiny 밤은 끝나도
Yeoni의 등불은 남아
네 손안의 작은 카드에
새벽이 조용히 피어나`;

}

