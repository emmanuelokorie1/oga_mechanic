import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useArrivalCodeStore } from '@/stores/arrivalCodeStore';
import { mechanicAPI } from '@/lib/api/mechanic';
import { playGeneralNotificationSound } from '@/utils/sound';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomerArrivalCodeModal: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    isVisible,
    isVerified,
    orderId,
    otpCode,
    mechanicName,
    mechanicPhone,
    mechanicImage,
    vehicleSummary,
    serviceAddress,
    hideArrivalModal,
    dismissOrder,
  } = useArrivalCodeStore();

  const [copied, setCopied] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse effect for live arrival indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Entrance animation & Sound effect
  useEffect(() => {
    if (isVisible) {
      playGeneralNotificationSound();
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      setCopied(false);
      setIsEnlarged(false);
    }
  }, [isVisible]);

  // Active fast-polling while modal is waiting for mechanic verification
  useEffect(() => {
    if (!isVisible || !orderId || isVerified) return;

    let isCancelled = false;

    const checkVerification = async () => {
      try {
        const res = await mechanicAPI.getRepairRequestDetail(orderId);
        if (isCancelled) return;
        const detail = res?.data || res;
        const status = (detail?.status || '').toLowerCase();
        if (detail?.is_otp_verified || status === 'in_progress' || status === 'completed') {
          useArrivalCodeStore.getState().markVerified();
        }
      } catch {
        // Silently catch background polling errors
      }
    };

    const interval = setInterval(checkVerification, 6000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isVisible, orderId, isVerified]);

  // Auto-dismiss when verified
  useEffect(() => {
    if (isVerified) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Instantly refresh user data so background views update to in_progress
      queryClient.invalidateQueries({ queryKey: ['user', 'repair-requests'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['repair-request', String(orderId)] });
      }

      const timer = setTimeout(() => {
        handleDismiss();
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [isVerified, orderId, queryClient]);

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (orderId) {
        dismissOrder(orderId);
      } else {
        hideArrivalModal();
      }
    });
  };

  const handleCopyCode = async () => {
    if (!otpCode) return;
    try {
      await Clipboard.setStringAsync(otpCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleCallMechanic = () => {
    if (!mechanicPhone) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${mechanicPhone}`);
    } catch {}
  };

  const handleChatMechanic = () => {
    handleDismiss();
    router.push({
      pathname: '/(root)/(screens)/(user)/chat-specialist',
      params: { orderId: orderId || undefined },
    } as any);
  };

  if (!isVisible || !otpCode) return null;

  // Format 6 digits
  const cleanCode = String(otpCode).padStart(6, '0').slice(0, 6);
  const firstHalf = cleanCode.slice(0, 3).split('');
  const secondHalf = cleanCode.slice(3, 6).split('');

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Dark Scrim overlay - Tapping dismisses cleanly */}
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* ── Top Header Band ──────────────────────────────────────────── */}
          <View className={`px-6 pt-5 pb-4 rounded-t-[30px] border-b ${isVerified ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <View className="flex-row items-center justify-between mb-3">
              {/* Status Badge */}
              <View className="flex-row items-center">
                <View className={`px-3 py-1 rounded-full flex-row items-center border ${
                  isVerified 
                    ? 'bg-emerald-100/90 border-emerald-300' 
                    : 'bg-emerald-100/80 border-emerald-300/80'
                }`}>
                  <Animated.View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: isVerified ? '#059669' : '#10B981',
                      marginRight: 6,
                      opacity: isVerified ? 1 : pulseAnim,
                    }}
                  />
                  <Text className={`font-NunitoExtraBold text-[11px] uppercase tracking-wider ${
                    isVerified ? 'text-emerald-800' : 'text-emerald-800'
                  }`}>
                    {isVerified ? 'Code Verified' : 'Mechanic Has Arrived'}
                  </Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={handleDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs"
              >
                <Ionicons name="close" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Mechanic Profile Info */}
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-2xl bg-white border border-slate-200 items-center justify-center mr-3 shadow-xs">
                <MaterialCommunityIcons
                  name="account-wrench"
                  size={26}
                  color={isVerified ? '#059669' : '#0F172A'}
                />
              </View>

              <View className="flex-1">
                <Text className="text-[#0F172A] font-NunitoExtraBold text-[17px] leading-5" numberOfLines={1}>
                  {mechanicName || 'Specialist Mechanic'}
                </Text>
                <Text className="text-[#64748B] font-NunitoSemiBold text-[13px] mt-0.5" numberOfLines={1}>
                  {isVerified
                    ? 'Repair started • Work in progress'
                    : 'At your breakdown location • Waiting for code'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Body: Verification PIN Display ───────────────────────────── */}
          <View className="px-6 py-5 items-center">
            {isVerified ? (
              /* Verified Success View */
              <View className="items-center py-4">
                <View className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 items-center justify-center mb-3">
                  <Ionicons name="checkmark-sharp" size={34} color="#059669" />
                </View>
                <Text className="text-[#0F172A] font-NunitoExtraBold text-[19px] mb-1">
                  Arrival Confirmed!
                </Text>
                <Text className="text-slate-500 font-NunitoMedium text-[13px] text-center px-4">
                  The mechanic has verified your code. Inspection and repair have begun.
                </Text>
              </View>
            ) : (
              /* Active Code Presentation */
              <>
                <Text className="text-slate-400 font-NunitoExtraBold text-[11px] tracking-widest uppercase mb-3">
                  Share this code with your mechanic
                </Text>

                {/* 6-Digit Boxes (Grouped in two 3-digit sets for effortless readability) */}
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={handleCopyCode}
                  className="flex-row items-center justify-center my-1"
                >
                  <View className="flex-row gap-2">
                    {firstHalf.map((digit, i) => (
                      <View
                        key={`first-${i}`}
                        style={[
                          styles.digitBox,
                          isEnlarged && styles.digitBoxEnlarged,
                        ]}
                        className="bg-slate-50 border-2 border-slate-200 rounded-xl items-center justify-center shadow-xs"
                      >
                        <Text
                          style={{ fontSize: isEnlarged ? 34 : 26 }}
                          className="font-NunitoExtraBold text-[#0F172A]"
                        >
                          {digit}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Mid Dot Separator */}
                  <View className="w-3 items-center justify-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  </View>

                  <View className="flex-row gap-2">
                    {secondHalf.map((digit, i) => (
                      <View
                        key={`second-${i}`}
                        style={[
                          styles.digitBox,
                          isEnlarged && styles.digitBoxEnlarged,
                        ]}
                        className="bg-slate-50 border-2 border-slate-200 rounded-xl items-center justify-center shadow-xs"
                      >
                        <Text
                          style={{ fontSize: isEnlarged ? 34 : 26 }}
                          className="font-NunitoExtraBold text-[#0F172A]"
                        >
                          {digit}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>

                {/* Copy Chip / Toggle Enlarge */}
                <View className="flex-row items-center justify-center mt-3 gap-3">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleCopyCode}
                    className={`px-3 py-1.5 rounded-full flex-row items-center border ${
                      copied 
                        ? 'bg-emerald-50 border-emerald-300' 
                        : 'bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copied ? '#059669' : '#64748B'}
                      style={{ marginRight: 4 }}
                    />
                    <Text className={`font-NunitoBold text-[12px] ${copied ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {copied ? 'Code Copied!' : 'Tap to Copy'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setIsEnlarged(!isEnlarged);
                    }}
                    className="px-3 py-1.5 rounded-full flex-row items-center border bg-slate-100/80 border-slate-200"
                  >
                    <MaterialCommunityIcons
                      name={isEnlarged ? 'arrow-collapse' : 'arrow-expand'}
                      size={14}
                      color="#64748B"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="font-NunitoBold text-[12px] text-slate-600">
                      {isEnlarged ? 'Standard' : 'Enlarge'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Helpful Instruction Tip */}
                <Text className="text-slate-400 font-NunitoMedium text-[12px] text-center mt-3 leading-4 px-2">
                  Call out this 6-digit code or turn your phone screen towards your mechanic to start the service.
                </Text>
              </>
            )}
          </View>

          {/* ── Footer: Action Controls ──────────────────────────────────── */}
          {isVerified ? (
            <View className="px-6 pb-6 pt-1">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleDismiss}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 flex-row items-center justify-center shadow-md shadow-emerald-700/20 active:bg-emerald-700"
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-NunitoExtraBold text-[15px]">
                  Great, Let's Go
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="px-6 pb-6 pt-1">
              <View className="flex-row items-center gap-3">
                {mechanicPhone && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCallMechanic}
                    className="flex-1 py-3.5 rounded-2xl bg-[#0F172A] flex-row items-center justify-center shadow-md shadow-slate-900/20 active:bg-slate-800"
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text className="text-white font-NunitoExtraBold text-[14px]">
                      Call Mechanic
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleChatMechanic}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex-row items-center justify-center active:bg-slate-200"
                >
                  <Ionicons name="chatbubble-ellipses" size={16} color="#475569" style={{ marginRight: 6 }} />
                  <Text className="text-slate-700 font-NunitoBold text-[14px]">
                    Message
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH - 32, 390),
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: Platform.OS === 'ios' ? 0.28 : 0.45,
    shadowRadius: 28,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  digitBox: {
    width: 44,
    height: 54,
  },
  digitBoxEnlarged: {
    width: 50,
    height: 64,
  },
});

export default CustomerArrivalCodeModal;
