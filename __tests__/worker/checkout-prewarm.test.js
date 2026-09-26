import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { jest } from '@jest/globals';
const source=ts.createSourceFile('billing-client.ts',fs.readFileSync('app/_lib/billing-client.ts','utf8'),99,true);
const fn=source.statements.find(node=>node.name?.text==='prewarmPaidCheckout');
const js=ts.transpileModule(fn.getText(source).replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function setup({native=false,server=false,failed=false}={}){
  const preload=jest.fn(), runtime=jest.fn(async()=>{if(failed)throw Error('offline');});
  const scope=vm.createContext({...(server?{}:{window:{__cdPreloadPortOneV2Sdk:preload}}),
    isMobileAppRuntime:()=>native,loadPaidServiceRuntimeGate:runtime});
  vm.runInContext(js,scope);return {run:scope.prewarmPaidCheckout,preload,runtime};
}
test('checkout loads the shared SDK without starting an order or accessing customer state',async()=>{
  const {run,preload,runtime}=setup();await run();expect(runtime).toHaveBeenCalledTimes(1);expect(preload).toHaveBeenCalledTimes(1);
});
test.each([{native:true},{server:true}])('native or server execution never loads PortOne: %j',async options=>{
  const {run,preload,runtime}=setup(options);await run();expect(runtime).not.toHaveBeenCalled();expect(preload).not.toHaveBeenCalled();
});
test('failed prewarm leaves retry to the payment gate',async()=>{
  const {run,preload}=setup({failed:true});await expect(run()).resolves.toBeUndefined();expect(preload).not.toHaveBeenCalled();
});
test('an asynchronously rejected SDK preload stays a recoverable preparation failure',async()=>{
  const {run,preload}=setup();preload.mockRejectedValueOnce(Error('sdk unavailable'));
  await expect(run()).resolves.toBeUndefined();
});
