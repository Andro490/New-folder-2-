const fs = require('fs');

const file = 'c:\\Users\\SMART\\Desktop\\New folder (2)\\mobile\\src\\app\\online-auction.tsx';
let content = fs.readFileSync(file, 'utf8');

const components = `
const COACHES = [
  { id: 1, name: "José Mourinho",   emoji: "🧔", price: 40, bonus: 0.30, level: "مميز جداً",  desc: "خبير التكتيك الدفاعي" },
  { id: 2, name: "Pep Guardiola",   emoji: "👨‍🦲", price: 30, bonus: 0.22, level: "مميز",      desc: "أسطورة كرة الضغط" },
  { id: 3, name: "Zinedine Zidane", emoji: "⭐", price: 20, bonus: 0.15, level: "جيد جداً",  desc: "قائد الأبطال" },
  { id: 4, name: "Carlo Ancelotti",emoji: "🎩", price: 10, bonus: 0.08, level: "جيد",      desc: "المدرب المتوازن" },
  { id: 5, name: "مدرب مجاني",     emoji: "🧑‍🏫", price: 0,  bonus: 0.00, level: "مجاني",    desc: "بدون مدرب" },
];

function CoachScreen({ budget, onSelect }: { budget: number; onSelect: (bonus: number, coachName: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const affordable = COACHES.filter(c => c.price <= budget);
  return (
    <View style={{ flex: 1, backgroundColor: "#060614" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ color: "#facc15", fontSize: 22, fontWeight: "900" }}>🏟️ اختر مدربك</Text>
          <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>ميزانيتك الباقية: <Text style={{ color: "#22c55e", fontWeight: "bold" }}>{budget}M</Text></Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          {COACHES.map(coach => {
            const canAfford = coach.price <= budget;
            const isSelected = selected === coach.id;
            return (
              <TouchableOpacity key={coach.id} disabled={!canAfford} onPress={() => setSelected(coach.id)} style={[{ backgroundColor: isSelected ? "#1e3a5f" : "#0f172a", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: isSelected ? "#3b82f6" : canAfford ? "#1e293b" : "#1e293b", opacity: canAfford ? 1 : 0.4, flexDirection: "row", alignItems: "center" }]}>
                <Text style={{ fontSize: 36, marginRight: 14 }}>{coach.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{coach.name}</Text>
                    <View style={{ backgroundColor: coach.price === 0 ? "#374151" : "#166534", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ color: coach.price === 0 ? "#9ca3af" : "#86efac", fontSize: 12, fontWeight: "bold" }}>{coach.price === 0 ? "مجاني" : coach.price + "M"}</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{coach.desc}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <View style={{ backgroundColor: "#1e3a5f", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 }}><Text style={{ color: "#60a5fa", fontSize: 11 }}>{coach.level}</Text></View>
                    {coach.bonus > 0 && <Text style={{ color: "#facc15", fontSize: 11 }}>+{Math.round(coach.bonus * 100)}% قوة الفريق</Text>}
                  </View>
                </View>
                {isSelected && <Text style={{ fontSize: 20, marginLeft: 8 }}>✅</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <TouchableOpacity style={[{ backgroundColor: selected !== null ? "#f59e0b" : "#374151", borderRadius: 16, padding: 16, alignItems: "center" }]} disabled={selected === null} onPress={() => { const coach = COACHES.find(c => c.id === selected); if (coach) onSelect(coach.bonus, coach.name); }}>
            <Text style={{ color: selected !== null ? "#000" : "#6b7280", fontWeight: "bold", fontSize: 16 }}>{selected !== null ? "⚽ ابدأ المباراة!" : "اختر مدرباً أولاً"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function MatchScreen({ myTeam, aiTeam, myBudget, aiBudget, allPlayers, coachBonus, coachName, opponentName, onFinish }: any) {
  const myPlayers = Object.values(myTeam).filter(n => n && n !== "—") as string[];
  const aiPlayers = Object.values(aiTeam).filter(n => n && n !== "—") as string[];

  const calcAvgRating = (players: string[], allP: any[]) => {
    if (players.length === 0) return 75;
    const ratings = players.map(name => {
      const p = allP.find((x: any) => x.name === name);
      return p ? p.rating : 78;
    });
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  const simGoals = (players: string[], allP: any[], bonus = 0) => {
    let goals = 0;
    players.forEach(name => {
      const p = allP.find((x: any) => x.name === name);
      const rating = p ? p.rating : 78;
      const baseChance = Math.max(0.05, (rating - 70) / 120);
      const boostedChance = Math.min(0.9, baseChance * (1 + bonus));
      if (Math.random() < boostedChance) goals++;
    });
    if (Math.random() < 0.12) goals++; 
    return goals;
  };

  const bonus = coachBonus ?? 0;
  const [{ myGoals, aiGoals }] = useState(() => {
    let mGoals = simGoals(myPlayers, allPlayers, bonus);
    let aGoals = simGoals(aiPlayers, allPlayers, 0);

    if (mGoals === aGoals) {
      const myRating = calcAvgRating(myPlayers, allPlayers) + (bonus * 10);
      const aiRating = calcAvgRating(aiPlayers, allPlayers);
      if (myRating > aiRating) mGoals += 1;
      else if (aiRating > myRating) aGoals += 1;
      else Math.random() > 0.5 ? mGoals += 1 : aGoals += 1;
    }
    return { myGoals: mGoals, aiGoals: aGoals };
  });

  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const allEvents = useRef((() => {
    const evs: any[] = [];
    const myMins = Array.from({ length: myGoals }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b);
    const aiMins = Array.from({ length: aiGoals }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b);
    myMins.forEach(min => evs.push({ min, scorer: myPlayers[Math.floor(Math.random() * (myPlayers.length || 1))] || "لاعبك", team: "me" }));
    aiMins.forEach(min => evs.push({ min, scorer: aiPlayers[Math.floor(Math.random() * (aiPlayers.length || 1))] || "opp", team: "ai" }));
    return evs.sort((a, b) => a.min - b.min);
  })()).current;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: 100, duration: 6000, useNativeDriver: false }).start(() => setDone(true));
    let revealed = 0;
    const interval = setInterval(() => {
      const curr = allEvents[revealed];
      if (!curr) { clearInterval(interval); return; }
      setEvents(prev => [...prev, curr]);
      revealed++;
      if (revealed >= allEvents.length) clearInterval(interval);
    }, 6000 / Math.max(allEvents.length + 1, 1));
    const prog = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 120);
    return () => { clearInterval(interval); clearInterval(prog); };
  }, []);

  const iWon = myGoals > aiGoals;
  const isDraw = myGoals === aiGoals;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a1a" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ color: "#facc15", fontSize: 18, fontWeight: "bold" }}>⚽ محاكاة المباراة</Text>
          <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>راقب النتيجة واللحظات المباشرة</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginHorizontal: 16, backgroundColor: "#1e293b", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#334155" }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", marginBottom: 6 }}><Text style={{ fontSize: 24 }}>👾</Text></View>
            <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>{opponentName}</Text>
            <Text style={{ color: aiGoals > myGoals ? "#22c55e" : "#fff", fontSize: 40, fontWeight: "900" }}>{aiGoals}</Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}><Text style={{ color: "#475569", fontWeight: "bold", fontSize: 18 }}>V</Text></View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#3b82f6", justifyContent: "center", alignItems: "center", marginBottom: 6 }}><Text style={{ fontSize: 24 }}>👤</Text></View>
            <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>فريقك</Text>
            <Text style={{ color: myGoals > aiGoals ? "#22c55e" : "#fff", fontSize: 40, fontWeight: "900" }}>{myGoals}</Text>
          </View>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: "#1e293b", borderRadius: 10, overflow: "hidden", height: 10 }}>
            <Animated.View style={{ height: 10, borderRadius: 10, backgroundColor: "#22c55e", width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }} />
          </View>
          <Text style={{ color: "#64748b", fontSize: 11, textAlign: "center", marginTop: 4 }}>{done ? "نهاية المباراة · 100%" : "الشوط الأول · " + progress + "%"}</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "bold", marginBottom: 8, textAlign: "right" }}>لحظات مباشرة</Text>
          <ScrollView>
            {events.map((ev, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: ev.team === "me" ? "flex-end" : "flex-start", marginBottom: 8, alignItems: "center" }}>
                {ev.team === "ai" && <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#ef444430", justifyContent: "center", alignItems: "center", marginRight: 8 }}><Text style={{ fontSize: 14 }}>⚽</Text></View>}
                <View style={{ backgroundColor: ev.team === "me" ? "#3b82f620" : "#ef444420", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: ev.team === "me" ? "#3b82f6" : "#ef4444" }}>
                  <Text style={{ color: ev.team === "me" ? "#3b82f6" : "#ef4444", fontSize: 12, fontWeight: "bold" }}>{ev.team === "ai" ? opponentName : "فريقك"}</Text>
                  <Text style={{ color: "#fff", fontSize: 13 }}>{ev.scorer} ⚽ {ev.min}'</Text>
                </View>
                {ev.team === "me" && <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#3b82f630", justifyContent: "center", alignItems: "center", marginLeft: 8 }}><Text style={{ fontSize: 14 }}>⚽</Text></View>}
              </View>
            ))}
          </ScrollView>
        </View>
        {done && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{ backgroundColor: iWon ? "#22c55e20" : isDraw ? "#f59e0b20" : "#ef444420", borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: iWon ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444" }}>
              <Text style={{ fontSize: 28 }}>{iWon ? "🏆" : isDraw ? "🤝" : "😢"}</Text>
              <Text style={{ color: iWon ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444", fontSize: 20, fontWeight: "900", marginTop: 4 }}>{iWon ? "فزت!" : isDraw ? "تعادل!" : "خسرت!"}</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" }} onPress={onFinish}>
              <Text style={{ color: "#94a3b8", fontWeight: "bold", fontSize: 14 }}>🏠 الرئيسية</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
`;

