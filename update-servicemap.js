const fs = require('fs');
const path = require('path');

// Read the serviceMap.js file
const filePath = path.join(__dirname, 'app/_lib/serviceMap.js');
let content = fs.readFileSync(filePath, 'utf8');

// Related services mapping
const relatedMapping = {
  'tarot/healing': ['tarot/love', 'tarot/self-esteem', 'tarot/reunion'],
  'tarot/solar': ['tarot/healing', 'astrology/cosmic', 'vedic/jyotish'],
  'tarot/mingri': ['tarot/love', 'tarot/year', 'saju/basic'],
  'tarot/love': ['tarot/healing', 'tarot/mingri', 'animal/mbti'],
  'tarot/self-esteem': ['tarot/healing', 'tarot/reunion', 'dream/tarot'],
  'tarot/reunion': ['tarot/self-esteem', 'tarot/love', 'tarot/healing'],
  'tarot/year': ['tarot/mingri', 'animal/totem', 'oracle/sukuyo'],
  'saju/basic': ['tarot/mingri', 'ziwei/chart', 'flower/destiny'],
  'astrology/cosmic': ['ziwei/chart', 'vedic/jyotish', 'oracle/sukuyo'],
  'ziwei/chart': ['astrology/cosmic', 'vedic/jyotish', 'flower/jamidusu'],
  'animal/physio': ['animal/mbti', 'animal/totem', 'tarot/year'],
  'animal/mbti': ['animal/physio', 'tarot/love', 'animal/totem'],
  'animal/totem': ['animal/physio', 'animal/mbti', 'dream/tarot'],
  'oracle/hwatu': ['oracle/kemet', 'oracle/juyuk', 'oracle/sukuyo'],
  'oracle/kemet': ['oracle/hwatu', 'oracle/juyuk', 'dream/psycho'],
  'oracle/juyuk': ['oracle/hwatu', 'oracle/kemet', 'oracle/sukuyo'],
  'oracle/sukuyo': ['astrology/cosmic', 'tarot/year', 'flower/sukuyo'],
  'vedic/jyotish': ['astrology/cosmic', 'ziwei/chart', 'tarot/solar'],
  'flower/destiny': ['flower/astrology', 'flower/jamidusu', 'flower/sukuyo'],
  'flower/astrology': ['flower/destiny', 'flower/jamidusu', 'astrology/cosmic'],
  'flower/jamidusu': ['flower/destiny', 'flower/astrology', 'ziwei/chart'],
  'flower/sukuyo': ['flower/destiny', 'oracle/sukuyo', 'tarot/year'],
  'dream/tarot': ['dream/psycho', 'animal/totem', 'tarot/self-esteem'],
  'dream/psycho': ['dream/tarot', 'oracle/kemet', 'tarot/self-esteem'],
};

// CardTitle mapping (short titles for cards)
const cardTitleMapping = {
  'tarot/healing': '따뜻한 태양 회복 타로',
  'tarot/solar': '태양의 화답',
  'tarot/mingri': '명리학 AI 타로',
  'tarot/love': '연애 관계 타로',
  'tarot/self-esteem': '자존감 타로',
  'tarot/reunion': '재회운 타로',
  'tarot/year': '천운 타로',
  'saju/basic': '사주 만세력',
  'astrology/cosmic': '코즈믹 차트',
  'ziwei/chart': '자미두수 12궁',
  'animal/physio': 'AI 동물 관상',
  'animal/mbti': 'MBTI 동물 궁합',
  'animal/totem': '애니멀 토템',
  'oracle/hwatu': '화투점',
  'oracle/kemet': '이집트 신탁',
  'oracle/juyuk': '주역 거북점',
  'oracle/sukuyo': '숙요점',
  'vedic/jyotish': '베다 점성술',
  'flower/destiny': '운명의 꽃',
  'flower/astrology': '점성술 꽃',
  'flower/jamidusu': '자미두수 꽃',
  'flower/sukuyo': '숙요 꽃',
  'dream/tarot': '드림 타로',
  'dream/psycho': '정신분석 해몽',
};

// Process each service entry
Object.keys(relatedMapping).forEach((slug) => {
  // Pattern to find the service entry and its closing brace
  const pattern = new RegExp(
    `("${slug.replace(/\//g, '\\/')}": \\{[\\s\\S]*?)({\\s*"[a-z]|};)`,
    'g'
  );

  content = content.replace(pattern, (match, serviceBlock, nextPart) => {
    // Add cardTitle and related if not already present
    if (!serviceBlock.includes('cardTitle:')) {
      const cardTitle = cardTitleMapping[slug];
      const relatedArray = relatedMapping[slug];
      const relatedStr = JSON.stringify(relatedArray);
      
      // Insert cardTitle after title line and related at the end before closing
      serviceBlock = serviceBlock.replace(
        /(title: "[^"]*",)/,
        `$1\n    cardTitle: "${cardTitle}",`
      );
      
      // Add related array before the closing brace
      serviceBlock = serviceBlock.replace(
        /,(\s*)\},\s*$/,
        `,$1related: ${relatedStr},\n  },`
      );

      // Fix for services that might not have a closing }, on the same line
      if (!serviceBlock.endsWith('},')) {
        serviceBlock = serviceBlock.replace(/(keywords: \[[^\]]*\],)/, `$1\n    related: ${relatedStr},`);
      }
    }

    return serviceBlock + nextPart;
  });
});

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ serviceMap.js updated with cardTitle and related fields');
