import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { playMechanicNotificationSound } from '@/utils/sound';

export interface MechanicRequestItem {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string | number;
  serviceType?: string;
  serviceAddress?: string;
  pickupAddress?: string;
  problemDescription?: string;
  estimatedCost?: string | number | null;
  eta?: string;
  urgency?: string;
  createdAt?: string;
  raw?: any;
}

export interface NewOrderBannerProps {
  /** Single order (kept for backward compatibility) */
  order?: MechanicRequestItem | null;
  /** Queue of multiple orders */
  orders?: MechanicRequestItem[];
  onView: (order: MechanicRequestItem) => void;
  onAccept?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
  onClose: () => void;
  onDismissOrder?: (orderId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const NewOrderBanner: React.FC<NewOrderBannerProps> = ({
  order,
  orders,
  onView,
  onAccept,
  onDecline,
  onClose,
  onDismissOrder,
}) => {
  const insets = useSafeAreaInsets();
  
  // Normalize incoming orders into a list
  const activeOrdersList: MechanicRequestItem[] = React.useMemo(() => {
    if (orders && orders.length > 0) {
      return orders;
    }
    if (order) {
      return [order];
    }
    return [];
  }, [orders, order]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const totalOrders = activeOrdersList.length;

  // Animation values
  const slideAnim = useRef(new Animated.Value(-500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.96)).current;
  const cardSwitchAnim = useRef(new Animated.Value(1)).current;

  // Clamp current index when total orders changes
  useEffect(() => {
    if (currentIndex >= totalOrders && totalOrders > 0) {
      setCurrentIndex(totalOrders - 1);
    }
  }, [totalOrders, currentIndex]);

  // Entrance & Exit animations + sound effect
  useEffect(() => {
    if (totalOrders > 0) {
      // Play crisp dispatch alert sound
      playMechanicNotificationSound();

      // Trigger subtle haptic pattern
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Animate modal in from top
      const targetTop = Platform.OS === 'ios' ? insets.top + 8 : insets.top + 12;

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: targetTop,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out if all orders cleared
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -500,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [totalOrders > 0, insets.top]);

  // Handle navigation between orders
  const handlePrevOrder = () => {
    if (currentIndex > 0) {
      try {
        Haptics.selectionAsync();
      } catch {}
      animateCardTransition(() => setCurrentIndex((prev) => prev - 1));
    }
  };

  const handleNextOrder = () => {
    if (currentIndex < totalOrders - 1) {
      try {
        Haptics.selectionAsync();
      } catch {}
      animateCardTransition(() => setCurrentIndex((prev) => prev + 1));
    }
  };

  const animateCardTransition = (updateState: () => void) => {
    Animated.sequence([
      Animated.timing(cardSwitchAnim, {
        toValue: 0.88,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(cardSwitchAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
    updateState();
  };

  const handleCloseAll = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -500,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleDismissCurrent = (orderId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (totalOrders <= 1) {
      handleCloseAll();
      if (onDismissOrder) onDismissOrder(orderId);
    } else {
      if (onDismissOrder) onDismissOrder(orderId);
      if (currentIndex >= totalOrders - 1) {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const isUuidLike = (val?: string | null): boolean => {
    if (!val) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(val).trim()) || String(val).length >= 26;
  };

  const resolveTargetId = (itemOrId: MechanicRequestItem | string): string => {
    if (!itemOrId) return '';
    if (typeof itemOrId === 'string') {
      if (isUuidLike(itemOrId)) return itemOrId;
      const matched = activeOrdersList.find((o) => o.id === itemOrId || o.orderNumber === itemOrId);
      if (matched) return resolveTargetId(matched);
      return itemOrId;
    }
    const item = itemOrId;
    if (item.raw?.resolvedUuid && isUuidLike(item.raw.resolvedUuid)) return item.raw.resolvedUuid;
    if (isUuidLike(item.id)) return item.id;
    const candidates = [
      item.raw?.repair_request_id,
      item.raw?.related_object_id,
      item.raw?.repair_request,
      item.raw?.data?.repair_request_id,
      item.raw?.data?.related_object_id,
      item.raw?.notification?.related_object_id,
      item.raw?.order_id,
      item.raw?.request_id,
      item.raw?.data?.id,
    ].filter(Boolean);
    const found = candidates.find((c) => isUuidLike(String(c)));
    return found ? String(found) : item.id;
  };

  const handleAcceptOrder = (itemOrId: MechanicRequestItem | string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (onAccept) {
      onAccept(resolveTargetId(itemOrId));
    }
  };

  const handleDeclineOrder = (itemOrId: MechanicRequestItem | string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const targetId = resolveTargetId(itemOrId);
    if (onDecline) {
      onDecline(targetId);
    } else {
      handleDismissCurrent(typeof itemOrId === 'string' ? itemOrId : itemOrId.id);
    }
  };

  const handleViewOrder = (item: MechanicRequestItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const resolvedItem = {
      ...item,
      id: resolveTargetId(item),
    };
    onView(resolvedItem);
  };

  if (totalOrders === 0) return null;

  const currentOrder = activeOrdersList[currentIndex] || activeOrdersList[0];
  if (!currentOrder) return null;

  // Format Vehicle String
  const vehicleParts = [
    currentOrder.vehicleYear,
    currentOrder.vehicleMake,
    currentOrder.vehicleModel,
  ].filter(Boolean);
  const vehicleSummary = vehicleParts.join(' ');

  const orderNumberStr =
    currentOrder.orderNumber ||
    (currentOrder.id?.length > 6 ? currentOrder.id.slice(-5) : currentOrder.id) ||
    '17899';

  return (
    <>
      {/* ── Dark Backdrop Overlay (Modal Experience) ────────────────────────── */}
      <Animated.View
        pointerEvents="auto"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9998,
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={handleCloseAll}
        />
      </Animated.View>

      {/* ── Top-Positioned Modal Card ────────────────────────────────────────── */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 14,
          right: 14,
          zIndex: 9999,
          transform: [{ translateY: slideAnim }, { scale: cardScale }],
        }}
      >
        {/* ── Stacked visual cards illusion for multiple requests ─────────── */}
        {totalOrders > 1 && (
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              left: 12,
              right: 12,
              height: 36,
              backgroundColor: '#E2E8F0',
              borderRadius: 24,
              zIndex: -1,
              opacity: 0.95,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 4,
            }}
          />
        )}
        {totalOrders > 2 && (
          <View
            style={{
              position: 'absolute',
              bottom: -12,
              left: 24,
              right: 24,
              height: 36,
              backgroundColor: '#CBD5E1',
              borderRadius: 24,
              zIndex: -2,
              opacity: 0.8,
              elevation: 2,
            }}
          />
        )}

        {/* ── Main App-Aligned Card Container ─────────────────────────────── */}
        <Animated.View
          style={{
            transform: [{ scale: cardSwitchAnim }],
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: Platform.OS === 'ios' ? 0.16 : 0.28,
            shadowRadius: 24,
            elevation: 16,
          }}
          className="bg-white rounded-[26px] overflow-hidden border border-slate-200/90"
        >
          {/* ── Top Header Section (Clean subtle slate, app logo branded) ──── */}
          <View className="bg-slate-50/90 px-5 pt-3.5 pb-3 border-b border-slate-200/80">
            <View className="flex-row items-center justify-between">
              {/* Left Column: App Logo, Order # and E.T.A */}
              <View className="flex-1 mr-2">
                <View className="flex-row items-center">
                  <Image
                    source={require('@/assets/icons/box_logo.png')}
                    style={{ width: 20, height: 20, borderRadius: 5, marginRight: 7 }}
                    resizeMode="contain"
                  />
                  <Text
                    className="text-[#0F172A] font-NunitoExtraBold text-[18px] tracking-tight"
                    numberOfLines={1}
                  >
                    Order #{orderNumberStr}
                  </Text>
                </View>
                <Text className="text-slate-500 font-NunitoSemiBold text-[12px] mt-0.5 ml-0.5">
                  E.T.A | {currentOrder.eta || 'Immediate • ~12 mins'}
                </Text>
              </View>

              {/* Right Column: Urgency badge & Order Pager */}
              <View className="items-end">
                <View className="bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full flex-row items-center gap-1 mb-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <Text className="text-amber-800 font-NunitoBold text-[11px]">
                    {currentOrder.urgency || 'Pending Request'}
                  </Text>
                </View>

                {/* Single order pill or Interactive multi-request pager */}
                {totalOrders <= 1 ? (
                  <View className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                    <Text className="text-slate-600 font-NunitoBold text-[10.5px]">
                      Single order
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-xs">
                    <TouchableOpacity
                      onPress={handlePrevOrder}
                      disabled={currentIndex === 0}
                      className="p-1"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={13}
                        color={currentIndex === 0 ? '#CBD5E1' : '#475569'}
                      />
                    </TouchableOpacity>

                    <Text className="text-slate-700 font-NunitoExtraBold text-[11px] mx-1">
                      {currentIndex + 1} of {totalOrders}
                    </Text>

                    <TouchableOpacity
                      onPress={handleNextOrder}
                      disabled={currentIndex === totalOrders - 1}
                      className="p-1"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={13}
                        color={currentIndex === totalOrders - 1 ? '#CBD5E1' : '#475569'}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Dismiss X button */}
              <TouchableOpacity
                onPress={() => handleDismissCurrent(currentOrder.id)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center border border-slate-200/80 ml-2 active:bg-slate-200"
              >
                <Ionicons name="close" size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Body: Visual Route & Connection Timeline ───────────────────── */}
          <View className="px-5 pt-3.5 pb-2.5">
            {/* Top Node: Customer & Vehicle */}
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center mr-3">
                <Ionicons name="person" size={16} color="#334155" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[#0F172A] font-NunitoExtraBold text-[15px] leading-5"
                  numberOfLines={1}
                >
                  {currentOrder.customerName || 'Customer Breakdown Request'}
                </Text>
                {vehicleSummary ? (
                  <View className="flex-row items-center mt-1">
                    <View className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md flex-row items-center">
                      <MaterialCommunityIcons name="car" size={13} color="#475569" style={{ marginRight: 4 }} />
                      <Text className="text-slate-700 font-NunitoBold text-[11.5px]" numberOfLines={1}>
                        {vehicleSummary}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text className="text-slate-400 font-NunitoMedium text-[11px] mt-0.5">
                    Vehicle service requested
                  </Text>
                )}
              </View>
            </View>

            {/* Connecting Vertical Dashed Line */}
            <View className="ml-[17px] my-1 h-4 border-l-2 border-dashed border-slate-300" />

            {/* Bottom Node: Breakdown Address */}
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center mr-3 mt-0.5">
                <Ionicons name="location" size={18} color="#D30309" />
              </View>
              <View className="flex-1">
                <Text className="text-[9.5px] font-NunitoBold text-slate-400 uppercase tracking-wider">
                  Breakdown Location
                </Text>
                <Text
                  className="text-[#1E293B] font-NunitoBold text-[13px] leading-4 mt-0.5"
                  numberOfLines={2}
                >
                  {currentOrder.serviceAddress || 'Customer Breakdown Location'}
                </Text>
              </View>
            </View>

            {/* Issue Description & Budget Row (Always visible with clear layout) */}
            <View className="mt-3 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <MaterialCommunityIcons
                  name="wrench-outline"
                  size={15}
                  color="#64748B"
                  style={{ marginRight: 7 }}
                />
                <View className="flex-1">
                  <Text className="text-[9px] font-NunitoBold text-slate-400 uppercase tracking-wider">
                    Reported Issue
                  </Text>
                  <Text
                    className="text-slate-800 font-NunitoBold text-[12.5px] leading-4"
                    numberOfLines={1}
                  >
                    {currentOrder.problemDescription || currentOrder.serviceType || 'Diagnostic inspection needed'}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-[9px] font-NunitoBold text-slate-400 uppercase tracking-wider">
                  Estimated Cost
                </Text>
                {currentOrder.estimatedCost != null && Number(currentOrder.estimatedCost) > 0 ? (
                  <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5">
                    <Text className="text-emerald-700 font-NunitoExtraBold text-[11px]">
                      ₦{Number(currentOrder.estimatedCost).toLocaleString()}
                    </Text>
                  </View>
                ) : (
                  <View className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-0.5">
                    <Text className="text-slate-600 font-NunitoBold text-[10px]">
                      Awaiting estimate
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Footer: Full-Width Pill CTA & Quick Action Controls ───────── */}
          <View className="px-5 pb-4 pt-1">
            {/* Primary Action Button (Brand Red matching app design) */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => handleViewOrder(currentOrder)}
              className="bg-[#D30309] rounded-full py-3.5 items-center justify-center shadow-md shadow-red-500/20 active:bg-[#B30207]"
            >
              <Text className="text-white font-NunitoExtraBold text-[15px] tracking-wide">
                View order details
              </Text>
            </TouchableOpacity>

            {/* Quick Accept & Decline Actions for Busy Mechanics */}
            <View className="flex-row items-center justify-between mt-2.5 gap-2.5">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleDeclineOrder(currentOrder)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 border border-slate-200/80 items-center justify-center active:bg-slate-200"
              >
                <Text className="text-slate-700 font-NunitoBold text-[12.5px]">
                  Decline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleAcceptOrder(currentOrder)}
                className="flex-1 py-2.5 rounded-full bg-[#00984C] items-center justify-center flex-row gap-1.5 shadow-sm active:bg-[#008040]"
              >
                <MaterialCommunityIcons name="check-bold" size={13} color="#FFFFFF" />
                <Text className="text-white font-NunitoExtraBold text-[12.5px]">
                  Accept Request
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </>
  );
};

export default NewOrderBanner;
