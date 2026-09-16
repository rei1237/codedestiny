import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('native Yeongnyangi home entry includes its desktop and mobile artwork without SoulCat hosting',()=>{
 const html=readFileSync('index.html','utf8');
 const start=html.indexOf('<template id="cd-soulcat-navigation-template"');assert.ok(start>=0);
 const entry=html.slice(start,html.indexOf('</template>',start));
 assert.ok(!entry.includes('/_soulcat/'),'Independent worker asset dependency returned');
 const paths=[...new Set(entry.match(/\/assets\/yeongnyangi\/[a-zA-Z0-9_/.-]+/g))];
 assert.ok(paths.some(p=>p.endsWith('room-780.webp')));assert.ok(paths.some(p=>p.endsWith('room-1440.webp')));
 for(const path of paths)assert.ok(existsSync('public'+path),path);
});
