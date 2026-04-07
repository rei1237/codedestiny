import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GAN_KR = {
  甲:"갑", 乙:"을", 丙:"병", 丁:"정", 戊:"무",
  己:"기", 庚:"경", 辛:"신", 壬:"임", 癸:"계",
};
const ZHI_KR = {
  子:"자", 丑:"축", 寅:"인", 卯:"묘", 辰:"진", 巳:"사",
  午:"오", 未:"미", 申:"신", 酉:"유", 戌:"술", 亥:"해",
};
const GAN_ELEMENT = {
  甲:"목", 乙:"목", 丙:"화", 丁:"화", 戊:"토",
  己:"토", 庚:"금", 辛:"금", 壬:"수", 癸:"수",
};
const ZHI_ELEMENT = {
  子:"수", 丑:"토", 寅:"목", 卯:"목", 辰:"토", 巳:"화",
  午:"화", 未:"토", 申:"금", 酉:"금", 戌:"토", 亥:"수",
};
const GAN_NAMES = {
  갑:"갑목(甲木)", 을:"을목(乙木)", 병:"병화(丙火)", 정:"정화(丁火)",
  무:"무토(戊土)", 기:"기토(己土)", 경:"경금(庚金)", 신:"신금(辛金)",
  임:"임수(壬水)", 계:"계수(癸水)",
};
const STEM_TRAITS = {
  갑:["리더십","직진형","단호한","성장형"],   을:["섬세함","배려심","감성적","유연함"],
  병:["활발함","솔직함","열정적","화끈함"],   정:["따뜻함","헌신적","로맨틱","섬세함"],
  무:["신중함","믿음직한","책임감","안정적"], 기:["살뜰함","현실적","다정함","살갑함"],
  경:["강직함","원칙주의","냉철한","냉정함"], 신:["섬세함","완벽주의","예민한","깔끔함"],
  임:["자유로움","유연함","탐구적","흐르는"],  계:["내면적","직관적","감수성","신비로움"],
};
const IDEAL_SPOTS = {
  갑:"자연 속 트레킹이나 아웃도어 활동",
  을:"조용한 카페나 꽃집, 소규모 공방",
  병:"루프탑 바나 야경 명소, 활기찬 파티",
  정:"감성 레스토랑이나 캔들 무드 카페",
  무:"자연 속 캠핑, 시골 드라이브",
  기:"맛집 탐방이나 재래시장, 집밥",
  경:"스포츠 활동이나 경쟁적 보드게임",
  신:"아트 갤러리나 독립 서점, 와인바",
  임:"여행이나 드라이브, 새벽 바다",
  계:"집에서 영화감상, 인디 공연, 조용한 술자리",
};
const DM_EMOJI = {
  갑:"🌲", 을:"🌸", 병:"☀️", 정:"🕯️", 무:"⛰️",
  기:"🌾", 경:"⚔️", 신:"💎", 임:"🌊", 계:"🌧️",
};
const SCEN_EMOJIS = { 목:"🌿✨", 화:"🔥💫", 토:"🌙🍂", 금:"⚔️💎", 수:"🌊🌌" };
const FAV_TASTE   = { 목:"신맛", 화:"쓴맛", 토:"단맛", 금:"매운맛", 수:"짠맛" };
const DOHWA_ZHI   = new Set(["子","午","卯","酉"]);

/* ── 십신(十神) 계산 ── */
const GAN_YANG = new Set(['甲','丙','戊','庚','壬']); // 양간
// 상생: 내가 생하는 오행
const EL_GENERATES = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
// 상극: 내가 극하는 오행
const EL_CONTROLS  = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };

function getSipsin(dayGan, targetGan) {
  const dayEl  = GAN_ELEMENT[dayGan];
  const tarEl  = GAN_ELEMENT[targetGan];
  if (!dayEl || !tarEl) return '비견';
  const daYin = !GAN_YANG.has(dayGan);
  const taYin = !GAN_YANG.has(targetGan);
  const same  = daYin === taYin;
  if (dayEl === tarEl) return same ? '비견' : '겁재';
  if (EL_GENERATES[dayEl] === tarEl) return same ? '식신' : '상관';
  if (EL_CONTROLS[dayEl]  === tarEl) return same ? '편재' : '정재';
  if (EL_CONTROLS[tarEl]  === dayEl) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
}

