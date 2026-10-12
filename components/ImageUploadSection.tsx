import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native'
import { CameraIcon, XMarkIcon } from 'react-native-heroicons/outline'
import DeleteImageDrawal from '@/components/modals/DeleteImageDrawal'
import ImageSourcePickerModal from '@/components/modals/ImageSourcePickerModal'
import { pickImageWithPermission } from '@/utils/imagePickerHelper'

interface ImageUploadSectionProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  layout?: 'large-small' | 'grid' | 'single'
  title?: string
  showTitle?: boolean
  existingImages?: any[]
  onDeleteImage?: (imageId: number) => void
  onReplaceImage?: (imageId: number, imageIndex: number) => void
  loadingImages?: Set<string>
  deletingImages?: Set<number>
}

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  images,
  onImagesChange,
  maxImages = 3,
  layout = 'large-small',
  title = 'Upload image',
  showTitle = true,
  existingImages = [],
  onDeleteImage,
  onReplaceImage,
  loadingImages = new Set(),
  deletingImages = new Set()
}) => {
  const [deleteDrawerVisible, setDeleteDrawerVisible] = useState(false)
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false)
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | undefined>(undefined)
  const [selectedImageForDelete, setSelectedImageForDelete] = useState<{
    index: number;
    imageUri: string;
    imageId?: number;
  } | null>(null)

  const handleImageUpload = (slotIndex?: number) => {
    // Check if we have reached the maximum number of images (only if maxImages is reasonable)
    const currentImageCount = images.filter(img => img).length
    if (maxImages < 999 && currentImageCount >= maxImages) {
      Alert.alert('Maximum images reached', `You can only upload up to ${maxImages} images`)
      return
    }

    setActiveSlotIndex(slotIndex)
    setSourcePickerVisible(true)
  }

  const handlePickSource = async (source: 'camera' | 'gallery') => {
    try {
      const result = await pickImageWithPermission(source, {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (result && !result.canceled && result.assets[0]) {
        const newImage = result.assets[0].uri
        const slotIndex = activeSlotIndex

        if (slotIndex !== undefined) {
          // Add to specific slot
          const newImages = [...images]
          while (newImages.length <= slotIndex) {
            newImages.push('')
          }
          newImages[slotIndex] = newImage
          onImagesChange(newImages)
        } else {
          // Add to next available slot
          const newImages = [...images]
          const nextIndex = newImages.findIndex(img => !img)
          if (nextIndex !== -1) {
            newImages[nextIndex] = newImage
          } else if (newImages.length < maxImages) {
            newImages.push(newImage)
          }
          onImagesChange(newImages)
        }
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
    } finally {
      setActiveSlotIndex(undefined)
    }
  }

  const handleRemoveImage = (index: number) => {
    // Check if this is an existing image (has an ID) that needs to be deleted from server
    if (existingImages[index]?.id && onDeleteImage) {
      setSelectedImageForDelete({
        index,
        imageUri: images[index],
        imageId: existingImages[index].id
      })
      setDeleteDrawerVisible(true)
    } else {
      // Just remove from local array (new image not yet uploaded)
      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    }
  }

  const handleConfirmDelete = () => {
    if (selectedImageForDelete?.imageId && onDeleteImage) {
      // Close modal immediately when delete starts
      setDeleteDrawerVisible(false)
      setSelectedImageForDelete(null)
      // Start delete operation
      onDeleteImage(selectedImageForDelete.imageId)
    }
  }

  const handleCloseDrawer = () => {
    setDeleteDrawerVisible(false)
    setSelectedImageForDelete(null)
  }

  const renderUploadSlot = (index: number, isLarge: boolean = false) => {
    const hasImage = images[index]
    const isImageLoading = hasImage && loadingImages.has(hasImage)
    const isImageDeleting = existingImages[index]?.id && deletingImages.has(existingImages[index].id)
    
    return (
      <View key={index} className={isLarge ? "mb-3" : "flex-1"}>
        {hasImage ? (
          <TouchableOpacity 
            className="relative"
            onPress={() => {
              // If it's an existing image (has an ID), allow replacement
              if (existingImages[index]?.id && onReplaceImage) {
                onReplaceImage(existingImages[index].id, index);
              }
            }}
            disabled={isImageLoading || isImageDeleting}
          >
            <Image 
              source={{ uri: images[index] }} 
              className={`w-full ${isLarge ? 'h-48' : 'h-24'} rounded-xl border-2 border-gray-300`}
              resizeMode="cover"
            />
            
            {/* Loading overlay for uploading */}
            {isImageLoading && (
              <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white text-xs mt-2 font-NunitoMedium">Uploading...</Text>
              </View>
            )}
            
            {/* Loading overlay for deleting */}
            {isImageDeleting && (
              <View className="absolute inset-0 bg-red-500/50 rounded-xl items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white text-xs mt-2 font-NunitoMedium">Deleting...</Text>
              </View>
            )}
            
            <TouchableOpacity 
              onPress={() => handleRemoveImage(index)}
              disabled={isImageLoading || isImageDeleting}
              className={`absolute ${isLarge ? 'top-2 right-2 w-6 h-6' : 'top-1 right-1 w-5 h-5'} bg-white rounded-full items-center justify-center shadow-sm ${isImageLoading || isImageDeleting ? 'opacity-50' : ''}`}
            >
              <XMarkIcon size={isLarge ? 16 : 12} color="#000" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => handleImageUpload(index)}
            className={`border-2 border-dashed border-primary-500 rounded-xl ${isLarge ? 'p-8' : 'p-4'} items-center justify-center ${isLarge ? 'h-48' : 'h-24'}`}
          >
            <View className={`${isLarge ? 'w-12 h-12' : 'w-8 h-8'} bg-red-100 rounded-full items-center justify-center ${isLarge ? 'mb-4' : 'mb-2'}`}>
              <CameraIcon size={isLarge ? 24 : 16} color="#D30309" />
            </View>
            {isLarge ? (
              <>
                <Text className="text-red-600 font-NunitoMedium mb-2">
                  {maxImages >= 999 ? 'Add Car Images' : 'Maximum of three Images'}
                </Text>
                <Text className="text-gray-500 text-sm">(Max. File size: 15 MB)</Text>
              </>
            ) : (
              <>
                <Text className="text-gray-500 text-xs text-center">
                  {maxImages >= 999 ? 'Add Image' : `Upload image ${index + 1}`}
                </Text>
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
        // Create slots for all images (existing + new) plus one empty slot for adding more
        const nonEmptyImages = images.filter(img => img);
        // Always show at least one empty slot for adding more images
        const totalSlots = Math.min(nonEmptyImages.length + 1, maxImages)
        const slots = Array.from({ length: totalSlots }, (_, index) => index)
        
        
        return (
          <View className="flex-row flex-wrap gap-2">
            {slots.map(index => (
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
      <View className="bg-white rounded-2xl py-4 mb-6 mt-4">
        {showTitle && (
          <Text className="text-lg font-NunitoBold text-gray-900 mb-4 px-4">{title}</Text>
        )}
        
        <View className="px-4">
          {renderLayout()}
        </View>
      </View>

      {/* Delete Image Drawer */}
      <DeleteImageDrawal
        visible={deleteDrawerVisible}
        onClose={handleCloseDrawer}
        onConfirm={handleConfirmDelete}
        imageUri={selectedImageForDelete?.imageUri}
        isLoading={selectedImageForDelete?.imageId ? deletingImages.has(selectedImageForDelete.imageId) : false}
      />

      {/* Image Source Picker Modal */}
      <ImageSourcePickerModal
        visible={sourcePickerVisible}
        onClose={() => setSourcePickerVisible(false)}
        onSelectCamera={() => handlePickSource('camera')}
        onSelectGallery={() => handlePickSource('gallery')}
        title="Upload Image"
        subtitle="Choose whether to take a new photo with your camera or select from your gallery."
      />
    </>
  )
}

export default ImageUploadSection
