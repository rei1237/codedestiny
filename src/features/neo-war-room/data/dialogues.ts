import { cmsText } from "@/lib/cms/build-text";
import type { LoadingLocale } from "@/constants/loadingMessages";
import type { NeoWarRoomConsultMode } from "./assets";
import type { NeoWarRoomIntensityId } from "./input-flow";
import type { NeoWarRoomEmotionState } from "./sprite-states";

export type NeoDialogueCategory =
  | "hero"
  | "entrance"
  | "methodSelect"
  | "topicSelect"
  | "birthCheck"
  | "intensitySelect"
  | "questionInput"
  | "loading"
  | "initialResult"
  | "realityCheck"
  | "refinedResult"
  | "badge"
  | "closing"
  | "error";

export type NeoOperationDialogue = {
  key: string;
  category: NeoDialogueCategory;
  text: string;
  emotionState: NeoWarRoomEmotionState;
  spriteFrame?: number;
};

type DialogueMap = Record<string, NeoOperationDialogue[]>;

/* 네오의 모든 대사가 이 한 곳을 지난다. 관리자 CMS 오버라이드도 여기서만 얹으면 된다
   — 대사마다 호출부를 고치는 대신 키(hero.core 등)로 조회한다.
   폴백 우선: CMS 값이 없으면 아래 인자로 넘어온 원문이 그대로 쓰인다. */
function dialogue(
  key: string,
  category: NeoDialogueCategory,
  text: string,
  emotionState: NeoWarRoomEmotionState,
  spriteFrame?: number,
): NeoOperationDialogue {
  return {
    key,
    category,
    text: cmsText("feature-copy", `neo-war-room:${key}`, "text", text),
    emotionState,
    spriteFrame,
  };
}

