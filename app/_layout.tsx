import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';
import { setupNotificationListeners } from "@/lib/notifications";
import { useRouter } from "expo-router";

// Import your global CSS file
import "../global.css";
import { View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { AuthEventProvider } from "@/providers/AuthEventProvider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnimatedSplash from "../components/AnimatedSplash";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import GlobalNotificationBanner from "@/components/GlobalNotificationBanner";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import { routes } from "@/constants/routes";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Component that handles the main app logic
function AppContent() {
  const auth = useAuthContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Initialize Global Notification WebSocket
  useNotificationWebSocket({ enabled: auth.isAuthenticated, triggerPush: true });

  // ── Global Notification Listener ──────────────────────────────────────────
  useEffect(() => {
    if (Constants.appOwnership === 'expo') {
      console.log('Running in Expo Go: Push notifications disabled to prevent crash.');
      return;
    }

    let staleNotificationId: string | null = null;

    const bootstrap = async () => {
      try {
        // Grab whatever notification response Expo may replay on cold start.
        // We capture its ID so the listener can silently discard it.
        const Notifications = require('expo-notifications');
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          staleNotificationId = lastResponse.notification.request.identifier;
        }
      } catch (_) {
        // expo-notifications not available in this build — ignore
      }

      const handleChatNotification = (data: any) => {
        const relatedId = data.related_object_id || data.related_id || data.id || data.roomId;
        router.push({
          pathname: "/(root)/(screens)/(user)/chat-specialist",
          params: { roomId: data.roomId || relatedId },
        } as any);
      };

      const handleGenericNotification = (data: any) => {
        const relatedId = data.related_object_id || data.related_id || data.id;
        if (relatedId) {
          router.push({
            pathname: routes.notificationDetail as any,
            params: { id: relatedId },
          });
        } else {
          router.push(routes.notifications as any);
        }
      };

      const subscription = setupNotificationListeners(
        () => router.push("/(root)/(tabs)/(mechanic)/home" as any),
        handleChatNotification,
        handleGenericNotification,
        staleNotificationId,
      );

      return subscription;
    };

    let subscription: any = null;
    bootstrap().then((sub) => {
      subscription = sub;
    });

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  // Show splash screen while auth is loading
  if (auth.isLoading) {
    return (
      <AnimatedSplash
        onAnimationEnd={() => {
          // Animation done, but keep showing splash until auth is complete
        }}
      />
    );
  }

  return (
    <CartProvider>
      <LocationProvider>
        <View className="flex-1">
          <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(root)" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <Toast />
          <GlobalNotificationBanner />

          {/* Dynamic Android Navigation Bar Spacer */}
          {Platform.OS === "android" && insets.bottom > 0 && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: insets.bottom,
                backgroundColor: "white", // Match app background
                borderTopWidth: 1,
                borderTopColor: "#F3F4F6", // Subtle separator
                zIndex: 1000,
              }}
            />
          )}
        </View>
      </LocationProvider>
    </CartProvider>
  );
}

// Create a client with optimized defaults to prevent excessive API calls
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - data is fresh for 30 seconds
      gcTime: 10 * 60 * 1000, // 10 minutes - cache time
      retry: 2,
      refetchOnMount: true, // Refetch on mount if data is stale
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnReconnect: true, // Only refetch when connection is restored
      refetchInterval: false, // Disable automatic polling by default
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Nunito-Bold": require("../assets/fonts/nunito/Nunito-Bold.ttf"),
    "Nunito-ExtraBold": require("../assets/fonts/nunito/Nunito-ExtraBold.ttf"),
    "Nunito-ExtraLight": require("../assets/fonts/nunito/Nunito-ExtraLight.ttf"),
    "Nunito-Light": require("../assets/fonts/nunito/Nunito-Light.ttf"),
    "Nunito-Medium": require("../assets/fonts/nunito/Nunito-Medium.ttf"),
    "Nunito-Regular": require("../assets/fonts/nunito/Nunito-Regular.ttf"),
    "Nunito-SemiBold": require("../assets/fonts/nunito/Nunito-SemiBold.ttf"),
  });

  useEffect(() => {
    if (error) {
    }
    
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
      });
    }
  }, [loaded, error]);

  if (!loaded) {
    return (
      <AnimatedSplash onAnimationEnd={() => {}} />
    );
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthEventProvider>
            <AppContent />
          </AuthEventProvider>
        </AuthProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}