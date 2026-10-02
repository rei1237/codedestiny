/**
 * 자미두수 별 강약(묘왕리함) — 원표기와 출처를 칸마다 보존하는 정본.
 *
 * 여기 있는 이유: 강약표가 세 벌(셸 js/saju-engine.js ZW_CLASSICAL_STATE — 2026-10-01 S4 에서 이 정본의
 * 사본 ZW_STAR_STRENGTH 로 교체 · 워커
 * worker/lib/ziwei-ai-chart.js ZIWEI_BRIGHTNESS_TABLE — S5 에서 교체 · 앱 app/_lib/ziwei-strength.ts ZIWEI_CLASSICAL_STATE —
 * 같은 S4 에서 이 모듈을 읽도록 교체)
 * 있는데 셋 다 출처 주석이 없고, 워커는 normalizeBrightnessLevel 로 왕→묘, 약→리, 한→평 을
 * 접어 원표기를 잃는다. 상담이 강약을 근거로 쓰려면 "어느 책의 어느 편에 무엇이라 적혀
 * 있었는가"가 남아 있어야 한다. 배치 위치가 `lib/` 인 이유는 lib/ziwei-minor-limit.js 머리말과 같다.
 *
 * 🔴 층위(칸마다 basis 로 남는다):
 *    1) classical — 『紫微斗數全書』 권3 「论诸星同垣各司所宜分别富贵贫贱夭寿」 의 별머리 줄
 *       (예: `紫微 庙丑未午 旺寅申卯酉巳亥 平子 无陷`). 위키문헌 리비전을 고정해 원문 그대로 싣고
 *       여기서 파싱한다. 원전이 적은 칸은 언제나 원전을 따른다.
 *    2) 원전이 적지 않은 칸만 iztro(MIT) 표로 채우고, 두 번째 현대 표 紫微人生 「甲級星廟旺利陷表」와 대조해
 *       basis 를 정한다 — 같으면 modern-confirmed, 다르면 disputed(iztro 값 유지·紫微人生 은 dissent),
 *       紫微人生 에 값이 없으면 modern-single. 규칙은 resolveZiweiStrengthCell 한곳에 둔다.
 *       2026-10-02 대조: 채운 54칸(주성 42·6성 12)이 54/54 같다.
 *       🔴 紫微人生 은 iztro(2023)보다 앞선 표(2011 웨이백 스냅샷)지만 iztro 와 240칸이 전부 같아 같은 계열일 수
 *       있다(추정). modern-confirmed 는 "현대 표 두 곳이 같은 값"이지 독립 유도가 아니다 — 원전만큼 단단하지 않다.
 *    3) 원전 칸도 두 현대 표와 대조해 같은 출처는 confirmedBy, 다른 출처는 dissent 배열로 남긴다(값은 원전).
 *       iztro·紫微人生 모두 원전 기재 178칸 중 176칸(주성 125/126·6성 51/52)이 같다. 다른 두 칸
 *       (천기 辰 원전 旺/현대 利, 文曲 寅 원전 陷/현대 平)은 원전 값을 유지하고 이견만 기록한다 —
 *       2026-10-02 사용자 결정, docs/handoff/2026-10-01-ziwei-strength-consultation.md.
 *    기존 레포 표는 원전 기재 126칸 중 49칸만 같아 상담에 쓰지 않는다(ZIWEI_LEGACY_MAIN_STRENGTH_TABLE).
 *
 * 🔴 범위(2026-10-01 사용자 결정): 14주성 + 원전에 줄이 있는 보조·살성 6성(문창·문곡·경양·타라·
 *    화성·영성). 그 밖의 별(좌보·우필·천괴·천월·지공·지겁 …)은 `not-rated` — 강약을 만들지 않는다.
 *    경양·타라는 녹존 양옆에만 앉으므로 못 앉는 지지 8칸은 `impossible` 이다(빈 값이 정답).
 *
 * 🔴 모르는 표기·없는 값을 평·함으로 채우지 않는다. 약·이·실 같은 표기는 유파마다 뜻이 달라
 *    (워커는 이→리, 앱은 이→평) 어느 쪽으로도 접지 않는다. 불(不)은 iztro 의 不得地로 독립 등급이다.
 *
 * 🔴 지지는 문자가 아니라 **인덱스**(자0 … 해11)로만 다룬다 — lib/ziwei-minor-limit.js 규칙.
 *    별 이름은 세 엔진이 모두 한글이라 문자열 그대로 쓴다.
 */

