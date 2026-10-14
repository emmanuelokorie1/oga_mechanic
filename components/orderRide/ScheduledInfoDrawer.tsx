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
import { XMarkIcon, ClockIcon } from 'react-native-heroicons/outline'
import CustomButton from '../CustomButton'
import { FontAwesome } from '@expo/vector-icons'

interface ScheduledInfoDrawerProps {
  visible: boolean
  onClose: () => void
  onSchedulePress: () => void
}

const { height: screenHeight } = Dimensions.get('window')

const ScheduledInfoDrawer: React.FC<ScheduledInfoDrawerProps> = ({
  visible,
  onClose,
  onSchedulePress
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

  const handlePress = () => {
    onClose();
    // Small delay to allow drawer to close before action if needed, or just allow parent to handle
    setTimeout(() => {
        onSchedulePress();
    }, 300);
  }

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
          className="bg-white rounded-t-[30px] pt-4 pb-10 px-6 h-[85%]"
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

           <Text className="text-3xl font-NunitoExtraBold text-primary-900 mb-2">Reliability Guaranteed</Text>
           <Text className="text-lg text-gray-500 font-NunitoMedium mb-8 leading-7">
              Don't leave your punctuality to chance. Schedule ahead and relax with Oga Mechanic.
           </Text>

           {/* Info Items */}
           <View className="space-y-8 mb-auto">
              <View className="flex-row items-center">
                  <View className="mt-1 bg-primary-50 p-2 rounded-full">
                     <FontAwesome name="car" size={28} color="#D30309" />
                  </View>
                  <View className="ml-4 flex-1">
                      <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Perfect for critical appointments</Text>
                      <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                        Mechanic check-up? Airport run? Lock it in now and relax.
                      </Text>
                  </View>
              </View>

              <View className="flex-row items-center py-4">
                  <View className="mt-1 bg-primary-50 p-2 rounded-full">
                     <FontAwesome name="plane" size={28} color="#D30309" />
                  </View>
                  <View className="ml-4 flex-1">
                      <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Travel with absolute confidence</Text>
                      <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                        Book up to 3 months ahead. We'll be there, rain or shine.
                      </Text>
                  </View>
              </View>

              <View className="flex-row items-center">
                  <View className="mt-1 bg-primary-50 p-2 rounded-full">
                     <ClockIcon size={28} color="#D30309" />
                  </View>
                  <View className="ml-4 flex-1">
                      <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Eliminate the waiting game</Text>
                      <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                        Your driver will be ready when you are. No last-minute searching.
                      </Text>
                  </View>
              </View>

              <View className="flex-row items-center pt-4">
                  <View className="mt-1 bg-primary-50 p-2 rounded-full">
                     <FontAwesome name="calendar-check-o" size={28} color="#D30309" />
                  </View>
                  <View className="ml-4 flex-1">
                      <Text className="text-xl font-NunitoBold text-primary-900 mb-1">Change of plans? No problem</Text>
                      <Text className="text-gray-500 font-NunitoMedium text-base leading-6">
                        Free cancellation up to an hour before. We understand life happens.
                      </Text>
                  </View>
              </View>
           </View>

           <CustomButton 
              title="Schedule a ride"
              className="w-full mb-4"
              onPress={handlePress}
           />

        </Animated.View>
      </View>
    </Modal>
  )
}

export default ScheduledInfoDrawer