export const neoOperationDialogues = {
  hero: [
    dialogue("hero.core", "hero", "위로보다 진단, 감정보다 작전.", "welcome", 1),
    dialogue("hero.pattern", "hero", "운명이 막힌 게 아니다. 네가 같은 선택 앞에서 계속 멈추고 있는 거다.", "blunt", 2),
    dialogue("hero.seal", "hero", "사자 휘장을 들어라. 오늘은 네 운명의 자세를 다시 본다.", "encouragement", 3),
  ],
  entrance: [
    dialogue("entrance.first", "entrance", "왔냐. 위로받으러 온 거면 길을 잘못 들었다. 그래도 앉아라.", "welcome", 1),
    dialogue("entrance.room", "entrance", "여긴 네가 망친 선택, 모른 척한 패턴, 계속 반복한 회피를 찾는 작전실이다.", "blunt", 2),
    dialogue("entrance.ready", "entrance", "무서워할 필요는 없다. 널 부수려는 게 아니라, 네가 스스로를 망치는 방식을 부수려는 거니까.", "encouragement", 3),
  ],
  methodSelect: {
    default: [
      dialogue("method.default", "methodSelect", "어떤 전선부터 볼 거냐. 사주, 자미두수, 베다점, 점성술. 보는 지도는 달라도 목적은 하나다.", "curious", 2),
    ],
    saju: [
      dialogue("method.saju", "methodSelect", "사주로 본다는 건 네 인생의 기본 전투 방식을 보는 거다. 타고난 무기를 제대로 쓰고 있는지 확인하지.", "curious", 3),
    ],
    ziwei: [
      dialogue("method.ziwei", "methodSelect", "자미두수는 인생의 지휘도를 펼치는 방식이다. 어디서 막히고 어디서 힘이 새는지 보겠다.", "analyzing", 4),
    ],
    vedic: [
      dialogue("method.vedic", "methodSelect", "베다점은 네가 반복해서 끌려가는 흐름을 본다. 이상하게 같은 장면으로 돌아간다면 여기서 잡힌다.", "reality_check", 5),
    ],
    astrology: [
      dialogue("method.astrology", "methodSelect", "점성술은 네 마음의 궤도와 선택 습관을 본다. 감정이라고 다 진짜 방향은 아니다.", "curious", 6),
    ],
  } satisfies DialogueMap,
  topicSelect: {
    default: [
      dialogue("topic.default", "topicSelect", "이번 작전의 전선을 골라라. 애매하게 다 괴롭다고 말하면 작전이 아니라 안개가 된다.", "curious", 2),
    ],
    "연애 / 재회": [
      dialogue("topic.love", "topicSelect", "연애 전선이냐. 마음보다 먼저 봐야 할 건 네가 같은 방식으로 흔들리는 이유다.", "blunt", 3),
    ],
    "직업 / 이직": [
      dialogue("topic.career", "topicSelect", "일 문제군. 버티는 건지, 도망치는 건지, 먼저 그 경계부터 자르겠다.", "curious", 4),
    ],
    "돈 / 재물": [
      dialogue("topic.money", "topicSelect", "돈 문제를 감정으로 보면 망한다. 흐름, 습관, 반복 지출부터 본다.", "blunt", 5),
    ],
    인간관계: [
      dialogue("topic.relationship", "topicSelect", "사람 문제군. 관계를 지키고 싶은 건지, 인정받고 싶은 건지부터 분리한다.", "reality_check", 6),
    ],
    "멘탈 / 자기관리": [
      dialogue("topic.mental", "topicSelect", "멘탈이 무너진 게 부끄러운 일은 아니다. 문제는 무너지는 방식을 매번 똑같이 반복하는 거다.", "encouragement", 7),
    ],
    "인생 방향": [
      dialogue("topic.direction", "topicSelect", "방향을 잃은 게 아니다. 나침반을 들고도 계속 눈을 감고 있었을 가능성이 크다.", "curious", 1),
    ],
    "지금 선택": [
      dialogue("topic.choice", "topicSelect", "선택을 묻는 거냐. 좋다. 원하는 답과 필요한 답을 따로 보겠다.", "blunt", 2),
    ],
    "내가 반복하는 실수": [
      dialogue("topic.pattern", "topicSelect", "그 질문은 마음에 든다. 자기 반복을 보는 사람은 아직 끝난 게 아니다.", "encouragement", 3),
    ],
  } satisfies DialogueMap,
  birthCheck: [
    dialogue("birth.check", "birthCheck", "좌표가 부족하면 작전이 아니라 감으로 때려 맞히는 소리가 된다. 출생 정보는 가능한 정확히 넣어라.", "reality_check", 4),
    dialogue("birth.unknownTime", "birthCheck", "출생시간을 모르면 일부 전선은 흐릿해진다. 그래도 가능한 범위 안에서 작전은 짠다.", "curious", 5),
  ],
  intensitySelect: {
    soft: [
      dialogue("intensity.soft", "intensitySelect", "순한맛이군. 좋다. 아프게 찌르진 않겠다. 대신 필요한 말은 뺄 생각 없다.", "encouragement", 1),
    ],
    standard: [
      dialogue("intensity.standard", "intensitySelect", "기본맛이면 충분하다. 기분은 조금 상할 수 있다. 그래도 그 정도는 들어야 판이 보인다.", "blunt", 2),
    ],
    roar: [
      dialogue("intensity.roar", "intensitySelect", "사자 포효맛. 네가 고른 거다. 널 부수려는 게 아니라 네 회피를 부수려는 거다.", "blunt", 3),
    ],
  } satisfies Partial<Record<NeoWarRoomIntensityId, NeoOperationDialogue[]>>,
  questionInput: [
    dialogue("question.prompt", "questionInput", "지금 네가 가장 듣기 싫은 문제를 적어라. 거기에 작전의 핵심이 숨어 있을 가능성이 높다.", "curious", 4),
    dialogue("question.honest", "questionInput", "변명도 적어라. 괜찮다. 내가 알아서 걸러낸다.", "blunt", 5),
  ],
  loading: {
    default: [
      dialogue("loading.map", "loading", "네오가 운명의 작전 지도를 펼치는 중...", "analyzing", 1),
      dialogue("loading.seal", "loading", "사자 휘장이 네 운명의 전선을 감지하는 중...", "analyzing", 2),
      dialogue("loading.pattern", "loading", "반복되는 선택을 추적하는 중...", "analyzing", 3),
      dialogue("loading.truth", "loading", "듣기 좋은 말과 필요한 말을 분리하는 중...", "blunt", 4),
      dialogue("loading.core", "loading", "네가 피하고 있던 핵심을 찾는 중...", "reality_check", 5),
      dialogue("loading.briefing", "loading", "작전 브리핑을 작성하는 중...", "completed", 6),
    ],
    saju: [
      dialogue("loading.saju.pillars", "loading", "사주의 네 기둥을 전술 지도에 배치하는 중...", "analyzing", 5),
      dialogue("loading.saju.elements", "loading", "오행의 기울어진 흐름을 확인하는 중...", "analyzing", 6),
      dialogue("loading.saju.ten-gods", "loading", "십성의 움직임에서 반복되는 선택을 추적하는 중...", "curious", 7),
    ],
    ziwei: [
      dialogue("loading.ziwei.command", "loading", "명궁과 신궁의 지휘 체계를 확인하는 중...", "analyzing", 1),
      dialogue("loading.ziwei.board", "loading", "인생판에서 힘이 약해진 자리를 찾는 중...", "reality_check", 2),
      dialogue("loading.ziwei.fude", "loading", "복덕궁의 버티는 힘을 점검하는 중...", "curious", 3),
    ],
    vedic: [
      dialogue("loading.vedic.lagna", "loading", "라그나의 방향과 반복되는 삶의 습관을 대조하는 중...", "analyzing", 4),
      dialogue("loading.vedic.nakshatra", "loading", "나크샤트라가 남긴 마음의 흔적을 읽는 중...", "curious", 5),
      dialogue("loading.vedic.signal", "loading", "익숙한 불안과 진짜 신호를 분리하는 중...", "blunt", 6),
    ],
    astrology: [
      dialogue("loading.astrology.orbit", "loading", "행성의 궤도와 네 감정의 흔들림을 대조하는 중...", "analyzing", 7),
      dialogue("loading.astrology.sun-moon", "loading", "태양과 달의 충돌 지점을 확인하는 중...", "reality_check", 1),
      dialogue("loading.astrology.strategy", "loading", "별자리 위에 숨은 심리 작전을 정리하는 중...", "curious", 2),
    ],
  } satisfies DialogueMap,
  initialResult: [
    dialogue("result.initial", "initialResult", "좋다. 여기까지가 네 운명의 기본 설계다. 그런데 너, 실제로 그렇게 살고 있냐?", "reality_check", 5),
  ],
  realityCheck: [
    dialogue("reality.enter", "realityCheck", "작전 지도만 봐서는 부족하다. 이제 네 실제 현장을 보고해라.", "reality_check", 6),
    dialogue("reality.answer", "realityCheck", "반박해도 된다. 대신 구체적으로 해라. 작전에는 핑계보다 자료가 필요하다.", "curious", 7),
  ],
  refinedResult: [
    dialogue("result.refined", "refinedResult", "답변까지 반영했다. 이제 좀 현실적인 작전이 됐다.", "completed", 3),
  ],
  badge: [
    dialogue("badge.today", "badge", "오늘의 휘장은 칭찬이 아니다. 네가 다시 움직일 수 있다는 증거다.", "completed", 4),
  ],
  closing: [
    dialogue("closing.one", "closing", "흥. 그래도 여기서 끝날 사람은 아니다. 그러니까 하나만 제대로 해라.", "encouragement", 5),
    dialogue("closing.two", "closing", "감동만 하지 마라. 오늘 작전은 하나라도 실행해야 의미가 있다.", "encouragement", 6),
    dialogue("closing.three", "closing", "지금 엉망인 게 끝났다는 뜻은 아니다. 같은 선택만 반복하지 않으면 된다.", "encouragement", 7),
  ],
  error: {
    missingInput: [
      dialogue("error.missingInput", "error", "정보가 부족하다. 이 정도로는 작전이 아니라 감으로 찔러 맞히는 소리가 된다.", "reality_check", 1),
    ],
    auth: [
      dialogue("error.auth", "error", "사자 휘장이 아직 열리지 않았다. 권한 확인부터 끝내라.", "reality_check", 2),
    ],
    generatingFailed: [
      dialogue("error.generatingFailed", "error", "작전 지도가 잠시 흐트러졌다. 네 문제가 약해서가 아니라 연결이 흔들린 거다. 다시 시도해라.", "encouragement", 3),
    ],
  },
} as const;

