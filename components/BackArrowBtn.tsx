import { Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { icons } from "@/constants";
import { router } from "expo-router";

const BackArrowBtn = ({ onPress, text, className }: { onPress?: () => void, text?: string, className?: string }) => {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          onPress();
        } else {
          router?.back();
        }
      }}
      className={`flex-row items-center ${className}`}
    >
      <View className="flex-row items-center justify-center w-12 h-12 bg-white rounded-full">
        <icons.backBtn />
      </View>
      {text && <Text className="text-gray-800 text-lg ml-2">{text}</Text>}
    </TouchableOpacity>
  );
};

export default BackArrowBtn;