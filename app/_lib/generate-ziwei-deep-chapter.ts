import {
  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiPalace,
  ZiweiSectionId,
} from "./ziwei-types";
import {
  AUXILIARY_STAR_INTERPRETATIONS,
  MALEFIC_STAR_INTERPRETATIONS,
  SIHUA_INTERPRETATIONS,
  STAR_INTERPRETATIONS,
} from "./ziwei-star-interpretations";
import { MASTER_TEMPLATE, OVERVIEW_TEMPLATE, ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";

function sentenceList(items: string[], empty = "정보가 제한되어 기본 해석을 제공합니다."): string {
  if (!items.length) return empty;
  return items.join(" ");
}

function palaceById(chart: ZiweiDeepChart, id?: string): ZiweiPalace | null {
  if (!id) return null;
  return chart.palaces.find((p) => p.id === id) || null;
}

function parseSihua(stars: string[]): string[] {
  const out: string[] = [];
  stars.forEach((value) => {
    if (value.includes("화록")) out.push("화록");
    if (value.includes("화권")) out.push("화권");
    if (value.includes("화과")) out.push("화과");
    if (value.includes("화기")) out.push("화기");
  });
  return Array.from(new Set(out));
}

function buildStarAnalysis(palace: ZiweiPalace): string {
  const main = palace.mainStars.map((s) => s.name);
  const aux = palace.auxiliaryStars.map((s) => s.name);
  const bad = palace.maleficStars.map((s) => s.name);

  const mainText = main
    .map((star) => {
      const info = STAR_INTERPRETATIONS[star];
      if (!info) return `${star}은 핵심 에너지를 형성하는 별로 작용합니다.`;
      return `${star}: ${info.basic} ${info.strengths} 주의점은 ${info.cautions} 개운 포인트는 ${info.remedy}`;
    })
    .join("\n");

  const auxText = aux
    .map((star) => `${star}: ${AUXILIARY_STAR_INTERPRETATIONS[star] || "보조성의 지원으로 완충력이 높아집니다."}`)
    .join("\n");

  const badText = bad
    .map((star) => `${star}: ${MALEFIC_STAR_INTERPRETATIONS[star] || "리스크 신호로 보며 일정 완충을 두는 것이 좋습니다."}`)
    .join("\n");

  const sihuaText = parseSihua([...main, ...aux])
    .map((key) => `${key}: ${SIHUA_INTERPRETATIONS[key] || "사화 흐름을 보수적으로 점검해야 합니다."}`)
    .join("\n");

  return [mainText, auxText || "보조성 없음", badText || "강한 살성 없음", sihuaText || "사화 정보 제한"].join("\n\n");
}

function scoreLabel(score: number): string {
  if (score >= 80) return "매우 강함";
  if (score >= 68) return "강함";
  if (score >= 55) return "안정";
  if (score >= 42) return "보완 필요";
  return "집중 보완 구간";
}

function buildDecisionProtocol(chart: ZiweiDeepChart, palace: ZiweiPalace): string {
  const keyWords = sentenceList(palace.keywords, "균형 관리 실행");
  return [
    "의사결정 프로토콜 5단계",
    `1) 사안 정의: 지금 결정하려는 안건을 한 문장으로 규정하고, ${chart.user.name}님의 현재 에너지 축(${keyWords})과 충돌하는지 먼저 확인합니다.`,
    "2) 손실 상한선: 시간/돈/관계의 손실 상한선을 숫자로 설정합니다. 숫자가 없으면 감정이 기준을 대체하게 됩니다.",
    `3) 대궁 점검: ${ZIWEI_PALACE_NAME[palace.oppositePalaceId]} 관점에서 반대 의견을 써봅니다. 반대 논리가 빈약하면 아직 정보가 부족하다는 신호입니다.`,
    `4) 삼방 교차검증: ${palace.triadPalaceIds.map((id) => ZIWEI_PALACE_NAME[id]).join(", ")}의 관점으로 실행 가능성을 재평가합니다.`,
    "5) 실행 리듬: 결정 후 72시간 내 첫 행동을 수행하고, 7일 후 리뷰를 예약합니다. 실행이 없는 결론은 판단이 아니라 희망에 가깝습니다.",
  ].join("\n");
}

function buildWeeklyExecutionCalendar(palace: ZiweiPalace): string {
  const caution = sentenceList(ZIWEI_PALACE_TEMPLATES[palace.id].cautionLens, "과속 과부하");
  return [
    "4주 실행 캘린더",
    "1주차: 정렬",
    `핵심 목표를 3개로 제한하고, ${palace.name} 관련 루틴을 하루 20분 블록으로 고정합니다.`,
    "2주차: 가속",
    "성과가 나는 행동을 2배로 늘리고, 반응이 약한 행동은 과감히 제거합니다. 이때 일정표에 회복 시간을 먼저 배치합니다.",
    "3주차: 검증",
    `실행 로그를 사실/감정/결과로 나눠 검토합니다. ${caution} 신호가 보이면 즉시 속도를 낮추고 기준을 재정의합니다.`,
    "4주차: 재설계",
    "다음 달 우선순위를 다시 선택하고, 유지할 습관 2개와 폐기할 습관 1개를 명확히 선언합니다.",
  ].join("\n");
}

function buildReflectionQuestions(palace: ZiweiPalace): string {
  const tpl = ZIWEI_PALACE_TEMPLATES[palace.id];
  const questions = [
    `내가 ${palace.name}에서 가장 자주 반복하는 패턴은 무엇인가?`,
    "그 패턴은 어떤 상황에서 강화되는가?",
    "나는 기준을 지키고 있는가, 감정에 끌리고 있는가?",
    `반대궁(${ZIWEI_PALACE_NAME[palace.oppositePalaceId]})의 시선으로 보면 어떤 리스크가 보이는가?`,
    "이번 주에 줄여야 할 과잉 책임은 무엇인가?",
    "이번 주에 늘려야 할 핵심 행동은 무엇인가?",
    "나의 회복 루틴은 실제로 작동했는가?",
    "다음 한 달 뒤의 내가 지금 결정에 감사할 확률은 얼마나 되는가?",
  ];
  return [
    "자기 점검 질문 8선",
    ...questions.map((q, idx) => `${idx + 1}) ${q}`),
    `보조 질문: ${tpl.insightPrompts.join(" / ")}`,
  ].join("\n");
}

function buildScenarioExpansions(chart: ZiweiDeepChart, palace: ZiweiPalace): string[] {
  const tpl = ZIWEI_PALACE_TEMPLATES[palace.id];
  const mainNames = palace.mainStars.map((s) => s.name);
  const auxNames = palace.auxiliaryStars.map((s) => s.name);
  const badNames = palace.maleficStars.map((s) => s.name);

  return tpl.insightPrompts.map((prompt, idx) => {
    return [
      `심화 시뮬레이션 ${idx + 1}`,
      `질문: ${prompt}`,
      `상황 설정: ${chart.user.name}님이 최근 90일 동안 경험한 주요 이벤트를 떠올리고, 사건-해석-행동-결과를 4열 표로 정리합니다. ${palace.name}의 주성(${mainNames.join(", ") || "주성 정보 제한"})은 결론의 속도보다 구조의 정밀도를 요구하므로, 빠른 직감으로 끝내지 말고 반드시 재검토 단계를 둡니다.`,
      `개입 전략: 보조성(${auxNames.join(", ") || "없음"})은 팀워크, 문서화, 관계 완충에서 효과가 큽니다. 따라서 중요한 결정은 혼자 닫지 말고 1인 이상과 체크포인트를 만듭니다. 반대로 살성(${badNames.join(", ") || "강한 살성 없음"})이 강하게 체감되는 구간은 일정 압축을 멈추고, 손실 상한선을 먼저 설정한 뒤 행동량을 조정합니다.`,
      "실행 결과 점검: 7일 뒤 결과를 볼 때는 성공/실패 이분법 대신, 정확도 향상 여부를 확인합니다. 목표는 완벽한 예측이 아니라 재현 가능한 의사결정 품질의 축적입니다.",
    ].join("\n");
  });
}

function ensureMinLength(baseText: string, targetLength: number, heading: string, pool: string[]): string {
  if (baseText.length >= targetLength) return baseText;
  let text = baseText;
  let i = 0;

  while (text.length < targetLength && i < 30) {
    const chunk = pool[i % pool.length] || "현재 흐름을 기록하고, 다음 행동을 하루 단위로 분리해 실행하세요.";
    text += `\n\n${heading} 보강 ${i + 1}\n${chunk}`;
    i += 1;
  }

  return text;
}

function buildCommonLongBody(chart: ZiweiDeepChart, palace: ZiweiPalace): string {
  const tpl = ZIWEI_PALACE_TEMPLATES[palace.id];
  const keywordAxis = sentenceList(palace.keywords, "균형, 정리, 실행");
  const sihuaAxis = sentenceList(palace.sihua, "사화 정보 제한");
  const cautionAxis = sentenceList(tpl.cautionLens, "과속, 과부하, 관계 마찰");

  const blocks = [
    `핵심 요약\n${tpl.meaning} ${chart.user.name}님의 ${palace.name}은(는) ${keywordAxis}(으)로 압축됩니다. 이 궁은 단일 재능이 아니라 여러 흐름을 동시에 다루는 능력을 보여주며, 특히 선택의 순간에 기준을 어떤 방식으로 세우는지가 장기 성과를 결정합니다.`,
    `궁의 구조 좌표\n${palace.name}은(는) ${ZIWEI_PALACE_NAME[palace.oppositePalaceId]}과 대궁 관계를 이루며, 삼방사정(${palace.triadPalaceIds.map((id) => ZIWEI_PALACE_NAME[id]).join(", ")})과 함께 작동합니다. 대궁은 균형의 축이고 삼방은 실행의 축입니다. 어느 한쪽으로 기울면 단기 성과는 날 수 있어도 유지 비용이 올라가므로, 세 축을 함께 관리하는 시야가 필요합니다.`,
    `에너지 스냅샷\n현재 점수는 ${palace.score}점(${scoreLabel(palace.score)})이며, 대한 흐름은 ${palace.dahan} 구간입니다. 사화 축은 ${sihuaAxis}로 나타납니다. 이 조합은 운의 문이 열릴 때 급속 확장과 빠른 피드백을 만들 수 있지만, 반대로 리듬이 무너지면 작은 실수가 연쇄적으로 확대될 가능성도 내포합니다.`,
    `주성 해석\n${buildStarAnalysis(palace)}`,
    `현실에서 나타나는 모습\n${chart.user.name}님은 이 궁의 흐름이 강해질 때 일상에서 속도와 기준의 균형을 시험받습니다. 강점은 책임감과 실행력으로 나타나고, 피로 구간에서는 과부하와 관계 마찰이 먼저 드러납니다. 따라서 성과 관리와 감정 관리를 분리하지 말고 하나의 운영 시스템으로 취급해야 합니다.`,
    `강점이 작동하는 조건\n첫째, 목표가 명확할 때 집중력이 극대화됩니다. 둘째, 역할 경계가 명확할수록 관계 소모가 줄어듭니다. 셋째, 반복 루틴이 유지될수록 운의 탄성이 커집니다. 이 세 조건을 동시에 맞추면 우연처럼 보이던 성과가 재현 가능한 패턴으로 바뀝니다.`,
    `주의 구간과 리스크 트리거\n${cautionAxis}은(는) 이 궁에서 반복적으로 관찰되는 경고 신호입니다. 경고는 실패의 예언이 아니라 조정의 타이밍을 알려주는 데이터입니다. 경고를 무시하지 않고 초기에 수정하면 같은 별 배치라도 결과의 품질이 크게 달라집니다.`,
    `대궁 조율 전략\n${ZIWEI_PALACE_NAME[palace.oppositePalaceId]}의 관점에서 반대 해석을 써보는 습관이 필요합니다. 지금 내 판단이 너무 공격적인지, 혹은 지나치게 방어적인지를 점검하면 의사결정의 왜곡을 줄일 수 있습니다.`,
    `삼방 실행 전략\n${palace.triadPalaceIds
      .map((id) => `${ZIWEI_PALACE_NAME[id]} 체크포인트`)
      .join(" / ")}를 매주 1회 점검하면, 목표-관계-자원 간 균형이 훨씬 안정됩니다.`,
    `장점\n${sentenceList([
      "핵심 우선순위를 빠르게 정하고 실행하는 능력이 좋습니다.",
      "불확실한 상황에서 의사결정의 중심을 잡는 힘이 있습니다.",
      "관계와 성과를 동시에 관리하려는 태도가 장기적으로 강점이 됩니다.",
    ])}`,
    `주의점\n${sentenceList([
      "중요 결정의 속도를 너무 높이면 후속 정리 비용이 커질 수 있습니다.",
      "감정 피로를 무시하면 건강과 인간관계에 동시 부담이 생길 수 있습니다.",
      "완벽한 통제를 시도할수록 협업 탄성이 줄어들 수 있습니다.",
    ])}`,
    `반복 패턴\n과거 경험을 보면 성과가 빠르게 올라갈수록 휴식이 뒤로 밀리는 패턴이 반복될 가능성이 있습니다. 이 패턴을 끊기 위해서는 목표를 줄이는 것이 아니라 회복 루틴을 먼저 일정표에 고정하는 방식이 필요합니다. 더 중요한 것은, 피로가 쌓였을 때 성과가 떨어진다는 사실을 감정 문제가 아닌 운영 지표로 인식하는 태도입니다.`,
    `운이 열리는 조건\n${sentenceList([
      "핵심 목표를 3개 이하로 제한할 때 집중도와 성취가 동시에 올라갑니다.",
      "역할과 경계를 문장으로 합의할 때 관계 소모가 크게 줄어듭니다.",
      "주간 회고로 실행과 회복의 균형을 점검할 때 상승 곡선이 안정됩니다.",
    ])}`,
    buildDecisionProtocol(chart, palace),
    buildWeeklyExecutionCalendar(palace),
    buildReflectionQuestions(palace),
    `구체적인 개운법\n${tpl.remedies.map((r, idx) => `${idx + 1}) ${r}`).join("\n")}`,
    `오늘부터 실천할 3가지\n1) 오늘의 최우선 1개를 먼저 끝냅니다.\n2) 감정이 고조된 상태의 결정을 하루 보류합니다.\n3) 자기 전 5분 기록으로 내일의 기준을 미리 적습니다.`,
  ];

  const expansions = buildScenarioExpansions(chart, palace);

  const fullText = [...blocks, ...expansions].join("\n\n");
  const reinforcementPool = [
    `${palace.name} 운영 노트: 목표를 늘리기 전에 기준을 먼저 고정하면 같은 노력으로도 결과 편차를 줄일 수 있습니다.`,
    `실행 루틴 점검: ${chart.user.name}님은 결정을 내린 뒤 72시간 안에 첫 행동을 완료할 때 운의 탄성이 커집니다.`,
    `관계 운영 원칙: 설명하지 않은 기대는 갈등으로 전환되기 쉽습니다. 요청과 기준을 문장으로 합의하세요.`,
    `리스크 완충 장치: 피로 신호가 올라오면 성과를 더 밀기보다 회복 루틴을 먼저 작동시키는 편이 장기적으로 유리합니다.`,
    `성장 설계: ${sentenceList(tpl.insightPrompts, "핵심 질문을 주간 단위로 점검")}. 질문을 기록하면 운의 흐름이 감각이 아니라 데이터로 남습니다.`,
  ];
  return ensureMinLength(fullText, 5200, "심층 해설", reinforcementPool);
}

