import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {dispatchServiceBack} from '../service/native-back.mjs';

test('native back is consumed only when the mounted screen handles it',()=>{
 const dom=new JSDOM('');const target=dom.window;
 try{
  assert.equal(dispatchServiceBack(target),false);
  const handler=event=>event.preventDefault();target.addEventListener('code-destiny:toss-back',handler);
  assert.equal(dispatchServiceBack(target),true);
  target.removeEventListener('code-destiny:toss-back',handler);
  assert.equal(dispatchServiceBack(target),false);
 }finally{target.close();}
});

test('a nested screen handles back before its parent even when mounted later',()=>{
 const dom=new JSDOM('');const target=dom.window,seen=[];
 try{
  target.addEventListener('code-destiny:toss-back',event=>{if(!event.defaultPrevented)seen.push('parent');});
  target.addEventListener('code-destiny:toss-back',event=>{seen.push('child');event.preventDefault();},true);
  assert.equal(dispatchServiceBack(target),true);
  assert.deepEqual(seen,['child']);
 }finally{target.close();}
});

test('an open overlay consumes back before a nested narrative or confirmation',()=>{
 const dom=new JSDOM(''),seen=[];const target=dom.window;
 try{
  target.addEventListener('code-destiny:toss-overlay-back',event=>{seen.push('overlay');event.preventDefault();});
  target.addEventListener('code-destiny:toss-back',()=>seen.push('screen'),true);
  assert.equal(dispatchServiceBack(target),true);assert.deepEqual(seen,['overlay']);
 }finally{target.close();}
});
