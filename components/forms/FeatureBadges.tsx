import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckIcon } from 'react-native-heroicons/outline';

interface FeatureBadgeProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const FeatureBadge: React.FC<FeatureBadgeProps> = ({ label, isSelected, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-center px-3.5 py-2 rounded-full border mr-2 mb-2.5 ${
        isSelected 
          ? 'bg-gray-100 border-gray-600' 
          : 'bg-white border-gray-200'
      }`}
      activeOpacity={0.75}
    >
      {isSelected && (
        <View className="mr-1.5">
          <CheckIcon size={12} color="#111827" strokeWidth={2.5} />
        </View>
      )}
      <Text className={`text-[13px] ${
        isSelected 
          ? 'text-gray-600 font-NunitoExtraBold' 
          : 'text-gray-500 font-NunitoMedium'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface FeatureBadgesProps {
  features: string[];
  selectedFeatures: string[];
  onFeatureToggle: (feature: string) => void;
  label?: string;
}

const FeatureBadges: React.FC<FeatureBadgesProps> = ({
  features,
  selectedFeatures,
  onFeatureToggle,
  label
}) => {
  return (
    <View className="mb-2">
      {label && (
        <Text className="text-[13px] text-gray-500 font-NunitoMedium mb-3 pl-0.5">
          {label}
        </Text>
      )}
      <View className="flex-row flex-wrap">
        {features.map((feature) => (
          <FeatureBadge
            key={feature}
            label={feature}
            isSelected={selectedFeatures.includes(feature)}
            onPress={() => onFeatureToggle(feature)}
          />
        ))}
      </View>
    </View>
  );
};

export default FeatureBadges;
