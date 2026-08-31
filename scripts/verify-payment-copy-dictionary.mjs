// 결제·인증 화면 문구가 **코드 폴백과 사전 사이에서 갈라지지 않는지** 본다.
//
// 왜 필요한가:
//   `cdTranslate`(js/cd-lang-native.js:517-522)는 키가 없을 때 코드의 한국어 폴백으로
//   되돌아가지 **않는다**. 사전이 로드된 비-ko 언어라면 `resolveValue`(:266-271)가
//   `missingText(lang)` — "Translation pending" · "翻訳を準備しています" — 를 낸다.
//
//     lang === 'ko'                    → 폴백을 그대로 쓴다        (사전을 아예 보지 않는다)
//     사전 미로드                       → 폴백을 그대로 쓴다
//     사전 로드 + 키 없음               → missingText(lang)        ← 여기가 사고 지점
//
//   결과로 **한국어 화면만 멀쩡하고 나머지 11개 로케일이 깨진다.** 개발도 리뷰도 한국어로
//   하므로 아무도 눈치채지 못한다. 2026-08-20 전수 조사에서 실제로 21건이 나왔고 그중
//   `payment.overlay.applied.{title,message}` 는 **PG창을 통과한 뒤의 결제 성공 오버레이**
//   였다 — 해외 고객이 카드 결제를 마치고 "Translation pending" 을 봤다.
//
// 무엇을 강제하는가:
//   ① 같은 키에 서로 다른 폴백이 붙지 않는다 (사전은 하나뿐이라 둘 중 하나는 반드시 죽는다)
//   ② 모든 폴백이 `public/i18n/ko.json` 값과 정확히 같다 (ko 폴백이 곧 ko 정본)
//   ③ 모든 키가 12개 런타임 로케일 전부에 비어 있지 않은 값으로 있다
//   ④ 동적으로 조립되는 `payment.wait.<stage>.<paymentType>.*` 계열도 코드 정본
//      (`CD_LOADING_MESSAGES`)에서 유도해 ②③ 을 똑같이 건다
//   ⑤ zh-CN 은 간체, zh-TW 는 번체다 — `payment.**` 의 자형 혼입을 상한으로 고정한다
//   ⑥ 이 검사기가 읽는 파일이 전부 paid-flow-gates 트리거 경로에 있다
//
// 🔴 fail-closed: 스캔 결과가 바닥 아래면 실패한다. 래퍼 이름이 바뀌거나 정규식이 깨져
//    "검사 대상 0개" 가 되면 조용히 통과하는 것이 이 가드의 유일한 실패 모드다.
//
// 범위: 루트 원본만 본다. 미러(public/**)는 `verify:public-parity` 가 원본과의 동일성을
//    따로 강제하므로 여기서 8벌을 다시 읽을 이유가 없다.
//
// 실행: npm run verify:payment-copy-dictionary
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const SHELL = "index.html";
const REACT_CLIENT = "app/_lib/billing-client.ts";
const STANDALONE = "js/destiny-profile.js";
const CORE = "js/core/checkout-entry.js";

// 래퍼는 넷 다 js/core/checkout-entry.js 의 checkoutText 와 같은 (key, fallback, vars) 시그니처다.
const SOURCES = [
  { rel: SHELL, wrapper: "_cdPaymentI18n", label: "정적 셸(결제)" },
  { rel: SHELL, wrapper: "__cdText", label: "정적 셸(공용)" },
  { rel: REACT_CLIENT, wrapper: "checkoutEntry\\.text", label: "React" },
  { rel: STANDALONE, wrapper: "_dpCheckoutText", label: "독립 폴백" },
  // 2026-08-24: 결제수단 2단계 문구는 렌더러 본문이 아니라 세 렌더러 공유 코어에 있다.
  // 여기 없으면 그 문구만 사전 검사(폴백==ko.json · 12로케일)를 통째로 빠져나간다.
  { rel: CORE, wrapper: "checkoutText", label: "공유 코어" },
];

const I18N_LOCALES = ["ko", "en", "ja", "zh-cn", "zh-tw", "es", "fr", "de", "nl", "vi", "ms", "hi"];

// 2026-08-20 실측 132. 래퍼 이름 변경·정규식 파손으로 대상이 사라지면 여기서 걸린다.
// 문구를 키로 옮기는 작업이 진행되면 이 바닥은 올라가기만 한다.
const MINIMUM_KEYS = 120;

