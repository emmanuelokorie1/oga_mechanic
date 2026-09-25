import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, Platform } from 'react-native';
import { PhoneIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';

interface ContactSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onVoiceCall: () => void;
  onWhatsAppCall: () => void;
  phoneNumber: string;
  storeName?: string;
}

const ContactSelectionModal: React.FC<ContactSelectionModalProps> = ({
  visible,
  onClose,
  onVoiceCall,
  onWhatsAppCall,
  phoneNumber,
  storeName,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.backdrop}
        >
          <TouchableWithoutFeedback>
            <Animated.View 
              entering={SlideInUp.springify().damping(20)}
              exiting={SlideOutDown.duration(200)}
              style={styles.modalContainer}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <View>
                  <Text className="text-xl font-NunitoExtraBold text-gray-900">Contact Seller</Text>
                  <Text className="text-sm font-NunitoMedium text-gray-500">
                    {storeName ? `Reach out to ${storeName}` : 'Select your preferred method'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                  <XMarkIcon size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View className="space-y-4">
                {/* Voice Call Option */}
                <TouchableOpacity 
                  onPress={() => {
                    onVoiceCall();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#D30309', '#B91C1C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.optionButton}
                  >
                    <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4">
                      <PhoneIcon size={20} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-NunitoBold text-lg">Voice Call</Text>
                      <Text className="text-white/80 font-NunitoMedium text-xs">Standard network call</Text>
                    </View>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <Text className="text-white text-[10px] font-NunitoBold">PRIMARY</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* WhatsApp Option */}
                <TouchableOpacity 
                  onPress={() => {
                    onWhatsAppCall();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#25D366', '#128C7E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.optionButton}
                  >
                    <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4">
                      <Text style={{ fontSize: 20 }}>💬</Text> 
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-NunitoBold text-lg">WhatsApp</Text>
                      <Text className="text-white/80 font-NunitoMedium text-xs">Message or call on WhatsApp</Text>
                    </View>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <Text className="text-white text-[10px] font-NunitoBold">SECONDARY</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Number Display */}
              <View className="mt-8 items-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                <Text className="text-xs font-NunitoBold text-gray-400 uppercase tracking-widest mb-1">PHONE NUMBER</Text>
                <Text className="text-lg font-NunitoExtraBold text-gray-800">{phoneNumber}</Text>
              </View>

              {/* Footer text */}
              <Text className="text-center text-xs text-gray-400 mt-6 font-NunitoMedium">
                Standard network rates may apply for voice calls.
              </Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
  }
});

export default ContactSelectionModal;
