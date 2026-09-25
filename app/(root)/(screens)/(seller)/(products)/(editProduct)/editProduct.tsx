import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch, ActivityIndicator } from 'react-native'
import EditSuccessDrawer from '@/components/modals/EditSuccessDrawer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'
import { SparklesIcon } from 'react-native-heroicons/solid'
import { router, useLocalSearchParams } from 'expo-router'
import { generateCarDescription, generateCarDescriptionDetails } from '@/utils/aiDescriptionGenerator'
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
  engineSizeOptions,
  bodyTypeOptions,
  fuelTypeOptions,
  conditionOptions,
  transmissionOptions,
  availabilityOptions,
  featureOptions
} from '@/constants/data'
import CustomButton from '@/components/CustomButton'
import CustomAlert from '@/components/CustomAlert'
import { useCustomAlert } from '@/hooks/useCustomAlert'

interface SectionCardProps {
  number: number | string;
  badgeBg?: string;
  title: string;
  subtitle: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

const badgeColorMap: Record<string, string> = {
  '1': 'bg-blue-500',
  '2': 'bg-green-500',
  '3': 'bg-purple-500',
  '4': 'bg-orange-500',
  '5': 'bg-amber-500',
  '6': 'bg-red-500',
  '7': 'bg-indigo-500',
};

const SectionCard = ({ number, badgeBg, title, subtitle, rightAction, children }: SectionCardProps) => {
  const bgClass = badgeBg || badgeColorMap[String(number)] || 'bg-blue-500';
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1 mr-2">
          <View className={`w-8 h-8 ${bgClass} rounded-lg items-center justify-center mr-3`}>
            <Text className="text-white font-NunitoBold text-sm">{number}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-NunitoBold text-gray-900">{title}</Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">{subtitle}</Text>
          </View>
        </View>
        {rightAction}
      </View>
      <View className="gap-4">
        {children}
      </View>
    </View>
  );
};