export const ZIWEI_STRENGTH_SOURCES = Object.freeze({
  quanshu: Object.freeze({
    id: "quanshu-v3-tongyuan",
    work: "紫微斗數全書",
    section: "卷三 论诸星同垣各司所宜分别富贵贫贱夭寿 (별머리 줄)",
    edition: "위키문헌 통행본(청대 표기, 저본 미기재)",
    url: "https://zh.wikisource.org/w/index.php?title=%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%89&oldid=2268626",
    revision: 2268626,
    kind: "classical-direct",
    checkedAt: "2026-10-01",
  }),
  iztro: Object.freeze({
    id: "iztro-stars-ts",
    work: "iztro src/data/stars.ts (MIT)",
    section: "STARS_INFO brightness — 寅부터 12칸",
    url: "https://github.com/SylarLong/iztro/blob/bb1781cc5da481b1e741ec4da4e4936e91ab6a36/src/data/stars.ts",
    revision: "bb1781cc5da481b1e741ec4da4e4936e91ab6a36",
    kind: "modern-extension",
    checkedAt: "2026-10-01",
  }),
  rensheng: Object.freeze({
    id: "ziwei-rensheng-jiaji",
    work: "紫微人生",
    section: "甲級星廟旺利陷表 — 子부터 12행 × 7등급 열(big5)",
    url: "http://211-75-223-181.hinet-ip.hinet.net/tzyy_wei/ji_been/02.htm",
    archive: "https://web.archive.org/web/20111109010440/http://211-75-223-181.hinet-ip.hinet.net/tzyy_wei/ji_been/02.htm",
    revision: "웨이백 20111109010440 — 2026-10-02 현재 페이지와 12행 동일",
    kind: "modern-extension",
    checkedAt: "2026-10-02",
    lineage: "iztro 와 240칸이 모두 같다 — 같은 계열일 수 있어(추정) 독립 유도의 증거로 쓰지 않는다.",
  }),
});

export const ZIWEI_LEGACY_STRENGTH_META = Object.freeze({
  id: "cd-legacy-main-14x12",
  provenance: "옛 js/saju-engine.js ZW_CLASSICAL_STATE(2026-10-01 S4 에서 제거) 주성 14행(옛 워커 ZIWEI_BRIGHTNESS_TABLE — S5 에서 제거 — 과 같은 원자료). 출처·유파·판본 미기재",
  verification: "unverified — 원전 기재 126칸 중 49칸 일치(2026-10-01)",
});

/** 강약을 매기는 별 — 주성은 워커 엔진 MAIN_STARS 순서. id 는 iztro 와 같은 병음 slug, hanja 는 worker/lib/ziwei-hanja.js 와 같은 글자. */
export const ZIWEI_RATED_STAR_META = Object.freeze([
  Object.freeze({ id: "ziwei", name: "자미", hanja: "紫微", kind: "main" }),
  Object.freeze({ id: "tianji", name: "천기", hanja: "天機", kind: "main" }),
  Object.freeze({ id: "taiyang", name: "태양", hanja: "太陽", kind: "main" }),
  Object.freeze({ id: "wuqu", name: "무곡", hanja: "武曲", kind: "main" }),
  Object.freeze({ id: "tiantong", name: "천동", hanja: "天同", kind: "main" }),
  Object.freeze({ id: "lianzhen", name: "염정", hanja: "廉貞", kind: "main" }),
  Object.freeze({ id: "tianfu", name: "천부", hanja: "天府", kind: "main" }),
  Object.freeze({ id: "taiyin", name: "태음", hanja: "太陰", kind: "main" }),
  Object.freeze({ id: "tanlang", name: "탐랑", hanja: "貪狼", kind: "main" }),
  Object.freeze({ id: "jumen", name: "거문", hanja: "巨門", kind: "main" }),
  Object.freeze({ id: "tianxiang", name: "천상", hanja: "天相", kind: "main" }),
  Object.freeze({ id: "tianliang", name: "천량", hanja: "天梁", kind: "main" }),
  Object.freeze({ id: "qisha", name: "칠살", hanja: "七殺", kind: "main" }),
  Object.freeze({ id: "pojun", name: "파군", hanja: "破軍", kind: "main" }),
  Object.freeze({ id: "wenchang", name: "문창", hanja: "文昌", kind: "assistant" }),
  Object.freeze({ id: "wenqu", name: "문곡", hanja: "文曲", kind: "assistant" }),
  Object.freeze({ id: "qingyang", name: "경양", hanja: "擎羊", kind: "malefic" }),
  Object.freeze({ id: "tuoluo", name: "타라", hanja: "陀羅", kind: "malefic" }),
  Object.freeze({ id: "huoxing", name: "화성", hanja: "火星", kind: "malefic" }),
  Object.freeze({ id: "lingxing", name: "영성", hanja: "鈴星", kind: "malefic" }),
]);

