import React from "react";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { MapPinIcon, StarIcon, CheckBadgeIcon } from "react-native-heroicons/solid";
import Rating from "@/components/Rating";

interface Mechanic {
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  image: any;
  isVip?: boolean;
  specialization?: string;
  location?: string;
  isOnline?: boolean;
  isVerified?: boolean;
}

interface MechanicCardProps {
  item: Mechanic;
  onPress: (item: Mechanic) => void;
  cardWidth: number;
}

const MechanicCard: React.FC<MechanicCardProps> = React.memo(({ item, onPress, cardWidth }) => (
  <TouchableOpacity
    onPress={() => onPress(item)}
    className="bg-white rounded-3xl overflow-hidden border border-gray-100 mb-5"
    style={{
      width: cardWidth,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    }}
    activeOpacity={0.9}
  >
    {/* Image Container */}
    <View className="relative">
      <View className="w-full h-40 bg-gray-50 overflow-hidden">
        {typeof item.image === "function" ? (
          <View className="items-center justify-center flex-1">
            <item.image width={cardWidth} height={160} />
          </View>
        ) : (
          <Image
            source={typeof item.image === "string" ? { uri: item.image } : item.image}
            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          />
        )}
      </View>
      
      {/* Overlay Badges */}
      <View className="absolute top-3 left-3 flex-row items-center">
        {item.isOnline && (
          <View className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex-row items-center mr-2 shadow-sm">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
            <Text className="text-[10px] font-NunitoBold text-green-600 uppercase">Live</Text>
          </View>
        )}
        {item.isVip && (
          <View className="bg-red-500 px-2 py-1 rounded-lg shadow-sm">
            <Text className="text-[10px] font-NunitoBold text-white uppercase">VIP</Text>
          </View>
        )}
      </View>

      {item.isVerified && (
        <View className="absolute top-3 right-3 bg-white/90 p-1 rounded-full shadow-sm">
          <CheckBadgeIcon size={18} color="#059669" />
        </View>
      )}
    </View>

    {/* Content */}
    <View className="p-4">
      <View className="mb-2">
        <Text className="text-lg font-NunitoExtraBold text-gray-900 leading-6" numberOfLines={1}>
          {item.name}
        </Text>
        {item.specialization && (
          <Text className="text-xs text-gray-400 font-NunitoBold uppercase tracking-wider mt-0.5" numberOfLines={1}>
            {item.specialization}
          </Text>
        )}
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <StarIcon size={14} color="#FBBF24" />
          <Text className="text-sm font-NunitoBold text-gray-900 ml-1">
            {item.rating.toFixed(1)}
          </Text>
          <Text className="text-xs font-NunitoSemiBold text-gray-400 ml-1">
            ({item.reviewCount})
          </Text>
        </View>
        <Rating rating={item.rating} size={10} />
      </View>

      {item.location && (
        <View className="flex-row items-center bg-gray-50 rounded-2xl px-3 py-2.5">
          <MapPinIcon size={14} color="#D30309" />
          <Text className="text-[11px] text-gray-600 font-NunitoSemiBold ml-2 flex-1" numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
));

export default MechanicCard; 