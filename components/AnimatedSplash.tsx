import React, { useEffect, useRef } from "react";
import {
  View,
  Animated,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
  Easing,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

interface AnimatedSplashProps {
  onAnimationEnd?: () => void;
  isReady?: boolean;
}

export default function AnimatedSplash({ onAnimationEnd, isReady = true }: AnimatedSplashProps) {
  // Exit animation values
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  // Entrance & Logo animation values
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Staggered text animation values
  const textTranslateY = useRef(new Animated.Value(14)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Animation reference for clean cancellation
  const ambientLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const hasTriggeredExit = useRef(false);
  const onAnimationEndRef = useRef(onAnimationEnd);
  onAnimationEndRef.current = onAnimationEnd;

  const triggerExit = () => {
    if (hasTriggeredExit.current) return;
    hasTriggeredExit.current = true;

    // Stop ongoing ambient loop
    ambientLoopRef.current?.stop();

    // Restore dark status bar for light app screens upon exit
    RNStatusBar.setBarStyle("dark-content", true);

    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.04,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationEndRef.current?.();
    });
  };

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    const enforceLightStatusBar = () => {
      RNStatusBar.setBarStyle("light-content", false);
      if (Platform.OS === "android") {
        RNStatusBar.setTranslucent(true);
        RNStatusBar.setBackgroundColor("transparent", false);
      }
    };

    // Force Android & iOS status bar icons and text to pure white
    enforceLightStatusBar();

    // Guard against child screens mounting in the background and overriding barStyle to dark
    const guardInterval = setInterval(() => {
      if (!hasTriggeredExit.current) {
        enforceLightStatusBar();
      }
    }, 250);

    // 1. Crisp Spring Entrance for the logo tile
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6.5,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle ambient breathing loop on the icon card
      if (!hasTriggeredExit.current) {
        const breathing = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.03,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1.0,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        ambientLoopRef.current = breathing;
        breathing.start();
      }
    });

    // 2. Staggered reveal for typography
    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Normal fallback timeout in case initial readiness is delayed
    const fallbackTimer = setTimeout(() => {
      triggerExit();
    }, 4000);

    return () => {
      clearInterval(guardInterval);
      clearTimeout(fallbackTimer);
      ambientLoopRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      // Allow entrance animation to settle, then smoothly trigger exit
      const readyTimer = setTimeout(() => {
        triggerExit();
      }, 2000);

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
          backgroundColor: "#D30309",
          opacity: exitOpacity,
          transform: [{ scale: exitScale }],
        },
      ]}
    >
      <RNStatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <ExpoStatusBar style="light" />

      <TouchableOpacity
        activeOpacity={1}
        onPress={triggerExit}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View
          style={{
            alignItems: "center",
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          {/* White App Icon Card with Ambient Breathing */}
          <Animated.View
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pulseScale }],
            }}
          >
            <Image
              source={require("../assets/icons/box_logo.png")}
              style={{ width: 76, height: 76 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Staggered Brand Typography Reveal */}
          <Animated.View
            style={{
              alignItems: "center",
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            }}
          >
            <Text
              style={{
                fontSize: 26,
                color: "#FFFFFF",
                marginTop: 22,
                letterSpacing: -0.5,
              }}
              className="font-NunitoExtraBold"
            >
              Oga Mechanic
            </Text>

            <Animated.Text
              style={{
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.75)",
                marginTop: 6,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                opacity: subtitleOpacity,
              }}
              className="font-NunitoBold"
            >
              Everything Automobile
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}