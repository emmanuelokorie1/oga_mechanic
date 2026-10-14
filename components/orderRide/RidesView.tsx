import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import RidesInfoDrawer from "./RidesInfoDrawer";
import ScheduledInfoDrawer from "./ScheduledInfoDrawer";
import { router } from "expo-router";
import { routes } from "@/constants/routes";
import { useLocation } from "@/contexts/LocationContext";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RidesViewProps {
  handleScheduleRide: () => void;
}

// Mock data for past rides
const PAST_RIDES = [
  {
    id: 1,
    month: "December 2025",
    data: [
      {
        id: 101,
        address: "56 Olushi Street, Lagos Island",
        date: "23 Dec · 22:49",
        price: "₦13,200",
        status: "completed",
      },
      {
        id: 102,
        address: "56 Olushi Street, Lagos Island",
        date: "23 Dec · Cancelled",
        price: "",
        status: "cancelled",
      },
      {
        id: 103,
        address: "Sol Beach Elegushi by Boxmall, Eleg...Lagos, Nigeria",
        date: "23 Dec · Cancelled",
        price: "",
        status: "cancelled",
      },
    ],
  },
  {
    id: 2,
    month: "November 2025",
    data: [
      {
        id: 201,
        address: "31 Emily Akinola Street, Akoka, Lagos, Nigeria",
        date: "16 Nov · 7:46",
        price: "₦2,900",
        status: "completed",
      },
    ],
  },
  {
    id: 3,
    month: "April 2025",
    data: [], // Placeholder
  },
];

const RidesView: React.FC<RidesViewProps> = ({ handleScheduleRide }) => {
  const [ridesTab, setRidesTab] = useState<"past" | "upcoming">("past");
  const { state: { fromLocation }, setToLocation } = useLocation();
  
  // Drawer states
  const [showRidesInfo, setShowRidesInfo] = useState(false);
  const [showScheduledInfo, setShowScheduledInfo] = useState(false);

  const handleTabChange = (tab: "past" | "upcoming") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRidesTab(tab);
  };

  const handleRebook = (ride: any) => {
      const toLocationData = {
          name: ride.address, // Using address as name since we don't have a separate name
          address: ride.address,
          latitude: 0, // Mock, would need geocoding in real app
          longitude: 0
      };
      
      setToLocation(toLocationData);

      router.push({
          pathname: routes.chooseRide,
          params: {
              from: JSON.stringify(fromLocation),
              to: JSON.stringify(toLocationData),
              rideType: "Standard",
              isScheduled: "false"
          }
      });
  };

  return (
    <View className="flex-1 px-5">
      {/* Rides Header */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-3xl font-NunitoExtraBold text-gray-900">
          Rides
        </Text>
        <TouchableOpacity onPress={() => setShowRidesInfo(true)}>
          <FontAwesome name="info-circle" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Sub Tabs */}
      <View className="flex-row border-b border-gray-100 mb-2 z-10 bg-white">
        <TouchableOpacity
          onPress={() => handleTabChange("past")}
          className={`mr-8 pb-3 px-4 relative ${
             ridesTab !== "past" ? "opacity-50" : "opacity-100"
          }`}
        >
          <Text
            className={`font-NunitoBold text-base ${
              ridesTab === "past" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            Past
          </Text>
          {ridesTab === "past" && (
             <Animated.View 
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-600 rounded-t-full" 
             />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleTabChange("upcoming")}
          className={`pb-3 px-4 relative ${
             ridesTab !== "upcoming" ? "opacity-50" : "opacity-100"
          }`}
        >
          <Text
            className={`font-NunitoBold text-base ${
              ridesTab === "upcoming" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            Upcoming
          </Text>
          {ridesTab === "upcoming" && (
             <Animated.View 
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-600 rounded-t-full" 
             />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {ridesTab === "upcoming" ? (
        <Animated.View 
            entering={FadeIn.duration(300)}
            className="flex-1 items-center justify-center -mt-20"
        >
          <View className="w-28 h-28 mb-6 relative items-center justify-center">
            {/* Emulating a nicer icon group */}
            <View className="bg-gray-100 rounded-2xl w-20 h-20 items-center justify-center transform -rotate-6 shadow-sm">
              <View className="bg-white w-16 h-16 rounded-xl items-center justify-center">
                <FontAwesome name="calendar" size={32} color="#10B981" />
              </View>
            </View>
            <View className="absolute -right-2 -top-2 bg-primary-600 rounded-full w-10 h-10 items-center justify-center border-4 border-white shadow-sm">
              <FontAwesome name="clock-o" size={18} color="white" />
            </View>
          </View>

          <Text className="text-xl font-NunitoBold text-gray-900 mb-3">
            No upcoming rides
          </Text>
          <Text className="text-gray-500 font-NunitoMedium text-center px-8 mb-8 leading-6">
            Whatever is on your schedule, a Scheduled Ride can get you there on
            time
          </Text>
          <TouchableOpacity className="mb-8" onPress={() => setShowScheduledInfo(true)}>
            <Text className="text-primary-600 font-NunitoBold text-base">
              Learn how it works
            </Text>
          </TouchableOpacity>

          <CustomButton
            title="Schedule a ride"
            className="w-full"
            onPress={handleScheduleRide}
          />
        </Animated.View>
      ) : (
        <Animated.View className="flex-1" entering={FadeIn.duration(300)}>
        <FlatList
          data={PAST_RIDES}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          renderItem={({ item }) => (
            <View className="mb-6">
              <Text className="text-lg font-NunitoExtraBold text-gray-900 mb-4">
                {item.month}
              </Text>
              {item.data.map((ride, index) => (
                <View
                  key={ride.id}
                  className={`flex-row items-start py-4 ${
                    index !== item.data.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="w-10 pt-1 items-center justify-center mr-3">
                    {ride.status === "cancelled" ? (
                      <FontAwesome name="ban" size={18} color="#9CA3AF" />
                    ) : (
                      <FontAwesome name="car" size={18} color="#4B5563" />
                    )}
                  </View>
                  <View className="flex-1 pr-2">
                    <Text className="text-gray-500 text-xs font-NunitoBold mb-1">
                      {ride.date}
                    </Text>
                    <Text
                      className="font-NunitoBold text-[15px] text-gray-900 mb-1 leading-5"
                      numberOfLines={2}
                    >
                      {ride.address}
                    </Text>
                    <Text
                      className={`font-NunitoExtraBold text-sm ${
                        ride.status === "cancelled"
                          ? "text-gray-900"
                          : "text-gray-900"
                      }`}
                    >
                      {ride.status === "cancelled" ? "₦0" : ride.price}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleRebook(ride)}
                    className="bg-gray-50 w-10 h-10 rounded-full items-center justify-center"
                  >
                    <FontAwesome name="refresh" size={14} color="#4B5563" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        />
        </Animated.View>
      )}

      {/* Info Drawers */}
      <RidesInfoDrawer 
        visible={showRidesInfo}
        onClose={() => setShowRidesInfo(false)}
      />
      <ScheduledInfoDrawer
        visible={showScheduledInfo}
        onClose={() => setShowScheduledInfo(false)}
        onSchedulePress={handleScheduleRide}
      />
    </View>
  );
};

export default RidesView;
