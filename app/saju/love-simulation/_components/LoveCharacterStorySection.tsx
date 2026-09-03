"use client";

import React, { useMemo, useState } from "react";
import type { LoveCharacter } from "../_data/loveCodeMvp";
import { getLoveCharacterStory } from "../_data/loveCharacterStories";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface LoveCharacterStoryCopy {
  characterStoryBadge: string;
  loveMissionBadge: string;
  tabsAriaLabel: string;
  tabNovel: string;
  tabLove: string;
  tabRoutes: string;
  tabMission: string;
  summary: string;
  worldRole: string;
  firstScene: string;
  appearance: string;
  speechSample: string;
  loveStart: string;
  crushBehavior: string;
  attractionPoint: string;
  weakness: string;
  hiddenLack: string;
  distancePattern: string;
  confessionRoute: string;
  earlyLoveRoute: string;
  longTermRoute: string;
  conflictEvent: string;
  reconciliationEvent: string;
  happyEndingRoute: string;
  badEndingRoute: string;
  growthEndingRoute: string;
  userMessage: string;
  todayMission: string;
}

const LOVE_CHARACTER_STORY_EN: LoveCharacterStoryCopy = {
  characterStoryBadge: "Character Story",
  loveMissionBadge: "Love Mission",
  tabsAriaLabel: "Character story tabs",
  tabNovel: "World",
  tabLove: "Love style",
  tabRoutes: "Ending routes",
  tabMission: "Mission",
  summary: "One-line character intro",
  worldRole: "Position in the world",
  firstScene: "First appearance scene",
  appearance: "Look and mood",
  speechSample: "Tone and sample lines",
  loveStart: "How they start falling in love",
  crushBehavior: "Behavior around someone they like",
  attractionPoint: "What draws them to a partner",
  weakness: "Recurring weakness in love",
  hiddenLack: "Hidden emotional need",
  distancePattern: "Jealousy / anxiety / distancing pattern",
  confessionRoute: "Confession route",
  earlyLoveRoute: "Early relationship route",
  longTermRoute: "Long-term relationship route",
  conflictEvent: "Conflict event",
  reconciliationEvent: "Reconciliation event",
  happyEndingRoute: "Happy ending route",
  badEndingRoute: "Bad ending route",
  growthEndingRoute: "Growth ending route",
  userMessage: "Character's message to you",
  todayMission: "Today's love mission",
};

