/** No provider call: explicit UI choice wins, otherwise collect topic candidates. */
export const SAJU_CATEGORIES = ["love", "compatibility", "marriage", "career", "wealth", "study", "health", "family", "timing", "annual"];
const RULES = {
  love: /연애|재회|남자친구|여자친구|짝사랑|연락|恋愛|復縁|恋爱|love|reconcil/i,
  compatibility: /궁합|두 사람|相性|合婚|compatib/i,
  marriage: /결혼|출산|자녀|結婚|出産|婚姻|marriage|marry|childbirth/i,
  career: /이 일을 계속|일을 그만|직업|이직|진로|취업|직장|仕事|転職|工作|career|job|workplace/i,
  wealth: /재물|사업|투자|금전|수익|돈|財|财|money|business|invest/i,
  study: /학업|시험|공부|수능|합격|試験|考试|exam|study|school/i,
  health: /건강|컨디션|수면|피로|健康|health|sleep|fatigue/i,
  family: /가족|부모|형제|인간관계|친구|동료|家族|家庭|family|friend|colleague/i,
  timing: /이사|택일|언제|시기|引越|搬家|when|timing|move house/i,
  annual: /총운|올해|내년|今年|来年|流年|annual|this year|next year/i,
};
export function resolveQuestionCategory({ questionCategory, question = "" } = {}) {
  const matches = SAJU_CATEGORIES.filter(id => RULES[id].test(question));
  const primary = SAJU_CATEGORIES.includes(questionCategory) ? questionCategory : matches[0] || null;
  return { primary, secondary: matches.find(id => id !== primary) || null, needsClarification: !primary };
}

export const CATEGORY_FOCUS = {
  love: { gods: ["jeongjae", "pyeonjae", "jeonggwan", "pyeongwan"], focus: "관계의 표현·책임과 일지의 확인된 근거. 성별 배우자성이나 상대 마음을 새로 판정하지 않는다.", time: "세운과 제공된 대운" },
  compatibility: { gods: ["bigeon", "jeongin"], focus: "기존 궁합 모드의 두 사람 명식만 대조한다. 한 사람 입력으로 상대를 만들지 않는다.", time: "제공된 대운" },
  marriage: { gods: ["jeonggwan", "jeongjae", "siksin"], focus: "관계 운영과 책임·돌봄의 패턴. 결혼·임신·출산 여부나 자녀성을 새로 판정하지 않는다.", time: "대운과 세운" },
  career: { gods: ["jeonggwan", "pyeongwan", "siksin", "sanggwan", "jeongin", "pyeonin"], focus: "월지·격국과 관성·식상·인성의 확인된 자리, 일하는 방식과 선택 조건", time: "현재 대운과 세운" },
  wealth: { gods: ["jeongjae", "pyeonjae", "siksin", "sanggwan", "geopjae", "bigeon"], focus: "재성·식상·비겁의 실제 자리. 겁재의 전통 성정으로 탈재를 단정하지 않고 제공된 등급을 따른다. 종목·수익 보장 금지", time: "대운과 세운" },
  study: { gods: ["jeongin", "pyeonin", "siksin", "sanggwan", "jeonggwan"], focus: "배우고 표현하고 지속하는 방식. 합격 여부와 시험일 운은 판정하지 않는다.", time: "제공된 세운; 시험일·월운 미제공" },
  health: { gods: [], focus: "오행 편중을 생활 리듬·휴식·컨디션 관리 관점으로만 풀이. 질병·진단·치료를 추론하지 않는다.", time: "제공된 세운" },
  family: { gods: ["bigeon", "geopjae", "jeongin", "pyeonin"], focus: "비겁·인성의 실제 자리와 관계 경계. 특정 가족을 십성에 임의 배정하거나 비난하지 않는다.", time: "대운과 세운" },
  timing: { gods: [], focus: "요청한 선택에 대해 실제 운 표에 있는 연도·구간만 사용한다. 월운·일진이 없으면 구체 월·날짜·상하반기 적기를 만들지 않는다.", time: "제공된 대운 구간과 세운 연도만" },
  annual: { gods: [], focus: "세운 손님을 먼저 살피고 관련 원국 근거로 연결한다. 없는 월별 흐름은 쓰지 않는다.", time: "기준일의 세운" },
};

export function selectQuestionGuests(guests, category) {
  const focus = CATEGORY_FOCUS[category];
  if (!focus) return guests;
  return [...guests].sort((a, b) => {
    const priority = g => (category === "annual" || category === "timing" ? g.scope === "sewoon" ? 0 : g.scope === "daewoon" ? 1 : 2 : focus.gods.includes(g.tenGodId) ? 0 : 1);
    return priority(a) - priority(b);
  });
}
