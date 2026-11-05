// The official contract address is pinned after a confirmed Base Sepolia deployment.
export const spring = {
  title: '연이 봄 부적', character: 'yeoni', chain: '0x14a34',
  contract: null,
  series: 'ffa6d7185b579a79ce372316957607599a8bf4b9de432aaf13100ad185b70a1a',
  work: '746a65c18ce3e61f8296277258d04a3099e15b12a5372b67ccaf094774e1f315',
};
const issuedTopic = '0x36a2bf86983894d82a65d60531510c27d68d58217943e0ffca3c5ef3119f5788';
const hash = /^0x[0-9a-f]{64}$/i;
const word = n => BigInt(n).toString(16).padStart(64,'0');
export async function deploySpring(wallet) {
  const network=()=>wallet.request({method:'eth_chainId',params:[]});
  if(await network()!==spring.chain) throw Error('지갑에서 Base Sepolia 테스트넷을 선택해 주세요.');
  const [from]=await wallet.request({method:'eth_requestAccounts',params:[]});
  const response=await fetch('/assets/edition-testnet/edition-deploy.json',{credentials:'omit'});
  if(!response.ok) throw Error('공방 계약을 불러오지 못했어요.');
  const artifact=await response.json();
  if(artifact.chainId!==spring.chain || !/^0x[0-9a-f]+$/.test(artifact.data) || await network()!==spring.chain)
    throw Error('테스트넷 계약을 확인해 주세요.');
  return wallet.request({method:'eth_sendTransaction',params:[{from,chainId:spring.chain,data:artifact.data}]});
}
export async function publicRPC(method, params) {
  const response = await fetch('https://sepolia.base.org', {method:'POST', credentials:'omit',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!response.ok) throw Error('테스트넷 연결을 확인해 주세요.');
  const body = await response.json();
  if(body.error || !('result' in body)) throw Error('테스트넷 조회에 실패했어요. 잠시 후 다시 확인해 주세요.');
  return body.result;
}
async function guard(rpc, contract) {
  if(!/^0x[0-9a-f]{40}$/i.test(contract || '')) throw Error('공식 테스트넷 계약 등록을 기다리고 있어요.');
  if(await rpc('eth_chainId',[]) !== spring.chain) throw Error('Base Sepolia 테스트넷을 선택해 주세요.');
}
const call = (rpc,to,data,block='latest') => rpc('eth_call',[{to,data},block]);
async function seriesState(rpc,contract,block) {
  const result = await call(rpc,contract,'0xf5de118e'+spring.series,block);
  if(!/^0x[0-9a-f]{192}$/i.test(result)) throw Error('공식 시리즈를 확인할 수 없어요.');
  const [cap,issued,work] = result.slice(2).toLowerCase().match(/.{64}/g);
  if(BigInt('0x'+cap)>0xffffffffn || BigInt('0x'+issued)>BigInt('0x'+cap) ||
    (BigInt('0x'+cap)>0n && work!==spring.work)) throw Error('작품 또는 발행 수량이 일치하지 않아요.');
  return {cap:Number(BigInt('0x'+cap)),issued:Number(BigInt('0x'+issued))};
}
export async function readSpring(tx,rpc=publicRPC,contract=spring.contract) {
  await guard(rpc,contract);
  if(!hash.test(tx)) throw Error('발행 거래 번호를 확인해 주세요.');
  const receipt = await rpc('eth_getTransactionReceipt',[tx]);
  if(receipt?.status!=='0x1' || receipt.transactionHash?.toLowerCase()!==tx.toLowerCase() ||
    receipt.to?.toLowerCase()!==contract.toLowerCase()) throw Error('공식 계약에서 확정된 거래를 찾지 못했어요.');
  const event = receipt.logs.find(log=>!log.removed && log.address.toLowerCase()===contract.toLowerCase() &&
    log.topics[0]===issuedTopic && log.topics[1]==='0x'+spring.series);
  if(!event || !hash.test(event.topics[2]) || !/^0x[0-9a-f]{128}$/i.test(event.data)) throw Error('이 시리즈의 발행 거래가 아니에요.');
  const block = await rpc('eth_blockNumber',[]);
  const {cap,issued} = await seriesState(rpc,contract,block);
  const serial = Number(BigInt(event.topics[2]));
  if(serial<1 || serial>issued) throw Error('발행 번호가 일치하지 않아요.');
  const reason = await call(rpc,contract,'0x1ce70be3'+event.data.slice(2,66),block);
  if(!hash.test(reason) || BigInt(reason)!==0n) throw Error('유효한 발행증을 확인할 수 없어요.');
  return {title:spring.title,character:spring.character,cap,issued,serial,
    explorer:'https://sepolia.basescan.org/tx/'+tx};
}
export async function sendSpring(wallet,action,cap,contract=spring.contract) {
  const rpc=(method,params)=>wallet.request({method,params});
  await guard(rpc,contract);
  const [from]=await rpc('eth_requestAccounts',[]);
  const issuer=await call(rpc,contract,'0x1d143848');
  if(!from || issuer.toLowerCase()!=='0x'+from.slice(2).toLowerCase().padStart(64,'0')) throw Error('공식 발행 지갑을 연결해 주세요.');
  const state=await seriesState(rpc,contract,'latest');
  let data;
  if(action==='seal' && !state.cap && Number.isInteger(cap) && cap>=1 && cap<=100000) {
    data='0xbe09b6c1'+spring.series+word(cap)+spring.work;
  } else if(action==='mint' && state.cap===cap && !state.issued) {
    // Certificate identity is scoped to this series and its first edition.
    data='0x3bbbd466'+spring.series+word(1)+spring.series;
  } else throw Error('한도 또는 001번 발행 상태를 확인해 주세요.');
  await guard(rpc,contract);
  return rpc('eth_sendTransaction',[{chainId:spring.chain,from,to:contract,data}]);
}
