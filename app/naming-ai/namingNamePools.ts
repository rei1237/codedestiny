// 무료 초안 추천의 로케일별 이름 풀.
//
// 배경: 무료 초안은 한글 음절 풀에서 이름을 **조합**해 왔다(namingRecommendations.ts 의
// splitHangulSyllables / 초성 소리오행). 유료 작명첩이 로케일별 작명 전통으로 갈라진 뒤에도
// (worker/lib/naming-locale-profile.js) 일본어·중국어·영어 사용자는 결제 직전 화면에서
// 한국 이름 후보를 보고 있었다. 지금까지는 고지 문구로만 막아 뒀다.
//
// 🔴 **조합형으로 확장하지 않는다.** 한국어 풀은 "앞에서부터 두 글자씩 이어 읽어도 실제 이름이
//    되도록" 순서를 잡아 둔 것이라 다른 언어에 그 정렬을 재현할 수 없고, 임의 조합은 이름이
//    아닌 것을 만든다. 그래서 이 파일은 **실재하는 이름 목록**이다 — 오행·성별로 태그해 고른다.
//
// 🔴 오행 태깅의 근거는 소리(초성)가 아니라 **뜻**이다. 한글 초성 오행(ㄱㅋ=木 …)은 한국어
//    전용이라 다른 언어에 적용되지 않는다. CJK 는 字义五行(글자 뜻에서 오는 오행), 라틴권은
//    worker/lib/naming-locale-profile.js 의 latinProfile C절이 정해 둔 어원·의미 매핑을 그대로
//    따른다: 木 성장·나무·봄 / 火 빛·따뜻함·태양 / 土 안정·땅·수확 / 金 맑음·금속·결단·가을 /
//    水 흐름·바다·깊이·지혜. 두 표가 갈라지면 무료 초안과 유료 작명첩의 근거가 어긋난다.
//
// 🔴 어원을 지어내지 않는다. 뜻이 여러 갈래인 이름은 갈래를 함께 적는다(라틴 프로파일 6번 규칙).
//
// 🔴 버킷은 네 개다(ko 제외). ko 는 이 파일을 쓰지 않고 기존 한글 조합 경로를 그대로 탄다 —
//    그 경로는 골든 동작이라 이번 변경으로 한 글자도 달라지면 안 된다.
//    ja / zh-CN / zh-TW / latin 이며, latin 은 en 외에 vi·hi·es·fr·de·nl·ms 가 함께 쓴다.
//    vi(Hán-Việt)·hi(Namakaran)는 원래 별도 전통이 있으나 **미구현**이지 "해당 없음"이 아니다.

import type { ElementKey, GenderLean } from "./namingRecommendations";

export type NamePoolBucket = "ja" | "zh-CN" | "zh-TW" | "latin";

/** "N" 은 그 문화권에서 실제로 남녀 공용으로 쓰이는 이름이다 — 성별 미입력의 기본값이 아니다. */
export type NameGenderTag = GenderLean | "N";

export type LocaleNameEntry = {
  /** 그 문화권 표기 그대로. */
  name: string;
  /** 읽는 법 — ja 는 よみ, zh 는 병음. 라틴권은 표기가 곧 읽는 법이라 없다. */
  reading?: string;
  /** 字义/어원에서 오는 오행. */
  element: ElementKey;
  gender: NameGenderTag;
  /** 화면에 그대로 보이는 뜻 — 그 버킷의 언어로 적는다. */
  meaning: string;
};

export type NamePoolSpec = {
  bucket: NamePoolBucket;
  /** 성과 이름을 잇는 방식 — 라틴권만 이름이 앞에 오고 사이에 공백이 들어간다. */
  joinFullName: (familyName: string, name: string) => string;
  /**
   * 폼의 "이름 글자 수"를 적용할 수 있는가.
   * 라틴권 이름에는 글자 수 개념이 없다 — 적용하는 척하면 근거 없는 필터가 된다.
   */
  honorsNameLength: boolean;
  entries: LocaleNameEntry[];
};

