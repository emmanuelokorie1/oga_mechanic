
import { View, Text, TouchableOpacity, Platform, Animated, Image, ActivityIndicator } from "react-native";
import type { SvgProps } from "react-native-svg";
import { type FC, useRef, memo } from "react";
import Rating from "../Rating";
import { NairaCurrency } from "@/utils/useCurrencyFormatter";
// import { icons } from "@/constants";
import { router } from "expo-router";
import { routes } from "@/constants/routes";
import { HeartIcon, ShoppingCartIcon, CheckIcon, CameraIcon, CheckBadgeIcon } from "react-native-heroicons/outline";
import { CheckBadgeIcon as CheckBadgeIconSolid } from "react-native-heroicons/solid";
import { useToggleFavorite } from "@/hooks/useProducts";
import { showToast } from "@/utils/toastUtils";
// import { useCart } from "@/contexts/CartContext";

interface Props {
  Images: FC<SvgProps> | number | { uri: string };
  rating?: number;
  name?: string;
  address?: string;
  reviewCount?: number;
  price?: number;
  love?: boolean;
  showLove?: boolean;
  onPress?: () => void;
  onLovePress?: () => void;
  isLoading?: boolean;
  containerStyle?: string;
  productId?: number | string;
  isFavorite?: boolean;
  userCarMakes?: string[];
}

const Card1 = memo(({
  Images,
  rating,
  name,
  address,
  price,
  reviewCount,
  showLove = false,
  love = false,
  onPress,
  onLovePress,
  isLoading = false,
  containerStyle,
  productId,
  isFavorite = false,
  userCarMakes,
}: Props) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  // Favorite API hook
  const toggleFavoriteMutation = useToggleFavorite();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleLovePress = async () => {
    // Trigger heart animation
    Animated.sequence([
      Animated.timing(heartAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Call custom onLovePress if provided, otherwise use API
    if (onLovePress) {
      onLovePress();
    } else if (productId) {
      try {
        await toggleFavoriteMutation.mutateAsync({
          productId: productId.toString(),
          isCurrentlyFavorited: isFavorite
        });

        // Show success toast
        if (isFavorite) {
          showToast.success('Removed from favorites');
        } else {
          showToast.success('Added to favorites');
        }
      } catch (error) {
        console.error('❌ Card favorite error:', error);
        showToast.error('Failed to update favorites. Please try again.');
      }
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to product detail page
      router.push({
        pathname: routes?.ProductDetail,
        params: {
          productId: productId,
          name: name,
          price: price || 0,
        },
      });
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        className={`w-full bg-white rounded-2xl overflow-hidden border border-gray-300 ${containerStyle}`}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={isLoading}
        style={{
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: {
              elevation: 1,
            },
          }),
        }}
      >
        {/* Image Container */}
        <View className="relative">
          <View className="w-full h-[160px] bg-gray-100 rounded-t-2xl justify-center items-center overflow-hidden">
            {isLoading ? (
              <View className="w-full h-full bg-gray-300 animate-pulse items-center justify-center">
                <CameraIcon size={48} color="#9CA3AF" />
              </View>
            ) : Images ? (
              typeof Images === "function" ? (
                <Images className="w-full h-full object-cover" />
              ) : (
                <Image
                  source={typeof Images === "string" ? { uri: Images } : Images}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <View className="w-full h-full items-center justify-center">
                <CameraIcon size={48} color="#9CA3AF" />
                <Text className="text-gray-400 text-xs mt-2 font-NunitoMedium">No Image</Text>
              </View>
            )}
          </View>

          {/* Love/Favorite Button */}
          {showLove && (
            <Animated.View
              style={{ transform: [{ scale: heartAnim }] }}
              className="absolute top-3 right-3"
            >
              <TouchableOpacity
                onPress={handleLovePress}
                disabled={toggleFavoriteMutation.isPending}
                className={`w-8 h-8 rounded-full items-center justify-center ${isFavorite ? 'bg-red-100' : 'bg-black/20'}`}
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
                      elevation: 1,
                    },
                  }),
                }}
              >
                {toggleFavoriteMutation.isPending ? (
                  <ActivityIndicator size="small" className="text-primary-500" />
                ) : isFavorite ? (
                  <HeartIcon
                    color="red"
                    size={20}
                    fill="red"
                  />
                ) : (
                  <HeartIcon
                    color="white"
                    size={20}
                    fill="none"
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Verified Badge */}
          {!!(rating && rating > 4.5) && (
            <View className="absolute top-3 left-3 bg-emerald-500/90 px-2 py-1 rounded-lg flex-row items-center shadow-sm">
              <CheckBadgeIconSolid size={14} color="white" />
              <Text className="text-[10px] font-NunitoExtraBold text-white ml-1 uppercase">Verified</Text>
            </View>
          )}
          {!!(userCarMakes?.length && name && userCarMakes.some(make => name.toLowerCase().includes(make.toLowerCase()))) && (
            <View className="absolute bottom-2 left-2 bg-blue-600/90 px-2 py-1 rounded-md flex-row items-center shadow-sm">
              <CheckIcon size={12} color="white" strokeWidth={3} />
              <Text className="text-[10px] font-NunitoExtraBold text-white ml-1 uppercase">Fits Your Car</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="p-3 space-y-2">
          {/* Title */}
          <Text
            className="text-base font-NunitoBold text-gray-900 leading-tight"
            numberOfLines={1}
          >
            {name || "Loading..."}
          </Text>

          {/* Rating */}
          {/* {rating && rating > 0 && (
            <View className="flex-row items-center space-x-1">
              <Rating rating={rating} size={12} />
              <Text className="text-sm font-NunitoMedium text-gray-700 ml-1">
                {rating.toFixed(1)} ({reviewCount || 0})
              </Text>
            </View>
          )} */}

          <View className="flex-row items-center space-x-1">
            <Rating rating={rating || 0} size={12} />
            <Text className="text-sm font-NunitoMedium text-gray-700 ml-1">
              {rating?.toFixed(1) || 0.0} ({reviewCount || 0})
            </Text>
          </View>

          {/* Address/Location */}
          {!!(address && typeof address === 'string') && (
            <View className="flex-row items-center bg-gray-50 rounded-lg px-2 py-1.5">
              <View className="w-4 h-4 bg-primary-100 rounded-full items-center justify-center mr-2">
                <Text className="text-xs text-primary-600">📍</Text>
              </View>
              <Text className="text-xs text-gray-600 font-NunitoMedium flex-1" numberOfLines={1}>
                {address}
              </Text>
            </View>
          )}

          {/* Price */}
          {/* Price and Cart Action */}
          {!!(price && price > 0) && (
            <View className="flex-row items-center justify-between pt-1">
              <NairaCurrency
                value={price}
                className="text-lg font-NunitoExtraBold text-primary-600"
              />
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View className="space-y-2">
              <View className="h-4 bg-gray-200 rounded animate-pulse" />
              <View className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              <View className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default Card1;
