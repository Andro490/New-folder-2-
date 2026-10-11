const fs = require('fs');

const FAILED = ['Ze Roberto', 'Park Ji-Sung', 'Bixente Lizarazu', 'Giovane Elber', 'Belletti', 'Daniele Massaro', 'Ray Parlour', 'Burchet', 'Freddie Ljungberg', 'Aldair', 'Per Mertesacker', 'David Seaman', 'Takahara Naohiro', 'Lionel Messi', 'Andres Iniesta', 'Eden Hazard', 'George Best', 'Zlatan Ibrahimovic', 'Gareth Bale', 'Alessandro Del Piero', 'Romario', 'Karim Benzema', 'Neymar Jr', 'Zico', 'Bruno Fernandes', 'Lamine Yamal', 'Gianluigi Buffon', 'Philipp Lahm', 'Ronaldinho Gaucho', 'Marcel Desailly', 'Marco van Basten', 'Ronald Araujo', 'Rafael Leao', 'Gabriel Martinelli', 'Lautaro Martinez', 'Casemiro'];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function translateToArabic(text) {
  try {
    const chunk = text.slice(0, 800);
    const res = await fetch(
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=' + encodeURIComponent(chunk)
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0].map(item => item[0]).join('');
  } catch (e) { return null; }
}

async function getWikiHints(playerName) {
  const headers = { 'User-Agent': 'GuessCardApp/1.0 (contact@example.com)' };
  const query = playerName + ' footballer career';
  
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&utf8=&format=json`,
    { headers }
  );
  const searchData = await searchRes.json();
  if (!searchData.query?.search?.length) return [];

  let title = null;
  for (const r of searchData.query.search) {
    if (!r.title.toLowerCase().includes('disambiguation') && !r.title.toLowerCase().includes('list of')) {
      title = r.title; break;
    }
  }
  if (!title) return [];

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

  let cleaned = extract.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  const paras = cleaned.split('\n').filter(p => p.trim().length > 30).slice(0, 3).join(' ');
  const sentences = paras.split('.').map(s => s.trim()).filter(s => s.length > 25);
  if (!sentences.length) return [];

  // Longer delay before translate
  await sleep(1500);
  const translated = await translateToArabic(sentences.slice(0, 5).join('. '));
  if (!translated) return [];

  return translated.split('.').map(s => s.trim()).filter(s => s.length > 20).slice(0, 7);
}

async function main() {
  const cards = JSON.parse(fs.readFileSync('mobile/src/assets/custom_cards.json', 'utf8'));
  const players = JSON.parse(fs.readFileSync('mobile/src/assets/players.json', 'utf8'));
  
  const cardMap = {};
  for (const c of cards) cardMap[c.id] = c;
  
  const positionsAr = { CF: 'قلب هجوم', LWF: 'جناح أيسر', RWF: 'جناح أيمن', AMF: 'صانع ألعاب', CMF: 'خط وسط', DMF: 'وسط مدافع', CB: 'قلب دفاع', LB: 'ظهير أيسر', RB: 'ظهير أيمن', GK: 'حارس مرمى', SS: 'مهاجم متأخر', RMF: 'خط وسط أيمن', LMF: 'خط وسط أيسر' };

  const failedSet = new Set(FAILED);
  const toRetry = players.filter(p => failedSet.has(p.name) && (p.cardType === 'epic' || p.cardType === 'bigtime'));
  const processed = new Set();
  
  console.log(`Retrying ${toRetry.length} players with slower rate...`);

  for (const p of toRetry) {
    // Avoid duplicate names (multiple Messi cards etc)
    const key = p.name;
    let hints = [];

    if (!processed.has(key)) {
      try {
        hints = await getWikiHints(p.name);
        console.log(`[OK] ${p.name} → ${hints.length} hints`);
        processed.set ? processed.set(key, hints) : processed.add(key);
      } catch(e) {
        console.error(`[ERR] ${p.name}: ${e.message}`);
      }
      await sleep(2000); // 2 second delay between players
    } else {
      console.log(`[REUSE] ${p.name} → using same hints`);
    }

    const pos = positionsAr[p.position] || p.position;
    const cardTypeAr = p.cardType === 'epic' ? 'إيبك' : 'بيج تايم';
    
    if (hints.length < 4) {
      hints.push(`لعب أو تألق مع فريق ${p.team}`);
      hints.push(`يلعب في مركز ${pos}`);
      hints.push(`نوع بطاقته في هذه النسخة هو ${cardTypeAr}`);
    }

    if (cardMap[p.id]) {
      cardMap[p.id].hints = [...new Set(hints)];
    }
  }

  const result = Object.values(cardMap);
  fs.writeFileSync('mobile/src/assets/custom_cards.json', JSON.stringify(result, null, 2));
  
  // Count good ones
  const good = result.filter(c => c.hints.length >= 4).length;
  console.log(`\nDone! ${good}/${result.length} players now have 4+ real hints.`);
}

main();