function buildOverview(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const strong = chart.summary.palaceMatrix.find((p) => p.palaceId === chart.summary.strongestPalaceId);
  const weak = chart.summary.palaceMatrix.find((p) => p.palaceId === chart.summary.weakestPalaceId);
  const topThree = chart.summary.palaceMatrix.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  const bottomTwo = chart.summary.palaceMatrix.slice().sort((a, b) => a.score - b.score).slice(0, 2);
  const matrixRows = chart.summary.palaceMatrix
    .map((row) => `${row.palaceName}: 주성(${row.mainStars.join(",") || "정보없음"}), 키워드(${row.keywords.join(",")}), 점수(${row.score})`)
    .join("\n");

  return {
    sectionId: "overview",
    title: OVERVIEW_TEMPLATE.title,
    summary: [
      `핵심 키워드: ${chart.summary.keywords.join(", ")}`,
      `가장 강한 궁: ${strong?.palaceName || "정보 없음"}`,
      `주의가 필요한 궁: ${weak?.palaceName || "정보 없음"}`,
    ],
    fullText: ensureMinLength([
      `종합 브리핑\n${chart.user.name}님의 명반 핵심 방향성은 ${chart.summary.direction}`,
      `핵심 강점 축\n${chart.summary.strengths.join(" ")}`,
      `보완 필요 축\n${chart.summary.weaknesses.join(" ")}`,
      `상승 가속 포인트\n상위 3개 궁은 ${topThree.map((p) => `${p.palaceName}(${p.score})`).join(", ")}입니다. 이 영역은 실행량을 늘릴수록 성과 복리 효과가 커집니다.`,
      `리스크 관리 포인트\n하위 2개 궁은 ${bottomTwo.map((p) => `${p.palaceName}(${p.score})`).join(", ")}입니다. 이 구간은 속도보다 구조 보완이 먼저이며, 회복 루틴과 기준 재정의를 우선해야 합니다.`,
      `운이 열리는 방식\n${chart.summary.openingCondition}`,
      `중요한 선택 기준\n${chart.summary.decisionRule}`,
      "30-60-90일 운영 프레임\n30일은 습관 정렬, 60일은 성과 검증, 90일은 시스템 고정에 집중합니다. 이 리듬을 지키면 운의 상승 구간에서 변동성을 낮추고 성장의 품질을 높일 수 있습니다.",
      `12궁 전체 요약표\n${matrixRows}`,
      "최종 요약\n이번 명반은 강한 영역을 무리하게 더 키우기보다, 취약 영역의 누수를 막아 전체 안정성을 높일 때 결과가 크게 좋아지는 구조입니다.",
    ].join("\n\n"), 4200, "전체 명반 보강", [
      `${chart.user.name}님은 강점 영역의 성과를 취약 영역의 보완으로 연결할 때 전체 인생 곡선이 가장 안정됩니다.`,
      "월간 회고에서 성과 지표와 회복 지표를 동시에 기록하면 과속과 번아웃을 조기에 차단할 수 있습니다.",
      "상위 궁의 실행량을 늘리는 동시에 하위 궁의 누수를 막는 이중 전략이 장기 수익률을 높입니다.",
      `결정 기준은 항상 ${chart.summary.decisionRule}`,
    ]),
    highlights: chart.summary.keywords,
    strengths: chart.summary.strengths,
    cautions: chart.summary.weaknesses,
    remedies: [chart.summary.openingCondition],
    actionItems: ["핵심 목표 3개 제한", "주간 회고 30분", "결정 전 하루 간격"],
    routine7Days: ["매일 5분 기록", "하루 1회 호흡 리셋", "일정 과부하 점검"],
    routine30Days: ["관계 포트폴리오 정리", "재정 흐름 점검", "환경 리셋 1회"],
  };
}

