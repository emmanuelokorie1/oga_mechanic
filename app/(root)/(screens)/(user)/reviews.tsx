import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ChevronLeftIcon, StarIcon, TrashIcon } from 'react-native-heroicons/solid';
import { PencilSquareIcon, ChatBubbleBottomCenterTextIcon, CheckCircleIcon, SparklesIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserRepairRequests } from '@/hooks/useRepairRequests';
import { useGetMechanicReviews, useUpdateMechanicReview, useDeleteMechanicReview, useCreateMechanicReview } from '@/hooks/useMechanics';
import { usePrimaryUserProfile } from '@/hooks/useUserProfile';
import { useVehicleMakes } from '@/hooks/useVehicleMakes';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { resolveServiceDisplayName, isIdLike } from '@/utils/serviceUtils';
import MechanicReviewModal from '@/components/modals/MechanicReviewModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import AnimatedPageContainer from '@/components/AnimatedPageContainer';
import CustomAlert from '@/components/CustomAlert';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { getApiErrorMessage } from '@/utils/errorMessages';

interface ReviewTarget {
  mechanicId: string;
  mechanicName: string;
  reviewId?: string;
  rating?: number;
  comment?: string;
  isEdit: boolean;
}

const UserReviews = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeModalTarget, setActiveModalTarget] = useState<ReviewTarget | null>(null);

  const { visible: alertVisible, alertConfig, hideAlert, showError, showSuccess } = useCustomAlert();

  // Primary user profile
  const { data: primaryProfileData } = usePrimaryUserProfile();
  const currentUserId = primaryProfileData?.data?.user_id;
  const currentUserEmail = primaryProfileData?.data?.email;

  // Repair requests for this user
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useUserRepairRequests();

  // Mutations
  const createReviewMutation = useCreateMechanicReview();
  const updateReviewMutation = useUpdateMechanicReview();
  const deleteReviewMutation = useDeleteMechanicReview();

  // Vehicle makes and service types
  const { data: vehicleMakes } = useVehicleMakes();
  const { serviceTypes } = useServiceTypes();

  const getMakeName = (makeId: string | number) => {
    if (!makeId) return '';
    if (typeof makeId === 'string' && !isIdLike(makeId)) return makeId;
    if (!vehicleMakes) return '';
    const make = vehicleMakes.find(
      (m) => m.id.toString() === makeId.toString() || m.name?.toLowerCase() === makeId.toString().toLowerCase()
    );
    return make?.name || '';
  };

  const getModelName = (makeId: string | number, modelId: string | number) => {
    if (!modelId) return '';
    if (typeof modelId === 'string' && !isIdLike(modelId)) return modelId;
    if (!vehicleMakes) return '';
    const make = vehicleMakes.find(
      (m) => m.id.toString() === makeId?.toString() || m.name?.toLowerCase() === makeId?.toString().toLowerCase()
    );
    const model = make?.models?.find(
      (m) => m.id.toString() === modelId.toString() || m.name?.toLowerCase() === modelId.toString().toLowerCase()
    );
    return model?.name || '';
  };

  // Completed or verified orders with a mechanic assigned
  const eligibleOrders = useMemo(() => {
    const list = ordersData?.data || (Array.isArray(ordersData) ? ordersData : []);
    if (!Array.isArray(list)) return [];

    return list.filter((order: any) => {
      const hasMechanic = order.mechanic || order.mechanic_id;
      const isCompleted = ['completed', 'verified', 'verify_completed'].includes(order.status);
      return hasMechanic && isCompleted;
    });
  }, [ordersData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchOrders();
    } catch (_) {}
    setRefreshing(false);
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!activeModalTarget?.mechanicId) {
      showError('Error', 'Mechanic information not found.');
      return;
    }

    try {
      if (activeModalTarget.isEdit && activeModalTarget.reviewId) {
        // Update review (PUT /users/mechanics/{user_id}/reviews/{id}/)
        await updateReviewMutation.mutateAsync({
          mechanicId: activeModalTarget.mechanicId,
          reviewId: activeModalTarget.reviewId,
          payload: { rating, comment },
        });
        showSuccess('Review Updated', 'Your review has been updated successfully!');
      } else {
        // Create review (POST /users/mechanics/{user_id}/reviews/)
        await createReviewMutation.mutateAsync({
          mechanicId: activeModalTarget.mechanicId,
          payload: {
            data: {
              mechanic_id: activeModalTarget.mechanicId,
              rating,
              comment,
            },
            requestType: 'inbound',
          },
        });
        showSuccess('Review Submitted', 'Thank you for rating your mechanic!');
      }
      setActiveModalTarget(null);
      refetchOrders();
    } catch (error: any) {
      showError('Error', getApiErrorMessage(error) || 'Failed to submit review.');
      throw error;
    }
  };

  const handleDeleteReview = async () => {
    if (!activeModalTarget?.mechanicId || !activeModalTarget?.reviewId) return;

    try {
      await deleteReviewMutation.mutateAsync({
        mechanicId: activeModalTarget.mechanicId,
        reviewId: activeModalTarget.reviewId,
      });
      showSuccess('Review Deleted', 'Your review was deleted successfully.');
      setActiveModalTarget(null);
      refetchOrders();
    } catch (error: any) {
      showError('Error', getApiErrorMessage(error) || 'Failed to delete review.');
      throw error;
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
        <Text className="text-xl font-NunitoExtraBold text-gray-900">My Reviews</Text>
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
          {isLoadingOrders && !refreshing ? (
            <View className="py-20">
              <LoadingSpinner message="Loading your reviews..." />
            </View>
          ) : eligibleOrders.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center justify-center border border-gray-100 shadow-sm mt-6">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <ChatBubbleBottomCenterTextIcon size={32} color="#D30309" />
              </View>
              <Text className="text-gray-900 font-NunitoBold text-center text-lg mb-1">
                No Completed Services Yet
              </Text>
              <Text className="text-gray-400 font-NunitoMedium text-center text-xs px-6 leading-5">
                Once a mechanic completes your repair service and you verify it, you'll be able to review and rate them here.
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              <View className="mb-2">
                <Text className="text-lg font-NunitoExtraBold text-gray-900">
                  Completed Services ({eligibleOrders.length})
                </Text>
                <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                  Manage ratings and feedback for mechanics who worked on your vehicle
                </Text>
              </View>

              {eligibleOrders.map((order: any) => {
                const mechanicObj = order.mechanic;
                const mechanicName = mechanicObj
                  ? `${mechanicObj.first_name || ''} ${mechanicObj.last_name || ''}`.trim() || 'Mechanic'
                  : 'Mechanic';
                const mechanicAvatar = mechanicObj?.selfie || mechanicObj?.avatar || null;
                const mechanicTargetId = (
                  mechanicObj?.user?.id ||
                  mechanicObj?.user_id ||
                  mechanicObj?.id ||
                  order.mechanic_id ||
                  ''
                ).toString();

                const serviceName = resolveServiceDisplayName(order, serviceTypes) || 'Vehicle Repair';
                const vehicleString = `${order.vehicle_year || ''} ${getMakeName(order.vehicle_make)} ${getModelName(order.vehicle_make, order.vehicle_model)}`.trim();
                const formattedDate = order.requested_at
                  ? new Date(order.requested_at).toLocaleDateString()
                  : '';

                // If the order has an attached review or rating
                const existingReview = order.review || order.mechanic_review;
                const hasReview = !!existingReview;
                const rating = existingReview?.rating || 0;
                const comment = existingReview?.comment || existingReview?.review || '';

                return (
                  <View
                    key={order.id}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4"
                  >
                    {/* Top Row: Mechanic Info */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        {mechanicAvatar ? (
                          <Image
                            source={{ uri: mechanicAvatar }}
                            className="w-11 h-11 rounded-2xl mr-3 bg-gray-200"
                          />
                        ) : (
                          <LinearGradient
                            colors={['#D30309', '#991B1B']}
                            className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
                          >
                            <Text className="text-white font-NunitoBold text-base">
                              {mechanicName.charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                        )}
                        <View className="flex-1">
                          <Text className="text-base font-NunitoBold text-gray-900" numberOfLines={1}>
                            {mechanicName}
                          </Text>
                          <Text className="text-xs font-NunitoMedium text-gray-500" numberOfLines={1}>
                            {serviceName} • {formattedDate}
                          </Text>
                        </View>
                      </View>

                      {hasReview && (
                        <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                          <StarIcon size={14} color="#FBBF24" />
                          <Text className="text-xs font-NunitoBold text-amber-800 ml-1">
                            {Number(rating).toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Vehicle Subtitle */}
                    {vehicleString ? (
                      <View className="bg-gray-50 px-3 py-1.5 rounded-xl self-start mb-3 border border-gray-100">
                        <Text className="text-[11px] font-NunitoBold text-gray-600">
                          🚘 {vehicleString}
                        </Text>
                      </View>
                    ) : null}

                    {/* Existing Review or Call to Action */}
                    {hasReview ? (
                      <View className="mt-1 pt-3 border-t border-gray-100">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon
                                key={star}
                                size={14}
                                color={star <= rating ? '#FBBF24' : '#E5E7EB'}
                              />
                            ))}
                            <Text className="text-xs font-NunitoBold text-gray-700 ml-1.5">
                              Your Rating
                            </Text>
                          </View>

                          {/* Quick Actions */}
                          <View className="flex-row items-center space-x-2">
                            <TouchableOpacity
                              onPress={() =>
                                setActiveModalTarget({
                                  mechanicId: mechanicTargetId,
                                  mechanicName,
                                  reviewId: existingReview.id,
                                  rating,
                                  comment,
                                  isEdit: true,
                                })
                              }
                              className="p-1.5 bg-blue-50 rounded-lg"
                            >
                              <PencilSquareIcon size={16} color="#2563EB" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert(
                                  'Delete Review',
                                  'Are you sure you want to delete your review?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          await deleteReviewMutation.mutateAsync({
                                            mechanicId: mechanicTargetId,
                                            reviewId: existingReview.id,
                                          });
                                          showSuccess('Review Deleted', 'Your review has been removed.');
                                          refetchOrders();
                                        } catch (err: any) {
                                          showError('Error', getApiErrorMessage(err) || 'Failed to delete review.');
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                              className="p-1.5 bg-red-50 rounded-lg ml-1"
                            >
                              <TrashIcon size={16} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {comment ? (
                          <Text className="text-xs font-NunitoMedium text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100 italic">
                            "{comment}"
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <View className="mt-2 flex-row items-center justify-between pt-3 border-t border-gray-100">
                        <Text className="text-xs font-NunitoMedium text-gray-400">
                          No review submitted yet
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setActiveModalTarget({
                              mechanicId: mechanicTargetId,
                              mechanicName,
                              isEdit: false,
                            })
                          }
                          className="bg-primary-600 px-4 py-2 rounded-xl flex-row items-center"
                        >
                          <StarIcon size={14} color="#FFFFFF" />
                          <Text className="text-xs font-NunitoBold text-white ml-1.5">
                            Leave Review
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </AnimatedPageContainer>
      </ScrollView>

      {/* Review Modal */}
      {activeModalTarget && (
        <MechanicReviewModal
          visible={!!activeModalTarget}
          onClose={() => setActiveModalTarget(null)}
          mechanicId={activeModalTarget.mechanicId}
          mechanicName={activeModalTarget.mechanicName}
          onSubmit={handleReviewSubmit}
          isLoading={createReviewMutation.isPending || updateReviewMutation.isPending}
          initialRating={activeModalTarget.rating || 0}
          initialComment={activeModalTarget.comment || ''}
          isEdit={activeModalTarget.isEdit}
          onDelete={activeModalTarget.isEdit ? handleDeleteReview : undefined}
          isDeleting={deleteReviewMutation.isPending}
        />
      )}

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        type={alertConfig?.type || 'info'}
        onClose={hideAlert}
        autoDismiss={alertConfig?.autoDismiss}
        autoDismissDelay={alertConfig?.autoDismissDelay}
      />
    </SafeAreaView>
  );
};

export default UserReviews;
