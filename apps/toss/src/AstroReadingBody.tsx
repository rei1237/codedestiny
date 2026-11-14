import {useEffect,useRef} from 'react';
import originalStyles from '../../../public/styles/astro-reading.css?raw';

// Original reading styles live in an isolated document; original markup never
// receives script or navigation privileges in the mini-app.
export default function AstroReadingBody({html,title,css=originalStyles,bind}:{html:string;title:string;css?:string;bind?:(host:HTMLElement)=>void}){
 const frame=useRef<HTMLIFrameElement>(null);
 function render(){
  const doc=frame.current?.contentDocument;if(!doc)return;
  const template=doc.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('script,iframe,frame,object,embed,meta,base,link,form,img').forEach(el=>el.remove());
  for(const el of template.content.querySelectorAll('*'))for(const attr of Array.from(el.attributes)){
   if(/^on/i.test(attr.name)||['href','xlink:href','src','srcset','action','formaction','target','srcdoc'].includes(attr.name))el.removeAttribute(attr.name);
  }
  const host=doc.querySelector('main');host?.replaceChildren(template.content);if(host)bind?.(host);
 }
 useEffect(render,[html,bind]);
 const document='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; form-action \'none\';base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css.replace(/<\/style/gi,'')+'\n*{box-sizing:border-box}html,body{margin:0;background:#161827;color:#f6f2ef;font:15px/1.75 system-ui,sans-serif;overflow-wrap:anywhere}main{padding:16px;max-width:100%;overflow-x:auto}svg,table{max-width:100%}summary,button{cursor:pointer}h2,h3{line-height:1.4}p{max-width:70ch}details{margin:12px 0}:focus-visible{outline:2px solid #dcc3ef;outline-offset:3px}</style></head><body><main></main></body></html>';
 return <iframe ref={frame} title={title} sandbox="allow-same-origin" srcDoc={document} onLoad={render} style={{width:'100%',height:'72svh',display:'block',border:0,borderRadius:16}}/>;
}
