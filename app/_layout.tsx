import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import Toast from 'react-native-toast-message';
import customToastConfig from "@/components/toasts/CustomToastConfig";
import Constants from 'expo-constants';
import { setupNotificationListeners } from "@/lib/notifications";
import { useRouter, usePathname } from "expo-router";

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
import CustomerArrivalCodeModal from "@/components/modals/CustomerArrivalCodeModal";
import { useArrivalCodeWatcher } from "@/hooks/useArrivalCodeWatcher";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import { routes } from "@/constants/routes";
import { registerPushNotificationsAndSyncDevice } from "@/services/notificationService";
import { useUserStore } from "@/stores/userStore";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Component that handles the main app logic
function AppContent() {
  const auth = useAuthContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const userStoreToken = useUserStore((state) => state.accessToken);
  const isUserAuthenticated = auth.isAuthenticated || !!userStoreToken;

  // Screen background & navigation bar theme detection
  const isWelcome = pathname?.includes("welcome");
  const isDarkScreen = isWelcome || pathname?.includes("video-call") || pathname?.includes("voice-call");

  const getBottomSpacerColor = () => {
    if (showSplash) return "#DC2626";
    if (isWelcome) return "#0F1014";
    if (pathname?.includes("video-call") || pathname?.includes("voice-call")) return "#000000";
    return "white";
  };

  // Initialize Global Notification WebSocket
  useNotificationWebSocket({ enabled: auth.isAuthenticated, triggerPush: true });

  // Watch for mechanic arrival events across the customer interface
  useArrivalCodeWatcher();

  // ── Global Push Device Registration ───────────────────────────────────────
  // Registers device token with /users/notifications/devices/ across all roles (Users, Mechanics, Sellers)
  useEffect(() => {
    if (isUserAuthenticated) {
      registerPushNotificationsAndSyncDevice();
    }
  }, [isUserAuthenticated]);
  // ──────────────────────────────────────────────────────────────────────────

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
        if (data.chatType === 'support' || data.type === 'support_chat') {
          router.push({
            pathname: "/(root)/(screens)/(user)/chat-specialist",
            params: { roomId: data.roomId || relatedId },
          } as any);
        } else {
          router.push({
            pathname: "/(root)/(screens)/(user)/chat-room",
            params: {
              roomId: String(data.roomId || relatedId),
              participantName: data.senderName || data.participantName || "User",
            },
          } as any);
        }
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

  const [showSplash, setShowSplash] = React.useState(true);
  const handleSplashFinished = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <CartProvider>
      <LocationProvider>
        <View className={`flex-1 ${isWelcome ? "bg-[#0F1014]" : "bg-white"}`}>
          <StatusBar style={showSplash || isDarkScreen ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(root)" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <Toast config={customToastConfig} />
          <GlobalNotificationBanner />
          <CustomerArrivalCodeModal />

          {/* Dynamic Android Navigation Bar Spacer */}
          {Platform.OS === "android" && insets.bottom > 0 && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: insets.bottom,
                backgroundColor: getBottomSpacerColor(),
                borderTopWidth: isDarkScreen || showSplash ? 0 : 1,
                borderTopColor: isDarkScreen || showSplash ? "transparent" : "#F3F4F6",
                zIndex: 1000,
              }}
            />
          )}

          {/* Seamless Root Splash Overlay */}
          {showSplash && (
            <AnimatedSplash
              isReady={!auth.isLoading}
              onAnimationEnd={handleSplashFinished}
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
      <View style={{ flex: 1, backgroundColor: "#DC2626" }}>
        <StatusBar style="light" />
      </View>
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