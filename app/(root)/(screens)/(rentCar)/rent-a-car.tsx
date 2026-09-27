"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { LAYOUT } from "@/constants/units"
import { routes } from "@/constants/routes"
import RentalCarCard from "@/components/cards/RentalCarCard"
import BackArrowBtn from "@/components/BackArrowBtn"
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "react-native-heroicons/outline"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { productsAPI } from "@/lib/api/products"
import LoadingSpinner from "@/components/LoadingSpinner"
import PriceRangeSlider from "@/components/PriceRangeSlider"

interface RentalCar {
  id: string
  name: string
  transmission: string
  pricePerDay: number
  image: string
  images: string[]
  category: string
  body_type: string
  make: string
}

const RentACarScreen = () => {
  const { CONTAINER_PADDING } = LAYOUT

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("All") // "All", "car", "van", "truck"
  const [selectedMake, setSelectedMake] = useState("All")
  
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch rental cars from API
  const {
    data: rentalCarsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rental-cars', minPrice, maxPrice, searchQuery],
    queryFn: async () => {
      if (searchQuery.trim()) {
        const searchResults = await productsAPI.searchProducts(
          searchQuery,
          undefined,
          minPrice || undefined,
          maxPrice || undefined,
          undefined,
          true
        );
        return { data: { results: searchResults } };
      } else {
        const response = await productsAPI.getProducts(
          undefined,
          minPrice || undefined,
          maxPrice || undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        return response;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const rentalCarsData = (() => {
    const data = rentalCarsResponse?.data;
    if (!data) return [];
    return Array.isArray(data) ? data : (data?.results || []);
  })();

  const transformRentalCar = (car: any): RentalCar => {
    const images = car.images?.map((img: any) => img.image) || [];
    return {
      id: car.id,
      name: car.name || 'Unknown Car',
      transmission: car.transmission || 'Automatic',
      pricePerDay: parseFloat(car.price || 0),
      image: images[0] || 'https://via.placeholder.com/300x200/f3f4f6/9ca3af?text=No+Image',
      images: images.length > 0 ? images : ['https://via.placeholder.com/300x200/f3f4f6/9ca3af?text=No+Image'],
      category: car.body_type || 'car',
      body_type: car.body_type,
      make: car.make,
    };
  };

  const rentalCars: RentalCar[] = rentalCarsData.map(transformRentalCar);

  // Compute counts for categories (All, Cars, Towing Van, Truck)
  const categoryCounts = useMemo(() => {
    const counts = { All: 0, car: 0, van: 0, truck: 0 };
    rentalCars.forEach(car => {
      counts.All++;
      if (car.body_type === 'car') counts.car++;
      else if (car.body_type === 'van') counts.van++;
      else if (car.body_type === 'truck') counts.truck++;
    });
    return counts;
  }, [rentalCars]);

  // Dynamically extract unique makes with counts for the selected category
  const makeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    rentalCars.forEach(car => {
      if (selectedType === 'All' || car.body_type === selectedType) {
        if (car.make) {
          counts[car.make] = (counts[car.make] || 0) + 1;
        }
      }
    });

    const options = Object.entries(counts).map(([name, count]) => ({
      label: `${name} (${count})`,
      value: name,
      name: name,
      count: count,
    }));

    options.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return options;
  }, [rentalCars, selectedType]);

  const totalCarsForSelectedType = useMemo(() => {
    return rentalCars.filter(car => selectedType === 'All' || car.body_type === selectedType).length;
  }, [rentalCars, selectedType]);

  // Automatically reset selectedMake if it is no longer available in makeOptions
  useEffect(() => {
    if (selectedMake !== "All") {
      const makeExists = makeOptions.some(option => option.value === selectedMake);
      if (!makeExists) {
        setSelectedMake("All");
      }
    }
  }, [selectedType, makeOptions, selectedMake]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredCars = useMemo(() =>
    rentalCars.filter((car) => {
      const matchesType = selectedType === "All" || car.body_type === selectedType;
      const matchesMake = selectedMake === "All" || car.make === selectedMake;
      return matchesType && matchesMake;
    }),
    [rentalCars, selectedType, selectedMake]
  );

  const handleResetSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedType("All");
    setSelectedMake("All");
    setMinPrice("");
    setMaxPrice("");
    setShowFilters(false);
  }, []);

  const isPriceFilterActive = Boolean(minPrice || maxPrice);
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedType !== "All" ||
    selectedMake !== "All" ||
    isPriceFilterActive
  );

  const vehicleTypes = [
    { id: "All", label: "All Vehicles", icon: "car-multiple", count: categoryCounts.All },
    { id: "car", label: "Cars", icon: "car-side", count: categoryCounts.car },
    { id: "van", label: "Towing Service", icon: "tow-truck", count: categoryCounts.van },
    { id: "truck", label: "Trucks", icon: "truck", count: categoryCounts.truck },
  ];

  const renderCarCard = useCallback(({ item }: { item: RentalCar }) => (
    <View className="px-5">
      <RentalCarCard
        item={item}
        onPress={(car) => {
          router.push({
            pathname: routes?.carRentalDetail,
            params: { carId: car.id, carName: car.name, pricePerDay: car.pricePerDay },
          });
        }}
      />
    </View>
  ), []);

  const ListHeader = useMemo(() => {
    return (
      <View className="mb-2">
        {/* Search & Filter Bar */}
        <View className="px-5 pt-1 pb-3">
          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 flex-row items-center bg-white rounded-2xl px-3.5 py-2.5 border border-gray-300">
              <MagnifyingGlassIcon size={19} color="#94A3B8" />
              <TextInput
                placeholder="Search cars, towing, trucks..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2.5 text-[14px] font-NunitoSemiBold text-gray-900"
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
              />
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  className="w-5 h-5 rounded-full bg-gray-200 items-center justify-center mr-1"
                  activeOpacity={0.7}
                >
                  <XMarkIcon size={12} color="#475569" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              className={`w-11 h-11 items-center justify-center rounded-2xl border ${
                isPriceFilterActive
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-gray-300'
              }`}
              activeOpacity={0.8}
            >
              <AdjustmentsHorizontalIcon
                size={20}
                color={isPriceFilterActive ? '#FFFFFF' : '#334155'}
              />
              {isPriceFilterActive && (
                <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Vehicle Types */}
        <View className="mb-2">
          <FlatList
            data={vehicleTypes}
            renderItem={({ item }) => {
              const isSelected = selectedType === item.id;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedType(item.id);
                    if (item.id === 'van' || item.id === 'truck') setSelectedMake("All");
                  }}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-4 py-2.5 rounded-2xl mr-2.5 ${
                    isSelected
                      ? 'bg-primary-500 shadow-sm shadow-primary-500/30'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={isSelected ? '#FFFFFF' : '#64748B'}
                  />
                  <Text className={`ml-2 text-xs font-NunitoBold ${
                    isSelected ? 'text-white' : 'text-gray-700'
                  }`}>
                    {item.label}
                  </Text>
                  <View className={`ml-2 px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/25' : 'bg-gray-100'
                  }`}>
                    <Text className={`text-[10px] font-NunitoExtraBold ${
                      isSelected ? 'text-white' : 'text-gray-500'
                    }`}>
                      {isLoading ? '-' : item.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ overflow: 'visible' }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        {/* Brand / Make Chips */}
        {makeOptions.length > 0 && (
          <View className="pb-2">
            <FlatList
              data={[{ name: "All Brands", value: "All", count: totalCarsForSelectedType }, ...makeOptions]}
              renderItem={({ item }) => {
                const isSelected = selectedMake === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedMake(item.value)}
                    activeOpacity={0.8}
                    className={`px-3.5 py-1.5 rounded-xl mr-2 flex-row items-center ${
                      isSelected
                        ? 'bg-gray-900 border border-gray-900 shadow-sm'
                        : 'bg-white border border-gray-200/90 shadow-sm'
                    }`}
                  >
                    <Text className={`text-[12px] font-NunitoBold ${
                      isSelected ? 'text-white' : 'text-gray-700'
                    }`}>
                      {item.name}
                    </Text>
                    <Text className={`text-[10px] font-NunitoSemiBold ml-1.5 ${
                      isSelected ? 'text-gray-300' : 'text-gray-400'
                    }`}>
                      ({item.count})
                    </Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={item => item.value}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ overflow: 'visible' }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 6 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Active Filter Chips */}
        {(isPriceFilterActive || selectedMake !== "All" || selectedType !== "All") && (
          <View className="px-5 mb-2 flex-row flex-wrap items-center gap-2">
            {selectedType !== "All" && (
              <TouchableOpacity
                onPress={() => setSelectedType("All")}
                className="bg-gray-100 border border-gray-200 rounded-full px-3 py-1 flex-row items-center gap-1.5"
              >
                <Text className="text-[11px] font-NunitoBold text-gray-700">
                  Type: {selectedType === 'van' ? 'Towing' : selectedType === 'truck' ? 'Trucks' : 'Cars'}
                </Text>
                <XMarkIcon size={12} color="#64748B" />
              </TouchableOpacity>
            )}

            {selectedMake !== "All" && (
              <TouchableOpacity
                onPress={() => setSelectedMake("All")}
                className="bg-gray-100 border border-gray-200 rounded-full px-3 py-1 flex-row items-center gap-1.5"
              >
                <Text className="text-[11px] font-NunitoBold text-gray-700">
                  Brand: {selectedMake}
                </Text>
                <XMarkIcon size={12} color="#64748B" />
              </TouchableOpacity>
            )}

            {isPriceFilterActive && (
              <TouchableOpacity
                onPress={() => { setMinPrice(""); setMaxPrice(""); }}
                className="bg-red-50 border border-red-100 rounded-full px-3 py-1 flex-row items-center gap-1.5"
              >
                <Text className="text-[11px] font-NunitoBold text-red-600">
                  Price: ₦{minPrice || '0'} - ₦{maxPrice || 'Any'}
                </Text>
                <XMarkIcon size={12} color="#DC2626" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleResetSearch}
              className="px-2 py-1"
            >
              <Text className="text-[11px] font-NunitoBold text-gray-400">Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results Counter & Section Bar */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-2">
          <View className="flex-row items-center">
            <Text className="text-sm font-NunitoExtraBold text-gray-900">Available Vehicles</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-2" />
            <Text className="text-xs font-NunitoSemiBold text-gray-500">
              {filteredCars.length} {filteredCars.length === 1 ? 'vehicle' : 'vehicles'}
            </Text>
          </View>
          {filteredCars.length > 0 && (
            <View className="flex-row items-center bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
              <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
              <Text className="text-[10px] font-NunitoBold text-green-700">Instant Booking</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [
    searchQuery,
    isPriceFilterActive,
    selectedType,
    selectedMake,
    vehicleTypes,
    makeOptions,
    totalCarsForSelectedType,
    filteredCars.length,
    minPrice,
    maxPrice,
    isLoading,
    handleResetSearch,
  ]);

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View className="py-16 items-center justify-center">
          <LoadingSpinner message="Searching available vehicles..." size="medium" />
        </View>
      );
    }

    if (error) {
      return (
        <View className="mx-5 my-8 p-6 bg-white rounded-3xl border border-red-100 items-center shadow-sm">
          <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center mb-3">
            <MaterialCommunityIcons name="alert-circle-outline" size={26} color="#DC2626" />
          </View>
          <Text className="text-base font-NunitoExtraBold text-gray-900 mb-1">
            Unable to Load Vehicles
          </Text>
          <Text className="text-xs font-NunitoMedium text-gray-500 text-center mb-4 leading-relaxed">
            We encountered a problem fetching vehicle rentals. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-primary-500 px-6 py-2.5 rounded-xl shadow-sm"
          >
            <Text className="text-xs font-NunitoBold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="mx-5 my-8 p-8 bg-white rounded-3xl border border-gray-100 items-center shadow-sm">
        <View className="w-14 h-14 rounded-full bg-gray-50 items-center justify-center mb-3 border border-gray-100">
          <MaterialCommunityIcons name="car-off" size={28} color="#94A3B8" />
        </View>
        <Text className="text-base font-NunitoExtraBold text-gray-900 mb-1">
          No Vehicles Found
        </Text>
        <Text className="text-xs font-NunitoMedium text-gray-500 text-center mb-5 leading-relaxed max-w-[260px]">
          No rentals matched your current filters. Try changing your search query, vehicle type, or price budget.
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity
            onPress={handleResetSearch}
            className="bg-gray-900 px-6 py-2.5 rounded-xl shadow-sm"
          >
            <Text className="text-xs font-NunitoBold text-white">Reset All Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, error, hasActiveFilters, handleResetSearch, refetch]);

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]" edges={["top"]}>
      {/* Header Bar */}
      <View className="flex-row items-center justify-between py-3 px-5">
        <BackArrowBtn />
        <Text className="text-lg font-NunitoExtraBold text-gray-900">Vehicle Rental</Text>
        {hasActiveFilters ? (
          <TouchableOpacity
            onPress={handleResetSearch}
            className="bg-red-50 border border-red-100/80 px-2.5 py-1 rounded-full flex-row items-center"
            activeOpacity={0.7}
          >
            <ArrowPathIcon size={12} color="#DC2626" />
            <Text className="text-[11px] font-NunitoBold text-red-600 ml-1">Reset</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* Main Single FlatList */}
      <FlatList
        data={isLoading || error ? [] : filteredCars}
        renderItem={renderCarCard}
        keyExtractor={(car) => car.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
      />

      {/* Price Filter Bottom Sheet Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/40" 
          activeOpacity={1} 
          onPress={() => setShowFilters(false)} 
        />
        <View className="bg-white rounded-t-[32px] px-6 pt-4 pb-10 absolute bottom-0 left-0 right-0 shadow-2xl">
          {/* Pull Handle */}
          <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6" />
          
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xl font-NunitoExtraBold text-gray-900">Price Range</Text>
              <Text className="text-xs font-NunitoMedium text-gray-500">Set your daily rental budget</Text>
            </View>
            <TouchableOpacity 
              onPress={() => { setMinPrice(""); setMaxPrice(""); }}
              className="bg-gray-100 px-3.5 py-1.5 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-NunitoBold text-gray-600">Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Preset Buttons */}
          <View className="flex-row gap-2 mb-5">
            <TouchableOpacity
              onPress={() => { setMinPrice("0"); setMaxPrice("50000"); }}
              className={`flex-1 py-2 rounded-xl items-center border ${
                minPrice === "0" && maxPrice === "50000"
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-[11px] font-NunitoBold ${
                minPrice === "0" && maxPrice === "50000" ? 'text-primary-600' : 'text-gray-600'
              }`}>
                &lt; ₦50k
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setMinPrice("50000"); setMaxPrice("150000"); }}
              className={`flex-1 py-2 rounded-xl items-center border ${
                minPrice === "50000" && maxPrice === "150000"
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-[11px] font-NunitoBold ${
                minPrice === "50000" && maxPrice === "150000" ? 'text-primary-600' : 'text-gray-600'
              }`}>
                ₦50k - ₦150k
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setMinPrice("150000"); setMaxPrice("1000000"); }}
              className={`flex-1 py-2 rounded-xl items-center border ${
                minPrice === "150000" && maxPrice === "1000000"
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-[11px] font-NunitoBold ${
                minPrice === "150000" && maxPrice === "1000000" ? 'text-primary-600' : 'text-gray-600'
              }`}>
                &gt; ₦150k
              </Text>
            </TouchableOpacity>
          </View>

          {/* Visual Slider */}
          <View className="mb-6">
            <PriceRangeSlider 
              min={0}
              max={1000000}
              initialMin={parseInt(minPrice) || 0}
              initialMax={parseInt(maxPrice) || 1000000}
              onValueChange={(low, high) => {
                setMinPrice(low.toString());
                setMaxPrice(high.toString());
              }}
            />
          </View>
          
          {/* Min & Max Inputs */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-[11px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                Minimum (₦)
              </Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 flex-row items-center">
                <Text className="text-gray-400 font-NunitoBold mr-1.5">₦</Text>
                <TextInput
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholder="0"
                  keyboardType="numeric"
                  className="flex-1 text-sm font-NunitoBold text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                Maximum (₦)
              </Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 flex-row items-center">
                <Text className="text-gray-400 font-NunitoBold mr-1.5">₦</Text>
                <TextInput
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholder="Any"
                  keyboardType="numeric"
                  className="flex-1 text-sm font-NunitoBold text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Apply CTA */}
          <TouchableOpacity 
            onPress={() => setShowFilters(false)}
            className="bg-primary-500 py-4 rounded-2xl items-center shadow-lg shadow-primary-500/25"
            activeOpacity={0.85}
          >
            <Text className="font-NunitoExtraBold text-white text-base">
              Show Available Vehicles
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default RentACarScreen