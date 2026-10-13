import type {DailyTarotReading} from './yeongnyangi-daily-card';

type Tone='move'|'listen'|'connect'|'order'|'renew';
type Profile={tone:Tone;upright:string;reversed:string;action:string};
// Major arcana in the canonical M00–M21 order. These are tarot symbols,
// deliberately independent of the daily card's legacy ganji projection.
const profiles:Profile[]=[
 {tone:'move',upright:'익숙하지 않은 제안에서 작은 설렘을 발견하는 흐름',reversed:'설렘 때문에 준비할 것을 건너뛰기 쉬운 흐름',action:'새로 해보고 싶은 일을 비용과 부담이 적은 첫 단계로 줄여봐.'},
 {tone:'move',upright:'이미 가진 능력을 꺼내 보여줄 때 길이 열리는 흐름',reversed:'아이디어가 많아도 힘이 흩어져 시작이 늦어지는 흐름',action:'가장 자신 있는 도구 하나로 15분 안에 보여줄 초안을 만들어봐.'},
 {tone:'listen',upright:'말보다 작은 표정과 분위기에서 힌트를 얻는 흐름',reversed:'직감과 걱정이 섞여 상대의 침묵을 크게 해석하기 쉬운 흐름',action:'느낌으로 짐작한 것과 직접 확인한 것을 나눠 적어봐.'},
 {tone:'connect',upright:'편안한 돌봄과 여유가 관계와 일을 자라게 하는 흐름',reversed:'남을 챙기느라 내 여유를 먼저 써버리기 쉬운 흐름',action:'누군가를 챙기기 전에 네 식사와 쉬는 시간부터 확보해봐.'},
 {tone:'order',upright:'기준과 역할을 분명히 할수록 마음이 든든해지는 흐름',reversed:'내 방식대로 맞추려다 사소한 일에도 힘이 들어가는 흐름',action:'꼭 지킬 기준 하나와 상대에게 맡길 부분 하나를 정해봐.'},
 {tone:'order',upright:'경험 있는 사람의 조언과 익숙한 절차가 도움이 되는 흐름',reversed:'늘 해오던 방식이 지금의 너와 맞지 않을 수 있는 흐름',action:'조언을 그대로 따르기 전에 네 상황에 맞는 이유 하나를 찾아봐.'},
 {tone:'connect',upright:'마음이 끌리는 것과 소중한 기준을 맞춰보는 흐름',reversed:'좋아하는 마음과 실제로 원하는 방향이 엇갈리는 흐름',action:'상대의 답을 예상하기보다 네가 원하는 것을 짧게 말해봐.'},
 {tone:'move',upright:'목표 하나에 힘을 모으면 진도가 붙는 흐름',reversed:'속도가 앞서가며 우선순위나 주변의 호흡을 놓치기 쉬운 흐름',action:'할 일 세 개 중 하나만 먼저 끝내고 다음으로 넘어가봐.'},
 {tone:'connect',upright:'부드럽게 반응하는 태도가 오히려 힘을 발휘하는 흐름',reversed:'괜찮은 척 참다가 작은 자극에도 지치기 쉬운 흐름',action:'바로 답하지 말고 한 번 숨을 고른 뒤 감당할 수 있는 선을 말해봐.'},
 {tone:'listen',upright:'잠시 혼자 생각하면 내 기준이 또렷해지는 흐름',reversed:'혼자 오래 생각할수록 같은 걱정 안에 머물기 쉬운 흐름',action:'생각을 한 문장으로 정리하고 믿을 만한 사람에게 의견을 물어봐.'},
 {tone:'renew',upright:'예상과 다른 일정 속에서 새로운 선택지가 보이는 흐름',reversed:'바뀐 상황을 예전 계획에 맞추느라 힘이 드는 흐름',action:'일정에 여유를 남기고 바뀌어도 괜찮은 순서 하나를 정해봐.'},
 {tone:'order',upright:'감정과 사실을 나눠 살피면 판단이 선명해지는 흐름',reversed:'내가 더 손해 봤다는 마음이 판단에 끼어들기 쉬운 흐름',action:'약속의 시간·역할·조건 중 애매한 한 가지를 확인해봐.'},
 {tone:'listen',upright:'잠깐 멈춰 보는 시선을 바꾸면 막힌 부분이 보이는 흐름',reversed:'기다려야 한다는 생각 때문에 가능한 행동도 미루는 흐름',action:'막힌 일에 다른 방법을 하나 적고 지금 할 수 있는 부분만 해봐.'},
 {tone:'renew',upright:'역할을 다한 습관을 놓아 새 자리를 만드는 흐름',reversed:'끝내야 할 것을 알면서도 익숙함 때문에 붙잡는 흐름',action:'할 일 목록에서 더는 필요하지 않은 한 가지를 지워봐.'},
 {tone:'connect',upright:'서로 다른 속도를 조금씩 맞추면 편안해지는 흐름',reversed:'한쪽에 너무 쏟아 일과 쉼의 균형이 흔들리는 흐름',action:'대화나 일정에 네가 지킬 수 있는 간격을 제안해봐.'},
 {tone:'order',upright:'자꾸 끌리는 대상과 반복 습관을 알아차릴 때인 흐름',reversed:'나를 묶던 습관에서 조금씩 거리를 둘 수 있는 흐름',action:'습관처럼 확인하는 앱이나 충동 구매를 잠시 멈추고 이유를 적어봐.'},
 {tone:'renew',upright:'당연하게 믿던 전제를 다시 살펴야 하는 흐름',reversed:'변화를 미루는 동안 작은 불편이 쌓이기 쉬운 흐름',action:'계획에서 확인하지 않은 조건 하나를 점검하고 대안을 준비해봐.'},
 {tone:'renew',upright:'작은 가능성을 다시 믿고 회복해가는 흐름',reversed:'남과 비교하느라 내 작은 진전을 놓치기 쉬운 흐름',action:'최근 조금 나아진 점 하나를 적고 그 행동을 한 번 더 해봐.'},
 {tone:'listen',upright:'정보가 부족한 자리를 상상으로 채우기 쉬운 흐름',reversed:'막연했던 걱정의 이유를 차분히 구분해가는 흐름',action:'확인하지 못한 소식은 결론을 미루고 출처부터 확인해봐.'},
 {tone:'move',upright:'꾸미지 않은 표현과 작은 즐거움이 분위기를 밝히는 흐름',reversed:'잘해야 한다는 기대 때문에 소소한 기쁨을 놓치는 흐름',action:'잘된 일 하나를 구체적으로 나누되 상대의 반응은 재촉하지 마.'},
 {tone:'renew',upright:'미뤄둔 선택을 지금의 기준으로 다시 볼 수 있는 흐름',reversed:'예전의 실수로 지금의 가능성까지 평가하기 쉬운 흐름',action:'다시 해보고 싶은 일에서 예전과 달라진 조건 하나를 찾아봐.'},
 {tone:'order',upright:'마무리한 경험이 다음 단계의 바탕이 되는 흐름',reversed:'거의 끝낸 일을 완벽하게 만들려다 놓지 못하는 흐름',action:'완료 기준을 하나 정하고 끝낸 일에는 분명히 표시해줘.'},
];

