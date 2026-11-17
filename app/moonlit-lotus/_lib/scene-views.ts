export const SCENES = {courtyard:'달빛 마당',hall:'연화당 법당',pond:'연꽃 연못'} as const;
export type Scene = keyof typeof SCENES;
export const VIEWS = ['left-wide','left','front','right','right-wide'] as const;
export type SceneView = typeof VIEWS[number];
export const VIEW_LABELS:Record<SceneView,string> = {'left-wide':'왼편 넓게',left:'왼편 사선',front:'정면',right:'오른편 사선','right-wide':'오른편 넓게'};
const BASE='/assets/moonlit-lotus/views-v1';
export function parseSceneView(value:string|null):SceneView{return VIEWS.includes(value as SceneView)?value as SceneView:'front';}
export function nextSceneView(view:SceneView,direction:number):SceneView{return VIEWS[Math.max(0,Math.min(VIEWS.length-1,VIEWS.indexOf(view)+direction))];}
export function viewImage(scene:Scene,view:SceneView,portrait:boolean){
 return !portrait&&view==='front'?`/assets/moonlit-lotus/space-v1/${scene}-1536.webp`:`${BASE}/${scene}-${view}-${portrait?'768':'1536'}.webp`;
}
/** Positions are percentages of the artwork, never of the surrounding UI. */
export function viewPlacement(scene:Scene,view:SceneView,portrait:boolean){
 const offset=({'left-wide':-5,left:-2,front:0,right:2,'right-wide':5})[view];
 return {x:50+offset,y:portrait?82:scene==='hall'?86:82,width:portrait?41:27};
}
export function sceneUrl(scene:Scene,panel:string|null,view:SceneView,search:string){
 const params=new URLSearchParams(search);params.set('scene',scene);
 if(panel)params.set('activity',panel);else params.delete('activity');
 if(view==='front')params.delete('view');else params.set('view',view);
 return '?'+params.toString();
}
/** Vertical scroll, pinch zoom and the system's edge-back gesture stay available. */
export function swipeDirection(dx:number,dy:number,startX:number,width:number){
 if(startX<24||startX>width-24||Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.5)return 0;
 return dx<0?1:-1;
}
