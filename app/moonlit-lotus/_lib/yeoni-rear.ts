import {BOW_CLIP} from '../model-review/sprite-clips';
export const REAR_BASE='/assets/moonlit-lotus/yeoni/rear-v3';
const downMs=BOW_CLIP.filter(p=>p.sheet==='bow-down').slice(0,-1).reduce((sum,p)=>sum+p.ms,0);
const lowerMs=BOW_CLIP.filter(p=>p.sheet==='bow-lower').reduce((sum,p)=>sum+p.ms,0);
const upMs=BOW_CLIP.filter(p=>p.sheet==='bow-up').reduce((sum,p)=>sum+p.ms,0);
/** Read the same session time as the front animation. Never emits completion events. */
export function rearPoseAt(elapsed:number){
 const time=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
 if(time<downMs)return {sheet:'down',frame:Math.min(15,Math.floor(time/downMs*16))};
 if(time<downMs+lowerMs)return {sheet:'lower',frame:Math.min(15,Math.floor((time-downMs)/lowerMs*16))};
 if(time<downMs+lowerMs+upMs)return {sheet:'up',frame:Math.min(15,Math.floor((time-downMs-lowerMs)/upMs*16))};
 return {sheet:'down',frame:0};
}
