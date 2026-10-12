import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  ChevronLeftIcon,
  UserIcon,
  MapPinIcon,
  IdentificationIcon
} from "react-native-heroicons/outline";

import AddressInput from "@/components/forms/AddressInput";
import InputField from "@/components/InputField";
import ImageUpload from "@/components/ImageUpload";
import SelfieUpload from "@/components/SelfieUpload";
import LivenessCamera from "@/components/LivenessCamera";
import SuccessModal from "@/components/modals/SuccessModal";
import ErrorModal from "@/components/modals/ErrorModal";
import SelectField from "@/components/forms/SelectField";
import { userAPI } from "@/lib/api/user";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useSubmitMerchantKYC, useSubmitVehicleRentalKYC, useActiveRoleProfile } from "@/hooks/useUserProfile";
import { useNINVerification } from "@/hooks/useNINVerification";
import NINVerificationSection from "@/components/forms/NINVerificationSection";
import { getStatesByCountry } from "@/constants/locationData";
import { getLGAs } from "@/constants/nigeriaData";
import { sellerRoutes } from "@/constants/routes";

interface FormValues {
  store_name: string;
  location: string;
  latitude: string;
  longitude: string;
  state: string;
  lga: string;
  nin_number: string;
}

interface DocumentFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

const CompleteKYC = () => {
  // Constants
  const nigerianStates = getStatesByCountry('NG');
  const states = nigerianStates.map(state => ({
    label: state.name,
    value: state.name
  }));

  const [selfie, setSelfie] = useState<DocumentFile | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'verifying_nin' | 'saving_profile'>('idle');
  const [ninVerificationError, setNinVerificationError] = useState<string | null>(null);
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const { data: activeProfileData, isLoading: isProfileLoading, primaryProfileData, isVehicleRental, isMechanic } = useActiveRoleProfile();
  
  // If active user is a mechanic, automatically redirect to mechanic KYC screen
  useEffect(() => {
    if (!isProfileLoading && isMechanic) {
      router.replace("/(root)/(screens)/(mechanic)/complete-kyc" as any);
    }
  }, [isProfileLoading, isMechanic]);

  const targetRole = isVehicleRental ? "vehicle_rental" : "merchant";
  const {
    isRoleNinVerified,
    verifiedNin,
    verifyNIN,
    isVerifying: isVerifyingNIN,
  } = useNINVerification(targetRole);

  const submitMerchantKYCMutation = useSubmitMerchantKYC();
  const submitRentalKYCMutation = useSubmitVehicleRentalKYC();
  
  const submitKYCMutation = isVehicleRental ? submitRentalKYCMutation : submitMerchantKYCMutation;

  // Dynamic Validation Schema based on NIMC verification status
  const validationSchema = React.useMemo(() => {
    return Yup.object().shape({
      store_name: Yup.string().trim().required(`${isVehicleRental ? "Company" : "Business"} name is required`),
      location: Yup.string().trim().required("Please enter your location"),
      latitude: Yup.string(),
      longitude: Yup.string(),
      state: Yup.string().trim().required("Please select your state"),
      lga: Yup.string().trim().required("Please select your LGA"),
      nin_number: isRoleNinVerified
        ? Yup.string() // NIMC verification already passed, don't fail on unmasked format
        : Yup.string()
            .trim()
            .required("NIN number is required")
            .test(
              "nin-format",
              "NIN must be exactly 11 digits",
              (val) => Boolean(val && (val.includes("*") || /^\d{11}$/.test(val.replace(/\s/g, ""))))
            ),
    });
  }, [isRoleNinVerified, isVehicleRental]);

  const [initialFormValues, setInitialFormValues] = useState<FormValues>({
    store_name: "",
    location: "",
    latitude: "",
    longitude: "",
    state: "",
    lga: "",
    nin_number: "",
  });

  // Sync verified NIN into initial form values when available
  useEffect(() => {
    if (verifiedNin && !initialFormValues.nin_number) {
      setInitialFormValues((prev) => ({
        ...prev,
        nin_number: verifiedNin,
      }));
    }
  }, [verifiedNin]);

  useEffect(() => {
    if (activeProfileData?.data) {
      const profile = isVehicleRental
        ? activeProfileData.data.vehicle_rental_profile
        : activeProfileData.data.merchant_profile;
      
      if (profile) {
        const initialValues: FormValues = {
          store_name: profile.store_name || (profile as any).company_name || "",
          location: profile.location || "",
          latitude: profile.latitude || "",
          longitude: profile.longitude || "",
          state: profile.state || "",
          lga: profile.lga || "",
          nin_number: profile.nin_number || verifiedNin || "",
        };

        setInitialFormValues(initialValues);

        if (profile.selfie) {
          setSelfie({
            uri: profile.selfie,
            name: "selfie.jpg",
            type: "image/jpeg",
            size: 0,
          });
        }
      }
      setIsLoadingProfile(false);
    } else if (!isProfileLoading && !primaryProfileData) {
      setIsLoadingProfile(false);
    }
  }, [activeProfileData, isProfileLoading, primaryProfileData, verifiedNin]);

  // Auto-sync location data if missing on mount
  useEffect(() => {
    const syncLocation = async () => {
      if (initialFormValues.location && (!initialFormValues.state || !initialFormValues.latitude)) {
        try {
          const geocoded = await Location.geocodeAsync(initialFormValues.location);
          if (geocoded.length > 0) {
            const { latitude, longitude } = geocoded[0];
            // Trigger the existing logic to fill state/lga
            await handleLocationSelect({
              address: initialFormValues.location,
              latitude,
              longitude
            }, (field: string, value: any) => {
              setInitialFormValues(prev => ({ ...prev, [field]: value }));
            });
          }
        } catch (error) {
          console.error("Auto-sync location error:", error);
        }
      }
    };

    if (!isLoadingProfile) {
      syncLocation();
    }
  }, [isLoadingProfile, initialFormValues.location]);

  if (isLoadingProfile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D30309" />
      </SafeAreaView>
    );
  }



  // Document Picking Logic
  const pickDocument = async () => {
    setShowLivenessModal(true);
  };

  const handleLivenessCapture = (uri: string) => {
    const file: DocumentFile = {
      uri: uri,
      name: `selfie_${Date.now()}.jpg`,
      type: "image/jpeg",
      size: 0, 
    };
    setSelfie(file);
    setShowLivenessModal(false);
  };

  // Location Selection Logic
  const handleLocationSelect = async (loc: any, setFieldValue: any) => {
    setFieldValue("location", loc.address || loc.name);
    
    if (loc.latitude && loc.longitude) {
      setFieldValue("latitude", String(loc.latitude));
      setFieldValue("longitude", String(loc.longitude));
      
      try {
        const reverseGeocoded = await Location.reverseGeocodeAsync({
          latitude: loc.latitude,
          longitude: loc.longitude
        });

        if (reverseGeocoded.length > 0) {
          const address = reverseGeocoded[0];
          const region = address.region; 
          const city = address.city || address.subregion;

          if (region) {
            const matchedState = states.find(s => s.label.toLowerCase() === region.toLowerCase());
            if (matchedState) {
              setFieldValue("state", matchedState.label);
              
              const potentialLGAs = [city, address.subregion, address.district].filter(Boolean);

              if (potentialLGAs.length > 0) {
                const availableLGAs = getLGAs(matchedState.label);

                const matchedLga = availableLGAs.find(lga => {
                  const lgaLower = lga.toLowerCase();
                  return potentialLGAs.some(candidate => {
                    const candidateLower = candidate?.toLowerCase() || '';
                    return candidateLower === lgaLower ||
                      candidateLower.includes(lgaLower) ||
                      lgaLower.includes(candidateLower);
                  });
                });

                if (matchedLga) {
                  setFieldValue("lga", matchedLga);
                }
              }
            }
          }
        }
      } catch (error) {
        console.log("Auto-fill location failed", error);
      }
    }
  };

  // Submission Logic
  const submitForm = async (values: FormValues) => {
    if (!selfie) {
      setErrorMessage("Please capture your selfie to continue.");
      setShowErrorModal(true);
      return;
    }

    setNinVerificationError(null);
    setIsSubmitting(true);
    try {
      // Step 1: Real-time NIMC NIN verification if not yet verified
      if (!isRoleNinVerified) {
        if (!values.nin_number) {
          setErrorMessage("Please enter your 11-digit NIN.");
          setShowErrorModal(true);
          return;
        }
        setSubmissionPhase('verifying_nin');
        try {
          await verifyNIN({
            nin_number: values.nin_number,
            role: targetRole,
          });
        } catch (ninErr: any) {
          setSubmissionPhase('idle');
          const errMsg =
            ninErr?.response?.data?.message ||
            ninErr?.message ||
            "NIN verification failed. Please check your 11-digit NIN and ensure your profile names match your official NIMC records.";
          setNinVerificationError(errMsg);
          setErrorMessage(errMsg);
          setShowErrorModal(true);
          return;
        }
      }

      setSubmissionPhase('saving_profile');

      const formData = new FormData();
      formData.append('requestType', 'inbound');
      formData.append(isVehicleRental ? 'company_name' : 'store_name', values.store_name);
      formData.append('location', values.location);
      if (values.state) formData.append('state', values.state);
      if (values.lga) formData.append('lga', values.lga);
      const ninToSubmit = values.nin_number || verifiedNin || (isRoleNinVerified ? "VERIFIED" : "");
      formData.append('nin_number', ninToSubmit);
      if (values.latitude) formData.append('latitude', values.latitude);
      if (values.longitude) formData.append('longitude', values.longitude);

      if (selfie) {
        formData.append('selfie', {
          uri: selfie.uri,
          name: selfie.name,
          type: selfie.type,
        } as any);
      }

      await submitKYCMutation.mutateAsync(formData);

      // Update global state
      useProfileStore.getState().setIsProfileComplete(true);

      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || "There was an error submitting your verification. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
      setSubmissionPhase('idle');
    }
  };

  // Helper Component for Section Headers
  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <View className="flex-row items-center space-x-2 mb-4">
      <View className="bg-primary-50 p-2 rounded-lg">
        <Icon size={20} color="#D30309" strokeWidth={2} />
      </View>
      <Text className="text-lg font-NunitoBold text-gray-900">{title}</Text>
    </View>
  );

  const headerTitle = isVehicleRental ? "Vehicle Rental Verification" : "Merchant Verification";
  const storeLabel = isVehicleRental ? "Company Name" : "Business Name";
  const storePlaceholder = isVehicleRental ? "Enter your company name" : "Enter your business name";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-6 py-4 bg-white flex-row items-center space-x-4 border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
        >
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-NunitoBold text-gray-900">{headerTitle}</Text>
      </View>

      <KeyboardAwareScrollView
        enableAutomaticScroll={true}
        extraScrollHeight={120} 
        extraHeight={120} 
        keyboardOpeningTime={0} 
        enableResetScrollToCoords={false}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Formik
          initialValues={initialFormValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={submitForm}
        >
          {({ handleChange, handleBlur, handleSubmit, validateForm, setTouched, values, errors, touched, setFieldValue }) => (
            <View className="p-6 space-y-8">
              
              {/* Identity Section */}
              <View className="bg-white p-3 rounded-[20px] shadow-sm border border-gray-100">
                <SectionHeader icon={UserIcon} title="Identity Details" />
                
                <View className="space-y-4">
                  <SelfieUpload
                    onPress={pickDocument}
                    imageUri={selfie?.uri}
                  />
                </View>
              </View>

              {/* Business Location Section */}
              <View className="bg-white p-3 rounded-[20px] my-3 shadow-sm border border-gray-100" style={{ zIndex: 50 }}>
                <SectionHeader icon={MapPinIcon} title="Business Location" />
                
                <View className="space-y-4" style={{ zIndex: 50 }}>
                  <View style={{ zIndex: 60, elevation: 60 }}>
                  <AddressInput
                    label="Business Location"
                    placeholder="Search for your shop address"
                    value={values.location}
                    onChangeText={handleChange("location")}
                    onLocationSelect={(loc: any) => handleLocationSelect(loc, setFieldValue)}
                    error={errors.location}
                    touched={touched.location}
                    required
                    showCurrentLocationButton={true}
                  />
                  </View>


                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <SelectField
                        name="state"
                        label="State"
                        placeholder="Select State"
                        options={states}
                        value={values.state}
                        onValueChange={(val) => {
                          setFieldValue("state", val);
                          setFieldValue("lga", ""); // Reset LGA when state changes
                        }}
                        error={errors.state as string}
                        touched={touched.state}
                        required
                      />
                    </View>
                    <View className="flex-1">
                      <SelectField
                        name="lga"
                        label="LGA"
                        placeholder="Select LGA"
                        options={values.state ? getLGAs(values.state).map(lga => ({ label: lga, value: lga })) : []}
                        value={values.lga}
                        onValueChange={(val) => setFieldValue("lga", val)}
                        error={errors.lga as string}
                        touched={touched.lga}
                        required
                        // @ts-ignore - disabled prop not in SelectFieldProps but might be needed/added later
                        disabled={!values.state}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Documentation Section */}
              <View className="bg-white p-3 rounded-[20px] shadow-sm border border-gray-100">
                <SectionHeader icon={IdentificationIcon} title="Business Documentation" />
                
                <View className="space-y-4">
                  <InputField
                    label={storeLabel}
                    placeholder={storePlaceholder}
                    value={values.store_name}
                    onChangeText={handleChange("store_name")}
                    onBlur={handleBlur("store_name")}
                    error={errors.store_name}
                    touched={touched.store_name}
                    required
                  />

                  <NINVerificationSection
                    ninValue={values.nin_number}
                    onChangeNIN={(text) => {
                      setFieldValue("nin_number", text);
                      if (ninVerificationError) setNinVerificationError(null);
                    }}
                    isVerified={isRoleNinVerified}
                    maskedNin={verifiedNin}
                    error={errors.nin_number as string}
                    touched={touched.nin_number}
                    isVerifying={isVerifyingNIN || submissionPhase === 'verifying_nin'}
                    verificationError={ninVerificationError}
                  />
                </View>
              </View>

              {(() => {
                const isWorking = isSubmitting || submissionPhase !== 'idle' || isVerifyingNIN;

                const buttonLabel = () => {
                  if (submissionPhase === 'verifying_nin' || isVerifyingNIN) {
                    return "Verifying Identity with NIMC…";
                  }
                  if (submissionPhase === 'saving_profile' || isSubmitting) {
                    return "Saving Profile & Documents…";
                  }
                  return "Submit Verification";
                };

                const handlePressSubmit = async () => {
                  setTouched({
                    store_name: true,
                    location: true,
                    state: true,
                    lga: true,
                    nin_number: true,
                  });

                  const formErrors = await validateForm();

                  if (!selfie) {
                    setErrorMessage("Please capture your selfie to continue.");
                    setShowErrorModal(true);
                    return;
                  }

                  const errorKeys = Object.keys(formErrors);
                  if (errorKeys.length > 0) {
                    const firstErrorMessage = formErrors[errorKeys[0] as keyof typeof formErrors];
                    setErrorMessage(
                      typeof firstErrorMessage === "string"
                        ? firstErrorMessage
                        : "Please complete all required fields."
                    );
                    setShowErrorModal(true);
                    return;
                  }

                  handleSubmit();
                };

                return (
                  <TouchableOpacity
                    onPress={handlePressSubmit}
                    className={`py-4 rounded-xl mb-8 mt-5 items-center shadow-md flex-row justify-center ${
                      isWorking ? 'bg-primary-300' : 'bg-primary-500'
                    }`}
                    disabled={isWorking}
                  >
                    {isWorking ? (
                      <View className="flex-row items-center justify-center">
                        <ActivityIndicator color="white" />
                        <Text className="text-white font-NunitoBold text-lg ml-3">
                          {buttonLabel()}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-white font-NunitoBold text-lg">{buttonLabel()}</Text>
                    )}
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        </Formik>
      </KeyboardAwareScrollView>

        <Modal
          visible={showLivenessModal}
          animationType="slide"
          onRequestClose={() => setShowLivenessModal(false)}
        >
          <LivenessCamera
            onCapture={handleLivenessCapture}
            onCancel={() => setShowLivenessModal(false)}
          />
        </Modal>

        <SuccessModal
          isVisible={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            router.replace(sellerRoutes.home as any);
          }}
          title="Verification Submitted 🎉"
          message={`Your ${isVehicleRental ? 'vehicle rental' : 'merchant'} profile verification has been submitted successfully and will be reviewed and approved in less than 24 hours.`}
          buttonText="Go to Dashboard"
        />

        <ErrorModal
          isVisible={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Verification Failed"
          message={errorMessage}
          buttonText="Try Again"
        />
    </SafeAreaView>
  );
};

export default CompleteKYC;