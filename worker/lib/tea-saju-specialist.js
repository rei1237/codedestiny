// New personal saju only. Stored requests without this version keep their old
// chapter contract, including checkpoints already paid for and in progress.
export const TEA_SAJU_SPECIALIST_VERSION = 'saju-specialist-v2';
export const TEA_SAJU_SPECIALIST_TARGET = 30000;
export const TEA_SAJU_SPECIALIST_SECTIONS = Object.freeze([
  '일의 방향 — 직업과 커리어의 선택',
  '돈의 습관 — 재물과 소비의 균형',
  '가까운 마음 — 연애와 친밀한 관계',
  '함께 사는 결 — 가족과 가정의 경계',
  '회복의 시간 — 건강과 생활 리듬',
]);
export const TEA_SAJU_JOINT_SECTIONS = Object.freeze([
  '연이의 시선 — 반복되는 마음과 나의 강점',
  '네오의 전략 — 선택지의 이득과 감수할 부담',
  '함께 정리하는 30일 — 실행과 재점검 계획',
]);
export const isTeaSajuSpecialist = value => value?.consultationMode === 'saju'
  && ['saju-specialist-v1', TEA_SAJU_SPECIALIST_VERSION].includes(value?.sajuReportVersion);
export const specialistSections = value => value?.sajuReportVersion === TEA_SAJU_SPECIALIST_VERSION
  ? [...TEA_SAJU_SPECIALIST_SECTIONS, ...TEA_SAJU_JOINT_SECTIONS] : TEA_SAJU_SPECIALIST_SECTIONS;
export const specialistTarget = value => value?.sajuReportVersion === TEA_SAJU_SPECIALIST_VERSION ? 35000 : TEA_SAJU_SPECIALIST_TARGET;

export const TEA_SAJU_SPECIALIST_RULES = Object.freeze([
  '공동 상담의 연이 장은 따뜻한 존댓말로 감정과 반복 패턴을 명식 근거에 연결하고, 네오 장은 직설적이되 모욕 없이 선택지별 이득·부담·보류 조건을 정리한다. 공동 계획 장은 오늘·7일·30일의 행동과 확인 지표를 제시한다. 서로 다른 결론이면 성립 조건을 설명하고, 없는 사실이나 시기를 만들지 않는다.',
  '질문에 대한 핵심 답을 questionSummary와 saju.summary 첫 문단에 먼저 제시한다. 조건과 불확실성을 함께 밝힌다.',
  '명식 근거 → 체감할 수 있는 생활 패턴 → 강점과 주의점 → 현실에서 확인할 조건 → 구체적인 실천으로 연결한다. 각 장은 서로 다른 근거와 관점을 담는다.',
  '입력된 일간·오행·십성·월령·강약·조후·격국·합충형파해·시기 자료만 쓴다. 없는 근거는 없다고 말하고 출생시간 미상에서 시주나 정확한 교운 날짜를 추측하지 않는다.',
  '질문 주제를 가장 깊게 다루고, 직업·재물·연애·가족·대인관계·건강과 회복 리듬의 연결을 설명한다. 직업·고용·혼인·자녀·가족 갈등·증상 등 사용자가 말하지 않은 현실을 사실처럼 가정하지 않는다.',
  '건강 장은 수면·휴식·스트레스·과로·회복 습관을 돌아보는 생활 리듬 해설이다. 오행으로 특정 장기 이상, 질병, 발병 시기, 수명, 임신 가능성을 진단·예측하거나 치료·약물·보충제를 처방하지 않는다. 증상에 대한 질문은 명식으로 판단할 수 없음을 설명한다.',
  '대운·세운·월운은 제공된 기간과 계산 근거만 질문에 연결한다. 건강이나 수익의 결과를 약속하지 않고, 전체 대운 리포트를 중복 나열하지 않는다.',
  '선택지마다 얻는 점·부담·확인할 조건·보류할 조건을 비교하고, 오늘·이번 주·다음 점검 때 할 일을 구체화한다. 같은 위로나 문장을 여러 장에서 반복하지 않는다.',
]);

export const specialistRules = value => value?.sajuReportVersion === TEA_SAJU_SPECIALIST_VERSION
  ? TEA_SAJU_SPECIALIST_RULES : TEA_SAJU_SPECIALIST_RULES.slice(1);

export function specialistCheckpointGroups(titles, value) {
  const joint = value?.sajuReportVersion === TEA_SAJU_SPECIALIST_VERSION;
  const lifeStart = titles.length - specialistSections(value).length;
  const lifeEnd = lifeStart + TEA_SAJU_SPECIALIST_SECTIONS.length;
  const sections = (key, label, from, to, extra = []) => ({ key, label,
    paths: [...extra, 'saju.deepSections'], fields: [...new Set([...extra, 'saju.deepSections'].map(path => path.split('.')[0]))],
    sectionTitles: titles.slice(from, to), minChars: 3000, targetChars: 5000, modeMinChars: 18000,
    totalTargetChars: specialistTarget(value), handledElsewhere: [] });
  const groups = [
    sections('specialist-foundation', '질문의 답과 타고난 명식', 0, 4, ['sessionTitle','questionSummary','saju.title','saju.summary','saju.oneLineAdvice']),
    sections('specialist-patterns', '강점·주의점과 현재 시기', 4, 8),
    sections('specialist-relations', '관계와 생활 속 실천', 8, lifeStart),
    sections('specialist-life', '직업·재물·연애', lifeStart, lifeStart + 3),
    sections('specialist-recovery', '가족·건강과 회복 리듬', lifeStart + 3, lifeEnd, ['emotionAnalysis']),
    { key:'specialist-action', label:'연이의 해석과 선택·실행 계획',
      paths:['yeoniReading.intro','yeoniReading.main','yeoniReading.advice','yeoniReading.caution','synthesis','choiceSimulation','actionPrescription','luckyKeywords','closingLine'],
      fields:['yeoniReading','synthesis','choiceSimulation','actionPrescription','luckyKeywords','closingLine'],
      minChars:3000,targetChars:5000,modeMinChars:18000,totalTargetChars:specialistTarget(value),handledElsewhere:[] },
  ];
  if (joint) groups.splice(5, 0, sections('specialist-joint', '연이의 해석·네오의 전략·30일 계획', lifeEnd, titles.length));
  return groups.map(group => ({...group, handledElsewhere:groups.filter(other => other.key !== group.key).map(other => other.label)}));
}

// A narrow output guard, in addition to the prompt policy. It rejects explicit
// disease/organ predictions; it is not a medical classifier.
export function hasSajuHealthPrediction(text) {
  return /(?:암|당뇨|심장병|신장병|간질환|불임)(?:에|이|을|의)?\s*(?:걸릴|발병|생길|찾아올|위험이 높|가능성이 높)|(?:간|심장|폐|신장|위장)(?:의)?\s*기능(?:이|은)\s*(?:약합|약해|저하됩)|(?:질병|발병|수명|임신)\s*(?:시기|가능성|여부)(?:는|가|이)?[^.!?\n]{0,20}(?:확실|예측됩니다|정해져)/u.test(String(text || ''));
}
