// Language-neutral editorial symbols; accessible names live in the surrounding HTML.
const themes: Record<string, [string, string, string]> = {
  psycho: ['#e9e0e9','#715b7b','#b19abc'], narcissist: ['#f1e7d0','#8c7350','#c4a974'],
  chihuahua: ['#f0dfd2','#8c624c','#ceaa8d'], aura: ['#e6e2f1','#7d7199','#b7a6ce'],
  ttest: ['#dde9e4','#56786d','#9dbdaf'], persona: ['#dfe7ee','#5d758e','#a3b7cb'],
  thriller: ['#e5e0e9','#71627f','#afa0bc'], office: ['#dce7ea','#597b89','#9bbac6'],
  seven: ['#eddde2','#925c72','#c690a5'], hsp: ['#e5eadb','#70845d','#afbf94'],
  tci: ['#dce7e3','#5f7d73','#a0baad'], empathy: ['#eee3d9','#95745f','#c7ab91'],
  mental: ['#dce8e7','#5f8583','#a0bfbb'], romance: ['#f0dfe4','#a66d81','#d4a0b1'],
  mbti: ['#e4e2ed','#79728f','#aca5c4'], lovelang: ['#f1e3da','#a27767','#d1ad9b'],
  pastlife: ['#e2e1ec','#777093','#aaa5c7'], dopamine: ['#f1e8d0','#a28a4c','#d3bc7d'],
  nunchi: ['#dfe8ed','#638095','#a1b9cb'], mentalfit: ['#e0e9db','#708a65','#a9bf9b'],
  villain: ['#e7deea','#80658f','#b09bbe'], idealsignal: ['#eee0e8','#98708b','#c6a4bb'],
};
export default function TestArtwork({ id, className }: { id: string; className?: string }) {
  const [bg, ink, accent] = themes[id] || themes.aura;
  const symbols: Record<string, React.ReactNode> = {
    psycho: <><path d="M235 106q65-37 130 0v91q-8 68-65 102q-57-34-65-102Z" fill={accent}/><path d="M257 166q17-12 31 0m24 0q17-12 31 0M279 237q21-11 42 0"/><path d="M300 103v165" opacity=".35"/></>,
    narcissist: <><ellipse cx="300" cy="170" rx="75" ry="91" fill={accent}/><ellipse cx="300" cy="170" rx="60" ry="76" fill={bg}/><path d="M300 262v58m-26 0h52M270 157l33-35m-26 62 53-55"/></>,
    chihuahua: <><path d="m225 177-28-89q56 4 69 67m68 0q13-63 69-67l-28 89" fill={accent}/><path d="M225 171q75-50 150 0q44 70-6 113q-69 54-138 0q-50-43-6-113Z" fill={accent}/><path d="M254 207h8m76 0h8m-54 34 8 8 8-8m-8 8v17m0 0q-15 15-25 0m25 0q15 15 25 0"/><path d="m246 183 23 6m62 0 23-6"/></>,
    aura: <><path d="m300 90 111 198H189Z" fill={bg}/><path d="m300 90 10 198h101Z" fill={accent} opacity=".7"/><path d="m127 216 123-37m89 7 132-48m-124 64 124-26m-116 43 116-3m-107 18 107 24" strokeWidth="10"/><path d="m127 216 123-37" stroke="#fffaf1"/></>,
    ttest: <><path d="M300 88v224m-65 0h130M185 139h230"/><path d="m209 139-47 92h94Zm182 0-47 92h94Z" strokeWidth="4"/><path d="M162 231q47 61 94 0m88 0q47 61 94 0" fill={accent}/><circle cx="300" cy="117" r="14" fill={accent}/></>,
    persona: <><path d="m195 121 108-19 16 111q-4 58-49 90q-54-18-69-73Z" fill={bg}/><path d="m292 104 112 21-14 105q-14 57-69 76q-46-33-46-90Z" fill={accent}/><path d="m220 175 22-4m20-3 22-4m21 4 22 4m22 4 22 4m-59 53q16 12 34 2M232 237q15-14 32-4"/></>,
    thriller: <><path d="M231 313V91h143v222" fill={accent}/><path d="m244 107 101 25v181H244Z" fill={bg}/><circle cx="328" cy="218" r="4" fill={ink}/><path d="m374 313 61 28H166l65-28" opacity=".4"/></>,
    office: <><path d="M259 142v-27q0-15 15-15h52q15 0 15 15v27"/><rect x="182" y="142" width="236" height="151" rx="17" fill={accent}/><path d="M182 200q118 39 236 0"/><rect x="288" y="209" width="24" height="28" rx="4" fill={bg}/></>,
    seven: <><path d="M304 314q-121-7-107-106q4-34 37-64q-3 48 25 49q-5-80 58-113q-11 62 38 108q67 96-51 126Z" fill={accent}/><path d="M300 310q-50-10-34-56q7-20 29-41q-5 27 18 48q34 39-13 49Z" fill={bg}/></>,
    hsp: <><path d="M229 294q101-15 135-151q-111-1-135 151Z" fill={accent}/><path d="m225 313 109-144M260 251l-13-37m33 6 38-3m-17-35-4-23"/><path d="M371 106q19 25 0 34q-19-9 0-34Z" fill={accent}/></>,
    tci: <><circle cx="300" cy="200" r="108"/><circle cx="300" cy="200" r="91" strokeWidth="2"/><path d="m338 133-20 85-86 49 49-85Z" fill={accent}/><path d="m281 182 37 36"/><circle cx="300" cy="200" r="8" fill={bg}/><path d="M300 80V65m120 135h15M300 320v15M180 200h-15"/></>,
    empathy: <><path d="m160 231 42-41 52 23 31-16 61 46-28 37-43 20-64-38-23 21Z" fill={bg}/><path d="m440 231-42-41-52 23-39-22-48 41q-7 17 11 19l37-22 54 40 27-7 24 21Z" fill={accent}/><path d="m256 255 30 22m-7-41 30 23m-35-101-24-22q-19-24 5-35q15-7 24 8q13-18 29-7q20 16-3 36Z"/></>,
    mental: <><circle cx="300" cy="203" r="104" fill={bg}/><path d="M300 134v69l47 28M300 99V76m-22 0h44M204 115l-16 17m208-17 16 17"/><path d="M300 112v11m90 80h-11m-79 90v-11m-90-79h11" strokeWidth="4"/><circle cx="300" cy="203" r="9" fill={accent}/></>,
    romance: <><rect x="185" y="145" width="230" height="150" rx="14" fill={bg}/><path d="m188 149 112 89 112-89m-224 141 78-71m146 71-78-71"/><path d="m300 176-37-33q-30-39 6-55q23-9 31 14q14-25 36-13q30 21 1 54Z" fill={accent}/></>,
    mbti: <><path d="M194 95h96v36q39-12 39 19t-39 20v30h-33q12 38-19 38t-20-38h-24Z" fill={accent}/><path d="M306 95h100v100h-29q12-35-20-35t-20 35h-31m100 16v98H306v-32q-36 12-36-20t36-20v-26m-112 0v98h96"/></>,
    lovelang: <><path d="M300 132q-61-41-116-18v172q59-21 116 17q57-38 116-17V114q-55-23-116 18Z" fill={bg}/><path d="M300 132v171M328 173h55m-55 25h55m-55 25h40"/><path d="m243 225-28-26q-20-27 6-37q15-4 22 12q10-20 25-10q20 15-3 35Z" fill={accent}/></>,
    pastlife: <><path d="M316 86c-115 4-138 146-44 190q65 30 113-25c-91 20-141-91-69-165Z" fill={accent}/><path d="m391 99 8 22 23 8-23 8-8 22-8-22-23-8 23-8Z" fill={bg}/><path d="M219 314h161" opacity=".4"/></>,
    dopamine: <><path d="m320 83-111 134h79l-10 99 113-147h-83Z" fill={accent}/><path d="m188 115 15 18m-41 67h24m218-84-16 17m27 100h24m-36 55-17-17"/></>,
    nunchi: <><path d="M158 202q142-155 284 0q-142 155-284 0Z" fill={bg}/><circle cx="300" cy="202" r="55" fill={accent}/><circle cx="300" cy="202" r="23" fill={ink}/><circle cx="313" cy="187" r="9" fill={bg} stroke="none"/><path d="M300 93V74m-68 39-11-18m147 18 11-18"/></>,
    mentalfit: <><path d="M207 116q93 2 93-32q0 34 93 32v84q-12 85-93 119q-81-34-93-119Z" fill={bg}/><path d="m253 206 31 31 66-73" stroke={accent} strokeWidth="17"/></>,
    villain: <><path d="m208 281-25-157 70 57 47-90 47 90 70-57-25 157Z" fill={accent}/><path d="M208 299h184m-92-100 18 25-18 25-18-25Z"/><circle cx="183" cy="113" r="8" fill={bg}/><circle cx="300" cy="80" r="8" fill={bg}/><circle cx="417" cy="113" r="8" fill={bg}/></>,
    idealsignal: <><path d="m300 282-58-53q-44-53 0-78q34-17 58 19q24-36 58-19q44 25 0 78Z" fill={accent}/><path d="M212 134q-34 36-15 76m-10-99q-47 48-22 110m223-87q34 36 15 76m10-99q47 48 22 110"/></>,
  };
  return <svg className={className} viewBox="0 0 600 400" aria-hidden="true" focusable="false">
    <path d="M0 0h600v400H0Z" fill={bg}/>
    <ellipse cx="300" cy="340" rx="100" ry="9" fill={ink} opacity=".07"/>
    <g fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">{symbols[id] || symbols.aura}</g>
  </svg>;
}
