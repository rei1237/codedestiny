import { normalizeNarrativeParagraphs } from './narrative-format.js';

function task(id, title, minChars) { return { id, minChars, prompt: `${title} 부분만 해설하세요. 다른 부분의 내용을 요약하거나 반복하지 마세요.` }; }
// 5,000원 상품: 리포트 목표 합계 12,700자, 궁합 약 12,100자. 분량은 목표일 뿐이고 짧아도 완결된 본문은 전달한다.
export function seedPetReport(blueprint, prompt, systemPrompt) {
  const tasks = [task('personality:0', '명식·종·성장 단계로 읽는 기본 기질과 강점', 1400), task('personality:1', '기질의 반대 조건·과잉 양상과 보호자의 관찰 방법', 1400),
    ...blueprint.deep.habitats.map(item => task(`habitat:${item.id}`, `${item.labelKo} 환경의 장점·반대 조건·현실적인 이용 방법`, 1000)),
    ...blueprint.deep.plays.slice(0, 3).map((item, i) => task(`play:${i}`, `${item.labelKo} 놀이를 아이의 상태에 맞추는 방법`, 600)),
    task('coach', '보호자가 일상에서 관찰하고 조정할 단계별 행동', 1000), task('care', '생활 리듬과 휴식·자극 관리의 조건과 주의점 (진단·처방 금지)', 1400), task('closing', '개별 관찰을 이어 가는 보호자의 선택과 마무리', 700)];
  return { blueprint, prompt, systemPrompt, tasks, kind: 'report' };
}
export function seedPetCompat(compat, pets, prompt, systemPrompt) {
  const tasks = [task('overview:0', '두 아이의 명식·종·기질이 서로 보완하는 생활 패턴', 1200), task('overview:1', '두 아이의 긴장 조건과 반대 상황에서 달라지는 해석', 1200),
    ...compat.dimensions.map(item => task(`dimension:${item.key}`, `${item.labelKo} ${item.value}점의 근거·조건·생활 적용`, 1100)),
    ...compat.sharedPlaces.map(item => task(`place:${item.id}`, `${item.labelKo} 공간을 함께 이용할 때의 거리·순서·관찰 기준`, Math.ceil(1800 / Math.max(1, compat.sharedPlaces.length)))),
    task('caution:0', '활동량·자원·자극이 겹칠 때 주의할 상황과 안전한 조정', 600), task('caution:1', '각자의 휴식·거리·감정 신호를 존중하는 방법', 600),
    task('routine', '두 아이에게 맞추는 일과 예시와 상태별 조정', 1100), task('verdict', '관계의 핵심 조건을 짧게 요약 (결과를 단정하지 않기)', 100)];
  return { compat, pets, prompt, systemPrompt, tasks, kind: 'compat' };
}
// The page shows each part as one pre-line block, and a model sometimes returns a whole part as one
// paragraph; a long block is split at sentence ends (about 400 chars each) without changing its text.
function readable(body) {
  const want = Math.ceil(body.length / 400), paragraphs = body.split(/\n\s*\n/).filter(part => part.trim());
  return paragraphs.length < want && paragraphs.some(part => part.length > 600) ? normalizeNarrativeParagraphs(body, want) : body;
}
export function renderPetNarrative(state) {
  const parts = state.parts, text = id => readable(parts[id] || '');
  if (state.kind === 'report') return { title: '반려동물 사주 AI 심층 리포트', blueprint: state.blueprint, report: {
    personality: [text('personality:0'), text('personality:1')].filter(Boolean), habitats: state.blueprint.deep.habitats.map(item => ({ id: item.id, reading: text(`habitat:${item.id}`) })),
    plays: state.blueprint.deep.plays.slice(0, 3).map((_, i) => text(`play:${i}`)).filter(Boolean), coach: text('coach'), care: text('care'), closing: text('closing'), degraded: false,
  } };
  return { title: '반려동물 궁합 분석', compat: state.compat, pets: state.pets, reading: {
    verdict: text('verdict'), overview: [text('overview:0'), text('overview:1')].filter(Boolean), dimensions: state.compat.dimensions.map(item => ({ key: item.key, reading: text(`dimension:${item.key}`) })),
    places: state.compat.sharedPlaces.map(item => ({ id: item.id, reading: text(`place:${item.id}`) })), cautions: [text('caution:0'), text('caution:1')].filter(Boolean), routine: text('routine'), degraded: false,
  } };
}
