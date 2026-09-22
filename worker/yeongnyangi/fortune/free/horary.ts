import {calculateQuestionSky,skyMoment,validateSkyInput,essentialCondition,westernLink,questionScopes} from '../question-sky';
import {withContinuation} from '../../../../lib/fortune/prompt-continuation';
import type {FreeReading} from './categories';
const traditional=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
/** Calculation-only endpoint. No provider, payment, profile, or persistence dependency. */
export async function prepareHoraryPrompt(env:Record<string,unknown>,body:any,now=new Date()):Promise<FreeReading>{
 const input=validateSkyInput({...body,mode:'horary-v1',productId:'saju_mackerel'});
 const moment=skyMoment(input,now),result=await calculateQuestionSky(env,input,moment);
 const planets=Object.fromEntries(traditional.map(name=>[name,{...result.chart.planets[name],essentialCondition:essentialCondition(name,result.chart.planets[name].longitude)}]));
 const aspects=traditional.flatMap((a,i)=>traditional.slice(i+1).map(b=>({a,b,...westernLink(result.chart.planets[a],result.chart.planets[b])})));
 const limitations=[...result.context.limitations,'위계는 본궁·고양·손상·추락, 리셉션은 본궁의 상호 리셉션만 산출. 삼분성·텀·페이스·행성시·빛의 전달과 수집·정확한 성취 시각은 미산출이다.','각은 6도 공통 오브와 순간 속도 기반 접근·분리 판정이다. 달의 접촉은 3시간 간격 탐색이며 정확한 접촉 시각이나 전통 행성별 오브 판정은 아니다.','질문 하우스는 키워드에 따른 후보다. 관계·목적이 모호하면 확인 질문 후 판단한다.'];
 const basis=[{label:'질문 시각',value:`${input.localTime} (${moment.timezone}) / UTC ${moment.date.toISOString()}`},{label:'질문 장소',value:moment.city.name},{label:'계산 방식',value:'Swiss Ephemeris · 열대황도 · Regiomontanus · 전통 7행성'}];
 const data={method:basis[2].value,question:input.question,situation:input.situation,relationship:input.relationship,moment:{localTime:input.localTime,utc:moment.date.toISOString(),timezone:moment.timezone},location:{latitude:moment.city.latitude,longitude:moment.city.longitude,source:input.location?.source||'city-centre',accuracy:input.location?.accuracy??null},ascendant:result.chart.ascendant,cusps:result.chart.cusps,planets,aspects,houseCandidates:questionScopes(input),judgements:result.audit,moonBeforeSignExit:result.moonMotion,considerations:result.context.facts.find(f=>f.label==='해석의 여지')?.value};
 const prompt=withContinuation(['너는 전통 서양 호라리의 해석자다. 베다점·사주 체계를 혼합하지 않는다. 아래는 계산된 질문 차트이며 적중이나 사건의 보장이 아니다.','[확정 계산 데이터]',JSON.stringify(data,null,2),'[한계와 미산출 항목]',...limitations,'[해석 순서]','질문과 시각·장소 확인 → 질문 하우스와 주인성 후보 검토 → 달과 주요 시그니피케이터 → 위계·리셉션과 접근/분리 → 상충과 판단 유보 조건 → 현실적인 선택. 미산출 항목을 계산된 사실처럼 보충하지 않는다.','실제 타인의 위치나 마음을 관측했다고 말하지 않는다. 모호한 질문은 먼저 물어보고, 사건 날짜를 보장하지 않는다.','[답변 형식]','JSON이 아닌 읽기 쉬운 한국어 문단으로 답한다. 전문용어에는 쉬운 뜻을 붙이고 근거·다른 가능성·실행 조언을 나눈다.'].join('\n'));
 return {category:'horary',day:input.localTime.slice(0,10),title:'영냥 호라리',kind:'calculated',summary:'질문 당시의 하늘을 계산했어. 프롬프트를 복사해 원하는 AI에서 해석과 후속 상담을 이어가 줘.',paragraphs:['서비스에서는 천문 계산과 프롬프트만 제공해. 외부 AI에 붙여넣기 전 질문과 장소를 확인해 줘.'],basis,limitations,prompt,version:'horary-free-v1'};
}
