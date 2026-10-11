import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playSoundEffect } from '../hooks/useSound';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface WildcardScreenProps {
  myTeam: string[];
  allPlayers: any[];
  budget: number;
  onComplete: (newTeam: string[], newBudget: number) => void;
}

export default function WildcardScreen({ myTeam, allPlayers, budget, onComplete }: WildcardScreenProps) {
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [newPlayer, setNewPlayer] = useState<any | null>(null);
  const [oldPlayer, setOldPlayer] = useState<any | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const validPlayers = myTeam.filter(name => name && name !== '—');

  // Animation values
  const oldCardScale = useRef(new Animated.Value(1)).current;
  const oldCardOpacity = useRef(new Animated.Value(1)).current;
  const crossOpacity = useRef(new Animated.Value(0)).current;
  const newCardScale = useRef(new Animated.Value(0)).current;
  const newCardOpacity = useRef(new Animated.Value(0)).current;
  const newCardTranslateY = useRef(new Animated.Value(100)).current;

  const cost = 10;
  const canAfford = budget >= cost;

  const handleSkip = () => {
    onComplete(myTeam, budget);
  };

  const handleSwap = () => {
    if (!selectedPlayerName || !canAfford) return;

    const oldP = allPlayers.find(p => p.name === selectedPlayerName);
    if (!oldP) return;

    // Find a replacement player with a HIGHER rating in the SAME position who is NOT already in myTeam
    const eligibleReplacements = allPlayers.filter(p => 
      p.position === oldP.position && 
      p.overallRating > oldP.overallRating &&
      !myTeam.includes(p.name)
    );

    let replacement;
    if (eligibleReplacements.length > 0) {
      // Pick random from higher rated
      replacement = eligibleReplacements[Math.floor(Math.random() * eligibleReplacements.length)];
    } else {
      // Fallback: Pick any random player in same position who is not in myTeam (if possible)
      const samePos = allPlayers.filter(p => p.position === oldP.position && !myTeam.includes(p.name));
      if (samePos.length > 0) {
        replacement = samePos[Math.floor(Math.random() * samePos.length)];
      } else {
        // Fallback: Pick absolutely any random player
        replacement = allPlayers[Math.floor(Math.random() * allPlayers.length)];
      }
    }

    setOldPlayer(oldP);
    setNewPlayer(replacement);
    setShowAnimation(true);
    setIsAnimating(true);
    
    playSoundEffect('bid'); // You could use a special wildcard sound here

    // Sequence the animation
    Animated.sequence([
      // 1. Show X over old card
      Animated.timing(crossOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(500),
      // 2. Fade out old card slightly
      Animated.parallel([
        Animated.timing(oldCardOpacity, { toValue: 0.5, duration: 400, useNativeDriver: true }),
        Animated.timing(oldCardScale, { toValue: 0.8, duration: 400, useNativeDriver: true }),
      ]),
      // 3. Pop up new card
      Animated.parallel([
        Animated.spring(newCardScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(newCardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(newCardTranslateY, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
    ]).start(() => {
      playSoundEffect('win'); // Success sound
      
      // Wait a bit then complete
      setTimeout(() => {
        const newTeam = [...myTeam];
        const idx = newTeam.indexOf(selectedPlayerName);
        if (idx !== -1) {
          newTeam[idx] = replacement.name;
        }
        onComplete(newTeam, budget - cost);
      }, 3000);
    });
  };

  if (showAnimation && oldPlayer && newPlayer) {
    return (
      <View style={styles.animContainer}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.animTitle}>تم استخدام البطاقة!</Text>
          <Text style={styles.animSubtitle}>تم استبدال {oldPlayer.name} بـ {newPlayer.name}</Text>
          
          <View style={styles.cardsRow}>
            {/* Old Card */}
            <Animated.View style={[styles.playerCardWrapper, { opacity: oldCardOpacity, transform: [{ scale: oldCardScale }] }]}>
              {oldPlayer.imageUrl ? (
                <Image source={{ uri: oldPlayer.imageUrl }} style={styles.cardImage} resizeMode="contain" />
              ) : (
                <View style={[styles.playerCard, { borderColor: "#ef4444" }]}>
                  <Text style={styles.playerRating}>{oldPlayer.overallRating}</Text>
                  <Text style={styles.playerPos}>{oldPlayer.position}</Text>
                  <Text style={styles.playerName}>{oldPlayer.name}</Text>
                </View>
              )}
              {/* Red Cross Overlay */}
              <Animated.View style={[styles.crossOverlay, { opacity: crossOpacity }]}>
                <Ionicons name="close" size={100} color="#ef4444" />
              </Animated.View>
            </Animated.View>

            {/* Arrow */}
            <Animated.View style={{ opacity: newCardOpacity, marginHorizontal: 10 }}>
              <Ionicons name="arrow-back" size={40} color="#facc15" />
            </Animated.View>

            {/* New Card */}
            <Animated.View style={[styles.playerCardWrapper, { 
              opacity: newCardOpacity, 
              transform: [{ scale: newCardScale }, { translateY: newCardTranslateY }] 
            }]}>
              {newPlayer.imageUrl ? (
                <Image source={{ uri: newPlayer.imageUrl }} style={styles.cardImage} resizeMode="contain" />
              ) : (
                <View style={[styles.playerCard, { borderColor: "#22c55e" }]}>
                  <Text style={styles.playerRating}>{newPlayer.overallRating}</Text>
                  <Text style={styles.playerPos}>{newPlayer.position}</Text>
                  <Text style={styles.playerName}>{newPlayer.name}</Text>
                </View>
              )}
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>وايلد كارد</Text>
          <Text style={styles.subtitle}>استخدم بطاقتك مرة واحدة أو تخطَّ للإبقاء على تشكيلتك</Text>
        </View>

        <View style={styles.mainBox}>
          <Text style={styles.boxTitle}>اختر لاعباً للاستبدال</Text>
          <Text style={styles.boxSubtitle}>التكلفة: {cost} مليون — لاعب بديل بتقييم أعلى</Text>

          <ScrollView style={{ flex: 1, marginTop: 15 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {validPlayers.map((name, index) => {
              const p = allPlayers.find(x => x.name === name);
              if (!p) return null;
              const isSelected = selectedPlayerName === name;

              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.playerRow, isSelected && styles.playerRowSelected]}
                  onPress={() => setSelectedPlayerName(name)}
                >
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.rowAvatar} resizeMode="cover" />
                  ) : (
                    <View style={styles.rowAvatarPlaceholder}>
                      <Text style={{ fontSize: 16 }}>⚽</Text>
                    </View>
                  )}
                  
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={[styles.rowName, isSelected && { color: "#facc15" }]}>{p.name}</Text>
                    <Text style={styles.rowPos}>{p.position} - {p.overallRating}</Text>
                  </View>

                  <View style={styles.radioCircle}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.useBtn, (!selectedPlayerName || !canAfford) && { opacity: 0.5 }]} 
              disabled={!selectedPlayerName || !canAfford || isAnimating}
              onPress={handleSwap}
            >
              <Ionicons name="star" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.useBtnText}>
                {canAfford ? "استخدم البطاقة" : "ميزانيتك لا تكفي"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={isAnimating}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.skipBtnText}>تخطي البطاقة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  animContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(250, 204, 21, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  mainBox: {
    flex: 1,
    backgroundColor: '#1f2937',
    margin: 15,
    borderRadius: 20,
    padding: 15,
    borderWidth: 2,
    borderColor: '#374151',
  },
  boxTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  boxSubtitle: {
    color: '#facc15',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  playerRowSelected: {
    borderColor: '#facc15',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  rowAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  rowAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  rowName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rowPos: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#facc15',
  },
  actions: {
    marginTop: 15,
  },
  useBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  useBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipBtn: {
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  skipBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Animation Styles
  animTitle: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },
  animSubtitle: {
    color: '#22c55e',
    fontSize: 16,
    marginBottom: 40,
    fontWeight: 'bold',
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCardWrapper: {
    width: width * 0.4,
    aspectRatio: 0.72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  playerCard: {
    width: '100%',
    height: '100%',
    backgroundColor: "#1e293b",
    borderWidth: 3,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  playerRating: { color: "#fff", fontSize: 22, fontWeight: "900", position: "absolute", top: 10, left: 10 },
  playerPos: { color: "#cbd5e1", fontSize: 12, fontWeight: "bold", position: "absolute", top: 35, left: 10 },
  playerName: { color: "#fff", fontSize: 13, fontWeight: "bold", position: "absolute", bottom: 10, textAlign: "center" },
  crossOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
});
