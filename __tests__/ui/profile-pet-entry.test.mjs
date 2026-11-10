import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import {pawOffsets} from "../../js/core/profile-pet-anchors.mjs";
import {petSpriteMarkup} from "../../js/core/profile-pet-card.mjs";

test("garden access is consumed once after bottom My opens the profile",()=>{
  const dom=new JSDOM('<nav id="cdMobileBottomNav"><button data-nav-key="my" data-cd-sheet-open="cdAccountSheet">마이</button></nav><button id="header" data-cd-sheet-open="cdAccountSheet">계정</button><dialog data-cd-sheet id="cdAccountSheet"><button data-action="dpOpenList">프로필</button></dialog>',{url:"https://example.test/ggulggul/",runScripts:"outside-only"});
  const {window}=dom,doc=window.document;
  window.scrollTo=()=>{};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event("close"))};
  window.eval(readFileSync("js/core/shell-sheet.js","utf8"));
  doc.dispatchEvent(new window.Event("DOMContentLoaded"));
  const take=window.CodeDestinyShellSheet.takePetProfileEntry;
  assert.equal(take(),false);
  for(const [entry,expected] of [["#header",false],["[data-nav-key=my]",true],["#header",false]]){
    doc.querySelector(entry).click(); doc.querySelector("[data-action=dpOpenList]").click();
    assert.equal(take(),expected); assert.equal(take(),false);
  }
  window.close();
});

test("all sprite poses use the measured paw baseline, including wake and sleep",()=>{
  const pet={name:"영냥이",speciesId:"yeongnyangi",unique:true,coat:"natural",eggType:"moon",traits:{expression:0,pattern:0,accessory:0}};
  for(const poses of Object.values(pawOffsets))assert.equal(poses.length,16);
  for(const [action,row] of [["idle",0],["wake",0],["feed",1],["play",2],["sleep",3]]){
    const sprite=petSpriteMarkup(pet,action);
    for(const [frame,[x,y]] of pawOffsets.yeongnyangi.slice(row*4,row*4+4).entries())
      assert.ok(sprite.includes(`--paw-${frame}:${x}% ${y}%`));
  }
});

test('linked main entry is consumed once and never enables the embedded editor',()=>{
 const source=readFileSync('js/destiny-profile.js','utf8');
 const initialization=source.match(/var linkedPetProfileEntry = [^;]+;/)[0];
 const consume=source.match(/var fromMyProfile = [\s\S]*?linkedPetProfileEntry = false;/)[0];
 for(const [query,forest,fromMy,expected] of [['?petEntry=my',false,false,'my'],['?petEntry=my','select',false,''],['',false,true,'my'],['?petEntry=other',false,false,'']]){
  let my=fromMy;
  const window={location:{search:query},CodeDestinyShellSheet:{takePetProfileEntry:()=>{const result=my;my=false;return result;}}};
  const sheet={dataset:{}};
  const open=new Function('window','sheet','forestCardMode',initialization+';return function(){'+consume+';return sheet.dataset.petEntry;}')(window,sheet,forest);
  assert.equal(open(),expected);assert.equal(open(),'');
 }
});