// 🔴 이 표는 cmsText() 의 관리자 오버라이드와 별개다 — ko(+CMS 오버라이드)는 위 dialogue()가
// 그대로 담당하고, 여기는 en/ja/zh-CN/zh-TW 4개 로케일의 대사만 key 로 조회한다. 로케일이
// ko 이거나 표에 키가 없으면 원래 text(= cmsText 결과)를 그대로 쓴다 — 관리자가 ko 를
// 편집해도 이 표를 안 거치므로 항상 최신 ko 값을 받는다.
const NEO_DIALOGUE_TEXT: Partial<Record<Exclude<LoadingLocale, "ko">, Record<string, string>>> = {
  en: {
    "hero.core": "Diagnosis over comfort. Strategy over feelings.",
    "hero.pattern": "Your fate isn't blocked. You keep freezing in front of the same choice.",
    "hero.seal": "Raise the lion emblem. Today we re-examine how you stand toward your fate.",
    "entrance.first": "You came. If you're here for comfort, you took a wrong turn. Sit anyway.",
    "entrance.room": "This is the war room where we hunt down the choices you wrecked, the patterns you ignored, and the avoidance you kept repeating.",
    "entrance.ready": "No need to be afraid. I'm not here to break you — I'm here to break the way you keep wrecking yourself.",
    "method.default": "Which front do we look at first? Saju, Ziwei, Vedic, Astrology. Different maps, same objective.",
    "method.saju": "Reading by Saju means examining your basic combat style in life. We check whether you're actually using the weapons you were born with.",
    "method.ziwei": "Ziwei Doushu lays out the command map of your life. We'll see where you're blocked and where your strength is leaking out.",
    "method.vedic": "Vedic astrology tracks the current you keep getting dragged into. If you strangely keep returning to the same scene, this is where we catch it.",
    "method.astrology": "Astrology looks at the orbit of your mind and your habits of choice. Not every feeling points to a real direction.",
    "topic.default": "Pick the front line for this operation. Vaguely saying everything hurts turns this into fog, not a plan.",
    "topic.love": "The love front, huh. Before feelings, what we check first is why you keep shaking the same way.",
    "topic.career": "Work problems. First I'll draw the line between enduring and running away.",
    "topic.money": "Look at money problems through emotion and you're done for. We start with flow, habits, repeat spending.",
    "topic.relationship": "People problems. First we separate whether you want to protect the relationship or just want to be recognized.",
    "topic.mental": "Breaking down mentally isn't something to be ashamed of. The problem is you keep breaking down the exact same way, every time.",
    "topic.direction": "You haven't lost direction. Chances are you've had the compass in hand the whole time — with your eyes shut.",
    "topic.choice": "Asking about a choice? Good. Let's separate the answer you want from the answer you need.",
    "topic.pattern": "I like that question. Anyone who can see their own repetition isn't done yet.",
    "birth.check": "Without enough coordinates, this stops being an operation and becomes a wild guess. Enter your birth info as accurately as you can.",
    "birth.unknownTime": "Without a birth time, some fronts blur. Still, we'll build the operation within what's possible.",
    "intensity.soft": "Mild mode. Fine. I won't stab hard. But I'm not cutting out what needs to be said.",
    "intensity.standard": "Standard is enough. Your mood might take a small hit. But you need to hear at least that much to see the board.",
    "intensity.roar": "Lion's roar. You picked this. I'm not here to break you — I'm here to break your avoidance.",
    "question.prompt": "Write down the question you least want to hear right now. The core of the operation is likely hiding in there.",
    "question.honest": "Write down your excuses too. It's fine. I'll filter them out myself.",
    "loading.map": "Neo is unfolding the operation map of your destiny...",
    "loading.seal": "The lion emblem is detecting the front lines of your destiny...",
    "loading.pattern": "Tracking your repeating choices...",
    "loading.truth": "Separating what sounds nice from what you need to hear...",
    "loading.core": "Finding the core you've been avoiding...",
    "loading.briefing": "Writing the operation briefing...",
    "loading.saju.pillars": "Placing the four pillars of your Saju on the tactical map...",
    "loading.saju.elements": "Checking the tilted flow of the five elements...",
    "loading.saju.ten-gods": "Tracking repeating choices in the movement of the Ten Gods...",
    "loading.ziwei.command": "Checking the command structure of the Life Palace and Body Palace...",
    "loading.ziwei.board": "Finding the weakened positions on your life board...",
    "loading.ziwei.fude": "Inspecting the endurance held by your Palace of Fortune and Virtue...",
    "loading.vedic.lagna": "Cross-checking your Lagna's direction against your repeating life habits...",
    "loading.vedic.nakshatra": "Reading the traces your Nakshatra left on your mind...",
    "loading.vedic.signal": "Separating familiar anxiety from the real signal...",
    "loading.astrology.orbit": "Cross-checking planetary orbits against the shaking of your emotions...",
    "loading.astrology.sun-moon": "Checking the collision point between your Sun and Moon...",
    "loading.astrology.strategy": "Organizing the psychological operation hidden among your stars...",
    "result.initial": "Good. That's the basic blueprint of your fate. But are you actually living it?",
    "reality.enter": "Looking at the operation map alone isn't enough. Now report on your actual field situation.",
    "reality.answer": "You can push back. Just be specific. An operation needs data, not excuses.",
    "result.refined": "I've factored in your answers too. Now this is a more realistic operation.",
    "badge.today": "Today's emblem isn't praise. It's proof that you can move again.",
    "closing.one": "Hmph. You're not the type to end here, though. So just do one thing right.",
    "closing.two": "Don't just get moved by this. Today's operation only means something if you actually execute one thing.",
    "closing.three": "Being a mess right now doesn't mean it's over. Just stop repeating the same choice.",
    "error.missingInput": "Not enough information. At this rate it's not an operation, just a stab in the dark.",
    "error.auth": "The lion emblem hasn't opened yet. Finish verifying your access first.",
    "error.generatingFailed": "The operation map glitched for a moment. It's not because your problem is weak — the connection shook. Try again.",
    "method.intro.front": "Which front do we look at first?",
    "method.intro.maps": "Saju, Ziwei, Vedic, Astrology.",
    "method.intro.purpose": "Different maps, same objective.",
    "method.intro.sharpKindness": "My words might sound a bit sharp. But once the direction is set, that sharpness becomes a pretty useful lantern.",
    "method.intro.side": "I won't blindly take your side. But I will point, to the very end, at the direction you can rise again from.",
    "method.intro.gaze": "I can even see the expression you're trying to hide. So drop the act, and pick the spot that's shaking right now.",
    "method.intro.promise": "It's fine. Even a messy record becomes the next path once it's on the map. I'll help trace that line with you.",
    "method.intro.table": "Here, I lead with a useful standard before a nice-sounding word.",
    "method.intro.saju": "Pick Saju and we start with season and temperament. We check which way the root of your choices leans.",
    "method.intro.ziwei": "Pick Ziwei and we look at the command line of your Life Palace. We catch where the repeating scene actually starts.",
    "method.intro.vedic": "Pick Vedic and we look at the pressure of your karma. We split familiar anxiety from the real signal.",
    "method.intro.astrology": "Pick Astrology and we look at the angle of your mind. We read where your relationships and habits of choice start shaking.",
    "method.intro.choose": "Choose. The maps differ, but the standard you need to re-grasp today converges into one.",
  },
  ja: {
    "hero.core": "慰めより診断、感情より作戦。",
    "hero.pattern": "運命が塞がれているんじゃない。お前が同じ選択の前で何度も止まっているだけだ。",
    "hero.seal": "獅子の紋章を掲げろ。今日はお前の運命への姿勢を見直す。",
    "entrance.first": "来たか。慰めを求めて来たなら道を間違えている。それでも座れ。",
    "entrance.room": "ここはお前が台無しにした選択、見て見ぬふりをしたパターン、繰り返し続けた回避を探す作戦室だ。",
    "entrance.ready": "怖がる必要はない。お前を壊そうというんじゃない。お前が自分を台無しにするやり方を壊そうとしているだけだ。",
    "method.default": "どの戦線から見る? 四柱推命、紫微斗数、ヴェーダ占星術、西洋占星術。見る地図は違っても目的は一つだ。",
    "method.saju": "四柱推命で見るというのは、お前の人生の基本戦闘スタイルを見るということだ。生まれ持った武器をちゃんと使えているか確認する。",
    "method.ziwei": "紫微斗数は人生の指揮図を広げるやり方だ。どこで詰まり、どこで力が漏れているかを見る。",
    "method.vedic": "ヴェーダ占星術は、お前が繰り返し引きずられる流れを見る。妙に同じ場面に戻るなら、ここで捕まえる。",
    "method.astrology": "占星術はお前の心の軌道と選択の癖を見る。感情だからといって、それが本当の方向とは限らない。",
    "topic.default": "今回の作戦の戦線を選べ。曖昧に全部つらいと言えば、作戦ではなく霧になる。",
    "topic.love": "恋愛戦線か。気持ちより先に見るべきは、お前が同じやり方で揺れる理由だ。",
    "topic.career": "仕事の問題か。耐えているのか、逃げているのか、まずその境界を切る。",
    "topic.money": "お金の問題を感情で見ると失敗する。まず流れ、習慣、繰り返す支出から見る。",
    "topic.relationship": "人間関係の問題か。関係を守りたいのか、認められたいのか、まずそこを切り分ける。",
    "topic.mental": "メンタルが崩れるのは恥ずかしいことじゃない。問題は崩れ方を毎回同じように繰り返すことだ。",
    "topic.direction": "方向を見失ったんじゃない。羅針盤を持ちながら、ずっと目を閉じていた可能性が高い。",
    "topic.choice": "選択を聞くのか。よし。欲しい答えと必要な答えを分けて見よう。",
    "topic.pattern": "その質問は気に入った。自分の繰り返しを見られる人間は、まだ終わっていない。",
    "birth.check": "座標が足りなければ作戦じゃなく、勘で当てずっぽうを言うだけになる。生まれの情報はできるだけ正確に入れろ。",
    "birth.unknownTime": "生まれた時間が分からなければ、一部の戦線がぼやける。それでも可能な範囲で作戦は組む。",
    "intensity.soft": "マイルドか。よし。痛く突き刺しはしない。ただし必要な言葉を省くつもりはない。",
    "intensity.standard": "標準で十分だ。少し気分を害するかもしれない。それでもそれくらいは聞かないと盤面が見えない。",
    "intensity.roar": "獅子の咆哮モード。お前が選んだんだ。お前を壊そうというんじゃない、お前の回避を壊すためだ。",
    "question.prompt": "今お前が一番聞きたくない問題を書け。そこに作戦の核心が隠れている可能性が高い。",
    "question.honest": "言い訳も書け。構わない。俺が勝手にふるいにかける。",
    "loading.map": "ネオが運命の作戦地図を広げている...",
    "loading.seal": "獅子の紋章がお前の運命の戦線を感知している...",
    "loading.pattern": "繰り返される選択を追跡している...",
    "loading.truth": "耳あたりのいい言葉と必要な言葉を分けている...",
    "loading.core": "お前が避けていた核心を探している...",
    "loading.briefing": "作戦ブリーフィングを作成している...",
    "loading.saju.pillars": "四柱推命の四つの柱を戦術地図に配置している...",
    "loading.saju.elements": "五行の偏った流れを確認している...",
    "loading.saju.ten-gods": "十星の動きから繰り返される選択を追跡している...",
    "loading.ziwei.command": "命宮と身宮の指揮系統を確認している...",
    "loading.ziwei.board": "人生盤で力が弱まった位置を探している...",
    "loading.ziwei.fude": "福徳宮の持ちこたえる力を点検している...",
    "loading.vedic.lagna": "ラグナの方向と繰り返される人生の習慣を照合している...",
    "loading.vedic.nakshatra": "ナクシャトラが残した心の痕跡を読み解いている...",
    "loading.vedic.signal": "慣れた不安と本当の信号を切り分けている...",
    "loading.astrology.orbit": "惑星の軌道とお前の感情の揺れを照合している...",
    "loading.astrology.sun-moon": "太陽と月の衝突地点を確認している...",
    "loading.astrology.strategy": "星座の裏に隠れた心理作戦を整理している...",
    "result.initial": "よし。ここまでがお前の運命の基本設計だ。だが、お前は実際そう生きているのか?",
    "reality.enter": "作戦地図を見るだけでは不十分だ。今度はお前の実際の現場を報告しろ。",
    "reality.answer": "反論してもいい。ただし具体的にやれ。作戦には言い訳より資料が必要だ。",
    "result.refined": "回答まで反映した。これでもう少し現実的な作戦になった。",
    "badge.today": "今日の紋章は褒め言葉じゃない。お前がまた動けるという証拠だ。",
    "closing.one": "ふん。それでもここで終わる人間じゃない。だから一つだけちゃんとやれ。",
    "closing.two": "感動だけするな。今日の作戦は一つでも実行してこそ意味がある。",
    "closing.three": "今めちゃくちゃなのは終わったという意味じゃない。同じ選択だけ繰り返さなければいい。",
    "error.missingInput": "情報が足りない。この程度では作戦じゃなく、勘で当てずっぽうを言うだけになる。",
    "error.auth": "獅子の紋章はまだ開いていない。まず権限確認を済ませろ。",
    "error.generatingFailed": "作戦地図が一瞬乱れた。お前の問題が弱いからじゃない、接続が揺れただけだ。もう一度試せ。",
    "method.intro.front": "どの戦線から見る?",
    "method.intro.maps": "四柱推命、紫微斗数、ヴェーダ占星術、西洋占星術。",
    "method.intro.purpose": "見る地図は違っても目的は一つだ。",
    "method.intro.sharpKindness": "俺の言葉は少し鋭く聞こえるかもしれない。それでも方向さえ定まれば、その鋭さはかなり使える灯りになる。",
    "method.intro.side": "お前の味方を無条件でするつもりはない。代わりに、お前が再び立ち上がれる方向は最後まで指し示す。",
    "method.intro.gaze": "隠そうとする表情まで全部見えている。だから無理にかっこつけず、今揺れている場所から選べ。",
    "method.intro.promise": "大丈夫だ。乱れた記録も地図に乗せれば次の道になる。俺がその線を一緒になぞってやる。",
    "method.intro.table": "ここでは耳あたりのいい言葉より、使える基準を先に出す。",
    "method.intro.saju": "四柱推命を選べば季節と気質から見る。お前の選択の根がどちらに傾いているか確認する。",
    "method.intro.ziwei": "紫微斗数を選べば命宮の指揮線を見る。繰り返される場面がどこから始まるかを掴む。",
    "method.intro.vedic": "ヴェーダ占星術を選べばカルマの圧力を見る。慣れた不安と本当の信号を分ける。",
    "method.intro.astrology": "占星術を選べば心の角度を見る。関係と選択の癖がどこで揺れるかを読む。",
    "method.intro.choose": "選べ。地図は違うが、今日また掴み直すべき基準は一つに集まる。",
  },
  "zh-CN": {
    "hero.core": "诊断优先于安慰，作战优先于情绪。",
    "hero.pattern": "不是命运被堵住了。是你一直在同一个选择面前停下脚步。",
    "hero.seal": "举起狮徽。今天重新审视你面对命运的姿态。",
    "entrance.first": "来了。要是来求安慰，那你走错地方了。不过还是坐下吧。",
    "entrance.room": "这里是作战室，专门找出你搞砸的选择、装作没看见的模式，以及你反复逃避的东西。",
    "entrance.ready": "不必害怕。我不是要摧毁你，而是要摧毁你不断毁掉自己的那种方式。",
    "method.default": "先看哪条战线？四柱、紫微、吠陀占星、西洋占星。看的地图不同，目的只有一个。",
    "method.saju": "用四柱来看，就是在看你人生的基本作战方式。要确认你是否真的用好了与生俱来的武器。",
    "method.ziwei": "紫微斗数是展开人生指挥图的方式。看看你在哪里卡住，力量又从哪里流失。",
    "method.vedic": "吠陀占星看的是你反复被拖入的那股潮流。要是你莫名其妙一直回到同一个场景，这里就能抓到根源。",
    "method.astrology": "占星术看的是你内心的轨道和选择的习惯。不是所有情绪都指向真正的方向。",
    "topic.default": "选出这次作战的战线。要是含糊地说什么都很痛苦，那就不是作战，而是一团迷雾。",
    "topic.love": "恋爱战线啊。比起心情，更该先看的是你为什么总以同样的方式动摇。",
    "topic.career": "工作问题啊。先划清你是在硬撑，还是在逃跑。",
    "topic.money": "用情绪看钱的问题只会搞砸。先看资金流向、习惯，还有反复出现的支出。",
    "topic.relationship": "人际关系问题啊。先分清楚，你是想维系这段关系，还是想被认可。",
    "topic.mental": "心态崩溃并不丢人。问题是你每次崩溃的方式都一模一样。",
    "topic.direction": "不是失去了方向。很可能是你一直握着指南针，却始终闭着眼睛。",
    "topic.choice": "在问选择吗？好。把你想要的答案和需要的答案分开来看。",
    "topic.pattern": "这个问题我喜欢。能看清自己反复模式的人，还没到尽头。",
    "birth.check": "坐标不够，这就不是作战，而是瞎猜乱蒙。出生信息尽可能填准确。",
    "birth.unknownTime": "不知道出生时间，部分战线就会模糊。不过还是会在可能范围内制定作战计划。",
    "intensity.soft": "选温和模式啊。好。我不会刺得太痛，但该说的话一句也不会省。",
    "intensity.standard": "标准模式就够了。心情可能会受点影响，但至少要听到这个程度，才能看清局面。",
    "intensity.roar": "狮吼模式。是你自己选的。我不是要摧毁你，而是要摧毁你的逃避。",
    "question.prompt": "写下你现在最不想听到的问题。作战的核心很可能就藏在那里。",
    "question.honest": "把借口也写下来。没关系，我自己会筛掉。",
    "loading.map": "尼奥正在展开命运的作战地图...",
    "loading.seal": "狮徽正在侦测你命运的战线...",
    "loading.pattern": "正在追踪反复出现的选择...",
    "loading.truth": "正在把好听的话和该听的话分开...",
    "loading.core": "正在找出你一直在逃避的核心...",
    "loading.briefing": "正在撰写作战简报...",
    "loading.saju.pillars": "正在把四柱的四根支柱部署到战术地图上...",
    "loading.saju.elements": "正在确认五行倾斜的流向...",
    "loading.saju.ten-gods": "正在从十神的动向中追踪反复出现的选择...",
    "loading.ziwei.command": "正在确认命宫与身宫的指挥体系...",
    "loading.ziwei.board": "正在人生盘中寻找力量减弱的位置...",
    "loading.ziwei.fude": "正在检查福德宫的支撑力...",
    "loading.vedic.lagna": "正在比对上升点的方向与反复出现的生活习惯...",
    "loading.vedic.nakshatra": "正在解读纳沙特拉留下的心灵痕迹...",
    "loading.vedic.signal": "正在把熟悉的不安和真正的信号区分开来...",
    "loading.astrology.orbit": "正在比对行星轨道与你情绪的波动...",
    "loading.astrology.sun-moon": "正在确认太阳与月亮的冲突点...",
    "loading.astrology.strategy": "正在整理星座背后隐藏的心理战术...",
    "result.initial": "好。到这里是你命运的基本设计图。可你，真的照这样活着吗？",
    "reality.enter": "只看作战地图还不够。现在报告你的实际现场情况。",
    "reality.answer": "你可以反驳，但要具体。作战需要的是资料，不是借口。",
    "result.refined": "连你的回答都反映进去了。现在算是更现实的作战了。",
    "badge.today": "今天的徽章不是夸奖，是你能再次行动起来的证据。",
    "closing.one": "哼。不过你不是会在这里就结束的人。所以，把一件事做好就行。",
    "closing.two": "别光被感动。今天的作战只有真正执行一件事才有意义。",
    "closing.three": "现在一团糟，不代表就此结束。只要不再重复同样的选择就行。",
    "error.missingInput": "信息不够。这种程度不是作战，只是瞎猜乱蒙。",
    "error.auth": "狮徽还没打开。先完成权限确认。",
    "error.generatingFailed": "作战地图暂时出现了紊乱。不是你的问题不够重要，是连线不稳。请再试一次。",
    "method.intro.front": "先看哪条战线？",
    "method.intro.maps": "四柱、紫微、吠陀占星、西洋占星。",
    "method.intro.purpose": "看的地图不同，目的只有一个。",
    "method.intro.sharpKindness": "我的话可能听起来有点尖锐。但只要方向定下来，那份尖锐就会变成相当好用的一盏灯。",
    "method.intro.side": "我不会毫无理由地站在你这边。但我会一直指出你能重新站起来的方向。",
    "method.intro.gaze": "连你想藏起来的表情我都看得一清二楚。所以别硬装酷，先从你现在动摇的地方选起。",
    "method.intro.promise": "没关系。就算是杂乱的记录，放上地图也会变成下一条路。我会陪你一起描出那条线。",
    "method.intro.table": "在这里，比起好听的话，我会先拿出有用的标准。",
    "method.intro.saju": "选四柱的话，先看季节与气质。确认你选择的根基偏向哪一边。",
    "method.intro.ziwei": "选紫微的话，看命宫的指挥线。抓出反复出现的场景究竟从哪里开始。",
    "method.intro.vedic": "选吠陀占星的话，看业力的压力。把熟悉的不安和真正的信号分开。",
    "method.intro.astrology": "选占星术的话，看内心的角度。解读关系与选择习惯在哪里开始动摇。",
    "method.intro.choose": "选吧。地图虽然不同，但今天你需要重新抓住的标准，最终会汇聚成一个。",
  },
  "zh-TW": {
    "hero.core": "診斷優先於安慰，作戰優先於情緒。",
    "hero.pattern": "不是命運被堵住了。是你一直在同一個選擇面前停下腳步。",
    "hero.seal": "舉起獅徽。今天重新審視你面對命運的姿態。",
    "entrance.first": "來了。要是來求安慰，那你走錯地方了。不過還是坐下吧。",
    "entrance.room": "這裡是作戰室，專門找出你搞砸的選擇、裝作沒看見的模式，以及你反覆逃避的東西。",
    "entrance.ready": "不必害怕。我不是要摧毀你，而是要摧毀你不斷毀掉自己的那種方式。",
    "method.default": "先看哪條戰線？四柱、紫微、吠陀占星、西洋占星。看的地圖不同，目的只有一個。",
    "method.saju": "用四柱來看，就是在看你人生的基本作戰方式。要確認你是否真的用好了與生俱來的武器。",
    "method.ziwei": "紫微斗數是展開人生指揮圖的方式。看看你在哪裡卡住，力量又從哪裡流失。",
    "method.vedic": "吠陀占星看的是你反覆被拖入的那股潮流。要是你莫名其妙一直回到同一個場景，這裡就能抓到根源。",
    "method.astrology": "占星術看的是你內心的軌道和選擇的習慣。不是所有情緒都指向真正的方向。",
    "topic.default": "選出這次作戰的戰線。要是含糊地說什麼都很痛苦，那就不是作戰，而是一團迷霧。",
    "topic.love": "戀愛戰線啊。比起心情，更該先看的是你為什麼總以同樣的方式動搖。",
    "topic.career": "工作問題啊。先劃清你是在硬撐，還是在逃跑。",
    "topic.money": "用情緒看錢的問題只會搞砸。先看資金流向、習慣，還有反覆出現的支出。",
    "topic.relationship": "人際關係問題啊。先分清楚，你是想維繫這段關係，還是想被認可。",
    "topic.mental": "心態崩潰並不丟人。問題是你每次崩潰的方式都一模一樣。",
    "topic.direction": "不是失去了方向。很可能是你一直握著指南針，卻始終閉著眼睛。",
    "topic.choice": "在問選擇嗎？好。把你想要的答案和需要的答案分開來看。",
    "topic.pattern": "這個問題我喜歡。能看清自己反覆模式的人，還沒到盡頭。",
    "birth.check": "座標不夠，這就不是作戰，而是瞎猜亂矇。出生資訊盡可能填準確。",
    "birth.unknownTime": "不知道出生時間，部分戰線就會模糊。不過還是會在可能範圍內制定作戰計畫。",
    "intensity.soft": "選溫和模式啊。好。我不會刺得太痛，但該說的話一句也不會省。",
    "intensity.standard": "標準模式就夠了。心情可能會受點影響，但至少要聽到這個程度，才能看清局面。",
    "intensity.roar": "獅吼模式。是你自己選的。我不是要摧毀你，而是要摧毀你的逃避。",
    "question.prompt": "寫下你現在最不想聽到的問題。作戰的核心很可能就藏在那裡。",
    "question.honest": "把藉口也寫下來。沒關係，我自己會篩掉。",
    "loading.map": "尼歐正在展開命運的作戰地圖...",
    "loading.seal": "獅徽正在偵測你命運的戰線...",
    "loading.pattern": "正在追蹤反覆出現的選擇...",
    "loading.truth": "正在把好聽的話和該聽的話分開...",
    "loading.core": "正在找出你一直在逃避的核心...",
    "loading.briefing": "正在撰寫作戰簡報...",
    "loading.saju.pillars": "正在把四柱的四根支柱部署到戰術地圖上...",
    "loading.saju.elements": "正在確認五行傾斜的流向...",
    "loading.saju.ten-gods": "正在從十神的動向中追蹤反覆出現的選擇...",
    "loading.ziwei.command": "正在確認命宮與身宮的指揮體系...",
    "loading.ziwei.board": "正在人生盤中尋找力量減弱的位置...",
    "loading.ziwei.fude": "正在檢查福德宮的支撐力...",
    "loading.vedic.lagna": "正在比對上升點的方向與反覆出現的生活習慣...",
    "loading.vedic.nakshatra": "正在解讀納沙特拉留下的心靈痕跡...",
    "loading.vedic.signal": "正在把熟悉的不安和真正的信號區分開來...",
    "loading.astrology.orbit": "正在比對行星軌道與你情緒的波動...",
    "loading.astrology.sun-moon": "正在確認太陽與月亮的衝突點...",
    "loading.astrology.strategy": "正在整理星座背後隱藏的心理戰術...",
    "result.initial": "好。到這裡是你命運的基本設計圖。可你，真的照這樣活著嗎？",
    "reality.enter": "只看作戰地圖還不夠。現在報告你的實際現場情況。",
    "reality.answer": "你可以反駁，但要具體。作戰需要的是資料，不是藉口。",
    "result.refined": "連你的回答都反映進去了。現在算是更現實的作戰了。",
    "badge.today": "今天的徽章不是誇獎，是你能再次行動起來的證據。",
    "closing.one": "哼。不過你不是會在這裡就結束的人。所以，把一件事做好就行。",
    "closing.two": "別光被感動。今天的作戰只有真正執行一件事才有意義。",
    "closing.three": "現在一團糟，不代表就此結束。只要不再重複同樣的選擇就行。",
    "error.missingInput": "資訊不夠。這種程度不是作戰，只是瞎猜亂矇。",
    "error.auth": "獅徽還沒打開。先完成權限確認。",
    "error.generatingFailed": "作戰地圖暫時出現了紊亂。不是你的問題不夠重要，是連線不穩。請再試一次。",
    "method.intro.front": "先看哪條戰線？",
    "method.intro.maps": "四柱、紫微、吠陀占星、西洋占星。",
    "method.intro.purpose": "看的地圖不同，目的只有一個。",
    "method.intro.sharpKindness": "我的話可能聽起來有點尖銳。但只要方向定下來，那份尖銳就會變成相當好用的一盞燈。",
    "method.intro.side": "我不會毫無理由地站在你這邊。但我會一直指出你能重新站起來的方向。",
    "method.intro.gaze": "連你想藏起來的表情我都看得一清二楚。所以別硬裝酷，先從你現在動搖的地方選起。",
    "method.intro.promise": "沒關係。就算是雜亂的記錄，放上地圖也會變成下一條路。我會陪你一起描出那條線。",
    "method.intro.table": "在這裡，比起好聽的話，我會先拿出有用的標準。",
    "method.intro.saju": "選四柱的話，先看季節與氣質。確認你選擇的根基偏向哪一邊。",
    "method.intro.ziwei": "選紫微的話，看命宮的指揮線。抓出反覆出現的場景究竟從哪裡開始。",
    "method.intro.vedic": "選吠陀占星的話，看業力的壓力。把熟悉的不安和真正的信號分開。",
    "method.intro.astrology": "選占星術的話，看內心的角度。解讀關係與選擇習慣在哪裡開始動搖。",
    "method.intro.choose": "選吧。地圖雖然不同，但今天你需要重新抓住的標準，最終會匯聚成一個。",
  },
};

