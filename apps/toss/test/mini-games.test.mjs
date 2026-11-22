import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import miniGamePlugin,{miniGameDocument} from '../canonical/mini-game-documents.mjs';
import {gameStorageKeys,miniGameRoutes} from '../canonical/mini-games.mjs';

test('the original nine cards have their own mini-app destinations',async()=>{
 const source=await readFile(new URL('../../../app/mini-games/games.ts',import.meta.url),'utf8');
 assert.deepEqual([...source.matchAll(/slug: "([a-z-]+)"/g)].map(m=>m[1]),Object.keys(miniGameRoutes));
 assert.equal(new Set(Object.values(miniGameRoutes)).size,9);
});
for(const slug of Object.keys(gameStorageKeys)){
 test('offline original '+slug+' has a closed frame and compiles without web scripts',async()=>{
  const document=await miniGameDocument(slug);
  assert.match(document,/connect-src 'none'/);assert.match(document,/img-src data:/);
  assert.doesNotMatch(document,/<script[^>]+\bsrc=|https:\/\/(?:cdnjs|cdn\.jsdelivr|translate\.google|assets\.code-destiny)/);
  if(slug!=='blood-type')assert.match(document,/data:image\/webp;base64,/);
  for(const match of document.matchAll(/<script(?:\s([^>]*))?>([\s\S]*?)<\/script>/g)){
   if(match[1]?.includes('application/ld+json'))continue;
   new vm.Script(match[2].replace('__TOSS_GAME_STATE__','{}'));
  }
 });
}

test('strict parent CSP loads each script in a separate opaque HTML document',async()=>{
 const plugin=miniGamePlugin(),assets=[];
 plugin.configResolved({command:'build'});
 const result=await plugin.load.call({addWatchFile(){},emitFile(asset){assets.push(asset);return 'game';}},'\0virtual:toss-mini-game/fortune-fish');
 assert.equal(result,'export default import.meta.ROLLUP_FILE_URL_game');assert.equal(assets[0].fileName,'__mini-games/fortune-fish.html');
 assert.match(assets[0].source,/JSON\.parse\(window\.name/);
 const shell=await readFile(new URL('../src/MiniGames.jsx',import.meta.url),'utf8');assert.match(shell,/sandbox="allow-scripts"/);assert.match(shell,/src=\{content\.source\}/);assert.doesNotMatch(shell,/srcDoc|allow-same-origin/);
});
