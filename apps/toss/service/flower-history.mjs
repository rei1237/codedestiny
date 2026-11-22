const prefix='cd:toss:flower-studio:v1:';
function key(scope){
 if(!/^toss\.[a-z0-9-]{1,48}\.\d+\.(sandbox|default)$/.test(scope))throw Error('FLOWER_OWNER_REQUIRED');
 return prefix+scope;
}
export function flowerHistory(storage,scope){
 const raw=storage.getItem(key(scope));
 if(!raw)return [];
 const rows=JSON.parse(raw);
 if(!Array.isArray(rows)||rows.some(r=>!r?.snapshot?.id||!r?.extension||typeof r.promptPack!=='string'))throw Error('FLOWER_HISTORY_UNREADABLE');
 return rows;
}
export function updateFlowerHistory(storage,scope,limit,edit){
 const rows=edit(flowerHistory(storage,scope)).slice(0,limit);
 storage.setItem(key(scope),JSON.stringify(rows));return rows;
}
export function clearFlowerHistory(storage,owner){
 if(typeof owner!=='string'||!/^[a-z0-9-]{1,48}$/i.test(owner))return;
 const start=prefix+'toss.'+owner.toLowerCase()+'.';
 for(let i=storage.length-1;i>=0;i--){const k=storage.key(i);if(k?.startsWith(start))storage.removeItem(k);}
}
