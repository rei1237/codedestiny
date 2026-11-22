// Keep both application drafts and pseudo-SDK tokens out of the regular app's storage.
export const simulationNamespace='ai-saju-studio:private-simulation:v1:';
const rawLocal=window.localStorage;
const activeKey=simulationNamespace+'selected-person';
export const person=rawLocal.getItem(activeKey)==='B'?'B':'A';
export function changePerson(value){
  if(!['A','B'].includes(value)||value===person)return;
  rawLocal.setItem(activeKey,value);location.reload();
}
function scoped(storage){
  const prefix=simulationNamespace+person+':';
  // The original daily draw is seeded by this device. Its paid/attendance rights
  // and every saved result still live exclusively in each simulated account.
  const deviceKey='cd:yn:daily-tarot-device:v1';
  const privateKey=key=>key===deviceKey?simulationNamespace+'device:'+deviceKey:prefix+key;
  const keys=()=>{
    const owned=Object.keys(storage).filter(key=>key.startsWith(prefix)&&key!==prefix+deviceKey).map(key=>key.slice(prefix.length));
    if(storage.getItem(privateKey(deviceKey))!==null)owned.push(deviceKey);
    return owned;
  };
  const methods={get length(){return keys().length;},key(index){return keys()[index]??null;},
    getItem(key){return storage.getItem(privateKey(key));},setItem(key,value){storage.setItem(privateKey(key),value);},
    removeItem(key){storage.removeItem(privateKey(key));},clear(){for(const key of keys())storage.removeItem(privateKey(key));}};
  return new Proxy(methods,{
    ownKeys:keys,
    getOwnPropertyDescriptor(_target,key){return typeof key==='string'&&storage.getItem(privateKey(key))!==null?{configurable:true,enumerable:true}:undefined;},
    get(target,key){return Reflect.has(target,key)?Reflect.get(target,key):typeof key==='string'?storage.getItem(privateKey(key))??undefined:undefined;},
    set(_target,key,value){storage.setItem(privateKey(key),value);return true;},
    deleteProperty(_target,key){storage.removeItem(privateKey(key));return true;},
  });
}
for(const name of ['localStorage','sessionStorage']){
  Object.defineProperty(window,name,{value:scoped(window[name]),configurable:false,writable:false});
}
