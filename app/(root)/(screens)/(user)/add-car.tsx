
import {
  View,
  Text,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Formik } from "formik";
import { StatusBar } from "expo-status-bar";
import { useState, useMemo, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Device from "expo-device";
import FormikInput from "@/components/forms/FormikInput";
import FormikButton from "@/components/forms/FormikButton";
import SelectField from "@/components/forms/SelectField";
import VINInput from "@/components/VINInput";
import ImageUpload from "@/components/ImageUpload";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { decodeVIN } from "@/utils/vinDecoder";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userAPI, type AddVehiclePayload } from "@/lib/api/user";
import BackArrowBtn from "@/components/BackArrowBtn";
import { useVehicleMakes } from "@/hooks/useVehicleMakes";
import LoadingSpinner from "@/components/LoadingSpinner";

const emptyForm = {
  vin: "",
  car_make: "",
  car_model: "",
  car_year: "",
  license_plate: "",
};

const AddCar = () => {
  const params = useLocalSearchParams<{ carId?: string | string[] }>();
  const carId =
    typeof params.carId === "string"
      ? params.carId
      : Array.isArray(params.carId)
        ? params.carId[0]
        : undefined;
  const isEditMode = !!carId;

  const queryClient = useQueryClient();
  const {
    data: editVehicle,
    isLoading: editVehicleLoading,
    error: editVehicleError,
  } = useQuery({
    queryKey: ["userCar", carId],
    queryFn: () => userAPI.getCarById(carId!),
    enabled: isEditMode,
  });
  const { data: vehicleMakes, loading: vehicleMakesLoading } = useVehicleMakes();
  const [frontSideImage, setFrontSideImage] = useState("");
  const [backSideImage, setBackSideImage] = useState("");
  const [rightSideImage, setRightSideImage] = useState("");
  const [leftSideImage, setLeftSideImage] = useState("");

  const makeOptions = useMemo(
    () => vehicleMakes?.map((make) => ({ label: make.name, value: make.id.toString() })) ?? [],
    [vehicleMakes]
  );

  const getModelsForMake = useCallback(
    (makeId: string) => {
      if (!makeId || !vehicleMakes?.length) return [];
      return vehicleMakes.find((m) => m.id.toString() === makeId)?.models ?? [];
    },
    [vehicleMakes]
  );

  const resolveMakeModelNames = useCallback(
    (carMakeId: string, carModelValue: string) => {
      const makeName = vehicleMakes?.find((m) => m.id.toString() === carMakeId)?.name?.trim() ?? "";
      let modelName = "";
      if (carModelValue.startsWith("name:")) {
        modelName = carModelValue.slice(5).trim();
      } else if (carModelValue) {
        modelName =
          getModelsForMake(carMakeId).find((m) => m.id.toString() === carModelValue)?.name?.trim() ?? "";
      }
      return { makeName, modelName };
    },
    [vehicleMakes, getModelsForMake]
  );

  const initialValues = useMemo(() => {
    if (!isEditMode || !editVehicle) {
      return { ...emptyForm };
    }
    const v = editVehicle;
    const vin = v.vin != null ? String(v.vin) : "";
    const yearStr = v.year != null ? String(v.year) : "";
    const plate = v.license_plate != null ? String(v.license_plate) : "";
    if (!vehicleMakes?.length) {
      return { ...emptyForm, vin, car_year: yearStr, license_plate: plate };
    }
    const makeName = String(v.make ?? "").trim();
    const modelName = String(v.model ?? "").trim();
    const matchedMake = vehicleMakes.find(
      (m) => m.name.toLowerCase() === makeName.toLowerCase()
    );
    if (!matchedMake) {
      return { ...emptyForm, vin, car_year: yearStr, license_plate: plate };
    }
    const matchedModel = matchedMake.models.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase()
    );
    const car_model = matchedModel
      ? matchedModel.id.toString()
      : modelName
        ? `name:${modelName}`
        : "";
    return {
      vin,
      car_make: matchedMake.id.toString(),
      car_model,
      car_year: yearStr,
      license_plate: plate,
    };
  }, [isEditMode, editVehicle, vehicleMakes]);

  const saveMutation = useMutation({
    mutationFn: (payload: AddVehiclePayload) =>
      isEditMode && carId ? userAPI.updateCar(carId, payload) : userAPI.addCar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userCars"] });
      if (isEditMode && carId) {
        queryClient.invalidateQueries({ queryKey: ["userCar", carId] });
      }
      Alert.alert(
        isEditMode ? "Saved" : "Success!",
        isEditMode
          ? "Your car was updated successfully."
          : "Your car has been added successfully.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      let errorMessage = isEditMode
        ? "Failed to update car. Please try again."
        : "Failed to add car. Please try again.";

      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (errors.message) {
          errorMessage = errors.message;
        } else if (typeof errors === "object") {
          const errorMessages = Object.values(errors).flat();
          errorMessage = errorMessages.join(", ");
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
    },
  });

  const handleImageUpload = async (
    side: "front" | "back" | "right" | "left",
    source: "camera" | "gallery" = "gallery"
  ) => {
    try {
      let result;
      if (source === "camera") {
        if (!Device.isDevice) {
          Alert.alert(
            "Simulator Notice",
            "Camera hardware is not available on the iOS Simulator. Opening photo gallery instead."
          );
          return handleImageUpload(side, "gallery");
        }

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Sorry, we need camera permissions to take photos.",
            [{ text: "OK" }]
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Sorry, we need camera roll permissions to upload images.",
            [{ text: "OK" }]
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;

        // Update the appropriate state
        switch (side) {
          case "front":
            setFrontSideImage(imageUri);
            break;
          case "back":
            setBackSideImage(imageUri);
            break;
          case "right":
            setRightSideImage(imageUri);
            break;
          case "left":
            setLeftSideImage(imageUri);
            break;
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload image. Please try again.");
    }
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const toLocalFile = (uri: string, side: string) => {
        if (!uri || uri.startsWith("http")) return null;
        return {
          uri,
          name: `${side}_${Date.now()}.jpg`,
          type: "image/jpeg",
        };
      };

      const images = [
        toLocalFile(frontSideImage, "front"),
        toLocalFile(backSideImage, "back"),
        toLocalFile(rightSideImage, "right"),
        toLocalFile(leftSideImage, "left"),
      ].filter(Boolean) as { uri: string; name: string; type: string }[];

      const year = parseInt(String(values.car_year).trim(), 10);
      const { makeName, modelName } = resolveMakeModelNames(values.car_make, values.car_model);

      if (!makeName || !modelName) {
        Alert.alert(
          "Missing vehicle details",
          "Please select a valid make and model from the lists.",
          [{ text: "OK" }]
        );
        return;
      }

      await saveMutation.mutateAsync({
        vin: values.vin?.trim() || undefined,
        make: makeName,
        model: modelName,
        year,
        license_plate: values.license_plate?.trim() || undefined,
        images: images.length > 0 ? images : undefined,
      });
      // Mutation errors are handled in its onError callback
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode && editVehicleLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />
        <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900 ml-4">Edit Car</Text>
        </View>
        <LoadingSpinner
          message="Loading vehicle…"
          subMessage="Please wait"
          size="medium"
        />
      </SafeAreaView>
    );
  }

  if (isEditMode && (editVehicleError || !editVehicle)) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />
        <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900 ml-4">Edit Car</Text>
        </View>
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-lg font-NunitoBold text-gray-900 text-center mb-2">
            Could not load this vehicle
          </Text>
          <Text className="text-gray-500 text-center">
            Go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Simple Header */}
      <View className="flex-row items-center px-5 py-4 bg-white">
        <BackArrowBtn />
        <Text className="text-xl font-NunitoBold text-gray-900 ml-4">
          {isEditMode ? "Edit Car" : "Add Car"}
        </Text>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 70 : 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 py-4">

          <Formik
            key={isEditMode ? `edit-${carId}-${initialValues.car_make}` : "add"}
            enableReinitialize
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validate={(values) => {
              const errors: any = {};

              if (!values.car_make || String(values.car_make).trim() === "") {
                errors.car_make = "Car make is required";
              }

              if (!values.car_model || String(values.car_model).trim() === "") {
                errors.car_model = "Car model is required";
              }

              if (!values.car_year || values.car_year.trim() === "") {
                errors.car_year = "Car year is required";
              } else {
                const year = parseInt(values.car_year);
                const currentYear = new Date().getFullYear();
                if (isNaN(year) || year < 1900 || year > currentYear + 1) {
                  errors.car_year = "Please enter a valid year";
                }
              }

              return errors;
            }}
          >
            {({ setFieldValue, setFieldTouched, values, errors, touched }) => {
              const baseModelOptions = getModelsForMake(values.car_make).map((m) => ({
                label: m.name,
                value: m.id.toString(),
              }));
              const modelOptions =
                values.car_model?.startsWith("name:") &&
                !baseModelOptions.some((o) => o.value === values.car_model)
                  ? [
                      ...baseModelOptions,
                      { label: values.car_model.slice(5), value: values.car_model },
                    ]
                  : baseModelOptions;

              // Decode VIN (NHTSA) and prefill make / model / year. VINInput auto-runs this when 17 valid chars are entered.
              const handleVINLookup = async (vin: string, setFieldValueInner: any) => {
                const clean = vin.replace(/\s/g, "").toUpperCase();
                if (clean.length !== 17) return;

                try {
                  const vehicleInfo = await decodeVIN(clean);
                  if (!vehicleInfo?.make?.trim() && !vehicleInfo?.model?.trim()) {
                    throw new Error(
                      "Unable to find vehicle information for this VIN. Please verify and try again."
                    );
                  }

                  const make = (vehicleInfo.make || "").trim();
                  let modelOnly = (vehicleInfo.model || "").trim();
                  if (make) {
                    const prefix = `${make} `;
                    if (modelOnly.toLowerCase().startsWith(prefix.toLowerCase())) {
                      modelOnly = modelOnly.slice(make.length).trim();
                    } else if (modelOnly.toLowerCase() === make.toLowerCase()) {
                      modelOnly = "";
                    }
                  }

                  const yearStr =
                    vehicleInfo.modelYear != null &&
                    String(vehicleInfo.modelYear).trim() !== "" &&
                    String(vehicleInfo.modelYear).trim() !== "0"
                      ? String(vehicleInfo.modelYear).trim()
                      : "";

                  setFieldValueInner("vin", clean);
                  setFieldValueInner("car_year", yearStr);

                  const matchedMake = vehicleMakes?.find(
                    (m) => m.name.toLowerCase() === make.toLowerCase()
                  );

                  if (matchedMake) {
                    setFieldValueInner("car_make", matchedMake.id.toString());

                    const nhtsaModel = modelOnly.toLowerCase();
                    const makeLc = make.toLowerCase();
                    const cleanModelName = nhtsaModel.startsWith(`${makeLc} `)
                      ? nhtsaModel.slice(makeLc.length).trim()
                      : nhtsaModel;

                    const matchedModel = matchedMake.models.find(
                      (m) =>
                        m.name.toLowerCase() === cleanModelName ||
                        m.name.toLowerCase() === nhtsaModel ||
                        m.name.toLowerCase().replace(/\s+/g, "") ===
                          cleanModelName.replace(/\s+/g, "")
                    );

                    if (matchedModel) {
                      setFieldValueInner("car_model", matchedModel.id.toString());
                    } else if (modelOnly) {
                      setFieldValueInner("car_model", `name:${modelOnly}`);
                    } else {
                      setFieldValueInner("car_model", "");
                    }
                  } else {
                    setFieldValueInner("car_make", "");
                    setFieldValueInner("car_model", "");
                  }
                } catch (error: any) {
                  const message =
                    error?.message ||
                    "Unable to find vehicle information for this VIN. Please check the VIN and try again.";
                  Alert.alert("VIN Lookup Failed", message, [{ text: "OK" }]);
                  throw error;
                }
              };

              return (
                <View>
                  <VINInput
                    name="vin"
                    label={isEditMode ? "VIN (Optional)" : "VIN"}
                    placeholder="Enter 17-character VIN to auto-fill make, model & year"
                    onVINLookup={handleVINLookup}
                    required={!isEditMode}
                  />

                  <View className="mt-4">
                    <SelectField
                      name="car_make"
                      label="Car Make"
                      placeholder={
                        vehicleMakesLoading ? "Loading makes…" : "Select car make"
                      }
                      options={makeOptions}
                      value={values.car_make}
                      onValueChange={(v) => {
                        setFieldValue("car_make", v);
                        setFieldValue("car_model", "");
                        setFieldTouched("car_make", true);
                      }}
                      error={errors.car_make as string}
                      touched={touched.car_make as boolean}
                      required
                    />
                  </View>

                  <View className="mt-4">
                    <SelectField
                      name="car_model"
                      label="Car Model"
                      placeholder={
                        !values.car_make
                          ? "Select make first"
                          : vehicleMakesLoading
                            ? "Loading models…"
                            : "Select car model"
                      }
                      options={modelOptions}
                      value={values.car_model}
                      onValueChange={(v) => {
                        setFieldValue("car_model", v);
                        setFieldTouched("car_model", true);
                      }}
                      error={errors.car_model as string}
                      touched={touched.car_model as boolean}
                      required
                    />
                  </View>

                  <FormikInput
                    name="car_year"
                    label="Year"
                    placeholder="e.g., 2020"
                    labelStyle="mt-4"
                    type="number"
                    keyboardType="numeric"
                    autoCorrect={false}
                    required
                  />

                  <FormikInput
                    name="license_plate"
                    label="License Plate (Optional)"
                    placeholder="e.g., ABC123"
                    labelStyle="mt-4"
                    type="text"
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />

                  {/* Car Images Section */}
                  <View className="mt-6">
                    <Text className="text-base font-NunitoBold text-gray-900 mb-4">
                      Car Images (Optional)
                    </Text>

                    {/* 2x2 Grid for Car Images */}
                    <View className="space-y-4">
                      {/* Top Row */}
                      <View className="flex-row space-x-4 gap-2">
                        {/* Front Side */}
                        <View className="flex-1">
                          <ImageUpload
                            label="Front Side"
                            isUploaded={!!frontSideImage}
                            onPress={(source) => handleImageUpload("front", source)}
                            uploadedText="Front Side Uploaded"
                            imageUri={frontSideImage}
                            carSide="front"
                          />
                        </View>

                        {/* Back Side */}
                        <View className="flex-1">
                          <ImageUpload
                            label="Back Side"
                            isUploaded={!!backSideImage}
                            onPress={(source) => handleImageUpload("back", source)}
                            uploadedText="Back Side Uploaded"
                            imageUri={backSideImage}
                            carSide="back"
                          />
                        </View>
                      </View>

                      {/* Bottom Row */}
                      <View className="flex-row space-x-4 gap-2">
                        {/* Right Side */}
                        <View className="flex-1">
                          <ImageUpload
                            label="Right Side"
                            isUploaded={!!rightSideImage}
                            onPress={(source) => handleImageUpload("right", source)}
                            uploadedText="Right Side Uploaded"
                            imageUri={rightSideImage}
                            carSide="right"
                          />
                        </View>

                        {/* Left Side */}
                        <View className="flex-1">
                          <ImageUpload
                            label="Left Side"
                            isUploaded={!!leftSideImage}
                            onPress={(source) => handleImageUpload("left", source)}
                            uploadedText="Left Side Uploaded"
                            imageUri={leftSideImage}
                            carSide="left"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="mt-6">
                    <FormikButton
                      title={isEditMode ? "Save changes" : "Add Car"}
                      className="py-4"
                      loading={saveMutation.isPending}
                    />
                  </View>
                </View>
              );
            }}
          </Formik>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default AddCar;

