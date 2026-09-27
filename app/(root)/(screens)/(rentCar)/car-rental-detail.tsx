import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ScrollView,
  Platform,
  Linking,
  Share,
  Modal,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { 
  ArrowLeftIcon,
  MapPinIcon, 
  ChatBubbleBottomCenterTextIcon,
  CalendarDaysIcon,
  UsersIcon,
  CheckBadgeIcon,
  BoltIcon,
  BeakerIcon,
  CogIcon,
  PhoneIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ShareIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";
import { StarIcon } from "react-native-heroicons/solid";
import { productsAPI } from "@/lib/api/products";
import { userAPI } from "@/lib/api/user";
import { communicationsAPI } from "@/lib/api/communications";
import { formatCurrency } from "@/utils/useCurrencyFormatter";
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

const CarRentalDetail = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const productId = (params.carId || params.id || params.productId) as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<any>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  const fetchDetails = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await productsAPI.getProductById(productId);
      setProductData(res.data);
      
      if (res.data.merchant_id) {
        const mRes = await userAPI.getMerchantProfileByUuid(res.data.merchant_id);
        setMerchantData(mRes.data?.merchant_profile);
      }
    } catch (err) {
      setError("Failed to load vehicle details");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (productData && !loading) {
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
  }, [productData, loading]);

  const carImages: string[] = useMemo(() => {
    if (!productData?.images?.length) {
      return productData?.image ? [productData.image] : [];
    }
    return productData.images.map((img: any) => img.image);
  }, [productData]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const availabilityBadge = useMemo(() => {
    const status = productData?.availability?.toLowerCase();
    if (status === 'in_stock' || !status) {
      return {
        text: 'Available',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-700',
        dotClass: 'bg-green-600',
      };
    } else if (status === 'reserved') {
      return {
        text: 'Reserved',
        bgClass: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-700',
        dotClass: 'bg-amber-600',
      };
    } else {
      return {
        text: 'Rented',
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-700',
        dotClass: 'bg-red-600',
      };
    }
  }, [productData]);

  const hasFeatures = Boolean(
    productData?.air_conditioning || productData?.leather_seats || productData?.navigation_system ||
    productData?.bluetooth || productData?.parking_sensors || productData?.sunroof ||
    productData?.airbags || productData?.abs || productData?.traction_control ||
    productData?.lane_assist || productData?.blind_spot_monitor
  );

  const performVoiceCall = useCallback(() => {
    const phone = merchantData?.user?.phone_number || productData?.merchant_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  }, [merchantData, productData]);

  const performWhatsAppCall = useCallback(() => {
    const phone = merchantData?.user?.phone_number || productData?.merchant_phone;
    if (!phone) {
      Alert.alert("Error", "Phone number not available");
      return;
    }

    const cleanedNumber = phone.replace(/\D/g, '');
    const message = `Hi, I'm interested in your ${productData.name} listed on Oga Mechanic. Is it available for rental?`;
    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl);
      } else {
        Alert.alert("Error", "WhatsApp is not installed on this device");
      }
    });
  }, [merchantData, productData]);

  const handleChat = useCallback(async () => {
    if (!productData) return;

    try {
      const sellerUserId = merchantData?.user?.id || productData.merchant_id;

      if (!sellerUserId) {
        Alert.alert("Error", "Could not find owner information.");
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
          Alert.alert("Error", "Could not start chat. Please try again.");
          return;
        }
      }

      router.push({
        pathname: "/(root)/(screens)/(user)/chat-room",
        params: {
          roomId: roomId,
          participantName: merchantData?.user?.first_name || "Owner",
          participantAvatar: merchantData?.profile_picture || "",
        }
      });
    } catch (error) {
      Alert.alert("Error", "Failed to connect with owner.");
    }
  }, [productData, merchantData]);

  const handleShare = useCallback(async () => {
    if (!productData) return;

    const specs: string[] = [];
    if (productData.year)             specs.push(`📅 Year: ${productData.year}`);
    if (productData.transmission)     specs.push(`⚙️ Transmission: ${productData.transmission}`);
    if (productData.fuel_type)        specs.push(`⛽ Fuel: ${productData.fuel_type}`);
    if (productData.engine_size)      specs.push(`🔧 Engine: ${productData.engine_size}L`);
    if (productData.number_of_seats)  specs.push(`💺 Seats: ${productData.number_of_seats}`);
    if (productData.number_of_doors)  specs.push(`🚪 Doors: ${productData.number_of_doors}`);

    const ownerName = merchantData?.user?.first_name
      ? `${merchantData.user.first_name} ${merchantData.user.last_name || ''}`.trim()
      : null;
    const ownerPhone = merchantData?.user?.phone_number || productData?.merchant_phone;

    const contactLines: string[] = [];
    if (ownerName)  contactLines.push(`👤 Owner: ${ownerName}`);
    if (ownerPhone) contactLines.push(`📞 Contact: ${ownerPhone}`);

    const specsBlock   = specs.length   ? `\n${specs.join('\n')}` : '';
    const contactBlock = contactLines.length ? `\n\n📬 Contact Details:\n${contactLines.join('\n')}` : '';

    const message =
      `🚗 *${productData.name}*` +
      `\n💰 ₦${Number(productData.price).toLocaleString()}/day` +
      `\n📍 ${productData.location || 'Lagos, Nigeria'}` +
      specsBlock +
      (productData.description ? `\n\n📝 ${productData.description.slice(0, 120)}${productData.description.length > 120 ? '...' : ''}` : '') +
      contactBlock +
      `\n\n📲 Find more vehicles on the Oga Mechanic app!`;

    try {
      await Share.share({ title: productData.name, message });
    } catch (error) {
      // User dismissed share
    }
  }, [productData, merchantData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={["top"]}>
        <StatusBar style="dark" />
        <LoadingSpinner message="Refining vehicle details..." />
      </SafeAreaView>
    );
  }

  if (error || !productData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar style="dark" />
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
            <ArrowLeftIcon size={20} color="#000" />
          </TouchableOpacity>
          <Text className="text-[17px] font-NunitoExtraBold text-gray-900">Rental Details</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <InformationCircleIcon size={64} color="#D1D5DB" />
          <Text className="text-xl font-NunitoExtraBold text-gray-900 mt-4 text-center">Something went wrong</Text>
          <Text className="text-sm font-NunitoMedium text-gray-500 mt-2 text-center">{error || "Vehicle details not found"}</Text>
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
          Rental Details
        </Text>
        <TouchableOpacity 
          onPress={handleShare}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
          activeOpacity={0.75}
        >
          <ShareIcon size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Compact Premium Image Gallery */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }} className="relative bg-white pb-2 pt-1">
          <View className="mx-4 bg-white rounded-[24px] overflow-hidden shadow-xl shadow-gray-400/25 border border-gray-100">
            <TouchableOpacity 
              activeOpacity={0.95}
              onPress={() => carImages.length > 0 && setIsFullScreen(true)}
              className="w-full h-[210px] bg-gray-50"
            >
              {carImages.length > 0 && !imageErrors.has(selectedImageIndex) ? (
                <Image
                  source={{ uri: carImages[selectedImageIndex] }}
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

            {/* Category / Rental Badge Overlay */}
            <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 shadow-sm pointer-events-none">
              <Text className="text-[10px] font-NunitoExtraBold text-gray-900 uppercase tracking-wider">
                {productData.body_type?.replace('_', ' ') || 'Rental Vehicle'}
              </Text>
            </View>

            {/* View Full Screen Button */}
            {carImages.length > 0 && (
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
            {carImages.length > 1 && (
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
                  {carImages.map((_: any, index: number) => (
                    <View 
                      key={index} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${index === selectedImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} 
                    />
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.min(carImages.length - 1, selectedImageIndex + 1))}
                  className="w-8 h-8 bg-white/85 backdrop-blur-md rounded-full items-center justify-center shadow-sm"
                  disabled={selectedImageIndex === carImages.length - 1}
                  activeOpacity={0.7}
                >
                  <ChevronRightIcon size={16} color={selectedImageIndex === carImages.length - 1 ? "#D1D5DB" : "#111827"} strokeWidth={2.5} />
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
                  {productData.name}
                </Text>
                <View className="flex-row items-center flex-wrap gap-2">
                  <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                    <StarIcon size={14} color="#F59E0B" />
                    <Text className="text-gray-900 font-NunitoExtraBold text-[12px] ml-1">
                      {productData.rating ? Number(productData.rating).toFixed(1) : '5.0'}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <MapPinIcon size={14} color="#9CA3AF" />
                    <Text className="text-gray-400 text-[12px] font-NunitoBold ml-1">
                      {productData.location || "Lagos, Nigeria"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Premium Pricing Block */}
            <View className="bg-primary-50 rounded-[24px] p-4 flex-row items-center justify-between border border-primary-100/50">
              <View className="flex-1 mr-2">
                <Text className="text-primary-400 font-NunitoBold text-[10px] uppercase tracking-widest mb-1">
                  Rental Daily Rate
                </Text>
                <View className="flex-row items-baseline flex-wrap">
                  <Text className="text-primary-700 font-NunitoExtraBold text-[24px]">
                    ₦{parseFloat(productData.price || '0').toLocaleString()}
                  </Text>
                  <Text className="text-primary-400 font-NunitoBold text-[14px] ml-1">/day</Text>
                </View>
              </View>

              <View className={`shrink-0 px-3 py-1.5 rounded-full border ${availabilityBadge.bgClass}`}>
                <View className="flex-row items-center">
                  <View className={`w-2 h-2 rounded-full mr-1.5 ${availabilityBadge.dotClass}`} />
                  <Text className={`${availabilityBadge.textClass} font-NunitoExtraBold text-[11px] uppercase tracking-wider`}>
                    {availabilityBadge.text}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Specifications Grid */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-[17px] font-NunitoExtraBold text-gray-900">
                Specifications
              </Text>
              <CogIcon size={18} color="#9CA3AF" />
            </View>
            <View className="flex-row flex-wrap gap-3">
              {productData.transmission && (
                <SpecItem icon={BoltIcon} label="Gear" value={productData.transmission} colorClass="bg-orange-500" />
              )}
              {productData.fuel_type && (
                <SpecItem icon={BeakerIcon} label="Energy" value={productData.fuel_type} colorClass="bg-blue-500" />
              )}
              {productData.number_of_seats && (
                <SpecItem icon={UsersIcon} label="Capacity" value={`${productData.number_of_seats} Seats`} colorClass="bg-purple-500" />
              )}
              {productData.year && (
                <SpecItem icon={CalendarDaysIcon} label="Model Year" value={productData.year.toString()} colorClass="bg-green-500" />
              )}
              {productData.number_of_doors && (
                <SpecItem icon={CheckBadgeIcon} label="Doors" value={`${productData.number_of_doors} Doors`} colorClass="bg-indigo-500" />
              )}
              {productData.engine_size && (
                <SpecItem icon={CogIcon} label="Engine" value={`${productData.engine_size}L`} colorClass="bg-emerald-500" />
              )}
            </View>
          </View>

          {/* Key Features Section */}
          {hasFeatures && (
            <View className="mb-6 bg-white rounded-[26px] p-4 shadow-xs border border-gray-200">
              <View className="flex-row items-center mb-5">
                <SparklesIcon size={20} color="#D30309" />
                <Text className="text-[17px] font-NunitoExtraBold text-gray-900 ml-2.5">Vehicle Features</Text>
              </View>
              
              <View className="mb-4">
                <Text className="text-[11px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest mb-3">Amenities</Text>
                <View className="flex-row flex-wrap">
                  {productData.air_conditioning && <FeatureItem label="A/C System" />}
                  {productData.leather_seats && <FeatureItem label="Leather Interior" />}
                  {productData.navigation_system && <FeatureItem label="GPS Navigation" />}
                  {productData.bluetooth && <FeatureItem label="Bluetooth Audio" />}
                  {productData.parking_sensors && <FeatureItem label="Parking Sensors" />}
                  {productData.sunroof && <FeatureItem label="Panoramic Roof" />}
                </View>
              </View>

              <View>
                <Text className="text-[11px] font-NunitoExtraBold text-gray-400 uppercase tracking-widest mb-3">Safety & Tech</Text>
                <View className="flex-row flex-wrap">
                  {productData.airbags && <FeatureItem label="Dual Airbags" isSafety />}
                  {productData.abs && <FeatureItem label="ABS Braking" isSafety />}
                  {productData.traction_control && <FeatureItem label="Traction Control" isSafety />}
                  {productData.lane_assist && <FeatureItem label="Lane Departure" isSafety />}
                  {productData.blind_spot_monitor && <FeatureItem label="Blind Spot Monitoring" isSafety />}
                </View>
              </View>
            </View>
          )}

          {/* Vehicle Narrative / Description Section */}
          <View className="mb-6 px-1">
            <Text className="text-[17px] font-NunitoExtraBold text-gray-900 mb-3">
              Vehicle Overview
            </Text>
            <View className="bg-white rounded-[24px] p-4 border border-gray-200 shadow-xs">
              <Text className="text-gray-500 font-NunitoMedium leading-6 text-[14px]">
                {productData.description || "Experience pure luxury and performance with this meticulously maintained vehicle. Perfect for executive travel, family trips, or special occasions."}
              </Text>
            </View>
          </View>

          {/* Service Provider / Host Card */}
          <View className="mb-4 bg-white rounded-[26px] p-5 shadow-xs border border-gray-200">
            <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
              <View className="flex-1 mr-2">
                <Text className="text-[16px] font-NunitoExtraBold text-gray-900">
                  Vehicle Host
                </Text>
                <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">
                  Verified rental partner on Oga Mechanic
                </Text>
              </View>
              <View className="shrink-0 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <Text className="text-emerald-700 text-[10px] font-NunitoBold">Verified Host</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                  <Image 
                    source={{ uri: merchantData?.profile_picture || 'https://via.placeholder.com/150' }} 
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-NunitoExtraBold text-gray-900" numberOfLines={1}>
                    {`${merchantData?.user?.first_name || ''} ${merchantData?.user?.last_name || ''}`.trim() || 'Service Provider'}
                  </Text>
                  <Text className="text-[11px] font-NunitoMedium text-gray-400 mt-0.5">
                    Response time: &lt; 1 hr
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleChat}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 items-center justify-center"
              >
                <ChatBubbleBottomCenterTextIcon size={20} color="#D30309" />
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
            <ChatBubbleBottomCenterTextIcon size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsContactModalVisible(true)}
            activeOpacity={0.85}
            className="flex-1 bg-gray-900 rounded-[22px] py-3.5 items-center justify-center shadow-md shadow-gray-400"
          >
            <View className="flex-row items-center">
              <PhoneIcon size={18} color="white" />
              <Text className="text-white font-NunitoExtraBold text-[15px] ml-2">
                Book / Contact Host
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
                {selectedImageIndex + 1} / {carImages.length}
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
            {carImages.length > 0 && (
              <Image
                source={{ uri: carImages[selectedImageIndex] }}
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
            {carImages.length > 1 && (
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
                  {carImages.map((_: any, index: number) => (
                    <View
                      key={index}
                      className={`h-2 rounded-full ${index === selectedImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedImageIndex(Math.min(carImages.length - 1, selectedImageIndex + 1))}
                  className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
                  disabled={selectedImageIndex === carImages.length - 1}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <ChevronRightIcon size={24} color={selectedImageIndex === carImages.length - 1 ? "rgba(255,255,255,0.3)" : "white"} />
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
        phoneNumber={merchantData?.user?.phone_number || productData?.merchant_phone || "+234 000 000 0000"}
        onVoiceCall={performVoiceCall}
        onWhatsAppCall={performWhatsAppCall}
        storeName={merchantData?.user?.first_name ? `${merchantData.user.first_name} ${merchantData.user.last_name || ''}` : "Service Provider"}
      />
    </SafeAreaView>
  );
};

export default CarRentalDetail;