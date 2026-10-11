const fs = require('fs');

let content = fs.readFileSync('mobile/src/app/ai-auction.tsx', 'utf8');

const replacement = `import playersData from '../assets/players.json';

// Shuffle helper
function shuffle(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const premiumPlayers = playersData.filter(p => p.cardType === 'epic' || p.cardType === 'bigtime' || p.overallRating >= 92);
const shuffledPremium = shuffle(premiumPlayers);

const requiredPositions = ['GK', 'CB', 'CB', 'RB', 'LB', 'DMF', 'AMF', 'AMF', 'LWF', 'RWF', 'CF'];
export const PLAYERS = [];

const usedIds = new Set();

requiredPositions.forEach((pos, index) => {
  // Find a premium player for this position
  let p = shuffledPremium.find(player => player.position === pos && !usedIds.has(player.id));
  
  // If not found, just get any premium player not used
  if (!p) {
    p = shuffledPremium.find(player => !usedIds.has(player.id));
  }
  
  if (p) {
    usedIds.add(p.id);
    PLAYERS.push({
      id: index + 1, // sequential id for auction
      realId: p.id,
      name: p.name,
      position: pos, // force the position to match the required one
      rating: p.overallRating,
      flag: p.team,
      basePrice: Math.max(5, p.overallRating - 80),
      imageUrl: p.imageUrl
    });
  }
});

export const BACKUP_PLAYERS: any = {};
const backupPool = shuffle(playersData.filter(p => !usedIds.has(p.id)));

backupPool.forEach(p => {
  const pos = p.position;
  if (!BACKUP_PLAYERS[pos]) BACKUP_PLAYERS[pos] = [];
  BACKUP_PLAYERS[pos].push({
    name: p.name,
    rating: p.overallRating,
    flag: p.team,
    position: pos,
    imageUrl: p.imageUrl
  });
});

const allPositions = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'];
allPositions.forEach(pos => {
  if (!BACKUP_PLAYERS[pos] || BACKUP_PLAYERS[pos].length === 0) {
    BACKUP_PLAYERS[pos] = [{ name: 'Backup', rating: 80, flag: 'Unknown', position: pos }];
  }
});

// ── مواضع التشكيلة (11 لاعب) ─────────────────────────────────────────
const FORMATION = [
  { key: "GK",   label: "GK",  x: 0.05, y: 0.5  },
  { key: "CB1",  label: "CB",  x: 0.20, y: 0.35 },
  { key: "CB2",  label: "CB",  x: 0.20, y: 0.65 },
  { key: "LB",   label: "LB",  x: 0.25, y: 0.15 },
  { key: "RB",   label: "RB",  x: 0.25, y: 0.85 },
  { key: "DMF",  label: "DMF", x: 0.40, y: 0.5  },
  { key: "AMF1", label: "AMF", x: 0.60, y: 0.3  },
  { key: "AMF2", label: "AMF", x: 0.60, y: 0.7  },
  { key: "LWF",  label: "LWF", x: 0.80, y: 0.15 },
  { key: "RWF",  label: "RWF", x: 0.80, y: 0.85 },
  { key: "CF",   label: "CF",  x: 0.85, y: 0.5  },
];
`;

content = content.replace(/import playersData[\s\S]*?const FORMATION = \[[\s\S]*?\];/g, replacement);

fs.writeFileSync('mobile/src/app/ai-auction.tsx', content);
console.log('done updating ai-auction.tsx for 11 players');
