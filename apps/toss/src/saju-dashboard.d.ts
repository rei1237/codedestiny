declare module 'virtual:saju-dashboard' {
  export const styles:string;
  export function prepareDashboard(pillars:Record<'y'|'m'|'d'|'h',{g:string;j:string}>,document:Document,bridge:{
    save:(element:HTMLElement,name:string)=>Promise<void>;share:(text:string)=>Promise<void>
  }):{prompts:(gender:string)=>{id:string;title:string;prompt:string}[];lotto:(context:{gender:string;termClock:object;civilYear:number;storageKey:string|null})=>void}&Record<'extreme'|'hormone'|'fourCut'|'dopamine',()=>void>;
}
