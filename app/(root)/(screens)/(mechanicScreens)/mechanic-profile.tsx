import { useState } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  IdentificationIcon,
  PhoneIcon,
  StarIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon
} from "react-native-heroicons/outline";
import { StarIcon as StarIconSolid } from "react-native-heroicons/solid";
import BackArrowBtn from "@/components/BackArrowBtn";
import CustomButton from "@/components/CustomButton";
import { routes } from "@/constants/routes";
import { useGetMechanicDetail, useGetMechanicReviews } from "@/hooks/useMechanics";
import { getApiErrorMessage } from "@/utils/errorMessages";
import LoadingSpinner from "@/components/LoadingSpinner";
import AndroidNavBarSpacer from "@/components/AndroidNavBarSpacer";
import Rating from "@/components/Rating";

interface VehicleMake {
  id: number;
  name: string;
  models: {
    id: number;
    name: string;
  }[];
}

interface VehicleExpertise {
  id: number;
  vehicle_make: VehicleMake;
  years_of_experience: number;
  certification_level: string;
}

interface MechanicProfile {
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  image: any;
  bio: string;
  specialty: string[];
  vehicleExpertise: VehicleExpertise[];
  yearsOfExperience: number;
  locationCoverage: string;
  languages: string[];
  availability: string;
  paymentMethods: string[];
  isVip?: boolean;
  isOnline?: boolean;
  isVerified?: boolean;
  phoneNumber?: string;
  ninNumber?: string;
  cacNumber?: string;
}

