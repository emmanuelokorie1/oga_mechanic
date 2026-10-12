
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Animated, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LAYOUT } from "@/constants/units";
import { router } from "expo-router";
import { routes } from "@/constants/routes";
import { mechanicRoutes } from "@/constants/routes";
import OrderCard, { Order } from "@/components/OrderCard";
import MechanicActionConfirmationModal, { MechanicActionType } from "@/components/modals/MechanicActionConfirmationModal";
import { useRepairRequests, useAcceptRepairRequest, useDeclineRepairRequest } from "@/hooks/useRepairRequests";
import { useVehicleMakes } from "@/hooks/useVehicleMakes";
import AnimatedErrorCard from "@/components/AnimatedErrorCard";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";

// Order Card Skeleton Loader
const OrderCardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
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
    shimmer.start();

    return () => shimmer.stop();
  }, []);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  return (
    <View className="bg-white mb-4 p-4 rounded-[.4rem] border border-gray-200">
      {/* Header skeleton */}
      <View className="flex-row justify-between items-start mb-3">
        <Animated.View style={[shimmerStyle]} className="h-5 bg-gray-300 rounded w-2/3" />
        <Animated.View style={[shimmerStyle]} className="h-4 bg-gray-300 rounded w-16" />
      </View>

      {/* Car type skeleton */}
      <Animated.View style={[shimmerStyle]} className="h-4 bg-gray-300 rounded mb-2 w-1/2" />

      {/* Car issue skeleton */}
      <Animated.View style={[shimmerStyle]} className="h-4 bg-gray-300 rounded mb-4 w-3/4" />

      {/* Buttons skeleton */}
      <View className="flex-row space-x-3 gap-3">
        <Animated.View style={[shimmerStyle]} className="flex-1 h-12 bg-gray-300 rounded-[.4rem]" />
        <Animated.View style={[shimmerStyle]} className="flex-1 h-12 bg-gray-300 rounded-[.4rem]" />
      </View>
    </View>
  );
};

