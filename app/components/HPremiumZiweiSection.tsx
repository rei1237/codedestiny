"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ZIWEI_PREMIUM_METHOD_COPY } from "../_content/seo-copy";

// ─── 자미두수 로컬 계산 엔진 ────────────────────────────────────────────────

const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const PALACE_LABELS = ["명궁","형제궁","부처궁","자녀궁","재백궁","질액궁","천이궁","노복궁","관록궁","전택궁","복덕궁","부모궁"];

interface ZiweiPalace {
  idx: number;
  label: string;
  zhi: string;
  mainStars: string[];
}

interface ZiweiResult {
  mingIdx: number;
  shenIdx: number;
  yearGan: string;
  yearZhi: string;
  palaces: ZiweiPalace[];
  sihua: { luk: number; quan: number; ke: number; ji: number };
  daihan: { age: number; start: number; end: number; palaceIdx: number }[];
}

/** 음력 근사 변환 (±1개월 오차 허용, 엔진과 동일 방식) */
function solarToLunarApprox(y: number, m: number, d: number): { year: number; month: number; day: number } {
  // 음력 1월1일의 양력 날짜 근사값 테이블 (2000~2040)
  const newYearDays: Record<number, [number, number]> = {
    2000:[2,5],2001:[1,24],2002:[2,12],2003:[2,1],2004:[1,22],2005:[2,9],
    2006:[1,29],2007:[2,18],2008:[2,7],2009:[1,26],2010:[2,14],2011:[2,3],
    2012:[1,23],2013:[2,10],2014:[1,31],2015:[2,19],2016:[2,8],2017:[1,28],
    2018:[2,16],2019:[2,5],2020:[1,25],2021:[2,12],2022:[2,1],2023:[1,22],
    2024:[2,10],2025:[1,29],2026:[2,17],2027:[2,6],2028:[1,26],2029:[2,13],
    2030:[2,3],2031:[1,23],2032:[2,11],2033:[1,31],2034:[2,19],2035:[2,8],
    2036:[1,28],2037:[2,15],2038:[2,4],2039:[1,24],2040:[2,12],
  };
  const toDate = (yr: number, mo: number, dy: number) =>
    new Date(yr, mo - 1, dy).getTime();
  const solar = toDate(y, m, d);
  let lunarYear = y;
  let nyEntry = newYearDays[y];
  if (!nyEntry) {
    // 범위 밖: 양력월을 음력월로 1개월 당겨서 근사
    const lm = m - 1 || 12;
    return { year: m === 1 ? y - 1 : y, month: lm, day: d };
  }
  const ny = toDate(y, nyEntry[0], nyEntry[1]);
  if (solar < ny) {
    lunarYear = y - 1;
    const prevEntry = newYearDays[y - 1];
    if (!prevEntry) return { year: y - 1, month: m, day: d };
    const prevNy = toDate(y - 1, prevEntry[0], prevEntry[1]);
    const diffDays = Math.floor((solar - prevNy) / 86400000);
    const lunarMonth = Math.min(12, Math.floor(diffDays / 30) + 1);
    const lunarDay = (diffDays % 30) + 1;
    return { year: lunarYear, month: lunarMonth, day: lunarDay };
  }
  const diffDays = Math.floor((solar - ny) / 86400000);
  const lunarMonth = Math.min(12, Math.floor(diffDays / 30) + 1);
  const lunarDay = (diffDays % 30) + 1;
  return { year: lunarYear, month: lunarMonth, day: lunarDay };
}

/** 천간 인덱스 from 년도 */
function ganIdx(y: number) { return (y - 4) % 10; }
/** 지지 인덱스 from 년도 */
function zhiIdx(y: number) { return (y - 4) % 12; }
/** 시支 인덱스 from 시각 */
function hourZhiIdx(h: number) { return Math.floor((h + 1) / 2) % 12; }

/** 14주성 배치 테이블 (자미 위치 기준 offset) */
const NORTH_OFFSETS: Record<string, number> = {
  "紫微": 0,"天機": -1,"太陽": 2,"武曲": 3,"天同": 4,"廉貞": 7,
};
function southPalaceIdx(mingIdx: number, starName: string): number {
  // 남두 6성은 역방향으로 天府에서 파생
  const TIANFU_OFFSET: Record<string, number> = {
    "天府": 0,"太陰": 1,"貪狼": 2,"巨門": 3,"天相": 4,"天梁": 5,"七殺": 6,"破軍": 10,
  };
  const tfOff = TIANFU_OFFSET[starName];
  if (tfOff === undefined) return -1;
  const tianfuIdx = (mingIdx + 8) % 12; // 천부는 명궁+8번째 위치가 기본
  return (tianfuIdx + tfOff) % 12;
}

export function calcZiwei(year: number, month: number, day: number, hour: number): ZiweiResult {
  const lunar = solarToLunarApprox(year, month, day);
  const hZhi = hourZhiIdx(hour);
  const gIdx = ganIdx(year);
  const zIdx = zhiIdx(year);

  // 명궁 = (14 - 음력월 - 시支) mod 12, 1부터 index 보정
  const rawMing = (14 - lunar.month - hZhi) % 12;
  const mingIdx = ((rawMing - 1) + 12) % 12;

  // 신궁: (생년支 인덱스 + 시支) mod 12
  const shenIdx = (zIdx + hZhi) % 12;

  // 紫微 위치 계산: 음력일과 명국(局) 기반
  // 局 = 생년干支 기반; 간략화: (gIdx%5)*2+2 = 2,4,4,6,6,6... → 水2 木3 金4 土5 火6
  const juTable = [2,3,4,5,6,2,3,4,5,6];
  const ju = juTable[gIdx] || 4;
  const ziweiIdx = (mingIdx + Math.floor((lunar.day - 1) / ju)) % 12;

  // 북두 6성 배치
  const palaceStars: string[][] = Array.from({length:12}, () => []);
  for (const [star, off] of Object.entries(NORTH_OFFSETS)) {
    const idx = ((ziweiIdx + off) + 12) % 12;
    palaceStars[idx].push(star);
  }
  // 남두 8성 배치
  const southStars = ["天府","太陰","貪狼","巨門","天相","天梁","七殺","破軍"];
  for (const star of southStars) {
    const idx = southPalaceIdx(mingIdx, star);
    if (idx >= 0) palaceStars[idx].push(star);
  }

  const palaces: ZiweiPalace[] = PALACE_LABELS.map((label, i) => {
    const posIdx = (mingIdx + i) % 12;
    return { idx: posIdx, label, zhi: ZHI[posIdx], mainStars: palaceStars[posIdx] };
  });

  // 사화(四化) — 생년干 기준 정통 배치
  const SIHUA_TABLE: [number,number,number,number][] = [
    // [化祿궁idx, 化權궁idx, 化科궁idx, 化忌궁idx] 생년干별(甲~癸)
    [0,3,6,9],[1,4,7,10],[2,5,8,11],[3,6,9,0],
    [4,7,10,1],[5,8,11,2],[6,9,0,3],[7,10,1,4],
    [8,11,2,5],[9,0,3,6],
  ];
  const st = SIHUA_TABLE[gIdx] || [0,3,6,9];
  const sihua = { luk: (mingIdx + st[0]) % 12, quan: (mingIdx + st[1]) % 12, ke: (mingIdx + st[2]) % 12, ji: (mingIdx + st[3]) % 12 };

  // 대한(大限) — 성별/명국/명궁순서 (간략화: 순행/역행 최소화)
  const startAge = ju * 2; // 첫 대한 시작 나이 근사
  const daihan = Array.from({length:8}, (_, i) => ({
    age: startAge + i * 10,
    start: year + startAge + i * 10 - 1,
    end: year + startAge + (i+1) * 10 - 1,
    palaceIdx: (mingIdx + i) % 12,
  }));

  return {
    mingIdx, shenIdx,
    yearGan: GAN[gIdx], yearZhi: ZHI[zIdx],
    palaces, sihua, daihan,
  };
}

// ─── 별 해석 데이터베이스 ────────────────────────────────────────────────────

interface StarInfo {
  emoji: string;
  name: string;
  element: string;
  core: string;
  strength: string;
  challenge: string;
  advice: string;
}

