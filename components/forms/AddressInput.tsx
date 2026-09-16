import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Animated,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
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
          // Get last known position as a fast, silent way to get proximity bias
          const location = await Location.getLastKnownPositionAsync({})
          if (location) {
            setUserCoords({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            })
          }
        }
      } catch (e) {
        // Ignore silent errors
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

  useEffect(() => {
    setInputValue(value ?? '')
    setSearchQuery(value ?? '')
  }, [value])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setFetchError(null)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (!ENV_CONFIG.MAPBOX_ACCESS_TOKEN) {
        setFetchError('Mapbox access token missing. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment.')
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
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return
        }
        setFetchError(err.message || 'Unable to fetch location suggestions.')
        setSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 350)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleLocationPress = useCallback(async () => {
    if (isFetchingCurrentLocation) return

    try {
      setIsFetchingCurrentLocation(true)
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

  const geocodeAddress = useCallback(async (address: string) => {
    if (!address.trim() || !ENV_CONFIG.MAPBOX_ACCESS_TOKEN) {
      return null
    }

    try {
      setIsGeocoding(true)
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

      return null
    } catch (err) {
      console.error('Error geocoding address:', err)
      return null
    } finally {
      setIsGeocoding(false)
    }
  }, [])

  const handleInputFocus = useCallback(
    (e: any) => {
      if (!isFocused) {
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
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
      setShowSuggestions(searchQuery.trim().length > 0)
      onFocusProp?.()
    },
    [isFocused, animatedValue, searchQuery]
  )

  const handleInputBlur = useCallback(
    async (e: any) => {
      if (isFocused) {
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
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
      blurTimeoutRef.current = setTimeout(async () => {
        if (!searchQuery.trim() || suggestions.length === 0) {
          setShowSuggestions(false)
        }

        if (inputValue.trim() && onLocationSelect) {
          const geocodedLocation = await geocodeAddress(inputValue)
          if (geocodedLocation) {
            onLocationSelect(geocodedLocation)
          }
        }

        onBlurProp?.()
      }, 250)
    },
    [isFocused, animatedValue, searchQuery, suggestions.length, inputValue, geocodeAddress, onLocationSelect, onBlurProp]
  )

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.default, borderColors.focused],
    extrapolate: "clamp",
  })

  const handleTextChange = useCallback(
    (text: string) => {
      setInputValue(text)
      setSearchQuery(text)
      setShowSuggestions(text.trim().length > 0)
      onChangeText?.(text)

      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }

      if (text.trim().length > 0) {
        geocodeTimeoutRef.current = setTimeout(async () => {
          if (!showSuggestions || suggestions.length === 0) {
            const geocodedLocation = await geocodeAddress(text)
            if (geocodedLocation && onLocationSelect) {
              onLocationSelect(geocodedLocation)
            }
          }
        }, 2000)
      }
    },
    [onChangeText, geocodeAddress, onLocationSelect, showSuggestions, suggestions.length]
  )

  const handleSuggestionSelect = useCallback(
    (suggestion: any) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
      setInputValue(suggestion.address || suggestion.name)
      setSearchQuery(suggestion.address || suggestion.name)
      setShowSuggestions(false)
      onChangeText?.(suggestion.address || suggestion.name)
      onLocationSelect?.(suggestion)
      Keyboard.dismiss()
    },
    [onChangeText, onLocationSelect]
  )

  return (
        <View
          ref={containerRef}
          className={clsx("w-full", containerStyle1, !noMargin && "mb-4")}
        >
          {/* Label */}
          {label && (
            <View className="mb-3 flex-row items-end justify-between">
              <Text className={`text-base font-NunitoSemiBold text-gray-700 ${labelClassName}`}>
                {label}
                {required && <Text className="text-red-500 ml-1">*</Text>}
              </Text>
              {showCurrentLocationButton && (
                <TouchableOpacity
                  onPress={handleLocationPress}
                  disabled={disabled || isFetchingCurrentLocation}
                  className={`flex-row items-center px-4 py-2 rounded-xl ${
                    isFetchingCurrentLocation ? 'bg-gray-100' : 'bg-primary-50'
                  }`}
                  activeOpacity={0.7}
                  style={{
                    shadowColor: '#D30309',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isFetchingCurrentLocation ? 0 : 0.08,
                    shadowRadius: 8,
                    elevation: isFetchingCurrentLocation ? 0 : 2,
                  }}
                >
                  <MapPinIcon size={14} color={isFetchingCurrentLocation ? "#9CA3AF" : "#D30309"} />
                  <Text className={`text-sm font-NunitoBold ml-1.5 ${
                    isFetchingCurrentLocation ? 'text-gray-400' : 'text-primary-600'
                  }`}>
                    {isFetchingCurrentLocation ? 'Searching...' : 'Use current location'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Animated.View
            className={`flex flex-row items-center bg-gray-50 rounded-xl px-4 py-1 ${containerStyle}`}
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
              className={`flex-1 py-3 text-[1.2rem] font-NunitoMedium text-gray-900 ${inputClassName}`}
              style={{ textAlignVertical: 'center' }}
              textBreakStrategy="simple"
              returnKeyType="search"
            />

            <View className="ml-3">
              {isFetchingCurrentLocation ? (
                <ActivityIndicator size="small" color="#D30309" />
              ) : inputValue.length > 0 ? (
                <TouchableOpacity 
                  className={`p-2 rounded-xl bg-gray-50`}
                  onPress={() => {
                    setInputValue('');
                    setSearchQuery('');
                    setShowSuggestions(false);
                    onChangeText?.('');
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                    }
                  }}
                >
                  <XMarkIcon size={20} color="#6B7280" />
                </TouchableOpacity>
              ) : (
                <View className={`p-2 rounded-xl ${isFocused ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <MapPinIcon size={20} color={isFocused ? "#D30309" : "#9CA3AF"} />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Inline suggestions dropdown */}
          {showSuggestions && (
            <View
              className="mt-2 bg-white rounded-[20px] overflow-hidden"
              style={{
                maxHeight: 260,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
                borderWidth: 1,
                borderColor: '#F3F4F6',
              }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {isLoadingSuggestions && (
                  <View className="flex-row items-center gap-3 px-6 py-5 bg-gray-50/50">
                    <ActivityIndicator size="small" color="#D30309" />
                    <Text className="text-sm font-NunitoBold text-gray-400">Searching...</Text>
                  </View>
                )}

                {fetchError && (
                  <View className="px-6 py-4 bg-red-50">
                    <Text className="text-sm font-NunitoBold text-red-500">{fetchError}</Text>
                  </View>
                )}

                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    onPress={() => handleSuggestionSelect(suggestion)}
                    activeOpacity={0.7}
                    className={clsx(
                      "px-6 py-4 flex-row items-center",
                      index !== suggestions.length - 1 && "border-b border-gray-50"
                    )}
                  >
                    <View className="w-10 h-10 rounded-2xl bg-gray-50 items-center justify-center">
                      <MapPinIcon size={20} color="#D30309" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-base font-NunitoBold text-gray-900 leading-tight">
                        {suggestion.name}
                      </Text>
                      <Text className="text-xs font-NunitoMedium text-gray-400 mt-0.5" numberOfLines={1}>
                        {suggestion.address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Error */}
          {hasError && (
            <View className="flex-row items-center mt-1">
              <View className="w-1 h-1 bg-red-500 rounded-full mr-2" />
              <Text className="text-md font-NunitoMedium text-red-500 flex-1">
                {String(error)}
              </Text>
            </View>
          )}
        </View>
  )
}

export default AddressInput