const LOVE_CHARACTER_STORY_COPY: Partial<Record<LoadingLocale, LoveCharacterStoryCopy>> = {
  ko: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "캐릭터 스토리 탭",
    tabNovel: "세계관",
    tabLove: "연애 성향",
    tabRoutes: "엔딩 루트",
    tabMission: "미션",
    summary: "캐릭터 한 줄 소개",
    worldRole: "세계관 속 포지션",
    firstScene: "첫 등장 장면",
    appearance: "외형과 분위기",
    speechSample: "말투와 대사 샘플",
    loveStart: "사랑을 시작하는 방식",
    crushBehavior: "좋아하는 사람 앞에서 보이는 행동",
    attractionPoint: "상대에게 끌리는 포인트",
    weakness: "연애에서 반복되는 약점",
    hiddenLack: "숨겨진 결핍",
    distancePattern: "질투/불안/거리두기 패턴",
    confessionRoute: "고백 루트",
    earlyLoveRoute: "연애 초반 루트",
    longTermRoute: "장기 연애 루트",
    conflictEvent: "갈등 이벤트",
    reconciliationEvent: "화해 이벤트",
    happyEndingRoute: "해피엔딩 루트",
    badEndingRoute: "배드엔딩 루트",
    growthEndingRoute: "성장 엔딩 루트",
    userMessage: "사용자를 향한 캐릭터 메시지",
    todayMission: "오늘의 러브 미션",
  },
  ja: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "キャラクターストーリータブ",
    tabNovel: "世界観",
    tabLove: "恋愛傾向",
    tabRoutes: "エンディングルート",
    tabMission: "ミッション",
    summary: "キャラクター一言紹介",
    worldRole: "世界観の中の立ち位置",
    firstScene: "初登場シーン",
    appearance: "外見と雰囲気",
    speechSample: "口調とセリフサンプル",
    loveStart: "恋の始まり方",
    crushBehavior: "好きな人の前で見せる行動",
    attractionPoint: "相手に惹かれるポイント",
    weakness: "恋愛で繰り返す弱点",
    hiddenLack: "隠れた欠乏感",
    distancePattern: "嫉妬・不安・距離を置くパターン",
    confessionRoute: "告白ルート",
    earlyLoveRoute: "交際初期ルート",
    longTermRoute: "長期交際ルート",
    conflictEvent: "対立イベント",
    reconciliationEvent: "仲直りイベント",
    happyEndingRoute: "ハッピーエンドルート",
    badEndingRoute: "バッドエンドルート",
    growthEndingRoute: "成長エンドルート",
    userMessage: "あなたへのキャラクターメッセージ",
    todayMission: "今日のラブミッション",
  },
  "zh-CN": {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "角色故事标签",
    tabNovel: "世界观",
    tabLove: "恋爱倾向",
    tabRoutes: "结局路线",
    tabMission: "任务",
    summary: "角色一句话简介",
    worldRole: "世界观中的定位",
    firstScene: "初次登场场景",
    appearance: "外貌与氛围",
    speechSample: "语气与台词范例",
    loveStart: "开始恋爱的方式",
    crushBehavior: "在喜欢的人面前的行为",
    attractionPoint: "吸引对方的地方",
    weakness: "恋爱中反复出现的弱点",
    hiddenLack: "隐藏的匮乏感",
    distancePattern: "嫉妒/不安/疏远的模式",
    confessionRoute: "告白路线",
    earlyLoveRoute: "恋爱初期路线",
    longTermRoute: "长期恋爱路线",
    conflictEvent: "冲突事件",
    reconciliationEvent: "和解事件",
    happyEndingRoute: "幸福结局路线",
    badEndingRoute: "悲伤结局路线",
    growthEndingRoute: "成长结局路线",
    userMessage: "角色给你的留言",
    todayMission: "今日恋爱任务",
  },
  "zh-TW": {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "角色故事標籤",
    tabNovel: "世界觀",
    tabLove: "戀愛傾向",
    tabRoutes: "結局路線",
    tabMission: "任務",
    summary: "角色一句話簡介",
    worldRole: "世界觀中的定位",
    firstScene: "初次登場場景",
    appearance: "外貌與氛圍",
    speechSample: "語氣與台詞範例",
    loveStart: "開始戀愛的方式",
    crushBehavior: "在喜歡的人面前的行為",
    attractionPoint: "吸引對方的地方",
    weakness: "戀愛中反覆出現的弱點",
    hiddenLack: "隱藏的匱乏感",
    distancePattern: "嫉妒/不安/疏遠的模式",
    confessionRoute: "告白路線",
    earlyLoveRoute: "戀愛初期路線",
    longTermRoute: "長期戀愛路線",
    conflictEvent: "衝突事件",
    reconciliationEvent: "和解事件",
    happyEndingRoute: "幸福結局路線",
    badEndingRoute: "悲傷結局路線",
    growthEndingRoute: "成長結局路線",
    userMessage: "角色給你的留言",
    todayMission: "今日戀愛任務",
  },
  vi: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "Tab câu chuyện nhân vật",
    tabNovel: "Thế giới quan",
    tabLove: "Phong cách yêu",
    tabRoutes: "Tuyến kết thúc",
    tabMission: "Nhiệm vụ",
    summary: "Giới thiệu nhân vật trong một câu",
    worldRole: "Vị trí trong thế giới quan",
    firstScene: "Cảnh xuất hiện đầu tiên",
    appearance: "Ngoại hình và không khí",
    speechSample: "Giọng điệu và câu thoại mẫu",
    loveStart: "Cách bắt đầu yêu",
    crushBehavior: "Hành động trước người mình thích",
    attractionPoint: "Điểm thu hút đối phương",
    weakness: "Điểm yếu lặp lại trong tình yêu",
    hiddenLack: "Sự thiếu thốn ẩn giấu",
    distancePattern: "Kiểu ghen tuông/lo âu/giữ khoảng cách",
    confessionRoute: "Tuyến tỏ tình",
    earlyLoveRoute: "Tuyến yêu đương giai đoạn đầu",
    longTermRoute: "Tuyến yêu đương lâu dài",
    conflictEvent: "Sự kiện xung đột",
    reconciliationEvent: "Sự kiện làm hòa",
    happyEndingRoute: "Tuyến kết thúc có hậu",
    badEndingRoute: "Tuyến kết thúc buồn",
    growthEndingRoute: "Tuyến kết thúc trưởng thành",
    userMessage: "Lời nhắn của nhân vật gửi đến bạn",
    todayMission: "Nhiệm vụ tình yêu hôm nay",
  },
  hi: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "चरित्र कहानी टैब",
    tabNovel: "विश्व दृष्टिकोण",
    tabLove: "प्रेम स्वभाव",
    tabRoutes: "अंत मार्ग",
    tabMission: "मिशन",
    summary: "चरित्र का एक-पंक्ति परिचय",
    worldRole: "विश्व में स्थिति",
    firstScene: "पहली उपस्थिति दृश्य",
    appearance: "रूप और माहौल",
    speechSample: "बोलने का ढंग और संवाद नमूने",
    loveStart: "प्रेम शुरू करने का तरीका",
    crushBehavior: "पसंदीदा व्यक्ति के सामने व्यवहार",
    attractionPoint: "साथी की ओर आकर्षण का बिंदु",
    weakness: "प्रेम में दोहराई जाने वाली कमजोरी",
    hiddenLack: "छिपी हुई कमी",
    distancePattern: "ईर्ष्या/चिंता/दूरी बनाने का पैटर्न",
    confessionRoute: "इज़हार मार्ग",
    earlyLoveRoute: "शुरुआती संबंध मार्ग",
    longTermRoute: "दीर्घकालिक संबंध मार्ग",
    conflictEvent: "संघर्ष घटना",
    reconciliationEvent: "सुलह घटना",
    happyEndingRoute: "सुखद अंत मार्ग",
    badEndingRoute: "दुखद अंत मार्ग",
    growthEndingRoute: "विकास अंत मार्ग",
    userMessage: "आपके लिए चरित्र का संदेश",
    todayMission: "आज का प्रेम मिशन",
  },
  es: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "Pestañas de la historia del personaje",
    tabNovel: "Mundo",
    tabLove: "Estilo amoroso",
    tabRoutes: "Rutas de final",
    tabMission: "Misión",
    summary: "Presentación del personaje en una línea",
    worldRole: "Posición en el mundo",
    firstScene: "Primera escena de aparición",
    appearance: "Apariencia y ambiente",
    speechSample: "Tono y ejemplos de diálogo",
    loveStart: "Cómo empieza a enamorarse",
    crushBehavior: "Comportamiento frente a alguien que le gusta",
    attractionPoint: "Qué le atrae de una pareja",
    weakness: "Debilidad recurrente en el amor",
    hiddenLack: "Necesidad emocional oculta",
    distancePattern: "Patrón de celos/ansiedad/distanciamiento",
    confessionRoute: "Ruta de confesión",
    earlyLoveRoute: "Ruta de relación temprana",
    longTermRoute: "Ruta de relación a largo plazo",
    conflictEvent: "Evento de conflicto",
    reconciliationEvent: "Evento de reconciliación",
    happyEndingRoute: "Ruta de final feliz",
    badEndingRoute: "Ruta de final triste",
    growthEndingRoute: "Ruta de final de crecimiento",
    userMessage: "Mensaje del personaje para ti",
    todayMission: "Misión de amor de hoy",
  },
  fr: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "Onglets de l'histoire du personnage",
    tabNovel: "Univers",
    tabLove: "Style amoureux",
    tabRoutes: "Routes de fin",
    tabMission: "Mission",
    summary: "Présentation du personnage en une phrase",
    worldRole: "Position dans l'univers",
    firstScene: "Première scène d'apparition",
    appearance: "Apparence et ambiance",
    speechSample: "Ton et exemples de répliques",
    loveStart: "Comment il/elle commence à tomber amoureux(se)",
    crushBehavior: "Comportement devant quelqu'un qui lui plaît",
    attractionPoint: "Ce qui l'attire chez un partenaire",
    weakness: "Faiblesse récurrente en amour",
    hiddenLack: "Besoin émotionnel caché",
    distancePattern: "Schéma de jalousie/anxiété/mise à distance",
    confessionRoute: "Route de la confession",
    earlyLoveRoute: "Route de la relation naissante",
    longTermRoute: "Route de la relation à long terme",
    conflictEvent: "Événement de conflit",
    reconciliationEvent: "Événement de réconciliation",
    happyEndingRoute: "Route de la fin heureuse",
    badEndingRoute: "Route de la fin triste",
    growthEndingRoute: "Route de la fin de croissance",
    userMessage: "Message du personnage pour vous",
    todayMission: "Mission d'amour du jour",
  },
  de: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "Charaktergeschichte-Tabs",
    tabNovel: "Welt",
    tabLove: "Liebesstil",
    tabRoutes: "Enden-Routen",
    tabMission: "Mission",
    summary: "Ein-Satz-Vorstellung des Charakters",
    worldRole: "Position in der Welt",
    firstScene: "Erste Auftrittsszene",
    appearance: "Aussehen und Stimmung",
    speechSample: "Tonfall und Beispieldialoge",
    loveStart: "Wie er/sie sich zu verlieben beginnt",
    crushBehavior: "Verhalten vor jemandem, den er/sie mag",
    attractionPoint: "Was ihn/sie an einem Partner anzieht",
    weakness: "Wiederkehrende Schwäche in der Liebe",
    hiddenLack: "Verborgenes emotionales Bedürfnis",
    distancePattern: "Muster aus Eifersucht/Angst/Distanzierung",
    confessionRoute: "Geständnis-Route",
    earlyLoveRoute: "Route der frühen Beziehung",
    longTermRoute: "Route der langfristigen Beziehung",
    conflictEvent: "Konfliktereignis",
    reconciliationEvent: "Versöhnungsereignis",
    happyEndingRoute: "Route des glücklichen Endes",
    badEndingRoute: "Route des traurigen Endes",
    growthEndingRoute: "Route des Wachstumsendes",
    userMessage: "Nachricht des Charakters an dich",
    todayMission: "Heutige Liebesmission",
  },
  nl: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "Personageverhaal-tabs",
    tabNovel: "Wereld",
    tabLove: "Liefdesstijl",
    tabRoutes: "Einde-routes",
    tabMission: "Missie",
    summary: "Introductie van het personage in één zin",
    worldRole: "Positie in de wereld",
    firstScene: "Eerste verschijningsscène",
    appearance: "Uiterlijk en sfeer",
    speechSample: "Toon en voorbeeldzinnen",
    loveStart: "Hoe hij/zij verliefd begint te worden",
    crushBehavior: "Gedrag tegenover iemand die hij/zij leuk vindt",
    attractionPoint: "Wat hem/haar aantrekt in een partner",
    weakness: "Terugkerende zwakte in de liefde",
    hiddenLack: "Verborgen emotionele behoefte",
    distancePattern: "Patroon van jaloezie/angst/afstand nemen",
    confessionRoute: "Bekentenisroute",
    earlyLoveRoute: "Route van vroege relatie",
    longTermRoute: "Route van langdurige relatie",
    conflictEvent: "Conflictgebeurtenis",
    reconciliationEvent: "Verzoeningsgebeurtenis",
    happyEndingRoute: "Route van gelukkig einde",
    badEndingRoute: "Route van triest einde",
    growthEndingRoute: "Route van groei-einde",
    userMessage: "Bericht van het personage aan jou",
    todayMission: "Liefdesmissie van vandaag",
  },
  ms: {
    characterStoryBadge: "Character Story",
    loveMissionBadge: "Love Mission",
    tabsAriaLabel: "Tab cerita watak",
    tabNovel: "Dunia",
    tabLove: "Gaya cinta",
    tabRoutes: "Laluan pengakhiran",
    tabMission: "Misi",
    summary: "Pengenalan watak satu ayat",
    worldRole: "Kedudukan dalam dunia",
    firstScene: "Adegan kemunculan pertama",
    appearance: "Rupa dan suasana",
    speechSample: "Nada dan contoh dialog",
    loveStart: "Cara dia mula jatuh cinta",
    crushBehavior: "Tingkah laku di hadapan orang yang disukai",
    attractionPoint: "Perkara yang menarik minat pasangan",
    weakness: "Kelemahan berulang dalam percintaan",
    hiddenLack: "Keperluan emosi tersembunyi",
    distancePattern: "Corak cemburu/kebimbangan/menjauhkan diri",
    confessionRoute: "Laluan pengakuan",
    earlyLoveRoute: "Laluan hubungan peringkat awal",
    longTermRoute: "Laluan hubungan jangka panjang",
    conflictEvent: "Peristiwa konflik",
    reconciliationEvent: "Peristiwa berbaik semula",
    happyEndingRoute: "Laluan pengakhiran gembira",
    badEndingRoute: "Laluan pengakhiran sedih",
    growthEndingRoute: "Laluan pengakhiran pertumbuhan",
    userMessage: "Mesej watak untuk anda",
    todayMission: "Misi cinta hari ini",
  },
};

