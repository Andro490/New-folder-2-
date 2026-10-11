// فلتر محسّن: يستخرج الاسم العربي تلقائياً ويمسح أي تلميح يحتويه
const fs = require('fs');

const cards = JSON.parse(fs.readFileSync('mobile/src/assets/custom_cards.json', 'utf8'));
const players = JSON.parse(fs.readFileSync('mobile/src/assets/players.json', 'utf8'));
const validPlayers = players.filter(p => p.cardType === 'epic' || p.cardType === 'bigtime');
const playerMap = {};
validPlayers.forEach(p => { playerMap[p.id] = p; });

function normalize(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// استخراج الاسم العربي عن طريق تحليل تكرار الكلمات عبر الجمل
// الكلمة التي تتكرر في أكثر من جملة هي على الأرجح اسم اللاعب
function extractArabicNameTokens(hints) {
  const stopWords = new Set([
    'في', 'من', 'إلى', 'على', 'مع', 'هو', 'هي', 'كان', 'عام', 'عامًا',
    'لكن', 'كما', 'بعد', 'قبل', 'عند', 'حيث', 'التي', 'الذي', 'وفي',
    'ثم', 'أو', 'ذلك', 'هذا', 'هذه', 'وقد', 'وكان', 'وهو', 'لاعب',
    'كرة', 'قدم', 'نادي', 'فريق', 'مباراة', 'موسم', 'دوري', 'كأس',
    'بطولة', 'مرة', 'أكثر', 'أول', 'آخر', 'وبعد', 'الذين', 'اللاعب',
    'انتقل', 'فاز', 'لعب', 'ولد', 'أصبح', 'يلعب', 'عقد', 'وانتهى',
    'وانضم', 'وأصبح', 'وفاز', 'وعاد', 'ثلاثة', 'ثلاث', 'خمسة', 'بلقب',
    'الإنجليزي', 'الإيطالي', 'الإسباني', 'الفرنسي', 'الألماني', 'البرتغالي',
    'الأرجنتيني', 'البرازيلي', 'الياباني', 'والمنتخب', 'المنتخب', 'لاعبًا',
    'وكذلك', 'أيضًا', 'خلال', 'واحد', 'وبعد', 'وقبل', 'فترة', 'ولايته'
  ]);
  const wordCount = {};
  for (const hint of hints) {
    const words = hint.match(/[\u0600-\u06FF]{3,}/g) || [];
    for (const w of [...new Set(words)]) {
      if (!stopWords.has(w)) wordCount[w] = (wordCount[w] || 0) + 1;
    }
  }
  // الكلمات التي تظهر في 2+ جمل هي على الأرجح اسم اللاعب
  return Object.entries(wordCount).filter(([, c]) => c >= 2).map(([w]) => w);
}

function containsPlayerName(hint, playerName, arabicTokens) {
  const hintNorm = normalize(hint);
  const nameNorm = normalize(playerName);
  
  // تحقق من الاسم الإنجليزي
  if (hintNorm.includes(nameNorm)) return true;
  const nameParts = nameNorm.split(' ').filter(p => p.length >= 3);
  for (const part of nameParts) {
    if (hintNorm.includes(part)) return true;
  }
  
  // تحقق من الاسم العربي المستخرج
  for (const token of arabicTokens) {
    if (hint.includes(token)) return true;
  }
  
  return false;
}

const positionsAr = { CF: 'قلب هجوم', LWF: 'جناح أيسر', RWF: 'جناح أيمن', AMF: 'صانع ألعاب', CMF: 'خط وسط', DMF: 'وسط مدافع', CB: 'قلب دفاع', LB: 'ظهير أيسر', RB: 'ظهير أيمن', GK: 'حارس مرمى', SS: 'مهاجم متأخر', RMF: 'خط وسط أيمن', LMF: 'خط وسط أيسر' };

let fixedCount = 0;

const result = cards.map(card => {
  const playerName = card.playerName;
  
  // استخرج الاسم العربي من التلميحات
  const arabicTokens = extractArabicNameTokens(card.hints);
  
  // مسح أي تلميح يحتوي على اسم اللاعب (إنجليزي أو عربي)
  const filteredHints = card.hints.filter(hint => !containsPlayerName(hint, playerName, arabicTokens));
  
  const removed = card.hints.length - filteredHints.length;
  if (removed > 0) {
    fixedCount++;
    console.log(`[Fixed] ${playerName}: removed ${removed} hints (Arabic tokens: ${arabicTokens.join(', ')})`);
  }
  
  let finalHints = [...filteredHints];
  
  // إضافة fallback لو قل عدد التلميحات
  const p = playerMap[card.id];
  if (p && finalHints.length < 3) {
    const pos = positionsAr[p.position] || p.position;
    const cardTypeAr = p.cardType === 'epic' ? 'إيبك' : 'بيج تايم';
    finalHints.push(`لعب أو تألق مع فريق ${p.team}`);
    finalHints.push(`يلعب في مركز ${pos}`);
    finalHints.push(`نوع بطاقته في هذه النسخة هو ${cardTypeAr}`);
    finalHints = [...new Set(finalHints)];
    console.log(`  ↳ Added fallbacks (now ${finalHints.length} hints)`);
  }
  
  return { ...card, hints: finalHints };
});

fs.writeFileSync('mobile/src/assets/custom_cards.json', JSON.stringify(result, null, 2));

const good = result.filter(c => c.hints.length >= 3).length;
console.log(`\nDone! Fixed ${fixedCount} players. ${good}/${result.length} have 3+ valid hints.`);
