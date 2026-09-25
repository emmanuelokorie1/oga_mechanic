import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Share,
  Platform,
} from "react-native";
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ShareIcon, ClockIcon } from 'react-native-heroicons/outline';
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";

import { useProductDetail, useSubmitBid, useProductBids } from "@/hooks/useProducts";
import { showToast } from "@/utils/toastUtils";
import { getApiErrorMessage } from "@/utils/errorMessages";

import {
  ProductImageGallery,
  ProductSellerCard,
  ProductInfoCard,
  ProductDescription,
  ProductSpecifications,
  ProductFeatures,
  ProductRepairHistory,
} from "@/components/product-detail";
import BidModal from "@/components/modals/BidModal";
import BidHistoryList from "@/components/bidding/BidHistoryList";
import BackArrowBtn from "@/components/BackArrowBtn";
import CustomButton from "@/components/CustomButton";

const { width: screenWidth } = Dimensions.get("window");

const BiddingDetail = () => {
  const params = useLocalSearchParams() as { id?: string; productId?: string };
  const productId = params?.id || params?.productId;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);

  // API hooks
  const { data: product, isLoading, error, refetch } = useProductDetail(productId || "");
  const submitBidMutation = useSubmitBid();

  // Fetch bids at parent level to share highest bid with modal
  const { data: bidsResponse, refetch: refetchBids } = useProductBids(product?.bidding_window?.id || "");

  const highestBid = useMemo(() => {
    if (!bidsResponse) return 0;
    let bidsArr = [];
    if (Array.isArray(bidsResponse)) bidsArr = bidsResponse;
    else if (Array.isArray(bidsResponse.data)) bidsArr = bidsResponse.data;
    else if (bidsResponse.data?.results) bidsArr = bidsResponse.data.results;
    else if (bidsResponse.results) bidsArr = bidsResponse.results;

    if (bidsArr.length === 0) return 0;

    const amounts = bidsArr.map((b: any) => parseFloat(b.amount || 0));
    return Math.max(...amounts);
  }, [bidsResponse]);

  useFocusEffect(
    useCallback(() => {
      if (productId) {
        refetch();
        refetchBids();
      }
    }, [productId, refetch, refetchBids])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchBids()]);
    setIsRefreshing(false);
  }, [refetch, refetchBids]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try {
      const shareMessage = `Check out this auction for ${product.name}\n\nView on Oga Mechanic`;
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
      // We don't necessarily have to refetch the product details here,
      // the useSubmitBid hook automatically invalidates the bids query so the history list updates!
    } catch (e) {
      showToast.error("Failed to place bid. Please try again.");
    }
  }, [product?.id, product?.bidding_window, submitBidMutation]);

  // View returns based on state...
  if (!productId) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-center text-lg mb-4">Product ID not found</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-primary-500 px-6 py-3 rounded-lg">
            <Text className="text-white font-NunitoBold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <View className="flex-1 items-center">
            <View className="w-32 h-5 bg-gray-200 rounded-lg" />
          </View>
        </View>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="w-full bg-gray-200" style={{ height: screenWidth * 0.95 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="w-full h-4 bg-gray-200 rounded mb-2" />
              <View className="w-3/4 h-4 bg-gray-200 rounded" />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-[1.3rem] font-NunitoBold text-gray-900">Auction Details</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-lg font-NunitoMedium text-gray-600 text-center">
            {error ? getApiErrorMessage(error, 'products') : 'Product not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100 z-10">
        <BackArrowBtn />
        <View className="flex-1 items-center">
          <Text className="text-base font-NunitoBold text-gray-900">Auction Details</Text>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
        >
          <ShareIcon size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#D30309"]} tintColor="#D30309" />
        }
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <ProductImageGallery images={product.images || []} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ProductSellerCard
            merchantId={product.merchant_id}
            merchantEmail={product.merchant_email}
            merchantRating={product.merchant_rating ?? undefined}
            purchasedCount={product.purchased_count ?? undefined}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <ProductInfoCard
            name={product.name}
            price={productPrice}
            stock={product.stock || 0}
            purchasedCount={product.purchased_count ?? undefined}
          />
          {/* We can visually override some things here if needed to make it look like an auction, 
              but ProductInfoCard covers the basics very well. */}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ProductDescription description={product.description} />
        </Animated.View>

        {/* Specifications */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <ProductSpecifications
            productId={product.id}
            category={product.category?.name}
            condition={(product as any).condition}
            transmission={(product as any).transmission}
            fuelType={(product as any).fuel_type}
            engineSize={(product as any).engine_size}
            mileage={(product as any).mileage}
            mileageUnit={(product as any).mileage_unit}
            exteriorColor={(product as any).exterior_color}
            interiorColor={(product as any).interior_color}
            numberOfDoors={(product as any).number_of_doors}
            numberOfSeats={(product as any).number_of_seats}
            bodyType={(product as any).body_type}
            isRental={product.is_rental}
            warranty={(product as any).warranty}
            createdAt={(product as any).created_at}
          />
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <ProductFeatures
            airConditioning={(product as any).air_conditioning}
            leatherSeats={(product as any).leather_seats}
            navigationSystem={(product as any).navigation_system}
            bluetooth={(product as any).bluetooth}
            parkingSensors={(product as any).parking_sensors}
            cruiseControl={(product as any).cruise_control}
            keylessEntry={(product as any).keyless_entry}
            sunroof={(product as any).sunroof}
            alloyWheels={(product as any).alloy_wheels}
            airbags={(product as any).airbags}
            abs={(product as any).abs}
            tractionControl={(product as any).traction_control}
            laneAssist={(product as any).lane_assist}
            blindSpotMonitor={(product as any).blind_spot_monitor}
          />
        </Animated.View>

        {/* Repair History */}
        {product.repair_history && product.repair_history.length > 0 && (
          <Animated.View entering={FadeInDown.delay(325).duration(400)}>
            <ProductRepairHistory repairHistory={product.repair_history} />
          </Animated.View>
        )}

        {product.bidding_window && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} className="px-4 mt-6">
            <BidHistoryList bids={product.bidding_window} />
          </Animated.View>
        )}

        <View className="h-32" />
      </ScrollView>

      {/* Sticky Action Bar */}
      <View 
        className="bg-white border-t border-gray-100 py-4 px-5 pb-8"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <CustomButton
          title="Place a Bid"
          onPress={() => setIsBidModalVisible(true)}
          className="bg-primary-500 w-full"
        />
      </View>

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
