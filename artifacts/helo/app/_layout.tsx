import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DisclaimerModal } from "@/components/DisclaimerModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TrimesterTransition } from "@/components/TrimesterTransition";
import { Colors } from "@/constants/theme";
import { useNotificationTapRouting } from "@/hooks/useNotifications";
import { useTrimester } from "@/hooks/useTrimester";
import { initAndroidNotificationChannels, registerPushToken } from "@/lib/notifications";
import { downloadIngredientsDB } from "@/lib/offline";
import { configurePurchases, PREMIUM_KEY } from "@/lib/purchases";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { trimester, showTrimesterTransition, changedProductsCount, dismissTransition } = useTrimester();
  useNotificationTapRouting();

  useEffect(() => {
    initAndroidNotificationChannels().catch(() => {});
    configurePurchases().catch(() => {});
    AsyncStorage.getItem(PREMIUM_KEY).then((val) => {
      if (val === 'true') {
        downloadIngredientsDB().catch(() => {});
      }
    }).catch(() => {});
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="methodology" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="notifications-settings" options={{ headerShown: false }} />
        <Stack.Screen name="trimester-milestone" options={{ headerShown: false }} />
        <Stack.Screen
          name="alternatives"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="weekly-brief"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="scan-party"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="restaurant-results"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
      <DisclaimerModal />
      <TrimesterTransition
        visible={showTrimesterTransition}
        trimester={trimester}
        changedProductsCount={changedProductsCount}
        onDismiss={dismissTransition}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const redirected = useRef(false);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (redirected.current) return;

    const run = async () => {
      try {
        const completed = await AsyncStorage.getItem("onboarding_completed");
        if (!completed) {
          redirected.current = true;
          router.replace("/onboarding");
        } else {
          const userId = await AsyncStorage.getItem("@helo_user_id");
          if (userId) {
            registerPushToken(userId).catch(() => {});
          }
        }
      } catch {
        redirected.current = true;
        router.replace("/onboarding");
      } finally {
        SplashScreen.hideAsync();
      }
    };

    run();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
