import { NextRequest, NextResponse } from "next/server";
import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";
import { requireRouteAuth } from "@/app/_lib/route-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────
// 베다 점성술 상수
// ─────────────────────────────────────────────────────────────────
const RASHI_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const RASHI_SANSKRIT = ["메샤(Mesha)","브리샤바(Vrishabha)","미투나(Mithuna)","카르카(Karka)","심하(Simha)","칸야(Kanya)","툴라(Tula)","브리쉬치카(Vrischika)","다누(Dhanu)","마카라(Makara)","쿰바(Kumbha)","미나(Meena)"];
const RASHI_KO = ["양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리","천칭자리","전갈자리","궁수자리","염소자리","물병자리","물고기자리"];
const RASHI_EMOJI = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const PLANET_KO: Record<string,string> = { Sun:"태양(Surya)", Moon:"달(Chandra)", Mars:"화성(Mangala)", Mercury:"수성(Budha)", Jupiter:"목성(Guru)", Venus:"금성(Shukra)", Saturn:"토성(Shani)", Rahu:"라후(Rahu)", Ketu:"케투(Ketu)" };

// 27 낙샤트라
const NAKSHATRAS = [
  { name:"Ashwini", lord:"Ketu",    ko:"아쉬위니",     symbol:"말의 머리",      deity:"아쉬빈 쌍둥이" },
  { name:"Bharani", lord:"Venus",   ko:"바라니",       symbol:"요니(자궁)",     deity:"야마(죽음의 신)" },
  { name:"Krittika",lord:"Sun",     ko:"크리티카",     symbol:"면도날",         deity:"아그니(불의 신)" },
  { name:"Rohini",  lord:"Moon",    ko:"로히니",       symbol:"황소 수레바퀴",  deity:"브라흐마" },
  { name:"Mrigashira",lord:"Mars",  ko:"므리가쉬라",   symbol:"사슴 머리",      deity:"소마(달의 신)" },
  { name:"Ardra",   lord:"Rahu",    ko:"아르드라",     symbol:"눈물방울",       deity:"루드라(폭풍신)" },
  { name:"Punarvasu",lord:"Jupiter",ko:"푸나르바수",   symbol:"활과 화살",      deity:"아디티(어머니 신)" },
  { name:"Pushya",  lord:"Saturn",  ko:"푸샤",         symbol:"꽃/젖소 젖",    deity:"브리하스파티" },
  { name:"Ashlesha",lord:"Mercury", ko:"아쉴레샤",     symbol:"뱀",             deity:"나가(뱀 신)" },
  { name:"Magha",   lord:"Ketu",    ko:"마가",         symbol:"왕좌",           deity:"피트리(선조)" },
  { name:"Purva Phalguni",lord:"Venus",ko:"푸르바 팔구니",symbol:"침대 앞 다리", deity:"바가(행운)" },
  { name:"Uttara Phalguni",lord:"Sun",ko:"우타라 팔구니",symbol:"침대 뒷 다리",deity:"아리아만" },
  { name:"Hasta",   lord:"Moon",    ko:"하스타",       symbol:"손",             deity:"사비트리(태양)" },
  { name:"Chitra",  lord:"Mars",    ko:"치트라",       symbol:"빛나는 보석",    deity:"트바쉬트리" },
  { name:"Swati",   lord:"Rahu",    ko:"스와티",       symbol:"칼/바람",        deity:"바유(바람신)" },
  { name:"Vishakha",lord:"Jupiter", ko:"비샤카",       symbol:"개선문",         deity:"인드라-아그니" },
  { name:"Anuradha",lord:"Saturn",  ko:"아누라다",     symbol:"연꽃",           deity:"미트라(우정)" },
  { name:"Jyeshtha",lord:"Mercury", ko:"제쉬타",       symbol:"귀걸이/우산",    deity:"인드라(왕)" },
  { name:"Mula",    lord:"Ketu",    ko:"물라",         symbol:"뿌리 묶음",      deity:"니리티(파괴)" },
  { name:"Purva Ashadha",lord:"Venus",ko:"푸르바 아샤다",symbol:"상아 부채",  deity:"아프(물의 신)" },
  { name:"Uttara Ashadha",lord:"Sun",ko:"우타라 아샤다",symbol:"코끼리 이빨",  deity:"비슈바데바스" },
  { name:"Shravana",lord:"Moon",    ko:"슈라바나",     symbol:"귀",             deity:"비슈누" },
  { name:"Dhanishtha",lord:"Mars",  ko:"다니쉬타",     symbol:"북과 피리",      deity:"아쉬타 바수" },
  { name:"Shatabhisha",lord:"Rahu", ko:"샤타비샤",     symbol:"빈 원",          deity:"바루나(물의 신)" },
  { name:"Purva Bhadrapada",lord:"Jupiter",ko:"푸르바 바드라파다",symbol:"칼 앞부분",deity:"아자 에카파다" },
  { name:"Uttara Bhadrapada",lord:"Saturn",ko:"우타라 바드라파다",symbol:"뒤집힌 다리",deity:"아히 부드냐" },
  { name:"Revati",  lord:"Mercury", ko:"레바티",       symbol:"탬버린",         deity:"푸샨(여행의 신)" },
];

const DASHA_SEQUENCE = [
  { planet:"Ketu", years:7 }, { planet:"Venus", years:20 }, { planet:"Sun", years:6 },
  { planet:"Moon", years:10 }, { planet:"Mars", years:7 }, { planet:"Rahu", years:18 },
  { planet:"Jupiter", years:16 }, { planet:"Saturn", years:19 }, { planet:"Mercury", years:17 },
];

// 고양 / 실추 / 배치
const DIGNITY_MAP: Record<string, { exalt:number; debit:number; own:number[] }> = {
  Sun:     { exalt:0, debit:6,  own:[4] },
  Moon:    { exalt:1, debit:7,  own:[3] },
  Mars:    { exalt:9, debit:3,  own:[0,7] },
  Mercury: { exalt:5, debit:11, own:[2,5] },
  Jupiter: { exalt:3, debit:9,  own:[8,11] },
  Venus:   { exalt:11,debit:5,  own:[1,6] },
  Saturn:  { exalt:6, debit:0,  own:[9,10] },
  Rahu:    { exalt:2, debit:8,  own:[] },
  Ketu:    { exalt:8, debit:2,  own:[] },
};

// ─────────────────────────────────────────────────────────────────
// 천문 계산 유틸
// ─────────────────────────────────────────────────────────────────
const nd = (d: number) => ((d % 360) + 360) % 360;

function julianDay(yr:number, mo:number, dy:number, hr:number): number {
  let y=yr, m=mo;
  if (m<=2){y--;m+=12;}
  const A=Math.floor(y/100);
  const B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+dy+B-1524.5+hr/24;
}

function lahiriAyanamsa(jd: number): number {
  const T = (jd - 2415020.0) / 36524.2198782;
  return ((22.460148 + 1.396468*T + 0.000308*T*T) % 360 + 360) % 360;
}

const BODY_MAP: Record<string, Body> = {
  Sun: Body.Sun, Moon: Body.Moon,
  Mercury: Body.Mercury, Venus: Body.Venus,
  Mars: Body.Mars, Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
};

function tropicalLon(body: Body, date: Date): number {
  const vec = GeoVector(body, date, false);
  const ecl = Ecliptic(vec);
  return nd(ecl.elon);
}

function calcNorthNodeLon(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return nd(125.044555 - 1934.1361849*T + 0.0020754*T*T);
}

function calcSiderealAscendant(jd: number, lat: number, lon: number, ay: number): number {
  const T = (jd - 2451545.0) / 36525;
  const theta0 = nd(280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T*T - T*T*T/38710000);
  const lst = nd(theta0 + lon);
  const eps = 23.4392911 - 0.013004167*T;
  const latR = lat * Math.PI/180;
  const epsR = eps * Math.PI/180;
  const ramcR = lst * Math.PI/180;
  const yv = -Math.cos(ramcR);
  const xv = Math.sin(ramcR)*Math.cos(epsR) + Math.tan(latR)*Math.sin(epsR);
  const tropAsc = nd(Math.atan2(yv,xv)*180/Math.PI);
  return nd(tropAsc - ay);
}

