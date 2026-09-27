import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch, StyleSheet, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon, ChevronRightIcon } from 'react-native-heroicons/outline'
import { SparklesIcon } from 'react-native-heroicons/solid'
import { router, useLocalSearchParams } from 'expo-router'
import { generateCarDescription } from '@/utils/aiDescriptionGenerator'
import { Formik } from 'formik'
import * as Yup from 'yup'
import FormikInput from '@/components/forms/FormikInput'
import FormikTextArea from '@/components/forms/FormikTextArea'
import SelectField from '@/components/forms/SelectField'
import FormikButton from '@/components/forms/FormikButton'
import FeatureBadges from '@/components/forms/FeatureBadges'
import VINInput from '@/components/VINInput'
import { decodeVINWithImage } from '@/utils/vinDecoder'
import { sellerRoutes } from '@/constants/routes'
import { useCategories } from '@/hooks/useProducts'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import { useActiveRoleProfile } from '@/hooks/useUserProfile'
import { showToast } from '@/utils/toastUtils'
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
import CustomAlert from '@/components/CustomAlert'
import { useCustomAlert } from '@/hooks/useCustomAlert'

// ─── Step config ───────────────────────────────────────────────────────────────

const PRIMARY = '#D30309'

const STEPS = [
  { id: 1, label: 'Vehicle', sublabel: 'Make, model & specs', color: PRIMARY },
  { id: 2, label: 'Details', sublabel: 'Looks & features', color: PRIMARY },
  { id: 3, label: 'Pricing', sublabel: 'Price & delivery', color: PRIMARY },
]

// ─── SectionCard ───────────────────────────────────────────────────────────────

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

// ─── TogglePill ────────────────────────────────────────────────────────────────

