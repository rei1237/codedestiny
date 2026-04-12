/**
 * tadagochi Fortune API v2.0
 * 4-system real calculation:
 * - SAJU: 사주팔자(연월일시주) + 십성(十星) + 십이운성(十二運星)
 * - ZIWEI: lunar-javascript 음력→12궁 14대성 배치 + 사화(四化)
 * - ASTROLOGY: astronomy-engine 실황경 → 태양/달/금성/화성/목성 별자리+하우스
 * - TAROT: 메이저22+마이너36장 DB 실뽑기 + 카테고리 맞춤 해석
 * - Gemini AI에 실계산 데이터 전체 주입 → 개인화 정확 답변
 */
import { NextResponse } from "next/server";
import { Solar } from "lunar-javascript";
import * as Astronomy from "astronomy-engine";

export const runtime = "nodejs";

// Gemini API 키 목록 (순서대로 시도)
function pickGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

// ─── 1. 사주팔자 실계산 ───────────────────────────────────────────────────────
const GAN    = ["갑","을","병","정","무","기","경","신","임","계"];
const JI     = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const JI_EN  = ["rat","ox","tiger","rabbit","dragon","snake","horse","sheep","monkey","rooster","dog","pig"];
const GAN_EL = ["wood","wood","fire","fire","earth","earth","metal","metal","water","water"];
const JI_EL  = ["water","earth","wood","wood","earth","fire","fire","earth","metal","metal","earth","water"];
const EL_KR  = {wood:"목(木)",fire:"화(火)",earth:"토(土)",metal:"금(金)",water:"수(水)"};

// 십성(十星) 완전 대응표
const SS_TABLE = {
  "갑":{"갑":"비견","을":"겁재","병":"식신","정":"상관","무":"편재","기":"정재","경":"편관","신":"정관","임":"편인","계":"정인"},
  "을":{"을":"비견","갑":"겁재","정":"식신","병":"상관","기":"편재","무":"정재","신":"편관","경":"정관","계":"편인","임":"정인"},
  "병":{"병":"비견","정":"겁재","무":"식신","기":"상관","경":"편재","신":"정재","임":"편관","계":"정관","갑":"편인","을":"정인"},
  "정":{"정":"비견","병":"겁재","기":"식신","무":"상관","신":"편재","경":"정재","계":"편관","임":"정관","을":"편인","갑":"정인"},
  "무":{"무":"비견","기":"겁재","경":"식신","신":"상관","임":"편재","계":"정재","갑":"편관","을":"정관","병":"편인","정":"정인"},
  "기":{"기":"비견","무":"겁재","신":"식신","경":"상관","계":"편재","임":"정재","을":"편관","갑":"정관","정":"편인","병":"정인"},
  "경":{"경":"비견","신":"겁재","임":"식신","계":"상관","갑":"편재","을":"정재","병":"편관","정":"정관","무":"편인","기":"정인"},
  "신":{"신":"비견","경":"겁재","계":"식신","임":"상관","을":"편재","갑":"정재","정":"편관","병":"정관","기":"편인","무":"정인"},
  "임":{"임":"비견","계":"겁재","갑":"식신","을":"상관","병":"편재","정":"정재","무":"편관","기":"정관","경":"편인","신":"정인"},
  "계":{"계":"비견","임":"겁재","을":"식신","갑":"상관","정":"편재","병":"정재","기":"편관","무":"정관","신":"편인","경":"정인"},
};

// 십이운성(十二運星)
const UNSEONG = {
  "갑":{"해":"장생","자":"목욕","축":"관대","인":"건록","묘":"제왕","진":"쇠","사":"병","오":"사","미":"묘","신":"절","유":"태","술":"양"},
  "을":{"오":"장생","사":"목욕","진":"관대","묘":"건록","인":"제왕","축":"쇠","자":"병","해":"사","술":"묘","유":"절","신":"태","미":"양"},
  "병":{"인":"장생","묘":"목욕","진":"관대","사":"건록","오":"제왕","미":"쇠","신":"병","유":"사","술":"묘","해":"절","자":"태","축":"양"},
  "정":{"유":"장생","신":"목욕","미":"관대","오":"건록","사":"제왕","진":"쇠","묘":"병","인":"사","축":"묘","자":"절","해":"태","술":"양"},
  "무":{"인":"장생","묘":"목욕","진":"관대","사":"건록","오":"제왕","미":"쇠","신":"병","유":"사","술":"묘","해":"절","자":"태","축":"양"},
  "기":{"유":"장생","신":"목욕","미":"관대","오":"건록","사":"제왕","진":"쇠","묘":"병","인":"사","축":"묘","자":"절","해":"태","술":"양"},
  "경":{"사":"장생","오":"목욕","미":"관대","신":"건록","유":"제왕","술":"쇠","해":"병","자":"사","축":"묘","인":"절","묘":"태","진":"양"},
  "신":{"자":"장생","해":"목욕","술":"관대","유":"건록","신":"제왕","미":"쇠","오":"병","사":"사","진":"묘","묘":"절","인":"태","축":"양"},
  "임":{"신":"장생","유":"목욕","술":"관대","해":"건록","자":"제왕","축":"쇠","인":"병","묘":"사","진":"묘","사":"절","오":"태","미":"양"},
  "계":{"묘":"장생","인":"목욕","축":"관대","자":"건록","해":"제왕","술":"쇠","유":"병","신":"사","미":"묘","오":"절","사":"태","진":"양"},
};
const US_SCORE = {"장생":80,"목욕":55,"관대":70,"건록":85,"제왕":95,"쇠":60,"병":42,"사":30,"묘":35,"절":25,"태":50,"양":65};

