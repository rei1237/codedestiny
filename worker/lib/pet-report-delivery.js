function task(id, title, minChars) { return { id, minChars, prompt: `${title} 부분만 해설하세요. 다른 부분의 내용을 요약하거나 반복하지 마세요.` }; }
function withFloor(tasks) {
  const addition = Math.ceil(Math.max(0, 20000 - tasks.reduce((sum, item) => sum + item.minChars, 0)) / tasks.length);
  return tasks.map(item => ({ ...item, minChars: item.minChars + addition }));
}
export function seedPetReport(blueprint, prompt, systemPrompt) {
  const tasks = [task('personality:0', '명식·종·성장 단계로 읽는 기본 기질과 강점', 2200), task('personality:1', '기질의 반대 조건·과잉 양상과 보호자의 관찰 방법', 2200),
    ...blueprint.deep.habitats.map(item => task(`habitat:${item.id}`, `${item.labelKo} 환경의 장점·반대 조건·현실적인 이용 방법`, 1600)),
    ...blueprint.deep.plays.slice(0, 3).map((item, i) => task(`play:${i}`, `${item.labelKo} 놀이를 아이의 상태에 맞추는 방법`, 1000)),
    task('coach', '보호자가 일상에서 관찰하고 조정할 단계별 행동', 1600), task('care', '생활 리듬과 휴식·자극 관리의 조건과 주의점 (진단·처방 금지)', 2200), task('closing', '개별 관찰을 이어 가는 보호자의 선택과 마무리', 1000)];
  return { blueprint, prompt, systemPrompt, tasks: withFloor(tasks), minBodyChars: 20000, kind: 'report' };
}
export function seedPetCompat(compat, pets, prompt, systemPrompt) {
  const tasks = [task('overview:0', '두 아이의 명식·종·기질이 서로 보완하는 생활 패턴', 2000), task('overview:1', '두 아이의 긴장 조건과 반대 상황에서 달라지는 해석', 2000),
    ...compat.dimensions.map(item => task(`dimension:${item.key}`, `${item.labelKo} ${item.value}점의 근거·조건·생활 적용`, 2000)),
    ...compat.sharedPlaces.map(item => task(`place:${item.id}`, `${item.labelKo} 공간을 함께 이용할 때의 거리·순서·관찰 기준`, Math.ceil(3000 / Math.max(1, compat.sharedPlaces.length)))),
    task('caution:0', '활동량·자원·자극이 겹칠 때 주의할 상황과 안전한 조정', 800), task('caution:1', '각자의 휴식·거리·감정 신호를 존중하는 방법', 800),
    task('routine', '두 아이에게 맞추는 일과 예시와 상태별 조정', 1500), task('verdict', '관계의 핵심 조건을 짧게 요약 (결과를 단정하지 않기)', 60)];
  return { compat, pets, prompt, systemPrompt, tasks: withFloor(tasks), minBodyChars: 20000, kind: 'compat' };
}
export function renderPetNarrative(state) {
  const parts = state.parts, text = id => parts[id] || '';
  if (state.kind === 'report') return { title: '반려동물 사주 AI 심층 리포트', blueprint: state.blueprint, report: {
    personality: [text('personality:0'), text('personality:1')].filter(Boolean), habitats: state.blueprint.deep.habitats.map(item => ({ id: item.id, reading: text(`habitat:${item.id}`) })),
    plays: state.blueprint.deep.plays.slice(0, 3).map((_, i) => text(`play:${i}`)).filter(Boolean), coach: text('coach'), care: text('care'), closing: text('closing'), degraded: false,
  } };
  return { title: '반려동물 궁합 분석', compat: state.compat, pets: state.pets, reading: {
    verdict: text('verdict'), overview: [text('overview:0'), text('overview:1')].filter(Boolean), dimensions: state.compat.dimensions.map(item => ({ key: item.key, reading: text(`dimension:${item.key}`) })),
    places: state.compat.sharedPlaces.map(item => ({ id: item.id, reading: text(`place:${item.id}`) })), cautions: [text('caution:0'), text('caution:1')].filter(Boolean), routine: text('routine'), degraded: false,
  } };
}
