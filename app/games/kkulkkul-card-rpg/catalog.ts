export const GAME_TITLE = "꿀꿀운세 — 운명의 연대기";
export const screens = {
  home: "로비",
  story: "이야기 이어하기",
  cast: "동료",
  team: "편성",
  relic: "예장",
  growth: "강화",
  summon: "소환",
  menu: "메뉴",
  archive: "이야기 서고",
  history: "전투 기록",
  settings: "설정",
  help: "도움말",
  event: "축제의 무대",
  mail: "우편",
};
export type Screen = keyof typeof screens;
export const companions = [
  {
    name: "연이",
    sheet: "yeoni",
    speaker: "yeon",
    image: "/images/expert-characters/yeoni/base.webp",
    role: "이야기의 주인공",
    lines: [
      "알람을 세 개나 맞췄는데… 벌써 아침이야?",
      "이번엔 뭐가 꼬인 건지, 같이 찾아볼래?",
    ],
  },
  {
    name: "영냥이",
    sheet: "neo_cat",
    speaker: "neo",
    image: "/images/novel/yeongnyangi/neutral.webp",
    role: "길잡이",
    lines: ["서두르지 마. 살펴볼 시간은 있다.", "자, 어디부터 읽을 거지?"],
  },
  {
    name: "윤달",
    sheet: "yun",
    speaker: "yun",
    image: "/images/expert-characters/yun/hero.webp",
    role: "명식을 읽는 점술가",
    lines: [
      "여기 앉으시죠. 붓에 먹이 아직 마르지 않았거든요.",
      "여덟 칸 중에 오늘은 어느 칸이 궁금하세요?",
    ],
  },
  {
    name: "서한비",
    sheet: "seohanbi",
    speaker: "pje",
    image: "/images/expert-characters/hanbi/composed.webp",
    role: "검은 우산의 이웃",
    lines: [
      "비가 올 것 같아요. 우산, 같이 쓰실래요?",
      "장부는 잠시 덮어 둘게요. 말씀하세요.",
    ],
  },
  {
    name: "모카",
    sheet: "moka",
    speaker: "moka",
    image: "/images/novel/remaster/v2/moka/cook.webp",
    role: "요리하는 수달 래퍼",
    lines: [
      "하나, 둘! 냄비 뚜껑에도 박자가 있다니까.",
      "꼬치 식기 전에 먹어. 후렴은 그다음이야!",
    ],
  },
  {
    name: "루나",
    sheet: "luna",
    speaker: "ln",
    image: "/images/novel/mobile/ln-48e4401feb.webp",
    role: "언덕 빵집의 배달부",
    lines: [
      "냄새 좋지? 언니가 아침에 구운 빵이야!",
      "바구니는 내가 들래. 빵이 눌리면 안 되거든.",
    ],
  },
];
export const pending = {
  team: "편성은 동료와 예장 장착 기능을 준비하고 있어요.",
  relic: "예장 도감과 장착 기능을 준비하고 있어요.",
  growth: "캐릭터 레벨과 예장 강화는 성장 콘텐츠에서 열립니다.",
  history: "전투가 열리면 완료한 전투 기록을 여기에서 확인할 수 있어요.",
  event:
    "축제 이야기 EP.12를 마치면 열리는 연습 무대입니다. 현재 준비 중이에요.",
  mail: "게임 우편함을 준비하고 있어요.",
};
