// 길동무 상태 → 그림. 연이는 기존 시트의 포즈를 바꿔 끼우고(2단계), 다른 캐릭터는 기존 Character 의 activity 로 보낸다(1단계).
import {POSES,PREVIEW_CLIPS,type Sheet,type SpriteFrame} from '../model-review/sprite-clips';
import {frontBowPoseAt} from '../_lib/bow-drawing';
import type {CompanionState} from './companion-machine';
export type BreathPhase='ready'|'inhale'|'hold'|'exhale';
export type YeoniPose={sheet:Sheet;frame:number};
const pose=(id:string):YeoniPose=>{const found=POSES.find(p=>p.id===id)!;return {sheet:found.sheet,frame:found.frame};};
/** 클립을 시작한 지 t ms 지난 그림. 끝나면 마지막 그림에 머문다. */
export function clipAt(clip:readonly SpriteFrame[],t:number):YeoniPose{
 let left=Math.max(0,Number.isFinite(t)?t:0);
 for(const frame of clip){if(left<frame.ms)return {sheet:frame.sheet,frame:frame.frame};left-=frame.ms;}
 const last=clip[clip.length-1];return {sheet:last.sheet,frame:last.frame};
}
/** idle 클립의 1·2 프레임(눈 감김)만 빌린 깜빡임. 85ms × 3. */
export const BLINK=PREVIEW_CLIPS.idle.filter(f=>f.frame!==0);
export const BLINK_MS=BLINK.reduce((sum,f)=>sum+f.ms,0);
export const BLESS_SWAP_MS=1800;
/** 쉼 시트 0–7 이 들숨으로 올라가고 날숨으로 내려온다(4-4-6). */
export function breathFrame(phase:BreathPhase,progress:number){
 const p=Math.min(1,Math.max(0,Number.isFinite(progress)?progress:0));
 if(phase==='inhale')return Math.round(p*7);
 if(phase==='hold')return 7;
 if(phase==='exhale')return Math.round((1-p)*7);
 return 0;
}
export type PoseContext={since:number;elapsed:number;breath:BreathPhase;breathProgress:number;blink:number|null};
/** since: 지금 상태에 들어온 뒤 지난 ms. blink: 깜빡임 시작 뒤 ms(없으면 null). */
export function yeoniPose(state:CompanionState,c:PoseContext):YeoniPose{
 switch(state){
  case 'greet':return clipAt(PREVIEW_CLIPS.greeting,c.since);
  case 'guide':return pose('tilt');
  case 'breathe':return {sheet:'rest',frame:breathFrame(c.breath,c.breathProgress)};
  case 'bow':return frontBowPoseAt(c.elapsed) as YeoniPose;
  // bow-down 시트는 옅은 사각 매트(알파≤60)가 있어 밝은 배경 위에서 상자가 비친다. 정지 합장은 명상 프레임으로.
  case 'pray':return {sheet:'rest',frame:3};
  case 'bless':return pose(Math.floor(c.since/BLESS_SWAP_MS)%2?'cheer':'hug');
  case 'react':return pose(c.since<500?'surprise':'shy');
  case 'rest':return pose('sleep');
  default:return c.blink!==null&&c.blink<BLINK_MS?clipAt(BLINK,c.blink):pose('smile');
 }
}
/** 다른 캐릭터는 기존 Character 의 동작으로 근사한다. */
export function tierOneActivity(state:CompanionState):'idle'|'greeting'|'meditation'|'bow'|'prayer'|'affirmation'{
 switch(state){
  case 'greet':return 'greeting';
  case 'breathe':return 'meditation';
  case 'bow':return 'bow';
  case 'pray':return 'prayer';
  case 'bless':return 'affirmation';
  default:return 'idle';
 }
}
/** 클립·호흡처럼 그림이 계속 바뀌는 상태만 시계를 돌린다. */
export function tickMs(state:CompanionState):number|null{
 if(state==='greet'||state==='react')return 80;
 if(state==='breathe')return 150;
 if(state==='bless')return BLESS_SWAP_MS;
 return null;
}
