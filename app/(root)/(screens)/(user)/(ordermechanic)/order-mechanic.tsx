import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Keyboard, Platform, Dimensions, KeyboardAvoidingView, TouchableOpacity, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '@/components/CustomButton';
import SelectField from '@/components/forms/SelectField';
import MultiSelectField from '@/components/forms/MultiSelectField';
import TextArea from '@/components/forms/TextArea';
import BackArrowBtn from '@/components/BackArrowBtn';
import AddressInput from '@/components/forms/AddressInput';
import DateInput from '@/components/forms/DateInput';
import { useCreateRepairRequest } from '@/hooks/useMechanic';
import { router, useLocalSearchParams } from 'expo-router';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useVehicleMakes } from '@/hooks/useVehicleMakes';
import { getErrorMessage, getApiErrorMessage } from '@/utils/errorMessages';
import { routes } from '@/constants/routes';
import { useRepairRequestDetail, useUpdateRepairRequest } from '@/hooks/useRepairRequests';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CheckCircleIcon } from 'react-native-heroicons/solid';

const OrderMechanic = () => {
  const params = useLocalSearchParams();
  const mechanicIdParam = Array.isArray(params?.mechanicId)
    ? params?.mechanicId[0]
    : (params?.mechanicId as string | undefined);
  const mechanicName = Array.isArray(params?.mechanicName)
    ? params?.mechanicName[0]
    : (params?.mechanicName as string | undefined);
  const orderIdParam = Array.isArray(params?.orderId)
    ? params?.orderId[0]
    : (params?.orderId as string | undefined);
  const editMode = params?.editMode === 'true';

  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceLatitude, setServiceLatitude] = useState<number | undefined>(undefined);
  const [serviceLongitude, setServiceLongitude] = useState<number | undefined>(undefined);
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [notes, setNotes] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: string]: View | null }>({});

  const { mutate: createRepairRequest, isPending, error } = useCreateRepairRequest();
  const { mutate: updateRepairRequest, isPending: isUpdating, error: updateError } = useUpdateRepairRequest();

  // Fetch existing order data if in edit mode
  const { 
    data: existingOrderData, 
    isLoading: isLoadingOrder,
    error: orderError 
  } = useRepairRequestDetail(editMode ? orderIdParam : undefined);

  // Fetch vehicle makes from API
  const { data: vehicleMakes, loading: vehicleMakesLoading } = useVehicleMakes();

  // Fetch service types from API
  const { serviceTypes, loading: serviceTypesLoading, error: serviceTypesError } = useServiceTypes();

  // Convert vehicle makes to select options
  const vehicleMakeOptions = useMemo(() => {
    if (!vehicleMakes || vehicleMakes.length === 0) return [];

    return vehicleMakes
      .filter((make) => make.is_active)
      .map((make) => ({
        label: make.name,
        value: make.id.toString(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicleMakes]);

  // Get models for selected make
  const getModelsForSelectedMake = useCallback((makeId: string) => {
    if (!makeId || !vehicleMakes) return [];
    const selectedMake = vehicleMakes.find((make) => make.id.toString() === makeId);
    return selectedMake?.models || [];
  }, [vehicleMakes]);

  // Map models for selected make to options
  const vehicleModelOptions = useMemo(() => {
    if (!vehicleMake) return [];
    const models = getModelsForSelectedMake(vehicleMake);
    return models
      .filter((model) => model.is_active)
      .map((model) => ({
        label: model.name,
        value: model.id.toString(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicleMake, getModelsForSelectedMake]);

  const vehicleYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 50 }, (_: any, i: number) => {
      const year = currentYear - i;
      return { label: year.toString(), value: year.toString() };
    });
  }, []);

  const timeSlotOptions = useMemo(
    () => [
      { label: 'Morning (8am - 12pm)', value: 'morning' },
      { label: 'Afternoon (12pm - 4pm)', value: 'afternoon' },
      { label: 'Evening (4pm - 8pm)', value: 'evening' },
    ],
    []
  );

  // Track currently focused input
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Get mechanic ID from order data or params
  const mechanicId = useMemo(() => {
    if (editMode && existingOrderData?.data?.mechanic?.id) {
      return existingOrderData.data.mechanic.id.toString();
    }
    return mechanicIdParam;
  }, [editMode, existingOrderData, mechanicIdParam]);

  // Prefill form when in edit mode and order data is loaded
  useEffect(() => {
    if (editMode && existingOrderData?.data && !isLoadingOrder) {
      const order = existingOrderData.data;
      
      // Set form values from existing order
      if (Array.isArray((order as any).service_categories)) {
        setSelectedServiceTypes(((order as any).service_categories as any[]).map((x) => String(x)));
      } else if (Array.isArray((order as any).service_types)) {
        // Backwards compatibility with older payloads
        setSelectedServiceTypes(((order as any).service_types as any[]).map((x) => String(x)));
      } else if (order.service_type) {
        setSelectedServiceTypes([String(order.service_type)]);
      }
      if (order.vehicle_make) setVehicleMake(order.vehicle_make.toString());
      if (order.vehicle_model) setVehicleModel(order.vehicle_model.toString());
      if (order.vehicle_year) setVehicleYear(order.vehicle_year.toString());
      if (order.problem_description) setProblemDescription(order.problem_description);
      if (order.service_address) setServiceAddress(order.service_address);
      if (order.service_latitude) setServiceLatitude(parseFloat(order.service_latitude));
      if (order.service_longitude) setServiceLongitude(parseFloat(order.service_longitude));
      if (order.preferred_date) {
        const date = new Date(order.preferred_date);
        setPreferredDate(date);
      }
      if (order.preferred_time_slot) setPreferredTimeSlot(order.preferred_time_slot);
      if (order.notes) setNotes(order.notes);
    }
  }, [editMode, existingOrderData, isLoadingOrder]);

  // Function to scroll input into view
  const scrollInputIntoView = useCallback((inputKey: string) => {
    if (!scrollViewRef.current || !inputRefs.current[inputKey]) return;

    // Wait a bit for keyboard to fully show and layout to settle
    setTimeout(() => {
      // Use measureInWindow for more reliable positioning
      inputRefs.current[inputKey]?.measureInWindow((x, y, width, height) => {
        if (!scrollViewRef.current) return;

        const screenHeight = Dimensions.get('window').height;
        // Use current keyboardHeight or estimate 300px if not set yet
        const currentKeyboardHeight = keyboardHeight || 300;
        const visibleAreaBottom = screenHeight - currentKeyboardHeight;
        const inputBottom = y + height;
        const padding = 30; // Padding above keyboard

        // If input would be hidden by keyboard, scroll it into view
        if (inputBottom > visibleAreaBottom - padding) {
          // Calculate scroll offset needed
          const scrollOffset = inputBottom - (visibleAreaBottom - padding);

          // Scroll to make input visible
          scrollViewRef.current.scrollTo({
            y: Math.max(0, scrollOffset),
            animated: true,
          });
        }
      });
    }, Platform.OS === 'ios' ? 100 : 200);
  }, [keyboardHeight]);

  // Keyboard listeners to track keyboard height and auto-scroll
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Auto-scroll if an input is focused
        if (focusedInput) {
          setTimeout(() => {
            scrollInputIntoView(focusedInput);
          }, Platform.OS === 'ios' ? 100 : 200);
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setFocusedInput(null);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [focusedInput, scrollInputIntoView]);

  const handleSubmitRequest = () => {
    // if (!mechanicId) {
    //   Alert.alert('Missing mechanic', 'Unable to submit request. Mechanic details are missing.');
    //   return;
    // }

    if (
      selectedServiceTypes.length === 0 ||
      !vehicleMake ||
      !vehicleModel ||
      !vehicleYear ||
      !problemDescription.trim() ||
      !serviceAddress.trim() ||
      (isScheduled && (!preferredDate || !preferredTimeSlot))
    ) {
      Alert.alert('Incomplete details', 'Please fill in all required fields before submitting.');
      return;
    }

    const vehicleYearNumber = parseInt(vehicleYear, 10);
    if (Number.isNaN(vehicleYearNumber)) {
      Alert.alert('Invalid year', 'Please select a valid vehicle year.');
      return;
    }

    const payload: any = {
      data: {
        ...(mechanicId && { mechanic_id: mechanicId }),
        ...(selectedServiceTypes.length === 1
          ? { service_type: selectedServiceTypes[0] }
          : { service_categories: selectedServiceTypes }),
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYearNumber,
        problem_description: problemDescription.trim(),
        service_address: serviceAddress.trim(),
        service_latitude: serviceLatitude ? parseFloat(serviceLatitude.toFixed(5)) : undefined,
        service_longitude: serviceLongitude ? parseFloat(serviceLongitude.toFixed(5)) : undefined,
        schedule: isScheduled,
        ...(isScheduled && {
          preferred_date: preferredDate?.toISOString().split('T')[0],
          preferred_time_slot: preferredTimeSlot,
        }),
        notes: notes.trim() || undefined,
      },
      requestType: 'inbound',
    };

    try {
      if (editMode && orderIdParam) {
        // Update existing request
        updateRepairRequest(
          { requestId: orderIdParam, payload },
          {
            onSuccess: (response: any) => {
              // Show success modal
              setSuccessOrderId(orderIdParam);
              setShowSuccessModal(true);
            },
            onError: (err: any) => {
              try {
                const errorMessage = getApiErrorMessage(err, 'general');
                Alert.alert('Update failed', errorMessage);
              } catch (alertError) {
                console.error('Error displaying error message:', alertError);
                Alert.alert('Update failed', 'An error occurred. Please try again.');
              }
            },
          }
        );
      } else {
        // Create new request
        createRepairRequest(payload, {
          onSuccess: (response: any) => {
            // Extract order ID from response
            const orderId = response?.data?.id || response?.id || response?.data?.repair_request_id;
            
            if (orderId) {
              // Show success modal
              setSuccessOrderId(orderId.toString());
              setShowSuccessModal(true);
            } else {
              // Fallback to alert if no order ID
              Alert.alert(
                'Request submitted',
                'Your repair request has been sent to the mechanic. You will be notified once they respond.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.back();
                    },
                  },
                ]
              );
            }
          },
          onError: (err: any) => {
            try {
              // Use the utility function for user-friendly error messages
              const errorMessage = getApiErrorMessage(err, 'general');
              Alert.alert('Submission failed', errorMessage);
            } catch (alertError) {
              // Fallback if Alert.alert itself fails
              console.error('Error displaying error message:', alertError);
              Alert.alert('Submission failed', 'An error occurred. Please try again.');
            }
          },
        });
      }
    } catch (error) {
      // Catch any synchronous errors
      console.error('Error submitting repair request:', error);
      Alert.alert(
        'Submission failed',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
    }
  };

  const handleViewOrder = () => {
    setShowSuccessModal(false);
    if (successOrderId) {
      router.push({
        pathname: routes.trackMechanicOrder,
        params: {
          orderId: successOrderId,
        },
      });
    }
  };

  const handleGoHome = () => {
    setShowSuccessModal(false);
    router.replace(routes.home);
  };


  return (
    <SafeAreaView className="bg-white flex-1" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
        <BackArrowBtn />

        <Text className="text-xl font-NunitoBold text-gray-900">
          {editMode ? 'Edit Request' : 'Order mechanic'}
        </Text>

        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Loading state for edit mode */}
          {editMode && isLoadingOrder && (
            <View className="py-8 items-center">
              <LoadingSpinner size="medium" />
              <Text className="text-gray-600 mt-4 font-NunitoMedium">
                Loading order details...
              </Text>
            </View>
          )}

          {/* Error state for edit mode */}
          {editMode && orderError && (
            <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600 text-sm font-NunitoMedium text-center">
                {getApiErrorMessage(orderError, 'general')}
              </Text>
            </View>
          )}

          {/* Instruction Text */}
          {!isLoadingOrder && (
            <Text className="text-base text-gray-600 font-NunitoMedium mb-6 text-center">
              {editMode 
                ? 'Update the details below to modify your repair request.'
                : "Share the details below and we'll send your repair request to the mechanic."}
            </Text>
          )}

          {/* {mechanicName && (
          <View className="mb-6 rounded-2xl bg-primary-50 border border-primary-100 p-4">
            <Text className="text-sm font-NunitoMedium text-primary-700">Sending to</Text>
            <Text className="text-lg font-NunitoBold text-primary-900 mt-1">{mechanicName}</Text>
          </View>
        )} */}

          <MultiSelectField
            name="serviceType"
            label="Service Type"
            placeholder="Select the service you need"
            options={serviceTypes}
            value={selectedServiceTypes}
            onValueChange={setSelectedServiceTypes}
          />

          <SelectField
            name="vehicleMake"
            label="Vehicle Make"
            placeholder={vehicleMakesLoading ? "Loading makes..." : "Select your vehicle make"}
            options={vehicleMakeOptions}
            value={vehicleMake}
            onValueChange={(value) => {
              setVehicleMake(value);
              setVehicleModel(''); // Reset model when make changes
            }}
          />

          <SelectField
            name="vehicleModel"
            label="Vehicle Model"
            placeholder={vehicleMake ? (vehicleMakesLoading ? "Loading models..." : "Select your vehicle model") : "Select make first"}
            options={vehicleModelOptions}
            value={vehicleModel}
            onValueChange={setVehicleModel}
          />

          <SelectField
            name="vehicleYear"
            label="Vehicle Year"
            placeholder="Select your vehicle year"
            options={vehicleYearOptions}
            value={vehicleYear}
            onValueChange={setVehicleYear}
          />

          <View
            ref={(ref) => {
              inputRefs.current['problemDescription'] = ref;
            }}
          >
            <TextArea
              label="Problem Description"
              placeholder="Tell the Mechanic what's Wrong with your Vehicle"
              value={problemDescription}
              onChangeText={setProblemDescription}
              rows={6}
              onFocus={() => {
                setFocusedInput('problemDescription');
                scrollInputIntoView('problemDescription');
              }}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View
            className="mb-2"
            ref={(ref) => {
              inputRefs.current['address'] = ref;
            }}
          >
            <AddressInput
              label="Service Address"
              placeholder="Where should the mechanic meet you?"
              value={serviceAddress}
              onChangeText={(text) => setServiceAddress(text)}
              onLocationSelect={(location) => {
                setServiceAddress(location.address || location.name);
                setServiceLatitude(location.latitude);
                setServiceLongitude(location.longitude);
              }}
              required
              numberOfLines={2}
              multiline={true}
              scrollViewRef={scrollViewRef as React.RefObject<ScrollView>}
              showCurrentLocationButton
            />
          </View>

          {/* Scheduling Section */}
          <View className="mt-4 mb-2">
            <View className="flex-row items-center justify-between mb-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <View className="flex-1 mr-3">
                <Text className="text-base font-NunitoBold text-gray-900">Schedule for later</Text>
                <Text className="text-sm font-NunitoRegular text-gray-500 mt-0.5">
                  Book a mechanic for a specific date & time
                </Text>
              </View>
              <Switch
                value={isScheduled}
                onValueChange={setIsScheduled}
                trackColor={{ false: '#D1D5DB', true: '#D30309' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isScheduled && (
              <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                <View
                  ref={(ref) => {
                    inputRefs.current['date'] = ref;
                  }}
                >
                  <DateInput
                    label="Preferred Date"
                    placeholder="Select date"
                    value={preferredDate}
                    onDateChange={setPreferredDate}
                    required
                    minimumDate={new Date()}
                    showTodayButton
                  />
                </View>

                <View className="mt-4">
                  <SelectField
                    name="timeSlot"
                    label="Preferred Time Slot"
                    placeholder="Select a time slot"
                    options={timeSlotOptions}
                    value={preferredTimeSlot}
                    onValueChange={setPreferredTimeSlot}
                  />
                </View>
              </View>
            )}
          </View>

          <View
            ref={(ref) => {
              inputRefs.current['notes'] = ref;
            }}
          >
            <TextArea
              label="Additional Notes (Optional)"
              placeholder="Share access instructions, parking info or other helpful notes"
              value={notes}
              onChangeText={setNotes}
              rows={4}
              onFocus={() => {
                setFocusedInput('notes');
                scrollInputIntoView('notes');
              }}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

        </ScrollView>

          {/* Error Display */}
          {(error || updateError) && (
            <View className="mx-5 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600 text-sm font-NunitoMedium text-center">
                {getApiErrorMessage(error || updateError, 'general')}
              </Text>
            </View>
          )}
        {!isLoadingOrder && (
          <View className="px-5 py-4 bg-white border-t border-gray-100 pb-10">
            <CustomButton
              title={
                editMode
                  ? (isUpdating ? "Updating request..." : "Update Request")
                  : (isPending ? "Submitting request..." : "Submit Request")
              }
              onPress={handleSubmitRequest}
              bgVariant="primary"
              // className="py-4"
              loading={isPending || isUpdating}
              disabled={isPending || isUpdating}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-2xl w-full max-w-sm p-6 items-center">
            {/* Success Icon */}
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
              <CheckCircleIcon size={48} color="#10B981" />
            </View>

            {/* Success Message */}
            <Text className="text-xl font-NunitoBold text-gray-900 mb-2 text-center">
              {editMode ? 'Request Updated!' : 'Request Submitted!'}
            </Text>
            <Text className="text-base font-NunitoMedium text-gray-600 mb-6 text-center">
              {editMode 
                ? 'Your Repair Request has been Successfully Updated.'
                : 'Your Repair Request has been Sent to the Mechanic. You will be notified once they respond.'}
            </Text>

            {/* Action Buttons */}
            <View className="w-full space-y-3">
              <CustomButton
                title="View Order"
                onPress={handleViewOrder}
                bgVariant="primary"
                className="py-3 mb-3"
              />
              <CustomButton
                title="Go Home"
                onPress={handleGoHome}
                bgVariant="outline"
                textVariant="outline"
                className="py-3"
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OrderMechanic;