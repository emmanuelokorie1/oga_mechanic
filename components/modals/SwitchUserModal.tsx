import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { showToast } from "@/utils/toastUtils";
import { MaterialIcons } from '@expo/vector-icons';
import { ShoppingBagIcon, WrenchScrewdriverIcon, UsersIcon } from "react-native-heroicons/solid";
import CustomButton from "../CustomButton";
import { useUserRoles, userProfileKeys, useSwitchRole } from "@/hooks/useUserProfile";
import { useRoles } from "@/hooks/useRoles";
import { router } from "expo-router";
import { routes, mechanicRoutes, sellerRoutes } from "@/constants/routes";
import CustomAlert from "../CustomAlert";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import { userAPI } from "@/lib/api/user";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AndroidNavBarSpacer from "../AndroidNavBarSpacer";
import ProfileCompletionModal from "./ProfileCompletionModal";
import { useProfileStore } from "@/hooks/useProfileStore";

const { height: screenHeight } = Dimensions.get("window");

interface SwitchUserModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSwitchUser: (userType: string) => void;
}

interface UserOption {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  iconName?: string;
  description: string;
  isActive?: boolean;
  isDisabled?: boolean;
  hasAccess?: boolean;
  roleName?: string; // Original role name for reference
  roleId?: number; // Role ID for API calls
}

