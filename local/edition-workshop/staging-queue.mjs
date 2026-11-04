import {pathToFileURL} from 'node:url';
import {STAGING_ORIGIN, RECORDS} from '../../lib/editions/staging.mjs';

export async function readReleaseQueue(request=fetch) {
  const get = path => request(STAGING_ORIGIN+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
  const catalogResponse=await get(RECORDS+'/index.json');
  if (!catalogResponse.ok) throw Error('이전 발행 목록을 확인할 수 없습니다.');
  const catalog=await catalogResponse.json();
  if (catalog.environment!=='staging-rehearsal' || !Array.isArray(catalog.items)) throw Error('발행 목록 형식 오류');
  const previous=catalog.items.filter(item=>item.editionId);
  const response=await get('/api/edition-workshop/issue-queue');
  // The first rollout builds Pages before the new Worker is routed.
  if (response.status===404 && previous.length===0) return [];
  if (!response.ok) throw Error('발행 대기 목록을 확인할 수 없습니다.');
  const queue=await response.json();
  if (queue.version!==1 || !Array.isArray(queue.products)) throw Error('발행 대기 목록 형식 오류');
  const entries=queue.products.map(product=>{
    const {id,title,character,cap,issueCount}=product;
    if (!/^[a-f0-9-]{36}$/.test(id) || typeof title!=='string' || !title.trim() || title.length>80 ||
        !['cat','yeoni'].includes(character) || !Number.isInteger(cap) || cap<1 || cap>100 ||
        !Number.isInteger(issueCount) || issueCount<1 || issueCount>cap) throw Error('발행 요청 값 오류');
    const pins=[];
    return {id,title,character,cap,issueCount,pins,studio:true};
  });
  for (const item of previous) {
    const entry=entries.find(e=>e.id===item.editionId);
    if (!entry || item.serial>entry.issueCount || !Number.isInteger(item.serial) || item.serial<1 ||
        !/^[0-9a-f]{64}$/.test(item.pin) || entry.pins[item.serial-1]) throw Error('기존 발행 기록을 보존할 수 없습니다.');
    entry.pins[item.serial-1]=item.pin;
  }
  return entries;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const entries=await readReleaseQueue();
  console.log(entries.some(e=>e.issueCount>e.pins.filter(Boolean).length)?'pending':'current');
}
