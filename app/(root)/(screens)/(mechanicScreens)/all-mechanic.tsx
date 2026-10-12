
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import BackArrowBtn from "@/components/BackArrowBtn";
import { routes } from "@/constants/routes";
import { useCallback } from "react";
import MechanicCard from "@/components/cards/MechanicCard";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { useGetAvailableMechanics } from "@/hooks/useMechanics";
import AnimatedErrorCard from "@/components/AnimatedErrorCard";
import { useUserRepairRequests } from "@/hooks/useRepairRequests";
import { useVehicleMakes } from "@/hooks/useVehicleMakes";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { resolveServiceDisplayName, isIdLike } from "@/utils/serviceUtils";
import MechanicOrderCard, { MechanicOrder } from "@/components/cards/MechanicOrderCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getApiErrorMessage } from "@/utils/errorMessages";

const { width: screenWidth } = Dimensions.get("window");

interface Mechanic {
  id: number;
  userId?: string;
  name: string;
  rating: number;
  reviewCount: number;
  image: any;
  isVip?: boolean;
  specialization?: string;
  location?: string;
  isOnline?: boolean;
}

type TabStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

const AllMechanic = () => {
  const [activeTab, setActiveTab] = useState("Mechanics");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ status?: string }>();
  
  // Get active status filter from URL params, default to 'all'
  const activeStatus: TabStatus = (params.status as TabStatus) || 'all';

  // Fetch available mechanics from API
  const { 
    data: mechanicsData, 
    isLoading: isLoadingMechanics, 
    error: mechanicsError, 
    refetch: refetchMechanics 
  } = useGetAvailableMechanics();

  // Fetch user's repair requests for "All orders" tab with status filter
  const statusParam = activeStatus === 'all' ? undefined : activeStatus;
  const { 
    data: ordersData, 
    isLoading: isLoadingOrders, 
    error: ordersError, 
    refetch: refetchOrders 
  } = useUserRepairRequests(statusParam);

  // Fetch vehicle makes to resolve make/model names
  const { data: vehicleMakes } = useVehicleMakes();

  // Fetch service types to resolve service UUIDs into friendly names
  const { serviceTypes } = useServiceTypes();

  // Transform API data to local format
  const mechanics: Mechanic[] = (() => {
    try {
      if (!mechanicsData) {
        return [];
      }
      
      // The API response has the mechanics array in the 'data' property
      // Handle both cases: if it's already an array or if it's wrapped in a data property
      const mechanicsArray = (mechanicsData as any)?.data || (Array.isArray(mechanicsData) ? mechanicsData : []);
      
      if (!Array.isArray(mechanicsArray)) {
        return [];
      }
      
      return mechanicsArray.map((mechanic: any) => ({
        id: mechanic.id || 0,
        userId: mechanic.user?.id || '',
        name: mechanic.user ? `${mechanic.user.first_name} ${mechanic.user.last_name}`.trim() : `Mechanic ${mechanic.id}`,
        rating: mechanic.rating || 0, // Use rating from API
        reviewCount: 0, // Not provided in API response
        image: mechanic.selfie || null, // Use selfie URL from API
        specialization: 'General Repair', // Not provided in API response
        location: mechanic.location || 'Location not available', // Use location from API
        isOnline: mechanic.is_approved || false,
        isVip: false, // Not provided in API response
      }));
    } catch (error) {
      console.error('Error transforming mechanics data:', error);
      return [];
    }
  })();

  const filteredMechanics = mechanics.filter(
    (mechanic) =>
      mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mechanic.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mechanic.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get make name from ID
  const getMakeName = (makeId: string | number) => {
    if (!makeId) return '';
    if (typeof makeId === 'string' && !isIdLike(makeId)) return makeId;
    if (!vehicleMakes) return '';
    const make = vehicleMakes.find(
      (m) => m.id.toString() === makeId.toString() || m.name?.toLowerCase() === makeId.toString().toLowerCase()
    );
    return make?.name || '';
  };

  // Helper function to get model name from ID
  const getModelName = (makeId: string | number, modelId: string | number) => {
    if (!modelId) return '';
    if (typeof modelId === 'string' && !isIdLike(modelId)) return modelId;
    if (!vehicleMakes) return '';
    const make = vehicleMakes.find(
      (m) => m.id.toString() === makeId?.toString() || m.name?.toLowerCase() === makeId?.toString().toLowerCase()
    );
    const model = make?.models?.find(
      (m) => m.id.toString() === modelId.toString() || m.name?.toLowerCase() === modelId.toString().toLowerCase()
    );
    return model?.name || '';
  };

  // Transform API data to local format for orders
  const orders: MechanicOrder[] = (() => {
    try {
      if (!ordersData) {
        return [];
      }

      // The API response has the orders array in the 'data' property
      const ordersArray = (ordersData as any)?.data || (Array.isArray(ordersData) ? ordersData : []);

      if (!Array.isArray(ordersArray)) {
        return [];
      }

      return ordersArray.map((request: any) => {
        const mechanicName = request.mechanic
          ? `${request.mechanic.first_name || ''} ${request.mechanic.last_name || ''}`.trim() || 'Unknown Mechanic'
          : 'Unknown Mechanic';

        const makeId = request.vehicle_make;
        const modelId = request.vehicle_model;
        const makeName = getMakeName(makeId);
        const modelName = getModelName(makeId, modelId);

        return {
          id: request.id?.toString() || '',
          mechanicName: mechanicName,
          mechanicImage: request.mechanic?.selfie || request.mechanic_image || undefined,
          serviceType: resolveServiceDisplayName(request, serviceTypes),
          vehicleMake: makeName,
          vehicleModel: modelName,
          vehicleYear: request.vehicle_year || 0,
          problemDescription: request.problem_description || request.description || '',
          serviceAddress: request.service_address || request.address || '',
          preferredDate: request.preferred_date || request.requested_at || '',
          preferredTimeSlot: request.preferred_time_slot || request.time_slot || '',
          status: (request.status || 'pending') as MechanicOrder['status'],
          createdAt: request.requested_at || request.created_at || request.createdAt || '',
          notes: request.notes || undefined,
        };
      });
    } catch (error) {
      console.error('Error transforming orders data:', error);
      return [];
    }
  })();

  // Orders are already filtered by the API based on status param
  const filteredOrders = orders;

  const handleStatusChange = (status: TabStatus) => {
    router.setParams({ status });
  };

  const handleMechanicPress = (mechanic: Mechanic) => {
    router.push({
      pathname: routes.mechanicProfile,
      params: {
        mechanicId: mechanic?.userId?.toString(), // Use mechanic profile id for fetching detail
        mechanicName: mechanic.name,
        mechanicRating: mechanic.rating,
        mechanicImage: mechanic.image,
      },
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "Mechanics") {
      await refetchMechanics();
    } else {
      await refetchOrders();
    }
    setRefreshing(false);
  };

  const cardWidth = (screenWidth - 60) / 2;

  const renderMechanicCard = useCallback(
    ({ item }: { item: Mechanic }) => (
      <MechanicCard item={item} onPress={handleMechanicPress} cardWidth={cardWidth} />
    ),
    [handleMechanicPress, cardWidth]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <BackArrowBtn />
        <Text className="text-xl font-NunitoBold text-gray-900">
          All Mechanics
        </Text>
       <View className="w-8" />
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white px-5 py-4 border-b border-gray-50">
        <TouchableOpacity
          onPress={() => {
            setActiveTab("Mechanics");
            setSearchQuery("");
          }}
          className={`flex-1 py-3.5 rounded-2xl ${
            activeTab === "Mechanics" ? "bg-gray-900 shadow-sm" : "bg-gray-50"
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`text-center font-NunitoExtraBold text-sm ${
              activeTab === "Mechanics" ? "text-white" : "text-gray-500"
            }`}
          >
           Find Mechanics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab("All orders");
            setSearchQuery("");
          }}
          className={`flex-1 py-3.5 rounded-2xl ml-3 ${
            activeTab === "All orders" ? "bg-gray-900 shadow-sm" : "bg-gray-50"
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`text-center font-NunitoExtraBold text-sm ${
              activeTab === "All orders" ? "text-white" : "text-gray-500"
            }`}
          >
            My Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      {activeTab === "Mechanics" && (
        <View className="px-5 py-4 bg-white border-b border-gray-50">
          <View className="flex-row items-center">
            <View className="flex-1 flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 mr-3 border border-gray-100">
              <MagnifyingGlassIcon size={20} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, expertise..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-3 text-base font-NunitoSemiBold text-gray-900"
              />
            </View>

            <TouchableOpacity
              onPress={() => setShowFilter(!showFilter)}
              className="w-12 h-12 bg-gray-900 rounded-2xl items-center justify-center shadow-sm"
              activeOpacity={0.8}
            >
              <View className="w-5 h-5 items-center justify-center">
                <View className="w-5 h-0.5 bg-white mb-1 rounded-full" />
                <View className="w-3 h-0.5 bg-white mb-1 rounded-full self-start" />
                <View className="w-5 h-0.5 bg-white rounded-full" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status Filter Tabs for Orders */}
      {activeTab === "All orders" && (
        <View className="bg-white border-b border-gray-50">
          <ScrollView
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
          >
            {(['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as TabStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(status)}
                className={`px-6 py-2.5 rounded-full mr-3 border ${
                  activeStatus === status ? 'bg-red-500 border-red-500' : 'bg-white border-gray-100'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-center font-NunitoBold text-xs uppercase tracking-widest ${
                    activeStatus === status ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {status === 'in_progress' ? 'In Progress' : status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View className="flex-1">
        {activeTab === "Mechanics" ? (
          <>
            {/* Loading State */}
            {isLoadingMechanics && (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#D30309" />
                <Text className="text-gray-600 mt-4">Loading mechanics...</Text>
              </View>
            )}

            {/* Error State */}
            {mechanicsError && (
              <AnimatedErrorCard
                emoji="🔧"
                title="Failed to load mechanics"
                message="We couldn't load the mechanics list. Please try again."
                gradientColors={['#FEF2F2', '#FECACA', '#FCA5A5']}
                textColor="text-red-800"
                actionButton={{
                  text: "Try Again",
                  onPress: () => refetchMechanics(),
                  backgroundColor: "#A80207"
                }}
                className=""
              />
            )}

            {/* Empty State */}
            {!isLoadingMechanics && !mechanicsError && filteredMechanics.length === 0 && (
              <AnimatedErrorCard
                emoji="🔧"
                title="No mechanics found"
                message={searchQuery ? 'Try adjusting your search terms' : 'No mechanics are currently available'}
                gradientColors={['#F0F9FF', '#E0F2FE', '#BAE6FD']}
                textColor="text-blue-800"
                className=""
              />
            )}

            {/* Mechanics List */}
            {!isLoadingMechanics && !mechanicsError && filteredMechanics.length > 0 && (
              <FlatList
                key="mechanics-list"
                data={filteredMechanics}
                renderItem={renderMechanicCard}
                keyExtractor={item => item.id.toString()}
                numColumns={2}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews={true}
                columnWrapperStyle={{
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                }}
                contentContainerStyle={{
                  paddingTop: 20,
                  paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#D30309']}
                    tintColor="#D30309"
                  />
                }
              />
            )}
          </>
        ) : (
          <>
            {/* Loading State */}
            {isLoadingOrders && (
              <View className="flex-1 items-center justify-center py-20">
                <LoadingSpinner size="large" />
                <Text className="text-gray-600 mt-4 font-NunitoMedium">
                  Loading orders...
                </Text>
              </View>
            )}

            {/* Error State */}
            {ordersError && !isLoadingOrders && (
              <View className="px-5 py-8">
                <AnimatedErrorCard
                  emoji="🔧"
                  title="Failed to load orders"
                  message={getApiErrorMessage(ordersError)}
                  gradientColors={['#FEF2F2', '#FECACA', '#FCA5A5']}
                  textColor="text-red-800"
                  actionButton={{
                    text: "Try Again",
                    onPress: () => {
                      refetchOrders();
                    },
                    backgroundColor: "#DC2626"
                  }}
                />
              </View>
            )}

            {/* Empty State */}
            {!isLoadingOrders && !ordersError && filteredOrders.length === 0 && (
              <View className="flex-1 justify-center items-center px-5 py-20">
                <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-4">
                  <Text className="text-4xl">📋</Text>
                </View>
                <Text className="text-xl font-NunitoBold text-gray-900 mb-2 text-center">
                  No Orders yet
                </Text>
                <Text className="text-gray-500 text-center font-NunitoMedium mb-6">
                  {activeStatus === 'all'
                    ? "You haven't placed any mechanic orders yet"
                    : `No ${activeStatus} orders at the moment`}
                </Text>
                {activeStatus === 'all' && (
                  <TouchableOpacity
                    onPress={() => router.push(routes.findMechanic)}
                    className="bg-primary-500 px-6 py-3 rounded-lg"
                  >
                    <Text className="text-white font-NunitoBold">Find a Mechanic</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Orders List */}
            {!isLoadingOrders && !ordersError && filteredOrders.length > 0 && (
              <FlatList
                key="orders-list"
                data={filteredOrders}
                renderItem={({ item }) => <MechanicOrderCard order={item} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#D30309']}
                    tintColor="#D30309"
                  />
                }
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default AllMechanic;
