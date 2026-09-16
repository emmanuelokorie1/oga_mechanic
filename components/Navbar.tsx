import { View, Text, TouchableOpacity, StatusBar, Image } from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import {
  SunIcon,
  MoonIcon,
  CloudIcon,
  BellIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
} from "react-native-heroicons/outline";
import { router, useSegments } from "expo-router";
import { routes, mechanicRoutes, sellerRoutes } from "@/constants/routes";
import { useUnreadNotificationCount, useActiveRoleProfile } from "@/hooks/useUserProfile";
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "@/lib/endpoints";

const getTimeOfDay = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      label: "Morning",
      icon: <SunIcon size={24} color="#FF6B35" />,
    };
  } else if (hour >= 12 && hour < 18) {
    return {
      label: "Afternoon",
      icon: <CloudIcon size={24} color="#4ECDC4" />,
    };
  } else {
    return {
      label: "Evening",
      icon: <MoonIcon size={24} color="#545677" />,
    };
  }
};

const getFullImageUrl = (path: string | null | undefined) => {
  if (!path) return undefined;
  if (typeof path !== 'string') return undefined;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  // Ensure we don't have double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  
  return `${cleanBase}${cleanPath}`;
};

const Navbar = () => {
  const { label, icon } = getTimeOfDay();
  const segments = useSegments();
  const [activeRole, setActiveRole] = useState<string | null>(null);
  
  // Derive role from segments as a fallback if activeRole hasn't loaded yet
  const segmentRole = useMemo(() => {
    const segs = segments as string[];
    if (segs.includes('(mechanic)')) return 'mechanic';
    if (segs.includes('(sellers)')) return 'seller';
    return null;
  }, [segments]);

  const queryClient = useQueryClient();
  
  // Fetch unread count efficiently
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  
  // Use the unified active role profile hook
  const { 
    data: roleProfileData, 
    isLoading: isLoadingProfile, 
    activeRole: hookActiveRole,
    isMechanic,
    isMerchant,
    isVehicleRental,
    primaryProfileData
  } = useActiveRoleProfile();

  // Synchronize local activeRole with hookActiveRole
  useEffect(() => {
    if (hookActiveRole && hookActiveRole !== activeRole) {
      setActiveRole(hookActiveRole);
      
      // Update AsyncStorage with the latest role
      AsyncStorage.setItem('current_active_role', hookActiveRole).catch((error) => {
        console.error('Error storing active role:', error);
      });
    }
  }, [hookActiveRole, activeRole]);
  
  // Baseline info from profiles
  const primaryData = primaryProfileData?.data;
  const roleResponseData = roleProfileData?.data || roleProfileData;

  // Specific profiles extracted safely
  const mProfile = roleResponseData?.mechanic_profile || (isMechanic ? roleResponseData : null);
  const merchProfile = roleResponseData?.merchant_profile || roleResponseData?.vehicle_rental_profile || ((isMerchant || isVehicleRental) ? roleResponseData : null);

  // Flattened data source for permissive lookup
  const combinedData = {
    ...(primaryData || {}),
    ...(roleResponseData || {}),
    ...(mProfile || {}),
    ...(merchProfile || {}),
    ...(mProfile?.user || {}),
    ...(merchProfile?.user || {}),
  } as any;

  // Robust Name Resolution
  const displayName = 
    ((isMerchant || isVehicleRental) && combinedData.store_name) ||
    combinedData.first_name || 
    'User';

  // Robust Image Resolution (checking all potential selfie/image keys)
  const rawImage = 
    combinedData.selfie ||
    combinedData.profile_picture ||
    combinedData.profile_image ||
    combinedData.image;

  const profilePicture = getFullImageUrl(rawImage);

  // Verification status
  const isVerified = 
    combinedData.is_verified || 
    combinedData.is_approved || 
    false;

  const handleNotificationPress = () => {
    router.push(routes.notifications);
  };

  return (
    <View className="flex-row justify-between items-center pt-3 pb-2 border-b border-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <TouchableOpacity
        onPress={() => {
          const roleKey = activeRole || segmentRole || "user";
          const profileRoute =
            roleKey === "mechanic"
              ? mechanicRoutes.profile
              : roleKey === "seller" || roleKey === "merchant"
              ? sellerRoutes.profile
              : routes.profile;

          router.push(profileRoute as any);
        }}
        activeOpacity={0.7}
        className="flex-1 flex-row items-center gap-2 mr-2"
      >
        <View className="w-[45px] h-[45px] bg-[#EBEBEB] flex justify-center items-center rounded-full overflow-hidden">
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              className="w-[45px] h-[45px] rounded-full"
              resizeMode="cover"
              alt="Profile"
            />
          ) : (
            <UserIcon size={24} color="#666" />
          )}
        </View>

        <View className="flex-1">
          <View className="flex flex-row items-center gap-1">
            <Text className="font-NunitoBold text-[1.2rem]" numberOfLines={1} ellipsizeMode="tail">
              Good {label}, {displayName || 'User'}
            </Text>
            {/* {icon} */}
            {/* {isVerified && (
              <View className="bg-green-100 px-1 py-0.5 rounded-full ml-1">
                <Text className="text-green-800 text-xs font-NunitoMedium">
                  ✓
                </Text>
              </View>
            )} */}
          </View>
          <Text className="text-[12px] text-text-100 pt-[.1rem]" numberOfLines={1} ellipsizeMode="tail">
            {activeRole === 'mechanic' 
              ? 'Manage your jobs and earnings.' 
              : activeRole === 'seller' || activeRole === 'merchant'
              ? 'Manage your shop and products.' 
              : activeRole === 'vehicle_rental'
              ? 'Manage your rentals and bookings.'
              : 'Everything your car needs is here.'}
          </Text>
        </View>
      </TouchableOpacity>

      <View className="flex-row items-center gap-2">
        {/* Chat / Inbox Icon */}
        <TouchableOpacity 
          className="w-[45px] h-[45px] bg-gray-50 flex justify-center items-center rounded-full relative"
          onPress={() => router.push("/(root)/(screens)/(user)/inbox")}
          activeOpacity={0.7}
        >
          <ChatBubbleLeftRightIcon size={24} color="#475569" />
          {/* We can wire up a real unread chat count here later */}
        </TouchableOpacity>

        {/* Notifications Icon */}
        <TouchableOpacity 
          className="w-[45px] h-[45px] bg-primary-100 flex justify-center items-center rounded-full relative"
          onPress={handleNotificationPress}
          activeOpacity={0.7}
        >
          <BellIcon size={24} color="#D30309" />
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 px-1 rounded-full w-fit h-5 items-center justify-center border-2 border-white">
              <Text className="text-white text-xs font-NunitoBold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Navbar;
