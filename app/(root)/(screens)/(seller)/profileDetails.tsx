import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { ChevronLeftIcon, PencilIcon } from "react-native-heroicons/solid";
import { sellerRoutes } from "@/constants/routes";
import {
  UserIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  XMarkIcon,
  CameraIcon,
  ShieldCheckIcon,
} from "react-native-heroicons/outline";
import { useActiveRoleProfile, useMerchantProfile, useSubmitMerchantKYC, useUpdateUserProfile } from "@/hooks/useUserProfile";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import FormikInput from "@/components/forms/FormikInput";
import AddressInput from "@/components/forms/AddressInput";
import SelectField from "@/components/forms/SelectField";
import { userAPI } from "@/lib/api/user";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/utils/toastUtils";
import { getStatesByCountry } from "@/constants/locationData";
import { getLGAs } from "@/constants/nigeriaData";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import ImageUpload from "@/components/ImageUpload";

interface ProfileEditModalProps {
  isVisible: boolean;
  onClose: () => void;
  editingSection: string | null;
  merchantProfile: any;
  userObj: any;
  handleSectionSave: any;
  handleImagePick: (setFieldValue: any, fieldName: string) => void;
  isVehicleRental: boolean;
}

const ProfileEditModal = ({
  isVisible,
  onClose,
  editingSection,
  merchantProfile,
  userObj,
  handleSectionSave,
  handleImagePick,
  isVehicleRental,
}: ProfileEditModalProps) => {
  const nigerianStates = getStatesByCountry('NG');
  const states = nigerianStates.map(s => ({ label: s.name, value: s.name }));


  const getSectionSchema = (section: string | null) => {
    const personalSchema = Yup.object().shape({
      first_name: Yup.string().required("First name is required"),
      last_name: Yup.string().required("Last name is required"),
      phone_number: Yup.string().required("Phone number is required"),
    });

    const businessSchema = Yup.object().shape({
      nin_number: Yup.string().required("NIN number is required"),
    });

    const documentationSchema = Yup.object().shape({
      selfie: Yup.string().required("Selfie is required"),
      nin_document: Yup.string().required("NIN document is required"),
    });

    switch (section) {
      case "personal": return personalSchema;
      case "business": return businessSchema;
      case "documentation": return documentationSchema;
      default: return Yup.object().shape({});
    }
  };

  const getSectionInitialValues = (section: string | null) => {
    if (!merchantProfile && !userObj) return {};
    switch (section) {
      case "personal":
        return {
          first_name: userObj?.first_name || "",
          last_name: userObj?.last_name || "",
          phone_number: userObj?.phone_number || "",
          profile_picture: merchantProfile?.selfie || merchantProfile?.profile_picture || (userObj as any)?.profileImage || "",
        };
      case "business":
        let initialLocation = merchantProfile?.location || "";
        let initialState = merchantProfile?.state || "";
        let initialLga = merchantProfile?.lga || "";

        // Attempt soft-infer of state if not present
        if (initialLocation && !initialState) {
          const states = getStatesByCountry('NG');
          const matchedState = states.find((s: any) => initialLocation.toLowerCase().includes(s.name.toLowerCase()));
          if (matchedState) initialState = matchedState.name;
        }

        return {
          store_name: merchantProfile?.store_name || merchantProfile?.company_name || "",
          location: initialLocation,
          state: initialState,
          lga: initialLga,
          nin_number: merchantProfile?.nin_number || "",
          latitude: merchantProfile?.latitude || "",
          longitude: merchantProfile?.longitude || "",
        };
      case "documentation":
        return {
          selfie: merchantProfile?.selfie || "",
          nin_document: merchantProfile?.nin_document || "",
        };
      default:
        return {};
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="bg-white rounded-t-[32px] max-h-[90%]"
        >
          <View className="p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-NunitoBold text-gray-900 capitalize">
                Edit {editingSection === 'personal' ? 'Personal' : editingSection === 'business' ? (isVehicleRental ? 'Rental' : 'Business') : 'Documentation'} Information
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
              >
                <XMarkIcon size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Formik
                initialValues={getSectionInitialValues(editingSection)}
                validationSchema={getSectionSchema(editingSection)}
                onSubmit={handleSectionSave}
                enableReinitialize
              >
                {({ handleSubmit, setFieldValue, values, errors, touched, isSubmitting, handleChange, handleBlur }) => (
                  <View className="pb-10">
                    {editingSection === "personal" && (
                      <View>
                        <View className="items-center mb-6">
                          <TouchableOpacity onPress={() => handleImagePick(setFieldValue, "profile_picture")} className="relative">
                            <View className="w-24 h-24 rounded-2xl items-center justify-center border-4 border-white shadow-lg mb-2 overflow-hidden">
                              {values.profile_picture ? (
                                <Image source={{ uri: values.profile_picture }} className="w-full h-full" resizeMode="cover" />
                              ) : (
                                <LinearGradient colors={["#D30309", "#B91C1C"]} className="w-full h-full items-center justify-center">
                                  <Text className="text-3xl font-NunitoExtraBold text-white">
                                    {values.first_name ? values.first_name.charAt(0).toUpperCase() : "M"}
                                  </Text>
                                </LinearGradient>
                              )}
                            </View>
                            <View className="absolute bottom-1 right-[-4] bg-primary-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-md">
                              <CameraIcon size={16} color="white" />
                            </View>
                          </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-x-3 mb-2">
                          <View className="flex-1">
                            <FormikInput name="first_name" placeholder="John" label="First Name" required />
                          </View>
                          <View className="flex-1">
                            <FormikInput name="last_name" placeholder="Doe" label="Last Name" required />
                          </View>
                        </View>

                        <FormikInput name="phone_number" placeholder="080 0000 0000" label="Phone Number" keyboardType="phone-pad" required />
                      </View>
                    )}

                    {editingSection === "business" && (
                      <View>
                        <FormikInput 
                          name="store_name" 
                          placeholder={isVehicleRental ? "Enter company name" : "Enter business name"} 
                          label={isVehicleRental ? "Company Name" : "Business Name"} 
                          required 
                        />

                        <AddressInput
                          label="Business Address"
                          value={values.location}
                          onChangeText={(text: string) => {
                            setFieldValue("location", text);
                            // Soft auto-fill search
                            if (text.length > 3) {
                              const matchedState = states.find(s => text.toLowerCase().includes(s.label.toLowerCase()));
                              if (matchedState && !values.state) {
                                setFieldValue("state", matchedState.value);
                              }
                            }
                          }}
                          onLocationSelect={async (loc: any) => {
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
                                      setFieldValue("state", matchedState.value);

                                      const potentialLGAs = [city, address.subregion, address.district].filter(Boolean);
                                      if (potentialLGAs.length > 0) {
                                        const availableLGAs = getLGAs(matchedState.value);

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
                                console.log("Auto-fill location failed in modal", error);
                              }
                            }
                          }}
                          placeholder="Search for your business address"
                          error={errors.location as string}
                          touched={touched.location as boolean}
                          required
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
                              required
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
                              required
                            />
                          </View>
                        </View>

                        <FormikInput name="nin_number" placeholder="Enter 11-digit NIN" label="NIN Number" required />
                      </View>
                    )}

                    {editingSection === "documentation" && (
                      <View className="space-y-6">
                        <ImageUpload
                          label="Selfie / Profile Picture"
                          onPress={() => handleImagePick(setFieldValue, "selfie")}
                          isUploaded={!!values.selfie}
                          imageUri={values.selfie}
                          required
                        />

                        <ImageUpload
                          label="NIN Document"
                          onPress={() => handleImagePick(setFieldValue, "nin_document")}
                          isUploaded={!!values.nin_document}
                          imageUri={values.nin_document}
                          required
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="mt-8 bg-primary-500 py-4 rounded-2xl items-center shadow-md active:opacity-90 flex-row justify-center"
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="white" size="small" className="mr-2" />
                      ) : null}
                      <Text className="text-white text-base font-NunitoBold">
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Formik>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const SectionHeader = ({ icon: Icon, title, color = "#D30309", bgColor = "bg-primary-50", onEdit }: any) => (
  <View className="flex-row items-center justify-between mb-4">
    <View className="flex-row items-center">
      <View className={`w-8 h-8 ${bgColor} rounded-lg items-center justify-center mr-2`}>
        <Icon size={16} color={color} />
      </View>
      <Text className="text-base font-NunitoBold text-gray-900">{title}</Text>
    </View>
    {onEdit && (
      <TouchableOpacity
        onPress={onEdit}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
      >
        <PencilIcon size={12} color="#4B5563" className="mr-1.5" />
        <Text className="text-xs font-NunitoBold text-gray-600">Edit</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ProfileRow = ({ label, value }: { label: string; value: string }) => (
  <View className="py-4 border-b border-gray-50 last:border-0">
    <Text className="text-gray-500 font-NunitoMedium text-xs uppercase tracking-wider mb-1">{label}</Text>
    <Text className="text-base font-NunitoMedium text-gray-900">
      {value || "Not set"}
    </Text>
  </View>
);

const SellerProfileDetails = () => {
  const submitKYCMutation = useSubmitMerchantKYC();
  const updateProfileMutation = useUpdateUserProfile();
  
  const { 
    data: activeProfileData, 
    isLoading: isLoadingProfile,
    primaryProfileData,
    isVehicleRental,
  } = useActiveRoleProfile();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const merchantProfile = isVehicleRental
    ? activeProfileData?.data?.vehicle_rental_profile
    : activeProfileData?.data?.merchant_profile;
  const userObj = merchantProfile?.user || (primaryProfileData?.data as any);
  const displayName = merchantProfile?.store_name || merchantProfile?.company_name || (userObj?.first_name && userObj?.last_name ? `${userObj.first_name} ${userObj.last_name}`.trim() : "Business");
  const profileImage = merchantProfile?.selfie || merchantProfile?.profile_picture || (userObj as any)?.profileImage || "";

  const handleSectionSave = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);
      
      const getFileObject = (uri: string, fieldName: string) => {
        if (!uri) return null;
        if (uri.startsWith('http')) return uri;
        return {
          uri,
          name: `${fieldName}_${Date.now()}.jpg`,
          type: 'image/jpeg'
        } as any;
      };

      const profilePicFile = getFileObject(values.profile_picture, 'profile_picture');
      const selfieFile = getFileObject(values.selfie, 'selfie');
      const cacDocFile = getFileObject(values.nin_document, 'nin_document');

      const formData = new FormData();
      formData.append('requestType', 'inbound');

      const fullValues = {
        store_name: merchantProfile?.store_name || merchantProfile?.company_name || "",
        location: merchantProfile?.location || "",
        lga: merchantProfile?.lga || "",
        nin_number: merchantProfile?.nin_number || "",
        ...values
      };

      Object.entries(fullValues).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'first_name' && key !== 'last_name' && key !== 'phone_number' && key !== 'profile_picture' && key !== 'selfie' && key !== 'nin_document') {
          const apiKey = (key === 'store_name' && isVehicleRental) ? 'company_name' : key;
          formData.append(apiKey, val as string);
        }
      });

      // Handle user basic info update separately if needed
      if (values.first_name || values.last_name || values.phone_number) {
        try {
          await updateProfileMutation.mutateAsync({
            first_name: values.first_name || userObj?.first_name,
            last_name: values.last_name || userObj?.last_name,
            phone_number: values.phone_number || userObj?.phone_number,
          });
        } catch (e) {
          console.log("Could not update root user info separately.");
        }
      }

      // Append Files (now as file objects or existing URLs)
      if (profilePicFile) formData.append('selfie', profilePicFile);
      else if (selfieFile) formData.append('selfie', selfieFile);
      
      if (cacDocFile) formData.append('nin_document', cacDocFile);

      await submitKYCMutation.mutateAsync(formData);
      showToast.success("Profile updated successfully");
      setIsModalVisible(false);
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update profile";
      showToast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImagePick = async (setFieldValue: any, fieldName: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast.error("Permission required!");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setFieldValue(fieldName, `data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      showToast.error("Failed to pick image");
    }
  };

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

      <ProfileEditModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        editingSection={editingSection}
        merchantProfile={merchantProfile}
        userObj={userObj}
        handleSectionSave={handleSectionSave}
        handleImagePick={handleImagePick}
        isVehicleRental={isVehicleRental}
      />

      <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3"
          >
            <ChevronLeftIcon size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-NunitoBold text-gray-900">
            {isVehicleRental ? "Rental Details" : "Business Details"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(sellerRoutes.EditProfile as any)}
          className="w-10 h-10 bg-primary-50 rounded-full items-center justify-center"
        >
          <PencilIcon size={20} color="#D30309" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'android' ? 70 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedPageContainer animationType="fadeInUp" duration={600}>
          <View className="px-5 pt-6">
            <View className="items-center mb-8">
              <View className="w-28 h-28 rounded-2xl items-center justify-center border-4 border-white shadow-lg mb-3 overflow-hidden">
                {profileImage ? (
                  <Image source={{ uri: profileImage }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <LinearGradient colors={["#D30309", "#B91C1C"]} className="w-full h-full items-center justify-center">
                    <Text className="text-4xl font-NunitoExtraBold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <Text className="text-xl font-NunitoBold text-gray-900">{displayName}</Text>
              <Text className="text-gray-500 font-NunitoMedium text-sm">{userObj?.email}</Text>
            </View>

            {/* Personal Information */}
            <View className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <SectionHeader
                icon={UserIcon}
                title="Personal Information"
                onEdit={() => {
                  setEditingSection("personal");
                  setIsModalVisible(true);
                }}
              />
              <ProfileRow label="First Name" value={userObj?.first_name || ""} />
              <ProfileRow label="Last Name" value={userObj?.last_name || ""} />
              <ProfileRow label="Phone Number" value={userObj?.phone_number || ""} />
            </View>

            {/* Business/Fleet Details */}
            <View className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <SectionHeader
                icon={BriefcaseIcon}
                title={isVehicleRental ? "Rental Details" : "Business Details"}
                color="#F59E0B"
                bgColor="bg-amber-50"
                onEdit={() => {
                  setEditingSection("business");
                  setIsModalVisible(true);
                }}
              />
              <ProfileRow 
                label={isVehicleRental ? "Company Name" : "Business Name"} 
                value={merchantProfile?.store_name || merchantProfile?.company_name || ""} 
              />
              <ProfileRow label="NIN Number" value={merchantProfile?.nin_number || ""} />
              <ProfileRow 
                label={isVehicleRental ? "Rental Address" : "Business Address"} 
                value={merchantProfile?.location || ""} 
              />
              <View className="flex-row items-center justify-start gap-20">
                <ProfileRow label="State" value={merchantProfile?.state || ""} />
                <ProfileRow label="LGA" value={merchantProfile?.lga || ""} />
              </View>
            </View>

            {/* Documentation & Verification */}
            <View className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <SectionHeader
                icon={ShieldCheckIcon}
                title="Documentation & Verification"
                color="#6366F1"
                bgColor="bg-indigo-50"
                onEdit={() => {
                  setEditingSection("documentation");
                  setIsModalVisible(true);
                }}
              />
              <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
                <Text className="text-gray-500 font-NunitoMedium text-sm">Selfie</Text>
                <Text className={merchantProfile?.selfie ? "text-green-600 font-NunitoBold" : "text-amber-600 font-NunitoBold"}>
                  {merchantProfile?.selfie ? "Uploaded" : "Pending"}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-3">
                <Text className="text-gray-500 font-NunitoMedium text-sm">NIN Document</Text>
                <Text className={merchantProfile?.nin_document ? "text-green-600 font-NunitoBold" : "text-amber-600 font-NunitoBold"}>
                  {merchantProfile?.nin_document ? "Uploaded" : "Pending"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push(sellerRoutes.EditProfile as any)}
              className="mt-4 bg-primary-500 py-4 rounded-2xl items-center shadow-md active:opacity-90"
            >
              <Text className="text-white text-base font-NunitoBold">Full Profile Update</Text>
            </TouchableOpacity>
          </View>
        </AnimatedPageContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SellerProfileDetails;