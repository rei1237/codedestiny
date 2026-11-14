declare module 'virtual:toss-novel-book'{
  type Episode={id:string;rev:number;title:string;ending:string|null;branch:string|null;options:{label:string;target:string}[];count:number};
  const book:{episodes:Episode[];text:Record<string,[string,string][]>};
  export default book;
}
