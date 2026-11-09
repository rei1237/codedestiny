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
const Header=new Function('require','useState','useEffect','useRef','styles','petSpriteMarkup','EXAMPLE_PET',viewCode+';return ProfileHeader;')(require,React.useState,React.useEffect,React.useRef,new Proxy({},{get:(_,key)=>String(key)}),petSpriteMarkup,null);
const stored={speciesId:'rabbit',name:'토끼',unique:false,coat:'wood',eggType:'moon',traits:{pattern:0,expression:1,accessory:1},appearance:{version:2,headwear:1,neckwear:2,prop:3,trim:4,charm:5,pattern:2}};
async function read(pet,fail=false){
 const calls=[];
 const reader=new Function('loadProfileCharacterPreview','authFetch','getApiUrl','hasClientAuthHint','findSpirit','spriteUrl',readCode+';return readPortrait;')(
  async()=>({character:{id:'animal-rabbit',name:'토끼',ganji:'을묘',element:'목'}}),async path=>{calls.push(path);return{ok:!(fail&&path.includes('/pet?')),json:async()=>({ok:true,equippedId:null,pet})};},path=>path,()=>false,()=>null,()=>'/existing-species-sprite.webp');
 return{portrait:await reader({id:'mongo-id',profileId:'saved-profile'}),calls};
}
function render(portrait){return renderToStaticMarkup(React.createElement(Header,{journey:{status:'ready',profile:{id:'saved-profile',name:'친구'},progress:null,portrait,portraitFailed:false,profileStatus:'ready',retry(){}}}));}
test('the compact home portrait renders the same stored pet DNA, not a shared species fallback',async()=>{
 const {portrait,calls}=await read(stored);assert.ok(calls.includes('/api/rpg/pet?profileId=saved-profile'));assert.deepEqual(portrait.pet,stored);
 const html=render(portrait);assert.ok(html.includes('pg-outfit-headwear'));assert.ok(html.includes('--pet-pattern:66.66666666666667%'));assert.ok(!html.includes('/existing-species-sprite.webp'));
});
test('the unique home portrait keeps the authored mascot and unhatched profiles show an egg',async()=>{
 const {portrait}=await read({...stored,speciesId:'yeongnyangi',name:'영냥이',unique:true,coat:'natural'});
 const html=render(portrait);assert.ok(html.includes('pg-pet--yeongnyangi'));assert.ok(!html.includes('pg-outfit'));
 assert.ok(render((await read(null)).portrait).includes('아직 부화하지 않은 달빛 알'));
});
test('a failed companion read reports failure rather than inventing a common duplicate portrait',async()=>{
 await assert.rejects(()=>read(null,true),/companion-unavailable/);
});
