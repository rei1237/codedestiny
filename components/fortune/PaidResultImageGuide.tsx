'use client';
import {savedReportPassages} from '@/lib/fortune/report-passages';
import ExternalImageGuide from './ExternalImageGuide';
import type {AnalysisBasis} from '@/lib/fortune/analysis-basis';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';

// Mount only inside existing authenticated paid-result views. This component grants no access.
export default function PaidResultImageGuide({domain,status,content,basis}:{domain:string;status?:string;content:string|string[];basis?:AnalysisBasis|null}){
 const passages=savedReportPassages(content);
 if(status!=='completed'||!passages.length)return null;
 const groups=(basis?.groups||[]).map(group=>({label:group.title,items:group.items.map(item=>({label:item.label,value:item.value}))}));
 return <ExternalImageGuide brand="ggulggul" domain={domain} locale={getCurrentLoadingLocale()} groups={groups} passages={passages}/>;
}
