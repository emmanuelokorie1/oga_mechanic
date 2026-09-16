"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { useFormikContext } from "formik"
import {
  TextInput,
  View,
  Text,
  Platform,
  Animated,
} from "react-native"
import clsx from "clsx"

interface FormikTextAreaProps {
  name: string
  label?: string
  placeholder?: string
  numberOfLines?: number
  maxLength?: number
  containerStyle?: string
  inputStyle?: string
  labelStyle?: string
  required?: boolean
  helperText?: string
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  autoCorrect?: boolean
  noMargin?: boolean
}

function FormikTextArea({
  name,
  label,
  placeholder,
  numberOfLines = 4,
  maxLength,
  containerStyle,
  inputStyle,
  labelStyle,
  required,
  helperText,
  autoCapitalize = "sentences",
  autoCorrect = true,
  noMargin = false,
  ...props
}: FormikTextAreaProps) {
  const { values, handleChange, handleBlur, errors, touched, setFieldTouched } = useFormikContext<{
    [key: string]: any
  }>()

  const [isFocused, setIsFocused] = useState(false)
  const animatedValue = useRef(new Animated.Value(0)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  // Determine if there's an error to show
  const hasError = touched[name] && errors[name]

  // Memoized border colors to prevent recalculation
  const borderColors = useMemo(
    () => ({
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
    }),
    [hasError]
  )

  const handleFocus = useCallback(
    (e: any) => {
      if (!isFocused) {
        setIsFocused(true)

        // Cancel any existing animation
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
    },
    [isFocused, animatedValue]
  )

  const handleInputBlur = useCallback(
    (e: any) => {
      if (isFocused) {
        setIsFocused(false)

        // Cancel any existing animation
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

      handleBlur(name)
    },
    [isFocused, animatedValue, handleBlur, name]
  )

  const handleFieldChange = useCallback(
    (text: string) => {
      // Mark field as touched when user starts typing
      if (!touched[name]) {
        setFieldTouched(name, true, false)
      }
      
      handleChange(name)(text)
    },
    [handleChange, name, touched, setFieldTouched]
  )

  // Stable border color interpolation
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.default, borderColors.focused],
    extrapolate: "clamp",
  })

  const currentLength = values[name]?.length || 0

  return (
    <View className={clsx("w-full", !noMargin && "mb-4", containerStyle)}>
      {/* Label */}
      {label && (
        <Text
          className={`text-base font-NunitoSemiBold text-gray-700 mb-2 ${labelStyle}`}
        >
          {label}
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </Text>
      )}

      {/* Input Container */}
      <Animated.View
        className="bg-gray-50 rounded-xl px-4 py-3"
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
        {/* Text Input */}
        <TextInput
          className={`text-[1.2rem] font-NunitoMedium text-gray-900 ${inputStyle}`}
          value={values[name] || ''}
          onChangeText={handleFieldChange}
          onFocus={handleFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={true}
          numberOfLines={numberOfLines}
          textAlignVertical="top"
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          style={{
            minHeight: numberOfLines * 24, // Approximate line height
            maxHeight: numberOfLines * 48, // Allow some expansion
          }}
          {...props}
        />
      </Animated.View>

      {/* Character Count */}
      {maxLength && (
        <View className="flex-row justify-end mt-1">
          <Text className={`text-sm font-NunitoRegular ${
            currentLength > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400'
          }`}>
            {currentLength}/{maxLength}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {hasError && (
        <View className="flex-row items-center mt-2">
          <View className="w-1 h-1 bg-red-500 rounded-full mr-2" />
          <Text className="text-md font-NunitoMedium text-red-500 flex-1">
            {typeof errors[name] === "string" ? errors[name] : ""}
          </Text>
        </View>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <Text className="text-md font-NunitoRegular text-gray-500 mt-2 ml-1">
          {helperText}
        </Text>
      )}
    </View>
  )
}

export default FormikTextArea
