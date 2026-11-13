declare module 'virtual:self-esteem-tarot' {const document:string;export default document;}
declare module 'virtual:myeongri-one-card' {
  export const categories:[string,string][];
  export function readOne(category:string):{reading:{title:string;card:{nameKo:string;orientation:string};oneLineConclusion:string;opening:string;currentSituation:string;tenGodInterpretation:string;categoryLens:{theme:string};practicalAdvice:string;sealSentence:string};image:string;fallback:string;oracle:string};
}
