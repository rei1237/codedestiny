import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const base=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await readFile(path.join(base,'v3/manifest.json'),'utf8'));
const posts=JSON.parse(await readFile(path.join(base,'v3/posts.json'),'utf8'));
const layout=JSON.parse(await readFile(path.join(base,'v3/layout-check.json'),'utf8'));
assert.equal(manifest.cards.length,10);
const files=[];
for(const card of manifest.cards){
 const file=path.join(base,'v3',card.file);let bytes=await readFile(file);let m=await sharp(bytes).metadata();
 if(card.number>1){assert.equal(m.width,1080);assert.equal(m.height,1350);if(m.format!=='jpeg'){bytes=await sharp(bytes).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toBuffer();await writeFile(file,bytes);m=await sharp(bytes).metadata();}}
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(card.number===1)assert.equal(sha256,manifest.originalCoverSha256);
 files.push({number:card.number,file:card.file,width:m.width,height:m.height,format:m.format,sha256});
}
for(const row of layout){assert.ok(row.bottom<row.footer,`Card ${row.number} footer overlap`);assert.equal(row.images,true);assert.equal(row.width,1080);}
const lengths=posts.posts.map(p=>({id:p.id,length:[...p.text].length}));
for(const p of lengths)assert.ok(p.length<=500,`${p.id}: ${p.length}`);
assert.ok(!/대통령|탄핵|대선|정치인/.test(posts.posts.map(p=>p.text).join('\n')));
await writeFile(path.join(base,'v3/validation.json'),JSON.stringify({schedule:manifest.scheduledKST,originalPreserved:true,files,postLengths:lengths,layoutPassed:true,operatingChecks:'Pending scheduled price/discount/UI verification; not published.'},null,2)+'\n');
console.log(JSON.stringify({cards:files.length,originalPreserved:true,maxPostLength:Math.max(...lengths.map(p=>p.length)),layoutPassed:true}));
