import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { View, FlatList, Animated, Dimensions, Text, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import AdsComponents from "@/components/AdsComponents";
import OngoingRepairCarouselCard from "@/components/cards/OngoingRepairCarouselCard";
import { routes, mechanicRoutes, sellerRoutes } from "@/constants/routes";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useActiveBiddingProducts } from "@/hooks/useProducts";
import { useUserRepairRequests } from "@/hooks/useRepairRequests";

const { width: screenWidth } = Dimensions.get("window");

interface BiddingCarouselProps {
  containerPadding?: number;
  onFallbackChange?: (isFallbackShowing: boolean) => void;
  /** 'user' shows "Find a mechanic" fallback (default). 'mechanic' shows "Spare Parts" & "Buy a Car" fallback. 'seller' shows "Upload Spare parts". 'vehicle_rental' shows "Upload Cars". 'kyc_incomplete' shows "Complete Profile". 'kyc_pending' shows "Verification Pending" */
  fallbackVariant?: 'user' | 'mechanic' | 'seller' | 'vehicle_rental' | 'kyc_incomplete' | 'kyc_pending' | 'rental_kyc_incomplete' | 'rental_kyc_pending';
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

      {/* KYC Incomplete or Pending shortcut pill skeleton */}
      {(fallbackVariant === 'kyc_incomplete' || fallbackVariant === 'kyc_pending' || fallbackVariant === 'rental_kyc_incomplete' || fallbackVariant === 'rental_kyc_pending') && (
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
  const { data: activeBiddingRes, isLoading: isBiddingLoading } = useActiveBiddingProducts();
  const isUserVariant = fallbackVariant === 'user';
  const { data: userRepairRequestsRes, isLoading: isRepairLoading } = useUserRepairRequests(undefined, isUserVariant);

  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Extract active ongoing repair requests if in 'user' mode
  const activeRepairRequests = useMemo(() => {
    if (!isUserVariant || !userRepairRequestsRes) return [];
    const requests = Array.isArray(userRepairRequestsRes?.data)
      ? userRepairRequestsRes.data
      : (userRepairRequestsRes?.data?.results || userRepairRequestsRes?.results || []);
    if (!Array.isArray(requests) || requests.length === 0) return [];

    const activeStatuses = ['pending', 'accepted', 'in_transit', 'arrived', 'in_progress', 'completed'];

    return requests.filter((r: any) => {
      const status = (r.status || '').toLowerCase();
      if (!activeStatuses.includes(status)) return false;
      // If completed, only include if customer has not yet verified
      if (
        status === 'completed' &&
        (r.verify_completed_at || r.is_verified || r.status === 'verified' || r.status === 'verify_completed')
      ) {
        return false;
      }
      return true;
    });
  }, [isUserVariant, userRepairRequestsRes]);

  const ongoingOrderAds = useMemo(() => {
    if (activeRepairRequests.length === 0) return [];
    // Consolidate all ongoing repairs into a single hero card
    return [{
      id: 'ongoing-repairs-consolidated',
      isOngoingOrder: true,
      orders: activeRepairRequests,
      order: activeRepairRequests[0],
    }];
  }, [activeRepairRequests]);

  const hasOngoingOrder = ongoingOrderAds.length > 0;

  // Prepare display ads - handle both paginated results and direct arrays in .data
  const biddingProducts = Array.isArray(activeBiddingRes?.data) 
    ? activeBiddingRes.data 
    : (activeBiddingRes?.results || (activeBiddingRes?.data as any)?.results || []);
  
  const displayAds = useMemo(() => {
    const biddingAds = biddingProducts.map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description?.slice(0, 60) + (p.description?.length > 60 ? '...' : ''),
      images: p.images?.map((img: any) => ({ uri: img.image })) || [],
      image: p.images?.[0]?.image ? { uri: p.images[0].image } : null,
      price: p.price,
      currency: p.currency,
      year: p.year,
      repairHistoryCount: p.repair_history?.length || 0,
      isBidding: true,
      isOngoingOrder: false,
    })).filter((ad: any) => ad.images.length > 0 || ad.image !== null);

    return [...ongoingOrderAds, ...biddingAds];
  }, [biddingProducts, ongoingOrderAds]);

  const hasAds = displayAds.length > 0;
  // If ads are present (from cache or previous query), never flash skeleton or fallback during background refetches
  const isInitialLoading = !hasAds && (isBiddingLoading || (isUserVariant && isRepairLoading && !userRepairRequestsRes));
  const isFallbackShowing = !isInitialLoading && !hasAds;

  useEffect(() => {
    if (onFallbackChange) {
      onFallbackChange(isFallbackShowing);
    }
  }, [isFallbackShowing, onFallbackChange]);

  // Auto-scroll effect: pause auto-scroll if an ongoing order is pinned so user can monitor it undisturbed
  useEffect(() => {
    if (displayAds.length <= 1 || hasOngoingOrder) return;
    
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
  }, [displayAds.length, hasOngoingOrder]);

  const handleAdMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    const actualIndex = index % displayAds.length;
    setActiveAdIndex(actualIndex);
  };

  const renderAdItem = useCallback(({ item }: { item: any }) => {
    if (item.isOngoingOrder) {
      return (
        <View style={{ width: screenWidth, alignItems: 'center' }}>
          <View style={{ width: screenWidth - 18 }}>
            <OngoingRepairCarouselCard orders={item.orders} order={item.order} />
          </View>
        </View>
      );
    }

    return (
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
    );
  }, []);

  // During initial fetch, display an ads skeleton so the design doesn't flash or jump
  if (isInitialLoading) {
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
            onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadProducts as any)}
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
                {'Upload Cars'}
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

    // ── Rental KYC Incomplete variant: Activate Your Rental Fleet ────────────
    if (fallbackVariant === 'rental_kyc_incomplete') {
      return (
        <View className="mb-1 mt-1">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onSellerAction && onSellerAction('kyc')}
            className="h-[152px] rounded-[20px] p-4 overflow-hidden justify-between w-full"
            style={{
              backgroundColor: '#F59E0B',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: '#D97706',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Ambient luxury glow in top right */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              }}
            />

            {/* Background luxury sports car silhouette */}
            <MaterialCommunityIcons
              name="car-sports"
              size={135}
              color="rgba(255, 255, 255, 0.15)"
              style={{ position: 'absolute', right: -15, bottom: -18 }}
            />

            {/* Top row: Badge + Status tag */}
            <View className="flex-row items-center justify-between z-10">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  gap: 5,
                }}
              >
                <MaterialCommunityIcons name="car-key" size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 }} className="font-NunitoExtraBold">
                  VEHICLE RENTALS
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.18)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                <Text style={{ fontSize: 10, color: '#FFFFFF' }} className="font-NunitoBold">
                  Action Required
                </Text>
              </View>
            </View>

            {/* Middle: Title & Subtitle */}
            <View className="z-10">
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 }}
                className="font-NunitoExtraBold"
              >
                Activate Your Rental Fleet
              </Text>
              <Text
                style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.92)', marginTop: 2, lineHeight: 16 }}
                className="font-NunitoMedium"
              >
                Complete profile verification to list vehicles and start earning.
              </Text>
            </View>

            {/* Bottom: Pill CTA Button */}
            <View className="z-10 flex-row items-center justify-start">
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 30,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ color: '#D97706', fontSize: 12 }} className="font-NunitoExtraBold">
                  Verify Profile
                </Text>
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderRadius: 9,
                    width: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="arrow-right" size={11} color="#D97706" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Rental KYC Pending variant: Verification Under Review ─────────────────
    if (fallbackVariant === 'rental_kyc_pending') {
      return (
        <View className="mb-1 mt-1">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onSellerAction && onSellerAction('kyc')}
            className="h-[152px] rounded-[20px] p-4 overflow-hidden justify-between w-full"
            style={{
              backgroundColor: '#D97706',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: '#B45309',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Ambient luxury glow in top right */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              }}
            />

            <MaterialCommunityIcons
              name="car-clock"
              size={135}
              color="rgba(255, 255, 255, 0.15)"
              style={{ position: 'absolute', right: -15, bottom: -18 }}
            />

            {/* Top row */}
            <View className="flex-row items-center justify-between z-10">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  gap: 5,
                }}
              >
                <MaterialCommunityIcons name="shield-sync" size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 }} className="font-NunitoExtraBold">
                  FLEET VERIFICATION
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.20)',
                  borderColor: 'rgba(255, 255, 255, 0.30)',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FEF08A' }} />
                <Text style={{ fontSize: 10, color: '#FFFFFF' }} className="font-NunitoBold">
                  Under Review
                </Text>
              </View>
            </View>

            {/* Middle */}
            <View className="z-10">
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 }}
                className="font-NunitoExtraBold"
              >
                Verification in Progress
              </Text>
              <Text
                style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.92)', marginTop: 2, lineHeight: 16 }}
                className="font-NunitoMedium"
              >
                Your rental fleet profile is being verified. Usually approved in 24 hours.
              </Text>
            </View>

            {/* Bottom */}
            <View className="z-10 flex-row items-center justify-start">
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 30,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ color: '#B45309', fontSize: 12 }} className="font-NunitoExtraBold">
                  Check Status
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={14} color="#B45309" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Vehicle Rental variant: List Cars for Rent ────────────────────────────
    if (fallbackVariant === 'vehicle_rental') {
      return (
        <View className="mb-1 mt-1">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadCarToRent as any)}
            className="h-[152px] rounded-[20px] p-4 overflow-hidden justify-between w-full"
            style={{
              backgroundColor: '#0F172A',
              borderWidth: 1,
              borderColor: 'rgba(211, 3, 9, 0.35)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Ambient luxury crimson glow in top right */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: 'rgba(211, 3, 9, 0.16)',
              }}
            />

            <MaterialCommunityIcons
              name="car-sports"
              size={135}
              color="rgba(255, 255, 255, 0.08)"
              style={{ position: 'absolute', right: -15, bottom: -18 }}
            />

            {/* Top row */}
            <View className="flex-row items-center justify-between z-10">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(211, 3, 9, 0.16)',
                  borderColor: 'rgba(211, 3, 9, 0.35)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  gap: 5,
                }}
              >
                <MaterialCommunityIcons name="car-key" size={15} color="#FF6B6B" />
                <Text style={{ fontSize: 11, color: '#FFB4B4', letterSpacing: 0.3 }} className="font-NunitoExtraBold">
                  FLEET MANAGEMENT
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  borderColor: 'rgba(34, 197, 94, 0.35)',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
                <Text style={{ fontSize: 10, color: '#86EFAC' }} className="font-NunitoBold">
                  Active Host
                </Text>
              </View>
            </View>

            {/* Middle */}
            <View className="z-10">
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 }}
                className="font-NunitoExtraBold"
              >
                List Cars for Rent
              </Text>
              <Text
                style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 16 }}
                className="font-NunitoMedium"
              >
                Add new vehicles to your fleet and earn daily booking revenue.
              </Text>
            </View>

            {/* Bottom */}
            <View className="z-10 flex-row items-center justify-start">
              <View
                style={{
                  backgroundColor: '#D30309',
                  borderRadius: 30,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12 }} className="font-NunitoExtraBold">
                  Upload Vehicle
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    borderRadius: 9,
                    width: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="arrow-right" size={11} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── KYC Incomplete variant: Complete Store Profile ────────────────────────
    if (fallbackVariant === 'kyc_incomplete') {
      return (
        <View className="mb-1 mt-1">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onSellerAction && onSellerAction('kyc')}
            className="h-[152px] rounded-[20px] p-4 overflow-hidden justify-between w-full"
            style={{
              backgroundColor: '#F59E0B',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: '#D97706',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Ambient luxury glow */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              }}
            />

            <MaterialCommunityIcons
              name="shield-account"
              size={135}
              color="rgba(255, 255, 255, 0.15)"
              style={{ position: 'absolute', right: -15, bottom: -18 }}
            />

            {/* Top row */}
            <View className="flex-row items-center justify-between z-10">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  gap: 5,
                }}
              >
                <MaterialCommunityIcons name="storefront-outline" size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 }} className="font-NunitoExtraBold">
                  MERCHANT SETUP
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.18)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                <Text style={{ fontSize: 10, color: '#FFFFFF' }} className="font-NunitoBold">
                  Action Required
                </Text>
              </View>
            </View>

            {/* Middle */}
            <View className="z-10">
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 }}
                className="font-NunitoExtraBold"
              >
                Complete Store Profile
              </Text>
              <Text
                style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.92)', marginTop: 2, lineHeight: 16 }}
                className="font-NunitoMedium"
              >
                Verify your business identity to start listing parts & cars for sale.
              </Text>
            </View>

            {/* Bottom */}
            <View className="z-10 flex-row items-center justify-start">
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 30,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ color: '#D97706', fontSize: 12 }} className="font-NunitoExtraBold">
                  Verify Store
                </Text>
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    borderRadius: 9,
                    width: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="arrow-right" size={11} color="#D97706" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // ── KYC Pending variant: Verification Under Review ────────────────────────
    if (fallbackVariant === 'kyc_pending') {
      return (
        <View className="mb-1 mt-1">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onSellerAction && onSellerAction('kyc')}
            className="h-[152px] rounded-[20px] p-4 overflow-hidden justify-between w-full"
            style={{
              backgroundColor: '#D97706',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: '#B45309',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            {/* Ambient luxury glow */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              }}
            />

            <MaterialCommunityIcons
              name="clock-time-four"
              size={135}
              color="rgba(255, 255, 255, 0.15)"
              style={{ position: 'absolute', right: -15, bottom: -18 }}
            />

            {/* Top row */}
            <View className="flex-row items-center justify-between z-10">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  gap: 5,
                }}
              >
                <MaterialCommunityIcons name="storefront-outline" size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 }} className="font-NunitoExtraBold">
                  STORE VERIFICATION
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.20)',
                  borderColor: 'rgba(255, 255, 255, 0.30)',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FEF08A' }} />
                <Text style={{ fontSize: 10, color: '#FFFFFF' }} className="font-NunitoBold">
                  Under Review
                </Text>
              </View>
            </View>

            {/* Middle */}
            <View className="z-10">
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 }}
                className="font-NunitoExtraBold"
              >
                Verification Pending
              </Text>
              <Text
                style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.92)', marginTop: 2, lineHeight: 16 }}
                className="font-NunitoMedium"
              >
                Merchant documentation is being reviewed. Approval takes under 24 hours.
              </Text>
            </View>

            {/* Bottom */}
            <View className="z-10 flex-row items-center justify-start">
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 30,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ color: '#B45309', fontSize: 12 }} className="font-NunitoExtraBold">
                  Check Status
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={14} color="#B45309" />
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
          onPress={() => router.push(routes.findMechanic)}
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
              onPress={() => onSellerAction ? onSellerAction('uploadCars') : router.push(sellerRoutes.uploadProducts as any)}
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

        {/* Rental KYC Incomplete shortcut pill */}
        {fallbackVariant === 'rental_kyc_incomplete' && (
          <View
            className="mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction && onSellerAction('kyc')}
              className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
            >
              <Text className="text-[14px] font-NunitoBold text-amber-800">Complete Profile to List Rentals</Text>
              <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
                <MaterialCommunityIcons name="car-key" size={18} color="#D97706" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Rental KYC Pending shortcut pill */}
        {fallbackVariant === 'rental_kyc_pending' && (
          <View
            className="mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction && onSellerAction('kyc')}
              className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
            >
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="shield-sync" size={18} color="#D97706" />
                <Text className="text-[14px] font-NunitoBold text-amber-800">Rental Verification in Progress</Text>
              </View>
              <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                <Text className="text-[11px] font-NunitoBold text-amber-700">Under Review</Text>
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

        {/* KYC Pending shortcut pill */}
        {fallbackVariant === 'kyc_pending' && (
          <View
            className="mt-3"
            style={{ paddingHorizontal: containerPadding }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSellerAction && onSellerAction('kyc')}
              className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
            >
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="clock-outline" size={18} color="#D97706" />
                <Text className="text-[14px] font-NunitoBold text-amber-800">Verification in Progress</Text>
              </View>
              <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                <Text className="text-[11px] font-NunitoBold text-amber-700">Under Review</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default React.memo(BiddingCarousel);
