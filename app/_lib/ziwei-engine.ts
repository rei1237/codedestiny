import { Solar, Lunar } from "lunar-javascript";

/** 자미두수 지지 목록 */
export const ZHI_LIST = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
/** 자미두수 천간 목록 */
export const GAN_LIST = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];

const HAN_TO_KR_GAN: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};

const HAN_TO_KR_ZHI: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};

export interface ZiweiStar {
  name: string;
  symbol: string; // 묘왕평리함
}

export interface ZiweiPalaceData {
  palace: string;
  branch: string;
  stars: ZiweiStar[];
  auxStars: ZiweiStar[];
  badStars: ZiweiStar[];
  dahan: string; // "14-23" 등
}

export interface ZiweiChartData {
  meng: string;
  body: string;
  yearGan: string;
  yearZhi: string;
  juInfo: string;
  palaceStarData: ZiweiPalaceData[];
  sihua: { luk: string; quan: string; ke: string; ji: string };
}

/** 
 * 자미두수 전문 계산 엔진 
 * (saju-engine.js 기반 TypeScript 이식)
 */
export function calcZiweiPalaces(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: "M" | "F"
): ZiweiChartData {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  const lYear = lunar.getYear();
  const lMonth = Math.abs(lunar.getMonth());
  const lDay = lunar.getDay();
  
  const yGanRaw = String(lunar.getYearGan() || "");
  const yZhiRaw = String(lunar.getYearZhi() || "");
  const yGan = HAN_TO_KR_GAN[yGanRaw] || yGanRaw;
  const yZhi = HAN_TO_KR_ZHI[yZhiRaw] || yZhiRaw;
  let gIdx = GAN_LIST.indexOf(yGan);
  let zIdx = ZHI_LIST.indexOf(yZhi);
  if (gIdx < 0) gIdx = ((lYear - 4) % 10 + 10) % 10;
  if (zIdx < 0) zIdx = ((lYear - 4) % 12 + 12) % 12;
  
  // 시지 index (자시=0, 축시=1 ...)
  const hIdx = (hour === 23 || hour === 0) ? 0 : Math.floor((hour + 1) / 2);

  // 명궁/신궁 계산
  const baseIdx = (2 + lMonth - 1) % 12; // 인월 기점
  const mingIdx = (baseIdx - hIdx + 12) % 12;
  const shenIdx = (baseIdx + hIdx) % 12;

  const PALACE_LABELS = ["명궁", "형제궁", "부처궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
  const palacesByIndex: string[] = new Array(12);
  const palaceStarData: ZiweiPalaceData[] = Array.from({ length: 12 }, (_, i) => ({
    palace: "",
    branch: ZHI_LIST[i],
    stars: [],
    auxStars: [],
    badStars: [],
    dahan: ""
  }));

  for (let i = 0; i < 12; i++) {
    const pIdx = (mingIdx - i + 12) % 12;
    palacesByIndex[pIdx] = PALACE_LABELS[i];
    palaceStarData[pIdx].palace = PALACE_LABELS[i];
  }

  // 오행국 계산
  const inStart = [2, 4, 6, 8, 0][((gIdx % 5) + 5) % 5];
  const mgGan = GAN_LIST[(inStart + (mingIdx - 2 + 12) % 12) % 10];
  const sMap: Record<string, number> = { '갑': 1, '을': 1, '병': 2, '정': 2, '무': 3, '기': 3, '경': 4, '신': 4, '임': 5, '계': 5 };
  const bMap: Record<number, number> = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 };
  let wVal = sMap[mgGan] + bMap[mingIdx];
  if (wVal > 5) wVal -= 5;
  const juMap: Record<number, number> = { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 };
  const ju = juMap[wVal] || 4; 
  const juLabels: Record<number, string> = { 2: "목3국", 3: "화6국", 4: "금4국", 5: "토5국", 6: "수2국" };

  // 주성 배치
  let q = Math.floor(lDay / ju);
  let r = lDay % ju;
  let add = 0;
  if (r !== 0) { add = ju - r; q = Math.floor((lDay + add) / ju); }
  let pos = q;
  if (add > 0) {
    if (add % 2 === 1) pos = q - add;
    else pos = q + add;
  }
  while (pos <= 0) pos += 12;
  while (pos > 12) pos -= 12;
  const ziweiPos = (pos + 1) % 12;
  const tianfuPos = (16 - ziweiPos) % 12;

  const addStar = (pIdx: number, name: string, type: "main" | "aux" | "bad") => {
    const target = palaceStarData[pIdx % 12];
    const star = { name, symbol: getBrightness(name, pIdx % 12) };
    if (type === "main") target.stars.push(star);
    else if (type === "aux") target.auxStars.push(star);
    else target.badStars.push(star);
  };

  // 14주성
  addStar(ziweiPos, "자미", "main");
  addStar(ziweiPos + 11, "천기", "main");
  addStar(ziweiPos + 9, "태양", "main");
  addStar(ziweiPos + 8, "무곡", "main");
  addStar(ziweiPos + 7, "천동", "main");
  addStar(ziweiPos + 4, "염정", "main");
  
  addStar(tianfuPos, "천부", "main");
  addStar(tianfuPos + 1, "태음", "main");
  addStar(tianfuPos + 2, "탐랑", "main");
  addStar(tianfuPos + 3, "거문", "main");
  addStar(tianfuPos + 4, "천상", "main");
  addStar(tianfuPos + 5, "천량", "main");
  addStar(tianfuPos + 6, "칠살", "main");
  addStar(tianfuPos + 10, "파군", "main");

  // 보좌성/살성
  addStar(10 - hIdx, "문창", "aux");
  addStar(4 + hIdx, "문곡", "aux");
  addStar(4 + (lMonth - 1), "좌보", "aux");
  addStar(10 - (lMonth - 1), "우필", "aux");
  
  const luCunMap = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const luCunPos = luCunMap[gIdx];
  if (Number.isFinite(luCunPos)) {
    addStar(luCunPos, "록존", "aux");
    addStar(luCunPos + 1, "경양", "bad");
    addStar(luCunPos + 11, "타라", "bad");
  }
  
  addStar(11 - hIdx, "지공", "bad");
  addStar(11 + hIdx, "지겁", "bad");

  // 사화
  const sihuaMap: Record<string, string[]> = {
    '갑': ['염정', '파군', '무곡', '태양'],
    '을': ['천기', '천량', '자미', '태음'],
    '병': ['천동', '천기', '문창', '염정'],
    '정': ['태음', '천동', '천기', '거문'],
    '무': ['탐랑', '태음', '우필', '천기'],
    '기': ['무곡', '탐랑', '천량', '문곡'],
    '경': ['태양', '무곡', '태음', '천동'],
    '신': ['거문', '태양', '문곡', '문창'],
    '임': ['천량', '자미', '좌보', '무곡'],
    '계': ['파군', '거문', '태음', '탐랑']
  };
  const [luk, quan, ke, ji] = sihuaMap[yGan] || [];

  // 대한
  const isYang = [0, 2, 4, 6, 8].includes(gIdx);
  const isMale = gender === "M";
  const dir = (isYang === isMale) ? 1 : -1;
  for (let i = 0; i < 12; i++) {
    const pIdx = (mingIdx + i * dir + 120) % 12;
    const start = ju + i * 10;
    palaceStarData[pIdx].dahan = `${start}-${start + 9}`;
  }

  return {
    meng: ZHI_LIST[mingIdx],
    body: ZHI_LIST[shenIdx],
    yearGan: yGan,
    yearZhi: yZhi,
    juInfo: juLabels[ju],
    palaceStarData,
    sihua: { luk, quan, ke, ji }
  };
}

/** 묘왕평리함 간략화 로직 */
function getBrightness(star: string, branch: number): string {
  // 실제로는 정밀한 테이블이 필요하지만, 여기서는 시각적 효과를 위해 일부만 구현
  const miao = [0, 4, 8];
  const xian = [2, 6, 10];
  if (miao.includes(branch)) return "◎";
  if (xian.includes(branch)) return "X";
  return "○";
}
