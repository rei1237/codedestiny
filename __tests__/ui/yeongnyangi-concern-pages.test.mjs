import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';

const root=path.resolve(import.meta.dirname,'../..');
const outfile=path.join(root,'build-cache/concern-pages/page.cjs');
await build({
 stdin:{contents:`export {default as ConcernPage,generateStaticParams,generateMetadata} from './app/yeongnyangi/consult/[concern]/page.tsx'; export {getProduct} from './worker/yeongnyangi/payments/catalog';`,resolveDir:root,loader:'ts'},
 outfile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],logLevel:'silent',
 plugins:[{name:'concern-fixtures',setup(builder){
  builder.onResolve({filter:/(\.css|next\/navigation|LocalizedGuideScreen|CraftedProductDisclosure)$/},args=>({path:args.path,namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'jsx',resolveDir:root,contents:
   args.path.endsWith('.css')?'export default {}':
   args.path==='next/navigation'?'export function notFound(){throw new Error("NOT_FOUND")} export const usePathname=()=>"/",useRouter=()=>({}),useSearchParams=()=>new URLSearchParams()':
   args.path.endsWith('LocalizedGuideScreen')?'export default function Screen({children}){return children}':
   'export default function Disclosure({featureKey}){return <details data-feature={featureKey}/>}'}));
 }}],
});
const {ConcernPage,generateStaticParams,generateMetadata,getProduct}=createRequire(import.meta.url)(outfile);
const render=async concern=>renderToStaticMarkup(await ConcernPage({params:Promise.resolve({concern})}));

test('concern pages show catalog prices, the question-mode tier and a fixed start link',async()=>{
 assert.deepEqual(generateStaticParams(),[{concern:'work-money'},{concern:'timing'}]);
 const cases={'work-money':{href:'/yeongnyangi/fortune/?category=career',recommended:['salmon']},timing:{href:'/yeongnyangi/fortune/?category=timing',recommended:['mackerel','tuna']}};
 for(const [concern,want] of Object.entries(cases)){
  const html=await render(concern);
  assert.match(html,new RegExp(`${getProduct('saju_mackerel').priceKRW.toLocaleString('ko-KR')}원부터`));
  for(const fish of ['mackerel','salmon','flounder','tuna'])assert.match(html,new RegExp(`data-fish="${fish}"[^>]*>.*?${getProduct('saju_'+fish).priceKRW.toLocaleString('ko-KR')}원`));
  assert.deepEqual([...html.matchAll(/data-fish="(\w+)" data-recommended="true"/g)].map(m=>m[1]),want.recommended);
  assert.equal(html.split(`href="${want.href.replace('&','&amp;')}"`).length-1,2);
  assert.match(html,/가상의 편집 예시/);
  assert.match(html,/href="\/yeongnyangi\/library\/"/);
  assert.equal((await generateMetadata({params:Promise.resolve({concern})})).robots.index,false);
 }
 await assert.rejects(render('love'),/NOT_FOUND/);
});