const JA_ENTRIES: LocaleNameEntry[] = [
  { name: "樹", reading: "いつき", element: "wood", gender: "M", meaning: "まっすぐ立つ樹木。伸びていく生命力" },
  { name: "大樹", reading: "だいき", element: "wood", gender: "M", meaning: "大きな樹。おおらかに育つ姿" },
  { name: "春樹", reading: "はるき", element: "wood", gender: "M", meaning: "春の樹。芽吹きと始まり" },
  { name: "柊", reading: "しゅう", element: "wood", gender: "M", meaning: "冬にも葉を茂らせる柊。折れない緑" },
  { name: "葵", reading: "あおい", element: "wood", gender: "F", meaning: "太陽へ向かう葵の花。まっすぐな成長" },
  { name: "楓", reading: "かえで", element: "wood", gender: "F", meaning: "秋に色づく楓。しなやかな枝ぶり" },
  { name: "芽衣", reading: "めい", element: "wood", gender: "F", meaning: "芽吹きをまとう。新しく伸びる力" },
  { name: "若菜", reading: "わかな", element: "wood", gender: "F", meaning: "早春の若い菜。みずみずしい緑" },

  { name: "陽翔", reading: "はると", element: "fire", gender: "M", meaning: "陽の光の中を翔ける。明るい行動力" },
  { name: "陽太", reading: "ようた", element: "fire", gender: "M", meaning: "大きな陽。あたたかさと元気" },
  { name: "明", reading: "あきら", element: "fire", gender: "M", meaning: "明るく照らす。曇りのない判断" },
  { name: "光希", reading: "こうき", element: "fire", gender: "M", meaning: "光を希う。差し込む明かり" },
  { name: "陽菜", reading: "ひな", element: "fire", gender: "F", meaning: "陽だまりの菜。あたたかな明るさ" },
  { name: "茜", reading: "あかね", element: "fire", gender: "F", meaning: "夕空を染める茜色。あざやかな熱" },
  { name: "灯", reading: "あかり", element: "fire", gender: "F", meaning: "小さくとも消えない灯り" },
  { name: "晴", reading: "はる", element: "fire", gender: "F", meaning: "晴れわたる空。曇りのない明るさ" },

  { name: "大地", reading: "だいち", element: "earth", gender: "M", meaning: "広い大地。ゆるがない土台" },
  { name: "陸", reading: "りく", element: "earth", gender: "M", meaning: "海に対する陸。落ち着いた足場" },
  { name: "圭", reading: "けい", element: "earth", gender: "M", meaning: "土を重ねた形の玉圭。まっすぐな品位" },
  { name: "岳", reading: "がく", element: "earth", gender: "M", meaning: "高くそびえる山。動じない重み" },
  { name: "碧", reading: "あおい", element: "earth", gender: "F", meaning: "青みを帯びた石。落ち着いた深みのある色" },
  { name: "安奈", reading: "あんな", element: "earth", gender: "F", meaning: "安らかであること。心の落ち着き" },
  { name: "里奈", reading: "りな", element: "earth", gender: "F", meaning: "人の住む里。あたたかな居場所" },
  { name: "実里", reading: "みのり", element: "earth", gender: "F", meaning: "実る里。豊かな収穫" },
  { name: "千里", reading: "ちさと", element: "earth", gender: "F", meaning: "千の里。広く根を張る安定" },

  { name: "匠", reading: "たくみ", element: "metal", gender: "M", meaning: "手を極めた匠。研ぎ澄まされた技" },
  { name: "剛", reading: "つよし", element: "metal", gender: "M", meaning: "堅くて強いこと。折れない意志" },
  { name: "秋人", reading: "あきと", element: "metal", gender: "M", meaning: "秋の澄んだ空気。実りと決断" },
  { name: "研", reading: "けん", element: "metal", gender: "M", meaning: "磨き上げること。澄んだ切れ味" },
  { name: "鈴", reading: "すず", element: "metal", gender: "F", meaning: "澄んだ音を返す鈴。清らかな響き" },
  { name: "玲奈", reading: "れいな", element: "metal", gender: "F", meaning: "玉の触れ合う澄んだ音。透明な気配" },
  { name: "千秋", reading: "ちあき", element: "metal", gender: "F", meaning: "千の秋。澄みきった実りの季節" },
  { name: "鈴音", reading: "すずね", element: "metal", gender: "F", meaning: "鈴の音。よく通る清らかさ" },

  { name: "海斗", reading: "かいと", element: "water", gender: "M", meaning: "海を渡る北斗。広く深い視野" },
  { name: "湊", reading: "みなと", element: "water", gender: "M", meaning: "船が集まる湊。人が集う流れ" },
  { name: "洋", reading: "ひろし", element: "water", gender: "M", meaning: "果てしない大海。ゆったりした度量" },
  { name: "涼太", reading: "りょうた", element: "water", gender: "M", meaning: "涼やかな水の気配。澄んだ落ち着き" },
  { name: "澪", reading: "みお", element: "water", gender: "F", meaning: "水脈のしるし。静かに続く流れ" },
  { name: "美海", reading: "みう", element: "water", gender: "F", meaning: "美しい海。深くやわらかな広がり" },
  { name: "泉", reading: "いずみ", element: "water", gender: "F", meaning: "湧き出る泉。尽きない知恵" },
  { name: "千尋", reading: "ちひろ", element: "water", gender: "F", meaning: "計り知れない深さ。奥行きのある静けさ" },
];