/**
 * 원전 별머리 줄 — 위키문헌 리비전 2268626 의 글자 그대로(간체 섞임·`贪狠` 오자 포함).
 * 고치지 않는다: 원문 대조가 이 파일의 존재 이유다. 보조·살성 줄은 같은 권 409·416·537·552·556·562행.
 */
export const ZIWEI_QUANSHU_STRENGTH_LINES = Object.freeze({
  자미: "紫微 庙丑未午 旺寅申卯酉巳亥 平子 无陷",
  천부: "天府 庙子丑未寅辰戌 旺午酉 地卯巳申亥 无陷",
  천상: "天相 庙子午丑寅申 地辰戌巳亥未 陷卯酉",
  천량: "天梁 庙子午寅卯辰戌 旺丑未 地酉 陷申巳亥",
  천동: "天同 庙巳亥 旺子申 陷午",
  천기: "天机 庙子午 旺辰酉 陷丑未",
  태양: "太阳 庙卯 旺寅辰巳午 陷子",
  태음: "太阴 庙亥子丑 旺寅酉戌 陷卯辰巳",
  무곡: "武曲 庙辰戌丑未 旺子午 平巳亥 无失陷",
  탐랑: "贪狠 庙辰戌丑未 旺子午 陷巳亥",
  염정: "廉贞 庙寅申 利辰戌丑未 陷巳亥",
  거문: "巨门 庙寅申卯酉 旺子午巳亥 陷辰戌",
  칠살: "七杀 庙辰戌丑未寅申 旺子午卯酉 平巳亥 无陷",
  파군: "破军 庙子午 旺辰戌丑未 陷卯酉",
  문창: "文昌 庙巳酉丑 地申子辰 陷寅午戌",
  문곡: "文曲 庙巳酉丑 地申子辰 陷寅午戌",
  경양: "擎羊 庙辰戌丑未 陷子午卯酉",
  타라: "陀罗 庙辰戌丑未 陷寅申巳亥",
  화성: "火星 庙寅午戌 地巳酉丑 陷申子辰",
  영성: "铃星 庙寅午戌 地巳酉丑 陷申子辰",
});

/**
 * iztro brightness 배열 — 커밋 bb1781c 의 값 그대로, **寅부터** 12칸(iztro 순서).
 * '' 는 iztro 도 비워 둔 칸(경양·타라가 못 앉는 지지). 원전이 적은 칸에는 쓰지 않는다 — 대조용이다.
 */