// ★ 역행(Retrograde) 감지 — 1일 전후 열대황경도 비교
function checkRetrogradeVedic(body: Body, date: Date): boolean {
  const prev = new Date(date.getTime() - 86400000);
  const lonPrev = tropicalLon(body, prev);
  const lonCurr = tropicalLon(body, date);
  let delta = lonCurr - lonPrev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

// ─────────────────────────────────────────────────────────────────
// 베다 차트 타입
// ─────────────────────────────────────────────────────────────────
interface VedicPlanet {
  name: string; nameKo: string;
  longitude: number; sign: number; signName: string; signSanskrit: string; signKo: string; signEmoji: string;
  degree: number; house: number; dignity: string; isRetrograde: boolean;
  nakshatra: string; nakshatraKo: string; nakshatraPada: number; nakshatraLord: string;
}
interface DashaPeriod { planet: string; startDate: string; endDate: string; remainYears: number; }
interface VedicChart {
  lagna: { sign:number; signName:string; signSanskrit:string; signKo:string; signEmoji:string; degree:number; };
  planets: Record<string, VedicPlanet>;
  moonNakshatra: typeof NAKSHATRAS[0] & { pada:number; degreeInNak:number; moonSign:string; moonSignKo:string; };
  atmakaraka: { planet:string; nameKo:string; degree:number; sign:string; signKo:string; };
  vimshottariDasha: { current: DashaPeriod; upcoming: DashaPeriod | null; antar: DashaPeriod; };
  yogas: Array<{ name:string; nameKo:string; description:string; planets:string[]; }>;
  d9: Record<string, { sign:number; signName:string; signKo:string; }>;
  d10: Record<string, { sign:number; signName:string; signKo:string; }>;
  ayanamsa: number;
  houseTable: string[];
}

// ─────────────────────────────────────────────────────────────────
// 베다 차트 계산
// ─────────────────────────────────────────────────────────────────
function calcDignity(planet: string, signIdx: number): string {
  const d = DIGNITY_MAP[planet];
  if (!d) return "Neutral";
  if (d.exalt === signIdx) return "Exalted";
  if (d.debit === signIdx) return "Debilitated";
  if (d.own.includes(signIdx)) return "Own Sign";
  return "Neutral";
}

function calcNakshatraInfo(siderealLon: number) {
  const SPAN = 360/27;
  const PADA = SPAN/4;
  const lon = nd(siderealLon);
  const idx = Math.floor(lon/SPAN);
  const degInNak = lon - idx*SPAN;
  const pada = (Math.floor(degInNak/PADA)+1) as 1|2|3|4;
  return { nakshatra: NAKSHATRAS[idx], pada, degreeInNakshatra: degInNak };
}

function calcNavamsa(siderealLon: number): { sign:number; signName:string; signKo:string } {
  const lon = nd(siderealLon);
  const signIdx = Math.floor(lon/30);
  const degInSign = lon % 30;
  const navamsaCount = Math.floor(degInSign / (30/9));
  const isOddSign = [0,2,4,6,8,10].includes(signIdx);
  const baseMap = [0,4,8,0,4,8,0,4,8,0,4,8];
  const base = isOddSign ? [0,4,8] : ([6,10,2] as number[]);
  const baseSign = base[signIdx % 3 >= base.length ? 0 : 0];
  const startSign = [0,8,4,0,8,4,0,8,4,0,8,4][signIdx];
  const navamSign = (startSign + navamsaCount) % 12;
  return { sign:navamSign, signName:RASHI_NAMES[navamSign], signKo:RASHI_KO[navamSign] };
}

function calcDashamsaBasic(siderealLon: number): { sign:number; signName:string; signKo:string } {
  const lon = nd(siderealLon);
  const signIdx = Math.floor(lon/30);
  const degInSign = lon % 30;
  const part = Math.floor(degInSign / 3); // 0-9
  const isOdd = signIdx % 2 === 0;
  const start = isOdd ? signIdx : (signIdx + 9) % 12;
  const d10Sign = (start + part) % 12;
  return { sign:d10Sign, signName:RASHI_NAMES[d10Sign], signKo:RASHI_KO[d10Sign] };
}

function calcVimshottariDasha(moonNakshatra: typeof NAKSHATRAS[0], degreeInNak: number, birthDate: Date) {
  const SPAN = 360/27;
  const elapsedFraction = degreeInNak / SPAN;
  const lordIdx = DASHA_SEQUENCE.findIndex(d => d.planet === moonNakshatra.lord);
  const firstDuration = DASHA_SEQUENCE[lordIdx].years * (1 - elapsedFraction);

  const now = new Date();
  let current: DashaPeriod | null = null;
  let upcoming: DashaPeriod | null = null;
  let currentAntar: DashaPeriod | null = null;

  let cursor = new Date(birthDate);
  let seqIdx = lordIdx;
  for (let i = 0; i < 27; i++) {
    const dur = i === 0 ? firstDuration : DASHA_SEQUENCE[seqIdx % 9].years;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + dur * 365.25 * 86400000);

    if (start <= now && now < end) {
      const remainMs = end.getTime() - now.getTime();
      current = { planet: DASHA_SEQUENCE[seqIdx%9].planet, startDate: start.toISOString().slice(0,10), endDate: end.toISOString().slice(0,10), remainYears: Math.round(remainMs/31557600000*10)/10 };

      // 세운 계산
      const totalDur = dur * 365.25 * 86400000;
      let antarCursor = new Date(start);
      const totalAntarYears = DASHA_SEQUENCE.reduce((s,d)=>s+d.years,0); // 120
      for (let j = 0; j < 9; j++) {
        const antarIdx = (seqIdx + j) % 9;
        const antarDur = (DASHA_SEQUENCE[seqIdx%9].years * DASHA_SEQUENCE[antarIdx].years / 120) * 365.25 * 86400000;
        const antarEnd = new Date(antarCursor.getTime() + antarDur);
        if (antarCursor <= now && now < antarEnd) {
          const rem = antarEnd.getTime() - now.getTime();
          currentAntar = { planet: DASHA_SEQUENCE[antarIdx].planet, startDate: antarCursor.toISOString().slice(0,10), endDate: antarEnd.toISOString().slice(0,10), remainYears: Math.round(rem/2629800000*10)/10 };
          break;
        }
        antarCursor = new Date(antarEnd);
      }
    } else if (start > now && !upcoming && current) {
      upcoming = { planet: DASHA_SEQUENCE[seqIdx%9].planet, startDate: start.toISOString().slice(0,10), endDate: end.toISOString().slice(0,10), remainYears: Math.round((end.getTime()-start.getTime())/31557600000*10)/10 };
      break;
    }

    cursor = new Date(end);
    if (i > 0) seqIdx = (seqIdx + 1) % 9;
    else seqIdx = (seqIdx + 1) % 9;
  }
  return { current: current!, upcoming, antar: currentAntar! };
}

