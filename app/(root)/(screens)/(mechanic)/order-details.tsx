
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import BackArrowBtn from '@/components/BackArrowBtn';
import ContactSelectionModal from '@/components/modals/ContactSelectionModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import AnimatedErrorCard from '@/components/AnimatedErrorCard';
import CustomAlert from '@/components/CustomAlert';
import MechanicActionConfirmationModal, { MechanicActionType } from '@/components/modals/MechanicActionConfirmationModal';
import MechanicCancelRequestModal from '@/components/modals/MechanicCancelRequestModal';
import JobCompletedModal from '@/components/modals/JobCompletedModal';
import JobCompletionFormModal from '@/components/modals/JobCompletionFormModal';
import MechanicOTPVerificationModal from '@/components/modals/MechanicOTPVerificationModal';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useRepairRequestDetail, useAcceptRepairRequest, useDeclineRepairRequest, useUpdateRepairRequestStatus, useCancelRepairRequest, useUpdateRepairRequest, useVerifyRepairRequestOtp } from '@/hooks/useRepairRequests';
import { useVehicleMakes } from '@/hooks/useVehicleMakes';
import { getErrorMessage, getApiErrorMessage } from '@/utils/errorMessages';
import { routes } from '@/constants/routes';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
} from 'react-native-heroicons/outline';
import StatusBanner from './mechanicRepairPages/StatusBanner';
import OrderMapView from './mechanicRepairPages/OrderMapView';
import CustomerInfoCard from './mechanicRepairPages/CustomerInfoCard';
import VehicleServiceDetails from './mechanicRepairPages/VehicleServiceDetails';
import BottomActionButtons from './mechanicRepairPages/BottomActionButtons';
import OrderTimeline from './mechanicRepairPages/OrderTimeline';

