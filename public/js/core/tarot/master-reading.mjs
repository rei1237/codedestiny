// 무료 타로 풀이 엔진. 서버·LLM 호출 없이 카드 세 장을 타로 마스터의 읽기 순서로 묶는다.
// 카드별 문장은 생성물(master-reading-data.mjs)에서 오고, 카드를 잇는 문구는 이 파일에 손으로 쓴다.
import { CARETARO_BASENAMES, MASTER_READING_CARDS as CARDS } from './master-reading-data.mjs';

export const MODAL_POSITIONS = ['지금까지의 흐름', '현재의 결', '다음 선택 기준'];
export const MASTER_READING_CATEGORIES = {
  daily: '오늘의 운세',
  love: '연애운',
  reunion: '재회운',
  career: '직장·커리어운',
  money: '재물운',
  health: '건강운',
  exam: '시험·합격운',
  people: '대인관계운',
};

const ASSETS_BASE = 'https://assets.code-destiny.com';
export function caretaroImageUrl(code, { width } = {}) {
  const basename = CARETARO_BASENAMES[String(code || '').toUpperCase()];
  if (!basename) return '';
  const path = `DestinyCafe/caretaro/${encodeURIComponent(`${basename}.webp`)}`;
  const size = Number.parseInt(width, 10);
  return size > 0
    ? `${ASSETS_BASE}/cdn-cgi/image/width=${size},format=auto,fit=scale-down/${path}`
    : `${ASSETS_BASE}/${path}`;
}

// 카드의 톤: 정방향에서 무거운 장면을 그리는 카드를 표시한다.
const HEAVY = new Set(['M13', 'M15', 'M16', 'M18', 'S03', 'S05', 'S07', 'S08', 'S09', 'S10', 'C05', 'C08', 'W05', 'W07', 'W10', 'P05']);
const toneOf = (code, reversed) => {
  if (HEAVY.has(code)) return reversed ? 'easing' : 'strain';
  return reversed ? 'blocked' : 'open';
};
const isBright = (tone) => tone === 'open' || tone === 'easing';
const TONE_WEIGHT = { strain: 3, blocked: 2, easing: 1, open: 0 };

function arcOf(first, last) {
  if (isBright(first) && isBright(last)) return first === 'easing' || last === 'easing' ? 'turning' : 'clear';
  if (isBright(first)) return 'caution';
  return isBright(last) ? 'opening' : 'mending';
}

