import React, { useEffect, useRef } from "react";
import { View, Animated, Image, Text, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { icons } from "@/constants";
import { TruckIcon, WrenchScrewdriverIcon, ShieldCheckIcon } from "react-native-heroicons/outline";
import { StatusBar } from "expo-status-bar";

interface AnimatedSplashProps {
  onAnimationEnd?: () => void;
  isReady?: boolean;
}

export default function AnimatedSplash({ onAnimationEnd, isReady = true }: AnimatedSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.85)).current;
  const hasTriggeredExit = useRef(false);
  const onAnimationEndRef = useRef(onAnimationEnd);
  onAnimationEndRef.current = onAnimationEnd;

  const triggerExit = () => {
    if (hasTriggeredExit.current) return;
    hasTriggeredExit.current = true;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.04,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationEndRef.current?.();
    });
  };

  useEffect(() => {
    // Hide the native OS splash so our animated splash is visible
    SplashScreen.hideAsync().catch(() => {});

    // Run entrance animation immediately
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(textScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Absolute fallback: NEVER stay on screen longer than 2500ms
    const safetyTimer = setTimeout(() => {
      triggerExit();
    }, 2500);

    return () => clearTimeout(safetyTimer);
  }, []);

  // When isReady is true, trigger exit immediately after entrance animation completes
  useEffect(() => {
    if (isReady) {
      const readyTimer = setTimeout(() => {
        triggerExit();
      }, 550);

      return () => clearTimeout(readyTimer);
    }
  }, [isReady]);

  return (
    <Animated.View 
      pointerEvents={hasTriggeredExit.current ? "none" : "auto"}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 99999,
          backgroundColor: "#DC2626", // bg-primary-500
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <StatusBar style="light" />
      {/* Main Content */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Logo */}
        <Animated.View 
          className="mb-8"
          style={{ 
            opacity: textOpacity, 
            transform: [{ scale: textScale }] 
          }}
        >
          <View className="rounded-2xl p-4 shadow-xl bg-white/10">
            <Image
              source={require("../assets/icons/box_logo.png")}
              className="w-28 h-28"
              resizeMode="contain"
            />
          </View>
        </Animated.View>
        
        {/* Main Text */}
        <Animated.View 
          className="items-center"
          style={{ 
            opacity: textOpacity, 
            transform: [{ scale: textScale }] 
          }}
        >
          <Text className="text-4xl font-extrabold text-white text-center tracking-wider mb-1">
            EVERYTHING
          </Text>
          <Text className="text-4xl font-extrabold text-white text-center tracking-wider">
            AUTOMOBILE
          </Text>
        </Animated.View>
      </View>
      
      {/* Bottom Features */}
      <View className="bg-green-700 px-6 py-6">
        <View className="flex-row justify-around">
          <View className="items-center flex-1">
            <View className="bg-white/15 rounded-xl p-3 mb-2">
              <TruckIcon size={26} color="#F0FDF4" />
            </View>
            <Text className="text-xs text-green-50 font-semibold text-center">Auto Services</Text>
          </View>
          <View className="items-center flex-1">
            <View className="bg-white/15 rounded-xl p-3 mb-2">
              <WrenchScrewdriverIcon size={26} color="#F0FDF4" />
            </View>
            <Text className="text-xs text-green-50 font-semibold text-center">Expert Mechanics</Text>
          </View>
          <View className="items-center flex-1">
            <View className="bg-white/15 rounded-xl p-3 mb-2">
              <ShieldCheckIcon size={26} color="#F0FDF4" />
            </View>
            <Text className="text-xs text-green-50 font-semibold text-center">Trusted & Secure</Text>
          </View>
        </View>
      </View>

      {/* Logo Section */}
      <View className="bg-white py-6 items-center justify-center">
        <View className="bg-gray-50 rounded-xl p-2">
          <icons.logoBlack width={150} height={70} />
        </View>
      </View>
    </Animated.View>
  );
}