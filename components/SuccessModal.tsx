
import React, { useEffect, useRef } from "react";
import { View, ScrollView, Animated, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import HeaderAndDescTextCenter from "@/components/HeaderAndDescTextCenter";

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  header: string;
  text: string;
  buttonText: string;
  route?: string;
}

const SuccessModal = ({ 
  visible, 
  onClose, 
  header, 
  text, 
  buttonText, 
  route 
}: SuccessModalProps) => {
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
    if (visible) {
      // Reset animations
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      successIconScale.setValue(0);
      successIconRotation.setValue(0);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(50);
      buttonScale.setValue(0.8);
      buttonOpacity.setValue(0);
      pulseAnimation.setValue(1);

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
    }
  }, [visible]);

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
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Section - Logo */}
          <View className="flex-1 justify-center items-center pb-10">
            <Animated.View
              style={{
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
              }}
            >
              <icons.splash width={180} height={90} />
            </Animated.View>

            {/* Middle Section - Success Content */}
            <View className="justify-center items-center pt-10 px-8">
              {/* Success Icon with animations */}
              <Animated.View
                className="mb-8"
                style={{
                  transform: [
                    {
                      scale: Animated.multiply(successIconScale, pulseAnimation),
                    },
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
                  header={header}
                  text1={text}
                  containerStyle="!px-0 !mx-0"
                  headerStyle="!font-NunitoExtraBold text-gray-800 mb-2 !text-[1.6rem] !mx-0"
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
                title={buttonText}
                className="py-4"
                onPress={() => {
                  if (route) {
                    router.replace(route as any);
                  } else {
                    onClose();
                  }
                }}
              />
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default SuccessModal;
