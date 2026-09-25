"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import BouncyCheckbox from "react-native-bouncy-checkbox"

interface CheckboxProps {
  label?: string
  isChecked?: boolean
  onPress?: (checked: boolean) => void
  size?: number
  fillColor?: string
  unfillColor?: string
  textColor?: string
  labelStyle?: string
  containerStyle?: string
  checkboxStyle?: string
  disabled?: boolean
  required?: boolean
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  isChecked: controlledChecked,
  onPress,
  size = 23,
  fillColor = "#D30309",
  unfillColor = "#FFFFFF",
  textColor = "#374151",
  labelStyle = "",
  containerStyle = "",
  checkboxStyle = "",
  disabled = false,
  required = false,
}) => {
  const [internalChecked, setInternalChecked] = useState(false)

  // Use controlled value if provided, otherwise use internal state
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked

  const handlePress = (checked: boolean) => {
    if (disabled) return

    if (controlledChecked === undefined) {
      setInternalChecked(checked)
    }

    if (onPress) {
      onPress(checked)
    }
  }

  const handleLabelPress = () => {
    if (disabled) return
    handlePress(!isChecked)
  }

  return (
    <View className={`flex-row items-center ${containerStyle}`}>
      <View className={`flex-shrink-0 ${checkboxStyle}`}>
        <BouncyCheckbox
          size={size}
          fillColor={fillColor}
          unFillColor={unfillColor}
          text=""
          isChecked={isChecked}
          onPress={handlePress}
          iconStyle={{
            borderRadius: 4,
            borderColor: disabled ? "#D1D5DB" : "#D1D5DB",
            opacity: disabled ? 0.5 : 1,
          }}
          innerIconStyle={{
            borderRadius: 4,
            opacity: disabled ? 0.5 : 1,
          }}
          disabled={disabled}
          useBuiltInState={controlledChecked === undefined}
        />
      </View>

      {label && (
        <TouchableOpacity
          onPress={handleLabelPress}
          disabled={disabled}
          activeOpacity={0.7}
          className="flex-shrink"
        >
          <Text
            className={`text-[14px] font-NunitoMedium ${
              disabled ? "text-gray-400" : `text-[${textColor}]`
            } ${labelStyle}`}
            style={{ color: disabled ? "#9CA3AF" : textColor }}
            numberOfLines={1}
          >
            {label}
            {required && <Text className="text-red-500 ml-1">*</Text>}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default Checkbox
