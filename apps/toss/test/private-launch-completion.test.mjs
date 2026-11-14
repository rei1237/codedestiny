import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {separateSecretHouseImages} from '../private-simulation/secret-house-document.mjs';
import {secretHouseDocument} from '../service/secret-house-loader.mjs';
import {privateSecretHouse} from '../private-simulation/secret-house.mjs';
import {readTossPublicSection} from '../../../worker/toss/public-section.js';
import {privateSukuyoTools} from '../private-simulation/sukuyo-tools.mjs';
import example from '../private-simulation/sukuyo-tools-examples.json' with {type:'json'};
import {createSimulationApi} from '../private-simulation/api.mjs';
import {productView} from './offline/yeongnyangi-contracts.mjs';
test('Secret House keeps identical original image bytes and sandbox document',async()=>{
 const source=await readFile(new URL('../../../public/secret-house_real.html',import.meta.url),'utf8');const original=secretHouseDocument(source),{html,images}=separateSecretHouseImages(source);
 assert.equal(images.length,5);let restored=html.replace("img-src 'self' data:",'img-src data:');
 for(const image of images)restored=restored.replaceAll('/'+image.fileName,'data:image/'+image.fileName.split('.').at(-1)+';base64,'+image.source.toString('base64'));
 assert.equal(restored,original);assert.match(html,/event.source!==parent/);
 const body={featureKey:'rpt_secretHouseEntryCard',house:{stem:'甲',history:[]}};
 const web=await readTossPublicSection(body,{});assert.deepEqual(await privateSecretHouse(body).json(),await web.json());
 assert.equal(privateSecretHouse({featureKey:'other'}).status,404);
});
test('Sukuyo examples preserve originals and reject unverified inputs',async()=>{
 for(const row of Object.values(example.basic)){assert.deepEqual(await privateSukuyoTools(row.input,true).json(),row.result);assert.equal(privateSukuyoTools({...row.input,birth:{...row.input.birth,date:{...row.input.birth.date,day:4}}},true).status,422);}
 for(const row of Object.values(example.tools)){assert.deepEqual(await privateSukuyoTools(row.input).json(),row.result);assert.equal(privateSukuyoTools({...row.input,birth:{...row.input.birth,date:'1990-02-04'}}).status,422);}
 assert.equal(privateSukuyoTools({featureKey:'sukuyo-past-life'}).status,404);
});
test('guest catalog is public but owned records remain authenticated; fish artwork contract is complete',async()=>{
 const data=new Map(),api=createSimulationApi({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},'A');
 for(const path of ['/catalog','/tarot-library/catalog'])assert.equal((await api(new Request('https://private.invalid/private-simulation-api'+path))).status,200);
 assert.equal((await api(new Request('https://private.invalid/private-simulation-api/library'))).status,401);
 const product=productView({id:'astrology_mackerel',approvedPriceKRW:1});assert.equal(product.reactionAsset,'/assets/yeongnyangi/fish/reaction-mackerel.webp');assert.equal(product.image,'/assets/yeongnyangi/fish/mackerel.webp');
});
