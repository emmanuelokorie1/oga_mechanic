import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { routes } from '@/constants/routes';
import { 
  UserIcon, 
  TruckIcon, 
  CalendarIcon, 
  MapPinIcon,
  ChevronRightIcon
} from 'react-native-heroicons/outline';

interface MechanicOrder {
  id: string;
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
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  schedule?: boolean;
  notes?: string;
  estimatedCost?: string | number | null;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
      case 'arrived':
        return 'bg-indigo-100 text-indigo-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'declined':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'in_transit':
        return 'On The Way';
      case 'arrived':
        return 'Arrived';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'declined':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(order.id);
    } else {
      // Default behavior: navigate to tracking page
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
      className="mb-3 overflow-hidden"
      activeOpacity={0.85}
      onPress={handlePress}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="bg-white rounded-3xl overflow-hidden border border-gray-300 shadow-md">
        {/* Status Indicator Bar */}
        {/* <View 
          className={`h-0.5 ${
            order.status === 'pending' ? 'bg-yellow-400' :
            order.status === 'accepted' || order.status === 'in_progress' ? 'bg-blue-500' :
            order.status === 'completed' ? 'bg-green-500' :
            'bg-red-500'
          }`}
        /> */}

        <View className="px-4 py-3.5">
          {/* Header Section */}
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-row items-center flex-1">
              {/* Avatar */}
              <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-200 overflow-hidden">
                {order.mechanicImage ? (
                  <Image
                    source={{ uri: order.mechanicImage }}
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <UserIcon size={20} color="#6B7280" />
                )}
              </View>
              
              <View className="flex-1">
                <Text className="text-[15px] font-NunitoBold text-gray-900 mb-1" numberOfLines={1}>
                  {order.status === 'pending' && (order.mechanicName === 'Unknown Mechanic' || !order.mechanicName) 
                    ? 'Finding a Mechanic...' 
                    : `Mechanic: ${order.mechanicName}`}
                </Text>
                <View className="bg-primary-50 px-2 py-0.5 rounded self-start">
                  <Text className="text-[10px] font-NunitoBold text-primary-600">
                    {order.serviceType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Status Badge */}
            <View className={`px-2.5 py-1 rounded-full ${getStatusColor(order.status)} ml-2`}>
              <Text className={`text-[11px] font-NunitoBold`}>
                {getStatusLabel(order.status)}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View className="bg-gray-50 rounded-lg p-3 space-y-2.5">
            {/* Vehicle Info */}
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-md bg-white items-center justify-center mr-2.5">
                <TruckIcon size={16} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-NunitoMedium text-gray-500 mb-0.5">
                  Vehicle
                </Text>
                <Text className="text-[13px] font-NunitoBold text-gray-900" numberOfLines={1}>
                  {order.vehicleMake} {order.vehicleModel}
                  {order.vehicleYear > 0 && (
                    <Text className="text-[12px] font-NunitoMedium text-gray-600"> • {order.vehicleYear}</Text>
                  )}
                </Text>
              </View>
            </View>

            {/* Schedule Info */}
            {order.schedule && (
              <View className="flex-row items-center py-4">
                <View className="w-8 h-8 rounded-md bg-white items-center justify-center mr-2.5">
                  <CalendarIcon size={16} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-NunitoMedium text-gray-500 mb-0.5">
                    Schedule
                  </Text>
                  <Text className="text-[13px] font-NunitoBold text-gray-900" numberOfLines={1}>
                    {new Date(order.preferredDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    <Text className="text-[12px] font-NunitoMedium text-gray-600">
                      {' • '}{order.preferredTimeSlot.charAt(0).toUpperCase() + order.preferredTimeSlot.slice(1)}
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Location Info */}
            <View className="flex-row items-start mt-2">
              <View className="w-8 h-8 rounded-md bg-white items-center justify-center mr-2.5 mt-0.5">
                <MapPinIcon size={16} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-NunitoMedium text-gray-500 mb-0.5">
                  Location
                </Text>
                <Text className="text-[13px] font-NunitoMedium text-gray-900 leading-4" numberOfLines={2}>
                  {order.serviceAddress}
                </Text>
              </View>
            </View>

            {/* Estimated Cost */}
            {estimatedCostValue != null && (
              <View className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-NunitoBold text-green-700 uppercase tracking-wide">
                    Estimated Cost
                  </Text>
                  <View className="px-2 py-0.5 rounded-full bg-green-600">
                    <Text className="text-[10px] font-NunitoBold text-white">BUDGET</Text>
                  </View>
                </View>
                <Text className="text-[19px] font-NunitoExtraBold text-green-700 mt-1">
                  ₦{estimatedCostValue.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-end mt-2.5">
            <View className="flex-row items-center">
              <Text className="text-[11px] font-NunitoMedium text-gray-400 mr-1">
                View Details
              </Text>
              <ChevronRightIcon size={14} color="#9CA3AF" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MechanicOrderCard;
export type { MechanicOrder };