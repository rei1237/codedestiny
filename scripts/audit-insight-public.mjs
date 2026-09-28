// Read-only HTTP sample. Timing is one fetch, not mobile CWV or user analytics.
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.AUDIT_ORIGIN||'https://code-destiny.com';
const output='build-cache/share-insight';await mkdir(output,{recursive:true});
const paths=['/','/ggulggul/','/today/','/saju/','/ziwei/','/sukuyo/','/vedic/','/astrology/','/compatibility/','/insights/sukuyo/','/yeongnyangi/room/','/yeongnyangi/1000-won-fortune/','/yeongnyangi/fortune/','/points/',
 ...['en','ja','zh'].flatMap(locale=>['/','/saju/','/sukuyo/','/vedic/','/insights/sukuyo-basics-'+(locale==='ja'?'jp':locale)+'/'].map(path=>'/'+locale+path)), '/de-de/high-value/','/es-es/high-value/'];
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'=["\x27]([^"\x27]*)["\x27]','i'))?.[1]||'';
const data=[];
const robots=await fetch(origin+'/robots.txt').then(r=>r.text());
const sitemap=await fetch(origin+'/sitemap.xml').then(r=>r.text());
for(let offset=0;offset<paths.length;offset+=4){
 await Promise.all(paths.slice(offset,offset+4).map(async path=>{
  const start=performance.now();
  try{
   const response=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});const ttfbMs=Math.round(performance.now()-start),html=await response.text();
   const tags=html.match(/<(?:meta|link)\b[^>]*>/gi)||[];
   const meta=name=>tags.find(tag=>attr(tag,'name')===name||attr(tag,'property')===name);
   const links=tags.filter(t=>attr(t,'rel')==='alternate'&&attr(t,'hreflang'));
   const visible=html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
   data.push({path,status:response.status,url:response.url,ttfbMs,htmlBytes:Buffer.byteLength(html),
    title:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],description:attr(meta('description')||'','content'),
    canonical:attr(tags.find(t=>attr(t,'rel')==='canonical')||'','href'),robots:attr(meta('robots')||'','content'),xRobots:response.headers.get('x-robots-tag'),
    lang:html.match(/<html[^>]*lang="([^"]*)"/i)?.[1],hreflang:links.map(t=>({lang:attr(t,'hreflang'),href:attr(t,'href')})),
    h1:[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>m[1].replace(/<[^>]+>/g,'')),
    inSitemap:sitemap.includes(origin+path+'</loc>'),jsonLdBlocks:(html.match(/application\/ld\+json/g)||[]).length,
    ogImage:attr(meta('og:image')||'','content'),visibleChars:visible.length,hangulChars:(visible.match(/[가-힣]/g)||[]).length,
    serviceLinkCount:(html.match(/href=/g)||[]).length});
  }catch(error){data.push({path,error:error.message});}
 }));
}
data.sort((a,b)=>paths.indexOf(a.path)-paths.indexOf(b.path));
await writeFile(output+'/http-audit.json',JSON.stringify({measuredAt:new Date().toISOString(),origin,kind:'HTTP sample, not field CWV',robots,sitemapUrlCount:(sitemap.match(/<loc>/g)||[]).length,pages:data},null,2));
console.log(JSON.stringify(data.map(({path,status,canonical,hreflang,ttfbMs,h1,hangulChars,inSitemap})=>({path,status,canonical,hreflangCount:hreflang?.length,ttfbMs,h1,hangulChars,inSitemap})),null,2));
