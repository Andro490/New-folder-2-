const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// الإعدادات ومفاتيح التشفير
// ============================================================
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'embabi2024';
const JWT_SECRET = 'embabi_super_secret_vps_jwt_key_2026';

// مسارات ملفات البيانات المحلية
const CARDS_FILE = path.join(__dirname, 'cards.json');
const CUSTOM_CARDS_FILE = path.join(__dirname, 'custom_cards.json');
const PLAYERS_FILE = path.join(__dirname, 'players.json');
const USERS_FILE = path.join(__dirname, 'users_db.json');

// التأكد من وجود ملف المستخدمين
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

// ============================================================
// دوال قراءة وكتابة البيانات
// ============================================================
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function readCards() {
  try {
    return JSON.parse(fs.readFileSync(CARDS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCards(cards) {
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8');
}

function readCustomCards() {
  try {
    return JSON.parse(fs.readFileSync(CUSTOM_CARDS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function readGamePlayers() {
  try {
    return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// ============================================================
// Middlewares التحقق
// ============================================================
function verifyAdminToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'لا يوجد توكن' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ message: 'غير مصرح' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'التوكن غير صالح' });
  }
}

function verifyUserToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'يرجى تسجيل الدخول' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'انتهت صلاحية الجلسة' });
  }
}

// ============================================================
// 1. نظام المستخدمين والتوثيق (User Auth APIs)
// ============================================================

// تسجيل حساب جديد
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, phone } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'من فضلك أدخل جميع البيانات المطلوبة' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();

  const userExists = Object.values(users).some(u => u.email === cleanEmail);
  if (userExists) {
    return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const uid = 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  const newUser = {
    uid,
    username: username.trim(),
    email: cleanEmail,
    password: hashedPassword,
    phone: phone ? phone.trim() : '',
    coins: 0,
    photoURL: null,
    stats: {
      wins: 0,
      losses: 0,
      dailyWins: 0,
      weeklyWins: 0,
      monthlyWins: 0,
    },
    createdAt: Date.now(),
  };

  users[uid] = newUser;
  writeUsers(users);

  const token = jwt.sign({ uid, email: cleanEmail, username: newUser.username }, JWT_SECRET, { expiresIn: '30d' });

  // نرجع البيانات بدون كلمة السر
  const { password: _, ...userData } = newUser;
  res.status(201).json({ message: 'تم إنشاء الحساب بنجاح', token, user: userData });
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'من فضلك أدخل البريد وكلمة المرور' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();

  const userEntry = Object.values(users).find(u => u.email === cleanEmail);
  if (!userEntry) {
    return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
  }

  const isPasswordValid = await bcrypt.compare(password, userEntry.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
  }

  const token = jwt.sign(
    { uid: userEntry.uid, email: cleanEmail, username: userEntry.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const { password: _, ...userData } = userEntry;
  res.json({ message: 'تم تسجيل الدخول بنجاح', token, user: userData });
});

// جلب بروفايل المستخدم الحالي
app.get('/api/user/me', verifyUserToken, (req, res) => {
  const users = readUsers();
  const user = users[req.user.uid];
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

  const { password: _, ...userData } = user;
  res.json(userData);
});

// تحديث بيانات المستخدم (الاسم، الهاتف، الكوينز)
app.put('/api/user/me', verifyUserToken, (req, res) => {
  const { username, phone, coinsDelta, winInc, lossInc } = req.body;
  const users = readUsers();
  const user = users[req.user.uid];
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

  if (username) user.username = username.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (typeof coinsDelta === 'number') user.coins = Math.max(0, (user.coins || 0) + coinsDelta);

  if (winInc) {
    user.stats = user.stats || {};
    user.stats.wins = (user.stats.wins || 0) + 1;
    user.stats.dailyWins = (user.stats.dailyWins || 0) + 1;
    user.stats.weeklyWins = (user.stats.weeklyWins || 0) + 1;
    user.stats.monthlyWins = (user.stats.monthlyWins || 0) + 1;
  }
  if (lossInc) {
    user.stats = user.stats || {};
    user.stats.losses = (user.stats.losses || 0) + 1;
  }

  users[req.user.uid] = user;
  writeUsers(users);

  const { password: _, ...userData } = user;
  res.json({ message: 'تم التحديث بنجاح', user: userData });
});

// ============================================================
// 2. قائمة المتصدرين (Leaderboard API)
// ============================================================
app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type || 'weekly'; // daily, weekly, monthly, all
  const users = readUsers();

  const list = Object.values(users).map(u => ({
    uid: u.uid,
    username: u.username || 'لاعب',
    photoURL: u.photoURL,
    wins: type === 'daily'
      ? (u.stats?.dailyWins || 0)
      : type === 'monthly'
      ? (u.stats?.monthlyWins || 0)
      : type === 'all'
      ? (u.stats?.wins || 0)
      : (u.stats?.weeklyWins || 0),
    coins: u.coins || 0,
  }));

  list.sort((a, b) => b.wins - a.wins || b.coins - a.coins);
  res.json(list.slice(0, 50));
});

