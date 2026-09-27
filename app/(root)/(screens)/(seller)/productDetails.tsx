import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, Animated, Linking, Platform, BackHandler, Modal } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  PencilSquareIcon,
  IdentificationIcon,
  TagIcon,
  CalendarDaysIcon,
  CogIcon,
  BeakerIcon,
  UsersIcon,
  PaintBrushIcon,
  CheckBadgeIcon,
  BoltIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ClockIcon
} from 'react-native-heroicons/outline'
import { SparklesIcon, StarIcon } from 'react-native-heroicons/solid'
import { icons } from '@/constants'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { NairaCurrency } from '@/utils/useCurrencyFormatter'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import EditProductOptionsModal from '@/components/modals/EditProductOptionsModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { sellerRoutes, SellerRouteValues } from '@/constants/routes'
import { productsAPI } from '@/lib/api/products'
import { useProductBids, useUpdateBid } from '@/hooks/useProducts'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import MerchantBidActionModal from '@/components/modals/MerchantBidActionModal'
import { formatDistanceToNow } from 'date-fns'
import CustomButton from '@/components/CustomButton'

const { width: screenWidth } = Dimensions.get("window");

const ProductDetails = () => {
  const insets = useSafeAreaInsets();
  const { productType, productId } = useLocalSearchParams<{
    productType: 'sparePart' | 'car' | 'rentedCar';
    productId: string;
  }>();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditOptionsModal, setShowEditOptionsModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [showBidActionModal, setShowBidActionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vehicle makes for name lookup
  const { data: vehicleMakes } = useVehicleMakes();

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

  const isSparePart = Boolean(
    !productData?.is_rental && (
      productType === 'sparePart' ||
      productData?.category?.name?.toLowerCase().includes('part') ||
      (!productData?.category?.name?.toLowerCase().includes('car') && !productData?.make)
    )
  );

  const pageTitle = productData?.is_rental
    ? 'Rental Details'
    : isSparePart
      ? 'Spare Part Details'
      : 'Vehicle Details';

  const hasFeatures = Boolean(
    productData?.air_conditioning || productData?.leather_seats || productData?.navigation_system ||
    productData?.bluetooth || productData?.parking_sensors || productData?.sunroof ||
    productData?.airbags || productData?.abs || productData?.traction_control ||
    productData?.lane_assist || productData?.blind_spot_monitor
  );

  const biddingWindow = productData?.bidding_window || productData?.bidding || null;
  const biddingWindowId = biddingWindow?.id ? String(biddingWindow.id) : '';

  // Fetch bids if auction is active
  const { data: bidsData, refetch: refetchBids } = useProductBids(biddingWindowId);
  const bids: any[] = Array.isArray(bidsData?.data)
    ? bidsData.data
    : Array.isArray(bidsData?.results)
      ? bidsData.results
      : Array.isArray(bidsData)
        ? bidsData
        : [];

  const isAuctionActive = Boolean(
    biddingWindow &&
    biddingWindow.is_active &&
    !biddingWindow.is_closed
  );

  // Bid update mutation
  const updateBidMutation = useUpdateBid(biddingWindowId);

  const handleBidClick = (bid: any) => {
    setSelectedBid(bid);
    setShowBidActionModal(true);
  };

  const handleBidStatusUpdate = async (status: 'accepted' | 'rejected') => {
    if (!selectedBid) return;
    
    await updateBidMutation.mutateAsync({
      bidId: selectedBid.id,
      payload: { status }
    });
    refetchBids();
    refetchProductDetails();
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(sellerRoutes.home as any);
    }
  }, []);

  // Fetch product details from API
  const fetchProductDetails = async (isSilent = false) => {
    if (!productId) return;

    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const response = await productsAPI.getProductById(productId);
      setProductData(response.data);
    } catch (err) {
      if (!isSilent) setError(err instanceof Error ? err.message : 'Failed to fetch product details');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Refetch function to reload data after successful operations
  const refetchProductDetails = async () => {
    await fetchProductDetails(true);
  };

  useEffect(() => {
    fetchProductDetails(false);
  }, [productId]);

  // Track initial load with a ref to avoid infinite re-trigger cycles
  const isInitialLoadRef = useRef(true);

  // Refetch data silently when screen comes into focus and handle Android hardware back
  useFocusEffect(
    useCallback(() => {
      if (!isInitialLoadRef.current) {
        refetchProductDetails();
      } else {
        isInitialLoadRef.current = false;
      }

      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [handleBack])
  );

  // Animation effects - only start when data is loaded
  useEffect(() => {
    if (productData && !loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [productData, loading]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const handleEdit = () => {
    if (!productData) return;

    let targetRoute: SellerRouteValues = sellerRoutes.editProduct;
    if (productData?.is_rental) {
      targetRoute = sellerRoutes.editCarToRent;
    } else if (
      productData?.category?.name?.toLowerCase().includes('car') ||
      productData?.body_type ||
      productData?.vin
    ) {
      targetRoute = sellerRoutes.editProduct;
    } else {
      targetRoute = sellerRoutes.editSparePart;
    }

    router.push({
      pathname: targetRoute as any,
      params: {
        editMode: 'true',
        isEditing: 'true',
        productId: productData.id,
        productData: JSON.stringify(productData)
      }
    });
  };

  const handleOpenEditDetails = () => {
    setShowEditOptionsModal(false);
    handleEdit();
  };

  const handleOpenEditImages = () => {
    setShowEditOptionsModal(false);
    if (!productData) return;
    router.push({
      pathname: sellerRoutes.editImage as any,
      params: { productId: productData.id, productData: JSON.stringify(productData) }
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);

    if (!productData?.id) return;

    try {
      setLoading(true);
      await productsAPI.deleteProduct(productData.id);

      let itemType = 'sparePart';
      if (productData?.is_rental) {
        itemType = 'rentedCar';
      } else if (productData?.category?.name?.toLowerCase().includes('car')) {
        itemType = 'car';
      }

      setTimeout(() => {
        router.push({
          pathname: sellerRoutes.deleteSuccess as any,
          params: { itemType }
        });
      }, 300);

    } catch (error) {
      setError('Failed to delete product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Spec Item Component
  const SpecItem = ({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: string, colorClass: string }) => (
    <View className="bg-gray-50 rounded-2xl p-4 flex-1 min-w-[45%] border border-gray-100 flex-row items-center">
      <View className={`w-10 h-10 rounded-xl ${colorClass} items-center justify-center mr-3 shadow-sm`}>
        <Icon size={20} color="white" />
      </View>
      <View>
        <Text className="text-gray-400 text-[10px] font-NunitoBold uppercase tracking-wider mb-0.5">{label}</Text>
        <Text className="text-gray-900 font-NunitoExtraBold text-[13px] capitalize" numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );

  // Feature Item Component
  const FeatureItem = ({ label, isSafety = false }: { label: string, isSafety?: boolean }) => (
    <View className={`${isSafety ? 'bg-blue-50/50 border-blue-100' : 'bg-green-50/50 border-green-100'} border rounded-xl px-3 py-2 flex-row items-center mr-2 mb-2`}>
      {isSafety ? (
        <ShieldCheckIcon size={14} color="#3B82F6" />
      ) : (
        <CheckBadgeIcon size={14} color="#10B981" />
      )}
      <Text className={`ml-1.5 text-[12px] font-NunitoBold ${isSafety ? 'text-blue-700' : 'text-green-700'}`}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar style="dark" />
        <LoadingSpinner message="Refining Details..." size="medium" />
      </SafeAreaView>
    );
  }

  if (error || !productData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-gray-50 rounded-[32px] p-10 items-center border border-gray-100 shadow-sm">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-6 shadow-md shadow-gray-200">
              <BoltIcon size={40} color="#6B7280" />
            </View>
            <Text className="text-gray-900 font-NunitoExtraBold text-xl mb-2">Something went wrong</Text>
            <Text className="text-gray-500 text-center mb-8 leading-5 font-NunitoMedium">
              {error || "We couldn't find the product you're looking for. It might have been removed."}
            </Text>
            <TouchableOpacity onPress={handleBack} className="bg-primary-500 px-8 py-4 rounded-2xl shadow-lg shadow-primary-200">
              <Text className="text-white font-NunitoExtraBold">Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Modern Header */}
      <View className="flex-row items-center justify-between bg-white px-6 py-4 border-b border-gray-50">
        <TouchableOpacity 
          onPress={handleBack}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
        >
          <ArrowLeftIcon size={20} color="#000" />
        </TouchableOpacity>
        <Text className="text-[17px] font-NunitoExtraBold text-gray-900">
          {pageTitle}
        </Text>
        <TouchableOpacity 
          onPress={() => setShowEditOptionsModal(true)}
          className="w-10 h-10 bg-primary-50 rounded-full items-center justify-center"
        >
          <PencilSquareIcon size={18} color="#D30309" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Compact Premium Image Gallery */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }} className="relative bg-white pb-2 pt-1">
          <View className="mx-4 bg-white rounded-[24px] overflow-hidden shadow-xl shadow-gray-400/25 border border-gray-100">
            <TouchableOpacity 
              activeOpacity={0.95}
              onPress={() => productData?.images?.length > 0 && setIsFullScreen(true)}
              className="w-full h-[210px] bg-gray-50"
            >
              {productData.images && productData.images.length > 0 && !imageErrors.has(selectedImageIndex) ? (
                <Image
                  source={{ uri: productData.images[selectedImageIndex].image }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={() => handleImageError(selectedImageIndex)}
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <PhotoIcon size={56} color="#E5E7EB" />
                  <Text className="text-gray-400 font-NunitoBold mt-2 text-xs">No Visuals Available</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Category Overlay */}
            <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 shadow-sm pointer-events-none">
              <Text className="text-[10px] font-NunitoExtraBold text-gray-900 uppercase tracking-wider">
                {productData.body_type?.replace('_', ' ') || 'Vehicle'}
              </Text>
            </View>

            {/* View Full Screen Button */}
            {productData.images && productData.images.length > 0 && (
              <TouchableOpacity
                onPress={() => setIsFullScreen(true)}
                activeOpacity={0.8}
                className="absolute top-3 right-3 bg-black/45 backdrop-blur-md px-2.5 py-1.5 rounded-full flex-row items-center border border-white/20 shadow-sm"
              >
                <ArrowsPointingOutIcon size={12} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-white text-[11px] font-NunitoBold ml-1">Full View</Text>
              </TouchableOpacity>
            )}

            {/* Compact Image Navigation */}
            {productData.images && productData.images.length > 1 && (
              <View className="absolute bottom-3 inset-x-0 flex-row justify-between items-center px-3">
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                  className="w-8 h-8 bg-white/85 backdrop-blur-md rounded-full items-center justify-center shadow-sm"
                  disabled={selectedImageIndex === 0}
                  activeOpacity={0.7}
                >
                  <ChevronLeftIcon size={16} color={selectedImageIndex === 0 ? "#D1D5DB" : "#111827"} strokeWidth={2.5} />
                </TouchableOpacity>
                <View className="flex-row items-center space-x-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {productData.images.map((_: any, index: number) => (
                    <View 
                      key={index} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${index === selectedImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} 
                    />
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.min(productData.images.length - 1, selectedImageIndex + 1))}
                  className="w-8 h-8 bg-white/85 backdrop-blur-md rounded-full items-center justify-center shadow-sm"
                  disabled={selectedImageIndex === productData.images.length - 1}
                  activeOpacity={0.7}
                >
                  <ChevronRightIcon size={16} color={selectedImageIndex === productData.images.length - 1 ? "#D1D5DB" : "#111827"} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Content Section */}
        <Animated.View 
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          className="px-5 pt-2 pb-10"
        >
          {/* Main Info Card */}
          <View className="bg-white rounded-[26px] p-4 shadow-xs border border-gray-200 mb-4">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-[20px] font-NunitoExtraBold text-gray-900 leading-tight mb-2">
                  {productData.name}
                </Text>
                <View className="flex-row items-center">
                  <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                    <StarIcon size={14} color="#F59E0B" />
                    <Text className="text-gray-900 font-NunitoExtraBold text-[12px] ml-1">{productData.rating || '5.0'}</Text>
                  </View>
                  <Text className="text-gray-400 text-[12px] font-NunitoBold ml-2">
                    {productData.reviews?.length || 0} Professional Reviews
                  </Text>
                </View>
              </View>
            </View>

            {/* Premium Pricing Block */}
            <View className="bg-primary-50 rounded-[24px] p-4 flex-row items-center justify-between border border-primary-100/50">
              <View className="flex-1 mr-2">
                <Text className="text-primary-400 font-NunitoBold text-[10px] uppercase tracking-widest mb-1">
                  {productData.is_rental 
                    ? 'Rental Daily Rate' 
                    : biddingWindow 
                      ? 'Starting / Base Price' 
                      : 'Market Price'}
                </Text>
                <View className="flex-row items-baseline flex-wrap">
                  <Text className="text-primary-700 font-NunitoExtraBold text-[24px]">
                    ₦{parseFloat(productData.price).toLocaleString()}
                  </Text>
                  {productData.is_rental && (
                    <Text className="text-primary-400 font-NunitoBold text-[14px] ml-1">/day</Text>
                  )}
                </View>
              </View>
              {biddingWindow ? (
                <View className={`shrink-0 px-3 py-1.5 rounded-full border ${isAuctionActive ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200'}`}>
                  <View className="flex-row items-center">
                    {isAuctionActive && <View className="w-2 h-2 rounded-full bg-red-600 mr-1.5" />}
                    <Text className={`${isAuctionActive ? 'text-red-700' : 'text-gray-600'} font-NunitoExtraBold text-[11px] uppercase tracking-wider`}>
                      {isAuctionActive ? 'Live Auction' : 'Auction Closed'}
                    </Text>
                  </View>
                </View>
              ) : productData.stock > 0 ? (
                <View className="shrink-0 bg-white/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-white">
                  <Text className="text-primary-600 font-NunitoExtraBold text-[11px]">
                    {productData.stock} In Stock
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Bidding Information Section */}
          {biddingWindow && (
            <View className="bg-white rounded-[26px] p-5 shadow-xs border border-gray-200 mb-4">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
                <View className="flex-row items-center flex-1 mr-2.5">
                  <View className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center mr-2.5 border border-red-100 shrink-0">
                    <ClockIcon size={20} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                      Bidding Window
                    </Text>
                    <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                      Buyer auction schedule & overview
                    </Text>
                  </View>
                </View>
                <View className={`shrink-0 px-2.5 py-1 rounded-full border ${isAuctionActive ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200'}`}>
                  <View className="flex-row items-center">
                    {isAuctionActive && <View className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5" />}
                    <Text className={`${isAuctionActive ? 'text-red-700' : 'text-gray-500'} text-[10px] font-NunitoExtraBold uppercase tracking-wider`}>
                      {isAuctionActive ? 'LIVE AUCTION' : 'CLOSED'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats Timeline Grid */}
              <View className="flex-row gap-2 mb-2">
                <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1">
                    Start Date
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900" numberOfLines={1}>
                    {biddingWindow.start_time
                      ? new Date(biddingWindow.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </Text>
                </View>

                <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1">
                    End Date
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900" numberOfLines={1}>
                    {biddingWindow.end_time
                      ? new Date(biddingWindow.end_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1">
                    Duration
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900">
                    {biddingWindow.duration_days ? `${biddingWindow.duration_days} Days` : 'N/A'}
                  </Text>
                </View>

                <View className="flex-1 bg-primary-50/60 rounded-2xl p-3 border border-primary-100/60">
                  <Text className="text-[10px] font-NunitoBold text-primary-600 uppercase tracking-wider mb-1">
                    {bids.length > 0 ? 'Highest Offer' : 'Total Offers'}
                  </Text>
                  <Text className="text-[13px] font-NunitoExtraBold text-primary-700">
                    {bids.length > 0
                      ? `₦${Math.max(...bids.map((b: any) => parseFloat(b.amount || '0'))).toLocaleString()}`
                      : '0 Received'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Buyer Offers & Bids Section */}
          {biddingWindow && (
            <View className="bg-white rounded-[26px] p-5 shadow-xs border border-gray-200 mb-4">
              <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
                <View className="flex-1 mr-2.5">
                  <Text className="text-[16px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                    Offers & Bids
                  </Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                    {bids.length > 0 ? 'Tap an offer to review, accept, or reject' : 'Active buyer offers'}
                  </Text>
                </View>
                <View className="shrink-0 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                  <Text className="text-primary-700 text-xs font-NunitoBold">
                    {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'}
                  </Text>
                </View>
              </View>

              {bids.length > 0 ? (
                <View className="space-y-2.5">
                  {bids.map((bid: any) => (
                    <TouchableOpacity
                      key={bid.id}
                      onPress={() => handleBidClick(bid)}
                      activeOpacity={0.75}
                      className="flex-row items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3 border border-primary-200">
                          <Text className="text-primary-700 font-NunitoExtraBold text-xs uppercase">
                            {bid.bidder?.first_name?.[0] || 'U'}{bid.bidder?.last_name?.[0] || 'S'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-NunitoBold text-gray-900" numberOfLines={1}>
                            {bid.bidder?.first_name} {bid.bidder?.last_name}
                          </Text>
                          <Text className="text-[10px] text-gray-400 font-NunitoMedium mt-0.5">
                            {bid.created_at ? formatDistanceToNow(new Date(bid.created_at), { addSuffix: true }) : ''}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-sm font-NunitoExtraBold text-gray-900">
                          ₦{parseFloat(bid.amount || '0').toLocaleString()}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <View
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              bid.status === 'pending'
                                ? 'bg-yellow-500'
                                : bid.status === 'accepted'
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                            }`}
                          />
                          <Text
                            className={`text-[10px] font-NunitoBold capitalize ${
                              bid.status === 'pending'
                                ? 'text-yellow-600'
                                : bid.status === 'accepted'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {bid.status || 'pending'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="py-6 items-center justify-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mb-2">
                    <ClockIcon size={20} color="#9CA3AF" />
                  </View>
                  <Text className="text-sm font-NunitoBold text-gray-700">No Bids Placed Yet</Text>
                  <Text className="text-xs font-NunitoMedium text-gray-400 text-center px-6 mt-1">
                    Buyer offers will appear here as soon as they are submitted during the auction.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Specifications / Part Information Grid */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-[17px] font-NunitoExtraBold text-gray-900">
                {isSparePart ? 'Part Information' : 'Specifications'}
              </Text>
              <CogIcon size={18} color="#9CA3AF" />
            </View>
            <View className="flex-row flex-wrap gap-3">
              {isSparePart ? (
                <>
                  {productData.category?.name && (
                    <SpecItem icon={TagIcon} label="Category" value={productData.category.name} colorClass="bg-blue-500" />
                  )}
                  {productData.condition && (
                    <SpecItem icon={CheckBadgeIcon} label="Condition" value={productData.condition} colorClass="bg-indigo-500" />
                  )}
                  {productData.stock !== undefined && (
                    <SpecItem icon={BoltIcon} label="Stock" value={`${productData.stock} Units`} colorClass="bg-emerald-500" />
                  )}
                  {productData.delivery_option && (
                    <SpecItem icon={IdentificationIcon} label="Delivery" value={productData.delivery_option} colorClass="bg-orange-500" />
                  )}
                  {productData.created_at && (
                    <SpecItem 
                      icon={CalendarDaysIcon} 
                      label="Listed Date" 
                      value={new Date(productData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                      colorClass="bg-purple-500" 
                    />
                  )}
                </>
              ) : (
                <>
                  {productData.transmission && (
                    <SpecItem icon={BoltIcon} label="Gear" value={productData.transmission} colorClass="bg-orange-500" />
                  )}
                  {productData.fuel_type && (
                    <SpecItem icon={BeakerIcon} label="Energy" value={productData.fuel_type} colorClass="bg-blue-500" />
                  )}
                  {productData.number_of_seats && (
                    <SpecItem icon={UsersIcon} label="Capacity" value={`${productData.number_of_seats} Seats`} colorClass="bg-purple-500" />
                  )}
                  {productData.exterior_color && (
                    <SpecItem icon={PaintBrushIcon} label="Exterior" value={productData.exterior_color} colorClass="bg-gray-700" />
                  )}
                  {productData.year && (
                    <SpecItem icon={CalendarDaysIcon} label="Model Year" value={productData.year.toString()} colorClass="bg-green-500" />
                  )}
                  {productData.condition && (
                    <SpecItem icon={CheckBadgeIcon} label="Condition" value={productData.condition} colorClass="bg-indigo-500" />
                  )}
                </>
              )}
            </View>
          </View>

          {/* Vehicle Compatibility Section (Spare Parts) */}
          {productData.vehicle_compatibility && productData.vehicle_compatibility.length > 0 && (
            <View className="mb-8 bg-white rounded-[26px] p-5 shadow-xs border border-gray-200">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                  <CogIcon size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-NunitoExtraBold text-gray-900">Vehicle Compatibility</Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">Compatible vehicle makes & models</Text>
                </View>
              </View>
              <View className="space-y-2.5">
                {productData.vehicle_compatibility.map((compat: any, index: number) => (
                  <View key={index} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                    <Text className="text-xs font-NunitoBold text-primary-600 mb-1.5 uppercase tracking-wider">
                      Vehicle {index + 1}: {getMakeName(compat.make)}
                    </Text>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-gray-500 font-NunitoMedium">Compatible Models</Text>
                      <Text className="text-xs font-NunitoBold text-gray-900">
                        {Array.isArray(compat.model)
                          ? compat.model.map((modelId: number) => getModelName(compat.make, modelId)).join(', ')
                          : getModelName(compat.make, compat.model)
                        }
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Features Section - Only show if vehicle or has at least one amenity/safety feature */}
          {hasFeatures && (
            <View className="mb-8 bg-white rounded-[26px] p-4 shadow-xs border border-gray-200">
              <View className="flex-row items-center mb-5">
                <SparklesIcon size={20} color="#D30309" />
                <Text className="text-[17px] font-NunitoExtraBold text-gray-900 ml-2.5">Key Features</Text>
              </View>
              
              <View className="mb-4">
                <Text className="text-[11px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest mb-3">Amenities</Text>
                <View className="flex-row flex-wrap">
                  {productData.air_conditioning && <FeatureItem label="A/C System" />}
                  {productData.leather_seats && <FeatureItem label="Leather Interior" />}
                  {productData.navigation_system && <FeatureItem label="GPS Navigation" />}
                  {productData.bluetooth && <FeatureItem label="Premium Audio" />}
                  {productData.parking_sensors && <FeatureItem label="Proximity Sensors" />}
                  {productData.sunroof && <FeatureItem label="Panoramic Roof" />}
                </View>
              </View>

              <View>
                <Text className="text-[11px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest mb-3">Safety & Assistance</Text>
                <View className="flex-row flex-wrap">
                  {productData.airbags && <FeatureItem label="Dual Airbags" isSafety />}
                  {productData.abs && <FeatureItem label="ABS Braking" isSafety />}
                  {productData.traction_control && <FeatureItem label="Traction Control" isSafety />}
                  {productData.lane_assist && <FeatureItem label="Lane Departure" isSafety />}
                  {productData.blind_spot_monitor && <FeatureItem label="Blind Spot Monitoring" isSafety />}
                </View>
              </View>
            </View>
          )}


          {/* Description Section */}
          <View className="mb-4 px-1">
            <Text className="text-[17px] font-NunitoExtraBold text-gray-900 mb-3">
              {isSparePart ? 'Product Description' : 'Vehicle Narrative'}
            </Text>
            <View className="bg-white rounded-[24px] p-4 border border-gray-200 shadow-xs">
              <Text className="text-gray-500 font-NunitoMedium leading-6 text-[14px]">
                {productData.description || (isSparePart ? "No description provided for this product." : "No narrative provided for this vehicle. Contact merchant for detailed operational requirements and terms.")}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Action Footer */}
      <View 
        className="bg-white border-t border-gray-100 px-5 pt-3 shadow-lg shadow-black/5"
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
            },
            android: {
              elevation: 8,
            },
          }),
        }}
      >
        <View className="flex-row gap-3">
          <TouchableOpacity 
            onPress={() => setShowEditOptionsModal(true)}
            activeOpacity={0.85}
            className="flex-1 bg-gray-900 rounded-[22px] py-3.5 items-center shadow-md shadow-gray-400"
          >
            <View className="flex-row items-center">
              <PencilSquareIcon size={18} color="white" />
              <Text className="text-white font-NunitoExtraBold text-[15px] ml-2">
                {productData?.is_rental 
                  ? 'Edit Rental' 
                  : isSparePart 
                    ? 'Edit Part' 
                    : 'Edit Vehicle'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleDelete}
            activeOpacity={0.8}
            className="flex-1 bg-red-50 border border-red-100 rounded-[22px] py-3.5 items-center"
          >
            <View className="flex-row items-center">
              <TrashIcon size={18} color="#D30309" />
              <Text className="text-red-600 font-NunitoExtraBold text-[15px] ml-2">Delete</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Options Bottom Drawer */}
      <EditProductOptionsModal
        visible={showEditOptionsModal}
        onClose={() => setShowEditOptionsModal(false)}
        onEditDetails={handleOpenEditDetails}
        onEditImages={handleOpenEditImages}
        productData={productData}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemType={productData?.is_rental ? 'rentedCar' : isSparePart ? 'sparePart' : 'car'}
        itemName={productData?.name || ''}
      />

      {/* Merchant Bid Action Modal */}
      <MerchantBidActionModal
        visible={showBidActionModal}
        onClose={() => setShowBidActionModal(false)}
        onAction={handleBidStatusUpdate}
        isLoading={updateBidMutation.isPending}
        bid={selectedBid}
      />

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={isFullScreen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsFullScreen(false)}
        statusBarTranslucent
      >
        <View 
          className="flex-1 bg-black justify-between" 
          style={{ 
            paddingTop: Math.max(insets.top, 14), 
            paddingBottom: Math.max(insets.bottom, 20) 
          }}
        >
          <StatusBar style="light" />

          {/* Fullscreen Top Bar */}
          <View
            style={{
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 25) + 12,
              paddingHorizontal: 20,
              paddingBottom: 10,
            }}
            className="flex-row items-center justify-between z-10"
          >
            <View className="bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <Text className="text-white text-xs font-NunitoBold">
                {productData?.images && productData.images.length > 0 
                  ? `${selectedImageIndex + 1} / ${productData.images.length}` 
                  : '1 / 1'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsFullScreen(false)}
              hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
              activeOpacity={0.8}
              className="flex-row items-center bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 active:bg-white/30"
            >
              <ArrowsPointingInIcon size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-white text-xs font-NunitoBold ml-1.5">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Fullscreen Image Canvas */}
          <View className="flex-1 items-center justify-center relative px-2">
            {productData?.images && productData.images.length > 0 && !imageErrors.has(selectedImageIndex) ? (
              <Image
                source={{ uri: productData.images[selectedImageIndex].image }}
                className="w-full h-full"
                resizeMode="contain"
              />
            ) : (
              <View className="items-center justify-center">
                <PhotoIcon size={64} color="#6B7280" />
                <Text className="text-gray-400 font-NunitoBold mt-2">No Visuals Available</Text>
              </View>
            )}

            {/* Left Nav Arrow */}
            {productData?.images && productData.images.length > 1 && selectedImageIndex > 0 && (
              <TouchableOpacity
                onPress={() => setSelectedImageIndex(selectedImageIndex - 1)}
                activeOpacity={0.8}
                className="absolute left-4 w-11 h-11 bg-white/20 backdrop-blur-md rounded-full items-center justify-center active:bg-white/30"
              >
                <ChevronLeftIcon size={24} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}

            {/* Right Nav Arrow */}
            {productData?.images && productData.images.length > 1 && selectedImageIndex < productData.images.length - 1 && (
              <TouchableOpacity
                onPress={() => setSelectedImageIndex(selectedImageIndex + 1)}
                activeOpacity={0.8}
                className="absolute right-4 w-11 h-11 bg-white/20 backdrop-blur-md rounded-full items-center justify-center active:bg-white/30"
              >
                <ChevronRightIcon size={24} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* Fullscreen Dots Navigation */}
          {productData?.images && productData.images.length > 1 && (
            <View className="py-2 items-center">
              <View className="flex-row items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                {productData.images.map((_: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedImageIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === selectedImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'
                    }`}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProductDetails;