import React, { useState, useEffect } from "react";
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
import { 
  UserIcon, 
  EnvelopeIcon,
  BriefcaseIcon,
  XMarkIcon,
  CameraIcon,
  ShieldCheckIcon,
} from "react-native-heroicons/outline";
import { useMechanicProfile, userProfileKeys } from "@/hooks/useUserProfile";
import { useSpecializations } from "@/hooks/useMechanic";
import { mechanicRoutes } from "@/constants/routes";
import { useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import FormikInput from "@/components/forms/FormikInput";
import AddressInput from "@/components/forms/AddressInput";
import SelectField from "@/components/forms/SelectField";
import MultiSelectField from "@/components/forms/MultiSelectField";
import TextArea from "@/components/forms/TextArea";
import { userAPI } from "@/lib/api/user";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/utils/toastUtils";
import { formatPhoneNumber } from "@/utils/phoneUtils";
import { getStatesByCountry } from "@/constants/locationData";
import { getLGAs } from "@/constants/nigeriaData";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

interface ProfileEditModalProps {
  isVisible: boolean;
  onClose: () => void;
  editingSection: string | null;
  mechanicProfile: any;
  userObj: any;
  handleSectionSave: any;
  handleImagePick: any;
  specializationOptions: any[];
}

const ProfileEditModal = ({
  isVisible,
  onClose,
  editingSection,
  mechanicProfile,
  userObj,
  handleSectionSave,
  handleImagePick,
  specializationOptions,
}: ProfileEditModalProps) => {

  const getSectionSchema = (section: string | null) => {
    const personalSchema = Yup.object().shape({
      first_name: Yup.string().required("First name is required"),
      last_name: Yup.string().required("Last name is required"),
      phone_number: Yup.string().required("Phone number is required"),
      bio: Yup.string().required("Brief bio is required"),
      specializations: Yup.array().min(1, "Select at least one specialization").required("Specializations are required"),
    });

    const addressSchema = Yup.object().shape({
      location: Yup.string().required("Location is required"),
      state: Yup.string().required("State is required"),
      lga: Yup.string().required("LGA is required"),
    });

    const businessSchema = Yup.object().shape({
      nin_number: Yup.string().required("NIN number is required"),
    });

    switch (section) {
      case "personal": return personalSchema;
      case "address": return addressSchema;
      case "business": return businessSchema;
      default: return Yup.object().shape({});
    }
  };

  const getSectionInitialValues = (section: string | null) => {
    if (!mechanicProfile && !userObj) return {};
    switch (section) {
      case "personal":
        return {
          first_name: userObj?.first_name || "",
          last_name: userObj?.last_name || "",
          phone_number: userObj?.phone_number || "",
          bio: mechanicProfile?.bio || "",
          profile_picture: mechanicProfile?.selfie || userObj?.profile_image || "",
          specializations: Array.isArray(mechanicProfile?.specializations) 
            ? mechanicProfile.specializations.map(String) 
            : (mechanicProfile as any)?.specialization ? [String((mechanicProfile as any).specialization)] : [],
        };
      case "address":
        let initialLocation = mechanicProfile?.location || "";
        let initialState = "";
        let initialLga = mechanicProfile?.lga || "";

        // Attempt soft-infer of state
        if (initialLocation && !initialState) {
          const states = getStatesByCountry('NG');
          const matchedState = states.find((s: any) => initialLocation.toLowerCase().includes(s.name.toLowerCase()));
          if (matchedState) initialState = matchedState.name;
        }

        return {
          location: initialLocation,
          state: mechanicProfile?.state || initialState,
          lga: initialLga,
          latitude: mechanicProfile?.latitude || "",
          longitude: mechanicProfile?.longitude || "",
        };
      case "business":
        return {
          nin_number: mechanicProfile?.nin_number || "",
          nin_document: mechanicProfile?.nin_document || "",
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
                Edit {editingSection} Information
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
                {({ handleSubmit, setFieldValue, values, errors, touched, isSubmitting, handleChange, handleBlur, setFieldError, setFieldTouched }) => (
                  <View className="pb-10">
                    {editingSection === "personal" && (
                      <View>
                        <View className="items-center mb-6">
                          <TouchableOpacity onPress={() => handleImagePick(setFieldValue)} className="relative">
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
                        
                        <View className="mb-4">
                          <Text className="text-xs font-NunitoBold text-gray-500 uppercase tracking-wider mb-2 ml-1">Bio</Text>
                          <TextArea
                            placeholder="Briefly describe your experience and expertise..."
                            value={values.bio}
                            onChangeText={handleChange("bio")}
                            error={errors.bio as string}
                            touched={touched.bio as boolean}
                            numberOfLines={4}
                          />
                        </View>

                        <View className="mb-4">
                           <MultiSelectField
                              name="specializations"
                              label="Specializations"
                              placeholder="Select your specializations"
                              options={specializationOptions}
                              value={values.specializations}
                              onValueChange={(val) => setFieldValue("specializations", val)}
                           />
                           {touched.specializations && errors.specializations && (
                              <Text className="text-red-500 text-xs mt-1 ml-1">{errors.specializations as string}</Text>
                           )}
                        </View>
                      </View>
                    )}

                    {editingSection === "address" && (
                      <View>
                        <AddressInput
                          label="Business Address"
                          value={values.location}
                          onChangeText={(text: string) => {
                            setFieldValue("location", text);
                            // Soft auto-fill search
                            if (text.length > 3 && !values.state) {
                              const states = getStatesByCountry('NG');
                              const matchedState = states.find((s: any) => text.toLowerCase().includes(s.name.toLowerCase()));
                              if (matchedState) {
                                setFieldValue("state", matchedState.name);
                              }
                            }
                          }}
                          onLocationSelect={async (loc: any) => {
                              const addressStr = loc.address || loc.name || loc;
                              setFieldValue("location", addressStr);
                              
                              if (loc.latitude && loc.longitude) {
                                  setFieldValue("latitude", String(loc.latitude));
                                  setFieldValue("longitude", String(loc.longitude));
                                  
                                  try {
                                    const reverseGeocoded = await Location.reverseGeocodeAsync({
                                      latitude: Number(loc.latitude),
                                      longitude: Number(loc.longitude)
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
                                          if (!values.lga) {
                                            setFieldValue("lga", addr.city || addr.subregion || "");
                                          }
                                        }
                                      }
                                    }
                                  } catch (e) {
                                    console.log("Reverse geocode error in profileDetails modal:", e);
                                  }
                              } else if (addressStr && !values.state) {
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
                                   console.log("Geocode fallback error in modal:", err);
                                 }
                              }
                          }}
                          placeholder="Search for your workshop address"
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
                      </View>
                    )}

                    {editingSection === "business" && (
                      <View>
                          <FormikInput name="nin_number" placeholder="Enter 11-digit NIN" label="NIN Number" required />
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

const ProfileDetails = () => {
  const queryClient = useQueryClient();
  const { data: profileData, isLoading: isLoadingProfile } = useMechanicProfile();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const mechanicProfile = profileData?.data?.mechanic_profile || (profileData as any)?.mechanic_profile;
  const userObj = mechanicProfile?.user;
  const displayName = userObj?.first_name && userObj?.last_name 
      ? `${userObj.first_name} ${userObj.last_name}`.trim() 
      : "Mechanic";
  const profileImage = mechanicProfile?.selfie || userObj?.profile_image || userObj?.image || "";
  
  const { data: specializations } = useSpecializations();
  const specializationOptions = useMemo(() => {
    const specs = Array.isArray(specializations) ? specializations : (specializations as any)?.data || [];
    return specs.map((spec: any) => ({
      label: spec.name,
      value: spec.id.toString(),
    }));
  }, [specializations]);

  const specializationLabels = useMemo(() => {
    if (!mechanicProfile?.specializations || !specializationOptions.length) return "Not set";
    const selectedIds = Array.isArray(mechanicProfile.specializations) 
      ? mechanicProfile.specializations.map(String) 
      : [String(mechanicProfile.specializations)];
    
    return specializationOptions
      .filter((opt: { label: string; value: string }) => selectedIds.includes(opt.value))
      .map((opt: { label: string; value: string }) => opt.label)
      .join(", ") || "Not set";
  }, [mechanicProfile?.specializations, specializationOptions]);

  const ProfileRow = ({ label, value, isBio = false }: { label: string; value: string, isBio?: boolean }) => (
    <View className={`py-4 border-b border-gray-50 last:border-0`}>
      <Text className="text-gray-500 font-NunitoMedium text-xs uppercase tracking-wider mb-1">{label}</Text>
      <Text className={`text-base font-NunitoMedium text-gray-900 ${isBio ? 'leading-6' : ''}`}>
        {value || "Not set"}
      </Text>
    </View>
  );

  const handleSectionSave = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('requestType', 'inbound');

      const getFileObject = (uri: string) => {
        if (!uri || uri.startsWith('http')) return null;
        return {
          uri,
          name: `profile_${Date.now()}.jpg`,
          type: 'image/jpeg'
        } as any;
      };

      if (values.profile_picture && (values.profile_picture.startsWith('file://') || values.profile_picture.startsWith('content://') || values.profile_picture.startsWith('ph://'))) {
        const profileFile = getFileObject(values.profile_picture);
        if (profileFile) {
          formData.append('selfie', profileFile);
        }
      }
      
      // Core User Data (fall back to existing user info if editing a different section)
      const firstName = values.first_name || userObj?.first_name;
      const lastName = values.last_name || userObj?.last_name;
      const phoneNumber = values.phone_number || userObj?.phone_number;

      if (firstName) formData.append("first_name", firstName);
      if (lastName) formData.append("last_name", lastName);
      if (phoneNumber) formData.append("phone_number", formatPhoneNumber(phoneNumber));
      
      const fullValues: Record<string, any> = {
        bio: values.bio !== undefined ? values.bio : (mechanicProfile?.bio || ""),
        location: values.location !== undefined ? values.location : (mechanicProfile?.location || ""),
        state: values.state !== undefined ? values.state : (mechanicProfile?.state || ""),
        lga: values.lga !== undefined ? values.lga : (mechanicProfile?.lga || ""),
        latitude: values.latitude !== undefined ? values.latitude : (mechanicProfile?.latitude || ""),
        longitude: values.longitude !== undefined ? values.longitude : (mechanicProfile?.longitude || ""),
        nin_number: values.nin_number !== undefined ? values.nin_number : (mechanicProfile?.nin_number || ""),
      };

      Object.entries(fullValues).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          formData.append(key, String(val));
        }
      });

      // Serialize specializations as a JSON string
      const rawSpecs = values.specializations !== undefined ? values.specializations : mechanicProfile?.specializations;
      if (rawSpecs) {
        const specs = Array.isArray(rawSpecs) ? rawSpecs : [rawSpecs];
        formData.append('specializations', JSON.stringify(specs));
      }

      await userAPI.submitMechanicKYC(formData);
      queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
      showToast.success("Section updated successfully");
      setIsModalVisible(false);
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update profile";
      showToast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImagePick = async (setFieldValue: any) => {
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
      if (!result.canceled && result.assets[0]) {
        setFieldValue("profile_picture", result.assets[0].uri);
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
        mechanicProfile={mechanicProfile}
        userObj={userObj}
        handleSectionSave={handleSectionSave}
        handleImagePick={handleImagePick}
        specializationOptions={specializationOptions}
      />
      
      <View className="px-5 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3"
          >
            <ChevronLeftIcon size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-NunitoExtraBold text-gray-900">Profile Details</Text>
            <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-widest mt-0.5">Manage your identity</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push(mechanicRoutes.EditProfile as any)}
          className="w-10 h-10 bg-gray-900 rounded-2xl items-center justify-center"
        >
          <PencilIcon size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        <AnimatedPageContainer animationType="fadeInUp" duration={600}>
          <View className="px-5 pt-6">
            <View className="items-center mb-10">
              <View className="w-32 h-32 rounded-[40px] items-center justify-center border-4 border-white shadow-xl mb-4 overflow-hidden bg-gray-50">
                {profileImage ? (
                  <Image source={{ uri: profileImage }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <LinearGradient colors={["#111827", "#374151"]} className="w-full h-full items-center justify-center">
                    <Text className="text-4xl font-NunitoExtraBold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <Text className="text-2xl font-NunitoExtraBold text-gray-900">{displayName}</Text>
              <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-widest mt-1">{userObj?.email}</Text>
            </View>

            {/* Personal Information */}
            <View className="mb-8 bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm">
              <SectionHeader 
                icon={UserIcon} 
                title="Professional Profile" 
                color="#111827"
                bgColor="bg-gray-50"
                onEdit={() => {
                  setEditingSection("personal");
                  setIsModalVisible(true);
                }}
              />
              <ProfileRow label="First Name" value={userObj?.first_name} />
              <ProfileRow label="Last Name" value={userObj?.last_name} />
              <ProfileRow label="Phone Number" value={userObj?.phone_number} />
              <ProfileRow label="Specializations" value={specializationLabels} />
              <ProfileRow label="Bio" value={mechanicProfile?.bio} isBio={true} />
            </View>

            {/* Address Details */}
            <View className="mb-8 bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm">
              <SectionHeader 
                icon={EnvelopeIcon} 
                title="Location Details" 
                color="#111827" 
                bgColor="bg-gray-50" 
                onEdit={() => {
                  setEditingSection("address");
                  setIsModalVisible(true);
                }}
              />
              <ProfileRow label="Workshop Address" value={mechanicProfile?.location} />
              <View className="flex-row gap-x-4">
                 <View className="flex-1">
                   <Text className="text-[10px] text-gray-400 font-NunitoExtraBold uppercase tracking-widest mb-1 mt-4">State</Text>
                   <Text className="text-base font-NunitoBold text-gray-900">{mechanicProfile?.state || "Not set"}</Text>
                 </View>
                 <View className="flex-1">
                   <Text className="text-[10px] text-gray-400 font-NunitoExtraBold uppercase tracking-widest mb-1 mt-4">LGA</Text>
                   <Text className="text-base font-NunitoBold text-gray-900">{mechanicProfile?.lga || "Not set"}</Text>
                 </View>
              </View>
            </View>

            {/* Business Information */}
            <View className="mb-8 bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm">
              <SectionHeader 
                icon={BriefcaseIcon} 
                title="Business Verification" 
                color="#111827" 
                bgColor="bg-gray-50" 
                onEdit={() => {
                  setEditingSection("business");
                  setIsModalVisible(true);
                }}
              />
              <ProfileRow label="NIN Number" value={mechanicProfile?.nin_number} />
            </View>

            {/* Documentation & Verification */}
            <View className="mb-8 bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm">
              <SectionHeader 
                icon={ShieldCheckIcon} 
                title="Verification Status" 
                color="#111827" 
                bgColor="bg-gray-50" 
                onEdit={() => {
                  router.push(mechanicRoutes.EditProfile as any);
                }}
              />
              <View className="flex-row items-center justify-between py-4 border-b border-gray-50">
                <Text className="text-gray-400 font-NunitoBold text-xs uppercase tracking-widest">NIN Document</Text>
                <View className={`px-4 py-1.5 rounded-full ${mechanicProfile?.nin_document ? "bg-green-50" : "bg-amber-50"}`}>
                  <Text className={`text-[10px] font-NunitoExtraBold uppercase tracking-widest ${mechanicProfile?.nin_document ? "text-green-600" : "text-amber-600"}`}>
                    {mechanicProfile?.nin_document ? "Verified" : "Pending"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push(mechanicRoutes.EditProfile as any)}
              className="mt-4 bg-gray-900 py-5 rounded-2xl items-center shadow-xl shadow-gray-200 active:opacity-90"
            >
              <Text className="text-white text-sm font-NunitoExtraBold uppercase tracking-widest">Master Profile Update</Text>
            </TouchableOpacity>
          </View>
        </AnimatedPageContainer>
      </ScrollView>
    </SafeAreaView>
  );
};


export default ProfileDetails;