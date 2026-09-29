// Korean-first vocabulary shared by saved positions and the selection ritual.
export const relationshipPositions=[
 ['self_heart','내 현재 마음'],['other_heart','상대 쪽 관계 흐름'],
 ['attraction','두 사람 사이의 끌림'],['hidden','겉으로 드러난 관계와 숨은 과제'],
 ['future','가까운 미래의 가능성'],['advice','관계 조언과 종합 판단'],
];
export const relationshipSpread={
 id:'yeongnyangi_compatibility_six',title:'두 사람의 관계',questionType:'relationship',
 positions:relationshipPositions.map(([key,label])=>({key,label,role:label,readingFocus:'질문 당시 카드의 상징을 관계의 조건으로 읽는다. 상대의 실제 마음이나 사건을 확정하지 않는다.',weight:1})),
};