const STAR_DB: Record<string, StarInfo> = {
  "紫微": {
    emoji:"👑", name:"자미성(紫微星)", element:"土",
    core:"자미성은 자미두수 최고의 제왕성입니다. 북극성에 빗댄 이 별을 지닌 사람은 타고난 권위와 존엄이 있어 주변이 자연히 복종하게 됩니다. 황제의 기운을 품었기에 어느 분야에서든 최정점을 향해 나아가려는 본능이 강렬합니다. 그러나 이 별의 진정한 힘은 독재적 지배가 아니라, 넓은 포용력으로 사람과 조직을 하나로 묶는 데 있습니다.",
    strength:"리더십 본능과 큰 그림을 읽는 전략적 통찰, 위기 상황에서의 냉정한 판단력, 자연스럽게 형성되는 카리스마와 권위, 완성도를 향한 집요한 추구심.",
    challenge:"과도한 자존심과 독선적 판단, 타인의 의견을 듣지 않는 폐쇄성, 지나친 완벽주의로 인한 주변과의 갈등, 최고 자리에서 오는 고독감.",
    advice:"위임의 기술을 연습하세요. 신뢰하는 사람에게 권한을 넘기는 순간 자미의 기운이 배가됩니다. '모든 것을 내가 해야 한다'는 집착을 내려놓고 팀 전체의 성장을 이끄는 쪽으로 에너지를 전환하면 진정한 제왕의 리더십이 완성됩니다.",
  },
  "天機": {
    emoji:"🧠", name:"천기성(天機星)", element:"木",
    core:"천기성은 수천 년 동안 '하늘의 기밀'을 품은 지혜의 별로 불려왔습니다. 변화를 좋아하고 다양한 분야를 탐구하는 지식욕이 강한 이 별은 유연한 사고와 빠른 적응력이 특기입니다. 천기인은 단순한 지식 수집을 넘어 패턴을 찾고 연결하는 분석적 직관이 남들보다 두드러집니다.",
    strength:"광범위한 지식과 유연한 사고, 빠른 상황 파악과 전략적 적응력, 문제의 핵심을 꿰뚫는 통찰, 다양한 분야를 연결하는 융합적 사고.",
    challenge:"변화를 즐기다 한 곳에 집중하지 못하는 산만함, 지나친 분석으로 행동이 늦어지는 분석 마비, 영리함이 영악함으로 오해받을 위험.",
    advice:"깊이 탐구하고 싶은 한 분야를 정하고, 최소 3년 이상 집중하세요. 천기의 빠른 학습력은 '넓이'보다 '깊이'에 집중될 때 비로소 전문가 반열의 경쟁력으로 변합니다.",
  },
  "太陽": {
    emoji:"☀️", name:"태양성(太陽星)", element:"火",
    core:"태양성은 문자 그대로 태양처럼 빛을 발하는 별입니다. 이 별을 지닌 사람은 활발하고 외향적이며 사회 활동과 대중과의 교류에서 에너지를 얻습니다. 공정함과 정의감이 강하고 약자를 도우려는 본능이 있어 공직, 교육, 의료, 사회적 역할에서 빛납니다. 낮에 태어났다면 태양의 기운이 더욱 강하게 발현됩니다.",
    strength:"따뜻한 카리스마와 대중 친화력, 강한 사회의식과 공정함, 빠르고 긍정적인 행동력, 많은 사람에게 영향을 미치는 공공적 에너지.",
    challenge:"자신의 에너지를 너무 많이 소모해 번아웃 위험, 칭찬에 취약한 자존감, 밤이나 역경의 시기에 에너지가 급격히 떨어지는 경향.",
    advice:"혼자 모든 것을 감당하려 하지 마세요. 태양에게는 혼자만의 충전 시간이 반드시 필요합니다. 한 달에 이틀이라도 조용히 자신을 돌보는 시간이 태양의 지속 가능한 빛을 보장합니다.",
  },
  "武曲": {
    emoji:"⚔️", name:"무곡성(武曲星)", element:"金",
    core:"무곡성은 자미두수의 재성(財星)이자 실행의 별입니다. 결단력과 추진력이 뛰어나 한번 목표를 세우면 과감하게 밀어붙이는 힘이 있습니다. 재물을 끌어당기는 기운이 강하고 투자 감각이 탁월하여 사업, 금융, 부동산 분야에서 두각을 나타냅니다. 그러나 인정(人情)이 부족하다는 오해를 자주 받습니다.",
    strength:"강철 같은 실행력과 결단력, 재물을 끌어당기는 본능적 재능, 위기에도 흔들리지 않는 강인한 정신력, 논리 중심의 명확한 의사소통.",
    challenge:"감정 표현의 서투름으로 인한 인간관계 어려움, 쉽게 타협하지 않아 적을 만드는 경향, 무리한 추진으로 인한 체력 소진.",
    advice:"협상에서 승리하려면 먼저 상대를 이해하세요. 무곡의 실행력은 강하지만 사람의 마음을 읽는 훈련이 더해질 때 비로소 진정한 사업가의 기운으로 완성됩니다.",
  },
  "天同": {
    emoji:"😊", name:"천동성(天同星)", element:"水",
    core:"천동성은 복락(福樂)의 별입니다. 삶을 즐기고 여유로움을 추구하는 이 별을 지닌 사람은 타고난 낙천성과 예술적 감수성을 갖고 있습니다. 인간관계에서 포용적이고 갈등을 피하려는 성향 덕에 많은 사람에게 호감을 受합니다. 단, 지나친 안락함 추구가 성장의 발목을 잡을 수 있습니다.",
    strength:"높은 감수성과 예술적 재능, 갈등을 중재하는 화합의 에너지, 삶을 즐기는 여유로운 마인드셋, 광범위한 사람 사귀기.",
    challenge:"편안함에 안주해 도전을 회피하는 경향, 갈등 회피로 인한 소극적 처세, 결단의 순간에 우유부단해지는 성향.",
    advice:"안락 지대를 주기적으로 스스로 깨뜨리세요. 천동의 좋은 기운은 편안한 환경이 아니라 약간의 도전 속에서 더 크게 빛납니다. 매 분기마다 새로운 도전 한 가지를 자신과 약속하면 됩니다.",
  },
  "廉貞": {
    emoji:"🔥", name:"염정성(廉貞星)", element:"火",
    core:"염정성은 불꽃처럼 강렬한 열정의 별입니다. 사법, 권력, 행정 분야와 친화성이 높고 정확하고 엄격한 기준을 따르는 성향이 있습니다. 한번 꽂히면 끝장을 보는 집착에 가까운 몰입력이 있어 전문직과 연구직에서 탁월한 성과를 냅니다. 그러나 지나치면 독이 되는 별이기도 합니다.",
    strength:"남다른 집중력과 몰입력, 정확성과 엄격한 자기 기준, 복잡한 시스템과 규정 파악 능력, 강한 원칙과 공정성.",
    challenge:"지나친 완벽주의와 융통성 부족, 규칙 위반에 대한 과도한 반응, 자신에게도 타인에게도 지나치게 엄격한 기준.",
    advice:"80점짜리 완성이 100점짜리 미완성보다 낫습니다. 염정의 강점인 집중력을 현실적 목표 설정과 결합하면 탁월한 성과 창출자가 됩니다.",
  },
  "天府": {
    emoji:"💰", name:"천부성(天府星)", element:"土",
    core:"천부성은 자미두수 남두 최고의 재물성이자 안정의 별입니다. 자미가 제왕의 기운이라면 천부는 금고의 기운입니다. 이 별을 지닌 사람은 자산을 축적하고 지키는 능력이 탁월하며 보수적이고 안정 지향적인 가치관을 지닙니다. 신중한 투자 감각과 위험 관리 능력이 뛰어납니다.",
    strength:"탁월한 자산 축적 능력과 재물 유지력, 신중하고 분석적인 투자 감각, 조직과 집단에 안정감을 부여하는 중심 기운, 장기적 안목의 의사결정.",
    challenge:"지나친 보수성으로 기회를 놓치는 경향, 새로운 변화와 도전에 대한 저항, 소유욕이 인간관계를 경직시킬 위험.",
    advice:"현재 자산의 10~20%를 성장 가능성이 높은 새 분야에 투자하세요. 천부의 탁월한 위험 관리 능력이 있기에 일정 부분의 모험은 오히려 포트폴리오를 강화합니다.",
  },
  "太陰": {
    emoji:"🌙", name:"태음성(太陰星)", element:"金/水",
    core:"태음성은 달처럼 은은하게 빛나는 부드러움과 감수성의 별입니다. 기획, 예술, 재물 분야에서 두각을 나타내며 특히 눈에 보이지 않는 이면(裏面)을 꿰뚫어보는 통찰이 있습니다. 부동산과 축적 재물에서 강한 기운을 발휘하며, 밤에 태어난 사람일수록 태음의 기운이 더욱 선명합니다.",
    strength:"섬세한 감수성과 예술적 직관, 고요한 관찰력과 이면을 읽는 통찰, 부동산·은장 재물의 축적 기운, 인내력과 지속적인 노력.",
    challenge:"감정 기복과 예민함, 직접적 표현을 꺼리는 소극성, 상처를 오래 품는 경향, 밝은 환경보다 조용한 환경을 선호해 사회 활동 제한.",
    advice:"감수성을 창작 활동으로 표현하세요. 태음의 예민함은 글쓰기, 음악, 사진, 디자인 등 창조적 분야에서 타인이 따라오기 힘든 독창성으로 꽃피웁니다.",
  },
  "貪狼": {
    emoji:"🐺", name:"탐랑성(貪狼星)", element:"木/水",
    core:"탐랑성은 욕망과 활동의 별입니다. 이 별을 지닌 사람은 삶의 다양한 영역에 욕심을 내며 동시에 여러 것을 추구합니다. 매력적이고 사교적이어서 이성에게 인기가 높고 예술, 음식, 여행 등 감각적 쾌락에 관심이 많습니다. 한편 집중과 절제가 관건인 별이기도 합니다.",
    strength:"강렬한 삶의 에너지와 도전 욕구, 탁월한 사교성과 매력, 다양한 관심 분야를 아우르는 멀티태스킹 능력, 예술적 감각.",
    challenge:"다방면의 욕심으로 인한 에너지 분산, 절제력 부족으로 인한 낭비 위험, 쾌락 추구가 중요한 목표 달성을 방해하는 경우.",
    advice:"가장 빛날 한 분야를 정하고 탐랑의 강렬한 에너지를 그 하나에 쏟아부으세요. 넓은 관심사는 취미로 유지하되, 커리어의 핵심은 하나의 전문성으로 집중해야 탐랑 특유의 빛이 납니다.",
  },
  "巨門": {
    emoji:"🗣️", name:"거문성(巨門星)", element:"水",
    core:"거문성은 언어와 소통의 별입니다. 강한 언변과 논리력, 비판적 사고가 특기이며 교육, 법률, 방송, 컨설팅 분야에서 두각을 나타냅니다. 한편 말이 화(禍)의 씨앗이 되기도 하는 별이라, 자신의 언어 사용에 각별히 신중해야 합니다. 입으로 흥하고 입으로 망하는 운명이 이 별에 내재되어 있습니다.",
    strength:"탁월한 언변과 설득력, 날카로운 비판적 사고와 분석력, 복잡한 정보를 명확히 전달하는 능력, 교육·방송·법률 분야 적성.",
    challenge:"말로 인한 구설수 위험, 비판적 사고가 부정적 시각으로 굳는 경향, 과도한 논쟁 지향성으로 인한 갈등 유발.",
    advice:"말의 힘을 긍정적 방향으로 집중하세요. 비판 대신 개선점을 제안하고, 단점을 지적하기 전에 강점을 먼저 인정하는 습관이 거문의 탁월한 언변을 진정한 영향력으로 완성합니다.",
  },
  "天相": {
    emoji:"🤝", name:"천상성(天相星)", element:"水",
    core:"천상성은 보필과 도움의 별입니다. 이 별을 지닌 사람은 타고난 중재자이자 지지자로, 조직이나 집단에서 필수불가결한 안정 기반이 됩니다. 재무 관리와 문서 처리, 법률 지원 분야에서 특히 강점을 발휘하며, 신뢰받는 조력자 포지션에서 두각을 나타냅니다.",
    strength:"뛰어난 중재 능력과 협력 지향성, 꼼꼼한 문서·재무 관리 능력, 신뢰를 주는 안정적 에너지, 팀을 지지하는 헌신성.",
    challenge:"자신의 욕구보다 타인을 먼저 배려하는 자기 희생 성향, 주도적 결정을 꺼리는 수동적 태도, 보조 역할에 갇혀 자신의 가능성을 과소평가하는 경우.",
    advice:"보필자 역할을 하면서도 자신만의 전문 영역을 구축하세요. 천상의 신뢰받는 조력자 포지션 + 독자적 전문성의 조합은 미래에 누구도 대체하기 어려운 포지션을 만들어 줍니다.",
  },
  "天梁": {
    emoji:"🏛️", name:"천량성(天梁星)", element:"土",
    core:"천량성은 하늘의 대들보라는 이름 그대로 든든한 보호와 지원의 별입니다. 다른 사람을 위해 나서고 약자를 돕는 기질이 강하며, 의료·법조·복지·종교 분야에서 탁월한 적성을 보입니다. 또한 예기치 않은 위기에서 극적으로 구원받는 수호의 기운이 있습니다.",
    strength:"강한 사회 정의감과 타인 보호 본능, 위기 상황에서의 침착한 대처, 복잡한 문제를 해결하는 지혜, 신뢰받는 어른 기운.",
    challenge:"타인을 너무 많이 도우려다 자신을 소진하는 경향, 지원 역할에 익숙해져 자신의 성장을 뒷전으로 미루는 습관.",
    advice:"비행기 안전 교육처럼, 먼저 자신의 산소마스크를 착용하세요. 자신을 충전하고 성장시키는 것이 더 많은 사람을 도울 수 있는 기반이 됩니다.",
  },
  "七殺": {
    emoji:"⚡", name:"칠살성(七殺星)", element:"金",
    core:"칠살성은 군인 기질의 추진력과 개혁의 별입니다. 현 상태에 안주하지 않고 변화와 도전을 본능적으로 추구합니다. 독립성이 강하고 스스로 개척하려는 기질이 있어 창업, 연구, 예술 분야에서 선구자 포지션에서 빛납니다. 살성이라 불리지만 잘 단련되면 인생의 최강 무기가 됩니다.",
    strength:"강렬한 도전 추진력과 개척 정신, 현 상태에 안주하지 않는 혁신 지향성, 독립심과 자립 능력, 위기에서 빛나는 전투력.",
    challenge:"지나친 독립성으로 협력을 거부하는 성향, 급격한 변화 추구로 주변과 마찰, 충동적 결정이 불필요한 위험을 만드는 경향.",
    advice:"변화를 추구할 때는 명확한 로드맵을 먼저 그리세요. 칠살의 추진력이 계획과 만날 때, 남들이 두려워하는 곳에서 선구자로서 빛을 발합니다.",
  },
  "破軍": {
    emoji:"💥", name:"파군성(破軍星)", element:"水",
    core:"파군성은 파괴와 재창조의 별입니다. 기존 체계를 무너뜨리고 완전히 새로운 방식으로 다시 세우는 기운이 강합니다. 변혁, 혁신, 예술 분야에서 시대를 앞서가는 선구자가 되거나, 반대로 파란만장한 부침을 겪기도 하는 양날의 검입니다.",
    strength:"기존 틀을 깨는 혁신적 사고, 완전히 새로운 방식을 창조하는 능력, 극적인 변화 상황에서의 강인한 생존력, 시대 흐름을 앞지르는 직관.",
    challenge:"안정성 부족으로 인한 잦은 변화와 부침, 파괴 이후 재건 단계에서의 지속력 약화, 극단적 선택으로 인한 불필요한 손실.",
    advice:"혁신을 추구하되 기반을 유지하세요. 파군의 파괴적 창의성이 견고한 토대 위에서 발현될 때 비로소 세상을 바꾸는 혁신가가 됩니다.",
  },
};

