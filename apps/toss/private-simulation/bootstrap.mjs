import musicTracks from 'virtual:toss-music-shelf';
import {person,changePerson} from './storage.mjs';
import {createSimulationApi,skyExample} from './api.mjs';
window.__TOSS_PRIVATE_SKY_EXAMPLE__=skyExample.input;
const serve=request=>createSimulationApi(localStorage,person,musicTracks)(request);
let current=Promise.resolve();
function handle(request){
  if(navigator.locks?.request)return navigator.locks.request('private-consultations-'+person,()=>serve(request));
  const response=current.then(()=>serve(request));
  current=response.catch(()=>{});
  return response;
}
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const request=new Request(input instanceof Request?input:new URL(input,location.origin),init);
  const url=new URL(request.url);
  if(url.origin===location.origin&&url.pathname.startsWith('/private-simulation-api/'))return handle(request);
  if(url.origin===location.origin&&request.method==='GET'&&/^\/(?:assets|fonts|audio|music|images|js|css|data)\//.test(url.pathname))return nativeFetch(request);
  throw TypeError('Private simulation blocks outbound requests');
};
window.open=()=>null;
document.addEventListener('click',event=>{
  const anchor=event.target.closest?.('a[href]');
  if(anchor&&new URL(anchor.href,location.href).origin!==location.origin){event.preventDefault();event.stopImmediatePropagation();}
},true);
document.querySelector('#private-simulation-person').value=person;
document.querySelector('#private-simulation-person').addEventListener('change',event=>changePerson(event.target.value));
