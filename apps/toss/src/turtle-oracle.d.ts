declare module 'virtual:toss-turtle-oracle'{
  export function castTurtle(question:string,seed:number):{hexChar:string;hexName:string;upper:{sym:string;name:string;nat:string};lower:{sym:string;name:string;nat:string};wisdom:{summary:string;advice:string};echo:string;strategy:string;change:string;relation:{title:string;text:string}|null;categories:{label:string;up:string;lo:string}[];answer:{title:string;advice:string};ending:string;prompt:string};
}
