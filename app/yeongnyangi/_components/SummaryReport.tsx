'use client';
import {useEffect,useMemo,useState} from 'react';
import type {FortuneRecord} from '../_lib/api';
import {fortuneApi} from '../_lib/api';
import {buildSummaryReport,publicShareReport} from '../_lib/summary-report';
import {sajuReportCopy,sajuShareControls} from '../_lib/saju-report-copy';
import {chartTerm} from '../_lib/reading-chart-copy';
import {readingFocusCopy} from '../_lib/reading-focus-copy';
import {prepareKakao,shareThrough} from '@/js/share-service.mjs';
import ExternalImageGuide from '@/components/fortune/ExternalImageGuide';
import styles from './summary-report.module.css';

export default function SummaryReportView({row}:{row:FortuneRecord}){
 const report=useMemo(()=>buildSummaryReport(row),[row]);
 return report?<OwnedReport key={row.id} row={row} report={report}/>:null;
}
function OwnedReport({row,report}:{row:FortuneRecord;report:NonNullable<ReturnType<typeof buildSummaryReport>>}){
 const text=sajuReportCopy(row.locale),shareText=sajuShareControls(row.locale);
 const [shareOpen,setShareOpen]=useState(false),[status,setStatus]=useState('');
 const [shareLink,setShareLink]=useState<{url:string;token:string}|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const publicReport=publicShareReport(report);
 const groups=(report.chart?.groups||[]).map(group=>({label:chartTerm(group.label,row.locale),items:group.items.map(item=>({label:chartTerm(item.label,row.locale),value:item.value}))}));
 const passages=report.sections.map(section=>section.body);
 useEffect(()=>{try{const saved=localStorage.getItem(`yeongnyangi:report-share:${row.id}`);if(saved){const value=JSON.parse(saved);if(/^[a-f0-9]{64}$/.test(value.token)&&typeof value.url==='string')setShareLink(value);}}catch{/* Sharing stays opt-in. */}},[row.id]);
 useEffect(()=>{if(shareOpen)void prepareKakao(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);},[shareOpen]);
 async function createLink(){if(!consent||busy)return;setBusy(true);try{const key=`yeongnyangi:report-share:${row.id}`,pendingKey=`${key}:pending`;let token=localStorage.getItem(pendingKey);if(!token||!/^[a-f0-9]{64}$/.test(token)){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(pendingKey,token);}const result=await fortuneApi<{url:string;token:string}>('report-shares',{requestId:row.id,token});const link={url:result.url,token:result.token};localStorage.setItem(key,JSON.stringify(link));localStorage.removeItem(pendingKey);setShareLink(link);setStatus(shareText?.linkReady||'공개 링크가 만들어졌어요. 링크를 받은 사람은 선택한 요약을 볼 수 있어요.');}catch{setStatus(shareText?.linkError||'링크를 만들지 못했어요. 이미지 저장이나 기본 공유를 이용해 주세요.');}finally{setBusy(false);}}
 async function revokeLink(){if(!shareLink||busy)return;setBusy(true);try{await fortuneApi(`report-shares/${shareLink.token}/revoke`,{});localStorage.removeItem(`yeongnyangi:report-share:${row.id}`);setShareLink(null);setConsent(false);setStatus(shareText?.linkRemoved||'공개 링크를 해제했어요. 이미 저장된 이미지는 회수할 수 없습니다.');}catch{setStatus(shareText?.linkRemoveError||'공유 해제에 실패했어요. 다시 시도해 주세요.');}finally{setBusy(false);}}
 async function copyLink(){if(!shareLink)return;try{await navigator.clipboard.writeText(shareLink.url);setStatus(shareText?.linkCopied||'공개 링크를 복사했어요.');}catch{setStatus(`${shareText?.copyManual||'직접 복사할 링크:'} ${shareLink.url}`);}}
 async function kakaoShare(){if(!shareLink||!report)return;try{const result=await shareThrough('kakao',{title:'Code Destiny · Yeongnyangi',text:publicShareReport(report).oneLineSummary,url:shareLink.url,image:`https://code-destiny.com${report.mascot}`});setStatus(result.status==='opened'?(shareText?.opened||'카카오톡 공유창을 열었어요.'):result.status==='cancelled'?(shareText?.cancelled||'공유를 취소했어요.'):(shareText?.failed||'카카오톡 공유창을 열지 못했어요. 링크를 복사해 보내 주세요.'));}catch{setStatus(shareText?.failed||'카카오톡 공유창을 열지 못했어요. 링크를 복사해 보내 주세요.');}}
 return <details id="my-fortune-summary" className={styles.tools}><summary>{readingFocusCopy(row.locale).tools}</summary><ExternalImageGuide brand="yeongnyangi" domain={report.serviceType} locale={report.locale} groups={groups} passages={passages} notes={report.chart?.limitations||report.coverage.missing}>
  <section className={styles.share}><button type="button" aria-expanded={shareOpen} onClick={()=>setShareOpen(value=>!value)}>{shareText.share}</button>
  {shareOpen&&<><p>{text.linkExpires}</p><p>{text.publicNotice}</p><ul>{publicReport.chart?.groups.map(group=><li key={group.id}><strong>{chartTerm(group.label,row.locale)}</strong>{group.items.map((item,index)=><div key={index}>{chartTerm(item.label,row.locale)}: {item.value}</div>)}</li>)}</ul>
  {!shareLink?<><label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>{text.linkConsent}</label><button type="button" disabled={!consent||busy} onClick={()=>void createLink()}>{text.linkCreate}</button></>:<><input aria-label={text.linkCopy} readOnly value={shareLink.url} onFocus={event=>event.target.select()}/><button type="button" onClick={()=>void copyLink()}>{text.linkCopy}</button><button type="button" onClick={()=>void kakaoShare()}>{shareText.kakao}</button><button type="button" disabled={busy} onClick={()=>void revokeLink()}>{text.linkRevoke}</button></>}</>}
  <p role="status" aria-live="polite">{status}</p></section>
 </ExternalImageGuide></details>;
}
