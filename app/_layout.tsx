import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize Convex client
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || '';
const convex = new ConvexReactClient(convexUrl);

const ONBOARDING_KEY = 'healthysteps_onboarding_done';

function RootLayoutNavigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const hasNavigated = useRef(false);

  // Check if navigation state is ready
  const navigationState = useRootNavigationState();
  const isNavigationReady = !!navigationState?.key;

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasSeenOnboarding(done === 'true');
    };
    checkOnboarding();
  }, []);

  // Hide splash when ready
  useEffect(() => {
    if (!isLoading && hasSeenOnboarding !== null && isNavigationReady) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, hasSeenOnboarding, isNavigationReady]);

  // Auth-based navigation — only runs when auth state actually changes
  useEffect(() => {
    if (isLoading || hasSeenOnboarding === null || !isNavigationReady) return;

    // Defer navigation to avoid conflicts with React's render cycle
    const timer = setTimeout(() => {
      const currentSegment = segments[0];

      if (!hasSeenOnboarding && currentSegment !== 'onboarding') {
        router.replace('/onboarding');
      } else if (hasSeenOnboarding && !isAuthenticated) {
        if (currentSegment !== '(auth)') {
          router.replace('/(auth)/login');
        }
      } else if (isAuthenticated) {
        if (currentSegment === '(auth)' || currentSegment === 'onboarding') {
          router.replace('/(tabs)');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, hasSeenOnboarding, isNavigationReady]);

  if (isLoading || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-habit"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="edit-habit"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="ai-coach"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <RootLayoutNavigation />
      </AuthProvider>
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
