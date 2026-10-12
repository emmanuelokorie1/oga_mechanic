import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/constants';

const { width: screenWidth } = Dimensions.get('window');

interface ImageItem {
  id: number;
  image: string;
}

interface ImageGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  images: ImageItem[];
  selectedIndex: number;
  onImageSelect: (index: number) => void;
  imageErrors?: Set<number>;
  onImageError?: (index: number) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  visible,
  onClose,
  images,
  selectedIndex,
  onImageSelect,
  imageErrors = new Set(),
  onImageError,
}) => {
  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onImageSelect(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < images.length - 1) {
      onImageSelect(selectedIndex + 1);
    }
  };

  const currentImage = images[selectedIndex];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 bg-black/50">
            <TouchableOpacity
              onPress={onClose}
              className="w-12 h-12 rounded-full bg-white/20 items-center justify-center backdrop-blur-sm"
            >
              <Text className="text-white text-2xl font-light">×</Text>
            </TouchableOpacity>
            <View className="bg-black/30 px-4 py-2 rounded-full">
              <Text className="text-white text-base font-NunitoBold">
                {selectedIndex + 1} of {images.length}
              </Text>
            </View>
            <View className="w-12" />
          </View>

          {/* Image */}
          <View className="flex-1 items-center justify-center px-6">
            {currentImage && !imageErrors.has(selectedIndex) ? (
              <Image
                source={{ uri: currentImage.image }}
                style={{ 
                  width: screenWidth - 48, 
                  height: (screenWidth - 48) * 0.8,
                  resizeMode: 'contain'
                }}
                onError={() => onImageError?.(selectedIndex)}
              />
            ) : (
              <View 
                className="items-center justify-center bg-gray-800"
                style={{ 
                  width: screenWidth - 48, 
                  height: (screenWidth - 48) * 0.8
                }}
              >
                <View className="w-32 h-32 bg-gray-700 rounded-full items-center justify-center">
                  <Text className="text-gray-500 text-4xl">📷</Text>
                </View>
                <Text className="text-white text-lg mt-4">
                  {imageErrors.has(selectedIndex) ? 'Image failed to load' : 'No image available'}
                </Text>
              </View>
            )}
          </View>

          {/* Navigation */}
          {images.length > 1 && (
            <View className="flex-row items-center justify-between px-6 py-6 bg-black/50">
              <TouchableOpacity
                onPress={handlePrevious}
                disabled={selectedIndex === 0}
                className={`w-14 h-14 rounded-full items-center justify-center backdrop-blur-sm ${
                  selectedIndex === 0 ? 'bg-white/20' : 'bg-white/40'
                }`}
              >
                <Text className="text-white text-2xl font-light">‹</Text>
              </TouchableOpacity>

              <View className="flex-row space-x-3">
                {images.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => onImageSelect(index)}
                    className={`w-3 h-3 rounded-full ${
                      index === selectedIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleNext}
                disabled={selectedIndex === images.length - 1}
                className={`w-14 h-14 rounded-full items-center justify-center backdrop-blur-sm ${
                  selectedIndex === images.length - 1 ? 'bg-white/20' : 'bg-white/40'
                }`}
              >
                <Text className="text-white text-2xl font-light">›</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
};

export default ImageGalleryModal;
