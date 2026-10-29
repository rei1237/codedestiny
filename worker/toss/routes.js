import {questionConversation} from '../yeongnyangi/question-followup.ts';
import {checkOrder,TossError,requireTossOrigin,verifiedUserKey,analyticsEvent} from './policy.js';
import {callbackAuthorized,identityId,hash} from './crypto.js';
import {createTossSession,requireTossSession,invalidateIdentity,disconnectIdentity} from './session.js';
import {APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,approvedProduct} from './catalog.js';
import {TossPurchase,TossSession} from './models.js';
import {lookupOrder} from './partner.js';
import {grantVerifiedOrder} from './grant.js';
import {purchaseStore,recordTossRefund} from './purchases.js';
import {ProfileCard,PaidExecutionRecord} from '../lib/models.js';
import {incrementRateLimit} from '../lib/rate-limit.js';
import {resolveStoredProduct} from '../yeongnyangi/payments/catalog.ts';
import {consultationService,consultationSelection,requestMatchesService} from './services.js';
import {LIBRARY_PAGE_SIZE,libraryFilter,libraryPage} from './library.js';
import {questionDecision,questionTopic,assertQuestionOrder} from '../yeongnyangi/fortune/ask/question-policy.ts';
import {prepareFortune,presentFortune,drawTarotSpread,experienceCheckFortune} from '../yeongnyangi/service.ts';
import {publicTarotSpread} from '../yeongnyangi/fortune/tarot/spread-v3.ts';
import {readRequest,resumeRequest} from '../yeongnyangi/repository.js';
import {enqueueConsultation} from '../yeongnyangi/queue.js';
import {canonicalProducts,canonicalSale,canonicalProfiles,prepareCanonicalFortune,drawCanonicalFortune,canonicalLibraryPage} from './canonical-yeongnyangi.js';
import {attachTarotLibraryInput,deliverTarotLibraryOrder,grantTarotLibraryOrder,tarotLibraryFlow,tarotLibraryProduct,tarotLibraryResult} from './tarot-library.js';