const VERDICT = {
  daily: {
    opening: '무겁던 기운이 뒤로 갈수록 풀리는 하루예요. 앞쪽의 답답함에 머물지 말고, 끝에 놓인 카드 쪽으로 천천히 걸어가 보세요.',
    caution: '시작은 가볍지만 뒤로 갈수록 살필 것이 늘어나는 하루예요. 기분이 좋을 때 약속을 늘리기보다, 힘을 남겨 두는 편이 어울려요.',
    clear: '세 장의 결이 고르게 열려 있는 하루예요. 새 일을 크게 벌이기보다, 지금 잘 되는 일에 마음을 조금 더 실어 보세요.',
    mending: '오늘은 앞으로 나가기보다 정비에 어울리는 카드들이에요. 할 일을 줄이고 꼭 필요한 하나를 챙기는 쪽이 하루를 지켜 줘요.',
    turning: '눌려 있던 마음이 조금씩 움직이는 전환의 카드예요. 아직 다 풀리지 않았어도, 오늘은 달라진 부분을 알아봐 주는 하루예요.',
  },
  love: {
    opening: '엇갈리던 마음을 다시 풀어 볼 여지가 보이는 카드예요. 확인받으려 하기보다, 내 마음을 한 문장 먼저 건네 볼 만한 흐름이에요.',
    caution: '설렘은 살아 있지만 뒤로 갈수록 조심할 자리가 보여요. 기대를 앞세우기 전에, 서로의 속도부터 맞춰 보는 편이 어울려요.',
    clear: '주고받는 마음이 부드럽게 이어지는 카드예요. 관계의 답을 정하기보다, 지금의 온기를 말로 표현해 볼 때예요.',
    mending: '관계를 밀어붙이기보다 내 마음을 먼저 돌볼 카드들이에요. 답을 재촉하기 전에, 무엇이 서운했는지 스스로 정리해 보세요.',
    turning: '굳어 있던 마음이 풀리는 쪽으로 움직이는 카드예요. 지난 오해를 그대로 두기보다, 달라진 내 마음을 살펴볼 때예요.',
  },
  reunion: {
    opening: '지난 관계를 조금 더 맑게 볼 수 있는 카드예요. 다시 만날지 정하기 전에, 내 마음의 이유부터 살펴볼 때예요.',
    caution: '그리움은 살아 있지만 뒤쪽 카드가 신중함을 말해요. 마음이 앞설 때일수록 결정은 미루고, 나를 먼저 챙겨 주세요.',
    clear: '그때의 일을 편안하게 돌아볼 힘이 있는 카드예요. 다시 잇든 아니든, 내 마음이 무엇을 바라는지 또렷이 해 볼 때예요.',
    mending: '다시 잇는 일보다 내 상처를 돌보는 일이 앞에 놓인 카드들이에요. 연락의 답을 찾기 전에 내가 괜찮아지는 쪽을 먼저 골라 주세요.',
    turning: '아팠던 기억의 힘이 조금씩 약해지는 카드예요. 관계의 복구를 묻기 전에, 내가 달라진 부분을 먼저 확인해 보세요.',
  },
  career: {
    opening: '막혔던 일이 정리되는 쪽으로 움직이는 카드예요. 앞쪽의 부담을 혼자 끌어안기보다, 사실부터 나눠 볼 때 다음 방향이 또렷해져요.',
    caution: '시작의 힘은 좋지만 뒤로 갈수록 점검할 일이 보이는 카드예요. 속도를 올리기 전에 약속과 범위를 한 번 더 확인해 주세요.',
    clear: '지금 하는 일의 흐름이 고르게 이어지는 카드예요. 새 판을 짜기보다, 잘 되는 방식을 다듬는 데 힘이 실려요.',
    mending: '성과를 서두르기보다 기반을 다시 살필 카드들이에요. 일을 늘리지 말고, 가장 흔들리는 한 곳을 먼저 정비해 주세요.',
    turning: '답답하던 업무의 무게가 조금씩 옮겨 가는 카드예요. 하던 방식을 그대로 밀기보다, 달라진 조건에 맞게 고쳐 볼 때예요.',
  },
  money: {
    opening: '돈의 흐름을 다시 잡아 볼 수 있는 카드예요. 큰 결정보다 숨은 지출을 밝히는 데 힘이 실리는 때예요.',
    caution: '당장은 편안해 보여도 뒤로 갈수록 살필 항목이 보여요. 쓰기 전에 한 번 더 확인하는 습관이 흐름을 지켜 줘요.',
    clear: '돈을 다루는 리듬이 안정적으로 읽히는 카드예요. 새로운 욕심보다, 지금의 관리 방식을 이어 가는 쪽이 어울려요.',
    mending: '늘리기보다 지키는 일이 앞에 놓인 카드들이에요. 새 지출과 새 약속을 잠시 멈추고, 지금의 내역부터 정리해 보세요.',
    turning: '돈 걱정의 무게가 조금씩 풀리는 쪽으로 움직이는 카드예요. 불안한 마음을 숫자로 옮겨 적으면 다음 판단이 쉬워져요.',
  },
  health: {
    opening: '쌓였던 긴장이 뒤로 갈수록 풀리는 카드예요. 무리한 계획보다 회복의 리듬을 되찾는 데 마음을 쓰기 좋아요.',
    caution: '기운은 있어도 뒤로 갈수록 쉬어 갈 자리가 보이는 카드예요. 컨디션이 좋은 날일수록 몸을 아껴 써 주세요.',
    clear: '몸과 마음의 리듬이 비교적 고르게 읽히는 카드예요. 지금 잘 지키는 생활 습관을 그대로 이어 가 보세요.',
    mending: '오늘은 몸과 마음을 쉬게 하는 쪽이 어울리는 카드들이에요. 해야 할 일을 줄이고 쉬는 시간부터 정해 두세요.',
    turning: '굳어 있던 긴장이 조금씩 풀리는 쪽으로 움직이는 카드예요. 나아지는 신호를 천천히 살피며 하루의 속도를 맞춰 보세요.',
  },
  exam: {
    opening: '흩어졌던 집중이 뒤로 갈수록 모이는 카드예요. 결과를 점치기보다 약한 부분을 드러내 채우기 좋은 때예요.',
    caution: '의욕은 좋지만 뒤로 갈수록 점검할 자리가 보이는 카드예요. 범위를 넓히기보다 아는 것을 확실히 다지는 쪽이 어울려요.',
    clear: '공부의 리듬이 고르게 이어지는 카드예요. 새로운 방법을 찾기보다, 지금의 계획을 끝까지 따라가는 데 힘이 실려요.',
    mending: '진도보다 컨디션과 계획을 다시 세울 카드들이에요. 분량을 줄이더라도 끝낼 수 있는 만큼으로 다시 잡아 보세요.',
    turning: '시험 불안의 무게가 조금씩 옮겨 가는 카드예요. 막막함을 할 일 목록으로 바꾸면 다음 한 칸이 보이기 시작해요.',
  },
  people: {
    opening: '꼬였던 관계를 말로 풀어 볼 여지가 보이는 카드예요. 많은 사람보다 한 사람과의 관계를 돌보는 데 힘이 실려요.',
    caution: '분위기는 좋아도 뒤로 갈수록 거리를 살필 자리가 보여요. 다 맞춰 주겠다는 약속보다, 지킬 수 있는 만큼만 말해 주세요.',
    clear: '사람들과의 호흡이 편안하게 이어지는 카드예요. 관계를 넓히기보다, 곁에 있는 사람에게 고마움을 표현해 볼 때예요.',
    mending: '관계를 넓히기보다 내 자리를 먼저 지킬 카드들이에요. 지치게 하는 만남은 줄이고, 편안한 거리를 다시 정해 보세요.',
    turning: '불편했던 사이의 온도가 조금씩 달라지는 카드예요. 지난 해석을 붙들기보다, 지금 들리는 말에 귀 기울여 보세요.',
  },
};