export function offsetTarotDate(dateKey:string,days:number){
 return new Date(Date.parse(`${dateKey}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
}

function connection(left:Tone,right:Tone){
 if(left===right)return '두 카드가 비슷한 방향을 가리켜. 여러 일을 벌이기보다 이 주제 하나에 집중할수록 선택이 또렷해질 수 있어.';
 if(left==='move'&&right==='listen')return '앞으로 가고 싶은 힘에 잠시 관찰하라는 신호가 겹쳤어. 기회를 포기하라는 뜻보다는, 한 번 확인한 뒤 움직이라는 조합이야.';
 if(left==='listen'&&right==='move')return '생각을 충분히 한 뒤 작은 행동으로 옮기는 조합이야. 확신이 완벽해질 때까지 기다리기보다 되돌릴 수 있는 시도부터 해봐.';
 if(right==='order')return '첫 카드의 흐름에 기준을 세우라는 카드가 이어졌어. 마음이 움직여도 시간과 약속을 구체적으로 정하면 불필요한 소모를 줄일 수 있어.';
 if(right==='connect')return '혼자 결론 내리기보다 서로의 속도를 맞출 때 흐름이 부드러워지는 조합이야. 네 뜻을 전하되 상대가 답할 여백도 남겨줘.';
 if(left==='renew'||right==='renew')return '익숙한 흐름을 그대로 밀기보다 한 부분을 바꿔보라는 조합이야. 전부 새로 시작할 필요는 없어. 지금 맞지 않는 방식 하나부터 조정해봐.';
 if(right==='listen')return '겉으로 보이는 상황과 네 마음의 속도가 다를 수 있어. 먼저 관찰하고, 확인한 것만으로 다음 선택을 정하는 편이 좋아.';
 return '기준을 살핀 뒤 직접 움직일 차례라는 조합이야. 준비만 길게 하기보다 감당할 수 있는 작은 시도로 반응을 확인해봐.';
}

const relationship:Record<Tone,string>={
 move:'먼저 건네는 짧은 인사가 대화의 출발점이 될 수 있어. 다만 답장이 오는 속도로 상대의 마음까지 판단하지는 마.',
 listen:'말이 적은 순간에 의미를 너무 많이 채우지 마. 궁금한 것은 짧게 물어보고, 답을 들을 때까지 판단을 남겨두는 게 좋아.',
 connect:'큰 감정 표현보다 구체적인 관심 하나가 편안하게 닿을 수 있어. 다정함을 주면서 네가 원하는 배려도 말해줘.',
 order:'애매한 약속을 구체적으로 맞추면 서운함을 덜 수 있어. 누가 맞는지 따지기 전에 서로 기대한 것을 확인해봐.',
 renew:'예전 대화를 같은 방식으로 반복하기보다 질문을 바꿔봐. 지난 반응이 다음 반응까지 결정하는 것은 아니야.',
};
const work:Record<Tone,string>={
 move:'일이나 공부는 작은 초안을 실제로 만드는 쪽이 좋아. 새로운 지출은 의욕과 분리해서 필요한 것인지 한 번 더 살펴봐.',
 listen:'바로 답을 내기보다 빠진 정보 한 가지를 찾는 데 힘을 써봐. 돈이 걸린 선택은 확인되지 않은 기대만으로 서두르지 마.',
 connect:'협업은 상대가 감당할 수 있는 범위를 물어보는 데서 풀릴 수 있어. 호의로 시간이나 돈을 쓰기 전에 네 여유도 챙겨줘.',
 order:'마감과 예산처럼 눈에 보이는 기준을 적어두면 집중하기 좋아. 큰 확장보다 이미 맡은 일의 빈틈을 정리해봐.',
 renew:'잘 안 되던 방법을 작게 바꿔볼 만해. 이미 쓴 시간이나 돈이 아깝다는 이유만으로 같은 선택을 이어갈 필요는 없어.',
};

export function synthesizeDailyTarot(cards:DailyTarotReading[]){
 if(cards.length!==3||new Set(cards.map(card=>card.cardCode)).size!==3)throw new Error('THREE_DISTINCT_CARDS_REQUIRED');
 const meanings=cards.map(card=>{
  const profile=profiles[Number(card.cardCode.slice(1))];
  if(!/^M\d{2}$/.test(card.cardCode)||!profile)throw new Error('UNKNOWN_DAILY_CARD');
  return {...profile,scene:profile[card.orientation],label:`${card.cardName} ${card.orientationLabel}`};
 });
 const [flow,heart,step]=meanings;
 const reversed=cards.filter(card=>card.orientation==='reversed').length;
 const pace=reversed>=2?'속도를 낮추고 조정할 부분을 먼저 살피는 날':'작은 선택을 실제 행동으로 이어가 볼 날';
 return {
  headline:`${cards[0].cardName}에서 ${cards[2].cardName}까지, ${pace}`,
  cards:meanings.map((meaning,index)=>({
   reading:`${meaning.label}는 ${meaning.scene}을 보여줘. ${index===0?'하루를 여는 배경으로 읽어볼게.':index===1?'이 자리는 사건의 예고보다 네가 살필 마음과 반응을 뜻해.':'이 자리는 정해진 결말이 아니라 네가 선택할 수 있는 방향이야.'}`,
   advice:meaning.action,
  })),
  story:[
   `첫 장 ${flow.label}에서 시작해 가운데 ${heart.label}를 지나 마지막 ${step.label}로 이어지는 이야기야. ${flow.scene} 속에서, ${heart.scene}이 선택에 영향을 줄 수 있어.`,
   connection(flow.tone,heart.tone),
   `마지막 ${step.label}는 ${step.scene}을 짚어줘. ${step.tone===heart.tone&&heart.tone===flow.tone?'세 장 모두 같은 주제에 무게를 두고 있으니, 아래의 작은 실천 하나를 하루의 기준으로 삼아봐.':connection(heart.tone,step.tone)} ${cards[2].orientation==='reversed'?'특히 마지막 장이 역방향일 때는 더 애쓰기보다 행동의 크기를 줄여보라는 조언으로 읽어줘.':'앞의 두 장에서 살핀 마음을, 부담 없이 시도할 수 있는 행동으로 옮겨보자.'}`,
   reversed>=2?'역방향이 여러 장이라고 나쁜 하루라는 뜻은 아니야. 밖으로 밀어붙이기보다 마음이나 계획에서 엉킨 부분을 풀라는 비중이 큰 거야.':reversed===1?`${meanings[cards.findIndex(card=>card.orientation==='reversed')].label}가 있는 자리는 한 번 더 살펴봐. 역방향은 불운의 표시보다 속도나 표현 방식을 조정하라는 힌트로 읽을게.`:'세 장이 모두 정방향이라 카드가 말하는 주제를 바깥의 행동으로 옮기는 쪽에 무게를 둘게. 그렇다고 결과가 보장된다는 뜻은 아니야.',
  ],
  relationship:relationship[heart.tone],
  work:work[step.tone],
  mission:step.action,
  preparation:heart.action,
  closing:'카드가 네 하루를 대신 결정하지는 않아. 세 장의 이야기에서 지금 네 상황과 닿는 한 가지를 골라봐. 그 작은 선택까지 함께 살펴주는 게 내 역할이니까.',
 };
}