// Dedicated edit page for updating existing car products
// This page only handles editing - no creation logic
const EditProduct = () => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successDrawerVisible, setSuccessDrawerVisible] = useState(false)
  const [updatedProductData, setUpdatedProductData] = useState<any>(null)
  const [biddingWindow, setBiddingWindow] = useState<any>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiVariationIndex, setAiVariationIndex] = useState(0)
  const featuresInitialized = useRef(false)
  const { visible, alertConfig, hideAlert, showSuccess, showError, showInfo } = useCustomAlert()

  const { productId, productData: productDataParam } = useLocalSearchParams<{
    productId?: string;
    productData?: string;
  }>();

  // Parse the product data passed from navigation safely
  const productData = React.useMemo(() => {
    if (!productDataParam) return null;
    try {
      return JSON.parse(productDataParam);
    } catch (e) {
      console.error("Failed to parse productData", e);
      return null;
    }
  }, [productDataParam]);

  // Derive current bidding window directly from productData or fetched state
  const currentBiddingWindow = React.useMemo(() => {
    return productData?.bidding_window || biddingWindow || null;
  }, [productData?.bidding_window, biddingWindow]);

  // Fetch categories to get car category ID
  const { data: categories } = useCategories();
  const carCategory = categories?.find(cat => cat.name.toLowerCase().includes('car'));
  const carCategoryId = carCategory?.id || 0;

  // Sync bidding window from productData if available
  useEffect(() => {
    if (productData?.bidding_window) {
      setBiddingWindow(productData.bidding_window);
    }
  }, [productData?.bidding_window]);

  // Fetch bidding window configuration if not already present in productData
  useEffect(() => {
    const fetchBidding = async () => {
      if (!productId || productData?.bidding_window) return;
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/products/products/${productId}/bidding/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
            'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
          }
        });
        if (response.ok) {
          const resJson = await response.json();
          const bw = resJson.data || resJson;
          if (bw && (bw.id || bw.duration_days)) {
            setBiddingWindow(bw);
          }
        }
      } catch (err) {
        console.log("No bidding window found or error fetching", err);
      }
    };
    fetchBidding();
  }, [productId, productData?.bidding_window]);

  // Fetch vehicle makes from API
  const { data: vehicleMakes, loading: vehicleMakesLoading, error: vehicleMakesError } = useVehicleMakes();

  // Convert vehicle makes to select options
  const makeOptions = vehicleMakes?.map(make => ({
    label: make.name,
    value: make.id.toString()
  })) || [];

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

  // Get models for selected make
  const getModelsForSelectedMake = (makeId: string) => {
    if (!makeId || !vehicleMakes) return [];
    const makeStr = makeId.toString().toLowerCase();
    const selectedMake = vehicleMakes.find(
      (make: any) =>
        make.id.toString() === makeStr ||
        make.name.toLowerCase() === makeStr
    );
    return selectedMake?.models || [];
  };

  // Generate description using AI helper
  const handleGenerateAIDescription = async (
    values: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setIsGeneratingAI(true);
    // Smooth transition
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const resolvedMake = vehicleMakes?.find(
        (m: any) => m.id.toString() === values.make?.toString() || m.name.toLowerCase() === values.make?.toString().toLowerCase()
      );
      const resolvedMakeName = resolvedMake?.name || (typeof productData?.make === 'object' ? productData?.make?.name : productData?.make) || '';

      const availableModels = resolvedMake?.models || [];
      const resolvedModel = availableModels.find(
        (m: any) => m.id.toString() === values.model?.toString() || m.name.toLowerCase() === values.model?.toString().toLowerCase()
      );
      const resolvedModelName = resolvedModel?.name || (typeof productData?.model === 'object' ? productData?.model?.name : productData?.model) || '';

      const result = generateCarDescriptionDetails({
        year: values.year,
        make: resolvedMakeName,
        model: resolvedModelName,
        name: values.name,
        condition: values.condition,
        transmission: values.transmission,
        fuel_type: values.fuel_type,
        body_type: values.body_type,
        mileage: values.mileage,
        mileage_unit: values.mileage_unit,
        exterior_color: values.exterior_color,
        interior_color: values.interior_color,
        features: selectedFeatures,
        price: values.price
      }, aiVariationIndex);

      setFieldValue('description', result.text);
      setAiVariationIndex(prev => prev + 1);
    } catch (err) {
      console.error('Error generating AI description:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };


  const validationSchema = Yup.object().shape({
    name: Yup.string(),
    make: Yup.string(),
    model: Yup.string(),
    year: Yup.string(),
    condition: Yup.string(),
    body_type: Yup.string(),
    mileage: Yup.string(),
    mileage_unit: Yup.string(),
    transmission: Yup.string(),
    fuel_type: Yup.string(),
    engine_size: Yup.string(),
    exterior_color: Yup.string(),
    interior_color: Yup.string(),
    number_of_doors: Yup.string(),
    number_of_seats: Yup.string(),
    description: Yup.string(),
    price: Yup.string(),
    currency: Yup.string(),
    stock: Yup.string(),
    availability: Yup.string(),
    delivery_option: Yup.string(),
    vin: Yup.string(),
    enable_bidding: Yup.boolean(),
    duration_days: Yup.number().when('enable_bidding', {
      is: true,
      then: schema => schema.required('Duration is required when bidding is enabled').min(1, 'Minimum duration is 1 day'),
      otherwise: schema => schema.notRequired()
    })
  })

  // Initialize selected features based on product data
  useEffect(() => {
    if (productData && productData.id && !featuresInitialized.current) {
      const features: string[] = [];

      if (productData.air_conditioning) features.push('Air Conditioning');
      if (productData.leather_seats) features.push('Leather Seats');
      if (productData.navigation_system) features.push('Navigation System');
      if (productData.bluetooth) features.push('Bluetooth');
      if (productData.parking_sensors) features.push('Parking Sensors');
      if (productData.cruise_control) features.push('Cruise Control');
      if (productData.keyless_entry) features.push('Keyless Entry');
      if (productData.sunroof) features.push('Sunroof');
      if (productData.alloy_wheels) features.push('Alloy Wheels');
      if (productData.airbags) features.push('Airbags');
      if (productData.abs) features.push('ABS');
      if (productData.traction_control) features.push('Traction Control');
      if (productData.lane_assist) features.push('Lane Assist');
      if (productData.blind_spot_monitor) features.push('Blind Spot Monitor');

      setSelectedFeatures(features);
      featuresInitialized.current = true;
    }
  }, [productData?.id]); // Only depend on the product ID, not the entire productData object

  const handleContinueToImages = () => {
    router.push({
      pathname: sellerRoutes.editImage as any,
      params: {
        productId: productId,
        productData: JSON.stringify(updatedProductData),
      }
    });
  };

  const handleDone = () => {
    router.back();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(sellerRoutes?.products as any);
    }
  };

  const handleCloseDrawer = () => {
    setSuccessDrawerVisible(false);
    setUpdatedProductData(null);
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }

  const handleSubmit = async (values: any, { setErrors }: any) => {

    if (!productId || !productData) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Create feature object from selected features
      const features = {
        air_conditioning: selectedFeatures.includes('Air Conditioning'),
        leather_seats: selectedFeatures.includes('Leather Seats'),
        navigation_system: selectedFeatures.includes('Navigation System'),
        bluetooth: selectedFeatures.includes('Bluetooth'),
        parking_sensors: selectedFeatures.includes('Parking Sensors'),
        cruise_control: selectedFeatures.includes('Cruise Control'),
        keyless_entry: selectedFeatures.includes('Keyless Entry'),
        sunroof: selectedFeatures.includes('Sunroof'),
        alloy_wheels: selectedFeatures.includes('Alloy Wheels'),
        airbags: selectedFeatures.includes('Airbags'),
        abs: selectedFeatures.includes('ABS'),
        traction_control: selectedFeatures.includes('Traction Control'),
        lane_assist: selectedFeatures.includes('Lane Assist'),
        blind_spot_monitor: selectedFeatures.includes('Blind Spot Monitor'),
      }

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
        const makeModels = getModelsForSelectedMake(makeVal || '');
        const found = makeModels.find((m: any) => m.name.toLowerCase() === modelVal.toLowerCase());
        return found ? found.id : null;
      };

      const payload = {
        data: {
          category_id: carCategoryId,
          name: values.name,
          make: resolveMakeInt(values.make),
          model: resolveModelInt(values.make, values.model),
          year: parseInt(values.year),
          condition: values.condition,
          body_type: values.body_type,
          mileage: parseInt(values.mileage),
          mileage_unit: values.mileage_unit,
          transmission: values.transmission,
          fuel_type: values.fuel_type,
          engine_size: values.engine_size,
          exterior_color: values.exterior_color,
          interior_color: values.interior_color,
          number_of_doors: parseInt(values.number_of_doors),
          number_of_seats: parseInt(values.number_of_seats),
          air_conditioning: features.air_conditioning,
          leather_seats: features.leather_seats,
          navigation_system: features.navigation_system,
          bluetooth: features.bluetooth,
          parking_sensors: features.parking_sensors,
          cruise_control: features.cruise_control,
          keyless_entry: features.keyless_entry,
          sunroof: features.sunroof,
          alloy_wheels: features.alloy_wheels,
          description: values.description,
          price: values.price,
          currency: values.currency,
          negotiable: values.negotiable || false,
          discount: "0",
          availability: values.availability,
          stock: parseInt(values.stock),
          is_rental: values.is_rental || false,
          airbags: features.airbags,
          abs: features.abs,
          traction_control: features.traction_control,
          lane_assist: features.lane_assist,
          blind_spot_monitor: features.blind_spot_monitor,
          delivery_option: values.delivery_option,
          vin: values.vin,
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

      // Process bidding window state updates
      try {
        const activeBw = currentBiddingWindow || biddingWindow || productData?.bidding_window;
        if (values.enable_bidding && productId) {
          if (activeBw) {
            // PATCH an existing bidding window to update duration or reopen
            const patchRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/products/products/${productId}/bidding/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
                'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
              },
              body: JSON.stringify({
                duration_days: parseInt(values.duration_days.toString(), 10),
                is_closed: false,
              }),
            });
            if (!patchRes.ok) throw new Error('Failed to patch bidding window');
          } else {
            // POST a brand new bidding window
            const postRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/products/products/${productId}/bidding/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
                'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
              },
              body: JSON.stringify({
                product: productId,
                start_time: new Date().toISOString(),
                duration_days: parseInt(values.duration_days.toString(), 10),
                is_closed: false,
              }),
            });
            if (!postRes.ok) throw new Error('Failed to post bidding window');
          }
        } else if (!values.enable_bidding && activeBw && !activeBw.is_closed) {
          // PATCH to close bidding window since user turned it off
          const patchCloseRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/products/products/${productId}/bidding/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
              'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
            },
            body: JSON.stringify({
              is_closed: true,
            }),
          });
          if (!patchCloseRes.ok) throw new Error('Failed to close bidding window');
        }
      } catch (err) {
        console.error('Bidding operation failed:', err);
        showInfo('Notice', 'Car updated, but failed to sync bidding configurations.');
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

      showError('Error', error.message || 'Failed to update car details. Please try again.')
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show error state if no product data
  if (!productData || !productId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-lg font-NunitoMedium text-gray-600 text-center mb-4">
            Car data not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-primary-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-NunitoSemiBold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initialValues = {
    name: productData.name || '',
    make: initialMakeId,
    model: initialModelId,
    year: productData.year?.toString() || '',
    condition: productData.condition || 'new',
    body_type: productData.body_type || '',
    mileage: productData.mileage ? Math.round(parseFloat(productData.mileage.toString())).toString() : '',
    mileage_unit: productData.mileage_unit || 'km',
    transmission: productData.transmission || 'automatic',
    fuel_type: productData.fuel_type || '',
    engine_size: productData.engine_size || '',
    exterior_color: productData.exterior_color || '',
    interior_color: productData.interior_color || '',
    number_of_doors: productData.number_of_doors?.toString() || '',
    number_of_seats: productData.number_of_seats?.toString() || '',
    description: productData.description || '',
    price: productData.price ? Math.round(parseFloat(productData.price.toString())).toString() : '',
    currency: productData.currency || 'NGN',
    stock: productData.stock?.toString() || '',
    availability: productData.availability || 'in_stock',
    delivery_option: productData.delivery_option || 'pickup',
    negotiable: productData.negotiable || false,
    is_rental: productData.is_rental || false,
    vin: productData.vin || '',
    enable_bidding: Boolean(currentBiddingWindow),
    duration_days: currentBiddingWindow?.duration_days ? currentBiddingWindow.duration_days.toString() : '',
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 mb-4">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
          >
            <ArrowLeftIcon size={20} color="#374151" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-NunitoBold text-gray-900">
              Edit Car Details
            </Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">
              Update your Car Details
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

              return (
                <View className="space-y-6">
                  {/* Basic Information */}
                  <SectionCard number={1} title="Basic Information" subtitle="Update only the fields you want to change">
                    
                    {/* Name of car */}
                    <FormikInput
                      name="name"
                      label="Name of Car"
                      placeholder="e.g., Toyota Camry LE"
                      type="text"
                    />

                    {/* Make */}
                    <SelectField
                      name="make"
                      label="Make"
                      placeholder={vehicleMakesLoading ? "Loading makes..." : "Select make"}
                      options={makeOptions}
                      value={values.make}
                      onValueChange={(value) => {
                        setFieldValue('make', value);
                        // Clear model when make changes
                        setFieldValue('model', '');
                      }}
                      error={errors.make as string}
                      touched={touched.make as boolean}
                    />

                    {/* Model */}
                    <SelectField
                      name="model"
                      label="Model"
                      placeholder={values.make ? "Select model" : "Select make first"}
                      options={getModelsForSelectedMake(values.make).map(model => ({
                        label: model.name,
                        value: model.id.toString()
                      }))}
                      value={values.model}
                      onValueChange={(value) => setFieldValue('model', value)}
                      error={errors.model as string}
                      touched={touched.model as boolean}
                    />

                    {/* Year */}
                    <FormikInput
                      name="year"
                      label="Year"
                      placeholder="e.g., 2023"
                      keyboardType="numeric"
                      type="text"
                    />

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
                  </SectionCard>

                  {/* Vehicle Details */}
                  <SectionCard number={2} title="Vehicle Details" subtitle="All fields optional - update what you need">

                    {/* Body type */}
                    <SelectField
                      name="body_type"
                      label="Body Type"
                      placeholder="Select body type"
                      options={bodyTypeOptions}
                      value={values.body_type}
                      onValueChange={(value) => setFieldValue('body_type', value)}
                      error={errors.body_type as string}
                      touched={touched.body_type as boolean}
                    />

                    {/* Mileage */}
                    <View className="mb-4">
                      <Text className="text-base font-NunitoSemiBold text-gray-700 mb-3">
                        Mileage
                      </Text>
                      <View className="flex-row gap-3 items-center">
                        <View className="flex-1">
                          <FormikInput
                            name="mileage"
                            label=""
                            placeholder="e.g., 50,000"
                            keyboardType="numeric"
                            type="text"
                          />
                        </View>
                        <View className="w-32">
                          <Text className="text-sm font-NunitoMedium text-gray-600 mb-2">
                            Unit
                          </Text>
                          <View className="flex-row bg-gray-100 rounded-lg p-1">
                            <TouchableOpacity
                              onPress={() => setFieldValue('mileage_unit', 'km')}
                              className={`flex-1 py-2 px-3 rounded-md ${values.mileage_unit === 'km'
                                ? 'bg-white'
                                : 'bg-transparent'
                                }`}
                            >
                              <Text className={`text-xs font-NunitoSemiBold text-center ${values.mileage_unit === 'km'
                                ? 'text-gray-900'
                                : 'text-gray-500'
                                }`}>
                                km
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setFieldValue('mileage_unit', 'miles')}
                              className={`flex-1 py-2 px-3 rounded-md ${values.mileage_unit === 'miles'
                                ? 'bg-white'
                                : 'bg-transparent'
                                }`}
                            >
                              <Text className={`text-xs font-NunitoSemiBold text-center ${values.mileage_unit === 'miles'
                                ? 'text-gray-900'
                                : 'text-gray-500'
                                }`}>
                                miles
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Transmission */}
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

                    {/* Engine size */}
                    <SelectField
                      name="engine_size"
                      label="Engine Size"
                      placeholder="Select engine size"
                      options={engineSizeOptions}
                      value={values.engine_size}
                      onValueChange={(value) => setFieldValue('engine_size', value)}
                      error={errors.engine_size as string}
                      touched={touched.engine_size as boolean}
                    />
                  </SectionCard>

                  {/* Appearance */}
                  <SectionCard number={3} title="Appearance" subtitle="Colors and styling (all optional)">

                    {/* Exterior color */}
                    <FormikInput
                      name="exterior_color"
                      label="Exterior Color"
                      placeholder="e.g., Black, White, Silver, Red"
                      type="text"
                    />

                    {/* Interior color */}
                    <FormikInput
                      name="interior_color"
                      label="Interior Color"
                      placeholder="e.g., Black, Beige, Brown, Gray"
                      type="text"
                    />

                    {/* Number of doors and seats */}
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <FormikInput
                          name="number_of_doors"
                          label="Number of Doors"
                          placeholder="e.g., 2, 4, 5"
                          keyboardType="numeric"
                          type="text"
                        />
                      </View>
                      <View className="flex-1">
                        <FormikInput
                          name="number_of_seats"
                          label="Number of Seats"
                          placeholder="e.g., 4, 5, 7"
                          keyboardType="numeric"
                          type="text"
                        />
                      </View>
                    </View>
                  </SectionCard>

                  {/* Features */}
                  <SectionCard number={4} title="Features" subtitle="Select/deselect features (optional)">

                    <FeatureBadges
                      features={featureOptions}
                      selectedFeatures={selectedFeatures}
                      onFeatureToggle={handleFeatureToggle}
                      label="Car Features"
                    />
                  </SectionCard>

                  {/* Description */}
                  <SectionCard 
                    number={5} 
                    title="Description" 
                    subtitle="Update description (optional)"
                    rightAction={
                      <TouchableOpacity
                        onPress={() => handleGenerateAIDescription(values, setFieldValue)}
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
                    }
                  >
                    <FormikTextArea
                      name="description"
                      label="Description"
                      placeholder="e.g., Well maintained car with regular service history. Perfect for daily commuting with excellent fuel economy."
                      numberOfLines={5}
                      maxLength={500}
                      helperText="Describe your car's condition, features, and what makes it special"
                    />
                  </SectionCard>

                  {/* Pricing & Availability */}
                  <SectionCard number={6} title="Pricing & Availability" subtitle="Update price and availability (all optional)">

                    {/* Price */}
                    <FormikInput
                      name="price"
                      label="Price (₦)"
                      placeholder="e.g., 2,500,000"
                      keyboardType="numeric"
                      type="text"
                    />

                    {/* Stock */}
                    <FormikInput
                      name="stock"
                      label="Stock Quantity"
                      placeholder="e.g., 1, 2, 5"
                      keyboardType="numeric"
                      type="text"
                    />

                    {/* Availability */}
                    <SelectField
                      name="availability"
                      label="Availability"
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
                      label="Delivery Option"
                      placeholder="Select delivery option"
                      options={deliveryOptions}
                      value={values.delivery_option}
                      onValueChange={(value) => setFieldValue('delivery_option', value)}
                      error={errors.delivery_option as string}
                      touched={touched.delivery_option as boolean}
                    />
                  </SectionCard>

                  {/* Bidding */}
                  <SectionCard number={7} title="Bidding" subtitle="Let buyers compete">
                    {/* Existing Auction Info Summary */}
                    {currentBiddingWindow && (
                      <View className="mb-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-xs font-NunitoBold text-gray-500 uppercase tracking-wider">
                            Current Auction Status
                          </Text>
                          <View className={`px-2.5 py-0.5 rounded-full ${
                            currentBiddingWindow.is_active && !currentBiddingWindow.is_closed 
                              ? 'bg-green-100 border border-green-200' 
                              : 'bg-gray-200 border border-gray-300'
                          }`}>
                            <Text className={`text-[10px] font-NunitoBold ${
                              currentBiddingWindow.is_active && !currentBiddingWindow.is_closed 
                                ? 'text-green-800' 
                                : 'text-gray-600'
                            }`}>
                              {currentBiddingWindow.is_active && !currentBiddingWindow.is_closed 
                                ? 'LIVE AUCTION' 
                                : 'AUCTION CLOSED'}
                            </Text>
                          </View>
                        </View>

                        {currentBiddingWindow.start_time && (
                          <View className="flex-row justify-between items-center py-1 border-b border-gray-100">
                            <Text className="text-xs text-gray-500 font-NunitoMedium">Auction Start</Text>
                            <Text className="text-xs font-NunitoBold text-gray-800">
                              {new Date(currentBiddingWindow.start_time).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                        )}

                        {currentBiddingWindow.end_time && (
                          <View className="flex-row justify-between items-center py-1 border-b border-gray-100">
                            <Text className="text-xs text-gray-500 font-NunitoMedium">Auction End</Text>
                            <Text className="text-xs font-NunitoBold text-gray-800">
                              {new Date(currentBiddingWindow.end_time).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                        )}

                        {currentBiddingWindow.duration_days && (
                          <View className="flex-row justify-between items-center py-1">
                            <Text className="text-xs text-gray-500 font-NunitoMedium">Configured Duration</Text>
                            <Text className="text-xs font-NunitoBold text-gray-800">
                              {currentBiddingWindow.duration_days} Days
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                      <View className="flex-1">
                        <Text className="text-sm font-NunitoSemiBold text-gray-900">Enable Bidding</Text>
                        <Text className="text-xs font-NunitoMedium text-gray-500 mt-1">
                          {currentBiddingWindow ? "Keep bidding open or activate new window" : "Allow customers to place bids on this car"}
                        </Text>
                      </View>
                      <Switch
                        value={values.enable_bidding as boolean}
                        onValueChange={v => void setFieldValue('enable_bidding', v)}
                        trackColor={{ false: '#E5E7EB', true: '#D30309' }}
                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : values.enable_bidding ? '#FFFFFF' : '#F3F4F6'}
                      />
                    </View>
                    {values.enable_bidding && (
                      <View className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                        <FormikInput
                          name="duration_days"
                          label="Bidding Duration (Days)"
                          placeholder="e.g. 7"
                          keyboardType="numeric"
                          type="text"
                        />
                        <Text className="text-[11px] font-NunitoMedium text-gray-500 mt-1">
                          Updating duration will reactivate and adjust the auction timeline.
                        </Text>
                      </View>
                    )}
                  </SectionCard>

                  {/* Action Buttons */}
                  <View className="bg-white rounded-[16px] p-5 mb-2 border border-gray-100 shadow-sm">
                    <FormikButton
                      title="Update Car Details"
                      type="submit"
                      onPress={() => {
                        formikHandleSubmit();
                      }}
                      disabled={isSubmitting || formikIsSubmitting}
                      loading={isSubmitting || formikIsSubmitting}
                      loadingText="Updating"
                      className="mb-3"
                    />

                    <CustomButton title='Edit Images' bgVariant='outline' textVariant='outline' onPress={() => {
                      router.push({
                        pathname: sellerRoutes.editImage as any,
                        params: {
                          productId: productId,
                          productData: JSON.stringify(productData),
                        }
                      });
                    }} />

                    <Text className="text-xs text-gray-500 text-center font-NunitoMedium mt-2">
                      All fields are optional - only update what you want to change
                    </Text>
                    <Text className="text-xs text-gray-500 text-center font-NunitoMedium">
                      Or manage images separately
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

export default EditProduct
