// Only the authenticated Toss router binds this context. It is never decoded
// from request headers, cookies or a client-authored access decision.
const requests=new WeakMap();
export function bindNativeTossRequest(request,context){
  if(requests.has(request))throw new Error('TOSS_CONTEXT_ALREADY_BOUND');
  requests.set(request,Object.freeze(context));
  return request;
}
export function nativeTossContext(request){return requests.get(request)||null;}
