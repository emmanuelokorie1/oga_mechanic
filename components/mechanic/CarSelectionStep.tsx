import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircleIcon, FolderIcon, PlusCircleIcon } from 'react-native-heroicons/solid';

interface CarSelectionStepProps {
  carSelection: 'Yes' | 'No' | null;
  onSelectYes: () => void;
  onSelectNo: () => void;
}

/**
 * Step 1: Car selection UI component
 * Displays stacked horizontal rows for vehicle selection
 */
export const CarSelectionStep: React.FC<CarSelectionStepProps> = ({
  carSelection,
  onSelectYes,
  onSelectNo,
}) => {
  return (
    <View className="mb-6 px-1">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-NunitoExtraBold text-gray-900 mb-1.5">
          Select a Vehicle
        </Text>
        <Text className="text-sm text-gray-500 font-NunitoMedium leading-5">
          Choose a saved vehicle from your profile or add a new one for this request.
        </Text>
      </View>

      {/* Stacked Rows Container */}
      <View className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
        {/* No Option Row */}
        <TouchableOpacity
          onPress={onSelectNo}
          activeOpacity={0.7}
          className={`flex-row items-center justify-between p-6 border-b border-gray-100 ${
            carSelection === 'No' ? 'bg-[#D30309]/5' : 'bg-transparent'
          }`}
        >
          <View className="flex-row items-center flex-1 pr-4">
            <View className={`w-14 h-14 rounded-[20px] items-center justify-center mr-5 ${
              carSelection === 'No' ? 'bg-[#D30309]/10' : 'bg-gray-50'
            }`}>
              <PlusCircleIcon size={26} color={carSelection === 'No' ? "#D30309" : "#9CA3AF"} />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-NunitoExtraBold mb-1 ${
                carSelection === 'No' ? 'text-gray-900' : 'text-gray-700'
              }`}>
                Enter Vehicle Details
              </Text>
              <Text className="text-[13px] font-NunitoMedium text-gray-500 leading-5">
                Provide info for this specific request
              </Text>
            </View>
          </View>
          
          {/* Radio Indicator */}
          {carSelection === 'No' ? (
            <CheckCircleIcon size={28} color="#D30309" />
          ) : (
            <View className="w-6 h-6 rounded-full border-2 border-gray-200" />
          )}
        </TouchableOpacity>

        {/* Yes Option Row */}
        <TouchableOpacity
          onPress={onSelectYes}
          activeOpacity={0.7}
          className={`flex-row items-center justify-between p-6 ${
            carSelection === 'Yes' ? 'bg-[#D30309]/5' : 'bg-transparent'
          }`}
        >
          <View className="flex-row items-center flex-1 pr-4">
            <View className={`w-14 h-14 rounded-[20px] items-center justify-center mr-5 ${
              carSelection === 'Yes' ? 'bg-[#D30309]/10' : 'bg-gray-50'
            }`}>
              <FolderIcon size={26} color={carSelection === 'Yes' ? "#D30309" : "#9CA3AF"} />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-NunitoExtraBold mb-1 ${
                carSelection === 'Yes' ? 'text-gray-900' : 'text-gray-700'
              }`}>
                Saved Vehicles
              </Text>
              <Text className="text-[13px] font-NunitoMedium text-gray-500 leading-5">
                Select a car from your garage
              </Text>
            </View>
          </View>
          
          {/* Radio Indicator */}
          {carSelection === 'Yes' ? (
            <CheckCircleIcon size={28} color="#D30309" />
          ) : (
            <View className="w-6 h-6 rounded-full border-2 border-gray-200" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};