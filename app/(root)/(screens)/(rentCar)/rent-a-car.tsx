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
import { router, useLocalSearchParams } from "expo-router"
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
import SpecialistIconBtn from "@/components/SpecialistIconBtn"
import Animated, { FadeInDown } from "react-native-reanimated"

interface RentalCar {
  id: string
  name: string
  transmission: string
  pricePerDay: number
  image: string
  images: string[]
  category: string
  body_type: string
  normalizedType: 'car' | 'van' | 'truck'
  make: string
  rating?: string | number
  seats?: number
  fuel_type?: string
}

const RentACarScreen = () => {
  const { CONTAINER_PADDING } = LAYOUT
  const params = useLocalSearchParams<{ type?: string; vehicleType?: string }>()

  const initialType = useMemo(() => {
    const rawType = (params?.type || params?.vehicleType)?.toLowerCase()
    if (rawType === "van" || rawType === "towing" || rawType === "towing_van" || rawType === "tow") {
      return "van"
    }
    if (rawType === "car" || rawType === "cars") {
      return "car"
    }
    if (rawType === "truck" || rawType === "trucks") {
      return "truck"
    }
    return "All"
  }, [params?.type, params?.vehicleType])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState(initialType) // "All", "car", "van", "truck"
  const [selectedMake, setSelectedMake] = useState("All")

  useEffect(() => {
    const rawType = (params?.type || params?.vehicleType)?.toLowerCase()
    if (rawType === "van" || rawType === "towing" || rawType === "towing_van" || rawType === "tow") {
      setSelectedType("van")
      setSelectedMake("All")
    } else if (rawType === "car" || rawType === "cars") {
      setSelectedType("car")
    } else if (rawType === "truck" || rawType === "trucks") {
      setSelectedType("truck")
    }
  }, [params?.type, params?.vehicleType])
  
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

  const isTowingVehicle = (car: any) => {
    const bt = (car.body_type || '').toLowerCase();
    const name = (car.name || '').toLowerCase();
    const cat = (car.category?.name || car.category || '').toLowerCase();
    return bt === 'van' || bt === 'towing' || bt.includes('tow') || name.includes('tow') || cat.includes('tow') || name.includes('flatbed');
  };

  const isTruckVehicle = (car: any) => {
    const bt = (car.body_type || '').toLowerCase();
    const name = (car.name || '').toLowerCase();
    const cat = (car.category?.name || car.category || '').toLowerCase();
    return bt === 'truck' || bt.includes('truck') || name.includes('truck') || cat.includes('truck');
  };

  const getVehicleNormalizedCategory = (car: any): 'car' | 'van' | 'truck' => {
    if (isTowingVehicle(car)) return 'van';
    if (isTruckVehicle(car)) return 'truck';
    return 'car';
  };

  const rentalCarsData = (() => {
    if (!rentalCarsResponse) return [];
    const r = rentalCarsResponse as any;
    if (Array.isArray(r)) return r;
    if (Array.isArray(r.results)) return r.results;
    if (Array.isArray(r.data)) return r.data;
    if (Array.isArray(r.data?.results)) return r.data.results;
    return [];
  })();

  const transformRentalCar = (car: any): RentalCar => {
    const images = car.images?.map((img: any) => img.image) || [];
    const normalizedType = getVehicleNormalizedCategory(car);
    return {
      id: car.id,
      name: car.name || 'Unknown Car',
      transmission: car.transmission || 'Automatic',
      pricePerDay: parseFloat(car.price || 0),
      image: images[0] || 'https://via.placeholder.com/300x200/f3f4f6/9ca3af?text=No+Image',
      images: images.length > 0 ? images : ['https://via.placeholder.com/300x200/f3f4f6/9ca3af?text=No+Image'],
      category: normalizedType,
      body_type: car.body_type || normalizedType,
      normalizedType,
      make: car.make,
      rating: car.rating,
      seats: car.number_of_seats || car.seats,
      fuel_type: car.fuel_type,
    };
  };

  const rentalCars: RentalCar[] = rentalCarsData.map(transformRentalCar);

  // Compute counts for categories (All, Cars, Towing, Trucks)
  const categoryCounts = useMemo(() => {
    const counts = { All: 0, car: 0, van: 0, truck: 0 };
    rentalCars.forEach(car => {
      counts.All++;
      const type = car.normalizedType || getVehicleNormalizedCategory(car);
      if (type === 'van') counts.van++;
      else if (type === 'truck') counts.truck++;
      else counts.car++;
    });
    return counts;
  }, [rentalCars]);

  // Dynamically extract unique makes with counts for the selected category
  const makeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    rentalCars.forEach(car => {
      const type = car.normalizedType || getVehicleNormalizedCategory(car);
      if (selectedType === 'All' || type === selectedType) {
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
    return rentalCars.filter(car => {
      const type = car.normalizedType || getVehicleNormalizedCategory(car);
      return selectedType === 'All' || type === selectedType;
    }).length;
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
      const type = car.normalizedType || getVehicleNormalizedCategory(car);
      const matchesType = selectedType === "All" || type === selectedType;
      const matchesMake = selectedMake === "All" || car.make?.toLowerCase() === selectedMake.toLowerCase();
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
    { id: "van", label: "Towing", icon: "tow-truck", count: categoryCounts.van },
    { id: "truck", label: "Trucks", icon: "truck", count: categoryCounts.truck },
  ];

  const renderCarCard = useCallback(({ item, index }: { item: RentalCar; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 60, 360)).duration(350).springify()}
      className="px-4"
    >
      <RentalCarCard
        item={item}
        onPress={(car) => {
          router.push({
            pathname: routes?.carRentalDetail,
            params: { carId: car.id, carName: car.name, pricePerDay: car.pricePerDay },
          });
        }}
      />
    </Animated.View>
  ), []);

  const ListHeader = useMemo(() => {
    return (
      <View className="mb-2">
        {/* Search & Filter Bar (Shop style: integrated filter button) */}
        <View className="px-4 pt-2.5 pb-2.5">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}
          >
            <MagnifyingGlassIcon size={19} color="#9CA3AF" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search cars, towing, trucks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-[14px] font-NunitoSemiBold text-gray-900"
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="w-5 h-5 rounded-full bg-gray-100 items-center justify-center mr-2"
                activeOpacity={0.7}
              >
                <XMarkIcon size={12} color="#6B7280" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              activeOpacity={0.75}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: isPriceFilterActive ? "#D30309" : "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AdjustmentsHorizontalIcon
                size={18}
                color={isPriceFilterActive ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Chips (Shop style: sleek rounded pills with count badges) */}
        <View style={{ marginBottom: 8 }}>
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
                  activeOpacity={0.75}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 22,
                    marginRight: 8,
                    backgroundColor: isSelected ? "#D30309" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isSelected ? "#D30309" : "#E2E8F0",
                    shadowColor: isSelected ? "#D30309" : "#000",
                    shadowOffset: { width: 0, height: isSelected ? 2 : 1 },
                    shadowOpacity: isSelected ? 0.2 : 0.04,
                    shadowRadius: 3,
                    elevation: isSelected ? 2 : 1,
                  }}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={16}
                    color={isSelected ? "#FFFFFF" : "#64748B"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`text-[13px] mr-2 ${
                      isSelected ? 'font-NunitoBold text-white' : 'font-NunitoSemiBold text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                  <View
                    className={`px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/25' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-NunitoExtraBold ${
                        isSelected ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {isLoading ? '-' : item.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 2 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        {/* 24/7 Emergency Towing Rescue Banner (When Towing filter is active) */}
        {/* {selectedType === 'van' && (
          <View className="px-4 mb-3">
            <View className="bg-[#0F172A] rounded-2xl p-4 overflow-hidden relative border border-slate-800 shadow-sm">
              <MaterialCommunityIcons
                name="tow-truck"
                size={110}
                color="#1E293B"
                style={{ position: 'absolute', right: -15, bottom: -25, opacity: 0.6 }}
              />
              <View className="flex-row items-center gap-2 mb-1.5">
                <View className="w-2 h-2 rounded-full bg-red-500" />
                <Text className="text-[11px] font-NunitoExtraBold text-red-400 uppercase tracking-wider">
                  24/7 Roadside Rescue
                </Text>
              </View>
              <Text className="text-base font-NunitoExtraBold text-white mb-1">
                Need Urgent Towing Assistance?
              </Text>
              <Text className="text-xs font-NunitoMedium text-slate-300 mb-3.5 leading-relaxed max-w-[280px]">
                Stuck on the road? Our technical team dispatches verified flatbed haulers & recovery trucks nationwide.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: routes.chatSpecialist as any,
                    params: {
                      prefill: "Hello, I need urgent emergency towing / dispatch assistance.",
                    },
                  })
                }
                activeOpacity={0.85}
                className="bg-primary-500 py-2 px-4 rounded-xl flex-row items-center self-start gap-2 shadow-sm"
              >
                <MaterialCommunityIcons name="phone-in-talk" size={15} color="#FFFFFF" />
                <Text className="text-xs font-NunitoExtraBold text-white">
                  Contact Emergency Dispatch
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )} */}

        {/* Brand / Make Chips (Shop style secondary row) */}
        {makeOptions.length > 0 && (
          <View style={{ marginTop: 2, marginBottom: 4 }}>
            <FlatList
              data={[{ name: "All Brands", value: "All", count: totalCarsForSelectedType }, ...makeOptions]}
              renderItem={({ item }) => {
                const isSelected = selectedMake === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedMake(item.value)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginRight: 6,
                      backgroundColor: isSelected ? "#111827" : "#F3F4F6",
                    }}
                  >
                    <Text
                      className={`text-[12px] ${
                        isSelected ? 'font-NunitoBold text-white' : 'font-NunitoMedium text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={item => item.value}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 2 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Active Filter Chips */}
        {(isPriceFilterActive || selectedMake !== "All" || selectedType !== "All") && (
          <View style={{ paddingHorizontal: 16, marginTop: 6, marginBottom: 2, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {selectedType !== "All" && (
              <TouchableOpacity
                onPress={() => setSelectedType("All")}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FEF2F2",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                }}
              >
                <Text className="text-[12px] font-NunitoBold text-red-600 mr-1.5">
                  Type: {selectedType === 'van' ? 'Towing' : selectedType === 'truck' ? 'Trucks' : 'Cars'}
                </Text>
                <XMarkIcon size={12} color="#DC2626" />
              </TouchableOpacity>
            )}

            {selectedMake !== "All" && (
              <TouchableOpacity
                onPress={() => setSelectedMake("All")}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FEF2F2",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                }}
              >
                <Text className="text-[12px] font-NunitoBold text-red-600 mr-1.5">
                  Brand: {selectedMake}
                </Text>
                <XMarkIcon size={12} color="#DC2626" />
              </TouchableOpacity>
            )}

            {isPriceFilterActive && (
              <TouchableOpacity
                onPress={() => { setMinPrice(""); setMaxPrice(""); }}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FEF2F2",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                }}
              >
                <Text className="text-[12px] font-NunitoBold text-red-600 mr-1.5">
                  Price: ₦{minPrice || '0'} – ₦{maxPrice || 'Any'}
                </Text>
                <XMarkIcon size={12} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results Counter & Section Bar */}
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <View className="flex-row items-center">
            <Text className="text-sm font-NunitoExtraBold text-gray-900">Available Vehicles</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-2" />
            <Text className="text-xs font-NunitoSemiBold text-gray-500">
              {filteredCars.length} {filteredCars.length === 1 ? 'vehicle' : 'vehicles'}
            </Text>
          </View>
          <View className="flex-row items-center bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
            <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
            <Text className="text-[10px] font-NunitoBold text-green-700">Verified Fleet</Text>
          </View>
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
        <View className="px-4 py-4">
          {[1, 2].map((k) => (
            <View key={k} className="bg-white rounded-3xl p-4 mb-4 border border-gray-100 shadow-sm">
              <View className="w-full h-40 bg-gray-100 rounded-2xl mb-3" />
              <View className="h-5 w-3/5 bg-gray-100 rounded-md mb-2" />
              <View className="h-4 w-2/5 bg-gray-100 rounded-md mb-4" />
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1 h-8 bg-gray-100 rounded-xl" />
                <View className="flex-1 h-8 bg-gray-100 rounded-xl" />
                <View className="flex-1 h-8 bg-gray-100 rounded-xl" />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (error) {
      return (
        <View className="mx-4 my-6 p-6 bg-white rounded-3xl border border-red-100 items-center shadow-sm">
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

    const isTowingEmpty = selectedType === 'van';

    return (
      <View className="mx-4 my-6 p-7 bg-white rounded-3xl border border-gray-100 items-center shadow-sm">
        <View className={`w-16 h-16 rounded-full items-center justify-center mb-3.5 border ${
          isTowingEmpty ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <MaterialCommunityIcons
            name={isTowingEmpty ? 'tow-truck' : 'car-off'}
            size={32}
            color={isTowingEmpty ? '#DC2626' : '#94A3B8'}
          />
        </View>

        <Text className="text-lg font-NunitoExtraBold text-gray-900 mb-1.5 text-center">
          {isTowingEmpty
            ? 'No Towing Vans in Self-Drive Fleet'
            : selectedType === 'car'
            ? 'No Rental Cars Found'
            : selectedType === 'truck'
            ? 'No Trucks Available'
            : 'No Vehicles Found'}
        </Text>

        <Text className="text-xs font-NunitoMedium text-gray-500 text-center mb-5 leading-relaxed max-w-[280px]">
          {isTowingEmpty
            ? 'All self-drive towing vehicles are currently dispatched. For emergency roadside recovery, contact our 24/7 technical dispatch team.'
            : 'No rentals matched your current filters. Try adjusting your vehicle category, search terms, or price range.'}
        </Text>

        <View className="w-full gap-2.5">
          {isTowingEmpty && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: routes.chatSpecialist as any,
                  params: {
                    prefill: "Hello, I need emergency roadside rescue / towing assistance.",
                  },
                })
              }
              className="bg-primary-500 py-3 rounded-xl items-center flex-row justify-center gap-2 shadow-sm"
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="headset" size={16} color="#FFFFFF" />
              <Text className="text-xs font-NunitoExtraBold text-white">
                Request Emergency Rescue
              </Text>
            </TouchableOpacity>
          )}

          {hasActiveFilters && (
            <TouchableOpacity
              onPress={handleResetSearch}
              className="bg-gray-900 py-3 rounded-xl items-center flex-row justify-center gap-2 shadow-sm"
              activeOpacity={0.85}
            >
              <ArrowPathIcon size={14} color="#FFFFFF" />
              <Text className="text-xs font-NunitoBold text-white">
                {isTowingEmpty ? 'View All Available Vehicles' : 'Reset All Filters'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [isLoading, error, hasActiveFilters, selectedType, handleResetSearch, refetch]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header Bar */}
      <View className="flex-row items-center justify-between py-3 px-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-2.5">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoExtraBold text-gray-900">Vehicle Rental</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={handleResetSearch}
              className="bg-red-50 px-3 py-1.5 rounded-full flex-row items-center gap-1 border border-red-100"
              activeOpacity={0.7}
            >
              <XMarkIcon size={13} color="#DC2626" />
              <Text className="text-red-600 text-xs font-NunitoBold">Clear all</Text>
            </TouchableOpacity>
          )}
          <SpecialistIconBtn />
        </View>
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