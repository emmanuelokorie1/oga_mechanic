import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Image, FlatList, RefreshControl, Animated } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeftIcon, PlusIcon } from 'react-native-heroicons/outline'
import { icons } from '@/constants'
import { router } from 'expo-router'
import { LAYOUT } from '@/constants/units'
import { sellerRoutes } from '@/constants/routes'
import SearchBarWithCategories from '@/components/SearchBarWithCategories'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import { productsAPI } from '@/lib/api/products'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useQuery } from '@tanstack/react-query'
import { usePrimaryUserProfile, useMerchantProfile } from '@/hooks/useUserProfile'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import ProfileCompletionModal from '@/components/modals/ProfileCompletionModal'
import SubscriptionGateModal from '@/components/modals/SubscriptionGateModal'
import { useSellerUploadGate } from '@/hooks/useSellerUploadGate'
import { NairaCurrency } from '@/utils/useCurrencyFormatter'

const { SCROLL_PADDING_BOTTOM, CARD_PADDING, CONTAINER_PADDING } = LAYOUT;

const CAR_CATEGORY_ID = 23;

const AllCars = () => {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [inputQuery, setInputQuery] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const {
    checkUploadPermission,
    showSubscriptionModal,
    setShowSubscriptionModal,
    showProfileModal,
    setShowProfileModal,
    isPendingApproval,
    totalProductsCount,
    roleName,
    merchantId,
  } = useSellerUploadGate();

  const activeRole = roleName;

  // Vehicle makes for filter options
  const { data: vehicleMakes = [] } = useVehicleMakes();
  const categoryOptions = useMemo(() => {
    if (vehicleMakes && vehicleMakes.length > 0) {
      return [
        { name: "All", id: null },
        ...vehicleMakes.map((m: any) => ({ name: m.name, id: m.id }))
      ];
    }
    return [
      { name: "All", id: null },
      { name: "Audi", id: 1 },
      { name: "Chevrolet", id: 2 },
      { name: "Mercedes-Benz", id: 3 },
      { name: "Porsche", id: 4 },
      { name: "Hyundai", id: 5 },
      { name: "Toyota", id: 6 }
    ];
  }, [vehicleMakes]);

  // Fetch cars using TanStack Query matching product.tsx
  const {
    data: allCars = [],
    isLoading: loading,
    error,
    refetch,
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
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: !!merchantId, // Only fetch when we have merchantId
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Pull-to-refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleSearchChange = useCallback((text: string) => {
    setInputQuery(text);
  }, []);

  const handleCategoryChange = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
  }, []);

  const handlePriceChange = useCallback((field: 'min' | 'max', value: string) => {
    if (field === 'min') {
      setMinPrice(value);
    } else {
      setMaxPrice(value);
    }
  }, []);

  const handleApplySearch = () => {
    // Reactive via useMemo
  };

  const handleResetSearch = () => {
    setInputQuery("");
    setSelectedCategory("All");
    setMinPrice("");
    setMaxPrice("");
  };

  const handleFilterPress = () => {
    // Filter modal / sheet if applicable
  };

  const handleDeleteItem = (item: any) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (!selectedItem?.id) return;
    try {
      await productsAPI.deleteProduct(selectedItem.id);
      await refetch();
      setTimeout(() => {
        router.push({
          pathname: sellerRoutes.deleteSuccess as any,
          params: { itemType: 'car' }
        });
      }, 300);
    } catch (err) {
      console.error('❌ Failed to delete car:', err);
    }
  };

  // Check if item has active bidding
  const isActiveAuction = (item: any) => {
    return Boolean(
      item.bidding_window && 
      !item.bidding_window.is_closed && 
      item.bidding_window.is_active
    );
  };

  // Live Pulsating Indicator
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Text key={i} className="text-yellow-400">★</Text>);
    }
    if (hasHalfStar) {
      stars.push(<Text key="half" className="text-yellow-400">★</Text>);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Text key={`empty-${i}`} className="text-gray-300">★</Text>);
    }
    return stars;
  };

  // Filtered cars based on selected make chip, search query, and price range
  const filteredCars = useMemo(() => {
    let result = allCars;

    // Filter by selected category / make chip
    if (selectedCategory && selectedCategory !== 'All') {
      const catLower = selectedCategory.toLowerCase();
      result = result.filter((car: any) => {
        const name = (car.name || '').toLowerCase();
        const make = (typeof car.make === 'string' ? car.make : car.make?.name || car.brand || '').toLowerCase();
        const model = (typeof car.model === 'string' ? car.model : car.model?.name || '').toLowerCase();
        return name.includes(catLower) || make.includes(catLower) || model.includes(catLower);
      });
    }

    // Filter by text search query
    if (inputQuery.trim()) {
      const query = inputQuery.toLowerCase().trim();
      result = result.filter((car: any) => {
        const name = (car.name || '').toLowerCase();
        const description = (car.description || '').toLowerCase();
        const make = (typeof car.make === 'string' ? car.make : car.make?.name || car.brand || '').toLowerCase();
        const model = (typeof car.model === 'string' ? car.model : car.model?.name || '').toLowerCase();
        const year = (car.year ? car.year.toString() : '');
        return (
          name.includes(query) ||
          description.includes(query) ||
          make.includes(query) ||
          model.includes(query) ||
          year.includes(query)
        );
      });
    }

    // Filter by price range
    if (minPrice.trim()) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((car: any) => parseFloat(car.price) >= min);
      }
    }
    if (maxPrice.trim()) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((car: any) => parseFloat(car.price) <= max);
      }
    }

    return result;
  }, [allCars, selectedCategory, inputQuery, minPrice, maxPrice]);

  const renderCarCard = ({ item }: { item: any; index: number }) => {
    const productImage = item.images && item.images.length > 0 ? item.images[0].image : null;
    const isAuction = isActiveAuction(item);

    return (
      <View className="w-1/2 px-2 mb-4">
        <TouchableOpacity 
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative"
          activeOpacity={0.8}
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
          <View className="w-full h-[150px] bg-gray-100">
            {productImage ? (
              <Image source={{ uri: productImage }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <icons.empty width={50} height={50} />
                <Text className="text-gray-400 text-xs mt-1">No Image</Text>
              </View>
            )}
          </View>
          <View className="p-3">
            <Text className="font-NunitoBold text-gray-900 text-sm mb-1" numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-center mb-1.5">
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
  };

  return (
    <SafeAreaView className="bg-white flex-1" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className={`flex-row items-center justify-between ${CONTAINER_PADDING} py-4`}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-NunitoBold text-gray-900">All Uploaded Cars</Text>
        <TouchableOpacity 
          onPress={() => {
            if (!checkUploadPermission()) return;
            router.push(sellerRoutes.uploadProducts);
          }}
          disabled={isPendingApproval}
          className={`p-2 rounded-full items-center justify-center ${isPendingApproval ? 'bg-gray-300' : 'bg-primary-500'}`}
        >
          <PlusIcon size={25} color="white" />
        </TouchableOpacity>
      </View>

      <SearchBarWithCategories
        searchQuery={inputQuery}
        setSearchQuery={handleSearchChange}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleCategoryChange}
        categories={categoryOptions}
        onFilterPress={handleFilterPress}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={handlePriceChange}
        onApplySearch={handleApplySearch}
        onResetSearch={handleResetSearch}
        isSearching={false}
      />

      {/* Cars Grid */}
      {loading ? (
        <LoadingSpinner 
          message="Loading Cars"
          subMessage="Fetching your uploaded cars..."
          size="medium"
        />
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-red-50 rounded-3xl p-8 items-center">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
              <Text className="text-red-500 text-2xl">⚠️</Text>
            </View>
            <Text className="text-red-700 font-NunitoBold text-lg mb-2">Error Loading Cars</Text>
            <Text className="text-red-600 text-center mb-4">
              {error instanceof Error ? error.message : 'Failed to fetch cars'}
            </Text>
            <TouchableOpacity 
              onPress={() => refetch()}
              className="bg-red-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-NunitoMedium">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : filteredCars.length > 0 ? (
        <FlatList
          data={filteredCars}
          renderItem={renderCarCard}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
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
            paddingHorizontal: CARD_PADDING,
            paddingBottom: SCROLL_PADDING_BOTTOM,
          }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={true}
        />
      ) : allCars.length > 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-gray-50 rounded-3xl p-8 items-center w-full">
            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-6">
              <icons.empty width={40} height={40} />
            </View>
            <Text className="text-gray-700 font-NunitoBold text-lg mb-2">No Matching Cars</Text>
            <Text className="text-gray-500 text-center mb-6">
              No cars match your search criteria. Try adjusting your filters.
            </Text>
            <TouchableOpacity 
              onPress={handleResetSearch}
              className="bg-primary-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-NunitoMedium">Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-gray-50 rounded-3xl p-8 items-center">
            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-6">
              <icons.empty width={40} height={40} />
            </View>
            <Text className="text-gray-700 font-NunitoBold text-lg mb-2">No Cars Uploaded</Text>
            <Text className="text-gray-500 text-center mb-6">
              You haven't uploaded any cars yet. Start by adding your first car listing.
            </Text>
            <TouchableOpacity 
              onPress={() => {
                if (!checkUploadPermission()) return;
                router.push(sellerRoutes.uploadProducts);
              }}
              className="bg-primary-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-NunitoMedium">Upload Your First Car</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemType="car"
        itemName={selectedItem?.name || ''}
      />

      <ProfileCompletionModal
        isVisible={showProfileModal}
        roleName={roleName}
        onComplete={() => setShowProfileModal(false)}
        onClose={() => setShowProfileModal(false)}
        isPending={isPendingApproval}
      />

      <SubscriptionGateModal
        isVisible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        usedUploads={totalProductsCount}
        roleName={roleName}
      />
    </SafeAreaView>
  )
}

export default AllCars
