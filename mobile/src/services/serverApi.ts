import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

// عنوان سيرفر الـ VPS عبر Cloudflare Tunnel (HTTPS)
export const API_BASE_URL = 'https://motion-wealth-hopkins-outside.trycloudflare.com';

const TOKEN_KEY = 'user_auth_token';
const USER_KEY = 'user_profile_data';

// ==========================================
// 1. إدارة جلسة المستخدم (Token & Storage)
// ==========================================
export async function saveAuthSession(token: string, user: any) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function getLocalUser(): Promise<any | null> {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearAuthSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

// ==========================================
// 2. طلبات المصادقة (Auth APIs)
// ==========================================
export async function registerUser(username: string, email: string, password: string, phone: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'فشل إنشاء الحساب');
  await saveAuthSession(data.token, data.user);
  return data;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'بيانات الدخول غير صحيحة');
  await saveAuthSession(data.token, data.user);
  return data;
}

export async function fetchUserProfile() {
  const token = await getAuthToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/api/user/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) await clearAuthSession();
    return null;
  }
  const user = await res.json();
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function updateUserProfile(updates: { username?: string; phone?: string; coinsDelta?: number; winInc?: boolean; lossInc?: boolean }) {
  const token = await getAuthToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/api/user/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (data.user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data;
}

// ==========================================
// 3. المتصدرين والكروت (Leaderboard & Cards)
// ==========================================
export async function fetchLeaderboard(type: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly') {
  const res = await fetch(`${API_BASE_URL}/api/leaderboard?type=${type}`);
  if (!res.ok) return [];
  return await res.json();
}

// ==========================================
// 4. السوكيت ومحرك اللعب أونلاين (Socket.IO)
// ==========================================
let socketInstance: Socket | null = null;

export function getGameSocket(): Socket {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socketInstance;
}