const FLOW_GROUP = { opening: 'rising', turning: 'rising', caution: 'guarded', mending: 'guarded', clear: 'steady' };
const FLOW = {
  daily: {
    rising: '앞쪽 시간에는 생각이 많아도 괜찮아요. 작은 일을 하나 끝내고 나면 마음이 조금씩 가벼워지는 흐름으로 읽혀요.',
    guarded: '일정을 빽빽하게 채우기보다 여백을 남겨 두는 편이 어울려요. 뒤로 갈수록 내 기운을 아껴 쓰는 흐름으로 읽혀요.',
    steady: '특별한 일을 만들지 않아도 하던 일이 무난하게 이어지는 흐름으로 읽혀요. 내 속도를 지키는 것만으로 충분해요.',
  },
  love: {
    rising: '가벼운 대화에서 시작해 진심으로 옮겨 가는 편이 어울려요. 상대의 속마음은 카드로 단정할 수 없으니, 직접 듣는 쪽을 택해 주세요.',
    guarded: '답을 서두르기보다 지금의 거리를 지키는 편이 어울려요. 상대의 속마음은 카드로 단정할 수 없으니, 짐작으로 결론 내리지 말아 주세요.',
    steady: '함께 있는 시간을 편안하게 쌓아 가는 흐름으로 읽혀요. 상대의 속마음은 카드로 단정할 수 없으니, 궁금한 것은 직접 물어봐 주세요.',
  },
  reunion: {
    rising: '당장의 답을 찾기보다, 내가 달라졌다고 느끼는 부분을 먼저 확인하는 흐름이 어울려요.',
    guarded: '지금은 관계의 결론보다 내 일상을 다시 세우는 흐름이 어울려요. 마음이 가라앉은 뒤에 생각해도 늦지 않아요.',
    steady: '지난 시간을 담담하게 돌아볼 수 있는 흐름이에요. 좋았던 기억과 힘들었던 기억을 나란히 놓고 생각해 보세요.',
  },
  career: {
    rising: '대화나 정리 한 번으로 막힌 부분이 풀릴 수 있어요. 결정한 내용을 글로 남겨 두면 흐름을 잇기 쉬워요.',
    guarded: '새 일을 받기 전에 지금 맡은 범위부터 확인하는 흐름이 어울려요. 약속과 기한을 다시 적어 보면 무리한 곳이 드러나요.',
    steady: '맡은 일을 차근차근 이어 가기 좋은 흐름이에요. 잘 되고 있는 방식을 기록해 두면 다음 일에도 쓸 수 있어요.',
  },
  money: {
    rising: '당장 들어올 돈을 묻기보다, 이번 달 흐름을 정리하는 데 어울리는 카드들이에요.',
    guarded: '새로운 지출이나 약속을 늘리기보다, 나가는 돈을 먼저 살피는 흐름에 어울리는 카드들이에요.',
    steady: '지금의 저축과 지출 습관을 이어 가며 작은 부분만 다듬는 흐름에 어울리는 카드들이에요.',
  },
  health: {
    rising: '오늘은 몸을 몰아붙이기보다 쉬는 시간을 먼저 정해 두는 편이 어울려요. 작은 회복이 하루의 리듬을 되돌려 줘요.',
    guarded: '평소 하던 양을 조금 줄이고 잠과 식사를 먼저 챙기는 편이 어울려요. 쉬는 일도 오늘의 할 일로 넣어 주세요.',
    steady: '지금의 생활 리듬을 유지하는 편이 어울려요. 무리한 변화보다 꾸준한 습관이 몸과 마음을 편안하게 해 줘요.',
  },
  exam: {
    rising: '새로운 범위를 늘리기보다, 틀렸던 문제를 다시 보는 시간에 힘이 실려요.',
    guarded: '계획을 무리하게 늘리지 않는 편이 어울려요. 끝낼 수 있는 분량을 정하고 잠을 지키는 쪽에 힘이 실려요.',
    steady: '지금의 계획을 그대로 따라가며 복습의 간격을 지키는 쪽에 힘이 실려요.',
  },
  people: {
    rising: '가까운 사람과 가벼운 대화로 시작하면, 복잡하던 관계의 온도가 조금 내려갈 수 있어요.',
    guarded: '모든 자리에 다 응하기보다 만남의 수를 조절하는 편이 어울려요. 내 기운이 남아 있어야 관계도 오래가요.',
    steady: '평소처럼 편하게 어울리면서 고마운 마음을 말로 표현하기 좋은 흐름이에요.',
  },
};