function detectYogas(planets: Record<string, VedicPlanet>, lagnaSign: number): Array<{name:string; nameKo:string; description:string; planets:string[]}> {
  const yogas = [];
  const getSign = (p:string) => planets[p]?.sign ?? -1;
  const getHouse = (p:string) => planets[p]?.house ?? -1;

  const moonSign = getSign("Moon");
  const jupHouse = getHouse("Jupiter");
  const kendras = [1,4,7,10];

  // Gaja Kesari: Jupiter in kendra from Moon
  if (moonSign >= 0 && jupHouse >= 0) {
    const moonH = planets["Moon"]?.house ?? 0;
    const diff = Math.abs(jupHouse - moonH);
    const kendra = [0,3,6,9].includes(diff) || [0,3,6,9].includes(12-diff);
    if (kendra) {
      yogas.push({ name:"Gaja Kesari Yoga", nameKo:"가자 케사리 요가", description:"목성이 달로부터 케드라(1·4·7·10하우스)에 위치할 때 형성. 지혜·명성·권위·사회적 존경을 부여하는 왕족적 요가. 인생 후반부로 갈수록 권위가 높아지고 지역사회에서 신뢰를 받게 됨.", planets:["Jupiter","Moon"] });
    }
  }

  // Pancha Mahapurusha Yogas
  const mahapurusha = [
    { planet:"Mars",    sign:[0,9], name:"Ruchaka", nameKo:"루차카 요가", desc:"화성의 강한 위치에서 형성. 강인한 체력, 용기, 리더십, 군사적 능력과 경쟁에서의 승리를 상징." },
    { planet:"Mercury", sign:[2,5], name:"Bhadra",  nameKo:"바드라 요가", desc:"수성의 강한 위치에서 형성. 탁월한 지성, 언변, 사업 수완과 학문적 성취를 상징." },
    { planet:"Jupiter", sign:[3,8], name:"Hamsa",   nameKo:"함사 요가",  desc:"목성의 강한 위치에서 형성. 깊은 영성, 도덕적 권위, 진정한 부와 지혜를 상징." },
    { planet:"Venus",   sign:[1,6], name:"Malavya", nameKo:"말라비야 요가",desc:"금성의 강한 위치에서 형성. 아름다운 외모, 예술적 재능, 물질적 풍요와 연애운을 상징." },
    { planet:"Saturn",  sign:[6,9], name:"Sasha",   nameKo:"샤샤 요가",  desc:"토성의 강한 위치에서 형성. 강인한 인내, 장수, 카르마 해결 능력과 삶의 지혜를 상징." },
  ];
  for (const mp of mahapurusha) {
    const pl = planets[mp.planet];
    if (pl && mp.sign.includes(pl.sign) && kendras.includes(pl.house)) {
      yogas.push({ name:mp.name+" Yoga", nameKo:mp.nameKo, description:mp.desc, planets:[mp.planet] });
    }
  }

  // Dhana Yoga: 2nd lord or 11th lord in 2nd or 11th, or 2+11 lords conjoined
  const house2Lord = getRashiLord((lagnaSign+1)%12);
  const house11Lord = getRashiLord((lagnaSign+10)%12);
  const h2LordHouse = getHouse(house2Lord);
  const h11LordHouse = getHouse(house11Lord);
  if ([2,11].includes(h2LordHouse) || [2,11].includes(h11LordHouse)) {
    yogas.push({ name:"Dhana Yoga", nameKo:"다나 요가", description:"2하우스(자산)와 11하우스(이익)의 지배성이 유리하게 배치되어 재물이 자연스럽게 모이는 요가. 적절한 시기에 노력하면 물질적 번영이 따라옴.", planets:[house2Lord, house11Lord] });
  }

  // Raja Yoga: 1·4·5·7·9·10 켄드라-트리코나 연결
  const kendraLords = [1,4,7,10].map(h => getRashiLord((lagnaSign + h - 1)%12));
  const trikonaLords = [1,5,9].map(h => getRashiLord((lagnaSign + h - 1)%12));
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue; // 동일 행성 제외
      const klH = getHouse(kl), tlH = getHouse(tl);
      if (klH > 0 && tlH > 0 && [...kendras,...[5,9]].includes(klH)) {
        yogas.push({ name:"Raja Yoga", nameKo:"라자 요가", description:`켄드라(${kl})와 트리코나(${tl}) 지배성의 연결로 형성되는 왕적 요가. 사회적 권위, 성공, 영예을 부여함.`, planets:[kl,tl] });
        break;
      }
    }
  }

  // Viparita Raja Yoga: 6,8,12 lord in 6,8,12
  const dusthanaLords = [6,8,12].map(h => getRashiLord((lagnaSign + h - 1)%12));
  const dusthanaHouses = [6,8,12];
  let viparCount = 0;
  for (const dl of dusthanaLords) {
    if (dusthanaHouses.includes(getHouse(dl))) viparCount++;
  }
  if (viparCount >= 2) {
    yogas.push({ name:"Viparita Raja Yoga", nameKo:"비파리타 라자 요가", description:"역경의 행성들이 역경의 집에 머물러 역설적으로 강한 힘을 발휘함. 위기를 기회로 전환하는 능력과 극적인 역전을 상징.", planets:dusthanaLords });
  }

  // Budha-Aditya: Sun + Mercury same sign
  if (getSign("Sun") === getSign("Mercury")) {
    yogas.push({ name:"Budha-Aditya Yoga", nameKo:"부다-아디티야 요가", description:"태양과 수성이 같은 별자리에 위치. 탁월한 지성, 명민한 판단력, 행정적 능력과 소통 능력이 뛰어남.", planets:["Sun","Mercury"] });
  }

  return yogas.slice(0,6); // 최대 6개
}

function getRashiLord(signIdx: number): string {
  const lords = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
  return lords[((signIdx%12)+12)%12];
}

function buildVedicChart(year:number, month:number, day:number, hour:number, minute:number, tz:number, lat:number, lon:number): VedicChart {
  const utcHour = hour + minute/60 - tz;
  const date = new Date(Date.UTC(year, month-1, day, Math.floor(utcHour), Math.round(((utcHour%1)+1)%1*60), 0));
  const jd = julianDay(year, month, day, utcHour);
  const ay = lahiriAyanamsa(jd);

  // 행성 황경 (사이드리얼)
  const sidLons: Record<string, number> = {};
  for (const [pName, body] of Object.entries(BODY_MAP)) {
    sidLons[pName] = nd(tropicalLon(body, date) - ay);
  }
  const rahuTrop = calcNorthNodeLon(jd);
  sidLons["Rahu"] = nd(rahuTrop - ay);
  sidLons["Ketu"] = nd(sidLons["Rahu"] + 180);

  const lagnaLon = calcSiderealAscendant(jd, lat, lon, ay);
  const lagnaSign = Math.floor(nd(lagnaLon) / 30);
  const lagnaDeg = nd(lagnaLon) % 30;

  // 행성 상세 정보
  const planets: Record<string, VedicPlanet> = {};
  for (const pName of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]) {
    const pLon = sidLons[pName];
    const pSignIdx = Math.floor(nd(pLon)/30);
    const pDeg = nd(pLon) % 30;
    const house = ((pSignIdx - lagnaSign + 12) % 12) + 1;
    const nak = calcNakshatraInfo(pLon);
    planets[pName] = {
      name: pName, nameKo: PLANET_KO[pName] ?? pName,
      longitude: Math.round(pLon*10)/10, sign: pSignIdx,
      signName: RASHI_NAMES[pSignIdx], signSanskrit: RASHI_SANSKRIT[pSignIdx],
      signKo: RASHI_KO[pSignIdx], signEmoji: RASHI_EMOJI[pSignIdx],
      degree: Math.round(pDeg*10)/10, house, dignity: calcDignity(pName, pSignIdx),
      isRetrograde: BODY_MAP[pName] ? checkRetrogradeVedic(BODY_MAP[pName], date) : false,
      nakshatra: nak.nakshatra.name, nakshatraKo: nak.nakshatra.ko,
      nakshatraPada: nak.pada, nakshatraLord: nak.nakshatra.lord,
    };
  }

  // 달의 낙샤트라
  const moonNakInfo = calcNakshatraInfo(sidLons["Moon"]);
  const moonSignIdx = Math.floor(nd(sidLons["Moon"])/30);

  // Atmakaraka: 도수가 가장 높은 행성 (Rahu/Ketu 제외)
  const chara = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  let akPlanet = "Sun", akDeg = 0;
  for (const p of chara) {
    if ((planets[p]?.degree ?? 0) > akDeg) { akDeg = planets[p].degree; akPlanet = p; }
  }

  // 다샤 계산
  const birthDateObj = new Date(Date.UTC(year, month-1, day, Math.floor(utcHour)));
  const dasha = calcVimshottariDasha(moonNakInfo.nakshatra, moonNakInfo.degreeInNakshatra, birthDateObj);

  // 요가 검출
  const yogas = detectYogas(planets, lagnaSign);

  // 나밤샤 (D9), 다샴샤 (D10)
  const d9: Record<string, {sign:number;signName:string;signKo:string}> = {};
  const d10: Record<string, {sign:number;signName:string;signKo:string}> = {};
  for (const pName of Object.keys(planets)) {
    d9[pName] = calcNavamsa(sidLons[pName]);
    d10[pName] = calcDashamsaBasic(sidLons[pName]);
  }

  // 하우스 테이블
  const houseTable: string[] = [];
  for (let h = 1; h <= 12; h++) {
    const hSign = (lagnaSign + h - 1) % 12;
    const pInH = Object.entries(planets).filter(([,v])=>v.house===h).map(([k])=>k);
    houseTable.push(`H${h}(${RASHI_SANSKRIT[hSign]}): ${pInH.join(",")||"비어있음"}`);
  }

  return {
    lagna: { sign:lagnaSign, signName:RASHI_NAMES[lagnaSign], signSanskrit:RASHI_SANSKRIT[lagnaSign], signKo:RASHI_KO[lagnaSign], signEmoji:RASHI_EMOJI[lagnaSign], degree:Math.round(lagnaDeg*10)/10 },
    planets,
    moonNakshatra: { ...moonNakInfo.nakshatra, pada:moonNakInfo.pada, degreeInNak:moonNakInfo.degreeInNakshatra, moonSign:RASHI_NAMES[moonSignIdx], moonSignKo:RASHI_KO[moonSignIdx] },
    atmakaraka: { planet:akPlanet, nameKo:PLANET_KO[akPlanet]??akPlanet, degree:akDeg, sign:planets[akPlanet]?.signName??"", signKo:planets[akPlanet]?.signKo??"" },
    vimshottariDasha: dasha,
    yogas,
    d9, d10,
    ayanamsa: Math.round(ay*1000)/1000,
    houseTable,
  };
}

