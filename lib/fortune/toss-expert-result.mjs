// Both the original client (after an authenticated generation) and the verified
// server purchase row use the same path. The path itself grants no access.
const targets={
  fusion:['/fusion-fortune/','cid'],
  'love-secret':['/love-secret-ai/result/','attemptId'],
  astrology:['/astrology-ai/result/','id'],
  vedic:['/vedic-ai/','cid'],
  ziwei:['/ziwei-ai/','cid'],
  'new-year':['/new-year-ai-consultation/','sid'],
  karma:['/karma-destiny-ai/result/','sessionId'],
  sukuyo:['/sukuyo-compatibility-ai/','cid'],
};
export function tossExpertResultHref(service,id){
  if(!Object.hasOwn(targets,service)||typeof id!=='string'||!id)throw Error('Missing stored expert result ID');
  const [path,key]=targets[service];
  return path+'?'+key+'='+encodeURIComponent(id);
}