const ZH_CN_ENTRIES: LocaleNameEntry[] = [
  { name: "梓轩", reading: "zǐ xuān", element: "wood", gender: "M", meaning: "梓为良木，轩为高朗 — 挺拔而有生气" },
  { name: "楠", reading: "nán", element: "wood", gender: "M", meaning: "楠木坚实耐久 — 稳而不折的木气" },
  { name: "森", reading: "sēn", element: "wood", gender: "M", meaning: "三木成森 — 成群生长的旺盛" },
  { name: "柏宇", reading: "bǎi yǔ", element: "wood", gender: "M", meaning: "柏木常青，宇为天地 — 长青而开阔" },
  { name: "梓萱", reading: "zǐ xuān", element: "wood", gender: "F", meaning: "梓木与萱草 — 生发而舒展" },
  { name: "芸", reading: "yún", element: "wood", gender: "F", meaning: "芸香之草 — 清淡的草木香气" },
  { name: "语桐", reading: "yǔ tóng", element: "wood", gender: "F", meaning: "桐木清越 — 声与木相和" },
  { name: "芷若", reading: "zhǐ ruò", element: "wood", gender: "F", meaning: "白芷与杜若，皆为香草 — 清雅的草木气" },

  { name: "昊", reading: "hào", element: "fire", gender: "M", meaning: "日光广大 — 明朗开阔的火气" },
  { name: "晨阳", reading: "chén yáng", element: "fire", gender: "M", meaning: "清晨的太阳 — 初升的热力" },
  { name: "明哲", reading: "míng zhé", element: "fire", gender: "M", meaning: "光明而通达 — 亮处见理" },
  { name: "炜", reading: "wěi", element: "fire", gender: "M", meaning: "火光明亮 — 显眼的光彩" },
  { name: "晓彤", reading: "xiǎo tóng", element: "fire", gender: "F", meaning: "破晓之光与朱红 — 明亮的暖色" },
  { name: "昕", reading: "xīn", element: "fire", gender: "F", meaning: "天将明的光 — 温和的初亮" },
  { name: "晴", reading: "qíng", element: "fire", gender: "F", meaning: "雨止天开 — 明净的暖" },
  { name: "彤", reading: "tóng", element: "fire", gender: "F", meaning: "朱红之色 — 鲜明的热度" },
  { name: "熙", reading: "xī", element: "fire", gender: "F", meaning: "光明而和乐 — 暖照人心" },

  { name: "宇轩", reading: "yǔ xuān", element: "earth", gender: "M", meaning: "宇为天地，轩为高朗 — 开阔而稳当" },
  { name: "坤", reading: "kūn", element: "earth", gender: "M", meaning: "地为坤 — 承载万物的厚重" },
  { name: "磊", reading: "lěi", element: "earth", gender: "M", meaning: "众石相叠 — 坦荡而稳固" },
  { name: "峰", reading: "fēng", element: "earth", gender: "M", meaning: "山之高处 — 立得住的中心" },
  { name: "岩", reading: "yán", element: "earth", gender: "M", meaning: "山岩不移 — 不动的根基" },
  { name: "安然", reading: "ān rán", element: "earth", gender: "F", meaning: "安稳自在 — 不慌不忙的定" },
  { name: "安", reading: "ān", element: "earth", gender: "F", meaning: "安稳无扰 — 心里踏实" },
  { name: "岚", reading: "lán", element: "earth", gender: "F", meaning: "山间的雾气 — 依山而生的安静" },
  { name: "佳", reading: "jiā", element: "earth", gender: "F", meaning: "美好而端正 — 稳当的分寸" },
  { name: "宁", reading: "níng", element: "earth", gender: "F", meaning: "宁静安定 — 不慌的定" },

  { name: "铭轩", reading: "míng xuān", element: "metal", gender: "M", meaning: "刻于金石而高朗 — 记得住的分明" },
  { name: "鑫", reading: "xīn", element: "metal", gender: "M", meaning: "三金聚合 — 丰厚而坚实" },
  { name: "钧", reading: "jūn", element: "metal", gender: "M", meaning: "千钧之重 — 分量与决断" },
  { name: "锐", reading: "ruì", element: "metal", gender: "M", meaning: "锋刃之锐 — 明快的判断" },
  { name: "铭", reading: "míng", element: "metal", gender: "M", meaning: "刻于金石 — 记得住的分明" },
  { name: "瑾瑜", reading: "jǐn yú", element: "metal", gender: "F", meaning: "瑾与瑜皆为美玉 — 温润而坚" },
  { name: "钰", reading: "yù", element: "metal", gender: "F", meaning: "珍贵的金玉 — 温润而坚" },
  { name: "铃", reading: "líng", element: "metal", gender: "F", meaning: "金铃清响 — 干净的声音" },
  { name: "锦", reading: "jǐn", element: "metal", gender: "F", meaning: "织出的锦纹 — 精致的整齐" },
  { name: "瑶", reading: "yáo", element: "metal", gender: "F", meaning: "美玉之光 — 清透的贵气" },

  { name: "浩然", reading: "hào rán", element: "water", gender: "M", meaning: "浩大而自然 — 开阔的水气" },
  { name: "泽", reading: "zé", element: "water", gender: "M", meaning: "润物之泽 — 流向他人的水气" },
  { name: "海", reading: "hǎi", element: "water", gender: "M", meaning: "大海无边 — 深而能容" },
  { name: "涛", reading: "tāo", element: "water", gender: "M", meaning: "起伏的大浪 — 有力的流动" },
  { name: "润", reading: "rùn", element: "water", gender: "M", meaning: "浸润无声 — 慢而深的滋养" },
  { name: "雨涵", reading: "yǔ hán", element: "water", gender: "F", meaning: "雨水与涵养 — 深处不外露的润" },
  { name: "汐", reading: "xī", element: "water", gender: "F", meaning: "晚潮之汐 — 有节律的水" },
  { name: "涵", reading: "hán", element: "water", gender: "F", meaning: "包容含蓄 — 深处不外露" },
  { name: "沐", reading: "mù", element: "water", gender: "F", meaning: "以水洗濯 — 清爽的开始" },
  { name: "雨", reading: "yǔ", element: "water", gender: "F", meaning: "从天而降的雨 — 及时的润泽" },
];

