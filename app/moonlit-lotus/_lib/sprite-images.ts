/** Bound retained decoded atlases instead of retaining all 15 characters. */
const cache=new Map<string,{image:HTMLImageElement;promise:Promise<HTMLImageElement>;ready:boolean}>();
export function decodedSpriteImage(url:string){
 const entry=cache.get(url);return entry?.ready?entry.image:null;
}
export function loadSpriteImage(url:string):Promise<HTMLImageElement>{
 const existing=cache.get(url);
 if(existing){cache.delete(url);cache.set(url,existing);return existing.promise;}
 const image=new Image();image.crossOrigin='anonymous';
 const entry={image,ready:false,promise:Promise.resolve(image)};
 image.src=url;
 entry.promise=image.decode().then(()=>{
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('Empty sprite');
  entry.ready=true;
  for(const [key,value] of cache){if(cache.size<=12)break;if(value.ready&&key!==url)cache.delete(key);}
  return image;
 }).catch(error=>{if(cache.get(url)===entry)cache.delete(url);throw error;});
 cache.set(url,entry);return entry.promise;
}
export type SpriteDrawing={url:string;frame:number;columns?:number;rows?:number};
