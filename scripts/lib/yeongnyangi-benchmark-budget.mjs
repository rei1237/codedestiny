import assert from 'node:assert/strict';

export const BENCHMARK_MODEL='gemini-2.5-flash';
export const BENCHMARK_MAX_CALLS=35;
export const BENCHMARK_MAX_USD=1.11;
export const BENCHMARK_INPUT_CAP=50000;
// Integer nano-USD: $0.30/M input and $2.50/M output (including thinking).
const reservationNano=outputTokens=>BENCHMARK_INPUT_CAP*300+outputTokens*2500;
export function benchmarkCallCaps(plan){
  assert.equal(plan.model,BENCHMARK_MODEL);
  assert.equal(plan.books.length,6);
  assert.deepEqual(plan.books.map(book=>book.domain).sort(),['astrology','saju','sukuyo','tarot','vedic','ziwei']);
  const caps=plan.books.flatMap(book=>{
    assert.equal(book.questions,8);assert.equal(book.chapters,5);
    assert.equal(book.providerOutputCaps.length,5);
    assert.equal(book.analysisCalls,book.domain==='tarot'?0:1);
    const rows=book.providerOutputCaps.map((outputTokens,index)=>({id:`${book.domain}:chapter:${index}`,outputTokens}));
    if(book.analysisCalls){assert.equal(book.analysisOutputCap,1024);rows.unshift({id:`${book.domain}:analysis`,outputTokens:1024});}
    return rows;
  });
  assert.equal(caps.length,BENCHMARK_MAX_CALLS);
  assert.ok(caps.every(cap=>Number.isSafeInteger(cap.outputTokens)&&cap.outputTokens>0));
  assert.ok(caps.reduce((sum,cap)=>sum+reservationNano(cap.outputTokens),0)<=Math.round(BENCHMARK_MAX_USD*1e9));
  return caps;
}

export class BenchmarkBudget {
  constructor(caps,persist){
    assert.ok(caps.length<=BENCHMARK_MAX_CALLS);
    assert.equal(new Set(caps.map(cap=>cap.id)).size,caps.length);
    this.caps=new Map(caps.map(cap=>[cap.id,cap.outputTokens]));
    this.persist=persist;
    this.state={reservedNanoUsd:0,tokenizerCalls:0,generationCalls:0,records:[]};
    this.active=false;
  }
  async run({id,outputTokens,requestHash,countTokens,generate}){
    assert.equal(this.active,false,'Sequential execution only');
    assert.ok(this.caps.has(id),'Unapproved call');
    assert.equal(outputTokens,this.caps.get(id),'Output allowance changed');
    assert.ok(!this.state.records.some(row=>row.id===id),'Spent call cannot be repeated');
    assert.match(requestHash,/^[a-f0-9]{64}$/);
    const charge=reservationNano(outputTokens);
    assert.ok(this.state.records.length<BENCHMARK_MAX_CALLS,'Call budget exhausted');
    assert.ok(this.state.reservedNanoUsd+charge<=Math.round(BENCHMARK_MAX_USD*1e9),'USD budget exhausted');
    this.active=true;
    const record={id,outputTokens,requestHash,reservedNanoUsd:charge,status:'reserved',reservedAt:new Date().toISOString()};
    this.state.reservedNanoUsd+=charge;this.state.records.push(record);
    try{
      // Durable reservation precedes even tokenizer I/O. Failures and timeouts
      // never release it; saving or replaying evidence cannot purchase a retry.
      await this.persist(structuredClone(this.state));
      this.state.tokenizerCalls++;record.status='counting';
      await this.persist(structuredClone(this.state));
      const countingStarted=Date.now();
      const counted=await countTokens();record.tokenizerElapsedMs=Date.now()-countingStarted;
      assert.ok(Number.isSafeInteger(counted)&&counted>0&&counted<=BENCHMARK_INPUT_CAP,'Invalid or excessive input token count');
      record.inputTokens=counted;record.status='generating';this.state.generationCalls++;
      await this.persist(structuredClone(this.state));
      record.generationStartedAt=new Date().toISOString();
      const started=Date.now();
      const result=await generate();record.generationElapsedMs=Date.now()-started;
      record.status='received';record.usage=result?.usageMetadata||null;
      await this.persist(structuredClone(this.state));
      return result;
    }catch(error){
      record.status='failed';
      if(record.generationStartedAt)record.generationElapsedMs=Date.now()-Date.parse(record.generationStartedAt);
      record.errorType=String(error?.name||'Error');
      await this.persist(structuredClone(this.state));
      throw error;
    }finally{this.active=false;}
  }
}
