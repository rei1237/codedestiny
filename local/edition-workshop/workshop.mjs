import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { id as hash, ZeroHash } from 'ethers';
import QRCode from 'qrcode';
import { openChain } from './chain.mjs';

const art = {yeoni:'/assets/mascot/yeoni-reading-guide-v1.webp', cat:'/assets/yeongnyangi/original/hero-800.webp'};
const publicDir = new URL('../../public/', import.meta.url);
function reject(status,message) { throw Object.assign(Error(message),{status}); }
function artwork(character) {
  if (!Object.hasOwn(art,character)) reject(400,'캐릭터를 선택해 주세요.');
  return createHash('sha256').update(fs.readFileSync(new URL('.'+art[character],publicDir))).digest('hex');
}
function commitment(e) { return hash(JSON.stringify([e.id,e.character,e.title,e.cap,e.digest])); }
export async function openWorkshop(dir) {
  fs.mkdirSync(dir,{recursive:true});
  const db = new DatabaseSync(path.join(dir,'workshop.sqlite'));
  db.exec(`pragma journal_mode=WAL;
    create table if not exists settings(key text primary key,value text not null);
    create table if not exists editions(id text primary key,character text,title text,cap integer,digest text,stage text,channel text,sku text);
    create table if not exists issues(id text,serial integer,code text unique,state text,tx text,reason text,primary key(id,serial));
    create table if not exists audit(at text default CURRENT_TIMESTAMP,id text,actor text,action text);`);
  const chain = await openChain(dir,db);
  const {contract:c,provider} = chain;
  const q = s=>db.prepare(s);
  const edition = id=>q('select * from editions where id=?').get(id) || reject(404,'에디션을 찾을 수 없어요.');
  const issue = (id,n)=>q('select * from issues where id=? and serial=?').get(id,n);
  const audit = (id,actor,action)=>q('insert into audit(id,actor,action) values(?,?,?)').run(id,actor,action);
  const list = ()=>({editions:q('select * from editions order by rowid desc').all().map(e=>({...e,image:art[e.character],
    issues:q('select * from issues where id=? order by serial').all(e.id),audit:q('select at,action,actor from audit where id=? order by rowid desc limit 30').all(e.id)}))});
  async function reconcile(e,r) {
    const events = await c.queryFilter(c.filters.Issued(hash(e.id),r.serial),0,'latest');
    if (events.length !== 1 || events[0].args.codeHash !== hash(r.code)) return false;
    const tx = events[0].transactionHash;
    const receipt = await provider.getTransactionReceipt(tx);
    if (!receipt || receipt.status !== 1 || receipt.to?.toLowerCase() !== c.target.toLowerCase()) return false;
    if (r.tx && r.tx !== tx) return false;
    q("update issues set state='confirmed',tx=? where id=? and serial=?").run(tx,e.id,r.serial);
    return true;
  }
  async function mutate(body,actor,afterSend) {
    if (body.action === 'draft') {
      const title = String(body.title||'').trim();
      if (!title || title.length>80 || !Number.isSafeInteger(body.cap) || body.cap<1 || body.cap>100000) reject(400,'상품명과 발행 한도(1~100,000)를 확인해 주세요.');
      const digest = artwork(body.character), id = body.id || randomUUID();
      const old = q('select stage from editions where id=?').get(id);
      if (old && old.stage !== 'draft') reject(409,'확정한 에디션은 바꿀 수 없어요.');
      q(`insert into editions values(?,?,?,?,?,'draft',?,?) on conflict(id) do update set
        character=excluded.character,title=excluded.title,cap=excluded.cap,digest=excluded.digest,channel=excluded.channel,sku=excluded.sku`)
        .run(id,body.character,title,body.cap,digest,String(body.channel||'').slice(0,40),String(body.sku||'').slice(0,80));
      audit(id,actor,'초안 저장'); return list();
    }
    const e = edition(body.id), key = hash(e.id);
    if (body.action === 'seal') {
      q("update editions set stage='sealing' where id=?").run(e.id);
      let s = await c.series(key);
      if (!s.cap) { await (await c.seal(key,e.cap,commitment(e))).wait(); s = await c.series(key); }
      if (s.cap !== BigInt(e.cap) || s.work !== commitment(e)) reject(409,'계약의 한도·작품 정보가 달라요.');
      q("update editions set stage='sealed' where id=?").run(e.id);
      audit(e.id,actor,'한도 확정'); return list();
    }
    if (e.stage !== 'sealed') reject(409,'한도를 먼저 확정해 주세요.');
    const n = body.serial;
    if (!Number.isSafeInteger(n) || n<1 || n>e.cap) reject(409,'발행 한도 밖의 번호예요.');
    let r = issue(e.id,n);
    if (body.action === 'mint') {
      if (!r) {
        const s = await c.series(key);
        if (s.issued !== BigInt(n-1) || s.work !== commitment(e)) reject(409,'다음 발행 번호와 작품을 확인해 주세요.');
        q("insert into issues values(?,?,?,'pending',null,null)").run(e.id,n,randomBytes(12).toString('hex'));
        audit(e.id,actor,n+'번 발행 접수'); r = issue(e.id,n);
      }
      if (await reconcile(e,r)) {
        if (r.state !== 'confirmed') audit(e.id,actor,n+'번 발행 복구·확정');
        return list();
      }
      if (r.tx) {
        const receipt=await provider.getTransactionReceipt(r.tx);
        if (receipt?.status!==0 || r.state==='confirmed') reject(409,'기존 거래를 확인 중이에요. 다시 조회해 주세요.');
        audit(e.id,actor,n+'번 실패 거래: '+r.tx);
        q("update issues set state='failed',tx=null where id=? and serial=?").run(e.id,n);
      } else if (r.state === 'confirmed') reject(409,'확정 기록과 체인이 일치하지 않아요.');
      try {
        const tx = await c.mint(key,n,hash(r.code));
        q('update issues set tx=? where id=? and serial=?').run(tx.hash,e.id,n);
        await afterSend?.(); await tx.wait();
        if (!await reconcile(e,issue(e.id,n))) reject(503,'거래 확인 중이에요.');
        audit(e.id,actor,n+'번 발행 확정');
      } catch(err) {
        if (!issue(e.id,n).tx) q("update issues set state='failed' where id=? and serial=?").run(e.id,n);
        throw err;
      }
    } else if (body.action === 'void') {
      const reason = String(body.reason||'').trim();
      if (!r || r.state !== 'confirmed' || !reason || reason.length>100) reject(400,'확정 번호와 무효 사유를 확인해 주세요.');
      const token = await c.number(key,n);
      const previous = await c.invalidation(token);
      if (previous === ZeroHash) await (await c.invalidate(token,hash(reason))).wait();
      else if (previous !== hash(reason)) reject(409,'이미 다른 사유로 무효 처리됐어요.');
      q('update issues set reason=? where id=? and serial=?').run(reason,e.id,n);
      audit(e.id,actor,n+'번 무효');
    } else reject(400,'알 수 없는 요청이에요.');
    return list();
  }
  async function verify(code) {
    const r = q('select * from issues where code=?').get(code);
    if (!r || r.state !== 'confirmed') reject(404,'등록된 발행 기록을 찾을 수 없어요.');
    const e = edition(r.id), key = hash(e.id), token = await c.number(key,r.serial);
    const [s,owner,voidHash,events,receipt] = await Promise.all([c.series(key),c.ownerOf(token),c.invalidation(token),
      c.queryFilter(c.filters.Issued(key,r.serial),0,'latest'),provider.getTransactionReceipt(r.tx)]);
    if (s.cap !== BigInt(e.cap) || s.work !== commitment(e) || artwork(e.character)!==e.digest || owner !== await c.issuer() ||
      events.length !== 1 || events[0].args.tokenId !== token || events[0].args.codeHash !== hash(code) || events[0].transactionHash !== r.tx ||
      !receipt || receipt.status!==1 || receipt.to?.toLowerCase()!==c.target.toLowerCase()) reject(409,'발행 기록과 작품 정보가 일치하지 않아요.');
    return {status:voidHash!==ZeroHash?'void':'verified',character:e.character,title:e.title,image:art[e.character],
      cap:e.cap,serial:r.serial,issued:Number(s.issued),digest:e.digest,contract:c.target,chainId:31337,token:String(token),tx:r.tx,block:receipt.blockNumber};
  }
  let tail = Promise.resolve();
  return {chain,db,list,verify,mutate(body,actor,afterSend){
    const job = tail.then(()=>mutate(body,actor,afterSend)); tail=job.catch(()=>{}); return job;
  },async qr(code,origin){
    const proof = await verify(code);
    if(proof.status!=='verified') reject(409,'무효 번호는 인쇄할 수 없어요.');
    const u = new URL(origin);
    if (!['localhost','127.0.0.1'].includes(u.hostname) || u.protocol!=='http:' || u.origin!==origin) reject(400,'로컬 화면 주소를 확인해 주세요.');
    const url = origin+'/editions/verify/?code='+code;
    return {url,png:await QRCode.toDataURL(url,{width:512,margin:4,errorCorrectionLevel:'M'})};
  },async close(){await tail; await chain.close(); db.close();}};
}
