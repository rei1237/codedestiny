import {useEffect,useRef,useState} from 'react';
import {api,hasTossSession,nativeSaleProducts,paymentRequiresReview,purchase} from './platform';
import {saveMusicDownload} from './music-download-file';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';
type Track={title:string;artist:string;audioSourceKey:string;featureKey:string};
type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId?:string};
type Product=Awaited<ReturnType<typeof nativeSaleProducts>>[number];
const idPattern=/^[a-f0-9]{64}$/;
function Panel({track,intentId='',orderId=''}:{track?:Track;intentId?:string;orderId?:string}){
 const [item,setItem]=useState(track),[intent,setIntent]=useState(intentId),[paid,setPaid]=useState(false),[product,setProduct]=useState<Product|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [saleState,setSaleState]=useState<'checking'|'login'|'unavailable'|'error'|'ready'>('checking');
 const alive=useRef(false),lock=useRef(false),checkout=useRef<null|(()=>void)>(null);
 const finish=()=>{if(alive.current){lock.current=false;setBusy(false);}};
 const fail=(reason?:unknown)=>{if(!alive.current)return;const issue=reason as {code?:string;message?:string}|undefined,code=issue?.code||issue?.message;setError(code==='MUSIC_FILE_TOO_LARGE'?'파일 크기 때문에 이 기기에서 저장하지 못했어요. 구매 권리는 유지돼요. 추가 결제하지 말고 고객지원에 문의해 주세요.':code==='FILE_SAVE_NOT_SUPPORTED'?'현재 토스 앱에서는 파일 저장을 지원하지 않아요. 구매 권리는 유지되니 앱을 업데이트한 뒤 다시 시도해 주세요.':'구매 또는 다운로드를 확인하지 못했어요. 다시 결제하지 말고 구매 내역을 확인해 주세요.');};
 async function offers(featureKey:string){if(!hasTossSession()){setSaleState('login');return;}try{const rows=await nativeSaleProducts();if(!alive.current)return;const found=rows.find(row=>row.featureKey===featureKey&&row.available&&row.displayAmount)||null;setProduct(found);setSaleState(found?'ready':'unavailable');}catch(reason){if(!alive.current)return;const issue=reason as {status?:number;code?:string};setSaleState(issue.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(issue.code||'')?'login':'error');}}
 async function read(id:string){const result=await api<{state:string;track:Track}>('/native/music/results/'+id);if(!alive.current)return;if(!['COMPLETED','PENDING'].includes(result.state)||!result.track?.audioSourceKey)throw Error('INVALID_RESULT');setItem(result.track);setPaid(result.state==='COMPLETED');if(result.state==='COMPLETED')setNotice('구매한 곡을 MP3 파일로 저장할 수 있어요.');else await offers(result.track.featureKey);}
 useEffect(()=>{alive.current=true;if(intentId&&idPattern.test(intentId))void read(intentId).catch(fail);else if(track)void offers(track.featureKey);return()=>{alive.current=false;checkout.current?.();};},[intentId,track]);
 async function start(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   if(!item||(!product&&!orderId)||paymentRequiresReview())throw Error('RECOVERY_REQUIRED');
   const result=await api<Intent>('/native/music/prepare',{input:{audioSourceKey:item.audioSourceKey},...(orderId?{orderId}:{})});
   if(!alive.current)return;
   if(!idPattern.test(result.id)||typeof result.paid!=='boolean'||!Number.isSafeInteger(result.amountKRW)||result.amountKRW<=0)throw Error('INVALID_INTENT');
   setIntent(result.id);const url=new URL(location.href);url.searchParams.delete('orderId');url.searchParams.set('intentId',result.id);window.history.replaceState(window.history.state,'',url);
   if(result.paid){await read(result.id);finish();return;}
   const fresh=(await nativeSaleProducts()).find(row=>row.featureKey===item.featureKey&&row.sku===result.sku&&row.approvedPriceKRW===result.amountKRW&&row.displayAmount===product?.displayAmount);
   if(!alive.current)return;if(!fresh||fresh.sku!==product?.sku)throw Error('PRICE_CHANGED');
   checkout.current=purchase(fresh,result.id,()=>{if(alive.current)void read(result.id).catch(fail).finally(finish);},()=>{fail();finish();});
  }catch{fail();finish();}
 }
 async function save(){if(lock.current||!paid)return;lock.current=true;setBusy(true);setError('');try{await saveMusicDownload(intent);if(alive.current)setNotice('파일 저장 화면을 열었어요. 저장 위치를 확인해 주세요.');}catch(reason){fail(reason);}finally{finish();}}
 return <section className="music-download" aria-label="MP3 다운로드"><h2>{track?'MP3 다운로드':item?.title||'구매한 음악'}</h2>
 <p>{paid?'이 계정에서 구매한 다운로드예요.':'곡 재생과 MP3 다운로드 구매는 별도로 이용해요.'}</p>
 {paid?<Button display="block" disabled={busy} onClick={()=>void save()}>MP3 파일 저장하기</Button>:<>
 {product&&<p>상품 금액: {product.displayAmount}</p>}<Button display="block" disabled={busy||(!product&&!orderId)} onClick={()=>void start()}>{orderId?'선택한 주문으로 받기':'단건 결제로 다운로드 열기'}</Button>
 {!product&&!orderId&&<p role="status">{saleState==='unavailable'?'다운로드 판매 준비 중이에요. 기존 웹 구매는 웹 이용 내역에서 확인해 주세요.':saleState==='error'?'상품을 확인하지 못했어요. 잠시 후 음악실을 다시 열어 주세요.':saleState==='login'?'다운로드 상품을 확인하려면 로그인해 주세요.':'다운로드 상품을 확인하고 있어요.'}{saleState==='login'&&<a href={'/login/?next='+encodeURIComponent('/music?track='+encodeURIComponent(item?.audioSourceKey||''))}>토스 로그인하기</a>}</p>}</>}
 {busy&&<p role="status">구매 내역을 확인하고 있어요.</p>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 <p><a href="/records">나의 보관함</a> · <a href="/recovery">구매 내역 복구하기</a></p></section>;
}
export default function MusicDownload(props:{track?:Track;intentId?:string;orderId?:string}){return <TossSessionScope><Panel {...props}/></TossSessionScope>;}