const TogglePill = ({
  options, selected, onSelect,
}: {
  options: { label: string; value: string }[]
  selected: string
  onSelect: (v: string) => void
}) => (
  <View style={styles.togglePill}>
    {options.map(opt => (
      <TouchableOpacity
        key={opt.value}
        onPress={() => onSelect(opt.value)}
        style={[styles.toggleOption, selected === opt.value && styles.toggleOptionActive]}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleText, selected === opt.value && styles.toggleTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)

// ─── Stepper ───────────────────────────────────────────────────────────────────

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

// ─── Main ──────────────────────────────────────────────────────────────────────

const UploadProducts = () => {
  const { isVehicleRental } = useActiveRoleProfile();

  useEffect(() => {
    if (isVehicleRental) {
      showToast.error("Car sales upload is only available for Sellers/Merchants.");
      router.replace(sellerRoutes.uploadCarToRent as any);
    }
  }, [isVehicleRental]);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiVariationIndex, setAiVariationIndex] = useState(0)
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null)
  const { visible, alertConfig, hideAlert, showSuccess, showError } = useCustomAlert()

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }, [currentStep])

  const handleGenerateAIDescription = async (
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

      const generated = generateCarDescription({
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

      setFieldValue('description', generated);
      setAiVariationIndex(prev => prev + 1);
    } catch (err) {
      console.error('Error generating AI description:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const { editMode, productId, productData, formData, isEditing } = useLocalSearchParams<{
    editMode?: string; productId?: string; productData?: string; formData?: string; isEditing?: string;
  }>()

  const isEditMode = editMode === 'true'
  const isEditingMode = isEditing === 'true'
  const parsedProductData = productData ? JSON.parse(productData) : null

  const { data: categories } = useCategories()
  const carCategory = categories?.find(cat => cat.name.toLowerCase().includes('car'))
  const carCategoryId = carCategory?.id || 0

  const { data: vehicleMakes, loading: vehicleMakesLoading } = useVehicleMakes()
  const makeOptions = vehicleMakes?.map(make => ({ label: make.name, value: make.id.toString() })) || []

  const getModelsForSelectedMake = (makeId: string) => {
    if (!makeId || !vehicleMakes) return []
    return vehicleMakes.find(m => m.id.toString() === makeId)?.models || []
  }

  useEffect(() => {
    if (!isEditMode || !parsedProductData) return
    const features: string[] = []
    if (parsedProductData.air_conditioning) features.push('Air Conditioning')
    if (parsedProductData.leather_seats) features.push('Leather Seats')
    if (parsedProductData.navigation_system) features.push('Navigation System')
    if (parsedProductData.bluetooth) features.push('Bluetooth')
    if (parsedProductData.parking_sensors) features.push('Parking Sensors')
    if (parsedProductData.cruise_control) features.push('Cruise Control')
    if (parsedProductData.keyless_entry) features.push('Keyless Entry')
    if (parsedProductData.sunroof) features.push('Sunroof')
    if (parsedProductData.alloy_wheels) features.push('Alloy Wheels')
    if (parsedProductData.airbags) features.push('Airbags')
    if (parsedProductData.abs) features.push('ABS')
    if (parsedProductData.traction_control) features.push('Traction Control')
    if (parsedProductData.lane_assist) features.push('Lane Assist')
    if (parsedProductData.blind_spot_monitor) features.push('Blind Spot Monitor')
    setSelectedFeatures(features)
  }, [isEditMode, parsedProductData])

  const validationSchema = Yup.object().shape({
    make: Yup.number().required('Make is required'),
    model: Yup.number().required('Model is required'),
    year: Yup.number().required('Year is required').min(1900).max(new Date().getFullYear() + 1),
    condition: Yup.string().required('Condition is required'),
    body_type: Yup.string().required('Body type is required'),
    mileage: Yup.number().required('Mileage is required').min(0),
    mileage_unit: Yup.string().required('Mileage unit is required'),
    transmission: Yup.string().required('Transmission is required'),
    fuel_type: Yup.string().required('Fuel type is required'),
    engine_size: Yup.string(),
    exterior_color: Yup.string(),
    interior_color: Yup.string(),
    number_of_doors: Yup.number().min(1).max(10),
    number_of_seats: Yup.number().min(1).max(20),
    description: Yup.string().required('Description is required'),
    price: Yup.string().required('Price is required'),
    currency: Yup.string().required('Currency is required'),
    stock: Yup.number().required('Stock is required').min(0),
    availability: Yup.string().required('Availability is required'),
    delivery_option: Yup.string().required('Delivery option is required'),
    vin: Yup.string(),
    enable_bidding: Yup.boolean(),
    duration_days: Yup.number().when('enable_bidding', {
      is: true,
      then: schema => schema.required('Duration is required when bidding is enabled').min(1, 'Minimum duration is 1 day'),
      otherwise: schema => schema.notRequired()
    })
  })

  const ed = isEditMode && parsedProductData
  const initialValues = {
    make: ed ? parsedProductData.make?.toString() || '' : '',
    model: ed ? parsedProductData.model?.toString() || '' : '',
    year: ed ? parsedProductData.year?.toString() || '' : '',
    condition: ed ? parsedProductData.condition || 'new' : 'new',
    body_type: ed ? parsedProductData.body_type || '' : '',
    mileage: ed ? parsedProductData.mileage?.toString() || '' : '',
    mileage_unit: ed ? parsedProductData.mileage_unit || 'km' : 'km',
    transmission: ed ? parsedProductData.transmission || 'automatic' : 'automatic',
    fuel_type: ed ? parsedProductData.fuel_type || '' : '',
    engine_size: ed ? parsedProductData.engine_size || '' : '',
    exterior_color: ed ? parsedProductData.exterior_color || '' : '',
    interior_color: ed ? parsedProductData.interior_color || '' : '',
    number_of_doors: ed ? parsedProductData.number_of_doors?.toString() || '' : '',
    number_of_seats: ed ? parsedProductData.number_of_seats?.toString() || '' : '',
    description: ed ? parsedProductData.description || '' : '',
    price: ed ? parsedProductData.price || '' : '',
    currency: ed ? parsedProductData.currency || 'NGN' : 'NGN',
    stock: ed ? parsedProductData.stock?.toString() || '' : '',
    availability: ed ? parsedProductData.availability || 'in_stock' : 'in_stock',
    delivery_option: ed ? parsedProductData.delivery_option || 'pickup' : 'pickup',
    negotiable: ed ? parsedProductData.negotiable || false : false,
    is_rental: ed ? parsedProductData.is_rental || false : false,
    vin: ed ? parsedProductData.vin || '' : '',
    enable_bidding: false,
    duration_days: '',
  }

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

  const handleFeatureToggle = (feature: string) =>
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    )

  const handleSubmit = async (values: typeof initialValues, { setErrors }: any) => {
    try {
      const editing = isEditMode || isEditingMode

      const makeName = makeOptions.find(o => o.value === values.make.toString())?.label || ''
      const modelName = getModelsForSelectedMake(values.make.toString()).find(m => m.id.toString() === values.model.toString())?.name || ''
      const generatedName = `${values.year} ${makeName} ${modelName}`.trim()

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
          category_id: carCategoryId, name: generatedName,
          make: parseInt(values.make), model: parseInt(values.model), year: parseInt(values.year),
          condition: values.condition, body_type: values.body_type,
          mileage: parseInt(values.mileage), mileage_unit: values.mileage_unit,
          transmission: values.transmission, fuel_type: values.fuel_type, engine_size: values.engine_size,
          exterior_color: values.exterior_color, interior_color: values.interior_color,
          number_of_doors: parseInt(values.number_of_doors), number_of_seats: parseInt(values.number_of_seats),
          ...features,
          description: values.description, price: values.price, currency: values.currency,
          negotiable: values.negotiable || false, discount: '0', availability: values.availability,
          stock: parseInt(values.stock), is_rental: values.is_rental || false,
          delivery_option: values.delivery_option,
          vin: values.vin,
        },
        requestType: 'inbound'
      }

      const finalProductId = productId || parsedProductData?.id
      const endpoint = editing
        ? `${process.env.EXPO_PUBLIC_API_URL}/products/products/${finalProductId}/`
        : `${process.env.EXPO_PUBLIC_API_URL}/products/products/`

      const response = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
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

      const updatedProductId = responseData.data?.id || finalProductId || ''

      if (values.enable_bidding && updatedProductId) {
        const biddingResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/products/products/${updatedProductId}/bidding/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
            'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
          },
          body: JSON.stringify({
            product: updatedProductId,
            start_time: new Date().toISOString(),
            duration_days: parseInt(values.duration_days.toString(), 10),
            is_closed: false,
          }),
        })
        if (!biddingResponse.ok) {
          console.error('Failed to create bidding window:', await biddingResponse.text())
          Alert.alert('Warning', 'Car created successfully, but failed to setup the bidding window.')
        }
      }

      if (editing) {
        showSuccess('Success', 'Car details updated successfully!', {
          onButtonPress: () => {
            hideAlert();
            router.push({
              pathname: sellerRoutes.editImage as any,
              params: { productId: updatedProductId, productData: JSON.stringify(responseData.data || parsedProductData) }
            })
          }
        });
      } else {
        router.push({
          pathname: sellerRoutes.uploadCarImages as any,
          params: { formData: JSON.stringify(payload), productId: updatedProductId }
        })
      }
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

      showError('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} product. Please try again.`)
    }
  }

  const stepColor = STEPS[currentStep - 1].color

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(sellerRoutes?.products)} style={styles.backBtn}>
          <ArrowLeftIcon size={18} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Car' : 'List Your Car'}</Text>
          <Text style={styles.headerSub}>Step {currentStep} of {STEPS.length}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Stepper */}
      <View style={styles.stepperWrap}>
        <Stepper currentStep={currentStep} />
      </View>



      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
            {({ values, errors, touched, handleSubmit: formikHandleSubmit, isValid, dirty, isSubmitting, setFieldValue, validateForm, setTouched }) => {

              const handleNext = async () => {
                const formErrors = await validateForm()
                const step1Fields = ['make', 'model', 'year', 'condition', 'body_type', 'mileage', 'mileage_unit', 'transmission', 'fuel_type']
                const step2Fields = ['description']
                const fields = currentStep === 1 ? step1Fields : step2Fields
                const hasErr = fields.some(f => formErrors[f as keyof typeof formErrors])
                if (hasErr) {
                  const touch: Record<string, boolean> = {}
                  fields.forEach(f => { touch[f] = true })
                  setTouched(touch, true)
                  return
                }
                setCurrentStep(prev => prev + 1)
              }

              return (
                <View>
                  {/* STEP 1 */}
                  {currentStep === 1 && (
                    <View style={styles.stepContent}>
                      <SectionCard number={1} title="Basic Information" subtitle="Make, model & year">
                        <VINInput name="vin" label="VIN" placeholder="Vehicle Identification Number" onVINLookup={handleVINLookup} />
                        <View className='pt-4'>
                          <SelectField
                            name="make" label="Make"
                            placeholder={vehicleMakesLoading ? 'Loading…' : 'Select make'}
                            options={makeOptions} value={values.make}
                            onValueChange={v => { setFieldValue('make', v); setFieldValue('model', '') }}
                            error={errors.make as string} touched={touched.make as boolean}
                          />
                        </View>
                        <SelectField
                          name="model" label="Model"
                          placeholder={values.make ? 'Select model' : 'Select make first'}
                          options={getModelsForSelectedMake(values.make.toString()).map(m => ({ label: m.name, value: m.id.toString() }))}
                          value={values.model} onValueChange={v => setFieldValue('model', v)}
                          error={errors.model as string} touched={touched.model as boolean}
                        />
                        <FormikInput name="year" label="Year" placeholder="e.g. 2023" keyboardType="numeric" type="text" />

                        <SelectField
                          name="condition" label="Condition" placeholder="Select condition"
                          options={conditionOptions} value={values.condition}
                          onValueChange={v => setFieldValue('condition', v)}
                          error={errors.condition as string} touched={touched.condition as boolean}
                        />
                      </SectionCard>

                      <SectionCard number={2} title="Specifications" subtitle="Engine & drivetrain">
                        <SelectField
                          name="body_type" label="Body Type" placeholder="Select body type"
                          options={bodyTypeOptions} value={values.body_type}
                          onValueChange={v => setFieldValue('body_type', v)}
                          error={errors.body_type as string} touched={touched.body_type as boolean}
                        />
                        <View>
                          <Text style={styles.fieldLabel}>Mileage</Text>
                          <View style={styles.mileageRow}>
                            <View style={{ flex: 1 }}>
                              <FormikInput name="mileage" label="" placeholder="e.g. 50,000" keyboardType="numeric" type="text" />
                            </View>
                            <TogglePill
                              options={[{ label: 'km', value: 'km' }, { label: 'mi', value: 'miles' }]}
                              selected={values.mileage_unit}
                              onSelect={v => setFieldValue('mileage_unit', v)}
                            />
                          </View>
                        </View>
                        <SelectField
                          name="transmission" label="Transmission" placeholder="Select transmission"
                          options={transmissionOptions} value={values.transmission}
                          onValueChange={v => setFieldValue('transmission', v)}
                          error={errors.transmission as string} touched={touched.transmission as boolean}
                        />
                        <SelectField
                          name="fuel_type" label="Fuel Type" placeholder="Select fuel type"
                          options={fuelTypeOptions} value={values.fuel_type}
                          onValueChange={v => setFieldValue('fuel_type', v)}
                          error={errors.fuel_type as string} touched={touched.fuel_type as boolean}
                        />
                        <SelectField
                          name="engine_size" label="Engine Size" placeholder="Select engine size"
                          options={engineSizeOptions} value={values.engine_size}
                          onValueChange={v => setFieldValue('engine_size', v)}
                          error={errors.engine_size as string} touched={touched.engine_size as boolean}
                        />
                      </SectionCard>
                    </View>
                  )}

                  {/* STEP 2 */}
                  {currentStep === 2 && (
                    <View style={styles.stepContent}>
                      <SectionCard number={3} title="Appearance" subtitle="Colors & dimensions">
                        <FormikInput name="exterior_color" label="Exterior Color" placeholder="e.g. Midnight Black" type="text" />
                        <FormikInput name="interior_color" label="Interior Color" placeholder="e.g. Beige" type="text" />
                        <View style={styles.twoCol}>
                          <View style={{ flex: 1 }}>
                            <FormikInput name="number_of_doors" label="Doors" placeholder="4" keyboardType="numeric" type="text" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <FormikInput name="number_of_seats" label="Seats" placeholder="5" keyboardType="numeric" type="text" />
                          </View>
                        </View>
                      </SectionCard>

                      <SectionCard number={4} title="Features" subtitle="Amenities & safety tech">
                        <FeatureBadges
                          features={featureOptions}
                          selectedFeatures={selectedFeatures}
                          onFeatureToggle={handleFeatureToggle}
                          label="Select all that apply"
                        />
                      </SectionCard>

                      <SectionCard 
                        number={5}
                        title="Description" 
                        subtitle="Sell the story"
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
                          name="description" label="Description"
                          placeholder="Well maintained car with service history. Perfect for city or highway driving with excellent fuel economy…"
                          numberOfLines={5} maxLength={500}
                          helperText="Be specific — buyers love detail."
                        />
                      </SectionCard>
                    </View>
                  )}

                  {/* STEP 3 */}
                  {currentStep === 3 && (
                    <View style={styles.stepContent}>
                      <SectionCard number={6} title="Pricing" subtitle="Set your asking price">
                        <FormikInput name="price" label="Price (₦)" placeholder="e.g. 2,500,000" keyboardType="numeric" type="text" />
                        <FormikInput name="stock" label="Stock Quantity" placeholder="e.g. 1" keyboardType="numeric" type="text" />
                        <SelectField
                          name="availability" label="Availability" placeholder="Select availability"
                          options={availabilityOptions} value={values.availability}
                          onValueChange={v => setFieldValue('availability', v)}
                          error={errors.availability as string} touched={touched.availability as boolean}
                        />
                        <SelectField
                          name="delivery_option" label="Delivery Option" placeholder="Select delivery"
                          options={deliveryOptions} value={values.delivery_option}
                          onValueChange={v => setFieldValue('delivery_option', v)}
                          error={errors.delivery_option as string} touched={touched.delivery_option as boolean}
                        />

                      </SectionCard>

                      <SectionCard number={7} title="Bidding" subtitle="Let buyers compete">
                        <View style={styles.switchRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.switchLabel}>Enable Bidding</Text>
                            <Text style={styles.switchSub}>Allow customers to place bids on this car</Text>
                          </View>
                          <Switch
                            value={values.enable_bidding as boolean}
                            onValueChange={v => void setFieldValue('enable_bidding', v)}
                            trackColor={{ false: '#E5E7EB', true: '#D30309' }}
                            thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : values.enable_bidding ? '#FFFFFF' : '#F3F4F6'}
                          />
                        </View>
                        {values.enable_bidding && (
                          <View style={styles.biddingExpand}>
                            <FormikInput name="duration_days" label="Bidding Duration (Days)" placeholder="e.g. 7" keyboardType="numeric" type="text" />
                          </View>
                        )}
                      </SectionCard>
                    </View>
                  )}

                  {/* Nav buttons */}
                  <View style={styles.navBar}>
                    {currentStep > 1 && (
                      <TouchableOpacity onPress={() => setCurrentStep(p => p - 1)} style={styles.backNavBtn} activeOpacity={0.8}>
                        <ArrowLeftIcon size={16} color="#374151" />
                        <Text style={styles.backNavText}>Back</Text>
                      </TouchableOpacity>
                    )}
                    {currentStep < 3 ? (
                      <TouchableOpacity
                        onPress={handleNext}
                        style={[styles.nextBtn, { backgroundColor: stepColor, flex: currentStep > 1 ? 0 : 1 }]}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.nextBtnText}>Next</Text>
                        <ChevronRightIcon size={16} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <FormikButton
                        title={isEditMode ? '✓ Update Car' : '🚀 Publish Listing'}
                        type="submit"
                        onPress={formikHandleSubmit}
                        disabled={!isValid || !dirty || isSubmitting}
                        loading={isSubmitting}
                        className="flex-1"
                      />
                    )}
                  </View>
                </View>
              )
            }}
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
          buttonText={alertConfig.buttonText || (alertConfig.onButtonPress ? 'Continue to Images' : 'OK')}
        />
      )}
    </SafeAreaView>
  )
}

