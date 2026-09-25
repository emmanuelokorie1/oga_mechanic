import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'
import { router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ImageUploadSection from '@/components/ImageUploadSection'
import { sellerRoutes } from '@/constants/routes'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useProductImages } from '@/hooks/useProductImages'
import CustomAlert from '@/components/CustomAlert'
import { useCustomAlert } from '@/hooks/useCustomAlert'
import { useActiveRoleProfile } from '@/hooks/useUserProfile'

// Dedicated edit image page for updating existing product images
// This page handles image updates with PATCH and individual image deletion
const EditImage = () => {
  const [images, setImages] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<any[]>([])
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [deletingImages, setDeletingImages] = useState<Set<number>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const { productId, productData: productDataParam, productType } = useLocalSearchParams<{
    productId?: string;
    productData?: string;
    productType?: string;
  }>();

  const parsedProductData = React.useMemo(() => {
    if (!productDataParam) return null;
    try {
      return JSON.parse(productDataParam);
    } catch (e) {
      console.error("Failed to parse productDataParam", e);
      return null;
    }
  }, [productDataParam]);
  const isRental = productType === 'rental-car';
  
  // Initialize custom alert hook
  const { visible, alertConfig, hideAlert, showSuccess, showError } = useCustomAlert();
  
  // Fetch user profile based on active role to get merchant ID
  const { data: profileData, activeRole } = useActiveRoleProfile();
  
  // Extract merchant ID safely from different profile structures
  const merchantId = activeRole === 'merchant' 
    ? (profileData?.data as any)?.user?.id || (profileData?.data as any)?.user_id
    : (profileData?.data as any)?.user_id;

  // Get make and model names for display
  const getMakeName = (makeId: any) => {
    if (!makeId) return '';
    if (typeof makeId === 'string' && isNaN(Number(makeId))) return makeId;
    const makeNames: { [key: number]: string } = {
      1: 'Toyota', 2: 'Honda', 3: 'Ford', 4: 'Nissan', 5: 'Chevrolet',
      6: 'Hyundai', 7: 'Kia', 8: 'Mazda', 9: 'Subaru', 10: 'Volkswagen',
      11: 'BMW', 12: 'Mercedes-Benz', 13: 'Audi', 14: 'Lexus', 15: 'Infiniti',
      16: 'Acura', 17: 'Volvo', 18: 'Jaguar', 19: 'Land Rover', 20: 'Porsche',
      21: 'Mitsubishi', 22: 'Suzuki', 23: 'Isuzu', 24: 'Peugeot', 25: 'Renault'
    };
    return makeNames[Number(makeId)] || `Make: ${makeId}`;
  };

  const getModelName = (modelId: any) => {
    if (!modelId) return '';
    if (typeof modelId === 'string' && isNaN(Number(modelId))) return modelId;
    const modelNames: { [key: number]: string } = {
      26: 'Civic',
    };
    return modelNames[Number(modelId)] || (typeof modelId === 'string' ? modelId : `Model: ${modelId}`);
  };

  // Use custom hook for all product image operations
  const {
    productData: fetchedProductData,
    isLoading,
    error,
    refetch,
    uploadImage,
    deleteImage: deleteImageMutation,
    replaceImage: replaceImageMutation,
  } = useProductImages({ 
    productId: productId || '',
    merchantId: merchantId 
  });

  const isSparePart = productType === 'spare-part' || parsedProductData?.category_id === 24 || fetchedProductData?.category_id === 24;
  const productLabel = isSparePart ? 'Spare Part' : (isRental ? 'Rental Car' : 'Car');
  const productLabelLower = isSparePart ? 'spare part' : (isRental ? 'rental car' : 'car');

  // Update images state when fetchedProductData changes
  useEffect(() => {
    if (fetchedProductData?.images && fetchedProductData.images.length > 0) {
      const imageUrls = fetchedProductData.images.map((img: any) => img.image || img.image_url || img.url);
      setImages(imageUrls);
      setExistingImages(fetchedProductData.images);
    } else if (fetchedProductData && (!fetchedProductData.images || fetchedProductData.images.length === 0)) {
      setImages([]);
      setExistingImages([]);
    }
  }, [fetchedProductData]);

  // Load existing images when component mounts
  useEffect(() => {
    if (parsedProductData?.images && parsedProductData.images.length > 0) {
      const imageUrls = parsedProductData.images.map((img: any) => img.image || img.image_url || img.url);
      setImages(imageUrls);
      setExistingImages(parsedProductData.images);
    }
  }, [parsedProductData]);

  const handleImagesChange = async (newImages: string[]) => {
    // Find newly added images (not in existing images)
    const newImageUris = newImages.filter((imageUri) => {
      return !existingImages.some(existing => existing.image === imageUri) && 
             !images.includes(imageUri) && 
             imageUri
    })

    // Update the images state first
    setImages(newImages)
    
    // Upload each new image immediately using mutation
    if (newImageUris.length > 0) {
      setIsUploading(true);
      
      let successfulUploads = 0;
      const failedImageUris: string[] = [];
      
      try {
        for (const imageUri of newImageUris) {
          // Add to loading state
          setLoadingImages(prev => new Set(prev).add(imageUri));
          
          try {
            await uploadImage(imageUri);
            successfulUploads++;
          } catch (error) {
            // Track failed images
            failedImageUris.push(imageUri);
          } finally {
            // Remove from loading state
            setLoadingImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(imageUri);
              return newSet;
            });
          }
        }
        
        // Remove failed images from the state
        if (failedImageUris.length > 0) {
          setImages(prevImages => prevImages.filter(img => !failedImageUris.includes(img)));
          
          // Show error message for failed uploads
          showError(
            'Upload Failed',
            `${failedImageUris.length} image(s) failed to upload and have been removed. Please try again.`
          );
        }
        
        // Wait for refetch to complete before clearing loading state
        await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for refetch to complete
        
      } finally {
        // Clear the overall uploading state when all uploads are done
        setIsUploading(false);
        
        // Show success message
        if (successfulUploads > 0 && failedImageUris.length === 0) {
          showSuccess(
            'Upload Successful',
            `${successfulUploads} image(s) uploaded successfully!`
          );
        }
      }
    }
  }

  const handleReplaceImage = async (imageId: number, imageIndex: number) => {
    try {
      // Launch image picker for replacement
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const newImageUri = result.assets[0].uri;
        
        // Add to loading state
        setLoadingImages(prev => new Set(prev).add(newImageUri));
        
        try {
          await replaceImageMutation({ imageId, imageIndex, newImageUri });
          // Show success message
          showSuccess(
            'Image Replaced',
            `Your ${productLabelLower} image has been updated successfully!`
          );
        } catch (error) {
          // Show error alert if replacement fails
          showError(
            'Replace Failed',
            'Failed to replace the image. Please try again.'
          );
        } finally{
          // Remove from loading state
          setLoadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(newImageUri);
            return newSet;
          });
        }
      }
    } catch (error) {
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    // Add to deleting state
    setDeletingImages(prev => new Set(prev).add(imageId));
    
    try {
      await deleteImageMutation(imageId);
      // Show success message
      showSuccess(
        'Image Deleted',
        `Your ${productLabelLower} image has been removed successfully!`
      );
    } catch (error) {
      // Show error message
      showError(
        'Delete Failed',
        'Failed to delete the image. Please try again.'
      );
    } finally {
      // Remove from deleting state
      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleSubmit = () => {
    if (images.length === 0) {
      showError('Images Required', `Please upload at least one image of your ${productLabelLower}.`)
      return
    }

    // Navigate to success page without calling any endpoint
    // Images are already uploaded automatically when added
    router.push({
      pathname: sellerRoutes.successfulPage as any,
      params: {
        title: `${productLabel} Images Updated Successfully!`,
        message: `Your ${parsedProductData?.name || 'vehicle'} images have been updated successfully and are now available in your listing.`,
        route: sellerRoutes.products
      }
    })
  }

  const handleBack = () => {
    router.back();
  }

  // Pull-to-refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Show loading spinner when uploading images
  if (isUploading) {
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
                Edit {productLabel} Images
              </Text>
              <Text className="text-xs text-gray-500 font-NunitoMedium">
                Update your {productLabelLower} images
              </Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        <LoadingSpinner 
          message="Uploading Images..."
          subMessage="Please wait while we upload your new images"
          size="medium"
        />
      </SafeAreaView>
    );
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
              Edit {productLabel} Images
            </Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">
              Update your {productLabelLower} images
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D30309"
            colors={['#D30309']}
            title="Pull to refresh images"
            titleColor="#6B7280"
          />
        }
      >
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
            <Text className="text-primary-500 font-NunitoSemiBold text-sm">Images</Text>
          </View>
        </View>

        {/* Car Summary */}
        {parsedProductData && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-blue-500 rounded-lg items-center justify-center mr-3">
                <Text className="text-white font-NunitoBold text-sm">ℹ</Text>
              </View>
              <Text className="text-lg font-NunitoBold text-gray-900">{productLabel} Summary</Text>
            </View>
            <View className="bg-gray-50 rounded-xl p-4">
              <Text className="text-base font-NunitoSemiBold text-gray-900 mb-2">
                {parsedProductData?.name} {parsedProductData?.make && parsedProductData?.model ? `- ${getMakeName(parsedProductData.make)} ${getModelName(parsedProductData.model)}` : ''}
              </Text>
              <Text className="text-sm text-gray-600 mb-1">
                Year: {parsedProductData?.year || 'N/A'} • {parsedProductData?.condition || 'New'}
              </Text>
              {parsedProductData?.mileage !== undefined && (
                <Text className="text-sm text-gray-600 mb-1">
                  {parsedProductData?.mileage?.toLocaleString()} {parsedProductData?.mileage_unit} • {parsedProductData?.transmission}
                </Text>
              )}
              <Text className="text-sm text-gray-600 mb-1">
                {parsedProductData?.fuel_type} • {parsedProductData?.body_type || 'Spare Part'}
              </Text>
              <Text className="text-sm font-NunitoSemiBold text-green-600">
                Price: {parsedProductData?.currency === 'NGN' ? '₦' : '$'}{parseFloat(parsedProductData?.price || '0').toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Edit Image Section */}
        <View className="bg-white rounded-2xl mb-4 border border-gray-200">
          <View className="flex-row items-center p-4">
            <View className="w-8 h-8 bg-primary-500 rounded-lg items-center justify-center mr-3">
              <Text className="text-white font-NunitoBold text-sm">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-NunitoBold text-gray-900">{productLabel} Images</Text>
              <Text className="text-xs text-gray-500 font-NunitoMedium">
                Edit your {productLabelLower} images (tap to delete existing images)
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
            existingImages={existingImages}
            onDeleteImage={handleDeleteImage}
            onReplaceImage={handleReplaceImage}
            loadingImages={loadingImages}
            deletingImages={deletingImages}
          />
          
          <View className="mt-4 p-3 bg-blue-50 rounded-lg">
            <Text className="text-xs text-blue-800 font-NunitoMedium">
              💡 <Text className="font-NunitoSemiBold">Tips for editing images:</Text>
            </Text>
            <Text className="text-xs text-blue-700 mt-1">
              • Tap on existing images to delete them{'\n'}
              • Add new images by tapping the + button{'\n'}
              • Use good lighting and clear shots{'\n'}
              • Include exterior views from different angles{'\n'}
              • Show interior, engine, and key features
            </Text>
          </View>
        </View>


        {/* Update Button */}
        <View className="bg-white rounded-2xl p-5 mb-8 border border-gray-200">
          <TouchableOpacity 
            onPress={() => handleSubmit()}
            disabled={images.length === 0}
            className={`rounded-xl py-4 ${images.length === 0 ? 'bg-gray-400' : 'bg-primary-500'}`}
          >
            <Text className="text-white text-center text-lg font-NunitoBold">
              Done
            </Text>
          </TouchableOpacity>
          
          <Text className="text-xs text-gray-500 text-center font-NunitoMedium mt-3">
            Images are uploaded automatically when added
          </Text>
    </View>
      </ScrollView>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={hideAlert}
          autoDismiss={alertConfig.autoDismiss}
          autoDismissDelay={alertConfig.autoDismissDelay}
        />
      )}
    </SafeAreaView>
  )
}

export default EditImage
