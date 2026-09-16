import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { EyeIcon } from "react-native-heroicons/outline";

export interface Order {
  id: string;
  clientName: string;
  phoneNumber: string;
  carType: string;
  carIssue: string;
  estimatedCost?: string | number | null;
  status?: "current" | "ongoing" | "completed" | "declined";
  apiStatus?: string; // Actual API status: pending, accepted, in_progress, completed, cancelled, declined
}

interface OrderCardProps {
  order: Order;
  type?: "current" | "ongoing" | "completed"; // Optional - kept for backward compatibility, but we use apiStatus now
  onAccept?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
  onMarkComplete?: (orderId: string) => void;
  onView?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  type,
  onAccept,
  onDecline,
  onMarkComplete,
  onView,
}) => {
  const estimatedCostValue =
    order.estimatedCost != null && !Number.isNaN(Number(order.estimatedCost))
      ? Number(order.estimatedCost)
      : null;

  const getStatusColor = () => {
    const status = order.apiStatus || order.status;
    switch (status) {
      case "pending":
        return "text-yellow-600";
      case "accepted":
        return "text-blue-600";
      case "in_transit":
        return "text-indigo-600";
      case "arrived":
        return "text-indigo-600";
      case "in_progress":
        return "text-purple-600";
      case "completed":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      case "declined":
        return "text-red-600";
      // Fallback for mapped statuses
      case "ongoing":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = () => {
    const status = order.apiStatus || order.status;
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "in_transit":
        return "In Transit";
      case "arrived":
        return "Arrived";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "declined":
        return "Declined";
      // Fallback for mapped statuses
      case "ongoing":
        return "Ongoing";
      case "current":
        return "Pending";
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : "";
    }
  };

  const getCardBorderStyle = () => {
    // if (order.status === "ongoing" || (type === "ongoing" && !order.status)) {
    //   return "border-blue-500 border-2";
    // }
    return "border-gray-200";
  };

  const renderButtons = () => {
    // Use apiStatus to determine which buttons to show
    const status = order.apiStatus || (type === "current" ? "pending" : type === "ongoing" ? "in_progress" : "completed");

    // If pending, show all 3 buttons: Accept, Decline, View
    if (status === "pending") {
      return (
        <View className="space-y-3">
          <View className="flex-row space-x-3 gap-3">
            <TouchableOpacity
              onPress={() => onAccept?.(order.id)}
              className="flex-1 bg-green-100 border border-[#00984C] rounded-[.4rem] py-3"
            >
              <Text className="text-green-700 font-NunitoSemiBold text-center">
                ✓ Accept
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onDecline?.(order.id)}
              className="flex-1 bg-red-100 border border-[#E10000] rounded-[.4rem] py-3"
            >
              <Text className="text-[#E10000] font-NunitoSemiBold text-center">
                ✗ Decline
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => onView?.(order.id)}
            className="bg-blue-100 flex-row items-center justify-center gap-2 border border-blue-500 rounded-[.4rem] py-3 mt-2"
          >
            <EyeIcon size={20} color="#3B82F6" />
            <Text className="text-blue-700 font-NunitoSemiBold text-center">View</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // For other statuses (accepted, in_progress, completed, cancelled, declined), only show View button
    return (
      <TouchableOpacity
        onPress={() => onView?.(order.id)}
        className="bg-blue-100 border flex-row items-center justify-center gap-2 border-blue-500 rounded-[.4rem] py-3"
      >
        <EyeIcon size={20} color="#3B82F6" />
        <Text className="text-blue-700 font-NunitoSemiBold text-center">View</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      key={order.id}
      className={`bg-white mb-4 p-4 rounded-[.7rem] border border-gray-300 ${getCardBorderStyle()}`}
    >
      {/* Header with client name and status */}
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-base font-NunitoSemiBold text-gray-800 flex-1">
          Client name: <Text className="font-NunitoBold">{order.clientName}</Text>
        </Text>
        {getStatusText() && (
          <Text className={`text-sm font-NunitoBold ${getStatusColor()}`}>
            {getStatusText()}
          </Text>
        )}
      </View>

      <Text className="text-sm text-gray-600 mb-2">
        Car type: <Text className="font-NunitoSemiBold">{order.carType}</Text>
      </Text>

      <Text className="text-sm text-gray-600 mb-4">
        Car Issue: <Text className="font-NunitoSemiBold">{order.carIssue}</Text>
      </Text>

      <View className="mb-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-NunitoBold text-green-700 uppercase tracking-wide">
            Estimated Cost
          </Text>
          <View className="px-2 py-0.5 rounded-full bg-green-600">
            <Text className="text-[10px] font-NunitoBold text-white">BUDGET</Text>
          </View>
        </View>
        {estimatedCostValue != null ? (
          <Text className="text-[20px] font-NunitoExtraBold text-green-700 mt-1">
            ₦{estimatedCostValue.toLocaleString()}
          </Text>
        ) : (
          <Text className="text-[14px] font-NunitoBold text-green-600 mt-1">
            Awaiting estimate
          </Text>
        )}
      </View>

      {renderButtons()}
    </View>
  );
};

export default OrderCard;
