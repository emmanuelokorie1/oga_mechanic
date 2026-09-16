import React, { useState, useRef, useCallback, useMemo, forwardRef } from "react";
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
import clsx from "clsx";

const InputField = forwardRef<TextInput, InputFieldProps & {
  error?: any;
  touched?: any;
  isPasswordVisible?: boolean;
  setIsPasswordVisible?: (value: boolean) => void;
  leftIcon?: any;
  required?: boolean;
  helperText?: string;
  containerStyle1?: string;
  noMargin?: boolean;
}>(({
  label,
  leftIcon,
  icon,
  secureTextEntry = false,
  labelStyle,
  containerStyle,
  containerStyle1,
  inputStyle,
  iconStyle,
  placeholder,
  keyboardType = "default",
  error,
  touched,
  isPasswordVisible,
  setIsPasswordVisible,
  required,
  helperText,
  onBlur,
  onFocus,
  autoCapitalize = "sentences",
  autoCorrect = true,
  noMargin = false,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Determine if there's an error to show
  const hasError = touched && error;

  // Memoized border colors to prevent recalculation
  const borderColors = useMemo(
    () => ({
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
    }),
    [hasError]
  );

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
          duration: 150,
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
          duration: 150,
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
    outputRange: [borderColors.default, borderColors.focused],
    extrapolate: "clamp",
  });

  return (
    <View className={clsx("w-full", containerStyle1, !noMargin && "mb-4")}>
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
            className={`flex ${props.multiline ? 'flex-col' : 'flex-row items-center'} bg-gray-50 rounded-xl px-4 py-1 ${containerStyle}`}
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              minHeight: props.multiline ? 120 : 0,
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
            {/* Left Icon */}
            {leftIcon && !secureTextEntry && !props.multiline && (
              <View className="mr-3">
                <Image
                  source={leftIcon}
                  className={`w-5 h-5 ${iconStyle}`}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Text Input */}
            <TextInput
              ref={ref}
              className={`flex-1 ${props.multiline ? 'py-3 min-h-[100px]' : 'py-3'} text-[1.2rem] font-NunitoMedium text-gray-900 ${inputStyle}`}
              secureTextEntry={secureTextEntry && isPasswordVisible}
              keyboardType={keyboardType}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              textContentType={
                keyboardType === "email-address" ? "emailAddress" : undefined
              }
              textAlign={Platform.OS === 'ios' ? 'left' : undefined}
              // writingDirection={Platform.OS === 'ios' ? 'ltr' : undefined}
              textAlignVertical={props.multiline ? "top" : "center"}
              {...props}
            />

            {/* Right Icon (Password Toggle) */}
            {secureTextEntry &&
              typeof isPasswordVisible === "boolean" &&
              typeof setIsPasswordVisible === "function" &&
              !props.multiline && (
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="ml-3 p-1"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Image
                    source={isPasswordVisible ? icons.eyeOpen : icons.eyeClosed}
                    className={`w-5 h-5 ${iconStyle}`}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}

            {/* Custom Right Icon */}
            {icon && !secureTextEntry && !props.multiline && (
              <View className="ml-3">
                <Image
                  source={icon}
                  className={`w-5 h-5 ${iconStyle}`}
                  resizeMode="contain"
                />
              </View>
            )}
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

export default InputField;
