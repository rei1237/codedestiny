import {execFileSync} from 'node:child_process';
import {sameSnapshot,snapshotFor,tagFor} from '../../lib/editions/external-receipt.mjs';
import spring from '../../lib/editions/yeoni-spring-declaration.json' with {type:'json'};

function git(args,input) {
  return execFileSync('git',args,{input,encoding:'utf8'}).trim();
}
export const gitArchive={
  find(tag) {
    const ref='refs/tags/'+tag;
    const result=git(['ls-remote','--refs','origin',ref]);
    if(!result)return null;
    const [sha,name]=result.split(/\s+/);
    if(!/^[0-9a-f]{40}$/.test(sha)||name!==ref)throw Error('외부 원본 참조 오류');
    git(['fetch','--no-tags','origin',ref]);
    return {sha,data:JSON.parse(git(['show',sha+':receipt.json']))};
  },
  create(tag,data) {
    const object=git(['hash-object','-w','--stdin'],JSON.stringify(data,null,2)+'\n');
    const tree=git(['mktree'],'100644 blob '+object+'\treceipt.json\n');
    const sha=git(['-c','user.name=Edition workshop','-c','user.email=edition-workshop@users.noreply.github.com','commit-tree',tree,'-m','Publish '+tag]);
    git(['push','origin',sha+':refs/tags/'+tag]);
  }
};
export async function archiveReceipt(rows,item,archive=gitArchive) {
  const tag=tagFor(item);
  const snapshot=snapshotFor(rows,item);
  if(item.serial>1){
    const previous=rows.find(r=>r.editionId===item.editionId && r.serial===item.serial-1);
    const prior=item.editionId===spring.editionId && previous.serial===1?spring:(await archive.find(tagFor(previous)))?.data;
    if(!sameSnapshot(prior,snapshotFor(rows,previous)))throw Error('직전 외부 원본과 한도·번호가 달라 공개를 중단했어요.');
  }
  let saved=await archive.find(tag);
  if(!saved){
    await archive.create(tag,snapshot);
    saved=await archive.find(tag);
  }
  const day=saved?.data?.records?.at(-1)?.publishedOn;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('외부에 기록한 날짜를 확인할 수 없어요.');
  // A retry after midnight must keep the date that was already published.
  snapshot.records.at(-1).publishedOn=day;
  if(!sameSnapshot(saved.data,snapshot))throw Error('이미 공개된 번호의 원본이 다릅니다.');
  item.publishedOn=day;
  item.externalSha=saved.sha;
}
