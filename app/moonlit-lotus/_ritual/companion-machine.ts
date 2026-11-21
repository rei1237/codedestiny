// 참배 길동무 캐릭터 상태기계(순수). 시간은 호출하는 쪽이 now 로 넘긴다. DOM·타이머 없음.
import type {RitualStep} from './ritual-machine';
import {BOW_TARGET} from './ritual-machine';
export const COMPANION_STATES=['idle','greet','guide','breathe','bow','pray','bless','react','rest'] as const;
export type CompanionState=typeof COMPANION_STATES[number];
/** 입력 없이 이만큼 지나면 꾸벅꾸벅 쉰다. */
export const REST_AFTER_MS=30000;
export const REACT_MS=1400;
/** greeting 클립 한 바퀴(500 + 160×9 + 1200). */
export const GREET_MS=3140;
export type CompanionScene={step:RitualStep;lit:boolean;bowing:boolean;bows:number;wishSent:boolean};
export type Companion={scene:CompanionScene;base:CompanionState;transient:'greet'|'react'|null;since:number;until:number;lastInput:number;lookUp:boolean};
export type CompanionAction=
 |{type:'scene';scene:CompanionScene;now:number}
 |{type:'input';now:number}
 |{type:'tap';now:number};
export function sceneState(scene:CompanionScene):CompanionState{
 switch(scene.step){
  case 'enter':return 'idle';
  case 'breathe':return 'breathe';
  case 'incense':return 'guide';
  case 'bow':return 'bow';
  case 'wish':return 'pray';
  default:return 'bless';
 }
}
export function initialCompanion(scene:CompanionScene,now:number):Companion{
 return {scene,base:sceneState(scene),transient:'greet',since:now,until:now+GREET_MS,lastInput:now,lookUp:false};
}
/** 절하는 도중·호흡 중에는 반응으로 박자를 깨지 않는다. */
function canReact(m:Companion){return !m.scene.bowing&&m.base!=='breathe';}
function react(m:Companion,now:number):Companion{
 return canReact(m)?{...m,transient:'react',since:now,until:now+REACT_MS}:m;
}
export function companionReducer(m:Companion,action:CompanionAction):Companion{
 const {now}=action;
 switch(action.type){
  case 'input':return {...m,lastInput:now};
  case 'tap':return react({...m,lastInput:now},now);
  case 'scene':{
   const prev=m.scene,scene=action.scene,stepChanged=prev.step!==scene.step;
   let next:Companion={...m,scene,base:sceneState(scene),lastInput:stepChanged?now:m.lastInput,lookUp:stepChanged?false:m.lookUp};
   // 단계가 바뀌면 이전 단계의 반응은 끝낸다(인사는 입장 화면에서만).
   if(stepChanged&&next.transient&&!(next.transient==='greet'&&scene.step==='enter'))next={...next,transient:null};
   if(!prev.lit&&scene.lit)next=react(next,now);
   if(prev.bows<BOW_TARGET&&scene.bows>=BOW_TARGET)next=react(next,now);
   if(!prev.wishSent&&scene.wishSent)next=react({...next,lookUp:true},now);
   if(prev.bowing!==scene.bowing)next={...next,lastInput:now};
   return next;
  }
  default:return m;
 }
}
function restable(m:Companion){
 return m.base==='idle'||m.base==='guide'||m.base==='pray'||m.base==='bless'||(m.base==='bow'&&!m.scene.bowing);
}
export function companionState(m:Companion,now:number):CompanionState{
 if(m.transient&&now<m.until)return m.transient;
 if(restable(m)&&now-m.lastInput>=REST_AFTER_MS)return 'rest';
 return m.base;
}
/** 지금 상태의 시작 시각(클립 재생용). */
export function stateSince(m:Companion,now:number):number{
 const state=companionState(m,now);
 if(state===m.transient)return m.since;
 if(state==='rest')return m.lastInput+REST_AFTER_MS;
 return Math.max(m.transient?m.until:0,m.lastInput);
}
/** 다음에 상태가 저절로 바뀌는 시각. 없으면 null. */
export function nextChange(m:Companion,now:number):number|null{
 if(m.transient&&now<m.until)return m.until;
 if(restable(m)){const at=m.lastInput+REST_AFTER_MS;if(at>now)return at;}
 return null;
}
/** 눈 깜빡임 간격 3~6초. random 은 [0,1). */
export function blinkDelay(random:number){return 3000+Math.min(1,Math.max(0,random))*3000;}
