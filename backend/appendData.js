const fs = require('fs');
const path = require('path');

// حدد نوع الكارت اللي بتضيفه دلوقتي (مثلاً: 'showtime', 'epic', 'big_time')
const CURRENT_CARD_TYPE = 'bigtime';

// اسم الملف اللي هتحط فيه البيانات اللي بتنسخها
const RAW_FILE = path.join(__dirname, 'raw_data.json');
// اسم الملف اللي بنجمع فيه كل اللعيبة
const PLAYERS_FILE = path.join(__dirname, 'players.json');

function appendPlayers() {
  try {
    // 1. قراءة البيانات المنسوخة
    const rawData = fs.readFileSync(RAW_FILE, 'utf-8');
    const parsedData = JSON.parse(rawData);
    
    // 2. استخراج قائمة اللعيبة (سواء كانت جوه .players أو مصفوفة مباشرة)
    const items = parsedData.players || parsedData || [];
    
    if (!Array.isArray(items)) {
      console.log("البيانات اللي في raw_data.json مش مصفوفة لاعبين!");
      return;
    }

    // 3. قراءة اللعيبة القدام اللي حفظناهم قبل كده
    let allPlayers = [];
    if (fs.existsSync(PLAYERS_FILE)) {
      const oldData = fs.readFileSync(PLAYERS_FILE, 'utf-8');
      if (oldData.trim() !== '') {
        allPlayers = JSON.parse(oldData);
      }
    }

    // 4. إضافة اللعيبة الجداد مع تنظيف البيانات
    let addedCount = 0;
    items.forEach(p => {
      // التأكد إن اللاعب مش موجود قبل كده عشان التكرار
      if (!allPlayers.find(existing => existing.id === p.id)) {
        // تنظيف الرابط لو جاي بصيغة ماركداون [link](link)
        let cleanImage = p.imageUrl || '';
        if (cleanImage.includes('](')) {
          cleanImage = cleanImage.split('](')[1].replace(')', '');
        }

        allPlayers.push({
          id: p.id,
          name: p.name,
          position: p.position,
          team: p.team,
          overallRating: p.overallRating,
          imageUrl: cleanImage,
          cardType: p.cardType || CURRENT_CARD_TYPE
        });
        addedCount++;
      }
    });

    // 5. إزالة التكرار بناءً على (الاسم + نوع الكارت)
    const uniqueMap = new Map();
    const finalPlayers = [];
    for (const p of allPlayers) {
      if (p.name === 'Lionel Messi') {
        finalPlayers.push(p); // مسي يتضاف دايماً
      } else {
        const key = p.name + '-' + p.cardType;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, true);
          finalPlayers.push(p); // أول نسخة بس اللي تتضاف
        }
      }
    }

    // 6. حفظ الملف النهائي
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(finalPlayers, null, 2));
    const removedDups = allPlayers.length - finalPlayers.length;
    console.log(`تم إضافة ${addedCount} لاعب جديد!`);
    if (removedDups > 0) console.log(`تم حذف ${removedDups} لاعب مكرر.`);
    console.log(`إجمالي اللاعبين الآن: ${finalPlayers.length}`);
    
    // مسح محتوى raw_data عشان تحط فيه الصفحة اللي بعدها
    fs.writeFileSync(RAW_FILE, '[]');
    
  } catch (err) {
    console.error('حصل خطأ:', err.message);
  }
}

appendPlayers();
