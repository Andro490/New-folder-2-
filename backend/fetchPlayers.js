const fs = require('fs');

async function fetchPlayers() {
  const allPlayers = [];
  try {
    for (let page = 1; page <= 38; page++) {
      console.log(`Fetching page ${page}...`);
      const response = await fetch(`https://efhub.com/api/public/players?playerType=5&page=${page}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
         console.error(`Page ${page} failed: ${response.status}`);
         continue;
      }
      const data = await response.json();
      
      const items = data.players || [];
      
      if (Array.isArray(items)) {
        items.forEach(p => {
          allPlayers.push({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl, // URL is in the API
            position: p.position,
            overallRating: p.overallRating,
            team: p.team
          });
        });
      }
    }
    
    fs.writeFileSync('players.json', JSON.stringify(allPlayers, null, 2));
    console.log(`Done! Fetched ${allPlayers.length} players.`);
  } catch (err) {
    console.error('Error fetching players:', err);
  }
}

fetchPlayers();