const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isVisible,
  onClose,
  onSwitchUser,
}) => {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("");
  const { showError, hideAlert, visible, alertConfig } = useCustomAlert();
  const switchRoleMutation = useSwitchRole();
  const queryClient = useQueryClient();
  const setIsProfileComplete = useProfileStore((state) => state.setIsProfileComplete);
  const setIsNewSwitch = useProfileStore((state) => state.setIsNewSwitch);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  // Fetch user roles from API (only when modal is visible)
  const {
    data: rolesData,
    isLoading: isLoadingUserRoles,
    error: userRolesError
  } = useUserRoles({ enabled: isVisible });

  // Fetch all available roles from API (only when modal is visible)
  const {
    data: allRoles = [],
    isLoading: isLoadingAllRoles,
    error: allRolesError
  } = useRoles({ enabled: isVisible });

  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Slide up from bottom
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down to bottom
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Reset selected user when closing
      setTimeout(() => {
        setSelectedUser("");
      }, 200);
    }
  }, [isVisible]);

  // Map role names to icons and descriptions
  const getRoleInfo = (roleName: string) => {
    const roleMap: Record<string, { icon: React.ComponentType<any>, iconName?: string, description: string, displayName: string }> = {
      mechanic: {
        icon: WrenchScrewdriverIcon,
        description: "Provide repair services",
        displayName: "Mechanic"
      },
      merchant: {
        icon: ShoppingBagIcon,
        description: "Sell products and services",
        displayName: "Seller"
      },
      primary_user: {
        icon: UsersIcon,
        description: "Main user account",
        displayName: "Primary User"
      },
      vehicle_rental: {
        icon: UsersIcon,
        description: "Rent out vehicles",
        displayName: "Vehicle Rental"
      }
    };

    return roleMap[roleName] || {
      icon: UsersIcon,
      description: "User account",
      displayName: roleName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    };
  };

  // Create user options from all system roles fetched from API
  const userOptions: UserOption[] = React.useMemo(() => {
    if (!rolesData?.data || !allRoles.length) return [];

    const activeRole = rolesData.data.active_role;
    const userRoles = rolesData.data.roles || [];
    const userRoleNames = userRoles.map(role => role.name);

    // Filter out developer and admin roles, and the active role
    const filteredRoles = allRoles.filter(role => {
      const isNotExcluded = role.name !== 'developer' &&
        role.name !== 'admin' &&
        role.name !== 'driver' &&
        role.name !== 'rider';
      const activeRoleName = typeof activeRole === 'object' ? activeRole?.name : activeRole;
      const isNotActive = role.name !== activeRoleName;
      return isNotExcluded && isNotActive;
    });

    const mappedRoles = filteredRoles.map((role) => {
      const roleInfo = getRoleInfo(role.name);
      const hasRole = userRoleNames.includes(role.name);

      return {
        id: role.name,
        name: roleInfo.displayName, // Use displayName instead of role.title or role.name
        icon: roleInfo.icon,
        iconName: roleInfo.iconName,
        description: role.description || roleInfo.description,
        isActive: false, // No active role in the list
        isDisabled: false, // No disabled roles
        hasAccess: hasRole,
        roleName: role.name, // Keep original role name for reference
        roleId: role.id // Role ID for API calls
      };
    });

    // Sort roles to put registered roles first, then unregistered roles
    // Within each group, put primary_user at the top, then others alphabetically
    return mappedRoles.sort((a, b) => {
      // First priority: registered roles (hasAccess: true) come before unregistered
      if (a.hasAccess && !b.hasAccess) return -1;
      if (!a.hasAccess && b.hasAccess) return 1;

      // Second priority: within same access level, primary_user comes first
      if (a.roleName === 'primary_user' && b.roleName !== 'primary_user') return -1;
      if (b.roleName === 'primary_user' && a.roleName !== 'primary_user') return 1;

      // Third priority: alphabetical order
      return a.name.localeCompare(b.name);
    });
  }, [rolesData, allRoles]);

  // No need to set active role as selected since we're not showing it

  const handleSelectUser = (userType: string) => {
    setSelectedUser(userType);
  };

  const handleConfirm = async () => {
    if (selectedUser) {
      // Find the selected option to check if user has access
      const selectedOption = userOptions.find(option => option.id === selectedUser);
      const roleName = (selectedOption?.roleName || selectedUser) as string;
      const roleId = selectedOption?.roleId;

      if (roleId) {
        try {
          setIsSwitching(true);

          // Switch role (API automatically adds role if user doesn't have it)
          await switchRoleMutation.mutateAsync(roleName);

          const addRoles = !selectedOption?.hasAccess ? [roleId] : undefined;

          // Store the new active role for fallback purposes
          await AsyncStorage.setItem('current_active_role', roleName);

          // Wait a moment for cache invalidation (handled by mutation) to propagate
          await new Promise(resolve => setTimeout(resolve, 300));

          // Log them in directly
          onSwitchUser(roleName);
          // Flag that we just switched roles to trigger the 3s delay
          setIsNewSwitch(true);

          if (addRoles) {
            showToast.success(`Switched to ${selectedOption?.name || roleName}`);
          }

          // Check if profile is complete for non-primary roles
          if (roleName !== 'primary_user') {
            try {
              let profileResponse: any;

              // Fetch role-specific profile
              switch (roleName) {
                case 'mechanic':
                  profileResponse = await userAPI.getMechanicProfile();
                  break;
                case 'merchant':
                case 'seller':
                  profileResponse = await userAPI.getMerchantProfile();
                  break;
                case 'vehicle_rental':
                  profileResponse = await userAPI.getVehicleRentalProfile();
                  break;
                default:
                  profileResponse = null;
              }

              // Check if profile is complete
              let isComplete = true;
              let isPending = false;

              if (profileResponse?.data) {
                // Check for KYC object (Mechanic/Driver pattern)
                if (profileResponse.data.kyc && typeof profileResponse.data.kyc.is_complete !== 'undefined') {
                  isComplete = profileResponse.data.kyc.is_complete;

                  // Check for approval if complete
                  if (isComplete) {
                    const profileKey = roleName === 'mechanic' ? 'mechanic_profile' : 
                                      (roleName === 'vehicle_rental' ? 'vehicle_rental_profile' : 'merchant_profile');
                    isPending = !profileResponse.data[profileKey]?.is_approved;
                  }
                }
                // Check for has_profile (Merchant pattern)
                else if (typeof profileResponse.data.has_profile !== 'undefined') {
                  isComplete = profileResponse.data.has_profile;

                  // Check for approval if complete
                  if (isComplete) {
                    isPending = !profileResponse.data.merchant_profile?.is_approved;
                  }
                }
              }

              setIsPendingApproval(isPending);

              if (!isComplete) {
                // Update global state
                setIsProfileComplete(false);

                // Set role but don't show modal immediately
                setCurrentRole(roleName);
              } else {
                setIsProfileComplete(true);
              }
            } catch (profileError) {
              console.error('❌ Profile check failed:', profileError);
            }
          }

          // Navigate to role-specific home page
          let targetRoute: string = routes?.userHome;
          switch (roleName) {
            case 'primary_user': targetRoute = routes?.userHome; break;
            case 'mechanic': targetRoute = routes?.mechanicHome; break;
            case 'merchant':
            case 'seller':
            case 'vehicle_rental':
              targetRoute = sellerRoutes.home;
              break;
            default: targetRoute = routes?.userHome;
          }
          router.replace(targetRoute as any);

          // Small delay to show the animation before closing
          setTimeout(() => {
            onClose();
          }, 100);
        } catch (error: any) {
          console.error("Switch Role Error", error);
          const errorMessage = error.response?.data?.message || "Failed to switch role. Please try again.";
          showError("Switch Failed", errorMessage);
        } finally {
          setIsSwitching(false);
        }
      } else {
        showError("Error", "Invalid role configuration");
      }
    }
  };


  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="flex-1 justify-end">
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            }}
            className="bg-white rounded-t-3xl overflow-hidden shadow-2xl"
          >
            {/* Header with drag indicator */}
            <View className="items-center pt-4 pb-2">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            {/* Icon and Title */}
            <View className="items-center px-6 pb-6">
              <View className="w-20 h-20 border-2 border-primary-500 text-primary-500 rounded-full items-center justify-center mb-4">
                <UsersIcon size={32} color="#EF4444" />
              </View>
              <Text className="text-2xl font-NunitoBold text-gray-900 text-center mb-2">
                Service Provider
              </Text>
              <Text className="text-gray-600 text-center font-NunitoMedium">
                Seamlessly switch between accounts without logging out
              </Text>
            </View>

            {/* User Options */}
            <ScrollView className="px-6 pb-6">
              {isLoadingUserRoles || isLoadingAllRoles ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#D30309" />
                  <Text className="text-gray-600 mt-4 font-NunitoMedium">
                    Loading roles...
                  </Text>
                </View>
              ) : userRolesError || allRolesError ? (
                <View className="py-8 items-center">
                  <Text className="text-red-600 font-NunitoMedium">
                    Failed to load roles
                  </Text>
                  <Text className="text-gray-500 text-sm mt-2 text-center">
                    Please try again later
                  </Text>
                </View>
              ) : userOptions.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-gray-600 font-NunitoMedium">
                    No roles available
                  </Text>
                </View>
              ) : (
                userOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleSelectUser(option.id)}
                    className="flex-row items-center justify-between py-4 border-b border-gray-100 last:border-b-0"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 items-center justify-center">
                        <option.icon
                          name={option.iconName}
                          size={24}
                          color={"#374151"}
                        />
                      </View>
                      <View>
                        <View className="flex-row items-center gap-2">
                          <Text className={`text-base font-NunitoBold text-gray-900`}>
                            {option.name}
                          </Text>
                          {option.hasAccess && (
                            <View className="bg-green-100 px-2 py-0.5 rounded-full">
                              <Text className="text-green-800 text-xs font-NunitoMedium">
                                Available
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className={`text-sm font-NunitoMedium ${option.hasAccess ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                          {option.description}
                        </Text>
                      </View>
                    </View>

                    {/* Radio Button */}
                    <View className="w-5 h-5 border-2 border-gray-300 rounded-full items-center justify-center">
                      {selectedUser === option.id && (
                        <View className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pb-8 border-t border-gray-100 pt-4">
              <CustomButton
                title={
                  isSwitching
                    ? "Switching..."
                    : selectedUser
                      ? (() => {
                        const selectedOption = userOptions.find(u => u.id === selectedUser);
                        const hasAccess = selectedOption?.hasAccess || false;
                        const roleName = selectedOption?.name || selectedUser;
                        return hasAccess ? `Switch to ${roleName}` : `Sign up for ${roleName}`;
                      })()
                      : "Select a Role"
                }
                onPress={handleConfirm}
                disabled={!selectedUser || isLoadingUserRoles || isLoadingAllRoles || isSwitching}
                loading={isSwitching}
              />

              <CustomButton
                title={`Cancel`}
                onPress={onClose}
                className="bg-gray-300 mt-2"
                bgVariant="outline"
                textVariant="outline"
              />

              {/* Android Navigation Bar Spacer */}
              <AndroidNavBarSpacer />
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Custom Alert for role signup */}
      <CustomAlert
        visible={visible}
        title={alertConfig?.title || ""}
        message={alertConfig?.message || ""}
        onClose={hideAlert}
        onButtonPress={hideAlert}
        type={"info"}
        buttonText="Close"
      />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isVisible={showProfileModal}
        roleName={currentRole}
        onComplete={() => setShowProfileModal(false)}
        onClose={() => setShowProfileModal(false)}
        isPending={isPendingApproval}
      />
    </Modal>
  );
};

export default SwitchUserModal;
