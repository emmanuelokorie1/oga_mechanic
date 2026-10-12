import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'
import { router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureStorage } from '@/utils/secureStorage'
import ImageUploadSection from '@/components/ImageUploadSection'
import { sellerRoutes } from '@/constants/routes'
import CustomButton from '@/components/CustomButton'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import api from '@/lib/axios'
import { createFormDataFile } from '@/utils/imagePickerHelper'

const UploadCarImages = () => {
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading-details' | 'uploading-images' | 'complete'>('idle')
  
  const { formData, editMode, productId, productType } = useLocalSearchParams<{
    formData?: string;
    editMode?: string;
    productId?: string;
    productType?: string;
  }>();

  const isEditMode = editMode === 'true';
  const parsedFormData = formData ? JSON.parse(formData) : null;
  const type = productType || 'car'; // Default to 'car' for backward compatibility
  const isSparePart = type === 'spare-part';
  const isRental = type === 'rental-car';
  
  const { data: vehicleMakes } = useVehicleMakes();

  // Dynamic text based on product type
  const productLabel = isSparePart ? 'Spare Part' : (isRental ? 'Rental Car' : 'Car');
  const productLabelLower = isSparePart ? 'spare part' : (isRental ? 'rental car' : 'car');

  // Get make and model names for display
  const getMakeName = (makeId: number) => {
    if (!vehicleMakes) return `Make ID: ${makeId}`;
    const make = vehicleMakes.find((m: any) => m.id === makeId);
    return make ? make.name : `Make ID: ${makeId}`;
  };

  const getModelName = (modelId: number) => {
    if (!vehicleMakes) return `Model ID: ${modelId}`;
    for (const make of vehicleMakes) {
      if (make.models) {
        const model = make.models.find((m: any) => m.id === modelId);
        if (model) return model.name;
      }
    }
    return `Model ID: ${modelId}`;
  };

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages)
  }

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Images Required', `Please upload at least one image of your ${productLabelLower}.`)
      return
    }

    setIsSubmitting(true)
    setUploadStep('uploading-images')

    try {
      // The product details have already been created in the previous step
      // We now need to upload images using the product ID
      const currentProductId = productId || parsedFormData?.id
      
      if (!currentProductId) {
        throw new Error(`Product ID not found. Please try creating the ${productLabelLower} listing again.`)
      }

      // Prepare FormData for multipart image upload
      const formData = new FormData()
      
      // Add each local image URI to the form data as a file object
      images.forEach((imageUri, index) => {
        if (imageUri) {
          const file = createFormDataFile(imageUri, `image_${index}`);
          formData.append('images', file as any);
        }
      })

      console.log(`📤 [uploadCarImages] Uploading ${images.length} images to /products/products/${currentProductId}/images/upload/`);
      const response = await api.post(`/products/products/${currentProductId}/images/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.status === false) {
        throw new Error(response.data.message || 'Upload failed');
      }
      
      setUploadStep('complete')

      // Navigate to success page
      router.push({
        pathname: sellerRoutes.successfulPage as any,
        params: {
          title: `${productLabel} Uploaded Successfully!`,
          message: `Your ${parsedFormData?.data?.name?.toUpperCase()} has been uploaded successfully and is now available in your ${productLabelLower} catalog. Customers can now view and purchase this ${productLabelLower}.`,
          route: sellerRoutes.products
        }
      })
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload images. Please try again.')
    } finally {
      setIsSubmitting(false)
      setUploadStep('idle')
    }
  }

  const handleBack = () => {
    // Go back to the form page with the form data preserved for editing
    const backRoute = isSparePart 
      ? sellerRoutes.uploadSpareParts 
      : (isRental ? sellerRoutes.uploadCarToRent : sellerRoutes.uploadProducts);
    
    router.push({
      pathname: backRoute as any,
      params: {
        formData: formData,
        editMode: 'true',
        productId: productId,
        isEditing: 'true',
      }
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity 
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
          >
            <ArrowLeftIcon size={20} color="#374151" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-NunitoBold text-gray-900">
              {isEditMode ? `Edit ${productLabel} Images` : `Upload ${productLabel} Images`}
            </Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">
              {isEditMode ? `Update your ${productLabelLower} images` : 'Add images to complete your listing'}
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Progress Indicator */}
        <View className="flex-row items-center justify-center py-4 mb-4">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-2">
              <Text className="text-white font-NunitoBold text-sm">✓</Text>
            </View>
            <Text className="text-green-600 font-NunitoSemiBold text-sm mr-4">{productLabel} Details</Text>
            
            <View className="w-8 h-8 bg-primary-500 rounded-full items-center justify-center mr-2">
              <Text className="text-white font-NunitoBold text-sm">2</Text>
            </View>
            <Text className="text-primary-600 font-NunitoSemiBold text-sm">Images</Text>
          </View>
        </View>

        {/* Product Summary */}
        {parsedFormData && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-blue-500 rounded-lg items-center justify-center mr-3">
                <Text className="text-white font-NunitoBold text-sm">ℹ</Text>
              </View>
              <Text className="text-lg font-NunitoBold text-gray-900">{productLabel} Summary</Text>
            </View>
            <View className="bg-gray-50 rounded-xl p-4">
              <Text className="text-base font-NunitoSemiBold text-gray-900 mb-2">
                {parsedFormData?.data?.name}
              </Text>
              
              {/* Car-specific details */}
              {!isSparePart && parsedFormData?.data?.make && (
                <>
                  <Text className="text-sm text-gray-600 mb-1">
                    {getMakeName(parsedFormData?.data?.make)} {getModelName(parsedFormData?.data?.model)}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-1">
                    Year: {parsedFormData?.data?.year} • {parsedFormData?.data?.condition}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-1">
                    {parsedFormData?.data?.mileage} {parsedFormData?.data?.mileage_unit} • {parsedFormData?.data?.transmission}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-1">
                    {parsedFormData?.data?.fuel_type} • {parsedFormData?.data?.body_type}
                  </Text>
                </>
              )}
              
              {/* Common details */}
              <Text className="text-sm text-gray-600 mb-1">
                Condition: {parsedFormData?.data?.condition} • Stock: {parsedFormData?.data?.stock}
              </Text>
              <Text className="text-sm font-NunitoSemiBold text-green-600">
                Price: {parsedFormData?.data?.currency === 'NGN' ? '₦' : '$'}{parseFloat(parsedFormData?.data?.price || '0').toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Upload Image Section */}
        <View className="bg-white rounded-2xl mb-4 border border-gray-200">
          <View className="flex-row items-center p-4">
            <View className="w-8 h-8 bg-primary-500 rounded-lg items-center justify-center mr-3">
              <Text className="text-white font-NunitoBold text-sm">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-NunitoBold text-gray-900">{productLabel} Images</Text>
              <Text className="text-xs text-gray-500 font-NunitoMedium">
                Upload high-quality images (no limit)
              </Text>
            </View>
          </View>
          
          <ImageUploadSection
            images={images}
            onImagesChange={handleImagesChange}
            maxImages={999}
            layout="grid"
            title=""
            showTitle={false}
          />
          
          <View className="mt-4 p-3 bg-blue-50 rounded-lg">
            <Text className="text-xs text-blue-800 font-NunitoMedium">
              💡 <Text className="font-NunitoSemiBold">Tips for better images:</Text>
            </Text>
            <Text className="text-xs text-blue-700 mt-1">
              {isSparePart ? (
                <>• Use good lighting and clear shots{'\n'}
                • Show the part from multiple angles{'\n'}
                • Include packaging and brand labels if available{'\n'}
                • Add close-up shots of key features{'\n'}
                • Ensure images are well-focused and high quality</>
              ) : (
                <>• Use good lighting and clear shots{'\n'}
                • Include exterior views from different angles{'\n'}
                • Show interior, engine, and key features{'\n'}
                • Add close-up shots of any damage or special features{'\n'}
                • Ensure images are well-focused and high quality</>
              )}
            </Text>
          </View>
        </View>

        {/* Upload Progress Indicator */}
        {isSubmitting && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
            <Text className="text-base font-NunitoSemiBold text-gray-900 mb-3 text-center">
              Upload Progress
            </Text>
            <View className="flex-row items-center justify-center mb-3">
              <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${
                uploadStep === 'uploading-details' || uploadStep === 'uploading-images' || uploadStep === 'complete'
                  ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {uploadStep === 'uploading-details' || uploadStep === 'uploading-images' || uploadStep === 'complete' ? (
                  <Text className="text-white text-xs font-NunitoBold">✓</Text>
                ) : (
                  <Text className="text-white text-xs font-NunitoBold">1</Text>
                )}
              </View>
              <Text className={`text-sm font-NunitoMedium ${
                uploadStep === 'uploading-details' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                Creating {productLabel} Listing
              </Text>
              
              <View className={`w-6 h-6 rounded-full items-center justify-center ml-4 mr-2 ${
                uploadStep === 'uploading-images' || uploadStep === 'complete'
                  ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {uploadStep === 'uploading-images' || uploadStep === 'complete' ? (
                  <Text className="text-white text-xs font-NunitoBold">✓</Text>
                ) : (
                  <Text className="text-white text-xs font-NunitoBold">2</Text>
                )}
              </View>
              <Text className={`text-sm font-NunitoMedium ${
                uploadStep === 'uploading-images' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                Uploading Images
              </Text>
            </View>
          </View>
        )}

        {/* Upload Button */}
        <View className="bg-white rounded-2xl p-5 mb-8 border border-gray-200">

          <CustomButton
            title={uploadStep === 'uploading-details' ? `Creating ${productLabel} Listing...` :
              uploadStep === 'uploading-images' ? 'Uploading Images...' :
              isSubmitting ? 'Uploading...' :
              isEditMode ? `Update ${productLabel}` : `Upload ${productLabel}`}
            onPress={() => handleSubmit()}
            disabled={images.length === 0 || isSubmitting}
            loading={isSubmitting}
            loadingText="Uploading"
            className="mt-3"
          />
          
          <Text className="text-xs text-gray-500 text-center font-NunitoMedium mt-3">
            {isEditMode 
              ? `Your ${productLabelLower} will be updated in the catalog with new images` 
              : `Your ${productLabelLower} will be added to your catalog and available for customers to view`
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default UploadCarImages
