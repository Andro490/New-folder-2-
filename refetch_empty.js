const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function translateToArabic(text) {
  try {
    const res = await fetch(
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=' + encodeURIComponent(text.slice(0, 1200))
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0].map(item => item[0]).join('');
  } catch (e) { return null; }
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function containsPlayerName(hint, playerName) {
  const hintNorm = normalize(hint);
  const nameNorm = normalize(playerName);
  if (hintNorm.includes(nameNorm)) return true;
  const nameParts = nameNorm.split(' ').filter(p => p.length >= 3);
  for (const part of nameParts) {
    if (hintNorm.includes(part)) return true;
  }
  return false;
}

function extractArabicNameTokens(hints) {
  for (const hint of hints) {
    if (hint.includes('هو لاعب') || hint.includes('كان لاعب') || hint.includes('هو مدير')) {
      const beforeHowa = hint.split(/\s+هو\s+|\s+كان\s+/)[0];
      if (beforeHowa && beforeHowa.length < 60) {
        const arabicWords = beforeHowa.match(/[\u0600-\u06FF]+/g);
        if (arabicWords) return arabicWords.filter(w => w.length >= 3);
      }
      break;
    }
  }
  return [];
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

  // نطلب 15 جملة (بدل 8) عشان بعد الفلتر يفضل على الأقل 4-5
  const extractRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=15&titles=${encodeURIComponent(title)}&explaintext=1&format=json`,
    { headers }
  );
  const extractData = await extractRes.json();
  const pages = extractData.query.pages;
  const pageId = Object.keys(pages)[0];
  if (pageId === '-1') return [];

  const extract = pages[pageId].extract;
  if (!extract || extract.length < 50) return [];

  let cleaned = extract.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  // نأخذ أول 5 فقرات
  const paras = cleaned.split('\n').filter(p => p.trim().length > 30).slice(0, 5).join(' ');
  const sentences = paras.split('.').map(s => s.trim()).filter(s => s.length > 25);
  if (!sentences.length) return [];

  await sleep(1500);
  // نترجم 12 جملة
  const translated = await translateToArabic(sentences.slice(0, 12).join('. '));
  if (!translated) return [];

  const allSentences = translated.split('.').map(s => s.trim()).filter(s => s.length > 20);
  
  // استخرج الاسم العربي من الجملة الأولى
  const arabicTokens = extractArabicNameTokens(allSentences);
  const nameParts = normalize(playerName).split(' ').filter(p => p.length >= 3);
  
  // فلتر الجمل التي تحتوي على اسم اللاعب
  const filtered = allSentences.filter(hint => {
    const hintNorm = normalize(hint);
    if (hintNorm.includes(normalize(playerName))) return false;
    for (const part of nameParts) { if (hintNorm.includes(part)) return false; }
    for (const token of arabicTokens) { if (hint.includes(token)) return false; }
    return true;
  });
  
  return filtered.slice(0, 10);
}

async function main() {
  const cards = JSON.parse(fs.readFileSync('mobile/src/assets/custom_cards.json', 'utf8'));
  
  const nameToHints = {};
  let updated = 0;
  
  console.log(`Re-fetching players with < 4 hints...`);
  
  for (const card of cards) {
    if (card.hints.length >= 4) continue;
    
    const name = card.playerName;
    
    if (nameToHints[name] !== undefined) {
      card.hints = nameToHints[name];
      if (card.hints.length > 0) console.log(`[REUSE] ${name}: ${card.hints.length} hints`);
      updated++;
      continue;
    }
    
    let hints = [];
    try {
      hints = await getWikiHints(name);
      await sleep(2000);
    } catch(e) {
      console.error(`[ERR] ${name}: ${e.message}`);
    }
    
    nameToHints[name] = hints;
    card.hints = hints;
    updated++;
    console.log(`[OK] ${name}: ${hints.length} hints`);
  }
  
  fs.writeFileSync('mobile/src/assets/custom_cards.json', JSON.stringify(cards, null, 2));
  
  const dist = {0:0, 1:0, 2:0, 3:0, '4+':0};
  cards.forEach(c => {
    if (c.hints.length === 0) dist[0]++;
    else if (c.hints.length === 1) dist[1]++;
    else if (c.hints.length === 2) dist[2]++;
    else if (c.hints.length === 3) dist[3]++;
    else dist['4+']++;
  });
  console.log(`\nDone! Distribution: 0=${dist[0]}, 1=${dist[1]}, 2=${dist[2]}, 3=${dist[3]}, 4+=${dist['4+']}`);
}

main();
