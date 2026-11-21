// 참배 흐름(입장→호흡→향→삼배→소원 연등→회향)의 순수 reducer. 저장·타이머·DOM 은 화면 쪽이 맡는다.
export const RITUAL_STEPS=['enter','breathe','incense','bow','wish','dedication'] as const;
export type RitualStep=typeof RITUAL_STEPS[number];
export const BREATH_CYCLES=3;
export const BOW_TARGET=3;
/** 4-4-6 호흡(ms). "빠르게 진행"이면 연출 시간만 줄인다. */
export const BREATH_PATTERN={inhale:4000,hold:4000,exhale:6000} as const;
export const HOLD_MS=1500;
export type RitualState={step:RitualStep;fast:boolean;breaths:number;lit:boolean;bows:number;wish:string;wishSent:boolean};
export type RitualAction=
 |{type:'enter'}
 |{type:'breathDone'}
 |{type:'light'}
 |{type:'bowDone';completed:number}
 |{type:'sendWish';text:string}
 |{type:'next'}
 |{type:'skip'}
 |{type:'toggleFast'}
 |{type:'restart'};
export function initialRitual(fast=false):RitualState{
 return {step:'enter',fast,breaths:0,lit:false,bows:0,wish:'',wishSent:false};
}
export function timeScale(fast:boolean){return fast?0.5:1;}
function following(step:RitualStep):RitualStep{
 const index=RITUAL_STEPS.indexOf(step);
 return RITUAL_STEPS[Math.min(RITUAL_STEPS.length-1,index+1)];
}
/** 지금 단계의 행동을 마쳤는가. 'next' 는 이 조건을 만족할 때만 다음으로 간다. */
export function stepDone(state:RitualState){
 switch(state.step){
  case 'breathe':return state.breaths>=BREATH_CYCLES;
  case 'incense':return state.lit;
  case 'bow':return state.bows>=BOW_TARGET;
  case 'wish':return state.wishSent;
  default:return false;
 }
}
export function ritualReducer(state:RitualState,action:RitualAction):RitualState{
 switch(action.type){
  case 'enter':return state.step==='enter'?{...state,step:'breathe'}:state;
  case 'breathDone':{
   if(state.step!=='breathe')return state;
   const breaths=Math.min(BREATH_CYCLES,state.breaths+1);
   return breaths>=BREATH_CYCLES?{...state,breaths,step:'incense'}:{...state,breaths};
  }
  case 'light':return state.step==='incense'&&!state.lit?{...state,lit:true}:state;
  case 'bowDone':{
   if(state.step!=='bow'||!Number.isInteger(action.completed))return state;
   // 절 수는 절 세션이 센 값만 따른다(기립·합장까지 마친 주기). 줄어들지 않는다.
   const bows=Math.max(state.bows,Math.min(BOW_TARGET,action.completed));
   return bows===state.bows?state:{...state,bows};
  }
  case 'sendWish':{
   if(state.step!=='wish'||state.wishSent)return state;
   const wish=action.text.trim().slice(0,2000);
   return wish?{...state,wish,wishSent:true}:state;
  }
  case 'next':return stepDone(state)?{...state,step:following(state.step)}:state;
  case 'skip':return state.step==='dedication'?state:{...state,step:following(state.step)};
  case 'toggleFast':return {...state,fast:!state.fast};
  case 'restart':return initialRitual(state.fast);
  default:return state;
 }
}
/** 연꽃 꽃잎 6장 중 밝힌 수. 회향에 닿으면 6장 모두. */
export function petalsLit(state:RitualState){
 return state.step==='dedication'?RITUAL_STEPS.length:RITUAL_STEPS.indexOf(state.step);
}
