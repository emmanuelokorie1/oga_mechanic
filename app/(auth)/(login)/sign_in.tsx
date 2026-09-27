import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import { Formik } from "formik";
import { router, useLocalSearchParams } from "expo-router";
import HeaderAndDescTextCenter from "@/components/HeaderAndDescTextCenter";
import AuthNavigateLink from "@/components/AuthNavigateLink";
import * as Yup from "yup";
import { loginSchema } from "@/utils/validationSchemas";
import { routes, sellerRoutes } from "@/constants/routes";
import FormikInput from "@/components/forms/FormikInput";
import FormikButton from "@/components/forms/FormikButton";
import FormikCheckbox from "@/components/forms/FormikCheckbox";
import { LoginCredentials } from "@/lib/api/user";
import { useLogin } from "@/hooks/useLogin";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import CustomAlert from "@/components/CustomAlert";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { ChevronDownIcon } from "react-native-heroicons/outline";
import CountryStatePicker from "@/components/CountryStatePicker";
import { Country } from 'react-native-country-picker-modal';
import { useRoles } from "@/hooks/useRoles";
import { biometricAuth, BiometricType } from "@/utils/biometricAuth";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";

const FaceIdSvg = ({ size = 28, color = "#D30309" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Frame corners */}
    <Path
      d="M 25 10 A 15 15 0 0 0 10 25 L 10 35 M 10 65 L 10 75 A 15 15 0 0 0 25 90 L 35 90 M 65 90 L 75 90 A 15 15 0 0 0 90 75 L 90 65 M 90 35 L 90 25 A 15 15 0 0 0 75 10 L 65 10"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
    />
    {/* Left Eye */}
    <Path
      d="M 38 36 L 38 44"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
    />
    {/* Right Eye */}
    <Path
      d="M 62 36 L 62 44"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
    />
    {/* Nose (Apple-style L-shaped curve) */}
    <Path
      d="M 50 36 L 50 48 C 50 53, 44 53, 44 50"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Smile */}
    <Path
      d="M 41 61 C 41 67, 59 67, 59 61"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

const singleInputLoginSchema = Yup.object().shape({
  identifier: Yup.string()
    .required('Email or Phone number is required')
    .test('email-or-phone', 'Please enter a valid email or phone number', function (value) {
      if (!value) return false;
      const isEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
      const isPhone = /^[+]?[0-9\s\-\(\)]{10,15}$/.test(value);
      return isEmail || isPhone;
    }),
  password: Yup.string()
    .required('Password is required'),
});

let hasAutoPromptedBiometrics = false;