function buildMaster(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const strong = chart.summary.palaceMatrix.find((p) => p.palaceId === chart.summary.strongestPalaceId);
  const weak = chart.summary.palaceMatrix.find((p) => p.palaceId === chart.summary.weakestPalaceId);

  const roadmap = [
    "| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |",
    "|---|---|---|---|---|",
    "| 1~7일 | 리듬 정렬 | 수면/기록 루틴 고정 | 과도한 목표 설정 금지 | 에너지 기복 완화 |",
    "| 8~30일 | 구조 정리 | 돈/일/관계 체크리스트 실행 | 충동 결정 주의 | 실행 안정성 증가 |",
    "| 31~60일 | 성과 가속 | 핵심 프로젝트 1개 집중 | 과책임 패턴 경계 | 성취감 상승 |",
    "| 61~90일 | 확장 준비 | 협업/환경 확장 실험 | 무리한 확장 금지 | 장기 성장 기반 확보 |",
  ].join("\n");

  return {
    sectionId: "master",
    title: MASTER_TEMPLATE.title,
    summary: [
      `가장 강한 운: ${strong?.palaceName || "정보 없음"}`,
      `보완이 필요한 운: ${weak?.palaceName || "정보 없음"}`,
      "앞으로 90일은 속도보다 구조를 우선하는 전략이 유효합니다.",
    ],
    fullText: ensureMinLength([
      `전략 선언\n12궁 종합 기준으로 ${chart.user.name}님의 인생 방향은 ${chart.summary.direction}`,
      "1년 전략\n성과보다 리듬의 안정성을 먼저 확보해 변동성을 낮춥니다. 특히 일정 구조, 회복 루틴, 관계 경계 설정을 같은 레벨의 운영 지표로 관리해야 합니다.",
      "3년 전략\n핵심 전문성 하나를 중심축으로 브랜드/평판 자산을 누적합니다. 단기 성과보다 신뢰 자산을 우선할 때 기회 밀도가 꾸준히 높아집니다.",
      "리스크 아키텍처\n성공 확률을 높이는 방법은 더 많은 일을 하는 것이 아니라, 반복 손실을 만드는 패턴을 줄이는 것입니다. 과속, 과책임, 회복 지연은 대표적인 손실 패턴이며, 이 셋을 관리하면 상승 구간의 유지 시간이 길어집니다.",
      `90일 실행 로드맵\n${roadmap}`,
      "의사결정 나침반\n중요한 결정은 즉시 결론 대신 초안-검증-확정 3단계로 운영합니다. 초안은 24시간 이내 작성, 검증은 최소 1회 타인 리뷰, 확정은 실행 일정과 함께 고정합니다.",
      "관계/일/돈 통합 운영\n관계는 에너지의 원천, 일은 성취의 통로, 돈은 선택의 자유를 만듭니다. 세 축이 분리되면 불균형이 커지므로 월 1회 통합 리뷰를 통해 균형을 재설정하세요.",
      "마무리 선언\n나는 성과를 위해 회복을 포기하지 않고, 확장을 위해 기준을 포기하지 않겠습니다. 이 원칙을 지킬수록 운명은 우연이 아닌 설계 가능한 흐름으로 바뀝니다.",
      `최종 조언: ${MASTER_TEMPLATE.declarationPrefix} 반복 가능한 루틴으로 운명의 밀도를 높이겠습니다.`,
    ].join("\n\n"), 4300, "마스터플랜 보강", [
      "90일 단위 목표는 많을수록 좋지 않습니다. 핵심 목표 1~2개에 집중할 때 성취 품질이 높아집니다.",
      "리스크를 줄이는 가장 빠른 방법은 과속 의사결정의 빈도를 줄이고 검증 루틴을 고정하는 것입니다.",
      "성과의 반짝임보다 시스템의 재현성을 우선하면 장기적으로 더 큰 확장을 만들 수 있습니다.",
      `실행 기준은 ${chart.summary.openingCondition}`,
    ]),
    highlights: ["1년 전략", "3년 전략", "90일 로드맵"],
    strengths: ["집중력", "구조화", "지속성"],
    cautions: ["과속", "과책임", "회복 지연"],
    remedies: ["주간 회고", "월간 리셋", "분기 전략 점검"],
    actionItems: ["오늘 우선순위 1개", "이번주 관계 정리 1건", "이번달 환경 리셋 1건"],
    routine7Days: ["기록", "호흡", "걷기"],
    routine30Days: ["재정 점검", "일정 정리", "휴식 설계"],
  };
}

