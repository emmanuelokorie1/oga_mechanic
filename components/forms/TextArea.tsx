import React from "react";
import { View, Text, TextInput, TextInputProps, Animated } from "react-native";

interface TextAreaProps extends TextInputProps {
  label?: string;
  placeholder?: string;
  error?: any;
  touched?: any;
  labelStyle?: string;
  required?: boolean;
  rows?: number;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
}

const TextArea = ({
  label,
  placeholder,
  error,
  touched,
  labelStyle = "mb-3",
  required = false,
  rows = 4,
  onFocus,
  onBlur,
  ...props
}: TextAreaProps) => {
  const hasError = error && touched;
  const minHeight = rows * 20; // Approximate height per row

  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = React.useState(false);

  const borderColors = React.useMemo(
    () => ({
      default: hasError ? "#EF4444" : "#E5E7EB",
      focused: hasError ? "#EF4444" : "#F87171",
    }),
    [hasError]
  );

  const handleFocus = React.useCallback(
    (e: any) => {
      if (!isFocused) {
        setIsFocused(true);
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
      if (onFocus) onFocus(e);
    },
    [isFocused, animatedValue, onFocus]
  );

  const handleBlur = React.useCallback(
    (e: any) => {
      if (isFocused) {
        setIsFocused(false);
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }).start();
      }
      if (onBlur) onBlur(e);
    },
    [isFocused, animatedValue, onBlur]
  );

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [borderColors.default, borderColors.focused],
    extrapolate: "clamp",
  });

  return (
    <View className="mb-4 w-full">
      {label && (
        <Text
          className={`text-base font-NunitoSemiBold text-gray-700 mb-2 ${labelStyle}`}
        >
          {label}
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </Text>
      )}

      <Animated.View
        className="flex flex-col bg-gray-50 rounded-xl px-4 py-1"
        style={{
          borderWidth: 1,
          borderColor: borderColor,
          minHeight: minHeight,
        }}
      >
        <TextInput
          multiline
          scrollEnabled={false}
          numberOfLines={rows}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="flex-1 py-3 text-[1.2rem] font-NunitoMedium text-gray-900"
          style={{
            textAlignVertical: 'top',
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>

      {hasError && (
        <Text className="text-red-500 text-sm font-NunitoMedium mt-2 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
};

export default TextArea;
