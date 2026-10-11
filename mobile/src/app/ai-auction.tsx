import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView, ImageBackground, Image
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

import playersData from '../assets/players.json';
import { playSoundEffect, triggerVibration, setMusicVolume, setMusicMuted, getMusicVolume, getMusicMuted } from "../hooks/useSound";
import { getAiMaxBid, getMatchResult } from "../utils/gemini";
import { Ionicons } from '@expo/vector-icons';
import WildcardScreen from "../components/WildcardScreen";

// Shuffle helper
function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function getInitialGameData(isClassic: boolean, leagueId?: string) {
  let premiumPlayers = playersData;
  
  if (leagueId && leagueId !== 'all') {
    premiumPlayers = playersData.filter(p => p.cardType === leagueId);
    if (premiumPlayers.length === 0) premiumPlayers = playersData; // fallback
  } else if (!leagueId || leagueId === 'all') {
    premiumPlayers = playersData.filter(p => p.cardType === 'epic' || p.cardType === 'bigtime' || p.overallRating >= 92);
  }

  const shuffledPremium = shuffle(premiumPlayers);
  const reqPos = isClassic 
    ? ['GK', 'CB', 'CMF', 'AMF', 'CF'] 
    : ['GK', 'CB', 'CB', 'RB', 'LB', 'DMF', 'AMF', 'AMF', 'LWF', 'RWF', 'CF'];

  const formation = isClassic 
    ? [
        { key: "GK",   label: "GK",  x: 0.1, y: 0.5 },
        { key: "CB",   label: "CB",  x: 0.3, y: 0.5 },
        { key: "CMF",  label: "CMF", x: 0.5, y: 0.5 },
        { key: "AMF",  label: "AMF", x: 0.7, y: 0.5 },
        { key: "CF",   label: "CF",  x: 0.9, y: 0.5 },
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

  const playersList: any[] = [];
  const usedIds = new Set();
  
  reqPos.forEach((pos, index) => {
    let p = shuffledPremium.find(player => player.position === pos && !usedIds.has(player.id));
    if (!p) {
      p = shuffledPremium.find(player => !usedIds.has(player.id));
    }
    if (p) {
      usedIds.add(p.id);
      playersList.push({
        id: index + 1,
        realId: p.id,
        name: p.name,
        position: pos,
        rating: p.overallRating,
        flag: p.team,
        basePrice: Math.max(5, p.overallRating - 80),
        imageUrl: p.imageUrl
      });
    }
  });

  const backupPlayers: any = {};
  const backupPool = shuffle(premiumPlayers.filter(p => !usedIds.has(p.id)));

  backupPool.forEach(p => {
    const pos = p.position;
    if (!backupPlayers[pos]) backupPlayers[pos] = [];
    backupPlayers[pos].push({
      name: p.name,
      rating: p.overallRating,
      flag: p.team,
      position: pos,
      imageUrl: p.imageUrl
    });
  });

  const allPositions = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'];
  allPositions.forEach(pos => {
    if (!backupPlayers[pos] || backupPlayers[pos].length === 0) {
      // Try same position from ALL players (any cardType)
      const samePositionFallback = playersData.find(p => p.position === pos && !usedIds.has(p.id));
      if (samePositionFallback) {
        backupPlayers[pos] = [{ name: samePositionFallback.name, rating: samePositionFallback.overallRating, flag: samePositionFallback.team, position: pos, imageUrl: samePositionFallback.imageUrl }];
      } else {
        // Last resort: any remaining player from same cardType
        const fallbackPlayer = backupPool.length > 0 ? backupPool[0] : premiumPlayers[0];
        if (fallbackPlayer) {
          backupPlayers[pos] = [{ name: fallbackPlayer.name, rating: fallbackPlayer.overallRating, flag: fallbackPlayer.team, position: fallbackPlayer.position, imageUrl: fallbackPlayer.imageUrl }];
        } else {
          backupPlayers[pos] = [{ name: 'Backup', rating: 80, flag: 'Unknown', position: pos }];
        }
      }
    }
  });

  return { playersList, formation, backupPlayers };
}


function PitchView({ players, color, formation, activeIdx, label }: { players: string[]; color: string, formation: any[], activeIdx?: number, label?: string }) {
  const pitchW = width - 32;
  const pitchH = pitchW * 0.42;
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
      {label && <Text style={{ color, fontSize: 12, fontWeight: "bold", marginBottom: 4, textAlign: "center" }}>{label}</Text>}
      <View style={[styles.pitchWrapper, { borderColor: color + "88", width: pitchW, height: pitchH }]}>
        <View style={[styles.pitch, { backgroundColor: color + "12", width: pitchW, height: pitchH }]}>
          <View style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.5, backgroundColor: "rgba(255,255,255,0.25)" }} />
          <View style={{ position: "absolute", top: pitchH / 2 - 20, left: pitchW / 2 - 20, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" }} />
          <View style={{ position: "absolute", left: 0, top: pitchH * 0.25, width: 20, height: pitchH * 0.5, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", borderLeftWidth: 0 }} />
          <View style={{ position: "absolute", right: 0, top: pitchH * 0.25, width: 20, height: pitchH * 0.5, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", borderRightWidth: 0 }} />
          {formation.map((pos, i) => {
            const isActive = i === activeIdx;
            const playerName = players[i];
            const hasPlayer = playerName && playerName !== "—";
            const pData = hasPlayer ? playersData.find((x: any) => x.name === playerName) : null;
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

// ── نوع الدور ─────────────────────────────────────────────
type Turn = "me" | "ai";
type Phase = "bid" | "result" | "end" | "transition" | "match" | "coach" | "wildcard";

const BUDGET_TOTAL = 500;
const BID_STEP = 1;

// ── MatchScreen Component ──────────────────────────────────
function MatchScreen({ myTeam, aiTeam, myBudget, aiBudget, allPlayers, coachBonus, coachName, onFinish, onPlayAgain }: {
  myTeam: Record<number, string>;
  aiTeam: Record<number, string>;
  myBudget: number;
  aiBudget: number;
  allPlayers: any[];
  coachBonus?: number;
  coachName?: string;
  onFinish: () => void;
  onPlayAgain: () => void;
}) {
  const myPlayers = Object.values(myTeam);
  const aiPlayers = Object.values(aiTeam);

  // احسب متوسط رايتنج الفريق
  const calcAvgRating = (players: string[], allP: any[]) => {
    if (players.length === 0) return 75;
    const ratings = players.map(name => {
      const p = allP.find((x: any) => x.name === name);
      return p ? p.rating : 78;
    });
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  // كل لاعب يسجل هدف بناءً على رايتنجه الشخصي + بونص المدرب
  // rating 95 → ~30%، rating 88 → ~20%، rating 80 → ~12%
  const simGoals = (players: string[], allP: any[], bonus = 0) => {
    let goals = 0;
    players.forEach(name => {
      const p = allP.find((x: any) => x.name === name);
      const rating = p ? p.rating : 78;
      const baseChance = Math.max(0.05, (rating - 70) / 120);
      const boostedChance = Math.min(0.9, baseChance * (1 + bonus));
      if (Math.random() < boostedChance) goals++;
    });
    if (Math.random() < 0.12) goals++; // عامل مفاجأة صغير
    return goals;
  };

  const bonus = coachBonus ?? 0;
  const [matchData, setMatchData] = useState<{ myGoals: number; aiGoals: number; commentary: string } | null>(null);

  useEffect(() => {
    async function simulate() {
      const normalize = (p: any) => ({ name: p.name, rating: p.overallRating || p.rating || 78, position: p.position });
      const myPlayerObjects = myPlayers.map(name => normalize(allPlayers.find((x: any) => x.name === name) || { name, overallRating: 78 }));
      const aiPlayerObjects = aiPlayers.map(name => normalize(allPlayers.find((x: any) => x.name === name) || { name, overallRating: 78 }));
      
      const res = await getMatchResult("فريقك", myPlayerObjects, bonus, "AI", aiPlayerObjects, 0);
      setMatchData({ myGoals: res.teamAGoals, aiGoals: res.teamBGoals, commentary: res.commentary });
    }
    simulate();
  }, []);

  const [progress,  setProgress]  = useState(0);        // 0..100
  const [events,    setEvents]    = useState<{ min: number; scorer: string; team: "me" | "ai" }[]>([]);
  const [done,      setDone]      = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!matchData) return;

    const { myGoals, aiGoals } = matchData;
    
    // Create random events based on Gemini's score
    const evs: { min: number; scorer: string; team: "me" | "ai" }[] = [];
    const myMins = Array.from({ length: myGoals }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b);
    const aiMins = Array.from({ length: aiGoals }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b);
    myMins.forEach(min => evs.push({ min, scorer: myPlayers[Math.floor(Math.random() * (myPlayers.length || 1))] || "لاعبك", team: "me" }));
    aiMins.forEach(min => evs.push({ min, scorer: aiPlayers[Math.floor(Math.random() * (aiPlayers.length || 1))] || "AI", team: "ai" }));
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

    const prog = setInterval(() => {
      setProgress(p => Math.min(p + 2, 100));
    }, 120);

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
        {/* عنوان */}
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ color: "#facc15", fontSize: 18, fontWeight: "bold" }}>⚽ محاكاة المباراة</Text>
          <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>راقب النتيجة واللحظات المباشرة</Text>
        </View>

        {/* النتيجة */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginHorizontal: 16, backgroundColor: "#1e293b", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#334155" }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 24 }}>🤖</Text>
            </View>
            <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>AI</Text>
            <Text style={{ color: aiGoals > myGoals ? "#22c55e" : "#fff", fontSize: 40, fontWeight: "900" }}>{aiGoals}</Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: "#475569", fontWeight: "bold", fontSize: 18 }}>V</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#3b82f6", justifyContent: "center", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
            <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>فريقك</Text>
            <Text style={{ color: myGoals > aiGoals ? "#22c55e" : "#fff", fontSize: 40, fontWeight: "900" }}>{myGoals}</Text>
          </View>
        </View>

        {/* شريط التقدم */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: "#1e293b", borderRadius: 10, overflow: "hidden", height: 10 }}>
            <Animated.View style={{
              height: 10, borderRadius: 10, backgroundColor: "#22c55e",
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] })
            }} />
          </View>
          <Text style={{ color: "#64748b", fontSize: 11, textAlign: "center", marginTop: 4 }}>
            {done ? "نهاية المباراة · 100%" : `الشوط الأول · ${progress}%`}
          </Text>
        </View>

        {/* أحداث المباراة */}
        <View style={{ flex: 1, marginHorizontal: 16, marginTop: 16 }}>
          {done && (
             <View style={{ backgroundColor: "#1e293b", padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#3b82f6" }}>
                <Text style={{ color: "#3b82f6", fontWeight: "bold", marginBottom: 4, textAlign: "right" }}>تحليل AI:</Text>
                <Text style={{ color: "#fff", fontSize: 13, textAlign: "right", lineHeight: 20 }}>{commentary}</Text>
             </View>
          )}
          <Text style={{ color: "#fff", fontWeight: "bold", marginBottom: 8, textAlign: "right" }}>لحظات مباشرة</Text>
          <ScrollView>
            {events.map((ev, i) => (
              <View key={i} style={{
                flexDirection: "row", justifyContent: ev.team === "me" ? "flex-end" : "flex-start",
                marginBottom: 8, alignItems: "center"
              }}>
                {ev.team === "ai" && (
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#ef444430", justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                    <Text style={{ fontSize: 14 }}>⚽</Text>
                  </View>
                )}
                <View style={{ backgroundColor: ev.team === "me" ? "#3b82f620" : "#ef444420", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: ev.team === "me" ? "#3b82f6" : "#ef4444" }}>
                  <Text style={{ color: ev.team === "me" ? "#3b82f6" : "#ef4444", fontSize: 12, fontWeight: "bold" }}>{ev.team === "ai" ? "AI" : "فريقك"}</Text>
                  <Text style={{ color: "#fff", fontSize: 13 }}>{ev.scorer} ⚽ {ev.min}'</Text>
                </View>
                {ev.team === "me" && (
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#3b82f630", justifyContent: "center", alignItems: "center", marginLeft: 8 }}>
                    <Text style={{ fontSize: 14 }}>⚽</Text>
                  </View>
                )}
              </View>
            ))}
            {events.length === 0 && !done && (
              <Text style={{ color: "#475569", textAlign: "center", marginTop: 20 }}>جار اللعب...</Text>
            )}
          </ScrollView>
        </View>

        {/* النتيجة النهائية */}
        {done && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{ backgroundColor: iWon ? "#22c55e20" : isDraw ? "#f59e0b20" : "#ef444420", borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: iWon ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444" }}>
              <Text style={{ fontSize: 28 }}>{iWon ? "🏆" : isDraw ? "🤝" : "😢"}</Text>
              <Text style={{ color: iWon ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444", fontSize: 20, fontWeight: "900", marginTop: 4 }}>
                {iWon ? "فزت!" : isDraw ? "تعادل!" : "خسرت!"}
              </Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: "#facc15", borderRadius: 16, padding: 14, alignItems: "center", marginBottom: 8 }} onPress={onPlayAgain}>
              <Text style={{ color: "#000", fontWeight: "bold", fontSize: 16 }}>🔄 العب مجدداً</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" }} onPress={onFinish}>
              <Text style={{ color: "#94a3b8", fontWeight: "bold", fontSize: 14 }}>🏠 الرئيسية</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
const COACHES = [
  { id: 1, name: "José Mourinho",   imageUrl: "https://efimg.com/efootballhub22/images/coach_cards/17608560707469.png", price: 40, bonus: 0.30, level: "مميز جداً",  desc: "خبير التكتيك الدفاعي" },
  { id: 2, name: "Johan Cruyff",    imageUrl: "https://efimg.com/efootballhub22/images/coach_cards/17605876354558.png", price: 20, bonus: 0.15, level: "جيد جداً",  desc: "قائد الأبطال" },
  { id: 3, name: "Pep Guardiola",   imageUrl: "https://efimg.com/efootballhub22/images/coach_cards/17601849721048.png", price: 30, bonus: 0.22, level: "مميز",      desc: "أسطورة كرة الضغط" },
  { id: 4, name: "D. Deschamps",    imageUrl: "https://efimg.com/efootballhub22/images/coach_cards/17606681559180.png", price: 10, bonus: 0.08, level: "جيد",      desc: "المدرب المتوازن" },
  { id: 5, name: "Hossam Hassan",   imageUrl: "https://efimg.com/efootballhub22/images/coach_cards/88080431.png", price: 0,  bonus: 0.00, level: "مجاني",    desc: "بدون مدرب" },
];

// ── CoachScreen Component ─────────────────────────────────
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
              <TouchableOpacity
                key={coach.id}
                disabled={!canAfford}
                onPress={() => setSelected(coach.id)}
                style={[{
                  backgroundColor: isSelected ? "#1e3a5f" : "#0f172a",
                  borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? "#3b82f6" : canAfford ? "#1e293b" : "#1e293b",
                  opacity: canAfford ? 1 : 0.4,
                  flexDirection: "row", alignItems: "center"
                }]}
              >
                <Image source={{ uri: coach.imageUrl }} style={{ width: 50, height: 75, marginRight: 14, borderRadius: 8 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{coach.name}</Text>
                    <View style={{ backgroundColor: coach.price === 0 ? "#374151" : "#166534", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ color: coach.price === 0 ? "#9ca3af" : "#86efac", fontSize: 12, fontWeight: "bold" }}>
                        {coach.price === 0 ? "مجاني" : `${coach.price}M`}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{coach.desc}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <View style={{ backgroundColor: "#1e3a5f", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8 }}>
                      <Text style={{ color: "#60a5fa", fontSize: 11 }}>{coach.level}</Text>
                    </View>
                    {coach.bonus > 0 && (
                      <Text style={{ color: "#facc15", fontSize: 11 }}>+{Math.round(coach.bonus * 100)}% قوة الفريق</Text>
                    )}
                  </View>
                </View>
                {isSelected && <Text style={{ fontSize: 20, marginLeft: 8 }}>✅</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <TouchableOpacity
            style={[{ backgroundColor: selected !== null ? "#f59e0b" : "#374151", borderRadius: 16, padding: 16, alignItems: "center" }]}
            disabled={selected === null}
            onPress={() => {
              const coach = COACHES.find(c => c.id === selected);
              if (coach) onSelect(coach.bonus, coach.name);
            }}
          >
            <Text style={{ color: selected !== null ? "#000" : "#6b7280", fontWeight: "bold", fontSize: 16 }}>
              {selected !== null ? "⚽ ابدأ المباراة!" : "اختر مدرباً أولاً"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}



export default function AiAuction() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isClassic = params.mode === '3';
  const leagueId = (params.league as string) || 'all';
  const card = (params.card as string) || '4';
  
  const gameData = useRef(getInitialGameData(isClassic, leagueId)).current;
  const { playersList: PLAYERS, formation: FORMATION, backupPlayers: BACKUP_PLAYERS } = gameData;

  const [playerIdx,  setPlayerIdx]  = useState(0);
  const initialBudget = isClassic ? 100 : 200;
  const [myBudget,   setMyBudget]   = useState(initialBudget);
  const [aiBudget,   setAiBudget]   = useState(initialBudget);
  const [myTeam,     setMyTeam]     = useState<Record<number, string>>({});
  const [aiTeam,     setAiTeam]     = useState<Record<number, string>>({});
  const [phase,      setPhase]      = useState<Phase>("bid");
  const [winner,     setWinner]     = useState<"me" | "ai" | null>(null);
  const [resultMsg,  setResultMsg]  = useState("");
  const [playedIds,  setPlayedIds]  = useState<number[]>([PLAYERS[0].id]);
  const [auctionResultInfo, setAuctionResultInfo] = useState<{ mainPlayer: any, backupPlayer: any } | null>(null);
  const [surrendered, setSurrendered] = useState(false);
  const [coachBonus,  setCoachBonus]  = useState(0);
  const [coachName,   setCoachName]   = useState("");

  // ── حالة المزايدة ──────────────────────────────────────
  const [currentBid,    setCurrentBid]    = useState(PLAYERS[0].basePrice);
  const [myBidAttempt,  setMyBidAttempt]  = useState(PLAYERS[0].basePrice); // ما يضغطه المستخدم قبل التأكيد
  const [turn,          setTurn]          = useState<Turn>("me");
  const [lastRaiser,    setLastRaiser]    = useState<Turn | null>(null);
  const [aiThinking,    setAiThinking]    = useState(false);
  const [timeLeft,      setTimeLeft]      = useState(30);

  // الميزانية المعروضة = الفعلية ناقص ما أضافه المستخدم فوق الحد الحالي
  const displayMyBudget = myBudget - Math.max(0, myBidAttempt - currentBid);

  const fadeCard   = useRef(new Animated.Value(1)).current;
  const scaleCard  = useRef(new Animated.Value(1)).current;
  const bidPulse   = useRef(new Animated.Value(1)).current;
  const aiDotAnim  = useRef(new Animated.Value(0)).current;
  const winAnim    = useRef(new Animated.Value(0)).current; // للاحتفال
  const transAnim  = useRef(new Animated.Value(height)).current; // للانتقال
  
  // انيميشن كروت النتيجة
  const resCard1Anim = useRef(new Animated.Value(height)).current;
  const resCard2Anim = useRef(new Animated.Value(height)).current;

  const [aiMaxBid, setAiMaxBid] = useState<number | null>(null);
  
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

  useEffect(() => {
    if (PLAYERS[playerIdx]) {
      setAiMaxBid(null);
      const p = PLAYERS[playerIdx];
      getAiMaxBid(p.name, p.rating, p.position, p.flag, aiBudget, p.basePrice).then(maxBid => {
         setAiMaxBid(maxBid);
      });
    }
  }, [playerIdx]);

  useEffect(() => {
    if (phase === "transition") {
      // انيميشن ظهور الكارت من تحت
      Animated.spring(transAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        setPhase("bid");
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      transAnim.setValue(height); // رجعه تحت
    }
  }, [phase]);
  const player = PLAYERS[playerIdx];

  // نبضة على الرقم لما يتغير
  function pulseBid() {
    Animated.sequence([
      Animated.timing(bidPulse, { toValue: 1.3, duration: 160, useNativeDriver: true }),
      Animated.timing(bidPulse, { toValue: 1,   duration: 160, useNativeDriver: true }),
    ]).start();
  }

  // انيميشن الاحتفال بالكارت
  function playWinAnimation() {
    Animated.sequence([
      Animated.timing(winAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(winAnim, { toValue: 0, friction: 5, useNativeDriver: true }),
    ]).start();
  }

  // ── AI يفكر ─────────────────────────────────────────────
  useEffect(() => {
    if (turn !== "ai" || phase !== "bid") return;

    setAiThinking(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(aiDotAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(aiDotAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    // AI يقرر بعد 1.5 ثانية
    if (aiMaxBid === null) return; // Wait until AI knows its max bid

    const maxAiWilling = aiMaxBid;
    const nextBid = currentBid + BID_STEP;

    const timer = setTimeout(() => {
      setAiThinking(false);
      aiDotAnim.stopAnimation();

      if (nextBid > maxAiWilling || nextBid > aiBudget) {
        // AI يتخطى فقط لو وصل لأقصى حده
        handleAiPass();
      } else {
        // AI يرفع
        setCurrentBid(nextBid);
        setMyBidAttempt(nextBid + BID_STEP); // نجهّز لك المزايدة بزيادة مليون عشان تدوس تأكيد على طول
        setLastRaiser("ai");
        pulseBid();
        setTurn("me");
      }
    }, 1200 + Math.random() * 800);

    return () => clearTimeout(timer);
  }, [turn, phase]);

  // ── المستخدم يضغط + (يزيد مزايدته قبل التأكيد) ──────────
  function handleAddBid() {
    const next = myBidAttempt + BID_STEP;
    if (next > myBudget) return; // محظور لو الفلوس مش كفاية
    setMyBidAttempt(next);
    pulseBid();
  }

  // ── المستخدم يضغط − (ينزّل مزايدته) ──────────────────────
  function handleSubBid() {
    const prev = myBidAttempt - BID_STEP;
    if (prev < currentBid) return; // لا ينزل عن السعر الحالي
    setMyBidAttempt(prev);
    pulseBid();
  }

  // ── المستخدم يؤكد مزايدته ─────────────────────────────────
  function handleMyRaise() {
    if (myBidAttempt <= currentBid) return; // لازم يكون أكبر من الحالي
    if (myBidAttempt > myBudget) return;
    setCurrentBid(myBidAttempt);
    setLastRaiser("me");
    pulseBid();
    setTurn("ai");
  }

  // ── المستخدم يتخطى ─────────────────────────────────────
  function handleMyPass() {
    if (lastRaiser === "ai") {
      setAiTeam((t) => ({ ...t, [playerIdx]: player.name }));
      setAiBudget((b) => b - currentBid);
      
      const backups = BACKUP_PLAYERS[player.position] || BACKUP_PLAYERS["ST"];
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      setMyTeam((t) => ({ ...t, [playerIdx]: randomMe.name }));

      setWinner("ai");
      setAuctionResultInfo({ mainPlayer: player, backupPlayer: randomMe });
      
      resCard1Anim.setValue(height);
      resCard2Anim.setValue(height);
      
      Animated.sequence([
        Animated.spring(resCard1Anim, { toValue: 0, friction: 6, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(resCard1Anim, { toValue: -height, duration: 400, useNativeDriver: true }),
        Animated.spring(resCard2Anim, { toValue: 0, friction: 6, useNativeDriver: true })
      ]).start(() => {
        setTimeout(() => {
          nextPlayer();
        }, 3000);
      });
    } else {
      const backups = BACKUP_PLAYERS[player.position] || BACKUP_PLAYERS["ST"];
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      const randomAi = backups[Math.floor(Math.random() * backups.length)];
      setMyTeam((t) => ({ ...t, [playerIdx]: randomMe.name }));
      setAiTeam((t) => ({ ...t, [playerIdx]: randomAi.name }));
      setWinner(null);
      setTimeout(() => nextPlayer(), 1500);
    }
    setPhase("result");
  }

  // ── AI يتخطى ───────────────────────────────────────────
  function handleAiPass() {
    if (lastRaiser === "me") {
      setMyTeam((t) => ({ ...t, [playerIdx]: player.name }));
      setMyBudget((b) => b - currentBid);
      
      const backups = BACKUP_PLAYERS[player.position] || BACKUP_PLAYERS["ST"];
      const randomAi = backups[Math.floor(Math.random() * backups.length)];
      setAiTeam((t) => ({ ...t, [playerIdx]: randomAi.name }));

      setWinner("me");
      playSoundEffect(player.overallRating >= randomAi.overallRating ? 'win' : 'lost');
      triggerVibration();
      setAuctionResultInfo({ mainPlayer: player, backupPlayer: randomAi });
      playWinAnimation();
      
      resCard1Anim.setValue(height);
      resCard2Anim.setValue(height);
      
      Animated.sequence([
        Animated.spring(resCard1Anim, { toValue: 0, friction: 6, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(resCard1Anim, { toValue: -height, duration: 400, useNativeDriver: true }),
        Animated.spring(resCard2Anim, { toValue: 0, friction: 6, useNativeDriver: true })
      ]).start(() => {
        setTimeout(() => {
          nextPlayer();
        }, 3000);
      });
    } else {
      const backups = BACKUP_PLAYERS[player.position] || BACKUP_PLAYERS["ST"];
      const randomMe = backups[Math.floor(Math.random() * backups.length)];
      const randomAi = backups[Math.floor(Math.random() * backups.length)];
      setMyTeam((t) => ({ ...t, [playerIdx]: randomMe.name }));
      setAiTeam((t) => ({ ...t, [playerIdx]: randomAi.name }));
      setWinner(null);
      setTimeout(() => nextPlayer(), 1500);
    }
    setPhase("result");
  }

  // ── اللاعب التالي ──────────────────────────────────────
  function nextPlayer() {
    const remaining = PLAYERS.filter(p => !playedIds.includes(p.id));
    if (remaining.length === 0) { setPhase("end"); return; }
    
    Animated.parallel([
      Animated.timing(fadeCard,  { toValue: 0,    duration: 280, useNativeDriver: true }),
      Animated.timing(scaleCard, { toValue: 0.85, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      // كارت عشوائي من اللي متبقي
      const nextP = remaining[Math.floor(Math.random() * remaining.length)];
      const nextIdx = PLAYERS.findIndex(p => p.id === nextP.id);
      
      setPlayedIds(prev => [...prev, nextP.id]);
      setPlayerIdx(nextIdx);
      setCurrentBid(nextP.basePrice);
      setMyBidAttempt(nextP.basePrice + BID_STEP); 
      setTurn("me");
      setLastRaiser(null);
      setPhase("bid");
      setWinner(null);
      winAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeCard,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(scaleCard, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    });
  }

  const handleMyPassRef = useRef(handleMyPass);
  useEffect(() => {
    handleMyPassRef.current = handleMyPass;
  });

  useEffect(() => {
    if (turn !== "me" || phase !== "bid") {
      setTimeLeft(30);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleMyPassRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [turn, phase]);

  // هل يقدر يزود المزايدة؟
  const canAddMore   = (myBidAttempt + BID_STEP) <= myBudget;
  // هل يقدر يؤكد؟ (لازم مزايدته أكبر من الحالي)
  const canConfirm   = myBidAttempt > currentBid && myBidAttempt <= myBudget;

  // ── شاشة النتيجة (كرتين بأنيميشن متتابع) ──────────────────────
  if (phase === "result") {
    return (
      <View style={styles.endBg}>
        <SafeAreaView style={styles.endContainer}>
          {winner && auctionResultInfo ? (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", width: "100%" }}>
              <Text style={styles.resTitle}>{winner === "me" ? "فزت بالصفقة!" : "AI فاز بالصفقة!"}</Text>
              
              <View style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center", marginTop: 40 }}>
                {/* كارت اللاعب الأساسي */}
                <Animated.View style={[styles.resCardWrapper, { position: "absolute", transform: [{ translateY: resCard1Anim }] }]}>
                  <Text style={styles.resCardLabel}>{winner === "me" ? "لاعبك الجديد" : "لاعب AI"}</Text>
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
                  <Text style={styles.resCardLabel}>{winner === "me" ? "تعويض لـ AI" : "تعويض لك"}</Text>
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

  // ── شاشة الوايلد كارد ──────────────────────────────────
  if (phase === "wildcard") {
    // نحول myTeam من Record<number, string> إلى string[]
    const myTeamArray = Object.values(myTeam);
    return (
      <WildcardScreen 
        myTeam={myTeamArray}
        allPlayers={playersData}
        budget={myBudget}
        onComplete={(newTeam, newBudget) => {
          // نعيد تحويل string[] إلى Record<number, string>
          const newTeamObj: Record<number, string> = {};
          newTeam.forEach((name, i) => newTeamObj[i] = name);
          setMyTeam(newTeamObj);
          setMyBudget(newBudget);
          setPhase("coach");
        }}
      />
    );
  }

  // ── شاشة المدرب ──────────────────────────────────────
  if (phase === "coach") {
    return (
      <CoachScreen
        budget={myBudget}
        onSelect={(bonus, name) => {
          setCoachBonus(bonus);
          setCoachName(name);
          setPhase("match");
        }}
      />
    );
  }

  // ── شاشة المباراة ──────────────────────────────────────
  if (phase === "match") {
    return (
      <MatchScreen
        myTeam={myTeam}
        aiTeam={aiTeam}
        myBudget={myBudget}
        aiBudget={aiBudget}
        allPlayers={PLAYERS}
        coachBonus={coachBonus}
        coachName={coachName}
        onFinish={() => router.push("/")}
        onPlayAgain={() => router.replace({ pathname: "/ai-intro", params: { mode: params.mode, league: leagueId, card } } as any)}
      />
    );
  }


  // ── شاشة النهاية ───────────────────────────────────────
  if (phase === "end" || surrendered) {
    const iWon = surrendered ? false : Object.keys(myTeam).length >= Object.keys(aiTeam).length;
    return (
      <View style={styles.endBg}>
        <SafeAreaView style={styles.endContainer}>
          <Text style={styles.endTitle}>{surrendered ? "لقد خسرت بالانسحاب!" : (iWon ? "🏆 أنت الفائز!" : "🤖 AI فاز!")}</Text>
          <Text style={styles.endSubtitle}>{surrendered ? "AI (خصمك) كسب المباراة" : (iWon ? "رائع! بنيت أقوى فريق" : "حاول مرة ثانية")}</Text>
          <View style={styles.endStats}>
            <View style={styles.endStatBox}>
              <Text style={styles.endStatNum}>{Object.keys(myTeam).length}</Text>
              <Text style={styles.endStatLabel}>لاعبيك</Text>
            </View>
            <Text style={styles.endStatVs}>VS</Text>
            <View style={styles.endStatBox}>
              <Text style={styles.endStatNum}>{Object.keys(aiTeam).length}</Text>
              <Text style={styles.endStatLabel}>لاعبي AI</Text>
            </View>
          </View>
          {!surrendered && (
            <TouchableOpacity style={[styles.endBtn, { backgroundColor: "#f59e0b", marginBottom: 12 }]} onPress={() => setPhase(card === '3' ? "wildcard" : "coach")}>
              <Text style={styles.endBtnText}>{card === '3' ? "⚡ استخدم بطاقة وايلد كارد!" : "🏟️ اختر مدربك وابدأ المباراة!"}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.endBtn} onPress={() => router.replace("/ai-intro" as any)}>
            <Text style={styles.endBtnText}>العب مجدداً</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBackBtn} onPress={() => router.push("/")}>
            <Text style={styles.endBackText}>الرئيسية</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ── الشاشة الرئيسية ────────────────────────────────────
  return (
    <ImageBackground source={require("../assets/card_billion.jpg")} style={{ flex: 1 }} resizeMode="cover">
      <View style={styles.overlay} />
      <StatusBar style="light" />

      <SafeAreaView style={styles.container}>

        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            style={{ backgroundColor: "rgba(239,68,68,0.8)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#ef4444" }}
            onPress={() => setSurrendered(true)}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>🚪 خروج / انسحاب</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleVolume} style={{ backgroundColor: "rgba(30,41,59,0.8)", padding: 8, borderRadius: 20, borderWidth: 1, borderColor: "#334155" }}>
            <Ionicons name={volMode === 0 ? "volume-mute" : volMode === 1 ? "volume-low" : "volume-high"} size={20} color={volMode === 0 ? "#ef4444" : "#22c55e"} />
          </TouchableOpacity>
        </View>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* ميزانيتي */}
          <View style={[styles.budgetBox, turn === "me" && styles.budgetBoxActive]}>
            <Text style={styles.budgetLabel}>ميزانيتك</Text>
            <Text style={styles.budgetAmt}>💰 {displayMyBudget}M</Text>
          </View>

          {/* شارة اللاعب */}
          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeNum}>{playerIdx + 1}/{PLAYERS.length}</Text>
          </View>

          {/* ميزانية AI */}
          <View style={[styles.budgetBox, { alignItems: "flex-end" }, turn === "ai" && styles.budgetBoxActiveAi]}>
            <Text style={styles.budgetLabel}>ميزانية AI</Text>
            <Text style={styles.budgetAmt}>💰 {aiBudget}M</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

          {/* ── كارت اللاعب ── */}
          <Animated.View style={[
            styles.cardContainer, 
            { 
              opacity: fadeCard, 
              transform: [
                { scale: scaleCard },
                { rotateY: winAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                { scale: winAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) }
              ] 
            }
          ]}>
            {player.imageUrl ? (
              <View style={{ width: width * 0.48, aspectRatio: 0.72, borderRadius: 12, overflow: "hidden" }}>
                <Image source={{ uri: player.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                <View style={{ position: "absolute", bottom: "16%", left: 0, right: 0, alignItems: "center" }}>
                  <View style={{ backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "900", textAlign: "center", letterSpacing: 1, textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 }} numberOfLines={1} adjustsFontSizeToFit>
                      {player.name}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.playerCard}>
                <Text style={styles.playerRating}>{player.rating}</Text>
                <Text style={styles.playerPos}>{player.position}</Text>
                <Text style={styles.playerEmoji}>⚽</Text>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerFlag}>{player.flag}</Text>
              </View>
            )}
          </Animated.View>

          {/* ── السعر الحالي ── */}
          <View style={styles.bidDisplay}>
            <Text style={styles.bidDisplayLabel}>السعر الحالي</Text>
            <Animated.Text style={[styles.bidDisplayAmt, { transform: [{ scale: bidPulse }] }]}>
              {"€" + currentBid + "M"}
            </Animated.Text>

            {/* مؤشر الدور */}
            {phase === "bid" && (
              <View style={styles.turnIndicator}>
                {aiThinking ? (
                  <Animated.Text style={[styles.turnText, { opacity: aiDotAnim }]}>
                    🤖 AI يفكر...
                  </Animated.Text>
                ) : (
                  <Text style={[styles.turnText, { color: "#22c55e" }]}>
                    👤 دورك — زود أو تخطى (⏳ {timeLeft}ث)
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ── ملعبي ── */}
          <PitchView players={myTeam as any} color="#3b82f6" formation={FORMATION} activeIdx={phase === "bid" ? playerIdx : undefined} label="⚽ فريقك" />

          {/* ── ملعب AI ── */}
          <PitchView players={aiTeam as any} color="#ef4444" formation={FORMATION} activeIdx={phase === "bid" ? playerIdx : undefined} label="🤖 فريق AI" />

        </ScrollView>

        {/* ── لوحة المزايدة ── */}
        {phase === "bid" && (
          <View style={styles.bidPanel}>

            {/* AI يفكر */}
            {aiThinking && (
              <View style={styles.aiThinkingBox}>
                <Animated.Text style={[styles.aiThinkingText, { opacity: aiDotAnim }]}>
                  🤖 AI يفكر...
                </Animated.Text>
              </View>
            )}

            {/* تحذير لو الفلوس مش كفاية */}
            {!canAddMore && myBidAttempt <= currentBid && !aiThinking && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>⚠️ ميزانيتك لا تكفي للمزايدة — عليك التخطي</Text>
              </View>
            )}

            {/* صف + و − و الرقم */}
            {!aiThinking && (
              <View style={styles.bidAdjustRow}>
                {/* − */}
                <TouchableOpacity
                  style={[styles.adjBtn, styles.adjMinus, myBidAttempt <= currentBid && styles.adjBtnDisabled]}
                  onPress={handleSubBid}
                  disabled={myBidAttempt <= currentBid}
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
                  style={[styles.adjBtn, styles.adjPlus, !canAddMore && styles.adjBtnDisabled]}
                  onPress={handleAddBid}
                  disabled={!canAddMore}
                >
                  <Text style={styles.adjBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* تأكيد / تخطي */}
            {!aiThinking && (
              <View style={styles.bidActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
                  onPress={handleMyRaise}
                  disabled={!canConfirm}
                >
                  <Text style={styles.confirmBtnText}>✓ تأكيد المزايدة</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.passBtn, lastRaiser === null && styles.passBtnDisabled]} 
                  onPress={handleMyPass}
                  disabled={lastRaiser === null}
                >
                  <Text style={styles.passBtnIcon}>✋</Text>
                  <Text style={styles.passBtnText}>{lastRaiser === null ? "زايد أولاً" : "تخطى اللعب"}</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

// ── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,20,0.78)" },
  container: { flex: 1 },

  // header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  budgetBox: {
    flex: 1, alignItems: "flex-start", padding: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: "transparent",
  },
  budgetBoxActive:   { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)" },
  budgetBoxActiveAi: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" },
  budgetLabel: { color: "#94a3b8", fontSize: 10 },
  budgetAmt:   { color: "#facc15", fontSize: 14, fontWeight: "bold" },

  playerBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: "rgba(59,130,246,0.3)",
    borderRadius: 20, borderWidth: 1, borderColor: "#3b82f6",
  },
  playerBadgeNum: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  // card
  cardContainer: { alignItems: "center", marginTop: 12, marginBottom: 6 },
  playerCard: {
    width: width * 0.48, aspectRatio: 0.72,
    borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "#0d1f4c",
    borderWidth: 2.5, borderColor: "#3b82f6",
    shadowColor: "#3b82f6", shadowOpacity: 0.8, shadowRadius: 20, elevation: 14,
  },
  playerRating: { position: "absolute", top: 10, left: 12, color: "#facc15", fontSize: 20, fontWeight: "900" },
  playerPos:    { position: "absolute", top: 32, left: 12, color: "#facc15", fontSize: 13, fontWeight: "bold" },
  playerEmoji:  { fontSize: 54, marginBottom: 6 },
  playerName:   { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  playerFlag:   { fontSize: 22, marginTop: 5 },

  // bid display
  bidDisplay: { alignItems: "center", marginVertical: 10 },
  bidDisplayLabel: { color: "#94a3b8", fontSize: 12 },
  bidDisplayAmt: {
    color: "#facc15", fontSize: 38, fontWeight: "900",
    textShadowColor: "rgba(250,204,21,0.5)", textShadowRadius: 15,
  },
  turnIndicator: {
    marginTop: 6, paddingHorizontal: 16, paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20,
  },
  turnText: { color: "#facc15", fontSize: 13, fontWeight: "bold" },

  // result
  resultBanner: {
    marginHorizontal: 16, borderRadius: 14, padding: 16,
    alignItems: "center", marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  resultText: { color: "#fff", fontSize: 15, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  nextBtn: { backgroundColor: "#3b82f6", borderRadius: 20, paddingHorizontal: 28, paddingVertical: 8 },
  nextBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // pitch
  sectionLabel: { color: "#fff", fontSize: 12, fontWeight: "bold", textAlign: "right", marginHorizontal: 16, marginBottom: 4 },
  pitchWrapper: { marginHorizontal: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1.5, height: 110 },
  pitch:        { flex: 1, position: "relative" },
  pitchLine:    { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  pitchCircle:  { position: "absolute", width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", left: "50%", top: "50%", marginLeft: -23, marginTop: -23 },
  pitchDot:     { position: "absolute", width: 42, height: 26, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pitchDotText: { color: "#fff", fontSize: 9, fontWeight: "bold" },

  // bid panel
  bidPanel: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22,
    backgroundColor: "rgba(10,18,40,0.97)",
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
  },
  warnBox: { backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 8, padding: 8, marginBottom: 10 },
  warnText: { color: "#fca5a5", fontSize: 12, textAlign: "center" },

  // AI thinking
  aiThinkingBox: {
    alignItems: "center", paddingVertical: 16,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: 12, marginBottom: 10,
  },
  aiThinkingText: { color: "#93c5fd", fontSize: 16, fontWeight: "bold" },

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
    flex: 1, backgroundColor: "#22c55e",
    borderRadius: 30, paddingVertical: 14, alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#374151", opacity: 0.45 },
  confirmBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  passBtn: {
    flex: 1, backgroundColor: "#1e293b",
    borderRadius: 30, paddingVertical: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "#ef4444",
  },
  passBtnDisabled: {
    opacity: 0.45,
    borderColor: "#475569",
  },
  passBtnIcon: { fontSize: 20 },
  passBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 14 },

  // end
  endBg:        { flex: 1, backgroundColor: "#050B20" },
  endContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  endTitle:     { color: "#fff", fontSize: 36, fontWeight: "900", marginBottom: 10 },
  endSubtitle:  { color: "#94a3b8", fontSize: 15, textAlign: "center", marginBottom: 40 },
  endStats:     { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 40 },
  endStatBox:   { alignItems: "center" },
  endStatNum:   { color: "#facc15", fontSize: 48, fontWeight: "900" },
  endStatLabel: { color: "#64748b", fontSize: 13 },
  endStatVs:    { color: "#fff", fontSize: 22, fontWeight: "bold" },
  endBtn:       { backgroundColor: "#3b82f6", borderRadius: 30, paddingHorizontal: 50, paddingVertical: 16, marginBottom: 14 },
  endBtnText:   { color: "#fff", fontSize: 18, fontWeight: "bold" },
  endBackBtn:   { paddingVertical: 8 },
  endBackText:  { color: "#64748b", fontSize: 14 },

  // trans
  transCardWrapper: { alignItems: "center" },
  transTitle: { color: "#facc15", fontSize: 14, fontWeight: "bold", marginTop: 24 },
  transSub:   { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 8 },

  // result phase (two cards)
  resCardWrapper: { alignItems: "center", flex: 1 },
  resTitle: { color: "#fff", fontSize: 32, fontWeight: "900", textAlign: "center" },
  resCardLabel: { color: "#94a3b8", fontSize: 14, fontWeight: "bold", marginBottom: -10, zIndex: 10 },
});
