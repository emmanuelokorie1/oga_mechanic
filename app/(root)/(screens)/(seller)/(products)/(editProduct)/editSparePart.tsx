import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon } from 'react-native-heroicons/outline'
import { SparklesIcon } from 'react-native-heroicons/solid'
import { router, useLocalSearchParams } from 'expo-router'
import { generateSparePartDescription } from '@/utils/aiDescriptionGenerator'
import { Formik } from 'formik'
import * as Yup from 'yup'
import FormikInput from '@/components/forms/FormikInput'
import FormikTextArea from '@/components/forms/FormikTextArea'
import SelectField from '@/components/forms/SelectField'
import MultiSelectBottomSheet from '@/components/forms/MultiSelectBottomSheet'
import FormikButton from '@/components/forms/FormikButton'
import { sellerRoutes } from '@/constants/routes'
import { availabilityOptions, deliveryOptions, conditionOptions } from '@/constants/data'
import { useVehicleMakes } from '@/hooks/useVehicleMakes'
import { useCategories } from '@/hooks/useProducts'

interface VehicleCompatibility {
  make: number;
  models: number[];
}
// import CustomButton from '@/components/CustomButton'

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
  '3': 'bg-orange-500',
  '4': 'bg-red-500',
};

const SectionCard = ({ number, badgeBg, title, subtitle, rightAction, children }: SectionCardProps) => {
  const bgClass = badgeBg || badgeColorMap[String(number)] || 'bg-blue-500';
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
      <View className="flex-row items-center mb-4">
        <View className={`w-8 h-8 ${bgClass} rounded-lg items-center justify-center mr-3`}>
          <Text className="text-white font-NunitoBold text-sm">{number}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-NunitoBold text-gray-900">{title}</Text>
          <Text className="text-xs text-gray-500 font-NunitoMedium">{subtitle}</Text>
        </View>
        {rightAction}
      </View>
      <View className="gap-4">
        {children}
      </View>
    </View>
  );
};

