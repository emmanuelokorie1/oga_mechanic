"use client"

import { useState, useMemo, forwardRef } from "react"
import { useFormikContext } from "formik"
import InputField from "@/components/InputField"
import InputFieldPassword from "@/components/InputFieldPassword"
import { TextInput } from "react-native"
import type { InputFieldProps } from "@/types/type"

interface FormikInputProps extends InputFieldProps {
  name: string
  type?: string
  secureTextEntry?: boolean
  containerStyle1?: string
}

const FormikInput = forwardRef<TextInput, FormikInputProps>(({ name, type, secureTextEntry, ...props }, ref) => {
  const { values, handleChange, handleBlur, errors, touched, setFieldTouched, setFieldValue } = useFormikContext<{
    [key: string]: any
  }>()

  const isPassword = type === "password" || secureTextEntry
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  // Format number with thousand separators
  const formatNumberWithCommas = (value: string | number): string => {
    if (!value && value !== 0) return ''
    const strValue = value.toString()
    // Split integer and decimal parts so decimals like .00 aren't stripped into extra zeros
    const parts = strValue.split('.')
    const intPart = parts[0].replace(/\D/g, '')
    if (!intPart) return ''
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    if (parts.length > 1 && parts[1] && parts[1] !== '00' && parts[1] !== '0') {
      return `${formattedInt}.${parts[1].replace(/\D/g, '')}`
    }
    return formattedInt
  }

  // Remove commas from formatted number
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '')
  }

  // Check if field should be formatted with thousand separators
  const shouldFormatNumber = (fieldName: string) => {
    return fieldName === 'mileage' || fieldName === 'price'
  }

  // Enhanced blur handler to ensure proper state management
  const handleFieldBlur = () => {
    handleBlur(name)
  }

  // Enhanced change handler to mark field as touched when user starts typing
  const handleFieldChange = (text: string) => {
    // Mark field as touched when user starts typing
    if (!touched[name]) {
      setFieldTouched(name, true, false)
    }

    // Handle formatting for numeric fields with thousand separators
    if (shouldFormatNumber(name)) {
      // Remove commas and non-numeric characters
      const numericValue = removeCommas(text)
      // Store the unformatted number in Formik
      setFieldValue(name, numericValue)
      return
    }

    // Handle phone number - remove all spaces and trim
    if (type === "phone" || type === "tel") {
      const phoneValue = text.trim().replace(/\s/g, '')
      handleChange(name)(phoneValue)
      return
    }

    // Handle email - trim and convert to lowercase
    if (type === "email") {
      const emailValue = text.trim().toLowerCase()
      handleChange(name)(emailValue)
      return
    }

    // Default behavior for other field types
    handleChange(name)(text)
  }

  // Get display value with formatting if applicable
  const getDisplayValue = () => {
    const value = values[name] || ''
    if (shouldFormatNumber(name) && value) {
      return formatNumberWithCommas(value)
    }
    return value
  }

  // Memoize keyboard type to prevent changes during re-renders
  const keyboardType = useMemo(() => {
    if (type === "email") {
      return "email-address"
    }
    if (type === "phone" || type === "tel") {
      return "phone-pad"
    }
    if (type === "number" || type === "numeric") {
      return "numeric"
    }
    return props.keyboardType || "default"
  }, [type, props.keyboardType])

  // Memoize autoCapitalize to prevent keyboard changes
  const autoCapitalize = useMemo(() => {
    if (type === "email") {
      return "none"
    }
    return props.autoCapitalize || "sentences"
  }, [type, props.autoCapitalize])

  // Memoize autoCorrect to prevent keyboard changes
  const autoCorrect = useMemo(() => {
    if (type === "email" || type === "password") {
      return false
    }
    return props.autoCorrect !== undefined ? props.autoCorrect : true
  }, [type, props.autoCorrect])

  if (isPassword) {
    return (
      <InputFieldPassword
        ref={ref}
        value={getDisplayValue()}
        onChangeText={handleFieldChange}
        onBlur={handleFieldBlur}
        error={typeof errors[name] === "string" && touched[name] ? errors[name] : undefined}
        touched={typeof touched[name] === "boolean" ? touched[name] : undefined}
        secureTextEntry={!isPasswordVisible}
        isPasswordVisible={isPasswordVisible}
        setIsPasswordVisible={setIsPasswordVisible}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        {...props}
      />
    )
  }

  return (
    <InputField
      ref={ref}
      value={getDisplayValue()}
      onChangeText={handleFieldChange}
      onBlur={handleFieldBlur}
      error={typeof errors[name] === "string" && touched[name] ? errors[name] : undefined}
      touched={typeof touched[name] === "boolean" ? touched[name] : undefined}
      leftIcon={props.icon}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      containerStyle1={props.containerStyle1}
      {...props}
    />
  )
})

export default FormikInput