function applySwissCoreToChart(chart: VedicChart, swiss: { planets?: Record<string, number>; ascendantSidereal?: number | null; ayanamsa?: number | null }) {
  const planets = swiss?.planets || {};
  const ascLon = typeof swiss?.ascendantSidereal === "number" ? nd(swiss.ascendantSidereal) : NaN;
  const lagnaSign = Number.isFinite(ascLon) ? Math.floor(ascLon / 30) : chart.lagna.sign;

  if (Number.isFinite(ascLon)) {
    chart.lagna = {
      sign: lagnaSign,
      signName: RASHI_NAMES[lagnaSign],
      signSanskrit: RASHI_SANSKRIT[lagnaSign],
      signKo: RASHI_KO[lagnaSign],
      signEmoji: RASHI_EMOJI[lagnaSign],
      degree: Math.round((ascLon % 30) * 10) / 10,
    };
  }

  for (const pName of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) {
    if (!Number.isFinite(Number(planets[pName]))) continue;
    const pLon = nd(Number(planets[pName]));
    const pSignIdx = Math.floor(pLon / 30);
    const pDeg = pLon % 30;
    const house = ((pSignIdx - lagnaSign + 12) % 12) + 1;
    const nak = calcNakshatraInfo(pLon);
    chart.planets[pName] = {
      ...chart.planets[pName],
      name: pName,
      nameKo: PLANET_KO[pName] ?? pName,
      longitude: Math.round(pLon * 10) / 10,
      sign: pSignIdx,
      signName: RASHI_NAMES[pSignIdx],
      signSanskrit: RASHI_SANSKRIT[pSignIdx],
      signKo: RASHI_KO[pSignIdx],
      signEmoji: RASHI_EMOJI[pSignIdx],
      degree: Math.round(pDeg * 10) / 10,
      house,
      dignity: calcDignity(pName, pSignIdx),
      isRetrograde: chart.planets[pName]?.isRetrograde ?? false,
      nakshatra: nak.nakshatra.name,
      nakshatraKo: nak.nakshatra.ko,
      nakshatraPada: nak.pada,
      nakshatraLord: nak.nakshatra.lord,
    };
  }

  const moon = chart.planets.Moon;
  if (moon) {
    const moonNak = calcNakshatraInfo(moon.longitude);
    chart.moonNakshatra = {
      ...moonNak.nakshatra,
      pada: moonNak.pada,
      degreeInNak: Math.round(moonNak.degreeInNakshatra * 100) / 100,
      moonSign: moon.signName,
      moonSignKo: moon.signKo,
    };
  }

  if (Number.isFinite(Number(swiss?.ayanamsa))) {
    chart.ayanamsa = Number(swiss.ayanamsa);
  }

  return chart;
}

// ─────────────────────────────────────────────────────────────────
// 챕터 메타
// ─────────────────────────────────────────────────────────────────
export const VEDIC_CHAPTER_META = [
  { num:1,  title:"프롤로그 — 카르마 블루프린트 소개", subtitle:"베다 점성술 리포트 사용 가이드",       icon:"📜" },
  { num:2,  title:"라그나와 영혼의 목적", subtitle:"Lagna & Atmakaraka",       icon:"🕉️" },
  { num:3,  title:"나크샤트라 — 무의식의 27가지 빛", subtitle:"Moon Nakshatra 심층 분석", icon:"🌙" },
  { num:4,  title:"다샤 — 인생의 웅장한 계절",   subtitle:"Vimshottari Dasha 전략",            icon:"⏳" },
  { num:5,  title:"부와 번영의 정렬",            subtitle:"Artha & 2·11하우스 다나 요가",       icon:"💰" },
  { num:6,  title:"카르마와 천직",               subtitle:"Dharma & 10하우스 · D9 · D10",      icon:"👑" },
  { num:7,  title:"나밤샤 — 영혼의 성숙도",       subtitle:"D9 숨겨진 잠재력",                  icon:"💎" },
  { num:8,  title:"관계의 거울 — 아슈타 쿠타",   subtitle:"Ashta Koota 궁합 분석",             icon:"🔮" },
  { num:9,  title:"인연의 깊이와 카르믹 계약",   subtitle:"7하우스 · 금성/화성",               icon:"💞" },
  { num:10, title:"생명력과 정화",               subtitle:"Health 6·8·12하우스 · 아유르베다",  icon:"🌿" },
  { num:11, title:"요가 — 특별한 축복의 조합",   subtitle:"차트의 천부적 재능과 치트키",        icon:"✨" },
  { num:12, title:"우파야 — 운명을 바꾸는 실천", subtitle:"행성 에너지 정화 비책",             icon:"🙏" },
  { num:13, title:"고차라와 올해의 행동 전략",   subtitle:"Transit & Annual Strategy",          icon:"🪐" },
  { num:14, title:"마스터플랜 — 카르마를 넘어선 자유", subtitle:"총결산 & 북극성 선언",         icon:"🌟" },
];

// ─────────────────────────────────────────────────────────────────
// Gemini API
// ─────────────────────────────────────────────────────────────────
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
function pickKeys() {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
  ].map(v=>String(v||"").trim()).filter(Boolean);
}

let geminiKeyCursor = 0;

function rotateGeminiKeys(keys: string[], seed = 0): string[] {
  if (!keys.length) return [];
  const len = keys.length;
  const base = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  const start = ((geminiKeyCursor + base) % len + len) % len;
  geminiKeyCursor = (start + 1) % len;
  return [...keys.slice(start), ...keys.slice(0, start)];
}
function pickModels() { return ["gemini-2.5-flash","gemini-2.0-flash","gemini-2.0-flash-lite"]; }
function parseText(p: unknown): string {
  const pp = p as {candidates?:{content?:{parts?:{text?:string}[]}}[]};
  for (const c of pp?.candidates??[]) for (const pt of c?.content?.parts??[]) if (pt?.text?.trim()) return pt.text.trim();
  return "";
}
async function callGemini(prompt: string): Promise<string> {
  // ─── Vertex AI 우선 시도 ──────────────────────────────────────
  try {
    const vtxt = await callVertexGemini(prompt, { temperature: 0.92, maxOutputTokens: 16384 });
    if (vtxt) return vtxt;
  } catch { /* Vertex 실패 → API 키 폴백 */ }

  // ─── GEMINI API 키 폴백 ──────────────────────────────────────
  const keys = pickKeys(); const models = pickModels();
  if (!keys.length) return "";
  const distributedKeys = rotateGeminiKeys(keys, prompt.length);
  let attempts = 0;
  const maxAttempts = 8;
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  for (const model of models) {
    if (attempts >= maxAttempts) break;
    for (const key of distributedKeys) {
      if (attempts >= maxAttempts) break;
      attempts += 1;
    try {
      const res = await fetch(GEMINI_URL.replace("{model}",model)+`?key=${key}`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.92,maxOutputTokens:16384,topK:40,topP:0.95} }), signal:AbortSignal.timeout(45_000) });
      if (!res.ok) {
        const retriableStatus = [408, 429, 500, 502, 503, 504];
        if (retriableStatus.includes(Number(res.status))) {
          await wait(Math.min(1000 * attempts, 4000));
        }
        continue;
      }
      const data = await res.json(); const text = parseText(data);
      if (text) return text;
    } catch {
      await wait(Math.min(1000 * attempts, 4000));
      /* next */
    }
    }
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────
// 프롬프트 사전 포맷터
// ─────────────────────────────────────────────────────────────────
function baseData(c: VedicChart): string {
  const p = c.planets;
  const fmt = (n:string) => {
    const pl = p[n]; if (!pl) return "";
    const rx = pl.isRetrograde ? " ℞(역행)" : "";
    return `▸ ${pl.nameKo}${rx}: ${pl.signEmoji}${pl.signSanskrit} ${pl.degree}° / ${pl.house}하우스 / ${pl.nakshatraKo} pada${pl.nakshatraPada} (${pl.dignity})`;
  };
  return `[베다 점성술 출생 차트 — Lahiri 사이드리얼 기준, 아야남샤 ${c.ayanamsa}°]
▸ 라그나(Lagna): ${c.lagna.signEmoji}${c.lagna.signSanskrit} ${c.lagna.degree}°
▸ 아트마카라카(Atmakaraka): ${c.atmakaraka.nameKo} (${c.atmakaraka.degree}° in ${c.atmakaraka.signKo})
▸ 달 낙샤트라: ${c.moonNakshatra.ko}(${c.moonNakshatra.name}) / ${c.moonNakshatra.moonSignKo} / pada ${c.moonNakshatra.pada}
▸ 현재 대운: ${c.vimshottariDasha.current?.planet??"-"} 대운 (종료: ${c.vimshottariDasha.current?.endDate??"-"}, 잔여 ${c.vimshottariDasha.current?.remainYears??"-"}년)
▸ 현재 세운: ${c.vimshottariDasha.antar?.planet??"-"} 세운 (종료: ${c.vimshottariDasha.antar?.endDate??"-"})
${fmt("Sun")}
${fmt("Moon")}
${fmt("Mars")}
${fmt("Mercury")}
${fmt("Jupiter")}
${fmt("Venus")}
${fmt("Saturn")}
${fmt("Rahu")}
${fmt("Ketu")}
▸ 하우스 배치: ${c.houseTable.join(" | ")}
▸ 검출된 요가: ${c.yogas.map(y=>y.nameKo).join(", ")||"없음"}`;
}