const ZH_TW_ENTRIES: LocaleNameEntry[] = [
  { name: "柏睿", reading: "bó ruì", element: "wood", gender: "M", meaning: "柏木常青，睿為通達 — 長青而明白" },
  { name: "楷", reading: "kǎi", element: "wood", gender: "M", meaning: "楷木端正 — 立得直的木氣" },
  { name: "承樺", reading: "chéng huà", element: "wood", gender: "M", meaning: "樺木堅韌 — 承接而挺立" },
  { name: "竹軒", reading: "zhú xuān", element: "wood", gender: "M", meaning: "竹節分明，軒為高朗 — 有節而清挺" },
  { name: "芯", reading: "xīn", element: "wood", gender: "F", meaning: "草木之心 — 內裡的生機" },
  { name: "蓁", reading: "zhēn", element: "wood", gender: "F", meaning: "草木茂盛的樣子 — 蓬勃而不張揚" },
  { name: "若荷", reading: "ruò hé", element: "wood", gender: "F", meaning: "荷葉舒展 — 水邊的清爽草木" },
  { name: "柔穎", reading: "róu yǐng", element: "wood", gender: "F", meaning: "禾穗初出 — 柔中帶著生長" },

  { name: "昱", reading: "yù", element: "fire", gender: "M", meaning: "日光照耀 — 白日的明亮" },
  { name: "宸曦", reading: "chén xī", element: "fire", gender: "M", meaning: "帝居與晨光 — 開闊的初陽" },
  { name: "昀", reading: "yún", element: "fire", gender: "M", meaning: "日光 — 溫和的照明" },
  { name: "燁", reading: "yè", element: "fire", gender: "M", meaning: "火光盛大 — 顯眼的明亮" },
  { name: "昀熙", reading: "yún xī", element: "fire", gender: "F", meaning: "日光與和樂 — 溫和的明亮" },
  { name: "晞", reading: "xī", element: "fire", gender: "F", meaning: "曬乾露水的日光 — 清晨的暖" },
  { name: "煦", reading: "xù", element: "fire", gender: "F", meaning: "和暖的日照 — 不刺人的溫度" },
  { name: "彤", reading: "tóng", element: "fire", gender: "F", meaning: "朱紅之色 — 鮮明的熱度" },
  { name: "熹", reading: "xī", element: "fire", gender: "F", meaning: "微明的火光 — 將亮未亮的暖" },

  { name: "峻", reading: "jùn", element: "earth", gender: "M", meaning: "高而陡的山 — 端正的重量" },
  { name: "巖", reading: "yán", element: "earth", gender: "M", meaning: "山巖不移 — 不動的根基" },
  { name: "堯", reading: "yáo", element: "earth", gender: "M", meaning: "高而穩的土丘 — 上古的敦厚" },
  { name: "培軒", reading: "péi xuān", element: "earth", gender: "M", meaning: "培土而高朗 — 穩穩地長" },
  { name: "宥安", reading: "yòu ān", element: "earth", gender: "F", meaning: "寬厚而安穩 — 讓人放心的分寸" },
  { name: "嵐", reading: "lán", element: "earth", gender: "F", meaning: "山間的霧氣 — 依山而生的安靜" },
  { name: "怡均", reading: "yí jūn", element: "earth", gender: "F", meaning: "和悅而均勻 — 不偏的穩" },
  { name: "亦垚", reading: "yì yáo", element: "earth", gender: "F", meaning: "三土為垚 — 厚實的根柢" },

  { name: "承鈞", reading: "chéng jūn", element: "metal", gender: "M", meaning: "承接千鈞 — 拿得住的分量" },
  { name: "銓", reading: "quán", element: "metal", gender: "M", meaning: "衡量輕重 — 拿捏得準的決斷" },
  { name: "鋒", reading: "fēng", element: "metal", gender: "M", meaning: "刀刃之鋒 — 明快的切分" },
  { name: "鎧", reading: "kǎi", element: "metal", gender: "M", meaning: "護身的鎧甲 — 堅實的守" },
  { name: "錡", reading: "qí", element: "metal", gender: "M", meaning: "古代的釜與鑿 — 器物的堅實" },
  { name: "珮", reading: "pèi", element: "metal", gender: "F", meaning: "身上的玉珮 — 清響的節度" },
  { name: "璇", reading: "xuán", element: "metal", gender: "F", meaning: "美玉之璇 — 明澈的貴氣" },
  { name: "錦", reading: "jǐn", element: "metal", gender: "F", meaning: "織出的錦紋 — 精緻的整齊" },
  { name: "鈺潔", reading: "yù jié", element: "metal", gender: "F", meaning: "金玉而潔淨 — 溫潤中的清" },

  { name: "沛霖", reading: "pèi lín", element: "water", gender: "M", meaning: "沛然的甘霖 — 充足的潤澤" },
  { name: "澔", reading: "hào", element: "water", gender: "M", meaning: "水勢浩大 — 開闊的容量" },
  { name: "濬", reading: "jùn", element: "water", gender: "M", meaning: "疏通水道 — 深而通" },
  { name: "淮", reading: "huái", element: "water", gender: "M", meaning: "淮水之名 — 長流不斷" },
  { name: "沛", reading: "pèi", element: "water", gender: "M", meaning: "雨水充沛 — 充足的流動" },
  { name: "泠", reading: "líng", element: "water", gender: "F", meaning: "清涼的水聲 — 乾淨的清" },
  { name: "湘", reading: "xiāng", element: "water", gender: "F", meaning: "湘水之名 — 溫柔的長流" },
  { name: "澐", reading: "yún", element: "water", gender: "F", meaning: "大波為澐 — 起伏中的柔" },
  { name: "雨柔", reading: "yǔ róu", element: "water", gender: "F", meaning: "雨絲細柔 — 不急的潤" },
];

