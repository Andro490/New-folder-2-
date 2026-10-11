import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, database } from "../firebase";
import { ref, onValue, set, update, remove, onDisconnect } from "firebase/database";

const { width } = Dimensions.get("window");
const WAIT_SECONDS = 30; // 30 seconds for test
const AI_NAMES = ["AhmedFUT99", "MoSalahFan", "King_Egy", "GamerX", "Zizo_Skillz"];

export default function OnlineLobby() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode || "3";
  const card = params.card || "3";
  const league = params.league || "all";
  const uid = auth.currentUser?.uid;
  const username = auth.currentUser?.displayName || "لاعب";

  const [status, setStatus] = useState<"searching" | "found" | "bot_found" | "error">("searching");
  const [countdown, setCountdown] = useState(WAIT_SECONDS);
  const [botName, setBotName] = useState("");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const foundAnim = useRef(new Animated.Value(0)).current;

  const queueRef = useRef<any>(null);
  const matchedRef = useRef(false);
  const roomId = useRef("");

  useEffect(() => {
    if (!uid) {
      setStatus("error");
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const doMatchmaking = async () => {
      matchedRef.current = false;
      const waitingRef = ref(database, "matchmaking/waiting");
      let foundOpponent = false;

      const unsubWaiting = onValue(waitingRef, (snap) => {
        if (matchedRef.current) return;
        const waitingPlayers = snap.val();
        
        if (waitingPlayers) {
          const oppUid = Object.keys(waitingPlayers).find(k => 
            k !== uid && 
            waitingPlayers[k].mode === mode && 
            waitingPlayers[k].card === card && 
            waitingPlayers[k].league === league
          );
          if (oppUid) {
            foundOpponent = true;
            matchedRef.current = true;
            unsubWaiting();
            remove(ref(database, `matchmaking/waiting/${oppUid}`));
            
            const rId = `room_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            roomId.current = rId;
            const newRoomRef = ref(database, `rooms/${rId}`);
            
            set(newRoomRef, {
              status: "ready",
              mode: mode,
              createdAt: Date.now(),
              seed: Math.floor(Math.random() * 999999),
              players: {
                [uid]: { username },
                [oppUid]: { username: waitingPlayers[oppUid].username },
              }
            }).then(() => {
              setStatus("found");
              Animated.spring(foundAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
              setTimeout(() => {
                router.replace(`/online-auction?roomId=${rId}&role=player1&mode=${mode}&league=${league}` as any);
              }, 1800);
            });
          }
        }
      }, { onlyOnce: true });

      if (!foundOpponent) {
        queueRef.current = ref(database, `matchmaking/waiting/${uid}`);
        onDisconnect(queueRef.current).remove(); // ⬅️ THIS PREVENTS GHOSTS!
        set(queueRef.current, {
          username,
          mode,
          card,
          league,
          joinedAt: Date.now(),
        });

        const roomsRef = ref(database, "rooms");
        let unsubRooms: () => void;
        unsubRooms = onValue(roomsRef, (snap) => {
          const rooms = snap.val();
          if (!rooms) return;
          for (const [rId, rData] of Object.entries(rooms) as [string, any][]) {
            const age = Date.now() - ((rData as any).createdAt || 0);
            if (age > 1000 * 60 * 2) {
              // 🧹 Room is older than 2 minutes, delete it to prevent ghosts!
              remove(ref(database, `rooms/${rId}`));
              continue;
            }

            if ((rData as any).status === "ready" && (rData as any).players?.[uid]) {
              if (!matchedRef.current) {
                // If they are rejoining, we must know their actual role!
                const isP1 = Object.keys((rData as any).players)[0] === uid;
                
                matchedRef.current = true;
                roomId.current = rId;
                if (queueRef.current) remove(queueRef.current);
                setStatus("found");
                Animated.spring(foundAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
                setTimeout(() => {
                  router.replace(`/online-auction?roomId=${rId}&role=${isP1 ? "player1" : "player2"}&mode=${mode}&league=${league}&card=${card}` as any);
                }, 1800);
                if (unsubRooms) unsubRooms();
              }
              break;
            }
          }
        });
      }
    };

    doMatchmaking();

    return () => {
      matchedRef.current = true;
      if (queueRef.current) remove(queueRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "searching") return;
    if (countdown <= 0) {
      matchedRef.current = true;
      if (queueRef.current) remove(queueRef.current);
      
      const bName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
      setBotName(bName);
      setStatus("bot_found");
      
      Animated.spring(foundAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      
      setTimeout(() => {
        router.replace(`/online-auction?roomId=bot_room&role=player1&mode=${mode}&bot=true&botName=${bName}&league=${league}&card=${card}` as any);
      }, 1800);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, status]);

  const handleCancel = () => {
    matchedRef.current = true;
    if (queueRef.current) remove(queueRef.current);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {status === "searching" && (
        <View style={styles.center}>
          <Animated.View style={[styles.radar, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.radarIcon}>🌍</Text>
          </Animated.View>
          <Text style={styles.title}>جاري البحث عن خصم...</Text>
          <Text style={styles.subtitle}>النمط: {mode === "3" ? "خماسي" : "كلاسيك 11"}</Text>
          
          <View style={styles.countdownWrap}>
            <Text style={styles.countdownText}>{countdown}s للعب مع AI</Text>
            <View style={styles.countdownBar}>
              <View style={[styles.countdownFill, { width: `${(countdown / WAIT_SECONDS) * 100}%` }]} />
            </View>
          </View>

          <ActivityIndicator color="#00f2fe" size="large" style={{ marginTop: 20 }} />

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>إلغاء البحث</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "found" && (
        <Animated.View style={[styles.center, { opacity: foundAnim, transform: [{ scale: foundAnim }] }]}>
          <Text style={{ fontSize: 80 }}>⚡</Text>
          <Text style={styles.foundTitle}>وجدنا خصمك!</Text>
          <Text style={styles.foundSubtitle}>جاري الدخول للمزاد...</Text>
        </Animated.View>
      )}

      {status === "bot_found" && (
        <Animated.View style={[styles.center, { opacity: foundAnim, transform: [{ scale: foundAnim }] }]}>
          <Text style={{ fontSize: 80 }}>🤖</Text>
          <Text style={styles.foundTitle}>وجدنا خصمك!</Text>
          <Text style={[styles.foundSubtitle, { color: "#94a3b8" }]}>{botName} انضم للمزاد</Text>
          <Text style={styles.foundSubtitle}>جاري الدخول...</Text>
        </Animated.View>
      )}

      {status === "error" && (
        <View style={styles.center}>
          <Text style={{ fontSize: 60 }}>❌</Text>
          <Text style={styles.title}>حدث خطأ</Text>
          <Text style={styles.subtitle}>تأكد من تسجيل الدخول وحاول مرة أخرى</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>رجوع</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050B20" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  radar: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(0,242,254,0.15)",
    borderWidth: 2, borderColor: "#00f2fe",
    justifyContent: "center", alignItems: "center",
    marginBottom: 32,
  },
  radarIcon: { fontSize: 50 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { color: "#64748b", fontSize: 14, textAlign: "center" },
  countdownWrap: { width: "100%", marginTop: 40, alignItems: "center" },
  countdownText: { color: "#94a3b8", fontSize: 12, marginBottom: 8 },
  countdownBar: { width: width * 0.6, height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" },
  countdownFill: { height: "100%", backgroundColor: "#00f2fe" },
  cancelBtn: { marginTop: 40, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, borderWidth: 1, borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.1)" },
  cancelText: { color: "#ef4444", fontWeight: "bold", fontSize: 15 },
  foundTitle: { color: "#facc15", fontSize: 28, fontWeight: "900", marginTop: 20, marginBottom: 8 },
  foundSubtitle: { color: "#22c55e", fontSize: 16, fontWeight: "bold" }
});
