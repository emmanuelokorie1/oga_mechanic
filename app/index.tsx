import { Redirect } from "expo-router";
import { routes } from "@/constants/routes";
import { useAuthContext } from "@/contexts/AuthContext";
import { View } from "react-native";

export default function Index() {
  const { isLoading, navigationTarget } = useAuthContext();

  // Keep background red (matching splash) if still resolving
  if (isLoading) {
    return <View className="flex-1 bg-primary-500" />;
  }

  const destination = navigationTarget || routes?.welcome || "/welcome";
  return <Redirect href={destination as any} />;
}
