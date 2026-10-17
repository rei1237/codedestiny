// Hand-drawn, language-neutral mascots. Titles and explanations stay in HTML.
type Prop = 'mirror' | 'heart' | 'leaf' | 'laptop' | 'moon' | 'clock' | 'letter' | 'prism' | 'puzzle' | 'spark' | 'mask' | 'cup' | 'flower' | 'compass' | 'book' | 'star' | 'balloon' | 'lens' | 'ribbon' | 'scale' | 'cape' | 'dog';
const scenes: Record<string, { bg: string; accent: string; prop: Prop; cat?: boolean }> = {
  psycho: { bg: '#f5dce6', accent: '#bd6b91', prop: 'mask', cat: true },
  narcissist: { bg: '#f7e7bd', accent: '#b88943', prop: 'mirror' },
  chihuahua: { bg: '#f8dfc4', accent: '#be805b', prop: 'dog' },
  aura: { bg: '#e8dff7', accent: '#9d83c2', prop: 'prism', cat: true },
  ttest: { bg: '#d9eee4', accent: '#70a796', prop: 'scale' },
  persona: { bg: '#dfebf4', accent: '#779db8', prop: 'ribbon', cat: true },
  thriller: { bg: '#e1ddef', accent: '#8a7cae', prop: 'lens', cat: true },
  office: { bg: '#deedf1', accent: '#7b9fb1', prop: 'laptop' },
  seven: { bg: '#f5dfe5', accent: '#bf8297', prop: 'heart' },
  hsp: { bg: '#e4edd7', accent: '#93ae7c', prop: 'flower' },
  tci: { bg: '#dceddf', accent: '#7ca487', prop: 'compass', cat: true },
  empathy: { bg: '#f5e4d5', accent: '#b99678', prop: 'cup' },
  mental: { bg: '#daeae9', accent: '#7fa8a5', prop: 'clock', cat: true },
  romance: { bg: '#f8dce4', accent: '#c7839b', prop: 'letter' },
  mbti: { bg: '#e5e2f2', accent: '#9b8fb9', prop: 'puzzle', cat: true },
  lovelang: { bg: '#fae4dc', accent: '#c18f84', prop: 'book' },
  pastlife: { bg: '#e0def4', accent: '#8c85b6', prop: 'moon', cat: true },
  dopamine: { bg: '#faeabe', accent: '#c39c58', prop: 'spark' },
  nunchi: { bg: '#dcebef', accent: '#80a3af', prop: 'star', cat: true },
  mentalfit: { bg: '#dfeddb', accent: '#83aa79', prop: 'leaf' },
  villain: { bg: '#e6def0', accent: '#9e85b0', prop: 'cape', cat: true },
  idealsignal: { bg: '#f6dfe9', accent: '#bd819d', prop: 'balloon' },
};
const outline = '#684d63';
function Heart({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${scale})`} d="M0 18C-42-10-30-37-10-31Q0-29 0-20Q12-42 32-28C52-9 24 8 0 18Z" fill="#e991ac"/>;
}
function Keepsake({ kind, color }: { kind: Prop; color: string }) {
  return <g transform="translate(300 282)" stroke={outline} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'letter' ? <><rect x="-62" y="-42" width="124" height="80" rx="13" fill="#fff9ef"/><path d="m-56-35 56 44 56-44" fill="none"/><Heart y={8} scale={.42}/></>
    : kind === 'laptop' ? <><rect x="-64" y="-57" width="128" height="85" rx="13" fill={color}/><rect x="-52" y="-45" width="104" height="60" rx="7" fill="#f6f7ed"/><Heart y={-12} scale={.4}/><path d="M-77 28H77l-13 13H-64Z" fill="#f8ece4"/></>
    : kind === 'mirror' || kind === 'lens' ? <><path d="M0 8v42" stroke={color} strokeWidth="17"/><ellipse cy="-28" rx={kind === 'mirror' ? 40 : 46} ry="46" fill="#e8f4f4" stroke={color} strokeWidth="10"/><path d="m-19-41 17-15m-23 34 37-34" stroke="#fff"/></>
    : kind === 'leaf' || kind === 'flower' ? <><path d="M0 15v-65" stroke="#6d9974"/><path d="M0-23Q-47-60-42-22Q-25-5 0-23M0-45Q38-81 42-47Q21-26 0-45" fill="#a2c698" stroke="#6d9974"/>{kind === 'flower' && <g transform="translate(0 -75)" fill="#ef9ab7" stroke="#ce7c9c"><ellipse cy="-13" rx="13" ry="20"/><ellipse cx="-17" rx="20" ry="13"/><ellipse cx="17" rx="20" ry="13"/><ellipse cy="16" rx="13" ry="20"/><circle r="10" fill="#ffe5a0"/></g>}<path d="M-39 0h78l-9 43h-60Z" fill={color}/></>
    : kind === 'cup' ? <><path d="M42-29h12q32 1 15 30H43" fill="#fff7e9"/><path d="M-47-35h94v43q0 30-47 30T-47 8Z" fill="#fff7e9"/><Heart y={4} scale={.35}/><path d="M-18-56q-12-13 0-24m35 24q-12-13 0-24" fill="none" stroke={color}/></>
    : kind === 'clock' || kind === 'compass' ? <><circle cy="-12" r="53" fill="#fff7e8" stroke={color} strokeWidth="8"/>{kind === 'clock' ? <path d="M0-46v34l23 15" fill="none"/> : <path d="m0-48 18 36L0 24-18-12Z" fill={color}/>}<circle cy="-12" r="5" fill={outline}/></>
    : kind === 'book' ? <><path d="M0-37q-31-22-66-9v75q37-11 66 8q30-19 66-8v-75Q30-59 0-37Z" fill="#fff8ee"/><path d="M0-37v74"/><Heart x={-32} y={0} scale={.4}/><path d="M19-17h27M19-3h27M19 11h19" stroke={color}/></>
    : kind === 'puzzle' ? <g fill={color}><rect x="-52" y="-53" width="49" height="49" rx="15"/><rect x="3" y="-53" width="49" height="49" rx="15" fill="#efd196"/><rect x="-52" y="2" width="49" height="49" rx="15" fill="#e7a6bb"/><rect x="3" y="2" width="49" height="49" rx="15" fill="#a4c6b7"/></g>
    : kind === 'prism' ? <><path d="m0-67 59 42-22 68h-74l-22-68Z" fill="#c4b6ed"/><path d="m0-67-20 110H37Zm-59 42 118 0L-20 43Z" fill="#ecb6cf" stroke="#fff7f5" strokeWidth="3"/></>
    : kind === 'moon' ? <path d="M15-67C-82-59-60 66 22 36C-27 35-43-29 15-67Z" fill="#f2d68f"/>
    : kind === 'star' || kind === 'spark' ? <path d="m0-65 18 34 40 6-29 29 8 40L0 25-37 19l8-40-29-29 40-6Z" transform="translate(0 18)" fill="#f5d795"/>
    : kind === 'mask' ? <><path d="M-61-42Q0-17 61-42v35Q43 53 0 27Q-43 53-61-7Z" fill={color}/><path d="M-44-11q15-14 27 0m34 0q15-14 27 0" fill="none" stroke="#fff8ef" strokeWidth="7"/></>
    : kind === 'scale' ? <><path d="M0-58v95m-29 0h58M-52-38H52" fill="none"/><path d="m-50-37-22 40h44Zm100 0-22 40h44Z" fill="#fff5db"/><Heart y={-48} scale={.4}/></>
    : kind === 'ribbon' ? <><path d="m-22-1-14 47 36-15 36 15-14-47" fill={color}/><circle cy="-24" r="36" fill="#f4d99a"/><Heart y={-19} scale={.5}/></>
    : kind === 'cape' ? <><path d="M-48-39Q0-13 48-39l23 81Q0 21-71 42Z" fill={color}/><circle cy="-28" r="10" fill="#efd695"/></>
    : kind === 'dog' ? <><path d="m-40-9-17-57q32 0 38 28m38 0q6-28 38-28L40-9" fill="#bb876b"/><ellipse cy="-3" rx="46" ry="43" fill="#e2bc96"/><circle cx="-18" cy="-7" r="4" fill={outline}/><circle cx="18" cy="-7" r="4" fill={outline}/><path d="m-5 7 5 5 5-5" fill={outline}/></>
    : <><Heart y={-4} scale={1.3}/>{kind === 'balloon' && <path d="M0 22q-20 18 0 33q18 12 0 23" fill="none"/>}</>}
  </g>;
}
export default function TestArtwork({ id, className }: { id: string; className?: string }) {
  const scene = scenes[id] || scenes.aura;
  const fur = scene.cat ? '#fffaf0' : '#f5bbc8';
  return <svg className={className} viewBox="0 0 600 400" aria-hidden="true" focusable="false">
    <path fill={scene.bg} d="M0 0h600v400H0z"/>
    <path d="M0 343Q130 297 300 337T600 331v69H0Z" fill="#fff9ee" opacity=".55"/>
    <ellipse cx="300" cy="353" rx="134" ry="17" fill={scene.accent} opacity=".2"/>
    <g fill="#fffaf1" opacity=".8"><path d="m133 92 6 16 17 6-17 6-6 16-6-16-17-6 17-6Z"/><path d="m463 192 5 13 14 5-14 5-5 13-5-13-14-5 14-5Z"/><circle cx="450" cy="104" r="7"/><circle cx="141" cy="250" r="5"/></g>
    <g stroke={outline} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M219 330q-18-99 81-110q99 11 81 110" fill={scene.cat ? '#8e8db5' : '#c5a6d3'}/>
      <ellipse cx="252" cy="342" rx="31" ry="16" fill={fur}/><ellipse cx="348" cy="342" rx="31" ry="16" fill={fur}/>
      <path d="M212 167q-27-90 2-79l53 49m66 0 53-49q29-11 2 79" fill={fur}/>
      <path d="m216 114 27 29-26 14m167-43-27 29 26 14" fill="#e6a0b4" stroke="none"/>
      <path d="M300 125c-76-5-112 36-108 90c5 51 54 70 108 70s103-19 108-70c4-54-32-95-108-90Z" fill={fur}/>
      <ellipse cx="237" cy="222" rx="18" ry="10" fill="#ef9eb2" stroke="none"/><ellipse cx="363" cy="222" rx="18" ry="10" fill="#ef9eb2" stroke="none"/>
      <ellipse cx="261" cy="200" rx="7" ry="10" fill={outline} stroke="none"/><ellipse cx="339" cy="200" rx="7" ry="10" fill={outline} stroke="none"/>
      <circle cx="263" cy="197" r="2" fill="#fff" stroke="none"/><circle cx="341" cy="197" r="2" fill="#fff" stroke="none"/>
      {scene.cat ? <><path d="m294 217 6 6 6-6Z" fill="#d58da7"/><path d="M300 223q-8 15-18 5m18-5q8 15 18 5m-87-21-27-4m27 17-26 3m164-16 27-4m-27 17 26 3" fill="none" strokeWidth="3"/><path d="m243 128 33-77q46 4 71 77Z" fill="#76759f"/><ellipse cx="295" cy="129" rx="73" ry="13" fill="#8c8ab5"/><path d="M300 75q-26 10-9 30q15 12 27-5q-27 4-18-25Z" fill="#f3d797" stroke="none"/></>
      : <><ellipse cx="300" cy="224" rx="29" ry="21" fill="#ed9fb4"/><ellipse cx="290" cy="224" rx="3" ry="5" fill={outline} stroke="none"/><ellipse cx="310" cy="224" rx="3" ry="5" fill={outline} stroke="none"/><path d="M289 253q11 8 22 0" fill="none"/><g transform="translate(300 123)" fill="#ed96b7" stroke="#c87a9b" strokeWidth="3"><path d="M0 0Q-37-14-36-38Q-12-38 0 0M0 0Q37-14 36-38Q12-38 0 0"/><path d="M0 0Q-26-33 0-57Q26-33 0 0Z" fill="#f6b4cf"/><path d="M-39-12Q0-29 39-12Q0 15-39-12Z" fill="#e6a2c2"/></g></>}
    </g>
    <Keepsake kind={scene.prop} color={scene.accent}/>
    <g fill={fur} stroke={outline} strokeWidth="4"><ellipse cx="229" cy="289" rx="17" ry="22" transform="rotate(-25 229 289)"/><ellipse cx="371" cy="289" rx="17" ry="22" transform="rotate(25 371 289)"/></g>
  </svg>;
}
