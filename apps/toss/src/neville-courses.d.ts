declare module 'virtual:toss-neville-courses'{
  export type Course={dur:number;phases:{name:string;start:number;end:number;col:string}[];msgs:{t:number;tx:string}[]};
  export const COURSES:Record<number,Course>;
  export const THETA_PRESETS:Record<string,{title:string;tracks:{title:string;label:string}[]}>;
  export const R2_MEDITATION_BASE:string;
}
