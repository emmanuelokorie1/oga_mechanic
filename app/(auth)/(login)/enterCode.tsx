import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import HeaderAndDescTextCenter from "@/components/HeaderAndDescTextCenter";
import { icons } from "@/constants";
import { maskEmail } from "@/utils/emailUtils";
import OTPInput from "@/components/OTPInput";
import { useRouter } from "expo-router";
import BackArrowBtn from "@/components/BackArrowBtn";
import { routes } from "@/constants/routes";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import { useLocalSearchParams } from "expo-router";
import { userAPI } from "@/lib/api/user";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

const EnterCode = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params?.email || "";
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(10); // Initial countdown value

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer); // Cleanup on unmount
    }
  }, [countdown]);

  const handleOtpComplete = async (otp: string | number) => {
    setLoading(true);
    try {
      // Changed to use verifyEmailCode as requested by the provided endpoint spec
      const response = await userAPI.verifyEmailCode(email, otp.toString());
      if (response.status) {
        Toast.show({
          type: 'success',
          text1: 'Email Verified',
          text2: 'Your email has been successfully verified.',
        });

        router.push({
          pathname: routes?.resetPassword as any,
          params: { email, code: otp.toString() }
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: response.message || 'The code you entered is invalid.',
        });
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      const response = await userAPI.resendVerificationCode(email);
      if (response.status) {
        setCountdown(60);
        Toast.show({
          type: 'success',
          text1: 'Code Resent',
          text2: 'Check your email for the new verification code.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Resend Failed',
          text2: response.message || 'Could not resend the code.',
        });
      }
    } catch (error: any) {
      console.error('Resend code error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 60,
        }}
        extraScrollHeight={Platform.OS === 'ios' ? 60 : 120}
        extraHeight={Platform.OS === 'ios' ? 80 : 160}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        <View className="pt-[1.5rem]">
          <View className="flex flex-row justify-between w-full py-4">
            <View className="w-fit py-4 ps-2">
              <BackArrowBtn />
            </View>

            <View className="flex-1 flex items-center">
              <HeaderAndDescTextCenter
                header="Enter Code"
                text1="A six-digit OTP code has been sent to your email"
                containerStyle="px-[1rem]"
              />
            </View>

            <View className="w-fit flex items-end ">
              <Text className="text-transparent">GG</Text>
            </View>
          </View>

          <View className="px-5 pt-6">
            <icons.tick1 />

            <Text className="font-NunitoSemiBold text-[19px] pt-5 pb-2">
              Enter the 6-digit code we emailed to your linked address{" "}
              {maskEmail(email || "your-email@gmail.com")}
            </Text>
            <Text className="text-text-100 text-[16px]">
              This helps keep your account safe by verifying it's you
            </Text>

            <OTPInput
              numberOfDigits={6}
              onComplete={(otp) => { handleOtpComplete(otp); }}
              countdown={countdown}
            />

            {loading ? (
              <ActivityIndicator size="large" color="#D30309" className="pt-4" />
            ) : (
              <View className="items-center mt-2">
                <Text className="pt-2 pb-3 text-[15px] text-gray-600">Didn't receive OTP?</Text>
                {countdown > 0 ? (
                  <View className="items-center">
                    <Text className="text-gray-500 text-[14px] font-NunitoMedium mb-2">
                      {`Resend Code (${countdown}s)`}
                    </Text>
                    <TouchableOpacity disabled>
                      <Text className="text-gray-400 text-[16px] font-NunitoSemiBold">
                        Resend Code
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleResendCode} activeOpacity={0.7}>
                    <Text className="text-primary-500 text-[16px] font-NunitoSemiBold">
                      {"Resend Code"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default EnterCode;