export const ZIWEI_IZTRO_BRIGHTNESS_FROM_YIN = Object.freeze({
  자미: Object.freeze(["wang", "wang", "de", "wang", "miao", "miao", "wang", "wang", "de", "wang", "ping", "miao"]),
  천기: Object.freeze(["de", "wang", "li", "ping", "miao", "xian", "de", "wang", "li", "ping", "miao", "xian"]),
  태양: Object.freeze(["wang", "miao", "wang", "wang", "wang", "de", "de", "ping", "bu", "xian", "xian", "bu"]),
  무곡: Object.freeze(["de", "li", "miao", "ping", "wang", "miao", "de", "li", "miao", "ping", "wang", "miao"]),
  천동: Object.freeze(["li", "ping", "ping", "miao", "xian", "bu", "wang", "ping", "ping", "miao", "wang", "bu"]),
  염정: Object.freeze(["miao", "ping", "li", "xian", "ping", "li", "miao", "ping", "li", "xian", "ping", "li"]),
  천부: Object.freeze(["miao", "de", "miao", "de", "wang", "miao", "de", "wang", "miao", "de", "miao", "miao"]),
  태음: Object.freeze(["wang", "xian", "xian", "xian", "bu", "bu", "li", "wang", "wang", "miao", "miao", "miao"]),
  탐랑: Object.freeze(["ping", "li", "miao", "xian", "wang", "miao", "ping", "li", "miao", "xian", "wang", "miao"]),
  거문: Object.freeze(["miao", "miao", "xian", "wang", "wang", "bu", "miao", "miao", "xian", "wang", "wang", "bu"]),
  천상: Object.freeze(["miao", "xian", "de", "de", "miao", "de", "miao", "xian", "de", "de", "miao", "miao"]),
  천량: Object.freeze(["miao", "miao", "miao", "xian", "miao", "wang", "xian", "de", "miao", "xian", "miao", "wang"]),
  칠살: Object.freeze(["miao", "wang", "miao", "ping", "wang", "miao", "miao", "wang", "miao", "ping", "wang", "miao"]),
  파군: Object.freeze(["de", "xian", "wang", "ping", "miao", "wang", "de", "xian", "wang", "ping", "miao", "wang"]),
  문창: Object.freeze(["xian", "li", "de", "miao", "xian", "li", "de", "miao", "xian", "li", "de", "miao"]),
  문곡: Object.freeze(["ping", "wang", "de", "miao", "xian", "wang", "de", "miao", "xian", "wang", "de", "miao"]),
  경양: Object.freeze(["", "xian", "miao", "", "xian", "miao", "", "xian", "miao", "", "xian", "miao"]),
  타라: Object.freeze(["xian", "", "miao", "xian", "", "miao", "xian", "", "miao", "xian", "", "miao"]),
  화성: Object.freeze(["miao", "li", "xian", "de", "miao", "li", "xian", "de", "miao", "li", "xian", "de"]),
  영성: Object.freeze(["miao", "li", "xian", "de", "miao", "li", "xian", "de", "miao", "li", "xian", "de"]),
});

/**
 * 紫微人生 「甲級星廟旺利陷表」 — 표 머리의 7열 그대로, **子부터** 12행(웨이백 20111109010440 의 글자 그대로, big5 → 유니코드).
 * 칸은 별 약자를 이어 쓴 문자열이다(紫=자미 … 鈴=영성, 祿=녹존). 등급을 정하지 않는다 — 원전·iztro 값의 대조용이다.
 */
export const ZIWEI_RENSHENG_STRENGTH_COLUMNS = Object.freeze(["廟", "旺", "得地", "利益", "平和", "不得地", "陷"]);
export const ZIWEI_RENSHENG_STRENGTH_ROWS = Object.freeze([
  Object.freeze(["機府陰相梁破祿", "武同貪巨殺", "昌曲", "", "紫廉", "", "陽羊火鈴"]),
  Object.freeze(["紫武府陰貪相殺昌曲羊陀", "梁破", "火鈴", "廉", "", "陽同巨", "機"]),
  Object.freeze(["廉府巨相梁殺祿火鈴", "紫陽陰", "機武破", "同", "貪曲", "", "昌陀"]),
  Object.freeze(["陽巨梁祿", "紫機殺曲", "府", "武貪昌火鈴", "同廉", "", "陰相破羊"]),
  Object.freeze(["武府貪梁殺羊陀", "陽破", "紫相昌曲", "機廉", "同", "", "陰巨火鈴"]),
  Object.freeze(["同昌曲祿", "紫陽巨", "府相火鈴", "", "機武殺破", "", "廉陰貪梁陀"]),
  Object.freeze(["紫機相梁破祿火鈴", "陽武府貪巨殺", "", "", "廉", "陰", "同昌曲羊"]),
  Object.freeze(["紫武府貪殺羊陀", "梁破曲", "陽相", "廉昌火鈴", "", "同陰巨", "機"]),
  Object.freeze(["廉巨相殺祿", "紫同", "機陽武府破昌曲", "陰", "貪", "", "梁陀火鈴"]),
  Object.freeze(["巨昌曲祿", "紫機府陰殺", "梁火鈴", "武貪", "陽同廉", "", "相破羊"]),
  Object.freeze(["武府貪梁殺羊陀火鈴", "陰破", "紫相", "機廉", "同", "陽", "巨昌曲"]),
  Object.freeze(["同陰祿", "紫巨曲", "府相", "昌火鈴", "機武殺破", "", "陽廉貪梁陀"]),
]);

