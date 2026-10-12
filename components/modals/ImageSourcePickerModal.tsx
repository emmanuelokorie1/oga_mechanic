import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { CameraIcon, PhotoIcon, XMarkIcon } from 'react-native-heroicons/outline';
import AndroidNavBarSpacer from '@/components/AndroidNavBarSpacer';

export interface ImageSourcePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  title?: string;
  subtitle?: string;
}

export const ImageSourcePickerModal: React.FC<ImageSourcePickerModalProps> = ({
  visible,
  onClose,
  onSelectCamera,
  onSelectGallery,
  title = "Select Image Source",
  subtitle = "Choose whether to take a new photo using your camera or select from your gallery."
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable className="bg-white rounded-t-3xl p-6" onPress={(e) => e.stopPropagation?.()}>
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-5" />

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-NunitoBold text-gray-900">
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <XMarkIcon size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {subtitle ? (
            <Text className="text-gray-500 text-sm mb-5 font-NunitoMedium">
              {subtitle}
            </Text>
          ) : null}

          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => {
                onClose();
                onSelectCamera();
              }}
              className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
            >
              <View className="w-12 h-12 bg-red-100 rounded-2xl items-center justify-center mr-4">
                <CameraIcon size={24} color="#D30309" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-NunitoBold text-gray-900">Take Photo</Text>
                <Text className="text-gray-500 text-xs mt-0.5 font-NunitoMedium">Use camera to capture a new photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                onSelectGallery();
              }}
              className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100 mt-3"
            >
              <View className="w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center mr-4">
                <PhotoIcon size={24} color="#0A6DEE" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-NunitoBold text-gray-900">Choose from Gallery</Text>
                <Text className="text-gray-500 text-xs mt-0.5 font-NunitoMedium">Select image from photo library</Text>
              </View>
            </TouchableOpacity>

            <AndroidNavBarSpacer />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ImageSourcePickerModal;
