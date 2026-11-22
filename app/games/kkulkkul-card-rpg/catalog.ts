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
    image: "/images/expert-characters/yeoni/base.webp",
    role: "이야기의 주인공",
    lines: [
      "알람을 세 개나 맞췄는데… 벌써 아침이야?",
      "이번엔 뭐가 꼬인 건지, 같이 찾아볼래?",
    ],
  },
  {
    name: "영냥이",
    image: "/images/novel/yeongnyangi/neutral.webp",
    role: "길잡이",
    lines: ["서두르지 마. 살펴볼 시간은 있다.", "자, 어디부터 읽을 거지?"],
  },
];
export const pending = {
  team: "편성은 동료와 예장 장착 기능을 준비하고 있어요.",
  relic: "예장 도감과 장착 기능을 준비하고 있어요.",
  growth: "캐릭터 레벨과 예장 강화는 성장 콘텐츠에서 열립니다.",
  summon:
    "캐릭터와 예장 소환 미리보기를 준비하고 있어요. 현재 월정석이 사용되는 배너는 없습니다.",
  history: "전투가 열리면 완료한 전투 기록을 여기에서 확인할 수 있어요.",
  event:
    "축제 이야기 EP.12를 마치면 열리는 연습 무대입니다. 현재 준비 중이에요.",
  mail: "게임 우편함을 준비하고 있어요.",
};
