import {bowDrawingAt} from './bow-drawing';
export const REAR_BASE='/assets/moonlit-lotus/yeoni/rear-v3';
type Pose={sheet:string;frame:number};
const poses=(sheet:string,frames:number[]):Pose[]=>frames.map(frame=>({sheet,frame}));
// Cross between matching kneeling poses once. Sorting all sheets by height mixed
// different body volumes and hand positions, making the character pulse.
export const REAR_DOWN:Pose[]=[
 ...poses('down',[0,1,2,3,4,5,6]),...poses('lower',[1,2,3,5,6,7,8,9,10,11,12,13,14,15]),
];
export const REAR_UP:Pose[]=[...REAR_DOWN].reverse();
/** Read the same session time as the front animation. Never emits completion events. */
export function rearPoseAt(elapsed:number){
 return bowDrawingAt(REAR_DOWN,elapsed);
}
