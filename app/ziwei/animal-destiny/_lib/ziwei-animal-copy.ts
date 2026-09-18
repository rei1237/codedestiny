import { getCurrentLoadingLocale, normalizeLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

// 화면 조작 문구(폼 라벨·버튼·안내)만 번역한다. "전체 해석"·"참고 기록" 본문(ziweiAnimalContent.ts)은
// advanced-ziwei-copy.ts의 상담 본문과 같은 이유로 한국어 정본을 유지한다.
export interface ZiweiAnimalCopy {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  fieldBirthYearLabel: string;
  fieldBirthMonthLabel: string;
  fieldBirthDayLabel: string;
  fieldBirthHourLabel: string;
  fieldBirthMinuteLabel: string;
  fieldCalendarLabel: string;
  fieldGenderLabel: string;
  calendarLabels: { solar: string; lunar: string };
  genderLabels: { female: string; male: string };
  unknownHourCheckboxLabel: string;
  leapMonthCheckboxLabel: string;
  submitLabel: string;
  computingLabel: string;
  resetLabel: string;
  errorFallback: string;
  resultEyebrow: string;
  statMingLabel: string;
  statShenLabel: string;
  statJuLabel: string;
  foundationTitle: string;
  actionsTitle: string;
  evidenceSummary: string;
  evidenceEmptyLabel: string;
}

const ZIWEI_ANIMAL_COPY_EN: ZiweiAnimalCopy = {
  heroEyebrow: "Zi Wei Soul Animal",
  heroTitle: "Find the animal that symbolizes your soul",
  heroSubtitle: "Enter your birth date and time, and we'll reveal the animal character closest to your Life Palace.",
  fieldBirthYearLabel: "Birth year",
  fieldBirthMonthLabel: "Birth month",
  fieldBirthDayLabel: "Birth day",
  fieldBirthHourLabel: "Birth hour",
  fieldBirthMinuteLabel: "Birth minute",
  fieldCalendarLabel: "Solar / Lunar",
  fieldGenderLabel: "Gender",
  calendarLabels: { solar: "Solar", lunar: "Lunar" },
  genderLabels: { female: "Female", male: "Male" },
  unknownHourCheckboxLabel: "Birth time unknown (noon-based reference reading)",
  leapMonthCheckboxLabel: "Leap month",
  submitLabel: "Reveal my soul animal",
  computingLabel: "Calculating your Life Palace...",
  resetLabel: "Calculate again",
  errorFallback: "Could not calculate the chart. Please check your input again.",
  resultEyebrow: "The animal held by your Life Palace",
  statMingLabel: "Life Palace (Ming)",
  statShenLabel: "Body Palace (Shen)",
  statJuLabel: "Five-Element Bureau",
  foundationTitle: "Full reading",
  actionsTitle: "What to try now",
  evidenceSummary: "See the supporting evidence",
  evidenceEmptyLabel: "No evidence to display.",
};

const ZIWEI_ANIMAL_COPY: Partial<Record<LoadingLocale, ZiweiAnimalCopy>> = {
  ko: {
    heroEyebrow: "자미두수 영혼 동물",
    heroTitle: "내 영혼을 상징하는 동물을 찾아보세요",
    heroSubtitle: "생년월일시를 입력하면 명궁을 기준으로 당신과 가장 닮은 동물 캐릭터를 알려드립니다.",
    fieldBirthYearLabel: "출생 연도",
    fieldBirthMonthLabel: "출생 월",
    fieldBirthDayLabel: "출생 일",
    fieldBirthHourLabel: "출생 시",
    fieldBirthMinuteLabel: "출생 분",
    fieldCalendarLabel: "양력/음력",
    fieldGenderLabel: "성별",
    calendarLabels: { solar: "양력", lunar: "음력" },
    genderLabels: { female: "여성", male: "남성" },
    unknownHourCheckboxLabel: "출생시간 미상(정오 기준 참고 리딩)",
    leapMonthCheckboxLabel: "윤달",
    submitLabel: "내 영혼 동물 확인하기",
    computingLabel: "명궁을 계산하는 중입니다...",
    resetLabel: "다시 계산하기",
    errorFallback: "명반을 계산하지 못했습니다. 입력값을 다시 확인해 주세요.",
    resultEyebrow: "당신의 명궁이 품은 동물",
    statMingLabel: "명궁",
    statShenLabel: "신궁",
    statJuLabel: "오행국",
    foundationTitle: "전체 해석",
    actionsTitle: "지금 해볼 수 있는 것",
    evidenceSummary: "참고 기록 보기",
    evidenceEmptyLabel: "표시할 근거가 없습니다.",
  },
  ja: {
    heroEyebrow: "紫微斗数 魂の動物",
    heroTitle: "あなたの魂を象徴する動物を見つけましょう",
    heroSubtitle: "生年月日時を入力すると、命宮を基準にあなたに最も近い動物キャラクターをお伝えします。",
    fieldBirthYearLabel: "生年",
    fieldBirthMonthLabel: "生月",
    fieldBirthDayLabel: "生日",
    fieldBirthHourLabel: "生まれた時間",
    fieldBirthMinuteLabel: "生まれた分",
    fieldCalendarLabel: "陽暦/陰暦",
    fieldGenderLabel: "性別",
    calendarLabels: { solar: "陽暦", lunar: "陰暦" },
    genderLabels: { female: "女性", male: "男性" },
    unknownHourCheckboxLabel: "出生時刻不明(正午基準の参考リーディング)",
    leapMonthCheckboxLabel: "閏月",
    submitLabel: "私の魂の動物を確認する",
    computingLabel: "命宮を計算しています...",
    resetLabel: "もう一度計算する",
    errorFallback: "命盤を計算できませんでした。入力内容をご確認ください。",
    resultEyebrow: "あなたの命宮が宿す動物",
    statMingLabel: "命宮",
    statShenLabel: "身宮",
    statJuLabel: "五行局",
    foundationTitle: "全体解釈",
    actionsTitle: "今試してみること",
    evidenceSummary: "参考記録を見る",
    evidenceEmptyLabel: "表示できる根拠がありません。",
  },
  "zh-CN": {
    heroEyebrow: "紫微斗数 灵魂动物",
    heroTitle: "找到象征你灵魂的动物",
    heroSubtitle: "输入出生年月日时，我们将根据命宫为你揭示最相近的动物角色。",
    fieldBirthYearLabel: "出生年份",
    fieldBirthMonthLabel: "出生月份",
    fieldBirthDayLabel: "出生日期",
    fieldBirthHourLabel: "出生时辰",
    fieldBirthMinuteLabel: "出生分钟",
    fieldCalendarLabel: "阳历/阴历",
    fieldGenderLabel: "性别",
    calendarLabels: { solar: "阳历", lunar: "阴历" },
    genderLabels: { female: "女性", male: "男性" },
    unknownHourCheckboxLabel: "出生时间未知(以正午为基准的参考解读)",
    leapMonthCheckboxLabel: "闰月",
    submitLabel: "查看我的灵魂动物",
    computingLabel: "正在计算命宫...",
    resetLabel: "重新计算",
    errorFallback: "无法计算命盘，请重新确认输入内容。",
    resultEyebrow: "你命宫中蕴含的动物",
    statMingLabel: "命宫",
    statShenLabel: "身宫",
    statJuLabel: "五行局",
    foundationTitle: "完整解读",
    actionsTitle: "现在可以尝试的事",
    evidenceSummary: "查看参考记录",
    evidenceEmptyLabel: "没有可显示的依据。",
  },
  "zh-TW": {
    heroEyebrow: "紫微斗數 靈魂動物",
    heroTitle: "找到象徵你靈魂的動物",
    heroSubtitle: "輸入出生年月日時，我們將根據命宮為你揭示最相近的動物角色。",
    fieldBirthYearLabel: "出生年份",
    fieldBirthMonthLabel: "出生月份",
    fieldBirthDayLabel: "出生日期",
    fieldBirthHourLabel: "出生時辰",
    fieldBirthMinuteLabel: "出生分鐘",
    fieldCalendarLabel: "陽曆/陰曆",
    fieldGenderLabel: "性別",
    calendarLabels: { solar: "陽曆", lunar: "陰曆" },
    genderLabels: { female: "女性", male: "男性" },
    unknownHourCheckboxLabel: "出生時間未知(以正午為基準的參考解讀)",
    leapMonthCheckboxLabel: "閏月",
    submitLabel: "查看我的靈魂動物",
    computingLabel: "正在計算命宮...",
    resetLabel: "重新計算",
    errorFallback: "無法計算命盤，請重新確認輸入內容。",
    resultEyebrow: "你命宮中蘊含的動物",
    statMingLabel: "命宮",
    statShenLabel: "身宮",
    statJuLabel: "五行局",
    foundationTitle: "完整解讀",
    actionsTitle: "現在可以嘗試的事",
    evidenceSummary: "查看參考記錄",
    evidenceEmptyLabel: "沒有可顯示的依據。",
  },
};

export function getZiweiAnimalCopy(locale?: LoadingLocale | string): ZiweiAnimalCopy {
  const activeLocale = locale ? normalizeLoadingLocale(locale) : getCurrentLoadingLocale();
  return { ...ZIWEI_ANIMAL_COPY_EN, ...(ZIWEI_ANIMAL_COPY[activeLocale] || {}) };
}
