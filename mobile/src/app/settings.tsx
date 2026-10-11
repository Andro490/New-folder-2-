import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated, Alert, Modal, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { getMusicMuted, setMusicMuted, getMusicVolume, setMusicVolume } from '../hooks/useSound';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { isDark, toggleTheme, theme } = useTheme();
  const { lang, t, toggleLanguage } = useLanguage();

  // Dark mode toggle animation
  const thumbPos = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(!getMusicMuted());
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [musicVolume, setMusicVol] = useState(getMusicVolume());
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  
  const [developerModalVisible, setDeveloperModalVisible] = useState(false);
  const devScale = useRef(new Animated.Value(0)).current;

  const showDevModal = () => {
    setDeveloperModalVisible(true);
    Animated.spring(devScale, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const closeDevModal = () => {
    Animated.timing(devScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDeveloperModalVisible(false);
    });
  };
  React.useEffect(() => {
    AsyncStorage.getItem('vibrationEnabled').then(val => {
       if (val !== null) setVibrationEnabled(val === 'true');
    });
    AsyncStorage.getItem('sfxEnabled').then(val => {
       if (val !== null) setSfxEnabled(val === 'true');
    });
  }, []);

  const handleVibrationToggle = (val: boolean) => {
    setVibrationEnabled(val);
    AsyncStorage.setItem('vibrationEnabled', val.toString());
  };

  const handleSfxToggle = (val: boolean) => {
    setSfxEnabled(val);
    AsyncStorage.setItem('sfxEnabled', val.toString());
  };

  const handleMusicToggle = (val: boolean) => {
    setMusicEnabled(val);
    setMusicMuted(!val);
  };

  const increaseVolume = () => {
    const newVol = Math.min(1, musicVolume + 0.1);
    setMusicVol(newVol);
    setMusicVolume(newVol);
    if (!musicEnabled && newVol > 0) handleMusicToggle(true);
  };

  const decreaseVolume = () => {
    const newVol = Math.max(0, musicVolume - 0.1);
    setMusicVol(newVol);
    setMusicVolume(newVol);
    if (newVol === 0) handleMusicToggle(false);
  };

  const handleThemeToggle = () => {
    Animated.spring(thumbPos, {
      toValue: isDark ? 0 : 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
    toggleTheme();
  };

  const handleLogout = () => {
    Alert.alert(t('signOutTitle') || 'تسجيل الخروج', t('signOutConfirm') || 'هل أنت متأكد أنك تريد تسجيل الخروج؟', [
      { text: t('cancel') || 'إلغاء', style: 'cancel' },
      { text: t('logout') || 'تسجيل الخروج', style: 'destructive', onPress: async () => {
          await signOut(auth);
          router.replace('/auth' as any);
      }},
    ]);
  };

  const handleManageAccount = () => {
    router.push('/profile' as any);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount') || 'حذف الحساب',
      'هل أنت متأكد أنك تريد حذف حسابك نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.',
      [
        { text: t('cancel') || 'إلغاء', style: 'cancel' },
        { 
          text: t('deleteAccount') || 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (user) {
                await deleteUser(user);
                router.replace('/auth' as any);
              }
            } catch (error: any) {
              console.error('Delete account error:', error);
              if (error?.code === 'auth/requires-recent-login') {
                Alert.alert('تنبيه', 'يجب تسجيل الدخول مجدداً لحذف الحساب لأسباب أمنية.');
                await signOut(auth);
                router.replace('/auth' as any);
              } else {
                Alert.alert('خطأ', 'تعذر حذف الحساب. يرجى تسجيل الدخول مجدداً والمحاولة.');
              }
            }
          }
        }
      ]
    );
  };

  const handleSendSuggestion = () => {
    if (suggestionText.trim().length === 0) return;
    const url = `whatsapp://send?phone=+201144231586&text=${encodeURIComponent('*اقتراح للعبة*\n\n' + suggestionText)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('خطأ', 'يرجى التأكد من تثبيت تطبيق واتساب على جهازك.');
    });
    setSuggestionModalVisible(false);
    setSuggestionText('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark' } />
      
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settingsTitle')}</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.text }]}>➔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('account')}</Text>

        {/* Account Card */}
        <View style={styles.card}>
          <View style={styles.accountHeader}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.displayName || 'لاعب'}</Text>
              <Text style={styles.accountEmail}>{user?.email || ''}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() || 'م'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnDark} onPress={handleLogout}>
            <Text style={styles.btnDarkText}>{t('logout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnYellow} onPress={handleManageAccount}>
            <Text style={styles.btnYellowText}>{t('manageAccount')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnLink} onPress={handleDeleteAccount}>
            <Text style={styles.btnLinkText}>{t('deleteAccount')}</Text>
          </TouchableOpacity>
        </View>



        {/* Language Toggle */}
        <TouchableOpacity style={styles.cardRow} onPress={toggleLanguage}>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowSub2}>{t('currentLanguage')}</Text>
            <Text style={styles.cardRowTitle2}>
              {lang === 'ar' ? t('arabicLang') : t('englishLang')}
            </Text>
          </View>
          <View style={styles.iconCircleYellow}>
            <Text style={styles.iconText}>🌍</Text>
          </View>
        </TouchableOpacity>

        {/* Dark Mode Toggle - Custom Animated */}
        <TouchableOpacity
          style={[styles.cardToggle, { borderWidth: 2, borderColor: isDark ? '#22c55e' : '#e2e8f0' }]}
          onPress={handleThemeToggle}
          activeOpacity={0.85}
        >
          <View style={[styles.customToggleTrack, { backgroundColor: isDark ? '#22c55e' : '#374151' }]}>
            <Animated.View style={[styles.customToggleThumb, {
              transform: [{ translateX: thumbPos.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }]
            }]}>
              {isDark ? (
                <Ionicons name="moon" size={13} color="#f59e0b" />
              ) : (
                <Ionicons name="sunny" size={14} color="#eab308" />
              )}
            </Animated.View>
          </View>
          <View style={styles.cardRowText}>
            <View style={{ flexDirection: lang === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons 
                name={isDark ? "moon" : "sunny"} 
                size={18} 
                color={isDark ? "#f59e0b" : "#eab308"} 
              />
              <Text style={[styles.cardRowTitle, { color: isDark ? '#22c55e' : '#fff', marginBottom: 0 }]}>
                {isDark ? t('darkMode') : t('lightMode')}
              </Text>
            </View>
            <Text style={styles.cardRowSub}>
              {isDark ? t('switchToLight') : t('switchToDark')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardToggle} onPress={() => setNotificationsEnabled(!notificationsEnabled)} activeOpacity={0.8}>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#374151', true: '#22c55e' }} thumbColor="#fff" />
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('notifications')}</Text>
            <Text style={styles.cardRowSub}>{t('notificationsDesc')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardToggle} onPress={() => setMusicModalVisible(true)} activeOpacity={0.8}>
          <Text style={{fontSize: 20}}>🎵</Text>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('music')}</Text>
            <Text style={styles.cardRowSub}>التحكم في الصوت والإيقاف</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardToggle} onPress={() => handleVibrationToggle(!vibrationEnabled)} activeOpacity={0.8}>
          <Switch value={vibrationEnabled} onValueChange={handleVibrationToggle} trackColor={{ false: '#374151', true: '#22c55e' }} thumbColor="#fff" />
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('vibration')}</Text>
            <Text style={styles.cardRowSub}>{t('vibrationDesc')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardToggle} onPress={() => handleSfxToggle(!sfxEnabled)} activeOpacity={0.8}>
          <Switch value={sfxEnabled} onValueChange={handleSfxToggle} trackColor={{ false: '#374151', true: '#22c55e' }} thumbColor="#fff" />
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('sfx')}</Text>
            <Text style={styles.cardRowSub}>{t('sfxDesc')}</Text>
          </View>
        </TouchableOpacity>

        {/* Navigation Cards */}

        <TouchableOpacity style={styles.cardNav} onPress={() => Linking.openURL('https://fouadf9.network')}>
          <Text style={styles.navArrow}>‹</Text>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('contactUs')}</Text>
            <Text style={styles.cardRowSub}>{t('contactUsDesc')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardNav} onPress={() => setSuggestionModalVisible(true)}>
          <Text style={styles.navArrow}>‹</Text>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('suggestions')}</Text>
            <Text style={styles.cardRowSub}>{t('suggestionsDesc')}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t('about')}</Text>

        {/* Music Control Modal */}
        <Modal
          visible={musicModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMusicModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: theme.bg, padding: 25, borderRadius: 20, width: '85%', borderWidth: 1, borderColor: '#374151' }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>التحكم في الموسيقى</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                <TouchableOpacity onPress={decreaseVolume} style={{ backgroundColor: '#374151', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>-</Text>
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#22c55e', fontSize: 24, fontWeight: 'bold' }}>{Math.round(musicVolume * 100)}%</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>مستوى الصوت</Text>
                </View>

                <TouchableOpacity onPress={increaseVolume} style={{ backgroundColor: '#22c55e', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', padding: 15, borderRadius: 12, marginBottom: 20 }}>
                <Switch value={musicEnabled} onValueChange={handleMusicToggle} trackColor={{ false: '#4b5563', true: '#22c55e' }} thumbColor="#fff" />
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>تشغيل الموسيقى</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>إيقاف أو تشغيل بالكامل</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setMusicModalVisible(false)} style={{ backgroundColor: '#3b82f6', padding: 15, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>تم</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Suggestion Modal */}
        <Modal
          visible={suggestionModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSuggestionModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: theme.bg, padding: 25, borderRadius: 20, width: '90%', borderWidth: 1, borderColor: '#374151' }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>إرسال اقتراح</Text>
              
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                  color: theme.text,
                  padding: 15,
                  borderRadius: 12,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  textAlign: 'right',
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#d1d5db',
                }}
                placeholder="اكتب اقتراحك هنا..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                multiline
                value={suggestionText}
                onChangeText={setSuggestionText}
              />
              
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <TouchableOpacity 
                  onPress={handleSendSuggestion} 
                  style={{ backgroundColor: '#22c55e', padding: 15, borderRadius: 12, flex: 1, marginLeft: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>إرسال عبر واتساب 💬</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSuggestionModalVisible(false)} 
                  style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb', padding: 15, borderRadius: 12, width: 100, alignItems: 'center' }}
                >
                  <Text style={{ color: isDark ? '#fff' : '#1f2937', fontSize: 16, fontWeight: 'bold' }}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


        <TouchableOpacity style={styles.cardNav} onPress={showDevModal}>
          <Text style={styles.navArrow}>‹</Text>
          <View style={styles.cardRowText}>
            <Text style={styles.cardRowTitle}>{t('devTeam')}</Text>
            <Text style={styles.cardRowSub}>{t('devTeamDesc')}</Text>
          </View>
        </TouchableOpacity>

        {/* Developer Modal */}
        <Modal
          visible={developerModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeDevModal}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ 
              backgroundColor: '#0f172a', 
              padding: 30, 
              borderRadius: 25, 
              width: '85%', 
              borderWidth: 2, 
              borderColor: '#eab308',
              alignItems: 'center',
              shadowColor: '#eab308',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 20,
              elevation: 15,
              transform: [{ scale: devScale }]
            }}>
              <Text style={{ fontSize: 50, marginBottom: 15 }}>👨‍💻</Text>
              <Text style={{ color: '#eab308', fontSize: 26, fontWeight: '900', marginBottom: 10, textAlign: 'center' }}>
                Andro Emil Nasry
              </Text>
              <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 25, lineHeight: 28, fontWeight: '500' }}>
                Full Stack Developer & React Native Engineer
              </Text>
              
              <TouchableOpacity 
                onPress={() => Linking.openURL('https://andro-cv.vercel.app/')}
                style={{ backgroundColor: '#22c55e', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>زيارة موقعي الشخصي 🌍</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={closeDevModal}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 15, width: '100%', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>إغلاق</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <View style={{height: 40}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8EC', // Off-white cream background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    transform: [{ scaleX: -1 }],
  },
  backButtonText: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  accountInfo: {
    marginRight: 15,
    alignItems: 'flex-end',
  },
  accountName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  accountEmail: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  btnDark: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnDarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnYellow: {
    backgroundColor: '#eab308',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnYellowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnLink: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnLinkText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardRow: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircleYellow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  iconText: {
    fontSize: 20,
  },
  cardRowText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardRowTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardRowSub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  cardRowTitle2: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardRowSub2: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'right',
  },
  cardToggle: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNav: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navArrow: {
    color: '#64748b',
    fontSize: 28,
    fontWeight: '300',
    marginRight: 10,
    marginLeft: 15,
  },
  customToggleTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginLeft: 4,
  },
  customToggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});