// ─── 16챕터 콘텐츠 생성기 ────────────────────────────────────────────────────

interface ChapterDef { title: string; subtitle: string; icon: string; key: number }

const CHAPTERS: ChapterDef[] = [
  {key:0, icon:"🌌", title:"명궁(命宮) 완전 해독", subtitle:"타고난 핵심 캐릭터 · 삼방사정 배치 · 강점 활용 전략"},
  {key:1, icon:"👁️", title:"신궁(身宮) 심층 분석", subtitle:"내면의 본체 · 잠재 무기 · 명궁과의 통합 자아"},
  {key:4, icon:"💰", title:"재백궁(財帛宮) 부의 법칙", subtitle:"재물 그릇 · 수입 파이프라인 · 황금 타이밍"},
  {key:8, icon:"👑", title:"관록궁(官祿宮) 천직 방정식", subtitle:"업무 DNA · 천직 영역 · 커리어 도약 타이밍"},
  {key:2, icon:"💑", title:"부처궁(夫妻宮) 인연 구조", subtitle:"이상형 성향 · 감정 패턴 · 관계 경계 설정"},
  {key:10, icon:"🌙", title:"복덕궁(福德宮) 행복 설계도", subtitle:"행복 DNA · 스트레스 패턴 · 심상화 마인드"},
  {key:6, icon:"🌍", title:"천이궁(遷移宮) 이미지 관리", subtitle:"사회적 이미지 · 외부 활동 황금 타이밍"},
  {key:9, icon:"🏠", title:"전택궁(田宅宮) 공간과 자산", subtitle:"공간 심리학 · 인테리어 무드 · 자산 전략"},
  {key:3, icon:"🌱", title:"자녀궁(子女宮) 창조와 연결", subtitle:"창의 에너지 · 부하 연인 · 자녀 관계 법칙"},
  {key:7, icon:"🤝", title:"노복궁(奴僕宮) 귀인 네트워크", subtitle:"귀인 구별법 · 에너지 뱀파이어 차단 · 위임 전략"},
  {key:1, icon:"👨‍👩‍👧", title:"형제궁(兄弟宮) 혈연과 동료", subtitle:"형제 관계 · 팀 동료 에너지 · 협력의 법칙"},
  {key:5, icon:"💪", title:"질액궁(疾厄宮) 건강 바이오리듬", subtitle:"오행 체질 · 스트레스 신체화 · 라이프스타일"},
  {key:11, icon:"🌳", title:"부모궁(父母宮) 뿌리와 조상", subtitle:"조상 기운 · 부모 관계 · 권위자와의 패턴"},
  {key:-1, icon:"🔮", title:"사화(四化) 운명의 4변화", subtitle:"化祿·化權·化科·化忌 — 하늘이 설계한 4가지 운명 코드"},
  {key:-2, icon:"🌊", title:"대한(大限) 생애 파노라마", subtitle:"10년 단위 메가 트렌드 · 현재 대한 완전 해독"},
  {key:-3, icon:"📅", title:"2026 유년(流年) 마이크로 전술", subtitle:"올해 Go·Hold·Retreat 판정 · 분기별 로드맵"},
];

