import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBLegQGMSL0fq23DTfp_Dln1TNqC0njUQU",
  authDomain: "amdam-886f2.firebaseapp.com",
  databaseURL: "https://amdam-886f2-default-rtdb.firebaseio.com",
  projectId: "amdam-886f2",
  storageBucket: "amdam-886f2.firebasestorage.app",
  messagingSenderId: "914353868952",
  appId: "1:914353868952:web:9a892ac788db21a0c080ed",
  measurementId: "G-PQJ72LMC3T"
};

// تهيئة Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// تهيئة المصادقة
let auth: ReturnType<typeof getAuth>;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  // Static initialization is safer in React Native (avoids bundler require crashes)
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // لو Auth اتعملت قبل كده (hot reload / restart) نستخدم الموجودة
    auth = getAuth(app);
  }
}

// تهيئة قاعدة البيانات اللحظية
const database = getDatabase(app);

// تهيئة التخزين
const storage = getStorage(app);

export { app, auth, database, storage };
