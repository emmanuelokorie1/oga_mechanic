// Layout constants
// export const LAYOUT = {
//     SCROLL_PADDING_BOTTOM: 110,
//     CARD_GAP: 12,
//     CARD_PADDING: 2,
//     CONTAINER_PADDING: "px-3",
//   } as const;

import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export const LAYOUT = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  CONTAINER_PADDING: "px-3",
  CARD_PADDING: 5, // Numeric value for React Native styles
  CARD_GAP: 12,
  SCROLL_PADDING_BOTTOM: Platform.OS === "android" ? 145 : 140,

  // Animation constants
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },

  SPRING_CONFIG: {
    TENSION: 300,
    FRICTION: 10,
  },
};