const SAFETY = {
  health: '계속되는 증상이 있다면 카드로 판단하지 말고 전문가와 상의해 주세요. 타로는 진단을 대신할 수 없어요.',
  money: '투자 판단은 카드가 아니라 확인된 정보로 해 주세요.',
  exam: '합격 여부는 카드가 정할 수 없어요. 준비의 방향을 살피는 데 써 주세요.',
  reunion: '상대가 원하지 않는 연락은 하지 않는 쪽을 택해 주세요. 결정은 마음이 맑은 시간에 내려 주세요.',
  love: '상대의 마음을 시험하는 말은 하지 않는 편이 좋아요.',
};

const TINY_ACTION = {
  daily: {
    bright: '오늘 편하게 떠오르는 한 사람에게 안부 한 줄을 먼저 보내 보세요.',
    dim: '오늘 할 일 가운데 하나를 내일로 넘기고, 그 시간에 잠깐 쉬어 보세요.',
  },
  love: {
    bright: '"나는 이럴 때 고마웠어"처럼 내 마음만 담은 문장을 하나 전해 보세요.',
    dim: '보내고 싶은 말을 먼저 메모에 적고, 내 마음이 가라앉은 뒤에 다시 읽어 보세요.',
  },
  reunion: {
    bright: '그 사람과 다시 만나면 달라졌으면 하는 점을 한 가지만 적어 보세요.',
    dim: '보내고 싶은 말을 메모에 적고, 하루 지난 뒤 다시 읽어 보세요.',
  },
  career: {
    bright: '이번 주에 잘 된 일 하나를 골라, 어떻게 했는지 세 줄로 남겨 보세요.',
    dim: '마음에 걸리는 업무 하나를 골라 관련된 사람에게 사실만 물어보세요.',
  },
  money: {
    bright: '이번 달에 잘 쓴 돈과 아까운 돈을 하나씩 적어 보세요.',
    dim: '최근 일주일 지출을 열어 가장 아깝게 느껴지는 항목 하나에 표시해 보세요.',
  },
  health: {
    bright: '오늘 몸이 편안했던 순간을 하나 떠올리고, 내일도 같은 시간을 만들어 보세요.',
    dim: '잠들기 한 시간 전 화면을 끄고, 물 한 잔을 천천히 마셔 보세요.',
  },
  exam: {
    bright: '오늘 공부한 내용 하나를 아무 자료 없이 소리 내어 설명해 보세요.',
    dim: '자주 틀리는 유형 세 가지를 적고, 그중 하나만 오늘 끝내 보세요.',
  },
  people: {
    bright: '고마웠던 사람에게 구체적인 이유를 담아 짧은 인사를 건네 보세요.',
    dim: '마음에 걸린 말이 있었다면 "그때 이런 뜻이었어?"라고 가볍게 물어보세요.',
  },
};