const LATIN_ENTRIES: LocaleNameEntry[] = [
  { name: "Silas", element: "wood", gender: "M", meaning: "From Latin silva, \"forest\" — growth and green" },
  { name: "Oliver", element: "wood", gender: "M", meaning: "From the olive tree, Latin oliva — slow, long growth" },
  { name: "Ashton", element: "wood", gender: "M", meaning: "Old English æsc-tūn, \"the settlement by the ash trees\"" },
  { name: "Hayden", element: "wood", gender: "M", meaning: "Old English, \"the hay valley\" — open, growing ground" },
  { name: "Sylvia", element: "wood", gender: "F", meaning: "Latin silva, \"of the forest\"" },
  { name: "Hazel", element: "wood", gender: "F", meaning: "Old English hæsel, the hazel tree" },
  { name: "Daphne", element: "wood", gender: "F", meaning: "Greek daphnē, \"laurel\"" },
  { name: "Ivy", element: "wood", gender: "F", meaning: "Old English īfig, the climbing ivy" },
  { name: "Rowan", element: "wood", gender: "N", meaning: "The rowan tree; also Irish ruadhán, \"little red one\" — both readings are attested" },
  { name: "Sage", element: "wood", gender: "N", meaning: "Latin salvia, the herb; in English also \"wise\"" },

  { name: "Aiden", element: "fire", gender: "M", meaning: "Anglicised Irish Aodhán, \"little fire\"" },
  { name: "Elio", element: "fire", gender: "M", meaning: "Italian, from Greek Hēlios, \"the sun\"" },
  { name: "Apollo", element: "fire", gender: "M", meaning: "The Greek god of the sun and light; the name's own root is unknown" },
  { name: "Sol", element: "fire", gender: "M", meaning: "Latin sol, \"the sun\"" },
  { name: "Aurora", element: "fire", gender: "F", meaning: "Latin, the Roman goddess of the dawn — first light" },
  { name: "Clara", element: "fire", gender: "F", meaning: "Latin clarus, \"bright, clear\"" },
  { name: "Helena", element: "fire", gender: "F", meaning: "Greek, linked with hēlē, \"torch, shining light\"" },
  { name: "Seraphina", element: "fire", gender: "F", meaning: "Hebrew seraphim, \"the burning ones\"" },

  { name: "Peter", element: "earth", gender: "M", meaning: "Greek petros, \"rock\"" },
  { name: "Adam", element: "earth", gender: "M", meaning: "Hebrew adamah, \"ground, earth\"" },
  { name: "Clifford", element: "earth", gender: "M", meaning: "Old English, \"the ford by the cliff\"" },
  { name: "Garth", element: "earth", gender: "M", meaning: "Old Norse garðr, \"enclosure, yard\" — held ground" },
  { name: "Petra", element: "earth", gender: "F", meaning: "Greek petra, \"rock\"" },
  { name: "Georgia", element: "earth", gender: "F", meaning: "Greek geōrgos, \"earth-worker, farmer\"" },
  { name: "Constance", element: "earth", gender: "F", meaning: "Latin constantia, \"steadfastness\"" },
  { name: "Terra", element: "earth", gender: "F", meaning: "Latin terra, \"earth\"" },

  { name: "Aurelius", element: "metal", gender: "M", meaning: "Latin aurum, \"gold\"" },
  { name: "Edgar", element: "metal", gender: "M", meaning: "Old English ēad-gār, \"wealth-spear\" — the blade in the name" },
  { name: "Sterling", element: "metal", gender: "M", meaning: "From sterling silver — \"of tested quality\"" },
  { name: "Vincent", element: "metal", gender: "M", meaning: "Latin vincere, \"to conquer\" — the decisive edge" },
  { name: "Aurelia", element: "metal", gender: "F", meaning: "Latin aurum, \"gold\"" },
  { name: "Autumn", element: "metal", gender: "F", meaning: "Latin autumnus — the season the metal element belongs to" },
  { name: "Perla", element: "metal", gender: "F", meaning: "Latin perla, \"pearl\" — hard clarity" },
  { name: "Vera", element: "metal", gender: "F", meaning: "Latin verus, \"true\"; also Slavic vera, \"faith\" — both are attested" },

  { name: "Dylan", element: "water", gender: "M", meaning: "Welsh, \"sea, ocean\"" },
  { name: "Brooks", element: "water", gender: "M", meaning: "Old English brōc, \"of the brook\"" },
  { name: "Douglas", element: "water", gender: "M", meaning: "Scottish Gaelic dubh glas, \"dark water\"" },
  { name: "Murray", element: "water", gender: "M", meaning: "Scottish Gaelic, \"settlement by the sea\"" },
  { name: "Marina", element: "water", gender: "F", meaning: "Latin marinus, \"of the sea\"" },
  { name: "Sophia", element: "water", gender: "F", meaning: "Greek sophia, \"wisdom\" — the depth water stands for" },
  { name: "Nerissa", element: "water", gender: "F", meaning: "Greek Nērēis, \"sea nymph\"" },
  { name: "Lynn", element: "water", gender: "F", meaning: "Welsh llyn, \"lake\"" },
  { name: "Kai", element: "water", gender: "N", meaning: "Hawaiian \"sea\"; Welsh and Frisian roots are also attested" },
  { name: "Jordan", element: "water", gender: "N", meaning: "Hebrew yarden, \"the one that flows down\" — the river" },
];