function getLoveCharacterStoryCopy(locale: LoadingLocale): LoveCharacterStoryCopy {
  return LOVE_CHARACTER_STORY_COPY[locale] || LOVE_CHARACTER_STORY_EN;
}

function useLoveCharacterStoryCopy(): LoveCharacterStoryCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  React.useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getLoveCharacterStoryCopy(locale);
}

type StoryTab = "novel" | "love" | "routes" | "mission";

type StoryPanel = {
  title: string;
  body: string;
};

function StoryAccordion({ panels }: { panels: StoryPanel[] }) {
  return (
    <div className="grid gap-3">
      {panels.map((panel, index) => (
        <details key={panel.title} className="group rounded-2xl border border-white/10 bg-black/22 p-4 backdrop-blur-sm" open={index === 0}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-black text-white">
            <span>{panel.title}</span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-lg leading-none text-white/70 transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm font-medium leading-7 text-white/72">{panel.body}</p>
        </details>
      ))}
    </div>
  );
}

export default function LoveCharacterStorySection({ character }: { character: LoveCharacter }) {
  const copy = useLoveCharacterStoryCopy();
  const [activeTab, setActiveTab] = useState<StoryTab>("novel");
  const story = useMemo(() => getLoveCharacterStory(character.id), [character.id]);

  const storyTabs: Array<{ id: StoryTab; label: string }> = [
    { id: "novel", label: copy.tabNovel },
    { id: "love", label: copy.tabLove },
    { id: "routes", label: copy.tabRoutes },
    { id: "mission", label: copy.tabMission },
  ];

  const panelsByTab: Record<StoryTab, StoryPanel[]> = {
    novel: [
      { title: copy.summary, body: story.summary },
      { title: copy.worldRole, body: story.worldRole },
      { title: copy.firstScene, body: story.firstScene },
      { title: copy.appearance, body: story.appearance },
      { title: copy.speechSample, body: `${story.speech.tone} ${story.speech.samples.join(" ")}` },
    ],
    love: [
      { title: copy.loveStart, body: story.loveStyle.start },
      { title: copy.crushBehavior, body: story.loveStyle.crushBehavior },
      { title: copy.attractionPoint, body: story.loveStyle.attractionPoint },
      { title: copy.weakness, body: story.loveStyle.weakness },
      { title: copy.hiddenLack, body: story.loveStyle.hiddenLack },
      { title: copy.distancePattern, body: story.loveStyle.distancePattern },
    ],
    routes: [
      { title: copy.confessionRoute, body: story.routes.confession },
      { title: copy.earlyLoveRoute, body: story.routes.earlyLove },
      { title: copy.longTermRoute, body: story.routes.longTerm },
      { title: copy.conflictEvent, body: story.routes.conflict },
      { title: copy.reconciliationEvent, body: story.routes.reconciliation },
      { title: copy.happyEndingRoute, body: story.routes.happyEnding },
      { title: copy.badEndingRoute, body: story.routes.badEnding },
      { title: copy.growthEndingRoute, body: story.routes.growthEnding },
    ],
    mission: [
      { title: copy.userMessage, body: story.userMessage },
      { title: copy.todayMission, body: story.mission },
    ],
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-pink-100/18 bg-[radial-gradient(circle_at_top_left,rgba(251,207,232,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(0,0,0,0.24))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${character.palette.accent}`}>{copy.characterStoryBadge}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{story.alias}</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/72">{story.summary}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left sm:max-w-[220px]">
          <p className="text-xs font-black text-white/42">{copy.loveMissionBadge}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-rose-50/82">{story.mission}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${character.name} ${copy.tabsAriaLabel}`}>
        {storyTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                isActive ? `border-transparent bg-gradient-to-r text-zinc-950 shadow-lg ${character.palette.button}` : "border-white/10 bg-white/8 text-white/66 hover:bg-white/14"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4" role="tabpanel">
        <StoryAccordion panels={panelsByTab[activeTab]} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {story.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-white/62">
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}
