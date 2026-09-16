import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  BackHandler,
  Image,
  Dimensions,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Services as ServicesData } from "@/constants";
import { CAR_BRANDS } from "@/constants/data";
import { router, useFocusEffect } from "expo-router";
import { routes } from "@/constants/routes";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Navbar from "@/components/Navbar";
import { LAYOUT } from "@/constants/units";
import { useHomeProducts, useActiveBiddingProducts } from "@/hooks/useProducts";
import BiddingCarousel from "@/components/bidding/BiddingCarousel";
import SpecialistIconBtn from "@/components/SpecialistIconBtn";
import SwitchUserModal from "@/components/modals/SwitchUserModal";
import VINSearchModal from "@/components/modals/VINSearchModal";
import EmptyState from "@/components/EmptyState";

// ─── Icon config for service cards ───────────────────────────────────────────
const SERVICE_ICONS: Record<string, { icon: string }> = {
  'Find a Mechanic':  { icon: 'car-wrench' },
  'Buy Spare Parts':  { icon: 'car-cog' },
  'Buy a Car':        { icon: 'car' },
  'Vehicle Rental':   { icon: 'car-clock' },
  'VIN Search':       { icon: 'barcode-scan' },
  'My Repair Orders': { icon: 'file-document-outline' },
  'Chat Specialist':  { icon: 'chat-processing-outline' },
  'Service Partner':  { icon: 'handshake-outline' },
};

// ─── Trust indicators data ───────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: 'shield-check-outline', label: 'Verified Pros' },
  { icon: 'lock-outline',         label: 'Secure Escrow' },
  { icon: 'check-decagram-outline', label: 'Warranty' },
];

// ─── Brands Section ────────────────────────────────────────────────────────────
const BRAND_LOGOS: Record<string, string> = {
  'Toyota': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/500px-Toyota_carlogo.svg.png',
  'Honda': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/500px-Honda_Logo.svg.png',
  'Mercedes-Benz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/500px-Mercedes-Logo.svg.png',
  'Lexus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Lexus_logo.svg/500px-Lexus_logo.svg.png',
  'Ford': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Ford_Motor_Company_Logo.svg/500px-Ford_Motor_Company_Logo.svg.png',
  'Hyundai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/500px-Hyundai_Motor_Company_logo.svg.png',
  'Kia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/KIA_logo2.svg/500px-KIA_logo2.svg.png',
  'Nissan': 'https://upload.wikimedia.org/wikipedia/commons/commons/thumb/8/8c/Nissan_logo.png/500px-Nissan_logo.png',
  'BMW': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/500px-BMW.svg.png',
  'Audi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/500px-Audi-Logo_2016.svg.png'
};

