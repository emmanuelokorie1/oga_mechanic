import React from "react";
import { View, Text } from "react-native";
import { NairaCurrency } from "@/utils/useCurrencyFormatter";

interface ProductInfoCardProps {
  name: string;
  price: number | string;
  stock: number;
  purchasedCount?: number;
}

const ProductInfoCard: React.FC<ProductInfoCardProps> = ({
  name,
  price,
  stock,
  purchasedCount,
}) => {
  const isInStock = stock > 0;

  return (
    <View
      className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Product Name */}
      <Text className="text-xl font-NunitoExtraBold text-gray-900 mb-3 leading-7">
        {name}
      </Text>

      {/* Price and Stock */}
      <View className="flex-row items-center justify-between mb-4">
        <NairaCurrency
          value={typeof price === 'string' ? parseFloat(price) : price}
          className="text-2xl font-NunitoExtraBold text-primary-500"
        />
        <View
          className={`flex-row items-center px-3 py-1.5 rounded-full ${
            isInStock ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <View
            className={`w-2 h-2 rounded-full mr-2 ${
              isInStock ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <Text
            className={`text-sm font-NunitoBold ${
              isInStock ? "text-green-700" : "text-red-700"
            }`}
          >
            {isInStock ? "In Stock" : "Out of Stock"}
          </Text>
        </View>
      </View>

      {/* Stock Details */}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500">Available:</Text>
          <Text className="text-sm font-NunitoBold text-gray-900 ml-1">
            {stock} units
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500">Sold:</Text>
          <Text className="text-sm font-NunitoBold text-gray-900 ml-1">
            {purchasedCount || 0}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ProductInfoCard;