/**
 * 기존 레포 표(출처 미기재) — 원표기 그대로, 지지 인덱스 순. 상담에 쓰지 않는다.
 * 셸·워커 표의 주성 행과 한 글자도 다르면 안 된다(__tests__/ui/ziwei-star-strength.test.mjs 가 대조).
 * 앱 사본은 태음 寅 을 '평' 으로 접어 두었다 — 원자료는 '한'.
 */
export const ZIWEI_LEGACY_MAIN_STRENGTH_TABLE = Object.freeze({
  자미: Object.freeze(["평", "묘", "왕", "왕", "묘", "평", "묘", "묘", "평", "평", "묘", "평"]),
  천기: Object.freeze(["평", "함", "왕", "왕", "평", "리", "함", "평", "묘", "왕", "평", "묘"]),
  태양: Object.freeze(["함", "함", "묘", "묘", "왕", "왕", "묘", "왕", "평", "함", "함", "함"]),
  무곡: Object.freeze(["묘", "왕", "리", "평", "묘", "평", "평", "평", "왕", "묘", "함", "리"]),
  천동: Object.freeze(["왕", "함", "평", "묘", "함", "평", "함", "묘", "평", "평", "리", "왕"]),
  염정: Object.freeze(["평", "평", "묘", "평", "묘", "함", "묘", "묘", "묘", "평", "평", "평"]),
  천부: Object.freeze(["묘", "묘", "왕", "평", "묘", "평", "묘", "묘", "왕", "평", "묘", "평"]),
  태음: Object.freeze(["왕", "묘", "한", "평", "함", "함", "함", "평", "평", "묘", "묘", "왕"]),
  탐랑: Object.freeze(["왕", "평", "묘", "리", "평", "묘", "왕", "평", "묘", "묘", "평", "묘"]),
  거문: Object.freeze(["왕", "묘", "평", "함", "함", "묘", "함", "묘", "묘", "평", "함", "묘"]),
  천상: Object.freeze(["묘", "묘", "왕", "평", "왕", "리", "묘", "묘", "왕", "평", "묘", "평"]),
  천량: Object.freeze(["평", "묘", "묘", "묘", "묘", "평", "묘", "함", "묘", "평", "묘", "함"]),
  칠살: Object.freeze(["묘", "평", "묘", "평", "왕", "평", "묘", "왕", "묘", "평", "묘", "평"]),
  파군: Object.freeze(["왕", "함", "묘", "함", "묘", "함", "왕", "함", "함", "함", "묘", "리"]),
});

/**
 * 등급. 묘≠왕, 불≠평≠함, 한≠평 — 접지 않는다. rank 는 강약 순서(묘 1 … 함 7)이고 길흉이 아니다.
 * label 은 상담 입력용 짧은 풀이다. "그 별의 성질이 얼마나 또렷하게·안정적으로 드러나는가"를 말한다 —
 * 원전도 「入庙不加吉，平等」(권3 论人命入格)이라 묘왕만으로 길하다 하지 않는다.
 * 한(閑)은 레포 옛 표에만 있는 표기라 rank 를 주지 않는다.
 */
const GRADES = Object.freeze({
  묘: Object.freeze({ grade: "miao", hanja: "廟", rank: 1, label: "성질이 가장 또렷하고 안정적으로 드러나는 자리" }),
  왕: Object.freeze({ grade: "wang", hanja: "旺", rank: 2, label: "성질이 힘 있게 드러나는 자리" }),
  득: Object.freeze({ grade: "de", hanja: "得地", rank: 3, label: "자리를 얻어 무난히 드러나는 자리" }),
  리: Object.freeze({ grade: "li", hanja: "利", rank: 4, label: "쓸 만하지만 힘이 한 단계 덜한 자리" }),
  평: Object.freeze({ grade: "ping", hanja: "平", rank: 5, label: "중간 — 동궁·사화·삼방의 영향을 크게 받는 자리" }),
  불: Object.freeze({ grade: "bu", hanja: "不得地", rank: 6, label: "자리를 얻지 못해 힘이 약한 자리(평과 함 사이)" }),
  함: Object.freeze({ grade: "xian", hanja: "陷", rank: 7, label: "성질이 막히거나 비틀려 드러나기 쉬운 자리 — 보완 조건을 함께 봐야 함" }),
  한: Object.freeze({ grade: "xian_idle", hanja: "閑", rank: null, label: "힘이 한가해 잘 쓰이지 않는 자리(평과 구분)" }),
});

