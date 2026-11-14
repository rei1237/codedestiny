import {CHAT_PRODUCT_IDS} from '../../lib/fortune/chat-products.js';
import {checkedConsultationInput,consultationSafetyMessages} from './consultation-safety.js';
import {questionConversation} from '../yeongnyangi/question-followup.ts';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {checkOrder,TossError,requireTossOrigin,verifiedUserKey,analyticsEvent} from './policy.js';
import {callbackAuthorized,identityId,hash} from './crypto.js';
import {createTossSession,requireTossSession,invalidateIdentity,disconnectIdentity} from './session.js';
import {APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,APPROVED_TOSS_NATIVE_PRODUCTS,approvedProduct,assertUniqueApprovedSaleSkus} from './catalog.js';
import {isReviewSale} from './review-products.js';
import {TossPurchase,TossSession} from './models.js';
import {lookupOrder} from './partner.js';
import {grantVerifiedOrder} from './grant.js';
import {purchaseStore,recordTossRefund} from './purchases.js';
import {ProfileCard,PaidExecutionRecord} from '../lib/models.js';
import {incrementRateLimit} from '../lib/rate-limit.js';
import {resolveStoredProduct} from '../yeongnyangi/payments/catalog.ts';
import {consultationService,consultationSelection,requestMatchesService,requestMatchesPurchase,tossFortuneAccessIssue} from './services.js';
import {LIBRARY_PAGE_SIZE,libraryFilter,libraryPage} from './library.js';
import {questionDecision,questionTopic,assertQuestionOrder} from '../yeongnyangi/fortune/ask/question-policy.ts';
import {prepareFortune,presentFortune,drawTarotSpread,experienceCheckFortune} from '../yeongnyangi/service.ts';
import {publicTarotSpread} from '../yeongnyangi/fortune/tarot/spread-v3.ts';
import {readRequest,resumeRequest} from '../yeongnyangi/repository.js';
import {enqueueConsultation} from '../yeongnyangi/queue.js';
import {canonicalProducts,canonicalSale,canonicalProfiles,prepareCanonicalFortune,drawCanonicalFortune,canonicalLibraryPage} from './canonical-yeongnyangi.js';
import {forwardServiceResponse} from './service-response.js';
import {freeTarotReading,attachTarotLibraryInput,deliverTarotLibraryOrder,grantTarotLibraryOrder,tarotLibraryFlow,tarotLibraryProduct,tarotLibraryResult} from './tarot-library.js';

