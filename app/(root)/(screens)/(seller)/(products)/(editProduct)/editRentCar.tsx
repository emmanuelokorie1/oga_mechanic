import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import EditSuccessDrawer from '@/components/modals/EditSuccessDrawer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'
import { SparklesIcon } from 'react-native-heroicons/solid'
import { router, useLocalSearchParams } from 'expo-router'
import { generateRentalCarDescription } from '@/utils/aiDescriptionGenerator'
import { Formik } from 'formik'
import * as Yup from 'yup'
import FormikInput from '@/components/forms/FormikInput'
import FormikTextArea from '@/components/forms/FormikTextArea'
import SelectField from '@/components/forms/SelectField'
import FormikButton from '@/components/forms/FormikButton'
import FeatureBadges from '@/components/forms/FeatureBadges'
import { sellerRoutes } from '@/constants/routes'
import { useCategories } from '@/hooks/useProducts'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import {
  deliveryOptions,
  bodyTypeOptions,
  fuelTypeOptions,
  conditionOptions,
  transmissionOptions,
  availabilityOptions,
  featureOptions
} from '@/constants/data'
import CustomButton from '@/components/CustomButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import CustomAlert from '@/components/CustomAlert'
import { useCustomAlert } from '@/hooks/useCustomAlert'

const EditRentCar = () => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiVariationIndex, setAiVariationIndex] = useState(0)
  const [successDrawerVisible, setSuccessDrawerVisible] = useState(false)
  const [updatedProductData, setUpdatedProductData] = useState<any>(null)
  const [hasError, setHasError] = useState(false)
  const featuresInitialized = useRef(false)
  const { visible, alertConfig, hideAlert, showSuccess, showError } = useCustomAlert()

  const handleGenerateAIRentalDescription = async (
    values: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setIsGeneratingAI(true);
    await new Promise(resolve => setTimeout(resolve, 400));

    try {
      const resolvedMake = vehicleMakes?.find(
        (m: any) => m.id.toString() === values.make?.toString() || m.name.toLowerCase() === values.make?.toString().toLowerCase()
      );
      const resolvedMakeName = resolvedMake?.name || (typeof productData?.make === 'object' ? productData?.make?.name : productData?.make) || values.make || '';

      const availableModels = resolvedMake?.models || [];
      const resolvedModel = availableModels.find(
        (m: any) => m.id.toString() === values.model?.toString() || m.name.toLowerCase() === values.model?.toString().toLowerCase()
      );
      const resolvedModelName = resolvedModel?.name || (typeof productData?.model === 'object' ? productData?.model?.name : productData?.model) || values.model || '';

      const generated = generateRentalCarDescription({
        year: values.year,
        make: resolvedMakeName,
        model: resolvedModelName,
        name: values.name,
        body_type: values.body_type,
        transmission: values.transmission,
        fuel_type: values.fuel_type,
        seats: values.number_of_seats,
        exterior_color: values.exterior_color,
        features: selectedFeatures,
        price: values.price,
      }, aiVariationIndex);

      setFieldValue('description', generated);
      setAiVariationIndex(prev => prev + 1);
    } catch (err) {
      console.error('Error generating AI rental description:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Get navigation parameters
  const { productId, productData: productDataParam } = useLocalSearchParams<{
    productId?: string;
    productData?: string;
  }>();

  // Parse product data safely
  const productData = React.useMemo(() => {
    if (!productDataParam) return null;
    try {
      return JSON.parse(productDataParam);
    } catch (error) {
      setHasError(true);
      return null;
    }
  }, [productDataParam]);

  // Fetch categories and vehicle makes
  const { data: categories } = useCategories();
  const { data: vehicleMakes } = useVehicleMakes();

  // Get car category ID
  const carCategory = categories?.find(cat => cat.name.toLowerCase().includes('car'));
  const carCategoryId = carCategory?.id;

  // Get vehicle makes and models with error handling
  const makeOptions = React.useMemo(() => {
    try {
      return vehicleMakes?.map(make => ({
        label: make?.name || 'Unknown Make',
        value: make?.id?.toString() || ''
      })) || [];
    } catch (error) {
      return [];
    }
  }, [vehicleMakes]);

  // Helper to resolve make ID from productData
  const initialMakeId = React.useMemo(() => {
    if (!productData) return '';
    if (productData.make_id) return productData.make_id.toString();
    if (typeof productData.make === 'object' && productData.make?.id) {
      return productData.make.id.toString();
    }
    if (productData.make !== undefined && productData.make !== null && typeof productData.make !== 'object' && !isNaN(Number(productData.make)) && productData.make !== '') {
      return productData.make.toString();
    }
    const rawMakeName = typeof productData.make === 'object' ? productData.make?.name : productData.make;
    if (vehicleMakes && rawMakeName) {
      const searchStr = rawMakeName.toString().trim().toLowerCase();
      const found = vehicleMakes.find(
        (m: any) => m.name.toLowerCase() === searchStr || m.id.toString() === searchStr
      );
      if (found) return found.id.toString();
    }
    return typeof productData.make === 'string' ? productData.make : '';
  }, [productData, vehicleMakes]);

  // Helper to resolve model ID from productData
  const initialModelId = React.useMemo(() => {
    if (!productData) return '';
    if (productData.model_id) return productData.model_id.toString();
    if (typeof productData.model === 'object' && productData.model?.id) {
      return productData.model.id.toString();
    }
    if (productData.model !== undefined && productData.model !== null && typeof productData.model !== 'object' && !isNaN(Number(productData.model)) && productData.model !== '') {
      return productData.model.toString();
    }
    const rawModelName = typeof productData.model === 'object' ? productData.model?.name : productData.model;
    const rawMakeName = typeof productData.make === 'object' ? productData.make?.name : productData.make;
    const makeSearch = (initialMakeId || rawMakeName || '').toString().toLowerCase();

    if (vehicleMakes && (makeSearch || rawModelName)) {
      const selectedMake = vehicleMakes.find(
        (m: any) => m.id.toString() === makeSearch || m.name.toLowerCase() === makeSearch
      );
      if (selectedMake?.models && rawModelName) {
        const modelSearch = rawModelName.toString().trim().toLowerCase();
        const found = selectedMake.models.find(
          (m: any) =>
            m.name.toLowerCase() === modelSearch ||
            m.id.toString() === modelSearch ||
            modelSearch.includes(m.name.toLowerCase())
        );
        if (found) return found.id.toString();
      }
    }
    return typeof productData.model === 'string' ? productData.model : '';
  }, [productData, vehicleMakes, initialMakeId]);

  // Dynamic model options based on selected make
  const getModelsForMake = React.useCallback(
    (makeIdentifier?: string | number) => {
      if (!makeIdentifier || !vehicleMakes) return [];
      const makeStr = makeIdentifier.toString().toLowerCase();
      const selectedMake = vehicleMakes.find(
        (make: any) =>
          make.id?.toString() === makeStr ||
          make.name?.toLowerCase() === makeStr
      );
      return (
        selectedMake?.models?.map((model: any) => ({
          label: model?.name || 'Unknown Model',
          value: model?.id?.toString() || '',
        })) || []
      );
    },
    [vehicleMakes]
  );

  const validationSchema = Yup.object().shape({
    body_type: Yup.string().required('Vehicle type is required'),
    name: Yup.string().required('Name is required'),
    make: Yup.string().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Make is required'),
      otherwise: (schema) => schema.optional()
    }),
    model: Yup.string().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Model is required'),
      otherwise: (schema) => schema.optional()
    }),
    year: Yup.string().optional(),
    condition: Yup.string().required('Condition is required'),
    transmission: Yup.string().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Transmission is required'),
      otherwise: (schema) => schema.optional()
    }),
    fuel_type: Yup.string().required('Fuel type is required'),
    exterior_color: Yup.string().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Exterior color is required'),
      otherwise: (schema) => schema.optional()
    }),
    number_of_seats: Yup.string().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Number of seats is required'),
      otherwise: (schema) => schema.optional()
    }),
    description: Yup.string().optional(),
    price: Yup.string().required('Price is required'),
    stock: Yup.string().required('Stock is required'),
    availability: Yup.string().required('Availability is required'),
    delivery_option: Yup.string().required('Delivery option is required'),
  })

  // Initialize selected features based on product data
  useEffect(() => {
    if (productData && productData.id && !featuresInitialized.current) {
      const features: string[] = [];

      // Map product data to feature display names
      const featureMapping: Record<string, string> = {
        'air_conditioning': 'Air Conditioning',
        'leather_seats': 'Leather Seats',
        'navigation_system': 'Navigation System',
        'bluetooth': 'Bluetooth',
        'parking_sensors': 'Parking Sensors',
        'cruise_control': 'Cruise Control',
        'keyless_entry': 'Keyless Entry',
        'sunroof': 'Sunroof',
        'alloy_wheels': 'Alloy Wheels',
        'airbags': 'Airbags',
        'abs': 'ABS',
        'traction_control': 'Traction Control',
        'lane_assist': 'Lane Assist',
        'blind_spot_monitor': 'Blind Spot Monitor'
      };

      // Check each feature and add display name if true
      Object.entries(featureMapping).forEach(([key, displayName]) => {
        if (productData[key]) {
          features.push(displayName);
        }
      });

      setSelectedFeatures(features);
      featuresInitialized.current = true;
    }
  }, [productData?.id]); // Only depend on productData.id to prevent infinite re-renders

  const initialValues = {
    name: productData?.name || '',
    make: initialMakeId,
    model: initialModelId,
    year: productData?.year?.toString() || '',
    condition: productData?.condition || '',
    body_type: productData?.body_type || '',
    transmission: productData?.transmission || '',
    fuel_type: productData?.fuel_type || '',
    exterior_color: productData?.exterior_color || '',
    number_of_seats: productData?.number_of_seats?.toString() || '',
    description: productData?.description || '',
    price: productData?.price ? Math.round(parseFloat(productData.price.toString())).toString() : '',
    currency: productData?.currency || 'NGN',
    stock: productData?.stock?.toString() || '',
    availability: productData?.availability || '',
    delivery_option: productData?.delivery_option || '',
    negotiable: productData?.negotiable || false,
  }

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }

  const handleSubmit = async (values: typeof initialValues, { setErrors }: any) => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!productId) {
        throw new Error('Product ID is missing');
      }

      if (!carCategoryId) {
        throw new Error('Car category not found');
      }

      // Convert features array to boolean object
      const featureMapping: Record<string, string> = {
        'Air Conditioning': 'air_conditioning',
        'Leather Seats': 'leather_seats',
        'Navigation System': 'navigation_system',
        'Bluetooth': 'bluetooth',
        'Parking Sensors': 'parking_sensors',
        'Cruise Control': 'cruise_control',
        'Keyless Entry': 'keyless_entry',
        'Sunroof': 'sunroof',
        'Alloy Wheels': 'alloy_wheels',
        'Airbags': 'airbags',
        'ABS': 'abs',
        'Traction Control': 'traction_control',
        'Lane Assist': 'lane_assist',
        'Blind Spot Monitor': 'blind_spot_monitor'
      };

      const features = featureOptions.reduce((acc, feature) => {
        const featureKey = featureMapping[feature] || feature.toLowerCase().replace(/\s+/g, '_');
        acc[featureKey] = selectedFeatures.includes(feature); // Use display name for comparison
        return acc;
      }, {} as Record<string, boolean>);

      // Safe parsing helper function
      const safeParseInt = (value: string, fallback: number = 0): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? fallback : parsed;
      };

      const isUtility = values.body_type === 'van' || values.body_type === 'truck';

      const resolveMakeInt = (val?: string) => {
        if (!val) return null;
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
        const found = vehicleMakes?.find((m: any) => m.name.toLowerCase() === val.toLowerCase());
        return found ? found.id : null;
      };

      const resolveModelInt = (makeVal?: string, modelVal?: string) => {
        if (!modelVal) return null;
        const parsed = parseInt(modelVal, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
        const makeModels = getModelsForMake(makeVal);
        const found = makeModels.find((m: any) => m.label.toLowerCase() === modelVal.toLowerCase());
        return found ? parseInt(found.value, 10) : null;
      };

      const payload = {
        data: {
          category_id: carCategoryId,
          name: values.name || '',
          make: isUtility ? null : resolveMakeInt(values.make),
          model: isUtility ? null : resolveModelInt(values.make, values.model),
          year: isUtility ? null : safeParseInt(values.year),
          condition: values.condition || '',
          body_type: values.body_type || '',
          transmission: isUtility ? null : (values.transmission || ''),
          fuel_type: values.fuel_type || '',
          exterior_color: isUtility ? null : (values.exterior_color || ''),
          number_of_seats: isUtility ? 0 : safeParseInt(values.number_of_seats),
          air_conditioning: features.air_conditioning || false,
          leather_seats: features.leather_seats || false,
          navigation_system: features.navigation_system || false,
          bluetooth: features.bluetooth || false,
          parking_sensors: features.parking_sensors || false,
          cruise_control: features.cruise_control || false,
          keyless_entry: features.keyless_entry || false,
          sunroof: features.sunroof || false,
          alloy_wheels: features.alloy_wheels || false,
          description: values.description || '',
          price: values.price || '0',
          currency: values.currency || 'NGN',
          negotiable: values.negotiable || false,
          discount: "0",
          availability: values.availability || '',
          stock: safeParseInt(values.stock),
          is_rental: true, // Always true for rental cars
          airbags: features.airbags || false,
          abs: features.abs || false,
          traction_control: features.traction_control || false,
          lane_assist: features.lane_assist || false,
          blind_spot_monitor: features.blind_spot_monitor || false,
          delivery_option: values.delivery_option || '',
        },
        requestType: "inbound"
      }

      // Call the products API endpoint for update
      const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/products/products/${productId}/`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData.message || 
                         (responseData.errors && Object.values(responseData.errors).flat()[0]) || 
                         "Failed to process request";
        throw new Error(errorMsg);
      }

      // Store updated product data and show success drawer
      setUpdatedProductData(responseData.data || productData);
      setSuccessDrawerVisible(true);

    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('vin')) {
        setErrors({ vin: error.message });
      }

      if (error.message && error.message.toLowerCase().includes('limit of 2 active products')) {
        showError('Product Limit Reached', error.message, {
          buttonText: 'Subscribe',
          onButtonPress: () => {
            hideAlert();
            router.push(sellerRoutes.subscription as any);
          }
        });
        return;
      }

      showError('Error', error.message || 'Failed to update rental car. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCloseDrawer = () => {
    setSuccessDrawerVisible(false);
  };

  const handleContinueToImages = () => {
    setSuccessDrawerVisible(false);
    router.push({
      pathname: sellerRoutes.editImage as any,
      params: {
        productId: productId,
        productData: JSON.stringify(updatedProductData),
        productType: 'rental-car',
      }
    });
  };

  const handleDone = () => {
    setSuccessDrawerVisible(false);
    router.back();
  };

  // Show error state if there was a parsing error
  if (hasError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity
              onPress={() => router.push(sellerRoutes?.products)}
              className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
            >
              <ArrowLeftIcon size={20} color="#374151" />
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-xl font-NunitoBold text-gray-900">Edit Rental Car</Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-NunitoBold text-gray-900 mb-2">Error Loading Data</Text>
          <Text className="text-gray-600 text-center mb-4">
            There was an error loading the rental car information. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-primary-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-NunitoBold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading if no product data or missing productId
  if (!productData || !productId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />

        {/* Header */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
            >
              <ArrowLeftIcon size={20} color="#374151" />
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-xl font-NunitoBold text-gray-900">Edit Rental Car</Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        {!productId ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-lg font-NunitoBold text-gray-900 mb-2">Missing Product Information</Text>
            <Text className="text-gray-600 text-center mb-4">
              Unable to load rental car details. Please try again.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-NunitoBold">Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <LoadingSpinner
            message="Loading Rental Car Details..."
            subMessage="Please wait while we fetch the information"
            size="medium"
            logoSize={32}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
          >
            <ArrowLeftIcon size={20} color="#374151" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-NunitoBold text-gray-900">
              Edit Rental Car
            </Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">
              Update your rental car information
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'ios' ? 60 : 40,
            flexGrow: 1
          }}
        >
          {/* Form Fields */}
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ values, errors, touched, handleSubmit: formikHandleSubmit, isValid, dirty, isSubmitting: formikIsSubmitting, setFieldValue }) => {
              const isUtility = values.body_type === 'van' || values.body_type === 'truck';

              return (
                <View className="space-y-6">
                  {/* Basic Information */}
                  <View className="bg-white rounded-2xl p-5 my-4 border border-gray-200">
                    <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 bg-blue-500 rounded-lg items-center justify-center mr-3">
                        <Text className="text-white font-NunitoBold text-sm">1</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-NunitoBold text-gray-900">Basic Information</Text>
                        <Text className="text-xs text-gray-500 font-NunitoMedium">
                          Update only the fields you want to change
                        </Text>
                      </View>
                    </View>

                    {/* Body type */}
                    <SelectField
                      name="body_type"
                      label="Vehicle Category"
                      placeholder="Select body type"
                      options={bodyTypeOptions}
                      value={values.body_type}
                      onValueChange={(value) => {
                        setFieldValue('body_type', value);
                        if (value === 'van' && !values.name) setFieldValue('name', 'Towing Van');
                        if (value === 'truck' && !values.name) setFieldValue('name', 'Truck / Utility');
                      }}
                      error={errors.body_type as string}
                      touched={touched.body_type as boolean}
                    />

                    {/* Name of car */}
                    <FormikInput
                      name="name"
                      label={isUtility ? "Service/Vehicle Name" : "Rental Car Name"}
                      placeholder={isUtility ? "e.g., Heavy Duty Towing" : "e.g., Toyota Camry LE"}
                      type="text"
                    />

                    {!isUtility && (
                      <>
                        {/* Make */}
                        <SelectField
                          name="make"
                          label="Make"
                          placeholder="Select make"
                          options={makeOptions}
                          value={values.make}
                          onValueChange={(value) => {
                            setFieldValue('make', value);
                            setFieldValue('model', ''); // Reset model when make changes
                          }}
                          error={errors.make as string}
                          touched={touched.make as boolean}
                        />

                        {/* Model */}
                        <SelectField
                          name="model"
                          label="Model"
                          placeholder={!values.make ? "Select make first" : "Select model"}
                          options={getModelsForMake(values.make)}
                          value={values.model}
                          onValueChange={(value) => setFieldValue('model', value)}
                          error={errors.model as string}
                          touched={touched.model as boolean}
                          disabled={!values.make}
                        />

                        {/* Year */}
                        <FormikInput
                          name="year"
                          label="Year"
                          placeholder="e.g., 2020"
                          keyboardType="numeric"
                          type="text"
                        />
                      </>
                    )}

                    {/* Condition */}
                    <SelectField
                      name="condition"
                      label="Condition"
                      placeholder="Select condition"
                      options={conditionOptions}
                      value={values.condition}
                      onValueChange={(value) => setFieldValue('condition', value)}
                      error={errors.condition as string}
                      touched={touched.condition as boolean}
                    />
                  </View>

                  {/* Vehicle Specifications */}
                  <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
                    <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 bg-green-500 rounded-lg items-center justify-center mr-3">
                        <Text className="text-white font-NunitoBold text-sm">2</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-NunitoBold text-gray-900">Vehicle Specifications</Text>
                        <Text className="text-xs text-gray-500 font-NunitoMedium">
                          Technical details and features
                        </Text>
                      </View>
                    </View>

                    {/* Transmission */}
                    {!isUtility && (
                      <SelectField
                        name="transmission"
                        label="Transmission"
                        placeholder="Select transmission"
                        options={transmissionOptions}
                        value={values.transmission}
                        onValueChange={(value) => setFieldValue('transmission', value)}
                        error={errors.transmission as string}
                        touched={touched.transmission as boolean}
                      />
                    )}

                    {/* Fuel type */}
                    <SelectField
                      name="fuel_type"
                      label="Fuel Type"
                      placeholder="Select fuel type"
                      options={fuelTypeOptions}
                      value={values.fuel_type}
                      onValueChange={(value) => setFieldValue('fuel_type', value)}
                      error={errors.fuel_type as string}
                      touched={touched.fuel_type as boolean}
                    />

                    {!isUtility && (
                      <>
                        {/* Exterior color */}
                        <FormikInput
                          name="exterior_color"
                          label="Exterior Color"
                          placeholder="e.g., Black, White, Silver, Red"
                          type="text"
                        />

                        {/* Number of seats */}
                        <FormikInput
                          name="number_of_seats"
                          label="Number of Seats"
                          placeholder="e.g., 4, 5, 7"
                          keyboardType="numeric"
                          type="text"
                        />
                      </>
                    )}
                  </View>

                  {/* Features */}
                  <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
                    <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 bg-purple-500 rounded-lg items-center justify-center mr-3">
                        <Text className="text-white font-NunitoBold text-sm">3</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-NunitoBold text-gray-900">Features</Text>
                        <Text className="text-xs text-gray-500 font-NunitoMedium">
                          Select available features
                        </Text>
                      </View>
                    </View>

                    <FeatureBadges
                      features={featureOptions}
                      selectedFeatures={selectedFeatures}
                      onFeatureToggle={handleFeatureToggle}
                    />
                  </View>

                  {/* Description */}
                  <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
                    <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 bg-orange-500 rounded-lg items-center justify-center mr-3">
                        <Text className="text-white font-NunitoBold text-sm">4</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-NunitoBold text-gray-900">Description</Text>
                        <Text className="text-xs text-gray-500 font-NunitoMedium">
                          Additional details about your rental
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleGenerateAIRentalDescription(values, setFieldValue)}
                        disabled={isGeneratingAI}
                        activeOpacity={0.8}
                        className="flex-row items-center px-3 py-1.5 rounded-full bg-gray-900 active:bg-gray-800"
                      >
                        {isGeneratingAI ? (
                          <>
                            <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.7 }] }} />
                            <Text className="text-white font-NunitoBold text-[11px] ml-1.5">Writing...</Text>
                          </>
                        ) : (
                          <>
                            <SparklesIcon size={12} color="#FBBF24" />
                            <Text className="text-white font-NunitoBold text-[11px] ml-1">
                              {values.description ? 'Regenerate' : 'AI Generate'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    <FormikTextArea
                      name="description"
                      label="Description"
                      placeholder={isUtility ? "Describe your service, capacity, rental terms, etc." : "Describe your rental car, special features, rental terms, etc."}
                      numberOfLines={5}
                      maxLength={500}
                      helperText={isUtility ? "Describe capacity, service area, and terms" : "Describe condition, features, and terms"}
                    />
                  </View>

                  {/* Pricing and Availability */}
                  <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
                    <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 bg-red-500 rounded-lg items-center justify-center mr-3">
                        <Text className="text-white font-NunitoBold text-sm">5</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-NunitoBold text-gray-900">Pricing & Availability</Text>
                        <Text className="text-xs text-gray-500 font-NunitoMedium">
                          Set your rental pricing and availability
                        </Text>
                      </View>
                    </View>

                    {/* Price */}
                    <View className="mb-4">
                      <Text className="text-base font-NunitoSemiBold text-gray-700 mb-3">
                        Daily Rental Price (₦)
                      </Text>
                      <FormikInput
                        name="price"
                        label=""
                        placeholder="e.g., 25,000"
                        keyboardType="numeric"
                        type="text"
                      />
                    </View>

                    {/* Negotiable toggle */}
                    <View className="flex-row items-center justify-between mb-4">
                      <Text className="text-base font-NunitoSemiBold text-gray-700">
                        Price Negotiable
                      </Text>
                      <TouchableOpacity
                        onPress={() => setFieldValue('negotiable', !values.negotiable)}
                        className={`w-12 h-6 rounded-full ${values.negotiable ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <View className={`w-5 h-5 rounded-full bg-white mt-0.5 ${values.negotiable ? 'ml-6' : 'ml-0.5'}`} />
                      </TouchableOpacity>
                    </View>

                    {/* Stock */}
                    <FormikInput
                      name="stock"
                      label="Inventory Available"
                      placeholder="e.g., 1, 2, 5"
                      keyboardType="numeric"
                      type="text"
                    />

                    {/* Availability */}
                    <SelectField
                      name="availability"
                      label="Availability Status"
                      placeholder="Select availability"
                      options={availabilityOptions}
                      value={values.availability}
                      onValueChange={(value) => setFieldValue('availability', value)}
                      error={errors.availability as string}
                      touched={touched.availability as boolean}
                    />

                    {/* Delivery option */}
                    <SelectField
                      name="delivery_option"
                      label="Delivery/Pickup"
                      placeholder="Select option"
                      options={deliveryOptions}
                      value={values.delivery_option}
                      onValueChange={(value) => setFieldValue('delivery_option', value)}
                      error={errors.delivery_option as string}
                      touched={touched.delivery_option as boolean}
                    />
                  </View>

                  {/* Action Buttons */}
                  <View className="bg-white rounded-2xl p-5 mb-2 border border-gray-200">
                    <FormikButton
                      title="Update Rental Details"
                      type="submit"
                      onPress={() => {
                        formikHandleSubmit();
                      }}
                      disabled={isSubmitting || formikIsSubmitting}
                      loading={isSubmitting || formikIsSubmitting}
                      loadingText="Updating"
                      className="mb-3"
                    />

                    <CustomButton
                      title='Edit Images'
                      bgVariant='outline'
                      textVariant='outline'
                      onPress={() => {
                        router.push({
                          pathname: sellerRoutes.editImage as any,
                          params: {
                            productId: productId,
                            productData: JSON.stringify(productData),
                          }
                        });
                      }}
                    />

                    <Text className="text-xs text-gray-500 text-center font-NunitoMedium mt-2">
                      All fields are optional - only update what you want to change
                    </Text>
                  </View>
                </View>
              );
            }}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Drawer */}
      <EditSuccessDrawer
        visible={successDrawerVisible}
        onClose={handleCloseDrawer}
        onContinueToImages={handleContinueToImages}
        onDone={handleDone}
        carName={updatedProductData?.name}
      />

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
  )
}

export default React.memo(EditRentCar)