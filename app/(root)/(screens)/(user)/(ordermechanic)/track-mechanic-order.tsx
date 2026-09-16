import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Modal, TouchableOpacity, Linking, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import BackArrowBtn from '@/components/BackArrowBtn';
import ContactSelectionModal from '@/components/modals/ContactSelectionModal';
import CustomButton from '@/components/CustomButton';
import { routes } from '@/constants/routes';
import LoadingSpinner from '@/components/LoadingSpinner';
import AnimatedErrorCard from '@/components/AnimatedErrorCard';
import { getApiErrorMessage } from '@/utils/errorMessages';
import { CheckCircleIcon as CheckCircleIconSolid, MapPinIcon as MapPinIconSolid } from 'react-native-heroicons/solid';
import {
  UserIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  CalendarIcon,
  MapPinIcon,
  PencilSquareIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  XCircleIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';
import { useRepairRequestDetail, useCancelRepairRequest, useVerifyRepairCompletion } from '@/hooks/useRepairRequests';
import { useVehicleMakes } from '@/hooks/useVehicleMakes';
import MechanicReviewModal from '@/components/modals/MechanicReviewModal';
import CancelRequestModal from '@/components/modals/CancelRequestModal';
import { useCreateMechanicReview } from '@/hooks/useMechanics';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import CustomAlert from '@/components/CustomAlert';
import OgaMapView, { Marker } from '@/components/OgaMapView';

interface OrderStatus {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  active: boolean;
  timestamp?: string | null;
}

// Helper functions - moved inside component to access state

const openInMaps = async (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  const googleMapsUrl = `comgooglemaps://?q=${encodedAddress}`;
  const appleMapsUrl = `maps://0,0?q=${encodedAddress}`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  if (Platform.OS === 'ios') {
    try {
      const canOpenGoogleMaps = await Linking.canOpenURL('comgooglemaps://');
      if (canOpenGoogleMaps) {
        await Linking.openURL(googleMapsUrl);
      } else {
        await Linking.openURL(appleMapsUrl);
      }
    } catch (error) {
      Linking.openURL(webUrl);
    }
  } else {
    // Android: geo: scheme handles multiple map apps
    const androidUrl = `geo:0,0?q=${encodedAddress}`;
    Linking.openURL(androidUrl).catch(() => {
      Linking.openURL(webUrl);
    });
  }
};

const TrackMechanicOrder = () => {
  const params = useLocalSearchParams();
  const orderId = useMemo(() => {
    const rawId = params?.orderId || params?.id;
    return Array.isArray(rawId) ? rawId[0] : (rawId as string | undefined);
  }, [params?.orderId, params?.id]);

  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('');

  // Copy to clipboard state
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Review mutation
  const createReviewMutation = useCreateMechanicReview();

  // Cancel request mutation
  const cancelRequestMutation = useCancelRepairRequest();
  
  // Verify completion mutation
  const verifyCompletionMutation = useVerifyRepairCompletion();

  // Custom Alert
  const { visible: alertVisible, alertConfig, hideAlert, showError, showSuccess } = useCustomAlert();

  // Mechanic Location State — sourced from API (mechanic broadcasts real GPS)
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number, longitude: number } | null>(null);


  // Fetch repair request detail from API
  const {
    data: orderData,
    isLoading: isLoadingData,
    error: errorData,
    refetch
  } = useRepairRequestDetail(orderId); // WebSocket handles live updates; poll disabled

  // Fetch vehicle makes to resolve make/model names
  const { data: vehicleMakes } = useVehicleMakes();

  const serviceLat = orderData?.data?.service_latitude;
  const serviceLng = orderData?.data?.service_longitude;

  // Sync mechanic location from real API data whenever the order data updates.
  // The mechanic device broadcasts its GPS to the backend; we read it here.
  useEffect(() => {
    const apiLat = orderData?.data?.mechanic_latitude;
    const apiLng = orderData?.data?.mechanic_longitude;

    if (apiLat && apiLng) {
      // Real mechanic coordinates are available from the API
      setMechanicLocation({ latitude: Number(apiLat), longitude: Number(apiLng) });
    } else if (serviceLat && serviceLng && !mechanicLocation) {
      // Fallback: show a static pin at the service address until the mechanic
      // shares their GPS (e.g. when status is still 'accepted' / 'pending')
      setMechanicLocation({ latitude: serviceLat, longitude: serviceLng });
    }
    // Note: no interval/simulation — location only updates when the API data refetches
  }, [orderData?.data?.mechanic_latitude, orderData?.data?.mechanic_longitude, serviceLat, serviceLng]);

  // Helper function to get make name from ID
  const getMakeName = (makeId: string | number) => {
    if (!vehicleMakes || !makeId) return 'N/A';
    const make = vehicleMakes.find((m) => m.id.toString() === makeId.toString());
    return make?.name || `Make ID: ${makeId}`;
  };

  // Helper function to get model name from ID
  const getModelName = (makeId: string | number, modelId: string | number) => {
    if (!vehicleMakes || !makeId || !modelId) return 'N/A';
    const make = vehicleMakes.find((m) => m.id.toString() === makeId.toString());
    const model = make?.models?.find((m) => m.id.toString() === modelId.toString());
    return model?.name || `Model ID: ${modelId}`;
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      if (!text || text.trim() === '') {
        return;
      }
      await Clipboard.setStringAsync(text);
      setIsCopied(true);

      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Reset after 3 seconds
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Define status flow matching API statuses
  const statusFlow: OrderStatus[] = [
    {
      id: 'pending',
      label: 'Request Submitted',
      description: 'Your request has been sent to the mechanic',
      completed: false,
      active: false,
    },
    {
      id: 'accepted',
      label: 'Request Accepted',
      description: 'The mechanic has accepted your request',
      completed: false,
      active: false,
    },
    {
      id: 'in_transit',
      label: 'Mechanic On The Way',
      description: 'The mechanic is coming to your location',
      completed: false,
      active: false,
    },
    {
      id: 'arrived',
      label: 'Mechanic Arrived',
      description: 'The mechanic has reached your location',
      completed: false,
      active: false,
    },
    {
      id: 'in_progress',
      label: 'Service In Progress',
      description: 'The mechanic is working on your vehicle',
      completed: false,
      active: false,
    },
    {
      id: 'completed',
      label: 'Service Completed',
      description: 'The mechanic has finished the repair',
      completed: false,
      active: false,
    },
    {
      id: 'verified',
      label: 'Job Verified',
      description: 'You have confirmed the service completion',
      completed: false,
      active: false,
    },
  ];

  // Map API status to status flow
  const getStatusFlow = (currentStatus: string, orderTimestamps?: any) => {
    const statusMap: Record<string, number> = {
      'pending': 0,
      'accepted': 1,
      'in_transit': 2,
      'arrived': 3,
      'in_progress': 4,
      'completed': 5,
      'verified': 6,
      'verify_completed': 6,
      'cancelled': -1,
      'declined': -1,
    };

    const apiStatus = currentStatus.toLowerCase();
    let currentStep = statusMap[apiStatus] ?? 0;
    
    // If status is verify_completed or we have the timestamp, it's fully completed
    const isVerified = (apiStatus === 'verified' || apiStatus === 'verify_completed' || !!orderTimestamps?.verify_completed_at);
    
    if (isVerified) {
      currentStep = 7;
    } else if (apiStatus === 'completed') {
      currentStep = 6;
    }

    // Map timestamps to status steps
    const timestampMap: Record<string, string | null> = {
      'pending': orderTimestamps?.requested_at || null,
      'accepted': orderTimestamps?.accepted_at || null,
      'in_transit': orderTimestamps?.in_transit_at || null,
      'arrived': orderTimestamps?.arrived_at || null,
      'in_progress': orderTimestamps?.in_progress_at || null,
      'completed': orderTimestamps?.completed_at || null,
      'verified': orderTimestamps?.verify_completed_at || null,
    };

    return statusFlow.map((status, index) => {
      const timestamp = timestampMap[status.id];
      
      return {
        ...status,
        completed: !!timestamp,
        // Active is the current step only if it doesn't have a timestamp yet
        active: index === currentStep && !timestamp,
        timestamp: timestamp || null,
      };
    });
  };

  // Transform API data to component format
  const order = (() => {
    if (!orderData?.data) {
      return {
        id: orderId,
        mechanic_name: 'Loading...',
        mechanic_id: '',
        mechanic_phone: '',
        service_type: 'Loading...',
        vehicle_make: 'Loading...',
        vehicle_model: 'Loading...',
        vehicle_year: 0,
        problem_description: 'Loading...',
        service_address: 'Loading...',
        preferred_date: new Date().toISOString(),
        preferred_time_slot: 'Loading...',
        status: 'pending',
        notes: '',
        schedule: false,
      };
    }

    const request = orderData.data;
    const mechanicName = request.mechanic
      ? `${request.mechanic.first_name || ''} ${request.mechanic.last_name || ''}`.trim() || 'Unknown Mechanic'
      : 'Unknown Mechanic';

    const makeId = request.vehicle_make;
    const modelId = request.vehicle_model;
    const makeName = getMakeName(makeId);
    const modelName = getModelName(makeId, modelId);

    // Get mechanic ID and phone from the mechanic object
    const mechanicId = request.mechanic?.id?.toString() || request.mechanic_id?.toString() || '';
    const mechanicPhone = request.mechanic?.phone_number || request.mechanic?.phone || '';

    return {
      id: request.id?.toString() || orderId || '',
      mechanic_name: mechanicName,
      mechanic_id: mechanicId,
      mechanic_phone: mechanicPhone,
      service_type: request.service_type || '',
      vehicle_make: makeName,
      vehicle_model: modelName,
      vehicle_year: request.vehicle_year || 0,
      problem_description: request.problem_description || request.description || '',
      service_address: request.service_address || request.address || '',
      preferred_date: request.preferred_date || request.requested_at || new Date().toISOString(),
      preferred_time_slot: request.preferred_time_slot || request.time_slot || '',
      status: request.status || 'pending',
      schedule: !!request.schedule,
      notes: request.notes || '',
      estimated_cost: request.estimated_cost ?? null,
      // Status timestamps
      requested_at: request.requested_at || null,
      accepted_at: request.accepted_at || null,
      in_transit_at: request.in_transit_at || null,
      arrived_at: request.arrived_at || null,
      in_progress_at: request.in_progress_at || null,
      started_at: request.started_at || null,
      completed_at: request.completed_at || null,
      cancelled_at: request.cancelled_at || null,
      verify_completed_at: request.verify_completed_at || null,
    };
  })();

  const currentStatus = order.status || 'pending';
  const statusSteps = getStatusFlow(currentStatus, {
    requested_at: (order as any).requested_at,
    accepted_at: (order as any).accepted_at,
    in_transit_at: (order as any).in_transit_at,
    arrived_at: (order as any).arrived_at,
    in_progress_at: (order as any).in_progress_at,
    completed_at: (order as any).completed_at,
    cancelled_at: (order as any).cancelled_at,
    verify_completed_at: (order as any).verify_completed_at,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async () => {
    if (!selectedCancelReason && !cancelReason.trim()) {
      showError('Reason Required', 'Please select or provide a reason for cancellation.');
      return;
    }

    if (!orderId) {
      showError('Error', 'Order ID is missing. Cannot cancel request.');
      return;
    }

    const finalReason = selectedCancelReason === 'Other' ? cancelReason.trim() : selectedCancelReason;

    cancelRequestMutation.mutate(
      { requestId: orderId, reason: finalReason },
      {
        onSuccess: () => {
          showSuccess('Success', 'Request cancelled successfully');
          setShowCancelModal(false);
          setCancelReason('');
          setSelectedCancelReason('');
          setTimeout(() => {
            router.back();
          }, 2000);
        },
        onError: (err: any) => {
          showError('Error', getApiErrorMessage(err));
        },
      }
    );
  };

  const handleVerifyCompletion = () => {
    if (!orderId) return;
    
    verifyCompletionMutation.mutate(orderId, {
      onSuccess: () => {
        showSuccess('Success', 'Repair completion verified successfully');
        refetch(); // Refetch to update status and hide button
      },
      onError: (err: any) => {
        showError('Error', getApiErrorMessage(err));
      },
    });
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    // Get mechanic ID directly from API response (UUID string)
    const mechanicIdFromResponse = orderData?.data?.mechanic?.id?.toString() || '';

    if (!mechanicIdFromResponse) {
      showError('Error', 'Mechanic information not available.');
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        mechanicId: mechanicIdFromResponse,
        payload: {
          data: {
            mechanic_id: mechanicIdFromResponse, // Use UUID string directly
            rating: rating,
            comment: comment,
          },
          requestType: 'inbound',
        },
      });
      showSuccess('Review Submitted', 'Thank you for your review!');
      setShowReviewModal(false);
    } catch (error) {
      showError('Error', 'Failed to submit review. Please try again.');
      throw error;
    }
  };

  const handleEdit = () => {
    setShowEditConfirmModal(true);
  };

  const handleConfirmEdit = () => {
    setShowEditConfirmModal(false);
    // Navigate to edit page with order ID
    router.push({
      pathname: routes.orderMechanic,
      params: {
        orderId: orderId || '',
        editMode: 'true',
        mechanicId: order.mechanic_id || '',
      },
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'in_transit':
        return 'On The Way';
      case 'arrived':
        return 'Arrived';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'verified':
      case 'verify_completed':
        return 'Verified';
      case 'cancelled':
        return 'Cancelled';
      case 'declined':
        return 'Declined';
      default:
        return status;
    }
  };

  const getOtpDisplayValue = (otp: string | number | undefined): string => {
    if (!otp) return '------';
    const otpStr = otp.toString();
    return otpStr.length >= 6 ? otpStr : otpStr.padStart(6, '0');
  };

  const handleCall = () => {
    setIsContactModalVisible(true);
  };

  const OGA_MECHANIC_PHONE = '+2348000000000'; // Replace with Oga Mechanic support line

  const performVoiceCall = () => {
    Linking.openURL(`tel:${OGA_MECHANIC_PHONE}`).catch(() => {
      showError('Error', 'Unable to initiate phone call');
    });
  };

  const performWhatsAppCall = () => {
    const cleanedNumber = OGA_MECHANIC_PHONE.replace(/\D/g, '');
    const message = `Hi Oga Mechanic, I have an active repair order (ID: ${orderId}). Please help connect me with my mechanic.`;
    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl);
      } else {
        showError('Error', 'WhatsApp is not installed on this device');
      }
    });
  };

  const handleChatSupport = () => {
    // Correctly routes to Support/Help Specialist as per user request
    router.push(routes.chatSpecialist as any);
  };

  if (isLoadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900">
            Track Order
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <Text className="text-gray-600 mt-4 font-NunitoMedium">
            Loading order details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900">
            Track Order
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 px-5 py-8">
          <AnimatedErrorCard
            emoji="🔧"
            title="Failed to load order"
            message={getApiErrorMessage(errorData)}
            gradientColors={['#FEF2F2', '#FECACA', '#FCA5A5']}
            textColor="text-red-800"
            actionButton={{
              text: "Try Again",
              onPress: () => {
                refetch();
              },
              backgroundColor: "#DC2626"
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canEdit = ['pending', 'accepted'].includes(currentStatus);
  const canCancel = !['completed', 'verified', 'verify_completed', 'cancelled', 'declined'].includes(currentStatus);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <BackArrowBtn onPress={() => router.push(routes.myMechanicOrders)} />
        <Text className="text-xl font-NunitoBold text-gray-900">
          Track Order
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={

          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View className={`mx-5 mt-4 p-4 rounded-xl ${currentStatus === 'pending' ? 'bg-amber-50 border border-amber-200' :
          currentStatus === 'accepted' ? 'bg-blue-50 border border-blue-200' :
            currentStatus === 'in_transit' ? 'bg-blue-50 border border-blue-200' :
              currentStatus === 'arrived' ? 'bg-indigo-50 border border-indigo-200' :
                currentStatus === 'in_progress' ? 'bg-purple-50 border border-purple-200' :
                  currentStatus === 'completed' ? 'bg-green-50 border border-green-200' :
                    currentStatus === 'verified' || currentStatus === 'verify_completed' ? 'bg-green-50 border border-green-200' :
                      currentStatus === 'cancelled' || currentStatus === 'declined' ? 'bg-red-50 border border-red-200' :
                        'bg-gray-50 border border-gray-200'
          }`}>
          <View className="flex-row items-center">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${currentStatus === 'pending' ? 'bg-amber-100' :
              currentStatus === 'accepted' ? 'bg-blue-100' :
                currentStatus === 'in_transit' ? 'bg-blue-100' :
                  currentStatus === 'arrived' ? 'bg-indigo-100' :
                    currentStatus === 'in_progress' ? 'bg-purple-100' :
                      currentStatus === 'completed' ? 'bg-green-100' :
                        currentStatus === 'verified' || currentStatus === 'verify_completed' ? 'bg-green-100' :
                          currentStatus === 'cancelled' || currentStatus === 'declined' ? 'bg-red-100' :
                            'bg-gray-100'
              }`}>
              {currentStatus === 'pending' && <ClockIcon size={20} color="#D97706" />}
              {currentStatus === 'accepted' && <CheckCircleIconSolid size={20} color="#2563EB" />}
              {currentStatus === 'in_transit' && <TruckIcon size={20} color="#2563EB" />}
              {currentStatus === 'arrived' && <MapPinIconSolid size={20} color="#4F46E5" />}
              {currentStatus === 'in_progress' && <WrenchScrewdriverIcon size={20} color="#7C3AED" />}
              {(currentStatus === 'completed' || currentStatus === 'verified' || currentStatus === 'verify_completed') && <CheckCircleIconSolid size={20} color="#10B981" />}
              {(currentStatus === 'cancelled' || currentStatus === 'declined') && <XCircleIcon size={20} color="#DC2626" />}
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-NunitoBold ${currentStatus === 'pending' ? 'text-amber-800' :
                currentStatus === 'accepted' ? 'text-blue-800' :
                  currentStatus === 'in_transit' ? 'text-blue-800' :
                    currentStatus === 'arrived' ? 'text-indigo-800' :
                      currentStatus === 'in_progress' ? 'text-purple-800' :
                        currentStatus === 'completed' ? 'text-green-800' :
                          currentStatus === 'verified' || currentStatus === 'verify_completed' ? 'text-green-800' :
                            currentStatus === 'cancelled' || currentStatus === 'declined' ? 'text-red-800' :
                              'text-gray-800'
                }`}>
                {getStatusLabel(currentStatus)}
              </Text>
              <Text className="text-sm font-NunitoMedium text-gray-600">
                {currentStatus === 'pending' && 'Waiting for mechanic to accept'}
                {currentStatus === 'accepted' && 'Mechanic will arrive soon'}
                {currentStatus === 'in_transit' && 'Mechanic is on the way to you'}
                {currentStatus === 'arrived' && 'Mechanic has reached your location'}
                {currentStatus === 'in_progress' && 'Your vehicle is being repaired'}
                {currentStatus === 'completed' && 'Your service is complete'}
                {(currentStatus === 'verified' || currentStatus === 'verify_completed') && 'You have confirmed the service completion'}
                {(currentStatus === 'cancelled' || currentStatus === 'declined') && 'This request was cancelled'}
              </Text>
            </View>
          </View>

          {/* New Interactive Actions Banner */}
          {(currentStatus === 'accepted' || currentStatus === 'in_transit' || currentStatus === 'arrived') && (
            <View className="flex-row mt-4 pt-4 border-t border-gray-100/50 space-x-3 gap-3">
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 flex-row items-center justify-center bg-gray-900/10 py-2.5 rounded-lg border border-gray-900/20"
              >
                <PhoneIcon size={18} color="#111827" />
                <Text className="text-sm font-NunitoBold text-gray-900 ml-2">Call Mechanic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChatSupport}
                className="flex-1 flex-row items-center justify-center bg-blue-600 py-2.5 rounded-lg"
              >
                <ChatBubbleLeftRightIcon size={18} color="#FFFFFF" />
                <Text className="text-sm font-NunitoBold text-white ml-2">Chat Support</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Arrival Verification OTP */}
          {(currentStatus === 'accepted' || currentStatus === 'in_transit' || currentStatus === 'arrived') && (
            <View className="mt-4 pt-4 border-t border-gray-100/50 items-center">
              <View className="flex-row items-center justify-between w-full mb-2">
                <View className="w-8" />
                <Text className="text-xs font-NunitoBold text-gray-500 uppercase tracking-widest">Arrival Verification Code</Text>
                <TouchableOpacity 
                  onPress={() => copyToClipboard(orderData?.data?.otp_code?.toString() || '')}
                  className="p-1"
                >
                  <DocumentDuplicateIcon size={18} color={isCopied ? "#10B981" : "#6B7280"} />
                </TouchableOpacity>
              </View>

              {orderData?.data?.is_otp_verified && (
                <View className="flex-row items-center mb-3 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <CheckCircleIconSolid size={14} color="#10B981" />
                  <Text className="text-[10px] font-NunitoBold text-green-700 ml-1">VERIFIED</Text>
                </View>
              )}

              <View className="flex-row space-x-2 gap-2">
                {getOtpDisplayValue(orderData?.data?.otp_code).split('').map((digit, i) => (
                  <View key={i} className={`w-10 h-12 ${orderData?.data?.is_otp_verified ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} border rounded-lg items-center justify-center shadow-sm`}>
                    <Text className={`text-xl font-NunitoExtraBold ${orderData?.data?.is_otp_verified ? 'text-green-700' : 'text-gray-900'}`}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-[10px] font-NunitoMedium text-gray-400 mt-2 text-center px-4">
                {orderData?.data?.is_otp_verified 
                  ? "This code has been verified. The repair is now in progress."
                  : "Share this code with the mechanic once they arrive to start the repair."}
              </Text>
            </View>
          )}
        </View>

        {/* Order Timeline */}
        <View className="bg-white mx-5 mt-4 rounded-xl border border-gray-200 p-4">
          <Text className="text-base font-NunitoBold text-gray-900 mb-4">
            Order Progress
          </Text>

          {statusSteps.map((step, index) => (
            <View key={step.id} className="flex-row">
              {/* Timeline Indicator */}
              <View className="items-center mr-3">
                {step.completed ? (
                  <CheckCircleIconSolid size={20} color="#10B981" />
                ) : step.active ? (
                  <View className="w-5 h-5 rounded-full border-2 border-primary-500 bg-primary-50 items-center justify-center">
                    <View className="w-2 h-2 rounded-full bg-primary-500" />
                  </View>
                ) : (
                  <View className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
                )}
                {index < statusSteps.length - 1 && (
                  <View
                    className={`w-0.5 flex-1 mt-1 ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`}
                    style={{ minHeight: 32 }}
                  />
                )}
              </View>

              {/* Status Info */}
              <View className="flex-1 pb-3">
                <Text className={`text-sm font-NunitoBold ${step.active ? 'text-primary-600' : step.completed ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                  {step.label}
                </Text>
                {step.timestamp && (step.completed || step.active) && (
                  <Text className="text-xs font-NunitoMedium text-gray-500 mt-0.5">
                    {new Date(step.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Mechanic Card */}
        {order.mechanic_name && order.mechanic_name !== 'Unknown Mechanic' && (
          <TouchableOpacity
            className="bg-white mx-5 mt-5 rounded-3xl border border-gray-100 p-5 shadow-sm"
            activeOpacity={0.9}
            onPress={() => {
              if (order.mechanic_id) {
                router.push({
                  pathname: routes.mechanicProfile,
                  params: { mechanicId: order.mechanic_id }
                });
              }
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-14 h-14 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100 overflow-hidden">
                  {orderData?.data?.mechanic?.selfie ? (
                    <Image 
                      source={{ uri: orderData.data.mechanic.selfie }} 
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <UserIcon size={28} color="#9CA3AF" />
                  )}
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-widest mb-0.5">Assigned Specialist</Text>
                  <Text className="text-lg font-NunitoExtraBold text-gray-900 leading-6">{order.mechanic_name}</Text>
                </View>
              </View>
              <View className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center">
                <ChevronRightIcon size={20} color="#111827" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Vehicle Card */}
        <View className="bg-white mx-5 mt-4 rounded-xl border border-gray-200 p-4">
          <View className="flex-row items-center mb-3">
            <TruckIcon size={18} color="#6B7280" />
            <Text className="text-sm font-NunitoBold text-gray-500 ml-2 uppercase">Vehicle</Text>
          </View>
          <Text className="text-lg font-NunitoBold text-gray-900">
            {order.vehicle_make} {order.vehicle_model}
          </Text>
          {order.vehicle_year > 0 && (
            <View className="flex-row mt-2">
              <View className="px-2 py-1 bg-gray-100 rounded">
                <Text className="text-xs font-NunitoBold text-gray-700">{order.vehicle_year}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Service Card */}
        <View className="bg-white mx-5 mt-4 rounded-xl border border-gray-200 p-4">
          <View className="flex-row items-center mb-3">
            <WrenchScrewdriverIcon size={18} color="#6B7280" />
            <Text className="text-sm font-NunitoBold text-gray-500 ml-2 uppercase">Service Required</Text>
          </View>
          <Text className="text-lg font-NunitoBold text-gray-900">
            {order.service_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
          </Text>
          {(order as any).estimated_cost != null && !Number.isNaN(Number((order as any).estimated_cost)) && (
            <View className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-NunitoBold text-green-700 uppercase tracking-wide">Estimated Cost</Text>
                <View className="px-2 py-0.5 rounded-full bg-green-600">
                  <Text className="text-[10px] font-NunitoBold text-white">BUDGET</Text>
                </View>
              </View>
              <Text className="text-[22px] font-NunitoExtraBold text-green-700 mt-1">
                ₦{Number((order as any).estimated_cost).toLocaleString()}
              </Text>
            </View>
          )}
          {order.problem_description && (
            <View className="mt-3 p-3 bg-gray-50 rounded-lg">
              <Text className="text-sm font-NunitoMedium text-gray-600 leading-5">
                {order.problem_description}
              </Text>
            </View>
          )}
          {order.notes && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-xs font-NunitoBold text-gray-500 uppercase mb-1">Additional Notes</Text>
              <Text className="text-sm font-NunitoMedium text-gray-600">{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Schedule Card */}
        {order.schedule && (
          <View className="bg-white mx-5 mt-4 rounded-xl border border-gray-200 p-4">
            <View className="flex-row items-center mb-3">
              <CalendarIcon size={18} color="#6B7280" />
              <Text className="text-sm font-NunitoBold text-gray-500 ml-2 uppercase">Schedule</Text>
            </View>
            <Text className="text-lg font-NunitoBold text-gray-900">
              {new Date(order.preferred_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
            {order.preferred_time_slot && (
              <Text className="text-sm font-NunitoMedium text-gray-600 mt-1">
                {order.preferred_time_slot.charAt(0).toUpperCase() + order.preferred_time_slot.slice(1)}
              </Text>
            )}
          </View>
        )}

        {/* Service Location / Live Tracking Map */}
        <View className="bg-white mx-5 mt-4 rounded-xl border border-gray-200 overflow-hidden">
          {(currentStatus === 'accepted' || currentStatus === 'in_transit' || currentStatus === 'arrived') && serviceLat && serviceLng ? (
            <View className="h-[250px] w-full relative">
              <OgaMapView
                initialRegion={{
                  latitude: serviceLat,
                  longitude: serviceLng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                style={{ flex: 1 }}
              >
                {/* User/Service Location Marker */}
                <Marker type="user" coordinate={{ latitude: serviceLat, longitude: serviceLng }}>
                  <View className="bg-red-500 p-2 rounded-full border-2 border-white shadow-md">
                    <UserIcon size={20} color="#FFFFFF" />
                  </View>
                </Marker>

                {/* Mechanic Marker */}
                {mechanicLocation && (
                  <Marker type="van" coordinate={mechanicLocation}>
                    <View className="bg-gray-900 p-2 rounded-full border-2 border-white shadow-md">
                      <TruckIcon size={20} color="#FFFFFF" />
                    </View>
                  </Marker>
                )}
              </OgaMapView>
              <View className="absolute bottom-3 left-3 right-3 bg-white/95 p-3 rounded-lg border border-gray-100 flex-row items-center shadow-sm">
                <MapPinIcon size={16} color="#6B7280" />
                <Text className="text-xs font-NunitoMedium text-gray-600 ml-2 flex-1" numberOfLines={1}>
                  {order.service_address || 'Service Location'}
                </Text>
              </View>
            </View>
          ) : (
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <MapPinIcon size={18} color="#6B7280" />
                  <Text className="text-sm font-NunitoBold text-gray-500 ml-2 uppercase">Service Location</Text>
                </View>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => copyToClipboard(order.service_address || '')}
                    className={`${isCopied ? 'px-3' : 'w-9'} h-9 rounded-lg ${isCopied ? 'bg-green-100' : 'bg-gray-100'} items-center justify-center mr-2`}
                  >
                    {isCopied ? (
                      <Text className="text-xs font-NunitoBold text-green-700">Copied</Text>
                    ) : (
                      <DocumentDuplicateIcon size={18} color="#374151" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openInMaps(order.service_address || '')}
                    className="px-3 h-9 rounded-lg bg-gray-900 items-center justify-center flex-row"
                  >
                    <MapPinIcon size={14} color="#FFFFFF" />
                    <Text className="text-xs font-NunitoBold text-white ml-1">View Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-base font-NunitoMedium text-gray-900 leading-6">
                {order.service_address || 'N/A'}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Action Buttons Sticky at Bottom */}
      <View className="px-5 pt-4 pb-6 bg-white border-t border-gray-100">
        <View className="flex-row gap-3 mb-3">
          {canEdit && (
            <View className="flex-1">
              <CustomButton
                title="Edit Request"
                onPress={handleEdit}
                bgVariant="outline"
                textVariant='outline'
                className="py-3"
              />
            </View>
          )}
          {canCancel && (
            <View className="flex-1">
              <CustomButton
                title="Cancel Request"
                onPress={handleCancel}
                bgVariant="danger"
                className="py-3"
                disabled={cancelRequestMutation.isPending}
                loading={cancelRequestMutation.isPending}
              />
            </View>
          )}
        </View>

        {/* Review Button - Only show for completed orders */}
        {currentStatus === 'completed' && order.mechanic_id && !orderData?.data?.verify_completed_at && (
          <CustomButton
            title="Verify Completion"
            onPress={handleVerifyCompletion}
            bgVariant="success"
            className="py-3"
            disabled={verifyCompletionMutation.isPending}
            loading={verifyCompletionMutation.isPending}
          />
        )}

        {/* Review Button - Only show for completed orders */}
        {(currentStatus === 'verified' || currentStatus === 'verify_completed') && order.mechanic_id && (
          <CustomButton
            title="Give Review"
            onPress={() => setShowReviewModal(true)}
            bgVariant="primary"
            className="py-3"
          />
        )}
      </View>

      {/* Review Modal */}
      <MechanicReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        mechanicId={order.mechanic_id || ''}
        mechanicName={order.mechanic_name}
        onSubmit={handleReviewSubmit}
        isLoading={createReviewMutation.isPending}
      />

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

      {/* Edit Confirmation Modal */}
      <Modal
        visible={showEditConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditConfirmModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header with Icon */}
            <View className="items-center pt-6 pb-4">
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-4">
                <PencilSquareIcon size={32} color="#2563EB" />
              </View>
              <Text className="text-xl font-NunitoBold text-gray-900 text-center">
                Edit Request
              </Text>
            </View>

            {/* Body */}
            <View className="px-6 pb-4">
              <Text className="text-base font-NunitoMedium text-gray-600 text-center leading-6">
                Are you sure you want to edit this request? You can update the service details, schedule, or location.
              </Text>
            </View>

            {/* Buttons */}
            <View className="flex-row border-t border-gray-200">
              <TouchableOpacity
                onPress={() => setShowEditConfirmModal(false)}
                className="flex-1 py-4 items-center border-r border-gray-200"
                activeOpacity={0.7}
              >
                <Text className="text-base font-NunitoBold text-gray-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmEdit}
                className="flex-1 py-4 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-base font-NunitoBold text-primary-600">
                  Yes, Edit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <CancelRequestModal
        visible={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedCancelReason('');
          setCancelReason('');
        }}
        onConfirm={handleCancelSubmit}
        cancelReason={cancelReason}
        selectedCancelReason={selectedCancelReason}
        onReasonChange={setCancelReason}
        onSelectedReasonChange={setSelectedCancelReason}
        isLoading={isLoading || cancelRequestMutation.isPending}
      />

      <ContactSelectionModal
        visible={isContactModalVisible}
        onClose={() => setIsContactModalVisible(false)}
        onVoiceCall={performVoiceCall}
        onWhatsAppCall={performWhatsAppCall}
        phoneNumber={OGA_MECHANIC_PHONE}
        storeName="Oga Mechanic Support"
      />
    </SafeAreaView>
  );
};

export default TrackMechanicOrder;