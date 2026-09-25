
import { View, ScrollView, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import HeaderAndDescTextCenter from "@/components/HeaderAndDescTextCenter";
import { routes } from "@/constants/routes";

// const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ResetPasswordSucessful = () => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const successIconScale = useRef(new Animated.Value(0)).current;
  const successIconRotation = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the animation sequence
    const animationSequence = Animated.sequence([
      // 1. Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      // 2. Success icon entrance with rotation
      Animated.parallel([
        Animated.spring(successIconScale, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(successIconRotation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 3. Content fade in and slide up
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // 4. Button entrance
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Start the sequence with a small delay
    setTimeout(() => {
      animationSequence.start(() => {
        // Start pulsing animation for success icon after all animations complete
        startPulseAnimation();
      });
    }, 300);
  }, []);

  const startPulseAnimation = () => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  };

  // Rotation interpolation for success icon
  const rotateInterpolation = successIconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section - Logo */}
        <View className="flex-1 justify-center items-center pt-10">
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}
          >
            <icons.splash width={180} height={90} />
          </Animated.View>
        </View>

        {/* Middle Section - Success Content */}
        <View className="flex-1 justify-center items-center px-8">
          {/* Success Icon with animations */}
          <Animated.View
            className="mb-8"
            style={{
              transform: [
                { scale: Animated.multiply(successIconScale, pulseAnimation) },
                { rotate: rotateInterpolation },
              ],
            }}
          >
            <View
              style={{
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <icons.success />
            </View>
          </Animated.View>

          {/* Success Message */}
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }}
          >
            <HeaderAndDescTextCenter
              header="Password Reset Successful!"
              text1="Your password has been successfully reset. You can now sign in with your new password."
              containerStyle="!px-0"
              headerStyle="font-NunitoExtraBold text-gray-800 mb-4"
              textStyle="text-gray-600 leading-6 text-center"
            />
          </Animated.View>

          {/* Decorative elements */}
          <Animated.View
            className="absolute -top-10 -right-10"
            style={{
              opacity: contentOpacity,
              transform: [{ scale: successIconScale }],
            }}
          >
            <View className="w-20 h-20 bg-green-100 rounded-full opacity-20" />
          </Animated.View>

          <Animated.View
            className="absolute -bottom-10 -left-10"
            style={{
              opacity: contentOpacity,
              transform: [{ scale: successIconScale }],
            }}
          >
            <View className="w-16 h-16 bg-primary-100 rounded-full opacity-20" />
          </Animated.View>
        </View>

        {/* Bottom Section - Action Button */}
        <View className="px-6 pb-8">
          <Animated.View
            style={{
              transform: [{ scale: buttonScale }],
              opacity: buttonOpacity,
            }}
          >
            <CustomButton
              title="Continue to Sign In"
              className="py-4"
              onPress={() => router?.replace(routes?.signIn)}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ResetPasswordSucessful;
