import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

/**
 * Style props that size/position the element within its PARENT. These must
 * land on the outer Pressable: the inner Animated.View sits inside a
 * content-sized wrapper, where `flex: 1` collapses to zero height/width and
 * alignSelf/margins detach the touch target from the visible surface.
 */
const OUTER_LAYOUT_PROPS = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'zIndex',
  'display',
]);

function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    (OUTER_LAYOUT_PROPS.has(key) ? outer : inner)[key] = value;
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

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
  const { outer, inner } = splitStyle(style);

  return (
    <Pressable
      {...rest}
      style={outer}
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
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