const SignIn = () => {
  const loginMutation = useLogin();
  const { visible, alertConfig, hideAlert, showError, showSuccess } = useCustomAlert();
  const passwordInputRef = useRef<TextInput>(null);

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    cca2: 'NG',
    callingCode: ['234'],
    name: 'Nigeria',
    region: 'Africa',
    subregion: 'Western Africa',
    currency: ['NGN'],
    flag: '🇳🇬'
  });
  const [selectedState, setSelectedState] = useState<string>('');

  const {
    refetch: refetchRoles
  } = useRoles();

  // Get user type from route params (set during registration)
  const params = useLocalSearchParams();
  const userType = params.userType as string;

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [hasBiometricCreds, setHasBiometricCreds] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(BiometricType.FINGERPRINT);
  const [prefilledIdentifier, setPrefilledIdentifier] = useState("");
  const [dormantIdentifier, setDormantIdentifier] = useState("");
  const [throttleMessage, setThrottleMessage] = useState("");

  const parsedName = useMemo(() => {
    if (!prefilledIdentifier) return "";
    if (prefilledIdentifier.includes('@')) {
      const name = prefilledIdentifier.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return prefilledIdentifier;
  }, [prefilledIdentifier]);

  const parsedDormantName = useMemo(() => {
    if (!dormantIdentifier) return "";
    if (dormantIdentifier.includes('@')) {
      const name = dormantIdentifier.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return dormantIdentifier;
  }, [dormantIdentifier]);

  const handleSwitchAccount = async () => {
    await AsyncStorage.setItem('switched_account', 'true');
    setPrefilledIdentifier("");
    router.replace(routes?.welcome as any);
  };

  const handleRestoreAccount = async () => {
    setPrefilledIdentifier(dormantIdentifier);
    setDormantIdentifier("");
    await AsyncStorage.removeItem('switched_account');
    const creds = await biometricAuth.getCredentials();
    if (creds) {
      handleBiometricLogin(creds);
    }
  };

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const isSwitched = await AsyncStorage.getItem('switched_account') === 'true';

        const availability = await biometricAuth.checkAvailability();
        // Supported if hardware is available, even if not yet enrolled
        const isSupported = availability === 'available' || availability === 'not_enrolled';
        setIsBiometricSupported(isSupported);

        const isEnabled = await biometricAuth.isBiometricEnabled();
        setIsBiometricEnabled(isEnabled);

        const creds = await biometricAuth.getCredentials();
        const hasCreds = !!creds;
        setHasBiometricCreds(hasCreds);

        if (creds && creds.loginMethod) {
          const identifier = creds.loginMethod === 'email' ? creds.email : creds.phone_number;
          if (identifier) {
            if (isSwitched) {
              setDormantIdentifier(identifier);
            } else {
              setPrefilledIdentifier(identifier);
            }
          }
        }

        const type = await biometricAuth.getPreferredBiometricType();
        setBiometricType(type);

        // Auto-prompt biometrics if supported, enabled, enrolled, and credentials exist
        if (availability === 'available' && isEnabled && hasCreds && !hasAutoPromptedBiometrics && !isSwitched) {
          hasAutoPromptedBiometrics = true;
          // Small delay so the page transitions are complete and layout is settled
          setTimeout(() => {
            handleBiometricLogin(creds);
          }, 800);
        }
      } catch (error) {
        console.error("Biometric setup check error:", error);
      }
    };

    checkBiometrics();
  }, []);

  const handleBiometricLogin = async (preloadedCreds?: any) => {
    console.log("[Biometric] Starting handleBiometricLogin. preloadedCreds:", preloadedCreds);
    try {
      // 1. Check if enrolled
      const availability = await biometricAuth.checkAvailability();
      console.log("[Biometric] Device availability status:", availability);
      if (availability === 'not_enrolled') {
        showError('Biometric Login', 'Biometrics are not set up on this device. Please register a fingerprint or Face ID in your device settings.');
        return;
      }

      const creds = preloadedCreds || await biometricAuth.getCredentials();
      
      if (!creds) {
        showError('Biometric Login', 'No credentials saved yet. Please sign in manually with "Remember me" checked to enable biometric login.');
        return;
      }

      // Trigger biometric prompt
      const authResult = await biometricAuth.authenticate({
        title: 'Biometric Sign In',
        subtitle: 'Use Face ID / Touch ID to sign in',
        promptMessage: 'Authenticate to access your Oga Mechanic account',
      });
      console.log("[Biometric] Biometric authentication prompt result:", authResult);

      if (authResult.success) {
        // Auto-fill selected country if login method was phone
        if (creds.loginMethod === 'phone' && creds.selectedCountry) {
          setSelectedCountry(creds.selectedCountry);
        }
        setLoginMethod(creds.loginMethod);

        // Call login API
        const loginCredentials: LoginCredentials = {
          password: creds.password,
        };
        if (creds.loginMethod === 'email') {
          loginCredentials.email = creds.email;
        } else {
          loginCredentials.phone_number = creds.phone_number;
        }

        console.log("[Biometric] Mutating login request with credentials:", loginCredentials);
        await AsyncStorage.removeItem('switched_account');
        // useLogin hook handles navigation on success
        loginMutation.mutate(loginCredentials, {
          onError: (error: any) => {
            console.error("[Biometric] Login request error response:", error?.response?.data || error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            let errorMessage = 'Login failed. Please check your credentials.';
            if (error.response?.data?.detail?.includes('throttled')) {
              errorMessage = error.response.data.detail;
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            }
            showError('Biometric Login Failed', errorMessage);
          }
        });
      } else {
        if (authResult.error === 'authentication_failed') {
          console.warn("[Biometric] Biometric authentication failed:", authResult.error);
          
          const isFaceID = biometricType === BiometricType.FACIAL;
          const biometricName = isFaceID ? "Face ID" : "Fingerprint";
          const notRecognizedTitle = isFaceID ? "Face Not Recognised" : "Fingerprint Not Recognised";

          Alert.alert(
            notRecognizedTitle,
            "Try Again",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  console.log("[Biometric] User cancelled after failed attempt.");
                  setTimeout(() => {
                    passwordInputRef.current?.focus();
                  }, 100);
                }
              },
              {
                text: `Try ${biometricName} Again`,
                onPress: () => {
                  console.log(`[Biometric] User retrying ${biometricName}.`);
                  handleBiometricLogin(creds);
                }
              }
            ]
          );
        } else if (authResult.error && !['user_cancel', 'user_fallback'].includes(authResult.error)) {
          console.warn("[Biometric] Biometric error:", authResult.error);
          showError('Authentication Failed', authResult.error);
        } else {
          console.log("[Biometric] Biometric authentication cancelled by user.");
          // Focus password input if user cancels biometric prompt
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 100);
        }
      }
    } catch (error) {
      console.error("[Biometric] Unexpected biometric login exception:", error);
      showError('Biometric Login Error', 'An unexpected error occurred.');
    }
  };

  const { signIn: googleSignIn, isNativeAvailable: isGoogleAvailable } = useGoogleSignIn();

  const handleGoogleSignIn = async () => {
    if (!isGoogleAvailable) {
      showError('Coming Soon', 'Google Sign-In is currently unavailable. Please use a development build.');
      return;
    }
    try {
      const response = await googleSignIn();
      if (response && response.type === 'success') {
        router.replace(routes?.userHome as any);
      }
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      showError('Sign In Failed', 'Could not sign in with Google');
    }
  };

  // Memoize expensive calculations
  const getCountryFlag = useMemo(() => (cca2: string) => {
    const countryCode = cca2?.toUpperCase();
    const flagOffset = 127397;
    return String.fromCodePoint(...countryCode.split('').map(char => char.charCodeAt(0) + flagOffset));
  }, []);

  const getPhoneExample = useMemo(() => (country: any) => {
    if (!country?.callingCode) return 'Enter phone number';
    const examples: { [key: string]: string } = {
      '234': '0906 935 0833',
      '1': '555 123 4567',
      '44': '7700 900000',
      '33': '6 12 34 56 78',
      '49': '151 12345678',
      '81': '90 1234 5678',
      '86': '138 0013 8000',
      '91': '98765 43210'
    };
    const callingCode = Array.isArray(country.callingCode) ? country.callingCode[0] : country.callingCode;
    return examples[callingCode] || 'Enter phone number';
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
  };

  const handleSignIn = async (values: any, { setSubmitting, setFieldError, setFieldValue }: any) => {
    console.log("[SignIn] handleSignIn started. Formik values:", values);
    try {
      const isEmailInput = values.identifier.includes('@');
      const credentials: LoginCredentials = {
        password: values.password,
      };

      if (isEmailInput) {
        credentials.email = values.identifier;
      } else {
        credentials.phone_number = values.identifier;
      }

      // Save biometric credentials BEFORE calling mutate
      // (The useLogin hook navigates away in its own onSuccess,
      //  which unmounts this component before any inline onSuccess runs)
      if (values.rememberMe) {
        const biometricCredentials = {
          loginMethod: isEmailInput ? 'email' : 'phone',
          password: values.password,
          email: isEmailInput ? values.identifier : '',
          phone_number: !isEmailInput ? values.identifier : '',
          selectedCountry,
        };
        console.log("[SignIn] Saving biometric credentials BEFORE mutate:", biometricCredentials);
        await biometricAuth.saveCredentials(biometricCredentials);
        await biometricAuth.enableBiometric();
      } else {
        console.log("[SignIn] rememberMe is false. Clearing biometric credentials...");
        await biometricAuth.clearCredentials();
        await biometricAuth.disableBiometric();
      }

      // Now call login — the useLogin hook will navigate on success
      console.log("[SignIn] Calling loginMutation.mutate...");
      await AsyncStorage.removeItem('switched_account');
      loginMutation.mutate(credentials, {
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          // If login fails, remove the credentials we just saved
          if (values.rememberMe) {
            biometricAuth.clearCredentials();
            biometricAuth.disableBiometric();
          }

          // Clear password on failure for security
          setFieldValue('password', '');
          
          let errorMessage = 'Login failed. Please check your credentials.';
          
          if (error.response?.data?.detail?.includes('throttled')) {
            errorMessage = error.response.data.detail;
            setThrottleMessage(errorMessage);
            // Auto clear throttle message after 7 seconds
            setTimeout(() => setThrottleMessage(""), 7000);
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.data?.errors) {
            const errors = error.response.data.errors;
            if (errors.email) {
              errorMessage = errors.email[0];
            } else if (errors.password) {
              errorMessage = errors.password[0];
            } else if (errors.phone_number) {
              errorMessage = errors.phone_number[0];
            }
          }

          showError('Login Failed', errorMessage);
          setSubmitting(false);
        }
      });

    } catch (error) {
      showError('Login Failed', 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView>
      <View className="flex-1 justify-center py-8">
        <View className="pt-[2rem] mb-6">
          <HeaderAndDescTextCenter
            headerStyle="!text-[24px]"
            containerStyle={"px-2"}
            header={prefilledIdentifier ? `Welcome back, ${parsedName}!` : (userType ? `Sign in as ${userType.charAt(0).toUpperCase() + userType.slice(1)}` : "Jump right back in.")}
            text1={prefilledIdentifier ? "Please enter your password to continue" : (userType ? `Hi, Welcome back ${userType}.` : "Hi, Welcome back.")}
          />
        </View>

        <Formik
          enableReinitialize={true}
          initialValues={{
            identifier: prefilledIdentifier || "",
            password: "",
            rememberMe: true,
          }}
          validationSchema={singleInputLoginSchema}
          onSubmit={handleSignIn}
        >
          {({ values, setFieldValue, errors, touched }) => (
            <View className="px-5">
              {!prefilledIdentifier && (
                <FormikInput
                  name="identifier"
                  label="Email or Phone number"
                  placeholder="Email or phone"
                  containerStyle=""
                  type="email"
                  required={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              {/* Password Input */}
              <FormikInput
                ref={passwordInputRef}
                name="password"
                label="Password"
                placeholder="Enter your password"
                type="password"
                containerStyle=""
                required={true}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View className="flex flex-row justify-end items-center mb-6">
                {/* Forgot Password */}
                <TouchableOpacity
                  onPress={() => router.push(routes?.forgotPassword)}
                >
                  <Text className="font-NunitoSemiBold text-primary-500 text-[1rem]">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <FormikButton
                title={throttleMessage ? "Please wait..." : (loginMutation.isPending ? "Signing In..." : "Sign In")}
                className="mb-6"
                loading={loginMutation.isPending}
                disabled={loginMutation.isPending || !!throttleMessage}
              />
              
              {throttleMessage ? (
                <Text className="text-center text-red-500 mb-4 font-NunitoSemiBold">
                  {throttleMessage}
                </Text>
              ) : null}
              {/* Divider */}
              <View className="flex-row items-center my-5">
                <View className="flex-1 h-[1px] bg-gray-200" />
                <Text className="mx-4 text-gray-500 font-semibold text-sm">Or continue with</Text>
                <View className="flex-1 h-[1px] bg-gray-200" />
              </View>

              {/* Google Sign-In Button */}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                className="w-full flex-row items-center justify-center bg-gray-100 py-3.5 px-6 rounded-xl mb-6 active:opacity-90"
              >
                <GoogleLogoSvg size={20} />
                <Text className="ml-3 font-semibold text-gray-700 text-[1.1rem]">Sign in with Google</Text>
              </TouchableOpacity>

              {prefilledIdentifier ? (
                <AuthNavigateLink
                  onPress={handleSwitchAccount}
                  text={`Not ${parsedName}?`}
                  textLink="Switch account"
                  containerClassName="mb-4"
                  textClassName="text-[1rem]"
                  linkClassName="text-[1rem]"
                />
              ) : dormantIdentifier ? (
                <View>
                  <AuthNavigateLink
                    onPress={() => router?.push(routes?.register)}
                    text="Don't have an account yet?"
                    textLink="Sign Up"
                    containerClassName="mb-6"
                    textClassName="text-[1rem]"
                    linkClassName="text-[1rem]"
                  />
                  <AuthNavigateLink
                    onPress={handleRestoreAccount}
                    text=""
                    textLink={`Continue as ${parsedDormantName}`}
                    containerClassName="mb-6 justify-center"
                    textClassName="text-[1.1rem]"
                    linkClassName="text-[1.1rem] text-primary-500 font-NunitoExtraBold"
                  />
                </View>
              ) : (
                <AuthNavigateLink
                  onPress={() => router?.push(routes?.register)}
                  text="Don't have an account yet?"
                  textLink="Sign Up"
                  containerClassName="mb-4"
                  textClassName="text-[1rem]"
                  linkClassName="text-[1rem]"
                />
              )}

              {isBiometricSupported && prefilledIdentifier && (
                <View className="items-center mt-2 mb-6">
                  <TouchableOpacity
                    onPress={() => handleBiometricLogin()}
                    className="w-[56px] h-[56px] bg-[#D30309]/10 rounded-2xl items-center justify-center border border-[#D30309]/20"
                    disabled={loginMutation.isPending}
                    activeOpacity={0.7}
                  >
                    {biometricType === BiometricType.FACIAL ? (
                      <FaceIdSvg size={28} color="#D30309" />
                    ) : (
                      <MaterialCommunityIcons
                        name="fingerprint"
                        size={28}
                        color="#D30309"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </Formik>
      </View>

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

export default SignIn;