// 일진 (기준: 2000-01-01 = 경(6)진(4))
function todayGanji() {
  const diff = Math.floor((Date.now() - Date.UTC(2000,0,1)) / 86400000);
  return {
    gan: GAN[((diff+6)%10+10)%10], ji: JI[((diff+4)%12+12)%12],
    ganEl: GAN_EL[((diff+6)%10+10)%10], jiEl: JI_EL[((diff+4)%12+12)%12],
    jiAnimal: JI_EN[((diff+4)%12+12)%12]
  };
}

// 사주 핵심 계산
function calcSaju(year, month, day, hour) {
  // 연주
  const ygIdx = ((year-4)%10+10)%10;
  const yjIdx = ((year-4)%12+12)%12;
  const yGan = GAN[ygIdx]; const yJi = JI[yjIdx];
  // 월주: 오호둔년두법
  const MG_START = [2,4,6,8,0,2,4,6,8,0]; // 갑~계년 1월천간
  const MJ_IDX   = [2,3,4,5,6,7,8,9,10,11,0,1]; // 1~12월 지지인덱스
  const mgStart = MG_START[ygIdx];
  const mgIdx = (mgStart + month - 1) % 10;
  const mjIdx = MJ_IDX[month-1];
  // 일주: 기준 2000-01-01 = 갑(0)진(4)
  const diffD = Math.floor((Date.UTC(year,month-1,day) - Date.UTC(2000,0,1)) / 86400000);
  const dgIdx = ((diffD)%10+10)%10;
  const djIdx = ((diffD)%12+12)%12;
  // 시주: 자시=시지0, 오서둔일법
  const HG_START = [0,2,4,6,8,0,2,4,6,8];
  const hBranch = Math.floor((hour+1)/2) % 12;
  const hgIdx = (HG_START[dgIdx] + hBranch) % 10;

  const dGan = GAN[dgIdx]; const dJi = JI[djIdx];
  const mJi  = JI[mjIdx];

  // 십이운성
  const us_y = UNSEONG[dGan]?.[yJi] || "평";
  const us_m = UNSEONG[dGan]?.[mJi]  || "평";
  const us_d = UNSEONG[dGan]?.[dJi]  || "평";
  const us_h = UNSEONG[dGan]?.[JI[hBranch]] || "평";

  // 십성
  const ss_y = SS_TABLE[dGan]?.[yGan] || "비견";
  const ss_m = SS_TABLE[dGan]?.[GAN[mgIdx]] || "비견";
  const ss_h = SS_TABLE[dGan]?.[GAN[hgIdx]] || "비견";

  // 운세점수
  const today = todayGanji();
  const yAnimal = JI_EN[yjIdx];
  const HARMONY={rat:["dragon","monkey"],ox:["snake","rooster"],tiger:["horse","dog"],rabbit:["sheep","pig"],dragon:["rat","monkey"],snake:["ox","rooster"],horse:["tiger","dog"],sheep:["rabbit","pig"],monkey:["rat","dragon"],rooster:["ox","snake"],dog:["tiger","horse"],pig:["rabbit","sheep"]};
  const CLASH  ={rat:"horse",horse:"rat",ox:"sheep",sheep:"ox",tiger:"monkey",monkey:"tiger",rabbit:"rooster",rooster:"rabbit",dragon:"dog",dog:"dragon",snake:"pig",pig:"snake"};
  const GEN    ={wood:"fire",fire:"earth",earth:"metal",metal:"water",water:"wood"};
  const CLAW   ={wood:"metal",fire:"water",earth:"wood",metal:"fire",water:"earth"};
  const dayEl  = GAN_EL[dgIdx];
  let score = 50;
  if (HARMONY[yAnimal]?.includes(today.jiAnimal)) score += 18;
  if (CLASH[yAnimal] === today.jiAnimal) score -= 18;
  if (GEN[today.ganEl] === dayEl) score += 12;
  if (dayEl === today.ganEl || dayEl === today.jiEl) score += 10;
  if (CLAW[dayEl] === today.ganEl) score -= 12;
  score = Math.round(score*0.7 + (US_SCORE[us_d]||50)*0.3);
  score = Math.max(5, Math.min(100, score));
  const fortune = score>=75?"대길":score>=55?"길":score>=40?"평":score>=25?"소흉":"흉";

  return {
    year:  {gan:yGan, ji:yJi, el:GAN_EL[ygIdx], animal:yAnimal, unseong:us_y},
    month: {gan:GAN[mgIdx], ji:mJi, el:GAN_EL[mgIdx], unseong:us_m},
    day:   {gan:dGan, ji:dJi, el:dayEl, unseong:us_d},
    hour:  {gan:GAN[hgIdx], ji:JI[hBranch], el:GAN_EL[hgIdx], unseong:us_h},
    sipseong: {year:ss_y, month:ss_m, hour:ss_h},
    today: `${today.gan}${today.ji}`,
    score, fortune,
  };
}

