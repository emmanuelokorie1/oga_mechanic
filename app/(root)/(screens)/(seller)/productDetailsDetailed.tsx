import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, Animated, ActivityIndicator, Platform, Modal, FlatList, GestureResponderEvent } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeftIcon, DocumentTextIcon, ChevronRightIcon, ExclamationTriangleIcon } from 'react-native-heroicons/outline'
import { icons } from '@/constants'
import { router, useLocalSearchParams } from 'expo-router'
import { NairaCurrency } from '@/utils/useCurrencyFormatter'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import { sellerRoutes } from '@/constants/routes'
import { productsAPI } from '@/lib/api/products'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import { useProductBids } from '@/hooks/useProducts'
import { formatDistanceToNow } from 'date-fns'
import CustomButton from '@/components/CustomButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useUpdateBid } from '@/hooks/useProducts'
import MerchantBidActionModal from '@/components/modals/MerchantBidActionModal'

const { width: screenWidth } = Dimensions.get("window");

const ProductDetailsDetailed = () => {
  const { productType, productId } = useLocalSearchParams<{
    productType: 'sparePart' | 'car';
    productId: string;
  }>();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [imageCache, setImageCache] = useState<Map<number, any>>(new Map());
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [showBidActionModal, setShowBidActionModal] = useState(false);

  // Fetch bids if auction is active
  const { data: bidsData } = useProductBids(productData?.bidding_window?.id || '');
  const bids = bidsData?.data || [];
  
  // Fetch vehicle makes for name lookup
  const { data: vehicleMakes } = useVehicleMakes();

  // Bid update mutation
  const updateBidMutation = useUpdateBid(productData?.bidding_window?.id || '');

  const handleBidClick = (bid: any) => {
    setSelectedBid(bid);
    setShowBidActionModal(true);
  };

  const handleBidStatusUpdate = async (status: 'accepted' | 'rejected') => {
    if (!selectedBid) return;
    
    return updateBidMutation.mutateAsync({
      bidId: selectedBid.id,
      payload: { status }
    });
  };
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Fetch product details from API
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await productsAPI.getProductById(productId);
        setProductData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId]);

  // Animation effects - only start when data is loaded
  useEffect(() => {
    if (productData && !loading) {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    }
  }, [productData, loading]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const handleImageLoad = (index: number) => {
    setImageLoadingStates(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setLoadedImages(prev => new Set(prev).add(index));
    
    // Store in cache for ultra-fast future access
    if (productData?.images?.[index]) {
      setImageCache(prev => new Map(prev).set(index, productData.images[index]));
    }
  };

  const handleImageLoadStart = (index: number) => {
    // Only show skeleton loading if image hasn't been preloaded
    if (!loadedImages.has(index)) {
      setImageLoadingStates(prev => new Set(prev).add(index));
    }
  };

  const handleImageChange = (index: number) => {
    // Clear any previous loading states for this image
    setImageLoadingStates(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    // Clear any previous error states for this image
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setSelectedImageIndex(index);
  };

  // Shimmer animation for skeleton loading
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    
    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  // Background preloading for all images
  useEffect(() => {
    if (productData?.images) {
      // Preload all images in parallel
      productData.images.forEach((imageItem: any, index: number) => {
        if (imageItem.image) {
          Image.prefetch(imageItem.image)
            .then(() => {
              setLoadedImages(prev => new Set(prev).add(index));
            })
            .catch(() => setImageErrors(prev => new Set(prev).add(index)));
        }
      });
    }
  }, [productData]);

  // Skeleton Loading Component
  const SkeletonLoader = () => (
    <View className="absolute inset-0 bg-gray-200">
      <Animated.View
        className="w-full h-full bg-gray-200 relative overflow-hidden"
        style={{
          opacity: shimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.7],
          }),
        }}
      >
        <View className="w-full h-full bg-gray-300" />
        <View className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <View className="w-20 h-20 bg-gray-400 rounded-full" />
        </View>
      </Animated.View>
    </View>
  );

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={i} className="text-yellow-400 text-lg">★</Text>)
    }
    
    if (hasHalfStar) {
      stars.push(<Text key="half" className="text-yellow-400 text-lg">★</Text>)
    }
    
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Text key={`empty-${i}`} className="text-gray-300 text-lg">★</Text>)
    }
    
    return stars
  }

  // Helper functions to get make and model names
  const getMakeName = (makeId: number) => {
    if (!vehicleMakes || !makeId) return 'N/A';
    const make = vehicleMakes.find(m => m.id === makeId);
    return make?.name || 'N/A';
  };

  const getModelName = (makeId: number, modelId: number) => {
    if (!vehicleMakes || !makeId || !modelId) return 'N/A';
    const make = vehicleMakes.find(m => m.id === makeId);
    const model = make?.models?.find(m => m.id === modelId);
    return model?.name || 'N/A';
  };

  const handleEdit = () => {
    if (!productData) return;
    
    if (productData.is_rental) {
      router.push({
        pathname: sellerRoutes.editCarToRent,
        params: {
          productId: productData.id,
          productData: JSON.stringify(productData)
        }
      });
    } else if (!productData.category?.name?.toLowerCase().includes('car')) {
      // Navigate to spare part edit page
      router.push({
        pathname: sellerRoutes.editSparePart,
        params: {
          productId: productData.id,
          productData: JSON.stringify(productData)
        }
      });
    } else {
      // Navigate to car edit page
      router.push({
        pathname: sellerRoutes.editProduct,
        params: {
          productId: productData.id,
          productData: JSON.stringify(productData)
        }
      });
    }
  };

  const handleDelete = () => {
    setShowDeleteDrawer(true);
  };

  const handleConfirmDelete = async () => {
    if (!productId) return;
    
    setIsDeleting(true);
    try {
      // Call the DELETE endpoint
      await productsAPI.deleteProduct(productId);
      
      // Close drawer and navigate back
      setShowDeleteDrawer(false);
      router.back();
      
      // Show success message or handle success
    } catch (error) {
      // Handle error - maybe show an alert
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDrawer(false);
  };


  const handleViewOrders = () => {
    // Navigate to orders page
    router.push('/(root)/(tabs)/(sellers)/orders' as any);
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center justify-between bg-white px-6 py-5 shadow-sm">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-lg font-NunitoBold text-gray-900">Product Details</Text>
          </View>
          <View className="w-6" />
        </View>

        {/* Loading Content */}
        <LoadingSpinner 
          message="Loading product details..."
          subMessage="Please wait while we fetch the information"
          size="medium"
          logoSize={32}
        />
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center justify-between bg-white px-6 py-5 shadow-sm">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-lg font-NunitoBold text-gray-900">Product Details</Text>
          </View>
          <View className="w-6" />
        </View>

        {/* Error Content */}
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-red-50 rounded-3xl p-8 items-center">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Text className="text-red-500 text-2xl">⚠️</Text>
            </View>
            <Text className="text-red-700 font-NunitoBold text-lg mb-2">Error Loading Product</Text>
            <Text className="text-red-600 text-center mb-4">{error}</Text>
            <TouchableOpacity 
              onPress={() => {
                setError(null);
                setLoading(true);
                // Retry fetch
                const fetchProductDetails = async () => {
                  if (!productId) return;
                  
                  try {
                    const response = await productsAPI.getProductById(productId);
                    setProductData(response.data);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch Product details');
                  } finally {
                    setLoading(false);
                  }
                };
                fetchProductDetails();
              }}
              className="bg-red-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-NunitoMedium">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show content if no product data
  if (!productData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center justify-between bg-white px-6 py-5 shadow-sm">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-lg font-NunitoBold text-gray-900">Product Details</Text>
          </View>
          <View className="w-6" />
        </View>

        {/* No Data Content */}
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-white rounded-3xl p-8 items-center">
            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-6">
              <icons.empty width={40} height={40} />
            </View>
            <Text className="text-gray-700 font-NunitoBold text-lg mb-2">Product Not Found</Text>
            <Text className="text-gray-500 text-center mb-6">
              The product you're looking for doesn't exist or has been removed.
            </Text>
            <TouchableOpacity 
              onPress={() => router.back()}
              className="bg-primary-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-NunitoMedium">Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <Animated.View 
        style={{ 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
        className="flex-row items-center justify-between bg-white px-6 py-5 shadow-sm"
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-lg font-NunitoBold text-gray-900">
            {!productData.category?.name?.toLowerCase().includes('car') ? 'Spare Part Details' : 'Car Details'}
          </Text>
        </View>
        <View className="w-6" />
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Product Showcase */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }}
          className="relative"
        >

          {/* Main Hero Image - Swipeable */}
          <View className="relative">
            <View 
              className="w-full bg-gray-100 overflow-hidden"
              style={{ height: screenWidth * 0.8 }}
            >
              {productData.images && productData.images.length > 0 && !imageErrors.has(selectedImageIndex) ? (
                <View className="w-full h-full relative">
                  <TouchableOpacity 
                    activeOpacity={1}
                    onPress={() => {
                      // Cycle through images on tap
                      if (productData.images.length > 1) {
                        const nextIndex = (selectedImageIndex + 1) % productData.images.length;
                        handleImageChange(nextIndex);
                      }
                    }}
                    className="w-full h-full"
                  >
                    <Image
                      key={`main-image-${selectedImageIndex}-${productData.images[selectedImageIndex].id}`}
                      source={{ 
                        uri: productData.images[selectedImageIndex].image,
                        cache: 'force-cache'
                      }}
                      className="w-full h-full"
                      style={{ resizeMode: 'cover' }}
                      onError={() => handleImageError(selectedImageIndex)}
                      onLoadStart={() => handleImageLoadStart(selectedImageIndex)}
                      onLoad={() => handleImageLoad(selectedImageIndex)}
                      fadeDuration={loadedImages.has(selectedImageIndex) ? 0 : 50}
                    />
                  </TouchableOpacity>
                  {imageLoadingStates.has(selectedImageIndex) && <SkeletonLoader />}
                </View>
              ) : (
                <View className="w-full h-full items-center justify-center bg-gray-50">
                  <icons.empty width={200} height={200} />
                  <Text className="text-sm text-gray-500 mt-2">No Image Available</Text>
                </View>
              )}
            </View>

            {/* Image Navigation Dots - Scrollable */}
            {productData.images && productData.images.length > 1 && (
              <View className="absolute bottom-6 left-0 right-0">
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ 
                    alignItems: 'center',
                    paddingHorizontal: 20
                  }}
                  className="flex-row"
                >
                  {productData.images.map((_: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleImageChange(index)}
                      className={`w-3 h-3 rounded-full relative mx-1 ${index === selectedImageIndex ? 'bg-primary-500' : 'bg-white/70'
                      }`}
                      style={{ 
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 3
                      }}
                    >
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Thumbnail Images */}
          {productData.images && productData.images.length > 1 && (
            <View className="flex-row justify-center mt-3 space-x-2 px-4">
              {productData.images.map((imageItem: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleImageChange(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden ${selectedImageIndex === index ? 'border-2 border-primary-500' : 'border border-gray-300'
                  }`}
                  style={{
                    shadowColor: selectedImageIndex === index ? '#3B82F6' : '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: selectedImageIndex === index ? 0.3 : 0.1,
                    shadowRadius: 2,
                    elevation: selectedImageIndex === index ? 3 : 1
                  }}
                >
                  <Image 
                    key={`thumb-image-${index}-${imageItem.id}`}
                    source={{ 
                      uri: imageItem.image,
                      cache: 'force-cache'
                    }} 
                    className="w-full h-full"
                    style={{ resizeMode: 'cover' }}
                    onError={() => handleImageError(index)}
                    fadeDuration={0}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Spacing after main image */}
          <View className="h-4" />
        </Animated.View>

        {/* Premium Product Information */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: -8 }, 
            shadowOpacity: 0.15, 
            shadowRadius: 24, 
            elevation: 2 
          }}
          className="bg-white mx-4 rounded-2xl relative z-10 shadow-2xl mb-4"
        >
          <View className="p-6">
            {/* Product Title */}
            <Text className="text-xl font-NunitoExtraBold text-gray-900 mb-2 leading-8">
              {productData.name}
            </Text>

            {/* Price and Stock Status */}
            <View className="flex-row items-center justify-between my-4">
              <NairaCurrency
                value={parseFloat(productData.price)}
                className="text-3xl font-NunitoExtraBold text-primary-500"
              />
              <View className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-sm text-green-700 font-NunitoBold">
                  {productData.stock > 0 ? "In Stock" : "Out of Stock"}
                </Text>
              </View>
            </View>

            {/* Key Features - Show important ones only */}
            <View className="flex-row flex-wrap gap-2 mb-6">
              {productData.condition && (
                <View className="bg-blue-100 px-3 py-1.5 rounded-full">
                  <Text className="text-xs font-NunitoMedium text-blue-700 capitalize">{productData.condition}</Text>
              </View>
              )}
              {productData.negotiable && (
                <View className="bg-green-100 px-3 py-1.5 rounded-full">
                  <Text className="text-xs font-NunitoMedium text-green-700">Negotiable</Text>
              </View>
              )}
              {productData.stock > 0 && (
                <View className="bg-emerald-100 px-3 py-1.5 rounded-full">
                  <Text className="text-xs font-NunitoMedium text-emerald-700">In Stock</Text>
              </View>
              )}
            </View>

            {/* Product Analytics - Important metrics only */}
            <View className="flex-row items-center justify-between py-3 border-t border-gray-100">
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Views:</Text>
                <Text className="text-sm font-NunitoBold text-gray-900 ml-2">{productData.views || 0}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Sold:</Text>
                <Text className="text-sm font-NunitoBold text-gray-900 ml-2">{productData.purchased_count || 0}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Rating:</Text>
                <Text className="text-sm font-NunitoBold text-gray-900 ml-2">{productData.rating || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="mx-4 mb-4"
        >
          <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
            style={{ 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.05, 
              shadowRadius: 10, 
              elevation: 5 
            }}>
            <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
              Description
            </Text>
            <Text className="text-base text-gray-700 leading-7">
              {productData.description}
            </Text>
          </View>
        </Animated.View>

        {/* Important Product Details */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="mx-4 mb-4"
        >
          <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
            style={{ 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.05, 
              shadowRadius: 10, 
              elevation: 5 
            }}>
            <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
              Product Information
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Category</Text>
                <Text className="text-sm font-NunitoBold text-primary-600">{productData.category?.name || 'N/A'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Condition</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.condition || 'N/A'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Stock Available</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.stock || 0} units</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Delivery</Text>
                <Text className="text-sm font-NunitoBold text-gray-900 capitalize">{productData.delivery_option || 'N/A'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Listed Date</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">
                  {productData.created_at ? new Date(productData.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'N/A'}
              </Text>
            </View>
            </View>
          </View>
        </Animated.View>

        {/* Car-Specific Details */}
        {!productData.category?.name?.toLowerCase().includes('car') ? null : (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
            className="mx-4 mb-4"
          >
            <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 5
              }}>
              <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
                Vehicle Specifications
                  </Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Make</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{getMakeName(productData.make)}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Model</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{getModelName(productData.make, productData.model)}</Text>
              </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Year</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.year || 'N/A'}</Text>
              </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Body Type</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.body_type || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Mileage</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.mileage || 'N/A'} {productData.mileage_unit || ''}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Transmission</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.transmission || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Fuel Type</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.fuel_type || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Engine Size</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.engine_size || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Exterior Color</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.exterior_color || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Interior Color</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.interior_color || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Number of Doors</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.number_of_doors || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Number of Seats</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.number_of_seats || 'N/A'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Is Rental</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.is_rental ? 'Yes' : 'No'}</Text>
                </View>
            </View>
          </View>
        </Animated.View>
        )}

        {/* Features & Amenities */}
        {!productData.category?.name?.toLowerCase().includes('car') ? null : (
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="mx-4 mb-4"
        >
          <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
            style={{ 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.05, 
              shadowRadius: 10, 
              elevation: 5 
            }}>
            <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
                Features & Amenities
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Air Conditioning</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.air_conditioning ? 'Yes' : 'No'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Leather Seats</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.leather_seats ? 'Yes' : 'No'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Navigation System</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.navigation_system ? 'Yes' : 'No'}</Text>
              </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Bluetooth</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.bluetooth ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Parking Sensors</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.parking_sensors ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Cruise Control</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.cruise_control ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Keyless Entry</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.keyless_entry ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Sunroof</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.sunroof ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Alloy Wheels</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.alloy_wheels ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Airbags</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.airbags ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">ABS</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.abs ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Traction Control</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.traction_control ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Lane Assist</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.lane_assist ? 'Yes' : 'No'}</Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Blind Spot Monitor</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.blind_spot_monitor ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Merchant Information */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="mx-4 mb-4"
        >
          <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 5
            }}>
            <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
              Merchant Details
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Merchant Name</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.merchant?.first_name} {productData.merchant?.last_name}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Email</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.merchant?.email || 'N/A'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Phone</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.merchant?.phone_number || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Important Analytics */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="mx-4 mb-4"
        >
          <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 5
            }}>
            <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
              Performance Metrics
                </Text>
            
            <View className="space-y-3">
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Product Rating</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.rating || 'No ratings yet'}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Times Sold</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.purchased_count || 0}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Total Views</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.views || 0}</Text>
              </View>

              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-600 font-NunitoMedium">Merchant Rating</Text>
                <Text className="text-sm font-NunitoBold text-gray-900">{productData.merchant_rating || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Vehicle Compatibility */}
        {productData.vehicle_compatibility && productData.vehicle_compatibility.length > 0 && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
            className="mx-4 mb-4"
          >
            <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 5
              }}>
              <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
                Vehicle Compatibility
              </Text>
              
              <View className="space-y-3">
                {productData.vehicle_compatibility.map((compat: any, index: number) => (
                  <View key={index} className="border border-gray-200 rounded-lg p-3">
                    <Text className="text-sm font-NunitoBold text-gray-900 mb-2">Compatibility {index + 1}</Text>
                    <View className="space-y-2">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-gray-600 font-NunitoMedium">Make</Text>
                        <Text className="text-xs font-NunitoBold text-gray-900">{getMakeName(compat.make)}</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-gray-600 font-NunitoMedium">Models</Text>
                        <Text className="text-xs font-NunitoBold text-gray-900">
                          {Array.isArray(compat.model) 
                            ? compat.model.map((modelId: number) => getModelName(compat.make, modelId)).join(', ')
                            : getModelName(compat.make, compat.model)
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}


        {/* Product Orders */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
          className="mx-4 mb-6"
        >
          <TouchableOpacity
            onPress={handleViewOrders}
            className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex-row items-center justify-between"
            style={{ 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.05, 
              shadowRadius: 10, 
              elevation: 5 
            }}
          >
            <View className="flex-row items-center">
              <DocumentTextIcon size={24} color="#6B7280" />
              <View className="ml-3">
                <Text className="text-gray-900 font-NunitoMedium">
                  Orders for this product
                </Text>
                <Text className="text-gray-500 text-sm">
                  {productData.totalOrders || 0} orders placed
                </Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color="#6B7280" />
          </TouchableOpacity>
        </Animated.View>

        {/* Bidding Information */}
        {productData.bidding_window && (
          <Animated.View 
            style={{ 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
            className="mx-4 mb-4"
          >
            <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
              style={{ 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.05, 
                shadowRadius: 10, 
                elevation: 5 
              }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-NunitoBold text-gray-900">
                  Bidding Information
                </Text>
                <View className={`${productData.bidding_window.is_active && !productData.bidding_window.is_closed ? 'bg-red-50' : 'bg-gray-50'} px-3 py-1 rounded-full border ${productData.bidding_window.is_active && !productData.bidding_window.is_closed ? 'border-red-100' : 'border-gray-100'}`}>
                  <Text className={`${productData.bidding_window.is_active && !productData.bidding_window.is_closed ? 'text-red-700' : 'text-gray-500'} text-[10px] font-NunitoExtraBold uppercase tracking-wider`}>
                    {productData.bidding_window.is_active && !productData.bidding_window.is_closed ? 'LIVE AUCTION' : 'CLOSED'}
                  </Text>
                </View>
              </View>
              
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Auction Start</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">
                    {new Date(productData.bidding_window.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Auction End</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">
                    {new Date(productData.bidding_window.end_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-600 font-NunitoMedium">Duration</Text>
                  <Text className="text-sm font-NunitoBold text-gray-900">{productData.bidding_window.duration_days} Days</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Bid History Section */}
        {productData.bidding_window && bids.length > 0 && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
            className="mx-4 mb-4"
          >
            <View className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 5
              }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-NunitoBold text-gray-900">
                  Bid History
                </Text>
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-blue-700 text-xs font-NunitoBold">{bids.length} Bids</Text>
                </View>
              </View>

              <View className="space-y-4">
                {bids.map((bid: any) => (
                  <TouchableOpacity 
                    key={bid.id} 
                    onPress={() => handleBidClick(bid)}
                    className="flex-row items-center justify-between py-3 border-b border-gray-50 last:border-0"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                        <Text className="text-gray-600 font-NunitoBold text-xs uppercase">
                          {bid.bidder?.first_name?.[0] || 'U'}{bid.bidder?.last_name?.[0] || 'S'}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-sm font-NunitoBold text-gray-900">
                          {bid.bidder?.first_name} {bid.bidder?.last_name}
                        </Text>
                        <Text className="text-[10px] text-gray-400 font-NunitoMedium">
                          {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <NairaCurrency
                        value={parseFloat(bid.amount)}
                        className="text-sm font-NunitoExtraBold text-gray-900"
                      />
                      <View className="flex-row items-center mt-1">
                        <View className={`w-1.5 h-1.5 rounded-full mr-1 ${bid.status === 'pending' ? 'bg-yellow-500' : bid.status === 'accepted' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <Text className={`text-[10px] font-NunitoBold capitalize ${bid.status === 'pending' ? 'text-yellow-600' : bid.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                          {bid.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Bottom spacing for fixed buttons */}
        <View className="h-32 pb-4" />
      </ScrollView>

      {/* Premium Floating Action Bar */}
      <Animated.View 
        style={{ 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          shadowColor: '#000', 
          shadowOffset: { width: 0, height: -8 }, 
          shadowOpacity: 0.2, 
          shadowRadius: 24, 
          elevation: 2 
        }}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        
        {/* Action Buttons */}
        <View className="px-2 py-4 flex-row gap-2 space-x-3">
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-1 bg-gray-500 rounded-2xl py-4 items-center justify-center"
          >
            <Text className="text-white text-lg font-NunitoBold">Delete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleEdit}
            className="flex-1 bg-primary-600 rounded-2xl py-4 items-center justify-center"
          >
            <Text className="text-white text-lg font-NunitoBold">Edit info</Text>
          </TouchableOpacity>
        </View>

        {/* Safe Area Bottom */}
        <View className="h-8 bg-white" />
      </Animated.View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemType={!productData?.category?.name?.toLowerCase().includes('car') ? 'sparePart' : 'car'}
        itemName={productData?.name || ''}
      />

      {/* Bottom Delete Warning Drawer */}
      <Modal
        visible={showDeleteDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelDelete}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            {/* Warning Icon and Title */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <ExclamationTriangleIcon size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-NunitoBold text-gray-900 mb-2">
                Delete Product?
              </Text>
              <Text className="text-gray-600 text-center leading-6">
                Are you sure you want to delete "{productData?.name}"? This action cannot be undone and will permanently remove this product from your listings.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="space-y-3">
              <CustomButton 
                title="Delete" 
                onPress={handleConfirmDelete}
                loading={isDeleting}
                disabled={isDeleting}
              />

              <CustomButton 
                title="Cancel" 
                onPress={handleCancelDelete} 
                bgVariant="outline" 
                textVariant="outline" 
                className="mt-2"
                disabled={isDeleting}
              />
            </View>

            {/* Safe Area Bottom */}
            <View className="h-8" />
          </View>
        </View>
      </Modal>

      {/* Merchant Bid Action Modal */}
      <MerchantBidActionModal
        visible={showBidActionModal}
        onClose={() => setShowBidActionModal(false)}
        onAction={handleBidStatusUpdate}
        isLoading={updateBidMutation.isPending}
        bid={selectedBid}
      />
    </SafeAreaView>
  )
}

export default ProductDetailsDetailed