const MechanicOrderDetails = () => {
  const params = useLocalSearchParams();
  const orderId = useMemo(() => Array.isArray(params?.orderId) ? params?.orderId[0] : (params?.orderId as string | undefined), [params?.orderId]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MechanicActionType | null>(null);
  const [jobCompletedModalVisible, setJobCompletedModalVisible] = useState(false);
  const [completionFormVisible, setCompletionFormVisible] = useState(false);
  const [isFinishingJob, setIsFinishingJob] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const { showSuccess, showError, showWarning, visible, alertConfig, hideAlert } = useCustomAlert();
  
  // Copy to clipboard state
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Location tracking state
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Fetch repair request detail from API
  const { 
    data: orderData, 
    isLoading: isLoadingData, 
    error: errorData, 
    refetch 
  } = useRepairRequestDetail(orderId, 0);

  // Fetch vehicle makes to resolve make/model names
  const { data: vehicleMakes } = useVehicleMakes();

  const request = orderData?.data;
  const customer = request?.customer;
  const status = request?.status || 'pending';

  // Mutations for accepting/declining requests
  const acceptRequestMutation = useAcceptRepairRequest();
  const declineRequestMutation = useDeclineRepairRequest();
  const updateStatusMutation = useUpdateRepairRequestStatus();
  const cancelRequestMutation = useCancelRepairRequest();
  const updateRepairRequestMutation = useUpdateRepairRequest();
  const verifyOtpMutation = useVerifyRepairRequestOtp();

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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Track location when in transit
  useEffect(() => {
    let isMounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            showError('Permission Denied', 'Location permission is required for live tracking.');
            return;
        }

        // Initial location with fallback to last known if current fails
        let location;
        try {
            location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
        } catch (err) {
            console.warn('Failed to get current position, trying last known:', err);
            location = await Location.getLastKnownPositionAsync({});
        }

        if (isMounted && location) {
            setMechanicLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        }

        // Watch location if in transit
        if (orderData?.data?.status === 'in_transit') {
            try {
                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                        distanceInterval: 10,
                    },
                    (location) => {
                        if (isMounted) {
                            setMechanicLocation({
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            });
                        }
                    }
                );
            } catch (err) {
                console.error('Error starting location watch:', err);
            }
        }
      } catch (error) {
        console.error('General location error:', error);
      }
    };

    if (orderId && (orderData?.data?.status === 'accepted' || orderData?.data?.status === 'in_transit')) {
        startTracking();
    }

    return () => {
        isMounted = false;
        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }
    };
  }, [orderId, orderData?.data?.status]);

  const handleCall = () => {
    setIsContactModalVisible(true);
  };

  const performVoiceCall = () => {
    const phoneNumber = customer?.phone_number;
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      showError('Error', 'Unable to initiate phone call');
    });
  };

  const performWhatsAppCall = () => {
    const phoneNumber = customer?.phone_number;
    if (!phoneNumber) return;
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    const message = `Hi, I'm a mechanic from Oga Mechanic. I'm assigned to your active repair request. Please connect with me.`;
    const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl);
      } else {
        showError('Error', 'WhatsApp is not installed on this device');
      }
    });
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed' || status === 'verify_completed') {
      return (status === 'verify_completed' || request?.verify_completed_at) ? 'Job Verified' : 'Awaiting Verification';
    }
    switch (status) {
      case 'pending':
        return 'New Request';
      case 'accepted':
        return 'Accepted';
      case 'in_transit':
        return 'In Transit';
      case 'arrived':
        return 'Arrived';
      case 'in_progress':
        return 'In Progress';
      case 'cancelled':
        return 'Cancelled';
      case 'declined':
        return 'Declined';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const getOtpDisplayValue = (otp: string | number | undefined): string => {
    if (!otp) return '------';
    const otpStr = otp.toString();
    return otpStr.length >= 6 ? otpStr : otpStr.padStart(6, '0');
  };

  const handleVerifyOtp = async (otp: string | number) => {
    if (!orderId) return;
    
    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      await verifyOtpMutation.mutateAsync({ 
        requestId: orderId, 
        otpCode: otp.toString() 
      });
      
      setIsVerifyingOtp(false);
      setOtpModalVisible(false);
      showSuccess('Verified', 'Arrival code verified successfully. Starting repair...');
      
      // Auto-trigger status update to in_progress
      try {
        await updateStatusMutation.mutateAsync({ 
          requestId: orderId, 
          status: 'in_progress' 
        });
      } catch (statusError) {
        console.error('Failed to auto-update status:', statusError);
      }
      
    } catch (error: any) {
      setIsVerifyingOtp(false);
      const errorMessage = getApiErrorMessage(error);
      setOtpError(errorMessage || 'Invalid verification code. Please ask the customer for the correct 6-digit code.');
    }
  };

  const handleBypassOtp = () => {
    if (!orderId) return;

    Alert.alert(
      'Bypass OTP Verification?',
      "Use this only if the customer's phone is dead, offline, or unavailable. Ensure you have established contact with the client before proceeding.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            setIsVerifyingOtp(true);
            setOtpError(null);
            try {
              // Try to directly transition status to in_progress
              await updateStatusMutation.mutateAsync({ 
                requestId: orderId, 
                status: 'in_progress' 
              });
              setOtpModalVisible(false);
              showSuccess('Started Work', 'Bypassed verification successfully. Repair job started.');
            } catch (err: any) {
              const errorMessage = getApiErrorMessage(err);
              showError('Bypass Failed', errorMessage || 'Direct status update failed. Please call support.');
            } finally {
              setIsVerifyingOtp(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeSlot: string | null | undefined) => {
    if (!timeSlot) return 'N/A';
    return timeSlot.charAt(0).toUpperCase() + timeSlot.slice(1);
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Copy address to clipboard
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

  // Open address in maps
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
      const androidUrl = `geo:0,0?q=${encodedAddress}`;
      Linking.openURL(androidUrl).catch(() => {
        Linking.openURL(webUrl);
      });
    }
  };

  // Add to calendar
  const addToCalendar = (date: string, timeSlot: string, address: string, serviceType: string) => {
    const eventDate = new Date(date);
    const title = encodeURIComponent(`Repair Job - ${serviceType}`);
    const location = encodeURIComponent(address || 'Customer Location');
    const details = encodeURIComponent(`Scheduled repair job. Time slot: ${timeSlot}`);
    const startDate = eventDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}&sf=true&output=xml`;
    Linking.openURL(calendarUrl).catch(() => {
      showError('Error', 'Unable to open calendar');
    });
  };

  const openActionConfirmation = (action: MechanicActionType) => {
    setActionType(action);
    setActionModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!orderId || !actionType) return;

    try {
      if (actionType === 'accept') {
        await acceptRequestMutation.mutateAsync(orderId);
        setActionModalVisible(false);
        setActionType(null);
        showSuccess('Success', 'Repair request accepted successfully.');
      } else if (actionType === 'decline') {
        await declineRequestMutation.mutateAsync(orderId);
        setActionModalVisible(false);
        setActionType(null);
        showSuccess('Success', 'Repair request declined successfully.');
      } else {
        // Show job completion form instead of immediate update for completed status
        if (actionType === 'completed') {
          setActionModalVisible(false);
          setActionType(null);
          setCompletionFormVisible(true);
          return;
        }

        // Status updates: in_transit, in_progress, completed
        await updateStatusMutation.mutateAsync({ requestId: orderId, status: actionType });
        setActionModalVisible(false);
        setActionType(null);
        showSuccess('Success', 'Status updated successfully.');
      }
    } catch (error: any) {
      try {
        const errorMessage = getApiErrorMessage(error);
        showError('Action failed', errorMessage);
      } catch (alertError) {
        console.error('Error displaying error message:', alertError);
        showError('Action failed', 'An error occurred. Please try again.');
      }
    }
  };

  const handleCancelActionModal = () => {
    setActionModalVisible(false);
    setActionType(null);
  };

  const isActionPending = () => {
    return acceptRequestMutation.isPending ||
           declineRequestMutation.isPending ||
           updateStatusMutation.isPending;
  };

  const handleCancelRequest = async () => {
    const reason = selectedCancelReason === 'Other' ? cancelReason.trim() : selectedCancelReason;

    if (!orderId || !reason) {
      showWarning('Validation', 'Please select a reason for cancellation.');
      return;
    }

    try {
      await cancelRequestMutation.mutateAsync({ requestId: orderId, reason });
      setCancelModalVisible(false);
      setCancelReason('');
      setSelectedCancelReason('');
      showSuccess(
        'Job Cancelled',
        'The repair request has been cancelled successfully.'
      );
    } catch (error: any) {
      try {
        const errorMessage = getApiErrorMessage(error);
        showError('Cancellation Failed', errorMessage);
      } catch (alertError) {
        console.error('Error displaying error message:', alertError);
        showError('Cancellation Failed', 'An error occurred. Please try again.');
      }
    }
  };

  const handleCloseCancelModal = () => {
    setCancelModalVisible(false);
    setCancelReason('');
    setSelectedCancelReason('');
  };

  const handleFinalizeJob = async (resolutions: any[]) => {
    if (!orderId) return;
    
    setIsFinishingJob(true);
    try {
      await updateRepairRequestMutation.mutateAsync({
        requestId: orderId,
        payload: {
          data: {
            status: 'completed',
            problem_resolutions: resolutions
          },
          requestType: 'inbound'
        }
      });
      
      setCompletionFormVisible(false);
      setJobCompletedModalVisible(true);
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error);
      showError('Update Failed', errorMessage);
    } finally {
      setIsFinishingJob(false);
    }
  };

  if (isLoadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900">
            Order Details
          </Text>
          <View className="w-12" />
        </View>
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (errorData || !orderData?.data) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900">
            Order Details
          </Text>
          <View className="w-12" />
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <AnimatedErrorCard
            emoji="🔧"
            title="Unable to load order details"
            message={errorData ? "Failed to fetch order details. Please try again." : "Order details not found."}
            gradientColors={['#FEF2F2', '#FECACA', '#FCA5A5']}
            textColor="text-red-800"
            actionButton={{
              text: "Retry",
              onPress: () => refetch(),
              backgroundColor: "#DC2626"
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const makeName = getMakeName(request.vehicle_make);
  const modelName = getModelName(request.vehicle_make, request.vehicle_model);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <BackArrowBtn />
        <Text className="text-xl font-NunitoBold text-gray-900">
          Order Details
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
      >
        <View className="px-5 py-4">
          <StatusBanner 
            status={status} 
            request={request} 
            getStatusLabel={getStatusLabel} 
          />

          <OrderMapView 
            status={status} 
            request={request} 
            mechanicLocation={mechanicLocation} 
          />

          <CustomerInfoCard customer={customer} />

          <VehicleServiceDetails 
            request={request} 
            makeName={makeName} 
            modelName={modelName} 
          />

          {/* Action Buttons for communication */}
          {(status === 'accepted' || status === 'in_transit' || status === 'arrived') && (
            <View className="flex-row items-center justify-between mb-5 gap-3">
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 flex-row items-center justify-center bg-gray-50 py-3 rounded-xl border border-gray-200"
              >
                <PhoneIcon size={18} color="#374151" />
                <Text className="text-sm font-NunitoBold text-gray-700 ml-2">Call Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(routes.chatSpecialist as any)}
                className="flex-1 flex-row items-center justify-center bg-blue-600 py-3 rounded-xl shadow-sm"
              >
                <ChatBubbleLeftRightIcon size={18} color="#FFFFFF" />
                <Text className="text-sm font-NunitoBold text-white ml-2">Chat Support</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Arrival Verification OTP */}
          {(status === 'accepted' || status === 'in_transit' || status === 'arrived') && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                    <ShieldCheckIcon size={20} color="#374151" />
                  </View>
                  <Text className="text-lg font-NunitoBold text-gray-900">Verification OTP</Text>
                </View>
                {request?.is_otp_verified ? (
                  <View className="bg-green-100 px-3 py-1 rounded-full border border-green-200">
                    <Text className="text-[10px] font-NunitoBold text-green-700">VERIFIED</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => copyToClipboard(request?.otp_code?.toString() || '')}
                    className={`p-2 rounded-lg border ${isCopied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <ClipboardDocumentIcon size={18} color={isCopied ? "#10B981" : "#6B7280"} />
                  </TouchableOpacity>
                )}
              </View>

              <View className="bg-gray-50 rounded-xl p-4 items-center">
                <Text className="text-xs font-NunitoBold text-gray-400 uppercase tracking-widest mb-3">
                  Customer Verification Code
                </Text>
                <View className="flex-row items-center space-x-2 gap-2">
                  {getOtpDisplayValue(request?.otp_code).split('').map((digit, i) => (
                    <View key={i} className={`w-9 h-11 ${request?.is_otp_verified ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'} border rounded-lg items-center justify-center shadow-sm`}>
                      <Text className={`text-xl font-NunitoExtraBold ${request?.is_otp_verified ? 'text-green-700' : 'text-gray-900'}`}>{digit}</Text>
                    </View>
                  ))}
                </View>
                {!request?.is_otp_verified && (
                  <Text className="text-[10px] font-NunitoMedium text-gray-400 mt-2 text-center">
                    Ask the customer for the verification code once you arrive.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Schedule Card */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <CalendarIcon size={20} color="#374151" />
                </View>
                <Text className="text-lg font-NunitoBold text-gray-900">
                  Schedule
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => addToCalendar(
                  request.preferred_date || request.requested_at,
                  request.preferred_time_slot,
                  request.service_address,
                  request.service_type || 'Repair'
                )}
                className="flex-row items-center bg-gray-900 px-3 py-2 rounded-lg"
              >
                <CalendarDaysIcon size={16} color="#FFFFFF" />
                <Text className="text-xs font-NunitoSemiBold text-white ml-1">
                  Add to Calendar
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-gray-50 rounded-xl p-4">
              <Text className="text-lg font-NunitoBold text-gray-900">
                {formatDate(request.preferred_date || request.requested_at)}
              </Text>
              <View className="flex-row items-center mt-2">
                <ClockIcon size={16} color="#6B7280" />
                <Text className="text-sm font-NunitoSemiBold text-gray-600 ml-2">
                  {formatTime(request.preferred_time_slot)} slot
                </Text>
              </View>
            </View>
          </View>

          {/* Service Address Card */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                <MapPinIcon size={20} color="#374151" />
              </View>
              <Text className="text-lg font-NunitoBold text-gray-900">
                Service Location
              </Text>
            </View>

            <View className="bg-gray-50 rounded-xl p-3 mb-3">
              <Text className="text-sm font-NunitoMedium text-gray-800 leading-5">
                {request.service_address || 'No address provided'}
              </Text>
            </View>

            {request.service_address && (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => openInMaps(request.service_address)}
                  className="flex-1 flex-row items-center justify-center bg-gray-900 py-3 rounded-xl"
                >
                  <MapPinIcon size={18} color="#FFFFFF" />
                  <Text className="text-sm font-NunitoSemiBold text-white ml-2">
                    View on Map
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => copyToClipboard(request.service_address)}
                  className={`flex-row items-center justify-center ${isCopied ? 'bg-green-100' : 'bg-gray-100'} px-4 py-3 rounded-xl`}
                >
                  {isCopied ? (
                    <Text className="text-sm font-NunitoSemiBold text-green-700">
                      Copied
                    </Text>
                  ) : (
                    <>
                      <ClipboardDocumentIcon size={18} color="#6B7280" />
                      <Text className="text-sm font-NunitoSemiBold text-gray-700 ml-2">
                        Copy
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <OrderTimeline 
            request={request} 
            status={status} 
            formatDateTime={formatDateTime} 
          />

          {/* Cost Information */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Text className="text-lg">₦</Text>
              </View>
              <Text className="text-lg font-NunitoBold text-gray-900">
                Cost Information
              </Text>
            </View>

            <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
              <Text className="text-xs font-NunitoMedium text-green-700 uppercase tracking-wider">
                Estimated Cost
              </Text>
              {request.estimated_cost ? (
                <Text className="text-2xl font-NunitoExtraBold text-green-700 mt-1">
                  ₦{parseFloat(request.estimated_cost).toLocaleString()}
                </Text>
              ) : (
                <Text className="text-sm font-NunitoBold text-green-600 mt-1">
                  Awaiting estimate
                </Text>
              )}
            </View>

            <View className="bg-gray-100 rounded-xl p-3">
              <Text className="text-xs font-NunitoMedium text-gray-600 uppercase tracking-wider">
                Final Amount
              </Text>
              {request.actual_cost ? (
                <Text className="text-lg font-NunitoBold text-gray-900 mt-1">
                  ₦{parseFloat(request.actual_cost).toLocaleString()}
                </Text>
              ) : (
                <Text className="text-sm font-NunitoBold text-gray-500 mt-1">
                  Not set yet
                </Text>
              )}
            </View>
          </View>

          {/* Cancellation Reason */}
          {request.cancellation_reason && (
            <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 bg-gray-200 rounded-full items-center justify-center mr-2">
                  <XCircleIcon size={18} color="#374151" />
                </View>
                <Text className="text-base font-NunitoBold text-gray-900">
                  Cancellation Reason
                </Text>
              </View>
              <Text className="text-sm font-NunitoMedium text-gray-700 leading-5">
                {request.cancellation_reason}
              </Text>
            </View>
          )}

          {/* Bottom spacing */}
          <View className="h-[80px]" />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <BottomActionButtons
        status={status}
        request={request}
        openActionConfirmation={openActionConfirmation}
        setCancelModalVisible={setCancelModalVisible}
        setOtpModalVisible={setOtpModalVisible}
        acceptRequestMutation={acceptRequestMutation}
        declineRequestMutation={declineRequestMutation}
        updateStatusMutation={updateStatusMutation}
        cancelRequestMutation={cancelRequestMutation}
      />

      {/* OTP Verification Modal */}
      <MechanicOTPVerificationModal
        visible={otpModalVisible}
        onClose={() => setOtpModalVisible(false)}
        onVerify={handleVerifyOtp}
        onBypass={handleBypassOtp}
        isVerifying={isVerifyingOtp}
        error={otpError}
      />

      {/* Cancel Modal */}
      <MechanicCancelRequestModal
        visible={cancelModalVisible}
        onClose={handleCloseCancelModal}
        onConfirm={handleCancelRequest}
        cancelReason={cancelReason}
        selectedCancelReason={selectedCancelReason}
        onReasonChange={setCancelReason}
        onSelectedReasonChange={setSelectedCancelReason}
        isLoading={cancelRequestMutation.isPending}
      />

      {/* Job Completion Form Modal */}
      <JobCompletionFormModal
        visible={completionFormVisible}
        onClose={() => setCompletionFormVisible(false)}
        onSubmit={handleFinalizeJob}
        isLoading={isFinishingJob}
      />

      {/* Action Confirmation Modal */}
      <MechanicActionConfirmationModal
        visible={actionModalVisible}
        actionType={actionType}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelActionModal}
        isLoading={isActionPending()}
      />

      {/* Job Success Modal */}
      <JobCompletedModal
        visible={jobCompletedModalVisible}
        onClose={() => setJobCompletedModalVisible(false)}
      />

      <CustomAlert
        visible={visible}
        title={alertConfig?.title || 'Alert'}
        message={alertConfig?.message || ''}
        type={alertConfig?.type || 'info'}
        onClose={hideAlert}
      />

      <ContactSelectionModal
        visible={isContactModalVisible}
        onClose={() => setIsContactModalVisible(false)}
        onVoiceCall={performVoiceCall}
        onWhatsAppCall={performWhatsAppCall}
        phoneNumber={customer?.phone_number || 'N/A'}
        storeName={customer?.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : 'Customer'}
      />
    </SafeAreaView>
  );
};

export default MechanicOrderDetails;
