import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface NewOrderBannerProps {
  order: {
    customerName?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    serviceType?: string;
  } | null;
  onView: () => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const NewOrderBanner: React.FC<NewOrderBannerProps> = ({ order, onView, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;

  async function playSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' } // A vibrant notification ping
      );
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  }

  useEffect(() => {
    if (order) {
      playSound();
      Animated.spring(slideAnim, {
        toValue: 20, // Margin from top
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      // Auto-hide after 15 seconds if not clicked
      const timer = setTimeout(() => {
        handleClose();
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [order]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 500,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!order) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.innerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={24} color="#FFF" />
          <View style={styles.pulseDot} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>New Repair Request!</Text>
          <Text style={styles.details} numberOfLines={1}>
            {order.customerName || 'A Customer'} • {order.vehicleMake} {order.vehicleModel}
          </Text>
        </View>

        <TouchableOpacity onPress={onView} style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 2,
  },
  innerContainer: {
    backgroundColor: '#059669', // Vibrant emerald green
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: '#059669',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  details: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  viewButtonText: {
    color: '#059669',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
});
