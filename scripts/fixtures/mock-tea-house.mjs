import { prepareTeaDraw, confirmTeaDraw, readTeaDraw } from '../../worker/lib/tea-tarot-draw.js';
import { canonicalTeaSaju } from '../../worker/lib/tea-saju-facts.js';
import { buildSukuyoFromMoonLongitude } from '../../worker/lib/sukuyo-coordinate.js';
import { relationFromForwardDistance } from '../../worker/lib/sukuyo-relation-core.js';

// Only imported by the network-isolated development server. No database or provider.
export function createTeaMock() {
  const drafts = new Map(), results = new Map();
  const collection = {
    async findOne(q) { const value = drafts.get(q._id); return value?.owner === q.owner ? structuredClone(value) : null; },
    async updateOne(q, update) {
      const row = drafts.get(q._id);
      if (!row && update.$setOnInsert) drafts.set(q._id, structuredClone(update.$setOnInsert));
      else if (row && (!q.status || q.status === row.status)) Object.assign(row, structuredClone(update.$set));
    },
  };
  return async function teaMock(route, body, owner, send) {
    if (!route.includes('/api/fortune-tea-house/')) return false;
    if (!owner) { send(401, { ok:false, reason:'LOGIN_REQUIRED' }); return true; }
    try {
      if (route.endsWith('/tarot/prepare')) send(200,{ok:true,draft:await prepareTeaDraw(collection,owner,body)});
      else if (route.endsWith('/tarot/draw')) send(200,{ok:true,draft:await confirmTeaDraw(collection,owner,body)});
      else if (route.endsWith('/ensure-access')) send(200,{ok:true,accessDecision:{allowed:true,reason:'MOCK_EXISTING_ENTITLEMENT'}});
      else if (route.endsWith('/pending')) send(200,{ok:true,pending:false});
      else if (route.endsWith('/honey-drops')) send(200,{ok:true,honeyDrops:{authenticated:true,balance:0,totalEarned:0,totalSpent:0,unlocked:false}});
      else if (route==='GET /api/fortune-tea-house/results') send(200,{ok:true,items:[...results.values()].filter(r=>r.owner===owner).map(r=>({resultId:r.result.resultId,questionSummary:r.result.questionSummary,consultationMode:r.result.consultationMode,createdAt:r.result.createdAt}))});
      else if (route.startsWith('GET /api/fortune-tea-house/results/')) {
        const row=results.get(route.split('/').pop());
        send(row?.owner===owner?200:404,row?.owner===owner?{ok:true,result:row.result}:{ok:false,reason:'RESULT_NOT_FOUND'});
      } else if (route.endsWith('/consult')) {
        const id=body.attemptId;
        if(results.get(id)?.owner===owner){send(200,{ok:true,result:results.get(id).result,cached:true});return true;}
        const result=structuredClone(body.draftResult);
        if(!result)throw Object.assign(new Error('MOCK_DRAFT_REQUIRED'),{status:422});
        if(body.consultationMode==='tarot'&&body.consultationVersion==='tea-v2') {
          const draw=await readTeaDraw(collection,owner,body);
          result.tarotSpreadCards=draw.cards.map(c=>({...c,reading:'개발용 예시입니다. 카드 위치와 방향의 저장·복구만 검증합니다.'}));
          result.tarot={...draw.cards[0],reading:'개발용 예시입니다. 카드 해석의 실제 생성 품질은 검증하지 않았습니다.'};
          result.tarotSnapshot={version:draw.version,spread:draw.spread,draw:draw.draw};
        }
        const explanation='[개발용 예시] 저장된 근거와 질문을 연결하는 상담 본문이 들어갈 자리입니다. 실 LLM의 해석 품질은 이 예시로 평가할 수 없습니다.';
        result.yeoniReading={intro:explanation,main:explanation,advice:'확인된 사실과 추측을 나누고, 내가 선택할 수 있는 다음 행동을 정리합니다.',caution:'미래나 상대의 속마음을 확정하지 않습니다.'};
        result.synthesis={title:'질문과 근거를 연결하는 해석',summary:explanation};
        result.emotionAnalysis=[];result.choiceSimulation=[];result.cardInteractions=[];result.luckyKeywords=[];
        result.closingLine='[개발용 예시] 상담을 다시 열어도 처음 저장한 카드와 근거는 유지됩니다.';
        result.actionPrescription=result.yeoniReading.advice;
        if(body.consultationMode==='saju')result.saju=canonicalTeaSaju(body,result.saju);
        if(body.consultationMode==='sukuyo'){
          // Fixed longitudes exercise the real directional core, not birth-date astronomy.
          const moons=[buildSukuyoFromMoonLongitude(0),buildSukuyoFromMoonLongitude(40)];
          const relation=relationFromForwardDistance(3);
          const person=(key,i)=>({...body.sukuyo[key],name:body.sukuyo[key].name||(i===0?'나':'상대'),sukuyoName:moons[i].nameKo,sukuyoHanja:moons[i].nameHan,keywords:moons[i].keywords});
          result.sukuyoCompatibility={available:true,title:'[개발용 고정 표본] 두 사람의 관계',
            summary:'생일 계산 결과가 아닌 화면 검증용 고정 숙입니다. 관계 방향은 공통 코어로 산출합니다.',
            user:person('user',0),partner:person('partner',1),relationshipType:body.sukuyo.relationshipType,
            relationType:relation.relationType,relationTypeHan:relation.relationTypeHan,distanceLabel:'근거리',forwardDistance:3,reverseDistance:24,direction:'나 → 상대 3칸 / 상대 → 나 24칸',
            relationDetail:{typeAToB:relation.aRole,typeBToA:relation.bRole,userToPartnerMeaning:'나 → 상대: '+relation.aRole,partnerToUserMeaning:'상대 → 나: '+relation.bRole},
            strengths:['[개발용 예시] 서로 다른 반응 속도를 대화로 확인해요.'],cautions:['분류만으로 악연이나 파국을 단정하지 않아요.'],
            adviceKeywords:['확인','경계 존중'],calculationSource:'mock-fixed-longitudes-not-birth-calculation'};
        }
        Object.assign(result,{resultId:id,questionSummary:body.question,consultationVersion:'tea-v2',resultFormatVersion:'tea-result-v2',createdAt:new Date().toISOString(),sessionTitle:'[개발용 예시] 연이의 상담 기록',mock:true});
        result.yeoniReading.intro='이 내용은 화면과 복구 흐름을 확인하는 개발용 예시입니다. 실제 LLM 상담이나 결제 결과가 아닙니다.';
        results.set(id,{owner,result});send(200,{ok:true,result});
      } else send(501,{ok:false,error:'MOCK_TEA_ROUTE_NOT_IMPLEMENTED'});
    } catch(e) { send(e.status||500,{ok:false,code:e.code||e.message,message:'개발용 상담 대역에서 요청을 확인하지 못했습니다.'}); }
    return true;
  };
}
