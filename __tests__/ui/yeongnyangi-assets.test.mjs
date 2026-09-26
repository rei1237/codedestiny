import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('compact Yeongnyangi entry uses a small local image without heavy background artwork',()=>{
 const html=readFileSync('index.html','utf8');
 const start=html.indexOf('<template id="cd-soulcat-navigation-template"');assert.ok(start>=0);
 const entry=html.slice(start,html.indexOf('</template>',start));
 assert.ok(!entry.includes('/_soulcat/'),'Independent worker asset dependency returned');
 const paths=[...new Set(entry.match(/\/icons\/yeongnyangi-[a-zA-Z0-9_.-]+/g))];
 assert.ok(paths.some(p=>p.endsWith('yeongnyangi-96.webp')));
 assert.doesNotMatch(entry,/room-1440|room-780|hero-800|<style>/);
 for(const path of paths)assert.ok(existsSync('public'+path),path);
});