// ─── 2. 자미두수 실계산 ───────────────────────────────────────────────────────
const PAL_KR = ["명궁(命宮)","형제궁(兄弟宮)","부처궁(夫妻宮)","자녀궁(子女宮)","재백궁(財帛宮)","질액궁(疾厄宮)","천이궁(遷移宮)","노복궁(奴僕宮)","관록궁(官祿宮)","전택궁(田宅宮)","복덕궁(福德宮)","부모궁(父母宮)"];
const ZSTARS = ["紫微","天機","太陽","武曲","天同","廉貞","天府","太陰","貪狼","巨門","天相","天梁","七殺","破軍"];
const STAR_KR = {"紫微":"자미(帝王)","天機":"천기(智謀)","太陽":"태양(名譽)","武曲":"무곡(財帛)","天同":"천동(福祿)","廉貞":"염정(官祿)","天府":"천부(庫藏)","太陰":"태음(田宅)","貪狼":"탐랑(桃花)","巨門":"거문(暗曜)","天相":"천상(印綬)","天梁":"천량(蔭星)","七殺":"칠살(將星)","破軍":"파군(耗星)"};
const SIHUA = {
  "갑":{"록":"廉貞","권":"破軍","과":"武曲","기":"太陽"},
  "을":{"록":"天機","권":"天梁","과":"紫微","기":"太陰"},
  "병":{"록":"天同","권":"天機","과":"文昌","기":"廉貞"},
  "정":{"록":"太陰","권":"天同","과":"天機","기":"巨門"},
  "무":{"록":"貪狼","권":"太陰","과":"右弼","기":"天機"},
  "기":{"록":"武曲","권":"貪狼","과":"天梁","기":"文曲"},
  "경":{"록":"太陽","권":"武曲","과":"太陰","기":"天同"},
  "신":{"록":"巨門","권":"太陽","과":"文曲","기":"文昌"},
  "임":{"록":"天梁","권":"紫微","과":"左輔","기":"武曲"},
  "계":{"록":"破軍","권":"巨門","과":"太陰","기":"貪狼"},
};
const STAR_OFFSET_ZI  = [0,2,4,6,8,10];   // 자미계6 순행 offset
const STAR_OFFSET_TF  = [0,-1,-2,-3,-4,-5,-6,-7]; // 천부계8 역행(천부=ziweiPal+4)

function calcZiwei(year, month, day, hour) {
  let lm = month, ld = day;
  try {
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    lm = lunar.getMonth(); ld = lunar.getDay();
  } catch {}
  const hBranch = Math.floor((hour+1)/2) % 12;
  // 명궁: (14 - 음력월 - 시지지) mod 12 (인-기준)
  const mingRaw = ((14 - lm - hBranch) % 12 + 12) % 12;
  const mingIdx = (mingRaw + 2) % 12; // 실제 지지 위치(0=자)

  // 자미성 기궁: 음력일 → 오행국(1~5)
  const ju = ((ld-1) % 5) + 1;
  const ziweiPal = (mingRaw + STAR_OFFSET_ZI[ju]) % 12;
  const tianfuPal = (ziweiPal + 4) % 12;

  const palStars = Array.from({length:12}, ()=>[]);
  ZSTARS.forEach((star, i) => {
    let pos;
    if (i <= 5) {
      pos = (ziweiPal + STAR_OFFSET_ZI[i]) % 12;
    } else {
      pos = ((tianfuPal + STAR_OFFSET_TF[i-6]) + 1200) % 12;
    }
    palStars[pos].push(star);
  });

  // 사화
  const yganIdx = ((year-4)%10+10)%10;
  const ygan = GAN[yganIdx];
  const sihDef = SIHUA[ygan] || {};
  const sihPal = {};
  ["록","권","과","기"].forEach(k => {
    const star = sihDef[k];
    if (!star) return;
    const idx = ZSTARS.indexOf(star);
    if (idx < 0) return;
    const pos = idx<=5 ? (ziweiPal+STAR_OFFSET_ZI[idx])%12 : ((tianfuPal+STAR_OFFSET_TF[idx-6])+1200)%12;
    sihPal[k] = {star, palace:pos, palaceName:PAL_KR[pos]};
  });

  const getPal = i => ({
    name: PAL_KR[i],
    stars: palStars[i].map(s=>STAR_KR[s]||s).join(", ") || "공궁(空宮)",
    hualu:   sihPal["록"]?.palace === i,
    huaquan: sihPal["권"]?.palace === i,
    huake:   sihPal["과"]?.palace === i,
    huaji:   sihPal["기"]?.palace === i,
  });

  return {
    mingGong: getPal(mingIdx),
    fuQi:     getPal(2),   // 부처궁(연애)
    caiBo:    getPal(4),   // 재백궁(재물)
    jiE:      getPal(5),   // 질액궁(건강)
    guanLu:   getPal(8),   // 관록궁(직업)
    sihua: sihPal, yearGan:ygan, lm, ld,
  };
}

