import {prepareHoraryPrompt} from '../../../../worker/yeongnyangi/fortune/free/horary';
import {validateSkyInput} from '../../../../worker/yeongnyangi/fortune/question-sky';
import {questionSkyReading} from '../../../../worker/yeongnyangi/fortune/question-sky-preparation';
import {readingLocale} from '../../../../worker/yeongnyangi/fortune/reading-locale';
import {getProduct} from '../../../../worker/yeongnyangi/payments/catalog';

export async function calculate(path:string,body:any){
 if(path==='horary')return {result:await prepareHoraryPrompt({},body)};
 if(path!=='prashna'||body.mode!=='prashna-v1'||body.productId!=='saju_flounder')throw Object.assign(new Error('INVALID_READING_MODE'),{status:400});
 const locale=readingLocale(body.locale),input=validateSkyInput(body),product=getProduct('saju_flounder');
 const {analysis,manifest}=await questionSkyReading({},input,locale,product);
 return {locale,consultation:analysis.consultation,manifest:manifest.map(({id,title,ordinal})=>({id,title,ordinal})),product};
}