content = content.replace("export default function OnlineAuction() {", components + "\nexport default function OnlineAuction() {");

content = content.replace(
  'const [phase, setPhase] = useState<"bid" | "result" | "end">("bid");',
  'const [phase, setPhase] = useState<"bid" | "result" | "end" | "coach" | "match">("bid");\n  const [coachBonus, setCoachBonus] = useState(0);\n  const [coachName, setCoachName] = useState("");'
);

content = content.replace(
  '<Text style={styles.endStatVs}>VS</Text>',
  '<Text style={styles.endStatVs}>VS</Text>'
);

content = content.replace(
  '<TouchableOpacity style={styles.endBtn} onPress={() => {',
  `<TouchableOpacity style={[styles.endBtn, { backgroundColor: "#f59e0b", marginBottom: 12 }]} onPress={() => setPhase("coach")}>
            <Text style={styles.endBtnText}>🏟️ اختر مدربك وابدأ المباراة!</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.endBtn, { backgroundColor: "#1e293b" }]} onPress={() => {`
);

content = content.replace(
  'if (phase === "end") {',
  `if (phase === "match") {
    return (
      <MatchScreen myTeam={myTeam} aiTeam={opponentTeam} myBudget={myBudget} aiBudget={opponentBudget} allPlayers={playersData} coachBonus={coachBonus} coachName={coachName} opponentName={opponentName} onFinish={() => router.replace("/")} />
    );
  }

  if (phase === "coach") {
    return (
      <CoachScreen budget={myBudget} onSelect={(bonus, name) => { setCoachBonus(bonus); setCoachName(name); setPhase("match"); }} />
    );
  }

  if (phase === "end") {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Match simulation added!');
