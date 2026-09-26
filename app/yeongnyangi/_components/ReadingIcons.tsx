import type {Theme} from '@/worker/yeongnyangi/fortune/book-contracts';

// Hand-drawn decorative icons for long readings. All are aria-hidden; labels live in the surrounding text.
type P={size?:number;className?:string};
const svg=(size:number,className:string|undefined,children:React.ReactNode)=><svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">{children}</svg>;

export const Paw=({size=16,className}:P)=>svg(size,className,<g fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="5.6" cy="10.4" r="2.2"/><circle cx="9.4" cy="6.6" r="2.3"/><circle cx="14.6" cy="6.6" r="2.3"/><circle cx="18.4" cy="10.4" r="2.2"/></g>);
export const Star=({size=16,className}:P)=>svg(size,className,<path fill="currentColor" d="M12 2.5l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.3 20.1l1.5-6.5-5-4.4 6.6-.6z"/>);
export const Moon=({size=16,className}:P)=>svg(size,className,<path fill="currentColor" d="M15.5 3.2A8.8 8.8 0 1 0 20.8 16 7.2 7.2 0 0 1 15.5 3.2z"/>);
export const Fish=({size=16,className}:P)=>svg(size,className,<g fill="currentColor"><path d="M3 12c3-4.6 8.6-5.8 13-2.6L20.5 6v12L16 14.6C11.6 17.8 6 16.6 3 12z"/><circle cx="8" cy="11.2" r="1" fill="#211432"/></g>);

const elementPaths:Record<string,React.ReactNode>={
 목:<path d="M12 21v-7M12 14c-5 0-7-4-7-9 5 0 7 3.5 7 9zm0 0c5 0 7-4 7-9-5 0-7 3.5-7 9z" fill="#8fcf8a" stroke="#4f8a4a" strokeWidth="1.2" strokeLinejoin="round"/>,
 화:<path d="M12 22c-4.2 0-6.5-3-6.5-6.4 0-4 3.4-5.6 4-10.1 2.9 2 3.3 4.6 3 6.3 1-.6 1.7-1.8 1.9-3 2.4 2.1 4.1 4.3 4.1 7.1C18.5 19.2 16.1 22 12 22z" fill="#f29a84" stroke="#b9533f" strokeWidth="1.2" strokeLinejoin="round"/>,
 토:<path d="M2.5 20l6.5-11 3.5 5 2.5-3.5L21.5 20z" fill="#e2bf73" stroke="#9a7630" strokeWidth="1.2" strokeLinejoin="round"/>,
 금:<g stroke="#8b8aa3" strokeWidth="1.2"><circle cx="12" cy="12" r="8.5" fill="#e6e4f2"/><circle cx="12" cy="12" r="5.2" fill="none"/></g>,
 수:<path d="M12 2.8c3.4 4.6 6.2 8 6.2 11.6a6.2 6.2 0 1 1-12.4 0c0-3.6 2.8-7 6.2-11.6z" fill="#8db6ec" stroke="#44699c" strokeWidth="1.2" strokeLinejoin="round"/>,
};
export const ElementIcon=({element,size=20}:{element:string;size?:number})=>elementPaths[element]?svg(size,undefined,elementPaths[element]):null;
export const elementColor:Record<string,string>={목:'#8fcf8a',화:'#f29a84',토:'#e2bf73',금:'#e6e4f2',수:'#8db6ec'};

const themeIcons:Record<Theme,(p:P)=>React.ReactElement>={self:Moon,wealth:Fish,love:Paw,career:Star,relations:Paw,timing:Moon,cross:Star,action:Paw};
export const ThemeIcon=({theme,size=16}:{theme?:Theme;size?:number})=>{const Icon=themeIcons[theme as Theme] || Star;return <Icon size={size}/>;};

export const Divider=({className}:{className?:string})=><svg viewBox="0 0 240 20" className={className} aria-hidden="true" focusable="false">
 <path d="M0 10h96M144 10h96" stroke="currentColor" strokeWidth="1" opacity=".55"/>
 <g fill="currentColor"><circle cx="104" cy="10" r="2"/><path d="M120 2.5l2 5.3 5.6.5-4.3 3.7 1.3 5.5-4.6-3-4.6 3 1.3-5.5-4.3-3.7 5.6-.5z"/><circle cx="136" cy="10" r="2"/></g>
</svg>;
