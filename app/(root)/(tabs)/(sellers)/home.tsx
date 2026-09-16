
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  PlusIcon,
  ChevronRightIcon,
  QueueListIcon,
} from "react-native-heroicons/outline";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import AndroidNavBarSpacer from "@/components/AndroidNavBarSpacer";
import { useMerchantAnalytics } from "@/hooks/useMerchantAnalytics";
import { productsAPI } from "@/lib/api/products";
import {
  usePrimaryUserProfile,
  useMerchantProfile,
  useVehicleRentalProfile,
} from "@/hooks/useUserProfile";
import { useProfileStore } from "@/hooks/useProfileStore";
import ProfileCompletionModal from "@/components/modals/ProfileCompletionModal";
import KYCBanner from "@/components/KYCBanner";
import BiddingCarousel from "@/components/bidding/BiddingCarousel";
import SpecialistIconBtn from "@/components/SpecialistIconBtn";
import { sellerRoutes } from "@/constants/routes";

const CAR_CATEGORY_ID = 23;

// ─────────────────────────────────────────────────────────────────────────────
// HERO CARD  — primary/10 tint background
// ─────────────────────────────────────────────────────────────────────────────
const HeroCard = ({
  isVehicleRental,
  onCta,
}: {
  isVehicleRental: boolean;
  onCta: () => void;
}) => (
  <View
    style={{
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 24,
      borderRadius: 22,
      backgroundColor: "rgba(211, 3, 9, 0.10)",
      borderWidth: 1,
      borderColor: "rgba(211, 3, 9, 0.15)",
      overflow: "hidden",
      minHeight: 158,
    }}
  >
    {/* subtle circle accents */}
    <View
      style={{
        position: "absolute",
        right: -24,
        top: -24,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "rgba(211, 3, 9, 0.05)",
      }}
    />
    <View
      style={{
        position: "absolute",
        left: -40,
        bottom: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "rgba(211, 3, 9, 0.04)",
      }}
    />
    <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 22 }}>
      {/* text + CTA */}
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: "NunitoExtraBold",
            color: "#111827",
            lineHeight: 26,
            marginBottom: 16,
          }}
        >
          {isVehicleRental
            ? "List your car.\nEarn on your schedule."
            : "Manage your store.\nGrow your sales."}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCta}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: "#D30309",
            borderRadius: 50,
            paddingHorizontal: 14,
            paddingVertical: 8,
            gap: 6,
          }}
        >
          <PlusIcon size={13} color="white" strokeWidth={2.5} />
          <Text style={{ fontSize: 12, fontFamily: "NunitoBold", color: "white" }}>
            {isVehicleRental ? "Add Vehicle" : "Add Product"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* illustration */}
      <Image
        source={
          isVehicleRental
            ? require("@/assets/icons/car_rent.png")
            : require("@/assets/icons/sparePart.png")
        }
        style={{ width: 120, height: 100, resizeMode: "contain" }}
      />
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD (Aesthetic matches mechanic home)
// ─────────────────────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number | string;
  sublabel: string;
  accentColor?: string;
}

