import {BOW_CLIP} from '../model-review/sprite-clips';
type Pose={sheet:string;frame:number};
const downMs=BOW_CLIP.filter(p=>p.sheet==='bow-down').slice(0,-1).reduce((sum,p)=>sum+p.ms,0)+BOW_CLIP.filter(p=>p.sheet==='bow-lower').reduce((sum,p)=>sum+p.ms,0);
const upMs=BOW_CLIP.filter(p=>p.sheet==='bow-up').reduce((sum,p)=>sum+p.ms,0);
/** Read session time only. Keep its initial, lowest and final authored holds. */
export function bowDrawingAt(descent:readonly Pose[],elapsed:number):Pose{
 const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,last=descent.length-1;
 if(t<600||t>=downMs+upMs-350)return descent[0];
 if(t<=downMs){const progress=Math.min(1,(t-600)/(downMs-600-800));return descent[Math.min(last,Math.floor(progress*last))];}
 const progress=Math.max(0,(t-downMs-400)/(upMs-400-350));
 return descent[Math.max(0,last-Math.floor(progress*last))];
}
// One atlas seam: the early kneeling drawings in lower repeat a larger posture.
// Retracing the same art restores the exact silhouette without up-sheet scale jumps.
export const YEONI_FRONT_DOWN:Pose[]=[
 ...Array.from({length:11},(_,frame)=>({sheet:'bow-down',frame})),
 ...Array.from({length:14},(_,index)=>({sheet:'bow-lower',frame:index+2})),
];
export const frontBowPoseAt=(elapsed:number)=>bowDrawingAt(YEONI_FRONT_DOWN,elapsed);