/** 소스에 적힌 문자열 **리터럴 표기**를 실제 값으로 푼다. 사전에 든 것은 값이므로 맞춰야 한다. */
function unescapeJsString(raw) {
  const SHORT = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0" };
  return raw.replace(
    /\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([nrtbfv0])|(.))/g,
    (_, uBrace, u4, x2, short, other) => {
      if (uBrace) return String.fromCodePoint(parseInt(uBrace, 16));
      if (u4) return String.fromCharCode(parseInt(u4, 16));
      if (x2) return String.fromCharCode(parseInt(x2, 16));
      if (short) return SHORT[short];
      return other;
    },
  );
}

// 리터럴 키만 본다. `'payment.wait.' + stage + '.' + type + '.title'` 같은 조립 키는 여기서
// 걸러지고 아래 ④ 에서 코드 정본으로부터 유도해 따로 검사한다.
const LITERAL_KEY = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/;

const dictionaries = Object.fromEntries(
  I18N_LOCALES.map((locale) => [locale, JSON.parse(read(`public/i18n/${locale}.json`))]),
);
const readI18nKey = (data, key) =>
  key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), data);

// ── 1) 코드에서 (키, ko 폴백) 을 전부 모은다 ────────────────────────────────────────────
/** @type {Map<string, { fallback: string, at: string }>} */
const copy = new Map();

for (const source of SOURCES) {
  const text = read(source.rel);
  const pattern = new RegExp(
    `${source.wrapper}\\(\\s*(["'])(.*?)\\1\\s*,\\s*(["'])((?:\\\\.|(?!\\3).)*)\\3`,
    "g",
  );
  let match;
  while ((match = pattern.exec(text))) {
    const key = match[2];
    if (!LITERAL_KEY.test(key)) continue;
    const fallback = unescapeJsString(match[4]);
    const line = text.slice(0, match.index).split("\n").length;
    const at = `${source.rel}:${line}`;
    const seen = copy.get(key);
    // ① 같은 키에 두 가지 뜻이 붙으면 사전은 그중 하나만 담을 수 있고, 비한국어 사용자는
    //    호출부와 무관하게 그 하나만 본다. 실제로 payment.passShop.monthlyStatus 가
    //    "확인 중"(죽은 대입)과 "확인됨"(살아있는 분기) 두 벌을 갖고 있었고, 사전이 죽은
    //    쪽에 맞춰져 있었다.
    assert.ok(
      !seen || seen.fallback === fallback,
      `${key}: 같은 키에 서로 다른 ko 폴백이 붙어 있습니다.\n`
        + `  ${seen?.at}: ${JSON.stringify(seen?.fallback)}\n`
        + `  ${at}: ${JSON.stringify(fallback)}\n`
        + `  사전에는 값이 하나뿐이므로 비한국어 사용자는 둘 중 하나만 보게 됩니다. 키를 나누거나 문구를 통일하세요.`,
    );
    if (!seen) copy.set(key, { fallback, at });
  }
}

assert.ok(
  copy.size >= MINIMUM_KEYS,
  `결제 문구 키를 ${copy.size}개밖에 찾지 못했습니다(최소 ${MINIMUM_KEYS}). `
    + `래퍼 이름이 바뀌었거나 추출 정규식이 깨졌을 가능성이 큽니다 — 이 가드의 유일한 조용한 실패 모드입니다. `
    + `대상: ${SOURCES.map((s) => `${s.rel}/${s.wrapper.replace(/\\/g, "")}`).join(" · ")}`,
);

// ── 2) 폴백 == ko.json ─────────────────────────────────────────────────────────────────
for (const [key, { fallback, at }] of copy) {
  const koValue = readI18nKey(dictionaries.ko, key);
  assert.equal(
    fallback,
    koValue,
    `${key} (${at}): ko 폴백이 public/i18n/ko.json 과 다릅니다.\n`
      + `  코드   : ${JSON.stringify(fallback)}\n`
      + `  ko.json: ${JSON.stringify(koValue)}\n`
      + `  cdTranslate 는 ko 일 때 사전을 보지 않으므로, 어긋나면 한국어 사용자만 새 문구를 보고\n`
      + `  나머지 11개 로케일은 옛 문구의 번역을 계속 봅니다. 사전 값을 함께 갱신하세요.`,
  );
}

// ── 3) 12개 로케일 전수 ────────────────────────────────────────────────────────────────
// 보간 토큰 집합. 번역이 `{amount}` 를 빠뜨리면 금액이 통째로 사라지고, 없던 토큰을 만들면
// 사용자에게 `{count}` 가 그대로 보인다.
const interpolationTokens = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(", ");

