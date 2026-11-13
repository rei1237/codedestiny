import {useState} from 'react';
import {Device} from '@apps-in-toss/web-framework';
import {isToss} from './platform';

const histories={
 points:{title:'웹 이용권·월정석 내역',body:'Code Destiny 웹에서 사용한 이용권, 월정석과 단건 주문은 구매 당시의 웹 계정에서 확인해요.',links:[['웹 이용 내역 열기','https://code-destiny.com/points/history/']]},
 island:{title:'기존 운명의 섬 상담',body:'웹에서 구매한 궁별 상담과 12궁 심층 리포트는 원래 웹 계정으로 열어요. 작성이 끝나지 않은 상담은 저장된 부분까지 읽을 수 있어요.',links:[['웹 구매 기록 열기','https://code-destiny.com/records/'],['웹 12궁 심층 리포트 확인','https://code-destiny.com/island-consult/?view=report']]},
} as const;
export default function WebPurchaseHistory({kind}:{kind:keyof typeof histories}){
 const [failed,setFailed]=useState(false),history=histories[kind];
 return <details id={kind==='points'?'web-history':'island-history'} className="paper"><summary>{history.title}</summary><p>{history.body}</p><p>브라우저가 열리면 구매에 사용한 웹 계정으로 로그인해 주세요.</p>
 {history.links.map(([label,href])=><p key={href}><a href={href} target="_blank" rel="noopener noreferrer" onClick={event=>{
   if(!isToss())return;
   event.preventDefault();setFailed(false);void Device.openURL(href).catch(()=>setFailed(true));
 }}>{label}</a></p>)}{failed&&<p role="alert">브라우저를 열지 못했어요. 링크를 다시 눌러 주세요.</p>}</details>;
}