function getStarFromPalaces(palaces: ZiweiPalace[], palaceLabel: string): string[] {
  const p = palaces.find(p => p.label === palaceLabel);
  return p ? p.mainStars : [];
}

function buildChapterContent(chIdx: number, chapter: ChapterDef, result: ZiweiResult, name: string, year: number): string {
  const { palaces, sihua, daihan, mingIdx, shenIdx, yearGan, yearZhi } = result;

  // 명궁/신궁 주성 구하기
  const mingStars = palaces[0].mainStars;
  const shenPalace = palaces.find((_,i) => (mingIdx + i) % 12 === shenIdx);
  const shenStars = shenPalace ? shenPalace.mainStars : [];

  function getStarInfo(stars: string[]): StarInfo {
    for (const s of stars) if (STAR_DB[s]) return STAR_DB[s];
    return STAR_DB["天機"]; // fallback
  }

  const sihuaLabels: Record<number, string> = {
    [sihua.luk]: "化祿(财星)",
    [sihua.quan]: "化權(권력)",
    [sihua.ke]: "化科(명예)",
    [sihua.ji]: "化忌(주의)",
  };

  // 현재 대한 찾기
  const currentYear = 2026;
  const age = currentYear - year + 1;
  const curDaihan = daihan.find(d => d.age <= age && age < d.age + 10) || daihan[0];
  const curDaihanPalace = palaces.find((_,i) => (mingIdx + i) % 12 === curDaihan.palaceIdx);

  // 챕터별 콘텐츠 생성
  if (chapter.key >= 0) {
    // 궁 기반 챕터
    const palace = palaces[chapter.key] || palaces[0];
    const stars = palace.mainStars;
    const si = getStarInfo(stars);
    const sihuaMark = sihuaLabels[palace.idx] ? ` ✦ ${sihuaLabels[palace.idx]}` : "";
    const starDisplay = stars.length > 0 ? stars.join("·") : "공궁(空宮)";

    return `## ${chapter.icon} ${chapter.title}

**${palace.label}(${ZHI[palace.idx]}宮)${sihuaMark}**에 자리한 주성: **${starDisplay}**

### 📍 ${palace.label} 기본 읽기
${name}님의 ${palace.label}은 **${ZHI[palace.idx]} 자리**에 배치되어 있습니다. ${stars.length > 0 ? `이 궁에는 **${stars.join("·")}**이(가) 자리하고 있으며` : "이 궁은 공궁(空宮)으로"}, ${sihuaMark ? `특별히 **${sihuaLabels[palace.idx]}** 기운이 더해져` : "순수한 별의 기운으로"} 이 삶의 영역이 운영됩니다.

${ stars.length > 0 ? `### ⭐ ${si.emoji} ${si.name} — 핵심 분석

${si.core}

**강점**: ${si.strength}

**주의점**: ${si.challenge}

### 🎯 ${name}님을 위한 ${palace.label} 전략

${si.advice}

이 궁에 **${starDisplay}**이 자리한다는 것은, "${chapter.subtitle.split("·")[0].trim()}" 영역에서 **${si.name} 특유의 기운**이 직접적으로 작동한다는 의미입니다. ${chapter.key === 0 ? "명궁은 자미두수 전체의 북극성이므로, 이 별의 기운이 다른 모든 궁에 영향을 미칩니다." : chapter.key === 4 ? "재백궁의 주성이 재물 운의 핵심 코드입니다. 이 별의 성향에 맞는 방식으로 수입 파이프라인을 구축하세요." : chapter.key === 8 ? "관록궁 주성이 커리어 방향을 결정합니다. 이 별의 기운이 빛나는 분야에 에너지를 집중하세요." : chapter.key === 2 ? "부처궁의 별이 연인·배우자와의 관계 패턴을 보여줍니다. 이 에너지를 이해하면 반복되는 관계 문제를 해결할 수 있습니다." : "이 별의 성향과 자신의 실제 행동 패턴을 비교해 보면, 놀라운 일치점을 발견하게 될 것입니다."}

### 💡 실천 포인트 3가지

1. **지금 당장**: ${si.name.split("(")[0]}의 강점인 "${si.strength.split(",")[0]}"을 오늘 일상에서 의식적으로 활용해 보세요.
2. **이번 달**: "${si.challenge.split(",")[0]}" 경향이 나타날 때 즉시 알아채고, 반대 행동을 선택하는 연습을 시작하세요.
3. **올해 목표**: ${si.advice.split(".")[0].trim()}. 이 방향으로 구체적인 90일 계획을 수립해 실행하세요.

> 💫 **${chapter.icon} 총결**: ${name}님의 ${palace.label}에 자리한 ${si.emoji} ${si.name}은 이 삶의 영역을 **${si.element} 오행의 기운**으로 채우고 있습니다. 이 별의 장점을 극대화하고 약점을 보완하면, ${palace.label}과 연결된 삶의 모든 영역이 점진적으로 강화됩니다. 자미두수는 운명을 고정하는 학문이 아니라 타고난 기운의 방향을 이해하고 최선의 전략을 세우는 지혜입니다.` : `### ⭐ 공궁(空宮) — 비어 있음의 의미

${palace.label}이 공궁이라는 것은 이 영역이 비어 있다는 뜻이 아닙니다. 오히려 다른 궁과의 삼방사정(三方四正) 관계에서 영향을 받는 유연한 궁임을 의미합니다. 공궁은 고정된 성향 없이 환경과 노력에 따라 변화하기 쉬운 영역을 뜻합니다.

### 🎯 공궁 활용 전략

공궁인 ${palace.label}은 **명궁(${ZHI[palaces[0].idx]})의 에너지가 대궁(對宮)으로 투입**되어 운영됩니다. 명궁의 주성인 ${mingStars.join("·") || "없음"} 기운이 이 영역에도 간접적으로 작용하므로, 명궁 주성의 강점을 이 영역에 적용하는 전략이 유효합니다. 또한 공궁의 삼방에 위치한 별들의 영향도 함께 고려해야 합니다.

> 💫 **총결**: 공궁도 하나의 기회입니다. 고정된 별이 없다는 것은 이 영역을 스스로 원하는 방향으로 만들어갈 자유가 있다는 뜻입니다. 노력과 환경이 이 궁을 결정합니다.`}`;
  }

  // 사화 챕터 (key=-1)
  if (chapter.key === -1) {
    const sihuaEntries = [
      { type: "化祿", palaceIdx: sihua.luk, emoji: "🟡" },
      { type: "化權", palaceIdx: sihua.quan, emoji: "🔴" },
      { type: "化科", palaceIdx: sihua.ke, emoji: "🔵" },
      { type: "化忌", palaceIdx: sihua.ji, emoji: "⚫" },
    ];
    const sihuaLines = sihuaEntries.map(e => {
      const palaceName = PALACE_LABELS[(palaces.findIndex((_,i) => (mingIdx + i)%12 === e.palaceIdx)) % 12] || "해당궁";
      return `${e.emoji} **${e.type}** → **${palaceName}(${ZHI[e.palaceIdx]})**: ${
        e.type === "化祿" ? "재물·복락·성취 에너지가 흐르는 궁. 이 궁의 영역에서 노력하면 가장 큰 보상을 얻습니다." :
        e.type === "化權" ? "권력·통제·추진 에너지가 집중되는 궁. 이 영역에서 주도권을 가져가는 것이 핵심 전략입니다." :
        e.type === "化科" ? "명예·학술·평판 에너지가 모이는 궁. 이 영역에서의 노력이 주변의 인정과 신뢰로 이어집니다." :
        "損失·갈등·주의해야 할 에너지가 모이는 궁. 이 영역에서는 신중하게 행동하고 과도한 집착을 경계해야 합니다."
      }`;
    }).join("\n\n");

    return `## ${chapter.icon} ${chapter.title}

**생년 천간**: ${yearGan}干 · **생년 지지**: ${yearZhi}支

사화(四化)는 자미두수에서 하늘이 부여한 **4가지 운명 변환 코드**입니다. 化祿·化權·化科·化忌 각각이 12궁 중 특정 궁에 배치되어 그 궁의 에너지를 변환시킵니다. 생년 천간 **${yearGan}**에 의해 ${name}님의 사화는 다음과 같이 배치됩니다.

### 🔮 ${name}님의 사화 완전 배치

${sihuaLines}

### 💡 사화 활용 3대 전략

1. **化祿 궁 집중 투자**: 화록이 자리한 궁은 노력 대비 가장 많은 성과가 돌아오는 영역입니다. 이 궁의 분야에 시간과 에너지의 40% 이상을 투자하세요.
2. **化忌 궁 방어 전략**: 화기가 자리한 궁은 과도한 집착과 무리수를 경계해야 합니다. 이 영역에서는 '충분히 좋은 것'으로 만족하는 연습이 필요합니다.
3. **化權·化科의 시너지**: 권과 과의 궁은 사회적 영향력과 인정이 쌓이는 영역입니다. 이 두 궁의 분야를 커리어와 대외 활동의 중심축으로 삼으세요.

> 💫 **총결**: 생년 천간 ${yearGan}이 부여한 사화 배치는 ${name}님의 일생 동안 변하지 않는 운명의 지도입니다. 화록에서 수확하고, 화권과 화과에서 영향력을 키우며, 화기에서는 과도한 욕심을 내려놓는 삶의 태도가 자미두수 지혜의 핵심입니다.`;
  }

  // 대한 챕터 (key=-2)
  if (chapter.key === -2) {
    const daihanList = daihan.map((d, i) => {
      const dPalace = palaces.find((_, j) => (mingIdx + j) % 12 === d.palaceIdx) || palaces[i % 12];
      const dStars = dPalace.mainStars;
      const dSi = getStarInfo(dStars);
      const isCurrent = d.age <= age && age < d.age + 10;
      return `${isCurrent ? "▶️ **[현재 대한]**" : `**${i + 1}대한**`} **${d.start}~${d.end}년** (${d.age}~${d.age + 9}세) — ${dPalace.label}(${ZHI[dPalace.idx]}) · ${dStars.length ? dStars.join("·") : "공궁"} ${isCurrent ? "\n   현재 당신이 걷고 있는 10년의 길. " + dSi.core.slice(0, 60) + "..." : ""}`;
    }).join("\n\n");

    const curSi = getStarInfo(curDaihanPalace?.mainStars || []);
    return `## ${chapter.icon} ${chapter.title}

**${name}님 현재 나이**: ${age}세 (2026년 기준) · **현재 대한**: ${curDaihan.age}~${curDaihan.age + 9}세 대한

대한(大限)은 10년마다 하늘이 교체하는 운명의 장(章)입니다. 자미두수에서 가장 중요한 시간 분석 도구로, 각 대한마다 다른 궁(宮)의 에너지가 주도권을 잡아 인생의 흐름을 바꿉니다.

### 📊 ${name}님의 전 생애 대한 파노라마

${daihanList}

### 🔥 현재 대한 완전 해독: ${curDaihanPalace?.label}(${ZHI[curDaihan.palaceIdx]}) 대한

**현재 ${curDaihan.age}~${curDaihan.age + 9}세** 기간 동안 ${name}님의 대한은 **${curDaihanPalace?.label}**에 걸쳐 있습니다. 이 궁의 에너지인 **${curSi.emoji} ${curSi.name}** 기운이 지금 삶의 모든 방면을 주도하고 있습니다.

${curSi.core}

**이 대한에서 빛나려면**: ${curSi.advice}

### 💡 대한 활용 3대 전략

1. **상승 대한 식별**: 명궁·재백궁·관록궁의 대한은 삶의 절정기입니다. 이 시기에 주요 프로젝트와 투자를 집중하세요.
2. **보완 대한 활용**: 복덕궁·전택궁의 대한은 내면 성장과 자산 재편에 최적입니다. 외적 성과보다 내적 역량 강화에 투자하세요.
3. **현재 대한 최우선**: 지금 걷고 있는 대한의 에너지를 완전히 활용하는 것이 자미두수 시간 전략의 핵심입니다.

> 💫 **총결**: 대한은 운명을 결정하는 것이 아니라 운명의 흐름을 알려주는 나침반입니다. 좋은 대한에서는 과감하게 나서고, 어렵운 대한에서는 내실을 다지세요. 어떤 대한도 준비된 사람에게는 기회가 됩니다.`;
  }

  // 2026 유년 챕터 (key=-3)
  if (chapter.key === -3) {
    // 2026 丙午年 기준 유년궁: 명궁에서 나이에 따른 이동
    const liuNianIdx = (mingIdx + (age - 1)) % 12;
    const liuNianPalace = palaces.find((_,i) => (mingIdx + i)%12 === liuNianIdx) || palaces[0];
    const liuSi = getStarInfo(liuNianPalace.mainStars);

    return `## ${chapter.icon} ${chapter.title}

**2026년 丙午年** · ${name}님 나이 **${age}세** · 유년궁: **${liuNianPalace.label}(${ZHI[liuNianIdx]})**

유년(流年)은 자미두수에서 1년 단위의 미시 운세 분석입니다. 명궁에서 출발해 매년 하나씩 이동하며, 해당 궁의 에너지가 그해의 운세를 결정합니다.

### 🎯 2026년 ${name}님의 유년 분석

2026년, ${name}님의 유년궁은 **${liuNianPalace.label}(${ZHI[liuNianIdx]})**에 위치합니다. 이 궁의 주성 **${liuNianPalace.mainStars.join("·") || "공궁"}**의 에너지가 올해를 지배합니다.

${liuSi.core}

### 📅 2026년 분기별 전략

**Q1 (1~3월)**: ${liuSi.strength.split(",")[0]}을 발휘하는 초반 기반 구축. 새해 계획을 구체적인 첫 행동으로 전환하세요.

**Q2 (4~6월)**: 대외 활동과 네트워킹의 성수기. ${liuNianPalace.label} 에너지가 외부와 연결될 때 최고로 빛납니다.

**Q3 (7~9월)**: 중간 점검 및 방향 조정. ${liuSi.challenge.split(",")[0]}이 나타나는 시기이므로 과욕을 경계하세요.

**Q4 (10~12월)**: 연간 성과 수확 및 내년 준비. 이 시기에 내년 대비 투자를 시작하면 유리합니다.

### ✅ 2026년 Go·Hold·Retreat 판정

- **GO** (적극 추진): ${liuSi.strength.split(",")[0]} 관련 기회 — 즉시 나서세요.
- **HOLD** (관망 유지): 새로운 큰 결정과 투자 — 충분히 검토 후 진행.
- **RETREAT** (후퇴 전략): ${liuSi.challenge.split(",")[0]} 관련 영역 — 과감하게 내려놓으세요.

> 💫 **총결**: 2026년 ${name}님의 유년궁 에너지는 **${liuNianPalace.label}의 ${liuSi.emoji} ${liuSi.name}**입니다. ${liuSi.advice.split(".")[0]}. 이 방향에 집중하면 2026년은 자미두수가 예고하는 가장 좋은 방향으로 흘러갑니다.`;
  }

  return "분석 데이터를 불러올 수 없습니다.";
}