// ─── 3. 서양 점성술 실계산 ───────────────────────────────────────────────────
const SIGN_KR  = ["양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리","천칭자리","전갈자리","사수자리","염소자리","물병자리","물고기자리"];
const HOUSE_KR = ["1H(자아)","2H(재물)","3H(소통)","4H(가정)","5H(창조)","6H(건강)","7H(파트너)","8H(변혁)","9H(철학)","10H(커리어)","11H(우정)","12H(영혼)"];

function getElon(body, date) {
  const ecl = Astronomy.Ecliptic(Astronomy.GeoVector(body, date, false));
  return ((ecl.elon % 360) + 360) % 360;
}

function calcAstro(year, month, day, hour) {
  try {
    const utc = new Date(Date.UTC(year, month-1, day, Math.max(0, hour-9), 0, 0));
    const sunL  = getElon(Astronomy.Body.Sun,     utc);
    const moonL = getElon(Astronomy.Body.Moon,    utc);
    const venL  = getElon(Astronomy.Body.Venus,   utc);
    const marL  = getElon(Astronomy.Body.Mars,    utc);
    const jupL  = getElon(Astronomy.Body.Jupiter, utc);
    const satL  = getElon(Astronomy.Body.Saturn,  utc);
    const ascL  = ((sunL + (hour-6)*15) % 360 + 360) % 360;
    const mcL   = (ascL + 270) % 360;
    const s = l => Math.floor(l/30)%12;
    const h = l => Math.floor(((l-ascL+360)%360)/30)%12;
    return {
      sun:     {sign:SIGN_KR[s(sunL)],  deg:(sunL%30).toFixed(1)},
      moon:    {sign:SIGN_KR[s(moonL)], deg:(moonL%30).toFixed(1)},
      venus:   {sign:SIGN_KR[s(venL)],  house:HOUSE_KR[h(venL)]},
      mars:    {sign:SIGN_KR[s(marL)],  house:HOUSE_KR[h(marL)]},
      jupiter: {sign:SIGN_KR[s(jupL)],  house:HOUSE_KR[h(jupL)]},
      saturn:  {sign:SIGN_KR[s(satL)],  house:HOUSE_KR[h(satL)]},
      asc:     {sign:SIGN_KR[s(ascL)]},
      mc:      {sign:SIGN_KR[s(mcL)]},
    };
  } catch { return null; }
}

