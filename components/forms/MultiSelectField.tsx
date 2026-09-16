
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import {
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/outline";
import AndroidNavBarSpacer from "../AndroidNavBarSpacer";

interface SelectOption {
  label: string;
  value: string;
}

interface MultiSelectFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value: string[];
  onValueChange?: (value: string[]) => void;
  required?: boolean;
}

const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  name,
  label,
  placeholder = "Select option(s)",
  options,
  value,
  onValueChange,
  required = false,
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const animatedValue = useRef(new Animated.Value(0)).current;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return value.map((v) => map.get(v)).filter(Boolean) as string[];
  }, [options, value]);

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  const openDrawer = () => {
    setSearchQuery("");
    setShowDrawer(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setSearchQuery("");
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const toggleValue = (v: string) => {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onValueChange?.(Array.from(next));
  };

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E5E7EB", "#F87171"],
    extrapolate: "clamp",
  });

  return (
    <View className="mb-4 w-full">
      {label ? (
        <Text className="text-base font-NunitoSemiBold text-gray-700 mb-2">
          {label}
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </Text>
      ) : null}

      <Animated.View
        className="flex flex-row items-center bg-gray-50 rounded-xl px-4 py-1"
        style={{
          borderWidth: 1,
          borderColor,
          ...Platform.select({
            ios: {
              shadowColor: "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
            },
            android: {
              elevation: 0,
            },
          }),
        }}
      >
        <TouchableOpacity
          onPress={openDrawer}
          className="flex-1 flex-row items-center justify-between py-3"
          accessibilityLabel={name}
        >
          <Text
            className={`text-[1.2rem] font-NunitoMedium ${
              selectedLabels.length ? "text-gray-900" : "text-gray-400"
            }`}
            numberOfLines={2}
          >
            {displayText}
          </Text>
          <ChevronDownIcon size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showDrawer}
        transparent
        animationType="slide"
        onRequestClose={closeDrawer}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={closeDrawer}>
          <Pressable className="bg-white rounded-t-3xl h-[70vh] max-h-[80vh]">
            <View className="p-6 pb-0">
              <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-NunitoBold text-gray-900">
                  {`Select ${label}`}
                </Text>
                <Text className="text-sm font-NunitoMedium text-gray-500">
                  {value.length} selected
                </Text>
              </View>

              <View className="flex-row items-center bg-gray-100 rounded-2xl px-3 py-3 mb-3">
                <MagnifyingGlassIcon size={20} color="#9CA3AF" />
                <TextInput
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-base font-NunitoMedium text-gray-900"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator bounces={false}>
              <View className="pt-2 pb-6">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => {
                    const checked = selectedSet.has(option.value);
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => toggleValue(option.value)}
                        className="flex-row items-center justify-between py-4 border-b border-gray-100"
                        activeOpacity={0.7}
                      >
                        <Text className={`text-[16px] ${checked ? 'font-NunitoBold text-primary-600' : 'font-NunitoSemiBold text-gray-800'} flex-1 pr-3`}>
                          {option.label}
                        </Text>
                        {checked && <CheckIcon size={20} color="#D30309" strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View className="p-8 items-center">
                    <Text className="text-gray-500 text-center font-NunitoMedium">
                      No {label.toLowerCase()} found matching "{searchQuery}"
                    </Text>
                  </View>
                )}

                <AndroidNavBarSpacer />
              </View>
            </ScrollView>

            <View className="px-6 pb-6 pt-2">
              <TouchableOpacity
                onPress={closeDrawer}
                className="w-full rounded-full py-4 px-2 bg-[#D30309] items-center"
                activeOpacity={0.9}
              >
                <Text className="text-white font-NunitoBold text-[1.1rem]">Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default MultiSelectField;

