'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../_lib/admin-api';
import { ADMIN_INPUT, adminButton } from '../_components/ui';
import { CRM_CAMPAIGNS, campaignUrl, contribution } from '@/lib/marketing/kakao-crm.mjs';
import styles from './page.module.css';

type Campaign = { _id: string; creativeId: string; status: string; recipients: number; unitCostKRW: number; expectedKRW: number; scheduledAt: string; audienceEvidence: string; report?: { sent: number; failed: number; contributionKRW: number | null } };
const CENTER='https://business.kakao.com/space/10500173/channel/_GgxaGX/messages';
const COSTS = [['netRevenueKRW','환불·세금 제외 매출'],['messageCostKRW','채널 발송비'],['couponCostKRW','쿠폰 부담 비용'],['pgCostKRW','PG 수수료'],['llmCostKRW','LLM 원가']] as const;
export default function KakaoCrmPage() {
  const [items,setItems]=useState<Campaign[]>([]), [error,setError]=useState(''), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false);
  const [creativeId,setCreativeId]=useState('yeoni-weekly');
  const [operationId,setOperationId]=useState('');
  const previewUrl=campaignUrl(creativeId,/^[a-z0-9][a-z0-9-]{2,79}$/.test(operationId)?operationId:'');
  const [reviewChecks,setReviewChecks]=useState({audienceChecked:false, previewChecked:false, walletChecked:false});
  const [reportId,setReportId]=useState('');
  const [costs,setCosts]=useState<Record<string,string>>({});
  const creative=CRM_CAMPAIGNS.find(c=>c.id===creativeId)!;
  const creativeImageUrl=`/assets/kakao-crm/${creative.image}`;
  const refresh=useCallback(async()=>{try {const data=await adminFetch<{campaigns:Campaign[]}>('/api/admin/kakao-crm/');setItems(data.campaigns);}catch(e){setError(e instanceof Error?e.message:'조회 실패');}},[]);
  useEffect(()=>{void refresh();},[refresh]);
  const post=async(action:string,body:Record<string,unknown>)=>{
    setBusy(true);setError('');setNotice('');
    try {const data=await adminFetch<{ok:boolean;message?:string}>(`/api/admin/kakao-crm/${action}`,{method:'POST',body}); if(!data.ok)throw new Error('현재 상태에서 처리할 수 없습니다. 새로고침해 주세요.');setNotice(data.message||'저장했습니다. 실제 메시지는 발송하지 않았습니다.');await refresh();}catch(e){setError(e instanceof Error?e.message:'저장 실패');}finally{setBusy(false);}
  };
  const reportCosts=Object.fromEntries(COSTS.map(([k])=>[k,costs[k]?.trim()?Number(costs[k]):null])) as Record<typeof COSTS[number][0], number | null>;
  const profit=contribution(reportCosts);
  return <main className={styles.page}>
    <h1>카카오 채널 CRM</h1><p>꿀꿀 운세 · 관리자 검토 후 카카오에서 예약 발송</p><p>검토 기록은 캠페인 ID 역순으로 최대 50개 표시합니다.</p>
    <p className={styles.notice}>자동 발송 API는 연결되지 않았습니다. 이 화면은 검토·중지 기록과 비용 정산을 관리합니다. 카카오 예약의 생성·중지는 관리자센터에서 직접 수행하세요.</p>
    <p><a href={`${CENTER}/welcome`} target="_blank" rel="noreferrer">웰컴 메시지</a> · <a href={`${CENTER}/new`} target="_blank" rel="noreferrer">카카오 메시지 작성</a> · <a href="https://business.kakao.com/space/10500173/channel/_GgxaGX/targetgroups/list" target="_blank" rel="noreferrer">친구 그룹</a></p>
    <div className={styles.workspace}><section><h2>메시지 소재</h2><label>소재 선택<select className={ADMIN_INPUT} value={creativeId} onChange={e=>setCreativeId(e.target.value)}>{CRM_CAMPAIGNS.map(c=><option key={c.id} value={c.id}>{c.title}{c.paid?' · 발송 보류':''}</option>)}</select></label>
      <article className={styles.preview}><p>(광고) 꿀꿀 운세</p><img src={creativeImageUrl} width={800} height={600} alt={creative.title}/><p style={{whiteSpace:'pre-line'}}>{creative.body}</p><a href={previewUrl} target="_blank" rel="noreferrer">{creative.button}</a><small>수신거부 | 홈 &gt; 채널차단</small></article>
      <p>사이트 검토용 미리보기입니다. 카카오톡 실제 미리보기·테스트 발송도 확인하세요.</p><p><a href={creativeImageUrl} download>발송용 이미지 저장</a></p><label>UTM 연결 주소<textarea readOnly className={ADMIN_INPUT} value={previewUrl}/></label>
    </section><section><h2>발송 검토안 만들기</h2><form className={styles.form} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void post('draft',{id:f.get('id'),creativeId,recipients:Number(f.get('recipients')),unitCostKRW:Number(f.get('unitCostKRW')),vatRate:Number(f.get('vatRate')),budgetKRW:Number(f.get('budgetKRW')),scheduledAt:new Date(`${f.get('scheduledAt')}+09:00`).toISOString(),audienceEvidence:f.get('audienceEvidence')});}}>
      <label>캠페인 ID (중복 불가)<input required name="id" value={operationId} onChange={e=>setOperationId(e.target.value)} pattern="[a-z0-9][a-z0-9-]{2,79}" placeholder="yeoni-weekly-20261005" className={ADMIN_INPUT}/></label>
      <label>대상 수<input required name="recipients" type="number" min="1" step="1" className={ADMIN_INPUT}/></label>
      <label>카카오 화면에서 확인한 건당 비용 (원)<input required name="unitCostKRW" type="number" min="0.01" step="0.01" className={ADMIN_INPUT}/></label>
      <label>부가세 비율<select name="vatRate" className={ADMIN_INPUT}><option value="0.1">별도 10%</option><option value="0">입력 단가에 포함</option></select></label>
      <label>총 발송 예산 상한 (원)<input required name="budgetKRW" type="number" min="1" step="1" className={ADMIN_INPUT}/></label>
      <label>희망 예약 시각 (한국시간, 09~20시)<input required name="scheduledAt" type="datetime-local" className={ADMIN_INPUT}/></label>
      <label>대상 그룹 검토 근거<textarea required minLength={10} maxLength={1000} name="audienceEvidence" placeholder="그룹명·조회 시각·수신거부 제외·최근 7일 발송 제외·추가 후 24시간 제외 여부. 개인정보는 입력하지 마세요." className={ADMIN_INPUT}/></label>
      <button disabled={busy} className={adminButton('primary')}>검토안 저장</button>
    </form></section></div>
    <section><h2>검토·중지·발송 기록</h2><div className={styles.checks}>{([['audienceChecked','동의·차단·최근 7일 발송·친구 추가 24시간 제외 그룹 확인'],['previewChecked','카카오 실제 미리보기·내부 테스트·버튼 링크 확인'],['walletChecked','비즈월렛·고객센터 연락처·최종 대상 수와 비용 확인']] as const).map(([k,label])=><label key={k}><input type="checkbox" checked={reviewChecks[k]} onChange={e=>setReviewChecks(s=>({...s,[k]:e.target.checked}))}/>{label}</label>)}</div>
    <div className={styles.scroll}><table><thead><tr><th>캠페인</th><th>상태</th><th>대상·예상 비용</th><th>한국시간</th><th>작업</th></tr></thead><tbody>{items.map(c=><tr key={c._id}><td>{c._id}<details><summary>소재·링크·대상 근거</summary><p>{CRM_CAMPAIGNS.find(item=>item.id===c.creativeId)?.title}</p><textarea readOnly aria-label="캠페인별 연결 주소" value={campaignUrl(c.creativeId,c._id)}/>{c.audienceEvidence}</details></td><td>{c.status}</td><td>{c.recipients}명 · {c.expectedKRW.toLocaleString()}원</td><td>{new Date(c.scheduledAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</td><td>{c.status==='draft'&&<button disabled={busy} className={adminButton()} onClick={()=>void post('review',{id:c._id,...reviewChecks})}>검토 완료 기록</button>}{['draft','reviewed'].includes(c.status)&&<button disabled={busy} className={adminButton()} onClick={()=>void post('pause',{id:c._id})}>운영 중지 기록</button>}{c.status==='reviewed'&&<button className={adminButton()} onClick={()=>setReportId(c._id)}>발송 결과 입력</button>}{c.report&&<p>관리자 입력: {c.report.sent}건 / 실패 {c.report.failed}건<br/>기여이익 {c.report.contributionKRW===null?'미확인':`${c.report.contributionKRW.toLocaleString()}원`}</p>}</td></tr>)}</tbody></table></div>{items.length===0&&<p>아직 저장한 캠페인이 없습니다.</p>}</section>
    {reportId&&<section><h2>{reportId} 정산</h2><p>카카오 보고서와 주문·원가 내역에 근거해 입력하세요. 미확인 비용은 비워 두세요. 할인 차감 후 순매출이면 같은 쿠폰 비용을 다시 차감하지 마세요.</p><form className={styles.form} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void post('report',{id:reportId,report:{...reportCosts,sent:Number(f.get('sent')),failed:Number(f.get('failed')),evidence:f.get('evidence')}});}}>{COSTS.map(([k,label])=><label key={k}>{label} (원)<input type="number" min="0" step="0.01" value={costs[k]||''} onChange={e=>setCosts(s=>({...s,[k]:e.target.value}))} className={ADMIN_INPUT}/></label>)}<label>실제 발송 건수<input required name="sent" type="number" min="0" className={ADMIN_INPUT}/></label><label>실패 건수<input required name="failed" type="number" min="0" className={ADMIN_INPUT}/></label><label>보고서·원가 근거<textarea required name="evidence" minLength={10} maxLength={1000} className={ADMIN_INPUT}/></label><p>기여이익: {profit===null?'비용 미확인':`${profit.toLocaleString()}원`}</p><button disabled={busy} className={adminButton('primary')}>정산 기록 저장</button></form></section>}
    <p role="alert">{error}</p><p role="status">{notice}</p>
  </main>;
}
