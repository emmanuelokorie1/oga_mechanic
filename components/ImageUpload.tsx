import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, Pressable, Alert, ActivityIndicator } from 'react-native'
import { CameraIcon, PencilIcon, PhotoIcon, XMarkIcon } from 'react-native-heroicons/outline'
import * as ImagePicker from 'expo-image-picker'
import * as Device from 'expo-device'
import { images } from '@/constants'
import AndroidNavBarSpacer from './AndroidNavBarSpacer'

export interface ImageUploadFile {
  uri: string
  name: string
  type: string
  size?: number
}

export interface ImageUploadProps {
  label: string
  isUploaded: boolean
  onPress?: (source?: 'camera' | 'gallery') => void
  onImageSelect?: (uri: string, file: ImageUploadFile) => void
  onPressCamera?: () => void
  onPressGallery?: () => void
  uploadedText?: string
  maxFileSize?: string
  required?: boolean
  imageUri?: string
  carSide?: 'front' | 'back' | 'right' | 'left'
  aspect?: [number, number]
  quality?: number
  allowsEditing?: boolean
  disabled?: boolean
  allowCamera?: boolean
  allowGallery?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  isUploaded,
  onPress,
  onImageSelect,
  onPressCamera,
  onPressGallery,
  uploadedText = "Uploaded",
  maxFileSize = "15 MB",
  required = false,
  imageUri,
  carSide,
  aspect = [4, 3],
  quality = 0.8,
  allowsEditing = true,
  disabled = false,
  allowCamera = true,
  allowGallery = true,
}) => {
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Get the appropriate car placeholder image based on carSide
  const getCarPlaceholder = () => {
    if (!carSide) return null

    const carImages = {
      front: images.carFront,
      back: images.carBack,
      right: images.carRight,
      left: images.carLeft
    }

    return (
      <Image 
        source={carImages[carSide]} 
        className="w-full h-32 rounded-lg"
        resizeMode="cover"
      />
    )
  }

  const handleSourceSelect = async (source: 'camera' | 'gallery') => {
    setShowSourceModal(false)

    if (source === 'camera' && onPressCamera) {
      onPressCamera()
      return
    }

    if (source === 'gallery' && onPressGallery) {
      onPressGallery()
      return
    }

    // If caller provided onImageSelect, handle picking and permissions internally
    if (onImageSelect) {
      try {
        setIsLoading(true)
        let result: ImagePicker.ImagePickerResult

        if (source === 'camera') {
          if (!Device.isDevice) {
            Alert.alert(
              'Simulator Notice',
              'Camera hardware is not available on the iOS Simulator. Opening photo gallery instead.'
            );
            handleSourceSelect('gallery');
            return;
          }

          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions to take photos.')
            setIsLoading(false)
            return
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
          })
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant photo library permissions to upload images.')
            setIsLoading(false)
            return
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
          })
        }

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0]
          const file: ImageUploadFile = {
            uri: asset.uri,
            name: asset.fileName || `${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            size: asset.fileSize || 0,
          }
          onImageSelect(asset.uri, file)
        }
      } catch (error) {
        console.error('Error selecting image:', error)
        Alert.alert('Error', 'Failed to select image. Please try again.')
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Call onPress with chosen source
    if (onPress) {
      onPress(source)
    }
  }

  const handleMainPress = () => {
    if (disabled) return

    if (allowCamera && allowGallery) {
      setShowSourceModal(true)
    } else if (allowCamera) {
      handleSourceSelect('camera')
    } else {
      handleSourceSelect('gallery')
    }
  }

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-3">
        {label} {required && <Text className="text-red-500 text-lg">*</Text>}
      </Text>

      {imageUri && isUploaded ? (
        // Uploaded Preview State
        <TouchableOpacity
          onPress={handleMainPress}
          disabled={disabled}
          activeOpacity={0.7}
          className="border-2 border-dashed border-gray-300 rounded-xl p-4 items-center justify-center bg-gray-50 active:bg-gray-100"
        >
          <View className="items-center">
            <View className="relative mb-2">
              <Image 
                source={{ uri: imageUri }} 
                className="w-24 h-24 rounded-lg"
                resizeMode="cover"
              />
              <View className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full items-center justify-center shadow-sm">
                <PencilIcon size={12} color="white" />
              </View>
            </View>
            <Text className="text-green-600 font-medium">{uploadedText}</Text>
            <Text className="text-gray-500 text-xs mt-1">Tap to change</Text>
          </View>
        </TouchableOpacity>
      ) : (
        // Empty / Upload Placeholder State
        <TouchableOpacity
          onPress={handleMainPress}
          disabled={disabled}
          activeOpacity={0.7}
          className="border-2 border-dashed border-gray-300 rounded-xl p-4 items-center justify-center bg-gray-50 active:bg-gray-100"
        >
          <View className="items-center w-full">
            {carSide ? (
              getCarPlaceholder()
            ) : (
              // Default clean placeholder
              <View className="w-16 h-16 bg-primary-500/20 rounded-full items-center justify-center mb-2">
                <CameraIcon size={24} color="#EF4444" />
                <Text className="text-white text-lg absolute bottom-0 right-0 bg-primary-500 py-0 px-2 rounded-full">+</Text>
              </View>
            )}
            <Text className="text-gray-600 text-sm mt-2 text-center font-NunitoSemiBold">
              {carSide ? `Tap to upload ${label}` : `Click to Upload ${label}`}
            </Text>
            {!carSide && (
              <Text className="text-gray-500 text-xs mt-1">(Max. File size: {maxFileSize})</Text>
            )}

            {isLoading && (
              <View className="mt-2">
                <ActivityIndicator color="#D30309" size="small" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet Modal for Source Selection */}
      <Modal
        visible={showSourceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSourceModal(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowSourceModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6" onPress={(e) => e.stopPropagation?.()}>
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-5" />

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-NunitoBold text-gray-900">
                Upload {label}
              </Text>
              <TouchableOpacity
                onPress={() => setShowSourceModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <XMarkIcon size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-sm mb-5">
              Choose whether to take a new photo using your camera or select an existing one from your gallery.
            </Text>

            <View className="space-y-3">
              {allowCamera && (
                <TouchableOpacity
                  onPress={() => handleSourceSelect('camera')}
                  className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
                >
                  <View className="w-12 h-12 bg-red-100 rounded-2xl items-center justify-center mr-4">
                    <CameraIcon size={24} color="#D30309" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-NunitoBold text-gray-900">Take Photo</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">Use camera to capture a new photo</Text>
                  </View>
                </TouchableOpacity>
              )}

              {allowGallery && (
                <TouchableOpacity
                  onPress={() => handleSourceSelect('gallery')}
                  className="flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100 mt-3"
                >
                  <View className="w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center mr-4">
                    <PhotoIcon size={24} color="#0A6DEE" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-NunitoBold text-gray-900">Choose from Gallery</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">Select image from photo library</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowSourceModal(false)}
                className="mt-4 py-3 rounded-xl items-center bg-gray-100 active:bg-gray-200"
              >
                <Text className="text-gray-700 font-NunitoBold text-sm">Cancel</Text>
              </TouchableOpacity>

              <AndroidNavBarSpacer />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

export default ImageUpload