const MechanicProfile = () => {
  const params = useLocalSearchParams();
  const mechanicId = params.mechanicId as string;
  const [showReviews, setShowReviews] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch mechanic details from API
  const {
    data: mechanicData,
    isLoading,
    error,
    refetch: refetchMechanic
  } = useGetMechanicDetail(mechanicId);

  // Fetch mechanic reviews from API
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews
  } = useGetMechanicReviews(mechanicId);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMechanic(), refetchReviews()]);
    setRefreshing(false);
  };

  // Transform API data to component format
  const mechanic: MechanicProfile = (() => {
    if (!mechanicData?.data) {
      return {
        id: 0,
        name: "Loading...",
        rating: 0,
        reviewCount: 0,
        image: null,
        bio: "",
        specialty: [],
        vehicleExpertise: [],
        yearsOfExperience: 0,
        locationCoverage: "",
        languages: [],
        availability: "",
        paymentMethods: [],
        isOnline: false,
      };
    }

    const apiMechanic = mechanicData.data;
    
    // Get review count from reviews data
    const reviewsArray = reviewsData?.data || (Array.isArray(reviewsData) ? reviewsData : []);
    const reviewCount = Array.isArray(reviewsArray) ? reviewsArray.length : 0;
    
    // Calculate total years of experience from expertise if available
    const totalExperience = Array.isArray(apiMechanic.vehicle_expertise) 
      ? apiMechanic.vehicle_expertise.reduce((acc: number, curr: any) => acc + (curr.years_of_experience || 0), 0)
      : 0;

    return {
      id: apiMechanic.id || 0,
      name: apiMechanic.user ? `${apiMechanic.user.first_name} ${apiMechanic.user.last_name}`.trim() : "Unknown Mechanic",
      rating: apiMechanic.rating || 0,
      reviewCount: reviewCount,
      image: apiMechanic.selfie || null,
      bio: apiMechanic.bio || "",
      specialty: Array.isArray(apiMechanic.specializations) ? apiMechanic.specializations.map((s: any) => s.name || s) : [],
      vehicleExpertise: Array.isArray(apiMechanic.vehicle_expertise) ? apiMechanic.vehicle_expertise : [],
      yearsOfExperience: totalExperience,
      locationCoverage: apiMechanic.location || "",
      languages: [], 
      availability: "", 
      paymentMethods: [], 
      isOnline: apiMechanic.is_approved || false,
      isVerified: apiMechanic.is_approved || false,
      phoneNumber: apiMechanic.user?.phone_number || "",
      ninNumber: apiMechanic.nin_number || "",
      cacNumber: apiMechanic.cac_number || "",
    };
  })();

  // Transform reviews data
  const reviews = (() => {
    if (!reviewsData) return [];
    
    const reviewsArray = reviewsData?.data || (Array.isArray(reviewsData) ? reviewsData : []);
    if (!Array.isArray(reviewsArray)) return [];
    
    return reviewsArray.map((review: any) => {
      // Extract customer name from user email or use fallback
      let customerName = 'Customer';
      if (review.user) {
        if (typeof review.user === 'string') {
          // If user is an email string, extract name from email (part before @)
          const emailParts = review.user.split('@');
          customerName = emailParts[0] || 'Customer';
          // Capitalize first letter
          customerName = customerName.charAt(0).toUpperCase() + customerName.slice(1);
        } else if (review.user?.first_name) {
          customerName = review.user.first_name;
        }
      }
      
      // Fallback to other possible fields
      if (customerName === 'Customer') {
        customerName = review.customer_name || review.customer?.name || 'Customer';
      }
      
      return {
        id: review.id?.toString() || '',
        customerName: customerName,
        rating: review.rating || 0,
        comment: review.comment || review.review || '',
        createdAt: review.created_at || review.createdAt || '',
      };
    });
  })();

  const handleOrderPress = () => {
    router.push({
      pathname: routes.orderMechanic,
      params: {
        mechanicId: mechanicData?.data?.user?.id || '',
        mechanicName: mechanic.name,
        mechanicRating: mechanic.rating,
        mechanicImage: mechanic.image,
      },
    });
  };

  const InfoSection = ({
    title,
    content,
  }: {
    title: string;
    content: string | string[];
  }) => (
    <View className="mb-6">
      <Text className="text-lg font-NunitoBold text-gray-900 mb-2">
        {title}
      </Text>
      {Array.isArray(content) ? (
        <Text className="text-base font-NunitoMedium text-gray-600 leading-6">
          {content.join(" | ")}
        </Text>
      ) : (
        <Text className="text-base font-NunitoMedium text-gray-600 leading-6">
          {content}
        </Text>
      )}
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <LoadingSpinner
        message="Loading Mechanic Profile..."
        subMessage="Please wait while we fetch the information"
        size="medium"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900">
            Mechanics Profile
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-center text-lg mb-4">
            {getApiErrorMessage(error)}
          </Text>
          <Text className="text-gray-600 text-center">
            Failed to load mechanic details
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50">
        <BackArrowBtn />
        <Text className="text-xl font-NunitoBold text-gray-900">
          Profile
        </Text>
        <TouchableOpacity 
          onPress={() => {/* Share logic */}}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
        >
          <ChatBubbleLeftRightIcon size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
      >
        {/* Profile Hero Section */}
        <View className="px-5 py-8 bg-gray-50/50">
          <View className="items-center">
            {/* Profile Image with Status */}
            <View className="relative mb-4">
              <View className="w-28 h-28 rounded-3xl overflow-hidden bg-gray-200 border-4 border-white shadow-sm">
                {mechanic.image ? (
                  <Image
                    source={{ uri: mechanic.image }}
                    style={{ width: 112, height: 112 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full bg-gray-300 items-center justify-center">
                    <Text className="text-gray-500 text-4xl">👤</Text>
                  </View>
                )}
              </View>
              {mechanic.isOnline && (
                <View className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white items-center justify-center shadow-sm">
                  <View className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                </View>
              )}
            </View>

            {/* Name & Title */}
            <View className="items-center">
              <View className="flex-row items-center mb-1">
                <Text className="text-2xl font-NunitoExtraBold text-gray-900">
                  {mechanic.name}
                </Text>
                {mechanic.isVerified && (
                  <CheckBadgeIcon size={24} color="#059669" className="ml-2" />
                )}
              </View>
              <Text className="text-sm font-NunitoSemiBold text-gray-500 uppercase tracking-wider">
                Professional Mechanic
              </Text>
            </View>
          </View>

          {/* Quick Stats Bar */}
          <View className="flex-row mt-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <View className="flex-1 items-center border-r border-gray-50">
              <View className="flex-row items-center mb-1">
                <StarIconSolid size={16} color="#FBBF24" />
                <Text className="text-base font-NunitoBold text-gray-900 ml-1">
                  {mechanic.rating.toFixed(1)}
                </Text>
              </View>
              <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase">Rating</Text>
            </View>
            
            <View className="flex-1 items-center border-r border-gray-50">
              <Text className="text-base font-NunitoBold text-gray-900 mb-1">
                {mechanic.yearsOfExperience}+
              </Text>
              <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase">Exp (Yrs)</Text>
            </View>

            <View className="flex-1 items-center">
              <Text className="text-base font-NunitoBold text-gray-900 mb-1">
                {mechanic.reviewCount}
              </Text>
              <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase">Reviews</Text>
            </View>
          </View>
        </View>

        {/* Content Sections */}
        <View className="px-5 py-6">
          {/* Bio Section */}
          {mechanic.bio && (
            <View className="mb-8">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center mr-3">
                  <IdentificationIcon size={18} color="#D30309" />
                </View>
                <Text className="text-lg font-NunitoBold text-gray-900">About Mechanic</Text>
              </View>
              <Text className="text-base font-NunitoMedium text-gray-600 leading-7">
                {mechanic.bio}
              </Text>
            </View>
          )}

          {/* Vehicle Expertise Section */}
          {mechanic.vehicleExpertise.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3">
                  <BriefcaseIcon size={18} color="#2563EB" />
                </View>
                <Text className="text-lg font-NunitoBold text-gray-900">Vehicle Expertise</Text>
              </View>
              <View className="space-y-4">
                {mechanic.vehicleExpertise.map((exp) => (
                  <View key={exp.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3">
                          <Text className="text-lg">🚗</Text>
                        </View>
                        <Text className="text-base font-NunitoBold text-gray-900">
                          {exp.vehicle_make.name}
                        </Text>
                      </View>
                      <View className="bg-green-50 px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-NunitoBold text-green-700 uppercase">
                          {exp.certification_level}
                        </Text>
                      </View>
                    </View>
                    
                    {exp.vehicle_make.models && exp.vehicle_make.models.length > 0 && (
                      <View className="flex-row flex-wrap gap-2 mb-3">
                        {exp.vehicle_make.models.map((model) => (
                          <View key={model.id} className="bg-gray-50 px-3 py-1.5 rounded-xl">
                            <Text className="text-xs font-NunitoBold text-gray-500">
                              {model.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    <View className="flex-row items-center pt-2 border-t border-gray-50">
                      <StarIcon size={14} color="#6B7280" />
                      <Text className="text-xs font-NunitoSemiBold text-gray-400 ml-1">
                        {exp.years_of_experience} years specialized experience
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Specialty Tags */}
          {mechanic.specialty.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-purple-50 items-center justify-center mr-3">
                  <AcademicCapIcon size={18} color="#7C3AED" />
                </View>
                <Text className="text-lg font-NunitoBold text-gray-900">Specializations</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {mechanic.specialty.map((tag, idx) => (
                  <View key={idx} className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                    <Text className="text-sm font-NunitoSemiBold text-gray-600">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Location & Contact */}
          <View className="bg-gray-900 rounded-3xl p-6 mb-8 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
            
            <View className="flex-row items-start mb-6">
              <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-4">
                <MapPinIcon size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white/60 text-xs font-NunitoBold uppercase mb-1">Primary Location</Text>
                <Text className="text-white text-base font-NunitoSemiBold leading-6">
                  {mechanic.locationCoverage || "Lagos, Nigeria"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-4">
                <IdentificationIcon size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white/60 text-xs font-NunitoBold uppercase mb-1">Verification Details</Text>
                <Text className="text-white text-base font-NunitoSemiBold">
                  {mechanic.cacNumber ? `CAC: ${mechanic.cacNumber}` : `NIN: Verified`}
                </Text>
              </View>
            </View>
          </View>

          {/* Reviews Section */}
          <View className="border-t border-gray-100 pt-8">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-NunitoExtraBold text-gray-900">
                Client Reviews
              </Text>
              <View className="bg-gray-50 px-3 py-1 rounded-full">
                <Text className="text-xs font-NunitoBold text-gray-500">
                  {reviews.length} Total
                </Text>
              </View>
            </View>

            {reviewsLoading ? (
              <ActivityIndicator color="#D30309" />
            ) : reviews.length === 0 ? (
              <View className="py-10 items-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <ChatBubbleLeftRightIcon size={32} color="#D1D5DB" />
                <Text className="text-gray-400 mt-2 font-NunitoMedium">No reviews yet</Text>
              </View>
            ) : (
              <View className="space-y-4">
                {(showReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                  <View key={review.id} className="bg-white rounded-2xl p-5 border border-gray-50 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                          <Text className="text-xs">👤</Text>
                        </View>
                        <Text className="text-sm font-NunitoBold text-gray-900">
                          {review.customerName}
                        </Text>
                      </View>
                      <Rating rating={review.rating} size={12} />
                    </View>
                    <Text className="text-sm font-NunitoMedium text-gray-600 leading-6">
                      "{review.comment}"
                    </Text>
                    <Text className="text-[10px] font-NunitoBold text-gray-300 mt-4 uppercase">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}

                {reviews.length > 3 && (
                  <TouchableOpacity
                    onPress={() => setShowReviews(!showReviews)}
                    className="mt-3 py-3 bg-gray-50 rounded-2xl items-center border border-gray-100"
                  >
                    <Text className="text-xs font-NunitoBold text-primary-600">
                      {showReviews ? 'Show Fewer Reviews' : `View All ${reviews.length} Reviews`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-gray-50 px-5 pt-4 pb-10" style={{ backdropFilter: 'blur(10px)' }}>
        <View className="flex-row items-center">
          
          <View className="flex-1">
            <CustomButton
              title="Book Mechanic"
              onPress={handleOrderPress}
              className=""
            />
          </View>
        </View>
        <AndroidNavBarSpacer />
      </View>
    </SafeAreaView>
  );
};

export default MechanicProfile;