const EditSparePart = () => {
  const [vehicleCompatibility, setVehicleCompatibility] = useState<VehicleCompatibility[]>([])
  const [showOtherCategory, setShowOtherCategory] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiVariationIndex, setAiVariationIndex] = useState(0)

  const handleGenerateAISparePartDescription = async (
    values: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setIsGeneratingAI(true);
    await new Promise(resolve => setTimeout(resolve, 400));

    try {
      const compatibleMakeNames: string[] = [];
      const compatibleModelNames: string[] = [];

      vehicleCompatibility.forEach(vc => {
        const makeObj = vehicleMakes?.find((m: any) => m.id.toString() === vc.make?.toString());
        if (makeObj) {
          compatibleMakeNames.push(makeObj.name);
          if (Array.isArray(vc.models)) {
            vc.models.forEach((mId: any) => {
              const modelObj = makeObj.models?.find((m: any) => m.id.toString() === mId?.toString());
              if (modelObj) compatibleModelNames.push(modelObj.name);
            });
          }
        }
      });

      const generated = generateSparePartDescription({
        name: values.name,
        category: values.category,
        condition: values.condition,
        compatibleMakes: compatibleMakeNames,
        compatibleModels: compatibleModelNames,
        price: values.price,
      }, aiVariationIndex);

      setFieldValue('description', generated);
      setAiVariationIndex(prev => prev + 1);
    } catch (err) {
      console.error('Error generating AI spare part description:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const { productId, productData } = useLocalSearchParams<{
    productId?: string;
    productData?: string;
  }>();

  const parsedProductData = React.useMemo(() => {
    if (!productData) return null;
    try {
      return JSON.parse(productData);
    } catch (e) {
      console.error("Failed to parse productData", e);
      return null;
    }
  }, [productData]);

  // Fetch categories from API
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Fetch vehicle makes and models
  const { data: vehicleMakes, loading: makesLoading } = useVehicleMakes();

  // Get spare parts category ID (used when "Other" is selected)
  const sparePartsCategory = categories?.find(cat => cat.name.toLowerCase().includes('spare'));
  const sparePartsCategoryId = sparePartsCategory?.id || 2;

  // Convert categories to options, excluding "Car"
  const categoryOptionsFiltered = categories?.filter(cat =>
    !cat.name.toLowerCase().includes('car')
  ).map(category => ({
    label: category.name,
    value: category.id.toString()
  })) || [];

  // Add "Other" option
  const categoryOptions = [
    ...categoryOptionsFiltered,
    { label: 'Other (Custom)', value: 'other' }
  ];

  const validationSchema = Yup.object().shape({
    category: Yup.string().required('Category is required'),
    custom_category_name: Yup.string().when('category', {
      is: 'other',
      then: (schema) => schema.required('Please specify the category name'),
      otherwise: (schema) => schema.notRequired(),
    }),
    condition: Yup.string().required('Condition is required'),
    description: Yup.string().required('Description is required'),
    price: Yup.string().required('Price is required'),
    currency: Yup.string().required('Currency is required'),
    stock: Yup.number().required('Stock is required').min(0),
    availability: Yup.string().required('Availability is required'),
    delivery_option: Yup.string().required('Delivery option is required'),
  })

  // Determine if category is "other" and get initial values
  const getCategoryValue = () => {
    if (!parsedProductData) return '';

    const categoryId = parsedProductData.category_id || parsedProductData.category?.id;
    if (!categoryId) return '';

    const categoryExists = categories?.some(cat =>
      cat.id === categoryId && !cat.name.toLowerCase().includes('car')
    );

    return categoryExists ? categoryId.toString() : 'other';
  };

  const getCustomCategoryName = () => {
    if (!parsedProductData) return '';

    const categoryId = parsedProductData.category_id || parsedProductData.category?.id;
    const categoryExists = categories?.some(cat =>
      cat.id === categoryId && !cat.name.toLowerCase().includes('car')
    );

    return !categoryExists ? parsedProductData.name || '' : '';
  };

  const initialValues = {
    category: getCategoryValue(),
    custom_category_name: getCustomCategoryName(),
    condition: parsedProductData?.condition || 'new',
    description: parsedProductData?.description || '',
    price: parsedProductData?.price ? Math.round(parseFloat(parsedProductData.price.toString())).toString() : '',
    currency: parsedProductData?.currency || 'NGN',
    stock: parsedProductData?.stock?.toString() || '',
    availability: parsedProductData?.availability || 'in_stock',
    delivery_option: parsedProductData?.delivery_option || 'nationwide',
  }

  // Initialize vehicle compatibility from parsed data
  useEffect(() => {
    if (!parsedProductData?.vehicle_compatibility || !vehicleMakes) return;

    const vehicleCompat = parsedProductData.vehicle_compatibility;

    if (Array.isArray(vehicleCompat)) {
      const mapped = vehicleCompat.map((vc: any) => {
        let makeId: number = 0;
        if (typeof vc.make === 'object' && vc.make?.id) {
          makeId = Number(vc.make.id);
        } else if (vc.make_id) {
          makeId = Number(vc.make_id);
        } else if (typeof vc.make === 'number') {
          makeId = vc.make;
        } else if (typeof vc.make === 'string') {
          if (!isNaN(Number(vc.make))) {
            makeId = Number(vc.make);
          } else {
            const foundMake = vehicleMakes.find(
              (m: any) => m.name.toLowerCase() === vc.make.toLowerCase()
            );
            if (foundMake) makeId = foundMake.id;
          }
        }

        const rawModels = vc.models || vc.model || [];
        const modelList = Array.isArray(rawModels) ? rawModels : [rawModels];
        const selectedMake = vehicleMakes.find((m: any) => m.id === makeId);

        const modelIds: number[] = modelList
          .map((m: any) => {
            if (typeof m === 'object' && m?.id) return Number(m.id);
            if (typeof m === 'number') return m;
            if (typeof m === 'string') {
              if (!isNaN(Number(m))) return Number(m);
              if (selectedMake?.models) {
                const foundModel = selectedMake.models.find(
                  (sm: any) => sm.name.toLowerCase() === m.toLowerCase()
                );
                if (foundModel) return foundModel.id;
              }
            }
            return 0;
          })
          .filter((id: number) => id > 0);

        return {
          make: makeId,
          models: modelIds
        };
      });
      setVehicleCompatibility(mapped);
    }
  }, [parsedProductData?.vehicle_compatibility, vehicleMakes]);

  // Check if initial category is "other" and show custom input
  useEffect(() => {
    if (!parsedProductData || !categories) return;

    const categoryId = parsedProductData.category_id || parsedProductData.category?.id;
    if (!categoryId) return;

    const isOtherCategory = !categories.some(cat =>
      cat.id === categoryId && !cat.name.toLowerCase().includes('car')
    );

    setShowOtherCategory(isOtherCategory);
  }, [categories, parsedProductData])

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      // Determine category_id and name based on selection
      let categoryId: number;
      let productName: string;

      if (values.category === 'other') {
        categoryId = sparePartsCategoryId;
        productName = values.custom_category_name;
      } else {
        categoryId = parseInt(values.category);
        const selectedCategory = categories?.find(cat => cat.id.toString() === values.category);
        productName = selectedCategory?.name || '';
      }

      // Format payload
      const payload = {
        data: {
          category_id: categoryId,
          name: productName,
          description: values.description,
          price: parseFloat(values.price),
          currency: values.currency,
          stock: parseInt(values.stock),
          availability: values.availability,
          condition: values.condition,
          delivery_option: values.delivery_option,
          vehicle_compatibility: vehicleCompatibility.map(vc => ({
            make: vc.make,
            model: vc.models
          }))
        },
        requestType: "inbound"
      };

      const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/products/products/${productId}/`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          'X-Api-Key': process.env.EXPO_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json();

      // Show success alert
      Alert.alert('Success', `${productName} updated successfully!`, [
        {
          text: 'Continue to Edit Images',
          onPress: () => router.push({
            pathname: sellerRoutes.editImage as any,
            params: {
              productId: productId,
              productData: JSON.stringify(responseData.data || parsedProductData),
              productType: 'spare-part',
            }
          })
        },
        { text: 'Done', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update product. Please try again.');
    }
  }

  // Helper functions
  const addVehicleCompatibility = () => {
    setVehicleCompatibility([...vehicleCompatibility, { make: 0, models: [] }]);
  };

  const removeVehicleCompatibility = (index: number) => {
    setVehicleCompatibility(vehicleCompatibility.filter((_: any, i: number) => i !== index));
  };

  const updateVehicleMake = (index: number, makeId: number) => {
    const updated = [...vehicleCompatibility];
    updated[index] = { make: makeId, models: [] };
    setVehicleCompatibility(updated);
  };

  const updateVehicleModels = (index: number, modelIds: (string | number)[]) => {
    const updated = [...vehicleCompatibility];
    updated[index].models = modelIds.map(id => typeof id === 'string' ? parseInt(id) : id);
    setVehicleCompatibility(updated);
  };

  const getSelectedMake = (index: number) => {
    if (!vehicleMakes) return undefined;
    const makeId = vehicleCompatibility[index]?.make;
    return vehicleMakes.find(make => make.id === makeId || make.id?.toString() === makeId?.toString());
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(sellerRoutes?.products as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-xl bg-gray-100"
          >
            <ArrowLeftIcon size={20} color="#374151" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-NunitoBold text-gray-900">
              Edit Product
            </Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">
              Update Product Information
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
            paddingBottom: Platform.OS === 'ios' ? 50 : 40,
            flexGrow: 1
          }}
        >


          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ values, errors, touched, handleSubmit: formikHandleSubmit, isValid, isSubmitting, setFieldValue }) => {


              return (
                <View className="space-y-6">


                  {/* Basic Information */}
                  <SectionCard number={1} title="Basic Information" subtitle="Update Product Details">

                    {/* Category */}
                    <SelectField
                      name="category"
                      label="Category"
                      placeholder={categoriesLoading ? "Loading..." : "Select category"}
                      options={categoryOptions}
                      value={values.category}
                      onValueChange={(value) => {
                        setFieldValue('category', value);
                        setShowOtherCategory(value === 'other');
                        if (value !== 'other') {
                          setFieldValue('custom_category_name', '');
                        }
                      }}
                      error={errors.category as string}
                      touched={touched.category as boolean}
                    />

                    {/* Custom Category Name */}
                    {showOtherCategory && (
                      <FormikInput
                        name="custom_category_name"
                        label="Specify Category Name"
                        placeholder="e.g., Custom Exhaust System, Special Engine Component"
                        type="text"
                      />
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
                  </SectionCard>

                  {/* Vehicle Compatibility */}
                  <SectionCard number={2} title="Compatible Vehicles" subtitle="Select Makes and Models">
                    <View className="flex-row items-center justify-end mb-4">
                      <TouchableOpacity
                        onPress={addVehicleCompatibility}
                        disabled={makesLoading}
                        className="bg-primary-500 px-4 py-2 rounded-[.4rem]"
                        style={{ opacity: makesLoading ? 0.5 : 1 }}
                      >
                        <Text className="text-white text-sm font-NunitoBold">+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    {makesLoading ? (
                      <View className="py-8 items-center">
                        <ActivityIndicator size="large" color="#D30309" />
                        <Text className="text-sm text-gray-500 mt-2">Loading...</Text>
                      </View>
                    ) : vehicleCompatibility.length === 0 ? (
                      <View className="py-6 items-center bg-gray-50 rounded-xl">
                        <Text className="text-sm text-gray-600 mb-2">No Vehicles Added</Text>
                        <Text className="text-xs text-gray-400 text-center px-4">
                          Tap "Add" to select Compatible Vehicles
                        </Text>
                      </View>
                    ) : (
                      <View className="space-y-3">
                        {vehicleCompatibility.map((vc, index) => {
                          const selectedMake = getSelectedMake(index);

                          return (
                            <View key={index} className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
                              <View className="mb-3">
                                <View className="flex-row items-center justify-between mb-2">
                                  <Text className="text-sm font-NunitoMedium text-gray-700">Make</Text>
                                  <TouchableOpacity onPress={() => removeVehicleCompatibility(index)}>
                                    <Text className="text-red-500 text-sm font-NunitoMedium">Remove</Text>
                                  </TouchableOpacity>
                                </View>

                                <SelectField
                                  name={`vehicle_make_${index}`}
                                  label=""
                                  placeholder="Select make"
                                  options={vehicleMakes.map(make => ({
                                    label: make.name,
                                    value: make.id.toString()
                                  }))}
                                  value={vc.make && vc.make !== 0 ? vc.make.toString() : ''}
                                  onValueChange={(value) => updateVehicleMake(index, parseInt(value, 10))}
                                  error=""
                                  touched={false}
                                />
                              </View>

                              {selectedMake && selectedMake.models && selectedMake.models.length > 0 && (
                                <MultiSelectBottomSheet
                                  label={`Select Models for ${selectedMake.name}`}
                                  placeholder="Select models..."
                                  options={selectedMake.models.map(model => ({
                                    label: model.name,
                                    value: model.id
                                  }))}
                                  selectedValues={vc.models || []}
                                  onValuesChange={(values) => updateVehicleModels(index, values)}
                                />
                              )}
                            </View>
                          );
                        })}

                        <TouchableOpacity
                          onPress={addVehicleCompatibility}
                          className="border border-dashed border-gray-500 rounded-xl p-3 bg-white"
                        >
                          <Text className="text-md text-primary-500 font-NunitoMedium text-center">
                            + Add Another Make
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </SectionCard>

                  {/* Description */}
                  <SectionCard 
                    number={3} 
                    title="Description" 
                    subtitle="Provide Details About the Product"
                    rightAction={
                      <TouchableOpacity
                        onPress={() => handleGenerateAISparePartDescription(values, setFieldValue)}
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
                      placeholder="e.g., High-quality brake pads compatible with multiple Toyota and Honda models."
                      numberOfLines={5}
                      maxLength={500}
                      helperText="Describe the spare part's features, compatibility, and condition"
                    />
                  </SectionCard>

                  {/* Pricing & Availability */}
                  <SectionCard number={4} title="Pricing & Availability" subtitle="Set your Price and Stock">
                    {/* Price */}
                    <FormikInput
                      name="price"
                      label="Price (₦)"
                      placeholder="e.g., 25000.00"
                      keyboardType="numeric"
                      type="text"
                    />

                    {/* Stock */}
                    <FormikInput
                      name="stock"
                      label="Stock Quantity"
                      placeholder="e.g., 100"
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

                  {/* Submit Button */}
                  <View className="bg-white rounded-[16px] p-5 mb-2 border border-gray-100 shadow-sm">
                    <FormikButton
                      title="Update Product Details"
                      type="submit"
                      onPress={formikHandleSubmit}
                      disabled={!isValid || isSubmitting}
                      loading={isSubmitting}
                      loadingText="Updating"
                      className="mb-3"
                    />
                    <Text className="text-xs text-gray-500 text-center font-NunitoMedium">
                      Your Product Details will be Updated
                    </Text>
                  </View>
                </View>
              );
            }}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default EditSparePart