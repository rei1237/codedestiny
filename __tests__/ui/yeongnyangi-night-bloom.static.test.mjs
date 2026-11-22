import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const load=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');
const motion=load('../../app/yeongnyangi/_components/NightBloomMotion.tsx');
const css=load('../../app/yeongnyangi/_components/NightBloomMotion.module.css');
const hero=load('../../app/yeongnyangi/_components/NightHero.tsx');
const room=load('../../app/yeongnyangi/_home/Room.tsx');

test('night bloom motion only renders when the playback gate and master flag allow it',()=>{
 assert.match(motion,/useSpritePlaybackGate<HTMLSpanElement>\(\{ enabled: MASTER_MOTION_ENABLED \}\)/);
 assert.match(motion,/\{on \? \(/);
 assert.match(motion,/aria-hidden="true"/);
});

test('night bloom keyframes animate only transform and opacity, and reduced motion hides the layer',()=>{
 const frames=[...css.matchAll(/@keyframes\s+\w+\s*\{([\s\S]*?)\n\}/g)].map((m)=>m[1]);
 assert.ok(frames.length>=2);
 for (const body of frames) {
  const props=[...body.matchAll(/([a-z-]+)\s*:/g)].map((m)=>m[1]);
  assert.ok(props.length>0);
  for (const prop of props) assert.ok(['transform','opacity'].includes(prop),prop);
 }
 assert.match(css,/@media \(prefers-reduced-motion: reduce\) \{\s*\.root \{ display: none; \}/);
});

test('landing hero and room place the decorative bloom layers',()=>{
 for (const src of [hero,room]) {
  assert.match(src,/<NightBloomMotion className=/);
  assert.match(src,/aria-hidden="true"><span className=[^>]*data-yn-bloom="lotus"/);
 }
});
