import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView, ImageBackground, Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, database } from "../firebase";
import { ref, onValue, update, remove, increment } from "firebase/database";
import playersData from "../assets/players.json";
import { playSoundEffect, triggerVibration, setMusicVolume, setMusicMuted, getMusicVolume, getMusicMuted } from "../hooks/useSound";
import { getMatchResult, getAiMaxBid } from "../utils/gemini";
import { Ionicons } from '@expo/vector-icons';
import WildcardScreen from "../components/WildcardScreen";

const { width, height } = Dimensions.get("window");

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildGameData(seed: number, isClassic: boolean, leagueId?: string) {
  const seededRnd = (n: number) => { const x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
  
  let basePlayers = playersData;
  if (leagueId && leagueId !== 'all') {
    basePlayers = playersData.filter(p => p.cardType === leagueId);
    if (basePlayers.length === 0) basePlayers = playersData; // fallback
  }

  const allPlayers = [...basePlayers];
  const sorted = allPlayers.sort((a, b) => seededRnd(a.overallRating + a.name.charCodeAt(0)) - seededRnd(b.overallRating + b.name.charCodeAt(0)));

  const reqPos = isClassic
    ? ["GK", "CB", "CMF", "AMF", "CF"]
    : ["GK", "CB", "CB", "RB", "LB", "DMF", "AMF", "AMF", "LWF", "RWF", "CF"];

  const formation = isClassic
    ? [
        { key: "GK",  label: "GK",  x: 0.1,  y: 0.5 },
        { key: "CB",  label: "CB",  x: 0.3,  y: 0.5 },
        { key: "CMF", label: "CMF", x: 0.5,  y: 0.5 },
        { key: "AMF", label: "AMF", x: 0.7,  y: 0.5 },
        { key: "CF",  label: "CF",  x: 0.9,  y: 0.5 },
      ]
    : [
        { key: "GK",   label: "GK",  x: 0.05, y: 0.5  },
        { key: "CB1",  label: "CB",  x: 0.20, y: 0.35 },
        { key: "CB2",  label: "CB",  x: 0.20, y: 0.65 },
        { key: "LB",   label: "LB",  x: 0.25, y: 0.15 },
        { key: "RB",   label: "RB",  x: 0.25, y: 0.85 },
        { key: "DMF",  label: "DMF", x: 0.40, y: 0.5  },
        { key: "AMF1", label: "AMF", x: 0.60, y: 0.3  },
        { key: "AMF2", label: "AMF", x: 0.60, y: 0.7  },
        { key: "LWF",  label: "LWF", x: 0.80, y: 0.15 },
        { key: "RWF",  label: "RWF", x: 0.80, y: 0.85 },
        { key: "CF",   label: "CF",  x: 0.85, y: 0.5  },
      ];

  const list: any[] = [];
  const usedIds = new Set();
  reqPos.forEach((pos, idx) => {
    let p = sorted.find(x => x.position === pos && !usedIds.has(x.id));
    if (!p) p = sorted.find(x => !usedIds.has(x.id));
    if (p) {
      usedIds.add(p.id);
      list.push({ id: idx + 1, name: p.name, position: pos, rating: p.overallRating, basePrice: Math.max(5, p.overallRating - 80), imageUrl: p.imageUrl });
    }
  });

  const backupPlayers: any = {};
  const backupPool = [...basePlayers].filter(p => !usedIds.has(p.id));
  backupPool.forEach(p => {
    if (!backupPlayers[p.position]) backupPlayers[p.position] = [];
    backupPlayers[p.position].push({ name: p.name, rating: p.overallRating, flag: p.team, position: p.position, imageUrl: p.imageUrl });
  });

  ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'].forEach(pos => {
    if (!backupPlayers[pos] || backupPlayers[pos].length === 0) {
      // Try same position from ALL players (any cardType)
      const samePositionFallback = playersData.find(p => p.position === pos && !usedIds.has(p.id));
      if (samePositionFallback) {
        backupPlayers[pos] = [{ name: samePositionFallback.name, rating: samePositionFallback.overallRating, flag: samePositionFallback.team, position: pos, imageUrl: samePositionFallback.imageUrl }];
      } else {
        // Last resort: any remaining player
        const fallbackPlayer = backupPool.length > 0 ? backupPool[0] : basePlayers[0];
        if (fallbackPlayer) {
          backupPlayers[pos] = [{ name: fallbackPlayer.name, rating: fallbackPlayer.overallRating, flag: fallbackPlayer.team, position: fallbackPlayer.position, imageUrl: fallbackPlayer.imageUrl }];
        } else {
          backupPlayers[pos] = [{ name: 'Backup', rating: 80, flag: 'Unknown', position: pos }];
        }
      }
    }
  });

  return { list, formation, backupPlayers };
}

