import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { json, readJson, createHttpError, handleRouteError, notFound } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { products } from '../yeongnyangi/payments/catalog.ts';
import { activateFortune, generateNextChapter, prepareFortune, presentFortune, providerReady } from '../yeongnyangi/service.ts';
import { readRequest, ownerId, YeongnyangiRequest } from '../yeongnyangi/repository.js';

export async function handleYeongnyangiRoutes(request, env) {
  try {
    const url=new URL(request.url), method=request.method.toUpperCase();
    const path=url.pathname.replace(/^\/api\/yeongnyangi\/?/,'').replace(/\/$/,'');
    if(path==='products' && method==='GET') return json({ok:true,products:products.map(p=>({...p,available:providerReady(env)}))});
    const auth=await requireUserFromRequest(request,env);
    if(method!=='GET') {
      const security=await enforceSensitiveEndpointSecurity({env,request,userId:auth.userId,endpoint:`yeongnyangi:${method}:${path}`,
        allowedMethods:['POST'],requireJson:true,rateLimit:{limit:30,windowSeconds:60},rateLimitKey:`${auth.userId}:yeongnyangi:write`});
      if(!security.ok) return security.response;
    }
    if(path==='requests' && method==='POST') return json({ok:true,fortune:presentFortune(await prepareFortune(env,auth.userId,await readJson(request)))},{status:201});
    if(path==='requests' && method==='GET') {
      await connectDb(env);
      const rows=await withMongoRetry(env,()=>YeongnyangiRequest.find({userId:ownerId(auth.userId)})
        .select('_id productId state paymentId createdAt completedAt snapshot.product completedChapters errorCode').sort({createdAt:-1}).limit(30).lean());
      return json({ok:true,fortunes:rows.map(row=>({id:row._id,product:row.snapshot.product,state:row.state,paid:Boolean(row.paymentId),completedChapters:row.completedChapters,createdAt:row.createdAt}))});
    }
    const match=path.match(/^requests\/([a-f0-9]{64})(?:\/(activate|generate))?$/);
    if(!match) return notFound();
    const [,id,action]=match;
    if(!action && method==='GET') return json({ok:true,fortune:presentFortune(await readRequest(env,auth.userId,id))});
    if(action==='activate' && method==='POST') return json({ok:true,fortune:presentFortune(await activateFortune(env,auth.userId,id))});
    if(action==='generate' && method==='POST') return json({ok:true,fortune:presentFortune(await generateNextChapter(env,auth.userId,id))});
    return notFound();
  } catch(error) {
    if(error?.code && error?.status && !error.payload) {
      return handleRouteError(createHttpError(error.status,'영냥이가 상담을 이어가지 못했어요. 잠시 후 다시 확인해 주세요.',{code:error.code}),{request,env});
    }
    return handleRouteError(error,{request,env});
  }
}