const CJK_JOIN = (familyName: string, name: string) => `${familyName}${name}`;
/** 라틴권은 이름이 앞, 성이 뒤다 — 성 뒤에 붙이면 성처럼 읽힌다. */
const LATIN_JOIN = (familyName: string, name: string) => (familyName ? `${name} ${familyName}` : name);

const POOLS: Record<NamePoolBucket, NamePoolSpec> = {
  ja: { bucket: "ja", joinFullName: CJK_JOIN, honorsNameLength: true, entries: JA_ENTRIES },
  "zh-CN": { bucket: "zh-CN", joinFullName: CJK_JOIN, honorsNameLength: true, entries: ZH_CN_ENTRIES },
  "zh-TW": { bucket: "zh-TW", joinFullName: CJK_JOIN, honorsNameLength: true, entries: ZH_TW_ENTRIES },
  latin: { bucket: "latin", joinFullName: LATIN_JOIN, honorsNameLength: false, entries: LATIN_ENTRIES },
};

/**
 * 로케일 → 이름 풀 버킷.
 * 🔴 ko 는 null 이다 — 기존 한글 조합 경로를 그대로 타야 하므로 여기서 가로채지 않는다.
 */
export function resolveNamePoolBucket(locale: string): NamePoolBucket | null {
  const raw = String(locale || "").trim();
  if (!raw || raw === "ko") return null;
  if (raw === "ja") return "ja";
  if (raw === "zh-CN") return "zh-CN";
  if (raw === "zh-TW") return "zh-TW";
  return "latin";
}

export function getNamePool(bucket: NamePoolBucket): NamePoolSpec {
  return POOLS[bucket];
}

export { POOLS as NAME_POOLS };
