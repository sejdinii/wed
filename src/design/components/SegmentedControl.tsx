import React, { useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { duration, radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';

export interface SegmentedControlProps<K extends string> {
  options: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (key: K) => void;
}

/** iOS-style segmented control with an animated sliding thumb. */
export function SegmentedControl<K extends string>({ options, value, onChange }: SegmentedControlProps<K>) {
  const { colors, mode } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const translateX = useRef(new Animated.Value(0)).current;

  const segmentWidth = width > 0 ? width / options.length : 0;

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: index * segmentWidth,
      duration: duration.base,
      useNativeDriver: true,
    }).start();
  }, [index, segmentWidth, translateX]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - spacing(1))}
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.skeleton,
        borderRadius: radius.md,
        padding: spacing(0.5),
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: spacing(0.5),
            left: spacing(0.5),
            width: segmentWidth,
            height: '100%',
            borderRadius: radius.sm + 2,
            backgroundColor: colors.surface,
            borderWidth: mode === 'dark' ? 1 : 0,
            borderColor: colors.borderStrong,
            transform: [{ translateX }],
          }}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                haptic.select();
                onChange(option.key);
              }
            }}
            style={{ flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="label" color={selected ? 'primary' : 'secondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
