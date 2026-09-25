import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeftIcon, PlusIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline'
import { router } from 'expo-router'
import { LAYOUT } from '@/constants/units'
import { sellerRoutes } from '@/constants/routes'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import RentedCarCard from '@/components/cards/RentedCarCard'
import LoadingErrorWrapper from '@/components/LoadingErrorWrapper'
import { useQuery } from '@tanstack/react-query'
import { useActiveRoleProfile, usePrimaryUserProfile, useMerchantProfile } from '@/hooks/useUserProfile'
import { useCategories, useProducts } from '@/hooks/useProducts'
import { productsAPI } from '@/lib/api/products'
import ProfileCompletionModal from '@/components/modals/ProfileCompletionModal'
import SubscriptionGateModal from '@/components/modals/SubscriptionGateModal'
import { useSellerUploadGate } from '@/hooks/useSellerUploadGate'

const { CONTAINER_PADDING } = LAYOUT;

const CAR_CATEGORY_ID = 23;

const AllRentedCars = () => {
  const [inputQuery, setInputQuery] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)

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

  // Fetch rental cars from API with search and filter parameters
  const {
    data: allRentedCars = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', merchantId, 'rental-cars', CAR_CATEGORY_ID, inputQuery, minPrice, maxPrice],
    queryFn: async () => {
      const response = await productsAPI.getProducts(
        CAR_CATEGORY_ID, // categoryId - filter by car category (23)
        minPrice || undefined, // minPrice
        maxPrice || undefined, // maxPrice
        undefined, // offset
        undefined, // limit
        merchantId, // merchantId
        true // isRental - fetch only rental cars
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

  // Apply client-side filtering for search only
  const rentedCars = useMemo(() => {
    let filtered = allRentedCars;



    // Filter by search query (name, description, and other available fields)
    if (inputQuery.trim()) {
      const query = inputQuery.toLowerCase().trim();
      filtered = filtered.filter((car: any) => {
        // Safe string conversion with type checking for common product fields
        const name = (typeof car.name === 'string' ? car.name.toLowerCase() : '') || '';
        const description = (typeof car.description === 'string' ? car.description.toLowerCase() : '') || '';

        // Check if car has make/model properties or if they're in a different structure
        const make = (typeof car.make === 'string' ? car.make.toLowerCase() :
                     typeof car.brand === 'string' ? car.brand.toLowerCase() : '') || '';
        const model = (typeof car.model === 'string' ? car.model.toLowerCase() : '') || '';
        const year = (car.year ? car.year.toString() : '') || '';

        return name.includes(query) ||
               description.includes(query) ||
               make.includes(query) ||
               model.includes(query) ||
               year.includes(query);
      });
    }



    return filtered;
  }, [allRentedCars, inputQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setInputQuery(text);
  }, []);

  const handlePriceChange = useCallback((field: 'min' | 'max', value: string) => {
    if (field === 'min') {
      setMinPrice(value);
    } else {
      setMaxPrice(value);
    }
  }, []);

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    // The query will automatically refetch due to dependency changes
  };

  const handleResetFilters = () => {
    setInputQuery("");
    setMinPrice("");
    setMaxPrice("");
    setShowFilterModal(false);
    // The query will automatically refetch due to dependency changes
  };

  // Pull-to-refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing rental cars:', error);
      // The LoadingErrorWrapper will handle displaying the error to the user
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleDeleteItem = (item: any) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);

    if (!selectedItem?.id) return;

    try {
      // Call delete API
      await productsAPI.deleteProduct(selectedItem.id);

      // Refetch the list to update UI
      await refetch();

      // Navigate to success page
      setTimeout(() => {
        router.push({
          pathname: sellerRoutes.deleteSuccess as any,
          params: { itemType: 'rentedCar' }
        });
      }, 300);

    } catch (error) {
      console.error('❌ Error deleting rental car:', error);
      // TODO: Show user-friendly error toast/alert
      // For now, the error will be logged and the UI will remain unchanged
    }
  };

  const renderCarCard = (car: any) => {
    return (
      <RentedCarCard
        key={car.id}
        car={car}
        onPress={() => {
          router.push({
            pathname: sellerRoutes.productDetails as any,
            params: {
              productType: 'rentedCar',
              productId: car.id
            }
          });
        }}
        onDelete={handleDeleteItem}
      />
    )
  }

  // Empty state component
  const EmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <Text className="text-6xl mb-4">🚗</Text>
      <Text className="text-xl font-NunitoBold text-gray-800 text-center mb-2">
        No Rental Cars Yet
      </Text>
      <Text className="text-gray-600 font-NunitoMedium text-center mb-6 leading-6">
        You haven't uploaded any cars for rent yet. Start by adding your first rental car to attract customers.
      </Text>
      <TouchableOpacity
        onPress={() => {
          if (!checkUploadPermission()) return;
          router.push(sellerRoutes.uploadCarToRent as any);
        }}
        className="bg-primary-500 px-6 py-3 rounded-xl flex-row items-center"
      >
        <PlusIcon size={20} color="white" />
        <Text className="text-white font-NunitoBold ml-2">Add Rental Car</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="bg-white flex-1" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className={`flex-row items-center justify-between ${CONTAINER_PADDING} py-4`}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-NunitoBold text-gray-900">All Rented Cars</Text>
        <TouchableOpacity
          onPress={() => {
            if (!checkUploadPermission()) return;
            router.push(sellerRoutes.uploadCarToRent as any);
          }}
          disabled={isPendingApproval}
          className={`p-2 rounded-full items-center justify-center ${isPendingApproval ? 'bg-gray-300' : 'bg-primary-500'}`}
        >
          <PlusIcon size={25} color="white" />
        </TouchableOpacity>
      </View>

      <LoadingErrorWrapper
        isLoading={isLoading && !refreshing}
        error={error}
        onRetry={refetch}
        loadingMessage="Loading Rental Cars..."
        loadingSubMessage="Please wait while we fetch your rental cars"
        isEmpty={!isLoading && !error && allRentedCars.length === 0}
        emptyState={<EmptyState />}
        className="flex-1"
      >
        {/* Custom Search Bar without Categories */}
      <View className={`${CONTAINER_PADDING} mb-6`}>
        <View
          className="flex-row items-center bg-white rounded-2xl px-3 py-2 border border-primary-200"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="mr-4">
            <MagnifyingGlassIcon size={20} color="#6B7280" />
          </View>

          <View className="flex-1 relative">
            <TextInput
              placeholder="Search rental cars..."
              value={inputQuery}
              onChangeText={handleSearchChange}
              className="text-base font-NunitoMedium text-gray-900"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Clear Button */}
          {inputQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setInputQuery("")}
              className="mr-2 p-1"
              activeOpacity={0.7}
            >
              <View className="w-5 h-5 bg-gray-300 rounded-full items-center justify-center">
                <Text className="text-gray-600 text-xs font-NunitoBold">×</Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="border-l border-primary-100 flex-row">
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              className="ml-2 px-4 py-2 rounded-xl bg-red-50 flex-row items-center"
              activeOpacity={0.7}
            >
              <View className="w-4 h-4 mr-2">
                <View className="w-full h-0.5 bg-primary-500 mb-1" />
                <View className="w-3 h-0.5 bg-primary-500 mb-1" />
                <View className="w-full h-0.5 bg-primary-500" />
              </View>
              <Text className="text-primary-500 font-NunitoBold text-lg">
                Filter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Cars List */}
      <ScrollView
        className="flex-1"
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
      >
        <View className={`${CONTAINER_PADDING} py-4`}>
          {rentedCars.length > 0 ? (
            rentedCars.map(renderCarCard)
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-500 text-center text-lg font-NunitoMedium">
                No rental cars found
              </Text>
              <Text className="text-gray-400 text-center text-sm font-NunitoRegular mt-2">
                {inputQuery || minPrice || maxPrice
                  ? 'Try adjusting your search filters'
                  : 'Start by adding your first rental car'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </LoadingErrorWrapper>

      {/* Delete Confirmation Modal */}
          <DeleteConfirmationModal
            visible={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
            itemType="rentedCar"
            itemName={selectedItem?.name || ''}
          />

          {/* Price Filter Modal */}
          <Modal
            visible={showFilterModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFilterModal(false)}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)" }}
              activeOpacity={1}
              onPress={() => setShowFilterModal(false)}
            >
              <View className="flex-1 justify-end">
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <View className="bg-white rounded-t-3xl p-6">
                    <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

                    <Text className="text-xl font-NunitoBold text-gray-900 mb-6 text-center">
                      Filter Rental Cars
                    </Text>

                    {/* Price Range */}
                    <View className="mb-6">
                      <Text className="font-NunitoBold text-gray-700 mb-3">
                        Price Range
                      </Text>
                      <View className="space-y-3">
                        <View>
                          <Text className="text-gray-500 mb-2">Min Price</Text>
                          <TextInput
                            value={minPrice}
                            onChangeText={(text) => handlePriceChange('min', text)}
                            className="border border-gray-300 rounded-xl px-4 py-3 text-base font-NunitoMedium"
                            placeholder="Enter minimum price"
                            keyboardType="numeric"
                          />
                        </View>
                        <View>
                          <Text className="text-gray-500 mb-2">Max Price</Text>
                          <TextInput
                            value={maxPrice}
                            onChangeText={(text) => handlePriceChange('max', text)}
                            className="border border-gray-300 rounded-xl px-4 py-3 text-base font-NunitoMedium"
                            placeholder="Enter maximum price"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row space-x-3">
                      <TouchableOpacity
                        onPress={handleResetFilters}
                        className="flex-1 py-4 border border-gray-300 rounded-xl items-center"
                        activeOpacity={0.7}
                      >
                        <Text className="text-gray-700 font-NunitoBold text-base">
                          Reset
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleApplyFilters}
                        className="flex-1 py-4 bg-primary-500 rounded-xl items-center"
                        activeOpacity={0.7}
                      >
                        <Text className="text-white font-NunitoBold text-base">
                          Apply Filters
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

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

    export default AllRentedCars