function PitchView({ players, color, formation, activeIdx, label }: { players: string[]; color: string; formation: any[]; activeIdx?: number; label?: string }) {
  const pitchW = width - 32; // full width
  const pitchH = pitchW * 0.42; // landscape aspect ratio
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
      {label && <Text style={{ color, fontSize: 12, fontWeight: "bold", marginBottom: 4, textAlign: "center" }}>{label}</Text>}
      <View style={[styles.pitchWrapper, { borderColor: color + "88", width: pitchW, height: pitchH }]}>
        <View style={[styles.pitch, { backgroundColor: color + "12", width: pitchW, height: pitchH }]}>
          {/* Center line */}
          <View style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.5, backgroundColor: "rgba(255,255,255,0.25)" }} />
          {/* Center circle */}
          <View style={{ position: "absolute", top: pitchH / 2 - 20, left: pitchW / 2 - 20, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" }} />
          {/* Goal boxes */}
          <View style={{ position: "absolute", left: 0, top: pitchH * 0.25, width: 20, height: pitchH * 0.5, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", borderLeftWidth: 0 }} />
          <View style={{ position: "absolute", right: 0, top: pitchH * 0.25, width: 20, height: pitchH * 0.5, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", borderRightWidth: 0 }} />
          {formation.map((pos, i) => {
            const isActive = i === activeIdx;
            const playerName = players[i];
            const hasPlayer = playerName && playerName !== "—";
            const pData = hasPlayer ? playersData.find(x => x.name === playerName) : null;
            const dotSize = 28;
            return (
              <View key={pos.key} style={[styles.pitchDot, {
                left: pos.x * pitchW - dotSize / 2,
                top: pos.y * pitchH - dotSize / 2,
                width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                borderColor: isActive ? "#facc15" : (hasPlayer ? color : "rgba(255,255,255,0.3)"),
                backgroundColor: isActive ? "rgba(250,204,21,0.6)" : (hasPlayer ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.4)"),
                transform: isActive ? [{ scale: 1.25 }] : [{ scale: 1 }],
                zIndex: isActive ? 10 : 1,
                borderWidth: hasPlayer ? 2 : 1,
                overflow: "hidden"
              }]}>
                {hasPlayer && pData?.imageUrl ? (
                  <Image source={{ uri: pData.imageUrl }} style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2 }} resizeMode="cover" />
                ) : hasPlayer ? (
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "bold" }}>{pData?.overallRating || "✓"}</Text>
                ) : (
                  <Text style={[styles.pitchDotText, isActive && { color: "#000" }]}>{pos.label}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}


const BID_STEP = 1;


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
  const [matchData, setMatchData] = useState<{ myGoals: number; aiGoals: number; commentary: string } | null>(null);

  useEffect(() => {
    async function simulate() {
      const normalize = (p: any) => ({ name: p.name, rating: p.overallRating || p.rating || 78, position: p.position });
      const myPlayerObjects = myPlayers.map(name => normalize(allPlayers.find((x: any) => x.name === name) || { name, overallRating: 78 }));
      const aiPlayerObjects = aiPlayers.map(name => normalize(allPlayers.find((x: any) => x.name === name) || { name, overallRating: 78 }));
      
      const res = await getMatchResult("فريقك", myPlayerObjects, bonus, opponentName, aiPlayerObjects, 0);
      setMatchData({ myGoals: res.teamAGoals, aiGoals: res.teamBGoals, commentary: res.commentary });
    }
    simulate();
  }, []);

  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!matchData) return;

    const { myGoals, aiGoals } = matchData;
    const evs: any[] = [];
    const myMins = Array.from({ length: myGoals }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b);
    const aiMins = Array.from({ length: aiGoals }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b);
    myMins.forEach(min => evs.push({ min, scorer: myPlayers[Math.floor(Math.random() * (myPlayers.length || 1))] || "لاعبك", team: "me" }));
    aiMins.forEach(min => evs.push({ min, scorer: aiPlayers[Math.floor(Math.random() * (aiPlayers.length || 1))] || "opp", team: "ai" }));
    const allEvs = evs.sort((a, b) => a.min - b.min);

    Animated.timing(progressAnim, { toValue: 100, duration: 6000, useNativeDriver: false }).start(() => {
      setDone(true);
      playSoundEffect(myGoals > aiGoals ? 'win-match' : 'lost-match');
    });

    let revealed = 0;
    const interval = setInterval(() => {
      const curr = allEvs[revealed];
      if (!curr) { clearInterval(interval); return; }
      setEvents(prev => [...prev, curr]);
      revealed++;
      if (revealed >= allEvs.length) clearInterval(interval);
    }, 6000 / Math.max(allEvs.length + 1, 1));

    const prog = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 120);

    return () => { clearInterval(interval); clearInterval(prog); };
  }, [matchData]);

  if (!matchData) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a1a", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#facc15", fontSize: 18, fontWeight: "bold" }}>الذكاء الاصطناعي يحلل التشكيلات...</Text>
      </View>
    );
  }

  const { myGoals, aiGoals, commentary } = matchData;

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
          {done && (
             <View style={{ backgroundColor: "#1e293b", padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#3b82f6" }}>
                <Text style={{ color: "#3b82f6", fontWeight: "bold", marginBottom: 4, textAlign: "right" }}>تحليل AI للمباراة:</Text>
                <Text style={{ color: "#fff", fontSize: 13, textAlign: "right", lineHeight: 20 }}>{commentary}</Text>
             </View>
          )}
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
            <TouchableOpacity style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" }} onPress={() => onFinish(iWon ? 'win' : isDraw ? 'draw' : 'loss')}>
              <Text style={{ color: "#94a3b8", fontWeight: "bold", fontSize: 14 }}>🏠 الرئيسية</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

export default function OnlineAuction() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roomId = params.roomId as string;
  const myRole = params.role as string;
  const mode = params.mode || "3";
  const card = (params.card as string) || "4";
  const isClassic = mode === "3";
  const isBot = params.bot === "true";
  const botName = (params.botName as string) || "AhmedFUT99";
  const uid = auth.currentUser?.uid!;
  const myUsername = auth.currentUser?.displayName || "لاعب";
  const BOT_UID = "bot_opponent";

  // ── Record online match result in Firebase ────────────────
  const statsRecordedRef = useRef(false);
  async function recordOnlineMatchResult(result: 'win' | 'loss' | 'draw') {
    if (statsRecordedRef.current || isBot) return;
    statsRecordedRef.current = true;
    const playerRef = ref(database, `players/${uid}`);
    const updates: any = {
      'stats/totalMatches': increment(1),
    };
    if (result === 'win') {
      updates['stats/wins'] = increment(1);
      updates['stats/dailyWins'] = increment(1);
      updates['stats/weeklyWins'] = increment(1);
      updates['stats/monthlyWins'] = increment(1);
      updates['coins'] = increment(10);
    } else if (result === 'loss') {
      updates['stats/losses'] = increment(1);
    } else {
      updates['stats/draws'] = increment(1);
    }
    try {
      await update(playerRef, updates);
    } catch (e) {
      console.log('Failed to record stats:', e);
    }
  }

  const [roomData, setRoomData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [formation, setFormation] = useState<any[]>([]);
  const [opponentName, setOpponentName] = useState(isBot ? botName : "...");
  const [playerIdx, setPlayerIdx] = useState(0);

  const BUDGET_TOTAL = isClassic ? 100 : 200;
  const [myBudget, setMyBudget] = useState(BUDGET_TOTAL);
  const [opponentBudget, setOpponentBudget] = useState(BUDGET_TOTAL);
  const [myTeam, setMyTeam] = useState<string[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<string[]>([]);
  const [phase, setPhase] = useState<"bid" | "result" | "end" | "coach" | "match" | "wildcard">("bid");
  const [coachBonus, setCoachBonus] = useState(0);
  const [coachName, setCoachName] = useState("");
  const [currentBid, setCurrentBid] = useState(0);
  const [myBidAttempt, setMyBidAttempt] = useState(0);
  const [whoseTurn, setWhoseTurn] = useState<string>("");
  const [lastRaiser, setLastRaiser] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [resultWinner, setResultWinner] = useState<"me" | "opp" | null>(null);
  const [surrendered, setSurrendered] = useState(false);
  const oppSurrendered = roomData?.game?.surrenderedBy && roomData.game.surrenderedBy !== uid;
  const iSurrendered = surrendered || roomData?.game?.surrenderedBy === uid;
  const [countdown, setCountdown] = useState(30);
  const botBudgetRef = useRef(BUDGET_TOTAL);

  const [backupPlayersData, setBackupPlayersData] = useState<any>({});
  const [auctionResultInfo, setAuctionResultInfo] = useState<any>(null);
  
  const [volMode, setVolMode] = useState<number>(getMusicMuted() ? 0 : getMusicVolume() > 0.3 ? 2 : 1);
  const toggleVolume = async () => {
    if (volMode === 2) {
      setVolMode(1);
      await setMusicMuted(false);
      await setMusicVolume(0.2);
    } else if (volMode === 1) {
      setVolMode(0);
      await setMusicMuted(true);
    } else {
      setVolMode(2);
      await setMusicMuted(false);
      await setMusicVolume(0.5);
    }
  };

  const fadeCard  = useRef(new Animated.Value(1)).current;
  const scaleCard = useRef(new Animated.Value(1)).current;
  const bidPulse  = useRef(new Animated.Value(1)).current;
  const aiDotAnim = useRef(new Animated.Value(1)).current;
  
  const resCard1Anim = useRef(new Animated.Value(height)).current;
  const resCard2Anim = useRef(new Animated.Value(height)).current;
  
  const roomRef   = useRef(isBot ? null : ref(database, `rooms/${roomId}`));

  const isMyTurn  = whoseTurn === uid;
  const isBotTurn = isBot && whoseTurn === BOT_UID;
  const currentPlayer = players[playerIdx];
  const canConfirm = myBidAttempt > currentBid && myBidAttempt <= myBudget;
  const canAddMore = (myBidAttempt + BID_STEP) <= myBudget;

  useEffect(() => {
    if (!isMyTurn) {
      Animated.loop(Animated.sequence([
        Animated.timing(aiDotAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(aiDotAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      aiDotAnim.stopAnimation();
      aiDotAnim.setValue(1);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (isBot || !roomRef.current) return;
    const unsub = onValue(roomRef.current, (snap) => {
      const data = snap.val();
      if (!data) return;
      setRoomData(data);
      const oppUid = Object.keys(data.players || {}).find(k => k !== uid);
      if (oppUid) {
        setOpponentName(data.players[oppUid]?.username || "خصم");
        setOpponentBudget(data.game?.budgets?.[oppUid] ?? BUDGET_TOTAL);
        setOpponentTeam(data.game?.teams?.[oppUid] ?? []);
      }
      setMyBudget(data.game?.budgets?.[uid] ?? BUDGET_TOTAL);
      setMyTeam(data.game?.teams?.[uid] ?? []);
      
      if (data.game?.backupPlayersData) {
        setBackupPlayersData(data.game.backupPlayersData);
      }
      
      if (data.game) {
        if (data.game.players && players.length === 0) setPlayers(data.game.players);
        
        setPlayerIdx(data.game.playerIdx ?? 0);
        setCurrentBid(data.game.currentBid ?? 0);
        setWhoseTurn(data.game.turn ?? "");
        setLastRaiser(data.game.lastRaiser ?? null);
        setMyBidAttempt((data.game.currentBid ?? 0) + BID_STEP);
        if (data.game.phase === "end") { setPhase("end"); setGameOver(true); }
        if (data.game.phase === "result") {
           setPhase("result");
           if (data.game.lastResult) {
             setAuctionResultInfo(data.game.lastResult);
             const winStatus = data.game.lastResult.winner === uid ? "me" : (data.game.lastResult.winner ? "opp" : null);
             setResultWinner(winStatus);
             if (winStatus === "me") {
               const mainRating = data.game.lastResult.mainPlayer?.overallRating || 0;
               const backupRating = data.game.lastResult.backupPlayer?.overallRating || 0;
               playSoundEffect(mainRating >= backupRating ? 'win' : 'lost');
               triggerVibration();
             }
             triggerResultAnimation();
           }
        } else if (data.game.phase === "bid") {
           setPhase("bid");
        }
      }
      if (data.game?.formation && formation.length === 0) setFormation(data.game.formation);
      if (data.status === "finished") setGameOver(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isBot) return;
    const seed = Math.floor(Math.random() * 999999);
    const leagueId = (params.league as string) || 'all';
    const { list, formation: f, backupPlayers } = buildGameData(seed, isClassic, leagueId);
    setBackupPlayersData(backupPlayers);
    setPlayers(list);
    setFormation(f);
    setCurrentBid(list[0]?.basePrice ?? 5);
    setMyBidAttempt((list[0]?.basePrice ?? 5) + BID_STEP);
    setWhoseTurn(uid);
    setLastRaiser(null);
    botBudgetRef.current = BUDGET_TOTAL;
  }, [isBot]);

  useEffect(() => {
    if (isBot || myRole !== "player1" || !roomData || roomData.game) return;
    const seed = roomData.seed ?? 42;
    const leagueId = (params.league as string) || 'all';
    const { list, formation: f, backupPlayers } = buildGameData(seed, isClassic, leagueId);
    setPlayers(list);
    setFormation(f);
    const oppUid = Object.keys(roomData.players || {}).find(k => k !== uid);
    const budgets: any = { [uid]: BUDGET_TOTAL };
    if (oppUid) budgets[oppUid] = BUDGET_TOTAL;
    const teams: any = { [uid]: [], };
    if (oppUid) teams[oppUid] = [];
    update(roomRef.current!, {
      "game/playerIdx": 0, "game/currentBid": list[0]?.basePrice ?? 5,
      "game/turn": uid, "game/lastRaiser": null, "game/phase": "bid",
      "game/budgets": budgets, "game/teams": teams,
      "game/players": list, "game/formation": f, "game/backupPlayersData": backupPlayers,
    });
  }, [roomData]);

  useEffect(() => {
    if (isBot || myRole !== "player1" || !roomData?.game) return;
    if (roomData.game.phase === "result") {
      const timer = setTimeout(() => {
        const nextIdx = roomData.game.playerIdx + 1;
        const oppUid = Object.keys(roomData.players || {}).find(k => k !== uid);
        const starterOfNext = nextIdx % 2 === 0 ? uid : (oppUid ?? uid);
        if (nextIdx >= players.length) {
          update(roomRef.current!, { "game/phase": "end" });
        } else {
          update(roomRef.current!, {
            "game/phase": "bid", "game/playerIdx": nextIdx,
            "game/currentBid": players[nextIdx]?.basePrice ?? 5,
            "game/lastRaiser": null, "game/turn": starterOfNext,
            "game/lastResult": null
          });
        }
      }, 5000); // Wait for animations
      return () => clearTimeout(timer);
    }
  }, [roomData?.game?.phase]);

  useEffect(() => {
    if (!isBot || !isBotTurn || phase !== "bid" || players.length === 0) return;
    const p = players[playerIdx];
    if (!p) return;

    let isCancelled = false;

    async function makeBotBid() {
      const maxBid = await getAiMaxBid(p.name, p.rating, p.position, p.flag || "", botBudgetRef.current, p.basePrice);
      if (isCancelled) return;

      const thinkTime = 800 + Math.random() * 1200;
      setTimeout(() => {
        if (isCancelled) return;
        const nextBid = currentBid + BID_STEP;
        if (nextBid <= maxBid && nextBid <= botBudgetRef.current) {
          pulseBidAnim();
          setCurrentBid(nextBid);
          setMyBidAttempt(nextBid + BID_STEP);
          setLastRaiser(BOT_UID);
          setWhoseTurn(uid);
        } else {
          botPass();
        }
      }, thinkTime);
    }

    makeBotBid();
    return () => { isCancelled = true; };
  }, [isBotTurn, phase, playerIdx, currentBid]);

  // ── Countdown timer (online only) ────────────────────────
  useEffect(() => {
    if (isBot || phase !== "bid") return;
    setCountdown(30); // reset on turn change
  }, [whoseTurn, playerIdx, phase]);

  // ── When MY timer runs out, opponent wins the player ────
  useEffect(() => {
    if (isBot || phase !== "bid" || !isMyTurn) return;
    if (countdown <= 0) {
      if (!roomRef.current || !currentPlayer || players.length === 0) return;
      const oppUid = Object.keys(roomData?.players || {}).find(k => k !== uid);
      if (!oppUid) return;
      const currentTeams = roomData?.game?.teams || {};
      const currentBudgets = roomData?.game?.budgets || {};

      if (lastRaiser === oppUid) {
        // Opponent had highest bid — they win, I get backup
        const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"] || [];
        const randomMe = backups.length > 0
          ? backups[Math.floor(Math.random() * backups.length)]
          : { name: "Backup", rating: 78, flag: "", position: currentPlayer.position, imageUrl: "" };
        const updatedMyTeam = [...(currentTeams[uid] || [])];
        updatedMyTeam[playerIdx] = randomMe.name;
        const updatedOppTeam = [...(currentTeams[oppUid] || [])];
        updatedOppTeam[playerIdx] = currentPlayer.name;
        const lastResult = { mainPlayer: currentPlayer, backupPlayer: randomMe, winner: oppUid };
        update(roomRef.current!, {
          "game/phase": "result",
          "game/lastResult": lastResult,
          [`game/teams/${uid}`]: updatedMyTeam,
          [`game/teams/${oppUid}`]: updatedOppTeam,
          [`game/budgets/${oppUid}`]: (currentBudgets[oppUid] ?? BUDGET_TOTAL) - currentBid,
        });
      } else if (lastRaiser === uid) {
        // I had highest bid — I win but no need to do anything, just wait.
        // Actually this case shouldn't happen since it's my turn to respond
        // Do nothing, let the other effect handle it
      } else {
        // No one bid — both get backup
        const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"] || [];
        const randomMe = backups.length > 0 ? backups[Math.floor(Math.random() * backups.length)] : { name: "Backup", rating: 78 };
        const randomOpp = backups.length > 0 ? backups[Math.floor(Math.random() * backups.length)] : { name: "Backup", rating: 78 };
        const updatedMyTeam = [...(currentTeams[uid] || [])];
        updatedMyTeam[playerIdx] = randomMe.name;
        const updatedOppTeam = [...(currentTeams[oppUid] || [])];
        updatedOppTeam[playerIdx] = randomOpp.name;

        const nextIdx = playerIdx + 1;
        const starterOfNext = nextIdx % 2 === 0 ? uid : oppUid;
        
        const payload: any = {
          [`game/teams/${uid}`]: updatedMyTeam,
          [`game/teams/${oppUid}`]: updatedOppTeam,
        };

        if (nextIdx >= players.length) {
          payload["game/phase"] = "end";
        } else {
          payload["game/phase"] = "bid";
          payload["game/playerIdx"] = nextIdx;
          payload["game/currentBid"] = players[nextIdx]?.basePrice ?? 5;
          payload["game/lastRaiser"] = null;
          payload["game/turn"] = starterOfNext;
          payload["game/lastResult"] = null;
        }
        update(roomRef.current!, payload);
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isMyTurn, phase, isBot]);
  // ── When OPPONENT timer runs out, I win the player ──────
  useEffect(() => {
    if (isBot || phase !== "bid" || isMyTurn) return;
    if (countdown <= 0) {
      if (!roomRef.current || !currentPlayer || players.length === 0) return;
      const oppUid = Object.keys(roomData?.players || {}).find(k => k !== uid);
      if (!oppUid) return;
      const currentBudgets = roomData?.game?.budgets || {};
      const currentTeams = roomData?.game?.teams || {};

      if (lastRaiser === uid) {
        // I had the highest bid — I win the player, opponent gets backup
        const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"] || [];
        const randomBackup = backups.length > 0
          ? backups[Math.floor(Math.random() * backups.length)]
          : { name: "Backup", rating: 78, flag: "", position: currentPlayer.position, imageUrl: "" };
        const updatedMyTeam = [...(currentTeams[uid] || [])];
        updatedMyTeam[playerIdx] = currentPlayer.name;
        const updatedOppTeam = [...(currentTeams[oppUid] || [])];
        updatedOppTeam[playerIdx] = randomBackup.name;
        const lastResult = { mainPlayer: currentPlayer, backupPlayer: randomBackup, winner: uid };
        update(roomRef.current!, {
          "game/phase": "result",
          "game/lastResult": lastResult,
          [`game/teams/${uid}`]: updatedMyTeam,
          [`game/teams/${oppUid}`]: updatedOppTeam,
          [`game/budgets/${uid}`]: (currentBudgets[uid] ?? BUDGET_TOTAL) - currentBid,
        });
      } else {
        // No one bid yet — both get backup
        const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"] || [];
        const randomMe = backups.length > 0 ? backups[Math.floor(Math.random() * backups.length)] : { name: "Backup", rating: 78 };
        const randomOpp = backups.length > 0 ? backups[Math.floor(Math.random() * backups.length)] : { name: "Backup", rating: 78 };
        const updatedMyTeam = [...(currentTeams[uid] || [])];
        updatedMyTeam[playerIdx] = randomOpp.name; // I am timer owner, so I didn't bid, opp also didn't bid. Wait, this is when OPPONENT timer runs out.
        // Actually, this block means NO ONE bid. Both get random backup.
        const updatedOppTeam = [...(currentTeams[oppUid] || [])];
        updatedOppTeam[playerIdx] = randomMe.name;

        const nextIdx = playerIdx + 1;
        const starterOfNext = nextIdx % 2 === 0 ? uid : (oppUid ?? uid);
        
        const payload: any = {
          [`game/teams/${uid}`]: updatedMyTeam,
          [`game/teams/${oppUid}`]: updatedOppTeam,
        };

        if (nextIdx >= players.length) {
          payload["game/phase"] = "end";
        } else {
          payload["game/phase"] = "bid";
          payload["game/playerIdx"] = nextIdx;
          payload["game/currentBid"] = players[nextIdx]?.basePrice ?? 5;
          payload["game/lastRaiser"] = null;
          payload["game/turn"] = starterOfNext;
          payload["game/lastResult"] = null;
        }
        update(roomRef.current!, payload);
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isMyTurn, phase, isBot]);


  function pulseBidAnim() {
    Animated.sequence([
      Animated.timing(bidPulse, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(bidPulse, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();
  }

  function triggerResultAnimation() {
    resCard1Anim.setValue(height);
    resCard2Anim.setValue(height);
    Animated.sequence([
      Animated.spring(resCard1Anim, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(resCard1Anim, { toValue: -height, duration: 400, useNativeDriver: true }),
      Animated.spring(resCard2Anim, { toValue: 0, friction: 6, useNativeDriver: true })
    ]).start();
  }

  function animateCardTransition(cb: () => void) {
    Animated.parallel([
      Animated.timing(fadeCard,  { toValue: 0,    duration: 250, useNativeDriver: true }),
      Animated.timing(scaleCard, { toValue: 0.85, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      cb();
      Animated.parallel([
        Animated.timing(fadeCard,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(scaleCard, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }

  function goNext(nextIdx: number, isMyStart: boolean) {
    if (nextIdx >= players.length) { setPhase("end"); setGameOver(true); return; }
    animateCardTransition(() => {
      setPlayerIdx(nextIdx);
      const np = players[nextIdx];
      setCurrentBid(np?.basePrice ?? 5);
      setMyBidAttempt((np?.basePrice ?? 5) + BID_STEP);
      setLastRaiser(null);
      setWhoseTurn(isMyStart ? uid : BOT_UID);
    });
  }

  function botPass() {
    const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"];
    if (lastRaiser === uid) {
      const randomOpp = backups[Math.floor(Math.random() * backups.length)];
      setResultWinner("me");
      playSoundEffect(currentPlayer.overallRating >= randomOpp.overallRating ? 'win' : 'lost');
      triggerVibration();
      setAuctionResultInfo({ mainPlayer: currentPlayer, backupPlayer: randomOpp, winner: uid });
      setMyTeam(prev => { const n = [...prev]; n[playerIdx] = currentPlayer?.name; return n; });
      setMyBudget(b => b - currentBid);
      setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = randomOpp.name; return n; });
    } else {
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      const randomOpp = backups[Math.floor(Math.random() * backups.length)];
      setResultWinner(null);
      setAuctionResultInfo(null);
      setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = randomOpp.name; return n; });
      setMyTeam(prev => { const n = [...prev]; n[playerIdx] = randomMe.name; return n; });
    }
    setPhase("result");
    if (lastRaiser === uid) triggerResultAnimation();
    setTimeout(() => {
      setPhase("bid");
      setResultWinner(null);
      goNext(playerIdx + 1, true);
    }, 5000);
  }

  function handleMyRaise() {
    if (!isMyTurn || !canConfirm) return;
    pulseBidAnim();
    if (isBot) {
      setCurrentBid(myBidAttempt);
      setMyBidAttempt(myBidAttempt + BID_STEP);
      setLastRaiser(uid);
      setWhoseTurn(BOT_UID);
    } else {
      const oppUid = Object.keys(roomData?.players || {}).find(k => k !== uid)!;
      update(roomRef.current!, { "game/currentBid": myBidAttempt, "game/turn": oppUid, "game/lastRaiser": uid });
    }
  }

  function handleMyPass() {
    if (!isMyTurn) return;

    if (isBot) {
      const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"];
      if (lastRaiser === BOT_UID) {
        const randomMe = backups[Math.floor(Math.random() * backups.length)];
        botBudgetRef.current -= currentBid;
        setOpponentBudget(botBudgetRef.current);
        setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = currentPlayer?.name; return n; });
        setMyTeam(prev => { const n = [...prev]; n[playerIdx] = randomMe.name; return n; });
        setResultWinner("opp");
        setAuctionResultInfo({ mainPlayer: currentPlayer, backupPlayer: randomMe, winner: BOT_UID });
      } else {
        const randomMe = backups[Math.floor(Math.random() * backups.length)];
        const randomOpp = backups[Math.floor(Math.random() * backups.length)];
        setResultWinner(null);
        setAuctionResultInfo(null);
        setOpponentTeam(prev => { const n = [...prev]; n[playerIdx] = randomOpp.name; return n; });
        setMyTeam(prev => { const n = [...prev]; n[playerIdx] = randomMe.name; return n; });
      }
      setPhase("result");
      if (lastRaiser === BOT_UID) triggerResultAnimation();
      setTimeout(() => {
        setPhase("bid");
        setResultWinner(null);
        goNext(playerIdx + 1, true);
      }, 5000);
      return;
    }

    const oppUid = Object.keys(roomData?.players || {}).find(k => k !== uid)!;
    const backups = backupPlayersData[currentPlayer.position] || backupPlayersData["CF"];
    
    if (lastRaiser === oppUid) {
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      const newBudgets = { ...roomData.game.budgets };
      newBudgets[oppUid] = (newBudgets[oppUid] ?? BUDGET_TOTAL) - currentBid;
      const newTeams = { ...roomData.game.teams };
      newTeams[oppUid] = [...(newTeams[oppUid] ?? []), currentPlayer?.name];
      newTeams[uid] = [...(newTeams[uid] ?? []), randomMe.name];

      update(roomRef.current!, {
        "game/budgets": newBudgets, "game/teams": newTeams, "game/phase": "result",
        "game/lastResult": { winner: oppUid, mainPlayer: currentPlayer, backupPlayer: randomMe }
      });
    } else {
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      const randomOpp = backups[Math.floor(Math.random() * backups.length)];
      const newTeams = { ...roomData.game.teams };
      newTeams[oppUid] = [...(newTeams[oppUid] ?? []), randomOpp.name];
      newTeams[uid] = [...(newTeams[uid] ?? []), randomMe.name];
      update(roomRef.current!, { "game/teams": newTeams, "game/phase": "result", "game/lastResult": null });
    }
  }

  if (!currentPlayer || players.length === 0 || formation.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#050B20", justifyContent: "center", alignItems: "center" }}>
        <Animated.Text style={{ color: "#facc15", fontSize: 38, opacity: aiDotAnim }}>⚽</Animated.Text>
        <Text style={{ color: "#fff", fontSize: 16, marginTop: 16 }}>جاري تحميل المزاد...</Text>
      </View>
    );
  }

  const myCount = myTeam.filter(x => x && x !== "—").length;
  const oppCount = opponentTeam.filter(x => x && x !== "—").length;
  const calcWinner = () => { if (myCount > oppCount) return "me"; if (oppCount > myCount) return "opp"; return "draw"; };
  const myWon = calcWinner() === "me";

  if (phase === "result") {
    return (
      <View style={styles.endBg}>
        <SafeAreaView style={styles.endContainer}>
          {resultWinner && auctionResultInfo ? (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", width: "100%" }}>
              <Text style={styles.resTitle}>{resultWinner === "me" ? "فزت بالصفقة!" : (isBot ? "AI فاز بالصفقة!" : `${opponentName} فاز بالصفقة!`)}</Text>
              
              <View style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center", marginTop: 40 }}>
                {/* كارت اللاعب الأساسي */}
                <Animated.View style={[styles.resCardWrapper, { position: "absolute", transform: [{ translateY: resCard1Anim }] }]}>
                  <Text style={styles.resCardLabel}>{resultWinner === "me" ? "لاعبك الجديد" : "لاعب الخصم"}</Text>
                  {auctionResultInfo.mainPlayer.imageUrl ? (
                    <Image source={{ uri: auctionResultInfo.mainPlayer.imageUrl }} style={{ width: width * 0.48, aspectRatio: 0.72, borderRadius: 12, borderWidth: 3, borderColor: "#22c55e" }} resizeMode="contain" />
                  ) : (
                    <View style={[styles.playerCard, { borderColor: "#22c55e", borderWidth: 3 }]}>
                      <Text style={styles.playerRating}>{auctionResultInfo.mainPlayer.rating}</Text>
                      <Text style={styles.playerPos}>{auctionResultInfo.mainPlayer.position}</Text>
                      <Text style={styles.playerEmoji}>⚽</Text>
                      <Text style={styles.playerName}>{auctionResultInfo.mainPlayer.name}</Text>
                      <Text style={styles.playerFlag}>{auctionResultInfo.mainPlayer.flag}</Text>
                    </View>
                  )}
                </Animated.View>

                {/* كارت اللاعب التعويض */}
                <Animated.View style={[styles.resCardWrapper, { position: "absolute", transform: [{ translateY: resCard2Anim }] }]}>
                  <Text style={styles.resCardLabel}>{resultWinner === "me" ? "تعويض لـ الخصم" : "تعويض لك"}</Text>
                  {auctionResultInfo.backupPlayer.imageUrl ? (
                    <Image source={{ uri: auctionResultInfo.backupPlayer.imageUrl }} style={{ width: width * 0.48, aspectRatio: 0.72, borderRadius: 12, borderWidth: 3, borderColor: "#ef4444" }} resizeMode="contain" />
                  ) : (
                    <View style={[styles.playerCard, { borderColor: "#ef4444", borderWidth: 3 }]}>
                      <Text style={styles.playerRating}>{auctionResultInfo.backupPlayer.rating}</Text>
                      <Text style={styles.playerPos}>{auctionResultInfo.backupPlayer.position}</Text>
                      <Text style={styles.playerEmoji}>⚽</Text>
                      <Text style={styles.playerName}>{auctionResultInfo.backupPlayer.name}</Text>
                      <Text style={styles.playerFlag}>{auctionResultInfo.backupPlayer.flag}</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.resTitle}>⚡ اللاعب لم يُشترَ ⚡</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  if (phase === "match") {
    const calcResult = () => {
      if (oppSurrendered) return 'win';
      if (iSurrendered) return 'loss';
      const w = calcWinner();
      if (w === 'me') return 'win';
      if (w === 'opp') return 'loss';
      return 'draw';
    };
    return (
      <MatchScreen
        myTeam={myTeam}
        aiTeam={opponentTeam}
        myBudget={myBudget}
        aiBudget={opponentBudget}
        allPlayers={playersData}
        coachBonus={coachBonus}
        coachName={coachName}
        opponentName={opponentName}
        onFinish={(matchResult: 'win' | 'loss' | 'draw') => {
          if (!isBot) recordOnlineMatchResult(matchResult);
          if (!isBot && roomRef.current) remove(roomRef.current).catch(() => {});
          router.replace('/');
        }}
      />
    );
  }

  if (phase === "coach") {
    return (
      <CoachScreen budget={myBudget} onSelect={(bonus, name) => { setCoachBonus(bonus); setCoachName(name); setPhase("match"); }} />
    );
  }

  if (phase === "wildcard") {
    return (
      <WildcardScreen 
        myTeam={myTeam}
        allPlayers={playersData}
        budget={myBudget}
        onComplete={(newTeam, newBudget) => {
          setMyTeam(newTeam);
          setMyBudget(newBudget);
          if (!isBot && roomRef.current && roomData?.game) {
            const newBudgets = { ...roomData.game.budgets, [uid]: newBudget };
            const newTeams = { ...roomData.game.teams, [uid]: newTeam };
            update(roomRef.current, {
              "game/budgets": newBudgets,
              "game/teams": newTeams
            });
          }
          setPhase("coach");
        }}
      />
    );
  }

  if (phase === "end") {
    return (
      <View style={styles.endBg}>
        <SafeAreaView style={styles.endContainer}>
          <Text style={styles.endTitle}>{iSurrendered ? "انسحبت! 🚪" : oppSurrendered ? `انسحب ${opponentName} 🚪` : (myWon ? "🏆 أنت الفائز!" : calcWinner().startsWith("draw") ? "🤝 تعادل!" : `😤 ${opponentName} فاز!`)}</Text>
          <Text style={styles.endSubtitle}>{iSurrendered ? `${opponentName} كسب المباراة` : oppSurrendered ? "أنت كسبت المباراة!" : (myWon ? "رائع! بنيت أقوى فريق" : "حاول مرة ثانية")}</Text>
          <View style={styles.endStats}>
            <View style={styles.endStatBox}>
              <Text style={styles.endStatNum}>{myCount}</Text>
              <Text style={styles.endStatLabel}>لاعبيك</Text>
            </View>
            <Text style={styles.endStatVs}>VS</Text>
            <View style={styles.endStatBox}>
              <Text style={styles.endStatNum}>{oppCount}</Text>
              <Text style={styles.endStatLabel}>لاعبي {opponentName}</Text>
            </View>
          </View>
          {!iSurrendered && !oppSurrendered && (
            <TouchableOpacity style={[styles.endBtn, { backgroundColor: "#f59e0b", marginBottom: 12 }]} onPress={() => setPhase(card === '3' ? "wildcard" : "coach")}>
              <Text style={styles.endBtnText}>{card === '3' ? "⚡ استخدم بطاقة وايلد كارد!" : "🏟️ اختر مدربك وابدأ المباراة!"}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.endBtn, { backgroundColor: "#1e293b" }]} onPress={() => {
            if (!isBot && roomRef.current) remove(roomRef.current).catch(() => {});
            router.replace("/");
          }}>
            <Text style={styles.endBtnText}>🏠 الرئيسية</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const displayMyBudget = myBudget;
  const displayOppBudget = isBot ? botBudgetRef.current : opponentBudget;

  return (
    <ImageBackground source={require("../assets/card_billion.jpg")} style={{ flex: 1 }} resizeMode="cover">
      <View style={styles.overlay} />
      <StatusBar style="light" />

      <SafeAreaView style={styles.container}>
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            style={{ backgroundColor: "rgba(239,68,68,0.8)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#ef4444" }}
            onPress={() => {
              if (isBot) {
                setSurrendered(true);
                setPhase("end");
              } else {
                update(roomRef.current!, { "game/surrenderedBy": uid, "game/phase": "end" });
              }
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>🚪 خروج / انسحاب</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleVolume} style={{ backgroundColor: "rgba(30,41,59,0.8)", padding: 8, borderRadius: 20, borderWidth: 1, borderColor: "#334155" }}>
            <Ionicons name={volMode === 0 ? "volume-mute" : volMode === 1 ? "volume-low" : "volume-high"} size={20} color={volMode === 0 ? "#ef4444" : "#22c55e"} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={[styles.budgetBox, isMyTurn && styles.budgetBoxActive]}>
            <Text style={styles.budgetLabel}>{myUsername}</Text>
            <Text style={styles.budgetAmt}>💰 {displayMyBudget}M</Text>
          </View>

          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeNum}>{playerIdx + 1}/{players.length}</Text>
          </View>

          <View style={[styles.budgetBox, { alignItems: "flex-end" }, !isMyTurn && styles.budgetBoxActiveAi]}>
            <Text style={styles.budgetLabel}>{isBot ? `🤖 ${opponentName}` : opponentName}</Text>
            <Text style={styles.budgetAmt}>💰 {displayOppBudget}M</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <Animated.View style={[styles.cardContainer, { opacity: fadeCard, transform: [{ scale: scaleCard }] }]}>
            {currentPlayer.imageUrl ? (
              <View style={{ width: width * 0.48, aspectRatio: 0.72, borderRadius: 12, overflow: "hidden" }}>
                <Image source={{ uri: currentPlayer.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                <View style={{
                  position: "absolute", bottom: "16%", left: 0, right: 0,
                  alignItems: "center",
                }}>
                  <View style={{
                    backgroundColor: "rgba(0,0,0,0.65)",
                    paddingHorizontal: 10, paddingVertical: 3,
                    borderRadius: 8,
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
                  }}>
                    <Text style={{
                      color: "#fff", fontSize: 13, fontWeight: "900",
                      textAlign: "center", letterSpacing: 1,
                      textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
                    }} numberOfLines={1} adjustsFontSizeToFit>
                      {currentPlayer.name}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.playerCard}>
                <Text style={styles.playerRating}>{currentPlayer.rating}</Text>
                <Text style={styles.playerPos}>{currentPlayer.position}</Text>
                <Text style={styles.playerEmoji}>⚽</Text>
                <Text style={styles.playerName}>{currentPlayer.name}</Text>
              </View>
            )}
          </Animated.View>

          <View style={{ marginTop: 8 }}>
            <PitchView players={myTeam} color="#3b82f6" formation={formation} activeIdx={playerIdx} label="⚽ فريقك" />
            <PitchView players={opponentTeam} color="#ef4444" formation={formation} activeIdx={playerIdx} label="🔴 الخصم" />
          </View>
        </ScrollView>

        <View style={[styles.actionPanel, { marginTop: 0 }]}>
          <View style={styles.currentBidBox}>
            <Text style={styles.currentBidLabel}>السعر الحالي</Text>
            <Animated.Text style={[styles.currentBidValue, { transform: [{ scale: bidPulse }] }]}>{currentBid}M</Animated.Text>
            {lastRaiser === uid && <Text style={{ color: "#3b82f6", fontSize: 12, fontWeight: "bold" }}>مزايدتك!</Text>}
            {lastRaiser && lastRaiser !== uid && <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "bold" }}>مزايدة الخصم!</Text>}
          </View>

          <View>
            <View style={styles.bidAdjustRow}>
              {/* − */}
              <TouchableOpacity
                style={[styles.adjBtn, styles.adjMinus, (!isMyTurn || myBidAttempt <= currentBid) && styles.adjBtnDisabled]}
                onPress={() => setMyBidAttempt(v => Math.max(v - BID_STEP, currentBid + BID_STEP))}
                disabled={!isMyTurn || myBidAttempt <= currentBid}
              >
                <Text style={styles.adjBtnText}>−</Text>
              </TouchableOpacity>

              {/* الرقم المختار */}
              <View style={styles.bidAttemptBox}>
                <Text style={styles.bidAttemptLabel}>مزايدتك</Text>
                <Animated.Text style={[styles.bidAttemptAmt, { transform: [{ scale: bidPulse }] }]}>
                  {"€" + myBidAttempt + "M"}
                </Animated.Text>
                <Text style={styles.bidAttemptSub}>
                  {myBidAttempt > currentBid
                    ? ("+" + (myBidAttempt - currentBid) + "M فوق الحد")
                    : "اضغط + لتزيد"}
                </Text>
              </View>

              {/* + */}
              <TouchableOpacity
                style={[styles.adjBtn, styles.adjPlus, (!isMyTurn || !canAddMore) && styles.adjBtnDisabled]}
                onPress={() => setMyBidAttempt(v => Math.min(v + BID_STEP, myBudget))}
                disabled={!isMyTurn || !canAddMore}
              >
                <Text style={styles.adjBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bidActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, (!isMyTurn || !canConfirm) && styles.confirmBtnDisabled]}
                onPress={handleMyRaise}
                disabled={!isMyTurn || !canConfirm}
              >
                <Text style={styles.confirmBtnText}>✓ تأكيد المزايدة</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passBtn, (!isMyTurn || lastRaiser === null) && styles.passBtnDisabled]}
                onPress={handleMyPass}
                disabled={!isMyTurn || lastRaiser === null}
              >
                <Text style={styles.passBtnIcon}>✋</Text>
                <Text style={styles.passBtnText}>{lastRaiser === null ? "زايد أولاً" : "تخطى اللعب"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {!isMyTurn && (
            <View style={styles.waitingOverlay}>
              <Text style={styles.waitingText}>انتظر الخصم...</Text>
              <Animated.Text style={[styles.waitingDot, { opacity: aiDotAnim }]}>⚽</Animated.Text>
              {!isBot && (
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  borderWidth: 3,
                  borderColor: countdown <= 10 ? "#ef4444" : countdown <= 20 ? "#f59e0b" : "#22c55e",
                  justifyContent: "center", alignItems: "center",
                  marginLeft: 10,
                }}>
                  <Text style={{
                    color: countdown <= 10 ? "#ef4444" : countdown <= 20 ? "#f59e0b" : "#22c55e",
                    fontWeight: "900", fontSize: 14
                  }}>{countdown}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(5, 11, 32, 0.85)" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16, alignItems: "center" },
  budgetBox: { backgroundColor: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 12, minWidth: width * 0.28, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  budgetBoxActive: { borderColor: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.15)" },
  budgetBoxActiveAi: { borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.15)" },
  budgetLabel: { color: "#94a3b8", fontSize: 11, marginBottom: 2 },
  budgetAmt: { color: "#facc15", fontSize: 18, fontWeight: "900" },
  playerBadge: { backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#334155" },
  playerBadgeNum: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  cardContainer: { alignItems: "center", marginVertical: 10 },
  playerCard: { width: width * 0.48, aspectRatio: 0.72, backgroundColor: "#0f172a", borderRadius: 12, borderWidth: 1, borderColor: "#facc15", alignItems: "center", padding: 10, justifyContent: "center" },
  playerRating: { color: "#facc15", fontSize: 36, fontWeight: "900" },
  playerPos: { color: "#94a3b8", fontSize: 16, fontWeight: "bold", marginTop: 4 },
  playerEmoji: { fontSize: 40, marginVertical: 8 },
  playerName: { color: "#fff", fontSize: 15, fontWeight: "bold", textAlign: "center" },
  actionPanel: { marginBottom: 10, marginHorizontal: 16, backgroundColor: "rgba(30,41,59,0.8)", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
  currentBidBox: { alignItems: "center", marginBottom: 16, backgroundColor: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 12 },
  currentBidLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  currentBidValue: { color: "#facc15", fontSize: 36, fontWeight: "900" },
  // bid adjust row
  bidAdjustRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 14,
  },
  adjBtn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  adjMinus:       { backgroundColor: "#ef4444" },
  adjPlus:        { backgroundColor: "#22c55e" },
  adjBtnDisabled: { opacity: 0.35 },
  adjBtnText:     { color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 32 },

  bidAttemptBox: { flex: 1, alignItems: "center" },
  bidAttemptLabel: { color: "#94a3b8", fontSize: 11, marginBottom: 2 },
  bidAttemptAmt: {
    color: "#facc15", fontSize: 32, fontWeight: "900",
    textShadowColor: "rgba(250,204,21,0.5)", textShadowRadius: 12,
  },
  bidAttemptSub: { color: "#64748b", fontSize: 11, marginTop: 2 },

  // confirm + pass row
  bidActions: { flexDirection: "row", gap: 10 },
  confirmBtn: {
    flex: 2, backgroundColor: "#22c55e",
    borderRadius: 30, paddingVertical: 14, alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#374151", opacity: 0.45 },
  confirmBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  passBtn: {
    flex: 1, backgroundColor: "#1e293b",
    borderRadius: 30, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#334155"
  },
  passBtnDisabled: { opacity: 0.35 },
  passBtnIcon: { fontSize: 20 },
  passBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 14 },
  
  disabledBtn: { opacity: 0.5 },
  waitingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.85)", justifyContent: "center", alignItems: "center", flexDirection: "row" },
  waitingText: { color: "#38bdf8", fontSize: 16, fontWeight: "bold", marginRight: 8 },
  waitingDot: { fontSize: 20 },
  pitchesRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginTop: 20 },
  pitchCol: { width: "48%" },
  pitchTitle: { fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  pitchWrapper: { aspectRatio: 0.65, borderWidth: 2, borderRadius: 8, padding: 4 },
  pitch: { flex: 1, borderRadius: 4, position: "relative" },
  pitchLine: { position: "absolute", top: "50%", left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginTop: -1 },
  pitchCircle: { position: "absolute", top: "50%", left: "50%", width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", marginLeft: -15, marginTop: -15 },
  pitchDot: { position: "absolute", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  pitchDotText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  endBg: { flex: 1, backgroundColor: "#050B20" },
  endContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  endTitle: { color: "#facc15", fontSize: 32, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  endSubtitle: { color: "#94a3b8", fontSize: 16, marginBottom: 32 },
  endStats: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  endStatBox: { backgroundColor: "#1e293b", padding: 20, borderRadius: 16, alignItems: "center", minWidth: 100 },
  endStatNum: { color: "#fff", fontSize: 36, fontWeight: "bold" },
  endStatLabel: { color: "#64748b", fontSize: 12, marginTop: 4 },
  endStatVs: { color: "#ef4444", fontSize: 24, fontWeight: "900", marginHorizontal: 20 },
  endBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 25 },
  endBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  resTitle: { color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  resCardWrapper: { alignItems: "center" },
  resCardLabel: { color: "#fff", fontSize: 14, fontWeight: "bold", marginBottom: 8, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  playerFlag: { color: "#fff", fontSize: 12, marginTop: 5 },
});
