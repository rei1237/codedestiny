import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('room restores all sixteen anchovy fortunes without a provider call',()=>{
  const categories=JSON.parse(read('worker/yeongnyangi/fortune/free/categories.json'));
  assert.equal(categories.length,16);
  assert.equal(new Set(categories.map(item=>item.id)).size,16);
  const calculator=read('worker/yeongnyangi/fortune/free/readings.ts');
  assert.doesNotMatch(calculator,/createProvider|\.generate\(/);
  const service=read('worker/yeongnyangi/free-service.ts');
  assert.doesNotMatch(service,/CodeDestinyProvider|GEMINI|LLM/);
});

test('main Yeongnyangi free CTA opens the native sixteen-fortune room',()=>{
  const shell=read('index.html');
  const entry=shell.match(/<div class="cd-soulcat-entry__actions">[\s\S]*?<\/div>/)?.[0]||'';
  assert.match(entry,/href="\/yeongnyangi\/room\/\?utm_source=code_destiny&utm_medium=referral&utm_campaign=yeongnyangi_home&utm_content=free#daily"/);
  assert.doesNotMatch(entry,/href="\/today\//);
});

test('room keeps original artwork and restores its purple selection surface',()=>{
  const room=read('app/yeongnyangi/_original/Room.tsx');
  const free=read('app/yeongnyangi/_components/FreeFortune.tsx');
  const css=read('app/yeongnyangi/_original/free-fortune.css');
  assert.match(room,/<FreeFortune\/>/);assert.match(room,/room-1440/);
  assert.match(free,/freeCategories\.map/);assert.match(free,/멸치 1마리 건네기/);
  assert.match(css,/#261834/);assert.match(css,/#7541ad/);assert.match(css,/#e9c78d/);
  for(const asset of ['anchovy.webp','reaction-anchovy.webp'])assert.ok(existsSync(`public/assets/yeongnyangi/fish/${asset}`),asset);
  assert.ok(existsSync('public/assets/yeongnyangi/original/expression-calm.webp'));
});
