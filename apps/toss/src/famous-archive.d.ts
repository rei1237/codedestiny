declare module 'virtual:toss-famous-archive'{
  const articles:{slug:string;name:string;aliases:string[];fields:string[];intro:string;question:string;career:string;reading:string;sources:{label:string;url:string}[]}[];
  export default articles;
}
