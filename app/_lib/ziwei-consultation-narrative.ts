import type { ZiweiDeepChart, ZiweiPalace, ZiweiPalaceId } from './ziwei-types';

export type ConsultationTopic = 'life' | 'career' | 'wealth' | 'love' | 'relationships' | 'family' | 'health' | 'timing';
type Disposition = 'lead' | 'think' | 'care' | 'keep' | 'change';
type Voice = { kind: Disposition; headline: string; scene: string; gift: string; burden: string; action: string };

// 해석 정본. 계산·궁 배치·점수와 분리하며, 근거 없는 개인 경험은 만들어내지 않는다.
const VOICES: Record<string, Voice> = {
  자미: { kind: 'lead', headline: '당신은 방향이 보일 때, 사람과 일을 이끄는 힘이 살아납니다.', scene: '모두가 망설이는 자리에서 먼저 큰 그림을 그리는 쪽에 가깝습니다. 맡은 일이 많아질수록 도움을 청하기보다 스스로 정리하려 했을 수 있습니다.', gift: '흩어진 의견에서 함께 갈 방향을 찾는 힘', burden: '책임을 나누기 전에 혼자 짊어지는 습관', action: '지금 맡은 일 중 다른 사람에게 결정권까지 맡길 수 있는 일 하나를 골라보세요.' },
  천기: { kind: 'think', headline: '당신은 서두르기보다, 흐름을 이해했을 때 정확하게 움직입니다.', scene: '하나를 고르기 전에도 여러 경우를 떠올리는 편입니다. 신중함 덕분에 실수를 줄이지만, 답을 찾느라 시작할 힘을 다 써버리는 날도 있을 수 있습니다.', gift: '복잡한 상황을 작은 선택으로 나누는 힘', burden: '가능성을 모두 확인하느라 시작을 미루는 습관', action: '미루고 있는 선택에 필요한 정보 세 가지만 적고, 확인할 날짜를 정해보세요.' },
  태양: { kind: 'lead', headline: '당신은 누군가에게 도움이 된다는 감각에서 힘을 얻습니다.', scene: '주변이 어려워하면 먼저 움직이는 편입니다. 고맙다는 말이 힘이 되면서도, 늘 챙기는 사람이 되는 순간에는 서운함이 남았을 수 있습니다.', gift: '사람들이 다시 움직이게 만드는 밝은 추진력', burden: '다른 사람의 필요를 내 일정 앞에 두는 습관', action: '이번 주에는 부탁을 수락하기 전에 내 일정에 남는 시간을 먼저 확인해보세요.' },
  무곡: { kind: 'keep', headline: '당신은 말보다, 끝까지 지켜낸 행동으로 마음을 보여줍니다.', scene: '중요한 순간에는 조건과 책임부터 확인하는 편입니다. 실제로 챙긴 것이 많은데도 차갑다는 말을 들었다면, 마음이 부족해서라기보다 표현 순서가 달랐을 수 있습니다.', gift: '약속을 실행 가능한 결과로 만드는 힘', burden: '해결책을 먼저 말해 감정이 뒤로 밀리는 습관', action: '해결책을 건네기 전에 상대의 마음을 이해한 문장 하나를 먼저 말해보세요.' },
  천동: { kind: 'care', headline: '당신은 마음이 편안한 자리에서 오래가는 힘을 냅니다.', scene: '맞서기보다 분위기를 부드럽게 만드는 쪽을 고를 수 있습니다. 작은 불편을 넘겨주다 어느 날 유난히 지쳤다면, 쉴 틈 없이 맞춰온 몫이 있었는지 살펴보세요.', gift: '긴장된 관계에도 숨 쉴 공간을 만드는 힘', burden: '불편함을 괜찮다는 말로 덮어두는 습관', action: '가볍게 넘겼던 부탁 하나를 골라, 가능한 범위와 어려운 범위를 나눠 말해보세요.' },
  염정: { kind: 'lead', headline: '당신은 스스로 납득한 원칙이 있을 때 단단해집니다.', scene: '겉으로 바로 드러내지 않아도 안에서는 옳고 그름을 오래 따지는 편입니다. 설명하지 않은 기준까지 상대가 알아주길 기다리면 혼자 서운해질 수 있습니다.', gift: '쉽게 흔들리지 않고 약속을 지키는 힘', burden: '속마음을 숨긴 채 상대의 반응을 기다리는 습관', action: '양보하기 어려운 조건 하나와 조율할 수 있는 조건 하나를 구분해 말해보세요.' },
  천부: { kind: 'keep', headline: '당신은 지킬 것을 먼저 정할 때, 더 멀리 갈 수 있습니다.', scene: '좋은 기회 앞에서도 지금 가진 기반을 먼저 돌아보는 편입니다. 주변보다 느린 것 같아도, 오래 유지할 수 있는지를 살피는 시간에는 당신만의 가치가 있습니다.', gift: '변화 속에서도 일상을 유지하는 힘', burden: '익숙한 안전함 때문에 작은 실험도 미루는 습관', action: '현재의 기반을 해치지 않는 작은 시도 하나에 쓸 시간과 비용을 정해보세요.' },
  태음: { kind: 'think', headline: '당신은 조용히 살피고, 깊이 이해한 뒤 마음을 엽니다.', scene: '그때는 괜찮다고 했어도 혼자 돌아와 대화를 다시 떠올릴 수 있습니다. 마음을 정리할 시간이 필요하다는 사실을 먼저 알려주면 침묵이 오해로 굳는 일을 줄일 수 있습니다.', gift: '말로 드러나지 않은 차이를 섬세하게 살피는 힘', burden: '정리되지 않은 감정을 혼자 오래 품는 습관', action: '마음에 남은 대화를 사실과 감정 두 칸으로 적고, 전달할 말 한 문장을 골라보세요.' },
  탐랑: { kind: 'change', headline: '당신은 직접 만나고 경험할 때, 새로운 가능성을 발견합니다.', scene: '머리로만 비교할 때보다 사람과 현장 속에서 감이 잡히는 편입니다. 흥미로운 일이 늘어나면 시작은 즐겁지만 마무리할 여유가 부족해질 수 있습니다.', gift: '서로 다른 사람과 경험을 연결하는 힘', burden: '새로운 자극에 끌려 마무리를 뒤로 미루는 습관', action: '새 일을 시작하기 전에 진행 중인 일 하나의 완료 조건과 날짜를 적어보세요.' },
  거문: { kind: 'think', headline: '당신은 납득할 수 있는 설명이 있을 때 마음이 놓입니다.', scene: '남들은 넘어가는 말에서도 앞뒤가 맞는지 확인하는 편입니다. 꼼꼼함이 도움이 되지만, 가까운 사람에게는 질문의 이유를 먼저 말해야 추궁으로 들리지 않습니다.', gift: '지나치기 쉬운 모순을 발견하는 힘', burden: '확인이 길어지면서 대화의 온도를 놓치는 습관', action: '다음 질문 앞에 “따지려는 게 아니라, 이 부분을 이해하고 싶어요”라고 덧붙여보세요.' },
  천상: { kind: 'care', headline: '당신은 서로 다른 입장 사이에서 함께 갈 길을 찾습니다.', scene: '어느 한쪽만 손해 보는 상황을 쉽게 지나치지 않는 편입니다. 모두를 배려하다 내 생각이 사라졌다면, 합의에 당신의 몫도 포함되어 있는지 돌아보세요.', gift: '갈라진 의견을 현실적인 합의로 잇는 힘', burden: '중재를 맡다가 내 필요를 뒤로 미루는 습관', action: '다음 조율 자리에서는 다른 사람의 의견보다 내 요구 한 가지를 먼저 메모해보세요.' },
  천량: { kind: 'care', headline: '당신은 오래 지킬 수 있는 원칙에서 안정감을 찾습니다.', scene: '급한 상황일수록 잠시 떨어져 전체를 보려는 편입니다. 경험에서 건넨 조언도 상대가 위로를 원할 때는 거리감이 될 수 있으니, 어떤 도움이 필요한지 먼저 들어보세요.', gift: '어려운 순간에도 무너지지 않을 원칙을 세우는 힘', burden: '상대가 원하는 도움보다 옳은 답을 먼저 주는 습관', action: '도움을 건네기 전 “같이 방법을 찾을까요, 먼저 들어줄까요?”라고 물어보세요.' },
  칠살: { kind: 'change', headline: '당신은 결정이 필요한 순간에 집중력이 살아납니다.', scene: '애매하게 끌고 가기보다 방향을 정하고 움직이는 쪽에 가깝습니다. 결단으로 일을 풀어도, 함께하는 사람이 따라올 시간을 놓치면 혼자 앞서간 느낌이 남을 수 있습니다.', gift: '멈춘 일을 결정과 실행으로 옮기는 힘', burden: '결정 이후의 설명과 정리를 생략하는 습관', action: '결정을 전할 때 이유, 달라지는 일, 다시 점검할 날짜를 함께 알려주세요.' },
  파군: { kind: 'change', headline: '당신은 길이 막히면, 새 길을 만드는 사람입니다.', scene: '남들이 익숙하게 따르는 방식도 스스로 납득되지 않으면 바꾸고 싶어지는 편입니다. 그 힘을 오래 쓰려면, 다시 시작할 것과 지켜갈 것을 나누는 일이 필요합니다.', gift: '막힌 상황을 새로운 방식으로 풀어내는 힘', burden: '지친 마음 때문에 잘되던 것까지 바꾸는 습관', action: '바꾸고 싶은 일 옆에 그대로 남겨둘 것 한 가지를 적어보세요. 변화의 범위가 선명해집니다.' },
};
const HERO_NOTES: Record<string, string> = {
  "자미": "모든 일을 직접 해결하지 않아도 중심은 흔들리지 않습니다. 믿고 맡길 자리를 만드는 것이 다음 성장의 시작입니다.",
  "천기": "아직 답이 모자라다고 느껴질 때도 작은 확인은 시작할 수 있습니다. 생각한 것을 시험해보는 시간이 자신감을 보태줍니다.",
  "태양": "누군가를 돕는 기쁨이 오래가려면 당신에게 돌아오는 시간도 있어야 합니다. 베푸는 일과 쉬는 일을 함께 약속해보세요.",
  "무곡": "말하지 않아도 알아주길 바랐던 마음이 있었을 수 있습니다. 이미 해온 행동에 짧은 설명을 보태면 관계의 온도가 달라집니다.",
  "천동": "편안함을 바라는 마음은 의지가 약하다는 뜻이 아닙니다. 내 속도를 지킬 수 있는 자리가 꾸준함의 출발점이 됩니다.",
  "염정": "소중한 원칙을 지키면서도 방법은 조율할 수 있습니다. 양보할 것과 지킬 것을 구분하면 선택이 덜 무거워집니다.",
  "천부": "안정감을 만드는 감각은 느림과 다릅니다. 돌아올 기반을 남겨두면 새로운 일에도 조금 더 가볍게 다가갈 수 있습니다.",
  "태음": "마음이 늦게 정리되는 날에도 서둘러 괜찮다고 말할 필요는 없습니다. 잠시 생각할 시간을 갖겠다는 말부터 건네도 좋습니다.",
  "탐랑": "마음이 움직이는 곳을 찾는 감각은 소중합니다. 그중 하나를 끝까지 이어갈 여유가 경험을 당신의 실력으로 바꿔줍니다.",
  "거문": "분명히 알고 싶은 마음이 상대를 의심한다는 뜻은 아닙니다. 무엇이 궁금한지보다 왜 중요한지를 먼저 나눠보세요.",
  "천상": "함께 가는 선택에도 당신의 바람이 들어 있어야 합니다. 나의 몫을 말하는 것이 관계의 균형을 깨는 일은 아닙니다.",
  "천량": "오래 생각해온 답이 있어도 바로 건네지 않아도 괜찮습니다. 먼저 들어주는 시간이 당신의 경험을 더 잘 전해줍니다.",
  "칠살": "결정한 뒤에도 함께 갈 사람을 돌아볼 시간이 필요합니다. 속도를 조금 나누면 혼자 앞서가던 힘이 협력으로 이어집니다.",
  "파군": "익숙한 틀에 맞추느라 답답했던 순간이 있었을 수 있습니다. 다시 시작할 용기에, 잘해온 것을 남기는 감각을 더해보세요."
};
const FALLBACK: Voice = { kind: 'think', headline: '당신은 만나는 사람과 환경 속에서 자기 방식을 찾아갑니다.', scene: '같은 일도 누구와 어디에서 하느냐에 따라 반응이 달라질 수 있습니다. 이것은 중심이 없다는 뜻보다, 잘 맞는 환경을 찾는 일이 중요하다는 뜻에 가깝습니다.', gift: '상황을 관찰하며 내게 맞는 방식을 찾아가는 힘', burden: '주변의 기대를 내 선택으로 받아들이는 습관', action: '편안했던 자리와 유독 지쳤던 자리를 하나씩 적고, 사람·역할·속도의 차이를 비교해보세요.' };

