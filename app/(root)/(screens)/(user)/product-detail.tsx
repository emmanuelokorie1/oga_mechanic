import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Share,
  Platform,
  Linking,
  Image,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from 'expo-haptics';
import { 
  ArrowLeftIcon,
  TagIcon,
  CalendarDaysIcon,
  CogIcon,
  BeakerIcon,
  UsersIcon,
  PaintBrushIcon,
  CheckBadgeIcon,
  BoltIcon,
  IdentificationIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ShareIcon,
  InformationCircleIcon,
  HeartIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
} from "react-native-heroicons/outline";
import { StarIcon, HeartIcon as HeartIconSolid, CheckCircleIcon as CheckCircleIconSolid } from "react-native-heroicons/solid";

import { useProductDetail, useToggleFavorite } from "@/hooks/useProducts";
import { useMerchantProfileByUuid, usePrimaryUserProfile, useUserCars } from "@/hooks/useUserProfile";
import { useVehicleMakes } from "@/hooks/useVehicleMakes";
import { communicationsAPI } from "@/lib/api/communications";
import { showToast } from "@/utils/toastUtils";
import { getApiErrorMessage } from "@/utils/errorMessages";
import LoadingSpinner from "@/components/LoadingSpinner";
import ContactSelectionModal from "@/components/modals/ContactSelectionModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SpecItemProps {
  icon: any;
  label: string;
  value: string;
  colorClass?: string;
}

const SpecItem = ({ icon: Icon, label, value, colorClass = "bg-blue-500" }: SpecItemProps) => (
  <View className="bg-white p-3 rounded-2xl border border-gray-100 flex-1 min-w-[45%] flex-row items-center shadow-xs">
    <View className={`w-8 h-8 ${colorClass} rounded-xl items-center justify-center mr-2.5`}>
      <Icon size={16} color="white" />
    </View>
    <View className="flex-1">
      <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider">{label}</Text>
      <Text className="text-[13px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const FeatureItem = ({ label, isSafety = false }: { label: string; isSafety?: boolean }) => (
  <View className={`flex-row items-center px-3 py-1.5 rounded-xl mr-2 mb-2 border ${
    isSafety ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100'
  }`}>
    <View className={`w-1.5 h-1.5 rounded-full mr-2 ${isSafety ? 'bg-red-500' : 'bg-primary-500'}`} />
    <Text className={`text-[12px] font-NunitoBold ${isSafety ? 'text-red-900' : 'text-gray-700'}`}>
      {label}
    </Text>
  </View>
);

