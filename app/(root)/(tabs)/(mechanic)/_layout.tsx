import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { Tabs } from "expo-router";
import { icons } from "@/constants";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { BlurView, BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Animated Tab Button ──────────────────────────────────────────────────
const TabButton = ({ focused, icon: Icon, activeIcon: ActiveIcon, label, isShop, onPress }: any) => {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 0.85)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 0.85,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.85,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  if (isShop) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tabTouchable}>
        <Animated.View style={[styles.tabItem, { transform: [{ scale }] }]}>
          <Icon width={100} height={100} />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.tabTouchable}>
      <Animated.View style={[styles.tabItem, { transform: [{ scale }], opacity }]}>
        {focused ? <ActiveIcon width={24} height={24} /> : <Icon width={24} height={24} />}
        <Text style={[styles.tabLabel, focused && styles.activeTabLabel]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Custom Tab Bar ───────────────────────────────────────────────────────
const CustomTabBar = ({
  state,
  descriptors,
  navigation,
  blurTarget,
}: BottomTabBarProps & { blurTarget?: React.RefObject<any> }) => {
  const tabConfig = [
    { name: "home", icon: icons.home, activeIcon: icons.activeHome, label: "Home" },
    { name: "order", icon: icons.order, activeIcon: icons.activeOrder, label: "Orders" },
    { name: "shop", icon: icons.shopTab, isShop: true },
    { name: "earnings", icon: icons.earnings, activeIcon: icons.activeEarnings, label: "Earnings" },
    { name: "profile", icon: icons.profile, activeIcon: icons.activeProfile, label: "Profile" },
  ];

  return (
    <View style={styles.barContainer} pointerEvents="box-none">
      {/* ── Glass-like blur background behind tab nav and content (stops flush at top of tab bar) ── */}
      <View style={styles.backdropGlassContainer} pointerEvents="none">
        <BlurView
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={Platform.OS === "ios" ? 50 : 80}
          tint={Platform.OS === "ios" ? "light" : "default"}
          style={StyleSheet.absoluteFill}
        />
        {/* Gradient glass sheen: truly transparent at the top, softly fading into frosted glass towards the bottom */}
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0)",
            "rgba(255, 255, 255, 0.15)",
            "rgba(255, 255, 255, 0.55)",
            "rgba(255, 255, 255, 0.9)",
          ]}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ── Tab Bar Pill ── */}
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const config = tabConfig.find((t) => t.name === route.name);
          if (!config) return null;

          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              focused={focused}
              icon={config.icon}
              activeIcon={config.activeIcon}
              label={config.label}
              isShop={config.isShop}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

// ── Layout ───────────────────────────────────────────────────────────────
export default function Layout() {
  const blurTargetRef = useRef<View>(null);

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <CustomTabBar {...props} blurTarget={blurTargetRef} />}
          initialRouteName="home"
        >
          <Tabs.Screen name="home" />
          <Tabs.Screen name="order" />
          <Tabs.Screen name="shop" />
          <Tabs.Screen name="earnings" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="service" options={{ href: null }} />
        </Tabs>
      </BlurTargetView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  barContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 35 : 35,
  },
  backdropGlassContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === "ios" ? 95 : 90,
    overflow: "hidden",
  },
  bar: {
    flexDirection: "row",
    backgroundColor: "white",
    width: SCREEN_WIDTH * 0.94,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 60,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  activeTabLabel: {
    color: "#D30309",
    fontWeight: "bold",
  },
});