/**
 * 프롬프트 사실 블록에 `자미(묘)` 표기(worker/lib/ziwei-ai-chart.js formatStarWithBrightness)와 함께 싣는 범례 한 줄.
 * 워커 경로(ziwei-ai·심층 리포트·master-love-codex)가 같은 문장을 읽는다. 여기 두는 이유: 차트 빌더를 목으로 바꾸는
 * 테스트가 많아, 빌더 쪽 export 로 두면 목마다 이 키를 따라 적어야 한다.
 */
export const ZIWEI_STRENGTH_LEGEND = "별 이름 뒤 괄호가 강약 7등급(길흉 아님). 묘·왕·득·리·평·불·함 순으로 그 별의 성질이 또렷하게 드러남. 평은 동궁·사화·삼방 영향이 크고, 불·함은 보완 조건을 함께 봐야 함. 괄호가 없는 별은 강약을 매기지 않음(추정 금지).";

// 뜻이 하나로 정해지는 별칭만. 약·이·실·극함 등은 일부러 넣지 않는다(머리말).
const ALIASES = Object.freeze({
  묘: "묘", 廟: "묘", 庙: "묘", 묘지: "묘", "◎": "묘", miao: "묘",
  왕: "왕", 旺: "왕", 왕지: "왕", wang: "왕",
  득: "득", 得: "득", 득지: "득", 得地: "득", 地: "득", "○": "득", de: "득",
  리: "리", 利: "리", 利益: "리", 리지: "리", li: "리",
  평: "평", 平: "평", 平和: "평", 평지: "평", "△": "평", ping: "평",
  불: "불", 不: "불", 不得地: "불", bu: "불",
  함: "함", 陷: "함", 함지: "함", "×": "함", xian: "함",
  한: "한", 閑: "한", 閒: "한", 闲: "한",
});

const BRANCH_HAN = "子丑寅卯辰巳午未申酉戌亥";

/**
 * 원전 줄 → 지지 인덱스별 원표기. 등급 글자로 시작하는 토큰만 읽고, `无陷`·`无失陷` 은
 * "이 별에는 함지가 없다"는 진술로 따로 남긴다(기재 안 된 지지를 채우는 데 쓰지 않는다).
 */
export function parseQuanshuStrengthLine(line) {
  const [, ...tokens] = String(line || "").trim().split(/\s+/);
  const cells = Array(12).fill(null);
  let noXian = false;
  for (const token of tokens) {
    if (/^无(失)?陷$/.test(token)) { noXian = true; continue; }
    const mark = token[0];
    if (!ALIASES[mark]) continue;
    for (const ch of token.slice(1)) {
      const i = BRANCH_HAN.indexOf(ch);
      if (i >= 0) cells[i] = mark;
    }
  }
  return { cells: Object.freeze(cells), noXian };
}

/** iztro 의 寅부터 배열 → 지지 인덱스 순(子0). */
export function iztroRowByBranchIndex(row) {
  return Object.freeze(Array.from({ length: 12 }, (_, b) => row?.[(b + 10) % 12] || null));
}

/** 紫微人生 표의 별 약자. 祿(녹존)은 이 모듈이 강약을 매기지 않는 별이라 읽지 않는다(not-rated). */
const RENSHENG_GLYPH_STAR = Object.freeze({
  紫: "자미", 機: "천기", 陽: "태양", 武: "무곡", 同: "천동", 廉: "염정", 府: "천부", 陰: "태음", 貪: "탐랑", 巨: "거문",
  相: "천상", 梁: "천량", 殺: "칠살", 破: "파군", 昌: "문창", 曲: "문곡", 羊: "경양", 陀: "타라", 火: "화성", 鈴: "영성",
});
const RENSHENG_UNRATED_GLYPHS = "祿";