export function palaceVoice(palace: ZiweiPalace): Voice {
  const stars = palace.mainStars.length ? palace.mainStars : palace.oppositePalace?.mainStars || [];
  return VOICES[stars[0]?.name] || FALLBACK;
}

const TOPIC_PALACE: Record<ConsultationTopic, ZiweiPalaceId[]> = {
  life: ['ming', 'fortune', 'career'], career: ['career', 'ming', 'wealth'], wealth: ['wealth', 'career', 'property'],
  love: ['spouse', 'ming', 'fortune'], relationships: ['friends', 'siblings', 'travel'], family: ['parents', 'siblings', 'children'],
  health: ['health', 'fortune', 'ming'], timing: ['ming', 'career', 'wealth'],
};
export const CONSULTATION_QUESTIONS: Record<ConsultationTopic, string> = {
  life: '나는 어떤 사람이고, 왜 비슷한 선택을 반복할까요?', career: '어떤 일을 할 때 내 힘이 살아날까요?', wealth: '돈을 어떻게 벌고 다뤄야 안정적일까요?',
  love: '가까워질수록 왜 마음이 어려워질까요?', relationships: '사람들과 더 편하게 지내려면 무엇이 필요할까요?', family: '가족 안에서 내 몫은 어디까지일까요?',
  health: '내가 덜 지치려면 어떤 리듬이 필요할까요?', timing: '앞으로 무엇을 밀고, 무엇을 조심하면 좋을까요?',
};
const ANSWERS: Record<Exclude<ConsultationTopic, 'life' | 'timing'>, Record<Disposition, string>> = {
  career: { lead: '스스로 판단하고 책임질 수 있는 역할에서 일의 보람이 커집니다.', think: '복잡한 문제를 정리하고 깊이를 쌓는 일에서 강점이 살아납니다.', care: '사람의 필요를 읽고 조율하는 일이 당신의 성과로 이어지기 쉽습니다.', keep: '약속한 결과를 차근차근 쌓는 환경에서 실력이 드러납니다.', change: '새로운 과제를 만나 직접 해법을 찾을 때 일의 감각이 살아납니다.' },
  wealth: { lead: '내가 책임질 수 있는 일의 범위를 분명히 할수록 돈 관리도 안정됩니다.', think: '정보와 조건을 충분히 이해하는 방식이 당신의 재물 감각과 잘 맞습니다.', care: '사람을 챙기는 마음과 돈의 약속을 나눌 때 재물의 부담이 줄어듭니다.', keep: '단번의 기회보다 반복해서 남기는 구조가 당신에게 잘 맞습니다.', change: '기회를 잡는 결단력은 있지만, 그 뒤의 정산까지 챙겨야 손에 남습니다.' },
  love: { lead: '관계를 지키려는 마음이 상대의 선택을 대신하지 않을 때 더 가까워집니다.', think: '마음을 충분히 이해받고 싶을수록, 정리할 시간을 말로 알려주는 것이 좋습니다.', care: '맞춰주는 마음만큼 내 바람도 말할 때 관계가 편안해집니다.', keep: '행동으로 챙기는 애정에 짧은 감정 표현을 보태면 마음이 더 잘 전해집니다.', change: '솔직하고 빠르게 다가가는 힘에 서로의 속도를 맞출 여유가 필요합니다.' },
  relationships: { lead: '중심을 잡는 역할은 잘 맞지만, 사람들의 몫까지 대신할 필요는 없습니다.', think: '깊이 통하는 관계가 잘 맞습니다. 확인하는 말에 따뜻한 이유를 보태보세요.', care: '사이를 잇는 재주가 있어도, 모든 갈등의 중재자가 될 필요는 없습니다.', keep: '작은 약속을 지키는 사람과 신뢰를 쌓을 때 관계가 편안합니다.', change: '새로운 인연을 여는 힘이 좋습니다. 오래 갈 관계에는 꾸준한 연락을 남겨보세요.' },
  family: { lead: '가족을 이끄는 책임감과 내 삶의 결정권을 함께 지켜도 괜찮습니다.', think: '가족의 마음을 헤아리되, 말하지 않은 기대까지 혼자 해석할 필요는 없습니다.', care: '돌봄을 오래 이어가려면 당신이 쉬는 시간도 가족의 약속에 넣어야 합니다.', keep: '가족을 위해 지켜온 일상을 유지하되, 부담은 구체적으로 나누는 편이 좋습니다.', change: '가족과 다른 선택을 하더라도, 거리와 연락의 방식은 함께 정할 수 있습니다.' },
  health: { lead: '책임을 다한 뒤 쉬려 하면 휴식이 계속 밀릴 수 있습니다.', think: '생각을 멈출 작은 마감이 있어야 쉬는 시간도 편안해집니다.', care: '다른 사람의 기분에서 잠시 떨어지는 시간이 회복을 돕습니다.', keep: '익숙한 생활 리듬을 지키는 것이 당신에게 편안한 회복 방식입니다.', change: '몰입하는 시간만큼 멈추는 시간을 미리 잡아두는 편이 좋습니다.' },
};
const ACTIONS: Record<ConsultationTopic, string> = {
  life: '', career: '새 제안을 받을 때 맡을 일, 스스로 결정할 범위, 마감일을 한 장에 적어보세요.',
  wealth: '이번 달 들어온 돈과 반드시 나갈 돈을 따로 적고, 마음대로 쓸 수 있는 금액부터 확인해보세요.',
  love: '다음 대화에서는 “당신은 늘” 대신 “그때 나는 이렇게 느꼈고, 다음에는 이것을 원해요”로 말해보세요.',
  relationships: '다음 부탁에는 가능한 시간과 맡을 범위를 함께 답해보세요. 거절할 부분도 처음에 알려주세요.',
  family: '반복되는 집안일 하나를 골라 누가, 언제, 어디까지 맡을지 구체적으로 나눠보세요.',
  health: '일주일 동안 잠든 시각과 가장 지쳤던 순간만 기록하고, 반복되는 일정 하나를 줄여보세요.',
  timing: '앞으로 한 달간 시험해볼 일 하나와 유지할 일 하나를 구분하고, 돌아볼 날짜를 달력에 표시해보세요.',
};
const GENTLER_ACTIONS: Record<ConsultationTopic, string> = {
  life: '', career: '이번 주 마감 중 조정이 필요한 일 하나를 고르고, 가능한 날짜를 먼저 제안해보세요.',
  wealth: '새로운 지출을 결정하기 전에 이번 달 고정 지출과 남길 생활비를 확인하고, 급하지 않은 결제는 하루 뒤에 다시 보세요.',
  love: '감정이 커진 대화는 잠시 멈추고, 다시 이야기할 시간을 함께 정해보세요. 그때 전달할 바람은 한 가지만 남겨보세요.',
  relationships: '대답하기 부담스러운 부탁에는 바로 수락하지 말고, 내 일정을 확인한 뒤 답할 시간을 알려주세요.',
  family: '혼자 해오던 집안일 중 이번 주에 나눠야 할 일 한 가지와 쉬어야 할 시간을 함께 말해보세요.',
  health: '이번 주 일정에서 줄일 수 있는 약속 하나를 골라 쉬는 시간으로 남겨두고, 다음 날 피로가 어땠는지 적어보세요.',
  timing: '당장 바꾸려던 결정 중 되돌리기 어려운 것은 하루 더 두고, 지금 시험할 수 있는 작은 행동부터 적어보세요.',
};
export interface ZiweiQuestionReading {
  id: ConsultationTopic; question: string; conclusion: string; heroNote: string; scenes: string[]; actions: string[];
  keywords: string[]; evidence: { palaceId: ZiweiPalaceId; palaceName: string; lines: string[] }[]; today: string;
}