function assertAllLocales(key, at) {
  const koValue = readI18nKey(dictionaries.ko, key);
  for (const locale of I18N_LOCALES) {
    const value = readI18nKey(dictionaries[locale], key);
    assert.ok(
      typeof value === "string" && value.trim(),
      `public/i18n/${locale}.json: ${key} 가 없습니다 (${at}).\n`
        + `  키가 없으면 cdTranslate 가 폴백이 아니라 "Translation pending" 계열 문구를 냅니다.`,
    );
    if (typeof koValue !== "string") continue;
    assert.equal(
      interpolationTokens(value),
      interpolationTokens(koValue),
      `public/i18n/${locale}.json: ${key} 의 보간 토큰이 ko 와 다릅니다 (${at}).\n`
        + `  ko      : ${JSON.stringify(koValue)}\n`
        + `  ${locale} : ${JSON.stringify(value)}\n`
        + `  토큰이 빠지면 금액·개수가 통째로 사라지고, 늘면 사용자가 중괄호를 그대로 봅니다.`,
    );
    // 🔴 저작 사고로 무관한 문장이 줄바꿈과 함께 붙어 들어온 적이 있다(2026-08-20, hi.json 의
    //    payment.currency.krw). 값이 비어 있지도 않고 토큰도 맞아서 어떤 가드도 잡지 못했고,
    //    힌디 화면의 모든 금액 뒤에 그 문장이 따라붙고 있었다.
    assert.ok(
      koValue.includes("\n") || !value.includes("\n"),
      `public/i18n/${locale}.json: ${key} 에 ko 에는 없는 줄바꿈이 있습니다 (${at}).\n`
        + `  ${locale} : ${JSON.stringify(value)}\n`
        + `  저작 중 다른 문장이 섞여 들어왔을 가능성이 큽니다.`,
    );
  }
}
for (const [key, { at }] of copy) assertAllLocales(key, at);

// ── 4) 동적 조립 키: payment.wait.<stage>.<paymentType>.{title,sub} ─────────────────────
// index.html 의 `_cdLoadingCopy` 가 `'payment.wait.' + stage + '.' + paymentType + '.title'`
// 로 키를 만든다. 리터럴이 아니므로 위 스캔에 안 잡히지만, 도메인은 코드 정본인
// CD_LOADING_MESSAGES 하나이므로 거기서 유도하면 전수로 검사할 수 있다.
// 🔴 손으로 쓴 목록을 두지 말 것 — 새 stage 가 늘면 그 목록만 조용히 낡는다.
function loadingMessages() {
  const text = read(SHELL);
  const declaration = text.indexOf("var CD_LOADING_MESSAGES = {");
  assert.ok(declaration >= 0, `${SHELL}: CD_LOADING_MESSAGES 선언을 찾지 못했습니다`);
  const open = text.indexOf("{", declaration);
  let depth = 0;
  let close = -1;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) { close = i; break; }
    }
  }
  assert.ok(close > open, `${SHELL}: CD_LOADING_MESSAGES 객체의 끝을 찾지 못했습니다`);
  return new Function(`return ${text.slice(open, close + 1)}`)();
}

const CD_LOADING_MESSAGES = loadingMessages();
const stages = Object.keys(CD_LOADING_MESSAGES);
assert.ok(stages.length >= 3, `CD_LOADING_MESSAGES 의 stage 가 ${stages.length}개입니다(최소 3)`);

let waitKeyCount = 0;
for (const [stage, byPaymentType] of Object.entries(CD_LOADING_MESSAGES)) {
  for (const [paymentType, entry] of Object.entries(byPaymentType)) {
    for (const field of ["title", "sub"]) {
      if (typeof entry[field] !== "string" || !entry[field]) continue;
      const key = `payment.wait.${stage}.${paymentType}.${field}`;
      const at = `${SHELL}/CD_LOADING_MESSAGES.${stage}.${paymentType}.${field}`;
      assertAllLocales(key, at);
      assert.equal(
        readI18nKey(dictionaries.ko, key),
        entry[field],
        `${key}: CD_LOADING_MESSAGES 의 문구와 ko.json 이 다릅니다.\n`
          + `  코드   : ${JSON.stringify(entry[field])}\n`
          + `  ko.json: ${JSON.stringify(readI18nKey(dictionaries.ko, key))}`,
      );
      waitKeyCount += 1;
    }
  }
}

