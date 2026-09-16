import React from 'react';
import { View, Text, Switch } from 'react-native';

interface ScheduleToggleProps {
  isScheduled: boolean;
  onToggle: (value: boolean) => void;
}

/**
 * Reusable toggle component for scheduling bookings
 */
export const ScheduleToggle: React.FC<ScheduleToggleProps> = ({ isScheduled, onToggle }) => {
  return (
    <View className="flex-row items-center justify-between mb-4 mt-2 bg-gray-50 p-5 rounded-2xl border border-gray-100">
      <View className="flex-1 mr-4">
        <Text className="text-base font-NunitoExtraBold text-gray-900">Schedule for later</Text>
        <Text className="text-[13px] font-NunitoMedium text-gray-500 mt-1 leading-5">
          Book a mechanic for a future date
        </Text>
      </View>
      <Switch
        value={isScheduled}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: '#D30309' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
};
