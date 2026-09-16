import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Animated } from 'react-native'
import { useFormikContext } from 'formik'
import CustomAlert from './CustomAlert'
import { useCustomAlert } from '@/hooks/useCustomAlert'
import { IdentificationIcon, CheckCircleIcon, InformationCircleIcon } from 'react-native-heroicons/outline'

interface VINInputProps {
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  value?: string
  onValueChange?: (value: string) => void
  onChangeText?: (text: string) => void
  onVINLookup?: (vin: string, setFieldValue: (field: string, value: any) => void) => void
  showLookupButton?: boolean
}

interface VINInputBaseProps extends VINInputProps {
  formikContext?: any
}

const VINInputBase: React.FC<VINInputBaseProps> = ({
  name,
  label = "Chassis Number (VIN)",
  placeholder = "Enter 17-character VIN",
  required = false,
  value: controlledValue,
  onValueChange,
  onChangeText,
  onVINLookup,
  showLookupButton = false,
  formikContext
}) => {
  const values = formikContext?.values || {};
  const setFieldValue = formikContext?.setFieldValue;
  const errors = formikContext?.errors || {};
  const touched = formikContext?.touched || {};
  const setFieldTouched = formikContext?.setFieldTouched;

  const [localValue, setLocalValue] = useState(
    controlledValue !== undefined 
      ? controlledValue 
      : (name ? (values as Record<string, any>)[name] : '') || ''
  );
  const [isLoading, setIsLoading] = useState(false)
  const [hasLookedUp, setHasLookedUp] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showQuickTip, setShowQuickTip] = useState(false)
  const { visible, alertConfig, hideAlert, showSuccess, showError } = useCustomAlert()

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  // Sync with Formik value if name is provided
  useEffect(() => {
    if (name && values && (values as Record<string, any>)[name] !== undefined) {
      setLocalValue((values as Record<string, any>)[name] || '');
    }
  }, [name, values]);

  const handleChange = (text: string) => {
    setLocalValue(text)
    
    if (name && setFieldValue) {
      setFieldValue(name, text)
    }

    if (onValueChange) {
      onValueChange(text)
    }
    
    // Reset lookup flags if VIN is modified
    setHasLookedUp(false)
    setIsSuccess(false)
    
    // Call the parent onChangeText if provided
    if (onChangeText) {
      onChangeText(text)
    }
  }

  // Auto-trigger VIN lookup when it reaches 17 characters
  useEffect(() => {
    if (localValue.length === 17 && onVINLookup && !hasLookedUp && isValidVIN(localValue)) {
      const timeoutId = setTimeout(() => {
        handleAutoVINLookup()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [localValue, hasLookedUp, onVINLookup])

  // Basic VIN validation
  const isValidVIN = (vin: string): boolean => {
    if (vin.length !== 17) return false
    
    // Check for invalid characters (I, O, Q are not allowed in VINs)
    const invalidChars = /[IOQ]/i
    if (invalidChars.test(vin)) return false
    
    // Check for all same characters (likely invalid)
    if (/^(.)\1{16}$/.test(vin)) return false
    
    return true
  }

  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState(false);

  const hasError = name ? Boolean((errors as Record<string, any>)[name] && (touched as Record<string, any>)[name]) : false;

  const borderColors = React.useMemo(
    () => ({
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
      success: "#10B981"
    }),
    [hasError]
  );

  const handleFocus = () => {
    if (!isFocused) {
      setIsFocused(true);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleBlur = () => {
    if (isFocused) {
      setIsFocused(false);
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
    if (name && setFieldTouched) {
      setFieldTouched(name, true)
    }
  }

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isSuccess ? borderColors.success : borderColors.default, isSuccess ? borderColors.success : borderColors.focused],
    extrapolate: "clamp",
  });

  const handleAutoVINLookup = async () => {
    if (!localValue || localValue.length !== 17) return
    if (!onVINLookup) return
    if (isLoading || hasLookedUp) return

    setIsLoading(true)
    setHasLookedUp(true)
    setIsSuccess(false)
    try {
      await onVINLookup(localValue, setFieldValue || ((field: string, val: any) => {
        if (name && field === name && onValueChange) {
          onValueChange(val);
        }
      }))
      setIsSuccess(true)
    } catch (error) {
      console.error('VIN lookup error:', error)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-NunitoSemiBold text-gray-700 ml-1">
          {label} {required && <Text className="text-red-500">*</Text>}
        </Text>

        <TouchableOpacity 
          onPress={() => setShowQuickTip(!showQuickTip)}
          className="w-6 h-6 items-center justify-center"
        >
          <InformationCircleIcon size={18} color={showQuickTip ? "#111827" : "#9CA3AF"} />
        </TouchableOpacity>
      </View>
      
      <Animated.View 
        className={`flex flex-row items-center rounded-xl px-4 py-1 ${isSuccess ? 'bg-green-50/10' : 'bg-gray-50'}`}
        style={{
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        <TextInput
          value={localValue}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="flex-1 py-3 text-[1.2rem] font-NunitoMedium text-gray-900"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={17}
        />
        <View className="pl-2">
          {isLoading && <ActivityIndicator size="small" color="#111827" />}
          {isSuccess && !isLoading && <CheckCircleIcon size={22} color="#10B981" />}
        </View>
      </Animated.View>

      {name && (errors as Record<string, any>)[name] && (touched as Record<string, any>)[name] && (
        <Text className="text-red-500 text-[10px] font-NunitoBold mt-1.5 ml-1">{(errors as Record<string, any>)[name]}</Text>
      )}

      {showQuickTip && (
        <View className="mt-3 p-4 bg-gray-900 rounded-2xl shadow-lg border border-gray-800">
          <View className="flex-row items-start mb-2">
            <InformationCircleIcon size={16} color="#FFFFFF" className="mt-0.5" />
            <Text className="text-[11px] text-white font-NunitoExtraBold uppercase tracking-wider ml-2">
              Automated Lookup
            </Text>
          </View>
          <Text className="text-[11px] text-gray-400 font-NunitoMedium leading-4">
            Enter your 17-character VIN to automatically load details. You can find it on your dashboard or insurance docs.
          </Text>
        </View>
      )}

      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={hideAlert}
          type={alertConfig.type}
          autoDismiss={alertConfig.autoDismiss}
          autoDismissDelay={alertConfig.autoDismissDelay}
        />
      )}
    </View>
  )
}

const FormikVINInput: React.FC<VINInputProps> = (props) => {
  const formikContext = useFormikContext<Record<string, any>>()
  return <VINInputBase {...props} formikContext={formikContext} />
}

const VINInput: React.FC<VINInputProps> = (props) => {
  // If name is provided and we are not explicitly in controlled mode, use Formik
  if (props.name && props.value === undefined) {
    return <FormikVINInput {...props} />
  }
  return <VINInputBase {...props} />
}

export default VINInput