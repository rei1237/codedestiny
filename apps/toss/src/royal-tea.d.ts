declare module 'virtual:toss-royal-tea'{
  export const certificateStyles:string;
  export const INTENTS:{id:string;label:string;glyph:string}[];
  export function readRoyalTea(intent:string,owner:string):{title:string;serial:string;html:string};
}
