declare module 'virtual:toss-cosmic-sessions' {
  export const ACTION_CODES:Record<string,string>, ACTION_DESCS:Record<string,string>, JOURNAL_PROMPTS:Record<string,string>, R2_TRACK_GROUPS:Record<string,string[]>;
  export function getCourse(minutes:number,intent:string):{phases:{label:string;freq:string;durMin:number}[];messages:{text:string;at:number;phaseIdx:number}[]};
}
