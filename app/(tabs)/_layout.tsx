import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/design/theme';
import { fontFamily } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { useI18n } from '@/i18n';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: IconName, unfocused: IconName) {
  return function TabIcon({ color, focused: isFocused }: { color: string; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : unfocused} size={23} color={color} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.sansSemiBold,
          fontSize: 10,
        },
      }}
      screenListeners={{
        tabPress: () => haptic.select(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.explore'), tabBarIcon: tabIcon('search', 'search-outline') }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: t('tabs.saved'), tabBarIcon: tabIcon('heart', 'heart-outline') }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('tabs.bookings'), tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
