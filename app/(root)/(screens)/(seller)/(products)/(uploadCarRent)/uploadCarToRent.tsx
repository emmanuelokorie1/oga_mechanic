import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch, ActivityIndicator, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'
import { SparklesIcon } from 'react-native-heroicons/solid'
import { router, useLocalSearchParams } from 'expo-router'
import { generateRentalCarDescription } from '@/utils/aiDescriptionGenerator'
import { Formik, useFormikContext } from 'formik'
import * as Yup from 'yup'
import FormikInput from '@/components/forms/FormikInput'
import FormikTextArea from '@/components/forms/FormikTextArea'
import SelectField from '@/components/forms/SelectField'
import FeatureBadges from '@/components/forms/FeatureBadges'
import VINInput from '@/components/VINInput'
import { decodeVINWithImage } from '@/utils/vinDecoder'
import { sellerRoutes } from '@/constants/routes'
import { useCategories } from '@/hooks/useProducts'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import CustomAlert from '@/components/CustomAlert'
import { useCustomAlert } from '@/hooks/useCustomAlert'
import {
  deliveryOptions,
  bodyTypeOptions,
  conditionOptions,
  fuelTypeOptions,
  transmissionOptions,
  availabilityOptions,
  featureOptions
} from '@/constants/data'

const PRIMARY = '#D30309'

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 17, fontFamily: 'NunitoBold', color: '#111827' },
  headerSub: { fontSize: 11, fontFamily: 'NunitoMedium', color: '#9CA3AF', marginTop: 1 },
  stepperWrap: {
    backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  stepNum: { fontSize: 13, fontFamily: 'NunitoBold', color: '#9CA3AF' },
  stepCheckmark: { fontSize: 13, color: '#fff', fontFamily: 'NunitoBold' },
  stepLabel: { fontSize: 11, fontFamily: 'NunitoMedium', color: '#9CA3AF' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 18 },
})

const STEPS = [
  { id: 1, label: 'Vehicle', sublabel: 'Make, model & specs', color: PRIMARY },
  { id: 2, label: 'Details', sublabel: 'Looks & features', color: PRIMARY },
  { id: 3, label: 'Pricing', sublabel: 'Price & delivery', color: PRIMARY },
]

const Stepper = ({ currentStep }: { currentStep: number }) => (
  <View style={styles.stepper}>
    {STEPS.map((step, idx) => {
      const isActive = currentStep === step.id
      const isDone = currentStep > step.id
      return (
        <React.Fragment key={step.id}>
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              isActive && { backgroundColor: step.color, borderColor: step.color },
              isDone && { backgroundColor: step.color, borderColor: step.color },
            ]}>
              {isDone
                ? <Text style={styles.stepCheckmark}>✓</Text>
                : <Text style={[styles.stepNum, (isActive || isDone) && { color: '#fff' }]}>{step.id}</Text>
              }
            </View>
            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <Text style={[styles.stepLabel, isActive && { color: '#111827', fontFamily: 'NunitoBold' }]}>
                {step.label}
              </Text>
            </View>
          </View>
          {idx < STEPS.length - 1 && (
            <View style={[styles.stepLine, isDone && { backgroundColor: STEPS[idx].color }]} />
          )}
        </React.Fragment>
      )
    })}
  </View>
)

const FormObserver = ({ vehicleMakes }: { vehicleMakes: any }) => {
  const { values, setFieldValue } = useFormikContext<any>();

  useEffect(() => {
    const isUtility = values.body_type === 'van' || values.body_type === 'truck';
    if (!isUtility && values.make && values.model && values.year) {
      const selectedMake = vehicleMakes?.find((m: any) => m.id.toString() === values.make);
      const selectedModel = selectedMake?.models?.find((m: any) => m.id.toString() === values.model);
      
      if (selectedMake && selectedModel) {
        const autoName = `${values.year} ${selectedMake.name} ${selectedModel.name}`;
        if (values.name !== autoName) {
          setFieldValue('name', autoName);
        }
      }
    }
  }, [values.make, values.model, values.year, vehicleMakes, setFieldValue, values.name, values.body_type]);

  return null;
};

