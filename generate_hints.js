const fs = require('fs');
const players = JSON.parse(fs.readFileSync('mobile/src/assets/players.json', 'utf8'));

const validPlayers = players.filter(p => p.cardType === 'epic' || p.cardType === 'bigtime');

const positionsAr = { CF: 'قلب هجوم', LWF: 'جناح أيسر', RWF: 'جناح أيمن', AMF: 'صانع ألعاب', CMF: 'خط وسط', DMF: 'وسط مدافع', CB: 'قلب دفاع', LB: 'ظهير أيسر', RB: 'ظهير أيمن', GK: 'حارس مرمى', SS: 'مهاجم متأخر', RMF: 'خط وسط أيمن', LMF: 'خط وسط أيسر' };

const result = validPlayers.map(p => {
  const pos = positionsAr[p.position] || p.position;
  const cardTypeAr = p.cardType === 'epic' ? 'إيبك (Epic)' : 'بيج تايم (Big Time)';
  const firstLetter = p.name.charAt(0).toUpperCase();
  const lastLetter = p.name.charAt(p.name.length - 1).toUpperCase();
  const length = p.name.replace(/\s/g, '').length;
  const secondLetter = p.name.length > 1 ? p.name.charAt(1).toLowerCase() : '';
  
  const hints = [
    `يمتاز هذا اللاعب التاريخي باللعب في مركز ${pos}.`,
    `بطاقته في هذه النسخة الرائعة من نوع ${cardTypeAr}.`,
    `لعب أو تألق بقميص فريق أو منتخب ${p.team}.`,
    `اسم اللاعب يبدأ بحرف "${firstLetter}".`,
    `اسم اللاعب بعد إزالة المسافات يتكون من ${length} حروف.`,
    `إذا كنت تبحث عن ${pos} أسطوري، فهذا الكارت يعتبر خياراً مميزاً جداً.`,
    `تاريخياً، قدم هذا اللاعب مستويات استثنائية مع فريق ${p.team}.`,
    `نهاية اسمه أو الحرف الأخير من اسمه بالإنجليزية هو "${lastLetter}".`,
    `الحرف الثاني من اسمه بالإنجليزية هو "${secondLetter}".`
  ];

  return {
    id: p.id,
    playerName: p.name,
    imageUrl: p.imageUrl,
    cardType: p.cardType,
    hints: hints
  };
});

fs.writeFileSync('mobile/src/assets/custom_cards.json', JSON.stringify(result, null, 2));
console.log('Saved custom_cards.json with rating hints removed.');