const STYLE_GUIDE = `[작성 지침]
■ 너는 인도 베다 철학·주티쉬(Jyotish)·아유르베다·현대 심리학을 통합한 세계 최고 수준의 베다 점성술 마스터다.
■ 산스크리트 원어(예: Dharma, Karma, Upaya, Nakshatra 등)를 한글 설명과 병기하여 사용한다.
■ 분량: 5,000자 이상 (각 섹션 ## 제목 포함)
■ 구조: ## 섹션 제목 형식으로 4~6섹션 구분
■ 금지: 미신·부적·무당, 단순 길흉 나열, 비과학적 예언
■ 필수: 카르마 관점의 심리학적 통찰 + 실생활 개운법(Upaya) + 과학적 근거`;

// ─────────────────────────────────────────────────────────────────
// 12챕터 프롬프트 빌더
// ─────────────────────────────────────────────────────────────────
function buildPrompt(ch: number, c: VedicChart, reportType: "personal" | "compatibility" = "personal", body?: Record<string, unknown>): string {
  const bd = baseData(c);
  const p = c.planets;
  const lagna = c.lagna;

  switch (ch) {
    case 1: {
      const userName = String(body?.name || "사용자");
      const partnerName = String(body?.partnerName || "상대");
      const isCompat = reportType === "compatibility";
      return `${bd}

    [챕터 1 — 프롤로그: 카르마 블루프린트 소개 작성 지시]
    너는 베다 점성술(Jyotish) 마스터다. 이 챕터는 예언문이 아니라 "리포트 안내서"여야 한다.

    ## 1. 베다 점성술(Jyotish)의 의미
    베다 점성술이 무엇이며, 왜 라그나(Lagna), 나크샤트라(Nakshatra), 다샤(Dasha)가 핵심 축인지 쉬운 한국어로 설명하라.

    ## 2. 이 리포트를 읽는 법
    이 리포트가 "운명 판결문"이 아니라 "자기 이해와 선택 전략 도구"임을 분명히 하고, 각 챕터를 어떻게 활용하면 좋을지 사용법을 안내하라.

    ## 3. 사용자 차트 핵심 요약
    ${userName}의 라그나, 달 나크샤트라, 아트마카라카, 현재 다샤를 연결해 이번 생의 큰 테마를 요약하라.

    ## 4. 현재 인생 주기의 분위기
    현재 Maha/Antar Dasha 기반으로 "지금은 확장기/정리기/수성기 중 어디에 가까운지"를 설명하고, 당장 피해야 할 무리수 3가지를 제시하라.

    ## 5. 시작 선언문
    챕터 2 이후를 읽기 전 마음가짐 5문장을 제시하라. 공포 조장 없이 실천 중심으로 작성하라.

    ${isCompat ? `
    [궁합 모드 추가 지시]
    - 대상: ${userName} vs ${partnerName}
    - 점수가 낮아도 단정/파국 표현 금지.
    - 궁합은 판결문이 아니라 관계 사용설명서라는 톤을 유지하라.
    ` : ""}

${STYLE_GUIDE}`;
    }

    case 2: {
      const lagnaLord = getRashiLord(lagna.sign);
      const llPos = p[lagnaLord];
      const atma = c.atmakaraka;
      return `${bd}

    [챕터 2 — 라그나(Lagna)와 영혼의 목적 작성 지시]
    너는 인도 베다 철학과 현대 심리학을 통합한 주티쉬(Jyotish) 마스터다.

    ## 1. 라그나가 보여주는 외적 삶의 방향
    라그나 ${lagna.signSanskrit}(${lagna.signKo})의 원소/성질을 근거로 사용자가 세상과 관계 맺는 방식, 첫인상, 행동 패턴을 설명하라.

    ## 2. 라그나 별자리와 하우스 해석
    라그나 별자리 의미와 1하우스 중심 테마를 실제 삶(일/관계/자기표현)에 연결해 구체적으로 해석하라.

    ## 3. 라그나 로드의 위치와 인생 운영 방식
    라그나 로드 ${llPos?.nameKo ?? lagnaLord}가 ${llPos?.signSanskrit ?? "정보 없음"} ${llPos?.house ?? "정보 없음"}하우스에 위치한 의미를 분석하라.
    이 배치가 인생의 우선순위와 성취 방식에 어떻게 작동하는지 설명하라.

    ## 4. 아트마카라카가 의미하는 영혼의 숙제
    아트마카라카 ${atma.nameKo}(${atma.signKo})를 중심으로 이번 생에서 반복되는 카르마 패턴과 반드시 성숙해야 할 과제를 분석하라.

    ## 5. 잠재력 활성화 루틴과 오늘부터 실천할 3가지
    아침 루틴(호흡/명상/기록/행동)을 제시하고, 영혼의 목적을 현실에서 실현하는 실행 전략을 작성하라.
    마지막에는 반드시 "오늘부터 실천할 3가지"를 체크리스트로 제시하라.

${STYLE_GUIDE}`;
    }

    case 3: {
      const nak = c.moonNakshatra;
      return `${bd}

[챕터 3 — 나크샤트라(Nakshatra) 심층 분석 작성 지시]
27나크샤트라 중 ${nak.ko}(${nak.name})에서 태어난 사용자의 무의식적 본능을 분석하라.

## 1. ${nak.ko} 나크샤트라의 신화적 세계
수호신(${nak.deity})과 상징(${nak.symbol})의 신화적 배경을 깊이 설명하라. 이 나크샤트라가 인류 집단 무의식에서 어떤 원형(Archetype)을 담당하는가?

## 2. 무의식적 반응 패턴 진단
${nak.ko} pada ${nak.pada}에서 태어난 사람의 심리적 특성, 감정적 반응 패턴, 결핍과 트리거를 분석하라.

## 3. 감정적 결핍의 뿌리와 방어기제
이 나크샤트라가 만들어내는 무의식적 결핍(Shadow)과 방어기제가 대인관계·커리어·건강에 미치는 영향을 분석하라.

## 4. 만트라 명상 + 네빌식 심상화 루틴
${nak.ko} 에너지에 맞춘 아침·저녁 명상 루틴과 감정 정렬 루틴을 단계별로 작성하라.

## 5. 마음이 안정되는 조건과 실천 3가지
정서 안정 조건, 상처받을 때 반복 행동, 오늘부터 실천할 3가지를 체크리스트로 제시하라.

${STYLE_GUIDE}`;
    }

    case 4: {
      const md = c.vimshottariDasha;
      return `${bd}

[챕터 3 — 빔쇼타리 다샤(Vimshottari Dasha) 전략 작성 지시]
현재 ${md.current?.planet??"-"} 대운 / ${md.antar?.planet??"-"} 세운을 분석하라.

## 1. 현재 다샤의 계절 — ${md.current?.planet??"-"} 대운의 본질
${md.current?.planet??"-"} 행성이 지배하는 이 시기의 핵심 테마를 분석하라. 씨를 뿌릴 때인가, 수확할 때인가, 아니면 수성(守成)의 겨울인가?

## 2. ${md.antar?.planet??"-"} 세운의 미시 전략 (종료: ${md.antar?.endDate??"-"})
현재 세운 행성의 특성에 따른 1년 단위 구체적 전략을 제시하라.

## 3. 다샤 전환점 — 다음 대운 준비
다음 대운(${md.upcoming?.planet??"-"})이 시작되는 ${md.upcoming?.startDate??"-"}을 앞두고, 지금 준비해야 할 핵심 과제를 상세히 분석하라.

## 4. 10년·1년 단위 거시 전략 타임라인
행성의 특성에 따른 거시적 인생 전략과 각 다샤 시기를 최대한 활용하는 타임라인 전략 보고서를 5,000자로 작성하라.

## 5. 시간 개운법 — 액운을 피하는 다샤 달력
현재 다샤 흉기(凶期)를 피하는 행동 지침과, 길기(吉期)에 실행해야 할 중요 결정 목록을 구체적으로 제시하라.

${STYLE_GUIDE}`;
    }

    case 5: {
      const h2lord = getRashiLord((lagna.sign+1)%12);
      const h11lord = getRashiLord((lagna.sign+10)%12);
      const jup = p["Jupiter"], ven = p["Venus"];
      return `${bd}

[챕터 4 — 부와 번영의 정렬 (Artha) 작성 지시]
2하우스(자산), 11하우스(이익), 목성·금성을 분석하라.

## 1. 다나 요가(Dhana Yoga) 진단
차트에 형성된 재물 요가(${c.yogas.filter(y=>y.nameKo.includes("다나")).map(y=>y.nameKo).join(",")||"잠재적 요가"})를 분석하라. 2하우스 지배성(${h2lord})과 11하우스 지배성(${h11lord})의 배치가 재물 창출에 미치는 영향을 진단하라.

## 2. 목성(${jup?.signSanskrit??""})과 금성(${ven?.signSanskrit??""})의 재물 신호
베다 점성술에서 재물의 핵심 지표성인 목성(Guru/Brihaspati)과 금성(Shukra)의 현재 상태를 분석하라.

## 3. 돈에 대한 무의식적 패턴
2하우스 에너지와 행동경제학을 결합해 이 사람이 돈을 버는 방식과 지출의 무의식적 패턴을 진단하라.

## 4. 재물운을 가로막는 기질적 장애물 제거
아유르베다 체질(Dosha)과 연계하여 재물 흐름을 방해하는 자아 패턴을 찾아내고 치유 전략을 제시하라.

## 5. 자산 운용 마인드셋 & 실행 플랜
이 차트에 최적화된 수입 창출 방식, 투자 전략, 재물 개운법(색상/만트라/봉사)을 5,000자 이상 상세히 제시하라.

${STYLE_GUIDE}`;
    }

    case 6: {
      const h10lord = getRashiLord((lagna.sign+9)%12);
      const d10sun = c.d10["Sun"];
      return `${bd}

[챕터 5 — 카르마와 천직 (Dharma & Career) 작성 지시]
10하우스, 나밤샤(D9), 다샴샤(D10)를 교차 분석하라.

## 1. 10하우스(카르마 스타나)의 비밀
10하우스 지배성(${h10lord})의 배치를 분석하라. 이 사람이 사회에서 어떤 역할을 통해 최고의 잠재력을 발휘하는가?

## 2. D10(다샴샤) 차트 — 직업 운명의 정밀 진단
다샴샤 차트에서 태양 위치(${d10sun?.signKo??""})를 중심으로 직업적 성취의 신호를 분석하라.

## 3. 천직(Dharma) 발견 공식
단순한 직업 추천을 넘어, 이 차트 주인이 사회적 권위와 명예를 얻는 메커니즘을 분석하라. 어떤 분야에서 이 사람이 자연스럽게 권위자로 대우받는가?

## 4. 조직 내 생존 전략과 리더십 스타일
이 행성 배치에서 나타나는 직장 생존법, 리더십 스타일, 상하관계 전략을 행동과학 관점에서 분석하라.

## 5. 커리어 위기를 기회로 — 오피스 개운법
커리어의 위기를 기회로 전환하는 처세술과, 10하우스 에너지를 극대화하는 구체적인 직업 개운법을 5,000자 분량의 전문 컨설팅 리포트로 작성하라.

${STYLE_GUIDE}`;
    }

    case 7: {
      const d9moon = c.d9["Moon"], d9asc = c.d9["Sun"];
      return `${bd}

[챕터 6 — 나밤샤(Navamsa, D9) 심층 분석 작성 지시]

## 1. 나밤샤 차트의 비밀 — 영혼의 진짜 힘
D1(기본 차트)과 D9(나밤샤)의 차이를 설명하고, D9가 보여주는 영혼의 진짜 저력을 분석하라. 달의 D9 위치(${d9moon?.signKo??""})가 의미하는 내면의 감정적 성숙도를 분석하라.

## 2. 중년 이후의 运命的 전환
나밤샤 차트는 인생 전반기보다 후반기에 더 강하게 발현됨을 설명하고, 이 배치에서 나이 들수록 진정한 재능이 어떻게 꽃필지 분석하라.

## 3. 현재의 시련이 영혼을 단련하는 방식
D9가 보여주는 영혼의 최종 형태에 도달하기 위해 지금 통과하는 시련의 의미를 분석하라.

## 4. 숨겨진 재능 발굴 지도
D9 배치에서 찾을 수 있는 진정한 재능·창의성·영성을 발굴하는 구체적 방법을 5,000자 이상 작성하라.

## 5. 내면의 보석 정화 루틴
나밤샤 에너지를 활성화하는 명상·요가·만트라 루틴을 상세히 설계하라.

${STYLE_GUIDE}`;
    }

    case 8: {
      const moonNak = c.moonNakshatra;
      return `${bd}

[챕터 7 — 아슈타 쿠타(Ashta Koota) 궁합 분석 작성 지시]
달 나크샤트라를 기반으로 한 8가지 베다 궁합 지표를 분석하라.

## 1. 아슈타 쿠타 8항목 해설
베다 궁합의 8가지 척도(Varna·Vashya·Tara·Yoni·Graha Maitri·Gana·Rashi·Nadi)를 ${moonNak.ko}(${moonNak.name}) 나크샤트라 기준으로 분석하라. 36점 만점 체계에서 각 항목의 의미와 가장 조화로운 나크샤트라를 설명하라.

## 2. ${moonNak.ko}의 심리적 주파수
이 나크샤트라가 방출하는 심리적 주파수가 다른 나크샤트라와 공명하거나 충돌하는 원리를 심리학적으로 분석하라.

## 3. 관계 갈등의 패턴 진단
${moonNak.ko} 의 Gana(가나: 신性/인간性/악마性)와 Nadi(나디: 체질 궁합) 특성이 관계에서 유발하는 반복적 갈등 패턴을 분석하라.

## 4. 비폭력 대화법 적용 가이드
갈등을 해소하는 NVC(마셜 로젠버그의 비폭력 대화법)와 베다 점성술을 통합한 관계 치유 전략을 5,000자로 제안하라.

## 5. 이상적인 파트너 나크샤트라 조건
${moonNak.ko}과 최고로 조화로운 나크샤트라와 그 이유, 그리고 관계에서 실제로 적용 가능한 소통 루틴을 제시하라.

${STYLE_GUIDE}`;
    }

    case 9: {
      const h7lord = getRashiLord((lagna.sign+6)%12);
      const venus = p["Venus"], mars = p["Mars"];
      return `${bd}

[챕터 8 — 인연과 카르믹 계약 작성 지시]
7하우스, 금성(${venus?.signSanskrit??""} ${venus?.house??0}하우스), 화성(${mars?.signSanskrit??""} ${mars?.house??0}하우스)을 분석하라.

## 1. 인연의 색깔 — 7하우스가 그리는 파트너의 초상
7하우스 지배성(${h7lord})의 배치와 7하우스의 행성(${c.houseTable[6]})이 암시하는 인연의 형태를 분석하라.

## 2. 연애 패턴의 카르믹 뿌리
금성(Shukra)과 화성(Mangala)의 현재 배치에서 반복되는 연애 실패의 카르마적 원인을 찾아라.

## 3. 나를 끌어당기는 무의식의 필터
어떤 유형의 사람에게 자꾸 끌리는지, 그 무의식적 매력 필터의 심리학적 구조를 분석하라.

## 4. 자존감 회복 훈련 & 바운더리 설정법
좋은 파트너를 끌어당기기 위한 자존감 회복 워크샵 커리큘럼과 건강한 경계선 설정법을 5,000자로 작성하라.

## 5. 카르믹 인연을 성숙한 사랑으로 발전시키는 법
연애→파트너십→영적 동반자로 발전시키는 단계별 실천 지침을 제시하라.

${STYLE_GUIDE}`;
    }

    case 10: {
      const h6lord = getRashiLord((lagna.sign+5)%12);
      const h8lord = getRashiLord((lagna.sign+7)%12);
      const h12lord = getRashiLord((lagna.sign+11)%12);
      const saturn = p["Saturn"];
      return `${bd}

[챕터 9 — 생명력과 정화 작성 지시]
6하우스(질병), 8하우스(사고·수술), 12하우스(입원·손실)와 아유르베다를 연계 분석하라.

## 1. 체질적 약점 진단 — 아유르베다 도샤
라그나·달·태양의 배치를 아유르베다의 세 도샤(Vata·Pitta·Kapha)와 연계해 이 사람의 체질적 약점을 정밀 진단하라.

## 2. 6하우스의 건강 경고 신호
6하우스 지배성(${h6lord})이 암시하는 잠재적 건강 취약성과 예방 전략을 제시하라.

## 3. 8·12하우스의 에너지 정체 구간
8하우스(${h8lord})와 12하우스(${h12lord})의 흐름을 분석하고, 독소 축적과 에너지 고갈이 발생하는 시기와 원인을 설명하라.

## 4. 프라나야마(호흡법) & 독소 배출 루틴
이 차트에 최적화된 프라나야마(Pranayama) 호흡법, 아유르베다 식이요법, 수면 환경 개선법을 5,000자 이상 상세히 기술하라. 계절별 정화(Panchakarma) 프로토콜 포함.

## 5. 차크라 균형 회복 프로그램
7대 차크라 중 이 차트에서 가장 불균형한 차크라를 진단하고, 균형 회복을 위한 만트라·요가·아로마·보석 처방전을 제시하라.

${STYLE_GUIDE}`;
    }

    case 11: {
      const yogaNames = c.yogas.map(y=>y.nameKo).join(", ")||"잠재적 요가";
      return `${bd}

[챕터 10 — 요가(Yoga) — 특별한 축복의 조합 작성 지시]
검출된 요가: ${yogaNames}

## 1. 우주가 부여한 치트키 — 요가 해설
차트에서 발견된 강력한 행성 조합(${yogaNames})을 하나씩 상세히 설명하라. 각 요가의 형성 원리, 역사적 의미, 현대적 발현 방식을 서술하라.

## 2. 요가 발현을 가로막는 조건
이 요가들이 충분히 발현되지 못하게 막는 행성적·심리적 장애물을 진단하라. 어떤 상황·환경에서 자신의 요가 에너지가 힘을 잃는가?

## 3. 요가 활성화 조건과 최적의 무대
이 요가들이 가장 강하게 발현되는 다샤 시기, 환경, 직업적 조건을 분석하라.

## 4. 잠재된 천재성을 일깨우는 행동 강령
우주가 부여한 요가 에너지를 극대화하기 위한 사회적 태도, 직업적 포지셔닝, 일상 습관을 5,000자로 작성하라.

## 5. 요가 에너지 의식화 루틴
각 요가 행성의 에너지를 일상에서 의식적으로 강화하는 만트라·보석·색상·요일별 의례를 제시하라.

${STYLE_GUIDE}`;
    }

    case 12: {
      const malefic = ["Saturn","Mars","Rahu","Ketu"];
      const maleficPlanets = malefic.filter(m=>p[m]).map(m=>`${PLANET_KO[m]}(${p[m]?.signSanskrit??""} ${p[m]?.house??0}H)`).join(", ");
      return `${bd}

[챕터 11 — 우파야(Upaya) — 운명을 바꾸는 실천 비책 작성 지시]
흉성(${maleficPlanets}) 에너지를 다스리는 실전 개운법을 제시하라.

## 1. 흉성 에너지 진단
현재 차트에서 가장 강한 흉성의 영향(${maleficPlanets})을 분석하고, 이것이 일상에서 어떤 방식으로 발현되는지 구체적으로 진단하라.

## 2. 색상·보석·만트라 처방
각 행성을 정화하는 색상(Color Therapy), 보석(Gemstone), 만트라(Mantra) 조합을 과학적 근거와 함께 제시하라.

## 3. 카르마 요가(Karma Yoga) — 봉사로 운명을 바꾸는 원리
특정 행성의 흉기를 해소하는 봉사 활동(요일별, 분야별)을 제시하고, 이것이 카르마 청산으로 이어지는 원리를 설명하라.

## 4. 일주일 운세 정화 체크리스트
요일별(월~일) 행성 에너지에 맞는 색상·음식·명상·봉사·의례를 담은 7일 루틴 테이블을 5,000자 분량으로 작성하라. (월요일=달, 화요일=화성, 수요일=수성, 목요일=목성, 금요일=금성, 토요일=토성, 일요일=태양)

## 5. 미신 없는 과학적 우파야 설계
부적이나 굿 대신, 신경과학·행동심리학·아유르베다로 뒷받침되는 현대적 우파야 프로그램을 제시하라.

${STYLE_GUIDE}`;
    }

    case 13: {
      return `${bd}

[챕터 13 — 고차라(Transit)와 올해의 행동 전략 작성 지시]
목성/토성/라후·케투 고차라와 현재 다샤를 결합해 올해 전략을 작성하라.

## 1. 올해 전체 흐름
현재 Dasha와 Transit 결합 효과를 설명하고, 올해의 핵심 분위기를 5줄 이내로 요약하라.

## 2. 분야별 연간 전략
직업운/재물운/관계운/건강운을 각각 분석하고 확장해야 할 영역과 보수적으로 관리해야 할 영역을 나눠 제시하라.

## 3. 올해 잡아야 할 기회와 피해야 할 무리수
큰 결정을 내리기 좋은 시기와 피해야 할 무리수를 명확히 제시하라.

## 4. 1월~12월 월별 행동 전략
반드시 아래 형식으로 1월부터 12월까지 모두 작성하라.
### 1월
- 핵심 흐름:
- 좋은 선택:
- 주의할 점:
- 개운 행동:

## 5. 올해 핵심 키워드 5개
연말까지 반복 점검할 키워드 5개를 제시하라.

${STYLE_GUIDE}`;
    }

    case 14: {
      return `${bd}

[챕터 14 — 마스터플랜 — 카르마를 넘어선 자유 작성 지시]
1~11챕터의 모든 분석을 종합하여 최종 미션을 작성하라.

## 1. 차트 전체 요약 — 별들이 그린 운명의 지도
라그나·아트마카라카·달의 낙샤트라·현재 다샤·검출된 요가를 종합하여 이 영혼의 전체 여정을 웅장하게 서술하라.

## 2. 단 하나의 북극성 (North Star)
이 모든 분석을 통합했을 때, 이 사람이 나아가야 할 단 하나의 방향성을 제시하라. 별들이 이 영혼에게 가장 강하게 요청하는 것은 무엇인가?

## 3. 별들의 노예가 아닌 주인이 되는 법
점성술 차트를 읽는 이유는 그 노예가 되기 위함이 아니라 주인이 되기 위함임을 강조하라. 카르마를 초월하는 자유 의지의 원리를 철학적으로 설명하라.

## 4. 삶의 주인공으로 우뚝 서기 위한 최종 메시지
이 사람에게 보내는 가장 감동적이고 진심 어린 응원 메시지를 5,000자 이상 웅장하게 서술하라.

## 5. 금인장의 수료증 — 운명 선언문 (Sankalpa)
이 리포트를 마무리하는 고급스러운 산스크리트 선언문(Sankalpa)을 형식으로 작성하라: "나는 ${c.lagna.signSanskrit} 라그나의 영혼으로서..." — 이 사람이 매일 아침 읽을 수 있는 운명 선언문을 작성하라.

${STYLE_GUIDE}`;
    }

    default:
      return `${bd}\n\n챕터 ${ch}에 대한 베다 점성술 심층 분석을 5,000자 이상 작성하라.\n${STYLE_GUIDE}`;
  }
}

