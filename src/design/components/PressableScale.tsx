import React, { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Scale factor while pressed. */
  scaleTo?: number;
  /** Haptic fired on press-in; null disables. */
  hapticFeedback?: 'select' | 'light' | 'medium' | null;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * The standard micro-interaction wrapper: a subtle spring scale-down on touch
 * plus a haptic tick. Used by cards, chips and buttons so every touchable in
 * the app responds physically and identically.
 */
export function PressableScale({
  scaleTo = 0.97,
  hapticFeedback = 'light',
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        if (hapticFeedback) haptic[hapticFeedback]();
        Animated.spring(scale, { toValue: scaleTo, speed: 40, bounciness: 0, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(scale, { toValue: 1, speed: 30, bounciness: 6, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
