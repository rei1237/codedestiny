import registry from './categories.json';

export type FreeCategoryId='comprehensive'|'basic'|'saju'|'yukhyo'|'dangsaju'|'kusei'|'psych'|'tarot'|'astrology'|'vedic'|'ziwei'|'sukuyo'|'numerology'|'dream'|'horary'|'meihua';
export type FreeCategory={id:FreeCategoryId;label:string;description:string;fields:{id:string;label:string;type:string;placeholder?:string;options?:string[]}[];role:string;principles:string[];answerSections:string[]};
export const freeCategories=registry as FreeCategory[];
export const birthCategories=new Set<FreeCategoryId>(['comprehensive','basic','saju','dangsaju','kusei','astrology','vedic','ziwei','sukuyo','numerology']);
export interface FreeReading {category:string;day:string;title:string;kind:'calculated'|'symbolic'|'reflection';summary:string;paragraphs:string[];basis:{label:string;value:string}[];limitations:string[];charts?:import('../charts').ChartView[];prompt:string;version:string}
export interface AttendanceState {day:string;balance:number;attended:boolean;unlocked:boolean;newlyUnlocked?:boolean;awarded?:boolean}