/**
 * 紫微人生 행 → 별마다 지지 인덱스별 원표기(그 칸의 열 머리). 모르는 약자와 한 행 안의 중복은 버리지 않고
 * `지지:글자` 로 보고한다 — 테스트가 둘 다 빈 배열임을 단언한다(조용히 통과시키지 않는다).
 */
export function parseRenshengStrengthRows(rows = ZIWEI_RENSHENG_STRENGTH_ROWS, columns = ZIWEI_RENSHENG_STRENGTH_COLUMNS) {
  const cells = Object.fromEntries(Object.values(RENSHENG_GLYPH_STAR).map((star) => [star, Array(12).fill(null)]));
  const unknownGlyphs = [];
  const duplicates = [];
  rows.forEach((row, b) => row.forEach((text, col) => {
    for (const ch of String(text || "")) {
      if (RENSHENG_UNRATED_GLYPHS.includes(ch)) continue;
      const star = RENSHENG_GLYPH_STAR[ch];
      if (!star) unknownGlyphs.push(`${BRANCH_HAN[b]}:${ch}`);
      else if (cells[star][b]) duplicates.push(`${BRANCH_HAN[b]}:${ch}`);
      else cells[star][b] = columns[col];
    }
  }));
  return {
    cells: Object.freeze(Object.fromEntries(Object.entries(cells).map(([star, row]) => [star, Object.freeze(row)]))),
    unknownGlyphs,
    duplicates,
  };
}

const QUANSHU = Object.freeze(Object.fromEntries(
  Object.entries(ZIWEI_QUANSHU_STRENGTH_LINES).map(([star, line]) => [star, parseQuanshuStrengthLine(line)]),
));
const IZTRO = Object.freeze(Object.fromEntries(
  Object.entries(ZIWEI_IZTRO_BRIGHTNESS_FROM_YIN).map(([star, row]) => [star, iztroRowByBranchIndex(row)]),
));
const RENSHENG = parseRenshengStrengthRows().cells;

const RATED_BY_NAME = new Map(ZIWEI_RATED_STAR_META.map((s) => [s.name, s]));

export function isZiweiMainStar(name) {
  return RATED_BY_NAME.get(String(name || "").trim())?.kind === "main";
}

export function isZiweiRatedStar(name) {
  return RATED_BY_NAME.has(String(name || "").trim());
}

/**
 * 원표기 → { raw, rawKo, grade, hanja, rank, label, status }.
 * status: 'mapped'(알려진 표기) | 'unmapped'(값은 있으나 모르는 표기) | 'missing'(값 없음).
 */
export function normalizeZiweiStrengthNotation(raw) {
  const text = raw == null ? "" : String(raw).trim();
  if (!text) return { raw: null, rawKo: null, grade: null, hanja: null, rank: null, label: null, status: "missing" };
  const key = ALIASES[text];
  if (!key) return { raw: text, rawKo: null, grade: null, hanja: null, rank: null, label: null, status: "unmapped" };
  const g = GRADES[key];
  return { raw: text, rawKo: key, grade: g.grade, hanja: g.hanja, rank: g.rank, label: g.label, status: "mapped" };
}

/**
 * 칸 하나의 채택 규칙(머리말 층위 1~3). 입력은 출처별 원표기, 반환은 { raw, basis, sourceId, confirmedBy, dissent, note }
 * 또는 null(원전·iztro 모두 빈 칸 = 그 별이 못 앉는 자리). confirmedBy 는 같은 등급을 적은 다른 출처 id 배열,
 * dissent 는 다른 등급을 적은 출처 [{ sourceId, raw, grade }] — 해당이 없으면 null.
 * 紫微人生 은 등급을 정하지 않는다: 원전 칸은 원전, 원전 공란은 iztro 값을 쓰고 紫微人生 은 확인·이견으로만 남는다.
 */
