import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import QRCode from 'qrcode';
import {openWorkshop} from './workshop.mjs';
import {series} from './staging-series.mjs';
import {STAGING_ORIGIN, RECORDS, issueUrl} from '../../lib/editions/staging.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const codeFor=(id,n)=>sha(JSON.stringify(['edition-qr-v1',id,n])).slice(0,24);
const genesis='2026-11-05T00:00:00Z'; // simulated block clock, not the physical manufacturing date

export async function publishStaging({target,origin,directory,stateRoot,entries=series}) {
  if(target!=='staging'||origin!==STAGING_ORIGIN) throw Error('스테이징 전용 발행 대상이 아닙니다.');
  const dest=path.join(directory,RECORDS.slice(1));
  await fs.mkdir(dest,{recursive:true});
  const catalog=[];
  for(const {id,character,title,cap,issueCount,pins} of entries) {
    if (!/^[a-z0-9-]+$/.test(id) || !Number.isInteger(issueCount) || issueCount<1 || issueCount>cap || pins.length!==issueCount) {
      throw Error('스테이징 에디션 설정이나 발행 기록 고정값이 누락됐습니다: '+id);
    }
    // Never reuse the local SQLite DB, wallet, an external node, or real credentials.
    const dir=await fs.mkdtemp(path.join(stateRoot,'edition-'));
    let w;
    try {
      w=await openWorkshop(dir,{seed:sha('rehearsal-only/'+id),genesis,codeFor});
      await w.mutate({action:'draft',id,character,title,cap},'staging-release');
      await w.mutate({action:'seal',id},'staging-release');
      for(let serial=1;serial<=issueCount;serial++) await w.mutate({action:'mint',id,serial},'staging-release');
      for(let serial=1;serial<=issueCount;serial++){
        const code=codeFor(id,serial), proof=await w.verify(code);
        const block=await w.chain.provider.getBlock(proof.block);
        const commitment=sha(JSON.stringify([id,code,proof.title,proof.character,proof.cap,proof.serial,proof.digest,
          proof.chainId,proof.contract,proof.token,proof.tx,block.hash]));
        if(commitment!==pins[serial-1]) throw Error('기존 QR의 발행 근거 불일치: '+id+' #'+serial+' calculated='+commitment);
        const record={...proof,environment:'staging-rehearsal',code,blockHash:block.hash};
        await fs.writeFile(path.join(dest,code+'.json'),JSON.stringify(record)+'\n');
        await QRCode.toFile(path.join(dest,code+'.png'),issueUrl(code),{width:512,margin:4,errorCorrectionLevel:'M'});
        catalog.push({code,title,character,serial,cap});
      }
    } finally {try{if(w)await w.close();}finally{await fs.rm(dir,{recursive:true,force:true});}}
  }
  await fs.writeFile(path.join(dest,'index.json'),JSON.stringify({environment:'staging-rehearsal',items:catalog})+'\n');
  return catalog;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const directory=path.resolve('dist');
  await fs.access(path.join(directory,'editions/verify/index.html'));
  const stateRoot=fileURLToPath(new URL('.state/',import.meta.url)); await fs.mkdir(stateRoot,{recursive:true});
  const items=await publishStaging({target:process.env.CD_DEPLOY_TARGET,origin:process.env.CD_STAGING_ORIGIN,directory,stateRoot});
  console.log('[edition-staging] verified test EVM receipts and QR images:',items.map(i=>i.code).join(', '));
}
