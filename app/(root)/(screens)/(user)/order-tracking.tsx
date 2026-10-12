"use client"

import { View, Text, ScrollView, TouchableOpacity, Animated, Image, Platform } from "react-native"
import { useEffect, useRef } from "react"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  TruckIcon, 
  CheckCircleIcon, 
  ArchiveBoxIcon, 
  ShoppingBagIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon
} from "react-native-heroicons/outline"
import { CheckCircleIcon as CheckCircleIconSolid } from "react-native-heroicons/solid"
import { icons } from "@/constants"
import CustomButton from "@/components/CustomButton"
import { routes } from "@/constants/routes"

import { useQuery } from "@tanstack/react-query"
import { productsAPI } from "@/lib/api/products"
import LoadingSpinner from "@/components/LoadingSpinner"
import AnimatedErrorCard from "@/components/AnimatedErrorCard"

const OrderTracking = () => {
  const { id } = useLocalSearchParams()
  const orderId = (id as string) || ""

  // Fetch order detail
  const { data: orderResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["orderStatus", orderId],
    queryFn: () => productsAPI.getOrderById(orderId),
    enabled: !!orderId,
  })

  const order = Array.isArray(orderResponse?.data) 
    ? orderResponse?.data[0] 
    : orderResponse?.data

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    if (!isLoading && order) {
        Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }),
        ]).start()
    }
  }, [isLoading, order])

  if (isLoading) return <LoadingSpinner message="Fetching order status..." />
  
  if (error || !order) {
    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            <View className="flex-row items-center px-6 py-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-4">
                    <ArrowLeftIcon size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-xl font-NunitoExtraBold text-gray-900">Track Order</Text>
            </View>
            <View className="px-6 py-10">
                <AnimatedErrorCard 
                    title="Order Not Found"
                    message="We couldn't find the tracking details for this order. It might still be processing."
                    actionButton={{ text: "Try Again", onPress: () => refetch() }}
                    emoji="📦"
                    gradientColors={["#FEE2E2", "#FECACA", "#FFFFFF"]}
                    textColor="#991B1B"
                />
            </View>
        </SafeAreaView>
    )
  }

  // Map API status to stepper
  const getStatusIndex = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'pending' || s === 'paid') return 0
    if (s === 'processing' || s === 'packed') return 1
    if (s === 'shipped') return 2
    if (s === 'out_for_delivery') return 3
    if (s === 'delivered' || s === 'completed') return 4
    return 0
  }

  const currentIndex = getStatusIndex(order.status)

  const steps = [
    {
      title: "Order Placed",
      time: order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
      description: "We have received your order",
      icon: ArchiveBoxIcon
    },
    {
      title: "Processing",
      time: "",
      description: "Your order is being prepared for shipment",
      icon: CheckCircleIcon
    },
    {
      title: "Shipped",
      time: "",
      description: "Package is on its way",
      icon: TruckIcon
    },
    {
      title: "Out for Delivery",
      time: "",
      description: "Courier is in your area",
      icon: MapPinIcon
    },
    {
      title: "Delivered",
      time: "",
      description: "Order reached destination",
      icon: ShoppingBagIcon
    }
  ]

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-4"
        >
          <ArrowLeftIcon size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-NunitoExtraBold text-gray-900">Track Order</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 70 : 40 }}>
        <Animated.View 
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          className="px-6 py-6"
        >
          {/* Order Info Card */}
          <View className="bg-primary-50 p-6 rounded-3xl mb-8 flex-row items-center justify-between">
            <View>
              <Text className="text-primary-600 font-NunitoBold text-xs uppercase tracking-widest mb-1">Status</Text>
              <Text className="text-2xl font-NunitoExtraBold text-gray-900 capitalize">{order.status || 'Processing'}</Text>
              <Text className="text-gray-500 font-NunitoSemiBold">Updated: {new Date(order.updated_at || order.created_at).toLocaleDateString()}</Text>
            </View>
            <View className="bg-white p-3 rounded-2xl shadow-sm">
              <TruckIcon size={32} color="#D30309" />
            </View>
          </View>

          <View className="mb-6 flex-row justify-between items-center">
            <View>
              <Text className="text-gray-400 font-NunitoBold text-xs uppercase tracking-widest">Order ID</Text>
              <Text className="text-lg font-NunitoBold text-gray-900">#{order.id?.substring(0, 10).toUpperCase()}</Text>
            </View>
            <TouchableOpacity 
                onPress={() => router.push({ pathname: routes.orderDetail, params: { id: order.id } })}
                className="bg-gray-100 px-4 py-2 rounded-full"
            >
              <Text className="text-primary-600 font-NunitoBold text-xs">View Items</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Implementation */}
          <View className="ml-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex || order.status === 'delivered';
              const isActive = index === currentIndex && order.status !== 'delivered';
              const isPending = index > currentIndex;

              return (
              <View key={index} className="flex-row items-start mb-2">
                {/* Connector and Dot */}
                <View className="items-center mr-6">
                  <View 
                    className={`w-8 h-8 rounded-full items-center justify-center z-10 
                      ${isCompleted ? 'bg-green-500' : 
                        isActive ? 'bg-primary-500 shadow-lg shadow-primary-300' : 'bg-gray-100'}`}
                  >
                    {isCompleted ? (
                      <CheckCircleIconSolid size={20} color="white" />
                    ) : (
                      <step.icon size={18} color={isActive ? "white" : "#9CA3AF"} />
                    )}
                  </View>
                  {index < steps.length - 1 && (
                    <View 
                      className={`w-1 h-14 -my-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-100'}`} 
                    />
                  )}
                </View>

                {/* Content */}
                <View className="flex-1 pb-8">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className={`text-base font-NunitoBold ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                      {step.title}
                    </Text>
                    {isCompleted && <Text className="text-xs font-NunitoSemiBold text-gray-400">{step.time}</Text>}
                  </View>
                  <Text className={`text-sm font-NunitoMedium leading-5 ${isPending ? 'text-gray-300' : 'text-gray-500'}`}>
                    {isActive ? step.description : isCompleted ? "Completed" : "Scheduled"}
                  </Text>
                </View>
              </View>
              )
            })}
          </View>

          {/* Courier Card (Optional/Simulated) */}
          <View className="bg-gray-50 p-5 rounded-3xl border border-gray-100 mb-8 mt-4">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center mr-4 border border-gray-100">
                <icons.logo width={24} height={24} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 font-NunitoBold text-[10px] uppercase tracking-widest">Delivery Partner</Text>
                <Text className="text-base font-NunitoBold text-gray-900">OGA Logistics Team</Text>
              </View>
              <View className="flex-row space-x-2 gap-2">
                <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100">
                  <PhoneIcon size={18} color="#D30309" />
                </TouchableOpacity>
                <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100">
                  <ChatBubbleLeftRightIcon size={18} color="#D30309" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="bg-white p-3 rounded-2xl">
              <Text className="text-xs text-center font-NunitoSemiBold text-gray-500 italic">
                "Speedy delivery is our priority. Your items are safe with us!"
              </Text>
            </View>
          </View>

          <CustomButton 
            title="Back to Home"
            onPress={() => router.replace(routes.home)}
            bgVariant="primary"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default OrderTracking
