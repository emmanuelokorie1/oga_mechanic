import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  initialMin: number;
  initialMax: number;
  onValueChange: (min: number, max: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80;
const THUMB_SIZE = 28;

const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  initialMin,
  initialMax,
  onValueChange,
}) => {
  const minPriceRef = useRef(initialMin);
  const maxPriceRef = useRef(initialMax);

  const minAnim = useRef(new Animated.Value(((initialMin - min) / (max - min)) * SLIDER_WIDTH)).current;
  const maxAnim = useRef(new Animated.Value(((initialMax - min) / (max - min)) * SLIDER_WIDTH)).current;

  // Track the current pixel positions
  const minPos = useRef(((initialMin - min) / (max - min)) * SLIDER_WIDTH);
  const maxPos = useRef(((initialMax - min) / (max - min)) * SLIDER_WIDTH);

  const minResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newPos = minPos.current + gestureState.dx;
        if (newPos < 0) newPos = 0;
        if (newPos > maxPos.current - THUMB_SIZE) newPos = maxPos.current - THUMB_SIZE;
        
        minAnim.setValue(newPos);
        
        const price = Math.round((newPos / SLIDER_WIDTH) * (max - min) + min);
        minPriceRef.current = price;
        onValueChange(price, maxPriceRef.current);
      },
      onPanResponderRelease: (_, gestureState) => {
        minPos.current += gestureState.dx;
        if (minPos.current < 0) minPos.current = 0;
        if (minPos.current > maxPos.current - THUMB_SIZE) minPos.current = maxPos.current - THUMB_SIZE;
      },
    })
  ).current;

  const maxResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newPos = maxPos.current + gestureState.dx;
        if (newPos > SLIDER_WIDTH) newPos = SLIDER_WIDTH;
        if (newPos < minPos.current + THUMB_SIZE) newPos = minPos.current + THUMB_SIZE;
        
        maxAnim.setValue(newPos);
        
        const price = Math.round((newPos / SLIDER_WIDTH) * (max - min) + min);
        maxPriceRef.current = price;
        onValueChange(minPriceRef.current, price);
      },
      onPanResponderRelease: (_, gestureState) => {
        maxPos.current += gestureState.dx;
        if (maxPos.current > SLIDER_WIDTH) maxPos.current = SLIDER_WIDTH;
        if (maxPos.current < minPos.current + THUMB_SIZE) maxPos.current = minPos.current + THUMB_SIZE;
      },
    })
  ).current;

  const getTrackStyle = () => {
    return {
      left: minAnim,
      width: Animated.subtract(maxAnim, minAnim),
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.sliderBase}>
        <View style={styles.inactiveTrack} />
        <Animated.View style={[styles.activeTrack, getTrackStyle()]} />
        
        <Animated.View 
          {...minResponder.panHandlers}
          style={[styles.thumb, { transform: [{ translateX: Animated.subtract(minAnim, THUMB_SIZE / 2) }] }]}
        >
          <View style={styles.thumbInner} />
        </Animated.View>

        <Animated.View 
          {...maxResponder.panHandlers}
          style={[styles.thumb, { transform: [{ translateX: Animated.subtract(maxAnim, THUMB_SIZE / 2) }] }]}
        >
          <View style={styles.thumbInner} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderBase: {
    width: SLIDER_WIDTH,
    height: 4,
    justifyContent: 'center',
  },
  inactiveTrack: {
    position: 'absolute',
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  activeTrack: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#D30309',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#D30309',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D30309',
  }
});

export default PriceRangeSlider;