export function resolveZiweiStrengthCell({ quanshu = null, iztro = null, rensheng = null, noXian = false } = {}) {
  const sources = ZIWEI_STRENGTH_SOURCES;
  const compare = (grade, others) => {
    const confirmedBy = [];
    const dissent = [];
    for (const [sourceId, raw] of others) {
      const other = normalizeZiweiStrengthNotation(raw).grade;
      if (!other) continue;
      if (other === grade) confirmedBy.push(sourceId);
      else dissent.push({ sourceId, raw, grade: other });
    }
    return { confirmedBy: confirmedBy.length ? confirmedBy : null, dissent: dissent.length ? dissent : null };
  };
  if (quanshu) {
    const grade = normalizeZiweiStrengthNotation(quanshu).grade;
    return { raw: quanshu, basis: "classical", sourceId: sources.quanshu.id, ...compare(grade, [[sources.iztro.id, iztro], [sources.rensheng.id, rensheng]]), note: null };
  }
  if (!iztro) return null;
  const { confirmedBy, dissent } = compare(normalizeZiweiStrengthNotation(iztro).grade, [[sources.rensheng.id, rensheng]]);
  const basis = confirmedBy ? "modern-confirmed" : dissent ? "disputed" : "modern-single";
  const gap = noXian ? "원전은 이 지지를 적지 않았고(이 별에는 함지가 없다고만 적음) " : "원전은 이 지지를 적지 않았고 ";
  const fill = {
    "modern-confirmed": "현대 표(iztro)로 채운 값이다. 다른 현대 표(紫微人生)도 같은 값이지만 같은 계열일 수 있다.",
    disputed: "현대 표(iztro)로 채운 값이다. 다른 현대 표(紫微人生)는 다른 등급을 적었다.",
    "modern-single": "현대 표 하나로 채운 값이다.",
  }[basis];
  return { raw: iztro, basis, sourceId: sources.iztro.id, confirmedBy, dissent, note: gap + fill };
}

/**
 * 한 별의 강약. 반환 status:
 *  'rated'(등급 있음) | 'impossible'(그 별이 구조상 못 앉는 지지) | 'not-rated'(강약을 매기지 않는 별)
 *  | 'missing'(지지 인덱스 없음) | 'unmapped'(표 값이 모르는 표기 — 데이터 결함).
 * basis: 'classical'(원전) | 'modern-confirmed'(원전 미기재, iztro = 紫微人生) | 'disputed'(원전 미기재, iztro ≠ 紫微人生 —
 *  iztro 값) | 'modern-single'(원전 미기재, iztro 1개 출처). confirmedBy·dissent 는 resolveZiweiStrengthCell 참고.
 * @param {string} star 한글 별 이름('자미')
 * @param {number} branchIndex 지지 인덱스 0~11
 */
export function starStrength(star, branchIndex) {
  const name = String(star || "").trim();
  const meta = RATED_BY_NAME.get(name);
  const base = { star: name, id: meta?.id ?? null, hanja: meta?.hanja ?? null, kind: meta?.kind ?? null, raw: null, rawKo: null, rawHanja: null, grade: null, rank: null, label: null, basis: null, sourceId: null, confirmedBy: null, dissent: null, note: null };
  if (!meta) return { ...base, status: "not-rated" };
  if (!(Number.isInteger(branchIndex) && branchIndex >= 0 && branchIndex < 12)) return { ...base, status: "missing" };
  const classical = QUANSHU[name];
  const picked = resolveZiweiStrengthCell({
    quanshu: classical.cells[branchIndex],
    iztro: IZTRO[name][branchIndex],
    rensheng: RENSHENG[name]?.[branchIndex] ?? null,
    noXian: classical.noXian,
  });
  if (!picked) return { ...base, status: "impossible", note: "이 별은 이 지지에 앉지 않는다." };
  const n = normalizeZiweiStrengthNotation(picked.raw);
  return {
    ...base,
    raw: n.raw,
    rawKo: n.rawKo,
    rawHanja: n.hanja,
    grade: n.grade,
    rank: n.rank,
    label: n.label,
    basis: picked.basis,
    sourceId: picked.sourceId,
    confirmedBy: picked.confirmedBy,
    dissent: picked.dissent,
    note: picked.note,
    status: n.status === "mapped" ? "rated" : "unmapped",
  };
}

/** 기존 레포 표 값(비교·후속 통일용). 상담 입력에 쓰지 않는다. */
export function legacyMainStarStrength(star, branchIndex) {
  const row = ZIWEI_LEGACY_MAIN_STRENGTH_TABLE[String(star || "").trim()];
  if (!row || !(Number.isInteger(branchIndex) && branchIndex >= 0 && branchIndex < 12)) return null;
  return { ...normalizeZiweiStrengthNotation(row[branchIndex]), tableId: ZIWEI_LEGACY_STRENGTH_META.id };
}
