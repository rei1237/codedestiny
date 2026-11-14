const prefix='toss:neo-question-draft:',ttl=24*60*60*1000;
const key=owner=>prefix+encodeURIComponent(owner);
export function readNeoQuestionDraft(storage,owner,now=Date.now()){
 if(!owner)return '';
 try{
  const saved=JSON.parse(storage.getItem(key(owner))||'null');
  return saved?.owner===owner&&typeof saved.question==='string'&&saved.question.length<=600&&Number.isFinite(saved.at)&&saved.at<=now&&now-saved.at<ttl?saved.question:'';
 }catch{return '';}
}
export function saveNeoQuestionDraft(storage,owner,question,now=Date.now()){
 if(!owner)return;
 try{
  if(!question.trim())storage.removeItem(key(owner));
  else storage.setItem(key(owner),JSON.stringify({owner,question:question.slice(0,600),at:now}));
 }catch{/* Keep the live input available when device storage is unavailable. */}
}