const BETWEEN_TAIL = {
  opening: '앞의 무게를 지워야 다음이 열리는 순서가 아니에요. 그 무게를 알아본 자리에서 다음 카드로 넘어가는 순서예요.',
  caution: '좋은 기운을 믿되 끝까지 같은 속도로 달리라는 뜻은 아니에요. 뒤쪽 카드가 멈춰 볼 자리를 짚어 줘요.',
  clear: '세 장이 크게 부딪히지 않아서 무엇을 더하기보다 흐름을 끊지 않는 일이 중요해요.',
  mending: '세 장은 빨리 답을 내라고 재촉하지 않아요. 무리한 곳을 먼저 살피면 다음 선택의 폭이 넓어져요.',
  turning: '아직 끝난 이야기는 아니지만, 무게가 옮겨 가기 시작한 모양이에요. 달라지는 쪽을 알아보는 일이 이 리딩의 중심이에요.',
};

const CLOSE = {
  opening: [
    '흐린 날이 길었어도 괜찮아요. 오늘은 한 걸음이면 충분해요.',
    '무거웠던 만큼 천천히 걸어도 돼요. 카드도 서두르지 않았어요.',
    '끝에 놓인 카드를 기억해 주세요. 오늘은 그쪽을 바라보는 것만으로 충분해요.',
  ],
  caution: [
    '좋은 기운일수록 아껴 써도 괜찮아요. 오늘은 나에게 여유를 남겨 두어요.',
    '조심한다고 해서 멈추는 건 아니에요. 한 번 더 살피는 것도 앞으로 가는 일이에요.',
    '다 해내지 않아도 돼요. 오늘 지킬 한 가지만 골라 보아요.',
  ],
  clear: [
    '잘 되고 있는 것을 알아봐 주는 일도 오늘의 할 일이에요.',
    '특별하지 않아도 괜찮아요. 편안한 하루는 그 자체로 좋은 카드예요.',
    '지금의 온기를 조금만 더 곁에 두어요. 오늘은 그걸로 충분해요.',
  ],
  mending: [
    '쉬어 가는 날도 흐름의 한 부분이에요. 오늘은 조금 살살 대해 주세요.',
    '오늘 다 풀지 않아도 돼요. 마음에 남은 한 가지만 살펴보아요.',
    '멈춰 있는 것처럼 보여도 괜찮아요. 정리한 만큼 다음이 가벼워져요.',
  ],
  turning: [
    '조금 달라진 마음을 그냥 지나치지 말아요. 오늘은 그걸 알아본 것으로 충분해요.',
    '아직 다 풀리지 않아도 괜찮아요. 움직이기 시작한 쪽을 믿어 보아요.',
    '천천히 바뀌는 것도 바뀌는 거예요. 오늘의 나를 조금 칭찬해 주세요.',
  ],
};

// 조사: 숫자로 끝나는 이름(컵 2, 소드 10)도 읽는 소리로 판단한다.
const DIGIT_JONG = { 0: 1, 1: 8, 3: 16, 6: 1, 7: 8, 8: 8 };
const jongOf = (word) => {
  const last = String(word).trim().slice(-1);
  if (/\d/.test(last)) return DIGIT_JONG[last] || 0;
  const code = last.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : 0;
};
const eulNeun = (word) => `${word}${jongOf(word) ? '은' : '는'}`;
const iGa = (word) => `${word}${jongOf(word) ? '이' : '가'}`;
const euro = (word) => {
  const jong = jongOf(word);
  return `${word}${jong && jong !== 8 ? '으로' : '로'}`;
};

const SUIT_INFO = {
  wands: { label: '완드', element: '불의 기운', body: '생각보다 행동과 추진력 쪽에 무게가 실려요. 무엇을 시작하고 밀어붙일지가 이번 리딩의 중심이에요.' },
  cups: { label: '컵', element: '물의 기운', body: '판단이나 속도보다 감정과 관계가 이번 리딩의 중심이에요.' },
  swords: { label: '소드', element: '공기의 기운', body: '감정보다 생각과 말이 이번 리딩의 중심이에요. 판단을 어떻게 내리고 어떻게 전할지 살펴보게 돼요.' },
  pentacles: { label: '펜타클', element: '흙의 기운', body: '기분보다 돈, 일, 몸처럼 손에 잡히는 현실이 이번 리딩의 중심이에요.' },
};

