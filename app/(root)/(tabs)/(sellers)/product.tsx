import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, Pressable, FlatList, Dimensions, RefreshControl, Animated } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PlusIcon, LockClosedIcon } from 'react-native-heroicons/outline'
import { SparklesIcon } from 'react-native-heroicons/solid'
import { icons } from '@/constants'
import { router } from 'expo-router'
import { sellerRoutes } from '@/constants/routes'
import { NairaCurrency } from '@/utils/useCurrencyFormatter'
import { LAYOUT } from '@/constants/units'
import { productsAPI } from '@/lib/api/products'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useQuery } from '@tanstack/react-query'
import { usePrimaryUserProfile, useMerchantProfile, useVehicleRentalProfile } from '@/hooks/useUserProfile'
import { useCategories } from '@/hooks/useProducts'
import AndroidNavBarSpacer from '@/components/AndroidNavBarSpacer'
import { useProfileStore } from '@/hooks/useProfileStore'
import ProfileCompletionModal from '@/components/modals/ProfileCompletionModal'
import PreferredOptionModal from '@/components/modals/PreferredOptionModal'
import SubscriptionGateModal from '@/components/modals/SubscriptionGateModal'

const { width: screenWidth } = Dimensions.get("window");

const Product = () => {
  const [showModal, setShowModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { SCROLL_PADDING_BOTTOM, CARD_GAP, CARD_PADDING, CONTAINER_PADDING } = LAYOUT;
  
  // Calculate card width to show 2 full cards + 1 partial card (20-30% visible)
  const CARD_WIDTH = Math.floor((screenWidth - 35 - 32) / 2.15);

  const isProfileComplete = useProfileStore((state) => state.isProfileComplete);
  const setIsProfileComplete = useProfileStore((state) => state.setIsProfileComplete);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const FREE_UPLOAD_LIMIT = 2;

  // Fetch primary profile data
  const { data: primaryProfileData, isLoading: isProfileLoading } = usePrimaryUserProfile();

  // Extract active role with fallback
  const activeRoleRaw = primaryProfileData?.active_role || primaryProfileData?.data?.active_role || (primaryProfileData?.data as any)?.current_role;
  const activeRole = typeof activeRoleRaw === 'object' ? activeRoleRaw?.name : activeRoleRaw;
  const isVehicleRental = activeRole === 'vehicle_rental';
  const isSeller = activeRole === 'merchant' || activeRole === 'seller';

  // Fetch specific profile to check KYC status
  const merchantProfileQuery = useMerchantProfile(isSeller);
  const vehicleRentalProfileQuery = useVehicleRentalProfile(isVehicleRental);
  
  const activeProfileQuery = isVehicleRental ? vehicleRentalProfileQuery : merchantProfileQuery;

  // Subscription check
  const isSubscribed = Boolean((activeProfileQuery.data?.data as any)?.merchant_profile?.is_subscribed || (activeProfileQuery.data?.data as any)?.vehicle_rental_profile?.is_subscribed);

  // Extract merchant ID safely from different profile structures
  const profileData = primaryProfileData;
  const merchantId = (activeRole === 'merchant' || activeRole === 'vehicle_rental')
    ? (profileData?.data as any)?.user?.id || (profileData?.data as any)?.user_id
    : (profileData?.data as any)?.user_id;

  const isPendingApproval = Boolean(
    activeProfileQuery.data?.data?.kyc?.is_complete && 
    !((activeProfileQuery.data?.data as any)?.merchant_profile?.is_approved || (activeProfileQuery.data?.data as any)?.vehicle_rental_profile?.is_approved)
  );

  const hasShownModalRef = React.useRef(false);

  const isNewSwitch = useProfileStore((state) => state.isNewSwitch);
  const setIsNewSwitch = useProfileStore((state) => state.setIsNewSwitch);
  const timerIdRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check profile status
  React.useEffect(() => {
    if (!activeProfileQuery.isLoading && activeProfileQuery.data?.data) {
      const activeData = activeProfileQuery.data.data;
      const hasKycData = !!(activeData as any).nin_number || !!(activeData as any).kyc?.is_complete;
      setIsProfileComplete(hasKycData);
      
      // ONLY show automatically if we just switched roles and it's not complete
      if (isNewSwitch && !hasKycData && !activeProfileQuery.isLoading && !isProfileLoading && !hasShownModalRef.current) {
        // Start timer only if not already started
        if (!timerIdRef.current) {
          timerIdRef.current = setTimeout(() => {
            setShowProfileModal(true);
            hasShownModalRef.current = true;
            setIsNewSwitch(false); // Reset the switch flag
            timerIdRef.current = null;
          }, 3000); // 3 seconds delay
        }
      } else if (!isNewSwitch) {
          // If not a new switch, make sure timer is cleared
          if (timerIdRef.current) {
              clearTimeout(timerIdRef.current);
              timerIdRef.current = null;
          }
      }
    }

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [activeProfileQuery.data, activeProfileQuery.isLoading, isProfileLoading, setIsProfileComplete, isNewSwitch]);

  // Use specific category IDs as provided
  const SPARE_PARTS_CATEGORY_ID = 24;
  const CAR_CATEGORY_ID = 23;

  // Fetch categories for reference (optional)
  const { data: categories } = useCategories();

  // Query 1: Fetch ALL products (no category filter)
  const {
    data: allProducts = [],
    isLoading: loadingAll,
    error: errorAll,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ['products', merchantId, 'all'],
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        undefined, // categoryId - no filter
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId  // merchantId
      )
      
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: !!merchantId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Query 2: Fetch ONLY cars (filtered by car category)
  const {
    data: carProducts = [],
    isLoading: loadingCars,
    error: errorCars,
    refetch: refetchCars,
  } = useQuery({
    queryKey: ['products', merchantId, 'cars', CAR_CATEGORY_ID],
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        CAR_CATEGORY_ID, // categoryId - filter by car category (23)
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId, // merchantId
        false // isRental - fetch non-rental cars only
      )
      
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: !!merchantId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Query 3: Fetch ONLY spare parts (filtered by spare parts category)
  const {
    data: sparePartsProducts = [],
    isLoading: loadingSpareParts,
    error: errorSpareParts,
    refetch: refetchSpareParts,
  } = useQuery({
    queryKey: ['products', merchantId, 'spareParts', SPARE_PARTS_CATEGORY_ID],
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        SPARE_PARTS_CATEGORY_ID, // categoryId - filter by spare parts category (24)
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId  // merchantId
      )
      
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: !!merchantId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Query 4: Fetch ONLY rental cars (filtered by car category with is_rental=true)
  const {
    data: rentalCarProducts = [],
    isLoading: loadingRentalCars,
    error: errorRentalCars,
    refetch: refetchRentalCars,
  } = useQuery({
    queryKey: ['products', merchantId, 'rentalCars', CAR_CATEGORY_ID],
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        CAR_CATEGORY_ID, // categoryId - filter by car category (23)
        undefined, // minPrice
        undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId, // merchantId
        true // isRental - fetch rental cars only
      )
      
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: !!merchantId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  // Combine loading and error states
  const loading = loadingAll || loadingCars || loadingSpareParts || loadingRentalCars;
  const error = errorAll || errorCars || errorSpareParts || errorRentalCars;

  // Use specific query results instead of filtering from all products
  const products = allProducts; // Keep for backward compatibility

  // Use the specific query results for each category
  const spareParts = sparePartsProducts;
  const cars = carProducts;
  const rentedCars = rentalCarProducts;



  const options = [
    ...(isSeller ? [
      {
        id: 1,
        title: 'Upload Spare Parts',
        onPress: () => {
          setShowModal(false);
          if (!isSubscribed && allProducts.length >= FREE_UPLOAD_LIMIT) {
            setShowSubscriptionModal(true);
            return;
          }
          router.push(sellerRoutes.uploadSpareParts);
        }
      },
      {
        id: 2,
        title: 'Upload Cars',
        onPress: () => {
          setShowModal(false);
          if (!isSubscribed && allProducts.length >= FREE_UPLOAD_LIMIT) {
            setShowSubscriptionModal(true);
            return;
          }
          router.push(sellerRoutes.uploadProducts);
        }
      }
    ] : []),
    ...(isVehicleRental ? [
      {
        id: 3,
        title: 'Rent out Cars',
        onPress: () => {
          setShowModal(false);
          if (!isSubscribed && allProducts.length >= FREE_UPLOAD_LIMIT) {
            setShowSubscriptionModal(true);
            return;
          }
          router.push(sellerRoutes.uploadCarToRent);
        }
      }
    ] : [])
  ];

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={i} className="text-yellow-400">★</Text>)
    }
    
    if (hasHalfStar) {
      stars.push(<Text key="half" className="text-yellow-400">★</Text>)
    }
    
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Text key={`empty-${i}`} className="text-gray-300">★</Text>)
    }
    return stars
  }

  // Helper to check if a product has an active bidding window
  const isActiveAuction = (item: any) => {
    return (
      item.bidding_window && 
      !item.bidding_window.is_closed && 
      item.bidding_window.is_active
    );
  };

  // Live Pulsating Indicator using Animated API (animate-pulse is CSS-only, not supported in RN)
  const LiveIndicator = () => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, []);
    return (
      <View className="flex-row items-center bg-red-600 px-2 py-1 rounded-lg absolute top-2 right-2 z-10 shadow-sm border border-red-500/50">
        <Animated.View style={{ opacity: pulseAnim }} className="w-1.5 h-1.5 rounded-full bg-white mr-1.5" />
        <Text className="text-[9px] font-NunitoExtraBold text-white uppercase tracking-widest">Live Auction</Text>
      </View>
    );
  };

  // FlatList render functions
  const renderSparePartItem = useCallback(({ item }: { item: any }) => {
    const productImage = item.images && item.images.length > 0 ? item.images[0].image : null;
    const isAuction = isActiveAuction(item);
    
    return (
      <View style={{ width: CARD_WIDTH }}>
            <TouchableOpacity 
              className="bg-white rounded-2xl border border-gray-300 mt-4 overflow-hidden relative shadow-sm"
              onPress={() => {
                router.push({
                  pathname: sellerRoutes.productDetailsDetailed as any,
                  params: { 
                    productType: 'sparePart',
                    productId: item.id 
                  }
                });
              }}
            >
          {isAuction && <LiveIndicator />}
          <View className="w-full h-[140px] bg-gray-200">
            {productImage ? (
              <Image 
                source={{ uri: productImage }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <icons.empty width={60} height={60} />
              </View>
            )}
          </View>
          <View className="p-3 space-y-2">
            <Text className="font-NunitoBold text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-center">
              {renderStars(item.rating || 0)}
              <Text className="text-gray-500 text-xs ml-1">({item.reviews?.length || 0})</Text>
            </View>
            <NairaCurrency 
              value={parseFloat(item.price)} 
              className="font-NunitoBold text-gray-900"
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [CARD_WIDTH]);

  const renderCarItem = useCallback(({ item }: { item: any }) => {
    const productImage = item.images && item.images.length > 0 ? item.images[0].image : null;
    const isAuction = isActiveAuction(item);
    
    return (
      <View style={{ width: CARD_WIDTH }}>
            <TouchableOpacity 
              className="bg-white rounded-2xl border border-gray-300 mt-4 overflow-hidden relative shadow-sm"
              onPress={() => {
                router.push({
                  pathname: sellerRoutes.productDetailsDetailed as any,
                  params: { 
                    productType: 'car',
                    productId: item.id 
                  }
                });
              }}
            >
          {isAuction && <LiveIndicator />}
          <View className="w-full h-[140px] bg-gray-200">
            {productImage ? (
              <Image 
                source={{ uri: productImage }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <icons.empty width={60} height={60} />
              </View>
            )}
          </View>
          <View className="p-3 space-y-2">
            <Text className="font-NunitoBold text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-center">
              {renderStars(item.rating || 0)}
              <Text className="text-gray-500 text-xs ml-1">({item.reviews?.length || 0})</Text>
            </View>
            <NairaCurrency 
              value={parseFloat(item.price)} 
              className="font-NunitoBold text-gray-900"
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [CARD_WIDTH]);



  const renderRentedCarItem = useCallback(({ item }: { item: any }) => {
    const productImage = item.images && item.images.length > 0 ? item.images[0].image : null;
    const isAuction = isActiveAuction(item);
    
    return (
      <View style={{ width: CARD_WIDTH }}>
        <TouchableOpacity 
          className="bg-white rounded-[24px] border border-gray-100 mt-4 overflow-hidden shadow-md shadow-gray-200/50"
          onPress={() => {
            router.push({
              pathname: sellerRoutes.productDetails as any,
              params: { 
                productType: 'rentedCar',
                productId: item.id 
              }
            });
          }}
          activeOpacity={0.9}
        >
          {isAuction && <LiveIndicator />}
          
          {/* Image Container */}
          <View className="w-full h-[150px] bg-gray-50 relative">
            {productImage ? (
              <Image 
                source={{ uri: productImage }} 
                className="w-full h-full"
                style={{ resizeMode: 'cover' }}
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-gray-100">
                <icons.empty width={48} height={48} />
              </View>
            )}
            
            {/* Category Badge */}
            <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/50">
              <Text className="text-[10px] font-NunitoExtraBold text-gray-900 uppercase tracking-tight">
                {item.body_type?.replace('_', ' ') || 'Vehicle'}
              </Text>
            </View>
          </View>
          
          <View className="p-4 space-y-2.5">
            <View>
              <Text className="font-NunitoExtraBold text-[15px] text-gray-900 leading-tight" numberOfLines={1}>
                {item.name}
              </Text>
              
              <View className="flex-row items-center mt-1">
                <View className="flex-row items-center bg-gray-50 px-1.5 py-0.5 rounded-md">
                  <SparklesIcon size={10} color="#EAB308" />
                  <Text className="text-gray-900 font-NunitoBold text-[10px] ml-1">
                    {item.rating || '5.0'}
                  </Text>
                </View>
                <Text className="text-gray-400 text-[10px] font-NunitoMedium ml-1.5">
                  ({item.reviews?.length || 0} reviews)
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center justify-between pt-1 border-t border-gray-50">
              <View className="bg-primary-50 px-3 py-1.5 rounded-2xl">
                <Text className="font-NunitoExtraBold text-primary-600 text-[13px]">
                  ₦{parseFloat(item.price).toLocaleString()}
                  <Text className="text-[10px] font-NunitoBold text-primary-400">/day</Text>
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [CARD_WIDTH]);

  const renderEmptyState = (message: string) => (
    <View className="items-center py-12">
      <View className="w-[100px] h-[100px] bg-gray-300 rounded-full items-center justify-center mb-4">
        <icons.empty className='w-full h-full' />
      </View>
      <Text className="text-gray-500 text-center">{message}</Text>
    </View>
  )

  // Pull-to-refresh functionality - refetch all four queries
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetchAll(), refetchCars(), refetchSpareParts(), refetchRentalCars(), activeProfileQuery.refetch()])
    } catch (error) {
      console.error('❌ Error refreshing:', error);
    } finally {
      setRefreshing(false)
    }
  }, [refetchAll, refetchCars, refetchSpareParts, refetchRentalCars])

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
        <View className="w-8" />
        <Text className="text-xl font-NunitoBold text-gray-900">
          {isVehicleRental ? "My Rentals" : "Uploaded Products"}
        </Text>
        <TouchableOpacity 
          onPress={() => {
            if (!isProfileComplete || isPendingApproval) {
              setShowProfileModal(true);
              return;
            }
            // Subscription gate: if free uploads used, show subscription modal
            if (!isSubscribed && allProducts.length >= FREE_UPLOAD_LIMIT) {
              setShowSubscriptionModal(true);
              return;
            }
            if (isVehicleRental) {
              router.push(sellerRoutes.uploadCarToRent);
            } else {
              setShowModal(true);
            }
          }}
          disabled={isPendingApproval}
          className={`p-2 rounded-full items-center justify-center ${isPendingApproval ? 'bg-gray-300' : 'bg-primary-500'}`}
        >
          <PlusIcon size={25} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner 
          message="Loading Products"
          size="medium"
        />
      ) : error ? (
        <View className="flex-1 items-center justify-center py-20">
          <View className="items-center">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Text className="text-red-500 text-2xl">⚠️</Text>
            </View>
            <Text className="text-lg font-NunitoSemiBold text-gray-900 mb-2">
              Error Loading Products
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              {error instanceof Error ? error.message : 'Failed to fetch products'}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView 
          className="flex-1 px-4" 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D30309"
              colors={['#D30309']}
              title="Pull to refresh"
              titleColor="#6B7280"
            />
          }
          contentContainerStyle={{
            paddingBottom: SCROLL_PADDING_BOTTOM + 20,
            flexGrow: 1,
          }}
        >
          {/* Subscription Status Banner */}
          {isSubscribed ? (
            <View className="flex-row items-center bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 mt-3 mb-1">
              <SparklesIcon size={16} color="#D30309" />
              <Text className="ml-2 text-sm font-NunitoBold text-primary-700">
                Pro Subscription Active — Unlimited uploads 🎉
              </Text>
            </View>
          ) : allProducts.length >= FREE_UPLOAD_LIMIT ? (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setShowSubscriptionModal(true)}
              className="flex-row items-center bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mt-3 mb-1"
            >
              <LockClosedIcon size={16} color="#DC2626" />
              <View className="ml-2 flex-1">
                <Text className="text-sm font-NunitoBold text-red-700">Free uploads used</Text>
                <Text className="text-[10px] font-NunitoMedium text-red-500">
                  Subscribe for ₦15,000/mo to upload more products
                </Text>
              </View>
              <Text className="text-xs font-NunitoBold text-primary-600 mr-1">Upgrade</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mt-3 mb-1">
              <LockClosedIcon size={16} color="#3B82F6" />
              <Text className="ml-2 text-xs font-NunitoSemiBold text-blue-700">
                {FREE_UPLOAD_LIMIT - allProducts.length} free upload{FREE_UPLOAD_LIMIT - allProducts.length !== 1 ? 's' : ''} remaining
              </Text>
            </View>
          )}
          {/* Spare Parts Section */}
          {isSeller && (
            <View className="py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-NunitoBold text-gray-900">All Uploaded Spare Parts</Text>
                <TouchableOpacity onPress={() => router.push(sellerRoutes.allSpareParts as any)}>
                  <Text className="text-blue-500 font-NunitoMedium">See All</Text>
                </TouchableOpacity>
              </View>
              
              {spareParts.length > 0 ? (
                <FlatList
                  data={spareParts}
                  renderItem={renderSparePartItem}
                  keyExtractor={(item) => String(item.id)}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  snapToAlignment="start"
                  snapToInterval={CARD_WIDTH + CARD_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: CARD_PADDING,
                    gap: CARD_GAP,
                  }}
                  initialNumToRender={4}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={true}
                  updateCellsBatchingPeriod={100}
                />
              ) : (
                renderEmptyState("You do not have any Uploaded Spare Parts.")
              )}
            </View>
          )}

          {/* Uploaded Cars Section */}
          {isSeller && (
            <View className="py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-NunitoBold text-gray-900">All Uploaded Cars</Text>
                <TouchableOpacity onPress={() => router.push(sellerRoutes.allCars as any)}>
                  <Text className="text-blue-500 font-NunitoMedium">See All</Text>
                </TouchableOpacity>
              </View>
              
              {cars.length > 0 ? (
                <FlatList
                  data={cars}
                  renderItem={renderCarItem}
                  keyExtractor={(item) => String(item.id)}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  snapToAlignment="start"
                  snapToInterval={CARD_WIDTH + CARD_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: CARD_PADDING,
                    gap: CARD_GAP,
                  }}
                  initialNumToRender={4}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={true}
                  updateCellsBatchingPeriod={100}
                />
              ) : (
                renderEmptyState("You do not have any Uploaded Cars.")
              )}
            </View>
          )}

          {/* Rented Cars Section */}
          {isVehicleRental && (
            <View className="py-6 pb-10">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-NunitoBold text-gray-900">All Rented Cars</Text>
                <TouchableOpacity onPress={() => router.push(sellerRoutes.allRentedCars as any)}>
                  <Text className="text-blue-500 font-NunitoMedium">See All</Text>
                </TouchableOpacity>
              </View>
              
              {rentedCars.length > 0 ? (
                <FlatList
                  data={rentedCars}
                  renderItem={renderRentedCarItem}
                  keyExtractor={(item) => String(item.id)}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  snapToAlignment="start"
                  snapToInterval={CARD_WIDTH + CARD_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: CARD_PADDING,
                    gap: CARD_GAP,
                  }}
                  initialNumToRender={4}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={true}
                  updateCellsBatchingPeriod={100}
                />
              ) : (
                renderEmptyState("You do not have any Cars Rented Out.")
              )}
            </View>
          )}
        </ScrollView>
      )}

      <PreferredOptionModal 
        isVisible={showModal}
        onClose={() => setShowModal(false)}
        options={options}
      />

      <ProfileCompletionModal
        isVisible={showProfileModal}
        roleName={isVehicleRental ? "vehicle_rental" : "seller"}
        onComplete={() => setShowProfileModal(false)}
        onClose={() => setShowProfileModal(false)}
        isPending={isPendingApproval}
      />

      <SubscriptionGateModal
        isVisible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        usedUploads={allProducts.length}
        roleName={isVehicleRental ? "vehicle_rental" : "seller"}
      />
    </SafeAreaView>
  )
}

export default Product