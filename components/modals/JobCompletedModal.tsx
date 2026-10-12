import React from 'react';
import { View, Text, Modal } from 'react-native';
import { router } from 'expo-router';
import CustomButton from '@/components/CustomButton';
import { CheckCircleIcon } from 'react-native-heroicons/outline';
import { mechanicRoutes } from '@/constants/routes';

interface JobCompletedModalProps {
  visible: boolean;
  onClose: () => void;
  showHomeButton?: boolean;
}

const JobCompletedModal: React.FC<JobCompletedModalProps> = ({
  visible,
  onClose,
  showHomeButton = true,
}) => {
  const handleGoHome = () => {
    onClose();
    router.replace(mechanicRoutes.home);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm items-center">
          {/* Success Icon */}
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
            <CheckCircleIcon size={48} color="#16A34A" />
          </View>

          {/* Title */}
          <Text className="text-2xl font-NunitoBold text-center text-gray-800 mb-3">
            Job Completed!
          </Text>

          {/* Message */}
          <Text className="text-gray-600 text-center mb-6 font-NunitoRegular leading-6">
            Congratulations! Please ask the customer to verify this completion on their app to finalize the repair and receive your earnings.
          </Text>

          {/* Buttons */}
          <View className="w-full space-y-3">
            {showHomeButton && (
              <CustomButton
                onPress={handleGoHome}
                title="Go to Home"
                bgVariant="primary"
                textVariant="default"
              />
            )}

            <CustomButton
              onPress={onClose}
              title="Close"
              bgVariant="outline"
              textVariant="outline"
              className={showHomeButton ? "mt-3" : ""}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default JobCompletedModal;

