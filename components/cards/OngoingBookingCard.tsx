import React from 'react';
import { View, Text, Image } from 'react-native';
import { icons } from '@/constants';

interface OngoingBookingCardProps {
  id: number;
  count: number;
  type: string;
  timeRemaining: string;
  dateTime: string;
}

const OngoingBookingCard: React.FC<OngoingBookingCardProps> = ({
  count,
  type,
  timeRemaining,
  dateTime
}) => {
  return (
    <View className="bg-white p-4 rounded-xl shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="items-center justify-center mr-3">
            <Image source={icons.carRent} style={{ width: 50, height: 50 }} resizeMode="contain" />
          </View>
          <View>
            <Text className="font-semibold text-lg text-gray-900">{type}</Text>
            <Text className="text-sm text-gray-500">{timeRemaining}</Text>
          </View>
        </View>
        <Text className="text-green-700 text-sm font-medium">{dateTime}</Text>
      </View>
    </View>
  );
};

export default OngoingBookingCard;