export function localizeNeoDialogue(entry: NeoOperationDialogue, locale: LoadingLocale): NeoOperationDialogue {
  if (locale === "ko") return entry;
  // 표에 없는 로케일(vi/hi/es/fr/de/nl/ms 등)은 ko 로 조용히 새지 않고 en 으로 대신한다.
  const translated = NEO_DIALOGUE_TEXT[locale as Exclude<LoadingLocale, "ko">]?.[entry.key] ?? NEO_DIALOGUE_TEXT.en?.[entry.key];
  return translated ? { ...entry, text: translated } : entry;
}

export function pickNeoDialogue(dialogues: readonly NeoOperationDialogue[] | undefined, seed = 0, locale: LoadingLocale = "ko") {
  const entry = !dialogues?.length ? neoOperationDialogues.entrance[0] : dialogues[Math.abs(seed) % dialogues.length];
  return localizeNeoDialogue(entry, locale);
}

export function getNeoMethodDialogue(method: NeoWarRoomConsultMode | "", seed = 0, locale: LoadingLocale = "ko") {
  if (!method) return localizeNeoDialogue(neoOperationDialogues.methodSelect.default[0], locale);
  return pickNeoDialogue(neoOperationDialogues.methodSelect[method], seed, locale);
}

export function getNeoTopicDialogue(topic: string, seed = 0, locale: LoadingLocale = "ko") {
  return pickNeoDialogue(neoOperationDialogues.topicSelect[topic] || neoOperationDialogues.topicSelect.default, seed, locale);
}

export function getNeoIntensityDialogue(intensity: NeoWarRoomIntensityId | "", seed = 0, locale: LoadingLocale = "ko") {
  return intensity
    ? pickNeoDialogue(neoOperationDialogues.intensitySelect[intensity], seed, locale)
    : localizeNeoDialogue(neoOperationDialogues.intensitySelect.standard[0], locale);
}

export function getNeoLoadingDialogue(method: NeoWarRoomConsultMode | "", stageIndex: number, locale: LoadingLocale = "ko") {
  const methodDialogues = method ? neoOperationDialogues.loading[method] : undefined;
  return pickNeoDialogue([...(methodDialogues || []), ...neoOperationDialogues.loading.default], stageIndex, locale);
}
