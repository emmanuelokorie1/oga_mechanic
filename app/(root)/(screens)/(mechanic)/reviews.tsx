import React, { useState, useMemo } from "react";
import { View, ScrollView, Text, TouchableOpacity, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { ChevronLeftIcon, StarIcon } from "react-native-heroicons/solid";
import { ChatBubbleBottomCenterTextIcon, SparklesIcon } from "react-native-heroicons/outline";
import { LinearGradient } from "expo-linear-gradient";
import CustomerReviewCard from "@/components/CustomerReviewCard";
import { useMechanicAnalytics } from "@/hooks/useRepairRequests";
import { useGetMechanicReviews } from "@/hooks/useMechanics";
import { useActiveRoleProfile } from "@/hooks/useUserProfile";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";

interface TransformedReview {
  id: string;
  customerName: string;
  customerAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: '5', label: '5 ★' },
  { id: '4', label: '4 ★' },
  { id: '3', label: '3 ★' },
  { id: 'low', label: '1-2 ★' },
];

const MechanicReviews = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Active mechanic profile to get mechanic UUID
  const { primaryProfileData, data: roleProfileData } = useActiveRoleProfile();
  const mechanicUserId =
    primaryProfileData?.data?.user_id ||
    roleProfileData?.mechanic_profile?.user?.id ||
    roleProfileData?.user?.id ||
    '';

  // Fetch analytics for ratings
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    refetch: refetchAnalytics,
  } = useMechanicAnalytics(true);

  // Fetch individual reviews for this mechanic
  const {
    data: reviewsResponse,
    isLoading: isReviewsLoading,
    refetch: refetchReviews,
  } = useGetMechanicReviews(mechanicUserId);

  // Parse and transform reviews
  const reviews: TransformedReview[] = useMemo(() => {
    const raw = reviewsResponse?.data || (Array.isArray(reviewsResponse) ? reviewsResponse : []);
    if (!Array.isArray(raw)) return [];

    return raw.map((r: any) => {
      let customerName = 'Customer';
      let customerAvatar: string | null = null;

      if (r.user) {
        if (typeof r.user === 'string') {
          if (r.user.includes('@')) {
            const namePart = r.user.split('@')[0];
            customerName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          } else {
            customerName = 'Customer';
          }
        } else if (typeof r.user === 'object') {
          if (r.user.first_name || r.user.last_name) {
            customerName = `${r.user.first_name || ''} ${r.user.last_name || ''}`.trim();
          } else if (r.user.name) {
            customerName = r.user.name;
          } else if (r.user.email) {
            const namePart = r.user.email.split('@')[0];
            customerName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          }
          customerAvatar = r.user.profile_image || r.user.avatar || null;
        }
      }

      if (customerName === 'Customer' && (r.customer_name || r.customer?.name)) {
        customerName = r.customer_name || r.customer?.name;
      }

      return {
        id: r.id?.toString() || Math.random().toString(),
        customerName,
        customerAvatar,
        rating: Number(r.rating || 0),
        comment: r.comment || r.review || '',
        createdAt: r.created_at || r.createdAt || '',
      };
    });
  }, [reviewsResponse]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (selectedFilter === 'all') return reviews;
    if (selectedFilter === '5') return reviews.filter((r) => r.rating === 5);
    if (selectedFilter === '4') return reviews.filter((r) => r.rating === 4);
    if (selectedFilter === '3') return reviews.filter((r) => r.rating === 3);
    if (selectedFilter === 'low') return reviews.filter((r) => r.rating <= 2);
    return reviews;
  }, [reviews, selectedFilter]);

  // Compute rating data (from analytics or fallback from reviews list)
  const ratingData = useMemo(() => {
    const analyticsDist = analyticsData?.data?.ratings?.rating_distribution;
    const analyticsTotal = analyticsData?.data?.ratings?.total_reviews;

    if (analyticsDist && analyticsTotal !== undefined && analyticsTotal > 0) {
      return [
        { stars: 5, count: analyticsDist['5'] || 0, percentage: ((analyticsDist['5'] || 0) / analyticsTotal) * 100, color: 'bg-green-500' },
        { stars: 4, count: analyticsDist['4'] || 0, percentage: ((analyticsDist['4'] || 0) / analyticsTotal) * 100, color: 'bg-blue-500' },
        { stars: 3, count: analyticsDist['3'] || 0, percentage: ((analyticsDist['3'] || 0) / analyticsTotal) * 100, color: 'bg-purple-500' },
        { stars: 2, count: analyticsDist['2'] || 0, percentage: ((analyticsDist['2'] || 0) / analyticsTotal) * 100, color: 'bg-orange-500' },
        { stars: 1, count: analyticsDist['1'] || 0, percentage: ((analyticsDist['1'] || 0) / analyticsTotal) * 100, color: 'bg-red-500' },
      ];
    }

    // Fallback: derive distribution directly from reviews list
    const total = reviews.length;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });

    return [
      { stars: 5, count: counts[5], percentage: total > 0 ? (counts[5] / total) * 100 : 0, color: 'bg-green-500' },
      { stars: 4, count: counts[4], percentage: total > 0 ? (counts[4] / total) * 100 : 0, color: 'bg-blue-500' },
      { stars: 3, count: counts[3], percentage: total > 0 ? (counts[3] / total) * 100 : 0, color: 'bg-purple-500' },
      { stars: 2, count: counts[2], percentage: total > 0 ? (counts[2] / total) * 100 : 0, color: 'bg-orange-500' },
      { stars: 1, count: counts[1], percentage: total > 0 ? (counts[1] / total) * 100 : 0, color: 'bg-red-500' },
    ];
  }, [analyticsData, reviews]);

  const averageRating = useMemo(() => {
    if (analyticsData?.data?.ratings?.avg_rating !== undefined && analyticsData?.data?.ratings?.avg_rating !== null) {
      return Number(analyticsData.data.ratings.avg_rating);
    }
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }, [analyticsData, reviews]);

  const totalReviewsCount = useMemo(() => {
    if (analyticsData?.data?.ratings?.total_reviews !== undefined) {
      return Math.max(Number(analyticsData.data.ratings.total_reviews), reviews.length);
    }
    return reviews.length;
  }, [analyticsData, reviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAnalytics(), refetchReviews()]);
    } catch (_) {}
    setRefreshing(false);
  };

  const isLoading = (isAnalyticsLoading || isReviewsLoading) && !refreshing;

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_) {
      return isoString;
    }
  };

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
        <Text className="text-xl font-NunitoExtraBold text-gray-900">Customer Reviews</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D30309"
            colors={['#D30309']}
          />
        }
      >
        <AnimatedPageContainer animationType="fadeIn" duration={400}>
          {isLoading ? (
            <View className="py-20">
              <LoadingSpinner message="Loading customer reviews..." />
            </View>
          ) : (
            <View className="space-y-6">
              {/* Rating Overview Card */}
              <View>
                <CustomerReviewCard
                  title="Rating Overview"
                  totalReviews={String(totalReviewsCount)}
                  averageRating={averageRating}
                  ratingData={ratingData}
                />
              </View>

              {/* Filter Tabs */}
              <View className="mb-2">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 10 }}
                >
                  {FILTER_TABS.map((tab) => {
                    const isSelected = selectedFilter === tab.id;
                    const count = tab.id === 'all'
                      ? reviews.length
                      : tab.id === 'low'
                      ? reviews.filter((r) => r.rating <= 2).length
                      : reviews.filter((r) => r.rating === Number(tab.id)).length;

                    return (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => setSelectedFilter(tab.id)}
                        className={`mr-2.5 px-4 py-2 rounded-2xl border ${
                          isSelected
                            ? 'bg-primary-600 border-primary-600'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-NunitoBold ${
                            isSelected ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {tab.label} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Review Feed List */}
              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-NunitoExtraBold text-gray-900">
                    {selectedFilter === 'all'
                      ? 'All Customer Feedback'
                      : `Filtered Reviews (${filteredReviews.length})`}
                  </Text>
                  {reviews.length > 0 && (
                    <View className="flex-row items-center bg-gray-100 px-2.5 py-1 rounded-full">
                      <SparklesIcon size={12} color="#4B5563" />
                      <Text className="text-[11px] font-NunitoBold text-gray-600 ml-1">
                        Verified Clients
                      </Text>
                    </View>
                  )}
                </View>

                {filteredReviews.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center justify-center border border-gray-100 shadow-sm mt-2">
                    <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                      <ChatBubbleBottomCenterTextIcon size={32} color="#D30309" />
                    </View>
                    <Text className="text-gray-900 font-NunitoBold text-center text-lg mb-1">
                      {reviews.length === 0 ? "No Customer Reviews Yet" : "No Reviews in This Category"}
                    </Text>
                    <Text className="text-gray-400 font-NunitoMedium text-center text-xs px-6 leading-5">
                      {reviews.length === 0
                        ? "Completed repair requests will display feedback and star ratings from clients here."
                        : "Try selecting another star rating filter above to see customer comments."}
                    </Text>
                  </View>
                ) : (
                  filteredReviews.map((review) => (
                    <View
                      key={review.id}
                      className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-3"
                    >
                      {/* Customer Row */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                          {review.customerAvatar ? (
                            <Image
                              source={{ uri: review.customerAvatar }}
                              className="w-10 h-10 rounded-full mr-3 bg-gray-200"
                            />
                          ) : (
                            <LinearGradient
                              colors={["#D30309", "#991B1B"]}
                              className="w-10 h-10 rounded-full items-center justify-center mr-3"
                            >
                              <Text className="text-white font-NunitoBold text-sm">
                                {review.customerName.charAt(0).toUpperCase()}
                              </Text>
                            </LinearGradient>
                          )}
                          <View>
                            <Text className="text-sm font-NunitoBold text-gray-900">
                              {review.customerName}
                            </Text>
                            <Text className="text-[11px] font-NunitoMedium text-gray-400">
                              {formatDate(review.createdAt)}
                            </Text>
                          </View>
                        </View>

                        {/* Star Rating Badge */}
                        <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                          <StarIcon size={14} color="#FBBF24" />
                          <Text className="text-xs font-NunitoBold text-amber-800 ml-1">
                            {review.rating.toFixed(1)}
                          </Text>
                        </View>
                      </View>

                      {/* Stars Row */}
                      <View className="flex-row items-center mb-2.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            size={14}
                            color={star <= review.rating ? "#FBBF24" : "#E5E7EB"}
                          />
                        ))}
                      </View>

                      {/* Comment */}
                      {review.comment ? (
                        <Text className="text-sm font-NunitoMedium text-gray-700 leading-6 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                          "{review.comment}"
                        </Text>
                      ) : (
                        <Text className="text-xs font-Nunito italic text-gray-400">
                          No written comment provided.
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </AnimatedPageContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MechanicReviews;