const phaseOf = (card) => {
  if (card.arcana === 'major') {
    if (card.number <= 7) return { label: '여정의 초반', rank: 1 };
    if (card.number <= 14) return { label: '여정의 중반', rank: 2 };
    return { label: '여정의 후반', rank: 3 };
  }
  if (card.number <= 3) return { label: '시작', rank: 1 };
  if (card.number <= 6) return { label: '전개', rank: 2 };
  if (card.number <= 9) return { label: '시험', rank: 3 };
  if (card.number === 10) return { label: '완결', rank: 4 };
  return { label: '사람', rank: 0 };
};

function numberRow(cards) {
  const phases = cards.map(phaseOf);
  const head = phases.map((p) => p.label).join(' → ');
  let body;
  if (phases.some((p) => p.rank === 0)) {
    body = '사람 카드가 놓였어요. 사건보다 그 자리에서 어떤 태도를 고를지를 함께 읽어요.';
  } else if (phases[2].rank > phases[0].rank) {
    body = '뒤로 갈수록 이야기가 무르익는 순서예요. 지금 자리보다 조금 앞을 보고 움직여도 좋아요.';
  } else if (phases[2].rank < phases[0].rank) {
    body = '깊은 자리를 지나 새로 시작하는 쪽으로 돌아오는 순서예요. 끝난 일을 놓는 만큼 가벼워져요.';
  } else if (phases[1].rank !== phases[0].rank) {
    body = '가운데 카드에서 다른 자리를 들렀다가 처음과 같은 깊이로 돌아오는 순서예요. 처음의 물음을 한 번 더 깊게 보게 돼요.';
  } else {
    body = '같은 단계에 머무는 순서예요. 다음으로 넘어가기보다 지금 단계를 충분히 겪어 내는 데 뜻이 있어요.';
  }
  return { label: '숫자 흐름', head, body };
}

function directionRow(items, today) {
  if (today) return { label: '방향', head: '세 장 모두 정방향', body: '오늘의 세 장은 역방향 없이 힌트로 읽어요.' };
  const reversed = items.filter((c) => c.reversed).length;
  const head = `역행 ${reversed}장 · 순행 ${3 - reversed}장`;
  if (reversed === 0) return { label: '방향', head, body: '세 장 모두 바로 서 있어요. 카드의 기운이 겉으로 드러나는 구조예요.' };
  if (reversed === 3) return { label: '방향', head, body: '세 장 모두 거꾸로 놓였어요. 겉의 사건보다 안쪽에서 늦춰지고 쌓인 것을 먼저 읽는 구조예요.' };
  const where = items.map((c, i) => (c.reversed ? i : -1)).filter((i) => i >= 0);
  if (where.length === 1 && where[0] === 0) return { label: '방향', head, body: '안으로 맺힌 기운은 지나온 자리에만 있어요. 현재와 다음 자리는 바로 서 있는 구조예요.' };
  if (where.length === 1 && where[0] === 2) return { label: '방향', head, body: '다음 자리의 카드가 거꾸로 놓였어요. 나아가기 전에 속도와 방향을 안쪽에서 다시 고를 자리예요.' };
  return { label: '방향', head, body: '바로 선 카드와 거꾸로 선 카드가 섞여 있어요. 드러난 일과 안에서 늦춰지는 일을 나눠서 읽어요.' };
}

function compositionRow(cards, today) {
  const majors = cards.filter((c) => c.arcana === 'major').length;
  if (today) return { label: '구성', head: '메이저 3장', body: '오늘의 카드는 22장 모두 메이저예요. 사건보다 마음의 방향을 읽어요.' };
  const head = `메이저 ${majors}장 · 마이너 ${3 - majors}장`;
  if (majors >= 2) return { label: '구성', head, body: '큰 흐름의 신호가 강한 편이에요. 일상의 사건보다 마음의 전환점에 가까운 리딩이에요.' };
  if (majors === 1) return { label: '구성', head, body: '큰 흐름의 카드 한 장 아래로 일상의 장면이 놓였어요. 메이저가 방향을 말하고 마이너가 구체적인 자리를 보여 줘요.' };
  return { label: '구성', head, body: '일상의 장면으로 이루어진 리딩이에요. 큰 전환보다 지금 손댈 수 있는 일에 가깝게 읽어요.' };
}

