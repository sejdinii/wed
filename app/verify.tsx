import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

const CODE_LENGTH = 6;

/**
 * OTP entry — six boxes backed by one hidden input.
 * MOCK: any 6 digits verify successfully; real SMS OTP ships with the
 * backend behind this same screen.
 */
export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const setPhoneVerified = usePreferences((s) => s.setPhoneVerified);

  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      haptic.success();
      setPhoneVerified(typeof phone === 'string' ? phone : '');
      router.replace('/(tabs)');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing(4) }}>
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
      </View>

      <View style={{ paddingHorizontal: spacing(5), gap: spacing(4), alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chatbox-ellipses-outline" size={26} color={colors.primary} />
        </View>
        <AppText variant="display" align="center">
          {t('verify.title')}
        </AppText>
        <AppText variant="body" color="secondary" align="center">
          {t('verify.body', { phone: typeof phone === 'string' ? phone : '' })}
        </AppText>

        {/* Code boxes over a hidden input */}
        <Pressable
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="button"
          style={{ flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(2) }}
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const filled = i < code.length;
            const active = i === code.length;
            return (
              <View
                key={i}
                style={{
                  width: 46,
                  height: 56,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : filled ? colors.borderStrong : colors.border,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="title">{code.charAt(i)}</AppText>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
          accessibilityLabel={t('verify.title')}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1, ...typeScale.body }}
        />

        {/* MOCK — resend does nothing until real SMS lands. */}
        <PressableScale onPress={() => haptic.select()} hapticFeedback={null} accessibilityRole="button">
          <AppText variant="bodyStrong" color="brand">
            {t('verify.resend')}
          </AppText>
        </PressableScale>
      </View>
    </Screen>
  );
}
