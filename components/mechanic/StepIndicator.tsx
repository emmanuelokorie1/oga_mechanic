import React from 'react';
import { View, Text } from 'react-native';
import { CheckIcon } from 'react-native-heroicons/outline';

interface StepIndicatorProps {
  currentStep: 1 | 2;
  hasCarList: boolean;
}

/**
 * Step indicator component showing progress through the form
 * Only displayed when user has a car list
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, hasCarList }) => {
  if (!hasCarList) return null;

  return (
    <View className="flex-row items-center justify-center mb-8 mt-2">
      <View className="flex-row items-center">
        {/* Step 1 Node */}
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            currentStep >= 1 ? 'bg-[#D30309]' : 'bg-gray-100'
          }`}
        >
          {currentStep > 1 ? (
            <CheckIcon size={20} color="#FFFFFF" strokeWidth={3} />
          ) : (
            <Text
              className={`text-base font-NunitoExtraBold ${
                currentStep >= 1 ? 'text-white' : 'text-gray-400'
              }`}
            >
              1
            </Text>
          )}
        </View>
        
        {/* Progress Line */}
        <View className="w-16 h-[3px] mx-2 bg-gray-100 overflow-hidden rounded-full">
          <View 
            className={`h-full rounded-full ${currentStep >= 2 ? 'bg-[#D30309] w-full' : 'bg-transparent w-0'}`}
          />
        </View>

        {/* Step 2 Node */}
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            currentStep >= 2 ? 'bg-[#D30309]' : 'bg-gray-100'
          }`}
        >
          <Text
            className={`text-base font-NunitoExtraBold ${
              currentStep >= 2 ? 'text-white' : 'text-gray-400'
            }`}
          >
            2
          </Text>
        </View>
      </View>
    </View>
  );
};
