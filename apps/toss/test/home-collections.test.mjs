import test from 'node:test';
import assert from 'node:assert/strict';
import {directory, fortuneCollections, directoryDestination, searchDirectory} from '../src/home-directory.ts';

test('each fortune destination belongs to exactly one explicit collection with no omitted original entry',()=>{
 const originals=directory.find(group=>group.kind==='fortune').entries.map(directoryDestination);
 const classified=fortuneCollections.flatMap(group=>group.destinations);
 assert.equal(classified.length,new Set(classified).size);assert.deepEqual(classified.toSorted(),originals.toSorted());
 assert.ok(fortuneCollections.every(group=>group.destinations.length<=12));
});
test('all original catalogue entries remain globally searchable regardless of display collection',()=>{
 for(const group of directory)for(const item of group.entries){
  const found=searchDirectory(item.title).flatMap(row=>row.entries).map(directoryDestination);
  assert.ok(found.includes(directoryDestination(item)),item.title);
 }
});
