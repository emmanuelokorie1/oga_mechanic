import React, { useState, useRef, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, Modal, Platform, Animated } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { CalendarIcon } from 'react-native-heroicons/outline'

interface DateInputProps {
  label?: string
  placeholder?: string
  value?: Date | null
  onDateChange?: (date: Date) => void
  error?: any
  touched?: any
  required?: boolean
  minimumDate?: Date
  maximumDate?: Date
  containerClassName?: string
  labelClassName?: string
  noMargin?: boolean
  dateFormat?: (date: Date) => string
  showTodayButton?: boolean
}

const DateInput: React.FC<DateInputProps> = ({
  label = "Date",
  placeholder = "Select date",
  value = null,
  onDateChange,
  error,
  touched,
  required = false,
  minimumDate,
  maximumDate,
  containerClassName = "",
  labelClassName = "",
  noMargin = false,
  dateFormat,
  showTodayButton = false
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const animatedValue = useRef(new Animated.Value(0)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const hasError = touched && error

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
      if (animationRef.current) animationRef.current.stop()
      animationRef.current = Animated.timing(animatedValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      })
      animationRef.current.start()
    }
  }, [isFocused, animatedValue])

  const handleBlur = useCallback(() => {
    if (isFocused) {
      setIsFocused(false)
      if (animationRef.current) animationRef.current.stop()
      animationRef.current = Animated.timing(animatedValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      })
      animationRef.current.start()
    }
  }, [isFocused, animatedValue])

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.default, borderColors.focused],
    extrapolate: "clamp",
  })

  const openDatePicker = () => {
    handleFocus()
    setShowDatePicker(true)
  }

  const closeDatePicker = () => {
    setShowDatePicker(false)
    handleBlur()
  }

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // On Android the native dialog handles its own dismiss
      closeDatePicker()
      if (_event.type === 'set' && selectedDate) {
        onDateChange?.(selectedDate)
      }
    } else {
      // On iOS, picker is inline in the modal – just update the value
      if (selectedDate) {
        onDateChange?.(selectedDate)
      }
    }
  }

  const handleTodayPress = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    onDateChange?.(today)
  }

  const initialPickerDate = useMemo(() => {
    // Return the actual value without forcing it to min/max bounds
    // This prevents date jumping to today or bounds
    return value || new Date();
  }, [value]);

  const formatDate = (date: Date | null): string => {
    if (!date) return placeholder
    if (dateFormat) return dateFormat(date)
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <View className={`w-full ${containerClassName} ${!noMargin && "mb-4"}`}>
      {/* Label */}
      {label && (
        <View className="mb-2 flex-row items-center justify-between">
          <Text className={`text-base font-NunitoSemiBold text-gray-700 ${labelClassName}`}>
            {label}
            {required && <Text className="text-red-500 ml-1">*</Text>}
          </Text>
          {showTodayButton && (
            <TouchableOpacity onPress={handleTodayPress} activeOpacity={0.7}>
              <Text className="text-md font-NunitoMedium text-gray-800">
                Use Today's Date
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Date Input Field */}
      <Animated.View
        className="flex flex-row items-center bg-gray-50 rounded-xl px-4 py-1"
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
        <TouchableOpacity
          onPress={openDatePicker}
          className="flex-1 flex-row items-center justify-between py-3"
          activeOpacity={0.7}
        >
          <Text className={`text-[1.2rem] font-NunitoMedium ${value ? "text-gray-900" : "text-gray-400"}`}>
            {formatDate(value)}
          </Text>
          <CalendarIcon size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Error Message */}
      {hasError && (
        <View className="flex-row items-center mt-2">
          <View className="w-1 h-1 bg-red-500 rounded-full mr-2" />
          <Text className="text-md font-NunitoMedium text-red-500 flex-1">{error}</Text>
        </View>
      )}

      {/* Android: render picker directly — it opens its own native dialog */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={initialPickerDate}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleDateChange}
        />
      )}

      {/* iOS: slide-up modal with spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={closeDatePicker}
        >
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-NunitoBold text-gray-900">
                  {label || 'Select Date'}
                </Text>
                <TouchableOpacity onPress={closeDatePicker}>
                  <Text className="text-primary-500 font-NunitoBold text-base">Done</Text>
                </TouchableOpacity>
              </View>
              <View className="items-center">
                <DateTimePicker
                  value={initialPickerDate}
                  mode="date"
                  display="spinner"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={handleDateChange}
                  style={{ width: 300, height: 200 }}
                  textColor="#000000"
                  themeVariant="light"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

export default DateInput
