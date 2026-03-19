const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const cron = require("node-cron");
const nodemailer = require("nodemailer");

function getDayHeavenlyStemIndex(date) {
  const base = new Date(2000, 0, 7);
  const diff = Math.floor((date - base) / (1000 * 60 * 60 * 24));
  return ((6 + diff) % 10 + 10) % 10;
}

function getDayEarthlyBranchIndex(date) {
  const base = new Date(2000, 0, 7);
  const diff = Math.floor((date - base) / (1000 * 60 * 60 * 24));
  return ((4 + diff) % 12 + 12) % 12;
}

function getSunSign(month, day) {
  const signs = [
    { sign: "염소자리", end: [1, 19] },
    { sign: "물병자리", end: [2, 18] },
    { sign: "물고기자리", end: [3, 20] },
    { sign: "양자리", end: [4, 19] },
    { sign: "황소자리", end: [5, 20] },
    { sign: "쌍둥이자리", end: [6, 20] },
    { sign: "게자리", end: [7, 22] },
    { sign: "사자자리", end: [8, 22] },
    { sign: "처녀자리", end: [9, 22] },
    { sign: "천칭자리", end: [10, 22] },
    { sign: "전갈자리", end: [11, 21] },
    { sign: "사수자리", end: [12, 21] },
    { sign: "염소자리", end: [12, 31] },
  ];
  for (const s of signs) {
    if (month < s.end[0] || (month === s.end[0] && day <= s.end[1])) return s.sign;
  }
  return "염소자리";
}

function buildPrompt(inputs) {
  return `
## 🌸 CODE DESTINY 일일 운세 콘텐츠 자동 생성

### ✅ 오늘의 자동 추출 입력값
- 날짜:          ${inputs.날짜}
- 요일:          ${inputs.요일}
- 음력:          ${inputs.음력}
- 일진 천간:     ${inputs.일진_천간}
- 일진 지지:     ${inputs.일진_지지}
- 오늘의 오행:   ${inputs.오늘의_오행}
- 이십팔수:      ${inputs.이십팔수}
- 나크샤트라:    ${inputs.나크샤트라}
- 태양 별자리:   ${inputs.태양_별자리}
- 달의 위치:     ${inputs.달_위치}

요청:
1) 사주 / 자미두수 / 숙요점 / 점성술 / 베다점 5개 섹션 생성
2) KR / EN / JP / CN / FR 다국어 버전 생성
3) 인스타 / X / 블로그 / 이메일 포맷 생성
4) code-destiny.com CTA 포함
`;
}

async function generateDailyContentPrompt() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const weekDays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const weekDay = weekDays[today.getDay()];

  const CHEONGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const JIJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const OHAENG_MAP = {
    甲: "목(木)", 乙: "목(木)", 丙: "화(火)", 丁: "화(火)", 戊: "토(土)",
    己: "토(土)", 庚: "금(金)", 辛: "금(金)", 壬: "수(水)", 癸: "수(水)",
  };

  const ilgan = CHEONGAN[getDayHeavenlyStemIndex(today)];
  const iiji = JIJI[getDayEarthlyBranchIndex(today)];
  const ohaeng = OHAENG_MAP[ilgan] || "목(木)";

  // 서버 독립 실행을 위해 음력은 기본 포맷으로 제공
  const lunarStr = "음력 자동 계산 필요";

  const SUKYOLIST = [
    "각(角)", "항(亢)", "저(氐)", "방(房)", "심(心)", "미(尾)", "기(箕)", "두(斗)",
    "우(牛)", "여(女)", "허(虛)", "위(危)", "실(室)", "벽(壁)", "규(奎)", "루(婁)",
    "위(胃)", "묘(昴)", "필(畢)", "자(觜)", "삼(參)", "정(井)", "귀(鬼)", "류(柱)",
    "성(별)", "장(張)", "익(翼)", "진(軫)",
  ];
  const BASE_DATE = new Date(2000, 0, 7);
  const dayDiff = Math.floor((today - BASE_DATE) / (1000 * 60 * 60 * 24));
  const todaySukyo = SUKYOLIST[((dayDiff % 28) + 28) % 28];

  const NAKSHATRA = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
    "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati",
  ];
  const BASE_NAK = new Date(2000, 0, 1);
  const nakDiff = Math.floor((today - BASE_NAK) / (1000 * 60 * 60 * 24));
  const todayNak = NAKSHATRA[((nakDiff % 27) + 27) % 27];

  const sunSign = getSunSign(today.getMonth() + 1, today.getDate());

  const MOON_SIGNS = [
    "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
    "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리",
  ];
  const moonIndex = Math.floor((dayDiff % 354) / (354 / 12)) % 12;
  const moonSign = MOON_SIGNS[moonIndex];

  return buildPrompt({
    날짜: `${yyyy}년 ${mm}월 ${dd}일`,
    요일: weekDay,
    음력: lunarStr,
    일진_천간: ilgan,
    일진_지지: iiji,
    오늘의_오행: ohaeng,
    이십팔수: todaySukyo,
    나크샤트라: todayNak,
    태양_별자리: sunSign,
    달_위치: moonSign,
    타임스탬프: today.toISOString(),
  });
}

async function sendEmail({ to, subject, body }) {
  const host = process.env.ADMIN_SMTP_HOST;
  const port = Number(process.env.ADMIN_SMTP_PORT || 587);
  const user = process.env.ADMIN_SMTP_USER;
  const pass = process.env.ADMIN_SMTP_PASS;
  const from = process.env.ADMIN_SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP 환경변수가 비어 있습니다. ADMIN_SMTP_* 값을 설정해 주세요.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
  });
}

const targetEmail = process.env.DAILY_CONTENT_EMAIL_TO || "your-email@gmail.com";

cron.schedule("0 6 * * *", async () => {
  console.log("🌸 일일 콘텐츠 프롬프트 자동 생성 시작...");
  try {
    const prompt = await generateDailyContentPrompt();
    await sendEmail({
      to: targetEmail,
      subject: `🌸 ${new Date().toLocaleDateString("ko-KR")} 오늘의 콘텐츠 프롬프트`,
      body: prompt,
    });
    console.log("✅ 완료");
  } catch (error) {
    console.error("❌ 자동화 실패:", error.message);
  }
}, {
  timezone: "Asia/Seoul",
});

console.log("🕕 daily-content cron started (Asia/Seoul, 06:00)");