// ============================================================
// 3. كروت اللعبة واللاعبين المحفوظين (Custom Cards & Players)
// ============================================================

// جلب الكروت الخاصة
app.get('/api/custom-cards', (req, res) => {
  const customCards = readCustomCards();
  res.json(customCards);
});

// جلب قائمة اللاعبين
app.get('/api/players', (req, res) => {
  const players = readGamePlayers();
  res.json(players);
});

// ============================================================
// 4. لوحة تحكم الآدمن
// ============================================================
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>لوحة تحكم Embabi Games - VPS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #050B20; color: #fff; padding: 20px; }
    h1 { color: #eab308; text-align: center; margin-bottom: 20px; font-size: 26px; }
    h2 { color: #22c55e; margin-bottom: 12px; }
    .box { max-width: 800px; margin: 20px auto; background: #0f172a; padding: 20px; border-radius: 14px; border: 1px solid #1e293b; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #1e293b; padding: 15px; border-radius: 10px; text-align: center; border: 1px solid #334155; }
    .stat-num { font-size: 28px; font-weight: bold; color: #eab308; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #334155; }
    th { background: #1e293b; color: #22c55e; }
  </style>
</head>
<body>
  <h1>🎮 لوحة تحكم Embabi Games - VPS</h1>
  <div class="box">
    <h2>📊 إحصائيات السيرفر المباشرة</h2>
    <div class="stat-grid" id="stats">
      <div class="stat-card"><div>عدد المستخدمين</div><div class="stat-num" id="usersCount">...</div></div>
      <div class="stat-card"><div>كروت التخمين</div><div class="stat-num" id="cardsCount">...</div></div>
      <div class="stat-card"><div>قاعدة اللاعبين</div><div class="stat-num" id="playersCount">...</div></div>
    </div>
    <h2>👥 أحدث اللاعبين المسجلين</h2>
    <table>
      <thead><tr><th>الاسم</th><th>البريد</th><th>الكوينز</th><th>الفوز</th></tr></thead>
      <tbody id="usersList"><tr><td colspan="4">جاري التحميل...</td></tr></tbody>
    </table>
  </div>
  <script>
    async function loadData() {
      const resUsers = await fetch('/api/leaderboard?type=all');
      const users = await resUsers.json();
      const resCards = await fetch('/api/custom-cards');
      const cards = await resCards.json();
      const resPlayers = await fetch('/api/players');
      const players = await resPlayers.json();

      document.getElementById('usersCount').innerText = users.length;
      document.getElementById('cardsCount').innerText = cards.length;
      document.getElementById('playersCount').innerText = players.length;

      let html = '';
      users.slice(0, 15).forEach(u => {
        html += '<tr><td>' + u.username + '</td><td>' + (u.uid) + '</td><td>' + u.coins + ' 🪙</td><td>' + u.wins + ' 🏆</td></tr>';
      });
      document.getElementById('usersList').innerHTML = html || '<tr><td colspan="4">لا يوجد لاعبين بعد</td></tr>';
    }
    loadData();
  </script>
</body>
</html>
  `);
});

// آدمن Login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username, isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
  }
});

// ============================================================
// 5. محرك اللعب أونلاين والمزاد (Socket.IO Matchmaking & Rooms)
// ============================================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const waitingQueue = {}; // { [socketId]: { uid, username, mode, card, league } }
const activeRooms = {};  // { [roomId]: roomData }

io.on('connection', (socket) => {
  console.log('🟢 لاعب اتصل بالسيرفر:', socket.id);

  // 1. الدخول في طابور البحث عن خصم (Matchmaking)
  socket.on('join_matchmaking', (playerData) => {
    const { uid, username, mode, card, league } = playerData;
    console.log(`🔍 لاعب يبحث عن مباراة: ${username} (${mode} / ${league})`);

    // البحث عن خصم متطابق
    const opponentSocketId = Object.keys(waitingQueue).find(sId => {
      const p = waitingQueue[sId];
      return p.uid !== uid && p.mode === mode && p.card === card && p.league === league;
    });

    if (opponentSocketId) {
      // تم إيجاد خصم!
      const opp = waitingQueue[opponentSocketId];
      delete waitingQueue[opponentSocketId];

      const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const seed = Math.floor(Math.random() * 999999);

      const roomData = {
        roomId,
        mode,
        card,
        league,
        seed,
        createdAt: Date.now(),
        players: {
          [uid]: { username, socketId: socket.id, role: 'player1' },
          [opp.uid]: { username: opp.username, socketId: opponentSocketId, role: 'player2' },
        },
        gameState: {
          currentBid: 0,
          highestBidder: null,
          budgets: { [uid]: 1000, [opp.uid]: 1000 },
          teams: { [uid]: [], [opp.uid]: [] },
        }
      };

      activeRooms[roomId] = roomData;

      // إشعار الطرفين
      socket.join(roomId);
      const oppSocket = io.sockets.sockets.get(opponentSocketId);
      if (oppSocket) oppSocket.join(roomId);

      socket.emit('match_found', { roomId, role: 'player1', mode, league, card, opponent: opp.username, seed });
      if (oppSocket) {
        oppSocket.emit('match_found', { roomId, role: 'player2', mode, league, card, opponent: username, seed });
      }

      console.log(`🎮 تم بدء الغرفة ${roomId} بين ${username} و ${opp.username}`);
    } else {
      // إضافة لطابور الانتظار
      waitingQueue[socket.id] = { uid, username, mode, card, league };
    }
  });

  // إلغاء البحث
  socket.on('leave_matchmaking', () => {
    delete waitingQueue[socket.id];
  });

  // الانضمام لغرفة مزاد قائمة
  socket.on('join_auction_room', (roomId) => {
    socket.join(roomId);
    if (activeRooms[roomId]) {
      socket.emit('room_sync', activeRooms[roomId]);
    }
  });

  // وضع مزايدة (Bid)
  socket.on('place_bid', ({ roomId, uid, username, bidAmount }) => {
    const room = activeRooms[roomId];
    if (!room) return;

    if (bidAmount > (room.gameState.currentBid || 0)) {
      room.gameState.currentBid = bidAmount;
      room.gameState.highestBidder = { uid, username, bidAmount };
      io.to(roomId).emit('bid_updated', room.gameState.highestBidder);
    }
  });

  // مزامنة حالة اللعبة
  socket.on('sync_game_action', ({ roomId, action, payload }) => {
    socket.to(roomId).emit('game_action_received', { action, payload });
  });

  // عند انقطاع الاتصال
  socket.on('disconnect', () => {
    delete waitingQueue[socket.id];
    console.log('🔴 لاعب غادر:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت ${PORT}`);
  console.log(`🔐 لوحة التحكم: http://localhost:${PORT}/admin`);
});