/* 일간 기준 주요 십신 타입 (천간 4개 기준) */
function getMainSipsin(dayGan, allGans) {
  const counts = {};
  allGans.filter(g => g !== dayGan).forEach(g => {
    const ss = getSipsin(dayGan, g);
    counts[ss] = (counts[ss] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '비견';
}

const SIPSIN_TRAITS = {
  비견: ["독립적","자존심 강함","경쟁심"],
  겁재: ["기복 있음","카리스마","승부욕"],
  식신: ["재치 있음","말이 많음","유머러스"],
  상관: ["표현력 강함","창의적","반골기질"],
  편재: ["활동적","화끈함","재물감각"],
  정재: ["현실적","성실함","안정추구"],
  편관: ["강압적","카리스마","츤데레"],
  정관: ["원칙주의","신뢰","예의바름"],
  편인: ["독특함","직감적","내면적"],
  정인: ["배려깊음","사색적","엄마같은 면모"],
};

// lunar-javascript – CommonJS 모듈이므로 require 사용
let _Solar = null;
function getSolar() {
  if (!_Solar) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("lunar-javascript");
    _Solar = mod.Solar;
  }
  return _Solar;
}

function inferMBTI(el) {
  const E = el["화"] + el["목"] > el["금"] + el["수"] ? "E" : "I";
  const N = el["화"] + el["목"] > 4 ? "N" : "S";
  const T = el["금"] + el["수"] > 4 ? "T" : "F";
  const J = el["토"] > 1 ? "J" : "P";
  return E + N + T + J;
}

function makeGreeting(name, stemKr, mbti) {
  const greetings = {
    갑:[`"${name}야, 처음 보는 사람한테 먼저 말 거는 거 별로 안 하는데… 뭔가 달라 보여서."`,`"나 ${name}이야. 직접적으로 말할게—네가 좀 궁금해."`],
    을:[`"아, 안녕… 나 ${name}이야. 사람 많은 데가 좀 어색해서…"`,`"${name}이야. 왠지 네 옆이 편할 것 같아서 왔어."`],
    병:[`"어 안녕! 나 ${name}! 여기 분위기 진짜 좋지 않아? 완전 내 스타일이야."`,`"나 ${name}! 먼저 말 거는 거 너무 자연스러워. 잘 부탁해 😄"`],
    정:[`"처음인데 낯설지 않아. 나 ${name}이야… 왠지 오래 알던 느낌이다."`,`"${name}이야. 네가 좀 걱정돼 보여서 말 걸었어. 괜찮아?"`],
    무:[`"${name}이야. 사람 쉽게 믿진 않는데, 네한테는 좀 다른 것 같아."`,`"나 ${name}. 오래 걸리겠지만 한번 알아가 보자."`],
    기:[`"어, 안녕~ 나 ${name}이야! 배고프지 않아? 근처에 맛있는 데 알아."`,`"${name}이야. 처음 보는데 친근하다. 나 좀 특이한 편이야."`],
    경:[`"${name}이야. 빙빙 돌리는 거 딱 싫어해, 그냥 솔직하게 대화하자."`,`"나 ${name}. 시간 낭비 별로야—마음에 들면 계속 보고 아니면 그냥 끝."`],
    신:[`"…${name}이야. 말 무뚝뚝하게 한다고 했지? 사실 많이 생각해."`,`"${name}이야. 나 까다롭다는 말 많이 듣는데, 그래도 괜찮아?"`],
    임:[`"${name}이야~ 사실 지금 머릿속에 생각이 열두 갈래인데—같이 얘기해볼래?"`,`"나 ${name}. 한곳에 오래 못 있는 편이야, 근데 네 앞에선 있고 싶어."`],
    계:[`"…${name}이야. 조용히 관찰하는 편이라서. 그냥 뭔가 끌려서 온 거야."`,`"나 ${name}이야. 말 잘 못하는 편인데… 너한테는 하고 싶어졌어."`],
  };
  const opts = greetings[stemKr] || [`"안녕, 나 ${name}이야."`];
  return opts[Math.floor(Math.random() * opts.length)];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { year, month, day, hour, name, gender } = body;

    const y = Number(year), mo = Number(month), d = Number(day), h = Number(hour ?? 12);
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) {
      return NextResponse.json({ error: "invalid-input" }, { status: 400 });
    }

    const Solar = getSolar();
    const solar = Solar.fromYmdHms(y, mo, d, h, 0, 0);
    const lunar = solar.getLunar();
    const ec    = lunar.getEightChar();

    const yg = ec.getYearGan(),  yz = ec.getYearZhi();
    const mg = ec.getMonthGan(), mz = ec.getMonthZhi();
    const dg = ec.getDayGan(),   dz = ec.getDayZhi();
    const tg = ec.getTimeGan(),  tz = ec.getTimeZhi();

    // 오행 카운트 (천간 가중 2, 지지 가중 1)
    const elemCount = { 목:0, 화:0, 토:0, 금:0, 수:0 };
    [yg, mg, dg, tg].forEach(g => { const e = GAN_ELEMENT[g]; if (e) elemCount[e] += 2; });
    [yz, mz, dz, tz].forEach(z => { const e = ZHI_ELEMENT[z]; if (e) elemCount[e] += 1; });

    const total = Object.values(elemCount).reduce((a, b) => a + b, 0) || 1;
    const fiveElements = {};
    Object.keys(elemCount).forEach(k => { fiveElements[k] = Math.round(elemCount[k] / total * 100); });

    const dayMasterGanKr   = GAN_KR[dg]  || dg;
    const dayMasterElement = GAN_ELEMENT[dg] || "토";
    const coreTraits       = STEM_TRAITS[dayMasterGanKr] || ["다정함","신중함","매력적"];
    const mbti             = inferMBTI(elemCount);
    // 용신: 가장 적은 오행
    const yongshin = Object.entries(elemCount).sort((a, b) => a[1] - b[1])[0][0];
    const dohwa    = DOHWA_ZHI.has(yz) || DOHWA_ZHI.has(dz);

    const el = fiveElements;
    const stats = {
      passion:     Math.min(99, 30 + Math.round((el["화"]||0)*0.9 + (el["목"]||0)*0.4)),
      empathy:     Math.min(99, 30 + Math.round((el["수"]||0)*0.8 + (el["목"]||0)*0.5)),
      logic:       Math.min(99, 30 + Math.round((el["금"]||0)*0.9 + (el["수"]||0)*0.3)),
      stability:   Math.min(99, 30 + Math.round((el["토"]||0)*1.0 + (el["금"]||0)*0.3)),
      sociability: Math.min(99, 30 + Math.round((el["화"]||0)*0.7 + (el["목"]||0)*0.7)),
    };

    const initialAffinity = 10 + Math.round((fiveElements[yongshin] || 0) / 5);

    // 십신 계산
    const mainSipsin = getMainSipsin(dg, [yg, mg, tg]);
    const sipsinTraits = SIPSIN_TRAITS[mainSipsin] || [];

    // 사주 성격 요약 (system prompt 주입용)
    const sajuPersonaSummary = `${name}은(는) ${GAN_NAMES[dayMasterGanKr]}을 일간으로 가진 사람으로, ` +
      `오행 성향은 ${dayMasterElement} 기운이 강하다. ` +
      `주요 십신은 ${mainSipsin}으로, ${(sipsinTraits).join(', ')} 특성을 보인다. ` +
      `용신은 ${yongshin}이고, 이상형 데이트 장소는 ${IDEAL_SPOTS[dayMasterGanKr] || '분위기 좋은 카페'}를 선호한다. ` +
      `MBTI는 ${mbti}형에 가깝다.`;

    return NextResponse.json({
      pillars: {
        year:  { gan:yg, zhi:yz, ganKr:GAN_KR[yg]||yg,  zhiKr:ZHI_KR[yz]||yz,  text:yg+yz  },
        month: { gan:mg, zhi:mz, ganKr:GAN_KR[mg]||mg, zhiKr:ZHI_KR[mz]||mz, text:mg+mz },
        day:   { gan:dg, zhi:dz, ganKr:GAN_KR[dg]||dg,  zhiKr:ZHI_KR[dz]||dz,  text:dg+dz  },
        hour:  { gan:tg, zhi:tz, ganKr:GAN_KR[tg]||tg,  zhiKr:ZHI_KR[tz]||tz,  text:tg+tz  },
      },
      elemCount,
      fiveElements,
      stats,
      dayMasterGan:     dg,
      dayMasterGanKr,
      dayMasterElement,
      dayMasterName:    GAN_NAMES[dayMasterGanKr] || dg,
      mbti,
      coreTraits,
      yongshin,
      initialAffinity,
      mainSipsin,
      sipsinTraits,
      sajuPersonaSummary,
      specialStars:     dohwa ? ["도화살"] : [],
      idealDateSpot:    IDEAL_SPOTS[dayMasterGanKr] || "분위기 좋은 카페",
      favTaste:         FAV_TASTE[dayMasterElement] || "단맛",
      scenarioEmoji:    SCEN_EMOJIS[dayMasterElement] || "✨",
      dmEmoji:          DM_EMOJI[dayMasterGanKr] || "✨",
      greeting:         makeGreeting(name || "이름없음", dayMasterGanKr, mbti),
      name:             name || "이름없음",
      gender:           gender || "남",
    });
  } catch (e) {
    console.error("[love-saju-pillar]", e);
    return NextResponse.json({ error: "calc-failed", message: String(e) }, { status: 500 });
  }
}
