// Explicit one-time migration for the approved replacement hero. Does not run on page load.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { pruneLegacyHomeCss } from './legacy-home-selectors.mjs';
const file='index.html',html=fs.readFileSync(file,'utf8'),edits=[];
const removedHosts=new Set(['moon-hero__copy','moon-hero__visual','moon-hero__ambient','cd-hero-island','cd-hero-fx']);
function walk(node) {
 const classes=node.attrs?.find(a=>a.name==='class')?.value.split(/\s+/)||[];
 const loc=node.sourceCodeLocation;
 if(loc&&classes.some(c=>removedHosts.has(c))){edits.push([loc.startOffset,loc.endOffset,'']);return}
 if(node.tagName==='style'&&loc?.startTag&&loc?.endTag){const css=html.slice(loc.startTag.endOffset,loc.endTag.startOffset);const clean=pruneLegacyHomeCss(css);if(clean!==css)edits.push([loc.startTag.endOffset,loc.endTag.startOffset,clean]);return}
 for(const child of node.childNodes||[])walk(child);
}
walk(parse(html,{sourceCodeLocationInfo:true}));
let updated=html;
for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))updated=updated.slice(0,start)+text+updated.slice(end);
fs.writeFileSync(file,updated);
const changed=[{file,removedBytes:Buffer.byteLength(html)-Buffer.byteLength(updated)}];
function styles(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())styles(p);else if(entry.name.endsWith('.css')&&!['home-funnel.css','yehwa-motifs.css'].includes(entry.name)){const old=fs.readFileSync(p,'utf8'),clean=pruneLegacyHomeCss(old);if(old!==clean){fs.writeFileSync(p,clean);changed.push({file:p,removedBytes:Buffer.byteLength(old)-Buffer.byteLength(clean)})}}}}
styles('styles');
console.log(JSON.stringify(changed,null,2));
