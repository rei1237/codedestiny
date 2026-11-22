export const sourceHash =
  "7b686d55d4f60c191050421464386e1bcd7b67e9e31a16b9cfc1e44797a26441";
export const campaignVersion = 1;
export type Encounter = "tutorial" | "single" | "multi" | "waves" | "boss";
type Choice = { label: string; to: string };
export type Scene = {
  id: string;
  chapter: string;
  title: string;
  bg: string;
  source: [string, string];
  speaker: "연이" | "영냥이" | "이야기" | "알림";
  text: string;
  next?: string;
  choices?: Choice[];
  gate?: string;
  clear?: boolean;
};
export const scenes: Scene[] = [
  {
    id: "room",
    chapter: "프롤로그",
    title: "마지막 4퍼센트",
    bg: "roomNight",
    source: ["prologue:34", "prologue:47"],
    speaker: "이야기",
    text: "젖은 양말을 벗고 침대에 누웠다. 배터리는 4퍼센트. 충전기를 찾는 동안, 처음 보는 앱이 화면 한복판에 달빛 문을 띄웠다.",
    next: "app",
  },
  {
    id: "app",
    chapter: "프롤로그",
    title: "삭제할 수 없는 앱",
    bg: "roomNight",
    source: ["prologue:46", "prologue:60"],
    speaker: "연이",
    text: "아침에 밀어 버린 알림이잖아. 잠깐, 얘가 어떻게 내 이름까지 알지?",
    choices: [
      { label: "알림을 들여다본다", to: "notice" },
      { label: "복구를 나중으로 미룬다", to: "later" },
    ],
  },
  {
    id: "notice",
    chapter: "프롤로그",
    title: "손상된 코드",
    bg: "roomNight",
    source: ["prologue:47", "prologue:53"],
    speaker: "알림",
    text: "사용자 연이. 행운 누수와 인연 코드 훼손을 감지했습니다. 상담원 대기 순번은 무한대입니다.",
    next: "door",
  },
  {
    id: "later",
    chapter: "프롤로그",
    title: "대답하는 화면",
    bg: "roomNight",
    source: ["prologue:55", "prologue:60"],
    speaker: "연이",
    text: "‘나중에’를 눌렀는데 왜 버튼 두 개가 다 ‘예’야? 그럴 거면 물어보질 말든가!",
    next: "door",
  },
  {
    id: "door",
    chapter: "프롤로그",
    title: "방 안에 열린 문",
    bg: "tarotDoor",
    source: ["prologue:62", "prologue:76"],
    speaker: "이야기",
    text: "카드에서 삐걱 소리가 났다. 침대 앞에 선 문 너머로 과제물과 우산이 빨려 들어갔다. 연이가 마지막으로 붙든 건 침대 헤드였다. 뚝.",
    next: "river",
  },
  {
    id: "river",
    chapter: "제1장",
    title: "연잎 위의 발자국",
    bg: "river",
    source: ["ep-01:1", "ep-01:31"],
    speaker: "이야기",
    text: "눈을 뜨자 연잎 배가 발밑에서 일렁였다. 연이는 머리 위 꽃을 만지려다 멈췄다. 손가락이 있어야 할 자리에 동그란 앞발이 있었다.",
    next: "guardian",
  },
  {
    id: "guardian",
    chapter: "제1장",
    title: "사주의 강",
    bg: "river",
    source: ["ep-01:31", "ep-01:65"],
    speaker: "영냥이",
    text: "여기는 사주의 강이다. 모자가 신기한 건 알겠는데, 잠깐만 물속을 봐라.",
    next: "hands",
  },
  {
    id: "hands",
    chapter: "제1장",
    title: "연잎을 놓아줘",
    bg: "hands",
    source: ["ep-01:102", "ep-01:160"],
    speaker: "연이",
    text: "저건 내 교통카드잖아. 저 포장지도! …추억 여행은 좋은데, 우리 배는 좀 놓고 하면 안 돼?",
    gate: "chapter1.lesson",
    next: "wake",
  },
  {
    id: "wake",
    chapter: "제1장",
    title: "물이 열린 자리",
    bg: "river",
    source: ["ep-01:160", "ep-01:171"],
    speaker: "이야기",
    text: "붙잡힌 연잎이 물살을 탔다. 연이는 앞발로 배 가장자리를 꼭 눌렀다. 안개 너머에 거울 조각들이 부딪히는 섬이 있었다.",
    next: "shadow",
  },
  {
    id: "shadow",
    chapter: "제1장",
    title: "갈대 사이의 숨소리",
    bg: "river",
    source: ["ep-01a:1", "ep-01a:1"],
    speaker: "이야기",
    text: "선착장을 앞두고 연잎이 갈대에 걸렸다. 거울 조각 소리 사이로, 누군가 울음을 참듯 이를 가는 소리가 났다.",
    next: "mirror",
  },
  {
    id: "mirror",
    chapter: "제1장",
    title: "비겁의 섬",
    bg: "islandIn",
    source: ["ep-02:46", "ep-02:73"],
    speaker: "연이",
    text: "저 거울 속엔 내 방이 있어. 내가 입던 옷도 있고. 영냥아, 저 손에 닿으면 나도 돌아가는 거야?",
    next: "reflection",
  },
  {
    id: "reflection",
    chapter: "제1장",
    title: "글자를 지켜",
    bg: "islandIn",
    source: ["ep-02:122", "ep-02:151"],
    speaker: "영냥이",
    text: "출구는 아니다. 저 글자에서 눈 떼지 마. 파편은 내가 막을 테니 네 자리는 네가 붙잡아.",
    gate: "chapter1.mirror",
    next: "name",
  },
  {
    id: "name",
    chapter: "제1장",
    title: "내 자리는 내가",
    bg: "islandIn",
    source: ["ep-02:165", "ep-02:184"],
    speaker: "연이",
    text: "말할 때마다 꿀 소리 나고, 다리도 짧고. 근데 늦었다고, 이렇게 생겼다고, 내 자리까지 널 줄 건 아니거든.",
    next: "threshold",
  },
  {
    id: "threshold",
    chapter: "제1장",
    title: "본체 인증 대기",
    bg: "islandIn",
    source: ["ep-02:191", "ep-02:205"],
    speaker: "이야기",
    text: "새싹 아래 깊은 물이 일렁였다. 거울에서 걸어 나온 연이가 두 글자를 제 손바닥에 올렸다. 화면이 깜빡였다. ‘같은 사용자 2명 감지.’",
    clear: true,
    next: "corridor",
  },
  {
    id: "corridor",
    chapter: "제2장 도입",
    title: "되돌아오는 숨소리",
    bg: "islandIn",
    source: ["ep-03:1", "ep-03:53"],
    speaker: "이야기",
    text: "짧은 콧숨 하나가 복도 끝까지 갔다가 돌아왔다. 유리벽이 비춘 건 세 번 튕긴 교통카드와 알람을 놓친 아침이었다. 기억을 묻는 두 번째 칸이 열렸다.",
  },
];
export const sceneById: Record<string, Scene> = Object.fromEntries(
  scenes.map((scene) => [scene.id, scene]),
);
export type Quest = {
  id: string;
  title: string;
  encounter: Encounter;
  intro: string;
  ending: string;
  first: number;
  repeat: number;
  requires?: string;
  bond?: number;
  gate?: string;
};
export const campaignQuests: Quest[] = [
  {
    id: "chapter1.lesson",
    title: "연잎을 붙든 손",
    encounter: "tutorial",
    intro: "붙들린 연잎을 풀어 물길을 열자.",
    ending: "연잎이 다시 물살을 탔다.",
    first: 0,
    repeat: 0,
    gate: "hands",
  },
  {
    id: "chapter1.mirror",
    title: "비겁의 섬 · 거울 파편",
    encounter: "single",
    intro: "날아오는 파편을 막고 연이의 이름을 붙잡자.",
    ending: "거울 가장자리에 을해 두 글자가 떠올랐다.",
    first: 4,
    repeat: 0,
    gate: "reflection",
  },
  {
    id: "study.growth",
    title: "연잎의 첫 수업",
    encounter: "tutorial",
    intro:
      "영냥이가 연잎 한 장을 배에서 건져 냈다. “모서리를 누르면 휘지? 동료도 어디에 힘을 보탤지 정하고 단련해라.”",
    ending:
      "영냥이가 반으로 접은 연잎에 훈련용 조각을 담았다. 강화에서 동료에게 쓸 수 있다.",
    first: 12,
    repeat: 0,
  },
  {
    id: "island.free",
    title: "선착장의 물결",
    encounter: "single",
    intro:
      "배를 잡아 두었던 물결이 선착장에 남았다. 작은 연잎이 빠져나갈 길을 내자.",
    ending: "작은 연잎이 빈 선착장을 떠났다.",
    first: 5,
    repeat: 2,
  },
  {
    id: "study.gear",
    title: "자명종이 울릴 때",
    encounter: "multi",
    intro:
      "연이는 알람 세 개를 차례로 맞췄다. 이번에는 첫 종이 울릴 때 누가 움직일지 미리 적어 뒀다. 편성에서 예장 효과를 살펴보자.",
    ending:
      "첫 타종에 박자를 맞췄다. 영냥이가 작전표의 첫 칸에 동그라미를 쳤다.",
    first: 6,
    repeat: 0,
    requires: "study.growth",
  },
  {
    id: "bond.neo",
    title: "모자 끝 별 하나",
    encounter: "single",
    intro:
      "영냥이가 모자 끝을 물에 담갔다. “별이 흔들리면 옆을 봐라. 네가 놓친 건 내가 보고 있으니.”",
    ending:
      "연이가 지나간 자리에 금빛 발자국이 겹쳤다. 영냥이는 대답 대신 모자 끝을 톡 올렸다.",
    first: 6,
    repeat: 0,
    requires: "study.gear",
    bond: 2,
  },
  {
    id: "study.skill",
    title: "한 박자 먼저",
    encounter: "waves",
    intro:
      "연이는 두 번째 파도가 오는 간격을 셌다. 남보다 먼저 움직일 수 있는 건 한 박자뿐이었다.",
    ending:
      "훈련 기록에 모카 기본 버전의 첫 스킬을 새겼다. 숙련 레벨이 최소 2가 된다.",
    first: 8,
    repeat: 0,
    requires: "bond.neo",
  },
  {
    id: "island.boss",
    title: "거울의 긴 그림자",
    encounter: "boss",
    intro:
      "검은 그림자가 넘실거릴 때마다 금이 하나씩 늘어난다. 적의 다음 강공격을 읽고 맞설 차례다.",
    ending: "가장 크게 갈라진 거울이 고요해졌다.",
    first: 10,
    repeat: 3,
    requires: "study.gear",
  },
  {
    id: "event.lantern",
    title: "연잎 등불 띄우기",
    encounter: "multi",
    intro:
      "연이는 접은 연잎에 작은 빛을 얹었다. “어디까지 가는지 보자.” 영냥이는 강 건너에 부딪치는 물결부터 헤아렸다.",
    ending:
      "마지막 등불이 강 굽이를 돌아 사라질 때까지 둘은 선착장에 앉아 있었다.",
    first: 8,
    repeat: 0,
    requires: "bond.neo",
  },
];
export const questById: Record<string, Quest> = Object.fromEntries(
  campaignQuests.map((q) => [q.id, q]),
);
export const isStorySupportQuest = (id: string) => Boolean(questById[id]?.gate);
export type Receipt = {
  questId: string;
  victory: boolean;
  reward: number;
  first: boolean;
};
export type CampaignProgress = {
  version: number;
  node: string;
  read: string[];
  choice: Record<string, string>;
  completed: Record<string, number>;
  cleared: boolean;
  bond: number;
  pending: string | null;
  receipts: Record<string, Receipt>;
};
export function initialCampaign(): CampaignProgress {
  return {
    version: campaignVersion,
    node: "room",
    read: [],
    choice: {},
    completed: {},
    cleared: false,
    bond: 0,
    pending: null,
    receipts: {},
  };
}
export function restoreCampaign(stored?: CampaignProgress): CampaignProgress {
  const p = { ...initialCampaign(), ...stored };
  if (p.version !== campaignVersion || !sceneById[p.node]) {
    p.node = p.cleared ? "corridor" : "room";
    p.pending = null;
    p.version = campaignVersion;
    p.read = p.read.filter((id) => sceneById[id]);
  }
  return p;
}
export function questLock(p: CampaignProgress, q: Quest): string {
  if (q.gate)
    return p.node === q.gate && !p.completed[q.id]
      ? ""
      : "해당 본편 장면에서 출전할 수 있어요.";
  if (!p.cleared) return "제1장 완료 후 해금";
  if (q.requires && !p.completed[q.requires])
    return questById[q.requires].title + " 완료 후 해금";
  if (q.bond && p.bond < q.bond) return "영냥이 인연 " + q.bond + " 이상";
  if (!q.repeat && p.completed[q.id]) return "완료 · 기록에서 다시 읽기";
  return "";
}
export function advanceScene(
  p: CampaignProgress,
  from: string,
  choice?: string,
) {
  if (p.node !== from) throw Error("다른 화면에서 읽던 위치가 바뀌었어요.");
  const current = sceneById[from];
  if (current.gate && !p.completed[current.gate])
    throw Error("먼저 장면 전투를 마쳐 주세요.");
  if (current.choices && !current.choices.some((c) => c.to === choice))
    throw Error("연이의 대답을 골라 주세요.");
  if (
    current.id === "threshold" &&
    (!p.completed["chapter1.lesson"] || !p.completed["chapter1.mirror"])
  )
    throw Error("제1장의 전투 기록을 확인하세요.");
  if (!p.read.includes(from)) p.read.push(from);
  if (current.choices && choice) p.choice[from] = choice;
  if (current.clear) p.cleared = true;
  p.node = current.choices ? choice! : (current.next ?? from);
}
export function settleBattle(
  p: CampaignProgress,
  questId: string,
  battleId: string,
  victory: boolean,
): Receipt {
  if (!battleId) throw Error("전투 기록을 확인할 수 없어요.");
  const previous = p.receipts[battleId];
  if (previous) {
    if (previous.questId !== questId || previous.victory !== victory)
      throw Error("이미 기록된 전투와 결과가 달라요.");
    return previous;
  }
  const q = questById[questId];
  if (!q || p.pending !== q.id || questLock(p, q))
    throw Error("출전한 의뢰와 완료 기록이 일치하지 않아요.");
  const first = !p.completed[q.id];
  const receipt = {
    questId,
    victory,
    first: first && victory,
    reward: victory ? (first ? q.first : q.repeat) : 0,
  };
  p.receipts[battleId] = receipt;
  p.pending = null;
  if (victory) {
    p.completed[q.id] = (p.completed[q.id] ?? 0) + 1;
    if (first) p.bond++;
    if (q.gate) advanceScene(p, q.gate);
  }
  return receipt;
}
