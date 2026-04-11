import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { Solar } from "lunar-javascript";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";

// ─────────────────────────────────────────────────────────────────
// 자미두수 계산 로직 (서버사이드)
// ─────────────────────────────────────────────────────────────────

const ZHI_LIST = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GAN_LIST = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];

// ── 전통 廟旺平利陷 고전 밝기 테이블 (saju-engine.js ZW_CLASSICAL_STATE 동기화) ────
const ZW_CLASSICAL_STATE: Record<string, Record<string, string>> = {
  "자미":{"子":"평","丑":"묘","寅":"왕","卯":"왕","辰":"묘","巳":"평","午":"묘","未":"묘","申":"평","酉":"평","戌":"묘","亥":"평"},
  "천기":{"子":"평","丑":"함","寅":"왕","卯":"왕","辰":"평","巳":"리","午":"함","未":"평","申":"묘","酉":"왕","戌":"평","亥":"묘"},
  "태양":{"子":"함","丑":"함","寅":"묘","卯":"묘","辰":"왕","巳":"왕","午":"묘","未":"왕","申":"평","酉":"함","戌":"함","亥":"함"},
  "무곡":{"子":"묘","丑":"왕","寅":"리","卯":"평","辰":"묘","巳":"평","午":"평","未":"평","申":"왕","酉":"묘","戌":"함","亥":"리"},
  "천동":{"子":"왕","丑":"함","寅":"평","卯":"묘","辰":"함","巳":"평","午":"함","未":"묘","申":"평","酉":"평","戌":"리","亥":"왕"},
  "염정":{"子":"평","丑":"평","寅":"묘","卯":"평","辰":"묘","巳":"함","午":"묘","未":"묘","申":"묘","酉":"평","戌":"평","亥":"평"},
  "천부":{"子":"묘","丑":"묘","寅":"왕","卯":"평","辰":"묘","巳":"평","午":"묘","未":"묘","申":"왕","酉":"평","戌":"묘","亥":"평"},
  "태음":{"子":"왕","丑":"묘","寅":"리","卯":"평","辰":"함","巳":"함","午":"함","未":"평","申":"평","酉":"묘","戌":"묘","亥":"왕"},
  "탐랑":{"子":"왕","丑":"평","寅":"묘","卯":"리","辰":"평","巳":"묘","午":"왕","未":"평","申":"묘","酉":"묘","戌":"평","亥":"묘"},
  "거문":{"子":"왕","丑":"묘","寅":"평","卯":"함","辰":"함","巳":"묘","午":"함","未":"묘","申":"묘","酉":"평","戌":"함","亥":"묘"},
  "천상":{"子":"묘","丑":"묘","寅":"왕","卯":"평","辰":"왕","巳":"리","午":"묘","未":"묘","申":"왕","酉":"평","戌":"묘","亥":"평"},
  "천량":{"子":"평","丑":"묘","寅":"묘","卯":"묘","辰":"묘","巳":"평","午":"묘","未":"함","申":"묘","酉":"평","戌":"묘","亥":"함"},
  "칠살":{"子":"묘","丑":"평","寅":"묘","卯":"평","辰":"왕","巳":"평","午":"묘","未":"왕","申":"묘","酉":"평","戌":"묘","亥":"평"},
  "파군":{"子":"왕","丑":"함","寅":"묘","卯":"함","辰":"묘","巳":"함","午":"왕","未":"함","申":"함","酉":"함","戌":"묘","亥":"리"},
  "좌보":{"子":"왕","丑":"묘","寅":"왕","卯":"묘","辰":"묘","巳":"리","午":"왕","未":"묘","申":"왕","酉":"리","戌":"왕","亥":"리"},
  "우필":{"子":"왕","丑":"묘","寅":"왕","卯":"리","辰":"왕","巳":"리","午":"왕","未":"묘","申":"왕","酉":"리","戌":"묘","亥":"리"},
  "문창":{"子":"리","丑":"왕","寅":"묘","卯":"왕","辰":"왕","巳":"왕","午":"리","未":"왕","申":"묘","酉":"왕","戌":"리","亥":"왕"},
  "문곡":{"子":"리","丑":"왕","寅":"묘","卯":"왕","辰":"리","巳":"왕","午":"리","未":"왕","申":"리","酉":"왕","戌":"리","亥":"왕"},
  "녹존":{"子":"묘","丑":"왕","寅":"리","卯":"왕","辰":"리","巳":"리","午":"왕","未":"왕","申":"리","酉":"왕","戌":"리","亥":"리"},
  "천괴":{"子":"평","丑":"평","寅":"왕","卯":"평","辰":"평","巳":"평","午":"왕","未":"평","申":"왕","酉":"평","戌":"평","亥":"평"},
  "천월":{"子":"평","丑":"평","寅":"평","卯":"평","辰":"평","巳":"평","午":"평","未":"리","申":"묘","酉":"리","戌":"평","亥":"평"},
  "천마":{"子":"왕","丑":"리","寅":"묘","卯":"리","辰":"왕","巳":"리","午":"묘","未":"리","申":"왕","酉":"리","戌":"묘","亥":"리"},
  "경양":{"子":"리","丑":"리","寅":"왕","卯":"묘","辰":"왕","巳":"리","午":"리","未":"리","申":"왕","酉":"묘","戌":"묘","亥":"리"},
  "타라":{"子":"리","丑":"리","寅":"리","卯":"왕","辰":"묘","巳":"함","午":"리","未":"리","申":"함","酉":"리","戌":"왕","亥":"리"},
  "화성":{"子":"리","丑":"왕","寅":"왕","卯":"리","辰":"왕","巳":"리","午":"리","未":"평","申":"왕","酉":"함","戌":"왕","亥":"리"},
  "영성":{"子":"리","丑":"리","寅":"묘","卯":"묘","辰":"왕","巳":"리","午":"리","未":"리","申":"왕","酉":"함","戌":"왕","亥":"리"},
  "지공":{"子":"리","丑":"리","寅":"리","卯":"왕","辰":"묘","巳":"묘","午":"리","未":"리","申":"리","酉":"왕","戌":"묘","亥":"왕"},
  "지겁":{"子":"리","丑":"리","寅":"리","卯":"리","辰":"리","巳":"평","午":"리","未":"리","申":"리","酉":"왕","戌":"묘","亥":"왕"},
};

// 고전 밝기 조회 함수 (廟旺平利陷)
function getStarBrightness(starName: string, zhiName: string): string {
  const norm = (s: string) => {
    if (s === "약" || s === "이" || s === "한" || s === "불" || s === "득") return "리";
    return s;
  };
  const raw = (ZW_CLASSICAL_STATE[starName] ?? {})[zhiName] ?? "평";
  return norm(raw);
}

// 밝기 → 기호 변환
function brightnessSymbol(br: string): string {
  const map: Record<string, string> = { 묘: "◎묘", 왕: "○왕", 평: "▲평", 리: "△리", 함: "X함" };
  return map[br] ?? "▲평";
}

// 사화(四化) 조견표 (saju-engine.js sihuaMap 동기화)
const SIHUA_MAP: Record<string, Record<string, string>> = {
  "甲": { "염정": "화록", "파군": "화권", "무곡": "화과", "태양": "화기" },
  "乙": { "천기": "화록", "천량": "화권", "자미": "화과", "태음": "화기" },
  "丙": { "천동": "화록", "천기": "화권", "문창": "화과", "염정": "화기" },
  "丁": { "태음": "화록", "천동": "화권", "천기": "화과", "거문": "화기" },
  "戊": { "탐랑": "화록", "태음": "화권", "우필": "화과", "천기": "화기" },
  "己": { "무곡": "화록", "탐랑": "화권", "천량": "화과", "문곡": "화기" },
  "庚": { "태양": "화록", "무곡": "화권", "태음": "화과", "천동": "화기" },
  "辛": { "거문": "화록", "태양": "화권", "문곡": "화과", "문창": "화기" },
  "壬": { "천량": "화록", "자미": "화권", "좌보": "화과", "무곡": "화기" },
  "癸": { "파군": "화록", "거문": "화권", "태음": "화과", "탐랑": "화기" },
};

const STAR_CHARACTER_MAP: Record<string, { title: string; subtitle: string; emoji: string }> = {
  "자미": { title: "타고난 제왕", subtitle: "모든 별의 중심에 선 황제의 카리스마", emoji: "👑" },
  "천기": { title: "신의 전략가", subtitle: "우주의 패턴을 읽는 천재적 두뇌", emoji: "🧠" },
  "태양": { title: "빛나는 영웅", subtitle: "세상을 밝히는 불꽃 같은 주인공", emoji: "☀️" },
  "무곡": { title: "강철의 의지", subtitle: "흔들리지 않는 결단력과 실행력의 화신", emoji: "⚔️" },
  "천동": { title: "자유로운 낙천가", subtitle: "삶의 즐거움을 찾아 흐르는 바람 같은 영혼", emoji: "🌸" },
  "염정": { title: "불꽃의 혁명가", subtitle: "열정과 이상으로 세상을 바꾸는 개혁자", emoji: "🔥" },
  "천부": { title: "풍요의 수호신", subtitle: "풍요와 안정을 품에 안는 대지의 힘", emoji: "💰" },
  "태음": { title: "달빛의 예술가", subtitle: "섬세한 감성으로 세상을 노래하는 낭만주의자", emoji: "🌙" },
  "탐랑": { title: "욕망의 탐험가", subtitle: "끝없는 호기심과 생명력으로 인생을 탐색하는 모험가", emoji: "🐺" },
  "거문": { title: "진실의 탐구자", subtitle: "숨겨진 진실을 파헤치는 언어와 지식의 마스터", emoji: "🗣️" },
  "천상": { title: "헌신의 조력자", subtitle: "타인을 위해 기꺼이 빛을 내어주는 고귀한 보필자", emoji: "🤝" },
  "천량": { title: "정의의 파수꾼", subtitle: "선의와 도덕으로 세상을 지키는 수호자", emoji: "🏛️" },
  "칠살": { title: "독립의 개척자", subtitle: "누구에게도 의존하지 않는 야전의 지휘관", emoji: "⚡" },
  "파군": { title: "자유로운 탐험가", subtitle: "기존 질서를 부수고 새 길을 여는 변화의 선봉장", emoji: "💥" },
};

const PALACE_NAMES_KR = ["명궁","형제궁","부처궁","자녀궁","재백궁","질액궁","천이궁","노복궁","관록궁","전택궁","복덕궁","부모궁"];

interface StarResult {
  mingongStars: string[];
  shingongStars: string[];
  bokdeokgongStars: string[];
  bokdeokgongAux: string[];
  bokdeokgongBad: string[];
  cheonigongStars: string[];
  cheonigongAux: string[];
  cheonigongBad: string[];
  gwanrokgongStars: string[];
  gwanrokgongAux: string[];
  gwanrokgongBad: string[];
  jaebaekkongStars: string[];
  jaebaekkongAux: string[];
  jaebaekkongBad: string[];
  bucheoStars: string[];
  bucheoAux: string[];
  bucheoBad: string[];
  gyoWuStars: string[];
  gyoWuAux: string[];
  gyoWuBad: string[];
  hyungjeStars: string[];
  hyungjeAux: string[];
  hyungjeBad: string[];
  mingongIdx: number;
  shingongIdx: number;
  bokdeokgongIdx: number;
  cheonigongIdx: number;
  gwanrokgongIdx: number;
  jaebaekkongIdx: number;
  bucheoIdx: number;
  gyoWuIdx: number;
  hyungjeIdx: number;
  jeonTaekIdx: number;
  jeonTaekStars: string[];
  jeonTaekAux: string[];
  jeonTaekBad: string[];
  // Ch9 질액궁
  jilAekIdx: number;
  jilAekStars: string[];
  jilAekAux: string[];
  jilAekBad: string[];
  // Ch10 자녀궁
  janyeoIdx: number;
  janyeoStars: string[];
  janyeoAux: string[];
  janyeoBad: string[];
  // Ch11 부모궁
  bumoIdx: number;
  bumoStars: string[];
  bumoAux: string[];
  bumoBad: string[];
  yearGan: string;
}