function suitRow(cards) {
  const counts = {};
  for (const card of cards) if (card.suit && SUIT_INFO[card.suit]) counts[card.suit] = (counts[card.suit] || 0) + 1;
  const suits = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!suits.length) return null;
  if (suits.length > 1 && suits[0][1] === suits[1][1]) {
    const names = suits.map(([s]) => SUIT_INFO[s].label);
    return { label: '우세 수트', head: `${names.join(' · ')} 나란히`, body: '여러 수트가 고르게 놓였어요. 한 가지 기운으로 밀기보다 서로 다른 면을 함께 살피는 리딩이에요.' };
  }
  const info = SUIT_INFO[suits[0][0]];
  return { label: '우세 수트', head: `${info.label} · ${info.element}`, body: info.body };
}

const HELP = new Set(['fire|air', 'air|fire', 'water|earth', 'earth|water']);
const CLASH = new Set(['fire|water', 'water|fire', 'air|earth', 'earth|air']);
function relationLine(a, b) {
  if (a.arcana === 'major' && b.arcana === 'major') {
    const pa = phaseOf(a).rank;
    const pb = phaseOf(b).rank;
    if (pb > pa) return '두 장 모두 큰 흐름의 카드이고, 여정이 한 걸음 더 깊어지는 쪽으로 놓였어요.';
    if (pb < pa) return '두 장 모두 큰 흐름의 카드이고, 깊은 자리에서 앞선 물음으로 다시 돌아오는 모양이에요.';
    return '두 장 모두 큰 흐름의 카드이고, 같은 물음을 다른 얼굴로 묻고 있어요.';
  }
  if (a.arcana === 'major') return '큰 흐름의 카드가 일상의 장면으로 내려와, 그 뜻을 손에 잡히게 풀어 줘요.';
  if (b.arcana === 'major') return '일상의 장면이 큰 흐름의 카드로 이어져, 작은 일이 큰 방향과 닿아요.';
  if (a.element === b.element) return '같은 원소가 이어져 기운이 더 짙어져요. 좋은 쪽이든 조심할 쪽이든 강하게 드러나요.';
  const key = `${a.element}|${b.element}`;
  if (HELP.has(key)) return '서로를 북돋는 원소라 흐름이 매끄럽게 이어져요.';
  if (CLASH.has(key)) return '서로 부딪히는 원소라 속도를 맞추는 일이 먼저예요.';
  return '직접 돕지도 부딪히지도 않는 원소라, 둘을 잇는 일은 내 몫으로 남아요.';
}

function betweenText(items, arc) {
  const named = items.map((c) => ({ ...c, title: c.reversed ? `${c.card.name} ${c.dirLabel}` : c.card.name, word: c.entry.words[0] }));
  const [a, b, c] = named;
  const firstLink = relationLine(a.card, b.card);
  const secondLink = relationLine(b.card, c.card);
  return [
    `${a.title}의 '${a.word}'에서 ${b.title}의 '${euro(b.word).replace(b.word, `${b.word}'`)} 이어져요. ${firstLink}`,
    `그 끝에 ${iGa(c.title)} '${c.word}'의 자리를 맡아요. ${secondLink === firstLink ? '마지막 두 장도 같은 관계로 이어져요.' : secondLink}`,
    BETWEEN_TAIL[arc],
  ].join(' ');
}

function positionText(entry, category, index) {
  const pick = {
    daily: entry.daily,
    love: entry.love,
    reunion: entry.reunion,
    career: entry.career,
    money: entry.money,
    people: entry.people,
    health: entry.mind,
    // 마지막 자리의 조언은 종합의 '오늘 해 볼 한 가지'에 쓰므로 겹치지 않게 뺀다.
    exam: index < 2 ? `${entry.core} ${entry.advice}` : entry.core,
  }[category];
  return `${entry.line} ${pick}`;
}

const hashOf = (text) => [...text].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);

/**
 * 카드 세 장을 분야별 종합 풀이로 묶는다. 같은 입력이면 항상 같은 결과를 돌려준다.
 * @returns {{verdict:string, positions:Array, energy:Array, between:string, synthesis:{flow:string,caution:string,action:string}, close:string, arc:string}}
 */
