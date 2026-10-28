export type FirstVisitService = 'ggulggul' | 'yeongnyangi';
export type FirstVisitStatus = 'new' | 'offered' | 'active' | 'dismissed' | 'complete';
export type FirstVisitState = {status:FirstVisitStatus;step:number};
export function readYeongnyangiGuideHidden():boolean;
export function hideYeongnyangiGuide(days?:number):void;
export function clearYeongnyangiGuideHidden():void;
export function firstVisitScope():string;
export function readFirstVisit(service:FirstVisitService,scope?:string):FirstVisitState;
export function writeFirstVisit(service:FirstVisitService,status:FirstVisitStatus,step?:number,scope?:string):void;
export function firstVisitEvent(service:FirstVisitService,event:string,step?:number):void;
export function firstVisitLogin(service:FirstVisitService):void;
export function resumeFirstVisitLogin(service:FirstVisitService):void;
export function firstVisitHome(location:Pick<Location,'pathname'|'search'|'hash'>,service:FirstVisitService):boolean;
export function firstVisitOverlayBusy(doc:Document):boolean;

