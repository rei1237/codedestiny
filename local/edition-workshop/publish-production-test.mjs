import fs from 'node:fs/promises';
import {publicationDate,koreanPublicationDay} from '../../lib/editions/ledger-date.mjs';
import {archiveReceipt} from './archive-receipt.mjs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readReleaseQueue} from './staging-queue.mjs';
import {TEST_ORIGIN,TEST_RECORDS,TEST_PREFIX,TEST_ENVIRONMENT} from '../../lib/editions/production-test.mjs';

// This job publishes test data only. Never deploy Pages/Worker or use an external EVM.
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_WORKFLOW!=='Edition test issuer') throw Error('승인된 테스트 발행 작업에서만 실행하세요.');
const entries=await readReleaseQueue(fetch,true);
const pending=entries.some(e=>e.issueCount>e.pins.filter(Boolean).length);
if(process.argv.includes('--check')) {
  if(process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,'pending='+pending+'\n');
  console.log(pending?'pending':'current');
} else if(pending) {
  const {publishStaging}=await import('./publish-staging.mjs');
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'production-test-editions-'));
  try {
    const catalog=await publishStaging({target:'production-test',origin:TEST_ORIGIN,directory:folder,stateRoot:folder,entries});
    const dest=path.join(folder,TEST_RECORDS.slice(1));
    const upload=(file)=>{
      const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put',
        'codedestinyassets/'+TEST_PREFIX+file,'--remote','--file',path.join(dest,file),
        '--content-type',file.endsWith('.png')?'image/png':'application/json'],{stdio:'inherit'});
      if(result.status!==0) throw Error('테스트 발행증 업로드 실패');
    };
    const publishedToday=koreanPublicationDay(new Date());
    for(const item of catalog) {
      const entry=entries.find(e=>e.id===item.editionId);
      if(entry.pins[item.serial-1]) {
        item.publishedOn=publicationDate({...item,publishedOn:entry.publishedDays[item.serial-1]});
        if(entry.externalShas[item.serial-1])item.externalSha=entry.externalShas[item.serial-1];
        continue;
      }
      item.publishedOn=publishedToday;
      await archiveReceipt(catalog,item);
      upload(item.code+'.json'); upload(item.code+'.png');
    }
    await fs.writeFile(path.join(dest,'index.json'),JSON.stringify({environment:TEST_ENVIRONMENT,items:catalog})+'\n');
    upload('index.json');
    console.log('Published test-only receipts:',catalog.length);
  } finally {await fs.rm(folder,{recursive:true,force:true});}
}

