import { loadCompatEngine, makePillarPairGenerator } from './saju-compat-engine-loader.mjs';
import { groupFields } from '../../worker/lib/saju-compat-schema.js';

// 실제 엔진이 만든 facts 로 요청 본문을, 필드 명세에서 모의 LLM 응답을 만든다(실호출 없음).
const engine = loadCompatEngine();
engine.api.setUser('상대');
const plain = (value) => JSON.parse(JSON.stringify(value));
const pillars = (text) => ({ pillars: text.split(' ').map((pair) => ({ gan: pair[0], ji: pair[1] })) });

export function requestBody(a, b, compatType = 'love', partnerName = '하늘') {
  const compat = engine.compat(a, b, compatType, partnerName);
  const out = {};
  engine.pastLife(a, b, partnerName, out);
  return { compatType, partnerName, self: pillars(a), partner: pillars(b), facts: plain({ ...compat.facts, pastLife: out.facts }) };
}

export function samplePairs(seed, count) {
  const next = makePillarPairGenerator(seed);
  return Array.from({ length: count }, () => next());
}

const OPENERS = ['아침 대화에서는', '함께 쉬는 저녁에는', '의견이 갈리는 순간에는', '처음 만난 날을 떠올리면', '서로 바쁜 주간에는', '작은 약속을 정할 때는'];
const MIDDLES = ['서로의 속도를 확인하며', '말투를 한 번 더 고르며', '기대를 구체적으로 나누며', '쉬는 시간을 함께 정하며', '고마움을 먼저 말하며', '오해를 바로 풀어 가며'];
const CLOSERS = ['관계가 한결 편안해집니다', '대화가 부드럽게 이어집니다', '서로에게 여유가 생깁니다', '마음의 거리가 가까워집니다'];
let serial = 0;

function sentences(minChars) {
  const out = [];
  let size = 0;
  while (size < minChars) {
    serial += 1;
    const sentence = `${OPENERS[serial % OPENERS.length]} ${serial}번째 장면처럼 ${MIDDLES[(serial * 7) % MIDDLES.length]} 지내시면 ${CLOSERS[(serial * 3) % CLOSERS.length]}.`;
    out.push(sentence);
    size += sentence.replace(/\s/g, '').length;
  }
  return out;
}

function assign(object, path, value) {
  const keys = path.split('.');
  let node = object;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  node[keys.at(-1)] = value;
}

/** 그룹의 필수 필드를 목표 글자 수 × scale 로 채운 응답 객체. skip 에 든 경로는 비운다. */
export function llmResponse(group, input, { scale = 1, skip = [] } = {}) {
  const out = {};
  for (const spec of groupFields(group, input).required) {
    if (skip.includes(spec.path)) continue;
    if (spec.kind === 'list') assign(out, spec.path, Array.from({ length: spec.count }, () => sentences(Math.max(10, spec.target * scale)).join(' ')));
    else assign(out, spec.path, sentences(Math.max(10, spec.target * scale)).join(' '));
  }
  return out;
}