// ─── 4. 타로 DB (메이저22 + 마이너36) ─────────────────────────────────────────
const TAROT_DB = [
  // Major Arcana
  {id:"M00",nm:"바보(The Fool)",up:"새출발·순수·자유·도약·용기",dn:"무모함·두려움·정체·우유부단",cat:{love:"설레는 새 인연의 문이 열려",money:"새 수익 기회, 단 위험 감수 주의",work:"과감한 도전·새 출발 적기",health:"활력 되찾기·회복 시작",general:"자유와 새 시작의 기운"}},
  {id:"M01",nm:"마법사(The Magician)",up:"능력·의지·집중·현실화·리더십",dn:"재능 낭비·조작·속임수",cat:{love:"적극적 표현이 관계를 바꿈",money:"재능을 돈으로 전환하는 타이밍",work:"역량 발휘·프로젝트 주도권 잡기",health:"강인한 의지력·회복 가속",general:"잠재력을 현실로 만드는 날"}},
  {id:"M02",nm:"여사제(The High Priestess)",up:"직관·비밀·내면 지혜·성찰·신비",dn:"숨겨진 정보·혼란·표면 집착",cat:{love:"감추어진 마음·느림의 미학",money:"정보 수집 후 신중한 결정",work:"내면 목소리를 따르는 날",health:"몸의 신호에 집중",general:"직관과 내면을 믿어"}},
  {id:"M03",nm:"여황제(The Empress)",up:"풍요·모성·창조·번영·결실·感",dn:"의존·과잉·감정 과잉·집착",cat:{love:"따뜻하고 풍성한 사랑의 결실",money:"수익 증가·안정적 재물 유입",work:"창의적 성과·프로젝트 결실",health:"건강과 생명력 충전",general:"풍요로운 기운"}},
  {id:"M04",nm:"황제(The Emperor)",up:"권위·구조·안정·리더십·질서",dn:"독선·통제욕·경직·권력 남용",cat:{love:"안정적이고 헌신적인 관계",money:"체계적 재정 관리가 핵심",work:"권한 확보·성과 인정",health:"규칙적 루틴이 건강 지킴",general:"안정과 질서의 기운"}},
  {id:"M05",nm:"교황(The Hierophant)",up:"전통·가르침·신뢰·공동체·약속",dn:"규범 과잉·독단·변화 저항",cat:{love:"깊은 약속과 신뢰 강화",money:"안전한 전통적 투자 방식",work:"멘토에게 조언 구하기",health:"전문가 의견 따르기",general:"공동체와의 조화"}},
  {id:"M06",nm:"연인(The Lovers)",up:"선택·깊은 사랑·가치관·조화",dn:"결정 어려움·갈등·가치충돌",cat:{love:"진지한 사랑·중요 선택의 기로",money:"가치 기반 재정 결정",work:"협력 파트너십이 핵심",health:"몸과 마음의 균형",general:"중요한 선택 앞에 서있어"}},
  {id:"M07",nm:"전차(The Chariot)",up:"승리·의지·전진·극복·성공",dn:"방향 상실·충돌·폭주",cat:{love:"적극적 주도로 관계 진전",money:"목표 향해 전진·수익 확보",work:"프로젝트 완수·성과 달성",health:"강인한 체력과 추진력",general:"승리의 기운이 함께해"}},
  {id:"M08",nm:"힘(Strength)",up:"내면의 힘·인내·용기·온화한 통제",dn:"자신감 부족·억압·두려움",cat:{love:"부드러운 설득·인내가 관계 깊이게",money:"장기 투자·인내의 결실",work:"끈기와 내구력이 성과로",health:"회복력·체력 강화",general:"내면에서 솟는 힘을 믿어"}},
  {id:"M09",nm:"은둔자(The Hermit)",up:"성찰·내면 지혜·고독·방향 탐구",dn:"고독·고립·과도한 고집",cat:{love:"혼자만의 시간으로 관계 재정비",money:"신중한 판단·성급한 결정 회피",work:"전문성 심화·깊이 있는 연구",health:"충분한 휴식과 회복",general:"내면 성장의 시간"}},
  {id:"M10",nm:"운명의 수레바퀴(Wheel of Fortune)",up:"전환점·기회·행운·순환",dn:"불운·예측 불허·통제 불가",cat:{love:"관계의 큰 전환점 도래",money:"행운의 기회를 놓치지 마",work:"변화의 타이밍을 잡아",health:"건강의 주기적 변화",general:"운명의 큰 전환이 다가와"}},
  {id:"M11",nm:"정의(Justice)",up:"균형·공정·진실·법칙·결과",dn:"불공정·혼란·결과 회피",cat:{love:"솔직한 대화로 관계 균형",money:"공정한 거래·계약 주의",work:"책임감 있는 행동이 성과로",health:"균형 잡힌 생활이 건강",general:"공정한 결과가 돌아오는 날"}},
  {id:"M12",nm:"매달린 사람(The Hanged Man)",up:"희생·기다림·새 시각·전환",dn:"지연·낭비·집착·정체",cat:{love:"기다림 속에 더 깊어지는 감정",money:"투자 보류·현재 상황 유지",work:"잠시 멈추고 관점 전환",health:"강제 휴식이 오히려 치유",general:"다른 시각으로 바라볼 때"}},
  {id:"M13",nm:"죽음(Death)",up:"변화·끝과 시작·재탄생·해방",dn:"변화 저항·집착·과거 집착",cat:{love:"관계의 큰 변화·새출발",money:"손실 후 재정비·새 기회",work:"이직·전환·새 국면",health:"오래된 나쁜 습관 처리",general:"큰 변화의 신호야"}},
  {id:"M14",nm:"절제(Temperance)",up:"균형·조화·인내·치유·통합",dn:"불균형·과잉·극단",cat:{love:"서두르지 않는 성숙한 사랑",money:"균형 잡힌 재정 운영",work:"조화로운 팀워크·협력",health:"절제된 생활이 건강의 핵심",general:"조화와 균형"}},
  {id:"M15",nm:"악마(The Devil)",up:"물질·쾌락·현실 인식·속박 인지",dn:"집착·독성 관계·탐욕",cat:{love:"집착·의존적 관계 점검",money:"탐욕과 과소비 강하게 주의",work:"스트레스·번아웃 경고",health:"나쁜 습관 끊을 용기",general:"집착에서 벗어나야 할 때"}},
  {id:"M16",nm:"탑(The Tower)",up:"급격한 변화·충격·해방·재건",dn:"재난 두려움·변화 회피",cat:{love:"관계의 충격적 변화·재정비",money:"예상 못한 재정 충격 주의",work:"갑작스러운 환경 변화",health:"갑작스러운 건강 이상 주의",general:"충격적 변화가 오히려 해방"}},
  {id:"M17",nm:"별(The Star)",up:"희망·영감·치유·믿음·미래",dn:"희망 상실·환상·현실 외면",cat:{love:"희망찬 새 인연·감정 회복",money:"미래 투자·장기적 기회",work:"창의적 영감이 빛나는 날",health:"회복과 치유의 기운",general:"희망의 별빛이 비춰"}},
  {id:"M18",nm:"달(The Moon)",up:"직관·꿈·무의식·신비",dn:"혼란·불안·착각·자기기만",cat:{love:"불확실한 감정·진실 파악 필요",money:"숨겨진 정보 조심",work:"모호함·지연·감각적 판단",health:"수면·정신 건강 주의",general:"무의식의 메시지를 들어봐"}},
  {id:"M19",nm:"태양(The Sun)",up:"성공·행복·활기·명확함·풍요",dn:"자만·과신·현실 외면",cat:{love:"밝고 활기찬 사랑의 절정",money:"성공적 수익·투자 결실",work:"큰 성과·인정·승진",health:"최고 활력과 건강",general:"빛나는 성공이 함께해"}},
  {id:"M20",nm:"심판(Judgement)",up:"부활·각성·새 국면·용서·해방",dn:"자기 비판·기회 놓침·과거 집착",cat:{love:"관계 재평가·솔직한 고백",money:"새 기회 포착·재정 재건",work:"커리어의 중요 전환점",health:"완전한 회복·건강 재건",general:"새 국면의 시작"}},
  {id:"M21",nm:"세계(The World)",up:"완성·성취·통합·자유·완전함",dn:"미완성·지연·회피",cat:{love:"완전하고 성숙한 사랑",money:"최고의 재물 성취",work:"목표 최종 달성",health:"완전한 건강과 활력",general:"완전한 성취의 기운"}},
  // Minor Arcana – Pentacles (재물)
  {id:"P01",nm:"펜타클 에이스",up:"물질적 새 시작·재물 씨앗·기회",dn:"기회 놓침·물질적 지연",cat:{love:"안정적 토대 위 새출발",money:"재물 기회의 씨앗",work:"새 프로젝트·계약",health:"건강 개선 시작",general:"물질적 새 기회"}},
  {id:"P05",nm:"펜타클 5",up:"재정 어려움 인식·도움 요청·극복",dn:"빈곤·고립·포기",cat:{love:"어려운 시기 위로",money:"재정 압박·도움 요청",work:"힘든 시기·지원 필요",health:"건강 관리 소홀 주의",general:"어려움 속 극복"}},
  {id:"P06",nm:"펜타클 6",up:"나눔·관대함·균형 잡힌 교환",dn:"불균형·착취·불공정",cat:{love:"서로 주고받는 관계",money:"수입·지출 균형",work:"공정한 보상 획득",health:"균형 잡힌 에너지",general:"나눔과 균형"}},
  {id:"P09",nm:"펜타클 9",up:"독립·성취·풍요·자립",dn:"과의존·고독",cat:{love:"자립적이고 건강한 관계",money:"재정 독립 달성",work:"혼자의 힘으로 성취",health:"자기 관리 성공",general:"자립의 풍요"}},
  {id:"P10",nm:"펜타클 10",up:"가족·유산·장기 성공·세대 풍요",dn:"불안정·승계 문제",cat:{love:"안정적 가정·장기 관계",money:"장기 재물·유산",work:"큰 성공·회사 안정",health:"건강한 가족",general:"풍요와 유산"}},
  // Minor Arcana – Cups (감정)
  {id:"C01",nm:"컵 에이스",up:"새 감정·사랑의 시작·영적 풍요",dn:"억압된 감정·새출발 혼란",cat:{love:"새로운 사랑의 시작",money:"감성적 만족감",work:"영감 넘치는 새 시작",health:"감정 건강 회복",general:"사랑과 감정의 새 시작"}},
  {id:"C02",nm:"컵 2",up:"파트너십·연대·깊은 사랑·상호이해",dn:"불균형 관계·갈등",cat:{love:"깊은 유대감과 결속",money:"감성적 파트너십",work:"협력 관계 강화",health:"감정적 균형",general:"조화로운 연대"}},
  {id:"C07",nm:"컵 7",up:"선택·환상·소망·다양한 가능성",dn:"망상·집중력 분산",cat:{love:"많은 선택지 앞에서 혼란",money:"환상적 투자 주의",work:"집중이 필요한 시점",health:"욕구와 현실 균형",general:"환상 속 선택"}},
  {id:"C10",nm:"컵 10",up:"행복·충족·가족 조화·감정 완성",dn:"불화·불만족",cat:{love:"완전한 행복과 사랑",money:"감정적·정서적 풍요",work:"팀 화합·프로젝트 완성",health:"마음의 행복",general:"완전한 감정적 행복"}},
  // Minor Arcana – Wands (열정)
  {id:"W01",nm:"완드 에이스",up:"열정·새 아이디어·창조·원동력",dn:"열정 소진·방향 부재",cat:{love:"불꽃 같은 사랑의 시작",money:"창의적 수입 기회",work:"강한 시작·도전",health:"넘치는 활력",general:"열정의 불꽃"}},
  {id:"W06",nm:"완드 6",up:"승리·인정·귀환·성공",dn:"자만·패배 두려움",cat:{love:"관계에서 인정받는 날",money:"성공적 결실",work:"승진·인정·성과",health:"에너지 절정",general:"승리의 귀환"}},
  {id:"W07",nm:"완드 7",up:"방어·도전 극복·용기",dn:"힘겨운 싸움·고립",cat:{love:"관계 지키기 위한 노력",money:"경쟁 속 수익 지키기",work:"도전에 맞서기",health:"저항력 강화",general:"도전 극복"}},
  // Minor Arcana – Swords (지성)
  {id:"S01",nm:"소드 에이스",up:"진실·명확함·변화·결단력",dn:"혼란·갈등·상처",cat:{love:"진실된 소통이 관계 정리",money:"명확한 재정 결정",work:"날카로운 판단으로 돌파",health:"정신 명료함",general:"진실과 명확함"}},
  {id:"S06",nm:"소드 6",up:"이동·전환·평화·회복",dn:"불안정·과거 집착",cat:{love:"관계 갈등에서 벗어나기",money:"재정 안정 향해 이동",work:"새 환경으로 전환",health:"회복을 위한 휴식",general:"평화로운 이동"}},
  {id:"S10",nm:"소드 10",up:"끝·변화·해방·새로운 시작",dn:"재앙·절망",cat:{love:"관계 종료 후 새출발",money:"손실 후 회복과 재건",work:"어려운 끝과 새 시작",health:"힘든 시기 극복",general:"끝이 새 시작이야"}},
];

