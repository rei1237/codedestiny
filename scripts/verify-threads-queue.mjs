import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {threadsTextWeight} from '../worker/lib/threads.js';
const queue=JSON.parse(readFileSync('marketing/copy/threads-queue.json','utf8'));
const sitemap=readFileSync('sitemap.xml','utf8');
const bundled=await build({stdin:{contents:"export {questionGuides,contextualQuestionGuides} from './lib/fortune/question-journey';",loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const guides=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const questionIds=new Set([...guides.questionGuides,...guides.contextualQuestionGuides].map(row=>row.id));
const seen=new Set(),hooks=new Set();
assert.equal(queue.posts.length,13);assert.equal(new Set(queue.posts.map(p=>p.content_type)).size,6);
for(const row of queue.posts){
 assert.ok(/^T(0[2-9]|1[0-4])$/.test(row.id));assert.ok(!seen.has(row.id));seen.add(row.id);
 assert.equal(row.account,'codedestiny_official');assert.equal(row.prompt_version,queue.prompt_version);
 assert.ok(!hooks.has(row.hook));hooks.add(row.hook);
 assert.ok(row.source_basis&&row.audience&&row.editorial_review);
 assert.ok(['pending_public_dedup','published'].includes(row.status));
 assert.ok(threadsTextWeight(row.text)<=480,`${row.id} exceeds conservative limit`);
 assert.ok(row.text.startsWith(row.hook));assert.ok(row.text.endsWith('#꿀꿀운세'));
 assert.ok(!/100%|무조건|반드시|성공 보장|재회 보장|오늘만|선착순|제가 상담한/.test(row.text));
 const url=new URL(row.destination_url);assert.equal(url.origin,'https://code-destiny.com');
 assert.equal(url.searchParams.get('utm_campaign'),row.campaign_id);assert.equal(row.campaign_id,`threads_queue_${row.id.toLowerCase()}_v1`);
 assert.ok(sitemap.includes(`<loc>${url.origin}${url.pathname}</loc>`),`${row.id} unknown public landing`);
 if(url.searchParams.has('question')){assert.ok(questionIds.has(url.searchParams.get('question')));assert.equal(url.hash,'#questions');}
 if(row.status==='published')assert.match(row.publication_url||'',/^https:\/\/www\.threads\.(com|net)\/@codedestiny_official\/post\/[A-Za-z0-9_-]+/);
 else assert.equal(row.publication_url,null);
}
console.log(JSON.stringify({ok:true,reviewed:queue.posts.length,types:6,realPosts:0,publicationClearance:'Requires normal-slot public-history/log dedup; this is not evidence of publication.'},null,2));
