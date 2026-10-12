import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, Pressable } from 'react-native'
import { CameraIcon, XMarkIcon, PhotoIcon } from 'react-native-heroicons/outline'
import AndroidNavBarSpacer from './AndroidNavBarSpacer'
import { pickImageWithPermission } from '@/utils/imagePickerHelper'

interface ImageUploadDrawerProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  layout?: 'single' | 'large-small' | 'grid'
}

const ImageUploadDrawer: React.FC<ImageUploadDrawerProps> = ({
  images,
  onImagesChange,
  maxImages = 3,
  layout = 'large-small'
}) => {
  const [showDrawer, setShowDrawer] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  const handleImageUpload = async (source: 'camera' | 'gallery') => {
    try {
      const result = await pickImageWithPermission(source, {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result && !result.canceled && result.assets[0]) {
        const newImage = result.assets[0].uri
        const newImages = [...images]
        
        if (selectedSlot !== null) {
          newImages[selectedSlot] = newImage
        } else {
          const nextIndex = newImages.findIndex(img => !img)
          if (nextIndex !== -1) {
            newImages[nextIndex] = newImage
          } else {
            newImages.push(newImage)
          }
        }
        
        onImagesChange(newImages)
        setShowDrawer(false)
        setSelectedSlot(null)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      alert('Failed to pick image. Please try again.')
    }
  }

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  const openDrawer = (slotIndex: number) => {
    if (images.length >= maxImages && !images[slotIndex]) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }
    setSelectedSlot(slotIndex)
    setShowDrawer(true)
  }

  const renderUploadSlot = (index: number, isLarge: boolean = false) => {
    const hasImage = images[index]
    
    return (
      <View key={index} className={isLarge ? "mb-3" : "flex-1"}>
        {hasImage ? (
          <View className="relative">
            <Image 
              source={{ uri: images[index] }} 
              className={`w-full ${isLarge ? 'h-48' : 'h-24'} rounded-xl border-2 border-gray-300`}
              resizeMode="cover"
            />
            <TouchableOpacity 
              onPress={() => handleRemoveImage(index)}
              className={`absolute ${isLarge ? 'top-2 right-2 w-6 h-6' : 'top-1 right-1 w-5 h-5'} bg-white rounded-full items-center justify-center shadow-sm`}
            >
              <XMarkIcon size={isLarge ? 16 : 12} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={() => openDrawer(index)}
            className={`border-2 border-dashed border-primary-500 rounded-xl ${isLarge ? 'p-8' : 'p-4'} items-center justify-center ${isLarge ? 'h-48' : 'h-24'}`}
          >
            <View className={`${isLarge ? 'w-12 h-12' : 'w-8 h-8'} bg-red-100 rounded-full items-center justify-center ${isLarge ? 'mb-4' : 'mb-2'}`}>
              <CameraIcon size={isLarge ? 24 : 16} color="#D30309" />
            </View>
            {isLarge ? (
              <>
                <Text className="text-red-600 font-NunitoMedium mb-2">Maximum of three Images</Text>
                <Text className="text-gray-500 text-sm">(Max. File size: 15 MB)</Text>
              </>
            ) : (
              <>
                <Text className="text-gray-500 text-xs text-center">Upload image {index + 1}</Text>
                <Text className="text-gray-400 text-xs text-center">(Max. File size: 15 MB)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderLayout = () => {
    switch (layout) {
      case 'single':
        return renderUploadSlot(0, true)
      
      case 'large-small':
        return (
          <View className="space-y-4">
            {renderUploadSlot(0, true)}
            <View className="flex-row gap-2">
              {[1, 2].map(index => renderUploadSlot(index))}
            </View>
          </View>
        )
      
      case 'grid':
        return (
          <View className="flex-row flex-wrap gap-2">
            {[0, 1, 2].map(index => (
              <View key={index} className="w-[48%]">
                {renderUploadSlot(index)}
              </View>
            ))}
          </View>
        )
      
      default:
        return renderUploadSlot(0, true)
    }
  }

  return (
    <>
      {renderLayout()}

      {/* Bottom Drawer Modal */}
      <Modal
        visible={showDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDrawer(false)}
      >
        <Pressable 
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowDrawer(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />
            
            <Text className="text-lg font-NunitoBold text-gray-900 mb-6 text-center">
              Select Image Source
            </Text>
            
            <View className="space-y-4">
              <TouchableOpacity
                onPress={() => handleImageUpload('camera')}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
              >
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <CameraIcon size={24} color="#0A6DEE" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-NunitoBold text-gray-900">Take Photo</Text>
                  <Text className="text-gray-500 text-sm">Use camera to take a new photo</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleImageUpload('gallery')}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
              >
                <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4">
                  <PhotoIcon size={24} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-NunitoBold text-gray-900">Choose from Gallery</Text>
                  <Text className="text-gray-500 text-sm">Select an image from your gallery</Text>
                </View>
              </TouchableOpacity>

              {/* Android Navigation Bar Spacer */}
              <AndroidNavBarSpacer />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

export default ImageUploadDrawer
