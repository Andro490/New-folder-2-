import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

// ============================================================
// بيانات الأقسام
// ============================================================
const MODES = [
  { id: '1', label: 'مزاد المليار', image: require('../assets/card_billion.jpg'),  locked: true,  comingSoon: true },
  { id: '2', label: 'برو ماكس',    image: require('../assets/card_pro_max.jpg'), locked: false,  comingSoon: false },
  { id: '3', label: 'كلاسيك',      image: require('../assets/card_classic.jpg'), locked: false, comingSoon: false },
];

const CARDS = [
  { id: '1', label: 'نو ريسك نو فان', image: require('../assets/card_normal.jpg'),    locked: true,  comingSoon: true,  tint: '#92400e' },
  { id: '2', label: 'لاست بيد',       image: require('../assets/card_last_bid.jpg'), locked: true, comingSoon: true, tint: null },
  { id: '3', label: 'وايلد كارد',     image: require('../assets/card_wildcard.jpg'), locked: false, comingSoon: false, tint: null },
  { id: '4', label: 'عادي',           image: require('../assets/card_normal.jpg'),   locked: false, comingSoon: false, tint: null },
];

const LEAGUES = [
  { id: 'epic',    label: 'Epic',        color: '#7f1d1d', emoji: '🌟' },
  { id: 'showtime',label: 'Showtime',    color: '#1e3a8a', emoji: '🎭' },
  { id: 'bigtime', label: 'Bigtime',     color: '#7c3aed', emoji: '⏱️' },
  { id: 'all',     label: 'كل اللاعبين', color: '#064e3b', emoji: '⚽' },
];

// ============================================================
// مكون الكارت القابل للاختيار
// ============================================================
function SelectCard({
  item, selected, onPress, wide = false,
}: {
  item: any; selected: boolean; onPress: () => void; wide?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={item.locked ? undefined : onPress}
      style={[styles.card, wide && styles.cardWide, selected && styles.cardSelected]}
      activeOpacity={item.locked ? 1 : 0.85}
    >
      <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
      {item.locked && (
        <View style={styles.lockOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.comingSoonText}>قريبا</Text>
        </View>
      )}
      {selected && !item.locked && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      <View style={styles.cardLabelBox}>
        <Text style={styles.cardLabel}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// مكون كارت الدوري / اللاعبين (بدون صورة - لون + ايموجي)
// ============================================================
function LeagueCard({
  item, selected, onPress,
}: {
  item: any; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={item.comingSoon ? undefined : onPress}
      style={[styles.leagueCard, { backgroundColor: item.color }, selected && styles.cardSelected, item.comingSoon && { opacity: 0.85 }]}
      activeOpacity={item.comingSoon ? 1 : 0.85}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      {item.comingSoon && (
        <View style={styles.comingSoonOverlay}>
          <Text style={styles.comingSoonText}>قريبا</Text>
        </View>
      )}
      <Text style={styles.leagueEmoji}>{item.emoji}</Text>
      <View style={styles.cardLabelBox}>
        <Text style={styles.cardLabel}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// الشاشة الرئيسية
// ============================================================
export default function AuctionSetupScreen() {
  const router = useRouter();

  const [selectedMode,   setSelectedMode]   = useState<string>('3'); // كلاسيك مختار افتراضياً
  const [selectedCard,   setSelectedCard]   = useState<string>('4'); // عادي مختار افتراضياً
  const [selectedLeague, setSelectedLeague] = useState<string>('all'); // كل اللاعبين افتراضياً

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الألعاب</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── قسم الوضع ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={styles.rowContent}>
          {MODES.map(m => (
            <SelectCard key={m.id} item={m} selected={selectedMode === m.id} onPress={() => setSelectedMode(m.id)} />
          ))}
        </ScrollView>

        {/* ── اختر الكارت ── */}
        <Text style={styles.sectionTitle}>اختر الكارت</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={styles.rowContent}>
          {CARDS.map(c => (
            <SelectCard key={c.id} item={c} selected={selectedCard === c.id} onPress={() => setSelectedCard(c.id)} />
          ))}
        </ScrollView>

        {/* ── اختر لاعبى المزاد ── */}
        <Text style={styles.sectionTitle}>اختر لاعبى المزاد</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={styles.rowContent}>
          {LEAGUES.map(l => (
            <LeagueCard key={l.id} item={l} selected={selectedLeague === l.id} onPress={() => setSelectedLeague(l.id)} />
          ))}
        </ScrollView>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* ── الأزرار السفلية ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.playBtn} onPress={() => router.push(`/online-lobby?mode=${selectedMode}&card=${selectedCard}&league=${selectedLeague}` as any)}>
          <Text style={styles.playBtnIcon}>⚡</Text>
          <Text style={styles.playBtnText}>العب</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.challengeBtn} onPress={() => router.push(`/ai-intro?mode=${selectedMode}&card=${selectedCard}&league=${selectedLeague}` as any)}>
          <Text style={styles.challengeBtnIcon}>🤖</Text>
          <Text style={styles.challengeBtnText}>العب ضد AI</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// الستايلات
// ============================================================
const CARD_W = 160;
const CARD_H = 210;
const LEAGUE_W = 130;
const LEAGUE_H = 180;

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0d1f4c' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    position: 'absolute', right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: 'bold' },

  sectionTitle: {
    color: '#fff', fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', marginVertical: 14,
  },

  row: { marginBottom: 4 },
  rowContent: { paddingHorizontal: 14, gap: 12, paddingBottom: 4 },

  // --- cards with image ---
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: '#1e3a8a',
    position: 'relative',
  },
  cardWide: { width: CARD_W + 40 },
  cardSelected: { borderColor: '#eab308', borderWidth: 3 },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },

  lockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 5,
  },
  lockIcon: { fontSize: 28, marginBottom: 6 },
  comingSoonOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 5,
  },
  comingSoonText: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  checkBadge: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: '#eab308', width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  checkText: { color: '#000', fontWeight: 'bold', fontSize: 14 },

  cardLabelBox: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 6, alignItems: 'center',
  },
  cardLabel: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // --- league cards ---
  leagueCard: {
    width: LEAGUE_W, height: LEAGUE_H,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: '#1e3a8a',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  leagueEmoji: { fontSize: 40, marginBottom: 10 },

  // --- footer buttons ---
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, gap: 10, backgroundColor: '#0d1f4c',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e3a8a', borderRadius: 30, paddingVertical: 14,
  },
  playBtnIcon: { fontSize: 20, marginRight: 8 },
  playBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  challengeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#16a34a', borderRadius: 30, paddingVertical: 14,
  },
  challengeBtnIcon: { fontSize: 20, marginRight: 8 },
  challengeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