export default UploadProducts

// ─── Styles ────────────────────────────────────────────────────────────────────

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
  contextBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  contextDot: { width: 6, height: 6, borderRadius: 3 },
  contextText: { flex: 1, fontSize: 12, fontFamily: 'NunitoSemiBold' },
  contextPct: { fontSize: 12, fontFamily: 'NunitoBold' },
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'android' ? 70 : 40 },
  stepContent: { gap: 14 },
  fieldLabel: { fontSize: 14, fontFamily: 'NunitoSemiBold', color: '#374151', marginBottom: 8 },
  mileageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  twoCol: { flexDirection: 'row', gap: 12 },
  togglePill: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: 10, padding: 3, alignSelf: 'flex-start', minWidth: 90,
  },
  toggleOption: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  toggleOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  toggleText: { fontSize: 12, fontFamily: 'NunitoSemiBold', color: '#9CA3AF', textAlign: 'center' },
  toggleTextActive: { color: PRIMARY },
  togglesGroup: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 12, paddingTop: 12 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  switchLabel: { fontSize: 14, fontFamily: 'NunitoSemiBold', color: '#111827' },
  switchSub: { fontSize: 12, fontFamily: 'NunitoMedium', color: '#9CA3AF', marginTop: 2 },
  biddingExpand: {
    marginTop: 14, padding: 14, borderRadius: 12,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  navBar: {
    flexDirection: 'row', gap: 10, marginTop: 20,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  backNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  backNavText: { fontSize: 14, fontFamily: 'NunitoSemiBold', color: '#374151' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 12, minWidth: 120,
  },
  nextBtnText: { fontSize: 15, fontFamily: 'NunitoBold', color: '#fff' },
})
