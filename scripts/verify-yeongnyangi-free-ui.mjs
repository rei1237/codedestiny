import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';

const origin=process.env.YN_UI_ORIGIN||'http://127.0.0.1:3108';
const output='build-cache/yeongnyangi-free-ui';mkdirSync(output,{recursive:true});
const result={category:'basic',day:'2026-09-16',title:'오늘의 운세',kind:'calculated',summary:'오늘은 네 기준을 차분히 세워보는 날이야.',paragraphs:['시작하고 뻗어나가려는 힘이 살아 있어.','다만 여러 일을 한꺼번에 벌이기보다 하나를 끝까지 정리해봐.','관계에서는 상대의 속도를 확인할 여지를 남겨두는 편이 좋아.','오늘 할 일 하나를 정하고, 끝낸 뒤 다음 선택으로 넘어가.'],basis:[{label:'나의 일간',value:'甲'},{label:'오늘의 일주',value:'丙午'}],limitations:['오늘의 사건을 확정하는 해석은 아닙니다.'],charts:[],prompt:'너는 영냥이, 도도하지만 다정한 달빛 점술방의 상담가다.',version:'anchovy-free-v2'};
const browser=await chromium.launch({headless:true});
try{
  for(const viewport of [{name:'mobile-390',width:390,height:844},{name:'desktop-1280',width:1280,height:900}]){
    const page=await browser.newPage({viewport});
    await page.route('**/api/profile',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({profiles:[{id:'qa-profile',profileId:'qa-profile',name:'달빛 손님',birthDate:'1992-05-18'}],currentId:'qa-profile'})}));
    await page.route('**/api/yeongnyangi/**',async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname;
      if(path.endsWith('/attendance'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,day:'2026-09-16',balance:0,attended:true,unlocked:true})});
      if(path.endsWith('/free/reading'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,result:request.method()==='POST'?result:null})});
      return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    });
    await page.goto(`${origin}/yeongnyangi/room/`,{waitUntil:'networkidle'});
    const section=page.locator('#daily');await section.scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('group',{name:'무료 운세 16종'}).getByRole('button').count(),16);
    await page.getByRole('button',{name:'오늘의 이야기 읽기'}).click();
    await page.getByRole('heading',{name:'오늘의 운세'}).waitFor();
    const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,background:getComputedStyle(document.querySelector('#daily')).backgroundColor,buttons:[...document.querySelectorAll('#daily button')].map(node=>node.getBoundingClientRect().height)}));
    assert.ok(metrics.overflow<=1,`${viewport.name} overflow ${metrics.overflow}`);assert.match(metrics.background,/rgb\((38, 24, 52|44, 28, 64)\)/);assert.ok(metrics.buttons.every(height=>height>=40),`${viewport.name} small target`);
    await page.screenshot({path:`${output}/${viewport.name}.png`,fullPage:true});
    console.log(JSON.stringify({viewport,metrics,screenshot:`${output}/${viewport.name}.png`}));
    await page.close();
  }
}finally{await browser.close();}
