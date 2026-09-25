import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { HeadphonesIcon } from "./icons/HeadphonesIcon";
import { router } from "expo-router";
import { routes } from "@/constants/routes";
import { useSupportCount } from "@/hooks/useSupport";

interface SpecialistIconBtnProps {
  // count prop is now optional as we fetch it internally, 
  // but we keep it for flexibility if needed
  count?: number; 
  isFloating?: boolean;
}

const SpecialistIconBtn = ({ count: manualCount, isFloating = false }: SpecialistIconBtnProps) => {
  const activeSupportCount = useSupportCount();
  
  // Use manual count if provided, otherwise use the live count from API
  const displayCount = manualCount !== undefined ? manualCount : activeSupportCount;

  return (
    <View>
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: routes.supportSuggestions as any,
          params: { activeTab: displayCount > 0 ? 'chat' : 'support' }
        })} 
        style={
          isFloating 
            ? {
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "white",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#D30309",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4.65,
                elevation: 2,
              }
            : undefined
        }
        className={
          isFloating 
            ? "relative" 
            : "w-[45px] h-[45px] bg-gray-100 flex justify-center items-center rounded-full relative"
        }
      >
        <HeadphonesIcon size={24} color={isFloating ? "#D30309" : "#000"} />
        {displayCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: isFloating ? "#fff" : "#FF8C00",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              paddingHorizontal: 4,
              borderWidth: isFloating ? 1 : 0,
              borderColor: "#D30309"
            }}
          >
            <Text style={{ 
              color: isFloating ? "#D30309" : "#fff", 
              fontSize: 11, 
              fontWeight: "bold",
              fontFamily: "Nunito-Bold"
            }}>
              {displayCount > 99 ? "99+" : displayCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default SpecialistIconBtn;
