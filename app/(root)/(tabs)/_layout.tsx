import { useEffect } from "react";
import { Slot } from "expo-router";
import { useUnreadNotificationCount, usePrimaryUserProfile } from "@/hooks/useUserProfile";
import { useUserStore } from "@/stores/userStore";

const Layout = () => {
  const token = useUserStore((state) => state.accessToken);

  // Fetch notifications when any tabs layout loads (works for all roles)
  const { refetch: refetchNotifications } = useUnreadNotificationCount();

  // Fetch primary profile to keep navbar and profile page in sync
  const { refetch: refetchProfile } = usePrimaryUserProfile();

  useEffect(() => {
    // Only refetch when authenticated
    if (token) {
      refetchNotifications();
      refetchProfile();
    }
  }, [token, refetchNotifications, refetchProfile]);

  return <Slot />;
};

export default Layout;