declare module 'virtual:toss-kemet'{
  export const cards:number;
  export function readKemet(question:string,indices:number[]):{catLabel:string;catSymbol:string;prompt:string;papyrus:string;synthesis:string;gods:{name:string;icon:string;role:string;oracle:string;position:string;topic:string;heka:string}[]};
}
