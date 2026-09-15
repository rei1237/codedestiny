import type {Theme} from './book-contracts';
// Consultation topics. `general` means no topic; everything else steers the manifest order, titles and prompt focus.
export const topicCatalog={
 love:{label:'연애운',theme:'love'},
 money:{label:'재물운',theme:'wealth'},
 year:{label:'올해 운세',theme:'timing'},
 relationship:{label:'인연 이야기',theme:'relations'},
 luck:{label:'운의 흐름',theme:'timing'},
 work:{label:'일과 적성',theme:'career'},
 self:{label:'나의 이해',theme:'self'},
 healing:{label:'회복',theme:'self'},
} as const satisfies Record<string,{label:string;theme:Theme}>;
export type TopicId=keyof typeof topicCatalog;
export const topicIds:readonly string[]=['general',...Object.keys(topicCatalog)];
export function topicLabel(topicId?:string){return topicId&&topicId in topicCatalog?topicCatalog[topicId as TopicId].label:'';}
