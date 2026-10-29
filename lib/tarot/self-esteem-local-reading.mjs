// DOM-free core for the free self-esteem reading. The legacy overlay and the
// Toss client can both feed their selected cards into this normalizer without
// turning a local reading into a paid API request.
const text=value=>String(value||'').replace(/\s+/g,' ').trim();

export const SELF_ESTEEM_POSITION_ORDER=Object.freeze([
  'past_debuff','inner_monster','current_damage','mind_shield','levelup_mastery',
]);

const defaultFields={
  past_debuff:['흔들림의 시작','예전의 반응은 결함이 아니라 당시 나를 지키던 방식이었을 수 있습니다.','그 방식을 존중하되 지금의 나에게 맞는 기준을 다시 정해 보세요.'],
  inner_monster:['거절 앞의 마음','거절 불안은 관계가 끊길까 봐 두려운 마음과 연결되곤 합니다.','감정을 이름 붙이면 감당할 수 있는 정보가 됩니다.'],
  current_damage:['지금의 소모','타인의 반응을 먼저 읽느라 내 감정과 에너지가 뒤로 밀릴 수 있습니다.','회복할 권리를 먼저 인정해야 경계도 오래 지킬 수 있습니다.'],
  mind_shield:['나를 지키는 힘','상대의 감정과 내 책임을 나눠 보는 연습이 필요합니다.','설명은 하되 과잉 설득으로 나를 소모하지 마세요.'],
  levelup_mastery:['오늘 다시 세울 기준','자존감은 거창한 선언보다 반복 가능한 작은 선택에서 회복됩니다.','오늘 지킬 기준 하나를 정하고, 지킨 순간을 기록해 보세요.'],
};

export function completeSelfEsteemReadingPayload(reading={},cards=[]){
  const supplied=Array.isArray(reading.positionReadings)?reading.positionReadings:[];
  const byPosition=new Map(supplied.map(item=>[text(item?.positionKey||item?.position),item]));
  const positionReadings=SELF_ESTEEM_POSITION_ORDER.map((positionKey,index)=>{
    const [positionTitle,fallbackAnswer,fallbackAction]=defaultFields[positionKey];
    const source=byPosition.get(positionKey)||{};
    const card=cards.find(item=>item?.position===positionKey)||cards[index]||{};
    const cardName=text(source.cardName||card.nameKr||card.name||`카드 ${index+1}`);
    const orientation=card.orientation==='reversed'||source.orientation==='reversed'?'reversed':'upright';
    const easyAnswer=text(source.easyAnswer)||fallbackAnswer;
    const actionPractice=text(source.actionPractice||source.todayAction)||fallbackAction;
    return {positionIndex:index+1,positionKey,positionTitle:text(source.positionTitle)||positionTitle,cardName,
      orientation,orientationLabel:orientation==='reversed'?'역방향':'정방향',easyAnswer,
      whyThisHappens:text(source.whyThisHappens)||fallbackAnswer,selfEsteemImpact:text(source.selfEsteemImpact)||fallbackAnswer,
      recoveryReframe:text(source.recoveryReframe)||fallbackAction,actionPractice,healingSentence:text(source.healingSentence)||fallbackAction,
      caution:text(source.caution)||'지금의 마음을 잘못으로 단정하지 말고, 내 선택의 범위를 먼저 확인해 보세요.'};
  });
  const byKey=Object.fromEntries(positionReadings.map(item=>[item.positionKey,item]));
  const summary=reading.topSummary&&typeof reading.topSummary==='object'?reading.topSummary:{};
  return {...reading,positionReadings,
    opening:text(reading.opening||reading.story)||'타인의 시선에 오래 맞추느라 흐려진 마음의 선을, 다섯 장의 카드가 차례로 비춥니다.',
    topSummary:{flowLine:text(summary.flowLine||summary.flow)||'흔들린 마음에서 나의 기준으로 돌아오는 흐름입니다.',corePattern:text(summary.corePattern)||byKey.past_debuff.easyAnswer,
      rootCause:text(summary.rootCause)||byKey.inner_monster.whyThisHappens,mainDamage:text(summary.mainDamage)||byKey.current_damage.selfEsteemImpact,
      recoveryKey:text(summary.recoveryKey)||byKey.mind_shield.recoveryReframe,todayAction:text(summary.todayAction)||byKey.levelup_mastery.actionPractice},
    actionPlan:Array.isArray(reading.actionPlan)&&reading.actionPlan.length?reading.actionPlan:[byKey.levelup_mastery.actionPractice,byKey.mind_shield.actionPractice],
  };
}