const ProductDetail = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as { id?: string; productId?: string };
  const productId = params?.id || params?.productId;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFavoriteSuccess, setShowFavoriteSuccess] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  // API hooks
  const { data: product, isLoading, error, refetch } = useProductDetail(productId || "");
  const { data: merchantProfileData } = useMerchantProfileByUuid(product?.merchant_id || "", !!product?.merchant_id);
  const { data: profileResponse } = usePrimaryUserProfile();
  const { data: vehicles } = useUserCars();
  const { data: vehicleMakes } = useVehicleMakes();
  const toggleFavoriteMutation = useToggleFavorite();

  const getMakeName = (makeId: number) => {
    if (!vehicleMakes || !makeId) return 'N/A';
    const make = vehicleMakes.find(m => m.id === makeId);
    return make?.name || 'N/A';
  };

  const getModelName = (makeId: number, modelId: number) => {
    if (!vehicleMakes || !makeId || !modelId) return 'N/A';
    const make = vehicleMakes.find(m => m.id === makeId);
    const model = make?.models?.find(m => m.id === modelId);
    return model?.name || 'N/A';
  };

  const isSparePart = Boolean(
    !product?.is_rental && (
      product?.category?.name?.toLowerCase().includes('part') ||
      (!product?.category?.name?.toLowerCase().includes('car') && !(product as any)?.make)
    )
  );

  const pageTitle = product?.is_rental
    ? 'Rental Details'
    : isSparePart
      ? 'Spare Part Details'
      : 'Vehicle Details';

  const productImages: string[] = useMemo(() => {
    if (!product?.images?.length) {
      return product?.image ? [product.image] : [];
    }
    return product.images.map((img: any) => img.image);
  }, [product]);

  useEffect(() => {
    if (product && !isLoading) {
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [product, isLoading]);

  useFocusEffect(
    useCallback(() => {
      if (productId) {
        refetch();
      }
    }, [productId, refetch])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try {
      const priceValue = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      const shareMessage = `Check out ${product.name} on Oga Mechanic! 🚗\n\nPrice: ₦${priceValue.toLocaleString()}\n\nView details and contact the seller on the Oga Mechanic app: https://ogamechanic.org`;
      await Share.share({
        message: shareMessage,
        title: product.name,
      });
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [product]);

  const productPrice = useMemo(() => {
    if (!product) return 0;
    return typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  }, [product?.price]);

  const handleCall = useCallback(() => {
    if (!product) return;
    const merchantPhone = merchantProfileData?.data?.merchant_profile?.user?.phone_number;
    const fallbackPhone = (product as any).merchant?.phone_number || product.contact_info?.phone || "08000000000";
    
    if (merchantPhone || fallbackPhone) {
      setIsContactModalVisible(true);
    } else {
      showToast.error("Seller phone number not available");
    }
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [product, merchantProfileData]);

  const performVoiceCall = useCallback(() => {
    if (!product) return;
    const merchantPhone = merchantProfileData?.data?.merchant_profile?.user?.phone_number;
    const fallbackPhone = (product as any).merchant?.phone_number || product.contact_info?.phone || "08000000000";
    const phoneNumber = merchantPhone || fallbackPhone;
    Linking.openURL(`tel:${phoneNumber}`);
  }, [product, merchantProfileData]);

  const performWhatsAppCall = useCallback(() => {
    if (!product) return;
    const merchantPhone = merchantProfileData?.data?.merchant_profile?.user?.phone_number;
    const fallbackPhone = (product as any).merchant?.phone_number || product.contact_info?.phone || "08000000000";
    const phoneNumber = merchantPhone || fallbackPhone;
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    const user = (profileResponse as any)?.data || (profileResponse as any)?.user;
    const activeRole = user?.active_role || (profileResponse as any)?.active_role || "customer";
    const isMechanic = activeRole.toLowerCase() === 'mechanic';
    const roleLabel = isMechanic ? "a mechanic" : "a customer";
    
    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const userName = (firstName || lastName) ? `${firstName} ${lastName}` : "a user";
    
    const message = `Hi, I'm ${userName}, ${roleLabel} from Oga Mechanic. I'm interested in your ${product.name} (₦${productPrice.toLocaleString()}). Is it available?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
    
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl);
      } else {
        showToast.error("WhatsApp is not installed on this device");
      }
    });
  }, [product, merchantProfileData, productPrice, profileResponse]);

  const handleChat = useCallback(async () => {
    if (!product) return;

    try {
      const sellerUserId = 
        merchantProfileData?.data?.merchant_profile?.user?.id || 
        (merchantProfileData?.data?.merchant_profile as any)?.user_id ||
        (merchantProfileData?.data as any)?.user_id ||
        product.merchant_id;

      if (!sellerUserId) {
        showToast.error("Could not find seller information.");
        return;
      }

      const roomsResponse = await communicationsAPI.getChatRooms();
      const rooms = roomsResponse?.results?.data || [];
      
      const existingRoom = rooms.find((room: any) => 
        room.participants?.some((p: any) => p.id === sellerUserId) ||
        room.other_participant?.id === sellerUserId
      );

      let roomId: string;

      if (existingRoom) {
        roomId = existingRoom.id;
      } else {
        const createResponse = await communicationsAPI.createChatRoom([sellerUserId]);
        if (createResponse.status && createResponse.data) {
          roomId = createResponse.data.id;
        } else {
          showToast.error("Could not start chat. Please try again.");
          return;
        }
      }

      router.push({
        pathname: "/(root)/(screens)/(user)/chat-room",
        params: {
          roomId: roomId,
          participantName: product.merchant_email ? product.merchant_email.split('@')[0] : 'Seller',
          participantAvatar: product.images?.[0]?.image || "",
        }
      });
    } catch (error) {
      console.error("❌ Chat connection error:", error);
      showToast.error("Failed to connect with seller.");
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [product, merchantProfileData]);

  // Check compatibility with user's car
  const compatibilityInfo = useMemo(() => {
    if (!product) return { isCompatible: false, userCar: "" };
    
    const user = (profileResponse as any)?.data || (profileResponse as any)?.user;
    const cars = vehicles || [];
    
    const productTitle = product.name?.toLowerCase() || "";
    const categoryName = product.category?.name?.toLowerCase() || "";
    const productMake = String((product as any).make_id || "").toLowerCase();

    if (user?.car_make) {
      const makeLower = user.car_make.toLowerCase();
      if (productTitle.includes(makeLower) || categoryName.includes(makeLower) || productMake.includes(makeLower)) {
        return { isCompatible: true, userCar: `${user.car_year || ""} ${user.car_make} ${user.car_model || ""}`.trim() };
      }
    }

    for (const car of cars) {
      if (car.make) {
        const makeLower = car.make.toLowerCase();
        if (productTitle.includes(makeLower) || categoryName.includes(makeLower) || productMake.includes(makeLower)) {
          return { isCompatible: true, userCar: `${car.year || ""} ${car.make} ${car.model || ""}`.trim() };
        }
      }
    }

    return { isCompatible: false, userCar: "" };
  }, [product, profileResponse, vehicles]);

  const handleToggleFavorite = useCallback(async () => {
    if (!product) return;
    const isCurrentlyFavorited = product.is_in_favorite_list || false;
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await toggleFavoriteMutation.mutateAsync({
        productId: product.id,
        isCurrentlyFavorited,
      });
      showToast.success(
        isCurrentlyFavorited ? "Removed from favorites" : "Added to favorites"
      );
      setShowFavoriteSuccess(true);
      await refetch();
      setTimeout(() => setShowFavoriteSuccess(false), 2000);
    } catch (e) {
      setShowFavoriteSuccess(false);
      showToast.error("Failed to update favorites. Please try again.");
    }
  }, [product?.is_in_favorite_list, product?.id, toggleFavoriteMutation, refetch]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const hasFeatures = Boolean(
    (product as any)?.air_conditioning || (product as any)?.leather_seats || (product as any)?.navigation_system ||
    (product as any)?.bluetooth || (product as any)?.parking_sensors || (product as any)?.sunroof ||
    (product as any)?.airbags || (product as any)?.abs || (product as any)?.traction_control ||
    (product as any)?.lane_assist || (product as any)?.blind_spot_monitor
  );

  if (!productId) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-4" edges={["top"]}>
        <StatusBar style="dark" />
        <Text className="text-red-500 text-center text-lg mb-4">Product ID not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-primary-500 px-6 py-3 rounded-xl">
          <Text className="text-white font-NunitoBold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={["top"]}>
        <StatusBar style="dark" />
        <LoadingSpinner message="Loading product details..." />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar style="dark" />
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
            <ArrowLeftIcon size={20} color="#000" />
          </TouchableOpacity>
          <Text className="text-[17px] font-NunitoExtraBold text-gray-900">{pageTitle}</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <InformationCircleIcon size={64} color="#D1D5DB" />
          <Text className="text-xl font-NunitoExtraBold text-gray-900 mt-4 text-center">Something went wrong</Text>
          <Text className="text-sm font-NunitoMedium text-gray-500 mt-2 text-center">
            {error ? getApiErrorMessage(error, 'products') : 'Product not found'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-8 bg-primary-500 px-8 py-3 rounded-full">
            <Text className="text-white font-NunitoBold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Modern Header */}
      <View className="flex-row items-center justify-between bg-white px-6 py-4 border-b border-gray-50">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
        >
          <ArrowLeftIcon size={20} color="#000" />
        </TouchableOpacity>
        <Text className="text-[17px] font-NunitoExtraBold text-gray-900">
          {pageTitle}
        </Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={handleToggleFavorite}
            disabled={toggleFavoriteMutation.isPending}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              product.is_in_favorite_list ? 'bg-red-50' : 'bg-gray-50'
            }`}
            activeOpacity={0.75}
          >
            {toggleFavoriteMutation.isPending ? (
              <ActivityIndicator size="small" color="#D30309" />
            ) : product.is_in_favorite_list ? (
              <HeartIconSolid size={20} color="#EF4444" />
            ) : (
              <HeartIcon size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleShare}
            className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
            activeOpacity={0.75}
          >
            <ShareIcon size={18} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#D30309"]} tintColor="#D30309" />
        }
      >
        {/* Compatibility Banner */}
        {compatibilityInfo.isCompatible && (
          <View className="mx-4 mt-2 mb-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex-row items-center">
            <View className="w-10 h-10 bg-emerald-500 rounded-xl items-center justify-center mr-3 shadow-sm shadow-emerald-200">
              <CheckCircleIconSolid size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-emerald-900 font-NunitoExtraBold text-sm">Fits Your Vehicle</Text>
              <Text className="text-emerald-700 font-NunitoMedium text-xs">Compatible with your {compatibilityInfo.userCar}</Text>
            </View>
          </View>
        )}

        {/* Compact Premium Image Gallery */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }} className="relative bg-white pb-2 pt-1">
          <View className="mx-4 bg-white rounded-[24px] overflow-hidden shadow-xl shadow-gray-400/25 border border-gray-100">
            <TouchableOpacity 
              activeOpacity={0.95}
              onPress={() => productImages.length > 0 && setIsFullScreen(true)}
              className="w-full h-[210px] bg-gray-50"
            >
              {productImages.length > 0 && !imageErrors.has(selectedImageIndex) ? (
                <Image
                  source={{ uri: productImages[selectedImageIndex] }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={() => handleImageError(selectedImageIndex)}
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <PhotoIcon size={56} color="#E5E7EB" />
                  <Text className="text-gray-400 font-NunitoBold mt-2 text-xs">No Visuals Available</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Category Overlay */}
            <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 shadow-sm pointer-events-none">
              <Text className="text-[10px] font-NunitoExtraBold text-gray-900 uppercase tracking-wider">
                {product.category?.name || (product as any).body_type?.replace('_', ' ') || 'Product'}
              </Text>
            </View>

            {/* View Full Screen Button */}
            {productImages.length > 0 && (
              <TouchableOpacity
                onPress={() => setIsFullScreen(true)}
                activeOpacity={0.8}
                className="absolute top-3 right-3 bg-black/45 backdrop-blur-md px-2.5 py-1.5 rounded-full flex-row items-center border border-white/20 shadow-sm"
              >
                <ArrowsPointingOutIcon size={12} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-white text-[11px] font-NunitoBold ml-1">Full View</Text>
              </TouchableOpacity>
            )}

            {/* Compact Image Navigation */}
            {productImages.length > 1 && (
              <View className="absolute bottom-3 inset-x-0 flex-row justify-between items-center px-3">
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                  className="w-8 h-8 bg-white/85 backdrop-blur-md rounded-full items-center justify-center shadow-sm"
                  disabled={selectedImageIndex === 0}
                  activeOpacity={0.7}
                >
                  <ChevronLeftIcon size={16} color={selectedImageIndex === 0 ? "#D1D5DB" : "#111827"} strokeWidth={2.5} />
                </TouchableOpacity>
                <View className="flex-row items-center space-x-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full">
                  {productImages.map((_: any, index: number) => (
                    <View 
                      key={index} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${index === selectedImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} 
                    />
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.min(productImages.length - 1, selectedImageIndex + 1))}
                  className="w-8 h-8 bg-white/85 backdrop-blur-md rounded-full items-center justify-center shadow-sm"
                  disabled={selectedImageIndex === productImages.length - 1}
                  activeOpacity={0.7}
                >
                  <ChevronRightIcon size={16} color={selectedImageIndex === productImages.length - 1 ? "#D1D5DB" : "#111827"} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Content Section */}
        <Animated.View 
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          className="px-5 pt-2 pb-10"
        >
          {/* Main Info Card */}
          <View className="bg-white rounded-[26px] p-4 shadow-xs border border-gray-200 mb-4">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-[20px] font-NunitoExtraBold text-gray-900 leading-tight mb-2">
                  {product.name}
                </Text>
                <View className="flex-row items-center flex-wrap gap-2">
                  <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                    <StarIcon size={14} color="#F59E0B" />
                    <Text className="text-gray-900 font-NunitoExtraBold text-[12px] ml-1">
                      {product.merchant_rating ? Number(product.merchant_rating).toFixed(1) : '5.0'}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-[12px] font-NunitoBold ml-1">
                    Verified Merchant Listing
                  </Text>
                </View>
              </View>
            </View>

            {/* Premium Pricing Block */}
            <View className="bg-primary-50 rounded-[24px] p-4 flex-row items-center justify-between border border-primary-100/50">
              <View className="flex-1 mr-2">
                <Text className="text-primary-400 font-NunitoBold text-[10px] uppercase tracking-widest mb-1">
                  Market Price
                </Text>
                <View className="flex-row items-baseline flex-wrap">
                  <Text className="text-primary-700 font-NunitoExtraBold text-[24px]">
                    ₦{productPrice.toLocaleString()}
                  </Text>
                </View>
              </View>

              {product.stock !== undefined && (
                <View className="shrink-0 bg-white/70 backdrop-blur-md px-3 py-2 rounded-2xl border border-white">
                  <Text className="text-primary-600 font-NunitoExtraBold text-[11px]">
                    {product.stock} In Stock
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Specifications / Part Information Grid */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-[17px] font-NunitoExtraBold text-gray-900">
                {isSparePart ? 'Part Information' : 'Specifications'}
              </Text>
              <CogIcon size={18} color="#9CA3AF" />
            </View>
            <View className="flex-row flex-wrap gap-3">
              {isSparePart ? (
                <>
                  {product.category?.name && (
                    <SpecItem icon={TagIcon} label="Category" value={product.category.name} colorClass="bg-blue-500" />
                  )}
                  {(product as any).condition && (
                    <SpecItem icon={CheckBadgeIcon} label="Condition" value={(product as any).condition} colorClass="bg-indigo-500" />
                  )}
                  {product.stock !== undefined && (
                    <SpecItem icon={BoltIcon} label="Stock" value={`${product.stock} Units`} colorClass="bg-emerald-500" />
                  )}
                  {(product as any).delivery_option && (
                    <SpecItem icon={IdentificationIcon} label="Delivery" value={(product as any).delivery_option} colorClass="bg-orange-500" />
                  )}
                  {(product as any).created_at && (
                    <SpecItem 
                      icon={CalendarDaysIcon} 
                      label="Listed Date" 
                      value={new Date((product as any).created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                      colorClass="bg-purple-500" 
                    />
                  )}
                </>
              ) : (
                <>
                  {(product as any).transmission && (
                    <SpecItem icon={BoltIcon} label="Gear" value={(product as any).transmission} colorClass="bg-orange-500" />
                  )}
                  {(product as any).fuel_type && (
                    <SpecItem icon={BeakerIcon} label="Energy" value={(product as any).fuel_type} colorClass="bg-blue-500" />
                  )}
                  {(product as any).number_of_seats && (
                    <SpecItem icon={UsersIcon} label="Capacity" value={`${(product as any).number_of_seats} Seats`} colorClass="bg-purple-500" />
                  )}
                  {(product as any).exterior_color && (
                    <SpecItem icon={PaintBrushIcon} label="Exterior" value={(product as any).exterior_color} colorClass="bg-gray-700" />
                  )}
                  {(product as any).year && (
                    <SpecItem icon={CalendarDaysIcon} label="Model Year" value={(product as any).year.toString()} colorClass="bg-green-500" />
                  )}
                  {(product as any).condition && (
                    <SpecItem icon={CheckBadgeIcon} label="Condition" value={(product as any).condition} colorClass="bg-indigo-500" />
                  )}
                </>
              )}
            </View>
          </View>

          {/* Vehicle Compatibility Section (Spare Parts) */}
          {(product as any).vehicle_compatibility && (product as any).vehicle_compatibility.length > 0 && (
            <View className="mb-6 bg-white rounded-[26px] p-5 shadow-xs border border-gray-200">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                  <CogIcon size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-NunitoExtraBold text-gray-900">Vehicle Compatibility</Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">Compatible vehicle makes & models</Text>
                </View>
              </View>
              <View className="space-y-2.5">
                {(product as any).vehicle_compatibility.map((compat: any, index: number) => (
                  <View key={index} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                    <Text className="text-xs font-NunitoBold text-primary-600 mb-1.5 uppercase tracking-wider">
                      Vehicle {index + 1}: {getMakeName(compat.make)}
                    </Text>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-gray-500 font-NunitoMedium">Compatible Models</Text>
                      <Text className="text-xs font-NunitoBold text-gray-900">
                        {Array.isArray(compat.model)
                          ? compat.model.map((modelId: number) => getModelName(compat.make, modelId)).join(', ')
                          : getModelName(compat.make, compat.model)
                        }
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Key Features Section (Vehicles) */}
          {hasFeatures && (
            <View className="mb-6 bg-white rounded-[26px] p-4 shadow-xs border border-gray-200">
              <View className="flex-row items-center mb-5">
                <SparklesIcon size={20} color="#D30309" />
                <Text className="text-[17px] font-NunitoExtraBold text-gray-900 ml-2.5">Key Features</Text>
              </View>
              
              <View className="mb-4">
                <Text className="text-[11px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest mb-3">Amenities</Text>
                <View className="flex-row flex-wrap">
                  {(product as any).air_conditioning && <FeatureItem label="A/C System" />}
                  {(product as any).leather_seats && <FeatureItem label="Leather Interior" />}
                  {(product as any).navigation_system && <FeatureItem label="GPS Navigation" />}
                  {(product as any).bluetooth && <FeatureItem label="Premium Audio" />}
                  {(product as any).parking_sensors && <FeatureItem label="Proximity Sensors" />}
                  {(product as any).sunroof && <FeatureItem label="Panoramic Roof" />}
                </View>
              </View>

              <View>
                <Text className="text-[11px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest mb-3">Safety & Assistance</Text>
                <View className="flex-row flex-wrap">
                  {(product as any).airbags && <FeatureItem label="Dual Airbags" isSafety />}
                  {(product as any).abs && <FeatureItem label="ABS Braking" isSafety />}
                  {(product as any).traction_control && <FeatureItem label="Traction Control" isSafety />}
                  {(product as any).lane_assist && <FeatureItem label="Lane Departure" isSafety />}
                  {(product as any).blind_spot_monitor && <FeatureItem label="Blind Spot Monitoring" isSafety />}
                </View>
              </View>
            </View>
          )}

          {/* Description Section */}
          <View className="mb-6 px-1">
            <Text className="text-[17px] font-NunitoExtraBold text-gray-900 mb-3">
              {isSparePart ? 'Product Description' : 'Vehicle Narrative'}
            </Text>
            <View className="bg-white rounded-[24px] p-4 border border-gray-200 shadow-xs">
              <Text className="text-gray-500 font-NunitoMedium leading-6 text-[14px]">
                {product.description || (isSparePart ? "No description provided for this product." : "No narrative provided for this vehicle. Contact merchant for detailed operational requirements.")}
              </Text>
            </View>
          </View>

          {/* Merchant / Seller Section */}
          <View className="mb-4 bg-white rounded-[26px] p-5 shadow-xs border border-gray-200">
            <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
              <View className="flex-1 mr-2">
                <Text className="text-[16px] font-NunitoExtraBold text-gray-900">
                  Seller Information
                </Text>
                <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">
                  Verified merchant on Oga Mechanic
                </Text>
              </View>
              <View className="shrink-0 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <Text className="text-blue-700 text-[10px] font-NunitoBold">Verified Seller</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center border border-primary-200">
                  <Text className="text-primary-700 font-NunitoExtraBold text-base uppercase">
                    {merchantProfileData?.data?.merchant_profile?.store_name?.[0] || product.merchant_email?.[0] || 'M'}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                    {merchantProfileData?.data?.merchant_profile?.store_name || (product.merchant_email ? product.merchant_email.split('@')[0] : 'Merchant Store')}
                  </Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">
                    Rating: {product.merchant_rating ? Number(product.merchant_rating).toFixed(1) : '5.0'} ★
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleChat}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center"
              >
                <ChatBubbleLeftRightIcon size={20} color="#D30309" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Action Footer */}
      <View 
        className="bg-white border-t border-gray-100 px-5 pt-3 shadow-lg shadow-black/5"
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
            },
            android: {
              elevation: 8,
            },
          }),
        }}
      >
        <View className="flex-row gap-3">
          <TouchableOpacity 
            onPress={handleChat}
            activeOpacity={0.85}
            className="w-14 h-12 bg-gray-100 rounded-[20px] items-center justify-center border border-gray-200"
          >
            <ChatBubbleLeftRightIcon size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleCall}
            activeOpacity={0.85}
            className="flex-1 bg-gray-900 rounded-[22px] py-3.5 items-center justify-center shadow-md shadow-gray-400"
          >
            <View className="flex-row items-center">
              <PhoneIcon size={18} color="white" />
              <Text className="text-white font-NunitoExtraBold text-[15px] ml-2">
                Call / Contact Seller
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={isFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullScreen(false)}
        statusBarTranslucent={true}
      >
        <View className="flex-1 bg-black/95 justify-between">
          <StatusBar style="light" />

          {/* Top Bar with guaranteed safe padding clearing notch & status bar */}
          <View 
            style={{
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 25) + 12,
              paddingHorizontal: 20,
              paddingBottom: 10,
            }}
            className="flex-row justify-between items-center z-50"
          >
            <View className="bg-white/15 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              <Text className="text-white font-NunitoBold text-sm">
                {selectedImageIndex + 1} / {productImages.length}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsFullScreen(false)}
              hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
              activeOpacity={0.7}
              className="w-11 h-11 bg-white/20 rounded-full items-center justify-center border border-white/20 backdrop-blur-md"
            >
              <ArrowsPointingInIcon size={22} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsFullScreen(false)}
            className="flex-1 justify-center items-center px-2"
          >
            {productImages.length > 0 && (
              <Image
                source={{ uri: productImages[selectedImageIndex] }}
                className="w-full h-[70%]"
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>

          <View 
            style={{
              paddingBottom: Math.max(insets.bottom, 20) + 10,
              paddingHorizontal: 24,
            }}
          >
            {productImages.length > 1 && (
              <View className="flex-row justify-between items-center">
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                  className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
                  disabled={selectedImageIndex === 0}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <ChevronLeftIcon size={24} color={selectedImageIndex === 0 ? "rgba(255,255,255,0.3)" : "white"} />
                </TouchableOpacity>

                <View className="flex-row space-x-2">
                  {productImages.map((_: any, index: number) => (
                    <View
                      key={index}
                      className={`h-2 rounded-full ${index === selectedImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.min(productImages.length - 1, selectedImageIndex + 1))}
                  className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
                  disabled={selectedImageIndex === productImages.length - 1}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <ChevronRightIcon size={24} color={selectedImageIndex === productImages.length - 1 ? "rgba(255,255,255,0.3)" : "white"} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Contact Selection Modal */}
      <ContactSelectionModal
        visible={isContactModalVisible}
        onClose={() => setIsContactModalVisible(false)}
        onVoiceCall={performVoiceCall}
        onWhatsAppCall={performWhatsAppCall}
        phoneNumber={merchantProfileData?.data?.merchant_profile?.user?.phone_number ?? product?.contact_info?.phone ?? "N/A"}
        storeName={merchantProfileData?.data?.merchant_profile?.store_name ?? undefined}
      />
    </SafeAreaView>
  );
};

export default ProductDetail;
