import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
// Capture the already-verified default archive journey without introducing a
// second login/checkout controller. Keep the simulation marker visible.
export async function captureConsoleFrame(page,name){
 const folder=process.env.TOSS_CAPTURE_DIR;if(!folder)throw Error('TOSS_CAPTURE_DIR required');await mkdir(folder,{recursive:true});
 const previous=page.viewportSize();await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.fonts.ready);
 for(const img of await page.locator('img').all())if(await img.isVisible()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>Promise.race([el.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,8000))]));}
 await page.evaluate(()=>window.scrollTo(0,0));
 if(name==='04-expanded-summary')await page.locator('#my-fortune-summary [data-external-image-guide] header').scrollIntoViewIfNeeded();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 console.log('capture visible image failures',name,await page.locator('img').evaluateAll(images=>images.filter(img=>img.getClientRects().length&&(!img.complete||!img.naturalWidth)).map(img=>({src:img.getAttribute('src'),alt:img.alt}))));
 await page.screenshot({path:join(folder,name+'-390.png'),fullPage:false,animations:'disabled'});await page.setViewportSize(previous);
}
