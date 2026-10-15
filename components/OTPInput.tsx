import { OTPInputProps } from "@/types/type";
import React, { forwardRef, useEffect, useRef, useImperativeHandle } from "react";
import { View, StyleSheet, AppState } from "react-native";
import { OtpInput, OtpInputRef } from "react-native-otp-entry";
import * as Clipboard from 'expo-clipboard';
import { useIsFocused } from 'expo-router/react-navigation';

const OTPInput = forwardRef(({ numberOfDigits, onComplete, countdown, keyboardType = "default", containerStyle, autoFocus = false }: OTPInputProps, ref: React.Ref<OtpInputRef>) => {
  const internalRef = useRef<OtpInputRef>(null);

  useImperativeHandle(ref, () => ({
    clear: () => internalRef.current?.clear(),
    focus: () => internalRef.current?.focus(),
    setValue: (value: string) => internalRef.current?.setValue(value),
    blur: () => internalRef.current?.blur(),
  }));

  const lastPastedCode = useRef<string | null>(null);
  const isFocused = useIsFocused();

  const checkClipboard = async () => {
    if (!isFocused) return;
    try {
      const text = await Clipboard.getStringAsync();
      const length = numberOfDigits || 6;
      // If clipboard has exactly the right length and is alphanumeric, auto-paste it
      if (text && text.length === length && /^[a-zA-Z0-9]+$/.test(text)) {
        const upperText = text.toUpperCase();
        // Prevent infinite loop by not pasting the same code twice automatically
        if (lastPastedCode.current !== upperText) {
          lastPastedCode.current = upperText;
          internalRef.current?.setValue(upperText);
          
          // We call onComplete manually because programmatic setValue might not trigger onFilled
          onComplete?.(upperText);
        }
      }
    } catch (error) {
      // Ignore clipboard errors
    }
  };

  useEffect(() => {
    if (isFocused) {
      // Check clipboard on focus or mount
      checkClipboard();
    }
    
    // Also check when app comes to foreground (e.g. user went to email app to copy code and came back)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isFocused) {
        checkClipboard();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [numberOfDigits, isFocused]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <OtpInput
        ref={internalRef}
        numberOfDigits={numberOfDigits || 6}
        focusColor="#FFBFC2"
        autoFocus={autoFocus}
        hideStick={true}
        placeholder=""
        blurOnFilled={true}
        type="alphanumeric"
        secureTextEntry={false}
        focusStickBlinkingDuration={500}
        onFilled={(text) => onComplete?.(text)}
        textInputProps={{
          accessibilityLabel: "One-Time Password",
          keyboardType: keyboardType,
          autoCapitalize: "characters",
        }}
        theme={{
          containerStyle: styles.otpContainer,
          pinCodeContainerStyle: styles.pinCodeContainer,
          pinCodeTextStyle: styles.pinCodeText,
          focusStickStyle: styles.focusStick,
          focusedPinCodeContainerStyle: styles.activePinCodeContainer,
          placeholderTextStyle: styles.placeholderText,
          filledPinCodeContainerStyle: styles.filledPinCodeContainer,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 12,
    width: "100%",
  },
  otpContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pinCodeContainer: {
    width: 44,
    height: 48,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 1,
  },
  pinCodeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  focusStick: {
    backgroundColor: "#FFBFC2",
  },
  activePinCodeContainer: {
    borderColor: "#D30309",
    borderWidth: 2,
    backgroundColor: "#FFF5F5",
  },
  placeholderText: {
    color: "#ccc",
  },
  filledPinCodeContainer: {
    borderColor: "#D30309",
    borderWidth: 1.5,
  },
});

export default OTPInput;
