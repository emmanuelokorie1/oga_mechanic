import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Dimensions
} from "react-native";
import { Tabs } from "expo-router";
import { icons } from "@/constants";
import AndroidNavBarSpacer from "@/components/AndroidNavBarSpacer";

export default function Layout() {
  const { width } = Dimensions.get("window");

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.bottomBar,
        }}
        initialRouteName="home"
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabBarItem}>
                {focused ? <icons.activeHome width={32} height={32} /> : <icons.home width={28} height={28} />}
                <Text style={[styles.tabLabel, focused && styles.activeTabLabel]}>Home</Text>
              </View>
            ),
          }}
        />
        
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: ({ focused }) => (
              <View style={styles.shopTabContainer}>
                <View style={styles.shopButton}>
                  <icons.shopTab />
                </View>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabBarItem}>
                {focused ? <icons.activeProfile width={32} height={32} /> : <icons.profile width={28} height={28} />}
                <Text style={[styles.tabLabel, focused && styles.activeTabLabel]}>Profile</Text>
              </View>
            ),
          }}
        />
      </Tabs>
      
      {/* Android Navigation Bar Spacer */}
      <AndroidNavBarSpacer />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    backgroundColor: "white",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "android" ? 75 : 85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Handle safe area manually if absolute
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
    top: Platform.OS === "ios" ? 12 : 6, 
    width: 65,
  },
  tabLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  activeTabLabel: {
    color: "#D30309",
    fontWeight: "bold",
  },
  shopTabContainer: {
    alignItems: "center",
    justifyContent: "center",
    top: Platform.OS === "ios" ? -10 : -16, 
  },
  shopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D30309",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D30309",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