async function bodyOf(request) {
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new TossError('JSON_REQUIRED',415);
  const text=await request.text();
  if(text.length>12000)throw new TossError('BODY_TOO_LARGE',413);
  try{return JSON.parse(text);}catch{throw new TossError('JSON_INVALID');}
}
async function limit(env,subject,endpoint,max) {
  const state=await incrementRateLimit({env,subjectHash:await hash(subject),endpoint:`toss:${endpoint}`,windowMs:60000});
  if(state.count>max)throw new TossError('TOO_MANY_REQUESTS',429);
}
export async function handleTossRoutes(request,env) {
  const url=new URL(request.url);
  let path=url.pathname.slice('/api/toss'.length);
  const canonical=path.startsWith('/canonical/');
  const canonicalResult=path.match(/^\/canonical\/yeongnyangi\/requests\/([a-f0-9]{64})(\/(?:generate|activate|conversation))?$/);
  if(canonicalResult)path='/results/'+canonicalResult[1]+(canonicalResult[2]==='/conversation'?'/conversation':canonicalResult[2]?'/resume':'');
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try {
    if(path==='/callbacks/unlink') {
      if(!['GET','POST'].includes(request.method))throw new TossError('METHOD_NOT_ALLOWED',405);
      if(!await callbackAuthorized(request.headers.get('Authorization'),env.TOSS_CALLBACK_AUTHORIZATION))throw new TossError('CALLBACK_UNAUTHORIZED',401);
      const input=request.method==='GET'?Object.fromEntries(url.searchParams):await bodyOf(request);
      if(!['UNLINK','WITHDRAWAL_TERMS','WITHDRAWAL_TOSS'].includes(input.referrer))throw new TossError('CALLBACK_EVENT_INVALID');
      const key=verifiedUserKey(typeof input.userKey==='string'?Number(input.userKey):input.userKey);
      await invalidateIdentity(env,await identityId(env,key));
      return reply({ok:true});
    }
    headers['Access-Control-Allow-Origin']=requireTossOrigin(request.headers.get('Origin'));
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
    if(path==='/catalog'&&request.method==='GET')return reply({products:APPROVED_TOSS_PRODUCTS.map(item=>{
      const approved=approvedProduct(item.sku),product=resolveStoredProduct(approved.productId),service=consultationService(approved);
      return {id:consultationSelection(approved),productId:product.id,serviceId:service.id,name:`${service.name} ${product.name} ${product.fishName} 상담`,sku:item.sku,approvedPriceKRW:item.approvedPriceKRW,
        chapters:product.chapterCount,available:item.approved&&product.priceKRW===item.approvedPriceKRW};
    })});
    if(path==='/tarot-library/catalog'&&request.method==='GET')return reply({flows:APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS.map(item=>{
      const product=tarotLibraryProduct(item);
      return {id:product.flow.id,name:product.flow.name,sku:product.sku,featureKey:product.featureKey,approvedPriceKRW:product.approvedPriceKRW};
    })});
    // Explicit release gate: unavailable credentials, agreements or product approvals cannot become live sales.
    if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
    if(path==='/login'&&request.method==='POST') {
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','login',10);
      return reply(await createTossSession(env,await bodyOf(request)));
    }
    const auth=await requireTossSession(request,env);
    await limit(env,auth._id,'authenticated',120);
    if(path==='/canonical/auth/me'&&request.method==='GET')return reply({ok:true,authenticated:true,user:{id:auth.userId,_id:auth.userId,name:'토스 사용자',role:'user'}});
    if(path==='/canonical/yeongnyangi/products'&&request.method==='GET')return reply({products:canonicalProducts()});
    if(path==='/canonical/geocode'&&request.method==='GET'){
      await limit(env,auth._id,'geocode',10);
      const {geocodePlace}=await import('../lib/geocode.js');
      const result=await geocodePlace(url.searchParams.get('place'));
      return reply(result.data,result.status);
    }
    if(path==='/canonical/yeongnyangi/location'&&request.method==='POST'){
      await limit(env,auth._id,'location',10);
      const {resolveCurrentLocation}=await import('../yeongnyangi/fortune/question-sky.ts');
      return reply({ok:true,location:resolveCurrentLocation(await bodyOf(request))});
    }
    if(path==='/canonical/yeongnyangi/saju/experience-check'&&request.method==='POST'){
      await limit(env,auth._id,'experience-check',6);
      return reply({ok:true,...await experienceCheckFortune(env,auth.userId,await bodyOf(request))});
    }
    if(path==='/canonical/yeongnyangi/profiles'&&['GET','POST'].includes(request.method))return reply(await canonicalProfiles(auth,request.method==='POST'?await bodyOf(request):undefined));
    if(path==='/canonical/yeongnyangi/requests'&&request.method==='POST'){
      await limit(env,auth._id,'prepare',6);
      return reply(await prepareCanonicalFortune(env,auth,await bodyOf(request)));
    }
    if(path==='/canonical/yeongnyangi/requests'&&request.method==='GET'){
      const rows=await TossPurchase.find({...libraryFilter(auth,url.searchParams.get('cursor')),serviceId:'yeongnyangi',tarotFlowId:''}).sort({grantedAt:-1,_id:-1}).limit(LIBRARY_PAGE_SIZE+1).lean();
      return reply(await canonicalLibraryPage(rows,id=>readRequest(env,auth.userId,id)));
    }
    const canonicalDraw=path.match(/^\/canonical\/yeongnyangi\/requests\/([a-f0-9]{64})\/tarot-draw$/);
    if(canonicalDraw&&request.method==='POST'){
      const row=await readRequest(env,auth.userId,canonicalDraw[1]);
      if(!requestMatchesService(row,canonicalSale(row.productId)))throw new TossError('REQUEST_NOT_FOUND',404);
      return reply(await drawCanonicalFortune(env,auth,canonicalDraw[1],await bodyOf(request)));
    }
    if(path==='/session'&&request.method==='GET')return reply({authenticated:true,environment:auth.environment});
    if(path==='/logout'&&request.method==='POST') {await TossSession.deleteOne({_id:auth.sessionId});return reply({ok:true});}
    if(path==='/unlink'&&request.method==='POST')return reply(await disconnectIdentity(env,auth));
    if(path.startsWith('/daily/')){
      const daily=await import('./daily.js');
      if(path==='/daily/status'&&request.method==='GET')return reply(await daily.attendanceStatus(env,auth.userId));
      if(path==='/daily/attendance'&&request.method==='POST')return reply(await daily.attend(env,auth.userId));
      if(path==='/daily/unlock'&&request.method==='POST')return reply(await daily.unlockToday(env,auth.userId));
      if(path==='/daily/reading'&&request.method==='POST'){
        await limit(env,auth._id,'daily-reading',6);
        return reply(await daily.prepareTossDaily(env,auth,await bodyOf(request)));
      }
      if(path==='/daily/reading'&&request.method==='GET')return reply(await daily.getFreeReading(env,auth.userId,url.searchParams.get('category')));
      throw new TossError('NOT_FOUND',404);
    }
    if(path==='/manse/calculate'&&request.method==='POST') {
      await limit(env,auth._id,'manse',6);
      const [{calculateTossManse},{domains}]=await Promise.all([import('./manse.js'),import('../yeongnyangi/fortune/index.ts')]);
      return reply(await calculateTossManse(await bodyOf(request),domains.saju));
    }
    if(path==='/flower/match'&&request.method==='POST') {
      await limit(env,auth._id,'flower',6);
      const [{matchTossFlowers},{domains}]=await Promise.all([import('./flower.js'),import('../yeongnyangi/fortune/index.ts')]);
      return reply(await matchTossFlowers(await bodyOf(request),env,domains));
    }
    if(path==='/prepare'&&request.method==='POST') {
      await limit(env,auth._id,'prepare',6);
      const input=await bodyOf(request),product=approvedProduct(input.sku);
      const {validatePreparation}=await import('./preparation.js');
      const canonical=resolveStoredProduct(product.productId),service=consultationService(product);
      const tarot=canonical.domain==='tarot';
      const form=validatePreparation(input,{birthRequired:!tarot});
      const decision=questionDecision(input.questionDecision);
      assertQuestionOrder(canonical,decision,form.question);
      if(!tarot&&decision.target==='pair'&&!form.partnerBirth)throw new TossError('PARTNER_REQUIRED');
      if(decision.target!=='pair'&&form.partnerBirth)throw new TossError('PARTNER_NOT_SUPPORTED');
      // Immutable targets, separate roles even when two people share birth details.
      async function saveTarget(birth,role) {
        const profileId=`toss-${role}-${await hash(JSON.stringify(birth))}`;
        await ProfileCard.updateOne({userId:auth.ownerId,profileId},{$setOnInsert:{userId:auth.ownerId,profileId,
          name:role==='partner'?'상대방':'풀이 대상',gender:birth.gender,birth:birth.date,location:birth.location}},{upsert:true});
        return profileId;
      }
      const profileId=tarot?'tarot-question':await saveTarget(form.birth,'self');
      const partnerProfileId=form.partnerBirth?await saveTarget(form.partnerBirth,'partner'):undefined;
      const row=await prepareFortune(env,auth.userId,{productId:product.productId,profileId,question:form.question,
        ...(service.persona?{domain:canonical.domain,fishId:canonical.fishId}:{}),
        questionDecision:decision,consultationKind:decision.target==='pair'?'compatibility':'ask',topicId:questionTopic(decision.category),
        ...(tarot?{tarotSpreadId:input.tarotSpreadId,tarotInputs:input.tarotInputs}:{timeUnknown:form.birth.date.timeUnknown}),...(partnerProfileId?{partnerProfileId,partnerTimeUnknown:form.partnerBirth.date.timeUnknown}:{}),
        consultationAttemptId:form.attemptId,locale:'ko',timezone:'Asia/Seoul',voiceStyle:'honorific'}, {persona:service.persona});
      return reply({id:String(row._id),productId:row.productId,amountKRW:row.amountKRW,state:row.state,tarotSpread:publicTarotSpread(row.snapshot),
        manifest:row.snapshot.manifest.map(({id,title,ordinal})=>({id,title,ordinal}))});
    }
    const drawMatch=path.match(/^\/prepared\/([a-f0-9]{64})\/draw$/);
    if(drawMatch&&request.method==='POST') {
      await limit(env,auth._id,'tarot-draw',6);
      const input=await bodyOf(request),product=approvedProduct(input.sku);
      const row=await readRequest(env,auth.userId,drawMatch[1]);
      if(!requestMatchesService(row,product)||resolveStoredProduct(product.productId).domain!=='tarot')throw new TossError('REQUEST_NOT_FOUND',404);
      const drawn=await drawTarotSpread(env,auth.userId,drawMatch[1],{method:input.method,picks:input.picks});
      return reply({id:String(drawn._id),state:drawn.state,tarotSpread:publicTarotSpread(drawn.snapshot)});
    }
    if((path==='/orders/grant'||path==='/orders/restore')&&request.method==='POST') {
      const input=await bodyOf(request);
      const tarotProduct=path==='/orders/restore'&&APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS.find(item=>item.sku===input.sku);
      const product=tarotProduct?tarotLibraryProduct(tarotProduct):approvedProduct(input.sku);
      const order=await lookupOrder(env,auth.userKey,input.orderId);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      if(tarotProduct)return reply(await grantTarotLibraryOrder({store:purchaseStore,auth,order,product}));
      if(input.requestId!==undefined&&!/^[a-f0-9]{64}$/.test(input.requestId))throw new TossError('REQUEST_ID_INVALID');
      return reply(await grantVerifiedOrder({store:purchaseStore,auth,order,product,requestId:input.requestId||null,
        enqueue:async id=>enqueueConsultation(env,await readRequest(env,auth.userId,id))}));
    }
    if(path==='/tarot-library/orders/grant'&&request.method==='POST') {
      const input=await bodyOf(request),product=tarotLibraryProduct(APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS.find(item=>item.sku===input.sku));
      const order=await lookupOrder(env,auth.userKey,input.orderId);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      const receipt=await grantTarotLibraryOrder({store:purchaseStore,auth,order,product,input:input.input});
      return reply(receipt);
    }
    if(path==='/library'&&request.method==='GET') {
      const rows=await TossPurchase.find(libraryFilter(auth,url.searchParams.get('cursor'))).sort({grantedAt:-1,_id:-1}).limit(LIBRARY_PAGE_SIZE+1).lean();
      return reply(await libraryPage(rows,id=>readRequest(env,auth.userId,id),row=>PaidExecutionRecord.findOne({orderId:row._id,userId:String(auth.ownerId)}).lean()));
    }
    const tarotResultMatch=path.match(/^\/tarot-library\/results\/([a-f0-9-]{36})$/);
    if(tarotResultMatch&&request.method==='POST') {
      const orderId=tarotResultMatch[1],purchase=await TossPurchase.findOne({_id:orderId,identityId:auth._id,environment:auth.environment,tarotFlowId:{$type:'string',$ne:''}}).lean();
      if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
      const order=await lookupOrder(env,auth.userKey,orderId);
      if(order.sku!==purchase.sku||order.orderId!==orderId)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      checkOrder(order,{orderId,sku:purchase.sku});
      const input=await bodyOf(request);
      if(input.input!==undefined)await attachTarotLibraryInput({store:purchaseStore,auth,orderId,flowId:purchase.tarotFlowId,input:input.input});
      return reply(await deliverTarotLibraryOrder({store:purchaseStore,auth,orderId,flowId:purchase.tarotFlowId,env}));
    }
    if(tarotResultMatch&&request.method==='GET') {
      const orderId=tarotResultMatch[1],purchase=await TossPurchase.findOne({_id:orderId,identityId:auth._id,environment:auth.environment,tarotFlowId:{$type:'string',$ne:''}}).lean();
      if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
      const order=await lookupOrder(env,auth.userKey,orderId);
      if(order.sku!==purchase.sku||order.orderId!==orderId)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      if(!['PURCHASED','PAYMENT_COMPLETED'].includes(order.status))throw new TossError('ORDER_NOT_PAID',409);
      const execution=await PaidExecutionRecord.findOne({orderId,userId:String(auth.ownerId)}).lean();
      return reply(tarotLibraryResult(execution,tarotLibraryFlow(purchase.tarotFlowId)),execution?.status==='completed'?200:202);
    }
    const resultMatch=path.match(/^\/results\/([a-f0-9]{64})(\/(?:resume|conversation))?$/);
    if(resultMatch&&request.method===(resultMatch[2]?'POST':'GET')) {
      const purchase=await TossPurchase.findOne({identityId:auth._id,requestId:resultMatch[1],environment:auth.environment}).lean();
      if(!purchase&&canonical&&request.method==='GET'){
        const pending=await readRequest(env,auth.userId,resultMatch[1]);
        if(!pending.persona&&!pending.accessMethod&&!pending.paymentId&&['CREATED','AWAITING_DRAW'].includes(pending.state))return reply({fortune:presentFortune(pending)});
      }
      if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
      if(canonical&&consultationService(purchase).id!=='yeongnyangi')throw new TossError('RESULT_NOT_FOUND',404);
      const owned=await readRequest(env,auth.userId,resultMatch[1]);
      if(!requestMatchesService(owned,purchase))throw new TossError('RESULT_NOT_FOUND',404);
      const order=await lookupOrder(env,auth.userKey,purchase._id);
      if(order.sku!==purchase.sku||order.orderId!==purchase._id)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      if(!['PURCHASED','PAYMENT_COMPLETED'].includes(order.status))throw new TossError('ORDER_NOT_PAID',409);
      if(canonical&&resultMatch[2]==='/resume'){
        // Keep the original held-chapter recovery and queue acknowledgement. The
        // Toss grant must already fund this row; never fall back to web payment.
        if(owned.accessMethod!=='TOSS_IAP')throw new TossError('RESULT_NOT_FOUND',404);
        const {retryFortune}=await import('../yeongnyangi/retry.js');
        const row=await retryFortune(env,auth.userId,resultMatch[1]);
        return reply({fortune:presentFortune(row)},row.state==='COMPLETED'?200:202);
      }
      if(resultMatch[2]==='/conversation'){
        await limit(env,auth._id,'followup',4);
        const fortune=presentFortune(await questionConversation(env,auth.userId,resultMatch[1],await bodyOf(request)));
        return reply(canonical?{fortune}:{...fortune,serviceId:consultationService(purchase).id});
      }
      const row=resultMatch[2]?await resumeRequest(env,auth.userId,resultMatch[1]):await readRequest(env,auth.userId,resultMatch[1]);
      if(resultMatch[2])await enqueueConsultation(env,row);
      return reply(canonical?{fortune:presentFortune(row)}:{...presentFortune(row),serviceId:consultationService(purchase).id});
    }
    if(path==='/events'&&request.method==='POST') {
      const input=await bodyOf(request);
      const event=analyticsEvent(input.event,{...input.fields,environment:auth.environment==='SANDBOX'?'sandbox':'toss'});
      // Analytics has no free-form fields, identity, birth data, question, result, or order ID.
      if(env.TOSS_ANALYTICS)env.TOSS_ANALYTICS.writeDataPoint({blobs:[JSON.stringify(event)]});
      return reply({ok:true});
    }
    throw new TossError('NOT_FOUND',404);
  } catch(error) {
    const known=error instanceof TossError;
    const dailyErrors={DAILY_PASS_REQUIRED:403,ANCHOVY_REQUIRED:409,FREE_READING_INPUT_FROZEN:409,FREE_READING_PENDING:409,INVALID_CATEGORY:400,INVALID_INPUT:400,FREE_PROFILE_REQUIRED:400,HORARY_FREE_PROMPT_REQUIRED:400};
    if(path.startsWith('/daily/')&&Object.hasOwn(dailyErrors,error?.code))return reply({error:error.code,errorId:crypto.randomUUID()},dailyErrors[error.code]);
    const inputErrors=['QUESTION_SCOPE_REQUIRED','QUESTION_SCOPE_UNSUPPORTED','QUESTION_PRODUCT_MISMATCH','PARTNER_REQUIRED','PARTNER_NOT_SUPPORTED','BIRTH_TIME_REQUIRED','PROFILE_REQUIRED','INVALID_BIRTH','QUESTION_FOLLOWUP_BUSY','QUESTION_FOLLOWUP_SUPPORT','FOLLOWUP_NOT_AVAILABLE','FOLLOWUP_INPUT_INVALID','QUESTION_CONVERSATION_CLOSED'];
    if(inputErrors.includes(error?.code))return reply({error:error.code,errorId:crypto.randomUUID()},400);
    // Engine messages are not echoed; request IDs are random and contain no personal data.
    return reply({error:known?error.code:'REQUEST_FAILED',errorId:crypto.randomUUID()},known?error.status:503);
  }
}