export function generateZiweiDeepChapter(chart: ZiweiDeepChart, sectionId: ZiweiSectionId): ZiweiDeepChapter {
  if (sectionId === "overview") return buildOverview(chart);
  if (sectionId === "master") return buildMaster(chart);

  const palace = palaceById(chart, sectionId);
  if (!palace) {
    return {
      sectionId,
      title: "분석 준비 중",
      summary: ["선택한 궁 정보를 찾지 못했습니다."],
      fullText:
        "선택한 궁 데이터가 누락되어 기본 분석만 제공합니다. 입력값을 확인한 뒤 다시 계산하면 더 정밀한 결과를 확인할 수 있습니다.",
      highlights: ["데이터 누락"],
      strengths: [],
      cautions: ["입력값 점검 필요"],
      remedies: ["생년월일/출생시/성별 재확인"],
      actionItems: ["다시 계산하기"],
      routine7Days: [],
      routine30Days: [],
    };
  }

  const title = `${ZIWEI_PALACE_NAME[palace.id]} 심화 분석`;
  const fullText = buildCommonLongBody(chart, palace);

  return {
    sectionId,
    palaceId: palace.id,
    title,
    subtitle: `${palace.name} · 지지 ${palace.earthlyBranch}`,
    summary: [
      `${palace.name} 핵심 키워드: ${sentenceList(palace.keywords, "균형, 관리")}`,
      `주성: ${sentenceList(palace.mainStars.map((s) => s.name), "정보 없음")}`,
      `사화: ${sentenceList(palace.sihua, "기본 흐름")}`,
    ],
    fullText,
    highlights: palace.keywords,
    strengths: [
      "강점은 구조화된 실행에서 크게 발현됩니다.",
      "관계와 성과를 동시에 보는 시야가 있습니다.",
      "반복 루틴에 들어가면 성장 탄성이 커집니다.",
    ],
    cautions: [
      "감정이 고조된 날의 결정을 줄여야 합니다.",
      "회복 없이 확장하면 누적 피로가 빠르게 증가합니다.",
      "경계 없는 배려는 관계 소모로 이어질 수 있습니다.",
    ],
    remedies: ZIWEI_PALACE_TEMPLATES[palace.id].remedies,
    actionItems: [
      "오늘 최우선 1개 먼저 완료",
      "결정 전 사실-감정-행동 분리 기록",
      "저녁 10분 회복 루틴 실행",
    ],
    routine7Days: [
      "매일 5분 기록",
      "매일 20분 걷기",
      "핵심 대화 1회 사전 정리",
    ],
    routine30Days: [
      "월말 일정 다이어트",
      "관계/재정/건강 3축 리셋",
      "다음달 우선순위 3개 재설정",
    ],
  };
}
