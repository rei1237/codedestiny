import {TEST_RECORDS,TEST_PREFIX,TEST_ENVIRONMENT} from "../../lib/editions/production-test.mjs";
import {saleRecord} from '../../lib/editions/external-receipt.mjs';
import {productionTest} from "./edition-studio.js";
export async function readTestProof(request,env,readExternal=fetch) {
  const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex","X-Content-Type-Options":"nosniff"};
  if(!productionTest(request,env)) return new Response(null,{status:404});
  if(request.method!=="GET") return new Response(null,{status:405});
  const file=new URL(request.url).pathname.slice(TEST_RECORDS.length+1);
  if(file!=="index.json" && !(/^[a-f0-9]{24}\.(json|png|sale\.json)$/.test(file))) return new Response(null,{status:404});
  const bucket=env.INSIGHT_IMAGES_BUCKET;
  if(!bucket) return new Response(null,{status:503});
  // Publish the catalog last; orphaned uploads are never exposed as confirmed issues.
  const index=await bucket.get(TEST_PREFIX+"index.json");
  const catalog=index?await index.json():{environment:TEST_ENVIRONMENT,items:[]};
  if(file==="index.json") return Response.json(catalog,{headers});
  if(!catalog.items.some(item=>item.code===file.split(".")[0])) return new Response(null,{status:404,headers});
  const sale=file.endsWith('.sale.json');
  const object=await bucket.get(TEST_PREFIX+(sale?file.replace('.sale.json','.json'):file));
  if(!object) return new Response(null,{status:404,headers});
  if(sale){
    try {
      const proof=await object.json();
      const valid=catalog.environment===TEST_ENVIRONMENT && proof.environment===TEST_ENVIRONMENT && proof.chainId===31337 && proof.code===file.split(".")[0];
      const record=valid && await saleRecord(proof,catalog.items,readExternal);
      if(record)return Response.json(record,{headers});
      return Response.json({saleEligible:false},{status:409,headers});
    } catch {
      return Response.json({saleEligible:false},{status:503,headers});
    }
  }
  return new Response(object.body,{headers:{...headers,"Content-Type":file.endsWith(".png")?"image/png":"application/json"}});
}

