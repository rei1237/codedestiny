import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('ggulggul home leaves the Yeongnyangi entry to the root card II',()=>{
 // 2026-10-17 "직관성": 꿀꿀 홈은 대표 상담만 앞세운다. 영냥이는 루트 / 의 두 번째 카드가 입구다.
 const html=readFileSync('index.html','utf8');
 assert.doesNotMatch(html,/class="cd-soulcat-entry"|data-yeongnyangi-price=/);
 assert.match(readFileSync('app/page.js','utf8'),/numeral: "II"[^}]*href: YEONGNYANGI.path/);
});
test('Yeongnyangi entry stylesheet carries a content cache key so immutable caching cannot pin old banner CSS',()=>{
 // /styles/*.css 는 1년 immutable 이다. 무버전 링크면 새 마크업이 옛 CSS 와 만나 배너가 깨진다.
 for(const file of ['index.html','public/ggulggul/index.html'])assert.match(readFileSync(file,'utf8'),/href="\/styles\/saju-reading\.css\?v=build-[0-9a-f]{12}"/,file);
});
