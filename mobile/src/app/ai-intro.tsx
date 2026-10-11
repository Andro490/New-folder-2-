import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, Animated, Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function AiIntroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode || '3';
  const league = params.league || 'all';
  const card = params.card || '4';
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <ImageBackground
      source={require("../assets/ai_auction_intro.jpg")}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar style="light" />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Top label */}
      <Animated.View style={[styles.topLabel, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.topLabelText}>العب مع</Text>
      </Animated.View>

      {/* Bottom content */}
      <Animated.View style={[styles.bottom, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.aiBadge, { opacity: glowOpacity }]}>
          <Text style={styles.aiBadgeIcon}>🤖</Text>
          <Text style={styles.aiBadgeText}>الذكاء الاصطناعي</Text>
        </Animated.View>

        <Text style={styles.title}>مزاد ضد AI</Text>
        <Text style={styles.subtitle}>
          {"زايد على أفضل اللاعبين وتحدى الذكاء الاصطناعي!\nمن يبني أقوى فريق يفوز 🏆"}
        </Text>

        <View style={styles.featuresRow}>
          <View style={styles.featureChip}><Text style={styles.featureText}>⚡ مزايدة حية</Text></View>
          <View style={styles.featureChip}><Text style={styles.featureText}>🎯 تكتيك ذكي</Text></View>
          <View style={styles.featureChip}><Text style={styles.featureText}>💰 ميزانية محدودة</Text></View>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }], width: "100%" }}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push(`/ai-auction?mode=${mode}&league=${league}&card=${card}` as any)}
            activeOpacity={0.88}
          >
            <Text style={styles.startBtnIcon}>▶</Text>
            <Text style={styles.startBtnText}>ابدأ</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,10,0.65)",
  },
  topLabel: {
    position: "absolute", top: 60, alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20,
  },
  topLabelText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 48, paddingTop: 30, alignItems: "center",
    backgroundColor: "rgba(0,0,20,0.5)",
  },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(59,130,246,0.25)",
    borderWidth: 1, borderColor: "rgba(96,165,250,0.6)",
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 30, marginBottom: 14,
  },
  aiBadgeIcon: { fontSize: 18 },
  aiBadgeText: { color: "#93c5fd", fontSize: 14, fontWeight: "bold" },
  title: {
    color: "#fff", fontSize: 36, fontWeight: "900",
    textAlign: "center", marginBottom: 10,
    textShadowColor: "rgba(96,165,250,0.8)", textShadowRadius: 20,
  },
  subtitle: { color: "#cbd5e1", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  featuresRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 },
  featureChip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  featureText: { color: "#e2e8f0", fontSize: 12 },
  startBtn: {
    width: "100%", borderRadius: 50, overflow: "hidden", marginBottom: 16,
    backgroundColor: "#dc2626",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 18, gap: 10,
  },
  startBtnIcon: { color: "#fff", fontSize: 18 },
  startBtnText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  backBtn: { paddingVertical: 8 },
  backBtnText: { color: "#64748b", fontSize: 14 },
});
