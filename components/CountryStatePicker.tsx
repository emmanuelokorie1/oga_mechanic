import React, { useState, useMemo, useCallback, memo, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native'
import { ChevronDownIcon, XMarkIcon, CheckCircleIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline'
import { Country, CountryCode } from 'react-native-country-picker-modal'
import { getStatesByCountry, COUNTRIES } from '@/constants/locationData'

interface CountryStatePickerProps {
  selectedCountry: Country | null
  selectedState: string
  onCountryChange: (country: Country) => void
  onStateChange: (state: string) => void
  showCountryPicker?: boolean
  showStatePicker?: boolean
  onCountryPickerToggle?: (show: boolean) => void
  onStatePickerToggle?: (show: boolean) => void
}

const CountryStatePicker: React.FC<CountryStatePickerProps> = ({
  selectedCountry,
  selectedState,
  onCountryChange,
  onStateChange,
  showCountryPicker = false,
  showStatePicker = false,
  onCountryPickerToggle,
  onStatePickerToggle
}) => {
  const [localShowCountryPicker, setLocalShowCountryPicker] = useState(false)
  const [localShowStatePicker, setLocalShowStatePicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  const isControlled = onCountryPickerToggle !== undefined && onStatePickerToggle !== undefined

  const showCountry = isControlled ? showCountryPicker : localShowCountryPicker
  const showState = isControlled ? showStatePicker : localShowStatePicker

  const setShowCountry = (show: boolean) => {
    if (isControlled) {
      onCountryPickerToggle?.(show)
    } else {
      setLocalShowCountryPicker(show)
    }
  }

  const setShowState = (show: boolean) => {
    if (isControlled) {
      onStatePickerToggle?.(show)
    } else {
      setLocalShowStatePicker(show)
    }
  }

  // Get countries list from our lightweight data
  const countries = useMemo(() => {
    return COUNTRIES
  }, [])

  const filteredCountries = useMemo(() => {
    if (!debouncedSearchQuery) return countries.slice(0, 20) // Limit initial load for better performance
    return countries.filter((country: any) => 
      country.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      country.cca2.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    )
  }, [countries, debouncedSearchQuery])

  // Get states from our lightweight data
  const states = useMemo(() => {
    if (!selectedCountry) {
      return []
    }

    // Use our lightweight data first
    const countryStates = getStatesByCountry(selectedCountry.cca2)
    if (countryStates.length > 0) {
      return countryStates.map(state => state.name)
    }
    
    // Fallback for Nigeria if package fails
    if (selectedCountry.cca2 === 'NG') {
      return [
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
        'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
        'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
        'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
      ]
    }

    // Fallback for other countries
    
    // US States
    if (selectedCountry.cca2 === 'US') {
      return [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
        'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
        'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
        'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
        'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
        'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
      ]
    }

    // UK Countries/Regions
    if (selectedCountry.cca2 === 'GB') {
      return [
        'England', 'Scotland', 'Wales', 'Northern Ireland'
      ]
    }

    // Canada Provinces
    if (selectedCountry.cca2 === 'CA') {
      return [
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
        'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
        'Quebec', 'Saskatchewan', 'Yukon'
      ]
    }

    // Australia States
    if (selectedCountry.cca2 === 'AU') {
      return [
        'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
        'Tasmania', 'Australian Capital Territory', 'Northern Territory'
      ]
    }

    // Germany States
    if (selectedCountry.cca2 === 'DE') {
      return [
        'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse',
        'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate',
        'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
      ]
    }

    // France Regions
    if (selectedCountry.cca2 === 'FR') {
      return [
        'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire',
        'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine',
        'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
      ]
    }

    // Generic fallback for any country
    return [
      'Central Region', 'Northern Region', 'Southern Region', 'Eastern Region', 'Western Region',
      'Capital Region', 'Metropolitan Area', 'Province', 'State', 'Territory'
    ]
  }, [selectedCountry])

  const filteredStates = useMemo(() => {
    if (!debouncedSearchQuery) return states.slice(0, 20) // Limit initial load for better performance
    return states.filter((state: string) => 
      state.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    )
  }, [states, debouncedSearchQuery])

  const handleCountrySelect = useCallback((country: any) => {
    onCountryChange(country)
    onStateChange('') // Reset state when country changes
    setShowCountry(false)
    setSearchQuery('')
  }, [onCountryChange, onStateChange, setShowCountry])

  const handleStateSelect = useCallback((state: string) => {
    onStateChange(state)
    setShowState(false)
    setSearchQuery('')
  }, [onStateChange, setShowState])

  return (
    <>
      {/* Country Picker Modal */}
      <Modal
        visible={showCountry}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountry(false)}
      >
        <View className="flex-1 bg-black/30">
          <View className="flex-1 mt-20 bg-white rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountry(false)} className="p-2">
                <XMarkIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="p-6 border-b border-gray-100">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                <MagnifyingGlassIcon size={20} color="gray" />
                <TextInput
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-[14px] font-NunitoMedium text-gray-900"
                />
              </View>
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.cca2}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={10}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCountrySelect(item)}
                  className={`p-4 border-b border-gray-100 ${
                    selectedCountry?.cca2 === item.cca2 ? 'bg-red-50' : ''
                  }`}
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-2xl mr-3">{item.flag}</Text>
                      <View>
                        <Text className="text-base font-medium text-gray-900">{item.name}</Text>
                        <Text className="text-sm text-gray-500">+{item.callingCode[0]}</Text>
                      </View>
                    </View>
                    {selectedCountry?.cca2 === item.cca2 && (
                      <CheckCircleIcon size={24} color="#EF4444" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="p-8 items-center">
                  <Text className="text-gray-500 text-center">
                    No countries found matching "{searchQuery}"
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* State Picker Modal */}
      <Modal
        visible={showState}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowState(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 mt-20 bg-white rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">
                Select State/Province
              </Text>
              <TouchableOpacity onPress={() => setShowState(false)}>
                <XMarkIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="p-6 border-b border-gray-100">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                <MagnifyingGlassIcon size={20} color="gray" />
                <TextInput
                  placeholder="Search states..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-[14px] font-NunitoMedium text-gray-900"
                />
              </View>
            </View>

            {/* State List */}
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={10}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleStateSelect(item)}
                  className={`p-4 border-b border-gray-100 ${
                    selectedState === item ? 'bg-red-50' : ''
                  }`}
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-medium text-gray-900">{item}</Text>
                    {selectedState === item && (
                      <CheckCircleIcon size={24} color="#EF4444" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="p-8 items-center">
                  <Text className="text-gray-500 text-center">
                    {selectedCountry ? `No states found for ${selectedCountry.name} (${states.length} total)` : 'Please select a country first'}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-2">
                    Debug: States array length: {states.length}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  )
}

export default CountryStatePicker
