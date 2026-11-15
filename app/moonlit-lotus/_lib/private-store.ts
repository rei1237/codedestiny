import {canClaim,canWrite,LEASE_MS,type StoredSession} from './session-policy';
import type {Session} from '../model-review/bow-session';
export type PrivateRecord={id:string;scope:string;kind:'bow'|'prayer'|'affirmation';day:string;createdAt:number;updatedAt:number;text:string;completed?:number;target?:number;deleted?:boolean};
let opening:Promise<IDBDatabase>|undefined;
function database(){
 if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('cd-moonlit-private-v1',1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   db.createObjectStore('sessions',{keyPath:'scope'});
   const records=db.createObjectStore('records',{keyPath:'id'});records.createIndex('scope','scope');
  };
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=undefined;};resolve(db);};
  request.onerror=()=>{opening=undefined;reject(request.error);};
  request.onblocked=()=>{opening=undefined;reject(new Error('storage-blocked'));};
 });
 return opening;
}
async function transaction<T>(stores:string[],mode:IDBTransactionMode,work:(tx:IDBTransaction,result:(value:T)=>void)=>void):Promise<T>{
 const db=await database();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(stores,mode);let result:T;
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('storage-aborted'));
  try{work(tx,value=>{result=value;});}catch(error){tx.abort();reject(error);}
 });
}
export function readSession(scope:string){return transaction<StoredSession|undefined>(['sessions'],'readonly',(tx,done)=>{const r=tx.objectStore('sessions').get(scope);r.onsuccess=()=>done(r.result);});}
export function claimSession(scope:string,owner:string,session:Session,day:string){
 return transaction<StoredSession|null>(['sessions'],'readwrite',(tx,done)=>{
  const store=tx.objectStore('sessions'),r=store.get(scope);
  r.onsuccess=()=>{
   const row=r.result as StoredSession|undefined,now=Date.now();
   if(!canClaim(row,owner,now)){done(null);return;}
   // A claim adopts the latest completed count. Reset is an explicit separate operation.
   const next={scope,owner,revision:(row?.revision||0)+1,leaseUntil:now+LEASE_MS,updatedAt:now,day:row?.day||day,session:row?.session||session};
   store.put(next);done(next);
  };
 });
}
export function saveSession(row:StoredSession,session:Session,release=false,resetDay?:string){
 return transaction<StoredSession|null>(['sessions','records'],'readwrite',(tx,done)=>{
  const store=tx.objectStore('sessions'),r=store.get(row.scope);
  r.onsuccess=()=>{
   const now=Date.now(),current=r.result as StoredSession|undefined;
   if(!canWrite(current,row.owner,row.revision,now)){done(null);return;}
   const next={...row,session,day:resetDay||row.day,owner:release?'':row.owner,revision:row.revision+1,leaseUntil:release?0:now+LEASE_MS,updatedAt:now};
   store.put(next);
   if(session.status==='complete'||session.status==='stopped'){
    const records=tx.objectStore('records'),id=row.scope+'|bow|'+session.sessionId,exists=records.get(id);
    exists.onsuccess=()=>{if(!exists.result)records.put({id,scope:row.scope,kind:'bow',day:next.day,createdAt:now,updatedAt:now,text:'',completed:session.completed,target:session.target} satisfies PrivateRecord);};
   }
   done(next);
  };
 });
}
export function listRecords(scope:string){
 return transaction<PrivateRecord[]>(['records'],'readonly',(tx,done)=>{const r=tx.objectStore('records').index('scope').getAll(scope);r.onsuccess=()=>done((r.result as PrivateRecord[]).filter(row=>!row.deleted).sort((a,b)=>b.createdAt-a.createdAt));});
}
export function writeRecord(record:PrivateRecord,expectedUpdatedAt?:number){
 return transaction<boolean>(['records'],'readwrite',(tx,done)=>{
  const store=tx.objectStore('records'),r=store.get(record.id);
  r.onsuccess=()=>{
   const previous=r.result as PrivateRecord|undefined;
   if(previous&&(previous.scope!==record.scope||(expectedUpdatedAt!==undefined&&previous.updatedAt!==expectedUpdatedAt))){done(false);return;}
   const updatedAt=Math.max(Date.now(),(previous?.updatedAt||0)+1);
   // A content-free tombstone prevents a completed session recreating a deleted record.
   store.put(record.deleted?{id:record.id,scope:record.scope,kind:record.kind,day:'',createdAt:0,updatedAt,text:'',deleted:true}:{...record,text:record.text.slice(0,2000),updatedAt});done(true);
  };
 });
}
