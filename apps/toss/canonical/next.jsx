import React, {lazy, Suspense, useSyncExternalStore} from 'react';

// CSR equivalents used only by the isolated canonical-screen test entry.
export function Image({src,fill,priority,quality,unoptimized,loader,placeholder,blurDataURL,onLoadingComplete,style,...props}) {
  return <img {...props} src={typeof src==='string'?src:src.src} loading={priority?'eager':props.loading} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style} onLoad={event=>{props.onLoad?.(event);onLoadingComplete?.(event.currentTarget);}}/>;
}
export function Link({href,replace,prefetch,scroll,locale,...props}) {return <a {...props} href={typeof href==='string'?href:href.pathname}/>;}
export function dynamic(load,options={}) {const Component=lazy(async()=>{const loaded=await load();return {default:loaded.default||loaded};});return function Dynamic(props){return <Suspense fallback={options.loading?<options.loading/>:null}><Component {...props}/></Suspense>;};}
const subscribe=fn=>{window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn);};
export function usePathname(){return useSyncExternalStore(subscribe,()=>window.location.pathname);}
export function useSearchParams(){return new URLSearchParams(useSyncExternalStore(subscribe,()=>window.location.search));}
export function useRouter(){return {push:url=>location.assign(url),replace:url=>location.replace(url),back:()=>history.back(),refresh:()=>location.reload(),prefetch:()=>{}};}
