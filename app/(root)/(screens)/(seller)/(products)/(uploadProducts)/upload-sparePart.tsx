import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from 'react-native-heroicons/outline'
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
import CustomButton from '@/components/CustomButton'

const PRIMARY = '#D30309';

const SectionCard = ({ children, title, subtitle, icon, accentColor, rightAction }: any) => (
  <View 
    className="bg-white rounded-[16px] p-5 mb-5 border border-gray-100" 
    style={{ borderTopWidth: 3, borderTopColor: accentColor, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
  >
    <View className="flex-row items-center mb-5 gap-3">
      <View style={{ backgroundColor: `${accentColor}1A` }} className="w-10 h-10 rounded-xl items-center justify-center">
        <Text className="text-[20px]">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text style={{ color: '#111827' }} className="text-[15px] font-NunitoBold mb-0.5">{title}</Text>
        <Text className="text-[12px] text-gray-500 font-NunitoMedium">{subtitle}</Text>
      </View>
      {rightAction}
    </View>
    <View className="gap-4">
      {children}
    </View>
  </View>
);

const UploadSparePart = () => {
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

  const { editMode, productId, productData, formData, isEditing } = useLocalSearchParams<{
    editMode?: string;
    productId?: string;
    productData?: string;
    formData?: string;
    isEditing?: string;
  }>();

  const isEditMode = editMode === 'true' || isEditing === 'true';
  const parsedProductData = productData ? JSON.parse(productData) : null;
  const parsedFormData = formData ? JSON.parse(formData) : null;

  // Use formData if available (coming back from image upload), otherwise use productData
  const dataSource = parsedFormData?.data || parsedProductData;

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
    value: category.id.toString() // Use ID as value
  })) || [];

  // Add "Other" option
  const categoryOptions = [
    ...categoryOptionsFiltered,
    { label: 'Other (Custom)', value: 'other' }
  ];

  const validationSchema = Yup.object().shape({
    category: Yup.string().required('Category is required'),
    name: Yup.string().required('Product name is required'),
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
    if (!dataSource) return '';

    const categoryId = dataSource.category_id || dataSource.category?.id;
    if (!categoryId) return '';

    // Check if this category exists in our filtered list (excluding cars)
    const categoryExists = categories?.some(cat =>
      cat.id === categoryId && !cat.name.toLowerCase().includes('car')
    );

    return categoryExists ? categoryId.toString() : 'other';
  };

  const initialValues = {
    category: getCategoryValue(),
    name: dataSource?.name || '',
    condition: dataSource?.condition || 'new',
    description: dataSource?.description || '',
    price: dataSource?.price?.toString() || '',
    currency: dataSource?.currency || 'NGN',
    stock: dataSource?.stock?.toString() || '',
    availability: dataSource?.availability || 'in_stock',
    delivery_option: dataSource?.delivery_option || 'nationwide',
  }

  // Initialize vehicle compatibility from parsed data
  useEffect(() => {
    const vehicleCompat = dataSource?.vehicle_compatibility;
    if (vehicleCompat && Array.isArray(vehicleCompat)) {
      setVehicleCompatibility(vehicleCompat.map((vc: any) => ({
        make: vc.make,
        models: vc.model || vc.models || []
      })));
    }
  }, [dataSource])

  // Check if initial category is "other" and show custom input
  useEffect(() => {
    if (!dataSource || !categories) return;

    const categoryId = dataSource.category_id || dataSource.category?.id;
    if (!categoryId) return;

    const isOtherCategory = !categories.some(cat =>
      cat.id === categoryId && !cat.name.toLowerCase().includes('car')
    );

    setShowOtherCategory(isOtherCategory);
  }, [categories, dataSource])

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      const isEditing = isEditMode;

      // Determine category_id and name based on selection
      let categoryId: number;
      let productName: string;

      if (values.category === 'other') {
        // If "Other" is selected, use spare parts category ID and user's product name
        categoryId = sparePartsCategoryId;
        productName = values.name;
      } else {
        // If a category is selected, use that category's ID and user's product name
        categoryId = parseInt(values.category);
        productName = values.name;
      }

      // Format payload to match API structure
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

      // Determine endpoint and method based on edit mode
      const finalProductId = productId || dataSource?.id;
      const endpoint = isEditing && finalProductId
        ? `${process.env.EXPO_PUBLIC_API_URL}/products/products/${finalProductId}/`
        : `${process.env.EXPO_PUBLIC_API_URL}/products/products/`;
      const method = isEditing && finalProductId ? 'PUT' : 'POST';

      // Call the products API endpoint
      const response = await fetch(endpoint, {
        method: method,
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
      // Get the product ID from response
      const updatedProductId = responseData.data?.id || finalProductId || '';

      if (isEditing) {
        // For editing, show success alert
        Alert.alert('Success', `${productName} updated successfully!`, [
          {
            text: 'Continue to Edit Images',
            onPress: () => router.push({
              pathname: sellerRoutes.editImage as any,
              params: {
                productId: updatedProductId,
                productData: JSON.stringify(responseData.data || parsedProductData),
              }
            })
          },
          { text: 'Done', onPress: () => router.back() }
        ]);
      } else {
        // For creation, navigate to image upload page
        router.push({
          pathname: sellerRoutes.uploadCarImages as any,
          params: {
            formData: JSON.stringify(payload),
            productId: updatedProductId,
            productType: 'spare-part', // Identify as spare part
          }
        });
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} product. Please try again.`);
    }
  }

  // Helper functions for vehicle compatibility
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
    const makeId = vehicleCompatibility[index]?.make;
    return vehicleMakes.find(make => make.id === makeId);
  };

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
            <Text className="text-xl font-NunitoBold text-gray-900">
              {isEditMode ? 'Edit Product' : 'Product Details'}
            </Text>
            <Text className="text-xs text-gray-500 font-NunitoMedium">
              {isEditMode ? 'Update Product Information' : 'Enter Product Information'}
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
          {/* Form Fields */}
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ values, errors, touched, handleSubmit: formikHandleSubmit, isValid, dirty, isSubmitting, setFieldValue }) => (
              <View className="space-y-6">
                {/* Basic Information */}
                <SectionCard accentColor={PRIMARY} icon="📋" title="Basic Information" subtitle="Tell us about the Product">

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
                    }}
                    error={errors.category as string}
                    touched={touched.category as boolean}
                  />

                  {/* Product Name */}
                  <FormikInput
                    name="name"
                    label="Product Name"
                    placeholder="e.g., Brake Pads, Engine Oil Filter, Spark Plugs"
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

                {/* Vehicle Compatibility - Dropdown Style */}
                <SectionCard accentColor={PRIMARY} icon="🚗" title="Compatible Vehicles" subtitle="Select makes and Models">
                  <View className="flex-row items-center justify-end mb-4">
                    <TouchableOpacity
                      onPress={addVehicleCompatibility}
                      disabled={makesLoading}
                      className="bg-primary-500 px-4 py-2 rounded-[.4rem]"
                      style={{ opacity: makesLoading ? 0.5 : 1 }}
                    >
                      <Text className="text-white text-sm font-NunitoBold">+ Add Make</Text>
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
                    <View className="space-y-3 ">
                      {vehicleCompatibility.map((vc, index) => {
                        const selectedMake = getSelectedMake(index);

                        return (
                          <View key={index} className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
                            {/* Make Dropdown */}
                            <View className="mb-3">
                              <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-sm font-NunitoMedium text-gray-700">Make</Text>
                                <TouchableOpacity
                                  onPress={() => removeVehicleCompatibility(index)}
                                >
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
                                value={vc.make.toString()}
                                onValueChange={(value) => updateVehicleMake(index, parseInt(value))}
                                error=""
                                touched={false}
                              />
                            </View>

                            {/* Models Multi-Select Bottom Sheet */}
                            {selectedMake && selectedMake.models && selectedMake.models.length > 0 && (
                              <MultiSelectBottomSheet
                                label={`Select Models for ${selectedMake.name}`}
                                placeholder="Select models..."
                                options={selectedMake.models.map(model => ({
                                  label: model.name,
                                  value: model.id
                                }))}
                                selectedValues={vc.models}
                                onValuesChange={(values) => updateVehicleModels(index, values)}
                              />
                            )}
                          </View>
                        );
                      })}

                      {/* Add More Button */}
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
                  accentColor={PRIMARY} 
                  icon="📝" 
                  title="Description" 
                  subtitle="Provide details about the Product"
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
                    placeholder="e.g., High-quality brake pads compatible with multiple Toyota and Honda models. Includes installation hardware."
                    numberOfLines={5}
                    maxLength={500}
                    helperText="Describe the spare part's features, compatibility, and condition"
                  />
                </SectionCard>

                {/* Pricing & Availability */}
                <SectionCard accentColor={PRIMARY} icon="💰" title="Pricing & Availability" subtitle="Set your Price and Stock">
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
                    title={isEditMode ? "Update Product Details" : "Continue to Images"}
                    type="submit"
                    onPress={formikHandleSubmit}
                    disabled={!isValid || !dirty || isSubmitting}
                    loading={isSubmitting}
                    loadingText="Processing"
                    className="mb-3"
                  />
                  <Text className="text-xs text-gray-500 text-center font-NunitoMedium">
                    {isEditMode
                      ? "Your Product Details will be Updated"
                      : "Next: Upload Product Images to Complete your Listing"
                    }
                  </Text>
                </View>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default UploadSparePart