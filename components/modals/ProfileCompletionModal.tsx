import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { SparklesIcon, ShieldCheckIcon } from "react-native-heroicons/solid";
import CustomButton from "../CustomButton";
import { router } from "expo-router";
import { roleKYCRoutes, routes } from "@/constants/routes";

interface ProfileCompletionModalProps {
  isVisible: boolean;
  roleName: string;
  onComplete: () => void;
  onClose: () => void;
  isPending?: boolean;
}

const ProfileCompletionModal = ({
  isVisible,
  roleName,
  onComplete,
  onClose,
  isPending,
}: ProfileCompletionModalProps) => {
  const getRoleDisplayName = (role: string): string => {
    const roleMap: Record<string, string> = {
      mechanic: "Mechanic",
      merchant: "Merchant",
      driver: "Driver",
      rider: "Rider",
      seller: "Seller",
      vehicle_rental: "Vehicle Rental",
    };
    return roleMap[role] || role;
  };

  const getRoleKYCRoute = (role: string): string => {
    return roleKYCRoutes[role] || routes.register;
  };

  const handleCompleteProfile = () => {
    if (isPending) {
        Alert.alert("Under Review", "Your profile is currently under review by an admin. You will be notified once approved.");
        onClose();
        return;
    }
    const kycRoute = getRoleKYCRoute(roleName);
    router.push(kycRoute as any);
    onComplete();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center px-5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        <View 
          className="bg-white rounded-[32px] w-full max-w-sm pt-8 pb-6 px-6 relative"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.15,
            shadowRadius: 32,
            elevation: 2,
          }}
        >
          {/* Decorative Background Elements */}
          <View className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-full rounded-tr-[32px] opacity-50" />
          <View className="absolute top-10 left-5">
             <SparklesIcon size={24} color="#FCA5A5" opacity={0.5} />
          </View>

          {/* Icon Badge */}
          <View className="items-center mb-6 relative">
            <View className="w-20 h-20 bg-primary-100 rounded-[24px] items-center justify-center transform rotate-3 relative z-10"
              style={{
                shadowColor: '#D30309',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
              }}
            >
              <View className="transform -rotate-3">
                <ShieldCheckIcon size={40} color="#D30309" />
              </View>
            </View>
            <View className="absolute top-2 right-1/4 w-4 h-4 rounded-full bg-yellow-400 border-2 border-white z-20" />
          </View>

          {/* Text Content */}
          <View className="items-center mb-8">
            <Text className="text-[24px] font-NunitoExtraBold text-gray-900 text-center mb-2 tracking-tight">
              {isPending ? "Verification in Progress" : "Unlock Your Potential"}
            </Text>
            <Text className="text-[15px] font-NunitoMedium text-gray-500 text-center leading-6 px-2">
              {isPending 
                ? "We are currently reviewing your documents. You'll be able to access all features once your profile is approved."
                : <>Complete your <Text className="text-primary-600 font-NunitoBold">{getRoleDisplayName(roleName)}</Text> profile to start getting jobs and unlocking exclusive features!</>}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3 w-full">
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleCompleteProfile}
              className="bg-primary-500 py-4 rounded-[20px] items-center w-full"
              style={{
                shadowColor: '#D30309',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <Text className="text-white font-NunitoBold text-[16px]">
                {isPending ? "Check Status" : "Complete Profile Now"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.6}
              onPress={onClose}
              className="py-4 items-center w-full border border-gray-300 rounded-[20px] mt-4"
            >
              <Text className="text-gray-400 font-NunitoMedium text-[15px]">Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProfileCompletionModal;
