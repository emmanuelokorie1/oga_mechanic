import React from 'react';
import { View, Text } from 'react-native';
import { StarIcon } from 'react-native-heroicons/solid';
import { ChartBarIcon } from 'react-native-heroicons/outline';

interface RatingData {
  stars: number;
  count: number;
  percentage: number;
  color: string;
}

interface CustomerReviewCardProps {
  totalReviews: string;
  averageRating: number;
  ratingData: RatingData[];
  title?: string;
}

const STAR_BAR_COLORS: Record<number, { bar: string; text: string }> = {
  5: { bar: '#22c55e', text: '#15803d' },
  4: { bar: '#3b82f6', text: '#1d4ed8' },
  3: { bar: '#a855f7', text: '#7e22ce' },
  2: { bar: '#f97316', text: '#c2410c' },
  1: { bar: '#ef4444', text: '#b91c1c' },
};

const CustomerReviewCard: React.FC<CustomerReviewCardProps> = ({
  totalReviews,
  averageRating,
  ratingData,
  title = "Customer's Review",
}) => {
  const total = parseInt(totalReviews);
  const roundedRating = Math.round(averageRating);

  return (
    <View
      className="bg-white rounded-2xl p-5 mb-6 border border-gray-200"
    >
      {/* Header */}
      <View className="flex-row items-center mb-5 gap-3">
        <View className="p-2 bg-red-50 rounded-xl items-center justify-center">
          <ChartBarIcon size={20} color="#D30309" />
        </View>
        <Text className="text-base font-NunitoBold text-gray-900">{title}</Text>
      </View>

      {/* Rating Summary */}
      <View className="flex-row items-center mb-5">
        {/* Score block */}
        <View className="mr-5 items-center">
          <Text
            style={{ fontSize: 40, fontFamily: 'NunitoExtraBold', color: '#0F172A', lineHeight: 44 }}
          >
            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
          </Text>
          {/* Star row */}
          <View className="flex-row mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                size={14}
                color={star <= roundedRating ? '#FBBF24' : '#E5E7EB'}
              />
            ))}
          </View>
          <Text className="text-[11px] text-gray-400 font-NunitoMedium mt-1 text-center">
            {total} {total === 1 ? 'review' : 'reviews'}
          </Text>
        </View>

        {/* Bar chart */}
        <View className="flex-1 gap-1.5">
          {ratingData.map((item) => {
            const colors = STAR_BAR_COLORS[item.stars] || { bar: '#94a3b8', text: '#64748b' };
            return (
              <View key={item.stars} className="flex-row items-center gap-2">
                {/* Star label */}
                <View className="flex-row items-center" style={{ width: 28 }}>
                  <StarIcon size={11} color="#FBBF24" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: 'NunitoBold',
                      color: '#374151',
                      marginLeft: 2,
                    }}
                  >
                    {item.stars}
                  </Text>
                </View>

                {/* Progress bar track */}
                <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      backgroundColor: colors.bar,
                      borderRadius: 99,
                      minWidth: item.percentage > 0 ? 4 : 0,
                    }}
                  />
                </View>

                {/* Count */}
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: 'NunitoSemiBold',
                    color: '#6B7280',
                    width: 20,
                    textAlign: 'right',
                  }}
                >
                  {item.count}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Empty state bar */}
      {total === 0 && (
        <View className="h-2 rounded-full bg-gray-100 mt-1" />
      )}
    </View>
  );
};

export default CustomerReviewCard;
