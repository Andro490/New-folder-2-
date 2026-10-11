const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function translateToArabic(text) {
  try {
    // Use a shorter chunk to avoid rate limits
    const chunk = text.slice(0, 1000);
    const res = await fetch(
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=' + encodeURIComponent(chunk)
    );
    const data = await res.json();
    return data[0].map(item => item[0]).join('');
  } catch (e) {
    return null;
  }
}

async function getWikiHints(playerName) {
  const headers = { 'User-Agent': 'GuessCardApp/1.0 (contact@example.com)' };

  // Search English Wikipedia - add "footballer" to be more specific
  const query = playerName + ' professional footballer career';
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&utf8=&format=json`,
    { headers }
  );
  const searchData = await searchRes.json();

  if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) return [];

  // Try first result that seems like a footballer page
  let title = null;
  for (const result of searchData.query.search) {
    const t = result.title.toLowerCase();
    // Skip disambiguation pages
    if (!t.includes('disambiguation') && !t.includes('list of')) {
      title = result.title;
      break;
    }
  }
  if (!title) return [];

  // Get extract
  const extractRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=6&titles=${encodeURIComponent(title)}&explaintext=1&format=json`,
    { headers }
  );
  const extractData = await extractRes.json();
  const pages = extractData.query.pages;
  const pageId = Object.keys(pages)[0];
  if (pageId === '-1') return [];
  
  const extract = pages[pageId].extract;
  if (!extract || extract.length < 50) return [];

  // Clean
  let cleaned = extract.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  // Take only first 3 paragraphs 
  const paras = cleaned.split('\n').filter(p => p.trim().length > 30).slice(0, 3).join(' ');
  
  // Split into sentences
  const sentences = paras.split('.').map(s => s.trim()).filter(s => s.length > 25);
  if (sentences.length === 0) return [];

  // Translate - wait longer between calls to avoid rate limit
  await sleep(300);
  const translated = await translateToArabic(sentences.slice(0, 6).join('. '));
  if (!translated) return [];

  const translatedSentences = translated.split('.').map(s => s.trim()).filter(s => s.length > 20);
  return translatedSentences.slice(0, 8);
}

async function main() {
  const players = JSON.parse(fs.readFileSync('mobile/src/assets/players.json', 'utf8'));
  const validPlayers = players.filter(p => p.cardType === 'epic' || p.cardType === 'bigtime');
  
  // Load existing data to only re-fetch players with fallback hints
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync('mobile/src/assets/custom_cards.json', 'utf8'));
  } catch(e) {}
  
  const existingMap = {};
  for (const c of existing) existingMap[c.id] = c;

  console.log(`Re-fetching players with < 5 hints...`);

  const result = [];
  let updated = 0;
  
  for (let i = 0; i < validPlayers.length; i++) {
    const p = validPlayers[i];
    const ex = existingMap[p.id];
    
    // Skip if already has good hints
    if (ex && ex.hints.length >= 5) {
      result.push(ex);
      continue;
    }
    
    let hints = [];
    try {
      hints = await getWikiHints(p.name);
      await sleep(500); // Extra delay between players
    } catch (e) {
      console.error(`Error for ${p.name}: ${e.message}`);
    }

    const positionsAr = { CF: 'قلب هجوم', LWF: 'جناح أيسر', RWF: 'جناح أيمن', AMF: 'صانع ألعاب', CMF: 'خط وسط', DMF: 'وسط مدافع', CB: 'قلب دفاع', LB: 'ظهير أيسر', RB: 'ظهير أيمن', GK: 'حارس مرمى', SS: 'مهاجم متأخر', RMF: 'خط وسط أيمن', LMF: 'خط وسط أيسر' };
    const pos = positionsAr[p.position] || p.position;
    const cardTypeAr = p.cardType === 'epic' ? 'إيبك' : 'بيج تايم';
    
    if (hints.length < 4) {
      hints.push(`لعب أو تألق مع فريق ${p.team}`);
      hints.push(`يلعب في مركز ${pos}`);
      hints.push(`نوع بطاقته في هذه النسخة هو ${cardTypeAr}`);
    }

    result.push({
      id: p.id,
      playerName: p.name,
      imageUrl: p.imageUrl,
      cardType: p.cardType,
      hints: [...new Set(hints)]
    });
    
    updated++;
    console.log(`[Updated] ${p.name} → ${hints.length} hints`);
    
    // Save every 5 players
    if (updated % 5 === 0) {
      fs.writeFileSync('mobile/src/assets/custom_cards.json', JSON.stringify(result, null, 2));
      console.log(`--- Saved progress (${result.length} total) ---`);
    }
  }
  
  fs.writeFileSync('mobile/src/assets/custom_cards.json', JSON.stringify(result, null, 2));
  console.log(`\nDone! ${result.length} players saved. Re-fetched ${updated} players.`);
}

main();
