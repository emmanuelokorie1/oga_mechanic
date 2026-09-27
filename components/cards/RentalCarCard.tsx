import React from "react";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { NairaCurrency } from "@/utils/useCurrencyFormatter";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface RentalCarCardProps {
  item: any;
  onPress: (item: any) => void;
}

const RentalCarCard: React.FC<RentalCarCardProps> = React.memo(({ item, onPress }) => {
  if (!item) return null;

  const isVan = item.body_type === 'van' || item.category === 'van';
  const isTruck = item.body_type === 'truck' || item.category === 'truck';
  
  const images = (item.images && item.images.length > 0)
    ? item.images
    : [item.image || 'https://via.placeholder.com/600x400/f3f4f6/9ca3af?text=No+Image'];

  const displayImage = images[0];

  const transmissionLabel = item.transmission || "Automatic";
  const seatsCount = item.seats || (isVan ? 2 : isTruck ? 3 : 5);
  const fuelType = item.fuel_type || "Petrol";

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.92}
      className="bg-white rounded-3xl p-3.5 mb-5 border border-gray-200/90"
    >
      {/* ── 1. Inner Framed Image Showcase Stage (Static & Stable) ── */}
      <View className="w-full h-44 bg-[#F8FAFC] rounded-2xl relative overflow-hidden items-center justify-center border border-gray-100">
        {/* Soft frosted blur underlay */}
        <Image
          source={{ uri: displayImage }}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.15 }}
          blurRadius={14}
          resizeMode="cover"
        />

        {/* Crisp foreground vehicle */}
        <Image
          source={{ uri: displayImage }}
          style={{ width: '90%', height: '86%' }}
          resizeMode="contain"
        />

        {/* Top-Left Category Badge */}
        <View className="absolute top-2.5 left-2.5">
          <View
            className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 shadow-sm ${
              isVan ? 'bg-blue-600' : isTruck ? 'bg-amber-600' : 'bg-primary-500'
            }`}
          >
            <MaterialCommunityIcons
              name={isVan ? 'tow-truck' : isTruck ? 'truck' : 'car-side'}
              size={12}
              color="#FFFFFF"
            />
            <Text className="text-[10px] font-NunitoExtraBold text-white uppercase tracking-wider">
              {isVan ? 'Towing' : isTruck ? 'Truck' : 'Rental'}
            </Text>
          </View>
        </View>

        {/* Top-Right Rating Badge */}
        <View className="absolute top-2.5 right-2.5">
          <View className="bg-white/95 px-2 py-0.5 rounded-full flex-row items-center gap-1 shadow-sm border border-white/80">
            <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
            <Text className="text-[10px] font-NunitoExtraBold text-gray-800">
              {item.rating || '4.9'}
            </Text>
          </View>
        </View>

        {/* Bottom-Left Photo Count Badge (Static, no motion) */}
        {images.length > 1 && (
          <View className="absolute bottom-2.5 left-2.5 flex-row items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
            <MaterialCommunityIcons name="camera" size={11} color="#FFFFFF" />
            <Text className="text-[10px] font-NunitoBold text-white">
              {images.length} photos
            </Text>
          </View>
        )}
      </View>

      {/* ── 2. Card Content & Structured Specs ── */}
      <View className="pt-3 px-1">
        {/* Title and Make */}
        <View className="flex-row items-start justify-between mb-2.5">
          <View className="flex-1 mr-2">
            <Text className="text-base font-NunitoExtraBold text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-xs font-NunitoBold text-gray-400 mt-0.5" numberOfLines={1}>
              {item.make ? `${item.make} • ` : ''}{isVan ? 'Heavy Duty Transport' : isTruck ? 'Commercial Cargo' : (item.body_type ? `${item.body_type.toUpperCase()}` : 'SEDAN')}
            </Text>
          </View>
        </View>

        {/* 3-Column Symmetrical Specs Tiles */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 bg-gray-50 border border-gray-100/90 rounded-xl py-2 px-2 items-center flex-row justify-center gap-1.5">
            <MaterialCommunityIcons name="car-shift-pattern" size={13} color="#64748B" />
            <Text className="text-[11px] font-NunitoBold text-gray-700" numberOfLines={1}>
              {transmissionLabel}
            </Text>
          </View>

          <View className="flex-1 bg-gray-50 border border-gray-100/90 rounded-xl py-2 px-2 items-center flex-row justify-center gap-1.5">
            <MaterialCommunityIcons
              name={isVan ? "weight" : isTruck ? "truck-cargo-container" : "account-group-outline"}
              size={13}
              color="#64748B"
            />
            <Text className="text-[11px] font-NunitoBold text-gray-700" numberOfLines={1}>
              {isVan ? "Heavy Cap" : isTruck ? "Cargo" : `${seatsCount} Seats`}
            </Text>
          </View>

          <View className="flex-1 bg-gray-50 border border-gray-100/90 rounded-xl py-2 px-2 items-center flex-row justify-center gap-1.5">
            <MaterialCommunityIcons name="gas-station-outline" size={13} color="#64748B" />
            <Text className="text-[11px] font-NunitoBold text-gray-700" numberOfLines={1}>
              {fuelType}
            </Text>
          </View>
        </View>

        {/* Subtle Divider */}
        <View className="h-[1px] bg-gray-100 mb-3" />

        {/* ── 3. Footer: Daily Rate & Action Button ── */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-wider mb-0.5">
              Daily Rate
            </Text>
            <View className="flex-row items-baseline">
              <NairaCurrency value={item.pricePerDay} className="text-lg font-NunitoExtraBold text-primary-500" />
              <Text className="text-xs font-NunitoBold text-gray-400 ml-1">/day</Text>
            </View>
          </View>

          <View className="bg-primary-500 px-4 py-2 rounded-xl flex-row items-center gap-1.5 shadow-sm shadow-primary-500/25">
            <Text className="text-xs font-NunitoExtraBold text-white">Book Now</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default RentalCarCard;