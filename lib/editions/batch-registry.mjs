import artifact from './batch-contract.mjs';

export const network = {
  chain:'0x1f34f', name:'Etherlink Shadownet', rpc:'https://node.shadownet.etherlink.com',
  explorer:'https://shadownet.explorer.etherlink.com',
  issuer:'0x1ef90B4a40C749948c7371Cb19544D784fa72699',
  // First contract created by the designated test issuer (nonce 0).
  contract:'0xb4E3E86A9BE7eB8e4F0866AD239709ceA1d64272'
};
const committed='0xdab52e0d7b195ea89a7dd2b5e9aa97686da2d6eb9437455710029d33b903fb7f';
const word=n=>BigInt(n).toString(16).padStart(64,'0');
const hash64=/^[a-f0-9]{64}$/;
async function sha(values){
  const bytes=new TextEncoder().encode(JSON.stringify(values));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const key=id=>sha(['code-destiny/edition-series/v1',id]);
export function seriesRows(items,product){
  const rows=items.filter(item=>item.editionId===product.id).sort((a,b)=>a.serial-b.serial);
  if(rows.some((r,i)=>r.serial!==i+1 || r.cap!==product.cap || r.serial>r.cap || r.title!==product.title ||
    r.character!==product.character || !hash64.test(r.pin) || !/^[0-9a-f]{24}$/.test(r.code))) throw Error('발행 목록이 일치하지 않아요.');
  return rows;
}
export async function batchRoot(rows){
  if(!rows.length) throw Error('공개할 번호가 없어요.');
  let level=await Promise.all(rows.map(r=>sha(['edition-leaf-v1',r.editionId,r.serial,r.cap,r.code,r.title,r.character,r.pin])));
  while(level.length>1){
    const parents=[];
    for(let i=0;i<level.length;i+=2)parents.push(sha(['edition-node-v1',level[i],level[i+1]??level[i]]));
    level=await Promise.all(parents);
  }
  return level[0];
}
export async function rpc(method,params){
  const res=await fetch(network.rpc,{method:'POST',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!res.ok)throw Error('공개 체인에 연결하지 못했어요.');
  const result=await res.json();
  if(result.error || result.result==null)throw Error('공개 체인 응답을 확인해 주세요.');
  return result.result;
}
async function codeState(request,contract){
  if(await request('eth_chainId',[])!==network.chain)throw Error('Etherlink Shadownet 테스트넷을 선택해 주세요.');
  const code=await request('eth_getCode',[contract,'latest']);
  if(code==='0x')return false;
  if(code!==artifact.runtime)throw Error('공식 묶음 계약 코드가 일치하지 않아요.');
  const issuer=await request('eth_call',[{to:contract,data:'0x1d143848'},'latest']);
  if(issuer.toLowerCase()!=='0x'+network.issuer.slice(2).toLowerCase().padStart(64,'0'))throw Error('공식 발행자가 일치하지 않아요.');
  return true;
}
async function words(request,contract,data,n){
  const result=await request('eth_call',[{to:contract,data},'latest']);
  if(!new RegExp('^0x[0-9a-f]{'+n*64+'}$','i').test(result))throw Error('공개 기록을 읽지 못했어요.');
  return result.slice(2).toLowerCase().match(/.{64}/g);
}
const uint=w=>Number(BigInt('0x'+w));
export async function registryState(product,request=rpc,contract=network.contract){
  const id=await key(product.id);
  const deployed=await codeState(request,contract);
  if(!deployed)return {id,deployed,cap:0,published:0,batches:0};
  const [cap,published,batches]=(await words(request,contract,'0xf5de118e'+id,3)).map(uint);
  if(cap && cap!==product.cap)throw Error('공개 한도가 공방 한도와 다릅니다.');
  return {id,deployed,cap,published,batches};
}
export async function submitBatch(action,product,items,wallet){
  if(!wallet)throw Error('발행용 MetaMask를 열어 주세요.');
  const request=(method,params)=>wallet.request({method,params});
  const state=await registryState(product,request);
  const [from]=await request('eth_requestAccounts',[]);
  if(from?.toLowerCase()!==network.issuer.toLowerCase())throw Error('등록된 발행 지갑을 선택해 주세요.');
  let tx={from,chainId:network.chain,to:network.contract};
  if(action==='deploy'&&!state.deployed){
    if(BigInt(await request('eth_getTransactionCount',[from,'pending']))!==0n)throw Error('발행 지갑의 배포 순서를 확인해 주세요.');
    tx={from,chainId:network.chain,nonce:'0x0',data:artifact.deploy};
  }else if(action==='seal' && state.deployed && !state.cap){
    tx.data='0x5eb10ed9'+state.id+word(product.cap);
  }else if(action==='publish' && state.deployed){
    const rows=seriesRows(items,product).slice(state.published);
    const root=await batchRoot(rows);
    tx.data='0xaef23351'+state.id+word(product.cap)+word(rows[0].serial)+word(rows.at(-1).serial)+root;
  }else throw Error('공개 상태를 새로고침해 주세요.');
  if(await request('eth_chainId',[])!==network.chain)throw Error('테스트넷을 다시 선택해 주세요.');
  tx.gas=await request('eth_estimateGas',[tx]);
  return request('eth_sendTransaction',[tx]);
}
export async function verifyBatch(proof,items,request=rpc,contract=network.contract){
  const row=items.find(r=>r.code===proof.code);
  if(!row?.editionId)throw Error('공방 발행 목록을 확인해 주세요.');
  const product={id:row.editionId,title:proof.title,cap:proof.cap,character:proof.character};
  const rows=seriesRows(items,product);
  const pin=await sha([product.id,proof.code,proof.title,proof.character,proof.cap,proof.serial,proof.digest,
    proof.chainId,proof.contract,proof.token,proof.tx,proof.blockHash]);
  if(row.pin!==pin || row.serial!==proof.serial)throw Error('발행증 원본이 목록과 일치하지 않아요.');
  const state=await registryState(product,request,contract);
  if(proof.serial>state.published)return {total:rows.length,published:false};
  let low=1,high=state.batches;
  while(low<=high){
    const mid=Math.floor((low+high)/2);
    const [a,b,root,height]=await words(request,contract,'0xacfc87ba'+state.id+word(mid),4);
    const first=uint(a),last=uint(b);
    if(proof.serial<first){high=mid-1;continue;}
    if(proof.serial>last){low=mid+1;continue;}
    if(last>rows.length || await batchRoot(rows.slice(first-1,last))!==root)throw Error('공개 묶음과 발행 기록이 일치하지 않아요.');
    const block='0x'+BigInt('0x'+height).toString(16);
    const events=await request('eth_getLogs',[{address:contract,fromBlock:block,toBlock:block,topics:[committed,'0x'+state.id]}]);
    const event=events.find(e=>!e.removed && e.data==='0x'+a+b+word(proof.cap)+root);
    if(!/^0x[0-9a-f]{64}$/i.test(event?.transactionHash||''))throw Error('묶음 공개 거래를 확인하지 못했어요.');
    return {total:rows.length,published:true,first,last,root,tx:event.transactionHash};
  }
  throw Error('해당 번호의 공개 묶음을 찾을 수 없어요.');
}
