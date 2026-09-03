"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./VedicAiClient.module.css";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AnyRecord = Record<string, unknown>;

const SIGN_NUMBERS: Record<string, number> = {
  Aries: 1, Taurus: 2, Gemini: 3, Cancer: 4, Leo: 5, Virgo: 6,
  Libra: 7, Scorpio: 8, Sagittarius: 9, Capricorn: 10, Aquarius: 11, Pisces: 12,
};

const GRAHA_SHORT: Record<string, string> = {
  "태양": "태", "달": "달", "화성": "화", "수성": "수", "목성": "목",
  "금성": "금", "토성": "토", "라후": "라", "케투": "케",
  Sun: "태", Moon: "달", Mars: "화", Mercury: "수", Jupiter: "목",
  Venus: "금", Saturn: "토", Rahu: "라", Ketu: "케",
};

// 북인도식(다이아몬드) 차트 12바바 폴리곤 좌표. viewBox 0 0 200 200 기준,
// 1하우스가 상단 중앙 마름모이며 반시계 방향으로 진행하는 전통 배치.
const HOUSE_POLYGONS: Array<{ house: number; points: string; cx: number; cy: number }> = [
  { house: 1, points: "100,0 150,50 100,100 50,50", cx: 100, cy: 50 },
  { house: 2, points: "0,0 100,0 50,50", cx: 50, cy: 22 },
  { house: 3, points: "0,0 50,50 0,100", cx: 22, cy: 50 },
  { house: 4, points: "0,100 50,50 100,100 50,150", cx: 50, cy: 100 },
  { house: 5, points: "0,100 50,150 0,200", cx: 22, cy: 150 },
  { house: 6, points: "0,200 50,150 100,200", cx: 50, cy: 178 },
  { house: 7, points: "100,200 50,150 100,100 150,150", cx: 100, cy: 150 },
  { house: 8, points: "100,200 150,150 200,200", cx: 150, cy: 178 },
  { house: 9, points: "200,200 150,150 200,100", cx: 178, cy: 150 },
  { house: 10, points: "200,100 150,150 100,100 150,50", cx: 150, cy: 100 },
  { house: 11, points: "200,100 150,50 200,0", cx: 178, cy: 50 },
  { house: 12, points: "200,0 100,0 150,50", cx: 150, cy: 22 },
];

type GrahaNature = "benefic" | "malefic";

type VedicChartCopy = {
  grahaLabel: Record<string, string>;
  grahaShortLabel: Record<string, string>;
  natureLabel: Record<GrahaNature, string>;
  rashiChartTitle: string;
  rashiChartSubtitle: string;
  rashiChartAriaLabel: string;
  svgGroupAriaLabel: string;
  noBhavaAriaLabel: string;
  noBirthTimeNotice: string;
  houseAriaLabel: (house: number, rashiKo: string, grahasText: string) => string;
  noGrahaLabel: string;
  houseDetailHeading: (house: number, rashiKo: string) => string;
  noMeaningFallback: string;
  lordPrefix: string;
  residingGrahaSuffix: (grahas: string) => string;
  noResidingGraha: string;
  chartDetailHint: string;
  dashaTimelineAriaLabel: string;
  dashaTimelineTitle: string;
  dashaTimelineSubtitle: string;
  dashaSegmentAriaLabel: (grahaLabel: string, natureLabel: string, start: string, end: string, years: number, isCurrent: boolean) => string;
  dashaSelectedInfo: (grahaLabel: string, start: string, end: string, years: number, isCurrentNow: boolean) => string;
  dashaProgressAriaLabel: (grahaLabel: string, percent: number, totalYears: string, elapsedYears: string) => string;
};

