import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { icons } from "@/constants";
import { maskEmail } from "@/utils/emailUtils";
import OTPInput from "@/components/OTPInput";
import { useRouter, useLocalSearchParams } from "expo-router";
import { routes } from "@/constants/routes";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { userAPI } from "@/lib/api/user";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import CustomAlert from "@/components/CustomAlert";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from "@/stores/userStore";
import { registerPushNotificationsAndSyncDevice } from "@/services/notificationService";

const VerifyEmail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const access = params.access as string;
  const refresh = params.refresh as string;
  const userDataString = params.user as string;
  const { setTokens, setUser } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 minutes = 900 seconds
  const [isResending, setIsResending] = useState(false);
  const { visible, alertConfig, hideAlert, showError, showSuccess } = useCustomAlert();

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer); // Cleanup on unmount
    }
  }, [countdown]);

  // Format countdown to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpComplete = async (otp: string | number) => {
    if (!email) {
      showError("Error", "Email address not found");
      return;
    }

    setLoading(true);

    try {
      const response = await userAPI.verifyEmailCode(email, otp.toString());

      if (response.status) {
        showSuccess("Email Verified!", response.message || "Your email has been verified successfully");
        
        if (access && refresh && userDataString) {
          try {
            let parsedUser = JSON.parse(userDataString);
            
            // Normalize user data to match login response structure
            parsedUser = {
               ...parsedUser,
               active_role: parsedUser.active_role || parsedUser.role,
               is_verified: true, // User successfully verified
               // Ensure consistent fields with login response
               car_make: parsedUser.car_make || null,
               car_model: parsedUser.car_model || null,
               car_year: parsedUser.car_year || null,
               license_plate: parsedUser.license_plate || null,
            };

            await AsyncStorage.setItem('auth_token', access);
            await AsyncStorage.setItem('refresh_token', refresh);
            await AsyncStorage.setItem('user_data', JSON.stringify(parsedUser));
            
            setTokens(access, refresh);
            setUser(parsedUser);

            // Register device for push notifications globally across all roles
            registerPushNotificationsAndSyncDevice(true).catch((pushErr) => {
              console.warn('Push device registration on verify-email warning:', pushErr);
            });
          } catch (e) {
            console.error("Error processing auto-login data", e);
          }
        }

        // Navigate to account created success page
        setTimeout(() => {
          router.replace(routes?.accountCreated as any);
        }, 1500);
      } else {
        showError("Verification Failed", response.message || "Invalid verification code");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      showError(
        "Verification Failed",
        error.response?.data?.message || "Invalid or expired verification code. Please try again."
      );
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      showError("Error", "Email address not found");
      return;
    }

    try {
      setIsResending(true);
      
      const response = await userAPI.resendVerificationCode(email);
      
      if (response.status) {
        showSuccess("Code Sent", response.message || "A new verification code has been sent to your email");
        setCountdown(900); // Reset to 15 minutes
      } else {
        showError("Resend Failed", response.message || "Failed to resend code");
      }
    } catch (error: any) {
      console.error("Resend error:", error);
      showError("Resend Failed", error.response?.data?.message || "Failed to resend verification code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white h-[80vh]">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center items-center px-4">
        <View className="w-full max-w-md">
          <View className="items-start mb-6">
            <icons.tick1 />
          </View>

          <Text className="font-NunitoSemiBold text-[19px] pb-2 text-start">
            Enter the 6-digit code we sent to your email{" "}
            {maskEmail(email || "user@example.com")}
          </Text>
          <Text className="text-text-100 text-[16px] text-start mb-4 mt-2">
            This helps keep your account safe by verifying it's you
          </Text>

          <OTPInput
            numberOfDigits={6}
            onComplete={(otp) => {
              void handleOtpComplete(otp);
            }}
            countdown={countdown}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#D30309" className="pt-4" />
          ) : (
            <View className="items-center">
              <Text className="pt-2 pb-4 text-[15px]">Didn't receive OTP?</Text>
              {countdown > 0 ? (
                <View className="items-center">
                  <Text className="text-gray-500 text-[14px] font-NunitoMedium mb-2">
                    Code expires in {formatTime(countdown)}
                  </Text>
                  <TouchableOpacity disabled>
                    <Text className="text-gray-400 text-[16px] font-NunitoSemiBold">
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
                  <Text className="text-primary-500 text-[16px] font-NunitoSemiBold">
                    {isResending ? "Sending..." : "Resend Code"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={hideAlert}
        />
      )}
    </SafeAreaView>
  );
};

export default VerifyEmail;
