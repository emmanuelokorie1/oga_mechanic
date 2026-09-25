import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
  LayoutAnimation,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeftIcon,
  UserIcon,
  MapPinIcon,
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";


import AddressInput from "@/components/forms/AddressInput";
import SelectField from "@/components/forms/SelectField";
import MultiSelectField from "@/components/forms/MultiSelectField";
import InputField from "@/components/InputField";
import TextArea from "@/components/forms/TextArea";
import ImageUpload from "@/components/ImageUpload";
import LivenessCamera from "@/components/LivenessCamera";
import ProfileCompletionModal from "@/components/modals/ProfileCompletionModal";
import ExpertiseRecordItem from "@/components/mechanic/ExpertiseRecordItem";
import SelfieUpload from "@/components/SelfieUpload";
import CustomAlert from "@/components/CustomAlert";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import { userAPI } from "@/lib/api/user";
import { mechanicAPI } from "@/lib/api/mechanic";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useSubmitMechanicKYC, useSubmitVehicleExpertise } from "@/hooks/useUserProfile";
import { mechanicRoutes } from "@/constants/routes";
import { getStatesByCountry } from "@/constants/locationData";
import { getLGAs } from "@/constants/nigeriaData";
import * as Location from "expo-location";

// Step 1 Validation Schema
const step1ValidationSchema = Yup.object().shape({
  location: Yup.string().required("Please enter your location"),
  state: Yup.string().required("Please select your state"),
  lga: Yup.string().required("Please select your LGA"),
  bio: Yup.string().required("Please tell us about your experience"),
  nin_number: Yup.string().required("NIN is required"),
  specializations: Yup.array().min(1, "Select at least one specialization").required("Specializations are required"),
});

interface FormValues {
  location: string;
  latitude: string;
  longitude: string;
  state: string;
  lga: string;
  bio: string;
  nin_number: string;
  specializations: string[];
}

interface ExpertiseRecord {
  vehicle_make_id: string;
  years_of_experience: string;
  certification_level: string;
}

interface DocumentFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