const VEDIC_CHART_COPY_EN: VedicChartCopy = {
  grahaLabel: { Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu" },
  grahaShortLabel: { Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke" },
  natureLabel: { benefic: "Benefic · gentle flow", malefic: "Malefic · challenging flow" },
  rashiChartTitle: "Rashi Chart (D1)",
  rashiChartSubtitle: "North Indian style · tap a bhava for its reading",
  rashiChartAriaLabel: "Rashi Chart D1 — tap a house to open its reading",
  svgGroupAriaLabel: "North Indian style Rashi Chart",
  noBhavaAriaLabel: "Rashi Chart",
  noBirthTimeNotice: "No birth time was given, so the lagna-based bhava layout isn't shown. Read by Moon, nakshatra, and dasha instead.",
  houseAriaLabel: (house, rashiKo, grahasText) => `House ${house} ${rashiKo} ${grahasText}`,
  noGrahaLabel: "No grahas",
  houseDetailHeading: (house, rashiKo) => `House ${house} · ${rashiKo}`,
  noMeaningFallback: "No meaning available for this bhava.",
  lordPrefix: "Lord",
  residingGrahaSuffix: (grahas) => ` · Grahas here: ${grahas}`,
  noResidingGraha: " · No grahas here",
  chartDetailHint: "Tap a bhava (house) on the chart to see its meaning and resident grahas. The number is the rashi (sign) number.",
  dashaTimelineAriaLabel: "Vimshottari Dasha timeline",
  dashaTimelineTitle: "Dasha Timeline, Vimshottari Dasha",
  dashaTimelineSubtitle: "Tap a segment to see its period · ▼ now",
  dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel} dasha (${natureLabel}) from ${start} to ${end}, ${years} years${isCurrent ? ", currently in progress" : ""}`,
  dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel} Mahadasha · ${start} ~ ${end} (${years} years)${isCurrentNow ? " · You're in this flow right now" : ""}`,
  dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel} Mahadasha progress ${percent} percent, ${elapsedYears} of ${totalYears} years elapsed`,
};

const VEDIC_CHART_COPY: Partial<Record<LoadingLocale, VedicChartCopy>> = {
  ko: {
    grahaLabel: { Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성", Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투" },
    grahaShortLabel: { Sun: "태", Moon: "달", Mars: "화", Mercury: "수", Jupiter: "목", Venus: "금", Saturn: "토", Rahu: "라", Ketu: "케" },
    natureLabel: { benefic: "길성 · 부드러운 흐름", malefic: "흉성 · 도전적 흐름" },
    rashiChartTitle: "라시 차트, Rashi Chart (D1)",
    rashiChartSubtitle: "북인도식 · 바바를 누르면 해설이 열립니다",
    rashiChartAriaLabel: "라시 차트 D1 — 하우스를 누르면 해설이 열립니다",
    svgGroupAriaLabel: "북인도식 라시 차트",
    noBhavaAriaLabel: "라시 차트",
    noBirthTimeNotice: "출생시간이 없어 라그나 기준 바바 배치를 그리지 않았습니다. 달·나크샤트라·다샤 중심으로 읽습니다.",
    houseAriaLabel: (house, rashiKo, grahasText) => `${house}하우스 ${rashiKo} ${grahasText}`,
    noGrahaLabel: "그라하 없음",
    houseDetailHeading: (house, rashiKo) => `${house}하우스 · ${rashiKo}`,
    noMeaningFallback: "이 바바의 의미 정보가 없습니다.",
    lordPrefix: "지배성",
    residingGrahaSuffix: (grahas) => ` · 머무는 그라하: ${grahas}`,
    noResidingGraha: " · 머무는 그라하 없음",
    chartDetailHint: "차트의 바바(칸)를 누르면 그 자리의 의미와 머무는 그라하를 보여드립니다. 숫자는 라시(별자리) 번호입니다.",
    dashaTimelineAriaLabel: "빈쇼타리 다샤 타임라인",
    dashaTimelineTitle: "다샤 타임라인, Vimshottari Dasha",
    dashaTimelineSubtitle: "구간을 누르면 기간이 보입니다 · ▼ 지금",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel} 다샤(${natureLabel}) ${start}부터 ${end}까지 ${years}년${isCurrent ? ", 현재 진행 중" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel} 마하다샤 · ${start} ~ ${end} (${years}년)${isCurrentNow ? " · 지금 이 흐름 안에 있습니다" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel} 마하다샤 진행률 ${percent}퍼센트, 전체 ${totalYears}년 중 ${elapsedYears}년 경과`,
  },
  en: VEDIC_CHART_COPY_EN,
  ja: {
    grahaLabel: { Sun: "太陽", Moon: "月", Mars: "火星", Mercury: "水星", Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "ラーフ", Ketu: "ケートゥ" },
    grahaShortLabel: { Sun: "太", Moon: "月", Mars: "火", Mercury: "水", Jupiter: "木", Venus: "金", Saturn: "土", Rahu: "ラ", Ketu: "ケ" },
    natureLabel: { benefic: "吉星 · 穏やかな流れ", malefic: "凶星 · 試練の流れ" },
    rashiChartTitle: "ラーシチャート, Rashi Chart (D1)",
    rashiChartSubtitle: "北インド式 · バーヴァをタップすると解説が開きます",
    rashiChartAriaLabel: "ラーシチャート D1 — ハウスをタップすると解説が開きます",
    svgGroupAriaLabel: "北インド式ラーシチャート",
    noBhavaAriaLabel: "ラーシチャート",
    noBirthTimeNotice: "出生時刻がないため、ラグナ基準のバーヴァ配置は表示されません。月・ナクシャトラ・ダシャーを中心にお読みください。",
    houseAriaLabel: (house, rashiKo, grahasText) => `第${house}ハウス ${rashiKo} ${grahasText}`,
    noGrahaLabel: "グラハなし",
    houseDetailHeading: (house, rashiKo) => `第${house}ハウス · ${rashiKo}`,
    noMeaningFallback: "このバーヴァの意味情報がありません。",
    lordPrefix: "支配星",
    residingGrahaSuffix: (grahas) => ` · 在住グラハ: ${grahas}`,
    noResidingGraha: " · 在住グラハなし",
    chartDetailHint: "チャートのバーヴァ(マス)をタップすると、その場所の意味と在住グラハが表示されます。数字はラーシ(星座)番号です。",
    dashaTimelineAriaLabel: "ヴィムショッタリ・ダシャー タイムライン",
    dashaTimelineTitle: "ダシャー タイムライン, Vimshottari Dasha",
    dashaTimelineSubtitle: "区間をタップすると期間が表示されます · ▼ 現在",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel}ダシャー(${natureLabel}) ${start}から${end}まで${years}年${isCurrent ? "、現在進行中" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel}マハーダシャー · ${start} ~ ${end} (${years}年)${isCurrentNow ? " · 現在この流れの中にいます" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel}マハーダシャー進行率${percent}パーセント、全${totalYears}年中${elapsedYears}年経過`,
  },
  "zh-CN": {
    grahaLabel: { Sun: "太阳", Moon: "月亮", Mars: "火星", Mercury: "水星", Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "罗睺", Ketu: "计都" },
    grahaShortLabel: { Sun: "日", Moon: "月", Mars: "火", Mercury: "水", Jupiter: "木", Venus: "金", Saturn: "土", Rahu: "罗", Ketu: "计" },
    natureLabel: { benefic: "吉星 · 平顺之流", malefic: "凶星 · 挑战之流" },
    rashiChartTitle: "拉希盘, Rashi Chart (D1)",
    rashiChartSubtitle: "北印度式 · 点击宫位查看解读",
    rashiChartAriaLabel: "拉希盘 D1 — 点击宫位打开解读",
    svgGroupAriaLabel: "北印度式拉希盘",
    noBhavaAriaLabel: "拉希盘",
    noBirthTimeNotice: "没有出生时间，因此未显示以上升点为基准的宫位布局。请以月亮·纳克夏特拉·达萨为主进行解读。",
    houseAriaLabel: (house, rashiKo, grahasText) => `第${house}宫 ${rashiKo} ${grahasText}`,
    noGrahaLabel: "无行星",
    houseDetailHeading: (house, rashiKo) => `第${house}宫 · ${rashiKo}`,
    noMeaningFallback: "此宫位暂无含义信息。",
    lordPrefix: "宫主星",
    residingGrahaSuffix: (grahas) => ` · 驻留行星: ${grahas}`,
    noResidingGraha: " · 无驻留行星",
    chartDetailHint: "点击星盘上的宫位可查看该位置的含义与驻留行星。数字为拉希(星座)编号。",
    dashaTimelineAriaLabel: "威姆萨塔里大运时间线",
    dashaTimelineTitle: "大运时间线, Vimshottari Dasha",
    dashaTimelineSubtitle: "点击区段可查看期间 · ▼ 现在",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel}大运(${natureLabel}) 从${start}到${end}共${years}年${isCurrent ? "，目前进行中" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel}玛哈大运 · ${start} ~ ${end} (${years}年)${isCurrentNow ? " · 您目前正处于这个运程中" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel}玛哈大运进度${percent}%，共${totalYears}年中已过${elapsedYears}年`,
  },
  "zh-TW": {
    grahaLabel: { Sun: "太陽", Moon: "月亮", Mars: "火星", Mercury: "水星", Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "羅睺", Ketu: "計都" },
    grahaShortLabel: { Sun: "日", Moon: "月", Mars: "火", Mercury: "水", Jupiter: "木", Venus: "金", Saturn: "土", Rahu: "羅", Ketu: "計" },
    natureLabel: { benefic: "吉星 · 平順之流", malefic: "凶星 · 挑戰之流" },
    rashiChartTitle: "拉希盤, Rashi Chart (D1)",
    rashiChartSubtitle: "北印度式 · 點擊宮位查看解讀",
    rashiChartAriaLabel: "拉希盤 D1 — 點擊宮位打開解讀",
    svgGroupAriaLabel: "北印度式拉希盤",
    noBhavaAriaLabel: "拉希盤",
    noBirthTimeNotice: "沒有出生時間，因此未顯示以上升點為基準的宮位配置。請以月亮·納克沙特拉·達夏為主進行解讀。",
    houseAriaLabel: (house, rashiKo, grahasText) => `第${house}宮 ${rashiKo} ${grahasText}`,
    noGrahaLabel: "無行星",
    houseDetailHeading: (house, rashiKo) => `第${house}宮 · ${rashiKo}`,
    noMeaningFallback: "此宮位暫無含義資訊。",
    lordPrefix: "宮主星",
    residingGrahaSuffix: (grahas) => ` · 駐留行星: ${grahas}`,
    noResidingGraha: " · 無駐留行星",
    chartDetailHint: "點擊星盤上的宮位可查看該位置的含義與駐留行星。數字為拉希(星座)編號。",
    dashaTimelineAriaLabel: "威姆薩塔里大運時間軸",
    dashaTimelineTitle: "大運時間軸, Vimshottari Dasha",
    dashaTimelineSubtitle: "點擊區段可查看期間 · ▼ 現在",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel}大運(${natureLabel}) 從${start}到${end}共${years}年${isCurrent ? "，目前進行中" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel}瑪哈大運 · ${start} ~ ${end} (${years}年)${isCurrentNow ? " · 您目前正處於這個運程中" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel}瑪哈大運進度${percent}%，共${totalYears}年中已過${elapsedYears}年`,
  },
  vi: {
    grahaLabel: { Sun: "Mặt Trời", Moon: "Mặt Trăng", Mars: "Sao Hỏa", Mercury: "Sao Thủy", Jupiter: "Sao Mộc", Venus: "Sao Kim", Saturn: "Sao Thổ", Rahu: "Rahu", Ketu: "Ketu" },
    grahaShortLabel: { Sun: "MT", Moon: "MTr", Mars: "Hỏa", Mercury: "Thủy", Jupiter: "Mộc", Venus: "Kim", Saturn: "Thổ", Rahu: "Ra", Ketu: "Ke" },
    natureLabel: { benefic: "Cát tinh · dòng chảy êm dịu", malefic: "Hung tinh · dòng chảy thử thách" },
    rashiChartTitle: "Biểu đồ Rashi, Rashi Chart (D1)",
    rashiChartSubtitle: "Kiểu Bắc Ấn · chạm vào một bhava để xem giải nghĩa",
    rashiChartAriaLabel: "Biểu đồ Rashi D1 — chạm vào một cung để mở giải nghĩa",
    svgGroupAriaLabel: "Biểu đồ Rashi kiểu Bắc Ấn",
    noBhavaAriaLabel: "Biểu đồ Rashi",
    noBirthTimeNotice: "Không có giờ sinh nên bố cục bhava theo lagna không được hiển thị. Hãy đọc theo Mặt Trăng, nakshatra và dasha.",
    houseAriaLabel: (house, rashiKo, grahasText) => `Cung ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "Không có graha",
    houseDetailHeading: (house, rashiKo) => `Cung ${house} · ${rashiKo}`,
    noMeaningFallback: "Không có thông tin ý nghĩa cho bhava này.",
    lordPrefix: "Chủ tinh",
    residingGrahaSuffix: (grahas) => ` · Graha trú tại đây: ${grahas}`,
    noResidingGraha: " · Không có graha nào trú tại đây",
    chartDetailHint: "Chạm vào một bhava (cung) trên biểu đồ để xem ý nghĩa và các graha trú tại đó. Con số là số của rashi (cung hoàng đạo).",
    dashaTimelineAriaLabel: "Dòng thời gian Vimshottari Dasha",
    dashaTimelineTitle: "Dòng thời gian Dasha, Vimshottari Dasha",
    dashaTimelineSubtitle: "Chạm vào một đoạn để xem khoảng thời gian · ▼ hiện tại",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `Dasha ${grahaLabel} (${natureLabel}) từ ${start} đến ${end}, ${years} năm${isCurrent ? ", đang diễn ra" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `Mahadasha ${grahaLabel} · ${start} ~ ${end} (${years} năm)${isCurrentNow ? " · Bạn đang ở trong dòng chảy này" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `Tiến độ Mahadasha ${grahaLabel} ${percent} phần trăm, đã qua ${elapsedYears} trong tổng ${totalYears} năm`,
  },
  hi: {
    grahaLabel: { Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" },
    grahaShortLabel: { Sun: "सू", Moon: "चं", Mars: "मं", Mercury: "बु", Jupiter: "गु", Venus: "शु", Saturn: "श", Rahu: "रा", Ketu: "के" },
    natureLabel: { benefic: "शुभ ग्रह · सौम्य प्रवाह", malefic: "अशुभ ग्रह · चुनौतीपूर्ण प्रवाह" },
    rashiChartTitle: "राशि चार्ट, Rashi Chart (D1)",
    rashiChartSubtitle: "उत्तर भारतीय शैली · भाव पर टैप करने से विवरण खुलता है",
    rashiChartAriaLabel: "राशि चार्ट D1 — हाउस पर टैप करने से विवरण खुलता है",
    svgGroupAriaLabel: "उत्तर भारतीय शैली की राशि चार्ट",
    noBhavaAriaLabel: "राशि चार्ट",
    noBirthTimeNotice: "जन्म समय न होने के कारण लग्न आधारित भाव व्यवस्था नहीं दिखाई गई है। चंद्र, नक्षत्र और दशा के आधार पर पढ़ें।",
    houseAriaLabel: (house, rashiKo, grahasText) => `भाव ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "कोई ग्रह नहीं",
    houseDetailHeading: (house, rashiKo) => `भाव ${house} · ${rashiKo}`,
    noMeaningFallback: "इस भाव के लिए अर्थ जानकारी उपलब्ध नहीं है।",
    lordPrefix: "स्वामी ग्रह",
    residingGrahaSuffix: (grahas) => ` · यहाँ स्थित ग्रह: ${grahas}`,
    noResidingGraha: " · यहाँ कोई ग्रह स्थित नहीं",
    chartDetailHint: "चार्ट में किसी भाव पर टैप करने पर उस स्थान का अर्थ और वहाँ स्थित ग्रह दिखाए जाते हैं। संख्या राशि (चिह्न) संख्या है।",
    dashaTimelineAriaLabel: "विंशोत्तरी दशा समयरेखा",
    dashaTimelineTitle: "दशा समयरेखा, Vimshottari Dasha",
    dashaTimelineSubtitle: "किसी भाग पर टैप करने से अवधि दिखती है · ▼ अभी",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel} दशा (${natureLabel}) ${start} से ${end} तक, ${years} वर्ष${isCurrent ? ", वर्तमान में चल रही है" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel} महादशा · ${start} ~ ${end} (${years} वर्ष)${isCurrentNow ? " · आप अभी इसी प्रवाह में हैं" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel} महादशा प्रगति ${percent} प्रतिशत, कुल ${totalYears} वर्षों में से ${elapsedYears} वर्ष बीत चुके`,
  },
  es: {
    grahaLabel: { Sun: "Sol", Moon: "Luna", Mars: "Marte", Mercury: "Mercurio", Jupiter: "Júpiter", Venus: "Venus", Saturn: "Saturno", Rahu: "Rahu", Ketu: "Ketu" },
    grahaShortLabel: { Sun: "So", Moon: "Lu", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke" },
    natureLabel: { benefic: "Benéfico · flujo suave", malefic: "Maléfico · flujo desafiante" },
    rashiChartTitle: "Carta Rashi, Rashi Chart (D1)",
    rashiChartSubtitle: "Estilo norindio · toca una bhava para ver su lectura",
    rashiChartAriaLabel: "Carta Rashi D1 — toca una casa para abrir su lectura",
    svgGroupAriaLabel: "Carta Rashi de estilo norindio",
    noBhavaAriaLabel: "Carta Rashi",
    noBirthTimeNotice: "No se indicó la hora de nacimiento, así que no se muestra la disposición de bhavas basada en el lagna. Lee según la Luna, el nakshatra y la dasha.",
    houseAriaLabel: (house, rashiKo, grahasText) => `Casa ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "Sin grahas",
    houseDetailHeading: (house, rashiKo) => `Casa ${house} · ${rashiKo}`,
    noMeaningFallback: "No hay información de significado para esta bhava.",
    lordPrefix: "Señor",
    residingGrahaSuffix: (grahas) => ` · Grahas presentes: ${grahas}`,
    noResidingGraha: " · Sin grahas presentes",
    chartDetailHint: "Toca una bhava (casa) en la carta para ver su significado y los grahas presentes. El número es el número de rashi (signo).",
    dashaTimelineAriaLabel: "Línea de tiempo de la Dasha Vimshottari",
    dashaTimelineTitle: "Línea de tiempo de Dasha, Vimshottari Dasha",
    dashaTimelineSubtitle: "Toca un segmento para ver su período · ▼ ahora",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `Dasha de ${grahaLabel} (${natureLabel}) de ${start} a ${end}, ${years} años${isCurrent ? ", en curso actualmente" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `Mahadasha de ${grahaLabel} · ${start} ~ ${end} (${years} años)${isCurrentNow ? " · Estás en este flujo ahora mismo" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `Progreso de la Mahadasha de ${grahaLabel} ${percent} por ciento, ${elapsedYears} de ${totalYears} años transcurridos`,
  },
  fr: {
    grahaLabel: { Sun: "Soleil", Moon: "Lune", Mars: "Mars", Mercury: "Mercure", Jupiter: "Jupiter", Venus: "Vénus", Saturn: "Saturne", Rahu: "Rahu", Ketu: "Ketu" },
    grahaShortLabel: { Sun: "So", Moon: "Lu", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Vé", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke" },
    natureLabel: { benefic: "Bénéfique · flux doux", malefic: "Maléfique · flux difficile" },
    rashiChartTitle: "Carte Rashi, Rashi Chart (D1)",
    rashiChartSubtitle: "Style nord-indien · touchez un bhava pour voir sa lecture",
    rashiChartAriaLabel: "Carte Rashi D1 — touchez une maison pour ouvrir sa lecture",
    svgGroupAriaLabel: "Carte Rashi de style nord-indien",
    noBhavaAriaLabel: "Carte Rashi",
    noBirthTimeNotice: "Aucune heure de naissance n'a été fournie, la disposition des bhavas basée sur le lagna n'est donc pas affichée. Lisez plutôt selon la Lune, le nakshatra et la dasha.",
    houseAriaLabel: (house, rashiKo, grahasText) => `Maison ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "Aucun graha",
    houseDetailHeading: (house, rashiKo) => `Maison ${house} · ${rashiKo}`,
    noMeaningFallback: "Aucune information de signification pour ce bhava.",
    lordPrefix: "Maître",
    residingGrahaSuffix: (grahas) => ` · Grahas présents : ${grahas}`,
    noResidingGraha: " · Aucun graha présent",
    chartDetailHint: "Touchez un bhava (maison) sur la carte pour voir sa signification et les grahas présents. Le nombre est le numéro du rashi (signe).",
    dashaTimelineAriaLabel: "Chronologie de la Dasha Vimshottari",
    dashaTimelineTitle: "Chronologie Dasha, Vimshottari Dasha",
    dashaTimelineSubtitle: "Touchez un segment pour voir sa période · ▼ maintenant",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `Dasha de ${grahaLabel} (${natureLabel}) du ${start} au ${end}, ${years} ans${isCurrent ? ", en cours actuellement" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `Mahadasha de ${grahaLabel} · ${start} ~ ${end} (${years} ans)${isCurrentNow ? " · Vous êtes actuellement dans ce flux" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `Progression de la Mahadasha de ${grahaLabel} ${percent} pour cent, ${elapsedYears} sur ${totalYears} ans écoulés`,
  },
  de: {
    grahaLabel: { Sun: "Sonne", Moon: "Mond", Mars: "Mars", Mercury: "Merkur", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu" },
    grahaShortLabel: { Sun: "So", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke" },
    natureLabel: { benefic: "Wohltätig · sanfter Fluss", malefic: "Übelwollend · herausfordernder Fluss" },
    rashiChartTitle: "Rashi-Karte, Rashi Chart (D1)",
    rashiChartSubtitle: "Nordindischer Stil · auf ein Bhava tippen, um die Deutung zu öffnen",
    rashiChartAriaLabel: "Rashi-Karte D1 — auf ein Haus tippen, um die Deutung zu öffnen",
    svgGroupAriaLabel: "Rashi-Karte im nordindischen Stil",
    noBhavaAriaLabel: "Rashi-Karte",
    noBirthTimeNotice: "Da keine Geburtszeit angegeben wurde, wird die auf dem Lagna basierende Bhava-Anordnung nicht angezeigt. Lesen Sie stattdessen anhand von Mond, Nakshatra und Dasha.",
    houseAriaLabel: (house, rashiKo, grahasText) => `Haus ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "Keine Grahas",
    houseDetailHeading: (house, rashiKo) => `Haus ${house} · ${rashiKo}`,
    noMeaningFallback: "Keine Bedeutungsinformation für dieses Bhava verfügbar.",
    lordPrefix: "Herrscher",
    residingGrahaSuffix: (grahas) => ` · Anwesende Grahas: ${grahas}`,
    noResidingGraha: " · Keine anwesenden Grahas",
    chartDetailHint: "Tippen Sie auf ein Bhava (Haus) in der Karte, um dessen Bedeutung und anwesende Grahas zu sehen. Die Zahl ist die Rashi-Nummer (Sternzeichen).",
    dashaTimelineAriaLabel: "Vimshottari-Dasha-Zeitleiste",
    dashaTimelineTitle: "Dasha-Zeitleiste, Vimshottari Dasha",
    dashaTimelineSubtitle: "Auf ein Segment tippen, um den Zeitraum zu sehen · ▼ jetzt",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel}-Dasha (${natureLabel}) von ${start} bis ${end}, ${years} Jahre${isCurrent ? ", derzeit im Gange" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel}-Mahadasha · ${start} ~ ${end} (${years} Jahre)${isCurrentNow ? " · Sie befinden sich gerade in diesem Fluss" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel}-Mahadasha-Fortschritt ${percent} Prozent, ${elapsedYears} von ${totalYears} Jahren vergangen`,
  },
  nl: {
    grahaLabel: { Sun: "Zon", Moon: "Maan", Mars: "Mars", Mercury: "Mercurius", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturnus", Rahu: "Rahu", Ketu: "Ketu" },
    grahaShortLabel: { Sun: "Zo", Moon: "Ma", Mars: "Mar", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke" },
    natureLabel: { benefic: "Weldadig · zachte stroom", malefic: "Onheilspellend · uitdagende stroom" },
    rashiChartTitle: "Rashi-kaart, Rashi Chart (D1)",
    rashiChartSubtitle: "Noord-Indiase stijl · tik op een bhava voor de duiding",
    rashiChartAriaLabel: "Rashi-kaart D1 — tik op een huis om de duiding te openen",
    svgGroupAriaLabel: "Rashi-kaart in Noord-Indiase stijl",
    noBhavaAriaLabel: "Rashi-kaart",
    noBirthTimeNotice: "Er is geen geboortetijd opgegeven, dus de lagna-gebaseerde bhava-indeling wordt niet getoond. Lees in plaats daarvan op basis van Maan, nakshatra en dasha.",
    houseAriaLabel: (house, rashiKo, grahasText) => `Huis ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "Geen grahas",
    houseDetailHeading: (house, rashiKo) => `Huis ${house} · ${rashiKo}`,
    noMeaningFallback: "Geen betekenisinformatie beschikbaar voor deze bhava.",
    lordPrefix: "Heerser",
    residingGrahaSuffix: (grahas) => ` · Aanwezige grahas: ${grahas}`,
    noResidingGraha: " · Geen aanwezige grahas",
    chartDetailHint: "Tik op een bhava (huis) in de kaart om de betekenis en aanwezige grahas te zien. Het getal is het rashi-nummer (sterrenbeeld).",
    dashaTimelineAriaLabel: "Vimshottari Dasha-tijdlijn",
    dashaTimelineTitle: "Dasha-tijdlijn, Vimshottari Dasha",
    dashaTimelineSubtitle: "Tik op een segment om de periode te zien · ▼ nu",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `${grahaLabel}-dasha (${natureLabel}) van ${start} tot ${end}, ${years} jaar${isCurrent ? ", momenteel actief" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `${grahaLabel}-mahadasha · ${start} ~ ${end} (${years} jaar)${isCurrentNow ? " · Je bevindt je nu in deze stroom" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `${grahaLabel}-mahadasha voortgang ${percent} procent, ${elapsedYears} van ${totalYears} jaar verstreken`,
  },
  ms: {
    grahaLabel: { Sun: "Matahari", Moon: "Bulan", Mars: "Marikh", Mercury: "Utarid", Jupiter: "Musytari", Venus: "Zuhrah", Saturn: "Zuhal", Rahu: "Rahu", Ketu: "Ketu" },
    grahaShortLabel: { Sun: "Ma", Moon: "Bu", Mars: "Mar", Mercury: "Ut", Jupiter: "Mu", Venus: "Zu", Saturn: "Za", Rahu: "Ra", Ketu: "Ke" },
    natureLabel: { benefic: "Baik · aliran lembut", malefic: "Buruk · aliran mencabar" },
    rashiChartTitle: "Carta Rashi, Rashi Chart (D1)",
    rashiChartSubtitle: "Gaya India Utara · ketik bhava untuk membuka tafsiran",
    rashiChartAriaLabel: "Carta Rashi D1 — ketik rumah untuk membuka tafsiran",
    svgGroupAriaLabel: "Carta Rashi gaya India Utara",
    noBhavaAriaLabel: "Carta Rashi",
    noBirthTimeNotice: "Tiada masa lahir diberikan, jadi susunan bhava berdasarkan lagna tidak dipaparkan. Bacalah berdasarkan Bulan, nakshatra dan dasha.",
    houseAriaLabel: (house, rashiKo, grahasText) => `Rumah ${house} ${rashiKo} ${grahasText}`,
    noGrahaLabel: "Tiada graha",
    houseDetailHeading: (house, rashiKo) => `Rumah ${house} · ${rashiKo}`,
    noMeaningFallback: "Tiada maklumat makna untuk bhava ini.",
    lordPrefix: "Penguasa",
    residingGrahaSuffix: (grahas) => ` · Graha yang berada di sini: ${grahas}`,
    noResidingGraha: " · Tiada graha di sini",
    chartDetailHint: "Ketik bhava (rumah) pada carta untuk melihat makna dan graha yang berada di situ. Nombor tersebut ialah nombor rashi (zodiak).",
    dashaTimelineAriaLabel: "Garis masa Vimshottari Dasha",
    dashaTimelineTitle: "Garis masa Dasha, Vimshottari Dasha",
    dashaTimelineSubtitle: "Ketik segmen untuk melihat tempoh · ▼ sekarang",
    dashaSegmentAriaLabel: (grahaLabel, natureLabel, start, end, years, isCurrent) => `Dasha ${grahaLabel} (${natureLabel}) dari ${start} hingga ${end}, ${years} tahun${isCurrent ? ", sedang berlangsung" : ""}`,
    dashaSelectedInfo: (grahaLabel, start, end, years, isCurrentNow) => `Mahadasha ${grahaLabel} · ${start} ~ ${end} (${years} tahun)${isCurrentNow ? " · Anda sedang berada dalam aliran ini" : ""}`,
    dashaProgressAriaLabel: (grahaLabel, percent, totalYears, elapsedYears) => `Kemajuan Mahadasha ${grahaLabel} ${percent} peratus, ${elapsedYears} daripada ${totalYears} tahun berlalu`,
  },
};

function getVedicChartCopy(locale: LoadingLocale): VedicChartCopy {
  return VEDIC_CHART_COPY[locale] || VEDIC_CHART_COPY_EN;
}

function useVedicChartCopy(): VedicChartCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getVedicChartCopy(locale);
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

type BhavaInfo = {
  house: number;
  rashi: string;
  rashiKo: string;
  signNumber: number;
  meaning: string;
  grahas: string[];
  lord: string;
};

function readBhavas(chart: AnyRecord): BhavaInfo[] {
  const rows = Array.isArray(chart.bhavas)
    ? chart.bhavas.map(asRecord)
    : (Array.isArray(chart.houses) ? chart.houses.map(asRecord) : []);
  return rows
    .map((row) => {
      const rashi = toText(row.rashi || row.sign);
      return {
        house: Number(row.house) || 0,
        rashi,
        rashiKo: toText(row.rashiKo || row.signKo) || rashi,
        signNumber: SIGN_NUMBERS[rashi] || 0,
        meaning: toText(row.meaning),
        grahas: Array.isArray(row.grahas)
          ? row.grahas.map(toText).filter(Boolean)
          : (Array.isArray(row.planets) ? row.planets.map(toText).filter(Boolean) : []),
        lord: toText(row.lord),
      };
    })
    .filter((row) => row.house >= 1 && row.house <= 12);
}

export function NorthIndianChart({ chart }: { chart: AnyRecord }) {
  const copy = useVedicChartCopy();
  const bhavas = useMemo(() => readBhavas(chart), [chart]);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const byHouse = useMemo(() => new Map(bhavas.map((row) => [row.house, row])), [bhavas]);

  if (!bhavas.length) {
    return (
      <section className={styles.rashiChartCard} aria-label={copy.noBhavaAriaLabel}>
        <div className={styles.rashiChartHeader}>
          <span>{copy.rashiChartTitle}</span>
        </div>
        <p className={styles.chartNotice}>{copy.noBirthTimeNotice}</p>
      </section>
    );
  }

  const selected = selectedHouse ? byHouse.get(selectedHouse) : null;

  return (
    <section className={styles.rashiChartCard} aria-label={copy.rashiChartAriaLabel}>
      <div className={styles.rashiChartHeader}>
        <span>{copy.rashiChartTitle}</span>
        <small>{copy.rashiChartSubtitle}</small>
      </div>
      <div className={styles.rashiChartBody}>
        <svg viewBox="-4 -4 208 208" className={styles.rashiChartSvg} role="group" aria-label={copy.svgGroupAriaLabel}>
          <rect x="0" y="0" width="200" height="200" className={styles.rashiFrame} />
          {HOUSE_POLYGONS.map(({ house, points, cx, cy }) => {
            const bhava = byHouse.get(house);
            const grahas = (bhava?.grahas || []).map((name) => copy.grahaShortLabel[name] || GRAHA_SHORT[name] || name.slice(0, 1));
            const isSelected = selectedHouse === house;
            return (
              <g
                key={house}
                className={isSelected ? styles.rashiHouseSelected : styles.rashiHouse}
                onClick={() => setSelectedHouse(isSelected ? null : house)}
                role="button"
                tabIndex={0}
                aria-label={copy.houseAriaLabel(house, bhava?.rashiKo || "", bhava?.grahas?.join(", ") || copy.noGrahaLabel)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedHouse(isSelected ? null : house);
                  }
                }}
              >
                <polygon points={points} />
                <text x={cx} y={cy - (grahas.length ? 6 : 0)} className={styles.rashiSignNumber} textAnchor="middle">
                  {bhava?.signNumber || ""}
                </text>
                {grahas.length ? (
                  <text x={cx} y={cy + 9} className={styles.rashiGrahaText} textAnchor="middle">
                    {grahas.slice(0, 4).join(" ")}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div className={styles.rashiDetailPane}>
          {selected ? (
            <>
              <strong>{copy.houseDetailHeading(selected.house, selected.rashiKo)}</strong>
              <p>{selected.meaning || copy.noMeaningFallback}</p>
              <small>
                {copy.lordPrefix} {selected.lord || "-"}
                {selected.grahas.length ? copy.residingGrahaSuffix(selected.grahas.join(", ")) : copy.noResidingGraha}
              </small>
            </>
          ) : (
            <p className={styles.rashiDetailHint}>{copy.chartDetailHint}</p>
          )}
        </div>
      </div>
    </section>
  );
}

type DashaPeriod = {
  lord: string;
  startDate: string;
  endDate: string;
  durationYears: number;
};

function readDashaPeriods(chart: AnyRecord): DashaPeriod[] {
  const vimshottari = asRecord(chart.vimshottariDasha);
  const legacy = asRecord(chart.dasha);
  const rows = Array.isArray(vimshottari.periods)
    ? vimshottari.periods.map(asRecord)
    : (Array.isArray(legacy.periods) ? legacy.periods.map(asRecord) : []);
  return rows
    .map((row) => ({
      lord: toText(row.lord),
      startDate: toText(row.startDate) || toText(row.start).slice(0, 10),
      endDate: toText(row.endDate) || toText(row.end).slice(0, 10),
      durationYears: Number(row.durationYears ?? row.years) || 0,
    }))
    .filter((row) => row.lord && row.durationYears > 0);
}

const DASHA_COLORS: Record<string, string> = {
  Sun: "#f59e0b", Moon: "#cbd5f5", Mars: "#f87171", Mercury: "#34d399", Jupiter: "#fbbf24",
  Venus: "#f9a8d4", Saturn: "#818cf8", Rahu: "#94a3b8", Ketu: "#a78bfa",
};

const GRAHA_KO: Record<string, string> = {
  Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성",
  Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투",
};

// 조티시 자연 길성/흉성 분류. 길성(부드러운 흐름): 목성·금성·수성·달. 흉성(도전적 흐름): 토성·화성·태양·라후·케투.
const BENEFIC_GRAHAS = new Set(["Jupiter", "Venus", "Mercury", "Moon", "목성", "금성", "수성", "달"]);

// copy 를 넘기지 않는 기존 호출부(VedicAiClient.tsx)는 그대로 한국어 GRAHA_KO 를 받는다 —
// `label` 필드만 로케일 인지형이고 `ko` 필드는 하위호환을 위해 항상 한국어로 유지한다.
export function getGrahaMeta(lord: string, copy?: VedicChartCopy): { ko: string; label: string; nature: GrahaNature } {
  const key = String(lord ?? "").trim();
  const ko = GRAHA_KO[key] || key;
  const label = copy ? (copy.grahaLabel[key] || key) : ko;
  const nature: GrahaNature = BENEFIC_GRAHAS.has(key) ? "benefic" : "malefic";
  return { ko, label, nature };
}

const NATURE_LABEL: Record<GrahaNature, string> = {
  benefic: "길성 · 부드러운 흐름",
  malefic: "흉성 · 도전적 흐름",
};

// 그라하 성정(길성/흉성)을 나타내는 작은 색 점. 색만으로 구분되지 않도록 스크린리더 텍스트를 함께 제공.
// copy 를 넘기지 않는 기존 호출부는 그대로 한국어 NATURE_LABEL 을 받는다(하위호환).
export function GrahaNatureDot({ nature, copy }: { nature: GrahaNature; copy?: VedicChartCopy }) {
  const label = copy ? copy.natureLabel[nature] : NATURE_LABEL[nature];
  return (
    <i className={`${styles.grahaNatureDot} ${nature === "benefic" ? styles.grahaNatureBenefic : styles.grahaNatureMalefic}`} aria-hidden="true">
      <span className={styles.srOnly}>{label}</span>
    </i>
  );
}

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

// 마하다샤 진행률 링. 현재 날짜가 마하다샤 전체 기간(예: 토성 19년) 중 어디쯤인지를
// progress = (now - start) / (end - start) 로 계산해 원형 링으로 표현한다.
export function DashaProgressRing({ lord, startDate, endDate }: { lord: string; startDate: string; endDate: string }) {
  const copy = useVedicChartCopy();
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  const now = Date.now();
  const meta = getGrahaMeta(lord, copy);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const totalMs = end - start;
  const elapsedMs = Math.min(totalMs, Math.max(0, now - start));
  const progress = elapsedMs / totalMs;
  const elapsedYears = elapsedMs / YEAR_MS;
  const totalYears = totalMs / YEAR_MS;
  const percent = Math.round(progress * 100);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={styles.dashaRing} role="img" aria-label={copy.dashaProgressAriaLabel(meta.label, percent, totalYears.toFixed(0), elapsedYears.toFixed(1))}>
      <svg viewBox="0 0 72 72" className={styles.dashaRingSvg} aria-hidden="true">
        <circle cx="36" cy="36" r={radius} className={styles.dashaRingTrack} />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className={styles.dashaRingProgress}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className={styles.dashaRingPercent} aria-hidden="true">{percent}%</span>
    </div>
  );
}

export function DashaTimeline({ chart }: { chart: AnyRecord }) {
  const copy = useVedicChartCopy();
  const periods = useMemo(() => readDashaPeriods(chart), [chart]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  if (!periods.length) return null;

  const now = Date.now();
  const totalYears = periods.reduce((sum, period) => sum + period.durationYears, 0) || 1;
  const currentIndex = periods.findIndex((period) => {
    const start = Date.parse(period.startDate);
    const end = Date.parse(period.endDate);
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
  });
  const selected = selectedIndex != null ? periods[selectedIndex] : (currentIndex >= 0 ? periods[currentIndex] : null);

  return (
    <section className={styles.dashaTimelineCard} aria-label={copy.dashaTimelineAriaLabel}>
      <div className={styles.rashiChartHeader}>
        <span>{copy.dashaTimelineTitle}</span>
        <small>{copy.dashaTimelineSubtitle}</small>
      </div>
      <div className={styles.dashaTrackWrap}>
        <div className={styles.dashaTrack} role="list">
          {periods.map((period, index) => {
            const width = Math.max(4, (period.durationYears / totalYears) * 100);
            const isCurrent = index === currentIndex;
            const isSelected = selectedIndex === index || (selectedIndex == null && isCurrent);
            const meta = getGrahaMeta(period.lord, copy);
            let currentOffset = 0;
            if (isCurrent) {
              const start = Date.parse(period.startDate);
              const end = Date.parse(period.endDate);
              if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                currentOffset = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              }
            }
            return (
              <button
                type="button"
                role="listitem"
                key={`${period.lord}-${period.startDate}`}
                className={`${styles.dashaSegment} ${isSelected ? styles.dashaSegmentSelected : ""}`}
                style={{ width: `${width}%`, background: DASHA_COLORS[period.lord] || "#7c7f93" }}
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                aria-label={copy.dashaSegmentAriaLabel(meta.label, copy.natureLabel[meta.nature], period.startDate, period.endDate, period.durationYears, isCurrent)}
              >
                <span>{meta.label}</span>
                {isCurrent ? <i className={styles.dashaNowMarker} style={{ left: `${currentOffset}%` }} aria-hidden="true">▼</i> : null}
              </button>
            );
          })}
        </div>
      </div>
      {selected ? (
        <p className={styles.dashaSelectedInfo}>
          <GrahaNatureDot nature={getGrahaMeta(selected.lord, copy).nature} copy={copy} />
          {copy.dashaSelectedInfo(getGrahaMeta(selected.lord, copy).label, selected.startDate, selected.endDate, selected.durationYears, currentIndex >= 0 && periods[currentIndex] === selected)}
        </p>
      ) : null}
    </section>
  );
}

// 메인 히어로용 장식 차트 — 데이터 없이 북인도식 격자와 라시 번호만 은은하게 표시
export function HeroChartPreview() {
  return (
    <svg viewBox="-4 -4 208 208" className={styles.heroChartPreview} aria-hidden="true">
      <rect x="0" y="0" width="200" height="200" className={styles.rashiFrame} />
      {HOUSE_POLYGONS.map(({ house, points, cx, cy }) => (
        <g key={house} className={styles.heroChartHouse}>
          <polygon points={points} />
          <text x={cx} y={cy + 3} textAnchor="middle">{house}</text>
        </g>
      ))}
    </svg>
  );
}