const BrandsSection = () => {
  const { width } = Dimensions.get('window');
  // 3.5 ensures 3 items fit perfectly while half of the 4th item peeks out
  const itemWidth = width / 3.5; 

  return (
    <View className="mt-4 pt-6 pb-2">
      <View className="px-5 mb-6">
        <Text
          style={{ fontSize: 12, color: "#94A3B8", letterSpacing: 1, textAlign: 'center' }}
          className="font-NunitoExtraBold uppercase"
        >
          Trusted by owners of
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
      >
        {CAR_BRANDS.slice(0, 10).map((brand) => (
          <View key={brand.value} style={{ width: itemWidth, alignItems: 'center', justifyContent: 'center' }}>
            {BRAND_LOGOS[brand.label] ? (
              <Image 
                source={{ uri: BRAND_LOGOS[brand.label] }} 
                style={{ width: itemWidth * 1, height: 48, resizeMode: 'contain', opacity: 0.8 }}
              />
            ) : (
              <MaterialCommunityIcons name="car" size={48} color="#94A3B8" style={{ opacity: 0.8 }} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Trust Indicators Strip ──────────────────────────────────────────────────
const TrustStrip = () => (
  <View className="mt-4 px-5">
    <View 
      style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      {TRUST_ITEMS.map((item, index) => (
        <React.Fragment key={item.label}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <View style={{
              backgroundColor: '#FFF0F0',
              padding: 4,
              borderRadius: 8,
            }}>
              <MaterialCommunityIcons name={item.icon as any} size={14} color="#D30309" />
            </View>
            <Text
              style={{ fontSize: 12, color: '#334155', letterSpacing: -0.2 }}
              className="font-NunitoBold"
            >
              {item.label}
            </Text>
          </View>
          {/* Add a subtle separator between items, except after the last one */}
          {index < TRUST_ITEMS.length - 1 && (
            <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
          )}
        </React.Fragment>
      ))}
    </View>
  </View>
);

const ServiceCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const iconData = SERVICE_ICONS[item.name] || { icon: 'apps' };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: "100%",
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Premium Watermark Pattern */}
      <MaterialCommunityIcons
        name={iconData.icon as any}
        size={100}
        color="#F8FAFC" 
        style={{
          position: 'absolute',
          right: -15,
          top: -15, 
          transform: [{ rotate: '-10deg' }],
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 14, 
          backgroundColor: '#FFF1F2', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: 16
        }}>
          <MaterialCommunityIcons
            name={iconData.icon as any}
            size={26}
            color="#E11D48"
          />
        </View>

        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            style={{
              fontSize: 16,
              color: "#0F172A",
              letterSpacing: -0.3,
              marginBottom: 4,
            }}
            numberOfLines={1}
            className="font-NunitoExtraBold"
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              letterSpacing: -0.1,
            }}
            numberOfLines={1}
            className="font-NunitoMedium"
          >
            {item.description}
          </Text>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color="#CBD5E1" />
    </TouchableOpacity>
  );
};

// ─── Home Screen ─────────────────────────────────────────────────────────────
const Home = () => {
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isSwitchRoleVisible, setIsSwitchRoleVisible] = useState(false);
  const [isVinSearchVisible, setIsVinSearchVisible] = useState(false);
  const [isMechanicCardShowing, setIsMechanicCardShowing] = useState(true);

  const { data: homeProducts, refetch: refetchHomeProducts } = useHomeProducts();
  const { data: activeBiddingRes, refetch: refetchActiveBidding } = useActiveBiddingProducts();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchHomeProducts(),
      refetchActiveBidding()
    ]);
    setRefreshing(false);
  };

  const carCategoryId = homeProducts?.data?.best_selling_cars?.[0]?.category?.id;
  const sparePartCategoryId = homeProducts?.data?.best_selling_spare_parts?.[0]?.category?.id;
  const { SCROLL_PADDING_BOTTOM } = LAYOUT;

  const handleServicePress = (service: any) => {
    switch (service.name) {
      case "Service Provider":
        setIsSwitchRoleVisible(true);
        break;
      case "Buy spare parts":
      case "Buy Spare Parts":
        navigateToParts();
        break;
      case "Buy a Car": {
        const catId = (carCategoryId || 23);
        const catName = homeProducts?.data?.best_selling_cars?.[0]?.category?.name || 'Car';
        router.push(`${routes.shop}?categoryId=${catId}&category=${encodeURIComponent(catName)}`);
        break;
      }
      case "Vehicle Rental":
        router.push(routes.rentACar);
        break;
      case "Chat a Specialist":
      case "Chat Specialist":
        router.push(routes.supportSuggestions as any);
        break;
      case "Find a Mechanic":
        router.push(routes.findMechanic);
        break;
      case "My Mechanic Orders":
      case "My Repair Orders":
        router.push(routes.myMechanicOrders);
        break;
      case "VIN Search":
        setIsVinSearchVisible(true);
        break;
      default:
        console.log("Navigate to:", service.name);
    }
  };

  const navigateToParts = () => {
    const catId = (sparePartCategoryId || 24);
    const catName = homeProducts?.data?.best_selling_spare_parts?.[0]?.category?.name || 'Spare Part';
    router.push(`${routes.shop}?categoryId=${catId}&category=${encodeURIComponent(catName)}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Floating Chat Specialist */}
      {/* <View style={{ position: 'absolute', bottom: 170, right: 24, zIndex: 1000 }}>
        <SpecialistIconBtn isFloating={true} />
      </View> */}

      {/* Navbar */}
      <View className="px-5 mt-2">
        <Navbar />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D30309"]} tintColor="#D30309" />
        }
      >
        <BiddingCarousel onFallbackChange={setIsMechanicCardShowing} />
        
        <TrustStrip />

        {/* Section Header */}
        <View className="px-5 mt-4 mb-2">
          <Text
            style={{ fontSize: 18, color: "#111827", letterSpacing: -0.3 }}
            className="font-NunitoBold"
          >
            Services
          </Text>
        </View>

        {/* Services Grid */}
        <View className="flex-1 px-5">
          {ServicesData.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={ServicesData.filter(service => {
                if (isMechanicCardShowing && service.name === 'Find a Mechanic') return false;
                return true;
              })}
              renderItem={({ item }) => (
                <ServiceCard
                  item={item}
                  onPress={() => handleServicePress(item)}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 3,
              }}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={true}
            />
          ) : (
            <EmptyState
              title="No services found"
              description="We couldn't load any services at the moment. Please try refreshing or checking back later."
              actionLabel="Refresh Now"
              onAction={onRefresh}
            />
          )}
        </View>

        {/* <BrandsSection /> */}

        <View style={{ height: SCROLL_PADDING_BOTTOM }} />
      </ScrollView>

      {/* Switch Role Modal */}
      <SwitchUserModal
        isVisible={isSwitchRoleVisible}
        onClose={() => setIsSwitchRoleVisible(false)}
        onSwitchUser={() => {}}
      />

      {/* VIN Search Modal */}
      <VINSearchModal
        isVisible={isVinSearchVisible}
        onClose={() => setIsVinSearchVisible(false)}
      />
    </SafeAreaView>
  );
};

export default Home;
