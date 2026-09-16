import React from "react";
import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { ChevronLeftIcon } from "react-native-heroicons/solid";
import CustomerReviewCard from "@/components/CustomerReviewCard";
import { useMechanicAnalytics } from "@/hooks/useRepairRequests";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";

const MechanicReviews = () => {
  // Fetch analytics for ratings
  const { data: analyticsData, isLoading } = useMechanicAnalytics(true);

  const ratingData = (() => {
    const distribution = analyticsData?.data?.ratings?.rating_distribution || {};
    const total = analyticsData?.data?.ratings?.total_reviews || 0;
    return [
      { stars: 5, count: distribution['5'] || 0, percentage: total > 0 ? ((distribution['5'] || 0) / total) * 100 : 0, color: 'bg-green-500' },
      { stars: 4, count: distribution['4'] || 0, percentage: total > 0 ? ((distribution['4'] || 0) / total) * 100 : 0, color: 'bg-blue-500' },
      { stars: 3, count: distribution['3'] || 0, percentage: total > 0 ? ((distribution['3'] || 0) / total) * 100 : 0, color: 'bg-purple-500' },
      { stars: 2, count: distribution['2'] || 0, percentage: total > 0 ? ((distribution['2'] || 0) / total) * 100 : 0, color: 'bg-orange-500' },
      { stars: 1, count: distribution['1'] || 0, percentage: total > 0 ? ((distribution['1'] || 0) / total) * 100 : 0, color: 'bg-red-500' },
    ];
  })();
  
  const averageRating = analyticsData?.data?.ratings?.avg_rating ?? 0;
  const totalReviews = String(analyticsData?.data?.ratings?.total_reviews || 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full"
        >
          <ChevronLeftIcon size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-NunitoExtraBold text-gray-900">My Reviews</Text>
        <View className="w-10" /> {/* Balance for centering */}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <AnimatedPageContainer animationType="fadeIn" duration={400}>
          {isLoading ? (
            <View className="py-10">
              <LoadingSpinner message="Loading reviews..." />
            </View>
          ) : (
            <View className="space-y-6">
              {/* Summary Card */}
              <View className="mb-4">
                <Text className="text-lg font-NunitoBold text-gray-900 mb-3">Rating Overview</Text>
                <CustomerReviewCard
                  totalReviews={totalReviews}
                  averageRating={averageRating}
                  ratingData={ratingData}
                />
              </View>

              {/* Placeholder for individual reviews list */}
              <View className="bg-white rounded-2xl p-6 items-center justify-center border border-gray-100 shadow-sm mt-4">
                <Text className="text-gray-400 font-NunitoMedium text-center mb-1 text-base">
                  Individual reviews list
                </Text>
                <Text className="text-gray-300 font-Nunito text-center text-xs">
                  Detailed review feed will appear here
                </Text>
              </View>
            </View>
          )}
        </AnimatedPageContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MechanicReviews;
