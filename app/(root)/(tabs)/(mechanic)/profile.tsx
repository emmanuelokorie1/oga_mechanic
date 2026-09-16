import {
  userInfo,
  icons,
  ProfileSopprt,
  MechanicProfileSettings,
} from "@/constants";
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
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
import { mechanicRoutes, routes } from "@/constants/routes";
import { ChevronRightIcon, ArrowRightOnRectangleIcon } from "react-native-heroicons/solid";
import SwitchUserModal from "@/components/modals/SwitchUserModal";
import LogoutModal from "@/components/modals/LogoutModal";
import { useCentralizedLogout } from "@/hooks/useCentralizedLogout";
import { usePrimaryUserProfile, useMechanicProfile } from "@/hooks/useUserProfile";
import { useRepairRequests } from "@/hooks/useRepairRequests";
import { PrimaryUserProfileResponse } from "@/lib/api/user";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import { useProfileStore } from "@/hooks/useProfileStore";
import KYCBanner from "@/components/KYCBanner";
import { useQuery } from "@tanstack/react-query";
import { mechanicAPI } from "@/lib/api/mechanic";
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  ChevronRightIcon as ChevronRightIconOutline,
  SparklesIcon
} from "react-native-heroicons/outline";

const MechanicProfile = () => {
  const [isEnabledFaceId, setIsEnabledFaceId] = useState(false);
  const [isEnabledEnablePass, setIsEnabledEnablePass] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New query for vehicle expertise
  const {
    data: expertiseData,
    isLoading: isExpertiseLoading,
  } = useQuery({
    queryKey: ["vehicleExpertise"],
    queryFn: () => mechanicAPI.getVehicleExpertise(),
    enabled: true,
  });

  const expertise = expertiseData?.results || expertiseData?.data || (Array.isArray(expertiseData) ? expertiseData : []);

  const { SCROLL_PADDING_BOTTOM } = LAYOUT;

  // Use centralized logout hook
  const { logout, isLoggingOut } = useCentralizedLogout();

  // Fetch profile and repair requests using the unified hook
  const primaryProfile = usePrimaryUserProfile();
  const mechanicProfile = useMechanicProfile(true); // Always enabled here
  
  const { 
    data: profileData, 
    isLoading: isLoadingProfile, 
    refetch,
    primaryProfileData
  } = {
    data: (mechanicProfile.data || primaryProfile.data) as any,
    isLoading: mechanicProfile.isLoading && !mechanicProfile.data,
    refetch: () => {
      primaryProfile.refetch();
      mechanicProfile.refetch();
    },
    primaryProfileData: primaryProfile.data
  };

  const isMechanic = true;

  const { data: repairRequests, refetch: refetchRequests } = useRepairRequests(undefined, isMechanic);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchRequests()]);
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

  const isProfileComplete = useProfileStore((state) => state.isProfileComplete);
  const setIsProfileComplete = useProfileStore((state) => state.setIsProfileComplete);

  // Check profile status on load
  React.useEffect(() => {
    if (profileData && !isLoadingProfile && isMechanic) {
      const isComplete = (profileData as any).data?.kyc?.is_complete ?? false;
      setIsProfileComplete(isComplete);
    }
  }, [profileData, isLoadingProfile, setIsProfileComplete, isMechanic]);

  // Show loading state
  if (isLoadingProfile) {
    return (
      <LoadingSpinner
        message="Loading Profile..."
        size="medium"
      />
    );
  }

  const userData = primaryProfileData?.data;
  const mechanicData = profileData?.data || profileData;
  const displayName = userData?.first_name && userData?.last_name
    ? `${userData.first_name} ${userData.last_name}`
    : mechanicData?.mechanic_profile?.user?.first_name && mechanicData?.mechanic_profile?.user?.last_name
    ? `${mechanicData.mechanic_profile.user.first_name} ${mechanicData.mechanic_profile.user.last_name}`
    : userInfo.name;

  const displayEmail = userData?.email || mechanicData?.mechanic_profile?.user?.email || '';
  const isVerified = userData?.is_verified || false;
  const profileImage = (mechanicData?.mechanic_profile as any)?.selfie || (userData as any)?.profile_picture || (userData as any)?.image || null;
  
  // Stats data
  const completedJobs = repairRequests?.data?.filter((r: any) => r.status === 'completed')?.length || 0;
  const pendingJobs = repairRequests?.data?.filter((r: any) => r.status === 'pending')?.length || 0;
  const totalEarnings = (mechanicData?.mechanic_profile as any)?.total_earnings || 0;

  const isComplete = Boolean((profileData as any)?.data?.kyc?.is_complete || (profileData as any)?.kyc?.is_complete);
  const isApproved = Boolean((profileData as any)?.data?.mechanic_profile?.is_approved || (profileData as any)?.mechanic_profile?.is_approved);
  const isPendingApproval = isMechanic && isComplete && !isApproved;

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
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
      >
        <AnimatedPageContainer animationType="fadeInDown" duration={500}>
          {/* Header Section */}
          <View className="rounded-b-[2.5rem] overflow-hidden shadow-lg mb-6">
            <View className="bg-white px-5 pt-6 pb-6">
              {/* Top Bar */}
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-2xl font-NunitoExtraBold text-gray-900">Mechanic Account</Text>
              </View>

              <View className="mb-4">
                <KYCBanner 
                  isVisible={!isLoadingProfile && (!isComplete || isPendingApproval)} 
                  role="mechanic" 
                  isPending={isPendingApproval} 
                />
              </View>

              {/* Specializations Section - Only show when profile is complete */}
              {isComplete && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-NunitoBold text-gray-500 uppercase ml-1">Specializations</Text>
                    {expertise.length > 0 && (
                      <TouchableOpacity onPress={() => router.push(`${mechanicRoutes.completeKyc}?step=2`)}>
                        <Text className="text-red-600 font-NunitoBold text-xs">Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {isExpertiseLoading ? (
                    <View className="flex-row flex-wrap gap-2">
                      {[1, 2, 3].map((i) => (
                        <View key={i} className="bg-gray-200 h-8 w-24 rounded-full animate-pulse" />
                      ))}
                    </View>
                  ) : expertise.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {expertise.map((item: any, index: number) => (
                        <View 
                          key={index} 
                          className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex-row items-center"
                        >
                          <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                          <Text className="text-gray-800 font-NunitoSemiBold text-sm">
                            {item.vehicle_make_name || item.vehicle_make?.name || "Expertise"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => router.push(`${mechanicRoutes.completeKyc}?step=2`)}
                      activeOpacity={0.9}
                      className="bg-white border border-gray-100 p-4 rounded-[20px] flex-row items-center shadow-sm relative overflow-hidden"
                    >
                      <View className="bg-primary-50 p-3 rounded-[16px] mr-4 relative z-10">
                        <ShieldCheckIcon size={24} color="#D30309" />
                        <View className="absolute -top-1 -right-1">
                          <SparklesIcon size={12} color="#FBBF24" />
                        </View>
                      </View>
                      
                      <View className="flex-1 mr-3 z-10">
                        <Text className="text-gray-900 font-NunitoExtraBold text-[15px] mb-0.5 tracking-tight">Define Your Expertise</Text>
                        <Text className="text-gray-500 font-NunitoMedium text-[12px] leading-[16px]">
                          List the vehicle brands you specialize in.
                        </Text>
                      </View>

                      <View className="bg-gray-50 w-9 h-9 rounded-full items-center justify-center z-10">
                        <ChevronRightIconOutline size={18} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Profile Card */}
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
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
                          {displayName ? displayName.charAt(0).toUpperCase() : 'M'}
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
                      {displayName || 'Mechanic'}
                    </Text>
                    {displayEmail && (
                      <Text className="text-gray-500 text-sm font-NunitoMedium">
                        {displayEmail}
                      </Text>
                    )}
                  </View>

                  {/* Role Badge */}
                  <View className="bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 flex-row items-center gap-1.5">
                    <View className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    <Text className="text-primary-600 text-xs font-NunitoBold">
                      Mechanic
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row mt-4 pt-4 border-t border-gray-200">
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: mechanicRoutes.home as any, params: { tab: 'order' } })}
                    className="flex-1 items-center justify-center py-2 bg-gray-50 rounded-xl mx-2"
                  >
                    <Text className="text-gray-900 text-lg font-NunitoBold mb-0.5">
                      {completedJobs}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-500 text-xs font-NunitoBold mr-1">Completed</Text>
                      <ChevronRightIcon size={12} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: mechanicRoutes.home as any, params: { tab: 'order' } })}
                    className="flex-1 items-center justify-center py-2 bg-gray-50 rounded-xl mx-2"
                  >
                    <Text className="text-gray-900 text-lg font-NunitoBold mb-0.5">
                      {pendingJobs}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-500 text-xs font-NunitoBold mr-1">Pending</Text>
                      <ChevronRightIcon size={12} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => router.push(mechanicRoutes.earnings as any)}
                    className="flex-1 items-center justify-center py-2 bg-gray-50 rounded-xl mx-2"
                  >
                    <Text className="text-gray-900 text-lg font-NunitoBold mb-0.5">
                      ₦{totalEarnings >= 1000 ? `${(totalEarnings / 1000).toFixed(1)}k` : totalEarnings}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-gray-500 text-xs font-NunitoBold mr-1">Earnings</Text>
                      <ChevronRightIcon size={12} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <View className="px-5 space-y-5 mt-2">

            {/* Account Settings Section */}
            <View>
              <Text className="text-sm font-NunitoBold text-gray-500 uppercase mb-3 ml-1">Account Settings</Text>
              <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
                {MechanicProfileSettings.options.map((item) => (
                  <MenuItem
                    key={String(item.id)}
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
            </View>

            {/* Preferences Section */}
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

            {/* Support Section */}
            <View>
              <Text className="text-sm font-NunitoBold text-gray-500 uppercase my-3 ml-1">Support</Text>
              <View className="bg-white rounded-3xl px-5 py-2 shadow-sm border border-gray-100/50">
                {ProfileSopprt.options.map((item) => (
                  <MenuItem
                    key={String(item.id)}
                    title={item.name}
                    icon={item.image}
                    onPress={() => router.push(routes.supportSuggestions as any)}
                  />
                ))}
              </View>
            </View>

          {/* Logout Button */}
            <View className="pt-2">
              <TouchableOpacity
                onPress={handleLogout}
                disabled={isLoggingOut}
                className={`flex-row items-center justify-center gap-2 bg-white border border-red-100 rounded-3xl py-4 shadow-sm ${
                  isLoggingOut ? 'opacity-50' : ''
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

              {/* Version Info */}
              <View className="items-center mt-6 mb-4">
                <Text className="text-gray-400 text-xs font-NunitoMedium">Version 1.0.0 • Build 142</Text>
              </View>
            </View>
          </View>
        </AnimatedPageContainer>
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
    </SafeAreaView>
  );
};

export default MechanicProfile;