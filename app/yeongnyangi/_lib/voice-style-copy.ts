// Korean-only: the register choice is shown only for Korean readings (other languages follow toneProfile).
export const voiceStyleCopy={
 heading:'영냥이 말투',
 banmal:'반말',
 banmalNote:'원래 영냥이 말투(기본)',
 honorific:'존댓말',
 honorificNote:'해요체로 손님이라 불러요',
} as const;
export type VoiceStyle='banmal'|'honorific';
