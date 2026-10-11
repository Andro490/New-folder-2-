const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// إعدادات الآدمن - غير كلمة السر من هنا
// ============================================================
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'embabi2024'; // *** غير كلمة السر دي ***
const JWT_SECRET = 'embabi_secret_key_change_this'; // مفتاح التشفير السري

// مسار ملف البيانات
const CARDS_FILE = path.join(__dirname, 'cards.json');

// ============================================================
// دوال مساعدة لقراءة وكتابة البيانات
// ============================================================
function readCards() {
  const data = fs.readFileSync(CARDS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeCards(cards) {
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8');
}

// ============================================================
// Middleware للتحقق من التوكن
// ============================================================
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'لا يوجد توكن' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'التوكن غير صالح' });
  }
}

// ============================================================
// لوحة تحكم الآدمن - صفحة ويب
// ============================================================
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>لوحة تحكم Embabi Games</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #050B20; color: #fff; padding: 20px; }
    h1 { color: #eab308; text-align: center; margin-bottom: 30px; font-size: 28px; }
    h2 { color: #eab308; margin-bottom: 15px; }
    .login-box { max-width: 400px; margin: 100px auto; background: #0f172a; padding: 30px; border-radius: 15px; border: 1px solid #eab308; }
    .panel { display: none; max-width: 900px; margin: 0 auto; }
    input, textarea, select { width: 100%; padding: 12px; margin-bottom: 12px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 8px; font-size: 15px; }
    button { background: #eab308; color: #000; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; width: 100%; margin-top: 5px; }
    button:hover { background: #ca8a04; }
    .danger { background: #dc2626; color: #fff; }
    .danger:hover { background: #b91c1c; }
    .success { background: #22c55e; color: #fff; }
    .card-item { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
    .card-item h3 { color: #eab308; margin-bottom: 8px; }
    .card-item p { color: #94a3b8; font-size: 14px; }
    .hint-badge { background: #1e293b; padding: 4px 10px; border-radius: 20px; display: inline-block; margin: 3px; font-size: 13px; }
    .msg { text-align: center; padding: 10px; border-radius: 8px; margin-bottom: 15px; }
    .msg.ok { background: #166534; }
    .msg.err { background: #7f1d1d; }
    .form-box { background: #0f172a; padding: 25px; border-radius: 15px; border: 1px solid #334155; margin-bottom: 30px; }
    .hint-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .hint-row input { margin-bottom: 0; }
    .hint-row button { width: auto; padding: 8px 15px; }
    .cards-list { background: #0f172a; padding: 25px; border-radius: 15px; border: 1px solid #334155; }
    .actions { display: flex; gap: 10px; margin-top: 10px; }
    .actions button { width: auto; padding: 8px 15px; }
  </style>
</head>
<body>

<!-- شاشة تسجيل الدخول -->
<div class="login-box" id="loginBox">
  <h1>🎮 Embabi Games</h1>
  <h2>دخول الآدمن</h2>
  <div id="loginMsg"></div>
  <input type="text" id="username" placeholder="اسم المستخدم" />
  <input type="password" id="password" placeholder="كلمة السر" />
  <button onclick="login()">دخول</button>
</div>

<!-- لوحة التحكم -->
<div class="panel" id="panel">
  <h1>🎮 لوحة تحكم Embabi Games</h1>
  <button class="danger" onclick="logout()" style="width:auto;padding:8px 15px;margin-bottom:20px;">خروج</button>

  <div class="form-box">
    <h2>➕ إضافة / تعديل كارت</h2>
    <div id="formMsg"></div>
    <input type="hidden" id="editId" value="" />
    <input type="text" id="playerName" placeholder="اسم اللاعب (هو الإجابة الصحيحة)" />
    <p style="color:#94a3b8;margin-bottom:10px;font-size:13px;">التلميحات (أكتب أسئلة أو معلومات عن اللاعب):</p>
    <div id="hintsContainer">
      <div class="hint-row"><input type="text" placeholder="تلميح 1" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
      <div class="hint-row"><input type="text" placeholder="تلميح 2" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
      <div class="hint-row"><input type="text" placeholder="تلميح 3" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
      <div class="hint-row"><input type="text" placeholder="تلميح 4" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
    </div>
    <button onclick="addHintRow()" style="background:#1e293b;color:#fff;margin-bottom:10px;">+ إضافة تلميح</button>
    <button class="success" onclick="saveCard()">💾 حفظ الكارت</button>
    <button onclick="resetForm()" style="background:#334155;color:#fff;margin-top:8px;">مسح الفورم</button>
  </div>

  <div class="cards-list">
    <h2>📋 الكروت الموجودة</h2>
    <div id="cardsList">جاري التحميل...</div>
  </div>
</div>

<script>
let token = localStorage.getItem('adminToken');
if (token) showPanel();

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    localStorage.setItem('adminToken', token);
    showPanel();
  } else {
    document.getElementById('loginMsg').innerHTML = '<div class="msg err">❌ اسم المستخدم أو كلمة السر غلط</div>';
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  token = null;
  document.getElementById('loginBox').style.display = 'block';
  document.getElementById('panel').style.display = 'none';
}

function showPanel() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  loadCards();
}

async function loadCards() {
  const res = await fetch('/api/cards');
  const cards = await res.json();
  let html = '';
  if (cards.length === 0) { html = '<p style="color:#94a3b8;">لا توجد كروت بعد. ابدأ بإضافة كارت!</p>'; }
  cards.forEach(card => {
    html += \`<div class="card-item">
      <h3>🃏 \${card.playerName}</h3>
      <p>التلميحات:</p>
      \${card.hints.map(h => '<span class="hint-badge">' + h + '</span>').join('')}
      <div class="actions">
        <button onclick='editCard(\${JSON.stringify(card)})'>✏️ تعديل</button>
        <button class="danger" onclick="deleteCard('\${card.id}')">🗑️ حذف</button>
      </div>
    </div>\`;
  });
  document.getElementById('cardsList').innerHTML = html;
}

function editCard(card) {
  document.getElementById('editId').value = card.id;
  document.getElementById('playerName').value = card.playerName;
  const container = document.getElementById('hintsContainer');
  container.innerHTML = '';
  card.hints.forEach(hint => {
    const div = document.createElement('div');
    div.className = 'hint-row';
    div.innerHTML = \`<input type="text" class="hint-input" value="\${hint}" /><button class="danger" onclick="removeHint(this)">✕</button>\`;
    container.appendChild(div);
  });
  window.scrollTo(0, 0);
}

async function saveCard() {
  const id = document.getElementById('editId').value;
  const playerName = document.getElementById('playerName').value.trim();
  const hints = [...document.querySelectorAll('.hint-input')].map(i => i.value.trim()).filter(v => v);
  
  if (!playerName) { showFormMsg('⚠️ اكتب اسم اللاعب', false); return; }
  if (hints.length < 1) { showFormMsg('⚠️ أضف تلميح واحد على الأقل', false); return; }

  const url = id ? \`/api/cards/\${id}\` : '/api/cards';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ playerName, hints, type: 'guess-card' })
  });
  const data = await res.json();
  if (res.ok) { showFormMsg('✅ تم الحفظ بنجاح!', true); resetForm(); loadCards(); }
  else { showFormMsg('❌ ' + data.message, false); }
}

async function deleteCard(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الكارت؟')) return;
  const res = await fetch(\`/api/cards/\${id}\`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) { loadCards(); }
}

function showFormMsg(text, ok) {
  document.getElementById('formMsg').innerHTML = \`<div class="msg \${ok ? 'ok' : 'err'}">\${text}</div>\`;
  setTimeout(() => { document.getElementById('formMsg').innerHTML = ''; }, 3000);
}

function resetForm() {
  document.getElementById('editId').value = '';
  document.getElementById('playerName').value = '';
  document.getElementById('hintsContainer').innerHTML = \`
    <div class="hint-row"><input type="text" placeholder="تلميح 1" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
    <div class="hint-row"><input type="text" placeholder="تلميح 2" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
    <div class="hint-row"><input type="text" placeholder="تلميح 3" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>
    <div class="hint-row"><input type="text" placeholder="تلميح 4" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button></div>\`;
}

function addHintRow() {
  const div = document.createElement('div');
  div.className = 'hint-row';
  div.innerHTML = '<input type="text" placeholder="تلميح جديد" class="hint-input" /><button class="danger" onclick="removeHint(this)">✕</button>';
  document.getElementById('hintsContainer').appendChild(div);
}

function removeHint(btn) {
  btn.parentElement.remove();
}
</script>
</body>
</html>
  `);
});

// ============================================================
// API تسجيل دخول الآدمن
// ============================================================
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'بيانات خاطئة' });
  }
});

// ============================================================
// APIs الكروت (CRUD)
// ============================================================

// GET - جلب كل الكروت (متاح للجميع)
app.get('/api/cards', (req, res) => {
  const cards = readCards();
  res.json(cards);
});

// GET - جلب كارت عشوائي واحد (للعبة)
app.get('/api/cards/random', (req, res) => {
  const cards = readCards();
  if (cards.length === 0) return res.status(404).json({ message: 'لا توجد كروت' });
  const random = cards[Math.floor(Math.random() * cards.length)];
  // نبعت التلميحات بس ومش الاسم (عشان ما يتغشش)
  res.json({ id: random.id, hints: random.hints, type: random.type });
});

// POST - إضافة كارت جديد (آدمن فقط)
app.post('/api/cards', verifyToken, (req, res) => {
  const { playerName, hints, type } = req.body;
  if (!playerName || !hints) return res.status(400).json({ message: 'بيانات ناقصة' });

  const cards = readCards();
  const newCard = {
    id: Date.now().toString(),
    type: type || 'guess-card',
    playerName,
    cardImage: null,
    hints
  };
  cards.push(newCard);
  writeCards(cards);
  res.json({ message: 'تم إضافة الكارت', card: newCard });
});

// PUT - تعديل كارت (آدمن فقط)
app.put('/api/cards/:id', verifyToken, (req, res) => {
  const { playerName, hints, type } = req.body;
  const cards = readCards();
  const index = cards.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'الكارت مش موجود' });

  cards[index] = { ...cards[index], playerName, hints, type: type || cards[index].type };
  writeCards(cards);
  res.json({ message: 'تم التعديل', card: cards[index] });
});

// DELETE - حذف كارت (آدمن فقط)
app.delete('/api/cards/:id', verifyToken, (req, res) => {
  const cards = readCards();
  const newCards = cards.filter(c => c.id !== req.params.id);
  if (newCards.length === cards.length) return res.status(404).json({ message: 'الكارت مش موجود' });
  writeCards(newCards);
  res.json({ message: 'تم الحذف' });
});

// POST - التحقق من إجابة اللاعب
app.post('/api/cards/:id/check', (req, res) => {
  const { answer } = req.body;
  const cards = readCards();
  const card = cards.find(c => c.id === req.params.id);
  if (!card) return res.status(404).json({ message: 'الكارت مش موجود' });

  const isCorrect = card.playerName.trim().toLowerCase() === answer.trim().toLowerCase();
  res.json({ correct: isCorrect, playerName: isCorrect ? card.playerName : null });
});

// ============================================================
// Socket.IO - المزاد
// ============================================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const auctionRooms = {
  room1: { id: 'room1', itemName: 'بطاقة اللاعب الخفي - 91', currentBid: 100, highestBidder: 'لا أحد' }
};

io.on('connection', (socket) => {
  console.log('🟢 مستخدم جديد اتصل:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    if (auctionRooms[roomId]) socket.emit('room_data', auctionRooms[roomId]);
  });

  socket.on('place_bid', (data) => {
    const { roomId, bidAmount, username } = data;
    const room = auctionRooms[roomId];
    if (room && bidAmount > room.currentBid) {
      room.currentBid = bidAmount;
      room.highestBidder = username;
      io.to(roomId).emit('update_bid', { currentBid: room.currentBid, highestBidder: room.highestBidder });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 المستخدم غادر:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت ${PORT}`);
  console.log(`🔐 لوحة الآدمن: http://localhost:${PORT}/admin`);
});