export function buildMasterReading({ cards, category = 'daily', surface = 'modal', positions = MODAL_POSITIONS, positionTexts } = {}) {
  if (!Array.isArray(cards) || cards.length !== 3) throw new Error('카드는 세 장이어야 해요.');
  const today = surface === 'today';
  const cat = MASTER_READING_CATEGORIES[category] ? category : 'daily';
  const items = cards.map(({ code, reversed }, i) => {
    const card = CARDS[code];
    if (!card) throw new Error(`없는 카드 코드: ${code}`);
    const isReversed = !today && Boolean(reversed);
    return {
      code,
      card,
      reversed: isReversed,
      entry: isReversed ? card.r : card.u,
      tone: toneOf(code, isReversed),
      dirLabel: today ? '' : (isReversed ? '역행' : '순행'),
      index: i,
    };
  });
  const arc = arcOf(items[0].tone, items[2].tone);
  const heaviest = items.reduce((top, item) => (TONE_WEIGHT[item.tone] > TONE_WEIGHT[top.tone] ? item : top), items[0]);
  const last = items[2];
  const seed = hashOf(`${cat}:${items.map((c) => `${c.code}${c.reversed ? 'r' : 'u'}`).join('')}`);
  const safety = SAFETY[cat];
  const cards3 = items.map((c) => c.card);
  const energy = [
    compositionRow(cards3, today),
    today ? null : suitRow(cards3),
    directionRow(items, today),
    numberRow(cards3),
  ].filter(Boolean);
  return {
    arc,
    categoryLabel: today ? '오늘' : MASTER_READING_CATEGORIES[cat],
    verdict: VERDICT[cat][arc],
    positions: items.map((item, i) => ({
      label: positions[i],
      code: item.code,
      name: item.card.name,
      reversed: item.reversed,
      dirLabel: item.dirLabel,
      text: positionTexts?.[i] ?? positionText(item.entry, cat, i),
    })),
    energy,
    between: betweenText(items, arc),
    synthesis: {
      flow: FLOW[cat][FLOW_GROUP[arc]],
      caution: [heaviest.entry.caution, safety].filter(Boolean).join(' '),
      action: `${last.entry.advice} ${TINY_ACTION[cat][isBright(last.tone) ? 'bright' : 'dim']}`,
    },
    close: CLOSE[arc][seed % CLOSE[arc].length],
  };
}

const TEN_GOD_FEEL = {
  비겁: '내 힘으로 버티고 스스로 서려는 기운',
  비견: '나와 같은 자리에서 나란히 서려는 기운',
  겁재: '경쟁 속에서 내 몫을 지키려는 기운',
  식상: '안의 것을 밖으로 표현하고 풀어내는 기운',
  식신: '편안하게 표현하고 풀어내는 기운',
  상관: '틀을 넘어 솔직하게 드러내는 기운',
  재성: '손에 잡히는 결과를 챙기고 다루는 기운',
  편재: '넓게 움직이며 기회를 다루는 기운',
  정재: '꾸준히 모으고 관리하는 기운',
  관성: '책임과 규칙 안에서 자리를 잡는 기운',
  편관: '압박을 견디며 결단하는 기운',
  정관: '질서와 약속을 지키는 기운',
  인성: '배우고 받아들이며 마음을 채우는 기운',
  편인: '깊이 받아들이고 곱씹는 기운',
  정인: '배움과 돌봄으로 안정을 찾는 기운',
  역마: '자리를 옮기며 흐름을 바꾸는 기운',
};
const OUTWARD = new Set(['식상', '식신', '상관', '재성', '편재', '정재', '역마', '겁재']);

/** 명리 타로의 십성 설명. rows는 [{name, tenGod}] 세 칸이다. */
export function sipsinNote(rows) {
  const [first, middle, last] = rows;
  const lineOf = (row) => {
    const feel = TEN_GOD_FEEL[row.tenGod];
    return feel ? `${row.name}의 ${eulNeun(row.tenGod)} ${feel}이에요.` : '';
  };
  const firstOut = OUTWARD.has(first.tenGod);
  const lastOut = OUTWARD.has(last.tenGod);
  let bridge;
  if (!firstOut && lastOut) bridge = '안으로 모은 마음이 밖으로 흘러나오는 결이고';
  else if (firstOut && !lastOut) bridge = '밖으로 쓰던 힘을 안으로 거두는 결이고';
  else if (firstOut) bridge = '바깥으로 움직이는 힘이 이어지는 결이고';
  else bridge = '안쪽을 다지는 힘이 이어지는 결이고';
  return [lineOf(first), lineOf(last), `${bridge}, 사이의 ${iGa(middle.name)} 그 통로가 돼요.`].filter(Boolean).join(' ');
}
