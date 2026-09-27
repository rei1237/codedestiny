import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('Yeongnyangi home entry keeps its original artwork and background without SoulCat hosting',()=>{
 const html=readFileSync('index.html','utf8');
 const start=html.indexOf('<template id="cd-soulcat-navigation-template"');assert.ok(start>=0);
 const entry=html.slice(start,html.indexOf('</template>',start));
 assert.ok(!entry.includes('/_soulcat/'),'Independent worker asset dependency returned');
 assert.doesNotMatch(entry,/<style>/);
 const css=readFileSync('styles/saju-reading.css','utf8');
 const paths=[...new Set((entry+css).match(/\/assets\/yeongnyangi\/[a-zA-Z0-9_/.-]+\.webp/g))];
 for(const name of ['hero-800.webp','room-780.webp','room-1440.webp','mackerel.webp'])assert.ok(paths.some(p=>p.endsWith(name)),name);
 for(const path of paths)assert.ok(existsSync('public'+path),path);
});
test('Yeongnyangi entry stylesheet carries a content cache key so immutable caching cannot pin old banner CSS',()=>{
 // /styles/*.css 는 1년 immutable 이다. 무버전 링크면 새 마크업이 옛 CSS 와 만나 배너가 깨진다.
 for(const file of ['index.html','public/ggulggul/index.html'])assert.match(readFileSync(file,'utf8'),/href="\/styles\/saju-reading\.css\?v=build-[0-9a-f]{12}"/,file);
});
