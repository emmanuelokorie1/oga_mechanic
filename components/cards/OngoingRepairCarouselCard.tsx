import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { routes } from '@/constants/routes';
import { images } from '@/constants';
import { useVehicleMakes } from '@/hooks/useVehicleMakes';

export interface OngoingRepairCarouselCardProps {
  orders?: any[];
  order?: any;
  onPress?: () => void;
}

interface StatusTheme {
  label: string;
  subLabel: string;
  ctaText: string;
}

const getStatusTheme = (status: string, mechanicName: string): StatusTheme => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'pending':
      return {
        label: 'Searching',
        subLabel: 'Connecting with nearby mechanics',
        ctaText: 'View',
      };
    case 'accepted':
      return {
        label: 'Assigned',
        subLabel: `${mechanicName} accepted request`,
        ctaText: 'Track',
      };
    case 'in_transit':
      return {
        label: 'On The Way',
        subLabel: `${mechanicName} is heading to you`,
        ctaText: 'Track',
      };
    case 'arrived':
      return {
        label: 'Arrived',
        subLabel: 'Mechanic is now on site',
        ctaText: 'Code',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        subLabel: 'Mechanic is servicing vehicle',
        ctaText: 'Track',
      };
    case 'completed':
      return {
        label: 'Completed',
        subLabel: 'Service finished • Please verify',
        ctaText: 'Verify',
      };
    default:
      return {
        label: 'Active Repair',
        subLabel: 'Ongoing vehicle service',
        ctaText: 'Track',
      };
  }
};

const OngoingRepairCarouselCard: React.FC<OngoingRepairCarouselCardProps> = ({ orders = [], order, onPress }) => {
  const { data: vehicleMakes } = useVehicleMakes();

  const orderList = useMemo(() => {
    if (orders && orders.length > 0) return orders;
    if (order) return [order];
    return [];
  }, [orders, order]);

  const count = orderList.length;
  const isMultiple = count > 1;
  const primaryOrder = orderList[0];

  // Pulse animation for live status badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Mechanic name
  const mechanicName = useMemo(() => {
    if (primaryOrder?.mechanic) {
      const full = `${primaryOrder.mechanic.first_name || ''} ${primaryOrder.mechanic.last_name || ''}`.trim();
      if (full) return full;
    }
    if (primaryOrder?.mechanic_name) return primaryOrder.mechanic_name;
    return 'Specialist';
  }, [primaryOrder]);

  // Single Vehicle resolution helper
  const resolveVehicle = (o: any) => {
    if (!o) return 'Vehicle Service';
    const makeId = o?.vehicle_make;
    const modelId = o?.vehicle_model;
    let makeName = '';
    let modelName = '';

    if (typeof makeId === 'string' && isNaN(Number(makeId))) {
      makeName = makeId;
    } else if (vehicleMakes && makeId) {
      const make = vehicleMakes.find((m: any) => m.id?.toString() === makeId?.toString());
      makeName = make?.name || '';
    }

    if (typeof modelId === 'string' && isNaN(Number(modelId))) {
      modelName = modelId;
    } else if (vehicleMakes && makeId && modelId) {
      const make = vehicleMakes.find((m: any) => m.id?.toString() === makeId?.toString());
      const model = make?.models?.find((m: any) => m.id?.toString() === modelId?.toString());
      modelName = model?.name || '';
    }

    const year = o?.vehicle_year ? `${o.vehicle_year} ` : '';
    const vehicle = [year + makeName, modelName].filter(Boolean).join(' ').trim();
    return vehicle || o?.vehicle_name || 'Vehicle Service';
  };

  const singleVehicleTitle = useMemo(() => {
    return resolveVehicle(primaryOrder);
  }, [primaryOrder, vehicleMakes]);

  const statusTheme = useMemo(() => {
    return getStatusTheme(primaryOrder?.status, mechanicName);
  }, [primaryOrder?.status, mechanicName]);

  const bgImageSource = useMemo(() => {
    const raw = !isMultiple ? (primaryOrder?.vehicle?.image || primaryOrder?.vehicle_image) : null;
    if (raw) {
      return typeof raw === 'string' ? { uri: raw } : raw;
    }
    return images.welcomeImg2;
  }, [primaryOrder, isMultiple]);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (isMultiple) {
      router.push({
        pathname: routes.myMechanicOrders as any,
        params: { status: 'in_progress' },
      });
    } else if (primaryOrder?.id) {
      router.push({
        pathname: routes.trackMechanicOrder as any,
        params: { orderId: primaryOrder.id.toString() },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={{
        width: '100%',
        height: 170,
        backgroundColor: '#0F172A',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
        overflow: 'hidden',
      }}
    >
      {/* Background Automotive Image with subtle opacity */}
      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          opacity: 0.35,
        }}
      >
        {typeof bgImageSource === 'function' ? (
          React.createElement(bgImageSource as any, {
            width: '100%',
            height: '100%',
            preserveAspectRatio: 'xMidYMid slice',
            style: { width: '100%', height: '100%' },
          })
        ) : (
          <Image
            source={bgImageSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Top subtle gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={{ position: 'absolute', top: 0, width: '100%', height: 50 }}
      />

      {/* Bottom rich gradient for crystal clear text legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(15, 23, 42, 0.75)', 'rgba(15, 23, 42, 0.98)']}
        style={{ position: 'absolute', bottom: 0, width: '100%', height: 100 }}
      />

      <View style={{ flex: 1, justifyContent: 'space-between', padding: 14 }}>
        {/* Top: Badges */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Live Action Badge */}
          <View
            style={{
              backgroundColor: 'rgba(211, 3, 9, 0.9)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Animated.View
              style={{
                width: 5,
                height: 5,
                backgroundColor: '#FFFFFF',
                borderRadius: 2.5,
                marginRight: 5,
                opacity: pulseAnim,
              }}
            />
            <Text
              style={{
                fontSize: 9,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
              className="font-NunitoExtraBold"
            >
              {isMultiple ? `${count} REPAIRS ACTIVE` : 'ACTIVE REPAIR'}
            </Text>
          </View>

          {/* Right Status Pill */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <Text
              style={{
                fontSize: 9,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
              className="font-NunitoBold"
            >
              {isMultiple ? 'In Progress' : statusTheme.label}
            </Text>
          </View>
        </View>

        {/* Bottom: Info & Action */}
        <View style={{ paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Left Side: Vehicle Info & Headline */}
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text
                style={{
                  fontSize: 9,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 2,
                }}
                numberOfLines={1}
                className="font-NunitoExtraBold"
              >
                {isMultiple ? `${count} ACTIVE REQUESTS` : singleVehicleTitle}
              </Text>
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.4 }}
                numberOfLines={1}
                className="font-NunitoExtraBold"
              >
                {isMultiple ? `You've got ${count} ongoing repairs` : statusTheme.subLabel}
              </Text>
            </View>

            {/* Right Side: Clean Classy CTA */}
            <View style={{ alignItems: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: '#D30309',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontSize: 11, color: '#FFFFFF', marginRight: 4 }}
                  className="font-NunitoExtraBold"
                >
                  {isMultiple ? 'View All' : statusTheme.ctaText}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={11} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(OngoingRepairCarouselCard);
