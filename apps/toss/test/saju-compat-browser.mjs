import {chromium} from 'playwright';
import {verifyFreeHub} from './private-free-hub.mjs';

const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await verifyFreeHub(origin,context);
 console.log('PASS free hub, guest two-person compatibility and static anatomy, zero orders');
}finally{await browser.close();}
