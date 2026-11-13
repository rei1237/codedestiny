declare module 'virtual:toss-astral-animals' {
  type Animal={code:string;name:string;animal:string;title:string;desc:string;layer1:string;layer2:string;layer3:string};
  export const animals:Record<string,Animal>;
  export function compatibility():Record<string,{good:string[];soso:string[];bad:string[]}>;
  export function readPair(first:Animal,second:Animal):{title:string;pros:string;cons:string;advice:string;statsItems:{label:string;value:string}[]};
}
