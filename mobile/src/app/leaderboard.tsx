import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Dimensions, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ref, onValue } from 'firebase/database';
import { auth, database } from '../firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchLeaderboard } from '../services/serverApi';

const { width } = Dimensions.get('window');

interface PlayerEntry {
  uid: string;
  username: string;
  coins: number;
  photoURL?: string;
  wins: number;
  dailyWins?: number;
  weeklyWins?: number;
  monthlyWins?: number;
  totalMatches: number;
  losses: number;
  draws: number;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';



const AVATAR_COLORS = ['#7c3aed','#2563eb','#db2777','#059669','#d97706','#dc2626','#0891b2'];
function avatarColor(letter: string) {
  return AVATAR_COLORS[letter.toUpperCase().charCodeAt(0) % AVATAR_COLORS.length];
}

/* ── Animated Avatar ─────────────────────────────────── */
function PlayerAvatar({ uri, letter, size, border }: { uri?: string; letter: string; size: number; border: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: border, overflow: 'hidden', backgroundColor: avatarColor(letter) }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: size * 0.42, fontWeight: '900' }}>{letter.toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

/* ── Rank 1 Pulsing Ring ─────────────────────────────── */
function PulsingRing({ size }: { size: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse,   { toValue: 1.18, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse,   { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: size + 16, height: size + 16,
      borderRadius: (size + 16) / 2, borderWidth: 3, borderColor: '#FFD700',
      opacity, transform: [{ scale: pulse }],
    }} />
  );
}

/* ── Podium ──────────────────────────────────────────── */
function Podium({ top3, myUid }: { top3: PlayerEntry[]; myUid?: string }) {
  const { theme } = useTheme();
  const entranceAnims = useRef([
    new Animated.Value(60), new Animated.Value(60), new Animated.Value(60)
  ]).current;
  const opacityAnims = useRef([
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)
  ]).current;

  useEffect(() => {
    const order = [1, 0, 2]; // center first
    order.forEach((i, delay) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(entranceAnims[i], { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
          Animated.timing(opacityAnims[i], { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }, delay * 150);
    });
  }, []);

  if (!top3[0]) return null;

  const slots = [
    { player: top3[1], rank: 2 as const, size: 64,  podiumH: 60,  crown: '🥈', color: '#b0bec5', labelColor: '#90a4ae', yOffset: 20 },
    { player: top3[0], rank: 1 as const, size: 80,  podiumH: 90,  crown: '👑', color: '#FFD700', labelColor: '#FFD700', yOffset: 0  },
    { player: top3[2], rank: 3 as const, size: 64,  podiumH: 40,  crown: '🥉', color: '#CD7F32', labelColor: '#CD7F32', yOffset: 30 },
  ];

  return (
    <View style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
      <Text style={[styles.podiumLabel, { color: theme.accent }]}>{useLanguage().t('currentStandings')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginTop: 16 }}>
        {slots.map((slot, i) => {
          if (!slot.player) return <View key={`empty-${slot.rank}-${i}`} style={{ flex: 1 }} />;
          const isMe = slot.player.uid === myUid;
          return (
            <Animated.View key={`podium-slot-${slot.rank}`} style={{ flex: 1, alignItems: 'center', opacity: opacityAnims[i], transform: [{ translateY: entranceAnims[i] }] }}>
              {/* Crown */}
              <Text style={{ fontSize: slot.rank === 1 ? 28 : 20, marginBottom: 4 }}>{slot.crown}</Text>

              {/* Avatar with ring for #1 */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {slot.rank === 1 && <PulsingRing size={slot.size} />}
                <PlayerAvatar uri={slot.player.photoURL} letter={slot.player.username[0]} size={slot.size} border={slot.color} />
              </View>

              {/* Rank badge */}
              <View style={[styles.rankBadge, { backgroundColor: slot.color, marginTop: 6 }]}>
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 11 }}>#{slot.rank}</Text>
              </View>

              {/* Name */}
              <Text style={{ color: isMe ? '#facc15' : theme.text, fontWeight: 'bold', fontSize: 12, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                {slot.player.username}
              </Text>
              {/* Wins */}
              <Text style={{ color: slot.labelColor, fontWeight: '900', fontSize: 18 }}>{slot.player.wins}</Text>

              {/* Podium base */}
              <View style={[styles.podiumBase, { height: slot.podiumH, backgroundColor: slot.color + '33', borderTopColor: slot.color }]}>
                <Text style={{ color: slot.color, fontWeight: '900', fontSize: 20 }}>{slot.rank}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/* ── Animated Row ───────────────────────────────────── */
function AnimatedRow({ item, rank, myUid, index }: { item: PlayerEntry; rank: number; myUid?: string; index: number }) {
  const { theme, isDark } = useTheme();
  const translateX = useRef(new Animated.Value(60)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const isMe = item.uid === myUid;

  useEffect(() => {
    const delay = index * 60;
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View style={[
      styles.listRow,
      { backgroundColor: theme.surface },
      isMe && { borderWidth: 2, borderColor: '#facc15', backgroundColor: isDark ? '#2a2000' : '#fffbeb' },
      { opacity, transform: [{ translateX }] },
    ]}>
      {/* Rank box */}
      <View style={[styles.listRankBox, { backgroundColor: theme.bgSecondary }, isMe && { backgroundColor: '#facc15' }]}>
        <Text style={[styles.listRankHash, { color: theme.textSecondary }, isMe && { color: '#000' }]}>#</Text>
        <Text style={[styles.listRankNum, { color: theme.accent }, isMe && { color: '#000' }]}>{rank}</Text>
      </View>

      {/* Avatar */}
      <PlayerAvatar uri={item.photoURL} letter={item.username[0]} size={46} border={isMe ? '#facc15' : theme.surfaceBorder} />

      {/* Info */}
      <View style={{ flex: 1, paddingRight: 4 }}>
        <Text style={[styles.listName, { color: theme.text }, isMe && { color: '#d97706' }]} numberOfLines={1}>{item.username}</Text>
        <Text style={[styles.listMatchesText, { color: theme.textSecondary }]}>{item.totalMatches} مباراة</Text>
      </View>

      {/* Stats */}
      <View style={styles.listStatsWrap}>
        <View style={styles.listStatBox}>
          <Text style={[styles.listStatLbl, { color: theme.textSecondary }]}>{useLanguage().t('wins')}</Text>
          <Text style={[styles.listStatVal, { color: theme.text }]}>{item.wins}</Text>
        </View>
        <View style={[styles.listStatBox, { marginLeft: 10 }]}>
          <Text style={[styles.listStatLbl, { color: theme.textSecondary }]}>{useLanguage().t('pts')}</Text>
          <Text style={[styles.listStatVal, { color: '#facc15' }]}>{item.wins}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Main Screen ─────────────────────────────────────── */
export default function LeaderboardScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const myUid = auth.currentUser?.uid;
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('weekly');
  const [key, setKey] = useState(0); // forces re-mount of list on tab change

  // Header shimmer
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const queryType = period === 'yearly' ? 'all' : period;
        const list = await fetchLeaderboard(queryType as any);
        setPlayers(list.map((u: any) => ({
          uid: u.uid,
          username: u.username || 'لاعب',
          coins: u.coins || 0,
          photoURL: u.photoURL,
          wins: u.wins || 0,
          dailyWins: u.wins || 0,
          weeklyWins: u.wins || 0,
          monthlyWins: u.wins || 0,
          losses: 0,
          draws: 0,
          totalMatches: u.wins || 0,
        })));
      } catch (err) {
        console.log('Leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [period]);

  const PERIODS: { key: Period; icon: string; label: string; prize: string; prizeDesc: string }[] = [
    { key: 'daily',   icon: '📅', label: t('daily'),   prize: t('dailyPrize'),        prizeDesc: t('dailyPrizeDesc') },
    { key: 'weekly',  icon: '🎤', label: t('weekly'), prize: t('weeklyPrize'), prizeDesc: t('weeklyPrizeDesc') },
    { key: 'monthly', icon: '👕', label: t('monthly'),   prize: t('monthlyPrize'), prizeDesc: t('monthlyPrizeDesc') },
    { key: 'yearly',  icon: '🏆', label: t('yearly'),   prize: t('yearlyPrize'), prizeDesc: t('yearlyPrizeDesc') },
  ];

  const sorted = [...players]
    .map(p => {
      let score = p.wins;
      if (period === 'daily') score = p.dailyWins || 0;
      else if (period === 'weekly') score = p.weeklyWins || 0;
      else if (period === 'monthly') score = p.monthlyWins || 0;
      
      return { ...p, wins: score };
    })
    .sort((a, b) => b.wins - a.wins);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const myRank = sorted.findIndex(p => p.uid === myUid) + 1;
  const myData = sorted.find(p => p.uid === myUid);
  const periodCfg = PERIODS.find(p => p.key === period)!;

  const now = new Date();
  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dateStr = `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.statusBar} />

      {/* Blue Gradient Header */}
      <LinearGradient colors={['#0f2c6f', '#1a3a8c', '#1e4db7']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold' }}>{t('back')}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('leaderboard')}</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Period Tabs */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 16, gap: 6 }}>
            {PERIODS.map((p) => {
              const isActive = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => { setPeriod(p.key); setKey(k => k + 1); }}
                  style={[styles.tab, isActive && styles.tabActive, { flex: 1 }]}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tabIcon}>{p.icon}</Text>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} key={key}>
        {/* Prize Banner */}
        <Animated.View style={[styles.prizeBanner, { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }]}>
          <LinearGradient colors={['#f59e0b', '#facc15', '#f59e0b']} style={styles.prizeBannerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.prizeTitle}>{periodCfg.prize}</Text>
            <Text style={styles.prizeSub}>{periodCfg.prizeDesc}</Text>
          </LinearGradient>
        </Animated.View>

        {/* My Rank Card */}
        {myData && (
          <LinearGradient
            colors={['#0f2c6f', '#162d6e', '#1e4db7']}
            style={styles.myCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {/* Left: Rank Badge */}
            <View style={styles.myCardRankBadge}>
              <Text style={styles.myCardRankLabel}>{t('myRank')}</Text>
              <Text style={styles.myCardRankNum}>#{myRank}</Text>
            </View>

            {/* Center: Avatar + Name + Bar */}
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <PlayerAvatar
                uri={myData.photoURL}
                letter={myData.username[0]}
                size={52}
                border="#facc15"
              />
              <Text style={styles.myCardName} numberOfLines={1}>{myData.username}</Text>
              {/* Progress Bar */}
              <View style={styles.myCardBar}>
                <View style={[styles.myCardBarFill, {
                  width: `${Math.min(100, (myData.wins / Math.max(1, top3[0]?.wins || 1)) * 100)}%`
                }]} />
              </View>
            </View>

            {/* Right: Wins */}
            <View style={styles.myCardStatBox}>
              <Text style={styles.myCardStatVal}>{myData.wins}</Text>
              <Text style={styles.myCardStatLbl}>{t('points')}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Last Update */}
        <Text style={styles.lastUpdate}>{t('lastUpdate')}: {dateStr}</Text>

        {/* Podium */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.accent} />
        ) : (
          <>
            <Podium top3={top3} myUid={myUid} />

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.surfaceBorder }]} />

            {/* Rest of list */}
            {rest.map((item, idx) => (
              <AnimatedRow key={item.uid} item={item} rank={idx + 4} myUid={myUid} index={idx} />
            ))}

            {rest.length === 0 && top3.length < 4 && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noOtherPlayers')}</Text>
            )}
          </>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: {
    width: 48, height: 48,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center', flex: 1 },
  tab: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingVertical: 12,
  },
  tabActive: { backgroundColor: '#facc15' },
  tabIcon: { fontSize: 16 },
  tabLabel: { color: 'rgba(255,255,255,0.75)', fontWeight: 'bold', fontSize: 13 },
  tabLabelActive: { color: '#0f172a' },

  prizeBanner: {
    marginHorizontal: 14, marginTop: 14, borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  prizeBannerGrad: { paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center' },
  prizeTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  prizeSub: { color: '#1e3a5f', fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 20 },

  myCard: {
    marginHorizontal: 14, marginTop: 12, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    shadowColor: '#1a3a8c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  myCardRankBadge: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(250,204,21,0.15)',
    borderWidth: 1.5, borderColor: '#facc15',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    minWidth: 58,
  },
  myCardRankLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  myCardRankNum: { color: '#facc15', fontSize: 22, fontWeight: '900' },
  myCardBar: {
    width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4, overflow: 'hidden',
  },
  myCardBarFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: '#facc15', borderRadius: 4,
  },
  myCardName: { color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  myCardStatBox: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1.5, borderColor: '#22c55e',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    minWidth: 58,
  },
  myCardStatVal: { color: '#22c55e', fontSize: 22, fontWeight: '900' },
  myCardStatLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', marginTop: 2 },

  lastUpdate: {
    color: '#facc15', fontSize: 11, textAlign: 'right',
    paddingHorizontal: 18, marginTop: 6, marginBottom: 2, opacity: 0.85,
  },

  podiumLabel: {
    textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 4,
  },
  rankBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  podiumBase: {
    width: '100%', marginTop: 8, borderTopWidth: 2, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', paddingVertical: 6,
  },

  divider: { height: 1, marginHorizontal: 16, marginVertical: 12 },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 10,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 3,
  },

  listRankBox: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  listRankHash: { fontSize: 9 },
  listRankNum: { fontWeight: '900', fontSize: 14, marginTop: -2 },
  listName: { fontWeight: 'bold', fontSize: 14, textAlign: 'right' },
  listMatchesText: { fontSize: 11, textAlign: 'right', marginTop: 2 },
  listStatsWrap: { flexDirection: 'row', alignItems: 'center' },
  listStatBox: { alignItems: 'center' },
  listStatLbl: { fontSize: 10 },
  listStatVal: { fontWeight: '900', fontSize: 15 },

  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
