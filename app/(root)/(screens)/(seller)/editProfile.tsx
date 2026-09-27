import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeftIcon } from "react-native-heroicons/solid";
import { CameraIcon, BuildingStorefrontIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, ShieldCheckIcon } from "react-native-heroicons/outline";
import { useActiveRoleProfile, useSubmitMerchantKYC } from "@/hooks/useUserProfile";
import { userAPI } from "@/lib/api/user";
import { formatPhoneNumber } from "@/utils/phoneUtils";
import { showToast } from "@/utils/toastUtils";
import { useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import FormikInput from "@/components/forms/FormikInput";
import FormikButton from "@/components/forms/FormikButton";
import AddressInput from "@/components/forms/AddressInput";
import SelectField from "@/components/forms/SelectField";
import { getStatesByCountry } from "@/constants/locationData";
import { getLGAs } from "@/constants/nigeriaData";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";

// Validation Schema for Seller Profile
const editSellerProfileSchema = Yup.object().shape({
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
  store_name: Yup.string().nullable(),
  location: Yup.string().nullable(),
  state: Yup.string().nullable(),
  lga: Yup.string().nullable(),
  nin_number: Yup.string().nullable(),
});

const EditSellerProfile = () => {
  const submitKYCMutation = useSubmitMerchantKYC();
  
  const { 
    data: activeProfileData, 
    isLoading: isLoadingProfile,
    primaryProfileData,
    isVehicleRental,
  } = useActiveRoleProfile();

  const userData = primaryProfileData?.data;
  const merchantProfileInfo = isVehicleRental
    ? activeProfileData?.data?.vehicle_rental_profile
    : activeProfileData?.data?.merchant_profile;

  const [initialValues, setInitialValues] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    store_name: "",
    location: "",
    state: "",
    lga: "",
    nin_number: "",
    selfie: "",
    nin_document: "",
  });

  useEffect(() => {
    if (userData) {
      setInitialValues({
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        phone_number: userData.phone_number || "",
        email: userData.email || "",
        store_name: merchantProfileInfo?.store_name || (merchantProfileInfo as any)?.company_name || "",
        location: merchantProfileInfo?.location || "",
        state: merchantProfileInfo?.state || "",
        lga: merchantProfileInfo?.lga || "",
        nin_number: merchantProfileInfo?.nin_number || "",
        selfie: merchantProfileInfo?.selfie || (userData as any)?.profile_picture || "",
        nin_document: merchantProfileInfo?.nin_document || "",
      });
    }
  }, [userData, merchantProfileInfo]);

  // Auto-sync location data if missing on mount
  useEffect(() => {
    const syncLocation = async () => {
      if (initialValues.location && (!initialValues.state || !initialValues.lga)) {
        try {
          const geocoded = await Location.geocodeAsync(initialValues.location);
          if (geocoded.length > 0) {
            const { latitude, longitude } = geocoded[0];
            
            // We need a mock setFieldValue to reuse logic or just handle it here
            // But wait, handleLocationSelect isn't defined here, it's inline in onLocationSelect
            // Let's implement a small reverse geocode here or refactor
            const reverseGeocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverseGeocoded.length > 0) {
              const address = reverseGeocoded[0];
              const region = address.region;
              if (region) {
                const matchedState = getStatesByCountry('NG').find(s => s.name.toLowerCase() === region.toLowerCase());
                if (matchedState) {
                  setInitialValues(prev => ({ 
                    ...prev, 
                    state: matchedState.name,
                    // Try to match LGA if possible
                    lga: prev.lga || address.city || address.subregion || ""
                  }));
                }
              }
            }
          }
        } catch (error) {
          console.error("EditProfile: Auto-sync location error:", error);
        }
      }
    };

    if (userData) {
      syncLocation();
    }
  }, [userData, initialValues.location]);

  const handleSave = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);
      
      // Helper function to handle image upload if it's a local URI or base64
      const getFileObject = (uri: string, fieldName: string) => {
        if (!uri) return null;
        if (uri.startsWith('http')) return uri;
        return {
          uri,
          name: `${fieldName}_${Date.now()}.jpg`,
          type: 'image/jpeg'
        } as any;
      };

      const selfieFile = getFileObject(values.selfie, 'selfie');
      const ninDocFile = getFileObject(values.nin_document, 'nin_document');

      const formData = new FormData();
      formData.append('requestType', 'inbound');
      
      // Personal Info
      formData.append('first_name', values.first_name);
      formData.append('last_name', values.last_name);
      formData.append('phone_number', formatPhoneNumber(values.phone_number));
      
      // Business Info
      if (values.store_name) {
        formData.append(isVehicleRental ? 'company_name' : 'store_name', values.store_name);
      }
      if (values.location) formData.append('location', values.location);
      if (values.state) formData.append('state', values.state);
      if (values.lga) formData.append('lga', values.lga);
      if (values.nin_number) formData.append('nin_number', values.nin_number);

      // Append Files (now as file objects or existing URLs)
      if (selfieFile) formData.append('selfie', selfieFile);
      if (ninDocFile) formData.append('nin_document', ninDocFile);

      await submitKYCMutation.mutateAsync(formData);
      
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

  const handleImagePick = async (field: string, setFieldValue: any) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        showToast.error("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        if (result.assets[0].base64) {
          const base64Image = `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}`;
          setFieldValue(field, base64Image);
        } else {
          setFieldValue(field, result.assets[0].uri);
        }
      }
    } catch (error) {
      showToast.error("Failed to pick image");
    }
  };

  const DocumentPicker = ({ label, field, value, setFieldValue }: any) => (
    <View className="mb-4">
      <Text className="text-gray-700 font-NunitoSemiBold mb-2">{label}</Text>
      <TouchableOpacity 
        onPress={() => handleImagePick(field, setFieldValue)}
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

  if (isLoadingProfile) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#D30309" />
      </View>
    );
  }

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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
        <Formik
          initialValues={initialValues}
          validationSchema={editSellerProfileSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {({ handleSubmit, setFieldValue, values, errors, touched, isSubmitting }) => (
            <View className="px-5 pt-6">
              
              {/* Avatar Section */}
              <View className="items-center mb-8">
                <TouchableOpacity 
                  onPress={() => handleImagePick("selfie", setFieldValue)}
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
                          {values.first_name ? values.first_name.charAt(0).toUpperCase() : "S"}
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
              </View>

              {/* Business Information Section */}
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 bg-orange-50 rounded-lg items-center justify-center mr-2">
                    <BuildingStorefrontIcon size={16} color="#EA580C" />
                  </View>
                  <Text className="text-base font-NunitoBold text-gray-900">
                    {isVehicleRental ? "Rental Information" : "Business Information"}
                  </Text>
                </View>

                {/* Store Name */}
                <View className="mb-3">
                  <FormikInput
                    name="store_name"
                    label={isVehicleRental ? "Company Name" : "Business Name"}
                    placeholder={isVehicleRental ? "Enter your company name" : "Enter your business name"}
                    autoCapitalize="words"
                  />
                </View>

                {/* Business Address */}
                <View className="mb-3">
                  <AddressInput
                    label={isVehicleRental ? "Rental Location" : "Business Location"}
                    value={values.location}
                    onChangeText={(text: string) => setFieldValue("location", text)}
                    onLocationSelect={(location: any) => {
                      setFieldValue("location", location?.address || location);
                    }}
                    placeholder={isVehicleRental ? "Search for your rental address" : "Search for your shop address"}
                    error={errors.location as string}
                    touched={touched.location as boolean}
                  />
                </View>

                {/* State and LGA Row */}
                <View className="flex-row gap-4 mb-3">
                  <View className="flex-1">
                    <SelectField
                      name="state"
                      label="State"
                      placeholder="Select State"
                      options={getStatesByCountry('NG').map(state => ({ label: state.name, value: state.name }))}
                      value={values.state}
                      onValueChange={(val) => {
                        setFieldValue("state", val);
                        setFieldValue("lga", ""); // Reset LGA when state changes
                      }}
                      error={errors.state as string}
                      touched={touched.state}
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
                    />
                  </View>
                </View>

                {/* CAC Number */}
                <View className="mb-3">
                  <FormikInput
                    name="nin_number"
                    label="NIN Number"
                    placeholder="Enter your 11-digit NIN"
                  />
                </View>

                <View className="mt-3">
                  <DocumentPicker 
                    label="NIN Document" 
                    field="nin_document" 
                    value={values.nin_document} 
                    setFieldValue={setFieldValue} 
                  />
                </View>
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
    </SafeAreaView>
  );
};

export default EditSellerProfile;
