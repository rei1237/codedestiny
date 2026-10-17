import { useId } from "react";

// Original, language-neutral vector artwork. All labels belong to HTML.
export default function TestArtwork({ id, className }: { id: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const colors: Record<string, [string, string, string]> = {
    psycho: ["#281b30", "#ee9caa", "#bba3dc"], narcissist: ["#24242c", "#edd89c", "#ac9580"],
    chihuahua: ["#f1b88e", "#8b4030", "#fff0d4"], aura: ["#242a46", "#c7b8f4", "#f2a9b5"],
    ttest: ["#183b38", "#9ddfc8", "#e0dfab"], persona: ["#283449", "#adc7de", "#dfbaa1"],
    thriller: ["#271d27", "#d88479", "#e3c7a3"], office: ["#dbe8ef", "#395c77", "#f2b17e"],
    seven: ["#612b46", "#f0b3be", "#e6c997"], hsp: ["#dce6d7", "#45684f", "#93ad80"],
    tci: ["#d5e3df", "#365e5b", "#af8971"], empathy: ["#312a50", "#c3b5ed", "#e6b4c2"],
    mental: ["#243c45", "#b5d8d5", "#edbc8b"], romance: ["#eeddd5", "#99534e", "#c6a27b"],
  };
  const [bg, ink, accent] = colors[id] || colors.aura;
  const mask = ["psycho", "persona", "narcissist", "villain"].includes(id);
  const leaf = ["hsp", "empathy", "mentalfit"].includes(id);
  const love = ["seven", "romance", "lovelang", "idealsignal"].includes(id);
  return <svg className={className} viewBox="0 0 600 400" aria-hidden="true" focusable="false">
    <defs><linearGradient id={uid} x2="1" y2="1"><stop stopColor={ink}/><stop offset="1" stopColor={accent}/></linearGradient></defs>
    <path fill={bg} d="M0 0h600v400H0z"/>
    <g fill="none" stroke={ink} opacity=".13"><circle cx="300" cy="210" r="160"/><circle cx="300" cy="210" r="130"/><path d="M40 210h520M300 30v340"/></g>
    {mask ? <g transform="translate(205 65) rotate(-8 95 130)"><path d="M0 25Q95-20 190 25V145Q175 235 95 270Q15 235 0 145Z" fill={`url(#${uid})`}/><path d="M95 8v260Q175 235 190 145V25Q145 8 95 8" fill={bg} opacity=".35"/><path d="M30 92q27-17 48 1M113 93q26-18 48 0M68 184q28 15 57-1" fill="none" stroke={bg} strokeWidth="8" strokeLinecap="round"/><path d="m95 109-12 44h24" fill="none" stroke={bg} strokeWidth="4"/></g>
    : leaf ? <g fill={ink}><path d="M295 332Q230 142 343 60Q403 197 295 332Z"/><path d="M290 292Q160 299 150 167Q270 157 290 292Z" fill={accent}/><path d="M299 330Q374 308 435 195Q322 174 299 330Z" opacity=".6"/><path d="M295 340 343 85M288 294 170 188" stroke={bg} strokeWidth="3" fill="none"/></g>
    : love ? <g transform="rotate(-12 300 200)"><rect x="168" y="73" width="235" height="265" rx="5" fill={ink}/><rect x="188" y="93" width="195" height="192" fill={bg}/><path d="M285 246 225 188C195 140 256 113 285 153C318 111 377 145 346 190Z" fill={accent}/><path d="M205 308h105" stroke={bg} strokeWidth="3"/></g>
    : id === "office" || id === "tci" ? <g stroke={ink} strokeWidth="5"><rect x="157" y="89" width="281" height="199" rx="10" fill={ink}/><rect x="171" y="104" width="253" height="165" rx="3" fill={bg}/><path d="M128 310h340l-30 17H158Z" fill={ink}/><rect x="208" y="140" width="81" height="93" rx="3" fill={accent} stroke="none"/><path d="M312 149h74m-74 27h53m-53 27h68"/></g>
    : id === "chihuahua" ? <g fill={ink}><path d="m196 199-34-137q79 6 99 84M339 146q25-82 99-84l-33 137"/><ellipse cx="300" cy="225" rx="115" ry="105"/><ellipse cx="300" cy="265" rx="57" ry="45" fill={accent}/><circle cx="253" cy="215" r="14" fill={accent}/><circle cx="347" cy="215" r="14" fill={accent}/><path d="m284 252 16 18 16-18Z" fill={bg}/><path d="m225 181 41 8m68 0 41-8" stroke={bg} strokeWidth="7"/></g>
    : id === "thriller" || id === "pastlife" ? <g><path d="M209 335V80h185v255" fill={ink}/><path d="m224 96 139 25v214H224Z" fill={bg}/><path d="m364 122 50 213h-51Z" fill={accent}/><circle cx="345" cy="224" r="5" fill={ink}/><path d="m209 335-70 37h328l-73-37" fill={ink} opacity=".2"/></g>
    : id === "mental" ? <g fill="none" stroke={ink} strokeWidth="6"><circle cx="300" cy="200" r="115"/><circle cx="300" cy="200" r="100" strokeWidth="1"/><path d="M300 115v85l60 35M300 65V45m-20 0h40"/><circle cx="300" cy="200" r="10" fill={accent}/></g>
    : id === "nunchi" ? <g fill="none" stroke={ink} strokeWidth="5"><path d="M135 200q165-185 330 0q-165 185-330 0Z"/><circle cx="300" cy="200" r="61"/><circle cx="300" cy="200" r="28" fill={accent} stroke="none"/><path d="m230 92-12-28m82 12V46m70 46 12-28"/></g>
    : id === "dopamine" ? <g><path d="M328 55 200 223h84l-12 124 130-181h-88Z" fill={`url(#${uid})`}/><g fill="none" stroke={accent} strokeWidth="3"><circle cx="300" cy="200" r="145" strokeDasharray="4 16"/><path d="m145 115 30 15m245 135 30 15"/></g></g>
    : id === "mbti" ? <g fill={ink} stroke={bg} strokeWidth="7"><rect x="177" y="77" width="123" height="123" rx="22"/><rect x="300" y="77" width="123" height="123" rx="22" fill={accent}/><rect x="177" y="200" width="123" height="123" rx="22" fill={accent}/><rect x="300" y="200" width="123" height="123" rx="22"/><circle cx="300" cy="200" r="35" fill={bg} stroke="none"/></g>
    : id === "ttest" ? <g fill="none" stroke={ink} strokeWidth="5"><path d="M300 83v235m-70 0h140M175 137h250M197 137l-48 100h96Zm206 0-48 100h96Z"/><path d="M149 237q48 55 96 0m110 0q48 55 96 0" fill={accent}/><circle cx="300" cy="100" r="13" fill={accent}/></g>
    : <g fill="none" stroke={`url(#${uid})`} strokeWidth="24"><ellipse cx="300" cy="200" rx="142" ry="73" transform="rotate(-35 300 200)"/><ellipse cx="300" cy="200" rx="142" ry="73" transform="rotate(35 300 200)"/><circle cx="300" cy="200" r="40" fill={accent} stroke="none"/></g>}
  </svg>;
}
