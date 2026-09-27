import React, { useState, useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native'
import { MagnifyingGlassIcon } from 'react-native-heroicons/outline'
import OrderItemCard from '@/components/cards/OrderItemCard'
import { useActiveRoleProfile } from '@/hooks/useUserProfile'
import { useMerchantOrders } from '@/hooks/useOrders'
import LoadingSpinner from '@/components/LoadingSpinner'

const Orders = () => {
  const [activeTab, setActiveTab] = useState<'ongoing' | 'delivered'>('ongoing')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch user profile based on active role to get merchant ID
  const { data: profileData, activeRole } = useActiveRoleProfile();

  // Extract merchant ID safely from different profile structures
  const merchantId = (activeRole === 'merchant' || activeRole === 'vehicle_rental')
    ? (profileData?.data as any)?.user?.id || (profileData?.data as any)?.user_id
    : (profileData?.data as any)?.user_id;

  // Fetch merchant orders
  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch
  } = useMerchantOrders(merchantId?.toString() || '');

  // Transform API data to match component expectations
  const transformOrderItem = (order: any, item: any) => ({
    id: `${order.id}-${item.id}`, // Combine order ID and item ID for uniqueness
    productName: item.product?.name || 'Unknown Product',
    orderDate: new Date(order.created_at).toLocaleDateString('en-GB'),
    price: parseFloat(item.price || 0),
    totalAmount: parseFloat(order.total_amount || 0),
    status: order.status,
    quantity: item.quantity || 1,
    image: item.product?.images?.[0]?.image || null,
    deliveryDate: order.estimated_delivery_date || null, // Hide if not provided by API
    paymentStatus: ['paid', 'shipped', 'delivered', 'completed'].includes(order.status.toLowerCase()) ? 'Paid' :
                   order.status === 'cancelled' ? 'Cancelled' :
                   order.status === 'refunded' ? 'Refunded' : 'Pending',
    orderId: order.id,
    itemId: item.id,
    category: item.product?.category?.name || 'Unknown',
    merchant_email: item.product?.merchant_email || '',
  });

  // Process orders data - flatten items from all orders
  const orders = ordersResponse?.data || [];
  const allOrderItems: any[] = [];


  const isVehicleRental = activeRole === 'vehicle_rental';

  orders.forEach((order: any) => {
    order.items?.forEach((item: any) => {
      // Role isolation: Only include rental vehicles for vehicle_rental role,
      // and only include non-rental products for merchant/seller role.
      const isRentalItem = Boolean(item.product?.is_rental);
      if (isVehicleRental && !isRentalItem) return;
      if (!isVehicleRental && isRentalItem) return;

      allOrderItems.push(transformOrderItem(order, item));
    });
  });


  // Categorize orders based on status
  const ongoingOrders = useMemo(() => {
    return allOrderItems.filter((orderItem: any) =>
      orderItem.status &&
      !['delivered', 'completed', 'cancelled', 'refunded'].includes(orderItem.status.toLowerCase())
    );
  }, [allOrderItems]);

  const deliveredOrders = useMemo(() => {
    return allOrderItems.filter((orderItem: any) =>
      orderItem.status &&
      ['delivered', 'completed'].includes(orderItem.status.toLowerCase())
    );
  }, [allOrderItems]);

  // Filter orders based on search query
  const filteredOngoingOrders = ongoingOrders.filter((order: any) =>
    order.productName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDeliveredOrders = deliveredOrders.filter((order: any) =>
    order.productName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  // Show loading spinner when fetching orders
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View className="bg-white px-4 py-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <Text className="text-xl font-NunitoBold text-gray-800 flex-1 text-center">
              {activeRole === 'vehicle_rental' ? "My Rentals" : "My orders"}
            </Text>
          </View>
        </View>

        <LoadingSpinner
          message="Loading Orders..."
          subMessage="Please wait while we fetch your orders"
          size="medium"
          logoSize={32}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-100">
        <View className="flex-row items-center">

          <Text className="text-xl font-NunitoBold text-gray-800 flex-1 text-center">
            {activeRole === 'vehicle_rental' ? "My Rentals" : "My orders"}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md ${activeTab === 'ongoing' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('ongoing')}
          >
            <Text className={`text-center font-NunitoMedium ${activeTab === 'ongoing' ? 'text-red-600' : 'text-gray-500'}`}>
              Ongoing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md ${activeTab === 'delivered' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('delivered')}
          >
            <Text className={`text-center font-NunitoMedium ${activeTab === 'delivered' ? 'text-red-600' : 'text-gray-500'}`}>
              Delivered
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="bg-white px-4 py-4 rounded-md border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <MagnifyingGlassIcon size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-gray-900 font-NunitoMedium"
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
      >
        <View className="py-4">
          {(activeTab === 'ongoing' ? filteredOngoingOrders : filteredDeliveredOrders).map((order: any) => (
            <OrderItemCard
              key={order.id}
              order={order}
            />
          ))}

          {/* Error State */}
          {error && (
            <View className="py-8 items-center">
              <Text className="text-red-500 font-NunitoBold text-center mb-2">
                Error Loading Orders
              </Text>
              <Text className="text-gray-500 font-NunitoMedium text-center mb-4">
                Failed to load your orders. Please try again.
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                className="bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-NunitoBold">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {!error && (activeTab === 'ongoing' ? filteredOngoingOrders : filteredDeliveredOrders).length === 0 && (
            <View className="py-8 items-center">
              <Text className="text-gray-500 font-NunitoMedium text-center">
                {searchQuery ? 'No orders found matching your search.' : `No ${activeTab} orders found.`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Orders