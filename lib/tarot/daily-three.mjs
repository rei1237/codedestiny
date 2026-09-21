// Daily reflection, not a prediction or the paid Mind Scan relationship reading.
export const DAILY_TAROT_VERSION = 1;
export const DAILY_TAROT_KEY = 'cd:yeoni:daily-three:v1';
export const DAILY_POSITIONS = ['오늘의 마음', '마주할 흐름', '작은 실천'];

// Slots follow the existing M00–M21 major-card definitions.
export const DAILY_MEANINGS = [
 ['익숙한 방식 밖으로 눈이 가는 마음이에요. 설렘과 걱정이 함께 있어도 괜찮아요.','새로운 제안을 만나면 바로 결정하기보다 작게 경험할 방법을 찾아보세요.','평소와 다른 길을 10분 걸어보세요. 눈에 들어온 것 하나를 기억해 두세요.'],
 ['할 수 있는 일을 직접 시작하고 싶은 마음이 올라와요. 이미 가진 도구부터 살펴봐요.','아이디어를 말로만 두지 않고 작은 형태로 보여줄 때 대화가 쉬워질 수 있어요.','미뤄 둔 일 하나에 15분만 써보세요. 완성보다 첫 흔적을 남기는 것이 목표예요.'],
 ['말로 정리되지 않은 느낌이 있나요? 바로 답을 내리지 않아도 괜찮아요.','조용히 관찰할 시간이 도움이 될 수 있어요. 직감과 확인한 사실은 나눠 보세요.','답하기 어려운 메시지는 잠시 두고, 내가 확실히 아는 사실 세 가지를 적어보세요.'],
 ['누군가를 돌보듯 나도 편안하게 대하고 싶은 날이에요. 받는 마음도 연습해 봐요.','빨리 해내려는 마음보다 꾸준한 돌봄이 필요한 일이 눈에 들어올 수 있어요.','식사 한 끼를 서두르지 않고 챙겨보세요. 내게 편안했던 순간을 하나 남겨요.'],
 ['흔들리지 않는 기준이 필요한 마음이에요. 모든 것을 혼자 통제할 필요는 없어요.','역할이나 약속을 분명히 하면 불필요한 긴장을 줄일 수 있어요.','오늘 꼭 할 일 하나와 하지 않을 일 하나를 정해보세요.'],
 ['믿고 따를 기준을 찾고 있나요? 익숙한 조언도 내 상황에 맞는지 살펴봐요.','경험 있는 사람의 조언을 듣되 내 선택을 대신 맡기지는 마세요.','배워 보고 싶던 주제의 글 한 편을 읽고, 내게 맞는 문장 하나만 적어보세요.'],
 ['중요한 것을 고르고 싶은 마음이에요. 누군가의 기대와 내 바람을 나눠 봐요.','서로 다른 선택 사이에서 무엇을 더 소중히 여기는지 드러날 수 있어요.','고민 중인 선택 옆에 각각 얻는 것과 놓치는 것을 한 줄씩 써보세요.'],
 ['앞으로 나아가고 싶은 힘이 있어요. 속도보다 방향부터 확인해도 좋아요.','여러 일을 한꺼번에 끌고 가기보다 한 방향에 힘을 모아보세요.','오늘의 우선순위를 하나만 정하고 알림을 잠시 꺼두세요.'],
 ['애쓰는 마음을 다그치기보다 부드럽게 다룰 때 힘이 남아요.','민감한 대화에서는 빠른 반응보다 한 번의 멈춤이 도움이 될 수 있어요.','답하기 전에 숨을 천천히 세 번 쉬어보세요. 하고 싶은 말을 짧게 골라요.'],
 ['잠깐 혼자 정리할 시간이 필요할 수 있어요. 거리를 두는 것과 관계를 끊는 것은 달라요.','주변의 속도에서 한 걸음 벗어나면 내 기준이 조금 더 선명해질 수 있어요.','휴대전화를 내려놓고 10분 동안 오늘 마음에 남은 일을 적어보세요.'],
 ['계획이 달라질까 신경 쓰이는 마음이에요. 바꿀 수 있는 부분부터 붙잡아 봐요.','예상과 다른 일정도 다른 선택지를 살피는 계기가 될 수 있어요.','오늘 일정에 15분의 여유를 남겨두세요. 변경 가능한 일 하나를 표시해요.'],
 ['한쪽으로 기울지 않은 판단을 하고 싶은 마음이에요. 감정도 사실도 함께 살펴요.','약속이나 역할을 다시 확인하면 오해를 줄일 수 있어요.','결정하기 전 확인된 사실과 내 추측을 두 줄로 나눠 적어보세요.'],
 ['열심히 해도 제자리처럼 느껴질 수 있어요. 잠시 멈추는 선택도 가능해요.','다른 사람의 관점에서 보면 풀리지 않던 부분이 새롭게 보일 수 있어요.','막힌 일을 잠시 내려놓고 “다른 방법은 무엇일까?”를 한 문장으로 적어보세요.'],
 ['예전 방식을 놓기가 아쉬운 마음이에요. 이 카드는 실제 죽음을 뜻하지 않아요.','끝내야 할 작은 습관을 정리하면 새 일에 쓸 자리가 생길 수 있어요.','더는 필요하지 않은 할 일 하나를 목록에서 지워보세요.'],
 ['지나치게 쏟거나 참지 않고 적당한 리듬을 찾고 싶은 마음이에요.','서로 다른 속도를 맞출 때는 양쪽이 감당할 수 있는 간격이 중요해요.','일과 쉼 사이에 짧은 휴식을 정해보세요. 지킬 수 있는 크기면 충분해요.'],
 ['자꾸 확인하게 되는 것이 있나요? 끌리는 마음을 탓하지 말고 알아차려 봐요.','익숙해서 반복하는 선택이 지금도 필요한지 살펴볼 수 있어요.','습관처럼 여는 앱 하나를 30분만 쉬어보세요. 그동안 하고 싶었던 일을 골라요.'],
 ['당연하다고 여긴 것이 흔들리면 놀랄 수 있어요. 이 카드는 재난의 예고가 아니에요.','계획을 지탱하던 가정을 다시 확인하면 무리한 기대를 덜 수 있어요.','잘못되면 큰일 날 것 같은 일을 적고, 실제로 준비할 수 있는 대안 하나를 정해요.'],
 ['조금씩 다시 기대해 보고 싶은 마음이에요. 회복의 속도를 재촉하지 않아도 돼요.','작지만 꾸준한 시도가 자신감을 되찾는 계기가 될 수 있어요.','최근 나아진 점을 한 가지 적어보세요. 아주 작은 변화도 괜찮아요.'],
 ['분명하지 않은 상황에 생각이 많아질 수 있어요. 불안이 곧 사실인 것은 아니에요.','확인되지 않은 이야기는 결론을 미루고 필요한 정보를 더 살펴보세요.','걱정 하나 옆에 “직접 확인할 방법”을 적어보세요. 오늘 못 알아도 괜찮아요.'],
 ['편안하게 나를 드러내고 싶은 마음이에요. 잘 보이려는 노력은 잠시 내려놓아요.','작은 기쁨을 함께 나누면 대화가 부드러워질 수 있어요.','고마웠던 사람에게 구체적인 이유를 담아 짧은 인사를 건네보세요.'],
 ['지나온 선택을 다시 돌아보는 마음이에요. 후회만으로 자신을 평가하지 마세요.','예전에 미뤄 둔 일을 지금의 조건으로 다시 판단해 볼 수 있어요.','다시 시작하고 싶은 일의 첫 단계를 지금 가능한 크기로 줄여 적어보세요.'],
 ['해낸 것을 인정하고 다음을 준비하고 싶은 마음이에요. 쉬어갈 자격도 있어요.','마무리한 일을 정리하면 다음에 가져갈 경험이 보일 수 있어요.','오늘 끝낸 일 하나에 표시하고, 배운 점을 한 문장으로 남겨보세요.'],
];

