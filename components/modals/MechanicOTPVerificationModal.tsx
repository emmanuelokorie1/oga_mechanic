import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { XMarkIcon, ShieldCheckIcon } from 'react-native-heroicons/outline';
import OTPInput from '@/components/OTPInput';

interface MechanicOTPVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string | number) => void;
  onBypass?: () => void;
  isVerifying: boolean;
  error?: string | null;
}

const MechanicOTPVerificationModal = ({
  visible,
  onClose,
  onVerify,
  onBypass,
  isVerifying,
  error,
}: MechanicOTPVerificationModalProps) => {
  const [localOtp, setLocalOtp] = useState('');

  const handleComplete = (otp: string | number) => {
    setLocalOtp(otp.toString());
    onVerify(otp);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.centeredView}>
          <View style={styles.overlay} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            style={styles.modalViewContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalView}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                   <ShieldCheckIcon size={24} color="#16A34A" />
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <XMarkIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>Verification Required</Text>
              <Text style={styles.modalDescription}>
                Please enter the 6-digit verification code provided by the customer to start the repair work.
              </Text>

              <View style={styles.otpContainer}>
                <OTPInput 
                  numberOfDigits={6} 
                  onComplete={handleComplete} 
                />
              </View>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {isVerifying ? (
                 <View style={styles.loadingContainer}>
                   <ActivityIndicator size="large" color="#16A34A" />
                   <Text style={styles.loadingText}>Verifying code...</Text>
                 </View>
               ) : (
                 <>
                   <TouchableOpacity
                     onPress={() => onVerify(localOtp)}
                     disabled={localOtp.length !== 6 || isVerifying}
                     style={[
                       styles.verifyButton,
                       (localOtp.length !== 6 || isVerifying) && styles.disabledButton,
                     ]}
                   >
                     <Text style={styles.verifyButtonText}>Verify & Start Repair</Text>
                   </TouchableOpacity>

                   {onBypass && (
                     <TouchableOpacity
                       onPress={onBypass}
                       style={styles.bypassButton}
                     >
                       <Text style={styles.bypassButtonText}>Customer Offline? Bypass</Text>
                     </TouchableOpacity>
                   )}
                 </>
               )}
             </View>
            </ScrollView>
           </KeyboardAvoidingView>
         </View>
       </TouchableWithoutFeedback>
     </Modal>
   );
 };

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalViewContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 16,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Nunito-Medium',
    color: '#6B7280',
  },
  bypassButton: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bypassButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
  },
});

export default MechanicOTPVerificationModal;
