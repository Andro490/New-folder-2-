import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

// استيراد الكروت المخصصة (308 لاعب من نوع Epic و Bigtime) وكل كارت له 10 أسئلة
import customCards from '../assets/custom_cards.json';

// نستخدم فقط الكروت اللي عندها تلميحات
const cardsWithHints = (customCards as any[]).filter(p => p.hints && p.hints.length > 0);

export default function GuessCardScreen() {
  const router = useRouter();
  
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // useRef لحفظ اللاعب بشكل ثابت - لن يتغير عند الكتابة
  const currentPlayerRef = useRef<any>(null);
  // hints كـ state عشان React تعرف تعرضها، بس بنحدثها بس عند جولة جديدة
  const [hints, setHints] = useState<string[]>([]);
  const [roundKey, setRoundKey] = useState(0);

  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    const randomPlayer = cardsWithHints[Math.floor(Math.random() * cardsWithHints.length)];
    const shuffledHints = [...randomPlayer.hints].sort(() => 0.5 - Math.random()).slice(0, 4);
    
    currentPlayerRef.current = randomPlayer;
    setHints(shuffledHints);
    
    setCurrentPlayer(randomPlayer);
    setAnswer('');
    setShowResult(false);
    setIsCorrect(null);
    setSuggestions([]);
    // زيادة الـ roundKey يجبر React على إعادة الرسم مرة واحدة فقط
    setRoundKey(k => k + 1);
  };

  // تحديث الاقتراحات عند الكتابة
  useEffect(() => {
    if (answer.trim().length > 0 && !showResult) {
      const search = answer.toLowerCase();
      const filtered = customCards
        .map((p: any) => p.playerName)
        .filter((name: string) => name.toLowerCase().includes(search))
        .slice(0, 5);
      
      if (filtered.length === 1 && filtered[0].toLowerCase() === search) {
        setSuggestions([]);
      } else {
        setSuggestions(Array.from(new Set(filtered)));
      }
    } else {
      setSuggestions([]);
    }
  }, [answer, showResult]);

  const handleSubmit = () => {
    const player = currentPlayerRef.current;
    if (!player) return;

    if (answer.toLowerCase().trim() === player.playerName.toLowerCase()) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
    setShowResult(true);
  };

  const handleSelectSuggestion = (name: string) => {
    setAnswer(name);
    setSuggestions([]);
  };

  if (!currentPlayer) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
            <Text style={styles.backIcon}>➡️</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>خمن كارت</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Card Image Placeholder or Actual Image */}
          <View style={styles.cardContainer}>
            {showResult ? (
              <Image 
                source={{ uri: currentPlayerRef.current?.imageUrl }}
                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <>
                <Image 
                  source={
                    currentPlayer.cardType === 'epic'
                      ? require('../assets/empty-epic.png')
                      : require('../assets/empty-bigtime.png')
                  }
                  style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.5, borderRadius: 12 }}
                  resizeMode="cover"
                />
                <View style={styles.cardPlaceholder}>
                  <Text style={styles.questionMark}>❓</Text>
                </View>
              </>
            )}
          </View>

          {/* Hints / Questions Box - نستخدم hintsRef لضمان عدم تغيير الأسئلة عند الكتابة */}
          <View style={styles.hintsBox}>
            <Text style={styles.hintsTitle}>تلميحات اللاعب:</Text>
            {hints.map((hint, index) => (
              <View key={index} style={styles.hintItem}>
                <Text style={styles.hintText}>{index + 1}. {hint}</Text>
              </View>
            ))}
          </View>

          {/* Input Area or Result Area */}
          {!showResult ? (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>من هو هذا اللاعب؟</Text>
              
              <View style={{ zIndex: 10 }}>
                <TextInput
                  style={[styles.input, isCorrect === false && { borderColor: '#ef4444' }]}
                  placeholder="اكتب اسم اللاعب هنا..."
                  placeholderTextColor="#64748b"
                  value={answer}
                  onChangeText={(text) => {
                    setAnswer(text);
                    setIsCorrect(null);
                  }}
                  textAlign="right"
                />
                
                {/* Autocomplete Dropdown */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {suggestions.map((item, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(item)}
                      >
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, answer.trim().length === 0 && { opacity: 0.5 }]} 
                onPress={handleSubmit}
                disabled={answer.trim().length === 0}
              >
                <Text style={styles.submitButtonText}>إرسال الإجابة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultContainer}>
              <Text style={[styles.resultText, isCorrect ? styles.correctText : styles.wrongText]}>
                {isCorrect ? 'أنت فزت! 🎉 الإجابة صحيحة' : `للأسف إجابة خاطئة! اللاعب هو: ${currentPlayerRef.current?.playerName}`}
              </Text>
              
              <TouchableOpacity style={styles.playAgainButton} onPress={startNewRound}>
                <Text style={styles.playAgainText}>العب مرة أخرى 🔄</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')}>
                <Text style={styles.homeButtonText}>الصفحة الرئيسية 🏠</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B20',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  backIcon: {
    fontSize: 18,
    color: '#fff',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  cardContainer: {
    width: 200,
    height: 280,
    backgroundColor: '#0f172a',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    marginBottom: 30,
    elevation: 10,
  },
  cardPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionMark: {
    fontSize: 80,
  },
  hintsBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hintsTitle: {
    color: '#eab308',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'right',
  },
  hintItem: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  hintText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  inputLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 15,
  },
  suggestionsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 15,
    maxHeight: 150,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  correctText: {
    color: '#4ade80',
  },
  wrongText: {
    color: '#f87171',
  },
  playAgainButton: {
    backgroundColor: '#eab308',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
