declare module 'virtual:ifa-engine' {
  export type IfaReadingResult={name:string;num:number;category:string;bits:number[];text:string};
  export const CATEGORY_META:Record<string,{label:string;emoji:string}>;
  export function readIfaPattern(bits:number[],category:string):IfaReadingResult;
}
