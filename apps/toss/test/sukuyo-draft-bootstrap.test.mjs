import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSukuyoDraft,restoreSukuyoDraft} from '../service/sukuyo-draft-bootstrap.mjs';
const key='cd_toss_sukuyo_draft',now=Date.now();
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),clear:()=>values.clear()};}
test('only the same verified account restores both people after authentication cleanup',()=>{const s=storage();s.setItem(key,JSON.stringify({owner:'owner-a',at:now,personA:{birthDate:'1990-01-02'},personB:{birthDate:'1992-03-04'}}));const draft=captureSukuyoDraft(s,now);s.clear();restoreSukuyoDraft(s,draft,{user:{id:'owner-b'},now});assert.equal(s.getItem(key),null);restoreSukuyoDraft(s,draft,{user:{id:'owner-a'},now});assert.equal(JSON.parse(s.getItem(key)).personB.birthDate,'1992-03-04');});
test('expired, malformed and guest forms are discarded and newer data is not overwritten',()=>{const s=storage();for(const value of ['{',JSON.stringify({owner:'guest',at:now,personA:{},personB:{}}),JSON.stringify({owner:'a',at:now-86400000,personA:{},personB:{}})]){s.setItem(key,value);assert.equal(captureSukuyoDraft(s,now),null);}const older={owner:'a',at:now,personA:{name:'old'},personB:{}};s.setItem(key,JSON.stringify({owner:'a',at:now,personA:{name:'new'},personB:{}}));restoreSukuyoDraft(s,older,{user:{id:'a'},now});assert.equal(JSON.parse(s.getItem(key)).personA.name,'new');});
