import React from "react";
import { TouchableOpacity, View, Text, Image, Platform } from "react-native";
import { HeartIcon } from "react-native-heroicons/outline";
import { useToggleFavorite } from "@/hooks/useProducts";

interface CarCardProps {
  item: any;
  onPress: (item: any) => void;
  isFavorite?: boolean;
}

const CarCard: React.FC<CarCardProps> = React.memo(({ item, onPress, isFavorite = false }) => {
  const toggleFavoriteMutation = useToggleFavorite();

  const handleFavoritePress = async (e: any) => {
    e.stopPropagation(); // Prevent card press
    try {
      await toggleFavoriteMutation.mutateAsync({
        productId: item.id || item.productId,
        isCurrentlyFavorited: isFavorite
      });
    } catch (error) {
      console.error('❌ Car favorite error:', error);
    }
  };

  return (
    <TouchableOpacity
      className="w-[48%] bg-white rounded-2xl p-2 mb-4 border border-gray-100"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      {/* Car Image */}
      <View className="relative w-full h-32 bg-gray-100 overflow-hidden flex items-center justify-center">
        {typeof item.image === "function" ? (
          <item.image width={160} height={150} />
        ) : (
          <Image
            source={typeof item.image === "string" ? { uri: item.image } : item.image}
            style={{ width: 160, height: 150, resizeMode: "cover" }}
          />
        )}
        
        {/* Favorite Button */}
        <TouchableOpacity
          onPress={handleFavoritePress}
          disabled={toggleFavoriteMutation.isPending}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center ${
            isFavorite ? 'bg-red-500' : 'bg-black/30'
          }`}
          style={{
            opacity: toggleFavoriteMutation.isPending ? 0.6 : 1,
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
          {toggleFavoriteMutation.isPending ? (
            <Text className="text-white text-xs">⋯</Text>
          ) : (
            <HeartIcon 
              color="white" 
              size={16} 
              fill={isFavorite ? "white" : "none"}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Car Details */}
      <View>
        <Text className="text-base font-NunitoBold text-gray-900 mb-1">
          {item.name} {item.year}
        </Text>

        <Text className="text-sm text-gray-600 mb-2">VIN: {item.vin}</Text>

        <View className="flex-row items-center">
          <Text className="text-sm text-gray-600 mr-1">Status:</Text>
          <Text
            className={`text-sm font-NunitoBold ${
              item.status === "Active" ? "text-green-600" : "text-red-600"
            }`}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default CarCard; 