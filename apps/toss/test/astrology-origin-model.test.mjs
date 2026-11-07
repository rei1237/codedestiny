import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {AstrologyAiConsultation} from '../../../worker/lib/models.js';
const base={id:'astro-offline',userId:'507f1f77bcf86cd799439011',idempotencyKey:'attempt-offline-123',inputHash:'input-hash',birthInfo:{birthDate:'1990-01-01'},topic:'진로',accessType:'paid'};
test('astrology stores a Toss origin while legacy web records retain their default',()=>{const toss=new AstrologyAiConsultation({...base,accessSource:'toss'}),web=new AstrologyAiConsultation(base);assert.equal(toss.validateSync(),undefined);assert.equal(toss.toObject().accessSource,'toss');assert.equal(web.validateSync(),undefined);assert.equal(web.toObject().accessSource,'');assert.ok(new AstrologyAiConsultation({...base,accessSource:'unknown'}).validateSync()?.errors.accessSource);});
