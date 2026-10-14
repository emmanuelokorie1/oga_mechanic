import { useEffect } from "react";
import { Slot } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useUnreadNotificationCount, usePrimaryUserProfile } from "@/hooks/useUserProfile";
import { useUserStore } from "@/stores/userStore";
import { prefetchShopData } from "@/hooks/useProducts";

const Layout = () => {
  const token = useUserStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  // Fetch notifications when any tabs layout loads (works for all roles)
  const { refetch: refetchNotifications } = useUnreadNotificationCount();

  // Fetch primary profile to keep navbar and profile page in sync
  const { refetch: refetchProfile } = usePrimaryUserProfile();

  useEffect(() => {
    // Only refetch and prefetch when authenticated
    if (token) {
      refetchNotifications();
      refetchProfile();
      // Preload shop products and categories immediately in background for all roles
      prefetchShopData(queryClient);
    }
  }, [token, refetchNotifications, refetchProfile, queryClient]);

  return <Slot />;
};

export default Layout;