import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Keyboard, 
  Platform, 
  Animated, 
  ScrollView, 
  ActivityIndicator, 
} from 'react-native'
import { MapPinIcon, XMarkIcon } from 'react-native-heroicons/outline'
import clsx from 'clsx'
import * as Location from 'expo-location'
import { ENV_CONFIG } from '@/config/env'

interface AddressInputProps {
  label?: string
  placeholder?: string
  value?: string
  onChangeText?: (text: string) => void
  onLocationSelect?: (location: any) => void
  error?: any
  touched?: any
  multiline?: boolean
  numberOfLines?: number
  required?: boolean
  disabled?: boolean
  containerClassName?: string
  inputClassName?: string
  labelClassName?: string
  containerStyle?: string
  containerStyle1?: string
  noMargin?: boolean
  scrollViewRef?: React.RefObject<ScrollView>
  showCurrentLocationButton?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

const AddressInput: React.FC<AddressInputProps> = ({
  label = "Address",
  placeholder = "Enter your address",
  value = "",
  onChangeText,
  onLocationSelect,
  error,
  touched,
  multiline = false,
  numberOfLines = 1,
  required = false,
  disabled = false,
  containerClassName = "",
  inputClassName = "",
  labelClassName = "",
  containerStyle = "",
  containerStyle1 = "",
  noMargin = false,
  scrollViewRef,
  showCurrentLocationButton = false,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<TextInput>(null)
  const containerRef = useRef<View>(null)
  const animatedValue = useRef(new Animated.Value(0)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)
  
  const [inputValue, setInputValue] = useState(value ?? '')
  const [searchQuery, setSearchQuery] = useState(value ?? '')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Tracking flags to prevent rogue searches and sticky dropdowns after selection
  const isUserTypingRef = useRef(false)
  const hasSelectedRef = useRef(false)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null)

  useEffect(() => {
    const getInitialLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync()
        if (status === 'granted') {
          const location = await Location.getLastKnownPositionAsync({})
          if (location) {
            setUserCoords({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            })
          }
        }
      } catch (e) {
        // Silent error
      }
    }
    getInitialLocation()
  }, [])

  const hasError = touched && error

  const borderColors = useMemo(
    () => ({
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
    }),
    [hasError]
  )

  // Sync external value changes without triggering autocomplete search
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value ?? '')
      setSearchQuery(value ?? '')
    }
  }, [value])

  // Autocomplete fetch - ONLY runs when user is actively typing
  useEffect(() => {
    // If user didn't type or already picked a value, do not query autocomplete
    if (!isUserTypingRef.current || hasSelectedRef.current || !searchQuery.trim()) {
      if (!searchQuery.trim()) {
        setSuggestions([])
        setFetchError(null)
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
      return
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      const googleApiKey =
        ENV_CONFIG.GOOGLE_MAPS_AUTOCOMPLETE_API_KEY || ENV_CONFIG.GOOGLE_MAPS_API_KEY
      if (!googleApiKey && !ENV_CONFIG.MAPBOX_ACCESS_TOKEN) {
        setFetchError('Location autocomplete service not configured.')
        setSuggestions([])
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsLoadingSuggestions(true)
      setFetchError(null)

      try {
        if (googleApiKey) {
          const searchParams: any = {
            input: searchQuery.trim(),
            key: googleApiKey,
            components: 'country:ng',
            language: 'en',
          }

          if (userCoords) {
            searchParams.location = `${userCoords.latitude},${userCoords.longitude}`
            searchParams.radius = '50000'
          }

          const params = new URLSearchParams(searchParams)
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
            { signal: controller.signal }
          )

          if (!response.ok) {
            throw new Error(`Google Places request failed with status ${response.status}`)
          }

          const data = await response.json()

          // Only apply if user hasn't selected an item in the interim
          if (!hasSelectedRef.current && isUserTypingRef.current) {
            if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
              const mappedSuggestions = (data.predictions || []).map((pred: any) => ({
                id: pred.place_id,
                placeId: pred.place_id,
                name: pred.structured_formatting?.main_text || pred.description,
                address: pred.description || '',
                secondaryText: pred.structured_formatting?.secondary_text || '',
              }))
              setSuggestions(mappedSuggestions)
              setShowSuggestions(mappedSuggestions.length > 0)
            } else {
              if (data.error_message) {
                setFetchError(data.error_message)
              }
              setSuggestions([])
            }
          }
        } else {
          // Mapbox fallback
          const encodedQuery = encodeURIComponent(searchQuery.trim())
          const searchParams: any = {
            access_token: ENV_CONFIG.MAPBOX_ACCESS_TOKEN,
            autocomplete: 'true',
            country: 'ng',
            limit: '6',
            language: 'en',
            types: 'address,place,poi'
          }

          if (userCoords) {
            searchParams.proximity = `${userCoords.longitude},${userCoords.latitude}`
          }

          const params = new URLSearchParams(searchParams)
          const response = await fetch(
            `${ENV_CONFIG.MAPBOX_PLACES_ENDPOINT}/${encodedQuery}.json?${params.toString()}`,
            { signal: controller.signal }
          )

          if (!response.ok) {
            throw new Error(`Mapbox request failed with status ${response.status}`)
          }

          const data = await response.json()
          if (!hasSelectedRef.current && isUserTypingRef.current) {
            const mappedSuggestions =
              data?.features?.map((feature: any) => ({
                id: feature.id,
                name: feature.text || feature.place_name || searchQuery.trim(),
                address: feature.place_name || '',
                latitude: feature.center?.[1],
                longitude: feature.center?.[0],
                placeId: feature.id,
                context: feature.context
              })) ?? []

            setSuggestions(mappedSuggestions)
            setShowSuggestions(mappedSuggestions.length > 0)
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setFetchError(err.message || 'Unable to fetch location suggestions.')
        setSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 320)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [searchQuery, userCoords])

  const handleLocationPress = useCallback(async () => {
    if (isFetchingCurrentLocation) return

    try {
      setIsFetchingCurrentLocation(true)
      hasSelectedRef.current = true
      isUserTypingRef.current = false
      setShowSuggestions(false)
      setSuggestions([])
      Keyboard.dismiss()
      inputRef.current?.blur()

      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to use your current location.'
        )
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      })

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      })

      const addressRecord = reverseGeocode[0]
      const formattedAddress = addressRecord
        ? [
            addressRecord.name || addressRecord.street,
            addressRecord.city,
            addressRecord.region,
            addressRecord.country
          ]
            .filter(Boolean)
            .join(', ')
        : `Lat: ${currentLocation.coords.latitude.toFixed(4)}, Lng: ${currentLocation.coords.longitude.toFixed(4)}`

      setInputValue(formattedAddress)
      setSearchQuery(formattedAddress)
      setShowSuggestions(false)
      setSuggestions([])
      onChangeText?.(formattedAddress)
      onLocationSelect?.({
        name: addressRecord?.name || 'Current Location',
        address: formattedAddress,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        placeId: addressRecord?.postalCode || undefined
      })
    } catch (err) {
      console.error('Error fetching current location:', err)
      Alert.alert(
        'Location Error',
        'Unable to fetch your current location. Please try again.'
      )
    } finally {
      setIsFetchingCurrentLocation(false)
    }
  }, [isFetchingCurrentLocation, onChangeText, onLocationSelect])

  const fetchPlaceDetails = useCallback(async (placeId: string) => {
    const googleApiKey =
      ENV_CONFIG.GOOGLE_MAPS_AUTOCOMPLETE_API_KEY || ENV_CONFIG.GOOGLE_MAPS_API_KEY
    if (!googleApiKey || !placeId) return null

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,name,formatted_address&key=${googleApiKey}`
      const response = await fetch(url)
      const data = await response.json()
      if (data.status === 'OK' && data.result?.geometry?.location) {
        return {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          name: data.result.name,
          address: data.result.formatted_address,
        }
      }
    } catch (err) {
      console.error('Error fetching Google Place details:', err)
    }
    return null
  }, [])

  const geocodeAddress = useCallback(async (address: string) => {
    const googleApiKey =
      ENV_CONFIG.GOOGLE_MAPS_AUTOCOMPLETE_API_KEY || ENV_CONFIG.GOOGLE_MAPS_API_KEY
    if (!address.trim()) {
      return null
    }

    try {
      setIsGeocoding(true)

      if (googleApiKey) {
        const encodedAddress = encodeURIComponent(address.trim())
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&components=country:NG&key=${googleApiKey}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Google Geocoding failed with status ${response.status}`)
        }

        const data = await response.json()
        const result = data?.results?.[0]

        if (result && result.geometry?.location) {
          return {
            id: result.place_id,
            placeId: result.place_id,
            name: result.formatted_address?.split(',')[0] || address.trim(),
            address: result.formatted_address || address.trim(),
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
          }
        }
      } else if (ENV_CONFIG.MAPBOX_ACCESS_TOKEN) {
        const encodedQuery = encodeURIComponent(address.trim())
        const searchParams: any = {
          access_token: ENV_CONFIG.MAPBOX_ACCESS_TOKEN,
          country: 'ng',
          limit: '1',
          types: 'address,place,poi'
        }

        if (userCoords) {
          searchParams.proximity = `${userCoords.longitude},${userCoords.latitude}`
        }

        const params = new URLSearchParams(searchParams)
        const response = await fetch(
          `${ENV_CONFIG.MAPBOX_PLACES_ENDPOINT}/${encodedQuery}.json?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(`Geocoding failed with status ${response.status}`)
        }

        const data = await response.json()
        const feature = data?.features?.[0]

        if (feature && feature.center) {
          return {
            name: feature.text || address.trim(),
            address: feature.place_name || address.trim(),
            latitude: feature.center[1],
            longitude: feature.center[0],
            placeId: feature.id,
            context: feature.context
          }
        }
      }

      return null
    } catch (err) {
      console.error('Error geocoding address:', err)
      return null
    } finally {
      setIsGeocoding(false)
    }
  }, [userCoords])

  const handleInputFocus = useCallback(
    () => {
      setIsFocused(true)

      if (animationRef.current) {
        animationRef.current.stop()
      }

      animationRef.current = Animated.timing(animatedValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      })
      animationRef.current.start()

      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }

      // Crucial fix: Only show suggestions if the user was typing and suggestions exist.
      // If a value was already selected, do NOT pop the dropdown back open!
      if (isUserTypingRef.current && suggestions.length > 0 && !hasSelectedRef.current) {
        setShowSuggestions(true)
      }

      onFocusProp?.()
    },
    [animatedValue, suggestions.length, onFocusProp]
  )

  const handleInputBlur = useCallback(
    () => {
      setIsFocused(false)

      if (animationRef.current) {
        animationRef.current.stop()
      }

      animationRef.current = Animated.timing(animatedValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      })
      animationRef.current.start()

      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }

      // On blur, always dismiss suggestions cleanly after brief delay for taps
      blurTimeoutRef.current = setTimeout(async () => {
        setShowSuggestions(false)

        // Only do fallback geocode if user manually typed and didn't pick from list
        if (
          !hasSelectedRef.current &&
          isUserTypingRef.current &&
          inputValue.trim() &&
          onLocationSelect
        ) {
          const geocodedLocation = await geocodeAddress(inputValue)
          if (geocodedLocation) {
            onLocationSelect(geocodedLocation)
          }
        }

        onBlurProp?.()
      }, 180)
    },
    [animatedValue, inputValue, geocodeAddress, onLocationSelect, onBlurProp]
  )

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.default, borderColors.focused],
    extrapolate: "clamp",
  })

  const handleTextChange = useCallback(
    (text: string) => {
      // User is actively typing
      hasSelectedRef.current = false
      isUserTypingRef.current = true

      setInputValue(text)
      setSearchQuery(text)

      if (text.trim().length === 0) {
        setShowSuggestions(false)
        setSuggestions([])
        setFetchError(null)
      } else {
        setShowSuggestions(true)
      }

      onChangeText?.(text)

      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    },
    [onChangeText]
  )

  const handleSuggestionSelect = useCallback(
    async (suggestion: any) => {
      // 1. Immediately flag that user selected a suggestion
      hasSelectedRef.current = true
      isUserTypingRef.current = false

      // 2. Clear all debounce and blur timers, abort ongoing fetches
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()

      // 3. Immediately close dropdown and wipe suggestions from memory
      setShowSuggestions(false)
      setSuggestions([])
      setFetchError(null)
      setIsLoadingSuggestions(false)

      // 4. Dismiss keyboard & blur TextInput completely
      Keyboard.dismiss()
      inputRef.current?.blur()
      setIsFocused(false)

      // 5. Populate input value cleanly
      const selectedText = suggestion.address || suggestion.name || ''
      setInputValue(selectedText)
      setSearchQuery(selectedText)
      onChangeText?.(selectedText)

      // 6. Resolve coordinates (Place Details or existing lat/lng)
      if (suggestion.latitude && suggestion.longitude) {
        onLocationSelect?.(suggestion)
        return
      }

      if (suggestion.placeId) {
        const details = await fetchPlaceDetails(suggestion.placeId)
        if (details) {
          const fullSuggestion = {
            ...suggestion,
            latitude: details.latitude,
            longitude: details.longitude,
            address: details.address || suggestion.address,
            name: details.name || suggestion.name,
          }
          setInputValue(fullSuggestion.address)
          setSearchQuery(fullSuggestion.address)
          onChangeText?.(fullSuggestion.address)
          onLocationSelect?.(fullSuggestion)
          return
        }
      }

      // Fallback geocoding if place details unavailable
      const geocoded = await geocodeAddress(selectedText)
      if (geocoded) {
        onLocationSelect?.(geocoded)
      } else {
        onLocationSelect?.(suggestion)
      }
    },
    [onChangeText, onLocationSelect, fetchPlaceDetails, geocodeAddress]
  )

  return (
    <View
      ref={containerRef}
      className={clsx("w-full", containerStyle1, !noMargin && "mb-4")}
      style={{
        position: 'relative',
        zIndex: showSuggestions ? 9999 : 1,
        elevation: showSuggestions ? 50 : 0,
      }}
    >
      {/* Label */}
      {label && (
        <View className="mb-2.5 flex-row items-end justify-between">
          <Text className={`text-[15px] font-NunitoBold text-gray-800 ${labelClassName}`}>
            {label}
            {required && <Text className="text-red-500 ml-1">*</Text>}
          </Text>
          {showCurrentLocationButton && (
            <TouchableOpacity
              onPress={handleLocationPress}
              disabled={disabled || isFetchingCurrentLocation}
              className={`flex-row items-center px-3.5 py-1.5 rounded-xl ${
                isFetchingCurrentLocation ? 'bg-gray-100' : 'bg-red-50 border border-red-100'
              }`}
              activeOpacity={0.7}
            >
              <MapPinIcon size={14} color={isFetchingCurrentLocation ? "#9CA3AF" : "#D30309"} />
              <Text className={`text-xs font-NunitoBold ml-1.5 ${
                isFetchingCurrentLocation ? 'text-gray-400' : 'text-[#D30309]'
              }`}>
                {isFetchingCurrentLocation ? 'Searching...' : 'Use current location'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Input & Floating Dropdown Container */}
      <View style={{ position: 'relative', zIndex: showSuggestions ? 9999 : 1 }}>
        <Animated.View
          className={`flex flex-row items-center bg-gray-50 rounded-2xl px-4 py-1 ${containerStyle}`}
          style={{
            borderWidth: 1,
            borderColor: borderColor,
            ...Platform.select({
              ios: {
                shadowColor: "transparent",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
              },
              android: {
                elevation: 0,
              },
            }),
          }}
        >
          <TextInput
            ref={inputRef}
            value={inputValue}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline={false}
            editable={!disabled}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={`flex-1 py-3 text-[14px] font-NunitoMedium text-gray-900 ${inputClassName}`}
            style={{ textAlignVertical: 'center' }}
            textBreakStrategy="simple"
            returnKeyType="search"
          />

          <View className="ml-2.5">
            {isFetchingCurrentLocation ? (
              <ActivityIndicator size="small" color="#D30309" />
            ) : inputValue.length > 0 ? (
              <TouchableOpacity 
                activeOpacity={0.7}
                className="w-7 h-7 rounded-full bg-gray-200/80 items-center justify-center"
                onPress={() => {
                  hasSelectedRef.current = false
                  isUserTypingRef.current = false
                  setInputValue('')
                  setSearchQuery('')
                  setShowSuggestions(false)
                  setSuggestions([])
                  setFetchError(null)
                  onChangeText?.('')
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                  }
                  if (debounceTimeoutRef.current) {
                    clearTimeout(debounceTimeoutRef.current)
                  }
                }}
              >
                <XMarkIcon size={14} color="#4B5563" />
              </TouchableOpacity>
            ) : (
              <View className={`p-2 rounded-xl ${isFocused ? 'bg-red-50' : 'bg-gray-100/60'}`}>
                <MapPinIcon size={18} color={isFocused ? "#D30309" : "#9CA3AF"} />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Floating suggestions dropdown overlay */}
        {showSuggestions && (isLoadingSuggestions || fetchError || suggestions.length > 0) && (
          <View
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 6,
              maxHeight: 260,
              zIndex: 99999,
              elevation: 99,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.14,
              shadowRadius: 20,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
            >
              {isLoadingSuggestions && (
                <View className="flex-row items-center gap-3 px-5 py-3.5 bg-gray-50/60">
                  <ActivityIndicator size="small" color="#D30309" />
                  <Text className="text-xs font-NunitoBold text-gray-500">Searching locations...</Text>
                </View>
              )}

              {fetchError && (
                <View className="px-5 py-3 bg-red-50 border-b border-red-100">
                  <Text className="text-xs font-NunitoBold text-red-500">{fetchError}</Text>
                </View>
              )}

              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.id || `${suggestion.name}-${index}`}
                  onPress={() => handleSuggestionSelect(suggestion)}
                  activeOpacity={0.7}
                  className={clsx(
                    "px-4 py-3 flex-row items-center active:bg-gray-50",
                    index !== suggestions.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <View className="w-8 h-8 rounded-xl bg-red-50 items-center justify-center mr-3 border border-red-100 flex-shrink-0">
                    <MapPinIcon size={16} color="#D30309" />
                  </View>
                  <View className="flex-1 mr-1">
                    <Text className="text-[14px] font-NunitoBold text-gray-900 leading-tight" numberOfLines={1}>
                      {suggestion.name}
                    </Text>
                    {suggestion.address && suggestion.address !== suggestion.name ? (
                      <Text className="text-xs font-NunitoMedium text-gray-400 mt-0.5" numberOfLines={1}>
                        {suggestion.address}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Error */}
      {hasError && (
        <View className="flex-row items-center mt-1.5 ml-1">
          <View className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
          <Text className="text-xs font-NunitoMedium text-red-500 flex-1">
            {String(error)}
          </Text>
        </View>
      )}
    </View>
  )
}

export default AddressInput