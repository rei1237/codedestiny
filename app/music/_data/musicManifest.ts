import { buildMusicPublicUrl } from "@/lib/r2-public-url";

export type ArtistKey = "neo" | "yeoni" | "dest1nova";
export type ArtistName = "Neo" | "Yeoni" | "DEST1NOVA";

export type Track = {
  id: string;
  artistKey: ArtistKey;
  artistName: ArtistName;
  title: string;
  audioKey: string;
  coverKey: string;
  audioUrl: string;
  coverUrl: string;
  durationSeconds?: number;
  mood?: string;
  order?: number;
  lyrics?: string;
};

type MusicFolder = "neosong" | "yeonisong" | "neosongmini1" | "yeonisongmini1" | "DEST1NOVA";

type ArtistConfig = {
  artistKey: ArtistKey;
  artistName: ArtistName;
  folder: MusicFolder;
  fallbackCoverFileName: string;
  coverFileNames: readonly string[];
  displayCoverUrl?: string;
};

type ArtistAudioManifest = {
  artistKey: ArtistKey;
  folder?: MusicFolder;
  fallbackCoverFileName?: string;
  coverFileNames?: readonly string[];
  displayCoverUrl?: string;
  audioFileNames: readonly string[];
};

const ARTISTS = {
  neo: {
    artistKey: "neo",
    artistName: "Neo",
    folder: "neosong",
    fallbackCoverFileName: "네오 데뷔.webp",
    coverFileNames: ["네오 데뷔.webp"],
    displayCoverUrl: undefined,
  },
  yeoni: {
    artistKey: "yeoni",
    artistName: "Yeoni",
    folder: "yeonisong",
    fallbackCoverFileName: "꽃돼지 1집.png",
    coverFileNames: ["꽃돼지 1집.webp", "꽃돼지 1집.png"],
    displayCoverUrl: "/music-covers/yeoni-1st-album.webp",
  },
  dest1nova: {
    artistKey: "dest1nova",
    artistName: "DEST1NOVA",
    folder: "DEST1NOVA",
    fallbackCoverFileName: "DEST1NOVA.webp",
    coverFileNames: ["DEST1NOVA.webp"],
    displayCoverUrl: undefined,
  },
} as const satisfies Record<ArtistKey, ArtistConfig>;

const artistAudioManifests = [
  {
    artistKey: "neo",
    audioFileNames: [
      "Code Destiny.wav",
      "정재의 사랑.wav",
      "인성 과다 생각감옥.wav",
      "합충형파해 Spicy Love.wav",
      "MBTI 물어보지마.wav",
      "STAR-CROSSED.wav",
      "내 사랑의 총량.wav",
      "너는 나의 용신.wav",
      "대운 업데이트!.wav",
      "십성 로큰롤.wav",
      "안괴 안돼.wav",
      "운명에게 지지 않아.wav",
      "운명은 위대하다.wav",
    ],
  },
  {
    artistKey: "yeoni",
    audioFileNames: [
      "Gisin Out Yongsin In.wav",
      "Moonlight Daydream.wav",
      "Mystery of Life_new.wav",
      "Star-ink Heartstorm.wav",
      "탐랑 플러팅 주의보.wav",
      "원진귀문 러브 알고리즘.wav",
      "재회운아 도와줘.wav",
      "달빛 운명여행 main title.wav",
      "달빛 운명여행 remix ver.wav",
      "달빛 점괘.wav",
      "러브 포츈.wav",
      "별자리 지도 위에서.wav",
      "숙요점 레슨.wav",
      "연이의 Moonlight Code.wav",
    ],
  },
  {
    artistKey: "neo",
    folder: "neosongmini1",
    fallbackCoverFileName: "네오 미니 앨범 1집.webp",
    coverFileNames: ["네오 미니 앨범 1집.webp"],
    audioFileNames: [
      "매력의 sign.wav",
      "비겁다자의 우정 지옥.wav",
      "새벽 끝.mp3",
      "식상 폭발 말빨천재.wav",
      "역마살 열차창.wav",
      "재성아 나 돈 좀 줘.wav",
      "탐랑성 Danger.wav",
    ],
  },
  {
    artistKey: "yeoni",
    folder: "yeonisongmini1",
    fallbackCoverFileName: "연이 미니 앨범 1집 (2).webp",
    coverFileNames: ["연이 미니 앨범 1집 (2).webp"],
    audioFileNames: [
      "Flower pig 매력살.mp3",
      "기신은 bye bye.wav",
      "달빛처럼 닿을게.wav",
      "도화 화개 love charm.mp3",
      "별빛 재판.mp3",
      "손끝 숨결.mp3",
    ],
  },
  {
    artistKey: "dest1nova",
    audioFileNames: [
      "Flip the Card.mp3",
      "I am your fate.wav",
      "Karma, karma.mp3",
      "LUCKY THIEF.mp3",
      "Synastry gravity.mp3",
      "Zero hour, we don’t run.mp3",
      "별빛 궤도속 fatal-sign.wav",
      "별이 말해.mp3",
      "오행 FLEX.mp3",
      "운세 soda pop.wav",
      "자미제왕 컴백.wav",
      "천동성 힐링남.mp3",
      "편관의 궤도.wav",
    ],
  },
] as const satisfies readonly ArtistAudioManifest[];