// `_cdLoadingCopy` 가 stage/paymentType 조합을 못 찾았을 때 쓰는 폴백 문구도 같은 계약이다.
for (const key of ["payment.wait.fallback.title", "payment.wait.fallback.sub"]) {
  assertAllLocales(key, `${SHELL}/CD_LOADING_FALLBACK_COPY`);
  waitKeyCount += 1;
}

// ── 5) zh 자형 순도 ────────────────────────────────────────────────────────────────────
// zh-CN 은 간체, zh-TW 는 번체다. 이 레포는 둘을 **별도 로케일로 분리**해 왔고 PG 결제창
// locale 도 그 분리를 따른다(js/core/checkout-entry.js 의 pgWindowLocale — zh-TW 는 EN_US).
// 그런데 사전에는 한쪽 자형이 반대편에 섞여 들어와 있었다. 2026-08-31 실측:
//   zh-CN payment.* — 번체 1자(provisionTiming 의 "內容"). 이 PR 에서 정정했다.
//   zh-TW payment.* — 간체가 93키에 남아 있다(사전 전체로는 더 많다).
// 자형이 섞이면 대만·홍콩 사용자에게는 "중국 본토 사이트"로 읽히고, 결제 직전 화면에서
// 그 인상은 이탈로 이어진다. 어떤 기존 가드도 자형을 보지 않는다(비어 있는 값만 본다).
//
// 여기서 하는 일은 **정정이 아니라 고정**이다 — zh-TW 번역 수복은 별도 PR 의 작업이고,
// 상한을 박아 두어 **줄어드는 방향으로만** 움직이게 한다. 상한 아래로 내려가면
// "상한을 낮추라"고 실패하므로 수복이 끝나면 그대로 잠긴다.
//
// 🔴 표의 한계를 분명히 적는다 — ZH_PAIRS 는 **전수 간·번체 대응표가 아니다.** 관측된
// 결제 코퍼스 전량 + 상용 UI 어휘를 손으로 적은 620쌍이고, 표에 없는 글자는 검출되지 않는다
// (거짓 음성). 반대로 거짓 양성은 만들지 않도록 **양쪽 자형에서 모두 정상인 글자는 뺐다** —
// 예: "准"(번체에서도 "核准·批准" 으로 정상이라 오탐한다) · "系"(系統) · "臺" · "裡" · "麵".
const ZH_PAIRS = [
  // ① 결제 사전 코퍼스에서 실제로 관측된 쌍 (2026-08-31)
  "韩韓认認确確记記录錄选選请請单單这這额額当當余餘显顯与與银銀开開启啟内內继繼续續检檢务務将將",
  "适適范範围圍备備权權阅閱览覽败敗无無过過闸閘订訂证證号號时時后後减減应應级級锁鎖资資状狀态態",
  "处處页頁个個关關闭閉说說动動费費购購买買设設数數规規汇匯决決结結载載会會员員进進验驗调調纹紋",
  "静靜对對齐齊讯訊马馬纪紀视視电電据據销銷荐薦吗嗎们們为為币幣转轉帐帳机機礼禮图圖书書财財",
  "网網绪緒访訪问問题題项項标標档檔迟遲构構还還盖蓋来來没沒询詢暂暫从從种種实實账賬拥擁听聽仅僅",
  "点點击擊场場经經择擇约約并並发發货貨",
  // ② 결제 문구에 새로 들어올 법한 상용자 (코퍼스 밖 보강)
  "国國学學门門车車长長东東华華业業义義乐樂众眾优優传傳价價体體儿兒党黨军軍农農几幾则則创創劳勞",
  "势勢医醫卖賣卫衛厂廠厅廳历歷压壓县縣参參双雙变變叶葉响響团團园園圆圓圣聖坏壞块塊坚堅执執报報",
  "声聲复復够夠头頭夹夾夺奪奋奮娱娛宁寧宝寶审審层層尽盡属屬岁歲岗崗帮幫广廣庄莊庆慶废廢异異弃棄",
  "张張强強归歸彻徹忆憶忧憂总總恋戀恶惡惊驚战戰户戶扑撲扩擴扫掃扬揚抚撫拟擬挂掛挥揮损損换換敌敵",
  "断斷旧舊术術杀殺杂雜条條杨楊极極枪槍柜櫃树樹桥橋楼樓欢歡欧歐毁毀毕畢气氣汉漢汤湯沟溝泪淚洁潔",
  "测測济濟温溫满滿滚滾潜潛灭滅灯燈灵靈灾災炉爐烦煩烧燒热熱爱愛独獨献獻现現环環画畫疗療盘盤监監",
  "睁睜码碼离離积積称稱稳穩穷窮窃竊竖豎竞競笔筆笼籠简簡签簽类類粮糧紧緊纠糾红紅纤纖纯純纲綱纳納",
  "纵縱纸紙纺紡线線练練组組细細织織终終绍紹绑綁绒絨绕繞绘繪给給络絡绝絕统統维維绵綿综綜绿綠编編",
  "缘緣缩縮罗羅罚罰罢罷职職联聯聪聰肃肅肠腸肤膚脏臟脑腦脸臉腾騰舰艦艰艱艺藝节節苏蘇苹蘋荡蕩荣榮",
  "药藥莲蓮获獲萧蕭蓝藍虏虜虑慮虚虛虫蟲虽雖蚀蝕蚁蟻补補装裝见見观觀觅覓觉覺触觸计計议議讲講许許",
  "论論讼訟诉訴诊診词詞译譯试試诗詩诚誠话話该該详詳语語误誤诱誘诸諸读讀课課谁誰谈談谋謀谢謝谱譜",
  "识識训訓讨討让讓谅諒贝貝贞貞负負贡貢责責贤賢质質贩販贪貪贫貧贬貶贯貫贱賤贴貼贵貴贷貸贸貿贺賀",
  "贼賊贿賄赁賃赏賞赔賠赖賴赚賺赛賽赞贊赠贈赢贏赶趕趋趨跃躍踪蹤躯軀轧軋轨軌轮輪软軟轰轟轴軸轻輕",
  "较較辅輔辆輛辈輩辉輝输輸辖轄辞辭辩辯边邊达達迁遷迈邁运運远遠违違连連迹跡逊遜递遞逻邏遗遺邮郵",
  "郑鄭邻鄰酱醬释釋鉴鑒针針钟鐘钢鋼钥鑰钱錢铁鐵铃鈴铜銅铝鋁链鏈锋鋒锐銳错錯键鍵镇鎮镜鏡闪閃闲閑",
  "间間闷悶闹鬧闻聞阀閥阁閣队隊阳陽阴陰阵陣阶階际際陆陸陈陳险險随隨隐隱难難雾霧韦韋顶頂顺順须須",
  "预預领領颈頸频頻颗顆颜顏颠顛风風飘飄飞飛饥饑饭飯饮飲饰飾饱飽馆館驰馳驱驅驳駁驶駛驻駐驾駕骂罵",
  "骄驕骑騎鱼魚鲜鮮鸡雞鸣鳴鸭鴨鸿鴻鹅鵝鹤鶴鹰鷹黄黃龙龍龟龜",
  // ③ 상용 UI 어휘 보강
  "亚亞产產亲親兴興养養兰蘭划劃刚剛别別剧劇劝勸办辦励勵劲勁区區协協卢盧却卻厉厲厦廈吨噸哗嘩唤喚",
  "嘱囑墙牆壮壯壶壺夸誇奖獎妇婦妈媽孙孫宫宮宽寬宾賓寻尋导導寿壽尔爾尘塵尝嘗屉屜届屆屡屢岛島岭嶺",
  "帅帥师師带帶庐廬库庫庙廟弥彌弯彎径徑怀懷怜憐恳懇惧懼惭慚惯慣愤憤愿願戏戲摄攝摆擺晓曉栏欄样樣",
  "残殘毙斃浅淺渔漁湾灣湿濕滞滯滥濫烛燭烫燙牵牽狭狹猎獵盐鹽碍礙税稅继繼绩績缴繳羁羈脉脈苏蘇获獲",
].join("");

