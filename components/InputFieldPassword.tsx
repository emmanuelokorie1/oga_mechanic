
import { useState, useRef, useCallback, forwardRef } from "react";
import {
  TextInput,
  View,
  Text,
  Image,
  Platform,
  TouchableOpacity,
  Animated,
} from "react-native";

import type { InputFieldProps } from "@/types/type";
import { icons } from "@/constants";

const InputFieldPassword = forwardRef<TextInput, InputFieldProps & {
  error?: any;
  touched?: any;
  required?: boolean;
  helperText?: string;
}>(({
  label,
  icon,
  secureTextEntry = false,
  labelStyle,
  containerStyle,
  inputStyle,
  iconStyle,
  placeholder,
  isPasswordVisible,
  setIsPasswordVisible,
  error,
  touched,
  required,
  helperText,
  onBlur,
  onFocus,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Determine if there's an error to show
  const hasError = touched && error;

  const borderColors = useRef({
    default: hasError ? "#EF4444" : "#E5E7EB",
    focused: hasError ? "#EF4444" : "#F87171",
  });

  // Update border colors only when error state changes
  if (borderColors.current.default !== (hasError ? "#EF4444" : "#E5E7EB")) {
    borderColors.current = {
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
    };
  }

  const handleFocus = useCallback(
    (e: any) => {
      if (!isFocused) {
        setIsFocused(true);

        // Cancel any existing animation
        if (animationRef.current) {
          animationRef.current.stop();
        }

        animationRef.current = Animated.timing(animatedValue, {
          toValue: 1,
          duration: 150, // Reduced duration for smoother feel
          useNativeDriver: false,
        });

        animationRef.current.start();
      }

      // Call the original onFocus if provided
      if (onFocus) {
        onFocus(e);
      }
    },
    [isFocused, animatedValue, onFocus]
  );

  const handleBlur = useCallback(
    (e: any) => {
      if (isFocused) {
        setIsFocused(false);

        // Cancel any existing animation
        if (animationRef.current) {
          animationRef.current.stop();
        }

        animationRef.current = Animated.timing(animatedValue, {
          toValue: 0,
          duration: 150, // Reduced duration for smoother feel
          useNativeDriver: false,
        });

        animationRef.current.start();
      }

      // Call the original onBlur if provided
      if (onBlur) {
        onBlur(e);
      }
    },
    [isFocused, animatedValue, onBlur]
  );

  // Stable border color interpolation
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.current.default, borderColors.current.focused],
    extrapolate: "clamp", // Prevent values outside the range
  });

  return (
    <View className="mb-4 w-full">
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
              ref={ref}
              className={`flex-1 py-3 text-[1.2rem] font-NunitoMedium text-gray-900 ${inputStyle}`}
              secureTextEntry={secureTextEntry}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{ color: '#000' }}
              {...props}
            />

            <TouchableOpacity
              onPress={() =>
                setIsPasswordVisible && setIsPasswordVisible(!isPasswordVisible)
              }
              className="mr-4"
            >
              <Image
                source={isPasswordVisible ? icons?.eyeOpen : icons?.eyeClosed}
                className={`w-6 h-6 ml-4 ${iconStyle}`}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Error Message */}
          {hasError && (
            <View className="flex-row items-center">
              <View className="w-1 h-1 bg-red-500 rounded-full mr-2" />
              <Text className="text-md font-NunitoMedium text-red-500 flex-1">
                {error}
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
  );
});

export default InputFieldPassword;
