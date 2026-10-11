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

const premiumPlayers = playersData.filter(p => p.cardType === 'epic' || p.cardType === 'bigtime' || p.overallRating >= 94);
const shuffledPremium = shuffle(premiumPlayers);

export const PLAYERS = shuffledPremium.slice(0, 7).map((p, index) => ({
  id: index + 1,
  name: p.name,
  position: p.position,
  rating: p.overallRating,
  flag: p.team,
  basePrice: Math.max(5, p.overallRating - 80),
  imageUrl: p.imageUrl
}));

export const BACKUP_PLAYERS = {};
shuffledPremium.slice(7, 107).forEach(p => {
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
`;

content = content.replace(/\/\/ ── بيانات اللاعبين ──────────────────────────────────────────[\s\S]*?const BUDGET_TOTAL = 100;/g, replacement + '\n\nconst BUDGET_TOTAL = 100;');

content = content.replace(/const BACKUP_PLAYERS[\s\S]*?};/g, '');

fs.writeFileSync('mobile/src/app/ai-auction.tsx', content);
console.log('done updating ai-auction.tsx');
