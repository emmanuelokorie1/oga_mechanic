import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TrashIcon } from "react-native-heroicons/outline";
import SelectField from "@/components/forms/SelectField";
import InputField from "@/components/InputField";

interface ExpertiseRecord {
  vehicle_make_id: string;
  years_of_experience: string;
  certification_level: string;
}

interface ExpertiseRecordItemProps {
  index: number;
  record: ExpertiseRecord;
  carBrandsOptions: { label: string; value: string }[];
  certificationLevels: { label: string; value: string }[];
  onRemove: () => void;
  onUpdate: (field: keyof ExpertiseRecord, value: string) => void;
}

const ExpertiseRecordItem: React.FC<ExpertiseRecordItemProps> = ({
  index,
  record,
  carBrandsOptions,
  certificationLevels,
  onRemove,
  onUpdate,
}) => {
  return (
    <View 
      className="bg-white p-5 rounded-[24px] mb-6 border border-gray-100 shadow-sm"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* Header with Number and Trash */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center mr-3">
            <Text className="text-primary-600 font-NunitoExtraBold text-sm">{index + 1}</Text>
          </View>
          <Text className="font-NunitoBold text-gray-900 text-[17px]">Brand Expertise</Text>
        </View>
        
        <TouchableOpacity
          onPress={onRemove}
          activeOpacity={0.6}
          className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
        >
          <TrashIcon size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Main Selection */}
      <View className="mb-5">
        <SelectField
          name={`vehicle_make_${index}`}
          label="Vehicle Brand"
          placeholder="Select brand"
          options={carBrandsOptions}
          value={record.vehicle_make_id}
          onValueChange={(val) => onUpdate("vehicle_make_id", val)}
        />
      </View>

      {/* Stats Row */}
      <View className="flex-row space-x-3 gap-3">
        <View className="flex-1">
          <InputField
            label="Experience"
            placeholder="Years"
            keyboardType="numeric"
            value={record.years_of_experience}
            onChangeText={(val) => onUpdate("years_of_experience", val)}
          />
        </View>
        
        <View className="flex-[1.5]">
          <SelectField
            name={`certification_level_${index}`}
            label="Certification"
            placeholder="Level"
            options={certificationLevels}
            value={record.certification_level}
            onValueChange={(val) => onUpdate("certification_level", val)}
          />
        </View>
      </View>
    </View>
  );
};

export default ExpertiseRecordItem;
