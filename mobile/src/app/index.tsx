import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ImageBackground, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Link } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, database } from '../firebase';
import { useBackgroundMusic } from '../hooks/useSound';
import { useLanguage } from '../context/LanguageContext';

export default function MainScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userInfo, setUserInfo] = useState<{ username: string; coins: number; photoURL?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  useBackgroundMusic(); // 🎵 تشغيل الموسيقى الخلفية

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/auth' as any);
      } else {
        // جلب بيانات اللاعب من قاعدة البيانات
        const playerRef = ref(database, `players/${user.uid}`);
        onValue(playerRef, (snap) => {
          const data = snap.val();
          setUserInfo({
            username: data?.username || user.displayName || 'لاعب',
            coins: data?.coins ?? 0,
            photoURL: data?.photoURL || user.photoURL,
          });
        });
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, []);

  const goToProfile = () => {
    router.push('/profile');
  };

  if (!authChecked) return null;

  return (
    <ImageBackground 
      source={require('../../assets/images/home_bg_stadium.png')} 
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.7 }} // Darken image slightly so text stands out
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.coinsContainer}>
            <Text style={styles.coinsText}>{userInfo?.coins ?? 0}</Text>
            <Image 
              source={require('../../assets/images/coin.png')} 
              style={styles.coinImage} 
            />
          </View>
          <TouchableOpacity style={styles.profileContainer} onPress={goToProfile}>
            <Text style={styles.profileText}>{userInfo?.username?.substring(0, 10) ?? '...'}</Text>
            <View style={styles.profileAvatar}>
              {userInfo?.photoURL ? (
                <Image source={{ uri: userInfo.photoURL }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
              ) : (
                <Text style={styles.profileAvatarText}>{userInfo?.username?.[0]?.toUpperCase() ?? '؟'}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Main Hero Area */}
        <View style={styles.heroContainer}>
          {/* Royal Winged Logo */}
          <Image 
            source={require('../../assets/images/kora_royal_logo.png')} 
            style={styles.logoImage} 
          />
          
          <Text style={styles.logoTextMain}>فوائد جيمنج</Text>
          <Text style={styles.logoTextSub}>FAWAED GAMING</Text>
          
          <Text style={styles.welcomeText}>{t('tagline')}</Text>
        </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Link href="/games" asChild>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.buttonIcon}>🎮</Text>
            <Text style={styles.primaryButtonText}>{t('playNow')}</Text>
          </TouchableOpacity>
        </Link>


      </View>
      
      {/* Bottom Nav Placeholder */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/leaderboard')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>{t('leaderboards')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItemActive}>
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navTextActive}>{t('home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>{t('settings')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: '#050B20',
  },
  container: {
    flex: 1,
    // backgroundColor: '#050B20', // Removed so background image shows through
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  coinsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 3,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  coinsText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 19,
    marginRight: 6,
  },
  coinImage: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    marginRight: 10,
    fontWeight: 'bold',
  },
  profileAvatar: {
    backgroundColor: '#6b7280',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  logoTextMain: {
    fontSize: 44,
    color: '#fff',
    fontWeight: '900',
    textShadowColor: '#00f2fe',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    textAlign: 'center',
  },
  logoTextSub: {
    fontSize: 26,
    color: '#00f2fe',
    fontWeight: '900',
    textShadowColor: '#4facfe',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginTop: -2,
    letterSpacing: 2,
    textAlign: 'center',
  },
  welcomeText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 15,
    fontWeight: 'bold',
  },
  actionContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    width: '100%',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#16a34a',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    gap: 10,
  },
  buttonIcon: {
    fontSize: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#eab308',
    width: '90%',
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#ca8a04',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    gap: 8,
  },
  buttonIconSmall: {
    fontSize: 20,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0a1930',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  navItemActive: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginTop: -20,
    borderWidth: 3,
    borderColor: '#0a1930',
  },
  navIcon: {
    fontSize: 24,
  },
  navIconActive: {
    fontSize: 24,
  },
  navText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 5,
  },
  navTextActive: {
    color: '#0a1930',
    fontSize: 12,
    marginTop: 5,
    fontWeight: 'bold',
  }
});
