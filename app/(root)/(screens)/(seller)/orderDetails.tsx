import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon, CalendarIcon, CreditCardIcon, ShoppingBagIcon, MapPinIcon, CheckCircleIcon, ClockIcon, TruckIcon, UserIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon } from 'react-native-heroicons/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from 'react-native-heroicons/solid'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { productsAPI } from '@/lib/api/products'
import LoadingErrorWrapper from '@/components/LoadingErrorWrapper'
import { showToast } from '@/utils/toastUtils'
import { LAYOUT } from '@/constants/units'

const { CONTAINER_PADDING } = LAYOUT;
const { width: screenWidth } = Dimensions.get('window');

// Image Pagination Component
const ImagePagination: React.FC<{ images: Array<{ id: number; image: string; ordering: number }> }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        return (
            <View className="h-64 bg-gray-100 rounded-2xl items-center justify-center">
                <ShoppingBagIcon size={48} color="#9CA3AF" />
                <Text className="text-gray-500 font-NunitoMedium mt-2">No Images Available</Text>
            </View>
        );
    }

    const sortedImages = [...images].sort((a, b) => a.ordering - b.ordering);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
    };

    return (
        <View className="relative flex-1">
            {/* Main Image */}
            <View className="flex-1 bg-gray-100 overflow-hidden">
                <Image
                    source={{ uri: sortedImages[currentIndex].image }}
                    className="w-full h-full"
                    resizeMode="cover"
                />

                {/* Image Counter */}
                {sortedImages.length > 1 && (
                    <View className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <Text className="text-white text-sm font-NunitoBold">
                            {currentIndex + 1} / {sortedImages.length}
                        </Text>
                    </View>
                )}

                {/* Navigation Arrows */}
                {sortedImages.length > 1 && (
                    <>
                        <TouchableOpacity
                            onPress={goToPrevious}
                            className="absolute left-4 top-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full items-center justify-center"
                            style={{ transform: [{ translateY: -24 }] }}
                        >
                            <ChevronLeftIcon size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={goToNext}
                            className="absolute right-4 top-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full items-center justify-center"
                            style={{ transform: [{ translateY: -24 }] }}
                        >
                            <ChevronRightIcon size={24} color="white" />
                        </TouchableOpacity>
                    </>
                )}

                {/* Dots Indicator */}
                {sortedImages.length > 1 && (
                    <View className="absolute bottom-4 left-0 right-0">
                        <View className="flex-row justify-center">
                            {sortedImages.map((_, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setCurrentIndex(index)}
                                    className={`w-2 h-2 rounded-full mx-1 ${index === currentIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                />
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

interface OrderItem {
    id: number;
    product: {
        id: string;
        merchant_id: string;
        merchant_email: string;
        category: {
            id: number;
            name: string;
            sub_categories: Array<{
                id: number;
                name: string;
                description: string;
                created_at: string;
                updated_at: string;
            }>;
            description: string;
            created_at: string;
            updated_at: string;
        };
        name: string;
        condition: string;
        description: string;
        price: string;
        currency: string;
        negotiable: boolean;
        availability: string;
        stock: number;
        is_rental: boolean;
        delivery_option: string;
        images: Array<{
            id: number;
            image: string;
            ordering: number;
            created_at: string;
        }>;
        created_at: string;
        updated_at: string;
        rating: number | null;
        merchant_rating: number;
    };
    quantity: number;
    price: string;
}

interface OrderData {
    id: string;
    status: string;
    total_amount: string;
    items: OrderItem[];
    created_at: string;
    updated_at: string;
}

const OrderDetails = () => {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();

    // Fetch order details
    const {
        data: orderResponse,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['order', orderId],
        queryFn: async () => {
            if (!orderId) throw new Error('Order ID is required');
            return await productsAPI.getOrderById(orderId);
        },
        enabled: !!orderId,
    });

    const orderData: OrderData | null = orderResponse?.data || null;
    const queryClient = useQueryClient();
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleUpdateStatus = async () => {
        if (!orderData?.id) return;
        const currentStatus = orderData.status.toLowerCase();
        let nextStatus = '';
        if (currentStatus === 'pending') nextStatus = 'processing';
        else if (currentStatus === 'processing') nextStatus = 'shipped';
        else if (currentStatus === 'shipped') nextStatus = 'delivered';
        else return;

        try {
            setIsUpdatingStatus(true);
            await productsAPI.updateOrderStatus(orderData.id, nextStatus);
            showToast.success(`Order marked as ${nextStatus}!`);
            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ['orders'] }),
                queryClient.invalidateQueries({ queryKey: ['orderDetail', orderData.id] }),
                queryClient.invalidateQueries({ queryKey: ['orderStatus', orderData.id] }),
                queryClient.invalidateQueries({ queryKey: ['merchant-analytics'] }),
            ]);
        } catch (err: any) {
            showToast.error(err?.response?.data?.message || err?.message || 'Failed to update order status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Enhanced status configuration
    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'delivered':
            case 'completed':
                return {
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    icon: CheckCircleIconSolid,
                    iconColor: '#10B981',
                    label: 'Delivered',
                    description: 'Order has been successfully delivered'
                };
            case 'shipped':
                return {
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    icon: TruckIcon,
                    iconColor: '#3B82F6',
                    label: 'Shipped',
                    description: 'Order is on its way to Customer'
                };
            case 'processing':
                return {
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    border: 'border-purple-200',
                    icon: ClockIcon,
                    iconColor: '#8B5CF6',
                    label: 'Processing',
                    description: 'Order is being prepared'
                };
            case 'pending':
                return {
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-200',
                    icon: ClockIcon,
                    iconColor: '#F59E0B',
                    label: 'Pending',
                    description: 'Order is awaiting confirmation'
                };
            case 'cancelled':
            case 'failed':
                return {
                    color: 'text-red-600',
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    icon: CheckCircleIcon,
                    iconColor: '#EF4444',
                    label: 'Cancelled',
                    description: 'Order has been cancelled'
                };
            default:
                return {
                    color: 'text-gray-600',
                    bg: 'bg-gray-50',
                    border: 'border-gray-200',
                    icon: CheckCircleIcon,
                    iconColor: '#6B7280',
                    label: status,
                    description: 'Order status'
                };
        }
    };

    // Enhanced date formatting
    const formatDate = (dateString: string, format: 'full' | 'date' | 'time' | 'relative' = 'full') => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

            switch (format) {
                case 'relative':
                    if (diffInHours < 1) return 'Just now';
                    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
                    if (diffInHours < 48) return 'Yesterday';
                    return `${Math.floor(diffInHours / 24)} days ago`;
                case 'date':
                    return date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                case 'time':
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                default:
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
            }
        } catch {
            return dateString;
        }
    };

    // Enhanced currency formatting
    const formatCurrency = (amount: string | number, currency: string = 'NGN') => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return amount.toString();

        const formatted = numAmount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        switch (currency) {
            case 'NGN':
                return `₦${formatted}`;
            case 'USD':
                return `$${formatted}`;
            case 'EUR':
                return `€${formatted}`;
            case 'GBP':
                return `£${formatted}`;
            default:
                return `${currency} ${formatted}`;
        }
    };

    // Calculate order summary
    const getOrderSummary = () => {
        if (!orderData) return { totalItems: 0, totalQuantity: 0, estimatedDelivery: 'N/A' };

        const totalItems = orderData.items.length;
        const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);

        // Estimate delivery based on status
        let estimatedDelivery = 'N/A';
        if (orderData.status.toLowerCase() === 'delivered') {
            estimatedDelivery = 'Delivered';
        } else if (orderData.status.toLowerCase() === 'shipped') {
            estimatedDelivery = '1-2 business days';
        } else if (orderData.status.toLowerCase() === 'processing') {
            estimatedDelivery = '3-5 business days';
        }

        return { totalItems, totalQuantity, estimatedDelivery };
    };

    const statusConfig = orderData ? getStatusConfig(orderData.status) : null;
    const orderSummary = getOrderSummary();

    return (
        <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
            <StatusBar style="dark" />

            {/* Merchant Header */}
            <View className="bg-white shadow-sm border-b border-gray-100">
                <View className={`flex-row items-center justify-between ${CONTAINER_PADDING} py-3`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                    >
                        <ArrowLeftIcon size={20} color="#374151" />
                    </TouchableOpacity>

                    <View className="flex-1 items-center">
                        <Text className="text-xl font-NunitoBold text-gray-700">Customer Order</Text>

                    </View>

                    <View></View>

                    {/* <TouchableOpacity
                        className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center"
                        onPress={() => {}}
                    >
                        <UserIcon size={18} color="#2563EB" />
                    </TouchableOpacity> */}
                </View>
            </View>

            <LoadingErrorWrapper
                isLoading={isLoading}
                error={error}
                onRetry={refetch}
                loadingMessage="Loading Order Details..."
                loadingSubMessage="Please wait while we fetch your order information"
                className="flex-1"
            >
                {orderData && statusConfig && (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                        {/* Hero Image Section */}
                        <View className="relative">
                            {orderData.items[0]?.product?.images?.length > 0 ? (
                                <View className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-sm">
                                    <View style={{ height: screenWidth * 0.7 }}>
                                        <ImagePagination images={orderData.items[0].product.images} />
                                    </View>
                                </View>
                            ) : (
                                <View className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-sm bg-gray-100" style={{ height: screenWidth * 0.7 }}>
                                    <View className="flex-1 items-center justify-center">
                                        <ShoppingBagIcon size={64} color="#9CA3AF" />
                                        <Text className="text-gray-500 font-NunitoMedium mt-3 text-lg">No Product Images</Text>
                                    </View>
                                </View>
                            )}

                            {/* Product Info Overlay */}
                            {/* <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 rounded-b-3xl">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1">
                                        <Text className="text-white text-xl font-NunitoBold mb-1">
                                            {orderData.items[0]?.product?.name}
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Text className="text-white/80 text-sm font-NunitoMedium">
                                                {formatCurrency(orderData.total_amount)}
                                            </Text>
                                            <Text className="text-white/60 text-sm font-NunitoMedium ml-2">
                                                • {orderSummary.totalQuantity} items
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30"
                                        onPress={() => router.push({ pathname: '/(root)/(screens)/(user)/product-detail', params: { id: orderData.items[0]?.product?.id } as any })}
                                    >
                                        <Text className="text-white text-sm font-NunitoBold">View Product</Text>
                                    </TouchableOpacity>
                                </View>
                            </View> */}
                        </View>

                        {/* Product Badges */}
                        <View className="mx-4 mt-4 flex-row flex-wrap">
                            {!!orderData.items[0]?.product?.category?.name && (
                                <View className="bg-primary-500 px-4 py-2 rounded-full mr-3 mb-2">
                                    <Text className="text-white text-sm font-NunitoBold">
                                        {orderData.items[0].product.category.name}
                                    </Text>
                                </View>
                            )}
                            {!!orderData.items[0]?.product?.condition && (
                                <View className="bg-primary-100 px-4 py-2 rounded-full mr-3 mb-2">
                                    <Text className="text-primary-700 text-sm font-NunitoBold capitalize">
                                        {orderData.items[0].product.condition}
                                    </Text>
                                </View>
                            )}
                            <View className="bg-green-100 px-4 py-2 rounded-full mr-3 mb-2">
                                <Text className="text-green-700 text-sm font-NunitoBold">
                                    Order #{orderData.id.slice(-6).toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Order Status Card */}
                        <View className="mx-4 mt-6 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <View className="flex-row items-center mb-6">
                                <View className="w-14 h-14 rounded-2xl bg-primary-100 items-center justify-center mr-4">
                                    <statusConfig.icon size={28} color={'#2563EB'} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-NunitoBold text-primary-600">
                                        {statusConfig.label}
                                    </Text>
                                    <Text className="text-base text-gray-600 font-NunitoMedium mt-1">
                                        {statusConfig.description}
                                    </Text>
                                </View>
                            </View>

                            <View className="space-y-4">
                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Order ID</Text>
                                    <Text className="text-base font-NunitoBold text-primary-600">
                                        #{orderData.id.slice(-8).toUpperCase()}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Last Updated</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {formatDate(orderData.updated_at, 'relative')}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Order Date</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {formatDate(orderData.created_at, 'date')}
                                    </Text>
                                </View>
                            </View>

                            {/* Action Button */}
                            {(['pending', 'processing', 'shipped'].includes(orderData.status.toLowerCase())) && (
                                <View className="mt-6 pt-6 border-t border-gray-100">
                                    <TouchableOpacity 
                                        disabled={isUpdatingStatus}
                                        onPress={handleUpdateStatus}
                                        className="bg-primary-600 py-4 rounded-2xl shadow-sm flex-row items-center justify-center"
                                    >
                                        {isUpdatingStatus ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-white font-NunitoBold text-center text-lg">
                                                {orderData.status.toLowerCase() === 'pending'
                                                    ? 'Process Order'
                                                    : orderData.status.toLowerCase() === 'processing'
                                                    ? 'Mark as Shipped'
                                                    : 'Mark as Delivered'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Revenue Summary Card */}
                        <View className="mx-4 mt-6 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <Text className="text-xl font-NunitoBold text-gray-900 mb-6">
                                Revenue Summary
                            </Text>

                            <View className="space-y-4">
                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Total Revenue</Text>
                                    <Text className="text-2xl text-primary-600 font-NunitoBold">
                                        {formatCurrency(orderData.total_amount)}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Items Sold</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {orderSummary.totalQuantity} units
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Order Value</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {formatCurrency(orderData.total_amount)}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Delivery Status</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {orderSummary.estimatedDelivery}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Customer Information Card */}
                        <View className="mx-4 mt-6 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <Text className="text-xl font-NunitoBold text-gray-900 mb-6">
                                Customer Information
                            </Text>

                            <View className="space-y-4">
                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Customer Email</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {orderData.items[0]?.product?.merchant_email || 'N/A'}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-start py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Shipping Address</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900 text-right flex-1 ml-4">
                                        {(orderData as any)?.shipping_address || (orderData as any)?.address || 'To be provided'}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Order Date</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {formatDate(orderData.created_at, 'date')}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center py-3">
                                    <Text className="text-base text-gray-600 font-NunitoMedium">Last Updated</Text>
                                    <Text className="text-base font-NunitoBold text-gray-900">
                                        {formatDate(orderData.updated_at, 'relative')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Products Sold Card */}
                        <View className="mx-4 mt-6 mb-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <View className="flex-row items-center justify-between mb-6">
                                <Text className="text-xl font-NunitoBold text-gray-900">
                                    Products Sold
                                </Text>
                                <View className="bg-primary-500 px-4 py-2 rounded-full">
                                    <Text className="text-white text-sm font-NunitoBold">
                                        {orderData.items.length} product{orderData.items.length > 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>

                            {orderData.items.map((item, index) => (
                                <View key={item.id} className={`${index > 0 ? 'pt-8 border-t border-gray-100 mt-8' : ''}`}>
                                    {/* Product Information */}
                                    <View className="mb-6">
                                        <Text className="text-xl font-NunitoBold text-gray-900 mb-4">
                                            {item.product.name}
                                        </Text>

                                        <View className="space-y-4">
                                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                                <Text className="text-base text-gray-600 font-NunitoMedium">Category</Text>
                                                <Text className="text-base font-NunitoBold text-primary-600">
                                                    {item.product.category.name}
                                                </Text>
                                            </View>

                                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                                <Text className="text-base text-gray-600 font-NunitoMedium">Condition</Text>
                                                <Text className="text-base font-NunitoBold text-gray-900 capitalize">
                                                    {item.product.condition}
                                                </Text>
                                            </View>

                                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                                <Text className="text-base text-gray-600 font-NunitoMedium">Quantity Sold</Text>
                                                <Text className="text-base font-NunitoBold text-gray-900">
                                                    {item.quantity} units
                                                </Text>
                                            </View>

                                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                                <Text className="text-base text-gray-600 font-NunitoMedium">Unit Price</Text>
                                                <Text className="text-base font-NunitoBold text-gray-900">
                                                    {formatCurrency(item.product.price, item.product.currency)}
                                                </Text>
                                            </View>

                                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                                <Text className="text-base text-gray-600 font-NunitoMedium">Total Amount</Text>
                                                <Text className="text-2xl font-NunitoBold text-primary-600">
                                                    {formatCurrency((parseFloat(item.product.price) * item.quantity), item.product.currency)}
                                                </Text>
                                            </View>

                                            <View className="flex-row justify-between items-center py-3">
                                                <Text className="text-base text-gray-600 font-NunitoMedium">Stock Remaining</Text>
                                                <Text className="text-base font-NunitoBold text-gray-900">
                                                    {item.product.stock} units
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Product Description */}
                                    {item.product.description && (
                                        <View className="bg-gray-50 p-5 rounded-2xl">
                                            <Text className="text-gray-900 font-NunitoBold text-base mb-3">
                                                Description
                                            </Text>
                                            <Text className="text-gray-700 text-base font-NunitoMedium leading-relaxed">
                                                {item.product.description}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </LoadingErrorWrapper>
        </SafeAreaView>

    );
};

export default OrderDetails; 