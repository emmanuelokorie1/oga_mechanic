import React, { ReactNode } from 'react';
import {
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  KeyboardAwareScrollView as RNKeyboardAwareScrollView,
  KeyboardAwareScrollViewProps as RNKeyboardAwareScrollViewProps,
} from 'react-native-keyboard-aware-scroll-view';

interface KeyboardAwareScrollViewProps extends RNKeyboardAwareScrollViewProps {
  children: ReactNode;
  /** Extra offset for the keyboard (useful when there's a header) */
  keyboardVerticalOffset?: number;
  /** Container style for KeyboardAwareScrollView */
  containerStyle?: StyleProp<ViewStyle>;
  /** Whether to dismiss keyboard on tap outside inputs */
  dismissOnTap?: boolean;
  /** Extra padding at the bottom of content */
  extraBottomPadding?: number;
  /** Custom className for ScrollView */
  scrollViewClassName?: string;
}

/**
 * A reusable scroll view component that handles keyboard avoidance on iOS and Android.
 * Wrap your forms with this component to prevent the keyboard from covering inputs.
 * Powered by react-native-keyboard-aware-scroll-view for smooth, reliable scrolling.
 */
const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 20,
  containerStyle,
  dismissOnTap = true,
  extraBottomPadding = 0,
  scrollViewClassName = 'flex-1',
  contentContainerStyle,
  style,
  ...scrollViewProps
}) => {
  return (
    <RNKeyboardAwareScrollView
      style={[{ flex: 1 }, containerStyle, style]}
      className={scrollViewClassName}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bounces={true}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
      extraHeight={Platform.OS === 'ios' ? 40 : 20}
      enableResetScrollToCoords={false}
      keyboardOpeningTime={0}
      contentContainerStyle={[
        {
          flexGrow: 1,
          paddingBottom: (extraBottomPadding || 0) + (Platform.OS === 'android' ? 70 : 40),
        },
        contentContainerStyle,
      ]}
      {...scrollViewProps}
    >
      {children}
    </RNKeyboardAwareScrollView>
  );
};

export default KeyboardAwareScrollView;

