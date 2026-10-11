import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useBackgroundMusic } from '../hooks/useSound';

const GAMES = [
  { id: '1', name: 'خمن كارت', icon: '🃏', route: '/guess-card',   comingSoon: false  },
  { id: '2', name: 'المزاد',   icon: '⚖️', route: '/auction-setup', comingSoon: false },
  { id: '3', name: 'خمن نادي', icon: '🏟️', route: '/guess-club',   comingSoon: true  },
];

export default function GamesScreen() {
  const router = useRouter();
  useBackgroundMusic();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
          <Text style={styles.backIcon}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الألعاب</Text>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {GAMES.map((game) => (
          <TouchableOpacity 
            key={game.id} 
            style={[styles.gameCard, game.comingSoon && styles.gameCardLocked]}
            onPress={() => !game.comingSoon && router.push(game.route as any)}
            activeOpacity={game.comingSoon ? 1 : 0.75}
          >
            {game.comingSoon && (
              <View style={styles.comingSoonOverlay}>
                <Text style={styles.lockIconText}>🔒</Text>
                <Text style={styles.comingSoonText}>قريبا</Text>
              </View>
            )}
            <View style={styles.gameIconContainer}>
              <Text style={styles.gameIcon}>{game.icon}</Text>
            </View>
            <Text style={styles.gameName}>{game.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 10,
    marginRight: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  backIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#eab308',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  gameIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  gameIcon: {
    fontSize: 30,
  },
  gameName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameCardLocked: {
    opacity: 0.8,
    overflow: 'hidden',
  },
  comingSoonOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 20,
  },
  lockIconText: {
    fontSize: 30,
    marginBottom: 8,
  },
  comingSoonText: {
    color: '#facc15',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
