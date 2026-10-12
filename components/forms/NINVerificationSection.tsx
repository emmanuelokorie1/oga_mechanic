import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { CheckCircleIcon, ShieldCheckIcon, ExclamationTriangleIcon } from "react-native-heroicons/solid";
import InputField from "@/components/InputField";

interface NINVerificationSectionProps {
  /** The current value of the NIN input */
  ninValue: string;
  /** Callback when NIN value changes */
  onChangeNIN: (value: string) => void;
  /** Whether the NIN has been officially verified with NIMC */
  isVerified: boolean;
  /** The masked NIN returned by backend (e.g., *******8901) */
  maskedNin?: string;
  /** Formik or validation error string */
  error?: string;
  /** Formik touched state */
  touched?: boolean;
  /** Whether the verification request is in flight */
  isVerifying?: boolean;
  /** Optional callback to trigger instant manual verification */
  onVerifyPress?: () => void;
  /** Verification failure message from real-time API */
  verificationError?: string | null;
  /** Whether to show a separate inline manual verify button (default false for unified 1-click submit) */
  showManualVerifyButton?: boolean;
}

export const NINVerificationSection: React.FC<NINVerificationSectionProps> = ({
  ninValue,
  onChangeNIN,
  isVerified,
  maskedNin,
  error,
  touched,
  isVerifying = false,
  onVerifyPress,
  verificationError,
  showManualVerifyButton = false,
}) => {
  // If the user's NIN is already confirmed by the NIMC database
  if (isVerified) {
    return (
      <View className="mb-5">
        <Text className="text-[13px] font-NunitoBold text-gray-500 uppercase tracking-wider mb-2 ml-1">
          National Identification Number (NIN)
        </Text>
        
        <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3">
                <ShieldCheckIcon size={24} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-NunitoBold text-base tracking-wider">
                  {maskedNin || ninValue || "Verified"}
                </Text>
                <Text className="text-emerald-700 font-NunitoMedium text-xs mt-0.5">
                  Identity confirmed via NIMC records
                </Text>
              </View>
            </View>

            <View className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center">
              <CheckCircleIcon size={14} color="#059669" />
              <Text className="text-emerald-800 font-NunitoBold text-xs ml-1">Verified</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // If NIN is not yet verified, show input
  const canVerifyNow = Boolean(
    showManualVerifyButton && onVerifyPress && ninValue.replace(/\D/g, "").length === 11
  );

  return (
    <View className="mb-5">
      <InputField
        label="NIN Number"
        placeholder="Enter your 11-digit NIN"
        value={ninValue}
        onChangeText={(text) => {
          // Keep only numeric digits and max 11 chars
          const cleaned = text.replace(/\D/g, "").slice(0, 11);
          onChangeNIN(cleaned);
        }}
        keyboardType="numeric"
        maxLength={11}
        error={error}
        touched={touched}
        required
      />

      {/* Manual Verify Now Trigger (Optional, only if showManualVerifyButton is explicitly true) */}
      {canVerifyNow && (
        <View className="mt-2 flex-row justify-end items-center">
          <TouchableOpacity
            onPress={onVerifyPress}
            disabled={isVerifying}
            className="flex-row items-center bg-gray-900 px-4 py-2 rounded-xl"
            activeOpacity={0.8}
          >
            {isVerifying ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-white font-NunitoBold text-xs ml-2">
                  Checking NIMC…
                </Text>
              </>
            ) : (
              <>
                <ShieldCheckIcon size={16} color="#FFFFFF" />
                <Text className="text-white font-NunitoBold text-xs ml-1.5">
                  Verify with NIMC
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Verification Error Alert */}
      {verificationError ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2 flex-row items-start">
          <ExclamationTriangleIcon size={18} color="#DC2626" />
          <View className="ml-2 flex-1">
            <Text className="text-red-900 font-NunitoBold text-xs">Verification Failed</Text>
            <Text className="text-red-700 font-NunitoMedium text-xs mt-0.5">
              {verificationError}
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center mt-1.5 ml-1">
          <ShieldCheckIcon size={14} color="#6B7280" />
          <Text className="text-gray-500 font-NunitoMedium text-[11px] ml-1.5">
            Your NIN is encrypted and only used to confirm your identity.
          </Text>
        </View>
      )}
    </View>
  );
};

export default NINVerificationSection;
