import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, ScrollView, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { ref, onValue, update, get } from 'firebase/database';
import { auth, database, storage } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const user = auth.currentUser;
  
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [stats, setStats] = useState({ matches: 0, wins: 0, losses: 0, draws: 0, coins: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);

  // Admin Winners Archive State
  const isAdmin = user?.email?.toLowerCase() === 'emelnasr@gmail.com';
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [archiveData, setArchiveData] = useState<any[]>([]);
  const [monthlyArchiveData, setMonthlyArchiveData] = useState<any[]>([]);
  const [yearlyArchiveData, setYearlyArchiveData] = useState<any[]>([]);
  const [currentTop3, setCurrentTop3] = useState<any[]>([]);
  const [currentMonthlyTop3, setCurrentMonthlyTop3] = useState<any[]>([]);
  const [currentYearlyTop3, setCurrentYearlyTop3] = useState<any[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  useEffect(() => {
    if (!user) return;
    const playerRef = ref(database, `players/${user.uid}`);
    const unsub = onValue(playerRef, (snap) => {
      const data = snap.val();
      if (data) {
        setUsername(data.username || user.displayName || 'لاعب');
        setPhone(data.phone || '');
        setPhotoURL(data.photoURL || user.photoURL || null);
        setStats({
          matches: (data.wins || 0) + (data.losses || 0) + (data.draws || 0),
          wins: data.wins || 0,
          losses: data.losses || 0,
          draws: data.draws || 0,
          coins: data.coins || 0,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    try {
      await update(ref(database, `players/${user.uid}`), { username: username.trim() });
      await updateProfile(user, { displayName: username.trim() });
      Alert.alert(t('success'), t('nameUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('updateError'));
    }
    setSaving(false);
  };

  const handleSavePhone = async () => {
    if (!user || !phone.trim()) {
      Alert.alert(t('error'), 'من فضلك أدخل رقم الهاتف');
      return;
    }
    setSavingPhone(true);
    try {
      await update(ref(database, `players/${user.uid}`), { phone: phone.trim() });
      Alert.alert(t('success'), t('phoneUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('updateError'));
    }
    setSavingPhone(false);
  };

  const openAdminArchive = async () => {
    setShowAdminModal(true);
    setLoadingArchive(true);
    try {
      // 1. Live Current Week + Month Standings
      const playersSnap = await get(ref(database, 'players'));
      if (playersSnap.exists()) {
        const pData = playersSnap.val();

        // Weekly live
        const liveList = Object.entries(pData).map(([uid, val]: any) => ({
          uid,
          username: val.username || 'لاعب',
          email: val.email || 'غير مسجل',
          phone: val.phone || 'غير مسجل',
          verifyCode: val.weeklyVerifyCode || '—',
          weeklyWins: val.stats?.weeklyWins || 0,
        }));
        liveList.sort((a, b) => b.weeklyWins - a.weeklyWins);
        setCurrentTop3(liveList.filter(p => p.weeklyWins > 0).slice(0, 3));

        // Monthly live
        const monthlyLiveList = Object.entries(pData).map(([uid, val]: any) => ({
          uid,
          username: val.username || 'لاعب',
          email: val.email || 'غير مسجل',
          phone: val.phone || 'غير مسجل',
          monthlyWins: val.stats?.monthlyWins || 0,
        }));
        monthlyLiveList.sort((a, b) => b.monthlyWins - a.monthlyWins);
        setCurrentMonthlyTop3(monthlyLiveList.filter(p => p.monthlyWins > 0).slice(0, 3));

        // Yearly live
        const yearlyLiveList = Object.entries(pData).map(([uid, val]: any) => ({
          uid,
          username: val.username || 'لاعب',
          email: val.email || 'غير مسجل',
          phone: val.phone || 'غير مسجل',
          yearlyWins: val.stats?.wins || 0,
        }));
        yearlyLiveList.sort((a, b) => b.yearlyWins - a.yearlyWins);
        setCurrentYearlyTop3(yearlyLiveList.filter(p => p.yearlyWins > 0).slice(0, 3));
      }

      // 2. Archived Past Weeks
      const archiveSnap = await get(ref(database, 'weeklyWinnersArchive'));
      if (archiveSnap.exists()) {
        const val = archiveSnap.val();
        const list = Object.entries(val).map(([dateKey, item]: any) => ({
          date: dateKey,
          ...item,
        }));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setArchiveData(list);
      } else {
        setArchiveData([]);
      }

      // 3. Archived Past Months
      const monthlyArchiveSnap = await get(ref(database, 'monthlyWinnersArchive'));
      if (monthlyArchiveSnap.exists()) {
        const val = monthlyArchiveSnap.val();
        const list = Object.entries(val).map(([monthKey, item]: any) => ({
          month: monthKey,
          ...item,
        }));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setMonthlyArchiveData(list);
      } else {
        setMonthlyArchiveData([]);
      }

      // 4. Archived Past Years
      const yearlyArchiveSnap = await get(ref(database, 'yearlyWinnersArchive'));
      if (yearlyArchiveSnap.exists()) {
        const val = yearlyArchiveSnap.val();
        const list = Object.entries(val).map(([yearKey, item]: any) => ({
          year: yearKey,
          ...item,
        }));
        list.sort((a, b) => b.year.localeCompare(a.year));
        setYearlyArchiveData(list);
      } else {
        setYearlyArchiveData([]);
      }
    } catch (e) {
      console.log('Error fetching archive:', e);
    }
    setLoadingArchive(false);
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber === 'غير مسجل') {
      Alert.alert('تنبيه', 'اللاعب لم يقم بتسجيل رقم هاتفه بعد.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber: string, uName: string) => {
    if (!phoneNumber || phoneNumber === 'غير مسجل') {
      Alert.alert('تنبيه', 'اللاعب لم يقم بتسجيل رقم هاتفه بعد.');
      return;
    }
    const clean = phoneNumber.replace(/[^0-9+]/g, '');
    const msg = encodeURIComponent(`أهلاً يا ${uName}، مبروك فوزك في مسابقة الأسبوع في تطبيق الألعاب! برجاء إرسال مقاس التيشيرت وعنوان التوصيل 🎁👕`);
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`);
  };

  const handleEmail = (emailStr: string, uName: string) => {
    if (!emailStr || emailStr === 'غير مسجل') {
      Alert.alert('تنبيه', 'البريد الإلكتروني غير متوفر.');
      return;
    }
    const sub = encodeURIComponent('مبروك فوزك في مسابقة الأسبوع 🏆👕');
    const b = encodeURIComponent(`أهلاً يا ${uName}،\n\nألف مبروك حصولك على مركز فائز في مسابقة هذا الأسبوع!\nبرجاء موافاتنا بمقاس التيشيرت المفضل لك وعنوان الاستلام لإرسال جائزتك.\n\nتحياتنا، إدارة اللعبة.`);
    Linking.openURL(`mailto:${emailStr}?subject=${sub}&body=${b}`);
  };

  const handlePickImage = async () => {
    Alert.alert('تنبيه', t('photoFeatureDisabled'));
    /* 
    // الكود ده شغال بس محتاج تفعيل Storage في Firebase
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSaving(true);
        
        const base64Image = result.assets[0].base64;
        if (!base64Image) throw new Error("لم نتمكن من قراءة الصورة");
        
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;
        
        const fileRef = storageRef(storage, `profiles/${user!.uid}.jpg`);
        await uploadString(fileRef, dataUrl, 'data_url');
        
        const downloadURL = await getDownloadURL(fileRef);
        
        await updateProfile(user!, { photoURL: downloadURL });
        await update(ref(database, `players/${user!.uid}`), { photoURL: downloadURL });
        
        setPhotoURL(downloadURL);
        Alert.alert('نجاح', 'تم تحديث الصورة بنجاح!');
        setSaving(false);
      }
    } catch (error: any) {
      console.log('Upload error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء رفع الصورة: ' + (error?.message || 'Unknown error'));
      setSaving(false);
    }
    */
  };

  const handleSignOut = () => {
    Alert.alert(t('signOutTitle'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOutBtn'), style: 'destructive', onPress: () => {
          signOut(auth);
          router.replace('/auth' as any);
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.statusBar} />
      
      <View style={[styles.header, { borderBottomColor: theme.surfaceBorder }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={[styles.backButton, { backgroundColor: theme.bgSecondary }]}>
          <Text style={[styles.backButtonText, { color: theme.text }]}>➔</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profileTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.avatarContainer, { borderColor: theme.accent }]} onPress={handlePickImage} disabled={saving}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{username?.[0]?.toUpperCase() ?? '؟'}</Text>
          )}
          <View style={[styles.editIconBadge, { borderColor: theme.bg }]}>
            <Text style={{fontSize: 12}}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={[styles.emailText, { color: theme.textSecondary }]}>{user?.email}</Text>

        {/* Name Section */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.accent }]}>{t('name')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, color: theme.text }]}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={theme.textSecondary}
            placeholder={t('name')}
          />
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButtonText, { color: '#fff' }]}>{saving ? t('saving') : t('updateName')}</Text>
          </TouchableOpacity>
        </View>

        {/* Phone Section */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: '#f59e0b' }]}>📱 {t('phone')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: '#f59e0b', color: theme.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholderTextColor={theme.textSecondary}
            placeholder={t('phonePlaceholder')}
            keyboardType="phone-pad"
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#f59e0b' }]}
            onPress={handleSavePhone}
            disabled={savingPhone}
          >
            <Text style={[styles.saveButtonText, { color: '#fff' }]}>
              {savingPhone ? t('saving') : t('updatePhone')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>{t('gameStats')}</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.matches}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('totalMatches')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.wins}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('win')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.losses}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('loss')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
              <Text style={[styles.statValue, { color: '#eab308' }]}>{stats.draws}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('draw')}</Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Admin Button - visible only to owner */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={openAdminArchive}
          >
            <LinearGradient
              colors={['#7c3aed', '#4f46e5']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.adminButtonGradient}
            >
              <Text style={styles.adminButtonText}>🏆 سجل الفائزين الأسبوعي (مسؤول)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Admin Winners Archive Modal */}
      <Modal visible={showAdminModal} animationType="slide" onRequestClose={() => setShowAdminModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#050B20' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdminModal(false)} style={styles.modalCloseBtn}>
              <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>🏆 لوحة الفائزين (خاصة بك)</Text>
          </View>

          {loadingArchive ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={{ color: '#aaa', marginTop: 12 }}>جاري تحميل البيانات...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* CURRENT WEEK LIVE */}
              <View style={styles.archiveSection}>
                <LinearGradient colors={['#7c3aed', '#4f46e5']} style={styles.archiveSectionHeader}>
                  <Text style={styles.archiveSectionTitle}>⚡ الأسبوع الحالي (مباشر)</Text>
                </LinearGradient>
                {currentTop3.length === 0 ? (
                  <Text style={styles.noDataText}>لا يوجد لاعبون بنقاط أسبوعية بعد</Text>
                ) : (
                  currentTop3.map((p, idx) => (
                    <View key={p.uid} style={styles.winnerCard}>
                      <View style={styles.winnerRankBadge}>
                        <Text style={styles.winnerRankText}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </Text>
                      </View>
                      <View style={styles.winnerInfo}>
                        <Text style={styles.winnerName}>{p.username}</Text>
                        <Text style={styles.winnerDetail}>📧 {p.email}</Text>
                        <Text style={styles.winnerDetail}>📱 {p.phone}</Text>
                        <Text style={styles.winnerDetail}>🏆 {p.weeklyWins} فوز هذا الأسبوع</Text>
                        <View style={styles.verifyCodeBadge}>
                          <Text style={styles.verifyCodeLabel}>🔐 كود التحقق: </Text>
                          <Text style={styles.verifyCodeValue}>{p.verifyCode}</Text>
                        </View>
                      </View>
                      <View style={styles.contactButtons}>
                        <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(p.phone, p.username)}>
                          <Text style={styles.contactBtnText}>💬</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleCall(p.phone)}>
                          <Text style={styles.contactBtnText}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEmail(p.email, p.username)}>
                          <Text style={styles.contactBtnText}>✉️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* PAST WEEKS ARCHIVE */}
              <View style={styles.archiveSection}>
                <LinearGradient colors={['#d97706', '#b45309']} style={styles.archiveSectionHeader}>
                  <Text style={styles.archiveSectionTitle}>📅 أرشيف الأسابيع السابقة</Text>
                </LinearGradient>
                {archiveData.length === 0 ? (
                  <Text style={styles.noDataText}>لا يوجد أرشيف بعد — سيظهر هنا بعد أول تصفير يوم الجمعة</Text>
                ) : (
                  archiveData.map((week, wIdx) => (
                    <View key={wIdx} style={styles.weekBlock}>
                      <Text style={styles.weekDate}>🗓 أسبوع: {week.date}</Text>
                      {(week.winners || []).map((w: any, i: number) => (
                        <View key={i} style={styles.winnerCard}>
                          <View style={styles.winnerRankBadge}>
                            <Text style={styles.winnerRankText}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                            </Text>
                          </View>
                          <View style={styles.winnerInfo}>
                            <Text style={styles.winnerName}>{w.username}</Text>
                            <Text style={styles.winnerDetail}>📧 {w.email}</Text>
                            <Text style={styles.winnerDetail}>📱 {w.phone}</Text>
                            <Text style={styles.winnerDetail}>🏆 {w.weeklyWins} فوز</Text>
                          </View>
                          <View style={styles.contactButtons}>
                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(w.phone, w.username)}>
                              <Text style={styles.contactBtnText}>💬</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleCall(w.phone)}>
                              <Text style={styles.contactBtnText}>📞</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEmail(w.email, w.username)}>
                              <Text style={styles.contactBtnText}>✉️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>

              {/* CURRENT MONTH LIVE */}
              <View style={styles.archiveSection}>
                <LinearGradient colors={['#0891b2', '#0e7490']} style={styles.archiveSectionHeader}>
                  <Text style={styles.archiveSectionTitle}>📆 الشهر الحالي (مباشر)</Text>
                </LinearGradient>
                {currentMonthlyTop3.length === 0 ? (
                  <Text style={styles.noDataText}>لا يوجد لاعبون بنقاط شهرية بعد</Text>
                ) : (
                  currentMonthlyTop3.map((p, idx) => (
                    <View key={p.uid} style={styles.winnerCard}>
                      <View style={styles.winnerRankBadge}>
                        <Text style={styles.winnerRankText}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </Text>
                      </View>
                      <View style={styles.winnerInfo}>
                        <Text style={styles.winnerName}>{p.username}</Text>
                        <Text style={styles.winnerDetail}>📧 {p.email}</Text>
                        <Text style={styles.winnerDetail}>📱 {p.phone}</Text>
                        <Text style={styles.winnerDetail}>📆 {p.monthlyWins} فوز هذا الشهر</Text>
                      </View>
                      <View style={styles.contactButtons}>
                        <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(p.phone, p.username)}>
                          <Text style={styles.contactBtnText}>💬</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleCall(p.phone)}>
                          <Text style={styles.contactBtnText}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEmail(p.email, p.username)}>
                          <Text style={styles.contactBtnText}>✉️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* PAST MONTHS ARCHIVE */}
              <View style={styles.archiveSection}>
                <LinearGradient colors={['#0891b2', '#164e63']} style={styles.archiveSectionHeader}>
                  <Text style={styles.archiveSectionTitle}>🗂 أرشيف الأشهر السابقة</Text>
                </LinearGradient>
                {monthlyArchiveData.length === 0 ? (
                  <Text style={styles.noDataText}>لا يوجد أرشيف بعد — سيظهر هنا بعد أول تصفير نهاية الشهر</Text>
                ) : (
                  monthlyArchiveData.map((monthItem, mIdx) => (
                    <View key={mIdx} style={styles.weekBlock}>
                      <Text style={styles.weekDate}>📆 شهر: {monthItem.month}</Text>
                      {(monthItem.winners || []).map((w: any, i: number) => (
                        <View key={i} style={styles.winnerCard}>
                          <View style={styles.winnerRankBadge}>
                            <Text style={styles.winnerRankText}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                            </Text>
                          </View>
                          <View style={styles.winnerInfo}>
                            <Text style={styles.winnerName}>{w.username}</Text>
                            <Text style={styles.winnerDetail}>📧 {w.email}</Text>
                            <Text style={styles.winnerDetail}>📱 {w.phone}</Text>
                            <Text style={styles.winnerDetail}>📆 {w.monthlyWins} فوز</Text>
                          </View>
                          <View style={styles.contactButtons}>
                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(w.phone, w.username)}>
                              <Text style={styles.contactBtnText}>💬</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleCall(w.phone)}>
                              <Text style={styles.contactBtnText}>📞</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEmail(w.email, w.username)}>
                              <Text style={styles.contactBtnText}>✉️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
              {/* CURRENT YEAR LIVE */}
              <View style={styles.archiveSection}>
                <LinearGradient colors={['#7c3aed', '#4338ca']} style={styles.archiveSectionHeader}>
                  <Text style={styles.archiveSectionTitle}>🗓 السنة الحالية (مباشر)</Text>
                </LinearGradient>
                {currentYearlyTop3.length === 0 ? (
                  <Text style={styles.noDataText}>لا يوجد لاعبون بنقاط سنوية بعد</Text>
                ) : (
                  currentYearlyTop3.map((p, idx) => (
                    <View key={p.uid} style={styles.winnerCard}>
                      <View style={styles.winnerRankBadge}>
                        <Text style={styles.winnerRankText}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </Text>
                      </View>
                      <View style={styles.winnerInfo}>
                        <Text style={styles.winnerName}>{p.username}</Text>
                        <Text style={styles.winnerDetail}>📧 {p.email}</Text>
                        <Text style={styles.winnerDetail}>📱 {p.phone}</Text>
                        <Text style={styles.winnerDetail}>🏆 {p.yearlyWins} فوز هذه السنة</Text>
                      </View>
                      <View style={styles.contactButtons}>
                        <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(p.phone, p.username)}>
                          <Text style={styles.contactBtnText}>💬</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleCall(p.phone)}>
                          <Text style={styles.contactBtnText}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEmail(p.email, p.username)}>
                          <Text style={styles.contactBtnText}>✉️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* PAST YEARS ARCHIVE */}
              <View style={styles.archiveSection}>
                <LinearGradient colors={['#4338ca', '#1e1b4b']} style={styles.archiveSectionHeader}>
                  <Text style={styles.archiveSectionTitle}>🏛 أرشيف السنوات السابقة</Text>
                </LinearGradient>
                {yearlyArchiveData.length === 0 ? (
                  <Text style={styles.noDataText}>لا يوجد أرشيف بعد — سيظهر هنا بعد أول تصفير 31 ديسمبر</Text>
                ) : (
                  yearlyArchiveData.map((yearItem, yIdx) => (
                    <View key={yIdx} style={styles.weekBlock}>
                      <Text style={styles.weekDate}>📅 سنة: {yearItem.year}</Text>
                      {(yearItem.winners || []).map((w: any, i: number) => (
                        <View key={i} style={styles.winnerCard}>
                          <View style={styles.winnerRankBadge}>
                            <Text style={styles.winnerRankText}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                            </Text>
                          </View>
                          <View style={styles.winnerInfo}>
                            <Text style={styles.winnerName}>{w.username}</Text>
                            <Text style={styles.winnerDetail}>📧 {w.email}</Text>
                            <Text style={styles.winnerDetail}>📱 {w.phone}</Text>
                            <Text style={styles.winnerDetail}>🏆 {w.yearlyWins} فوز</Text>
                          </View>
                          <View style={styles.contactButtons}>
                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(w.phone, w.username)}>
                              <Text style={styles.contactBtnText}>💬</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => handleCall(w.phone)}>
                              <Text style={styles.contactBtnText}>📞</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEmail(w.email, w.username)}>
                              <Text style={styles.contactBtnText}>✉️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    transform: [{ scaleX: -1 }],
  },
  backButtonText: {
    fontSize: 20,
  },
  contentScroll: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    paddingBottom: 60,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  emailText: {
    fontSize: 14,
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 15,
  },
  saveButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    width: '100%',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    width: '48%',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
  },
  logoutButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Admin Button
  adminButton: {
    width: '100%',
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  adminButtonGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  adminButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  // Modal styles
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  // Archive Sections
  archiveSection: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  archiveSectionHeader: {
    padding: 14,
  },
  archiveSectionTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'right',
  },
  noDataText: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  weekBlock: {
    marginBottom: 8,
  },
  weekDate: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'right',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  // Winner Card
  winnerCard: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  winnerRankBadge: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerRankText: {
    fontSize: 26,
  },
  winnerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  winnerName: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    textAlign: 'right',
  },
  winnerDetail: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'right',
  },
  // Contact Buttons
  contactButtons: {
    flexDirection: 'column',
    gap: 5,
  },
  contactBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: {
    fontSize: 16,
  },
  // Verify Code
  verifyCodeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 3,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  verifyCodeLabel: {
    color: '#a78bfa',
    fontSize: 11,
  },
  verifyCodeValue: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
