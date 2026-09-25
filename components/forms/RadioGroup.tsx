import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
  onValueChange,
  error,
  touched,
  required = false
}) => {
  const hasError = touched && error;

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-base font-NunitoSemiBold text-gray-700 mb-2">
          {label}
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </Text>
      )}
      <View className="flex-row items-center gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onValueChange(option.value)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl border-2 ${
                isSelected 
                  ? 'bg-primary-50 border-primary-500' 
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-2 ${
                isSelected ? 'border-primary-500' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                )}
              </View>
              <Text className={`text-[14px] font-NunitoSemiBold ${
                isSelected ? 'text-primary-900' : 'text-gray-600'
              }`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {hasError && (
        <View className="flex-row items-center mt-2">
          <View className="w-1 h-1 bg-red-500 rounded-full mr-2" />
          <Text className="text-md font-NunitoMedium text-red-500 flex-1">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

export default RadioGroup;
