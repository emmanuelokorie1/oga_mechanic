import React, { memo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator, Image } from "react-native";
import { NairaCurrency } from "@/utils/useCurrencyFormatter";
import { TrashIcon, CheckIcon, PlusIcon, MinusIcon, PhotoIcon } from "react-native-heroicons/outline";
import { useImageValidator, getImageSource } from "@/hooks/useImageValidator";

// Image Skeleton with shimmer effect
const ImageSkeleton = memo(() => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={{
        opacity: shimmerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 0.8],
        }),
      }}
      className="absolute inset-0 bg-gray-200 rounded-xl"
    />
  );
});

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image: any;
  originalPrice?: number;
  discount?: number;
}

interface CartItemCardProps {
  item: CartItem;
  index: number;
  isSelected?: boolean;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  bounceAnim: Animated.Value;
  isLoading?: boolean;
  onSelect?: (id: number) => void;
  onRemove: (id: number) => void;
  onUpdateQuantity: (id: number, change: number) => void;
  onPress?: () => void;
}

const CartItemCard = memo(({
  item,
  index,
  isSelected = false,
  fadeAnim,
  slideAnim,
  bounceAnim,
  isLoading = false,
  onSelect,
  onRemove,
  onUpdateQuantity,
  onPress,
}: CartItemCardProps) => {
  // Use the image validator hook to find a valid image
  const { validImage, isLoading: imageLoading, isValid } = useImageValidator(item.image);

  return (
  <Animated.View
    style={{
      opacity: fadeAnim,
      transform: [{ translateX: slideAnim }],
    }}
    className="mx-5 mb-2 border border-gray-200 rounded-xl"
  >
    <View
      className="bg-white rounded-xl overflow-hidden"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center p-3">
        {/* Select Button - only show if onSelect is provided */}
        {onSelect && (
          <TouchableOpacity
            onPress={() => onSelect(item.id)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: isSelected ? "#111" : "#fff",
              borderWidth: 2,
              borderColor: "#111",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            {isSelected && <CheckIcon size={14} color="#fff" />}
          </TouchableOpacity>
        )}

        {/* Clickable Product Section */}
        <TouchableOpacity 
          onPress={onPress}
          className="flex-1 flex-row items-center"
          activeOpacity={0.7}
          disabled={!onPress}
        >
          {/* Product Image */}
          <View className="w-[70px] rounded-xl h-[80px] mr-3 bg-gray-100 overflow-hidden">
            {imageLoading ? (
              <ImageSkeleton />
            ) : !isValid || !validImage ? (
              <View className="w-full h-full items-center justify-center">
                <PhotoIcon size={24} color="#9CA3AF" />
              </View>
            ) : (
              <Image
                source={getImageSource(validImage)!}
                style={{
                  width: 70,
                  height: 80,
                }}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Product Info */}
          <View className="flex-1 mr-2">
            <Text
              className="text-sm font-NunitoBold text-gray-900 mb-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <Text className="text-xs text-green-600 font-NunitoMedium">
              ✓ {item.stock} in stock
            </Text>

            {/* Price */}
            <View className="flex-row items-center mt-1">
              <NairaCurrency
                value={item.price}
                className="text-sm font-NunitoBold text-gray-900"
              />
              {item.originalPrice && (
                <Text className="text-xs text-gray-400 line-through ml-2">
                  ₦{item.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Controls */}
        <View className="items-end" pointerEvents={isLoading ? 'none' : 'auto'}>
          {/* Remove Button */}
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            className="w-8 h-8 bg-red-50 rounded-full items-center justify-center mb-5"
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.5 : 1 }}
            activeOpacity={0.7}
          >
            <TrashIcon size={18} color="#EF4444" />
          </TouchableOpacity>

          {/* Quantity Controls */}
          <Animated.View
            style={{ transform: [{ scale: bounceAnim }] }}
            pointerEvents={isLoading ? 'none' : 'auto'}
          >
            <View className="flex-row items-center bg-gray-100 rounded-full">
              <TouchableOpacity
                onPress={() => onUpdateQuantity(item.id, -1)}
                className="w-8 h-8 bg-gray-400 rounded-full items-center justify-center"
                disabled={item.quantity <= 1 || isLoading}
                style={{ opacity: item.quantity <= 1 || isLoading ? 0.5 : 1 }}
                activeOpacity={0.7}
              >
                <MinusIcon color={"#fff"} size={16} />
              </TouchableOpacity>

              <View className="mx-3 min-w-[20px] items-center justify-center">
                {isLoading ? (
                  <ActivityIndicator size="small" color="#D30309" />
                ) : (
                  <Text className="text-sm font-NunitoBold text-gray-900 text-center">
                    {item.quantity}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => onUpdateQuantity(item.id, 1)}
                className="w-8 h-8 bg-primary-500 rounded-full items-center justify-center"
                disabled={item.quantity >= item.stock || isLoading}
                style={{ opacity: item.quantity >= item.stock || isLoading ? 0.5 : 1 }}
                activeOpacity={0.7}
              >
                <PlusIcon color={"#fff"} size={16} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  </Animated.View>
  );
});

export default CartItemCard; 
