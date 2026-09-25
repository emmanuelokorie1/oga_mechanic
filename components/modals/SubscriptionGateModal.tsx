import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { LockClosedIcon } from 'react-native-heroicons/outline';
import CustomButton from '../CustomButton';
import AndroidNavBarSpacer from '../AndroidNavBarSpacer';
import { router } from 'expo-router';
import { sellerRoutes } from '@/constants/routes';

interface SubscriptionGateModalProps {
  isVisible: boolean;
  onClose: () => void;
  usedUploads?: number;
  roleName?: string;
}

const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  isVisible,
  onClose,
  usedUploads = 2,
}) => {
  const handleSubscribe = () => {
    onClose();
    router.push({
      pathname: sellerRoutes.subscription as any,
      params: { usedFreeUploads: String(usedUploads) },
    });
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/40 justify-end"
        onPress={onClose}
      >
        <Pressable 
          className="bg-white rounded-t-3xl p-6 pb-10"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
              <LockClosedIcon size={30} color="#D30309" />
            </View>
            <Text className="text-xl font-NunitoBold text-gray-900 text-center">
              Free Uploads Used
            </Text>
            <Text className="text-gray-600 text-center mt-2 font-NunitoMedium px-4 leading-5">
              You have used your {usedUploads} free uploads. Subscribe for ₦15,000/mo to upload more products and get unlimited listings.
            </Text>
          </View>

          {/* Buttons */}
          <View className="space-y-3">
            <CustomButton 
              title="Subscribe (₦15,000/mo)" 
              bgVariant="primary"
              onPress={handleSubscribe} 
            />

            <CustomButton 
              title="Cancel" 
              onPress={onClose} 
              bgVariant="outline" 
              textVariant="outline" 
              className="mt-3" 
            />

            <AndroidNavBarSpacer />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SubscriptionGateModal;
