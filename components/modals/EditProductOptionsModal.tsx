import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  XMarkIcon, 
  DocumentTextIcon, 
  PhotoIcon, 
  ChevronRightIcon 
} from 'react-native-heroicons/outline';

interface EditProductOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditDetails: () => void;
  onEditImages: () => void;
  productData?: any;
}

const EditProductOptionsModal: React.FC<EditProductOptionsModalProps> = ({
  visible,
  onClose,
  onEditDetails,
  onEditImages,
  productData,
}) => {
  const insets = useSafeAreaInsets();

  const isRental = productData?.is_rental;
  const isSparePart = productData?.category?.name?.toLowerCase().includes('part');

  const detailsLabel = isRental 
    ? 'Rental Details' 
    : isSparePart 
      ? 'Spare Part Details' 
      : 'Vehicle Details';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 justify-end bg-black/40"
        onPress={onClose}
      >
        <Pressable 
          className="bg-white rounded-t-[36px] px-6 pt-3 shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-4" />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xl font-NunitoExtraBold text-gray-900">
                Edit Options
              </Text>
              <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                Choose what you would like to update
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center"
            >
              <XMarkIcon size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <View className="space-y-3 mb-2">
            {/* Option 1: Edit Details */}
            <TouchableOpacity
              onPress={onEditDetails}
              activeOpacity={0.75}
              className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-3 active:bg-gray-100"
            >
              <View className="w-12 h-12 rounded-xl bg-gray-900 items-center justify-center mr-4 shadow-sm shadow-gray-300">
                <DocumentTextIcon size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-NunitoBold text-gray-900">
                  {detailsLabel}
                </Text>
                <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                  Update price, specs, bidding, and description
                </Text>
              </View>
              <ChevronRightIcon size={18} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Option 2: Edit Images */}
            <TouchableOpacity
              onPress={onEditImages}
              activeOpacity={0.75}
              className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
            >
              <View className="w-12 h-12 rounded-xl bg-primary-500 items-center justify-center mr-4 shadow-sm shadow-primary-200">
                <PhotoIcon size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-NunitoBold text-gray-900">
                  Product Images
                </Text>
                <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                  Upload, rearrange, or delete product photos
                </Text>
              </View>
              <ChevronRightIcon size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default EditProductOptionsModal;