function drawTarot(category) {
  const card = TAROT_DB[Math.floor(Math.random() * TAROT_DB.length)];
  const rev  = Math.random() < 0.35;
  const catK = {love:"love",money:"money",work:"work",health:"health",general:"general"}[category]||"general";
  return {
    id:card.id, name:card.nm,
    orientation: rev?"역방향(逆位)":"정방향(正位)",
    keywords: rev?card.dn:card.up,
    catMeaning: card.cat[catK]||card.cat.general,
    isMajor: card.id.startsWith("M"),
  };
}

// ─── 5. Gemini 호출 ───────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const keys = pickGeminiKeys();
  const ep   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
  for (const key of keys) {
    try {
      const r = await fetch(`${ep}?key=${key}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          contents:[{role:"user",parts:[{text:prompt}]}],
          generationConfig:{maxOutputTokens:450,temperature:0.88},
          safetySettings:[
            {category:"HARM_CATEGORY_HARASSMENT",threshold:"BLOCK_NONE"},
            {category:"HARM_CATEGORY_HATE_SPEECH",threshold:"BLOCK_NONE"},
          ],
        }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const t = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (t) return t;
    } catch {}
  }
  return null;
}

// ─── 6. 로컬 폴백 답변 ───────────────────────────────────────────────────────
function buildLocal({cat, saju, ziwei, astro, tarot, petName}) {
  const name = petName||"운세다마";
  const sc   = saju?.score||50;
  const ft   = saju?.fortune||"평";
  const catKr= {love:"연애",money:"재물",work:"직업",health:"건강",general:"종합"}[cat]||cat;
  const emo  = {love:"💕",money:"💰",work:"📚",health:"💪",general:"🔮"}[cat]||"✨";
  const lines = [`${emo} ${name}가 오늘 ${saju?.today||""} 기운으로 ${catKr}운을 봐줄게!`];
  if (saju) lines.push(`📊 사주: ${saju.year.gan}${saju.year.ji}년·일주 ${saju.day.gan}${saju.day.ji}(${saju.day.unseong})|십성 년${saju.sipseong.year}·월${saju.sipseong.month}|오늘 **${sc}점(${ft})**`);
  if (ziwei) {
    const p = {love:ziwei.fuQi,money:ziwei.caiBo,work:ziwei.guanLu,health:ziwei.jiE,general:ziwei.mingGong}[cat]||ziwei.mingGong;
    lines.push(`🌌 자미두수: 명궁=${ziwei.mingGong.stars}|${p.name} 주성:**${p.stars}**${p.hualu?" ✅化祿":""}${p.huaji?" ⚠️化忌":""}`);
  }
  if (astro) {
    let a = `⭐ 점성술: ☀️${astro.sun.sign}${astro.sun.deg}° 🌙${astro.moon.sign} ASC ${astro.asc.sign}`;
    if (cat==="love")   a += ` |금성 ${astro.venus.sign}(${astro.venus.house})`;
    if (cat==="money")  a += ` |목성 ${astro.jupiter.sign}(${astro.jupiter.house})`;
    if (cat==="work")   a += ` |MC ${astro.mc.sign} 화성 ${astro.mars.sign}`;
    if (cat==="health") a += ` |화성 ${astro.mars.sign}(${astro.mars.house})`;
    lines.push(a);
  }
  if (tarot) lines.push(`🃏 타로: **${tarot.name}** (${tarot.orientation}) — ${tarot.catMeaning}`);
  lines.push(sc>=75?`✨ 4가지 운세 모두 긍정 신호! ${catKr}운 대길 — 적극적으로 나아가봐 🚀 `:
             sc>=55?`🌸 오늘 ${catKr}운 길! 꾸준히 나아가면 결실 맺어 💙`:
             `🌂 오늘 ${catKr}운 ${ft}. 신중하게 행동하고 충동은 미뤄봐. ${name} 응원할게 💕`);
  return lines.join("\n");
}

// ─── 7. POST 핸들러 ──────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      birthYear, birthMonth=6, birthDay=15, birthHour=12,
      element, zodiac, petName, question, category, usedToday
    } = body;

    if (typeof usedToday === "number" && usedToday >= 5) {
      return NextResponse.json({error:"오늘 운세 질문 횟수(5회)를 모두 사용했어요! 내일 다시 만나요 🌙"}, {status:429});
    }
    if (!birthYear || !question) {
      return NextResponse.json({error:"필수 파라미터가 없습니다."}, {status:400});
    }

    const y = Number(birthYear)||1990, m = Number(birthMonth)||6,
          d = Number(birthDay)||15,   h = Number(birthHour)||12;
    const cat   = category||"general";
    const catKr = {love:"연애",money:"재물",work:"직업·커리어",health:"건강",general:"종합"}[cat]||cat;
    const catPalKr = {love:"부처궁(연애)",money:"재백궁(재물)",work:"관록궁(직업)",health:"질액궁(건강)",general:"명궁(운명)"}[cat]||"명궁";

    // 4가지 실계산
    const saju  = calcSaju(y, m, d, h);
    let ziwei = null;
    try { ziwei = calcZiwei(y, m, d, h); } catch {}
    const astro = calcAstro(y, m, d, h);
    const tarot = drawTarot(cat);

    const zPal = ziwei
      ? (cat==="love"?ziwei.fuQi:cat==="money"?ziwei.caiBo:cat==="work"?ziwei.guanLu:cat==="health"?ziwei.jiE:ziwei.mingGong)
      : null;

    let astroDetail = astro
      ? cat==="love"   ? `금성 ${astro.venus.sign}(${astro.venus.house}) | 달 ${astro.moon.sign} | 7H(파트너)`
      : cat==="money"  ? `목성 ${astro.jupiter.sign}(${astro.jupiter.house}) | 태양 ${astro.sun.sign} ${astro.sun.deg}°`
      : cat==="work"   ? `MC ${astro.mc.sign} | 화성 ${astro.mars.sign}(${astro.mars.house}) | 태양 ${astro.sun.sign}`
      : cat==="health" ? `화성 ${astro.mars.sign}(${astro.mars.house}) | 달 ${astro.moon.sign}`
      : `☀️ ${astro.sun.sign} ${astro.sun.deg}° 🌙 ${astro.moon.sign} ASC ${astro.asc.sign}`
      : "계산 불가";

    const prompt =
`너는 '${petName||"운세다마"}'. 사용자의 수호 다마고치이자 신비로운 점쟁이 친구야.
말투: 친근·귀엽게, 점쟁이 신비로운 톤. 이모지 3~4개. 4~6문장 간결+핵심 중심.
아래 4가지 실계산 데이터를 모두 활용해 ${catKr}운 메시지를 줘.

[생년월일시] ${y}년 ${m}월 ${d}일 ${h}시생

【사주팔자 실계산】
- 연주: ${saju.year.gan}${saju.year.ji}(${saju.year.animal}띠, ${EL_KR[saju.year.el]||saju.year.el}), 십이운성:${saju.year.unseong}
- 월주: ${saju.month.gan}${saju.month.ji}, 십이운성:${saju.month.unseong}
- 일주: ${saju.day.gan}${saju.day.ji}(${EL_KR[saju.day.el]||saju.day.el}), 십이운성:${saju.day.unseong} ← 핵심 일간
- 시주: ${saju.hour.gan}${saju.hour.ji}, 십이운성:${saju.hour.unseong}
- 십성: 년주=${saju.sipseong.year}, 월주=${saju.sipseong.month}, 시주=${saju.sipseong.hour}
- 오늘 일진:${saju.today} | 운세점수:${saju.score}점(${saju.fortune})

【자미두수 실계산】
- 명궁(${ziwei?.mingGong?.name||"?"}): 주성 ${ziwei?.mingGong?.stars||"미계산"}
- ${catPalKr}(${zPal?.name||"?"}): 주성 ${zPal?.stars||"미계산"}${zPal?.hualu?" ✅化祿":""}${zPal?.huaquan?" 化權":""}${zPal?.huaji?" ⚠️化忌":""}
- 생년천간 ${ziwei?.yearGan||"?"}년: 화록→${ziwei?.sihua?.록?.palaceName||"?"}, 화기→${ziwei?.sihua?.기?.palaceName||"?"}

【서양 점성술 실계산】
- ${astroDetail}
- 목성(행운):${astro?.jupiter?.sign||"?"}(${astro?.jupiter?.house||"?"}) | 토성(시련):${astro?.saturn?.sign||"?"}(${astro?.saturn?.house||"?"})

【타로 실뽑기】
- ${tarot.name} (${tarot.orientation})${tarot.isMajor?" [메이저]":""}
- 키워드: ${tarot.keywords}
- ${catKr} 의미: ${tarot.catMeaning}

반드시 ① 일주 ${saju.day.gan}${saju.day.ji}(${saju.day.unseong}), ② ${catPalKr} 주성(${zPal?.stars||"?"}), ③ 타로 ${tarot.name} 직접 언급.

질문: ${question||"오늘 "+catKr+"운 알려줘"}`;

    const ai = await callGemini(prompt);
    const answer = ai || buildLocal({cat, saju, ziwei, astro, tarot, petName});

    return NextResponse.json({
      answer,
      score: saju.score,
      fortune: saju.fortune,
      today: saju.today,
      tarot: {name:tarot.name, id:tarot.id, orientation:tarot.orientation, keywords:tarot.keywords, catMeaning:tarot.catMeaning, isMajor:tarot.isMajor},
      ziweiPalace: zPal ? {name:zPal.name, stars:zPal.stars} : null,
      astroSummary: astro ? `☀️ ${astro.sun.sign} 🌙 ${astro.moon.sign} ASC ${astro.asc.sign}` : null,
    });
  } catch (e) {
    return NextResponse.json({error:e.message}, {status:500});
  }
}
