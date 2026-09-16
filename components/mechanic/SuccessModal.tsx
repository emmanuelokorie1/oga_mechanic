import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { CheckCircleIcon } from 'react-native-heroicons/solid';
import CustomButton from '@/components/CustomButton';

interface SuccessModalProps {
  visible: boolean;
  orderId: string | null;
  message?: string | null;
  estimatedCost?: string | number | null;
  onTrackOrder: () => void;
  onGoHome: () => void;
}

/**
 * Success confirmation modal component
 * Displays after successfully creating a repair request
 */
export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  orderId,
  message,
  estimatedCost,
  onTrackOrder,
  onGoHome,
}) => {
  const amount =
    estimatedCost != null && !Number.isNaN(Number(estimatedCost))
      ? Number(estimatedCost)
      : null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onGoHome}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-5">
        <View className="bg-white rounded-[32px] p-6 w-full max-w-sm overflow-hidden border border-gray-100">
          
          {/* Success Icon */}
          <View className="items-center mt-4 mb-6">
            <View className="w-20 h-20 rounded-full bg-[#D30309]/10 items-center justify-center mb-5">
              <CheckCircleIcon size={44} color="#D30309" />
            </View>
            <Text className="text-2xl font-NunitoExtraBold text-gray-900 mb-2 text-center">
              Request Received
            </Text>
            <Text className="text-[14px] text-gray-500 font-NunitoMedium text-center leading-5 px-2">
              {message || "Your request is being processed. We'll notify you once a specialist accepts."}
            </Text>
          </View>

          {/* Details Summary Block */}
          {(orderId || amount != null) && (
            <View className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
              {orderId && (
                <View className={`flex-row items-center justify-between ${amount != null ? 'mb-3 pb-3 border-b border-gray-200' : ''}`}>
                  <Text className="text-[11px] text-gray-400 font-NunitoBold uppercase tracking-wider">
                    Reference ID
                  </Text>
                  <Text className="text-sm font-NunitoExtraBold text-gray-900">
                    #{orderId.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
              )}
              {amount != null && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] text-gray-400 font-NunitoBold uppercase tracking-wider">
                    Estimated PRICE
                  </Text>
                  <Text className="text-sm font-NunitoExtraBold text-[#D30309]">
                    ₦{amount.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-3 mt-1">
            <CustomButton
              title="Track Progress"
              onPress={onTrackOrder}
              bgVariant="primary"
              className=""
            />
            <TouchableOpacity
              onPress={onGoHome}
              className="h-14 rounded-2xl items-center justify-center bg-gray-50 border border-gray-100"
              activeOpacity={0.7}
            >
              <Text className="text-[14px] font-NunitoBold text-gray-700">Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </View>
    </Modal>
  );
};