function calcZiweiStarsServer(year: number, month: number, day: number, hour: number): StarResult {
  try {
    const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
    const lunar = solar.getLunar();

    const lmonth = Math.abs(Number(lunar.getMonth()));
    const lday = Number(lunar.getDay());
    const yearGan = String(lunar.getYearGan() || "甲");
    const yearZhi = String(lunar.getYearZhi() || "子");

    const hourIdx = hour === 23 || hour === 0 ? 0 : Math.floor((hour + 1) / 2);

    // 명궁 / 신궁 인덱스
    const mengBaseIdx = (2 + lmonth - 1) % 12;
    const mengIdx = (mengBaseIdx - hourIdx + 12) % 12;
    const shenIdx = (mengBaseIdx + hourIdx) % 12;

    // 자미 위치 계산
    const yg = GAN_LIST.indexOf(yearGan);
    const inStart = [2, 4, 6, 8, 0][((yg % 5) + 5) % 5];

    const sMap: Record<string, number> = { 甲: 1, 乙: 1, 丙: 2, 丁: 2, 戊: 3, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };
    const bMap: Record<number, number> = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 };
    const gongGan: Record<string, string> = {};
    for (let z = 0; z < 12; z++) {
      gongGan[ZHI_LIST[z]] = GAN_LIST[(inStart + ((z - 2 + 12) % 12)) % 10];
    }
    const mgGan = gongGan[ZHI_LIST[mengIdx]] || yearGan;
    // ★ 핵심 버그 수정: 기존 Math.min/max(clamp)는 잘못된 命局 계산을 낳음.
    // saju-engine.js와 동일하게 5 초과 시 5를 빼는 순환 모듈(wrap-around) 사용.
    let wVal = (sMap[mgGan] || 1) + (bMap[mengIdx] || 1);
    if (wVal > 5) wVal -= 5;
    const juMap: Record<number, number> = { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 };
    const ju = juMap[wVal] || 4;

    let q = Math.floor(lday / ju);
    const r = lday % ju;
    let add = 0;
    if (r !== 0) { add = ju - r; q = Math.floor((lday + add) / ju); }
    let pos = q;
    if (add > 0) { pos = add % 2 === 1 ? q - add : q + add; }
    while (pos <= 0) pos += 12;
    while (pos > 12) pos -= 12;

    const zPos = (pos + 1) % 12;
    const fPos = (16 - zPos) % 12;

    // 복덕궁: palace index 10 → (mengIdx + 2) % 12
    const bokdeokgongIdx = (mengIdx + 2) % 12;
    // 천이궁: palace index 6 → (mengIdx - 6 + 12) % 12 = (mengIdx + 6) % 12
    const cheonigongIdx = (mengIdx + 6) % 12;
    // 관록궁: palace index 8 → (mengIdx - 8 + 12) % 12 = (mengIdx + 4) % 12
    const gwanrokgongIdx = (mengIdx + 4) % 12;
    // 재백궁: palace index 4 → (mengIdx - 4 + 12) % 12 = (mengIdx + 8) % 12
    const jaebaekkongIdx = (mengIdx + 8) % 12;
    // 부처궁: palace index 2 → (mengIdx - 2 + 12) % 12 = (mengIdx + 10) % 12
    const bucheoIdx = (mengIdx + 10) % 12;
    // 교우궁(노복궁): palace index 7 → (mengIdx - 7 + 12) % 12 = (mengIdx + 5) % 12
    const gyoWuIdx = (mengIdx + 5) % 12;
    // 형제궁: palace index 1 → (mengIdx - 1 + 12) % 12 = (mengIdx + 11) % 12
    const hyungjeIdx = (mengIdx + 11) % 12;
    // 전택궁: palace index 9 → (mengIdx + 3) % 12
    const jeonTaekIdx = (mengIdx + 3) % 12;
    // 질액궁: palace index 5 → (mengIdx + 7) % 12
    const jilAekIdx = (mengIdx + 7) % 12;
    // 자녀궁: palace index 3 → (mengIdx + 9) % 12
    const janyeoIdx = (mengIdx + 9) % 12;
    // 부모궁: palace index 11 → (mengIdx + 1) % 12
    const bumoIdx = (mengIdx + 1) % 12;

    // 주성 배치
    const mainStars: string[][] = Array.from({ length: 12 }, () => []);
    mainStars[zPos].push("자미");
    mainStars[(zPos + 11) % 12].push("천기");
    mainStars[(zPos + 9) % 12].push("태양");
    mainStars[(zPos + 8) % 12].push("무곡");
    mainStars[(zPos + 7) % 12].push("천동");
    mainStars[(zPos + 4) % 12].push("염정");
    mainStars[fPos].push("천부");
    mainStars[(fPos + 1) % 12].push("태음");
    mainStars[(fPos + 2) % 12].push("탐랑");
    mainStars[(fPos + 3) % 12].push("거문");
    mainStars[(fPos + 4) % 12].push("천상");
    mainStars[(fPos + 5) % 12].push("천량");
    mainStars[(fPos + 6) % 12].push("칠살");
    mainStars[(fPos + 10) % 12].push("파군");

    // 보조성 배치
    const auxStars: string[][] = Array.from({ length: 12 }, () => []);
    auxStars[(10 - hourIdx + 12) % 12].push("문창");
    auxStars[(4 + hourIdx) % 12].push("문곡");
    auxStars[(4 + lmonth - 1) % 12].push("좌보");
    auxStars[(10 - (lmonth - 1) + 12) % 12].push("우필");
    const luCunMap: Record<string, number> = { 甲: 2, 乙: 3, 丙: 5, 丁: 6, 戊: 5, 己: 6, 庚: 8, 辛: 9, 壬: 11, 癸: 0 };
    const kuiMap: Record<string, number> = { 甲: 1, 乙: 0, 丙: 11, 丁: 11, 戊: 1, 己: 0, 庚: 1, 辛: 2, 壬: 3, 癸: 3 };
    const yueMap: Record<string, number> = { 甲: 7, 乙: 8, 丙: 9, 丁: 9, 戊: 7, 己: 8, 庚: 7, 辛: 6, 壬: 5, 癸: 5 };
    const maMap: Record<string, number> = { 申: 2, 子: 2, 辰: 2, 亥: 5, 卯: 5, 未: 5, 寅: 8, 午: 8, 戌: 8, 巳: 11, 酉: 11, 丑: 11 };
    if (yearGan in luCunMap) auxStars[luCunMap[yearGan]].push("녹존");
    if (yearGan in kuiMap) auxStars[kuiMap[yearGan]].push("천괴");
    if (yearGan in yueMap) auxStars[yueMap[yearGan]].push("천월");
    if (yearZhi in maMap) auxStars[maMap[yearZhi]].push("천마");

    // 흉성 배치
    const badStars: string[][] = Array.from({ length: 12 }, () => []);
    const yangMap: Record<string, number> = { 甲: 3, 乙: 4, 丙: 6, 丁: 7, 戊: 6, 己: 7, 庚: 9, 辛: 10, 壬: 0, 癸: 1 };
    const tuoMap: Record<string, number> = { 甲: 1, 乙: 2, 丙: 4, 丁: 5, 戊: 4, 己: 5, 庚: 7, 辛: 8, 壬: 10, 癸: 11 };
    if (yearGan in yangMap) { badStars[yangMap[yearGan]].push("경양"); badStars[tuoMap[yearGan]].push("타라"); }
    badStars[(11 - hourIdx + 12) % 12].push("지공");
    badStars[(11 + hourIdx) % 12].push("지겁");
    // ★ 화성/영성 추가 (saju-engine.js hlStart 동기화)
    const hlStart: Record<string, { h: number; l: number }> = {
      "寅": { h: 1, l: 3 }, "午": { h: 1, l: 3 }, "戌": { h: 1, l: 3 },
      "申": { h: 2, l: 10 }, "子": { h: 2, l: 10 }, "辰": { h: 2, l: 10 },
      "巳": { h: 3, l: 10 }, "酉": { h: 3, l: 10 }, "丑": { h: 3, l: 10 },
      "亥": { h: 9, l: 10 }, "卯": { h: 9, l: 10 }, "未": { h: 9, l: 10 },
    };
    if (yearZhi in hlStart) {
      const huoPos = (hlStart[yearZhi].h + hourIdx) % 12;
      const lingPos = (hlStart[yearZhi].l + hourIdx) % 12;
      badStars[huoPos].push("화성");
      badStars[lingPos].push("영성");
    }

    // ── 사화(四化) 계산 ────────────────────────────────────────
    const curSihua = SIHUA_MAP[yearGan] ?? {};
    // 각 star→sihua 타입 매핑 (별이 어느 궁에 있는지 포함)
    const sihuaInfo: { starName: string; sihuaType: string; palaceIdx: number; palaceName: string }[] = [];
    for (const [starName, sihuaType] of Object.entries(curSihua)) {
      for (let si = 0; si < 12; si++) {
        if (mainStars[si].includes(starName) || auxStars[si].includes(starName)) {
          sihuaInfo.push({ starName, sihuaType, palaceIdx: si, palaceName: ZHI_LIST[si] });
          break;
        }
      }
    }

    // ── 단일 궁용 별 이름+밝기 변환 ──────────────────────────
    // 형식: "자미(◎화록)" — AI 프롬프트에서 정확한 분석을 가능하게 함
    function fmtMain(palIdx: number): string[] {
      const zhi = ZHI_LIST[palIdx];
      return mainStars[palIdx].map(s => {
        const br = getStarBrightness(s, zhi);
        const sh = curSihua[s] ?? "";
        return `${s}(${brightnessSymbol(br)}${sh ? " " + sh : ""})`;
      });
    }
    function fmtAux(palIdx: number): string[] {
      const zhi = ZHI_LIST[palIdx];
      return auxStars[palIdx].map(s => {
        const br = getStarBrightness(s, zhi);
        const sh = curSihua[s] ?? "";
        return `${s}(${brightnessSymbol(br)}${sh ? " " + sh : ""})`;
      });
    }
    function fmtBad(palIdx: number): string[] {
      const zhi = ZHI_LIST[palIdx];
      return badStars[palIdx].map(s => {
        const br = getStarBrightness(s, zhi);
        return `${s}(${brightnessSymbol(br)})`;
      });
    }

    // 사화 요약 문자열 (프롬프트에 포함용)
    const sihuaSummary = sihuaInfo.length
      ? sihuaInfo.map(x => `${x.starName}→${x.sihuaType}(${ZHI_LIST[x.palaceIdx]}궁위치)`).join(", ")
      : "해당없음";

    // 12궁 전체 명반 컨텍스트 — 밝기·사화 포함 (Gemini 프롬프트 삽입용)
    const fullChartContext = Array.from({ length: 12 }, (_, i) => {
      const main = fmtMain(i).join(", ") || "-";
      const aux = fmtAux(i).join(", ");
      const bad = fmtBad(i).join(", ");
      return `${PALACE_NAMES_KR[i]}(${ZHI_LIST[i]}): 주성[${main}]${aux ? ` 보성[${aux}]` : ""}${bad ? ` 흉성[${bad}]` : ""}`;
    }).join("\n");

    return {
      mingongStars: mainStars[mengIdx],
      shingongStars: mainStars[shenIdx],
      bokdeokgongStars: mainStars[bokdeokgongIdx],
      bokdeokgongAux: auxStars[bokdeokgongIdx],
      bokdeokgongBad: badStars[bokdeokgongIdx],
      cheonigongStars: mainStars[cheonigongIdx],
      cheonigongAux: auxStars[cheonigongIdx],
      cheonigongBad: badStars[cheonigongIdx],
      gwanrokgongStars: mainStars[gwanrokgongIdx],
      gwanrokgongAux: auxStars[gwanrokgongIdx],
      gwanrokgongBad: badStars[gwanrokgongIdx],
      jaebaekkongStars: mainStars[jaebaekkongIdx],
      jaebaekkongAux: auxStars[jaebaekkongIdx],
      jaebaekkongBad: badStars[jaebaekkongIdx],
      bucheoStars: mainStars[bucheoIdx],
      bucheoAux: auxStars[bucheoIdx],
      bucheoBad: badStars[bucheoIdx],
      gyoWuStars: mainStars[gyoWuIdx],
      gyoWuAux: auxStars[gyoWuIdx],
      gyoWuBad: badStars[gyoWuIdx],
      hyungjeStars: mainStars[hyungjeIdx],
      hyungjeAux: auxStars[hyungjeIdx],
      hyungjeBad: badStars[hyungjeIdx],
      jeonTaekIdx,
      jeonTaekStars: mainStars[jeonTaekIdx],
      jeonTaekAux: auxStars[jeonTaekIdx],
      jeonTaekBad: badStars[jeonTaekIdx],
      jilAekIdx,
      jilAekStars: mainStars[jilAekIdx],
      jilAekAux: auxStars[jilAekIdx],
      jilAekBad: badStars[jilAekIdx],
      janyeoIdx,
      janyeoStars: mainStars[janyeoIdx],
      janyeoAux: auxStars[janyeoIdx],
      janyeoBad: badStars[janyeoIdx],
      bumoIdx,
      bumoStars: mainStars[bumoIdx],
      bumoAux: auxStars[bumoIdx],
      bumoBad: badStars[bumoIdx],
      mingongIdx: mengIdx,
      shingongIdx: shenIdx,
      bokdeokgongIdx,
      cheonigongIdx,
      gwanrokgongIdx,
      jaebaekkongIdx,
      bucheoIdx,
      gyoWuIdx,
      hyungjeIdx,
      yearGan,
      sihuaSummary,
      fullChartContext,
    };
  } catch {
    return {
      mingongStars: ["자미"], shingongStars: ["천기"],
      bokdeokgongStars: [], bokdeokgongAux: [], bokdeokgongBad: [],
      cheonigongStars: [], cheonigongAux: [], cheonigongBad: [],
      gwanrokgongStars: [], gwanrokgongAux: [], gwanrokgongBad: [],
      jaebaekkongStars: [], jaebaekkongAux: [], jaebaekkongBad: [],
      bucheoStars: [], bucheoAux: [], bucheoBad: [],
      gyoWuStars: [], gyoWuAux: [], gyoWuBad: [],
      hyungjeStars: [], hyungjeAux: [], hyungjeBad: [],
      jeonTaekIdx: 3, jeonTaekStars: [], jeonTaekAux: [], jeonTaekBad: [],
      jilAekIdx: 7, jilAekStars: [], jilAekAux: [], jilAekBad: [],
      janyeoIdx: 9, janyeoStars: [], janyeoAux: [], janyeoBad: [],
      bumoIdx: 1, bumoStars: [], bumoAux: [], bumoBad: [],
      mingongIdx: 0, shingongIdx: 1, bokdeokgongIdx: 2, cheonigongIdx: 6,
      gwanrokgongIdx: 4, jaebaekkongIdx: 8, bucheoIdx: 10, gyoWuIdx: 5, hyungjeIdx: 11, yearGan: "甲",
      sihuaSummary: "해당없음", fullChartContext: "",
    };
  }
}

function buildCharacterTitle(mingongStars: string[], shingongStars: string[]) {
  const primaryStar = mingongStars[0] || shingongStars[0] || "자미";
  const secondaryStar = shingongStars[0] && shingongStars[0] !== primaryStar ? shingongStars[0] : null;
  const charData = STAR_CHARACTER_MAP[primaryStar] || STAR_CHARACTER_MAP["자미"];
  const secData = secondaryStar ? STAR_CHARACTER_MAP[secondaryStar] : null;
  return {
    ...charData,
    primaryStar,
    secondaryStar,
    starLabel: secondaryStar
      ? `${primaryStar}성 × ${secondaryStar}성`
      : `${primaryStar}성`,
    combinedSubtitle: secData
      ? `${charData.subtitle} · ${secData.subtitle.split(" ")[0]}의 기운을 품다`
      : charData.subtitle,
  };
}

