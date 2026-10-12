"use client"

import { View, Text, ScrollView, TouchableOpacity, Animated, Share, Image, BackHandler } from "react-native"
import { useEffect, useRef } from "react"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { 
  ClipboardDocumentIcon, 
  CreditCardIcon, 
  TruckIcon, 
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  ArchiveBoxIcon,
  ShoppingBagIcon,
  CheckCircleIcon as CheckCircleIconOutline
} from "react-native-heroicons/outline"
import { CheckCircleIcon as CheckCircleIconSolid } from "react-native-heroicons/solid"
import { icons } from "@/constants"
import CustomButton from "@/components/CustomButton"
import { routes } from "@/constants/routes"

import { useQuery } from "@tanstack/react-query"
import { productsAPI } from "@/lib/api/products"

const OrderConfirmation = () => {
  const { id } = useLocalSearchParams()
  const orderId = (id as string) || ""

  // Fetch order details
  const { data: orderResponse, isLoading } = useQuery({
    queryKey: ["orderDetail", orderId],
    queryFn: () => productsAPI.getOrderById(orderId),
    enabled: !!orderId,
  })

  const order = Array.isArray(orderResponse?.data) 
    ? orderResponse?.data[0] 
    : orderResponse?.data

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const contentSlideAnim = useRef(new Animated.Value(30)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const floatAnim = useRef(new Animated.Value(0)).current
  
  // Staggered item animations
  const itemAnims = useRef(new Animated.Value(0)).current

  // Intercept back button to return safely to Home instead of back into checkout
  useEffect(() => {
    const onBackPress = () => {
      router.replace(routes.home);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Main entrance sequence
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlideAnim, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
        // Continuous pulse for the checkmark
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        // Continuous float for background blobs
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();

        // Staggered entry for items (visual cue)
        Animated.timing(itemAnims, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    })
  }, [])

  const handleCopyOrderId = () => {
    if (!orderId) return;
    Share.share({ message: orderId });
  }

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const getStatusIndex = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'pending') return 0
    if (s === 'paid') return 1
    if (s === 'processing' || s === 'packed') return 2
    if (s === 'shipped') return 3
    if (s === 'out_for_delivery') return 4
    if (s === 'delivered' || s === 'completed') return 5
    return 0
  }

  const currentIndex = getStatusIndex(order?.status)

  const steps = [
    {
      title: "Order Placed",
      time: order?.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
      description: "We have received your order",
      icon: ArchiveBoxIcon
    },
    {
      title: "Payment Confirmed",
      time: order?.paid_at ? new Date(order.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
      description: "Payment successful",
      icon: CreditCardIcon
    },
    {
      title: "Processing",
      time: "",
      description: "Preparing your order",
      icon: CheckCircleIconOutline
    },
    {
      title: "Shipped",
      time: "",
      description: "On its way",
      icon: TruckIcon
    },
    {
      title: "Delivered",
      time: "",
      description: "Reached destination",
      icon: ShoppingBagIcon
    }
  ]

  return (
    <SafeAreaView className="flex-1 bg-gray-50/30" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Decorative Animated Blobs */}
        <Animated.View 
            style={{ transform: [{ translateY: floatY }], opacity: 0.15 }}
            className="absolute -top-10 -right-10 w-64 h-64 bg-primary-200 rounded-full"
        />
        <Animated.View 
            style={{ transform: [{ translateY: Animated.multiply(floatY, -0.8) }], opacity: 0.1 }}
            className="absolute top-1/2 -left-20 w-48 h-48 bg-green-200 rounded-full"
        />

        <View className="flex-1 px-6 pt-12 pb-10">
          {/* Success Illustration Area */}
          <Animated.View
            style={{
              transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
              opacity: fadeAnim,
            }}
            className="items-center mb-10"
          >
            <View className="relative items-center justify-center p-4">
                <View className="w-28 h-28 bg-green-50 rounded-full items-center justify-center shadow-sm">
                    <CheckCircleIconSolid size={70} color="#10B981" />
                </View>
                {/* Visual echoes/rings */}
                <Animated.View 
                    style={{ transform: [{ scale: pulseAnim }], opacity: 0.3 }}
                    className="absolute inset-0 border-2 border-green-100 rounded-full" 
                />
                <Animated.View 
                    style={{ transform: [{ scale: Animated.add(pulseAnim, 0.2) }], opacity: 0.1 }}
                    className="absolute -inset-4 border border-green-50 rounded-full" 
                />
            </View>

            <Text className="text-3xl font-NunitoExtraBold text-gray-900 mt-6 mb-2 tracking-tight">Order Confirmed!</Text>
            <Text className="text-base text-gray-400 text-center font-NunitoSemiBold px-8 leading-6">
              Processing your request. You'll receive a confirmation email shortly.
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: contentSlideAnim }],
            }}
            className="w-full space-y-6"
          >
            {/* Order Identity Card */}
            <View 
                className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100/50 mb-6"
                style={{ elevation: 2 }}
            >
              <View className="flex-row justify-between items-center mb-6">
                <View>
                    <Text className="text-xs text-gray-400 font-NunitoBold uppercase tracking-wider mb-1">Receipt</Text>
                    <Text className="text-xl font-NunitoExtraBold text-gray-900">Order Details</Text>
                </View>
                {isLoading && <View className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />}
              </View>

              <View className="space-y-5">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                        <View className="w-9 h-9 bg-gray-50 rounded-xl items-center justify-center mr-3">
                            <ClipboardDocumentIcon size={18} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-500 font-NunitoBold">Order ID</Text>
                    </View>
                    <TouchableOpacity onPress={handleCopyOrderId} activeOpacity={0.6}>
                        <Text className="font-NunitoExtraBold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg overflow-hidden" numberOfLines={1}>
                            {orderId ? `#${orderId.substring(0, 10).toUpperCase()}` : "REF-..."}
                        </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                        <View className="w-9 h-9 bg-gray-50 rounded-xl items-center justify-center mr-3">
                            <CreditCardIcon size={18} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-500 font-NunitoBold">Payment Status</Text>
                    </View>
                    <View className="bg-green-50 px-3 py-1 rounded-full">
                        <Text className="font-NunitoExtraBold text-green-600 text-xs uppercase">
                            {order?.status || (isLoading ? "..." : "Success")}
                        </Text>
                    </View>
                  </View>
              </View>
            </View>

            {/* Order Items List */}
            {order?.items && order.items.length > 0 && (
              <Animated.View 
                style={{ opacity: itemAnims }}
                className="bg-white rounded-[32px] p-6 mb-6 shadow-sm border border-gray-100/50"
              >
                <Text className="text-lg font-NunitoExtraBold text-gray-900 mb-6">Items</Text>
                
                {order.items.map((item: any, idx: number) => (
                  <View key={item.id || idx} className={`flex-row items-center ${idx !== order.items.length - 1 ? 'pb-5 mb-5 border-b border-gray-50' : ''}`}>
                    <View className="w-16 h-20 bg-gray-100/80 rounded-2xl items-center justify-center mr-4 overflow-hidden shadow-inner">
                      <Image 
                        source={item.product?.images?.[0]?.image ? { uri: item.product.images[0].image } : icons.logoBox} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-NunitoExtraBold text-sm mb-0.5" numberOfLines={1}>
                        {item.product?.name || "Product Item"}
                      </Text>
                      <Text className="text-gray-400 font-NunitoBold text-[10px] uppercase">
                        QTY: {item.quantity || 1} • ₦{parseFloat(item.price || "0").toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-gray-900 font-NunitoExtraBold text-sm">
                      ₦{((item.quantity || 1) * parseFloat(item.price || "0")).toLocaleString()}
                    </Text>
                  </View>
                ))}

                {/* Pricing Summary */}
                <View className="mt-4 pt-4 border-t border-gray-100">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-400 font-NunitoBold">Amount Paid</Text>
                        <Text className="text-xl font-NunitoExtraBold text-primary-600">
                             ₦{order?.total_amount ? parseFloat(order.total_amount).toLocaleString() : "..."}
                        </Text>
                    </View>
                </View>
              </Animated.View>
            )}

            {/* Order Journey Timeline */}
            <View 
                className="bg-white rounded-[32px] p-6 mb-6 shadow-sm border border-gray-100/50"
            >
                <Text className="text-lg font-NunitoExtraBold text-gray-900 mb-6">Order Journey</Text>
                
                <View className="ml-1">
                    {steps.map((step, index) => {
                        const isCompleted = index <= currentIndex || (order?.status?.toLowerCase() === 'delivered' || order?.status?.toLowerCase() === 'completed');
                        const isActive = index === currentIndex && (order?.status?.toLowerCase() !== 'delivered' && order?.status?.toLowerCase() !== 'completed');
                        const isPending = index > currentIndex && (order?.status?.toLowerCase() !== 'delivered' && order?.status?.toLowerCase() !== 'completed');

                        return (
                            <View key={index} className="flex-row items-start">
                                {/* Connector and Dot */}
                                <View className="items-center mr-4">
                                    <View 
                                        className={`w-7 h-7 rounded-full items-center justify-center z-10 
                                        ${isCompleted ? 'bg-green-500' : 
                                            isActive ? 'bg-primary-500 shadow-sm shadow-primary-300' : 'bg-gray-100'}`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircleIconSolid size={16} color="white" />
                                        ) : (
                                            <step.icon size={14} color={isActive ? "white" : "#9CA3AF"} />
                                        )}
                                    </View>
                                    {index < steps.length - 1 && (
                                        <View 
                                            className={`w-[2px] h-10 ${isCompleted ? 'bg-green-500' : 'bg-gray-100'}`} 
                                        />
                                    )}
                                </View>

                                {/* Content */}
                                <View className="flex-1 pb-4">
                                    <View className="flex-row justify-between items-center mb-0.5">
                                        <Text className={`text-sm font-NunitoBold ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                                            {step.title}
                                        </Text>
                                        {isCompleted && step.time ? (
                                            <Text className="text-[10px] font-NunitoSemiBold text-gray-400">{step.time}</Text>
                                        ) : null}
                                    </View>
                                    <Text className={`text-[10px] font-NunitoMedium leading-4 ${isPending ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {isActive ? step.description : isCompleted ? "Completed" : "Pending"}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-3 pt-4 gap-3">

                <CustomButton 
                    title="Continue Shopping"
                    onPress={() => router.replace(routes.home)}
                    bgVariant="outline" 
                    textVariant="outline"
                    className="rounded-2xl"
                />
            </View>

            {/* Need Help Section */}
            <View className="mt-12 bg-gray-50 rounded-3xl p-6 items-center">
                <Text className="text-gray-400 font-NunitoBold text-xs uppercase tracking-widest mb-5">Support Center</Text>
                <View className="flex-row items-center justify-around w-full">
                    <TouchableOpacity className="items-center px-4">
                        <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm mb-2">
                            <QuestionMarkCircleIcon size={24} color="#D30309" />
                        </View>
                        <Text className="text-gray-700 font-NunitoBold text-xs">Support</Text>
                    </TouchableOpacity>
                    
                    <View className="w-[1px] h-10 bg-gray-200" />

                    <TouchableOpacity className="items-center px-4">
                        <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm mb-2">
                            <ChatBubbleBottomCenterTextIcon size={24} color="#D30309" />
                        </View>
                        <Text className="text-gray-700 font-NunitoBold text-xs">Live Chat</Text>
                    </TouchableOpacity>
                </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default OrderConfirmation
