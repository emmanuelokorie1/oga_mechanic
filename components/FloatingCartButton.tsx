import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  Animated,
  StyleSheet,
  PanResponder,
  Dimensions,
  Pressable,
} from "react-native";
import { ShoppingCartIcon } from "react-native-heroicons/solid";
import { router } from "expo-router";
import { routes } from "@/constants/routes";
import { useCart } from "@/hooks/useCart";

const BUTTON_SIZE = 52;
const DRAG_THRESHOLD = 5; // pixels moved before considered a drag
const EDGE_PADDING = 10; // minimum distance from screen edges

interface FloatingCartButtonProps {
  bottom?: number;
  right?: number;
}

const FloatingCartButton = ({ bottom = 100, right = 20 }: FloatingCartButtonProps) => {
  const { data: cartData } = useCart();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Position for dragging - start at initial position
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
        // Only become responder if moved more than threshold
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

        // Clamp to screen bounds
        // For X: can go from -(right - EDGE_PADDING) to (SCREEN_WIDTH - right - BUTTON_SIZE - EDGE_PADDING)
        const minX = -(right - EDGE_PADDING);
        const maxX = SCREEN_WIDTH - right - BUTTON_SIZE - EDGE_PADDING;
        const clampedX = Math.max(minX, Math.min(maxX, newX));

        // For Y: can go from -(bottom - EDGE_PADDING) to (SCREEN_HEIGHT - bottom - BUTTON_SIZE - EDGE_PADDING - 50)
        const minY = -(bottom - EDGE_PADDING);
        const maxY = SCREEN_HEIGHT - bottom - BUTTON_SIZE - EDGE_PADDING - 50; // 50 for status bar
        const clampedY = Math.max(minY, Math.min(maxY, newY));

        lastOffset.current = { x: clampedX, y: clampedY };

        // Animate to clamped position
        Animated.spring(pan, {
          toValue: { x: clampedX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
    })
  ).current;
  
  // Calculate total items from API data - use length for unique products to match Cart page
  const itemCount = (() => {
    if (!cartData?.data?.items) return 0;
    const items = cartData.data.items.filter((item: any) => item && item.product);
    return items.length;
  })();

  const hasItems = itemCount > 0;

  // Animate in/out based on cart items
  useEffect(() => {
    if (hasItems) {
      setIsVisible(true);
    }
    Animated.spring(scaleAnim, {
      toValue: hasItems ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !hasItems) {
        setIsVisible(false);
      }
    });
  }, [hasItems]);

  // Bounce animation when item count changes
  useEffect(() => {
    if (hasItems) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [itemCount]);

  // Infinite subtle pulse animation
  useEffect(() => {
    if (hasItems) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasItems]);

  // Don't render if no items (but let animation complete first)
  if (!hasItems && !isVisible) {
    return null;
  }

  const handlePress = () => {
    // Only navigate if this wasn't a drag gesture
    if (!gestureState.current.isDrag) {
      router.push(routes?.cart);
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          bottom,
          right,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: Animated.multiply(Animated.multiply(scaleAnim, bounceAnim), pulseAnim) },
          ],
          opacity: scaleAnim,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          pressed && !isDragging && styles.buttonPressed,
        ]}
        className="p-3 bg-white rounded-full border border-primary-500"
      >
        <ShoppingCartIcon size={22} color="#D30309" />

        {/* Item count badge */}
        <Animated.View style={styles.badge}>
          <Text style={styles.badgeText}>
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1000,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "white",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D30309",
    alignItems: "center",
    shadowColor: "#000",
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
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 33,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#D30309",
  },
  badgeText: {
    color: "#D30309",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Nunito-Bold",
  },
});

export default FloatingCartButton;