// 🔴 상한은 실측값이고 **내려가기만 한다**. 올려서 통과시키지 않는다.
const ZH_CN_TRAD_CEILING = 0;
const ZH_TW_SIMP_CEILING = 93;
const ZH_PAIR_FLOOR = 500;

const zhSimplifiedOnly = new Set();
const zhTraditionalOnly = new Set();
for (let i = 0; i < ZH_PAIRS.length; i += 2) {
  const simplified = ZH_PAIRS[i];
  const traditional = ZH_PAIRS[i + 1];
  assert.ok(simplified && traditional, `ZH_PAIRS: index ${i} 에서 쌍이 끊깁니다(홀수 길이)`);
  assert.notEqual(
    simplified,
    traditional,
    `ZH_PAIRS: index ${i} 의 두 글자가 같습니다("${simplified}") — 쌍 정렬이 한 칸 밀렸습니다.`,
  );
  zhSimplifiedOnly.add(simplified);
  zhTraditionalOnly.add(traditional);
}
// 오타로 한 글자가 양쪽에 들어가면 그 글자는 어느 로케일에서도 정상인데 늘 걸린다.
for (const ch of zhSimplifiedOnly) {
  assert.ok(
    !zhTraditionalOnly.has(ch),
    `ZH_PAIRS: "${ch}" 가 간체 쪽과 번체 쪽에 모두 있습니다 — 쌍이 어긋났습니다.`,
  );
}
// fail-closed: 표가 잘리면 "혼입 0" 으로 조용히 통과한다.
assert.ok(
  zhSimplifiedOnly.size >= ZH_PAIR_FLOOR,
  `ZH_PAIRS 가 ${zhSimplifiedOnly.size}쌍뿐입니다(최소 ${ZH_PAIR_FLOOR}). 표가 비면 이 검사는 대상 0개로 통과합니다.`,
);