// ─────────────────────────────────────────────────────────────────
// Gemini 호출
// ─────────────────────────────────────────────────────────────────

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys(): string[] {
  const extra = String(process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GOOGLE_API_KEY_4,
    process.env.GEMINI_API_KEY_CF,
    process.env.GOOGLE_API_KEY_CF,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
    ...extra,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function pickGeminiModels(): string[] {
  const env = String(process.env.PSYCHO_ANALYSIS_GEMINI_MODEL || "").trim();
  const base = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  return env ? [env, ...base] : base;
}

function parseGeminiText(payload: unknown): string {
  const p = payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

async function callGemini(prompt: string): Promise<string> {
  // ─── Vertex AI 우선 시도 ──────────────────────────────────────
  try {
    const vtxt = await callVertexGemini(prompt, { temperature: 0.85, maxOutputTokens: 16384 });
    if (vtxt) return vtxt;
  } catch { /* Vertex 실패 → API 키 폴백 */ }

  // ─── GEMINI API 키 폴백 ──────────────────────────────────────
  const keys = pickGeminiKeys();
  const models = pickGeminiModels();
  if (!keys.length) return "";

  let attempts = 0;
  const maxAttempts = 4;

  for (const model of models) {
    if (attempts >= maxAttempts) break;
    for (const key of keys) {
      if (attempts >= maxAttempts) break;
      attempts += 1;
      try {
        const url = GEMINI_ENDPOINT.replace("{model}", model) + `?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 16384,
              topK: 40,
              topP: 0.95,
            },
          }),
          signal: AbortSignal.timeout(18_000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = parseGeminiText(data);
        if (text) return text;
      } catch {
        // try next key/model
      }
    }
  }
  return "";
}

function buildChapter1Prompt(opts: {
  characterTitle: string;
  starLabel: string;
  mingongStars: string[];
  shingongStars: string[];
  mingongPalace: string;
  shingongPalace: string;
  birthYear: number;
  fullChartContext?: string;
  sihuaSummary?: string;
}) {
  const mingongDesc = opts.mingongStars.map((s) => STAR_CHARACTER_MAP[s]?.subtitle || s).join(", ");
  const shingongDesc = opts.shingongStars.map((s) => STAR_CHARACTER_MAP[s]?.subtitle || s).join(", ");

  const chartSection = opts.fullChartContext
    ? `\n[12궁 전체 명반 — 별이름(밝기 ◎묘/○왕/▲평/△리/X함 · 사화) 포함]\n${opts.fullChartContext}\n[사화(四化) 요약] ${opts.sihuaSummary ?? "해당없음"}\n`
    : "";

  return `당신은 최고의 자미두수 명리 심리 분석가입니다. 아래 사용자의 자미두수 명반 데이터를 바탕으로 챕터 1: 내 인생의 주인공 캐릭터를 총 3,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고, 존댓말을 사용하세요.

[사용자 자미두수 데이터]
- 캐릭터 아키타입: ${opts.characterTitle}
- 주성 구성: ${opts.starLabel}
- 명궁(命宮) 위치: ${opts.mingongPalace} / 주성: ${opts.mingongStars.join(", ")} (${mingongDesc})
- 신궁(身宮) 위치: ${opts.shingongPalace} / 주성: ${opts.shingongStars.join(", ")} (${shingongDesc})
- 출생년도: ${opts.birthYear}년
${chartSection}
[작성 목차 - 각 섹션 제목을 명확히 표기하세요]

## 1. 영혼의 아키타입 (약 1,000자)
사주가 환경이라면 자미두수는 시나리오입니다. 사용자의 타고난 캐릭터 "${opts.characterTitle}"가 왜 이런 성향을 가지는지, ${opts.starLabel}의 물리적/신화적 특성과 연계하여 논리적으로 설명하세요. 명궁과 신궁의 상호작용을 중심으로 이 사람의 근본적인 존재 방식을 서술하세요.

## 2. 빛과 그림자 (약 1,000자)
이 캐릭터가 가진 천재성(강점)과 그것이 초래하는 맹점(Shadow, 약점)을 균형 있게 분석하세요. 단순 나열이 아닌 "왜 그 강점이 동시에 약점이 되는가"를 심리학적으로 설명하세요.

## 3. 페르소나 스위칭 개운법 (약 1,000자)
미신적 내용(부적, 무속 등)은 절대 포함하지 마세요. 이 캐릭터의 에너지를 극대화하고 단점을 보완할 수 있는 과학적·심리학적 근거가 있는 실질적인 전략을 제시하세요: 아침 루틴, 저녁 루틴, '페르소나 스위칭' 구체적 실행법 (예: 특정 역할 모델을 의식적으로 활성화하는 방법).

[작성 스타일]
- 문어체보다 구어체에 가까운 따뜻하고 지적인 톤
- 각 단락은 충분히 전개하여 깊이 있게 서술
- 행간을 충분히 활용하여 읽기 편한 구조
- 별(성)의 특성을 설명할 때 동서양 신화, 심리학(융, 매슬로우 등)을 자연스럽게 연계
- 구체적이고 실행 가능한 조언 위주로 마무리`;
}

function buildChapter2Prompt(opts: {
  characterTitle: string;
  bokdeokgongStars: string[];
  bokdeokgongAux: string[];
  bokdeokgongBad: string[];
  bokdeokgongPalace: string;
  mingongStars: string[];
  birthYear: number;
}) {
  const mainDesc = opts.bokdeokgongStars.length
    ? opts.bokdeokgongStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const auxDesc = opts.bokdeokgongAux.join(", ") || "없음";
  const badDesc = opts.bokdeokgongBad.join(", ") || "없음";

  return `당신은 무의식과 심상화(Visualization) 전문가이자 융(Jung) 심리학 분석가입니다. 아래 사용자의 자미두수 복덕궁(福德宮) 데이터를 바탕으로 챕터 2: 무의식의 도화지를 총 3,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고 존댓말을 사용하세요.

[사용자 자미두수 데이터]
- 전체 캐릭터 아키타입: ${opts.characterTitle}
- 명궁 주성: ${opts.mingongStars.join(", ")}
- 복덕궁(福德宮) 위치: ${opts.bokdeokgongPalace}
- 복덕궁 주성: ${mainDesc}
- 복덕궁 보조성: ${auxDesc}
- 복덕궁 흉성: ${badDesc}
- 출생년도: ${opts.birthYear}년

[복덕궁 해석 원칙]
- 복덕궁은 무의식, 정서적 행복, 내면의 정신 세계를 지배하는 궁입니다
- 길성이 있으면 낙천적이고 정서적 회복력이 강하며, 흉성이 있으면 불안과 강박을 통해 성장합니다
- 길성과 흉성의 조합이 만들어내는 고유한 심리적 패턴을 심층 분석하세요

[작성 목차 - 각 섹션 제목을 명확히 표기하세요]

## 1. 나의 행복 스위치 (약 1,000자)
복덕궁의 별 에너지가 감정 소모 패턴과 행복 경험 방식에 어떤 영향을 미치는지 설명하세요. "이 사람은 언제, 어떤 조건에서 진정한 행복을 느끼는가?"를 매슬로우 욕구 이론, 칙센트미하이의 플로우(Flow) 이론을 활용해 설명하세요. 다른 사람과 다른 이 사람만의 독특한 행복 패턴과 에너지 충전 방식을 구체적으로 서술하세요.

## 2. 스트레스의 진짜 원인 (약 1,000자)
복덕궁의 흉성(${badDesc})과 주성 조합을 기반으로, 이 사람이 불안과 스트레스를 느끼는 정확한 심리적 트리거를 분석하세요. 프로이트의 방어기제(억압, 합리화, 투사 등) 관점에서 이 사람의 방어기제 패턴을 설명하고, "왜 이 사람은 반복적으로 같은 스트레스 패턴에 빠지는가?"에 답하세요.

## 3. 무의식 리팩토링 (약 1,000자)
미신적 내용(부적, 무속 등)은 절대 포함하지 마세요. 네빌 고다드의 심상화 기법("이미 이루어진 상태"를 가정하는 명상법)과 신경가소성 이론을 연결하여, 이 사람의 복덕궁 에너지에 최적화된 맞춤형 멘탈 케어 루틴을 제시하세요. 이 별의 에너지가 활성화되는 최적의 명상 타이밍과 구체적인 심상화 장면(스크립트)을 포함하세요.

[작성 스타일]
- 따뜻하고 섬세한 심리 상담사 톤
- 별(성)의 에너지를 현대 심리학 개념과 자연스럽게 연결
- 구체적이고 즉시 실행 가능한 루틴 제시
- 행간을 충분히 활용하여 읽기 편한 구조`;
}

// 천이궁 레이더 점수 산출
// 각 주성의 특성 기반으로 4개 축 점수를 결정
const RADAR_SCORE_MAP: Record<string, { firstImpression: number; adaptability: number; networking: number; selfExpression: number }> = {
  "자미": { firstImpression: 92, adaptability: 68, networking: 80, selfExpression: 85 },
  "천기": { firstImpression: 72, adaptability: 90, networking: 78, selfExpression: 80 },
  "태양": { firstImpression: 95, adaptability: 75, networking: 92, selfExpression: 95 },
  "무곡": { firstImpression: 80, adaptability: 62, networking: 65, selfExpression: 70 },
  "천동": { firstImpression: 78, adaptability: 88, networking: 85, selfExpression: 75 },
  "염정": { firstImpression: 85, adaptability: 58, networking: 70, selfExpression: 88 },
  "천부": { firstImpression: 82, adaptability: 72, networking: 75, selfExpression: 68 },
  "태음": { firstImpression: 75, adaptability: 80, networking: 70, selfExpression: 82 },
  "탐랑": { firstImpression: 90, adaptability: 85, networking: 95, selfExpression: 90 },
  "거문": { firstImpression: 65, adaptability: 70, networking: 68, selfExpression: 92 },
  "천상": { firstImpression: 70, adaptability: 78, networking: 82, selfExpression: 65 },
  "천량": { firstImpression: 68, adaptability: 75, networking: 72, selfExpression: 78 },
  "칠살": { firstImpression: 88, adaptability: 65, networking: 60, selfExpression: 85 },
  "파군": { firstImpression: 82, adaptability: 92, networking: 78, selfExpression: 88 },
};

const AUX_BONUS: Record<string, Partial<{ firstImpression: number; adaptability: number; networking: number; selfExpression: number }>> = {
  "문창": { selfExpression: 5 },
  "문곡": { selfExpression: 4, networking: 3 },
  "좌보": { networking: 4, adaptability: 3 },
  "우필": { networking: 5 },
  "녹존": { firstImpression: 3 },
  "천마": { adaptability: 8, networking: 5 },
  "천괴": { firstImpression: 4 },
  "천월": { adaptability: 3 },
};

const BAD_PENALTY: Record<string, Partial<{ firstImpression: number; adaptability: number; networking: number; selfExpression: number }>> = {
  "경양": { adaptability: -5, networking: -4 },
  "타라": { networking: -4, firstImpression: -3 },
  "지공": { adaptability: -4, selfExpression: -3 },
  "지겁": { adaptability: -5, networking: -3 },
};

function calcRadarScores(mainStars: string[], auxStars: string[], badStars: string[]) {
  type Axis = "firstImpression" | "adaptability" | "networking" | "selfExpression";
  const AXES: Axis[] = ["firstImpression", "adaptability", "networking", "selfExpression"];
  const base: Record<Axis, number> = { firstImpression: 60, adaptability: 60, networking: 60, selfExpression: 60 };

  if (mainStars.length) {
    const dominant = RADAR_SCORE_MAP[mainStars[0]];
    if (dominant) {
      for (const ax of AXES) base[ax] = dominant[ax];
    }
    if (mainStars.length > 1) {
      const secondary = RADAR_SCORE_MAP[mainStars[1]];
      if (secondary) {
        for (const ax of AXES) base[ax] = Math.round((base[ax] + secondary[ax]) / 2);
      }
    }
  }
  for (const s of auxStars) {
    const bonus = AUX_BONUS[s];
    if (bonus) for (const ax of AXES) base[ax] = Math.min(100, base[ax] + (bonus[ax] || 0));
  }
  for (const s of badStars) {
    const pen = BAD_PENALTY[s];
    if (pen) for (const ax of AXES) base[ax] = Math.max(20, base[ax] + (pen[ax] || 0));
  }
  // 빈 궁 점수 채우기 (주성 없을 때)
  if (!mainStars.length) {
    base.firstImpression = 55;
    base.adaptability = 65;
    base.networking = 58;
    base.selfExpression = 60;
  }
  return [
    { axis: "첫인상 매력도", value: base.firstImpression },
    { axis: "환경 적응력", value: base.adaptability },
    { axis: "네트워킹", value: base.networking },
    { axis: "자기표현력", value: base.selfExpression },
  ] as const;
}

function buildChapter3Prompt(opts: {
  characterTitle: string;
  cheonigongStars: string[];
  cheonigongAux: string[];
  cheonigongBad: string[];
  cheonigongPalace: string;
  mingongStars: string[];
  radarScores: readonly { axis: string; value: number }[];
  birthYear: number;
}) {
  const mainDesc = opts.cheonigongStars.length
    ? opts.cheonigongStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const auxDesc = opts.cheonigongAux.join(", ") || "없음";
  const badDesc = opts.cheonigongBad.join(", ") || "없음";
  const scores = opts.radarScores.map((r) => `${r.axis}: ${r.value}점`).join(", ");

  return `당신은 퍼스널 브랜딩 전문가이자 사회심리학자입니다. 아래 사용자의 자미두수 천이궁(遷移宮) 데이터를 바탕으로 챕터 3: 세상이라는 무대를 총 3,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고 존댓말을 사용하세요. '역마살' 같은 구식 표현은 절대 사용하지 마세요.

[사용자 자미두수 데이터]
- 전체 캐릭터 아키타입: ${opts.characterTitle}
- 명궁 주성: ${opts.mingongStars.join(", ")}
- 천이궁(遷移宮) 위치: ${opts.cheonigongPalace}
- 천이궁 주성: ${mainDesc}
- 천이궁 보조성: ${auxDesc}
- 천이궁 흉성: ${badDesc}
- 사회적 에너지 지표 (레이더 점수): ${scores}
- 출생년도: ${opts.birthYear}년

[천이궁 해석 원칙]
- 천이궁은 집 밖의 세계, 사회적 활동, 외부 환경, 이동, 대인관계, 첫인상을 지배하는 궁입니다
- 현대적 개념으로 해석: SNS 퍼블릭 이미지, 네트워킹 스타일, 커뮤니티 영향력, 이상적인 근무 환경 등

[작성 목차 - 각 섹션 제목을 명확히 표기하세요]

## 1. 사회적 페르소나 (약 1,000자)
천이궁의 별(${mainDesc})이 만드는 이 사람의 사회적 첫인상과 외부 이미지를 분석하세요. 단순 성격 묘사가 아니라, 이 사람이 집 밖에서 어떤 '사회적 무기'를 자연스럽게 방사하는지 구체적으로 서술하세요. 사회적 자본(Social Capital) 이론과 결부하여 이 사람의 사회적 에너지 지표(${scores})를 논리적으로 설명하세요.

## 2. 퍼스널 브랜딩 전략 (약 1,000자)
이 사람의 천이궁 에너지를 최대한 활용하는 실질적인 퍼스널 브랜딩 전략을 제시하세요. 패션 스타일, 커뮤니케이션 태도, 스피치/글쓰기 방식, SNS 콘텐츠 전략을 구체적으로 제안하세요. '이 사람처럼 생겼다'는 인상이 아닌 '이 에너지와 특성'을 어떻게 브랜드화할지 로드맵을 제시하세요.

## 3. 환경 세팅 (약 1,000자)
이 사람의 사회적 에너지가 가장 극대화되는 이상적인 환경을 제안하세요. 프리랜서/대기업/스타트업, 도심/자연/해외 등 구조적 환경을 분석하고, 왜 그 환경에서 이 별의 에너지가 증폭되는지 논리적으로 설명하세요. 실제 적용 가능한 커리어/라이프스타일 전환 시나리오를 포함하세요.

[작성 스타일]
- 퍼스널 브랜딩 컨설턴트처럼 실용적이고 자신감 있는 톤
- 미신적 표현 금지 — 별의 에너지를 현대 심리학/사회학 개념으로 번역
- 구체적 수치와 예시 포함 (예: "매주 2회, 20분")
- 행간을 충분히 활용하여 읽기 편한 구조`;
}


// 관록궁 업무 스타일 점수 산출
// independence: 0=극팀워크, 100=극독립 / creativity: 0=극원칙주의, 100=극창의
const WORK_STYLE_MAP: Record<string, {
  independence: number; creativity: number;
  leadership: number; execution: number; strategy: number;
}> = {
  "자미": { independence: 75, creativity: 45, leadership: 95, execution: 80, strategy: 88 },
  "천기": { independence: 55, creativity: 82, leadership: 70, execution: 65, strategy: 90 },
  "태양": { independence: 72, creativity: 68, leadership: 90, execution: 78, strategy: 82 },
  "무곡": { independence: 80, creativity: 35, leadership: 75, execution: 95, strategy: 72 },
  "천동": { independence: 35, creativity: 72, leadership: 62, execution: 72, strategy: 68 },
  "염정": { independence: 78, creativity: 75, leadership: 80, execution: 82, strategy: 78 },
  "천부": { independence: 40, creativity: 30, leadership: 85, execution: 75, strategy: 82 },
  "태음": { independence: 30, creativity: 78, leadership: 55, execution: 60, strategy: 75 },
  "탐랑": { independence: 70, creativity: 88, leadership: 75, execution: 72, strategy: 78 },
  "거문": { independence: 62, creativity: 38, leadership: 65, execution: 68, strategy: 85 },
  "천상": { independence: 35, creativity: 38, leadership: 70, execution: 70, strategy: 72 },
  "천량": { independence: 58, creativity: 45, leadership: 78, execution: 72, strategy: 80 },
  "칠살": { independence: 90, creativity: 55, leadership: 88, execution: 92, strategy: 75 },
  "파군": { independence: 85, creativity: 92, leadership: 82, execution: 88, strategy: 80 },
};

const WORK_AUX_BONUS: Record<string, Partial<{
  independence: number; creativity: number; leadership: number; execution: number; strategy: number;
}>> = {
  "문창": { creativity: 6, strategy: 4 },
  "문곡": { creativity: 5, strategy: 3 },
  "좌보": { leadership: 4, execution: 3 },
  "우필": { leadership: 5 },
  "녹존": { execution: 4, independence: 3 },
  "천마": { independence: 6, execution: 4 },
  "천괴": { leadership: 4, strategy: 4 },
  "천월": { leadership: 3 },
};

const WORK_BAD_PENALTY: Record<string, Partial<{
  independence: number; creativity: number; leadership: number; execution: number; strategy: number;
}>> = {
  "경양": { leadership: -5, execution: -3 },
  "타라":  { strategy: -4, execution: -3 },
  "지공": { execution: -4, strategy: -3 },
  "지겁": { leadership: -4, independence: -3 },
};

function calcWorkStyleScores(
  mainStars: string[], auxStars: string[], badStars: string[]
) {
  type Key = "independence" | "creativity" | "leadership" | "execution" | "strategy";
  const KEYS: Key[] = ["independence", "creativity", "leadership", "execution", "strategy"];
  const base: Record<Key, number> = { independence: 55, creativity: 55, leadership: 65, execution: 65, strategy: 65 };

  if (mainStars.length) {
    const d = WORK_STYLE_MAP[mainStars[0]];
    if (d) for (const k of KEYS) base[k] = d[k];
    if (mainStars.length > 1) {
      const d2 = WORK_STYLE_MAP[mainStars[1]];
      if (d2) for (const k of KEYS) base[k] = Math.round((base[k] + d2[k]) / 2);
    }
  }
  for (const s of auxStars) {
    const b = WORK_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badStars) {
    const p = WORK_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(10, base[k] + (p[k] || 0));
  }
  // 독립 vs 팀워크 레이블
  const independenceLabel = base.independence >= 80 ? "강한 독립 지향"
    : base.independence >= 65 ? "독립 선호"
    : base.independence >= 45 ? "균형형"
    : base.independence >= 30 ? "팀워크 선호"
    : "강한 팀워크 지향";
  // 창의 vs 원칙 레이블
  const creativityLabel = base.creativity >= 80 ? "강한 창의성"
    : base.creativity >= 65 ? "창의성 선호"
    : base.creativity >= 45 ? "균형형"
    : base.creativity >= 30 ? "원칙주의 선호"
    : "강한 원칙주의";

  return {
    independence: base.independence,
    independenceLabel,
    creativity: base.creativity,
    creativityLabel,
    leadership: base.leadership,
    execution: base.execution,
    strategy: base.strategy,
  };
}

function buildChapter4Prompt(opts: {
  characterTitle: string;
  gwanrokgongStars: string[];
  gwanrokgongAux: string[];
  gwanrokgongBad: string[];
  mingongStars: string[];
  workStyle: ReturnType<typeof calcWorkStyleScores>;
  birthYear: number;
}) {
  const mainDesc = opts.gwanrokgongStars.length
    ? opts.gwanrokgongStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const auxDesc = opts.gwanrokgongAux.join(", ") || "없음";
  const badDesc = opts.gwanrokgongBad.join(", ") || "없음";
  const ws = opts.workStyle;
  const styleDesc = [
    `독립 지향도: ${ws.independence}점 (${ws.independenceLabel})`,
    `창의성 지향: ${ws.creativity}점 (${ws.creativityLabel})`,
    `리더십 지향: ${ws.leadership}점`,
    `실행력: ${ws.execution}점`,
    `전략적 사고: ${ws.strategy}점`,
  ].join(", ");

  return `당신은 조직 심리학 및 커리어 컨설턴트입니다. 아래 사용자의 자미두수 관록궁(官祿宮) 데이터를 바탕으로 챕터 4: 커리어와 성취를 총 5,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고 존댓말을 사용하세요. 구식 미신적 표현은 절대 사용하지 마세요.

[사용자 자미두수 데이터]
- 전체 캐릭터 아키타입: ${opts.characterTitle}
- 명궁 주성: ${opts.mingongStars.join(", ")}
- 관록궁(官祿宮) 주성: ${mainDesc}
- 관록궁 보조성: ${auxDesc}
- 관록궁 흉성: ${badDesc}
- 업무 스타일 지표: ${styleDesc}
- 출생년도: ${opts.birthYear}년

[작성 목차 - 각 섹션 제목을 명확히 표기하고, 각 섹션 첫 단락 직후 해당 섹션의 핵심 인사이트를 반드시 [QUOTE]: 문장 형식으로 한 줄 삽입하세요]

## 1. 업무 적성과 드라이브 (약 1,500자)
관록궁의 별(${mainDesc})이 보여주는 이 사람의 업무 적성과 동기를 분석하세요. 특정 직업명을 찍어주는 것을 지양하고, 왜 이런 형태의 업무(기획, 영업, 창작, 분석 등)에서 성취감을 느끼는지 원리를 설명하세요. 업무 스타일 지표(독립 지향도: ${ws.independence}점, 창의성: ${ws.creativity}점)와 연결하여 논리적으로 서술하세요. 이 사람이 번아웃에 빠지는 패턴과 회복 방식도 포함하세요.

## 2. 강점 극대화 툴킷 (약 1,500자)
이 사람의 관록궁 에너지에 최적화된 업무 관리 방식과 도구(Tool)를 제안하세요. 단순 앱 나열이 아닌, 왜 이 성향에 이 방식이 맞는지 근거를 함께 제시하세요. 리더십 지향도 ${ws.leadership}점, 실행력 ${ws.execution}점, 전략적 사고 ${ws.strategy}점을 활용한 구체적 업무 세팅 방법을 포함하세요. 이 사람이 가장 에너지를 발휘하는 시간대, 업무 공간, 협업 방식도 서술하세요.

## 3. 오피스 심리학 (약 2,000자)
상사/동료와의 마찰(관재구설)을 피하고 사내 정치에서 우위를 점하는 처세술을 심층 리포트 형식으로 분석하세요. 이 사람이 조직 내에서 흔히 오해받는 패턴과 그 해결 전략, 갑/을 관계에서 사용할 수 있는 심리적 레버리지를 포함하세요. 또한, 독립(창업·프리랜서)하기 좋은 시기의 징후(내부 신호: 동기 변화, 외부 신호: 환경 변화)를 구체적으로 서술하세요. 독립 후 성공 확률을 높이는 준비 로드맵으로 마무리하세요.

[작성 스타일]
- 조직 심리학 전문 컨설턴트의 자신감 있고 직설적인 톤
- 미신적 표현 절대 금지 — 관록궁 별의 에너지를 조직심리학/행동경제학 개념으로 번역
- 구체적 수치와 행동 지침 포함 (예: "월 1회, 3시간 딥워크 블록")
- [QUOTE]: 마커는 각 섹션(총 3회) 삽입 필수
- 행간 충분히 활용하여 5,000자 이상 작성`;
}

// ─────────────────────────────────────────────────────────────────
// 재백궁 재물 흐름 점수 산출
// ─────────────────────────────────────────────────────────────────

// 각 주성의 재물 특성 점수
// income: 수익 창출력   / loss: 재정 누수 위험 (높을수록 누수 주의)
// active: 능동적 투자 성향 / stable: 안정 자산 성향
// windfall: 횡재/기회 수익 가능성
const WEALTH_STYLE_MAP: Record<string, {
  income: number; loss: number;
  active: number; stable: number; windfall: number;
}> = {
  "자미":   { income: 82, loss: 28, active: 72, stable: 85, windfall: 70 },
  "천기":   { income: 68, loss: 42, active: 75, stable: 60, windfall: 65 },
  "태양":   { income: 88, loss: 35, active: 80, stable: 70, windfall: 78 },
  "무곡":   { income: 90, loss: 25, active: 85, stable: 90, windfall: 60 },
  "천동":   { income: 62, loss: 40, active: 55, stable: 75, windfall: 55 },
  "염정":   { income: 78, loss: 55, active: 88, stable: 55, windfall: 72 },
  "천부":   { income: 72, loss: 20, active: 50, stable: 92, windfall: 48 },
  "태음":   { income: 70, loss: 38, active: 60, stable: 78, windfall: 62 },
  "탐랑":   { income: 85, loss: 62, active: 90, stable: 45, windfall: 88 },
  "거문":   { income: 65, loss: 48, active: 58, stable: 65, windfall: 52 },
  "천상":   { income: 68, loss: 32, active: 52, stable: 80, windfall: 50 },
  "천량":   { income: 72, loss: 30, active: 65, stable: 82, windfall: 55 },
  "칠살":   { income: 80, loss: 52, active: 88, stable: 52, windfall: 78 },
  "파군":   { income: 78, loss: 65, active: 92, stable: 38, windfall: 85 },
};

// 보조성이 주는 재물 보정
const WEALTH_AUX_BONUS: Record<string, Partial<{
  income: number; loss: number; active: number; stable: number; windfall: number;
}>> = {
  "녹존": { income: 8, stable: 6, loss: -4 },
  "천마": { income: 6, active: 5, windfall: 4 },
  "좌보": { stable: 5, income: 3 },
  "우필": { stable: 5, income: 3 },
  "천괴": { income: 4, windfall: 3 },
  "천월": { stable: 3, loss: -2 },
  "문창": { active: 3, windfall: 2 },
  "문곡": { active: 3, windfall: 2 },
};

// 흉성이 주는 재물 페널티
const WEALTH_BAD_PENALTY: Record<string, Partial<{
  income: number; loss: number; active: number; stable: number; windfall: number;
}>> = {
  "경양": { loss: 12, stable: -6 },
  "타라":  { loss: 10, active: -4 },
  "지공": { loss: 8, windfall: -5 },
  "지겁": { loss: 10, active: -5, windfall: -4 },
};

function calcWealthScores(mainStars: string[], auxStars: string[], badStars: string[]) {
  type K = "income" | "loss" | "active" | "stable" | "windfall";
  const KEYS: K[] = ["income", "loss", "active", "stable", "windfall"];
  const base: Record<K, number> = { income: 60, loss: 40, active: 60, stable: 60, windfall: 55 };

  if (mainStars.length) {
    const d = WEALTH_STYLE_MAP[mainStars[0]];
    if (d) for (const k of KEYS) base[k] = d[k];
    if (mainStars.length > 1) {
      const d2 = WEALTH_STYLE_MAP[mainStars[1]];
      if (d2) for (const k of KEYS) base[k] = Math.round((base[k] + d2[k]) / 2);
    }
  }
  for (const s of auxStars) {
    const b = WEALTH_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badStars) {
    const p = WEALTH_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }

  // 수익 창출 무기 키워드 (상위 3개 도출)
  const weaponPool = [
    { key: "전문성 기반 수익",    icon: "🎯", score: base.stable + base.income },
    { key: "능동적 투자 수익",    icon: "📈", score: base.active + base.income },
    { key: "횡재·기회 포착",     icon: "⚡", score: base.windfall },
    { key: "안정형 자산 축적",    icon: "🏛️", score: base.stable },
    { key: "네트워크 수익화",     icon: "🌐", score: (base.income + base.windfall) / 2 },
    { key: "지식·콘텐츠 수익",   icon: "📚", score: base.active + 20 },
  ];
  const leakPool = [
    { key: "감정적 충동 지출",    icon: "💸", score: base.loss },
    { key: "과도한 리스크 투자",  icon: "🎲", score: Math.max(0, base.active - 40) + base.loss / 2 },
    { key: "관계·체면 지출",     icon: "🤝", score: base.loss * 0.8 },
    { key: "수익 집중 실패",      icon: "🕳️", score: Math.max(0, 100 - base.stable) },
    { key: "변동성 자산 집중",    icon: "🌊", score: base.active * 0.6 + base.loss * 0.3 },
    { key: "미래 불안 과소비",    icon: "😰", score: Math.max(0, base.loss - 20) },
  ];
  const weapons = weaponPool.sort((a, b) => b.score - a.score).slice(0, 3);
  const leaks   = leakPool.sort((a, b) => b.score - a.score).slice(0, 3);

  return { income: base.income, loss: base.loss, active: base.active, stable: base.stable, windfall: base.windfall, weapons, leaks };
}

function buildChapter5Prompt(opts: {
  characterTitle: string;
  jaebaekkongStars: string[];
  jaebaekkongAux: string[];
  jaebaekkongBad: string[];
  mingongStars: string[];
  wealthScores: ReturnType<typeof calcWealthScores>;
  birthYear: number;
}) {
  const mainDesc = opts.jaebaekkongStars.length
    ? opts.jaebaekkongStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const auxDesc = opts.jaebaekkongAux.join(", ") || "없음";
  const badDesc = opts.jaebaekkongBad.join(", ") || "없음";
  const ws = opts.wealthScores;
  const weaponDesc = ws.weapons.map((w) => w.key).join(" / ");
  const leakDesc   = ws.leaks.map((l) => l.key).join(" / ");
  const scoreDesc  = [
    `수익 창출력: ${ws.income}점`,
    `재정 누수 위험: ${ws.loss}점`,
    `능동적 투자 성향: ${ws.active}점`,
    `안정 자산 성향: ${ws.stable}점`,
    `횡재·기회 수익 가능성: ${ws.windfall}점`,
  ].join(", ");

  return `당신은 행동 재무학(Behavioral Finance) 전문가입니다. 아래 사용자의 자미두수 재백궁(財帛宮) 데이터를 바탕으로 챕터 5: 재화와 자산의 흐름을 총 5,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고 존댓말을 사용하세요. 미신적 표현은 절대 사용하지 마세요.

[사용자 자미두수 데이터]
- 전체 캐릭터 아키타입: ${opts.characterTitle}
- 명궁 주성: ${opts.mingongStars.join(", ")}
- 재백궁(財帛宮) 주성: ${mainDesc}
- 재백궁 보조성: ${auxDesc}
- 재백궁 흉성: ${badDesc}
- 재물 흐름 지표: ${scoreDesc}
- 수익 창출 무기 TOP3: ${weaponDesc}
- 재정 누수 포인트 TOP3: ${leakDesc}
- 출생년도: ${opts.birthYear}년

[작성 목차 - 각 섹션 제목을 명확히 표기하고, 각 섹션 첫 단락 직후 해당 섹션 핵심 인사이트를 반드시 [QUOTE]: 문장 형식으로 한 줄 삽입하세요]

## 1. 부의 창출 패턴 (약 1,500자)
재백궁의 별(${mainDesc})을 통해 이 사람이 돈을 버는 방식과 돈을 대하는 무의식적 태도를 분석하세요. 수익 창출력 ${ws.income}점, 횡재·기회 가능성 ${ws.windfall}점을 행동 재무학 이론으로 해석하세요. 수익 창출 무기(${weaponDesc})별로 왜 이 사람에게 효과적인지 설명하세요. 이 사람이 돈을 벌면서 느끼는 심리적 패턴(머니 스크립트)도 서술하세요.

## 2. 재정 누수 원인 (약 1,500자)
재정 누수 위험 ${ws.loss}점을 기반으로 자산의 변동폭을 분석하고, 재정 누수 포인트(${leakDesc})가 발생하는 심리적·행동적 원인을 찾아주세요. 이 사람의 재백궁 흉성(${badDesc})이 있다면 구체적인 영향과 발현 패턴을 서술하세요. 단순 경고가 아닌, 왜 이런 지출 패턴이 생기는지 무의식적 근거를 제시하세요.

## 3. 현대적 액땜: 금융 행동 교정 (약 2,000자)
지갑 색상 같은 미신은 절대 금지입니다. 재정 불안정성(파재성)이 있다면 이를 무조건 막으려 하기보다, 지식·경험·자기 계발비로 긍정적으로 소진하여 흉함을 해소하는 현대적 자산 포트폴리오 관리법을 제안하세요. 수익 창출력 ${ws.income}점과 안정 자산 성향 ${ws.stable}점을 고려한 실질적인 포트폴리오 비율, 심리적 머니 트랩을 피하는 행동 교정 기술, 그리고 이 사람의 재물 에너지가 정점에 오르는 주기적 패턴을 포함하세요.

[작성 스타일]
- 행동 재무학 전문가의 분석적이고 실용적인 톤
- 미신적 표현 절대 금지 — 별의 에너지를 행동경제학/심리학 개념으로 번역
- 구체적 수치와 포트폴리오 비율 포함 (예: "수익 자산 60%, 안정 자산 40%")
- [QUOTE]: 마커는 각 섹션(총 3회) 삽입 필수
- 행간 충분히 활용하여 5,000자 이상 작성`;
}


// ─────────────────────────────────────────────────────────────────
// 부처궁 관계 심리 점수 산출
// ─────────────────────────────────────────────────────────────────

// attraction: 자연적 끌림 매력도 / blindSpot: 관계 맹점 위험도 (높을수록 주의)
// bonding: 유대감 형성 능력 / boundary: 경계선 설정 능력
const ROMANCE_STYLE_MAP: Record<string, {
  attraction: number; blindSpot: number; bonding: number; boundary: number;
}> = {
  "자미":   { attraction: 90, blindSpot: 55, bonding: 72, boundary: 75 },
  "천기":   { attraction: 70, blindSpot: 48, bonding: 78, boundary: 62 },
  "태양":   { attraction: 92, blindSpot: 42, bonding: 85, boundary: 70 },
  "무곡":   { attraction: 72, blindSpot: 35, bonding: 68, boundary: 80 },
  "천동":   { attraction: 82, blindSpot: 60, bonding: 80, boundary: 58 },
  "염정":   { attraction: 88, blindSpot: 68, bonding: 75, boundary: 52 },
  "천부":   { attraction: 75, blindSpot: 30, bonding: 82, boundary: 72 },
  "태음":   { attraction: 80, blindSpot: 65, bonding: 85, boundary: 55 },
  "탐랑":   { attraction: 95, blindSpot: 72, bonding: 78, boundary: 48 },
  "거문":   { attraction: 62, blindSpot: 55, bonding: 72, boundary: 68 },
  "천상":   { attraction: 68, blindSpot: 42, bonding: 88, boundary: 60 },
  "천량":   { attraction: 65, blindSpot: 30, bonding: 75, boundary: 78 },
  "칠살":   { attraction: 85, blindSpot: 58, bonding: 60, boundary: 82 },
  "파군":   { attraction: 88, blindSpot: 75, bonding: 68, boundary: 45 },
};

const ROMANCE_AUX_BONUS: Record<string, Partial<{
  attraction: number; blindSpot: number; bonding: number; boundary: number;
}>> = {
  "녹존": { bonding: 5, boundary: 4 },
  "천마": { attraction: 4, bonding: -2 },
  "좌보": { bonding: 6, boundary: 3 },
  "우필": { bonding: 6, boundary: 3 },
  "천괴": { attraction: 4, boundary: 3 },
  "천월": { bonding: 3, boundary: 2 },
  "문창": { attraction: 3, bonding: 2 },
  "문곡": { attraction: 3, bonding: 2 },
};

const ROMANCE_BAD_PENALTY: Record<string, Partial<{
  attraction: number; blindSpot: number; bonding: number; boundary: number;
}>> = {
  "경양": { blindSpot: 10, boundary: -6 },
  "타라":  { blindSpot: 8, bonding: -5 },
  "지공": { blindSpot: 6, boundary: -4 },
  "지겁": { blindSpot: 8, bonding: -4, boundary: -5 },
};

function calcRelationshipScores(mainStars: string[], auxStars: string[], badStars: string[]) {
  type K = "attraction" | "blindSpot" | "bonding" | "boundary";
  const KEYS: K[] = ["attraction", "blindSpot", "bonding", "boundary"];
  const base: Record<K, number> = { attraction: 65, blindSpot: 50, bonding: 65, boundary: 60 };

  if (mainStars.length) {
    const d = ROMANCE_STYLE_MAP[mainStars[0]];
    if (d) for (const k of KEYS) base[k] = d[k];
    if (mainStars.length > 1) {
      const d2 = ROMANCE_STYLE_MAP[mainStars[1]];
      if (d2) for (const k of KEYS) base[k] = Math.round((base[k] + d2[k]) / 2);
    }
  }
  for (const s of auxStars) {
    const b = ROMANCE_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badStars) {
    const p = ROMANCE_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }
  return {
    attraction: base.attraction,
    blindSpot: base.blindSpot,
    bonding: base.bonding,
    boundary: base.boundary,
  };
}

function buildChapter6Prompt(opts: {
  characterTitle: string;
  bucheoStars: string[];
  bucheoAux: string[];
  bucheoBad: string[];
  mingongStars: string[];
  relationshipScores: ReturnType<typeof calcRelationshipScores>;
  birthYear: number;
}) {
  const mainDesc = opts.bucheoStars.length
    ? opts.bucheoStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const auxDesc = opts.bucheoAux.join(", ") || "없음";
  const badDesc = opts.bucheoBad.join(", ") || "없음";
  const rs = opts.relationshipScores;
  const scoreDesc = [
    `자연적 끌림 매력도: ${rs.attraction}점`,
    `관계 맹점 위험도: ${rs.blindSpot}점`,
    `유대감 형성 능력: ${rs.bonding}점`,
    `경계선 설정 능력: ${rs.boundary}점`,
  ].join(", ");

  return `당신은 진화심리학 및 관계 치료사(Relationship Therapist)입니다. 아래 사용자의 자미두수 부처궁(夫妻宮) 데이터를 바탕으로 챕터 6: 파트너십과 로맨스를 총 5,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고 존댓말을 사용하세요. 미신적 표현은 절대 사용하지 마세요.

[사용자 자미두수 데이터]
- 전체 캐릭터 아키타입: ${opts.characterTitle}
- 명궁 주성: ${opts.mingongStars.join(", ")}
- 부처궁(夫妻宮) 주성: ${mainDesc}
- 부처궁 보조성: ${auxDesc}
- 부처궁 흉성: ${badDesc}
- 관계 심리 지표: ${scoreDesc}
- 출생년도: ${opts.birthYear}년

[작성 목차 - 각 섹션 제목을 명확히 표기하고, 각 섹션 첫 단락 직후 해당 섹션의 핵심 인사이트를 반드시 [QUOTE]: 문장 형식으로 한 줄 삽입하세요]

## 1. 무의식적 끌림 (거울 효과) (약 1,500자)
심리학의 투사(Projection) 개념을 차용하여, 이 사람이 왜 특정 성향/외모의 사람에게 본능적으로 끌리는지 부처궁(${mainDesc})과 명궁(${opts.mingongStars.join(", ")})의 상호작용으로 설명하세요. "거울 효과(Mirror Effect)"를 활용하여 내가 파트너에게서 찾고 있는 것이 사실 내 내면의 무엇인지를 분석하세요. 진화심리학적 관점에서 이 사람의 자연적 끌림 매력도 ${rs.attraction}점이 의미하는 관계 패턴도 설명하세요.

## 2. 관계의 맹점 (약 1,500자)
반복되는 연애 실패 패턴이나 애착 유형(안정형/불안형/회피형/혼란형)의 문제점을 객관적으로 짚어주세요. 관계 맹점 위험도 ${rs.blindSpot}점과 부처궁 흉성(${badDesc})을 바탕으로, 이 사람이 관계에서 무의식적으로 반복하는 자기 파괴적 패턴을 심리학적으로 분석하세요. 존 가트맨(John Gottman)의 "관계 종말의 4기사(Four Horsemen)" 이론 중 이 사람에게 해당하는 패턴을 찾아 구체적으로 설명하세요.

## 3. 바운더리 설정 훈련 (약 2,000자)
미신적 내용은 절대 금지입니다. 경계선 설정 능력 ${rs.boundary}점과 유대감 형성 능력 ${rs.bonding}점을 바탕으로, 나쁜 인연을 걸러내는 관계의 경계선 설정법을 매우 구체적으로 작성하세요: 1) 초기 탐색 단계(1~3개월): 건강한 파트너를 식별하는 3가지 체크리스트, 2) 자존감 회복 훈련: 불건강한 관계에서 벗어난 후 자기 자신을 재건하는 심리학적 프로토콜, 3) 성숙한 의사소통법: 비폭력 대화(NVC)와 애착 이론을 결합한 파트너십 유지 전략. NVC(비폭력 대화) 4단계(관찰→감정→욕구→부탁)를 이 사람의 부처궁 에너지에 맞춰 커스터마이즈하세요.

[작성 스타일]
- 진화심리학+관계 치료사 전문가 톤, 따뜻하지만 직설적
- 미신적 표현 절대 금지 — 부처궁 별 에너지를 심리학/애착이론 개념으로 번역
- 각 섹션에 [QUOTE]: 마커 필수 삽입 (총 3회)
- 행간 충분히 활용, 5,000자 이상 작성`;
}


// ─────────────────────────────────────────────────────────────────
// 교우궁(노복궁) + 형제궁 네트워크 점수 산출
// ─────────────────────────────────────────────────────────────────

// supporter: 서포터 풍부도 / vampire: 에너지 뱀파이어 위험도 (높을수록 주의)
// leverage: 레버리지/아웃소싱 능력 / harmony: 팀 결속력
const NETWORK_STYLE_MAP: Record<string, {
  supporter: number; vampire: number; leverage: number; harmony: number;
}> = {
  "자미":   { supporter: 88, vampire: 42, leverage: 85, harmony: 75 },
  "천기":   { supporter: 72, vampire: 38, leverage: 88, harmony: 72 },
  "태양":   { supporter: 92, vampire: 35, leverage: 80, harmony: 85 },
  "무곡":   { supporter: 68, vampire: 28, leverage: 75, harmony: 62 },
  "천동":   { supporter: 82, vampire: 55, leverage: 70, harmony: 88 },
  "염정":   { supporter: 75, vampire: 65, leverage: 78, harmony: 60 },
  "천부":   { supporter: 78, vampire: 32, leverage: 72, harmony: 82 },
  "태음":   { supporter: 80, vampire: 60, leverage: 68, harmony: 80 },
  "탐랑":   { supporter: 90, vampire: 70, leverage: 85, harmony: 72 },
  "거문":   { supporter: 60, vampire: 58, leverage: 72, harmony: 62 },
  "천상":   { supporter: 75, vampire: 35, leverage: 70, harmony: 85 },
  "천량":   { supporter: 70, vampire: 28, leverage: 75, harmony: 78 },
  "칠살":   { supporter: 65, vampire: 60, leverage: 80, harmony: 55 },
  "파군":   { supporter: 72, vampire: 75, leverage: 88, harmony: 52 },
};

const NETWORK_AUX_BONUS: Record<string, Partial<{
  supporter: number; vampire: number; leverage: number; harmony: number;
}>> = {
  "좌보": { supporter: 8, harmony: 5, vampire: -4 },
  "우필": { supporter: 8, harmony: 5, vampire: -4 },
  "녹존": { supporter: 5, leverage: 4 },
  "천마": { leverage: 6, supporter: 3 },
  "천괴": { supporter: 4, leverage: 3 },
  "천월": { harmony: 4, vampire: -2 },
  "문창": { leverage: 3 },
  "문곡": { leverage: 3 },
};

const NETWORK_BAD_PENALTY: Record<string, Partial<{
  supporter: number; vampire: number; leverage: number; harmony: number;
}>> = {
  "경양": { vampire: 12, harmony: -6 },
  "타라":  { vampire: 10, supporter: -4 },
  "지공": { vampire: 7, harmony: -4 },
  "지겁": { vampire: 9, leverage: -4, harmony: -5 },
};

function calcNetworkScores(
  gyoWuMain: string[], gyoWuAux: string[], gyoWuBad: string[],
  hyungjeMain: string[], hyungjeAux: string[], hyungjeBad: string[],
) {
  type K = "supporter" | "vampire" | "leverage" | "harmony";
  const KEYS: K[] = ["supporter", "vampire", "leverage", "harmony"];
  const base: Record<K, number> = { supporter: 65, vampire: 45, leverage: 65, harmony: 65 };

  // 교우궁 우선, 없으면 형제궁 보완
  const mainArr = gyoWuMain.length ? gyoWuMain : hyungjeMain;
  const auxArr  = [...gyoWuAux, ...hyungjeAux];
  const badArr  = [...gyoWuBad, ...hyungjeBad];

  if (mainArr.length) {
    const d = NETWORK_STYLE_MAP[mainArr[0]];
    if (d) for (const k of KEYS) base[k] = d[k];
    if (mainArr.length > 1) {
      const d2 = NETWORK_STYLE_MAP[mainArr[1]];
      if (d2) for (const k of KEYS) base[k] = Math.round((base[k] + d2[k]) / 2);
    }
  }
  // 보조 궁 주성 보완 (교우궁 주성 없고 형제궁에 있는 경우)
  if (gyoWuMain.length === 0 && hyungjeMain.length > 0) {
    const d = NETWORK_STYLE_MAP[hyungjeMain[0]];
    if (d) for (const k of KEYS) base[k] = Math.round((base[k] + d[k]) / 2);
  }
  for (const s of auxArr) {
    const b = NETWORK_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badArr) {
    const p = NETWORK_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }
  return {
    supporter: base.supporter,
    vampire: base.vampire,
    leverage: base.leverage,
    harmony: base.harmony,
  };
}

// ───────────────────────────────────────────────────────────────────
// Chapter 9: 건강과 몸의 에너지 (질액궁)
// ───────────────────────────────────────────────────────────────────

const HEALTH_STAR_MAP: Record<string, Partial<{vitality:number;stress:number;recovery:number;risk:number}>> = {
  "자미": { vitality: 18, recovery: 14, stress: -4 },
  "천기": { vitality: 10, recovery: 12, stress: 8  },
  "태양": { vitality: 14, recovery: 10, stress: 6  },
  "무곡": { vitality: 12, recovery: 8,  risk: 6    },
  "천동": { vitality: 16, recovery: 14, stress: -6 },
  "염정": { vitality: 8,  risk: 10,     stress: 10 },
  "천부": { vitality: 20, recovery: 16, stress: -8 },
  "태음": { vitality: 12, recovery: 16, stress: -4 },
  "탐랑": { vitality: 10, stress: 10,   risk: 8    },
  "거문": { vitality: 6,  stress: 14,   risk: 6    },
  "천상": { vitality: 14, recovery: 10, stress: 4  },
  "천량": { vitality: 10, recovery: 18, stress: -2 },
  "칠살": { vitality: 8,  risk: 14,     stress: 8  },
  "파군": { vitality: 6,  risk: 18,     stress: 10 },
};
const HEALTH_AUX_BONUS: Record<string, Partial<{vitality:number;recovery:number}>> = {
  "좌보": { vitality: 6, recovery: 5 },
  "우필": { vitality: 6, recovery: 5 },
  "녹존": { vitality: 8, recovery: 6 },
  "천월": { recovery: 10, vitality: 4 },
  "천괴": { vitality: 4, recovery: 4 },
};
const HEALTH_BAD_PENALTY: Record<string, Partial<{vitality:number;risk:number;stress:number}>> = {
  "경양": { vitality: -10, risk: 14, stress: 8 },
  "타라":  { vitality: -8,  risk: 12 },
  "지공": { vitality: -6,  stress: 10 },
  "지겁": { vitality: -6,  risk: 8  },
};

function calcHealthScores(mainArr: string[], auxArr: string[], badArr: string[]) {
  type K = "vitality"|"stress"|"recovery"|"risk";
  const KEYS: K[] = ["vitality","stress","recovery","risk"];
  const base: Record<K,number> = { vitality:40, stress:30, recovery:35, risk:20 };
  for (const s of mainArr) {
    const m = HEALTH_STAR_MAP[s];
    if (m) for (const k of KEYS) base[k] = Math.min(100, base[k] + (m[k] || 0));
  }
  for (const s of auxArr) {
    const b = HEALTH_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badArr) {
    const p = HEALTH_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }
  return {
    vitality: Math.round(Math.min(100, base.vitality)),
    stress:   Math.round(Math.min(100, base.stress)),
    recovery: Math.round(Math.min(100, base.recovery)),
    risk:     Math.round(Math.min(100, base.risk)),
  };
}

function buildChapter9Prompt(opts: {
  characterTitle: string;
  jilAekStars: string[];
  jilAekAux: string[];
  jilAekBad: string[];
  mingongStars: string[];
  healthScores: ReturnType<typeof calcHealthScores>;
  birthYear: number;
}): string {
  const { characterTitle, jilAekStars, jilAekAux, jilAekBad, mingongStars, healthScores, birthYear } = opts;
  const age = new Date().getFullYear() - birthYear;
  const sl = (lbl: string, arr: string[]) => arr.length ? `${lbl}: ${arr.join(", ")}` : `${lbl}: 없음`;
  return `당신은 기능의학 전문가이자 심신의학(Mind-Body Medicine) 코치입니다. 자미두수 질액궁 데이터를 기반으로 이 사람의 신체 에너지와 건강 패턴을 심층 분석하세요.

[기본 정보]
• 명궁 주성: ${mingongStars.join(", ")||"자미"} / 성격 유형: ${characterTitle}
• 현재 나이: 약 ${age}세
• 질액궁 주성: ${sl("",jilAekStars)}
• 질액궁 보조성: ${sl("",jilAekAux)}
• 질액궁 흉성: ${sl("",jilAekBad)}

[건강 지수]
• 생명력/체력 지수: ${healthScores.vitality}/100
• 스트레스 민감도: ${healthScores.stress}/100
• 회복 탄력성: ${healthScores.recovery}/100
• 건강 취약 신호: ${healthScores.risk}/100

[작성 지시]
기능의학 전문가 및 심신의학 코치로서 5,000자 이상 작성하세요.
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요.

## 1. 체질과 에너지 패턴
[1,500자] 이 사람의 선천적 체질과 에너지 순환 방식을 분석하세요. 어떤 상황에서 활력이 넘치거나 소진되는지, 신체 에너지의 고유한 리듬을 서술하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 2. 스트레스 반응과 회복력
[1,500자] 이 사람의 스트레스 유발 패턴과 신체적 반응 양식을 분석하세요. 회복을 방해하는 행동 습관과 회복을 앞당기는 구체적인 전략을 제시하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 3. 생활 습관 처방
[2,000자] 수면, 식習관, 운동 방식에서 이 사람에게 최적화된 맞춤 루틴을 처방하세요. 통계적·의학적 미신을 배제하고 실행 가능한 일상 프로토콜 위주로 서술하세요.
[QUOTE]: 핵심 인사이트 한 문장

한국어로 작성하세요.`;
}

// ───────────────────────────────────────────────────────────────────
// Chapter 10: 창조성과 계승 (자녀궁)
// ───────────────────────────────────────────────────────────────────

const CREATE_STAR_MAP: Record<string, Partial<{creativity:number;expression:number;legacy:number;block:number}>> = {
  "자미": { creativity: 14, expression: 16, legacy: 18 },
  "천기": { creativity: 20, expression: 18, legacy: 8  },
  "태양": { creativity: 16, expression: 20, legacy: 14 },
  "무곡": { creativity: 8,  expression: 6,  legacy: 16, block: 6 },
  "천동": { creativity: 18, expression: 14, legacy: 10 },
  "염정": { creativity: 14, expression: 12, block: 8   },
  "천부": { creativity: 10, expression: 10, legacy: 20 },
  "태음": { creativity: 18, expression: 14, legacy: 12 },
  "탐랑": { creativity: 22, expression: 20, block: 4   },
  "거문": { creativity: 12, expression: 8,  block: 10  },
  "천상": { creativity: 10, expression: 12, legacy: 14 },
  "천량": { creativity: 12, expression: 14, legacy: 10 },
  "칠살": { creativity: 8,  expression: 6,  block: 12  },
  "파군": { creativity: 16, expression: 10, block: 10  },
};
const CREATE_AUX_BONUS: Record<string, Partial<{creativity:number;expression:number}>> = {
  "좌보": { creativity: 4, expression: 5 },
  "우필": { creativity: 4, expression: 5 },
  "문창": { creativity: 8, expression: 10 },
  "문곡": { creativity: 8, expression: 10 },
  "천괴": { creativity: 4, expression: 4  },
};
const CREATE_BAD_PENALTY: Record<string, Partial<{creativity:number;expression:number;block:number}>> = {
  "경양": { creativity: -8,  block: 12 },
  "타라":  { expression: -6, block: 10 },
  "지공": { creativity: -6, block: 8  },
  "지겁": { expression: -6, block: 8  },
};

function calcCreateScores(mainArr: string[], auxArr: string[], badArr: string[]) {
  type K = "creativity"|"expression"|"legacy"|"block";
  const KEYS: K[] = ["creativity","expression","legacy","block"];
  const base: Record<K,number> = { creativity:30, expression:30, legacy:25, block:20 };
  for (const s of mainArr) {
    const m = CREATE_STAR_MAP[s];
    if (m) for (const k of KEYS) base[k] = Math.min(100, base[k] + (m[k] || 0));
  }
  for (const s of auxArr) {
    const b = CREATE_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badArr) {
    const p = CREATE_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }
  return {
    creativity: Math.round(Math.min(100, base.creativity)),
    expression: Math.round(Math.min(100, base.expression)),
    legacy:     Math.round(Math.min(100, base.legacy)),
    block:      Math.round(Math.min(100, base.block)),
  };
}

function buildChapter10Prompt(opts: {
  characterTitle: string;
  janyeoStars: string[];
  janyeoAux: string[];
  janyeoBad: string[];
  mingongStars: string[];
  createScores: ReturnType<typeof calcCreateScores>;
  birthYear: number;
}): string {
  const { characterTitle, janyeoStars, janyeoAux, janyeoBad, mingongStars, createScores, birthYear } = opts;
  const age = new Date().getFullYear() - birthYear;
  const sl = (lbl: string, arr: string[]) => arr.length ? `${lbl}: ${arr.join(", ")}` : `${lbl}: 없음`;
  return `당신은 창의성 심리학자이자 발달 코치입니다. 자미두수 자녀궁 데이터를 기반으로 이 사람의 창조성과 유산 에너지를 분석하세요.

[기본 정보]
• 명궁 주성: ${mingongStars.join(", ")||"자미"} / 성격 유형: ${characterTitle}
• 현재 나이: 약 ${age}세
• 자녀궁 주성: ${sl("",janyeoStars)}
• 자녀궁 보조성: ${sl("",janyeoAux)}
• 자녀궁 흉성: ${sl("",janyeoBad)}

[창조성 지수]
• 창의력: ${createScores.creativity}/100
• 표현·전달력: ${createScores.expression}/100
• 계승·레거시 욕구: ${createScores.legacy}/100
• 창의 블록 경향: ${createScores.block}/100

[작성 지시]
창의성 심리학자 및 발달 코치로서 5,000자 이상 작성하세요.
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요.

## 1. 창조성의 원천
[1,500자] 이 사람의 창의 에너지가 어디서 발원하고 어떤 형태로 표출되는지 분석하세요. 예술, 비즈니스, 교육 등 구체적인 창조적 채널을 제시하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 2. 표현 방식과 특기 영역
[1,500자] 자녀궁 별의 성향에 따라 이 사람이 특히 뛰어난 표현 양식(언어·시각·음악·공간 등)을 분석하고, 창의 블록이 생기는 패턴과 해소법을 제시하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 3. 계승과 레거시
[2,000자] 이 사람이 다음 세대(자녀·제자·팀)에게 어떤 에너지를 전달하는지, 그리고 자신의 삶에서 어떤 족적을 남기고 싶어하는지 분석하세요. 자녀 관계 역학도 포함하세요.
[QUOTE]: 핵심 인사이트 한 문장

한국어로 작성하세요.`;
}

// ───────────────────────────────────────────────────────────────────
// Chapter 11: 뿌리와 기원 (부모궁)
// ───────────────────────────────────────────────────────────────────

const ROOT_STAR_MAP: Record<string, Partial<{rootStrength:number;patternRisk:number;liberation:number;bond:number}>> = {
  "자미": { rootStrength: 18, bond: 16, liberation: 10 },
  "천기": { rootStrength: 10, liberation: 16, patternRisk: 8 },
  "태양": { rootStrength: 12, bond: 10, liberation: 12 },
  "무곡": { rootStrength: 14, patternRisk: 6, liberation: 8 },
  "천동": { rootStrength: 16, bond: 18, patternRisk: -4 },
  "염정": { rootStrength: 8,  patternRisk: 12, liberation: 10 },
  "천부": { rootStrength: 22, bond: 20, patternRisk: -6 },
  "태음": { rootStrength: 14, bond: 16, liberation: 10 },
  "탐랑": { rootStrength: 6,  patternRisk: 14, liberation: 14 },
  "거문": { rootStrength: 8,  patternRisk: 16, liberation: 8 },
  "천상": { rootStrength: 16, bond: 12, liberation: 8 },
  "천량": { rootStrength: 14, bond: 10, liberation: 16 },
  "칠살": { rootStrength: 6,  patternRisk: 14, liberation: 12 },
  "파군": { rootStrength: 4,  patternRisk: 18, liberation: 16 },
};
const ROOT_AUX_BONUS: Record<string, Partial<{rootStrength:number;bond:number;liberation:number}>> = {
  "좌보": { rootStrength: 6, bond: 8 },
  "우필": { rootStrength: 6, bond: 8 },
  "녹존": { rootStrength: 8, bond: 6 },
  "천괴": { rootStrength: 4, liberation: 4 },
  "천월": { bond: 8, rootStrength: 4 },
};
const ROOT_BAD_PENALTY: Record<string, Partial<{rootStrength:number;patternRisk:number;bond:number}>> = {
  "경양": { rootStrength: -8, patternRisk: 12 },
  "타라":  { rootStrength: -6, patternRisk: 10 },
  "지공": { bond: -8, patternRisk: 8 },
  "지겁": { bond: -6, patternRisk: 8 },
};

function calcRootScores(mainArr: string[], auxArr: string[], badArr: string[]) {
  type K = "rootStrength"|"patternRisk"|"liberation"|"bond";
  const KEYS: K[] = ["rootStrength","patternRisk","liberation","bond"];
  const base: Record<K,number> = { rootStrength:35, patternRisk:25, liberation:30, bond:30 };
  for (const s of mainArr) {
    const m = ROOT_STAR_MAP[s];
    if (m) for (const k of KEYS) base[k] = Math.min(100, base[k] + (m[k] || 0));
  }
  for (const s of auxArr) {
    const b = ROOT_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badArr) {
    const p = ROOT_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }
  return {
    rootStrength: Math.round(Math.min(100, base.rootStrength)),
    patternRisk:  Math.round(Math.min(100, base.patternRisk)),
    liberation:   Math.round(Math.min(100, base.liberation)),
    bond:         Math.round(Math.min(100, base.bond)),
  };
}

function buildChapter11Prompt(opts: {
  characterTitle: string;
  bumoStars: string[];
  bumoAux: string[];
  bumoBad: string[];
  mingongStars: string[];
  rootScores: ReturnType<typeof calcRootScores>;
  birthYear: number;
}): string {
  const { characterTitle, bumoStars, bumoAux, bumoBad, mingongStars, rootScores, birthYear } = opts;
  const age = new Date().getFullYear() - birthYear;
  const sl = (lbl: string, arr: string[]) => arr.length ? `${lbl}: ${arr.join(", ")}` : `${lbl}: 없음`;
  return `당신은 가족 체계 치료(Family Systems Therapy) 전문가이자 심층 심리 코치입니다. 자미두수 부모궁 데이터를 기반으로 이 사람의 원가족 에너지와 내면 패턴을 분석하세요.

[기본 정보]
• 명궁 주성: ${mingongStars.join(", ")||"자미"} / 성격 유형: ${characterTitle}
• 현재 나이: 약 ${age}세
• 부모궁 주성: ${sl("",bumoStars)}
• 부모궁 보조성: ${sl("",bumoAux)}
• 부모궁 흉성: ${sl("",bumoBad)}

[뿌리 지수]
• 원가족 유대감: ${rootScores.bond}/100
• 뿌리 안정성: ${rootScores.rootStrength}/100
• 가족 패턴 반복 위험: ${rootScores.patternRisk}/100
• 해방·자기재탄생 역량: ${rootScores.liberation}/100

[작성 지시]
가족 체계 치료 전문가로서 5,000자 이상 작성하세요.
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요.

## 1. 부모 에너지의 내면화
[1,500자] 이 사람이 부모로부터 어떤 에너지와 신념 체계를 내면화했는지 분석하세요. 부모와의 관계 역학, 무의식 중 이어받은 강점과 상처를 서술하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 2. 가족 패턴과 반복
[1,500자] 세대 간 전달되는 가족 패턴(정서, 직업, 관계 방식)을 분석하고, 이 사람이 반복할 가능성이 높은 패턴과 이미 변화시킨 부분을 구분하여 서술하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 3. 원형 해방과 자기 재탄생
[2,000자] 과거의 가족 각본에서 벗어나 진정한 자기 자신으로 재탄생하는 심리적·실천적 방법론을 제시하세요. 용서, 경계 설정, 정체성 재구성 방법을 구체적으로 다루세요.
[QUOTE]: 핵심 인사이트 한 문장

한국어로 작성하세요.`;
}

// ───────────────────────────────────────────────────────────────────
// Chapter 13 (대한 분析): 10년의 메가 트렌드
// ───────────────────────────────────────────────────────────────────

const DAEHAN_MAIN_STAR_SCORE: Record<string, number> = {
  "자미": 20, "천기": 12, "태양": 16, "무곡": 14, "천동": 10,
  "염정": 8,  "천부": 18, "태음": 14, "탐랑": 8,  "거문": 6,
  "천상": 16, "천량": 12, "칠살": 6,  "파군": 4,
};

function calcDaehanScore(main: string[], aux: string[], bad: string[]): number {
  let s = 42;
  for (const x of main) s += DAEHAN_MAIN_STAR_SCORE[x] ?? 4;
  for (const x of aux) {
    if (["문창","문곡","좌보","우필","녹존","천마"].includes(x)) s += 8;
    else if (["천괴","천월"].includes(x)) s += 6;
    else s += 3;
  }
  for (const x of bad) {
    if (["경양","타라"].includes(x)) s -= 14;
    else if (["지겁","지공"].includes(x)) s -= 10;
    else s -= 5;
  }
  return Math.min(97, Math.max(18, Math.round(s)));
}

function getDaehanPalaceByOffset(stars: StarResult, offset: number): { main: string[]; aux: string[]; bad: string[] } {
  const safe = ((offset % 12) + 12) % 12;
  const map: Record<number, { main: string[]; aux: string[]; bad: string[] }> = {
    0:  { main: stars.mingongStars,     aux: [],                   bad: [] },
    1:  { main: stars.bumoStars,        aux: stars.bumoAux,        bad: stars.bumoBad },
    2:  { main: stars.bokdeokgongStars, aux: stars.bokdeokgongAux, bad: stars.bokdeokgongBad },
    3:  { main: stars.jeonTaekStars,    aux: stars.jeonTaekAux,    bad: stars.jeonTaekBad },
    4:  { main: stars.gwanrokgongStars, aux: stars.gwanrokgongAux, bad: stars.gwanrokgongBad },
    5:  { main: stars.gyoWuStars,       aux: stars.gyoWuAux,       bad: stars.gyoWuBad },
    6:  { main: stars.cheonigongStars,  aux: stars.cheonigongAux,  bad: stars.cheonigongBad },
    7:  { main: stars.jilAekStars,      aux: stars.jilAekAux,      bad: stars.jilAekBad },
    8:  { main: stars.jaebaekkongStars, aux: stars.jaebaekkongAux, bad: stars.jaebaekkongBad },
    9:  { main: stars.janyeoStars,      aux: stars.janyeoAux,      bad: stars.janyeoBad },
    10: { main: stars.bucheoStars,      aux: stars.bucheoAux,      bad: stars.bucheoBad },
    11: { main: stars.hyungjeStars,     aux: stars.hyungjeAux,     bad: stars.hyungjeBad },
  };
  return map[safe] ?? { main: [], aux: [], bad: [] };
}

function getDaehanSeason(periodIdx: number, score: number): { season: string; seasonEmoji: string } {
  let season: string;
  if (score >= 72) {
    season = periodIdx <= 2 ? "봄" : periodIdx <= 4 ? "여름" : "가을";
  } else if (score >= 52) {
    season = periodIdx <= 1 ? "봄" : periodIdx <= 4 ? "여름" : "가을";
  } else if (score >= 35) {
    season = periodIdx <= 1 ? "봄" : periodIdx <= 3 ? "가을" : "겨울";
  } else {
    season = "겨울";
  }
  const emojis: Record<string, string> = { "봄": "🌸", "여름": "☀️", "가을": "🍂", "겨울": "❄️" };
  return { season, seasonEmoji: emojis[season] ?? "🌸" };
}

function getDaehanKeyword(season: string, trend: string): string {
  const keys: Record<string, Record<string, string>> = {
    "bull":    { "봄": "씨앗을 심는 도약기", "여름": "전성기의 열정", "가을": "수확의 절정", "겨울": "역경 속 성장기" },
    "bear":    { "봄": "시행착오 학습기",   "여름": "구조 재편기",   "가을": "정리와 내실화", "겨울": "깊이 내려가는 계절" },
    "neutral": { "봄": "가능성 탐색기",     "여름": "균형 잡힌 성장기", "가을": "성숙과 전환점", "겨울": "지혜 축적기" },
  };
  return keys[trend]?.[season] ?? "전환의 시기";
}

type DaehanPeriodData = {
  index: number; label: string; ageRange: string;
  startYear: number; endYear: number; startAge: number; endAge: number;
  season: string; seasonEmoji: string;
  trend: "bull" | "bear" | "neutral"; score: number; keyword: string;
  isCurrent: boolean; palaceStars: string[];
};

function buildDaehanList(stars: StarResult, birthYear: number, currentYear: number): DaehanPeriodData[] {
  const GAN_YANG = ["甲","丙","戊","庚","壬"];
  const direction = GAN_YANG.includes(stars.yearGan) ? 1 : -1;
  const mengIdx = stars.mingongIdx ?? 0;
  const currentAge = currentYear - birthYear;
  const list: DaehanPeriodData[] = [];
  const PERIOD_START = [1, 11, 21, 31, 41, 51, 61, 71];

  for (let i = 0; i < 8; i++) {
    const startAge = PERIOD_START[i];
    const endAge = startAge + 9;
    const offset = ((direction * i) % 12 + 12) % 12;
    const palace = getDaehanPalaceByOffset(stars, (mengIdx + offset) % 12 - mengIdx < 0
      ? (mengIdx + offset + 12) % 12 - mengIdx + 12
      : ((mengIdx + offset * direction) % 12 + 12) % 12);

    // Correct offset: period i uses palace (mengIdx + direction*i) mod 12
    const absIdx = ((mengIdx + direction * i) % 12 + 12) % 12;
    const pal = getDaehanPalaceByOffset(stars, absIdx);
    const score = calcDaehanScore(pal.main, pal.aux, pal.bad);
    const trend: "bull" | "bear" | "neutral" = score >= 65 ? "bull" : score <= 42 ? "bear" : "neutral";
    const { season, seasonEmoji } = getDaehanSeason(i, score);
    const keyword = getDaehanKeyword(season, trend);
    const isCurrent = currentAge >= startAge && currentAge <= endAge;
    const label = startAge < 20 ? `${startAge}대` : `${Math.floor(startAge / 10) * 10}대`;
    list.push({
      index: i, label, ageRange: `${startAge}-${endAge}세`,
      startYear: birthYear + startAge, endYear: birthYear + endAge,
      startAge, endAge, season, seasonEmoji, trend, score, keyword, isCurrent,
      palaceStars: pal.main,
    });
    void palace; // suppress unused
  }
  return list;
}

function buildDaehanPrompt(opts: {
  characterTitle: string; birthYear: number; currentAge: number;
  currentPeriod: DaehanPeriodData; mingongStars: string[];
  daehanList: DaehanPeriodData[];
}): string {
  const { characterTitle, birthYear, currentAge, currentPeriod, mingongStars, daehanList } = opts;
  const trendLabel = (t: string) => t === "bull" ? "📈 상승장" : t === "bear" ? "📉 하락장" : "→ 횡보장";
  const periodLines = daehanList.map(d =>
    `  ${d.label}(${d.ageRange}): ${d.season} / ${trendLabel(d.trend)} ${d.score}점 - ${d.keyword} [${d.palaceStars.join(", ") || "무성"}]`,
  ).join("\n");

  return `당신은 거시 경제 애널리스트이자 인생 전략가입니다.

[기본 정보]
• 성격 유형: ${characterTitle}
• 출생 연도: ${birthYear}년
• 현재 나이: 약 ${currentAge}세
• 명궁 주성: ${mingongStars.join(", ") || "자미"}

[현재 대한 정보]
• 시기: ${currentPeriod.label} (${currentPeriod.ageRange}, ${currentPeriod.startYear}~${currentPeriod.endYear}년)
• 인생의 계절: ${currentPeriod.season}
• 트렌드: ${trendLabel(currentPeriod.trend)}
• 에너지 지수: ${currentPeriod.score}/100
• 핵심 키워드: ${currentPeriod.keyword}
• 대한 지배 주성: ${currentPeriod.palaceStars.join(", ") || "없음"}

[전 생애 대한 흐름]
${periodLines}

[작성 지시]
거시 경제 애널리스트이자 인생 전략가로서 현재의 '대한(10년 운)'을 분析해 5,000자 이상 작성하세요.
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트 한 문장을 반드시 포함하세요.
삼재 같은 미신적 공포 표현은 절대 사용하지 마세요. 실증적·전략적 프레임으로 서술하세요.

## 1. 인생의 계절
[1,500자] 현재 사용자가 속한 10년이 인생 전체에서 어떤 계절(봄, 여름, 가을, 겨울)에 해당하는지, 선천 명반과 교차 분석하여 논리적으로 브리핑하세요. 이 시기를 어떤 마음가짐으로 살아가야 하는지 구체적으로 서술하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

## 2. 메가 트렌드
[1,500자] 이 시기에 주로 발생하는 이벤트의 성격(이동, 학업, 창업, 결혼 등)과 자산/커리어의 변동성을 예측하세요. 현재 대한의 지배 주성이 어떤 영역에서 강하게 발현되는지 분석하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

## 3. 포지셔닝 전략
[2,000자] 운이 상승장(에너지 지수 ${currentPeriod.score}/100)인 지금, 공격적 레버리지 전략과 리스크 헤징 전략을 기획서 형태로 명확하게 작성하세요. 커리어·자산·관계·건강 각 영역에서 지금 당장 실행해야 할 액션 아이템을 구체적으로 제시하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

모든 내용은 한국어로 작성하세요.`;
}

// ───────────────────────────────────────────────────────────────────
// Chapter 12: 인생 종합 설계 (그랜드 피날레)
// ───────────────────────────────────────────────────────────────────

function buildChapter12Prompt(opts: {
  characterTitle: string;
  mingongStars: string[];
  shingongStars: string[];
  allPalaceStars: Record<string, string[]>;
  birthYear: number;
}): string {
  const { characterTitle, mingongStars, shingongStars, allPalaceStars, birthYear } = opts;
  const age = new Date().getFullYear() - birthYear;
  const palaceLines = Object.entries(allPalaceStars)
    .map(([name, stars]) => `  • ${name}: ${stars.length ? stars.join(", ") : "빈 궁"}`)
    .join("\n");
  return `당신은 자미두수 최고 수준의 그랜드 마스터이자 인생 설계 전문가입니다. 12궁 전체 데이터를 종합하여 이 사람의 인생 전체를 아우르는 종합 분석을 작성하세요.

[기본 정보]
• 성격 유형: ${characterTitle}
• 명궁 주성: ${mingongStars.join(", ")||"자미"}
• 신궁 주성: ${shingongStars.join(", ")||""}
• 현재 나이: 약 ${age}세

[12궁 주성 배치]
${palaceLines}

[작성 지시]
자미두수 그랜드 마스터이자 인생 설계 전문가로서 7,000자 이상의 종합 리포트를 작성하세요.
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요.

## 1. 인생의 핵심 테마
[2,000자] 12궁의 별자리 배치가 만들어내는 이 사람 인생의 가장 중요한 3가지 테마를 분석하세요. 이 사람이 이번 생에 해결해야 할 '인생 과제'와 발현해야 할 '인생 사명'을 명확히 서술하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 2. 시기별 인생 사이클
[2,500자] 20대·30대·40대·50대 이후 각 시기에 어떤 궁의 에너지가 활성화되고, 어떤 기회와 도전이 찾아오는지 단계별로 분석하세요. 현재 나이(${age}세)를 기준으로 지금 시기의 핵심 과제도 포함하세요.
[QUOTE]: 핵심 인사이트 한 문장

## 3. 인생 설계 로드맵
[2,500자] 이 사람의 강점 궁과 취약 궁을 균형 있게 활용하는 '3년·10년 인생 설계 로드맵'을 제시하세요. 커리어, 관계, 건강, 자산 각 영역별로 지금 당장 실행해야 할 구체적 액션 아이템을 포함하세요.
[QUOTE]: 핵심 인사이트 한 문장

한국어로 작성하세요. 이것이 이 사람의 가장 중요한 인생 나침반이 됩니다.`;
}

// ───────────────────────────────────────────────────────────────────
// Chapter 8: 공간과 환경 (전택궁)
// ───────────────────────────────────────────────────────────────────

const SPACE_STAR_MAP: Record<string, Partial<{ stability: number; asset: number; flow: number; clutter: number }>> = {
  "자미": { stability: 18, asset: 20, flow: 6  },
  "천기": { stability: 8,  asset: 6,  flow: 15 },
  "태양": { stability: 10, asset: 14, flow: 12 },
  "무곡": { stability: 14, asset: 22, flow: 6,  clutter: 4 },
  "천동": { stability: 16, asset: 10, flow: 12 },
  "염정": { stability: 6,  asset: 12, flow: 8,  clutter: 8 },
  "천부": { stability: 22, asset: 18, flow: 8  },
  "태음": { stability: 14, asset: 12, flow: 18 },
  "탐랑": { stability: 6,  asset: 8,  flow: 14, clutter: 10 },
  "거문": { stability: 8,  asset: 10, flow: 6,  clutter: 8 },
  "천상": { stability: 16, asset: 12, flow: 10 },
  "천량": { stability: 12, asset: 10, flow: 14 },
  "칠살": { stability: 6,  asset: 8,  flow: 8,  clutter: 12 },
  "파군": { stability: 4,  asset: 6,  flow: 16, clutter: 14 },
};

const SPACE_AUX_BONUS: Record<string, Partial<{ stability: number; asset: number; flow: number; clutter: number }>> = {
  "좌보": { stability: 8, asset: 6 },
  "우필": { stability: 8, asset: 6 },
  "녹존": { asset: 10, stability: 6 },
  "천마": { flow: 10 },
  "천괴": { stability: 5, asset: 4 },
  "천월": { stability: 6, flow: 5 },
  "문창": { flow: 4 },
  "문곡": { flow: 4 },
};

const SPACE_BAD_PENALTY: Record<string, Partial<{ stability: number; asset: number; flow: number; clutter: number }>> = {
  "경양": { stability: -10, clutter: 12 },
  "타라":  { stability: -8,  clutter: 10, flow: -5 },
  "지공": { stability: -6,  clutter: 8  },
  "지겁": { asset: -8,     clutter: 8  },
};

function calcSpaceScores(mainArr: string[], auxArr: string[], badArr: string[]) {
  type K = "stability" | "asset" | "flow" | "clutter";
  const KEYS: K[] = ["stability", "asset", "flow", "clutter"];
  const base: Record<K, number> = { stability: 35, asset: 30, flow: 30, clutter: 20 };
  for (const s of mainArr) {
    const m = SPACE_STAR_MAP[s];
    if (m) for (const k of KEYS) base[k] = Math.min(100, base[k] + (m[k] || 0));
  }
  for (const s of auxArr) {
    const b = SPACE_AUX_BONUS[s];
    if (b) for (const k of KEYS) base[k] = Math.min(100, base[k] + (b[k] || 0));
  }
  for (const s of badArr) {
    const p = SPACE_BAD_PENALTY[s];
    if (p) for (const k of KEYS) base[k] = Math.max(5, base[k] + (p[k] || 0));
  }
  return {
    stability: Math.round(Math.min(100, base.stability)),
    asset:     Math.round(Math.min(100, base.asset)),
    flow:      Math.round(Math.min(100, base.flow)),
    clutter:   Math.round(Math.min(100, base.clutter)),
  };
}

function buildChapter8Prompt(opts: {
  characterTitle: string;
  jeonTaekStars: string[];
  jeonTaekAux: string[];
  jeonTaekBad: string[];
  mingongStars: string[];
  spaceScores: ReturnType<typeof calcSpaceScores>;
  birthYear: number;
}): string {
  const { characterTitle, jeonTaekStars, jeonTaekAux, jeonTaekBad, mingongStars, spaceScores, birthYear } = opts;

  const starBlock = (label: string, arr: string[]) =>
    arr.length ? `${label}: ${arr.join(", ")}` : `${label}: 없음`;

  const age = new Date().getFullYear() - birthYear;

  return `당신은 환경 심리학자 겸 공간 디자이너입니다. 자미두수 전택궁 데이터를 기반으로 이 사람의 공간·환경·부동산 감각을 심층 분석하세요.

[기본 정보]
• 탄생 주성(명궁): ${mingongStars.join(", ") || "자미"}
• 성격 유형: ${characterTitle}
• 현재 나이: 약 ${age}세
• 전택궁 주성: ${starBlock("", jeonTaekStars)}
• 전택궁 보조성: ${starBlock("", jeonTaekAux)}
• 전택궁 흉성: ${starBlock("", jeonTaekBad)}

[공간 지수]
• 거주 안정성: ${spaceScores.stability}/100
• 부동산 자산 감각: ${spaceScores.asset}/100
• 공간 에너지 흐름: ${spaceScores.flow}/100
• 혼잡·집착 경향: ${spaceScores.clutter}/100

[작성 지시]
환경 심리학자 및 공간 디자이너로서 전택궁 데이터를 분석해 5,000자 이상 작성하세요.
모든 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트 한 문장(이탤릭체 수준의 밀도)을 반드시 포함하세요.

## 1. 자산 축적과 터전
[1,500자] 부동산 자산에 대한 감각과 주거 환경의 안정성을 전택궁 길흉에 따라 분석하세요. 자산 형성 패턴, 이사 주기, 집과의 감정적 유대를 구체적으로 다루세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

## 2. 공간 에너지학
[1,500자] 방향이나 미신적 풍수를 배제하고, 사용자의 심리적 안정감을 극대화하는 인테리어 톤앤매너를 제안하세요. 조명 온도·색감·재질·소리·향기 등 감각적 요소를 구체적 브랜드·재료 이름 없이 서술하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

## 3. 미니멀리즘과 공간 순환
[2,000자] 불필요한 물건이 멘탈에 미치는 영향을 심리학적으로 설명하고, 공간 에너지를 순환시키는 현대적 정리 정돈법과 동선 설계법을 제공하세요. 추상적 조언이 아닌 실행 가능한 방법론 위주로 서술하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

모든 내용은 한국어로 작성하세요. 전문 용어는 쉬운 언어로 풀어 쓰되 깊이를 유지하세요.`;
}

function buildChapter7Prompt(opts: {
  characterTitle: string;
  gyoWuStars: string[];
  gyoWuAux: string[];
  gyoWuBad: string[];
  hyungjeStars: string[];
  hyungjeAux: string[];
  hyungjeBad: string[];
  mingongStars: string[];
  networkScores: ReturnType<typeof calcNetworkScores>;
  birthYear: number;
}) {
  const gyoWuDesc = opts.gyoWuStars.length
    ? opts.gyoWuStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const hyungjeDesc = opts.hyungjeStars.length
    ? opts.hyungjeStars.map((s) => `${s}(${STAR_CHARACTER_MAP[s]?.subtitle || s})`).join(", ")
    : "없음";
  const gyoWuAuxDesc  = opts.gyoWuAux.join(", ") || "없음";
  const gyoWuBadDesc  = opts.gyoWuBad.join(", ") || "없음";
  const ns = opts.networkScores;
  const scoreDesc = [
    `서포터 풍부도: ${ns.supporter}점`,
    `에너지 뱀파이어 위험도: ${ns.vampire}점`,
    `레버리지 역량: ${ns.leverage}점`,
    `팀 결속력: ${ns.harmony}점`,
  ].join(", ");

  return `당신은 비즈니스 네트워킹 전문가이자 조직 행동학(Organizational Behavior) 전문가입니다. 아래 사용자의 자미두수 교우궁(交友宮, 노복궁)과 형제궁 데이터를 바탕으로 챕터 7: 팀워크와 수평적 네트워크를 총 5,000자 이상의 심층 분석 리포트로 작성하세요. 반드시 한국어로 작성하고 존댓말을 사용하세요. 미신적 표현은 절대 사용하지 마세요.

[사용자 자미두수 데이터]
- 전체 캐릭터 아키타입: ${opts.characterTitle}
- 명궁 주성: ${opts.mingongStars.join(", ")}
- 교우궁(노복궁) 주성: ${gyoWuDesc}
- 교우궁 보조성: ${gyoWuAuxDesc}
- 교우궁 흉성: ${gyoWuBadDesc}
- 형제궁 주성: ${hyungjeDesc}
- 관계 네트워크 지표: ${scoreDesc}
- 출생년도: ${opts.birthYear}년

[작성 목차 - 각 섹션 제목을 명확히 표기하고, 각 섹션 첫 단락 직후 핵심 인사이트를 반드시 [QUOTE]: 문장 형식으로 한 줄 삽입하세요]

## 1. 인적 자원 지형도 (약 1,500자)
교우궁의 별(${gyoWuDesc})과 형제궁의 별(${hyungjeDesc})이 만들어내는 이 사람 주변의 인적 자원 생태계를 분석하세요. 보조성(${gyoWuAuxDesc})이 많은지 흉성(${gyoWuBadDesc})이 많은지에 따라 서포터 풍부도(${ns.supporter}점)를 해석하고, 나를 돕는 사람들의 유형(예: 전문가형, 정신적 서포터형, 실무 도우미형)을 구체적으로 서술하세요. 이 사람이 자연스럽게 끌어들이는 인재 유형과 관계 생태계가 형성되는 원리를 조직 행동학 이론으로 설명하세요.

## 2. 에너지 뱀파이어 식별법 (약 1,500자)
에너지 뱀파이어 위험도(${ns.vampire}점)를 기반으로, 이 사람 주변에 나타나기 쉬운 소인배·악연의 특징 3~4가지를 구체적으로 묘사하세요. 존 가트맨의 관계 연구, 로버트 치알디니의 설득 심리학 등을 활용하여 교우궁 흉성(${gyoWuBadDesc})이 유발하는 질투·배신의 패턴을 분석하세요. 이런 유형을 초기에 식별하는 징후(레드 플래그)와 비즈니스 거리두기 원칙을 실용적으로 제시하세요.

## 3. 레버리지 전략 (약 2,000자)
레버리지 역량(${ns.leverage}점)과 팀 결속력(${ns.harmony}점)을 최대화하는 구체적인 전략을 제시하세요: 1) 이 사람의 교우궁 에너지에 맞는 최적의 위임(Delegation)과 아웃소싱 기술, 2) 갈등 상황에서 관계를 보호하는 현명한 대화법(FBI 협상가의 전술 또는 마샬 로젠버그의 NVC), 3) 타인의 능력을 내 것으로 만드는 협력 네트워크 구축 로드맵을 포함하세요.

[작성 스타일]
- 비즈니스 네트워킹 전문 컨설턴트의 실용적이고 전략적인 톤
- 미신적 표현 절대 금지 — 별의 에너지를 조직심리학/행동경제학으로 번역
- 각 섹션에 [QUOTE]: 마커 필수 삽입 (총 3회)
- 행간 충분히 활용, 5,000자 이상 작성`;
}


// ─────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const birthYear = Number(b.birthYear);
  const birthMonth = Number(b.birthMonth);
  const birthDay = Number(b.birthDay);
  const birthHour = Number(b.birthHour ?? 12);
  const chapter = Number(b.chapter ?? 1);

  if (
    !birthYear || birthYear < 1900 || birthYear > 2099 ||
    !birthMonth || birthMonth < 1 || birthMonth > 12 ||
    !birthDay || birthDay < 1 || birthDay > 31
  ) {
    return NextResponse.json({ error: "생년월일이 올바르지 않습니다." }, { status: 400 });
  }

  // 별 계산 (모든 챕터 공통)
  const starResult = calcZiweiStarsServer(birthYear, birthMonth, birthDay, birthHour);
  const character = buildCharacterTitle(starResult.mingongStars, starResult.shingongStars);

  // ── 챕터 16: 인생 설계도 총결산 (마스터플랜) ─────────────────
  if (chapter === 16) {
    const allPalaceMap: Record<string, string[]> = {
      "명궁":   starResult.mingongStars,
      "형제궁": starResult.hyungjeStars,
      "부처궁": starResult.bucheoStars,
      "자녀궁": starResult.janyeoStars,
      "재백궁": starResult.jaebaekkongStars,
      "질액궁": starResult.jilAekStars,
      "천이궁": starResult.cheonigongStars,
      "교우궁": starResult.gyoWuStars,
      "관록궁": starResult.gwanrokgongStars,
      "전택궁": starResult.jeonTaekStars,
      "복덕궁": starResult.bokdeokgongStars,
      "부모궁": starResult.bumoStars,
    };
    const palaceSummary = Object.entries(allPalaceMap)
      .map(([k, v]) => `  ${k}: ${v.join(", ") || "없음"}`)
      .join("\n");

    const age16 = new Date().getFullYear() - birthYear;
    const prompt16 = `최고의 동기부여 연설가이자 라이프 코치로서 전체 자미두수 명반 데이터를 융합하여 5,000자 이상 작성하세요.

[기본 정보]
• 성격 유형: ${character.title}
• 출생 연도: ${birthYear}년 / 현재 나이: 약 ${age16}세
• 명궁 주성: ${starResult.mingongStars.join(", ") || "없음"}
• 신궁 주성: ${starResult.shingongStars.join(", ") || "없음"}

[전체 명반 요약]
${palaceSummary}

[작성 지시]
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요.

## 1. 에너지 밸런스 총평
[1,500자] 전체 명반의 강약과 에너지 밸런스를 종합하여, 현재 사용자가 서 있는 운명적 좌표를 명확히 짚어주세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로.

## 2. 심층 조언
[1,500자] 명반의 부족한 점을 채우기 위해 일상에서 쉽게 실천할 수 있는 '작은 성공' 기반의 습관 설계법을 제안하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로.

## 3. 단 하나의 마스터 해빗
[2,000자] 오늘 당장 시작해야 할 단 하나의 핵심 행동 강령을 도출하세요. 미신에 의존하지 않고 스스로 운명을 개척할 수 있다는 확신을 주는 자기계발서 톤앤매너로, 뼈를 때리면서도 감동적인 최종 마스터플랜 리포트를 완성하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로.

한국어로 작성하세요.`;

    const rawText16 = await callGemini(prompt16);
    function extractSec16(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote16(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const energyRaw  = extractSec16(rawText16, "에너지 밸런스 총평");
    const adviceRaw  = extractSec16(rawText16, "심층 조언");
    const habitRaw   = extractSec16(rawText16, "단 하나의 마스터 해빗");
    const full16     = rawText16 || "분析 중 오류가 발생했습니다.";

    // 아키타입 타이틀 추출 (명궁 주성 기반)
    const mainStar = starResult.mingongStars[0] || "자미";
    const archetypeMap: Record<string, string> = {
      "자미": "황제의 별 — 타고난 통치자", "천기": "지략가 — 변화의 설계자",
      "태양": "빛의 선교사 — 세상을 밝히는 자", "무곡": "철의 결단가 — 개척자",
      "천동": "복의 씨앗 — 향유하는 현자", "염정": "불꽃의 전략가",
      "천부": "복고 귀인 — 풍요의 수호자", "태음": "달의 사색가 — 내면의 예술가",
      "탐랑": "욕망의 연금술사", "거문": "언어의 마법사 — 진실을 파헤치는 자",
      "천상": "조화의 행정가", "천량": "감찰관 — 정의의 심판자",
      "칠살": "혁명가 — 질서를 부수는 개혁자", "파군": "파괴와 창조의 선봉장",
    };
    const archetypeTitle = archetypeMap[mainStar] || `${mainStar} — 나만의 운명 여정`;

    return NextResponse.json({
      archetypeTitle,
      mingongStars: starResult.mingongStars,
      shingongStars: starResult.shingongStars,
      characterTitle: character.title,
      chapter16: {
        energyBalance:  energyRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim() || full16,
        energyQuote:    extractQuote16(energyRaw),
        deepAdvice:     adviceRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        adviceQuote:    extractQuote16(adviceRaw),
        masterHabit:    habitRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        habitQuote:     extractQuote16(habitRaw),
        fullText:       full16,
      },
    });
  }

  // ── 챕터 15: 상하관계와 처세술 (부모궁·자녀궁) ───────────────
  if (chapter === 15) {
    const age15 = new Date().getFullYear() - birthYear;
    const prompt15 = `리더십 코치이자 비즈니스 컨설턴트로서 부모궁과 자녀궁 데이터를 분析하여 5,000자 이상 작성하세요.

[기본 정보]
• 성격 유형: ${character.title}
• 출생 연도: ${birthYear}년 / 현재 나이: 약 ${age15}세

[부모궁 (윗사람·멘토·투자자 에너지)]
• 주성: ${starResult.bumoStars.join(", ") || "없음"}
• 보조성: ${starResult.bumoAux.join(", ") || "없음"}
• 흉성: ${starResult.bumoBad.join(", ") || "없음"}

[자녀궁 (아랫사람·부하·창작물 에너지)]
• 주성: ${starResult.janyeoStars.join(", ") || "없음"}
• 보조성: ${starResult.janyeoAux.join(", ") || "없음"}
• 흉성: ${starResult.janyeoBad.join(", ") || "없음"}

[명궁 참조]
• 주성: ${starResult.mingongStars.join(", ") || "없음"}

[작성 지시]
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요.

## 1. 윗사람 대하는 처세술
[1,500자] 부모궁의 에너지를 分析하여, 직장 상사·멘토·투자자 등 권위 있는 사람들의 지원을 끌어내는 맞춤형 소통 방식과 윗사람 복(인덕)을 설명하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로.

## 2. 부하직원 다루는 처세술
[1,500자] 자녀궁을 현대적으로 해석하여, 부하직원·후배를 육성하는 리더십 스타일과 나의 창작물(지식재산, 프로젝트, 자본)이 확장되는 패턴을 分析하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로.

## 3. 인간관계 지혜 전략
[2,000자] 윗사람의 지혜를 내 것으로 흡수하고, 아랫사람과 창작물을 통해 세상에 어떤 영향력을 남길 수 있는지 실질적인 비즈니스/커리어 확장 개운법을 작성하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로.

한국어로 작성하세요.`;

    const rawText15 = await callGemini(prompt15);
    function extractSec15(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote15(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const superRaw  = extractSec15(rawText15, "윗사람 대하는 처세술");
    const subRaw    = extractSec15(rawText15, "부하직원 다루는 처세술");
    const wisdomRaw = extractSec15(rawText15, "인간관계 지혜 전략");
    const full15    = rawText15 || "분析 중 오류가 발생했습니다.";

    return NextResponse.json({
      palace: {
        bumo:   { name: "부모궁", stars: starResult.bumoStars,   aux: starResult.bumoAux,   bad: starResult.bumoBad   },
        janyeo: { name: "자녀궁", stars: starResult.janyeoStars, aux: starResult.janyeoAux, bad: starResult.janyeoBad },
      },
      chapter15: {
        superior:       superRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim() || full15,
        superiorQuote:  extractQuote15(superRaw),
        subordinate:    subRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        subordinateQuote: extractQuote15(subRaw),
        wisdom:         wisdomRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        wisdomQuote:    extractQuote15(wisdomRaw),
        fullText:       full15,
      },
    });
  }

  // ── 챕터 14: 올해의 마이크로 전술 (유년/유월 분析) ─────────────
  if (chapter === 14) {
    const currentYear = new Date().getFullYear();
    const yearZhiIdx = ((currentYear - 1984) % 12 + 12) % 12;
    const yearGanIdx = ((currentYear - 1984) % 10 + 10) % 10;
    const yearGanZhi = GAN_LIST[yearGanIdx] + ZHI_LIST[yearZhiIdx];

    const MONTH_MAIN_SCORE: Record<string, number> = {
      "자미": 22, "천기": 12, "태양": 16, "무곡": 14, "천동": 12,
      "염정": 8,  "천부": 20, "태음": 14, "탐랑": 8,  "거문": 6,
      "천상": 16, "천량": 14, "칠살": 6,  "파군": 5,
    };
    function calcMonthScore(main: string[], aux: string[], bad: string[]): number {
      let s = 45;
      for (const x of main) s += MONTH_MAIN_SCORE[x] ?? 4;
      for (const x of aux) {
        if (["문창","문곡","좌보","우필","녹존"].includes(x)) s += 8;
        else if (["천마","천괴","천월"].includes(x)) s += 6;
        else s += 3;
      }
      for (const x of bad) {
        if (["경양","타라"].includes(x)) s -= 14;
        else if (["지겁","지공"].includes(x)) s -= 10;
        else s -= 5;
      }
      return Math.min(96, Math.max(15, Math.round(s)));
    }
    function getMonthTrend(score: number): "good" | "average" | "caution" {
      return score >= 65 ? "good" : score >= 45 ? "average" : "caution";
    }
    function getMonthKeyword(score: number): string {
      if (score >= 75) return "최고 타이밍";
      if (score >= 65) return "도약 기회";
      if (score >= 55) return "안정 성장";
      if (score >= 45) return "유지·관찰";
      if (score >= 35) return "신중 운용";
      return "내실 다지기";
    }

    const yearPalace = getDaehanPalaceByOffset(starResult, yearZhiIdx);
    const months = Array.from({ length: 12 }, (_, i) => {
      const palaceIdx = (yearZhiIdx + i) % 12;
      const pal = getDaehanPalaceByOffset(starResult, palaceIdx);
      const score = calcMonthScore(pal.main, pal.aux, pal.bad);
      return { month: i + 1, palaceIdx, stars: pal.main, aux: pal.aux, bad: pal.bad, score, trend: getMonthTrend(score), keyword: getMonthKeyword(score), analysis: "" };
    });

    const TREND_LABEL: Record<string, string> = { good: "▲ 길", average: "→ 보통", caution: "▽ 신중" };
    const monthLines = months.map(m =>
      `  ${m.month}월: ${TREND_LABEL[m.trend]} ${m.score}점 / 주성: ${m.stars.join(",") || "없음"} / ${m.keyword}`,
    ).join("\n");

    const age = currentYear - birthYear;
    const prompt14 = `당신은 마이크로 타임 매니저이자 자미두수 전문가입니다.

[기본 정보]
• 성격 유형: ${character.title}
• 출생 연도: ${birthYear}년 / 현재 나이: 약 ${age}세
• 명궁 주성: ${starResult.mingongStars.join(", ") || "자미"}

[${currentYear}년 ${yearGanZhi} 유년 정보]
• 유년궁 주성: ${yearPalace.main.join(", ") || "없음"}
• 유년궁 보조성: ${yearPalace.aux.join(", ") || "없음"}
• 유년궁 흉성: ${yearPalace.bad.join(", ") || "없음"}

[월별 에너지 지수]
${monthLines}

[작성 지시]
마이크로 타임 매니저로서 올해(유년)와 매월(유월)의 변화를 분析해 5,000자 이상 작성하세요.
각 섹션에 [QUOTE]: 로 시작하는 핵심 인사이트를 반드시 포함하세요. 미신적 표현 없이 작성하세요.

## 1. 연간 기조
[1,500자] 올해 ${yearGanZhi}년 유년 궁의 별자리 이동이 가져오는 전체적인 테마와 핵심 미션을 설명하세요. 유년 주성이 어떤 에너지를 가져오는지, 선천 명반과 어떻게 공명하는지 分析하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

## 2. 월별 모멘텀
1월부터 12월까지 각 월의 운세를 2-3문장씩 分析하세요. 이사, 계약, 이직, 투자, 만남 등 중요한 결정을 내리기 좋은 최적의 타이밍을 짚어주세요.
형식: "X월: [분析 내용 2-3문장]" (각 월별로 줄바꿈하여 작성, 반드시 "1월:", "2월:" ... "12월:" 순서로)
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

## 3. 플래닝 스킬
[2,000자] 운이 좋은 달에 핵심 프로젝트를 몰아넣고, 정체된 달에 휴식과 루틴을 정비하는 구체적인 실용적 플래너 작성법(개운법)을 세밀하게 제안하세요. 달별 에너지 순환을 최대한 활용하는 실행 가이드를 제시하세요.
[QUOTE]: 이 섹션의 핵심 인사이트를 한 문장으로 담아주세요.

한국어로 작성하세요.`;

    const rawText14 = await callGemini(prompt14);
    function extractSec14(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote14(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const annualRaw   = extractSec14(rawText14, "연간 기조");
    const monthlyRaw  = extractSec14(rawText14, "월별 모멘텀");
    const planningRaw = extractSec14(rawText14, "플래닝 스킬");

    // 월별 텍스트 파싱
    const monthlyTexts: Record<number, string> = {};
    const mpat = /(\d{1,2})월\s*:\s*([\s\S]*?)(?=\d{1,2}월\s*:|$)/g;
    let mm;
    while ((mm = mpat.exec(monthlyRaw)) !== null) {
      const mn = Number(mm[1]);
      if (mn >= 1 && mn <= 12) monthlyTexts[mn] = mm[2].replace(/\[QUOTE\]:[^\n]*/g, "").trim();
    }

    const enhancedMonths = months.map(m => ({ ...m, analysis: monthlyTexts[m.month] || "" }));

    return NextResponse.json({
      yearPalaceStars: yearPalace.main,
      yearGanZhi,
      months: enhancedMonths,
      yunnyeon: {
        annual:               annualRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim() || rawText14,
        annualQuote:          extractQuote14(annualRaw),
        planning:             planningRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        planningQuote:        extractQuote14(planningRaw),
        fullText:             rawText14,
      },
    });
  }

  // ── 챕터 13: 10년의 메가 트렌드 (대한 분析) ───────────────────
  if (chapter === 13) {
    const currentYear = 2026;
    const currentAge = currentYear - birthYear;
    const daehanList = buildDaehanList(starResult, birthYear, currentYear);
    const currentPeriod = daehanList.find(d => d.isCurrent) ?? daehanList[Math.min(3, daehanList.length - 1)];

    const prompt13 = buildDaehanPrompt({
      characterTitle: character.title,
      birthYear,
      currentAge,
      currentPeriod,
      mingongStars: starResult.mingongStars,
      daehanList,
    });
    const rawText13 = await callGemini(prompt13);
    function extractSec13(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote13(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const seasonRaw     = extractSec13(rawText13, "인생의 계절");
    const megaTrendRaw  = extractSec13(rawText13, "메가 트렌드");
    const positionRaw   = extractSec13(rawText13, "포지셔닝 전략");
    const fullText13    = rawText13 || "분析 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      daehanList,
      currentPeriod,
      chapter13: {
        season:           seasonRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim() || fullText13,
        seasonQuote:      extractQuote13(seasonRaw),
        megaTrend:        megaTrendRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        megaTrendQuote:   extractQuote13(megaTrendRaw),
        positioning:      positionRaw.replace(/\[QUOTE\]:[^\n]*/g, "").trim(),
        positioningQuote: extractQuote13(positionRaw),
        fullText:         fullText13,
      },
    });
  }

  // ── 챕터 12: 인생 종합 설계 (그랜드 피날레) ──────────────────
  if (chapter === 12) {
    const allPalaceStars: Record<string, string[]> = {
      "명궁":   starResult.mingongStars,
      "형제궁": starResult.hyungjeStars,
      "부처궁": starResult.bucheoStars,
      "자녀궁": starResult.janyeoStars,
      "재백궁": starResult.jaebaekkongStars,
      "질액궁": starResult.jilAekStars,
      "천이궁": starResult.cheonigongStars,
      "노복궁": starResult.gyoWuStars,
      "관록궁": starResult.gwanrokgongStars,
      "전택궁": starResult.jeonTaekStars,
      "복덕궁": starResult.bokdeokgongStars,
      "부모궁": starResult.bumoStars,
    };
    const prompt12 = buildChapter12Prompt({
      characterTitle: character.title,
      mingongStars:    starResult.mingongStars,
      shingongStars:   starResult.shingongStars,
      allPalaceStars,
      birthYear,
    });
    const rawText12 = await callGemini(prompt12);
    function extractSec12(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote12(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const coreThemeRaw = extractSec12(rawText12, "인생의 핵심 테마");
    const cycleRaw     = extractSec12(rawText12, "시기별 인생 사이클");
    const roadmapRaw   = extractSec12(rawText12, "인생 설계 로드맵");
    const fullText12   = rawText12 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      chapter12: {
        coreTheme:       coreThemeRaw  || fullText12,
        coreThemeQuote:  extractQuote12(coreThemeRaw),
        cycle:           cycleRaw,
        cycleQuote:      extractQuote12(cycleRaw),
        roadmap:         roadmapRaw,
        roadmapQuote:    extractQuote12(roadmapRaw),
        fullText:        fullText12,
      },
    });
  }

  // ── 챕터 11: 뿌리와 기원 (부모궁) ────────────────────────────
  if (chapter === 11) {
    const bumoGongName = PALACE_NAMES_KR[11] || "부모궁";
    const rootScores = calcRootScores(
      starResult.bumoStars, starResult.bumoAux, starResult.bumoBad,
    );
    const prompt11 = buildChapter11Prompt({
      characterTitle: character.title,
      bumoStars: starResult.bumoStars,
      bumoAux:   starResult.bumoAux,
      bumoBad:   starResult.bumoBad,
      mingongStars: starResult.mingongStars,
      rootScores,
      birthYear,
    });
    const rawText11 = await callGemini(prompt11);
    function extractSec11(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote11(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const parentEnergyRaw = extractSec11(rawText11, "부모 에너지의 내면화");
    const patternRaw      = extractSec11(rawText11, "가족 패턴과 반복");
    const liberationRaw   = extractSec11(rawText11, "원형 해방과 자기 재탄생");
    const fullText11      = rawText11 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        bumo: {
          name:  bumoGongName,
          stars: starResult.bumoStars,
          aux:   starResult.bumoAux,
          bad:   starResult.bumoBad,
          idx:   starResult.bumoIdx,
        },
      },
      rootScores,
      chapter11: {
        parentEnergy:       parentEnergyRaw || fullText11,
        parentEnergyQuote:  extractQuote11(parentEnergyRaw),
        pattern:            patternRaw,
        patternQuote:       extractQuote11(patternRaw),
        liberation:         liberationRaw,
        liberationQuote:    extractQuote11(liberationRaw),
        fullText:           fullText11,
      },
    });
  }

  // ── 챕터 10: 창조성과 계승 (자녀궁) ─────────────────────────
  if (chapter === 10) {
    const janyeoGongName = PALACE_NAMES_KR[3] || "자녀궁";
    const createScores = calcCreateScores(
      starResult.janyeoStars, starResult.janyeoAux, starResult.janyeoBad,
    );
    const prompt10 = buildChapter10Prompt({
      characterTitle: character.title,
      janyeoStars: starResult.janyeoStars,
      janyeoAux:   starResult.janyeoAux,
      janyeoBad:   starResult.janyeoBad,
      mingongStars: starResult.mingongStars,
      createScores,
      birthYear,
    });
    const rawText10 = await callGemini(prompt10);
    function extractSec10(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote10(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const sourceRaw     = extractSec10(rawText10, "창조성의 원천");
    const expressRaw    = extractSec10(rawText10, "표현 방식과 특기 영역");
    const legacyRaw     = extractSec10(rawText10, "계승과 레거시");
    const fullText10    = rawText10 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        janyeo: {
          name:  janyeoGongName,
          stars: starResult.janyeoStars,
          aux:   starResult.janyeoAux,
          bad:   starResult.janyeoBad,
          idx:   starResult.janyeoIdx,
        },
      },
      createScores,
      chapter10: {
        source:         sourceRaw  || fullText10,
        sourceQuote:    extractQuote10(sourceRaw),
        express:        expressRaw,
        expressQuote:   extractQuote10(expressRaw),
        legacy:         legacyRaw,
        legacyQuote:    extractQuote10(legacyRaw),
        fullText:       fullText10,
      },
    });
  }

  // ── 챕터 9: 건강과 몸의 에너지 (질액궁) ─────────────────────
  if (chapter === 9) {
    const jilAekGongName = PALACE_NAMES_KR[5] || "질액궁";
    const healthScores = calcHealthScores(
      starResult.jilAekStars, starResult.jilAekAux, starResult.jilAekBad,
    );
    const prompt9 = buildChapter9Prompt({
      characterTitle: character.title,
      jilAekStars: starResult.jilAekStars,
      jilAekAux:   starResult.jilAekAux,
      jilAekBad:   starResult.jilAekBad,
      mingongStars: starResult.mingongStars,
      healthScores,
      birthYear,
    });
    const rawText9 = await callGemini(prompt9);
    function extractSec9(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote9(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const constitutionRaw = extractSec9(rawText9, "체질과 에너지 패턴");
    const stressRaw       = extractSec9(rawText9, "스트레스 반응과 회복력");
    const lifestyleRaw    = extractSec9(rawText9, "생활 습관 처방");
    const fullText9       = rawText9 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        jilAek: {
          name:  jilAekGongName,
          stars: starResult.jilAekStars,
          aux:   starResult.jilAekAux,
          bad:   starResult.jilAekBad,
          idx:   starResult.jilAekIdx,
        },
      },
      healthScores,
      chapter9: {
        constitution:       constitutionRaw || fullText9,
        constitutionQuote:  extractQuote9(constitutionRaw),
        stress:             stressRaw,
        stressQuote:        extractQuote9(stressRaw),
        lifestyle:          lifestyleRaw,
        lifestyleQuote:     extractQuote9(lifestyleRaw),
        fullText:           fullText9,
      },
    });
  }

  // ── 챕터 8: 공간과 환경 (전택궁) ─────────────────────────────
  if (chapter === 8) {
    const jeonTaekName = PALACE_NAMES_KR[9] || "전택궁";
    const spaceScores  = calcSpaceScores(
      starResult.jeonTaekStars,
      starResult.jeonTaekAux,
      starResult.jeonTaekBad,
    );
    const prompt8 = buildChapter8Prompt({
      characterTitle:  character.title,
      jeonTaekStars:   starResult.jeonTaekStars,
      jeonTaekAux:     starResult.jeonTaekAux,
      jeonTaekBad:     starResult.jeonTaekBad,
      mingongStars:    starResult.mingongStars,
      spaceScores,
      birthYear,
    });
    const rawText8 = await callGemini(prompt8);
    function extractSec8(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote8(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const assetRaw      = extractSec8(rawText8, "자산 축적과 터전");
    const spaceEnergyRaw = extractSec8(rawText8, "공간 에너지학");
    const minimalRaw     = extractSec8(rawText8, "미니멀리즘과 공간 순환");
    const fullText8      = rawText8 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        jeonTaek: {
          name:   jeonTaekName,
          stars:  starResult.jeonTaekStars,
          aux:    starResult.jeonTaekAux,
          bad:    starResult.jeonTaekBad,
          idx:    starResult.jeonTaekIdx,
        },
      },
      spaceScores,
      chapter8: {
        asset:         assetRaw      || fullText8,
        assetQuote:    extractQuote8(assetRaw),
        spaceEnergy:   spaceEnergyRaw,
        spaceQuote:    extractQuote8(spaceEnergyRaw),
        minimal:       minimalRaw,
        minimalQuote:  extractQuote8(minimalRaw),
        fullText:      fullText8,
      },
    });
  }

  // ── 챕터 7: 팀워크와 수평적 네트워크 (교우궁/형제궁) ──────────
  if (chapter === 7) {
    const gyoWuName     = PALACE_NAMES_KR[7] || "노복궁";
    const hyungjeName   = PALACE_NAMES_KR[1] || "형제궁";
    const networkScores = calcNetworkScores(
      starResult.gyoWuStars,   starResult.gyoWuAux,   starResult.gyoWuBad,
      starResult.hyungjeStars, starResult.hyungjeAux, starResult.hyungjeBad,
    );
    const prompt7 = buildChapter7Prompt({
      characterTitle:   character.title,
      gyoWuStars:       starResult.gyoWuStars,
      gyoWuAux:         starResult.gyoWuAux,
      gyoWuBad:         starResult.gyoWuBad,
      hyungjeStars:     starResult.hyungjeStars,
      hyungjeAux:       starResult.hyungjeAux,
      hyungjeBad:       starResult.hyungjeBad,
      mingongStars:     starResult.mingongStars,
      networkScores,
      birthYear,
    });
    const rawText7 = await callGemini(prompt7);
    function extractSec7(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote7(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const terrainRaw  = extractSec7(rawText7, "인적 자원 지형도");
    const vampireRaw  = extractSec7(rawText7, "에너지 뱀파이어");
    const leverageRaw = extractSec7(rawText7, "레버리지 전략");
    const fullText7   = rawText7 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        gyoWu:   { name: gyoWuName,   stars: starResult.gyoWuStars,   aux: starResult.gyoWuAux,   bad: starResult.gyoWuBad,   idx: starResult.gyoWuIdx },
        hyungje: { name: hyungjeName, stars: starResult.hyungjeStars, aux: starResult.hyungjeAux, bad: starResult.hyungjeBad, idx: starResult.hyungjeIdx },
      },
      networkScores,
      chapter7: {
        terrain:        terrainRaw  || fullText7,
        terrainQuote:   extractQuote7(terrainRaw),
        vampire:        vampireRaw,
        vampireQuote:   extractQuote7(vampireRaw),
        leverage:       leverageRaw,
        leverageQuote:  extractQuote7(leverageRaw),
        fullText:       fullText7,
      },
    });
  }

  // ── 챕터 6: 파트너십과 로맨스 (부처궁) ──────────────────────────
  if (chapter === 6) {
    const bucheoGongName = PALACE_NAMES_KR[2] || "부처궁";
    const relationshipScores = calcRelationshipScores(
      starResult.bucheoStars,
      starResult.bucheoAux,
      starResult.bucheoBad,
    );
    const prompt6 = buildChapter6Prompt({
      characterTitle: character.title,
      bucheoStars: starResult.bucheoStars,
      bucheoAux: starResult.bucheoAux,
      bucheoBad: starResult.bucheoBad,
      mingongStars: starResult.mingongStars,
      relationshipScores,
      birthYear,
    });
    const rawText6 = await callGemini(prompt6);
    function extractSec6(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote6(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const attractionRaw = extractSec6(rawText6, "무의식적 끌림");
    const blindSpotRaw  = extractSec6(rawText6, "관계의 맹점");
    const boundaryRaw   = extractSec6(rawText6, "바운더리 설정");
    const fullText6     = rawText6 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        bucheo: {
          name: bucheoGongName,
          stars: starResult.bucheoStars,
          aux: starResult.bucheoAux,
          bad: starResult.bucheoBad,
          idx: starResult.bucheoIdx,
        },
      },
      relationshipScores,
      chapter6: {
        attraction:      attractionRaw || fullText6,
        attractionQuote: extractQuote6(attractionRaw),
        blindSpot:       blindSpotRaw,
        blindSpotQuote:  extractQuote6(blindSpotRaw),
        boundary:        boundaryRaw,
        boundaryQuote:   extractQuote6(boundaryRaw),
        fullText:        fullText6,
      },
    });
  }

  // ── 챕터 5: 재화와 자산의 흐름 (재백궁) ─────────────────────────
  if (chapter === 5) {
    const jaebaekkongPalaceName = PALACE_NAMES_KR[4] || "재백궁";
    const wealthScores = calcWealthScores(
      starResult.jaebaekkongStars,
      starResult.jaebaekkongAux,
      starResult.jaebaekkongBad,
    );
    const prompt5 = buildChapter5Prompt({
      characterTitle: character.title,
      jaebaekkongStars: starResult.jaebaekkongStars,
      jaebaekkongAux: starResult.jaebaekkongAux,
      jaebaekkongBad: starResult.jaebaekkongBad,
      mingongStars: starResult.mingongStars,
      wealthScores,
      birthYear,
    });
    const rawText5 = await callGemini(prompt5);
    function extractSec5(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote5(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const wealthRaw  = extractSec5(rawText5, "부의 창출 패턴");
    const leakRaw    = extractSec5(rawText5, "재정 누수 원인");
    const correctRaw = extractSec5(rawText5, "현대적 액땜");
    const fullText5  = rawText5 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        jaebaekkong: {
          name: jaebaekkongPalaceName,
          stars: starResult.jaebaekkongStars,
          aux: starResult.jaebaekkongAux,
          bad: starResult.jaebaekkongBad,
          idx: starResult.jaebaekkongIdx,
        },
      },
      wealthScores,
      chapter5: {
        wealth:       wealthRaw  || fullText5,
        wealthQuote:  extractQuote5(wealthRaw),
        leak:         leakRaw,
        leakQuote:    extractQuote5(leakRaw),
        correct:      correctRaw,
        correctQuote: extractQuote5(correctRaw),
        fullText:     fullText5,
      },
    });
  }

  // ── 챕터 4: 커리어와 성취 (관록궁) ──────────────────────────────
  if (chapter === 4) {
    const gwanrokPalaceName = PALACE_NAMES_KR[8] || "관록궁";
    const workStyle = calcWorkStyleScores(
      starResult.gwanrokgongStars,
      starResult.gwanrokgongAux,
      starResult.gwanrokgongBad,
    );
    const prompt4 = buildChapter4Prompt({
      characterTitle: character.title,
      gwanrokgongStars: starResult.gwanrokgongStars,
      gwanrokgongAux: starResult.gwanrokgongAux,
      gwanrokgongBad: starResult.gwanrokgongBad,
      mingongStars: starResult.mingongStars,
      workStyle,
      birthYear,
    });
    const rawText4 = await callGemini(prompt4);
    function extractSec4(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    function extractQuote4(sectionText: string): string {
      const m = sectionText.match(/\[QUOTE\]:\s*(.+)/);
      return m ? m[1].trim() : "";
    }
    const driveRaw = extractSec4(rawText4, "업무 적성");
    const toolkitRaw = extractSec4(rawText4, "강점 극대화");
    const officeRaw = extractSec4(rawText4, "오피스 심리학");
    const fullText4 = rawText4 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        gwanrokgong: {
          name: gwanrokPalaceName,
          stars: starResult.gwanrokgongStars,
          aux: starResult.gwanrokgongAux,
          bad: starResult.gwanrokgongBad,
          idx: starResult.gwanrokgongIdx,
        },
      },
      workStyle,
      chapter4: {
        drive: driveRaw || fullText4,
        driveQuote: extractQuote4(driveRaw),
        toolkit: toolkitRaw,
        toolkitQuote: extractQuote4(toolkitRaw),
        office: officeRaw,
        officeQuote: extractQuote4(officeRaw),
        fullText: fullText4,
      },
    });
  }

  // ── 챕터 3: 세상이라는 무대 (천이궁) ───────────────────────────
  if (chapter === 3) {
    const cheonigongPalaceName = PALACE_NAMES_KR[6] || "천이궁";
    const radarScores = calcRadarScores(
      starResult.cheonigongStars,
      starResult.cheonigongAux,
      starResult.cheonigongBad,
    );
    const prompt3 = buildChapter3Prompt({
      characterTitle: character.title,
      cheonigongStars: starResult.cheonigongStars,
      cheonigongAux: starResult.cheonigongAux,
      cheonigongBad: starResult.cheonigongBad,
      cheonigongPalace: cheonigongPalaceName,
      mingongStars: starResult.mingongStars,
      radarScores,
      birthYear,
    });
    const rawText3 = await callGemini(prompt3);
    function extractSec3(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    const personaText = extractSec3(rawText3, "사회적 페르소나");
    const brandingText = extractSec3(rawText3, "퍼스널 브랜딩");
    const envText = extractSec3(rawText3, "환경 세팅");
    const fullText3 = rawText3 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        cheonigong: {
          name: cheonigongPalaceName,
          stars: starResult.cheonigongStars,
          aux: starResult.cheonigongAux,
          bad: starResult.cheonigongBad,
          idx: starResult.cheonigongIdx,
        },
      },
      radarScores,
      chapter3: {
        persona: personaText || fullText3,
        branding: brandingText,
        environment: envText,
        fullText: fullText3,
      },
    });
  }

  // ── 챕터 2: 무의식의 도화지 (복덕궁) ──────────────────────────
  if (chapter === 2) {
    const bokdeokgongPalaceName = PALACE_NAMES_KR[10] || "복덕궁";
    const prompt2 = buildChapter2Prompt({
      characterTitle: character.title,
      bokdeokgongStars: starResult.bokdeokgongStars,
      bokdeokgongAux: starResult.bokdeokgongAux,
      bokdeokgongBad: starResult.bokdeokgongBad,
      bokdeokgongPalace: bokdeokgongPalaceName,
      mingongStars: starResult.mingongStars,
      birthYear,
    });
    const rawText2 = await callGemini(prompt2);
    function extractSec2(text: string, heading: string): string {
      const pat = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
      const m = text.match(pat);
      return m ? m[1].trim() : "";
    }
    const happinessText = extractSec2(rawText2, "나의 행복 스위치");
    const stressText = extractSec2(rawText2, "스트레스의 진짜 원인");
    const refactoringText = extractSec2(rawText2, "무의식 리팩토링");
    const fullText2 = rawText2 || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({
      palace: {
        bokdeokgong: {
          name: bokdeokgongPalaceName,
          stars: starResult.bokdeokgongStars,
          aux: starResult.bokdeokgongAux,
          bad: starResult.bokdeokgongBad,
          idx: starResult.bokdeokgongIdx,
        },
      },
      chapter2: {
        happiness: happinessText || fullText2,
        stressTrigger: stressText,
        refactoring: refactoringText,
        fullText: fullText2,
      },
    });
  }

  // ── 챕터 1: 내 인생의 주인공 캐릭터 ─────────────────────────────
  const mingongPalaceName = PALACE_NAMES_KR[starResult.mingongIdx] || "명궁";
  const shingongPalaceName = PALACE_NAMES_KR[starResult.shingongIdx] || "신궁";

  // Gemini 호출
  const prompt = buildChapter1Prompt({
    characterTitle: character.title,
    starLabel: character.starLabel,
    mingongStars: starResult.mingongStars,
    shingongStars: starResult.shingongStars,
    mingongPalace: mingongPalaceName,
    shingongPalace: shingongPalaceName,
    birthYear,
    fullChartContext: starResult.fullChartContext,
    sihuaSummary: starResult.sihuaSummary,
  });

  const rawText = await callGemini(prompt);

  // 섹션 파싱
  function extractSection(text: string, heading: string): string {
    const pattern = new RegExp(`##\\s*\\d+\\.\\s*${heading}[^\\n]*\n([\\s\\S]*?)(?=##\\s*\\d+\\.|$)`, "i");
    const m = text.match(pattern);
    return m ? m[1].trim() : "";
  }

  const archetypeText = extractSection(rawText, "영혼의 아키타입");
  const shadowText = extractSection(rawText, "빛과 그림자");
  const personaText = extractSection(rawText, "페르소나 스위칭");
  const fullText = rawText || "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

  return NextResponse.json({
    character: {
      title: character.title,
      subtitle: character.combinedSubtitle,
      emoji: character.emoji,
      starLabel: character.starLabel,
      primaryStar: character.primaryStar,
      secondaryStar: character.secondaryStar,
    },
    palace: {
      mingong: {
        name: mingongPalaceName,
        stars: starResult.mingongStars,
        idx: starResult.mingongIdx,
      },
      shingong: {
        name: shingongPalaceName,
        stars: starResult.shingongStars,
        idx: starResult.shingongIdx,
      },
    },
    chapter1: {
      archetype: archetypeText || fullText,
      shadow: shadowText,
      persona: personaText,
      fullText,
    },
  });
}
