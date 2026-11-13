export function secretHouseDocument(source){
 function replace(from,to,value){
   const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
   if(a<0||b<=a)throw Error('Original Secret House boundary changed at '+from);
   source=source.slice(0,a)+value+'\n'+source.slice(b);
 }
 replace('function resolveAutoStemFromSaju()', 'function runAutoStemSelection()', "function resolveAutoStemFromSaju(){return '';}function resolveAutoBranchFromSaju(){return '';}");
 replace('function houseProfileId()', 'function requestHouseStep(',`
 const requests=new Map();
 function bridge(action,payload){
   const id=crypto.randomUUID();
   return new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>{requests.delete(id);reject(Error('timeout'));},22000);
     requests.set(id,{resolve,reject,timeout});
     parent.postMessage({type:'toss-secret-house',id,action,payload},'*');
   });
 }
 addEventListener('message',event=>{
   if(event.source!==parent||event.data?.type!=='toss-secret-house-result')return;
   const row=requests.get(event.data.id);if(!row)return;
   clearTimeout(row.timeout);requests.delete(event.data.id);
   if(event.data.ok)row.resolve(event.data.result);else row.reject(Error('request failed'));
 });
 function requestHouseOnce(finalCharId){
   return bridge('step',{stem:G.userStem,branch:G.userDayBranch||'',history:G.picks.slice(),finalCharId});
 }`);
 replace('function houseFailureText(', 'function showHouseLoading()', "function houseFailureText(){return '에피소드를 열지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.';}");
 replace('function shareResult()', 'function fallbackCopy(',`function shareResult(){
   if(!G.finalChar)return;
   const text='시크릿 하우스 · '+G.finalChar.name+' · 궁합 '+getTotal(G.finalChar.stem)+'pt';
   bridge('share',text).catch(()=>showToast('공유를 열지 못했어요. 잠시 후 다시 시도해 주세요.'));
 }`);
 return source.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; form-action \'none\'">')
  .replace(/<link rel="preconnect"[^>]+>/g,'').replace(/<style data-cd-r2-static-fonts>[\s\S]*?<\/style>/,'')
  .replace(/<a href="https:\/\/code-destiny\.com"[^>]*>[\s\S]*?<\/a>/,'')
  .replace('💬 카카오톡 공유','결과 공유하기').replace('입장권을 확인하고 에피소드를 불러오고 있어요…','에피소드를 불러오고 있어요…');
}