// ─── 세션 스토리지 키 ───────────────────────────────────────────────────────

const ZIWEI_SESSION_KEY = "premium:ziwei:session:v1";
const RESULT_CACHE_KEY = "premium:ziwei:result:v1";

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

type Step = "form" | "computing" | "result";

interface FormState {
  birthYear: string; birthMonth: string; birthDay: string;
  birthHour: string; unknownHour: boolean; name: string; gender: "M" | "F";
}

interface HPremiumZiweiSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void | Promise<void>;
  generationLoading?: boolean;
}

/** 사용자 프로필 스토리지에서 생년월일 읽기 */
function readBirthFromProfile(): { year: string; month: string; day: string; hour: string; name: string; gender: "M" | "F" } | null {
  try {
    for (const store of [sessionStorage, localStorage] as Storage[]) {
      const raw = store.getItem("FORTUNE_APP_VEDIC_PAYLOAD");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.birth?.year) return {
          year: String(p.birth.year), month: String(p.birth.month ?? 1),
          day: String(p.birth.day ?? 1), hour: String(p.birth.hour ?? 12),
          name: p.name || "", gender: (p.gender === "F" ? "F" : "M") as "M" | "F",
        };
      }
    }
    const listRaw = localStorage.getItem("FORTUNE_APP_USER_PROFILES.list");
    const currentId = localStorage.getItem("FORTUNE_APP_USER_PROFILES.current");
    if (listRaw) {
      const list = JSON.parse(listRaw) as { id?: string; birth?: { year?: number; month?: number; day?: number; hour?: number }; name?: string; gender?: string }[];
      const profile = (currentId ? list.find((p) => p.id === currentId) : undefined) ?? list[0];
      if (profile?.birth?.year) return {
        year: String(profile.birth.year), month: String(profile.birth.month ?? 1),
        day: String(profile.birth.day ?? 1), hour: String(profile.birth.hour ?? 12),
        name: profile.name || "", gender: (profile.gender === "F" ? "F" : "M") as "M" | "F",
      };
    }
  } catch (_) {}
  return null;
}

