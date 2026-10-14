import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native'
import { XMarkIcon, CalendarDaysIcon, ArrowPathIcon, CheckCircleIcon } from 'react-native-heroicons/outline'
import CustomButton from '../CustomButton'
import { FontAwesome } from '@expo/vector-icons'

interface RidesInfoDrawerProps {
  visible: boolean
  onClose: () => void
}

const { height: screenHeight } = Dimensions.get('window')

const RidesInfoDrawer: React.FC<RidesInfoDrawerProps> = ({
  visible,
  onClose
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current
  const backdropAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            className="absolute inset-0 bg-black/50"
            style={{ opacity: backdropAnim }}
          />
        </TouchableWithoutFeedback>

        {/* Drawer */}
        <Animated.View
          className="bg-white rounded-t-[30px] pt-4 pb-10 px-6 h-[75%]"
          style={{
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header with Close Button */}
          <View className="items-end mb-2">
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <XMarkIcon size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <Text className="text-3xl font-NunitoExtraBold text-primary-900 mb-2">Master Your Mobility</Text>
          <Text className="text-lg text-gray-500 font-NunitoMedium mb-8 leading-7">
            Manage all your mechanic visits and rides in one secure place. Effortless movement, every time.
          </Text>

          {/* Info Items */}
          <View className="space-y-8 mb-auto">
            <View className="flex-row items-center ">
              <View className="mt-1 bg-primary-50 p-2 rounded-full">
                <CalendarDaysIcon size={28} color="#D30309" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Plan your trips with precision</Text>
                <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                  Book a ride or a mechanic visit ahead of time. Reliability you can count on.
                </Text>
              </View>
            </View>

            <View className="flex-row items-center py-4">
              <View className="mt-1 bg-primary-50 p-2 rounded-full">
                <ArrowPathIcon size={28} color="#D30309" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Repeat your favorite journeys</Text>
                <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                  Book again with a single tap. We remember your preferences so you don't have to.
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="mt-1 bg-primary-50 p-2 rounded-full">
                <CheckCircleIcon size={28} color="#D30309"/>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Total control at your fingertips</Text>
                <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                  Track your history, manage upcoming bookings, and stay organized effortlessly.
                </Text>
              </View>
            </View>
          </View>

          <CustomButton
            title="View my rides"
            className="w-full mb-4"
            onPress={onClose}
          />

        </Animated.View>
      </View>
    </Modal>
  )
}

export default RidesInfoDrawer
