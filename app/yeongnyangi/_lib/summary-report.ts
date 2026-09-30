import type {FortuneRecord} from './api';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';

export const SUMMARY_REPORT_VERSION='yeongnyangi-summary-v1';
type Section={title:string;body:string;chapterId:string};
export type SummaryReport={reportVersion:string;serviceType:string;locale:string;sourceResultVersion:string;calculationVersion:string;sourceChartHash:string;generationState:'ready'|'degraded';headline:string;oneLineSummary:string;keywords:string[];chart:ReadingChart|null;sections:Section[];mascotMessage:string;coverage:{available:string[];missing:string[]};mascot:string};
export type RenderableReport=Pick<SummaryReport,'serviceType'|'locale'|'headline'|'oneLineSummary'|'keywords'|'chart'|'sections'|'mascotMessage'|'coverage'|'mascot'>;
export type PublicSummaryReport=RenderableReport&Pick<SummaryReport,'reportVersion'>;
const names:Record<string,string>={saju:'나의 사주 요약 보고서',vedic:'나의 베다 운명 지도',astrology:'나의 별자리 성향 보고서',ziwei:'나의 자미두수 운명 보고서',tarot:'나의 타로 메시지 & 탄생 상징 카드',sukuyo:'나의 숙요 관계 지도'};
const mascots:Record<string,string>={saju:'/assets/mascot/yeoni-moonstone-reward-v1.png',vedic:'/assets/yeongnyangi/report/v1/vedic-elephant.webp',astrology:'/assets/yeongnyangi/report/v1/astrology-owl.webp',ziwei:'/assets/yeongnyangi/report/v1/ziwei-neo-clean.webp',tarot:'/assets/yeongnyangi/report/v1/tarot-fox.webp',sukuyo:'/assets/yeongnyangi/report/v1/sukuyo-rabbit.webp'};
const themes:Record<string,string>={self:'성향',love:'관계',relations:'관계',career:'일',wealth:'재물',timing:'현재 흐름',action:'다음 행동',cross:'함께 읽기'};
function compact(value:unknown,max=240){return typeof value==='string'?Array.from(value.replace(/\s+/g,' ').trim()).slice(0,max).join(''):'';}
function singleDomain(row:FortuneRecord){return row.product?.systems?.length===1?row.product.systems[0]:row.product?.domain||'fortune';}
function chartFingerprint(value:unknown){let hash=2166136261;for(const char of JSON.stringify(value)){hash=Math.imul(hash^char.charCodeAt(0),16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
// This is an owned-result projection. It never runs a calculator or an LLM, and does not alter the paid body.
export function buildSummaryReport(row:FortuneRecord):SummaryReport|null{
 if(!row.paid||row.state!=='COMPLETED'||!Array.isArray(row.chapters)||!row.chapters.length)return null;
 const domain=singleDomain(row),ownedChart=row.charts?.find(c=>c.domain===domain)||row.charts?.[0]||null;
 const chart=ownedChart?.limitations?.some(limit=>limit.includes('원국과 관련 해석의 정정'))?null:ownedChart;
 const sections=row.chapters.flatMap((chapter,i)=>{
  const spec=row.manifest[i];if(!spec)return [];
  const text=chapter.questionAnswers?.[0]?.answer||chapter.summary;
  const body=compact(text,270);return body?[{title:themes[spec.theme]||compact(spec.title,42),body,chapterId:spec.id}]:[];
 }).slice(0,7);
 const first=row.chapters[0];
 const summary=compact(first.questionAnswers?.[0]?.answer||first.summary,180);
 const focus=chart?.groups.find(group=>domain==='saju'?group.label==='일주':domain==='vedic'?group.label.includes('라그나'):domain==='astrology'?group.label==='태양':domain==='ziwei'?group.label.includes('명궁'):domain==='tarot'?Boolean(group.cardCode):true);
 const focusValue=focus?.items.find(item=>item.value&&!['자료 없음','없음','—'].includes(item.value))?.value;
 const groundedTitle=focus&&focusValue?domain==='tarot'?`${focusValue} 카드가 보여주는 이번 선택`:`${focus.label} ${focusValue}에서 읽는 나의 흐름`:'';
 const headline=compact(groundedTitle||first.summary?.split(/[.!?。]/)[0]||first.title||row.manifest[0]?.title||names[domain]||'나의 운세 요약 보고서',72);
 const keywords=(first.highlights||[]).map(x=>compact(x,18)).filter(Boolean).slice(0,3);
 const available=[...(chart?['구매 당시 저장된 계산 차트']:[]),...(sections.length?['완성된 상담 문장']:[])];
 const missing=chart?[]:[ownedChart?'원국 정정 확인이 필요해 차트 공유를 보류했습니다.':'구매 당시 차트 자료가 없어 본문 문장만 요약했습니다.'];
 return {reportVersion:SUMMARY_REPORT_VERSION,serviceType:domain,locale:row.locale||'ko',sourceResultVersion:`${row.id}:${row.completedAt||row.createdAt}`,calculationVersion:chart?.source||'stored-result-without-chart',sourceChartHash:chartFingerprint(chart),generationState:chart?'ready':'degraded',headline,oneLineSummary:summary,keywords,chart,sections,mascotMessage:compact(first.persona||first.advice,140),coverage:{available,missing},mascot:mascots[domain]||'/assets/yeongnyangi/hero.webp'};
}
export function reportName(domain:string){return names[domain]||'나의 운세 요약 보고서';}
export function visibleChartGroups(report:RenderableReport){
 const groups=report.chart?.groups.filter(group=>group.kind!=='timing'&&!group.label.includes('상대'))||[];
 if(report.serviceType!=='saju')return groups;
 const order=['시주','일주','월주','년주'];
 return [...groups].sort((a,b)=>{
  const left=order.indexOf(a.label),right=order.indexOf(b.label);
  return (left<0?order.length:left)-(right<0?order.length:right);
 });
}
function publicGroups(report:SummaryReport){
 return visibleChartGroups(report)
  .filter(group=>!/(상대|두 사람|partner)/i.test(group.label)&&group.kind!=='timing')
  .map(group=>({...group,chapterIds:[],items:group.items.filter(item=>!/(상대|실명|생년월일|출생|질문)/.test(item.label))}));
}

// Never serialize the owned report, raw chapters, question or profile into a public payload.
export function publicReportDraft(report:PublicSummaryReport){
 const chart=report.chart&&{domain:report.chart.domain,title:report.chart.title,
  groups:report.chart.groups.filter(g=>!/(상대|두 사람|partner)/i.test(g.label)).slice(0,4).map(g=>({label:g.label,items:g.items.filter(item=>!/(상대|실명|생년월일|출생|질문)/.test(item.label)).slice(0,2),...(/^\/assets\/yeongnyangi\/tarot\/v1\/[\w-]+\.(webp|avif|png)$/.test(g.image||'')?{image:g.image}:{})}))};
 return {reportVersion:report.reportVersion,serviceType:report.serviceType,locale:report.locale,
  title:reportName(report.serviceType),chart,mascot:report.mascot};
}
export function publicShareReport(report:SummaryReport):PublicSummaryReport{
 const groups=publicGroups(report).filter(g=>report.serviceType!=='saju'||g.label!=='시주').slice(0,3);
 const chart:ReadingChart|null=report.chart?{domain:report.chart.domain,title:report.chart.title,source:report.chart.source,groups,limitations:[]}:null;
 const first=groups[0];
 const symbol=first?.items.find(item=>item.value&&item.value!=='자료 없음')?.value||'';
 return {reportVersion:report.reportVersion,serviceType:report.serviceType,locale:report.locale,chart,headline:reportName(report.serviceType),oneLineSummary:first?`${first.label}${symbol?` · ${compact(symbol,32)}`:''} — 구매 당시 확정된 차트에서 가져온 나의 상징`:'구매 당시 차트 자료가 없어 공개용 차트는 표시하지 않습니다.',keywords:groups.map(g=>compact(g.label,15)),mascotMessage:'영냥이와 함께 나의 흐름을 천천히 살펴보세요.',sections:[],coverage:{available:[],missing:report.coverage.missing},mascot:report.mascot};
}
