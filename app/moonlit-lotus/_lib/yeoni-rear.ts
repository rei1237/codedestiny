import {BOW_CLIP} from '../model-review/sprite-clips';
export const REAR_BASE='/assets/moonlit-lotus/yeoni/rear-v3';
const downMs=BOW_CLIP.filter(p=>p.sheet==='bow-down').slice(0,-1).reduce((sum,p)=>sum+p.ms,0);
const lowerMs=BOW_CLIP.filter(p=>p.sheet==='bow-lower').reduce((sum,p)=>sum+p.ms,0);
const upMs=BOW_CLIP.filter(p=>p.sheet==='bow-up').reduce((sum,p)=>sum+p.ms,0);
type Pose={sheet:string;frame:number};
const poses=(sheet:string,frames:number[]):Pose[]=>frames.map(frame=>({sheet,frame}));
// Authored sheets overlap in pose coverage. Assemble by posture, not atlas order:
// returning to lower:0 after down:15 would visibly lift the head mid-descent.
export const REAR_DOWN:Pose[]=[
 ...poses('down',[0,1,2,3,4,5]),...poses('lower',[0]),...poses('down',[6,8,9]),
 ...poses('lower',[1]),...poses('down',[10,7]),...poses('lower',[2]),...poses('down',[12,11,13]),
 ...poses('lower',[4,3]),...poses('down',[14]),...poses('lower',[5]),...poses('down',[15]),
 ...poses('lower',[6,7,8,9,10,11,12,13,14,15]),
];
export const REAR_UP:Pose[]=[
 ...poses('lower',[15,14,13,12,11,10,9]),
 ...poses('up',[0,1,2,3,4,5,6,8,9,7,10,12,13,11,14,15]),
 ...poses('down',[2,1,0]),
];
/** Read the same session time as the front animation. Never emits completion events. */
export function rearPoseAt(elapsed:number){
 const time=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
 if(time<downMs+lowerMs)return REAR_DOWN[Math.min(REAR_DOWN.length-1,Math.floor(time/(downMs+lowerMs)*REAR_DOWN.length))];
 if(time<downMs+lowerMs+upMs)return REAR_UP[Math.min(REAR_UP.length-1,Math.floor((time-downMs-lowerMs)/upMs*REAR_UP.length))];
 return {sheet:'down',frame:0};
}
