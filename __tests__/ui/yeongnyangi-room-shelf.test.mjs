import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const load=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');
const room=load('../../app/yeongnyangi/_home/Room.tsx');
const chat=load('../../app/yeongnyangi/_home/RoomInteractions.tsx');
const footer=load('../../app/yeongnyangi/_home/ServiceNavigation.tsx');
const links=load('../../app/yeongnyangi/_home/service-links.ts');
const readPage=load('../../app/yeongnyangi/room/page.tsx');
const dock=load('../../app/yeongnyangi/_home/YeongnyangiBottomDock.tsx');

test('room shelf provides one story opener and links to the existing free sections',()=>{
 assert.equal((room.match(/onClick=\{openStory\}/g)||[]).length,1);
 assert.match(room,/aria-haspopup="dialog"/);
 assert.match(room,/href:'#sorting-hat'/);
 assert.match(room,/href:'#daily'/);
 assert.match(room,/href:'#daily-tarot'/);
 assert.match(room,/<SortingHat\/>[\s\S]+<FreeFortune\/>[\s\S]+<DailyTarotCard\/>/);
 assert.match(room,/멸치 3마리/);
 assert.match(room,/location\.hash==='#story'/);
 assert.match(room,/opener\.current\?\?document\.getElementById/);
});

test('casual conversation is local, readable and repeatable, with no spending or API call',()=>{
 assert.match(chat,/id="room-chat"/);
 assert.match(chat,/aria-live="polite" aria-atomic="true"/);
 assert.match(chat,/scene\.turn%current\.lines\.length/);
 for (const label of ['찻잔 건네기','고등어 보여주기','창밖 같이 보기','모자에 말 걸기']) assert.ok(chat.includes(label),label);
 assert.doesNotMatch(chat,/fortuneApi|authFetch|localStorage|fetch\(/);
});

test('room is a dedicated dock destination, and the footer keeps only one brand link',()=>{
 assert.match(readPage,/<YeongnyangiBottomDock active="room"/);
 assert.match(dock,/text: "영냥이의 방", href: "\/yeongnyangi\/room\/"/);
 assert.equal((links.match(/href:'\/ggulggul\/'/g)||[]).length,1);
 assert.doesNotMatch(footer,/href=\{ggulggul\}|꿀꿀운세 바로가기/);
 assert.match(footer,/운세보는 고양이 영냥이/);
});
