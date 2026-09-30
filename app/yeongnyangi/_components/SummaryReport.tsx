'use client';
import {useEffect,useMemo,useState} from 'react';
import type {FortuneRecord} from '../_lib/api';
import {buildSummaryReport,publicShareReport,reportName,visibleChartGroups} from '../_lib/summary-report';
import {renderSummaryPng,reportPageCount} from '../_lib/summary-export';
import {birthSymbol} from '@/lib/tarot/yeongnyangi-birth-symbol.mjs';
import {yeongnyangiCardArt} from '@/lib/tarot/yeongnyangi-deck';
import {prepareKakao,shareThrough} from '@/js/share-service.mjs';
import {fortuneApi} from '../_lib/api';
import styles from './summary-report.module.css';

export default function SummaryReportView({row}:{row:FortuneRecord}){
 const report=useMemo(()=>buildSummaryReport(row),[row]);
 const [open,setOpen]=useState(false),[shareOpen,setShareOpen]=useState(false),[format,setFormat]=useState<'feed'|'story'>('feed');
 const [prepared,setPrepared]=useState<Blob|null>(null),[status,setStatus]=useState('');
 const [birthDate,setBirthDate]=useState('');
 const [shareLink,setShareLink]=useState<{url:string;token:string}|null>(null),[consent,setConsent]=useState(false),[linkBusy,setLinkBusy]=useState(false);
 const symbol=report?.serviceType==='tarot'?birthSymbol(birthDate):null;
 useEffect(()=>{try{const saved=localStorage.getItem(`yeongnyangi:report-share:${row.id}`);if(saved){const value=JSON.parse(saved);if(/^[a-f0-9]{64}$/.test(value.token)&&typeof value.url==='string')setShareLink(value);}}catch{/* Link remains private until user creates it. */}},[row.id]);
 useEffect(()=>{if(shareOpen)void prepareKakao(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);},[shareOpen]);
 useEffect(()=>{if(!shareOpen||!report)return;let cancelled=false;setPrepared(null);setStatus('공유 이미지를 준비하고 있어요.');void renderSummaryPng(publicShareReport(report),format).then(blob=>{if(!cancelled){setPrepared(blob);setStatus('공유할 내용을 확인해 주세요.');}}).catch(()=>{if(!cancelled)setStatus('이미지를 만들지 못했어요. 보고서는 그대로 볼 수 있습니다.');});return()=>{cancelled=true;};},[shareOpen,format,report]);
 if(!report)return null;
 function save(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function saveReport(){if(!report)return;try{for(let i=0;i<reportPageCount(report);i++)save(await renderSummaryPng(report,'report',i),`yeongnyangi-report-${i+1}.png`);setStatus('보고서 이미지를 저장했어요.');}catch{setStatus('이미지 저장에 실패했어요. 화면의 보고서는 계속 볼 수 있습니다.');}}
 async function nativeShare(){if(!prepared||!report)return;const file=new File([prepared],`yeongnyangi-${format}.png`,{type:'image/png'});try{if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:reportName(report.serviceType)});else save(prepared,`yeongnyangi-${format}.png`);}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setStatus('공유창을 열지 못했어요. 이미지를 저장해 공유해 주세요.');}}
 async function createLink(){if(!consent||linkBusy)return;setLinkBusy(true);try{const key=`yeongnyangi:report-share:${row.id}`,pendingKey=`${key}:pending`;let token=localStorage.getItem(pendingKey);if(!token||!/^[a-f0-9]{64}$/.test(token)){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(pendingKey,token);}const result=await fortuneApi<{url:string;token:string}>('report-shares',{requestId:row.id,token});const link={url:result.url,token:result.token};localStorage.setItem(key,JSON.stringify(link));localStorage.removeItem(pendingKey);setShareLink(link);setStatus('공개 링크가 만들어졌어요. 링크를 받은 사람은 선택한 요약을 볼 수 있어요.');}catch{setStatus('링크를 만들지 못했어요. 이미지 저장이나 기본 공유를 이용해 주세요.');}finally{setLinkBusy(false);}}
 async function revokeLink(){if(!shareLink||linkBusy)return;setLinkBusy(true);try{await fortuneApi(`report-shares/${shareLink.token}/revoke`,{});localStorage.removeItem(`yeongnyangi:report-share:${row.id}`);setShareLink(null);setConsent(false);setStatus('공개 링크를 해제했어요. 이미 저장된 이미지는 회수할 수 없습니다.');}catch{setStatus('공유 해제에 실패했어요. 다시 시도해 주세요.');}finally{setLinkBusy(false);}}
 async function copyLink(){if(!shareLink)return;try{await navigator.clipboard.writeText(shareLink.url);setStatus('공개 링크를 복사했어요.');}catch{setStatus(`직접 복사할 링크: ${shareLink.url}`);}}
 async function kakaoShare(){if(!shareLink||!report)return;try{const result=await shareThrough('kakao',{title:reportName(report.serviceType),text:publicShareReport(report).oneLineSummary,url:shareLink.url,image:`https://code-destiny.com${report.mascot}`});setStatus(result.status==='opened'?'카카오톡 공유창을 열었어요.':result.status==='cancelled'?'공유를 취소했어요.':'카카오톡 공유창을 열지 못했어요. 링크를 복사해 보내 주세요.');}catch{setStatus('카카오톡 공유창을 열지 못했어요. 링크를 복사해 보내 주세요.');}}
 return <section className={styles.root} id="my-fortune-summary" lang={report.locale}>
  <header className={styles.head}><div><h2>내 운세 한 장 요약</h2><p>{reportName(report.serviceType)}</p></div><img src={report.mascot} width={104} height={104} alt=""/></header>
  <p className={styles.headline}>{report.headline}</p><p className={styles.summary}>{report.oneLineSummary}</p>
  <div className={styles.actions}><button type="button" onClick={()=>setOpen(value=>!value)}>{open?'보고서 접기':'보고서 보기'}</button><button type="button" onClick={()=>void saveReport()}>이미지 저장</button><button type="button" onClick={()=>setShareOpen(value=>!value)}>공유하기</button></div>
  {open&&<div className={styles.content}>
   {report.chart?<section className={styles.chart}><h3>{report.chart.title}</h3><p>{report.chart.source}</p><div className={styles.groups}>{visibleChartGroups(report).map(group=><div key={group.id} className={`${styles.group} ${report.serviceType==='saju'&&group.label==='일주'?styles.dayPillar:''}`}>{report.serviceType==='tarot'&&group.image&&<img className={styles.tarotArt} src={group.image} alt="저장된 상담 카드 그림"/>}<h4>{group.label}</h4><dl>{group.items.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></div>)}</div>{Boolean(report.chart.limitations?.length)&&<p>{report.chart.limitations.join(' · ')}</p>}</section>:<p>{report.coverage.missing.join(' ')}</p>}
   {report.serviceType==='tarot'&&<section className={styles.birth}><h3>나의 탄생 상징 카드</h3><p>실제로 뽑은 카드와 별개로, 양력 생년월일 여덟 자리의 숫자 합으로 계산하는 상징입니다. 이 서비스의 계산 방식은 gregorian-digits-rws-v1입니다.</p><label>양력 생년월일 <input type="date" value={birthDate} onChange={event=>setBirthDate(event.target.value)}/></label>{symbol?<div><img src={yeongnyangiCardArt(symbol.cardCode,report.locale).src} width={150} height={240} alt={`${symbol.name} 카드 그림`}/><strong>{symbol.name} · {symbol.number}번</strong></div>:<p>{birthDate?'유효한 양력 날짜를 입력해 주세요.':'원한다면 양력 생년월일을 입력해 확인할 수 있어요.'}</p>}</section>}
   <div className={styles.sections}>{report.sections.map((section,index)=><section key={index}><h3>{section.title}</h3><p>{section.body}</p><a href={`#chapter-${section.chapterId}`}>긴 풀이에서 보기</a></section>)}</div>
   {report.mascotMessage&&<blockquote>{report.mascotMessage}</blockquote>}
  </div>}
  {shareOpen&&<div className={styles.share}><h3>공유 이미지 미리보기</h3><p>공개용 이미지는 확정된 차트 요소만 옮깁니다. 생년월일·출생지·질문 원문·상담 문장·결제 정보는 넣지 않습니다. 차트도 개인 정보가 될 수 있으니 저장·공유 전에 확인해 주세요.</p><label>크기 <select value={format} onChange={e=>setFormat(e.target.value as 'feed'|'story')}><option value="feed">피드 1080 × 1350</option><option value="story">스토리 1080 × 1920</option></select></label>{prepared&&<Preview blob={prepared}/>}<button type="button" disabled={!prepared} onClick={()=>void nativeShare()}>공유창 열기</button><button type="button" disabled={!prepared} onClick={()=>prepared&&save(prepared,`yeongnyangi-${format}.png`)}>이미지 저장</button><h3>공개 링크</h3><p>링크는 30일 동안 열 수 있고 언제든 해제할 수 있습니다. 링크 방문자에게는 위 공개용 차트 요소와 요약만 보입니다.</p>{!shareLink?<><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> 위 공개 범위를 확인하고 링크 만들기에 동의합니다.</label><button type="button" disabled={!consent||linkBusy} onClick={()=>void createLink()}>공개 링크 만들기</button></>:<><input aria-label="공개 보고서 링크" readOnly value={shareLink.url} onFocus={e=>e.target.select()}/><button type="button" onClick={()=>void copyLink()}>링크 복사</button><button type="button" onClick={()=>void kakaoShare()}>카카오톡 공유</button><button type="button" disabled={linkBusy} onClick={()=>void revokeLink()}>공유 해제</button></>}</div>}
  <p role="status" aria-live="polite">{status}</p>
 </section>;
}
function Preview({blob}:{blob:Blob}){const [url,setUrl]=useState('');useEffect(()=>{const next=URL.createObjectURL(blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[blob]);return url?<img className={styles.preview} src={url} alt="공유 이미지의 실제 미리보기"/>:null;}
