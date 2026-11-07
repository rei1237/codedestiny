import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TossNativeConsultation} from '../../../worker/toss/models.js';

test('relationship bootstrap declares its paid-order recovery index',()=>{
 const entry=TossNativeConsultation.schema.indexes().find(([,options])=>options.name==='toss_relationship_bootstrap_v1');
 assert.ok(entry);
 assert.deepEqual(entry[0],{nativeService:1,status:1,generationStartedAt:1,createdAt:1,recoveryNextAt:1});
 assert.deepEqual(entry[1].partialFilterExpression,{nativeService:'relationship',status:'paid'});
});
