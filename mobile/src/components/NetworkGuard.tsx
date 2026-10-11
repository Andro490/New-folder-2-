import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';

interface NetworkGuardProps {
  children?: React.ReactNode;
}

export default function NetworkGuard({ children }: NetworkGuardProps) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setErrorMessage(null);

    try {
      // 1. Check network state via expo-network
      const state = await Network.getNetworkStateAsync();

      if (!state.isConnected) {
        setIsConnected(false);
        setIsChecking(false);
        return false;
      }

      // 2. Ping check to verify true internet reachability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        clearTimeout(timeoutId);

        const online = response.status === 204 || response.ok;
        setIsConnected(online);
        setIsChecking(false);
        return online;
      } catch {
        clearTimeout(timeoutId);
        // Fallback: if ping fails, check isInternetReachable from expo-network
        const fallbackOnline = state.isInternetReachable ?? false;
        setIsConnected(fallbackOnline);
        setIsChecking(false);
        return fallbackOnline;
      }
    } catch {
      setIsConnected(false);
      setIsChecking(false);
      return false;
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle hardware back press when modal is visible (exit app on Android)
  useEffect(() => {
    if (isConnected) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExit();
      return true;
    });

    return () => backHandler.remove();
  }, [isConnected]);

  const handleRetry = async () => {
    const online = await checkConnection();
    if (!online) {
      setErrorMessage('تعذر الاتصال، يرجى التحقق من الشبكة والمحاولة مجدداً');
    }
  };

  const handleExit = () => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  };

  return (
    <>
      {children}

      <Modal
        visible={!isConnected}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleExit}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Warning Icon with Glow */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-offline-outline" size={42} color="#ef4444" />
              </View>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>لا يوجد اتصال بالإنترنت</Text>
            <Text style={styles.description}>
              يتطلب التطبيق اتصالاً نشطاً بالإنترنت لمزامنة البيانات واللعب أونلاين. يرجى التحقق من شبكة الواي فاي أو بيانات الهاتف.
            </Text>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.buttonGroup}>
              {/* Retry Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnRetry]}
                onPress={handleRetry}
                disabled={isChecking}
                activeOpacity={0.8}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="reload" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                    <Text style={styles.btnRetryText}>إعادة المحاولة</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Exit Button */}
              <TouchableOpacity
                style={[styles.btn, styles.btnExit]}
                onPress={handleExit}
                activeOpacity={0.8}
              >
                <Ionicons name="exit-outline" size={18} color="#ef4444" style={{ marginLeft: 6 }} />
                <Text style={styles.btnExitText}>خروج من التطبيق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 32, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    marginBottom: 18,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 18,
    gap: 6,
  },
  errorBannerText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRetry: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnRetryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnExit: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnExitText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
