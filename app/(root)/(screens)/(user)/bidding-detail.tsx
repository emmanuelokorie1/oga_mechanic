import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Share,
  Platform,
  Image,
  Modal,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from 'expo-haptics';
import { 
  ArrowLeftIcon,
  ClockIcon,
  TagIcon,
  CalendarDaysIcon,
  CogIcon,
  BeakerIcon,
  UsersIcon,
  PaintBrushIcon,
  CheckBadgeIcon,
  BoltIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ShareIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
} from "react-native-heroicons/outline";
import { StarIcon } from "react-native-heroicons/solid";
import { formatDistanceToNow } from "date-fns";

import { useProductDetail, useSubmitBid, useProductBids } from "@/hooks/useProducts";
import { showToast } from "@/utils/toastUtils";
import { getApiErrorMessage } from "@/utils/errorMessages";
import LoadingSpinner from "@/components/LoadingSpinner";
import BidModal from "@/components/modals/BidModal";

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

const BiddingDetail = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as { id?: string; productId?: string };
  const productId = params?.id || params?.productId;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  // API hooks
  const { data: product, isLoading, error, refetch } = useProductDetail(productId || "");
  const submitBidMutation = useSubmitBid();

  const biddingWindowId = product?.bidding_window?.id ? String(product.bidding_window.id) : "";
  const { data: bidsResponse, refetch: refetchBids } = useProductBids(biddingWindowId);

  const bidsList: any[] = useMemo(() => {
    if (!bidsResponse) return [];
    if (Array.isArray(bidsResponse)) return bidsResponse;
    if (Array.isArray(bidsResponse.data)) return bidsResponse.data;
    if (bidsResponse.data?.results) return bidsResponse.data.results;
    if (bidsResponse.results) return bidsResponse.results;
    return [];
  }, [bidsResponse]);

  const highestBid = useMemo(() => {
    if (bidsList.length === 0) return 0;
    const amounts = bidsList.map((b: any) => parseFloat(b.amount || 0));
    return Math.max(...amounts);
  }, [bidsList]);

  const isAuctionActive = Boolean(
    product?.bidding_window &&
    product.bidding_window.is_active &&
    !product.bidding_window.is_closed
  );

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
        if (biddingWindowId) {
          refetchBids();
        }
      }
    }, [productId, biddingWindowId, refetch, refetchBids])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchBids()]);
    setIsRefreshing(false);
  }, [refetch, refetchBids]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try {
      const priceVal = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      const shareMessage = `Check out this live auction for ${product.name} on Oga Mechanic!\n\nStarting Price: ₦${priceVal.toLocaleString()}\nCurrent Highest Bid: ₦${highestBid > 0 ? highestBid.toLocaleString() : 'None yet'}\n\nBid live on the Oga Mechanic app: https://ogamechanic.org`;
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
  }, [product, highestBid]);

  const productPrice = useMemo(() => {
    if (!product) return 0;
    return typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  }, [product?.price]);

  const handleBidSubmit = useCallback(async (amount: number) => {
    if (!product || !product.bidding_window) {
      showToast.error("Bidding window not available for this product.");
      return;
    }
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await submitBidMutation.mutateAsync({
        productId: product.id,
        biddingWindow: product.bidding_window.id,
        amount,
      });
      setIsBidModalVisible(false);
      showToast.success("Bid placed successfully!");
      refetchBids();
    } catch (e) {
      showToast.error("Failed to place bid. Please try again.");
    }
  }, [product, submitBidMutation, refetchBids]);

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
        <LoadingSpinner message="Loading auction details..." />
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
          <Text className="text-[17px] font-NunitoExtraBold text-gray-900">Auction Details</Text>
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

  const biddingWindow = product.bidding_window;

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
          Auction Details
        </Text>
        <TouchableOpacity 
          onPress={handleShare}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
          activeOpacity={0.75}
        >
          <ShareIcon size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#D30309"]} tintColor="#D30309" />
        }
      >
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

            {/* Category / Live Badge Overlay */}
            <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 shadow-sm pointer-events-none">
              <Text className="text-[10px] font-NunitoExtraBold text-gray-900 uppercase tracking-wider">
                {(product as any).body_type?.replace('_', ' ') || 'Live Auction'}
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
                    Verified Seller Listing
                  </Text>
                </View>
              </View>
            </View>

            {/* Premium Pricing Block */}
            <View className="bg-primary-50 rounded-[24px] p-4 flex-row items-center justify-between border border-primary-100/50">
              <View className="flex-1 mr-2">
                <Text className="text-primary-400 font-NunitoBold text-[10px] uppercase tracking-widest mb-1">
                  Starting / Base Price
                </Text>
                <View className="flex-row items-baseline flex-wrap">
                  <Text className="text-primary-700 font-NunitoExtraBold text-[24px]">
                    ₦{productPrice.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View className={`shrink-0 px-3 py-1.5 rounded-full border ${isAuctionActive ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200'}`}>
                <View className="flex-row items-center">
                  {isAuctionActive && <View className="w-2 h-2 rounded-full bg-red-600 mr-1.5" />}
                  <Text className={`${isAuctionActive ? 'text-red-700' : 'text-gray-600'} font-NunitoExtraBold text-[11px] uppercase tracking-wider`}>
                    {isAuctionActive ? 'Live Auction' : 'Auction Closed'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bidding Information Section */}
          {biddingWindow && (
            <View className="bg-white rounded-[26px] p-5 shadow-xs border border-gray-200 mb-4">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
                <View className="flex-row items-center flex-1 mr-2.5">
                  <View className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center mr-2.5 border border-red-100 shrink-0">
                    <ClockIcon size={20} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                      Bidding Window
                    </Text>
                    <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                      Auction schedule & live overview
                    </Text>
                  </View>
                </View>
                <View className={`shrink-0 px-2.5 py-1 rounded-full border ${isAuctionActive ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200'}`}>
                  <View className="flex-row items-center">
                    {isAuctionActive && <View className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5" />}
                    <Text className={`${isAuctionActive ? 'text-red-700' : 'text-gray-500'} text-[10px] font-NunitoExtraBold uppercase tracking-wider`}>
                      {isAuctionActive ? 'LIVE' : 'CLOSED'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats Timeline Grid */}
              <View className="flex-row gap-2 mb-2">
                <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1">
                    Start Date
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900" numberOfLines={1}>
                    {biddingWindow.start_time
                      ? new Date(biddingWindow.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </Text>
                </View>

                <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1">
                    End Date
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900" numberOfLines={1}>
                    {biddingWindow.end_time
                      ? new Date(biddingWindow.end_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-1">
                    Duration
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900">
                    {biddingWindow.duration_days ? `${biddingWindow.duration_days} Days` : 'N/A'}
                  </Text>
                </View>

                <View className="flex-1 bg-primary-50/60 rounded-2xl p-3 border border-primary-100/60">
                  <Text className="text-[10px] font-NunitoBold text-primary-600 uppercase tracking-wider mb-1">
                    Highest Bid
                  </Text>
                  <Text className="text-[13px] font-NunitoExtraBold text-primary-700">
                    {highestBid > 0 ? `₦${highestBid.toLocaleString()}` : 'No Bids Yet'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Bid History Section */}
          {biddingWindow && (
            <View className="bg-white rounded-[26px] p-5 shadow-xs border border-gray-200 mb-4">
              <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
                <View className="flex-1 mr-2.5">
                  <Text className="text-[16px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                    Bid History
                  </Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
                    {bidsList.length > 0 ? 'Latest offers placed by buyers' : 'Active auction activity'}
                  </Text>
                </View>
                <View className="shrink-0 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                  <Text className="text-primary-700 text-xs font-NunitoBold">
                    {bidsList.length} {bidsList.length === 1 ? 'Bid' : 'Bids'}
                  </Text>
                </View>
              </View>

              {bidsList.length > 0 ? (
                <View className="space-y-2.5">
                  {bidsList.map((bid: any, index: number) => (
                    <View
                      key={bid.id || index}
                      className="flex-row items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3 border border-primary-200">
                          <Text className="text-primary-700 font-NunitoExtraBold text-xs uppercase">
                            {bid.bidder?.first_name?.[0] || 'U'}{bid.bidder?.last_name?.[0] || 'S'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-NunitoBold text-gray-900" numberOfLines={1}>
                            {bid.bidder?.first_name ? `${bid.bidder.first_name} ${bid.bidder.last_name || ''}` : 'Buyer Bid'}
                          </Text>
                          <Text className="text-[10px] text-gray-400 font-NunitoMedium mt-0.5">
                            {bid.created_at ? formatDistanceToNow(new Date(bid.created_at), { addSuffix: true }) : ''}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-sm font-NunitoExtraBold text-gray-900">
                          ₦{parseFloat(bid.amount || '0').toLocaleString()}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <View
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              bid.status === 'accepted'
                                ? 'bg-green-500'
                                : bid.status === 'rejected'
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500'
                            }`}
                          />
                          <Text
                            className={`text-[10px] font-NunitoBold capitalize ${
                              bid.status === 'accepted'
                                ? 'text-green-600'
                                : bid.status === 'rejected'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {bid.status || 'Active'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="py-6 items-center justify-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mb-2">
                    <ClockIcon size={20} color="#9CA3AF" />
                  </View>
                  <Text className="text-sm font-NunitoBold text-gray-700">No Bids Yet</Text>
                  <Text className="text-xs font-NunitoMedium text-gray-400 text-center px-6 mt-1">
                    Be the first buyer to place a bid on this vehicle!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Specifications Grid */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-[17px] font-NunitoExtraBold text-gray-900">
                Specifications
              </Text>
              <CogIcon size={18} color="#9CA3AF" />
            </View>
            <View className="flex-row flex-wrap gap-3">
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
            </View>
          </View>

          {/* Key Features Section */}
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
              Vehicle Narrative
            </Text>
            <View className="bg-white rounded-[24px] p-4 border border-gray-200 shadow-xs">
              <Text className="text-gray-500 font-NunitoMedium leading-6 text-[14px]">
                {product.description || "No narrative provided for this auction vehicle. Contact merchant for detailed operational requirements."}
              </Text>
            </View>
          </View>

          {/* Merchant Card */}
          <View className="mb-4 bg-white rounded-[26px] p-5 shadow-xs border border-gray-200">
            <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
              <View className="flex-1 mr-2">
                <Text className="text-[16px] font-NunitoExtraBold text-gray-900">
                  Seller Information
                </Text>
                <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">
                  Verified auction merchant on Oga Mechanic
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
                    {product.merchant_email?.[0] || 'M'}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                    {product.merchant_email ? product.merchant_email.split('@')[0] : 'Merchant'}
                  </Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">
                    Rating: {product.merchant_rating ? Number(product.merchant_rating).toFixed(1) : '5.0'} ★
                  </Text>
                </View>
              </View>
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
        <TouchableOpacity 
          onPress={() => setIsBidModalVisible(true)}
          disabled={!isAuctionActive}
          activeOpacity={0.85}
          className={`w-full rounded-[22px] py-3.5 items-center justify-center shadow-md ${
            isAuctionActive ? 'bg-primary-600 shadow-primary-200' : 'bg-gray-300'
          }`}
        >
          <View className="flex-row items-center">
            <BoltIcon size={18} color="white" />
            <Text className="text-white font-NunitoExtraBold text-[15px] ml-2">
              {isAuctionActive ? 'Place a Bid' : 'Auction Closed'}
            </Text>
          </View>
        </TouchableOpacity>
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

      {/* Bid Modal */}
      <BidModal
        visible={isBidModalVisible}
        onClose={() => setIsBidModalVisible(false)}
        onSubmit={handleBidSubmit}
        isLoading={submitBidMutation.isPending}
        productName={product.name}
        currentPrice={productPrice}
        highestBid={highestBid}
      />
    </SafeAreaView>
  );
};

export default BiddingDetail;