async function verifyLibraryOrder(env,auth,purchase){
  if(purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
  const order=await lookupOrder(env,auth.userKey,purchase._id);
  if(order.orderId!==purchase._id||order.sku!==purchase.sku)throw new TossError('ORDER_MISMATCH',403);
  if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
  checkOrder(order,{orderId:purchase._id,sku:purchase.sku});
}

async function readNativeLibraryItem(env,auth,row){
  if(row.nativeService==='palm')return (await import('./native-palm.js')).palmLibraryItem(env,auth,row);
  if(row.nativeService==='human-design')return (await import('./native-human-design.js')).nativeHumanDesignLibraryItem(env,auth,row);
  if(row.nativeService==='codex')return (await import('./native-codex.js')).codexLibraryItem(env,auth,row);
  if(row.nativeService==='naming')return (await import('./native-naming.js')).namingLibraryItem(env,auth,row);
  if(['totem-basic','totem-deep'].includes(row.nativeService))return (await import('./native-totem.js')).totemFor(row.featureKey).libraryItem(env,auth,row);
  if(row.nativeService==='geomancy')return (await import('./native-geomancy.js')).geomancyLibraryItem(env,auth,row);
  if(['guardian','sibyl'].includes(row.nativeService))return (await import('./birth-readings.js')).birthLibraryItem(env,auth,row);
  if(row.nativeService==='saju-compat')return (await import('./native-saju-compat.js')).compatLibraryItem(env,auth,row);
  if(row.nativeService==='dream')return (await import('./native-dream.js')).dreamLibraryItem(env,auth,row);
  if(row.nativeService==='heukwol')return (await import('./native-heukwol.js')).heukwolLibraryItem(env,auth,row);
  if(row.nativeService==='ziwei-deep')return (await import('./native-ziwei-deep.js')).ziweiDeepLibraryItem(env,auth,row);
  if(row.nativeService==='compass')return (await import('./native-compass.js')).compassLibraryItem(env,auth,row);
  if(row.nativeService==='yoga')return (await import('./native-yoga.js')).nativeYogaLibraryItem(env,auth,row);
  if(row.nativeService==='nakshatra')return (await import('./native-nakshatra.js')).nakshatraLibraryItem(env,auth,row);
  return row.nativeService==='pet'?(await import('./native-pet-paid.js')).nativePetLibraryItem(env,auth,row):row.nativeService==='relationship'?(await import('./native-relationship.js')).nativeRelationshipLibraryItem(env,auth,row):row.nativeService==='sukuyo'?(await import('./native-sukuyo.js')).nativeSukuyoLibraryItem(env,auth,row):row.nativeService==='maya'?(await import('./native-maya.js')).nativeMayaLibraryItem(env,auth,row):row.nativeService==='karma'?(await import('./native-karma.js')).nativeKarmaLibraryItem(env,auth,row):row.nativeService==='new-year'?(await import('./native-new-year.js')).nativeNewYearLibraryItem(env,auth,row):row.nativeService==='ziwei'?(await import('./native-ziwei.js')).nativeZiweiLibraryItem(env,auth,row):row.nativeService==='vedic'?(await import('./native-vedic.js')).nativeVedicLibraryItem(env,auth,row):row.nativeService==='astrology'?(await import('./native-astrology.js')).nativeAstrologyLibraryItem(env,auth,row):row.nativeService==='love-secret'?(await import('./native-love-secret.js')).nativeLoveSecretLibraryItem(env,auth,row):row.nativeService==='life-book'?(await import('./native-life-book.js')).nativeLifeBookLibraryItem(env,auth,row):row.nativeService==='fusion'?(await import('./native-fusion.js')).nativeFusionLibraryItem(env,auth,row):row.nativeService==='neo'?(await import('./native-neo.js')).nativeNeoLibraryItem(env,auth,row):(await import('./native-tea.js')).nativeTeaLibraryItem(env,auth,row);
}

async function letterEnabled(persona='yeoni'){
  const {approvedLetterSale}=await import('./letter.js');
  return CHAT_PRODUCT_IDS.some(id=>{
    const [,domain,fish]=id.split('_');
    try{approvedLetterSale(domain,APPROVED_TOSS_PRODUCTS,persona,fish);return true;}catch{return false;}
  });
}

function currentTarotSale(sku){
  const item=APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS.find(product=>product.sku===sku);
  if(item&&isFreeFortuneFeatureKey(item.featureKey))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return item;
}

async function bodyOf(request,maxLength=12000) {
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new TossError('JSON_REQUIRED',415);
  const text=await request.text();
  if(text.length>maxLength)throw new TossError('BODY_TOO_LARGE',413);
  try{return JSON.parse(text);}catch{throw new TossError('JSON_INVALID');}
}
async function limit(env,subject,endpoint,max,windowMs=60000) {
  const state=await incrementRateLimit({env,subjectHash:await hash(subject),endpoint:`toss:${endpoint}`,windowMs});
  if(state.count>max)throw new TossError('TOO_MANY_REQUESTS',429);
}
export async function handleTossRoutes(request,env) {
  const url=new URL(request.url);
  let path=url.pathname.slice('/api/toss'.length);
  const canonical=path.startsWith('/canonical/');
  const canonicalResult=path.match(/^\/canonical\/yeongnyangi\/requests\/([a-f0-9]{64})(\/(?:generate|activate|conversation|follow-up))?$/);
  if(canonicalResult)path='/results/'+canonicalResult[1]+(canonicalResult[2]==='/conversation'?'/conversation':canonicalResult[2]==='/follow-up'?'/follow-up':canonicalResult[2]?'/resume':'');
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
    if((path==='/catalog'||path==='/tarot-library/catalog')&&request.method==='GET')assertUniqueApprovedSaleSkus();
    if(path==='/catalog'&&request.method==='GET')return reply({products:APPROVED_TOSS_PRODUCTS.filter(item=>isReviewSale(item.productId,item.serviceId)||(['yeoni','neo'].includes(item.serviceId)&&CHAT_PRODUCT_IDS.includes(item.productId))).map(item=>{
      const approved=approvedProduct(item.sku),product=resolveStoredProduct(approved.productId),service=consultationService(approved);
      return {id:consultationSelection(approved),productId:product.id,serviceId:service.id,name:`${service.name} ${product.name} ${product.fishName} 상담`,sku:item.sku,approvedPriceKRW:item.approvedPriceKRW,
        chapters:product.chapterCount,available:item.approved===true};
    })});
    if(path==='/tarot-library/catalog'&&request.method==='GET')return reply({flows:APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS.filter(item=>!isFreeFortuneFeatureKey(item.featureKey)).map(item=>{
      const product=tarotLibraryProduct(item);
      return {id:product.flow.id,name:product.flow.name,sku:product.sku,featureKey:product.featureKey,approvedPriceKRW:product.approvedPriceKRW};
    })});
    if(path==='/pet-saju/catalog'&&request.method==='GET') {
      const {tossPetCatalog}=await import('./pet-saju.js');
      return reply(tossPetCatalog());
    }
    if(path==='/pet-saju/blueprint'&&request.method==='POST') {
      const {allowPetBlueprint}=await import('../routes/pet-saju.js');
      if(!allowPetBlueprint(request))throw new TossError('RATE_LIMITED',429);
      const {calculateTossPet}=await import('./pet-saju.js');
      return reply(calculateTossPet(await bodyOf(request)));
    }
    if(path==='/astro/section'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','astro-section',24);
      const {readTossAstroSection}=await import('./astro-section.js');
      return forwardServiceResponse(await readTossAstroSection(await bodyOf(request),env),headers);
    }
    if(path==='/astro/chart'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','astro-chart',6);
      const {readTossAstroChart}=await import('./astro-chart.js');
      return forwardServiceResponse(await readTossAstroChart(await bodyOf(request),env),headers);
    }
    if(path==='/sukuyo/basic'&&request.method==='POST') {
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','sukuyo-basic',6);
      const {calculateTossSukuyoBasic}=await import('./sukuyo-basic.js');
      return reply(await calculateTossSukuyoBasic(await bodyOf(request),env));
    }
    if(path==='/sukuyo/tools'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','sukuyo-tools',12);
      const {readTossSukuyoTool}=await import('./sukuyo-tools.js');
      return forwardServiceResponse(await readTossSukuyoTool(await bodyOf(request),env),headers);
    }
    if(path==='/vedic/reading'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','vedic-reading',6);
      const {tossVedicReading}=await import('./vedic-reading.js');
      return reply(await tossVedicReading(await bodyOf(request),env,{requestUrl:'https://code-destiny.com/api/toss/vedic/reading'}));
    }
    if(path==='/charts/vedic'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','basic-sky-chart',6);
      const {basicSkyChart}=await import('./basic-sky-chart.js');
      return reply(await basicSkyChart('vedic',await bodyOf(request),env,{requestUrl:'https://code-destiny.com/api/toss/charts'}));
    }
    if(path==='/manse/calculate'&&request.method==='POST') {
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','manse',15);
      const [{calculateTossManse},{domains}]=await Promise.all([import('./manse.js'),import('../yeongnyangi/fortune/index.ts')]);
      return reply(await calculateTossManse(await bodyOf(request),domains.saju));
    }
    if(path==='/canonical/ziwei-island/blueprint'&&request.method==='POST'){
      const {readTossIsland}=await import('./island.js');
      return forwardServiceResponse(await readTossIsland(await bodyOf(request),env,request.headers.get('CF-Connecting-IP')),headers);
    }
    if(path==='/canonical/sibyl/preview'&&request.method==='POST'){
      const {handleSibylRoutes}=await import('../routes/sibyl.js');
      const {profile,year}=await bodyOf(request);
      const req=new Request('https://internal.invalid/api/sibyl/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,year})});
      return forwardServiceResponse(await handleSibylRoutes(req,env),headers);
    }
    if(path==='/canonical/saju/section'&&request.method==='POST'){
      const {readTossPublicSection}=await import('./public-section.js');
      return forwardServiceResponse(await readTossPublicSection(await bodyOf(request),env),headers);
    }
    if(path==='/canonical/yeongnyangi/products'&&request.method==='GET')return reply({products:canonicalProducts()});
    if(request.method==='POST'&&['/canonical/yeongnyangi/free/horary','/canonical/yeongnyangi/location'].includes(path)){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown',path,15);
      const input=await bodyOf(request);
      if(path.endsWith('/location')){
        const {resolveCurrentLocation}=await import('../yeongnyangi/fortune/question-sky.ts');
        return reply({ok:true,location:resolveCurrentLocation(input)});
      }
      const {prepareHoraryPrompt}=await import('../yeongnyangi/fortune/free/horary.ts');
      return reply({ok:true,result:await prepareHoraryPrompt(env,input)});
    }
    if(path==='/canonical/compass/moon'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown',path,20);
      const moment=await bodyOf(request);
      if(!Number.isInteger(moment?.year)||moment.year<1900||moment.year>2100||!Number.isInteger(moment.month)||moment.month<1||moment.month>12||!Number.isInteger(moment.day)||moment.day<1||moment.day>31)throw new TossError('INVALID_INPUT',400);
      const {calculateSukuyoForMoment}=await import('../lib/sukuyo-astronomy.js');
      return reply(await calculateSukuyoForMoment(env,moment,{requestUrl:request.url}));
    }
    if(request.method==='POST'&&['/canonical/compass/calendar','/canonical/compass/narrate'].includes(path)){
      const calendar=path.endsWith('/calendar');
      if(calendar)await limit(env,request.headers.get('CF-Connecting-IP')||'unknown',path,40);
      const target=new URL(calendar?'/api/kasi/calendar':'/api/destiny-compass/narrate',request.url);
      const forwarded=new Request(target,{method:'POST',headers:{'Content-Type':'application/json',
        'CF-Connecting-IP':request.headers.get('CF-Connecting-IP')||'unknown'},body:JSON.stringify(await bodyOf(request)),signal:request.signal});
      const handler=calendar?(await import('../routes/kasi.js')).handleKasiRoutes:(await import('../routes/destiny-compass.js')).handleDestinyCompassRoutes;
      return forwardServiceResponse(await handler(forwarded,env),headers);
    }
    if(path==='/nakshatra/today'&&request.method==='GET'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown',path,20);
      const {resolveTodayMoon}=await import('../routes/nakshatra.js');
      const response=await resolveTodayMoon(env,url.searchParams,{requestUrl:request.url});
      return reply(await response.json(),response.status);
    }
    if(path==='/nakshatra/resolve'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown',path,10);
      const {resolveNatal}=await import('../routes/nakshatra.js');
      const response=await resolveNatal(env,await bodyOf(request),{requestUrl:request.url});
      return reply(await response.json(),response.status);
    }
    if(path==='/canonical/naming-prompt/basis'&&request.method==='POST'){
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown',path,15);
      const basis=new Request('https://internal.invalid/api/naming-prompt/basis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(await bodyOf(request))});
      return forwardServiceResponse(await (await import('../routes/naming-prompt.js')).handleNamingPromptRoutes(basis,env),headers);
    }
    if(path==='/tarot-library/free'&&request.method==='POST'){
      const {flowId,input}=await bodyOf(request);
      return reply(await freeTarotReading(flowId,input));
    }
    // Explicit release gate: unavailable credentials, agreements or product approvals cannot become live sales.
    if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
    if(path==='/login'&&request.method==='POST') {
      await limit(env,request.headers.get('CF-Connecting-IP')||'unknown','login',10);
      return reply(await createTossSession(env,await bodyOf(request)));
    }
    const auth=await requireTossSession(request,env);
    await limit(env,auth._id,'authenticated',120);
    if(path.startsWith('/canonical/rpg/')){
      const {readOwnedQuestProgress,completeOwnedQuest,adoptOwnedQuestProgress}=await import('../routes/rpg.js');
      if(path==='/canonical/rpg/progress'&&request.method==='GET')return reply(await readOwnedQuestProgress(env,auth.userId));
      if(path==='/canonical/rpg/quest'&&request.method==='POST')return forwardServiceResponse(await completeOwnedQuest(env,auth.userId,(await bodyOf(request)).questId),headers);
      if(path==='/canonical/rpg/adopt'&&request.method==='POST')return forwardServiceResponse(await adoptOwnedQuestProgress(env,auth.userId,await bodyOf(request)),headers);
    }
    if(path==='/canonical/fortune-chat/consultations/status'&&request.method==='GET')return reply({ok:true,enabled:await letterEnabled()});
    if(path==='/canonical/fortune-chat/consultations'&&request.method==='GET'){
      const persona=url.searchParams.get('persona');
      if(!['yeoni','neo'].includes(persona))throw new TossError('INVALID_PERSONA',400);
      const productIds=CHAT_PRODUCT_IDS;
      const rows=await TossPurchase.find({...libraryFilter(auth,url.searchParams.get('cursor')),serviceId:persona,nativeService:{$in:['',null]},productId:{$in:productIds}}).sort({grantedAt:-1,_id:-1}).limit(LIBRARY_PAGE_SIZE+1).lean();
      const {letterLibraryPage}=await import('./letter-library.js');
      return reply({...await letterLibraryPage(rows,id=>readRequest(env,auth.userId,id),row=>verifyLibraryOrder(env,auth,row)),enabled:await letterEnabled(persona)});
    }
    if(path==='/canonical/fortune-chat/consultations'&&request.method==='POST'){
      assertUniqueApprovedSaleSkus();
      await limit(env,auth._id,'letter-prepare',6);
      return reply(await (await import('./letter.js')).prepareTossLetter(env,auth,checkedConsultationInput(await bodyOf(request))),201);
    }
    if(path==='/canonical/fortune-chat/consultations/recover'&&request.method==='POST'){
      await limit(env,auth._id,'letter-recovery-prepare',6);
      const input=await bodyOf(request);
      return reply(await (await import('./letter.js')).prepareRecoveredTossLetter(env,auth,input.orderId,checkedConsultationInput(input.consultation)),201);
    }
    const letterRecovery=path.match(/^\/canonical\/fortune-chat\/recovery\/([a-f0-9-]{36})(?:\/draft\/([a-f0-9]{64}))?$/);
    const recoveredDraw=path.match(/^\/canonical\/fortune-chat\/recovery\/([a-f0-9-]{36})\/draft\/([a-f0-9]{64})\/draw$/);
    if(recoveredDraw&&request.method==='POST'){
      const {readRecoveringTossLetter}=await import('./letter.js');
      await limit(env,auth._id,'letter-recovered-draw',6);
      const read=()=>readRecoveringTossLetter(env,auth,recoveredDraw[1],recoveredDraw[2]);
      const before=await read();
      if(!before.consultation.productId.startsWith('chat_tarot_')||before.consultation.paid||!['CREATED','AWAITING_DRAW'].includes(before.consultation.state))throw new TossError('REQUEST_NOT_FOUND',404);
      const body=await bodyOf(request);await drawTarotSpread(env,auth.userId,recoveredDraw[2],body.auto===true?{auto:true}:{picks:body.picks});
      return reply(await read());
    }
    if(letterRecovery&&request.method==='GET'){
      const letter=await import('./letter.js');
      return reply(letterRecovery[2]?await letter.readRecoveringTossLetter(env,auth,letterRecovery[1],letterRecovery[2]):await letter.recoverableLetterOrder(env,auth,letterRecovery[1]));
    }
    const letterMatch=path.match(/^\/canonical\/fortune-chat\/consultations\/([a-f0-9]{64})(\/(?:generate|draw|conversation(?:\/continue)?))?$/);
    if(letterMatch&&request.method===(letterMatch[2]?'POST':'GET')){
      const {readTossLetter}=await import('./letter.js');
      if(!letterMatch[2])return reply(await readTossLetter(env,auth,letterMatch[1]));
      await limit(env,auth._id,'letter-'+letterMatch[2].slice(1),6);
      if(letterMatch[2].startsWith('/conversation')){
        const before=await readTossLetter(env,auth,letterMatch[1],{requirePaid:true});
        if(!before.consultation.conversation?.ready)throw new TossError('QUESTION_CONVERSATION_UNAVAILABLE',409);
        const input=checkedConsultationInput(await bodyOf(request));
        await questionConversation(env,auth.userId,letterMatch[1],letterMatch[2].endsWith('/continue')?{...input,action:'continue'}:input);
        return reply(await readTossLetter(env,auth,letterMatch[1],{requirePaid:true}));
      }
      if(letterMatch[2]==='/draw'){
        const before=await readTossLetter(env,auth,letterMatch[1]);
        if((!CHAT_PRODUCT_IDS.includes(before.consultation.productId)||before.consultation.productId.split('_')[1]!=='tarot')||before.consultation.paid)throw new TossError('REQUEST_NOT_FOUND',404);
        const input=await bodyOf(request);await drawTarotSpread(env,auth.userId,letterMatch[1],input.auto===true?{auto:true}:{method:input.method,picks:input.picks});
        return reply(await readTossLetter(env,auth,letterMatch[1]));
      }
      await bodyOf(request);await readTossLetter(env,auth,letterMatch[1],{requirePaid:true});
      const {retryFortune}=await import('../yeongnyangi/retry.js');await retryFortune(env,auth.userId,letterMatch[1]);
      return reply(await readTossLetter(env,auth,letterMatch[1],{requirePaid:true}));
    }
    if(path==='/canonical/records'&&request.method==='GET'){
      const rows=await TossPurchase.find({...libraryFilter(auth,url.searchParams.get('cursor')),$and:[{$or:[{serviceId:{$in:['yeoni','neo']}},{tarotFlowId:{$type:'string',$gt:''}},{nativeService:{$type:'string',$gt:''}}]}]}).sort({grantedAt:-1,_id:-1}).limit(LIBRARY_PAGE_SIZE+1).lean();
      const {unifiedRecordsPage}=await import('./unified-records.js');
      return reply(await unifiedRecordsPage(rows,id=>readRequest(env,auth.userId,id),row=>PaidExecutionRecord.findOne({orderId:row._id,userId:String(auth.ownerId)}).lean(),
        row=>readNativeLibraryItem(env,auth,row),row=>verifyLibraryOrder(env,auth,row),{group:url.searchParams.get('group')||'all',query:(url.searchParams.get('q')||'').slice(0,160),source:url.searchParams.get('source')||''}));
    }
    if(path==='/native/catalog'&&request.method==='GET'){
      const {nativeTeaCatalog}=await import('./native-tea.js');
      return reply({products:nativeTeaCatalog()});
    }
    if(path==='/native/tea/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-tea-prepare',6);
      const {prepareNativeTea}=await import('./native-tea.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeTea(env,auth,input.input,input.orderId));
    }
    if(path==='/native/neo/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-neo-prepare',6);
      const {prepareNativeNeo}=await import('./native-neo.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeNeo(env,auth,input.input,input.orderId));
    }
    if(path==='/native/fusion/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-fusion-prepare',6);
      const {prepareNativeFusion}=await import('./native-fusion.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeFusion(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/fusion-fortune/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-fusion',30);
      const {handleNativeFusion}=await import('./native-fusion.js');
      return forwardServiceResponse(await handleNativeFusion(request,env,auth,path.slice('/canonical/fusion-fortune'.length)),headers);
    }
    if(path==='/native/life-book/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-life-book-prepare',6);
      const {prepareNativeLifeBook}=await import('./native-life-book.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeLifeBook(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/life-book-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-life-book',30);
      const {handleNativeLifeBook}=await import('./native-life-book.js');
      return forwardServiceResponse(await handleNativeLifeBook(request,env,auth,path.slice('/canonical/life-book-ai'.length)),headers);
    }
    if(path==='/native/love-secret/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-love-secret-prepare',6);
      const {prepareNativeLoveSecret}=await import('./native-love-secret.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeLoveSecret(env,auth,input.input,input.orderId));
    }
    if(path==='/native/relationship/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-relationship-prepare',6);
      const {prepareNativeRelationship}=await import('./native-relationship.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeRelationship(env,auth,input.input,input.orderId));
    }
    if(path==='/native/pet/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-pet-prepare',6);
      const {prepareNativePet}=await import('./native-pet-paid.js');
      const input=await bodyOf(request);
      return reply(await prepareNativePet(env,auth,input.input,input.orderId));
    }
    const petResult=path.match(/^\/native\/pet\/intents\/([a-f0-9]{64})\/(result|generate)$/);
    if(petResult&&request.method===(petResult[2]==='generate'?'POST':'GET')){
      if(petResult[2]==='generate'){
        await limit(env,auth._id,'native-pet-generate',30);
        const input=await bodyOf(request);
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new TossError('PET_INPUT_INVALID',400);
      }
      const {readNativePet}=await import('./native-pet-paid.js');
      return forwardServiceResponse(await readNativePet(env,auth,petResult[1],{generate:petResult[2]==='generate'}),headers);
    }
    if(path.startsWith('/canonical/relationship-boundary-test/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-relationship',30);
      const {handleNativeRelationship}=await import('./native-relationship.js');
      return forwardServiceResponse(await handleNativeRelationship(request,env,auth,path.slice('/canonical/relationship-boundary-test'.length)),headers);
    }
    if(path.startsWith('/canonical/love-secret-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-love-secret',30);
      const {handleNativeLoveSecret}=await import('./native-love-secret.js');
      return forwardServiceResponse(await handleNativeLoveSecret(request,env,auth,path.slice('/canonical/love-secret-ai'.length)),headers);
    }
    if(path==='/native/astrology/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-astrology-prepare',6);
      const {prepareNativeAstrology}=await import('./native-astrology.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeAstrology(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/astrology-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-astrology',30);
      const {handleNativeAstrology}=await import('./native-astrology.js');
      return forwardServiceResponse(await handleNativeAstrology(request,env,auth,path.slice('/canonical/astrology-ai'.length)),headers);
    }
    if(path==='/native/ziwei-deep/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-ziwei-deep-prepare',6);
      const {input,orderId}=await bodyOf(request);
      const {prepareZiweiDeep}=await import('./native-ziwei-deep.js');
      return reply(await prepareZiweiDeep(env,auth,input,orderId));
    }
    const ziweiDeepResult=path.match(/^\/native\/ziwei-deep\/results\/([a-f0-9]{64})$/);
    if(ziweiDeepResult&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-ziwei-deep-generate',30);
      const {readNativeZiweiDeep}=await import('./native-ziwei-deep.js');
      return forwardServiceResponse(await readNativeZiweiDeep(env,auth,ziweiDeepResult[1],request.method==='POST'),headers);
    }
    if(path==='/native/compass/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-compass-prepare',6);
      const {input,orderId}=await bodyOf(request,64000);
      const {prepareCompass}=await import('./native-compass.js');
      return reply(await prepareCompass(env,auth,input,orderId));
    }
    const compassResult=path.match(/^\/native\/compass\/results\/([a-f0-9]{64})$/);
    if(compassResult&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-compass-generate',30);
      const {readNativeCompass}=await import('./native-compass.js');
      return forwardServiceResponse(await readNativeCompass(env,auth,compassResult[1],request.method==='POST'),headers);
    }
    if(path==='/native/yoga/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-yoga-prepare',6);
      const {input,orderId}=await bodyOf(request);
      const {prepareYoga}=await import('./native-yoga.js');
      return reply(await prepareYoga(env,auth,input,orderId));
    }
    const yogaResult=path.match(/^\/native\/yoga\/results\/([a-f0-9]{64})$/);
    if(yogaResult&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-yoga-generate',30);
      const {readNativeYoga}=await import('./native-yoga.js');
      return forwardServiceResponse(await readNativeYoga(env,auth,yogaResult[1],request.method==='POST'),headers);
    }
    if(path==='/native/nakshatra/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-nakshatra-prepare',6);
      const {input,orderId}=await bodyOf(request);
      const {prepareNakshatra}=await import('./native-nakshatra.js');
      return reply(await prepareNakshatra(env,auth,input,orderId));
    }
    const nakshatraResult=path.match(/^\/native\/nakshatra\/results\/([a-f0-9]{64})$/);
    if(nakshatraResult&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-nakshatra-generate',30);
      const {nakshatraWave}=await import('./native-nakshatra.js');
      return reply(await nakshatraWave(env,auth,nakshatraResult[1],request.method==='POST',request.url));
    }
    if(path==='/native/vedic/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-vedic-prepare',6);
      const {prepareNativeVedic}=await import('./native-vedic.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeVedic(env,auth,input.input,input.orderId));
    }
    if(path==='/native/sukuyo/recovery/drafts'&&request.method==='POST'){
      await limit(env,auth._id,'native-sukuyo-recovery',20);
      const {listNativeSukuyoRecovery}=await import('./native-sukuyo-recovery.js');
      const input=await bodyOf(request);
      return reply(await listNativeSukuyoRecovery(env,auth,input.orderId,input.cursor,verifyLibraryOrder));
    }
    if(path==='/native/sukuyo/recovery/attach'&&request.method==='POST'){
      await limit(env,auth._id,'native-sukuyo-recovery',20);
      const {attachNativeSukuyoRecovery}=await import('./native-sukuyo-recovery.js');
      const input=await bodyOf(request);
      return reply(await attachNativeSukuyoRecovery(env,auth,input.orderId,input.intentId,verifyLibraryOrder));
    }
    if(path==='/native/sukuyo/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-sukuyo-prepare',6);
      const {prepareNativeSukuyo}=await import('./native-sukuyo.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeSukuyo(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/sukuyo-compatibility-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-sukuyo',30);
      const {handleNativeSukuyo}=await import('./native-sukuyo.js');
      return forwardServiceResponse(await handleNativeSukuyo(request,env,auth,path.slice('/canonical/sukuyo-compatibility-ai'.length)),headers);
    }
    if(path.startsWith('/canonical/vedic-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-vedic',30);
      const {handleNativeVedic}=await import('./native-vedic.js');
      return forwardServiceResponse(await handleNativeVedic(request,env,auth,path.slice('/canonical/vedic-ai'.length)),headers);
    }
    if(path==='/native/ziwei/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-ziwei-prepare',6);
      const {prepareNativeZiwei}=await import('./native-ziwei.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeZiwei(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/ziwei-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-ziwei',30);
      const {handleNativeZiwei}=await import('./native-ziwei.js');
      return forwardServiceResponse(await handleNativeZiwei(request,env,auth,path.slice('/canonical/ziwei-ai'.length)),headers);
    }
    if(path==='/native/new-year/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-new-year-prepare',6);
      const {prepareNativeNewYear}=await import('./native-new-year.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeNewYear(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/new-year-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-new-year',30);
      const {handleNativeNewYear}=await import('./native-new-year.js');
      return forwardServiceResponse(await handleNativeNewYear(request,env,auth,path.slice('/canonical/new-year-ai'.length)),headers);
    }
    if(path==='/native/karma/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-karma-prepare',6);
      const {prepareNativeKarma}=await import('./native-karma.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeKarma(env,auth,input.input,input.orderId));
    }
    if(path.startsWith('/canonical/karma-destiny-ai/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-karma',30);
      const {handleNativeKarma}=await import('./native-karma.js');
      return forwardServiceResponse(await handleNativeKarma(request,env,auth,path.slice('/canonical/karma-destiny-ai'.length)),headers);
    }
    if(path==='/native/maya/recovery/drafts'&&request.method==='POST'){
      await limit(env,auth._id,'native-maya-recovery',20);
      const {listNativeMayaRecovery}=await import('./native-maya-recovery.js');
      const input=await bodyOf(request);
      return reply(await listNativeMayaRecovery(env,auth,input.orderId,input.cursor,verifyLibraryOrder));
    }
    if(path==='/native/maya/recovery/attach'&&request.method==='POST'){
      await limit(env,auth._id,'native-maya-recovery',20);
      const {attachNativeMayaRecovery}=await import('./native-maya-recovery.js');
      const input=await bodyOf(request);
      return reply(await attachNativeMayaRecovery(env,auth,input.orderId,input.intentId,verifyLibraryOrder));
    }
    if(path==='/native/maya/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-maya-prepare',6);
      const {prepareNativeMaya}=await import('./native-maya.js');
      const input=await bodyOf(request);
      return reply(await prepareNativeMaya(env,auth,input.input,input.orderId));
    }
    const mayaResult=path.match(/^\/native\/maya\/results\/([a-f0-9]{64})$/);
    if(mayaResult&&request.method==='GET'){
      const {readNativeMaya}=await import('./native-maya.js');
      return reply(await readNativeMaya(env,auth,mayaResult[1]));
    }
    if(mayaResult&&request.method==='POST'){
      await limit(env,auth._id,'native-maya-result',6);
      const {readNativeMaya}=await import('./native-maya.js');
      return reply(await readNativeMaya(env,auth,mayaResult[1],{generate:true}));
    }
    if(path==='/native/palm/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-palm-prepare',6);
      return forwardServiceResponse(await (await import('./native-palm.js')).prepareNativePalm(request,env,auth),headers);
    }
    const palm=path.match(/^\/native\/palm\/results\/([a-f0-9]{64})$/);
    if(palm&&request.method==='GET')return reply(await (await import('./native-palm.js')).readNativePalm(env,auth,palm[1]));
    if(path==='/native/human-design/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-human-design-prepare',6);const body=await bodyOf(request);
      return reply(await (await import('./native-human-design.js')).prepareNativeHumanDesign(env,auth,body.input,body.orderId));
    }
    const humanDesign=path.match(/^\/native\/human-design\/results\/([a-f0-9]{64})$/);
    if(humanDesign&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-human-design-generate',30);
      return forwardServiceResponse(await (await import('./native-human-design.js')).readNativeHumanDesign(env,auth,humanDesign[1],request.method==='POST'),headers);
    }
    if(path==='/native/codex/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-codex-prepare',6);const body=await bodyOf(request);
      return reply(await (await import('./native-codex.js')).prepareNativeCodex(env,auth,body.input,body.orderId));
    }
    const codex=path.match(/^\/native\/codex\/results\/([a-f0-9]{64})$/);
    if(codex&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-codex-generate',30);
      return forwardServiceResponse(await (await import('./native-codex.js')).readNativeCodex(env,auth,codex[1],request.method==='POST'),headers);
    }
    if(path==='/native/naming/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-naming-prepare',6);
      const body=await bodyOf(request);
      return reply(await (await import('./native-naming.js')).prepareNativeNaming(env,auth,body.input,body.orderId));
    }
    const naming=path.match(/^\/native\/naming\/results\/([a-f0-9]{64})$/);
    if(naming&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-naming-generation',30);
      return forwardServiceResponse(await (await import('./native-naming.js')).readNativeNaming(env,auth,naming[1],request.method==='POST'),headers);
    }
    const totem=path.match(/^\/native\/(totem-basic|totem-deep)\/(prepare|results\/([a-f0-9]{64}))$/);
    if(totem){
      const service=(await import('./native-totem.js')).totemFor('animal-'+totem[1]);
      if(totem[2]==='prepare'&&request.method==='POST'){
        await limit(env,auth._id,'totem-prepare',6);
        const body=await bodyOf(request);
        return reply(await service.prepare(env,auth,body.input,body.orderId));
      }
      if(totem[3]&&['GET','POST'].includes(request.method)){
        if(request.method==='POST')await limit(env,auth._id,'totem-generate',30);
        return forwardServiceResponse(await service.read(env,auth,totem[3],request.method==='POST'),headers);
      }
    }
    if(path==='/native/geomancy/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-geomancy-prepare',6);
      const body=await bodyOf(request);
      return reply(await (await import('./native-geomancy.js')).prepareGeomancy(env,auth,body.input,body.orderId));
    }
    const geomancy=path.match(/^\/native\/geomancy\/results\/([a-f0-9]{64})$/);
    if(geomancy&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-geomancy-generate',30);
      return forwardServiceResponse(await (await import('./native-geomancy.js')).readGeomancy(env,auth,geomancy[1],request.method==='POST'),headers);
    }
    const birthReading=path.match(/^\/native\/(guardian|sibyl)\/(prepare|results\/([a-f0-9]{64}))$/);
    if(birthReading){
      const [,service,action,id]=birthReading;
      const adapter=await import('./birth-readings.js');
      if(action==='prepare'&&request.method==='POST'){
        await limit(env,auth._id,'native-'+service+'-prepare',6);
        const body=await bodyOf(request);
        return reply(await adapter.prepareBirthReading(env,auth,service,body.input,body.orderId));
      }
      if(id&&['GET','POST'].includes(request.method)){
        const advance=request.method==='POST';
        if(advance)await limit(env,auth._id,'native-'+service+'-generate',30);
        const year=new URL(request.url).searchParams.get('year');
        const result=await adapter.readBirthReading(env,auth,service,id,year,advance);
        return reply(result.body,result.status);
      }
    }
    if(path==='/native/saju-compat/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-saju-compat-prepare',6);
      const body=await bodyOf(request);
      return reply(await (await import('./native-saju-compat.js')).prepareCompat(env,auth,body.input,body.orderId));
    }
    const compat=path.match(/^\/native\/saju-compat\/results\/([a-f0-9]{64})$/);
    if(compat&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-saju-compat-generate',30);
      return forwardServiceResponse(await (await import('./native-saju-compat.js')).readCompat(env,auth,compat[1],request.method==='POST'),headers);
    }
    if(path==='/native/dream/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-dream-prepare',6);
      const body=await bodyOf(request);
      return reply(await (await import('./native-dream.js')).prepareDream(env,auth,body.input,body.orderId));
    }
    const dream=path.match(/^\/native\/dream\/results\/([a-f0-9]{64})$/);
    if(dream&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-dream-generate',30);
      return forwardServiceResponse(await (await import('./native-dream.js')).readDream(env,auth,dream[1],request.method==='POST'),headers);
    }
    if(path==='/native/heukwol/prepare'&&request.method==='POST'){
      await limit(env,auth._id,'native-heukwol-prepare',6);
      const body=await bodyOf(request);
      return reply(await (await import('./native-heukwol.js')).prepareHeukwol(env,auth,body.input,body.orderId));
    }
    const heukwol=path.match(/^\/native\/heukwol\/results\/([a-f0-9]{64})$/);
    if(heukwol&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-heukwol-wave',35);
      return reply(await (await import('./native-heukwol.js')).heukwolWave(env,auth,heukwol[1],request.method==='POST'));
    }
    const nativeIntent=path.match(/^\/native\/(ziwei-deep|compass|guardian|sibyl|tea|yoga|saju-compat|human-design|codex|palm|geomancy|totem-basic|totem-deep|nakshatra|neo|naming|dream|heukwol|fusion|life-book|love-secret|astrology|vedic|ziwei|new-year|karma|maya|sukuyo|relationship|pet)\/intents\/([a-f0-9]{64})$/);
    if(nativeIntent&&request.method==='GET'){
      const {readNativeTeaIntent}=await import('./native-tea.js');
      return reply(await readNativeTeaIntent(env,auth,nativeIntent[2],nativeIntent[1]));
    }
    if(path.startsWith('/canonical/fortune-tea-house/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-tea',30);
      const {handleNativeTea}=await import('./native-tea.js');
      const response=await handleNativeTea(request,env,auth,path.slice('/canonical/fortune-tea-house'.length));
      return forwardServiceResponse(response,headers);
    }
    if(path.startsWith('/canonical/neo-operation-room/')&&['GET','POST'].includes(request.method)){
      if(request.method==='POST')await limit(env,auth._id,'native-neo',30);
      const {handleNativeNeo}=await import('./native-neo.js');
      const response=await handleNativeNeo(request,env,auth,path.slice('/canonical/neo-operation-room'.length));
      return forwardServiceResponse(response,headers);
    }
    if(path==='/canonical/auth/me'&&request.method==='GET')return reply({ok:true,authenticated:true,user:{id:auth.userId,_id:auth.userId,name:'토스 사용자',role:'user'}});
    if(path==='/canonical/profile'&&request.method==='GET')return reply(await canonicalProfiles(auth));
    if(path==='/nakshatra/compat'&&request.method==='POST'){
      if(!isFreeFortuneFeatureKey('nakshatra-compat'))throw new TossError('NOT_AVAILABLE',403);
      await limit(env,auth._id,path,10);
      const {a,b}=await bodyOf(request);
      const {resolveCompat}=await import('../routes/nakshatra.js');
      const response=await resolveCompat(env,{a,b},{requestUrl:request.url});
      return reply(await response.json(),response.status);
    }
    if(['/nakshatra/muhurta','/nakshatra/vvip-codex','/nakshatra/lord-report','/nakshatra/dasha-map'].includes(path)&&request.method==='POST'){
      await limit(env,auth._id,'mansion-report',10);
      const {readOwnedMansionReport}=await import('./mansion-reports.js');
      return reply(await readOwnedMansionReport(request,env,auth,path.split('/').pop(),await bodyOf(request)));
    }
    if(path==='/today-hub'&&request.method==='POST'){
      await limit(env,auth._id,'today-hub',30);
      const {readTodayHub}=await import('./today-hub.js');
      return reply(await readTodayHub(env,auth,await bodyOf(request),request.url));
    }
    if(path==='/canonical/kasi/calendar'&&request.method==='POST'){
      await limit(env,auth._id,'kasi-calendar',30);
      const body=await bodyOf(request);
      const lunar=body?.method==='getSolCalInfo';
      const summary=!body?.method&&Number.isInteger(body?.year)&&body.month===6&&body.day===15;
      if(!lunar&&!summary)throw new TossError('INVALID_INPUT',400);
      const {handleKasiRoutes}=await import('../routes/kasi.js');
      const calendarRequest=new Request('https://code-destiny.com/api/kasi/calendar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      return forwardServiceResponse(await handleKasiRoutes(calendarRequest,env),headers);
    }
    if(path==='/canonical/fpti/deep-report/free'&&request.method==='POST'){
      await limit(env,auth._id,'fpti-deep',20);
      const {readOwnedFreeFpti}=await import('../routes/fpti.js');
      try{return reply({ok:true,data:await readOwnedFreeFpti(env,auth.ownerId,await bodyOf(request))});}
      catch(error){if(error.status>=400&&error.status<500)throw new TossError(error.payload?.code||'INVALID_PROFILE',error.status);throw error;}
    }
    if(path==='/canonical/saju/career-style'&&['GET','POST'].includes(request.method)){
      const statusOnly=request.method==='GET';
      if(!statusOnly)await limit(env,auth._id,'career-style',20);
      const profileId=statusOnly?url.searchParams.get('profileId'):(await bodyOf(request)).profileId;
      if(typeof profileId!=='string'||!profileId.trim()||profileId.length>80)throw new TossError('MISSING_PROFILE_ID',400);
      const {readOwnedCareerStyle}=await import('../routes/career-style.js');
      try{return reply({ok:true,...await readOwnedCareerStyle(env,{userId:auth.userId,profileId:profileId.trim(),statusOnly})});}
      catch(error){if(error.status>=400&&error.status<500)throw new TossError(error.payload?.code||'INVALID_PROFILE',error.status);throw error;}
    }
    if(path==='/canonical/geocode'&&request.method==='GET'){
      await limit(env,auth._id,'geocode',10);
      const {geocodePlace}=await import('../lib/geocode.js');
      const result=await geocodePlace(url.searchParams.get('place'));
      return reply(result.data,result.status);
    }
    if(path==='/canonical/yeongnyangi/saju/experience-check'&&request.method==='POST'){
      await limit(env,auth._id,'experience-check',6);
      return reply({ok:true,...await experienceCheckFortune(env,auth.userId,await bodyOf(request))});
    }
    if(path==='/canonical/yeongnyangi/profiles'&&['GET','POST'].includes(request.method))return reply(await canonicalProfiles(auth,request.method==='POST'?await bodyOf(request):undefined));
    if(path==='/canonical/yeongnyangi/requests'&&request.method==='POST'){
      await limit(env,auth._id,'prepare',6);
      return reply(await prepareCanonicalFortune(env,auth,checkedConsultationInput(await bodyOf(request))));
    }
    if(path==='/canonical/yeongnyangi/requests'&&request.method==='GET'){
      const rows=await TossPurchase.find({...libraryFilter(auth,url.searchParams.get('cursor')),serviceId:{$in:['yeongnyangi',null]},tarotFlowId:{$in:['',null]},nativeService:{$in:['',null]}}).sort({grantedAt:-1,_id:-1}).limit(LIBRARY_PAGE_SIZE+1).lean();
      return reply(await canonicalLibraryPage(rows,id=>readRequest(env,auth.userId,id),row=>verifyLibraryOrder(env,auth,row)));
    }
    const canonicalDraw=path.match(/^\/canonical\/yeongnyangi\/requests\/([a-f0-9]{64})\/tarot-draw$/);
    if(canonicalDraw&&request.method==='POST'){
      const row=await readRequest(env,auth.userId,canonicalDraw[1]);
      const issue=tossFortuneAccessIssue(row);if(issue)throw new TossError(issue,409);
      const funded=Boolean(row.accessMethod||row.paymentId||row.paymentClaimOrderId);
      let purchase;
      if(funded){
        purchase=await TossPurchase.findOne({identityId:auth._id,ownerId:auth.ownerId,requestId:canonicalDraw[1],environment:auth.environment}).lean();
        if(!purchase||!requestMatchesPurchase(row,purchase))throw new TossError('RESULT_NOT_FOUND',404);
        await verifyLibraryOrder(env,auth,purchase);
      }else if(!['CREATED','AWAITING_DRAW'].includes(row.state)||!requestMatchesService(row,canonicalSale(row.productId)))throw new TossError('RESULT_NOT_FOUND',404);
      const drawn=await drawCanonicalFortune(env,auth,canonicalDraw[1],await bodyOf(request));
      const drawIssue=tossFortuneAccessIssue(drawn.fortune);if(drawIssue)throw new TossError(drawIssue,409);
      if(!funded&&(drawn.fortune?.paid!==false||!['CREATED','AWAITING_DRAW'].includes(drawn.fortune?.state)||!Array.isArray(drawn.fortune?.chapters)||drawn.fortune.chapters.length))throw new TossError('RESULT_NOT_FOUND',404);
      const current=await readRequest(env,auth.userId,canonicalDraw[1]);
      const currentIssue=tossFortuneAccessIssue(current);if(currentIssue)throw new TossError(currentIssue,409);
      if(funded){if(!requestMatchesPurchase(current,purchase))throw new TossError('RESULT_NOT_FOUND',404);await verifyLibraryOrder(env,auth,purchase);}
      else if(current.accessMethod||current.paymentId||current.paymentClaimOrderId||!['CREATED','AWAITING_DRAW'].includes(current.state))throw new TossError('RESULT_NOT_FOUND',404);
      return reply(drawn);
    }
    if(path==='/session'&&request.method==='GET')return reply({authenticated:true,environment:auth.environment,storageScope:await hash('local-progress:'+auth.environment+':'+auth._id)});
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
    if(path==='/olympus/placements'&&request.method==='POST'){
      await limit(env,auth._id,'olympus-chart',15);
      const {olympusPlacements}=await import('./olympus.js');
      return reply(await olympusPlacements(await bodyOf(request),env));
    }
    if(path==='/charts/astrology'&&request.method==='POST'){
      await limit(env,auth._id,'basic-sky-chart',6);
      const {basicSkyChart}=await import('./basic-sky-chart.js');
      return reply(await basicSkyChart(path.slice('/charts/'.length),await bodyOf(request),env,{requestUrl:'https://code-destiny.com/api/toss/charts'}));
    }
    if(path==='/sukuyo/past-life'&&request.method==='POST') {
      await limit(env,auth._id,'sukuyo-past-life',12);
      const {tossSukuyoPastLife}=await import('./sukuyo-past-life.js');
      return reply(await tossSukuyoPastLife(env,auth,await bodyOf(request)));
    }
    if(path==='/sukuyo/yearly'&&request.method==='POST') {
      await limit(env,auth._id,'sukuyo-yearly',6);
      const {tossSukuyoYearly}=await import('./sukuyo-yearly.js');
      return reply(await tossSukuyoYearly(env,auth,await bodyOf(request)));
    }
    if(path==='/human-design/chart'&&request.method==='POST') {
      await limit(env,auth._id,'human-design-chart',20,600000);
      const {calculateTossHumanDesign}=await import('./human-design.js');
      return reply(await calculateTossHumanDesign(await bodyOf(request),env));
    }
    if(path==='/flower/match'&&request.method==='POST') {
      await limit(env,auth._id,'flower',6);
      const [{matchTossFlowers},{domains}]=await Promise.all([import('./flower.js'),import('../yeongnyangi/fortune/index.ts')]);
      return reply(await matchTossFlowers(await bodyOf(request),env,domains));
    }
    if(path==='/prepare'&&request.method==='POST') {
      assertUniqueApprovedSaleSkus();
      await limit(env,auth._id,'prepare',6);
      const input=checkedConsultationInput(await bodyOf(request)),product=approvedProduct(input.sku);
      if(!isReviewSale(product.productId,product.serviceId))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
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
        consultationAttemptId:form.attemptId,locale:'ko',timezone:'Asia/Seoul',voiceStyle:'honorific'}, {persona:service.persona,checkoutAmountKRW:product.approvedPriceKRW});
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
      const stored=await TossPurchase.findOne({_id:input.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment}).lean();
      if(!stored)assertUniqueApprovedSaleSkus();
      // A durable purchase keeps its original product and price after a sale ends.
      const tarotProduct=path==='/orders/restore'&&(stored?(stored.tarotFlowId?{...stored,kind:'tarot-library',approved:true}:null):currentTarotSale(input.sku));
      const native=stored?!!stored.nativeService:APPROVED_TOSS_NATIVE_PRODUCTS.some(item=>item.sku===input.sku);
      if(stored&&stored.sku!==input.sku)throw new TossError('ORDER_MISMATCH',403);
      const product=stored?.nativeService?(await import('./native-consultation.js')).retainedNativeProduct(stored,auth):native?(await import('./native-tea.js')).approvedNativeTeaProduct(input.sku):tarotProduct?tarotLibraryProduct(tarotProduct):stored||approvedProduct(input.sku);
      const order=await lookupOrder(env,auth.userKey,input.orderId);
      if(order.orderId!==input.orderId||order.sku!==input.sku)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      if(tarotProduct)return reply(await grantTarotLibraryOrder({store:purchaseStore,auth,order,product}));
      if(input.requestId!==undefined&&!/^[a-f0-9]{64}$/.test(input.requestId))throw new TossError('REQUEST_ID_INVALID');
      if(native){
        const {grantNativeOrder}=await import('./native-consultation.js');
        return reply(await grantNativeOrder({store:purchaseStore,auth,order,product,requestId:input.requestId||null}));
      }
      return reply(await grantVerifiedOrder({store:purchaseStore,auth,order,product,requestId:input.requestId||null,
        enqueue:async id=>enqueueConsultation(env,await readRequest(env,auth.userId,id))}));
    }
    if(path==='/tarot-library/orders/grant'&&request.method==='POST') {
      const input=await bodyOf(request);
      const stored=await TossPurchase.findOne({_id:input.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment}).lean();
      if(!stored)assertUniqueApprovedSaleSkus();
      const product=tarotLibraryProduct(stored?.tarotFlowId?{...stored,kind:'tarot-library',approved:true}:currentTarotSale(input.sku));
      const order=await lookupOrder(env,auth.userKey,input.orderId);
      if(order.orderId!==input.orderId||order.sku!==input.sku)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      const receipt=await grantTarotLibraryOrder({store:purchaseStore,auth,order,product,input:input.input});
      return reply(receipt);
    }
    if(path==='/library'&&request.method==='GET') {
      const rows=await TossPurchase.find(libraryFilter(auth,url.searchParams.get('cursor'))).sort({grantedAt:-1,_id:-1}).limit(LIBRARY_PAGE_SIZE+1).lean();
      return reply(await libraryPage(rows,id=>readRequest(env,auth.userId,id),row=>PaidExecutionRecord.findOne({orderId:row._id,userId:String(auth.ownerId)}).lean(),
        row=>readNativeLibraryItem(env,auth,row),row=>verifyLibraryOrder(env,auth,row)));
    }
    const tarotResultMatch=path.match(/^\/tarot-library\/results\/([a-f0-9-]{36})$/);
    if(tarotResultMatch&&request.method==='POST') {
      const orderId=tarotResultMatch[1],purchase=await TossPurchase.findOne({_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,tarotFlowId:{$type:'string',$ne:''}}).lean();
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
      const orderId=tarotResultMatch[1],purchase=await TossPurchase.findOne({_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,tarotFlowId:{$type:'string',$ne:''}}).lean();
      if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
      const order=await lookupOrder(env,auth.userKey,orderId);
      if(order.sku!==purchase.sku||order.orderId!==orderId)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      if(!['PURCHASED','PAYMENT_COMPLETED'].includes(order.status))throw new TossError('ORDER_NOT_PAID',409);
      const execution=await PaidExecutionRecord.findOne({orderId,userId:String(auth.ownerId)}).lean();
      return reply(tarotLibraryResult(execution,tarotLibraryFlow(purchase.tarotFlowId)),execution?.status==='completed'?200:202);
    }
    const resultMatch=path.match(/^\/results\/([a-f0-9]{64})(\/(?:resume|conversation|follow-up))?$/);
    if(resultMatch&&request.method===(resultMatch[2]?'POST':'GET')) {
      const purchase=await TossPurchase.findOne({identityId:auth._id,ownerId:auth.ownerId,requestId:resultMatch[1],environment:auth.environment}).lean();
      if(!purchase&&canonical&&request.method==='GET'){
        const pending=await readRequest(env,auth.userId,resultMatch[1]);
        if(!pending.persona&&!pending.snapshot?.persona&&!pending.accessMethod&&!pending.paymentId&&!pending.paymentClaimOrderId&&['CREATED','AWAITING_DRAW'].includes(pending.state)){
          const fortune=presentFortune(pending);
          if(fortune.paid===false&&Array.isArray(fortune.chapters)&&fortune.chapters.length===0)return reply({fortune});
        }
      }
      if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
      if(canonical&&consultationService(purchase).id!=='yeongnyangi')throw new TossError('RESULT_NOT_FOUND',404);
      const owned=await readRequest(env,auth.userId,resultMatch[1]);
      if(!requestMatchesPurchase(owned,purchase))throw new TossError('RESULT_NOT_FOUND',404);
      const order=await lookupOrder(env,auth.userKey,purchase._id);
      if(order.sku!==purchase.sku||order.orderId!==purchase._id)throw new TossError('ORDER_MISMATCH',403);
      if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
      if(!['PURCHASED','PAYMENT_COMPLETED'].includes(order.status))throw new TossError('ORDER_NOT_PAID',409);
      const assertDeliverable=row=>{const issue=tossFortuneAccessIssue(row);if(issue)throw new TossError(issue,409);return row;};
      assertDeliverable(owned);
      if(canonical&&resultMatch[2]==='/resume'){
        // Keep the original held-chapter recovery and queue acknowledgement. The
        // Toss grant must already fund this row; never fall back to web payment.
        if(owned.accessMethod!=='TOSS_IAP')throw new TossError('RESULT_NOT_FOUND',404);
        const {retryFortune}=await import('../yeongnyangi/retry.js');
        const row=assertDeliverable(await retryFortune(env,auth.userId,resultMatch[1]));
        return reply({fortune:presentFortune(row)},row.state==='COMPLETED'?200:202);
      }
      if(resultMatch[2]==='/follow-up'){
        if(!canonical)throw new TossError('NOT_FOUND',404);
        if(owned.accessMethod!=='TOSS_IAP')throw new TossError('RESULT_NOT_FOUND',404);
        await limit(env,auth._id,'sky-followup',4);
        const input=checkedConsultationInput(await bodyOf(request));
        if(!input||typeof input!=='object'||Array.isArray(input))throw new TossError('FOLLOWUP_INPUT_INVALID',400);
        const {submitQuestionSkyFollowup}=await import('../yeongnyangi/service.ts');
        try{return reply({fortune:presentFortune(assertDeliverable(await submitQuestionSkyFollowup(env,auth.userId,resultMatch[1],input.question)))},202);}
        catch(error){const known={FOLLOWUP_INPUT_INVALID:400,FOLLOWUP_NOT_AVAILABLE:409,FOLLOWUP_ALREADY_USED:409};if(Object.hasOwn(known,error?.code))throw new TossError(error.code,known[error.code]);throw error;}
      }
      if(resultMatch[2]==='/conversation'){
        await limit(env,auth._id,'followup',4);
        const fortune=presentFortune(assertDeliverable(await questionConversation(env,auth.userId,resultMatch[1],checkedConsultationInput(await bodyOf(request)))));
        return reply(canonical?{fortune}:{...fortune,serviceId:consultationService(purchase).id});
      }
      const row=assertDeliverable(resultMatch[2]?await resumeRequest(env,auth.userId,resultMatch[1]):await readRequest(env,auth.userId,resultMatch[1]));
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
    if(known&&Object.hasOwn(consultationSafetyMessages,error.code))return reply({error:error.code,message:consultationSafetyMessages[error.code],retryable:false},422);
    const dailyErrors={DAILY_PASS_REQUIRED:403,ANCHOVY_REQUIRED:409,FREE_READING_INPUT_FROZEN:409,FREE_READING_PENDING:409,INVALID_CATEGORY:400,INVALID_INPUT:400,FREE_PROFILE_REQUIRED:400,HORARY_FREE_PROMPT_REQUIRED:400};
    if(path.startsWith('/daily/')&&Object.hasOwn(dailyErrors,error?.code))return reply({error:error.code,errorId:crypto.randomUUID()},dailyErrors[error.code]);
    const inputErrors=['QUESTION_SKY_INPUT','QUESTION_TIME_INVALID','QUESTION_LOCATION_INVALID','QUESTION_SCOPE_REQUIRED','QUESTION_SCOPE_UNSUPPORTED','QUESTION_PRODUCT_MISMATCH','PARTNER_REQUIRED','PARTNER_NOT_SUPPORTED','BIRTH_TIME_REQUIRED','PROFILE_REQUIRED','INVALID_BIRTH','QUESTION_FOLLOWUP_BUSY','QUESTION_FOLLOWUP_SUPPORT','FOLLOWUP_NOT_AVAILABLE','FOLLOWUP_INPUT_INVALID','QUESTION_CONVERSATION_CLOSED'];
    if(inputErrors.includes(error?.code))return reply({error:error.code,errorId:crypto.randomUUID()},400);
    // Engine messages are not echoed; request IDs are random and contain no personal data.
    return reply({error:known?error.code:'REQUEST_FAILED',errorId:crypto.randomUUID(),
      ...(path.startsWith('/canonical/fusion-fortune/')?{retryable:!known||error.status>=500||error.status===429}:{})},known?error.status:503);
  }
}