// ─────────────────────────────────────────────────────────────────
// 섹션 파서
// ─────────────────────────────────────────────────────────────────
function parseSections(text: string): { title:string; body:string }[] {
  const parts = text.split(/\n##\s+/);
  if (parts.length < 2) return [];
  return parts.slice(1).map(part => {
    const newline = part.indexOf("\n");
    return newline > -1
      ? { title: part.slice(0, newline).trim(), body: part.slice(newline+1).trim() }
      : { title: part.trim(), body: "" };
  });
}

function buildFallbackChapterText(ch: number, c: VedicChart, reason?: string): string {
  const meta = VEDIC_CHAPTER_META[ch - 1] ?? { title: `챕터 ${ch}`, subtitle: "베다 프리미엄" };
  const moon = c.planets.Moon;
  const sun = c.planets.Sun;
  const saturn = c.planets.Saturn;
  const currentDasha = c.vimshottariDasha.current;
  const antar = c.vimshottariDasha.antar;
  const yogaList = c.yogas.map((y) => y.nameKo).join(", ") || "핵심 요가 없음";

  return `[시스템 안내]
AI 서버 상태로 인해 기본 베다 리포트 템플릿으로 생성되었습니다.${reason ? ` (원인: ${reason})` : ""}

## 1. ${meta.title} 핵심 요약
라그나 ${c.lagna.signKo}(${c.lagna.signSanskrit})를 기준으로, 현재 차트는 ${moon?.nameKo ?? "달"}의 정서 흐름과 ${sun?.nameKo ?? "태양"}의 의지 축이 균형을 만드는 구조입니다.
현재 대운은 ${currentDasha?.planet ?? "-"}, 세운은 ${antar?.planet ?? "-"}으로 표시되며, 이는 장기 목표를 재정렬하고 일상의 실행력을 점검하기 좋은 타이밍을 시사합니다.

## 2. 강점과 기회 포인트
검출된 요가: ${yogaList}
이 조합은 학습-실행-회고 루틴을 반복할수록 성과가 누적되는 타입입니다. 특히 10하우스(사회적 역할)와 9하우스(철학/가치) 연결이 강화될수록 커리어/브랜딩 품질이 좋아집니다.

## 3. 주의할 리스크와 보정 전략
${saturn?.nameKo ?? "토성"}이 관여하는 책임/지연 이슈는 과로 또는 결정 피로로 나타나기 쉽습니다.
이번 주에는 "할 일 축소 → 우선순위 1개 집중 → 완료 기록"의 3단계를 적용해 리스크를 줄이세요.

## 4. 7일 실행 루틴 (실전 우파야)
1) 월: 수면/감정 기록 10분
2) 화: 고강도 작업 1개 완수
3) 수: 커뮤니케이션 정리(메일/메시지)
4) 목: 장기 목표 재점검
5) 금: 관계/협업 감사 표현
6) 토: 정리·정돈 및 지출 점검
7) 일: 다음 주 계획 3줄 작성

## 5. 오늘의 운명 선언문
"나는 ${c.lagna.signSanskrit} 라그나의 흐름을 따라, 두려움보다 실행을 선택하고, 매일의 루틴으로 카르마를 성장 에너지로 전환한다."`;
}

// ─────────────────────────────────────────────────────────────────
// POST 핸들러
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (auth.ok === false) return auth.response;

    const body = await req.json() as {
      year:number; month:number; day:number;
      hour?:number; minute?:number; timezone?:number;
      lat?:number; lon?:number; chapter:number;
      reportType?: "personal" | "compatibility";
      name?: string;
      partnerName?: string;
    };

    const year = Number.isFinite(Number(body.year)) ? Number(body.year) : 1990;
    const month = Number.isFinite(Number(body.month)) ? Math.max(1, Math.min(12, Number(body.month))) : 1;
    const day = Number.isFinite(Number(body.day)) ? Math.max(1, Math.min(31, Number(body.day))) : 1;
    const chapterRaw = Number(body.chapter ?? 1);
    const chapter = Number.isFinite(chapterRaw)
      ? Math.max(1, Math.min(14, Math.floor(chapterRaw)))
      : 1;
    const hour   = Number.isFinite(Number(body.hour)) ? Number(body.hour) : 12;
    const minute = Number.isFinite(Number(body.minute)) ? Number(body.minute) : 0;
    const tz     = Number.isFinite(Number(body.timezone)) ? Number(body.timezone) : 9;
    const lat    = Number.isFinite(Number(body.lat)) ? Number(body.lat) : 37.5665;
    const lon    = Number.isFinite(Number(body.lon)) ? Number(body.lon) : 126.9780;
    const reportType = body.reportType === "compatibility" ? "compatibility" : "personal";

    let swissData: Record<string, unknown> | null = null;
    let swissWarning = "";
    try {
      const swissRes = await fetch(`${req.nextUrl.origin}/api/vedic/planets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, day, hour, minute, timezone: tz, lat, lon }),
        signal: AbortSignal.timeout(12_000),
      });
      const parsed = await swissRes.json().catch(() => ({}));
      if (swissRes.ok && parsed?.ok && parsed?.planets) {
        swissData = parsed;
      } else {
        swissWarning = String(parsed?.error || "Swiss API vedic planets unavailable");
      }
    } catch (swissErr: unknown) {
      swissWarning = swissErr instanceof Error ? swissErr.message : "Swiss API call failed";
    }
    const warnings: string[] = [];
    if (swissWarning) warnings.push(swissWarning);
    if (!swissData) warnings.push("Swiss API unavailable, using local vedic chart fallback");

    // 1) 베다 차트 계산 (Swiss API core 값 강제 반영)
    const baseChart = buildVedicChart(year, month, day, hour, minute, tz, lat, lon);
    const chart = swissData
      ? applySwissCoreToChart(baseChart, {
          planets: swissData.planets as Record<string, number> | undefined,
          ascendantSidereal: Number.isFinite(Number(swissData.ascendantSidereal)) ? Number(swissData.ascendantSidereal) : null,
          ayanamsa: Number.isFinite(Number(swissData.ayanamsa)) ? Number(swissData.ayanamsa) : null,
        })
      : baseChart;

    // 2) AI 텍스트 생성
    const prompt = buildPrompt(chapter, chart, reportType, body as unknown as Record<string, unknown>);
    let text = "";
    let sections: { title:string; body:string }[] = [];
    let usedFallback = false;

    try {
      text = await callGemini(prompt);
      if (!text || !text.trim()) {
        usedFallback = true;
        warnings.push("AI text unavailable, fallback chapter text used");
        text = buildFallbackChapterText(chapter, chart, "AI empty output");
      }
      sections = parseSections(text);
      if (!sections.length) {
        usedFallback = true;
        warnings.push("AI response format invalid, fallback chapter text used");
        text = buildFallbackChapterText(chapter, chart, "Section parse failed");
        sections = parseSections(text);
      }
    } catch (aiErr: unknown) {
      const reason = aiErr instanceof Error ? aiErr.message : "Gemini 호출 실패";
      usedFallback = true;
      warnings.push(`AI generation failed, fallback chapter text used: ${reason}`);
      text = buildFallbackChapterText(chapter, chart, reason);
      sections = parseSections(text);
    }

    return NextResponse.json({
      ok: true,
      reportType,
      chart,
      chapter,
      chapterMeta: VEDIC_CHAPTER_META[chapter - 1],
      text,
      sections,
      usedFallback,
      warnings,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/vedic-life]", msg);
    return NextResponse.json({ ok:false, error:msg }, { status:500 });
  }
}
