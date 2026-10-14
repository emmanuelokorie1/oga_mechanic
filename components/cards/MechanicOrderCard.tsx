import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { routes } from '@/constants/routes';
import Ionicons from '@expo/vector-icons/Ionicons';
import { isIdLike } from '@/utils/serviceUtils';

interface MechanicOrder {
  id: string;
  orderNumber?: string;
  mechanicName: string;
  mechanicImage?: string;
  serviceType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  problemDescription: string;
  serviceAddress: string;
  preferredDate: string;
  preferredTimeSlot: string;
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled' | string;
  createdAt: string;
  schedule?: boolean;
  notes?: string;
  estimatedCost?: string | number | null;
  eta?: string;
}

interface MechanicOrderCardProps {
  order: MechanicOrder;
  onPress?: (orderId: string) => void;
}

const MechanicOrderCard: React.FC<MechanicOrderCardProps> = ({ order, onPress }) => {
  const estimatedCostValue =
    order.estimatedCost != null && !Number.isNaN(Number(order.estimatedCost))
      ? Number(order.estimatedCost)
      : null;

  const orderNumberStr =
    order.orderNumber ||
    (order.id?.length > 6 ? order.id.slice(-5) : order.id) ||
    '17899';

  const isPending =
    order.status === 'pending' &&
    (!order.mechanicName || order.mechanicName === 'Unknown Mechanic');

  // Format Vehicle String
  const vehicleParts = [
    order.vehicleYear > 0 ? order.vehicleYear : null,
    order.vehicleMake,
    order.vehicleModel,
  ].filter(Boolean);
  const vehicleSummary = vehicleParts.join(' ');

  // Format Service Type
  const formattedServiceType =
    order.serviceType && !isIdLike(order.serviceType)
      ? order.serviceType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      : 'General Service';

  // Format Status Badge Config
  const getStatusBadgeConfig = (status: string) => {
    const normalized = (status || 'pending').toLowerCase();
    switch (normalized) {
      case 'pending':
        return {
          label: 'Pending',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200/80',
          dot: 'bg-amber-500',
        };
      case 'accepted':
        return {
          label: 'Accepted',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200/80',
          dot: 'bg-blue-500',
        };
      case 'in_transit':
        return {
          label: 'On The Way',
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200/80',
          dot: 'bg-indigo-500',
        };
      case 'arrived':
        return {
          label: 'Arrived',
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200/80',
          dot: 'bg-indigo-500',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200/80',
          dot: 'bg-purple-500',
        };
      case 'verify_completed':
      case 'verify completed':
        return {
          label: 'Verify Completed',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'completed':
        return {
          label: 'Completed',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'declined':
      case 'cancelled':
        return {
          label: normalized === 'declined' ? 'Declined' : 'Cancelled',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200/80',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: status
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusBadge = getStatusBadgeConfig(order.status);

  // Format ETA or Timestamp
  const formatEtaOrTime = () => {
    if (order.eta) return order.eta;
    if (order.status === 'in_transit') return '~10 - 15 mins';
    if (order.status === 'arrived') return 'Arrived at location';
    if (order.status === 'in_progress') return 'Repair ongoing';
    if (order.status === 'completed' || order.status === 'verify_completed') {
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      return 'Completed';
    }

    if (order.preferredTimeSlot) {
      return order.preferredTimeSlot.charAt(0).toUpperCase() + order.preferredTimeSlot.slice(1);
    }

    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }

    return 'Immediate';
  };

  const etaString = formatEtaOrTime();

  const handlePress = () => {
    if (onPress) {
      onPress(order.id);
    } else {
      router.push({
        pathname: routes.trackMechanicOrder,
        params: {
          orderId: order.id,
        },
      });
    }
  };

  return (
    <TouchableOpacity
      className="mb-3.5 overflow-hidden"
      activeOpacity={0.92}
      onPress={handlePress}
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0.09,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View className="bg-white rounded-[22px] overflow-hidden border border-slate-200/90">
        {/* ── Header: Order #, Status Badge & Service / ETA Subtitle ──── */}
        <View className="bg-slate-50/80 px-4 py-3 border-b border-slate-100">
          {/* Row 1: Order Number & Status Badge */}
          <View className="flex-row items-center justify-between">
            <Text
              className="text-[#0F172A] font-NunitoExtraBold text-[15.5px] tracking-tight flex-1 mr-2"
              numberOfLines={1}
            >
              Order #{orderNumberStr}
            </Text>

            {/* Status Badge */}
            <View className={`px-2.5 py-1 rounded-full border ${statusBadge.bg} ${statusBadge.border} flex-row items-center shrink-0`}>
              <View className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} mr-1.5`} />
              <Text className={`text-[10.5px] font-NunitoBold ${statusBadge.text}`}>
                {statusBadge.label}
              </Text>
            </View>
          </View>

          {/* Row 2: Service Type and ETA */}
          <View className="flex-row items-center mt-1">
            <Text
              className="text-slate-600 font-NunitoBold text-[12.5px] shrink"
              numberOfLines={1}
            >
              {formattedServiceType}
            </Text>
            <Text className="text-slate-300 mx-1.5">•</Text>
            <Text
              className="text-slate-400 font-NunitoMedium text-[11.5px] shrink-0"
              numberOfLines={1}
            >
              E.T.A | {etaString}
            </Text>
          </View>
        </View>

        {/* ── Body: Connected Journey Timeline ──── */}
        <View className="p-4 pt-3.5 pb-2">
          {/* Top Node: Specialist & Vehicle */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 items-center justify-center mr-3 overflow-hidden">
                {order.mechanicImage ? (
                  <Image
                    source={{ uri: order.mechanicImage }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={17} color="#475569" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-slate-900 font-NunitoBold text-[14px] leading-5"
                  numberOfLines={1}
                >
                  {isPending
                    ? 'Finding nearest specialist...'
                    : (order.mechanicName || 'Assigned Specialist')}
                </Text>
                <Text className="text-slate-500 font-NunitoMedium text-[12px] mt-0.5" numberOfLines={1}>
                  {vehicleSummary ? `🚗 ${vehicleSummary}` : 'Vehicle service requested'}
                </Text>
              </View>
            </View>

            {/* Estimated Budget (if available) */}
            {estimatedCostValue != null && (
              <View className="items-end pl-2 shrink-0">
                <Text className="text-[9.5px] font-NunitoBold text-slate-400 uppercase tracking-wider">
                  Est. Budget
                </Text>
                <Text className="text-emerald-700 font-NunitoExtraBold text-[13.5px]">
                  ₦{estimatedCostValue.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Continuous Vertical Connecting Line */}
          <View className="ml-[17px] my-1 h-3.5 border-l-2 border-slate-200" />

          {/* Bottom Node: Breakdown Location */}
          <View className="flex-row items-start">
            <View className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 items-center justify-center mr-3 mt-0.5">
              <Ionicons name="location" size={17} color="#D30309" />
            </View>
            <View className="flex-1">
              <Text
                className="text-slate-800 font-NunitoBold text-[13px] leading-4.5"
                numberOfLines={2}
              >
                {order.serviceAddress || 'Customer Breakdown Location'}
              </Text>
              {order.problemDescription ? (
                <Text className="text-slate-400 font-NunitoMedium text-[11.5px] mt-1" numberOfLines={1}>
                  Reported issue: <Text className="text-slate-600 font-NunitoSemiBold">{order.problemDescription}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          {/* Schedule Banner (if scheduled) */}
          {order.schedule && order.preferredDate ? (
            <View className="mt-3 bg-blue-50/70 border border-blue-200/60 rounded-xl px-3 py-2 flex-row items-center">
              <Ionicons name="calendar-outline" size={14} color="#2563EB" style={{ marginRight: 6 }} />
              <Text className="text-blue-900 font-NunitoBold text-[11.5px]">
                Scheduled: {new Date(order.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {order.preferredTimeSlot ? ` • ${order.preferredTimeSlot}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Footer CTA Button ──── */}
        <View className="px-4 pb-3.5 pt-1">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handlePress}
            className="bg-[#D30309] rounded-2xl py-3 items-center justify-center flex-row shadow-sm active:bg-[#B30207]"
          >
            <Text className="text-white font-NunitoExtraBold text-[13.5px] tracking-wide mr-1.5">
              View order details
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MechanicOrderCard;
export type { MechanicOrder };