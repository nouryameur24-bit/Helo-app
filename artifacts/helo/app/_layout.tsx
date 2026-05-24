import { swallow } from '@/lib/swallow';
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
import { ensureAnonymousSession } from "@/lib/supabase";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DisclaimerModal } from "@/components/DisclaimerModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RecallAlertModal } from "@/components/RecallAlertModal";
import { TrimesterTransition } from "@/components/TrimesterTransition";
import { Colors } from "@/constants/theme";
import { useNotificationTapRouting } from "@/hooks/useNotifications";
import { usePremium } from "@/hooks/usePremium";
import { useRecallAlerts } from "@/hooks/useRecallAlerts";
import { useTrimester } from "@/hooks/useTrimester";
import { initAndroidNotificationChannels, registerPushToken } from "@/lib/notifications";
import { downloadIngredientsDB } from "@/lib/offline";
import { configurePurchases, PREMIUM_KEY } from "@/lib/purchases";
import { initSentry, Sentry } from "@/lib/sentry";
import { track } from "@/lib/analytics";

// Init Sentry as early as possible so module-load errors are captured.
initSentry();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useWidgetDeepLinks() {
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const { url } = event;
      if (url === 'helo://glowscore') {
        router.push('/(tabs)');
      } else if (url === 'helo://scan') {
        router.push('/(tabs)/scan');
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    }).catch(swallow);

    return () => {
      subscription.remove();
    };
  }, []);
}

function RootLayoutNav() {
  const { trimester, showTrimesterTransition, changedProductsCount, dismissTransition } = useTrimester();
  const { isPremium } = usePremium();
  const { activeAlert, dismiss, removeFromShelf } = useRecallAlerts(isPremium);
  useNotificationTapRouting();
  useWidgetDeepLinks();

  useEffect(() => {
    initAndroidNotificationChannels().catch(swallow);
    configurePurchases().catch(swallow);
    // Download ingredients DB for all users (free + premium) so scans never
    // require a live Supabase round-trip. Only runs when local copy is absent.
    downloadIngredientsDB().catch(swallow);
    // Analytics : un seul `app_opened` par mount du root (~ une fois par
    // cold start). No-op tant qu'EXPO_PUBLIC_POSTHOG_KEY n'est pas définie.
    track('app_opened').catch(swallow);
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
        <Stack.Screen
          name="basket-scan"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="basket-results"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="compare"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="journal-entry"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="travel"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="travel-briefing"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="voice"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="widget-preview"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="ar-mirror"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="pact"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="timeline"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="memories"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
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
      <RecallAlertModal
        alert={activeAlert}
        onDismiss={dismiss}
        onRemoveFromShelf={removeFromShelf}
      />
    </>
  );
}

function RootLayout() {
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
          const userId = await ensureAnonymousSession().catch(() => null);
          if (userId) {
            registerPushToken(userId).catch(swallow);
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

export default Sentry.wrap(RootLayout);
