import {useState} from 'react';
import {Share} from '@apps-in-toss/web-framework';
import {APP_NAME} from './platform';
import {useDestinyCompassCopy} from '../../../app/destiny-compass/_lib/copy';
import MansionPdf from './MansionPdf';
import {Button} from './Button';
export function ReportActions({coordinate}:{coordinate:string}){
 const copy=useDestinyCompassCopy(),[error,setError]=useState('');
 async function share(){try{const url=await Share.createLink({path:'intoss://'+APP_NAME+'/destiny-compass'});await Share.sendMessage({message:copy.shareTitle(coordinate)+'\n'+url});}catch{setError('공유 화면을 열지 못했어요. 다시 시도해 주세요.');}}
 return <><MansionPdf selector="[data-pdf-section]" options={{fileName:copy.pdfFileName,backgroundColor:'#12102c',cover:{title:copy.pdfCoverTitle,subtitle:coordinate,date:new Date().toISOString().slice(0,10)}}}/><Button variant="weak" onClick={()=>void share()}>나침반 공유하기</Button>{error&&<p role="alert">{error}</p>}</>;
}
