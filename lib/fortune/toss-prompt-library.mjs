const libraryPrefix='cd:promptHub:library:v1:';
export function tossPromptLibraryScope(owner,revision,environment){
 if(typeof owner!=='string'||!/^[a-z0-9-]{1,48}$/i.test(owner)||!Number.isSafeInteger(revision)||revision<0||!['SANDBOX','DEFAULT'].includes(environment))return '';
 return 'toss.'+owner.toLowerCase()+'.'+revision+'.'+environment.toLowerCase();
}
export function clearTossPromptLibrary(storage,owner,currentRevision){
 if(!storage||typeof owner!=='string'||!/^[a-z0-9-]{1,48}$/i.test(owner))return;
 const prefix=libraryPrefix+'toss.'+owner.toLowerCase()+'.';
 const obsolete=[];
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(key?.startsWith(prefix)&&(currentRevision===undefined||!key.startsWith(prefix+currentRevision+'.')))obsolete.push(key);
 }
 for(const key of obsolete)storage.removeItem(key);
}
