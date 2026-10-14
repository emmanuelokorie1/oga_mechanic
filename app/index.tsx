import React, { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { routes } from "@/constants/routes";
import { useAuthContext } from "@/contexts/AuthContext";
import { View } from "react-native";

export default function Index() {
  const { isLoading, navigationTarget, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading || hasNavigated.current) return;

    hasNavigated.current = true;
    const destination = navigationTarget || (isAuthenticated ? routes.userHome : routes.signIn);
    router.replace(destination as any);
  }, [isLoading, navigationTarget, isAuthenticated, router]);

  // Keep background red (matching splash) until initial destination is resolved
  return <View className="flex-1 bg-primary-500" />;
}