export function kstDay(now = new Date()) {
 return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0,10);
}
export function newDailyReading(date, random = Math.random) {
 const deck = Array.from({length:22},(_,i)=>i);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return {version:DAILY_TAROT_VERSION,date,deck,picks:[],revealed:0};
}
export function restoreDailyReading(raw) {
 try {
  const value=JSON.parse(raw);
  if(value?.version!==DAILY_TAROT_VERSION||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Array.isArray(value.deck)||
   value.deck.length!==22||new Set(value.deck).size!==22||!value.deck.every(n=>Number.isInteger(n)&&n>=0&&n<22)||
   !Array.isArray(value.picks)||value.picks.length>3||new Set(value.picks).size!==value.picks.length||
   !value.picks.every(n=>Number.isInteger(n)&&n>=0&&n<22)||!Number.isInteger(value.revealed)||value.revealed<0||value.revealed>value.picks.length||(value.revealed>0&&value.picks.length!==3))return null;
  return {version:DAILY_TAROT_VERSION,date:value.date,deck:value.deck,picks:value.picks,revealed:value.revealed};
 }catch{return null;}
}
export function pickDailyCard(reading, slot) {
 if(reading.picks.length>=3||reading.picks.includes(slot)||!Number.isInteger(slot)||slot<0||slot>=22)return reading;
 return {...reading,picks:[...reading.picks,slot]};
}
export function revealDailyCard(reading) {
 if(reading.picks.length!==3||reading.revealed>=3)return reading;
 return {...reading,revealed:reading.revealed+1};
}
export function dailySharePath(reading) {
 if(reading.revealed!==3)return '/today/';
 const cards=reading.picks.map(slot=>reading.deck[slot]).join('.');
 return '/today/?daily_cards='+cards+'&from=daily_share#daily-tarot';
}
export function sharedDailyCards(value) {
 if(!/^\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(value||''))return null;
 const cards=value.split('.').map(Number);
 return new Set(cards).size===3&&cards.every(n=>n>=0&&n<22)?cards:null;
}