export function buildQuestionReading(chart: Pick<ZiweiDeepChart, 'palaces' | 'majorPeriods' | 'user'>, id: ConsultationTopic): ZiweiQuestionReading {
  const rows = TOPIC_PALACE[id].map(key => chart.palaces.find(p => p.id === key)).filter((p): p is ZiweiPalace => Boolean(p));
  const first = rows[0];
  const voice = first ? palaceVoice(first) : FALLBACK;
  const stars = first?.mainStars.length ? first.mainStars : first?.oppositePalace?.mainStars || [];
  const secondVoice = stars[1] ? VOICES[stars[1].name] : undefined;
  const constrained = stars.some(s => ['X', '함', '陷'].includes(s.strengthSymbol || s.symbol || s.strength || ''));
  const transforms = [...(first?.fourTransformations || []), ...(first?.incomingFourTransformations || [])];
  const burden = transforms.some(t => t.type === '기')
    ? '마음에 걸린 일을 되짚는 시간이 길어질 수 있습니다. 당장 해결할 수 있는 부분과 기다려야 하는 부분을 나누면 부담을 덜 수 있습니다.'
    : transforms.some(t => t.type === '권')
      ? '주도권을 잡을수록 일이 빨라지지만, 모두의 선택을 대신하는 자리에서는 부담도 커질 수 있습니다.'
      : constrained ? '같은 능력도 재촉받는 자리에서는 쓰기 어려울 수 있습니다. 더 세게 버티기 전에 속도와 역할이 맞는지 살펴보세요.'
        : `${voice.gift}이 장점입니다. 다만 ${voice.burden}이 반복되면 그 장점도 피로로 바뀔 수 있습니다.`;
  const linked = rows[1] ? palaceVoice(rows[1]) : undefined;
  const scenes = [voice.scene, secondVoice && secondVoice !== voice ? `한편 ${secondVoice.gift}도 함께 있습니다. ${burden}` : burden];
  const assistantNames = first?.auxiliaryStars.map(star => star.name) || [];
  if (assistantNames.some(name => ['문창', '문곡'].includes(name))) scenes[1] += ' 생각을 글이나 대화로 정리하는 습관이 이 힘을 받쳐줍니다.';
  else if (assistantNames.some(name => ['좌보', '우필', '천괴', '천월'].includes(name))) scenes[1] += ' 혼자 마무리하려 하기보다, 중간에 의견을 나눌 사람이 있을 때 부담을 덜기 쉽습니다.';
  if (id === 'timing') scenes[1] = '지금 방향을 바꾸고 싶다면, 지쳐서 벗어나려는 마음과 실제로 해보고 싶은 일을 나눠보세요. 첫 시도를 작게 잡으면 결과를 보며 다음 걸음을 조정할 수 있습니다. 구체적인 나이 구간은 아래 대한의 근거에서 확인할 수 있습니다.';
  if (id === 'health') scenes[1] += ' 몸의 불편이 이어진다면 이 생활 조언과 별개로 진료를 받아보세요.';
  return {
    id, question: CONSULTATION_QUESTIONS[id],
    conclusion: id === 'life' ? voice.headline : id === 'timing' ? `${voice.gift}을 살리되, 변화는 작은 시도부터 시작해보세요.` : ANSWERS[id][voice.kind],
    heroNote: HERO_NOTES[stars[0]?.name] || '같은 일도 잘 맞는 자리에서는 다른 경험이 됩니다. 편안했던 환경의 공통점을 찾는 일부터 시작해보세요.',
    scenes, actions: [id === 'life' ? voice.action : constrained || transforms.some(t => t.type === '기') ? GENTLER_ACTIONS[id] : ACTIONS[id]],
    keywords: Array.from(new Set([...(first?.keywords || []), ...(rows[1]?.keywords || [])])).slice(0, 4),
    evidence: rows.map(p => ({ palaceId: p.id, palaceName: p.name, lines: [
      p.mainStars.length ? `${p.name} · ${p.mainStars.map(s => `${s.name} ${s.strengthSymbol || s.symbol || ''}`).join(' · ')}` : `${p.name}에는 주성이 없어 맞은편 ${p.oppositePalace?.name || '궁'}의 ${p.oppositePalace?.mainStars.map(s => s.name).join('·') || '별'}을 함께 읽습니다. 부족함이나 불행을 뜻하지 않습니다.`,
      ...(p.auxiliaryStars.length ? [`곁에서 돕는 별 · ${p.auxiliaryStars.map(s => s.name).join('·')}`] : []),
      ...[...p.fourTransformations, ...p.incomingFourTransformations].map(t => `${t.starName} 화${t.type} · ${t.type === '기' ? '마음이 오래 머무는 과제' : t.type === '권' ? '책임과 주도권' : t.type === '록' ? '키워갈 자원과 인연' : '신뢰를 쌓는 표현'}`),
      ...(id === 'timing' ? [`대한 · ${p.dahan || '구간 정보 없음'} (${p.name}). 명반에 표시된 나이 구간이며 실제 올해의 사건 예측은 아닙니다.`] : []),
    ] })),
    today: linked ? `오늘은 ${linked.burden}이 나타나는 순간을 하나만 알아차려보세요. 바로 고치려 애쓰기보다, 그때 필요했던 것이 무엇인지 한 줄 남겨도 좋습니다.` : '오늘 편안했던 순간을 하나 적어보세요. 그때의 사람과 장소, 속도가 다음 선택의 힌트가 됩니다.',
  };
}