/** payment.** 아래 문자열 잎을 (경로, 값) 으로 전부 편다. */
function paymentLeaves(node, path, out) {
  if (typeof node === "string") {
    out.push([path, node]);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) paymentLeaves(value, `${path}.${key}`, out);
  }
  return out;
}

const zhReport = [];
for (const [locale, forbidden, ceiling, label] of [
  ["zh-cn", zhTraditionalOnly, ZH_CN_TRAD_CEILING, "번체"],
  ["zh-tw", zhSimplifiedOnly, ZH_TW_SIMP_CEILING, "간체"],
]) {
  const leaves = paymentLeaves(dictionaries[locale]?.payment, "payment", []);
  assert.ok(
    leaves.length >= 100,
    `${locale}: payment.* 문자열이 ${leaves.length}개뿐입니다 — 사전 구조가 바뀌었습니다(자형 검사가 헛돕니다).`,
  );
  const offenders = [];
  for (const [path, value] of leaves) {
    const hits = [...new Set([...value].filter((ch) => forbidden.has(ch)))];
    if (hits.length) offenders.push(`${path} (${hits.join("")})`);
  }
  assert.ok(
    offenders.length <= ceiling,
    `${locale}: payment.* 에 ${label} 자형이 섞인 키가 ${offenders.length}개입니다(상한 ${ceiling}).\n`
      + `    ${offenders.slice(0, 10).join("\n    ")}\n`
      + `  상한을 올려서 통과시키지 마세요 — 이 상한은 줄어드는 방향으로만 움직입니다.`,
  );
  assert.equal(
    offenders.length,
    ceiling,
    `${locale}: ${label} 혼입이 ${offenders.length}개로 줄었습니다(상한 ${ceiling}). `
      + `상한 상수를 ${offenders.length} 로 낮춰 되돌아가지 못하게 잠그세요.`,
  );
  zhReport.push(`${locale} ${offenders.length}/${leaves.length}`);
}

// ── 6) CI 트리거 커버리지 ──────────────────────────────────────────────────────────────
// 🔴 검사기가 멀쩡한 것과 검사기가 **실행되는** 것은 다른 문제다. 이 스크립트가 여는 파일이
// 트리거 목록에 없으면, 그 파일만 바꾼 PR 에서는 게이트가 초록인 채로 통과한다.
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));

function gateCovers(rel) {
  // 🔴 공용 모듈에 위임한다. 이 사본은 `**` 센티널로 **공백 한 칸**을 썼다 — 패턴에 공백이
  // 들어오는 날 조용히 오작동한다(`paths` 는 사람이 쓰는 목록이다). parity 쪽 사본은 같은
  // 자리에 리터럴 NUL 을 써서 git 이 그 파일을 바이너리로 취급했다.
  return gateCoversAny(gatePatterns, rel);
}

const READ_PATHS = [
  SHELL,
  REACT_CLIENT,
  STANDALONE,
  CORE,
  ...I18N_LOCALES.map((locale) => `public/i18n/${locale}.json`),
];
for (const rel of READ_PATHS) {
  assert.ok(
    gateCovers(rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 결제 문구 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(
  `[verify-payment-copy-dictionary] PASS `
    + `(${copy.size} literal keys + ${waitKeyCount} derived wait keys x ${I18N_LOCALES.length} locales, `
    + `${SOURCES.length} wrappers, ${READ_PATHS.length} gate-triggered paths, `
    + `zh ${zhReport.join(" / ")})`,
);
