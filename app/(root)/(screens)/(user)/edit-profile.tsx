
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeftIcon } from "react-native-heroicons/solid";
import { usePrimaryUserProfile } from "@/hooks/useUserProfile";
import { userAPI } from "@/lib/api/user";
import { showToast } from "@/utils/toastUtils";
import { useQueryClient } from "@tanstack/react-query";
import { userProfileKeys } from "@/hooks/useUserProfile";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import { CameraIcon } from "react-native-heroicons/outline";
import ImageSourcePickerModal from "@/components/modals/ImageSourcePickerModal";
import { pickImageWithPermission } from "@/utils/imagePickerHelper";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import FormikInput from "@/components/forms/FormikInput";
import DateInput from "@/components/forms/DateInput";
import SelectField from "@/components/forms/SelectField";
import FormikButton from "@/components/forms/FormikButton";

// Validation Schema
const editProfileSchema = Yup.object().shape({
  first_name: Yup.string()
    .min(2, "First name must be at least 2 characters")
    .required("First name is required"),
  last_name: Yup.string()
    .min(2, "Last name must be at least 2 characters")
    .required("Last name is required"),
  phone_number: Yup.string()
    .matches(/^[0-9]{10,14}$/, "Phone number must be 10-14 digits")
    .required("Phone number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  dob: Yup.date().nullable().max(new Date(), "Date of birth cannot be in the future"),
  gender: Yup.string().nullable(),
});

const EditProfile = () => {
  const queryClient = useQueryClient();
  const { data: profileData, isLoading: isLoadingProfile } = usePrimaryUserProfile();
  const userData = profileData?.data;

  const [initialValues, setInitialValues] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    dob: null as Date | null,
    gender: "",
    selfie: "",
  });

  useEffect(() => {
    if (userData) {
      setInitialValues({
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        phone_number: userData.phone_number || "",
        email: userData.email || "",
        dob: userData.dob ? new Date(userData.dob) : null,
        gender: userData.gender || "",
        selfie: userData.selfie || "",
      });
    }
  }, [userData]);

  const handleSave = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);
      
      const getFileObject = (uri: string) => {
        if (!uri) return null;
        if (uri.startsWith('http')) return uri;
        return {
          uri,
          name: `profile_${Date.now()}.jpg`,
          type: 'image/jpeg'
        } as any;
      };

      const selfieFile = getFileObject(values.selfie);
      
      const payload: any = {
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone_number,
        dob: values.dob,
        gender: values.gender,
        selfie: selfieFile,
      };

      await userAPI.updateProfile(payload);

      // Invalidate profile query to refetch fresh data
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

  if (isLoadingProfile) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#D30309" />
      </View>
    );
  }

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Prefer not to say", value: "prefer_not_to_say" },
  ];

  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [activeSetFieldValue, setActiveSetFieldValue] = useState<((field: string, value: any) => void) | null>(null);

  const handleOpenImagePicker = (setFieldValue: any) => {
    setActiveSetFieldValue(() => setFieldValue);
    setSourcePickerVisible(true);
  };

  const handleExecuteImagePick = async (source: "camera" | "gallery") => {
    if (!activeSetFieldValue) return;

    try {
      const result = await pickImageWithPermission(source, {
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result && !result.canceled && result.assets[0]) {
        if (result.assets[0].base64) {
          const base64Image = `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}`;
          activeSetFieldValue("selfie", base64Image);
        } else {
          activeSetFieldValue("selfie", result.assets[0].uri);
        }
      }
    } catch (error) {
      showToast.error("Failed to pick image");
    } finally {
      setActiveSetFieldValue(null);
    }
  };


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

      <KeyboardAwareScrollView>
        <Formik
          initialValues={initialValues}
          validationSchema={editProfileSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched, isSubmitting }) => (
            <View className="flex-1 px-5 pt-6 pb-10">
              
              {/* Avatar Placeholder / Image */}
              <View className="items-center mb-8">
                <TouchableOpacity 
                   onPress={() => handleOpenImagePicker(setFieldValue)}
                   className="relative"
                >
                  <View className="w-24 h-24 bg-primary-50 rounded-full items-center justify-center border-4 border-white shadow-sm mb-3 overflow-hidden">
                    {values.selfie ? (
                        <Image
                          source={{ uri: values.selfie }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full bg-primary-50 items-center justify-center">
                          <Text className="text-3xl font-NunitoExtraBold text-primary-600">
                          {values.first_name ? values.first_name.charAt(0).toUpperCase() : "U"}
                          </Text>
                        </View>
                    )}
                  </View>
                  <View className="absolute bottom-3 right-0 bg-primary-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white">
                      <CameraIcon size={14} color="white" />
                  </View>
                </TouchableOpacity>
                <Text className="text-gray-500 font-NunitoMedium text-sm">
                  Tap to change profile photo
                </Text>
              </View>

              <View className="space-y-1">
                {/* First Name & Last Name Row */}
                <View className="flex-row gap-4 mb-2">
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
                <View className="mb-2">
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

                {/* Date of Birth & Gender Row */}
                <View className="flex-row gap-4 mt-2">
                   <View className="flex-1">
                      <DateInput
                        label="Date of Birth"
                        value={values.dob}
                        onDateChange={(date) => setFieldValue("dob", date)}
                        error={errors.dob as string}
                        touched={touched.dob as boolean}
                        maximumDate={new Date()}
                      />
                   </View>
                   <View className="flex-1">
                      <SelectField
                        name="gender"
                        label="Gender"
                        placeholder="Select"
                        options={genderOptions}
                        value={values.gender}
                        onValueChange={(value) => setFieldValue("gender", value)}
                        error={errors.gender}
                        touched={touched.gender}
                      />
                   </View>
                </View>

              </View>

              <View className="mt-8">
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
          setActiveSetFieldValue(null);
        }}
        onSelectCamera={() => handleExecuteImagePick("camera")}
        onSelectGallery={() => handleExecuteImagePick("gallery")}
        title="Upload Profile Photo"
        subtitle="Choose whether to take a new photo with your camera or select from your gallery."
      />
    </SafeAreaView>
  );
};

export default EditProfile;