import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';

export interface ListItemRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  value?: string;
  chevron?: boolean;
  onPress?: () => void;
}

/** Settings-style row: soft icon capsule, title, trailing value, chevron. */
export function ListItemRow({ icon, title, value, chevron = false, onPress }: ListItemRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptic.select();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(3),
        paddingVertical: spacing(3),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={colors.onPrimarySoft} />
      </View>
      <AppText variant="body" style={{ flex: 1 }}>
        {title}
      </AppText>
      {value ? (
        <AppText variant="bodySm" color="secondary">
          {value}
        </AppText>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}
