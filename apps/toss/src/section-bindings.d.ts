declare module 'virtual:section-villain-bindings' {
  export function bindVillainResult(element:HTMLElement):void;
}

declare module 'virtual:secret-house-page' {const html:string;export default html;}

declare module 'virtual:destiny-island' {const html:string;export default html;}

declare module 'virtual:saju-compat-basis' { export function compatibilityFacts(first:string[],second:string[],type:string,name:string):Record<string,unknown>; }
