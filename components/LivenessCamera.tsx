import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraViewRef } from 'expo-camera';
import { XMarkIcon, CheckCircleIcon } from 'react-native-heroicons/solid';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LivenessCameraProps {
  onCapture: (uri: string) => void;
  onCancel: () => void;
}

const { width } = Dimensions.get('window');
const MASK_SIZE = width * 0.85;

export default function LivenessCamera({ onCapture, onCancel }: LivenessCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [camera, setCamera] = useState<CameraViewRef | null>(null);
  const [feedback, setFeedback] = useState("Position your face in the oval");
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [step, setStep] = useState<'DETECT_FACE' | 'BLINK_CHALLENGE' | 'CAPTURING'>('DETECT_FACE');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const capturing = useRef(false);

  useEffect(() => {
    if (!permission) {
        requestPermission();
    }
  }, [permission]);

  // --- MOCK LIVENESS DETECTION ---
  useEffect(() => {
    let isActive = true;

    const runMockSequence = async () => {
      // Don't run sequence if there's an error showing
      if (!permission?.granted || !camera || captureError) return;
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!isActive) return;

      setIsFaceDetected(true);
      setFeedback("Good! Now blink your eyes");
      setStep('BLINK_CHALLENGE');

      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (!isActive) return;
      
      takePicture();
    };

    // Only start the sequence from the beginning
    if (step === 'DETECT_FACE') {
      runMockSequence();
    }

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, permission, captureError]);

  if (!permission) {
    return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator size="large" color="white" /></View>;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center p-4">
        <Text className="text-white text-center mb-4">We need camera permission to verify your identity.</Text>
        <TouchableOpacity onPress={requestPermission} className="bg-primary-500 px-6 py-3 rounded-full">
            <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} className="mt-4">
            <Text className="text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const takePicture = async () => {
    if (camera && !capturing.current) {
        capturing.current = true;
        setStep('CAPTURING');
        setFeedback("Verifying...");
        try {
            // @ts-ignore - expo-camera types might be outdated, but takePictureAsync is required at runtime
            const photo = await camera.takePictureAsync({ quality: 0.8 });
            if (photo) {
                onCapture(photo.uri);
            }
        } catch (error) {
            console.error("Camera Capture Error:", error);
            setCaptureError(error instanceof Error ? error.message : "Failed to take photo.");
            setStep('DETECT_FACE');
            capturing.current = false;
        }
    } else if (!camera) {
        console.error("Camera ref is null");
        setCaptureError("Camera not initialized");
    }
  };

  const handleRetry = () => {
      setCaptureError(null);
      capturing.current = false;
      setIsFaceDetected(false);
      setFeedback("Position your face in the oval");
      setStep('DETECT_FACE');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 relative">
         <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            ref={(ref) => setCamera(ref as any)} 
         />
         
         {/* Mask Overlay */}
         <View className="absolute inset-0 bg-black/50 items-center justify-center" pointerEvents="none">
            <View 
                style={{ 
                    width: MASK_SIZE, 
                    height: MASK_SIZE * 1.3, 
                    borderRadius: (MASK_SIZE * 1.3) / 2,
                    borderColor: step === 'CAPTURING' ? '#22c55e' : (isFaceDetected ? '#3b82f6' : 'white'),
                    borderWidth: 4,
                    backgroundColor: 'transparent',
                    overflow: 'hidden'
                 }} 
            />
         </View>
         
          {/* Top Bar - Adjusted for easier clipping and tap targets */}
         <View className="absolute top-6 right-6 z-[999]" style={{ elevation: 2 }}>
             <TouchableOpacity 
                 onPress={onCancel} 
                 className="bg-black/60 p-3 rounded-full"
                 activeOpacity={0.7}
             >
                 <XMarkIcon color="white" size={28} />
             </TouchableOpacity>
         </View>

         {/* Instructions */}
         {!captureError && (
             <View className="absolute bottom-10 left-0 right-0 items-center z-50 px-6">
                <View className="bg-black/70 px-6 py-4 rounded-2xl items-center">
                    <Text className="text-white text-lg font-bold mb-2 text-center">{feedback}</Text>
                    {step === 'BLINK_CHALLENGE' && (
                        <Text className="text-gray-300 text-sm">Blink to capture photo</Text>
                    )}
                     {step === 'CAPTURING' && (
                        <ActivityIndicator color="#22c55e" size="small" className="mt-2"/>
                    )}
                </View>
             </View>
         )}

         {/* Error Modal Overlay */}
         {captureError && (
             <View className="absolute inset-0 bg-black/80 items-center justify-center z-[1000] px-6">
                 <View className="bg-white p-6 rounded-3xl w-full max-w-sm items-center">
                     <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                        <XMarkIcon size={32} color="#EF4444" />
                     </View>
                     <Text className="text-xl font-NunitoBold text-gray-900 mb-2">Capture Failed</Text>
                     <Text className="text-gray-500 text-center mb-8 font-NunitoMedium">{captureError}</Text>
                     
                     <View className="flex-row gap-x-4 w-full">
                         <TouchableOpacity 
                            onPress={onCancel}
                            className="flex-1 py-4 bg-gray-100 rounded-xl items-center"
                         >
                             <Text className="text-gray-700 font-NunitoBold text-base">Cancel</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity 
                            onPress={handleRetry}
                            className="flex-1 py-4 bg-primary-500 rounded-xl items-center"
                         >
                             <Text className="text-white font-NunitoBold text-base">Try Again</Text>
                         </TouchableOpacity>
                     </View>
                 </View>
             </View>
         )}
      </View>
    </SafeAreaView>
  );
}
