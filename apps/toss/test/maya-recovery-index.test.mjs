import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TossNativeConsultation} from '../../../worker/toss/models.js';

test('Maya prepared-input recovery has a bounded owner and cursor index',()=>{
 const entry=TossNativeConsultation.schema.indexes().find(([,options])=>options.name==='toss_maya_prepared_recovery_v1');
 assert.ok(entry);assert.deepEqual(entry[0],{identityId:1,ownerId:1,environment:1,sku:1,approvedPriceKRW:1,createdAt:-1,_id:-1});
 assert.deepEqual(entry[1].partialFilterExpression,{nativeService:'maya',status:'prepared'});
});
