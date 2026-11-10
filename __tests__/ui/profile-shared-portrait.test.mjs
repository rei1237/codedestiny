import { PET_SPECIES } from '../../js/core/profile-pet.mjs';
import { JSDOM } from 'jsdom';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { petSpriteMarkup } from '../../js/core/profile-pet-card.mjs';
const require=createRequire(import.meta.url);
const hookSource=readFileSync('app/components/daily-card/useDailyJourney.ts','utf8');
const cardSource=readFileSync('app/components/daily-card/DailyCard.tsx','utf8');
function functionOf(source,name){const ast=ts.createSourceFile('portrait.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,name+' exists');return node.getText(ast);}
const readCode=(await transform(functionOf(hookSource,'readPortrait'),{loader:'ts',format:'cjs'})).code;
const viewCode=(await transform(functionOf(cardSource,'ProfileHeader'),{loader:'tsx',format:'cjs',jsx:'automatic'})).code;
const Header=new Function('require','useState','useEffect','useRef','styles','petSpriteMarkup','PET_MANAGE_HREF','ArrowRight','loginHref',viewCode+';return ProfileHeader;')(require,React.useState,React.useEffect,React.useRef,new Proxy({},{get:(_,key)=>String(key)}),petSpriteMarkup,'/ggulggul/?action=dpOpenList&petEntry=my',()=>null,()=>'/login/');
const stored={speciesId:'rabbit',name:'토끼',unique:false,coat:'wood',eggType:'moon',traits:{pattern:0,expression:1,accessory:1},appearance:{version:2,headwear:1,neckwear:2,prop:3,trim:4,charm:5,pattern:2}};
async function read(pet,fail=false,profile={id:'mongo-id',profileId:'saved-profile'},data){
 const calls=[];
 const reader=new Function('loadProfileCharacterPreview','authFetch','getApiUrl','hasClientAuthHint','findSpirit','spriteUrl',readCode+';return readPortrait;')(
  async()=>({character:{id:'animal-rabbit',name:'토끼',ganji:'을묘',element:'목'}}),async (path,init)=>{calls.push({path,init});return{ok:!(fail&&path.includes('/pet?')),json:async()=>data??({ok:true,equippedId:null,pet})};},path=>path,()=>false,()=>null,()=>'/existing-species-sprite.webp');
 return{portrait:await reader(profile),calls};
}
function render(portrait,overrides={}){return renderToStaticMarkup(React.createElement(Header,{journey:{status:'ready',profile:{id:'saved-profile',name:'친구'},progress:null,portrait,portraitFailed:false,profileStatus:'ready',retry(){},...overrides}}));}
test('main reads saved profile pet with GET and renders identical My sprite markup',async()=>{
 for(const species of PET_SPECIES){
  const pet={...stored,speciesId:species.id,name:species.name,unique:species.id==='yeongnyangi',rare:['lion','giraffe','rhino'].includes(species.id),affection:75,fed:true,played:false};
  const {portrait,calls}=await read(pet);
  assert.deepEqual(portrait.pet,pet);assert.equal(calls.length,1);
  assert.equal(calls[0].path,'/api/rpg/pet?profileId=saved-profile');
  assert.equal(calls[0].init.method??'GET','GET');assert.equal(calls[0].init.body,undefined);
  const dom=new JSDOM(render(portrait)),expected=new JSDOM(petSpriteMarkup(pet));
  assert.equal(dom.window.document.querySelector('.pg-pet').outerHTML,expected.window.document.querySelector('.pg-pet').outerHTML);
  const state=dom.window.document.querySelector('[data-pet-affection]').dataset;
  assert.equal(state.petAffection,'75');assert.equal(state.petFed,'true');assert.equal(state.petPlayed,'false');
  assert.equal(dom.window.document.querySelector('a').getAttribute('href'),'/ggulggul/?action=dpOpenList&petEntry=my');
  dom.window.close();expected.window.close();
 }
 assert.equal(PET_SPECIES.length,16);
});
test('unhatched pet remains empty rather than showing an old animal',async()=>{
 const {portrait}=await read(null);assert.equal(portrait.pet,null);
 assert.match(render(portrait),/profileEgg/);assert.doesNotMatch(render(portrait),/pg-pet--|animal-pig/);
});
test('pet load failure rejects instead of inventing a pet',async()=>{await assert.rejects(read(null,true),/pet-unavailable/);});
test('fallback profile IDs are encoded and missing profiles fail closed',async()=>{
 const {calls}=await read(null,false,{id:'id / one'});
 assert.equal(calls[0].path,'/api/rpg/pet?profileId=id%20%2F%20one');
 await assert.rejects(read(null,false,{}),/profile-unavailable/);
});
test('degraded missing and rejected pet payloads fail closed',async()=>{
 for(const data of [{ok:false},{ok:true,degraded:true,pet:null},{ok:true}]) await assert.rejects(read(null,false,undefined,data),/pet-unavailable/);
});
test('guest loading and unavailable states hide stale stored companions',()=>{
 for(const overrides of [{status:'guest',profile:null},{status:'loading'},{profileStatus:'error'}]) assert.doesNotMatch(render({pet:stored,ganji:'test',element:'wood'},overrides),/pg-pet--|data-pet-affection/);
 assert.ok(hookSource.includes('if (status !== "ready") return;'));
 const failed=render(null,{portraitFailed:true});assert.match(failed,/portraitStatus/);assert.doesNotMatch(failed,/profileEgg/);
});
test('storage refresh tracks scoped profile IDs without subscribing to cache writes',async()=>{
 const ast=ts.createSourceFile('journey.ts',hookSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 let initializer;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='onStorage')initializer=node.initializer.getText(ast);ts.forEachChild(node,visit);}
 visit(ast);assert.ok(initializer);
 const {code}=await transform('const onStorage = '+initializer+';',{loader:'ts',format:'cjs'});
 let refreshes=0;
 const handler=new Function('onFocus',code+';return onStorage;')(()=>refreshes++);
 for(const key of ['cd:honey-refresh','code-destiny.activeProfileId','code-destiny.activeProfileId::account'])handler({key,oldValue:'before',newValue:'after'});
 assert.equal(refreshes,3);
 for(const key of ['code-destiny.activeProfileCache.v1::account','FORTUNE_APP_USER_PROFILES.meta::account',null])handler({key,oldValue:'before',newValue:'after'});
 handler({key:'code-destiny.activeProfileId::account',oldValue:'same',newValue:'same'});
 assert.equal(refreshes,3);
});