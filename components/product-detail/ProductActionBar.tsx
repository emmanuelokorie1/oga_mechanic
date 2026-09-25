import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import CustomButton from "@/components/CustomButton";
import AndroidNavBarSpacer from "@/components/AndroidNavBarSpacer";
import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon, 
  PhoneIcon 
} from "react-native-heroicons/outline";
import { HeartIcon as HeartIconSolid } from "react-native-heroicons/solid";

interface ProductActionBarProps {
  isFavorite: boolean;
  isTogglingFavorite: boolean;
  showFavoriteSuccess: boolean;
  onCall: () => void;
  onChat: () => void;
  onToggleFavorite: () => void;
}

const ProductActionBar: React.FC<ProductActionBarProps> = ({
  isFavorite,
  isTogglingFavorite,
  showFavoriteSuccess,
  onCall,
  onChat,
  onToggleFavorite,
}) => {
  return (
    <View
      className="bg-white border-t border-gray-100"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="px-4 py-3 flex-row items-center space-x-3 gap-2">
        {/* Favorite Button */}
        <TouchableOpacity
          onPress={onToggleFavorite}
          disabled={isTogglingFavorite}
          className={`w-12 h-12 rounded-xl items-center justify-center ${
            showFavoriteSuccess
              ? "bg-green-100"
              : isFavorite
              ? "bg-red-50"
              : "bg-gray-100"
          }`}
          style={{
            opacity: isTogglingFavorite ? 0.6 : 1,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              },
              android: {
                elevation: 2,
              },
            }),
          }}
        >
          {isTogglingFavorite ? (
            <ActivityIndicator size="small" color="#D30309" />
          ) : showFavoriteSuccess ? (
            <Text className="text-lg text-green-500 font-NunitoBold">✓</Text>
          ) : isFavorite ? (
            <HeartIconSolid size={24} color="#EF4444" />
          ) : (
            <HeartIcon size={24} color="#6B7280" />
          )}
        </TouchableOpacity>

        {/* Chat Button */}
        <TouchableOpacity
          onPress={onChat}
          className="flex-1 h-12 bg-gray-100 rounded-xl flex-row items-center justify-center border border-gray-200"
          activeOpacity={0.7}
        >
          <ChatBubbleLeftRightIcon size={20} color="#374151" />
          <Text className="ml-2 text-gray-800 font-NunitoBold">Message</Text>
        </TouchableOpacity>

        {/* Call Button */}
        <TouchableOpacity
          onPress={onCall}
          className="flex-1 h-12 bg-primary-500 rounded-xl flex-row items-center justify-center"
          activeOpacity={0.8}
        >
          <PhoneIcon size={20} color="white" />
          <Text className="ml-2 text-white font-NunitoBold">Call Seller</Text>
        </TouchableOpacity>
      </View>

      <AndroidNavBarSpacer backgroundColor="white" extraHeight={4} />
    </View>
  );
};

export default ProductActionBar;