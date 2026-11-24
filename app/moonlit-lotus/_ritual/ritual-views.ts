// 참배 단계별 카메라(장면 그림)와 소품. 실제 절을 걸어 들어가듯 단계마다 시점이 바뀐다.
// 세로 = ≤700px(768 그림), 가로 = (min-width:701px)(1536 그림). 새 장면(gate·bell)만 AVIF 가 있다.
import type {RitualStep} from './ritual-machine';
const BASE='/assets/moonlit-lotus/';
export type RitualView={portrait:string;landscape:string;avif?:{portrait:string;landscape:string}};
const ritual=(name:string):RitualView=>({
 portrait:BASE+'ritual-v1/'+name+'-768.webp',landscape:BASE+'ritual-v1/'+name+'-1536.webp',
 avif:{portrait:BASE+'ritual-v1/'+name+'-768.avif',landscape:BASE+'ritual-v1/'+name+'-1536.avif'},
});
const reuse=(portrait:string,landscape:string):RitualView=>({portrait:BASE+portrait,landscape:BASE+landscape});
export const RITUAL_VIEWS:Record<RitualStep,RitualView>={
 enter:ritual('gate'),
 breathe:reuse('views-v1/courtyard-front-768.webp','space-v1/courtyard-1536.webp'),
 incense:reuse('views-v1/courtyard-right-768.webp','views-v1/courtyard-right-1536.webp'),
 bow:reuse('views-v1/hall-front-768.webp','space-v1/hall-1536.webp'),
 wish:reuse('views-v1/pond-left-wide-768.webp','views-v1/pond-left-wide-1536.webp'),
 dedication:ritual('bell'),
};
/** 들어서는 단계 기준 카메라 움직임. enter 는 첫 화면이라 움직임이 없다. */
export type RitualMove='none'|'walkIn'|'right'|'inside'|'left'|'up';
export const RITUAL_MOVES:Record<RitualStep,RitualMove>={enter:'none',breathe:'walkIn',incense:'right',bow:'inside',wish:'left',dedication:'up'};
export const PROPS={
 incenseBurner:BASE+'ritual-v1/prop-incense-burner.webp',
 lanternDim:BASE+'ritual-v1/prop-lantern-dim.webp',
 lanternLit:BASE+'ritual-v1/prop-lantern-lit.webp',
} as const;
/** 단계마다 화면에 쓰는 소품. 프리로드는 직전 단계에서 한다. */
export const STEP_PROPS:Record<RitualStep,readonly string[]>={enter:[],breathe:[],incense:[PROPS.incenseBurner],bow:[],wish:[PROPS.lanternDim,PROPS.lanternLit],dedication:[]};
/** 바람결 풍경 소리를 가끔 내는 마당 단계. */
export const COURTYARD_STEPS:readonly RitualStep[]=['breathe','incense'];
export const MOVE_MS=700,FADE_MS=450,DISSOLVE_MS=300,PRELOAD_DELAY_MS=400;
/** 풍경 간격(ms). random 은 [0,1). */
export function chimeDelay(random:()=>number){return 14000+Math.floor(random()*10000);}
