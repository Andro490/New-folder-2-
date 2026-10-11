import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, Linking } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import NetworkGuard from '../components/NetworkGuard';

import { ref, get, update } from 'firebase/database';
import { database, auth } from '../firebase';

const ADMIN_WHATSAPP = '+201144231586';
const RANK_EMOJIS = ['🥇 المركز الأول', '🥈 المركز الثاني', '🥉 المركز الثالث'];
const PRIZE_LABELS = ['100 كوين + جايزة كبيرة 🎁', '50 كوين 🎖️', '20 كوين 🎗️'];

function useDailyRewardCheck() {
  React.useEffect(() => {
    const checkResets = async () => {
      try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentYear = now.getFullYear().toString();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        const isFriday = now.getDay() === 5; // 5 is Friday

        // Check if today is the last day of the current month
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const isLastDayOfMonth = now.getDate() === lastDayOfMonth;

        const metaRef = ref(database, 'metadata');
        const metaSnap = await get(metaRef);
        const metaData = metaSnap.val() || {};

        const lastDailyDate = metaData.lastDailyRewardDate;
        const lastWeeklyDate = metaData.lastWeeklyResetDate;
        const lastMonthlyMonth = metaData.lastMonthlyResetMonth;
        const lastYear = metaData.lastYearlyResetYear;

        const playersRef = ref(database, 'players');
        const playersSnap = await get(playersRef);

        if (playersSnap.exists()) {
          const playersData = playersSnap.val();
          const updates: any = {};
          let needsUpdate = false;

          // 1. Daily Reset & Coins Reward
          if (lastDailyDate !== dateStr) {
            needsUpdate = true;
            const playersList = Object.entries(playersData).map(([uid, val]: any) => ({
              uid,
              ...val,
              dailyWins: val.stats?.dailyWins || 0
            }));
            
            playersList.sort((a, b) => b.dailyWins - a.dailyWins);
            const top3 = playersList.filter(p => p.dailyWins > 0).slice(0, 3);

            if (top3[0]) updates[`players/${top3[0].uid}/coins`] = (top3[0].coins || 0) + 100;
            if (top3[1]) updates[`players/${top3[1].uid}/coins`] = (top3[1].coins || 0) + 50;
            if (top3[2]) updates[`players/${top3[2].uid}/coins`] = (top3[2].coins || 0) + 20;

            Object.keys(playersData).forEach(uid => {
              updates[`players/${uid}/stats/dailyWins`] = 0;
            });
            updates['metadata/lastDailyRewardDate'] = dateStr;
          }

          // 2. Weekly Reset (Every Friday at 12:00 AM)
          if (isFriday && lastWeeklyDate !== dateStr) {
            needsUpdate = true;

            // Archive the top 3 weekly winners before resetting
            const weeklyPlayersList = Object.entries(playersData).map(([uid, val]: any) => ({
              uid,
              username: val.username || 'لاعب',
              email: val.email || 'غير متوفر',
              phone: val.phone || 'غير مسجل',
              weeklyWins: val.stats?.weeklyWins || 0,
            }));
            weeklyPlayersList.sort((a, b) => b.weeklyWins - a.weeklyWins);
            const top3Weekly = weeklyPlayersList.filter(p => p.weeklyWins > 0).slice(0, 3);

            if (top3Weekly.length > 0) {
              updates[`weeklyWinnersArchive/${dateStr}`] = {
                date: dateStr,
                timestamp: Date.now(),
                winners: top3Weekly,
              };
            }

            Object.keys(playersData).forEach(uid => {
              updates[`players/${uid}/stats/weeklyWins`] = 0;
            });
            updates['metadata/lastWeeklyResetDate'] = dateStr;
            console.log("Weekly leaderboard reset and winners archived for Friday!");
          }

          // 3. Monthly Reset (Last day of each month)
          if (isLastDayOfMonth && lastMonthlyMonth !== currentMonthStr) {
            needsUpdate = true;

            // Archive the top 3 monthly winners before resetting
            const monthlyPlayersList = Object.entries(playersData).map(([uid, val]: any) => ({
              uid,
              username: val.username || 'لاعب',
              email: val.email || 'غير متوفر',
              phone: val.phone || 'غير مسجل',
              monthlyWins: val.stats?.monthlyWins || 0,
            }));
            monthlyPlayersList.sort((a, b) => b.monthlyWins - a.monthlyWins);
            const top3Monthly = monthlyPlayersList.filter(p => p.monthlyWins > 0).slice(0, 3);

            if (top3Monthly.length > 0) {
              updates[`monthlyWinnersArchive/${currentMonthStr}`] = {
                month: currentMonthStr,
                timestamp: Date.now(),
                winners: top3Monthly,
              };
            }

            Object.keys(playersData).forEach(uid => {
              updates[`players/${uid}/stats/monthlyWins`] = 0;
            });
            updates['metadata/lastMonthlyResetMonth'] = currentMonthStr;
            console.log(`Monthly leaderboard reset and winners archived for ${currentMonthStr}!`);
          }

          // 4. Yearly Reset (December 31 — last day of the year)
          const isDecember31 = now.getMonth() === 11 && now.getDate() === 31;
          if (isDecember31 && lastYear !== currentYear) {
            needsUpdate = true;

            // Archive top 3 yearly winners before resetting
            const yearlyPlayersList = Object.entries(playersData).map(([uid, val]: any) => ({
              uid,
              username: val.username || 'لاعب',
              email: val.email || 'غير متوفر',
              phone: val.phone || 'غير مسجل',
              yearlyWins: val.stats?.wins || 0,
            }));
            yearlyPlayersList.sort((a, b) => b.yearlyWins - a.yearlyWins);
            const top3Yearly = yearlyPlayersList.filter(p => p.yearlyWins > 0).slice(0, 3);

            if (top3Yearly.length > 0) {
              updates[`yearlyWinnersArchive/${currentYear}`] = {
                year: currentYear,
                timestamp: Date.now(),
                winners: top3Yearly,
              };
            }

            Object.keys(playersData).forEach(uid => {
              updates[`players/${uid}/stats/wins`] = 0;
            });
            updates['metadata/lastYearlyResetYear'] = currentYear;
            console.log(`Yearly leaderboard reset and winners archived for ${currentYear}!`);
          } else if (!lastYear) {
            updates['metadata/lastYearlyResetYear'] = currentYear;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await update(ref(database), updates);
            console.log("Database reset checks completed successfully.");
          }
        }
      } catch (err) {
        console.log("Error in background leaderboard reset:", err);
      }
    };
    
    setTimeout(checkResets, 2000);
  }, []);
}

