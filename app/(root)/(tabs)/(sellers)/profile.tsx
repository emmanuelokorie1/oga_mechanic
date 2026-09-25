import {
  userInfo,
  icons,
  ProfileSopprt,
  SellerProfileSettings,
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LAYOUT } from "@/constants/units";
import { router } from "expo-router";
import { routes, sellerRoutes } from "@/constants/routes";
import { ChevronRightIcon, ArrowRightOnRectangleIcon } from "react-native-heroicons/solid";
import SwitchUserModal from "@/components/modals/SwitchUserModal";
import LogoutModal from "@/components/modals/LogoutModal";
import { useCentralizedLogout } from "@/hooks/useCentralizedLogout";
import { usePrimaryUserProfile } from "@/hooks/useUserProfile";
import { useMerchantAnalytics } from "@/hooks/useMerchantAnalytics";
import { PrimaryUserProfileResponse } from "@/lib/api/user";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useProfileStore } from "@/hooks/useProfileStore";
import ProfileCompletionModal from "@/components/modals/ProfileCompletionModal";
import KYCBanner from "@/components/KYCBanner";
import { useMerchantProfile, useVehicleRentalProfile } from "@/hooks/useUserProfile";

const SellerProfile = () => {
  const [isEnabledFaceId, setIsEnabledFaceId] = useState(false);
  const [isEnabledEnablePass, setIsEnabledEnablePass] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isProfileComplete = useProfileStore((state) => state.isProfileComplete);
  const setIsProfileComplete = useProfileStore((state) => state.setIsProfileComplete);
  const isNewSwitch = useProfileStore((state) => state.isNewSwitch);
  const setIsNewSwitch = useProfileStore((state) => state.setIsNewSwitch);

  const { SCROLL_PADDING_BOTTOM } = LAYOUT;

  // Use centralized logout hook
  const { logout, isLoggingOut } = useCentralizedLogout();

  // Use primary profile for all roles
  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = usePrimaryUserProfile();

  const activeRoleRaw = (profileData as PrimaryUserProfileResponse)?.active_role || (profileData as any)?.data?.active_role || (profileData as any)?.data?.current_role;
  const activeRole = typeof activeRoleRaw === 'object' ? activeRoleRaw?.name : activeRoleRaw;
  const isVehicleRental = activeRole === 'vehicle_rental';
  const isMerchant = activeRole === 'merchant' || activeRole === 'seller';
  
  // Fetch merchant analytics for stats (only if merchant)
  const { data: analyticsData, refetch: refetchAnalytics } = useMerchantAnalytics(isMerchant);
  
  const merchantProfileQuery = useMerchantProfile(isMerchant);
  const vehicleRentalProfileQuery = useVehicleRentalProfile(isVehicleRental);
  
  const activeProfileQuery = isVehicleRental ? vehicleRentalProfileQuery : merchantProfileQuery;

  const hasShownModalRef = React.useRef(false);
  const timerIdRef = React.useRef<NodeJS.Timeout | null>(null);

  const isPendingApproval = Boolean(
    activeProfileQuery.data?.data?.kyc?.is_complete && 
    !((activeProfileQuery.data?.data as any)?.merchant_profile?.is_approved || (activeProfileQuery.data?.data as any)?.vehicle_rental_profile?.is_approved)
  );

  React.useEffect(() => {
    if (!activeProfileQuery.isLoading && activeProfileQuery.data?.data) {
      const activeData = activeProfileQuery.data.data;
      // Check KYC status based on active role
      const profileInfo = isVehicleRental ? (activeData as any).vehicle_rental_profile : (activeData as any).merchant_profile;
      const hasKycData = !!(profileInfo as any)?.nin_number || !!activeData.kyc?.is_complete;
      setIsProfileComplete(hasKycData);
      
      // ONLY show automatically if we just switched roles and it's not complete
      if (isNewSwitch && !hasKycData && !activeProfileQuery.isLoading && !isProfileLoading && !hasShownModalRef.current) {
        // Start timer only if not already started
        if (!timerIdRef.current) {
          timerIdRef.current = setTimeout(() => {
            setShowProfileModal(true);
            hasShownModalRef.current = true;
            setIsNewSwitch(false); // Reset the switch flag
            timerIdRef.current = null;
          }, 3000); // Reduced to 3 seconds
        }
      } else if (!isNewSwitch) {
          // If not a new switch, make sure timer is cleared
          if (timerIdRef.current) {
              clearTimeout(timerIdRef.current);
              timerIdRef.current = null;
          }
      }
    }

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [activeProfileQuery.data, activeProfileQuery.isLoading, isProfileLoading, setIsProfileComplete, isNewSwitch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchAnalytics(), activeProfileQuery.refetch()]);
    setRefreshing(false);
  };

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
  if (isProfileLoading) {
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
  const isVerified = userData?.is_verified || false;
  
  // Profile image fallback prioritization:
  // 1. Merchant Selfie (primary for KYC)
  // 2. Merchant Profile Picture
  // 3. Primary User Profile Picture
  const merchantProfile = (activeProfileQuery.data?.data as any)?.merchant_profile || (activeProfileQuery.data?.data as any)?.vehicle_rental_profile;
  const profileImage = 
    merchantProfile?.selfie || 
    merchantProfile?.profile_picture || 
    (userData as any)?.profile_picture || 
    (userData as any)?.image || 
    null;

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: SCROLL_PADDING_BOTTOM,
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        bounces={false}
      >
        {/* Header Section */}
        <Animated.View 
          entering={FadeInDown.duration(600)}
          className="rounded-b-[2.5rem] overflow-hidden shadow-lg mb-6"
        >
          <View className="bg-white px-5 pt-6 pb-6">
            {/* Top Bar */}
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-2xl font-NunitoExtraBold text-gray-900">
                {isVehicleRental ? "Vehicle Rental Account" : "Seller Account"}
              </Text>
            </View>

            <View className="mb-4">
              <KYCBanner 
                isVisible={!activeProfileQuery.isLoading && (!isProfileComplete || isPendingApproval)} 
                role={isVehicleRental ? "vehicle_rental" : "seller"} 
                isPending={isPendingApproval} 
              />
            </View>

            {/* Profile Card */}
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => router.push(sellerRoutes.profileDetails as any)}
              className="bg-gray-50 rounded-2xl p-4 border border-gray-100"
            >
              <View className="flex-row items-center">
                {/* Avatar */}
                <View className="relative mr-4">
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      className="w-16 h-16 rounded-2xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={['#D30309', '#B91C1C']}
                      className="w-16 h-16 rounded-2xl items-center justify-center"
                    >
                      <Text className="text-2xl font-NunitoExtraBold text-white">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'S'}
                      </Text>
                    </LinearGradient>
                  )}
                  {isVerified && (
                    <View className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white">
                      <Text className="text-white text-[10px]">✓</Text>
                    </View>
                  )}
                </View>

                {/* User Info */}
                <View className="flex-1">
                  <Text className="text-lg font-NunitoBold text-gray-900 mb-0.5">
                    {displayName || 'Seller'}
                  </Text>
                  {displayEmail && (
                    <Text className="text-gray-500 text-sm font-NunitoMedium">
                      {displayEmail}
                    </Text>
                  )}
                </View>

                {/* Role Badge */}
                <View className="bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
                  <Text className="text-primary-600 text-xs font-NunitoBold">
                    {activeRole.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View className="flex-row mt-4 pt-4 border-t border-gray-200">
                
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: sellerRoutes.home as any, params: { tab: 'products' } })}
                  className="flex-1 items-center justify-center py-2 bg-gray-50 rounded-xl mx-2"
                >
                  <Text className="text-gray-900 text-lg font-NunitoBold mb-0.5">
                    {analyticsData?.product_count || 0}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs font-NunitoBold mr-1">
                      {isVehicleRental ? "Rentals" : "Products"}
                    </Text>
                    <ChevronRightIcon size={12} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View className="px-5 space-y-5 mt-2">
          {/* Account Settings */}
          <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
            <Text className="text-sm font-NunitoBold text-gray-500 uppercase mb-3 ml-1">
              Account Settings
            </Text>
            <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
              {SellerProfileSettings.options.map((item) => (
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
              ))}
            </View>
          </Animated.View>

          {/* Preferences */}
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            <Text className="text-sm font-NunitoBold text-gray-500 uppercase my-3 ml-1">
              Preferences
            </Text>
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
          </Animated.View>

          {/* Support */}
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()}>
            <Text className="text-sm font-NunitoBold text-gray-500 uppercase my-3 ml-1">
              Support
            </Text>
            <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
              {ProfileSopprt.options.map((item) => (
                <MenuItem
                  key={item.id}
                  title={item.name}
                  icon={item.image}
                  onPress={() => router.push(routes.supportSuggestions as any)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} className="pt-2">
            <TouchableOpacity
              onPress={handleLogout}
              disabled={isLoggingOut}
              className={`flex-row items-center justify-center gap-2 bg-white border border-red-100 rounded-3xl py-4 shadow-sm ${isLoggingOut ? 'opacity-50' : ''}`}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <ArrowRightOnRectangleIcon size={20} color="#EF4444" />
              )}
              <Text className="text-red-500 text-lg font-NunitoBold">
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </Text>
            </TouchableOpacity>
            
            <View className="items-center mt-6 mb-4">
              <Text className="text-gray-400 text-xs font-NunitoMedium">
                Version 1.0.0 • Build 142
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Modals */}
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

      <ProfileCompletionModal
        isVisible={showProfileModal}
        roleName={isVehicleRental ? "vehicle_rental" : "seller"}
        onComplete={() => setShowProfileModal(false)}
        onClose={() => setShowProfileModal(false)}
        isPending={isPendingApproval}
      />
    </SafeAreaView>
  );
};

export default SellerProfile;