const MechanicOrder = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MechanicActionType | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  // Fetch repair requests with status filter based on active tab
  const statusParam = activeTab === 'all' ? undefined : activeTab;
  const {
    data: repairRequestsData,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useRepairRequests(statusParam);

  // Fetch vehicle makes to resolve make/model names
  const { data: vehicleMakes } = useVehicleMakes();

  // Mutations for accepting/declining requests
  const acceptRequestMutation = useAcceptRepairRequest();
  const declineRequestMutation = useDeclineRepairRequest();

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

  // Transform API data to match OrderCard interface
  const allOrders: Order[] = (() => {
    try {
      if (!repairRequestsData?.data) {
        return [];
      }

      const ordersArray = Array.isArray(repairRequestsData.data)
        ? repairRequestsData.data
        : [];

      return ordersArray.map((request: any) => {
        // Get customer name
        const customerName = request.customer
          ? `${request.customer.first_name || ''} ${request.customer.last_name || ''}`.trim() || 'Unknown Customer'
          : 'Unknown Customer';

        // Get vehicle make and model names
        const makeId = request.vehicle_make;
        const modelId = request.vehicle_model;
        const makeName = getMakeName(makeId);
        const modelName = getModelName(makeId, modelId);
        const carType = `${makeName} ${modelName}`.trim() || 'Unknown Vehicle';

        // Map API status to Order status
        const mapStatus = (status: string): Order['status'] => {
          switch (status) {
            case 'pending':
              return 'current';
            case 'accepted':
            case 'in_transit':
            case 'arrived':
            case 'in_progress':
              return 'ongoing';
            case 'completed':
              return 'completed';
            case 'declined':
            case 'cancelled':
              return 'declined';
            default:
              return 'current';
          }
        };

        return {
          id: request.id?.toString() || '',
          clientName: customerName,
          phoneNumber: request.customer?.phone_number || 'N/A',
          carType: carType,
          carIssue: request.problem_description || request.issue_description || 'Repair needed',
          estimatedCost: request.estimated_cost ?? null,
          status: mapStatus(request.status || 'pending'),
          apiStatus: request.status || 'pending', // Actual API status for display and filtering
        };
      });
    } catch (error) {
      console.error('Error transforming orders data:', error);
      return [];
    }
  })();

  // Get current orders (no filtering needed - API handles it)
  const getCurrentOrders = () => {
    return allOrders;
  };

  const openActionConfirmation = (action: MechanicActionType, orderId: string) => {
    setActionType(action);
    setSelectedOrderId(orderId);
    setActionModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedOrderId || !actionType) return;

    try {
      if (actionType === 'accept') {
        await acceptRequestMutation.mutateAsync(selectedOrderId);
      } else if (actionType === 'decline') {
        await declineRequestMutation.mutateAsync(selectedOrderId);
      } else if (actionType === 'completed') {
        // Handle mark as complete logic here
        console.log("Confirmed complete for order:", selectedOrderId);
      }

      setActionModalVisible(false);
      setActionType(null);
      setSelectedOrderId("");
    } catch (error: any) {
      console.error("Error processing action:", error);
      setActionModalVisible(false);
      setActionType(null);
      setSelectedOrderId("");
      refetchRequests();
      const rawMsg = error?.response?.data?.message || error?.message || '';
      const isAlreadyTaken =
        rawMsg.toLowerCase().includes('accept') ||
        rawMsg.toLowerCase().includes('taken') ||
        rawMsg.toLowerCase().includes('assigned') ||
        rawMsg.toLowerCase().includes('status') ||
        rawMsg.toLowerCase().includes('pending') ||
        error?.response?.status === 400 ||
        error?.response?.status === 404 ||
        error?.response?.status === 409;

      Alert.alert(
        "Request Unavailable",
        isAlreadyTaken
          ? "This repair request has already been accepted by another specialist or cancelled."
          : (rawMsg || "This request is no longer available.")
      );
    }
  };

  const handleCancelActionModal = () => {
    setActionModalVisible(false);
    setActionType(null);
    setSelectedOrderId("");
  };

  const handleAccept = (orderId: string) => {
    openActionConfirmation('accept', orderId);
  };

  const handleDecline = (orderId: string) => {
    openActionConfirmation('decline', orderId);
  };

  const handleMarkComplete = (orderId: string) => {
    openActionConfirmation('completed', orderId);
  };

  const handleView = (orderId: string) => {
    router.push({
      pathname: mechanicRoutes.orderDetails,
      params: {
        orderId: orderId,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />

      <AnimatedPageContainer animationType="fadeInDown" duration={500}>
        {/* Header */}
        <View className="bg-white px-4 py-4 border-b border-gray-100">
          <Text className="text-xl font-NunitoBold text-center text-gray-800">
            Orders
          </Text>
        </View>

        {/* Tab Navigation */}
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "accepted", label: "Accepted" },
              { key: "in_transit", label: "In Transit" },
              { key: "arrived", label: "Arrived" },
              { key: "in_progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
              { key: "cancelled", label: "Cancelled" },
              { key: "rejected", label: "Rejected" }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`px-4 py-2 mx-1 rounded-[.3rem] ${activeTab === tab.key
                  ? "bg-red-600"
                  : "bg-gray-100"
                  }`}
              >
                <Text className={`font-NunitoBold text-center text-[.9rem] ${activeTab === tab.key ? "text-white" : "text-gray-600"
                  }`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          className="flex-1 pt-4 mx-4"
          contentContainerStyle={{
            paddingBottom: LAYOUT.SCROLL_PADDING_BOTTOM,
          }}
          refreshControl={
            <RefreshControl
              refreshing={requestsLoading}
              onRefresh={refetchRequests}
              colors={['#D30309']}
              tintColor="#D30309"
            />
          }
        >
          {/* Loading State */}
          {requestsLoading && (
            <View className="">
              {[1, 2, 3].map((index) => (
                <OrderCardSkeleton key={`skeleton-${index}`} />
              ))}
            </View>
          )}

          {/* Error State */}
          {requestsError && !requestsLoading && (
            <AnimatedErrorCard
              emoji="🔧"
              title="Unable to load orders"
              message="Failed to fetch repair requests. Pull down to refresh or try again later."
              gradientColors={['#FEF2F2', '#FECACA', '#FCA5A5']}
              textColor="text-red-800"
              actionButton={{
                text: "Retry",
                onPress: () => refetchRequests(),
                backgroundColor: "#DC2626"
              }}
            />
          )}

          {/* Success State - Show Orders */}
          {!requestsLoading && !requestsError && getCurrentOrders().length > 0 && (
            getCurrentOrders().map((order) => {
              // Determine card type based on API status
              let cardType: "current" | "ongoing" | "completed" = "current";
              const apiStatus = (order as any).apiStatus;
              if (apiStatus === 'accepted' || apiStatus === 'in_progress') {
                cardType = 'ongoing';
              } else if (apiStatus === 'completed') {
                cardType = 'completed';
              } else if (apiStatus === 'pending') {
                cardType = 'current';
              }

              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  type={cardType}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onMarkComplete={handleMarkComplete}
                  onView={handleView}
                />
              );
            })
          )}

          {/* Empty State */}
          {!requestsLoading && !requestsError && getCurrentOrders().length === 0 && (
            <View className="flex-1 items-center justify-center px-6 py-20">
              <View className="items-center">
                {/* Icon */}
                <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-6">
                  <Text className="text-5xl">🔧</Text>
                </View>

                {/* Title */}
                <Text className="text-xl font-NunitoBold text-gray-900 text-center mb-2">
                  {activeTab === 'all'
                    ? 'No Orders Yet'
                    : activeTab === 'pending'
                      ? 'No Pending Orders'
                      : activeTab === 'accepted'
                        ? 'No Accepted Orders'
                        : activeTab === 'in_transit'
                          ? 'No Orders In Transit'
                          : activeTab === 'arrived'
                            ? 'No Arrived Orders'
                            : activeTab === 'in_progress'
                              ? 'No Orders In Progress'
                              : activeTab === 'completed'
                                ? 'No Completed Orders'
                                : activeTab === 'cancelled'
                                  ? 'No Cancelled Orders'
                                  : activeTab === 'rejected'
                                    ? 'No Rejected Orders'
                                    : 'No Orders Found'}
                </Text>

                {/* Description */}
                <Text className="text-gray-500 font-NunitoMedium text-center text-base leading-6 max-w-xs">
                  {activeTab === 'all'
                    ? "You don't have any repair requests at the moment. New orders will appear here when customers request your services."
                    : activeTab === 'pending'
                      ? "There are no pending repair requests waiting for your response. Check back later for new orders."
                      : activeTab === 'accepted'
                        ? "You haven't accepted any orders yet. Accept pending requests to see them here."
                        : activeTab === 'in_transit'
                          ? "You don't have any orders in transit right now."
                          : activeTab === 'arrived'
                            ? "No orders have been marked as arrived yet."
                            : activeTab === 'in_progress'
                              ? "You don't have any orders in progress right now. Start working on accepted orders to track them here."
                              : activeTab === 'completed'
                                ? "You haven't completed any orders yet. Mark orders as completed to see them here."
                                : activeTab === 'cancelled'
                                  ? "No cancelled orders found. Cancelled requests will appear here."
                                  : activeTab === 'rejected'
                                    ? "No rejected orders found. Declined requests will appear here."
                                    : "No orders match this filter."}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Confirmation Modal */}
        <MechanicActionConfirmationModal
          visible={actionModalVisible}
          actionType={actionType}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelActionModal}
          isLoading={acceptRequestMutation.isPending || declineRequestMutation.isPending}
        />

      </AnimatedPageContainer>
    </SafeAreaView>
  );
};

export default MechanicOrder;