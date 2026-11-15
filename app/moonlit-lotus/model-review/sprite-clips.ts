export const ASSET_BASE = '/assets/moonlit-lotus/yeoni/2d-v2';
export type Sheet = 'expressions' | 'rest' | 'bow-down' | 'bow-lower' | 'bow-up';
export type SpriteFrame = { sheet: Sheet; frame: number; ms: number; phase?: string };
const frames = (sheet: Sheet, indices: number[], ms: number): SpriteFrame[] => indices.map(frame => ({ sheet, frame, ms }));
export const PREVIEW_CLIPS = {
  idle: [...frames('expressions', [0], 3200), ...frames('expressions', [1, 2, 1], 85), ...frames('expressions', [0], 1800)],
  greeting: [...frames('expressions', [0], 500), ...frames('expressions', [4, 5, 6, 7, 6, 7, 6, 5, 4], 160), ...frames('expressions', [0], 1200)],
  meditation: [...frames('rest', [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1], 400), ...frames('rest', [0], 500)],
};
export const POSES: { id: string; sheet: Sheet; frame: number; label: string }[] = [
  { id: 'smile', sheet: 'expressions', frame: 0, label: '다정하게' },
  { id: 'surprise', sheet: 'expressions', frame: 3, label: '깜짝 놀람' },
  { id: 'tilt', sheet: 'expressions', frame: 9, label: '갸웃갸웃' },
  { id: 'shy', sheet: 'expressions', frame: 11, label: '수줍은 미소' },
  { id: 'cheer', sheet: 'expressions', frame: 14, label: '작은 응원' },
  { id: 'hug', sheet: 'expressions', frame: 15, label: '포근한 마음' },
  { id: 'sleep', sheet: 'rest', frame: 10, label: '꾸벅꾸벅' },
  { id: 'rest', sheet: 'rest', frame: 11, label: '잠깐 쉬기' },
  { id: 'stretch', sheet: 'rest', frame: 14, label: '기지개' },
];
// 44 distinct drawings + exact first drawing at the end. Keep the final hold:
// a count is earned only after returning to the original standing pose.
export const BOW_CLIP: (SpriteFrame & { phase: string })[] = [
  ...Array.from({length:12},(_,frame)=>({sheet:'bow-down' as const,frame,ms:frame===0?600:frame===1?100:180,phase:frame<3?'서서 합장':frame<8?'몸을 낮추고 무릎 꿇기':'손으로 바닥 지지'})),
  ...Array.from({length:16},(_,frame)=>({sheet:'bow-lower' as const,frame,ms:frame===15?800:130,phase:frame<4?'손으로 바닥 지지':'천천히 머리 낮추기'})),
  ...Array.from({length:16},(_,frame)=>({sheet:'bow-up' as const,frame,ms:frame===0?400:frame===15?350:160,phase:frame<8?'상체 회복':frame<11?'무릎 꿇고 합장':'기립 · 합장'})),
  {sheet:'bow-down',frame:0,ms:600,phase:'기립 · 합장'},
];
