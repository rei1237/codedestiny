'use client';
import {savedReportPassages} from '@/lib/fortune/report-passages';
import ExternalImageGuide from './ExternalImageGuide';
import ReviewRewardBanner from '@/app/components/ReviewRewardBanner';
import type {AnalysisBasis} from '@/lib/fortune/analysis-basis';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import ResultReference from './ResultReference';
import {getResultReferenceCopy} from '@/lib/i18n/result-reference-copy';

// Mount only inside existing authenticated paid-result views. This component grants no access.
export default function PaidResultImageGuide({domain,status,content,basis,toolsLabel,reviewProductId}:{domain:string;status?:string;content:string|string[];basis?:AnalysisBasis|null;toolsLabel?:string;reviewProductId?:string}){
 const passages=savedReportPassages(content);
 if(status!=='completed'||!passages.length)return null;
 const groups=(basis?.groups||[]).map(group=>({label:group.title,items:group.items.map(item=>({label:item.label,value:item.value}))}));
 const guide=<ExternalImageGuide brand="ggulggul" domain={domain} locale={getCurrentLoadingLocale()} groups={groups} passages={passages}/>;
 return <><ResultReference label={toolsLabel || getResultReferenceCopy(getCurrentLoadingLocale()).imageTools}>{guide}</ResultReference><ReviewRewardBanner afterResult locale={getCurrentLoadingLocale()} reviewProductId={reviewProductId}/></>;
}
