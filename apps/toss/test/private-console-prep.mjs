import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
// Capture the already-verified default archive journey without introducing a
// second login/checkout controller. Keep the simulation marker visible.
export async function captureConsoleFrame(page,name){
 const folder=process.env.TOSS_CAPTURE_DIR;if(!folder)throw Error('TOSS_CAPTURE_DIR required');await mkdir(folder,{recursive:true});
 const previous=page.viewportSize();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
 console.log('capture image failures',name,await page.locator('img').evaluateAll(images=>images.filter(img=>!img.complete||!img.naturalWidth).map(img=>({src:img.getAttribute('src'),alt:img.alt}))));
 await page.screenshot({path:join(folder,name+'-390.png'),fullPage:true});await page.setViewportSize(previous);
}
