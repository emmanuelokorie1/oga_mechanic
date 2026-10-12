import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { ChevronLeftIcon } from "react-native-heroicons/solid";
import { CameraIcon, WrenchScrewdriverIcon, EnvelopeIcon, BriefcaseIcon, ShieldCheckIcon } from "react-native-heroicons/outline";
import { useMechanicProfile, usePrimaryUserProfile, userProfileKeys } from "@/hooks/useUserProfile";
import { useSpecializations } from "@/hooks/useMechanic";
import { useMemo } from "react";
import { userAPI } from "@/lib/api/user";
import { formatPhoneNumber } from "@/utils/phoneUtils";
import { showToast } from "@/utils/toastUtils";
import { useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import ImageSourcePickerModal from "@/components/modals/ImageSourcePickerModal";
import { pickImageWithPermission } from "@/utils/imagePickerHelper";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import FormikInput from "@/components/forms/FormikInput";
import FormikButton from "@/components/forms/FormikButton";
import AddressInput from "@/components/forms/AddressInput";
import SelectField from "@/components/forms/SelectField";
import TextArea from "@/components/forms/TextArea";
import MultiSelectField from "@/components/forms/MultiSelectField";
import { LinearGradient } from "expo-linear-gradient";
import { getStatesByCountry } from "@/constants/locationData";
import { getLGAs } from "@/constants/nigeriaData";
import * as Location from "expo-location";

// Validation Schema for Mechanic Profile
const editMechanicProfileSchema = Yup.object().shape({
  first_name: Yup.string()
    .min(2, "First name must be at least 2 characters")
    .required("First name is required"),
  last_name: Yup.string()
    .min(2, "Last name must be at least 2 characters")
    .required("Last name is required"),
  phone_number: Yup.string()
    .matches(/^[0-9]{10,13}$/, "Phone number must be 10-13 digits")
    .required("Phone number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  bio: Yup.string().nullable(),
  location: Yup.string().nullable(),
  state: Yup.string().nullable(),
  lga: Yup.string().nullable(),
  specializations: Yup.array().min(1, "Select at least one specialization").required("Specializations are required"),
  nin_number: Yup.string().nullable(),
});

const EditMechanicProfile = () => {
  const queryClient = useQueryClient();
  const { data: profileData, isLoading: isLoadingPrimary } = usePrimaryUserProfile();
  const { data: mechanicProfile, isLoading: isLoadingMechanic } = useMechanicProfile(true);
  const { data: specializations, isLoading: isLoadingSpecs } = useSpecializations();
  
  const userData = profileData?.data;
  const mechanicData = mechanicProfile?.data;

  const mechanicProfileInfo = mechanicData?.mechanic_profile;

  interface FormValues {
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
    bio: string;
    location: string;
    state: string;
    lga: string;
    latitude: string;
    longitude: string;
    specializations: string[];
    selfie: string;
    nin_number: string;
  }

  const [initialValues, setInitialValues] = useState<FormValues>({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    bio: "",
    location: "",
    state: "",
    lga: "",
    latitude: "",
    longitude: "",
    specializations: [],
    selfie: "",
    nin_number: "",
  });

  useEffect(() => {
    if (userData || mechanicProfileInfo) {
      setInitialValues({
        first_name: userData?.first_name || mechanicProfileInfo?.user?.first_name || "",
        last_name: userData?.last_name || mechanicProfileInfo?.user?.last_name || "",
        phone_number: userData?.phone_number || mechanicProfileInfo?.user?.phone_number || "",
        email: userData?.email || mechanicProfileInfo?.user?.email || "",
        bio: mechanicProfileInfo?.bio || "",
        location: mechanicProfileInfo?.location || "",
        state: mechanicProfileInfo?.state || "",
        lga: mechanicProfileInfo?.lga || "",
        latitude: mechanicProfileInfo?.latitude || "",
        longitude: mechanicProfileInfo?.longitude || "",
        specializations: Array.isArray(mechanicProfileInfo?.specializations) 
          ? mechanicProfileInfo.specializations.map(String) 
          : (mechanicProfileInfo as any)?.specialization ? [String((mechanicProfileInfo as any).specialization)] : [],
        selfie: (mechanicProfileInfo as any)?.selfie || (userData as any)?.profile_picture || "",
        nin_number: mechanicProfileInfo?.nin_number || "",
      });
    }
  }, [userData, mechanicProfileInfo]);

  // Auto-sync location data if missing on mount
  useEffect(() => {
    const syncLocation = async () => {
      if (initialValues.location && (!initialValues.state || !initialValues.lga)) {
        try {
          const geocoded = await Location.geocodeAsync(initialValues.location);
          if (geocoded.length > 0) {
            const { latitude, longitude } = geocoded[0];
            
            const reverseGeocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverseGeocoded.length > 0) {
              const address = reverseGeocoded[0];
              const region = address.region;
              if (region) {
                const nigerianStates = getStatesByCountry('NG');
                const matchedState = nigerianStates.find(s => s.name.toLowerCase() === region.toLowerCase());
                if (matchedState) {
                  setInitialValues(prev => ({ 
                    ...prev, 
                    state: matchedState.name,
                    latitude: String(latitude),
                    longitude: String(longitude),
                    lga: prev.lga || address.city || address.subregion || ""
                  }));
                }
              }
            }
          }
        } catch (error) {
          console.error("MechanicEditProfile: Auto-sync location error:", error);
        }
      }
    };

    if (userData || mechanicProfileInfo) {
      syncLocation();
    }
  }, [userData, initialValues.location]);

  const handleSave = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);
      
      // Helper function to handle image upload if it's a local URI
      const getFileObject = (imageUri: string, fieldName: string) => {
        if (!imageUri) return undefined;
        // If it's already a URL, return it
        if (imageUri.startsWith('http')) return imageUri;
        
        return {
          uri: imageUri,
          name: `${fieldName}_${Date.now()}.jpg`,
          type: 'image/jpeg'
        } as any;
      };

      const documentFields = [
        { field: 'selfie', name: 'selfie' },
      ];

      const formData = new FormData();
      formData.append("requestType", "inbound");

      // Core User Data
      formData.append("first_name", values.first_name);
      formData.append("last_name", values.last_name);
      formData.append("phone_number", formatPhoneNumber(values.phone_number));

      const mechanicPayload = {
        bio: values.bio,
        location: values.location,
        state: values.state,
        lga: values.lga,
        latitude: values.latitude,
        longitude: values.longitude,
        specializations: JSON.stringify(values.specializations),
        nin_number: values.nin_number,
      };

      Object.entries(mechanicPayload).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          formData.append(key, val as string);
        }
      });

      // Append Files (now as file objects or existing URLs)
      documentFields.forEach(({ field, name }) => {
        const file = getFileObject(values[field], name);
        if (file) {
          formData.append(name, file);
        }
      });
      
      await userAPI.submitMechanicKYC(formData);

      // Invalidate profile queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      
      showToast.success("Profile updated successfully");
      router.back();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to update profile";
      showToast.error(errorMessage);
      console.error("Update profile error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [activePickerField, setActivePickerField] = useState<{ field: string; setFieldValue: any; label?: string } | null>(null);

  const handleOpenImagePicker = (field: string, setFieldValue: any, label?: string) => {
    setActivePickerField({ field, setFieldValue, label });
    setSourcePickerVisible(true);
  };

  const handleExecuteImagePick = async (source: "camera" | "gallery") => {
    if (!activePickerField) return;
    const { field, setFieldValue } = activePickerField;

    try {
      const result = await pickImageWithPermission(source, {
        allowsEditing: true,
        aspect: field === "selfie" ? [1, 1] : [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (result && !result.canceled && result.assets[0]) {
        setFieldValue(field, result.assets[0].uri);
      }
    } catch (error) {
      showToast.error("Failed to pick image");
    } finally {
      setActivePickerField(null);
    }
  };

  const DocumentPicker = ({ label, field, value, setFieldValue }: any) => (
    <View className="mb-4">
      <Text className="text-gray-700 font-NunitoSemiBold mb-2">{label}</Text>
      <TouchableOpacity 
        onPress={() => handleOpenImagePicker(field, setFieldValue, label)}
        className="w-full h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 items-center justify-center overflow-hidden"
      >
        {value ? (
          <Image source={{ uri: value }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="items-center">
            <CameraIcon size={32} color="#9CA3AF" />
            <Text className="text-gray-400 font-NunitoMedium mt-2">Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  if (isLoadingPrimary || isLoadingMechanic || isLoadingSpecs) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#D30309" />
      </View>
    );
  }

  const specs = Array.isArray(specializations) ? specializations : (specializations as any)?.data || [];
  const specializationOptions = specs.map((spec: any) => ({
    label: spec.name,
    value: spec.id.toString(),
  }));



  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3"
        >
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-NunitoBold text-gray-900">Edit Profile</Text>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'android' ? 70 : 40 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={120}
        extraHeight={140}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
        enableResetScrollToCoords={false}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={editMechanicProfileSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {({ handleSubmit, setFieldValue, values, errors, touched, isSubmitting }) => (
            <View className="px-5 pt-6">
              
              {/* Avatar Section */}
              <View className="items-center mb-8">
                <TouchableOpacity 
                  onPress={() => handleOpenImagePicker("selfie", setFieldValue, "Profile Photo")}
                  className="relative"
                >
                  <View className="w-28 h-28 rounded-2xl items-center justify-center border-4 border-white shadow-lg mb-3 overflow-hidden">
                    {values.selfie ? (
                      <Image
                        source={{ uri: values.selfie }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#D30309', '#B91C1C']}
                        className="w-full h-full items-center justify-center"
                      >
                        <Text className="text-4xl font-NunitoExtraBold text-white">
                          {values.first_name ? values.first_name.charAt(0).toUpperCase() : "M"}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View className="absolute bottom-3 right-0 bg-primary-500 w-9 h-9 rounded-full items-center justify-center border-3 border-white shadow-md">
                    <CameraIcon size={18} color="white" />
                  </View>
                </TouchableOpacity>
                <Text className="text-gray-500 font-NunitoMedium text-sm">
                  Tap to change profile photo
                </Text>
              </View>

              {/* Personal Information Section */}
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 bg-primary-50 rounded-lg items-center justify-center mr-2">
                    <EnvelopeIcon size={16} color="#D30309" />
                  </View>
                  <Text className="text-base font-NunitoBold text-gray-900">Personal Information</Text>
                </View>
                
                {/* First Name & Last Name Row */}
                <View className="flex-row gap-4 mb-3">
                  <View className="flex-1">
                    <FormikInput
                      name="first_name"
                      label="First Name"
                      placeholder="John"
                      autoCapitalize="words"
                      required
                    />
                  </View>
                  <View className="flex-1">
                    <FormikInput
                      name="last_name"
                      label="Last Name"
                      placeholder="Doe"
                      autoCapitalize="words"
                      required
                    />
                  </View>
                </View>

                {/* Email (Read Only) */}
                <View className="mb-3">
                  <FormikInput
                    name="email"
                    label="Email Address"
                    placeholder="email@example.com"
                    editable={false}
                    containerStyle="bg-gray-100 border-gray-200"
                    inputStyle="text-gray-500"
                    helperText="Email cannot be changed"
                  />
                </View>

                {/* Phone Number */}
                <FormikInput
                  name="phone_number"
                  label="Phone Number"
                  placeholder="080 0000 0000"
                  keyboardType="phone-pad"
                  required
                />

                {/* Bio */}
                <View className="mb-2 mt-4">
                  <Text className="text-xs font-NunitoBold text-gray-500 uppercase tracking-wider mb-2 ml-1">Bio</Text>
                  <TextArea
                    placeholder="Briefly describe your experience and expertise..."
                    value={values.bio}
                    onChangeText={(text: string) => setFieldValue("bio", text)}
                    error={errors.bio as string}
                    touched={touched.bio as boolean}
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* Professional Information Section */}
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-2">
                    <WrenchScrewdriverIcon size={16} color="#3B82F6" />
                  </View>
                  <Text className="text-base font-NunitoBold text-gray-900">Professional Information</Text>
                </View>

                {/* Specialization */}
                <View className="mb-3">
                  <MultiSelectField
                    name="specializations"
                    label="Specialization"
                    placeholder="Select your specialization"
                    options={specializationOptions}
                    value={values.specializations}
                    onValueChange={(value) => setFieldValue("specializations", value)}
                  />
                  {touched.specializations && errors.specializations && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">{errors.specializations as string}</Text>
                  )}
                </View>

                {/* Location */}
                <AddressInput
                  label="Workshop Location"
                  value={values.location}
                  onChangeText={(text: string) => {
                    setFieldValue("location", text);
                    // Soft infer state if not already set
                    if (text.length > 3 && !values.state) {
                      const states = getStatesByCountry('NG');
                      const matchedState = states.find(s => text.toLowerCase().includes(s.name.toLowerCase()));
                      if (matchedState) {
                        setFieldValue("state", matchedState.name);
                      }
                    }
                  }}
                  onLocationSelect={async (location: any) => {
                    const addressStr = location?.address || location?.name || location;
                    setFieldValue("location", addressStr);
                    
                    if (location?.latitude && location?.longitude) {
                      setFieldValue("latitude", String(location.latitude));
                      setFieldValue("longitude", String(location.longitude));
                      
                      try {
                        const reverseGeocoded = await Location.reverseGeocodeAsync({
                          latitude: Number(location.latitude),
                          longitude: Number(location.longitude)
                        });
                        
                        if (reverseGeocoded.length > 0) {
                          const addr = reverseGeocoded[0];
                          const region = addr.region;
                          
                          if (region) {
                            const matchedState = getStatesByCountry('NG').find(s => 
                              s.name.toLowerCase() === region.toLowerCase() ||
                              (addr.city && s.name.toLowerCase() === addr.city.toLowerCase())
                            );
                            
                            if (matchedState) {
                              setFieldValue("state", matchedState.name);
                              // Only set LGA if it's currently empty
                              if (!values.lga) {
                                setFieldValue("lga", addr.city || addr.subregion || "");
                              }
                            }
                          }
                        }
                      } catch (e) {
                        console.log("Reverse geocode error in editProfile:", e);
                      }
                    } else if (addressStr && !values.state) {
                      // Fallback: try to geocode the string if no lat/lng provided
                      try {
                        const geocoded = await Location.geocodeAsync(addressStr);
                        if (geocoded.length > 0) {
                          const { latitude, longitude } = geocoded[0];
                          setFieldValue("latitude", String(latitude));
                          setFieldValue("longitude", String(longitude));
                          const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
                          if (reverse.length > 0 && reverse[0].region) {
                            const matched = getStatesByCountry('NG').find(s => s.name.toLowerCase() === reverse[0].region?.toLowerCase());
                            if (matched) {
                              setFieldValue("state", matched.name);
                              setFieldValue("lga", reverse[0].city || reverse[0].subregion || "");
                            }
                          }
                        }
                      } catch (err) {
                        console.log("Geocode fallback error:", err);
                      }
                    }
                  }}
                  placeholder="Enter your workshop address"
                  error={errors.location as string}
                  touched={touched.location as boolean}
                  showCurrentLocationButton={true}
                />

                <View className="flex-row gap-x-3 mt-4">
                  <View className="flex-1">
                    <SelectField
                      label="State"
                      name="state"
                      placeholder="Select State"
                      options={getStatesByCountry('NG').map((s: any) => ({ label: s.name || '', value: s.name || '' }))}
                      value={values.state || ''}
                      onValueChange={(val: string) => {
                        setFieldValue("state", val);
                        setFieldValue("lga", ""); // Reset lga when state changes
                      }}
                      error={errors.state as string}
                      touched={touched.state as boolean}
                    />
                  </View>
                  <View className="flex-1">
                    <SelectField
                      label="LGA"
                      name="lga"
                      placeholder="Select LGA"
                      options={values.state ? getLGAs(values.state).map((l: string) => ({ label: l, value: l })) : []}
                      value={values.lga || ''}
                      onValueChange={(val: string) => setFieldValue("lga", val)}
                      error={errors.lga as string}
                      touched={touched.lga as boolean}
                      disabled={!values.state}
                    />
                  </View>
                </View>
              </View>

              {/* Business & Documents Section */}
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 bg-amber-50 rounded-lg items-center justify-center mr-2">
                    <BriefcaseIcon size={16} color="#F59E0B" />
                  </View>
                  <Text className="text-base font-NunitoBold text-gray-900">Business Details</Text>
                </View>

                <FormikInput 
                  name="nin_number" 
                  label="NIN Number" 
                  placeholder="Enter 11-digit NIN" 
                />
              </View>



              {/* Save Button */}
              <View className="mt-4">
                <FormikButton
                  title={isSubmitting ? "Saving Changes..." : "Save Changes"}
                  onPress={() => handleSubmit()}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </View>

            </View>
          )}
        </Formik>
      </KeyboardAwareScrollView>

      {/* Image Source Picker Modal */}
      <ImageSourcePickerModal
        visible={sourcePickerVisible}
        onClose={() => {
          setSourcePickerVisible(false);
          setActivePickerField(null);
        }}
        onSelectCamera={() => handleExecuteImagePick("camera")}
        onSelectGallery={() => handleExecuteImagePick("gallery")}
        title={activePickerField?.label ? `Upload ${activePickerField.label}` : "Upload Image"}
        subtitle="Choose whether to capture a photo with your camera or select from your gallery."
      />
    </SafeAreaView>
  );
};

export default EditMechanicProfile;