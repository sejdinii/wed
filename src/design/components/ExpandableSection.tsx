import React, { useRef, useState } from 'react';
import { Animated, LayoutAnimation, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { duration, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';

export interface ExpandableSectionProps {
  title: string;
  /** One-line teaser shown while collapsed — the "decision summary". */
  summary?: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

/**
 * Progressive disclosure primitive (see docs/DESIGN-PRINCIPLES.md).
 * Airbnb's "More details" rows — one-line summary + chevron — simplified to an
 * inline accordion so the user never leaves the screen (and the sticky kapar
 * bar never leaves the thumb).
 */
export function ExpandableSection({ title, summary, children, initiallyExpanded = false }: ExpandableSectionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const rotation = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggle = () => {
    haptic.select();
    LayoutAnimation.configureNext(LayoutAnimation.create(duration.base, 'easeInEaseOut', 'opacity'));
    Animated.timing(rotation, { toValue: expanded ? 0 : 1, duration: duration.base, useNativeDriver: true }).start();
    setExpanded((v) => !v);
  };

  return (
    <View>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingVertical: spacing(4),
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading">{title}</AppText>
          {!expanded && summary ? (
            <AppText variant="bodySm" color="secondary" numberOfLines={1}>
              {summary}
            </AppText>
          ) : null}
        </View>
        <Animated.View
          style={{
            transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }],
          }}
        >
          <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
        </Animated.View>
      </Pressable>
      {expanded ? <View style={{ paddingBottom: spacing(4) }}>{children}</View> : null}
    </View>
  );
}