function keyFromFileName(folder: ArtistConfig["folder"], fileName: string) {
  const normalizedFileName = fileName.replace(/^\/+|\/+$/g, "");
  return `${folder}/${normalizedFileName}`;
}

function basenameFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "");
}

function titleFromAudioFileName(fileName: string) {
  return basenameFromFileName(fileName).replace(/[-_]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function lyricsFromAudioFileName(audioFileName: string) {
  const normalized = basenameFromFileName(audioFileName).toLowerCase();
  const normalizedSongKey = normalized
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

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

function findCoverFileName(artist: ArtistConfig, audioFileName: string) {
  const audioBasename = basenameFromFileName(audioFileName).toLowerCase();
  return artist.coverFileNames.find((coverFileName) => (
    basenameFromFileName(coverFileName).toLowerCase() === audioBasename
  )) || artist.fallbackCoverFileName;
}

function buildTrack(manifest: ArtistAudioManifest, audioFileName: string, index: number): Track {
  const baseArtist = ARTISTS[manifest.artistKey];
  const hasFolderOverride = Boolean(manifest.folder);
  const artist: ArtistConfig = {
    ...baseArtist,
    folder: manifest.folder || baseArtist.folder,
    fallbackCoverFileName: manifest.fallbackCoverFileName || baseArtist.fallbackCoverFileName,
    coverFileNames: manifest.coverFileNames || baseArtist.coverFileNames,
    displayCoverUrl: manifest.displayCoverUrl ?? (hasFolderOverride ? undefined : baseArtist.displayCoverUrl),
  };
  const audioKey = keyFromFileName(artist.folder, audioFileName);
  const coverKey = keyFromFileName(artist.folder, findCoverFileName(artist, audioFileName));

  return {
    id: `${artist.artistKey}-${String(index + 1).padStart(2, "0")}`,
    artistKey: artist.artistKey,
    artistName: artist.artistName,
    title: titleFromAudioFileName(audioFileName),
    audioKey,
    coverKey,
    audioUrl: buildMusicPublicUrl(audioKey),
    coverUrl: artist.displayCoverUrl || buildMusicPublicUrl(coverKey),
    lyrics: lyricsFromAudioFileName(audioFileName),
    order: index + 1,
  };
}

const artistTrackCounts: Record<ArtistKey, number> = { neo: 0, yeoni: 0, dest1nova: 0 };

export const tracks = artistAudioManifests.flatMap((manifest) => (
  manifest.audioFileNames.map((audioFileName) => {
    const index = artistTrackCounts[manifest.artistKey];
    artistTrackCounts[manifest.artistKey] += 1;
    return buildTrack(manifest, audioFileName, index);
  })
));
export const neoTracks = tracks.filter((track) => track.artistKey === "neo");
export const yeoniTracks = tracks.filter((track) => track.artistKey === "yeoni");
export const dest1novaTracks = tracks.filter((track) => track.artistKey === "dest1nova");
export const allTracks = [...yeoniTracks, ...neoTracks, ...dest1novaTracks];
