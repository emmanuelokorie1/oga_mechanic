import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  LayoutAnimation,
  Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import CustomButton from '@/components/CustomButton';
import InputField from '@/components/InputField';
import { 
  WrenchScrewdriverIcon, 
  PlusIcon, 
  TrashIcon, 
  XMarkIcon,
  SparklesIcon
} from 'react-native-heroicons/outline';

interface Resolution {
  description: string;
}

interface JobCompletionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (resolutions: Resolution[]) => void;
  isLoading?: boolean;
}

const QUICK_SUGGESTIONS = [
  "Fixed brake issues",
  "Replaced oil & filter",
  "Electrical wiring fixed",
  "Car battery changed",
  "Engine oil topped up",
  "Tire pressure checked",
  "Suspensions tightened",
  "Clutch kit replaced",
  "Fuel pump serviced",
  "Wheel alignment done",
  "Coolant leakage fixed",
  "Brake fluid refilled",
  "Air filter cleaned",
  "Spark plugs replaced",
];

const JobCompletionFormModal: React.FC<JobCompletionFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const scrollRef = React.useRef<ScrollView>(null);
  const [resolutions, setResolutions] = useState<Resolution[]>([{ description: '' }]);

  const animate = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleAddResolution = () => {
    const lastResolution = resolutions[resolutions.length - 1];
    if (lastResolution && lastResolution.description.trim() === '') {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animate();
    setResolutions([...resolutions, { description: '' }]);
    
    // Auto-scroll to the bottom after layout updates
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleRemoveResolution = (index: number) => {
    if (resolutions.length > 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      animate();
      const newResolutions = resolutions.filter((_, i) => i !== index);
      setResolutions(newResolutions);
    }
  };

  const handleUpdateResolution = (index: number, text: string) => {
    const newResolutions = [...resolutions];
    newResolutions[index].description = text;
    setResolutions(newResolutions);
  };

  const handleApplySuggestion = (index: number, suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newResolutions = [...resolutions];
    const currentText = newResolutions[index].description.trim();
    if (currentText === '') {
      newResolutions[index].description = suggestion;
    } else {
      newResolutions[index].description = `${currentText}, ${suggestion.toLowerCase()}`;
    }
    setResolutions(newResolutions);
  };

  const handleSubmit = () => {
    const filteredResolutions = resolutions.filter(r => r.description.trim() !== '');
    if (filteredResolutions.length === 0) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(filteredResolutions);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View className="bg-white rounded-t-[40px] shadow-2xl pb-10">
            {/* Drag Handle */}
            <View className="items-center py-4">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </View>

            <View className="px-6">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center flex-1 pr-4">
                  {/* <LinearGradient
                    colors={['#D30309', '#FF4D4D']}
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-4 shadow-lg shadow-primary-300"
                  >
                    <WrenchScrewdriverIcon size={24} color="white" />
                  </LinearGradient> */}
                  <View>
                    <Text className="text-2xl font-NunitoBold text-gray-900">Finalize Repair</Text>
                    <Text className="text-xs font-NunitoMedium text-gray-500 uppercase tracking-widest mt-0.5">Summary of work done</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={onClose} 
                  disabled={isLoading}
                  className="bg-gray-100 p-2 rounded-full"
                >
                  <XMarkIcon size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="relative">
                <ScrollView 
                  ref={scrollRef}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                  contentContainerStyle={{ paddingBottom: 100 }}
                >
                  {resolutions.map((res, index) => (
                    <View 
                      key={index} 
                      className="mb-8 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
                      style={{ 
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 2
                      }}
                    >
                      <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                          <View className="bg-primary-50 px-3 py-1 rounded-lg mr-2">
                            <Text className="text-xs font-NunitoBold text-primary-600">STEPS #{index + 1}</Text>
                          </View>
                        </View>
                        {resolutions.length > 1 && (
                          <TouchableOpacity 
                            onPress={() => handleRemoveResolution(index)}
                            className="bg-red-50 p-2 rounded-full"
                          >
                            <TrashIcon size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <InputField
                        placeholder="e.g. Diagnosed engine misfire..."
                        value={res.description}
                        onChangeText={(text) => handleUpdateResolution(index, text)}
                        multiline={true}
                        containerStyle="bg-gray-50/30 border-gray-200"
                        inputStyle="text-[14px]"
                        noMargin={true}
                      />

                      {/* Suggestions List */}
                      <View className="mt-6">
                        <View className="flex-row items-center mb-3">
                          <SparklesIcon size={14} color="#D30309" />
                          <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-widest ml-1.5">Smart Suggestions</Text>
                        </View>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          className="flex-row"
                          contentContainerStyle={{ paddingRight: 20 }}
                        >
                          {QUICK_SUGGESTIONS.map((suggestion, sIndex) => (
                            <TouchableOpacity 
                              key={sIndex}
                              onPress={() => handleApplySuggestion(index, suggestion)}
                              className="mr-2"
                            >
                              <LinearGradient
                                colors={['#F9FAFB', '#EDF0F3']}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: '#E5E7EB',
                                }}
                              >
                                <Text className="text-[11px] font-NunitoSemiBold text-primary-600">{suggestion}</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                
                {/* Smooth Fade Transition */}
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)']}
                  className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                />
              </View>

              {/* Add Resolution Button - Now Floating over the fade area with better buffer */}
              <View className="items-center -mt-16 mb-4 z-50">
                <TouchableOpacity 
                  onPress={handleAddResolution}
                  disabled={resolutions[resolutions.length - 1]?.description.trim() === ''}
                  className={`flex-row items-center justify-center py-4 px-8 border-2 border-dashed border-gray-200 rounded-full bg-white shadow-xl ${
                    resolutions[resolutions.length - 1]?.description.trim() === '' ? 'opacity-50' : ''
                  }`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 2
                  }}
                >
                  <View className="bg-primary-50 p-1 rounded-full mr-2.5">
                    <PlusIcon size={16} color="#D30309" strokeWidth={3} />
                  </View>
                  <Text className="font-NunitoBold text-gray-700">Add Next Repair Step</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button Section */}
              <View className="mt-4">
                <CustomButton
                  title="Submit Report & Finish"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading || resolutions.every(r => r.description.trim() === '')}
                  bgVariant="primary"
                  className="rounded-3xl shadow-xl shadow-primary-200 h-16"
                />
                <TouchableOpacity 
                  onPress={onClose}
                  disabled={isLoading}
                  className="mt-4 items-center py-2"
                >
                  <Text className="text-sm font-NunitoSemiBold text-gray-400 uppercase tracking-widest">Exit without updating</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default JobCompletionFormModal;
