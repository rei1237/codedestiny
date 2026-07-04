import { ZiweiChartData, ZiweiPalaceData } from "./ziwei-engine";
import { AdvancedZiweiResult, getPalaceData } from "./ziwei-normalization";

const ZIWEI_INTERPRETATIONS_TEXT_TRANSLATIONS = {
  ko: {
    "ziweiInterpretations.001": "성도 리포트 오리엔테이션",
    "ziweiInterpretations.002": "타고난 운명 축",
    "ziweiInterpretations.003": "본질적인 성향",
    "ziweiInterpretations.004": "직업적 적성",
    "ziweiInterpretations.005": "재물운",
    "ziweiInterpretations.006": "애정, 인연운",
    "ziweiInterpretations.007": "가정환경",
    "ziweiInterpretations.008": "사회적 운",
    "ziweiInterpretations.009": "건강운",
    "ziweiInterpretations.010": "내면, 정신적 특징",
    "ziweiInterpretations.011": "부동산",
    "ziweiInterpretations.012": "환경",
    "ziweiInterpretations.013": "자녀운",
    "ziweiInterpretations.014": "대한(10년 파동)",
    "ziweiInterpretations.015": "종합 총운 마스터플랜",
  },
} as const;

function ziweiInterpretationsText(key: keyof typeof ZIWEI_INTERPRETATIONS_TEXT_TRANSLATIONS.ko): string {
  return ZIWEI_INTERPRETATIONS_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
type StarTrait = {
  archetype: string;
  strength: string;
  caution: string;
  work: string;
  wealth: string;
  love: string;
  health: string;
};

const STAR_TRAITS: Record<string, StarTrait> = {
  자미: {
    archetype: "자미(紫微) — 무리의 한가운데서 기준을 세우는 북극성형 리더",
    strength: "판단 기준을 명확히 세우고 큰 구조를 관리하는 힘",
    caution: "완벽한 통제를 고집할 때 관계 긴장과 피로가 누적되기 쉬움",
    work: "총괄/기획/의사결정 역할에서 권한과 책임을 함께 쥘 때 성과가 큼",
    wealth: "브랜드, 지식재산, 조직화된 수익 구조를 만들수록 자산이 커짐",
    love: "상호 존중과 신뢰 체계를 갖춘 안정형 관계에서 깊게 헌신함",
    health: "과로로 인한 긴장성 두통과 수면 질 저하를 먼저 관리해야 함",
  },
  천기: {
    archetype: "천기(天機) — 머릿속 톱니가 늘 도는 분석형 설계자",
    strength: "복잡한 정보를 구조화하고 대안을 설계하는 능력",
    caution: "과한 예측과 걱정으로 실행이 늦어지거나 번아웃이 생길 수 있음",
    work: "데이터 분석, 제품 설계, 연구, 컨설팅 업무와 궁합이 좋음",
    wealth: "단기 투기보다 정보 우위가 있는 장기 축적형 투자가 유리함",
    love: "대화의 질이 관계 만족도를 좌우하며 지적 교감이 핵심",
    health: "신경계 과부하로 인한 소화 저하와 목/어깨 긴장을 경계해야 함",
  },
  태양: {
    archetype: "태양(太陽) — 방 안을 데우는 한낮의 해 같은 외향형 실행가",
    strength: "주도적으로 움직이며 사람을 모아 에너지를 확장하는 힘",
    caution: "속도를 우선할 때 정서적 섬세함이 부족해 보일 수 있음",
    work: "영업, 마케팅, 교육, 대외 커뮤니케이션 영역에서 강점이 뚜렷함",
    wealth: "노출과 평판이 수익으로 연결되는 구조에서 재물운이 커짐",
    love: "관계 초반은 빠르게 깊어지지만 리듬 조절이 중요함",
    health: "심혈관성 피로, 눈의 피로, 수면 불균형 관리가 필요함",
  },
  무곡: {
    archetype: "무곡(武曲) — 숫자 위에 단단히 선 재무형 전략가",
    strength: "숫자 감각, 원가 관리, 리스크 통제 능력이 뛰어남",
    caution: "감정 표현이 절제되어 차갑게 오해받을 수 있음",
    work: "재무, 운영, 품질관리, 엔지니어링 분야에 강함",
    wealth: "현금흐름 관리와 자산 방어 전략을 꾸준히 수행할수록 복리 효과",
    love: "신뢰 구축 후 오래 가는 관계를 선호하며 약속 이행을 중시함",
    health: "근골격 긴장, 관절 부담, 만성 피로 누적을 예방해야 함",
  },
  천동: {
    archetype: "천동(天同) — 곁에 있으면 마음이 놓이는 봄볕 같은 조율형 케어러",
    strength: "사람의 감정 결을 빠르게 읽고 분위기를 부드럽게 만드는 힘",
    caution: "갈등을 회피하다 핵심 문제 해결이 늦어질 수 있음",
    work: "고객경험, HR, 교육, 심리상담, 브랜딩 분야와 맞음",
    wealth: "관계 기반 수익 모델, 구독형/반복형 비즈니스에 유리함",
    love: "정서적 안정과 일상적 배려가 관계 지속성을 높임",
    health: "컨디션 기복이 체중과 수면 패턴으로 나타나기 쉬움",
  },
  염정: {
    archetype: "염정(廉貞) — 옳고 그름의 선을 또렷이 긋는 원칙형 개혁가",
    strength: "비합리 구조를 고치고 규범을 세우는 추진력",
    caution: "옳고 그름에 집중할수록 대인 관계의 마찰이 증가할 수 있음",
    work: "법무, 감사, 기획혁신, 제도 설계, 정책 업무에 강점",
    wealth: "원칙적 계약과 문서화로 손실을 줄일수록 누적 자산이 안정됨",
    love: "관계에서 가치관 합치가 무엇보다 중요함",
    health: "스트레스성 위장 반응과 교감신경 과긴장을 관리해야 함",
  },
  천부: {
    archetype: "천부(天府) — 곳간을 든든히 채워 두는 보존형 관리자",
    strength: "자원 관리와 인내심, 장기 설계 능력이 뛰어남",
    caution: "변화가 빠른 시기에 대응 속도가 늦어질 수 있음",
    work: "운영관리, 자산관리, 공공/행정 조직에서 강점",
    wealth: "안전자산 비중을 체계적으로 관리할 때 복원력이 높음",
    love: "생활 기반이 안정된 관계에서 헌신도가 높아짐",
    health: "활동량 부족으로 순환 저하가 오기 쉬움",
  },
  태음: {
    archetype: "태음(太陰) — 밤바다에 비친 달빛 같은 내면형 전략가",
    strength: "디테일 관찰, 정서 이해, 섬세한 리스크 회피",
    caution: "고민이 길어지면 결단이 늦어지는 경향",
    work: "콘텐츠, 디자인, 리서치, 심층 기획에 탁월",
    wealth: "주거/생활 기반 자산, 장기 적립형 포트폴리오에 유리",
    love: "정서 안전감이 확보되면 깊고 오래 가는 애착을 형성",
    health: "호르몬 리듬과 수면 위생을 우선 관리해야 함",
  },
  탐랑: {
    archetype: "탐랑(貪狼) — 사람과 기회를 끌어당기는 매력형 개척가",
    strength: "트렌드 감각, 네트워크 확장, 시장 감지 능력",
    caution: "욕망의 분산으로 집중력이 흔들릴 수 있음",
    work: "신사업, 미디어, 커뮤니티, 영업 확장에 강함",
    wealth: "다중 수익원 설계 시 급성장 가능성이 큼",
    love: "강한 매력을 지녔지만 경계 설정이 관계 안정의 핵심",
    health: "과로와 과음/야식 습관이 누적되기 쉬움",
  },
  거문: {
    archetype: "거문(巨門) — 말과 논리로 닫힌 문을 여는 설득형 분석가",
    strength: "문제의 본질을 말로 풀어내고 설득하는 역량",
    caution: "비판적 표현이 강해 갈등으로 번질 수 있음",
    work: "법/미디어/교육/콘텐츠/컨설팅에 적합",
    wealth: "지식과 언어를 상품화할수록 수익 탄성이 커짐",
    love: "솔직한 대화가 장점이지만 말의 톤 조절이 중요",
    health: "호흡기, 성대, 턱관절 긴장을 주기적으로 관리해야 함",
  },
  천량: {
    archetype: "천량(天梁) — 그늘을 내주는 큰 나무 같은 멘토형 리더",
    strength: "장기 관점, 보호력, 문제 수습 능력",
    caution: "책임을 과도하게 떠안아 자기 돌봄이 늦어질 수 있음",
    work: "교육, 코칭, 의료보건, 공공서비스 분야와 궁합",
    wealth: "안정적 자산과 평판 기반 수익이 장기적으로 강함",
    love: "돌봄이 장점이나 과보호를 경계해야 함",
    health: "면역 균형과 회복 루틴이 성과를 좌우함",
  },
  칠살: {
    archetype: "칠살(七殺) — 승부처에서 단숨에 치고 나가는 전술형 실행가",
    strength: "위기 대응, 고난도 의사결정, 강한 집중력",
    caution: "과감함이 과속이 되면 손실 폭이 커질 수 있음",
    work: "프로젝트 리더, 전략 실행, 구조조정 역할에 강함",
    wealth: "변동성 자산은 규칙 없는 매매를 피해야 안정됨",
    love: "강렬한 몰입형 관계를 선호하며 신뢰가 핵심",
    health: "부상/염증성 컨디션, 과긴장 회복이 필요함",
  },
  파군: {
    archetype: "파군(破軍) — 낡은 판을 허물고 새로 짜는 혁신형 개척자",
    strength: "대전환, 재구성, 무에서 유를 만드는 능력",
    caution: "끊고 다시 시작하는 패턴이 잦아 피로가 누적될 수 있음",
    work: "스타트업, 혁신 프로젝트, 턴어라운드 업무에 강함",
    wealth: "고위험 선택은 손절 규칙과 분산으로 통제해야 함",
    love: "자유와 성장의 균형이 맞아야 관계가 안정됨",
    health: "수면 리듬 붕괴와 급성 스트레스 반응을 관리해야 함",
  },
};

function starList(palace?: ZiweiPalaceData, type: "stars" | "auxStars" | "badStars" = "stars") {
  if (!palace) return [];
  const source = palace[type] || [];
  return source.map((s) => s.name).filter(Boolean);
}

function joinOrFallback(items: string[], fallback: string) {
  return items.length ? items.join(", ") : fallback;
}

function pickLeadStar(palace?: ZiweiPalaceData) {
  const main = starList(palace, "stars");
  if (main.length) return main[0];
  const aux = starList(palace, "auxStars");
  if (aux.length) return aux[0];
  return "";
}

function traitOf(star: string): StarTrait {
  return (
    STAR_TRAITS[star] || {
      archetype: "균형형 탐색자",
      strength: "상황 적응력과 학습 속도",
      caution: "의사결정 지연과 에너지 분산",
      work: "한 분야의 전문성을 깊게 쌓을수록 유리",
      wealth: "현금흐름 관리와 장기 분산 투자에 강점",
      love: "상호 존중과 경계 설정이 관계 안정의 핵심",
      health: "수면, 호흡, 순환 루틴을 유지할수록 컨디션이 안정",
    }
  );
}

function findPalacesByStar(chart: ZiweiChartData, starName: string) {
  if (!starName) return [];
  return chart.palaceStarData
    .filter((palace) => {
      const names = [...starList(palace, "stars"), ...starList(palace, "auxStars"), ...starList(palace, "badStars")];
      return names.includes(starName);
    })
    .map((palace) => palace.palace)
    .filter(Boolean);
}

function buildSihuaNarrative(chart: ZiweiChartData) {
  const lukPalaces = findPalacesByStar(chart, chart.sihua.luk);
  const quanPalaces = findPalacesByStar(chart, chart.sihua.quan);
  const kePalaces = findPalacesByStar(chart, chart.sihua.ke);
  const jiPalaces = findPalacesByStar(chart, chart.sihua.ji);

  const lukText = `${chart.sihua.luk || "화록"}이 ${joinOrFallback(lukPalaces, "핵심 생활영역")}에 작동하여 자원 유입과 기회 확장을 촉진합니다.`;
  const quanText = `${chart.sihua.quan || "화권"}이 ${joinOrFallback(quanPalaces, "핵심 생활영역")}에서 주도권과 책임을 강화합니다.`;
  const keText = `${chart.sihua.ke || "화과"}가 ${joinOrFallback(kePalaces, "핵심 생활영역")}의 평판·자격·인지도를 밀어 올립니다.`;
  const jiText = `${chart.sihua.ji || "화기"}가 ${joinOrFallback(jiPalaces, "핵심 생활영역")}에서 반복 과제와 감정 소모 포인트를 만들기 쉬우므로 구조화된 관리가 필요합니다.`;

  return { lukText, quanText, keText, jiText };
}

function buildMajorCycleText(chart: ZiweiChartData) {
  const cycles = chart.palaceStarData
    .filter((p) => typeof p.dahan === "string" && p.dahan.includes("-"))
    .map((p) => `${p.palace}(${p.dahan})`);
  return joinOrFallback(cycles, "명궁 기준 대한 흐름");
}

function palaceSummary(label: string, palace?: ZiweiPalaceData) {
  if (!palace) return `${label} 데이터 점검이 필요합니다. 별 배치와 지지 정보를 다시 계산해 주세요.`;
  const mains = joinOrFallback(starList(palace, "stars"), "주성이 비어 있음");
  const aux = joinOrFallback(starList(palace, "auxStars"), "보좌성 없음");
  const bad = joinOrFallback(starList(palace, "badStars"), "강한 살성 없음");
  return `${label}(${palace.branch})의 주성은 ${mains}, 보좌성은 ${aux}, 경계해야 할 살성은 ${bad}입니다.`;
}

export function generateAdvancedReport(chart: ZiweiChartData, name: string): AdvancedZiweiResult {
  const ming = getPalaceData(chart, "명궁");
  const spouse = getPalaceData(chart, "부부궁");
  const wealth = getPalaceData(chart, "재백궁");
  const career = getPalaceData(chart, "관록궁");
  const realEstate = getPalaceData(chart, "전택궁");
  const inner = getPalaceData(chart, "복덕궁");
  const travel = getPalaceData(chart, "천이궁");
  const health = getPalaceData(chart, "질액궁");
  const children = getPalaceData(chart, "자녀궁");
  const parents = getPalaceData(chart, "부모궁");
  const siblings = getPalaceData(chart, "형제궁");
  const network = getPalaceData(chart, "노복궁");

  const mingLead = pickLeadStar(ming);
  const careerLead = pickLeadStar(career);
  const wealthLead = pickLeadStar(wealth);
  const spouseLead = pickLeadStar(spouse);
  const healthLead = pickLeadStar(health);
  const innerLead = pickLeadStar(inner);

  const mingTrait = traitOf(mingLead);
  const careerTrait = traitOf(careerLead);
  const wealthTrait = traitOf(wealthLead);
  const spouseTrait = traitOf(spouseLead);
  const healthTrait = traitOf(healthLead);
  const innerTrait = traitOf(innerLead);

  const sihua = buildSihuaNarrative(chart);
  const majorCycleText = buildMajorCycleText(chart);

  const mingStars = joinOrFallback(starList(ming, "stars"), "주성이 비어 있는 구조");

  return {
    intro: {
      title: ziweiInterpretationsText("ziweiInterpretations.001"),
      summary: `${name}님의 핵심 축은 명궁(${chart.meng})의 ${mingStars}이며, ${chart.yearGan}${chart.yearZhi}년 사화가 해석의 중심입니다.`,
      detail: `### 리포트가 읽는 핵심 축\n이번 리포트는 명궁/신궁 구조, 12궁의 주성 배치, 사화(화록·화권·화과·화기), 대한(10년 파동)을 교차해서 작성됩니다. 특히 ${name}님의 명궁 중심성은 "${mingTrait.archetype}"로 요약되며, 이는 모든 카테고리 해석의 기본 좌표입니다.\n\n### 계산 데이터의 근거\n${palaceSummary("명궁", ming)}\n${palaceSummary("관록궁", career)}\n${palaceSummary("재백궁", wealth)}\n\n### 사화가 말하는 실제 변화\n${sihua.lukText}\n${sihua.quanText}\n${sihua.keText}\n${sihua.jiText}\n\n### 읽는 방법\n각 챕터는 1) 구조 진단, 2) 반복 패턴, 3) 실행 전략 순으로 작성되어 있습니다. 즉 감상용 운세가 아니라, 당장 행동을 수정할 수 있는 실전형 매뉴얼로 보시면 됩니다.`,
    },

    destiny: {
      title: ziweiInterpretationsText("ziweiInterpretations.002"),
      summary: `${name}님의 운명축은 ${mingLead || "명궁 핵심성"}의 장점을 살릴 때 급성장하고, ${mingTrait.caution} 패턴이 누적될 때 정체가 시작됩니다.`,
      detail: `### 명궁·신궁 코어 구조\n명궁의 주도 에너지는 ${mingLead || "핵심성"}이며, 핵심 성향은 ${mingTrait.archetype}입니다. 강점은 ${mingTrait.strength}으로, 상황이 복잡할수록 중심을 세우는 역량이 드러납니다. 다만 약점 구간에서는 ${mingTrait.caution}이 반복되므로, 감정 에너지를 시스템으로 관리해야 합니다.\n\n### 운명적 반복 패턴\n초반 인생에서는 "역할 과잉"이, 중반에는 "성과와 피로의 동시 증가"가, 후반에는 "구조적 영향력 확대"가 반복되기 쉽습니다. ${name}님은 단기 승부보다 기준을 세우고 축적하는 방식에서 장기 승률이 높습니다.\n\n### 사화 연동 진단\n${sihua.lukText}\n${sihua.quanText}\n${sihua.keText}\n${sihua.jiText}\n\n### 실행 전략\n1) 분기마다 핵심 목표를 3개 이하로 제한해 에너지 분산을 줄이세요.\n2) 책임 영역과 감정 영역을 분리해 의사결정 피로를 낮추세요.\n3) 10년 계획은 크게, 월간 계획은 작게 운영하면 운의 탄성이 극대화됩니다.`,
    },

    personality: {
      title: ziweiInterpretationsText("ziweiInterpretations.003"),
      summary: `${name}님의 성향은 외부에서는 ${mingTrait.archetype}로 보이고, 내면에서는 ${innerTrait.archetype} 성향이 강하게 작동합니다.`,
      detail: `### 외부 페르소나\n명궁의 ${mingLead || "핵심성"}은 사람들에게 "기준이 분명하고 믿을 수 있는 사람"이라는 인상을 줍니다. 일과 관계 모두에서 예측 가능한 원칙을 중시하기 때문에, 장기 신뢰 자본을 쌓는 데 유리합니다.\n\n### 내면 작동 원리\n복덕궁의 리드 성향은 ${innerLead || "내면성"}이며, 이는 ${innerTrait.archetype}로 정리됩니다. 내면 회복은 고립이 아니라 "정리된 고요"에서 이루어지므로, 생각을 언어화하거나 기록화할 때 에너지가 빠르게 복원됩니다.\n\n### 감정·사고 패턴\n강점 구간에서는 ${mingTrait.strength}이 크게 발현되고, 피로 구간에서는 ${mingTrait.caution} 패턴이 나타납니다. 이 패턴을 줄이려면 결정을 늦추는 것이 아니라 "결정 기준"을 미리 고정하는 것이 효과적입니다.\n\n### 관계에서의 자기 사용법\n${name}님은 친밀감이 깊어질수록 진심이 커지는 타입입니다. 다만 경계 없는 배려는 피로를 만들기 쉽습니다. "내가 할 일/상대가 할 일"을 명확히 구분할수록 관계 만족도가 높아집니다.`,
    },

    career: {
      title: ziweiInterpretationsText("ziweiInterpretations.004"),
      summary: `관록궁 리드 성향(${careerLead || "핵심성"})은 ${careerTrait.work} 축에서 커리어 점프가 빠르게 나타납니다.`,
      detail: `### 적성의 정밀 진단\n${palaceSummary("관록궁", career)}\n관록궁 기준으로 볼 때 ${name}님은 "일을 잘하는 사람"을 넘어 "일의 구조를 재설계하는 사람"에 가깝습니다. 반복 업무를 자동화/표준화할수록 성과 레버리지가 커집니다.\n\n### 커리어 상승 구간\n사화 중 화권과 화과가 작동하는 궁 영역은 직책, 평판, 영향력이 빠르게 확장되는 포인트입니다. ${sihua.quanText} ${sihua.keText} 이 구간에서는 실력만큼 포지셔닝이 중요하므로, 성과를 외부에 보이는 방식까지 설계해야 합니다.\n\n### 조직 vs 개인 커리어\n조직 안에서는 기획/운영/전략 라인에서 강하고, 개인 커리어에서는 전문성 기반 컨설팅/콘텐츠/교육 모델로 확장성이 큽니다. 특히 ${careerTrait.work} 유형과 맞물릴 때 업무 만족과 수익성이 동시에 올라갑니다.\n\n### 실행 체크리스트\n1) 분기별 핵심 기술 1개를 깊게 파고, 산출물을 공개하세요.\n2) 성과 기록을 수치로 남겨 협상력을 확보하세요.\n3) 역할 범위가 넓어질수록 위임 규칙을 먼저 설계하세요.`,
    },

    wealth: {
      title: ziweiInterpretationsText("ziweiInterpretations.005"),
      summary: `재백궁 리드 성향(${wealthLead || "핵심성"})은 ${wealthTrait.wealth} 방식에서 자산 안정성이 크게 상승합니다.`,
      detail: `### 돈이 들어오는 구조\n${palaceSummary("재백궁", wealth)}\n${name}님의 재물운은 한 번의 대박보다 "관리 가능한 반복 수익"에서 강합니다. 화록이 비치는 영역은 수익 확장 창구가 되고, 화기는 누수 구간을 만들 수 있으므로 자동 점검 루틴이 중요합니다.\n\n### 자산 축적 전략\n${wealthTrait.wealth} 원칙을 기본축으로 두고, 변동성이 큰 자산은 비중/손절 규칙을 먼저 정한 뒤 접근하는 편이 안정적입니다. 특히 문서, 계약, 세금 관련 기록을 철저히 할수록 실질 수익이 보존됩니다.\n\n### 재물운 약화 패턴\n감정적 지출, 주변 요청에 대한 즉흥적 보증, 검증되지 않은 단기 투자 제안이 손실 패턴으로 작동할 가능성이 큽니다. "돈을 버는 속도"보다 "돈이 새지 않는 구조"를 우선 설계해야 합니다.\n\n### 실행 체크리스트\n1) 생활비/투자비/위험자본을 계정 분리해 운용하세요.\n2) 월 1회 자산 대차표를 작성해 누수 포인트를 확인하세요.\n3) 큰 지출은 48시간 숙려 규칙을 적용하세요.`,
    },

    love: {
      title: ziweiInterpretationsText("ziweiInterpretations.006"),
      summary: `부부궁 리드 성향(${spouseLead || "핵심성"})은 ${spouseTrait.love} 구도에서 안정적인 애정운을 만듭니다.`,
      detail: `### 인연의 작동 원리\n${palaceSummary("부부궁", spouse)}\n${name}님의 애정운은 감정의 강도보다 "관계의 구조"가 맞을 때 오래 갑니다. 즉, 서로의 생활 리듬과 의사결정 방식이 맞아야 사랑의 지속성이 높아집니다.\n\n### 반복 패턴\n초기에는 빠르게 가까워지더라도, 중기에는 경계/역할/기대치 조율이 핵심 이슈로 떠오릅니다. 이 시점을 건강하게 통과하면 장기 안정 관계로 전환됩니다.\n\n### 갈등 관리\n${spouseTrait.caution} 경향이 보일 때는 문제 자체보다 말의 속도와 방식이 갈등을 키울 수 있습니다. 결론을 빨리 내기보다 감정과 사실을 분리해 대화하면 관계 회복력이 크게 올라갑니다.\n\n### 실행 전략\n1) 관계 규칙(돈/시간/경계)을 초기에 합의하세요.\n2) 주 1회 감정 체크인 대화를 루틴화하세요.\n3) 사랑의 언어를 "행동"으로 명시해 오해를 줄이세요.`,
    },

    family: {
      title: ziweiInterpretationsText("ziweiInterpretations.007"),
      summary: `부모궁·형제궁 배치상 ${name}님은 가족 내에서 조정자 역할을 맡기 쉬운 구조이며, 정서적 독립이 중요한 성장 과제입니다.`,
      detail: `### 원가족 패턴\n${palaceSummary("부모궁", parents)}\n${palaceSummary("형제궁", siblings)}\n초기 환경은 안정 지원과 책임 요구가 동시에 나타났을 가능성이 큽니다. 이 구조는 성인이 된 이후 "내가 해결해야 한다"는 자동 반응으로 이어질 수 있습니다.\n\n### 현재 가족 관계의 핵심\n가족에게 신뢰받는 자원인 동시에, 과책임으로 피로가 누적될 수 있는 패턴을 주의해야 합니다. 도움을 주되, 역할 한계를 명확히 해야 장기적으로 관계가 건강해집니다.\n\n### 치유 포인트\n가족 관계의 핵심 과제는 단절이 아니라 경계 재설정입니다. 정서적 거리를 두는 것이 배신이 아니라, 관계를 오래 유지하기 위한 구조 조정이라는 관점이 필요합니다.\n\n### 실행 전략\n1) 가족 이슈는 우선순위를 정해 개입 강도를 조절하세요.\n2) 경제적 지원은 문서화된 기준을 만들어 진행하세요.\n3) 죄책감 대신 지속 가능성을 기준으로 의사결정하세요.`,
    },

    social: {
      title: ziweiInterpretationsText("ziweiInterpretations.008"),
      summary: `천이궁·노복궁 구조는 ${name}님의 기회가 "사람"을 통해 열리는 흐름을 보여주며, 인맥의 질 관리가 성패를 가릅니다.`,
      detail: `### 외부 활동 운\n${palaceSummary("천이궁", travel)}\n${palaceSummary("노복궁", network)}\n외부 이동, 협업, 확장 활동에서 성과가 상승하는 패턴이 보입니다. 특히 귀인운은 "정확한 요청"을 했을 때 강하게 작동합니다.\n\n### 평판의 형성 메커니즘\n${name}님의 평판은 화과 영역에서 빠르게 커집니다. 따라서 결과를 내는 것만큼 결과를 설명하고 공유하는 커뮤니케이션 전략이 중요합니다.\n\n### 리스크 관리\n노복궁에 살성이 강할 경우, 정서적 친밀감과 계약 관계를 혼용하면 손실 확률이 올라갑니다. 공동 프로젝트는 역할/권한/정산 기준을 문서화한 뒤 진행하는 것이 안전합니다.\n\n### 실행 전략\n1) 월 2회 핵심 네트워크 리빌딩 시간을 확보하세요.\n2) 협업 전 체크리스트(역할, KPI, 비용)를 표준화하세요.\n3) 평판 자산을 콘텐츠/레퍼런스로 남겨 기회 연결률을 높이세요.`,
    },

    health: {
      title: ziweiInterpretationsText("ziweiInterpretations.009"),
      summary: `질액궁 리드 성향(${healthLead || "핵심성"})은 ${healthTrait.health} 루틴을 유지할 때 체력과 집중력이 함께 상승합니다.`,
      detail: `### 체질 경향\n${palaceSummary("질액궁", health)}\n건강 흐름은 절대적 질병 진단이 아니라, 피로가 쌓이는 방향과 회복 루트의 경향을 보여줍니다. ${name}님은 정신적 과부하가 신체 피로로 빠르게 전이되는 타입에 가깝습니다.\n\n### 위험 신호\n수면 질 저하, 위장 리듬 불안정, 목/어깨 긴장 고착, 순환 저하가 반복 경고등으로 나타날 수 있습니다. 특히 중요한 프로젝트 직전에는 과긴장 관리가 성과와 건강을 동시에 좌우합니다.\n\n### 회복 전략\n${healthTrait.health} 원칙에 따라 "짧고 자주 회복"하는 루틴이 효과적입니다. 90분 집중 + 10분 회복, 저녁 카페인 제한, 주 3회 가벼운 유산소/호흡 루틴만 유지해도 컨디션 변동폭이 크게 줄어듭니다.\n\n### 참고\n이 해석은 의료 진단이 아닙니다. 지속적 증상이 있다면 반드시 전문 진료와 병행해 주세요.`,
    },

    innerMind: {
      title: ziweiInterpretationsText("ziweiInterpretations.010"),
      summary: `복덕궁 리드 성향(${innerLead || "핵심성"})은 ${innerTrait.archetype}로 나타나며, 자기 기준이 분명할수록 멘탈 안정성이 높아집니다.`,
      detail: `### 내면 동력\n복덕궁은 행복의 방식과 정신 회복의 알고리즘을 보여줍니다. ${name}님은 외부 인정보다 "내가 납득한 기준"을 달성했을 때 자존감이 올라가는 구조입니다.\n\n### 불안이 커지는 조건\n결정 권한이 흐려질 때, 타인의 기대를 과도하게 떠안을 때, 휴식 없이 성과만 추적할 때 내면 피로가 급증합니다. 이때는 더 열심히 하기보다 기준을 재정렬하는 것이 우선입니다.\n\n### 내면 회복 루틴\n1) 하루 10분 정리 기록(감정/사실/행동 분리)\n2) 주 1회 비생산적 휴식(산책, 음악, 독서)\n3) 월 1회 목표 리밸런싱을 통해 과부하를 차단\n이 3단계만 꾸준히 지켜도 멘탈 복원력이 크게 개선됩니다.\n\n### 자기서사 확장\n내면의 중심 문장을 하나 정해 반복하세요. 예: "나는 속도가 아니라 구조로 이긴다." 자기서사가 안정되면 외부 변수에 흔들리는 폭이 작아집니다.`,
    },

    realEstate: {
      title: ziweiInterpretationsText("ziweiInterpretations.011"),
      summary: `전택궁 구조는 ${name}님의 공간 선택이 단순 거주가 아니라 에너지 관리와 자산 축적을 동시에 좌우함을 보여줍니다.`,
      detail: `### 공간 운의 핵심\n${palaceSummary("전택궁", realEstate)}\n전택궁이 안정적으로 작동하면 생활 기반이 정리되면서 커리어와 재물운도 동반 상승합니다. 즉 공간은 배경이 아니라 성과를 만드는 인프라입니다.\n\n### 자산화 전략\n${name}님은 "입지 + 현금흐름 + 유지관리 비용" 3요소를 동시에 점검할 때 실수 확률이 낮습니다. 감정적 선호보다 운영 효율이 높은 선택이 장기 수익률을 올립니다.\n\n### 리스크 포인트\n무리한 레버리지, 정보 비대칭 거래, 유지비 과소평가가 핵심 리스크입니다. 계약 전 체크리스트와 보수적 스트레스 테스트를 선행하면 하방 위험을 크게 줄일 수 있습니다.\n\n### 실행 전략\n1) 거주 만족과 수익성 지표를 분리 평가하세요.\n2) 큰 거래는 2개 이상 시나리오(낙관/중립/비관)로 검증하세요.\n3) 공간 정리 루틴을 유지해 에너지 누수를 줄이세요.`,
    },

    environment: {
      title: ziweiInterpretationsText("ziweiInterpretations.012"),
      summary: `천이궁 흐름상 ${name}님은 환경 변화가 리스크가 아니라 성장 촉매로 작동하는 명반입니다.`,
      detail: `### 이동·이직·이사 운\n${palaceSummary("천이궁", travel)}\n고정된 환경에서 답이 막힐 때, 물리적·사회적 환경 변화를 주면 운의 흐름이 다시 열리는 패턴이 보입니다. 이는 충동 이동이 아니라 전략적 이동일 때 효과가 큽니다.\n\n### 해외/외부 확장 가능성\n외부 노출과 협업이 늘어날수록 기회 창구가 확대됩니다. 특히 다른 산업, 다른 지역, 다른 네트워크와의 접점에서 도약 포인트가 생길 가능성이 높습니다.\n\n### 주의할 점\n변화를 자주 주되, 기준 없이 자주 바꾸면 누적 자산이 약해집니다. "무엇을 유지하고 무엇을 바꿀지"를 먼저 정하고 움직이는 것이 핵심입니다.\n\n### 실행 전략\n1) 정체기에는 환경 변수 1개를 의도적으로 바꿔보세요.\n2) 신규 환경 진입 전 30일 적응 계획을 설계하세요.\n3) 변화 후 성과 지표를 기록해 다음 의사결정에 활용하세요.`,
    },

    children: {
      title: ziweiInterpretationsText("ziweiInterpretations.013"),
      summary: `자녀궁 흐름은 ${name}님이 후속 세대(자녀/후배/제자)에게 영향력 있는 멘토로 작동할 가능성을 보여줍니다.`,
      detail: `### 자녀궁 에너지\n${palaceSummary("자녀궁", children)}\n자녀운은 실제 자녀뿐 아니라, 내가 키우는 사람/팀/프로젝트까지 포함한 "후속 에너지"를 의미합니다. ${name}님은 기준을 세워 성장을 돕는 방식의 지도력에 강점이 있습니다.\n\n### 양육·멘토링 패턴\n강점은 명확한 방향 제시, 약점은 기대치 과다 설정입니다. 상대의 속도와 스타일을 인정할 때 관계 만족도와 성장 성과가 함께 올라갑니다.\n\n### 자녀가 없는 경우\n프로젝트, 콘텐츠, 서비스, 브랜드처럼 내가 길러내는 결과물이 자녀궁 에너지로 나타납니다. 즉 "창작물의 성장"이 자녀운의 실질 표현이 될 수 있습니다.\n\n### 실행 전략\n1) 기준은 명확히, 방식은 유연하게 지도하세요.\n2) 결과보다 성장 루틴을 칭찬해 장기 동기를 살리세요.\n3) 후속 세대를 위한 지식 체계를 문서화하세요.`,
    },

    majorCycle: {
      title: ziweiInterpretationsText("ziweiInterpretations.014"),
      summary: `${name}님의 대한 흐름은 ${majorCycleText} 순서로 전개되며, 각 10년마다 성과 구조가 달라집니다.`,
      detail: `### 대한 구조 개요\n${majorCycleText}\n대한은 "운이 좋다/나쁘다"가 아니라, 해당 10년에서 무엇을 밀고 무엇을 줄여야 하는지를 알려주는 운영 지침입니다.\n\n### 현재 구간의 의미\n화록이 비치는 영역은 확장과 자원 유입, 화권은 주도권 확보, 화과는 평판 증폭, 화기는 반복 과제 교정을 의미합니다. 따라서 현재 구간에서는 "무엇을 키울지"와 "무엇을 정리할지"를 동시에 관리해야 합니다.\n\n### 다음 구간 준비\n대한이 바뀌기 전 12~18개월은 전환 준비 기간입니다. 이때 포트폴리오 정리, 관계 재편, 생활 루틴 재설계를 끝내면 다음 10년의 진입 비용이 크게 줄어듭니다.\n\n### 실행 전략\n1) 10년 목표를 3년 단위로 쪼개 실행하세요.\n2) 대한 전환기에는 확장보다 구조 정리를 우선하세요.\n3) 핵심 자산(건강, 실력, 평판, 현금흐름)을 분기마다 점검하세요.`,
    },

    total: {
      title: ziweiInterpretationsText("ziweiInterpretations.015"),
      summary: `${name}님의 총운 키워드는 "${mingTrait.archetype}"이며, 핵심은 기준 중심의 장기 축적 전략입니다.`,
      detail: `### 총평 한 줄\n"기준을 세우는 힘이 운의 품질을 결정한다."\n\n### 강점 통합\n${name}님은 ${mingTrait.strength}을 핵심 엔진으로 삼을 때 성과의 질이 높아집니다. 커리어는 ${careerTrait.work}, 재물은 ${wealthTrait.wealth}, 관계는 ${spouseTrait.love} 축으로 설계할수록 안정과 성장이 동시에 가능합니다.\n\n### 반복 리스크\n장점이 과열될 때 나타나는 리스크는 ${mingTrait.caution}입니다. 이 패턴을 방치하면 건강/관계/재물의 누수가 동시에 발생할 수 있으므로, 월간 리셋 루틴이 반드시 필요합니다.\n\n### 90일 실행 계획\n1) 커리어: 핵심 프로젝트 1개를 선정하고 공개 산출물을 만드세요.\n2) 재물: 현금흐름표를 구축하고 누수 지출을 2개만 먼저 차단하세요.\n3) 관계: 에너지 소모 관계를 정리하고 핵심 관계 3개를 강화하세요.\n4) 건강: 수면/호흡/걷기 루틴을 최소 기준으로 고정하세요.\n\n### 개운 루틴\n운은 초자연 이벤트보다 "반복 가능한 습관"으로 증폭됩니다. ${name}님에게 가장 강한 개운법은 높은 기준을 단순한 루틴으로 바꿔 꾸준히 실행하는 것입니다. 이 리듬을 유지하면 중장기적으로 안정적인 상승 곡선을 만들 수 있습니다.`,
    },
  };
}
