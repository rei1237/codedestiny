import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {cleanProduct,reviewProduct,selectProducts,providerEnabled,cleanEvent,validImageUrl} from '../../js/recommendations-core.mjs';
const now=Date.parse('2026-11-01T00:00:00Z');
const fixture=(id,providerId='coupang',patch={})=>reviewProduct(cleanProduct({id,providerId,category:'books',kind:'stationery',title:id,reason:'독서 중 읽던 곳을 표시하는 용도',practiceTags:['focus'],topicReasons:{focus:'집중하는 독서 시간을 돕는 도구'},interests:['reading'],affiliateUrl:providerId==='coupang'?'https://link.coupang.com/a/FixtureOnly':'https://s.click.aliexpress.com/e/_FixtureOnly',imageUrl:'/images/fixture.png',imageSource:'synthetic test only',evidence:'synthetic test only',...patch}),{account:true,facts:true,image:true,allowedCategory:true},now);
const footer=products=>selectProducts(products,{service:'recommendations',source:'footer'},now);
test('footer automatically selects at most four image-ready products and represents both eligible merchants',()=>{
 const rows=[fixture('coupon-a'),fixture('coupon-b'),fixture('ali-a','aliexpress',{order:999})];
 assert.deepEqual(footer(rows).map(p=>p.id),['coupon-a','ali-a','coupon-b']);
 assert.equal(footer(rows.filter(p=>p.providerId==='coupang')).length,2);
 const settings={providers:{coupang:{enabled:true,approved:true,mediaRegistered:true,trackingId:'AF7837486',evidence:'fixture'},aliexpress:{enabled:false}}};
 assert.ok(footer(rows.filter(p=>providerEnabled(settings,p.providerId))).every(p=>p.providerId==='coupang'));
});
test('anonymous seeds rotate four unique eligible products, remain stable and retain result relevance',()=>{
 const rows=Array.from({length:12},(_,i)=>fixture('random-'+i));
 const context={service:'recommendations',source:'footer',selectionSeed:'anonymous-seed-01'};
 const first=selectProducts(rows,context,now);
 assert.equal(first.length,4);assert.equal(new Set(first.map(p=>p.id)).size,4);
 assert.deepEqual(selectProducts(rows,context,now),first);
 const combinations=new Set(Array.from({length:20},(_,i)=>JSON.stringify(selectProducts(rows,{...context,selectionSeed:'anonymous-seed-'+i},now).map(p=>p.id))));
 assert.ok(combinations.size>15);
 const result={...context,service:'legacy-saju',source:'result',practiceTags:['focus']};
 assert.equal(selectProducts(rows,result,now).length,4);
 assert.deepEqual(selectProducts(rows,{...result,practiceTags:['rest']},now),[]);
 assert.ok(selectProducts([...rows,{...rows[0],id:'bad-image',imageUrl:''},{...rows[0],id:'bad-stock',stock:'sold-out'}],context,now).every(p=>!p.id.startsWith('bad-')));
});
test('missing images, sold-out, expired and paused products never occupy the automatic footer',()=>{
 const p=fixture('test-item');
 for(const patch of [{imageUrl:''},{imageSource:''},{imageUrl:'https://evil.test/x.jpg'},{stock:'sold-out'},{status:'paused'},{expiresAt:new Date(now).toISOString()}])assert.deepEqual(footer([{...p,...patch}]),[]);
 assert.deepEqual(footer([]),[]);
});
test('footer does not prescribe symbols, supplements or study material',()=>{
 const symbols=fixture('test-symbol','aliexpress',{category:'daily-life',kind:'bracelet',practiceTags:['symbolism','focus'],topicReasons:{symbolism:'fixture',focus:'fixture'}});
 const study=fixture('test-study','coupang',{book:{perspective:'divination-study'}});
 assert.deepEqual(footer([symbols,study]),[]);
 assert.deepEqual(selectProducts([fixture('test-item')],{service:'fortune-chat',source:'footer'},now),[]);
});
test('completed results still require related advice and never fall back to footer merchandise',()=>{
 const p=fixture('test-item');
 assert.deepEqual(selectProducts([p],{service:'legacy-saju',source:'result'},now),[]);
 assert.equal(selectProducts([p],{service:'legacy-saju',source:'result',practiceTags:['focus']},now).length,1);
 assert.deepEqual(selectProducts([{...p,imageUrl:''}],{service:'legacy-saju',source:'result',practiceTags:['focus']},now),[]);
 assert.deepEqual(selectProducts([p],{service:'recommendations',source:'article',practiceTags:['focus']},now),[]);
});
test('footer metrics accept a product and retain old result and browse placement compatibility',()=>{
 for(const placement of ['footer','result','browse'])assert.ok(cleanEvent({event:'impression',placement,service:'recommendations',productId:'test-item',consent:true}));
 assert.equal(cleanEvent({event:'impression',placement:'footer',service:'recommendations',consent:true}),null);
});
test('official image hosts are narrow and reject malicious URL forms',()=>{
 for(const host of ['t1c.coupangcdn.com','t2c.coupangcdn.com','t3a.coupangcdn.com','t4a.coupangcdn.com','t4c.coupangcdn.com','t5a.coupangcdn.com','t5c.coupangcdn.com'])assert.ok(validImageUrl('https://'+host+'/image/test.jpg'));
 for(const url of ['http://t1c.coupangcdn.com/image/x.jpg','https://t1c.coupangcdn.com.evil.test/x.jpg','https://user@t1c.coupangcdn.com/x.jpg','https://t1c.coupangcdn.com:444/x.jpg','https://t1c.coupangcdn.com/x.jpg?secret=1'])assert.equal(validImageUrl(url),false,url);
});
test('shelf routes and navigation are removed while the API and admin remain',async()=>{
 for(const path of ['app/recommendations/page.tsx','app/recommendations/[category]/page.tsx','app/components/recommendations/RecommendationBrowse.jsx'])assert.equal(existsSync(new URL('../../'+path,import.meta.url)),false);
 const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(read('public/_worker.js')).toString('base64'))).default;
 for(const old of ['/recommendations','/recommendations/','/recommendations/books/','/recommendations/daily-life/','/recommendations/pets/','/recommendations/fandom/']) { const response=await worker.fetch(new Request('https://code-destiny.com'+old),{},{});assert.equal(response.status,301);assert.equal(response.headers.get('location'),'https://code-destiny.com/'); }
 for(const path of ['app/components/recommendations/RecommendationSurface.jsx','js/recommendations-legacy.mjs'])assert.doesNotMatch(read(path),/affiliateBrowsePath|rememberRecommendationContext|\/recommendations\//);
 assert.ok(read('worker/routes/recommendations.js').includes('/api/recommendations'));
 assert.ok(existsSync(new URL('../../app/admin/recommendations/page.jsx',import.meta.url)));
});
