import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {
  XMarkIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from 'react-native-heroicons/outline';
import TextArea from '@/components/forms/TextArea';

interface CancelRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelReason: string;
  selectedCancelReason: string;
  onReasonChange: (reason: string) => void;
  onSelectedReasonChange: (reason: string) => void;
  isLoading?: boolean;
}

interface ReasonOption {
  value: string;
  label: string;
  subtext: string;
}

const cancelReasons: ReasonOption[] = [
  {
    value: 'Found another mechanic',
    label: 'Found another mechanic',
    subtext: 'Found alternative roadside help nearby',
  },
  {
    value: 'Issue resolved myself',
    label: 'Issue resolved myself',
    subtext: 'Vehicle started or was fixed independently',
  },
  {
    value: 'Changed my mind',
    label: 'Changed my mind',
    subtext: 'Decided not to proceed with the repair today',
  },
  {
    value: 'Mechanic not available',
    label: 'Mechanic not available / too slow',
    subtext: 'Waiting time is longer than anticipated',
  },
  {
    value: 'Scheduling conflict',
    label: 'Scheduling conflict',
    subtext: 'Time or location is no longer convenient',
  },
  {
    value: 'Other',
    label: 'Other reason',
    subtext: 'Share specific details in the text box below',
  },
];

const CancelRequestModal: React.FC<CancelRequestModalProps> = ({
  visible,
  onClose,
  onConfirm,
  cancelReason,
  selectedCancelReason,
  onReasonChange,
  onSelectedReasonChange,
  isLoading = false,
}) => {
  const handleReasonSelect = (reason: string) => {
    onSelectedReasonChange(reason);
    if (reason !== 'Other') {
      onReasonChange('');
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
    onSelectedReasonChange('');
    onReasonChange('');
  };

  const isConfirmDisabled =
    isLoading ||
    !selectedCancelReason ||
    (selectedCancelReason === 'Other' && !cancelReason.trim());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/60">
          {/* Backdrop Dismiss */}
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          </TouchableWithoutFeedback>

          {/* Modal Sheet */}
          <View
            className="bg-white rounded-t-[32px] overflow-hidden"
            style={{
              maxHeight: '88%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 20,
            }}
          >
            {/* Top Drag Indicator */}
            <View className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 items-center justify-center mr-3">
                  <XCircleIcon size={24} color="#DC2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-NunitoExtraBold text-gray-900 leading-6">
                    Cancel Request
                  </Text>
                  <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                    Help us understand what went wrong
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              >
                <XMarkIcon size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Content Scrollable */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
            >
              {/* Notice Banner */}
              <View className="flex-row items-center bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 mb-5">
                <ExclamationCircleIcon size={20} color="#D97706" />
                <Text className="text-xs font-NunitoSemiBold text-amber-900 flex-1 ml-2.5 leading-4">
                  Cancelling will notify the mechanic immediately and release your current booking.
                </Text>
              </View>

              <Text className="text-sm font-NunitoBold text-gray-900 mb-3">
                Select a reason for cancellation
              </Text>

              {/* Reason Cards */}
              <View className="mb-2">
                {cancelReasons.map((item) => {
                  const isSelected = selectedCancelReason === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => handleReasonSelect(item.value)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                      className={`p-4 mb-3 rounded-2xl border ${
                        isSelected
                          ? 'border-red-500 bg-red-50/60'
                          : 'border-gray-200/80 bg-white'
                      } ${isLoading ? 'opacity-50' : ''}`}
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`w-5 h-5 rounded-full border-2 mr-3.5 items-center justify-center ${
                            isSelected
                              ? 'border-red-600 bg-red-600'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <View className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`text-[15px] font-NunitoBold ${
                              isSelected ? 'text-red-950' : 'text-gray-900'
                            }`}
                          >
                            {item.label}
                          </Text>
                          <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                            {item.subtext}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Animated Detail Input for 'Other' */}
              {selectedCancelReason === 'Other' && (
                <View className="mt-1 mb-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-200">
                  <Text className="text-xs font-NunitoBold text-gray-700 mb-2">
                    Please provide more details (required)
                  </Text>
                  <TextArea
                    placeholder="Tell us why you are cancelling this request..."
                    value={cancelReason}
                    onChangeText={onReasonChange}
                    rows={3}
                    required
                  />
                </View>
              )}
            </ScrollView>

            {/* Pinned Bottom Footer Actions */}
            <View className="px-6 py-4 border-t border-gray-100 bg-white pb-8">
              <View className="flex-row gap-3">
                {/* Secondary Safe Action: Keep Request */}
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  className="flex-1 h-14 rounded-2xl items-center justify-center bg-gray-100 border border-gray-200"
                >
                  <Text className="text-sm font-NunitoBold text-gray-700">
                    Keep Request
                  </Text>
                </TouchableOpacity>

                {/* Destructive Action: Confirm Cancel */}
                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={isConfirmDisabled}
                  activeOpacity={0.8}
                  className={`flex-1 h-14 rounded-2xl items-center justify-center ${
                    isConfirmDisabled ? 'bg-red-300' : 'bg-red-600'
                  }`}
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                      <Text className="text-sm font-NunitoBold text-white">
                        Cancelling...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-NunitoBold text-white">
                      Confirm Cancel
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CancelRequestModal;
