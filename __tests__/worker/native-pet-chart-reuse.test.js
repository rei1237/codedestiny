/** @jest-environment node */
import { jest } from '@jest/globals';

// One native pet read must run the deterministic chart once per frozen pet input,
// and the reused validation must return exactly the same contract as before.
let chartCalls=0,row,docs,verifyRuns;
const query=value=>({lean:async()=>structuredClone(value)});
beforeAll(async()=>{
 const petSaju=await import('../../worker/toss/pet-saju.js'),db=await import('../../worker/lib/db.js'),models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/toss/pet-saju.js',()=>({...petSaju,calculateTossPet:(...args)=>{chartCalls++;return petSaju.calculateTossPet(...args);}}));
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:{findOne:()=>query(docs[0]||null)}}));
 jest.unstable_mockModule('../../worker/toss/models.js',()=>({TossNativeConsultation:{findOne:()=>query(row)},TossIdentity:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/toss/native-consultation.js',()=>({assertNativeIntent:()=>{}}));
 jest.unstable_mockModule('../../worker/toss/native-tea.js',()=>({nativeIntentId:async()=>row._id,nativeOwnerFilter:()=>({}),prepareNativeConsultation:async()=>({}),verifiedIntent:async()=>row}));
 // The delivery engine calls verify more than once per read; mirror that here.
 jest.unstable_mockModule('../../worker/lib/paid-narrative-delivery.js',()=>({paidNarrativeExecutionKey:(...parts)=>parts.join(':'),
  runPaidNarrativeDelivery:async(_request,_env,_auth,_body,{verify})=>{for(let i=0;i<verifyRuns;i++)await verify(docs[0].metadata.paidNarrative.body,docs[0]);return Response.json({ok:true});}}));
});

const date='2026-09-15',requestId='0f0e0d0c-0b0a-4908-8706-050403020100';
const petA={name:'나비',species:'cat',birthDate:'2020-01-01',birthTimeUnknown:true,breed:'generic'};
const petB={...petA,name:'달이',birthDate:'2021-02-02'};
const inputs=[{requestId,kind:'report',pet:petA,date},{requestId,kind:'compat',petA,petB,date},{requestId,kind:'compat',petA,petB:petA,date}];

test('a shared chart set returns the identical contract and validates each input once',async()=>{
 const {tossPetPaidContract}=await import('../../worker/toss/pet-paid-contract.js');
 for(const input of inputs){
  chartCalls=0;const plain=await tossPetPaidContract(input,{stored:true});const plainCalls=chartCalls;
  chartCalls=0;const charts=new Set();
  const first=await tossPetPaidContract(input,{stored:true,charts}),second=await tossPetPaidContract(structuredClone(input),{stored:true,charts});
  expect(first).toEqual(plain);expect(second).toEqual(plain);
  expect(plainCalls).toBe(input.kind==='report'?1:2);
  expect(chartCalls).toBe(new Set([input.pet||input.petA,input.petB].filter(Boolean).map(p=>JSON.stringify(p))).size);
 }
});

test('invalid input is still refused when a valid entry with the same values is cached',async()=>{
 const {tossPetPaidContract}=await import('../../worker/toss/pet-paid-contract.js'),charts=new Set();
 await tossPetPaidContract(inputs[0],{stored:true,charts});
 await expect(tossPetPaidContract({...inputs[0],pet:{...petA,unexpected:undefined}},{stored:true,charts})).rejects.toMatchObject({status:400,code:'PET_INPUT_INVALID'});
 await expect(tossPetPaidContract({...inputs[0],date:'2026-09-16'},{stored:true,charts})).resolves.toBeTruthy();
});

test.each([['report',3],['compat',3],['report',0]])('native %s read runs the chart once per pet (verify x%i)',async(kind,runs)=>{
 const {readNativePet}=await import('../../worker/toss/native-pet-paid.js');
 const input=kind==='report'?inputs[0]:inputs[1];
 row={_id:'a'.repeat(64),nativeService:'pet',featureKey:kind==='report'?'pet-saju-ai-consultation':'pet-compatibility-ai',requestId,input};
 docs=runs?[{userId:'owner',executionKey:['owner',row.featureKey,requestId].join(':'),featureKey:row.featureKey,reportType:kind==='report'?'petSajuReport':'petCompatReport',metadata:{paidNarrative:{body:{...structuredClone(input),tossIntentId:row._id}}}}]:[];verifyRuns=runs;chartCalls=0;
 const response=await readNativePet({},{userId:'owner'},row._id);
 expect(response.status).toBe(runs?200:202);
 expect(chartCalls).toBe(kind==='report'?1:2);
});