export default function HPremiumZiweiSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: HPremiumZiweiSectionProps = {}) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>({
    birthYear: "", birthMonth: "", birthDay: "", birthHour: "12",
    unknownHour: false, name: "", gender: "M",
  });
  const [result, setResult] = useState<ZiweiResult | null>(null);
  const [savedName, setSavedName] = useState("");
  const [savedYear, setSavedYear] = useState(1990);
  const [activeChapter, setActiveChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const autoComputeRef = useRef(false);

  // 저장된 세션 불러오기
  useEffect(() => {
    try {
      // 1. 캐시된 결과 복원 (최우선)
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (cached) {
        const c = JSON.parse(cached);
        if (c.result && c.name) {
          setResult(c.result);
          setSavedName(c.name);
          setSavedYear(c.year || 1990);
          setStep("result");
          return;
        }
      }
      // 2. 저장된 세션 복원
      const raw = localStorage.getItem(ZIWEI_SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.birthYear && s.birthMonth && s.birthDay) {
          setForm(f => ({
            ...f,
            birthYear: s.birthYear || "",
            birthMonth: s.birthMonth || "",
            birthDay: s.birthDay || "",
            birthHour: s.birthHour !== undefined ? String(s.birthHour) : "12",
            unknownHour: !!s.unknownHour,
            name: s.name || "",
            gender: s.gender || "M",
          }));
          return; // 세션 있으면 프로필 폴백 불필요
        }
      }
      // 3. 프로필 스토리지 폴백: 세션 없을 때 사용자 프로필에서 생년월일 로드
      const profile = readBirthFromProfile();
      if (profile) {
        setForm(f => ({
          ...f,
          birthYear: profile.year,
          birthMonth: profile.month,
          birthDay: profile.day,
          birthHour: profile.hour,
          name: profile.name,
          gender: profile.gender,
        }));
        autoComputeRef.current = true;
      }
    } catch (_) {}
  }, []);

  const handleCompute = useCallback(() => {
    const y = Number(form.birthYear), m = Number(form.birthMonth), d = Number(form.birthDay);
    const h = form.unknownHour ? 12 : Number(form.birthHour);
    if (!y || !m || !d || y < 1920 || y > 2010 || m < 1 || m > 12 || d < 1 || d > 31) {
      alert("생년월일을 정확히 입력해 주세요.");
      return;
    }
    const displayName = form.name.trim() || "당신";
    setStep("computing");
    setProgress(0);
    // 진행 애니메이션
    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 95) { p = 95; clearInterval(timer); }
      setProgress(Math.floor(p));
    }, 120);
    setTimeout(() => {
      try {
        const r = calcZiwei(y, m, d, h);
        clearInterval(timer);
        setProgress(100);
        setSavedName(displayName);
        setSavedYear(y);
        setResult(r);
        // 세션 캐시 저장
        try {
          sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify({ result: r, name: displayName, year: y }));
          localStorage.setItem(ZIWEI_SESSION_KEY, JSON.stringify({
            step: "result",
            birthYear: form.birthYear, birthMonth: form.birthMonth,
            birthDay: form.birthDay, birthHour: String(h),
            unknownHour: form.unknownHour, name: displayName, gender: form.gender,
          }));
        } catch (_) {}
        setTimeout(() => setStep("result"), 400);
      } catch (e) {
        clearInterval(timer);
        console.error(e);
        alert("계산 중 오류가 발생했습니다. 다시 시도해 주세요.");
        setStep("form");
      }
    }, 1800);
  }, [form]);

  // 프로필에서 자동 로드된 경우 즉시 계산
  useEffect(() => {
    if (!autoComputeRef.current) return;
    if (!form.birthYear || !form.birthMonth || !form.birthDay) return;
    autoComputeRef.current = false;
    handleCompute();
  }, [form.birthYear, form.birthMonth, form.birthDay, handleCompute]);

  // ── 스타일 공통 ──
  const rootBg: React.CSSProperties = {
    minHeight: "100dvh",
    background: "linear-gradient(160deg,#07041a 0%,#0e0830 40%,#150a3d 100%)",
    color: "#f0eeff",
    fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  };

  // ── INTRO 화면 ──
  if (showIntro) {
    return (
      <section style={{ background: "linear-gradient(145deg,#07041a 0%,#0e0830 100%)", borderRadius: 24, overflow: "hidden" }}>
        <img src="/fuctionassets/jamigod.webp" alt="자미두수 프리미엄 소개" style={{ width: "100%", maxHeight: 280, objectFit: "cover", opacity: 0.44 }} />
        <div style={{ padding: "18px 18px 22px" }}>
          <p style={{ color: "rgba(167,139,250,0.7)", fontSize: "0.66rem", letterSpacing: "0.28em", margin: 0 }}>ZIWEI PREMIUM · 로컬 완전 계산</p>
          <h3 style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", margin: "8px 0 6px" }}>자미두수(紫微斗數) 심화 분석</h3>
          <p style={{ color: "rgba(196,181,253,0.72)", fontSize: "0.88rem", lineHeight: 1.8, margin: 0 }}>
            16챕터 자미두수 완전 분석 · 12궁 명반 · 대한 사화 배치 · 브라우저 로컬 계산
          </p>
          <button
            type="button"
            onClick={() => onStartGeneration?.()}
            disabled={generationLoading}
            style={{
              marginTop: 14, width: "100%", borderRadius: 11, padding: "14px",
              fontSize: "0.96rem", fontWeight: 900,
              background: generationLoading ? "rgba(30,20,60,0.6)" : "linear-gradient(135deg,#5b21b6,#7c3aed)",
              border: "none",
              color: generationLoading ? "rgba(148,163,184,0.5)" : "#fff",
              cursor: generationLoading ? "wait" : "pointer",
              letterSpacing: "0.08em", opacity: generationLoading ? 0.72 : 1,
            }}
          >
            {generationLoading ? "코인 확인 중…" : "자미두수 심화 분석 시작하기"}
          </button>
        </div>
      </section>
    );
  }

  // ── FORM 화면 ──
  if (step === "form") {
    return (
      <div style={rootBg}>
        {/* 히어로 배너 */}
        <div style={{
          position: "relative", width: "100%", height: "220px", overflow: "hidden",
          background: "linear-gradient(135deg,#1a0840 0%,#2d1066 50%,#3d1480 100%)",
        }}>
          <img
            src="/fuctionassets/jamigod.webp"
            alt="자미두수 심화 분석"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              opacity: 0.45, mixBlendMode: "luminosity",
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg,transparent 0%,rgba(7,4,26,0.85) 100%)",
          }}/>
          <div style={{ position: "relative", zIndex: 2, padding: "36px 24px 0", textAlign: "center" }}>
            <div style={{ fontSize: "2.6rem", filter: "drop-shadow(0 0 24px rgba(167,139,250,0.8))" }}>🌌</div>
            <h1 style={{ color: "#f5f3ff", fontSize: "1.25rem", fontWeight: 900, margin: "8px 0 4px", letterSpacing: "0.04em" }}>
              자미두수(紫微斗數) 심화 분석
            </h1>
            <p style={{ color: "rgba(196,181,253,0.8)", fontSize: "0.82rem", margin: 0 }}>
              16챕터 · 12궁 완전 해독 · 로컬 계산 · 완전 무료
            </p>
          </div>
        </div>

        {/* 입력 폼 */}
        <div style={{ padding: "24px 20px 48px", maxWidth: "480px", margin: "0 auto" }}>
          <div style={{
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(196,181,253,0.18)",
            borderRadius: "18px", padding: "24px 20px",
          }}>
            <h2 style={{ color: "#e9d5ff", fontSize: "1rem", fontWeight: 700, margin: "0 0 18px", textAlign: "center" }}>
              ✨ 생년월일시 입력
            </h2>

            {/* 이름 */}
            <label style={labelStyle}>이름 (선택)</label>
            <input
              type="text" value={form.name} placeholder="이름 또는 닉네임"
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
              style={inputStyle}
            />

            {/* 성별 */}
            <label style={labelStyle}>성별</label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
              {(["M","F"] as const).map(g => (
                <button key={g} onClick={() => setForm(f => ({...f, gender: g}))}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid",
                    borderColor: form.gender === g ? "#a78bfa" : "rgba(196,181,253,0.25)",
                    background: form.gender === g ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                    color: form.gender === g ? "#c4b5fd" : "rgba(196,181,253,0.6)",
                    fontWeight: form.gender === g ? 700 : 400, fontSize: "0.9rem", cursor: "pointer",
                  }}>
                  {g === "M" ? "♂ 남성" : "♀ 여성"}
                </button>
              ))}
            </div>

            {/* 생년 */}
            <label style={labelStyle}>출생년도</label>
            <input
              type="number" value={form.birthYear} placeholder="예: 1990"
              min={1920} max={2010}
              onChange={e => setForm(f => ({...f, birthYear: e.target.value}))}
              style={inputStyle}
            />

            {/* 생월 */}
            <label style={labelStyle}>출생월</label>
            <select value={form.birthMonth} onChange={e => setForm(f => ({...f, birthMonth: e.target.value}))} style={inputStyle}>
              <option value="">월 선택</option>
              {Array.from({length:12},(_,i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
            </select>

            {/* 생일 */}
            <label style={labelStyle}>출생일</label>
            <select value={form.birthDay} onChange={e => setForm(f => ({...f, birthDay: e.target.value}))} style={inputStyle}>
              <option value="">일 선택</option>
              {Array.from({length:31},(_,i) => <option key={i+1} value={i+1}>{i+1}일</option>)}
            </select>

            {/* 출생시각 */}
            <label style={labelStyle}>출생 시각</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <select
                value={form.birthHour} disabled={form.unknownHour}
                onChange={e => setForm(f => ({...f, birthHour: e.target.value}))}
                style={{ ...inputStyle, flex: 1, marginBottom: 0, opacity: form.unknownHour ? 0.4 : 1 }}>
                {Array.from({length:24},(_,i) => <option key={i} value={i}>{i}시</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(196,181,253,0.7)", fontSize: "0.82rem", whiteSpace: "nowrap", cursor: "pointer" }}>
                <input type="checkbox" checked={form.unknownHour} onChange={e => setForm(f => ({...f, unknownHour: e.target.checked}))} />
                모름
              </label>
            </div>

            {/* 제출 버튼 */}
            <button onClick={handleCompute} style={{
              width: "100%", padding: "16px", marginTop: "8px",
              background: "linear-gradient(135deg,#5b21b6 0%,#7c3aed 60%,#9333ea 100%)",
              color: "#fff", border: "none", borderRadius: "14px",
              fontWeight: 800, fontSize: "1.05rem", cursor: "pointer",
              boxShadow: "0 12px 32px rgba(91,33,182,0.5)",
              letterSpacing: "0.03em",
            }}>
              🌌 자미두수 심화 분석 시작
            </button>
            <p style={{ color: "rgba(196,181,253,0.4)", fontSize: "0.72rem", textAlign: "center", marginTop: "12px" }}>
              모든 계산은 브라우저 내에서 로컬로 처리됩니다 · 완전 무료
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPUTING 화면 ──
  if (step === "computing") {
    const msgs = [
      "명궁(命宮) 주성을 탐색하는 중...", "신궁(身宮) 배치를 계산하는 중...",
      "12궁 주성을 배치하는 중...", "사화(四化) 변환 코드를 해독하는 중...",
      "대한(大限) 10년 흐름을 펼치는 중...", "16챕터 심층 분석을 완성하는 중...",
    ];
    const msgIdx = Math.floor((progress / 100) * msgs.length);
    return (
      <div style={{ ...rootBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "48px 24px" }}>
        <img src="/fuctionassets/jamigod.webp" alt="" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(167,139,250,0.5)", filter: "drop-shadow(0 0 24px rgba(139,92,246,0.7))", animation: "pulse-ziwei 2s ease-in-out infinite" }} />
        <style>{`@keyframes pulse-ziwei{0%,100%{transform:scale(1);filter:drop-shadow(0 0 24px rgba(139,92,246,0.7))}50%{transform:scale(1.06);filter:drop-shadow(0 0 36px rgba(139,92,246,1))}}`}</style>
        <div style={{ fontSize: "2rem", filter: "drop-shadow(0 0 18px rgba(167,139,250,1))", animation: "pulse-ziwei 1.8s ease-in-out infinite" }}>🌌</div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#c4b5fd", fontWeight: 700, fontSize: "1rem", margin: "0 0 6px" }}>12궁 명반 로컬 계산 중</p>
          <p style={{ color: "rgba(196,181,253,0.65)", fontSize: "0.82rem", margin: 0 }}>{msgs[Math.min(msgIdx, msgs.length-1)]}</p>
        </div>
        <div style={{ width: "280px", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: "99px", transition: "width 0.15s ease" }}/>
        </div>
        <p style={{ color: "rgba(196,181,253,0.4)", fontSize: "0.75rem" }}>{progress}% 완료</p>
      </div>
    );
  }

  // ── RESULT 화면 ──
  if (step === "result" && result) {
    const chapter = CHAPTERS[activeChapter];
    const content = buildChapterContent(activeChapter, chapter, result, savedName, savedYear);

    // 마크다운 라인 → JSX
    const renderContent = (text: string) => {
      return text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#e9d5ff", fontSize: "1.1rem", fontWeight: 900, margin: "0 0 12px", lineHeight: 1.4 }}>{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} style={{ color: "#c4b5fd", fontSize: "0.95rem", fontWeight: 700, margin: "18px 0 8px", lineHeight: 1.4 }}>{line.slice(4)}</h3>;
        if (line.startsWith("> ")) return <blockquote key={i} style={{ borderLeft: "3px solid #7c3aed", paddingLeft: "12px", margin: "16px 0 0", color: "rgba(221,214,254,0.85)", fontSize: "0.85rem", lineHeight: 1.7 }}>{renderInline(line.slice(2))}</blockquote>;
        if (line.startsWith("- ") || /^\d+\. /.test(line)) return <li key={i} style={{ color: "rgba(221,214,254,0.85)", fontSize: "0.88rem", lineHeight: 1.8, marginBottom: "4px" }}>{renderInline(line.replace(/^[-\d\.] /,"").replace(/^\d+\. /,""))}</li>;
        if (!line.trim()) return <br key={i}/>;
        return <p key={i} style={{ color: "rgba(221,214,254,0.82)", fontSize: "0.88rem", lineHeight: 1.85, margin: "0 0 10px" }}>{renderInline(line)}</p>;
      });
    };

    const renderInline = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, i) =>
        p.startsWith("**") ? <strong key={i} style={{ color: "#e9d5ff", fontWeight: 700 }}>{p.slice(2,-2)}</strong> : p
      );
    };

    const mingPalace = result.palaces[0];
    const shenPalaceObj = result.palaces.find((_,i) => (result.mingIdx + i) % 12 === result.shenIdx);

    return (
      <div style={rootBg}>
        {/* 히어로 헤더 */}
        <div style={{ position: "relative", width: "100%", height: "160px", overflow: "hidden", background: "linear-gradient(135deg,#1a0840,#2d1066,#3d1480)" }}>
          <img src="/fuctionassets/jamigod.webp" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", opacity: 0.35, mixBlendMode: "luminosity" }}/>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent,rgba(7,4,26,0.9))" }}/>
          <div style={{ position: "relative", zIndex: 2, padding: "28px 20px 0", textAlign: "center" }}>
            <p style={{ color: "#c4b5fd", fontSize: "0.78rem", margin: "0 0 4px" }}>🌌 자미두수 심화 분석 — {savedName}님</p>
            <p style={{ color: "rgba(196,181,253,0.6)", fontSize: "0.73rem", margin: 0 }}>
              명궁({ZHI[result.mingIdx]}) · {mingPalace.mainStars.join("·") || "공궁"} &nbsp;|&nbsp;
              신궁({ZHI[result.shenIdx]}) · {shenPalaceObj?.mainStars.join("·") || "공궁"} &nbsp;|&nbsp;
              {result.yearGan}{result.yearZhi}年
            </p>
          </div>
        </div>

        {/* 12궁 명반 보드 */}
        <div style={{ padding: "12px 14px 0" }}>
          <style>{`@keyframes ziweiTwinkle{0%,100%{opacity:.42;transform:scale(1)}50%{opacity:.9;transform:scale(1.08)}}`}</style>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "18px",
              border: "1px solid rgba(196,181,253,0.22)",
              background:
                "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.18) 0%, rgba(17,24,39,0.28) 42%, rgba(9,10,34,0.96) 100%)",
              boxShadow: "0 22px 42px rgba(2,6,23,0.6)",
              padding: "12px",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(circle at 10% 22%, rgba(255,255,255,0.45) 0 1px, transparent 2px), radial-gradient(circle at 24% 78%, rgba(255,255,255,0.35) 0 1px, transparent 2px), radial-gradient(circle at 41% 18%, rgba(255,255,255,0.4) 0 1.1px, transparent 2px), radial-gradient(circle at 62% 74%, rgba(255,255,255,0.3) 0 1px, transparent 2px), radial-gradient(circle at 83% 34%, rgba(255,255,255,0.34) 0 1px, transparent 2px)",
                opacity: 0.45,
              }}
            />

            <div
              aria-hidden
              style={{
                position: "absolute",
                left: "13%",
                top: "16%",
                color: "rgba(250,204,21,0.74)",
                fontSize: "10px",
                animation: "ziweiTwinkle 2.3s ease-in-out infinite",
              }}
            >
              ✦
            </div>
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: "14%",
                bottom: "14%",
                color: "rgba(125,211,252,0.7)",
                fontSize: "11px",
                animation: "ziweiTwinkle 2.8s ease-in-out infinite",
              }}
            >
              ✦
            </div>

            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "8px",
              }}
            >
              {([0, 1, 2, 3, 11, -1, -1, 4, 10, -1, -1, 5, 9, 8, 7, 6] as const).map((slot, idx) => {
                if (slot === -1) {
                  if (idx !== 5) return null;
                  return (
                    <article
                      key="center-core"
                      style={{
                        gridColumn: "2 / span 2",
                        gridRow: "2 / span 2",
                        borderRadius: "14px",
                        border: "1px solid rgba(250,204,21,0.38)",
                        background:
                          "radial-gradient(circle at 50% 42%, rgba(251,191,36,0.2), rgba(30,41,59,0.78) 58%, rgba(15,23,42,0.9) 100%)",
                        boxShadow: "inset 0 0 36px rgba(59,130,246,0.2)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "10px 8px",
                        minHeight: "120px",
                      }}
                    >
                      <div style={{ color: "#fde047", fontWeight: 900, letterSpacing: "0.03em", fontSize: "1.02rem" }}>
                        자미두수 명반
                      </div>
                      <div style={{ marginTop: "5px", color: "#dbeafe", fontSize: "0.74rem", lineHeight: 1.6 }}>
                        명궁: {ZHI[result.mingIdx]} · 신궁: {ZHI[result.shenIdx]}
                      </div>
                      <div style={{ color: "rgba(196,181,253,0.8)", fontSize: "0.72rem", lineHeight: 1.6 }}>
                        {result.yearGan}{result.yearZhi}年 · 12궁 별자리 흐름
                      </div>
                      <div style={{ color: "rgba(186,230,253,0.88)", marginTop: "4px", fontSize: "0.7rem" }}>
                        化祿 {ZHI[result.sihua.luk]} · 化權 {ZHI[result.sihua.quan]} · 化科 {ZHI[result.sihua.ke]} · 化忌 {ZHI[result.sihua.ji]}
                      </div>
                    </article>
                  );
                }

                const palace = result.palaces[slot];
                if (!palace) return null;

                const isMing = palace.idx === result.mingIdx;
                const isShen = palace.idx === result.shenIdx;
                const sihuaLabel =
                  palace.idx === result.sihua.luk
                    ? "화록"
                    : palace.idx === result.sihua.quan
                      ? "화권"
                      : palace.idx === result.sihua.ke
                        ? "화과"
                        : palace.idx === result.sihua.ji
                          ? "화기"
                          : "";
                const daihanTag = result.daihan.find((d) => d.palaceIdx === palace.idx);

                return (
                  <article
                    key={`${palace.label}-${palace.idx}`}
                    style={{
                      position: "relative",
                      borderRadius: "12px",
                      border: isMing
                        ? "1px solid rgba(250,204,21,0.78)"
                        : isShen
                          ? "1px solid rgba(125,211,252,0.78)"
                          : "1px solid rgba(196,181,253,0.3)",
                      background:
                        "linear-gradient(145deg, rgba(30,27,75,0.9), rgba(17,24,39,0.88))",
                      minHeight: "78px",
                      padding: "8px 7px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <strong style={{ color: "#e9d5ff", fontSize: "0.71rem", lineHeight: 1.3 }}>{palace.label}</strong>
                      <span style={{ color: "rgba(45,212,191,0.84)", fontSize: "0.66rem", fontWeight: 700 }}>{palace.zhi}</span>
                    </div>

                    <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {(palace.mainStars.length ? palace.mainStars.slice(0, 2) : ["공궁"]).map((star) => (
                        <span
                          key={star}
                          style={{
                            fontSize: "0.64rem",
                            lineHeight: 1.2,
                            padding: "2px 5px",
                            borderRadius: "999px",
                            color: star === "공궁" ? "rgba(226,232,240,0.66)" : "#fef3c7",
                            background: star === "공궁" ? "rgba(51,65,85,0.62)" : "rgba(124,58,237,0.34)",
                            border: star === "공궁" ? "1px solid rgba(148,163,184,0.3)" : "1px solid rgba(196,181,253,0.34)",
                          }}
                        >
                          {star}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: "5px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <span style={{ color: "rgba(226,232,240,0.64)", fontSize: "0.6rem" }}>
                        {daihanTag ? `${daihanTag.age}-${daihanTag.age + 9}` : ""}
                      </span>
                      {sihuaLabel ? (
                        <span style={{ color: "#fef08a", fontSize: "0.6rem", fontWeight: 700 }}>
                          {sihuaLabel}
                        </span>
                      ) : null}
                    </div>

                    {(isMing || isShen) && (
                      <span
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "6px",
                          fontSize: "0.58rem",
                          color: isMing ? "#fde047" : "#7dd3fc",
                          fontWeight: 800,
                        }}
                      >
                        {isMing ? "명" : "신"}
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* 챕터 탭 네비게이션 */}
        <div style={{ padding: "12px 14px 0", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "8px", paddingBottom: "4px" }}>
            {CHAPTERS.map((ch, i) => (
              <button key={i} onClick={() => setActiveChapter(i)} style={{
                flexShrink: 0, padding: "6px 14px",
                background: activeChapter === i ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${activeChapter === i ? "#a78bfa" : "rgba(196,181,253,0.18)"}`,
                borderRadius: "20px", color: activeChapter === i ? "#c4b5fd" : "rgba(196,181,253,0.55)",
                fontSize: "0.75rem", fontWeight: activeChapter === i ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {ch.icon} {ch.title.split("(")[0].split("·")[0].trim()}
              </button>
            ))}
          </div>
        </div>

        {/* 챕터 콘텐츠 */}
        <div style={{ padding: "16px 14px 48px" }}>
          <div style={{
            background: "rgba(139,92,246,0.06)", border: "1px solid rgba(196,181,253,0.15)",
            borderRadius: "16px", padding: "20px 16px",
          }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ color: "rgba(196,181,253,0.45)", fontSize: "0.72rem" }}>Chapter {activeChapter + 1} / {CHAPTERS.length}</span>
            </div>
            <div>{renderContent(content)}</div>

            <section
              style={{
                marginTop: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(147,197,253,0.28)",
                background: "rgba(8, 17, 38, 0.65)",
                padding: "12px 11px",
              }}
              aria-label="자미두수 결과 도출 원리 설명"
            >
              <h3
                style={{
                  margin: "0 0 6px",
                  color: "#dbeafe",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                }}
              >
                {ZIWEI_PREMIUM_METHOD_COPY.heading}
              </h3>
              <p style={{ margin: "0 0 6px", color: "rgba(219,234,254,0.88)", fontSize: "0.8rem", lineHeight: 1.8 }}>
                {ZIWEI_PREMIUM_METHOD_COPY.paragraphs[0]}
              </p>
              <p style={{ margin: 0, color: "rgba(219,234,254,0.82)", fontSize: "0.8rem", lineHeight: 1.8 }}>
                {ZIWEI_PREMIUM_METHOD_COPY.paragraphs[1]}
              </p>
            </section>
          </div>

          {/* 네비게이션 버튼 */}
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button
              onClick={() => setActiveChapter(a => Math.max(0, a - 1))}
              disabled={activeChapter === 0}
              style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(196,181,253,0.2)", color: "#c4b5fd", fontSize: "0.88rem", cursor: activeChapter === 0 ? "not-allowed" : "pointer", opacity: activeChapter === 0 ? 0.4 : 1 }}>
              ← 이전
            </button>
            <button
              onClick={() => setActiveChapter(a => Math.min(CHAPTERS.length - 1, a + 1))}
              disabled={activeChapter === CHAPTERS.length - 1}
              style={{ flex: 1, padding: "12px", borderRadius: "12px", background: activeChapter === CHAPTERS.length - 1 ? "rgba(255,255,255,0.06)" : "rgba(139,92,246,0.3)", border: `1px solid ${activeChapter === CHAPTERS.length - 1 ? "rgba(196,181,253,0.2)" : "#a78bfa"}`, color: "#c4b5fd", fontSize: "0.88rem", cursor: activeChapter === CHAPTERS.length - 1 ? "not-allowed" : "pointer", opacity: activeChapter === CHAPTERS.length - 1 ? 0.4 : 1 }}>
              다음 →
            </button>
          </div>

          {/* 다시 하기 버튼 */}
          <button
            onClick={() => { setStep("form"); setResult(null); setActiveChapter(0); try { sessionStorage.removeItem(RESULT_CACHE_KEY); } catch(_){} }}
            style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "12px", background: "transparent", border: "1px solid rgba(196,181,253,0.2)", color: "rgba(196,181,253,0.55)", fontSize: "0.83rem", cursor: "pointer" }}>
            🔄 다른 사람으로 다시 분석
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// 공통 스타일
const labelStyle: React.CSSProperties = {
  display: "block", color: "rgba(196,181,253,0.7)", fontSize: "0.8rem",
  fontWeight: 600, marginBottom: "6px",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", marginBottom: "14px",
  background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(196,181,253,0.22)",
  borderRadius: "10px", color: "#e9d5ff", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box",
};