const MetricCard = ({ label, value, sublabel, accentColor = '#D30309' }: MetricCardProps) => (
  <View className="flex-1 bg-white rounded-xl border border-gray-200 items-center justify-between h-24 py-3.5 px-2 elevation-1">
    <Text className="text-[10px] font-NunitoBold text-slate-500 uppercase tracking-wide text-center">
      {label}
    </Text>
    <Text style={{ fontSize: 24, fontFamily: 'NunitoExtraBold', color: accentColor, lineHeight: 28 }}>
      {value}
    </Text>
    <Text className="text-[11px] font-NunitoMedium text-slate-500 text-center">
      {sublabel}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT LISTING CARD (Aesthetic from user reference, clean)
// ─────────────────────────────────────────────────────────────────────────────
const ProductListingCard = ({
  item,
  isVehicleRental,
  onPress,
}: {
  item: any;
  isVehicleRental: boolean;
  onPress: () => void;
}) => {
  const productImage = item.images && item.images.length > 0 ? item.images[0].image : null;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      {/* Left content */}
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "NunitoExtraBold",
            color: "#0F172A",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "NunitoMedium", color: "#64748B" }}>
            {isVehicleRental
              ? (item.body_type?.replace("_", " ") || "Vehicle")
              : (item.category_name || "Product")}
          </Text>
          {item.rating && (
            <>
              <Text style={{ fontSize: 11, color: "#CBD5E1", marginHorizontal: 6 }}>•</Text>
              <Text style={{ fontSize: 11, fontFamily: "NunitoBold", color: "#EAB308" }}>
                ★ {parseFloat(item.rating).toFixed(1)}
              </Text>
            </>
          )}
        </View>

        <Text style={{ fontSize: 14, fontFamily: "NunitoExtraBold", color: "#D30309" }}>
          ₦{parseFloat(item.price).toLocaleString()}
          {isVehicleRental && (
            <Text style={{ fontSize: 10, fontFamily: "NunitoBold", color: "#94A3B8" }}>/day</Text>
          )}
        </Text>
      </View>

      {/* Right thumbnail */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 14,
          backgroundColor: "#F1F5F9",
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {productImage ? (
          <Image
            source={{ uri: productImage }}
            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          />
        ) : (
          <Image
            source={
              isVehicleRental
                ? require("@/assets/icons/car_rent.png")
                : require("@/assets/icons/sparePart.png")
            }
            style={{ width: 48, height: 48, resizeMode: "contain", opacity: 0.5 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const SellerHome = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const setIsProfileComplete = useProfileStore((s) => s.setIsProfileComplete);
  const isNewSwitch = useProfileStore((s) => s.isNewSwitch);
  const setIsNewSwitch = useProfileStore((s) => s.setIsNewSwitch);
  const isProfileComplete = useProfileStore((s) => s.isProfileComplete);

  const {
    data: primaryProfileData,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = usePrimaryUserProfile();

  const activeRoleRaw =
    primaryProfileData?.active_role ||
    primaryProfileData?.data?.active_role ||
    (primaryProfileData?.data as any)?.current_role;

  const activeRole = typeof activeRoleRaw === "object" ? activeRoleRaw?.name : activeRoleRaw;
  const isVehicleRental = activeRole === "vehicle_rental";
  const isSeller = activeRole === "merchant" || activeRole === "seller";

  const merchantProfileQuery = useMerchantProfile(isSeller);
  const vehicleRentalProfileQuery = useVehicleRentalProfile(isVehicleRental);
  const activeProfileQuery = isVehicleRental
    ? vehicleRentalProfileQuery
    : merchantProfileQuery;

  const profileData = primaryProfileData;
  const merchantId =
    activeRole === "merchant" || activeRole === "vehicle_rental"
      ? (profileData?.data as any)?.user?.id || (profileData?.data as any)?.user_id
      : (profileData?.data as any)?.user_id;

  // Analytics query
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } =
    useMerchantAnalytics(isSeller || isVehicleRental);

  // Latest 3 listed items query
  const { data: latestItems = [], isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["merchant-latest-listed-items", merchantId, isVehicleRental],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await productsAPI.getProducts(
        isVehicleRental ? CAR_CATEGORY_ID : undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        merchantId,
        isVehicleRental ? true : undefined
      );
      const data = response.data;
      const list = Array.isArray(data) ? data : (data?.results || []);
      return list.slice(0, 3);
    },
    enabled: !!merchantId,
  });

  const hasShownModalRef = React.useRef(false);
  const timerIdRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (activeProfileQuery.data && !activeProfileQuery.isLoading) {
      const isComplete = activeProfileQuery.data?.data?.kyc?.is_complete ?? false;
      setIsProfileComplete(isComplete);
      if (isNewSwitch && !isComplete && !hasShownModalRef.current) {
        if (!timerIdRef.current) {
          timerIdRef.current = setTimeout(() => {
            setShowProfileModal(true);
            hasShownModalRef.current = true;
            setIsNewSwitch(false);
            timerIdRef.current = null;
          }, 3000);
        }
      } else if (!isNewSwitch && timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    }
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [activeProfileQuery.data, activeProfileQuery.isLoading, setIsProfileComplete, isNewSwitch]);

  const isPendingApproval = Boolean(
    activeProfileQuery.data?.data?.kyc?.is_complete &&
    !(
      (activeProfileQuery.data?.data as any)?.merchant_profile?.is_approved ||
      (activeProfileQuery.data?.data as any)?.vehicle_rental_profile?.is_approved
    )
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAnalytics(),
        refetchProfile(),
        refetchItems(),
        activeProfileQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAnalytics, refetchProfile, refetchItems]);

  const handleCta = (action?: 'uploadSpareParts' | 'uploadCars' | 'kyc') => {
    if (!isProfileComplete || isPendingApproval || action === 'kyc') {
      setShowProfileModal(true);
      return;
    }

    if (action === 'uploadSpareParts') {
      router.push(sellerRoutes.uploadSpareParts as any);
      return;
    }

    if (action === 'uploadCars') {
      router.push(isVehicleRental ? sellerRoutes.uploadCarToRent as any : sellerRoutes.uploadProducts as any);
      return;
    }

    // Default fallback (used by HeroCard if uncommented)
    router.push(
      isVehicleRental
        ? (sellerRoutes.uploadCarToRent as any)
        : (sellerRoutes.uploadProducts as any)
    );
  };

  // derived metrics from analytics
  const totalListings = isVehicleRental
    ? (analyticsData?.rental_analytics?.total_rentals ?? 0)
    : (analyticsData?.product_count ?? 0);
  const avgRating = analyticsData?.product_performance?.avg_rating ?? 5.0;
  const reviewedCount = analyticsData?.product_performance?.products_with_reviews ?? 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F8F9FB" }}
      edges={["top"]}
    >
      <StatusBar style="dark" />

      {/* floating chat */}
      <View
        style={{
          position: "absolute",
          bottom: 100,
          right: 20,
          zIndex: 1000,
        }}
      >
        <SpecialistIconBtn isFloating />
      </View>

      {/* Sticky Navbar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <Navbar />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D30309"
            colors={["#D30309"]}
            title="Pull to refresh"
            titleColor="#94A3B8"
          />
        }
      >

        {/* KYC + bidding */}
        <View style={{ paddingHorizontal: 14, marginBottom: 4 }}>
          <BiddingCarousel
            containerPadding={14}
            fallbackVariant={
              (!activeProfileQuery.isLoading && (!isProfileComplete || isPendingApproval))
                ? 'kyc_incomplete'
                : 'seller'
            }
            onSellerAction={handleCta}
          />
        </View>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        {/* <HeroCard isVehicleRental={isVehicleRental} onCta={handleCta} /> */}

        {/* ── METRICS ────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 12 }} className="pt-3">
          <MetricCard
            label={isVehicleRental ? "Total Rentals" : "Total Products"}
            value={totalListings}
            sublabel="listed items"
            accentColor="#0F172A"
          />
          {/* Using a placeholder for sales/orders to balance the UI, since we only had rating stats before */}
          <MetricCard
            label="Total Views"
            value={"-"}
            sublabel="store views"
            accentColor="#16A34A"
          />
        </View>

        {/* ── COMPACT RATING STRIP ───────────────────────── */}
        {!isLoadingAnalytics && (
          <View style={{ paddingHorizontal: 14, marginBottom: 28 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(sellerRoutes.profile as any)}
              className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3"
            >
              <View className="flex-row items-center gap-2">
                <Text style={{ fontSize: 28, fontFamily: 'NunitoExtraBold', color: '#0F172A' }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : '0'}
                </Text>
                <View>
                  <View className="flex-row gap-0.5 mb-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <MaterialCommunityIcons
                        key={s}
                        name={s <= Math.round(avgRating) ? 'star' : 'star-outline'}
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text className="text-[11px] font-NunitoMedium text-slate-400">
                    {reviewedCount} review{Number(reviewedCount) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-[12px] font-NunitoBold text-primary-500">See all</Text>
                <ChevronRightIcon size={14} color="#D30309" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LISTINGS FEED ────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 14 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-NunitoBold text-gray-900">
                {isVehicleRental ? "Latest Rentals" : "Latest Products"}
              </Text>
              <TouchableOpacity onPress={() => router?.push(sellerRoutes.profile as any)}>
                <Text className="text-red-600 font-NunitoBold">Manage all</Text>
              </TouchableOpacity>
            </View>

          {latestItems.length > 0 ? (
            latestItems.map((item: any, index: number) => {
              return (
                <ProductListingCard
                  key={item.id || index}
                  item={item}
                  isVehicleRental={isVehicleRental}
                  onPress={() =>
                    router.push({
                      pathname: sellerRoutes.productDetails as any,
                      params: {
                        productType: isVehicleRental
                          ? "rentedCar"
                          : item.category === CAR_CATEGORY_ID
                            ? "car"
                            : "sparePart",
                        productId: item.id,
                      },
                    })
                  }
                />
              );
            })
          ) : (
            // empty state
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: 36,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Image
                source={
                  isVehicleRental
                    ? require("@/assets/icons/car_rent.png")
                    : require("@/assets/icons/sparePart.png")
                }
                style={{
                  width: 80,
                  height: 64,
                  resizeMode: "contain",
                  opacity: 0.25,
                }}
              />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  fontFamily: "NunitoBold",
                  color: "#94A3B8",
                }}
              >
                No {isVehicleRental ? "rentals" : "products"} listed yet
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontFamily: "NunitoMedium",
                  color: "#CBD5E1",
                  textAlign: "center",
                }}
              >
                {isVehicleRental
                  ? "Your vehicle listings will appear here"
                  : "Your product listings will appear here"}
              </Text>
            </View>
          )}
        </View>

        <AndroidNavBarSpacer />
      </ScrollView>

      <ProfileCompletionModal
        isVisible={showProfileModal}
        roleName={isVehicleRental ? "vehicle_rental" : "seller"}
        onComplete={() => setShowProfileModal(false)}
        onClose={() => setShowProfileModal(false)}
        isPending={isPendingApproval}
      />
    </SafeAreaView>
  );
};

export default SellerHome;