const UploadCarToRent = () => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiVariationIndex, setAiVariationIndex] = useState(0);
  const { visible, alertConfig, hideAlert, showSuccess, showError } = useCustomAlert()
  const featuresInitialized = useRef(false);

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
      const resolvedMakeName = resolvedMake?.name || values.make || '';

      const availableModels = resolvedMake?.models || [];
      const resolvedModel = availableModels.find(
        (m: any) => m.id.toString() === values.model?.toString() || m.name.toLowerCase() === values.model?.toString().toLowerCase()
      );
      const resolvedModelName = resolvedModel?.name || values.model || '';

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

  const { editMode, productId, productData, isEditing } = useLocalSearchParams<{
    editMode?: string;
    productId?: string;
    productData?: string;
    isEditing?: string;
  }>();

  const isEditMode = editMode === 'true';
  const isEditingMode = isEditing === 'true';
  const parsedProductData = productData ? JSON.parse(productData) : null;

  const { data: categories } = useCategories();
  const carCategory = categories?.find(cat => cat.name.toLowerCase().includes('car'));
  const carCategoryId = carCategory?.id || 0;

  const { data: vehicleMakes, loading: vehicleMakesLoading } = useVehicleMakes();

  const makeOptions = vehicleMakes?.map(make => ({
    label: make.name,
    value: make.id.toString()
  })) || [];

  const getModelsForSelectedMake = (makeId: string) => {
    if (!makeId || !vehicleMakes) return [];
    const selectedMake = vehicleMakes.find(make => make.id.toString() === makeId);
    return selectedMake?.models || [];
  };

  const handleVINLookup = useCallback(async (vin: string, setFieldValue: any) => {
    try {
      const info = await decodeVINWithImage(vin);
      if (!info) return;

      const matchedMake = vehicleMakes?.find(m =>
        m.name.toLowerCase() === info.make.toLowerCase()
      );

      if (matchedMake) {
        setFieldValue('make', matchedMake.id.toString());
        const nhtsaModel = info.model.toLowerCase();
        const makeName = info.make.toLowerCase();
        const cleanModelName = nhtsaModel.startsWith(makeName)
          ? nhtsaModel.replace(makeName, '').trim()
          : nhtsaModel;

        const matchedModel = matchedMake.models.find(m =>
          m.name.toLowerCase() === cleanModelName || m.name.toLowerCase() === nhtsaModel
        );

        if (matchedModel) {
          setFieldValue('model', matchedModel.id.toString());
        }
      }

      if (info.modelYear) {
        setFieldValue('year', info.modelYear);
      }

      showSuccess("Success", `Vehicle details found: ${info.make} ${info.model} (${info.modelYear})`);
    } catch (error) {
      console.error("VIN Lookup error:", error);
    }
  }, [vehicleMakes]);

  useEffect(() => {
    if (isEditMode && parsedProductData && !featuresInitialized.current) {
      const features: string[] = [];
      const featureKeys = [
        'air_conditioning', 'leather_seats', 'navigation_system', 'bluetooth',
        'parking_sensors', 'cruise_control', 'keyless_entry', 'sunroof',
        'alloy_wheels', 'airbags', 'abs', 'traction_control', 'lane_assist', 'blind_spot_monitor'
      ];
      
      featureKeys.forEach(key => {
        if (parsedProductData[key]) {
          const label = featureOptions.find(opt => opt.toLowerCase().replace(/ /g, '_') === key);
          if (label) features.push(label);
        }
      });

      setSelectedFeatures(features);
      featuresInitialized.current = true;
    }
  }, [isEditMode, parsedProductData]);

  const validationSchema = Yup.object().shape({
    body_type: Yup.string().required('Vehicle type is required'),
    name: Yup.string().required('Name is required'),
    make: Yup.number().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Make is required'),
      otherwise: (schema) => schema.optional()
    }),
    model: Yup.number().when('body_type', {
      is: (val: string) => val !== 'van' && val !== 'truck',
      then: (schema) => schema.required('Model is required'),
      otherwise: (schema) => schema.optional()
    }),
    condition: Yup.string().required('Condition is required'),
    fuel_type: Yup.string().required('Fuel type is required'),
    price: Yup.string().required('Price is required'),
    stock: Yup.number().required('Stock is required').min(1),
    availability: Yup.string().required('Availability is required'),
    delivery_option: Yup.string().required('Delivery option is required'),
  })

  const initialValues = {
    name: isEditMode && parsedProductData ? parsedProductData.name || '' : '',
    make: isEditMode && parsedProductData ? parsedProductData.make?.toString() || '' : '',
    model: isEditMode && parsedProductData ? parsedProductData.model?.toString() || '' : '',
    year: isEditMode && parsedProductData ? parsedProductData.year?.toString() || '' : '',
    condition: isEditMode && parsedProductData ? parsedProductData.condition || '' : '',
    body_type: isEditMode && parsedProductData ? parsedProductData.body_type || '' : '',
    transmission: isEditMode && parsedProductData ? parsedProductData.transmission || '' : '',
    fuel_type: isEditMode && parsedProductData ? parsedProductData.fuel_type || 'petrol' : 'petrol',
    exterior_color: isEditMode && parsedProductData ? parsedProductData.exterior_color || '' : '',
    number_of_seats: isEditMode && parsedProductData ? parsedProductData.number_of_seats?.toString() || '' : '',
    description: isEditMode && parsedProductData ? parsedProductData.description || '' : '',
    price: isEditMode && parsedProductData ? parsedProductData.price || '' : '',
    stock: isEditMode && parsedProductData ? parsedProductData.stock?.toString() || '' : '1',
    availability: isEditMode && parsedProductData ? parsedProductData.availability || 'in_stock' : 'in_stock',
    delivery_option: isEditMode && parsedProductData ? parsedProductData.delivery_option || 'pickup' : 'pickup',
    negotiable: isEditMode && parsedProductData ? parsedProductData.negotiable || false : false,
    duration_days: '',
    vin: isEditMode && parsedProductData ? parsedProductData.vin || '' : '',
  }

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }

  const handleSubmit = async (values: any, { setErrors }: any) => {
    try {
      setIsSubmitting(true);
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

      const payload = {
        data: {
          category_id: carCategoryId,
          name: values.name,
          make: (values.body_type === 'van' || values.body_type === 'truck') ? null : parseInt(values.make),
          model: (values.body_type === 'van' || values.body_type === 'truck') ? null : parseInt(values.model),
          year: (values.body_type === 'van' || values.body_type === 'truck') ? null : parseInt(values.year),
          condition: values.condition,
          body_type: values.body_type,
          transmission: values.transmission,
          fuel_type: values.fuel_type,
          exterior_color: values.exterior_color,
          number_of_seats: parseInt(values.number_of_seats),
          ...features,
          description: values.description,
          price: values.price,
          currency: 'NGN',
          negotiable: values.negotiable || false,
          availability: values.availability,
          stock: parseInt(values.stock),
          is_rental: true,
          delivery_option: values.delivery_option,
          vin: values.vin,
        },
        requestType: "inbound"
      }

      const finalProductId = productId || parsedProductData?.id;
      const endpoint = isEditingMode
        ? `${process.env.EXPO_PUBLIC_API_URL}/products/products/${finalProductId}/`
        : `${process.env.EXPO_PUBLIC_API_URL}/products/products/`;
      const method = isEditingMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
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

      const updatedProductId = responseData.data?.id || finalProductId || '';

      showSuccess('Success', `Car details ${isEditingMode ? 'updated' : 'uploaded'} successfully!`, {
        buttonText: 'Continue to Images',
        onButtonPress: () => {
          hideAlert();
          router.push({
            pathname: sellerRoutes.uploadCarImages as any,
            params: { formData: JSON.stringify(payload), productId: updatedProductId, productType: 'rental-car' }
          });
        }
      });
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('vin')) {
        setErrors({ vin: error.message });
      }
      showError('Submission Error', error.message || 'Failed to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = async (validateForm: any, setFieldTouched: any, values: any) => {
    const errors = await validateForm();
    const errorKeys = Object.keys(errors);
    
    let canProceed = true;
    if (currentStep === 1) {
      const step1Fields = ['body_type', 'condition'];
      const isUtility = values.body_type === 'van' || values.body_type === 'truck';
      if (isUtility) {
        step1Fields.push('name');
      } else {
        step1Fields.push('make', 'model', 'year');
      }
      
      const hasErrors = step1Fields.some(field => errorKeys.includes(field));
      if (hasErrors) {
        step1Fields.forEach(field => setFieldTouched(field, true));
        canProceed = false;
      }
    } else if (currentStep === 2) {
      const step2Fields = ['transmission', 'fuel_type', 'exterior_color', 'number_of_seats'];
      const hasErrors = step2Fields.some(field => errorKeys.includes(field));
      if (hasErrors) {
        step2Fields.forEach(field => setFieldTouched(field, true));
        canProceed = false;
      }
    }

    if (canProceed) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeftIcon size={18} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit' : 'Upload'} Rental</Text>
          <Text style={styles.headerSub}>Step {currentStep} of {STEPS.length}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Stepper */}
      <View style={styles.stepperWrap}>
        <Stepper currentStep={currentStep} />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Formik 
            initialValues={initialValues} 
            validationSchema={validationSchema} 
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ values, errors, touched, handleSubmit: formikHandleSubmit, isSubmitting, setFieldValue, validateForm, setFieldTouched }) => (
              <View className="space-y-6 pt-4 pb-10">
                <FormObserver vehicleMakes={vehicleMakes} />

                {currentStep === 1 && (
                  <View className="bg-white rounded-2xl p-5 border border-gray-200">
                    <Text className="text-lg font-NunitoBold text-gray-900 mb-4">Basic Information</Text>

                    <VINInput
                      name="vin"
                      label="VIN"
                      placeholder="Vehicle Identification Number"
                      onVINLookup={handleVINLookup}
                    />
                    
                    <View className='mt-4'>
                      <SelectField
                        name="body_type" label="Vehicle Type" placeholder="Select"
                        options={bodyTypeOptions} value={values.body_type}
                        onValueChange={(v) => {
                          setFieldValue('body_type', v);
                          if (v === 'van') setFieldValue('name', 'Towing Van');
                          if (v === 'truck') setFieldValue('name', 'Truck / Utility');
                        }}
                        error={errors.body_type as string} touched={touched.body_type as boolean}
                      />
                    </View>

                    { (values.body_type === 'van' || values.body_type === 'truck') ? (
                      <FormikInput name="name" label="Custom Name" placeholder={values.body_type === 'van' ? "e.g., Heavy Duty Towing" : "e.g. 10 Tonne Truck"} type="text" />
                    ) : (
                      <>
                        <SelectField
                          name="make" label="Make" placeholder={vehicleMakesLoading ? "Loading..." : "Select"}
                          options={makeOptions} value={values.make}
                          onValueChange={(v) => { setFieldValue('make', v); setFieldValue('model', ''); }}
                          error={errors.make as string} touched={touched.make as boolean}
                        />
                        <SelectField
                          name="model" label="Model" placeholder="Select"
                          options={getModelsForSelectedMake(values.make).map(m => ({ label: m.name, value: m.id.toString() }))}
                          value={values.model} onValueChange={(v) => setFieldValue('model', v)}
                          error={errors.model as string} touched={touched.model as boolean}
                        />
                        <FormikInput name="year" label="Year" placeholder="2023" keyboardType="numeric" type="text" />
                      </>
                    )}

                    <SelectField
                      name="condition" label="Condition" placeholder="Select"
                      options={conditionOptions} value={values.condition}
                      onValueChange={(v) => setFieldValue('condition', v)}
                      error={errors.condition as string} touched={touched.condition as boolean}
                    />
                  </View>
                )}

                {currentStep === 2 && (
                  <View className="bg-white rounded-2xl p-5 border border-gray-200">
                    <Text className="text-lg font-NunitoBold text-gray-900 mb-4">Specifications</Text>
                    
                    { (values.body_type !== 'van' && values.body_type !== 'truck') && (
                      <>
                        <SelectField
                          name="transmission" label="Transmission" options={transmissionOptions}
                          value={values.transmission} onValueChange={(v) => { setFieldValue('transmission', v); }}
                        />
                      </>
                    )}

                    <SelectField
                      name="fuel_type" label="Fuel Type" options={fuelTypeOptions}
                      value={values.fuel_type} onValueChange={(v) => { setFieldValue('fuel_type', v); }}
                    />

                    { (values.body_type !== 'van' && values.body_type !== 'truck') && (
                      <>
                        <FormikInput name="exterior_color" label="Color" placeholder="e.g. Black" type="text" />
                        <FormikInput name="number_of_seats" label="Seats" keyboardType="numeric" type="text" />
                      </>
                    )}
                    
                    <View className="mb-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-NunitoBold text-gray-700">
                          Description (Optional)
                        </Text>
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
                        placeholder={(values.body_type === 'van' || values.body_type === 'truck') ? "Describe your service, capacity, rental terms, etc." : "e.g. Clean executive ride with cold A/C, perfect for city runs and corporate trips..."} 
                        numberOfLines={5} 
                        maxLength={500}
                        helperText="Highlight rental terms, comfort, and service highlights"
                      />
                    </View>
                  </View>
                )}

                {currentStep === 3 && (
                  <View className="space-y-6">
                    <View className="bg-white rounded-2xl p-5 border border-gray-200">
                      <Text className="text-lg font-NunitoBold text-gray-900 mb-4">Pricing & Terms</Text>
                      
                      <View className="flex-row gap-3">
                        <View className="flex-1"><FormikInput name="price" label="Daily Price (₦)" placeholder="e.g., 25,000" keyboardType="numeric" type="text" /></View>
                      </View>

                      <View className="flex-row gap-4 mt-2">
                        <View className="flex-1"><FormikInput name="stock" label="Stock" keyboardType="numeric" type="text" /></View>
                        <View className="flex-1">
                          <SelectField name="availability" label="Status" options={availabilityOptions} value={values.availability} onValueChange={v => setFieldValue('availability', v)} />
                        </View>
                      </View>

                      <SelectField name="delivery_option" label="Delivery" options={deliveryOptions} value={values.delivery_option} onValueChange={v => setFieldValue('delivery_option', v)} />
                      
                      <View className="flex-row items-center justify-between py-4 border-t border-gray-100 mt-2">
                        <View><Text className="font-NunitoBold text-gray-900">Negotiable</Text></View>
                        <Switch value={values.negotiable} onValueChange={(v) => { setFieldValue('negotiable', v); }} trackColor={{ true: '#FFBFC2' }} thumbColor={values.negotiable ? '#D30309' : '#f4f3f4'} />
                      </View>
                    </View>

                    <View className="bg-white rounded-2xl p-5 border border-gray-200">
                      <FeatureBadges features={featureOptions} selectedFeatures={selectedFeatures} onFeatureToggle={handleFeatureToggle} label="Features" />
                    </View>
                  </View>
                )}

                {/* Navigation */}
                <View className="flex-row gap-4 pt-4">
                  {currentStep > 1 && (
                    <TouchableOpacity onPress={prevStep} className="flex-1 h-14 bg-gray-200 rounded-xl items-center justify-center">
                      <Text className="font-NunitoBold text-gray-700">Back</Text>
                    </TouchableOpacity>
                  )}
                  {currentStep < 3 ? (
                    <TouchableOpacity onPress={() => nextStep(validateForm, setFieldTouched, values)} className="flex-[2] h-14 bg-primary-500 rounded-xl items-center justify-center shadow-sm">
                      <Text className="font-NunitoBold text-white">Continue</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => formikHandleSubmit()} disabled={isSubmitting} className="flex-[2] h-14 bg-primary-500 rounded-xl items-center justify-center shadow-sm">
                      {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text className="font-NunitoBold text-white">{isEditMode ? 'Update' : 'Complete Setup'}</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>

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

export default UploadCarToRent