// Canonical web/Toss yearly reading. Calculation and prose are shared, with no billing or storage.
import {lunarToSolar,solarToLunar} from "../../lib/korean-calendar/index.js";
import {calculateSukuyoForMoment} from "./sukuyo-astronomy.js";
const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY="sukyo_yearly_fortune_unlock";
function clean(value) {
  return String(value == null ? "" : value).trim();
}
export async function buildSukuyoYearlyFortuneResultV2({ auth, profile, targetYear, env = {}, requestUrl = "" }) {
  const lunar = resolveSukuyoLunarFromProfile(profile);
  if (!lunar) {
    const error = new Error("숙요점 1년운 계산에 필요한 생년월일이 부족합니다.");
    error.status = 422;
    error.code = "INVALID_PROFILE_BIRTH";
    throw error;
  }

  const natal = await calculateSukuyoForMoment(env, {
    calendarType: lunar.calendarType,
    year: lunar.calendarType === "solar" ? lunar.solarYear : lunar.year,
    month: lunar.calendarType === "solar" ? lunar.solarMonth : lunar.month,
    day: lunar.calendarType === "solar" ? lunar.solarDay : lunar.day,
    hour: lunar.hour,
    minute: lunar.minute,
    timezone: lunar.timezone,
    timezoneOffset: lunar.timezoneOffset,
    latitude: lunar.latitude,
    longitude: lunar.longitude,
    birthTimeKnown: true,
  }, { requestUrl });
  const natalName = clean(natal.nameKo || natal.name || natal.label || natal.mansion || "본명숙");
  const natalIndex = Number.isFinite(Number(natal.index)) ? Number(natal.index) : 0;
  const birth = profile.birth || {};
  const seed = hashSukuyoYearlySeed([
    auth.userId,
    profile.profileId,
    birth.year,
    birth.month,
    birth.day,
    birth.hour,
    birth.minute,
    profile.gender,
    targetYear,
    SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    "v2",
  ].join("|"));
  const archetypes = [
    { key: "달빛 정렬", tone: "흩어진 약속과 감정의 결을 다시 맞추는 해", action: "이미 곁에 있는 관계와 일을 선명하게 정리할수록 복이 붙습니다." },
    { key: "인연 개화", tone: "사람을 통해 길이 열리고 오래된 문이 다시 빛나는 해", action: "소개, 협업, 재회의 신호가 오면 조건을 분명히 두고 받아들이세요." },
    { key: "기반 축성", tone: "느린 축적이 나중의 큰 흐름을 받치는 해", action: "월별 지출, 체력, 업무 루틴을 기록으로 남기면 운의 흔들림이 줄어듭니다." },
    { key: "경계 재편", tone: "끌림과 부담을 분리하며 나의 영역을 되찾는 해", action: "급한 계약과 감정적 약속은 하루를 묵힌 뒤 움직이세요." },
    { key: "성과 점등", tone: "이름, 실적, 평판이 밖으로 드러나는 해", action: "드러낼 결과물을 작게라도 완성해 사람 앞에 올리세요." },
  ];
  const themeProfile = archetypes[(seed + natalIndex) % archetypes.length];
  const totalScore = scoreSukuyoYearly(seed, 72 + (natalIndex % 5), 13, 1);
  const firstScore = scoreSukuyoYearly(seed, 68 + (natalIndex % 7), 12, 2);
  const secondScore = scoreSukuyoYearly(seed, 70 + (natalIndex % 6), 12, 3);
  const monthTitles = ["문이 열림", "숨 고르기", "관계 조율", "기반 정리", "실행 점화", "감정 정돈", "성과 노출", "계약 검증", "회복과 재배치", "귀인 접속", "돈의 기준", "마무리와 봉인"];
  const monthlyAstronomy = await Promise.all(Array.from({ length: 12 }, (_, index) => calculateSukuyoForMoment(env, {
    year: targetYear, month: index + 1, day: 15, hour: 12, minute: 0, timezoneOffset: 9, birthTimeKnown: false,
  }, { requestUrl })));
  const monthlyFlow = monthlyAstronomy.map((monthSukuyo, index) => {
    const month = index + 1;
    const anchor = {
      anchorDate: formatSukuyoYearlyAnchorDate(targetYear, month),
      lunarDate: { year: monthSukuyo.lunarYear, month: monthSukuyo.lunarMonth, day: monthSukuyo.lunarDay, isLeapMonth: monthSukuyo.isLeapMonth },
      monthSukuyo,
    };
    const monthIndex = Number.isFinite(Number(monthSukuyo.mansionIdx)) ? Number(monthSukuyo.mansionIdx) : (natalIndex + index + 1) % 27;
    const distance = (monthIndex - natalIndex + 27) % 27;
    const relation = relationFromSukuyoYearlyDistance(distance);
    const score = scoreSukuyoYearly(seed, 65 + (distance % 9), 14, index + 10);
    const scoreBand = sukuyoYearlyScoreBand(score);
    const monthName = sukuyoMansionDisplay(monthSukuyo);
    return {
      month,
      anchorDate: anchor.anchorDate,
      lunarDate: anchor.lunarDate,
      monthSukuyo: {
        index: monthIndex,
        nameKo: clean(monthSukuyo.nameKo || monthSukuyo.name || "월숙"),
        nameHan: clean(monthSukuyo.nameHan || ""),
        label: monthName,
        direction: clean(monthSukuyo.direction || ""),
        element: clean(monthSukuyo.element || ""),
        keywords: Array.isArray(monthSukuyo.keywords) ? monthSukuyo.keywords.slice(0, 4) : [],
      },
      distance,
      relation,
      title: `${monthTitles[index]} · ${relation.label}`,
      score,
      scoreBand,
      theme: `${month}월에는 ${anchor.anchorDate}의 월숙 ${monthName}이 본명숙 ${natalName}에 ${relation.label}의 결로 닿습니다. ${relation.theme}이 강하게 떠오르고, ${scoreBand.tone}`,
      relationship: `${relation.label}의 달빛은 사람 사이의 거리와 약속의 온도를 먼저 비춥니다. 호의가 들어오면 바로 붙잡기보다 서로의 역할과 기대치를 맞출 때 인연이 편안히 깊어집니다.`,
      workMoney: `${monthName}의 기운은 일과 돈에서 ${relation.opportunity}을 가리킵니다. 이달의 실속은 큰 승부보다 일정, 정산, 책임 범위를 분명히 적는 데서 열립니다.`,
      healthMind: `${relation.caution}이 마음을 흔들 수 있습니다. 몸의 리듬은 월초보다 월중 이후에 반응하니, 수면과 회복 시간을 먼저 지켜야 판단이 흐려지지 않습니다.`,
      opportunity: relation.opportunity,
      action: score >= 74
        ? "좋은 흐름은 작은 약속으로 바로 고정하고, 결과가 보이는 일부터 앞에 두세요."
        : score >= 60
          ? "속도를 일정하게 유지하며 관계와 돈의 조건을 한 번 더 맞추세요."
          : "새로운 확장보다 정리, 검증, 회복을 먼저 두면 손실이 줄어듭니다.",
      caution: relation.caution,
    };
  });

  const risingMonths = monthlyFlow.filter((item) => item.score >= 74).slice(0, 3);
  const cautionMonths = monthlyFlow.filter((item) => item.score < 60).slice(0, 3);
  const relationCounts = monthlyFlow.reduce((acc, item) => {
    const key = item.relation?.label || "기타";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const dominantRelation = Object.entries(relationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "명";
  const profileSummary = {
    name: clean(profile.name || "사용자"),
    birthDate: formatSukuyoBirthDate(profile),
    calendarType: clean(profile.birth?.calType || "solar"),
    gender: normalizeSukuyoGenderLabel(profile.gender),
    targetYear,
    "natal宿": natalName,
  };
  const calculationBasis = {
    methodVersion: "sukuyo-yearly-v2",
    targetYear,
    natalSukuyo: {
      index: natalIndex,
      nameKo: natalName,
      nameHan: clean(natal.nameHan || ""),
      lunarDate: `${lunar.year}-${String(lunar.month).padStart(2, "0")}-${String(lunar.day).padStart(2, "0")}`,
      isLeapMonth: Boolean(lunar.isLeap),
      direction: clean(natal.direction || ""),
      element: clean(natal.element || ""),
      keywords: Array.isArray(natal.keywords) ? natal.keywords.slice(0, 4) : [],
    },
    monthlyAnchor: "각 월 15일 KST 정오의 양력 기준을 음력 27숙으로 환산",
    dominantRelation,
    risingMonths: risingMonths.map((item) => `${item.month}월`),
    cautionMonths: cautionMonths.map((item) => `${item.month}월`),
  };
  const keywords = [
    themeProfile.key,
    `${dominantRelation}의 문`,
    pickSukuyoYearly(["월별 속도 조절", "관계의 선명함", "돈의 기준선", "몸의 리듬", "작은 완성"], seed, 8),
  ];
  return {
    calculationBasis,
    profileSummary,
    yearlyTheme: {
      title: `${targetYear}년 ${natalName}의 ${themeProfile.key}`,
      keywords,
      evidence: [
        `본명숙 ${natalName}`,
        `연간 우세 관계 ${dominantRelation}`,
        `상승 달 ${risingMonths.map((item) => `${item.month}월`).join(", ") || "분기 전환기"}`,
        `주의 달 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "월말 정리기"}`,
      ],
      summary: `${natalName}의 ${targetYear}년에는 ${themeProfile.tone}가 드러납니다. 상승기는 ${risingMonths.map((item) => `${item.month}월`).join(", ") || "상반기 중반"}에 머물고, 조심해야 할 흐름은 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "분기 전환기"}에 비칩니다. ${themeProfile.action}`,
    },
    totalFortune: {
      score: totalScore,
      text: `올해 총운은 본명숙 ${natalName}이 가진 달의 감지력이 월별 숙의 변화와 만나는 해입니다. ${dominantRelation}의 흐름이 가장 자주 떠오르므로, 큰 행운 하나를 기다리기보다 사람, 돈, 몸의 리듬이 동시에 맞는 문을 골라 여는 지혜가 필요합니다. ${themeProfile.key}의 기운은 이미 곁에 있던 기회가 이름을 얻는 모습으로 드러납니다.`,
    },
    firstHalf: {
      score: firstScore,
      text: `상반기는 기반을 다지는 달빛이 강합니다. ${monthlyFlow.slice(0, 6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 순서로 문이 열리며, 관계에서는 말의 속도보다 약속의 정확도가 중요하게 비칩니다.`,
      action: "새로 시작하는 일은 작게 시험하고, 지출과 일정은 숫자로 남기세요.",
    },
    secondHalf: {
      score: secondScore,
      text: `하반기는 성과와 정리의 결이 함께 흐릅니다. ${monthlyFlow.slice(6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 리듬 속에서 오래 끌던 일이 형태를 얻고, 맞지 않는 인연은 자연스럽게 거리가 잡힙니다.`,
      action: "좋은 제안도 조건표를 먼저 보고, 오래된 부담은 역할을 다시 나누세요.",
    },
    monthlyFlow,
    loveAndRelationship: buildSukuyoYearlyDomain({
      title: "사랑/관계운",
      score: scoreSukuyoYearly(seed, 69, 15, 31),
      mainText: `사랑과 관계에서는 ${dominantRelation}의 결이 가장 크게 떠오릅니다. 마음이 빨라지는 순간일수록 말의 온도와 약속의 범위를 함께 맞춰야 관계가 오래 갑니다. 상승 달에는 표현을 아끼지 말고, 주의 달에는 관계의 이름보다 서로가 감당할 현실을 먼저 살피세요.`,
      advice: "호감은 자주 표현하되, 관계의 속도는 상대의 생활 리듬과 책임 범위까지 보고 정하세요.",
      evidence: [`본명숙 ${natalName}`, `우세 관계 ${dominantRelation}`],
      months: risingMonths,
    }),
    workAndBusiness: buildSukuyoYearlyDomain({
      title: "일/사업/학업운",
      score: scoreSukuyoYearly(seed, 70, 14, 41),
      mainText: `일과 사업운은 월별 숙의 변화가 성과의 속도를 나눕니다. ${risingMonths.map((item) => `${item.month}월`).join(", ") || "상승 구간"}에는 외부 제안과 발표운이 밝고, ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "정비 구간"}에는 계약 조건과 마감 기준을 다시 보아야 합니다.`,
      advice: "작은 결과물을 먼저 공개하고, 역할·마감·정산 기준은 문서로 남기세요.",
      evidence: monthlyFlow.slice(0, 3).map((item) => `${item.month}월 ${item.monthSukuyo.label}`),
      months: risingMonths,
    }),
    money: buildSukuyoYearlyDomain({
      title: "금전운",
      score: scoreSukuyoYearly(seed, 67, 15, 51),
      mainText: "금전운은 한 번의 큰 수익보다 새는 돈을 막는 힘이 먼저 들어옵니다. 돈의 흐름은 관계와 함께 움직이므로, 호의로 시작한 약속도 비용과 책임을 나누어 적을 때 재물이 안정됩니다.",
      advice: "월초에는 예산을 세우고, 보름 전후에는 지출과 미수금을 확인하며, 월말에는 현금 흐름을 정리하세요.",
      evidence: [`상승 달 ${risingMonths.map((item) => `${item.month}월`).join(", ") || "없음"}`, `주의 달 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "없음"}`],
      months: cautionMonths,
    }),
    healthAndMind: buildSukuyoYearlyDomain({
      title: "건강/멘탈운",
      score: scoreSukuyoYearly(seed, 68, 14, 61),
      mainText: "건강과 멘탈은 수면, 말, 일정 과부하에서 먼저 신호가 비칩니다. 운이 밝은 달에도 회복 시간을 줄이면 감정 판단이 거칠어지니, 몸의 리듬을 지키는 일이 올해의 보호막입니다.",
      advice: "보름 전후로 수면과 약속을 줄이고, 긴장도가 높은 달에는 운동보다 회복 루틴을 우선하세요.",
      evidence: [`본명숙 ${natalName}`, `정비 달 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "월말"}`],
      months: cautionMonths,
    }),
    noblePersonAndCaution: {
      noblePerson: `${pickSukuyoYearly(["영친", "우쇠", "성위"], seed, 71)}의 기운을 가진 사람, 약속을 숫자와 일정으로 맞춰 주는 사람`,
      cautionPerson: `${pickSukuyoYearly(["안괴", "명", "우쇠"], seed, 72)}의 그림자가 강한 사람, 감정으로 결정을 재촉하는 사람`,
      relationshipAdvice: "올해의 인연은 오래 붙드는 힘보다 서로의 경계를 존중하는 태도에서 깊어집니다.",
    },
    sukuyoMasterFocus: {
      yearlyGate: `${targetYear}년의 문은 ${pickSukuyoYearly(["관계의 이름을 다시 세우는 자리", "오래 미룬 약속이 형태를 얻는 자리", "돈과 마음의 경계를 함께 정돈하는 자리", "몸의 리듬을 지켜야 운이 열리는 자리"], seed, 81)}로 열립니다.`,
      moonPacing: `${natalName}에게 올해의 달은 ${pickSukuyoYearly(["초승에는 작게 시작하고 보름에는 약속을 확인하라", "상현에는 말을 아끼고 하현에는 지출을 정리하라", "밝은 달에는 드러내고 어두운 달에는 회복하라"], seed, 82)}고 가리킵니다.`,
      taboo: `${pickSukuyoYearly(["감정이 가장 뜨거운 날 바로 계약하는 일", "상대의 속도를 내 운의 속도로 착각하는 일", "회복되지 않은 인연을 성급히 다시 여는 일"], seed, 83)}은 올해의 숙요 금기로 떠오릅니다.`,
      repairKey: `${pickSukuyoYearly(["사흘의 침묵 뒤 한 문장의 약속", "숫자로 남긴 일정과 정산", "보름 전후의 관계 거리 조율", "월말의 현금 흐름 정리"], seed, 84)}이 복을 다시 부르는 열쇠로 머무릅니다.`,
    },
    finalPrescription: {
      oneLine: `${targetYear}년 ${natalName}에게는 달마다 오는 문을 모두 열기보다, 내 별이 편안히 숨 쉬는 문만 고르는 지혜가 필요합니다.`,
      doThis: ["월초 목표 하나를 정하기", "보름 전후 관계와 지출 점검하기", "좋은 제안은 작은 실행으로 먼저 검증하기"],
      avoidThis: ["감정이 오른 날 계약하기", "다른 프로필의 운을 내 흐름처럼 섞기", "회복 시간을 줄여 성과를 밀어붙이기"],
    },
  };
}

export function resolveSukuyoLunarFromProfile(profile) {
  const birth = profile?.birth || profile || {};
  const location = profile?.location || birth.location || {};
  const year = Math.trunc(Number(birth.year));
  const month = Math.trunc(Number(birth.month));
  const day = Math.trunc(Number(birth.day));
  const hour = clampSukuyoBirthClockPart(birth.hour, 23, 12);
  const minute = clampSukuyoBirthClockPart(birth.minute, 59, 0);
  if (!isSukuyoBirthDatePartInRange(year, 1000, 9999)
    || !isSukuyoBirthDatePartInRange(month, 1, 12)
    || !isSukuyoBirthDatePartInRange(day, 1, 31)) {
    return null;
  }
  const calendarType = clean(birth.calType || "solar").toLowerCase();
  if (calendarType === "lunar" || calendarType === "lunar_leap") {
    const solar = lunarToSolar(year, month, day, calendarType === "lunar_leap");
    return {
      year, month, day, isLeap: calendarType === "lunar_leap", calendarType,
      solarYear: solar?.year ?? null, solarMonth: solar?.month ?? null, solarDay: solar?.day ?? null,
      hour,
      minute,
      timezone: clean(birth.timezone || location.timezone || "Asia/Seoul") || "Asia/Seoul",
      timezoneOffset: Number.isFinite(Number(birth.timezoneOffset ?? birth.tzOffset ?? location.timezoneOffset ?? location.tzOffset))
        ? Number(birth.timezoneOffset ?? birth.tzOffset ?? location.timezoneOffset ?? location.tzOffset) : null,
      latitude: Number.isFinite(Number(birth.latitude ?? birth.lat ?? location.latitude ?? location.lat)) ? Number(birth.latitude ?? birth.lat ?? location.latitude ?? location.lat) : null,
      longitude: Number.isFinite(Number(birth.longitude ?? birth.lon ?? birth.lng ?? location.longitude ?? location.lon ?? location.lng)) ? Number(birth.longitude ?? birth.lon ?? birth.lng ?? location.longitude ?? location.lon ?? location.lng) : null,
    };
  }
  // 시·분은 위에서 접어 두었지만 음력일 판정에는 쓰이지 않는다(실측: 0~23시 동일).
  const lunar = solarToLunar(year, month, day);
  if (!lunar) return null;
  return {
    year: lunar.lunarYear,
    month: lunar.lunarMonth,
    day: lunar.lunarDay,
    isLeap: lunar.isLeapMonth,
    calendarType: "solar",
    solarYear: year,
    solarMonth: month,
    solarDay: day,
    hour,
    minute,
    timezone: clean(birth.timezone || location.timezone || "Asia/Seoul") || "Asia/Seoul",
    timezoneOffset: Number.isFinite(Number(birth.timezoneOffset ?? birth.tzOffset ?? location.timezoneOffset ?? location.tzOffset))
      ? Number(birth.timezoneOffset ?? birth.tzOffset ?? location.timezoneOffset ?? location.tzOffset) : null,
    latitude: Number.isFinite(Number(birth.latitude ?? birth.lat ?? location.latitude ?? location.lat)) ? Number(birth.latitude ?? birth.lat ?? location.latitude ?? location.lat) : null,
    longitude: Number.isFinite(Number(birth.longitude ?? birth.lon ?? birth.lng ?? location.longitude ?? location.lon ?? location.lng)) ? Number(birth.longitude ?? birth.lon ?? birth.lng ?? location.longitude ?? location.lon ?? location.lng) : null,
  };
}

export function hashSukuyoYearlySeed(value) {
  const text = clean(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function scoreSukuyoYearly(seed, base = 62, spread = 18, offset = 0) {
  const n = (Math.abs(Number(seed || 0)) + offset * 9973) % (spread * 2 + 1);
  return Math.max(35, Math.min(96, Math.round(base - spread + n)));
}

export function formatSukuyoYearlyAnchorDate(year, month) {
  return `${String(Number(year)).padStart(4, "0")}-${String(Number(month)).padStart(2, "0")}-15`;
}

export function relationFromSukuyoYearlyDistance(distance) {
  const d = ((Number(distance) % 27) + 27) % 27;
  if (d === 0) {
    return {
      label: "명",
      theme: "내 본명숙의 원형이 그대로 되비치는 달",
      opportunity: "정체성, 이름값, 중요한 기준을 다시 세울 기회",
      caution: "혼자 정한 기준을 모두에게 요구하려는 마음",
    };
  }
  if ([1, 8, 10, 17, 19, 26].includes(d)) {
    return {
      label: "영친",
      theme: "사람과 자원이 부드럽게 이어지는 달",
      opportunity: "귀인, 소개, 협업, 재회 흐름",
      caution: "호의와 의무를 혼동하는 선택",
    };
  }
  if ([2, 7, 11, 16, 20, 25].includes(d)) {
    return {
      label: "우쇠",
      theme: "편안함 속에서 실속을 다지는 달",
      opportunity: "루틴 정비와 안정적인 수익 구조",
      caution: "익숙함 때문에 미뤄 둔 결정을 방치하는 흐름",
    };
  }
  if ([3, 6, 12, 15, 21, 24].includes(d)) {
    return {
      label: "안괴",
      theme: "경계와 욕망이 동시에 떠오르는 달",
      opportunity: "낡은 패턴을 끊고 판을 다시 짜는 힘",
      caution: "감정적인 확장, 충동 계약, 날 선 말",
    };
  }
  return {
    label: "성위",
    theme: "역할과 성취가 현실로 굳어지는 달",
    opportunity: "성과 발표, 시험, 승진, 사업 구조화",
    caution: "성과를 빨리 증명하려다 회복을 줄이는 선택",
  };
}

export function sukuyoYearlyScoreBand(score) {
  const n = Number(score);
  if (n >= 82) return { label: "강한 상승", tone: "열리는 문이 분명하니, 좋은 제안은 작은 약속으로 바로 고정해도 좋습니다." };
  if (n >= 72) return { label: "안정 상승", tone: "기회가 천천히 붙습니다. 서두르기보다 조건을 맞추면 운이 길어집니다." };
  if (n >= 60) return { label: "조율 구간", tone: "무리한 확장보다 관계, 돈, 체력의 균형을 맞출수록 흐름이 안정됩니다." };
  return { label: "정비 구간", tone: "새로 벌리기보다 정리와 회복을 먼저 두면 손실이 줄어듭니다." };
}

export function sukuyoMansionDisplay(mansion = {}) {
  const name = clean(mansion.nameKo || mansion.name || mansion.label || mansion.mansion || "월숙");
  const han = clean(mansion.nameHan || mansion.han || "");
  return han ? `${name}(${han})` : name;
}

export function formatSukuyoBirthDate(profile) {
  const birth = profile?.birth || {};
  const y = String(Number(birth.year || 0)).padStart(4, "0");
  const m = String(Number(birth.month || 0)).padStart(2, "0");
  const d = String(Number(birth.day || 0)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeSukuyoGenderLabel(value) {
  const token = clean(value).toUpperCase();
  if (token === "M" || token === "MALE") return "남성";
  if (token === "F" || token === "FEMALE") return "여성";
  return "미지정";
}

export function pickSukuyoYearly(list, seed, offset = 0) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[(Math.abs(Number(seed || 0)) + offset) % list.length];
}

export function buildSukuyoYearlyDomain({ title, score, mainText, advice, evidence = [], months = [] }) {
  return {
    title,
    score,
    text: mainText,
    advice,
    evidence,
    keyMonths: months.map((item) => `${item.month}월 ${item.relation?.label || ""}`.trim()).slice(0, 3),
  };
}

export function clampSukuyoBirthClockPart(value, max, fallback) {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return fallback;
  return parsed;
}

export function isSukuyoBirthDatePartInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}
