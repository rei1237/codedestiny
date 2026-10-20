import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {runInNewContext} from 'node:vm';
import {parse} from 'parse5';
import {extractObjectLiteral} from '../lib/feature-marketing-extract.mjs';
import {renderCraftedDetail} from '../../js/feature-detail-panels.mjs';

const ledger = JSON.parse(fs.readFileSync('docs/design/service-introduction-art.json', 'utf8'));
const art = JSON.parse(fs.readFileSync('lib/marketing/service-introduction-art.json', 'utf8'));
const catalogue = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
const registryWindow = {};
runInNewContext(fs.readFileSync('js/core/service-registry.js','utf8'), {window:registryWindow});
const shell = fs.readFileSync('index.html','utf8');
const details = extractObjectLiteral(shell, 'D');
const aliases = new Map();
const normalize = x => String(x || '').replace(/\/$/, '');
const links = new Map(ledger.assets.map(x => [x.slug, []]));
for (const row of ledger.assets) {
  assert.ok(art[row.slug], `${row.slug}: runtime mapping missing`);
  assert.ok(row.prompt && row.source, `${row.slug}: provenance missing`);
  for (const ref of row.references) assert.ok(fs.existsSync(ref), `${row.slug}: missing reference`);
  for (const key of [row.slug, ...(row.aliases || [])]) if (!aliases.has(normalize(key))) aliases.set(normalize(key), row.slug);
  for (const width of [320,640,960,1536]) {
    const file = width === 1536 ? row.output : row.output.replace('.webp',`-${width}.webp`);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width,width,`${row.slug}: wrong variant width`);
    assert.equal(metadata.format,'webp');
    assert.ok(Math.abs(metadata.width / metadata.height - 1.5) < .01,`${row.slug}: unexpected composition`);
  }
  assert.ok(art[row.slug].alt.length > 5);
  if (catalogue.items[row.slug]) {
    assert.equal(catalogue.items[row.slug].image,catalogue.items[row.slug].verification === 'verified' ? `/feature-details/assets/${row.slug}-960.webp` : art[row.slug].image,`${row.slug}: generated detail`);
    links.get(row.slug).push('generated feature detail');
  }
}
for (const item of registryWindow.__cdServiceRegistry) if (art[item.id]) {
  assert.equal(item.image,art[item.id].cardImage,`${item.id}: registry`);
  links.get(item.id).push('service registry');
}
for (const [key,value] of Object.entries(details)) {
  const slug=aliases.get(normalize(key));
  if (slug && value.img) {
    assert.equal(value.img,art[slug].image,`${slug}: legacy detail`);
    links.get(slug).push(`D:${key}`);
  }
}
function visit(node,inherited) {
  const attrs=Object.fromEntries((node.attrs||[]).map(x=>[x.name,x.value]));
  const slug=['data-feature-key','data-cd-service-id','data-action','href'].map(k=>aliases.get(normalize(attrs[k]))).find(Boolean)||inherited;
  const profileAvatar=/\/avatars\/|\/avatar(?:-\d+)?\.webp/.test(attrs.src||'');
  if(slug && !profileAvatar) for(const key of node.tagName==='img'?['src','data-img-src']:['data-img-src']) {
    if(attrs[key]) {
      assert.ok(attrs[key].startsWith(art[slug].image.replace('.webp','')),`${slug}: ${key}`);
      links.get(slug).push(`shell:${key}`);
    }
  }
  for(const child of node.childNodes||[])visit(child,slug);
}
visit(parse(shell));
const products=JSON.parse(fs.readFileSync('content/product-details/catalog.json','utf8'));
for(const id of new Set(Object.values(products.products))) {
  const file=`content/product-details/${id}/manifest.json`;
  if(!fs.existsSync(file))continue;
  const cover=JSON.parse(fs.readFileSync(file,'utf8')).panels?.[0];
  const published=`public/feature-details/crafted/${id}/manifest.json`;
  if(cover?.src?.startsWith('/images/service-introductions/')&&fs.existsSync(published)){
    assert.equal(JSON.parse(fs.readFileSync(published,'utf8')).panels?.[0]?.src,cover.src,`${id}: published cover drift`);
  }
  for(const row of ledger.assets) if(cover?.src===art[row.slug].image)links.get(row.slug).push(file);
}
const explicit = {
 ...Object.fromEntries(['tea-saju','tea-tarot','tea-sukuyo','tea-saju-joint'].map(slug=>[slug,'src/features/fortune-tea-house/components/FortuneTeaHouseLanding.tsx'])),
 ...Object.fromEntries(['neo-saju','neo-vedic','neo-ziwei','neo-astrology'].map(slug=>[slug,'src/features/neo-war-room/data/assets.ts'])),
  'neo-consultation':'app/neo-consultation/NeoConsultationClient.tsx',
  'fortune-chat-yeoni':'app/fortune-chat/YeoniWelcome.tsx',
  'destiny-island':'destiny-island.html',
  'yeon-star-hug':'app/yeon-star-hug/YeonStarHugClient.tsx',
};
for(const [slug,file] of Object.entries(explicit))if(art[slug] && (fs.readFileSync(file,'utf8').includes(`/service-introductions/${slug}`) || (['tea-saju','tea-tarot','tea-sukuyo'].includes(slug)&&fs.readFileSync(file,'utf8').includes('/service-introductions/tea-${mode}-640.webp'))))links.get(slug).push(file);
for(const [slug,surfaces]of links)assert.ok(surfaces.length,`${slug}: no actual introduction connection`);
for(const entry of catalogue.index){
 const file=`public/feature-details/${entry.slug}.json`;if(!fs.existsSync(file))continue;
 const detail=JSON.parse(fs.readFileSync(file,'utf8'));
 if(detail.crafted?.length>1)for(const essay of detail.crafted){
  if(essay.panels?.[0]?.src?.startsWith('/images/service-introductions/')){
   assert.equal(essay.cover?.width,320,`${entry.slug}: edition thumbnail must use small variant`);
   assert.ok(fs.existsSync('public'+essay.cover.src));
  }
 }
}
const coverHtml=renderCraftedDetail({notice:'안내',panels:[{src:art['palm-reading'].image,width:1536,height:1024,title:'손금 상담',text:'질문 <선택> & 해석',alt:art['palm-reading'].alt,textBelowImage:true}]});
assert.ok(coverHtml.includes('craftedCoverCopy'));
assert.ok(coverHtml.includes('질문 &lt;선택&gt; &amp; 해석'),'Cover copy must remain readable escaped HTML');
assert.ok(coverHtml.includes(art['palm-reading'].alt),'New illustration needs its descriptive alternative');
if(!process.argv.includes('--allow-pending-review')){
  const reviews=JSON.parse(fs.readFileSync('docs/design/service-introduction-review.json','utf8')).reviews;
  for(const row of ledger.assets)assert.ok(reviews.some(x=>x.slug===row.slug&&x.source===row.source&&x.status==='pass'),`${row.slug}: current original has not passed visual review`);
}
if(process.argv.includes('--record-connections'))fs.writeFileSync('docs/design/service-introduction-connections.json',JSON.stringify(Object.fromEntries(links),null,2)+'\n');
console.log(`PASS ${ledger.assets.length} feature mappings, ${ledger.assets.length*4} WebP files, registry + DOM/lazy + details + authored covers`);
