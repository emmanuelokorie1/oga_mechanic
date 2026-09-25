import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  Animated,
  StyleSheet,
  PanResponder,
  Dimensions,
  Pressable,
  View,
} from "react-native";
import { HeadphonesIcon } from "./icons/HeadphonesIcon";
import { router } from "expo-router";
import { routes } from "@/constants/routes";

const BUTTON_SIZE = 52;
const DRAG_THRESHOLD = 5; // pixels moved before considered a drag
const EDGE_PADDING = 10; // minimum distance from screen edges

interface FloatingChatSpecialistButtonProps {
  bottom?: number;
  right?: number;
  left?: number;
}

const FloatingChatSpecialistButton = ({ 
  bottom = 170, 
  right,
  left
}: FloatingChatSpecialistButtonProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);

  // Determine positioning mode: right-aligned only if 'right' is provided and 'left' is not.
  const isRightAligned = right !== undefined && left === undefined;

  // Position for dragging
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  // Track if this was a drag or tap
  const gestureState = useRef({ isDrag: false });

  // Get screen dimensions
  const screenDimensions = useRef(Dimensions.get("window"));

  // Pan responder for drag handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD;
      },
      onPanResponderGrant: () => {
        gestureState.current.isDrag = false;
        pan.setOffset({
          x: lastOffset.current.x,
          y: lastOffset.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD) {
          gestureState.current.isDrag = true;
          setIsDragging(true);
        }
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        setIsDragging(false);

        const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = screenDimensions.current;

        // Calculate new position
        const newX = lastOffset.current.x + gesture.dx;
        const newY = lastOffset.current.y + gesture.dy;

        let minX, maxX;
        if (!isRightAligned) {
             const effectiveLeft = left ?? 20;
             minX = -effectiveLeft + EDGE_PADDING;
             maxX = SCREEN_WIDTH - effectiveLeft - BUTTON_SIZE - EDGE_PADDING;
        } else {
             // at this point isRightAligned is true, so right is guaranteed to be a number
             const effectiveRight = right as number;
             minX = -(SCREEN_WIDTH - effectiveRight - BUTTON_SIZE - EDGE_PADDING);
             maxX = effectiveRight - EDGE_PADDING;
        }
        
        const clampedX = Math.max(minX, Math.min(maxX, newX));

        const minY = -(bottom - EDGE_PADDING);
        const maxY = SCREEN_HEIGHT - bottom - BUTTON_SIZE - EDGE_PADDING - 50; 
        const clampedY = Math.max(minY, Math.min(maxY, newY));

        lastOffset.current = { x: clampedX, y: clampedY };

        Animated.spring(pan, {
          toValue: { x: clampedX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
    })
  ).current;

  // Infinite subtle pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handlePress = () => {
    if (!gestureState.current.isDrag) {
      router.push(routes.chatSeller);
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          bottom,
          ...(isRightAligned ? { right } : { left: left ?? 20 }),
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          pressed && !isDragging && styles.buttonPressed,
        ]}
      >
        <View>
            <HeadphonesIcon size={28} color="#000" />
            <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>3</Text>
            </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1001,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F6B80D",
    shadowColor: "#F6B80D",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#F6B80D',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Nunito-ExtraBold',
  },
  labelText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'Nunito-ExtraBold',
    textTransform: 'uppercase',
  }
});

export default FloatingChatSpecialistButton;
