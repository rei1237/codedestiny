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
  const keys=()=>Object.keys(storage).filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length));
  const methods={get length(){return keys().length;},key(index){return keys()[index]??null;},
    getItem(key){return storage.getItem(prefix+key);},setItem(key,value){storage.setItem(prefix+key,value);},
    removeItem(key){storage.removeItem(prefix+key);},clear(){for(const key of keys())storage.removeItem(prefix+key);}};
  return new Proxy(methods,{
    ownKeys:keys,
    getOwnPropertyDescriptor(_target,key){return typeof key==='string'&&storage.getItem(prefix+key)!==null?{configurable:true,enumerable:true}:undefined;},
    get(target,key){return Reflect.has(target,key)?Reflect.get(target,key):typeof key==='string'?storage.getItem(prefix+key)??undefined:undefined;},
    set(_target,key,value){storage.setItem(prefix+key,value);return true;},
    deleteProperty(_target,key){storage.removeItem(prefix+key);return true;},
  });
}
for(const name of ['localStorage','sessionStorage']){
  Object.defineProperty(window,name,{value:scoped(window[name]),configurable:false,writable:false});
}
