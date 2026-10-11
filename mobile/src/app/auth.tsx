import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../firebase";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("خطأ", "من فضلك أدخل البريد الإلكتروني وكلمة المرور");
      return;
    }
    if (!isLogin && !username) {
      Alert.alert("خطأ", "من فضلك أدخل اسم المستخدم");
      return;
    }
    if (!isLogin && !phone.trim()) {
      Alert.alert("خطأ", "من فضلك أدخل رقم الهاتف للتواصل معك عند الفوز");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        await set(ref(database, `players/${cred.user.uid}`), {
          username,
          phone: phone.trim(),
          email,
          coins: 0,
          wins: 0,
          losses: 0,
          createdAt: Date.now(),
        });
      }
      router.replace("/");
    } catch (error: any) {
      let msg = "حدث خطأ، حاول مرة أخرى";
      if (error.code === "auth/email-already-in-use") msg = "البريد الإلكتروني مستخدم بالفعل";
      else if (error.code === "auth/invalid-email") msg = "البريد الإلكتروني غير صحيح";
      else if (error.code === "auth/wrong-password") msg = "كلمة المرور غير صحيحة";
      else if (error.code === "auth/user-not-found") msg = "الحساب غير موجود";
      else if (error.code === "auth/weak-password") msg = "كلمة المرور ضعيفة جداً (6 أحرف على الأقل)";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inner}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoMain}>EMBABI</Text>
          <Text style={styles.logoSub}>GAMES</Text>
          <Text style={styles.logoTagline}>⚽ الملعب الأفضل للمزادات</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isLogin && styles.toggleActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>تسجيل الدخول</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isLogin && styles.toggleActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>حساب جديد</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="اسم المستخدم (يظهر للمنافسين)"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                textAlign="right"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="رقم الهاتف (للتواصل عند الفوز بالجوائز 🎁)"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </>
          )}
          <TextInput
            style={styles.input}
            placeholder="البريد الإلكتروني"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign="right"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>{isLogin ? "🚀 دخول" : "🎮 إنشاء الحساب"}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050B20" },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  logoArea: { alignItems: "center", marginBottom: 36 },
  logoMain: {
    fontSize: 48, color: "#fff", fontWeight: "900",
    textShadowColor: "#00f2fe", textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 },
  },
  logoSub: {
    fontSize: 42, color: "#00f2fe", fontWeight: "900", marginTop: -10,
    textShadowColor: "#4facfe", textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 },
  },
  logoTagline: { color: "#64748b", fontSize: 14, marginTop: 8 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  toggleRow: {
    flexDirection: "row", backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14, marginBottom: 20, padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  toggleActive: { backgroundColor: "#1d4ed8" },
  toggleText: { color: "#64748b", fontWeight: "bold", fontSize: 14 },
  toggleTextActive: { color: "#fff" },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12, padding: 14,
    color: "#fff", fontSize: 15,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#22c55e", borderRadius: 30,
    paddingVertical: 16, alignItems: "center", marginTop: 8,
    shadowColor: "#22c55e", shadowRadius: 12, shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