// ── Winner Notification Hook ──────────────────────────────────────────────────
// Shows a notification to the current user if they are in the top 3 weekly
// ranking, so they can reach out to the admin to claim their prize.
function useWinnerNotification() {
  React.useEffect(() => {
    const checkIfWinner = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // Throttle: only show once per day per session
        const metaSnap = await get(ref(database, 'metadata/lastWinnerNotifyDate'));
        const lastNotifyDate = metaSnap.val();
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastNotifyDate === `${currentUser.uid}_${todayStr}`) return;

        const playersSnap = await get(ref(database, 'players'));
        if (!playersSnap.exists()) return;

        const playersData = playersSnap.val();
        const list = Object.entries(playersData).map(([uid, val]: any) => ({
          uid,
          username: val.username || 'لاعب',
          weeklyWins: val.stats?.weeklyWins || 0,
        }));

        list.sort((a, b) => b.weeklyWins - a.weeklyWins);
        const top3 = list.filter(p => p.weeklyWins > 0).slice(0, 3);
        const myRank = top3.findIndex(p => p.uid === currentUser.uid);

        if (myRank !== -1) {
          const rankLabel = RANK_EMOJIS[myRank];
          const prizeLabel = PRIZE_LABELS[myRank];
          const myName = top3[myRank].username;

          // Generate a unique verify code (6 chars) and save it in Firebase
          // The admin can cross-check this code in the archive/player node
          const verifyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await update(ref(database), {
            'metadata/lastWinnerNotifyDate': `${currentUser.uid}_${todayStr}`,
            [`players/${currentUser.uid}/weeklyVerifyCode`]: verifyCode,
          });

          // Small delay so app loads first
          setTimeout(() => {
            Alert.alert(
              `🏆 مبروك يا ${myName}!`,
              `أنت في ${rankLabel} هذا الأسبوع!\n\nجايزتك: ${prizeLabel}\n\n🔐 كود التحقق بتاعك:\n【 ${verifyCode} 】\n\nابعت الكود ده للمسؤول على واتساب عشان يتأكد من هويتك ويبعتلك جايزتك! 🎁`,
              [
                { text: '⬅️ لاحقاً', style: 'cancel' },
                {
                  text: '💬 تواصل الآن!',
                  onPress: () => {
                    const msg = encodeURIComponent(
                      `السلام عليكم 👋\nأنا ${myName} وأنا في ${rankLabel} هذا الأسبوع في تطبيق الألعاب!\n\n🔐 كود التحقق بتاعي: ${verifyCode}\n\nعايز أستلم جايزتي 🏆🎁`
                    );
                    Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP.replace('+', '')}?text=${msg}`);
                  },
                },
              ]
            );
          }, 3000);
        }
      } catch (err) {
        console.log("Error in winner notification check:", err);
      }
    };

    setTimeout(checkIfWinner, 5000);
  }, []);
}

function AppStack() {
  const { theme } = useTheme();
  useDailyRewardCheck();
  useWinnerNotification();
  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function Layout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NetworkGuard>
          <AppStack />
        </NetworkGuard>
      </ThemeProvider>
    </LanguageProvider>
  );
}