const CompleteKYC = () => {
  const params = useLocalSearchParams();
  const initialStep = params.step ? parseInt(params.step as string, 10) : 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [ninDocument, setNinDocument] = useState<DocumentFile | null>(null);
  const [selfie, setSelfie] = useState<DocumentFile | null>(null);
  const [certificateOfLearning, setCertificateOfLearning] = useState<DocumentFile | null>(null);

  const submitKYCMutation = useSubmitMechanicKYC();
  const submitExpertiseMutation = useSubmitVehicleExpertise();
  
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const { visible, alertConfig, hideAlert, showSuccess, showError, showWarning } = useCustomAlert()
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingExpertise, setIsLoadingExpertise] = useState(true);
  
  // Dynamic Dropdown Options
  const [specializationsOptions, setSpecializationsOptions] = useState<{label: string, value: string}[]>([]);
  const [carBrandsOptions, setCarBrandsOptions] = useState<{label: string, value: string}[]>([]);
  
  // Step 2 State
  const [expertiseRecords, setExpertiseRecords] = useState<ExpertiseRecord[]>([]);

  const nigerianStates = getStatesByCountry('NG');
  const states = nigerianStates.map(state => ({
    label: state.name,
    value: state.name
  }));

  const certificationLevels = [
    { label: "Basic", value: "basic" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
    { label: "Expert", value: "expert" },
    { label: "Certified", value: "certified" },
  ];

  const [initialFormValues, setInitialFormValues] = useState<FormValues>({
    location: "",
    latitude: "",
    longitude: "",
    state: "",
    lga: "",
    bio: "",
    nin_number: "",
    specializations: [],
  });

  const [isPendingApproval, setIsPendingApproval] = useState(false);


  // Cleanup expertise records on unmount to prevent stale data
  useEffect(() => {
    return () => {
      setExpertiseRecords([]);
      setIsLoadingExpertise(true);
      setIsLoadingProfile(true);
    };
  }, []);

  useEffect(() => {
    const fetchProfileAndOptions = async () => {
      try {
        // Fetch Profile
        const profileResponse = await userAPI.getMechanicProfile();
        if (profileResponse?.data?.has_mechanic_profile) {
          const profile = profileResponse.data.mechanic_profile;
          const kyc = profileResponse.data.kyc;
          
          setIsPendingApproval(Boolean(kyc?.is_complete && !profile?.is_approved));
          
          setInitialFormValues({
            location: profile.location || "",
            latitude: profile.latitude || "",
            longitude: profile.longitude || "",
            state: profile.state || "",
            lga: profile.lga || "",
            bio: profile.bio || "",
            nin_number: profile.nin_number || "",
            specializations: Array.isArray(profile.specializations) ? profile.specializations.map(String) : [],
          });
        }

        // Fetch Dropdown Options
        try {
          const specsResponse = await mechanicAPI.getSpecializations();
          const specs = Array.isArray(specsResponse) ? specsResponse : (specsResponse as any)?.data || (specsResponse as any)?.results || [];
          setSpecializationsOptions(specs.map((item: any) => ({
            label: item.name || String(item.id),
            value: String(item.id)
          })));

          const expertiseResponse = await mechanicAPI.getVehicleMakes();
          const expertises = Array.isArray(expertiseResponse) ? expertiseResponse : (expertiseResponse as any)?.data || (expertiseResponse as any)?.results || [];
          setCarBrandsOptions(expertises.map((item: any) => ({
            label: item.name || String(item.id),
            value: String(item.id)
          })));

          // Fetch Existing Expertise Records
          try {
            const currentExpertiseResponse = await mechanicAPI.getVehicleExpertise();
            const currentRecords = Array.isArray(currentExpertiseResponse) 
              ? currentExpertiseResponse 
              : currentExpertiseResponse?.data || currentExpertiseResponse?.results || [];
            
            if (currentRecords.length > 0) {
              setExpertiseRecords(currentRecords.map((item: any) => ({
                vehicle_make_id: String(item.vehicle_make_id || item.vehicle_make?.id || ""),
                years_of_experience: String(item.years_of_experience || ""),
                certification_level: item.certification_level || "basic"
              })));
            }
          } catch (expertiseError) {
            console.warn("Failed to fetch existing expertise records:", expertiseError);
          }
        } catch (optionsError) {
          console.warn("Failed to fetch dropdown options:", optionsError);
        }

      } catch (error) {
        console.log("Error prefilling mechanic profile:", error);
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingExpertise(false);
      }
    };
    fetchProfileAndOptions();
  }, []);

  // Auto-sync location data if missing on mount
  useEffect(() => {
    const syncLocation = async () => {
      if (initialFormValues.location && (!initialFormValues.state || !initialFormValues.latitude)) {
        try {
          const geocoded = await Location.geocodeAsync(initialFormValues.location);
          if (geocoded.length > 0) {
            const { latitude, longitude } = geocoded[0];
            await handleLocationSelect({
              address: initialFormValues.location,
              latitude,
              longitude
            }, (field: string, value: any) => {
              setInitialFormValues(prev => ({ ...prev, [field]: value }));
            });
          }
        } catch (error) {
          console.error("Mechanic Auto-sync location error:", error);
        }
      }
    };

    if (!isLoadingProfile) {
      syncLocation();
    }
  }, [isLoadingProfile, initialFormValues.location]);

  // Automatically add first row when entering Step 2 if none exist and not loading
  useEffect(() => {
    if (currentStep === 2 && !isLoadingExpertise && expertiseRecords.length === 0) {
      addExpertiseRow();
    }
  }, [currentStep, isLoadingExpertise]);

  if (isLoadingProfile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D30309" />
      </SafeAreaView>
    );
  }

  // Document Picking Logic
  const pickDocument = async (type: "nin_document" | "selfie" | "certificate_of_learning") => {
    if (type === 'selfie') {
      setShowLivenessModal(true);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showWarning("Permission Required", "Please grant camera roll permissions.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file: DocumentFile = {
          uri: asset.uri,
          name: `${type}_${Date.now()}.jpg`,
          type: "image/jpeg",
          size: asset.fileSize || 0,
        };

        switch (type) {
          case "nin_document": setNinDocument(file); break;
          case "certificate_of_learning": setCertificateOfLearning(file); break;
        }
      }
    } catch (error) {
      showError("Error", "Failed to select document.");
    }
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
        console.log("Mechanic auto-fill location failed", error);
      }
    }
  };

  // Step 1 Submission
  const handleStep1Submit = async (values: FormValues) => {
    if (!ninDocument) {
      showWarning("Required", "Please upload your NIN document.");
      return;
    }
    if (!selfie) {
      showWarning("Required", "Please capture your selfie to continue.");
      return;
    }

    try {
      let finalLat = values.latitude;
      let finalLng = values.longitude;

      if (!finalLat || !finalLng) {
        try {
          const geocoded = await Location.geocodeAsync(values.location);
          if (geocoded.length > 0) {
            finalLat = String(geocoded[0].latitude);
            finalLng = String(geocoded[0].longitude);
          } else {
            finalLat = "6.5244";
            finalLng = "3.3792";
          }
        } catch (err) {
          finalLat = "6.5244";
          finalLng = "3.3792";
        }
      }

      const formData = new FormData();
      formData.append('requestType', 'inbound');
      formData.append('location', values.location);
      if (values.state) formData.append('state', values.state);
      if (values.lga) formData.append('lga', values.lga);
      if (finalLat) formData.append('latitude', finalLat);
      if (finalLng) formData.append('longitude', finalLng);
      formData.append('bio', values.bio);
      formData.append('nin_number', values.nin_number);
      formData.append('specializations', JSON.stringify(values.specializations));

      const getFileObject = (image: any) => {
        if (!image || !image.uri) return null;
        if (image.uri.startsWith('http')) return image.uri;
        return {
          uri: image.uri,
          name: image.name || `file_${Date.now()}.jpg`,
          type: image.type || 'image/jpeg'
        } as any;
      };

      if (ninDocument) {
        const file = getFileObject(ninDocument);
        if (file) formData.append('nin_document', file);
      }

      if (selfie) {
        const file = getFileObject(selfie);
        if (file) formData.append('selfie', file);
      }

      if (certificateOfLearning) {
        const file = getFileObject(certificateOfLearning);
        if (file) formData.append('certificate_of_learning', file);
      }

      submitKYCMutation.mutate(formData, {
        onSuccess: () => {
          setCurrentStep(2);
        },
        onError: (error: any) => {
          const errMsg = error?.response?.data?.message || 
                         error?.response?.data?.detail || 
                         error?.message || 
                         "There was an error submitting your verification. Please try again.";
          showError("Submission Failed", errMsg);
        }
      });
    } catch (error: any) {
      showError("Error", "Failed to prepare submission data.");
    }
  };

  // Step 2 Submission
  const handleStep2Submit = async () => {
    if (expertiseRecords.length === 0) {
      showWarning("Required", "Please add at least one vehicle brand expertise.");
      return;
    }

    const isValid = expertiseRecords.every(r => r.vehicle_make_id && r.years_of_experience && r.certification_level);
    if (!isValid) {
      showWarning("Incomplete", "Please fill in all details for each vehicle expertise.");
      return;
    }

    const payload = expertiseRecords.map(r => ({
      vehicle_make_id: parseInt(r.vehicle_make_id),
      years_of_experience: parseInt(r.years_of_experience),
      certification_level: r.certification_level
    }));

    submitExpertiseMutation.mutate(payload, {
      onSuccess: () => {
        useProfileStore.getState().setIsProfileComplete(true);
        showSuccess("Verification Complete! 🎉", "Your profile and vehicle expertise have been submitted successfully. We'll review your application within 24 hours.", {
            onButtonPress: () => {
                hideAlert();
                router.replace(mechanicRoutes.home as any);
            }
        });
      },
      onError: (error: any) => {
        const errMsg = error?.response?.data?.message || error?.message || "Failed to save expertise.";
        showError("Submission Failed", errMsg);
      }
    });
  };


  const addExpertiseRow = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpertiseRecords([...expertiseRecords, { vehicle_make_id: "", years_of_experience: "", certification_level: "basic" }]);
  };

  const removeExpertiseRow = (index: number) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    const newRecords = [...expertiseRecords];
    newRecords.splice(index, 1);
    setExpertiseRecords(newRecords);
  };

  const updateExpertiseRecord = (index: number, field: keyof ExpertiseRecord, value: string) => {
    const newRecords = [...expertiseRecords];
    newRecords[index] = { ...newRecords[index], [field]: value };
    setExpertiseRecords(newRecords);
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <View className="flex-row items-center space-x-2 mb-4">
      <View className="bg-primary-50 p-2 rounded-full">
        <Icon size={20} color="#000" />
      </View>
      <Text className="text-lg font-NunitoBold text-gray-900">{title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <TouchableOpacity onPress={() => currentStep === 1 ? router.back() : setCurrentStep(1)} className="p-2 -ml-2">
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-NunitoBold ml-2 text-gray-900">
          {currentStep === 1 ? "Mechanic Profile" : "Vehicle Expertise"}
        </Text>
        <View className="flex-1" />
        <View className="bg-gray-100 px-3 py-1 rounded-full">
          <Text className="text-xs font-NunitoBold text-gray-500">Step {currentStep} of 2</Text>
        </View>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 ? (
          <View>
            <Text className="text-gray-500 font-NunitoMedium mb-6 text-base leading-5">
              Tell us about yourself and your background.
            </Text>

            {isPendingApproval && (
              <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex-row items-start">
                <ClockIcon size={24} color="#D97706" />
                <View className="ml-3 flex-1">
                  <Text className="text-amber-900 font-NunitoBold text-sm">Profile Under Review</Text>
                  <Text className="text-amber-700 font-NunitoMedium text-xs mt-1">
                    You've already submitted your documents. We're currently reviewing them. You can still update your details if needed.
                  </Text>
                </View>
              </View>
            )}

            <Formik
              enableReinitialize={true}
              initialValues={initialFormValues}
              validationSchema={step1ValidationSchema}
              onSubmit={handleStep1Submit}
            >
              {({ handleChange, handleSubmit, values, errors, touched, setFieldValue }) => (
                <View className="pb-10">
                  <View className="bg-white px-4 py-2 rounded-2xl mb-5 border border-gray-100 shadow-sm">
                    <SectionHeader icon={UserIcon} title="Professional Profile" />
                    <SelfieUpload
                      onPress={() => pickDocument("selfie")}
                      imageUri={selfie?.uri}
                    />
                    <View>
                      <Text className="text-xs font-NunitoBold text-gray-500 uppercase tracking-wider mb-2 ml-1">Bio</Text>
                      <TextArea
                        placeholder="Briefly describe your experience and expertise..."
                        value={values.bio}
                        onChangeText={handleChange("bio")}
                        error={errors.bio}
                        touched={touched.bio}
                        numberOfLines={4}
                      />
                    </View>
                  </View>

                  <View className="bg-white px-4 pt-2 rounded-2xl mb-5 border border-gray-100 shadow-sm">
                    <SectionHeader icon={MapPinIcon} title="Location Details" />
                    <View className="mb-4">
                      <AddressInput
                        label="Workshop Location"
                        placeholder="Search for your workshop address"
                        value={values.location}
                        onChangeText={handleChange("location")}
                        onLocationSelect={(loc: any) => handleLocationSelect(loc, setFieldValue)}
                        error={errors.location}
                        touched={touched.location}
                        required
                        showCurrentLocationButton={true}
                      />
                    </View>

                    <View className="flex-row gap-4 mb-2">
                      <View className="flex-1">
                        <SelectField
                          name="state"
                          label="State"
                          placeholder="Select State"
                          options={states}
                          value={values.state}
                          onValueChange={(val) => {
                            setFieldValue("state", val);
                            setFieldValue("lga", "");
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
                          disabled={!values.state}
                        />
                      </View>
                    </View>
                  </View>

                  <View className="bg-white p-5 rounded-2xl mb-5 border border-gray-100 shadow-sm">
                    <SectionHeader icon={BriefcaseIcon} title="Identity & Expertise" />
                    <View className="mb-5">
                      <InputField
                        label="NIN Number"
                        placeholder="Enter your 11-digit NIN"
                        value={values.nin_number}
                        onChangeText={handleChange("nin_number")}
                        error={errors.nin_number}
                        touched={touched.nin_number}
                        required
                      />
                    </View>
                    <View className="mb-5">
                      <ImageUpload
                        label="Upload NIN Document"
                        isUploaded={!!ninDocument}
                        imageUri={ninDocument?.uri}
                        onPress={() => pickDocument("nin_document")}
                        required
                      />
                    </View>
                    <View className="mb-5">
                      <MultiSelectField
                        label="Areas of Specialization"
                        name="specializations"
                        placeholder="Select specializations"
                        options={specializationsOptions}
                        value={values.specializations}
                        onValueChange={(val) => setFieldValue("specializations", val)}
                      />
                      {touched.specializations && errors.specializations && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">{errors.specializations as string}</Text>
                      )}
                    </View>
                    <View className="mb-2">
                      <ImageUpload
                        label="Certificate of Learning (Optional)"
                        isUploaded={!!certificateOfLearning}
                        imageUri={certificateOfLearning?.uri}
                        onPress={() => pickDocument("certificate_of_learning")}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleSubmit()}
                    className={`py-4 rounded-xl mb-8 items-center shadow-md ${submitKYCMutation.isPending ? 'bg-primary-300' : 'bg-primary-500'}`}
                    disabled={submitKYCMutation.isPending}
                  >
                    {submitKYCMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-NunitoBold text-lg">Next: Vehicle Expertise</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Formik>
          </View>
        ) : (
          <View className="pb-10">
            <View className="mb-6">
              <Text className="text-gray-500 font-NunitoMedium text-base leading-5">
                Specify the vehicle brands you are experienced with to help us match you with the right repair requests.
              </Text>
            </View>

            {isPendingApproval && (
              <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex-row items-start">
                <InformationCircleIcon size={24} color="#D97706" />
                <View className="ml-3 flex-1">
                  <Text className="text-amber-900 font-NunitoBold text-sm">Application Status</Text>
                  <Text className="text-amber-700 font-NunitoMedium text-xs mt-1">
                    Your expertise records are being reviewed. Adding more brands or changing details may extend the review period.
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-NunitoBold text-gray-900">Expertise Records</Text>
              <View className="bg-primary-100 px-3 py-1 rounded-full">
                <Text className="text-primary-700 font-NunitoBold text-xs">
                  {expertiseRecords.length} {expertiseRecords.length === 1 ? 'Brand' : 'Brands'}
                </Text>
              </View>
            </View>

            {expertiseRecords.length === 0 ? (
              <View className="bg-white p-10 rounded-2xl items-center border border-dashed border-gray-300 mb-6">
                <BriefcaseIcon size={48} color="#9CA3AF" />
                <Text className="text-gray-400 font-NunitoMedium text-center mt-4">
                  No expertise added yet. Click the button below to add your first vehicle brand expertise.
                </Text>
              </View>
            ) : (
              expertiseRecords.map((record, index) => (
                <ExpertiseRecordItem
                  key={index}
                  index={index}
                  record={record}
                  carBrandsOptions={carBrandsOptions}
                  certificationLevels={certificationLevels}
                  onRemove={() => removeExpertiseRow(index)}
                  onUpdate={(field, val) => updateExpertiseRecord(index, field, val)}
                />
              ))
            )}

            <TouchableOpacity
              onPress={addExpertiseRow}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-5 rounded-2xl bg-white border border-gray-100 shadow-sm mb-10"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              <View className="w-9 h-9 rounded-full bg-primary-50 items-center justify-center mr-3">
                <PlusIcon size={20} color="#D30309" strokeWidth={2.5} />
              </View>
              <Text className="text-gray-900 font-NunitoBold text-lg">Add New Expertise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStep2Submit}
              activeOpacity={0.9}
              className={`py-5 rounded-2xl mb-12 flex-row items-center justify-center shadow-lg ${
                submitExpertiseMutation.isPending ? 'bg-primary-400' : 'bg-primary-600'
              }`}
              style={{
                shadowColor: '#D30309',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
                elevation: 2,
              }}
              disabled={submitExpertiseMutation.isPending}
            >
              {submitExpertiseMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircleIcon size={24} color="white" strokeWidth={2} />
                  <Text className="text-white font-NunitoExtraBold text-lg ml-3">Complete Verification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>

      <Modal visible={showLivenessModal} animationType="slide" onRequestClose={() => setShowLivenessModal(false)}>
        <LivenessCamera onCapture={handleLivenessCapture} onCancel={() => setShowLivenessModal(false)} />
      </Modal>

      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={hideAlert}
          type={alertConfig.type}
          autoDismiss={alertConfig.autoDismiss}
          autoDismissDelay={alertConfig.autoDismissDelay}
          onButtonPress={alertConfig.onButtonPress}
          buttonText={alertConfig.buttonText}
        />
      )}
    </SafeAreaView>
  );
};

export default CompleteKYC;
