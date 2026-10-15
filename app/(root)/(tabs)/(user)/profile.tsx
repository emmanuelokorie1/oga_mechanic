import {
  userInfo,
  icons,
  ProfileSettings,
  MechanicProfileSettings,
  // DriverProfileSettings,
  ProfileSopprt,
} from "@/constants";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LAYOUT } from "@/constants/units";
import { router } from "expo-router";
import { routes } from "@/constants/routes";
import { ChevronRightIcon, ArrowRightOnRectangleIcon, PencilSquareIcon } from "react-native-heroicons/solid";
import SwitchUserModal from "@/components/modals/SwitchUserModal";
// import { useUserStore } from "@/stores/userStore";
import LogoutModal from "@/components/modals/LogoutModal";
import { usePrimaryUserProfile, useFollowedMerchants } from "@/hooks/useUserProfile";
import CustomAlert from "@/components/CustomAlert";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCentralizedLogout } from "@/hooks/useCentralizedLogout";
import { PrimaryUserProfileResponse } from "@/lib/api/user";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFavoriteProducts } from "@/hooks/useProducts";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";

const Profile = () => {
  const [isEnabledFaceId, setIsEnabledFaceId] = useState(false);
  const [isEnabledEnablePass, setIsEnabledEnablePass] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);

  const { SCROLL_PADDING_BOTTOM } = LAYOUT;

  // Fetch user profile data
  const {
    data: profileData,
    isLoading,
    refetch
  } = usePrimaryUserProfile();

  // Fetch favorite products
  const {
    data: favoritesData,
    refetch: refetchFavorites
  } = useFavoriteProducts();

  // Fetch followed merchants
  const { 
    data: followedMerchantsData,
    refetch: refetchFollowedMerchants
  } = useFollowedMerchants();

  const followedMerchantsCount = Array.isArray(followedMerchantsData?.data) ? followedMerchantsData.data.length : 0;

  const { visible, alertConfig, hideAlert } = useCustomAlert();
  const { logout, isLoggingOut } = useCentralizedLogout();

  // Pull to refresh functionality
  const { refreshControl } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetch(), 
        refetchFavorites(), 
        refetchFollowedMerchants()
      ]);
    }
  });


  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };


  const handleSwitchUser = (_userType: string) => {
    // Handle user switching logic here
    // You can add navigation logic or state management here
  };

  const MenuItem = ({ 
    title, 
    icon: Icon, 
    onPress, 
    showChevron = true,
    rightElement,
    isDestructive = false
  }: { 
    title: string; 
    icon?: any; 
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-4 border-b border-gray-50 last:border-0"
    >
      <View className="flex-row items-center gap-3">
        {Icon && (
          <View className={`w-10 h-10 rounded-full items-center justify-center ${isDestructive ? 'bg-red-50' : 'bg-gray-50'}`}>
            {typeof Icon === 'function' ? Icon({ size: 20, color: isDestructive ? '#EF4444' : '#4B5563' }) : <Icon size={20} color={isDestructive ? '#EF4444' : '#4B5563'} />}
          </View>
        )}
        <Text className={`text-base font-NunitoBold ${isDestructive ? 'text-red-500' : 'text-gray-900'}`}>
          {title}
        </Text>
      </View>
      
      {rightElement ? (
        rightElement
      ) : showChevron ? (
        <ChevronRightIcon size={20} color="#9CA3AF" />
      ) : null}
    </TouchableOpacity>
  );

  // Show loading state
  if (isLoading) {
    return (
      <LoadingSpinner
        message="Loading Profile..."
        size="medium"
      />
    );
  }

  // Get user data from API or fallback to static data
  const userData = (profileData as PrimaryUserProfileResponse)?.data;
  const displayName = userData?.first_name && userData?.last_name
    ? `${userData.first_name} ${userData.last_name}`
    : userInfo.name;

  const displayEmail = userData?.email || '';
  const displayPhone = userData?.phone_number || userInfo.phone;
  const isVerified = userData?.is_verified || false;
  const activeRole = userData?.current_role || 'primary_user';

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: SCROLL_PADDING_BOTTOM,
        }}
        refreshControl={<RefreshControl {...refreshControl} tintColor="#fff" />}
        bounces={false}
      >
        <AnimatedPageContainer animationType="fadeInDown" duration={500}>
          {/* Header Section */}
          <View className="rounded-b-[2.5rem] overflow-hidden shadow-lg mb-6">
            <View className="bg-white px-5 pt-6 pb-6">
              {/* Top Bar */}
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-2xl font-NunitoExtraBold text-gray-900">My Account</Text>
              </View>

              {/* Profile Card */}
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View className="relative mr-4">
                    <LinearGradient
                      colors={["#D30309", "#B91C1C"]}
                      className="w-16 h-16 rounded-2xl items-center justify-center"
                    >
                      <Text className="text-2xl font-NunitoExtraBold text-white">
                        {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                      </Text>
                    </LinearGradient>
                    {isVerified && (
                      <View className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white">
                        <Text className="text-white text-[10px]">✓</Text>
                      </View>
                    )}
                  </View>

                  {/* User Info */}
                  <View className="flex-1">
                    <Text className="text-lg font-NunitoBold text-gray-900 mb-0.5">{displayName || "User"}</Text>
                    {displayEmail && <Text className="text-gray-500 text-sm font-NunitoMedium">{displayEmail}</Text>}
                  </View>

                  {/* Role Badge */}
                  <View className="bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
                    <Text className="text-primary-600 text-xs font-NunitoBold capitalize">
                      {activeRole.replace("_", " ")}
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row mt-4 pt-4 border-t border-gray-200">

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(routes.favoriteProducts as any)}
                    className="flex-1 items-center justify-center py-2 bg-gray-50 rounded-xl mx-2"
                  >
                    <Text className="text-gray-900 text-lg font-NunitoBold mb-0.5">
                      {Array.isArray(favoritesData?.data) ? favoritesData.data.length : 0}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-500 text-xs font-NunitoBold mr-1">Favorites</Text>
                      <ChevronRightIcon size={12} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(routes.followedMerchants as any)}
                    className="flex-1 items-center justify-center py-2 bg-gray-50 rounded-xl mx-2"
                  >
                    <Text className="text-gray-900 text-lg font-NunitoBold mb-0.5">{followedMerchantsCount}</Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-500 text-xs font-NunitoBold mr-1">Following</Text>
                      <ChevronRightIcon size={12} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <View className="px-5 space-y-5 mt-2">
            {/* My Garage Section */}
            {(userData?.car_make || userData?.car_model) && (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-NunitoBold text-gray-500 uppercase ml-1">My Garage</Text>
                  <TouchableOpacity onPress={() => router.push(routes.cars as any)}>
                    <Text className="text-primary-500 text-xs font-NunitoBold">View All</Text>
                  </TouchableOpacity>
                </View>
                <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <View className="p-4 flex-row items-center">
                    <View className="w-12 h-12 bg-primary-50 rounded-xl items-center justify-center mr-3">
                      <icons.car width={24} height={24} color="#D30309" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-NunitoBold text-gray-900">
                        {userData.car_make} {userData.car_model}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        {userData.car_year && (
                          <View className="bg-gray-100 px-2 py-0.5 rounded">
                            <Text className="text-gray-600 text-xs font-NunitoBold">{userData.car_year}</Text>
                          </View>
                        )}
                        {userData.license_plate && (
                          <Text className="text-gray-400 text-xs font-NunitoMedium">
                            • {userData.license_plate}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ChevronRightIcon size={20} color="#9CA3AF" />
                  </View>
                </View>
              </View>
            )}

            {/* Account Settings */}
            <View>
              <Text className="text-sm font-NunitoBold text-gray-500 uppercase mb-3 ml-1">Account Settings</Text>
              <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
                {(() => {
                  let currentSettings = ProfileSettings.options;

                  if (activeRole === "mechanic") {
                    currentSettings = MechanicProfileSettings.options;
                  } else {
                    // Filter out subscription for primary users if they are confused
                    // But keeping it as per original ProfileSettings for now, just utilizing role switching
                    currentSettings = ProfileSettings.options;
                  }

                  return currentSettings.map((item) => (
                    <MenuItem
                      key={item.id}
                      title={item.name}
                      icon={item.image}
                      onPress={() => {
                        if (item.name === "Service Provider") {
                          setShowSwitchUserModal(true);
                        } else if (item.route) {
                          router.push(item.route as any);
                        }
                      }}
                    />
                  ));
                })()}
              </View>
            </View>

            {/* Preferences */}
            <View>
              <Text className="text-sm font-NunitoBold text-gray-500 uppercase my-3 ml-1">Preferences</Text>
              <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
                <MenuItem
                  title="Enable Fingerprint/Face ID"
                  icon={icons.faceId}
                  showChevron={false}
                  rightElement={
                    <Switch
                      trackColor={{ false: "#E5E7EB", true: "#50BE4E" }}
                      thumbColor={isEnabledFaceId ? "white" : "#F3F4F6"}
                      onValueChange={setIsEnabledFaceId}
                      value={isEnabledFaceId}
                    />
                  }
                />
                <MenuItem
                  title="Enable password login"
                  icon={icons.enablePass}
                  showChevron={false}
                  rightElement={
                    <Switch
                      trackColor={{ false: "#E5E7EB", true: "#50BE4E" }}
                      thumbColor={isEnabledEnablePass ? "white" : "#F3F4F6"}
                      onValueChange={setIsEnabledEnablePass}
                      value={isEnabledEnablePass}
                    />
                  }
                />
              </View>
            </View>

            {/* Support */}
            <View>
              <Text className="text-sm font-NunitoBold text-gray-500 uppercase my-3 ml-1">Support</Text>
              <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
                {ProfileSopprt.options.map((item) => (
                  <MenuItem key={item.id} title={item.name} icon={item.image} onPress={() => router.push(routes.supportSuggestions as any)} />
                ))}
              </View>
            </View>

            {/* Logout */}
            <View className="pt-2">
              <TouchableOpacity
                onPress={handleLogout}
                disabled={isLoggingOut}
                className={`flex-row items-center justify-center gap-2 bg-white border border-red-100 rounded-3xl py-4 shadow-sm ${
                  isLoggingOut ? "opacity-50" : ""
                }`}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <ArrowRightOnRectangleIcon size={20} color="#EF4444" />
                )}
                <Text className="text-red-500 text-lg font-NunitoBold">
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </Text>
              </TouchableOpacity>

              <View className="items-center mt-6 mb-4">
                <Text className="text-gray-400 text-xs font-NunitoMedium">Version 1.0.0 • Build 142</Text>
              </View>
            </View>
          </View>
        </AnimatedPageContainer>
      </ScrollView>

      {/* Modals & Alerts */}
      <LogoutModal
        visible={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />

      <SwitchUserModal
        isVisible={showSwitchUserModal}
        onClose={() => setShowSwitchUserModal(false)}
        onSwitchUser={handleSwitchUser}
      />

      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={hideAlert}
          type={alertConfig.type}
          autoDismiss={alertConfig.autoDismiss}
          autoDismissDelay={alertConfig.autoDismissDelay}
        />
      )}
    </SafeAreaView>
  );
};

export default Profile;