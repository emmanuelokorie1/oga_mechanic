import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, FlatList, Animated, Dimensions, Text, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import AdsComponents from "@/components/AdsComponents";
import { routes, mechanicRoutes, sellerRoutes } from "@/constants/routes";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useActiveBiddingProducts } from "@/hooks/useProducts";

const { width: screenWidth } = Dimensions.get("window");

interface BiddingCarouselProps {
  containerPadding?: number;
  onFallbackChange?: (isFallbackShowing: boolean) => void;
  /** 'user' shows "Find a mechanic" fallback (default). 'mechanic' shows "Spare Parts" & "Buy a Car" fallback. 'seller' shows "Upload Spare parts". 'vehicle_rental' shows "Upload Cars". 'kyc_incomplete' shows "Complete Profile" */
  fallbackVariant?: 'user' | 'mechanic' | 'seller' | 'vehicle_rental' | 'kyc_incomplete';
  onSellerAction?: (action: 'uploadSpareParts' | 'uploadCars' | 'kyc') => void;
}

// ── Skeleton Loader matching the Ads Carousel structure ─────────────────────
const BiddingCarouselSkeleton: React.FC<{ containerPadding?: number; fallbackVariant?: string }> = ({
  containerPadding = 0,
  fallbackVariant = 'user',
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0.8],
    }),
  };

  return (
    <View
      className="rounded-2xl mt-4"
      style={{
        marginHorizontal: -containerPadding,
      }}
    >
      {/* Card Skeleton */}
      <View style={{ width: screenWidth, alignItems: 'center' }}>
        <View
          style={{
            width: screenWidth - 18,
            height: 170,
            backgroundColor: '#1E293B',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#334155',
            padding: 14,
            justifyContent: 'space-between',
            overflow: 'hidden',
          }}
        >
          {/* Top badges placeholder */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Animated.View
              style={[
                shimmerStyle,
                { width: 52, height: 22, borderRadius: 8, backgroundColor: '#334155' },
              ]}
            />
            <Animated.View
              style={[
                shimmerStyle,
                { width: 72, height: 22, borderRadius: 8, backgroundColor: '#334155' },
              ]}
            />
          </View>

          {/* Bottom info placeholder */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingBottom: 8,
            }}
          >
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Animated.View
                style={[
                  shimmerStyle,
                  { width: 80, height: 10, borderRadius: 4, backgroundColor: '#475569', marginBottom: 6 },
                ]}
              />
              <Animated.View
                style={[
                  shimmerStyle,
                  { width: '75%', height: 18, borderRadius: 6, backgroundColor: '#475569' },
                ]}
              />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Animated.View
                style={[
                  shimmerStyle,
                  { width: 60, height: 10, borderRadius: 4, backgroundColor: '#475569', marginBottom: 6 },
                ]}
              />
              <Animated.View
                style={[
                  shimmerStyle,
                  { width: 80, height: 18, borderRadius: 6, backgroundColor: '#475569' },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Dots indicator skeleton */}
      <View
        style={{
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <Animated.View
          style={[
            shimmerStyle,
            { width: 16, height: 6, borderRadius: 3, backgroundColor: '#E11D48', marginHorizontal: 3 },
          ]}
        />
        <Animated.View
          style={[
            shimmerStyle,
            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1', marginHorizontal: 3 },
          ]}
        />
        <Animated.View
          style={[
            shimmerStyle,
            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1', marginHorizontal: 3 },
          ]}
        />
      </View>

      {/* Mechanic shortcut pills skeleton */}
      {fallbackVariant === 'mechanic' && (
        <View
          className="flex-row gap-2 mt-3"
          style={{ paddingHorizontal: containerPadding }}
        >
          <View className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]">
            <Animated.View
              style={[shimmerStyle, { width: '65%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }]}
            />
            <View className="w-8 h-8 rounded-xl bg-gray-100" />
          </View>
          <View className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]">
            <Animated.View
              style={[shimmerStyle, { width: '55%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }]}
            />
            <View className="w-8 h-8 rounded-xl bg-gray-100" />
          </View>
        </View>
      )}

      {/* Seller shortcut pills skeleton */}
      {fallbackVariant === 'seller' && (
        <View
          className="flex-row gap-2 mt-3"
          style={{ paddingHorizontal: containerPadding }}
        >
          <View className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]">
            <Animated.View
              style={[shimmerStyle, { width: '65%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }]}
            />
            <View className="w-8 h-8 rounded-xl bg-gray-100" />
          </View>
          <View className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]">
            <Animated.View
              style={[shimmerStyle, { width: '55%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }]}
            />
            <View className="w-8 h-8 rounded-xl bg-gray-100" />
          </View>
        </View>
      )}

      {/* Vehicle Rental shortcut pill skeleton */}
      {fallbackVariant === 'vehicle_rental' && (
        <View className="mt-3" style={{ paddingHorizontal: containerPadding }}>
          <View className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <Animated.View
              style={[shimmerStyle, { width: 130, height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }]}
            />
            <View className="w-9 h-9 rounded-xl bg-gray-100" />
          </View>
        </View>
      )}

      {/* KYC Incomplete shortcut pill skeleton */}
      {fallbackVariant === 'kyc_incomplete' && (
        <View className="mt-3" style={{ paddingHorizontal: containerPadding }}>
          <View className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <Animated.View
              style={[shimmerStyle, { width: 140, height: 14, backgroundColor: '#FDE68A', borderRadius: 4 }]}
            />
            <View className="w-9 h-9 rounded-xl bg-amber-100" />
          </View>
        </View>
      )}
    </View>
  );
};

const BiddingCarousel: React.FC<BiddingCarouselProps> = ({ containerPadding = 0, onFallbackChange, fallbackVariant = 'user', onSellerAction }) => {
  const { data: activeBiddingRes, isLoading, error } = useActiveBiddingProducts();

  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Prepare display ads - handle both paginated results and direct arrays in .data
  const biddingProducts = Array.isArray(activeBiddingRes?.data) 
    ? activeBiddingRes.data 
    : (activeBiddingRes?.results || (activeBiddingRes?.data as any)?.results || []);
  
  const displayAds = biddingProducts.map((p: any) => ({
    id: p.id,
    title: p.name,
    description: p.description?.slice(0, 60) + (p.description?.length > 60 ? '...' : ''),
    images: p.images?.map((img: any) => ({ uri: img.image })) || [],
    image: p.images?.[0]?.image ? { uri: p.images[0].image } : null,
    price: p.price,
    currency: p.currency,
    year: p.year,
    repairHistoryCount: p.repair_history?.length || 0,
    isBidding: true
  })).filter((ad: any) => ad.images.length > 0 || ad.image !== null);

  const isFallbackShowing = !isLoading && (displayAds.length === 0 || !!error);

  useEffect(() => {
    if (onFallbackChange) {
      onFallbackChange(isFallbackShowing);
    }
  }, [isFallbackShowing, onFallbackChange]);

  // Auto-scroll effect
  useEffect(() => {
    if (displayAds.length <= 1) return; // No need to scroll if only 1 item
    
    // We do not use infinite loop data here directly for simplicity, just index looping
    const interval = setInterval(() => {
      setActiveAdIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % displayAds.length;
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({
              index: nextIndex,
              animated: true,
            });
          } catch (e) {
            // Failsafe if list isn't measuring right yet
          }
        }
        return nextIndex;
      });
    }, 8000); 

    return () => clearInterval(interval);
  }, [displayAds.length]);

  const handleAdMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    const actualIndex = index % displayAds.length;
    setActiveAdIndex(actualIndex);
  };

  const renderAdItem = useCallback(({ item }: { item: any }) => (
    <View style={{ width: screenWidth, alignItems: 'center' }}>
      <View style={{ width: screenWidth - 18 }}>
          <AdsComponents
          images={item.images}
          image={item.image}
          title={item.title}
          description={item.description}
          price={item.price}
          currency={item.currency}
          year={item.year}
          repairHistoryCount={item.repairHistoryCount}
          isBidding={item.isBidding}
          onPress={() => {
            if (item.isBidding) {
              router.push({
                pathname: routes.biddingDetail as any,
                params: { productId: item.id }
              });
            }
          }}
        />
      </View>
    </View>
  ), []);

  // During initial fetch, display an ads skeleton so the design doesn't flash or jump
  if (isLoading) {
    return (
      <BiddingCarouselSkeleton
        containerPadding={containerPadding}
        fallbackVariant={fallbackVariant}
      />
    );
  }

  // If there are absolutely no bids to show, render a persistent promotional banner instead of an empty state.
  // This ensures the layout stays stable and provides value to the user.
  if (isFallbackShowing) {
    // ── Mechanic variant: Spare Parts + Buy a Car ─────────────────────────────
    if (fallbackVariant === 'mechanic') {
      const cardWidth = (screenWidth - 40 - 8) / 2;
      return (
        <View className="flex-row gap-2 mb-1 mt-1">

          {/* Buy Spare Parts */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push({
              pathname: mechanicRoutes.shop as any,
              params: { categoryId: '24', category: 'Spare Part' },
            })}
            className="h-[140px] rounded-[18px] p-3.5 overflow-hidden justify-between bg-[#1E293B]"
            style={{ width: cardWidth }}
          >
            <MaterialCommunityIcons
              name="car-cog"
              size={90}
              color="rgba(255,255,255,0.07)"
              style={{ position: 'absolute', right: -12, bottom: -10 }}
            />
            <View className="w-[34px] h-[34px] rounded-[10px] items-center justify-center bg-white/10">
              <MaterialCommunityIcons name="car-cog" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[13px] text-white font-NunitoExtraBold leading-[17px] tracking-tight">
                {'Buy Spare Parts'}
              </Text>
              <View className="mt-[7px] bg-primary-500 rounded-full py-1 px-[9px] flex-row items-center self-start gap-1">
                <Text className="text-white text-[11px] font-NunitoBold">Browse</Text>
                <MaterialCommunityIcons name="arrow-right" size={11} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Buy a Car */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push({
              pathname: mechanicRoutes.shop as any,
              params: { categoryId: '23', category: 'Car' },
            })}
            className="h-[140px] rounded-[18px] p-3.5 overflow-hidden justify-between bg-primary-500"
            style={{ width: cardWidth }}
          >
            <MaterialCommunityIcons
              name="car"
              size={90}
              color="rgba(255,255,255,0.12)"
              style={{ position: 'absolute', right: -12, bottom: -10 }}
            />
            <View className="w-[34px] h-[34px] rounded-[10px] items-center justify-center bg-white/20">
              <MaterialCommunityIcons name="car" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[13px] text-white font-NunitoExtraBold leading-[17px] tracking-tight">
                {'Buy a Car'}
              </Text>
              <View className="mt-[7px] bg-white rounded-full py-1 px-[9px] flex-row items-center self-start gap-1">
                <Text className="text-primary-500 text-[11px] font-NunitoBold">Explore</Text>
                <MaterialCommunityIcons name="arrow-right" size={11} color="#D30309" />
              </View>
            </View>
          </TouchableOpacity>

        </View>
      );
    }

    // ── Seller variant: Upload Spare Parts & Upload Cars ─────────────────────────────
    if (fallbackVariant === 'seller') {
      const cardWidth = (screenWidth - 40 - 8) / 2;
      return (
        <View className="flex-row gap-2 mb-1 mt-1">
          {/* Upload Spare Parts */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onSellerAction ? onSellerAction('uploadSpareParts') : router.push(sellerRoutes.uploadSpareParts as any)}
            className="h-[140px] rounded-[18px] p-3.5 overflow-hidden justify-between bg-[#1E293B]"
            style={{ width: cardWidth }}
          >
            <MaterialCommunityIcons
              name="car-cog"
              size={90}
              color="rgba(255,255,255,0.07)"
              style={{ position: 'absolute', right: -12, bottom: -10 }}
            />
            <View className="w-[34px] h-[34px] rounded-[10px] items-center justify-center bg-white/10">
              <MaterialCommunityIcons name="cloud-upload" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[13px] text-white font-NunitoExtraBold leading-[17px] tracking-tight">
                {'Upload Spare Parts'}
              </Text>
              <View className="mt-[7px] bg-primary-500 rounded-full py-1 px-[9px] flex-row items-center self-start gap-1">
                <Text className="text-white text-[11px] font-NunitoBold">Add New</Text>
                <MaterialCommunityIcons name="arrow-right" size={11} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Upload Cars */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadCarToRent as any)}
            className="h-[140px] rounded-[18px] p-3.5 overflow-hidden justify-between bg-primary-500"
            style={{ width: cardWidth }}
          >
            <MaterialCommunityIcons
              name="car"
              size={90}
              color="rgba(255,255,255,0.12)"
              style={{ position: 'absolute', right: -12, bottom: -10 }}
            />
            <View className="w-[34px] h-[34px] rounded-[10px] items-center justify-center bg-white/20">
              <MaterialCommunityIcons name="cloud-upload" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[13px] text-white font-NunitoExtraBold leading-[17px] tracking-tight">
                {'Upload Cars for Rent'}
              </Text>
              <View className="mt-[7px] bg-white rounded-full py-1 px-[9px] flex-row items-center self-start gap-1">
                <Text className="text-primary-500 text-[11px] font-NunitoBold">Add New</Text>
                <MaterialCommunityIcons name="arrow-right" size={11} color="#D30309" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Vehicle Rental variant: Upload Cars ─────────────────────────────
    if (fallbackVariant === 'vehicle_rental') {
      return (
        <View className="mb-1 mt-1">
          {/* Upload Cars */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadCarToRent as any)}
            className="h-[140px] rounded-[18px] p-4 overflow-hidden justify-between bg-primary-500 w-full"
          >
            <MaterialCommunityIcons
              name="car"
              size={110}
              color="rgba(255,255,255,0.12)"
              style={{ position: 'absolute', right: -15, bottom: -15 }}
            />
            <View className="w-[38px] h-[38px] rounded-[12px] items-center justify-center bg-white/20">
              <MaterialCommunityIcons name="cloud-upload" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[15px] text-white font-NunitoExtraBold leading-[20px] tracking-tight">
                {'Upload Cars for Rent'}
              </Text>
              <View className="mt-[8px] bg-white rounded-full py-1.5 px-[12px] flex-row items-center self-start gap-1">
                <Text className="text-primary-500 text-[12px] font-NunitoBold">Add New</Text>
                <MaterialCommunityIcons name="arrow-right" size={12} color="#D30309" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── KYC Incomplete variant: Complete Profile ─────────────────────────────
    if (fallbackVariant === 'kyc_incomplete') {
      return (
        <View className="mb-1 mt-1">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onSellerAction && onSellerAction('kyc')}
            className="h-[140px] rounded-[18px] p-4 overflow-hidden justify-between bg-amber-500 w-full"
          >
            <MaterialCommunityIcons
              name="shield-alert"
              size={110}
              color="rgba(255,255,255,0.12)"
              style={{ position: 'absolute', right: -15, bottom: -15 }}
            />
            <View className="w-[38px] h-[38px] rounded-[12px] items-center justify-center bg-white/20">
              <MaterialCommunityIcons name="shield-account" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[15px] text-white font-NunitoExtraBold leading-[20px] tracking-tight">
                {'Complete Your Profile\nto Start Earning'}
              </Text>
              <View className="mt-[8px] bg-white rounded-full py-1.5 px-[12px] flex-row items-center self-start gap-1">
                <Text className="text-amber-600 text-[12px] font-NunitoBold">Verify Now</Text>
                <MaterialCommunityIcons name="arrow-right" size={12} color="#D97706" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Default (user) variant: Find a mechanic ───────────────────────────────
    return (
      <View style={{ width: screenWidth, alignItems: 'center', marginVertical: 4 }}>
        <TouchableOpacity 
          activeOpacity={0.9}
          style={{
            width: screenWidth - 18,
            height: 155, 
            backgroundColor: '#D30309', 
            borderRadius: 20,
            padding: 20,
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          {/* Left Side Content */}
          <View style={{ flex: 1, justifyContent: 'center', zIndex: 10 }}>
            <Text style={{ fontSize: 24, color: '#FFFFFF', marginBottom: 20, letterSpacing: -0.3 }} className="font-NunitoExtraBold">
              Find a mechanic
            </Text>
            
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 30,
              paddingVertical: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start'
            }}>
              <Text style={{ color: '#D30309', fontSize: 13, marginRight: 8, marginLeft: 4 }} className="font-NunitoExtraBold">
                Book Service
              </Text>
              <View style={{
                backgroundColor: '#D30309',
                borderRadius: 14,
                width: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>
          
          {/* Right Side Icon */}
          <View style={{ position: 'absolute', right: -15, bottom: -15, zIndex: 1 }}>
            <MaterialCommunityIcons name="car-wrench" size={140} color="rgba(255,255,255,0.15)" />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const renderAdDotIndicator = () => {
    if (displayAds.length <= 1) return null;
    return (
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 6,
        }}
      >
        {displayAds.map((_: any, index: number) => {
          return (
            <Animated.View
              key={index.toString()}
              style={{
                width: activeAdIndex === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: activeAdIndex === index ? "#E11D48" : "#E2E8F0",
                marginHorizontal: 3,
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <Animated.View 
      className="rounded-2xl mt-4" 
      style={{
        marginHorizontal: -containerPadding,
      }}
    >
      <View>
        <FlatList
          ref={flatListRef}
          data={displayAds}
          renderItem={renderAdItem}
          keyExtractor={(item, index) => item.id.toString() + index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={handleAdMomentumScrollEnd}
          decelerationRate="fast"
          snapToInterval={screenWidth}
          snapToAlignment="center"
        />
        {renderAdDotIndicator()}

        {/* Mechanic shortcut pills — shown below the carousel when ads exist */}
        {fallbackVariant === 'mechanic' && (
          <View
            className="flex-row gap-2 mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            {/* Buy Spare Parts pill */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: mechanicRoutes.shop as any,
                params: { categoryId: '24', category: 'Spare Part' },
              })}
              className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]"
            >
              <Text numberOfLines={2} className="flex-1 text-[12px] font-NunitoBold text-gray-800 mr-2 leading-[16px]">
                Buy Spare Parts
              </Text>
              <View className="w-8 h-8 rounded-xl bg-[#1E293B] items-center justify-center shrink-0">
                <MaterialCommunityIcons name="car-cog" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Buy a Car pill */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: mechanicRoutes.shop as any,
                params: { categoryId: '23', category: 'Car' },
              })}
              className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]"
            >
              <Text numberOfLines={2} className="flex-1 text-[12px] font-NunitoBold text-gray-800 mr-2 leading-[16px]">
                Buy a Car
              </Text>
              <View className="w-8 h-8 rounded-xl bg-primary-200 items-center justify-center shrink-0">
                <MaterialCommunityIcons name="car" size={16} color="#D30309" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Seller shortcut pill */}
        {fallbackVariant === 'seller' && (
          <View
            className="flex-row gap-2 mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            {/* Upload Spare Parts pill */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction ? onSellerAction('uploadSpareParts') : router.push(sellerRoutes.uploadSpareParts as any)}
              className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]"
            >
              <Text numberOfLines={2} className="flex-1 text-[12px] font-NunitoBold text-gray-800 mr-2 leading-[16px]">
                Upload Spare Parts
              </Text>
              <View className="w-8 h-8 rounded-xl bg-[#1E293B] items-center justify-center shrink-0">
                <MaterialCommunityIcons name="cloud-upload" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Upload Cars pill */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadCarToRent as any)}
              className="flex-1 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5 min-h-[52px]"
            >
              <Text numberOfLines={2} className="flex-1 text-[12px] font-NunitoBold text-gray-800 mr-2 leading-[16px]">
                Upload Cars
              </Text>
              <View className="w-8 h-8 rounded-xl bg-primary-200 items-center justify-center shrink-0">
                <MaterialCommunityIcons name="car" size={16} color="#D30309" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Vehicle Rental shortcut pill */}
        {fallbackVariant === 'vehicle_rental' && (
          <View
            className="mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadCarToRent as any)}
              className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3"
            >
              <Text className="text-[14px] font-NunitoBold text-gray-800">Upload Cars for Rent</Text>
              <View className="w-9 h-9 rounded-xl bg-primary-200 items-center justify-center">
                <MaterialCommunityIcons name="cloud-upload" size={18} color="#D30309" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* KYC Incomplete shortcut pill */}
        {fallbackVariant === 'kyc_incomplete' && (
          <View
            className="mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction && onSellerAction('kyc')}
              className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
            >
              <Text className="text-[14px] font-NunitoBold text-amber-800">Complete Profile to Sell</Text>
              <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
                <MaterialCommunityIcons name="shield-account" size={18} color="#D97706" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default React.memo(BiddingCarousel);
