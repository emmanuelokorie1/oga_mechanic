import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackArrowBtn from '@/components/BackArrowBtn';
import { router, useLocalSearchParams } from 'expo-router';
import { routes } from '@/constants/routes';
import LoadingSpinner from '@/components/LoadingSpinner';
import AnimatedErrorCard from '@/components/AnimatedErrorCard';
import { getApiErrorMessage } from '@/utils/errorMessages';
import { useUserRepairRequests } from '@/hooks/useRepairRequests';
import { useVehicleMakes } from '@/hooks/useVehicleMakes';
import MechanicOrderCard, { MechanicOrder } from '@/components/cards/MechanicOrderCard';

type TabStatus = 'all' | 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

const MyMechanicOrders = () => {
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ status?: string }>();
  
  // Get active tab from URL params, default to 'all'
  const activeTab: TabStatus = (params.status as TabStatus) || 'all';

  // Fetch user's repair requests from API with status filter
  const statusParam = activeTab === 'all' ? undefined : activeTab;
  const { 
    data: ordersData, 
    isLoading, 
    error, 
    refetch 
  } = useUserRepairRequests(statusParam);

  // Fetch vehicle makes to resolve make/model names
  const { data: vehicleMakes } = useVehicleMakes();

  // Helper function to get make name from ID
  const getMakeName = (makeId: string | number) => {
    if (!vehicleMakes || !makeId) return 'N/A';
    const make = vehicleMakes.find((m) => m.id.toString() === makeId.toString());
    return make?.name || `Make ID: ${makeId}`;
  };

  // Helper function to get model name from ID
  const getModelName = (makeId: string | number, modelId: string | number) => {
    if (!vehicleMakes || !makeId || !modelId) return 'N/A';
    const make = vehicleMakes.find((m) => m.id.toString() === makeId.toString());
    const model = make?.models?.find((m) => m.id.toString() === modelId.toString());
    return model?.name || `Model ID: ${modelId}`;
  };

  // Transform API data to local format
  const orders: MechanicOrder[] = (() => {
    try {
      if (!ordersData) return [];
      const ordersArray = (ordersData as any)?.data || (Array.isArray(ordersData) ? ordersData : []);
      if (!Array.isArray(ordersArray)) return [];

      return ordersArray.map((request: any) => {
        const mechanicName = request.mechanic
          ? `${request.mechanic.first_name || ''} ${request.mechanic.last_name || ''}`.trim() || 'Unknown Mechanic'
          : 'Unknown Mechanic';

        return {
          id: request.id?.toString() || '',
          mechanicName: mechanicName,
          mechanicImage: request.mechanic?.selfie || request.mechanic_image || undefined,
          serviceType: request.service_type || '',
          vehicleMake: getMakeName(request.vehicle_make),
          vehicleModel: getModelName(request.vehicle_make, request.vehicle_model),
          vehicleYear: request.vehicle_year || 0,
          problemDescription: request.problem_description || request.description || '',
          serviceAddress: request.service_address || request.address || '',
          preferredDate: request.preferred_date || request.requested_at || '',
          preferredTimeSlot: request.preferred_time_slot || request.time_slot || '',
          status: (request.status || 'pending') as MechanicOrder['status'],
          createdAt: request.requested_at || request.created_at || request.createdAt || '',
          schedule: !!request.schedule,
          notes: request.notes || undefined,
          estimatedCost: request.estimated_cost ?? null,
        };
      });
    } catch (error) {
      console.error('Error transforming orders data:', error);
      return [];
    }
  })();

  const handleTabChange = (tab: TabStatus) => {
    router.setParams({ status: tab });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <BackArrowBtn onPress={() => router.push(routes.services)} />
        <View className="flex-1 items-center">
          <Text className="text-xl font-NunitoExtraBold text-gray-900">Repair History</Text>
          <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-widest mt-0.5">Manage your service requests</Text>
        </View>
        <View className="w-10" />
      </View>

      {/* Modern Tab Bar */}
      <View className="pt-2 pb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          className="flex-row"
        >
          {(['all', 'pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'] as TabStatus[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabChange(tab)}
              className={`mr-3 px-6 py-3 rounded-2xl border ${
                activeTab === tab 
                  ? 'bg-[#D30309] border-[#D30309] shadow-lg shadow-red-200/50' 
                  : 'bg-gray-50 border-gray-100'
              }`}
              activeOpacity={0.9}
            >
              <Text
                className={`text-[11px] font-NunitoExtraBold uppercase tracking-widest ${
                  activeTab === tab ? 'text-white' : 'text-gray-400'
                }`}
              >
                {tab === 'in_progress' ? 'Active' : tab === 'all' ? 'All Orders' : tab.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50/30"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#111827']}
            tintColor="#111827"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* States Section */}
        <View className="px-5 pt-4">
          {isLoading ? (
            <View className="items-center justify-center py-20">
              <LoadingSpinner size="large" />
              <Text className="text-gray-400 mt-4 font-NunitoBold uppercase text-[10px] tracking-widest">Synchronizing records...</Text>
            </View>
          ) : error ? (
            <AnimatedErrorCard
              emoji="🔧"
              title="System sync failed"
              message={getApiErrorMessage(error)}
              gradientColors={['#FFFFFF', '#F9FAFB']}
              textColor="text-gray-900"
              actionButton={{
                text: "Retry Connection",
                onPress: refetch,
                backgroundColor: "#111827"
              }}
            />
          ) : orders.length === 0 ? (
            <View className="items-center justify-center py-24 px-10">
              <View className="w-24 h-24 bg-gray-50 rounded-full items-center justify-center mb-6 border border-gray-100">
                <Text className="text-4xl">📭</Text>
              </View>
              <Text className="text-xl font-NunitoExtraBold text-gray-900 mb-2">No Records Found</Text>
              <Text className="text-gray-400 text-center font-NunitoMedium text-sm leading-5">
                {activeTab === 'all'
                  ? "Your repair history is currently empty. Start by finding a professional specialist."
                  : `You don't have any ${activeTab.replace('_', ' ')} requests at the moment.`}
              </Text>
              <TouchableOpacity
                onPress={() => router.push(routes.findMechanic)}
                className="mt-8 bg-[#D30309] px-8 py-4 rounded-2xl shadow-xl shadow-red-200/50"
              >
                <Text className="text-white font-NunitoExtraBold text-sm">Find a Mechanic</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center justify-between mb-6 px-1">
                <Text className="text-[10px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest">
                  Showing {orders.length} {activeTab === 'all' ? 'total' : activeTab} orders
                </Text>
              </View>
              {orders.map((order) => (
                <MechanicOrderCard key={order.id} order={order} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyMechanicOrders;