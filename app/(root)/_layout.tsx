import { Stack, Redirect } from "expo-router";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUserStore } from "@/stores/userStore";
import { routes } from "@/constants/routes";

const Layout = () => {
  const auth = useAuthContext();
  const token = useUserStore((state) => state.accessToken);
  const isAuthenticated = auth.isAuthenticated || !!token;

  if (!auth.isLoading && !isAuthenticated) {
    return <Redirect href={routes.signIn as any} />;
  }

  return (
    <Stack initialRouteName="(tabs)">
      <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(screens)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
