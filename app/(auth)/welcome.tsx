import {
  View,
  Text,
  Dimensions,
  Image,
  Animated,
  type ImageSourcePropType,
  type ImageResizeMode,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { routes } from "@/constants/routes";
import CustomButton from "@/components/CustomButton";
import { images, icons } from "@/constants";
import { useEffect, useRef, useState } from "react";
import React from "react";
import type { ComponentType } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoadingOverlay from "@/components/LoadingOverlay";

type RenderImageProps = {
  source: ImageSourcePropType | ComponentType<any>;
  width: number;
  height: number;
  resizeMode?: ImageResizeMode;
};

const RenderImage = ({
  source,
  width,
  height,
  resizeMode = "cover",
}: RenderImageProps) =>
  typeof source === "function" ? (
    React.createElement(source, { width, height })
  ) : (
    <Image
      source={typeof source === "string" ? { uri: source } : source}
      style={{ width, height }}
      resizeMode={resizeMode}
    />
  );

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Slides for overlays and text
const slides = [
  {
    key: "1",
    header: "EXPERT CAR CARE",
    text: "Book trusted mechanics for reliable diagnostics and quick repairs, anytime, anywhere.",
    source: images.welcomeImg1,
  },
  {
    key: "2",
    header: "GROW YOUR BUSINESS",
    text: "Join our network of verified mechanics. Connect with more clients and boost your earnings.",
    source: images.welcomeImg2,
  },
  {
    key: "3",
    header: "BUY & SELL CARS",
    text: "Discover verified vehicles or list your own. Transparent pricing with no hidden surprises.",
    source: images.welcomeImg3,
  },
  {
    key: "4",
    header: "ALL-IN-ONE AUTO",
    text: "From spare parts to towing services, everything your car needs is just a tap away.",
    source: images.welcomeImg4,
  },
];

const Welcome = () => {
  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const handleSignUp = async () => {
    if (isSigningUp || isSigningIn) return;
    try {
      setIsSigningUp(true);
      await AsyncStorage.setItem('has_seen_welcome', 'true');
      router.replace(routes?.register as any);
    } catch (error) {
      setIsSigningUp(false);
    }
  };

  const handleSignIn = async () => {
    if (isSigningUp || isSigningIn) return;
    try {
      setIsSigningIn(true);
      await AsyncStorage.setItem('has_seen_welcome', 'true');
      router.replace(routes?.signIn as any);
    } catch (error) {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    if (isSigningUp) {
      const timer = setTimeout(() => setIsSigningUp(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSigningUp]);

  useEffect(() => {
    if (isSigningIn) {
      const timer = setTimeout(() => setIsSigningIn(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSigningIn]);

  useEffect(() => {
    // Initial load animations
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Premium, slow auto-slide every 5 seconds
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % slides.length;
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({
            offset: nextIndex * screenWidth,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex-1 bg-[#0F1014]">
      <StatusBar style="light" />

      {/* FULL SCREEN BACKGROUND SLIDER */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={(item) => item.key}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false } // Required false for width/color interpolation
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setActiveIndex(index);
          }}
          renderItem={({ item, index }) => {
            // Parallax Animation
            const inputRange = [
              (index - 1) * screenWidth,
              index * screenWidth,
              (index + 1) * screenWidth,
            ];
            const translateX = scrollX.interpolate({
              inputRange,
              outputRange: [-screenWidth * 0.5, 0, screenWidth * 0.5],
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [1.3, 1.45, 1.3],
            });

            return (
              <View style={{ width: screenWidth, height: screenHeight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Animated.View style={{ transform: [{ translateX }, { scale }, { translateY: -70 }] }}>
                  <RenderImage
                    source={item.source}
                    width={screenWidth}
                    height={screenHeight}
                    resizeMode="cover"
                  />
                </Animated.View>
              </View>
            );
          }}
        />
        {/* Cinematic Vignette/Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(15, 16, 20, 0.2)', 'rgba(15, 16, 20, 0.9)', '#0F1014', '#0F1014']}
          locations={[0, 0.4, 0.65, 0.85, 1]}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView className="flex-1">
        {/* LOGO TOP CENTER */}
        <Animated.View
          style={{
            opacity: logoAnim,
            alignItems: 'center',
            marginTop: 20,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          }}
        >
          <icons.logo width={160} height={60} />
        </Animated.View>

        {/* BOTTOM CONTENT: TEXT & BUTTONS */}
        <Animated.View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            opacity: contentAnim,
            paddingBottom: 10,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          }}
        >
          {/* ANIMATED TEXT OVERLAY */}
          <View style={{ height: 120, justifyContent: 'flex-end', marginBottom: 24 }}>
            {slides.map((item, index) => {
              const inputRange = [
                (index - 1) * screenWidth,
                index * screenWidth,
                (index + 1) * screenWidth,
              ];
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0, 1, 0],
              });
              const translateY = scrollX.interpolate({
                inputRange,
                outputRange: [20, 0, -20],
              });

              return (
                <Animated.View
                  key={item.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity,
                    transform: [{ translateY }],
                    paddingHorizontal: 30,
                    justifyContent: 'flex-end'
                  }}
                  pointerEvents={index === activeIndex ? "auto" : "none"}
                >
                  <Text
                    style={{
                      fontSize: 34,
                      fontFamily: "Nunito-ExtraBold",
                      color: "#FFFFFF",
                      marginBottom: 12,
                      textAlign: "center",
                      lineHeight: 40,
                      textShadowColor: 'rgba(0, 0, 0, 0.5)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 4,
                    }}
                  >
                    {item.header}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Nunito-Medium",
                      color: "#D1D5DB",
                      textAlign: "center",
                      lineHeight: 24,
                    }}
                  >
                    {item.text}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* ANIMATED PAGINATION DOTS */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            {slides.map((_, i) => {
              const inputRange = [
                (i - 1) * screenWidth,
                i * screenWidth,
                (i + 1) * screenWidth,
              ];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              });
              const dotColor = scrollX.interpolate({
                inputRange,
                outputRange: ['#4B5563', '#D30309', '#4B5563'],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={i}
                  style={{
                    width: dotWidth,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 4,
                    backgroundColor: dotColor,
                    opacity: dotOpacity,
                  }}
                />
              );
            })}
          </View>

          {/* BUTTONS */}
          <View style={{ paddingHorizontal: 30 }}>
            <CustomButton
              title={isSigningUp ? "Loading..." : "Get Started"}
              bgVariant="primary"
              textVariant="default"
              className="py-4 mb-3 shadow-lg"
              onPress={handleSignUp}
              disabled={isSigningUp || isSigningIn}
            />
            <CustomButton
              onPress={handleSignIn}
              title={isSigningIn ? "Loading..." : "Log in"}
              bgVariant="outline"
              textVariant="default"
              className="py-4"
              disabled={isSigningUp || isSigningIn}
            />
          </View>
        </Animated.View>
        
        <LoadingOverlay
          visible={isSigningUp || isSigningIn}
          title="Loading..."
          subtitle="Please wait a moment"
        />
      </SafeAreaView>
    </View>
  );
};

export default Welcome;
