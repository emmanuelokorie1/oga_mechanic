import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, Animated, Platform, ScrollView, TextInput, Image, StyleSheet } from 'react-native'
import { ChevronDownIcon, CheckIcon, MagnifyingGlassIcon, XMarkIcon } from 'react-native-heroicons/outline'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import AndroidNavBarSpacer from '../AndroidNavBarSpacer'

interface SelectOption {
  label: string
  value: string
  /** Optional row thumbnail (e.g. saved vehicle photo) */
  imageUri?: string | null
}

interface SelectFieldProps {
  name: string
  label: string
  placeholder?: string
  options: SelectOption[]
  value: string
  onValueChange?: (value: string) => void
  error?: any
  touched?: any
  required?: boolean
  disabled?: boolean
}

const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  placeholder = "Select option",
  options,
  value,
  onValueChange,
  error,
  touched,
  required = false,
  disabled = false
}) => {
  const [showDrawer, setShowDrawer] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const animatedValue = useRef(new Animated.Value(0)).current
  const pressAnim = useRef(new Animated.Value(1)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const selectedOption = options.find(option => option.value === value)
  const hasError = touched && error

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  const borderColors = useMemo(
    () => ({
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
    }),
    [hasError]
  )

  const handleFocus = useCallback(() => {
    if (!isFocused) {
      setIsFocused(true)
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start()
    }
  }, [isFocused, animatedValue])

  const handleBlur = useCallback(() => {
    if (isFocused) {
      setIsFocused(false)
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start()
    }
  }, [isFocused, animatedValue])

  // Border color interpolation
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.default, borderColors.focused],
  })

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.98,
      useNativeDriver: false,
    }).start()
  }

  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: false,
    }).start()
  }

  const handleSelect = (optionValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onValueChange) {
      onValueChange(optionValue)
    }
    setShowDrawer(false)
    setSearchQuery('')
    handleBlur()
  }

  const openDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    handleFocus()
    setSearchQuery('')
    setShowDrawer(true)
  }

  const closeDrawer = () => {
    setShowDrawer(false)
    setSearchQuery('')
    handleBlur()
  }

  return (
    <View className="mb-5 w-full">
      {/* Label */}
      {label && (
        <Text className="text-base font-NunitoSemiBold text-gray-700 mb-2">
          {label}
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </Text>
      )}

      {/* Select Container */}
      <Animated.View
        className="bg-gray-50 rounded-xl"
        style={{
          transform: [{ scale: pressAnim }],
          borderColor: borderColor,
          borderWidth: 1,
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
        <TouchableOpacity 
          onPress={openDrawer}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={disabled}
          activeOpacity={1}
          className={`flex-row items-center justify-between px-4 py-3.5 ${disabled ? "opacity-50" : ""}`}
        >
          <View className="flex-row items-center flex-1 min-w-0">
            {selectedOption?.imageUri ? (
              <View className="w-9 h-9 rounded-full mr-3 bg-gray-100 overflow-hidden border border-gray-100">
                <Image
                  source={{ uri: selectedOption.imageUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ) : (
                <View className={`w-2 h-2 rounded-full mr-3 ${selectedOption ? 'bg-primary-500' : 'bg-gray-300'}`} />
            )}
            <Text
              className={`text-[16px] font-NunitoSemiBold flex-1 ${selectedOption ? "text-gray-900" : "text-gray-400"}`}
              numberOfLines={1}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </Text>
          </View>
          <View className="bg-gray-50 p-1.5 rounded-lg">
            <ChevronDownIcon size={16} color={isFocused ? "#D30309" : "#9CA3AF"} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Error Message */}
      {hasError && (
        <Animated.View className="flex-row items-center mt-2 ml-1">
          <Text className="text-[13px] font-NunitoMedium text-red-500">
            {error}
          </Text>
        </Animated.View>
      )}

      {/* Bottom Drawer Modal */}
      <Modal
        visible={showDrawer}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDrawer}
      >
        <Pressable 
          className="flex-1 justify-end bg-black/50"
          onPress={closeDrawer}
        >
          <View 
            className="bg-white rounded-t-[32px]"
            style={{
              height: require('react-native').Dimensions.get('window').height * 0.70,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
            <Pressable className="flex-1">
              {/* Drag Handle */}
              <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mt-3 mb-2" />
              
              <View className="px-6 pt-2 pb-4">
                <View className="flex-row items-center justify-between mb-5">
                  <View>
                    <Text className="text-2xl font-NunitoExtraBold text-gray-900">
                      {/^(select|choose)\b/i.test(String(label).trim())
                        ? label
                        : `Select ${label}`}
                    </Text>
                    <Text className="text-sm font-NunitoMedium text-gray-500 mt-0.5">
                      {options.length} options available
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={closeDrawer}
                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <XMarkIcon size={20} color="#374151" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                
                {/* Search Input Container */}
                <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                  <MagnifyingGlassIcon size={20} color="#9CA3AF" strokeWidth={2} />
                  <TextInput
                    placeholder={`Search ${(label || '').toLowerCase()}...`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 ml-3 text-[16px] font-NunitoSemiBold text-gray-900"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <View className="bg-gray-200 rounded-full p-1">
                        <XMarkIcon size={12} color="#4B5563" strokeWidth={3} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                <View className="pt-2">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => {
                      const isSelected = value === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => handleSelect(option.value)}
                          activeOpacity={0.7}
                          className="flex-row items-center justify-between py-4 border-b border-gray-100"
                        >
                          <View className="flex-row items-center flex-1 pr-3">
                            {option.imageUri ? (
                              <View className="w-10 h-10 rounded-xl mr-4 bg-gray-50 overflow-hidden border border-gray-100 p-1">
                                <Image
                                  source={{ uri: option.imageUri }}
                                  className="w-full h-full"
                                  resizeMode="contain"
                                />
                              </View>
                            ) : null}
                            <Text
                              className={`text-[16px] ${isSelected ? 'font-NunitoBold text-primary-600' : 'font-NunitoSemiBold text-gray-800'}`}
                              numberOfLines={1}
                            >
                              {option.label}
                            </Text>
                          </View>
                          {isSelected && (
                            <CheckIcon size={20} color="#D30309" strokeWidth={2.5} />
                          )}
                        </TouchableOpacity>
                      )
                    })
                  ) : (
                    <View className="py-20 items-center justify-center">
                      <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                        <MagnifyingGlassIcon size={40} color="#D1D5DB" strokeWidth={1} />
                      </View>
                      <Text className="text-gray-900 font-NunitoBold text-lg">No Results Found</Text>
                      <Text className="text-gray-500 text-center font-NunitoMedium mt-2 px-10">
                        We couldn't find any {(label || '').toLowerCase()} matching your search.
                      </Text>
                    </View>
                  )}

                  {/* Android Navigation Bar Spacer */}
                  <AndroidNavBarSpacer />
                </View>
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

export default SelectField