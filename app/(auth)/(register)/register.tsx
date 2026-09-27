import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import { Formik } from "formik";
import { router } from "expo-router";
import HeaderAndDescTextCenter from "@/components/HeaderAndDescTextCenter";
import AuthNavigateLink from "@/components/AuthNavigateLink";
import { routes } from "@/constants/routes";
import FormikInput from "@/components/forms/FormikInput";
import FormikButton from "@/components/forms/FormikButton";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import CustomAlert from "@/components/CustomAlert";
import { userAPI, DirectRegisterRequest } from "@/lib/api/user";
import * as Yup from "yup";
import { StatusBar } from "expo-status-bar";
import { formatPhoneNumber } from "@/utils/phoneUtils";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

const GoogleLogoSvg = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// Validation schema
const registerSchema = Yup.object().shape({
  first_name: Yup.string()
    .min(2, "First name must be at least 2 characters")
    .required("First name is required"),
  last_name: Yup.string()
    .min(2, "Last name must be at least 2 characters")
    .required("Last name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  phone_number: Yup.string()
    .matches(/^\+?[0-9]{10,14}$/, "Please enter a valid phone number")
    .required("Phone number is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

const Register = () => {
  const { visible, alertConfig, hideAlert, showError, showSuccess } = useCustomAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (values: any, { setSubmitting, setFieldError }: any) => {
    try {
      setIsSubmitting(true);

      // Format phone number to include +234 prefix if missing
      const formattedPhone = formatPhoneNumber(values.phone_number);

      // Prepare registration data
      const registerData: DirectRegisterRequest = {
        email: values.email,
        password: values.password,
        confirm_password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: formattedPhone,
        role: "primary_user", // Default role
      };

      // Call registration API
      const response = await userAPI.directRegister(registerData);

      if (response.status) {
        // Navigate directly to OTP verification page
        router.replace({
          pathname: routes?.verifyEmail as any,
          params: { 
            email: values.email,
            access: response.data?.access,
            refresh: response.data?.refresh,
            user: JSON.stringify(response.data?.user)
          }
        });
      } else {
        showError("Registration Failed", response.message || "Please try again.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      // Extract error message
      let errorMessage = "Registration failed. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        // Set field-specific errors
        if (errors.email) {
          setFieldError("email", errors.email[0]);
          errorMessage = errors.email[0];
        } else if (errors.phone_number) {
          setFieldError("phone_number", errors.phone_number[0]);
          errorMessage = errors.phone_number[0];
        } else if (errors.password) {
          setFieldError("password", errors.password[0]);
          errorMessage = errors.password[0];
        }
      }

      showError("Registration Failed", errorMessage);
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const { signIn: googleSignUp, isNativeAvailable: isGoogleAvailable } = useGoogleSignIn();

  const handleGoogleSignUp = async () => {
    if (!isGoogleAvailable) {
      showError('Coming Soon', 'Google Sign-Up is currently unavailable. Please use a development build.');
      return;
    }
    try {
      const response = await googleSignUp();
      if (response && response.type === 'success') {
        router.replace(routes?.userHome as any);
      }
    } catch (error) {
      console.log('Google Sign-Up Error:', error);
      showError('Sign Up Failed', 'Could not sign up with Google');
    }
  };

  return (
    <KeyboardAwareScrollView extraBottomPadding={20}>
      <StatusBar style="dark" />
      <View className="pt-[4rem]">
        <HeaderAndDescTextCenter
          header="Create Account"
          text1="Sign Up to get Started"
          containerStyle=" !px-1"
        />
      </View>

      <Formik
        initialValues={{
          first_name: "",
          last_name: "",
          email: "",
          phone_number: "",
          password: "",
        }}
        validationSchema={registerSchema}
        onSubmit={handleRegister}
      >
        {() => (
          <View className="px-5">
            {/* Name Fields */}
            <FormikInput
              name="first_name"
              label="First Name"
              placeholder="John"
              containerStyle=""
              required={true}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <FormikInput
              name="last_name"
              label="Last Name"
              placeholder="Doe"
              containerStyle=""
              required={true}
              autoCapitalize="words"
              autoCorrect={false}
            />

             {/* Phone Number Input */}
            <FormikInput
              name="phone_number"
              label="Phone Number"
              placeholder="08000000000"
              containerStyle=""
              type="phone"
              required={true}
              keyboardType="phone-pad"
            />

            {/* Email Input */}
            <FormikInput
              name="email"
              label="Email Address"
              placeholder="johndoe@gmail.com"
              containerStyle=""
              type="email"
              required={true}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password Input */}
            <FormikInput
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
              containerStyle=""
              required={true}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Terms and Conditions */}
            <View className="mb-6 flex-row flex-wrap justify-center items-center">
              <Text className="text-sm text-gray-600 text-center">
                By signing up, you agree to our{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push(routes?.terms as any)}>
                <Text className="text-primary-500 font-NunitoBold text-sm">
                  Terms & Conditions
                </Text>
              </TouchableOpacity>
              <Text className="text-sm text-gray-600 text-center">
                {" "}and{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push(routes?.privacy as any)}>
                <Text className="text-primary-500 font-NunitoBold text-sm">
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>

            <FormikButton
              title={isSubmitting ? "Creating Account..." : "Sign Up"}
              className="mb-6"
              loading={isSubmitting}
              disabled={isSubmitting}
            />

            {/* Divider */}
            <View className="flex-row items-center my-5">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-4 text-gray-500 font-semibold text-sm">Or sign up with</Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {/* Google Sign-Up Button */}
            <TouchableOpacity
              onPress={handleGoogleSignUp}
              className="w-full flex-row items-center justify-center bg-gray-100 py-3.5 px-6 rounded-xl mb-6 active:opacity-90"
              activeOpacity={0.7}
            >
              <GoogleLogoSvg size={20} />
              <Text className="ml-3 font-semibold text-gray-700 text-[1.1rem]">Sign up with Google</Text>
            </TouchableOpacity>

            <AuthNavigateLink
              onPress={() => router?.push(routes?.signIn)}
              text="Already have an account?"
              textLink="Sign In"
              containerClassName="mb-8"
            />
          </View>
        )}
      </Formik>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={hideAlert}
          type={alertConfig.type}
        />
      )}
    </KeyboardAwareScrollView>
  );
};

export default Register;